import type { Vec } from '../core/math';
import { LanePath, type PathPoint } from '../core/path';
import {
  PLAN_SPIRALHAIN, PLAN_ASCHESCHLUCHT, PLAN_FROSTSPALTE, PLAN_FARNKESSEL, type Wave,
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
  /** Was das Kartenbild schon mitbringt - und was die Engine deshalb NICHT
   *  mehr zeichnet.
   *
   *  Bis v213 stand hier ein einzelnes `pfadImBild`, und es steuerte beides
   *  auf einmal: Weg und Gelaende. Das war eine Vereinfachung zu viel.
   *  Gemessen (v214, Probe auf dem Spiralhain) ist naemlich das eine gut und
   *  das andere nicht:
   *
   *   - **Der Weg von der Engine ueberzeugt.** Breites Band mit Randsteinen,
   *     das der Bahn folgt, weil es aus ihr gerechnet wird. Auf einem
   *     fotografischen Boden liest er sich besser als die gemalte Strasse -
   *     und er kann gar nicht woanders liegen als die Bahn.
   *   - **Das Gelaende von der Engine ueberzeugt nicht.** Flache blaugraue
   *     Vektorklumpen mit harter Kante, die neben dem Foto stehen wie
   *     aufgeklebt.
   *
   *  Deshalb zwei Schalter. Der Sinn der urspruenglichen Uebung bleibt: aus
   *  drei Bildsprachen werden zwei - nur wird jetzt je Sache entschieden,
   *  welche der beiden es ist.
   *
   *  Ohne Angabe bringt das Bild beides mit (der Stand aller drei Karten). */
  bildBringt?: { weg: boolean; gelaende: boolean };
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
  // Erdton statt Sandton. Auf dem Waldboden vom 04.09.2026 war das alte
  // #C9A86A um Klassen heller als alles um es herum - ein cremefarbenes Band
  // auf olivem Gruen. Ein getretener Waldweg ist kaum heller als sein Rand.
  path: '#5A4B2E', pathEdge: '#3B301D',
  rock: '#2A3348', rockHi: '#3D4A66',
  mood: '#BEE2FF', haze: '#B4D6E2', sonne: '#FFC26A',
  // Spiralhain: Nieselregen. Moos steht nicht ohne Wasser.
  wetter: 'regen', wetterTon: '#CFE6F2',
};

/** Farnkessel: derselbe Wald, aber im Schatten - kuehler und dunkler.
 *  Der Weg ist derselbe Erdton wie auf dem Spiralhain, nur eine Spur
 *  grauer, weil der Boden unter ihm kaelter gebacken ist. */
const FARN: MapPalette = {
  terrain: '#16332F', terrainHi: '#1D4A44', terrainLo: '#0E2523',
  path: '#4F4A36', pathEdge: '#332F22',
  rock: '#26303F', rockHi: '#38455C',
  mood: '#BCDBE8', haze: '#A9C6D2', sonne: '#E8C48A',
  // Auch hier Regen - es ist derselbe Wald, nur eine Senke tiefer.
  wetter: 'regen', wetterTon: '#C6DCE8',
};

const LAUB: MapPalette = {
  terrain: '#2E2A1E', terrainHi: '#4A4228', terrainLo: '#1B1810',
  // **Weg und Boden muessen zueinander passen, seit die Karte ihren Weg
  //   selbst zeichnet (v233)** - dieselbe Rechnung wie bei FROST in v232.
  //   Vorher war der Weg cremefarbener Sand (#CBB48A); gegen den gebackenen
  //   Aschegrund rgb 75,74,75 sind das gemessen 170,0 Farbschritte, erlaubt
  //   sind 40 bis 90. Ein getretener Pfad im Aschefeld ist ein wenig heller
  //   als die Asche, nicht ein Sandband darauf.
  path: '#787367', pathEdge: '#58544C',
  rock: '#39332A', rockHi: '#5C5242',
  mood: '#FFD9A8', haze: '#B8A882', sonne: '#FFB661',
  // Ascheschlucht: Aschefall, warm und langsam. Der Name ist das Wetter.
  wetter: 'asche', wetterTon: '#E8C79A',
};

