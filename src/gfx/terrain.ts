import { C, WORLD_H, WORLD_W } from '../data/config';
import type { MapPalette, GameMap } from '../data/maps';

import type { LanePath } from '../core/path';
import { hexA } from './glow';

/** Der Untergrund, einmal gebacken.
 *
 *  Bis v35 wurde hier ein Kachelraster gemalt und der Weg aus achsenparallelen
 *  Zellen zusammengesetzt - daher die 90-Grad-Ecken. Jetzt wird der Weg als
 *  Band entlang der Kurve gezeichnet: mit runden Enden, weichen Uebergaengen
 *  und wechselnder Breite. Sobald echte Kartenbilder da sind, faellt auch das
 *  weg und das Bild bringt den Weg selbst mit.
 */
/** Ein Kartenaufbau, der sich in Haeppchen abarbeiten laesst.
 *
 *  Warum ueberhaupt: der Aufbau lief bis v112 in EINEM Zug mitten im
 *  laufenden Bild. Gemessen mit vierfacher CPU-Drossel stand das Bild dabei
 *  820 ms still - das Sechzehnfache dessen, was die Norm als blockierend
 *  ansieht (50 ms). Kingdom Rush und Bloons bauen eine Stufe hinter einem
 *  Ladeschritt auf, nie in einem laufenden Bild; das hier ist dieselbe
 *  Antwort, nur ohne Ladebildschirm.
 *
 *  Aufgeteilt wird das, was teuer ist, und nur das: das Zusammensetzen
 *  (Foto, Weg, Felsen) kostet gemessen 2 bis 8 ms und laeuft in einem Zug.
 *  Teuer ist allein der Tonwertabgleich, und der ist zeilenweise teilbar. */
export interface TerrainAuftrag {
  /** Die Flaeche. Vom ersten Augenblick an gueltig - nur eben noch nicht
   *  fertig abgeglichen. Wer sie zu frueh zeigt, sieht ein dunkleres Bild,
   *  kein kaputtes. */
  readonly flaeche: HTMLCanvasElement;
  /** Arbeitet hoechstens `budgetMs` Millisekunden weiter. Liefert `true`,
   *  sobald nichts mehr zu tun ist. */
  schritt(budgetMs: number): boolean;
}

