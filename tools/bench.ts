/** Mikro-Messung des heissen Pfades.
 *
 *  Baut ein Feld im schlimmsten Fall auf - jeder Bauplatz belegt, letzte Welle
 *  unterwegs - und misst, wie lange ein Simulationsschritt dauert. Das ist die
 *  Zahl, die auf dem iPhone ueber fluessig oder ruckelig entscheidet: bei
 *  60 Bildern pro Sekunde stehen insgesamt 16,7 ms zur Verfuegung, und davon
 *  braucht das Zeichnen den groesseren Teil.
 *
 *  Aufruf: npx tsx tools/bench.ts */
import { GameState } from '../src/game/state';
import { } from '../src/data/config';
import { MAX_LEVEL, TOWER_ORDER } from '../src/data/towers';


const DT = 1 / 60;
const BUDGET_MS = 4; // Obergrenze fuer die reine Simulation je Bild

const s = new GameState();
s.reset();
s.gold = 1_000_000;

// Jeden Bauplatz belegen und voll ausbauen.
let i = 0;
for (let spot = 0; spot < s.map.spots.length; spot++) {
    {
      if (!s.canBuild(spot)) continue;
    const id = TOWER_ORDER[i++ % TOWER_ORDER.length];
    if (s.build(spot, id)) {
      const t = s.towerOnSpotIndex(spot)!;
      while (t.level < MAX_LEVEL) s.upgrade(t, (i % 2) as 0 | 1);
    }
  }
}

// Letzte Welle starten und laufen lassen, bis viele Gegner unterwegs sind.
s.waveIndex = s.waves.length - 1;
s.gold = 1_000_000;
s.startWave();
for (let f = 0; f < 60 * 20; f++) { s.update(DT); keepAlive(); }

// Mit "--dicht" wird die Gegnerzahl vervielfacht. Das nimmt vorweg, was
// groessere Karten und laengere Wellen spaeter tatsaechlich erzeugen.
const dense = process.argv.includes('--dicht');
if (dense) {
  const base = s.enemies.slice();
  while (s.enemies.length < 320 && base.length) {
    for (const e of base) {
      if (s.enemies.length >= 320) break;
      s.enemies.push({ ...e, id: 1_000_000 + s.enemies.length });
    }
  }
}

const towers = s.towers.length;
const enemies = s.enemies.length;

/** Haelt die Gegner am Leben und den Kristall heil, damit die Messung ueber
 *  die ganze Dauer die gleiche Last sieht. Kostet einen Durchlauf ueber die
 *  Gegnerliste - vernachlaessigbar gegenueber dem, was gemessen wird. */
function keepAlive(): void {
  s.lives = 999;
  const list = s.enemies;
  for (let k = 0; k < list.length; k++) { list[k].hp = 1e9; list[k].hpMax = 1e9; }
}

// Aufwaermen, damit die Laufzeitumgebung optimiert hat.
for (let f = 0; f < 400; f++) { s.update(DT); keepAlive(); }

const RUNS = 1500;
const t0 = performance.now();
for (let f = 0; f < RUNS; f++) { s.update(DT); keepAlive(); }
const ms = (performance.now() - t0) / RUNS;

const naive = towers * enemies;
console.log(
  `MESSUNG: ${towers} Tuerme, ${enemies} Gegner, ` +
  `${s.projectiles.length} Geschosse, ${s.particles.length} Partikel`,
);
console.log(
  `         ${ms.toFixed(3)} ms je Simulationsschritt ` +
  `(Budget ${BUDGET_MS} ms, Vollpruefung waere ${naive} Distanzrechnungen)`,
);

if (ms > BUDGET_MS) {
  console.error(`MESSUNG: ueber Budget - ${ms.toFixed(3)} ms statt hoechstens ${BUDGET_MS} ms.`);
  process.exit(1);
}
console.log('MESSUNG: im Budget.');
