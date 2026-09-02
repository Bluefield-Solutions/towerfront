/**
 * Eine ZWEITE Bahn im gemalten Wegenetz suchen (D28, Schritt A).
 *
 * **Der Anlass.** `npm run wegdeckung` misst, wieviel der gemalten Strasse an
 * einer benutzten Bahn liegt: auf dem Spiralhain 8,2 von 21,7 Prozent. Fast
 * zwei Drittel des gemalten Netzes fuehren nirgendwohin. Gemeldet wurde das
 * als "die Gegner kommen nur unten ueber einen Weg, ueber die anderen nicht".
 *
 * **Was das Werkzeug tut und was nicht.** Es SUCHT eine Route und schreibt
 * sie zum Hineinkopieren aus - es aendert die Karte nicht selbst. Welcher
 * Weg ein Weg sein soll, ist eine Entwurfsentscheidung ueber die Karte; das
 * Werkzeug liefert dafuer die Geometrie, nicht das Urteil. Dieselbe Trennung
 * wie bei `bahnfit --umleiten`.
 *
 * Gesucht wird wie in `mapgraph`: die Mittellinie wird nicht konstruiert,
 * sondern zur billigsten Strecke gemacht - ein Schritt kostet umso mehr, je
 * naeher er am Wegrand liegt. Zusaetzlich kostet er, wenn er neben einer
 * BESTEHENDEN Bahn liegt; dadurch nimmt die Suche an jeder Kreuzung den Ast,
 * den es noch nicht gibt.
 *
 * Die Strasse wird mit derselben Rechnung erkannt wie in `bahntreue`,
 * `wegdeckung` und der Kulissenmaske: mittlere Farbe unter den Bahnen gegen
 * mittlere Farbe der Karte, Schwelle 0,55 des Abstands.
 *
 * **Was es in v209 gemessen hat - und warum daraus keine Karte wurde.**
 *
 * Es gibt sie, die zweite Route: auf dem Spiralhain fuehrt sie durch die
 * grosse linke Schleife und ueber den Kamm, 2170 statt 1547 Weltpunkte, und
 * sie liegt zu 100 Prozent auf der gemalten Strasse. Von der gemalten Strasse
 * laegen damit 79 statt 38 Prozent an einer benutzten Bahn.
 *
 * Gescheitert ist sie an der Waage, in beiden Fassungen:
 *
 *  - **Als ZWEITE Bahn neben der ersten** teilt sie die Verteidigung. Die
 *    Streuung zwischen drei vernuenftigen Bauverlaeufen stieg von 21-24 auf
 *    26-38 Punkte; `npm run sim` verbietet ab 32. Die Karte haette dann
 *    nicht mehr das Koennen gemessen, sondern die Baureihenfolge.
 *  - **ANSTELLE der ersten** ist sie ruhig (Streuung 4-15), aber anderthalb
 *    mal so lang, und damit steht auch anderthalb mal so viel gleichzeitig
 *    auf dem Feld. Zum Ausgleich braeuchte die Karte hpMul 0,55; der
 *    Daten-Waechter laesst 0,85 bis 1,2 zu, und das aus gutem Grund - der
 *    Kartenausgleich ist eine Feinschraube, kein Ersatz fuer den Wellenplan.
 *    Die naheliegenden Ersatzschrauben tragen nicht: Abstaende mal 1,5
 *    (17/60 Punkte, ein Stern) und Anzahlen mal 0,65 (drei Sterne, aber die
 *    Ziellogik "hinten" wird wirkungslos - eine leichte Karte belohnt es
 *    nicht mehr, die Vordersten durchzulassen).
 *
 * Damit ist Schritt A nicht an der Geometrie gescheitert, sondern am
 * Wellenplan des Spiralhains - und der gehoert zu Schritt C, wo die Karte
 * ohnehin neu entsteht. Steht im Rueckstandsverzeichnis unter D28.
 *
 * Aufruf:
 *   npx tsx tools/bahnsuche.ts <karte>                  zeigt die Randkontakte
 *   npx tsx tools/bahnsuche.ts <karte> --von 40,520     sucht von dort zum Ziel
 *   ... --mindest 28                                   engster zugelassener Ast
 *   ... --meiden 6                                     Aufschlag neben alten Bahnen
 *
 * Messstelle (Regel 12): gepacktes Kartenbild auf 480 Punkte Breite.
 */
