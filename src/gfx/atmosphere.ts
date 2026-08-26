import { C, WORLD_H, WORLD_W } from '../data/config';
import type { MapPalette, WetterArt } from '../data/maps';
import { makeRng } from '../core/math';
import { hexA } from './glow';

/** Stimmungsschichten.
 *
 *  Das Feld scrollt nicht - klassische Parallaxe gibt es hier also nicht.
 *  Tiefe entsteht stattdessen ueber Schichten, die sich unabhaengig
 *  voneinander bewegen: ein Lichtschacht liegt still, Bodennebel zieht
 *  langsam, ein Polarlicht atmet darueber. Alles vorgebacken - im Spiel
 *  bleiben davon eine Handvoll Zeichenbefehle. */

const moodLayers = new Map<string, HTMLCanvasElement>();
const fogDiscs = new Map<string, HTMLCanvasElement>();
let auroraBand: HTMLCanvasElement | null = null;

/** Ruhende Lichtstimmung ueber dem ganzen Feld: ein schraeger Mondschacht von
 *  oben links, kuehler Abfall nach unten rechts. Einmal gebacken, danach ein
 *  einziger Zeichenbefehl je Bild. */
export function getMoodLayer(pal: MapPalette): HTMLCanvasElement {
  const hit = moodLayers.get(pal.mood);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = WORLD_W; cv.height = WORLD_H;
  const g = cv.getContext('2d')!;

  const shaft = g.createLinearGradient(0, 0, WORLD_W * 0.85, WORLD_H);
  shaft.addColorStop(0, hexA(pal.mood, 0.17));
  shaft.addColorStop(0.32, hexA(pal.mood, 0.06));
  shaft.addColorStop(0.7, 'rgba(10, 16, 34, 0.12)');
  shaft.addColorStop(1, 'rgba(6, 10, 24, 0.32)');
  g.fillStyle = shaft;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // Ein zweiter, schmalerer Streifen setzt die Lichtkante.
  g.save();
  g.translate(WORLD_W * 0.24, 0);
  g.rotate(0.28);
  const beam = g.createLinearGradient(-260, 0, 260, 0);
  beam.addColorStop(0, hexA(pal.mood, 0));
  beam.addColorStop(0.5, hexA(pal.mood, 0.1));
  beam.addColorStop(1, hexA(pal.mood, 0));
  g.fillStyle = beam;
  g.fillRect(-260, -200, 520, WORLD_H + 400);
  g.restore();

  moodLayers.set(pal.mood, cv);
  return cv;
}

function getFogDisc(tone: string): HTMLCanvasElement {
  const hit = fogDiscs.get(tone);
  if (hit) return hit;
  const r = 190;
  const cv = document.createElement('canvas');
  cv.width = r * 2; cv.height = r * 2;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, hexA(tone, 0.14));
  grad.addColorStop(0.5, hexA(tone, 0.06));
  grad.addColorStop(1, hexA(tone, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, r * 2, r * 2);
  fogDiscs.set(tone, cv);
  return cv;
}

/** Bodennebel: acht Scheiben, die in verschiedenen Tempi ueber das Feld
 *  ziehen. Weil sie sich unterschiedlich schnell bewegen, entsteht Tiefe. */
export function drawGroundFog(
  ctx: CanvasRenderingContext2D, time: number, dense: boolean, tone: string,
): void {
  const disc = getFogDisc(tone);
  const n = dense ? 8 : 4;
  const rnd = makeRng(3141);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const speed = 6 + rnd() * 16;
    const y = rnd() * WORLD_H;
    const scale = 0.7 + rnd() * 0.9;
    const phase = rnd() * WORLD_W;
    const w = 380 * scale;
    // Sanft ueber den rechten Rand hinaus und links wieder herein.
    const x = ((phase + time * speed) % (WORLD_W + w * 2)) - w;
    ctx.globalAlpha = 0.55 + Math.sin(time * 0.4 + i) * 0.18;
    ctx.drawImage(disc, x - w / 2, y - w / 2, w, w);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function getAuroraBand(): HTMLCanvasElement {
  if (auroraBand) return auroraBand;
  const w = 512, h = 160;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d')!;
  const rnd = makeRng(777);
  for (let i = 0; i < 5; i++) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    const tone = i % 2 === 0 ? C.crystal : C.voidling;
    grad.addColorStop(0, hexA(tone, 0));
    grad.addColorStop(0.45, hexA(tone, 0.13));
    grad.addColorStop(1, hexA(tone, 0));
    g.fillStyle = grad;
    g.beginPath();
    const base = rnd() * w;
    g.moveTo(base, 0);
    for (let x = 0; x <= w; x += 32) {
      g.lineTo(base + x * 0.2 + Math.sin(x * 0.02 + i) * 40, x * 0.1);
    }
    g.lineTo(base + w * 0.25 + 60, h);
    g.lineTo(base - 40, h);
    g.closePath();
    g.fill();
  }
  auroraBand = cv;
  return cv;
}

