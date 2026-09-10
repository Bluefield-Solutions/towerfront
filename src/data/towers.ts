import { WORLD_W } from './config';

/** Die vier kaufbaren Tuerme - und die Zielunit.
 *
 *  **`core` steht hier drin, aber NICHT in `TOWER_ORDER`.** Sie ist ein Turm
 *  in allem, was zaehlt: sie zielt, schiesst, wird ausgebaut und rechnet
 *  ihren Schaden mit. Nur kaufen kann man sie nicht - sie steht von Anfang
 *  an da, und verkaufen kann man sie auch nicht.
 *
 *  Das ist die Antwort auf Regel 15: eine zweite, eigene Fassung von
 *  "etwas, das ein Ziel sucht und darauf schiesst" waere ein Nachbau
 *  gewesen, und Nachbauten veralten. Jede Torpruefung laeuft ueber
 *  `TOWER_ORDER`, also sieht keine von ihnen die Zielunit - und keine
 *  musste dafuer angefasst werden. */
export type TowerId = 'arrow' | 'frost' | 'mortar' | 'prism' | 'foerderer' | 'werft' | 'bann' | 'core';

/** Wie ein Turm angreift. Der Angriffstyp bestimmt die Rolle im Feld,
 *  nicht die Zahlenhoehe - sonst waeren es nur Varianten voneinander. */
export type AttackKind =
  | 'single'  // Einzelziel, Geschoss
  | 'aura'    // Dauerpuls im Umkreis, kein Geschoss
  | 'splash'  // ballistisches Geschoss mit Flaechenschaden
  | 'chain'   // Sofortstrahl, springt weiter
  | 'keiner'; // schiesst gar nicht - der Foerderer (S-N3-01)

/** Eine Ausbaustufe, wie sie in den Daten steht.
 *
 *  Hier stand bis v147 ein `range?: number` mit dem Kommentar "nur noch
 *  Ergebnis, nie Eingabe" - ein Feld, das in den Daten an NULL Stellen
 *  gesetzt und von `statsFor` immer ueberschrieben wurde. Ein Schacht, in
 *  den nie jemand etwas legt, ist keine Schnittstelle, sondern eine
 *  Einladung zum Missverstaendnis. Die Reichweite kommt aus `rangeFor`;
 *  wer sie aendern will, aendert REICHWEITE_GRUND, REICHWEITE_STUFE oder
 *  REICHWEITE_ZWEIG. `TowerStats` traegt sie als Pflichtfeld. */
export interface TowerLevel {
  cost: number;
  damage: number;
  cooldown: number;
  slow?: number;      // 0..1
  slowTime?: number;  // Sekunden
  splash?: number;    // Radius in Pixeln
  chains?: number;    // zusaetzliche Spruenge
  falloff?: number;   // Schadensfaktor je Sprung
  pierce?: number;    // Panzerung, die durchschlagen wird
}

/** Ein Ausbauzweig. Ab Stufe 2 entscheidet man sich fuer genau einen von
 *  zweien - und die Entscheidung ist endgueltig. Damit ist jede Platzierung
 *  auch eine Bauentscheidung und nicht nur eine Positionsentscheidung; das ist
 *  der Kern, aus dem Bloons TD 6 seine Tiefe bezieht. */
export interface TowerBranch {
  id: string;
  name: string;
  blurb: string;
  color: string;
  /** Werte fuer Stufe 2 und Stufe 3. */
  /** Die Stufen 2 bis 6 dieses Zweiges. */
  levels: TowerLevel[];
}

export interface TowerDef {
  /** Platzbedarf in Weltpixeln: was der Turm am BODEN beansprucht.
   *
   *  Er entscheidet, wie dicht zwei Tuerme stehen duerfen - und damit, wie
   *  teuer eine schwere Stellung in Flaeche ist. Er ist NICHT die
   *  Zeichengroesse; die ist fuer alle Sorten gleich (TURM_BREITE), damit
   *  nicht wieder zwei Massstaebe im selben Bild stehen.
   *
   *  Der Waechter haelt beide Enden fest: die Zeichengroesse einheitlich und
   *  den Platzbedarf in einem Band um sie herum. Ein Turm, der viel mehr
   *  Boden beansprucht, als er bedeckt, waere eine unsichtbare Sperre. */
  footprint: number;
  id: TowerId;
  name: string;
  role: string;
  blurb: string;
  color: string;
  accent: string;
  attack: AttackKind;
  hitsAir: boolean;
  projectileSpeed: number;
  /** Stufe 1 - vor der Verzweigung. */
  base: TowerLevel;
  /** Ein Zweig oder zwei.
   *
   *  Die vier kaufbaren Tuerme haben ZWEI: ab Stufe 2 entscheidet man sich,
   *  und die Entscheidung ist endgueltig. Die Zielunit hat EINEN - eine
   *  Verzweigung an dem Bauwerk, das man nicht verlieren darf, waere eine
   *  Falle ohne Ausweg, denn verkaufen und neu setzen geht dort nicht.
   *
   *  `npm run guards` haelt beides fest: vier Tuerme mit genau zwei Zweigen,
   *  die Zielunit mit genau einem. */
  branches: TowerBranch[];
}

export const MAX_LEVEL = 6;

/** Wie breit ein Turm im Verhaeltnis zu seinem Platzbedarf gemalt wird.
 *
 *  Ueber 1,0 ragt er ueber seinen Platz hinaus - das ist gewollt, sonst wirkt
 *  er wie hineingequetscht. Ueber etwa 1,3 fangen Nachbarn an, sich zu
 *  ueberdecken. */
/** Wie breit ein Turm GEZEICHNET wird - fuer alle Sorten gleich.
 *
 *  Das ist die Lehre aus v84, und sie gilt weiter: damals hatte jeder Turm
 *  seinen eigenen Wert, und weil die Zeichengroesse daran hing, war der
 *  Moerser 1,5-mal so breit wie der Bogenturm und in der Flaeche mehr als
 *  doppelt so gross. Nebeneinander sah das nicht nach verschiedenen Rollen
 *  aus, sondern nach verschiedenen MASSSTAEBEN - als waeren die Bilder aus
 *  zwei Spielen. Genau der Eindruck, den dieses Verzeichnis seither
 *  bekaempft.
 *
 *  Der Fehler war aber nicht der eigene Platzbedarf, sondern die KOPPLUNG:
 *  eine Zahl trug zwei Bedeutungen. Seit v139 sind es zwei Zahlen. Diese
 *  hier ist die Zeichengroesse und bleibt einheitlich. */
export const TURM_BREITE = 96;

/** Der KLEINSTE Platzbedarf, und zugleich der Standard: was ein Turm am
 *  BODEN beansprucht - der Abstand, den er zum naechsten haelt, und die
 *  Flaeche, die er anderen wegnimmt.
 *
 *  Nach unten ist hier Schluss, und das ist gemessen: bei einem Platzbedarf
 *  von 84 stehen zwei Bogentuerme 88 Punkte auseinander und sind 127 breit
 *  gezeichnet - 26 % Ueberdeckung, und der Waechter schlaegt an. Die
 *  Zeichenbreite ist der Boden, unter den der Platzbedarf nicht darf. Frei
 *  ist nur die Richtung nach OBEN: die schwere Stellung kostet mehr Flaeche,
 *  die leichte kostet die wenigste.
 *
 *  Nicht mehr die Zeichengroesse (siehe TURM_BREITE). Damit ist wieder
 *  moeglich, was das Konzept seit jeher behauptet und was seit v84 nicht
 *  stimmte: dass die schwere Stellung mehr Boden kostet als die leichte.
 *  Sichtbar wird der Unterschied dort, wo er hingehoert - am Boden, im
 *  Kontaktschatten und im Bauring -, nicht an der Hoehe der Figur. */
