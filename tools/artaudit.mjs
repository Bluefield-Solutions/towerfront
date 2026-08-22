#!/usr/bin/env node
/**
 * Grafik-Audit — misst unsere Bilder gegen die Prinzipien, nach denen die
 * gut bewerteten Vertreter des Genres gebaut sind.
 *
 * Die Prinzipien sind nicht von mir — und seit v105 auch nicht mehr aus der
 * Lehre, sondern aus der **Messung am Zielbild**.
 *
 * Das ist der Unterschied, an dem dieses Werkzeug drei Jahre lang in die
 * falsche Richtung gezeigt hat. Die erste Fassung maß gegen die Lehre zur
 * flachen Zeichnung: drei bis vier Farben je Form, Figuren gesättigter als
 * der Boden, Figuren heller als der Boden. Dann hat der Grafik-Audit ein
 * echtes Zielbild vermessen (Abschnitt 5) und dabei genau diese drei Sätze
 * widerlegt — im Zielbild trägt ein einzelner Turm **889 Farben**, ist der
 * Boden mit 0,51 **gesättigter** als der Turm mit 0,37, und Turm und Boden
 * liegen mit 0,36 gegen 0,33 im **selben** Helligkeitsband.
 *
 * Die Korrektur steht seit v55 in Abschnitt 5.2 des Dokuments. Nur stand sie
 * nirgends im Werkzeug — es hat sie in jedem Lauf weiter als Fehler gemeldet.
 * Wer danach gehandelt hätte, hätte die Farbzahl auf 40 gedrückt, den Boden
 * entfärbt und die Figuren aufgehellt: drei Schritte, jeder von der Referenz
 * WEG.
 *
 * Deshalb steht die Referenz jetzt hier als eine Tabelle, in einer Fassung,
 * und die Befunde werden aus ihr gerechnet. Was gilt:
 *
 *  - **In einer gerenderten Szene macht das Licht die Hierarchie, nicht die
 *    Farbe.** Türme stehen in der Sonne, werfen Schatten, haben Glanzkanten.
 *    Ein Sättigungsgefälle wäre dort sogar falsch — es entfärbt den Boden.
 *  - **Kein reines Schwarz.** Das gilt unverändert, und es ist gemessen:
 *    1,3 % im Zielbild.
 *  - **Eine Sonne über alle Karten.** Gilt ebenfalls unverändert.
 *  - **Die Dichte trägt die Bildsprache.** Nicht "überall gleich", sondern
 *    im Band: Figuren dichter als der Boden, aber beide gedeckelt.
 *
 * Aufruf: npm run grafik
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createCanvas, Image as NativeImage } from '@napi-rs/canvas';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Eine Zeichenflaeche, damit das Terrain hier gebacken werden kann.
//
// Dieselbe Notloesung wie in der Bildabnahme: die Zeichenschicht braucht ein
// Dokument, das Flaechen anlegt, und eine Bildklasse, die Datenadressen
// annimmt. Kein DOM, kein Browser.
globalThis.document = {
  createElement: (tag) => {
    if (tag !== 'canvas') throw new Error(`nur canvas, nicht ${tag}`);
    return createCanvas(1, 1);
  },
};
globalThis.window = { devicePixelRatio: 2, innerWidth: 844, innerHeight: 390 };
let offen = 0;
globalThis.Image = class extends NativeImage {
  set src(wert) {
    offen++;
    const fertig = () => { offen--; };
    const vorLoad = this.onload, vorErr = this.onerror;
    this.onload = () => { fertig(); vorLoad?.(); };
    this.onerror = () => { fertig(); vorErr?.(); };
    super.src = wert;
  }
  get src() { return super.src; }
};
const warten = async () => {
  for (let i = 0; i < 40 && offen > 0; i++) await new Promise((r) => setTimeout(r, 25));
};

const { MAPS } = await import('../src/data/maps.ts');
const { bakeTerrain } = await import('../src/gfx/terrain.ts');
const { getBackground } = await import('../src/gfx/backgrounds.ts');
const { GameState } = await import('../src/game/state.ts');

const lies = (datei) => {
  const text = readFileSync(join(ROOT, 'src/gfx/assets', datei), 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/'([^']+)': 'data:image\/webp;base64,([^']+)'/g)) {
    out.set(m[1], Buffer.from(m[2], 'base64'));
  }
  return out;
};

/** Alle Kennzahlen eines Bildes auf einmal. */
async function messen(buffer, { transparent = true } = {}) {
  const bild = sharp(buffer).ensureAlpha();
  const { data, info } = await bild.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  const farben = new Map();
  let n = 0, sumL = 0, sumS = 0, sumC = 0, dunkel = 0, schwarz = 0;
  const werte = [];

  const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  /** Buntheit, wie das Auge sie liest.
   *
   *  Die Saettigung nach (max-min)/max stammt aus HSV und kennt die
   *  Helligkeit nicht: ein dunkles Braun wie RGB(50,30,20) kommt dort auf
   *  0,60 und wirkt trotzdem nicht bunt. Chroma im CIELAB-Raum rechnet die
   *  Helligkeit mit ein - 0 ist grau, um 20 gedaempft, um 40 kraeftig, ueber
   *  60 grell. */
  const chroma = (r, g, b) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const R = f(r), G = f(g), B = f(b);
    const k = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const X = k((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
    const Y = k(0.2126 * R + 0.7152 * G + 0.0722 * B);
    const Z = k((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
    return Math.hypot(500 * (X - Y), 200 * (Y - Z));
  };

  for (let i = 0; i < W * H; i++) {
    const a = data[i * 4 + 3];
    if (transparent && a < 200) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    n++;
    const l = lum(r, g, b);
    sumL += l;
    werte.push(l);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    sumS += max === 0 ? 0 : (max - min) / max;
    sumC += chroma(r, g, b);
    if (l < 0.06) dunkel++;
    if (r < 12 && g < 12 && b < 12) schwarz++;
    // Farben auf 5 Bit je Kanal zusammenfassen - feiner unterscheidet das
    // Auge bei diesen Groessen ohnehin nicht.
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    farben.set(key, (farben.get(key) ?? 0) + 1);
  }
  if (!n) return null;

  // Wieviele Farben tragen zusammen 90 Prozent der Flaeche? Das ist die
  // Zahl, die das Auge als "Palette" wahrnimmt - nicht die Gesamtzahl.
  const sortiert = [...farben.values()].sort((a, b) => b - a);
  let summe = 0, tragend = 0;
  for (const c of sortiert) { summe += c; tragend++; if (summe >= n * 0.9) break; }

  werte.sort((a, b) => a - b);
  const p = (q) => werte[Math.min(werte.length - 1, Math.floor(werte.length * q))];

  // Detaildichte: mittlere Helligkeitsaenderung zwischen Nachbarpunkten.
  // Ein Foto hat viel davon, eine flaechige Zeichnung wenig.
  //
  // ACHTUNG, ihre Grenze: sie unterscheidet Korn nicht von Form. Eine Niete
  // und ein Kompressionsartefakt sehen fuer sie gleich aus, und jeder Filter,
  // der das eine senkt, senkt das andere mit. Deshalb steht darunter der
  // Rauschschaetzer - siehe `npm run entrauschprobe`.
  let kanten = 0, kn = 0;
  for (let y = 1; y < H - 1; y += 2) {
    for (let x = 1; x < W - 1; x += 2) {
      const i = (y * W + x) * 4;
      if (transparent && data[i + 3] < 200) continue;
      const j = (y * W + x + 1) * 4, k = ((y + 1) * W + x) * 4;
      if (transparent && (data[j + 3] < 200 || data[k + 3] < 200)) continue;
      const a1 = lum(data[i], data[i + 1], data[i + 2]);
      kanten += Math.abs(a1 - lum(data[j], data[j + 1], data[j + 2]))
        + Math.abs(a1 - lum(data[k], data[k + 1], data[k + 2]));
      kn++;
    }
  }

  // Rauschen nach Immerkaer.
  //
  // Der Kern [[1,-2,1],[-2,4,-2],[1,-2,1]] antwortet auf glatte Verlaeufe und
  // auf gerade Kanten mit Null - was durchkommt, ist eher Korn als Form. Das
  // ist die Kennzahl, die die Dichte nicht liefern kann.
  //
  // Zur Einordnung gemessen: eine glatte Flaeche 0,00; dieselbe mit
  // Gauss-Rauschen der Staerke 12 dann 1,17. Unsere Untergruende liegen bei
  // 0,11 bis 0,14, unsere Figuren bei 0,68 bis 0,91.
  let rs = 0, rn = 0;
  const lxy = (x, y) => {
    const i = (y * W + x) * 4;
    return lum(data[i], data[i + 1], data[i + 2]);
  };
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let voll = true;
      if (transparent) {
        for (let dy = -1; dy <= 1 && voll; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (data[((y + dy) * W + x + dx) * 4 + 3] < 200) { voll = false; break; }
          }
        }
      }
      if (!voll) continue;
      rs += Math.abs(
        lxy(x - 1, y - 1) - 2 * lxy(x, y - 1) + lxy(x + 1, y - 1)
        - 2 * lxy(x - 1, y) + 4 * lxy(x, y) - 2 * lxy(x + 1, y)
        + lxy(x - 1, y + 1) - 2 * lxy(x, y + 1) + lxy(x + 1, y + 1),
      );
      rn++;
    }
  }

  return {
    flaeche: n,
    chroma: sumC / n,
    rauschen: rn ? (Math.sqrt(Math.PI / 2) * rs / (6 * rn)) * 100 : 0,
    palette: tragend,
    helligkeit: sumL / n,
    saettigung: sumS / n,
    spanne: p(0.95) - p(0.05),
    schwarzAnteil: schwarz / n,
    dunkelAnteil: dunkel / n,
    dichte: kn ? (kanten / kn) * 100 : 0,
  };
}

