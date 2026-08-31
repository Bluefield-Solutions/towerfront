/** Kandidatenbilder prüfen, BEVOR sie in den Vorrat wandern.
 *
 *  **Wozu.** Eine Lieferung von 38 Bildern nachzubessern ist teuer, eines
 *  nachzubessern billig. Dieses Werkzeug misst einen Ordner mit
 *  Kandidaten gegen alles, was später ein Tor prüft - und zusätzlich gegen
 *  das eine, was kein Tor prüfen kann, weil es erst beim Zusammenspiel
 *  auffällt: **ob die Figuren sich an der FORM unterscheiden.**
 *
 *  Die Probelieferung vom 24.08.2026 hat genau das gebraucht: acht
 *  handwerklich gute Aufsichten - und sieben davon Kettenfahrzeuge, die
 *  sich nur in der Farbe unterschieden. Silhouetten-Ähnlichkeit 0,83 gegen
 *  0,49 im heutigen Bestand. Bei 17 bis 40 Bildschirmpunkten wäre daraus
 *  eine Armee von Klonen geworden, und kein einzelnes Bild wäre schuld
 *  gewesen.
 *
 *  Aufruf: npm run probebild -- <ordner>
 *
 *  Messstelle (Regel 12): **zwei**, und das ist seit v204 der Punkt.
 *
 *  Die erste ist die Kandidatendatei auf 300 Punkte längste Kante - gut, um
 *  Kandidaten untereinander zu vergleichen, und die Zahl, neben der der
 *  heutige Bestand steht.
 *
 *  Die zweite ist die **Anzeigegröße**: wie gross die Figur im Spiel
 *  wirklich gezeichnet wird. Nur dort gilt die Grenze, denn nur dort
 *  entscheidet sich, ob eine Figur ruhig aussieht. Verkleinern ERHÖHT die
 *  Dichte, und je Figur verschieden stark - gemessen an denselben acht
 *  Gegnern liegen die beiden Zahlen um den Faktor **2,0 bis 3,2**
 *  auseinander. Bis v204 stand hier nur die erste, und **ohne jede
 *  Grenze**: eine Lieferung konnte diese Abnahme bestehen und im Grafiktor
 *  durchfallen, ohne dass jemand versteht, warum. Genau das ist Befund B1,
 *  und er ist der Grund, aus dem überhaupt nachbestellt wird. */
import { readdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { umriss, ueberdeckung } from './silhouette';
// Die Umrechnung auf Anzeigegroesse steht in einer Datei, aus der auch das
// Grafik-Audit sie holt. Zwei Fassungen davon waren der Fehler (Regel 15).
import { anzeigeBreiteFuer, bildTafel } from './anzeigegroesse.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ordner = process.argv[2];
if (!ordner || !existsSync(ordner)) {
  console.error('Aufruf: npm run probebild -- <ordner mit PNG-Kandidaten>');
  process.exit(1);
}

const LICHT = /LICHT = \{ x: ([-0-9.]+), y: ([-0-9.]+) \}/
  .exec(readFileSync(join(ROOT, 'src/data/config.ts'), 'utf8'))!;
const SONNE = (Math.atan2(-Number(LICHT[2]), -Number(LICHT[1])) * 180) / Math.PI;
const winkelAbstand = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Grenzen. Jede stammt aus der Art Bible oder aus einer Messung am
 *  heutigen Bestand - keine ist geraten. */
const SCHWARZ_MAX = 0.02;      // Art Bible, Abschnitt 2
const LICHT_MAX = 20;          // Art Bible: Ziel unter 20°, Ratsche 67°
const AEHNLICH_MAX = 0.65;     // heutiger Bestand: Mittel 0,49, schlimmstes Paar 0,62
const RAND = 6;                // Punkte Luft zum Kachelrand
/** Detaildichte in Anzeigegroesse - und zwar am ROHBILD, vor dem Packen.
 *
 *  **Die Grenze des Grafiktors ist 6, hier steht 3,5, und das ist kein
 *  Widerspruch, sondern die Messstelle** (Regel 12). Das Tor misst das
 *  GEPACKTE Bild: 256 Punkte Kante, entrauscht, Schwarz angehoben, Farbe und
 *  Helligkeit nachgezogen, als WebP kodiert. Ein Kandidat liegt als 1024er
 *  vor; ihn auf Anzeigegroesse zu rechnen mittelt viel mehr weg.
 *
 *  Der Abstand ist gemessen, nicht geschaetzt - dieselben acht Gegner, beide
 *  Wege: 6,2/10,0 · 7,3/13,6 · 6,7/11,7 · 6,2/10,0 · 8,3/15,1 · 6,9/13,0 ·
 *  11,0/16,1 · 6,6/11,6. Das Packen hebt die Dichte um den Faktor **1,46 bis
 *  1,88**, im Mittel 1,72. Sechs geteilt durch 1,72 sind 3,5.
 *
 *  Was das bedeutet: unter 3,2 ist ein Kandidat sicher, ueber 3,9 sicher zu
 *  unruhig, dazwischen entscheidet das Packen. Der heutige Bestand liegt
 *  hier bei 6,2 bis 11,0 - alle acht faellen durch, und genau deshalb wird
 *  nachbestellt (Befund B1). */
const DICHTE_MAX = 3.5;

interface Mass {
  datei: string; breite: number; hoehe: number; N: number;
  hell: number; dichte: number; dichteAnzeige: number | null; schwarz: number;
  winkel: number; ab: number; staerke: number;
  maske: Uint8Array; x0: number; y0: number; x1: number; y1: number;
  quer: number; laengs: number;
}

/** Nur die Detaildichte, an einer beliebigen Kantenlaenge gemessen.
 *
 *  Dieselbe Rechnung wie in `messen`, aber ohne alles andere - sie wird ein
 *  zweites Mal gebraucht, naemlich in Anzeigegroesse. Der Nachbarunterschied
 *  INNERHALB der Figur, mal hundert. */
async function dichteBei(pfad: string, kante: number): Promise<number> {
  const { data, info } = await sharp(pfad).resize(kante, kante, { fit: 'inside' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const l = (i: number): number =>
    (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  const deckt = (x: number, y: number): boolean => data[((y * W + x) * 4) + 3] / 255 >= 0.5;
  let d = 0, n = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!deckt(x, y) || !deckt(x + 1, y) || !deckt(x, y + 1)) continue;
      const i = (y * W + x) * 4;
      d += Math.abs(l(i) - l(i + 4)) + Math.abs(l(i) - l(((y + 1) * W + x) * 4));
      n += 2;
    }
  }
  return n ? (d / n) * 100 : 0;
}

async function messen(pfad: string, datei: string): Promise<Mass | null> {
  const { data, info } = await sharp(pfad).resize(300, 300, { fit: 'inside' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const a = (i: number): number => data[i + 3] / 255;
  const l = (i: number): number =>
    (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;

  const maske = new Uint8Array(W * H);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, schwarz = 0, hs = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (a(i) < 0.5) continue;
      maske[y * W + x] = 1; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      hs += l(i);
      if (data[i] < 20 && data[i + 1] < 20 && data[i + 2] < 20) schwarz++;
    }
  }
  if (!n) return null;

  // Feindetail: mittlerer Nachbarunterschied INNERHALB der Figur.
  let d = 0, dn = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!maske[y * W + x] || !maske[y * W + x + 1] || !maske[(y + 1) * W + x]) continue;
      const i = (y * W + x) * 4;
      d += Math.abs(l(i) - l(i + 4)) + Math.abs(l(i) - l(((y + 1) * W + x) * 4));
      dn += 2;
    }
  }
  // Lichtrichtung, nur innerhalb der Figur - sonst misst man die Kante
  // gegen das Nichts.
  let gx = 0, gy = 0, gn = 0;
  for (let y = 3; y < H - 3; y++) {
    for (let x = 3; x < W - 3; x++) {
      if (!maske[y * W + x]) continue;
      if (!maske[y * W + x + 2] || !maske[y * W + x - 2]) continue;
      if (!maske[(y + 2) * W + x] || !maske[(y - 2) * W + x]) continue;
      const dx = l(((y) * W + x + 2) * 4) - l(((y) * W + x - 2) * 4);
      const dy = l(((y + 2) * W + x) * 4) - l(((y - 2) * W + x) * 4);
      if (Math.hypot(dx, dy) < 0.12) continue;
      gx += dx; gy += dy; gn++;
    }
  }
  const winkel = gn ? (Math.atan2(gy / gn, gx / gn) * 180) / Math.PI : 0;
  return {
    datei, breite: x1 - x0 + 1, hoehe: y1 - y0 + 1, N: W,
    hell: hs / n, dichte: dn ? (d / dn) * 100 : 0, dichteAnzeige: null, schwarz: schwarz / n,
    winkel, ab: winkelAbstand(winkel, SONNE), staerke: gn ? Math.hypot(gx / gn, gy / gn) : 0,
    maske, x0, y0, x1, y1, quer: x1 - x0 + 1, laengs: y1 - y0 + 1,
  };
}

