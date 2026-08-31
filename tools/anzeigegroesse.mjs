/**
 * Wie gross wird diese Figur wirklich gezeichnet?
 *
 * **Warum das eine eigene Datei ist.** Die Detaildichte haengt an der
 * Messstelle, und zwar stark: Verkleinern ERHOEHT sie, weil dasselbe Detail
 * auf weniger Punkte gedraengt wird. Derselbe Bogenturm misst an der 256er
 * Quelle 8,46 und in Anzeigegroesse 13,55.
 *
 * Genau daran sind bis v204 zwei Werkzeuge auseinandergelaufen: das
 * Grafik-Audit misst seit v106 in ANZEIGEGROESSE, die Kandidatenpruefung
 * `probebild` an einer festen 300er Kante. Gemessen an denselben acht
 * Gegnern liegen die beiden Zahlen um den Faktor **2,0 bis 3,2**
 * auseinander - und zwar je Figur verschieden, weil jede Figur anders weit
 * verkleinert wird. Eine Lieferung konnte damit die Abnahme bestehen und
 * hinterher im Tor durchfallen, ohne dass jemand versteht, warum.
 *
 * Deshalb steht die Umrechnung jetzt EINMAL da (Regel 15), und beide
 * Werkzeuge holen sie hier ab.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Der Massstab: die Leinwand misst auf dem iPhone quer 1688 x 780
 *  Geraetepunkte bei einer Welt von 1920 x 1080. Gemessen im Browsertor,
 *  nicht geschaetzt. */
export const ANZEIGE_MASSSTAB = 0.8;

/** Ein Turm in Weltpunkten: Platzbedarf mal Zeichenzuschlag, geteilt durch
 *  den Anteil, den die Figur in ihrer Kachel einnimmt. */
export const TURM_WELT = 96 * 1.32 / 0.94;

/** Auf wieviele Geraetepunkte wird eine Figur dieser Weltbreite gezeichnet? */
export const anzeigePunkte = (weltbreite) =>
  Math.max(8, Math.round(weltbreite * ANZEIGE_MASSSTAB));

/** Die Tafel Dateiname -> Eintragsname, aus den vier Bildvorratsdateien.
 *
 *  Sie wird gebraucht, weil `probebild` einen Ordner mit Kandidaten
 *  bekommt und nicht weiss, welche Figur darin steckt. Der Dateiname ist
 *  die einzige Bruecke - und er ist eine gute, denn genau unter diesem
 *  Namen wird das Bild spaeter gepackt.
 */
export function bildTafel() {
  const tafel = new Map();
  for (const gruppe of ['gegner', 'objekte', 'tuerme', 'untergrund']) {
    let roh;
    try { roh = JSON.parse(readFileSync(join(ROOT, `art/${gruppe}.json`), 'utf8')); }
    catch { continue; }
    for (const [name, eintrag] of Object.entries(roh.items ?? {})) {
      if (eintrag.file) tafel.set(eintrag.file, { gruppe, name });
    }
  }
  return tafel;
}

/** Die Anzeigebreite in Geraetepunkten fuer eine Kandidatendatei.
 *
 *  `null`, wenn der Name in keiner Vorratsdatei steht - dann ist es ein
 *  Bild, das es im Spiel noch gar nicht gibt, und eine Anzeigegroesse waere
 *  erfunden (Regel 10). Der Aufrufer sagt das dann hin, statt eine Zahl zu
 *  behaupten.
 */
export async function anzeigeBreiteFuer(datei, tafel = bildTafel()) {
  const eintrag = tafel.get(datei);
  if (!eintrag) return null;
  if (eintrag.gruppe === 'tuerme') return anzeigePunkte(TURM_WELT);
  if (eintrag.gruppe === 'objekte') return anzeigePunkte(TURM_WELT);
  if (eintrag.gruppe === 'untergrund') return null;
  const { enemyArtWidth } = await import('../src/gfx/enemyart.ts');
  const { ENEMIES } = await import('../src/data/enemies.ts');
  if (!ENEMIES[eintrag.name]) return null;
  return anzeigePunkte(enemyArtWidth(eintrag.name));
}
