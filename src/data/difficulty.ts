/** Schwierigkeitsgrade.
 *
 *  Nicht ein einzelner Regler, sondern ein ganzer Satz Kurvenparameter. Die
 *  Erfahrung aus v13 und v14 war eindeutig: Hoehe allein aendert nichts, weil
 *  ein voll ausgebautes Feld eine feste Leistung hat. Was wirkt, ist die Form
 *  der Kurve, die Dichte der Wellen und wieviel Geld ueberhaupt fliesst.
 *  Deshalb verstellt jeder Grad alle diese Groessen zusammen. */
/** **Es gibt seit v314 nur noch einen Grad** (S-N1-05, `keineGrade`).
 *
 *  Drei Grade und die Laufstruktur sind zwei Wege, dieselbe Frage zu stellen -
 *  wie hart wird es -, und solange beide dastehen, misst die Balance zwei
 *  Dinge auf einmal (Regel 4). Die Antwort gibt jetzt der LAUF: `laufFaktor`
 *  ueber die Abschnitte und die Auflage der Abschnittswahl (Stille Schicht,
 *  Klarer Weg, Reiche Ader).
 *
 *  Der Name bleibt als Typ stehen, weil Spielstand und Lauf ihn tragen; die
 *  WAHL gibt es nicht mehr. */
export type DifficultyId = 'normal';

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
  normal: {
    id: 'normal', name: 'Normal',
    blurb: 'Der gedachte Weg. Die letzten Wellen kosten Kristall.',
    startGold: 220, startLives: 42,
    hpEnd: 24.0, hpCurve: 2.6, densityRamp: 0.16,
    bountyMul: 1, bonusMul: 1,
  },
};

/** **Ruhig und Erbarmungslos sind in v314 entfallen** - und ihre Zahlen stehen
 *  hier, weil sie geeicht waren und nicht geraten:
 *
 *  | | startGold | startLives | hpEnd | hpCurve | densityRamp | bounty/bonus |
 *  |---|---|---|---|---|---|---|
 *  | Ruhig | 300 | 48 | 17,0 | 2,4 | 0,11 | 1,3 |
 *  | Erbarmungslos | 212 | 36 | 28,3 | 2,7 | 0,20 | 1,0 |
 *
 *  Wer die Spanne zurueckwill, holt sie ueber den Lauf, nicht ueber eine
 *  zweite Wahl daneben. */
export const DIFFICULTY_ORDER: DifficultyId[] = ['normal'];

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

/** **Was der Schwanz des Laufs je Umlauf obendrauf legt** (v333, S-N6-06).
 *
 *  Nach dem letzten geplanten Abschnitt geht der Lauf weiter, und er nimmt
 *  dafuer einen EIGENEN Faktor - nicht weil der Schwanz etwas anderes waere,
 *  sondern weil die Frage eine andere ist. Im Plan soll jeder Abschnitt
 *  etwas kosten und jeder Spielstil durchkommen; deshalb steht `LAUF_STEIGUNG`
 *  auf 1,3, dem niedrigsten Wert, der das tut. Im Schwanz soll der Lauf
 *  ENDEN, und zwar umso spaeter, je besser er war - ein Schwanz, der nicht
 *  endet, ist kein Ende, sondern ein Bildschirmschoner.
 *
 *  Hier und nicht in `lauf.ts`, obwohl der Schwanz dort wohnt: `laufFaktor`
 *  braucht ihn, und `src/data` darf nicht von `src/game` abhaengen. Der
 *  Wert steht damit neben dem, mit dem er verglichen wird.
 *
 *  **Durchprobiert und nicht gesetzt** (Regel 9) - `npm run sim -- --schwanz`
 *  faehrt drei Spielstile durch hoechstens zwoelf Umlaeufe. Gemessen, wie
 *  weit der beste kommt:
 *
 *  | Steigerung | 1,00 | 1,02 | 1,05 | 1,08 | 1,12 | 1,15 | 1,30 | 1,45 |
 *  |---|---|---|---|---|---|---|---|---|
 *  | Umlaeufe | 12+ | 12+ | 5 | **5** | 2 | 1 | 1 | 0 |
 *
 *  Unter 1,05 endet der Schwanz gar nicht - der beste Stil haelt alle zwoelf
 *  gemessenen Umlaeufe durch, und eine Fortsetzung, die niemanden mehr
 *  stellt, ist kein Ende, sondern ein Bildschirmschoner. Ab 1,45 schafft
 *  niemand mehr einen einzigen.
 *
 *  **Gesetzt ist 1,08 und nicht 1,05, obwohl beide fuenf Umlaeufe tragen:**
 *  1,05 ist der Rand des Fensters, 1,08 seine Mitte. Eine Nadel statt einer
 *  Flaeche hat dieses Verzeichnis schon einmal eine Runde gekostet (v210).
 *
 *  **Und sie ist gemessen NICHT dieselbe Zahl wie `LAUF_STEIGUNG`**, obwohl
 *  beide dieselbe Form haben: bei 1,3 ist der Schwanz nach einem Umlauf
 *  vorbei. Die zwei Fenster liegen auseinander, und das ist der Grund, warum
 *  es zwei Konstanten sind und nicht eine. */
export const ENDLOS_STEIGERUNG = 1.08;

export function laufFaktor(
  abschnitt: number, steigung = LAUF_STEIGUNG, schwanz = 0,
  endlos = ENDLOS_STEIGERUNG,
): number {
  // **Der Schwanz setzt AUF den Plan auf, er faengt nicht neu an** (v333,
  // S-N6-06). `abschnitt` zaehlt auch dort weiter durch - es gibt keine
  // zweite Zaehlweise -, deshalb wird der geplante Anteil bei der Zahl der
  // Umlaeufe gedeckelt und der Rest mit `ENDLOS_STEIGERUNG` gerechnet.
  // Stuende beides multiplikativ nebeneinander, zaehlte jeder Umlauf des
  // Schwanzes doppelt.
  const geplant = Math.max(0, abschnitt - Math.max(0, schwanz));
  return steigung ** geplant * endlos ** Math.max(0, schwanz);
}

/** Lebenspunktfaktor der Welle mit dem Index i (0-basiert).
 *  `mapMul` ist der Ausgleich der Karte - siehe GameMap.balance. */
export function hpScale(d: DifficultyDef, i: number, waveCount: number, mapMul = 1): number {
  const t = i / Math.max(1, waveCount - 1);
  const shape = 0.82 * smoothstep(KNIE_ANFANG, KNIE_ENDE, t) + 0.18 * Math.pow(t, d.hpCurve);
  return 1 + shape * d.hpEnd * mapMul;
}
