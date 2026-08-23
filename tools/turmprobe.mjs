#!/usr/bin/env node
/**
 * Turmprobe — ein einzelnes Bild beurteilen, bevor 38 davon abhängen.
 *
 * Der Grafik-Audit sagt seit v103, dass der große Sprung neue Bilder braucht
 * (B1, B3). Der Weg dorthin ist bisher alles oder nichts: `art/roh/` füllen,
 * `pack-art` laufen lassen, Torkette, ansehen. Das ist ein Auftrag über 38
 * Dateien, bevor irgendjemand weiß, ob die Richtung stimmt.
 *
 * Dieses Werkzeug macht daraus einen Auftrag über **eine** Datei. Es nimmt
 * einen Entwurf, behandelt ihn genau so, wie das Spiel ihn behandeln würde —
 * freistellen, einpassen, einbetten in die Farbwelt der Karte — und legt ihn
 * neben den heutigen Turm auf denselben Untergrund. Dazu die vier Zahlen, an
 * denen `npm run art` misst.
 *
 * Damit kostet ein Anlauf eine Minute statt einer Runde, und die Entscheidung
 * fällt am Bild, nicht an einer Beschreibung.
 *
 * Aufruf:
 *   npm run turmprobe -- art/entwurf.png
 *   npm run turmprobe -- art/entwurf.png --karte frostspalte
 *   npm run turmprobe                       (nur der Bestellzettel)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const datei = args.find((a) => !a.startsWith('--'));
const karteId = (() => {
  const i = args.indexOf('--karte');
  return i >= 0 ? args[i + 1] : 'spiralhain';
})();

// --- Die Vorgaben kommen aus der Spezifikation, nicht aus diesem Werkzeug.
const spec = JSON.parse(readFileSync(join(ROOT, 'art/tuerme.json'), 'utf8'));
const eintrag = spec.items.arrow_1_1;
const SOLL = {
  kante: spec.defaults.size,
  fuellung: eintrag.fill ?? spec.defaults.fill,
};

// --- Und die Bänder aus dem Zielbild (Regel 10), gelesen statt abgeschrieben.
const audit = readFileSync(join(ROOT, 'tools/artaudit.mjs'), 'utf8');
const band = (name) => {
  const t = new RegExp(`${name}: \\[([0-9.]+), ([0-9.]+)\\]`).exec(audit);
  return t ? [Number(t[1]), Number(t[2])] : null;
};
const BAND = {
  helligkeit: band('helligkeit'),
  saettigung: band('saettigung'),
  dichte: band('dichte'),
};

function bestellzettel() {
  console.log('TURMPROBE — der Bestellzettel für EIN Bild\n');
  console.log(`Datei:      art/roh/tuerme/${eintrag.file}`);
  console.log(`Maß:        ${SOLL.kante} x ${SOLL.kante}, PNG mit echtem Alpha`);
  console.log('Rand:       Nichts als die Figur. `pack-art` beschneidet auf den');
  console.log(`            Rahmen und skaliert ihn auf ${SOLL.fuellung} der Kachel - ein`);
  console.log('            verirrter Punkt in der Ecke macht den Turm also klein.');
  console.log('Ansicht:    Dreiviertel von schräg oben, wie die heutigen Türme.');
  console.log('            Dieselbe Kamerahöhe für alle - das ist der Punkt.\n');
  console.log('Was für dieses Bild gilt:');
  console.log('  - Kein Grund, kein Rahmen, KEIN eingebackener Schlagschatten.');
  console.log('    Den setzt das Spiel selbst, aus der eigenen Silhouette, nach');
  console.log('    unten rechts (LICHT in src/data/config.ts).');
  console.log('  - RUHIG gezeichnet. Das ist der ganze Auftrag: die heutigen');
  console.log('    Figuren tragen 6,0-mal so viel Feindetail wie der Untergrund');
  console.log('    (14,7 gegen 2,5), im Vorbild sind es 2,1. Weniger Krizel,');
  console.log('    größere Flächen, klarer Umriss.');
  console.log('  - Eigene Beleuchtung zurückhalten. Das Spiel legt Sonne, Boden-');
  console.log('    verschattung und das Farbklima der Karte darüber; ein Bild mit');
  console.log('    starkem eigenem Licht kämpft dagegen an.\n');
  console.log('Woran gemessen wird, wenn es da ist:');
  for (const [name, b] of Object.entries(BAND)) {
    if (b) console.log(`  ${name.padEnd(12)} ${b[0]} bis ${b[1]}`);
  }
  console.log('\nDann: npm run turmprobe -- <datei>   legt ihn neben den heutigen Turm.');
}

if (!datei) { bestellzettel(); process.exit(0); }
if (!existsSync(datei)) {
  console.error(`TURMPROBE: ${datei} gibt es nicht.\n`);
  bestellzettel();
  process.exit(1);
}

// ---------------------------------------------------------------- Messen

/** Dieselben vier Kennzahlen wie `npm run art`, an den SICHTBAREN Punkten. */
async function kennzahlen(buf) {
  const { data, info } = await sharp(buf).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let hell = 0, satt = 0, n = 0, deckend = 0;
  const grau = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3] / 255;
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const l = 0.30 * r + 0.59 * g + 0.11 * b;
    grau[p] = l;
    if (a < 0.5) continue;
    deckend++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    satt += mx > 0 ? (mx - mn) / mx : 0;
    hell += l; n++;
  }
  // Detaildichte: mittlerer Betrag des Laplace-Operators, nur innerhalb der
  // Figur - derselbe Griff wie im Grafik-Audit.
  let dichte = 0, dn = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (data[p * 4 + 3] < 128) continue;
      const lap = 4 * grau[p] - grau[p - 1] - grau[p + 1] - grau[p - w] - grau[p + w];
      dichte += Math.abs(lap) * 255; dn++;
    }
  }
  // Der Rahmen der Figur - und wie dicht sie ihn ausfuellt.
  //
  // NICHT der Anteil an der Kachel: den stellt `pack-art` selbst ein, es
  // beschneidet und skaliert auf `fill`. Der erste Entwurf dieses Werkzeugs
  // hat genau das geprueft und dem heutigen Turm 0,37 gegen ein Soll von 0,94
  // vorgehalten - eine Zahl, die der Zeichner gar nicht in der Hand hat.
  //
  // In seiner Hand liegt das Alpha. Ein verirrter Punkt in der Ecke bläht den
  // Rahmen auf, und `pack-art` skaliert dann die Figur klein, weil es den
  // Punkt mitrechnet. Deshalb hier: wie dicht liegt die Figur in ihrem
  // eigenen Rahmen?
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const rahmenB = x1 - x0 + 1, rahmenH = y1 - y0 + 1;
  return {
    helligkeit: n ? hell / n : 0,
    saettigung: n ? satt / n : 0,
    dichte: dn ? dichte / dn : 0,
    imRahmen: rahmenB > 0 ? deckend / (rahmenB * rahmenH) : 0,
    rahmen: `${rahmenB}x${rahmenH}`,
    w, h,
  };
}

