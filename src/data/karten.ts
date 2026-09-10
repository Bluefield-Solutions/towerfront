import { Rng } from '../core/rng';

/** **Der Kartenzug je Welle** (v303, S-N1-02).
 *
 *  Das ist die Entscheidung, die jede einzelne Welle traegt - und der Ersatz
 *  fuer Turmzweige und Stufen, die mit S-N1-05 entfallen. Rogue Tower zieht
 *  anfangs alle drei Wellen eine aus drei, spaeter jede Welle eine aus sechs.
 *
 *  **Der Stapel ist DATEN, kein Quelltext.** Eine Karte ist eine Zeile mit
 *  Namen, Satz, Art und Wert; wer eine dazulegt, schreibt keine Logik. Das
 *  ist keine Bequemlichkeit, sondern die Bedingung dafuer, dass `npm run sim`
 *  ueber alle Karten messen kann, ohne fuer jede einen Zweig zu kennen.
 *
 *  **Wie klein eine Karte ist, kommt aus der Referenz** (Regel 10). Rogue
 *  Tower gibt je Karte einen Schritt, den man nicht sofort spuert, und
 *  vierzig davon in einem Lauf; die Wirkung entsteht aus der Menge, nicht aus
 *  der einzelnen Karte. Hier sind es 60 Wellen je Lauf, also 60 Karten -
 *  eine Karte, die fuer sich schon entscheidet, waere bei dieser Zahl ein
 *  Fehler im Entwurf und kein starker Zug.
 */
export type KartenArt =
  /** Schaden aller Tuerme, als Faktor. */
  | 'schaden'
  /** Nachladezeit aller Tuerme, als Faktor - kleiner ist schneller. */
  | 'takt'
  /** Reichweite aller Tuerme, als Faktor. */
  | 'reichweite'
  /** Gold sofort. */
  | 'gold'
  /** Beute je Gegner, als Faktor. */
  | 'beute'
  /** Kristall sofort - gedeckelt am Hoechstmass wie jede Reparatur. */
  | 'kristall';

export interface Karte {
  id: string;
  name: string;
  /** Ein Satz, der sagt, was sie TUT - nicht, wie stark sie ist. Die Zahl
   *  steht daneben und wird aus `wert` gebildet, damit Satz und Zahl nicht
   *  auseinanderlaufen koennen (Regel 15). */
  text: string;
  art: KartenArt;
  wert: number;
}

/** **Zwoelf Karten, vier je Achse - und die Zahlen sind bewusst klein.**
 *
 *  Vier Achsen, auf denen ein Lauf wachsen kann: was die Tuerme austeilen
 *  (Schaden, Takt, Reichweite), was hereinkommt (Gold, Beute) und was
 *  aushaelt (Kristall). Drei Karten je Welle aus zwoelf heisst, dass in einem
 *  Lauf von 60 Wellen jede Karte oft genug angeboten wird, um eine Vorliebe
 *  auszubilden - und selten genug, dass die Auswahl nicht jedes Mal
 *  dieselbe ist.
 *
 *  **Die Staerken sind nicht geeicht, und das steht hier statt in einer
 *  Fussnote.** Sie sind so gesetzt, dass eine Karte spuerbar und keine fuer
 *  sich entscheidend ist; ob sie zueinander passen, ist eine Eichrunde, und
 *  die braucht einen Lauf, dessen Kurve nicht drei Spaziergaenge und eine
 *  Wand ist (N1K). Was diese Runde haelt, ist der ZUG - dass er
 *  deterministisch ist, dass die Wahl Folgen hat, und dass keine Karte immer
 *  oder nie genommen wird. */
