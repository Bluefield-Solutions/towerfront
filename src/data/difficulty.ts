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
  /** Wohin die Lebenskurve am Ende laeuft.
   *
   *  In v131 von 16 auf 17,5 angehoben, und der Grund steht nicht in dieser
   *  Datei: der Zielpunkt ist auf die Zielplattform der Karte gewandert. Die
   *  Bahnen wurden 3 bis 8 % laenger und aendern am Ende ihre Form - die
   *  Tuerme bekommen mehr Schuss, das Spiel wurde leichter, und die Verluste
   *  fielen von drei Wellen auf zwei (T15).
   *
   *  Ausgeeicht ueber ein Feld aus Kurve MAL Frostbremse, neun Werte (Regel
   *  9). Der erste Anlauf drehte beide Regler in dieselbe Richtung und machte
   *  das Spiel zu schwer: die Torkette war gruen, der Spiralhain fiel aber
   *  von drei auf zwei Sterne, und Erbarmungslos war fuer zwei Stile nicht
   *  mehr zu gewinnen. **Ein gruenes Tor ist nicht das Ziel.**
   *
   *  In v144 von 17,5 auf 19,5, und wieder aus demselben Grund: die Tuerme
   *  wurden staerker, ohne dass eine Turmzahl sich geaendert haette. Ein
   *  zielsuchendes Geschoss, dessen Ziel im Flug starb, verpuffte bis v143 -
   *  gemessen jeder achte Schuss (12,0 %). Seit dem Ersatzziel sind es 1,8 %,
   *  also kommen rund elf Prozent mehr Schaden an. Die Verluste fielen darauf
   *  von vier Wellen auf eine, T15 stand wieder offen. Durchprobiert wurden
   *  17,5 / 18,5 / 19,5 / 20,5: erst 19,5 verteilt wieder auf drei Wellen,
   *  20,5 kostet den dritten Stern auf der Frostspalte. */
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
    startGold: 300, startLives: 48,
    hpEnd: 17.0, hpCurve: 2.4, densityRamp: 0.11,
    bountyMul: 1.3, bonusMul: 1.3,
  },
  normal: {
    id: 'normal', name: 'Normal',
    blurb: 'Der gedachte Weg. Die letzten Wellen kosten Kristall.',
    startGold: 220, startLives: 42,
    hpEnd: 24.0, hpCurve: 2.6, densityRamp: 0.16,
    bountyMul: 1, bonusMul: 1,
  },
  erbarmungslos: {
    id: 'erbarmungslos', name: 'Erbarmungslos',
    blurb: 'Weniger Kristall, weniger Gold, steile Kurve. Jede Stellung zählt.',
    startGold: 212, startLives: 36,
    hpEnd: 28.3, hpCurve: 2.7, densityRamp: 0.20,
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
const KNIE_ANFANG = 0.55;
const KNIE_ENDE = 0.92;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** **Wie hart ein Abschnitt gegenueber dem ersten ist** (v309, N1K).
 *
 *  Ein Lauf hat zwei Kurven, und bis v308 wurde versucht, beide mit einer zu
 *  erledigen: die eine laeuft INNERHALB eines Abschnitts (ruhiger Anfang,
 *  steiles Ende - das ist `hpScale`, und sie ist an EINER Karte mit fuenfzehn
 *  Wellen geeicht), die andere UEBER die Abschnitte hinweg.
 *
 *  **Der erste Versuch streckte `hpScale` ueber alle sechzig Wellen** (v302).
 *  Das Ergebnis war gemessen 0 / 0 / 0 / 6 Kristall Verlust: die ersten drei
 *  Abschnitte lagen im flachen Teil und kosteten nichts, der vierte trug
 *  alles. Ein Lauf, dessen erste Abschnitte nichts kosten, faengt erst in
 *  seiner zweiten Haelfte an.
 *
 *  Jetzt behaelt jeder Abschnitt seine EIGENE, geeichte Kurve und bekommt
 *  einen Faktor darueber. Damit hat jeder Abschnitt seinen ruhigen Anfang und
 *  sein steiles Ende - und der spaetere ist ueberall haerter als der fruehere.
 *
 *  `abschnitt` ist 0-basiert; 0 gibt genau 1, also rechnet eine einzelne
 *  Karte Zeichen fuer Zeichen wie vorher. */
/** **Gemessen, nicht gewaehlt - und die Zahl ist ein Kompromiss, kein
 *  Treffer** (v309, Regel 9: erst den Raum ansehen).
 *
 *  Ein voller Lauf je Wert und je Stil, mit Deck, Kristallverlust je
 *  Abschnitt:
 *
 *  | Steigung | Meister | Breite | Sparsam |
 *  |---|---|---|---|
 *  | 1,0 | 4/4 · 0/0/0/0 | 4/4 · 0/15/5/15 | 4/4 · 0/0/0/0 |
 *  | **1,3** | **4/4 · 0/0/7/11** | **3/4 · 0/23/23/42** | **4/4 · 0/4/12/19** |
 *  | 1,4 | 4/4 · 0/0/11/20 | 3/4 · 0/19/36/42 | 4/4 · 0/13/27/27 |
 *  | 1,6 | 4/4 · 0/5/26/34 | 2/4 | 2/4 |
 *  | 1,7 | 3/4 | - | - |
 *  | 2,0 | 2/4 | - | - |
 *
 *  **1,6 sieht am besten aus und ist eine Nadel:** es traegt genau EINEN
 *  Stil. Bei 1,7 verliert schon der Meister einen Abschnitt, bei 1,6
 *  verlieren die anderen beiden je zwei. Ein Wert, der nur fuer einen Bot
 *  gilt, ist keine Einstellung, sondern ein Zufall (dieselbe Lehre wie v210:
 *  eine Nadel, keine Flaeche).
 *
 *  **1,3 ist der niedrigste Wert, bei dem der Lauf jeden Stil etwas kostet**
 *  und jeder Stil alle sechzig Wellen faehrt. Breite faellt dort im LETZTEN
 *  Abschnitt - das ist eine Niederlage am Ende, kein Zusammenbruch.
 *
 *  **Die Nullprobe sagt, dass die Kurve die Ursache ist** (Regel 13): bei 1,0
 *  gewinnen alle drei Stile alle vier Abschnitte. Breite bricht also an
 *  DIESER Kurve, nicht an sich selbst - und warum, steht als eigener Punkt im
 *  Verzeichnis: Gold und Beute kaufen Tuerme, die Turmzahl ist gedeckelt, und
 *  ueber sechzig Wellen kauft diese Achse damit irgendwann nichts mehr. */
export const LAUF_STEIGUNG = 1.3;

export function laufFaktor(abschnitt: number, steigung = LAUF_STEIGUNG): number {
  return steigung ** Math.max(0, abschnitt);
}

/** Lebenspunktfaktor der Welle mit dem Index i (0-basiert).
 *  `mapMul` ist der Ausgleich der Karte - siehe GameMap.balance. */
export function hpScale(d: DifficultyDef, i: number, waveCount: number, mapMul = 1): number {
  const t = i / Math.max(1, waveCount - 1);
  const shape = 0.82 * smoothstep(KNIE_ANFANG, KNIE_ENDE, t) + 0.18 * Math.pow(t, d.hpCurve);
  return 1 + shape * d.hpEnd * mapMul;
}
