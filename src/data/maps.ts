import type { Vec } from '../core/math';
import { LanePath } from '../core/path';
import {
  PLAN_SPIRALHAIN, PLAN_ASCHESCHLUCHT, PLAN_FROSTSPALTE, type Wave,
} from './waves';

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
  /** Saumfarbe fuer Tuerme und Gegner.
   *
   *  Ein Objekt ist nicht deshalb lesbar, weil seine Flaeche sich vom Boden
   *  abhebt - mitteldunkel auf mittelhell hat in beide Richtungen wenig
   *  Kontrast. Lesbar wird es durch seine *Kante*.
   *
   *  Alle drei Untergruende liegen gemessen zwischen 1,6 und 6,1 % Helligkeit -
   *  sie sind samt und sonders dunkel, auch der Winterboden, der im Bild hell
   *  wirkt. Ein dunkler Saum bringt darauf nichts (gemessen 2,0), ein heller
   *  sehr viel (8,6). Deshalb ueberall hell, nur im Ton der Karte. */
  rim: string;
}

export interface GameMap {
  id: string;
  name: string;
  blurb: string;
  palette: MapPalette;
  /** Kontrollpunkte der Zuwege in Weltkoordinaten.
   *
   *  Durch sie laeuft eine Catmull-Rom-Kurve. Der erste Punkt darf ausserhalb
   *  des Feldes liegen - dort steht das Tor. Mehrere Bahnen koennen sich
   *  vereinen, indem sie ab dem Treffpunkt dieselben Punkte fuehren. */
  lanes: Vec[][];
  /** Bauplaetze in Weltkoordinaten. Gestaltete Orte, keine Rasterzellen -
   *  sie duerfen und sollen ungleich verteilt sein. */
  spots: Vec[];
  /** Index des Bauplatzes, auf den die Einfuehrung zeigt. */
  hint: number;
  /** Deko - Felsen und Bewuchs, rein optisch. */
  props: { x: number; y: number; r: number }[];
  /** Der Wellenplan dieser Karte. */
  waves: Wave[];
  /** Feinausgleich der Karte. Siehe Konzept, Abschnitt zur Balance. */
  balance: { hpMul: number; goldMul: number };
}


const MOOS: MapPalette = {
  terrain: '#173D3A', terrainHi: '#215A50', terrainLo: '#102B2B',
  path: '#C9A86A', pathEdge: '#9C7F49',
  rock: '#2A3348', rockHi: '#3D4A66',
  mood: '#BEE2FF', haze: '#B4D6E2', rim: '#DCEEFF',
};

const LAUB: MapPalette = {
  terrain: '#2E2A1E', terrainHi: '#4A4228', terrainLo: '#1B1810',
  path: '#CBB48A', pathEdge: '#8E7A52',
  rock: '#39332A', rockHi: '#5C5242',
  mood: '#FFD9A8', haze: '#B8A882', rim: '#FFE9C8',
};

const FROST: MapPalette = {
  terrain: '#22364F', terrainHi: '#33557A', terrainLo: '#16233A',
  path: '#E4EEF6', pathEdge: '#A6BACD',
  rock: '#2C3E5B', rockHi: '#44608A',
  mood: '#D6ECFF', haze: '#CFE6F5', rim: '#EAF6FF',
};

/** Karte 1 "Spiralhain": Ein einziger Weg, der sich einmal um den Herzkristall
 *  windet. Weite Flaechen, viele Bauplaetze, starke Ueberlappung der
 *  Reichweiten - die Karte zum Lernen. */
export const MAP_SPIRALHAIN: GameMap = {
  id: 'spiralhain',
  name: 'Spiralhain',
  blurb: 'Ein Weg, viel Platz. Der Pfad windet sich um den Kristall.',
  palette: MOOS,
  lanes: [
    [
      { x: -48, y: 156 }, { x: 1392, y: 156 }, { x: 1392, y: 732 }, { x: 336, y: 732 },
      { x: 336, y: 444 }, { x: 1104, y: 444 },
    ],
  ],
  spots: [
    { x: 516, y: 612 }, { x: 1380, y: 468 }, { x: 948, y: 204 },
    { x: 996, y: 684 }, { x: 348, y: 228 }, { x: 1260, y: 396 },
    { x: 204, y: 300 }, { x: 564, y: 300 }, { x: 444, y: 516 },
    { x: 780, y: 276 }, { x: 660, y: 228 }, { x: 1284, y: 636 },
  ],
  hint: 0,
  props: [
    { x: 1584, y: 156, r: 26 }, { x: 1680, y: 252, r: 26 }, { x: 48, y: 540, r: 26 },
    { x: 144, y: 828, r: 26 }, { x: 816, y: 60, r: 26 }, { x: 624, y: 828, r: 26 },
  ],
  waves: PLAN_SPIRALHAIN,
  balance: { hpMul: 0.88, goldMul: 1 },
};


