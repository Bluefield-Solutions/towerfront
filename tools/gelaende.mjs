#!/usr/bin/env node
/**
 * Was ist das eigentlich, was da im Weg steht?
 *
 * `map.rough` sind Kreise, in denen nicht gebaut werden darf - und seit v134
 * reagieren sie auf Beruehrung. Alle gleich: ein Stoss Teilchen in den
 * Kartenfarben, egal ob man auf Pflaster, Asche oder Eis tippt.
 *
 * Der naheliegende Plan war, jedem Kreis eine ART zu geben - Fels, Dickicht,
 * Wasser - und dann Staub, Blaetter oder Spritzer fliegen zu lassen. Der
 * Kontaktbogen (`bilder/gelaende.png`) hat den Plan erledigt: die Kreise sind
 * keine Felsen, Dickichte und Teiche. Sie sind Bausperren, von Hand ueber
 * Wege, Mauern, Ruinen, Lavarisse und Schneefelder gelegt. Wer ihnen eine
 * dieser drei Arten zuschreibt, erfindet Daten und laesst sie anschliessend
 * von einem Tor bewachen (Regel 10).
 *
 * Was das Bild dagegen WIRKLICH beantwortet, sind drei Fragen - und aus denen
 * laesst sich die Reaktion ableiten:
 *
 *   1. Welche Farbe hat der Fleck? (Asche grau, Lehm rot, Eis blau)
 *   2. Ist er heller als seine Karte? Dann ist es Stein oder Pflaster - hart,
 *      es splittert, es staubt nicht.
 *   3. Ist er blauer als seine Karte, UND ist die Karte ueberhaupt kalt?
 *      Dann ist es Eis oder Wasser - es spritzt.
 *
 * Alles anteilig zur eigenen Karte gemessen (Regel 2): "heller als diese
 * Karte", nicht "hell". Sonst waere auf der Frostspalte alles hart und auf
 * der Ascheschlucht nichts.
 *
 * Die Zahlen werden in `maps.ts` eingetragen und von hier aus nachgeprueft -
 * derselbe Weg wie bei der Zielplattform. Eine abgelesene Zahl waere nach dem
 * naechsten `pack-art` still falsch.
 *
 * Aufruf: npm run gelaende          Tabelle, Kontaktbogen, Block zum Eintragen
 *         npm run gelaende --tor    prueft die eingetragenen Werte gegen das Bild
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WELT_B = 1920, WELT_H = 1080;
const TOR = process.argv.includes('--tor');

/** Aufloesung der Abtastung. Der kleinste Kreis hat 25 Weltpunkte Radius,
 *  das sind hier 6 Bildpunkte - genug fuer einen Mittelwert, und fein genug,
 *  dass ein Kreis nicht in seine Nachbarschaft ausblutet. */
const N = 480;

/** Wieviel heller als die eigene Karte ein Fleck sein muss, um als hart zu
 *  gelten. Der Abstand ist gemessen, nicht gesetzt: die hellen Pflasterflecke
 *  liegen bei +0,08 bis +0,19, alles andere unter +0,05. Die Schwelle sitzt
 *  in der Luecke. */
const HART_AB = 0.06;
/** Und wieviel blauer fuer kalt.
 *
 *  **Die 0,07 waren falsch gesetzt, und v234 hat es gemessen.** Sie
 *  stammten aus einer Zeit mit einem anderen Frostbild; am heutigen liegen
 *  ALLE ZEHN Flecken der Frostspalte zwischen +0,052 und +0,114 - eine
 *  gleichartige Gruppe ohne jede Luecke, und die Schwelle schnitt sie
 *  mitten durch. Vier Eisflaechen hiessen deshalb "locker" wie loses
 *  Geroell, waehrend ihre Nachbarn "kalt" hiessen; auf dem Kontaktbogen ist
 *  es dasselbe Eis.
 *
 *  Die Luecke liegt woanders: der naechste Wert auf einer KALTEN Karte ist
 *  +0,011 (Ascheschlucht - `mBlau` steht dort mit 0,002 knapp im Positiven).
 *  Zwischen 0,011 und 0,052 ist Platz, und 0,03 liegt darin.
 *
 *  Auf warmen Karten greift die Regel ohnehin nicht: der Farnkessel hat
 *  Flecken bis +0,078, aber `mBlau` ist dort -0,121, und blauer heisst dann
 *  Schatten statt Eis. */
