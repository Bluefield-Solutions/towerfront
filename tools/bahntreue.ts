/** Laeuft die Bahn auf ihrer Strasse - und wird jede Kante des Netzes je
 *  befahren? (v149, neu gefasst in v335)
 *
 *  **Zwei Fragen, und seit v233 traegt nur noch die zweite.** Die erste ist
 *  die urspruengliche: laeuft die Bahn auf der GEMALTEN Strasse. Sie hat
 *  keinen Gegenstand mehr, seit keine Karte eine malt - das Tor sagt es
 *  selbst und steht nur noch da, weil `bildBringt.weg` ein Schalter je Karte
 *  ist und die naechste Karte ihn wieder umlegen kann (D30).
 *
 *  Die zweite ist ihre moderne Form und steht seit v335 daneben: **liegt
 *  jede Kante des `wegnetz` in mindestens einer Weichenstellung auf einer
 *  Route?** Der Weg wird heute aus den Bahnen GEZEICHNET, also laeuft die
 *  Bahn von Bauart auf ihrer Strasse - das ist keine Messung mehr (die
 *  Lehre aus v214). Ob eine eingetragene Kante je an die Reihe kommt, ist
 *  dagegen nicht von Bauart wahr: eine Kante, die in keiner Stellung
 *  vorkommt, wird nie gezeichnet und nie belaufen. Sie ist Kulisse in den
 *  DATEN, und eine Weiche, die auf sie zeigt, waere eine Wahl ohne Folgen.
 *
 *  Damit hat D30 nach 36 Fassungen wieder etwas, das anschlagen kann.
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
/** Wieviele Karten dieses Tor wirklich gemessen hat. Steht die Zahl auf null,
 *  hat es keinen Gegenstand - und dann darf es nichts behaupten (Regel 5). */
let gemessen = 0;
/** Wieviele Karten mit einem Wegnetz gemessen wurden (v335, S-N7-01). */
let netzGemessen = 0;
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
  // **Ohne gemalte Strasse gibt es nichts, worauf die Bahn laufen koennte.**
  //
  // Dieses Tor fragt: liegt der Bahnschlauch auf der Farbe, die man sieht?
  // Zeichnet das Spiel den Weg selbst, ist die Antwort von Bauart ja - der
  // Weg IST die Bahn. Die Frage, die dann bleibt, stellt `npm run
  // kartenprobe` (ist wirklich keine Strasse gemalt?) und `npm run
  // wegdeckung` (steht der gezeichnete Weg richtig auf seinem Boden?).
  //
  // Ohne diesen Zweig misst das Tor den Farbabstand einer Strasse, die es
  // nicht gibt, und meldet 2 % statt 100 - eine Zahl ueber sich selbst.
  if (!(m.bildBringt?.weg ?? true)) {
    console.log(`  ${m.name.padEnd(15)} zeichnet seinen Weg selbst - hier ist nichts zu messen.`);
    continue;
  }
  gemessen++;
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

// ------------------------------------------------------------ Das NETZ
//
// **Was dieses Tor seit v233 wirklich messen kann** (v335, S-N7-01, D30).
//
// Die alte Frage - laeuft die Bahn auf der GEMALTEN Strasse - hat seit v233
// keinen Gegenstand: keine Karte malt mehr eine. Die neue Frage stellt
// dasselbe eine Ebene tiefer und hat einen: **wird jede Kante des Netzes
// ueberhaupt je befahren?**
//
// Der Weg wird gezeichnet, und zwar aus den BAHNEN der gerade gestellten
// Weichen (`terrainAuftrag(s.map, s.lanes, ...)`). Ob die Bahn auf ihrer
// Strasse laeuft, ist damit von Bauart wahr - genau die Art Zahl, vor der
// v214 gewarnt hat ("von Bauart auf 100 %"). Was NICHT von Bauart wahr ist:
// dass jede eingetragene Kante in mindestens einer Weichenstellung auf einer
// Route liegt. Eine Kante, die in keiner Stellung vorkommt, wird nie
// gezeichnet und nie befahren - sie ist Kulisse in den DATEN, und der
// Begriff ist damit derselbe wie in D28, nur an der Stelle, an der es ihn
// heute gibt.
//
// Gefahren werden ALLE Stellungen (hoechstens vier je Karte, gemessen).
// Stellungen, die eine Bahn ganz zumachen, zaehlen nicht mit - dass es sie
// gibt, faengt der Weichenfenster-Waechter (S-N2-04), und hier waeren sie
// eine zweite Wahrheit darueber (Regel 15).
{
  const { WEGNETZ, gesperrteKanten, tore } = await import('../src/data/wegnetz');
  const { kuerzesteRoute, kantenLaenge } = await import('../src/core/route');
  console.log('\nNetzdeckung - welche Kante wird in IRGENDEINER Weichenstellung befahren:');
  for (const m of MAPS) {
    const netz = WEGNETZ[m.id];
    if (!netz) continue;
    const weichen = netz.weichen ?? [];
    const benutzt = new Set<string>();
    let stellungen = 0;
    for (let maske = 0; maske < (1 << weichen.length); maske++) {
      const gestellt = new Set(weichen.filter((_, i) => (maske >> i) & 1).map((w) => w.id));
      const gesperrt = gesperrteKanten(netz, gestellt);
      const routen = tore(netz).map((t) => kuerzesteRoute(netz, t.id, gesperrt));
      // Eine Stellung, die auch nur ein Tor zumacht, gibt es im Spiel nicht:
      // `weicheStellen` nimmt sie zurueck. Sie darf hier also auch keine
      // Kante als "befahren" beisteuern.
      if (routen.some((r) => !r)) continue;
      stellungen++;
      for (const r of routen) for (const k of r!) benutzt.add(k);
    }
    let ganz = 0;
    let tot = 0;
    const tote: string[] = [];
    for (const k of netz.kanten) {
      const l = kantenLaenge(netz, k);
      ganz += l;
      if (!benutzt.has(k.id)) { tot += l; tote.push(k.id); }
    }
    const anteil = ganz > 0 ? (1 - tot / ganz) * 100 : 0;
    console.log(`  ${m.name.padEnd(15)} ${benutzt.size}/${netz.kanten.length} Kanten, `
      + `${anteil.toFixed(1)} % der Netzlaenge befahrbar `
      + `(${stellungen} von ${1 << weichen.length} Stellungen spielbar)`
      + (tote.length ? `   TOT: ${tote.join(', ')}` : ''));
    // **Eine Zahl ohne Spielraum trennt nichts** (Regel 13): ein Netz ohne
    // Kanten meldet 0 % und saehe aus wie ein Befund, ist aber ein leeres
    // Blatt.
    if (netz.kanten.length === 0) {
      console.error(`  FEHLER: das Netz von ${m.name} hat keine Kante - dann misst die `
        + 'Zeile darueber nichts.');
      fehler++;
    } else if (tote.length) {
      console.error(`  FEHLER: ${m.name} traegt ${tote.length} Kante(n), die in KEINER `
        + `Weichenstellung befahren werden (${tote.join(', ')}). Sie werden nie `
        + 'gezeichnet und nie belaufen - Kulisse in den Daten, und eine Weiche, die '
        + 'auf sie zeigt, waere eine Wahl ohne Folgen.');
      fehler++;
    }
    netzGemessen++;
  }
  if (netzGemessen === 0) {
    console.error('  FEHLER: keine Karte hat ein Wegnetz - dann misst dieser Block nichts '
      + '(Regel 5).');
    fehler++;
  }
}