const roh = readFileSync(datei);
const mass = await sharp(roh).metadata();
const k = await kennzahlen(roh);

console.log(`TURMPROBE — ${basename(datei)}\n`);
console.log(`Maß         ${mass.width} x ${mass.height}`
  + `${mass.width === SOLL.kante && mass.height === SOLL.kante ? '  ✓' : `  (Soll ${SOLL.kante} x ${SOLL.kante})`}`);
console.log(`Alpha       ${mass.hasAlpha ? 'vorhanden ✓' : 'FEHLT - ohne Alpha steht der Turm in einem Kasten'}`);

// Drei Nachkommastellen, nicht zwei. Der erste Entwurf rundete auf zwei und
// schrieb "0.33 - Band 0.33 bis 0.4 - DANEBEN": die Zahl stand scheinbar im
// Band und war doch knapp darunter. Eine Anzeige, die ihrer eigenen Aussage
// widerspricht, kostet mehr Zeit als drei Zeichen mehr.
const zeile = (name, wert, b) => {
  const ok = !b || (wert >= b[0] && wert <= b[1]);
  console.log(`${name.padEnd(14)}${wert.toFixed(3).padStart(7)}`
    + (b ? `   Band ${b[0]} bis ${b[1]}${ok ? '  ✓' : '  DANEBEN'}` : ''));
};
console.log(`Rahmen        ${k.rahmen.padStart(7)}   (was pack-art beschneidet und skaliert)`);
zeile('darin gedeckt', k.imRahmen, [0.25, 1.0]);
zeile('Helligkeit', k.helligkeit, BAND.helligkeit);
zeile('Sättigung', k.saettigung, BAND.saettigung);
zeile('Detaildichte', k.dichte, BAND.dichte);

