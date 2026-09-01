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
/** Wieviel das Verblassen im Mittel bewegen muss, in Farbschritten ueber die
 *  Karte ausserhalb der Bahnen - als RATSCHE je Karte.
 *
 *  Der Grund steht in den Zahlen: Spiralhain 16,2, Ascheschlucht 14,3,
 *  **Frostspalte 1,3**. Dort sind Weg und Schnee einander ohnehin aehnlich
 *  (43 Farbschritte Abstand gegen 130 auf dem Spiralhain), also ist der
 *  Kulisse kaum etwas zu nehmen. Eine gemeinsame Untergrenze wuerde die
 *  Frostspalte entweder aussperren oder so tief liegen, dass sie nichts mehr
 *  faengt. Was ueberall gilt, ist "nicht weniger als heute".
 *
 *  Die Frostspalte ist damit der Fall, den Schritt B NICHT loest - sie
 *  braucht Schritt C, ein Kartenbild, dessen Strasse sich vom Boden abhebt. */
const WIRKUNG: Record<string, number> = {
  spiralhain: 16.2,
  ascheschlucht: 14.3,
  frostspalte: 1.3,
};
/** Wieviel die Ratsche nach unten nachgeben darf. Ein Sechstel: das Backen
 *  ist bitgleich, die Streuung kommt allein aus dem Raster der Abtastung. */
const WIRKUNG_LUFT = 0.85;
/** Und wieviel es auf der BENUTZTEN Bahn bewegen darf: nichts. Ein halber
 *  Farbschritt ist die Rundung, mehr waere ein Uebergriff - dann verwischte
 *  das Verblassen genau den Weg, den es hervorheben soll. Das ist zugleich
 *  die Nullprobe der Messung: waere die Wirkung ueberall gleich, sagte die
 *  Zahl darueber nichts (Regel 13). */
const AUF_WEG_MAX = 0.5;
/** Wieviel Zeichnung in der verblassten Flaeche stehen bleibt, gemessen
 *  gegen dieselben Bildpunkte OHNE Verblassen.
 *
 *  Gemessen 0,51 / 0,52 / 0,78 - der Wert folgt der Staerke: wer zu 60 % zu
 *  einer glatten Farbe hin verblendet, behaelt rund 40 % der Streuung. Bei
 *  voller Staerke waere die Flaeche einfarbig und der Wert nahe null, und
 *  genau das soll die Grenze fangen. Die erste Fassung hat es nicht gefangen,
 *  weil sie die betroffenen Punkte mit ihrer EIGENEN Wegerkennung riet statt
 *  sie an der Differenz abzulesen. */
