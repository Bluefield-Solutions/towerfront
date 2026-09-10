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
  v: 2;
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
  /** Der Faktor auf die Lebenspunkte im laufenden Abschnitt - die Auflage,
   *  die bei der Abschnittswahl angenommen wurde (S-N1-03). 1 heisst: keine.
   *
   *  **Er liegt im Lauf und nicht in der Karte**, und das ist die Stelle, an
   *  der man den Unterschied sieht: `map.balance.hpMul` gilt fuer jeden, der
   *  diese Karte spielt, `druck` nur fuer diesen Lauf und nur fuer diesen
   *  Abschnitt. */
  druck: number;
  /** Ebenso der Faktor auf alles Gold dieses Abschnitts. */
  beute: number;
  /** Steht eine Wahl aus? Zwischen zwei Abschnitten ist sie offen, und ein
   *  Lauf laesst sich genau hier sichern und spaeter fortsetzen - das ist die
   *  dritte Abnahme der Story. */
  wahlOffen: boolean;
  /** Die angenommenen Angebote in ihrer Reihenfolge - der Weg, den dieser
   *  Lauf genommen hat. */
  gewaehlt: string[];
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
    v: 2,
    saat,
    grad,
    abschnitte: abschnitte.slice(),
    abschnitt: 0,
    welleGesamt: 0,
    gold: 0,
    kristall: 0,
    deck: [],
    verbesserungen: [],
    druck: 1,
    beute: 1,
    wahlOffen: false,
    gewaehlt: [],
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
  const weiter = l.abschnitt + 1;
  return {
    ...l,
    abschnitt: weiter,
    welleGesamt: l.welleGesamt + gefahreneWellen,
    gold,
    kristall,
    // **Die Wahl geht auf, sobald ein Abschnitt zu Ende ist** (S-N1-03) -
    // und nur dann, wenn ueberhaupt noch einer kommt. Am Ende des Laufs eine
    // Wahl offen zu lassen hiesse, dem Spieler einen Knopf hinzustellen, der
    // ins Nichts fuehrt.
    wahlOffen: weiter < l.abschnitte.length,
    // Die Auflage gilt fuer den Abschnitt, der gerade zu Ende ist, nicht fuer
    // den naechsten. Bis die naechste Wahl getroffen ist, steht sie auf 1.
    druck: 1,
    beute: 1,
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
    if (l.v !== 2) return null;
    if (!Array.isArray(l.abschnitte) || !l.abschnitte.length) return null;
    if (!l.abschnitte.every((id) => MAPS.some((m) => m.id === id))) return null;
    if (typeof l.abschnitt !== 'number' || l.abschnitt < 0) return null;
    if (l.abschnitt > l.abschnitte.length) return null;
    if (typeof l.welleGesamt !== 'number' || l.welleGesamt < 0) return null;
    if (!Array.isArray(l.deck) || !Array.isArray(l.verbesserungen)) return null;
    if (!Array.isArray(l.gewaehlt)) return null;
    if (typeof l.druck !== 'number' || !(l.druck > 0)) return null;
    if (typeof l.beute !== 'number' || !(l.beute > 0)) return null;
    if (typeof l.wahlOffen !== 'boolean') return null;
    return l;
  } catch {
    return null;
  }
}

export function laufLoeschen(): void {
  try { localStorage.removeItem(SCHLUESSEL); } catch { /* gesperrt */ }
}

// ------------------------------------------------------------ Die Erfahrung

/** **Was ein Lauf einbringt** (v306, S-N1-04).
 *
 *  Ohne etwas, das einen VERLORENEN Lauf trotzdem lohnend macht, ist ein
 *  Roguelite eine Kette von Niederlagen. Rogue Tower gibt XP fuers
 *  Durchspielen, fuer einen Rekord und fuer den Sieg - 450 / 900 / 1350, also
 *  ungefaehr eins zu drei zwischen "gefahren" und "gewonnen" (Regel 10: das
 *  Soll kommt aus der Referenz, nicht aus mir).
 *
 *  Drei Posten, und jeder misst etwas anderes:
 *
 *  * **je gefahrene Welle** - dafuer, dass man ueberhaupt gespielt hat. Das
 *    ist der Posten, der eine Niederlage von null trennt.
 *  * **je gewonnenem Abschnitt** - dafuer, wie weit man gekommen ist.
 *  * **fuer den ganzen Lauf** - dafuer, ihn zu Ende gebracht zu haben.
 *
 *  Gerechnet aus dem LAUF und nicht aus der Partie: ein Abschnitt allein
 *  weiss nicht, der wievielte er war. */
