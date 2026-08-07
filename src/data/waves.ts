import type { EnemyId } from './enemies';

export interface WaveGroup {
  enemy: EnemyId;
  count: number;
  gap: number;    // Sekunden zwischen zwei Gegnern dieser Gruppe
  delay: number;  // Sekunden nach Wellenstart, bis die Gruppe beginnt
  hpMul?: number; // Optionale Skalierung
}

export interface Wave {
  groups: WaveGroup[];
  bonus: number; // Gold beim vollstaendigen Ueberstehen
}

export const WAVES: Wave[] = [
  { bonus: 25, groups: [{ enemy: 'crawler', count: 6, gap: 1.1, delay: 0 }] },
  { bonus: 28, groups: [{ enemy: 'crawler', count: 10, gap: 0.9, delay: 0 }] },
  { bonus: 30, groups: [
    { enemy: 'crawler', count: 8, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 4, gap: 0.7, delay: 5 },
  ] },
  { bonus: 34, groups: [
    { enemy: 'runner', count: 10, gap: 0.55, delay: 0 },
  ] },
  { bonus: 40, groups: [
    { enemy: 'crawler', count: 12, gap: 0.7, delay: 0, hpMul: 1.2 },
    { enemy: 'brute', count: 1, gap: 1, delay: 6 },
  ] },
  { bonus: 44, groups: [
    { enemy: 'runner', count: 12, gap: 0.5, delay: 0 },
    { enemy: 'brute', count: 2, gap: 3, delay: 4 },
  ] },
  { bonus: 50, groups: [
    { enemy: 'crawler', count: 16, gap: 0.55, delay: 0, hpMul: 1.4 },
    { enemy: 'runner', count: 8, gap: 0.5, delay: 8 },
  ] },
  { bonus: 56, groups: [
    { enemy: 'brute', count: 4, gap: 2.4, delay: 0 },
    { enemy: 'runner', count: 10, gap: 0.45, delay: 3 },
  ] },
  { bonus: 62, groups: [
    { enemy: 'crawler', count: 20, gap: 0.45, delay: 0, hpMul: 1.7 },
    { enemy: 'brute', count: 3, gap: 2.5, delay: 7 },
  ] },
  { bonus: 120, groups: [
    { enemy: 'brute', count: 6, gap: 2.0, delay: 0, hpMul: 1.3 },
    { enemy: 'runner', count: 16, gap: 0.35, delay: 4 },
    { enemy: 'crawler', count: 18, gap: 0.4, delay: 10, hpMul: 1.8 },
  ] },
];

/** Zusaetzliche Lebenspunkte pro Welle (kumulativ, ab Welle 1 = 0 %).
 *  Haelt die Kurve steigend, ohne jede Welle einzeln nachziehen zu muessen. */
export const WAVE_HP_RAMP = 0.12;