const KALT_AB = 0.03;
/** Ab welchem Anteil der Kartenbuntheit ein Fleck als hart gilt.
 *
 *  Gemessen ueber alle 37 Kreise: Dickicht 0,39 bis 0,71, Fels und Eis 1,35
 *  bis 2,14. Die Luecke ist 0,64 breit - die breiteste, die dieses Werkzeug
 *  je hatte -, und 1,0 liegt darin. */
const BUNT_AB = 1.0;
/** Wie weit die eingetragene Farbe vom gemessenen Mittel abweichen darf.
 *  0,06 im Einheitswuerfel ist rund ein Sechzehntel der laengsten Diagonale -
 *  eine andere Textur faellt darueber, ein neu gepacktes Bild nicht. */
const FARB_TOLERANZ = 0.06;

const karten = [];
for (const m of readFileSync(join(ROOT, 'src/gfx/assets/backgrounds.ts'), 'utf8')
  .matchAll(/'([a-z]+)': 'data:image\/(?:webp|jpeg);base64,([^']+)'/g)) {
  karten.push({ id: m[1], buf: Buffer.from(m[2], 'base64') });
}

const { MAPS } = await import('../src/data/maps.ts');

const blauAnteil = (r, g, b) => b - (r + g) / 2;

/** Buntheit im CIELAB-Raum, dieselbe Rechnung wie in `npm run grafiktor`.
 *
 *  Nicht die HSV-Saettigung: die kennt die Helligkeit nicht, und ein dunkles
 *  Braun kommt dort auf 0,60, ohne bunt zu wirken. */
