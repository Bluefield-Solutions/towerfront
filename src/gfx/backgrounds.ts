import { MAP_BACKGROUNDS } from './assets/backgrounds';

/** Untergrundbilder.
 *
 *  Die Bilder liegen als Datenadresse im Bündel, werden aber trotzdem
 *  asynchron dekodiert - ein Bild ist erst nach `onload` zeichenbar. Deshalb
 *  darf sich das Zeichnen nicht darauf verlassen: solange keines fertig ist,
 *  malt die Engine ihren alten Verlauf, und sobald eines ankommt, wird der
 *  Untergrund einmal neu gebacken.
 *
 *  Ohne diese Regel bliebe das Feld beim ersten Bild leer - und in der
 *  kopflosen Pruefung, wo es gar keine Bilddekodierung gibt, dauerhaft. */
const images = new Map<string, HTMLImageElement>();
const ready = new Set<string>();
let version = 0;

/** Zaehlt hoch, sobald ein weiteres Bild fertig dekodiert ist. Der Renderer
 *  vergleicht den Wert und backt den Untergrund bei Aenderung neu. */
export const backgroundVersion = (): number => version;

export function getBackground(mapId: string): HTMLImageElement | null {
  const src = MAP_BACKGROUNDS[mapId];
  if (!src) return null;

  // Ohne Bildunterstuetzung - etwa in der kopflosen Pruefung - bleibt es beim
  // gemalten Untergrund, statt dass das Zeichnen abbricht.
  if (typeof Image === 'undefined') return null;

  let img = images.get(mapId);
  if (!img) {
    img = new Image();
    img.onload = () => { ready.add(mapId); version++; };
    img.onerror = () => { /* dann bleibt der gemalte Untergrund */ };
    img.src = src;
    images.set(mapId, img);
  }
  return ready.has(mapId) ? img : null;
}

/** Fuer die Pruefwerkzeuge: gibt es ueberhaupt ein Bild fuer diese Karte? */
export const hasBackground = (mapId: string): boolean => mapId in MAP_BACKGROUNDS;
