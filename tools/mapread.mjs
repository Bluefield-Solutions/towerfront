#!/usr/bin/env node
/**
 * Karte auslesen — Wegkurve und unwegsames Gelände aus einem Kartenbild.
 *
 * Der Auftrag hatte zwei Hilfsbilder je Karte vorgesehen: eine Wegmaske und
 * eine Geländemaske. Die erste Lieferung kam ohne sie — und es stellte sich
 * heraus, dass es auch so geht: Pflaster ist grau (Sättigung unter 0,42),
 * Sand ist ocker (über 0,55). Gemessen liegen 23 % der Fläche im grauen und
 * 62 % im ockernen Bereich, dazwischen fast nichts. Eine sauberere Trennung
 * bekommt man selten geschenkt.
 *
 * Weg und Felsen sind beide grau. Getrennt werden sie über ihre Form: der Weg
 * ist ein einziges zusammenhängendes Gebilde, das von einer Bildkante zur
 * anderen reicht. Felsen sind Klumpen.
 *
 * ── Grenze des Verfahrens ──────────────────────────────────────────────
 * Es trennt ueber die Saettigung. Das geht, solange sich Weg und Boden darin
 * unterscheiden - gemessen auf der Sandkarte 0,1 bis 0,3 gegen 0,6 bis 0,7.
 *
 * Auf der Winterkarte ist beides grau: der Schnee ebenso entsaettigt wie das
 * Pflaster. Das Verfahren findet dort 93.442 statt 19.000 Wegpunkte und 44
 * statt 6 Randberuehrungen - es haelt die ganze Karte fuer Weg.
 *
 * Dort hilft nur die Wegmaske aus der Bestellung. Sie ist genau fuer diesen
 * Fall vorgesehen, und dieser Fall tritt ein, sobald ein Boden nicht farbig
 * ist: Schnee, Asche, Stein, Beton.
 * ───────────────────────────────────────────────────────────────────────
 *
 * Aufruf: npx tsx tools/mapread.mjs <bild.png> [name]
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [datei, name = 'karte'] = process.argv.slice(2);
if (!datei) {
  console.error('Aufruf: npx tsx tools/mapread.mjs <bild.png> [name]');
  process.exit(1);
}

// Gerechnet wird auf einer verkleinerten Fassung: die Kurve braucht keine
// Bildpunktgenauigkeit, und es geht um Größenordnungen schneller.
const B = 480;
const meta = await sharp(datei).metadata();
const H = Math.round(B * meta.height / meta.width);
const { data } = await sharp(datei).resize(B, H).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });

/** Den Weg vom Boden trennen - über Sättigung oder über Helligkeit.
 *
 *  Auf einem farbigen Boden ist das Pflaster das Entsättigte: Sand liegt bei
 *  0,6 bis 0,7, Pflaster bei 0,1 bis 0,3. Sauber getrennt.
 *
 *  Auf Schnee versagt das - beides ist grau. Dort trennt die Helligkeit: das
 *  Pflaster ist dunkler als der Schnee. Welches Verfahren greift, entscheidet
 *  die Messung selbst: liegt die mittlere Sättigung unter 0,35, ist der Boden
 *  nicht farbig genug, und es wird über die Helligkeit getrennt.
 */
const sw = [];
for (let i = 0; i < B * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  sw.push(max === 0 ? 0 : (max - min) / max);
}
const mittlereSaettigung = sw.reduce((a, b) => a + b, 0) / sw.length;
const ueberHelligkeit = mittlereSaettigung < 0.35;
console.log(`Trennung ueber ${ueberHelligkeit ? 'Helligkeit' : 'Saettigung'} `
  + `(mittlere Saettigung ${mittlereSaettigung.toFixed(2)})`);

const grau = new Uint8Array(B * H);
for (let i = 0; i < B * H; i++) {
  if (ueberHelligkeit) {
    const l = (0.2126 * data[i*4] + 0.7152 * data[i*4+1] + 0.0722 * data[i*4+2]) / 255;
    grau[i] = l < 0.45 ? 1 : 0;
  } else {
    grau[i] = sw[i] < 0.42 ? 1 : 0;
  }
}

