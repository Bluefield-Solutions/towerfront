import { ENEMIES, type EnemyId } from './enemies';

export interface WaveGroup {
  enemy: EnemyId;
  count: number;
  gap: number;    // Sekunden zwischen zwei Gegnern dieser Gruppe
  delay: number;  // Sekunden nach Wellenstart, bis die Gruppe beginnt
  hpMul?: number;
  /** Ein Schild, der die ersten n Treffer VOLLSTAENDIG schluckt.
   *
   *  Warum an der Wellengruppe und nicht an der Gegnerart: dann braucht es
   *  keine neue Art und kein neues Bild. Der Schild ist ein sichtbarer Ring
   *  um einen bekannten Gegner - man erkennt sofort, WAS da kommt, und
   *  zugleich, dass es diesmal anders ist.
   *
   *  Und er ist etwas anderes als Panzerung. Panzerung nimmt einen Anteil
   *  jedes Treffers; der Schild nimmt ganze Treffer. Gegen Panzerung hilft
   *  harter Schaden, gegen den Schild hilft Schnellfeuer - drei billige
   *  Pfeile raeumen ihn genauso weg wie drei teure Granaten. Das ist der
   *  Sinn: er dreht die uebliche Antwort um. */
  shield?: number;
  /** Ein Schildtraeger: gibt UMSTEHENDEN Gegnern immer wieder Schild.
   *
   *  Der Unterschied zu `shield` ist der ganze Punkt. Ein eigener Schild
   *  kostet den Spieler ein paar Treffer mehr und ist dann weg. Ein Traeger
   *  laedt die Schilde der anderen nach, solange er lebt - wer ihn stehen
   *  laesst, kommt gegen den Pulk nicht an, ganz gleich wieviel Schaden er
   *  auffaehrt.
   *
   *  Das ist G5 aus dem Genre-Abgleich: ein Gegner, der die Reihenfolge
   *  ERZWINGT. Nicht "es waere gut, ihn zuerst zu nehmen", sondern "sonst
   *  geht es nicht".
   *
   *  Die Zahl ist, wieviel Schild er einem Nachbarn hoechstens gibt. */
  traeger?: number;
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
/** Der Druck einer Welle: wieviel Leben sie insgesamt aufs Feld bringt.
 *
 *  Zerfallende Gegner zaehlen mit dem, was aus ihnen wird - ein Spalter
 *  bringt mehr Arbeit als seine eigenen Lebenspunkte.
 *
 *  Diese Formel stand bis v151 NUR in `tools/guards.ts`, wo sie die
 *  Wellenkurve prueft. Seit die Wellenvorschau einen Sprung anzeigt,
 *  brauchen zwei Stellen dieselbe Zahl - und zwei Fassungen davon waeren
 *  eine zu viel (Regel 15). Sie steht deshalb hier, bei den Daten, die sie
 *  beschreibt. */
export function wellenDruck(w: Wave): number {
  let druck = 0;
  for (const g of w.groups) {
    const e = ENEMIES[g.enemy];
    if (!e) continue;
    const zerfall = e.split ? e.split.count * e.split.hpFactor : 0;
    druck += g.count * e.hp * (1 + zerfall) * (g.hpMul ?? 1);
  }
  return druck;
}

/** Ab welchem Vielfachen des Vorwellendrucks ein Sprung angezeigt wird.
 *
 *  Nicht gewaehlt, sondern abgelesen: ueber alle 45 Wellen der drei Karten
 *  liegen die Verhaeltnisse zwischen 0,52 und 1,68 dicht beieinander, dann
 *  kommt eine Luecke und darueber 1,68 / 1,77 / 1,86 / 2,00 / 2,08 / 2,16 /
 *  2,25 / 3,14. Die Grenze liegt in der Luecke, nicht in der Mitte einer
 *  Wolke. Es trifft acht von 45 Wellen - etwa jede fuenfte. */
export const SPRUNG = 1.7;

/** Springt der Druck von der vorigen zu dieser Welle deutlich? */
export function istSprung(plan: Wave[], i: number): boolean {
  if (i <= 0 || i >= plan.length) return false;
  const vorher = wellenDruck(plan[i - 1]);
  return vorher > 0 && wellenDruck(plan[i]) / vorher >= SPRUNG;
}

export const EARLY_BONUS_MAX = 30;
export const EARLY_BONUS_WINDOW = 22; // Sekunden

export const PLAN_SPIRALHAIN: Wave[] = [
  { bonus: 92, note: 'Erste Fühler', groups: [
    { enemy: 'crawler', count: 6, gap: 1.1, delay: 0 } ] },
  { bonus: 106, groups: [
    { enemy: 'crawler', count: 9, gap: 0.9, delay: 0 } ] },
  { bonus: 114, note: 'Schnelle dabei', groups: [
    { enemy: 'crawler', count: 7, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 5, gap: 0.7, delay: 5 },
    { enemy: 'infantry', count: 3, gap: 1.1, delay: 9 } ] },
  { bonus: 128, note: 'Infanterie rückt vor', groups: [
    { enemy: 'runner', count: 9, gap: 0.52, delay: 0 },
    { enemy: 'infantry', count: 6, gap: 0.9, delay: 2 } ] },
  { bonus: 224, note: 'Erster Koloss', groups: [
    { enemy: 'crawler', count: 11, gap: 0.7, delay: 0 },
    { enemy: 'brute', count: 2, gap: 3, delay: 5 } ] },
  { bonus: 172, note: 'Erste Spalter', groups: [
    { enemy: 'splitter', count: 5, gap: 1.8, delay: 0 },
    { enemy: 'runner', count: 9, gap: 0.5, delay: 5 } ] },
  { bonus: 211, note: 'Erste Gleiter', groups: [
    { enemy: 'crawler', count: 29, gap: 0.42, delay: 0 },
    { enemy: 'flyer', count: 6, gap: 1.6, delay: 7 } ] },
  { bonus: 216, note: 'Schilde — sie schlucken ganze Treffer, nicht Schaden', groups: [
    // Der erste Schild im Spiel. Bewusst hier, in der neunten Welle des
    // Spiralhains: frueh genug, dass man ihn kennt, bevor es eng wird, und
    // spaet genug, dass ein ausgebautes Feld dasteht, an dem man den
    // Unterschied merkt.
    //
    // Zwei Treffer, nicht mehr. Er soll eine Frage stellen ("warum passiert
    // nichts?"), nicht die Welle entscheiden.
    { enemy: 'infantry', count: 5, gap: 1.2, delay: 0, shield: 2 },
    { enemy: 'brute', count: 6, gap: 2.2, delay: 3 },
    { enemy: 'splitter', count: 8, gap: 1.5, delay: 7 } ] },
  { bonus: 238, groups: [
    { enemy: 'crawler', count: 39, gap: 0.4, delay: 0 },
    { enemy: 'runner', count: 25, gap: 0.4, delay: 5 },
    { enemy: 'brute', count: 7, gap: 2.4, delay: 9 } ] },
  { bonus: 563, note: 'Ein Leerentitan', groups: [
    { enemy: 'titan', count: 1, gap: 1, delay: 0 },
    { enemy: 'crawler', count: 19, gap: 0.5, delay: 5 },
    { enemy: 'flyer', count: 6, gap: 1.4, delay: 9 } ] },
  { bonus: 277, note: 'Gleiter aus der Luft', groups: [
    { enemy: 'flyer', count: 20, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 36, gap: 0.34, delay: 5 } ] },
  { bonus: 308, note: 'Schildträger — erst ihn, dann die Wand', groups: [
    // Der Traeger, und er kommt spaeter als der einfache Schild aus Welle 9.
    //
    // Die Reihenfolge ist Absicht: erst lernt man, dass ein Schild Treffer
    // schluckt und weggeht, dann trifft man auf jemanden, der ihn wieder
    // aufbaut. Andersherum waere die zweite Lektion die erste gewesen und
    // haette die erste ueberfluessig gemacht.
    //
    // Zwei Traeger, nicht einer. Bei einem waere die Welle mit einem
    // Gluecksschuss entschieden; bei zweien muss man es wollen.
    { enemy: 'infantry', count: 2, gap: 6, delay: 0, traeger: 2 },
    { enemy: 'brute', count: 6, gap: 1.5, delay: 2 },
    { enemy: 'splitter', count: 6, gap: 1.2, delay: 6 } ] },
  { bonus: 334, groups: [
    { enemy: 'runner', count: 16, gap: 0.3, delay: 0 },
    { enemy: 'splitter', count: 6, gap: 1.2, delay: 5 },
    { enemy: 'flyer', count: 6, gap: 0.8, delay: 10 } ] },
  { bonus: 365, note: 'Alles gleichzeitig', groups: [
    { enemy: 'brute', count: 5, gap: 1.4, delay: 0 },
    { enemy: 'runner', count: 10, gap: 0.32, delay: 3 },
    { enemy: 'splitter', count: 5, gap: 1.3, delay: 7 },
    { enemy: 'flyer', count: 5, gap: 0.9, delay: 11 } ] },
  { bonus: 1197, note: 'Zwei Titanen und der ganze Rest', groups: [
    { enemy: 'titan', count: 1, gap: 9, delay: 0 },
    { enemy: 'brute', count: 2, gap: 1.6, delay: 4 },
    { enemy: 'splitter', count: 3, gap: 1.1, delay: 8 },
    { enemy: 'flyer', count: 3, gap: 0.8, delay: 12 },
    { enemy: 'runner', count: 6, gap: 0.3, delay: 16 } ] },
];

/** Ascheschlucht: frueh vereinte Zuwege und der laengste Weg im Spiel -
 *  die Gegner stehen lange unter Feuer. Deshalb kommen sie in Masse und mit
 *  Panzerung, und die Spalter machen aus jedem Flaechentreffer zwei Gegner. */
export const PLAN_ASCHESCHLUCHT: Wave[] = [
  { bonus: 117, note: 'Zwei Zuwege', groups: [
    { enemy: 'crawler', count: 3, gap: 1.0, delay: 0 } ] },
  { bonus: 121, groups: [
    { enemy: 'crawler', count: 6, gap: 0.8, delay: 0 } ] },
  { bonus: 131, note: 'Beide Seiten gleichzeitig', groups: [
    { enemy: 'crawler', count: 5, gap: 0.8, delay: 0 },
    { enemy: 'runner', count: 3, gap: 0.6, delay: 4 } ] },
  { bonus: 140, groups: [
    { enemy: 'splitter', count: 3, gap: 1.6, delay: 0 },
    { enemy: 'crawler', count: 4, gap: 0.7, delay: 4 } ] },
  { bonus: 230, note: 'Erste Kolosse', groups: [
    { enemy: 'brute', count: 2, gap: 2.6, delay: 0 },
    { enemy: 'crawler', count: 6, gap: 0.65, delay: 3 } ] },
  { bonus: 181, groups: [
    { enemy: 'splitter', count: 3, gap: 1.4, delay: 0 },
    { enemy: 'runner', count: 5, gap: 0.5, delay: 5 } ] },
  { bonus: 203, note: 'Erste Gleiter', groups: [
    { enemy: 'crawler', count: 17, gap: 0.4, delay: 0 },
    { enemy: 'flyer', count: 7, gap: 1.4, delay: 6 } ] },
  { bonus: 220, groups: [
    { enemy: 'brute', count: 5, gap: 2.0, delay: 0 },
    { enemy: 'splitter', count: 6, gap: 1.3, delay: 4 } ] },
  { bonus: 238, groups: [
    { enemy: 'crawler', count: 25, gap: 0.38, delay: 0 },
    { enemy: 'runner', count: 15, gap: 0.4, delay: 5 },
    { enemy: 'brute', count: 6, gap: 2.2, delay: 9 } ] },
  { bonus: 508, note: 'Ein Leerentitan', groups: [
    { enemy: 'titan', count: 1, gap: 1, delay: 0 },
    { enemy: 'splitter', count: 5, gap: 1.1, delay: 5 },
    { enemy: 'flyer', count: 5, gap: 1.3, delay: 9 } ] },
  { bonus: 266, note: 'Sturm im Laub', groups: [
    { enemy: 'runner', count: 20, gap: 0.3, delay: 0 },
    { enemy: 'splitter', count: 8, gap: 1.1, delay: 5 } ] },
  { bonus: 291, note: 'Kolosswand auf beiden Seiten', groups: [
    { enemy: 'brute', count: 5, gap: 1.3, delay: 0 },
    { enemy: 'crawler', count: 11, gap: 0.38, delay: 4 } ] },
  { bonus: 312, groups: [
    { enemy: 'splitter', count: 4, gap: 1.0, delay: 0 },
    { enemy: 'runner', count: 9, gap: 0.3, delay: 5 },
    { enemy: 'flyer', count: 5, gap: 0.9, delay: 10 } ] },
  { bonus: 334, note: 'Alles gleichzeitig', groups: [
    { enemy: 'brute', count: 3, gap: 1.2, delay: 0 },
    { enemy: 'splitter', count: 3, gap: 1.2, delay: 4 },
    { enemy: 'runner', count: 7, gap: 0.3, delay: 8 },
    { enemy: 'flyer', count: 5, gap: 0.9, delay: 12 } ] },
  { bonus: 1089, note: 'Zwei Titanen und der ganze Rest', groups: [
    { enemy: 'titan', count: 1, gap: 8, delay: 0 },
    { enemy: 'brute', count: 3, gap: 1.4, delay: 4 },
    { enemy: 'splitter', count: 3, gap: 1.0, delay: 8 },
    { enemy: 'runner', count: 6, gap: 0.28, delay: 13 } ] },
];

/** Frostspalte: enge Wege, wenig Platz, kurze Luftlinie zum Kristall.
 *
 *  Schwaermer waeren hier unfair - sie haetten kaum Strecke unter Feuer.
 *  Stattdessen kommt, was man treffen *kann*, aber kaum kaputt bekommt:
 *  Kolosse mit Panzerung und Spalter, die aus jedem Flaechentreffer zwei
 *  Gegner machen. Wenig Platz gegen viel Huelle. */
export const PLAN_FROSTSPALTE: Wave[] = [
  { bonus: 101, note: 'Enge Wege', groups: [
    { enemy: 'crawler', count: 4, gap: 1.1, delay: 0 } ] },
  { bonus: 106, groups: [
    { enemy: 'crawler', count: 6, gap: 0.9, delay: 0 } ] },
  { bonus: 114, note: 'Von zwei Seiten', groups: [
    { enemy: 'crawler', count: 5, gap: 0.9, delay: 0 },
    { enemy: 'runner', count: 4, gap: 0.7, delay: 4 } ] },
  { bonus: 209, note: 'Erste Kolosse', groups: [
    { enemy: 'brute', count: 2, gap: 3, delay: 0 },
    { enemy: 'crawler', count: 5, gap: 0.8, delay: 3 } ] },
  { bonus: 141, note: 'Erste Spalter', groups: [
    { enemy: 'splitter', count: 3, gap: 1.7, delay: 0 },
    { enemy: 'runner', count: 5, gap: 0.6, delay: 5 } ] },
  { bonus: 156, groups: [
    { enemy: 'brute', count: 3, gap: 2.2, delay: 0 },
    { enemy: 'crawler', count: 7, gap: 0.6, delay: 4 } ] },
  { bonus: 172, note: 'Erste Gleiter', groups: [
    { enemy: 'crawler', count: 22, gap: 0.5, delay: 0 },
    { enemy: 'flyer', count: 7, gap: 1.8, delay: 6 } ] },
  { bonus: 187, groups: [
    { enemy: 'brute', count: 6, gap: 1.9, delay: 0 },
    { enemy: 'splitter', count: 6, gap: 1.4, delay: 4 } ] },
  { bonus: 205, groups: [
    { enemy: 'runner', count: 39, gap: 0.4, delay: 0 },
    { enemy: 'brute', count: 10, gap: 2.1, delay: 5 } ] },
  { bonus: 440, note: 'Ein Leerentitan', groups: [
    { enemy: 'titan', count: 2, gap: 1, delay: 0 },
    { enemy: 'crawler', count: 9, gap: 0.6, delay: 6 },
    // Luft auf der Titanwelle: wer alles auf den Boden stellt, sieht die
    // Gleiter durchziehen, waehrend seine Tuerme am Titan haengen.
    { enemy: 'flyer', count: 3, gap: 1.6, delay: 10 } ] },
  { bonus: 229, note: 'Panzerwand mit Schilden — Schnellfeuer räumt sie weg', groups: [
    // Der erste Schild im Spiel, und bewusst spaet.
    //
    // Zwei Treffer, nicht mehr: er soll die Frage stellen ("warum passiert
    // nichts?"), nicht die Welle entscheiden. Und auf der Infanterie, weil
    // die langsam genug laeuft, um den Ring zu sehen, bevor sie vorbei ist.
    { enemy: 'infantry', count: 5, gap: 1.0, delay: 2, shield: 2 },
    { enemy: 'brute', count: 7, gap: 1.5, delay: 0 },
    { enemy: 'splitter', count: 4, gap: 1.3, delay: 5 } ] },
  { bonus: 249, groups: [
    { enemy: 'splitter', count: 6, gap: 1.2, delay: 0 },
    { enemy: 'runner', count: 12, gap: 0.36, delay: 5 },
    { enemy: 'flyer', count: 7, gap: 1.4, delay: 9 } ] },
  { bonus: 268, groups: [
    { enemy: 'brute', count: 5, gap: 1.4, delay: 0 },
    { enemy: 'crawler', count: 11, gap: 0.4, delay: 5 } ] },
  { bonus: 288, note: 'Alles gleichzeitig', groups: [
    { enemy: 'brute', count: 4, gap: 1.6, delay: 0 },
    { enemy: 'splitter', count: 4, gap: 1.2, delay: 4 },
    { enemy: 'runner', count: 8, gap: 0.36, delay: 8 },
    { enemy: 'flyer', count: 5, gap: 1.4, delay: 12 } ] },
  { bonus: 946, note: 'Ein Titan und eine Panzerwand', groups: [
    { enemy: 'titan', count: 1, gap: 8, delay: 0 },
    { enemy: 'brute', count: 3, gap: 1.8, delay: 5 },
    { enemy: 'splitter', count: 3, gap: 1.4, delay: 10 } ] },
];

