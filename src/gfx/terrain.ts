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
export function bakeTerrain(
  map: GameMap, lanes: LanePath[], pal: MapPalette,
  photo: HTMLImageElement | null = null,
): HTMLCanvasElement {
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
  if (photo) angleichen(g);

  // --- Vignette
  const vg = g.createRadialGradient(
    WORLD_W / 2, WORLD_H / 2, Math.min(WORLD_W, WORLD_H) * 0.3,
    WORLD_W / 2, WORLD_H / 2, Math.max(WORLD_W, WORLD_H) * 0.72,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, hexA(C.voidDeep, photo ? 0.38 : 0.6));
  g.fillStyle = vg;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  saum(g, photo !== null);
  return cv;
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
function angleichen(g: CanvasRenderingContext2D): void {
  const bild = g.getImageData(0, 0, WORLD_W, WORLD_H);
  const d = bild.data;

  // Erst messen - auf einer Stichprobe, nicht auf allen 3,2 Millionen Punkten.
  // Fuer einen Mittelwert reicht jeder 37. Punkt; die Primzahl verhindert,
  // dass die Stichprobe sich auf ein Muster im Bild legt.
  let n = 0, summeL = 0, summeS = 0;
  for (let i = 0; i < d.length; i += 4 * 37) {
    const r = d[i] / 255, gr = d[i + 1] / 255, b = d[i + 2] / 255;
    summeL += leuchte(r, gr, b);
    const max = Math.max(r, gr, b), min = Math.min(r, gr, b);
    summeS += max === 0 ? 0 : (max - min) / max;
    n++;
  }
  const istHell = summeL / n, istSatt = summeS / n;
  if (istHell <= 0.001) return;

  // Das Gamma, das die gemessene Helligkeit auf die gewuenschte hebt.
  // Naeherung ueber den Mittelwert: hell^(1/gamma) = ziel. Sie ist nicht
  // exakt - der Mittelwert einer Potenz ist nicht die Potenz des Mittelwerts -
  // aber der Fehler liegt bei wenigen Hundertsteln, und nachjustiert wird
  // ohnehin an der gemessenen Ausgabe.
  const gamma = Math.log(istHell) / Math.log(Math.min(0.95, BODEN_HELL));
  const invGamma = 1 / Math.max(0.5, Math.min(2.5, gamma));

  // Sattheit: der Faktor gilt fuer das ganze Bild, nicht je Punkt. Je Punkt
  // gerechnet wuerde jeden fast grauen Punkt auf Zielsaettigung reissen -
  // aus Nebel wuerde Farbe.
  const sattFaktor = istSatt > 0.01
    ? 1 + (BODEN_SATT / istSatt - 1) * SATT_ZUG
    : 1;

  // Nachschlagetabelle statt Math.pow je Punkt.
  const tabelle = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    tabelle[v] = Math.round(Math.pow(v / 255, invGamma) * 255);
  }

  // Die Mitte, um die gespreizt wird - der Zielwert, nicht der gemessene.
  // Um den gemessenen zu spreizen hiesse, die Korrektur von sich selbst
  // abhaengig zu machen.
  const mitte = BODEN_HELL * 255;

  // --- Warum hier vier Tabellen stehen und keine Rechnung.
  //
  // Ueber dieser Schleife stand bis v111 die Behauptung, die eine
  // Nachschlagetabelle mache "den Unterschied zwischen einem spuerbaren
  // Ruckler beim Kartenwechsel und keinem". Gemessen kostete der Vorgang
  // trotzdem 243 ms je Karte, im Browser mit Telefondrossel ueber eine
  // Sekunde. Die Behauptung stand im Kommentar, kein Tor hat sie je geprueft.
  //
  // Die Rechnung je Punkt ist in Wahrheit LINEAR in den drei
  // tabellierten Kanaelen, und das laesst sich ausrechnen statt ausfuehren:
  //
  //   k_r = M + (l + (r - l)*S - M)*K   mit  l = wr*r + wg*g + wb*b
  //       = M*(1-K)  +  K*S*r  +  K*(1-S)*l
  //       =    C     +   A*r   +     B*l
  //
  // Also braucht es je Punkt keine Multiplikation mehr, sondern sechs
  // Tabellenzugriffe und ein paar Additionen: `TA` traegt den eigenen
  // Kanalanteil, die drei `TW` zusammen die Helligkeit.
  const A = BODEN_KONTRAST * sattFaktor;
  const B = BODEN_KONTRAST * (1 - sattFaktor);
  const C = mitte * (1 - BODEN_KONTRAST);
  const TA = new Float32Array(256);
  const TWr = new Float32Array(256), TWg = new Float32Array(256), TWb = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const t = tabelle[v];
    TA[v] = A * t;
    TWr[v] = B * 0.2126 * t;
    TWg[v] = B * 0.7152 * t;
    TWb[v] = B * 0.0722 * t;
  }

  // `d` ist ein Uint8ClampedArray: die Zuweisung begrenzt und rundet selbst.
  // Das vorherige Math.max/Math.min davor war doppelte Arbeit.
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const L = C + TWr[r] + TWg[gr] + TWb[b];
    d[i] = L + TA[r];
    d[i + 1] = L + TA[gr];
    d[i + 2] = L + TA[b];
  }
  g.putImageData(bild, 0, 0);
}

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
