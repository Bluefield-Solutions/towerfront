#!/usr/bin/env node
/**
 * Stimmt die gezeigte Baukante mit der Bauregel ueberein?
 *
 * Seit v203 wird die baubare Flaeche nicht mehr abgetastet, sondern
 * gezeichnet: `verbotenerBereich` baut aus Rand, Wegschlauch, Gelaendekreisen
 * und Tuermen EINEN Pfad, und die Kante dieses Pfades ist das, was der
 * Spieler sieht. Damit wandert die Frage von "ist das Raster fein genug" zu
 * "sagt der Pfad dasselbe wie `warumNicht`".
 *
 * Das ist eine Frage, die man beantworten kann - und dieses Werkzeug
 * beantwortet sie zweimal, weil eine Zahl allein nichts beweist (Regel 13):
 *
 *   1. **Deckung.** Zwanzigtausend gewuerfelte Punkte je Karte und Turmsorte.
 *      Fuer jeden wird `isPointInPath` gegen `warumNicht` gehalten. Wo beide
 *      verschieden urteilen, wird der REGELABSTAND mitgeschrieben: wie weit
 *      der Punkt von der Grenze der Regel weg liegt. Ein Punkt, der einen
 *      Zehntelpunkt neben der Kante anders beurteilt wird, ist die
 *      Pfeilhoehe zwischen zwei Kreisen; einer, der dreissig Punkte daneben
 *      anders beurteilt wird, ist ein Fehler.
 *
 *   2. **Nullprobe.** Dieselbe Messung mit einem absichtlich um sechs Punkte
 *      gewachsenen Pfad. Faellt sie nicht deutlich durch, misst die erste
 *      Messung nichts - sie wuerde eine falsche Kante bezeugen, ohne sie je
 *      geprueft zu haben.
 *
 * **Was hier NICHT gemessen wird, ist das Bild.** Ob die Kante ueberhaupt
 * gezeichnet wird, wie stark sie abdunkelt und ob die Landschaft darunter
 * stehen bleibt, misst die Bildabnahme (`npm run bildtor`, Pruefung TF-001) -
 * sie hat die Aufnahmen ohnehin schon. Es hier ein zweites Mal zu tun hat 20
 * der 24 Sekunden gekostet und waere die zweite Fassung derselben Frage
 * gewesen (Regel 15).
 *
 * Aufruf: npm run bauflaeche        Tabelle
 *         npm run bauflaeche --tor  prueft die Grenzen
 */
import { geruestStellen } from './leinwand.mjs';

const TOR = process.argv.includes('--tor');
/** Wieviele Punkte je Zeile gewuerfelt werden.
 *
 *  Zwoelfhundert, nicht zwanzigtausend. Seit Regel und Bild dieselben Kreise
 *  benutzen, ist die Deckung nicht mehr statistisch knapp, sondern exakt -
 *  gemessen 0,00 Promille auf allen drei Karten und allen vier Turmsorten.
 *  Was noch zu zeigen bleibt, ist die Empfindlichkeit, und die zeigt die
 *  Nullprobe bei jedem Lauf: ein um sechs Punkte danebenliegender Pfad
 *  erzeugt 35 Promille, also rund vierzig Treffer von zwoelfhundert.
 *  Zwanzigtausend haben dieselbe Aussage getroffen und dabei zweieinhalb
 *  Minuten gebraucht - ein Sechstel der ganzen Torkette. */
const PUNKTE = 1200;

/** Wieviel darf die gezeichnete Kante von der Regel abweichen?
 *
 *  Anteilig am Platzbedarf, nicht in absoluten Punkten (Regel 2): der Moerser
 *  braucht 116 Weltpunkte, der Bogenturm 96, und ein Fehler von einem Punkt
 *  bedeutet bei beiden nicht dasselbe. Ein Prozent des Platzbedarfs ist rund
 *  ein Weltpunkt - unterhalb dessen, was ein Finger treffen kann. */
const KANTE_ANTEIL = 0.01;
/** Und wieviele Punkte ueberhaupt anders beurteilt werden duerfen.
 *
 *  Gemessen sind es null - Regel und Bild sind dieselbe Rechnung, nicht zwei
 *  aehnliche. Was bleibt, ist die Rasterung von `isPointInPath` genau auf der
 *  Kante. Zwei Promille lassen dafuer Luft und sind trotzdem weit unter dem,
 *  was die Nullprobe erzeugt (35 Promille). */
