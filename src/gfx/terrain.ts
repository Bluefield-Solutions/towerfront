import { C, COLS, ROWS, TILE, WORLD_H, WORLD_W } from '../data/config';
import { cellKey } from '../data/maps';
import { makeRng } from '../core/math';
import { hexA } from './glow';

/** Der statische Untergrund wird genau einmal gebacken und danach nur noch
 *  als Bild gezeichnet. Spart auf dem Handy den Grossteil der Zeichenlast. */
export function bakeTerrain(pathSet: Set<number>, blockedSet: Set<number>): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W; cv.height = WORLD_H;
  const g = cv.getContext('2d')!;
  const rnd = makeRng(20260807);

  // Grundflaeche mit vertikalem Verlauf: unten kuehler, oben heller angehaucht.
  const bg = g.createLinearGradient(0, 0, 0, WORLD_H);
  bg.addColorStop(0, C.terrainHi);
  bg.addColorStop(0.55, C.terrain);
  bg.addColorStop(1, C.terrainLo);
  g.fillStyle = bg;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // Leichte Kachelvariation, damit die Flaeche nicht flach wirkt.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = cellKey(x, y);
      if (pathSet.has(k)) continue;
      const v = (rnd() - 0.5) * 0.07;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Kachelfasen: eine helle Lippe oben, ein Schatten unten. Erst dadurch
  // bekommt die Flaeche ueberhaupt Relief statt bloss Farbe.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = cellKey(x, y);
      if (pathSet.has(k)) continue;
      const px = x * TILE, py = y * TILE;
      g.fillStyle = 'rgba(255,255,255,0.045)';
      g.fillRect(px, py, TILE, 2);
      g.fillStyle = 'rgba(0,0,0,0.07)';
      g.fillRect(px, py + TILE - 2, TILE, 2);
      g.fillStyle = 'rgba(255,255,255,0.02)';
      g.fillRect(px, py, 2, TILE);
      g.fillStyle = 'rgba(0,0,0,0.04)';
      g.fillRect(px + TILE - 2, py, 2, TILE);
    }
  }

  // Steine und Risse - kleine Unruhe, damit die Flaeche nicht gedruckt wirkt.
  for (let i = 0; i < 150; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
    if (pathSet.has(cellKey(Math.floor(x / TILE), Math.floor(y / TILE)))) continue;
    const r = 2 + rnd() * 4;
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.beginPath(); g.ellipse(x, y + 1.5, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(190,205,205,0.14)';
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
  }

  // Grasbueschel als kleine Striche - sparsam, nur Silhouette.
  g.strokeStyle = hexA(C.terrainHi, 0.5);
  g.lineWidth = 2;
  for (let i = 0; i < 620; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
    const k = cellKey(Math.floor(x / TILE), Math.floor(y / TILE));
    if (pathSet.has(k)) continue;
    const h = 5 + rnd() * 7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 4, y - h);
    g.stroke();
  }

  // Pfad: warmer Knochenton in drei Lagen - dunkler Saum, Rand, ausgetretene
  // Mitte. Der Uebergang traegt den groessten Teil der Wirkung.
  g.fillStyle = 'rgba(8,14,22,0.35)';
  paintCells(g, pathSet, -3);
  g.fillStyle = C.pathEdge;
  paintCells(g, pathSet, 2);
  g.fillStyle = C.path;
  paintCells(g, pathSet, 11);
  g.fillStyle = 'rgba(255,246,220,0.10)';
  paintCells(g, pathSet, 22);

  // Trittspuren
  for (let i = 0; i < 420; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
    if (!pathSet.has(cellKey(cx, cy))) continue;
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.07)';
    const r = 3 + rnd() * 9;
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    // Fussabdruecke: kleine paarweise Vertiefungen.
    if (rnd() > 0.72) {
      g.fillStyle = 'rgba(0,0,0,0.09)';
      const a = rnd() * Math.PI;
      for (const o of [-4, 4]) {
        g.beginPath();
        g.ellipse(x + Math.cos(a) * o, y + Math.sin(a) * o, 3.2, 2.1, a, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  // Deko-Felsen auf gesperrten Zellen
  for (const k of blockedSet) {
    const cx = k % COLS, cy = Math.floor(k / COLS);
    drawRock(g, cx * TILE + TILE / 2, cy * TILE + TILE / 2, TILE * 0.34, rnd);
  }

  // Vignette: lenkt den Blick zur Mitte
  const vg = g.createRadialGradient(
    WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.35,
    WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.72,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, hexA(C.voidDeep, 0.65));
  g.fillStyle = vg;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  return cv;
}

function paintCells(g: CanvasRenderingContext2D, cells: Set<number>, inset: number): void {
  for (const k of cells) {
    const cx = k % COLS, cy = Math.floor(k / COLS);
    const x = cx * TILE, y = cy * TILE;
    // Nachbarn beruecksichtigen, damit Ecken zusammenlaufen.
    const l = cells.has(cellKey(cx - 1, cy)) ? 0 : inset;
    const r = cells.has(cellKey(cx + 1, cy)) ? 0 : inset;
    const t = cells.has(cellKey(cx, cy - 1)) ? 0 : inset;
    const b = cells.has(cellKey(cx, cy + 1)) ? 0 : inset;
    g.fillRect(x + l, y + t, TILE - l - r, TILE - t - b);
  }
}

function drawRock(g: CanvasRenderingContext2D, x: number, y: number, r: number, rnd: () => number): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.75 + rnd() * 0.45);
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.8;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fillStyle = '#2A3348'; g.fill();
  g.clip();
  g.fillStyle = '#3D4A66';
  g.fillRect(-r, -r, r * 2, r * 0.9);
  g.restore();
}