export const KARTENSTAPEL: Karte[] = [
  { id: 'schliff', name: 'Schliff', text: 'Alle Türme treffen härter.', art: 'schaden', wert: 1.06 },
  { id: 'wucht', name: 'Wucht', text: 'Alle Türme treffen härter.', art: 'schaden', wert: 1.10 },
  { id: 'lauf', name: 'Geölter Lauf', text: 'Alle Türme laden schneller nach.', art: 'takt', wert: 0.95 },
  { id: 'kadenz', name: 'Kadenz', text: 'Alle Türme laden schneller nach.', art: 'takt', wert: 0.91 },
  { id: 'linse', name: 'Linse', text: 'Alle Türme sehen weiter.', art: 'reichweite', wert: 1.05 },
  { id: 'warte', name: 'Warte', text: 'Alle Türme sehen weiter.', art: 'reichweite', wert: 1.09 },
  { id: 'fund', name: 'Fund', text: 'Gold sofort.', art: 'gold', wert: 60 },
  { id: 'hort', name: 'Hort', text: 'Gold sofort.', art: 'gold', wert: 120 },
  { id: 'zoll', name: 'Zoll', text: 'Jeder Gegner bringt mehr.', art: 'beute', wert: 1.08 },
  { id: 'pacht', name: 'Pacht', text: 'Jeder Gegner bringt mehr.', art: 'beute', wert: 1.15 },
  { id: 'kitt', name: 'Kitt', text: 'Kristall zurück.', art: 'kristall', wert: 3 },
  { id: 'guss', name: 'Guss', text: 'Kristall zurück.', art: 'kristall', wert: 6 },
];

/** Die zusammengerechnete Wirkung der genommenen Karten.
 *
 *  Faktoren multiplizieren, Sofortwirkungen summieren - und beides an EINER
 *  Stelle, damit es keine zweite Rechnung gibt, die anders ausgeht
 *  (Regel 15). */
export interface KartenWirkung {
  schadenMul: number;
  taktMul: number;
  reichweiteMul: number;
  beuteMul: number;
  /** Gold, das beim Nehmen sofort gutgeschrieben wurde. */
  gold: number;
  /** Kristall, der beim Nehmen sofort zusammengesetzt wurde. */
  kristall: number;
}

export const KEINE_KARTEN: KartenWirkung = {
  schadenMul: 1, taktMul: 1, reichweiteMul: 1, beuteMul: 1, gold: 0, kristall: 0,
};

export function kartenWirkung(genommen: readonly string[]): KartenWirkung {
  const w: KartenWirkung = { ...KEINE_KARTEN };
  for (const id of genommen) {
    const k = KARTENSTAPEL.find((x) => x.id === id);
    if (!k) continue;
    switch (k.art) {
      case 'schaden': w.schadenMul *= k.wert; break;
      case 'takt': w.taktMul *= k.wert; break;
      case 'reichweite': w.reichweiteMul *= k.wert; break;
      case 'beute': w.beuteMul *= k.wert; break;
      case 'gold': w.gold += k.wert; break;
      case 'kristall': w.kristall += k.wert; break;
    }
  }
  return w;
}

/** Wieviele Karten je Welle zur Wahl stehen. */
export const KARTEN_JE_WELLE = 3;

/** **Der Zug - deterministisch aus Aussaat UND Welle** (S-N1-02).
 *
 *  Kein laufender Zufallszustand, sondern eine reine Funktion: zwei Laeufe
 *  mit derselben Aussaat ziehen in Welle 7 dieselben drei Karten, gleich was
 *  dazwischen passiert ist. Ein Zug aus dem laufenden `Rng` des Spiels waere
 *  von jedem Schuss abhaengig, der vorher gefallen ist - und damit von der
 *  Bildrate, sobald irgendwo ein Zufall mehr oder weniger gezogen wird.
 *
 *  Die Aussaat wird mit der Wellennummer verwoben, statt sie zu addieren:
 *  `saat + welle` gaebe fuer benachbarte Aussaaten verschobene, aber gleiche
 *  Folgen - Lauf A in Welle 8 zoege, was Lauf B in Welle 7 gezogen hat.
 *
 *  Gezogen wird OHNE Zuruecklegen: drei verschiedene Karten, sonst steht
 *  zweimal dieselbe zur Wahl und die Entscheidung schrumpft still. */
export function zieheKarten(
  saat: number, welle: number, anzahl = KARTEN_JE_WELLE,
): Karte[] {
  const rng = new Rng(((saat >>> 0) ^ Math.imul(welle + 1, 0x9e3779b1)) >>> 0);
  // Zwei Leerzuege: xorshift32 braucht ein paar Schritte, bis aus benachbarten
  // Startwerten wirklich verschiedene Folgen werden. Ohne sie zogen die Wellen
  // 1 und 2 gemessen dieselbe erste Karte.
  rng.next(); rng.next();
  const rest = KARTENSTAPEL.slice();
  const gezogen: Karte[] = [];
  const wieviele = Math.min(anzahl, rest.length);
  for (let i = 0; i < wieviele; i += 1) {
    const j = Math.floor(rng.next() * rest.length);
    gezogen.push(rest.splice(j, 1)[0]);
  }
  return gezogen;
}
