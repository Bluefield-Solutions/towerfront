/**
 * Bahnen bauen und messen - als System, nicht von Hand.
 *
 * **Warum es dieses Werkzeug gibt.** Bis v236 wurden Bahnen als Punktlisten
 * von Hand in `src/data/maps.ts` gesetzt und mit Wegwerfskripten gemessen.
 * Das ist zweimal teuer geworden: die Werkbank rechnete anders als der
 * Waechter (81 % gegen 62 %, spaeter 71 % gegen 16 %), und ein Umbau der
 * Ascheschlucht lief auf die falsche Zahl hin, bis es auffiel. Und ein
 * Entwurf liess sich nicht wiederholen - er stand in der Sitzung, nicht im
 * Baum.
 *
 * Jetzt steht der ENTWURF als Daten in `entwurf/bahnen.json`, die Erzeugung hier
 * und die Messung in `tools/bahnmass.ts` - derselben Datei, die
 * `npm run guards` benutzt. Wer eine Bahn aendert, aendert die Beschreibung
 * und laesst das Werkzeug laufen; das Ergebnis ist jedes Mal dasselbe.
 *
 * Das Modell: EINE Mittelachse, um die sich alle Bahnen mit wechselndem
 * Querversatz winden. Damit sind sie verschiedene Wege und bleiben trotzdem
 * innerhalb einer Turmreichweite voneinander - genau die zwei Forderungen,
 * die in v236 gegeneinander gezogen haben.
 *
 * Aufruf:
 *   npm run bahnbau                 misst den Entwurf, wie er dasteht
 *   npm run bahnbau -- --suche      probiert `skala` durch und nennt das Fenster
 *   npm run bahnbau -- --schreiben  traegt das Ergebnis in src/data/maps.ts ein
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LanePath } from '../src/core/path';
import { MAPS } from '../src/data/maps';
import { netzAusBahnen } from '../src/data/wegnetz';
import { netzEintragen } from './netzschrift';
import {
  bahnenAus, bauplaetze, kreuzdeckung, verschmelzung, geometrie, gemeinsamePunkte,
} from './bahnmass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUCHE = process.argv.includes('--suche');
const SCHREIBEN = process.argv.includes('--schreiben');
/** Nur diese Karte messen. `process.argv` enthaelt vorn den Node- und den
 *  Werkzeugpfad; ohne das `slice(2)` galt der Node-Pfad als Kartenname, und
 *  das Werkzeug meldete "haelt jede Regel", ohne eine einzige zu pruefen. */
const NUR = process.argv.slice(2).find((a) => !a.startsWith('-'));

interface Entwurf {
  skala: number; luft: number; breiten: number[];
  achse: [number, number][];
  anlauf: [number, number][][];
  versatz: number[][];
}
const beschreibung = JSON.parse(readFileSync(join(ROOT, 'entwurf/bahnen.json'), 'utf8'));

/** **Aus der Beschreibung die Punktlisten - deterministisch.**
 *
 *  Der Querversatz steht senkrecht auf der Achse; die Reparatur am Ende
 *  drueckt die KURVE aus den unwegsamen Flecken, nicht die Stuetzpunkte. Der
 *  Unterschied ist gemessen: Stuetzpunkte allein zu verschieben liess die
 *  Kurve zwischen ihnen weiter hineinbeulen, und fuenf Anlaeufe von Hand
 *  trafen jedes Mal einen anderen Fleck. */
