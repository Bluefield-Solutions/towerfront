/**
 * Was eine Bahn taugt, BEVOR die Simulation eine Stunde rechnet.
 *
 * **Wozu.** In v217 haben drei Bahnentwuerfe je einen `npm run sim` gekostet
 * (rund eine Minute) und zwei davon sind durchgefallen - der eine an der
 * Streuung zwischen den Bauverlaeufen, der andere an der Spielbarkeit. Die
 * Ursache stand in keiner der beiden Meldungen. Sie stand in einer Zahl, die
 * es damals noch nicht gab:
 *
 *     wieviel der Bahn die zwoelf besten Bauplaetze ZUSAMMEN sehen.
 *
 *     alte Bahn      76 %   bestanden
 *     Haarnadel      61 %   Streuung 28-38 (verboten ab 32)
 *     breiter Bogen  53 %   in Welle 14 verloren
 *     Serpentine     85 %   bestanden, drei Sterne
 *
 * Nicht die Laenge entscheidet, sondern ob die Boegen nah genug beieinander
 * liegen, dass ein Turm zwei von ihnen sieht.
 *
 * **Und genau das ist die zweite Zahl: die WEGVIELFACHHEIT.** Ein Turm sieht
 * von einem geraden Stueck hoechstens zwei Reichweiten Bahn - er steht in der
 * Mitte, und links wie rechts reicht er `r` weit. Sieht er MEHR als das,
 * laeuft die Bahn mehrfach durch seinen Kreis: er trifft ueber zwei Wege
 * hinweg. Die Zahl ist also
 *
 *     gedeckte Bahnlaenge / (2 x Reichweite)
 *
 * und sagt unmittelbar, wieviele Durchgaenge ein Platz sieht. 1,0 ist ein
 * gerades Stueck, 2,0 sind zwei Wege.
 *
 * **Die erste Fassung zaehlte stattdessen getrennte Abschnitte, und das war
 * falsch herum.** Auf dem kurzen Spiralhain meldete sie fuer den voll
 * ausgebauten Moerser "0 von 12 Plaetzen sehen zwei Abschnitte" - weil seine
 * Reichweite von 794 die ganze Bahn auf einmal umschliesst und daraus EIN
 * Stueck macht. Die beste Lage der Welt sah aus wie die schlechteste.
 *
 * Fuer den ausgebauten Turm steht deshalb daneben, welchen ANTEIL der ganzen
 * Bahn er von seinem Platz aus sieht - bei einer kurzen Bahn ist das die
 * Frage, die uebrig bleibt.
 *
 * Aufruf: npm run bahnentwurf [kartenkennung]
 *
 * Messstelle (Regel 12): Bauplaetze im Raster von 36 Weltpunkten wie
 * `tools/spots.ts`, Bahn alle 10 Weltpunkte abgetastet, Reichweiten aus
 * `rangeFor` - also dieselben, die das Spiel rechnet.
 */
import { GameState } from '../src/game/state';
import { MAPS, lanePaths } from '../src/data/maps';
import { rangeFor } from '../src/data/towers';
import { candidateSpots } from './spots';

/** Die Reichweite, mit der `tools/spots.ts` bewertet - der frische Turm. */
const FRISCH = 252;
/** Und ein voll ausgebauter Moerser im Weiten-Zweig: die groesste Reichweite,
 *  die das Spiel hergibt. Wer Doppelsicht fuer den Ausbau will, meint diese. */
const AUSGEBAUT = rangeFor('mortar', 0, 6);

const nur = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/** Wieviel Bahn liegt von diesem Platz aus in Reichweite? */
function gedeckt(bahnen: ReturnType<typeof lanePaths>, x: number, y: number,
  reich: number): number {
  let summe = 0;
  for (const p of bahnen) {
    for (let t = 0; t < p.length; t += 10) {
      const q = p.at(t);
      if (Math.hypot(q.x - x, q.y - y) <= reich) summe += 10;
    }
  }
  return summe;
}

console.log('BAHNENTWURF\n');
console.log(`  Reichweiten: frisch ${FRISCH}, voll ausgebaut ${AUSGEBAUT} `
  + '(Moerser, Weiten-Zweig, Stufe 6)\n');

