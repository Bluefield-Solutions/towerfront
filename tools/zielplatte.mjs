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
 * Verfahren: die Platte ist aus WEGMATERIAL, gross und rund. Fuer jeden
 * Mittelpunkt auf einem groben Raster wird gezaehlt, wieviel Wegmaterial
 * INNEN liegt und wieviel im Ring DRUM HERUM. Ein Weg ist innen Weg und
 * aussen auch; eine Platte ist innen Weg und aussen Gelaende. Genau diese
 * Differenz ist die Punktzahl.
 *
 * Die Wegfarbe wird aus den BAHNEN der Karte abgetastet, nicht angenommen.
 * Der erste Entwurf setzte "Weg = hell" - das stimmt fuer Spiralhain und
 * Ascheschlucht und ist auf der Frostspalte genau falsch herum: dort sind die
 * Wege dunkel auf hellem Schnee. Er fand die Platte deshalb 990 Weltpunkte
 * daneben, und die Zahl sah aus wie ein Befund ueber das Spiel, war aber
 * einer ueber mich (Regel 3: prueft, ob der Eingriff ankommt).
 *
 * **Karten ohne gemalte Strasse** (`bildBringt.weg === false`, seit v214
 * moeglich) haben keine Bahnfarbe - dort liegt Gelaende, und das Mittel aus
 * den Bahnpunkten waere das Mittel der Karte. Die Spanne faellt gegen null,
 * die Schwelle mit ihr, und die Suche findet Rauschen. Auf solchen Karten
 * kommt die Farbreferenz deshalb aus der eingetragenen Platte selbst.
 *
 * Das klingt nach einer Katze, die sich in den Schwanz beisst - ist es aber
 * nicht, und das ist GEMESSEN: verschiebt man die Annahme um 300 Weltpunkte,
 * faellt die Guete von 0,94 / 0,79 / 0,89 auf 0,15 / 0,21 / 0,00, und die
 * Suche landet 608 bis 1649 Weltpunkte daneben. Die Farbe stammt von der
 * Annahme, der Fund nicht. Damit eine leere Guete nicht als Fund durchgeht,
 * gibt es seit v216 zusaetzlich eine Untergrenze - fuer JEDE Karte, denn
 * "irgendwo ist das Beste" war bis dahin immer ein Ergebnis.
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

  // --- Die Farbreferenz. Woher sie kommt, haengt am Bild.
  const karte = MAPS.find((m) => m.id === k.id);
  if (!karte) { console.log(`── ${k.id}: keine Karte dieses Namens.`); continue; }
  const bahnen = lanePaths(karte);
  const malt = karte.bildBringt?.weg ?? true;
  let wr = 0, wg = 0, wb = 0, wn = 0;
  if (malt) {
    // Das Bild bringt die Strasse mit: die Platte ist aus demselben Stoff.
    for (const bahn of bahnen) {
      for (let t = 0.05; t < 0.95; t += 0.02) {
        const p = bahn.at(bahn.length * t);
        const x = Math.round(p.x * N / WELT_B), y = Math.round(p.y * N / WELT_B);
        if (x < 0 || y < 0 || x >= N || y >= H) continue;
        const [r, g, b] = farbe(x, y);
        wr += r; wg += g; wb += b; wn++;
      }
    }
  } else {
    // Das Spiel zeichnet die Strasse: im Bild ist die Platte das einzige
    // Pflaster. Referenz aus 100 Weltpunkten um die eingetragene Mitte.
    if (!karte.ziel) {
      console.log(`── ${k.id}: keine Zielplattform eingetragen - und ohne gemalte Strasse `
        + 'gibt es keine zweite Farbreferenz im Bild.');
      k.ohneReferenz = true;
      continue;
    }
    const zx = karte.ziel.x * N / WELT_B, zy = karte.ziel.y * N / WELT_B;
    const zr = 100 * N / WELT_B;
    for (let y = 0; y < H; y++) for (let x = 0; x < N; x++) {
      if (Math.hypot(x - zx, y - zy) > zr) continue;
      const [r, g, b] = farbe(x, y);
      wr += r; wg += g; wb += b; wn++;
    }
  }
  if (!wn) { console.log(`── ${k.id}: keine Farbreferenz abtastbar.`); continue; }
  wr /= wn; wg /= wn; wb /= wn;

  // Und die Gelaendefarbe: das Mittel ueber alles. Der Abstand zwischen
  // beiden setzt die Schwelle - je Karte, aus der Karte.
  let gr = 0, gg = 0, gb = 0;
  for (let i = 0; i < N * H; i++) { gr += data[i * 3] / 255; gg += data[i * 3 + 1] / 255; gb += data[i * 3 + 2] / 255; }
  gr /= N * H; gg /= N * H; gb /= N * H;
  const spanne = Math.hypot(wr - gr, wg - gg, wb - gb);
  const schwelle = spanne * 0.55;

  const istWeg = (x, y) => {
    if (x < 0 || y < 0 || x >= N || y >= H) return 0;
    const [r, g, b] = farbe(x, y);
    return Math.hypot(r - wr, g - wg, b - wb) < schwelle ? 1 : 0;
  };

  let best = null;
  // Die Platte ist gross: zwischen 90 und 170 Weltpunkten Radius.
  for (let rw = 90; rw <= 170; rw += 10) {
    const r = rw * N / WELT_B;
    for (let y = Math.ceil(r * 1.4); y < H - r * 1.4; y += 2) {
      for (let x = Math.ceil(r * 1.4); x < N - r * 1.4; x += 2) {
        let innen = 0, innenN = 0, ring = 0, ringN = 0;
        for (let dy = -Math.ceil(r * 1.4); dy <= r * 1.4; dy++) {
          for (let dx = -Math.ceil(r * 1.4); dx <= r * 1.4; dx++) {
            const d = Math.hypot(dx, dy);
            if (d <= r * 0.8) { innen += istWeg(x + dx, y + dy); innenN++; }
            else if (d >= r * 1.12 && d <= r * 1.4) { ring += istWeg(x + dx, y + dy); ringN++; }
          }
        }
        const punkte = innen / innenN - ring / ringN;
        if (!best || punkte > best.punkte) best = { punkte, x, y, r, rw };
      }
    }
  }

  const wx = best.x * WELT_B / N, wy = best.y * WELT_B / N;
  console.log(`── ${k.id}`);
  console.log(`   ${malt ? 'Wegfarbe (aus den Bahnen)' : 'Pflasterfarbe (aus der Platte)'} `
    + `rgb ${(wr*255).toFixed(0)},${(wg*255).toFixed(0)},${(wb*255).toFixed(0)}`
    + `  Gelaende rgb ${(gr*255).toFixed(0)},${(gg*255).toFixed(0)},${(gb*255).toFixed(0)}`
    + `  Spanne ${spanne.toFixed(2)}`);
  console.log(`   Platte bei ${wx.toFixed(0)} : ${wy.toFixed(0)} `
    + `(Radius ${best.rw}, Guete ${best.punkte.toFixed(2)})`);
  k.platte = { x: Math.round(wx), y: Math.round(wy), r: best.rw, guete: best.punkte };
}

