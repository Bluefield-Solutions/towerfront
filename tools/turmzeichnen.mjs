#!/usr/bin/env node
/**
 * Einen Turm ZEICHNEN statt ihn zu kaufen.
 *
 * Der Grafik-Audit nennt als Befund B3 „drei Bildsprachen auf einem Bild" und
 * als B1 „die Figuren sind gerendert, nicht gezeichnet". Beide sagen dasselbe
 * über die Türme: sie stammen aus verschiedenen Sätzen, sind in verschiedenen
 * Kamerawinkeln gerendert, tragen jeder sein eigenes Licht — und sechsmal so
 * viel Feindetail wie der Boden, auf dem sie stehen.
 *
 * Der Schluss dort war: es braucht neue Bilder. Das stimmt. Der Schluss war
 * aber auch, dass die jemand malen muss — und das ist nur eine der beiden
 * Möglichkeiten. Die andere ist, sie zu **konstruieren**: aus wenigen Flächen,
 * in EINER Projektion, mit EINEM Licht, aus der Farbwelt des Spiels.
 *
 * Was das kann, was ein Kauf nicht kann:
 *
 *   - **Eine Familie.** Alle Türme, alle Stufen, alle Karten kommen aus
 *     derselben Geometrie. Es gibt keinen Ausreißer, weil es keine zweite
 *     Quelle gibt.
 *   - **Ruhe auf Ansage.** Die Detaildichte ist eine Entscheidung beim
 *     Zeichnen, keine Eigenschaft einer gekauften Datei. Das Zielband ist
 *     3 bis 6; die heutigen Türme liegen bei 18.
 *   - **Ein Licht.** Es kommt aus `LICHT` in der Konfiguration, wie bei jedem
 *     Schatten im Spiel.
 *
 * Was es NICHT kann: die Pracht eines gerenderten Bildes. Ein konstruierter
 * Turm hat keine Zierleisten, keine Rostspuren, keinen Metallglanz. Er ist
 * schlichter. Ob das ein Verlust oder ein Gewinn ist, sagt kein Tor — dafür
 * legt `npm run turmprobe` ihn neben den heutigen.
 *
 * Aufruf: npm run turmzeichnen            (schreibt art/entwurf-bogen.png)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KONF = readFileSync(join(ROOT, 'src/data/config.ts'), 'utf8');

const farbe = (name) => {
  const t = new RegExp(`${name}: '(#[0-9a-fA-F]{6})'`).exec(KONF);
  if (!t) throw new Error(`TURMZEICHNEN: Farbe "${name}" fehlt in config.ts.`);
  return t[1];
};
const LICHT_X = Number(/LICHT = \{ x: (-?[0-9.]+),/.exec(KONF)[1]);
/** Schatten nach rechts heisst Licht von links. */
const HELL_LINKS = LICHT_X > 0;

const KANTE = 256;

/** Die EINE Projektion.
 *
 *  Der ganze Punkt dieser Datei: jeder Turm, jede Stufe, jede Sorte wird aus
 *  derselben Kamera gesehen. Ein waagerechter Kreis in der Welt erscheint als
 *  Ellipse mit diesem Verhaeltnis - das ist die Kamerahoehe, und sie steht
 *  genau einmal hier.
 *
 *  0,42 entspricht rund 65 Grad ueber dem Boden. Flacher wuerde der Turm zur
 *  Seitenansicht und passte nicht mehr zum Untergrundfoto; steiler verlöre er
 *  seine Hoehe. */
const FLACH = 0.42;

/** Wieviele Toene eine Flaeche bekommt: einen.
 *
 *  Keine Verlaeufe im Koerper. Ein Verlauf ist genau das, was die
 *  Detaildichte hochtreibt, und Dichte ist hier der Auftrag. Plastik entsteht
 *  aus dem ABSTAND zwischen den Flaechen - dieselbe Lehre wie beim
 *  App-Symbol, wo zwei benachbarte Grautoene den Turm flach aussehen liessen. */