const chroma = (r, g, b) => {
  const f = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const R = f(r), G = f(g), B = f(b);
  const k = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = k((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const Y = k(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const Z = k((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return Math.hypot(500 * (X - Y), 200 * (Y - Z));
};
const hex = (r, g, b) => '#' + [r, g, b]
  .map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('');
const ausHex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

console.log('GELAENDEARTEN\n');
console.log(`Gemessen am gepackten Untergrundbild, verkleinert auf ${N} Punkte`);
console.log('Breite, Kreisinneres bis 0,8 r, alles anteilig zum Mittel der Karte.\n');

const befunde = [];
const bloecke = [];
let gezaehlt = 0;
const artenGesehen = new Set();
const kacheln = [];

for (const k of karten) {
  const H = Math.round(N * WELT_H / WELT_B);
  const { data } = await sharp(k.buf).resize(N, H, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const karte = MAPS.find((m) => m.id === k.id);
  if (!karte) { befunde.push(`${k.id}: kein Kartenname dazu.`); continue; }

  let mr = 0, mg = 0, mb = 0;
  for (let i = 0; i < N * H; i++) { mr += data[i * 3]; mg += data[i * 3 + 1]; mb += data[i * 3 + 2]; }
  mr /= N * H * 255; mg /= N * H * 255; mb /= N * H * 255;
  const mBlau = blauAnteil(mr, mg, mb);
  const mHell = (mr + mg + mb) / 3;
  let mChroma = 0;
  for (let i = 0; i < N * H; i++) {
    mChroma += chroma(data[i * 3] / 255, data[i * 3 + 1] / 255, data[i * 3 + 2] / 255);
  }
  mChroma /= N * H;

  console.log(`── ${k.id}   Karte im Mittel: hell ${mHell.toFixed(3)}  blau ${mBlau.toFixed(3)}`
    + `${mBlau > 0 ? '  (kalte Karte)' : ''}`);
  console.log('   ' + 'Kreis'.padEnd(18) + 'Δhell'.padStart(8) + 'Δblau'.padStart(8)
    + 'Buntheit'.padStart(10) + '  Farbe    Art');

  const zeilen = [];
  for (const gr of karte.rough) {
    const cx = gr.x * N / WELT_B, cy = gr.y * N / WELT_B, rr = gr.r * N / WELT_B * 0.8;
    let sr = 0, sg = 0, sb = 0, sc = 0, n = 0;
    for (let y = Math.floor(cy - rr); y <= cy + rr; y++) {
      for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
        if (x < 0 || y < 0 || x >= N || y >= H) continue;
        if (Math.hypot(x - cx, y - cy) > rr) continue;
        const i = (y * N + x) * 3;
        sr += data[i] / 255; sg += data[i + 1] / 255; sb += data[i + 2] / 255;
        sc += chroma(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255); n++;
      }
    }
    if (!n) { befunde.push(`${k.id} ${gr.x}:${gr.y}: liegt ausserhalb des Bildes.`); continue; }
    sr /= n; sg /= n; sb /= n; sc /= n;
    const dH = (sr + sg + sb) / 3 - mHell;
    const dB = blauAnteil(sr, sg, sb) - mBlau;
    // Kalt geht vor hart: Eis ist hell UND blau, und das Blaue ist die
    // Nachricht. Sonst waere jedes Schneefeld "hartes Pflaster".
    // **Buntheit im Verhaeltnis zur Karte - das Merkmal, das v234 gefunden hat.**
    //
    // Bis v233 hiess die Regel "heller als seine Karte, also Stein". Auf dem
    // Aschebild sind alle elf Flecken Felsnester mit Glutrissen und alle elf
    // DUNKLER als ihr Untergrund; die Regel sah sie nicht, und damit kam die
    // Gelaendeart `hart` im ganzen Spiel nicht mehr vor.
    //
    // Zwei Ersatzmerkmale sind gemessen und gescheitert (Kantendichte, absoluter
    // Helligkeitsabstand - Ueberschneidung ueber den ganzen Bereich). Die
    // BUNTHEIT trennt: ueber alle 37 Kreise liegen die sechzehn Dickichtflecken
    // des Spiralhains und des Farnkessels bei 0,39 bis 0,71 des Kartenmittels,
    // die einundzwanzig Fels- und Eisflecken bei 1,35 bis 2,14. Eine Luecke von
    // 0,64 ohne eine einzige Ueberschneidung; 1,0 liegt darin.
    //
    // Anteilig, nicht absolut (Regel 2): die vier Karten stehen bei 24,1 / 11,7
    // / 14,6 / 22,4 mittlerer Buntheit, ein fester Abstand waere auf der
    // grauen Ascheschlucht etwas anderes als auf dem gruenen Spiralhain.
    //
    // **Was sie NICHT trennt, und das steht hier, statt entdeckt zu werden:**
    // einen GRAUEN Felsen auf einer BUNTEN Karte. Die drei blassen Findlinge im
    // Moos des Spiralhains (Kreise 650:296, 778:162, 597:184) liegen bei 0,55
    // bis 0,71 und damit unter der Schwelle - sie sind Stein und heissen
    // `locker`. Die Helligkeitsregel faengt sie auch nicht (Δhell -0,017 bis
    // +0,030 gegen verlangte +0,06). Das ist der Rest von D29.
    const buntVerhaeltnis = sc / Math.max(1e-6, mChroma);
    const art = (dB > KALT_AB && mBlau > 0) ? 'kalt'
      : (dH > HART_AB || buntVerhaeltnis >= BUNT_AB) ? 'hart' : 'locker';
    const farbe = hex(sr, sg, sb);
    gezaehlt++;
    artenGesehen.add(art);
    zeilen.push({ gr, art, farbe });
    kacheln.push({ k, gr, art });

    console.log('   ' + `${gr.x}:${gr.y} r${gr.r}`.padEnd(18)
      + dH.toFixed(3).padStart(8) + dB.toFixed(3).padStart(8)
      + `${buntVerhaeltnis.toFixed(2)}x`.padStart(10)
      + `  ${farbe}  ${art}`);

    // --- Gegen das Eingetragene.
    if (!gr.art || !gr.farbe) {
      befunde.push(`${k.id} ${gr.x}:${gr.y}: keine Gelaendeart eingetragen. `
        + `Gemessen wurde "${art}" mit ${farbe}.`);
      continue;
    }
    // **Seit v234 entscheidet das Tor wieder beide Fragen - weil es beide
    // messen kann.**
    //
    // In v233 stand hier eine Ausnahme: `hart` gegen `locker` sei am Bild
    // nicht entscheidbar, also entscheide der Blick und das Tor sage es nur.
    // Das war richtig fuer die Regel, die es damals hatte (Helligkeit), und
    // fuer die zwei Ersatzmerkmale, die gemessen gescheitert sind
    // (Kantendichte, absoluter Abstand). Es war nicht richtig fuer die
    // Frage: die BUNTHEIT trennt, mit einer Luecke von 0,64 ueber alle 37
    // Kreise. Eine Ausnahme, die man einmal einraeumt, bleibt sonst stehen,
    // bis niemand mehr weiss, dass sie eine war.
    if (gr.art !== art) {
      befunde.push(`${k.id} ${gr.x}:${gr.y}: eingetragen "${gr.art}", im Bild aber `
        + `"${art}" (Δhell ${dH.toFixed(3)}, Δblau ${dB.toFixed(3)}, `
        + `Buntheit ${buntVerhaeltnis.toFixed(2)}x).`);
    }
    const [er, eg, eb] = ausHex(gr.farbe);
    const d = Math.hypot(er - sr, eg - sg, eb - sb);
    if (d > FARB_TOLERANZ) {
      befunde.push(`${k.id} ${gr.x}:${gr.y}: eingetragen ${gr.farbe}, im Bild ${farbe} `
        + `- ${d.toFixed(3)} auseinander (erlaubt ${FARB_TOLERANZ}).`);
    }
  }
  console.log('');
  bloecke.push(`  // ${k.id}\n` + zeilen.map((z) =>
    `    { x: ${z.gr.x}, y: ${z.gr.y}, r: ${z.gr.r}, art: '${z.art}', farbe: '${z.farbe}' },`).join('\n'));
}

// --- Regel 3: ist die Messung ueberhaupt angekommen?
if (gezaehlt < 20) {
  befunde.push(`Nur ${gezaehlt} Kreise gemessen - das Muster passt nicht mehr auf die `
    + 'Karten, und die Pruefung lief ins Leere.');
}
if (artenGesehen.size < 2) {
  befunde.push(`Alle Kreise fallen in dieselbe Art ("${[...artenGesehen][0]}") - dann `
    + 'unterscheidet die Einteilung nichts und die Reaktion ist wieder ueberall gleich.');
}

if (!TOR) {
  // --- Kontaktbogen: elf Kacheln je Karte, damit man SIEHT, was gemessen
  // wurde. Genau er hat den ersten Plan (Fels/Dickicht/Wasser) erledigt.
  const TILE = 128, SPALTEN = Math.max(...MAPS.map((m) => m.rough.length));
  const RAND = { hart: '#E8D9A0', kalt: '#8FD3F4', locker: '#C08050' };
  const zeilen = [];
  for (const k of karten) {
    const karte = MAPS.find((m) => m.id === k.id);
    if (!karte) continue;
    const meta = await sharp(k.buf).metadata();
    const sx = meta.width / WELT_B, sy = meta.height / WELT_H;
    const teile = [];
    let i = 0;
    for (const gr of karte.rough) {
      const r = Math.max(8, Math.round(gr.r * sx));
      const left = Math.max(0, Math.min(meta.width - 2 * r, Math.round(gr.x * sx - r)));
      const top = Math.max(0, Math.min(meta.height - 2 * r, Math.round(gr.y * sy - r)));
      const art = kacheln.find((c) => c.k.id === k.id && c.gr === gr)?.art ?? 'locker';
      const kachel = await sharp(k.buf).extract({ left, top, width: 2 * r, height: 2 * r })
        .resize(TILE - 12, TILE - 12, { fit: 'fill' }).png().toBuffer();
      const mitRand = await sharp({
        create: { width: TILE, height: TILE, channels: 3, background: RAND[art] },
      }).composite([{ input: kachel, left: 6, top: 6 }]).png().toBuffer();
      teile.push({ input: mitRand, left: i * TILE, top: 0 });
      i++;
    }
    zeilen.push(await sharp({
      create: { width: SPALTEN * TILE, height: TILE, channels: 3, background: '#101010' },
    }).composite(teile).png().toBuffer());
  }
  await sharp({
    create: { width: SPALTEN * TILE, height: zeilen.length * TILE, channels: 3, background: '#000' },
  }).composite(zeilen.map((b, i) => ({ input: b, left: 0, top: i * TILE })))
    .png().toFile(join(ROOT, 'bilder/gelaende.png'));
  console.log('Kontaktbogen: bilder/gelaende.png  (Rahmen: hell = hart, blau = kalt, braun = locker)\n');

  console.log('Zum Eintragen in src/data/maps.ts:\n');
  console.log(bloecke.join('\n\n'));
  console.log('');
}

if (befunde.length) {
  console.error(`GELAENDE: ${befunde.length} Befund(e)`);
  for (const b of befunde) console.error(`  - ${b}`);
  if (TOR) process.exit(1);
} else {
  console.log(`GELAENDE: ${gezaehlt} Kreise, ${artenGesehen.size} Arten, `
    + 'jede Eintragung passt zum Bild.');
}
