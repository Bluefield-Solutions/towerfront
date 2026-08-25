/** Turmgestalt: wo ein Turm gezeichnet wird - und wo sein Rohr endet.
 *
 *  **Warum das hier steht und nicht im Renderer.** Bis v144 rechnete allein
 *  die Zeichenschicht aus, wie hoch ein Turm ist und wo seine Waffe sitzt.
 *  Die Simulation wusste davon nichts, und so erschien jedes Geschoss in der
 *  Turmmitte - gemessen 105 bis 114 Weltpunkte unter der Muendung, auf dem
 *  Zielgeraet 46 bis 50 Bildschirmpunkte. Der Schuss kam aus dem Sockel,
 *  nicht aus dem Rohr, und der Muendungsblitz lag auf dem Boden DAVOR
 *  (TF-019).
 *
 *  Zwei Stellen brauchen dieselbe Antwort: die Zeichenschicht, um Sockel und
 *  Waffe zu setzen, und die Simulation, um zu wissen, wo ein Schuss sichtbar
 *  beginnt. Zwei Rechnungen waeren eine zu viel - gepflegt wuerde die eine,
 *  geschossen haette die andere (Regel 15).
 *
 *  **Der Versatz ist HOEHE, keine Entfernung.** Die Karte ist in
 *  Dreiviertelansicht gemalt: die Muendung liegt hundert Bildpunkte ueber
 *  dem Fuss und steht doch auf demselben Fleck. Der erste Entwurf hat sie
 *  als Flugstrecke mitgerechnet, und `npm run sim` fiel um ein Fuenftel -
 *  der Moerser hielt zu kurz vor und schlug hinter der Traube ein. Deshalb
 *  ist die Flugbahn heute unveraendert, und nur der Zeichenversatz sinkt
 *  binnen einer Zehntelsekunde auf die Bodenebene ab.
 *
 *  **Alle Zahlen sind am Bild gemessen, nicht geschaetzt** (Regel 10):
 *  `npm run muendung` liest sie aus dem gepackten Bildvorrat und prueft die
 *  Eintragungen unten dagegen. Wer ein Turmbild austauscht, bekommt dort
 *  einen roten Lauf statt eines Geschosses, das aus der Luft kommt. */
import type { Vec } from '../core/math';
import { TURM_BREITE, TURM_HOEHE, DRAW_SCALE, type TowerId } from './towers';

/** Wie voll eine gepackte Kachel ist (art/objekte.json, `fill`). */
export const FUELLUNG = 0.94;
/** Unterkante des Turms unter seiner Standmitte, in Zeichenbreiten.
 *  Der Turm waechst nach OBEN aus seiner Standflaeche heraus, nicht um
 *  seine Mitte - sonst sinkt er beim Wachsen zugleich in den Boden ein. */
export const FUSS = 0.28;
/** Wo die Waffenplattform sitzt, von der OBERKANTE aus gemessen, in
 *  Turmhoehen. Von der Oberkante und nicht von der Mitte: die Plattform ist
 *  ein Punkt IM Bild und wandert mit ihm nach oben.
 *
 *  **Gemessen an der Nabe, nicht geschaetzt** (Regel 10 und 12). Der
 *  Sockel traegt oben einen Drehkranz mit einem Loch in der Mitte - das
 *  IST der Drehpunkt, er ist gemalt und muss nicht abgeleitet werden. Er
 *  liegt bei 0,25 der gepackten Kachel (256 x 256), und zwar auf allen
 *  sechs Stufen: nachgesehen mit einem Raster ueber allen sechs Bildern.
 *
 *  Vorher stand hier 0,12. Das war am alten Armbrustturm richtig - einem
 *  schlanken Bau, dessen Plattform fast an der Oberkante sass. Der
 *  Bunker ist gedrungen, seine Nabe liegt doppelt so tief, und mit 0,12
 *  hing die Waffe ueber der linken Kante in der Luft. Die Zahl gehoert
 *  zum BILD, nicht zum Turm - wer den Bildsatz tauscht, misst sie neu.
 *  `npm run muendung` faengt es, seit es die gezeichnete Stufe liest. */
export const WAFFE_HOCH = 0.25;
/** Breite der Waffenkachel, in Zeichenbreiten des Turms.
 *
 *  **Im Raum durchprobiert, nicht nachjustiert** (Regel 9): 0,56 / 0,75 /
 *  0,95 / 1,15 nebeneinander an derselben Aufnahme. Ab 0,95 haengt die
 *  Munitionstrommel hinter dem Drehpunkt ueber die Kuppel hinaus - die
 *  Waffe steht dann nicht mehr auf dem Turm, sondern neben ihm.
 *
 *  Gemessen, was 0,75 bedeutet: der Waffenkoerper ist auf Drehpunkthoehe
 *  0,588 der Waffenkachel breit (Mittel der vier Stufen), der Drehkranz
 *  0,675 der Sockelkachel. Der Koerper deckt damit 65 % des Kranzes - er
 *  sitzt darauf, ohne ihn zu verschlucken. Die 0,56 von vorher waren
 *  49 %; auf dem gedrungenen Bunker las sich das als aufgesetztes Detail.
 *
 *  Messstelle: gepackte Kacheln 256 x 256, Aufnahme `nah` bei 844 x 390. */
export const WAFFE_BREIT = 0.75;

/** Kasten, in dem ein Turm gezeichnet wird - Weltpunkte, relativ zu seiner
 *  Standmitte. `oben` ist die Oberkante (negativ, also ueber der Mitte). */
export function turmMasse(): { w: number; h: number; oben: number } {
  const w = (TURM_BREITE * DRAW_SCALE) / FUELLUNG;
  const h = w * TURM_HOEHE;
  return { w, h, oben: FUSS * w - h };
}

