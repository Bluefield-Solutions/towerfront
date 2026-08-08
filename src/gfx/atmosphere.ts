import { C, WORLD_H, WORLD_W } from '../data/config';
import { makeRng } from '../core/math';
import { hexA } from './glow';

/** Stimmungsschichten.
 *
 *  Das Feld scrollt nicht - klassische Parallaxe gibt es hier also nicht.
 *  Tiefe entsteht stattdessen ueber Schichten, die sich unabhaengig
 *  voneinander bewegen: ein Lichtschacht liegt still, Bodennebel zieht
 *  langsam, ein Polarlicht atmet darueber. Alles vorgebacken - im Spiel
 *  bleiben davon eine Handvoll Zeichenbefehle. */

let moodLayer: HTMLCanvasElement | null = null;
let fogDisc: HTMLCanvasElement | null = null;
let auroraBand: HTMLCanvasElement | null = null;

/** Ruhende Lichtstimmung ueber dem ganzen Feld: ein schraeger Mondschacht von
 *  oben links, kuehler Abfall nach unten rechts. Einmal gebacken, danach ein
 *  einziger Zeichenbefehl je Bild. */
export function getMoodLayer(): HTMLCanvasElement {
  if (moodLayer) return moodLayer;
  const cv = document.createElement('canvas');
  cv.width = WORLD_W; cv.height = WORLD_H;
  const g = cv.getContext('2d')!;

  const shaft = g.createLinearGradient(0, 0, WORLD_W * 0.85, WORLD_H);
  shaft.addColorStop(0, 'rgba(190, 226, 255, 0.16)');
  shaft.addColorStop(0.32, 'rgba(160, 205, 245, 0.06)');
  shaft.addColorStop(0.7, 'rgba(10, 16, 34, 0.12)');
  shaft.addColorStop(1, 'rgba(6, 10, 24, 0.32)');
  g.fillStyle = shaft;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // Ein zweiter, schmalerer Streifen setzt die Lichtkante.
  g.save();
  g.translate(WORLD_W * 0.24, 0);
  g.rotate(0.28);
  const beam = g.createLinearGradient(-260, 0, 260, 0);
  beam.addColorStop(0, 'rgba(200, 232, 255, 0)');
  beam.addColorStop(0.5, 'rgba(200, 232, 255, 0.09)');
  beam.addColorStop(1, 'rgba(200, 232, 255, 0)');
  g.fillStyle = beam;
  g.fillRect(-260, -200, 520, WORLD_H + 400);
  g.restore();

  moodLayer = cv;
  return cv;
}

function getFogDisc(): HTMLCanvasElement {
  if (fogDisc) return fogDisc;
  const r = 190;
  const cv = document.createElement('canvas');
  cv.width = r * 2; cv.height = r * 2;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(180, 214, 226, 0.13)');
  grad.addColorStop(0.5, 'rgba(160, 200, 216, 0.06)');
  grad.addColorStop(1, 'rgba(150, 190, 210, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, r * 2, r * 2);
  fogDisc = cv;
  return cv;
}

/** Bodennebel: acht Scheiben, die in verschiedenen Tempi ueber das Feld
 *  ziehen. Weil sie sich unterschiedlich schnell bewegen, entsteht Tiefe. */
export function drawGroundFog(ctx: CanvasRenderingContext2D, time: number, dense: boolean): void {
  const disc = getFogDisc();
  const n = dense ? 8 : 4;
  const rnd = makeRng(3141);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const speed = 6 + rnd() * 16;
    const y = rnd() * WORLD_H;
    const scale = 0.7 + rnd() * 0.9;
    const phase = rnd() * WORLD_W;
    const w = 380 * scale;
    // Sanft ueber den rechten Rand hinaus und links wieder herein.
    const x = ((phase + time * speed) % (WORLD_W + w * 2)) - w;
    ctx.globalAlpha = 0.55 + Math.sin(time * 0.4 + i) * 0.18;
    ctx.drawImage(disc, x - w / 2, y - w / 2, w, w);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function getAuroraBand(): HTMLCanvasElement {
  if (auroraBand) return auroraBand;
  const w = 512, h = 160;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d')!;
  const rnd = makeRng(777);
  for (let i = 0; i < 5; i++) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    const tone = i % 2 === 0 ? C.crystal : C.voidling;
    grad.addColorStop(0, hexA(tone, 0));
    grad.addColorStop(0.45, hexA(tone, 0.13));
    grad.addColorStop(1, hexA(tone, 0));
    g.fillStyle = grad;
    g.beginPath();
    const base = rnd() * w;
    g.moveTo(base, 0);
    for (let x = 0; x <= w; x += 32) {
      g.lineTo(base + x * 0.2 + Math.sin(x * 0.02 + i) * 40, x * 0.1);
    }
    g.lineTo(base + w * 0.25 + 60, h);
    g.lineTo(base - 40, h);
    g.closePath();
    g.fill();
  }
  auroraBand = cv;
  return cv;
}

/** Polarlicht am oberen Rand: langsam wandernd, additiv aufgelegt. */
export function drawAurora(ctx: CanvasRenderingContext2D, time: number): void {
  const band = getAuroraBand();
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) {
    const speed = 9 + i * 7;
    const w = WORLD_W * 1.4;
    const x = ((time * speed + i * 900) % (w + WORLD_W)) - w;
    ctx.globalAlpha = 0.5 + Math.sin(time * 0.3 + i * 2) * 0.22;
    ctx.drawImage(band, x, -30 + i * 40, w, 300 - i * 60);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prev;
}
