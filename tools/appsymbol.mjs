#!/usr/bin/env node
/**
 * App-Symbol — das Bild, das auf dem Startbildschirm steht.
 *
 * Warum als Werkzeug und nicht von Hand: das Symbol kommt aus dem Bildvorrat
 * (dem Herzkristall), und der aendert sich. Ein von Hand eingefuegter
 * Zeichenblock waere nach dem naechsten `pack-art` still falsch - dieselbe
 * Familie, die in diesem Verzeichnis schon eine veraltete Zahl vier Runden
 * lang weitergetragen hat.
 *
 * Warum als Datenadresse im Kopf der Seite und nicht als eigene Datei:
 * Regel 0 dieses Projekts ist die EINE autarke HTML-Datei. Eine
 * `apple-touch-icon.png` daneben waere eine zweite, und wer die Datei
 * weitergibt, gaebe ein Symbol weniger weiter. Das Autarkie-Tor beanstandet
 * nur absolute Adressen, `data:` ist ihm recht.
 *
 * Warum statisch im Kopf und nicht zur Laufzeit eingehaengt: Safari liest den
 * Kopf, wenn jemand "Zum Home-Bildschirm" antippt. Ein nachtraeglich per
 * JavaScript eingesetzter Verweis wuerde vermutlich auch gelesen - aber
 * "vermutlich" ist auf einem Geraet, das ich nicht habe, kein Grund.
 *
 * Aufruf: npm run appsymbol
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 180 Punkte ist das, was iOS fuer neuere Geraete anfordert. Kleiner wird
 *  von iOS hochgerechnet und sieht weich aus. */
const KANTE = 180;

/** Wieviel Rand bleibt. iOS beschneidet das Symbol selbst zu seiner Form -
 *  wer bis an den Rand malt, verliert die Ecken. */
const SICHER = 0.72;

const objekte = readFileSync(join(ROOT, 'src/gfx/assets/objects.ts'), 'utf8');
const treffer = /'crystal': 'data:image\/webp;base64,([^']+)'/.exec(objekte);
if (!treffer) {
  console.error('APPSYMBOL: kein Kristallbild im Vorrat gefunden.');
  process.exit(1);
}

// --- Grund und Schein auf der Leinwand, der Kristall mit sharp darauf.
//
// Warum zweigeteilt: `@napi-rs/canvas` liefert fuer die eingebetteten
// WebP-Bilder zwar Breite und Hoehe und meldet `complete`, zeichnet aber
// nichts - das Symbol kam als leerer blauer Schein heraus. Aufgefallen ist
// es beim Ansehen (Regel 8), nicht an einer Kennzahl: die Datei hatte ihre
// 13 KB und sah in jeder Zahl richtig aus.
const cv = createCanvas(KANTE, KANTE);
const g = cv.getContext('2d');

// Derselbe Ton wie `theme-color` im Seitenkopf, damit Symbol und
// Statusleiste zusammengehoeren.
const grund = g.createLinearGradient(0, 0, 0, KANTE);
grund.addColorStop(0, '#141A32');
grund.addColorStop(1, '#080B18');
g.fillStyle = grund;
g.fillRect(0, 0, KANTE, KANTE);

// Ein Schein hinter dem Kristall - ohne ihn steht er als Aufkleber auf dem
// Dunkel, statt darin zu leuchten.
const schein = g.createRadialGradient(
  KANTE / 2, KANTE * 0.52, 4, KANTE / 2, KANTE * 0.52, KANTE * 0.5,
);
schein.addColorStop(0, 'rgba(120, 200, 255, 0.42)');
schein.addColorStop(1, 'rgba(120, 200, 255, 0)');
g.fillStyle = schein;
g.fillRect(0, 0, KANTE, KANTE);

const b = Math.round(KANTE * SICHER);
const kristall = await sharp(Buffer.from(treffer[1], 'base64'))
  .resize(b, b, { fit: 'inside' }).png().toBuffer();
const masse = await sharp(kristall).metadata();

const png = await sharp(cv.toBuffer('image/png'))
  .composite([{
    input: kristall,
    left: Math.round((KANTE - masse.width) / 2),
    top: Math.round(KANTE * 0.54 - masse.height / 2),
  }])
  // Mit Farbtafel gepackt: der Verlauf braucht keine 16 Millionen Farben,
  // und das Symbol reist in der einen Datei mit.
  .png({ palette: true, quality: 92 }).toBuffer();

// Regel 13, an der eigenen Ausgabe: ist der Kristall wirklich drauf?
// Ein Symbol, das nur aus Grund und Schein besteht, hat dieselbe Dateigroesse
// und faellt sonst niemandem auf.
{
  const roh = await sharp(png).raw().toBuffer();
  let hell = 0;
  for (let i = 0; i < roh.length; i += 3) if (roh[i + 2] > 150) hell++;
  if (hell < 300) {
    console.error(`APPSYMBOL: nur ${hell} helle Punkte - der Kristall ist nicht auf dem Symbol.`);
    process.exit(1);
  }
  console.log(`APPSYMBOL: ${hell} helle Punkte - der Kristall ist drauf.`);
}

const adresse = `data:image/png;base64,${png.toString('base64')}`;

// --- In den Kopf der Seite schreiben, zwischen zwei Marken.
const seite = join(ROOT, 'index.html');
let html = readFileSync(seite, 'utf8');
const AUF = '<!-- appsymbol:anfang -->';
const ZU = '<!-- appsymbol:ende -->';
const block = `${AUF}\n<link rel="apple-touch-icon" href="${adresse}" />\n${ZU}`;

if (html.includes(AUF) && html.includes(ZU)) {
  html = html.replace(new RegExp(`${AUF}[\\s\\S]*?${ZU}`), block);
} else {
  html = html.replace('</head>', `${block}\n</head>`);
}
writeFileSync(seite, html);

console.log(`APPSYMBOL: ${KANTE}x${KANTE}, ${(png.length / 1024).toFixed(0)} KB `
  + `(${(adresse.length / 1024).toFixed(0)} KB als Zeichenkette) in index.html geschrieben.`);
