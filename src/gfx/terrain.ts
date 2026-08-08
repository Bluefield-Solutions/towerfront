import { C, WORLD_H, WORLD_W } from '../data/config';
import type { MapPalette, GameMap } from '../data/maps';

import type { LanePath } from '../core/path';
import { hexA } from './glow';

/** Der Untergrund, einmal gebacken.
 *
 *  Bis v35 wurde hier ein Kachelraster gemalt und der Weg aus achsenparallelen
 *  Zellen zusammengesetzt - daher die 90-Grad-Ecken. Jetzt wird der Weg als
 *  Band entlang der Kurve gezeichnet: mit runden Enden, weichen Uebergaengen
 *  und wechselnder Breite. Sobald echte Kartenbilder da sind, faellt auch das
 *  weg und das Bild bringt den Weg selbst mit.
 */
export function bakeTerrain(
  map: GameMap, lanes: LanePath[], pal: MapPalette,
  photo: HTMLImageElement | null = null,
): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W; cv.height = WORLD_H;
  const g = cv.getContext('2d')!;

  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  if (photo) {
    g.drawImage(photo, 0, 0, WORLD_W, WORLD_H);
  } else {
    const bg = g.createLinearGradient(0, 0, 0, WORLD_H);
    bg.addColorStop(0, pal.terrainHi);
    bg.addColorStop(0.55, pal.terrain);
    bg.addColorStop(1, pal.terrainLo);
    g.fillStyle = bg;
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    // Etwas Unruhe, damit die gemalte Flaeche nicht gedruckt wirkt.
    for (let i = 0; i < 260; i++) {
      const x = rnd() * WORLD_W, y = rnd() * WORLD_H, r = 3 + rnd() * 9;
      g.fillStyle = rnd() > 0.5 ? hexA(pal.terrainHi, 0.16) : hexA(pal.terrainLo, 0.2);
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, Math.PI * 2); g.fill();
    }
  }

  // --- Der Weg als Band entlang der Kurve.
  //
  // Drei Durchlaeufe uebereinander: ein dunkler Schatten etwas breiter, das
  // eigentliche Band, und eine hellere Spur in der Mitte. Runde Enden und
  // runde Verbindungen sorgen dafuer, dass in keiner Kurve eine Ecke entsteht.
  const stroke = (paths: LanePath[], width: number, colour: string, blur = 0) => {
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = colour;
    g.lineWidth = width;
    if (blur) { g.shadowColor = colour; g.shadowBlur = blur; }
    for (const p of paths) {
      g.beginPath();
      g.moveTo(p.pts[0].x, p.pts[0].y);
      for (let i = 1; i < p.pts.length; i++) g.lineTo(p.pts[i].x, p.pts[i].y);
      g.stroke();
    }
    g.restore();
  };

  const W = 74;
  stroke(lanes, W + 16, 'rgba(6,10,18,0.5)');
  stroke(lanes, W, pal.pathEdge);
  stroke(lanes, W - 14, pal.path);
  stroke(lanes, W - 34, hexA('#FFF6DC', 0.13));

  // Randsteine: kleine Ellipsen entlang beider Seiten. Sie folgen der Kurve,
  // also runden sie sich in den Kurven von selbst mit.
  for (const p of lanes) {
    for (let i = 4; i < p.pts.length - 4; i += 5) {
      const a = p.pts[i - 1], b = p.pts[i + 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      for (const side of [-1, 1]) {
        const jitter = (rnd() - 0.5) * 5;
        const cx = p.pts[i].x + Math.cos(ang) * side * (W / 2 - 3) + jitter;
        const cy = p.pts[i].y + Math.sin(ang) * side * (W / 2 - 3) + jitter;
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.beginPath(); g.ellipse(cx, cy + 2, 7, 4.5, ang, 0, Math.PI * 2); g.fill();
        g.fillStyle = hexA(pal.pathEdge, 0.95);
        g.beginPath(); g.ellipse(cx, cy, 7, 4.5, ang, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.beginPath(); g.ellipse(cx, cy - 1.5, 4.5, 2.5, ang, 0, Math.PI * 2); g.fill();
      }
    }
  }

  // --- Deko: Felsen an freien Orten.
  for (const pr of map.props) drawRock(g, pr.x, pr.y, pr.r, rnd, pal);

  // --- Unwegsames Gelaende.
  //
  // Es wird nicht als Verbotsschild gezeichnet, sondern als das, was es ist:
  // Felsfelder und Dickicht. Man soll auf einen Blick sehen, *warum* dort
  // nichts hinpasst - nicht, dass es verboten waere.
  for (const gr of map.rough) {
    const n = 9;
    g.save();
    g.translate(gr.x, gr.y);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const rr = gr.r * (0.78 + rnd() * 0.34);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.78;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle = hexA(pal.terrainLo, 0.8);
    g.fill();
    g.strokeStyle = hexA(pal.rockHi, 0.3); g.lineWidth = 2; g.stroke();
    g.restore();
    const stones = 3 + Math.round(gr.r / 34);
    for (let i = 0; i < stones; i++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * gr.r * 0.66;
      drawRock(g, gr.x + Math.cos(a) * rr, gr.y + Math.sin(a) * rr * 0.78,
        12 + rnd() * (gr.r * 0.24), rnd, pal);
    }
  }

  // --- Vignette
  const vg = g.createRadialGradient(
    WORLD_W / 2, WORLD_H / 2, Math.min(WORLD_W, WORLD_H) * 0.3,
    WORLD_W / 2, WORLD_H / 2, Math.max(WORLD_W, WORLD_H) * 0.72,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, hexA(C.voidDeep, photo ? 0.38 : 0.6));
  g.fillStyle = vg;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  return cv;
}

function drawRock(
  g: CanvasRenderingContext2D, x: number, y: number, r: number,
  rnd: () => number, pal: MapPalette,
): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const rr = r * (0.74 + rnd() * 0.4);
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.72;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fillStyle = 'rgba(0,0,0,0.34)';
  g.save(); g.translate(0, 4); g.fill(); g.restore();
  g.fillStyle = pal.rock; g.fill();
  g.fillStyle = pal.rockHi;
  g.beginPath();
  g.ellipse(-r * 0.18, -r * 0.22, r * 0.42, r * 0.24, -0.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
