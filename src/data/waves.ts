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

/** Jede Karte hat ihren eigenen Wellenplan.
 *
 *  Bis v18 teilten sich alle Karten einen Plan, der ueber einen Faktor je
 *  Karte gebogen wurde. Das funktionierte, war aber unehrlich: die Karten
 *  unterschieden sich in der Form des Weges, nicht in dem, was darauf kam.
 *  Jetzt bringt jede Karte mit, wogegen man dort baut. */
/** Gold-Sofortbonus fuer frueh gestartete Wellen. Faellt linear auf 0. */
export const EARLY_BONUS_MAX = 30;
export const EARLY_BONUS_WINDOW = 22; // Sekunden

export const PLAN_SPIRALHAIN: Wave[] = [
  { bonus: 92, note: 'Erste Fühler', groups: [
    { enemy: 'crawler', count: 6, gap: 1.1, delay: 0 } ] },
  { bonus: 106, groups: [
    { enemy: 'crawler', count: 10, gap: 0.9, delay: 0 } ] },
  { bonus: 114, note: 'Schnelle dabei', groups: [
    { enemy: 'crawler', count: 8, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 5, gap: 0.7, delay: 5 } ] },
  { bonus: 128, groups: [
    { enemy: 'runner', count: 12, gap: 0.52, delay: 0 } ] },
  { bonus: 224, note: 'Erster Koloss — Panzerung 3', groups: [
    { enemy: 'crawler', count: 12, gap: 0.7, delay: 0 },
    { enemy: 'brute', count: 2, gap: 3, delay: 5 } ] },
  { bonus: 172, note: 'Spalter zerfallen beim Tod', groups: [
    { enemy: 'splitter', count: 5, gap: 1.8, delay: 0 },
    { enemy: 'runner', count: 10, gap: 0.5, delay: 5 } ] },
  { bonus: 211, note: 'Erste Schwärmer — der Mörser erreicht sie nicht', groups: [
    { enemy: 'crawler', count: 20, gap: 0.42, delay: 0 },
    { enemy: 'flyer', count: 4, gap: 1.6, delay: 7 } ] },
  { bonus: 216, groups: [
    { enemy: 'brute', count: 5, gap: 2.2, delay: 0 },
    { enemy: 'splitter', count: 6, gap: 1.5, delay: 4 } ] },
  { bonus: 238, groups: [
    { enemy: 'crawler', count: 22, gap: 0.4, delay: 0 },
    { enemy: 'runner', count: 14, gap: 0.4, delay: 5 },
    { enemy: 'brute', count: 4, gap: 2.4, delay: 9 } ] },
  { bonus: 563, note: 'Leerentitan — Panzerung 6, bremsresistent', groups: [
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

/** Laubschlucht: zwei frueh vereinte Zuwege und der laengste Weg im Spiel -
 *  die Gegner stehen lange unter Feuer. Deshalb kommen sie in Masse und mit
 *  Panzerung, und die Spalter machen aus jedem Flaechentreffer zwei Gegner. */
export const PLAN_ASCHESCHLUCHT: Wave[] = [
  { bonus: 96, note: 'Zwei Zuwege', groups: [
    { enemy: 'crawler', count: 6, gap: 1.0, delay: 0 } ] },
  { bonus: 100, groups: [
    { enemy: 'crawler', count: 10, gap: 0.8, delay: 0 } ] },
  { bonus: 108, note: 'Beide Seiten gleichzeitig', groups: [
    { enemy: 'crawler', count: 8, gap: 0.8, delay: 0 },
    { enemy: 'runner', count: 6, gap: 0.6, delay: 4 } ] },
  { bonus: 116, groups: [
    { enemy: 'splitter', count: 4, gap: 1.6, delay: 0 },
    { enemy: 'crawler', count: 7, gap: 0.7, delay: 4 } ] },
  { bonus: 190, note: 'Erste Kolosse — Panzerung 3', groups: [
    { enemy: 'brute', count: 2, gap: 2.6, delay: 0 },
    { enemy: 'crawler', count: 10, gap: 0.65, delay: 3 } ] },
  { bonus: 150, groups: [
    { enemy: 'splitter', count: 6, gap: 1.4, delay: 0 },
    { enemy: 'runner', count: 8, gap: 0.5, delay: 5 } ] },
  { bonus: 168, note: 'Erste Schwärmer — der Mörser erreicht sie nicht', groups: [
    { enemy: 'crawler', count: 15, gap: 0.4, delay: 0 },
    { enemy: 'flyer', count: 4, gap: 1.4, delay: 6 } ] },
  { bonus: 182, groups: [
    { enemy: 'brute', count: 4, gap: 2.0, delay: 0 },
    { enemy: 'splitter', count: 6, gap: 1.3, delay: 4 } ] },
  { bonus: 196, groups: [
    { enemy: 'crawler', count: 18, gap: 0.38, delay: 0 },
    { enemy: 'runner', count: 11, gap: 0.4, delay: 5 },
    { enemy: 'brute', count: 4, gap: 2.2, delay: 9 } ] },
  { bonus: 420, note: 'Leerentitan — Panzerung 6, bremsresistent', groups: [
    { enemy: 'titan', count: 1, gap: 1, delay: 0 },
    { enemy: 'splitter', count: 7, gap: 1.1, delay: 5 },
    { enemy: 'flyer', count: 4, gap: 1.3, delay: 9 } ] },
  { bonus: 220, note: 'Sturm im Laub', groups: [
    { enemy: 'runner', count: 18, gap: 0.3, delay: 0 },
    { enemy: 'splitter', count: 7, gap: 1.1, delay: 5 } ] },
  { bonus: 240, note: 'Kolosswand auf beiden Seiten', groups: [
    { enemy: 'brute', count: 8, gap: 1.3, delay: 0 },
    { enemy: 'crawler', count: 17, gap: 0.38, delay: 4 } ] },
  { bonus: 258, groups: [
    { enemy: 'splitter', count: 8, gap: 1.0, delay: 0 },
    { enemy: 'runner', count: 18, gap: 0.3, delay: 5 },
    { enemy: 'flyer', count: 7, gap: 0.9, delay: 10 } ] },
  { bonus: 276, note: 'Alles gleichzeitig', groups: [
    { enemy: 'brute', count: 8, gap: 1.2, delay: 0 },
    { enemy: 'splitter', count: 7, gap: 1.2, delay: 4 },
    { enemy: 'runner', count: 17, gap: 0.3, delay: 8 },
    { enemy: 'flyer', count: 7, gap: 0.9, delay: 12 } ] },
  { bonus: 900, note: 'Zwei Titanen und der ganze Rest', groups: [
    { enemy: 'titan', count: 1, gap: 8, delay: 0 },
    { enemy: 'brute', count: 7, gap: 1.4, delay: 4 },
    { enemy: 'splitter', count: 8, gap: 1.0, delay: 8 },
    { enemy: 'runner', count: 18, gap: 0.28, delay: 13 } ] },
];

/** Frostspalte: enge Wege, wenig Platz, kurze Luftlinie zum Kristall.
 *
 *  Schwaermer waeren hier unfair - sie haetten kaum Strecke unter Feuer.
 *  Stattdessen kommt, was man treffen *kann*, aber kaum kaputt bekommt:
 *  Kolosse mit Panzerung und Spalter, die aus jedem Flaechentreffer zwei
 *  Gegner machen. Wenig Platz gegen viel Huelle. */
export const PLAN_FROSTSPALTE: Wave[] = [
  { bonus: 92, note: 'Enge Wege', groups: [
    { enemy: 'crawler', count: 5, gap: 1.1, delay: 0 } ] },
  { bonus: 96, groups: [
    { enemy: 'crawler', count: 7, gap: 0.9, delay: 0 } ] },
  { bonus: 104, note: 'Von zwei Seiten', groups: [
    { enemy: 'crawler', count: 6, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 4, gap: 0.7, delay: 4 } ] },
  { bonus: 190, note: 'Erste Kolosse — Panzerung 3', groups: [
    { enemy: 'brute', count: 2, gap: 3, delay: 0 },
    { enemy: 'crawler', count: 6, gap: 0.8, delay: 3 } ] },
  { bonus: 128, note: 'Spalter zerfallen beim Tod', groups: [
    { enemy: 'splitter', count: 3, gap: 1.7, delay: 0 },
    { enemy: 'runner', count: 6, gap: 0.6, delay: 5 } ] },
  { bonus: 142, groups: [
    { enemy: 'brute', count: 3, gap: 2.2, delay: 0 },
    { enemy: 'crawler', count: 8, gap: 0.6, delay: 4 } ] },
  { bonus: 156, note: 'Erste Schwärmer — der Mörser erreicht sie nicht', groups: [
    { enemy: 'crawler', count: 10, gap: 0.5, delay: 0 },
    { enemy: 'flyer', count: 2, gap: 1.8, delay: 6 } ] },
  { bonus: 170, groups: [
    { enemy: 'brute', count: 3, gap: 1.9, delay: 0 },
    { enemy: 'splitter', count: 3, gap: 1.4, delay: 4 } ] },
  { bonus: 186, groups: [
    { enemy: 'runner', count: 8, gap: 0.4, delay: 0 },
    { enemy: 'brute', count: 2, gap: 2.1, delay: 5 } ] },
  { bonus: 400, note: 'Leerentitan — Panzerung 6, bremsresistent', groups: [
    { enemy: 'titan', count: 1, gap: 1, delay: 0 },
    { enemy: 'crawler', count: 6, gap: 0.6, delay: 6 } ] },
  { bonus: 208, note: 'Panzerwand', groups: [
    { enemy: 'brute', count: 5, gap: 1.5, delay: 0 },
    { enemy: 'splitter', count: 3, gap: 1.3, delay: 5 } ] },
  { bonus: 226, groups: [
    { enemy: 'splitter', count: 6, gap: 1.2, delay: 0 },
    { enemy: 'runner', count: 11, gap: 0.36, delay: 5 },
    { enemy: 'flyer', count: 3, gap: 1.4, delay: 9 } ] },
  { bonus: 244, groups: [
    { enemy: 'brute', count: 7, gap: 1.4, delay: 0 },
    { enemy: 'crawler', count: 13, gap: 0.4, delay: 5 } ] },
  { bonus: 262, note: 'Alles gleichzeitig', groups: [
    { enemy: 'brute', count: 5, gap: 1.6, delay: 0 },
    { enemy: 'splitter', count: 6, gap: 1.2, delay: 4 },
    { enemy: 'runner', count: 11, gap: 0.36, delay: 8 },
    { enemy: 'flyer', count: 3, gap: 1.4, delay: 12 } ] },
  { bonus: 860, note: 'Ein Titan und eine Panzerwand', groups: [
    { enemy: 'titan', count: 1, gap: 8, delay: 0 },
    { enemy: 'brute', count: 5, gap: 1.8, delay: 5 },
    { enemy: 'splitter', count: 5, gap: 1.4, delay: 10 } ] },
];