export const FOOTPRINT = 96;

export const DRAW_SCALE = 1.32;

/** Wieviel hoeher als breit ein Turm gezeichnet wird.
 *
 *  In die Breite geht nichts mehr: bei DRAW_SCALE 1,32 ueberdecken sich zwei
 *  Nachbarn schon zu 21 % und der Waechter laesst 22 % zu. Breite kostet
 *  Boden, Hoehe nicht - ein Turm waechst nach oben aus seiner Standflaeche
 *  heraus, und die Standflaeche bleibt, was sie war.
 *
 *  Das ist zugleich der Grund, warum die Tuerme flach wirkten: das Bild ist
 *  quadratisch, also war ein Turm so hoch wie sein Grundriss breit. Ein
 *  Gebaeude in Dreiviertelansicht ist das nie.
 *
 *  Die Grenze liegt bei 1,25. Darueber sieht man dem quadratisch gerenderten
 *  Bild die Streckung an - der Sockel wird zum Oval, und die Ansicht kippt
 *  optisch nach oben, waehrend der Rest der Szene bleibt. */
export const TURM_HOEHE = 1.16;

export const TOWERS: Record<TowerId, TowerDef> = {
  arrow: {
    id: 'arrow', footprint: FOOTPRINT, name: 'Bogenturm', role: 'Dauerfeuer',
    blurb: 'Günstig und schnell. Trägt die frühen Wellen.',
    color: '#D8DCE8', accent: '#F2C14E',
    attack: 'single', hitsAir: true, projectileSpeed: 840,
    base: { cost: 55, damage: 8, cooldown: 0.55 },
    branches: [
      {
        id: 'sniper', name: 'Scharfschütze', color: '#F2C14E',
        blurb: 'Weite Reichweite, harter Einzelschuss, durchschlägt Panzerung.',
        levels: [
          { cost: 70, damage: 29, cooldown: 0.8, pierce: 2 },
          { cost: 115, damage: 63, cooldown: 0.75, pierce: 4 },
          { cost: 185, damage: 102, cooldown: 0.73, pierce: 4 },
          { cost: 300, damage: 166, cooldown: 0.71, pierce: 5 },
          { cost: 480, damage: 268, cooldown: 0.69, pierce: 5 },
        ],
      },
      {
        id: 'volley', name: 'Salve', color: '#FF9B54',
        blurb: 'Halbe Wucht, doppelte Schlagzahl. Gegen Masse, nicht gegen Panzer.',
        levels: [
          { cost: 70, damage: 16, cooldown: 0.27, pierce: 1 },
          { cost: 115, damage: 26, cooldown: 0.20, pierce: 2 },
          { cost: 185, damage: 35, cooldown: 0.17, pierce: 2 },
          { cost: 300, damage: 47, cooldown: 0.15, pierce: 3 },
          { cost: 480, damage: 64, cooldown: 0.14, pierce: 3 },
        ],
      },
    ],
  },
  frost: {
    id: 'frost', footprint: 100, name: 'Frostturm', role: 'Umkreis-Bremse',
    blurb: 'Kein Geschoss. Pulst im Umkreis und bremst alles gleichzeitig.',
    color: '#BFE9F2', accent: '#7FE7E0',
    attack: 'aura', hitsAir: true, projectileSpeed: 0,
    base: { cost: 80, damage: 5, cooldown: 0.85, slow: 0.3, slowTime: 1.5 },
    branches: [
      {
        id: 'eternal', name: 'Ewiges Eis', color: '#7FE7E0',
        blurb: 'Weiter Umkreis, harte Bremse, kaum Schaden. Reine Kontrolle.',
        levels: [
          { cost: 90, damage: 11, cooldown: 0.7, slow: 0.315, slowTime: 1.98 },
          { cost: 145, damage: 22, cooldown: 0.58, slow: 0.459, slowTime: 3.06 },
          { cost: 235, damage: 35, cooldown: 0.53, slow: 0.518, slowTime: 3.65 },
          { cost: 385, damage: 56, cooldown: 0.49, slow: 0.527, slowTime: 4.34 },
          { cost: 620, damage: 89, cooldown: 0.45, slow: 0.527, slowTime: 5.17 },
        ],
      },
      {
        id: 'shard', name: 'Splitterfrost', color: '#9FD4FF',
        blurb: 'Bremst weniger, schneidet dafür. Ein Schadenspuls statt einer Fessel.',
        levels: [
          { cost: 110, damage: 25, cooldown: 0.64, slow: 0.25, slowTime: 1.4, pierce: 2 },
          { cost: 180, damage: 40, cooldown: 0.56, slow: 0.3, slowTime: 1.6, pierce: 2 },
          { cost: 290, damage: 54, cooldown: 0.53, slow: 0.32, slowTime: 1.68, pierce: 2 },
          { cost: 470, damage: 73, cooldown: 0.5, slow: 0.33, slowTime: 1.76, pierce: 3 },
          { cost: 760, damage: 98, cooldown: 0.47, slow: 0.35, slowTime: 1.85, pierce: 3 },
        ],
      },
    ],
  },
  mortar: {
    id: 'mortar', footprint: 116, name: 'Mörser', role: 'Fläche, nur Boden',
    blurb: 'Langsam und teuer, trifft eine ganze Traube. Erreicht keine Flieger.',
    color: '#C3B39A', accent: '#F08A3C',
    attack: 'splash', hitsAir: false, projectileSpeed: 384,
    base: { cost: 125, damage: 41, cooldown: 1.9, splash: 74 },
    branches: [
      {
        id: 'cluster', name: 'Streubombe', color: '#F08A3C',
        blurb: 'Weiter Wirkradius, schnellere Folge, weniger Wucht je Treffer.',
        levels: [
          { cost: 140, damage: 47, cooldown: 1.35, splash: 115 },
          { cost: 225, damage: 74, cooldown: 1.1, splash: 149 },
          { cost: 365, damage: 97, cooldown: 1.0, splash: 164 },
          { cost: 595, damage: 129, cooldown: 0.91, splash: 181 },
          { cost: 965, damage: 170, cooldown: 0.83, splash: 200 },
        ],
      },
      {
        id: 'breaker', name: 'Brecher', color: '#D6564A',
        blurb: 'Enger Radius, gewaltige Wucht, durchschlägt schwere Panzerung.',
        levels: [
          { cost: 160, damage: 106, cooldown: 2.1, splash: 62, pierce: 4 },
          { cost: 260, damage: 224, cooldown: 2.0, splash: 70, pierce: 8 },
          { cost: 420, damage: 355, cooldown: 1.96, splash: 73, pierce: 8 },
          { cost: 680, damage: 563, cooldown: 1.92, splash: 76, pierce: 9 },
          { cost: 1100, damage: 894, cooldown: 1.88, splash: 79, pierce: 9 },
        ],
      },
    ],
  },
  prism: {
    id: 'prism', footprint: 106, name: 'Prisma', role: 'Kettenblitz',
    blurb: 'Sofortstrahl, springt auf Nachbarn über.',
    color: '#E4D3FF', accent: '#B07CFF',
    attack: 'chain', hitsAir: true, projectileSpeed: 0,
    base: { cost: 140, damage: 20, cooldown: 0.95, chains: 2, falloff: 0.65 },
    branches: [
      {
        id: 'fork', name: 'Verzweigung', color: '#B07CFF',
        blurb: 'Mehr Sprünge, kaum Abfall. Legt sich über eine ganze Kette.',
        levels: [
          { cost: 165, damage: 21, cooldown: 0.85, chains: 5, falloff: 0.85 },
          { cost: 265, damage: 32, cooldown: 0.75, chains: 8, falloff: 0.92 },
          { cost: 435, damage: 43, cooldown: 0.71, chains: 8, falloff: 0.92 },
          { cost: 700, damage: 55, cooldown: 0.67, chains: 9, falloff: 0.92 },
          { cost: 1135, damage: 72, cooldown: 0.63, chains: 9, falloff: 0.92 },
        ],
      },
      {
        id: 'lens', name: 'Bündelung', color: '#FF7ADF',
        blurb: 'Ein Sprung weniger, dafür ein Strahl, der wirklich wehtut.',
        levels: [
          { cost: 175, damage: 54, cooldown: 0.9, chains: 1, falloff: 0.5 },
          { cost: 285, damage: 108, cooldown: 0.85, chains: 1, falloff: 0.5, pierce: 3 },
          { cost: 460, damage: 166, cooldown: 0.83, chains: 1, falloff: 0.5, pierce: 3 },
          { cost: 745, damage: 254, cooldown: 0.81, chains: 2, falloff: 0.5, pierce: 4 },
          { cost: 1205, damage: 391, cooldown: 0.79, chains: 2, falloff: 0.5, pierce: 4 },
        ],
      },
    ],
  },
  /** **Der Foerderer** (S-N3-01): belegt einen Bauplatz, schiesst nicht,
   *  erhoeht die Beute in seinem Umkreis.
   *
   *  Alle drei Vorbilder machen Einkommen zu einer BAUentscheidung - Command
   *  Tower, Miner, House. Towerfront hatte bis v284 nur Abschussbeute und
   *  Wellenbonus: Gold kam von selbst, und die einzige Frage war, wann man es
   *  ausgibt. Der Foerderer stellt die Frage davor: wofuer gibt man den PLATZ
   *  her.
   *
   *  Er hat wie jeder andere zwei Zweige - **Ertrag** bringt mehr je Gegner,
   *  **Weite** deckt mehr Flaeche ab. Beides ist Einkommen, und beides ist
   *  eine andere Wette: mehr je Kopf lohnt an einer engen Stelle, mehr
   *  Flaeche an einer, wo die Wege auseinanderlaufen. */
  foerderer: {
    id: 'foerderer', footprint: FOOTPRINT, name: 'Förderer', role: 'Einkommen',
    blurb: 'Schiesst nicht. Was in seinem Umkreis stirbt, bringt mehr Gold.',
    color: '#C7B27A', accent: '#F2C14E',
    attack: 'keiner', hitsAir: false, projectileSpeed: 0,
    // Teurer als der Bogenturm und billiger als der Moerser: er soll gegen
    // den fruehen Ausbau konkurrieren, nicht gegen den spaeten.
    base: { cost: 90, damage: 0, cooldown: 0 },
    branches: [
      {
        // **Zweig 0 ist der weite** - gemessen, nicht gewaehlt: die
        // Reichweitenkurve gibt ihm das 1,84-fache ueber sechs Stufen, dem
        // anderen das 1,40-fache. Wer die Namen andersherum setzt, hat einen
        // Zweig namens "Weite", der weniger Weite bringt.
        id: 'weite', name: 'Weite', color: '#7FE7E0',
        blurb: 'Mehr Fläche, kleinerer Zuschlag. Lohnt, wo die Wege auseinanderlaufen.',
        levels: [
          { cost: 110, damage: 0, cooldown: 0 },
          { cost: 170, damage: 0, cooldown: 0 },
          { cost: 250, damage: 0, cooldown: 0 },
          { cost: 360, damage: 0, cooldown: 0 },
          { cost: 500, damage: 0, cooldown: 0 },
        ],
      },
      {
        id: 'ertrag', name: 'Ertrag', color: '#F2C14E',
        blurb: 'Mehr Gold je Gegner, kleinere Fläche. Lohnt an einer engen Stelle.',
        levels: [
          { cost: 110, damage: 0, cooldown: 0 },
          { cost: 170, damage: 0, cooldown: 0 },
          { cost: 250, damage: 0, cooldown: 0 },
          { cost: 360, damage: 0, cooldown: 0 },
          { cost: 500, damage: 0, cooldown: 0 },
        ],
      },
    ],
  },
  /** **Die Werft** (v290, S-N3-04) - der Kristall laesst sich reparieren.
   *
   *  Der Kristall konnte bisher nur fallen. Rogue Tower macht die
   *  Lebenspunkte zu einer Ressource, in die man investiert; damit
   *  konkurriert derselbe Bauplatz zwischen **Feuerkraft, Einkommen und
   *  Kristall**, und "der Bauplatz ist die haerteste Knappheit" ist der
   *  Befund aus zwei der drei Vorbilder.
   *
   *  **Sie wirkt global, nicht im Umkreis** - und das ist die Lehre aus v285.
   *  Der Foerderer hat einen Umkreis von 230 Weltpunkten und bringt gemessen
   *  -1,8 bis +2,4 % Gold; die Ursache war die FORM, nicht die Zahl. Der
   *  Kristall steht an einer Stelle der Karte, ein Umkreis um ihn herum
   *  waere keine Entscheidung, sondern eine Bauvorschrift. Die Werft steht,
   *  wo Platz ist, und ihre Wirkung haengt an der Zeit statt am Ort.
   *
   *  Teurer als jedes Geschuetz: sie kauft keine Verteidigung, sondern
   *  Fehlertoleranz, und das darf nicht der billigere Weg sein. */
  werft: {
    id: 'werft', footprint: FOOTPRINT, name: 'Werft', role: 'Kristall',
    blurb: 'Schiesst nicht. Setzt nach jeder Welle ein Stück des Kristalls zusammen.',
    color: '#8FB8D8', accent: '#7FE7E0',
    attack: 'keiner', hitsAir: false, projectileSpeed: 0,
    base: { cost: 150, damage: 0, cooldown: 0 },
    branches: [
      {
        id: 'takt', name: 'Takt', color: '#7FE7E0',
        blurb: 'Mehr Kristall je Welle. Lohnt, wenn oft etwas durchkommt.',
        levels: [
          { cost: 130, damage: 0, cooldown: 0 },
          { cost: 200, damage: 0, cooldown: 0 },
          { cost: 290, damage: 0, cooldown: 0 },
          { cost: 410, damage: 0, cooldown: 0 },
          { cost: 560, damage: 0, cooldown: 0 },
        ],
      },
      {
        id: 'schmelze', name: 'Schmelze', color: '#F2C14E',
        blurb: 'Weniger je Welle, dafür wächst der Kristall über sein Maß hinaus.',
        levels: [
          { cost: 130, damage: 0, cooldown: 0 },
          { cost: 200, damage: 0, cooldown: 0 },
          { cost: 290, damage: 0, cooldown: 0 },
          { cost: 410, damage: 0, cooldown: 0 },
          { cost: 560, damage: 0, cooldown: 0 },
        ],
      },
    ],
  },
  /** **Der Bannturm** (v295, C3) - er macht die NACHBARN besser.
   *
   *  Der Punkt steht seit v40 im Verzeichnis, und der Referenzabgleich liegt
   *  seit v258 vor. Was ihn von Foerderer und Werft trennt, ist die
   *  Richtung: die beiden wirken auf Gegner und auf den Kristall, dieser
   *  wirkt auf die eigenen TUERME - und aendert damit, **wohin** gebaut
   *  wird. Alle drei Vorbilder des Abgleichs (Monkey Village, Torchwood,
   *  Buff Beam) tun genau das.
   *
   *  **Warum das jetzt zaehlt und nicht irgendwann:** v293 hat gemessen,
   *  dass die Turmwahl sechs Punkte ausmacht und die Zweigwahl gar nichts.
   *  Ein Gebaeude, das die Lage des Nachbarn belohnt, ist der erste Grund,
   *  warum eine Stellung anders ausgeht als die andere.
   *
   *  **Die Zahlen sind gemessen, nicht gesetzt** (Abgleich, Abschnitt "Daraus
   *  die Stärke"): in einem Umkreis von 190 Weltpunkten stehen unbedacht 2,2
   *  Tuerme und absichtlich gebaut 5,3 - Faktor 2,4. Bei 90 Gold kostet er
   *  1,64 Bogentuerme; +40 % Feuerrate bringen damit unbedacht 0,88 (ein
   *  spuerbarer Verlust) und absichtlich 2,12 (ein klarer Gewinn). Genau die
   *  Spanne, die S5 des Abgleichs verlangt: es darf keine Lage geben, in der
   *  er immer richtig ist. */
  bann: {
    id: 'bann', footprint: FOOTPRINT, name: 'Bannturm', role: 'Verstärkung',
    blurb: 'Schiesst nicht. Nachbartürme in seinem Umkreis feuern schneller.',
    color: '#A88FD0', accent: '#C9A7FF',
    attack: 'keiner', hitsAir: false, projectileSpeed: 0,
    base: { cost: 90, damage: 0, cooldown: 0 },
    branches: [
      {
        id: 'weite', name: 'Weite', color: '#7FE7E0',
        blurb: 'Mehr Fläche, kleinerer Zuschlag. Lohnt über einer weiten Stellung.',
        levels: [
          { cost: 110, damage: 0, cooldown: 0 },
          { cost: 170, damage: 0, cooldown: 0 },
          { cost: 250, damage: 0, cooldown: 0 },
          { cost: 360, damage: 0, cooldown: 0 },
          { cost: 500, damage: 0, cooldown: 0 },
        ],
      },
      {
        id: 'bann', name: 'Bann', color: '#C9A7FF',
        blurb: 'Mehr Feuerrate, kleinere Fläche. Lohnt über einem dichten Nest.',
        levels: [
          { cost: 110, damage: 0, cooldown: 0 },
          { cost: 170, damage: 0, cooldown: 0 },
          { cost: 250, damage: 0, cooldown: 0 },
          { cost: 360, damage: 0, cooldown: 0 },
          { cost: 500, damage: 0, cooldown: 0 },
        ],
      },
    ],
  },
  core: {
    id: 'core', footprint: 200, name: 'Zielunit', role: 'Letzte Linie',
    blurb: 'Steht von Anfang an und schiesst mit. Ausbau kostet ein Vielfaches.',
    color: '#C9D4E4', accent: '#7FE7E0',
    attack: 'single', hitsAir: true, projectileSpeed: 900,
    // Stufe 1 ist ABSICHTLICH schwach und kostet nichts: die Station steht
    // von Anfang an da, und ein starkes Geschenk zu Beginn haette die ganze
    // fruehe Balance verschoben. Wer sie zur Waffe machen will, bezahlt.
    base: { cost: 0, damage: 10, cooldown: 0.9 },
    branches: [
      {
        id: 'geschuetzring', name: 'Geschützring', color: '#7FE7E0',
        blurb: 'Die acht Türme der Station werden aufgerüstet. Teuer, aber sie steht dort, wo alles ankommt.',
        // Teurer als jede Turmlinie, und zwar mit Abstand: 5500 Gold gegen
        // 3010 beim Prisma, der teuersten der acht Turmlinien - das
        // 1,83-fache. Ein ganzer Durchgang bringt gemessen rund 7300 Gold
        // (`npm run sim`), die Zielunit voll auszubauen kostet also gut zwei
        // Drittel des Einkommens einer Partie. Das ist die Vorgabe des
        // Nutzers ("hier muss es aber teurer sein"), und `npm run guards`
        // prueft sie - sonst waere es eine Behauptung im Kommentar.
        //
        // Nicht zugleich staerker: auf Stufe 6 macht sie 382 Schaden je
        // Sekunde, der beste Turm 495. Teurer UND staerker waere keine
        // Entscheidung, sondern die einzige richtige.
        levels: [
          { cost: 400, damage: 30, cooldown: 0.82, pierce: 1 },
          { cost: 650, damage: 60, cooldown: 0.74, pierce: 2 },
          { cost: 1000, damage: 100, cooldown: 0.66, pierce: 2 },
          { cost: 1500, damage: 150, cooldown: 0.60, pierce: 3 },
          { cost: 1950, damage: 210, cooldown: 0.55, pierce: 3 },
        ],
      },
    ],
  },
};