import sharp from 'sharp';
import { MAPS, lanePaths } from '../src/data/maps';
import { MAP_BACKGROUNDS } from '../src/gfx/assets/backgrounds';
import { WORLD_W as WELT_B, WORLD_H as WELT_H } from '../src/data/config';

const B = 480, H = Math.round(B * WELT_H / WELT_B);
const k = B / WELT_B;

const karte = process.argv[2];
const m = MAPS.find((q) => q.id === karte);
if (!m) {
  console.error(`Karte "${karte}" gibt es nicht. Bekannt: ${MAPS.map((q) => q.id).join(', ')}`);
  process.exit(1);
}
const roh = (MAP_BACKGROUNDS as Record<string, string>)[m.id];
if (!roh) { console.error(`${m.id}: kein Kartenbild.`); process.exit(1); }

const { data } = await sharp(Buffer.from(roh.split(',')[1], 'base64'))
  .resize(B, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

// --- Strasse erkennen (dieselbe Rechnung wie bahntreue/wegdeckung).
const bahnen = lanePaths(m);
let wr = 0, wg = 0, wb = 0, wn = 0;
for (const p of bahnen) for (let t = 0.05; t < 0.95; t += 0.01) {
  const q = p.at(p.length * t);
  const x = Math.round(q.x * k), y = Math.round(q.y * k);
  if (x < 0 || y < 0 || x >= B || y >= H) continue;
  const i = (y * B + x) * 3;
  wr += data[i]; wg += data[i + 1]; wb += data[i + 2]; wn++;
}
wr /= wn; wg /= wn; wb /= wn;
let mr = 0, mg = 0, mb = 0;
for (let i = 0; i < B * H; i++) { mr += data[i * 3]; mg += data[i * 3 + 1]; mb += data[i * 3 + 2]; }
mr /= B * H; mg /= B * H; mb /= B * H;
const schwelle = Math.hypot(wr - mr, wg - mg, wb - mb) * 0.55;
const istWeg = new Uint8Array(B * H);
for (let i = 0; i < B * H; i++) {
  istWeg[i] = Math.hypot(data[i * 3] - wr, data[i * 3 + 1] - wg, data[i * 3 + 2] - wb) < schwelle ? 1 : 0;
}

// --- Abstand zum Wegrand (Chamfer, zwei Durchgaenge).
const rand = new Float32Array(B * H);
for (let i = 0; i < B * H; i++) rand[i] = istWeg[i] ? 1e9 : 0;
for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
  const i = y * B + x;
  if (!istWeg[i]) continue;
  let v = rand[i];
  if (x > 0) v = Math.min(v, rand[i - 1] + 1);
  if (y > 0) v = Math.min(v, rand[i - B] + 1);
  if (x > 0 && y > 0) v = Math.min(v, rand[i - B - 1] + 1.414);
  if (x < B - 1 && y > 0) v = Math.min(v, rand[i - B + 1] + 1.414);
  rand[i] = v;
}
for (let y = H - 1; y >= 0; y--) for (let x = B - 1; x >= 0; x--) {
  const i = y * B + x;
  if (!istWeg[i]) continue;
  let v = rand[i];
  if (x < B - 1) v = Math.min(v, rand[i + 1] + 1);
  if (y < H - 1) v = Math.min(v, rand[i + B] + 1);
  if (x < B - 1 && y < H - 1) v = Math.min(v, rand[i + B + 1] + 1.414);
  if (x > 0 && y < H - 1) v = Math.min(v, rand[i + B - 1] + 1.414);
  rand[i] = v;
}

