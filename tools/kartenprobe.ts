/**
 * Ein Kandidaten-KARTENBILD pruefen, BEVOR es gepackt wird (D28, Schritt C).
 *
 * **Die Luecke, die es schliesst.** Fuer Figuren gibt es `npm run probebild`:
 * es misst einen Kandidaten am Rohbild, bevor er in den Vorrat wandert. Fuer
 * Kartenbilder gab es das nicht - `bahntreue` und `wegdeckung` lesen aus dem
 * GEPACKTEN Vorrat. Ein Kandidat musste also erst eingebaut werden, um zu
 * erfahren, ob er taugt, und ein Rueckbau kostet eine Runde.
 *
 * **Was gemessen wird - dieselbe Rechnung wie im Tor.** Die Strasse wird am
 * Farbabstand erkannt (Schwelle 0,55), dann:
 *
 *   Mitte     wieviel der Bahn-Mittellinie auf gemalter Strasse liegt
 *   Schlauch  dasselbe ueber fuenf Querlagen der vollen Bahnbreite
 *   Rand      nur die beiden aeusseren Lagen - steht die Bausperre ueber
 *             der Farbe?
 *   Nutzung   wieviel der GEMALTEN Strasse an einer Bahn liegt. Der Rest
 *             ist Kulisse, und genau davon hatte der Spiralhain 62 %.
 *
 * **Und seit v214 den umgekehrten Fall.** Zeichnet das Spiel den Weg selbst
 * (`bildBringt.weg === false`), sind die vier Zahlen oben sinnlos - die Bahn
 * liegt dann von Bauart auf ihrer Strasse. Geprueft wird stattdessen die
 * WEGFREIHEIT: dass im Bild ueberhaupt keine Strasse gemalt ist. Gemessen
 * als Farbabstand zwischen dem Streifen unter der Bahn und dem Mittel der
 * Karte. Heute liegt er bei 85,0 / 79,2 / 33,3; ein Bild ohne Weg gehoert
 * unter 25.
 *
 * Dazu, was ein Bild sonst noch verletzen kann: Seitenverhaeltnis, reines
 * Schwarz, Helligkeit und Saettigung.
 *
 * **Die Grenzen stehen im Bildauftrag, Abschnitt 8b** - hier stehen sie
 * nicht ein zweites Mal, sondern werden von dort gelesen. Eine zweite
 * Fassung waere die Falle aus Regel 15, und diesmal an der Stelle, an der
 * eine Lieferung angenommen oder abgelehnt wird.
 *
 * Aufruf:
 *   npm run kartenprobe -- <bilddatei> <kartenkennung>
 *   npm run kartenprobe -- --bestand          den heutigen Vorrat messen
 *
 * Messstelle (Regel 12): Kandidatenbild auf 640 Punkte Breite, Bahnpunkte
 * alle 4 Weltpunkte, Querlagen bei -1, -0,5, 0, +0,5, +1 mal der oertlichen
 * halben Bahnbreite.
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { MAPS, lanePaths } from '../src/data/maps';
import { MAP_BACKGROUNDS } from '../src/gfx/assets/backgrounds';
import { WORLD_W as WELT_B, WORLD_H as WELT_H } from '../src/data/config';
import { abnahmegrenzen } from './auftrag';

const N = 640, H = Math.round(N * WELT_H / WELT_B);
const grenzen = abnahmegrenzen();

let fehler = 0;
const fail = (m: string): void => { console.error(`    FEHLER: ${m}`); fehler++; };
const warn = (m: string): void => { console.log(`    Hinweis: ${m}`); };

/** Alles, was ein Kartenbild ueber sich verraet. */
async function messen(bild: Buffer, kartenId: string): Promise<void> {
  const m = MAPS.find((q) => q.id === kartenId);
  if (!m) {
    fail(`Karte "${kartenId}" gibt es nicht. Bekannt: ${MAPS.map((q) => q.id).join(', ')}`);
    return;
  }
  const roh = sharp(bild);
  const meta = await roh.metadata();
  const { data } = await roh.clone()
    .resize(N, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  // --- Seitenverhaeltnis. Das Feld ist 16:9; ein anderes Bild wird verzerrt.
  const seiten = (meta.width ?? 0) / (meta.height ?? 1);
  const soll = WELT_B / WELT_H;
  console.log(`    Bild ${meta.width} x ${meta.height}, Seitenverhaeltnis `
    + `${seiten.toFixed(3)} gegen ${soll.toFixed(3)} verlangt`);
  if (Math.abs(seiten - soll) > 0.01) {
    fail(`Seitenverhaeltnis ${seiten.toFixed(3)} statt ${soll.toFixed(3)} - das Bild wird `
      + 'im Spiel verzerrt oder beschnitten.');
  }

  const farbe = (x: number, y: number): number[] => {
    const i = (y * N + x) * 3;
    return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
  };

  // --- Wegfarbe aus den Bahnpunkten, Gelaendefarbe als Mittel (wie im Tor).
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
  for (let i = 0; i < N * H; i++) {
    gr += data[i * 3] / 255; gg += data[i * 3 + 1] / 255; gb += data[i * 3 + 2] / 255;
  }
  gr /= N * H; gg /= N * H; gb /= N * H;
  const spanne = Math.hypot(wr - gr, wg - gg, wb - gb);
  const schwelle = spanne * 0.55;
  const istWeg = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= N || y >= H) return false;
    const c = farbe(x, y);
    return Math.hypot(c[0] - wr, c[1] - wg, c[2] - wb) < schwelle;
  };

  // **Bringt das Bild gar keinen Weg mit, wird die andere Frage gestellt.**
  //
  // Nicht "liegt die Bahn auf der Strasse" - es gibt keine -, sondern "ist
  // hier wirklich keine". Die Rechnung ist dieselbe wie die, aus der sonst
  // die Wegfarbe kommt: der Streifen unter der Bahn gegen das Mittel der
  // Karte. Wo nichts gemalt ist, ist der Abstand klein.
  if (!(m.bildBringt?.weg ?? true)) {
    const abstand = spanne * 255;
    console.log(`    Wegfreiheit: Farbabstand Bahn gegen Karte ${abstand.toFixed(1)}`
      + ` (erlaubt bis ${grenzen.wegfrei})`
      + `${abstand <= grenzen.wegfrei ? '' : ' <-- ZU VIEL'}`);
    if (abstand > grenzen.wegfrei) {
      fail(`Wegfreiheit ${abstand.toFixed(1)} Farbschritte, erlaubt sind ${grenzen.wegfrei} - `
        + 'im Bild ist eine Strasse gemalt. Das Spiel zeichnet seine eigene darueber, und '
        + 'dann stehen zwei nebeneinander.');
    }
    schwarzUndBaender(data);
    return;
  }

  // --- Liegt die Bahn auf der Strasse? Mitte, Schlauch, Rand.
  const LAGEN = [-1, -0.5, 0, 0.5, 1];
  bahnen.forEach((b, i) => {
    let drauf = 0, n = 0, begonnen = false;
    let sD = 0, sN = 0, rD = 0, rN = 0;
    for (let sw = 0; sw < b.length; sw += 4) {
      const p = b.at(sw);
      const x = Math.round(p.x * N / WELT_B), y = Math.round(p.y * N / WELT_B);
      if (x < 0 || y < 0 || x >= N || y >= H) continue;
      const mitte = istWeg(x, y);
      if (!begonnen) { if (!mitte) continue; begonnen = true; }
      n++; if (mitte) drauf++;
      const nx = Math.cos(p.angle + Math.PI / 2), ny = Math.sin(p.angle + Math.PI / 2);
      for (const l of LAGEN) {
        const qx = Math.round((p.x + nx * l * p.half) * N / WELT_B);
        const qy = Math.round((p.y + ny * l * p.half) * N / WELT_B);
        const tr = istWeg(qx, qy);
        sN++; if (tr) sD++;
        if (Math.abs(l) === 1) { rN++; if (tr) rD++; }
      }
    }
    if (!n) { fail(`Bahn ${i} beruehrt die gemalte Strasse nie.`); return; }
    const mitteA = drauf / n, schlauchA = sD / sN, randA = rD / rN;
    const zeichen = (a: number, g: number): string => (a >= g ? ' ' : ' <-- ZU WENIG');
    console.log(`    Bahn ${i}: Mitte ${(mitteA * 100).toFixed(1)} %`
      + `${zeichen(mitteA, grenzen.mitte)}  Schlauch ${(schlauchA * 100).toFixed(1)} %`
      + `${zeichen(schlauchA, grenzen.schlauch)}  Rand ${(randA * 100).toFixed(1)} %`
      + `${zeichen(randA, grenzen.rand)}`);
    if (mitteA < grenzen.mitte) {
      fail(`Bahn ${i}: Mitte ${(mitteA * 100).toFixed(1)} %, verlangt sind `
        + `${(grenzen.mitte * 100).toFixed(0)} % - die Bahn laeuft neben der gemalten Strasse.`);
    }
    if (schlauchA < grenzen.schlauch) {
      fail(`Bahn ${i}: Schlauch ${(schlauchA * 100).toFixed(1)} %, verlangt sind `
        + `${(grenzen.schlauch * 100).toFixed(0)} % - die Strasse ist schmaler als der Weg.`);
    }
    if (randA < grenzen.rand) {
      fail(`Bahn ${i}: Rand ${(randA * 100).toFixed(1)} %, verlangt sind `
        + `${(grenzen.rand * 100).toFixed(0)} % - die Bausperre steht ueber der Farbe.`);
    }
  });

  // --- Wieviel der gemalten Strasse wird ueberhaupt benutzt?
  let strasse = 0, nahBahn = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < N; x++) {
    if (!istWeg(x, y)) continue;
    strasse++;
    const wx = (x + 0.5) * WELT_B / N, wy = (y + 0.5) * WELT_H / H;
    // **Dieselbe Naehe wie `npm run wegdeckung`: 150 Weltpunkte zur
    // MITTELLINIE.** Die erste Fassung hier nahm `schlauchAbstand < 30` und
    // verglich das Ergebnis gegen die Grenze aus dem Auftragsdokument - also
    // eine strengere Messung gegen ein fremdes Soll. Die Zahlen lagen prompt
    // auseinander (56 gegen 38 auf dem Spiralhain), und wer beide sieht,
    // haelt eine davon fuer falsch. Regel 12: die Zahl traegt ihre
    // Messstelle mit, und wenn zwei Werkzeuge dieselbe Grenze pruefen,
    // muessen sie dasselbe messen.
    let nah = false;
    for (const p of bahnen) if (p.distanceTo(wx, wy) < 150) { nah = true; break; }
    if (nah) nahBahn++;
  }
  const nutzung = strasse ? nahBahn / strasse : 0;
  console.log(`    Gemalte Strasse ${((strasse / (N * H)) * 100).toFixed(1)} % der Karte, `
    + `davon in Bahnnaehe (150 Weltpunkte) ${(nutzung * 100).toFixed(1)} %`
    + `${nutzung >= grenzen.nutzung ? '' : ' <-- ZU WENIG'}`);
  if (nutzung < grenzen.nutzung) {
    fail(`Nutzung ${(nutzung * 100).toFixed(1)} %, verlangt sind `
      + `${(grenzen.nutzung * 100).toFixed(0)} % - der Rest ist Kulisse, und die ist von der `
      + 'echten Strasse nicht zu unterscheiden.');
  }

  schwarzUndBaender(data);
}

