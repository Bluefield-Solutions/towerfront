#!/usr/bin/env node
/**
 * Lesbarkeitsmessung.
 *
 * Die Bilanz über alle Tore (docs/Towerfront-TOR-BILANZ.md) hat eine Lücke
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
// eine für die Kante, eine für den Körper.
//
// Die Kantengrenze stand bis v147 auf 3,0 - und war für etwas anderes
// geeicht. Gemessen wurde damals nicht die Kante der Figur, sondern die
// Farbe `palette.rim` aus den Kartendaten: für alle zwanzig Figuren
// dieselbe Zahl (8,43), gegen eine Grenze von 3,0, die sie um das Doppelte
// überschritt. Sie konnte nur anschlagen, wenn jemand die Palette ändert -
// und selbst dann hätte sie nichts über das Spiel gesagt, denn gezeichnet
// wurde dieser Saum nirgends (`drawRim` hatte zwei Aufrufstellen, beide
// unerreichbar).
//
// Jetzt wird der äußerste Ring der Figur selbst gemessen, und der liegt
// naturgemäß viel tiefer: heute 1,02 bis 2,02. Eine übernommene 3,0 hätte
// alle zwanzig Figuren rot gemeldet - eine Grenze, die alles verwirft, sagt
// so wenig wie eine, die nichts verwirft.
//
// **Die Grenze ist deshalb bewusst kein Qualitätsmaßstab, sondern ein
// Zusammenbruchsschutz.** 1,0 heißt: die Kante hat exakt die Helligkeit des
// Bodens, sie ist unsichtbar. Wo das Soll liegt, sagt erst eine Referenz -
// und dafür braucht es `art/roh/` (Befund B1). Bis dahin steht ab 1,5 ein
// Hinweis, damit die schwachen Figuren in jedem Lauf sichtbar bleiben,
// statt in einer grünen Meldung zu verschwinden.
const MIN_RIM_CONTRAST = 1.0;   // Kante = Boden, sie ist komplett weg
const RIM_HINWEIS = 1.5;        // darunter: sichtbar schwach, aber kein Abbruch
/** Wieviele der zwanzig Figuren heute unter dem Hinweiswert liegen.
 *
 *  Das ist die eigentliche Sperre, und sie ist eine RATSCHE, kein Soll: sie
 *  sagt nicht "so gut muss es sein", sondern "so schlecht war es, und
 *  schlechter wird es nicht". Gemessen am 23.08.2026 sind es neun - allen
 *  voran der Koloss mit 1,02 gegen die Frostspalte, dessen Kante dort
 *  praktisch die Helligkeit des Bodens hat.
 *
 *  Zu beheben ist das am BILD, nicht am Code (Befund B1), oder durch das
 *  Randlicht aus TF-012. Bis dahin steht die Zahl in jedem Lauf da, statt in
 *  einer gruenen Meldung zu verschwinden - und wer neue Bilder einbaut, die
 *  schlechter sind, wird rot. */
const MAX_SCHWACHE_KANTEN = 8;
const MIN_BODY_CONTRAST = 1.15; // Körper gegen den Boden - nur noch Rückhalt
const MIN_TOWER_PX = 26;       // Bildschirmpunkte Breite der Turmsilhouette
const MIN_ENEMY_PX = 13;       // dasselbe für Gegner
const MIN_COLOUR_DIST = 12;    // Abstand zweier Gegnerfarben (CIE76)

/** Figuren, deren Kante zwar noch da, aber schwach ist. Sie stehen am Ende
 *  des Laufs, damit sie nicht in zwanzig Zeilen untergehen. */
const schwach = [];
/** Alle gemessenen Kantenwerte - fuer die Probe auf die Probe (siehe unten). */
const kanten = [];
/** Wieviele Figuren ueberhaupt gemessen wurden - ohne diese Zahl waere der
 *  Anteil oben eine Behauptung ueber eine unbekannte Grundmenge. */
let gezaehlt = 0;

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

