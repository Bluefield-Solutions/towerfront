export type EnemyId = 'crawler' | 'runner' | 'brute' | 'titan';

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
  boss?: boolean;
  body: string;
  trim: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  crawler: {
    id: 'crawler', name: 'Schleicher',
    hp: 34, speed: 95, bounty: 7, leak: 1, radius: 17, armor: 0, slowResist: 0,
    body: '#8B5CF6', trim: '#C9B6FF',
  },
  runner: {
    id: 'runner', name: 'Husche',
    hp: 24, speed: 172, bounty: 6, leak: 1, radius: 14, armor: 0, slowResist: 0,
    body: '#E2566A', trim: '#FFB3BE',
  },
  brute: {
    id: 'brute', name: 'Koloss',
    hp: 150, speed: 62, bounty: 20, leak: 3, radius: 24, armor: 3, slowResist: 0.3,
    body: '#3F5A8A', trim: '#9FC0E8',
  },
  titan: {
    id: 'titan', name: 'Leerentitan',
    hp: 1100, speed: 44, bounty: 140, leak: 5, radius: 36, armor: 6, slowResist: 0.55,
    boss: true,
    body: '#2A1B4D', trim: '#B07CFF',
  },
};
