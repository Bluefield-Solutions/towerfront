import { WORLD_H, WORLD_W } from '../data/config';
import { PATH_CLEARANCE } from '../data/maps';
import { TOWERS, type TowerId } from '../data/towers';
import type { GameState } from '../game/state';
import type { Tower } from '../game/types';

/**
 * Die Fläche, auf der ein Turm NICHT stehen darf - als Pfad.
 *
 * **Warum gezeichnet und nicht abgetastet.** Bis v202 hing über der Karte ein
 * Punktraster: `canPlace` wurde alle 48 Weltpunkte gefragt und wo es ja sagte,
 * kam ein Punkt hin. Das beantwortet "hier herum geht es", aber nie "genau
 * hier hört es auf" - gemeldet als *"man sieht nicht exakt, wo der Weg endet,
 * das ist nicht pixelgenau"*. Feiner abzutasten hilft nicht: gemessen auf der
 * Ascheschlucht kostet ein Viertelraster **1,9 s je Turmsorte**, also acht
 * Sekunden je Karte - und ein Telefon ist ein Vielfaches davon.
 *
 * Der Ausweg ist, dass die Bauregel gar keine Abtastung braucht. `warumNicht`
 * besteht aus genau vier geometrischen Formen, und die kann man ZEICHNEN:
 *
 *   * **Rand** - ein Band der Breite `r` am Feldrand,
 *   * **Weg** - je Bahn ein Schlauch der örtlichen Breite `r + Abstand +
 *     halbe Wegbreite`,
 *   * **Gelände** - ein Kreis um jeden unwegsamen Fleck, `g.r + r`,
 *   * **Turm** - ein Kreis um jeden stehenden Turm.
 *
 * Alles in EINEN Pfad, einmal gefüllt. Ein Pfad mit gleichem Umlaufsinn füllt
 * seine Vereinigung gleichmäßig - überlappende Kreise werden nicht doppelt
 * dunkel, und die Kante zwischen gefüllt und ungefüllt liegt exakt auf der
 * Regel statt in einem Raster.
 *
 * **Und der Schlauch ist keine Näherung.** Die Bauregel fragte bis v202
 * `distanceTo` und `halfNear` - Abstand von der nächsten Strecke, Breite vom
 * nächsten Punkt. Zwei Stellen der Kurve, also ein Gebiet ohne Form: gemessen
 * lag die gezeichnete Kante bis zu **30,8 Weltpunkte** neben der Regel, und
 * kein Zeichnen der Welt hätte das eingeholt. Seit v203 ist die Regel
 * `schlauchAbstand` - ein Minimum über Kreise -, und hier stehen genau diese
 * Kreise. `npm run bauflaeche` misst den Abstand zwischen beidem, statt ihn
 * zu behaupten.
 */

const gebacken = new Map<string, Path2D>();
let letzteKarte = '';

/** Der Teil, der sich während einer Partie nicht ändert: Rand, Weg, Gelände.
 *  Er hängt nur an Karte und Platzbedarf, also wird er einmal gebaut. */
function statisch(s: GameState, r: number): Path2D {
  const p = new Path2D();

  // Rand: vier Bänder der Breite r. Gleicher Umlaufsinn wie die Kreise.
  p.rect(0, 0, WORLD_W, r);
  p.rect(0, WORLD_H - r, WORLD_W, r);
  p.rect(0, 0, r, WORLD_H);
  p.rect(WORLD_W - r, 0, r, WORLD_H);

  // Genau die Kreise, aus denen `schlauchAbstand` sein Minimum bildet - ein
  // Kreis je Abtastpunkt der Kurve, mit der dortigen Breite. Keine eigene
  // Abtastung, keine Pfeilhoehe, keine Naeherung.
  for (const lane of s.lanes) {
    for (let i = 0; i < lane.pts.length; i++) {
      kreis(p, lane.pts[i].x, lane.pts[i].y, r + PATH_CLEARANCE + (lane.half[i] ?? 42));
    }
  }

  for (const g of s.map.rough) kreis(p, g.x, g.y, g.r + r);

  return p;
}

function kreis(p: Path2D, x: number, y: number, r: number): void {
  p.moveTo(x + r, y);
  p.arc(x, y, r, 0, Math.PI * 2);
}

/** Der verbotene Bereich für diese Turmsorte, mit den stehenden Türmen darin.
 *
 *  `ausser` ist der Turm, den man gerade versetzt - er blockiert sich nicht
 *  selbst, genau wie in `warumNicht`.
 *
 *  `wuchs` lässt den ganzen Bereich um so viele Punkte wachsen. Das Spiel
 *  benutzt es nicht - `npm run bauflaeche` baut damit seine Nullprobe: ein
 *  absichtlich um sechs Punkte danebenliegender Pfad, an dem sich zeigt, dass
 *  die Messung eine falsche Kante überhaupt sieht (Regel 13). Es steht hier
 *  und nicht im Werkzeug, weil ein nachgebauter Pfad eine zweite Fassung
 *  derselben Geometrie wäre - und die veraltet (Regel 15). */
export function verbotenerBereich(
  s: GameState, id: TowerId, { wuchs = 0, ausser = null as Tower | null } = {},
): Path2D {
  const r = TOWERS[id].footprint / 2 + wuchs;
  if (letzteKarte !== s.map.id) { gebacken.clear(); letzteKarte = s.map.id; }
  const schluessel = `${s.map.id}|${r}`;
  let feste = gebacken.get(schluessel);
  if (!feste) { feste = statisch(s, r); gebacken.set(schluessel, feste); }

  const p = new Path2D(feste);
  for (const t of s.towers) {
    if (t === ausser) continue;
    kreis(p, t.x, t.y, r + TOWERS[t.def].footprint / 2 + 4);
  }
  return p;
}

/** Die Ablage leeren - für Werkzeuge, die mehrere Karten in einem Lauf
 *  messen. Im Spiel besorgt das der Kartenwechsel selbst. */
export function bauflaecheVergessen(): void {
  gebacken.clear();
  letzteKarte = '';
}
