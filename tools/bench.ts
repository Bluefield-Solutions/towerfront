/** Mikro-Messung des heissen Pfades.
 *
 *  Baut ein Feld im schlimmsten Fall auf - jeder Bauplatz belegt, letzte Welle
 *  unterwegs - und misst, wie lange ein Simulationsschritt dauert. Das ist die
 *  Zahl, die auf dem iPhone ueber fluessig oder ruckelig entscheidet: bei
 *  60 Bildern pro Sekunde stehen insgesamt 16,7 ms zur Verfuegung, und davon
 *  braucht das Zeichnen den groesseren Teil.
 *
 *  **In v272 hat dieses Tor seinen Gegenstand zurueckbekommen.** Es stand seit
 *  jeher in der Torkette und war das einzige Tor darin ohne eine einzige
 *  Gegenprobe - also ohne jeden Beleg, dass es je etwas melden wuerde
 *  (Regel 5). Der Versuch, ihm eine zu bauen, hat gezeigt, warum es keine
 *  gab: **es konnte nichts melden.** Vier Ursachen, alle gemessen.
 *
 *  1. **Die Grenze war 49 mal so hoch wie der Messwert** - 4 ms gegen
 *     gemessene 0,081 ms. Eine Grenze, die kein realistischer Rueckschritt
 *     erreicht, ist keine.
 *  2. **Die Last war keine.** 32 Tuerme, 24 Gegner. Nimmt man dem Spiel das
 *     ganze Umkreisraster weg - `SpatialGrid`, genau die Beschleunigung, die
 *     dieses Tor schuetzen soll -, misst es 0,079 ms statt 0,081. Das ist
 *     kein Unterschied, das ist Rauschen.
 *  3. **Die Last schmolz waehrend der Messung weg.** Block fuer Block:
 *     320 / 320 / 240 / 240 / 240 / 240 / 84 Gegner. `keepAlive` hielt die
 *     Lebenspunkte hoch, nicht die Anzahl.
 *  4. **Und am Ende lief gar keine Simulation mehr.** Sind alle Wellen
 *     gestartet und ist eine fuer einen Bildwechsel leer, ruft
 *     `finishRun(true)`; die Phase verlaesst `playing`, und `update` kehrt in
 *     der ersten Zeile um. Der siebte Block mass 0,032 statt 0,118 ms - das
 *     ist keine schnelle Simulation, das ist gar keine.
 *
 *  Drei und vier waren unsichtbar, solange 1500 Schritte in einem Stueck
 *  gemittelt wurden. Sie standen erst da, als die Bloecke einzeln dastanden.
 *
 *  **Gemessen wird jetzt ein Verhaeltnis, nicht eine Millisekundenzahl.**
 *  Der Grund ist Regel 12: dieses Tor laeuft seit v269 auf dem Runner, und
 *  eine Ratsche auf 0,115 ms wuerde dort die Geschwindigkeit der Maschine
 *  messen, nicht die des Spiels - dieselbe Klasse wie v225, eine Regel, die
 *  auf einem Rechner beweist und auf dem anderen nicht.
 *
 *  Der **Dichtefaktor** ist die dichte Last geteilt durch die duenne, beide
 *  im selben Prozess und am selben warmen Zustand gemessen. Die
 *  Rechengeschwindigkeit kuerzt sich heraus; was bleibt, ist die Frage, mit
 *  der dieses Tor steht und faellt: **waechst der heisse Pfad mit der Zahl
 *  der Gegner, oder nicht?**
 *
 *  Was er faengt und was nicht, steht offen da: er faengt den Verlust der
 *  Beschleunigung (gemessen 13,3 gegen 1,9 ohne Raster). Er faengt **nicht**
 *  einen Aufwand, der beide Lasten gleich stark trifft - dafuer steht die
 *  absolute Grenze daneben, und die ist mit 4 ms weit weg. Eine Zahl, die
 *  beides koennte, gibt es auf einer fremden Maschine nicht.
 *
 *  Aufruf: npx tsx tools/bench.ts
 *          npx tsx tools/bench.ts --schreiben   den Stand neu setzen
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GameState } from '../src/game/state';
import { } from '../src/data/config';
import { MAX_LEVEL, TOWER_ORDER } from '../src/data/towers';
import { candidateSpots } from './spots';


const DT = 1 / 60;
const BUDGET_MS = 4; // Obergrenze fuer die reine Simulation je Bild
const DICHT = 320;   // Gegner in der dichten Last

/** Wieviel die Ratsche ueber dem Stand zulaesst.
 *
 *  Gemessen (Regel 12): dieser Rechner, warmer Baum, fuenf Laeufe
 *  hintereinander - Dichtefaktor 5,83 bis 6,71, also 7 % um den Median. Vier
 *  Laeufe ohne Umkreisraster: 12,38 bis 13,06, also gut das Doppelte. Das
 *  Band von 30 % liegt zwischen beidem, und es ist mit Absicht das Vierfache
 *  des hier gemessenen Rauschens: dieses Tor laeuft auf dem Runner, und der
 *  Dichtefaktor kuerzt die Rechengeschwindigkeit nur in erster Naeherung
 *  heraus. Ein Band knapp ueber dem Rauschen DIESES Rechners waere wieder
 *  eine Regel, die hier beweist und dort nicht (v225). 30 % sind immer noch
 *  weniger als ein Drittel des Signals. */
