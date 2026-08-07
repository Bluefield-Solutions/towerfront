/** Kopflose Balance-Simulation.
 *  Ein simpler Bot baut und baut aus, spielt alle Wellen und meldet,
 *  wie viele Kristallpunkte uebrig bleiben. Laeuft ohne Browser.
 *  Aufruf: npx tsx tools/sim.ts */
import { GameState } from '../src/game/state';
import { COLS, ROWS } from '../src/data/config';
import { TOWERS, type TowerId } from '../src/data/towers';

const DT = 1 / 60;

function buildSpots(s: GameState): { x: number; y: number; score: number }[] {
  const spots: { x: number; y: number; score: number }[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!s.canBuild(x, y)) continue;
      // Naehe zum Pfad = gute Position
      let best = 1e9;
      for (const k of s.pathSet) {
        const px = k % COLS, py = Math.floor(k / COLS);
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < best) best = d;
      }
      spots.push({ x, y, score: best });
    }
  }
  return spots.sort((a, b) => a.score - b.score);
}

function play(strategy: TowerId[]): { lives: number; wave: number; won: boolean } {
  const s = new GameState();
  s.reset();
  const spots = buildSpots(s);
  let spotIdx = 0;
  let si = 0;
  let t = 0;

  while (s.phase === 'playing' && t < 60 * 30) {
    // Bot: kauft, sobald es geht; baut ab und zu aus.
    let guard = 0;
    while (guard++ < 8) {
      const upgradable = s.towers.find(
        (tw) => tw.level < TOWERS[tw.def].levels.length &&
          s.gold >= TOWERS[tw.def].levels[tw.level].cost + 60,
      );
      const id = strategy[si % strategy.length];
      if (spotIdx < spots.length && s.gold >= TOWERS[id].levels[0].cost) {
        const sp = spots[spotIdx];
        if (s.build(sp.x, sp.y, id)) { spotIdx++; si++; continue; }
        spotIdx++;
        continue;
      }
      if (upgradable && s.upgrade(upgradable)) continue;
      break;
    }
    if (s.canStartWave) s.startWave();
    s.update(DT);
    t += DT;
  }
  return { lives: s.lives, wave: s.waveNumber, won: s.phase === 'won' };
}

const strategies: Record<string, TowerId[]> = {
  'nur Bogen': ['arrow'],
  'nur Frost': ['frost'],
  'gemischt': ['arrow', 'arrow', 'frost'],
};

let fail = 0;
for (const [name, plan] of Object.entries(strategies)) {
  const r = play(plan);
  const verdict = r.won ? 'gewonnen' : `verloren in Welle ${r.wave}`;
  console.log(`${name.padEnd(12)} -> ${verdict}, Kristall ${r.lives}/20`);
  if (name === 'gemischt' && !r.won) fail++;
  if (name === 'nur Frost' && r.won) {
    console.log('  WARNUNG: reine Frosttuerme gewinnen - zu wenig Druck auf Schadensvielfalt.');
  }
}
if (fail) { console.error('BALANCE-CHECK: gemischte Strategie muss gewinnen.'); process.exit(1); }
console.log('BALANCE-CHECK: bestanden.');
