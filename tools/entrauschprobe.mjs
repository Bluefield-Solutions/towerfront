#!/usr/bin/env node
/**
 * Entrauschprobe — der Beleg dafür, dass B1 mit Code nicht zu lösen ist.
 *
 * Abschnitt 5.3 des Grafik-Audits versprach: *„Entrauschen wirkt. Eine milde
 * Weichzeichnung bringt den Koloss von 13,5 auf 6,3 Detaildichte, und die Form
 * bleibt vollständig erhalten."* Der erste Teil stimmt. Der zweite nicht.
 *
 * Dieses Werkzeug legt die Fassungen nebeneinander und zeigt beides zugleich:
 * die Kennzahlen, die sich verbessern, und das Bild, das schlechter wird. Es
 * ist absichtlich kein Tor — es beweist nichts, es zeigt etwas. Aber es zeigt
 * es in dreißig Sekunden, und das ist billiger als die Runde, die man sonst
 * verliert.
 *
 * Zwei Dinge sind daran wichtig:
 *
 *  1. **Gezeigt wird in Anzeigegröße.** Ein Turm liegt als 256er Bild vor und
 *     wird mit rund 108 Gerätepunkten gezeichnet. Wer die Quelle beurteilt,
 *     beurteilt etwas, das nie jemand sieht. Danach wird ohne Glätten
 *     vergrößert, damit sichtbar ist, was wirklich ankommt.
 *
 *  2. **Zwei Kennzahlen, nicht eine.** Die Detaildichte zählt die
 *     Helligkeitsänderung zwischen Nachbarpunkten — sie kann Korn nicht von
 *     Form unterscheiden und bestraft beides gleich. Der Rauschschätzer nach
 *     Immerkær faltet mit einem Kern, der auf glatte Verläufe UND auf gerade
 *     Kanten nicht anspricht; was übrig bleibt, ist eher Rauschen als Form.
 *
 * Gemessen (v105, Mittel über vier Figuren):
 *
 *     Verfahren      Rauschen   Dichte      Was das Bild sagt
 *     ohne             0,78      8,37       scharf, alle Details da
 *     median 3         0,82      6,50       Plattenkanten weg
 *     median 5         0,62      4,86       der Koloss ist ein Klumpen
 *     Weichzeichnen    0,12      5,10       Armbrust und Beine verschwinden
 *
 * Die Dichte geht auf jedem Weg ins Zielband von 3 bis 6. Der Blick verwirft
 * jeden davon. Der Grund ist Auflösung: bei 108 Punkten Anzeigegröße liegen
 * Korn und Form im selben Frequenzband, und kein Filter trennt, was physisch
 * nicht getrennt ist.
 *
 * Aufruf: npm run entrauschprobe
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const lies = (datei) => {
  const text = readFileSync(join(ROOT, 'src/gfx/assets', datei), 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/'([^']+)': 'data:image\/webp;base64,([^']+)'/g)) {
    out.set(m[1], Buffer.from(m[2], 'base64'));
  }
  return out;
};

const anwenden = (s, art) => art.median ? s.median(art.median)
  : art.blur ? s.blur(art.blur) : s;

/** Beide Kennzahlen in einem Durchgang. */
async function messen(buf, art) {
  const { data, info } = await anwenden(sharp(buf).ensureAlpha(), art)
    .raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const l = (x, y) => {
    const i = (y * W + x) * 4;
    return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  };
  const deckend = (x, y) => data[(y * W + x) * 4 + 3] >= 200;

  let rs = 0, rn = 0, ks = 0, kn = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let voll = true;
      for (let dy = -1; dy <= 1 && voll; dy++) {
        for (let dx = -1; dx <= 1; dx++) if (!deckend(x + dx, y + dy)) { voll = false; break; }
      }
      if (!voll) continue;
      // Immerkaer-Kern: [[1,-2,1],[-2,4,-2],[1,-2,1]].
      rs += Math.abs(
        l(x - 1, y - 1) - 2 * l(x, y - 1) + l(x + 1, y - 1)
        - 2 * l(x - 1, y) + 4 * l(x, y) - 2 * l(x + 1, y)
        + l(x - 1, y + 1) - 2 * l(x, y + 1) + l(x + 1, y + 1),
      );
      rn++;
      if (y % 2 && x % 2) {
        ks += Math.abs(l(x, y) - l(x + 1, y)) + Math.abs(l(x, y) - l(x, y + 1));
        kn++;
      }
    }
  }
  return {
    rauschen: rn ? (Math.sqrt(Math.PI / 2) * rs / (6 * rn)) * 100 : 0,
    dichte: kn ? (ks / kn) * 100 : 0,
  };
}

