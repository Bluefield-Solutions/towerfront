#!/usr/bin/env node
/**
 * Stilangleichung — aus gerenderten Bildern gezeichnete machen.
 *
 * Das Grafik-Audit hat fünf Befunde geliefert, und alle fünf haben dieselbe
 * Wurzel: Unsere Figuren sind **gerendert**, nicht gezeichnet. 395 Farben in
 * einem Bogenturm, 12 % reines Schwarz, fünfeinhalbmal so viel Feindetail wie
 * der Boden. Das Genre-Vorbild arbeitet mit drei bis vier Farben je Form, ohne
 * reines Schwarz und mit leicht ins Graue gedämpften Tönen.
 *
 * Neue Bilder in einem Zug zu bestellen wäre der saubere Weg, dauert aber und
 * hängt an Lieferungen. Dieser Durchgang holt das Meiste davon aus dem, was
 * schon da ist:
 *
 *  1. **Werte staffeln.** Die Helligkeit wird auf wenige Stufen zusammengelegt
 *     - das ist der Kern der Technik. Aus einem weichen Verlauf werden Flächen.
 *  2. **Schatten in der Farbe verschieben.** Ein Schatten ist nicht dasselbe
 *     in dunkler, sondern kühler. Das ist der Griff, der Anfänger- von guten
 *     Paletten trennt.
 *  3. **Schwarz anheben.** Kein reines Schwarz mehr; die dunkelste Stufe
 *     bleibt farbig.
 *  4. **Sättigung anheben.** Figuren sollen gesättigter sein als der Boden -
 *     der Blick geht zum Lautesten.
 *  5. **Umriss.** Eine geschlossene Kante, die die Form begrenzt statt sie
 *     auslaufen zu lassen.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ACHTUNG — DIESER ANSATZ IST GESCHEITERT. Nicht noch einmal versuchen.
 *
 * In drei Stärken durchprobiert und jedes Mal schlechter als das Original:
 *
 *  - Nur staffeln: fleckig statt flächig. Staffeln entfernt kein Feindetail,
 *    es macht es schmutzig - aus einem weichen Verlauf werden Inseln.
 *  - Erst glätten, dann staffeln: entfernt das Detail, aber mit ihm die Form.
 *    Aus dem Koloss wird ein brauner Klumpen.
 *  - Milde Fassung: bleibt erkennbar, sieht aber matschiger aus als vorher.
 *
 * Der Grund in einem Satz: **Ein Nachbearbeitungsschritt kann aus einem
 * fotorealistischen Rendering keine gezeichnete Grafik machen. Er kann nur
 * wegnehmen, und weggenommen wird zuerst das, was die Form trägt.**
 *
 * Der Weg führt über neue Bilder nach einer Vorschrift - siehe
 * docs/Towerfront-GRAFIK-AUDIT.md, Abschnitt 4. Die Datei bleibt hier, damit
 * niemand - auch ich nicht - denselben Umweg ein zweites Mal geht.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Aufruf:  npx tsx tools/style.mjs <eingabe.png> <ausgabe.png> [stufen]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

/** Ein Ton in HSL zerlegen und wieder zusammensetzen - für die
 *  Farbverschiebung der Schatten brauchen wir den Farbton getrennt. */
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hsl2rgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}

