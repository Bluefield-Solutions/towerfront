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
  levels: [TowerLevel, TowerLevel];
}

export interface TowerDef {
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

export const MAX_LEVEL = 3;

export const TOWERS: Record<TowerId, TowerDef> = {
  arrow: {
    id: 'arrow', name: 'Bogenturm', role: 'Dauerfeuer',
    blurb: 'Guenstig und schnell. Traegt die fruehen Wellen.',
    color: '#D8DCE8', accent: '#F2C14E',
    attack: 'single', hitsAir: true, projectileSpeed: 700,
    base: { cost: 55, damage: 8, range: 200, cooldown: 0.55 },
    branches: [
      {
        id: 'sniper', name: 'Scharfschuetze', color: '#F2C14E',
        blurb: 'Weite Reichweite, harter Einzelschuss, durchschlaegt Panzerung.',
        levels: [
          { cost: 70, damage: 24, range: 275, cooldown: 0.8, pierce: 2 },
          { cost: 130, damage: 52, range: 340, cooldown: 0.75, pierce: 4 },
        ],
      },
      {
        id: 'volley', name: 'Salve', color: '#FF9B54',
        blurb: 'Halbe Wucht, doppelte Schlagzahl. Gegen Masse, nicht gegen Panzer.',
        levels: [
          { cost: 70, damage: 13, range: 205, cooldown: 0.28, pierce: 1 },
          { cost: 145, damage: 20, range: 215, cooldown: 0.21, pierce: 2 },
        ],
      },
    ],
  },
  frost: {
    id: 'frost', name: 'Frostturm', role: 'Umkreis-Bremse',
    blurb: 'Kein Geschoss. Pulst im Umkreis und bremst alles gleichzeitig.',
    color: '#BFE9F2', accent: '#7FE7E0',
    attack: 'aura', hitsAir: true, projectileSpeed: 0,
    base: { cost: 85, damage: 4, range: 148, cooldown: 0.85, slow: 0.34, slowTime: 1.5 },
    branches: [
      {
        id: 'eternal', name: 'Ewiges Eis', color: '#7FE7E0',
        blurb: 'Weiter Umkreis, harte Bremse, kaum Schaden. Reine Kontrolle.',
        levels: [
          { cost: 90, damage: 9, range: 195, cooldown: 0.7, slow: 0.5, slowTime: 2.2 },
          { cost: 150, damage: 19, range: 250, cooldown: 0.58, slow: 0.72, slowTime: 3.4 },
        ],
      },
      {
        id: 'shard', name: 'Splitterfrost', color: '#9FD4FF',
        blurb: 'Bremst weniger, schneidet dafuer. Ein Schadenspuls statt einer Fessel.',
        levels: [
          { cost: 110, damage: 24, range: 162, cooldown: 0.7, slow: 0.26, slowTime: 1.3, pierce: 2 },
          { cost: 200, damage: 47, range: 182, cooldown: 0.62, slow: 0.32, slowTime: 1.5, pierce: 3 },
        ],
      },
    ],
  },
  mortar: {
    id: 'mortar', name: 'Moerser', role: 'Flaeche, nur Boden',
    blurb: 'Langsam und teuer, trifft eine ganze Traube. Erreicht keine Flieger.',
    color: '#C3B39A', accent: '#F08A3C',
    attack: 'splash', hitsAir: false, projectileSpeed: 320,
    base: { cost: 130, damage: 30, range: 250, cooldown: 1.9, splash: 62 },
    branches: [
      {
        id: 'cluster', name: 'Streubombe', color: '#F08A3C',
        blurb: 'Weiter Wirkradius, schnellere Folge, weniger Wucht je Treffer.',
        levels: [
          { cost: 140, damage: 42, range: 275, cooldown: 1.35, splash: 96 },
          { cost: 235, damage: 66, range: 300, cooldown: 1.1, splash: 124 },
        ],
      },
      {
        id: 'breaker', name: 'Brecher', color: '#D6564A',
        blurb: 'Enger Radius, gewaltige Wucht, durchschlaegt schwere Panzerung.',
        levels: [
          { cost: 160, damage: 95, range: 265, cooldown: 2.1, splash: 52, pierce: 4 },
          { cost: 280, damage: 200, range: 290, cooldown: 2.0, splash: 58, pierce: 8 },
        ],
      },
    ],
  },
  prism: {
    id: 'prism', name: 'Prisma', role: 'Kettenblitz',
    blurb: 'Sofortstrahl, springt auf Nachbarn ueber.',
    color: '#E4D3FF', accent: '#B07CFF',
    attack: 'chain', hitsAir: true, projectileSpeed: 0,
    base: { cost: 155, damage: 13, range: 185, cooldown: 0.95, chains: 2, falloff: 0.65 },
    branches: [
      {
        id: 'fork', name: 'Verzweigung', color: '#B07CFF',
        blurb: 'Mehr Spruenge, kaum Abfall. Legt sich ueber eine ganze Kette.',
        levels: [
          { cost: 165, damage: 19, range: 205, cooldown: 0.85, chains: 5, falloff: 0.85 },
          { cost: 285, damage: 29, range: 230, cooldown: 0.75, chains: 8, falloff: 0.92 },
        ],
      },
      {
        id: 'lens', name: 'Buendelung', color: '#FF7ADF',
        blurb: 'Ein Sprung weniger, dafuer ein Strahl, der wirklich wehtut.',
        levels: [
          { cost: 175, damage: 48, range: 215, cooldown: 0.9, chains: 1, falloff: 0.5 },
          { cost: 300, damage: 96, range: 240, cooldown: 0.85, chains: 1, falloff: 0.5, pierce: 3 },
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

/** Rueckgabewert beim Verkauf: 70 % der bisher investierten Summe. */
export function sellValue(def: TowerDef, branch: BranchIndex, level: number): number {
  let spent = def.base.cost;
  if (branch !== null) {
    for (let i = 0; i < level - 1; i++) spent += def.branches[branch].levels[i].cost;
  }
  return Math.floor(spent * 0.7);
}
