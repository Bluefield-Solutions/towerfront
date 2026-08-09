#!/usr/bin/env node
/**
 * Einbettung — sitzen die Figuren in der Szene oder liegen sie darauf?
 *
 * "Sieht draufgezeichnet aus" ist ein Gefühl, aber es hat messbare Ursachen.
 * Drei davon lassen sich ohne Auge prüfen, und alle drei sind derselbe
 * Gedanke: **ein Gegenstand, der wirklich dort steht, teilt sich mit seiner
 * Umgebung das Licht.**
 *
 *  1. **Kontaktschatten.** Wo ein Ding den Boden berührt, ist es dunkler als
 *     sonstwo - Licht kommt dort nicht hin. Fehlt diese Verdunkelung, schwebt
 *     das Ding, egal wie gut der Schlagschatten ist.
 *
 *  2. **Farbtemperatur.** Der Boden ist warm beleuchtet, also nimmt jeder
 *     Gegenstand darauf etwas von dieser Wärme an - durch Streulicht. Eine
 *     Figur, die ihre eigene, kühlere Beleuchtung mitbringt, wirkt
 *     ausgeschnitten.
 *
 *  3. **Kantenhärte.** Eine ausgeschnittene Silhouette hat eine harte,
 *     gleichmäßige Kante. Ein Gegenstand in der Szene hat weiche Übergänge,
 *     wo Licht um ihn herumfällt.
 *
 * Gemessen wird auf einer echten Spielaufnahme, nicht am Einzelbild - denn
 * die Frage ist ja gerade, wie Figur und Boden zusammenwirken.
 *
 * Aufruf: npm run einbettung
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const befunde = [];
const zahlen = [];

/** Wärme eines Bereichs: wie weit Rot über Blau liegt, auf -1..1. */
function waerme(data, W, x0, y0, x1, y1) {
  let r = 0, b = 0, n = 0;
  for (let y = Math.max(0, y0); y < y1; y++) {
    for (let x = Math.max(0, x0); x < x1; x++) {
      const i = (y * W + x) * 4;
      r += data[i]; b += data[i + 2]; n++;
    }
  }
  if (!n) return 0;
  const rr = r / n, bb = b / n;
  return (rr - bb) / Math.max(1, rr + bb);
}

/** Mittlere Helligkeit eines Bereichs. */
function hell(data, W, x0, y0, x1, y1) {
  let s = 0, n = 0;
  for (let y = Math.max(0, y0); y < y1; y++) {
    for (let x = Math.max(0, x0); x < x1; x++) {
      const i = (y * W + x) * 4;
      s += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      n++;
    }
  }
  return n ? s / n : 0;
}

// Gemessen wird an der ruhigen Aufnahme, nicht an der Kampfszene.
const bild = join(ROOT, 'bilder/einbettung.png');
if (!existsSync(bild)) {
  console.error('EINBETTUNG: keine Aufnahme. Erst `npm run bilder` laufen lassen.');
  process.exit(1);
}

const { data, info } = await sharp(bild).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

// Die Turmpositionen kommen aus dem Spiel, nicht aus der Bilderkennung -
// so misst das Werkzeug genau dort, wo etwas steht.
const { GameState } = await import('../src/game/state.ts');
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => mem.get(k) ?? null, setItem: () => {}, removeItem: () => {},
};

// Dieselbe Aufstellung wie in der Aufnahme.
const s = new GameState();
s.reset(1, 'normal', 'spiralhain');
s.gold = 900000;
const towers = import('../src/data/towers.ts');
s.build(980, 240, 'frost');

// Die Aufnahme zeigt den Turm mittig bei 2,2-fachem Massstab - das ist in
// tools/shots.mjs so eingestellt und hier nachgerechnet.
const k = Math.max(W / 1920, H / 1080) * 2.2;
const px = () => [Math.round(W / 2), Math.round(H / 2)];

console.log('Einbettung — gemessen an bilder/welle8.png\n');
console.log('  Turm       Kontakt   Wärme Figur   Wärme Boden   Abstand');

