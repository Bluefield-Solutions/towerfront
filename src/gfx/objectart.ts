import { OBJECT_ART } from './assets/objects';

/** Einzelobjekte: das Tor der Leere, spaeter auch der Herzkristall.
 *
 *  Anders als Tuerme und Gegner gibt es davon je genau eines, und es wird
 *  nicht eingefaerbt - deshalb reicht ein flaches Verzeichnis ohne Backen.
 *  Geladen wird erst beim ersten Gebrauch; bis das Bild da ist, zeichnet der
 *  Renderer weiter seine Ersatzform.
 */
const geladen = new Map<string, HTMLImageElement>();
const laeuft = new Set<string>();
let stand = 0;

/** Steigt, sobald ein Bild fertig ist - Schichten merken daran, dass sie neu
 *  gezeichnet werden muessen. */
export const objectArtVersion = (): number => stand;

/** Das genaueste vorhandene Bild aus einer Rueckfallkette.
 *
 *  Fuer die Waffenebene gibt es Bilder je Ausbaustufe - `waffe_frost_4`. Fehlt
 *  eine Stufe, wird die naechstniedrigere genommen, zuletzt das stufenlose
 *  `waffe_frost`. So kann ein Satz Stueck fuer Stueck wachsen, ohne dass
 *  zwischendurch eine Luecke entsteht. Dieselbe Kette wie bei den Tuermen. */
export function getObjectArtStufe(basis: string, level: number): HTMLImageElement | null {
  for (let l = Math.max(1, Math.round(level)); l >= 1; l--) {
    const treffer = getObjectArt(`${basis}_${l}`);
    if (treffer) return treffer;
  }
  return getObjectArt(basis);
}

export function getObjectArt(id: keyof typeof OBJECT_ART): HTMLImageElement | null {
  const fertig = geladen.get(id);
  if (fertig) return fertig;
  if (laeuft.has(id)) return null;
  const quelle = OBJECT_ART[id];
  if (!quelle) return null;
  // Ohne Bildunterstuetzung - Messwerkzeuge ohne Browser - bleibt es bei der
  // Ersatzform. Vorher brach der Zeichendurchsatzmesser hier ab, weil er
  // keinen Image-Typ kennt.
  if (typeof Image === 'undefined') return null;
  laeuft.add(id);
  const bild = new Image();
  bild.onload = () => { geladen.set(id, bild); stand++; };
  bild.onerror = () => { laeuft.delete(id); };
  bild.src = quelle;
  return null;
}
