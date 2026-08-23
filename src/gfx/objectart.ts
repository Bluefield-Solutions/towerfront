import { OBJECT_ART } from './assets/objects';
import { einbetten, einbettungSchluessel } from './einbettung';

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

/** Dasselbe, aber in die Karte eingebettet.
 *
 *  Sockel und Waffen waren nach v132 die letzten Bilder ohne Kartenkenntnis -
 *  und zwar an einer besonders auffaelligen Stelle: sie stehen NEBEN einem
 *  Turm, der laengst eingebettet ist. Ein Sockel mit eigenem Licht unter
 *  einem Turm mit dem Licht der Karte faellt mehr auf als ein einzelnes Bild
 *  irgendwo im Feld. */
export function getObjectArtStufeEingebettet(
  basis: string, level: number, mapId: string,
): HTMLCanvasElement | HTMLImageElement | null {
  for (let l = Math.max(1, Math.round(level)); l >= 1; l--) {
    const id = `${basis}_${l}` as keyof typeof OBJECT_ART;
    if (OBJECT_ART[id]) return getObjectArtEingebettet(id, mapId);
  }
  return getObjectArtEingebettet(basis as keyof typeof OBJECT_ART, mapId);
}

/** Dasselbe Bild, aber in die Karte eingebettet.
 *
 *  Bis v125 gab es das nicht: `getObjectArt` lieferte das rohe Bild, und der
 *  Renderer stempelte es auf die Karte. Tuerme und Gegner liefen laengst durch
 *  die Einbettung - Sonne der Karte, Bodenverschattung, Rueckwurf -, der
 *  Zielturm, die Tore und die Sockel nicht.
 *
 *  Das war der mechanische Grund, warum ausgerechnet die Kristallfestung wie
 *  aufgeklebt aussah: sie ist die groesste Figur im Bild und die einzige, die
 *  ihr eigenes Licht und ihre eigene Farbwelt behielt. Gemessen lag sie auf
 *  dem Spiralhain 0,41 vom Boden entfernt, auf der Frostspalte 0,18 - sie ist
 *  fuer eine der drei Karten gebaut.
 *
 *  `staerke` ist fuer die Festung kleiner: sie wird dreimal so gross
 *  gezeichnet wie ein Turm, und derselbe Anstrich waere auf dieser Flaeche
 *  eine Waschung statt einer Beleuchtung. */
const eingebettet = new Map<string, HTMLCanvasElement>();

export function getObjectArtEingebettet(
  id: keyof typeof OBJECT_ART, mapId: string, staerke = 1,
): HTMLCanvasElement | HTMLImageElement | null {
  const img = getObjectArt(id);
  if (!img) return null;
  if (typeof document === 'undefined') return img;

  const k = `${String(id)}|${einbettungSchluessel(mapId)}|${staerke}`;
  const fertig = eingebettet.get(k);
  if (fertig) return fertig;

  const b = img.width, h = img.height;
  if (!b || !h) return img;
  const cv = document.createElement('canvas');
  cv.width = b; cv.height = h;
  const g = cv.getContext('2d');
  if (!g) return img;
  g.drawImage(img, 0, 0);
  // Die Einbettung rechnet in einem Quadrat; das Bild ist hoeher als breit.
  // Uebergeben wird die HOEHE, weil alle senkrechten Verlaeufe daran haengen
  // - Sonne von oben, Verschattung am Fuss.
  einbetten(g, Math.max(b, h), mapId, staerke);
  eingebettet.set(k, cv);
  return cv;
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