const z = (v, k = 2) => v.toFixed(k).padStart(6);

console.log('GRAFIK-AUDIT\n');
const befunde = [];

/** Woher kommt das Licht in einem Bild?
 *
 *  An jeder Kante ist eine Seite heller als die andere. Mittelt man ueber alle
 *  Kanten, zeigt der Vektor zur Lichtquelle. Das ist die eine Eigenschaft, die
 *  ueber alle Karten gleich sein muss - sonst steht die Sonne je Karte woanders
 *  und die Szene kippt. Ein geliefertes Bild mit Sonne von rechts faellt hier
 *  auf, bevor es im Spiel landet.
 */
async function lichtrichtung(buffer) {
  const B = 300;
  const { data, info } = await sharp(buffer).resize(B, null).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const l = (i) => (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  let gx = 0, gy = 0, n = 0;
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const dx = l(((y) * W + x + 2) * 4) - l(((y) * W + x - 2) * 4);
      const dy = l(((y + 2) * W + x) * 4) - l(((y - 2) * W + x) * 4);
      if (Math.hypot(dx, dy) < 0.12) continue;
      gx += dx; gy += dy; n++;
    }
  }
  // Der Vektor zeigt zum Helleren, also zur Sonne.
  return { winkel: (Math.atan2(gy / n, gx / n) * 180) / Math.PI, kanten: n };
}

