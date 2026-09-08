/** Wieviel einer Karte nimmt ueberhaupt einen Turm an - und WO?
 *
 *  Die Frage kam vom Nutzer, woertlich: "man sieht nicht gut, wo man etwas
 *  hinbauen kann". Das Bauflaechentor beantwortet eine andere: ob die
 *  GEZEIGTE Kante dasselbe sagt wie die Regel. Beide koennen zugleich
 *  stimmen und das Spiel trotzdem unlesbar lassen - wenn die Flaeche zwar
 *  richtig gezeichnet wird, aber erst, nachdem man sich schon entschieden
 *  hat.
 *
 *  Gemessen wird deshalb hier die Flaeche selbst, in Weltmassen, aus
 *  `warumNicht` - der einen Stelle, an der die Bauregel steht. Dazu ein Bild
 *  je Karte, damit der Blick dazukommt (Regel 8).
 *
 *  Aufruf: npm run baukarte
 */
import { geruestStellen } from './leinwand.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUS = process.env.UXAUS || '/tmp/lab/ux';
mkdirSync(AUS, { recursive: true });

const SCHRITT = 4;          // Weltpunkte je Rasterschritt
const W = 1920, H = 1080;

geruestStellen();
const { GameState } = await import('../src/game/state.ts');
const { TOWERS, TOWER_ORDER } = await import('../src/data/towers.ts');
const { MAPS } = await import('../src/data/maps.ts');

const zeilen = [];
for (const map of MAPS) {
  const s = new GameState();
  s.reset(7, 'normal', map.id);
  const proKarte = {};
  for (const id of TOWER_ORDER) {
    let ja = 0, gesamt = 0;
    const maske = [];
    for (let y = SCHRITT / 2; y < H; y += SCHRITT) {
      const zeile = [];
      for (let x = SCHRITT / 2; x < W; x += SCHRITT) {
        const frei = s.warumNicht(id, x, y) === null;
        zeile.push(frei ? 1 : 0);
        gesamt += 1; if (frei) ja += 1;
      }
      maske.push(zeile);
    }
    proKarte[id] = { anteil: 100 * ja / gesamt, maske };
  }

  // Zusammenhaengende Inseln des kleinsten Turms: eine Flaeche, die in
  // vierzig Fetzen zerfaellt, ist unlesbar, auch wenn ihr Anteil stimmt.
  const id0 = TOWER_ORDER[0];
  const m = proKarte[id0].maske;
  const hoehe = m.length, breite = m[0].length;
  const gesehen = m.map((r) => r.map(() => false));
  const inseln = [];
  for (let j = 0; j < hoehe; j += 1) {
    for (let i = 0; i < breite; i += 1) {
      if (!m[j][i] || gesehen[j][i]) continue;
      let n = 0; const stapel = [[i, j]]; gesehen[j][i] = true;
      while (stapel.length) {
        const [ci, cj] = stapel.pop(); n += 1;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = ci + di, nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= breite || nj >= hoehe) continue;
          if (!m[nj][ni] || gesehen[nj][ni]) continue;
          gesehen[nj][ni] = true; stapel.push([ni, nj]);
        }
      }
      inseln.push(n);
    }
  }
  inseln.sort((a, b) => b - a);
  const flaeche = inseln.reduce((a, b) => a + b, 0);
  const gross = inseln.filter((n) => n * SCHRITT * SCHRITT > 40000).length;

  zeilen.push({
    karte: map.id,
    anteile: TOWER_ORDER.map((id) => `${id} ${proKarte[id].anteil.toFixed(1)}%`).join('  '),
    inseln: inseln.length,
    gross,
    groesste: (100 * (inseln[0] ?? 0) / Math.max(1, flaeche)).toFixed(0),
  });

  // Bild: baubar gruen, verboten nach Grund eingefaerbt.
  const cv = createCanvas(W / 2, H / 2);
  const g = cv.getContext('2d');
  g.fillStyle = '#101418'; g.fillRect(0, 0, W / 2, H / 2);
  const farbe = { Rand: '#3a3f46', Weg: '#7a4a2a', 'Gelände': '#4a3a5a', Turm: '#5a5a2a' };
  for (let y = SCHRITT / 2; y < H; y += SCHRITT) {
    for (let x = SCHRITT / 2; x < W; x += SCHRITT) {
      const grund = s.warumNicht(id0, x, y);
      g.fillStyle = grund === null ? '#3ddc84' : farbe[grund];
      g.fillRect(x / 2 - SCHRITT / 4, y / 2 - SCHRITT / 4, SCHRITT / 2, SCHRITT / 2);
    }
  }
  writeFileSync(join(AUS, `baukarte-${map.id}.png`), cv.toBuffer('image/png'));
}

console.log('Baubare Flaeche je Karte (Weltmasse, Raster 4, ohne gebaute Tuerme):\n');
for (const z of zeilen) {
  console.log(`  ${z.karte.padEnd(15)} ${z.anteile}`);
  console.log(`  ${''.padEnd(15)} ${z.inseln} Inseln, davon ${z.gross} groesser als `
    + `200x200 Weltpunkte; die groesste haelt ${z.groesste} % der Flaeche`);
}
console.log(`\nBilder: ${AUS}/baukarte-*.png`);
