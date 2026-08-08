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

  // --- Der Weg als Band mit wechselnder Breite.
  //
  // Nicht mehr eine Linie mit fester Staerke, sondern eine Flaeche zwischen
  // den beiden Raendern. Erst dadurch kann der Weg mal weiter und mal enger
  // sein - und Engstellen sind das, woran sich das Spiel entscheidet.
  const ribbon = (p: LanePath, grow: number): void => {
    g.beginPath();
    for (let i = 0; i < p.pts.length; i++) {
      const e = p.edgesAt(i);
      const dx = e.lx - p.pts[i].x, dy = e.ly - p.pts[i].y;
      const len = Math.hypot(dx, dy) || 1;
      const x = p.pts[i].x + (dx / len) * (len + grow);
      const y = p.pts[i].y + (dy / len) * (len + grow);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    for (let i = p.pts.length - 1; i >= 0; i--) {
      const e = p.edgesAt(i);
      const dx = e.rx - p.pts[i].x, dy = e.ry - p.pts[i].y;
      const len = Math.hypot(dx, dy) || 1;
      g.lineTo(p.pts[i].x + (dx / len) * (len + grow),
        p.pts[i].y + (dy / len) * (len + grow));
    }
    g.closePath();
    g.fill();
  };

  for (const p of lanes) { g.fillStyle = 'rgba(6,10,18,0.5)'; ribbon(p, 12); }
  for (const p of lanes) { g.fillStyle = pal.pathEdge; ribbon(p, 0); }
  for (const p of lanes) { g.fillStyle = pal.path; ribbon(p, -9); }
  for (const p of lanes) { g.fillStyle = hexA('#FFF6DC', 0.12); ribbon(p, -22); }

  // Randsteine entlang beider Raender. Sie folgen der wechselnden Breite mit,
  // also verengt sich mit dem Weg auch seine Einfassung.
  for (const p of lanes) {
    for (let i = 4; i < p.pts.length - 4; i += 5) {
      const e = p.edgesAt(i);
      const ang = Math.atan2(e.ly - e.ry, e.lx - e.rx);
      for (const [cx0, cy0] of [[e.lx, e.ly], [e.rx, e.ry]] as const) {
        const jx = (rnd() - 0.5) * 5, jy = (rnd() - 0.5) * 5;
        const cx = cx0 + jx, cy = cy0 + jy;
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.beginPath(); g.ellipse(cx, cy + 2, 7, 4.5, ang, 0, Math.PI * 2); g.fill();
        g.fillStyle = hexA(pal.pathEdge, 0.95);
        g.beginPath(); g.ellipse(cx, cy, 7, 4.5, ang, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.beginPath(); g.ellipse(cx, cy - 1.5, 4.5, 2.5, ang, 0, Math.PI * 2); g.fill();
      }
    }
  }

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
    // Erst ein weicher Schatten unter dem Feld, dann eine dunkle Senke -
    // vorher war es eine halbdurchsichtige Flaeche und las sich als Fleck
    // auf dem Boden, nicht als Gelaende.
    g.save();
    g.translate(0, 8);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fill();
    g.restore();
    g.fillStyle = hexA(pal.terrainLo, 0.55);
    g.fill();
    g.restore();

    // Dicht an dicht liegende Brocken fuellen das Feld ganz aus. Ein Fels ist
    // etwas, das man sieht - keine Schraffur.
    const stones = 6 + Math.round(gr.r / 16);
    for (let i = 0; i < stones; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * gr.r * 0.82;
      drawRock(g, gr.x + Math.cos(a) * rr, gr.y + Math.sin(a) * rr * 0.78,
        gr.r * (0.16 + rnd() * 0.2), rnd, pal);
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
  // Ein Fels braucht drei Toene, sonst bleibt er eine Silhouette: Schatten
  // darunter, Koerper, und eine helle Kante oben links. Ohne die Kante liest
  // das Auge nur einen dunklen Fleck.
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.save(); g.translate(0, r * 0.22); g.fill(); g.restore();
  g.fillStyle = pal.rock; g.fill();
  g.save();
  g.clip();
  g.fillStyle = pal.rockHi;
  g.beginPath();
  g.ellipse(-r * 0.2, -r * 0.28, r * 0.62, r * 0.4, -0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath();
  g.ellipse(-r * 0.3, -r * 0.4, r * 0.34, r * 0.18, -0.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5; g.stroke();
  g.restore();
}
