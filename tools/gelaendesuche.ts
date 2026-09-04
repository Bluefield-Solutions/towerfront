/**
 * Wo hat der Maler das Unwegsame hingelegt?
 *
 * **Die Luecke.** `map.rough` sind Bausperren, von Hand gesetzt - das sagt
 * schon `tools/gelaende.mjs`, und es warnt zu Recht davor, ihnen eine Natur
 * anzudichten. Solange das Bild die Sperren MITBRINGT, ist das eine
 * Einbahnstrasse: die Zahl steht in `maps.ts`, der Maler bekommt sie als
 * Ring auf dem Referenzblatt, und er trifft sie ungefaehr.
 *
 * Beim ersten Bild nach Abschnitt 8c war "ungefaehr" nicht genug: fuenf der
 * acht Flecken lagen 100 bis 170 Weltpunkte neben ihrem Ring, drei hatten im
 * Bild gar kein Gegenstueck, und einer war unter die Zielplattform gerutscht.
 * `npm run gelaendetor` meldete zehn Befunde - richtig, aber ohne zu sagen,
 * wohin die Kreise gehoeren.
 *
 * Dieses Werkzeug dreht die Richtung um: es liest die Flecken AUS DEM BILD
 * und schreibt einen Block zum Hineinkopieren. Dieselbe Bewegung wie bei
 * `npm run zielplatte` - eine abgelesene Zahl waere nach dem naechsten
 * `pack-art` still falsch.
 *
 * **Verfahren.** Der begehbare Boden ist die haeufigste Farbe der Karte
 * (Median je Kanal, robust gegen grosse Flecken). Alles, was weit genug davon
 * weg ist, ist Kandidat; zusammenhaengende Gebiete werden eingesammelt und
 * durch einen Kreis ersetzt - Mittelpunkt aus dem Schwerpunkt, Radius aus der
 * Flaeche. Ausgelassen wird, was auf der Bahn liegt (dort baut ohnehin
 * niemand) und was auf der Zielplattform liegt (die ist bestellt, kein
 * Hindernis).
 *
 * Die Art und die Farbe werden mit DERSELBEN Rechnung bestimmt wie im Tor -
 * eine zweite Fassung davon waere Regel 15 an genau der Stelle, an der
 * abgenommen wird.
 *
 * Aufruf: npm run gelaendesuche -- spiralhain [--zahl 8] [--mindest 25]
 *
 * Messstelle (Regel 12): gepacktes Untergrundbild auf 480 Punkte Breite,
 * Weltmass 1920 x 1080, Kreisinneres bis 0,8 r wie im Tor.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { MAPS, lanePaths, goalOf } from '../src/data/maps';
import { MAP_BACKGROUNDS } from '../src/gfx/assets/backgrounds';
import { WORLD_W as WELT_B, WORLD_H as WELT_H } from '../src/data/config';

const N = 480, H = Math.round(N * WELT_H / WELT_B);
/** Dieselben Schwellen wie in `tools/gelaende.mjs`. */
const HART_AB = 0.06, KALT_AB = 0.07;

const arg = (name: string, standard: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : standard;
};
const ZAHL = arg('--zahl', 8);
const MINDEST = arg('--mindest', 25);
/** **Es gibt hier keine Zahl, die entscheidet - und das ist gemessen.**
 *
 *  Drei Kriterien wurden durchprobiert, um "Felsfeld" von "Schattenfleck im
 *  Gras" zu trennen: die Groesse (die drei falschen lagen mitten unter den
 *  richtigen), die Abhebung gegen den Ring drumherum (echte Hindernisse
 *  0,028 bis 0,063, Grasflecken 0,020 bis 0,062 - keine Luecke) und die
 *  Streuung im Inneren (0,027 bis 0,069 gegen 0,041 bis 0,056 - wieder
 *  keine). Das gepackte Bild ist dafuer zu dunkel; im Dickicht ist so wenig
 *  Kontrast wie im Grasschatten.
 *
 *  Also entscheidet der Blick, und das Werkzeug legt ihn vor: es schreibt
 *  `bilder/gelaendesuche-<id>.png`, eine Kachel je Vorschlag. Drei
 *  Grasflecken darin sind in einer Sekunde zu sehen. Genau dafuer steht
 *  Regel 8 da - kein Tor ersetzt den Blick.
 *
 *  Beide Zahlen stehen trotzdem hinter jedem Vorschlag: wer sie eines Tages
 *  doch trennen kann, sieht hier, woran es lag. */