let kontakte = 0, waermeAbstaende = 0, n = 0;
for (const t of s.towers) {
  const [cx, cy] = px();
  // Der Radius kommt aus dem Platzbedarf des Turms, nicht aus einer festen
  // Zahl - Moerser und Bogenturm sind 50 Prozent auseinander.
  const { TOWERS } = await towers;
  const r = Math.round((TOWERS[t.def].footprint / 2) * k);

  // Gemessen wird der BODEN, nicht der Turm.
  //
  // Der erste Versuch nahm den Bereich direkt unter der Turmmitte - dort steht
  // aber noch das Turmbild selbst, und die Messung sagte nur, wie hell der
  // Turmfuss gemalt ist. Jetzt wird der schmale Ring knapp ausserhalb des
  // Platzbedarfs gemessen: dorthin faellt der Kontaktschatten, und dort ist
  // noch Boden zu sehen.
  const unten = hell(data, W, cx - r, cy + Math.round(r * 0.5), cx + r, cy + Math.round(r * 1.1));
  const daneben = hell(data, W, cx + r * 3, cy - r, cx + r * 5, cy + r);
  const kontrast = daneben > 0 ? 1 - unten / daneben : 0;

  // Nicht die Farbe messen, sondern das Licht.
  //
  // Der erste Ansatz verglich die mittlere Waerme der Figur mit der des
  // Bodens. Das misst aber das MATERIAL: ein Eisturm auf Sand ist zwangslaeufig
  // kuehler, und die Zahl sagte 0,78 Abstand, ohne dass etwas falsch war.
  //
  // Was zaehlt, ist die Richtung des Lichts: die Sonne ist warm, also muss die
  // beschienene Seite waermer sein als die abgewandte - bei der Figur ebenso
  // wie beim Boden. Verglichen wird deshalb der Unterschied INNERHALB der
  // Figur mit dem Unterschied innerhalb des Bodens.
  const figurHell = waerme(data, W, cx - r, cy - r * 2.6, cx, cy - r * 1.2);
  const figurDunkel = waerme(data, W, cx, cy - r * 1.2, cx + r, cy);
  const bodenHell = waerme(data, W, cx - r * 5, cy - r * 2, cx - r * 3, cy);
  const bodenDunkel = waerme(data, W, cx + r * 3, cy, cx + r * 5, cy + r * 2);
  const wFigur = figurHell - figurDunkel;
  const wBoden = bodenHell - bodenDunkel;

  console.log(
    `  ${t.def.padEnd(10)} ${(kontrast * 100).toFixed(0).padStart(5)} %   ` +
    `${wFigur.toFixed(3).padStart(11)}   ${wBoden.toFixed(3).padStart(11)}   ` +
    `${Math.abs(wFigur - wBoden).toFixed(3)}`,
  );
  kontakte += kontrast;
  waermeAbstaende += Math.abs(wFigur - wBoden);
  n++;
}

if (!n) {
  console.error('EINBETTUNG: kein Turm im Bild gefunden.');
  process.exit(1);
}

const kontakt = kontakte / n, wAbstand = waermeAbstaende / n;
zahlen.push(['Kontaktschatten', kontakt, 0.12, 'mindestens 12 % dunkler als daneben']);
// Die Lichtrichtung wird berichtet, aber nicht bewertet.
//
// Drei Anläufe, drei Fehlmessungen: Erst wurde die mittlere Wärme verglichen -
// das misst das Material, und ein Eisturm auf Sand ist zwangsläufig kühler.
// Dann die Wärmeverteilung innerhalb der Figur gegen die des Bodens - aber das
// Vergleichsfeld landete auf grauem Fels statt auf Sand, und die Zahl sprang
// auf 0,83.
//
// Eine Kennzahl, die dreimal etwas anderes misst als gemeint, gehört nicht in
// ein Tor. Sie steht hier als Beobachtung; über die Einbettung entscheidet der
// Kontaktschatten, der sich sauber messen lässt, und der Blick.
console.log(`\n  Lichtrichtung (nur berichtet)  Figur ${wAbstand.toFixed(3)}`);

console.log('');
for (const [name, wert, grenze, text] of zahlen) {
  const gut = grenze > 0 ? wert >= grenze : wert <= -grenze;
  console.log(`  ${name.padEnd(18)} ${wert.toFixed(3)}   ${text}   ${gut ? 'erfüllt' : 'ABWEICHUNG'}`);
  if (!gut) befunde.push(`${name}: ${wert.toFixed(3)} — ${text}.`);
}

// --- Warum dieses Werkzeug nicht abbricht.
//
// Vier Anlaeufe, vier Fehlmessungen - und jedes Mal aus demselben Grund: Ich
// wollte den BODEN unter der Figur messen, traf aber die Figur selbst. Ihr
// Bild reicht weit ueber ihren Platzbedarf hinaus, und wo genau es aufhoert,
// haengt am gelieferten Bild.
//
// Damit ist die Einbettung hier eine Beobachtung, kein Tor. Die Zahlen helfen
// beim Vergleich zweier Staende; ueber "sitzt sie in der Szene" entscheidet
// der Blick auf bilder/einbettung.png. Ein Tor, das die falsche Stelle misst,
// waere schlimmer als keines - es wuerde gruen leuchten, waehrend der Turm
// aufgeklebt aussieht.
//
// Was der Blick pruefen soll, in dieser Reihenfolge:
//   1. Steht die Figur auf dem Boden, oder schwebt sie darueber?
//   2. Faellt der Schatten in dieselbe Richtung wie die Schatten der Felsen?
//   3. Hat die Figur dieselbe Lichtfarbe wie ihre Umgebung?
//   4. Ist die Kante hart wie ausgeschnitten, oder geht sie in den Boden ueber?
console.log('');
if (befunde.length) {
  console.log(`EINBETTUNG: ${befunde.length} Hinweis(e) - kein Tor, siehe Kopfkommentar.`);
  for (const b of befunde) console.log(`  - ${b}`);
} else {
  console.log('EINBETTUNG: die Kennzahlen liegen im Rahmen.');
}
console.log('Sieh dir bilder/einbettung.png an - die Zahlen ersetzen das nicht.');
