#!/usr/bin/env node
/**
 * App-Symbol — das Bild, das auf dem Startbildschirm steht.
 *
 * Warum als Werkzeug und nicht von Hand: das Symbol traegt die Farbwelt des
 * Spiels, und die steht in `src/data/config.ts`. Ein von Hand eingefuegter
 * Zeichenblock waere nach der naechsten Farbaenderung still falsch - dieselbe
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
 * ---
 *
 * Warum GEZEICHNET und nicht das Festungsbild aus dem Vorrat:
 *
 * Bis v122 stand hier die Kristallfestung aus `src/gfx/assets/` - ein
 * feingezeichnetes Gebaeude, auf 180 Punkte geschrumpft. Auf dem
 * Startbildschirm ist ein Symbol aber rund 60 Punkte gross, und dort war
 * davon nur noch ein blauer Fleck uebrig: kein Umriss, keine Silhouette,
 * nichts, was man im Vorbeigehen wiedererkennt. Dasselbe Bild, das im Spiel
 * ueber 200 Weltpunkte richtig ist, ist als Symbol falsch - **eine Zahl
 * traegt ihre Messstelle mit, ein Bild seine Anzeigegroesse** (Regel 12).
 *
 * Deshalb eine Form statt einer Szene: ein Kristall aus wenigen Flaechen,
 * gross, mit hartem Umriss. Gezeichnet und nicht skaliert - dann ist die
 * Kante bei jeder Groesse scharf. Die Farben kommen aus `C`, damit Symbol,
 * Statusleiste und Spiel zusammengehoeren.
 *
 * Gerechnet wird vierfach und dann verkleinert. Direkt bei 180 gezeichnet
 * werden die schraegen Facettenkanten treppig; das Verkleinern aus 720
 * glaettet sie so, wie es kein Kantenausgleich beim Zeichnen tut.
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

/** Vierfach zeichnen, dann verkleinern - siehe Kopf. */
const UEBER = 4;
const G = KANTE * UEBER;

// --- Die Farbwelt aus der Konfiguration LESEN, nicht abschreiben.
const KONF = readFileSync(join(ROOT, 'src/data/config.ts'), 'utf8');
const farbe = (name) => {
  const t = new RegExp(`${name}: '(#[0-9a-fA-F]{6})'`).exec(KONF);
  if (!t) {
    console.error(`APPSYMBOL: Farbe "${name}" steht nicht in src/data/config.ts.`);
    process.exit(1);
  }
  return t[1];
};
const VOID_TIEF = farbe('voidDeep');
const VOID_MITTE = farbe('voidMid');
const KRISTALL = farbe('crystal');
const KRISTALL_TIEF = farbe('crystalDeep');
const PFAD = farbe('path');

/** Woher faellt das Licht? Steht als einzige Stelle in `config.ts`, und
 *  `LICHT` ist die SCHATTEN-Richtung: faellt der Schatten nach rechts, kommt
 *  das Licht von links. Abgeleitet statt entschieden - sonst leuchtet das
 *  Symbol eines Tages von der anderen Seite als jede Figur im Spiel, und es
 *  faellt niemandem auf. */