const ZEICHNUNG_MIN = 0.42;
const abstaende: { karte: string; wirkung: number; aufWeg: number; anteil: number;
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
  // Gemessen wird gegen einen zweiten Untergrund, der OHNE Verblassen
  // gebacken ist (Regel 13). Die erste Fassung hat stattdessen geraten,
  // welche Bildpunkte betroffen sind - sie stufte sie mit ihrer eigenen
  // Wegerkennung ein, waehrend das Spiel seine benutzt. Die beiden weichen
  // genug voneinander ab, dass die Gegenprobe nichts mehr bewies: ein voll
  // verblasstes Bild ging als "in Ordnung" durch.
  //
  // Mit zwei Baecken braucht es keine Uebereinstimmung mehr. Die Differenz
  // sagt selbst, wo verblasst wurde - und sie sagt zugleich, wo NICHT: auf
  // der benutzten Strasse muss sie null sein.
  const { bakeTerrain, KULISSE } = await import('../src/gfx/terrain');
  const { getBackground } = await import('../src/gfx/backgrounds');
  getBackground(m.id);
  await bilderAbwarten();
  const bildVon = (staerke: number): Uint8ClampedArray => {
    const vorher = KULISSE.staerke;
    KULISSE.staerke = staerke;
    const cv = bakeTerrain(m, bahnen, m.palette, getBackground(m.id));
    KULISSE.staerke = vorher;
    return cv.getContext('2d')!.getImageData(0, 0, WELT_B, WELT_H).data;
  };
  const mit = bildVon(KULISSE.staerke);
  const ohneVerblassen = bildVon(0);

  let wirkung = 0, wirkungN = 0, aufWeg = 0, aufWegN = 0;
  let sMit = 0, sOhne = 0, sN = 0, mMit = 0, mOhne = 0;
  const helligkeit = (d: Uint8ClampedArray, j: number): number =>
    0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
  const betroffen: number[] = [];
  for (let y = 0; y < WELT_H; y += 3) for (let x = 0; x < WELT_B; x += 3) {
    const j = (y * WELT_B + x) * 4;
    const ab = Math.hypot(mit[j] - ohneVerblassen[j], mit[j + 1] - ohneVerblassen[j + 1],
      mit[j + 2] - ohneVerblassen[j + 2]);
    let nah = false;
    for (const lane of bahnen) if (lane.schlauchAbstand(x, y) < KULISSE.luft) { nah = true; break; }
    if (nah) { aufWeg += ab; aufWegN++; continue; }
    wirkung += ab; wirkungN++;
    if (ab > 6) {
      betroffen.push(j);
      mMit += helligkeit(mit, j); mOhne += helligkeit(ohneVerblassen, j); sN++;
    }
  }
  mMit /= Math.max(1, sN); mOhne /= Math.max(1, sN);
  for (const j of betroffen) {
    sMit += (helligkeit(mit, j) - mMit) ** 2;
    sOhne += (helligkeit(ohneVerblassen, j) - mOhne) ** 2;
  }
  const zeichnung = sOhne > 0 ? Math.sqrt(sMit / sN) / Math.sqrt(sOhne / sN) : 1;
  abstaende.push({
    karte: m.id,
    wirkung: wirkungN ? wirkung / wirkungN : 0,
    aufWeg: aufWegN ? aufWeg / aufWegN : 0,
    anteil: sN / Math.max(1, wirkungN),
    zeichnung,
  });

  const p = (v: number) => `${(v / gesamt * 100).toFixed(1)} %`;
  console.log(`${m.id.padEnd(15)} gemalte Strasse ${p(weg).padStart(7)}   bebaubar ${p(baubar).padStart(7)}`
    + `   davon AUF der Strasse ${(wegBaubar / Math.max(1, baubar) * 100).toFixed(0).padStart(3)} %`
    + `   (${(wegBaubar / Math.max(1, weg) * 100).toFixed(0)} % der Strasse ist bebaubar)`);
}

console.log('\nVerblassen der Kulisse - gegen einen Untergrund OHNE Verblassen gerechnet\n');
console.log('  Karte            Wirkung   auf der Bahn   verblasste Flaeche   Zeichnung');
for (const a of abstaende) {
  console.log(`  ${a.karte.padEnd(15)} ${a.wirkung.toFixed(1).padStart(6)}   `
    + `${a.aufWeg.toFixed(2).padStart(10)}   ${(a.anteil * 100).toFixed(1).padStart(16)} %   `
    + `${a.zeichnung.toFixed(2).padStart(8)}`);
}

if (TOR) {
  const fehler: string[] = [];
  for (const a of abstaende) {
    const soll = WIRKUNG[a.karte];
    if (soll === undefined) {
      fehler.push(`${a.karte}: keine Ratsche eingetragen. Gemessen ${a.wirkung.toFixed(1)} - `
        + 'wer eine Karte hinzufuegt, traegt ihren Stand hier ein.');
    } else if (a.wirkung < soll * WIRKUNG_LUFT) {
      fehler.push(`${a.karte}: das Verblassen aendert im Mittel nur ${a.wirkung.toFixed(1)} `
        + `Farbschritte, bisher waren es ${soll.toFixed(1)}. So lange sieht eine Strasse, an `
        + 'der niemand laeuft, aus wie die, an der jemand laeuft.');
    }
    if (a.aufWeg > AUF_WEG_MAX) {
      fehler.push(`${a.karte}: das Verblassen greift auf die BENUTZTE Bahn ueber `
        + `(${a.aufWeg.toFixed(2)} Farbschritte, erlaubt ${AUF_WEG_MAX}). Der Weg, auf dem die `
        + 'Gegner laufen, muss frisch bleiben - sonst verwischt genau die Auskunft, um die es geht.');
    }
    if (a.zeichnung < ZEICHNUNG_MIN) {
      fehler.push(`${a.karte}: in der verblassten Flaeche bleibt nur `
        + `${(a.zeichnung * 100).toFixed(0)} % der Zeichnung uebrig (mindestens `
        + `${(ZEICHNUNG_MIN * 100).toFixed(0)} %). Verblassen heisst "alt und ueberwachsen", `
        + 'nicht "weg" - eine gleichmaessige Flaeche ist keine Kulisse mehr, sondern ein Fleck.');
    }
  }
  if (fehler.length) {
    console.log('\nFEHLER');
    for (const f of fehler) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log('\nWEGDECKUNG: die Kulisse hebt sich auf jeder Karte ab (Ratsche gehalten).');
}
