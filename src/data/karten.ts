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
  | 'kristall'
  // --- **Sechs Achsen, die das VERHALTEN aendern** (S-N6-01).
  //
  // Die sechs darueber sind alle dieselbe Sorte Karte: eine Zahl wird
  // groesser. Ein Stapel aus nichts als Zahlen ist eine Liste von Prozenten,
  // und die Wahl zwischen +6 % und +10 % Schaden ist keine. Diese sechs
  // aendern, WIE ein Turm sich verhaelt - sie sind aus dem alten Paket P5
  // uebernommen, dort entworfen und nie gebaut.
  //
  // **Alle sechs kosten Erfahrung.** Der Grundstapel bleibt damit bei
  // zwoelf, und die Balance der ersten Karte ist unberuehrt: was ein Lauf
  // freischaltet, ist neues MATERIAL und keine neue Grundeinstellung.
  /** Brand: Treffer setzen in Flammen, `wert` ist der Anteil des
   *  Treffschadens, der je Sekunde nachbrennt. */
  | 'brand'
  /** Markierung: ein getroffenes Ziel nimmt mehr Schaden, `wert` ist der
   *  Anteil. */
  | 'markierung'
  /** Festfrieren: wer schon gebremst ist und noch einmal getroffen wird,
   *  steht still. `wert` ist die Dauer in Sekunden. */
  | 'frost'
  /** Weitschuss: mehr Schaden am aeusseren Rand der Reichweite, `wert` ist
   *  der Anteil ganz aussen. */
  | 'weit'
  /** Nahkampf: mehr Schaden dicht am Turm, `wert` ist der Anteil
   *  unmittelbar davor. Der Name meidet `nahZuschlag` - das Wort gehoert
   *  F6 und meint den ZIELMODUS "nah" (Regel 15). */
  | 'nah'
  /** Bremsdauer: jede Bremse haelt laenger, `wert` ist der Faktor. */
  | 'bremsdauer';

/** **Wie eine Achse in einem Wort heisst.**
 *
 *  Sie steht hier und nicht im Bild: der Kartenstapel zeigt achtzehn Kacheln
 *  nebeneinander, und ein blosses "+3" sagt dort nicht, ob Gold oder Kristall
 *  gemeint ist. Eine Zuordnung im Zeichencode waere die zweite Wahrheit ueber
 *  dieselbe Achse (Regel 15) - und die erste, die veraltet, sobald eine Achse
 *  dazukommt. */
export const ACHSE_NAME: Record<KartenArt, string> = {
  schaden: 'Schaden',
  takt: 'Takt',
  reichweite: 'Reichweite',
  gold: 'Gold',
  beute: 'Beute',
  kristall: 'Kristall',
  brand: 'Brand',
  markierung: 'Markierung',
  frost: 'Frost',
  weit: 'Weitschuss',
  nah: 'Nahkampf',
  bremsdauer: 'Bremsdauer',
};

