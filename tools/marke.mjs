/**
 * Die Marke — der Kristall, wie er ausserhalb des Spiels auftritt.
 *
 * Er steht an zwei Stellen: auf dem Startbildschirm-Symbol und auf dem
 * Startbild, das iOS beim Oeffnen zeigt. Deshalb steht er hier und nicht
 * zweimal: was zweimal dasteht, veraltet einmal (Regel 15). Gepflegt wuerde
 * das Symbol, weil man es sieht; das Startbild sieht man eine halbe Sekunde.
 *
 * Alles Farbige und die Lichtrichtung werden aus `src/data/config.ts`
 * GELESEN. Abgeschrieben waere beides nach der naechsten Aenderung still
 * falsch - und ein Symbol, das von der anderen Seite leuchtet als jede Figur
 * im Spiel, faellt niemandem auf.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KONF = readFileSync(join(ROOT, 'src/data/config.ts'), 'utf8');

const farbe = (name) => {
  const t = new RegExp(`${name}: '(#[0-9a-fA-F]{6})'`).exec(KONF);
  if (!t) throw new Error(`MARKE: Farbe "${name}" steht nicht in src/data/config.ts.`);
  return t[1];
};

export const F = {
  voidTief: farbe('voidDeep'),
  voidMitte: farbe('voidMid'),
  kristall: farbe('crystal'),
  kristallTief: farbe('crystalDeep'),
  pfad: farbe('path'),
  stein: farbe('stone'),
};

/** Woher faellt das Licht? `LICHT` in der Konfiguration ist die SCHATTEN-
 *  Richtung: faellt der Schatten nach rechts, kommt das Licht von links. */