/** Wieviel mehr Beute ein Gegner bringt, der im Umkreis EINES Foerderers
 *  stirbt (S-N3-01).
 *
 *  **Die Zahl kommt aus der Referenz, nicht aus mir** (Regel 10). Defense
 *  Grids Command Tower bringt 125 / 135 / 145 % fuer je 300 Gold und schiesst
 *  nicht; das ist der Vergleichsfall, weil er wie hier einen Bauplatz belegt.
 *  25 % ist seine erste Stufe.
 *
 *  Mehrere Foerderer im selben Umkreis addieren sich NICHT unbegrenzt: der
 *  Zuschlag ist gedeckelt, sonst waere die Antwort auf jede Karte "erst sechs
 *  Foerderer, dann Tuerme". */
/** **Wiederholung wird teurer** (v286, S-N3-02).
 *
 *  Nichts sprach bisher dagegen, viermal denselben Turm zu bauen - und genau
 *  daran haengt die Zweigwirkung, seit v253 die schwaechste aller
 *  Spannungskennzahlen. Alle drei Vorbilder verteuern das Haeufen: Rogue
 *  Tower jeden weiteren Turm derselben Art, Infinitode jeden weiteren Miner,
 *  Defense Grid nimmt 25 % beim Verkauf.
 *
 *  Der Zuschlag ist ANTEILIG am Grundpreis, nicht absolut (Regel 2): sonst
 *  traefe er den Bogenturm fuer 55 viermal so hart wie das Prisma fuer 140,
 *  und die teuren Tuerme waeren die, die man haeuft.
 *
 *  Die Hoehe ist durchprobiert, nicht gesetzt - der Wert steht unten am
 *  Messergebnis. */
