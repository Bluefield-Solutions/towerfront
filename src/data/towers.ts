import { WORLD_W } from './config';

export type TowerId = 'arrow' | 'frost' | 'mortar' | 'prism';

/** Wie ein Turm angreift. Der Angriffstyp bestimmt die Rolle im Feld,
 *  nicht die Zahlenhoehe - sonst waeren es nur Varianten voneinander. */
export type AttackKind =
  | 'single'  // Einzelziel, Geschoss
  | 'aura'    // Dauerpuls im Umkreis, kein Geschoss
  | 'splash'  // ballistisches Geschoss mit Flaechenschaden
  | 'chain';  // Sofortstrahl, springt weiter

export interface TowerLevel {
  cost: number;
  damage: number;
  /** Nur noch Ergebnis, nie Eingabe.
   *
   *  Die Reichweite kommt aus `rangeFor` und wird von `statsFor` eingesetzt.
   *  Ein hier eingetragener Wert wird ueberschrieben - deshalb steht in den
   *  Daten auch keiner mehr. Wer die Reichweite aendern will, aendert
   *  REICHWEITE_GRUND, REICHWEITE_STUFE oder REICHWEITE_ZWEIG. */
  range?: number;
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
  branches: [TowerBranch, TowerBranch];
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
};

export const TOWER_ORDER: TowerId[] = ['arrow', 'frost', 'mortar', 'prism'];

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
  if (branch === null) return null; // Der Zweig muss erst gewaehlt werden.
  return statsFor(def, branch, level + 1);
}

/** Farbe, die den gewaehlten Zweig sichtbar macht. */
export function accentFor(def: TowerDef, branch: BranchIndex): string {
  return branch === null ? def.accent : def.branches[branch].color;
}

/** Rueckgabewert beim Verkauf. Der Anteil haengt an den dauerhaften
 *  Verbesserungen und liegt zwischen 70 und 85 %. */
export function sellValue(
  def: TowerDef, branch: BranchIndex, level: number, refund = 0.7,
): number {
  let spent = def.base.cost;
  if (branch !== null) {
    for (let i = 0; i < level - 1; i++) spent += def.branches[branch].levels[i].cost;
  }
  return Math.floor(spent * refund);
}