/** Die Kante einer Figur: mittlere Farbe ihres aeussersten Rings.
 *
 *  Das ist die Zahl, die frueher hier fehlte. Bis v147 wurde als "Saum" die
 *  Farbe `palette.rim` gegen den Untergrund gerechnet - ein Wert aus den
 *  Kartendaten, der mit der Figur nichts zu tun hatte. Er stand deshalb
 *  ZWANZIGMAL identisch in der Ausgabe (8,43), und die Pruefung konnte nur
 *  anschlagen, wenn jemand die Palette aendert. Gezeichnet wurde dieser Saum
 *  ohnehin nirgends: `drawRim` hatte zwei Aufrufstellen, und beide waren
 *  unerreichbar.
 *
 *  Gemessen wird jetzt, was wirklich am Rand steht: deckende Bildpunkte, die
 *  einen durchsichtigen Nachbarn haben. Genau die liegen im Spiel neben dem
 *  Boden, und ihr Kontrast dagegen entscheidet, ob eine Silhouette eine Kante
 *  hat.
 *
 *  Nur DECKENDE Randpunkte (Alpha ueber 200): die halbdurchsichtigen
 *  daneben werden im Spiel mit dem Boden verrechnet und haetten die Zahl
 *  gegen den Boden gezogen - also gegen sich selbst. */