export const WIEDERHOLUNG_ZUSCHLAG: number = 0.10;

/** **Wieviel jede WEITERE Turmart an einem Gegner seine Beute hebt**
 *  (v299, S-N3-03).
 *
 *  Das Gegenstueck zum Wiederholungsaufschlag: der macht Haeufen teurer,
 *  dies macht Mischen eintraeglicher. Rogue Tower gibt dafuer **+1 Gold je
 *  Art** - und diese Form traegt hier nicht, das ist gemessen und nicht
 *  gemeint: die Beute liegt bei 1 bis 7 Gold (Boss 48), ein flaches +1 waere
 *  auf dem Schleicher eine Verdopplung. Regel 10 gilt fuer die Form eines
 *  Vorbilds, Regel 2 fuer ihre Groesse - anteilig, nicht absolut.
 *
 *  **Der Fall ist gemessen, bevor die Zahl gesetzt wurde** (Regel 9):
 *  im gemischten Feld beschaedigen im Mittel **2,23** Turmarten einen
 *  Gegner, und die Verteilung ist keine Randerscheinung -
 *  1 Art 25,3 %, 2 Arten 32,8 %, 3 Arten 23,5 %, 4 Arten 15,5 %
 *  (2,9 % sterben ganz ohne Turm: Faehigkeiten, Kernraub, Zielunit).
 *  Sie trennt die Karten deutlich: Spiralhain 12 % Einzelart, Farnkessel
 *  46 %.
 *
 *  **Die Beute ist ganzzahlig, und das entscheidet ueber den Wert mit.** Bei
 *  Beute 2 hebt ein Zuschlag von 0,10 auf 2,2 und rundet zurueck auf 2 - die
 *  Regel waere fuer den haeufigsten Gegner unsichtbar. Was ankommt, faengt
 *  bei zwei Arten erst ab 0,25 an; darunter belohnt sie die dicken Gegner
 *  frueher als die duennen. */