// ------------------------------------------------------------- Untergruende
//
// Gemessen wird das GEBACKENE Terrain, nicht das Quellbild.
//
// Bis v105 stand hier das Quellbild, und das war falsch - dazwischen liegen
// der Weg, die Randsteine, die Felsen, die Tonwertangleichung, die Vignette
// und der Saum. Beim Quellbild misst man etwas, das niemand zu sehen bekommt.
//
// Aufgefallen ist es, als die Angleichung eingebaut wurde: das gebackene
// Terrain sprang von 0,20 auf 0,30 Helligkeit, und das Werkzeug meldete
// unveraendert 0,22 und "zu niedrig". Ein Werkzeug, das eine behobene Sache
// weiter anmahnt, ist derselbe Fehler wie eines, das in die falsche Richtung
// zeigt - nur schwerer zu bemerken.
console.log('Untergründe (gebackenes Terrain, nicht das Quellbild)');
console.log('  Name             Palette  Helligk  Sätt.  Spanne  Dichte  Chroma');
const bg = lies('backgrounds.ts');
const bgWerte = [];
for (const map of MAPS) {
  const s = new GameState(map, 'normal');
  getBackground(map.id);
  await warten();
  const cv = bakeTerrain(map, s.lanes, map.palette, getBackground(map.id));
  const roh = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  const m = await messen(await sharp(Buffer.from(roh.data), {
    raw: { width: cv.width, height: cv.height, channels: 4 },
  }).png().toBuffer(), { transparent: false });
  // Die Lichtrichtung kommt weiter aus dem Quellbild: sie ist eine
  // Eigenschaft des gelieferten Bildes, und Weg und Vignette wuerden sie
  // nur verrauschen.
  const licht = await lichtrichtung(bg.get(map.id));
  bgWerte.push({ id: map.id, ...m, licht: licht.winkel });
  console.log(`  ${map.id.padEnd(16)} ${String(m.palette).padStart(6)}  ${z(m.helligkeit)}  ${z(m.saettigung)}  ${z(m.spanne)}  ${z(m.dichte)}  ${m.chroma.toFixed(1).padStart(5)}`);
}