// Die Silhouettenrechnung steht in `tools/silhouette.ts` - EINMAL.
//
// Bis v170 hatte dieses Werkzeug eine eigene zweite Fassung: sie rasterte
// die Maske auf 300 Punkte laengste Kante statt am vollen Bild. Gemessen
// wichen die beiden fuer dasselbe Bildpaar um 0,014 voneinander ab
// (frost_1_1 gegen frost_1_6: 0,737 hier, 0,723 dort). Klein - und genau
// die Drift, vor der Regel 15 warnt: eine Lieferung haette die Abnahme
// hier bestehen und im Tor scheitern koennen, ohne dass jemand versteht,
// warum. Jetzt heisst "aehnlich" in beiden Werkzeugen dasselbe.

// --- Messen
const dateien = readdirSync(ordner).filter((f) => /\.(png|webp|jpe?g)$/i.test(f)).sort();
if (!dateien.length) { console.error(`Keine Bilder in ${ordner}.`); process.exit(1); }

console.log(`PROBEBILD — ${dateien.length} Kandidat(en) aus ${ordner}\n`);
console.log(`  Sonne laut src/data/config.ts: ${SONNE.toFixed(0)}°\n`);
console.log('  Datei                         Format      Kasten    Schwarz  Dichte  Anzeige  Licht daneben');