const TON = {
  // WARMER Sandstein, nicht kaltes Grau.
  //
  // Der erste Entwurf nahm die Steintoene des App-Symbols - dort stehen sie
  // auf dunkelblauem Grund und sind richtig. Auf einem warmen braunen Boden
  // ist derselbe Stein ein Kunststoffkegel: gemessen Helligkeit 0,59 gegen
  // ein Band von 0,33 bis 0,40 und Saettigung 0,20 gegen 0,35 bis 0,45.
  //
  // **Ein Farbwert traegt mit, wo er stehen soll** - dieselbe Familie wie
  // Regel 12. Diese Toene sind gegen das Band gesetzt, nicht gegen den
  // Geschmack: dunkler und deutlich waermer.
  zinne: '#A8875C',      // Zinnen, oberste Kante - faengt das Licht
  hell: '#8A6C46',       // beleuchtete Wange
  dunkel: '#4E3B27',     // Schattenwange
  tief: '#33261A',       // Sockel und Innenschatten
  dach: '#9A7B52',       // die waagerechte Plattform, von oben gesehen
  holz: '#6B4E30',       // die Waffe
  holzTief: '#48341F',
  metall: '#C8D2E4',     // Metall der Waffe
};

/** Der Akzent des Turms, GELESEN aus `src/data/towers.ts`.
 *
 *  Er ist nicht Zierrat, sondern das, was den Turm vom Boden trennt. Der
 *  zweite Entwurf war warmer Sandstein auf warmem Braun und faellt damit in
 *  genau die Falle, vor der Befund B5 des Audits warnt: die Figur liegt im
 *  Band ihres Untergrunds und ist nur noch an ihrem Saum zu erkennen.
 *
 *  Der gekaufte Turm loest das mit Blau. Dieser loest es mit seiner eigenen
 *  Akzentfarbe - und weil sie gelesen wird, gilt dieselbe Zeile fuer alle
 *  vier Sorten. */
const AKZENT = (() => {
  const t = /id: 'arrow'[\s\S]*?accent: '(#[0-9a-fA-F]{6})'/
    .exec(readFileSync(join(ROOT, 'src/data/towers.ts'), 'utf8'));
  if (!t) throw new Error('TURMZEICHNEN: Akzent des Bogenturms nicht gefunden.');
  return t[1];
})();

const g0 = () => {
  const cv = createCanvas(KANTE, KANTE);
  return [cv, cv.getContext('2d')];
};

/** Eine waagerechte Scheibe in der Projektion. */
const scheibe = (g, cx, cy, r, fuell, kante) => {
  g.beginPath();
  g.ellipse(cx, cy, r, r * FLACH, 0, 0, Math.PI * 2);
  g.fillStyle = fuell;
  g.fill();
  if (kante) { g.strokeStyle = kante; g.lineWidth = 2; g.stroke(); }
};

/** Ein Zylinderkoerper zwischen zwei Scheiben, in zwei Wangen geteilt. */
const koerper = (g, cx, oben, unten, rOben, rUnten) => {
  const V = HELL_LINKS ? -1 : 1;
  // Die Trennkante sitzt zur Schattenseite versetzt - eine mittige Kante
  // liest sich als Symmetrie, eine versetzte als Rundung.
  const teil = V * 0.18;
  const seite = (von, bis, ton) => {
    g.beginPath();
    g.moveTo(cx + rOben * von, oben);
    g.lineTo(cx + rUnten * von, unten);
    g.lineTo(cx + rUnten * bis, unten);
    g.lineTo(cx + rOben * bis, oben);
    g.closePath();
    g.fillStyle = ton;
    g.fill();
  };
  seite(-1, teil, HELL_LINKS ? TON.hell : TON.dunkel);
  seite(teil, 1, HELL_LINKS ? TON.dunkel : TON.hell);
  // Der untere Abschluss ist rund, nicht gerade.
  g.beginPath();
  g.ellipse(cx, unten, rUnten, rUnten * FLACH, 0, 0, Math.PI);
  g.fillStyle = HELL_LINKS ? TON.hell : TON.dunkel;
  g.fill();
  g.beginPath();
  g.ellipse(cx, unten, rUnten, rUnten * FLACH, 0, 0, Math.PI);
  g.fillStyle = 'rgba(0,0,0,0.10)';
  g.fill();
};

