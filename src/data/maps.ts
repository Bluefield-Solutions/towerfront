import type { Vec } from '../core/math';
import { LanePath, type PathPoint } from '../core/path';
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
  lanes: PathPoint[][];
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
      { x: -80, y: 210, w: 35 }, { x: 210, y: 226, w: 33 }, { x: 520, y: 300, w: 30 },
      { x: 760, y: 430, w: 21 }, { x: 980, y: 470, w: 20 }, { x: 1280, y: 396, w: 29 },
      { x: 1560, y: 300, w: 32 }, { x: 1760, y: 430, w: 31 }, { x: 1740, y: 700, w: 27 },
      { x: 1460, y: 850, w: 22 }, { x: 1080, y: 880, w: 21 }, { x: 720, y: 830, w: 27 },
      { x: 470, y: 700, w: 31 }, { x: 430, y: 500, w: 32 }, { x: 620, y: 620, w: 29 },
      { x: 900, y: 700, w: 25 }, { x: 1130, y: 640, w: 24 },
    ],
  ],
  rough: [
    { x: 1780, y: 53, r: 119 }, { x: 693, y: 57, r: 60 }, { x: 1889, y: 1051, r: 95 },
    { x: 924, y: 99, r: 111 }, { x: 304, y: 944, r: 102 }, { x: 1509, y: 1034, r: 79 },
    { x: 109, y: 807, r: 88 }, { x: 357, y: 29, r: 56 }, { x: 163, y: 634, r: 66 },
    { x: 1466, y: 575, r: 77 }, { x: 208, y: 12, r: 70 }, { x: 1262, y: 244, r: 59 },
    { x: 1628, y: 521, r: 75 }, { x: 1334, y: 74, r: 118 }, { x: 1872, y: 764, r: 57 },
    { x: 917, y: 332, r: 67 }, { x: 1912, y: 251, r: 72 }, { x: 1299, y: 729, r: 63 },
    { x: 1542, y: 94, r: 66 }, { x: 136, y: 973, r: 63 }, { x: 738, y: 255, r: 61 },
    { x: 729, y: 1029, r: 56 }, { x: 330, y: 783, r: 76 }, { x: 1317, y: 1041, r: 70 },
  ],
  hint: { x: 60, y: 60 },
  props: [
    { x: 1584, y: 156, r: 26 }, { x: 1680, y: 252, r: 26 }, { x: 48, y: 540, r: 26 },
    { x: 144, y: 828, r: 26 }, { x: 816, y: 60, r: 26 }, { x: 624, y: 828, r: 26 },
  ],
  waves: PLAN_SPIRALHAIN,
  balance: { hpMul: 0.85, goldMul: 1.2 },
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
      { x: -80, y: 200, w: 32 }, { x: 200, y: 240, w: 31 }, { x: 430, y: 380, w: 25 },
      { x: 560, y: 560, w: 20 },
      { x: 760, y: 690, w: 27 }, { x: 1060, y: 760, w: 31 }, { x: 1380, y: 720, w: 29 },
      { x: 1620, y: 560, w: 24 }, { x: 1700, y: 330, w: 29 }, { x: 1500, y: 180, w: 31 },
      { x: 1200, y: 200, w: 29 }, { x: 1010, y: 350, w: 25 }, { x: 1040, y: 540, w: 27 },
    ],
    [
      { x: -80, y: 880, w: 32 }, { x: 180, y: 850, w: 31 }, { x: 400, y: 720, w: 26 },
      { x: 560, y: 560, w: 20 },
      { x: 760, y: 690, w: 27 }, { x: 1060, y: 760, w: 31 }, { x: 1380, y: 720, w: 29 },
      { x: 1620, y: 560, w: 24 }, { x: 1700, y: 330, w: 29 }, { x: 1500, y: 180, w: 31 },
      { x: 1200, y: 200, w: 29 }, { x: 1010, y: 350, w: 25 }, { x: 1040, y: 540, w: 27 },
    ],
  ],
  rough: [
    { x: 693, y: 57, r: 60 }, { x: 1889, y: 1051, r: 95 }, { x: 876, y: 117, r: 64 },
    { x: 1163, y: 1000, r: 75 }, { x: 728, y: 1076, r: 91 }, { x: 1509, y: 1034, r: 79 },
    { x: 1823, y: 772, r: 71 }, { x: 1452, y: 451, r: 80 }, { x: 676, y: 222, r: 120 },
    { x: 357, y: 29, r: 56 }, { x: 163, y: 634, r: 66 }, { x: 1310, y: 327, r: 56 },
    { x: 1814, y: 148, r: 80 }, { x: 208, y: 12, r: 70 }, { x: 1667, y: 893, r: 97 },
    { x: 803, y: 364, r: 62 }, { x: 941, y: 905, r: 79 }, { x: 1912, y: 251, r: 72 },
    { x: 1331, y: 1000, r: 69 }, { x: 1287, y: 526, r: 64 }, { x: 277, y: 495, r: 77 },
    { x: 711, y: 876, r: 62 }, { x: 363, y: 941, r: 65 }, { x: 563, y: 906, r: 70 },
  ],
  hint: { x: 60, y: 60 },
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
  balance: { hpMul: 0.85, goldMul: 1.2 },
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
      { x: -80, y: 300, w: 27 }, { x: 200, y: 300, w: 26 }, { x: 420, y: 420, w: 19 },
      { x: 560, y: 640, w: 19 }, { x: 800, y: 800, w: 24 }, { x: 1080, y: 810, w: 26 },
      { x: 1300, y: 690, w: 19 },
      { x: 1520, y: 520, w: 25 }, { x: 1560, y: 300, w: 27 }, { x: 1360, y: 190, w: 26 },
      { x: 1120, y: 260, w: 24 }, { x: 1060, y: 470, w: 25 },
    ],
    [
      { x: 700, y: -80, w: 27 }, { x: 720, y: 180, w: 25 }, { x: 900, y: 330, w: 20 },
      { x: 1080, y: 520, w: 19 }, { x: 1300, y: 690, w: 19 },
      { x: 1520, y: 520, w: 25 }, { x: 1560, y: 300, w: 27 }, { x: 1360, y: 190, w: 26 },
      { x: 1120, y: 260, w: 24 }, { x: 1060, y: 470, w: 25 },
    ],
  ],
  rough: [
    { x: 458, y: 987, r: 101 }, { x: 1780, y: 53, r: 119 }, { x: 1889, y: 1051, r: 95 },
    { x: 876, y: 117, r: 64 }, { x: 1163, y: 1000, r: 75 }, { x: 728, y: 1076, r: 91 },
    { x: 1509, y: 1034, r: 79 }, { x: 1699, y: 224, r: 76 }, { x: 1823, y: 772, r: 71 },
    { x: 109, y: 807, r: 88 }, { x: 357, y: 29, r: 56 }, { x: 259, y: 826, r: 62 },
    { x: 783, y: 581, r: 59 }, { x: 163, y: 634, r: 66 }, { x: 1899, y: 265, r: 87 },
    { x: 1309, y: 999, r: 88 }, { x: 208, y: 12, r: 70 }, { x: 1667, y: 893, r: 97 },
    { x: 913, y: 646, r: 69 }, { x: 1373, y: 396, r: 70 }, { x: 1287, y: 526, r: 64 },
    { x: 1542, y: 94, r: 66 }, { x: 1836, y: 562, r: 85 }, { x: 277, y: 495, r: 77 },
  ],
  hint: { x: 60, y: 60 },
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
  balance: { hpMul: 0.9, goldMul: 1.12 },
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
