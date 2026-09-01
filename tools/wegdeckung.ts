/**
 * Wieviel von der gemalten Strasse wird ueberhaupt BENUTZT?
 *
 * **Der Anlass.** Gemeldet wurde dreierlei am selben Abend: "ich kann auf
 * eine Strasse bauen, wo die Gegner kommen", "es gibt viel zu viele
 * Wegeflaechen und zu wenig bebaubare Flaeche" und "die Gegner kommen nur
 * unten ueber einen Weg". Das klingt nach drei Fehlern und ist einer.
 *
 * Gemessen wird deshalb nicht die Bauregel gegen sich selbst, sondern das
 * BILD gegen die Bahnen: welcher Anteil der Karte ist als Strasse gemalt,
 * welcher Anteil davon liegt an einer Bahn, auf der wirklich jemand laeuft -
 * und wieviel von dem, was man bebauen darf, sieht aus wie Strasse.
 *
 * Die Strasse wird am Kartenbild erkannt, mit derselben Rechnung wie in
 * `bahntreue`: die mittlere Farbe unter den Bahnen gegen die mittlere Farbe
 * der ganzen Karte, Schwelle 0,55 des Abstands. Zwei Fassungen davon waeren
 * eine zu viel - hier steht sie, weil sie eine ANDERE Frage stellt (Flaeche
 * statt Treue) und dabei dieselbe Definition benutzt.
 *
 * Messstelle (Regel 12): Kartenbild auf 480 Punkte Breite, Rasterpunkt in
 * Weltkoordinaten gegen `warumNicht` gehalten, Bahnnaehe 150 Weltpunkte.
 *
 * Und seit v208 misst es, ob die Kulisse auch WIRKLICH verblasst: auf dem
 * gebackenen Untergrund wird der Farbabstand zum Gelaende einmal fuer die
 * benutzte Strasse und einmal fuer die Kulisse gerechnet. Liegen beide gleich
 * weit weg, sieht man den Unterschied nicht - dann ist das Verblassen eine
 * Behauptung. Mit `--tor` ist das eine Grenze.
 *
 * Aufruf: npm run wegdeckung        Tabelle
 *         npm run wegdeckung --tor  prueft die Grenze
 */
import sharp from 'sharp';
import { geruestStellen, bilderAbwarten } from './leinwand.mjs';
geruestStellen();
import { MAPS, lanePaths } from '../src/data/maps';
import { MAP_BACKGROUNDS } from '../src/gfx/assets/backgrounds';
import { WORLD_W as WELT_B, WORLD_H as WELT_H } from '../src/data/config';
import { GameState } from '../src/game/state';

const TOR = process.argv.includes('--tor');
/** Wie weit die Kulisse dem Gelaende noch fernbleiben darf - als RATSCHE je
 *  Karte, nicht als eine Zahl fuer alle.
 *
 *  Der Grund steht in den Messwerten selbst: auf dem Spiralhain liegt die
 *  benutzte Strasse 130 Farbschritte vom Gelaende entfernt, auf der
 *  Frostspalte nur 43 - dort sind Weg und Schnee einander ohnehin aehnlich.
 *  Ein gemeinsamer Grenzwert wuerde deshalb entweder die Frostspalte
 *  durchwinken oder den Spiralhain unnoetig festnageln. Was ueberall gilt,
 *  ist "nicht schlechter als heute", und genau das ist eine Ratsche - dieselbe
 *  Bauart wie in `bahntreue`.
 *
 *  Sie faengt beides: ein abgeschaltetes Verblassen (Verhaeltnis 1,00) und
 *  ein Kartenbild, dessen Kulisse sich nicht mehr abheben laesst. Wer eine
 *  Karte neu malt, traegt den neuen Stand hier ein - und sieht dabei, was er
 *  aufgibt. */
const RATSCHE: Record<string, number> = {
  spiralhain: 0.31,
  ascheschlucht: 0.25,
  frostspalte: 0.69,
};
/** Wieviel Streuung erlaubt ist, bevor "schlechter" gemeldet wird. Das
 *  Kartenbild wird auf 480 Punkte gerastert; ein Punkt am Strassenrand macht
 *  rund einen Hundertstel aus. */
const TOLERANZ = 0.04;
/** Wieviel Zeichnung in der Kulisse mindestens stehen bleibt, gemessen an der
 *  Streuung auf der benutzten Strasse.
 *
 *  Heute 0,66 / 0,86 / 0,90. Bei vollem Verblassen (Staerke 1) waere die
 *  Kulisse eine gleichmaessige Flaeche und der Wert nahe null - genau das
 *  soll die Grenze fangen, und genau das hat das Grafiktor NICHT gefangen:
 *  der Mittelwert des Untergrunds bleibt beim Verblenden erhalten, seine
 *  Helligkeit faellt also aus keinem Band. */