/** Zusammenhängende Gebiete finden. */
const label = new Int32Array(B * H).fill(-1);
const gebiete = [];
for (let start = 0; start < B * H; start++) {
  if (!grau[start] || label[start] >= 0) continue;
  const id = gebiete.length;
  const stapel = [start];
  label[start] = id;
  const punkte = [];
  let minX = B, maxX = 0, minY = H, maxY = 0;
  while (stapel.length) {
    const p = stapel.pop();
    const x = p % B, y = (p / B) | 0;
    punkte.push(p);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= B || ny >= H) continue;
      const q = ny * B + nx;
      if (grau[q] && label[q] < 0) { label[q] = id; stapel.push(q); }
    }
  }
  gebiete.push({ id, punkte, minX, maxX, minY, maxY });
}

// Der Weg ist das Gebiet mit der größten Ausdehnung in x - er durchquert das
// Bild. Ein Felsklumpen ist immer örtlich begrenzt.
gebiete.sort((a, b) => (b.maxX - b.minX) - (a.maxX - a.minX));
const weg = gebiete[0];
const felsen = gebiete.slice(1).filter((g) => g.punkte.length > 60);

console.log(`Gebiete: ${gebiete.length}, davon Weg mit ${weg.punkte.length} Punkten `
  + `(x von ${weg.minX} bis ${weg.maxX}), ${felsen.length} Felsgruppen`);

/** Die Mittellinie des Weges ablaufen.
 *
 *  Kein Ausdünnen, kein Skelett: von einem Randpunkt aus wird in Schritten
 *  gelaufen, und jeder Schritt zielt auf den Schwerpunkt der Wegpunkte, die
 *  vor einem liegen. Das folgt auch einer Haarnadel, an der ein spaltenweiser
 *  Mittelwert scheitern würde.
 */
const istWeg = new Uint8Array(B * H);
for (const p of weg.punkte) istWeg[p] = 1;

const R = 16;                 // Sichtweite je Schritt
const SCHRITT = 10;


/** Von einem Punkt aus die Mittellinie ablaufen.
 *
 *  Kein Ausduennen, kein Skelett: jeder Schritt zielt auf den Schwerpunkt der
 *  Wegpunkte, die vor einem liegen. Das folgt auch einer Haarnadel, an der ein
 *  spaltenweiser Mittelwert scheitern wuerde.
 *
 *  `bestehende` sind bereits gefundene Bahnen. Trifft der Lauf auf eine, wird
 *  ab dort deren Rest uebernommen - genau so, wie das Spiel eine Vereinigung
 *  abbildet: ab dem Treffpunkt fuehren beide Bahnen dieselben Punkte.
 */
function ablaufen(startX, startY, richtung, bestehende) {
  let cx = startX, cy = startY;
  let dx = richtung[0], dy = richtung[1];
  const kurve = [{ x: cx, y: cy }];
  const besucht = new Uint8Array(B * H);
  for (let schritt = 0; schritt < 400; schritt++) {
    let sx = 0, sy = 0, n = 0;
    for (let y = Math.max(0, Math.round(cy - R)); y <= Math.min(H - 1, Math.round(cy + R)); y++) {
      for (let x = Math.max(0, Math.round(cx - R)); x <= Math.min(B - 1, Math.round(cx + R)); x++) {
        if (!istWeg[y * B + x] || besucht[y * B + x]) continue;
        const ax = x - cx, ay = y - cy;
        if (ax * ax + ay * ay > R * R) continue;
        if (ax * dx + ay * dy <= 0) continue;
        sx += x; sy += y; n++;
      }
    }
    if (n < 6) break;
    const zx = sx / n, zy = sy / n;
    const len = Math.hypot(zx - cx, zy - cy) || 1;
    dx = (zx - cx) / len; dy = (zy - cy) / len;
    cx += dx * SCHRITT; cy += dy * SCHRITT;

    // Trifft der Lauf eine bestehende Bahn, wird ab dort deren Rest geteilt.
    if (schritt > 6) {
      for (const alt of bestehende) {
        for (let k = 0; k < alt.length; k++) {
          if (Math.hypot(alt[k].x - cx, alt[k].y - cy) < R * 0.8) {
            return kurve.concat(alt.slice(k));
          }
        }
      }
    }
    kurve.push({ x: cx, y: cy });
    for (let y = Math.max(0, Math.round(cy - R)); y <= Math.min(H - 1, Math.round(cy + R)); y++) {
      for (let x = Math.max(0, Math.round(cx - R)); x <= Math.min(B - 1, Math.round(cx + R)); x++) {
        const ax = x - cx, ay = y - cy;
        if (ax * ax + ay * ay <= R * R && ax * dx + ay * dy < 0) besucht[y * B + x] = 1;
      }
    }
  }
  return kurve;
}

