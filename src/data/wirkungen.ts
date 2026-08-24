/** Wirkungen, die an einem Gegner hängen können (TF-015).
 *
 *  **Warum eine Liste und nicht Felder.** Bis v157 kannte das Spiel genau
 *  ZWEI Statuswirkungen, und beide standen als feste Felder am Gegner:
 *  `slowFactor` und `slowLeft`. Jede weitere Idee — Gift, Panzerbruch,
 *  Brand, Aufladung — hätte zwei weitere Felder gebraucht, einen weiteren
 *  Parameter an `damage()` (das hatte schon sieben) und einen weiteren Zweig
 *  an jeder der fünf Aufrufstellen. Beim fünften Effekt wäre das nicht mehr
 *  zu überblicken.
 *
 *  **Und es war nicht nur unbequem, es war falsch.** Die beiden Felder liefen
 *  unabhängig voneinander: `slowFactor` nahm das Minimum, `slowLeft` das
 *  Maximum. Ein starker kurzer Frost und eine schwache lange Bremse ergaben
 *  zusammen die STARKE Bremse für die LANGE Dauer — eine Wirkung, die keine
 *  der beiden Quellen hatte. Gemessen ist der Fall selten (der Frostturm ist
 *  meist die einzige Quelle), aber er ist da, und er ist nicht zu reparieren,
 *  solange Stärke und Dauer getrennt liegen.
 *
 *  Mit einer Liste hängt jede Dauer an ihrer eigenen Stärke. Das ist der
 *  eigentliche Grund für diese Runde; die Erweiterbarkeit kommt dazu.
 *
 *  **Was hier NICHT steht:** wie eine Wirkung aussieht. Das Bild gehört zum
 *  Zeichenwerk, die Regel hierher. */

/** Die Arten, die es gibt. Eine neue Wirkung ist ein Eintrag hier plus die
 *  Stelle, die sie ausliest — nicht mehr. */
export type WirkungsArt =
  /** Verlangsamt. `staerke` ist der ANTEIL, der abgezogen wird: 0,3 heißt
   *  30 % langsamer. Der Widerstand des Gegners (`slowResist`) wird beim
   *  Anlegen eingerechnet, nicht beim Auslesen — sonst müsste jede
   *  auslesende Stelle ihn kennen. */
  | 'bremse';

export interface Wirkung {
  art: WirkungsArt;
  /** Bedeutung je Art, siehe oben. Immer schon verrechnet mit dem, was der
   *  Gegner an Widerstand mitbringt. */
  staerke: number;
  /** Restlaufzeit in Sekunden. Läuft sie ab, fällt die Wirkung weg. */
  rest: number;
}

/** Eine Wirkung anlegen.
 *
 *  **Warum nicht ein Eintrag je Art.** Der erste Entwurf hielt genau einen
 *  Eintrag je Art und frischte ihn auf: stärkere Stärke, längere Restzeit.
 *  Das ist falsch, und zwar in eine Richtung, die niemand erwartet — eine
 *  starke Bremse mit 1 s Rest und eine schwache mit 5 s ergaben zusammen
 *  *1 s stark, dann nichts*. Schwächer als jede der beiden Quellen allein.
 *  Gemessen kostete das über die ganze Balance rund ein Fünftel.
 *
 *  Jetzt trägt **jede Stärke ihre eigene Uhr**. Nur was gleich stark ist,
 *  wird aufgefrischt — die Aura eines Frostturms tickt in jedem Bild und
 *  liefert dabei immer denselben Wert, das ist also derselbe Eintrag.
 *
 *  **Und die Liste bleibt trotzdem kurz:** was schwächer UND kürzer ist als
 *  ein vorhandener Eintrag, wird gar nicht erst angelegt; was von der neuen
 *  Wirkung überdeckt wird, fällt heraus. Übrig bleibt die Treppe aus
 *  Stärke gegen Restzeit, und die hat so viele Stufen wie es verschieden
 *  starke Quellen in Reichweite gibt — in der Praxis eine oder zwei.
 *
 *  Die Liste wird nur angelegt, wenn wirklich etwas landet: bei zweihundert
 *  Gegnern im Feld ist ein leeres Feld billiger als zweihundert leere
 *  Listen. */
export function wirkungAnlegen(
  liste: Wirkung[] | null, art: WirkungsArt, staerke: number, dauer: number,
): Wirkung[] | null {
  if (staerke <= 0 || dauer <= 0) return liste;
  const l = liste ?? [];
  let raus = 0;
  for (let i = 0; i < l.length; i++) {
    const w = l[i];
    if (raus) l[i - raus] = w;
    if (w.art !== art) continue;
    // Dieselbe Quelle, die weitertickt: auffrischen und fertig.
    if (Math.abs(w.staerke - staerke) < 1e-9) {
      w.rest = Math.max(w.rest, dauer);
      if (raus) l.length -= raus;
      return l;
    }
    // Der vorhandene ist in JEDER Hinsicht besser - die neue Wirkung
    // aendert nichts.
    if (w.staerke >= staerke && w.rest >= dauer) {
      if (raus) l.length -= raus;
      return l;
    }
    // Umgekehrt: der vorhandene wird vollstaendig ueberdeckt und faellt raus.
    if (staerke >= w.staerke && dauer >= w.rest) raus++;
  }
  if (raus) l.length -= raus;
  l.push({ art, staerke, rest: dauer });
  return l;
}

/** Die Uhr weiterstellen. Gibt zurück, ob sich etwas geändert hat.
 *
 *  Abgelaufene Wirkungen werden an Ort und Stelle herausgenommen, ohne eine
 *  neue Liste zu erzeugen — der Ablauf läuft in jedem Bild über jeden
 *  Gegner. */
export function wirkungenTicken(liste: Wirkung[] | null, dt: number): boolean {
  if (!liste || !liste.length) return false;
  let raus = 0;
  for (let i = 0; i < liste.length; i++) {
    const w = liste[i];
    w.rest -= dt;
    if (w.rest > 0) { if (raus) liste[i - raus] = w; continue; }
    raus++;
  }
  if (raus) liste.length -= raus;
  return raus > 0;
}

/** Der Tempofaktor aus allen anliegenden Bremsen.
 *
 *  Die STÄRKSTE Bremse zählt, nicht die Summe. Sonst wären zwei Frosttürme
 *  ein Stillstand, und der Widerstand des Leerentitanen wäre umgehbar,
 *  indem man einfach mehr davon baut. */
export function tempoFaktor(liste: Wirkung[] | null): number {
  if (!liste) return 1;
  let stark = 0;
  for (let i = 0; i < liste.length; i++) {
    const w = liste[i];
    if (w.art === 'bremse' && w.staerke > stark) stark = w.staerke;
  }
  return 1 - stark;
}

/** Wieviel Restzeit von dieser Art noch anliegt — 0, wenn keine.
 *
 *  Das Zeichenwerk braucht sie: der Frostüberzug taut sichtbar auf, seine
 *  Deckung folgt der Restdauer. Vorher las es `slowLeft` direkt. */
export function wirkungRest(liste: Wirkung[] | null, art: WirkungsArt): number {
  if (!liste) return 0;
  let rest = 0;
  for (let i = 0; i < liste.length; i++) {
    const w = liste[i];
    if (w.art === art && w.rest > rest) rest = w.rest;
  }
  return rest;
}

/** Liegt eine Wirkung dieser Art an? Für die Anzeige und für die Tore. */
export function hatWirkung(liste: Wirkung[] | null, art: WirkungsArt): boolean {
  return wirkungRest(liste, art) > 0;
}