const BAND = 0.30;

const STAND_DATEI = fileURLToPath(new URL('bench-stand.txt', import.meta.url));
const KOPF = `# Die Bildratenratsche - der Stand, ueber den kein Lauf steigen darf.
# Geschrieben von \`npx tsx tools/bench.ts --schreiben\`, gelesen von jedem Lauf.
#
# Eine Zahl: der DICHTEFAKTOR - dichte Last geteilt durch duenne, beide im
# selben Prozess gemessen. Absichtlich keine Millisekundenzahl: dieses Tor
# laeuft auf dem Runner, und eine Millisekunde dort ist eine andere als hier.
# Das Band steht in tools/bench.ts.
`;

const SCHREIBEN = process.argv.includes('--schreiben');

const s = new GameState();
s.reset();
s.gold = 1_000_000;

// Jeden Bauplatz belegen und voll ausbauen.
let i = 0;
const cand = candidateSpots(s);
for (let k = 0; k < cand.length; k++) {
  {
    const sp = cand[k];
    const id = TOWER_ORDER[i++ % TOWER_ORDER.length];
    if (s.build(sp.x, sp.y, id)) {
      const t = s.towerUnder(sp.x, sp.y, 1)!;
      while (t.level < MAX_LEVEL) s.upgrade(t, (i % 2) as 0 | 1);
    }
  }
}

// Vorlage und Soll-Zahl stehen VOR der Anlaufschleife, weil `keepAlive` schon
// dort auffuellen will - eine spaetere Deklaration liefe in die zeitliche
// Totzone. Solange die Vorlage leer ist, tut `auffuellen` nichts.
let vorlage: typeof s.enemies = [];
let soll = 0;
let laufendeNummer = 1_000_000;

// **Gemessen wird im Endlosmodus**, und das ist keine Bequemlichkeit: er
// verhindert `finishRun` an der Wurzel (Ursache 4 im Kopf). Von aussen
// abwenden ginge nicht ohne Schaden - `finishRun` schreibt Bestwert, Sterne
// und Freischaltung in den Fortschritt, und dann haenge die Messung an dem,
// was sie misst (Regel 4).
s.endless = true;

// Letzte Welle starten und laufen lassen, bis viele Gegner unterwegs sind.
s.waveIndex = s.waves.length - 1;
s.gold = 1_000_000;
s.startWave();
for (let f = 0; f < 60 * 20; f++) { s.update(DT); keepAlive(); }

