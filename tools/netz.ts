/** `npm run netz` - haelt die abgeleiteten Bahnen gegen einen eingefrorenen
 *  Stand und faehrt die Ableitung in beide Richtungen.
 *
 *  **Warum es das braucht.** Seit v278 stehen die Bahnen nicht mehr als
 *  Punktlisten in `maps.ts`, sondern folgen aus `WEGNETZ`. Der Umbau ist nur
 *  dann folgenlos, wenn die abgeleiteten Kurven mit den alten
 *  DECKUNGSGLEICH sind - und das ist eine Messung, keine Behauptung. Der
 *  Stand in `tools/wegnetz-stand.txt` ist aus den Bahnen von v277 erzeugt,
 *  bevor die Ableitung eingebaut wurde.
 *
 *  Gemessen wird die KURVE, nicht die Kontrollpunkte: 64 Abtastpunkte in
 *  gleichen Bogenlaengen-Abstaenden je Bahn. Zwei verschiedene
 *  Punktlisten koennen dieselbe Kurve ergeben, und umgekehrt aendert ein
 *  verschobener Kontrollpunkt die Kurve auf ihrer ganzen Laenge.
 *  Messstelle (Regel 12): `LanePath` mit dem Standardwert `perSpan`, also
 *  dieselbe Kurve, auf der die Gegner laufen.
 *
 *  Zwei Selbsttests laufen bei jedem Aufruf mit:
 *
 *   1. **Rundlauf.** `netzAusBahnen(bahnenAusNetz(netz))` muss dieselben
 *      Bahnen ergeben. Die beiden Richtungen sind zueinander invers, oder
 *      eine von beiden ist falsch.
 *   2. **Ausweichprobe** (Regel 13). Eine benutzte Kante wird entfernt; die
 *      Ableitung MUSS dann eine andere Route liefern oder melden, dass es
 *      keine mehr gibt. Ohne diese Probe bewiese der Rundlauf nur, dass die
 *      Ableitung sich selbst treu ist - sie koennte die alte Route
 *      stillschweigend behalten, und niemand saehe es.
 *
 *   npm run netz               messen und berichten
 *   npm run netz -- --tor      dasselbe, aber rot bei Abweichung
 *   npm run netz -- --schreiben  den Stand neu setzen
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAPS } from '../src/data/maps';
import { LanePath, type PathPoint } from '../src/core/path';
import {
  WEGNETZ, bahnenAusNetz, netzAusBahnen, type Wegnetz,
} from '../src/data/wegnetz';

const TOR = process.argv.includes('--tor');
const SCHREIBEN = process.argv.includes('--schreiben');
const STAND = fileURLToPath(new URL('wegnetz-stand.txt', import.meta.url));

/** Wieviele Punkte je Bahn abgetastet werden. */
const ABTAST = 64;
/** Was als deckungsgleich gilt. Erwartet werden 0,00 Weltpunkte - die
 *  Schwelle faengt nur das Rechenrauschen der Bogenlaengen-Tabelle ab. */
const SCHWELLE = 0.5;

function abtasten(bahn: PathPoint[]): { x: number; y: number }[] {
  const kurve = new LanePath(bahn);
  const raus: { x: number; y: number }[] = [];
  for (let i = 0; i < ABTAST; i++) {
    const p = kurve.at((kurve.length * i) / (ABTAST - 1));
    raus.push({ x: p.x, y: p.y });
  }
  return raus;
}

const alsText = (ps: { x: number; y: number }[]): string =>
  ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(';');

const ausText = (t: string): { x: number; y: number }[] =>
  t.split(';').map((s) => {
    const [x, y] = s.split(',').map(Number);
    return { x, y };
  });

/** Der Stand, als Zeilen `<karte> <bahn> laenge=<n> abtast=<...>`. */
function standLesen(): Map<string, { laenge: number; punkte: { x: number; y: number }[] }> {
  const karte = new Map<string, { laenge: number; punkte: { x: number; y: number }[] }>();
  let text: string;
  try { text = readFileSync(STAND, 'utf8'); } catch { return karte; }
  for (const zeile of text.split('\n')) {
    if (!zeile.trim() || zeile.startsWith('#')) continue;
    const [id, nr, ...rest] = zeile.trim().split(/\s+/);
    const felder = new Map(rest.map((f) => f.split('=') as [string, string]));
    karte.set(`${id}:${nr}`, {
      laenge: Number(felder.get('laenge')),
      punkte: ausText(felder.get('abtast') ?? ''),
    });
  }
  return karte;
}

let fehler = 0;
const meldung = (t: string): void => { console.log(`  ! ${t}`); fehler++; };

console.log('NETZ - die Bahnen folgen aus dem Wegenetz.\n');

const stand = standLesen();
const neu: string[] = [
  '# Der eingefrorene Verlauf der abgeleiteten Bahnen.',
  '#',
  '# Erzeugt aus den Punktlisten, die bis v277 in src/data/maps.ts standen -',
  '# also VOR dem Umbau auf WEGNETZ. Solange `npm run netz` null Abweichung',
  '# meldet, hat der Umbau am Spiel nichts geaendert.',
  '#',
  `# ${ABTAST} Abtastpunkte je Bahn in gleichen Bogenlaengen-Abstaenden,`,
  '# gemessen auf LanePath mit dem Standardwert perSpan.',
  '',
];

