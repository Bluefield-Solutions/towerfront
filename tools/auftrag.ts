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
export const AUSGABE_PLATZHALTER = '[AUSGABE-BLOCK EINFÜGEN]';

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

/** Der Ausgabe-Block fuer Kartenbilder: der erste Block unter Abschnitt 1b.
 *
 *  Warum eigens und nicht im Stil-Block: der Stil-Block gilt fuer alle Bilder,
 *  auch fuer Figuren und Tuerme - und die haben andere Masse. Der Ausgabe-Block
 *  gilt nur fuer Karten. Zwei Fassungen davon in den drei Kartenauftraegen
 *  waeren dreimal derselbe Text, von dem zwei veralten (Regel 15). */
export function ausgabeBlock(): string {
  const zeile = zeilen.findIndex((z) => z.startsWith('## 1b. Der Ausgabe-Block'));
  if (zeile < 0) {
    console.error('AUFTRAG: der Abschnitt "1b. Der Ausgabe-Block" fehlt im Auftragsdokument.');
    process.exit(1);
  }
  const b = blockNach(zeile + 1);
  if (!b) {
    console.error('AUFTRAG: unter "1b. Der Ausgabe-Block" steht kein Block.');
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

/** Beide Bloecke einsetzen - und pruefen, dass keiner stehen bleibt.
 *
 *  Der Ausgabe-Block ist wahlfrei: nur die Kartenauftraege tragen seinen
 *  Platzhalter. Wer ihn nicht braucht, merkt nichts davon - wer ihn hat und
 *  ihn nicht ersetzt bekaeme, faellt hier durch. */
export function einsetzen(prompt: string, stil: string, ausgabe?: string): string {
  let fertig = prompt.split(PLATZHALTER).join(stil);
  if (fertig.includes(AUSGABE_PLATZHALTER)) {
    fertig = fertig.split(AUSGABE_PLATZHALTER).join(ausgabe ?? ausgabeBlock());
  }
  if (fertig.includes(PLATZHALTER) || fertig.includes(AUSGABE_PLATZHALTER)) {
    console.error('AUFTRAG: ein Platzhalter steht noch im Ergebnis - '
      + 'ein Block wurde nicht eingesetzt.');
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

/** Die Abnahmegrenzen fuer Kartenbilder - aus dem Auftragsdokument gelesen.
 *
 *  Sie stehen in Abschnitt 8b als Tabelle, weil sie dort hingehoeren: wer
 *  das Bild bestellt, sieht sie. `tools/kartenprobe.ts` misst dagegen. Wenn
 *  die Zahl an beiden Stellen staende, wuerde eine davon veralten - und die
 *  veraltete waere die, nach der abgenommen wird (Regel 15).
 *
 *  Steigt eine Grenze im Dokument, misst das Werkzeug ab dem naechsten Lauf
 *  danach. Verschwindet die Zeile, bricht es ab, statt eine Zahl zu raten. */
export function abnahmegrenzen(): {
  mitte: number; schlauch: number; rand: number; nutzung: number; wegfrei: number;
} {
  const hol = (nadel: RegExp, was: string): number => {
    const zeile = zeilen.find((z) => nadel.test(z));
    if (!zeile) {
      console.error(`AUFTRAG: die Abnahmezeile fuer "${was}" fehlt in Abschnitt 8b. `
        + 'Ohne sie prueft die Kartenprobe nichts.');
      process.exit(1);
    }
    // Die letzte Spalte traegt die Forderung, etwa "**≥ 90 %**".
    const m = zeile.split('|').slice(-2)[0].match(/(\d+(?:,\d+)?)\s*%/);
    if (!m) {
      console.error(`AUFTRAG: in der Zeile fuer "${was}" steht keine Prozentzahl: ${zeile}`);
      process.exit(1);
    }
    return Number(m[1].replace(',', '.')) / 100;
  };
  // Die Wegfreiheit steht in Farbschritten da, nicht in Prozent - eigene
  // Rechnung, damit `hol` nicht zwei Einheiten kennen muss.
  const wegfreiZeile = zeilen.find((z) => /kartenprobe`? Wegfreiheit \|/.test(z));
  if (!wegfreiZeile) {
    console.error('AUFTRAG: die Abnahmezeile fuer "Wegfreiheit" fehlt in Abschnitt 8c. '
      + 'Ohne sie prueft die Kartenprobe nichts.');
    process.exit(1);
  }
  const wf = wegfreiZeile.split('|').slice(-2)[0].match(/(\d+(?:,\d+)?)\s*Farbschritte/);
  if (!wf) {
    console.error(`AUFTRAG: in der Zeile fuer "Wegfreiheit" steht keine Zahl: ${wegfreiZeile}`);
    process.exit(1);
  }
  return {
    mitte: hol(/bahntreue`? Mitte \|/, 'Mitte'),
    schlauch: hol(/bahntreue`? Schlauch \|/, 'Schlauch'),
    rand: hol(/bahntreue`? Rand \|/, 'Rand'),
    nutzung: hol(/wegdeckung`? benutzte Stra/, 'Nutzung'),
    wegfrei: Number(wf[1].replace(',', '.')),
  };
}
