/** Passt, wer auf der Strasse laeuft, auf die Strasse? (TF-030)
 *
 *  **Warum es dieses Werkzeug gibt.** Der Datenwaechter verglich bis v147 die
 *  KACHEL eines Gegners mit der Wegbreite. Eine Kachel ist aber kein Koerper:
 *  der Leerentitan bekommt 102 Weltpunkte zugeteilt und fuellt davon 59 % -
 *  gezeichnet ist er 60 breit. Auf der schmalsten Strasse (80) hat er damit
 *  zehn Punkte Luft je Seite, waehrend der Waechter "127 % der engsten
 *  Wegstelle" meldete. Aus dieser Meldung wurde im Audit der Befund TF-030
 *  ("Er ragt ueber den Rand") - ein Problem, das es nie gab.
 *
 *  Es ist die dritte Fassung derselben Falle: erst der Trefferradius statt
 *  der Zeichengroesse (C4), dann die Quellbreite statt der Anzeigegroesse
 *  (S84), jetzt die Kachel statt der Figur. Regel 12 in Reinform - jede Zahl
 *  traegt ihre Messstelle mit.
 *
 *  Gemessen wird deshalb am gepackten Bild: die undurchsichtige Ausdehnung
 *  der Figur, umgerechnet in Weltpunkte, gegen die engste Stelle jeder Bahn.
 *
 *  Aufruf: npx tsx tools/gedraenge.ts [--tor]
 *
 *  Messstelle (Regel 12): gepackter Bildvorrat, Deckkraft ueber 60 von 255;
 *  Wegbreiten aus `lanePaths`, in Weltpunkten, ueber die ganze Bahn. */
import { ENEMIES, type EnemyId } from '../src/data/enemies';
import { enemyArtWidth } from '../src/gfx/enemyart';
import { figurbreite } from './figurbreite';
import { MAPS, lanePaths } from '../src/data/maps';

const TOR = process.argv.includes('--tor');
let fehler = 0;
const fail = (m: string): void => { console.error(`  FEHLER: ${m}`); fehler++; };
const warn = (m: string): void => { console.log(`  Hinweis: ${m}`); };

console.log('GEDRAENGE\n');

const figuren = new Map<EnemyId, { voll: number; rumpf: number }>();
for (const id of Object.keys(ENEMIES) as EnemyId[]) {
  const f = await figurbreite(id);
  if (!f) { fail(`${id}: kein Bild im Vorrat - dann misst diese Pruefung nichts.`); continue; }
  figuren.set(id, f);
  const kachel = enemyArtWidth(id);
  console.log(`  ${ENEMIES[id].name.padEnd(14)} Kachel ${kachel.toFixed(0).padStart(4)}   `
    + `Figur ${f.voll.toFixed(0).padStart(4)} (${((f.voll / kachel) * 100).toFixed(0)} % der Kachel)   `
    + `Rumpf ${f.rumpf.toFixed(0)}`);
}

console.log('');
for (const m of MAPS) {
  const eng = Math.min(...lanePaths(m).map((p) => p.widthRange().min)) * 2;
  let breitester: EnemyId | null = null, breit = 0;
  for (const [id, f] of figuren) if (f.voll > breit) { breit = f.voll; breitester = id; }
  const anteil = breit / eng;
  console.log(`  ${m.name.padEnd(16)} engste Strasse ${eng.toFixed(0)}   `
    + `breiteste Figur ${breit.toFixed(0)} (${ENEMIES[breitester as EnemyId].name}) = `
    + `${(anteil * 100).toFixed(0)} %`);
  if (anteil > 1) {
    fail(`${m.name}: ${ENEMIES[breitester as EnemyId].name} ist mit ${breit.toFixed(0)} `
      + `Weltpunkten breiter als die Strasse (${eng.toFixed(0)}) - er ragt ueber den Rand.`);
  } else if (anteil > 0.9) {
    warn(`${m.name}: ${ENEMIES[breitester as EnemyId].name} fuellt die engste Stelle zu `
      + `${(anteil * 100).toFixed(0)} % - viel bleibt nicht.`);
  }
  // Und zwei kleine Gegner nebeneinander: sonst gibt es keine Kolonne,
  // sondern eine Reihe. Gerechnet mit den zwei SCHMALSTEN Figuren.
  const sortiert = [...figuren.values()].map((f) => f.voll).sort((a, b) => a - b);
  const zwei = sortiert[0] + sortiert[1];
  if (zwei > eng) {
    warn(`${m.name}: die zwei schmalsten Gegner passen mit ${zwei.toFixed(0)} Weltpunkten `
      + `nicht nebeneinander auf ${eng.toFixed(0)}.`);
  }
}

console.log('\n  Messstelle: gepackter Bildvorrat, Deckkraft ueber 60/255; Wegbreiten aus '
  + 'lanePaths, ganze Bahn, in Weltpunkten.');

if (fehler) { console.error(`\nGEDRAENGE: ${fehler} Fehler.`); if (TOR) process.exit(1); }
else console.log('\nGEDRAENGE: jeder Gegner passt auf die Strasse.');