/** Was ein Bild sonst noch verletzen kann - beide Zweige brauchen es. */
function schwarzUndBaender(data: Buffer | Uint8Array): void {
  let schwarz = 0, hell = 0, satt = 0;
  for (let i = 0; i < N * H; i++) {
    const r = data[i * 3] / 255, g = data[i * 3 + 1] / 255, b = data[i * 3 + 2] / 255;
    if (r < 0.04 && g < 0.04 && b < 0.04) schwarz++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    hell += (mx + mn) / 2;
    satt += mx === mn ? 0 : (mx - mn) / (1 - Math.abs(mx + mn - 1));
  }
  const schwarzA = schwarz / (N * H), hellA = hell / (N * H), sattA = satt / (N * H);
  console.log(`    Reines Schwarz ${(schwarzA * 100).toFixed(1)} %, `
    + `Helligkeit ${hellA.toFixed(3)}, Saettigung ${sattA.toFixed(3)}`);
  if (schwarzA > 0.02) {
    warn(`reines Schwarz ${(schwarzA * 100).toFixed(1)} % - beim Packen wird es angehoben, `
      + 'aber am Bild waere es besser.');
  }
  // Helligkeit und Saettigung werden am GEBACKENEN Untergrund geprueft, nicht
  // hier: `bakeTerrain` zieht beide auf ihr Band. Die Rohwerte stehen
  // trotzdem da, weil ein sehr dunkles Bild seine Zeichnung nicht
  // zurueckbekommt (Regel 12: die Zahl traegt ihre Messstelle mit).
  console.log('    (Helligkeit und Saettigung werden am gebackenen Untergrund geprueft,');
  console.log('     `npm run grafiktor`. Die Rohwerte hier sagen nur, wieviel Zeichnung da ist.)');
}

