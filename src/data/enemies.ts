export type EnemyId =
  | 'crawler' | 'runner' | 'brute' | 'titan' | 'flyer' | 'splitter' | 'splitling'
  | 'infantry';

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
  /** Das Bild ist eine Aufsicht und wird zur Laufrichtung gedreht.
   *
   *  Die uebrigen Gegner sind Seitenansichten und werden nur gespiegelt - ein
   *  Fahrzeug in Dreiviertelansicht kippt beim Drehen. Eine Aufsicht kippt
   *  nicht, sie dreht sich richtig mit. */
  topdown?: boolean;
  /** Zerfaellt beim Tod. */
  split?: SplitRule;
  boss?: boolean;
  body: string;
  trim: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  crawler: {
    id: 'crawler', name: 'Schleicher',
    hp: 34, speed: 114, bounty: 2, leak: 1, radius: 20, armor: 0, slowResist: 0,
    body: '#8B5CF6', trim: '#C9B6FF',
    topdown: true,
  },
  infantry: {
    id: 'infantry', name: 'Infanterie',
    hp: 52, speed: 96, bounty: 3, leak: 1, radius: 24, armor: 1, slowResist: 0.1,
    body: '#7A8A5C', trim: '#D8E0B8',
    topdown: true,
  },
  runner: {
    id: 'runner', name: 'Späher',
    hp: 24, speed: 206, bounty: 2, leak: 1, radius: 17, armor: 0, slowResist: 0,
    body: '#E2566A', trim: '#FFB3BE',
    topdown: true,
  },
  brute: {
    id: 'brute', name: 'Koloss',
    hp: 150, speed: 74, bounty: 7, leak: 3, radius: 29, armor: 3, slowResist: 0.3,
    body: '#84AEE0', trim: '#E6F2FF',
    topdown: true,
  },
  flyer: {
    id: 'flyer', name: 'Gleiter',
    hp: 62, speed: 142, bounty: 4, leak: 2, radius: 19, armor: 0, slowResist: 0.2,
    flying: true,
    body: '#3ED9A4', trim: '#C7FFE9',
    topdown: true,
  },
  splitter: {
    id: 'splitter', name: 'Spalter',
    hp: 130, speed: 94, bounty: 6, leak: 2, radius: 26, armor: 1, slowResist: 0.15,
    split: { into: 'splitling', count: 2, hpFactor: 0.3 },
    body: '#FF7A1A', trim: '#FFD9A8',
    topdown: true,
  },
  splitling: {
    id: 'splitling', name: 'Span',
    hp: 40, speed: 178, bounty: 1, leak: 1, radius: 14, armor: 0, slowResist: 0,
    body: '#EFE24C', trim: '#FFF8C8',
    topdown: true,
  },
  titan: {
    id: 'titan', name: 'Leerentitan',
    hp: 1100, speed: 53, bounty: 48, leak: 5, radius: 34, armor: 6, slowResist: 0.55,
    boss: true,
    body: '#6B4BB0', trim: '#D9BCFF',
    topdown: true,
  },
};
