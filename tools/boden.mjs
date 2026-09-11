// **Den Raum ansehen, bevor am Boden gedreht wird (Regel 9).**
//
// `BODEN_HELL` zieht jeden Untergrund auf einen Zielwert - auch einen, der
// dunkel geliefert wird. Ihn zu senken repariert gemessen die Lesbarkeit
// jeder Figur, die auf dem BODEN steht, und schadet der, die auf einem
// dunklen WEG steht: der Weg kommt aus `pal.path` und laeuft seit v235 NACH
// dem Tonwertabgleich, wird also gar nicht mitgezogen.
//
// Zwei Schrauben also, und sie ziehen gegeneinander. Eine nach der anderen
// durchzuprobieren hiesse durch ein Schluesselloch zu schauen - T15 hat das
// drei Runden gekostet. Dieses Werkzeug faehrt beide zugleich durch und legt
// alle Kennzahlen nebeneinander.
//
// **Es ist ein Werkzeug und kein Wegwerfskript** (die Lehre aus v236/v237):
// es rechnet nichts selbst nach, sondern faehrt `tools/readability.mjs` -
// dieselbe Datei, die `npm run lesbarkeit` faehrt - und liest deren Zahlen
// ab. Ein zweites Rechenwerk daneben waere Regel 15, und in v311 hat genau
// das ein Tor seine eigene Arithmetik pruefen lassen.
//
// Es AENDERT Quelltext und nimmt sich mit `git checkout` zurueck. Deshalb
// verweigert es bei schmutzigem Baum den Dienst, genau wie `npm run proben`
// (Regel 1, viermal bezahlt).
import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TERRAIN = join(ROOT, 'src/gfx/terrain.ts');
const MAPS = join(ROOT, 'src/data/maps.ts');

const argWert = (name, ersatz) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : ersatz;
};
const zahlen = (s) => s.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x));

const HELL = zahlen(argWert('hell', '0.355,0.30,0.26,0.22,0.18'));
const WEG = zahlen(argWert('weg', '1.0'));

const dreckig = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
if (dreckig) {
  console.error('BODEN: der Baum ist nicht sauber.\n');
  console.error(dreckig.split('\n').slice(0, 10).map((l) => `  ${l}`).join('\n'));
  console.error('\nDieses Werkzeug aendert Quelltext und nimmt sich mit `git checkout`');
  console.error('zurueck. Bei schmutzigem Baum naehme es die frische Arbeit mit.');
  process.exit(1);
}

/** Eine Farbe heller oder dunkler ziehen. Der Faktor wirkt auf alle drei
 *  Kanaele gleich - der TON des Weges bleibt also, nur seine Helligkeit
 *  wandert. Genau so ist die Schraube gemeint: v235 hat gemessen, dass der
 *  Ton der Ascheschlucht das Problem war und die Helligkeit nicht. */