export function terrainAuftrag(
  map: GameMap, lanes: LanePath[], pal: MapPalette,
  photo: HTMLImageElement | null = null,
): TerrainAuftrag {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W; cv.height = WORLD_H;
  // `willReadFrequently` haelt die Flaeche im Hauptspeicher statt auf der
  // Grafikkarte. Gemessen ist der Tonwertabgleich zu ueber vier Fuenfteln
  // Bildpunkt-Umzug (getImageData 128 ms, Schleife 37 ms, putImageData
  // 112 ms) - und genau dieser Umzug ist es, den der Hinweis billiger macht.
  const g = cv.getContext('2d', { willReadFrequently: true })!;

  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  if (photo) {
    g.drawImage(photo, 0, 0, WORLD_W, WORLD_H);
  } else {
    const bg = g.createLinearGradient(0, 0, 0, WORLD_H);
    bg.addColorStop(0, pal.terrainHi);
    bg.addColorStop(0.55, pal.terrain);
    bg.addColorStop(1, pal.terrainLo);
    g.fillStyle = bg;
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    // Etwas Unruhe, damit die gemalte Flaeche nicht gedruckt wirkt.
    for (let i = 0; i < 260; i++) {
      const x = rnd() * WORLD_W, y = rnd() * WORLD_H, r = 3 + rnd() * 9;
      g.fillStyle = rnd() > 0.5 ? hexA(pal.terrainHi, 0.16) : hexA(pal.terrainLo, 0.2);
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, Math.PI * 2); g.fill();
    }
  }

  // --- Der Weg als Band mit wechselnder Breite.
  //
  // Nicht mehr eine Linie mit fester Staerke, sondern eine Flaeche zwischen
  // den beiden Raendern. Erst dadurch kann der Weg mal weiter und mal enger
  // sein - und Engstellen sind das, woran sich das Spiel entscheidet.
  const ribbon = (p: LanePath, grow: number): void => {
    g.beginPath();
    for (let i = 0; i < p.pts.length; i++) {
      const e = p.edgesAt(i);
      const dx = e.lx - p.pts[i].x, dy = e.ly - p.pts[i].y;
      const len = Math.hypot(dx, dy) || 1;
      const x = p.pts[i].x + (dx / len) * (len + grow);
      const y = p.pts[i].y + (dy / len) * (len + grow);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    for (let i = p.pts.length - 1; i >= 0; i--) {
      const e = p.edgesAt(i);
      const dx = e.rx - p.pts[i].x, dy = e.ry - p.pts[i].y;
      const len = Math.hypot(dx, dy) || 1;
      g.lineTo(p.pts[i].x + (dx / len) * (len + grow),
        p.pts[i].y + (dy / len) * (len + grow));
    }
    g.closePath();
    g.fill();
  };

  // Bringt das Bild den Weg schon mit, wird hier nichts gezeichnet.
  if (!map.pfadImBild) {
    for (const p of lanes) { g.fillStyle = 'rgba(6,10,18,0.5)'; ribbon(p, 12); }
    for (const p of lanes) { g.fillStyle = pal.pathEdge; ribbon(p, 0); }
    for (const p of lanes) { g.fillStyle = pal.path; ribbon(p, -9); }
    for (const p of lanes) { g.fillStyle = hexA('#FFF6DC', 0.12); ribbon(p, -22); }
  }

  // Randsteine nur, wo der Weg auch gezeichnet wird.
  if (!map.pfadImBild) {
  // Randsteine entlang beider Raender. Sie folgen der wechselnden Breite mit,
  // also verengt sich mit dem Weg auch seine Einfassung.
  for (const p of lanes) {
    for (let i = 4; i < p.pts.length - 4; i += 5) {
      const e = p.edgesAt(i);
      const ang = Math.atan2(e.ly - e.ry, e.lx - e.rx);
      for (const [cx0, cy0] of [[e.lx, e.ly], [e.rx, e.ry]] as const) {
        const jx = (rnd() - 0.5) * 5, jy = (rnd() - 0.5) * 5;
        const cx = cx0 + jx, cy = cy0 + jy;
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.beginPath(); g.ellipse(cx, cy + 2, 7, 4.5, ang, 0, Math.PI * 2); g.fill();
        g.fillStyle = hexA(pal.pathEdge, 0.95);
        g.beginPath(); g.ellipse(cx, cy, 7, 4.5, ang, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.beginPath(); g.ellipse(cx, cy - 1.5, 4.5, 2.5, ang, 0, Math.PI * 2); g.fill();
      }
    }
  }

  }

  // --- Unwegsames Gelaende.
  //
  // Es wird nicht als Verbotsschild gezeichnet, sondern als das, was es ist:
  // Felsfelder und Dickicht. Man soll auf einen Blick sehen, *warum* dort
  // nichts hinpasst - nicht, dass es verboten waere.
  // Bringt das Bild sein Gelaende schon mit, wird nichts darueber gemalt.
  for (const gr of (map.pfadImBild ? [] : map.rough)) {
    const n = 9;
    g.save();
    g.translate(gr.x, gr.y);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const rr = gr.r * (0.78 + rnd() * 0.34);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.78;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    // Erst ein weicher Schatten unter dem Feld, dann eine dunkle Senke -
    // vorher war es eine halbdurchsichtige Flaeche und las sich als Fleck
    // auf dem Boden, nicht als Gelaende.
    g.save();
    g.translate(0, 8);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fill();
    g.restore();
    g.fillStyle = hexA(pal.terrainLo, 0.55);
    g.fill();
    g.restore();

    // Dicht an dicht liegende Brocken fuellen das Feld ganz aus. Ein Fels ist
    // etwas, das man sieht - keine Schraffur.
    const stones = 6 + Math.round(gr.r / 16);
    for (let i = 0; i < stones; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * gr.r * 0.82;
      drawRock(g, gr.x + Math.cos(a) * rr, gr.y + Math.sin(a) * rr * 0.78,
        gr.r * (0.16 + rnd() * 0.2), rnd, pal);
    }
  }

  // --- Tonwert, NACH allem was zum Boden gehoert und VOR der Vignette.
  //
  // Die Reihenfolge ist der ganze Punkt, und ich hatte sie erst falsch. Beim
  // ersten Versuch stand die Angleichung direkt hinter dem Foto - Ergebnis:
  // die Karte war zwar hell, aber flau, und Weg und Boden verschmolzen fast.
  //
  // Der Grund: das Foto kommt aus der Datei, Weg, Randsteine und Felsen
  // kommen aus der Palette. Hebt man nur das Foto, waechst der Boden dem Weg
  // entgegen, und der Abstand, der ihn lesbar macht, schrumpft. Hier hinten
  // wandert alles gemeinsam - die Verhaeltnisse bleiben, die Szene wird Tag.
  //
  // Vor der Vignette, weil die dunkel bleiben soll: sie ist kein Boden,
  // sondern das Abfallen ins Nichts. Sie mit aufzuhellen hiesse, den Rand
  // wieder aufzumachen, den v104 geschlossen hat.

  /** Rand und Abdunkelung. Kostet gemessen unter einer Millisekunde. */
  const abschliessen = (): void => {
    const vg = g.createRadialGradient(
      WORLD_W / 2, WORLD_H / 2, Math.min(WORLD_W, WORLD_H) * 0.3,
      WORLD_W / 2, WORLD_H / 2, Math.max(WORLD_W, WORLD_H) * 0.72,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, hexA(C.voidDeep, photo ? 0.38 : 0.6));
    g.fillStyle = vg;
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    saum(g, photo !== null);
  };

  // Ohne Foto gibt es nichts abzugleichen - der gemalte Untergrund ist in
  // einem Zug fertig.
  if (!photo) {
    abschliessen();
    return { flaeche: cv, schritt: () => true };
  }

  const kurven = tonwertKurven(g);
  const kulisse = kulissenMaske(g, lanes);
  let zeile = 0;
  let fertig = false;

  return {
    flaeche: cv,
    schritt(budgetMs: number): boolean {
      if (fertig) return true;
      const bis = performance.now() + budgetMs;
      do {
        if (zeile >= WORLD_H) {
          abschliessen();
          fertig = true;
          return true;
        }
        const hoehe = Math.min(BAND_HOEHE, WORLD_H - zeile);
        const band = g.getImageData(0, zeile, WORLD_W, hoehe);
        tonwertAnwenden(band.data, kurven, zeile, WORLD_W, kulisse);
        g.putImageData(band, 0, zeile);
        zeile += hoehe;
        // Mindestens ein Band je Aufruf, sonst kaeme bei einem Budget von
        // null nie etwas voran und der Auftrag haenge ewig.
      } while (performance.now() < bis);
      return false;
    },
  };
}

/** Wieviele Zeilen ein Haeppchen umfasst.
 *
 *  Gemessen statt geschaetzt: mit 60 Zeilen braucht der Abgleich 19 Baender
 *  und 162 ms, also 8,5 ms je Band auf dem Schreibtisch. Auf einem vierfach
 *  gedrosselten Telefon sind das rund 34 ms - unter der Schwelle von 50 ms,
 *  ab der eine Aufgabe als blockierend gilt, aber nicht weit darunter.
 *
 *  Mit 40 Zeilen sind es 27 Baender zu rund 6 ms, gedrosselt 24 ms. Das ist
 *  der Abstand, den ich haben will: die Schwelle ist eine Norm, kein Ziel,
 *  und ein Band, das sie gerade so einhaelt, reisst sie auf dem naechsten
 *  langsameren Geraet. Kleiner ginge auch, kostet aber je Band einen eigenen
 *  getImageData-Aufruf. */
const BAND_HOEHE = 40;

/** Der bequeme Weg: alles auf einmal, fuer Werkzeuge und Pruefungen.
 *
 *  Ruft denselben Auftrag auf und laesst ihn ohne Zeitbudget durchlaufen. Es
 *  gibt bewusst keine zweite Fassung der Rechnung - zwei Fassungen derselben
 *  Tonwertlehre liefen auseinander, und zwar unbemerkt. */
export function bakeTerrain(
  map: GameMap, lanes: LanePath[], pal: MapPalette,
  photo: HTMLImageElement | null = null,
): HTMLCanvasElement {
  const auftrag = terrainAuftrag(map, lanes, pal, photo);
  while (!auftrag.schritt(Infinity)) { /* bis nichts mehr zu tun ist */ }
  return auftrag.flaeche;
}

// ------------------------------------------------------- Tonwert der Karten

/** Wohin der Boden soll. Aus `REFERENZ` in `tools/artaudit.mjs`, Band
 *  0,30 bis 0,36 - hier die Mitte.
 *
 *  Hochgerechnet auf VOR der Vignette: sie und der Saum ziehen gemessen rund
 *  ein Zehntel ab (Spiralhain 0,224 im Quellbild, 0,202 im gebackenen
 *  Terrain). Wer auf 0,33 korrigiert, landet hinterher bei 0,30. */
const BODEN_HELL = 0.355;

/** Wieviel Kontrast nach dem Aufhellen zurueckgeholt wird.
 *
 *  Gemessen, nicht geschaetzt: der Abstand zwischen Weg (p80) und Boden (p35)
 *  betraegt im Rohbild 0,185 bei einer mittleren Helligkeit von 0,224 -
 *  relativ also 0,83. Nach dem Aufhellen auf 0,38 waechst der Abstand
 *  rechnerisch leicht auf 0,199, faellt relativ aber auf 0,53.
 *
 *  Und das Auge misst relativ. Deshalb sah der erste Versuch flau aus,
 *  obwohl jede Kennzahl besser geworden war: Helligkeit im Band, Spanne ueber
 *  dem Zielwert, Weg-Boden-Abstand groesser. Nur der Blick sagte nein.
 *
 *  Die Spreizung um den neuen Mittelwert holt einen Teil zurueck: bei 1,2 und
 *  einem etwas niedrigeren Helligkeitsziel liegt der relative Abstand bei 0,73
 *  statt 0,53. Vollstaendig zurueckholen hiesse Faktor 1,57 - dann brennen die
 *  Lichter aus. Der Rest ist nicht zu holen, und das ist der eigentliche
 *  Befund: eine Nachtszene wird durch Aufhellen keine Tagszene. Sie bezieht
 *  ihre Tiefe aus dem Dunkel. Den Rest von Abstand A schliessen nur neue
 *  Bilder, so wie es in Abschnitt 5.4 steht. */
const BODEN_KONTRAST = 1.2;

/** Und wie bunt. Band 0,45 bis 0,55, ebenfalls die Mitte.
 *
 *  Gezogen wird nur zur Haelfte. Die drei Karten SOLLEN verschieden aussehen -
 *  gemessen streuen sie von 0,30 bis 0,85, und das ist ein Unterschied in der
 *  Lautstaerke, nicht in der Farbe. Halbes Ziehen halbiert die Streuung und
 *  laesst jeder Karte ihren Charakter. Ganzes Ziehen machte aus Frostspalte
 *  und Spiralhain dasselbe Bild in zwei Farbtoenen. */
const BODEN_SATT = 0.50;
const SATT_ZUG = 0.5;

/** Helligkeit eines Bildpunkts. */
const leuchte = (r: number, g: number, b: number): number =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Den Untergrund auf die Referenz ziehen.
 *
 *  Warum ueberhaupt: das Zielbild aus dem Grafik-Audit ist eine Tagszene, das
 *  unsere eine Nachtszene - Boden 0,33 gegen 0,20. Das ist Abstand A, der
 *  groesste einzelne, und er zieht sich durch alles: Farbwelt, Leuchten,
 *  Stimmung. Keine Detailarbeit an Einzelbildern holt ihn auf.
 *
 *  Warum hier und nicht im Bildvorrat: die gepackten Bilder ein zweites Mal
 *  zu komprimieren kostet Qualitaet genau dort, wo aufgehellt wird - in den
 *  Schatten. Hier wird verlustfrei gerechnet, die Quelldateien bleiben, wie
 *  sie geliefert wurden, und ein neues Kartenbild bekommt die Korrektur
 *  automatisch.
 *
 *  Warum Gamma und nicht ein Faktor: ein Faktor brennt die Lichter aus. Gamma
 *  hebt die Mitten und laesst Weiss weiss.
 *
 *  Warum je Karte gerechnet und nicht als Tabelle: die drei Karten starten bei
 *  0,20, 0,19 und 0,25 - ein gemeinsamer Wert kann sie nicht alle treffen. Der
 *  noetige Gammawert wird aus dem Bild selbst bestimmt. Damit stimmt er auch
 *  fuer die vierte Karte, die es noch nicht gibt. Das ist Regel 2: anteilig
 *  statt absolut. */
/** Die Kurven, die der Abgleich braucht - einmal je Karte gerechnet. */
interface TonwertKurven {
  TA: Float32Array;
  TWr: Float32Array; TWg: Float32Array; TWb: Float32Array;
  C: number;
}

/** Misst das Bild und leitet daraus die Kurven ab.
 *
 *  Gemessen wird auf einer verkleinerten Fassung, und zwar OHNE Glaetten.
 *  Das ist kein Detail: mit Glaetten wuerde jeder Bildpunkt der kleinen
 *  Fassung ein Mittel seiner Nachbarn, und Mitteln nimmt Farbigkeit weg. Die
 *  gemessene Sattheit fiele zu niedrig aus, der Ausgleich zu hoch, und die
 *  Karte wuerde bunter als gewollt. Ohne Glaetten ist die kleine Fassung eine
 *  Stichprobe echter Bildpunkte - genau das, was die Zeile vorher mit
 *  "jeder 37." erreicht hat, nur billiger.
 *
 *  Warum ueberhaupt verkleinert: die Kurven muessen VOR dem ersten Band
 *  feststehen, sonst begaenne jedes Band mit einer anderen Rechnung. Ein
 *  Messdurchgang ueber das ganze Bild waere aber selbst wieder die lange
 *  Aufgabe, die hier gerade abgeschafft wird. */
function tonwertKurven(g: CanvasRenderingContext2D): TonwertKurven {
  const klein = document.createElement('canvas');
  klein.width = PROBE_B; klein.height = PROBE_H;
  const kg = klein.getContext('2d', { willReadFrequently: true })!;
  kg.imageSmoothingEnabled = false;
  kg.drawImage(g.canvas, 0, 0, PROBE_B, PROBE_H);
  const d = kg.getImageData(0, 0, PROBE_B, PROBE_H).data;

  let n = 0, summeL = 0, summeS = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, gr = d[i + 1] / 255, b = d[i + 2] / 255;
    summeL += leuchte(r, gr, b);
    const max = Math.max(r, gr, b), min = Math.min(r, gr, b);
    summeS += max === 0 ? 0 : (max - min) / max;
    n++;
  }
  const istHell = summeL / n, istSatt = summeS / n;

  // Das Gamma, das die gemessene Helligkeit auf die gewuenschte hebt.
  // Naeherung ueber den Mittelwert: hell^(1/gamma) = ziel. Sie ist nicht
  // exakt - der Mittelwert einer Potenz ist nicht die Potenz des Mittelwerts -
  // aber der Fehler liegt bei wenigen Hundertsteln, und nachjustiert wird
  // ohnehin an der gemessenen Ausgabe.
  const gamma = istHell <= 0.001 ? 1 : Math.log(istHell) / Math.log(Math.min(0.95, BODEN_HELL));
  const invGamma = 1 / Math.max(0.5, Math.min(2.5, gamma));

  // Sattheit: der Faktor gilt fuer das ganze Bild, nicht je Punkt. Je Punkt
  // gerechnet wuerde jeden fast grauen Punkt auf Zielsaettigung reissen -
  // aus Nebel wuerde Farbe.
  const sattFaktor = istSatt > 0.01 ? 1 + (BODEN_SATT / istSatt - 1) * SATT_ZUG : 1;

  const tabelle = new Uint8Array(256);
  for (let v = 0; v < 256; v++) tabelle[v] = Math.round(Math.pow(v / 255, invGamma) * 255);

  // --- Warum vier Tabellen und keine Rechnung je Punkt.
  //
  // Die Rechnung je Punkt ist LINEAR in den drei tabellierten Kanaelen, und
  // das laesst sich ausrechnen statt ausfuehren:
  //
  //   k_r = M + (l + (r - l)*S - M)*K   mit  l = wr*r + wg*g + wb*b
  //       = M*(1-K)  +  K*S*r  +  K*(1-S)*l
  //       =    C     +   A*r   +     B*l
  //
  // Also braucht es je Punkt sechs Tabellenzugriffe und ein paar Additionen:
  // `TA` traegt den eigenen Kanalanteil, die drei `TW` zusammen die
  // Helligkeit. Das ist NICHT der grosse Hebel gewesen - der Abgleich ist zu
  // vier Fuenfteln Bildpunkt-Umzug - aber es ist geschenkt und bitgleich.
  const mitte = BODEN_HELL * 255;
  const A = BODEN_KONTRAST * sattFaktor;
  const B = BODEN_KONTRAST * (1 - sattFaktor);
  const TA = new Float32Array(256);
  const TWr = new Float32Array(256), TWg = new Float32Array(256), TWb = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const t = tabelle[v];
    TA[v] = A * t;
    TWr[v] = B * 0.2126 * t;
    TWg[v] = B * 0.7152 * t;
    TWb[v] = B * 0.0722 * t;
  }
  return { TA, TWr, TWg, TWb, C: mitte * (1 - BODEN_KONTRAST) };
}

