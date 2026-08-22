#!/usr/bin/env node
/**
 * App-Symbol und Startbild — was iOS zeigt, bevor das Spiel da ist.
 *
 * Zwei Bilder aus einer Zeichnung: das Symbol auf dem Startbildschirm
 * (180 x 180) und das Startbild, das waehrend des Ladens steht. Der Kristall
 * selbst liegt in `tools/marke.mjs`, damit er nicht zweimal dasteht.
 *
 * Warum als Werkzeug und nicht von Hand: die Bilder tragen die Farbwelt des
 * Spiels, und die steht in `src/data/config.ts`. Ein von Hand eingefuegter
 * Zeichenblock waere nach der naechsten Farbaenderung still falsch - dieselbe
 * Familie, die in diesem Verzeichnis schon eine veraltete Zahl vier Runden
 * lang weitergetragen hat.
 *
 * Warum als Datenadressen im Kopf der Seite und nicht als eigene Dateien:
 * Regel 0 dieses Projekts ist die EINE autarke HTML-Datei. Eine
 * `apple-touch-icon.png` daneben waere eine zweite, und wer die Datei
 * weitergibt, gaebe ein Symbol weniger weiter. Das Autarkie-Tor beanstandet
 * nur absolute Adressen, `data:` ist ihm recht.
 *
 * Warum statisch im Kopf und nicht zur Laufzeit eingehaengt: Safari liest den
 * Kopf, wenn jemand "Zum Home-Bildschirm" antippt, und das Startbild sucht es
 * VOR dem ersten Bild. Ein nachtraeglich per JavaScript eingesetzter Verweis
 * kaeme fuer beides zu spaet.
 *
 * ---
 *
 * Warum GEZEICHNET und nicht das Festungsbild aus dem Vorrat:
 *
 * Bis v122 stand als Symbol die Kristallfestung aus `src/gfx/assets/` - ein
 * feingezeichnetes Gebaeude, auf 180 Punkte geschrumpft. Auf dem
 * Startbildschirm ist ein Symbol aber rund 60 Punkte gross, und dort war
 * davon nur noch ein blauer Fleck uebrig: kein Umriss, keine Silhouette,
 * nichts, was man im Vorbeigehen wiedererkennt. Dasselbe Bild, das im Spiel
 * ueber 200 Weltpunkte richtig ist, ist als Symbol falsch - **eine Zahl
 * traegt ihre Messstelle mit, ein Bild seine Anzeigegroesse** (Regel 12).
 *
 * ---
 *
 * Warum das Startbild FLACH ist und keinen Verlauf hat:
 *
 * Gemessen, nicht entschieden. Mit senkrechtem Verlauf kostet ein Startbild
 * 12 KB, flach 3,5 KB - ueber zehn Geraetegroessen also 120 KB gegen 35 KB.
 * Ein Verlauf ueber 2500 Zeilen laesst sich nicht in eine Farbtafel packen,
 * eine Flaeche schon. Den Unterschied zahlt jeder Ladevorgang, auch am
 * Schreibtisch, wo es gar kein Startbild gibt. Das Symbol behaelt seinen
 * Verlauf: es ist 180 Punkte gross, dort kostet er nichts.
 *
 * Aufruf: npm run appsymbol
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import {
  F, mit, kristallZeichnen, turmZeichnen, scheinBacken, bogenZeichnen, formPruefen,
} from './marke.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ============================================================== Das Symbol

/** 180 Punkte ist das, was iOS fuer neuere Geraete anfordert. Kleiner wird
 *  von iOS hochgerechnet und sieht weich aus. */
const KANTE = 180;

/** Vierfach zeichnen, dann verkleinern. Direkt bei 180 gezeichnet werden die
 *  schraegen Facettenkanten treppig; das Verkleinern aus 720 glaettet sie so,
 *  wie es kein Kantenausgleich beim Zeichnen tut. */
const UEBER = 4;

