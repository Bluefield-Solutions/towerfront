import type { Vec } from '../core/math';
import { LanePath, type PathPoint } from '../core/path';
import {
  PLAN_SPIRALHAIN, PLAN_ASCHESCHLUCHT, PLAN_FROSTSPALTE, type Wave,
} from './waves';

/** Was ueber einer Karte vom Himmel kommt (D2).
 *
 *  Drei Karten, drei Stimmungen - und der Unterschied ist nicht nur Zierde:
 *  die drei Orte sahen sich bisher vor allem im Bodenton unaehnlich, und ein
 *  Ton allein traegt nicht weit, wenn das Feld ohnehin dunkel ist. Etwas,
 *  das sich BEWEGT, sagt "anderer Ort" schneller als eine Farbe es kann. */
export type WetterArt = 'regen' | 'asche' | 'schnee' | 'keines';

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
  /** Was ueber dieser Karte vom Himmel kommt, und in welchem Ton (D2).
   *
   *  Die drei Orte unterschieden sich bis v173 vor allem im Bodenton - und
   *  ein Ton allein traegt nicht weit, wenn das Feld ohnehin dunkel ist.
   *  Etwas, das sich BEWEGT, sagt "anderer Ort" schneller als eine Farbe.
   *
   *  `keines` ist erlaubt und gehoert dazu: eine vierte Karte muss nicht
   *  Wetter haben, nur weil die ersten drei es haben. */
  wetter: WetterArt;
  wetterTon: string;
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
  /** Die Lichtfarbe der Karte.
   *
   *  Ein Gegenstand, der wirklich auf diesem Boden steht, bekommt etwas von
   *  dessen Beleuchtung ab - Streulicht faerbt ihn mit. Ohne das wirkt jede
   *  Figur ausgeschnitten, egal wie gut ihr Schatten ist. Gemessen lagen
   *  unsere Tuerme 0,14 in der Farbtemperatur neben dem Boden; erlaubt sind
   *  0,10. */
  sonne: string;
}

/** Ein Fleck unwegsamen Gelaendes.
 *
 *  `art` und `farbe` sind GEMESSEN, nicht geschrieben: `npm run gelaende`
 *  liest sie aus dem Untergrundbild und `npm run gelaendetor` prueft sie bei
 *  jedem Lauf dagegen. Von Hand einsortiert waeren sie zweimal falsch -
 *  einmal, weil es niemand nachpruefen koennte, und einmal, weil die vierte
 *  Karte wieder von Hand einzusortieren waere.
 *
 *  Die drei Arten sind nicht Fels, Dickicht und Wasser. Der Kontaktbogen
 *  (`bilder/gelaende.png`) zeigt, warum: diese Kreise sind Bausperren ueber
 *  Wegen, Mauern, Lavarissen und Schneefeldern, keine Gelaendestuecke. Was
 *  das Bild wirklich hergibt, ist, wie sich der Untergrund ANFUEHLT:
 *
 *   `hart`    heller als seine Karte - Pflaster, Mauer, blanker Stein.
 *   `kalt`    blauer als seine kalte Karte - Eis, Schmelzwasser.
 *   `locker`  alles Uebrige - Asche, Lehm, Laub. */
