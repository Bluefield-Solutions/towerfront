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

/** Graue Flächen: Pflaster und Fels. */
const grau = new Uint8Array(B * H);
for (let i = 0; i < B * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  grau[i] = (max === 0 ? 0 : (max - min) / max) < 0.42 ? 1 : 0;
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

const R = 11;                 // Sichtweite je Schritt
const SCHRITT = 7;

// Startpunkt: der Wegpunkt am weitesten links.
let start = weg.punkte[0];
for (const p of weg.punkte) if ((p % B) < (start % B)) start = p;
let cx = start % B, cy = (start / B) | 0;
// Anfangsrichtung: nach rechts.
let dx = 1, dy = 0;

const kurve = [{ x: cx, y: cy }];
const besucht = new Uint8Array(B * H);
for (let schritt = 0; schritt < 400; schritt++) {
  let sx = 0, sy = 0, n = 0;
  for (let y = Math.max(0, Math.round(cy - R)); y <= Math.min(H - 1, Math.round(cy + R)); y++) {
    for (let x = Math.max(0, Math.round(cx - R)); x <= Math.min(B - 1, Math.round(cx + R)); x++) {
      if (!istWeg[y * B + x] || besucht[y * B + x]) continue;
      const ax = x - cx, ay = y - cy;
      if (ax * ax + ay * ay > R * R) continue;
      // Nur was vor uns liegt - sonst läuft der Punkt zurück.
      if (ax * dx + ay * dy <= 0) continue;
      sx += x; sy += y; n++;
    }
  }
  if (n < 6) break;
  const zx = sx / n, zy = sy / n;
  const len = Math.hypot(zx - cx, zy - cy) || 1;
  dx = (zx - cx) / len; dy = (zy - cy) / len;
  cx += dx * SCHRITT; cy += dy * SCHRITT;
  // Alles hinter uns als erledigt markieren.
  for (let y = Math.max(0, Math.round(cy - R)); y <= Math.min(H - 1, Math.round(cy + R)); y++) {
    for (let x = Math.max(0, Math.round(cx - R)); x <= Math.min(B - 1, Math.round(cx + R)); x++) {
      const ax = x - cx, ay = y - cy;
      if (ax * ax + ay * ay <= R * R && ax * dx + ay * dy < 0) besucht[y * B + x] = 1;
    }
  }
  kurve.push({ x: cx, y: cy });
}

/** Wegbreite an einem Punkt: quer zur Laufrichtung messen. */
function breiteBei(i) {
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
// Stützpunkte, keine Messpunkte.
const k = 1920 / B;
const jeder = Math.max(1, Math.round(kurve.length / 16));
const punkte = [];
for (let i = 0; i < kurve.length; i += jeder) {
  punkte.push({
    x: Math.round(kurve[i].x * k),
    y: Math.round(kurve[i].y * k),
    w: Math.max(30, Math.round(breiteBei(i) * k)),
  });
}
// Der erste Punkt gehört vor die Bildkante - dort steht das Tor.
if (punkte.length) punkte[0] = { ...punkte[0], x: -80 };

console.log(`\nKurve: ${kurve.length} Messpunkte -> ${punkte.length} Stützpunkte`);
console.log(`Breite: ${Math.min(...punkte.map((p) => p.w))} bis ${Math.max(...punkte.map((p) => p.w))}`);

console.log('\n  lanes: [');
console.log('    [');
for (let i = 0; i < punkte.length; i += 3) {
  console.log('      ' + punkte.slice(i, i + 3)
    .map((p) => `{ x: ${p.x}, y: ${p.y}, w: ${p.w} }`).join(', ') + ',');
}
console.log('    ],');
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
}).filter((g) => g.r > 24).sort((a, b) => b.r - a.r).slice(0, 20);

console.log('\n  rough: [');
for (let i = 0; i < rau.length; i += 3) {
  console.log('    ' + rau.slice(i, i + 3)
    .map((g) => `{ x: ${g.x}, y: ${g.y}, r: ${g.r} }`).join(', ') + ',');
}
console.log('  ],');

// --- Kontrollbild: die gefundene Kurve über das Original legen.
const svg = `<svg width="${B}" height="${H}">
  <polyline points="${kurve.map((p) => `${p.x},${p.y}`).join(' ')}"
    fill="none" stroke="#FF2D95" stroke-width="3"/>
  ${rau.map((g) => `<circle cx="${g.x / k}" cy="${g.y / k}" r="${g.r / k}"
    fill="none" stroke="#2DFF95" stroke-width="2"/>`).join('')}
</svg>`;
await sharp(datei).resize(B, H)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png().toFile(`/tmp/${name}_kontrolle.png`);
writeFileSync(`/tmp/${name}_daten.json`, JSON.stringify({ lanes: [punkte], rough: rau }, null, 2));
console.log(`\nKontrollbild: /tmp/${name}_kontrolle.png`);