const roh = process.argv.slice(2).filter((a) => !a.startsWith('--'));

if (process.argv.includes('--bestand')) {
  console.log('KARTENPROBE — der heutige Bildvorrat\n');
  for (const m of MAPS) {
    const d = (MAP_BACKGROUNDS as Record<string, string>)[m.id];
    if (!d) { console.log(`  ${m.name}: kein Bild.`); continue; }
    console.log(`  ${m.name}`);
    await messen(Buffer.from(d.split(',')[1], 'base64'), m.id);
    console.log('');
  }
} else if (roh.length === 2) {
  console.log(`KARTENPROBE — ${roh[0]} als ${roh[1]}\n`);
  await messen(readFileSync(roh[0]), roh[1]);
} else {
  console.error('Aufruf: npm run kartenprobe -- <bilddatei> <kartenkennung>');
  console.error('   oder npm run kartenprobe -- --bestand');
  console.error(`Kennungen: ${MAPS.map((q) => q.id).join(', ')}`);
  process.exit(1);
}

console.log(`\n  Grenzen aus dem Bildauftrag, Abschnitt 8b: Mitte ${(grenzen.mitte * 100).toFixed(0)} %, `
  + `Schlauch ${(grenzen.schlauch * 100).toFixed(0)} %, Rand ${(grenzen.rand * 100).toFixed(0)} %, `
  + `Nutzung ${(grenzen.nutzung * 100).toFixed(0)} %.`);
console.log('  Messstelle: Bild auf 640 Punkte Breite, Bahnpunkte alle 4 Weltpunkte,');
console.log('  Querlagen bei -1, -0,5, 0, +0,5 und +1 mal der oertlichen halben Bahnbreite,');
console.log('  Bahnnaehe 150 Weltpunkte zur Mittellinie - dieselbe wie `npm run wegdeckung`.');

if (fehler) {
  console.error(`\nKARTENPROBE: ${fehler} Fehler - so nicht einbauen.`);
  process.exit(1);
}
console.log('\nKARTENPROBE: alle Grenzen gehalten.');
