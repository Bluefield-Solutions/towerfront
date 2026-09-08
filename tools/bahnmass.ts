/**
 * Was eine Bahn taugt - EINMAL gerechnet, von allen benutzt.
 *
 * **Warum es diese Datei gibt.** In v236 stand dieselbe Frage zweimal im
 * Baum: einmal im Waechter und einmal in einer Werkbank, mit der ich
 * Bahnentwuerfe durchprobiert habe. Die beiden gaben verschiedene Antworten -
 * 81 % gegen 62 %, spaeter 71 % gegen 16 % -, und ich habe eine ganze Karte
 * auf die falsche Zahl hin umgebaut, bevor es auffiel. Der Grund war
 * mechanisch: die Werkbank fragte `warumNicht` nach den Bauplaetzen, und das
 * liest die Bahnen aus der KARTE - also aus der vorigen Fassung, nicht aus
 * dem Entwurf.
 *
 * Regel 15 in Reinform: was zweimal dasteht, veraltet einmal. Hier ist die
 * eine Stelle. Wer einen Entwurf misst und wer die ausgelieferte Karte
 * prueft, bekommt dieselbe Rechnung - und die Bauplaetze kommen immer aus
 * DEN BAHNEN, die gerade gemessen werden.
 */
import { LanePath } from '../src/core/path';
import { WORLD_W, WORLD_H } from '../src/data/config';
import { GameState } from '../src/game/state';
import type { GameMap } from '../src/data/maps';

/** Reichweite eines frischen Turms. Dieselbe Zahl wie in `bahnentwurf`. */
export const REICHWEITE = 252;
/** Abtastschritt entlang einer Bahn, in Weltpunkten. */
export const SCHRITT = 12;
/** Rasterweite der Bauplatzsuche. 60 ergibt rund 200 Plaetze je Karte -
 *  fein genug, dass eine Stellung nicht am Raster scheitert, grob genug fuer
 *  eine gierige Ueberdeckung in einer Sekunde. */
export const RASTER = 60;

/** Die Kurven zu einer Punktliste - mit demselben Umzug des letzten Punktes
 *  auf die Zielplattform, den `lanePaths` macht (v131). */
export function bahnenAus(
  lanes: { x: number; y: number; w: number }[][], ziel: { x: number; y: number },
): LanePath[] {
  return lanes.map((l) => new LanePath([...l.slice(0, -1), { ...l[l.length - 1], ...ziel }]));
}

/** **Wo darf gebaut werden - nach DIESEN Bahnen?**
 *
 *  `warumNicht` liest die Bahnen aus dem Spielzustand. Damit ein ENTWURF
 *  gemessen werden kann, werden sie hier eingesetzt: der Zustand bekommt die
 *  Karte (fuer Gelaende und Zielplatte) und die Bahnen des Entwurfs. Ohne
 *  diese Zeile misst jede Werkbank die Bauplaetze der vorigen Fassung - der
 *  Fehler, der v236 fast eine Karte gekostet hat. */
export function bauplaetze(map: GameMap, bahnen: LanePath[]): { x: number; y: number }[] {
  const probe = new GameState(map.id);
  probe.reset(1, 'normal', map.id);
  probe.lanes = bahnen;
  const raus: { x: number; y: number }[] = [];
  for (let y = RASTER; y < WORLD_H; y += RASTER) {
    for (let x = RASTER; x < WORLD_W; x += RASTER) {
      if (probe.warumNicht('arrow', x, y) === null) raus.push({ x, y });
    }
  }
  return raus;
}

/** Eine Bahn in gleichmaessigen Schritten abgetastet. */
export function abtasten(b: LanePath): { x: number; y: number }[] {
  const pk: { x: number; y: number }[] = [];
  for (let t = 0; t < b.length; t += SCHRITT) pk.push(b.at(t));
  return pk;
}