void 0;
const kartenId = process.argv.slice(2).find((a) => !a.startsWith('--')
  && !/^\d+$/.test(a));

const m = MAPS.find((q) => q.id === kartenId);
if (!m) {
  console.error(`GELAENDESUCHE: Karte "${kartenId}" gibt es nicht. `
    + `Bekannt: ${MAPS.map((q) => q.id).join(', ')}`);
  process.exit(1);
}
const roh = (MAP_BACKGROUNDS as Record<string, string>)[m.id];
if (!roh) { console.error(`GELAENDESUCHE: ${m.id} hat kein Kartenbild.`); process.exit(1); }

const { data } = await sharp(Buffer.from(roh.split(',')[1], 'base64'))
  .resize(N, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

const farbe = (i: number): number[] => [data[i * 3] / 255, data[i * 3 + 1] / 255, data[i * 3 + 2] / 255];

// --- Der begehbare Boden: Median je Kanal.
//
// Nicht das Mittel. Das Mittel wandert mit den Flecken mit - je mehr
// Unwegsames im Bild, desto weiter zieht es die Bezugsfarbe zu ihnen hin, und
// am Ende misst man den Abstand der Flecken zu sich selbst.
const median = (kanal: number): number => {
  const v: number[] = [];
  for (let i = 0; i < N * H; i++) v.push(data[i * 3 + kanal]);
  v.sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)] / 255;
};
const bod = [median(0), median(1), median(2)];

// Die Schwelle aus dem Bild, nicht gesetzt (Regel 2): das obere Viertel der
// Abstaende zum Boden. Auf einer ruhigen Karte ist sie klein, auf einer
// unruhigen gross - und in beiden Faellen trennt sie ein Viertel ab.
const abst: number[] = [];
for (let i = 0; i < N * H; i++) {
  const c = farbe(i);
  abst.push(Math.hypot(c[0] - bod[0], c[1] - bod[1], c[2] - bod[2]));
}
const sortiert = [...abst].sort((a, b) => a - b);
const SCHWELLE = sortiert[Math.floor(sortiert.length * 0.75)];

const bahnen = lanePaths(m);
const ziel = goalOf(m);

// --- Zusammenhaengende Gebiete einsammeln.
const marke = new Int32Array(N * H).fill(-1);
const gebiete: { punkte: number[] }[] = [];
for (let start = 0; start < N * H; start++) {
  if (marke[start] >= 0 || abst[start] < SCHWELLE) continue;
  const id = gebiete.length;
  const punkte: number[] = [];
  const stapel = [start];
  marke[start] = id;
  while (stapel.length) {
    const p = stapel.pop()!;
    punkte.push(p);
    const x = p % N, y = (p / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= H) continue;
      const q = ny * N + nx;
      if (marke[q] >= 0 || abst[q] < SCHWELLE) continue;
      marke[q] = id; stapel.push(q);
    }
  }
  gebiete.push({ punkte });
}

// --- Jedes Gebiet durch einen Kreis ersetzen.
const k = N / WELT_B;
interface Fleck { x: number; y: number; r: number; art: string; farbe: string;
  flaeche: number; abhebung: number; streuung: number }

