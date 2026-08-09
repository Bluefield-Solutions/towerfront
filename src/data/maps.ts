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
  /** Die Lichtfarbe der Karte.
   *
   *  Ein Gegenstand, der wirklich auf diesem Boden steht, bekommt etwas von
   *  dessen Beleuchtung ab - Streulicht faerbt ihn mit. Ohne das wirkt jede
   *  Figur ausgeschnitten, egal wie gut ihr Schatten ist. Gemessen lagen
   *  unsere Tuerme 0,14 in der Farbtemperatur neben dem Boden; erlaubt sind
   *  0,10. */
  sonne: string;
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
  /** Der Wellenplan dieser Karte. */
  waves: Wave[];
  /** Feinausgleich der Karte. Siehe Konzept, Abschnitt zur Balance. */
  balance: { hpMul: number; goldMul: number };
}


const MOOS: MapPalette = {
  terrain: '#173D3A', terrainHi: '#215A50', terrainLo: '#102B2B',
  path: '#C9A86A', pathEdge: '#9C7F49',
  rock: '#2A3348', rockHi: '#3D4A66',
  mood: '#BEE2FF', haze: '#B4D6E2', rim: '#DCEEFF', sonne: '#FFC26A',
};

const LAUB: MapPalette = {
  terrain: '#2E2A1E', terrainHi: '#4A4228', terrainLo: '#1B1810',
  path: '#CBB48A', pathEdge: '#8E7A52',
  rock: '#39332A', rockHi: '#5C5242',
  mood: '#FFD9A8', haze: '#B8A882', rim: '#FFE9C8', sonne: '#FFB661',
};

