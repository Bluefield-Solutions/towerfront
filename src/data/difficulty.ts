/** Schwierigkeitsgrade.
 *
 *  Nicht ein einzelner Regler, sondern ein ganzer Satz Kurvenparameter. Die
 *  Erfahrung aus v13 und v14 war eindeutig: Hoehe allein aendert nichts, weil
 *  ein voll ausgebautes Feld eine feste Leistung hat. Was wirkt, ist die Form
 *  der Kurve, die Dichte der Wellen und wieviel Geld ueberhaupt fliesst.
 *  Deshalb verstellt jeder Grad alle diese Groessen zusammen. */
export type DifficultyId = 'ruhig' | 'normal' | 'erbarmungslos';

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  blurb: string;
  startGold: number;
  startLives: number;
  /** Lebenspunktfaktor auf der letzten Welle. */
  hpEnd: number;
  /** Exponent der Kurve: klein am Anfang, steil am Ende. */
  hpCurve: number;
  /** Um wieviel der Abstand zwischen zwei Gegnern je Welle schrumpft. */
  densityRamp: number;
  /** Faktoren auf Abschusspraemie und Wellenbonus. */
  bountyMul: number;
  bonusMul: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  ruhig: {
    id: 'ruhig', name: 'Ruhig',
    blurb: 'Mehr Kristall, mehr Gold, sanftere Kurve. Zum Kennenlernen.',
    startGold: 300, startLives: 80,
    hpEnd: 13.8, hpCurve: 2.4, densityRamp: 0.11,
    bountyMul: 1.3, bonusMul: 1.3,
  },
  normal: {
    id: 'normal', name: 'Normal',
    blurb: 'Der gedachte Weg. Die letzten Wellen kosten Kristall.',
    startGold: 220, startLives: 60,
    hpEnd: 25, hpCurve: 2.6, densityRamp: 0.16,
    bountyMul: 1, bonusMul: 1,
  },
  erbarmungslos: {
    id: 'erbarmungslos', name: 'Erbarmungslos',
    blurb: 'Weniger Kristall, weniger Gold, steile Kurve. Jede Stellung zählt.',
    startGold: 212, startLives: 52,
    hpEnd: 29.5, hpCurve: 2.7, densityRamp: 0.20,
    bountyMul: 1.0, bonusMul: 1.0,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['ruhig', 'normal', 'erbarmungslos'];

/** Form der Kurve.
 *
 *  Eine reine Potenzkurve steigt bis zuletzt immer steiler - und zog deshalb
 *  erst in der allerletzten Welle am fertig gebauten Feld vorbei. Ergebnis:
 *  entweder makellos oder gescheitert. Diese Form hat ein Knie: flach solange
 *  gebaut wird, steil im Bereich der Saettigung, oben flacher auslaufend.
 *
 *  In v23 war das schon einmal versucht und wieder ausgebaut - damals verloren
 *  dabei zwei von drei Spielstilen. Der Grund war der Abstand der Stile, und
 *  der ist mit den festen Bauplaetzen weg. */
const KNEE_START = 0.55;
const KNEE_END = 0.92;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Lebenspunktfaktor der Welle mit dem Index i (0-basiert).
 *  `mapMul` ist der Ausgleich der Karte - siehe GameMap.balance. */
export function hpScale(d: DifficultyDef, i: number, waveCount: number, mapMul = 1): number {
  const t = i / Math.max(1, waveCount - 1);
  const shape = 0.82 * smoothstep(KNEE_START, KNEE_END, t) + 0.18 * Math.pow(t, d.hpCurve);
  return 1 + shape * d.hpEnd * mapMul;
}