// --------------------------------------------------- Figuren in Anzeigegroesse
//
// Gemessen wird, was auf dem Schirm landet, nicht die Quelldatei.
//
// Die Bilder liegen als 256er vor und werden mit rund 108 (Turm) bis 58
// (Schleicher) Geraetepunkten gezeichnet. Das ist kein Detail: die
// Detaildichte zaehlt Nachbarpunkte, und Verkleinern ERHOEHT sie, weil es
// dasselbe Detail auf weniger Punkte draengt. Gemessen liegt der Bogenturm
// an der Quelle bei 8,46 und in Anzeigegroesse bei 13,55.
//
// Bis v106 stand hier die Quelle. Fuer die Untergruende ist die Messstelle
// in v106 geradegerueckt worden, fuer die Figuren jetzt - derselbe Fehler,
// zweimal dieselbe Datei.
//
// Der Massstab: die Leinwand misst auf dem iPhone quer 1688 x 780
// Geraetepunkte bei einer Welt von 1920 x 1080. Gemessen im Browsertor,
// nicht geschaetzt.
const ANZEIGE_MASSSTAB = 0.8;
const TURM_WELT = 96 * 1.32 / 0.94;

/** Auf Anzeigegroesse bringen, dann messen. */
async function messenAngezeigt(buf, weltbreite) {
  const px = Math.max(8, Math.round(weltbreite * ANZEIGE_MASSSTAB));
  return messen(await sharp(buf).ensureAlpha().resize(px).png().toBuffer());
}

// ------------------------------------------------------------------- Tuerme
console.log('\nTürme (in Anzeigegröße gerechnet)');
console.log('  Name             Palette  Helligk  Sätt.  Spanne  Dichte  Schwarz');
const tw = lies('towers.ts');
const twWerte = [];
for (const [id, buf] of tw) {
  if (!/_1$/.test(id)) continue;
  const m = await messenAngezeigt(buf, TURM_WELT);
  twWerte.push({ id, ...m });
  console.log(`  ${id.padEnd(16)} ${String(m.palette).padStart(6)}  ${z(m.helligkeit)}  ${z(m.saettigung)}  ${z(m.spanne)}  ${z(m.dichte)}  ${z(m.schwarzAnteil * 100, 1)}%`);
}

// ------------------------------------------------------------------ Gegner
console.log('\nGegner (in Anzeigegröße gerechnet)');
console.log('  Name             Palette  Helligk  Sätt.  Spanne  Dichte  Schwarz');
const en = lies('enemies.ts');
const { enemyArtWidth } = await import('../src/gfx/enemyart.ts');
const enWerte = [];
for (const [id, buf] of en) {
  const m = await messenAngezeigt(buf, enemyArtWidth(id));
  enWerte.push({ id, ...m });
  console.log(`  ${id.padEnd(16)} ${String(m.palette).padStart(6)}  ${z(m.helligkeit)}  ${z(m.saettigung)}  ${z(m.spanne)}  ${z(m.dichte)}  ${z(m.schwarzAnteil * 100, 1)}%`);
}

