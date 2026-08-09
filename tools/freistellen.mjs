#!/usr/bin/env node
/**
 * Freistellen — weissen Hintergrund entfernen.
 *
 * Nicht jede Lieferung kommt freigestellt. Die sechs Ausbaustufen des
 * Bogenturms sahen im Betrachter transparent aus, hatten aber einen weissen
 * Hintergrund mit voller Deckung - das faellt erst auf, wenn man die Werte
 * liest statt das Bild anzusehen.
 *
 * Entfernt wird nur, was von aussen zusammenhaengend weiss ist. Ein weisses
 * Stueck mitten im Turm bleibt stehen; ein Fuellwerkzeug, das nach Farbe
 * allein arbeitet, wuerde es mitnehmen.
 *
 * Aufruf: node tools/freistellen.mjs <bild.png> [...]
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

for (const datei of process.argv.slice(2)) {
  const { data, info } = await sharp(datei).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  const istWeiss = (i) => data[i * 4] > 236 && data[i * 4 + 1] > 236 && data[i * 4 + 2] > 236;

  // Von allen Raendern nach innen fluten.
  const aussen = new Uint8Array(W * H);
  const stapel = [];
  for (let x = 0; x < W; x++) { stapel.push(x); stapel.push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stapel.push(y * W); stapel.push(y * W + W - 1); }
  while (stapel.length) {
    const p = stapel.pop();
    if (aussen[p] || !istWeiss(p)) continue;
    aussen[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stapel.push(p - 1);
    if (x < W - 1) stapel.push(p + 1);
    if (y > 0) stapel.push(p - W);
    if (y < H - 1) stapel.push(p + W);
  }

  let entfernt = 0;
  for (let i = 0; i < W * H; i++) {
    if (!aussen[i]) continue;
    data[i * 4 + 3] = 0;
    entfernt++;
  }

  // Der Saum zwischen Objekt und entferntem Weiss bleibt sonst hell. Ein
  // Punkt neben einer freigestellten Stelle wird anteilig durchsichtig.
  for (let i = 0; i < W * H; i++) {
    if (aussen[i] || data[i * 4 + 3] === 0) continue;
    const x = i % W, y = (i / W) | 0;
    let nachbarn = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (aussen[ny * W + nx]) nachbarn++;
    }
    if (nachbarn && istWeiss(i)) data[i * 4 + 3] = Math.round(255 * (1 - nachbarn / 4));
  }

  writeFileSync(datei, await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .png().toBuffer());
  console.log(`${datei.split('/').pop().padEnd(24)} ${(entfernt / (W * H) * 100).toFixed(1)} % entfernt`);
}
