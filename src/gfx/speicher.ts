/** Der Bildspeicher: wer haelt was, und was faellt beim Kartenwechsel weg.
 *
 *  **Der Befund, der dazu gefuehrt hat.** Im Rueckstandsverzeichnis stand
 *  T9 als „Bildpuffer bei Groessenwechsel gezielt verwerfen statt alles neu
 *  zu backen". Gemessen stimmt daran nichts: der Untergrund wird in
 *  WELTMASSEN gebacken und bei einem Groessenwechsel gar nicht angefasst,
 *  und verworfen wurde ohnehin nie etwas - keine der acht Ablagen im
 *  Zeichenwerk hat je einen Eintrag geloescht.
 *
 *  Was ein Groessenwechsel wirklich kostet, sind ein bis fuenf Megabyte fuer
 *  den Himmel. Was ein KARTENWECHSEL kostet, waren 12,5: nach drei Karten
 *  lagen 41,5 MB in den Ablagen, und 38 davon gehoerten zu einer bestimmten
 *  Karte. Zwei davon sah man nie wieder.
 *
 *  Deshalb raeumt dieses Modul nach Karte, nicht nach Groesse. Jede Ablage
 *  meldet sich mit einer Tafel an, die zu jedem Schluessel die Karte nennt -
 *  Eintraege ohne Karte (ein Gegnerbild ohne Klimaton, eine Leuchtscheibe)
 *  gehoeren allen und bleiben.
 *
 *  **Warum eine Tafel und keine Schluesselzerlegung.** Der erste Entwurf
 *  las die Karte aus dem Schluessel: `riss:kristall:spiralhain:300x300`.
 *  Das haelt genau so lange, bis jemand ein Trennzeichen aendert - und dann
 *  raeumt es still nichts mehr, ohne dass etwas rot wird. Wer einen Eintrag
 *  ablegt, weiss, zu welcher Karte er gehoert; er schreibt es hin. */

interface Ablage {
  name: string;
  eintraege: Map<string, HTMLCanvasElement>;
  /** Schluessel -> Karte. Was hier fehlt, gehoert allen Karten. */
  tafel: Map<string, string>;
}

const ablagen: Ablage[] = [];

/** Eine Ablage anmelden. Zweimal dieselbe anzumelden ist keine Sache: die
 *  Module tun es beim Laden, und ein Modul wird einmal geladen. */
export function ablageAnmelden(
  name: string, eintraege: Map<string, HTMLCanvasElement>, tafel: Map<string, string>,
): void {
  ablagen.push({ name, eintraege, tafel });
}

/** Wieviel Bildspeicher haelt das Zeichenwerk gerade - je Ablage.
 *  Vier Byte je Bildpunkt; das ist die Rechnung, die auch `spriteBytes`
 *  benutzt. */
export function bildspeicher(): Array<{ name: string; eintraege: number; byte: number }> {
  return ablagen.map(({ name, eintraege }) => {
    let byte = 0;
    for (const cv of eintraege.values()) byte += cv.width * cv.height * 4;
    return { name, eintraege: eintraege.size, byte };
  });
}

/** Summe ueber alle Ablagen. */
export const bildspeicherByte = (): number =>
  bildspeicher().reduce((n, a) => n + a.byte, 0);

/** Welche Eintraege gehoeren gerade zu einer ANDEREN Karte als der gezeigten.
 *
 *  Das ist die schaerfere Aussage als eine Byte-Zahl: nach einem Wechsel darf
 *  keine Ablage mehr etwas von der verlassenen Karte halten. Eine Zahl kann
 *  aus vielen Gruenden klein sein; diese Liste ist nur dann leer, wenn
 *  wirklich geraeumt wurde. */
export function fremdeEintraege(karte: string): Array<{ ablage: string; schluessel: string }> {
  const fremd: Array<{ ablage: string; schluessel: string }> = [];
  for (const { name, tafel } of ablagen) {
    for (const [schluessel, gehoert] of tafel) {
      if (gehoert !== karte) fremd.push({ ablage: name, schluessel });
    }
  }
  return fremd;
}

/** Alles wegwerfen, was zu einer ANDEREN Karte gehoert.
 *
 *  Gibt zurueck, wieviel dabei frei wurde - das Werkzeug misst daran, ob
 *  ueberhaupt geraeumt wurde. Ein Aufraeumer, der nichts freigibt, sieht von
 *  aussen aus wie keiner. */
export function karteWechseln(behalten: string): number {
  let frei = 0;
  for (const { eintraege, tafel } of ablagen) {
    for (const [schluessel, karte] of [...tafel]) {
      if (karte === behalten) continue;
      const cv = eintraege.get(schluessel);
      if (cv) frei += cv.width * cv.height * 4;
      eintraege.delete(schluessel);
      tafel.delete(schluessel);
    }
  }
  return frei;
}