// --- Und stimmt die eingetragene Zahl noch mit dem Bild ueberein?
console.log('\nGegen die eingetragene Zielplattform:\n');

/** Wie weit die eingetragene Zahl vom gefundenen Mittelpunkt abweichen darf.
 *
 *  40 Weltpunkte ist knapp die Haelfte einer Turmbreite und deutlich unter dem
 *  Radius der Platte (90 bis 170) - eine Festung, die so weit daneben steht,
 *  steht immer noch drauf. Die Fehler, um die es geht, waren 99 bis 164. */
const ERLAUBT = 40;

/** Wie deutlich die Platte sich abheben muss.
 *
 *  Die Suche gibt IMMER einen besten Punkt zurueck - auch auf einem Bild
 *  ganz ohne Platte. Bis v215 war das ungeprueft: eine Karte ohne Plattform
 *  konnte gruen melden, solange der beste Zufallsfleck naeher als 40
 *  Weltpunkte an der eingetragenen Zahl lag. Genau die Verfallsart aus
 *  Regel 5.
 *
 *  Gemessen liegen die drei Karten bei 0,94 / 0,79 / 0,89; eine um 300
 *  Weltpunkte verschobene Annahme faellt auf 0,15 / 0,21 / 0,00. Dazwischen
 *  ist Platz, und 0,50 liegt in der Mitte davon. */
const GUETE_MINDEST = 0.5;
const TOR = process.argv.includes('--tor');
const befunde = [];

for (const k of karten) {
  const karte = MAPS.find((m) => m.id === k.id);
  if (!karte) continue;
  if (k.ohneReferenz) {
    befunde.push(`${k.id}: das Bild bringt keine Strasse mit (bildBringt.weg === false) und `
      + 'die Karte traegt keine Zielplattform - damit ist im Bild nichts zu finden.');
    continue;
  }
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
  if (k.platte.guete < GUETE_MINDEST) {
    befunde.push(`${k.id}: die beste Stelle hebt sich kaum ab (Guete `
      + `${k.platte.guete.toFixed(2)}, verlangt ${GUETE_MINDEST.toFixed(2)}) - im Bild `
      + 'liegt wahrscheinlich gar keine gepflasterte Rundplattform. Der Abstand oben '
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
