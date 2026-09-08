/** **Der Verbund** (v244, F4): wer mischt, trifft haerter.
 *
 *  Bis v243 belohnte das Spiel das Mischen mit gar nichts, und es bestrafte
 *  die Monokultur auch nicht - im Gegenteil: gemessen war "nur Frost" die
 *  staerkste Aufstellung des ganzen Spiels (50 von 60 Kristall gegen 43 im
 *  gemischten Feld). Ein Genre, dessen ganze Frage "welcher Turm wogegen"
 *  heisst, hatte damit auf seine eigene Frage keine Antwort.
 *
 *  Ein Turm zaehlt, wieviele ANDERE Turmarten in seinem Umkreis stehen, und
 *  bekommt je Art einen Zuschlag auf den Schaden. Zwei Nachbarn derselben
 *  Art zaehlen einmal - gemeint ist die Mischung, nicht die Menge.
 *
 *  Die Zielunit zaehlt NICHT mit. Sie steht auf jeder Karte an derselben
 *  Stelle, und niemand hat sie hingestellt; ein Zuschlag dafuer waere kein
 *  Verdienst, sondern eine Belohnung fuer die Naehe zum Kristall - und die
 *  ist ohnehin schon die schlechteste Stelle zum Bauen.
 *
 *  **Warum diese Datei und nicht `state.ts`:** die Werteliste
 *  (`turmwerte.ts`) muss denselben Zuschlag rechnen wie die Wirkung, sonst
 *  zeigt der Pruefsteg etwas anderes, als der Turm tut. Ein Import von
 *  `state.ts` waere ein Kreis; also steht die Zahl dort, wo beide sie lesen
 *  koennen.
 *
 *  **Die Stufe ist gemessen, nicht gewaehlt.** Durchprobiert von 0 bis 0,26
 *  mit dem Aurendeckel an, je Wert der volle Simulationslauf und die
 *  C18-Eroeffnung:
 *
 *  | Stufe | C18 | nur Frost | gemischt | Robustheit |
 *  |-------|------------------|-----|-----|------|
 *  | 0     | verloren W14     | 11  | 39  | 14,2 |
 *  | 0,08  | verloren W14     | 11  | 42  | 12,5 |
 *  | 0,12  | verloren W15     | 11  | 40  | 10,6 |
 *  | 0,16  | gewonnen mit 2   | 11  | 43  | 11,9 |
 *  | 0,20  | gewonnen mit 25  | 11  | 43  |  8,1 |
 *  | 0,26  | gewonnen mit 27  | 11  | 49  |  8,1 |
 *
 *  0,16 traegt die Eroeffnung nur mit zwei Kristall - das ist eine Nadel,
 *  keine Flaeche. 0,26 macht das gemischte Feld deutlich staerker, als es
 *  vorher war (49 gegen 43), und verschiebt damit die ganze Balance. 0,20
 *  stellt das gemischte Feld genau dort wieder her, wo es ohne Deckel stand
 *  (43), laesst die Monokultur unten (11) und traegt die Eroeffnung mit 25 -
 *  besser als die 19, die sie vor dem Deckel hatte. */
export const VERBUND_UMKREIS = 260;
export const VERBUND_STUFE = 0.20;
export const VERBUND_MAX = 3;