/** Mittelwert ueber einen Kreisring (oder die Scheibe, wenn `von` 0 ist). */
function ringMittel(cx: number, cy: number, von: number, bis: number): number[] | null {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = Math.max(0, Math.floor(cy - bis)); y <= Math.min(H - 1, Math.ceil(cy + bis)); y++)
    for (let x = Math.max(0, Math.floor(cx - bis)); x <= Math.min(N - 1, Math.ceil(cx + bis)); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < von || d > bis) continue;
      const c = farbe(y * N + x); r += c[0]; g += c[1]; b += c[2]; n++;
    }
  return n ? [r / n, g / n, b / n] : null;
}
const flecken: Fleck[] = [];
// Kartenmittel fuer die Art - wie im Tor.
let mr = 0, mg = 0, mb = 0;
for (let i = 0; i < N * H; i++) { const c = farbe(i); mr += c[0]; mg += c[1]; mb += c[2]; }
mr /= N * H; mg /= N * H; mb /= N * H;
const kartenHell = (mr + mg + mb) / 3;
const kartenBlau = mb - (mr + mg) / 2;
const kartenKalt = kartenBlau > 0.02;

for (const g of gebiete) {
  let sx = 0, sy = 0;
  for (const p of g.punkte) { sx += p % N; sy += (p / N) | 0; }
  const cx = sx / g.punkte.length, cy = sy / g.punkte.length;
  // Radius aus der Flaeche - ein Kreis gleicher Groesse, nicht der
  // umschliessende: der waere bei einem gezackten Dickicht viel zu gross.
  const rp = Math.sqrt(g.punkte.length / Math.PI);
  const wx = cx / k, wy = cy / k, wr = rp / k;
  if (wr < MINDEST) continue;
  // Auf der Bahn liegt keine Bausperre - dort baut ohnehin niemand, und ein
  // Kreis dort verdeckt nur den Weg.
  let aufBahn = false;
  for (const p of bahnen) if (p.distanceTo(wx, wy) < wr) { aufBahn = true; break; }
  if (aufBahn) continue;
  // Und die Zielplattform ist bestellt, kein Hindernis.
  if (Math.hypot(wx - ziel.x, wy - ziel.y) < 170 + wr) continue;

  // Farbe und Art wie im Tor: Kreisinneres bis 0,8 r.
  const innen = ringMittel(cx, cy, 0, rp * 0.8);
  if (!innen) continue;
  const [fr, fg, fb] = innen;

  // **Und hebt sich der Fleck ueberhaupt ab?**
  //
  // Das ist der Unterschied zwischen einem Felsfeld und einem Schattenfleck
  // im Gras, und ohne ihn ist er nicht zu machen: der erste Entwurf hier
  // nahm die acht groessten Gebiete ueber der Farbschwelle und legte drei
  // davon auf blanke Wiese. `npm run gelaendetor` meldete gruen dazu - es
  // prueft die EINTRAGUNG gegen das Bild, nicht, ob im Bild etwas steht.
  //
  // Dieselbe Rechnung wie in `npm run zielplatte`: innen gegen den Ring
  // drumherum. Ein Hindernis ist innen anders als aussen; ein Schattenfleck
  // geht in seine Umgebung ueber.
  const aussen = ringMittel(cx, cy, rp * 1.15, rp * 1.45);
  if (!aussen) continue;
  const abhebung = Math.hypot(fr - aussen[0], fg - aussen[1], fb - aussen[2]);
  let sq = 0, sn = 0;
  const rs = rp * 0.8;
  for (let y = Math.max(0, Math.floor(cy - rs)); y <= Math.min(H - 1, Math.ceil(cy + rs)); y++)
    for (let x = Math.max(0, Math.floor(cx - rs)); x <= Math.min(N - 1, Math.ceil(cx + rs)); x++) {
      if (Math.hypot(x - cx, y - cy) > rs) continue;
      const c = farbe(y * N + x);
      sq += (c[0] - fr) ** 2 + (c[1] - fg) ** 2 + (c[2] - fb) ** 2; sn += 3;
    }
  const streuung = Math.sqrt(sq / sn);
  const dHell = (fr + fg + fb) / 3 - kartenHell;
  const dBlau = (fb - (fr + fg) / 2) - kartenBlau;
  const art = dHell > HART_AB ? 'hart' : (kartenKalt && dBlau > KALT_AB ? 'kalt' : 'locker');
  const hex = '#' + [fr, fg, fb]
    .map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('');
  flecken.push({ x: Math.round(wx), y: Math.round(wy), r: Math.round(wr), art, farbe: hex,
    flaeche: g.punkte.length, abhebung, streuung });
}

