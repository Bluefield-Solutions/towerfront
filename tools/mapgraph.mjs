#!/usr/bin/env node
/**
 * Kartenauslesung, zweiter Anlauf — als Wegsuche statt als Lauf.
 *
 * Das erste Verfahren (tools/mapread.mjs) lief vom Tor los und entschied bei
 * jedem Schritt aus 16 Punkten Sichtweite, wohin es weitergeht. Auf einem Weg
 * ohne Verzweigung reicht das. Auf einem Netz mit Kreuzungen und Schleifen
 * nicht: der Lauf folgte einer Schleife und endete darin, und zwei Versuche,
 * das mit weiteren lokalen Regeln zu heilen, haben nichts geaendert. Man kann
 * einem Verfahren, das durch ein Guckloch schaut, nicht durch mehr Regeln
 * beibringen, den ganzen Plan zu sehen.
 *
 * Hier wird global gesucht. Der Kniff: **ein Skelett wird gar nicht
 * gebraucht.** Statt die Mittellinie zu konstruieren, wird sie zur billigsten
 * Strecke gemacht:
 *
 *   1. Für jeden Wegpunkt der Abstand zum Wegrand (Distanzkarte).
 *   2. Ein Schritt kostet umso mehr, je näher er am Rand liegt.
 *   3. Kürzeste Wege vom Tor zum Endplatz (Dijkstra).
 *
 * Der billigste Weg verläuft dadurch von selbst in der Mitte und nimmt an
 * jeder Kreuzung den Ast, der wirklich zum Ziel führt. Schleifen fallen weg,
 * weil sie länger sind — nicht weil eine Regel sie erkennt.
 *
 * Aufruf: node tools/mapgraph.mjs <bild.png> <name> [--schwelle 0.5] [--hell|--dunkel]
 * Schreibt /tmp/<name>_daten.json und /tmp/<name>_kontrolle.png.
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [bild, name] = process.argv.slice(2);
if (!bild || !name) {
  console.error('Aufruf: node tools/mapgraph.mjs <bild.png> <name>');
  process.exit(1);
}

const B = 480, H = 270;
const WELT_B = 1920, WELT_H = 1080;
const k = WELT_B / B;

const { data } = await sharp(bild).resize(B, H, { fit: 'fill' }).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });

const wert = (i, satt) => {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  if (satt) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx === 0 ? 0 : (mx - mn) / mx;
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

// ---------------------------------------------------------- Weg vom Boden
//
// Wie im ersten Verfahren: Schlankheit entscheidet. Umfang² durch Fläche —
// ein Weg ist ein Band, ein Boden eine Fläche.
function grosstesGebiet(maske) {
  const gesehen = new Uint8Array(B * H);
  let bestF = 0, bestU = 0;
  for (let s = 0; s < B * H; s++) {
    if (!maske[s] || gesehen[s]) continue;
    let f = 0, u = 0;
    const st = [s];
    gesehen[s] = 1;
    while (st.length) {
      const p = st.pop();
      f++;
      const x = p % B, y = (p / B) | 0;
      for (const [q, gut] of [[p - 1, x > 0], [p + 1, x < B - 1], [p - B, y > 0], [p + B, y < H - 1]]) {
        if (!gut || !maske[q]) { u++; continue; }
        if (!gesehen[q]) { gesehen[q] = 1; st.push(q); }
      }
    }
    if (f > bestF) { bestF = f; bestU = u; }
  }
  if (!bestF || bestF > B * H * 0.28) return { wert: 0, flaeche: bestF };
  return { wert: (bestU * bestU) / bestF, flaeche: bestF };
}

let schwelle = 0.45, wegNiedrig = true, ueberSatt = false, bestWert = -1;
for (const satt of [false, true]) {
  for (let t = 0.14; t <= 0.86; t += 0.03) {
    for (const nied of [true, false]) {
      const m = new Uint8Array(B * H);
      for (let i = 0; i < B * H; i++) {
        const v = wert(i, satt);
        m[i] = (nied ? v < t : v >= t) ? 1 : 0;
      }
      const r = grosstesGebiet(m);
      if (r.flaeche < B * H * 0.02) continue;
      if (r.wert > bestWert) { bestWert = r.wert; schwelle = t; wegNiedrig = nied; ueberSatt = satt; }
    }
  }
}
{
  const a = process.argv;
  const i = a.indexOf('--schwelle');
  if (i > 0 && a[i + 1]) schwelle = Number(a[i + 1]);
  if (a.includes('--hell')) wegNiedrig = false;
  if (a.includes('--dunkel')) wegNiedrig = true;
  if (a.includes('--saettigung')) ueberSatt = true;
  if (a.includes('--helligkeit')) ueberSatt = false;
}

const istWeg = new Uint8Array(B * H);
for (let i = 0; i < B * H; i++) {
  const v = wert(i, ueberSatt);
  istWeg[i] = (wegNiedrig ? v < schwelle : v >= schwelle) ? 1 : 0;
}
console.log(`Trennung ueber ${ueberSatt ? 'Saettigung' : 'Helligkeit'} bei `
  + `${schwelle.toFixed(2)}, Weg ist ${wegNiedrig ? 'niedriger' : 'hoeher'} `
  + `(Schlankheit ${bestWert.toFixed(0)})`);

// Nur das grösste zusammenhängende Wegstück behalten — Sprenkel im Boden
// sind kein Weg.
{
  const gesehen = new Int32Array(B * H).fill(-1);
  const groessen = [];
  for (let s = 0; s < B * H; s++) {
    if (!istWeg[s] || gesehen[s] >= 0) continue;
    const id = groessen.length;
    let n = 0;
    const st = [s];
    gesehen[s] = id;
    while (st.length) {
      const p = st.pop();
      n++;
      const x = p % B, y = (p / B) | 0;
      for (const [q, gut] of [[p - 1, x > 0], [p + 1, x < B - 1], [p - B, y > 0], [p + B, y < H - 1]]) {
        if (gut && istWeg[q] && gesehen[q] < 0) { gesehen[q] = id; st.push(q); }
      }
    }
    groessen.push(n);
  }
  let best = 0;
  for (let i = 1; i < groessen.length; i++) if (groessen[i] > groessen[best]) best = i;
  for (let i = 0; i < B * H; i++) if (gesehen[i] !== best) istWeg[i] = 0;
}

// ------------------------------------------------------- Abstand zum Rand
//
// Zwei Durchläufe über das Bild, wie bei einer Chamfer-Distanz: erst von oben
// links, dann von unten rechts. Das Ergebnis ist für jeden Wegpunkt der
// Abstand zum nächsten Nicht-Weg.
const dist = new Float32Array(B * H);
for (let i = 0; i < B * H; i++) dist[i] = istWeg[i] ? 1e9 : 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < B; x++) {
    const i = y * B + x;
    if (!istWeg[i]) continue;
    let m = dist[i];
    if (x > 0) m = Math.min(m, dist[i - 1] + 1);
    if (y > 0) m = Math.min(m, dist[i - B] + 1);
    if (x > 0 && y > 0) m = Math.min(m, dist[i - B - 1] + 1.414);
    if (x < B - 1 && y > 0) m = Math.min(m, dist[i - B + 1] + 1.414);
    dist[i] = m;
  }
}
for (let y = H - 1; y >= 0; y--) {
  for (let x = B - 1; x >= 0; x--) {
    const i = y * B + x;
    if (!istWeg[i]) continue;
    let m = dist[i];
    if (x < B - 1) m = Math.min(m, dist[i + 1] + 1);
    if (y < H - 1) m = Math.min(m, dist[i + B] + 1);
    if (x < B - 1 && y < H - 1) m = Math.min(m, dist[i + B + 1] + 1.414);
    if (x > 0 && y < H - 1) m = Math.min(m, dist[i + B - 1] + 1.414);
    dist[i] = m;
  }
}

// Der Endplatz: die breiteste Stelle.
let ziel = 0, zielD = -1;
for (let i = 0; i < B * H; i++) if (dist[i] > zielD) { zielD = dist[i]; ziel = i; }

// Von Hand vorgeben: --ziel 0.88,0.52 (Anteil der Bildbreite und -hoehe).
//
// Die breiteste Stelle ist meistens der Endplatz, aber nicht immer: auf der
// Wuestenkarte ist der Sternplatz in der Mitte breiter als der Zielplatz am
// Rand. Ein Blick aufs Bild und zwei Zahlen sind schneller als eine Regel,
// die den Unterschied erraten soll.
{
  const a = process.argv;
  const i = a.indexOf('--ziel');
  if (i > 0 && a[i + 1]) {
    const [fx, fy] = a[i + 1].split(',').map(Number);
    const zx = Math.round(fx * B), zy = Math.round(fy * H);
    // Den naechsten Wegpunkt dazu nehmen.
    let best = -1, bestD = Infinity;
    for (let j = 0; j < B * H; j++) {
      if (!istWeg[j]) continue;
      const d = Math.hypot(j % B - zx, ((j / B) | 0) - zy);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best >= 0) { ziel = best; zielD = dist[best]; }
  }
}
console.log(`Endplatz bei ${ziel % B}/${(ziel / B) | 0}, Halbbreite ${zielD.toFixed(1)}`);

// ------------------------------------------------------------------ Tore
//
// Tore sind Wegpunkte am Bildrand. Berührt der Weg keinen Rand, werden die
// Enden des Netzes genommen: Punkte, die vom Endplatz am weitesten entfernt
// sind und untereinander Abstand halten.
function tore() {
  const rand = [];
  for (let x = 0; x < B; x++) {
    for (const y of [0, 1, H - 2, H - 1]) if (istWeg[y * B + x]) rand.push(y * B + x);
  }
  for (let y = 0; y < H; y++) {
    for (const x of [0, 1, B - 2, B - 1]) if (istWeg[y * B + x]) rand.push(y * B + x);
  }
  const gebuendelt = [];
  for (const p of rand) {
    const x = p % B, y = (p / B) | 0;
    if (gebuendelt.some((q) => Math.hypot(q % B - x, ((q / B) | 0) - y) < 25)) continue;
    gebuendelt.push(p);
  }
  if (gebuendelt.length) return gebuendelt;

  // Kein Randkontakt: die Tore liegen im Bild. Dann sind es die Enden des
  // Netzes - die Punkte, die vom Endplatz am weitesten weg sind. Der
  // Dijkstra hat die Entfernung schon berechnet, also ist das gratis.
  const kandidaten = [];
  for (let i = 0; i < B * H; i++) if (istWeg[i] && Number.isFinite(kosten[i])) kandidaten.push(i);
  kandidaten.sort((a, b) => kosten[b] - kosten[a]);
  const enden = [];
  for (const p of kandidaten) {
    if (enden.length >= 5) break;
    const x = p % B, y = (p / B) | 0;
    if (enden.some((q) => Math.hypot(q % B - x, ((q / B) | 0) - y) < 60)) continue;
    enden.push(p);
  }
  return enden;
}

// ------------------------------------------- Kürzeste Wege zum Endplatz
//
// Dijkstra vom Endplatz aus über alle Wegpunkte. Ein Schritt kostet mehr, je
// näher er am Rand liegt — dadurch verläuft der billigste Weg in der Mitte,
// ganz ohne Skelett.
const kosten = new Float32Array(B * H).fill(Infinity);
const vor = new Int32Array(B * H).fill(-1);
{
  const strafe = (i) => 1 + 6 / (dist[i] + 1);
  kosten[ziel] = 0;
  // Einfacher Eimer-Vorrang: fein genug für 480x270.
  const eimer = new Map();
  const einfuegen = (i, c) => {
    const s = Math.round(c * 4);
    if (!eimer.has(s)) eimer.set(s, []);
    eimer.get(s).push(i);
  };
  einfuegen(ziel, 0);
  let stufe = 0;
  const maxStufe = 400000;
  while (stufe <= maxStufe) {
    const liste = eimer.get(stufe);
    stufe++;
    if (!liste) continue;
    for (const i of liste) {
      const c = kosten[i];
      if (Math.round(c * 4) !== stufe - 1) continue;
      const x = i % B, y = (i / B) | 0;
      for (const [dx, dy, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
        [1, 1, 1.414], [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= B || ny >= H) continue;
        const j = ny * B + nx;
        if (!istWeg[j]) continue;
        const neu = c + w * strafe(j);
        if (neu < kosten[j] - 1e-6) { kosten[j] = neu; vor[j] = i; einfuegen(j, neu); }
      }
    }
  }
}

const bahnen = [];
// Die vier laengsten Wege reichen - mehr Bahnen bringt das Spiel nicht unter,
// und Randberuehrungen von Felsen liefern Scheintore.
const gefunden = tore()
  .filter((t) => Number.isFinite(kosten[t]))
  .sort((a, b) => kosten[b] - kosten[a])
  .slice(0, 4);
for (const tor of gefunden) {
  if (!Number.isFinite(kosten[tor])) continue;
  const pfad = [];
  let i = tor;
  while (i >= 0) { pfad.push(i); i = vor[i]; }
  if (pfad.length < 20) continue;
  bahnen.push(pfad);
}
console.log(`Tore: ${gefunden.length} genommen, ${bahnen.length} mit Weg zum Endplatz`);

// Ausdünnen und auf Weltmaß bringen.
const stuetz = (pfad) => {
  const aus = [];
  for (let n = 0; n < pfad.length; n += 14) {
    const i = pfad[n];
    aus.push({
      x: Math.round((i % B) * k),
      y: Math.round(((i / B) | 0) * k),
      w: Math.max(40, Math.round(dist[i] * 2 * k)),
    });
  }
  const letzte = pfad[pfad.length - 1];
  aus.push({
    x: Math.round((letzte % B) * k),
    y: Math.round(((letzte / B) | 0) * k),
    w: Math.max(40, Math.round(dist[letzte] * 2 * k)),
  });
  return aus;
};
const lanes = bahnen.map(stuetz);

// Unwegsames Gelände: grosse Nicht-Weg-Gruppen, die dunkler als der Boden sind.
const rough = [];
writeFileSync(`/tmp/${name}_daten.json`, JSON.stringify({ lanes, rough }, null, 1));

// Kontrollbild.
{
  const farben = [[233, 30, 99], [255, 193, 7], [33, 150, 243], [76, 175, 80]];
  const png = await sharp(bild).resize(B * 2, H * 2, { fit: 'fill' }).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const px = png.data;
  const male = (x, y, c) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = Math.round(x * 2) + dx, ny = Math.round(y * 2) + dy;
        if (nx < 0 || ny < 0 || nx >= B * 2 || ny >= H * 2) continue;
        const j = (ny * B * 2 + nx) * 4;
        px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2];
      }
    }
  };
  bahnen.forEach((p, n) => { for (const i of p) male(i % B, (i / B) | 0, farben[n % 4]); });
  male(ziel % B, (ziel / B) | 0, [255, 255, 255]);
  await sharp(px, { raw: { width: B * 2, height: H * 2, channels: 4 } })
    .png().toFile(`/tmp/${name}_kontrolle.png`);
}

console.log(`Bahnen: ${lanes.map((l) => l.length + ' Stuetzpunkte').join(', ')}`);
for (const l of lanes) {
  const br = l.map((p) => p.w);
  console.log(`  Breite ${Math.min(...br)}-${Math.max(...br)}, `
    + `Start ${l[0].x}/${l[0].y} -> Ziel ${l[l.length - 1].x}/${l[l.length - 1].y}`);
}
