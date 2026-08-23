#!/usr/bin/env node
/**
 * Wo hat der Künstler das Ziel gebaut?
 *
 * Jede Karte bringt im Untergrundbild eine gemauerte Rundplattform mit -
 * Steinkranz, konzentrische Pflasterung, der Weg laeuft darauf zu. Das Spiel
 * hat sie bis v126 ignoriert: `goalOf` nahm schlicht den letzten Bahnpunkt,
 * und der liegt am RAND der Platte. Die Kristallfestung stand deshalb oben
 * links auf dem Rand statt in der Mitte.
 *
 * Dieses Werkzeug findet die Platte im Bild, statt dass jemand drei
 * Koordinaten abliest und einträgt. Eine abgelesene Zahl waere nach dem
 * naechsten `pack-art` still falsch - dieselbe Familie wie die veraltete
 * Zahl, die hier schon vier Runden weiterlief.
 *
 * Verfahren: die Platte ist aus WEGMATERIAL, gross und rund. Fuer jeden
 * Mittelpunkt auf einem groben Raster wird gezaehlt, wieviel Wegmaterial
 * INNEN liegt und wieviel im Ring DRUM HERUM. Ein Weg ist innen Weg und
 * aussen auch; eine Platte ist innen Weg und aussen Gelaende. Genau diese
 * Differenz ist die Punktzahl.
 *
 * Die Wegfarbe wird aus den BAHNEN der Karte abgetastet, nicht angenommen.
 * Der erste Entwurf setzte "Weg = hell" - das stimmt fuer Spiralhain und
 * Ascheschlucht und ist auf der Frostspalte genau falsch herum: dort sind die
 * Wege dunkel auf hellem Schnee. Er fand die Platte deshalb 990 Weltpunkte
 * daneben, und die Zahl sah aus wie ein Befund ueber das Spiel, war aber
 * einer ueber mich (Regel 3: prueft, ob der Eingriff ankommt).
 *
 * Aufruf: npm run zielplatte
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WELT_B = 1920, WELT_H = 1080;

/** Auf diese Breite wird zum Suchen verkleinert. Fein genug fuer eine Platte
 *  von rund 200 Weltpunkten, grob genug, dass die Suche in einer Sekunde
 *  durchlaeuft. */
const N = 300;

const karten = [];
for (const m of readFileSync(join(ROOT, 'src/gfx/assets/backgrounds.ts'), 'utf8')
  .matchAll(/'([a-z]+)': 'data:image\/(?:webp|jpeg);base64,([^']+)'/g)) {
  karten.push({ id: m[1], buf: Buffer.from(m[2], 'base64') });
}

const { MAPS, goalOf, lanePaths } = await import('../src/data/maps.ts');

console.log('ZIELPLATTE\n');