export interface RoughSpot {
  x: number; y: number; r: number;
  art: 'hart' | 'kalt' | 'locker';
  /** Die mittlere Farbe des Flecks im Kartenbild. */
  farbe: string;
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
  rough: RoughSpot[];
  /** Wo die Einfuehrung hinzeigt. */
  hint: Vec;
  /** Die Mitte der gemauerten Rundplattform im Untergrundbild.
   *
   *  Jede Karte bringt eine mit: Steinkranz, konzentrische Pflasterung, der
   *  Weg laeuft darauf zu. Das ist der Ort, den der Kuenstler fuer das Ziel
   *  gebaut hat - und bis v126 hat das Spiel ihn ignoriert. `goalOf` nahm den
   *  letzten Bahnpunkt, und der liegt am RAND der Platte: 102 Weltpunkte
   *  daneben auf dem Spiralhain, 164 auf der Ascheschlucht, 99 auf der
   *  Frostspalte. Ein Turm ist 96 Weltpunkte breit.
   *
   *  Die Kristallfestung stand deshalb oben links auf dem Rand statt in der
   *  Mitte, und der Weg endete im Nichts daneben.
   *
   *  Sie gilt fuer BILD UND MODELL: `lanePaths` zieht den letzten
   *  Kontrollpunkt jeder Bahn hierher, `goalOf` gibt diesen Punkt zurueck.
   *  Die Gegner laufen also bis in die Mitte der Festung.
   *
   *  In v130 galt sie zunaechst nur fuer das Bild, und das war eine bewusste
   *  Zwischenstufe: die Bahnen werden dadurch 3 bis 8 % laenger und aendern
   *  am Ende ihre FORM - die Tuerme bekommen mehr Schuss. Die Simulation
   *  meldete es sofort, die Frostturm-Zweige liefen von 31:36 auf 42:28
   *  auseinander und die Verluste fielen von drei Wellen auf zwei (T15). Ein
   *  Bildfehler durfte keine Balancerunde ausloesen, also wurde erst das Bild
   *  gerichtet und die Balance in v131 eigens nachgezogen.
   *
   *  Damit die Zahl nicht veraltet, misst `npm run zielplatte` sie im
   *  Untergrundbild NACH und schlaegt an, wenn beide auseinanderlaufen - eine
   *  aufgeschriebene Zahl ohne Nachpruefung ist in diesem Verzeichnis schon
   *  vier Runden lang falsch weitergelaufen. */
  ziel?: Vec;
  /** Bringt das Kartenbild den Weg schon mit?
   *
   *  Dann zeichnet die Engine ihn nicht mehr. Das war der Sinn der Uebung:
   *  drei Bildsprachen auf einem Bild - weich gezeichneter Untergrund,
   *  flaechig gezeichneter Weg, gerenderte Figuren - werden zu zweien. */
  pfadImBild?: boolean;
  /** Ein Tor, das einen Zuweg im Takt sperrt (C24).
   *
   *  Der Punkt ist nicht die Sperre, sondern was sie erzwingt: der Druck
   *  wandert auf die anderen Bahnen, und wer alles auf den belebtesten Zuweg
   *  gestellt hat, steht ploetzlich falsch. Plants vs. Zombies oeffnet und
   *  schliesst im Verlauf ganze Bahnen, Kingdom Rush sperrt Zuwege - beide
   *  aus demselben Grund.
   *
   *  Gesperrt wird nur das ERSCHEINEN, nicht der Weg selbst: wer schon
   *  unterwegs ist, laeuft zu Ende. Eine Bahn mitten im Lauf zu schliessen
   *  hiesse, Gegner umzuleiten - und ein Gegner hat als einzige
   *  Zustandsgroesse seine zurueckgelegte Strecke auf GENAU DIESER Kurve.
   *  Umleiten waere ein anderes Spiel, nicht eine andere Karte. */
  tor?: {
    /** Welche Bahn. Zaehlt ab null. */
    bahn: number;
    /** Sekunden zu, dann Sekunden auf - der Takt beginnt mit jeder Welle neu,
     *  damit er planbar bleibt. */
    zu: number;
    auf: number;
  };
  /** Der Wellenplan dieser Karte. */
  waves: Wave[];
  /** Feinausgleich der Karte. Siehe Konzept, Abschnitt zur Balance. */
  balance: { hpMul: number; goldMul: number };
}


const MOOS: MapPalette = {
  terrain: '#173D3A', terrainHi: '#215A50', terrainLo: '#102B2B',
  path: '#C9A86A', pathEdge: '#9C7F49',
  rock: '#2A3348', rockHi: '#3D4A66',
  mood: '#BEE2FF', haze: '#B4D6E2', sonne: '#FFC26A',
  // Spiralhain: Nieselregen. Moos steht nicht ohne Wasser.
  wetter: 'regen', wetterTon: '#CFE6F2',
};

const LAUB: MapPalette = {
  terrain: '#2E2A1E', terrainHi: '#4A4228', terrainLo: '#1B1810',
  path: '#CBB48A', pathEdge: '#8E7A52',
  rock: '#39332A', rockHi: '#5C5242',
  mood: '#FFD9A8', haze: '#B8A882', sonne: '#FFB661',
  // Ascheschlucht: Aschefall, warm und langsam. Der Name ist das Wetter.
  wetter: 'asche', wetterTon: '#E8C79A',
};