const FROST: MapPalette = {
  terrain: '#22364F', terrainHi: '#33557A', terrainLo: '#16233A',
  path: '#E4EEF6', pathEdge: '#A6BACD',
  rock: '#2C3E5B', rockHi: '#44608A',
  mood: '#D6ECFF', haze: '#CFE6F5', rim: '#EAF6FF', sonne: '#FFD9A0',
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
      { x: 1447, y: 558, w: 46 }, { x: 1580, y: 656, w: 68 }, { x: 1751, y: 666, w: 82 },
    ],
  ],
  rough: [
    { x: 1186, y: 821, r: 165 }, { x: 764, y: 125, r: 142 }, { x: 1565, y: 179, r: 121 },
    { x: 247, y: 862, r: 82 }, { x: 1750, y: 356, r: 39 }, { x: 829, y: 896, r: 29 },
    { x: 1069, y: 1004, r: 27 }, { x: 1433, y: 953, r: 25 },
  ],
  pfadImBild: true,
  hint: { x: 300, y: 120 },
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
      { x: -131, y: 1026, w: 40 }, { x: 27, y: 1054, w: 40 }, { x: 124, y: 947, w: 40 },
      { x: 192, y: 809, w: 54 }, { x: 346, y: 770, w: 54 }, { x: 413, y: 629, w: 62 },
      { x: 571, y: 650, w: 40 }, { x: 610, y: 528, w: 80 }, { x: 762, y: 480, w: 48 },
      { x: 907, y: 412, w: 44 }, { x: 1057, y: 358, w: 48 }, { x: 1216, y: 354, w: 58 },
      { x: 1365, y: 410, w: 56 }, { x: 1646, y: 564, w: 40 },
    ],
    [
      { x: -130, y: 1075, w: 40 }, { x: 95, y: 1021, w: 58 }, { x: 132, y: 907, w: 56 },
      { x: 192, y: 809, w: 54 }, { x: 310, y: 787, w: 58 }, { x: 378, y: 699, w: 60 },
      { x: 452, y: 635, w: 126 }, { x: 483, y: 433, w: 52 }, { x: 1365, y: 410, w: 56 },
      { x: 1646, y: 564, w: 40 },
    ],
  ],
  rough: [
    { x: 1681, y: 874, r: 128 }, { x: 957, y: 135, r: 106 }, { x: 1737, y: 293, r: 104 },
    { x: 1172, y: 993, r: 83 }, { x: 1705, y: 30, r: 74 }, { x: 926, y: 950, r: 56 },
    { x: 141, y: 362, r: 54 }, { x: 652, y: 324, r: 53 }, { x: 209, y: 621, r: 52 },
    { x: 1112, y: 812, r: 50 },
    { x: 285, y: 368, r: 36 },
  ],
  pfadImBild: true,
  hint: { x: 220, y: 200 },
  waves: PLAN_ASCHESCHLUCHT,
  balance: { hpMul: 1.06, goldMul: 1.05 },
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
      { x: 4, y: -24, w: 40 }, { x: 6, y: 141, w: 40 }, { x: 6, y: 255, w: 40 },
      { x: 5, y: 316, w: 69 }, { x: 8, y: 356, w: 68 }, { x: 20, y: 391, w: 42 },
      { x: 40, y: 424, w: 40 }, { x: 66, y: 453, w: 40 }, { x: 95, y: 473, w: 48 },
      { x: 128, y: 482, w: 47 }, { x: 164, y: 481, w: 40 }, { x: 203, y: 473, w: 40 },
      { x: 240, y: 460, w: 40 }, { x: 275, y: 446, w: 40 }, { x: 308, y: 433, w: 40 },
      { x: 342, y: 420, w: 40 }, { x: 378, y: 402, w: 40 }, { x: 413, y: 376, w: 40 },
      { x: 443, y: 345, w: 40 }, { x: 469, y: 314, w: 40 }, { x: 493, y: 287, w: 40 },
      { x: 522, y: 269, w: 45 }, { x: 557, y: 262, w: 40 }, { x: 594, y: 268, w: 40 },
      { x: 628, y: 284, w: 40 }, { x: 659, y: 303, w: 40 }, { x: 692, y: 316, w: 40 },
      { x: 728, y: 321, w: 40 }, { x: 766, y: 321, w: 40 }, { x: 802, y: 321, w: 40 },
      { x: 832, y: 328, w: 40 }, { x: 857, y: 347, w: 40 }, { x: 880, y: 377, w: 40 },
      { x: 901, y: 411, w: 40 }, { x: 920, y: 446, w: 40 }, { x: 942, y: 481, w: 43 },
      { x: 971, y: 513, w: 40 }, { x: 1004, y: 537, w: 40 }, { x: 1040, y: 552, w: 50 },
      { x: 1076, y: 561, w: 40 }, { x: 1112, y: 571, w: 50 }, { x: 1148, y: 586, w: 57 },
      { x: 1184, y: 601, w: 40 }, { x: 1218, y: 607, w: 40 }, { x: 1248, y: 600, w: 50 },
      { x: 1273, y: 578, w: 58 }, { x: 1295, y: 548, w: 56 }, { x: 1319, y: 521, w: 42 },
      { x: 1348, y: 504, w: 40 }, { x: 1387, y: 497, w: 40 }, { x: 1441, y: 498, w: 53 },
      { x: 1525, y: 513, w: 51 }, { x: 1638, y: 541, w: 45 },
    ],
    [
      { x: -44, y: 1076, w: 40 }, { x: 302, y: 1070, w: 40 }, { x: 523, y: 1060, w: 40 },
      { x: 621, y: 1048, w: 48 }, { x: 664, y: 1032, w: 40 }, { x: 691, y: 1010, w: 55 },
      { x: 704, y: 983, w: 40 }, { x: 701, y: 950, w: 40 }, { x: 687, y: 913, w: 40 },
      { x: 666, y: 874, w: 45 }, { x: 642, y: 840, w: 67 }, { x: 616, y: 814, w: 42 },
      { x: 586, y: 796, w: 48 }, { x: 554, y: 779, w: 56 }, { x: 521, y: 754, w: 40 },
      { x: 490, y: 721, w: 40 }, { x: 465, y: 685, w: 40 }, { x: 452, y: 649, w: 40 },
      { x: 454, y: 616, w: 40 }, { x: 469, y: 592, w: 42 }, { x: 497, y: 579, w: 43 },
      { x: 532, y: 574, w: 40 }, { x: 571, y: 571, w: 40 }, { x: 608, y: 567, w: 43 },
      { x: 644, y: 559, w: 43 }, { x: 680, y: 543, w: 61 }, { x: 716, y: 522, w: 40 },
      { x: 752, y: 505, w: 48 }, { x: 788, y: 495, w: 40 }, { x: 824, y: 492, w: 40 },
      { x: 860, y: 495, w: 50 }, { x: 896, y: 500, w: 40 }, { x: 932, y: 509, w: 43 },
      { x: 968, y: 523, w: 40 }, { x: 1004, y: 539, w: 40 }, { x: 1040, y: 552, w: 50 },
      { x: 1076, y: 561, w: 40 }, { x: 1112, y: 571, w: 50 }, { x: 1148, y: 586, w: 57 },
      { x: 1184, y: 601, w: 40 }, { x: 1218, y: 607, w: 40 }, { x: 1248, y: 600, w: 50 },
      { x: 1273, y: 578, w: 58 }, { x: 1295, y: 548, w: 56 }, { x: 1319, y: 521, w: 42 },
      { x: 1348, y: 504, w: 40 }, { x: 1387, y: 497, w: 40 }, { x: 1441, y: 498, w: 53 },
      { x: 1525, y: 513, w: 51 }, { x: 1638, y: 541, w: 45 },
    ],
  ],
  rough: [
    { x: 1582, y: 981, r: 134 }, { x: 1647, y: 195, r: 133 }, { x: 828, y: 808, r: 112 },
    { x: 494, y: 243, r: 83 }, { x: 924, y: 254, r: 52 }, { x: 1845, y: 822, r: 40 },
    { x: 1012, y: 950, r: 37 }, { x: 1770, y: 472, r: 34 }, { x: 194, y: 915, r: 33 },
    { x: 312, y: 979, r: 32 }, { x: 1792, y: 387, r: 31 },
  ],
  pfadImBild: true,
  hint: { x: 220, y: 200 },
  waves: PLAN_FROSTSPALTE,
  balance: { hpMul: 1.1, goldMul: 1.02 },
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
