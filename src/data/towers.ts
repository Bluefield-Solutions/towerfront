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
}

export interface TowerDef {
  id: TowerId;
  name: string;
  role: string;
  blurb: string;
  color: string;
  accent: string;
  attack: AttackKind;
  projectileSpeed: number;
  levels: TowerLevel[];
}

export const TOWERS: Record<TowerId, TowerDef> = {
  arrow: {
    id: 'arrow', name: 'Bogenturm', role: 'Dauerfeuer',
    blurb: 'Guenstig und schnell. Traegt die fruehen Wellen, verliert spaeter gegen Panzerung.',
    color: '#D8DCE8', accent: '#F2C14E',
    attack: 'single', projectileSpeed: 700,
    levels: [
      { cost: 55, damage: 8, range: 200, cooldown: 0.55 },
      { cost: 60, damage: 13, range: 222, cooldown: 0.50 },
      { cost: 105, damage: 21, range: 248, cooldown: 0.44 },
    ],
  },
  frost: {
    id: 'frost', name: 'Frostturm', role: 'Umkreis-Bremse',
    blurb: 'Kein Geschoss. Pulst im Umkreis, bremst alles gleichzeitig und kratzt an der Huelle.',
    color: '#BFE9F2', accent: '#7FE7E0',
    attack: 'aura', projectileSpeed: 0,
    levels: [
      { cost: 85, damage: 4, range: 148, cooldown: 0.85, slow: 0.34, slowTime: 1.5 },
      { cost: 95, damage: 7, range: 166, cooldown: 0.78, slow: 0.44, slowTime: 1.8 },
      { cost: 165, damage: 12, range: 188, cooldown: 0.70, slow: 0.54, slowTime: 2.2 },
    ],
  },
  mortar: {
    id: 'mortar', name: 'Moerser', role: 'Flaechenschlag',
    blurb: 'Langsam und teuer, trifft eine ganze Traube auf einmal. Zielt vorausschauend.',
    color: '#C3B39A', accent: '#F08A3C',
    attack: 'splash', projectileSpeed: 320,
    levels: [
      { cost: 130, damage: 30, range: 250, cooldown: 1.9, splash: 62 },
      { cost: 140, damage: 48, range: 272, cooldown: 1.75, splash: 70 },
      { cost: 230, damage: 78, range: 300, cooldown: 1.6, splash: 82 },
    ],
  },
  prism: {
    id: 'prism', name: 'Prisma', role: 'Kettenblitz',
    blurb: 'Sofortstrahl, springt auf Nachbarn ueber. Stark gegen dichte Ketten, teuer im Aufbau.',
    color: '#E4D3FF', accent: '#B07CFF',
    attack: 'chain', projectileSpeed: 0,
    levels: [
      { cost: 155, damage: 13, range: 185, cooldown: 0.95, chains: 2, falloff: 0.65 },
      { cost: 165, damage: 20, range: 205, cooldown: 0.88, chains: 3, falloff: 0.7 },
      { cost: 275, damage: 32, range: 228, cooldown: 0.8, chains: 4, falloff: 0.75 },
    ],
  },
};

export const TOWER_ORDER: TowerId[] = ['arrow', 'frost', 'mortar', 'prism'];

/** Rueckgabewert beim Verkauf: 70 % der bisher investierten Summe. */
export function sellValue(def: TowerDef, level: number): number {
  let spent = 0;
  for (let i = 0; i < level; i++) spent += def.levels[i].cost;
  return Math.floor(spent * 0.7);
}