const ZEICHNUNG_MIN = 0.45;
const abstaende: { karte: string; nah: number; fern: number; verhaeltnis: number;
  zeichnung: number }[] = [];

for (const m of MAPS) {
  const d = (MAP_BACKGROUNDS as Record<string, string>)[m.id];
  if (!d) continue;
  const N = 480, H = Math.round(N * WELT_H / WELT_B);
  const { data } = await sharp(Buffer.from(d.split(',')[1], 'base64'))
    .resize(N, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const farbe = (x: number, y: number): number[] => {
    const i = (y * N + x) * 3;
    return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
  };
  const bahnen = lanePaths(m);
  let wr = 0, wg = 0, wb = 0, wn = 0;
  for (const b of bahnen) for (let t = 0.05; t < 0.95; t += 0.02) {
    const p = b.at(b.length * t);
    const x = Math.round(p.x * N / WELT_B), y = Math.round(p.y * N / WELT_B);
    if (x < 0 || y < 0 || x >= N || y >= H) continue;
    const c = farbe(x, y); wr += c[0]; wg += c[1]; wb += c[2]; wn++;
  }
  wr /= wn; wg /= wn; wb /= wn;
  let gr = 0, gg = 0, gb = 0;
  for (let i = 0; i < N * H; i++) { gr += data[i * 3] / 255; gg += data[i * 3 + 1] / 255; gb += data[i * 3 + 2] / 255; }
  gr /= N * H; gg /= N * H; gb /= N * H;
  const schwelle = Math.hypot(wr - gr, wg - gg, wb - gb) * 0.55;
  const istWeg = (x: number, y: number): boolean => {
    const c = farbe(x, y);
    return Math.hypot(c[0] - wr, c[1] - wg, c[2] - wb) < schwelle;
  };
  const s = new GameState();
  s.reset(1, 'normal', m.id);
  let weg = 0, gesamt = 0, wegBaubar = 0, baubar = 0, nahBaubar = 0, nahWeg = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < N; x++) {
    gesamt++;
    const wx = (x + 0.5) * WELT_B / N, wy = (y + 0.5) * WELT_H / H;
    const w = istWeg(x, y);
    const b = s.warumNicht('arrow', wx, wy) === null;
    // Liegt der Punkt auf der Strasse, auf der die Gegner WIRKLICH laufen?
    let nah = false;
    for (const lane of bahnen) if (lane.distanceTo(wx, wy) < 150) nah = true;
    if (w) weg++;
    if (w && nah) nahWeg++;
    if (b) baubar++;
    if (w && b) wegBaubar++;
    if (w && b && nah) nahBaubar++;
  }
  console.log(`   davon in Bahnnaehe (150 Weltpunkte): Strasse ${(nahWeg / gesamt * 100).toFixed(1)} %, `
    + `bebaubar UND Strasse UND in Bahnnaehe ${(nahBaubar / gesamt * 100).toFixed(2)} % `
    + `(${(nahBaubar / Math.max(1, nahWeg) * 100).toFixed(0)} % der benutzten Strasse)`);
  // **Und jetzt am GEBACKENEN Untergrund: verblasst die Kulisse wirklich?**
  //
  // Gemessen wird der Farbabstand zum Gelaende, einmal fuer die benutzte
  // Strasse und einmal fuer die Kulisse. Die Zahl selbst sagt wenig; ihr
  // VERHAELTNIS sagt alles: eins heisst "kein Unterschied".
  const { bakeTerrain } = await import('../src/gfx/terrain');
  const { getBackground } = await import('../src/gfx/backgrounds');
  getBackground(m.id);
  await bilderAbwarten();
  const gebacken = bakeTerrain(m, bahnen, m.palette, getBackground(m.id));
  const bild = gebacken.getContext('2d')!.getImageData(0, 0, WELT_B, WELT_H).data;
  let bnR = 0, bnG = 0, bnB = 0, bnN = 0;
  const merke: { x: number; y: number; nah: boolean }[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < N; x++) {
    const wx = Math.round((x + 0.5) * WELT_B / N), wy = Math.round((y + 0.5) * WELT_H / H);
    const j = ((Math.min(WELT_H - 1, wy)) * WELT_B + Math.min(WELT_B - 1, wx)) * 4;
    if (!istWeg(x, y)) { bnR += bild[j]; bnG += bild[j + 1]; bnB += bild[j + 2]; bnN++; continue; }
    let nah = false;
    for (const lane of bahnen) if (lane.schlauchAbstand(wx, wy) < 40) { nah = true; break; }
    merke.push({ x: wx, y: wy, nah });
  }
  bnR /= bnN; bnG /= bnN; bnB /= bnN;
  let dNah = 0, nNah = 0, dFern = 0, nFern = 0;
  for (const q of merke) {
    const j = ((Math.min(WELT_H - 1, q.y)) * WELT_B + Math.min(WELT_B - 1, q.x)) * 4;
    const ab = Math.hypot(bild[j] - bnR, bild[j + 1] - bnG, bild[j + 2] - bnB);
    if (q.nah) { dNah += ab; nNah++; } else { dFern += ab; nFern++; }
  }
  const nah = nNah ? dNah / nNah : 0, fern = nFern ? dFern / nFern : 0;
  const verhaeltnis = nah > 0 ? fern / nah : 1;
  // **Und bleibt in der Kulisse noch Zeichnung?**
  //
  // Verblassen heisst "alt und ueberwachsen", nicht "weg". Wird zu stark
  // verblendet, ist die Kulisse eine gleichmaessige Flaeche - und mit ihr ist
  // die Zeichnung fort, fuer die die Kartenbilder bezahlt wurden. Gemessen
  // als Streuung der Helligkeit, gegen dieselbe Streuung auf der benutzten
  // Strasse gehalten.
  const helligkeit = (j: number): number =>
    0.299 * bild[j] + 0.587 * bild[j + 1] + 0.114 * bild[j + 2];
  const streuung = (welche: boolean): number => {
    const w = merke.filter((q) => q.nah === welche);
    if (!w.length) return 0;
    let mm = 0;
    for (const q of w) mm += helligkeit(((Math.min(WELT_H - 1, q.y)) * WELT_B + Math.min(WELT_B - 1, q.x)) * 4);
    mm /= w.length;
    let vv = 0;
    for (const q of w) {
      const h2 = helligkeit(((Math.min(WELT_H - 1, q.y)) * WELT_B + Math.min(WELT_B - 1, q.x)) * 4);
      vv += (h2 - mm) ** 2;
    }
    return Math.sqrt(vv / w.length);
  };
  const zNah = streuung(true), zFern = streuung(false);
  abstaende.push({ karte: m.id, nah, fern, verhaeltnis,
    zeichnung: zNah > 0 ? zFern / zNah : 1 });

  const p = (v: number) => `${(v / gesamt * 100).toFixed(1)} %`;
  console.log(`${m.id.padEnd(15)} gemalte Strasse ${p(weg).padStart(7)}   bebaubar ${p(baubar).padStart(7)}`
    + `   davon AUF der Strasse ${(wegBaubar / Math.max(1, baubar) * 100).toFixed(0).padStart(3)} %`
    + `   (${(wegBaubar / Math.max(1, weg) * 100).toFixed(0)} % der Strasse ist bebaubar)`);
}