export interface Karte {
  id: string;
  name: string;
  /** Was sie kostet, um dauerhaft in den Stapel zu kommen (S-N1-04).
   *  **0 heisst: von Anfang an dabei.** Bezahlt wird in Erfahrung, und die
   *  entsteht in einem Lauf - nicht in einer Partie und nicht an einem
   *  Grad. */
  kosten: number;
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
  { id: 'schliff', name: 'Schliff', text: 'Alle Türme treffen härter.', art: 'schaden', wert: 1.06, kosten: 0 },
  { id: 'wucht', name: 'Wucht', text: 'Alle Türme treffen härter.', art: 'schaden', wert: 1.10, kosten: 0 },
  { id: 'lauf', name: 'Geölter Lauf', text: 'Alle Türme laden schneller nach.', art: 'takt', wert: 0.95, kosten: 0 },
  { id: 'kadenz', name: 'Kadenz', text: 'Alle Türme laden schneller nach.', art: 'takt', wert: 0.91, kosten: 0 },
  { id: 'linse', name: 'Linse', text: 'Alle Türme sehen weiter.', art: 'reichweite', wert: 1.05, kosten: 0 },
  { id: 'warte', name: 'Warte', text: 'Alle Türme sehen weiter.', art: 'reichweite', wert: 1.09, kosten: 0 },
  { id: 'fund', name: 'Fund', text: 'Gold sofort.', art: 'gold', wert: 60, kosten: 0 },
  { id: 'hort', name: 'Hort', text: 'Gold sofort.', art: 'gold', wert: 120, kosten: 0 },
  { id: 'zoll', name: 'Zoll', text: 'Jeder Gegner bringt mehr.', art: 'beute', wert: 1.08, kosten: 0 },
  { id: 'pacht', name: 'Pacht', text: 'Jeder Gegner bringt mehr.', art: 'beute', wert: 1.15, kosten: 0 },
  { id: 'kitt', name: 'Kitt', text: 'Kristall zurück.', art: 'kristall', wert: 3, kosten: 0 },
  { id: 'guss', name: 'Guss', text: 'Kristall zurück.', art: 'kristall', wert: 6, kosten: 0 },
  // **Sechs, die erst ein Lauf in den Stapel bringt** (S-N1-04).
  //
  // Eine je Achse, und je die staerkste. **Was gekauft wird, ist eine KARTE
  // und keine Wertschraube:** der Stapel waechst von zwoelf auf achtzehn,
  // angeboten werden weiter drei - die Auswahl wird breiter, nicht die Zahl
  // auf dem Knopf groesser. Eine siebte Achse waere eine Mechanik und keine
  // Karte; deshalb bleiben es die sechs, die es gibt.
  //
  // **Sie machen die schwaechere Karte derselben Achse nicht tot.** Der Zug
  // legt drei aus achtzehn vor, und gewaehlt wird nach der Achse zuerst:
  // eine schwache Karte wird genommen, sooft sie die einzige ihrer Achse im
  // Angebot ist. `npm run sim` misst genau das ueber beide Staende des
  // Stapels - den, mit dem gespielt wird, und den vollen.
  { id: 'brandsatz', name: 'Brandsatz', text: 'Alle Türme treffen härter.', art: 'schaden', wert: 1.16, kosten: 700 },
  { id: 'schlagzahl', name: 'Schlagzahl', text: 'Alle Türme laden schneller nach.', art: 'takt', wert: 0.86, kosten: 700 },
  { id: 'fernrohr', name: 'Fernrohr', text: 'Alle Türme sehen weiter.', art: 'reichweite', wert: 1.14, kosten: 500 },
  { id: 'spende', name: 'Spende', text: 'Gold sofort.', art: 'gold', wert: 220, kosten: 500 },
  { id: 'schatzamt', name: 'Schatzamt', text: 'Jeder Gegner bringt mehr.', art: 'beute', wert: 1.22, kosten: 900 },
  { id: 'bergung', name: 'Bergung', text: 'Kristall zurück.', art: 'kristall', wert: 12, kosten: 900 },
  // **Sechs Wirkungen statt sechs Prozentzahlen** (S-N6-01).
  //
  // Jede aendert das Verhalten und nicht die Hoehe: der Brand laeuft weiter,
  // wenn kein Turm mehr trifft; die Markierung belohnt, dasselbe Ziel zu
  // halten, statt zu verteilen; der Frost macht aus zwei Bremsen einen
  // Stillstand; Weitschuss und Nahkampf machen die LAGE eines Turms zur
  // Entscheidung, und zwar in entgegengesetzte Richtungen; die Bremsdauer
  // macht den Frostturm zum Traeger statt zum Beiwerk.
  //
  // **Die Zahlen sind so klein wie die der uebrigen Karten** und aus
  // demselben Grund (Regel 10, Rogue Tower): eine Karte, die fuer sich schon
  // entscheidet, waere bei 60 Karten je Lauf ein Fehler im Entwurf.
  { id: 'zunder', name: 'Zunder', text: 'Treffer setzen in Flammen.', art: 'brand', wert: 0.30, kosten: 800 },
  { id: 'kerbe', name: 'Kerbe', text: 'Getroffene Ziele nehmen mehr Schaden.', art: 'markierung', wert: 0.18, kosten: 800 },
  { id: 'eisgriff', name: 'Eisgriff', text: 'Wer schon bremst, friert fest.', art: 'frost', wert: 0.9, kosten: 1000 },
  { id: 'zielfernrohr', name: 'Zielfernrohr', text: 'Mehr Schaden am Rand der Reichweite.', art: 'weit', wert: 0.35, kosten: 700 },
  { id: 'bajonett', name: 'Bajonett', text: 'Mehr Schaden dicht am Turm.', art: 'nah', wert: 0.35, kosten: 700 },
  { id: 'raureif', name: 'Raureif', text: 'Bremsen halten länger.', art: 'bremsdauer', wert: 1.6, kosten: 600 },
];