for (const m of MAPS) {
  if (nur.length && !nur.includes(m.id)) continue;
  const s = new GameState();
  s.reset(1, 'normal', m.id);
  const bahnen = lanePaths(m);
  const laenge = bahnen.reduce((a, p) => a + p.length, 0);

  const beste = candidateSpots(s).slice(0, 12);
  const vereint = new Set<string>();
  let vielfach = 0, anteilAus = 0, bestesVielfach = 0;
  for (const sp of beste) {
    const f = gedeckt(bahnen, sp.x, sp.y, FRISCH);
    const a = gedeckt(bahnen, sp.x, sp.y, AUSGEBAUT);
    const v = f / (2 * FRISCH);
    vielfach += v;
    if (v > bestesVielfach) bestesVielfach = v;
    anteilAus += a / laenge;
    for (const [bi, p] of bahnen.entries())
      for (let t = 0; t < p.length; t += 10) {
        const q = p.at(t);
        if (Math.hypot(q.x - sp.x, q.y - sp.y) <= FRISCH) vereint.add(`${bi}:${Math.round(t / 10)}`);
      }
  }
  vielfach /= beste.length;
  anteilAus /= beste.length;
  const union = vereint.size * 10;

  // **Und was das ganze Feld hergibt, nicht nur die zwoelf besten.**
  //
  // Die zwoelf sind die Wahl des Bots, und der baut in der Reihenfolge der
  // Bewertung - er sitzt damit vor allem an den Boegen. Die Frage "gibt es
  // ueberhaupt Stellen, an denen ein Turm zwei Wege trifft" beantwortet er
  // nicht. Sie wird hier ueber ALLE baubaren Punkte gestellt.
  const alle = candidateSpots(s);
  let zwei = 0, drei = 0, bestesFeld = 0;
  const bestePunkte: { x: number; y: number; v: number }[] = [];
  for (const sp of alle) {
    const v = gedeckt(bahnen, sp.x, sp.y, FRISCH) / (2 * FRISCH);
    if (v >= 1.6) zwei++;
    if (v >= 2.4) drei++;
    if (v > bestesFeld) bestesFeld = v;
    bestePunkte.push({ x: sp.x, y: sp.y, v });
  }
  bestePunkte.sort((a, b) => b.v - a.v);

  // Umweg und Richtungswechsel wie im Daten-Waechter.
  const zeilen = bahnen.map((p, i) => {
    const a = p.at(0), b = p.at(p.length);
    return `    Bahn ${i}: ${p.length.toFixed(0)} Weltpunkte, `
      + `Umweg ${(p.length / Math.hypot(b.x - a.x, b.y - a.y)).toFixed(2)}`;
  });

  console.log(`── ${m.name}`);
  for (const z of zeilen) console.log(z);
  console.log(`    Laenge zusammen ${laenge.toFixed(0)} Weltpunkte`);
  console.log(`    Die zwoelf besten Plaetze sehen zusammen ${union} Weltpunkte `
    + `= ${(union / laenge * 100).toFixed(0)} % der Bahn`);
  console.log(`    Wegvielfachheit frisch: im Mittel ${vielfach.toFixed(2)} Durchgaenge `
    + `je Platz, bester Platz ${bestesVielfach.toFixed(2)}`);
  console.log(`    Voll ausgebaut sieht ein Platz im Mittel `
    + `${(anteilAus * 100).toFixed(0)} % der ganzen Bahn`);
  console.log(`    Ueber ALLE ${alle.length} baubaren Punkte: ${zwei} sehen zwei Wege `
    + `(>= 1,6 Durchgaenge), ${drei} sehen drei (>= 2,4), bester ${bestesFeld.toFixed(2)}`);
  console.log('    Die fuenf staerksten Doppelstellen: '
    + bestePunkte.slice(0, 5).map((q) => `${q.x}:${q.y} (${q.v.toFixed(2)})`).join(', ') + '\n');
}

console.log('  Erfahrungswerte aus v217: unter 70 % Deckung wird die Karte unspielbar');
console.log('  oder die Streuung zwischen den Bauverlaeufen reisst die Grenze.');
