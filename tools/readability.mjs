#!/usr/bin/env node
/**
 * Lesbarkeitsmessung.
 *
 * Die Bilanz über alle Tore (docs/Kristallwacht-TOR-BILANZ.md) hat eine Lücke
 * gefunden: Elf von 57 Befunden kamen aus Bildschirmfotos, und kein Tor prüfte
 * Darstellung. Kontrast zwischen Turm und Untergrund, Größe auf dem
 * Bildschirm, Unterscheidbarkeit der Gegnerfarben — alles Fragen, die bisher
 * nur ein Mensch mit dem Handy beantworten konnte.
 *
 * Dieses Werkzeug beantwortet den messbaren Teil davon. Es liest die
 * ausgelieferten Bilder aus den erzeugten Modulen — also genau das, was im
 * Spiel landet — und rechnet:
 *
 *  1. Kontrast jedes Objekts gegen den Untergrund, auf dem es steht.
 *  2. Größe der Silhouette in Bildschirmpunkten im schlechtesten Fall
 *     (iPhone quer, Feld füllt den Bildschirm).
 *  3. Farbabstand der Gegnerarten untereinander.
 *
 * Es ersetzt den Blick aufs Gerät nicht. Es fängt aber die Fälle, in denen
 * etwas *rechnerisch* nicht lesbar sein kann.
 *
 * Aufruf: npm run lesbarkeit
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------ Grenzwerte
//
// Nicht aus den aktuellen Werten abgeleitet, sondern aus dem, was auf einem
// Handy noch erkennbar ist. Wenn das Spiel darunter liegt, ist das ein Befund
// und keine Einladung, die Grenze zu senken.
// Lesbarkeit entsteht an der *Kante*, nicht in der Fläche: mitteldunkel auf
// mittelhell hat in beide Richtungen wenig Kontrast. Deshalb zwei Grenzen -
// eine strenge für den Saum, eine milde für den Körper.
const MIN_RIM_CONTRAST = 3.0;  // Saum gegen den Boden - das trägt die Lesbarkeit
const MIN_BODY_CONTRAST = 1.15; // Körper gegen den Boden - nur noch Rückhalt
const MIN_TOWER_PX = 26;       // Bildschirmpunkte Breite der Turmsilhouette
const MIN_ENEMY_PX = 13;       // dasselbe für Gegner
const MIN_COLOUR_DIST = 12;    // Abstand zweier Gegnerfarben (CIE76)

// Schlechtester Fall: iPhone quer, Spielfeld füllt den Bildschirm.
const SCREEN_W = 844, SCREEN_H = 390;
const WORLD_W = 1600, WORLD_H = 880;
const COVER = Math.max(SCREEN_W / WORLD_W, SCREEN_H / WORLD_H);

// ------------------------------------------------------------------- Farbrechnen

/** sRGB-Kanal linearisieren. */
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

/** Relative Helligkeit nach WCAG. */
const luminance = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** Kontrastverhältnis zweier Helligkeiten. */
const contrast = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

/** sRGB nach Lab (D65) - für den Farbabstand brauchen wir einen Raum, in dem
 *  gleiche Abstände auch gleich aussehen. */
function toLab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const labDist = (a, b) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const hexRgb = (h) => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
];

// ------------------------------------------------------- Bilder aus den Modulen

/** Die Datenadressen aus einem erzeugten Modul lesen. So wird gemessen, was
 *  tatsächlich ausgeliefert wird - nicht die Rohdatei daneben. */
function readAssets(file) {
  const text = readFileSync(join(ROOT, 'src', 'gfx', 'assets', file), 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/'([^']+)': 'data:image\/webp;base64,([^']+)'/g)) {
    out.set(m[1], Buffer.from(m[2], 'base64'));
  }
  return out;
}

/** Mittlere Farbe der deckenden Bildpunkte, dazu die Ausdehnung der
 *  Silhouette. Halbdurchsichtige Ränder werden übergangen: sie gehören zum
 *  Übergang, nicht zum Objekt. */