const befunde: string[] = [];
const hinweise: string[] = [];
const masse: Mass[] = [];
const tafel = bildTafel();
for (const f of dateien) {
  const pfad = join(ordner, f);
  const meta = await sharp(pfad).metadata();
  const m = await messen(pfad, f);
  if (!m) { befunde.push(`${f}: kein einziger deckender Punkt.`); continue; }
  // **Und jetzt dieselbe Zahl an der Stelle, an der sie zaehlt.**
  const kante = await anzeigeBreiteFuer(f, tafel);
  m.dichteAnzeige = kante ? await dichteBei(pfad, kante) : null;
  masse.push(m);

  const quadrat = meta.width === meta.height;
  const form = `${meta.width}x${meta.height}${quadrat ? '' : ' !'}${meta.hasAlpha ? '' : ' OHNE ALPHA'}`;
  console.log(`  ${f.slice(0, 28).padEnd(29)} ${form.padEnd(11)} `
    + `${String(m.quer).padStart(3)}x${String(m.laengs).padEnd(3)} `
    + `${(m.schwarz * 100).toFixed(1).padStart(6)}%  ${m.dichte.toFixed(1).padStart(5)}  `
    + `${(m.dichteAnzeige === null ? '  —' : m.dichteAnzeige.toFixed(1)).padStart(6)}   `
    + `${m.winkel.toFixed(0).padStart(5)}° ${m.ab.toFixed(0).padStart(4)}°`);

  if (m.dichteAnzeige !== null && m.dichteAnzeige > DICHTE_MAX) {
    befunde.push(`${f}: Detaildichte ${m.dichteAnzeige.toFixed(1)} in Anzeigegröße `
      + `(${kante} Punkte am Rohbild), erlaubt sind ${DICHTE_MAX} - gepackt werden `
      + `daraus rund ${(m.dichteAnzeige * 1.72).toFixed(1)}, und das Grafiktor laesst 6 zu. `
      + 'Das ist Befund B1 - '
      + 'die Figur ist zu unruhig gezeichnet. Filtern hilft nicht, es kostet die Form '
      + '(`npm run entrauschprobe`); es braucht grössere Flächen und weniger Krizel.');
  }
  if (m.dichteAnzeige === null) {
    hinweise.push(`${f}: steht in keiner Vorratsdatei (art/*.json) - ohne Eintrag ist `
      + 'die Anzeigegröße unbekannt, und eine erfundene wäre schlimmer als keine. '
      + 'Die Dichtegrenze bleibt für dieses Bild ungeprüft.');
  }
  if (!meta.hasAlpha) befunde.push(`${f}: kein Alphakanal. Das Spiel braucht echte Freistellung.`);
  if (!quadrat) befunde.push(`${f}: nicht quadratisch (${meta.width}x${meta.height}).`);
  if (m.schwarz > SCHWARZ_MAX) {
    befunde.push(`${f}: ${(m.schwarz * 100).toFixed(1)} % reines Schwarz, erlaubt sind `
      + `${SCHWARZ_MAX * 100} %. Meist sind es ausmodellierte Ketten oder Konturlinien.`);
  }
  if (m.ab > LICHT_MAX) {
    befunde.push(`${f}: ${m.ab.toFixed(0)}° neben der Sonne (${SONNE.toFixed(0)}°). `
      + 'Eine Figur, die von woandersher beleuchtet ist, widerspricht ihrem eigenen Schatten.');
  }
  if (m.x0 < RAND || m.y0 < RAND || m.x1 > m.N - RAND || m.y1 > m.N - RAND) {
    befunde.push(`${f}: die Figur berührt den Kachelrand - beim Packen kann sie beschnitten `
      + 'werden. Mindestens ein Zwanzigstel Luft ringsum lassen.');
  }
}

// --- Die Form, und zwar im Vergleich untereinander
const norm = await Promise.all(masse.map((m) => umriss(readFileSync(join(ordner, m.datei)))));

// --- Wie voll ist das Deckrechteck?
//
// Ein aufrechter Klotz fuellt seinen Kasten fast ganz; ein Dreibein, ein
// Radfahrzeug mit Taille oder ein Laeufer mit abstehenden Beinen lassen
// viel Leerraum. Genau daran haengt, ob zwei Figuren im Umriss ueberhaupt
// auseinandergehen KOENNEN - zwei volle Rechtecke ueberdecken sich immer
// stark, ganz gleich was auf ihnen gemalt ist.
//
// **Hier steht bewusst keine Grenze.** Sie waere fuer einen Turm eine
// andere als fuer einen Spaeher, und eine erfundene gemeinsame Zahl
// verwuerfe entweder alles oder nichts (Regel 10). Die Bestellungen in der
// Art Bible tragen ihre eigene Zahl; dieses Werkzeug liefert sie.
const fuellung = norm.map((f) => f.reduce((n, v) => n + v, 0) / f.length);
if (masse.length) {
  console.log('\n  Füllung des Deckrechtecks (1,00 = volles Rechteck, '
    + 'leere Fläche = 1 minus dieser Wert):');
  for (let i = 0; i < masse.length; i++) {
    console.log(`    ${masse[i].datei.slice(0, 28).padEnd(29)} ${fuellung[i].toFixed(2)}  `
      + `leer ${((1 - fuellung[i]) * 100).toFixed(0)} %`);
  }
}
if (masse.length > 1) {
  const paare: { i: number; j: number; v: number }[] = [];
  for (let i = 0; i < norm.length; i++) {
    for (let j = i + 1; j < norm.length; j++) {
      paare.push({ i, j, v: ueberdeckung(norm[i], norm[j]) });
    }
  }
  paare.sort((a, b) => b.v - a.v);
  const mittel = paare.reduce((s, p) => s + p.v, 0) / paare.length;
  console.log(`\n  Silhouetten-Ähnlichkeit (1,00 = gleiche Form). Mittel ${mittel.toFixed(2)}, `
    + `Grenze ${AEHNLICH_MAX}:`);
  for (const p of paare.slice(0, 5)) {
    console.log(`    ${p.v.toFixed(2)}  ${masse[p.i].datei.slice(0, 24).padEnd(25)} `
      + `${masse[p.j].datei.slice(0, 24)}${p.v > AEHNLICH_MAX ? '   ZU ÄHNLICH' : ''}`);
  }
  const zuAehnlich = paare.filter((p) => p.v > AEHNLICH_MAX);
  if (zuAehnlich.length) {
    befunde.push(`${zuAehnlich.length} von ${paare.length} Paaren liegen über `
      + `${AEHNLICH_MAX} Silhouetten-Ähnlichkeit (schlimmstes ${paare[0].v.toFixed(2)}). `
      + 'Bei 17 bis 40 Bildschirmpunkten sind sie dann nur noch an der Farbe zu '
      + 'unterscheiden - und Farbe darf nie das einzige Merkmal sein.');
  }
}