/** Wo beruehrt der Weg den Bildrand? Jede solche Stelle ist ein Zuweg. */
function einstiege() {
  const treffer = [];
  const rand = [];
  for (const p of weg.punkte) {
    const x = p % B, y = (p / B) | 0;
    if (x <= 1 || y <= 1 || x >= B - 2 || y >= H - 2) rand.push({ x, y });
  }
  // Randpunkte zu Gruppen zusammenfassen - ein Zuweg ist mehrere Punkte breit.
  const benutzt = new Set();
  for (const r of rand) {
    const key = `${r.x},${r.y}`;
    if (benutzt.has(key)) continue;
    const gruppe = rand.filter((o) => Math.hypot(o.x - r.x, o.y - r.y) < 22);
    for (const o of gruppe) benutzt.add(`${o.x},${o.y}`);
    const mx = gruppe.reduce((a, o) => a + o.x, 0) / gruppe.length;
    const my = gruppe.reduce((a, o) => a + o.y, 0) / gruppe.length;
    // Richtung ins Bild hinein.
    const dx = mx < B / 2 ? 1 : mx > B / 2 ? -1 : 0;
    const dy = my < H / 2 ? 1 : my > H / 2 ? -1 : 0;
    const nachInnen = mx <= 2 ? [1, 0] : mx >= B - 3 ? [-1, 0] : my <= 2 ? [0, 1] : [0, -1];
    void dx; void dy;
    treffer.push({ x: mx, y: my, richtung: nachInnen, groesse: gruppe.length });
  }
  return treffer.sort((a, b) => b.groesse - a.groesse);
}

const zugaenge = einstiege();
console.log(`Randberuehrungen: ${zugaenge.length} (${zugaenge.map((z) => `${Math.round(z.x)}/${Math.round(z.y)}`).join(', ')})`);

// Der laengste Lauf ist die Hauptbahn, danach die uebrigen Zuwege.
const bahnen = [];
for (const z of zugaenge.slice(0, 8)) {
  const k = ablaufen(z.x, z.y, z.richtung, bahnen);
  if (k.length > 8) bahnen.push(k);
}
bahnen.sort((a, b) => b.length - a.length);
console.log(`Bahnen: ${bahnen.map((b) => b.length + ' Punkte').join(', ')}`);
const kurve = bahnen[0];

/** Wegbreite an einem Punkt: quer zur Laufrichtung messen. */
function breiteBei(kurve, i) {
  const a = kurve[Math.max(0, i - 1)], b = kurve[Math.min(kurve.length - 1, i + 1)];
  const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
  const p = kurve[i];
  let links = 0, rechts = 0;
  for (let d = 1; d < 40; d++) {
    const x = Math.round(p.x + Math.cos(ang) * d), y = Math.round(p.y + Math.sin(ang) * d);
    if (x < 0 || y < 0 || x >= B || y >= H || !istWeg[y * B + x]) break;
    links = d;
  }
  for (let d = 1; d < 40; d++) {
    const x = Math.round(p.x - Math.cos(ang) * d), y = Math.round(p.y - Math.sin(ang) * d);
    if (x < 0 || y < 0 || x >= B || y >= H || !istWeg[y * B + x]) break;
    rechts = d;
  }
  return (links + rechts) / 2;
}