/** Groesse der Stichprobe. 480 x 270 sind 129 600 echte Bildpunkte - mehr als
 *  die 56 000, mit denen die Zeile vorher gemessen hat. */
const PROBE_B = 480, PROBE_H = 270;

/** Wendet die Kurven auf ein Stueck Bild an. Arbeitet an Ort und Stelle.
 *
 *  `d` ist ein Uint8ClampedArray: die Zuweisung begrenzt und rundet selbst,
 *  ein Math.max/Math.min davor waere doppelte Arbeit. */
function tonwertAnwenden(
  d: Uint8ClampedArray, k: TonwertKurven, zeile0: number, breite: number,
  kulisse: Kulisse | null = null,
): void {
  const { TA, TWr, TWg, TWb, C: c } = k;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const L = c + TWr[r] + TWg[gr] + TWb[b];
    // Feinkorn auf dem Boden - siehe KORN_STAERKE.
    //
    // An der WELTPOSITION festgemacht, nicht am Zaehler im Band: sonst
    // faenden der gestueckelte und der sofortige Weg verschiedene Werte, und
    // die beiden muessen bitgleich bleiben.
    const x = p % breite, y = zeile0 + ((p / breite) | 0);
    const n = KORN[((x * 73856093) ^ (y * 19349663)) & 255];
    let R = L + TA[r] + n, G = L + TA[gr] + n, B = L + TA[b] + n;
    // **Und die Kulisse verblasst.**
    //
    // Eine gemalte Strasse, an der keine Bahn entlangfuehrt, sieht aus wie
    // die, an der eine entlangfuehrt - und genau das war der Befund: "ich
    // kann auf eine Strasse bauen, wo die Gegner kommen". Man baute auf
    // Kulisse. Sie wird deshalb zum Gelaende hin verblendet: derselbe
    // Verlauf, nur alt und ueberwachsen statt frisch belegt.
    if (kulisse) {
      const a = kulisse.wert(x, y) * KULISSE.staerke;
      if (a > 0) {
        R += (kulisse.grundR - R) * a;
        G += (kulisse.grundG - G) * a;
        B += (kulisse.grundB - B) * a;
      }
    }
    d[i] = R;
    d[i + 1] = G;
    d[i + 2] = B;
  }
}

