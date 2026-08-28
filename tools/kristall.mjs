#!/usr/bin/env node
/**
 * Zeigt der Kristall, wie es um ihn steht?
 *
 * **Warum es dieses Werkzeug gibt.** Bis v181 zeichnete `drawCrystal` Risse
 * als Pfade - aber erst hinter einem `return`, das faellt, sobald das Bild
 * der Ringstation geladen ist. Gemessen nahmen elf von zwoelf Bildern den
 * Bildzweig; den Pfadzweig nur das allererste. Der Satz "der Spielstand ist
 * ein Gegenstand in der Welt" stand im Quelltext und nicht im Spiel, und
 * kein Tor konnte das melden: alle pruefen Verhalten, keines Darstellung.
 *
 * Gemessen werden zwei verschiedene Dinge, und beide werden gebraucht:
 *
 *  1. **Am Erzeugnis** - die gebackene Rissebene. Deckt jede Stufe mehr vom
 *     festen Teil der Station als die vorige? Das faellt um, sobald die
 *     Stufen sich neu mischen statt zu wachsen, oder eine Stufe leer bleibt.
 *  2. **Am Bild** - was auf dem Schirm ankommt. Ein gebackenes Bild, das
 *     niemand stempelt, ist kein Riss. Deshalb wird das Feld zweimal
 *     gezeichnet, voll und fast leer, und dazwischen gemessen.
 *
 * **Warum Kantenenergie und nicht Farbabstand** (Regel 13): der Lichtkranz
 * um den Kristall schrumpft mit der Gesundheit. Er allein aendert 20,3 % der
 * Bildpunkte im Kasten - die Risse nur 1,3 Punkte mehr. Ein Vergleich, der
 * Farben zaehlt, bezeugt die Risse, ohne sie je gemessen zu haben. Ein Riss
 * ist aber kein Verlauf, sondern eine KANTE. Der Nachbarkontrast trennt
 * beides: mit Rissen steigt er um 11 %, ohne faellt er um 3,7 %.
 *
 * **Messstelle** (Regel 12): Spiralhain, normal, 844 x 390 bei doppelter
 * Aufloesung, Ausschnitt 170 Weltpunkte um die Zielplatte, gezeichnet mit
 * @napi-rs/canvas - dieselbe Zeichenschicht wie im Browser, nur ohne ihn.
 *
 * Aufruf:  npm run kristall          Zahlen zeigen
 *          npm run kristall -- --tor Grenzen pruefen
 */

// Geruest, Bilderladen und das Wegwerfbild kommen aus der gemeinsamen
// Werkstatt. Bis v189 stand all das hier - und in zwei weiteren Werkzeugen
// noch einmal (Regel 15).
import { createCanvas } from '@napi-rs/canvas';
import { zeichenwerkstatt, bilderAbwarten, geruestStellen } from './leinwand.mjs';

geruestStellen();

const { getObjectArt } = await import('../src/gfx/objectart.ts');
const { getRissbild, rissStufe, RISS_STUFEN } = await import('../src/gfx/sprites.ts');

const tor = process.argv.includes('--tor');
const probleme = [];

/* ---------------------------------------------------------------- 1. Erzeugnis */

// Wieviel vom FESTEN Teil der Station deckt die Rissebene je Stufe?
//
// Bezugsgroesse ist die Flaeche der Station selbst, nicht die der Kachel
// (Regel 2): sonst haenge die Zahl daran, wie gross gezeichnet wird.
getObjectArt('crystal');
await bilderAbwarten();
const burg = getObjectArt('crystal');
if (!burg) {
  console.log('KRISTALL: kein Bild der Ringstation im Vorrat - nichts zu messen.');
  process.exit(1);
}
const S = 300;
const platte = createCanvas(S, S);
const pg = platte.getContext('2d');
pg.drawImage(burg, 0, 0, S, S);
const feld = pg.getImageData(0, 0, S, S).data;
let fest = 0;
for (let i = 3; i < feld.length; i += 4) if (feld[i] > 190) fest++;

