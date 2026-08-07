/** Kopflose Balance-Simulation.
 *  Ein Bot spielt alle Wellen mit verschiedenen Turmstrategien durch, ohne
 *  Browser, in Millisekunden. Jede Aenderung an Schaden, Kosten, Reichweite
 *  oder Gegnerwerten wird sofort daran gemessen.
 *  Aufruf: npx tsx tools/sim.ts */
import { GameState } from '../src/game/state';
import { COLS, ROWS, START_LIVES } from '../src/data/config';
import { TOWERS, type TowerId } from '../src/data/towers';
import { WAVES } from '../src/data/waves';
import { ABILITIES } from '../src/data/abilities';

const DT = 1 / 60;

function buildSpots(s: GameState) {
  const spots: { x: number; y: number; score: number }[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!s.canBuild(x, y)) continue;
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

interface Result {
  lives: number; wave: number; won: boolean;
  towers: number; peakEnemies: number; peakFx: number;
  leakByWave: number[];
}

function play(strategy: TowerId[]): Result {
  const s = new GameState();
  s.reset();
  const spots = buildSpots(s);
  let spotIdx = 0, si = 0, t = 0;
  let peakEnemies = 0, peakFx = 0;
  const leakByWave = new Array(WAVES.length).fill(0);
  let lastLives = s.lives;

  while (s.phase === 'playing' && t < 60 * 45) {
    let guard = 0;
    while (guard++ < 10) {
      // Ist der geplante Turm zu teuer, nimmt der Bot den naechsten
      // bezahlbaren aus dem Plan - so wuerde ein Mensch es auch machen.
      let id = strategy[si % strategy.length];
      if (s.gold < TOWERS[id].levels[0].cost) {
        const affordable = strategy.filter((c) => s.gold >= TOWERS[c].levels[0].cost);
        if (affordable.length) id = affordable[0];
      }
      const up = s.towers.find(
        (tw) => tw.level < TOWERS[tw.def].levels.length &&
          s.gold >= TOWERS[tw.def].levels[tw.level].cost + 70,
      );
      if (spotIdx < spots.length && s.gold >= TOWERS[id].levels[0].cost) {
        const sp = spots[spotIdx];
        if (s.build(sp.x, sp.y, id)) { spotIdx++; si++; continue; }
        spotIdx++;
        continue;
      }
      if (up && s.upgrade(up)) continue;
      break;
    }
    useAbilities(s);
    const wi = Math.min(s.waveIndex, WAVES.length - 1);
    if (s.canStartWave) s.startWave();
    s.update(DT);
    t += DT;
    if (s.lives < lastLives) { leakByWave[wi] += lastLives - s.lives; lastLives = s.lives; }
    if (s.enemies.length > peakEnemies) peakEnemies = s.enemies.length;
    const fx = s.particles.length + s.projectiles.length + s.rings.length;
    if (fx > peakFx) peakFx = fx;
  }
  return {
    lives: s.lives, wave: s.waveNumber, won: s.phase === 'won',
    towers: s.towers.length, peakEnemies, peakFx, leakByWave,
  };
}

/** Der Bot nutzt die Faehigkeiten so, wie ein aufmerksamer Spieler es taete:
 *  den Meteor auf die dichteste Traube, den Frostschlag, wenn es eng wird. */
function useAbilities(s: GameState): void {
  if (s.ready('meteor') && s.enemies.length >= 5) {
    const r2 = (ABILITIES.meteor.radius ?? 100) ** 2;
    let best = null, bestN = 0;
    for (const a of s.enemies) {
      let n = 0;
      for (const b of s.enemies) {
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r2) n++;
      }
      if (n > bestN) { bestN = n; best = a; }
    }
    if (best && bestN >= 4) s.cast('meteor', best.x, best.y);
  }
  if (s.ready('freeze')) {
    const near = s.enemies.filter((e) => e.travelled > s.pathTotal * 0.75).length;
    if (near >= 4) s.cast('freeze', 0, 0);
  }
}

const strategies: Record<string, TowerId[]> = {
  'nur Bogen': ['arrow'],
  'nur Frost': ['frost'],
  'nur Moerser': ['mortar'],
  'nur Prisma': ['prism'],
  'moerserlastig': ['mortar', 'mortar', 'arrow'],
  'gemischt': ['arrow', 'arrow', 'mortar', 'frost', 'prism'],
};

const errors: string[] = [];
const results = new Map<string, Result>();

for (const [name, plan] of Object.entries(strategies)) {
  const r = play(plan);
  results.set(name, r);
  const verdict = r.won ? `gewonnen, Kristall ${r.lives}/${START_LIVES}` : `verloren in Welle ${r.wave}`;
  console.log(`${name.padEnd(12)} -> ${verdict}  (${r.towers} Tuerme, max ${r.peakEnemies} Gegner, max ${r.peakFx} Effekte)`);
}

const mixed = results.get('gemischt')!;

// 1. Die gemischte Strategie muss gewinnen, sonst ist die Kurve zu steil.
if (!mixed.won) errors.push('Gemischt muss gewinnen - die Kurve ist zu steil.');

// 2. Sie darf nicht muehelos gewinnen, sonst fehlt die Spannung.
if (mixed.won && mixed.lives === START_LIVES) {
  errors.push('Gemischt gewinnt ohne einen einzigen Verlust - zu einfach.');
}

// 3. Ein Feld mit Uebergewicht am Boden muss an den Schwaermern scheitern -
//    sonst waere der fliegende Gegner nur Dekoration.
const ground = results.get('moerserlastig');
if (ground && ground.won && ground.lives >= mixed.lives) {
  errors.push('Moerserlastig kommt genauso weit wie gemischt - Flieger stellen keine Frage.');
}

// 4. Keine einzelne Turmsorte darf das Spiel allein tragen.
for (const [name, r] of results) {
  if (name === 'gemischt') continue;
  if (r.won && r.lives > START_LIVES * 0.85) {
    errors.push(`"${name}" gewinnt allein mit ${r.lives}/${START_LIVES} - dominiert das Feld.`);
  }
}

// 5. Effektbudget: was die Simulation erzeugt, muss der Browser zeichnen koennen.
if (mixed.peakFx > 900) errors.push(`Effektspitze ${mixed.peakFx} ist zu hoch fuer das Handy.`);

// Wo tut es weh - Grundlage fuer die naechste Feinjustierung.
const hot = mixed.leakByWave
  .map((v, i) => ({ w: i + 1, v }))
  .filter((o) => o.v > 0);
if (hot.length) {
  console.log('Verluste (gemischt): ' + hot.map((o) => `W${o.w}:${o.v}`).join('  '));
}

if (errors.length) {
  console.error('BALANCE-CHECK: nicht bestanden');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('BALANCE-CHECK: bestanden.');