// -------------------------------------------------------------- Ansehen
//
// Die Zahlen sagen, ob es ins Band passt. Ob es GUT aussieht, sagt nur das
// Bild (Regel 8) - und zwar auf dem Untergrund, auf dem es stehen wird, neben
// dem Turm, den es ersetzen soll.

const untergrund = (() => {
  const t = new RegExp(`'${karteId}': 'data:image/(?:webp|jpeg);base64,([^']+)'`)
    .exec(readFileSync(join(ROOT, 'src/gfx/assets/backgrounds.ts'), 'utf8'));
  return t ? Buffer.from(t[1], 'base64') : null;
})();
const heute = (() => {
  const t = /'arrow_1_1': 'data:image\/(?:webp|png);base64,([^']+)'/
    .exec(readFileSync(join(ROOT, 'src/gfx/assets/towers.ts'), 'utf8'));
  return t ? Buffer.from(t[1], 'base64') : null;
})();

if (!untergrund) {
  console.error(`\nTURMPROBE: keine Karte "${karteId}" im Bildvorrat.`);
  process.exit(1);
}

const B = 900, H = 460, TURM = 230;
const cv = createCanvas(B, H);
const g = cv.getContext('2d');
// Ein Ausschnitt der Karte, in der Groesse, in der ein Turm dort steht.
const grund = await loadImage(untergrund);
g.drawImage(grund, 300, 300, B * 1.1, H * 1.1, 0, 0, B, H);

const stellen = [[B * 0.28, H * 0.62, heute, 'heute'], [B * 0.72, H * 0.62, roh, basename(datei)]];
for (const [x, y, bild, name] of stellen) {
  if (!bild) continue;
  const img = await loadImage(bild);
  const h2 = TURM * (img.height / img.width);
  // Der Schatten, wie ihn das Spiel wirft: die eigene Silhouette, gestaucht
  // und in Lichtrichtung geschert. Ohne ihn steht der Entwurf auf einer
  // anderen Buehne als im Spiel.
  const sil = createCanvas(TURM, h2);
  const sg = sil.getContext('2d');
  sg.drawImage(img, 0, 0, TURM, h2);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = '#05070F';
  sg.fillRect(0, 0, TURM, h2);
  g.save();
  g.translate(x, y);
  g.scale(1, 0.42);
  g.transform(1, 0, -0.62 * 1.25, 1, 0, 0);
  g.globalAlpha = 0.34;
  g.drawImage(sil, -TURM / 2, -h2);
  g.restore();

  g.drawImage(img, x - TURM / 2, y - h2, TURM, h2);
  g.fillStyle = 'rgba(5,7,15,0.75)';
  g.fillRect(x - 110, y + 14, 220, 34);
  g.fillStyle = '#E8EDF7';
  g.font = '700 20px sans-serif';
  g.textAlign = 'center';
  g.fillText(name.slice(0, 22), x, y + 38);
}

const ziel = join(ROOT, 'bilder/turmprobe.png');
writeFileSync(ziel, cv.toBuffer('image/png'));
console.log(`\nBild: bilder/turmprobe.png (${karteId}, links heute, rechts der Entwurf)`);
console.log('Ansehen ist der eigentliche Test - kein Tor sagt, ob es gut aussieht.');
