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
  range: number;
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
  /** Platzbedarf in Weltpixeln.
   *
   *  Er ist zugleich die Zeichengroesse: ein Turm wird `footprint * DRAW_SCALE`
   *  breit gemalt. Bis v51 waren beide Zahlen unabhaengig - gezeichnet wurde
   *  jeder Turm 81 Pixel breit, stehen durfte ein Bogenturm aber schon 48
   *  Pixel neben dem naechsten. Ergebnis: 46 % Ueberlappung, die Tuerme sahen
   *  aus wie ein Haufen statt wie Gebaeude.
   *
   *  Jetzt haengt das eine am anderen, und ein Waechter haelt es fest. */
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
export const DRAW_SCALE = 1.25;

export const TOWERS: Record<TowerId, TowerDef> = {
  arrow: {
    id: 'arrow', footprint: 62, name: 'Bogenturm', role: 'Dauerfeuer',
    blurb: 'Günstig und schnell. Trägt die frühen Wellen.',
    color: '#D8DCE8', accent: '#F2C14E',
    attack: 'single', hitsAir: true, projectileSpeed: 840,
    base: { cost: 55, damage: 8, range: 240, cooldown: 0.55 },
    branches: [
      {
        id: 'sniper', name: 'Scharfschütze', color: '#F2C14E',
        blurb: 'Weite Reichweite, harter Einzelschuss, durchschlägt Panzerung.',
        levels: [
          { cost: 70, damage: 29, range: 330, cooldown: 0.8, pierce: 2 },
          { cost: 130, damage: 63, range: 408, cooldown: 0.75, pierce: 4 },
          { cost: 265, damage: 102, range: 442, cooldown: 0.73, pierce: 4 },
          { cost: 545, damage: 166, range: 479, cooldown: 0.71, pierce: 5 },
          { cost: 1115, damage: 268, range: 519, cooldown: 0.69, pierce: 5 },
        ],
      },
      {
        id: 'volley', name: 'Salve', color: '#FF9B54',
        blurb: 'Halbe Wucht, doppelte Schlagzahl. Gegen Masse, nicht gegen Panzer.',
        levels: [
          { cost: 70, damage: 16, range: 300, cooldown: 0.27, pierce: 1 },
          { cost: 145, damage: 26, range: 319, cooldown: 0.20, pierce: 2 },
          { cost: 295, damage: 35, range: 326, cooldown: 0.17, pierce: 2 },
          { cost: 605, damage: 47, range: 333, cooldown: 0.15, pierce: 3 },
          { cost: 1240, damage: 64, range: 340, cooldown: 0.14, pierce: 3 },
        ],
      },
    ],
  },
  frost: {
    id: 'frost', footprint: 72, name: 'Frostturm', role: 'Umkreis-Bremse',
    blurb: 'Kein Geschoss. Pulst im Umkreis und bremst alles gleichzeitig.',
    color: '#BFE9F2', accent: '#7FE7E0',
    attack: 'aura', hitsAir: true, projectileSpeed: 0,
    base: { cost: 80, damage: 5, range: 169, cooldown: 0.85, slow: 0.3, slowTime: 1.5 },
    branches: [
      {
        id: 'eternal', name: 'Ewiges Eis', color: '#7FE7E0',
        blurb: 'Weiter Umkreis, harte Bremse, kaum Schaden. Reine Kontrolle.',
        levels: [
          { cost: 90, damage: 11, range: 220, cooldown: 0.7, slow: 0.37, slowTime: 1.98 },
          { cost: 150, damage: 22, range: 282, cooldown: 0.58, slow: 0.54, slowTime: 3.06 },
          { cost: 310, damage: 35, range: 310, cooldown: 0.53, slow: 0.61, slowTime: 3.65 },
          { cost: 635, damage: 56, range: 341, cooldown: 0.49, slow: 0.62, slowTime: 4.34 },
          { cost: 1300, damage: 89, range: 375, cooldown: 0.45, slow: 0.62, slowTime: 5.17 },
        ],
      },
      {
        id: 'shard', name: 'Splitterfrost', color: '#9FD4FF',
        blurb: 'Bremst weniger, schneidet dafür. Ein Schadenspuls statt einer Fessel.',
        levels: [
          { cost: 110, damage: 25, range: 237, cooldown: 0.64, slow: 0.25, slowTime: 1.4, pierce: 2 },
          { cost: 200, damage: 40, range: 264, cooldown: 0.56, slow: 0.3, slowTime: 1.6, pierce: 2 },
          { cost: 410, damage: 54, range: 274, cooldown: 0.53, slow: 0.32, slowTime: 1.68, pierce: 2 },
          { cost: 840, damage: 73, range: 286, cooldown: 0.5, slow: 0.33, slowTime: 1.76, pierce: 3 },
          { cost: 1720, damage: 98, range: 297, cooldown: 0.47, slow: 0.35, slowTime: 1.85, pierce: 3 },
        ],
      },
    ],
  },
  mortar: {
    id: 'mortar', footprint: 96, name: 'Mörser', role: 'Fläche, nur Boden',
    blurb: 'Langsam und teuer, trifft eine ganze Traube. Erreicht keine Flieger.',
    color: '#C3B39A', accent: '#F08A3C',
    attack: 'splash', hitsAir: false, projectileSpeed: 384,
    base: { cost: 125, damage: 41, range: 300, cooldown: 1.9, splash: 74 },
    branches: [
      {
        id: 'cluster', name: 'Streubombe', color: '#F08A3C',
        blurb: 'Weiter Wirkradius, schnellere Folge, weniger Wucht je Treffer.',
        levels: [
          { cost: 140, damage: 47, range: 330, cooldown: 1.35, splash: 115 },
          { cost: 235, damage: 74, range: 360, cooldown: 1.1, splash: 149 },
          { cost: 480, damage: 97, range: 371, cooldown: 1.0, splash: 164 },
          { cost: 985, damage: 129, range: 383, cooldown: 0.91, splash: 181 },
          { cost: 2020, damage: 170, range: 395, cooldown: 0.83, splash: 200 },
        ],
      },
      {
        id: 'breaker', name: 'Brecher', color: '#D6564A',
        blurb: 'Enger Radius, gewaltige Wucht, durchschlägt schwere Panzerung.',
        levels: [
          { cost: 160, damage: 106, range: 318, cooldown: 2.1, splash: 62, pierce: 4 },
          { cost: 280, damage: 224, range: 348, cooldown: 2.0, splash: 70, pierce: 8 },
          { cost: 575, damage: 355, range: 359, cooldown: 1.96, splash: 73, pierce: 8 },
          { cost: 1180, damage: 563, range: 371, cooldown: 1.92, splash: 76, pierce: 9 },
          { cost: 2420, damage: 894, range: 383, cooldown: 1.88, splash: 79, pierce: 9 },
        ],
      },
    ],
  },
  prism: {
    id: 'prism', footprint: 80, name: 'Prisma', role: 'Kettenblitz',
    blurb: 'Sofortstrahl, springt auf Nachbarn über.',
    color: '#E4D3FF', accent: '#B07CFF',
    attack: 'chain', hitsAir: true, projectileSpeed: 0,
    base: { cost: 140, damage: 20, range: 222, cooldown: 0.95, chains: 2, falloff: 0.65 },
    branches: [
      {
        id: 'fork', name: 'Verzweigung', color: '#B07CFF',
        blurb: 'Mehr Sprünge, kaum Abfall. Legt sich über eine ganze Kette.',
        levels: [
          { cost: 165, damage: 21, range: 246, cooldown: 0.85, chains: 5, falloff: 0.85 },
          { cost: 285, damage: 32, range: 276, cooldown: 0.75, chains: 8, falloff: 0.92 },
          { cost: 585, damage: 43, range: 288, cooldown: 0.71, chains: 8, falloff: 0.92 },
          { cost: 1200, damage: 55, range: 300, cooldown: 0.67, chains: 9, falloff: 0.92 },
          { cost: 2460, damage: 72, range: 313, cooldown: 0.63, chains: 9, falloff: 0.92 },
        ],
      },
      {
        id: 'lens', name: 'Bündelung', color: '#FF7ADF',
        blurb: 'Ein Sprung weniger, dafür ein Strahl, der wirklich wehtut.',
        levels: [
          { cost: 175, damage: 54, range: 258, cooldown: 0.9, chains: 1, falloff: 0.5 },
          { cost: 300, damage: 108, range: 288, cooldown: 0.85, chains: 1, falloff: 0.5, pierce: 3 },
          { cost: 615, damage: 166, range: 300, cooldown: 0.83, chains: 1, falloff: 0.5, pierce: 3 },
          { cost: 1260, damage: 254, range: 312, cooldown: 0.81, chains: 2, falloff: 0.5, pierce: 4 },
          { cost: 2585, damage: 391, range: 325, cooldown: 0.79, chains: 2, falloff: 0.5, pierce: 4 },
        ],
      },
    ],
  },
};

export const TOWER_ORDER: TowerId[] = ['arrow', 'frost', 'mortar', 'prism'];

/** Zweig 0 oder 1, oder null solange der Turm auf Stufe 1 steht. */
export type BranchIndex = 0 | 1 | null;

/** Werte eines Turms auf einer bestimmten Stufe. */
export function statsFor(def: TowerDef, branch: BranchIndex, level: number): TowerLevel {
  if (level <= 1 || branch === null) return def.base;
  return def.branches[branch].levels[Math.min(level, MAX_LEVEL) - 2];
}

/** Werte der naechsten Stufe innerhalb eines Zweiges, oder null am Ende. */
export function nextFor(def: TowerDef, branch: BranchIndex, level: number): TowerLevel | null {
  if (level >= MAX_LEVEL) return null;
  if (branch === null) return null; // Der Zweig muss erst gewaehlt werden.
  return def.branches[branch].levels[level - 1];
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