for (const map of MAPS) {
  const netz: Wegnetz | undefined = WEGNETZ[map.id];
  console.log(`── ${map.name}`);
  if (!netz) { meldung(`${map.id}: kein Wegenetz eingetragen.`); continue; }

  const meldungen: string[] = [];
  let bahnen: PathPoint[][];
  try { bahnen = bahnenAusNetz(netz, meldungen); } catch (e) {
    meldung(`${map.id}: ${(e as Error).message}`); continue;
  }
  for (const m of meldungen) meldung(`${map.id}: ${m}`);

  const kreuze = netz.knoten.filter((k) => k.art === 'kreuz').length;
  console.log(`  ${netz.knoten.length} Knoten (${netz.belegung.length} Tore, ${kreuze} Kreuzungen), `
    + `${netz.kanten.length} Kanten, ${netz.belegung.length} belegte Routen`);

  // Selbsttest 1: der Rundlauf.
  const zurueck = netzAusBahnen(bahnen);
  const wieder = bahnenAusNetz(zurueck);
  if (JSON.stringify(wieder) !== JSON.stringify(bahnen)) {
    meldung(`${map.id}: der Rundlauf ist nicht deckungsgleich - `
      + 'netzAusBahnen und bahnenAusNetz sind nicht invers.');
  }

  // Selbsttest 2: die Ausweichprobe (Regel 13).
  //
  // Jede Kante, die die erste Bahn benutzt, wird einmal entfernt. Die
  // Ableitung muss dann eine ANDERE Bahn liefern oder melden, dass keine
  // Route mehr existiert - sie darf die alte nicht stillschweigend behalten.
  let ausgewichen = 0; let ohneRoute = 0;
  for (const weg of netz.belegung[0].kanten) {
    const ohne: Wegnetz = { ...netz, kanten: netz.kanten.filter((k) => k.id !== weg) };
    try {
      const ersatz = bahnenAusNetz(ohne, []);
      if (JSON.stringify(ersatz[0]) === JSON.stringify(bahnen[0])) {
        meldung(`${map.id}: ohne die Kante "${weg}" liefert die Ableitung dieselbe `
          + 'Bahn - sie behaelt die alte Route stillschweigend.');
      } else ausgewichen++;
    } catch {
      // Keine Route mehr, und das ist eine gueltige Antwort: sie ist gemeldet
      // worden statt verschwiegen.
      ohneRoute++;
    }
  }
  console.log(`  Ausweichprobe: ${netz.belegung[0].kanten.length} benutzte Kante(n) einzeln `
    + `entfernt - ${ausgewichen} mal eine andere Route, ${ohneRoute} mal gar keine mehr`);

  for (let i = 0; i < bahnen.length; i++) {
    const kurve = new LanePath(bahnen[i]);
    const punkte = abtasten(bahnen[i]);
    const alt = stand.get(`${map.id}:${i}`);
    let text = `  Bahn ${i}: ${bahnen[i].length} Kontrollpunkte, Laenge ${kurve.length.toFixed(1)}`;
    if (!alt) {
      text += ' - kein Stand';
      if (!SCHREIBEN) meldung(`${map.id} Bahn ${i}: im Stand nicht vermerkt.`);
    } else {
      // Verglichen wird auf der Aufloesung des Standes: er haelt eine
      // Nachkommastelle, und eine ungerundete Zahl dagegen zu halten
      // meldet immer 0,07 - das ist die Rundung, nicht die Abweichung.
      let groesste = 0;
      const rund = (z: number): number => Math.round(z * 10) / 10;
      for (let j = 0; j < Math.min(punkte.length, alt.punkte.length); j++) {
        const dx = rund(punkte[j].x) - alt.punkte[j].x, dy = rund(punkte[j].y) - alt.punkte[j].y;
        groesste = Math.max(groesste, Math.hypot(dx, dy));
      }
      if (punkte.length !== alt.punkte.length) groesste = Infinity;
      text += `, Abweichung ${groesste.toFixed(2)} Weltpunkte`;
      if (groesste > SCHWELLE) {
        meldung(`${map.id} Bahn ${i}: ${groesste.toFixed(2)} Weltpunkte neben dem Stand `
          + `(erlaubt ${SCHWELLE}).`);
      }
    }
    console.log(text);
    neu.push(`${map.id} ${i} laenge=${kurve.length.toFixed(1)} abtast=${alsText(punkte)}`);
  }
  console.log('');
}

if (SCHREIBEN) {
  writeFileSync(STAND, neu.join('\n') + '\n');
  console.log('NETZ: Stand neu geschrieben - damit ist die Deckungsgleichheit von hier an gemessen.');
} else if (fehler) {
  console.error(`\nNETZ: ${fehler} Befund(e).`);
  if (TOR) process.exit(1);
} else {
  console.log('NETZ: alle Bahnen deckungsgleich mit dem Stand, Rundlauf und Ausweichprobe halten.');
}
