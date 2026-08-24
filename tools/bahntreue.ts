/** Laeuft die Bahn auf der gemalten Strasse? (v149)
 *
 *  **Wie dieser Befund gefunden wurde.** Die Wegvorschau aus TF-014 zieht
 *  eine Lichtspur ueber jede Bahn. Auf der ersten Aufnahme schnitt sie die
 *  Ecken der Strasse - und das war kein Fehler der Vorschau, sondern der
 *  erste Blick auf etwas, das seit jeher da war: die Bahn ist eine
 *  Catmull-Rom-Kurve durch von Hand gesetzte Stuetzpunkte, die Strasse ist
 *  ins Kartenbild gemalt. Beide muessen zusammenpassen, und niemand hat je
 *  nachgesehen.
 *
 *  Ein Gegner ist ein Punkt und liest sich als "laeuft dort"; eine
 *  durchgezogene Linie zeigt, wo "dort" wirklich ist. Deshalb fiel es
 *  einhundertachtundvierzig Fassungen lang nicht auf.
 *
 *  Gemessen wird am Kartenbild selbst: die Wegfarbe aus den Bahnpunkten, die
 *  Gelaendefarbe als Mittel ueber alles, die Schwelle aus dem Abstand der
 *  beiden - je Karte, aus der Karte (Regel 2). Dann fuer jeden Punkt der
 *  Bahn: liegt er auf Wegfarbe?
 *
 *  Aufruf: npx tsx tools/bahntreue.ts [--tor]
 *
 *  Messstelle (Regel 12): gepacktes Kartenbild auf 640 Punkte Breite,
 *  Bahnpunkte alle 4 Weltpunkte, Schwelle 0,55 des Farbabstands. */
import sharp from 'sharp';
import { MAPS, lanePaths } from '../src/data/maps';
import { MAP_BACKGROUNDS } from '../src/gfx/assets/backgrounds';
const WELT_B = 1920, WELT_H = 1080;
const TOR = process.argv.includes('--tor');
let fehler = 0;
const fail = (m: string): void => { console.error(`  FEHLER: ${m}`); fehler++; };
const offen: string[] = [];

/** Der heutige Stand je Bahn - eine RATSCHE, kein Soll.
 *
 *  Sie sagt nicht "so gut muss es sein", sondern "so war es, und schlechter
 *  wird es nicht". Gemessen am 23.08.2026. Nur der Spiralhain (96,9 %) ist
 *  wirklich gut; die anderen fuenf Bahnen sind der Befund selbst. */
const RATSCHE: Record<string, number[]> = {
  spiralhain: [0.969],
  ascheschlucht: [0.733, 0.777, 0.587],
  frostspalte: [0.624, 0.605],
};
/** Wieviel Streuung erlaubt ist, bevor "schlechter" gemeldet wird. Die
 *  Messung ist auf 640 Punkte Breite gerastert; ein Punkt Unterschied am
 *  Rand der Strasse macht rund einen halben Prozentpunkt aus. */
const TOLERANZ = 0.02;

console.log('BAHNTREUE\n');
for (const m of MAPS) {
  const d = (MAP_BACKGROUNDS as Record<string, string>)[m.id];
  if (!d) { console.log(m.id, 'kein Bild'); continue; }
  const N = 640, H = Math.round(N * WELT_H / WELT_B);
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
  const spanne = Math.hypot(wr - gr, wg - gg, wb - gb);
  const schwelle = spanne * 0.55;
  const istWeg = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= N || y >= H) return false;
    const c = farbe(x, y);
    return Math.hypot(c[0] - wr, c[1] - wg, c[2] - wb) < schwelle;
  };
  // Wieviel Prozent der Bahnpunkte liegen auf der gemalten Strasse?
  bahnen.forEach((b, i) => {
    let drauf = 0, n = 0, laengsteLuecke = 0, luecke = 0;
    for (let sw = 0; sw < b.length; sw += 4) {
      const p = b.at(sw);
      const x = Math.round(p.x * N / WELT_B), y = Math.round(p.y * N / WELT_B);
      if (x < 0 || y < 0 || x >= N || y >= H) continue;
      n++;
      if (istWeg(x, y)) { drauf++; if (luecke > laengsteLuecke) laengsteLuecke = luecke; luecke = 0; }
      else luecke += 4;
    }
    if (luecke > laengsteLuecke) laengsteLuecke = luecke;
    const anteil = drauf / n;
    const soll = RATSCHE[m.id]?.[i];
    const schlecht = soll !== undefined && anteil < soll - TOLERANZ;
    console.log(`  ${m.name.padEnd(15)} Bahn ${i}: ${(anteil * 100).toFixed(1)} % auf der Strasse, `
      + `laengste Abweichung ${laengsteLuecke} Weltpunkte am Stueck`
      + `${soll !== undefined ? `   (Ratsche ${(soll * 100).toFixed(1)} %)` : ''}`
      + `${schlecht ? '   SCHLECHTER' : ''}`);
    if (soll === undefined) {
      fail(`${m.name} Bahn ${i}: kein Ratschenwert eingetragen - dann prueft diese `
        + 'Messung nichts. Wer eine Bahn hinzufuegt, traegt ihn nach.');
    } else if (schlecht) {
      fail(`${m.name} Bahn ${i}: nur noch ${(anteil * 100).toFixed(1)} % der Bahn liegen `
        + `auf der gemalten Strasse, vorher ${(soll * 100).toFixed(1)} %.`);
    }
    if (anteil < 0.9) offen.push(`${m.name} Bahn ${i} ${(anteil * 100).toFixed(0)} %`);
  });
}

if (offen.length) {
  console.log(`\nBahnen, die nicht auf ihrer Strasse laufen: ${offen.join(', ')}`);
  console.log('  Die Gegner laufen dort neben dem gemalten Weg - auf der Frostspalte');
  console.log('  bis zu 520 Weltpunkte am Stueck quer ueber den Schnee. Das ist ein');
  console.log('  eigener Befund (TF-042) und mit neuen Stuetzpunkten zu beheben, nicht');
  console.log('  mit neuen Bildern. Die Ratsche haelt den Zustand fest, bis das geschieht.');
}

console.log('\n  Messstelle: gepacktes Kartenbild auf 640 Punkte Breite, Bahnpunkte alle 4 '
  + 'Weltpunkte,\n  Schwelle 0,55 des Farbabstands zwischen Weg und Gelaende.');

if (fehler) { console.error(`\nBAHNTREUE: ${fehler} Fehler.`); if (TOR) process.exit(1); }
else console.log('\nBAHNTREUE: keine Bahn ist schlechter geworden.');