const VERFAHREN = [
  { name: 'ohne', art: {} },
  { name: 'median 3', art: { median: 3 } },
  { name: 'median 5', art: { median: 5 } },
  { name: 'weich 1.4', art: { blur: 1.4 } },
];

// Anzeigegroesse in Geraetepunkten: Weltbreite mal Massstab. Die Leinwand
// misst auf dem iPhone quer 1688 x 780 Geraetepunkte bei einer Welt von
// 1920 x 1080 - gemessen im Browsertor, nicht geschaetzt.
const MASSSTAB = 0.8;
const tw = lies('towers.ts'), en = lies('enemies.ts');
const PROBEN = [
  ['arrow_1_1', tw.get('arrow_1_1'), 135],
  ['mortar_1_1', tw.get('mortar_1_1'), 135],
  ['brute', en.get('brute'), 87],
  ['crawler', en.get('crawler'), 72],
];

console.log('ENTRAUSCHPROBE\n');
console.log('Verfahren      Rauschen   Dichte   (Mittel über ' + PROBEN.length + ' Figuren)');
for (const { name, art } of VERFAHREN) {
  let r = 0, d = 0;
  for (const [, buf] of PROBEN) {
    const m = await messen(buf, art);
    r += m.rauschen; d += m.dichte;
  }
  console.log(`${name.padEnd(14)} ${(r / PROBEN.length).toFixed(2).padStart(6)} ` +
    `${(d / PROBEN.length).toFixed(2).padStart(8)}`);
}

// --- Die Tafel.
const ZOOM = 3, RAND = 20;
const zellen = [];
let breiteste = 0;
for (const [, , welt] of PROBEN) breiteste = Math.max(breiteste, Math.round(welt * MASSSTAB));
const ZELLE = breiteste * ZOOM + RAND * 2;

let y = 0;
for (const [, buf, welt] of PROBEN) {
  const px = Math.round(welt * MASSSTAB);
  let x = 0;
  for (const { art } of VERFAHREN) {
    const klein = await anwenden(sharp(buf).ensureAlpha(), art)
      .resize(px).webp({ quality: 82 }).toBuffer();
    zellen.push({
      input: await sharp(klein).resize(px * ZOOM, null, { kernel: 'nearest' }).png().toBuffer(),
      left: x + RAND, top: y + RAND,
    });
    x += ZELLE;
  }
  y += ZELLE;
}

mkdirSync(join(ROOT, 'bilder'), { recursive: true });
await sharp({
  create: {
    width: ZELLE * VERFAHREN.length, height: ZELLE * PROBEN.length,
    channels: 4, background: { r: 26, g: 30, b: 45, alpha: 1 },
  },
}).composite(zellen).png().toFile(join(ROOT, 'bilder/entrauschprobe.png'));

console.log(`\nTafel: bilder/entrauschprobe.png`);
console.log(`  Spalten: ${VERFAHREN.map((v) => v.name).join(' | ')}`);
console.log(`  Zeilen:  ${PROBEN.map((p) => p[0]).join(', ')}`);
console.log('\nIn Anzeigegröße gerechnet, dann dreifach ohne Glätten vergrößert.');
console.log('Die Kennzahlen verbessern sich auf jedem Weg. Das Bild nicht.');