function erzeugen(e: Entwurf, ziel: { x: number; y: number },
  flecken: { x: number; y: number; r: number }[]): { x: number; y: number; w: number }[][] {
  const norm = (i: number): [number, number] => {
    const a = e.achse[Math.max(0, i - 1)], b = e.achse[Math.min(e.achse.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    return [-dy / len, dx / len];
  };
  const lanes = e.versatz.map((mus, li) => {
    const pts = e.anlauf[li].map(([x, y], i) => ({ x, y, w: [40, 44, 48][i] ?? 40 }));
    e.achse.forEach(([x, y], i) => {
      const [nx, ny] = norm(i);
      const v = mus[i] * e.skala;
      pts.push({
        x: Math.round(x + nx * v), y: Math.round(y + ny * v),
        w: e.breiten[i % e.breiten.length],
      });
    });
    return pts;
  });
  // Die KURVE aus den Flecken druecken, nicht die Punkte.
  for (let runde = 0; runde < 25; runde++) {
    let schlimm = 0;
    for (const bahn of lanes) {
      const kurve = new LanePath([...bahn.slice(0, -1), { ...bahn[bahn.length - 1], ...ziel }]);
      for (let t = 0; t <= 1; t += 0.004) {
        const q = kurve.at(kurve.length * t);
        for (const f of flecken) {
          const d = Math.hypot(q.x - f.x, q.y - f.y) - f.r;
          if (d >= e.luft) continue;
          schlimm = Math.max(schlimm, e.luft - d);
          let bi = 0, bd = Infinity;
          for (let i = 1; i < bahn.length - 1; i++) {
            const dist = Math.hypot(bahn[i].x - q.x, bahn[i].y - q.y);
            if (dist < bd) { bd = dist; bi = i; }
          }
          if (!bi) continue;
          const dx = bahn[bi].x - f.x, dy = bahn[bi].y - f.y, dd = Math.hypot(dx, dy) || 1;
          bahn[bi].x = Math.round(bahn[bi].x + (dx / dd) * 12);
          bahn[bi].y = Math.round(bahn[bi].y + (dy / dd) * 12);
        }
      }
    }
    if (!schlimm) break;
  }
  return lanes;
}

/** Alle Zahlen zu einem Entwurf - dieselben, die der Waechter prueft. */
function messen(kartenId: string, lanes: { x: number; y: number; w: number }[][]): {
  zeilen: string[]; verstoesse: string[]; kreuz: number; misch: number;
} {
  const map = MAPS.find((m) => m.id === kartenId)!;
  const bahnen = bahnenAus(lanes, map.ziel!);
  const zeilen: string[] = [], verstoesse: string[] = [];
  const pruef = (gut: boolean, text: string): string => {
    if (!gut) verstoesse.push(text);
    return gut ? 'OK ' : '>>>';
  };
  bahnen.forEach((b, i) => {
    const g = geometrie(b, lanes[i], map.rough);
    zeilen.push(`  Bahn ${i + 1}  Laenge ${g.laenge.toFixed(0).padStart(5)}`
      + `  Luft ${g.luftlinie.toFixed(0).padStart(5)}`
      + `  Umweg ${g.umweg.toFixed(2)} ${pruef(g.umweg >= 1.8, `Bahn ${i + 1}: Umweg ${g.umweg.toFixed(2)} < 1,8`)}`
      + `  Wechsel ${String(g.wechsel).padStart(2)} ${pruef(g.wechsel >= 3, `Bahn ${i + 1}: nur ${g.wechsel} Wechsel`)}`
      + `  Knick ${g.knickGrad.toFixed(0).padStart(3)}° ${pruef(g.knickGrad <= 25, `Bahn ${i + 1}: Knick ${g.knickGrad.toFixed(0)}°`)}`
      + `  Breite ${g.breiteVerhaeltnis.toFixed(2)} ${pruef(g.breiteVerhaeltnis >= 1.35, `Bahn ${i + 1}: Breitenverhaeltnis ${g.breiteVerhaeltnis.toFixed(2)}`)}`
      + `  Fleck ${g.fleckAbstand.toFixed(0).padStart(5)} ${pruef(g.fleckAbstand > 0, `Bahn ${i + 1}: laeuft ${(-g.fleckAbstand).toFixed(0)} in den Fleck ${g.fleckWo}`)}`
      + `  ausserhalb ${String(g.ausserhalb).padStart(3)} ${pruef(g.ausserhalb === 0, `Bahn ${i + 1}: ${g.ausserhalb} Punkte ausserhalb des Feldes`)}`);
  });
  const lgn = bahnen.map((b) => b.length);
  const spreiz = Math.max(...lgn) / Math.min(...lgn);
  zeilen.push(`  Laengen ${lgn.map((l) => l.toFixed(0)).join('/')}  Spreizung `
    + `${spreiz.toFixed(2)} ${pruef(spreiz <= 1.3, `Spreizung ${spreiz.toFixed(2)} > 1,30`)}`);
  const gem = gemeinsamePunkte(bahnen);
  zeilen.push(`  gemeinsame Punkte ${gem} ${pruef(gem >= 10, `nur ${gem} gemeinsame Punkte`)}`);

  const plaetze = bauplaetze(map, bahnen);
  const kreuz = kreuzdeckung(bahnen, plaetze);
  const misch = verschmelzung(bahnen);
  zeilen.push(`  ${plaetze.length} Bauplaetze`);
  zeilen.push(`  Kreuzdeckung  ${kreuz.schwaechste.toFixed(0)} % (${kreuz.wo}) `
    + `${pruef(kreuz.schwaechste >= 50, `Kreuzdeckung ${kreuz.schwaechste.toFixed(0)} % < 50`)}`);
  zeilen.push(`  Verschmelzung ${misch.staerkste.toFixed(0)} % (${misch.wo}) `
    + `${pruef(misch.staerkste <= 55, `Verschmelzung ${misch.staerkste.toFixed(0)} % > 55`)}`);
  return { zeilen, verstoesse, kreuz: kreuz.schwaechste, misch: misch.staerkste };
}

let fehler = 0;
let gesucht = false;
for (const [id, roh] of Object.entries(beschreibung.karten) as [string, Entwurf][]) {
  if (NUR && NUR !== id) continue;
  const map = MAPS.find((m) => m.id === id);
  if (!map) { console.error(`BAHNBAU: keine Karte "${id}".`); fehler++; continue; }
  console.log(`\n── ${map.name}`);

  if (SUCHE) {
    console.log('  skala   Kreuzdeckung   Verschmelzung   Verstoesse');
    for (const k of [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2]) {
      const lanes = erzeugen({ ...roh, skala: k }, map.ziel!, map.rough);
      const m = messen(id, lanes);
      console.log(`  ${k.toFixed(2)}    ${m.kreuz.toFixed(0).padStart(8)} %`
        + `   ${m.misch.toFixed(0).padStart(10)} %   ${m.verstoesse.length}`
        + (m.verstoesse.length ? `  (${m.verstoesse[0]})` : '  alles gehalten'));
    }
    gesucht = true;
    continue;
  }

  const lanes = erzeugen(roh, map.ziel!, map.rough);
  const m = messen(id, lanes);
  for (const z of m.zeilen) console.log(z);
  if (m.verstoesse.length) {
    console.log(`\n  ${m.verstoesse.length} Regel(n) verletzt:`);
    for (const v of m.verstoesse) console.log(`    - ${v}`);
    fehler += m.verstoesse.length;
  } else {
    console.log('\n  Alle Regeln gehalten.');
  }

  if (SCHREIBEN) {
    if (m.verstoesse.length) {
      console.error('  NICHT eingetragen - erst muessen alle Regeln halten.');
    } else {
      // **Eingetragen wird seit v278 das NETZ, nicht die Punktliste.** Die
      // Bahnen in `maps.ts` sind abgeleitet; wer dort noch Punktlisten
      // sucht, schreibt ins Leere. `netzAusBahnen` macht aus den erzeugten
      // Bahnen dieselbe Form, die `wegnetz.ts` haelt - gemeinsame Punkte
      // werden wieder zu Knoten.
      netzEintragen(id, netzAusBahnen(lanes));
      console.log(`  eingetragen in src/data/wegnetz.ts (${lanes.length} Bahnen).`);
      console.log('  Danach `npm run netz -- --schreiben`, sonst meldet das Tor die Abweichung -'
        + ' und genau das soll es.');
    }
  }
}

if (fehler) { console.error(`\nBAHNBAU: ${fehler} Regel(n) verletzt.`); process.exit(1); }
// Ein Durchlauf hat nichts abgenommen - er hat nur gezeigt, was passiert.
console.log(gesucht ? '\nBAHNBAU: Durchlauf beendet - abgenommen ist damit nichts.'
  : '\nBAHNBAU: der Entwurf haelt jede Regel.');