// **Seit v233 hat die ERSTE Haelfte dieses Tores keinen Gegenstand mehr.**
//
// Es misst, ob eine Bahn auf der GEMALTEN Strasse laeuft. Mit der
// Ascheschlucht ist die letzte Karte auf `weg: false` gegangen; es gibt im
// ganzen Spiel keine gemalte Strasse mehr, von der eine Bahn rutschen
// koennte. Bis hierher meldete es dazu "keine Bahn ist schlechter geworden",
// und das las sich wie ein bestandener Beweis ueber vier Karten.
//
// Eine Pruefung, die nie etwas melden kann, ist keine (Regel 5). Stehen
// bleibt es trotzdem: `bildBringt.weg` ist ein Schalter je Karte, und die
// naechste Karte kann ihn wieder umlegen - dann greift es sofort. Nur
// behaupten darf es nichts.
if (gemessen === 0) {
  console.log('\n  KEIN GEGENSTAND: keine der vier Karten malt noch eine Strasse');
  console.log('  (alle stehen auf `bildBringt.weg = false`, seit v233). Dieses Tor');
  console.log('  misst damit NICHTS - es ist nicht bestanden, es ist gegenstandslos.');
  console.log('  Es bleibt stehen, weil der Schalter je Karte gilt: legt eine neue');
  console.log('  Karte ihn wieder um, greift es im selben Lauf. Was den gezeichneten');
  console.log('  Weg heute prueft, sind `npm run kartenprobe` (ist wirklich keine');
  console.log('  Strasse gemalt?) und `npm run wegdeckung` (steht er auf seinem Boden?).');
} else {
  console.log('\n  Der Schlauch liegt auf jeder gemessenen Bahn unter 52 % und sein Rand\n'
    + '  unter 21 %: die Bausperre steht rundherum ueber der Farbe, die man sieht.\n'
    + '  Das ist kein Fehler der Bahnen, sondern der Breiten - die gemalten\n'
    + '  Strassen tragen rund 60 Weltpunkte, die Schlaeuche 80 bis 162.');
  console.log('\n  Messstelle: gepacktes Kartenbild auf 640 Punkte Breite, Bahnpunkte alle 4 '
    + 'Weltpunkte,\n  Schwelle 0,55 des Farbabstands zwischen Weg und Gelaende, Querlagen bei\n'
    + '  -1, -0,5, 0, +0,5 und +1 mal der oertlichen halben Bahnbreite.');
}

if (fehler) { console.error(`\nBAHNTREUE: ${fehler} Fehler.`); if (TOR) process.exit(1); }
else if (gemessen === 0) {
  // **Nicht mehr "gegenstandslos"** (v335, S-N7-01). Die Frage nach der
  // gemalten Strasse hat keinen Gegenstand mehr, die nach dem NETZ schon -
  // und die ist seit diesem Lauf gemessen. D30 ist damit nach 36 Fassungen
  // wieder etwas, das anschlagen kann.
  console.log(`\nBAHNTREUE: keine Karte malt eine Strasse; das Netz ist auf `
    + `${netzGemessen} Karten vollstaendig befahrbar.`);
} else {
  console.log(`\nBAHNTREUE: keine der ${gemessen} gemessenen Bahnen ist schlechter `
    + `geworden; das Netz ist auf ${netzGemessen} Karten vollstaendig befahrbar.`);
}