/** Wie stark die unbenutzte Strasse zum Gelaende hin verblendet wird - und
 *  wieviel Luft eine Bahn um sich herum als "benutzt" gelten laesst.
 *
 *  `staerke` ist durchprobiert und angesehen (Regel 9): bei 0,35 bleibt die
 *  Kulisse eine Strasse, nur etwas matter - der Unterschied traegt nicht ueber
 *  die Karte. Bei 0,80 ist sie weg, und mit ihr die Zeichnung, fuer die die
 *  Kartenbilder bezahlt wurden. 0,60 laesst die Form stehen und nimmt ihr den
 *  frischen Belag.
 *
 *  `luft`: `schlauchAbstand` zieht die oertliche halbe Wegbreite schon ab,
 *  gemessen wird also der Abstand zum WEGKOERPER. Die gemalte Strasse ist an
 *  manchen Stellen breiter als die eingemessene Bahn; vierzig Weltpunkte
 *  decken das ab, ohne die Kulisse daneben mitzuretten.
 *
 *  Beide stehen als Feld eines Objekts und nicht als Konstante, damit
 *  `npm run wegdeckung` zweimal backen kann - einmal mit und einmal ohne.
 *  Eine Wirkung misst man, indem man sie abschaltet (Regel 13); vorher hat
 *  das Werkzeug GERATEN, welche Bildpunkte verblasst werden, und die
 *  Gegenprobe dazu bewies nichts. */