const UNEINIG_PROMILLE = 2;

const KARTEN = ['spiralhain', 'ascheschlucht', 'frostspalte'];

/** Wie weit ist dieser Punkt von der Grenze der REGEL entfernt?
 *
 *  Fuer jede der vier Bedingungen der Abstand zu ihrer Schwelle; das Minimum
 *  ist der Abstand zur Regel insgesamt. Negativ heisst verboten. Das ist
 *  dieselbe Rechnung wie in `warumNicht`, nur ohne das `return` - deshalb
 *  steht sie hier und nicht im Spiel: das Spiel braucht ein Urteil, die
 *  Messung braucht den Abstand dazu. */
function regelAbstand(s, def, x, y, PATH_CLEARANCE, TOWERS) {
  const r = def.footprint / 2;
  let m = Math.min(x - r, y - r, 1920 - r - x, 1080 - r - y);
  for (const lane of s.lanes) {
    m = Math.min(m, lane.distanceTo(x, y) - (r + PATH_CLEARANCE + lane.halfNear(x, y)));
  }
  for (const g of s.map.rough) m = Math.min(m, Math.hypot(g.x - x, g.y - y) - (g.r + r));
  for (const t of s.towers) {
    m = Math.min(m, Math.hypot(t.x - x, t.y - y) - (r + TOWERS[t.def].footprint / 2 + 4));
  }
  return m;
}

/** Ein Wuerfel mit fester Folge - zwei Laeufe muessen dieselben Punkte
 *  treffen, sonst schwankt die Zahl statt zu messen. */
function wuerfel(saat) {
  let z = saat >>> 0;
  return () => {
    z = (z * 1664525 + 1013904223) >>> 0;
    return z / 4294967296;
  };
}

