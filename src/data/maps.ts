import { TILE, COLS, ROWS } from './config';
import type { Vec } from '../core/math';

/** Farbwelt einer Karte. Jedes Biom setzt eigene Toene fuer Boden und Pfad -
 *  Kristall, Gold und Gefahr bleiben ueberall gleich, damit die Bedeutung der
 *  Farben nicht von der Karte abhaengt. */
export interface MapPalette {
  terrain: string;
  terrainHi: string;
  terrainLo: string;
  path: string;
  pathEdge: string;
  rock: string;
  rockHi: string;
  /** Ton der Stimmungsschicht ueber dem Feld. */
  mood: string;
  /** Farbe des treibenden Bodennebels. */
  haze: string;
}

export interface GameMap {
  id: string;
  name: string;
  blurb: string;
  palette: MapPalette;
  /** Ein oder mehrere Zuwege. Jede Bahn ist eine Kette von Gitterpunkten und
   *  endet auf demselben Herzkristall. Der erste Punkt darf ausserhalb des
   *  Feldes liegen - dort steht das Tor, aus dem die Gegner kommen.
   *
   *  Bahnen duerfen sich Zellen teilen: genau so entsteht eine Gabelung, an
   *  der zwei Zuege zusammenlaufen. Innerhalb einer Bahn ist eine doppelt
   *  benutzte Zelle dagegen ein Fehler - der Waechter prueft beides getrennt. */
  lanes: Vec[][];
  /** Zellen, auf denen nicht gebaut werden darf (Deko/Felsen). */
  blocked: Vec[];
  /** Empfohlener erster Bauplatz - die Einfuehrung zeigt darauf. */
  hint: Vec;
  /** Ausgleich der Karte.
   *
   *  Eine Karte mit zwei spaet zusammenlaufenden Bahnen halbiert die Deckung
   *  fast ueber den ganzen Weg: ein Turm sieht nur eine der beiden Seiten.
   *  Derselbe Wellenplan trifft dort also viel haerter. Statt die Wellen je
   *  Karte zu verdoppeln - was jede spaetere Balanceaenderung dreifach
   *  machen wuerde - traegt die Karte einen eigenen Faktor. */
  balance: { hpMul: number; goldMul: number };
}

const MOOS: MapPalette = {
  terrain: '#173D3A', terrainHi: '#215A50', terrainLo: '#102B2B',
  path: '#C9A86A', pathEdge: '#9C7F49',
  rock: '#2A3348', rockHi: '#3D4A66',
  mood: '#BEE2FF', haze: '#B4D6E2',
};

const ASCHE: MapPalette = {
  terrain: '#3A2622', terrainHi: '#5A382C', terrainLo: '#231512',
  path: '#D8C0A0', pathEdge: '#9A7A5C',
  rock: '#41282A', rockHi: '#66413E',
  mood: '#FFC79A', haze: '#C99C7E',
};

const FROST: MapPalette = {
  terrain: '#22364F', terrainHi: '#33557A', terrainLo: '#16233A',
  path: '#E4EEF6', pathEdge: '#A6BACD',
  rock: '#2C3E5B', rockHi: '#44608A',
  mood: '#D6ECFF', haze: '#CFE6F5',
};

/** Karte 1 "Spiralhain": Ein einziger Weg, der sich einmal um den Herzkristall
 *  windet. Weite Flaechen, viele Bauplaetze, starke Ueberlappung der
 *  Reichweiten - die Karte zum Lernen. */
export const MAP_SPIRALHAIN: GameMap = {
  id: 'spiralhain',
  name: 'Spiralhain',
  blurb: 'Ein Weg, viel Platz. Der Pfad windet sich um den Kristall.',
  palette: MOOS,
  lanes: [[
    { x: -1, y: 1 },
    { x: 14, y: 1 },
    { x: 14, y: 7 },
    { x: 3, y: 7 },
    { x: 3, y: 4 },
    { x: 11, y: 4 },
  ]],
  hint: { x: 12, y: 2 },
  balance: { hpMul: 1, goldMul: 1 },
  blocked: [
    { x: 16, y: 1 }, { x: 17, y: 2 },
    { x: 0, y: 5 }, { x: 1, y: 8 },
    { x: 8, y: 0 }, { x: 6, y: 8 },
  ],
};

/** Rechteckiges Feld gesperrter Zellen - kuerzer und lesbarer, als jede Zelle
 *  einzeln aufzuzaehlen. */
function rect(x0: number, y0: number, x1: number, y1: number): Vec[] {
  const out: Vec[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ x, y });
  return out;
}

/** Karte 2 "Ascheschlucht": Zwei Zuwege, die sich auf halbem Weg vereinen.
 *  Vor der Gabelung muss man sich entscheiden, hinter ihr zahlt jede Stellung
 *  doppelt - das ist die eigentliche Frage dieser Karte. */