console.log('\nVerblassen der Kulisse, gemessen am gebackenen Untergrund');
console.log('(Farbabstand zum Gelaende; das Verhaeltnis ist die Aussage, 1,00 = kein Unterschied)\n');
for (const a of abstaende) {
  console.log(`  ${a.karte.padEnd(15)} benutzte Strasse ${a.nah.toFixed(1).padStart(5)}   `
    + `Kulisse ${a.fern.toFixed(1).padStart(5)}   Verhaeltnis ${a.verhaeltnis.toFixed(2)}`
    + `   Zeichnung ${a.zeichnung.toFixed(2)}`);
}

if (TOR) {
  const fehler: string[] = [];
  for (const a of abstaende) {
    const soll = RATSCHE[a.karte];
    if (soll === undefined) {
      fehler.push(`${a.karte}: keine Ratsche eingetragen. Gemessen ${a.verhaeltnis.toFixed(2)} - `
        + 'wer eine Karte hinzufuegt, traegt ihren Stand hier ein.');
    } else if (a.zeichnung < ZEICHNUNG_MIN) {
      fehler.push(`${a.karte}: in der Kulisse bleibt nur ${(a.zeichnung * 100).toFixed(0)} % der `
        + `Zeichnung uebrig (mindestens ${(ZEICHNUNG_MIN * 100).toFixed(0)} %). Verblassen heisst `
        + '"alt und ueberwachsen", nicht "weg" - eine gleichmaessige Flaeche ist keine Kulisse '
        + 'mehr, sondern ein Fleck.');
    } else if (a.verhaeltnis > soll + TOLERANZ) {
      fehler.push(`${a.karte}: die Kulisse hebt sich schlechter ab als bisher - `
        + `${a.verhaeltnis.toFixed(2)} gegen ${soll.toFixed(2)}. Je naeher an 1,00, desto `
        + 'weniger sieht man ihr an, dass dort niemand laeuft.');
    }
  }
  if (fehler.length) {
    console.log('\nFEHLER');
    for (const f of fehler) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log('\nWEGDECKUNG: die Kulisse hebt sich auf jeder Karte ab (Ratsche gehalten).');
}