const FROST: MapPalette = {
  terrain: '#22364F', terrainHi: '#33557A', terrainLo: '#16233A',
  // **Weg und Boden muessen zueinander passen, seit die Karte ihren Weg
  //   selbst zeichnet (v232).** Vorher war der Weg fast weiss (#E4EEF6) -
  //   gegen den gebackenen Boden rgb 84,101,118 sind das 236 Farbschritte,
  //   gemessen 224,8 im Bild. Erlaubt sind 40 bis 90: darunter verschwindet
  //   er im Gelaende, darueber liegt er darauf wie ausgeschnittenes Papier.
  path: '#5E7080', pathEdge: '#46545F',
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
    // **Neu gezogen, seit das Spiel den Weg selbst zeichnet.** Vorher folgte
    // die Bahn der gemalten Strasse - Umwegfaktor 1,11, eine fast gerade
    // Diagonale, und die obere linke Kartenhaelfte wurde nie betreten. Ohne
    // gemalte Strasse gibt es nichts mehr, dem zu folgen waere.
    //
    // Gewunden statt verlaengert: das Tor rueckt von links unten in die
    // Mitte des unteren Randes, die Luftlinie faellt von 1400 auf rund 900,
    // und der Umweg steigt, ohne dass viel mehr Gegner gleichzeitig
    // unterwegs sind. Genau daran sind v209 und v210 gescheitert - eine
    // anderthalb mal so lange Bahn verlangte hpMul 0,55 gegen erlaubte 0,85.
    //
    // Die Bahn haelt Abstand zu jedem unwegsamen Fleck: ein Weg mitten durch
    // ein Felsfeld sieht falsch aus, und die Bausperre lag ohnehin darum.
    [
      { x: -60, y: 1035, w: 38 }, { x: 160, y: 1050, w: 44 },
      { x: 380, y: 1042, w: 46 }, { x: 520, y: 1000, w: 48 },
      { x: 524, y: 860, w: 50 }, { x: 528, y: 700, w: 50 },
      { x: 540, y: 580, w: 48 }, { x: 590, y: 516, w: 44 },
      { x: 690, y: 500, w: 44 }, { x: 790, y: 548, w: 46 },
      { x: 816, y: 680, w: 50 }, { x: 820, y: 820, w: 50 },
      { x: 826, y: 950, w: 48 }, { x: 886, y: 1016, w: 44 },
      { x: 996, y: 1030, w: 44 }, { x: 1096, y: 980, w: 46 },
      { x: 1116, y: 850, w: 50 }, { x: 1120, y: 700, w: 50 },
      { x: 1128, y: 570, w: 48 }, { x: 1182, y: 502, w: 44 },
      { x: 1288, y: 490, w: 44 }, { x: 1390, y: 542, w: 46 },
      { x: 1408, y: 680, w: 50 }, { x: 1414, y: 820, w: 52 },
      { x: 1444, y: 940, w: 52 }, { x: 1540, y: 1004, w: 52 },
      { x: 1646, y: 978, w: 54 }, { x: 1700, y: 850, w: 56 },
      { x: 1716, y: 700, w: 58 }, { x: 1726, y: 570, w: 62 },
      { x: 1734, y: 454, w: 68 },
    ],
  ],
  // **Aus dem Bild gelesen, dann angesehen.** `npm run gelaendesuche -- spiralhain`
  // schlaegt vor, sein Kontaktbogen zeigt die Vorschlaege - von vierzehn waren
  // sechs blanke Wiese. Kein Kriterium trennt die beiden (siehe Kopf des
  // Werkzeugs); der Blick trennt sie in einer Sekunde.
  rough: [
    { x: 1485, y: 214, r: 147, art: 'locker', farbe: '#1b1905' },
    { x: 313, y: 780, r: 134, art: 'locker', farbe: '#1b1b09' },
    { x: 1302, y: 113, r: 72, art: 'locker', farbe: '#1a1a06' },
    { x: 650, y: 296, r: 69, art: 'locker', farbe: '#292816' },
    { x: 778, y: 162, r: 55, art: 'locker', farbe: '#2f2d1e' },
    { x: 597, y: 184, r: 37, art: 'locker', farbe: '#353326' },
    { x: 776, y: 362, r: 36, art: 'locker', farbe: '#1b1d06' },
    { x: 1671, y: 916, r: 32, art: 'locker', farbe: '#2b280f' },
  ],
  bildBringt: { weg: false, gelaende: true },
  hint: { x: 200, y: 200 },
  ziel: { x: 1734, y: 454 },   // gemessen mit `npm run zielplatte`
  waves: PLAN_SPIRALHAIN,
  balance: { hpMul: 1.1, goldMul: 0.9 },
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
    // **Neu gezogen, seit die Karte ihren Weg selbst zeichnet (v233).** Die
    // alten drei Bahnen folgten der gemalten Strasse des vorigen Bildes -
    // Umweg 1,10 / 1,12 / 1,65 gegen verlangte 1,8, und zwei von ihnen liefen
    // durch einen unwegsamen Fleck hindurch (4 und 39 Weltpunkte hinein).
    //
    // **Gewunden statt verlaengert**, zum vierten Mal (v217, v219, v232): die
    // drei Tore liegen NAHE am Ziel statt weit weg. Luftlinien 1256 / 862 /
    // 1050 gegen vorher 1807 / 1827 / 1409 - der Umweg steigt damit auf
    // 2,00 / 2,51 / 2,29, ohne dass die Bahnen laenger werden als vorher
    // (2510 / 2165 / 2401 gegen 1986 / 2044 / 2329).
    //
    // **Die Laengen muessen zusammenpassen, die Luftlinien nicht.** Der
    // Waechter erlaubt hoechstens 30 % Unterschied zwischen den Bahnen, sonst
    // ist die kuerzeste eine Abkuerzung; hier stehen sie auf 1,16. Genau
    // deshalb windet sich die kurze zweite Bahn am staerksten: sie hat den
    // kuerzesten Weg zum Ziel und muss ihn selbst lang machen.
    //
    // Die letzten sechs Punkte teilen sich alle drei - das ist die Gabelung,
    // die der Waechter verlangt (256 gemeinsame Punkte, noetig sind 10).
    [
      { x: 700, y: 1180, w: 40 }, { x: 620, y: 1050, w: 44 }, { x: 520, y: 950, w: 48 },
      { x: 400, y: 870, w: 52 }, { x: 320, y: 760, w: 56 }, { x: 330, y: 640, w: 52 },
      { x: 420, y: 540, w: 44 }, { x: 550, y: 500, w: 40 }, { x: 690, y: 520, w: 44 },
      { x: 800, y: 600, w: 48 }, { x: 860, y: 710, w: 52 }, { x: 930, y: 800, w: 56 },
      { x: 1045, y: 890, w: 48 }, { x: 1180, y: 858, w: 44 }, { x: 1230, y: 700, w: 40 },
      { x: 1330, y: 660, w: 44 }, { x: 1430, y: 610, w: 48 }, { x: 1530, y: 560, w: 56 },
      { x: 1640, y: 508, w: 44 }, { x: 1734, y: 467, w: 40 },
    ],
    [
      { x: 1250, y: 1180, w: 40 }, { x: 1300, y: 1050, w: 44 }, { x: 1380, y: 950, w: 48 },
      { x: 1440, y: 830, w: 52 }, { x: 1420, y: 700, w: 56 }, { x: 1330, y: 610, w: 52 },
      { x: 1200, y: 580, w: 44 }, { x: 1070, y: 620, w: 40 }, { x: 1000, y: 730, w: 44 },
      { x: 1010, y: 850, w: 48 }, { x: 1085, y: 880, w: 52 }, { x: 1235, y: 870, w: 56 },
      { x: 1230, y: 700, w: 40 }, { x: 1330, y: 660, w: 44 }, { x: 1430, y: 610, w: 48 },
      { x: 1530, y: 560, w: 56 }, { x: 1640, y: 508, w: 44 }, { x: 1734, y: 467, w: 40 },
    ],
    [
      { x: 850, y: -100, w: 40 }, { x: 810, y: 30, w: 44 }, { x: 730, y: 130, w: 48 },
      { x: 600, y: 180, w: 52 }, { x: 470, y: 160, w: 56 }, { x: 380, y: 250, w: 52 },
      { x: 390, y: 380, w: 44 }, { x: 470, y: 470, w: 40 }, { x: 600, y: 500, w: 44 },
      { x: 730, y: 470, w: 48 }, { x: 840, y: 400, w: 52 }, { x: 960, y: 420, w: 56 },
      { x: 1060, y: 500, w: 48 }, { x: 1140, y: 610, w: 44 }, { x: 1230, y: 700, w: 40 },
      { x: 1330, y: 660, w: 44 }, { x: 1430, y: 610, w: 48 }, { x: 1530, y: 560, w: 56 },
      { x: 1640, y: 508, w: 44 }, { x: 1734, y: 467, w: 40 },
    ],
  ],
  rough: [
    // **Farbe und Art sind am GEBACKENEN Boden gelesen, nicht am Rohbild
    // (v233)** - dieselbe Lehre wie bei der Frostspalte in v232: als die
    // Backhelligkeit von 0,78 auf 0,70 fiel, wanderten alle elf Eintragungen
    // mit. Wer am Backen dreht, liest die Flecken danach neu.
    //
    // **Alle elf stehen auf "hart", und das kann das Werkzeug nicht messen.**
    // Im Bild sind es harte Felsnester mit Glutrissen - angesehen, nicht
    // vermutet (Regel 8). Die Helligkeitsregel des Werkzeugs lautet "heller
    // als seine Karte, also Stein"; auf hellem Aschefeld liegt dunkler Fels
    // aber UNTER dem Mittel (Δhell -0,068 bis -0,091), und damit kann sie
    // ihn nicht sehen.
    //
    // Ein zweites Merkmal ist gemessen und gescheitert: die Kantendichte
    // trennt nicht (Ascheschlucht 2,08 bis 3,56 mal das Kartenmittel,
    // Spiralhain 1,04 bis 2,92, Farnkessel 0,99 bis 2,98). Deshalb
    // entscheidet hier der Blick, und `npm run gelaendetor` sagt das, statt
    // ihn zu ueberstimmen - es haelt weiter die Farbe und `kalt`. Steht als
    // D29 im Verzeichnis.
    //
    // Waeren sie als "locker" eingetragen, kaeme die Gelaendeart `hart` im
    // ganzen Spiel nicht mehr vor: die Ascheschlucht traegt die einzigen
    // harten Flecke. Der Rauchtest hat genau das gemeldet.
    { x: 1681, y: 874, r: 128, art: 'hart', farbe: '#2c2d30' },
    { x: 957, y: 135, r: 106, art: 'hart', farbe: '#2d2e31' },
    { x: 1700, y: 210, r: 104, art: 'hart', farbe: '#2c2c2f' },
    { x: 1172, y: 993, r: 83, art: 'hart', farbe: '#2b2b2e' },
    { x: 1705, y: 30, r: 74, art: 'hart', farbe: '#313134' },
    { x: 926, y: 950, r: 56, art: 'hart', farbe: '#303033' },
    { x: 141, y: 362, r: 54, art: 'hart', farbe: '#2f2e30' },
    { x: 652, y: 324, r: 53, art: 'hart', farbe: '#313033' },
    { x: 209, y: 621, r: 52, art: 'hart', farbe: '#2d2d30' },
    { x: 1112, y: 812, r: 50, art: 'hart', farbe: '#2d2d2f' },
    { x: 285, y: 368, r: 36, art: 'hart', farbe: '#302f31' },
  ],
  bildBringt: { weg: false, gelaende: true },
  hint: { x: 1120, y: 180 },
  ziel: { x: 1734, y: 467 },   // gemessen mit `npm run zielplatte`
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
    // **Neu gezogen, seit die Karte ihren Weg selbst zeichnet (v232).** Die
    // alten Bahnen folgten der gemalten Strasse - Umweg 1,35 und 1,43, und
    // Bahn 1 lief sogar durch einen unwegsamen Fleck hindurch (44 Weltpunkte
    // hinein). Ohne gemalte Strasse gibt es nichts mehr, dem zu folgen waere.
    //
    // **Gewunden statt verlaengert**, die Lehre aus v217 und v209/v210: beide
    // Tore ruecken an den unteren Rand, nahe an das Ziel. Die Luftlinie faellt
    // von 1813 und 1864 auf rund 1490 und 920 - der Umweg steigt damit, ohne
    // dass mehr Gegner gleichzeitig unterwegs sind. Eine anderthalb mal so
    // lange Bahn verlangte in v210 `hpMul` 0,55 gegen erlaubte 0,85.
    //
    // Vorbild ist der Farnkessel: er besteht nicht, weil seine Bahnen laenger
    // sind, sondern weil seine Tore naeher liegen (Luftlinie 1492 und 873).
    [
      { x: 400, y: 1180, w: 40 }, { x: 392, y: 1030, w: 44 },
      { x: 352, y: 900, w: 48 }, { x: 300, y: 770, w: 52 },
      { x: 286, y: 620, w: 56 }, { x: 340, y: 490, w: 52 },
      { x: 452, y: 400, w: 44 }, { x: 592, y: 356, w: 40 },
      { x: 730, y: 352, w: 40 }, { x: 862, y: 396, w: 44 },
      { x: 972, y: 470, w: 48 }, { x: 1052, y: 574, w: 52 },
      { x: 1080, y: 704, w: 56 }, { x: 1008, y: 806, w: 48 },
      { x: 1092, y: 884, w: 40 }, { x: 1232, y: 922, w: 44 },
      { x: 1372, y: 900, w: 48 }, { x: 1482, y: 832, w: 52 },
      { x: 1570, y: 730, w: 56 }, { x: 1626, y: 636, w: 48 },
      { x: 1664, y: 546, w: 40 }, { x: 1683, y: 467, w: 40 },
    ],
    [
      { x: 1100, y: 1180, w: 40 }, { x: 1128, y: 1020, w: 44 },
      { x: 1234, y: 908, w: 48 }, { x: 1348, y: 826, w: 52 },
      { x: 1408, y: 698, w: 56 }, { x: 1364, y: 574, w: 52 },
      { x: 1238, y: 512, w: 44 }, { x: 1102, y: 528, w: 40 },
      { x: 1008, y: 620, w: 44 }, { x: 984, y: 736, w: 48 },
      { x: 1044, y: 830, w: 52 }, { x: 1170, y: 858, w: 56 },
      { x: 1310, y: 862, w: 48 }, { x: 1444, y: 824, w: 44 },
      { x: 1540, y: 764, w: 48 }, { x: 1570, y: 730, w: 56 },
      { x: 1626, y: 636, w: 48 }, { x: 1664, y: 546, w: 40 },
      { x: 1683, y: 467, w: 40 },
    ],
  ],
  // **Die Farben stehen am GEBACKENEN Boden, nicht am Rohbild (v232).** Als
  // die Backhelligkeit von 0,52 auf 0,37 fiel, wanderten alle zehn
  // Eintragungen um 0,12 bis 0,16 davon - `npm run gelaendetor` meldete zehn
  // von zehn. Wer am Backen dreht, liest die Flecken danach neu.
  rough: [
    { x: 1582, y: 981, r: 134, art: 'kalt', farbe: '#0f3759' },
    { x: 1647, y: 195, r: 133, art: 'kalt', farbe: '#113b5a' },
    { x: 828, y: 808, r: 112, art: 'kalt', farbe: '#1e405c' },
    { x: 494, y: 243, r: 83, art: 'kalt', farbe: '#1b405c' },
    { x: 924, y: 254, r: 52, art: 'kalt', farbe: '#1e3f5a' },
    { x: 1824, y: 788, r: 40, art: 'locker', farbe: '#1b3b53' },
    { x: 992, y: 896, r: 37, art: 'kalt', farbe: '#183953' },
    { x: 184, y: 864, r: 33, art: 'locker', farbe: '#1a374e' },
    { x: 288, y: 936, r: 32, art: 'locker', farbe: '#1e3c54' },
    // Lag bis v228 mit 18 Weltpunkten in der Zielplattform. Ein dritter, noch
    // naeher (1770:472, mitten auf der Platte), ist ersatzlos entfallen - im
    // Bild ist dort nichts, worauf er sich stuetzen koennte.
    //
    // Art und Farbe sind NICHT mitgewandert, sondern neu aus dem Bild
    // gelesen: `npm run gelaendetor` hat den Umzug sofort gemeldet ("locker"
    // eingetragen, "kalt" im Bild, 0,244 Farbabstand gegen erlaubte 0,06).
    // Eine Lage verschieben und die Beschreibung mitnehmen heisst, die
    // Beschreibung zu erfinden.
    { x: 1840, y: 320, r: 31, art: 'locker', farbe: '#18374e' },
  ],
  bildBringt: { weg: false, gelaende: true },
  hint: { x: 200, y: 200 },
  // Das neue Bild setzt die Platte woanders hin: `npm run zielplatte` findet
  // sie mit Guete 0,98 bei 1683:467, eingetragen waren 1734:518 - 72
  // Weltpunkte auseinander, erlaubt sind 40. Beide Bahnschwaenze sind
  // mitgezogen, damit sie weiter auf der Platte enden.
  ziel: { x: 1683, y: 467 },   // gemessen mit `npm run zielplatte`
  waves: PLAN_FROSTSPALTE,
  balance: { hpMul: 1.1, goldMul: 1.02 },
};