flecken.sort((a, b) => b.r - a.r);
const nimm = flecken.slice(0, ZAHL);

console.log(`GELAENDESUCHE — ${m.name}\n`);
console.log(`  Boden (Median) rgb ${bod.map((v) => Math.round(v * 255)).join(',')}`
  + `   Schwelle ${SCHWELLE.toFixed(3)} (oberes Viertel der Abstaende)`);
console.log(`  ${gebiete.length} zusammenhaengende Gebiete, ${flecken.length} davon `
  + `mindestens ${MINDEST} Weltpunkte gross und frei von Bahn und Platte.\n`);

const alt = m.rough.reduce((a, f) => a + Math.PI * f.r * f.r, 0);
const neu = nimm.reduce((a, f) => a + Math.PI * f.r * f.r, 0);
console.log(`  Eingetragen heute: ${m.rough.length} Flecken, `
  + `${(alt / (WELT_B * WELT_H) * 100).toFixed(1)} % der Karte.`);
console.log(`  Im Bild gefunden:  ${nimm.length} Flecken, `
  + `${(neu / (WELT_B * WELT_H) * 100).toFixed(1)} % der Karte.\n`);

// --- Der Kontaktbogen: eine Kachel je Vorschlag, in der Reihenfolge unten.
const KACHEL = 150;
const bogen = Buffer.alloc(nimm.length * KACHEL * KACHEL * 3);
for (const [i, f] of nimm.entries()) {
  const cx = f.x * k, cy = f.y * k, rp = f.r * k;
  for (let ty = 0; ty < KACHEL; ty++) for (let tx = 0; tx < KACHEL; tx++) {
    // Der Kreis fuellt die Kachel ganz aus, damit man den Inhalt sieht und
    // nicht die Umgebung.
    const sx = Math.round(cx + (tx / KACHEL - 0.5) * 2 * rp);
    const sy = Math.round(cy + (ty / KACHEL - 0.5) * 2 * rp);
    const o = (ty * (nimm.length * KACHEL) + i * KACHEL + tx) * 3;
    if (sx < 0 || sy < 0 || sx >= N || sy >= H) { bogen[o] = 24; bogen[o + 1] = 24; bogen[o + 2] = 26; continue; }
    const q = (sy * N + sx) * 3;
    bogen[o] = data[q]; bogen[o + 1] = data[q + 1]; bogen[o + 2] = data[q + 2];
  }
}
const bogenDatei = `bilder/gelaendesuche-${m.id}.png`;
mkdirSync('bilder', { recursive: true });
await sharp(bogen, { raw: { width: nimm.length * KACHEL, height: KACHEL, channels: 3 } })
  .png().toFile(bogenDatei);
console.log(`  Kontaktbogen: ${bogenDatei} - eine Kachel je Vorschlag, `
  + 'in der Reihenfolge unten.');
console.log('  **Erst ansehen, dann hineinkopieren.** Kein Kriterium trennt hier ein');
console.log('  Felsfeld von einem Schattenfleck im Gras (siehe Kopf der Datei); drei');
console.log('  Grasflecken im Bogen sind dagegen in einer Sekunde zu sehen.\n');
console.log('  Zum Hineinkopieren in `maps.ts`:\n');
console.log('  rough: [');
for (const f of nimm) {
  console.log(`    { x: ${f.x}, y: ${f.y}, r: ${f.r}, art: '${f.art}', farbe: '${f.farbe}' },`
    + `   // Streuung ${f.streuung.toFixed(3)}, hebt sich um ${f.abhebung.toFixed(3)} ab`);
}
console.log('  ],');
console.log('\n  Danach `npm run gelaende`, `npm run sim` und `npm run bauflaeche` -');
console.log('  die Kreise bestimmen die bebaubare Flaeche, und die bestimmt die Balance.');