const deckung = [];
for (let stufe = 0; stufe <= RISS_STUFEN; stufe++) {
  const riss = getRissbild(burg, 'tor', S, S, stufe);
  if (!riss) { deckung.push(0); continue; }
  const c = createCanvas(S, S);
  const g = c.getContext('2d');
  g.drawImage(riss, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
  deckung.push(n / fest);
}

console.log(`Feste Flaeche der Station: ${fest} von ${S * S} Bildpunkten`);
console.log('Rissdeckung je Stufe (Anteil der festen Flaeche):');
deckung.forEach((a, i) => console.log(`  Stufe ${i}   ${(a * 100).toFixed(2)} %`));

if (deckung[0] !== 0) probleme.push(`Stufe 0 ist nicht heil: ${(deckung[0] * 100).toFixed(2)} % gerissen.`);
for (let i = 1; i <= RISS_STUFEN; i++) {
  if (!(deckung[i] > deckung[i - 1])) {
    probleme.push(`Stufe ${i} deckt nicht mehr als Stufe ${i - 1} `
      + `(${(deckung[i] * 100).toFixed(2)} % gegen ${(deckung[i - 1] * 100).toFixed(2)} %) - `
      + 'die Risse mischen sich neu, statt zu wachsen.');
  }
}
// Die letzte Stufe muss deutlich mehr sein als die erste, sonst ist der
// Verlauf zwar monoton, aber im Spiel nicht zu unterscheiden. Verhaeltnis,
// keine feste Zahl (Regel 2).
const WACHSTUM = 3.0;
if (deckung[RISS_STUFEN] < deckung[1] * WACHSTUM) {
  probleme.push(`Stufe ${RISS_STUFEN} deckt nur das `
    + `${(deckung[RISS_STUFEN] / Math.max(1e-9, deckung[1])).toFixed(1)}-fache von Stufe 1, `
    + `verlangt ist das ${WACHSTUM}-fache.`);
}
if (rissStufe(1) !== 0 || rissStufe(0) !== RISS_STUFEN) {
  probleme.push(`Die Stufenzuordnung passt nicht: heil ergibt ${rissStufe(1)}, leer ${rissStufe(0)}.`);
}

/* ------------------------------------------------------------------- 2. Bild */

async function bild(leben) {
  const w = await zeichenwerkstatt({
    aufbau: (s) => { s.reset(1, 'normal', 'spiralhain'); s.lives = leben; },
  });
  const z = w.zustand.map.ziel ?? w.zustand.goal;
  const a = w.ausschnitt(z.x, z.y, 170);
  return { kasten: a.punkte, breite: a.breite };
}

/** Nachbarkontrast: was ein Strich hat und ein Verlauf nicht. */
function kanten(d, w) {
  const h = d.length / 4 / w;
  let e = 0;
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = (y * w + x) * 4, r = (y * w + x + 1) * 4, u = ((y + 1) * w + x) * 4;
      e += Math.abs(d[i] - d[r]) + Math.abs(d[i + 1] - d[r + 1]) + Math.abs(d[i + 2] - d[r + 2]);
      e += Math.abs(d[i] - d[u]) + Math.abs(d[i + 1] - d[u + 1]) + Math.abs(d[i + 2] - d[u + 2]);
    }
  }
  return e / (w * h);
}

// Das erste gezeichnete Feld waermt die Puffer auf - Untergrund, Bilder und
// Lichtstempel entstehen erst dabei. Ein Vergleich gegen dieses Bild misst
// das Aufwaermen: 97,6 % der Bildpunkte sind anders, und zwar bei GLEICHEM
// Kristall. Deshalb ein Wegwerfbild vorweg und eine Nullprobe hinterher.
const voll = await bild(60);
const nochmal = await bild(60);
const wenig = await bild(1);

let ungleich = 0;
for (let i = 0; i < voll.kasten.length; i += 4) {
  if (Math.abs(voll.kasten[i] - nochmal.kasten[i])
    + Math.abs(voll.kasten[i + 1] - nochmal.kasten[i + 1])
    + Math.abs(voll.kasten[i + 2] - nochmal.kasten[i + 2]) > 8) ungleich++;
}
if (ungleich !== 0) {
  probleme.push(`Nullprobe: zwei Bilder desselben Zustands sind an ${ungleich} Punkten `
    + 'verschieden. Solange das so ist, misst der Vergleich darunter etwas anderes.');
}

const kVoll = kanten(voll.kasten, voll.breite);
const kWenig = kanten(wenig.kasten, wenig.breite);
const zuwachs = kWenig / kVoll - 1;
console.log('');
console.log('Messstelle: Spiralhain, normal, 844 x 390 bei 2x, Ausschnitt 170 Weltpunkte '
  + 'um die Zielplatte.');
console.log(`Nullprobe (zweimal voll):  ${ungleich} Punkte verschieden`);
console.log(`Kantenenergie voll:        ${kVoll.toFixed(2)}`);
console.log(`Kantenenergie fast leer:   ${kWenig.toFixed(2)}`);
console.log(`Zuwachs:                   ${(zuwachs * 100).toFixed(1)} %`);

// Der Boden kommt aus der Gegenprobe, nicht aus dem Bauch (Regel 13): mit
// abgeschalteten Rissen faellt der Zuwachs auf -3,7 %, mit ihnen liegt er
// bei 11 %. Fuenf Prozent trennen beide Faelle mit Luft nach beiden Seiten.
const BODEN = 0.05;
if (zuwachs < BODEN) {
  probleme.push(`Der Schaden ist im Bild nicht zu sehen: Kantenzuwachs ${(zuwachs * 100).toFixed(1)} %, `
    + `verlangt sind ${(BODEN * 100).toFixed(0)} %. Ohne Risse liegt er bei -3,7 %.`);
}

console.log('');
if (!tor) {
  console.log('KRISTALL: gemessen (kein Tor). Mit --tor werden die Grenzen geprueft.');
} else if (probleme.length) {
  console.log(`KRISTALL: ${probleme.length} Problem(e)`);
  probleme.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
} else {
  console.log('KRISTALL: der Kristall zeigt, wie es um ihn steht.');
}
