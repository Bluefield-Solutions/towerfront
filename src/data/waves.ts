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
/** Gold-Sofortbonus fuer frueh gestartete Wellen. Faellt linear auf 0. */
export const EARLY_BONUS_MAX = 30;
export const EARLY_BONUS_WINDOW = 22; // Sekunden

export const WAVES: Wave[] = [
  { bonus: 92, note: 'Erste Fuehler', groups: [
    { enemy: 'crawler', count: 6, gap: 1.1, delay: 0 } ] },
  { bonus: 106, groups: [
    { enemy: 'crawler', count: 10, gap: 0.9, delay: 0 } ] },
  { bonus: 114, note: 'Schnelle dabei', groups: [
    { enemy: 'crawler', count: 8, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 5, gap: 0.7, delay: 5 } ] },
  { bonus: 128, groups: [
    { enemy: 'runner', count: 12, gap: 0.52, delay: 0 } ] },
  { bonus: 224, note: 'Erster Koloss - Panzerung 3', groups: [
    { enemy: 'crawler', count: 12, gap: 0.7, delay: 0 },
    { enemy: 'brute', count: 2, gap: 3, delay: 5 } ] },
  { bonus: 172, note: 'Spalter zerfallen beim Tod', groups: [
    { enemy: 'splitter', count: 5, gap: 1.8, delay: 0 },
    { enemy: 'runner', count: 10, gap: 0.5, delay: 5 } ] },
  { bonus: 211, note: 'Erste Schwaermer - der Moerser erreicht sie nicht', groups: [
    { enemy: 'crawler', count: 20, gap: 0.42, delay: 0 },
    { enemy: 'flyer', count: 4, gap: 1.6, delay: 7 } ] },
  { bonus: 216, groups: [
    { enemy: 'brute', count: 5, gap: 2.2, delay: 0 },
    { enemy: 'splitter', count: 6, gap: 1.5, delay: 4 } ] },
  { bonus: 238, groups: [
    { enemy: 'crawler', count: 22, gap: 0.4, delay: 0 },
    { enemy: 'runner', count: 14, gap: 0.4, delay: 5 },
    { enemy: 'brute', count: 4, gap: 2.4, delay: 9 } ] },
  { bonus: 563, note: 'Leerentitan - Panzerung 6, bremsresistent', groups: [
    { enemy: 'titan', count: 1, gap: 1, delay: 0 },
    { enemy: 'crawler', count: 16, gap: 0.5, delay: 5 },
    { enemy: 'flyer', count: 5, gap: 1.4, delay: 9 } ] },
  { bonus: 277, note: 'Schwarm aus der Luft', groups: [
    { enemy: 'flyer', count: 10, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 18, gap: 0.34, delay: 5 } ] },
  { bonus: 308, note: 'Doppelte Kolosswand', groups: [
    { enemy: 'brute', count: 9, gap: 1.5, delay: 0 },
    { enemy: 'splitter', count: 8, gap: 1.2, delay: 4 } ] },
  { bonus: 334, groups: [
    { enemy: 'runner', count: 24, gap: 0.3, delay: 0 },
    { enemy: 'splitter', count: 8, gap: 1.2, delay: 5 },
    { enemy: 'flyer', count: 10, gap: 0.8, delay: 10 } ] },
  { bonus: 365, note: 'Alles gleichzeitig', groups: [
    { enemy: 'brute', count: 10, gap: 1.4, delay: 0 },
    { enemy: 'runner', count: 22, gap: 0.32, delay: 3 },
    { enemy: 'splitter', count: 8, gap: 1.3, delay: 7 },
    { enemy: 'flyer', count: 10, gap: 0.9, delay: 11 } ] },
  { bonus: 1197, note: 'Zwei Titanen und der ganze Rest', groups: [
    { enemy: 'titan', count: 2, gap: 9, delay: 0 },
    { enemy: 'brute', count: 8, gap: 1.6, delay: 4 },
    { enemy: 'splitter', count: 10, gap: 1.1, delay: 8 },
    { enemy: 'flyer', count: 11, gap: 0.8, delay: 12 },
    { enemy: 'runner', count: 24, gap: 0.3, delay: 16 } ] },
];
