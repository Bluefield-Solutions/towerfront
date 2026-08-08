import { C, COLS, ROWS, TILE, WORLD_H, WORLD_W } from '../data/config';
import type { MapPalette } from '../data/maps';
import { cellKey } from '../data/maps';
import { makeRng } from '../core/math';
import { hexA } from './glow';

/** Der statische Untergrund wird genau einmal gebacken und danach nur noch
 *  als Bild gezeichnet. Spart auf dem Handy den Grossteil der Zeichenlast. */
export function bakeTerrain(
  pathSet: Set<number>, blockedSet: Set<number>, pal: MapPalette,
): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W; cv.height = WORLD_H;
  const g = cv.getContext('2d')!;
  const rnd = makeRng(20260807);

  // Grundflaeche mit vertikalem Verlauf: unten kuehler, oben heller angehaucht.
  const bg = g.createLinearGradient(0, 0, 0, WORLD_H);
  bg.addColorStop(0, pal.terrainHi);
  bg.addColorStop(0.55, pal.terrain);
  bg.addColorStop(1, pal.terrainLo);
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
  g.strokeStyle = hexA(pal.terrainHi, 0.5);
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
  g.fillStyle = 'rgba(6,10,18,0.55)';
  paintCells(g, pathSet, -5);
  g.fillStyle = pal.pathEdge;
  paintCells(g, pathSet, 2);
  g.fillStyle = pal.path;
  paintCells(g, pathSet, 11);
  g.fillStyle = 'rgba(255,246,220,0.13)';
  paintCells(g, pathSet, 24);
  // Randsteine saeumen den Weg - erst dadurch wirkt er gebaut statt gemalt.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!pathSet.has(cellKey(x, y))) continue;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        if (pathSet.has(cellKey(x + dx, y + dy))) continue;
        const cx = x * TILE + TILE / 2 + dx * (TILE / 2 - 4);
        const cy = y * TILE + TILE / 2 + dy * (TILE / 2 - 4);
        for (let k = -1; k <= 1; k++) {
          const ox = dy !== 0 ? k * (TILE / 3) : 0;
          const oy = dx !== 0 ? k * (TILE / 3) : 0;
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.beginPath(); g.ellipse(cx + ox, cy + oy + 2, 6, 4, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = hexA(pal.pathEdge, 0.9);
          g.beginPath(); g.ellipse(cx + ox, cy + oy, 6, 4, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.14)';
          g.beginPath(); g.ellipse(cx + ox, cy + oy - 1, 4, 2, 0, 0, Math.PI * 2); g.fill();
        }
      }
    }
  }

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

  // Bauplaetze als sichtbare Sockel.
  //
  // Vorher war das Feld eine leere Flaeche und die Bauplaetze erschienen erst,
  // wenn man eine Turmsorte gewaehlt hatte. Man sah dem Brett nicht an, wo
  // etwas hingehoert - der haeufigste Vorwurf beim ersten Anspielen. Jetzt
  // liegt auf jeder freien Zelle eine flache Steinplatte: leise genug, um
  // nicht zu stoeren, deutlich genug, um die Frage zu beantworten.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = cellKey(x, y);
      if (pathSet.has(k) || blockedSet.has(k)) continue;
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      const r = TILE * 0.31;
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.beginPath(); g.ellipse(cx, cy + 3, r * 1.06, r * 0.62, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = hexA(pal.rockHi, 0.34);
      g.beginPath(); g.ellipse(cx, cy, r, r * 0.58, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = hexA(pal.rock, 0.5);
      g.beginPath(); g.ellipse(cx, cy + 1.5, r * 0.78, r * 0.44, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.10)';
      g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(cx, cy, r, r * 0.58, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    }
  }

  // Deko-Felsen auf gesperrten Zellen
  for (const k of blockedSet) {
    const cx = k % COLS, cy = Math.floor(k / COLS);
    drawRock(g, cx * TILE + TILE / 2, cy * TILE + TILE / 2, TILE * 0.34, rnd, pal);
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

function drawRock(
  g: CanvasRenderingContext2D, x: number, y: number, r: number,
  rnd: () => number, pal: MapPalette,
): void {
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
  g.fillStyle = pal.rock; g.fill();
  g.clip();
  g.fillStyle = pal.rockHi;
  g.fillRect(-r, -r, r * 2, r * 0.9);
  g.restore();
}