/** Polarlicht am oberen Rand: langsam wandernd, additiv aufgelegt. */
export function drawAurora(ctx: CanvasRenderingContext2D, time: number): void {
  const band = getAuroraBand();
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) {
    const speed = 9 + i * 7;
    const w = WORLD_W * 1.4;
    const x = ((time * speed + i * 900) % (w + WORLD_W)) - w;
    ctx.globalAlpha = 0.5 + Math.sin(time * 0.3 + i * 2) * 0.22;
    ctx.drawImage(band, x, -30 + i * 40, w, 300 - i * 60);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prev;
}

// ------------------------------------------------------------------- Wetter

/** Was ueber einer Karte vom Himmel kommt (D2).
 *
 *  Drei Karten, drei Stimmungen - und der Unterschied ist nicht nur Zierde:
 *  die drei Orte sahen sich bisher vor allem im Bodenton unaehnlich, und
 *  ein Ton allein traegt nicht weit, wenn das Feld ohnehin dunkel ist.
 *  Etwas, das sich BEWEGT, sagt "anderer Ort" viel schneller als eine
 *  Farbe es kann. */
// Der Typ steht bei den Daten (`data/maps.ts`), nicht hier: diese Datei
// liest die Palette schon von dort, und ein Typ in der Gegenrichtung haette
// die beiden Module aufeinander zeigen lassen.

/** Wieviele Teilchen gezeichnet werden.
 *
 *  In Anzeigequalitaet "hoch" das Volle, sonst gut die Haelfte. Es ist kein
 *  Abschalten: ein Ort, dessen Wetter bei niedriger Qualitaet verschwindet,
 *  waere auf schwachen Geraeten ein anderer Ort. */
const WETTER_ZAHL: Record<WetterArt, [number, number]> = {
  regen: [130, 60],
  asche: [120, 55],
  schnee: [110, 50],
  keines: [0, 0],
};

/** Wetter ueber dem Feld.
 *
 *  Alles aus `time` und einer festen Aussaat gerechnet, kein `Math.random`
 *  und kein mitgefuehrter Zustand. Das ist keine Stilfrage: die
 *  Ruhepruefung in der Bildabnahme legt zwei Bilder desselben Zeitpunkts
 *  uebereinander und zieht sie voneinander ab. Ein Wetter mit eigenem
 *  Gedaechtnis stuende in den beiden Bildern verschieden - und die Pruefung
 *  meldete Bewegung an einem Turm, der stillsteht (Regel 13).
 *
 *  Gezeichnet wird ohne `filter` und ohne `lighter` (Regel 11): auf iOS
 *  faellt das Bild damit nach etwa einer Sekunde auf Schwarz. */