/** Karte 2 "Laubschlucht": Zwei Zuwege, die sich auf halbem Weg vereinen.
 *  Vor der Gabelung muss man sich entscheiden, hinter ihr zahlt jede Stellung
 *  doppelt - das ist die eigentliche Frage dieser Karte. */
export const MAP_ASCHESCHLUCHT: GameMap = {
  id: 'ascheschlucht',
  name: 'Laubschlucht',
  blurb: 'Zwei Zuwege, die sich früh vereinen. Danach zählt jede Stellung doppelt.',
  palette: LAUB,
  lanes: [
    [
      { x: -48, y: 156 }, { x: 624, y: 156 }, { x: 624, y: 540 }, { x: 624, y: 828 },
      { x: 1680, y: 828 }, { x: 1680, y: 252 }, { x: 1104, y: 252 }, { x: 1104, y: 636 },
      { x: 1392, y: 636 },
    ],
    [
      { x: -48, y: 924 }, { x: 240, y: 924 }, { x: 240, y: 540 }, { x: 624, y: 540 },
      { x: 624, y: 828 }, { x: 1680, y: 828 }, { x: 1680, y: 252 }, { x: 1104, y: 252 },
      { x: 1104, y: 636 }, { x: 1392, y: 636 },
    ],
  ],
  spots: [
    { x: 1212, y: 396 }, { x: 492, y: 660 }, { x: 1644, y: 444 },
    { x: 396, y: 276 }, { x: 1452, y: 780 }, { x: 132, y: 684 },
    { x: 996, y: 708 }, { x: 204, y: 300 }, { x: 1140, y: 756 },
    { x: 828, y: 708 }, { x: 1260, y: 756 }, { x: 1524, y: 612 },
  ],
  hint: 5,
  props: [
    { x: 48, y: 348, r: 26 }, { x: 144, y: 348, r: 26 }, { x: 48, y: 444, r: 26 },
    { x: 144, y: 444, r: 26 }, { x: 1860, y: 180, r: 26 }, { x: 1872, y: 444, r: 26 },
    { x: 1860, y: 300, r: 26 }, { x: 1872, y: 540, r: 26 }, { x: 1860, y: 60, r: 26 },
    { x: 1872, y: 636, r: 26 }, { x: 816, y: 60, r: 26 }, { x: 912, y: 60, r: 26 },
    { x: 1008, y: 60, r: 26 }, { x: 432, y: 732, r: 26 }, { x: 336, y: 348, r: 26 },
    { x: 1872, y: 924, r: 26 }, { x: 48, y: 60, r: 26 }, { x: 1296, y: 444, r: 26 },
    { x: 816, y: 1020, r: 26 },
  ],
  waves: PLAN_ASCHESCHLUCHT,
  balance: { hpMul: 1.05, goldMul: 1 },
};


/** Karte 3 "Frostspalte": Zwei Zuwege, die erst kurz vor dem Kristall
 *  zusammenfinden, dazu ein Feld voller Gletscherspalten. Wenig Platz, spaete
 *  Vereinigung - hier entscheidet nicht die Menge, sondern die Wahl. */