// --- Und gegen den AUSGELIEFERTEN Satz.
//
// Der Vergleich untereinander allein reicht nicht, und das ist gemessen:
// die sechs Frostbilder sind untereinander zu aehnlich UND der Frostturm
// ist zugleich das schlimmste Sortenpaar mit dem Bogenturm (0,76). Eine
// Lieferung von sechs Frostbildern haette hier bestehen koennen und waere
// im Tor trotzdem gerissen - gegen eine Figur, die dieses Werkzeug gar
// nicht ansieht.
//
// Verglichen wird gegen alles, was heute gezeichnet wird: Turmbilder,
// Sockel und Gegner - aber NICHT gegen den eigenen Vorgaenger. Eine
// Lieferung `turm_frost_4.png` soll ja gerade `frost_1_4` ersetzen; dass
// die beiden sich aehneln, ist keine Auskunft. Uebersprungen wird deshalb
// jede Bestandsfigur, deren Stamm im Dateinamen des Kandidaten steckt
// (`frost_1_4` -> Stamm `frost`). Die Frage, die uebrig bleibt, ist die
// richtige: sieht die neue Figur aus wie eine ANDERE?
{
  const vorrat = new Map<string, Buffer>();
  for (const datei of ['towers.ts', 'objects.ts', 'enemies.ts']) {
    const pfad = join(ROOT, 'src/gfx/assets', datei);
    if (!existsSync(pfad)) continue;
    const quelle = readFileSync(pfad, 'utf8');
    for (const hit of quelle.matchAll(/'([^']+)':\s*'data:image\/[a-z+]+;base64,([^']+)'/g)) {
      vorrat.set(hit[1], Buffer.from(hit[2], 'base64'));
    }
  }
  if (vorrat.size) {
    const stamm = (name: string): string =>
      name.replace(/\.(png|webp|jpe?g)$/i, '').replace(/^(turm|gegner|sockel|waffe)_/, '')
        .replace(/(_\d+)+$/, '');
    const bestand: { name: string; stamm: string; form: Uint8Array }[] = [];
    for (const [name, buf] of vorrat) bestand.push({ name, stamm: stamm(name), form: await umriss(buf) });
    console.log(`\n  Gegen den ausgelieferten Satz (${bestand.length} Figuren, `
      + `ohne den eigenen Vorgänger), Grenze ${AEHNLICH_MAX}:`);
    let schlimm = 0;
    for (let i = 0; i < masse.length; i++) {
      const eigen = stamm(masse[i].datei);
      let schlimmste = { v: 0, name: '' };
      for (const b of bestand) {
        if (b.stamm === eigen) continue;   // der eigene Vorgaenger
        if (!b.stamm) continue;
        const v = ueberdeckung(norm[i], b.form);
        if (v > schlimmste.v) schlimmste = { v, name: b.name };
      }
      const reisst = schlimmste.v > AEHNLICH_MAX;
      if (reisst) schlimm++;
      console.log(`    ${masse[i].datei.slice(0, 28).padEnd(29)} `
        + `${schlimmste.v.toFixed(2)} gegen ${schlimmste.name}${reisst ? '   ZU ÄHNLICH' : ''}`);
    }
    if (schlimm) {
      befunde.push(`${schlimm} von ${masse.length} Kandidaten liegen über ${AEHNLICH_MAX} `
        + 'gegen eine Figur, die HEUTE SCHON im Spiel steht. Der Vergleich untereinander '
        + 'sagt darüber nichts - eine in sich vielfältige Lieferung kann trotzdem auf '
        + 'dem Feld mit dem Bestand verschmelzen.');
    }
  }
}

