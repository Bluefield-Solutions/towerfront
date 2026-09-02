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
 *  **Und seit v210 nicht mehr nur die Mittellinie (D28-E).** Die alte
 *  Messung fragte fuer jeden Bahnpunkt: liegt ER auf Wegfarbe? Der
 *  Spiralhain stand damit auf 100 %. Ein Gegner ist aber kein Punkt, und
 *  die Bausperre um die Bahn erst recht nicht: beide haengen an der BREITE.
 *  Nachgemessen liegt der Bahnschlauch auf 98 bis 100 % seiner Laenge
 *  ueber die gemalte Strasse hinaus - die Strasse traegt rund 60
 *  Weltpunkte, die Schlaeuche messen 80 bis 162. Die Mittellinie konnte das
 *  nicht sehen, und deshalb hat es niemand gesehen.
 *
 *  Gemessen wird jetzt beides: die Mitte wie bisher (eigene Ratsche, damit
 *  der alte Beweis nicht verlorengeht) und der SCHLAUCH ueber fuenf
 *  Querlagen bei -1, -0,5, 0, +0,5 und +1 mal der oertlichen halben Breite.
 *  Die Randlage allein steht daneben, weil sie die Frage beantwortet, um
 *  die es geht: steht die Bausperre ueber der Farbe?
 *
 *  Aufruf: npx tsx tools/bahntreue.ts [--tor]
 *
 *  Messstelle (Regel 12): gepacktes Kartenbild auf 640 Punkte Breite,
 *  Bahnpunkte alle 4 Weltpunkte, Schwelle 0,55 des Farbabstands,
 *  Querlagen als Vielfache der oertlichen halben Bahnbreite. */
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
 *  wird es nicht". Gemessen am 24.08.2026, nach `npm run bahnfit`.
 *
 *  Vorher (v149, gleiche Messung): 98,0 / 79,0 / 89,5 / 67,3 / 69,1 / 75,7. */
const RATSCHE: Record<string, number[]> = {
  spiralhain: [1.0],
  ascheschlucht: [0.943, 1.0, 0.824],
  frostspalte: [0.801, 0.843],
};
/** Dasselbe fuer den SCHLAUCH - fuenf Querlagen statt nur der Mitte.
 *
 *  Die Zahlen sind niedrig, und das ist der Befund, nicht ein Mangel der
 *  Messung: der Schlauch ist breiter als die Strasse, auf der er liegt. Eine
 *  gemeinsame Untergrenze haette hier nichts zu suchen - solange die
 *  Kartenbilder ihre Strassen 60 Weltpunkte breit malen und die Bahnen 80
 *  bis 162 messen, KANN keine Karte hoch liegen. Was gilt, ist "nicht
 *  weniger als heute", bis Schritt C von D28 breitere Strassen bringt.
 *
 *  Gemessen am 02.09.2026. */
