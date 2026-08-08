import sharp from 'sharp';
const datei = '/mnt/user-data/uploads/F3E96E24-119B-4A99-A8A0-8A7D7B907720.png';
const B = 420;
const { data, info } = await sharp(datei).resize(B, Math.round(B*941/1672))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
// Pflaster ist grau: niedrige Saettigung. Sand ist ocker: hohe Saettigung.
let grau = 0, sand = 0;
const maske = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const s = max === 0 ? 0 : (max - min) / max;
  const l = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
  const istGrau = s < 0.42;
  maske[i] = istGrau ? 255 : 0;
  if (istGrau) grau++; else sand++;
}
console.log('Grau (Pflaster + Felsen):', (grau/(W*H)*100).toFixed(1) + ' %');
await sharp(Buffer.from(maske), { raw: { width: W, height: H, channels: 1 } })
  .png().toFile('/tmp/maske.png');
console.log('Maske geschrieben');