console.log('\n  Messstellen: Spalte „Dichte" an der Kandidatendatei, längste Kante auf 300 '
  + 'Punkte —\n  untereinander vergleichbar, nicht mit `npm run grafik`. Spalte „Anzeige" '
  + 'an der\n  Grösse, mit der die Figur im Spiel gezeichnet wird; NUR dort gilt die '
  + `Grenze ${DICHTE_MAX}\n  am Rohbild — das Packen hebt sie um den Faktor 1,46 bis 1,88, `
  + 'und das Grafiktor lässt danach 6 zu.');

// **Die Nullprobe der Dichtemessung** (Regel 13).
//
// Sie steht in jedem Lauf und nicht in einer Testdatei, weil eine Grenze,
// die nichts trennt, genau so aussieht wie eine bestandene Lieferung. Zwei
// gleich grosse Kacheln: eine glatte Flaeche und dieselbe mit feinem Korn.
// Faellt die zweite nicht durch, misst die Spalte nichts.
{
  const kachel = async (korn: number): Promise<number> => {
    const N = 96, roh = Buffer.alloc(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      // Ein fester Wuerfel: zwei gleiche Laeufe muessen dieselbe Zahl geben.
      const z = ((i * 1103515245 + 12345) >>> 8) % 1000 / 1000;
      const v = Math.round(128 + (z - 0.5) * korn);
      roh[i * 4] = v; roh[i * 4 + 1] = v; roh[i * 4 + 2] = v; roh[i * 4 + 3] = 255;
    }
    const datei = join(ROOT, `.probebild-nullprobe-${korn}.png`);
    await sharp(roh, { raw: { width: N, height: N, channels: 4 } }).png().toFile(datei);
    const d = await dichteBei(datei, N);
    rmSync(datei);
    return d;
  };
  const glatt = await kachel(0), koernig = await kachel(120);
  console.log(`  Nullprobe der Dichte: glatte Kachel ${glatt.toFixed(1)}, `
    + `koernige ${koernig.toFixed(1)} (Grenze ${DICHTE_MAX}).`);
  if (!(glatt < DICHTE_MAX && koernig > DICHTE_MAX)) {
    befunde.push(`Die Dichtemessung trennt nicht: glatte Kachel ${glatt.toFixed(1)}, `
      + `koernige ${koernig.toFixed(1)}, Grenze ${DICHTE_MAX}. So lange sagt die `
      + 'Spalte „Anzeige" nichts über die Kandidaten.');
  }
}

if (hinweise.length) {
  console.log('\nHinweise:');
  for (const h of hinweise) console.log(`  - ${h}`);
}

if (befunde.length) {
  console.error(`\nPROBEBILD: ${befunde.length} Befund(e)`);
  for (const b of befunde) console.error(`  - ${b}`);
  process.exit(1);
}
console.log('\nPROBEBILD: alle Kandidaten tragen.');