/** **Scharf gestellt in v301 - und was ihn zwei Runden aufgehalten hat, war
 *  eine Zusage ohne Rauschband.**
 *
 *  Gemessen WIRKT die Regel, sauber getrennt: am gesetzten 0,10 bekommt der
 *  Haeufer auf jeder der vier Karten **+0 Gold** und der Mischer **+58 bis
 *  +170**. Die Null ist keine Schaetzung, sondern die Bauart - wer mit einer
 *  Turmart toetet, hat an jedem Gegner `arten = 1`, und dann steht der
 *  Faktor auf genau 1.
 *
 *  **Der Wert ist durchprobiert, nicht gesetzt** (Regel 9) - und das Fenster
 *  ist enger, als die Balance allein sagt. Nach oben schliesst es **C18**:
 *
 *  | Zuschlag | erste Karte mit einer Faehigkeit |
 *  |---|---|
 *  | 0 | gewonnen, 17/42 |
 *  | 0,05 | gewonnen, 17/42 |
 *  | 0,08 | gewonnen, **19/42** |
 *  | **0,10** | gewonnen, **19/42** |
 *  | 0,12 | gewonnen, 15/42 |
 *  | 0,15 | **verloren in Welle 14** |
 *
 *  Dass MEHR Gold die Eroeffnung verliert, ist Wegabhaengigkeit: der Bot
 *  kauft frueher etwas anderes, und der Verlauf kippt. Gesetzt ist **0,10** -
 *  dort steht C18 mit 19 gegen 17 Kristall besser da als ohne die Regel, und
 *  zwei Werte darunter halten ebenfalls. Es ist eine Flaeche, keine Nadel.
 *
 *  **C18 faehrt dabei EINE Aussaat**, und die Kante bei 0,15 ist steil - das
 *  steht als Messluecke daneben und ist in dieser Runde ausdruecklich NICHT
 *  repariert worden (v219: nicht in der Runde, in der die eigene Aenderung
 *  daran scheitert).
 *
 *  Die Balance zieht die Grenze weiter oben: bei 0,25 faellt die Trennung
 *  des Wiederholungsaufschlags von 599 auf 113 Gold und reisst ihre eigene
 *  Grenze von 200. Nach unten traegt 0,05 nichts (9 Gold Trennung).
 *
 *  **Warum es zwei Runden gedauert hat, und das ist die eigentliche Lehre.**
 *  In v299 meldete die Zusage aus S-N3-02, der Aufschlag koste den perfekten
 *  Verteiler 2 von 42 Kristall. Sie stand auf EINEM Lauf je Karte gegen eine
 *  harte Null - und ueber die Aussaaten gemessen schwankt dieselbe Zahl auf
 *  der Ascheschlucht um **12**. v300 hat ihr das Band gegeben, das an ihre
 *  Messstelle gehoert (Regel 12); dieselben -2 lesen sich jetzt als
 *  **-2 / +0 / +0, Mittel -0,7 bei Rauschen 2** - innerhalb des Bandes, also
 *  keine Aussage.
 *
 *  Die Reihenfolge war Absicht: eine Zusage in derselben Runde zu
 *  reparieren, in der die eigene Aenderung an ihr scheitert, waere kein
 *  Beweis (v219). Erst das Band auf eigener Grundlage, dann der Schalter.
 *
 *  **Was die Beute je Gegner traegt, steht darueber** - 2,23 Turmarten im
 *  Mittel, und die Karten trennen sich von 12 % Einzelart (Spiralhain) bis
 *  46 % (Farnkessel). */
export const VIELFALT_BEUTE: number = 0.10;

/** Die Beute eines Gegners samt Vielfaltsanteil.
 *
 *  `arten` ist die Zahl VERSCHIEDENER Turmarten, die ihn beschaedigt haben -
 *  nicht die Zahl der Treffer. Wer mit einer Art toetet, bekommt genau die
 *  Grundbeute; erst die zweite Art hebt etwas. */
export function vielfaltsBeute(
  grund: number, arten: number, zuschlag: number = VIELFALT_BEUTE,
): number {
  return grund * (1 + Math.max(0, arten - 1) * zuschlag);
}

/** **Auf Null, und das ist eine Messung, keine Abschaltung** (v286).
 *
 *  Die Mechanik steht vollstaendig: `baupreis` rechnet, der Knopf zeigt den
 *  Aufschlag, der Turm merkt sich, was er gekostet hat, der Bot weicht aus.
 *  Sie ist auch nachweislich wirksam - `wiederholungMessen` in `npm run sim`
 *  nimmt dem Haeufer 693 Gold ab und dem Verteiler 0 bis 349.
 *
 *  Scharf gestellt wird sie trotzdem nicht, und der Grund ist gemessen:
 *
 *  1. **Am Ergebnis aendert sie nichts.** Derselbe Bot mit und ohne
 *     Aufschlag endet bei 0 / -6 / 0 / +1 Kristall ueber die vier Karten.
 *     Bei 28 % uebrigem Gold entscheidet ein Preis nichts - die Knappheit,
 *     die S-N3-03 herstellen soll, ist die Voraussetzung dieser Story und
 *     nicht ihre Folge.
 *  2. **Die Ratsche, an der sie scheitert, misst hier Rauschen.** "Abstand
 *     der Spielstile" steht bei Zuschlag 0,15 auf 1,46, bei 0,25 auf 11,64
 *     und bei 0,35 auf 4,50 - zehn Punkte Spanne ueber einen Parameter, der
 *     die drei Stile gar nicht unterscheidet, denn sie fahren alle DIESELBE
 *     Turmliste. Angegeben ist ein Rauschen von 3 bis 5.
 *
 *  Die Ratsche in derselben Runde zu lockern, in der die eigene Aenderung an
 *  ihr scheitert, waere kein Beweis mehr (v219). Sie bekommt eine eigene
 *  Runde; der Befund steht als M18. Bis dahin ist die Zahl hier Null - und
 *  eine Null, die ihren Grund mittraegt, ist ehrlicher als eine Zahl, die
 *  aus einer nicht-monotonen Messung gefischt ist (M1). */