export function drawWetter(
  ctx: CanvasRenderingContext2D, time: number, dense: boolean,
  art: WetterArt, ton: string,
): void {
  const n = WETTER_ZAHL[art][dense ? 0 : 1];
  if (!n) return;
  const rnd = makeRng(20250826);
  ctx.save();

  // **In Baendern gezeichnet, nicht Teilchen fuer Teilchen.**
  //
  // Gemessen kostete die erste Fassung 796 Zeichenbefehle je Bild - sie
  // verdoppelte die Zeichenlast des ganzen Feldes (1138 auf 1934 von 3000).
  // Fuer eine Stimmungsschicht ist das auf einem Telefon nicht zu
  // verantworten. Jedes Teilchen setzte Deckkraft, Farbe und Strichbreite
  // neu, obwohl sich diese drei nur mit der TIEFE aendern.
  //
  // Jetzt liegen die Teilchen in vier Tiefenbaendern. Je Band wird der
  // Zustand einmal gesetzt und ein einziger Pfad gezogen; uebrig bleiben
  // zwei Befehle je Teilchen. Sichtbar ist das nicht - vier Stufen Tiefe
  // sieht niemand von drei -, messbar sehr wohl.
  const BAENDER = 4;

  if (art === 'regen') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = ton;
    for (let b = 0; b < BAENDER; b++) {
      const tiefe = (b + 0.5) / BAENDER;
      ctx.globalAlpha = 0.07 + tiefe * 0.16;
      ctx.lineWidth = 1 + tiefe * 1.4;
      ctx.beginPath();
      for (let i = b; i < n; i += BAENDER) {
        const speed = 900 + tiefe * 1500;
        const laenge = 16 + tiefe * 34;
        const x0 = rnd() * (WORLD_W + 400) - 200;
        const y0 = rnd() * WORLD_H;
        const y = (y0 + time * speed) % (WORLD_H + laenge * 2) - laenge;
        const x = x0 + y * 0.22;                    // Wind von links
        ctx.moveTo(x, y);
        ctx.lineTo(x - laenge * 0.22, y + laenge);
      }
      ctx.stroke();
    }
  } else {
    // Asche und Schnee: langsam, taumelnd, rund. Der Unterschied liegt im
    // Tempo, im Ton und in der Glut, nicht in der Form - beides ist
    // herabfallender Staub, und zwei verschiedene Formen dafuer waeren
    // erfunden.
    const schnell = art === 'asche' ? 34 : 58;
    const seit = art === 'asche' ? 26 : 44;
    const glutBahn: [number, number, number, number][] = [];
    ctx.fillStyle = ton;
    for (let b = 0; b < BAENDER; b++) {
      const tiefe = (b + 0.5) / BAENDER;
      const r = (art === 'asche' ? 1.4 : 1.9) + tiefe * 2.6;
      const speed = schnell * (0.5 + tiefe);
      // Asche und Schnee tragen gleich viel Deckkraft. Die erste Fassung
      // gab der Asche 0,10 gegen 0,14 - und auf dem dunkelbraunen Boden der
      // Schlucht verschwand sie dadurch fast ganz, waehrend der Schnee auf
      // dem blauen Frostboden klar stand. Gesehen, nicht gemessen: die
      // Punktzahl sagt nichts darueber, wieviel Kontrast ein Ton auf SEINEM
      // Boden hat (Regel 8).
      ctx.globalAlpha = 0.14 + tiefe * 0.22;
      ctx.beginPath();
      for (let i = b; i < n; i += BAENDER) {
        const x0 = rnd() * WORLD_W;
        const y0 = rnd() * WORLD_H;
        const drift = rnd() * 6.283;
        const y = (y0 + time * speed) % (WORLD_H + 40) - 20;
        const x = (x0 + Math.sin(time * 0.6 + drift) * seit + time * seit * 0.35)
          % (WORLD_W + 40) - 20;
        // Jede achte Flocke der Ascheschlucht ist Glut - warm, gesaettigt,
        // langsam pulsierend. Ohne sie ist Aschefall beigefarbener Schnee:
        // beide sind runder Staub, und ein Farbton allein traegt bei zwei
        // Bildpunkten Durchmesser nicht.
        //
        // Gewaehlt wird aus dem Zufallsstrom, NICHT ueber den Index. Die
        // erste Fassung nahm `i % 8`, und seit die Teilchen in vier
        // Baendern liegen (`i += 4`) sind die beiden nicht mehr
        // unabhaengig: jede achte Zahl ist auch durch vier teilbar, also
        // landete die gesamte Glut im flachsten Band - kleinster Radius,
        // schwaechste Deckkraft. Gemessen fiel ihr Anteil dabei von 7,4 auf
        // 3,0 Prozent, und das Tor hat es gemeldet.
        const istGlut = art === 'asche' && rnd() < 0.125;
        if (istGlut) { glutBahn.push([x, y, r * 0.95, drift]); continue; }
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, 6.283);
      }
      ctx.fill();
    }
    // Die Glut pulsiert je Teilchen, also bekommt sie ihre eigenen Befehle -
    // es sind ein Achtel von neunzig, das faellt nicht ins Gewicht.
    ctx.fillStyle = '#FF9A3C';
    for (const [x, y, r, drift] of glutBahn) {
      ctx.globalAlpha = 0.42 + Math.sin(time * 2.4 + drift) * 0.20;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.283);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