const RATSCHE_SCHLAUCH: Record<string, number[]> = {
  spiralhain: [0.515],
  ascheschlucht: [0.451, 0.501, 0.441],
  frostspalte: [0.439, 0.484],
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
    // Gezaehlt wird erst AB DEM ERSTEN KONTAKT mit der Strasse.
    //
    // Der Bahnanfang liegt bewusst vor der Bildkante, und die gemalte
    // Strasse beginnt erst ein Stueck weiter drinnen - dazwischen liegt die
    // Zuwegung, auf der es nichts zu treffen gibt. Die erste Fassung dieser
    // Messung zaehlte sie mit und meldete deshalb auf der Frostspalte "520
    // Weltpunkte am Stueck daneben". Nachgesehen lagen die grossen
    // Abweichungen alle am Kartenrand: von (-44,1076) bis (520,1060), also
    // auf genau dieser Zuwegung.
    //
    // Das war kein Befund des Spiels, sondern einer der Messung. Was zaehlt,
    // ist die Strecke, auf der es eine Strasse zu treffen GIBT.
    let drauf = 0, n = 0, laengsteLuecke = 0, luecke = 0, begonnen = false;
    // Der Schlauch: fuenf Querlagen je Bahnpunkt, als Vielfache der
    // OERTLICHEN halben Breite - eine feste Zahl waere bei der naechsten
    // Karte still bedeutungslos (Regel 2).
    const LAGEN = [-1, -0.5, 0, 0.5, 1];
    let schlauchDrauf = 0, schlauchN = 0, randDrauf = 0, randN = 0;
    for (let sw = 0; sw < b.length; sw += 4) {
      const p = b.at(sw);
      const x = Math.round(p.x * N / WELT_B), y = Math.round(p.y * N / WELT_B);
      if (x < 0 || y < 0 || x >= N || y >= H) continue;
      const drauf1 = istWeg(x, y);
      if (!begonnen) { if (!drauf1) continue; begonnen = true; }
      n++;
      if (drauf1) { drauf++; if (luecke > laengsteLuecke) laengsteLuecke = luecke; luecke = 0; }
      else luecke += 4;
      const nx = Math.cos(p.angle + Math.PI / 2), ny = Math.sin(p.angle + Math.PI / 2);
      for (const l of LAGEN) {
        const qx = Math.round((p.x + nx * l * p.half) * N / WELT_B);
        const qy = Math.round((p.y + ny * l * p.half) * N / WELT_B);
        const treffer = istWeg(qx, qy);
        schlauchN++; if (treffer) schlauchDrauf++;
        if (Math.abs(l) === 1) { randN++; if (treffer) randDrauf++; }
      }
    }
    if (!n) { console.log(`  ${m.name} Bahn ${i}: beruehrt die Strasse nie.`); return; }
    if (luecke > laengsteLuecke) laengsteLuecke = luecke;
    const anteil = drauf / n;
    const soll = RATSCHE[m.id]?.[i];
    const schlecht = soll !== undefined && anteil < soll - TOLERANZ;
    const schlauch = schlauchN ? schlauchDrauf / schlauchN : 0;
    const rand = randN ? randDrauf / randN : 0;
    const sollS = RATSCHE_SCHLAUCH[m.id]?.[i];
    const schlechtS = sollS !== undefined && schlauch < sollS - TOLERANZ;
    console.log(`  ${m.name.padEnd(15)} Bahn ${i}: Mitte ${(anteil * 100).toFixed(1)} %, `
      + `Schlauch ${(schlauch * 100).toFixed(1)} %, Rand ${(rand * 100).toFixed(1)} % auf der Strasse, `
      + `laengste Abweichung ${laengsteLuecke} Weltpunkte am Stueck`
      + `${soll !== undefined ? `   (Ratsche ${(soll * 100).toFixed(1)} / `
        + `${sollS !== undefined ? (sollS * 100).toFixed(1) : '-'} %)` : ''}`
      + `${schlecht || schlechtS ? '   SCHLECHTER' : ''}`);
    if (sollS === undefined) {
      fail(`${m.name} Bahn ${i}: kein Ratschenwert fuer den Schlauch eingetragen - dann `
        + 'prueft diese Messung nichts. Wer eine Bahn hinzufuegt, traegt ihn nach.');
    } else if (schlechtS) {
      fail(`${m.name} Bahn ${i}: vom Bahnschlauch liegen nur noch `
        + `${(schlauch * 100).toFixed(1)} % auf der gemalten Strasse, vorher `
        + `${(sollS * 100).toFixed(1)} %. Die Bausperre steht dann noch weiter ueber `
        + 'dem, was man sieht.');
    }
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
  console.log('  Auf der Frostspalte laufen beide Bahnen stellenweise noch neben dem');
  console.log('  gemalten Weg, laengstens 164 Weltpunkte am Stueck. Was dort bleibt, ist');
  console.log('  keine Ungenauigkeit mehr, sondern eine Frage an den Kartenentwurf:');
  console.log('  welche der gemalten Strassen die Bahn nehmen soll (`bahnfit --umleiten`');
  console.log('  zeigt die Alternative, macht die Bahn aber ein Viertel laenger).');
}

console.log('\n  Der Schlauch liegt auf jeder Bahn unter 52 % und sein Rand unter 21 %: die\n'
  + '  Bausperre steht rundherum ueber der Farbe, die man sieht. Das ist kein\n'
  + '  Fehler der Bahnen, sondern der Breiten - die gemalten Strassen tragen rund\n'
  + '  60 Weltpunkte, die Schlaeuche 80 bis 162. Zu loesen mit Schritt C von D28\n'
  + '  (breitere Strassen malen), nicht hier. Steht als D28-E im Verzeichnis.');
console.log('\n  Messstelle: gepacktes Kartenbild auf 640 Punkte Breite, Bahnpunkte alle 4 '
  + 'Weltpunkte,\n  Schwelle 0,55 des Farbabstands zwischen Weg und Gelaende, Querlagen bei\n'
  + '  -1, -0,5, 0, +0,5 und +1 mal der oertlichen halben Bahnbreite.');

if (fehler) { console.error(`\nBAHNTREUE: ${fehler} Fehler.`); if (TOR) process.exit(1); }
else console.log('\nBAHNTREUE: keine Bahn ist schlechter geworden.');
