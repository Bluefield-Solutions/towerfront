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
  /** Bringt das Kartenbild den Weg schon mit?
   *
   *  Dann zeichnet die Engine ihn nicht mehr. Das war der Sinn der Uebung:
   *  drei Bildsprachen auf einem Bild - weich gezeichneter Untergrund,
   *  flaechig gezeichneter Weg, gerenderte Figuren - werden zu zweien. */
  pfadImBild?: boolean;
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
      { x: -80, y: 180, w: 46 }, { x: 148, y: 176, w: 50 }, { x: 252, y: 307, w: 60 },
      { x: 307, y: 455, w: 68 }, { x: 312, y: 617, w: 74 }, { x: 474, y: 660, w: 64 },
      { x: 638, y: 693, w: 70 }, { x: 789, y: 632, w: 72 }, { x: 855, y: 483, w: 52 },
      { x: 1005, y: 413, w: 54 }, { x: 1168, y: 381, w: 64 }, { x: 1320, y: 448, w: 46 },
      { x: 1447, y: 558, w: 46 }, { x: 1580, y: 656, w: 68 }, { x: 1747, y: 671, w: 90 },
      { x: 1842, y: 547, w: 82 },
    ],
  ],
  rough: [
    { x: 1186, y: 821, r: 165 }, { x: 764, y: 125, r: 142 }, { x: 1565, y: 179, r: 121 },
    { x: 247, y: 862, r: 82 }, { x: 1750, y: 356, r: 39 }, { x: 829, y: 896, r: 29 },
    { x: 1069, y: 1004, r: 27 }, { x: 1433, y: 953, r: 25 },
  ],
  pfadImBild: true,
  hint: { x: 260, y: 100 },
  props: [
    { x: 1584, y: 156, r: 26 }, { x: 1680, y: 252, r: 26 }, { x: 48, y: 540, r: 26 },
    { x: 144, y: 828, r: 26 }, { x: 816, y: 60, r: 26 }, { x: 624, y: 828, r: 26 },
  ],
  waves: PLAN_SPIRALHAIN,
  balance: { hpMul: 0.85, goldMul: 1.15 },
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
      { x: -80, y: 200, w: 80 }, { x: 200, y: 240, w: 77 }, { x: 430, y: 380, w: 50 },
      { x: 560, y: 560, w: 50 },
      { x: 760, y: 690, w: 50 }, { x: 1060, y: 760, w: 77 }, { x: 1380, y: 720, w: 73 },
      { x: 1620, y: 560, w: 50 }, { x: 1700, y: 330, w: 73 }, { x: 1500, y: 180, w: 77 },
      { x: 1200, y: 200, w: 73 }, { x: 1010, y: 350, w: 50 }, { x: 1040, y: 540, w: 50 },
    ],
    [
      { x: -80, y: 880, w: 80 }, { x: 180, y: 850, w: 77 }, { x: 400, y: 720, w: 50 },
      { x: 560, y: 560, w: 50 },
      { x: 760, y: 690, w: 50 }, { x: 1060, y: 760, w: 77 }, { x: 1380, y: 720, w: 73 },
      { x: 1620, y: 560, w: 50 }, { x: 1700, y: 330, w: 73 }, { x: 1500, y: 180, w: 77 },
      { x: 1200, y: 200, w: 73 }, { x: 1010, y: 350, w: 50 }, { x: 1040, y: 540, w: 50 },
    ],
  ],
  rough: [
    { x: 693, y: 57, r: 48 }, { x: 1889, y: 1051, r: 76 }, { x: 876, y: 117, r: 51 },
    { x: 1163, y: 1000, r: 60 }, { x: 728, y: 1076, r: 73 }, { x: 1509, y: 1034, r: 63 },
    { x: 1823, y: 772, r: 57 }, { x: 1452, y: 451, r: 64 }, { x: 676, y: 222, r: 96 },
    { x: 357, y: 29, r: 45 }, { x: 163, y: 634, r: 53 }, { x: 208, y: 12, r: 56 },
    { x: 1667, y: 893, r: 78 }, { x: 803, y: 364, r: 50 },
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
      { x: -80, y: 300, w: 50 }, { x: 200, y: 300, w: 50 }, { x: 420, y: 420, w: 72 },
      { x: 560, y: 640, w: 50 }, { x: 800, y: 800, w: 50 }, { x: 1080, y: 810, w: 72 },
      { x: 1300, y: 690, w: 50 },
      { x: 1520, y: 520, w: 50 }, { x: 1560, y: 300, w: 72 }, { x: 1360, y: 190, w: 50 },
      { x: 1120, y: 260, w: 50 }, { x: 1060, y: 470, w: 72 },
    ],
    [
      { x: 700, y: -80, w: 50 }, { x: 720, y: 180, w: 50 }, { x: 900, y: 330, w: 72 },
      { x: 1080, y: 520, w: 50 }, { x: 1300, y: 690, w: 50 },
      { x: 1520, y: 520, w: 72 }, { x: 1560, y: 300, w: 50 }, { x: 1360, y: 190, w: 50 },
      { x: 1120, y: 260, w: 72 }, { x: 1060, y: 470, w: 50 },
    ],
  ],
  rough: [
    { x: 458, y: 987, r: 81 }, { x: 1780, y: 53, r: 95 }, { x: 1889, y: 1051, r: 76 },
    { x: 1163, y: 1000, r: 60 }, { x: 728, y: 1076, r: 73 }, { x: 1509, y: 1034, r: 63 },
    { x: 1823, y: 772, r: 57 }, { x: 109, y: 807, r: 70 }, { x: 357, y: 29, r: 45 },
    { x: 259, y: 826, r: 50 }, { x: 163, y: 634, r: 53 }, { x: 1899, y: 265, r: 70 },
    { x: 1309, y: 999, r: 70 }, { x: 208, y: 12, r: 56 },
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
  balance: { hpMul: 0.85, goldMul: 1.05 },
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