/** **Zwoelf Tuerme, wie ein Spieler sie STELLT.**
 *
 *  Gierig ueberdeckend: immer der Platz, der am meisten Neues dazubringt.
 *
 *  Der erste Entwurf nahm die zwoelf individuell staerksten Plaetze - die
 *  stehen alle uebereinander. Er meldete fuer eine Bahn eine Selbstdeckung
 *  von 36 %, waehrend die Auswahl fuer eine ANDERE Bahn davon 55 % sah. Eine
 *  Auswahl, bei der die Bestenliste einer fremden Bahn besser abschneidet als
 *  die eigene, misst nicht, was sie messen soll. */
export function stellen(
  b: LanePath, plaetze: { x: number; y: number }[], zahl = 12,
): { x: number; y: number }[] {
  const pk = abtasten(b);
  const offen = new Set(pk.keys());
  const gewaehlt: { x: number; y: number }[] = [];
  for (let n = 0; n < zahl && offen.size; n++) {
    let best: { x: number; y: number } | null = null;
    let bestN: number[] = [];
    for (const p of plaetze) {
      const neu: number[] = [];
      for (const i of offen) {
        if (Math.hypot(pk[i].x - p.x, pk[i].y - p.y) <= REICHWEITE) neu.push(i);
      }
      if (!best || neu.length > bestN.length) { best = p; bestN = neu; }
    }
    if (!best || !bestN.length) break;
    gewaehlt.push(best);
    for (const i of bestN) offen.delete(i);
  }
  return gewaehlt;
}

export interface Kreuzmass {
  /** Der schwaechste Wert ausserhalb der Diagonale, in Prozent. */
  schwaechste: number;
  /** Welches Paar das ist, im Klartext. */
  wo: string;
  /** Die ganze Tafel: `matrix[i][j]` = wieviel von Bahn i die Tuerme fuer
   *  Bahn j sehen. */
  matrix: number[][];
}

/** **Taugt eine Verteidigung auch gegen die anderen Bahnen?** */
export function kreuzdeckung(bahnen: LanePath[], plaetze: { x: number; y: number }[]): Kreuzmass {
  const tuerme = bahnen.map((b) => stellen(b, plaetze));
  const matrix: number[][] = [];
  let schwaechste = 100, wo = '';
  for (let i = 0; i < bahnen.length; i++) {
    const pk = abtasten(bahnen[i]);
    matrix.push([]);
    for (let j = 0; j < bahnen.length; j++) {
      let n = 0;
      for (const q of pk) {
        if (tuerme[j].some((p) => Math.hypot(q.x - p.x, q.y - p.y) <= REICHWEITE)) n++;
      }
      const v = 100 * n / Math.max(1, pk.length);
      matrix[i].push(v);
      if (i !== j && v < schwaechste) {
        schwaechste = v; wo = `Bahn ${i + 1} von den Tuermen fuer Bahn ${j + 1}`;
      }
    }
  }
  if (bahnen.length < 2) { schwaechste = 100; wo = 'nur eine Bahn'; }
  return { schwaechste, wo, matrix };
}

/** **Das Gegengewicht: verschmelzen die Bahnen zu einem Klumpen?**
 *
 *  Die Kreuzdeckung allein belohnt Naehe - je dichter, desto besser die Zahl.
 *  In v236 stand ein Entwurf damit bei 62 %, und das Bild zeigte einen
 *  einzigen grauen Fleck statt dreier Wege (Regel 8). Gemessen wird deshalb,
 *  welcher Anteil einer Bahn IM SCHLAUCH einer anderen liegt: dort sieht man
 *  zwei Wege nicht mehr als zwei.
 *
 *  Ein geteilter Schwanz ist erlaubt und gewollt - die Frostspalte liegt bei
 *  52 %, der Farnkessel bei 45 %. */
export function verschmelzung(bahnen: LanePath[]): { staerkste: number; wo: string } {
  let staerkste = 0, wo = 'keine';
  for (let i = 0; i < bahnen.length; i++) {
    const pk = abtasten(bahnen[i]);
    for (let j = 0; j < bahnen.length; j++) {
      if (i === j) continue;
      let n = 0;
      for (const q of pk) if (bahnen[j].schlauchAbstand(q.x, q.y) < 10) n++;
      const v = 100 * n / Math.max(1, pk.length);
      if (v > staerkste) { staerkste = v; wo = `Bahn ${i + 1} im Schlauch von Bahn ${j + 1}`; }
    }
  }
  return { staerkste, wo };
}

