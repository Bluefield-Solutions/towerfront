/** Das Auftragsdokument lesen - eine Fassung fuer alle, die es lesen.
 *
 *  Zwei Werkzeuge holen sich Prompts aus `docs/Towerfront-BILDAUFTRAG.md`:
 *  `bildprompt.ts` gibt einen einzelnen aus, `bildwissen.ts` baut die
 *  Wissensdatei fuer einen fremden Bild-Agenten. Beide brauchen dieselben
 *  drei Handgriffe - den Stil-Block finden, die Prompt-Abschnitte finden,
 *  den Platzhalter ersetzen.
 *
 *  Zwei Fassungen davon waeren eine zu viel (Regel 15): dieselbe Frage
 *  zweimal beantwortet, und beim naechsten Umbau des Dokuments faellt eine
 *  davon still aus. Deshalb steht sie hier einmal.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DOK = join(ROOT, 'docs/Towerfront-BILDAUFTRAG.md');
export const PLATZHALTER = '[STYLE-BLOCK EINFÜGEN]';

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

/** Der globale Stil-Block: der erste Block unter Abschnitt 1. */
export function stilBlock(): string {
  const zeile = zeilen.findIndex((z) => z.startsWith('## 1. Der globale Stil-Prompt'));
  if (zeile < 0) {
    console.error('AUFTRAG: der Abschnitt "1. Der globale Stil-Prompt" fehlt im Auftragsdokument.');
    process.exit(1);
  }
  const b = blockNach(zeile + 1);
  if (!b) {
    console.error('AUFTRAG: unter "1. Der globale Stil-Prompt" steht kein Block.');
    process.exit(1);
  }
  return b.inhalt;
}

export interface Abschnitt { titel: string; zeile: number; prompt: string }

/** Alle Abschnitte mit einem Prompt, in der Reihenfolge des Dokuments. */
export function promptAbschnitte(): Abschnitt[] {
  const aus: Abschnitt[] = [];
  for (let i = 0; i < zeilen.length; i++) {
    if (!/^### /.test(zeilen[i])) continue;
    const b = blockNach(i + 1);
    if (!b || !b.inhalt.includes(PLATZHALTER)) continue;
    aus.push({ titel: zeilen[i].replace(/^###\s*/, ''), zeile: i + 1, prompt: b.inhalt });
  }
  return aus;
}

/** Den Stil-Block einsetzen - und pruefen, dass er wirklich drin ist. */
export function einsetzen(prompt: string, stil: string): string {
  const fertig = prompt.split(PLATZHALTER).join(stil);
  if (fertig.includes(PLATZHALTER)) {
    console.error('AUFTRAG: der Platzhalter steht noch im Ergebnis - '
      + 'der Stil-Block wurde nicht eingesetzt.');
    process.exit(1);
  }
  return fertig;
}

/** Der Text zwischen zwei Ueberschriften, wortwoertlich.
 *
 *  Fuer die Wissensdatei: die Regelabschnitte werden UEBERNOMMEN, nicht
 *  nacherzaehlt. Wer sie nacherzaehlt, hat beim naechsten Mal zwei
 *  Fassungen - und die Nacherzaehlung ist die, die keiner pflegt. */
export function abschnittstext(beginnt: string): string {
  const von = zeilen.findIndex((z) => z.startsWith(beginnt));
  if (von < 0) {
    console.error(`AUFTRAG: der Abschnitt "${beginnt}" fehlt im Auftragsdokument.`);
    process.exit(1);
  }
  const ebene = (beginnt.match(/^#+/) ?? ['##'])[0].length;
  let bis = von + 1;
  while (bis < zeilen.length) {
    const m = zeilen[bis].match(/^(#+) /);
    if (m && m[1].length <= ebene) break;
    bis++;
  }
  return zeilen.slice(von, bis).join('\n').trimEnd();
}
