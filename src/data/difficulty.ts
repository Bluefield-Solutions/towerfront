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
    startGold: 300, startLives: 25,
    hpEnd: 9, hpCurve: 2.4, densityRamp: 0.11,
    bountyMul: 1.3, bonusMul: 1.3,
  },
  normal: {
    id: 'normal', name: 'Normal',
    blurb: 'Der gedachte Weg. Die letzten Wellen kosten Kristall.',
    startGold: 220, startLives: 20,
    hpEnd: 13, hpCurve: 2.6, densityRamp: 0.16,
    bountyMul: 1, bonusMul: 1,
  },
  erbarmungslos: {
    id: 'erbarmungslos', name: 'Erbarmungslos',
    blurb: 'Weniger Kristall, weniger Gold, steile Kurve. Jede Stellung zaehlt.',
    startGold: 190, startLives: 14,
    hpEnd: 17, hpCurve: 2.7, densityRamp: 0.20,
    bountyMul: 1.0, bonusMul: 1.0,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['ruhig', 'normal', 'erbarmungslos'];

/** Lebenspunktfaktor der Welle mit dem Index i (0-basiert). */
export function hpScale(d: DifficultyDef, i: number, waveCount: number): number {
  const t = i / Math.max(1, waveCount - 1);
  return 1 + Math.pow(t, d.hpCurve) * d.hpEnd;
}
