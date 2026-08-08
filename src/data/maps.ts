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
  /** Unwegsames Gelaende: Kreise, in denen nicht gebaut werden kann.
   *
   *  Ab v37 wird wieder frei gebaut - aber nicht ueberall. Fels, Wasser,
   *  Dickicht sperren Flaechen, und jeder Turm braucht seinen Platz. Das ist
   *  die eigentliche Entscheidung: nicht *ob* hier ein Platz ist, sondern
   *  wieviel Flaeche man wofuer hergibt. */
  rough: { x: number; y: number; r: number }[];
  /** Wo die Einfuehrung hinzeigt. */
  hint: Vec;
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
  rough: [
    { x: 1678, y: 1074, r: 120 }, { x: 1654, y: 644, r: 66 }, { x: 269, y: 1026, r: 125 },
    { x: 1056, y: 280, r: 126 }, { x: 1901, y: 486, r: 67 }, { x: 1882, y: 111, r: 125 },
    { x: 1363, y: 331, r: 68 }, { x: 1340, y: 530, r: 75 }, { x: 24, y: 700, r: 86 },
    { x: 95, y: 366, r: 92 }, { x: 1471, y: 1050, r: 63 }, { x: 1913, y: 1061, r: 103 },
    { x: 46, y: 1016, r: 91 }, { x: 677, y: 621, r: 100 }, { x: 1872, y: 722, r: 102 },
    { x: 537, y: 989, r: 122 }, { x: 16, y: 472, r: 64 }, { x: 742, y: 1052, r: 107 },
    { x: 959, y: 617, r: 125 }, { x: 1646, y: 99, r: 108 }, { x: 1710, y: 823, r: 113 },
    { x: 1244, y: 1079, r: 84 }, { x: 1045, y: 944, r: 78 }, { x: 1875, y: 371, r: 69 },
    { x: 1489, y: 874, r: 114 }, { x: 1744, y: 245, r: 69 },
  ],
  hint: { x: 516, y: 612 },
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
  rough: [
    { x: 721, y: 28, r: 91 }, { x: 1910, y: 921, r: 95 }, { x: 497, y: 1019, r: 118 },
    { x: 896, y: 66, r: 62 }, { x: 1380, y: 1070, r: 91 }, { x: 1695, y: 1032, r: 73 },
    { x: 1547, y: 468, r: 110 }, { x: 24, y: 700, r: 86 }, { x: 911, y: 275, r: 102 },
    { x: 1776, y: 27, r: 78 }, { x: 95, y: 366, r: 92 }, { x: 1096, y: 33, r: 89 },
    { x: 826, y: 1053, r: 107 }, { x: 1330, y: 460, r: 85 }, { x: 1339, y: 9, r: 91 },
    { x: 1565, y: 1059, r: 88 }, { x: 861, y: 640, r: 86 }, { x: 353, y: 332, r: 83 },
    { x: 1907, y: 253, r: 87 }, { x: 385, y: 661, r: 101 }, { x: 1057, y: 1038, r: 85 },
    { x: 1214, y: 1074, r: 72 }, { x: 884, y: 487, r: 70 }, { x: 232, y: 360, r: 70 },
    { x: 1829, y: 1059, r: 88 }, { x: 665, y: 1075, r: 81 },
  ],
  hint: { x: 1212, y: 396 },
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
  rough: [
    { x: 269, y: 1026, r: 125 }, { x: 117, y: 24, r: 98 }, { x: 1366, y: 776, r: 129 },
    { x: 748, y: 233, r: 79 }, { x: 1835, y: 208, r: 121 }, { x: 803, y: 1011, r: 76 },
    { x: 1828, y: 1058, r: 110 }, { x: 582, y: 697, r: 107 }, { x: 66, y: 912, r: 111 },
    { x: 1031, y: 1076, r: 129 }, { x: 105, y: 587, r: 103 }, { x: 16, y: 472, r: 64 },
    { x: 1646, y: 99, r: 108 }, { x: 1615, y: 279, r: 91 }, { x: 590, y: 355, r: 124 },
    { x: 1907, y: 448, r: 114 }, { x: 941, y: 206, r: 123 }, { x: 577, y: 1076, r: 84 },
    { x: 14, y: 697, r: 68 }, { x: 4, y: 1077, r: 81 }, { x: 369, y: 16, r: 106 },
    { x: 808, y: 361, r: 64 }, { x: 1917, y: 781, r: 96 }, { x: 105, y: 416, r: 69 },
    { x: 489, y: 525, r: 77 }, { x: 1587, y: 685, r: 89 },
  ],
  hint: { x: 1020, y: 636 },
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

/** Mindestabstand jedes Turms zum Weg. Naeher darf nichts stehen - sonst
 *  klebt der Turm auf der Strasse und verdeckt die Gegner. */
export const PATH_CLEARANCE = 30;

/** Bauen wird auf ein feines Raster gefangen. Nicht als Spielregel, sondern
 *  damit die Tuerme sauber stehen statt krumm - man merkt es nicht, aber man
 *  sieht es. */
export const BUILD_SNAP = 12;

export const snap = (v: number): number => Math.round(v / BUILD_SNAP) * BUILD_SNAP;
