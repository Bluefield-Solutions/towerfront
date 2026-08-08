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
/** Lebenspunkt-Kurve.
 *
 *  Vorher stieg sie linear - und traf damit die Mitte genauso hart wie das
 *  Ende. Genau dort entstand die Wand in Welle 8: die Gegner waren schon zaeh,
 *  das Feld aber noch nicht gebaut. Wird die Kurve flach genug fuer die Mitte
 *  gestellt, ist das Ende belanglos; wird sie steil genug fuer das Ende
 *  gestellt, ist die Mitte unspielbar.
 *
 *  Eine Potenzkurve loest beides: fast unveraendert am Anfang, steil am Ende.
 *  WAVE_HP_END ist der Faktor auf der letzten Welle. */
export const WAVE_HP_END = 10;
export const WAVE_HP_CURVE = 2.2;

/** Verdichtung je Welle: der Abstand zwischen zwei Gegnern schrumpft.
 *
 *  Die Lebenspunkt-Rampe allein reicht nicht. Ein voll ausgebautes Feld hat
 *  eine feste Schadensleistung je Sekunde; entscheidend ist deshalb, wieviel
 *  Huelle je Sekunde ankommt - nicht, wieviel je Gegner. Ohne diese Schraube
 *  ist die Kurve zweiwertig: entweder das Feld haelt alles oder es bricht. */
export const WAVE_DENSITY_RAMP = 0.28;

/** Gold-Sofortbonus fuer frueh gestartete Wellen. Faellt linear auf 0. */
export const EARLY_BONUS_MAX = 30;
export const EARLY_BONUS_WINDOW = 22; // Sekunden

export const WAVES: Wave[] = [
  { bonus: 21, note: 'Erste Fuehler', groups: [
    { enemy: 'crawler', count: 6, gap: 1.1, delay: 0 } ] },
  { bonus: 24, groups: [
    { enemy: 'crawler', count: 10, gap: 0.9, delay: 0 } ] },
  { bonus: 26, note: 'Schnelle dabei', groups: [
    { enemy: 'crawler', count: 8, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 5, gap: 0.7, delay: 5 } ] },
  { bonus: 29, groups: [
    { enemy: 'runner', count: 12, gap: 0.52, delay: 0 } ] },
  { bonus: 51, note: 'Erster Koloss - Panzerung 3', groups: [
    { enemy: 'crawler', count: 12, gap: 0.7, delay: 0 },
    { enemy: 'brute', count: 2, gap: 3, delay: 5 } ] },
  { bonus: 39, note: 'Spalter zerfallen beim Tod', groups: [
    { enemy: 'splitter', count: 5, gap: 1.8, delay: 0 },
    { enemy: 'runner', count: 10, gap: 0.5, delay: 5 } ] },
  { bonus: 48, note: 'Erste Schwaermer - der Moerser erreicht sie nicht', groups: [
    { enemy: 'crawler', count: 20, gap: 0.42, delay: 0 },
    { enemy: 'flyer', count: 4, gap: 1.6, delay: 7 } ] },
  { bonus: 49, groups: [
    { enemy: 'brute', count: 5, gap: 2.2, delay: 0 },
    { enemy: 'splitter', count: 6, gap: 1.5, delay: 4 } ] },
  { bonus: 54, groups: [
    { enemy: 'crawler', count: 22, gap: 0.4, delay: 0 },
    { enemy: 'runner', count: 14, gap: 0.4, delay: 5 },
    { enemy: 'brute', count: 4, gap: 2.4, delay: 9 } ] },
  { bonus: 128, note: 'Leerentitan - Panzerung 6, bremsresistent', groups: [
    { enemy: 'titan', count: 1, gap: 1, delay: 0 },
    { enemy: 'crawler', count: 16, gap: 0.5, delay: 5 },
    { enemy: 'flyer', count: 5, gap: 1.4, delay: 9 } ] },
  { bonus: 63, note: 'Schwarm aus der Luft', groups: [
    { enemy: 'flyer', count: 10, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 18, gap: 0.34, delay: 5 } ] },
  { bonus: 70, note: 'Doppelte Kolosswand', groups: [
    { enemy: 'brute', count: 9, gap: 1.5, delay: 0 },
    { enemy: 'splitter', count: 8, gap: 1.2, delay: 4 } ] },
  { bonus: 76, groups: [
    { enemy: 'runner', count: 24, gap: 0.3, delay: 0 },
    { enemy: 'splitter', count: 8, gap: 1.2, delay: 5 },
    { enemy: 'flyer', count: 10, gap: 0.8, delay: 10 } ] },
  { bonus: 83, note: 'Alles gleichzeitig', groups: [
    { enemy: 'brute', count: 10, gap: 1.4, delay: 0 },
    { enemy: 'runner', count: 22, gap: 0.32, delay: 3 },
    { enemy: 'splitter', count: 8, gap: 1.3, delay: 7 },
    { enemy: 'flyer', count: 10, gap: 0.9, delay: 11 } ] },
  { bonus: 272, note: 'Zwei Titanen und der ganze Rest', groups: [
    { enemy: 'titan', count: 2, gap: 9, delay: 0 },
    { enemy: 'brute', count: 8, gap: 1.6, delay: 4 },
    { enemy: 'splitter', count: 10, gap: 1.1, delay: 8 },
    { enemy: 'flyer', count: 11, gap: 0.8, delay: 12 },
    { enemy: 'runner', count: 24, gap: 0.3, delay: 16 } ] },
];

/** Lebenspunktfaktor der Welle mit dem Index i (0-basiert). */
export function hpScale(i: number): number {
  const t = i / Math.max(1, WAVES.length - 1);
  return 1 + Math.pow(t, WAVE_HP_CURVE) * WAVE_HP_END;
}