async function measureSprite(buffer, tint, tintAmount) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
  for (let i = 0; i < info.width * info.height; i++) {
    const a = data[i * 4 + 3];
    if (a < 200) continue;
    let pr = data[i * 4], pg = data[i * 4 + 1], pb = data[i * 4 + 2];
    if (tint) {
      pr = pr * (1 - tintAmount) + tint[0] * tintAmount;
      pg = pg * (1 - tintAmount) + tint[1] * tintAmount;
      pb = pb * (1 - tintAmount) + tint[2] * tintAmount;
    }
    r += pr; g += pg; b += pb; n++;
    const x = i % info.width, y = (i / info.width) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (!n) throw new Error('keine deckenden Bildpunkte');
  return {
    rgb: [r / n, g / n, b / n],
    frame: info.width,
    spanX: maxX - minX + 1,
    spanY: maxY - minY + 1,
  };
}

/** Mittlere Farbe eines Untergrundbildes. */
async function measureBackground(buffer) {
  const { data, info } = await sharp(buffer).resize(240, 132, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0;
  const n = info.width * info.height;
  for (let i = 0; i < n; i++) { r += data[i * 3]; g += data[i * 3 + 1]; b += data[i * 3 + 2]; }
  return [r / n, g / n, b / n];
}

// --------------------------------------------------------------------- Messung

// Die Spieldaten liegen in TypeScript. Aufgerufen wird dieses Werkzeug daher
// ueber tsx, das die Module direkt laden kann.
const { TOWERS, TOWER_ORDER, accentFor } = await import('../src/data/towers');
const { ENEMIES } = await import('../src/data/enemies');
const { MAPS } = await import('../src/data/maps');
// Die Groessenregeln kommen aus der Engine, nicht aus einer Kopie hier.
//
// Zuerst standen sie doppelt: `Math.max(radius * 3, 50)` im Spiel und derselbe
// Ausdruck in dieser Messung. Die Gegenprobe fiel dadurch durch - eine
// Aenderung im Spiel aenderte die Messung nicht. Genau der Fehler, den die
// Tor-Bilanz an drei eigenen Proben gefunden hat.
const { enemyArtWidth } = await import('../src/gfx/enemyart');
const { towerArtScale } = await import('../src/gfx/towerart');
/** Kantenlaenge, mit der der Renderer einen Turm zeichnet. */
const TOWER_DRAW = 104;

const problems = [];
const bgArt = readAssets('backgrounds.ts');
const towerArt = readAssets('towers.ts');
const enemyArt = readAssets('enemies.ts');

// Der dunkelste Untergrund ist der schwierigste Fall für helle Objekte, der
// hellste für dunkle. Gemessen wird gegen den, bei dem der Kontrast am
// schwächsten ist.
const bgs = [];
for (const m of MAPS) {
  const buf = bgArt.get(m.id);
  if (!buf) { problems.push(`Untergrundbild für ${m.id} fehlt.`); continue; }
  const rgb = await measureBackground(buf);
  bgs.push({ id: m.id, name: m.name, rgb, lum: luminance(...rgb) });
}
console.log('Untergründe (mittlere Helligkeit):');
for (const b of bgs) console.log(`  ${b.name.padEnd(15)} ${(b.lum * 100).toFixed(1)} %`);

/** Schlechtester Kontrast über alle Untergründe - jeweils gegen den Saum, den
 *  die Karte vorgibt, und gegen den Körper. */
function worstContrast(objLum) {
  let worstBody = Infinity, worstRim = Infinity, where = '';
  for (const b of bgs) {
    const map = MAPS.find((m) => m.id === b.id);
    const rimLum = luminance(...hexRgb(map.palette.rim));
    const cb = contrast(objLum, b.lum);
    const cr = contrast(rimLum, b.lum);
    if (cb < worstBody) { worstBody = cb; where = b.name; }
    if (cr < worstRim) worstRim = cr;
  }
  return { worstBody, worstRim, where };
}

console.log('\nTürme (Kontrast gegen den Untergrund, Breite auf dem Bildschirm):');
for (const id of TOWER_ORDER) {
  const def = TOWERS[id];
  const states = [[null, `${id}_1`, 1], [0, `${id}_${def.branches[0].id}`, 3],
    [1, `${id}_${def.branches[1].id}`, 3]];
  for (const [branch, key, level] of states) {
    const levelScale = towerArtScale(level);
    const buf = towerArt.get(key);
    if (!buf) { problems.push(`Turmbild ${key} fehlt.`); continue; }
    const accent = hexRgb(accentFor(def, branch));
    const m = await measureSprite(buf, accent, 0.38);
    const lum = luminance(...m.rgb);
    const { worstBody, worstRim, where } = worstContrast(lum);
    // Der Turm wird mit 104 Weltpunkten Kantenlänge gezeichnet, die Silhouette
    // nimmt davon ihren Anteil ein.
    const worldW = TOWER_DRAW * levelScale * (m.spanX / m.frame);
    const px = worldW * COVER;
    const bad = worstRim < MIN_RIM_CONTRAST || worstBody < MIN_BODY_CONTRAST
      || px < MIN_TOWER_PX;
    console.log(
      `  ${key.padEnd(16)} Saum ${worstRim.toFixed(2)}  Koerper ${worstBody.toFixed(2)} ` +
      `gegen ${where.padEnd(14)} Breite ${px.toFixed(0).padStart(3)} px${bad ? '   ZU SCHWACH' : ''}`,
    );
    if (worstRim < MIN_RIM_CONTRAST) {
      problems.push(
        `Turm ${key}: Saumkontrast ${worstRim.toFixed(2)} gegen ${where} - ` +
        `mindestens ${MIN_RIM_CONTRAST} nötig, sonst hat die Silhouette keine Kante.`,
      );
    }
    if (worstBody < MIN_BODY_CONTRAST) {
      problems.push(`Turm ${key}: Koerperkontrast ${worstBody.toFixed(2)} gegen ${where} - zu flach.`);
    }
    if (px < MIN_TOWER_PX) {
      problems.push(
        `Turm ${key}: nur ${px.toFixed(0)} Bildschirmpunkte breit - mindestens ${MIN_TOWER_PX} nötig.`,
      );
    }
  }
}

console.log('\nGegner (Kontrast, Breite, Farbe):');
const enemyColours = [];
for (const [id, def] of Object.entries(ENEMIES)) {
  const buf = enemyArt.get(id);
  if (!buf) { problems.push(`Gegnerbild ${id} fehlt.`); continue; }
  const body = hexRgb(def.body);
  const m = await measureSprite(buf, body, 0.38);
  const lum = luminance(...m.rgb);
  const { worstBody, worstRim, where } = worstContrast(lum);
  const worldW = enemyArtWidth(id) * (m.spanX / m.frame);
  const px = worldW * COVER;
  enemyColours.push({ id, name: def.name, lab: toLab(...m.rgb) });
  const bad = worstRim < MIN_RIM_CONTRAST || worstBody < MIN_BODY_CONTRAST
    || px < MIN_ENEMY_PX;
  console.log(
    `  ${def.name.padEnd(14)} Saum ${worstRim.toFixed(2)}  Koerper ${worstBody.toFixed(2)} ` +
    `gegen ${where.padEnd(14)} Breite ${px.toFixed(0).padStart(3)} px${bad ? '   ZU SCHWACH' : ''}`,
  );
  if (worstRim < MIN_RIM_CONTRAST) {
    problems.push(`Gegner ${def.name}: Saumkontrast ${worstRim.toFixed(2)} gegen ${where} - zu wenig Kante.`);
  }
  if (worstBody < MIN_BODY_CONTRAST) {
    problems.push(`Gegner ${def.name}: Koerperkontrast ${worstBody.toFixed(2)} gegen ${where} - zu flach.`);
  }
  if (px < MIN_ENEMY_PX) {
    problems.push(`Gegner ${def.name}: nur ${px.toFixed(0)} Bildschirmpunkte breit - mindestens ${MIN_ENEMY_PX} nötig.`);
  }
}

console.log('\nFarbabstand der Gegnerarten (CIE76, kleinster Wert entscheidet):');
let minPair = { d: Infinity, a: '', b: '' };
for (let i = 0; i < enemyColours.length; i++) {
  for (let j = i + 1; j < enemyColours.length; j++) {
    const d = labDist(enemyColours[i].lab, enemyColours[j].lab);
    if (d < minPair.d) minPair = { d, a: enemyColours[i].name, b: enemyColours[j].name };
  }
}
console.log(
  `  am nächsten: ${minPair.a} und ${minPair.b} bei ${minPair.d.toFixed(1)} ` +
  `(mindestens ${MIN_COLOUR_DIST})`,
);
if (minPair.d < MIN_COLOUR_DIST) {
  problems.push(
    `${minPair.a} und ${minPair.b} liegen farblich nur ${minPair.d.toFixed(1)} auseinander - ` +
    'im Feld nicht zu unterscheiden.',
  );
}

if (problems.length) {
  console.error(`\nLESBARKEIT: ${problems.length} Problem(e)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nLESBARKEIT: alles im Rahmen.');