export const MAP_ASCHESCHLUCHT: GameMap = {
  id: 'ascheschlucht',
  name: 'Ascheschlucht',
  blurb: 'Zwei Zuwege, die sich frueh vereinen. Danach zaehlt jede Stellung doppelt.',
  palette: ASCHE,
  lanes: [
    [
      { x: -1, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 5 },
      { x: 6, y: 8 }, { x: 17, y: 8 }, { x: 17, y: 2 },
      { x: 11, y: 2 }, { x: 11, y: 6 }, { x: 14, y: 6 },
    ],
    [
      { x: -1, y: 9 }, { x: 2, y: 9 }, { x: 2, y: 5 }, { x: 6, y: 5 },
      { x: 6, y: 8 }, { x: 17, y: 8 }, { x: 17, y: 2 },
      { x: 11, y: 2 }, { x: 11, y: 6 }, { x: 14, y: 6 },
    ],
  ],
  hint: { x: 7, y: 4 },
  balance: { hpMul: 0.92, goldMul: 1.05 },
  blocked: [
    // Lavafelder engen die Raender ein.
    ...rect(0, 3, 1, 4),
    ...rect(18, 4, 19, 6),
    ...rect(8, 0, 10, 0),
    { x: 4, y: 7 }, { x: 3, y: 3 }, { x: 19, y: 9 }, { x: 0, y: 0 },
    { x: 13, y: 4 }, { x: 8, y: 10 },
  ],
};

/** Karte 3 "Frostspalte": Zwei Zuwege, die erst kurz vor dem Kristall
 *  zusammenfinden, dazu ein Feld voller Gletscherspalten. Wenig Platz, spaete
 *  Vereinigung - hier entscheidet nicht die Menge, sondern die Wahl. */
export const MAP_FROSTSPALTE: GameMap = {
  id: 'frostspalte',
  name: 'Frostspalte',
  blurb: 'Spaete Vereinigung, wenig Platz. Jede Stellung muss sitzen.',
  palette: FROST,
  lanes: [
    [
      { x: -1, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 7 },
      { x: 10, y: 7 }, { x: 10, y: 4 }, { x: 16, y: 4 },
      { x: 16, y: 8 }, { x: 12, y: 8 },
    ],
    [
      { x: 9, y: -1 }, { x: 9, y: 4 },
      { x: 16, y: 4 }, { x: 16, y: 8 }, { x: 12, y: 8 },
    ],
  ],
  hint: { x: 11, y: 5 },
  balance: { hpMul: 0.62, goldMul: 1.12 },
  blocked: [
    // Gletscherspalten nehmen viel Bauflaeche - hier ist Platz die Ressource.
    ...rect(0, 8, 3, 10),
    ...rect(6, 9, 10, 10),
    ...rect(17, 9, 19, 10),
    ...rect(0, 4, 2, 6),
    ...rect(6, 2, 8, 3),
    ...rect(17, 0, 19, 2),
    ...rect(12, 5, 14, 6),
    { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 11, y: 0 }, { x: 12, y: 0 },
  ],
};

export const MAPS: GameMap[] = [MAP_SPIRALHAIN, MAP_ASCHESCHLUCHT, MAP_FROSTSPALTE];

export function mapById(id: string): GameMap {
  return MAPS.find((m) => m.id === id) ?? MAP_SPIRALHAIN;
}

/** Zellindex -> eindeutiger Schluessel */
export const cellKey = (cx: number, cy: number) => cy * COLS + cx;

/** Mittelpunkt einer Zelle in Weltkoordinaten */
export const cellCenter = (cx: number, cy: number): Vec => ({
  x: cx * TILE + TILE / 2,
  y: cy * TILE + TILE / 2,
});

/** Zellen einer einzelnen Bahn, in Laufrichtung. Nur achsenparallele
 *  Abschnitte sind erlaubt. */
export function laneCells(lane: Vec[]): Vec[] {
  const out: Vec[] = [];
  const seen = new Set<number>();
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const k = cellKey(x, y);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ x, y });
  };
  for (let i = 0; i < lane.length - 1; i++) {
    const a = lane[i], b = lane[i + 1];
    if (a.x !== b.x && a.y !== b.y) {
      throw new Error(`Abschnitt ${i} ist diagonal - nur Achsen erlaubt.`);
    }
    const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
    let x = a.x, y = a.y;
    push(x, y);
    while (x !== b.x || y !== b.y) { x += sx; y += sy; push(x, y); }
  }
  return out;
}

/** Alle Zellen, die irgendeine Bahn beruehrt. */
export function pathCells(map: GameMap): Vec[] {
  const out: Vec[] = [];
  const seen = new Set<number>();
  for (const lane of map.lanes) {
    for (const c of laneCells(lane)) {
      const k = cellKey(c.x, c.y);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

/** Weltkoordinaten einer Bahn. */
export function lanePoints(lane: Vec[]): Vec[] {
  return lane.map((w) => cellCenter(w.x, w.y));
}

/** Der Herzkristall - das Ende aller Bahnen. */
export function goalOf(map: GameMap): Vec {
  const last = map.lanes[0][map.lanes[0].length - 1];
  return cellCenter(last.x, last.y);
}

/** Gesamtlaenge einer Bahn in Pixeln (fuer die Sortierung beim Zielen). */
export function pathLength(points: Vec[]): number {
  let l = 0;
  for (let i = 0; i < points.length - 1; i++) {
    l += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
  }
  return l;
}