const FROST: MapPalette = {
  terrain: '#22364F', terrainHi: '#33557A', terrainLo: '#16233A',
  path: '#E4EEF6', pathEdge: '#A6BACD',
  rock: '#2C3E5B', rockHi: '#44608A',
  mood: '#D6ECFF', haze: '#CFE6F5', sonne: '#FFD9A0',
  // Frostspalte: Schneetreiben, seitlich verweht.
  wetter: 'schnee', wetterTon: '#EFF7FF',
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
      { x: 523, y: 1157, w: 40 }, { x: 572, y: 1125, w: 45.2188448601464 }, { x: 616, y: 1095, w: 40 },
      { x: 635, y: 1077, w: 63 }, { x: 641, y: 1055, w: 75 }, { x: 643, y: 1021, w: 79 },
      { x: 645, y: 983, w: 81 }, { x: 653, y: 949, w: 72 }, { x: 675, y: 925, w: 65 },
      { x: 708, y: 910, w: 66 }, { x: 745, y: 903, w: 60 }, { x: 785, y: 896, w: 59 },
      { x: 819, y: 879, w: 62 }, { x: 841, y: 855, w: 75 }, { x: 866, y: 834, w: 58 },
      { x: 900, y: 823, w: 59 }, { x: 938, y: 817, w: 59 }, { x: 977, y: 813, w: 59 },
      { x: 1014, y: 806, w: 59 }, { x: 1043, y: 787, w: 69 }, { x: 1059, y: 758, w: 77 },
      { x: 1076, y: 730, w: 61 }, { x: 1105, y: 712, w: 55 }, { x: 1141, y: 704, w: 59 },
      { x: 1181, y: 701, w: 59 }, { x: 1221, y: 697, w: 59 }, { x: 1255, y: 686, w: 54 },
      { x: 1274, y: 662, w: 63 }, { x: 1286, y: 632, w: 76 }, { x: 1302, y: 600, w: 67 },
      { x: 1322, y: 569, w: 70 }, { x: 1347, y: 543, w: 64 }, { x: 1381, y: 524, w: 59 },
      { x: 1416, y: 506, w: 54 }, { x: 1450, y: 485, w: 59 }, { x: 1484, y: 468, w: 62 },
      { x: 1526, y: 463, w: 63 }, { x: 1585, y: 473, w: 54 }, { x: 1645, y: 488, w: 58 },
      { x: 1675, y: 493, w: 81 }, { x: 1691, y: 488, w: 81 }, { x: 1704, y: 480, w: 81 },
    ],
  ],
  rough: [
    { x: 1186, y: 821, r: 165, art: 'locker', farbe: '#5b320e' },
    { x: 764, y: 125, r: 142, art: 'locker', farbe: '#643c15' },
    { x: 1565, y: 179, r: 121, art: 'locker', farbe: '#472304' },
    { x: 247, y: 862, r: 82, art: 'locker', farbe: '#492405' },
    { x: 1750, y: 356, r: 39, art: 'locker', farbe: '#532704' },
    { x: 829, y: 896, r: 29, art: 'hart', farbe: '#8a683d' },
    { x: 1069, y: 1004, r: 27, art: 'locker', farbe: '#3a2003' },
    { x: 1433, y: 953, r: 25, art: 'locker', farbe: '#2e1c07' },
  ],
  pfadImBild: true,
  hint: { x: 200, y: 200 },
  ziel: { x: 1734, y: 506 },   // gemessen mit `npm run zielplatte`
  waves: PLAN_SPIRALHAIN,
  balance: { hpMul: 0.85, goldMul: 1.15 },
};


/** Karte 2 "Ascheschlucht": Drei Zuwege, die sich auf halbem Weg vereinen.
 *  Vor der Gabelung muss man sich entscheiden, hinter ihr zahlt jede Stellung
 *  doppelt - das ist die eigentliche Frage dieser Karte. */