// --- Abstand zu den bestehenden Bahnen, in Rasterzellen.
const nahBahn = new Float32Array(B * H).fill(1e9);
for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
  const wx = (x + 0.5) / k, wy = (y + 0.5) / k;
  let d = 1e9;
  for (const p of bahnen) d = Math.min(d, p.schlauchAbstand(wx, wy));
  nahBahn[y * B + x] = d;
}

// **Zu schmal ist kein Weg.**
//
// Die gemalte Strasse hat Aeste, die als Farbe da sind, aber als Weg nicht:
// auf dem Spiralhain traegt die schmalste Stelle der linken Schleife acht
// Weltpunkte. Der breiteste Gegner misst 55 (`npm run gedraenge`), passt also
// nicht einmal ansatzweise hindurch. Eine Suche, die solche Zellen benutzen
// darf, findet eine Route, die es nur auf dem Papier gibt - deshalb faellt
// alles heraus, was die halbe Figurenbreite nicht traegt.
//
// Das Soll kommt aus dem Spiel, nicht aus mir (Regel 10): 55 Weltpunkte
// breiteste Figur, also 28 Weltpunkte halbe Strasse.
const mindArg = process.argv.indexOf('--mindest');
const MIND = mindArg >= 0 ? Number(process.argv[mindArg + 1]) : 28;
const begehbar = new Uint8Array(B * H);
let wegZellen = 0, engZellen = 0;
for (let i = 0; i < B * H; i++) {
  if (!istWeg[i]) continue;
  wegZellen++;
  if (rand[i] / k >= MIND) begehbar[i] = 1; else engZellen++;
}

// **Die zusammenhaengenden Stuecke, einmal fuer alles.**
//
// Ein heller Fleck am Bildrand ist kein Einstieg, auch wenn die Farbe stimmt:
// die erste Fassung dieses Werkzeugs hat einen einzelnen Bildpunkt bei 750,2
// als Randkontakt ausgegeben, und die Suche von dort meldete nur "keine
// Verbindung" - ohne zu sagen, warum.
const teil = new Int32Array(B * H).fill(-1);
const teilGroesse: number[] = [];
for (let s0 = 0; s0 < B * H; s0++) {
  if (!begehbar[s0] || teil[s0] >= 0) continue;
  const n = teilGroesse.length;
  let f = 0;
  const st = [s0];
  teil[s0] = n;
  while (st.length) {
    const p = st.pop()!;
    f++;
    const x = p % B, y = (p / B) | 0;
    for (const [q, gut] of [[p - 1, x > 0], [p + 1, x < B - 1],
      [p - B, y > 0], [p + B, y < H - 1]] as [number, boolean][]) {
      if (!gut || !begehbar[q] || teil[q] >= 0) continue;
      teil[q] = n; st.push(q);
    }
  }
  teilGroesse.push(f);
}
const haupt = teilGroesse.indexOf(Math.max(...teilGroesse));