/** Karte 4 "Farnkessel": derselbe Waldboden, gespiegelt und kuehler gebacken.
 *
 *  **Ein Bild, zwei Orte.** Ein Kartenbild kostet eine Bestellung und einen
 *  Tag Wartezeit; ein vorhandenes ein zweites Mal zu benutzen ist deshalb
 *  nicht Sparsamkeit, sondern der Unterschied zwischen drei und vier Karten.
 *  Gespiegelt liegt die Zielplattform links, die unwegsamen Flecken liegen
 *  anders, und jede Bahn muss neu gedacht werden - was gleich bleibt, ist das
 *  Biom. Die Vorbilder machen es genauso: Kingdom Rush baut eine ganze Welt
 *  aus einem Kachelsatz.
 *
 *  Zwei Bahnen, und sie sind absichtlich ungleich: eine lange, gewundene und
 *  eine kurze, direkte. Wer beide gleich behandelt, verliert an der kurzen. */
export const MAP_FARNKESSEL: GameMap = {
  id: 'farnkessel',
  name: 'Farnkessel',
  blurb: 'Zwei Wege, einer kurz. Der Kessel liegt im Schatten.',
  palette: FARN,
  lanes: [
    // Die lange: von unten rechts durch den ganzen Kessel, drei Saeulen im
    // Abstand von 350 - dazwischen steht ein Turm und sieht beide Seiten.
    [
      { x: 1500, y: 1160, w: 44 }, { x: 1440, y: 1020, w: 48 },
      { x: 1420, y: 870, w: 50 }, { x: 1416, y: 720, w: 50 },
      { x: 1430, y: 600, w: 48 }, { x: 1370, y: 530, w: 44 },
      { x: 1260, y: 520, w: 44 }, { x: 1150, y: 575, w: 46 },
      { x: 1090, y: 700, w: 50 }, { x: 1086, y: 860, w: 50 },
      { x: 1090, y: 1000, w: 48 }, { x: 1020, y: 1062, w: 44 },
      { x: 910, y: 1062, w: 44 }, { x: 820, y: 990, w: 46 },
      { x: 770, y: 860, w: 50 }, { x: 766, y: 710, w: 50 },
      { x: 780, y: 590, w: 48 }, { x: 700, y: 520, w: 44 },
      { x: 570, y: 520, w: 46 }, { x: 440, y: 540, w: 48 },
      { x: 310, y: 510, w: 52 }, { x: 186, y: 454, w: 60 },
    ],
    // Die zweite: von unten links durch den Kessel, und ab dem Farnriegel
    // laufen beide dieselbe Strecke. Eine Gabelung, keine zwei Strassen -
    // der Waechter verlangt beides: hoechstens 30 % Laengenunterschied und
    // ein gemeinsames Stueck.
    [
      { x: 700, y: 1160, w: 44 }, { x: 720, y: 1020, w: 46 },
      { x: 640, y: 910, w: 48 }, { x: 500, y: 880, w: 48 },
      { x: 380, y: 935, w: 48 }, { x: 285, y: 845, w: 48 },
      { x: 290, y: 705, w: 50 }, { x: 340, y: 585, w: 48 },
      { x: 460, y: 530, w: 46 }, { x: 590, y: 570, w: 46 },
      { x: 660, y: 690, w: 48 }, { x: 780, y: 730, w: 48 },
      { x: 880, y: 660, w: 46 }, { x: 850, y: 560, w: 44 },
      { x: 780, y: 590, w: 48 }, { x: 700, y: 520, w: 44 },
      { x: 570, y: 520, w: 46 }, { x: 440, y: 540, w: 48 },
      { x: 310, y: 510, w: 52 }, { x: 186, y: 454, w: 60 },
    ],
  ],
  rough: [
    { x: 435, y: 214, r: 147, art: 'locker', farbe: '#171604' },
    { x: 1607, y: 780, r: 134, art: 'locker', farbe: '#181708' },
    { x: 618, y: 113, r: 72, art: 'locker', farbe: '#171605' },
    { x: 1270, y: 296, r: 69, art: 'locker', farbe: '#232314' },
    { x: 1142, y: 162, r: 55, art: 'locker', farbe: '#28281b' },
    { x: 1323, y: 184, r: 37, art: 'locker', farbe: '#2e2e23' },
    { x: 1144, y: 362, r: 36, art: 'locker', farbe: '#171a05' },
    { x: 249, y: 916, r: 32, art: 'locker', farbe: '#26240f' },
  ],
  bildBringt: { weg: false, gelaende: true },
  hint: { x: 1700, y: 200 },
  ziel: { x: 186, y: 454 },   // gemessen mit `npm run zielplatte`
  waves: PLAN_FARNKESSEL,
  balance: { hpMul: 1.0, goldMul: 1.0 },
};

export const MAPS: GameMap[] = [MAP_SPIRALHAIN, MAP_ASCHESCHLUCHT, MAP_FROSTSPALTE,
  MAP_FARNKESSEL];

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