export const MAP_ASCHESCHLUCHT: GameMap = {
  id: 'ascheschlucht',
  // Der Name folgt dem BILD, nicht umgekehrt.
  //
  // Bis v138 hiess diese Karte im Quelltext `ascheschlucht`, auf dem
  // Bildschirm "Laubschlucht" und zeigte ein Aschefeld mit gluehenden
  // Lavarissen. Drei Wahrheiten ueber denselben Ort - und der sichtbarste
  // Einzelposten der Beschwerde "das wirkt zusammengewuerfelt". Die Kennung
  // bleibt, sie steht in gespeicherten Fortschritten.
  name: 'Ascheschlucht',
  // Kein Zahlwort im Text: die Zuwege werden gezaehlt, nicht geschrieben.
  // Der Blurb sagte "Zwei Zuwege", die Karte hat drei, und die abgeleitete
  // Zeile darunter sagte es richtig. Ein Waechter haelt das jetzt fest.
  blurb: 'Der Boden glüht noch. Die Zuwege münden früh ineinander — danach zählt jede Stellung doppelt.',
  palette: LAUB,
  lanes: [
    [
      { x: -41, y: 216, w: 40 }, { x: 0, y: 234, w: 40 }, { x: 36, y: 249, w: 40 },
      { x: 68, y: 264, w: 40.39182566712974 }, { x: 109, y: 283, w: 44.166780658275115 }, { x: 147, y: 302, w: 40 },
      { x: 177, y: 319, w: 53 }, { x: 210, y: 332, w: 53 }, { x: 249, y: 338, w: 48 },
      { x: 289, y: 335, w: 45 }, { x: 323, y: 321, w: 57 }, { x: 355, y: 304, w: 57 },
      { x: 391, y: 293, w: 51 }, { x: 428, y: 285, w: 51 }, { x: 459, y: 268, w: 55 },
      { x: 480, y: 240, w: 63 }, { x: 498, y: 209, w: 51 }, { x: 524, y: 186, w: 46 },
      { x: 559, y: 176, w: 50 }, { x: 597, y: 174, w: 45 }, { x: 633, y: 184, w: 43 },
      { x: 660, y: 205, w: 53 }, { x: 687, y: 226, w: 52 }, { x: 722, y: 240, w: 48 },
      { x: 756, y: 253, w: 44 }, { x: 782, y: 275, w: 58 }, { x: 803, y: 302, w: 54 },
      { x: 831, y: 322, w: 50 }, { x: 866, y: 331, w: 52 }, { x: 904, y: 335, w: 51 },
      { x: 941, y: 343, w: 71 }, { x: 976, y: 360, w: 60 }, { x: 1010, y: 378, w: 58 },
      { x: 1046, y: 389, w: 53 }, { x: 1082, y: 388, w: 56 }, { x: 1116, y: 375, w: 56 },
      { x: 1150, y: 358, w: 57 }, { x: 1186, y: 346, w: 50 }, { x: 1225, y: 340, w: 50 },
      { x: 1265, y: 338, w: 50 }, { x: 1308, y: 339, w: 50 }, { x: 1345, y: 348, w: 45 },
      { x: 1369, y: 370, w: 59 }, { x: 1393, y: 399, w: 57 }, { x: 1426, y: 421, w: 52 },
      { x: 1464, y: 433, w: 57 }, { x: 1500, y: 446, w: 55 }, { x: 1532, y: 462, w: 61 },
      { x: 1564, y: 475, w: 51 }, { x: 1596, y: 480, w: 53 },
    ],
    [
      { x: -28, y: 912, w: 40 }, { x: 0, y: 884, w: 40 }, { x: 29, y: 856, w: 40 },
      { x: 57, y: 828, w: 40 }, { x: 85, y: 799, w: 40 }, { x: 116, y: 768, w: 40.6641589347107 },
      { x: 154, y: 731, w: 45.06343850020563 }, { x: 187, y: 695, w: 40 }, { x: 201, y: 668, w: 54 },
      { x: 211, y: 642, w: 59 }, { x: 230, y: 618, w: 56 }, { x: 262, y: 601, w: 50 },
      { x: 296, y: 587, w: 58 }, { x: 325, y: 567, w: 51 }, { x: 352, y: 544, w: 54 },
      { x: 387, y: 527, w: 54 }, { x: 425, y: 519, w: 54 }, { x: 464, y: 512, w: 55 },
      { x: 501, y: 500, w: 49 }, { x: 530, y: 480, w: 52 }, { x: 557, y: 460, w: 48 },
      { x: 592, y: 442, w: 50 }, { x: 630, y: 435, w: 54 }, { x: 668, y: 438, w: 49 },
      { x: 699, y: 452, w: 56 }, { x: 720, y: 476, w: 61 }, { x: 744, y: 498, w: 60 },
      { x: 777, y: 510, w: 52 }, { x: 814, y: 514, w: 55 }, { x: 853, y: 515, w: 54 },
      { x: 892, y: 515, w: 56 }, { x: 931, y: 520, w: 56 }, { x: 964, y: 534, w: 52 },
      { x: 992, y: 555, w: 53 }, { x: 1025, y: 572, w: 47 }, { x: 1062, y: 577, w: 60 },
      { x: 1100, y: 572, w: 57 }, { x: 1132, y: 556, w: 63 }, { x: 1161, y: 536, w: 60 },
      { x: 1195, y: 524, w: 55 }, { x: 1230, y: 528, w: 62 }, { x: 1264, y: 543, w: 68 },
      { x: 1299, y: 561, w: 64 }, { x: 1333, y: 572, w: 56 }, { x: 1366, y: 571, w: 59 },
      { x: 1404, y: 567, w: 52 }, { x: 1444, y: 561, w: 52 }, { x: 1481, y: 549, w: 54 },
      { x: 1514, y: 529, w: 59 }, { x: 1545, y: 508, w: 56 }, { x: 1574, y: 492, w: 55 },
      { x: 1596, y: 480, w: 53 },
    ],
    [
      { x: 488, y: 1113, w: 40 }, { x: 482, y: 1073, w: 40 }, { x: 477, y: 1034, w: 40 },
      { x: 471, y: 994, w: 40 }, { x: 465, y: 955, w: 40 }, { x: 457, y: 913, w: 40 },
      { x: 440, y: 865, w: 40 }, { x: 421, y: 819, w: 40 }, { x: 416, y: 786, w: 40 },
      { x: 419, y: 757, w: 43 }, { x: 424, y: 724, w: 40 }, { x: 424, y: 681, w: 40 },
      { x: 421, y: 637, w: 40.31678558515597 }, { x: 416, y: 586, w: 41.39016988535005 }, { x: 411, y: 541, w: 43.15073880471253 },
      { x: 408, y: 518, w: 46 }, { x: 405, y: 488, w: 40 }, { x: 403, y: 444, w: 50.109023868042186 },
      { x: 402, y: 399, w: 50.9914914680364 }, { x: 402, y: 352, w: 50.48059234885746 }, { x: 410, y: 312, w: 40 },
      { x: 431, y: 292, w: 48 }, { x: 458, y: 274, w: 55 }, { x: 479, y: 246, w: 62 },
      { x: 497, y: 213, w: 55 }, { x: 522, y: 188, w: 44 }, { x: 556, y: 175, w: 50 },
      { x: 592, y: 172, w: 47 }, { x: 627, y: 180, w: 42 }, { x: 656, y: 201, w: 55 },
      { x: 683, y: 224, w: 54 }, { x: 716, y: 238, w: 48 }, { x: 751, y: 250, w: 42 },
      { x: 778, y: 270, w: 57 }, { x: 797, y: 297, w: 55 }, { x: 822, y: 319, w: 51 },
      { x: 858, y: 330, w: 51 }, { x: 897, y: 334, w: 51 }, { x: 936, y: 341, w: 65 },
      { x: 971, y: 357, w: 59 }, { x: 1004, y: 375, w: 56 }, { x: 1039, y: 388, w: 57 },
      { x: 1075, y: 389, w: 56 }, { x: 1109, y: 378, w: 56 }, { x: 1143, y: 361, w: 58 },
      { x: 1179, y: 347, w: 54 }, { x: 1217, y: 340, w: 50 }, { x: 1256, y: 337, w: 50 },
      { x: 1296, y: 336, w: 50 }, { x: 1333, y: 342, w: 46 }, { x: 1362, y: 363, w: 55 },
      { x: 1387, y: 393, w: 57 }, { x: 1419, y: 418, w: 51 }, { x: 1457, y: 433, w: 55 },
      { x: 1494, y: 446, w: 52 }, { x: 1527, y: 462, w: 65 }, { x: 1560, y: 475, w: 54 },
      { x: 1596, y: 480, w: 53 },
    ],
  ],
  rough: [
    { x: 1681, y: 874, r: 128, art: 'locker', farbe: '#362519' },
    { x: 957, y: 135, r: 106, art: 'locker', farbe: '#473526' },
    { x: 1737, y: 293, r: 104, art: 'locker', farbe: '#32251a' },
    { x: 1172, y: 993, r: 83, art: 'locker', farbe: '#392618' },
    { x: 1705, y: 30, r: 74, art: 'locker', farbe: '#292018' },
    { x: 926, y: 950, r: 56, art: 'hart', farbe: '#7c5939' },
    { x: 141, y: 362, r: 54, art: 'locker', farbe: '#35281d' },
    { x: 652, y: 324, r: 53, art: 'locker', farbe: '#423021' },
    { x: 209, y: 621, r: 52, art: 'hart', farbe: '#775638' },
    { x: 1112, y: 812, r: 50, art: 'locker', farbe: '#4a3625' },
    { x: 285, y: 368, r: 36, art: 'hart', farbe: '#65482d' },
  ],
  pfadImBild: true,
  hint: { x: 1120, y: 180 },
  ziel: { x: 1747, y: 480 },   // gemessen mit `npm run zielplatte`
  // Das Tor sitzt auf der mittleren Bahn (C24).
  //
  // Acht Sekunden zu, acht auf - symmetrisch, damit der Takt ablesbar ist,
  // und beginnend OFFEN, damit die erste Welle nicht mit einer Sperre
  // anfaengt. Auf der Laubschlucht, weil sie drei Zuwege hat und Abdeckung
  // ohnehin ihre Frage ist.
  //
  // Durchprobiert gegen die Auslegung (Regel 9), Kristall am Ende:
  //
  //     ohne Tor        Meister 30  Breite 34  Sparsam 18
  //     6 zu / 10 auf   Meister 29  Breite 32  Sparsam 18
  //     8 zu /  8 auf   Meister 29  Breite 32  Sparsam 23   gewaehlt
  //    10 zu /  6 auf   Meister 33  Breite 30  Sparsam 24
  //
  // Alle vier bleiben gruen. Bemerkenswert ist der sparsame Stil: er gewinnt
  // dazu, weil der umgelenkte Druck sich verteilt statt sich an einer Stelle
  // zu stauen. Das Tor macht die Karte also nicht schwerer, sondern anders -
  // und genau darum ging es in C24.
  tor: { bahn: 1, zu: 8, auf: 8 },
  waves: PLAN_ASCHESCHLUCHT,
  // **0,98 statt 1,06 - und das ist kein Nachgeben, sondern das Schliessen
  // einer Luecke.** Bis v202 endete der beste Bot-Lauf hier bei genau 20 von
  // 60 Leben. Die zweite Sternschwelle liegt bei 20 (`starsFor`, 33 %). Diese
  // Karte stand also nicht knapp ueber der Schwelle, sie stand DARAUF - jede
  // Stoerung, die ein einziges Leben kostet, macht ihren zweiten Stern
  // unerreichbar. In v203 war es eine Bauregel, die 0,2 Prozentpunkte
  // Flaeche verschoben hat; beim naechsten Mal ist es etwas anderes.
  //
  // Durchprobiert mit `npm run eichen -- --karte ascheschlucht --hp` statt
  // geraten (Regel 9): 1,06 gibt 18/19/3 Leben und einen Stern, 1,02 gibt
  // 19/21/5 - wieder ein Leben ueber der Schwelle -, 0,98 gibt 21/27/12.
  // Sieben Leben Luft, und zugleich der beste Anteil in der letzten Welle
  // (28 %). Der dritte Stern bleibt mit 40 von 60 weit weg.
  balance: { hpMul: 0.98, goldMul: 1.05 },
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
      { x: 4, y: -24, w: 40 }, { x: 4, y: 16, w: 40 }, { x: 5, y: 56, w: 40 },
      { x: 5, y: 96, w: 40 }, { x: 6, y: 136, w: 40 }, { x: 7, y: 176, w: 40 },
      { x: 9, y: 218, w: 40 }, { x: 10, y: 260, w: 40 }, { x: 9, y: 297, w: 52.54326695753372 },
      { x: 11, y: 335, w: 68.56264222147934 }, { x: 20, y: 372, w: 54.51195494386141 }, { x: 39, y: 408, w: 40 },
      { x: 64, y: 440, w: 40 }, { x: 93, y: 463, w: 40 }, { x: 126, y: 479, w: 40 },
      { x: 161, y: 484, w: 43 }, { x: 197, y: 478, w: 43 }, { x: 233, y: 464, w: 40 },
      { x: 268, y: 449, w: 40 }, { x: 303, y: 438, w: 40 }, { x: 340, y: 428, w: 42 },
      { x: 369, y: 409, w: 50 }, { x: 391, y: 383, w: 40 }, { x: 418, y: 362, w: 40 },
      { x: 446, y: 339, w: 40 }, { x: 472, y: 312, w: 40 }, { x: 499, y: 286, w: 40 },
      { x: 532, y: 270, w: 40 }, { x: 568, y: 267, w: 40 }, { x: 601, y: 278, w: 40 },
      { x: 632, y: 299, w: 40 }, { x: 665, y: 313, w: 42 }, { x: 702, y: 320, w: 40 },
      { x: 741, y: 323, w: 42 }, { x: 781, y: 324, w: 40 }, { x: 821, y: 328, w: 40 },
      { x: 855, y: 341, w: 40 }, { x: 878, y: 368, w: 40 }, { x: 892, y: 410, w: 49 },
      { x: 899, y: 450, w: 43 }, { x: 907, y: 469, w: 65 }, { x: 923, y: 482, w: 65 },
      { x: 948, y: 501, w: 56 }, { x: 978, y: 526, w: 40 }, { x: 1010, y: 545, w: 44 },
      { x: 1046, y: 555, w: 47 }, { x: 1084, y: 562, w: 43 }, { x: 1119, y: 575, w: 53 },
      { x: 1149, y: 593, w: 59 }, { x: 1186, y: 605, w: 40 }, { x: 1233, y: 607, w: 42 },
      { x: 1272, y: 599, w: 43 }, { x: 1289, y: 581, w: 67 }, { x: 1293, y: 553, w: 59 },
      { x: 1299, y: 527, w: 55 }, { x: 1323, y: 511, w: 40 }, { x: 1364, y: 498, w: 41 },
      { x: 1407, y: 489, w: 40 }, { x: 1449, y: 485, w: 56 }, { x: 1488, y: 486, w: 57 },
      { x: 1531, y: 492, w: 50 }, { x: 1581, y: 501, w: 40 }, { x: 1621, y: 510, w: 40 },
      { x: 1642, y: 520, w: 55 }, { x: 1656, y: 532, w: 45 },
    ],
    [
      { x: -44, y: 1076, w: 40 }, { x: -4, y: 1075, w: 40 }, { x: 36, y: 1075, w: 40 },
      { x: 76, y: 1074, w: 40 }, { x: 116, y: 1074, w: 40 }, { x: 156, y: 1073, w: 40 },
      { x: 196, y: 1072, w: 40 }, { x: 236, y: 1072, w: 40 }, { x: 276, y: 1071, w: 40 },
      { x: 316, y: 1070, w: 40 }, { x: 356, y: 1068, w: 40 }, { x: 396, y: 1066, w: 40 },
      { x: 436, y: 1064, w: 40 }, { x: 477, y: 1062, w: 40 }, { x: 517, y: 1059, w: 40 },
      { x: 555, y: 1057, w: 41.32174097032708 }, { x: 590, y: 1056, w: 40 }, { x: 624, y: 1045, w: 46.39524631937918 },
      { x: 658, y: 1023, w: 42.96976192897657 }, { x: 686, y: 994, w: 40 }, { x: 699, y: 965, w: 45 },
      { x: 698, y: 937, w: 42 }, { x: 685, y: 901, w: 40 }, { x: 665, y: 867, w: 50 },
      { x: 646, y: 836, w: 68 }, { x: 622, y: 811, w: 57 }, { x: 589, y: 797, w: 50 },
      { x: 555, y: 787, w: 56 }, { x: 527, y: 772, w: 58 }, { x: 503, y: 746, w: 40 },
      { x: 473, y: 713, w: 40 }, { x: 445, y: 686, w: 50 }, { x: 430, y: 661, w: 61 },
      { x: 431, y: 630, w: 45 }, { x: 450, y: 598, w: 45 }, { x: 483, y: 581, w: 43 },
      { x: 521, y: 575, w: 44 }, { x: 560, y: 573, w: 42 }, { x: 600, y: 571, w: 43 },
      { x: 639, y: 565, w: 45 }, { x: 674, y: 550, w: 63 }, { x: 705, y: 527, w: 43 },
      { x: 739, y: 508, w: 42 }, { x: 779, y: 501, w: 44 }, { x: 826, y: 499, w: 40 },
      { x: 865, y: 494, w: 52 }, { x: 883, y: 489, w: 70 }, { x: 898, y: 487, w: 77 },
      { x: 923, y: 498, w: 56 }, { x: 960, y: 521, w: 43 }, { x: 996, y: 540, w: 43 },
      { x: 1034, y: 553, w: 49 }, { x: 1073, y: 559, w: 42 }, { x: 1109, y: 569, w: 47 },
      { x: 1140, y: 586, w: 60 }, { x: 1173, y: 601, w: 46 }, { x: 1211, y: 608, w: 40 },
      { x: 1246, y: 605, w: 40 }, { x: 1277, y: 590, w: 62 }, { x: 1290, y: 563, w: 59 },
      { x: 1298, y: 535, w: 58 }, { x: 1322, y: 514, w: 44 }, { x: 1361, y: 502, w: 40 },
      { x: 1398, y: 496, w: 42 }, { x: 1436, y: 491, w: 49 }, { x: 1474, y: 490, w: 53 },
      { x: 1510, y: 490, w: 55 }, { x: 1546, y: 494, w: 40 }, { x: 1589, y: 503, w: 40 },
      { x: 1629, y: 517, w: 51 }, { x: 1656, y: 532, w: 45 },
    ],
  ],
  rough: [
    { x: 1582, y: 981, r: 134, art: 'kalt', farbe: '#283d52' },
    { x: 1647, y: 195, r: 133, art: 'kalt', farbe: '#1b354d' },
    { x: 828, y: 808, r: 112, art: 'locker', farbe: '#454444' },
    { x: 494, y: 243, r: 83, art: 'kalt', farbe: '#243f50' },
    { x: 924, y: 254, r: 52, art: 'hart', farbe: '#5e5b59' },
    { x: 1845, y: 822, r: 40, art: 'locker', farbe: '#3b4455' },
    { x: 1012, y: 950, r: 37, art: 'locker', farbe: '#585655' },
    { x: 1770, y: 472, r: 34, art: 'locker', farbe: '#2d323a' },
    { x: 194, y: 915, r: 33, art: 'kalt', farbe: '#0e283f' },
    { x: 312, y: 979, r: 32, art: 'kalt', farbe: '#063e62' },
    { x: 1792, y: 387, r: 31, art: 'locker', farbe: '#4b525b' },
  ],
  pfadImBild: true,
  hint: { x: 200, y: 200 },
  ziel: { x: 1734, y: 518 },   // gemessen mit `npm run zielplatte`
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
    // Der letzte Kontrollpunkt jeder Bahn liegt auf der Zielplattform.
    //
    // Nicht in den Rohdaten geaendert, sondern hier: die Rohdaten beschreiben
    // den Verlauf, und wo alle Bahnen enden, ist EINE Angabe - sie stuende
    // sonst so oft da, wie es Bahnen gibt, und liefe beim naechsten Mal
    // auseinander (Regel 15).
    hit = map.lanes.map((l) => new LanePath(
      map.ziel ? [...l.slice(0, -1), { ...l[l.length - 1], ...map.ziel }] : l,
    ));
    laneCache.set(map.id, hit);
  }
  return hit;
}

