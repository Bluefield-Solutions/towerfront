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
 * Aufruf: npm run wegdeckung
 */
import sharp from 'sharp';
import { MAPS, lanePaths } from '../src/data/maps';
import { MAP_BACKGROUNDS } from '../src/gfx/assets/backgrounds';
import { WORLD_W as WELT_B, WORLD_H as WELT_H } from '../src/data/config';
import { GameState } from '../src/game/state';

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
  const p = (v: number) => `${(v / gesamt * 100).toFixed(1)} %`;
  console.log(`${m.id.padEnd(15)} gemalte Strasse ${p(weg).padStart(7)}   bebaubar ${p(baubar).padStart(7)}`
    + `   davon AUF der Strasse ${(wegBaubar / Math.max(1, baubar) * 100).toFixed(0).padStart(3)} %`
    + `   (${(wegBaubar / Math.max(1, weg) * 100).toFixed(0)} % der Strasse ist bebaubar)`);
}
