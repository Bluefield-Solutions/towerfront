import { TILE, COLS, ROWS } from './config';
import type { Vec } from '../core/math';

export interface GameMap {
  id: string;
  name: string;
  /** Gitterkoordinaten. Der erste Punkt darf ausserhalb liegen (Spawn hinter dem Rand). */
  waypoints: Vec[];
  /** Zellen, auf denen nicht gebaut werden darf (Deko/Felsen). */
  blocked: Vec[];
}

/** Karte 1 "Spiralhain": Der Pfad windet sich einmal um den Herzkristall,
 *  bevor er ihn erreicht. Das erzeugt starke Ueberlappung der Turmreichweiten. */
export const MAP_SPIRALHAIN: GameMap = {
  id: 'spiralhain',
  name: 'Spiralhain',
  waypoints: [
    { x: -1, y: 1 },
    { x: 14, y: 1 },
    { x: 14, y: 7 },
    { x: 3, y: 7 },
    { x: 3, y: 4 },
    { x: 11, y: 4 },
  ],
  blocked: [
    { x: 16, y: 1 }, { x: 17, y: 2 },
    { x: 0, y: 5 }, { x: 1, y: 8 },
    { x: 8, y: 0 }, { x: 6, y: 8 },
  ],
};

export const MAPS: GameMap[] = [MAP_SPIRALHAIN];

/** Zellindex -> eindeutiger Schluessel */
export const cellKey = (cx: number, cy: number) => cy * COLS + cx;

/** Mittelpunkt einer Zelle in Weltkoordinaten */
export const cellCenter = (cx: number, cy: number): Vec => ({
  x: cx * TILE + TILE / 2,
  y: cy * TILE + TILE / 2,
});

/** Alle Zellen, die der Pfad beruehrt (nur gerade Segmente erlaubt). */
export function pathCells(map: GameMap): Vec[] {
  const out: Vec[] = [];
  const seen = new Set<number>();
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const k = cellKey(x, y);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ x, y });
  };
  for (let i = 0; i < map.waypoints.length - 1; i++) {
    const a = map.waypoints[i], b = map.waypoints[i + 1];
    if (a.x !== b.x && a.y !== b.y) {
      throw new Error(`Karte ${map.id}: Segment ${i} ist diagonal - nur Achsen erlaubt.`);
    }
    const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
    let x = a.x, y = a.y;
    push(x, y);
    while (x !== b.x || y !== b.y) { x += sx; y += sy; push(x, y); }
  }
  return out;
}

/** Weltkoordinaten-Wegpunkte, auf denen die Gegner laufen. */
export function pathPoints(map: GameMap): Vec[] {
  return map.waypoints.map((w) => cellCenter(w.x, w.y));
}

/** Gesamtlaenge des Pfades in Pixeln (fuer Fortschritts-Sortierung beim Zielen). */
export function pathLength(points: Vec[]): number {
  let l = 0;
  for (let i = 0; i < points.length - 1; i++) {
    l += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
  }
  return l;
}