// --------------------------------------------------------- Lichtrichtung
console.log('\nLichtrichtung (Winkel zur Sonne, -135 = oben links)');
for (const b of bgWerte) console.log(`  ${b.id.padEnd(16)} ${b.licht.toFixed(0).padStart(5)}°`);

// --------------------------------------------------------------- Bewertung
const mittel = (arr, f) => arr.reduce((a, b) => a + f(b), 0) / arr.length;
const figuren = [...twWerte, ...enWerte];

/** Die Referenz, in einer Fassung.
 *
 *  Herkunft: `docs/Towerfront-GRAFIK-AUDIT.md`, Abschnitt 5.4 — abgeleitet
 *  aus der Messung eines echten Zielbilds (Abschnitt 5). Die Zahlen in
 *  Klammern sind die dort gemessenen Werte des Zielbilds selbst.
 *
 *  Steht eine Zahl in beiden Dateien, driftet sie. Deshalb ist DIESE hier
 *  die Fassung, die zählt, und das Dokument verweist hierher - dieselbe
 *  Lehre wie aus S76: wer eine Zahl in ein Dokument schreibt, schreibt den
 *  Befehl daneben, der sie erzeugt. */
const REFERENZ = {
  figur: {
    helligkeit: [0.33, 0.40],   // Zielturm 0,36
    saettigung: [0.35, 0.45],   // Zielturm 0,37
    // Gemessen, aber NICHT als Befund - siehe DICHTE_VERHAELTNIS.
    dichte: [3, 6],             // Zielturm 3,44, Aufloesung unbekannt
  },
  grund: {
    helligkeit: [0.30, 0.36],   // Zielboden 0,33
    // Gemessen, aber NICHT als Befund verwendet.
    //
    // Das Band stammt aus EINER Szene - "warmer Sandboden in Ocker". Fuer
    // eine Schneelandschaft ist es keine Vorgabe, sondern eine Fehlanzeige:
    // eine Frostspalte auf 0,50 zu ziehen hiesse, sie knallblau zu machen.
    //
    // Bis v106 stand hier ein Befund "Untergrundsaettigung streut", der genau
    // das verlangt haette. Angesehen unterscheiden sich die drei Karten
    // gerade richtig: warmer Herbstocker (Chroma 28), grauer Fels mit
    // Lavaspalten (16), blauer Schnee (12). Keine ist grau, keine grell.
    //
    // Die Regel dahinter - "in der Farbe unterscheiden, nicht in der
    // Lautstaerke" - stammte aus meiner eigenen Feder, nicht aus der
    // Referenz. Das ist genau der Fehler, vor dem Regel 10 warnt, und er ist
    // hier zweimal hintereinander passiert: erst mass das Werkzeug gegen eine
    // verworfene Lehre, dann gegen eine Einzelmessung, die als Band fuer eine
    // Vielfalt herhalten musste, fuer die sie nie gedacht war.
    saettigung: [0.45, 0.55],   // Zielboden 0,51 - eine Sandszene, mehr nicht
    dichte: [1.5, 3],           // Zielboden 1,63
  },
  /** Wieviel mehr Feindetail eine Figur tragen darf als der Boden.
   *
   *  Das Verhaeltnis statt der Absolutwerte, und der Grund ist Regel 2. Die
   *  Detaildichte zaehlt Nachbarpunkte und haengt damit an der Aufloesung:
   *  derselbe Bogenturm misst an der 256er Quelle 8,46 und in Anzeigegroesse
   *  13,55. Das Band 3 bis 6 stammt aus einem Zielbild, dessen Aufloesung
   *  nirgends steht - als Absolutgrenze ist es deshalb nicht zu gebrauchen.
   *
   *  Das Verhaeltnis ueberlebt das: im Zielbild traegt der Turm 3,44 gegen
   *  1,63 beim Boden, also gut das Doppelte. Beide Zahlen stammen aus
   *  DEMSELBEN Bild und damit derselben Aufloesung - was sich herauskuerzt,
   *  ist genau die Unbekannte.
   *
   *  Die 3 statt 2,1 ist Toleranz, keine Absenkung: eine einzige Referenz
   *  ergibt keine Streuung, aus der man eine Grenze ableiten koennte. */
  dichteVerhaeltnis: 3,         // Zielbild 3,44 / 1,63 = 2,1

  schwarzAnteil: 0.02,          // Zielbild 1,3 %
  lichtSpanne: 40,
  lichtMitte: [-175, -95],
};