export const ERFAHRUNG_JE_WELLE = 10;
export const ERFAHRUNG_JE_ABSCHNITT = 100;
export const ERFAHRUNG_LAUF_GESCHAFFT = 300;

export function erfahrungFuer(l: LaufZustand, geschafft: boolean): number {
  return l.welleGesamt * ERFAHRUNG_JE_WELLE
    + l.abschnitt * ERFAHRUNG_JE_ABSCHNITT
    + (geschafft ? ERFAHRUNG_LAUF_GESCHAFFT : 0);
}

// --------------------------------------------------------- Die Abschnittswahl

/** **Die Wahl zwischen den Abschnitten** (v305, S-N1-03).
 *
 *  Ohne eine zweite Ebene ueber der Welle ist ein Lauf eine lange Kette
 *  gleichartiger Entscheidungen: sechzig Kartenzuege hintereinander, und
 *  keiner davon aendert, WORAUF man zieht. Alle drei Vorbilder haben diese
 *  Ebene - Rogue Tower waehlt das naechste Gelaende, Infinitode den Auftrag,
 *  Defense Grid die Karte samt ihrer Auflage.
 *
 *  **Die Art ist die Entscheidung, die Karte ist der Ort.** Zwei bis drei
 *  Angebote, jedes eine Karte mit einer Auflage: weniger Druck und weniger
 *  Beute, oder mehr von beidem. Der Handel steht damit VOR der Wahl im Bild
 *  und nicht danach in der Bilanz - das ist die erste Abnahme der Story, und
 *  sie ist der Grund, warum `satz` aus den Zahlen abgeleitet wird und nicht
 *  danebensteht (Regel 15). */
export interface Wahlart {
  id: string;
  name: string;
  /** Faktor auf die Lebenspunkte aller Gegner dieses Abschnitts. */
  druck: number;
  /** Faktor auf alles Gold dieses Abschnitts. */
  beute: number;
}

/** **Drei Arten, und die mittlere ist nicht ueberfluessig.**
 *
 *  Zwei Angebote waeren eine Frage nach dem Mut; drei sind eine nach dem
 *  Zustand. Wer knapp durchgekommen ist, nimmt die stille Schicht; wer
 *  Kristall uebrig hat, kauft sich Gold gegen Druck. Die mittlere ist die
 *  Antwort "keins von beidem", und ohne sie waere jede Wahl ein Ausschlag.
 *
 *  **Die Staerken sind nicht geeicht**, und das steht hier statt in einer
 *  Fussnote: sie sind so gesetzt, dass `npm run sim` einen Unterschied MISST
 *  (die Spreizung steht in jedem Lauf), nicht so, dass eine davon gewinnt.
 *  Eichen laesst sich das erst, wenn die Kurve des Laufs steht (N1K). */
export const WAHLARTEN: Wahlart[] = [
  { id: 'ruhig', name: 'Stille Schicht', druck: 0.85, beute: 0.85 },
  { id: 'gerade', name: 'Klarer Weg', druck: 1.0, beute: 1.0 },
  { id: 'reich', name: 'Reiche Ader', druck: 1.3, beute: 1.35 },
];

export interface AbschnittsAngebot {
  /** `<karte>:<art>` - stabil, damit ein gesicherter Lauf dasselbe Angebot
   *  wiederfindet, das er vor dem Schliessen gesehen hat. */
  id: string;
  karte: string;
  art: string;
  /** Der Name der Karte - der Ort. */
  name: string;
  /** Der Name der Art - die Auflage. */
  auflage: string;
  druck: number;
  beute: number;
  /** Der Unterschied als Satz, ABGELEITET aus `druck` und `beute`. Wer ihn
   *  daneben schriebe, haette zwei Stellen, die dasselbe behaupten - und
   *  eine davon veraltet (Regel 15). */
  satz: string;
}

/** Wieviele Angebote hoechstens zur Wahl stehen. Zwei ist die Untergrenze:
 *  ein einziges Angebot ist keine Wahl, sondern eine Ansage. */
export const ANGEBOTE_JE_WAHL = 3;

function prozent(f: number): string {
  const p = Math.round(Math.abs(f - 1) * 100);
  return `${f >= 1 ? '+' : '−'}${p} %`;
}