export const MAP_FROSTSPALTE: GameMap = {
  id: 'frostspalte',
  name: 'Frostspalte',
  blurb: 'Späte Vereinigung, wenig Platz. Jede Stellung muss sitzen.',
  palette: FROST,
  lanes: [
    [
      { x: -48, y: 252 }, { x: 336, y: 252 }, { x: 336, y: 828 }, { x: 816, y: 828 },
      { x: 816, y: 540 }, { x: 1680, y: 540 }, { x: 1680, y: 924 }, { x: 1104, y: 924 },
      { x: 1104, y: 636 },
    ],
    [
      { x: 624, y: -36 }, { x: 624, y: 60 }, { x: 1392, y: 60 }, { x: 1392, y: 348 },
      { x: 1008, y: 348 }, { x: 1008, y: 540 }, { x: 1680, y: 540 }, { x: 1680, y: 924 },
      { x: 1104, y: 924 }, { x: 1104, y: 636 },
    ],
  ],
  spots: [
    { x: 1020, y: 636 }, { x: 1572, y: 804 }, { x: 1284, y: 276 },
    { x: 444, y: 204 }, { x: 516, y: 732 }, { x: 1212, y: 684 },
    { x: 924, y: 276 }, { x: 180, y: 444 }, { x: 1548, y: 660 },
    { x: 996, y: 756 }, { x: 900, y: 684 }, { x: 1308, y: 612 },
  ],
  hint: 0,
  props: [
    { x: 48, y: 924, r: 26 }, { x: 144, y: 924, r: 26 }, { x: 240, y: 924, r: 26 },
    { x: 48, y: 1020, r: 26 }, { x: 144, y: 1020, r: 26 }, { x: 240, y: 1020, r: 26 },
    { x: 1296, y: 1020, r: 26 }, { x: 1392, y: 1020, r: 26 }, { x: 1488, y: 1020, r: 26 },
    { x: 1584, y: 1020, r: 26 }, { x: 1680, y: 1020, r: 26 }, { x: 1776, y: 1020, r: 26 },
    { x: 1872, y: 1020, r: 26 }, { x: 48, y: 540, r: 26 }, { x: 144, y: 540, r: 26 },
    { x: 240, y: 540, r: 26 }, { x: 48, y: 636, r: 26 }, { x: 144, y: 636, r: 26 },
    { x: 240, y: 636, r: 26 }, { x: 48, y: 732, r: 26 }, { x: 144, y: 732, r: 26 },
    { x: 240, y: 732, r: 26 }, { x: 1680, y: 60, r: 26 }, { x: 1776, y: 60, r: 26 },
    { x: 1872, y: 60, r: 26 }, { x: 1680, y: 156, r: 26 }, { x: 1776, y: 156, r: 26 },
    { x: 1872, y: 156, r: 26 }, { x: 1680, y: 252, r: 26 }, { x: 1776, y: 252, r: 26 },
    { x: 1872, y: 252, r: 26 }, { x: 1296, y: 732, r: 26 }, { x: 1392, y: 732, r: 26 },
    { x: 1488, y: 732, r: 26 }, { x: 1296, y: 828, r: 26 }, { x: 1392, y: 828, r: 26 },
    { x: 1488, y: 828, r: 26 }, { x: 144, y: 60, r: 26 }, { x: 240, y: 60, r: 26 },
    { x: 336, y: 60, r: 26 }, { x: 144, y: 156, r: 26 }, { x: 240, y: 156, r: 26 },
    { x: 336, y: 156, r: 26 }, { x: 432, y: 444, r: 26 }, { x: 528, y: 444, r: 26 },
    { x: 816, y: 252, r: 26 }, { x: 1200, y: 252, r: 26 }, { x: 1860, y: 960, r: 26 },
    { x: 1584, y: 156, r: 26 },
  ],
  waves: PLAN_FROSTSPALTE,
  balance: { hpMul: 1.12, goldMul: 1 },
};


export const MAPS: GameMap[] = [MAP_SPIRALHAIN, MAP_ASCHESCHLUCHT, MAP_FROSTSPALTE];

export function mapById(id: string): GameMap {
  return MAPS.find((m) => m.id === id) ?? MAP_SPIRALHAIN;
}

/** Die Kurven einer Karte, einmal gebaut und zwischengespeichert. */
const laneCache = new Map<string, LanePath[]>();

export function lanePaths(map: GameMap): LanePath[] {
  let hit = laneCache.get(map.id);
  if (!hit) {
    hit = map.lanes.map((l) => new LanePath(l));
    laneCache.set(map.id, hit);
  }
  return hit;
}

/** Der Herzkristall - das Ende aller Bahnen. */
export function goalOf(map: GameMap): Vec {
  const last = map.lanes[0][map.lanes[0].length - 1];
  return { x: last.x, y: last.y };
}

/** Wie breit ein Bauplatz ist - er ist ein Kreis, keine Kachel. */
export const SPOT_RADIUS = 42;

/** Welcher Bauplatz liegt unter diesem Punkt? -1, wenn keiner. */
export function spotAt(map: GameMap, x: number, y: number, slack = 14): number {
  let best = -1, bestD = (SPOT_RADIUS + slack) ** 2;
  for (let i = 0; i < map.spots.length; i++) {
    const s = map.spots[i];
    const d = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