console.log('\n─── Befunde ───\n');

/** Liegt der Wert im Band? Und wenn nicht, in welche Richtung? */
const ausserhalb = (wert, [min, max]) =>
  wert < min ? 'zu niedrig' : wert > max ? 'zu hoch' : null;

/** Eine Kennzahl über eine Gruppe, gegen ihr Band. */
function pruefen(gruppe, name, feld, band, einheit = '') {
  const m = mittel(gruppe, (f) => f[feld]);
  const abweichler = gruppe
    .map((f) => ({ id: f.id, wert: f[feld], wie: ausserhalb(f[feld], band) }))
    .filter((f) => f.wie);
  const lage = ausserhalb(m, band);
  console.log(
    `  ${name.padEnd(24)} ${m.toFixed(2)}${einheit}  Band ${band[0]}-${band[1]}` +
    `  ${lage ? lage.toUpperCase() : 'im Band'}` +
    `  (${abweichler.length}/${gruppe.length} daneben)`,
  );
  return { m, lage, abweichler };
}

console.log('Gegen die Referenz aus Abschnitt 5.4:\n');

const figH = pruefen(figuren, 'Figuren Helligkeit', 'helligkeit', REFERENZ.figur.helligkeit);
const figS = pruefen(figuren, 'Figuren Sättigung', 'saettigung', REFERENZ.figur.saettigung);
const figD = pruefen(figuren, 'Figuren Detaildichte', 'dichte', REFERENZ.figur.dichte);
const grH = pruefen(bgWerte, 'Untergrund Helligkeit', 'helligkeit', REFERENZ.grund.helligkeit);
const grS = pruefen(bgWerte, 'Untergrund Sättigung', 'saettigung', REFERENZ.grund.saettigung);
const grD = pruefen(bgWerte, 'Untergrund Detaildichte', 'dichte', REFERENZ.grund.dichte);

const nenne = (a) => a.slice(0, 3).map((f) => `${f.id} ${f.wert.toFixed(2)}`).join(', ');

// --- Die Figuren: das Verhaeltnis, nicht der Absolutwert.
const verhaeltnis = figD.m / grD.m;
console.log(`\n  Detaildichte Figur zu Untergrund: ${verhaeltnis.toFixed(1)}-fach ` +
  `(Zielbild 2,1, erlaubt bis ${REFERENZ.dichteVerhaeltnis})`);
if (verhaeltnis > REFERENZ.dichteVerhaeltnis) {
  befunde.push(
    `Figuren rauschen: sie tragen ${verhaeltnis.toFixed(1)}-mal so viel Feindetail wie der ` +
    `Untergrund (${figD.m.toFixed(1)} gegen ${grD.m.toFixed(1)}), im Zielbild sind es 2,1. ` +
    'Das ist Befund B1. Nachbearbeitung hilft NICHT: Weichzeichnen und Median ' +
    'senken die Zahl, kosten aber sichtbar Form - Panzerplatten, Armbrust, Beine. ' +
    'Nachgewiesen mit `npm run entrauschprobe`. ' +
    'Der Weg führt über neue Bilder nach Abschnitt 5.4, nicht über Filter.',
  );
}
if (figH.lage) {
  befunde.push(
    `Figuren im Mittel ${figH.lage}: Helligkeit ${figH.m.toFixed(2)} gegen ` +
    `${REFERENZ.figur.helligkeit.join(' bis ')} (Zielturm 0,36).`,
  );
}
if (figS.lage) {
  befunde.push(
    `Figuren im Mittel ${figS.lage} gesättigt: ${figS.m.toFixed(2)} gegen ` +
    `${REFERENZ.figur.saettigung.join(' bis ')} (Zielturm 0,37).`,
  );
}