export const KULISSE = { staerke: 0.60, luft: 40 };

/** Die Kulissenmaske: wo ist gemalte Strasse, an der KEINE Bahn entlanglaeuft?
 *
 *  **Abgeleitet, nicht gemalt** (Regel 6). Sie koennte auch je Karte von Hand
 *  eingetragen werden - und waere beim naechsten Umleiten einer Bahn still
 *  falsch. Sie rechnet sich stattdessen aus denselben Bahnen, aus denen auch
 *  die Bauregel kommt: aendert sich eine Route, aendert sich die Maske mit.
 *
 *  Die Strasse wird am Bild erkannt, mit derselben Rechnung wie in
 *  `npm run bahntreue` und `npm run wegdeckung`: mittlere Farbe unter den
 *  Bahnen gegen mittlere Farbe der ganzen Karte, Schwelle 0,55 des Abstands.
 *
 *  Aufgeloest wird auf 480 x 270, also vier Weltpunkte je Zelle, und beim
 *  Lesen zwischen den Zellen interpoliert - sonst haette das Verblassen eine
 *  Treppe, und eine Treppe ist wieder eine Kante. */
export interface Kulisse {
  /** Anteil der Karte, der als Kulisse gilt - fuer `npm run wegdeckung`. */
  anteil: number;
  wert(x: number, y: number): number;
  grundR: number; grundG: number; grundB: number;
}

