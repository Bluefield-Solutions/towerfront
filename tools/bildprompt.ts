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
 *  Fehler, nicht der erste Treffer (dieselbe Lehre wie beim Musterlauf). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOK = join(ROOT, 'docs/Towerfront-BILDAUFTRAG.md');
const PLATZHALTER = '[STYLE-BLOCK EINFÜGEN]';

const text = readFileSync(DOK, 'utf8');
const zeilen = text.split('\n');

/** Der erste eingezaeunte Block nach einer Zeile. */
function blockNach(ab: number): { inhalt: string; ende: number } | null {
  let i = ab;
  while (i < zeilen.length && zeilen[i].trim() !== '```') {
    // Nicht ueber die naechste Ueberschrift derselben Ebene hinaus suchen.
    if (i > ab && /^#{2,3} /.test(zeilen[i])) return null;
    i++;
  }
  if (i >= zeilen.length) return null;
  const start = i + 1;
  let j = start;
  while (j < zeilen.length && zeilen[j].trim() !== '```') j++;
  return { inhalt: zeilen.slice(start, j).join('\n'), ende: j };
}

// Der Stil-Block: der erste Block unter "## 1. Der globale Stil-Prompt".
const stilZeile = zeilen.findIndex((z) => z.startsWith('## 1. Der globale Stil-Prompt'));
if (stilZeile < 0) {
  console.error('BILDPROMPT: der Abschnitt "1. Der globale Stil-Prompt" fehlt im Auftragsdokument.');
  process.exit(1);
}
const stil = blockNach(stilZeile + 1);
if (!stil) {
  console.error('BILDPROMPT: unter "1. Der globale Stil-Prompt" steht kein Block.');
  process.exit(1);
}

// Alle Abschnitte, die einen Prompt enthalten.
const abschnitte: { titel: string; zeile: number; prompt: string }[] = [];
for (let i = 0; i < zeilen.length; i++) {
  if (!/^### /.test(zeilen[i])) continue;
  const b = blockNach(i + 1);
  if (!b || !b.inhalt.includes(PLATZHALTER)) continue;
  abschnitte.push({ titel: zeilen[i].replace(/^###\s*/, ''), zeile: i + 1, prompt: b.inhalt });
}

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

const fertig = treffer[0].prompt.split(PLATZHALTER).join(stil.inhalt);
if (fertig.includes(PLATZHALTER)) {
  console.error('BILDPROMPT: der Platzhalter steht noch im Ergebnis - der Stil-Block wurde nicht eingesetzt.');
  process.exit(1);
}
console.log(fertig);
