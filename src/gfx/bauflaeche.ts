import { C, WORLD_H, WORLD_W } from '../data/config';
import { PATH_CLEARANCE } from '../data/maps';
import { TOWERS, type TowerId } from '../data/towers';
import type { GameState } from '../game/state';
import type { Tower } from '../game/types';
import { ablageAnmelden } from './speicher';

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

/** Die Stärke der Baukante - eine Stelle, damit `npm run baukante` sie
 *  durchprobieren kann, statt dass sie in einer Zeichenzeile steht.
 *
 *  `dunkel` ist die Abdunklung der verbotenen Fläche, `saum` ein zweiter,
 *  schwächerer Zug auf einem um `saumBreite` gewachsenen Bereich. Der Saum
 *  liegt damit als Band auf der BAUBAREN Seite und macht die Kante lesbar,
 *  ohne die ganze Fläche dunkler zu machen. */
export const KANTE = { innen: 0.12, band: 0.30, licht: 0.26, breite: 10 };

/** Auflösung des gebackenen Kantenbildes, als Teiler der Weltmasse.
 *  Zwei heisst 960 x 540 und 2 MB - die Kante wird dadurch um einen halben
 *  Weltpunkt weich, und das sind bei der Vergroesserung des Zielgeraets rund
 *  ein Drittel Bildpunkt. */
const TEILER = 2;

/** Rand, Weg und Gelände - haengt nur an Karte und Platzbedarf. */
const gebacken = new Map<string, Path2D>();
/** Der fertige Pfad mit den stehenden Tuermen darin.
 *
 *  **Warum das auch noch eine Ablage braucht.** Der Pfad hat rund 1500 Boegen
 *  - je Bahn einen Kreis auf jeden Abtastpunkt. Ihn in jedem Bild neu
 *  zusammenzusetzen ist zwar viel billiger als eine Maske zu backen, aber es
 *  ist auch voellig umsonst: er aendert sich nur, wenn ein Turm dazukommt,
 *  verschwindet oder umzieht. Genau dafuer gibt es `towersVersion`. */
const fertig = new Map<string, Path2D>();
/** Die gebackenen Kantenbilder - mit Tafel, damit der Kartenwechsel sie
 *  wegraeumt (siehe `gfx/speicher.ts`). */
const bilder = new Map<string, HTMLCanvasElement>();
const tafel = new Map<string, string>();
ablageAnmelden('bauflaeche', bilder, tafel);
let letzteKarte = '';
let letzterTurmstand = -1;

/** Die Ablagen auf den Stand bringen.
 *
 *  Zwei Anlässe, und beide gelten für alle drei Ablagen: eine andere Karte
 *  macht ALLES ungültig, ein anderer Turmbestand nur das, worin Türme
 *  vorkommen. Das steht an einer Stelle, weil es zweimal dieselbe Regel wäre
 *  - und die eine davon wird gepflegt (Regel 15). Genau das hat der
 *  Musterlauf gemeldet, als die Gegenprobe plötzlich zwei Gegenstände hatte. */
function ablagenPflegen(s: GameState): void {
  if (letzteKarte !== s.map.id) {
    gebacken.clear(); fertig.clear(); bilder.clear(); tafel.clear();
    letzteKarte = s.map.id;
    letzterTurmstand = -1;
  }
  if (letzterTurmstand !== s.towersVersion) {
    fertig.clear();
    bilder.clear(); tafel.clear();
    letzterTurmstand = s.towersVersion;
  }
}

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
  ablagenPflegen(s);
  // Der versetzte Turm gehoert in den Schluessel: er blockiert sich nicht
  // selbst, und waehrend des Ziehens aendert sich `towersVersion` nicht.
  const schluessel = `${r}|${ausser ? s.towers.indexOf(ausser) : -1}`;
  const bereit = fertig.get(schluessel);
  if (bereit) return bereit;

  const festSchluessel = `${s.map.id}|${r}`;
  let feste = gebacken.get(festSchluessel);
  if (!feste) { feste = statisch(s, r); gebacken.set(festSchluessel, feste); }

  const p = new Path2D(feste);
  for (const t of s.towers) {
    if (t === ausser) continue;
    kreis(p, t.x, t.y, r + TOWERS[t.def].footprint / 2 + 4);
  }
  fertig.set(schluessel, p);
  return p;
}