/** **Zwei Teile, immer** - getrennt durch ` · `.
 *
 *  Der erste Entwurf gab fuer die mittlere Art einen einzigen Satz zurueck
 *  ("Gegner und Beute wie gehabt."), und der lief in der Aufnahme rechts aus
 *  der Kachel heraus. Die Form ist nicht Schmuck: das Bild teilt an ` · ` und
 *  setzt Druck und Beute untereinander, damit die zwei Zahlen nicht zu einem
 *  Satz verschwimmen. Wer hier einen Teil weglaesst, bricht das Bild. */
export function angebotSatz(druck: number, beute: number): string {
  const teil = (f: number, was: string, wovon: string): string =>
    (f === 1 ? `${was} unverändert` : `${was} ${prozent(f)} ${wovon}`);
  return `${teil(druck, 'Gegner', 'Leben')} · ${teil(beute, 'Beute', '')}`.trimEnd();
}

/** Ein eigener, kleiner Mischer - dieselbe Ueberlegung wie beim Kartenzug:
 *  eine reine Funktion aus Aussaat und Abschnitt, kein laufender Zustand.
 *  Zwei Laeufe mit derselben Aussaat sehen an derselben Grenze dasselbe
 *  Angebot, gleich was dazwischen passiert ist. */
function mischer(saat: number, abschnitt: number): () => number {
  let x = ((saat >>> 0) ^ Math.imul(abschnitt + 1, 0x85ebca6b)) >>> 0;
  if (x === 0) x = 0x9e3779b9;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 0x100000000;
  };
}

function mischen<T>(liste: T[], wuerfel: () => number): T[] {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(wuerfel() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** **Die Angebote fuer den Abschnitt, der jetzt ansteht.**
 *
 *  Leer, solange keine Wahl offen ist - dann gilt der Plan des Laufs, und
 *  ohne Wahl rechnet alles Zeichen fuer Zeichen wie in v302. Dieselbe
 *  additive Haltung wie beim Wellenzaehler, und aus demselben Grund.
 *
 *  Angeboten werden bevorzugt Karten, die dieser Lauf noch nicht gesehen
 *  hat; bleiben davon weniger als zwei, fuellen die schon besuchten auf.
 *  Ein einziges Angebot waere keine Wahl. */
export function abschnittsWahl(l: LaufZustand): AbschnittsAngebot[] {
  if (!l.wahlOffen || istLaufZuEnde(l)) return [];
  const gesehen = new Set(l.abschnitte.slice(0, l.abschnitt));
  const wuerfel = mischer(l.saat, l.abschnitt);
  const frisch = mischen(MAPS.filter((m) => !gesehen.has(m.id)), wuerfel);
  const alt = mischen(MAPS.filter((m) => gesehen.has(m.id)), wuerfel);
  const karten = [...frisch, ...alt].slice(0, ANGEBOTE_JE_WAHL);
  const arten = mischen(WAHLARTEN, wuerfel);
  return karten.map((m, i) => {
    const a = arten[i % arten.length];
    return {
      id: `${m.id}:${a.id}`,
      karte: m.id,
      art: a.id,
      name: m.name,
      auflage: a.name,
      druck: a.druck,
      beute: a.beute,
      satz: angebotSatz(a.druck, a.beute),
    };
  });
}

/** Ein Angebot annehmen.
 *
 *  **Es wird geprueft, nicht geglaubt**: eine Kennung, die nicht im Angebot
 *  steht, aendert gar nichts. Sonst waere der Lauf ueber die Ablage zu
 *  stellen - dieselbe Haltung wie bei `karteNehmen`. */
export function abschnittWaehlen(l: LaufZustand, angebotId: string): LaufZustand {
  const angebot = abschnittsWahl(l).find((a) => a.id === angebotId);
  if (!angebot) return l;
  const abschnitte = l.abschnitte.slice();
  abschnitte[l.abschnitt] = angebot.karte;
  // Den Plan dahinter nachziehen, damit keine Karte zweimal darin steht.
  // Er entscheidet nichts - gewaehlt wird an jeder Grenze neu -, aber er ist
  // der Nenner der Lebenskurve, und ein Plan mit Dubletten laese sich nicht
  // erklaeren.
  const gesetzt = new Set(abschnitte.slice(0, l.abschnitt + 1));
  const rest = MAPS.map((m) => m.id).filter((id) => !gesetzt.has(id));
  for (let i = l.abschnitt + 1; i < abschnitte.length; i += 1) {
    abschnitte[i] = rest.shift() ?? abschnitte[i];
  }
  return {
    ...l,
    abschnitte,
    druck: angebot.druck,
    beute: angebot.beute,
    wahlOffen: false,
    gewaehlt: [...l.gewaehlt, angebot.id],
  };
}
