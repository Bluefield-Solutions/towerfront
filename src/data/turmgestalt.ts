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
 *  ein Punkt IM Bild und wandert mit ihm nach oben. */
export const WAFFE_HOCH = 0.12;
/** Breite des Waffenbildes, in Zeichenbreiten des Turms. */
export const WAFFE_BREIT = 0.56;

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
 *  Bolzenspitze auf dem WAFFENBILD.
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
  // Bolzenspitze auf `waffe_arrow`, Mittelband gemessen: oberste Zeile 0,074.
  arrow: { x: 0.5, y: 0.074, dreht: true },
  // Rohroeffnung auf `mortar_1_1`: Schwerpunkt der obersten sechs Prozent.
  mortar: { x: 0.404, y: 0.032, dreht: false },
  // Kristallspitze auf `prism_1_1`.
  prism: { x: 0.589, y: 0.035, dreht: false },
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
    // nach oben, gedreht wird um `angle + PI/2` - ausgerechnet bleibt davon
    // genau "L Weltpunkte in Zielrichtung".
    const nabe = masse.oben + masse.h * WAFFE_HOCH;
    const ww = masse.w * WAFFE_BREIT;
    const l = (0.5 - m.y) * ww;
    return { x: Math.cos(angle) * l, y: nabe + Math.sin(angle) * l };
  }
  // Fester Punkt im Bild. Gespiegelt, sobald der Turm nach links blickt -
  // genau wie das Bild selbst.
  const links = Math.cos(angle) < 0;
  const dx = (m.x - 0.5) * masse.w;
  return { x: links ? -dx : dx, y: masse.oben + m.y * masse.h };
}