/** **Der Stapel, mit dem ein frischer Spielstand anfaengt.**
 *
 *  Abgeleitet aus `kosten`, nicht als zweite Liste (Regel 15): wer eine
 *  Karte dazulegt, entscheidet mit ihrem Preis, ob sie von Anfang an dabei
 *  ist - eine gepflegte Grundliste daneben veraltete an genau dieser Zeile. */
export const GRUNDSTAPEL: Karte[] = KARTENSTAPEL.filter((k) => k.kosten === 0);

/** Der Stapel, aus dem gezogen wird: die Grundkarten und die
 *  freigeschalteten. Unbekannte Kennungen fallen still weg - eine Ablage aus
 *  einer spaeteren Fassung darf keinen Zug zum Absturz bringen. */
export function stapelAus(freigeschaltet: readonly string[]): Karte[] {
  const frei = new Set(freigeschaltet);
  return KARTENSTAPEL.filter((k) => k.kosten === 0 || frei.has(k.id));
}

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
  // --- Die sechs Wirkungen (S-N6-01). Alle SUMMIEREN sich, sie
  // multiplizieren nicht: zwei Anteile von 0,18 sind 0,36 und nicht 1,39.
  // Nur die Bremsdauer ist ein Faktor und multipliziert deshalb.
  /** Anteil des Treffschadens, der je Sekunde nachbrennt. 0 = kein Brand. */
  brandAnteil: number;
  /** Anteil, den ein Treffer auf ein markiertes Ziel zusaetzlich anrichtet. */
  markierung: number;
  /** Dauer des Stillstands in Sekunden. 0 = kein Festfrieren. */
  frostDauer: number;
  /** Anteil Zuschlag ganz aussen an der Reichweite. */
  weit: number;
  /** Anteil Zuschlag unmittelbar vor dem Turm. */
  nah: number;
  /** Faktor auf die Dauer jeder Bremse. */
  bremsdauerMul: number;
}

export const KEINE_KARTEN: KartenWirkung = {
  schadenMul: 1, taktMul: 1, reichweiteMul: 1, beuteMul: 1, gold: 0, kristall: 0,
  brandAnteil: 0, markierung: 0, frostDauer: 0, weit: 0, nah: 0, bremsdauerMul: 1,
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
      case 'brand': w.brandAnteil += k.wert; break;
      case 'markierung': w.markierung += k.wert; break;
      case 'frost': w.frostDauer += k.wert; break;
      case 'weit': w.weit += k.wert; break;
      case 'nah': w.nah += k.wert; break;
      case 'bremsdauer': w.bremsdauerMul *= k.wert; break;
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
  stapel: readonly Karte[] = GRUNDSTAPEL,
): Karte[] {
  const rng = new Rng(((saat >>> 0) ^ Math.imul(welle + 1, 0x9e3779b1)) >>> 0);
  // Zwei Leerzuege: xorshift32 braucht ein paar Schritte, bis aus benachbarten
  // Startwerten wirklich verschiedene Folgen werden. Ohne sie zogen die Wellen
  // 1 und 2 gemessen dieselbe erste Karte.
  rng.next(); rng.next();
  const rest = stapel.slice();
  const gezogen: Karte[] = [];
  const wieviele = Math.min(anzahl, rest.length);
  for (let i = 0; i < wieviele; i += 1) {
    const j = Math.floor(rng.next() * rest.length);
    gezogen.push(rest.splice(j, 1)[0]);
  }
  return gezogen;
}