vorlage = s.enemies.slice();
const DUENN = vorlage.length;

/** Haelt die Gegner am Leben, den Kristall heil UND die Anzahl bei `soll`.
 *
 *  Die Anzahl ist der Teil, der bis v272 fehlte: Gegner erreichen den
 *  Kristall und verlassen das Feld, und ohne Nachschub misst dieses Werkzeug
 *  eine schmelzende Last. */
function keepAlive(): void {
  s.lives = 999;
  auffuellen();
  const list = s.enemies;
  for (let k = 0; k < list.length; k++) { list[k].hp = 1e9; list[k].hpMax = 1e9; }
}

function auffuellen(): void {
  if (!vorlage.length) return;
  if (s.enemies.length > soll) s.enemies.length = soll;
  let k = 0;
  while (s.enemies.length < soll) {
    s.enemies.push({ ...vorlage[k++ % vorlage.length], id: laufendeNummer++ });
  }
}

/** Eine Last messen: Anlauf, dann sieben Bloecke, gewertet wird der MEDIAN.
 *
 *  Der Median, nicht das Mittel ueber einen langen Block: die
 *  Laufzeitumgebung wirft je Lauf ein bis zwei Ausreisser, nach oben wie nach
 *  unten (gemessen 0,099 bis 0,202 ms bei einem Median von 0,112). Ein Mittel
 *  traegt sie mit, und eine Ratsche gegen eine zappelnde Zahl wird entweder
 *  stumm oder laestig.
 *
 *  Der Anlauf ist 2000 Schritte lang, nicht 400. Mit 400 waren die ersten
 *  drei Bloecke 0,159 / 0,180 / 0,190 und die letzten vier 0,110 bis 0,139 -
 *  das ist keine Streuung, das ist eine Rampe, und einen Median wirft sie
 *  nicht heraus. */
const BLOECKE = 7;
const JE_BLOCK = 400;
function messen(zahl: number): { median: number; min: number; max: number } {
  soll = zahl;
  for (let f = 0; f < 2000; f++) { s.update(DT); keepAlive(); }
  const bloecke: number[] = [];
  for (let b = 0; b < BLOECKE; b++) {
    const t0 = performance.now();
    for (let f = 0; f < JE_BLOCK; f++) { s.update(DT); keepAlive(); }
    bloecke.push((performance.now() - t0) / JE_BLOCK);
  }
  const sortiert = bloecke.sort((a, b) => a - b);
  return { median: sortiert[(BLOECKE - 1) >> 1], min: sortiert[0], max: sortiert[BLOECKE - 1] };
}

// Erst dicht, dann duenn - beide am selben warmen Zustand. Die Reihenfolge
// ist gewaehlt: die dichte Last laeuft durch mehr Zweige, also ist die
// Laufzeitumgebung fuer die duenne danach in jedem Fall warm. Andersherum
// waere die dichte Messung die erste, die einen Zweig sieht.
const dicht = messen(DICHT);
const duenn = messen(DUENN);
const faktor = dicht.median / duenn.median;
const towers = s.towers.length;

console.log(`MESSUNG: ${towers} Tuerme, Lasten ${DUENN} und ${DICHT} Gegner`);
console.log(
  `         dicht  ${dicht.median.toFixed(3)} ms je Simulationsschritt `
  + `(${BLOECKE} Bloecke ${dicht.min.toFixed(3)} bis ${dicht.max.toFixed(3)}, `
  + `Vollpruefung waere ${towers * DICHT} Distanzrechnungen)`,
);
console.log(
  `         duenn  ${duenn.median.toFixed(3)} ms je Simulationsschritt `
  + `(${BLOECKE} Bloecke ${duenn.min.toFixed(3)} bis ${duenn.max.toFixed(3)})`,
);
console.log(
  `         Dichtefaktor ${faktor.toFixed(2)} bei ${(DICHT / DUENN).toFixed(1)}-facher Last`,
);