// Auf Weltmaß umrechnen (1920 x 1080) und ausdünnen: die Kurve braucht
// Stützpunkte, keine Messpunkte. Jede Bahn einzeln.
const k = 1920 / B;

function stuetzpunkte(bahn) {
  const jeder = Math.max(1, Math.round(bahn.length / 14));
  const raus = [];
  for (let i = 0; i < bahn.length; i += jeder) {
    raus.push({
      x: Math.round(bahn[i].x * k),
      y: Math.round(bahn[i].y * k),
      w: Math.max(40, Math.round(breiteBei(bahn, i) * k)),
    });
  }
  // Der letzte Messpunkt gehört dazu, sonst endet die Bahn zu früh.
  const letzter = bahn[bahn.length - 1];
  raus.push({ x: Math.round(letzter.x * k), y: Math.round(letzter.y * k), w: raus[raus.length - 1].w });
  return raus;
}

const alleBahnen = bahnen.map(stuetzpunkte);

// Alle Bahnen müssen am selben Punkt enden - dort steht der Kristall.
const ziel = alleBahnen[0][alleBahnen[0].length - 1];
for (const b of alleBahnen) b[b.length - 1] = { ...ziel, w: b[b.length - 1].w };

console.log(`\nBahnen: ${alleBahnen.map((b) => b.length + ' Stützpunkte').join(', ')}`);

console.log('\n  lanes: [');
for (const bahn of alleBahnen) {
  console.log('    [');
  for (let i = 0; i < bahn.length; i += 3) {
    console.log('      ' + bahn.slice(i, i + 3)
      .map((p) => `{ x: ${p.x}, y: ${p.y}, w: ${p.w} }`).join(', ') + ',');
  }
  console.log('    ],');
}
console.log('  ],');

// --- Unwegsames Gelände: jede Felsgruppe als Kreis.
const rau = felsen.map((g) => {
  let sx = 0, sy = 0;
  for (const p of g.punkte) { sx += p % B; sy += (p / B) | 0; }
  const n = g.punkte.length;
  return {
    x: Math.round((sx / n) * k),
    y: Math.round((sy / n) * k),
    r: Math.round(Math.sqrt(n / Math.PI) * k * 0.95),
  };
}).filter((g) => {
  if (g.r <= 24) return false;
  // Was auf dem Weg liegt, ist kein Hindernis - es ist ein Fehlgriff der
  // Trennung. Auf der Winterkarte fing die Helligkeitsschwelle auch Schatten
  // neben dem Pflaster ein, und ein Kreis mitten auf der Strasse haette den
  // Waechter zu Recht anschlagen lassen.
  const naechster = Math.min(...alleBahnen.flat()
    .map((p) => Math.hypot(p.x - g.x, p.y - g.y)));
  return naechster > g.r * 0.8;
}).sort((a, b) => b.r - a.r).slice(0, 20);

console.log('\n  rough: [');
for (let i = 0; i < rau.length; i += 3) {
  console.log('    ' + rau.slice(i, i + 3)
    .map((g) => `{ x: ${g.x}, y: ${g.y}, r: ${g.r} }`).join(', ') + ',');
}
console.log('  ],');

// --- Kontrollbild: die gefundene Kurve über das Original legen.
const svg = `<svg width="${B}" height="${H}">
  ${bahnen.map((b, i) => `<polyline points="${b.map((p) => `${p.x},${p.y}`).join(' ')}"
    fill="none" stroke="${['#FF2D95', '#2D95FF', '#FFD52D'][i % 3]}" stroke-width="3"/>`).join('')}
  ${rau.map((g) => `<circle cx="${g.x / k}" cy="${g.y / k}" r="${g.r / k}"
    fill="none" stroke="#2DFF95" stroke-width="2"/>`).join('')}
</svg>`;
await sharp(datei).resize(B, H)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png().toFile(`/tmp/${name}_kontrolle.png`);
writeFileSync(`/tmp/${name}_daten.json`, JSON.stringify({ lanes: alleBahnen, rough: rau }, null, 2));
console.log(`\nKontrollbild: /tmp/${name}_kontrolle.png`);
