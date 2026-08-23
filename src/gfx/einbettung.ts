/** Die Einbettung — wie eine gerenderte Figur Teil der Szene wird.
 *
 *  Das Grafik-Audit hat den Befund B3 aufgeschrieben: *drei Bildsprachen auf
 *  einem Bild*. Weich gezeichneter Untergrund, flächiger Weg, fotorealistisch
 *  gerenderte Figuren. Der Schluss dort war, dass es ohne neue Bilder nicht
 *  weitergeht. Das stimmt für die **Machart** — ein gerendertes Bild wird
 *  durch keinen Filter zu einem gezeichneten.
 *
 *  Es stimmt nicht für die **Szene**. Was mehrere Bilder zu einem Bild macht,
 *  sind drei Dinge, und keines davon braucht neue Bilder:
 *
 *   1. **Ein Licht.** Alle Figuren nehmen dieselbe Sonne an, aus derselben
 *      Richtung, in derselben Farbe.
 *   2. **Ein Schatten.** Jede Figur wirft in dieselbe Richtung und wird an
 *      ihrem Fuß verschattet.
 *   3. **Ein Farbklima.** Alles wird ein paar Prozent zum Farbklima der Szene
 *      gezogen. Das ist der Griff, mit dem im Film aus getrennt gedrehten
 *      Aufnahmen eine Szene wird.
 *
 *  Punkt 1 und 2 gab es seit v59 — aber **nur für Türme und Gegner**. Der
 *  Zielturm, die Tore und die Sockel liefen an allem vorbei: `getObjectArt`
 *  war ein nackter Bildlader ohne Kartenkenntnis. Deshalb sah gerade die
 *  Kristallfestung aus wie aufgeklebt, und deshalb steht die Einbettung
 *  jetzt hier — an einer Stelle, für alle.
 *
 *  Punkt 3 ist neu. Gemessen war der Zielturm auf dem Spiralhain **0,41** vom
 *  Boden entfernt (mittlere Farbe, euklidisch in RGB), auf der Frostspalte
 *  nur 0,18. Er ist für eine der drei Karten gebaut und steht auf den anderen
 *  beiden in der falschen Welt.
 *
 *  **Die Grenze nach unten:** Angleichen heißt nicht Angleichen bis zur
 *  Ununterscheidbarkeit. Befund B5 des Audits warnt genau davor — elf von
 *  zwölf Figuren lagen einmal im Helligkeitsband des Untergrunds und waren
 *  nur an ihrem Saum zu erkennen. Der Anstrich ist deshalb gedeckelt, und
 *  `npm run einbettung` misst beides: den Farbabstand UND den
 *  Helligkeitsabstand. Eine Zahl allein liesse sich immer erreichen.
 */
import { getBackground } from './backgrounds';
import { mapById } from '../data/maps';
import { hexA } from './glow';

/** Wie stark das Farbklima aufgetragen wird.
 *
 *  Ausgeeicht mit `npm run einbettung -- --eichen`, und zwar über den ganzen
 *  Raum von 0 bis 0,70 (Regel 9). Zwei Anläufe, beide lehrreich:
 *
 *  Der erste trug das Klima als gewöhnliche Waschung auf. Sie verschiebt
 *  Farbe und Helligkeit ZUSAMMEN, und damit schlossen sich die beiden Bänder
 *  gegenseitig aus: der Spiralhain brauchte 0,55, damit der Farbabstand ins
 *  Band kam, die Frostspalte fiel ab 0,40 unten heraus, weil die Figur dann
 *  nicht mehr zu sehen war (Audit B5).
 *
 *  Der zweite maß den Farbabstand euklidisch in RGB — und das ist zum
 *  größten Teil Helligkeit. Ein Farbtongriff, der die Helligkeit in Ruhe
 *  lässt, bewegte diese Zahl deshalb kaum: **die Messlatte konnte gar nicht
 *  sehen, was ich verändern wollte.**
 *
 *  Mit getrennten Achsen — Leuchtdichte gegen Buntheit — bleibt der
 *  Helligkeitsabstand bei JEDER Stärke gleich (0,16 auf dem Spiralhain), und
 *  der Farbabstand fällt von 0,31 auf 0,16 bei 0,70.
 *
 *  Warum trotzdem 0,40 und nicht 0,70: bei 0,70 wäre der Zielturm auf dem
 *  Spiralhain braun. Sein Blau IST seine Identität — wer ihn ganz einbettet,
 *  macht ihn kaputt. 0,40 schließt die Hälfte des Abstands (0,31 → 0,22) und
 *  lässt ihn einen Kristall bleiben. Der Rest ist nicht durch Anstreichen zu
 *  holen, sondern durch das, was in Abschnitt 5.4 des Audits steht. */
export const KLIMA_STAERKE = 0.40;

/** Das Farbklima einer Karte: die mittlere Farbe ihres Untergrundbildes.
 *
 *  GERECHNET, nicht aufgeschrieben. Eine Farbe in `maps.ts` wäre nach dem
 *  nächsten `pack-art` still falsch — dieselbe Familie, die in diesem
 *  Verzeichnis schon eine veraltete Zahl vier Runden lang weitergetragen hat.
 *
 *  Gemessen an einer 24×24-Probe: das ist grob genug, um in einem Bild kaum
 *  zu kosten, und fein genug für einen Mittelwert. */
const klimaCache = new Map<string, string>();

