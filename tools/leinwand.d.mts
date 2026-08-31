/** Typen fuer die Zeichenwerkstatt.
 *
 *  `leinwand.mjs` ist bewusst kein TypeScript: sie stellt globale Dinge
 *  (`document`, `window`, `Image`, `Path2D`), und das ist in einer .ts-Datei
 *  ein Kampf mit dem Uebersetzer ohne Gewinn. Die Werkzeuge in TypeScript
 *  brauchen aber eine Auskunft ueber die Ausgaenge - hier steht nur, was sie
 *  RUFEN, nicht was die Werkstatt tut. */
export function pfadklasseStellen(): void;
export function geruestStellen(breite?: number, hoehe?: number, nachLeinwand?: unknown): void;
export function bilderAbwarten(): Promise<void>;
