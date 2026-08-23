/** Vorgebackene Leuchtscheiben.
 *  WICHTIG: Niemals ctx.drawImage(eigenesCanvas) mit filter=blur oder
 *  globalCompositeOperation='lighter' auf sich selbst - das erzeugt auf
 *  iOS Safari nach kurzer Zeit ein schwarzes Bild. Stattdessen immer
 *  fertige Scheiben stempeln. */

const cache = new Map<string, HTMLCanvasElement>();

export function getGlowDisc(color: string, radius: number): HTMLCanvasElement {
  const r = Math.max(4, Math.round(radius));
  const key = `${color}|${r}`;
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