/** Wieviele Tuerme derselben Art zum Grundpreis stehen duerfen.
 *
 *  **Diese Zahl ist gemessen, und ohne sie ist die ganze Mechanik falsch.**
 *  Das Spiel hat VIER Geschuetze. Wer zwoelf Tuerme stellt, hat damit
 *  zwangslaeufig drei je Sorte - auch dann, wenn er nichts haeuft, sondern
 *  perfekt verteilt. Ein Zuschlag ab dem zweiten Turm ist deshalb keine
 *  Strafe fuer Wiederholung, sondern eine globale Verteuerung: gemessen an
 *  `npm run c18`, dessen Bot die vier Sorten REIHUM baut, kippte ohne
 *  Freimenge schon ein Zuschlag von 0,10 die erste Karte - und 0,15, 0,20,
 *  0,25 und 0,35 genauso.
 *
 *  **Drei, weil zwoelf Tuerme durch vier Sorten drei ergeben.** Wer
 *  gleichmaessig verteilt, zahlt damit gar nichts; erst der dreizehnte Turm
 *  kostet drauf, und der ist die erste Wiederholung, die eine ist. Die Zahl
 *  kommt also aus dem Spiel und nicht aus einem Durchlauf - und das ist hier
 *  wichtiger, als es klingt: ueber neun gemessene Punkte (Freimenge 1 bis 3
 *  gegen Zuschlag 0,20 / 0,35 / 0,50) laeuft C18 NICHT MONOTON. Bei
 *  Freimenge 1 gewinnt 0,35, waehrend 0,20 und 0,50 verlieren. Das ist kein
 *  Zusammenhang, das ist der Bot an einer Kante - dieselbe Auskunft wie beim
 *  Foerderer in v285, und wer daraus eine Zahl ableitet, justiert gegen
 *  Zufall (M1). Freimenge 3 gewinnt an allen drei Zuschlaegen und ueber alle
 *  drei Aussaaten.
 *
 *  Die Vorbilder haben dieses Problem nicht, weil sie mehr Turmarten haben -
 *  Rogue Tower ueber ein Dutzend. Dort IST "der zweite Bogenturm" eine Wahl;
 *  hier waere er eine Pflicht mit Aufpreis. Regel 10 gilt fuer die Form
 *  eines Vorbilds, nicht nur fuer seine Zahl (dieselbe Lehre wie beim
 *  Foerderer in v285). */
export const WIEDERHOLUNG_FREI = 3;

/** Wieviel der n-te Turm derselben Art kostet, als Faktor auf den Grundpreis.
 *
 *  `gebaut` ist die Zahl der bereits stehenden Tuerme dieser Art. Der erste
 *  kostet also immer den Grundpreis; erst der zweite zahlt drauf.
 *
 *  **Linear, nicht exponentiell.** Exponentiell ist beim vierten Turm bei
 *  Faktor 2,5 und beim sechsten bei 4,6 - das ist kein "teurer", das ist ein
 *  Verbot mit Umweg. Eine Entscheidung braucht beide Seiten: der vierte
 *  Bogenturm muss kaufbar bleiben und sich dabei falsch anfuehlen. */
export function wiederholungsFaktor(
  gebaut: number, zuschlag = WIEDERHOLUNG_ZUSCHLAG,
): number {
  return 1 + Math.max(0, gebaut - WIEDERHOLUNG_FREI) * zuschlag;
}

export const FOERDER_BONUS = 0.25;
export const FOERDER_DECKEL = 0.75;

/** Welcher Zweig des Foerderers der Ertrags-Zweig ist.
 *
 *  Eine Zahl statt einer Zeichenkette, weil `Tower.branch` eine Zahl ist -
 *  und hier statt an drei Stellen, weil sie sonst dreimal dastuende. */
export const FOERDER_ERTRAG_ZWEIG = 1;

/** Der Zuschlag EINES Foerderers, nach Zweig und Stufe.
 *
 *  Der Ertrags-Zweig steigt je Stufe um 8 Prozentpunkte, der weite um 3 -
 *  dafuer waechst dessen Reichweite ueber sechs Stufen auf das 1,84-fache
 *  statt auf das 1,40-fache. Mehr je Kopf gegen mehr Koepfe; das ist die
 *  Entscheidung, und sie ist in beiden Richtungen bezahlt. */
export function foerderZuschlag(branch: 0 | 1 | null, level: number): number {
  const schritt = branch === FOERDER_ERTRAG_ZWEIG ? 0.08 : 0.03;
  return FOERDER_BONUS + Math.max(0, level - 1) * schritt;
}

/** **Um wieviel EIN Bannturm die Feuerrate eines Nachbarn hebt** (v295, C3).
 *
 *  0,40 auf Stufe 1 ist gemessen und nicht gewaehlt: bei 90 Gold kostet der
 *  Turm 1,64 Bogentuerme, und in einem Umkreis von 190 Weltpunkten stehen
 *  unbedacht 2,2 Nachbarn, absichtlich gebaut 5,3. Damit bringt er unbedacht
 *  0,88 und absichtlich 2,12 - die Wette aus S5.
 *
 *  Der Bann-Zweig steigt je Stufe um 10 Prozentpunkte, der weite um 4 -
 *  dafuer waechst dessen Reichweite staerker. Mehr je Turm gegen mehr
 *  Tuerme, dieselbe Frage wie beim Foerderer. */
export const BANN_ZWEIG = 1;
export const BANN_GRUND = 0.40;

export function bannZuschlag(branch: 0 | 1 | null, level: number): number {
  const schritt = branch === BANN_ZWEIG ? 0.10 : 0.04;
  return BANN_GRUND + Math.max(0, level - 1) * schritt;
}

/** **Zwei Bannmale ueber demselben Turm summieren sich nicht** (S6).
 *
 *  Der zweite zaehlt halb, jeder weitere gar nicht - sonst wird aus der
 *  Wette eine Rechenaufgabe, und die Antwort heisst "so viele wie moeglich".
 *  Bloons deckelt sein Dorf aus demselben Grund ausdruecklich. */
export function bannStapel(zuschlaege: number[]): number {
  const sortiert = [...zuschlaege].sort((a, b) => b - a);
  return (sortiert[0] ?? 0) + (sortiert[1] ?? 0) * 0.5;
}

/** **Wieviel Kristall EINE Werft je abgeschlossener Welle zurueckgibt.**
 *
 *  Zwei Zweige, zwei Fragen: `Takt` setzt mehr je Welle zusammen, `Schmelze`
 *  weniger - dafuer waechst mit ihr der Kristall ueber sein urspruengliches
 *  Mass hinaus. Wer viel durchlaesst, nimmt den Takt; wer selten trifft,
 *  aber dann hart, nimmt die Schmelze und baut sich einen Puffer.
 *
 *  Die Zahlen sind durchprobiert, nicht gesetzt - der Stand steht am
 *  Messergebnis in `docs/Towerfront-BACKLOG.md`. */
export const WERFT_TAKT_ZWEIG = 0;
export const WERFT_GRUND = 1;

export function werftErtrag(branch: 0 | 1 | null, level: number): number {
  const schritt = branch === WERFT_TAKT_ZWEIG ? 0.5 : 0.2;
  return WERFT_GRUND + Math.max(0, level - 1) * schritt;
}

