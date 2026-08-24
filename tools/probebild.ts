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
 *  Messstelle (Regel 12): die Kandidatendatei selbst, auf 300 Punkte
 *  längste Kante gebracht. Das ist NICHT die Anzeigegröße - die Zahlen
 *  sind untereinander vergleichbar, aber nicht mit denen aus
 *  `npm run grafik`, das in Anzeigegröße misst. Verkleinern erhöht die
 *  Dichte. Deshalb steht daneben immer der heutige Bestand, an derselben
 *  Messstelle gerechnet. */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

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

interface Mass {
  datei: string; breite: number; hoehe: number; N: number;
  hell: number; dichte: number; schwarz: number;
  winkel: number; ab: number; staerke: number;
  maske: Uint8Array; x0: number; y0: number; x1: number; y1: number;
  quer: number; laengs: number;
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
    hell: hs / n, dichte: dn ? (d / dn) * 100 : 0, schwarz: schwarz / n,
    winkel, ab: winkelAbstand(winkel, SONNE), staerke: gn ? Math.hypot(gx / gn, gy / gn) : 0,
    maske, x0, y0, x1, y1, quer: x1 - x0 + 1, laengs: y1 - y0 + 1,
  };
}

/** Die Silhouette auf ein 64er Raster normieren - Größe und Lage fallen
 *  heraus, die FORM bleibt. Zwei Panzer, die sich nur in der Farbe
 *  unterscheiden, kommen so auf über 0,9. */
function normieren(m: Mass): Uint8Array {
  const N = 64, out = new Uint8Array(N * N);
  const bw = m.x1 - m.x0 + 1, bh = m.y1 - m.y0 + 1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const sx = m.x0 + Math.floor((x * bw) / N);
      const sy = m.y0 + Math.floor((y * bh) / N);
      out[y * N + x] = m.maske[sy * m.N + sx];
    }
  }
  return out;
}
const ueberdeckung = (a: Uint8Array, b: Uint8Array): number => {
  let und = 0, oder = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] && b[k]) und++;
    if (a[k] || b[k]) oder++;
  }
  return oder ? und / oder : 1;
};

// --- Messen
const dateien = readdirSync(ordner).filter((f) => /\.(png|webp|jpe?g)$/i.test(f)).sort();
if (!dateien.length) { console.error(`Keine Bilder in ${ordner}.`); process.exit(1); }

console.log(`PROBEBILD — ${dateien.length} Kandidat(en) aus ${ordner}\n`);
console.log(`  Sonne laut src/data/config.ts: ${SONNE.toFixed(0)}°\n`);
console.log('  Datei                         Format      Kasten    Schwarz  Dichte  Licht daneben');

const befunde: string[] = [];
const masse: Mass[] = [];
for (const f of dateien) {
  const pfad = join(ordner, f);
  const meta = await sharp(pfad).metadata();
  const m = await messen(pfad, f);
  if (!m) { befunde.push(`${f}: kein einziger deckender Punkt.`); continue; }
  masse.push(m);

  const quadrat = meta.width === meta.height;
  const form = `${meta.width}x${meta.height}${quadrat ? '' : ' !'}${meta.hasAlpha ? '' : ' OHNE ALPHA'}`;
  console.log(`  ${f.slice(0, 28).padEnd(29)} ${form.padEnd(11)} `
    + `${String(m.quer).padStart(3)}x${String(m.laengs).padEnd(3)} `
    + `${(m.schwarz * 100).toFixed(1).padStart(6)}%  ${m.dichte.toFixed(1).padStart(5)}  `
    + `${m.winkel.toFixed(0).padStart(5)}° ${m.ab.toFixed(0).padStart(4)}°`);

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
if (masse.length > 1) {
  const norm = masse.map(normieren);
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

console.log('\n  Messstelle: Kandidatendatei, längste Kante auf 300 Punkte. NICHT die '
  + 'Anzeigegröße —\n  die Zahlen sind untereinander vergleichbar, nicht mit `npm run grafik`.');

if (befunde.length) {
  console.error(`\nPROBEBILD: ${befunde.length} Befund(e)`);
  for (const b of befunde) console.error(`  - ${b}`);
  process.exit(1);
}
console.log('\nPROBEBILD: alle Kandidaten tragen.');