const LICHT_X = (() => {
  const t = /LICHT = \{ x: (-?[0-9.]+),/.exec(KONF);
  if (!t) throw new Error('MARKE: LICHT steht nicht in src/data/config.ts.');
  return Number(t[1]);
})();
/** Die beleuchtete Wange: bei Schatten nach rechts ist es die linke. */
export const HELL_LINKS = LICHT_X > 0;

export const mit = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Die sechs Punkte des Kristalls, um einen Mittelpunkt herum.
 *
 *  Sechs Punkte, drei Flaechen - mehr Facetten verschwinden bei 60 Punkten
 *  ohnehin und machen die Form nur unruhig. */
export function umriss(cx, cy, breit, hoch) {
  const P = (x, y) => [cx + x * breit, cy + y * hoch];
  return {
    spitze: P(0, -0.5),
    schulterR: P(0.5, -0.16),
    huefteR: P(0.37, 0.24),
    fuss: P(0, 0.5),
    huefteL: P(-0.37, 0.24),
    schulterL: P(-0.5, -0.16),
    P,
  };
}

/** Den Kristall auf eine durchsichtige Leinwand zeichnen.
 *
 *  `flach` schaltet die Verlaeufe ab und faerbt jede Flaeche in einem Ton.
 *  Das ist keine Geschmacksfrage, sondern eine Preisfrage: auf dem Startbild
 *  ist der Kristall ueber 350 x 540 Punkte gross, und ein Verlauf ueber diese
 *  Flaeche kostet 16 KB je Bild - ueber zehn Geraetegroessen 160 KB in einer
 *  Datei von 1,3 MB. Flach kostet er 3. Beim Symbol mit seinen 180 Punkten
 *  faellt derselbe Verlauf nicht ins Gewicht, dort bleibt er.
 *
 *  Gemessen an der fertigen Datei, nicht geschaetzt: eine erste Schaetzung an
 *  einem VEREINFACHTEN Bild lag um den Faktor zehn daneben (Regel 12). */
export function kristallZeichnen(w, h, cx, cy, breit, hoch, saumStaerke = 1.5, flach = false) {
  const lw = createCanvas(w, h);
  const g = lw.getContext('2d');
  const u = umriss(cx, cy, breit, hoch);
  const alle = [u.spitze, u.schulterR, u.huefteR, u.fuss, u.huefteL, u.schulterL];

  const zug = (punkte) => {
    g.beginPath();
    g.moveTo(...punkte[0]);
    for (let i = 1; i < punkte.length; i++) g.lineTo(...punkte[i]);
    g.closePath();
  };

  // Die beiden Wangen - welche die helle ist, sagt die Lichtrichtung.
  const wange = (schulter, huefte, hell) => {
    zug([u.spitze, schulter, huefte, u.fuss]);
    if (flach) {
      g.fillStyle = hell ? F.kristall : F.kristallTief;
    } else {
      const v = g.createLinearGradient(...u.spitze, ...huefte);
      if (hell) {
        v.addColorStop(0, F.kristall);
        v.addColorStop(1, F.kristallTief);
      } else {
        v.addColorStop(0, F.kristallTief);
        v.addColorStop(1, mit(F.kristallTief, 0.5));
      }
      g.fillStyle = v;
    }
    g.fill();
  };
  wange(u.schulterL, u.huefteL, HELL_LINKS);
  wange(u.schulterR, u.huefteR, !HELL_LINKS);

  // Der Grat sitzt leicht auf der Lichtseite, nicht in der Mitte: eine
  // spiegelsymmetrische Figur wirkt gezeichnet, eine leicht verschobene wirkt
  // beleuchtet. Er ist zugleich das, was die Form bei kleiner Anzeige als
  // Kristall lesbar macht.
  const V = HELL_LINKS ? -1 : 1;
  zug([u.spitze, u.P(0.13 + V * 0.03, -0.10), u.P(0.09 + V * 0.03, 0.26), u.fuss,
    u.P(-0.09 + V * 0.03, 0.26), u.P(-0.13 + V * 0.03, -0.10)]);
  if (flach) {
    g.fillStyle = '#DFF9F6';
  } else {
    const grat = g.createLinearGradient(...u.spitze, ...u.fuss);
    grat.addColorStop(0, '#FFFFFF');
    grat.addColorStop(0.42, F.kristall);
    grat.addColorStop(1, mit(F.kristall, 0.75));
    g.fillStyle = grat;
  }
  g.fill();

  // Aussenkante: ein duenner heller Saum. Ohne ihn franst die Form gegen den
  // dunklen Grund aus, sobald verkleinert wird.
  zug(alle);
  g.strokeStyle = mit('#FFFFFF', 0.5);
  g.lineWidth = saumStaerke;
  g.stroke();

  return lw;
}

/** Der gebackene Schein hinter dem Kristall.
 *
 *  Regel 11 verbietet `filter: blur` zur LAUFZEIT auf Safari - hier wird er
 *  einmal beim Bauen gerechnet und ist danach ein Bild. */
export async function scheinBacken(w, h, cx, cy, breit, hoch, weiche) {
  const lw = createCanvas(w, h);
  const g = lw.getContext('2d');
  const u = umriss(cx, cy, breit, hoch);
  g.fillStyle = F.kristall;
  g.beginPath();
  g.moveTo(...u.spitze);
  for (const p of [u.schulterR, u.huefteR, u.fuss, u.huefteL, u.schulterL]) g.lineTo(...p);
  g.closePath();
  g.fill();
  return sharp(lw.toBuffer('image/png')).blur(weiche).modulate({ brightness: 1.15 })
    .png().toBuffer();
}

/** Der Bogen der Front: er gibt dem Kristall einen Boden - ohne ihn schwebt
 *  er - und bringt die zweite Farbe des Spiels ins Bild, ohne Detail. */
export function bogenZeichnen(g, mx, my, radius, staerke) {
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = mit(F.pfad, 0.20);
  g.lineWidth = staerke * 2.7;
  g.beginPath();
  g.arc(mx, my, radius, Math.PI * 1.22, Math.PI * 1.78);
  g.stroke();
  g.strokeStyle = mit(F.pfad, 0.78);
  g.lineWidth = staerke;
  g.stroke();
  g.restore();
}

/** Regel 13, an der eigenen Ausgabe: ist ueberhaupt eine FORM drauf?
 *
 *  Zwei Fragen, nicht eine. Ein Bild, das nur aus Grund besteht, hat fast
 *  dieselbe Dateigroesse und faellt sonst niemandem auf - genau so ist in
 *  v121 ein leeres Symbol durchgegangen (S136). Ein Bild, das ganz hell ist,
 *  ist ebenso falsch: dann fehlt der Grund. */
export async function formPruefen(png, name, unten, oben) {
  const px = await sharp(png).removeAlpha().raw().toBuffer();
  let hell = 0;
  for (let i = 0; i < px.length; i += 3) {
    if (px[i] * 0.30 + px[i + 1] * 0.59 + px[i + 2] * 0.11 > 110) hell++;
  }
  const anteil = hell / (px.length / 3);
  if (anteil < unten || anteil > oben) {
    console.error(`MARKE: ${name} hat ${(anteil * 100).toFixed(2)} % helle Flaeche - `
      + `erwartet werden ${(unten * 100).toFixed(1)} bis ${(oben * 100).toFixed(1)} %. `
      + 'Darunter fehlt die Figur, darueber der Grund.');
    process.exit(1);
  }
  return anteil;
}