const vonArg = process.argv.indexOf('--von');
if (vonArg < 0) {
  // Ohne Startpunkt: zeigen, wo die Strasse den Bildrand beruehrt.
  console.log(`BAHNSUCHE ${m.id} - Randkontakte der gemalten Strasse`);
  console.log(`  ${wegZellen} Wegzellen, davon ${engZellen} schmaler als `
    + `${MIND} Weltpunkte halb (${((engZellen / wegZellen) * 100).toFixed(0)} %) - die zaehlen nicht mit.`);
  console.log(`  Begehbares Netz: ${teilGroesse.length} Stueck(e), das groesste ${teilGroesse[haupt] ?? 0} Zellen.\n`);
  const treffer: { x: number; y: number; n: number }[] = [];
  const nimm = (x: number, y: number): void => {
    // Nur das Hauptnetz zaehlt - ein einzelner heller Punkt am Rand ist
    // kein Einstieg.
    if (!begehbar[y * B + x] || teil[y * B + x] !== haupt) return;
    const wx = Math.round((x + 0.5) / k), wy = Math.round((y + 0.5) / k);
    const nah = treffer.find((t) => Math.hypot(t.x - wx, t.y - wy) < 160);
    if (nah) { nah.n++; return; }
    treffer.push({ x: wx, y: wy, n: 1 });
  };
  for (let y = 0; y < H; y++) { nimm(0, y); nimm(B - 1, y); }
  for (let x = 0; x < B; x++) { nimm(x, 0); nimm(x, H - 1); }
  for (const t of treffer) {
    let d = 1e9;
    for (const p of bahnen) d = Math.min(d, p.schlauchAbstand(t.x, t.y));
    console.log(`  ${String(t.x).padStart(5)},${String(t.y).padStart(5)}   `
      + `${String(t.n).padStart(3)} Zellen breit   `
      + (d < 60 ? 'liegt an einer bestehenden Bahn' : `${Math.round(d)} Weltpunkte von jeder Bahn`));
  }
  console.log('\n  Mit --von <x>,<y> von einem dieser Punkte aus suchen.');
  process.exit(0);
}

const [vx, vy] = process.argv[vonArg + 1].split(',').map(Number);
const ziel = bahnen[0].pts[bahnen[0].pts.length - 1];

/** Die naechste Wegzelle zu einem Weltpunkt. */
const zelleBei = (wx: number, wy: number): number => {
  let best = -1, bestD = 1e9;
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    if (!begehbar[y * B + x]) continue;
    const d = Math.hypot((x + 0.5) / k - wx, (y + 0.5) / k - wy);
    if (d < bestD) { bestD = d; best = y * B + x; }
  }
  return best;
};
const start = zelleBei(vx, vy), ende = zelleBei(ziel.x, ziel.y);
if (start < 0 || ende < 0) { console.error('Kein Weg in der Naehe.'); process.exit(1); }

// **Haengen Anfang und Ende zusammen?**
//
// Eine Wegsuche, die "keine Verbindung" meldet, sagt nicht, WARUM. Meistens
// ist die Antwort: der Einstieg liegt auf einem Stueck Strasse, das mit dem
// Rest gar nicht verbunden ist - ein heller Fleck am Bildrand etwa. Das ist
// eine Auskunft ueber die KARTE und gehoert ausgegeben, nicht verschluckt.
{
  console.log(`Begehbares Wegenetz (mindestens ${MIND} Weltpunkte halb): `
    + `${teilGroesse.length} Stueck(e), das groesste ${teilGroesse[haupt]} Zellen. `
    + `${engZellen} von ${wegZellen} Wegzellen sind zu schmal.`);
  if (teil[start] !== haupt) {
    console.error(`Der Einstieg liegt auf einem Stueck von ${teilGroesse[teil[start]]} Zellen, `
      + 'nicht im Hauptnetz - von dort fuehrt kein gemalter Weg zum Ziel.');
    process.exit(1);
  }
}

// **Was ein Schritt kostet.**
//
// Grundpreis 1, dazu ein Aufschlag, je naeher die Zelle am Wegrand liegt -
// dadurch wandert die billigste Strecke von selbst in die Mitte der Strasse,
// ohne dass eine Mittellinie konstruiert wird (dieselbe Rechnung wie in
// `mapgraph`). Und ein Aufschlag fuer Zellen, die neben einer BESTEHENDEN
// Bahn liegen: an einer Kreuzung nimmt die Suche damit den Ast, den es noch
// nicht gibt, statt der vorhandenen Bahn hinterherzulaufen.
const meidenArg = process.argv.indexOf('--meiden');
const MEIDEN = meidenArg >= 0 ? Number(process.argv[meidenArg + 1]) : 6;
const kosten = (i: number): number =>
  1 + 6 / Math.max(1, rand[i]) + (nahBahn[i] < 70 ? MEIDEN : 0);

