/** **Die eine Stelle, an der eine Schliessbedingung ausgewertet wird.**
 *
 *  Seit v224 traegt jede offene Zeile des Rueckstandsverzeichnisses eine
 *  Bedingung, und `npm run doku` faehrt sie. Seit v249 traegt jede der 42
 *  Stories eine, und `npm run naechste` faehrt sie ebenfalls - um zu sagen,
 *  welche als naechste dran ist.
 *
 *  Zwei Fassungen davon waeren eine zu viel (Regel 15), und diesmal waere es
 *  besonders teuer: die eine sagt, ob ein Punkt zugefallen ist, die andere,
 *  woran gearbeitet wird. Gehen sie auseinander, arbeitet die Kette an etwas,
 *  das der Waechter fuer erledigt haelt - und niemand sieht es, weil beide
 *  fuer sich gruen sind.
 *
 *  **Fuenf Formen, und mehr gibt es nicht.** Drei mechanische und zwei, die
 *  die Sache ehrlich ausschliessen:
 *
 *    text <datei> "<wort>" >= n   das Wort steht mindestens n mal darin
 *    text <datei> "<wort>" == n   genau n mal (fuer "ist wieder weg")
 *    liste <datei> <NAME> >= n    das Array NAME hat mindestens n Eintraege
 *    blick: <grund>               nur das Auge kann es sehen (Regel 8)
 *    nutzer: <grund>              nur auf einem echten Geraet zu messen
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Quelltext einer Datei, oder null. Als Funktion uebergeben, damit die
 *  gestellten Texte der Nullprobe durch dieselbe Auswertung laufen wie die
 *  echten Dateien. */
export const ausDatei = (pfad) => {
  try { return readFileSync(join(ROOT, pfad), 'utf8'); } catch { return null; }
};

/** Wieviele Eintraege hat das Array, das <NAME> zugewiesen bekommt? */
export const listenLaenge = (inhalt, name) => {
  const m = inhalt.match(new RegExp(`${name}[^=\\n]*=\\s*\\[([^\\]]*)\\]`));
  if (!m) return null;
  return m[1].split(',').map((s) => s.trim()).filter(Boolean).length;
};

/** Eine Bedingung auswerten. Rueckgabe: { erfuellt } oder { fehler }. */
export const werte = (bed, quelle = ausDatei) => {
  let m;
  if ((m = bed.match(/^text (\S+) "([^"]+)" (>=|==) (\d+)$/))) {
    const [, pfad, wort, op, n] = m;
    const inhalt = quelle(pfad);
    if (inhalt === null) return { fehler: `die Datei ${pfad} gibt es nicht` };
    const anzahl = inhalt.split(wort).length - 1;
    return { erfuellt: op === '>=' ? anzahl >= Number(n) : anzahl === Number(n) };
  }
  if ((m = bed.match(/^liste (\S+) ([A-Za-z_][A-Za-z0-9_]*) >= (\d+)$/))) {
    const [, pfad, name, n] = m;
    const inhalt = quelle(pfad);
    if (inhalt === null) return { fehler: `die Datei ${pfad} gibt es nicht` };
    const laenge = listenLaenge(inhalt, name);
    if (laenge === null) return { fehler: `die Liste ${name} steht nicht in ${pfad}` };
    return { erfuellt: laenge >= Number(n) };
  }
  return { fehler: `die Form "${bed}" kennt der Waechter nicht` };
};

/** Die zwei gestellten Texte zu einer Bedingung: einer, der sie erfuellen
 *  muss, und einer, der sie brechen muss. `null`, wenn die Form keine
 *  mechanische ist. */
export const gestellt = (bed) => {
  let m;
  if ((m = bed.match(/^text \S+ "([^"]+)" (>=|==) (\d+)$/))) {
    const [, wort, op, n] = m;
    // Der Trenner darf das Wort nicht selbst enthalten, sonst zaehlt die
    // Auswertung mehr Treffer als gesetzt wurden.
    return op === '>='
      ? { ja: Array(Number(n)).fill(wort).join('\n'), nein: '' }
      : { ja: '', nein: wort };
  }
  if ((m = bed.match(/^liste \S+ ([A-Za-z_][A-Za-z0-9_]*) >= (\d+)$/))) {
    const [, name, n] = m;
    const bau = (k) => `export const ${name} = [${Array(k).fill("'x'").join(', ')}];`;
    return { ja: bau(Number(n)), nein: bau(0) };
  }
  return null;
};