if (SCHREIBEN) {
  // **Der Schreiber verschlechtert keinen Stand.**
  //
  // Das ist von `npm run sim` abgeschaut, und dort war es eine Reparatur:
  // in v262 hat der Griff genau die eine Kennzahl heruntergeschrieben, die
  // schlechter geworden war. Ein Schreiber, der Staende lockert, macht aus
  // der Ratsche eine Anzeige. Wer wirklich lockern will, aendert die Datei
  // von Hand und schreibt daneben, warum.
  const alt = leseStand();
  const neu = alt !== null && faktor > alt ? alt : faktor;
  if (alt !== null && neu !== faktor) {
    console.log(`MESSUNG: nicht gelockert - der alte Stand ${alt.toFixed(2)} bleibt `
      + `(gemessen ${faktor.toFixed(2)}).`);
  }
  writeFileSync(STAND_DATEI, `${KOPF}${neu.toFixed(2)}\n`);
  console.log(`MESSUNG: Stand geschrieben (Dichtefaktor ${neu.toFixed(2)}).`);
}

const fehler: string[] = [];

if (dicht.median > BUDGET_MS) {
  fehler.push(`ueber Budget - ${dicht.median.toFixed(3)} ms statt hoechstens ${BUDGET_MS} ms.`);
}

const stand = leseStand();
if (stand === null) {
  // **Eine leere Datei galt in v227 schon einmal als sauber**, und damit
  // haette ein `: > tools/bench-stand.txt` die Pruefung still abgeschaltet.
  // Dieselbe Falle steht hier - also wird sie hier benannt.
  fehler.push('tools/bench-stand.txt fehlt, ist leer oder unlesbar. Ohne Stand haelt '
    + 'die Ratsche nichts, und ein Lauf ohne Stand sieht aus wie ein Lauf ohne '
    + 'Rueckschritt. Mit `npx tsx tools/bench.ts --schreiben` neu setzen - und dabei '
    + 'wissen, dass man damit jeden Rueckschritt festschreibt.');
} else {
  const erlaubt = stand * (1 + BAND);
  console.log(
    `         Ratsche: Stand ${stand.toFixed(2)}, erlaubt bis ${erlaubt.toFixed(2)} `
    + `(+${(BAND * 100).toFixed(0)} % Rauschband).`,
  );
  if (faktor > erlaubt) {
    fehler.push(`Bildrate bricht ein - der Dichtefaktor steigt von ${stand.toFixed(2)} `
      + `auf ${faktor.toFixed(2)}, das sind ${(((faktor / stand) - 1) * 100).toFixed(0)} % `
      + `ueber dem Stand bei einem erlaubten Band von ${(BAND * 100).toFixed(0)} %. `
      + `Der heisse Pfad waechst wieder mit der Gegnerzahl. Gemessen an: ${towers} `
      + `Tuerme, ${DUENN} gegen ${DICHT} Gegner, Median ueber ${BLOECKE} Bloecke `
      + `(${duenn.median.toFixed(3)} und ${dicht.median.toFixed(3)} ms).`);
  }
}

if (fehler.length) {
  for (const f of fehler) console.error(`MESSUNG: ${f}`);
  process.exit(1);
}
console.log('MESSUNG: im Budget und auf dem Stand.');

/** Liest den Stand. Gibt `null` zurueck, wenn keine Zahl darin steht - eine
 *  fehlende Zahl ist kein guter Stand, sondern gar keiner. */
function leseStand(): number | null {
  let roh: string;
  try { roh = readFileSync(STAND_DATEI, 'utf8'); } catch { return null; }
  for (const zeile of roh.split('\n')) {
    const z = zeile.trim();
    if (!z || z.startsWith('#')) continue;
    const w = Number(z);
    return Number.isFinite(w) && w > 0 ? w : null;
  }
  return null;
}