/** Um wieviel die Schmelze das HOECHSTMASS des Kristalls je Stufe hebt.
 *
 *  Das ist ihr eigentlicher Handel: Rogue Towers Mine gibt +1 Hoechstleben je
 *  Stufe, und dieselbe Bewegung macht aus einer Reparatur eine Investition -
 *  wer frueh baut, spielt am Ende mit einem groesseren Kristall.
 *
 *  Anteilig am Startkristall, nicht absolut (Regel 2): der Kristall ist von
 *  20 auf 42 gewachsen, und fuenf Pruefungen wurden damals still
 *  bedeutungslos, weil sie in Punkten rechneten. */
export const WERFT_HOECHSTMASS_ANTEIL = 0.03;

export function werftHoechstmass(branch: 0 | 1 | null, level: number): number {
  if (branch === WERFT_TAKT_ZWEIG) return 0;
  return Math.max(0, level - 1) * WERFT_HOECHSTMASS_ANTEIL;
}

/** Die kaufbaren Tuerme, in der Reihenfolge der Bauleiste.
 *
 *  Die Zielunit steht hier NICHT: sie wird nicht gebaut. Jede Torpruefung
 *  laeuft ueber diese Liste, nicht ueber `TOWERS` - deshalb hat der fuenfte
 *  Eintrag keine einzige davon angefasst. */
export const TOWER_ORDER: TowerId[] = ['arrow', 'frost', 'mortar', 'prism'];

/** Was der Spieler bauen kann - die vier Geschuetze UND der Foerderer.
 *
 *  **Warum zwei Listen und nicht eine** (die Frage ist Regel 15, und die
 *  Antwort ist: es sind zwei Gegenstaende). `TOWER_ORDER` ist die Liste der
 *  GESCHUETZE, und an ihr haengen zwei Dutzend Torpruefungen, die alle von
 *  Schaden, Reichweite und Zweigen handeln: "jede Stufe bringt Reichweite",
 *  "die Grundreichweiten liegen 1,5-fach auseinander", "kein Turm traegt mehr
 *  als 40 % des Schadens". Auf ein Gebaeude, das nicht schiesst, ist keine
 *  davon anwendbar - der Foerderer haette sie reihenweise rot gemacht, und
 *  die einzige Reparatur waere gewesen, ueberall eine Ausnahme
 *  einzuraeumen. Eine Ausnahme, die man einmal einraeumt, bleibt stehen, bis
 *  niemand mehr weiss, dass sie eine war (v235).
 *
 *  Gefragt wird diese Liste ueberall dort, wo es um die BAULEISTE geht:
 *  Bedienung, Bildvorrat, Bildbestellung. */
/** **Der Bannturm steht hier NICHT, und das ist gemessen** (v295).
 *
 *  Er ist vollstaendig gebaut: `bannVon` rechnet, der Waechter haelt vier
 *  Zusagen, `npm run sim` faehrt ihn mit einem Bot, der absichtlich um ihn
 *  herum baut. Kaufbar ist er trotzdem noch nicht - die BAULEISTE traegt kein
 *  siebtes Bauwerk.
 *
 *  Gemessen mit `npm run uxaudit`: mit sieben Knoepfen steht die Belegung bei
 *  16,3 / 27,0 / 35,0 / 16,3 % gegen Grenzen von 16 / 26 / 35 / 16 - alle
 *  vier Zustaende reissen. v294 hat die Knoepfe schon auf 46 Punkte gebracht,
 *  zwei ueber der Beruehrungsgrenze, und dabei stand der Satz: wer ein
 *  siebtes Bauwerk will, braucht eine andere Anordnung, keine schmaleren
 *  Knoepfe.
 *
 *  Zwei Reihen helfen nicht - gemessen wird FLAECHE, und sieben Knoepfe
 *  brauchen mehr davon als sechs, ob unter- oder nebeneinander. Was hier
 *  fehlt, ist eine Entscheidung ueber die Bedienung (ein Aufklapper fuer die
 *  Gebaeude? weniger Faehigkeitsknoepfe?), und die gehoert dem Nutzer.
 *
 *  Bis dahin steht die Mechanik da wie der Wiederholungsaufschlag seit v287:
 *  gebaut, geprueft, mit ihrem Grund daneben. */
export const BAU_ORDER: TowerId[] = [...TOWER_ORDER, 'foerderer', 'werft'];

/** Der guenstigste Turm - er entscheidet, ob ein Platz ueberhaupt taugt.
 *  Was dort nicht steht, steht nirgends.
 *
 *  Stand bis v238 in `core/input.ts` und wird seit v238 an einer zweiten
 *  Stelle gebraucht (`state.reset` waehlt ihn vor, damit die baubare Flaeche
 *  vom ersten Bild an im Bild steht). Zwei Fassungen waeren eine zu viel
 *  (Regel 15): gepflegt wuerde die eine, gefragt die andere. */
export const guenstigsterTurm = (): TowerId =>
  TOWER_ORDER.reduce((a, b) => (TOWERS[a].base.cost <= TOWERS[b].base.cost ? a : b));

/** Zweig 0 oder 1, oder null solange der Turm auf Stufe 1 steht. */
export type BranchIndex = 0 | 1 | null;

/** Werte eines Turms auf einer bestimmten Stufe. */
/* ────────────────────────── Das Reichweitensystem ──────────────────────────
 *
 *  Bis v70 stand jede Reichweite als eigene Zahl in den Stufendaten - 45
 *  Stueck von Hand. Das Ergebnis war Wildwuchs: der Frostturm wuchs ueber
 *  seine Zweige um das 2,2-fache, der Moerser um das 1,28-fache. Zwei
 *  Ausbauten kosteten dasselbe und brachten voellig Verschiedenes, ohne dass
 *  es jemand entschieden haette.
 *
 *  Jetzt folgt die Reichweite drei Regeln:
 *
 *  1. **Sie ist ein Anteil der Feldbreite, keine Pixelzahl.** Ein Feld ist
 *     1920 breit; eine Reichweite von 300 sagt nichts, "ein Sechstel des
 *     Feldes" schon. Aendert sich die Feldgroesse, stimmen die Verhaeltnisse
 *     weiter.
 *
 *  2. **Der Grundwert traegt die Rolle.** Der Frostturm bremst in seiner
 *     Umgebung und ist deshalb kurz; der Moerser schlaegt weit hinten ein und
 *     ist lang. Der Abstand zwischen kuerzestem und laengstem betraegt das
 *     Doppelte - genug, dass die Wahl beim Bauen eine Rolle spielt.
 *
 *  3. **Jede Stufe bringt spuerbar mehr.** Die Kurve ist fuer alle gleich und
 *     endet bei Stufe 6 beim 1,62-fachen. Der Zuwachs je Stufe faellt leicht
 *     ab, damit die ersten Ausbauten sich lohnen und die letzten nicht
 *     ueberdrehen.
 *
 *  4. **Der Zweig neigt die Kurve.** Ein Zweig steht fuer Weite, der andere
 *     fuer Wucht - der eine bekommt den Zuwachs anderthalbfach, der andere
 *     halb. Damit ist die Zweigwahl auch raeumlich eine Entscheidung und
 *     nicht nur eine Schadenszahl.
 */