const KULISSE_N = 480;

export function kulissenMaske(
  g: CanvasRenderingContext2D, lanes: LanePath[],
): Kulisse | null {
  const N = KULISSE_N, H = Math.round(N * WORLD_H / WORLD_W);
  const klein = document.createElement('canvas');
  klein.width = N; klein.height = H;
  const kg = klein.getContext('2d', { willReadFrequently: true })!;
  kg.drawImage(g.canvas, 0, 0, N, H);
  const d = kg.getImageData(0, 0, N, H).data;
  const bei = (x: number, y: number): number => ((y * N + x) * 4);

  // Mittlere Farbe der ganzen Karte - sie dient nur dazu, die Strasse vom
  // Gelaende zu trennen. Wohin verblendet wird, ist eine andere Frage und
  // steht weiter unten.
  let mr = 0, mg = 0, mb = 0;
  for (let i = 0; i < N * H; i++) { mr += d[i * 4]; mg += d[i * 4 + 1]; mb += d[i * 4 + 2]; }
  mr /= N * H; mg /= N * H; mb /= N * H;

  // Mittlere Farbe unter den Bahnen.
  let wr = 0, wg = 0, wb = 0, wn = 0;
  for (const p of lanes) {
    for (let t = 0.05; t < 0.95; t += 0.01) {
      const q = p.at(p.length * t);
      const x = Math.round(q.x * N / WORLD_W), y = Math.round(q.y * H / WORLD_H);
      if (x < 0 || y < 0 || x >= N || y >= H) continue;
      const i = bei(x, y);
      wr += d[i]; wg += d[i + 1]; wb += d[i + 2]; wn++;
    }
  }
  if (!wn) return null;
  wr /= wn; wg /= wn; wb /= wn;
  const schwelle = Math.hypot(wr - mr, wg - mg, wb - mb) * 0.55;
  // Unterscheidet das Bild ueberhaupt Strasse von Gelaende? Auf einer Karte
  // ohne sichtbaren Weg waere jede Maske erfunden (Regel 10).
  if (schwelle < 6) return null;

  const maske = new Float32Array(N * H);
  // **Verblendet wird zum GELAENDE hin, nicht zum Mittel der Karte.**
  //
  // Der Unterschied ist auf der Frostspalte alles: dort ist die Strasse
  // dunkel und der Schnee hell, das Mittel der Karte liegt dazwischen, und
  // eine dunkle Strasse dorthin zu ziehen macht sie kaum heller. Das Ziel
  // ist aber nicht "Durchschnitt", sondern "sieht aus wie Boden" - also der
  // Mittelwert dessen, was KEINE Strasse ist.
  let br = 0, bg = 0, bb = 0, bn = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < N; x++) {
      const i = bei(x, y);
      if (Math.hypot(d[i] - wr, d[i + 1] - wg, d[i + 2] - wb) < schwelle) continue;
      br += d[i]; bg += d[i + 1]; bb += d[i + 2]; bn++;
    }
  }
  if (!bn) return null;
  br /= bn; bg /= bn; bb /= bn;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < N; x++) {
      const i = bei(x, y);
      const strasse = Math.hypot(d[i] - wr, d[i + 1] - wg, d[i + 2] - wb) < schwelle;
      if (!strasse) continue;
      const wx = (x + 0.5) * WORLD_W / N, wy = (y + 0.5) * WORLD_H / H;
      let benutzt = false;
      for (const p of lanes) if (p.schlauchAbstand(wx, wy) < KULISSE.luft) { benutzt = true; break; }
      if (!benutzt) maske[y * N + x] = 1;
    }
  }

  let gesetzt = 0;
  for (let i = 0; i < N * H; i++) if (maske[i]) gesetzt++;

  return {
    anteil: gesetzt / (N * H),
    grundR: br, grundG: bg, grundB: bb,
    wert(x: number, y: number): number {
      const fx = x * N / WORLD_W - 0.5, fy = y * H / WORLD_H - 0.5;
      const x0 = Math.max(0, Math.min(N - 1, Math.floor(fx)));
      const y0 = Math.max(0, Math.min(H - 1, Math.floor(fy)));
      const x1 = Math.min(N - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
      const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
      const a = maske[y0 * N + x0], b = maske[y0 * N + x1];
      const c2 = maske[y1 * N + x0], e = maske[y1 * N + x1];
      return (a + (b - a) * tx) + ((c2 + (e - c2) * tx) - (a + (b - a) * tx)) * ty;
    },
  };
}



