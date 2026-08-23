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
      { x: 523, y: 1157, w: 40 }, { x: 586, y: 1080, w: 72 }, { x: 627, y: 1018, w: 77 },
      { x: 651, y: 973, w: 79 }, { x: 671, y: 940, w: 57 }, { x: 699, y: 917, w: 63 },
      { x: 732, y: 905, w: 59 }, { x: 766, y: 898, w: 56 }, { x: 799, y: 888, w: 56 },
      { x: 832, y: 868, w: 75 }, { x: 867, y: 843, w: 42 }, { x: 904, y: 824, w: 58 },
      { x: 940, y: 815, w: 56 }, { x: 976, y: 809, w: 56 }, { x: 1010, y: 799, w: 56 },
      { x: 1039, y: 780, w: 53 }, { x: 1064, y: 754, w: 72 }, { x: 1088, y: 729, w: 42 },
      { x: 1117, y: 713, w: 59 }, { x: 1153, y: 704, w: 56 }, { x: 1190, y: 699, w: 56 },
      { x: 1225, y: 692, w: 56 }, { x: 1253, y: 677, w: 42 }, { x: 1274, y: 651, w: 74 },
      { x: 1295, y: 617, w: 73 }, { x: 1320, y: 580, w: 66 }, { x: 1351, y: 549, w: 53 },
      { x: 1385, y: 525, w: 56 }, { x: 1420, y: 506, w: 53 }, { x: 1458, y: 486, w: 58 },
      { x: 1510, y: 465, w: 56 }, { x: 1592, y: 440, w: 51 }, { x: 1704, y: 408, w: 81 },
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
      { x: -41, y: 216, w: 40 }, { x: 68, y: 268, w: 40 }, { x: 148, y: 305, w: 50 },
      { x: 198, y: 326, w: 53 }, { x: 236, y: 335, w: 48 }, { x: 271, y: 337, w: 43 },
      { x: 304, y: 332, w: 43 }, { x: 337, y: 318, w: 56 }, { x: 371, y: 303, w: 51 },
      { x: 407, y: 290, w: 48 }, { x: 439, y: 277, w: 51 }, { x: 467, y: 256, w: 56 },
      { x: 490, y: 227, w: 64 }, { x: 515, y: 200, w: 42 }, { x: 544, y: 184, w: 48 },
      { x: 580, y: 179, w: 47 }, { x: 618, y: 184, w: 40 }, { x: 654, y: 200, w: 45 },
      { x: 687, y: 220, w: 42 }, { x: 721, y: 240, w: 43 }, { x: 754, y: 258, w: 40 },
      { x: 784, y: 280, w: 51 }, { x: 811, y: 301, w: 47 }, { x: 841, y: 318, w: 48 },
      { x: 876, y: 329, w: 51 }, { x: 913, y: 336, w: 48 }, { x: 948, y: 345, w: 69 },
      { x: 983, y: 361, w: 57 }, { x: 1020, y: 378, w: 57 }, { x: 1057, y: 388, w: 48 },
      { x: 1092, y: 386, w: 53 }, { x: 1127, y: 373, w: 53 }, { x: 1164, y: 356, w: 53 },
      { x: 1203, y: 344, w: 48 }, { x: 1240, y: 338, w: 48 }, { x: 1276, y: 338, w: 48 },
      { x: 1310, y: 342, w: 48 }, { x: 1344, y: 354, w: 40 }, { x: 1390, y: 378, w: 59 },
      { x: 1471, y: 412, w: 53 }, { x: 1586, y: 449, w: 53 },
    ],
    [
      { x: -28, y: 912, w: 40 }, { x: 100, y: 774, w: 40 }, { x: 184, y: 678, w: 59 },
      { x: 227, y: 628, w: 50 }, { x: 258, y: 602, w: 48 }, { x: 291, y: 584, w: 58 },
      { x: 324, y: 565, w: 42 }, { x: 356, y: 543, w: 51 }, { x: 390, y: 525, w: 55 },
      { x: 424, y: 515, w: 55 }, { x: 460, y: 510, w: 56 }, { x: 494, y: 501, w: 48 },
      { x: 527, y: 484, w: 47 }, { x: 558, y: 463, w: 48 }, { x: 590, y: 445, w: 48 },
      { x: 624, y: 437, w: 48 }, { x: 659, y: 441, w: 48 }, { x: 693, y: 456, w: 42 },
      { x: 724, y: 479, w: 56 }, { x: 755, y: 500, w: 51 }, { x: 788, y: 512, w: 55 },
      { x: 824, y: 516, w: 56 }, { x: 863, y: 516, w: 48 }, { x: 900, y: 518, w: 56 },
      { x: 936, y: 526, w: 55 }, { x: 972, y: 540, w: 42 }, { x: 1008, y: 558, w: 40 },
      { x: 1044, y: 572, w: 51 }, { x: 1079, y: 576, w: 55 }, { x: 1112, y: 569, w: 51 },
      { x: 1145, y: 555, w: 59 }, { x: 1180, y: 539, w: 48 }, { x: 1217, y: 533, w: 55 },
      { x: 1256, y: 541, w: 65 }, { x: 1295, y: 554, w: 61 }, { x: 1332, y: 563, w: 40 },
      { x: 1370, y: 564, w: 59 }, { x: 1418, y: 551, w: 51 }, { x: 1490, y: 512, w: 51 },
      { x: 1586, y: 449, w: 53 },
    ],
    [
      { x: 488, y: 1113, w: 40 }, { x: 426, y: 672, w: 40 }, { x: 401, y: 403, w: 51 },
      { x: 415, y: 305, w: 48 }, { x: 443, y: 279, w: 51 }, { x: 469, y: 256, w: 56 },
      { x: 491, y: 227, w: 64 }, { x: 515, y: 200, w: 42 }, { x: 544, y: 184, w: 48 },
      { x: 580, y: 179, w: 47 }, { x: 618, y: 184, w: 40 }, { x: 654, y: 200, w: 45 },
      { x: 687, y: 220, w: 42 }, { x: 721, y: 240, w: 43 }, { x: 754, y: 258, w: 40 },
      { x: 784, y: 280, w: 51 }, { x: 811, y: 301, w: 47 }, { x: 841, y: 318, w: 48 },
      { x: 876, y: 329, w: 51 }, { x: 913, y: 336, w: 48 }, { x: 948, y: 345, w: 69 },
      { x: 983, y: 361, w: 57 }, { x: 1020, y: 378, w: 57 }, { x: 1057, y: 388, w: 48 },
      { x: 1092, y: 386, w: 53 }, { x: 1127, y: 373, w: 53 }, { x: 1164, y: 356, w: 53 },
      { x: 1203, y: 344, w: 48 }, { x: 1240, y: 338, w: 48 }, { x: 1276, y: 338, w: 48 },
      { x: 1310, y: 342, w: 48 }, { x: 1344, y: 354, w: 40 }, { x: 1390, y: 378, w: 59 },
      { x: 1471, y: 412, w: 53 }, { x: 1586, y: 449, w: 53 },
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
 *  klebt der Turm auf der Strasse und verdeckt die Gegner. */
export const PATH_CLEARANCE = 30;

/** Bauen wird auf ein feines Raster gefangen. Nicht als Spielregel, sondern
 *  damit die Tuerme sauber stehen statt krumm - man merkt es nicht, aber man
 *  sieht es. */
export const BUILD_SNAP = 12;

export const snap = (v: number): number => Math.round(v / BUILD_SNAP) * BUILD_SNAP;
