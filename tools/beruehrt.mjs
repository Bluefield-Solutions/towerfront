/** **Welche Tore haengen an dem, was ich gerade geaendert habe?**
 *
 *  Entstanden in v288, und die Runde davor hat den Grund geliefert: v286 hat
 *  `index.html` angefasst, ich habe `uxaudittor`, `browsertor`, `streifen`,
 *  `smoke` und `beruehrung` gefahren - und `autarkie` nicht. Genau das wurde
 *  auf dem Runner rot, an einem Umlaut in einem HTML-Kommentar, der
 *  mitausgeliefert wird.
 *
 *  Die volle Torkette hier zu fahren kostet gemessen 426 Sekunden und ist
 *  seit v269 abgeschafft; sie laeuft auf dem Runner. Was fehlt, ist die
 *  Auskunft dazwischen: welche der dreiunddreissig Pruefungen sich fuer
 *  DIESE Aenderung ueberhaupt interessieren.
 *
 *  Die Zuordnung wird nicht gepflegt, sondern GELESEN - aus den 349
 *  Gegenproben, die ohnehin `datei` und `tor` tragen (Regel 15: eine zweite,
 *  von Hand gefuehrte Liste veraltete an dem Tag, an dem sie gebraucht wird).
 *  Dazu ein kleiner fester Anhang fuer die Tore, an denen keine Probe
 *  haengt, weil sie am ausgelieferten Buendel messen statt an einer Quelle.
 *
 *  Aufruf:  npm run beruehrt          gegen den letzten Commit
 *           npm run beruehrt -- HEAD~3
 */
import { execSync } from 'node:child_process';
import { PROBEN } from './probes.mjs';

const seit = process.argv[2] ?? 'HEAD';

/** **Die Tore, die am GEBAUTEN Ergebnis messen statt an einer Quelldatei.**
 *
 *  Sie tragen keine Gegenprobe mit `datei`, weil ihr Gegenstand nicht in
 *  einer Datei steht, sondern in `dist/index.html`. Wer irgendetwas anfasst,
 *  was in das Buendel geht, hat sie alle beruehrt.
 *
 *  **Eine Regel statt einer Aufzaehlung, und zwar fuer ALLE vier** (v294).
 *  v292 hat sie fuer `autarkietor` eingefuehrt und die uebrigen drei in einer
 *  Liste aus zwei Dateinamen stehen lassen - Regel 15 in Reinform, und sie
 *  hat prompt eine Runde gekostet: v293 aenderte `src/data/towers.ts`
 *  (sechster Bauknopf), dieses Werkzeug nannte `autarkietor` und schwieg zu
 *  `uxaudittor`, und der Runner wurde an der Bildschirmbelegung rot.
 *
 *  Der Zuschnitt ist absichtlich weit: was unter `src/` liegt oder
 *  `index.html` heisst, geht ins Buendel. Zu weit kostet einen ueberzaehligen
 *  Torlauf, zu eng einen roten Runner - dieselbe Abwaegung wie beim
 *  Inspektor in v275. */
const BUENDELTORE = ['autarkietor', 'browsertor', 'uxaudittor', 'streifentor'];
const insBuendel = (d) => d === 'index.html' || d.startsWith('src/');

const geaendert = execSync(`git diff --name-only ${seit}`, { encoding: 'utf-8' })
  .split('\n').map((z) => z.trim()).filter(Boolean);
const ungesichert = execSync('git status --porcelain', { encoding: 'utf-8' })
  .split('\n').map((z) => z.slice(3).trim()).filter(Boolean);
const alle = [...new Set([...geaendert, ...ungesichert])];

if (!alle.length) {
  console.log(`BERUEHRT: seit ${seit} ist keine Datei geaendert.`);
  process.exit(0);
}

console.log(`Geaendert seit ${seit}:`);
for (const d of alle) console.log(`  ${d}`);

/** Tor -> welche Dateien es hierher gebracht haben. */
const tore = new Map();
const merken = (tor, wegen) => {
  if (!tore.has(tor)) tore.set(tor, new Set());
  tore.get(tor).add(wegen);
};

for (const d of alle) {
  for (const p of PROBEN) {
    if (p.datei === d || (p.haengtAn ?? []).includes(d)) merken(p.tor, d);
  }
  if (insBuendel(d)) for (const t of BUENDELTORE) merken(t, d);
}

if (!tore.size) {
  console.log('\nBERUEHRT: keine Probe und kein Buendeltor haengt an diesen Dateien.');
  console.log('  Das heisst NICHT, dass nichts zu pruefen ist - es heisst, dass es');
  console.log('  hier keine Zuordnung gibt. Wer ein Tor anfasst, faehrt seine Proben');
  console.log('  gezielt (npm run proben <name>).');
  process.exit(0);
}

const sortiert = [...tore.entries()].sort((a, b) => b[1].size - a[1].size);
console.log(`\nDiese ${sortiert.length} Tore haengen daran:`);
for (const [tor, wegen] of sortiert) {
  console.log(`  ${tor.padEnd(18)} wegen ${[...wegen].join(', ')}`);
}
console.log(`\n  npm run ${sortiert.map(([t]) => t).join(' && npm run ')}`);
console.log('\n  (nennt, es faehrt nicht - die Reihenfolge und was davon sich lohnt,');
console.log('   entscheidet die Runde. Vollstaendig ist es nicht: eine Probe sagt,');
console.log('   wo sie EINGREIFT, nicht alles, woran ihr Fall haengt.)');