async function measureEdge(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const deckend = (x, y) => (x < 0 || y < 0 || x >= W || y >= H)
    ? false : data[(y * W + x) * 4 + 3] > 200;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!deckend(x, y)) continue;
      if (deckend(x - 1, y) && deckend(x + 1, y) && deckend(x, y - 1) && deckend(x, y + 1)) continue;
      const i = (y * W + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  if (!n) throw new Error('keine Randpunkte');
  return [r / n, g / n, b / n];
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
const { TOWERS, TOWER_ORDER, accentFor, DRAW_SCALE, TURM_BREITE } = await import('../src/data/towers');
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
function worstContrast(objLum, kanteLum) {
  let worstBody = Infinity, worstRim = Infinity, where = '';
  for (const b of bgs) {
    const cb = contrast(objLum, b.lum);
    const cr = contrast(kanteLum, b.lum);
    if (cb < worstBody) { worstBody = cb; where = b.name; }
    if (cr < worstRim) worstRim = cr;
  }
  return { worstBody, worstRim, where };
}

console.log('\nTürme (Kontrast gegen den Untergrund, Breite auf dem Bildschirm):');
for (const id of TOWER_ORDER) {
  const def = TOWERS[id];
  // Welches Bild fuer eine Stufe genommen wird, entscheidet die Engine ueber
  // eine Rueckfallkette - Zweig und Stufe zuerst, dann allgemeiner. Diese
  // Messung hat die Schluessel frueher selbst gebaut und meldete deshalb
  // fehlende Bilder, sobald die Kette griff. Schon der vierte Fall, in dem
  // ein Werkzeug die Regel nachbaut statt sie zu benutzen.
  const states = [[null, 1], [0, 3], [1, 3]];
  for (const [branch, level] of states) {
    const zweig = branch === null ? '1' : def.branches[branch].id;
    let key = null;
    for (let l = level; l >= 1 && !key; l--) {
      for (const k of [`${id}_${zweig}_${l}`, `${id}_1_${l}`]) if (towerArt.has(k)) key = k;
    }
    if (!key) for (const k of [`${id}_${zweig}`, `${id}_1`]) if (towerArt.has(k)) key = k;
    const levelScale = towerArtScale(level);
    const buf = key ? towerArt.get(key) : null;
    if (!buf) { problems.push(`Turmbild fuer ${id}/${zweig} Stufe ${level} fehlt.`); continue; }
    const accent = hexRgb(accentFor(def, branch));
    const m = await measureSprite(buf, accent, 0.38);
    const lum = luminance(...m.rgb);
    const kante = luminance(...await measureEdge(buf));
    const { worstBody, worstRim, where } = worstContrast(lum, kante);
    // Der Turm wird mit 104 Weltpunkten Kantenlänge gezeichnet, die Silhouette
    // nimmt davon ihren Anteil ein.
    // Dieselbe Rechnung wie im Renderer.
    //
    // Dort wird die Kachel so gross gezeichnet, dass die FIGUR den
    // Platzbedarf ausfuellt - der Anteil kuerzt sich also heraus, und die
    // Breite auf dem Schirm ist schlicht Platzbedarf mal Zeichenmassstab.
    // Vorher stand hier eine eigene Formel mit der Kachelbreite, und seit dem
    // Ausgleich stimmte sie nicht mehr. Schon wieder eine Messung, die die
    // Regel nachbaut statt sie zu benutzen.
    const worldW = TURM_BREITE * DRAW_SCALE * levelScale;
    const px = worldW * COVER;
    const bad = worstRim < MIN_RIM_CONTRAST || worstBody < MIN_BODY_CONTRAST
      || px < MIN_TOWER_PX;
    console.log(
      `  ${key.padEnd(16)} Kante ${worstRim.toFixed(2)}  Koerper ${worstBody.toFixed(2)} ` +
      `gegen ${where.padEnd(14)} Breite ${px.toFixed(0).padStart(3)} px${bad ? '   ZU SCHWACH' : ''}`,
    );
    if (worstRim < MIN_RIM_CONTRAST) {
      problems.push(
        `Turm ${key}: Kantenkontrast ${worstRim.toFixed(2)} gegen ${where} - ` +
        `mindestens ${MIN_RIM_CONTRAST} nötig, sonst hat die Silhouette keine Kante.`,
      );
    }
    gezaehlt++;
    kanten.push(worstRim);
    if (worstRim < RIM_HINWEIS) schwach.push(`${key} ${worstRim.toFixed(2)}`);
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
  const kante = luminance(...await measureEdge(buf));
  const { worstBody, worstRim, where } = worstContrast(lum, kante);
  const worldW = enemyArtWidth(id) * (m.spanX / m.frame);
  const px = worldW * COVER;
  enemyColours.push({ id, name: def.name, lab: toLab(...m.rgb) });
  const bad = worstRim < MIN_RIM_CONTRAST || worstBody < MIN_BODY_CONTRAST
    || px < MIN_ENEMY_PX;
  console.log(
    `  ${def.name.padEnd(14)} Kante ${worstRim.toFixed(2)}  Koerper ${worstBody.toFixed(2)} ` +
    `gegen ${where.padEnd(14)} Breite ${px.toFixed(0).padStart(3)} px${bad ? '   ZU SCHWACH' : ''}`,
  );
  if (worstRim < MIN_RIM_CONTRAST) {
    problems.push(`Gegner ${def.name}: Kantenkontrast ${worstRim.toFixed(2)} gegen ${where} - zu wenig Kante.`);
  }
  gezaehlt++;
  kanten.push(worstRim);
  if (worstRim < RIM_HINWEIS) schwach.push(`${def.name} ${worstRim.toFixed(2)}`);
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

// Misst die Kantenmessung ueberhaupt etwas? (v147)
//
// Das ist die Pruefung, die vier Fassungen lang gefehlt hat. Bis v147 stand
// als "Saum" die Kartenfarbe `palette.rim` - fuer alle zwanzig Figuren
// dieselbe Zahl, 8,43, gegen eine Grenze von 3,0. Zwanzig gruene Zeilen
// ueber eine Farbe, die kein Bildpunkt je trug.
//
// Eine Messung, die fuer jede Figur dasselbe liefert, misst nicht die Figur.
// Das ist unabhaengig davon, WAS sie liefert - deshalb steht diese Pruefung
// neben der Ratsche und nicht in ihr: die Ratsche faengt schlechtere Bilder,
// diese hier faengt eine kaputte Messung.
{
  const spanne = Math.max(...kanten) - Math.min(...kanten);
  console.log(`\nKantenmessung: ${kanten.length} Werte, Spanne ${spanne.toFixed(2)} `
    + `(${Math.min(...kanten).toFixed(2)} bis ${Math.max(...kanten).toFixed(2)})`);
  if (spanne < 0.2) {
    problems.push(`Die Kantenmessung liefert fuer alle ${kanten.length} Figuren fast `
      + `denselben Wert (Spanne ${spanne.toFixed(2)}) - sie misst nicht die Figur. `
      + 'Genau so verhielt sich die Fassung mit `palette.rim`.');
  }
}

if (schwach.length) {
  console.log(`\nSchwache Kanten (unter ${RIM_HINWEIS}): ${schwach.length} von ${gezaehlt}`);
  console.log(`  ${schwach.join(', ')}`);
  console.log('  Befund B1 - am Bild zu beheben, nicht am Code. Die Ratsche steht bei '
    + `${MAX_SCHWACHE_KANTEN}.`);
}
if (schwach.length > MAX_SCHWACHE_KANTEN) {
  problems.push(`${schwach.length} von ${gezaehlt} Figuren haben eine Kante unter `
    + `${RIM_HINWEIS} - heute waren es ${MAX_SCHWACHE_KANTEN}. Neue Bilder duerfen die `
    + 'Lesbarkeit nicht weiter druecken.');
}

if (problems.length) {
  console.error(`\nLESBARKEIT: ${problems.length} Problem(e)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nLESBARKEIT: alles im Rahmen.');