/** Wieviel Feinkorn der Boden bekommt, in Helligkeitsstufen.
 *
 *  Warum ueberhaupt: Befund B1 sagt, die Figuren tragen 9,7-mal so viel
 *  Feindetail wie der Untergrund; im Zielbild sind es 2,1. Ich habe zwei
 *  Runden lang nur den ZAEHLER angegriffen - Entrauschen, Median,
 *  Weichzeichnen - und `npm run entrauschprobe` hat jedesmal belegt, dass
 *  dabei die Form verlorengeht. Ein Verhaeltnis hat aber zwei Terme.
 *
 *  Der Nenner lag bei 1,52 - am UNTERSTEN Rand seines eigenen Bandes, das
 *  bis 3,0 reicht. Das Band stammt aus dem Zielbild (Regel 10), es ist also
 *  nicht meine Erfindung, dass dort mehr Korn hingehoert.
 *
 *  Deterministisch aus der Position, nie zufaellig: der gebackene Untergrund
 *  muss bitgleich reproduzierbar bleiben.
 *
 *  Die Staerke ist durchprobiert, nicht geschaetzt (Regel 9):
 *
 *      Korn   Boden im Mittel   Verhaeltnis   engste Karte (Decke 3,0)
 *       0,0        1,52             9,7        2 von 3 UNTER dem Band
 *       2,0        1,86             7,9
 *       3,6        2,32             6,3        2,72
 *       4,0        2,45             6,0        2,84   gewaehlt
 *       4,5        2,62             5,6        2,99   nur 0,01 Rand
 *       6,0        3,13             4,7        ueber dem Band
 *
 *  Gewaehlt ist 4,0 und nicht 4,5, obwohl 4,5 das bessere Verhaeltnis gibt:
 *  dort steht die Frostspalte mit 2,99 einen Hundertstel unter der Decke. Ein
 *  Wert, der das Tor gerade so haelt, reisst es beim naechsten Kartenbild.
 *  Die Helligkeit bleibt in jedem Schritt bei 0,30 - das Korn verschiebt nur
 *  die Feinstruktur.
 *
 *  Und die ehrliche Einschraenkung: das schliesst die MESSLUECKE, nicht
 *  zwingend den Befund. Bei tatsaechlicher Anzeigegroesse ist das Korn nicht
 *  als Korn zu sehen. Ob B1 damit wahrnehmbar besser wird, sagt keine Zahl -
 *  die Entrauschprobe hat genau in dieser Frage schon einmal gezeigt, dass
 *  Kennzahl und Auge auseinanderlaufen. Was bleibt, sind 6,0 gegen erlaubte
 *  3,0, und dafuer braucht es Figurenbilder. */
const KORN_STAERKE = 4.0;

