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
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] <= 24) continue;
      maske[y * W + x] = 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const N = 64, out = new Uint8Array(N * N);
  if (x1 < 0) return out;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      out[y * N + x] = maske[(y0 + Math.floor((y * bh) / N)) * W + x0 + Math.floor((x * bw) / N)];
    }
  }
  return out;
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