export async function angleichen(buffer, opt = {}) {
  const {
    stufen = 4,        // Wertstufen je Form - drei bis vier ist die Referenz
    kuehlung = 0.055,  // wie weit Schatten im Farbton wandern (Richtung Blau)
    minHell = 0.16,    // die dunkelste Stufe - nie schwarz
    maxHell = 0.86,
    saettigung = 1.35, // Figuren lauter als der Boden
    glaettung = 9,     // Medianfilter: nimmt Feindetail heraus, laesst Kanten
    weich = 1.1,       // ein Hauch Weichzeichnung gegen Treppen
    umriss = 3,
    umrissFarbe = [14, 20, 34],
  } = opt;

  // --- Erst glaetten, dann staffeln.
  //
  // Der erste Versuch hat nur gestaffelt, und das Ergebnis war fleckig statt
  // flaechig: Staffeln entfernt kein Feindetail, es macht es nur schmutzig -
  // aus einem weichen Verlauf werden Inseln. Ein Medianfilter nimmt das
  // Detail heraus und laesst die Kanten stehen, genau das, was eine
  // gezeichnete Flaeche ausmacht.
  const geglaettet = await sharp(buffer)
    .ensureAlpha()
    .median(glaettung)
    .blur(weich)
    .png()
    .toBuffer();

  const { data, info } = await sharp(geglaettet).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const out = Buffer.from(data);

  // --- Erst den Wertebereich der Figur bestimmen, dann darauf staffeln.
  //
  // Feste Schwellen würden ein dunkles Objekt in eine Stufe pressen und ein
  // helles in vier. Gestaffelt wird deshalb relativ zur eigenen Spanne.
  let lo = 1, hi = 0;
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] < 200) continue;
    const [, , l] = rgb2hsl(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (l < lo) lo = l;
    if (l > hi) hi = l;
  }
  const spanne = Math.max(0.05, hi - lo);

  for (let i = 0; i < W * H; i++) {
    const a = data[i * 4 + 3];
    if (a < 8) continue;
    const [h, s, l] = rgb2hsl(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);

    // 1. Auf Stufen legen.
    const t = (l - lo) / spanne;
    const stufe = Math.min(stufen - 1, Math.floor(t * stufen));
    const zielL = minHell + (maxHell - minHell) * (stufe / (stufen - 1));

    // 2. Schatten kühlen, Lichter wärmen - das gibt Tiefe ohne neue Farben.
    const richtung = (stufe / (stufen - 1)) - 0.5;
    let zielH = h - richtung * kuehlung;
    if (zielH < 0) zielH += 1;
    if (zielH > 1) zielH -= 1;

    // 3. Sättigung anheben, aber gedeckelt - "ein Hauch Grau" bleibt.
    const zielS = Math.min(0.62, s * saettigung + 0.04);

    const [r2, g2, b2] = hsl2rgb(zielH, zielS, zielL);
    out[i * 4] = r2; out[i * 4 + 1] = g2; out[i * 4 + 2] = b2;
  }

  const flach = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .png().toBuffer();

  if (!umriss) return flach;

  // --- Umriss: die Silhouette mehrfach versetzt unterlegen.
  //
  // Die Maske muss als eigenes Graustufenbild vorliegen, nicht als roher
  // Kanal - sonst rechnet die Bildbibliothek mit der falschen Groesse.
  const maske = await sharp(flach)
    .extractChannel('alpha')
    .toColourspace('b-w')
    .png()
    .toBuffer();
  const ring = sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  const schichten = [];
  for (let k = 0; k < 12; k++) {
    const w = (Math.PI * 2 * k) / 12;
    schichten.push({
      input: await sharp({
        create: {
          width: W, height: H, channels: 4,
          background: { r: umrissFarbe[0], g: umrissFarbe[1], b: umrissFarbe[2], alpha: 1 },
        },
      })
        .composite([{ input: maske, blend: 'dest-in' }])
        .png().toBuffer(),
      left: Math.round(Math.cos(w) * umriss),
      top: Math.round(Math.sin(w) * umriss),
      blend: 'over',
    });
  }
  return ring.composite([...schichten, { input: flach, blend: 'over' }]).png().toBuffer();
}

// --- Als Werkzeug aufgerufen
if (process.argv[1] && process.argv[1].endsWith('style.mjs')) {
  const [ein, aus, stufen] = process.argv.slice(2);
  if (!ein || !aus) {
    console.error('Aufruf: npx tsx tools/style.mjs <ein.png> <aus.png> [stufen]');
    process.exit(1);
  }
  const res = await angleichen(readFileSync(ein), stufen ? { stufen: Number(stufen) } : {});
  writeFileSync(aus, res);
  console.log(`geschrieben: ${aus}`);
}