async function main() {
  const { TOWERS, TOWER_ORDER } = await import('../src/data/towers.ts');
  const { PATH_CLEARANCE } = await import('../src/data/maps.ts');
  const { verbotenerBereich } = await import('../src/gfx/bauflaeche.ts');
  const { createCanvas } = await import('@napi-rs/canvas');
  const messleinwand = createCanvas(8, 8).getContext('2d');

  const zeilen = [];
  let nullKante = 0, nullPromille = 0;

  // **Die Deckung braucht kein Bild.** Sie vergleicht zwei Rechnungen
  // miteinander, nicht zwei Aufnahmen - also auch keine Werkstatt, keine
  // Bilder, keinen Untergrund. Nur das Geruest, weil `Path2D` im Browser
  // global ist. Das ist der Unterschied zwischen 30 und 4 Sekunden, und die
  // Torkette hat 2,5 Minuten.
  geruestStellen();
  const { GameState } = await import('../src/game/state.ts');

  for (const karte of KARTEN) {
    const s = new GameState();
    s.reset(7, 'normal', karte);
    // Ein paar Tuerme, damit auch der vierte Grund im Pfad vorkommt.
    s.gold = 9999;
    {
      const wuerfelt = wuerfel(11);
      let gebaut = 0;
      for (let i = 0; i < 400 && gebaut < 5; i++) {
        if (s.build(wuerfelt() * 1920, wuerfelt() * 1080, 'arrow')) gebaut++;
      }
    }

    for (const id of TOWER_ORDER) {
      const def = TOWERS[id];
      const grenze = def.footprint * KANTE_ANTEIL;

      // Die Nullprobe braucht nur EINEN Turm je Karte - sie zeigt, dass die
      // Messung einen falschen Pfad ueberhaupt sieht, und das haengt nicht an
      // der Turmsorte.
      for (const wuchs of id === TOWER_ORDER[0] ? [0, 6] : [0]) {
        const pfad = verbotenerBereich(s, id, { wuchs });
        const wuerfelt = wuerfel(1234);
        let uneinig = 0, maxAbstand = 0;
        for (let i = 0; i < PUNKTE; i++) {
          const x = wuerfelt() * 1920, y = wuerfelt() * 1080;
          const imPfad = messleinwand.isPointInPath(pfad, x, y);
          const verboten = s.warumNicht(id, x, y) !== null;
          if (imPfad !== verboten) {
            uneinig++;
            const a = Math.abs(regelAbstand(s, def, x, y, PATH_CLEARANCE, TOWERS));
            if (a > maxAbstand) maxAbstand = a;
          }
        }
        const promille = (uneinig / PUNKTE) * 1000;
        if (wuchs === 0) zeilen.push({ karte, turm: def.name, promille, kante: maxAbstand, grenze });
        else { nullKante = Math.max(nullKante, maxAbstand); nullPromille = Math.max(nullPromille, promille); }
      }
    }
  }

  // **Und die Ablage: merkt die Kante, dass ein Turm dazugekommen ist?**
  //
  // Der fertige Pfad wird zwischengespeichert und nur bei `towersVersion`
  // verworfen. Eine Ablage, die zu selten leert, ist die stillste Art, falsch
  // zu liegen: das Bild sieht richtig aus, nur eben eine Runde zu alt. Also
  // gefragt: derselbe Fleck vor und nach einem Turm.
  let ablage = 'nicht geprueft';
  {
    const s = new GameState();
    s.reset(7, 'normal', 'spiralhain');
    s.gold = 9999;
    const wuerfelt = wuerfel(5);
    let punkt = null;
    for (let i = 0; i < 500 && !punkt; i++) {
      const x = wuerfelt() * 1920, y = wuerfelt() * 1080;
      if (s.warumNicht('arrow', x, y) === null) punkt = { x, y };
    }
    if (!punkt) throw new Error('Kein freier Fleck auf dem Spiralhain - das kann nicht sein.');
    const vorher = messleinwand.isPointInPath(verbotenerBereich(s, 'arrow'), punkt.x, punkt.y);
    // Nullprobe der Nullprobe: ohne Bau muss dieselbe Frage dasselbe sagen.
    const nochmal = messleinwand.isPointInPath(verbotenerBereich(s, 'arrow'), punkt.x, punkt.y);
    if (!s.build(punkt.x, punkt.y, 'arrow')) throw new Error('Turm liess sich nicht bauen.');
    const nachher = messleinwand.isPointInPath(verbotenerBereich(s, 'arrow'), punkt.x, punkt.y);
    ablage = (!vorher && !nochmal && nachher) ? 'in Ordnung'
      : `FEHLER (vorher ${vorher}, nochmal ${nochmal}, nachher ${nachher})`;
  }

  console.log(`\nBaukante gegen Bauregel — ${PUNKTE} Punkte je Zeile\n`);
  console.log('Karte           Turm            uneinig    Kantenfehler   Grenze');
  for (const z of zeilen) {
    console.log(`${z.karte.padEnd(15)}${z.turm.padEnd(16)}`
      + `${z.promille.toFixed(2)} ‰`.padEnd(11)
      + `${z.kante.toFixed(2)} P`.padEnd(15)
      + `${z.grenze.toFixed(2)} P`);
  }
  console.log(`\nAblage: ein neu gebauter Turm erscheint sofort in der Kante - ${ablage}.`);
  console.log(`Nullprobe (Pfad um 6 Punkte gewachsen): ${nullPromille.toFixed(1)} ‰ uneinig, `
    + `Kantenfehler bis ${nullKante.toFixed(1)} Weltpunkte.`);

  if (!TOR) return;

  const fehler = [];
  for (const z of zeilen) {
    if (z.kante > z.grenze) {
      fehler.push(`${z.karte}/${z.turm}: die gezeichnete Kante liegt bis zu `
        + `${z.kante.toFixed(2)} Weltpunkte neben der Regel (erlaubt ${z.grenze.toFixed(2)}).`);
    }
    if (z.promille > UNEINIG_PROMILLE) {
      fehler.push(`${z.karte}/${z.turm}: ${z.promille.toFixed(1)} ‰ der Punkte werden `
        + `anders beurteilt als von der Regel (erlaubt ${UNEINIG_PROMILLE}).`);
    }
  }
  if (ablage !== 'in Ordnung') {
    fehler.push(`Die Ablage der Baukante leert nicht: ${ablage}. Ein gebauter Turm `
      + 'aendert die gezeigte Flaeche erst beim naechsten Anlass.');
  }
  if (nullPromille <= UNEINIG_PROMILLE) {
    fehler.push('Die Nullprobe schlaegt nicht an: ein um sechs Punkte falscher Pfad '
      + 'faellt dieser Messung nicht auf. Dann bezeugt sie die Kante, statt sie zu pruefen.');
  }

  if (fehler.length) {
    console.log('\nFEHLER');
    for (const f of fehler) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log('\nBaukante: in Ordnung.');
}

main();