const zieh = (hex, faktor) => {
  const v = hex.replace('#', '');
  const k = [0, 2, 4].map((i) => Math.max(0, Math.min(255,
    Math.round(parseInt(v.slice(i, i + 2), 16) * faktor))));
  return `#${k.map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
};

const zurueck = () => execSync('git checkout -- src/gfx/terrain.ts src/data/maps.ts', { cwd: ROOT });

const stellen = (hell, wegFaktor) => {
  // **Jede Messung faengt beim eingecheckten Stand an.** Der erste Entwurf
  // hat nur GESETZT und erst am Ende zurueckgenommen - damit multiplizierten
  // sich die Wegfaktoren auf, und der Lauf mit Faktor 1,0 mass den Faktor
  // der Zeile davor. Gemeldet hat es sich als zwei verschiedene Zahlen fuer
  // dieselbe Einstellung in zwei Laeufen.
  zurueck();
  const t = readFileSync(TERRAIN, 'utf8');
  // Auf den TREFFER pruefen, nicht auf den Unterschied: der erste Wert des
  // Durchlaufs ist der heutige, und dann aendert sich gar nichts. Genau so
  // haette der erste Lauf gemeldet, der Eingriff sei nicht angekommen.
  if (!/const BODEN_HELL = [0-9.]+;/.test(t)) {
    throw new Error('BODEN_HELL nicht gefunden - der Eingriff kam nicht an (Regel 3).');
  }
  writeFileSync(TERRAIN, t.replace(/const BODEN_HELL = [0-9.]+;/, `const BODEN_HELL = ${hell};`));

  if (wegFaktor === 1) return;
  const m = readFileSync(MAPS, 'utf8');
  let getroffen = 0;
  const m2 = m.replace(/path: '(#[0-9A-Fa-f]{6})', pathEdge: '(#[0-9A-Fa-f]{6})'/g,
    (_, a, b) => { getroffen++; return `path: '${zieh(a, wegFaktor)}', pathEdge: '${zieh(b, wegFaktor)}'`; });
  if (getroffen < 4) {
    throw new Error(`nur ${getroffen} Wegfarben getroffen, erwartet 4 - der Eingriff `
      + 'kam nicht an (Regel 3).');
  }
  writeFileSync(MAPS, m2);
};

/** Die Zahlen aus dem Lauf von `readability.mjs` ablesen - nicht nachrechnen. */
const lesen = (aus) => {
  const kante = aus.match(/Schwache Kanten \(unter 1\.5\): (\d+) von (\d+)/);
  const liste = aus.match(/Schwache Kanten \(unter 1\.5\): \d+ von \d+\n\s*(.+)/);
  const koerper = aus.match(/(\d+) von (\d+) unter dem Soll ([0-9.]+), schlechtester ([0-9.]+)/);
  const lief = /LESBARKEIT:/.test(aus);
  const flaechen = [...aus.matchAll(/^\s{2}(\S[^(]*)\((Boden|Weg)\)\s+([0-9.]+) %$/gm)]
    .map((m) => ({ karte: m[1].trim(), art: m[2], hell: Number(m[3]) }));
  let schwaechste = NaN;
  if (liste) {
    const werte = [...liste[1].matchAll(/ ([0-9]\.[0-9]{2})/g)].map((m) => Number(m[1]));
    if (werte.length) schwaechste = Math.min(...werte);
  }
  // **Kein Abschnitt heisst NULL, nicht "unbekannt".** `readability.mjs`
  // schreibt die Liste der schwachen Kanten nur, wenn es welche gibt - und
  // der erste Entwurf las das als Messfehler. Genau der beste Fall des
  // Durchlaufs sah damit aus wie ein kaputter Lauf.
  const spanneZeile = aus.match(/Kantenmessung: \d+ Werte, Spanne [0-9.]+ \(([0-9.]+) bis/);
  if (!kante && spanneZeile) schwaechste = Number(spanneZeile[1]);
  return {
    kanten: kante ? Number(kante[1]) : 0,
    gesamt: kante ? Number(kante[2]) : 20,
    schwaechste,
    koerper: koerper ? Number(koerper[1]) : NaN,
    koerperSoll: koerper ? Number(koerper[3]) : NaN,
    koerperMin: koerper ? Number(koerper[4]) : NaN,
    flaechen,
    lief,
  };
};

/** Die vier Wegabstaende aus dem Lauf von `wegdeckung.ts` ablesen - aus der
 *  Tabelle wie aus den Fehlerzeilen. Ein Tor, das rot ist, druckt seine
 *  Tabelle trotzdem; ein Werkzeug, das nur die gruenen Faelle lesen kann,
 *  sieht genau die Haelfte des Raums nicht. */
const wegAbstaende = (aus) => {
  const m = new Map();
  for (const z of aus.matchAll(
    /^\s{2}(\w+)\s+[\d.]+\s+[\d.]+\s+[\d.]+ %\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s+(-?\d+)/gm)) {
    m.set(z[1], { gebacken: Number(z[2]), imBild: Number(z[3]), waerme: Number(z[4]) });
  }
  for (const z of aus.matchAll(/^\s{2}(\w+): der gezeichnete Weg steht ([\d.]+) Farbschritte/gm)) {
    const e = m.get(z[1]) ?? {};
    m.set(z[1], { ...e, imBild: Number(z[2]) });
  }
  return m;
};

// --- `--wegsuche`: wo liegt das Fenster fuer die WEGFARBE, je Karte?
//
// Eine einzige Schraube fuer alle vier Karten gibt es gemessen nicht: bei
// BODEN_HELL 0,24 und unveraenderten Farben steht der Spiralhain auf 21,2
// Farbschritten, die Ascheschlucht auf 94,1 - die eine zu nah, die andere
// zu weit, und jeder Faktor, der die eine richtet, schiebt die andere weiter
// heraus. Deshalb sucht dieser Lauf je Karte, statt einen Wert zu setzen.
if (process.argv.includes('--wegsuche')) {
  const hell = HELL[0];
  console.log(`Wegsuche bei BODEN_HELL = ${hell}: ${WEG.length} Faktor(en).`);
  console.log('Gemessen wird "im Bild" aus `tools/wegdeckung.ts --tor` - dieselbe Zahl,');
  console.log('die das Tor haelt (erlaubt 40 bis 90) - und die Helligkeit des Weges aus');
  console.log('`tools/readability.mjs`. Beide abgelesen, nicht nachgerechnet.\n');
  const karten = ['spiralhain', 'ascheschlucht', 'frostspalte', 'farnkessel'];
  console.log(`Faktor  ${karten.map((k) => k.slice(0, 8).padStart(15)).join('')}`);
  console.log(`        ${karten.map(() => '  Schritte  hell'.padStart(15)).join('')}`);
  console.log('-'.repeat(8 + karten.length * 15));
  try {
    for (const wf of WEG) {
      stellen(hell, wf);
      const lauf = (datei, args) => {
        try {
          return execFileSync('npx', ['tsx', datei, ...args],
            { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (e) { return `${e.stdout ?? ''}${e.stderr ?? ''}`; }
      };
      const wd = wegAbstaende(lauf('tools/wegdeckung.ts', ['--tor']));
      const rb = lesen(lauf('tools/readability.mjs', []));
      if (!wd.size) {
        zurueck();
        console.error(`\nBODEN: bei Faktor ${wf} war keine einzige Wegzahl zu lesen - `
          + 'die Tabelle von `wegdeckung` sieht anders aus als erwartet (Regel 3).');
        process.exit(1);
      }
      const zellen = karten.map((k) => {
        const a = wd.get(k);
        const h = rb.flaechen.find((f) => f.art === 'Weg'
          && f.karte.toLowerCase().startsWith(k.slice(0, 5)));
        const schritte = a ? a.imBild.toFixed(1) : '  -';
        const marke = a && (a.imBild < 40 || a.imBild > 90) ? ' ' : '*';
        return `${marke}${schritte.padStart(8)}${(h ? h.hell.toFixed(1) : '-').padStart(6)}`;
      });
      console.log(`${wf.toFixed(2).padStart(6)}  ${zellen.join('')}`);
    }
  } finally { zurueck(); }
  console.log('\n* = im Band 40 bis 90. Der Baum ist zurueckgesetzt.');
  process.exit(0);
}

console.log(`Durchlauf: ${HELL.length} x ${WEG.length} = ${HELL.length * WEG.length} Messung(en).`);
console.log('Messstelle: gebackenes Terrain, `tools/readability.mjs`, derselbe Lauf wie');
console.log('`npm run lesbarkeit`. Die Wegfarbe wird je Kanal mit demselben Faktor gezogen -');
console.log('der TON bleibt, nur die Helligkeit wandert.\n');

const kopf = 'BODEN_HELL   Weg   Kanten<1,5   schwaechste   Koerper<Soll   schlechtester   Boden %   Weg %';
console.log(kopf);
console.log('-'.repeat(kopf.length));

const zeilen = [];
try {
  for (const hell of HELL) {
    for (const wf of WEG) {
      stellen(hell, wf);
      let aus;
      try {
        aus = execFileSync('npx', ['tsx', 'tools/readability.mjs'],
          { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        aus = `${e.stdout ?? ''}${e.stderr ?? ''}`;
      }
      const z = lesen(aus);
      // Ein abgebrochener Lauf liefert keine Zahlen, und eine leere Zeile
      // in der Tabelle sieht aus wie ein gemessenes Ergebnis (Regel 5).
      if (!z.lief) {
        zurueck();
        console.error(`\nBODEN: der Lesbarkeitslauf bei BODEN_HELL=${hell}, Weg x${wf} `
          + 'hat gar nicht zu Ende gemessen. Ausgabe:\n');
        console.error(aus.split('\n').slice(-15).join('\n'));
        process.exit(1);
      }
      const boden = z.flaechen.filter((f) => f.art === 'Boden');
      const weg = z.flaechen.filter((f) => f.art === 'Weg');
      const mittel = (a) => (a.length ? a.reduce((s, f) => s + f.hell, 0) / a.length : NaN);
      const min = (a) => (a.length ? Math.min(...a.map((f) => f.hell)) : NaN);
      zeilen.push({ hell, wf, ...z, boden: mittel(boden), wegHell: min(weg) });
      console.log(
        `${String(hell).padEnd(12)} ${wf.toFixed(2).padStart(4)}   `
        + `${String(z.kanten).padStart(2)} von ${z.gesamt}     `
        + `${z.schwaechste.toFixed(2).padStart(6)}      `
        + `${String(z.koerper).padStart(2)} von ${z.gesamt}       `
        + `${z.koerperMin.toFixed(2).padStart(6)}       `
        + `${mittel(boden).toFixed(1).padStart(5)}    ${min(weg).toFixed(1).padStart(5)}`,
      );
    }
  }
} finally {
  zurueck();
}

// **Ohne diese Zeile bewiese der Durchlauf nichts** (Regel 13): bewegt sich
// keine der beiden ERGEBNISzahlen ueber die ganze Spanne, dann misst er
// etwas anderes als das, woran er dreht - genau das war bis v273 der Fall,
// sechs Werte und sechsmal dieselbe Zahl.
//
// Gefragt sind Kanten UND Koerperkontrast, nicht eine von beiden: der
// Bodenwert bewegt seit v275 gemessen nur die zweite, weil die Lesbarkeit
// seitdem zwei Flaechen je Karte kennt und jede Figur gegen ihre
// SCHLECHTERE zaehlt - und die ist meistens der Weg, den `BODEN_HELL` gar
// nicht anfasst. Nur auf die Kanten zu sehen hiesse, einen wirksamen
// Durchlauf fuer wirkungslos zu erklaeren.
const spanne = (feld) => Math.max(...zeilen.map((z) => z[feld])) - Math.min(...zeilen.map((z) => z[feld]));
const sk = spanne('kanten'), sko = spanne('koerper');
if (zeilen.length > 1 && sk === 0 && sko === 0) {
  console.error(`\nBODEN: ueber ${zeilen.length} Einstellungen aendert sich weder die Zahl der `
    + 'schwachen Kanten noch die des Koerperkontrasts. Der Durchlauf misst etwas anderes '
    + 'als das, woran er dreht - dieselbe Lage wie vor v274.');
  process.exit(1);
}
console.log(`\nDer Eingriff wirkt: schwache Kanten bewegen sich um ${sk}, `
  + `Koerperkontrast um ${sko} ueber ${zeilen.length} Einstellung(en). `
  + 'Der Baum ist zurueckgesetzt.');
