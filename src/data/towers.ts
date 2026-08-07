export type TowerId = 'arrow' | 'frost';

export interface TowerLevel {
  cost: number;      // Kosten fuer diese Stufe (Stufe 1 = Baukosten)
  damage: number;
  range: number;     // Pixel
  cooldown: number;  // Sekunden zwischen Schuessen
  slow?: number;     // 0..1 Geschwindigkeitsreduktion
  slowTime?: number; // Sekunden
}

export interface TowerDef {
  id: TowerId;
  name: string;
  blurb: string;
  color: string;
  accent: string;
  projectileSpeed: number;
  levels: TowerLevel[];
}

export const TOWERS: Record<TowerId, TowerDef> = {
  arrow: {
    id: 'arrow',
    name: 'Bogenturm',
    blurb: 'Schnell, guenstig, trifft ein Ziel.',
    color: '#D8DCE8',
    accent: '#F2C14E',
    projectileSpeed: 700,
    levels: [
      { cost: 55, damage: 9, range: 205, cooldown: 0.55 },
      { cost: 65, damage: 15, range: 230, cooldown: 0.48 },
      { cost: 120, damage: 26, range: 260, cooldown: 0.40 },
    ],
  },
  frost: {
    id: 'frost',
    name: 'Frostturm',
    blurb: 'Wenig Schaden, bremst alles im Umkreis.',
    color: '#BFE9F2',
    accent: '#7FE7E0',
    projectileSpeed: 520,
    levels: [
      { cost: 80, damage: 3, range: 170, cooldown: 0.9, slow: 0.35, slowTime: 1.6 },
      { cost: 90, damage: 6, range: 190, cooldown: 0.8, slow: 0.45, slowTime: 1.9 },
      { cost: 150, damage: 10, range: 215, cooldown: 0.7, slow: 0.55, slowTime: 2.3 },
    ],
  },
};

export const TOWER_ORDER: TowerId[] = ['arrow', 'frost'];

/** Rueckgabewert beim Verkauf: 70 % der bisher investierten Summe. */
export function sellValue(def: TowerDef, level: number): number {
  let spent = 0;
  for (let i = 0; i < level; i++) spent += def.levels[i].cost;
  return Math.floor(spent * 0.7);
}
