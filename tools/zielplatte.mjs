#!/usr/bin/env node
/**
 * Wo hat der Künstler das Ziel gebaut?
 *
 * Jede Karte bringt im Untergrundbild eine gemauerte Rundplattform mit -
 * Steinkranz, konzentrische Pflasterung, der Weg laeuft darauf zu. Das Spiel
 * hat sie bis v126 ignoriert: `goalOf` nahm schlicht den letzten Bahnpunkt,
 * und der liegt am RAND der Platte. Die Kristallfestung stand deshalb oben
 * links auf dem Rand statt in der Mitte.
 *
 * Dieses Werkzeug findet die Platte im Bild, statt dass jemand drei
 * Koordinaten abliest und einträgt. Eine abgelesene Zahl waere nach dem
 * naechsten `pack-art` still falsch - dieselbe Familie wie die veraltete
 * Zahl, die hier schon vier Runden weiterlief.
 *
 * Verfahren seit v234: gesucht wird der KRANZ, nicht die Farbe.
 *
 * Auf dem Rand einer Kreisscheibe zeigt der Helligkeitsverlauf RADIAL nach
 * aussen. Fels, Glutrisse und Gestruepp haben ebenso starke Kanten, aber
 * zufaellig gerichtete. Gemessen wird deshalb nicht "wieviel Kante", sondern
 * "wieviel davon zeigt vom Mittelpunkt weg". Das ist ein Kreisdetektor.
 *
 * **Damit faellt die Farbreferenz ersatzlos weg - und mit ihr zwei
 * Schwaechen, die vier Fassungen lang bekannt waren.**
 *
 * Die erste war die Trennschaerfe. Der alte Sucher verglich Farben gegen eine
 * Schwelle: die Platte ist aus Wegmaterial, also innen Weg und aussen
 * Gelaende. Auf grauer Asche faellt heller Schotter in dieselbe Schwelle wie
 * graues Pflaster, und die Guete brach auf 0,44 ein (v230). Erst ein
 * waermerer Farbton im naechsten Kartenbild brachte sie auf 0,96 - das
 * Werkzeug war repariert worden, indem man ihm ein leichteres Bild gab.
 *
 * Die zweite war ein Kreis: auf Karten OHNE gemalte Strasse (`bildBringt.weg
 * === false`) gibt es keine Bahnfarbe, also nahm der Sucher seine Referenz
 * aus der EINGETRAGENEN Platte - und suchte dann die Platte. Das war
 * abgesichert (eine um 300 Weltpunkte verschobene Annahme liess die Guete von
 * 0,94/0,79/0,89 auf 0,15/0,21/0,00 fallen), aber es blieb eine Suche, die
 * ihre Antwort zur Haelfte mitbrachte. Seit v233 stehen alle vier Karten auf
 * `weg: false`, es galt also fuer jede.
 *
 * Der Kranz braucht nichts davon. Gemessen findet er alle vier Platten auf
 * 12 bis 18 Weltpunkte genau, mit einer Rundheit von 0,98 bis 1,00.
 *
 * **Die Nullprobe trennt breiter als je zuvor (Regel 13).** Deckt man die
 * Platte mit einem Stueck Boden derselben Karte zu, faellt die Rundheit auf
 * 0,79 bis 0,82 und der beste Punkt springt 300 bis 1500 Weltpunkte weg. Die
 * Luecke zwischen 0,82 und 0,98 ist die Schwelle; die alte Farbguete streute
 * ueber 0,44 bis 1,00 und hatte keine.
 *
 * Aufruf: npm run zielplatte
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { abdruck } from './abdruck.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WELT_B = 1920, WELT_H = 1080;

/** Auf diese Breite wird zum Suchen verkleinert. Fein genug fuer eine Platte
 *  von rund 200 Weltpunkten, grob genug, dass die Suche in einer Sekunde
 *  durchlaeuft. */
const N = 300;

/** Das Gedaechtnis dieses Tors (siehe `tools/abdruck.mjs`).
 *
 *  Die Plattform steckt im KARTENBILD, die eingetragene Zahl kommt aus
 *  `maps.ts`. Aendert sich keines von beiden - und nicht dieses Werkzeug -,
 *  kann sich das Urteil nicht aendern. Gemessen 76 s je Lauf fuer eine
 *  Antwort, die seit v126 dieselbe ist (`docs/Towerfront-TOR-BILANZ.md`).
 *
 *  Die Modulliste wird NICHT aufgezaehlt, sondern aus dem Importgraphen
 *  abgeleitet. Eine Handliste war beim ersten Entwurf sofort unvollstaendig,
 *  und eine zu enge Liste ueberspringt stillschweigend. */