/** Das gebackene Kantenbild: schwache Toenung auf der ganzen verbotenen
 *  Flaeche, ein kraeftiger Saum an ihrer Kante.
 *
 *  **Warum ein Bild und nicht zwei Fuellungen.** Ein Saum ist die Differenz
 *  aus der Flaeche und ihrer geschrumpften Fassung - und Schrumpfen vertraegt
 *  sich, anders als Wachsen, NICHT mit dem Vereinigen: die Vereinigung der
 *  geschrumpften Kreise ist kleiner als die geschrumpfte Vereinigung, und die
 *  Differenz zeigt sich als Gekritzel entlang jeder inneren Naht. Auf einem
 *  Bild geht es dagegen sauber: die Maske wird sechzehnmal versetzt mit
 *  `destination-in` ueber sich selbst gelegt, und was uebrig bleibt, ist die
 *  echte Schrumpfung. Auf 960 x 540 sind das ein paar Millisekunden, einmal.
 *
 *  **Und warum ueberhaupt ein Saum.** Die erste Fassung dunkelte die ganze
 *  verbotene Flaeche um 38 Prozent ab. Auf dem Telefon sieht man einen
 *  Ausschnitt, dort las sich das als "Strasse plus Rand". Am Schreibtisch
 *  sieht man die GANZE Welt - und damit 66 bis 73 Prozent davon abgedunkelt,
 *  auf der Frostspalte verschmolzen mit der ohnehin dunklen Strasse. Gemeldet
 *  als "im Browser sieht es nicht gut aus". Die Auskunft steckt aber gar
 *  nicht in der Flaeche, sondern in ihrer KANTE; die Flaeche braucht nur so
 *  viel Ton, dass man sie als zusammenhaengend liest. */
export function bauflaechenBild(
  s: GameState, id: TowerId, ausser: Tower | null = null,
): HTMLCanvasElement {
  const r = TOWERS[id].footprint / 2;
  ablagenPflegen(s);
  const schluessel = `${s.map.id}|${r}|${s.towersVersion}|${ausser ? s.towers.indexOf(ausser) : -1}`;
  const da = bilder.get(schluessel);
  if (da) return da;

  const b = Math.round(WORLD_W / TEILER), h = Math.round(WORLD_H / TEILER);
  const pfad = verbotenerBereich(s, id, { ausser });
  const flaeche = (): HTMLCanvasElement => {
    const cv = document.createElement('canvas');
    cv.width = b; cv.height = h;
    return cv;
  };

  const maske = flaeche();
  {
    const m = maske.getContext('2d')!;
    m.scale(1 / TEILER, 1 / TEILER);
    m.fillStyle = '#000';
    m.fill(pfad);
  }

  // Schrumpfen und Wachsen als Schnitt beziehungsweise Vereinigung aller
  // versetzten Kopien. Sechzehn Richtungen: bei acht bekommt der Saum in
  // schraegen Lagen Ecken, bei mehr sieht man den Unterschied nicht mehr.
  const rand = KANTE.breite / TEILER;
  const versetzt = (art: GlobalCompositeOperation): HTMLCanvasElement => {
    const cv = flaeche();
    const g = cv.getContext('2d')!;
    g.drawImage(maske, 0, 0);
    g.globalCompositeOperation = art;
    for (let i = 0; i < 16; i++) {
      const w = (i / 16) * Math.PI * 2;
      g.drawImage(maske, Math.cos(w) * rand, Math.sin(w) * rand);
    }
    return cv;
  };
  const eng = versetzt('destination-in');
  const weit = versetzt('source-over');

  /** Die Differenz zweier Masken. */
  const ohne = (gross: HTMLCanvasElement, klein: HTMLCanvasElement): HTMLCanvasElement => {
    const cv = flaeche();
    const g = cv.getContext('2d')!;
    g.drawImage(gross, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(klein, 0, 0);
    return cv;
  };

  const bild = flaeche();
  const g = bild.getContext('2d')!;
  // **Die dunkle Haelfte** - schwache Toenung auf der ganzen verbotenen
  // Flaeche, kraeftig im inneren Saum.
  {
    const d = flaeche();
    const q = d.getContext('2d')!;
    q.globalAlpha = KANTE.innen;
    q.drawImage(maske, 0, 0);
    q.globalAlpha = KANTE.band;
    q.drawImage(ohne(maske, eng), 0, 0);
    q.globalAlpha = 1;
    q.globalCompositeOperation = 'source-in';
    q.fillStyle = C.ink;
    q.fillRect(0, 0, b, h);
    g.drawImage(d, 0, 0);
  }
  // **Und die helle** - ein Lichtsaum auf der BAUBAREN Seite.
  //
  // Ohne ihn verschwindet die Kante genau dort, wo sie am meisten gebraucht
  // wird: auf der Frostspalte ist die Strasse selbst dunkel, ein dunkler
  // Strich darauf ist keiner. Zwei Toene uebereinander lesen sich auf hellem
  // wie auf dunklem Grund - dieselbe Bewegung wie beim Kontaktschatten der
  // Figuren, nur an einer Kante statt an einem Koerper.
  {
    const l = flaeche();
    const q = l.getContext('2d')!;
    q.globalAlpha = KANTE.licht;
    q.drawImage(ohne(weit, maske), 0, 0);
    q.globalAlpha = 1;
    q.globalCompositeOperation = 'source-in';
    q.fillStyle = '#EAF2FF';
    q.fillRect(0, 0, b, h);
    g.drawImage(l, 0, 0);
  }

  bilder.set(schluessel, bild);
  tafel.set(schluessel, s.map.id);
  return bild;
}

/** Die Ablage leeren - für Werkzeuge, die mehrere Karten in einem Lauf
 *  messen. Im Spiel besorgt das der Kartenwechsel selbst. */
export function bauflaecheVergessen(): void {
  gebacken.clear();
  fertig.clear();
  bilder.clear();
  tafel.clear();
  letzteKarte = '';
  letzterTurmstand = -1;
}