/** Grundreichweite als Anteil der Feldbreite. */
const REICHWEITE_GRUND: Record<TowerId, number> = {
  frost: 0.125,   // 240 px - bremst, was neben ihm laeuft
  arrow: 0.170,   // 326 px - der Allrounder
  prism: 0.160,   // 307 px - Ketten brauchen Nachbarn in Reichweite
  mortar: 0.225,  // 432 px - schlaegt weit hinten ein
  // Der Foerderer sieht enger als jedes Geschuetz. Das ist die Entscheidung:
  // sein Zuschlag gilt nur dort, wo wirklich gestorben wird, und ein Platz,
  // der viel Beute UND viel Feuer sieht, ist damit doppelt umkaempft.
  foerderer: 0.120,   // 230 px
  // Die Werft wirkt global; ihre Reichweite zeichnet nur den Platzbedarf.
  werft: 0.060,       // 115 px
  // 190 Weltpunkte - der Radius, an dem der Abgleich gemessen hat.
  bann: 0.099,        // 190 px
  // Die Zielunit deckt ihren eigenen Vorplatz, nicht die Karte. Sie steht
  // dort, wo alle Bahnen enden - mit der Weite eines Moersers waere sie der
  // beste Turm im Spiel und noch dazu geschenkt.
  //
  // Der Grundwert ist klein, WEIL der Zuwachs gross ist: `rangeFor` rechnet
  // fuer Zweig 0 mit dem Weiten-Faktor 1,35, also steht am Ende 353 px. Mit
  // 250 als Grund waeren es 459 gewesen - ein Moerser rings um das Ziel.
  core: 0.100,    // 192 px auf Stufe 1, 353 px auf Stufe 6
};

/** Vielfaches der Grundreichweite je Stufe. Fuer alle Tuerme gleich. */
const REICHWEITE_STUFE = [1.00, 1.14, 1.27, 1.39, 1.51, 1.62];

/** Wie stark ein Zweig am Zuwachs zieht. Erster Zweig = Weite.
 *
 *  Der Abstand ist bewusst kleiner als er sein koennte. Bei 1,5 zu 0,5 lag
 *  der Weiten-Zweig 28 Prozent des Kristalls vor dem anderen - Reichweite
 *  wiegt in diesem Spiel schwer, weil sie Wegdeckung bedeutet und nicht nur
 *  Schaden. Wer weiter schiesst, trifft mehr Gegner laenger. Der zweite Zweig
 *  gleicht das mit Wucht aus (siehe WUCHT_AUSGLEICH). */
const REICHWEITE_ZWEIG = [1.35, 0.65];

/** Der Wucht-Zweig bekommt dafuer mehr Schaden - je Turm eigens.
 *
 *  Eine einzige Zahl fuer alle war zu grob: beim Frostturm wiegt Reichweite
 *  schwer, weil die Bremse alles im Umkreis trifft; beim Bogenturm zaehlt
 *  sie weniger, weil er ohnehin nur ein Ziel nimmt. Mit einem gemeinsamen
 *  Wert lagen die Bogenzweige 52 Prozent auseinander.
 *
 *  Ueber 1 begunstigt den Wucht-Zweig, unter 1 den Weiten-Zweig. */
const WUCHT_AUSGLEICH: Record<TowerId, number> = {
  arrow: 0.78,   // Reichweite zaehlt hier wenig - der Weiten-Zweig braucht Hilfe
  frost: 1.10,   // die Bremse trifft alles im Umkreis, Weite wiegt schwer
  mortar: 1.06,
  prism: 1.02,
  // Beim Foerderer heisst der Weiten-Zweig wirklich Weite und der andere
  // Ertrag - Schaden gibt es keinen. Der Eintrag steht hier, weil der Typ
  // ihn verlangt; gewirkt haette er nur auf eine Schadenszahl.
  foerderer: 1,
  // Ebenso die Werft: ihre Zweige heissen Takt und Schmelze, und beide
  // rechnen an Kristall statt an Schaden.
  werft: 1,
  // Und der Bannturm: seine Zweige heissen Weite und Bann, beide ohne
  // Schadenszahl.
  bann: 1,
  // Die Zielunit hat nur einen Zweig, also greift der Ausgleich nie. Der
  // Eintrag steht hier, weil der Typ ihn verlangt, und nicht, weil er wirkt.
  core: 1.00,
};

/** Die Reichweite eines Turms - die eine Stelle, an der sie entsteht. */
export function rangeFor(id: TowerId, branch: BranchIndex, level: number): number {
  const stufe = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)));
  const grund = REICHWEITE_GRUND[id] * WORLD_W;
  const zuwachs = REICHWEITE_STUFE[stufe - 1] - 1;
  const neigung = branch === null ? 1 : REICHWEITE_ZWEIG[branch];
  return Math.round(grund * (1 + zuwachs * neigung));
}

/** Was aus `statsFor` herauskommt: dieselben Werte, aber die Reichweite ist
 *  gesetzt. Die Trennung macht im Typ sichtbar, was der Kommentar an `range`
 *  sagt - Eingabe ohne, Ergebnis mit. */
export type TowerStats = TowerLevel & { range: number };

export function statsFor(def: TowerDef, branch: BranchIndex, level: number): TowerStats {
  const roh = level <= 1 || branch === null
    ? def.base
    : def.branches[branch].levels[Math.min(level, MAX_LEVEL) - 2];
  // Die Reichweite aus den Daten wird ueberschrieben: sie kommt aus dem
  // System, nicht aus 45 handgeschriebenen Zahlen. Der zweite Zweig bekommt
  // den Schadensausgleich fuer seine kuerzere Reichweite.
  const schaden = branch === 1 && level > 1
    ? Math.round(roh.damage * WUCHT_AUSGLEICH[def.id])
    : roh.damage;
  return { ...roh, damage: schaden, range: rangeFor(def.id, branch, level) };
}

/** Werte der naechsten Stufe innerhalb eines Zweiges, oder null am Ende.
 *
 *  **Muss durch dieselbe Aufbereitung laufen wie `statsFor`.** Sonst zeigt das
 *  Ausbaumenue etwas anderes an, als der Ausbau dann liefert - und genau das
 *  war nach der Umstellung auf das Reichweitensystem der Fall: im Menue stand
 *  die alte handgeschriebene Zahl, gebaut wurde die berechnete. Bei Stufe 5
 *  klafften 519 gegen 600 Pixel. */
export function nextFor(def: TowerDef, branch: BranchIndex, level: number): TowerStats | null {
  if (level >= MAX_LEVEL) return null;
  const zweig = branch ?? (def.branches.length === 1 ? 0 : null);
  if (zweig === null) return null; // Der Zweig muss erst gewaehlt werden.
  return statsFor(def, zweig, level + 1);
}

/** Muss dieser Turm sich beim ersten Ausbau fuer einen Zweig entscheiden?
 *
 *  Eine Frage an die DATEN, keine Liste von Ausnahmen: wer einen Zweig hat,
 *  waehlt nicht. So gilt die Antwort auch fuer den naechsten Turm, den
 *  jemand ohne Verzweigung anlegt. */
export function hatZweigwahl(def: TowerDef): boolean {
  return def.branches.length > 1;
}

/** Farbe, die den gewaehlten Zweig sichtbar macht. */
export function accentFor(def: TowerDef, branch: BranchIndex): string {
  return branch === null ? def.accent : def.branches[branch].color;
}

/** Rueckgabewert beim Verkauf. Der Anteil haengt an den dauerhaften
 *  Verbesserungen und liegt zwischen 70 und 85 %. */
export function sellValue(
  def: TowerDef, branch: BranchIndex, level: number, refund = 0.7,
  bezahlt?: number,
): number {
  let spent = bezahlt ?? def.base.cost;
  if (branch !== null) {
    for (let i = 0; i < level - 1; i++) spent += def.branches[branch].levels[i].cost;
  }
  return Math.floor(spent * refund);
}