/** Der Herzkristall - das Ende aller Bahnen. */
export function goalOf(map: GameMap): Vec {
  if (map.ziel) return { x: map.ziel.x, y: map.ziel.y };
  const last = map.lanes[0][map.lanes[0].length - 1];
  return { x: last.x, y: last.y };
}

/** Mindestabstand jedes Turms zum Weg. Naeher darf nichts stehen - sonst
 *  klebt der Turm auf der Strasse und verdeckt die Gegner.
 *
 *  **Die 30 hat v203 ueberlebt, obwohl der Wegkoerper darunter seine Form
 *  gewechselt hat.** Nachgemessen ueber alle drei Karten und alle vier
 *  Turmsorten (Raster 12 Weltpunkte) kostet die neue Form zwischen 0,12 und
 *  0,41 Prozentpunkte baubarer Flaeche; mit 28 waere sie auf +-0,22
 *  ausgeglichen gewesen. Beides liegt im Rauschen des Rasters, und der
 *  Ausgleich hat am Ergebnis der Balance NICHTS geaendert - die haengt an
 *  einzelnen Turmstellungen, nicht an Zehntelprozenten Flaeche. Eine Zahl zu
 *  bewegen, die nichts bewegt, ist keine Eichung. */
export const PATH_CLEARANCE = 30;

/** Bauen wird auf ein feines Raster gefangen. Nicht als Spielregel, sondern
 *  damit die Tuerme sauber stehen statt krumm - man merkt es nicht, aber man
 *  sieht es. */
export const BUILD_SNAP = 12;

export const snap = (v: number): number => Math.round(v / BUILD_SNAP) * BUILD_SNAP;