const LICHT_X = (() => {
  const t = /LICHT = \{ x: (-?[0-9.]+),/.exec(KONF);
  if (!t) {
    console.error('APPSYMBOL: LICHT steht nicht in src/data/config.ts.');
    process.exit(1);
  }
  return Number(t[1]);
})();
/** Die beleuchtete Wange: bei Schatten nach rechts ist es die linke. */
const HELL_LINKS = LICHT_X > 0;

const mit = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// --------------------------------------------------------------- Der Grund
const cv = createCanvas(G, G);
const g = cv.getContext('2d');

const grund = g.createLinearGradient(0, 0, 0, G);
grund.addColorStop(0, VOID_MITTE);
grund.addColorStop(1, VOID_TIEF);
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
  const r = (0.5 + zufall() * 1.2) * UEBER;
  g.fillStyle = mit('#FFFFFF', 0.08 + zufall() * 0.22);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

// Die Front: ein knochenfarbener Bogen im unteren Drittel. Er gibt dem
// Kristall einen Boden - ohne ihn schwebt er - und bringt die zweite Farbe
// des Spiels ins Bild, ohne Detail hinzuzufuegen.
g.save();
g.strokeStyle = mit(PFAD, 0.78);
g.lineWidth = 5.5 * UEBER;
g.lineCap = 'round';
g.beginPath();
g.arc(G / 2, G * 1.30, G * 0.56, Math.PI * 1.22, Math.PI * 1.78);
g.stroke();
g.strokeStyle = mit(PFAD, 0.20);
g.lineWidth = 15 * UEBER;
g.stroke();
g.restore();

// Eine Vignette. Sie kostet nichts und sammelt den Blick in der Mitte -
// bei 60 Punkten ist das der Unterschied zwischen einer Kachel und einem Zeichen.
{
  const v = g.createRadialGradient(G / 2, G * 0.46, G * 0.18, G / 2, G * 0.5, G * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, G, G);
}

// --------------------------------------------------------- Der Kristall
//
// Auf einer EIGENEN, durchsichtigen Ebene. Der Schein muss zwischen Grund und
// Kristall liegen: darueber waere er Dunst, darunter ist er Licht. Auf einer
// gemeinsamen Leinwand ginge das nicht.
//
// Sechs Punkte, drei Flaechen: linke Wange dunkel, rechte Wange mittel, in
// der Mitte ein heller Grat. Das ist die ganze Plastik - mehr Facetten
// verschwinden bei 60 Punkten ohnehin und machen die Form nur unruhig.
const CX = G / 2, CY = G * 0.455;
const BREIT = G * 0.45, HOCH = G * 0.68;
const P = (x, y) => [CX + x * BREIT, CY + y * HOCH];

const SPITZE = P(0, -0.5);
const SCHULTER_R = P(0.5, -0.16);
const HUEFTE_R = P(0.37, 0.24);
const FUSS = P(0, 0.5);
const HUEFTE_L = P(-0.37, 0.24);
const SCHULTER_L = P(-0.5, -0.16);

const kristallLw = createCanvas(G, G);
const kg = kristallLw.getContext('2d');

const zug = (punkte) => {
  kg.beginPath();
  kg.moveTo(...punkte[0]);
  for (let i = 1; i < punkte.length; i++) kg.lineTo(...punkte[i]);
  kg.closePath();
};

// Der gebackene Schein. Regel 11 verbietet `filter: blur` zur LAUFZEIT auf
// Safari - hier wird er einmal beim Bauen gerechnet und ist danach ein Bild.
const scheinLw = createCanvas(G, G);
{
  const s = scheinLw.getContext('2d');
  s.fillStyle = KRISTALL;
  s.beginPath();
  s.moveTo(...SPITZE);
  for (const p of [SCHULTER_R, HUEFTE_R, FUSS, HUEFTE_L, SCHULTER_L]) s.lineTo(...p);
  s.closePath();
  s.fill();
}

// Die beiden Wangen - welche die helle ist, sagt die Lichtrichtung.
const wange = (schulter, huefte, hell) => {
  zug([SPITZE, schulter, huefte, FUSS]);
  const v = kg.createLinearGradient(...SPITZE, ...huefte);
  if (hell) {
    v.addColorStop(0, KRISTALL);
    v.addColorStop(1, KRISTALL_TIEF);
  } else {
    v.addColorStop(0, KRISTALL_TIEF);
    v.addColorStop(1, mit(KRISTALL_TIEF, 0.5));
  }
  kg.fillStyle = v;
  kg.fill();
};
wange(SCHULTER_L, HUEFTE_L, HELL_LINKS);
wange(SCHULTER_R, HUEFTE_R, !HELL_LINKS);

// Der Grat in der Mitte - der hellste Streifen, und das, was die Form bei
// kleiner Anzeige als Kristall lesbar macht.
// Der Grat sitzt leicht auf der Lichtseite, nicht in der Mitte: eine
// spiegelsymmetrische Figur wirkt gezeichnet, eine leicht verschobene wirkt
// beleuchtet.
const V = HELL_LINKS ? -1 : 1;
zug([SPITZE, P(0.13 + V * 0.03, -0.10), P(0.09 + V * 0.03, 0.26), FUSS,
  P(-0.09 + V * 0.03, 0.26), P(-0.13 + V * 0.03, -0.10)]);
const grat = kg.createLinearGradient(...SPITZE, ...FUSS);
grat.addColorStop(0, '#FFFFFF');
grat.addColorStop(0.42, KRISTALL);
grat.addColorStop(1, mit(KRISTALL, 0.75));
kg.fillStyle = grat;
kg.fill();

// Aussenkante: ein duenner heller Saum. Ohne ihn franst die Form gegen den
// dunklen Grund aus, sobald verkleinert wird.
zug([SPITZE, SCHULTER_R, HUEFTE_R, FUSS, HUEFTE_L, SCHULTER_L]);
kg.strokeStyle = mit('#FFFFFF', 0.5);
kg.lineWidth = 1.5 * UEBER;
kg.stroke();

// --------------------------------------------------- Zusammensetzen
//
// Der Schein wird weichgezeichnet und UNTER das Bild gelegt, nicht darueber:
// darueber waere es Dunst, darunter ist es Licht.
const scheinBild = await sharp(scheinLw.toBuffer('image/png'))
  .blur(14 * UEBER / 4)
  .modulate({ brightness: 1.15 })
  .png().toBuffer();

// Erst schichten, DANN verkleinern - und zwar in zwei getrennten Laeufen.
// `sharp` verkleinert naemlich VOR dem Zusammensetzen, ganz gleich in welcher
// Reihenfolge man es hinschreibt: in einem Zug bekaeme der schon verkleinerte
// Grund eine viermal zu grosse Ebene aufgelegt und bricht ab. Das ist keine
// Eigenart, die man sich merkt, sondern eine, die man aufschreibt.
const geschichtet = await sharp(cv.toBuffer('image/png'))
  .composite([
    // Zweimal derselbe Schein: einmal ist er zu zaghaft, um gegen den
    // dunklen Grund zu leuchten.
    { input: scheinBild, blend: 'over' },
    { input: scheinBild, blend: 'over' },
    { input: kristallLw.toBuffer('image/png'), blend: 'over' },
  ])
  .png().toBuffer();

const png = await sharp(geschichtet)
  .resize(KANTE, KANTE, { kernel: 'lanczos3' })
  .png({ compressionLevel: 9 })
  .toBuffer();

// ------------------------------------------------- Regel 13, an der Ausgabe
//
// Zwei Fragen, nicht eine. Ist ueberhaupt etwas Helles drauf - und ist es
// eine FORM? Ein Symbol, das nur aus Grund und Schein besteht, hat dieselbe
// Dateigroesse und faellt sonst niemandem auf; genau so ist in v121 ein
// leeres Symbol durchgegangen (S136). Ein Symbol, das ganz hell ist, ist
// ebenso falsch - dann fehlt der Grund.
{
  const roh = await sharp(png).removeAlpha().raw().toBuffer();
  const punkte = roh.length / 3;
  let hell = 0;
  for (let i = 0; i < roh.length; i += 3) {
    if (roh[i] * 0.30 + roh[i + 1] * 0.59 + roh[i + 2] * 0.11 > 110) hell++;
  }
  const anteil = hell / punkte;
  if (anteil < 0.04 || anteil > 0.45) {
    console.error(`APPSYMBOL: ${(anteil * 100).toFixed(1)} % helle Flaeche - erwartet `
      + 'werden 4 bis 45 %. Darunter fehlt die Figur, darueber der Grund.');
    process.exit(1);
  }
  console.log(`APPSYMBOL: ${(anteil * 100).toFixed(1)} % helle Flaeche - die Form steht.`);
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

console.log(`APPSYMBOL: ${KANTE}x${KANTE} aus ${G}x${G} verkleinert, `
  + `${(png.length / 1024).toFixed(0)} KB `
  + `(${(adresse.length / 1024).toFixed(0)} KB als Zeichenkette) in index.html geschrieben.`);
