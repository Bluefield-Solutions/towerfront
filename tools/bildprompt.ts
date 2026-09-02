/** Einen Bild-Prompt VOLLSTAENDIG ausgeben - Stil-Block schon eingesetzt.
 *
 *  **Warum es dieses Werkzeug gibt.** Das Auftragsdokument haelt den
 *  globalen Stil-Block einmal und schreibt in jeden Bild-Prompt
 *  `[STYLE-BLOCK EINFÜGEN]`. Das ist im Dokument richtig - siebzehn Kopien
 *  waeren siebzehn Fassungen, die auseinanderdriften (Regel 15). Fuer den
 *  Empfaenger ist es falsch: er bekommt ein Bruchstueck und muss sich den
 *  Rest zusammensuchen. Genau das hat der Nutzer beanstandet, und es ist
 *  keine Kleinigkeit - wer zusammensucht, vergisst.
 *
 *  Also beides: EINE Fassung im Dokument, VOLLSTAENDIG beim Ausgeben.
 *
 *  Aufruf:
 *    npm run bildprompt              alle Namen auflisten
 *    npm run bildprompt -- frost     den Prompt fuer den Frostturm
 *
 *  Der Name ist ein Suchtext auf der Ueberschrift; mehrdeutig ist ein
 *  Fehler, nicht der erste Treffer (dieselbe Lehre wie beim Musterlauf).
 *
 *  Das Lesen des Dokuments steht in `tools/auftrag.ts` - `bildwissen.ts`
 *  braucht dieselben Handgriffe, und zwei Fassungen davon waeren eine zu
 *  viel. */
import { DOK, ROOT, stilBlock, promptAbschnitte, einsetzen } from './auftrag';

const stil = stilBlock();
const abschnitte = promptAbschnitte();

const suche = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ').toLowerCase();

if (!suche) {
  console.log(`BILDPROMPT — ${abschnitte.length} Prompts in ${DOK.replace(ROOT + '/', '')}\n`);
  for (const a of abschnitte) console.log(`  ${a.titel}`);
  console.log('\n  Aufruf: npm run bildprompt -- <suchtext>, z. B. "frost" oder "waffe"');
  process.exit(0);
}

const treffer = abschnitte.filter((a) => a.titel.toLowerCase().includes(suche));
if (!treffer.length) {
  console.error(`BILDPROMPT: kein Prompt passt auf "${suche}". `
    + 'Ohne Suchtext aufrufen zeigt alle.');
  process.exit(1);
}
if (treffer.length > 1) {
  // Mehrdeutig ist ein Fehler. Den ersten zu nehmen ist der Weg, auf dem
  // in v155 eine Gegenprobe sich selbst umgeschrieben hat.
  console.error(`BILDPROMPT: "${suche}" passt auf ${treffer.length} Prompts:`);
  for (const t of treffer) console.error(`  - ${t.titel}`);
  process.exit(1);
}

console.log(einsetzen(treffer[0].prompt, stil));
