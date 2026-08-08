export type EnemyId =
  | 'crawler' | 'runner' | 'brute' | 'titan' | 'flyer' | 'splitter' | 'splitling';

export interface SplitRule {
  into: EnemyId;
  count: number;
  /** Anteil der Lebenspunkte des Erzeugers, den jedes Bruchstueck erhaelt. */
  hpFactor: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number;   // Pixel pro Sekunde
  bounty: number;  // Gold beim Toeten
  leak: number;    // Schaden am Herzkristall beim Durchkommen
  radius: number;
  armor: number;   // Flacher Abzug pro Treffer, mindestens 1 Schaden bleibt
  slowResist: number; // 0..1, wie stark die Bremse abgeschwaecht wird
  /** Fliegt die Luftlinie statt dem Pfad zu folgen. Bodengebundene Waffen
   *  - der Moerser - erreichen ihn nicht. */
  flying?: boolean;
  /** Zerfaellt beim Tod. */
  split?: SplitRule;
  boss?: boolean;
  body: string;
  trim: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  crawler: {
    id: 'crawler', name: 'Schleicher',
    hp: 34, speed: 95, bounty: 2, leak: 1, radius: 17, armor: 0, slowResist: 0,
    body: '#8B5CF6', trim: '#C9B6FF',
  },
  runner: {
    id: 'runner', name: 'Späher',
    hp: 24, speed: 172, bounty: 2, leak: 1, radius: 14, armor: 0, slowResist: 0,
    body: '#E2566A', trim: '#FFB3BE',
  },
  brute: {
    id: 'brute', name: 'Koloss',
    hp: 150, speed: 62, bounty: 7, leak: 3, radius: 24, armor: 3, slowResist: 0.3,
    body: '#3F5A8A', trim: '#9FC0E8',
  },
  flyer: {
    id: 'flyer', name: 'Gleiter',
    hp: 62, speed: 118, bounty: 4, leak: 2, radius: 16, armor: 0, slowResist: 0.2,
    flying: true,
    body: '#3ED9A4', trim: '#C7FFE9',
  },
  splitter: {
    id: 'splitter', name: 'Spalter',
    hp: 130, speed: 78, bounty: 6, leak: 2, radius: 22, armor: 1, slowResist: 0.15,
    split: { into: 'splitling', count: 2, hpFactor: 0.3 },
    body: '#E8873C', trim: '#FFD9A8',
  },
  splitling: {
    id: 'splitling', name: 'Span',
    hp: 40, speed: 148, bounty: 1, leak: 1, radius: 12, armor: 0, slowResist: 0,
    body: '#F2B173', trim: '#FFE9CC',
  },
  titan: {
    id: 'titan', name: 'Leerentitan',
    hp: 1100, speed: 44, bounty: 48, leak: 5, radius: 36, armor: 6, slowResist: 0.55,
    boss: true,
    body: '#2A1B4D', trim: '#B07CFF',
  },
};