/** Wo die Muendung im Bild des Turms liegt.
 *
 *  `x` und `y` sind Bruchteile des Bildes (0 links/oben, 1 rechts/unten),
 *  gemessen an der obersten Kante der Figur: beim Moerser die
 *  Rohroeffnung, beim Prisma die Kristallspitze, beim Bogenturm die
 *  Muendung des LINKEN Laufs auf dem Waffenbild.
 *
 *  **`x` zaehlt auch bei drehenden Waffen.** Bis v159 tat es das nicht: die
 *  Rechnung unten nahm nur `y` und setzte die Muendung auf die Zielachse.
 *  Das war beim Armbrustturm richtig - ein Bolzen liegt in der Mitte. Die
 *  Zwillingskanone hat ihre Laeufe bei 0,352 und 0,646, also 0,147 neben
 *  der Achse; auf der Achse liegt zwischen ihnen Luft. Der Blitz waere
 *  neben der Waffe erschienen, und das Tor hat es gemeldet, sobald es die
 *  gezeichnete Stufe las.
 *
 *  `dreht` unterscheidet die beiden Zeichenwege:
 *  - `true`  - der Turm hat ein eigenes Waffenbild, das voll mitdreht. Die
 *              Muendung wandert mit dem Zielwinkel um die Plattform.
 *  - `false` - der Turm wird als EIN Bild gezeichnet und dreht sich nicht;
 *              er wird nur gespiegelt, sobald das Ziel links steht. Dann
 *              ist die Muendung ein fester Punkt im Bild, der mitspiegelt.
 *              Eine mitdrehende Muendung waere hier eine Luege: das Rohr
 *              im Bild bleibt ja, wo es ist. */
export interface MuendungsPunkt { x: number; y: number; dreht: boolean; }

export const MUENDUNG: Partial<Record<TowerId, MuendungsPunkt>> = {
  // Linker Lauf der Zwillingskanone. Gemessen an allen vier Waffenbildern:
  // oberste Materialzeile y 0,031 auf jedem, Laufmitten x 0,346 bis 0,355.
  // Genommen wird der kleinste gemeinsame Nenner, nicht ein Mittelwert -
  // ein Mittelwert saesse auf keinem der vier Bilder ganz genau.
  arrow: { x: 0.352, y: 0.031, dreht: true },
  // Rohroeffnung der Haubitze. Gemessen ueber ALLE sechs Stufen, nicht an
  // einer: der Schwerpunkt der obersten sechs Prozent wandert von 0,247 bis
  // 0,328, weil das Rohr mit dem Ausbau die Neigung leicht aendert. Genommen
  // ist der Punkt, der auf jeder Stufe traegt - bei 0,280 / 0,012 liegen
  // mindestens 90 % Material dahinter.
  //
  // Vorher 0,404 / 0,032, gemessen am alten Fantasy-Moerser. Auf der neuen
  // Haubitze lag der Punkt auf fuenf von sechs Stufen in der LUFT (0 bis
  // 43 % Deckung) - das Tor hat es beim ersten Lauf gemeldet.
  mortar: { x: 0.280, y: 0.012, dreht: false },
  // Die Muendung des Laserrohrs, dieselbe Messung: Schwerpunkte 0,322 bis
  // 0,368, gewaehlt 0,316 / 0,012 mit mindestens 90 % Deckung.
  //
  // Vorher 0,589 / 0,035 - die Kristallspitze des alten Turms zeigte nach
  // RECHTS, das neue Rohr zeigt nach links. Der Punkt lag danach auf allen
  // sechs Stufen im Leeren.
  prism: { x: 0.316, y: 0.012, dreht: false },
  // Der Frostturm hat kein Rohr - er pulst im Umkreis. Kein Eintrag ist
  // hier die richtige Antwort, nicht die Turmmitte als Ersatz.
};

/** Die Muendung in Weltpunkten, relativ zur Standmitte des Turms.
 *
 *  Fuer Tuerme ohne Eintrag ist es die Standmitte selbst - der Frostturm
 *  wirkt im Umkreis, sein Mittelpunkt IST sein Ausgangspunkt. */
export function muendung(id: TowerId, angle: number): Vec {
  const m = MUENDUNG[id];
  if (!m) return { x: 0, y: 0 };
  const masse = turmMasse();
  if (m.dreht) {
    // Die Waffe haengt an der Plattform und dreht um sie. Das Bild blickt
    // nach oben, gedreht wird um `angle + PI/2`. Der Punkt im Bild wird
    // also mitgedreht - `laengs` zeigt in Zielrichtung, `quer` daneben.
    //
    // Die Kachel ist quadratisch (256 x 256, siehe art/objekte.json), also
    // ist ihre gezeichnete Hoehe dieselbe wie ihre Breite. Sonst muesste
    // `quer` mit der Breite und `laengs` mit der Hoehe rechnen.
    const nabe = masse.oben + masse.h * WAFFE_HOCH;
    const ww = masse.w * WAFFE_BREIT;
    const laengs = (0.5 - m.y) * ww;
    const quer = (m.x - 0.5) * ww;
    const c = Math.cos(angle), si = Math.sin(angle);
    return { x: c * laengs - si * quer, y: nabe + si * laengs + c * quer };
  }
  // Fester Punkt im Bild. Gespiegelt, sobald der Turm nach links blickt -
  // genau wie das Bild selbst.
  const links = Math.cos(angle) < 0;
  const dx = (m.x - 0.5) * masse.w;
  return { x: links ? -dx : dx, y: masse.oben + m.y * masse.h };
}