// --- Der Untergrund.
//
// Abstand A aus dem Audit: das Zielbild ist eine Tagszene, unsere eine
// Nachtszene. Der groesste einzelne Abstand, und keine Detailarbeit an
// Einzelbildern holt ihn auf.
if (grH.lage) {
  befunde.push(
    `Untergrund ${grH.lage}: Helligkeit ${grH.m.toFixed(2)} gegen ` +
    `${REFERENZ.grund.helligkeit.join(' bis ')} (Zielboden 0,33). ` +
    (grH.lage === 'zu niedrig'
      ? 'Das ist Abstand A: das Zielbild ist eine Tagszene, unseres eine Nachtszene.'
      : ''),
  );
}
// Kein Befund mehr aus dem Saettigungsband - siehe REFERENZ.grund.saettigung.
//
// Geprueft wird stattdessen, was ohne Referenz zu verantworten ist: dass
// keine Karte in Grau kippt und keine grell wird. Beide Grenzen kommen aus
// der Farbenlehre, nicht aus unseren eigenen Werten - sonst wanderte das
// Soll mit der eigenen Leistung mit (Regel 10).
for (const k of bgWerte) {
  if (k.chroma < 5) {
    befunde.push(`${k.id} ist praktisch grau (Chroma ${k.chroma.toFixed(1)}).`);
  }
  if (k.chroma > 60) {
    befunde.push(`${k.id} ist grell (Chroma ${k.chroma.toFixed(1)}) - das erschlägt die Figuren.`);
  }
}
if (grD.lage) {
  befunde.push(
    `Untergrund ${grD.lage === 'zu niedrig' ? 'zu glatt' : 'zu unruhig'}: Detaildichte ` +
    `${grD.m.toFixed(2)} gegen ${REFERENZ.grund.dichte.join(' bis ')} (Zielboden 1,63). ` +
    (grD.lage === 'zu niedrig'
      ? 'Der Boden trägt zu wenig Struktur - Fels und Grasbüschel fehlen IM Bild.'
      : ''),
  );
}

// --- Reines Schwarz. Unveraendert gueltig, und gemessen: 1,3 % im Zielbild.
const mitSchwarz = figuren.filter((f) => f.schwarzAnteil > REFERENZ.schwarzAnteil);
console.log(`\n  Reines Schwarz: ${mitSchwarz.length} von ${figuren.length} Figuren über ` +
  `${(REFERENZ.schwarzAnteil * 100).toFixed(0)} % Fläche (Zielbild 1,3 %)`);
if (mitSchwarz.length) {
  befunde.push(
    `Reines Schwarz in ${mitSchwarz.length} Figuren ` +
    `(${mitSchwarz.slice(0, 3).map((f) => `${f.id} ${(f.schwarzAnteil * 100).toFixed(0)} %`).join(', ')}). ` +
    'Es frisst Löcher in die Form statt sie zu begrenzen.',
  );
}

// --- Eine Sonne. Ebenfalls unveraendert gueltig.
{
  const winkel = bgWerte.map((b) => b.licht);
  const spanne = Math.max(...winkel) - Math.min(...winkel);
  const mitte = winkel.reduce((a, b) => a + b, 0) / winkel.length;
  console.log(`  Lichtrichtung: Spanne ${spanne.toFixed(0)}°, Mitte ${mitte.toFixed(0)}° ` +
    `(erlaubt bis ${REFERENZ.lichtSpanne}°, ${REFERENZ.lichtMitte.join(' bis ')}°)`);
  if (spanne > REFERENZ.lichtSpanne) {
    befunde.push(
      `Die Sonne steht je Karte woanders (Spanne ${spanne.toFixed(0)}°). ` +
      'Figurenschatten passen dann auf einer Karte und auf der nächsten nicht.',
    );
  }
  if (mitte > REFERENZ.lichtMitte[1] || mitte < REFERENZ.lichtMitte[0]) {
    befunde.push(
      `Die Sonne steht im Mittel bei ${mitte.toFixed(0)}°, erwartet oben links. ` +
      'Die Schatten im Renderer zeigen in die falsche Richtung.',
    );
  }
}