export function kartenKlima(mapId: string): string | null {
  const fertig = klimaCache.get(mapId);
  if (fertig) return fertig;

  const bild = getBackground(mapId);
  if (!bild || !bild.width) return null;

  const N = 24;
  const cv = document.createElement('canvas');
  cv.width = N; cv.height = N;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bild, 0, 0, N, N);
  let d: Uint8ClampedArray;
  try {
    d = g.getImageData(0, 0, N, N).data;
  } catch {
    // Kein Zugriff auf die Punkte (etwa ohne Bildunterstuetzung): dann bleibt
    // es beim Sonnenton der Karte, statt dass das Zeichnen abbricht.
    return null;
  }
  let r = 0, gr = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  const hex = '#'
    + Math.round(r / n).toString(16).padStart(2, '0')
    + Math.round(gr / n).toString(16).padStart(2, '0')
    + Math.round(b / n).toString(16).padStart(2, '0');
  klimaCache.set(mapId, hex);
  return hex;
}

/** Woran haengt die Einbettung? In den Schluessel des Zwischenspeichers,
 *  damit ein noch nicht geladenes Untergrundbild nicht dauerhaft ein Bild
 *  ohne Farbklima festhaelt. */
export function einbettungSchluessel(mapId: string): string {
  return `${mapId}|${kartenKlima(mapId) ?? '-'}`;
}

/** Eine gezeichnete Figur in die Karte einbetten.
 *
 *  Erwartet einen Zeichenstift, auf dem die Figur schon steht, und traegt
 *  darauf Sonne, Bodenverschattung, Rueckwurf und Farbklima auf - alles nur
 *  auf der Silhouette (`source-atop`), damit der durchsichtige Rand
 *  durchsichtig bleibt.
 *
 *  `staerke` skaliert alles gemeinsam. Der Zielturm bekommt weniger als ein
 *  Turm: er ist dreimal so gross, und derselbe Anstrich waere auf dieser
 *  Flaeche eine Waschung statt einer Beleuchtung. */
export function einbetten(
  g: CanvasRenderingContext2D, size: number, mapId: string, staerke = 1,
): void {
  const sonne = mapById(mapId).palette.sonne;
  const vorher = g.globalCompositeOperation;
  g.globalCompositeOperation = 'source-atop';

  // --- Das Farbklima. Zuerst, damit Licht und Schatten darueber liegen und
  // nicht darunter: ein Klima unter dem Licht sieht aus wie ein Filter, ein
  // Klima unter der Figur wie eine Umgebung.
  // Nur ueber den FARBTON, nicht ueber die Helligkeit: `color` nimmt Farbton
  // und Saettigung von der Quelle und die Leuchtdichte vom Untergrund. Eine
  // gewoehnliche Waschung verschoebe beides zusammen, und dann kostet
  // Zugehoerigkeit Sichtbarkeit - siehe der Kasten an KLIMA_STAERKE.
  //
  // Der Umweg ueber eine zweite Leinwand ist noetig, weil ein Mischmodus auch
  // auf durchsichtige Punkte malt; zurueckmaskiert wird mit dem Alpha des
  // Bildes, das hier schon steht.
  const klima = kartenKlima(mapId);
  if (klima && typeof document !== 'undefined') {
    const quelle = g.canvas;
    const misch = document.createElement('canvas');
    misch.width = quelle.width; misch.height = quelle.height;
    const mg = misch.getContext('2d');
    if (mg) {
      mg.drawImage(quelle, 0, 0);
      mg.globalCompositeOperation = 'color';
      mg.globalAlpha = KLIMA_STAERKE * staerke;
      mg.fillStyle = klima;
      mg.fillRect(0, 0, misch.width, misch.height);
      mg.globalAlpha = 1;
      mg.globalCompositeOperation = 'destination-in';
      mg.drawImage(quelle, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(misch, 0, 0);
      g.globalCompositeOperation = 'source-atop';
    }
  }

  // --- Sonnenanstrich von oben links, wo die Sonne steht, nach unten
  // abnehmend; unten uebernimmt die Verschattung, weil dort das Licht vom
  // Boden geschluckt wird.
  const licht = g.createLinearGradient(0, 0, size * 0.55, size);
  licht.addColorStop(0, hexA(sonne, 0.30 * staerke));
  licht.addColorStop(0.45, hexA(sonne, 0.14 * staerke));
  licht.addColorStop(1, hexA(sonne, 0.02 * staerke));
  g.fillStyle = licht;
  g.fillRect(0, 0, size, size);

  // --- Bodennaehe verschatten: dort faellt weniger Licht ein.
  const dunkel = g.createLinearGradient(0, size * 0.55, 0, size);
  dunkel.addColorStop(0, 'rgba(24,20,14,0)');
  dunkel.addColorStop(1, `rgba(24,20,14,${0.34 * staerke})`);
  g.fillStyle = dunkel;
  g.fillRect(0, 0, size, size);

  // --- Bodenlicht: der helle Sand wirft Sonne zurueck.
  //
  // In einer echten Szene ist die Unterseite eines Gegenstands nicht nur
  // dunkler, sondern auch waermer, weil der beschienene Boden darunter Sonne
  // hinaufwirft. Der Saum sitzt deshalb ZWISCHEN Verschattung und
  // Standflaeche: ganz unten dunkel, knapp darueber ein warmer Schimmer.
  const rueckwurf = g.createLinearGradient(0, size * 0.72, 0, size * 0.94);
  rueckwurf.addColorStop(0, hexA(sonne, 0));
  rueckwurf.addColorStop(0.55, hexA(sonne, 0.20 * staerke));
  rueckwurf.addColorStop(1, hexA(sonne, 0));
  g.fillStyle = rueckwurf;
  g.fillRect(0, 0, size, size);

  g.globalCompositeOperation = vorher;
}