for (const k of karten) {
  const H = Math.round(N * WELT_H / WELT_B);
  const { data } = await sharp(k.buf).resize(N, H, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const farbe = (x, y) => {
    const i = (y * N + x) * 3;
    return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
  };

  // --- Die Wegfarbe aus den Bahnen abtasten.
  const karte = MAPS.find((m) => m.id === k.id);
  if (!karte) { console.log(`── ${k.id}: keine Karte dieses Namens.`); continue; }
  const bahnen = lanePaths(karte);
  let wr = 0, wg = 0, wb = 0, wn = 0;
  for (const bahn of bahnen) {
    for (let t = 0.05; t < 0.95; t += 0.02) {
      const p = bahn.at(bahn.length * t);
      const x = Math.round(p.x * N / WELT_B), y = Math.round(p.y * N / WELT_B);
      if (x < 0 || y < 0 || x >= N || y >= H) continue;
      const [r, g, b] = farbe(x, y);
      wr += r; wg += g; wb += b; wn++;
    }
  }
  if (!wn) { console.log(`── ${k.id}: keine Bahnpunkte abtastbar.`); continue; }
  wr /= wn; wg /= wn; wb /= wn;

  // Und die Gelaendefarbe: das Mittel ueber alles. Der Abstand zwischen
  // beiden setzt die Schwelle - je Karte, aus der Karte.
  let gr = 0, gg = 0, gb = 0;
  for (let i = 0; i < N * H; i++) { gr += data[i * 3] / 255; gg += data[i * 3 + 1] / 255; gb += data[i * 3 + 2] / 255; }
  gr /= N * H; gg /= N * H; gb /= N * H;
  const spanne = Math.hypot(wr - gr, wg - gg, wb - gb);
  const schwelle = spanne * 0.55;

  const istWeg = (x, y) => {
    if (x < 0 || y < 0 || x >= N || y >= H) return 0;
    const [r, g, b] = farbe(x, y);
    return Math.hypot(r - wr, g - wg, b - wb) < schwelle ? 1 : 0;
  };

  let best = null;
  // Die Platte ist gross: zwischen 90 und 170 Weltpunkten Radius.
  for (let rw = 90; rw <= 170; rw += 10) {
    const r = rw * N / WELT_B;
    for (let y = Math.ceil(r * 1.4); y < H - r * 1.4; y += 2) {
      for (let x = Math.ceil(r * 1.4); x < N - r * 1.4; x += 2) {
        let innen = 0, innenN = 0, ring = 0, ringN = 0;
        for (let dy = -Math.ceil(r * 1.4); dy <= r * 1.4; dy++) {
          for (let dx = -Math.ceil(r * 1.4); dx <= r * 1.4; dx++) {
            const d = Math.hypot(dx, dy);
            if (d <= r * 0.8) { innen += istWeg(x + dx, y + dy); innenN++; }
            else if (d >= r * 1.12 && d <= r * 1.4) { ring += istWeg(x + dx, y + dy); ringN++; }
          }
        }
        const punkte = innen / innenN - ring / ringN;
        if (!best || punkte > best.punkte) best = { punkte, x, y, r, rw };
      }
    }
  }

  const wx = best.x * WELT_B / N, wy = best.y * WELT_B / N;
  console.log(`── ${k.id}`);
  console.log(`   Wegfarbe rgb ${(wr*255).toFixed(0)},${(wg*255).toFixed(0)},${(wb*255).toFixed(0)}`
    + `  Gelaende rgb ${(gr*255).toFixed(0)},${(gg*255).toFixed(0)},${(gb*255).toFixed(0)}`
    + `  Spanne ${spanne.toFixed(2)}`);
  console.log(`   Platte bei ${wx.toFixed(0)} : ${wy.toFixed(0)} `
    + `(Radius ${best.rw}, Guete ${best.punkte.toFixed(2)})`);
  k.platte = { x: Math.round(wx), y: Math.round(wy), r: best.rw, guete: best.punkte };
}

// --- Und stimmt die eingetragene Zahl noch mit dem Bild ueberein?
console.log('\nGegen die eingetragene Zielplattform:\n');

/** Wie weit die eingetragene Zahl vom gefundenen Mittelpunkt abweichen darf.
 *
 *  40 Weltpunkte ist knapp die Haelfte einer Turmbreite und deutlich unter dem
 *  Radius der Platte (90 bis 170) - eine Festung, die so weit daneben steht,
 *  steht immer noch drauf. Die Fehler, um die es geht, waren 99 bis 164. */
const ERLAUBT = 40;
const TOR = process.argv.includes('--tor');
const befunde = [];

for (const k of karten) {
  const karte = MAPS.find((m) => m.id === k.id);
  if (!karte || !k.platte) continue;
  if (!karte.ziel) {
    befunde.push(`${k.id}: keine Zielplattform eingetragen, im Bild liegt aber eine `
      + `bei ${k.platte.x}:${k.platte.y} (Guete ${k.platte.guete.toFixed(2)}).`);
    continue;
  }
  const d = Math.hypot(karte.ziel.x - k.platte.x, karte.ziel.y - k.platte.y);
  const roh = karte.lanes[0][karte.lanes[0].length - 1];
  const vorher = Math.hypot(roh.x - k.platte.x, roh.y - k.platte.y);
  console.log(`   ${k.id.padEnd(14)} eingetragen ${karte.ziel.x}:${karte.ziel.y}, `
    + `im Bild ${k.platte.x}:${k.platte.y}  →  ${d.toFixed(0)} daneben`
    + `   (Rohbahn endete ${vorher.toFixed(0)} daneben)`);
  if (d > ERLAUBT) {
    befunde.push(`${k.id}: eingetragen ${karte.ziel.x}:${karte.ziel.y}, im Bild aber `
      + `${k.platte.x}:${k.platte.y} - ${d.toFixed(0)} Weltpunkte auseinander `
      + `(erlaubt ${ERLAUBT}). Entweder ist das Kartenbild neu oder die Zahl veraltet.`);
  }
}

if (befunde.length) {
  console.error(`\nZIELPLATTE: ${befunde.length} Befund(e)`);
  for (const b of befunde) console.error(`  - ${b}`);
  if (TOR) process.exit(1);
} else {
  console.log('\nZIELPLATTE: jede Karte steht auf ihrer Platte.');
}
