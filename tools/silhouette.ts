/** Wie aehnlich sind zwei Silhouetten?
 *
 *  **Warum das hier steht und nicht zweimal.** `npm run probebild` misst es
 *  an KANDIDATEN, bevor sie gepackt werden - `npm run lesbarkeit` braucht
 *  dieselbe Antwort am AUSGELIEFERTEN Satz, seit die Fraktionsfarben
 *  (TF-024, v168) zwei Gegner derselben Rolle denselben Akzent tragen
 *  lassen. Zwei Fassungen derselben Rechnung waeren eine zu viel: dann
 *  hiesse "aehnlich" in den beiden Werkzeugen bald Verschiedenes (Regel 15).
 *
 *  Die Zahl ist die Ueberdeckung zweier auf 64 x 64 normierter Masken -
 *  Groesse und Lage fallen heraus, die FORM bleibt. Zwei Panzer, die sich
 *  nur in der Farbe unterscheiden, kommen so auf ueber 0,9. */
import sharp from 'sharp';

/** Die Silhouette eines Bildes, auf 64 x 64 normiert. */
export async function umriss(bild: Buffer): Promise<Uint8Array> {
  const { data, info } = await sharp(bild).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const maske = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] > 24) maske[i] = 1;
  return normieren(maske, W, H, 64);
}

/** 1,00 heisst gleiche Form, 0,00 heisst keine gemeinsame Flaeche. */
export function ueberdeckung(a: Uint8Array, b: Uint8Array): number {
  let und = 0, oder = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] && b[k]) und++;
    if (a[k] || b[k]) oder++;
  }
  return oder ? und / oder : 1;
}

/** Ein Bildteil an seinem Platz - Weltmasse, wie der Renderer sie rechnet. */
export interface Teil { bild: Buffer; x: number; y: number; w: number; h: number; }

/** Die Silhouette einer ZUSAMMENGESETZTEN Figur, auf 64 x 64 normiert.
 *
 *  Der Bogenturm besteht aus Sockel und Waffe, und die Waffe traegt bei ihm
 *  den Ausbau: von Stufe 1 auf 6 waechst vor allem sie. Wer nur den Sockel
 *  misst, misst den Teil, der sich am wenigsten aendert - und bekommt
 *  heraus, der Ausbau sei unsichtbar. Das ist derselbe Fehler wie viermal
 *  zuvor: eine Zahl an einer Figur, die so nicht gezeichnet wird (Regel 12).
 *
 *  Gerastert wird ueber dem gemeinsamen Kasten aller Teile, mit derselben
 *  Aufloesung fuer alle - danach greift die Normierung wie bei einem Bild. */
export async function umrissZusammen(teile: Teil[]): Promise<Uint8Array> {
  const N = 64;
  if (!teile.length) return new Uint8Array(N * N);
  const x0 = Math.min(...teile.map((t) => t.x));
  const y0 = Math.min(...teile.map((t) => t.y));
  const x1 = Math.max(...teile.map((t) => t.x + t.w));
  const y1 = Math.max(...teile.map((t) => t.y + t.h));
  const G = 512;                        // Rasterweite ueber dem Kasten
  const grob = new Uint8Array(G * G);
  for (const t of teile) {
    const { data, info } = await sharp(t.bild).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    const gx0 = Math.round(((t.x - x0) / (x1 - x0)) * G);
    const gy0 = Math.round(((t.y - y0) / (y1 - y0)) * G);
    const gw = Math.max(1, Math.round((t.w / (x1 - x0)) * G));
    const gh = Math.max(1, Math.round((t.h / (y1 - y0)) * G));
    for (let y = 0; y < gh; y++) {
      const sy = Math.min(info.height - 1, Math.floor((y * info.height) / gh));
      const gy = gy0 + y;
      if (gy < 0 || gy >= G) continue;
      for (let x = 0; x < gw; x++) {
        const gx = gx0 + x;
        if (gx < 0 || gx >= G) continue;
        const sx = Math.min(info.width - 1, Math.floor((x * info.width) / gw));
        if (data[(sy * info.width + sx) * 4 + 3] > 24) grob[gy * G + gx] = 1;
      }
    }
  }
  return normieren(grob, G, G, N);
}

/** Schneidet eine Maske auf ihren Inhalt zu und zieht sie auf N x N. */
function normieren(maske: Uint8Array, W: number, H: number, N: number): Uint8Array {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!maske[y * W + x]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const out = new Uint8Array(N * N);
  if (x1 < 0) return out;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      out[y * N + x] = maske[(y0 + Math.floor((y * bh) / N)) * W + x0 + Math.floor((x * bw) / N)];
    }
  }
  return out;
}
