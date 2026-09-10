import type { DifficultyId } from '../data/difficulty';
import { MAPS } from '../data/maps';

/** **Der Lauf als Zustand** (v302, S-N1-01).
 *
 *  Eine Partie dauert heute gemessen 470 Sekunden und endet ohne Grund zur
 *  Wiederkehr; Rogue Tower kommt auf 45 Wellen und rund eine Stunde je Lauf.
 *  Der Lauf ist die Klammer, die dazwischenfehlt: er haelt zusammen, was
 *  ueber die Abschnitte hinweg gilt.
 *
 *  **Was der Lauf haelt und was nicht.** Gold, Kristall, Deck und
 *  Verbesserungen bleiben; **Tuerme bleiben nicht**. Das ist keine
 *  Bequemlichkeit, sondern der Beschluss aus `Towerfront-NEUBAU.md`: der
 *  Bauplatz ist die Entscheidung, und wer sein Feld mitnimmt, trifft sie
 *  einmal statt in jedem Abschnitt.
 *
 *  **Der Wellenzaehler ist die eigentliche Sache.** `welleGesamt` laeuft
 *  ueber alle Abschnitte durch, und die Lebenskurve haengt daran (`hpScale`
 *  bekommt ihn als Index und die Gesamtzahl als Nenner). Ohne ihn faengt
 *  jeder Abschnitt am flachen Anfang der Kurve wieder an - dann ist ein Lauf
 *  vier kurze Partien hintereinander und keine steigende Klammer.
 *
 *  **Additiv gebaut, und das ist Absicht.** Ohne Lauf steht der Versatz auf
 *  0 und die Gesamtzahl auf der Wellenzahl der Karte - dann rechnet `hpScale`
 *  Zeichen fuer Zeichen dasselbe wie vorher. Die ganze Balance dieses
 *  Projekts ist an EINZELNEN Karten geeicht (`npm run sim`, C18, die
 *  Spannungsratsche); ein Lauf, der diesen Pfad mitverschiebt, haette in
 *  derselben Runde jede dieser Zahlen bewegt und keine davon erklaerbar
 *  gemacht.
 */
export interface LaufZustand {
  /** Fassung des Laufformats. Ein Lauf aus einer aelteren Fassung wird
   *  verworfen statt halb geladen - dieselbe Haltung wie beim Spielstand,
   *  und aus demselben Grund: ein halb verstandener Zustand ist schlimmer
   *  als keiner. */
  v: 1;
  /** Die Aussaat des ganzen Laufs. Alles, was in ihm gezogen wird, haengt
   *  daran - der Kartenzug von S-N1-02 genauso wie die Abschnittswahl von
   *  S-N1-03. */
  saat: number;
  grad: DifficultyId;
  /** Die Karten dieses Laufs in ihrer Reihenfolge.
   *
   *  Heute alle vier in Katalogreihenfolge; WELCHE Abschnitte ein Lauf
   *  bekommt, entscheidet S-N1-03. Die Liste steht trotzdem schon hier und
   *  nicht als Ableitung aus `MAPS`, weil ein laufender Lauf seine
   *  Reihenfolge behalten muss, auch wenn spaeter eine Karte dazukommt. */
  abschnitte: string[];
  /** Der wievielte Abschnitt gerade laeuft, 0-basiert. */
  abschnitt: number;
  /** Wellen ueber ALLE Abschnitte hinweg - die Zahl, an der die
   *  Schwierigkeit haengt. */
  welleGesamt: number;
  /** Gold beim Betreten des laufenden Abschnitts. */
  gold: number;
  /** Kristall beim Betreten des laufenden Abschnitts. */
  kristall: number;
  /** Der Kartenstapel (S-N1-02). Heute leer, aber im Format - ein Lauf, der
   *  sein Deck erst spaeter bekommt, waere sonst beim naechsten Schritt
   *  wieder ein Formatbruch. */
  deck: string[];
  /** Gekaufte dauerhafte Verbesserungen (S-N1-04). Ebenso. */
  verbesserungen: string[];
}

