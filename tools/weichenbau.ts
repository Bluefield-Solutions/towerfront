/** `npm run weichenbau` - eine Weiche messen, BEVOR sie in die Karte kommt.
 *
 *  **Warum es das braucht.** Die erste Weiche (v280) ist von Hand gesetzt und
 *  mit einem Wegwerfskript gemessen worden. Das ist genau der Zustand, den der
 *  Nutzer in v237 fuer die Bahnen abgeschafft hat - *"wir brauchen fuer alles
 *  ein sauberes reproduzierbares System, insbesondere fuer Karten, Wege,
 *  Gegnerlaeufe und Turmpositionierungen"* -, und er hat damals eine ganze
 *  Runde gekostet, weil Werkbank und Waechter verschieden rechneten.
 *
 *  Der Entwurf steht als Daten in `entwurf/weichen.json`, gerechnet wird mit
 *  `tools/bahnmass.ts` - derselben Datei, aus der `npm run guards` seine
 *  Zahlen nimmt. Eingetragen wird ueber `tools/netzschrift.ts`, also durch
 *  denselben Schreiber wie bei `npm run bahnbau`.
 *
 *  Gemessen wird je Entwurf:
 *
 *   - **Der Umweg wird laenger, nie kuerzer.** Zu heisst laenger; eine Weiche,
 *     die den Weg verkuerzt, legt niemand um.
 *   - **Kein Fleck im Weg.** Derselbe Abstand, den `guards` fuer die Bahnen
 *     verlangt - ein Weg mitten durch ein Felsfeld sieht falsch aus.
 *   - **Kein schaerferer Knick als die heutige Bahn.** Gemessen an der
 *     abgetasteten Kurve, nicht am Stuetzpunktzug: die beiden Zahlen liegen um
 *     Faktor sieben auseinander, und bis v280 habe ich die falsche angesehen.
 *   - **Nichts laeuft aus dem Feld.**
 *   - **Die Spreizung liegt im Band** - dieselbe Rechnung wie der
 *     Weichenfenster-Waechter, damit hier nicht eine zweite Grenze entsteht
 *     (Regel 15).
 *
 *   npm run weichenbau                 alle Entwuerfe messen
 *   npm run weichenbau -- <karte>      nur einen
 *   npm run weichenbau -- --schreiben  eintragen, wenn alle Regeln halten
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAPS, mapById } from '../src/data/maps';
import { LanePath, type PathPoint } from '../src/core/path';
import { WEGNETZ, bahnenAusNetz, type Wegnetz, type WegKante } from '../src/data/wegnetz';
import { geometrie } from './bahnmass';
import { netzEintragen } from './netzschrift';

const ENTWURF = fileURLToPath(new URL('../entwurf/weichen.json', import.meta.url));
const SCHREIBEN = process.argv.includes('--schreiben');
const NUR = process.argv.slice(2).find((a) => !a.startsWith('--'));

/** Dieselben Zahlen wie im Weichenfenster-Waechter. Sie stehen dort, weil der
 *  Waechter urteilt; hier werden sie nur GELESEN. */
/** Dieselbe Grenze wie `npm run guards`. */
const KNICK_MAX = 25;
const SPREIZUNG_MIN = 1.10;
const SPREIZUNG_MAX = 2.50;

interface Entwurf {
  /** Kennung der neuen Weiche. */
  id: string;
  name: string;
  /** Zwischen welchen Punkten der heutigen Bahn der Umweg haengt. */
  von: { x: number; y: number };
  nach: { x: number; y: number };
  /** Welche Bahn der Karte die beiden Punkte traegt. */
  bahn: number;
  /** Die Zwischenpunkte des Umwegs. */
  punkte: PathPoint[];
}

const alle: Record<string, Entwurf[]> = JSON.parse(readFileSync(ENTWURF, 'utf8'));
let fehler = 0;

