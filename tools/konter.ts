/** Bekommt jede Gegnerart ihren Konter-Satz - und rechtzeitig? (TF-034)
 *
 *  **Was gemessen wird.** Fuer jede Karte: an welcher Welle eine Gegnerart
 *  zum ersten Mal auftaucht, ob dazu ein Satz existiert, und ob er vor dem
 *  Start dieser Welle dasteht. Gemessen an den Wellendaten und an
 *  `konterSatz`, also an beiden Enden der Ableitung.
 *
 *  **Warum es dieses Tor gibt.** Vor v152 standen die Konter in
 *  handgeschriebenen Wellensaetzen. Gemessen: von zwanzig Erstauftritten
 *  ueber drei Karten trugen zwoelf ueberhaupt einen Satz, und nur DREI
 *  nannten einen Konter. Der Spalter wurde auf zwei Karten erklaert und auf
 *  der dritten nicht. Kein Tor konnte das sehen, denn es gab nichts, was
 *  Anspruch und Wirklichkeit verglichen haette.
 *
 *  **Die Gegenrichtung** (Regel 13): ein Satz an JEDER Gegnerart waere so
 *  wertlos wie an keiner. Deshalb faellt das Tor auch, wenn alle etwas
 *  bekommen - dann misst es nicht mehr die Ausnahme, sondern die Tapete.
 *
 *  Aufruf: npx tsx tools/konter.ts [--tor]
 *
 *  Messstelle (Regel 12): die Wellenplaene aus `src/data/waves.ts` und
 *  `konterSatz` aus `src/data/konter.ts`. Kein Browser, keine Anzeige - ob
 *  die Blase wirklich erscheint, prueft der Rauchtest. */
import { ENEMIES, type EnemyId } from '../src/data/enemies';
import { konterSatz, mitKonter } from '../src/data/konter';
import { PLAN_ASCHESCHLUCHT, PLAN_FROSTSPALTE, PLAN_SPIRALHAIN, type Wave } from '../src/data/waves';

const TOR = process.argv.includes('--tor');
const KARTEN: [string, Wave[]][] = [
  ['Spiralhain', PLAN_SPIRALHAIN],
  ['Ascheschlucht', PLAN_ASCHESCHLUCHT],
  ['Frostspalte', PLAN_FROSTSPALTE],
];
/** Wieviele Zeichen ein Satz hoechstens haben darf.
 *
 *  Nicht gewaehlt, sondern gemessen: der laengste handgeschriebene
 *  Wellensatz, der je in der Vorschau stand, hatte 52 Zeichen und brauchte
 *  auf dem Telefon zwei Zeilen. Die Blase ist breiter als die Vorschau, aber
 *  nicht dreimal so breit - 190 Zeichen sind rund drei Zeilen, und drei
 *  Zeilen liest zwischen zwei Wellen noch jemand. */
const MAX_ZEICHEN = 190;

const fehler: string[] = [];
console.log('KONTER-SAETZE\n');

// --- Teil 1: die Saetze selbst.
const alle = Object.keys(ENEMIES) as EnemyId[];
const mit = mitKonter();
console.log(`  ${mit.length} von ${alle.length} Gegnerarten haben etwas zu kontern:\n`);
for (const id of alle) {
  const satz = konterSatz(id);
  if (!satz) { console.log(`    ${ENEMIES[id].name.padEnd(12)} —`); continue; }
  console.log(`    ${ENEMIES[id].name.padEnd(12)} ${satz}`);
  if (satz.length > MAX_ZEICHEN) {
    fehler.push(`${ENEMIES[id].name}: der Satz hat ${satz.length} Zeichen, erlaubt sind `
      + `${MAX_ZEICHEN}. Wer drei Zeilen schreibt, wird nicht gelesen.`);
  }
  if (!satz.startsWith(`${ENEMIES[id].name}:`)) {
    fehler.push(`${ENEMIES[id].name}: der Satz nennt den Gegner nicht beim Namen - `
      + 'dann weiss niemand, wovon er handelt.');
  }
}

// Regel 13: die Aussage muss in BEIDE Richtungen scheitern koennen.
if (mit.length === 0) {
  fehler.push('Keine einzige Gegnerart hat einen Konter-Satz - die Ableitung liefert nichts.');
} else if (mit.length === alle.length) {
  fehler.push(`Alle ${alle.length} Gegnerarten haben einen Konter-Satz. Ein Hinweis, der `
    + 'immer dasteht, hebt nichts mehr hervor - die Grenzen sind zu weich.');
}

// --- Teil 2: die Abdeckung je Karte.
console.log('\n  Erstauftritte je Karte:\n');
let auftritte = 0, gedeckt = 0;
for (const [name, plan] of KARTEN) {
  const gesehen = new Set<EnemyId>();
  const zeilen: string[] = [];
  for (let i = 0; i < plan.length; i++) {
    for (const g of plan[i].groups) {
      const id = g.enemy as EnemyId;
      if (gesehen.has(id)) continue;
      gesehen.add(id);
      auftritte++;
      const satz = konterSatz(id);
      if (satz) gedeckt++;
      zeilen.push(`      W${String(i + 1).padStart(2)} ${ENEMIES[id].name.padEnd(12)}`
        + `${satz ? 'Satz steht bereit' : '— nichts zu kontern'}`);
    }
  }
  console.log(`    ${name}`);
  for (const z of zeilen) console.log(z);
}

// --- Teil 3: kein Wellensatz darf einen Konter zum zweiten Mal erzaehlen.
//
// Regel 15. Genau daran hing der alte Zustand: dieselbe Tatsache in einer
// handgeschriebenen Zeile und in der Ableitung - eine davon veraltet.
const VERRAT = ['Panzerung', 'zerfallen beim Tod', 'erreicht sie nicht', 'bremsresistent'];
for (const [name, plan] of KARTEN) {
  for (let i = 0; i < plan.length; i++) {
    const note = plan[i].note;
    if (!note) continue;
    for (const wort of VERRAT) {
      if (note.includes(wort)) {
        fehler.push(`${name} W${i + 1}: der Wellensatz "${note}" nennt "${wort}" - das steht `
          + 'seit v152 abgeleitet in `src/data/konter.ts`. Zwei Quellen fuer dieselbe '
          + 'Tatsache, eine davon veraltet (Regel 15).');
      }
    }
  }
}

console.log(`\n  Abdeckung: ${gedeckt} von ${auftritte} Erstauftritten bekommen einen Satz.`);
console.log('  Messstelle: Wellenplaene aus src/data/waves.ts, Saetze aus '
  + 'src/data/konter.ts. Ob die Blase erscheint, prueft der Rauchtest.');

if (fehler.length) {
  console.error(`\nKONTER: ${fehler.length} Fehler`);
  for (const f of fehler) console.error(`  - ${f}`);
  if (TOR) process.exit(1);
} else {
  console.log('\nKONTER: jede Gegnerart, an der etwas zu kontern ist, sagt es.');
}
