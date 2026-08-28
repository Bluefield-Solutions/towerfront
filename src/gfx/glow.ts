import { ablageAnmelden } from './speicher';
/** Vorgebackene Leuchtscheiben.
 *  WICHTIG: Niemals ctx.drawImage(eigenesCanvas) mit filter=blur oder
 *  globalCompositeOperation='lighter' auf sich selbst - das erzeugt auf
 *  iOS Safari nach kurzer Zeit ein schwarzes Bild. Stattdessen immer
 *  fertige Scheiben stempeln. */

const cache = new Map<string, HTMLCanvasElement>();
/** Leuchtscheiben haengen an Farbe und Halbmesser, nicht an der Karte - die
 *  Tafel bleibt leer, und geraeumt wird hier nie. Angemeldet ist die Ablage
 *  trotzdem: was in der Summe fehlt, kann auch nicht auffallen. */
const tafel = new Map<string, string>();
ablageAnmelden('Leuchtscheiben', cache, tafel);

/** Wie gross eine Leuchtscheibe gebacken wird - fuer JEDEN Halbmesser.
 *
 *  **Die Scheibe ist selbstaehnlich, und das ist der ganze Punkt.** Ihr
 *  Verlauf hat relative Farbstopps (0, 0,35, 1 vom Halbmesser); eine Scheibe
 *  mit Halbmesser 16 und eine mit 48 sind dieselbe Funktion in anderer
 *  Auflösung. Und gezeichnet wurde sie ohnehin gestreckt - `stampGlow` ruft
 *  `drawImage(scheibe, x - r, y - r, r * 2, r * 2)`. In Zielgroesse zu
 *  backen brachte also nichts ausser einem eigenen Eintrag je gerundetem
 *  Halbmesser.
 *
 *  Bis v187 kostete das **48 Scheiben und 6,8 bis 13,0 MB** - je nach
 *  Spielstand ein Drittel des gesamten Bildspeichers. Zwei Aufrufstellen
 *  liefern einen STETIGEN Halbmesser: der Lichtkranz des Kristalls atmet und
 *  haengt an seiner Gesundheit, und das Muendungsfeuer waechst mit dem
 *  Blitz. Jeder gerundete Zwischenwert bekam seine eigene Scheibe.
 *
 *  **96 ist gemessen, nicht geraten** (Regel 9 und 13). Verglichen wurde "in
 *  Zielgroesse gebacken" gegen "fest gebacken und gestreckt", ueber zehn im
 *  Spiel wirklich vorkommende Halbmesser von 16 bis 208 und drei Farben.
 *  Dazu die Eichung, ohne die keine dieser Zahlen etwas bedeutet:
 *
 *    dieselbe Scheibe gegen sich selbst        0,00
 *    Halbmesser 64 gegen 65 - EIN Bildpunkt    3,74
 *    fest 128 gestreckt                        3,52
 *    fest  96 gestreckt                        4,96
 *    fest  64 gestreckt                        7,21
 *    andere Farbe, gleicher Halbmesser       142,06
 *    gar kein Leuchten                       491,70
 *
 *  Der ganze Bereich, um den es geht, liegt also zwischen 0 und knapp 8 -
 *  bei einem Effekt, dessen Fehlen 492 ausmacht. 96 kostet so viel wie
 *  anderthalb Bildpunkte Halbmesser, und der Kranz wandert im Spiel
 *  ohnehin staendig um mehr als das. */
const SCHEIBE = 96;

export function getGlowDisc(color: string, radius: number): HTMLCanvasElement {
  void radius;
  const r = SCHEIBE;
  const key = color;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = r * 2;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, hexA(color, 0.85));
  grad.addColorStop(0.35, hexA(color, 0.35));
  grad.addColorStop(1, hexA(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);

  cache.set(key, cv);
  return cv;
}

/** Viele Leuchtscheiben hintereinander: der Mischmodus wird einmal gesetzt
 *  statt bei jeder Scheibe. Zwischen `beginGlowBatch` und `endGlowBatch` darf
 *  nur `stampGlowFast` verwendet werden. */
export function beginGlowBatch(ctx: CanvasRenderingContext2D): void {
  ctx.globalCompositeOperation = 'lighter';
}

export function endGlowBatch(ctx: CanvasRenderingContext2D): void {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

export function stampGlowFast(
  ctx: CanvasRenderingContext2D,
  color: string, x: number, y: number, radius: number, alpha = 1,
): void {
  const disc = getGlowDisc(color, radius);
  ctx.globalAlpha = alpha;
  ctx.drawImage(disc, x - radius, y - radius, radius * 2, radius * 2);
}

export function stampGlow(
  ctx: CanvasRenderingContext2D,
  color: string, x: number, y: number, radius: number, alpha = 1,
): void {
  const disc = getGlowDisc(color, radius);
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(disc, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prev;
}

/** #RRGGBB -> rgba() mit Alpha */
/** Zwei Farben mischen. `t` = 0 gibt die erste, 1 die zweite.
 *
 *  Gebraucht wird sie, wo eine gemessene Farbe sichtbar gemacht werden muss:
 *  Die Teilchen einer beruehrten Stelle tragen die Farbe DIESER Stelle - und
 *  waeren in genau dieser Farbe unsichtbar, weil sie vor genau diesem Grund
 *  fliegen. Der Farbton traegt die Zugehoerigkeit, die Helligkeit die
 *  Sichtbarkeit; das ist dieselbe Trennung, auf der die Einbettung beruht. */
export function mischen(a: string, b: string, t: number): string {
  const zahl = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const teil = (i: number) => Math.round(zahl(a, i) + (zahl(b, i) - zahl(a, i)) * t);
  return '#' + [0, 1, 2].map((i) => teil(i).toString(16).padStart(2, '0')).join('');
}

export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