const dist = new Float32Array(B * H).fill(Infinity);
const vor = new Int32Array(B * H).fill(-1);
dist[start] = 0;
const offen: number[] = [start];
while (offen.length) {
  let bi = 0;
  for (let i = 1; i < offen.length; i++) if (dist[offen[i]] < dist[offen[bi]]) bi = i;
  const p = offen.splice(bi, 1)[0];
  if (p === ende) break;
  const x = p % B, y = (p / B) | 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= B || ny >= H) continue;
    const q = ny * B + nx;
    if (!begehbar[q]) continue;
    const d = dist[p] + kosten(q) * (dx && dy ? 1.414 : 1);
    if (d < dist[q]) { dist[q] = d; vor[q] = p; if (!offen.includes(q)) offen.push(q); }
  }
}
if (!isFinite(dist[ende])) { console.error('Keine Verbindung im Wegenetz gefunden.'); process.exit(1); }

const pfad: number[] = [];
for (let p = ende; p >= 0; p = vor[p]) pfad.push(p);
pfad.reverse();

// --- Alle 40 Weltpunkte einen Stuetzpunkt, mit halber Wegbreite.
const ABSTAND = 40;
const punkte: { x: number; y: number; w: number }[] = [];
let seit = ABSTAND;
for (let n = 0; n < pfad.length; n++) {
  const p = pfad[n];
  const wx = Math.round((p % B) / k), wy = Math.round(((p / B) | 0) / k);
  const w = Math.round(rand[p] / k);
  if (n === 0 || n === pfad.length - 1 || seit >= ABSTAND) {
    if (punkte.length) {
      const l = punkte[punkte.length - 1];
      seit = Math.hypot(wx - l.x, wy - l.y);
      if (seit < ABSTAND && n !== pfad.length - 1) continue;
    }
    // Die Breite kommt aus der Farbe, aber nicht ungebremst: unter 40 wird
    // die Strasse enger als die schmalste Stelle, die das Spiel heute hat
    // (`npm run gedraenge` rechnet mit 80 Weltpunkten voller Breite), ueber
    // 60 steht der Schlauch weit ueber die gemalte Strasse hinaus.
    punkte.push({ x: wx, y: wy, w: Math.max(40, Math.min(60, w)) });
    seit = 0;
  } else seit += 1 / k;
}

let laenge = 0;
for (let i = 1; i < punkte.length; i++) laenge += Math.hypot(punkte[i].x - punkte[i - 1].x, punkte[i].y - punkte[i - 1].y);

// **Wie breit die gemalte Strasse auf dieser Route WIRKLICH ist.**
//
// Die ausgegebenen `w` sind auf 28 bis 90 geklemmt, damit die Kurve brauchbar
// bleibt - die geklemmte Zahl sagt also nichts mehr ueber das Bild. Die rohe
// sagt es: passt der breiteste Gegner (55 Weltpunkte, `npm run gedraenge`)
// ueberhaupt durch den schmalsten Ast, oder ist diese Route nur auf dem
// Papier eine?
const rohe = pfad.map((p) => rand[p] / k).sort((a, b) => a - b);
console.log(`Gemalte Halbbreite auf der Route: schmalste ${rohe[0].toFixed(0)}, `
  + `Mitte ${rohe[(rohe.length / 2) | 0].toFixed(0)}, breiteste ${rohe[rohe.length - 1].toFixed(0)} `
  + `Weltpunkte. Die engste STELLE traegt also ${(rohe[0] * 2).toFixed(0)} Punkte Strasse.`);
console.log(`BAHNSUCHE ${m.id}: ${punkte.length} Stuetzpunkte, rund ${Math.round(laenge)} Weltpunkte lang.`);
console.log(`Bestehende Bahnen: ${bahnen.map((p) => Math.round(p.length)).join(', ')} Weltpunkte.\n`);
console.log('    [');
for (const p of punkte) console.log(`      { x: ${p.x}, y: ${p.y}, w: ${p.w} },`);
console.log('    ],');