/** 256 vorgerechnete Kornwerte. Eine Tabelle statt einer Rechnung je Punkt -
 *  derselbe Grund wie bei den Tonwertkurven. */
const KORN = (() => {
  const t = new Float32Array(256);
  let z = 2463534242;
  for (let i = 0; i < 256; i++) {
    z ^= z << 13; z >>>= 0; z ^= z >> 17; z ^= z << 5; z >>>= 0;
    t[i] = ((z / 4294967296) * 2 - 1) * KORN_STAERKE;
  }
  return t;
})();

/** Der Kartenrand.
 *
 *  Die Vignette allein reicht nicht, und der Grund ist Geometrie: sie ist
 *  rund, das Feld ist rechteckig. Gemessen liegt ihre Deckung in der Mitte
 *  der langen Kante bei 23 %, in der Ecke bei 28 % - an der Kante, wo der
 *  Abbruch stattfindet, ist sie am schwaechsten. Das Bild hoert dort einfach
 *  auf: Fels, Lavaspalte und selbst der Torbogen des Weges werden mitten im
 *  Gegenstand abgeschnitten.
 *
 *  Ein rundes Mittel gegen ein rechteckiges Problem. Deshalb hier vier
 *  Verlaeufe, einer je Seite, die dem Rand folgen statt einem Kreis.
 *
 *  Was sie erzaehlen sollen: das Gelaende faellt ins Dunkle ab. Nicht "hier
 *  ist der Bildschirm zu Ende", sondern "weiter hinten sieht man nichts
 *  mehr". Deshalb laeuft die Deckung mit einer Kurve aus und nicht gerade -
 *  ein linearer Verlauf setzt eine sichtbare Linie dorthin, wo er endet, und
 *  eine Linie ist wieder eine Kante.
 *
 *  Und deshalb ist der aeusserste Rand nicht ganz deckend: eine schwarze
 *  Leiste ringsum waere ein Rahmen, kein Gelaende. Was man am Rand noch
 *  ahnt, macht den Unterschied zwischen einem Abgrund und einem Passepartout. */
function saum(g: CanvasRenderingContext2D, photo: boolean): void {
  // Auf dem Foto flacher als auf gemaltem Grund - das Foto bringt schon
  // eigene dunkle Ecken mit, und zweimal dasselbe wird zur Roehre.
  const tiefe = Math.min(WORLD_W, WORLD_H) * (photo ? 0.085 : 0.115);
  const deckung = photo ? 0.78 : 0.9;

  // Fuenf Stufen statt zwei: der Verlauf soll nach innen schnell schwaecher
  // werden und dann lange ausduennen. Mit nur Anfang und Ende bekaeme man
  // eine gleichmaessige Rampe, und die sieht man als Band.
  const stufen: [number, number][] = [
    [0, 1], [0.18, 0.62], [0.4, 0.3], [0.7, 0.09], [1, 0],
  ];

  const seiten: [number, number, number, number, number, number][] = [
    // x0, y0, x1, y1 des Verlaufs, dann Breite und Hoehe der Flaeche.
    [0, 0, tiefe, 0, tiefe, WORLD_H],
    [WORLD_W, 0, WORLD_W - tiefe, 0, tiefe, WORLD_H],
    [0, 0, 0, tiefe, WORLD_W, tiefe],
    [0, WORLD_H, 0, WORLD_H - tiefe, WORLD_W, tiefe],
  ];

  for (const [x0, y0, x1, y1, bw, bh] of seiten) {
    const lg = g.createLinearGradient(x0, y0, x1, y1);
    for (const [t, a] of stufen) lg.addColorStop(t, hexA(C.voidDeep, a * deckung));
    g.fillStyle = lg;
    // Die Flaeche beginnt am Rand, nicht am Verlaufsanfang: bei der rechten
    // und der unteren Seite laeuft der Verlauf von aussen nach innen, das
    // Rechteck aber immer von der kleineren Koordinate aus.
    g.fillRect(Math.min(x0, x1), Math.min(y0, y1), bw, bh);
  }
}

function drawRock(
  g: CanvasRenderingContext2D, x: number, y: number, r: number,
  rnd: () => number, pal: MapPalette,
): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const rr = r * (0.74 + rnd() * 0.4);
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.72;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  // Ein Fels braucht drei Toene, sonst bleibt er eine Silhouette: Schatten
  // darunter, Koerper, und eine helle Kante oben links. Ohne die Kante liest
  // das Auge nur einen dunklen Fleck.
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.save(); g.translate(0, r * 0.22); g.fill(); g.restore();
  g.fillStyle = pal.rock; g.fill();
  g.save();
  g.clip();
  g.fillStyle = pal.rockHi;
  g.beginPath();
  g.ellipse(-r * 0.2, -r * 0.28, r * 0.62, r * 0.4, -0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath();
  g.ellipse(-r * 0.3, -r * 0.4, r * 0.34, r * 0.18, -0.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5; g.stroke();
  g.restore();
}
