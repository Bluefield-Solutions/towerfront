import type { EnemyId } from './enemies';

export interface WaveGroup {
  enemy: EnemyId;
  count: number;
  gap: number;    // Sekunden zwischen zwei Gegnern dieser Gruppe
  delay: number;  // Sekunden nach Wellenstart, bis die Gruppe beginnt
  hpMul?: number;
}

export interface Wave {
  groups: WaveGroup[];
  bonus: number;  // Gold beim vollstaendigen Ueberstehen
  note?: string;  // Kurzer Hinweis in der Wellenvorschau
}

/** Zusaetzliche Lebenspunkte pro Welle, kumulativ ab Welle 1 = 0 %.
 *  Haelt die Kurve steigend, ohne jede Welle einzeln nachziehen zu muessen. */
export const WAVE_HP_RAMP = 0.11;

/** Gold-Sofortbonus fuer frueh gestartete Wellen. Faellt linear auf 0. */
export const EARLY_BONUS_MAX = 40;
export const EARLY_BONUS_WINDOW = 22; // Sekunden

export const WAVES: Wave[] = [
  { bonus: 25, note: 'Erste Fuehler', groups: [
    { enemy: 'crawler', count: 6, gap: 1.1, delay: 0 } ] },
  { bonus: 28, groups: [
    { enemy: 'crawler', count: 10, gap: 0.9, delay: 0 } ] },
  { bonus: 30, note: 'Schnelle dabei', groups: [
    { enemy: 'crawler', count: 8, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 5, gap: 0.7, delay: 5 } ] },
  { bonus: 34, groups: [
    { enemy: 'runner', count: 12, gap: 0.52, delay: 0 } ] },
  { bonus: 60, note: 'Erster Koloss - Panzerung 3', groups: [
    { enemy: 'crawler', count: 12, gap: 0.7, delay: 0 },
    { enemy: 'brute', count: 2, gap: 3, delay: 5 } ] },
  { bonus: 44, groups: [
    { enemy: 'runner', count: 14, gap: 0.45, delay: 0 },
    { enemy: 'brute', count: 2, gap: 3, delay: 4 } ] },
  { bonus: 50, note: 'Dichte Kette', groups: [
    { enemy: 'crawler', count: 20, gap: 0.42, delay: 0 },
    { enemy: 'runner', count: 8, gap: 0.5, delay: 8 } ] },
  { bonus: 56, groups: [
    { enemy: 'brute', count: 5, gap: 2.2, delay: 0 },
    { enemy: 'runner', count: 12, gap: 0.42, delay: 3 } ] },
  { bonus: 62, groups: [
    { enemy: 'crawler', count: 24, gap: 0.38, delay: 0 },
    { enemy: 'brute', count: 4, gap: 2.4, delay: 7 } ] },
  { bonus: 150, note: 'Leerentitan - Panzerung 6, bremsresistent', groups: [
    { enemy: 'titan', count: 1, gap: 1, delay: 0 },
    { enemy: 'crawler', count: 16, gap: 0.5, delay: 5 } ] },
  { bonus: 70, groups: [
    { enemy: 'runner', count: 22, gap: 0.32, delay: 0 },
    { enemy: 'brute', count: 4, gap: 2.2, delay: 6 } ] },
  { bonus: 78, note: 'Doppelte Kolosswand', groups: [
    { enemy: 'brute', count: 9, gap: 1.5, delay: 0 },
    { enemy: 'crawler', count: 20, gap: 0.4, delay: 4 } ] },
  { bonus: 86, groups: [
    { enemy: 'runner', count: 26, gap: 0.28, delay: 0 },
    { enemy: 'crawler', count: 22, gap: 0.4, delay: 5 },
    { enemy: 'brute', count: 4, gap: 2.5, delay: 12 } ] },
  { bonus: 94, note: 'Alles gleichzeitig', groups: [
    { enemy: 'brute', count: 10, gap: 1.4, delay: 0 },
    { enemy: 'runner', count: 24, gap: 0.3, delay: 3 },
    { enemy: 'crawler', count: 24, gap: 0.35, delay: 8 } ] },
  { bonus: 300, note: 'Zwei Titanen und der ganze Rest', groups: [
    { enemy: 'titan', count: 2, gap: 9, delay: 0 },
    { enemy: 'brute', count: 8, gap: 1.6, delay: 4 },
    { enemy: 'runner', count: 26, gap: 0.28, delay: 10 },
    { enemy: 'crawler', count: 26, gap: 0.32, delay: 14 } ] },
];