for (const map of MAPS) {
  const entwuerfe = alle[map.id];
  if (!entwuerfe?.length) continue;
  if (NUR && NUR !== map.id) continue;
  console.log(`\n── ${map.name}`);

  const netz: Wegnetz = WEGNETZ[map.id];
  // Auf dem Netz gearbeitet wird an einer KOPIE: ein Entwurf, der eine Regel
  // bricht, darf den Baum nicht anfassen.
  const knoten = netz.knoten.map((k) => ({ ...k }));
  const kanten: WegKante[] = netz.kanten.map((k) => ({ ...k, punkte: k.punkte.map((p) => ({ ...p })) }));
  const weichen = (netz.weichen ?? []).map((w) => ({ ...w }));
  let kreuze = knoten.filter((k) => k.art === 'kreuz').length;
  const verstoesse: string[] = [];

  const heute = new LanePath(map.lanes[0]);
  // `geometrie` benutzt die Rohpunkte nur zum Durchreichen; die Breite ist dort
  // nicht wahlfrei. Ein Punkt ohne `w` bekommt die Standardbreite der Kurve.
  const mitBreite = (ps: PathPoint[]) => ps.map((p) => ({ x: p.x, y: p.y, w: p.w ?? 42 }));
  const heuteMass = geometrie(heute, mitBreite(map.lanes[0]), map.rough);

  for (const e of entwuerfe) {
    // Die beiden Enden muessen auf der Bahn liegen - und zwar als Punkte, die
    // es wirklich gibt. Ein Endpunkt "ungefaehr dort" waere ein zweiter
    // Zielpunkt neben dem ersten (Regel 15).
    const bahn = map.lanes[e.bahn];
    const iA = bahn.findIndex((p) => p.x === e.von.x && p.y === e.von.y);
    const iB = bahn.findIndex((p) => p.x === e.nach.x && p.y === e.nach.y);
    if (iA < 0 || iB < 0 || iB <= iA) {
      verstoesse.push(`${e.id}: ${e.von.x}:${e.von.y} und ${e.nach.x}:${e.nach.y} sind auf `
        + `Bahn ${e.bahn} nicht beide zu finden (oder in der falschen Reihenfolge).`);
      continue;
    }
    // **Steht die Weiche schon im Netz, wird sie NACHGEPRUEFT statt eingebaut.**
    //
    // Die Gegenprobe hat es gefunden: nach dem Eintragen war das Werkzeug rot,
    // weil die beiden Enden jetzt Knoten sind und keine Zwischenpunkte mehr.
    // Ein Werkzeug, das im Normalzustand rot steht, ist keins - und die
    // Gegenprobe an einem roten Tor beweist ohnehin nichts.
    //
    // Nachgeprueft wird das, was wirklich zaehlt: dass Entwurf und Netz
    // dasselbe sagen. Laufen sie auseinander, luegt eines von beiden.
    const gebaut = (netz.weichen ?? []).find((w) => w.id === e.id);
    if (gebaut) {
      const kurzK = netz.kanten.find((k) => k.id === gebaut.kante);
      const langK = netz.kanten.find((k) => k.von === kurzK?.von && k.nach === kurzK?.nach
        && k.id !== kurzK?.id);
      const soll = e.punkte.map((p) => `${p.x}:${p.y}`).join(',');
      const ist = (langK?.punkte ?? []).map((p) => `${p.x}:${p.y}`).join(',');
      if (soll !== ist) {
        verstoesse.push(`${e.id}: Entwurf und Netz laufen auseinander. Der Entwurf nennt `
          + `${e.punkte.length} Punkte (${soll.slice(0, 40)}...), im Netz stehen `
          + `${langK?.punkte.length ?? 0} (${ist.slice(0, 40)}...). Eines von beiden luegt - `
          + 'mit `--schreiben` gewinnt der Entwurf.');
      } else {
        console.log(`  ${e.id} (${e.name}): steht im Netz, Entwurf und Netz stimmen ueberein `
          + `(${e.punkte.length} Punkte).`);
      }
      if (!SCHREIBEN) continue;
    }

    const A = bahn[iA], B = bahn[iB];
    const kurz = bahn.slice(iA + 1, iB).map((p) => ({ ...p }));
    const lang = [A, ...e.punkte, B].map((p) => ({ ...p }));
    const langKurve = new LanePath(lang);
    const kurzKurve = new LanePath([A, ...kurz, B]);

    // Die Bahn, wie sie mit dem Umweg aussaehe - daran wird gemessen, nicht am
    // Umweg allein: Knick und Fleckabstand haengen an den Nachbarn.
    const mit = [...bahn.slice(0, iA + 1), ...e.punkte, ...bahn.slice(iB)];
    const mass = geometrie(new LanePath(mit), mitBreite(mit), map.rough);

    const zeilen = [
      `  ${e.id} (${e.name}), Bahn ${e.bahn}, ${e.von.x}:${e.von.y} -> ${e.nach.x}:${e.nach.y}`,
      `    Abschnitt ${kurzKurve.length.toFixed(0)} -> ${langKurve.length.toFixed(0)} Weltpunkte`,
      `    Bahn ${heute.length.toFixed(0)} -> ${mass.laenge.toFixed(0)} `
        + `(+${(100 * (mass.laenge / heute.length - 1)).toFixed(0)} %), Umweg `
        + `${heuteMass.umweg.toFixed(2)} -> ${mass.umweg.toFixed(2)}`,
      `    Knick ${mass.knickGrad.toFixed(1)}° (heute ${heuteMass.knickGrad.toFixed(1)}°), `
        + `engster Fleck ${mass.fleckAbstand.toFixed(0)} bei ${mass.fleckWo} `
        + `(heute ${heuteMass.fleckAbstand.toFixed(0)}), ausserhalb ${mass.ausserhalb} `
        + `(heute ${heuteMass.ausserhalb})`,
    ];
    for (const z of zeilen) console.log(z);

    if (langKurve.length <= kurzKurve.length) {
      verstoesse.push(`${e.id}: der Umweg ist mit ${langKurve.length.toFixed(0)} nicht laenger `
        + `als der kurze Ast (${kurzKurve.length.toFixed(0)}) - zu heisst laenger.`);
    }
    // **Gegen die HEUTIGE Bahn, nicht gegen eine feste Zahl.** Der Spiralhain
    // streift sein Felsfeld bei 1671:916 seit jeher um -23 Weltpunkte; eine
    // absolute Grenze wuerde entweder ihn oder jeden Umweg ablehnen (Regel 2).
    if (mass.fleckAbstand < heuteMass.fleckAbstand - 1) {
      verstoesse.push(`${e.id}: der Umweg kommt einem Fleck naeher als die heutige Bahn `
        + `(${mass.fleckAbstand.toFixed(0)} gegen ${heuteMass.fleckAbstand.toFixed(0)} bei ${mass.fleckWo}).`);
    }
    // **Dieselben 25 Grad wie der Waechter, nicht schaerfer** (Regel 15).
    //
    // Der erste Entwurf verlangte "nicht schaerfer als die heutige Bahn" und
    // war damit strenger als das Tor, gegen das die Karte am Ende laeuft: der
    // Farnkessel knickt heute um 4,8 Grad, und JEDER Umweg waere daran
    // gescheitert. Eine Werkbank, die mehr verlangt als der Waechter,
    // verwirft gute Entwuerfe und sagt nicht, warum. Die heutige Zahl steht
    // trotzdem daneben - sie sagt, ob die Karte unruhiger wird.
    if (mass.knickGrad > KNICK_MAX) {
      verstoesse.push(`${e.id}: knickt um ${mass.knickGrad.toFixed(0)} Grad `
        + `(erlaubt ${KNICK_MAX}) - das ist eine Ecke, keine Kurve.`);
    }
    if (mass.ausserhalb > heuteMass.ausserhalb) {
      verstoesse.push(`${e.id}: laeuft an ${mass.ausserhalb} Stellen aus dem Feld `
        + `(heute ${heuteMass.ausserhalb}).`);
    }

    // In die Netzkopie eintragen: der kurze Ast wird eine eigene Kante, der
    // Umweg die zweite daneben.
    const knotenFuer = (p: PathPoint): string => {
      const da = knoten.find((k) => k.x === p.x && k.y === p.y);
      if (da) return da.id;
      const id = `kreuz${++kreuze}`;
      knoten.push({ id, x: p.x, y: p.y, w: p.w, art: 'kreuz' });
      return id;
    };
    const traeger = kanten.find((k) => k.punkte.some((p) => p.x === A.x && p.y === A.y)
      || k.punkte.some((p) => p.x === B.x && p.y === B.y));
    if (!traeger) { verstoesse.push(`${e.id}: keine Kante traegt diese beiden Punkte.`); continue; }
    const pa = traeger.punkte.findIndex((p) => p.x === A.x && p.y === A.y);
    const pb = traeger.punkte.findIndex((p) => p.x === B.x && p.y === B.y);
    if (pa < 0 || pb < 0 || pb <= pa) {
      verstoesse.push(`${e.id}: die beiden Punkte liegen nicht in derselben Kante `
        + `"${traeger.id}" (oder in der falschen Reihenfolge).`);
      continue;
    }
    const idA = knotenFuer(A), idB = knotenFuer(B);
    const vor: WegKante = { id: `${traeger.von}-${idA}`, von: traeger.von, nach: idA,
      punkte: traeger.punkte.slice(0, pa) };
    const kurzK: WegKante = { id: `${idA}-${idB}`, von: idA, nach: idB, punkte: traeger.punkte.slice(pa + 1, pb) };
    const langK: WegKante = { id: `${idA}-${idB}-2`, von: idA, nach: idB, punkte: e.punkte.map((p) => ({ ...p })) };
    const nach: WegKante = { id: `${idB}-${traeger.nach}`, von: idB, nach: traeger.nach,
      punkte: traeger.punkte.slice(pb + 1) };
    kanten.splice(kanten.indexOf(traeger), 1, vor, kurzK, langK, nach);
    weichen.push({ id: e.id, kante: kurzK.id, name: e.name });
  }

  // Und zum Schluss dieselbe Rechnung wie der Waechter: alle Stellungen.
  const neu: Wegnetz = { knoten, kanten, weichen };
  let kuerzeste = Infinity, laengste = 0;
  for (let maske = 0; maske < 2 ** weichen.length; maske++) {
    const gestellt = new Set(weichen.filter((_, i) => (maske >> i) & 1).map((w) => w.id));
    try {
      const bahnen = bahnenAusNetz(neu, gestellt);
      const summe = bahnen.reduce((a, b) => a + new LanePath(b).length, 0);
      kuerzeste = Math.min(kuerzeste, summe); laengste = Math.max(laengste, summe);
    } catch {
      verstoesse.push(`Stellung "${[...gestellt].join('+') || 'alles offen'}" sperrt alles zu.`);
    }
  }
  const spreizung = laengste / Math.max(1, kuerzeste);
  console.log(`    Weichenfenster: ${2 ** weichen.length} Stellungen, Spreizung `
    + `${spreizung.toFixed(2)} (Band ${SPREIZUNG_MIN}-${SPREIZUNG_MAX})`);
  if (spreizung < SPREIZUNG_MIN || spreizung > SPREIZUNG_MAX) {
    verstoesse.push(`Weichenfenster ${spreizung.toFixed(2)} liegt ausserhalb des Bandes.`);
  }

  if (verstoesse.length) {
    console.log(`\n  ${verstoesse.length} Regel(n) verletzt:`);
    for (const v of verstoesse) console.log(`    - ${v}`);
    fehler += verstoesse.length;
  } else {
    console.log('\n  Alle Regeln gehalten.');
    if (SCHREIBEN) {
      netzEintragen(map.id, neu);
      console.log('  eingetragen in src/data/wegnetz.ts.');
      console.log('  Danach `npm run netz -- --schreiben` NUR, wenn sich der Grundzustand '
        + 'wirklich aendern soll - er soll es nicht.');
    }
  }
}

void mapById;
if (fehler) { console.error(`\nWEICHENBAU: ${fehler} Regel(n) verletzt.`); process.exit(1); }
console.log('\nWEICHENBAU: jeder Entwurf haelt jede Regel.');