/** Zinnen auf einem Ring: erst die hinteren, dann die vorderen. */
const zinnen = (g, cx, cy, r, zahl, breite, hoehe) => {
  const punkte = [];
  for (let i = 0; i < zahl; i++) {
    const a = (i / zahl) * Math.PI * 2 - Math.PI / 2;
    punkte.push({ a, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * FLACH });
  }
  punkte.sort((p, q) => p.y - q.y);
  for (const p of punkte) {
    const vorn = Math.sin(p.a) > 0;
    const b = breite * (vorn ? 1 : 0.92);
    g.fillStyle = vorn ? TON.zinne : TON.dunkel;
    g.fillRect(p.x - b / 2, p.y - hoehe, b, hoehe + 3);
    // Nur die vorderen bekommen eine Deckflaeche - die hinteren sieht man
    // von dieser Kamera aus nicht.
    if (vorn) {
      g.fillStyle = TON.dach;
      g.beginPath();
      g.ellipse(p.x, p.y - hoehe, b / 2, b * 0.22, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
};

// ============================================================ Der Bogenturm

const [cv, g] = g0();
const CX = KANTE / 2;
const V = HELL_LINKS ? -1 : 1;

// Sockel: eine Stufe, auf der der Schaft steht. Sie gibt dem Turm Stand und
// ist die einzige Stelle, an der er breiter wird.
// Schmaler als im ersten Entwurf: mit 74 sass der Turm auf einem Teller und
// las sich als Schachfigur. Ein Turm ist hoch, nicht breit.
scheibe(g, CX, 230, 64, TON.tief);
koerper(g, CX, 214, 230, 64, 64);
scheibe(g, CX, 214, 64, TON.dach, 'rgba(20,16,10,0.35)');

// Der Schaft, nach oben leicht verjuengt.
koerper(g, CX, 96, 214, 50, 58);

// Zwei Steinfugen. Mehr nicht - jede weitere Linie ist Dichte, und Dichte ist
// hier der Auftrag.
g.strokeStyle = 'rgba(20,16,10,0.22)';
g.lineWidth = 2;
for (const [y, r] of [[142, 52], [180, 55]]) {
  g.beginPath();
  g.ellipse(CX, y, r, r * FLACH, 0, 0, Math.PI);
  g.stroke();
}

// Die Schiessscharte: das einzige Detail am Schaft, und es traegt viel.
g.fillStyle = 'rgba(14,18,28,0.72)';
{
  const b = 9, o = 128, u = 176;
  g.beginPath();
  g.moveTo(CX - b, o + b);
  g.quadraticCurveTo(CX, o - b * 0.8, CX + b, o + b);
  g.lineTo(CX + b, u); g.lineTo(CX - b, u);
  g.closePath(); g.fill();
}

// Der Kragen: die Plattform springt vor.
scheibe(g, CX, 96, 68, TON.zinne, 'rgba(20,24,36,0.35)');
koerper(g, CX, 84, 96, 68, 68);
scheibe(g, CX, 84, 68, TON.dach, 'rgba(20,24,36,0.30)');

// Ein Band aus der Akzentfarbe unter den Zinnen. Es liegt waagerecht, also
// als flacher Bogen - und es ist die eine Stelle, an der der Turm laut wird.
g.save();
g.strokeStyle = AKZENT;
g.lineWidth = 7;
g.beginPath();
g.ellipse(CX, 92, 66, 66 * FLACH, 0, 0, Math.PI);
g.stroke();
g.restore();

// Zinnen auf dem Kragen.
zinnen(g, CX, 84, 62, 9, 17, 20);

// Zwei Wimpel an den aeusseren Zinnen. Sie geben dem Umriss oben eine
// unruhige Kante - und ein Turm, dessen Silhouette oben schnurgerade endet,
// sieht abgeschnitten aus.
for (const seite of [-1, 1]) {
  g.save();
  g.translate(CX + seite * 58, 66);
  g.fillStyle = AKZENT;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(seite * 22, -8);
  g.lineTo(seite * 16, 2);
  g.lineTo(seite * 24, 12);
  g.lineTo(0, 10);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(20,16,10,0.30)';
  g.fillRect(-2, -4, 4, 22);
  g.restore();
}

// --- Die Armbrust. Sie steht auf der Plattform und sagt, was das fuer ein
// Turm ist. Bewusst gross und aus wenigen Flaechen: bei 108 Bildpunkten im
// Spiel ueberlebt nur, was mindestens vier Punkte breit ist.
{
  const bx = CX, by = 64;
  // Der Drehkranz.
  scheibe(g, bx, by + 10, 26, TON.tief);
  scheibe(g, bx, by + 6, 22, TON.dach, 'rgba(20,24,36,0.35)');
  // Der Schaft der Waffe, zur Lichtseite geneigt.
  g.save();
  g.translate(bx, by);
  g.rotate(V * 0.18);
  // Kraeftiger als im ersten Entwurf. Im Spiel ist der Turm rund 108
  // Bildpunkte breit; was dort ankommen soll, muss hier vier Punkte haben.
  // Die erste Armbrust war ein Strichmaennchen auf dem Dach.
  g.fillStyle = TON.holz;
  g.fillRect(-10, -40, 20, 54);
  g.fillStyle = TON.holzTief;
  g.fillRect(V * 3, -40, 7, 54);
  // Die Bogenarme.
  g.strokeStyle = TON.metall;
  g.lineWidth = 11;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-48, -16);
  g.quadraticCurveTo(0, -40, 48, -16);
  g.stroke();
  // Die Sehne.
  g.strokeStyle = 'rgba(30,36,50,0.75)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-45, -15); g.lineTo(0, 4); g.lineTo(45, -15);
  g.stroke();
  // Der Bolzen.
  g.fillStyle = AKZENT;
  g.beginPath();
  g.moveTo(0, -50); g.lineTo(8, -32); g.lineTo(-8, -32);
  g.closePath(); g.fill();
  g.restore();
}

// --- Der Saum. Ein duenner heller Umriss um alles, was gezeichnet wurde.
//
// Nicht als Notmassnahme wie der alte `drawRim` aus v33, sondern als Teil der
// Zeichnung: eine konstruierte Figur aus wenigen Toenen braucht eine Kante,
// sonst franst sie beim Verkleinern gegen den Boden aus.
{
  const [maske, mg] = g0();
  mg.drawImage(cv, 0, 0);
  mg.globalCompositeOperation = 'source-in';
  // Schwach, nicht kraeftig. Der erste Entwurf setzte 0,55 und machte damit
  // genau den weissen Umriss, den das Audit an `drawRim` beanstandet hat -
  // eine Notmassnahme aus v33, die zum Fehler geworden ist. Hier reicht ein
  // Hauch: die Form traegt sich selbst, sie braucht nur eine Kante gegen das
  // Ausfransen beim Verkleinern.
  mg.fillStyle = 'rgba(255,236,208,0.20)';
  mg.fillRect(0, 0, KANTE, KANTE);
  const [saum, sg] = g0();
  for (let a = 0; a < 8; a++) {
    const w = (a / 8) * Math.PI * 2;
    sg.drawImage(maske, Math.cos(w) * 2, Math.sin(w) * 2);
  }
  sg.globalCompositeOperation = 'destination-out';
  sg.drawImage(cv, 0, 0);
  g.drawImage(saum, 0, 0);
}

mkdirSync(join(ROOT, 'art'), { recursive: true });
const ziel = join(ROOT, 'art/entwurf-bogen.png');
writeFileSync(ziel, cv.toBuffer('image/png'));
console.log(`TURMZEICHNEN: art/entwurf-bogen.png (${KANTE}x${KANTE})`);
console.log('Beurteilen mit: npm run turmprobe -- art/entwurf-bogen.png');