/** Wieviele Wellen ein Abschnitt traegt. Gelesen aus der Karte, nicht
 *  gemerkt - eine zweite Liste veraltete an dem Tag, an dem eine Karte ihren
 *  Wellenplan aendert (Regel 15). */
export function wellenDesAbschnitts(kartenId: string): number {
  return MAPS.find((m) => m.id === kartenId)?.waves.length ?? 0;
}

/** Wieviele Wellen der ganze Lauf traegt - der Nenner der Lebenskurve. */
export function wellenDesLaufs(l: LaufZustand): number {
  return l.abschnitte.reduce((a, id) => a + wellenDesAbschnitts(id), 0);
}

/** Einen Lauf beginnen. */
export function laufStarten(
  grad: DifficultyId, saat: number, abschnitte: string[] = MAPS.map((m) => m.id),
): LaufZustand {
  return {
    v: 1,
    saat,
    grad,
    abschnitte: abschnitte.slice(),
    abschnitt: 0,
    welleGesamt: 0,
    gold: 0,
    kristall: 0,
    deck: [],
    verbesserungen: [],
  };
}

/** Die Karte, die gerade dran ist - oder `null`, wenn der Lauf zu Ende ist. */
export function laufendeKarte(l: LaufZustand): string | null {
  return l.abschnitte[l.abschnitt] ?? null;
}

export function istLaufZuEnde(l: LaufZustand): boolean {
  return l.abschnitt >= l.abschnitte.length;
}

/** Einen Abschnitt abschliessen und in den naechsten gehen.
 *
 *  **Der Wellenzaehler wird ADDIERT, nicht gesetzt** - das ist die eine
 *  Zeile, an der die ganze Story haengt, und die Gegenprobe greift genau
 *  hier an. Wer ihn hier zurechtsetzt statt weiterzuzaehlen, macht aus einem
 *  Lauf vier Partien.
 *
 *  Gold und Kristall gehen mit; Tuerme nicht - die stehen gar nicht in
 *  diesem Zustand, und das ist die Stelle, an der man es sieht. */
export function abschnittGeschafft(
  l: LaufZustand, gold: number, kristall: number, gefahreneWellen: number,
): LaufZustand {
  return {
    ...l,
    abschnitt: l.abschnitt + 1,
    welleGesamt: l.welleGesamt + gefahreneWellen,
    gold,
    kristall,
  };
}

// --------------------------------------------------------------- Ablage

/** Eigener Schluessel, eigene Fassung.
 *
 *  Der Lauf ueberlebt die Partie: zwischen zwei Abschnitten gibt es keine,
 *  und ein Lauf, der nur im Spielstand der Partie stuende, waere in genau
 *  diesem Augenblick weg. */
const SCHLUESSEL = 'towerfront.lauf-zustand';

export function laufSpeichern(l: LaufZustand): void {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(l)); } catch { /* gesperrt */ }
}

/** Einen Lauf lesen - oder `null`.
 *
 *  **Gar nicht lesen statt falsch lesen.** Geprueft wird die Fassung UND die
 *  Form: eine von Hand veraenderte Ablage, eine aus einer spaeteren Fassung
 *  oder eine mit einer Karte, die es nicht mehr gibt, wird verworfen. Der
 *  Preis ist ein verlorener Lauf, der Gegenwert ein Zustand, den niemand
 *  erraten muss. */
export function laufLaden(): LaufZustand | null {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return null;
    const l = JSON.parse(roh) as LaufZustand;
    if (l.v !== 1) return null;
    if (!Array.isArray(l.abschnitte) || !l.abschnitte.length) return null;
    if (!l.abschnitte.every((id) => MAPS.some((m) => m.id === id))) return null;
    if (typeof l.abschnitt !== 'number' || l.abschnitt < 0) return null;
    if (l.abschnitt > l.abschnitte.length) return null;
    if (typeof l.welleGesamt !== 'number' || l.welleGesamt < 0) return null;
    if (!Array.isArray(l.deck) || !Array.isArray(l.verbesserungen)) return null;
    return l;
  } catch {
    return null;
  }
}

export function laufLoeschen(): void {
  try { localStorage.removeItem(SCHLUESSEL); } catch { /* gesperrt */ }
}