// --- Die Farbzahl: gemessen, aber NICHT als Befund.
//
// Sie stand hier als Fehler, sobald eine Figur ueber 40 Farben trug - alle
// zwoelf taten das. Das Zielbild traegt 889 Farben in einem einzigen Turm.
// Eine Pruefung, die die Referenz selbst durchfallen liesse, misst das
// falsche Ding. Der Wert bleibt in der Ausgabe, weil er den Unterschied
// zwischen gezeichnet und gerendert zeigt - aber er ist kein Befund.
console.log(`  Palette: Figuren im Mittel ${mittel(figuren, (f) => f.palette).toFixed(0)} Farben, ` +
  'Zielturm 889 - kein Befund, siehe Abschnitt 5.4.');

// --- Rauschen: gemessen, aber ohne Band.
//
// Fuer diese Kennzahl gibt es keine Referenz - das Zielbild liegt nicht mehr
// vor, und eine Grenze aus unseren eigenen Werten abzuleiten waere genau der
// Fehler aus Regel 10. Sie steht hier, weil sie die Frage beantwortet, die
// die Dichte offen laesst: ist das Korn oder ist das Form?
console.log(`  Rauschen: Figuren ${mittel(figuren, (f) => f.rauschen).toFixed(2)}, ` +
  `Untergrund ${mittel(bgWerte, (f) => f.rauschen).toFixed(2)} ` +
  '(glatte Fläche 0,00 - sichtbares Korn ab etwa 1,00) - kein Band, siehe Kopf.');

console.log(`\n─── ${befunde.length} Befund(e) ───\n`);
for (const b of befunde) console.log(`  • ${b}\n`);
if (!befunde.length) console.log('  Keine. Alle Prinzipien erfüllt.\n');

// --- Als Tor: nur das, was wir halten koennen.
//
// Mit `--tor` bricht dieser Lauf ab, wenn der UNTERGRUND sein Band verlaesst.
// Nur der Untergrund, und das ist Absicht: die Figurendichte liegt mit 14,7
// weit ueber ihrem Band, dort ist der Befund B1 offen und braucht neue
// Bilder. Ein Tor, das an einem bekannten offenen Punkt dauerrot steht, wird
// abgeschaltet - und dann haelt es auch das nicht mehr, was es halten
// koennte.
//
// Der Untergrund dagegen ist seit v118 im Band und laesst sich halten. Bis
// dahin lagen zwei von drei Karten DARUNTER, ohne dass es jemandem auffiel:
// `npm run grafik` war kein Tor, und Ausgaben ohne Tor liest man beim
// dritten Mal nicht mehr.
if (process.argv.includes('--tor')) {
  const band = REFERENZ.grund.dichte;
  // JE KARTE, nicht im Mittel.
  //
  // Der erste Entwurf pruefte den Mittelwert - und die Gegenprobe blieb
  // gruen: ohne Korn liegt das Mittel bei 1,52 und damit knapp IM Band,
  // waehrend zwei von drei Karten darunter liegen. Ein Mittelwert kann jede
  // einzelne Karte verfehlen und trotzdem passen; er ist die falsche Frage.
  // Die Ausgabe zaehlte die Ausreisser die ganze Zeit mit ("2/3 daneben") -
  // ich hatte sie nur nicht zur Bedingung gemacht.
  const daneben = bgWerte.filter((f) => f.dichte < band[0] || f.dichte > band[1]);
  if (daneben.length) {
    console.error(`\nGRAFIKTOR: ${daneben.length} von ${bgWerte.length} Untergruenden `
      + `liegen ausserhalb des Bandes ${band[0]} bis ${band[1]}:`);
    for (const f of daneben) {
      console.error(`  ${f.id}: ${f.dichte.toFixed(2)} - `
        + (f.dichte < band[0]
          ? 'zu wenig, der Boden ist eine Flaeche und die Figuren stechen heraus (B1).'
          : 'zu viel, er rauscht.'));
    }
    process.exit(1);
  }
  console.log(`GRAFIKTOR: alle ${bgWerte.length} Untergruende im Band ${band[0]} bis ${band[1]} `
    + `(${bgWerte.map((f) => f.dichte.toFixed(2)).join(', ')}).`);
}