export interface Bahnzahlen {
  laenge: number; luftlinie: number; umweg: number;
  wechsel: number; knickGrad: number; breiteVerhaeltnis: number;
  /** Abstand zum naechsten unwegsamen Fleck. Negativ heisst HINEIN. */
  fleckAbstand: number; fleckWo: string;
  /** Wieviele Abtastpunkte ausserhalb des Feldes liegen - der Anlauf vom Tor
   *  zaehlt nicht mit, der liegt mit Absicht davor. */
  ausserhalb: number;
}

/** **Die Geometrie einer Bahn - dieselben Zahlen, die der Waechter prueft.**
 *
 *  Auch diese standen bis v237 zweimal da: im Waechter und in der Werkbank,
 *  mit der ich Entwuerfe durchprobiert habe. Die Werkbank hat den Anlauf
 *  anders gezaehlt als der Waechter, und ein Entwurf, der dort "alle Regeln
 *  gehalten" meldete, fiel hier durch. */
export function geometrie(
  b: LanePath, roh: { x: number; y: number; w: number }[],
  flecken: { x: number; y: number; r: number }[],
): Bahnzahlen {
  const pts = b.pts;
  const luftlinie = Math.hypot(
    pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
  let wechsel = 0, last = 0;
  for (let k = 2; k < pts.length; k++) {
    const a = pts[k - 2], m = pts[k - 1], c = pts[k];
    const s = Math.sign((m.x - a.x) * (c.y - m.y) - (m.y - a.y) * (c.x - m.x));
    if (s !== 0 && last !== 0 && s !== last) wechsel++;
    if (s !== 0) last = s;
  }
  let knick = 0;
  for (let k = 1; k < pts.length - 1; k++) {
    const a = pts[k - 1], m = pts[k], c = pts[k + 1];
    let d = Math.abs(Math.atan2(c.y - m.y, c.x - m.x) - Math.atan2(m.y - a.y, m.x - a.x));
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d > knick) knick = d;
  }
  const w = b.widthRange();
  let fleckAbstand = Infinity, fleckWo = 'keiner';
  let ausserhalb = 0;
  for (let t = 0; t <= 1; t += 0.002) {
    const q = b.at(b.length * t);
    for (const f of flecken) {
      const d = Math.hypot(q.x - f.x, q.y - f.y) - f.r;
      if (d < fleckAbstand) { fleckAbstand = d; fleckWo = `${f.x}:${f.y}`; }
    }
    // Der Anlauf vom Tor liegt mit Absicht vor dem Rand (die Frostspalte
    // startet bei y = 1180 auf einem 1080 hohen Feld) - erst danach zaehlt
    // es als "laeuft aus dem Feld".
    if (t > 0.10 && t < 0.98
      && (q.x < 40 || q.x > WORLD_W - 40 || q.y < 40 || q.y > WORLD_H - 40)) ausserhalb++;
  }
  void roh;
  return {
    laenge: b.length, luftlinie, umweg: b.length / Math.max(1, luftlinie),
    wechsel, knickGrad: (knick * 180) / Math.PI,
    breiteVerhaeltnis: w.max / Math.max(1, w.min),
    fleckAbstand: fleckAbstand === Infinity ? 1e9 : fleckAbstand, fleckWo, ausserhalb,
  };
}

/** Wieviele Punkte der ersten Bahn nahe genug an einer anderen liegen, dass
 *  man von einer Gabelung sprechen kann. Dieselbe Rechnung wie im Waechter. */
export function gemeinsamePunkte(bahnen: LanePath[]): number {
  let n = 0;
  for (const p of bahnen[0].pts) {
    for (let i = 1; i < bahnen.length; i++) if (bahnen[i].distanceTo(p.x, p.y) < 8) n++;
  }
  return n;
}