const gedaechtnis = abdruck('zielplatte', {
  werkzeug: 'tools/zielplatte.mjs',
  dateien: ['src/gfx/assets/backgrounds.ts'],
});
if (gedaechtnis.unveraendert) {
  console.log(`ZIELPLATTE: unveraendert (Abdruck ${gedaechtnis.kurz} ueber `
    + `${gedaechtnis.umfang} Dateien) - nichts zu rechnen.`);
  console.log('  Mit --frisch trotzdem rechnen.');
  process.exit(0);
}

const karten = [];
for (const m of readFileSync(join(ROOT, 'src/gfx/assets/backgrounds.ts'), 'utf8')
  .matchAll(/'([a-z]+)': 'data:image\/(?:webp|jpeg);base64,([^']+)'/g)) {
  karten.push({ id: m[1], buf: Buffer.from(m[2], 'base64') });
}

const { MAPS, goalOf, lanePaths } = await import('../src/data/maps.ts');

console.log('ZIELPLATTE\n');

for (const k of karten) {
  const H = Math.round(N * WELT_H / WELT_B);
  const { data } = await sharp(k.buf).resize(N, H, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const farbe = (x, y) => {
    const i = (y * N + x) * 3;
    return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
  };

  const karte = MAPS.find((m) => m.id === k.id);
  if (!karte) { console.log(`── ${k.id}: keine Karte dieses Namens.`); continue; }

  const suche = (data) => {
  // --- Der Verlauf: Betrag und Richtung, einmal fuer das ganze Bild.
  const L = (x, y) => {
    const i = (y * N + x) * 3;
    return (0.30 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255;
  };
  const gx = new Float32Array(N * H), gy = new Float32Array(N * H), gm = new Float32Array(N * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const a1 = L(x - 1, y - 1) + 2 * L(x - 1, y) + L(x - 1, y + 1)
        - L(x + 1, y - 1) - 2 * L(x + 1, y) - L(x + 1, y + 1);
      const b1 = L(x - 1, y - 1) + 2 * L(x, y - 1) + L(x + 1, y - 1)
        - L(x - 1, y + 1) - 2 * L(x, y + 1) - L(x + 1, y + 1);
      const i = y * N + x;
      gx[i] = -a1; gy[i] = -b1; gm[i] = Math.hypot(a1, b1);
    }
  }

  /** Wie rund ist die Kante auf dem Kreis um (x,y) mit Radius r?
   *
   *  Fuer 96 Winkel wird die staerkste Kante in einem schmalen Band um den
   *  Radius gesucht und gefragt, wieviel ihres Verlaufs RADIAL zeigt. Der
   *  Anteil ist die Rundheit: 1,0 heisst, jede Kante auf dem Ring steht
   *  senkrecht auf ihm - das kann nur ein Kreis. */
  const ring = (x, y, r) => {
    let radial = 0, stark = 0, n = 0;
    for (let a = 0; a < 96; a++) {
      const w = a / 96 * Math.PI * 2, cx = Math.cos(w), sy = Math.sin(w);
      let bestM = 0, bestR = 0;
      for (let d = -1.5; d <= 1.5; d += 0.75) {
        const px = Math.round(x + cx * (r + d)), py = Math.round(y + sy * (r + d));
        if (px < 1 || py < 1 || px >= N - 1 || py >= H - 1) continue;
        const i = py * N + px;
        if (gm[i] > bestM) { bestM = gm[i]; bestR = Math.abs(gx[i] * cx + gy[i] * sy); }
      }
      if (bestM > 0) { stark += bestM; radial += bestR; n++; }
    }
    if (n < 80) return null;
    return { rundheit: radial / Math.max(1e-6, stark), staerke: stark / n };
  };

  // Grobe Suche ueber Lage und Radius, dann eine feine um den Fund herum.
  // Ohne die feine kostet allein das Raster 13 Weltpunkte Genauigkeit, und
  // die gingen von den 40 ab, die die Eintragung danebenliegen darf.
  let best = null;
  const messen = (x, y, rw) => {
    const w = ring(x, y, rw * N / WELT_B);
    if (!w) return;
    const punkte = w.rundheit * w.staerke;
    if (!best || punkte > best.punkte) best = { punkte, x, y, rw, ...w };
  };
  for (let rw = 90; rw <= 170; rw += 8) {
    const r = rw * N / WELT_B;
    for (let y = Math.ceil(r) + 1; y < H - r - 1; y += 2) {
      for (let x = Math.ceil(r) + 1; x < N - r - 1; x += 2) messen(x, y, rw);
    }
  }
  if (!best) return null;
  {
    const g = { ...best };
    for (let rw = g.rw - 8; rw <= g.rw + 8; rw += 2) {
      for (let y = g.y - 3; y <= g.y + 3; y++) {
        for (let x = g.x - 3; x <= g.x + 3; x++) messen(x, y, rw);
      }
    }
  }
  return best;
  };

  const best = suche(data);
  if (!best) { console.log(`── ${k.id}: kein Kranz messbar.`); continue; }

  // **Die Nullprobe laeuft MIT, sie steht nicht daneben (Regel 13).**
  //
  // Die Rundheit trennt nur gegen ein Bild OHNE Platte - auf den
  // ausgelieferten Karten ist die Platte auch die staerkste Kante, also
  // findet der Sucher sie selbst dann, wenn man ihm die Richtungspruefung
  // ganz herausnimmt. Nachgefahren: mit `bestR = gm[i]` steht die Rundheit
  // auf 1,00, der Fund bleibt richtig, und das Tor meldet gruen. Eine
  // Gegenprobe kann das also nicht fangen - ihr fehlt das Bild ohne Platte.
  //
  // Deshalb stellt das Tor es sich selbst her: die Platte wird mit einem
  // Stueck Boden DERSELBEN Karte zugedeckt, und auf diesem Bild muss die
  // Rundheit unter die Schwelle fallen. Tut sie es nicht, misst die Zahl
  // nicht, was sie zu messen behauptet - und dann ist der Fund daneben
  // wertlos, so richtig er auch aussieht.
  let nullprobe = null;
  if (karte.ziel) {
    const W = N, HH = H;
    const cx = Math.round(karte.ziel.x * N / WELT_B), cy = Math.round(karte.ziel.y * N / WELT_B);
    const R = Math.round(200 * N / WELT_B);
    // Der Flicken kommt von drei Radien seitlich - weit genug weg von der
    // Platte, nah genug, dass es derselbe Boden ist.
    const qx = Math.max(0, Math.min(W - 2 * R, cx > W / 2 ? cx - 3 * R : cx + 3 * R));
    const qy = Math.max(0, Math.min(HH - 2 * R, cy - R));
    const zu = Buffer.from(data);
    for (let dy = 0; dy < 2 * R; dy++) {
      for (let dx = 0; dx < 2 * R; dx++) {
        const zx = cx - R + dx, zy = cy - R + dy;
        if (zx < 0 || zy < 0 || zx >= W || zy >= HH) continue;
        const von = ((qy + dy) * W + (qx + dx)) * 3, nach = (zy * W + zx) * 3;
        zu[nach] = data[von]; zu[nach + 1] = data[von + 1]; zu[nach + 2] = data[von + 2];
      }
    }
    nullprobe = suche(zu);
  }

  const wx = best.x * WELT_B / N, wy = best.y * WELT_B / N;
  console.log(`── ${k.id}`);
  console.log(`   Platte bei ${wx.toFixed(0)} : ${wy.toFixed(0)} `
    + `(Radius ${best.rw}, Rundheit ${best.rundheit.toFixed(2)}, `
    + `Kantenstaerke ${best.staerke.toFixed(3)})`);
  if (nullprobe) {
    console.log(`   Nullprobe (Platte zugedeckt): Rundheit ${nullprobe.rundheit.toFixed(2)} `
      + `bei ${(nullprobe.x * WELT_B / N).toFixed(0)}:${(nullprobe.y * WELT_B / N).toFixed(0)}`);
  }
  k.platte = { x: Math.round(wx), y: Math.round(wy), r: best.rw, guete: best.rundheit,
    null: nullprobe ? nullprobe.rundheit : null };
}

// --- Und stimmt die eingetragene Zahl noch mit dem Bild ueberein?
console.log('\nGegen die eingetragene Zielplattform:\n');

/** Wie weit die eingetragene Zahl vom gefundenen Mittelpunkt abweichen darf.
 *
 *  40 Weltpunkte ist knapp die Haelfte einer Turmbreite und deutlich unter dem
 *  Radius der Platte (90 bis 170) - eine Festung, die so weit daneben steht,
 *  steht immer noch drauf. Die Fehler, um die es geht, waren 99 bis 164. */
const ERLAUBT = 40;

/** Wie rund die Kante sein muss, damit sie ein Kranz ist.
 *
 *  Die Suche gibt IMMER einen besten Punkt zurueck - auch auf einem Bild
 *  ganz ohne Platte. Bis v215 war das ungeprueft: eine Karte ohne Plattform
 *  konnte gruen melden, solange der beste Zufallsfleck naeher als 40
 *  Weltpunkte an der eingetragenen Zahl lag. Genau die Verfallsart aus
 *  Regel 5.
 *
 *  **Seit v234 ist die Zahl die Rundheit, und sie trennt breiter als die
 *  alte Farbguete.** Gemessen liegen die vier Karten bei 0,98 bis 1,00.
 *  Deckt man die Platte mit einem Stueck Boden derselben Karte zu, faellt
 *  der beste Wert im ganzen Bild auf 0,79 bis 0,82 - und der Fund springt
 *  300 bis 1500 Weltpunkte weg. Zwischen 0,82 und 0,98 ist eine Luecke von
 *  sechzehn Hundertsteln; 0,90 liegt in ihrer Mitte.
 *
 *  Die alte Farbguete streute ueber 0,44 bis 1,00 und hatte keine solche
 *  Luecke - ihre Schwelle von 0,50 lag deshalb dicht am schlechtesten
 *  echten Fund. */
const GUETE_MINDEST = 0.90;
const TOR = process.argv.includes('--tor');
const befunde = [];

for (const k of karten) {
  const karte = MAPS.find((m) => m.id === k.id);
  if (!karte) continue;
  if (!k.platte) continue;
  if (!karte.ziel) {
    befunde.push(`${k.id}: keine Zielplattform eingetragen, im Bild liegt aber eine `
      + `bei ${k.platte.x}:${k.platte.y} (Guete ${k.platte.guete.toFixed(2)}).`);
    continue;
  }
  const d = Math.hypot(karte.ziel.x - k.platte.x, karte.ziel.y - k.platte.y);
  const roh = karte.lanes[0][karte.lanes[0].length - 1];
  const vorher = Math.hypot(roh.x - k.platte.x, roh.y - k.platte.y);
  console.log(`   ${k.id.padEnd(14)} eingetragen ${karte.ziel.x}:${karte.ziel.y}, `
    + `im Bild ${k.platte.x}:${k.platte.y}  →  ${d.toFixed(0)} daneben`
    + `   (Rohbahn endete ${vorher.toFixed(0)} daneben)`);
  if (d > ERLAUBT) {
    befunde.push(`${k.id}: eingetragen ${karte.ziel.x}:${karte.ziel.y}, im Bild aber `
      + `${k.platte.x}:${k.platte.y} - ${d.toFixed(0)} Weltpunkte auseinander `
      + `(erlaubt ${ERLAUBT}). Entweder ist das Kartenbild neu oder die Zahl veraltet.`);
  }
  // **Die Nullprobe ist eine Bedingung, keine Zeile.**
  //
  // Ist sie nicht erfuellt, hat die Rundheit oben nichts bewiesen: sie waere
  // dann eine Zahl, die auch ohne Platte hoch steht. Der Fund kann trotzdem
  // richtig sein - nur belegt ihn dann nichts.
  if (k.platte.null === null) {
    befunde.push(`${k.id}: keine Nullprobe moeglich (keine Zielplattform eingetragen) - `
      + 'die Rundheit oben ist damit unbelegt.');
  } else if (k.platte.null >= GUETE_MINDEST) {
    befunde.push(`${k.id}: die Nullprobe steht bei ${k.platte.null.toFixed(2)} und damit `
      + `ueber der Schwelle ${GUETE_MINDEST.toFixed(2)} - mit ZUGEDECKTER Platte findet der `
      + 'Sucher etwas ebenso Rundes. Dann misst die Rundheit nicht die Platte, sondern '
      + 'irgendeine Kante, und der Fund oben ist unbelegt (Regel 13).');
  } else if (k.platte.guete - k.platte.null < 0.10) {
    befunde.push(`${k.id}: zwischen Fund (${k.platte.guete.toFixed(2)}) und Nullprobe `
      + `(${k.platte.null.toFixed(2)}) liegen nur ${(k.platte.guete - k.platte.null).toFixed(2)} - `
      + 'zu wenig, um eine Schwelle dazwischenzulegen. Gemessen sind sonst 0,15 bis 0,21.');
  }
  if (k.platte.guete < GUETE_MINDEST) {
    befunde.push(`${k.id}: die beste Kante ist nicht rund (Rundheit `
      + `${k.platte.guete.toFixed(2)}, verlangt ${GUETE_MINDEST.toFixed(2)}) - im Bild `
      + 'liegt wahrscheinlich gar keine Rundplattform mit Steinkranz. Der Abstand oben '
      + 'sagt dann nichts, weil er zu einem Zufallsfleck gemessen ist.');
  }
}

if (befunde.length) {
  console.error(`\nZIELPLATTE: ${befunde.length} Befund(e)`);
  for (const b of befunde) console.error(`  - ${b}`);
  if (TOR) process.exit(1);
} else {
  console.log('\nZIELPLATTE: jede Karte steht auf ihrer Platte.');
  // Erst jetzt merken: ein rotes Tor hinterlaesst keinen Abdruck und rechnet
  // beim naechsten Mal wieder.
  gedaechtnis.merken();
}