async function symbolBauen() {
  const G = KANTE * UEBER;
  const cv = createCanvas(G, G);
  const g = cv.getContext('2d');

  const grund = g.createLinearGradient(0, 0, 0, G);
  grund.addColorStop(0, F.voidMitte);
  grund.addColorStop(1, F.voidTief);
  g.fillStyle = grund;
  g.fillRect(0, 0, G, G);

  // Ein paar Sterne, wie auf der Landkarte. Feste Folge, damit zwei Laeufe
  // dasselbe Symbol ergeben - ein Symbol, das bei jedem Bau anders aussieht,
  // waere im Verzeichnis ein staendiger Unterschied ohne Aussage.
  let saat = 20250822;
  const zufall = () => {
    saat = (saat * 1103515245 + 12345) & 0x7fffffff;
    return saat / 0x7fffffff;
  };
  for (let i = 0; i < 40; i++) {
    const x = zufall() * G, y = zufall() * G * 0.8;
    g.fillStyle = mit('#FFFFFF', 0.08 + zufall() * 0.22);
    g.beginPath(); g.arc(x, y, (0.5 + zufall() * 1.2) * UEBER, 0, Math.PI * 2); g.fill();
  }

  bogenZeichnen(g, G / 2, G * 1.42, G * 0.62, 5.0 * UEBER);

  // Eine Vignette. Sie kostet nichts und sammelt den Blick in der Mitte - bei
  // 60 Punkten ist das der Unterschied zwischen einer Kachel und einem Zeichen.
  {
    const v = g.createRadialGradient(G / 2, G * 0.46, G * 0.18, G / 2, G * 0.5, G * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = v;
    g.fillRect(0, 0, G, G);
  }

  // Der Turm unten, der Kristall darueber - er schwebt ueber den Zinnen und
  // ist das, was der Turm haelt.
  const CX = G / 2;
  const TURM_Y = G * 0.605, TURM_B = G * 0.66, TURM_H = G * 0.62;
  const KRIS_Y = G * 0.255, KRIS_B = G * 0.27, KRIS_H = G * 0.32;

  const schein = await scheinBacken(G, G, CX, KRIS_Y, KRIS_B * 1.5, KRIS_H * 1.5,
    16 * UEBER / 4);
  const turm = turmZeichnen(G, G, CX, TURM_Y, TURM_B, TURM_H);
  const kristall = kristallZeichnen(G, G, CX, KRIS_Y, KRIS_B, KRIS_H, 1.4 * UEBER);

  // Erst schichten, DANN verkleinern - und zwar in zwei getrennten Laeufen.
  // `sharp` verkleinert naemlich VOR dem Zusammensetzen, ganz gleich in
  // welcher Reihenfolge man es hinschreibt: in einem Zug bekaeme der schon
  // verkleinerte Grund eine viermal zu grosse Ebene aufgelegt und bricht ab.
  // Das ist keine Eigenart, die man sich merkt, sondern eine, die man
  // aufschreibt.
  const geschichtet = await sharp(cv.toBuffer('image/png'))
    .composite([
      // Zweimal derselbe Schein: einmal ist er zu zaghaft gegen das Dunkel.
      // Der Schein liegt UNTER dem Turm: so leuchtet der Kristall auf die
      // Zinnen und nicht durch sie hindurch.
      { input: schein, blend: 'over' },
      { input: schein, blend: 'over' },
      { input: turm.toBuffer('image/png'), blend: 'over' },
      { input: kristall.toBuffer('image/png'), blend: 'over' },
    ])
    .png().toBuffer();

  return sharp(geschichtet)
    .resize(KANTE, KANTE, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ========================================================== Die Startbilder

/** Die iPhone-Groessen, die es heute in Stueckzahlen gibt.
 *
 *  Aeltere stehen NICHT hier. Sie bekommen dann das, was sie heute schon
 *  bekommen - iOS faellt auf seinen eigenen Grund zurueck. Kein Rueckschritt,
 *  nur kein Fortschritt, und jede Zeile kostet 4 KB in jeder Datei.
 *
 *  Nur hochkant: der Startbildschirm des iPhones steht hochkant, von dort
 *  wird getippt. Quer noch einmal dieselben zehn Bilder waere die doppelte
 *  Rechnung fuer den selteneren Fall. */
const GERAETE = [
  ['SE 2/3, 8', 375, 667, 2],
  ['XR, 11', 414, 896, 2],
  ['X, XS, 11 Pro, 12/13 mini', 375, 812, 3],
  ['XS Max, 11 Pro Max', 414, 896, 3],
  ['12, 13, 14, 12/13 Pro', 390, 844, 3],
  ['12/13 Pro Max, 14 Plus', 428, 926, 3],
  ['14 Pro, 15, 15 Pro, 16', 393, 852, 3],
  ['14 Pro Max, 15 Plus, 16 Plus', 430, 932, 3],
  ['16 Pro', 402, 874, 3],
  ['16 Pro Max', 440, 956, 3],
];

async function startbildBauen(w, h) {
  const cv = createCanvas(w, h);
  const g = cv.getContext('2d');

  // Flach, siehe Kopf: der Verlauf kostet hier das Dreifache.
  g.fillStyle = F.voidTief;
  g.fillRect(0, 0, w, h);

  const kurz = Math.min(w, h);
  const CX = w / 2, CY = h * 0.46;
  const BREIT = kurz * 0.30, HOCH = kurz * 0.46;

  // Kein Bogen und kein Schein. Beide sind weiche Flaechen ueber viel Raum,
  // und genau das kostet: der Bogen 1,8 KB je Bild, der Schein 3. Ueber zehn
  // Geraetegroessen sind das 48 KB fuer zwei Dinge, die auf einem hohen
  // Startbild kaum zu sehen sind. Auf dem Symbol bleiben beide - dort ist die
  // Flaeche klein und der Preis null.

  // Der Schriftzug. Er steht hier und nicht auf dem Symbol: unter dem Symbol
  // steht der Name ohnehin schon, auf dem Startbild steht sonst nichts.
  //
  // In der KRISTALLFARBE, und zwar absichtlich. Der erste Entwurf setzte ihn
  // in Steingrau - bei acht Farben warf die Quantisierung das Grau weg und
  // bildete ihn auf den Kristallton ab. Das Ergebnis sah gut aus, war aber
  // nicht gewaehlt, sondern uebriggeblieben. Das Grau zu behalten kostet
  // zwoelf Farben und 29 KB; die Kristallfarbe ist die Akzentfarbe des Spiels
  // und kostet nichts. Also wird sie gezeichnet, statt zu entstehen.
  g.fillStyle = mit(F.kristall, 0.92);
  g.font = `700 ${Math.round(kurz * 0.058)}px sans-serif`;
  g.textAlign = 'center';
  // Unter den Turmfuss, nicht hinein. Der erste Anlauf rechnete den Abstand
  // vom Kristall aus - dann stand die Schrift mitten im Mauerwerk, seit der
  // Turm dazugekommen ist. Jetzt haengt sie am Fuss des Turms, also an dem,
  // was wirklich darueber steht.
  const turmFuss = CY + HOCH * 0.30 + HOCH * 0.95 * 0.5;
  g.fillText('TOWERFRONT', CX, turmFuss + kurz * 0.11);

  // Dieselbe Marke wie auf dem Symbol - Turm mit Kristall darueber. Zwei
  // verschiedene Zeichen fuer dieselbe App waeren eines zu viel: man tippt
  // auf einen Turm und bekommt einen Edelstein zu sehen.
  const turm = turmZeichnen(w, h, CX, CY + HOCH * 0.30, BREIT * 1.45, HOCH * 0.95, true);
  const kristall = kristallZeichnen(
    w, h, CX, CY - HOCH * 0.34, BREIT * 0.62, HOCH * 0.50,
    Math.max(2, kurz * 0.004), true,
  );

  return sharp(cv.toBuffer('image/png'))
    .composite([
      { input: turm.toBuffer('image/png'), blend: 'over' },
      { input: kristall.toBuffer('image/png'), blend: 'over' },
    ])
    // Acht Farben, kein Rauschen. Eine flach schattierte Figur braucht nicht
    // mehr, und das ist der Unterschied zwischen 6 und 26 KB je Bild.
    //
    // Die Quantisierung greift NUR ohne Alphakanal: mit Alpha liefert `sharp`
    // stillschweigend dasselbe Bild zurueck, ganz gleich welche Farbzahl
    // dasteht. Das hat beim Bau dieser Datei eine Messung verdorben - 48 und
    // 16 Farben ergaben aufs Byte dieselbe Groesse, und das sah aus, als
    // wirkte die Farbtafel gar nicht.
    .removeAlpha()
    .png({ palette: true, dither: 0, colours: 8, compressionLevel: 9 })
    .toBuffer();
}

// ================================================================ Ausfuehren

const symbol = await symbolBauen();
const symbolAnteil = await formPruefen(symbol, 'Das Symbol', 0.04, 0.45);
console.log(`APPSYMBOL: Symbol ${KANTE}x${KANTE} aus ${KANTE * UEBER}x${KANTE * UEBER} `
  + `verkleinert, ${(symbol.length / 1024).toFixed(0)} KB, `
  + `${(symbolAnteil * 100).toFixed(1)} % helle Flaeche.`);

const zeilen = [
  `<link rel="apple-touch-icon" href="data:image/png;base64,${symbol.toString('base64')}" />`,
];
let summe = symbol.length;

for (const [name, cw, ch, d] of GERAETE) {
  const w = cw * d, h = ch * d;
  const bild = await startbildBauen(w, h);
  // Auf einem Startbild ist die Figur klein - der Grund ist fast alles.
  // Deshalb ein anderes Band als beim Symbol, und ein enges: waere es weit,
  // bewiese es nichts (Regel 13).
  const anteil = await formPruefen(bild, `Startbild ${w}x${h}`, 0.004, 0.10);
  summe += bild.length;
  zeilen.push(
    '<link rel="apple-touch-startup-image"'
    + ` media="(device-width: ${cw}px) and (device-height: ${ch}px)`
    + ` and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)"`
    + ` href="data:image/png;base64,${bild.toString('base64')}" />`,
  );
  console.log(`  ${String(w).padStart(4)}x${String(ch * d).padEnd(4)} `
    + `${(bild.length / 1024).toFixed(1)} KB  ${(anteil * 100).toFixed(2)} %  ${name}`);
}

// --- In den Kopf der Seite schreiben, zwischen zwei Marken.
const seite = join(ROOT, 'index.html');
let html = readFileSync(seite, 'utf8');
const AUF = '<!-- appsymbol:anfang -->';
const ZU = '<!-- appsymbol:ende -->';
const block = `${AUF}\n${zeilen.join('\n')}\n${ZU}`;

if (html.includes(AUF) && html.includes(ZU)) {
  html = html.replace(new RegExp(`${AUF}[\\s\\S]*?${ZU}`), block);
} else {
  html = html.replace('</head>', `${block}\n</head>`);
}
writeFileSync(seite, html);

console.log(`\nAPPSYMBOL: 1 Symbol + ${GERAETE.length} Startbilder, `
  + `${(summe / 1024).toFixed(0)} KB roh, `
  + `${(zeilen.join('').length / 1024).toFixed(0)} KB als Zeichenkette in index.html.`);
