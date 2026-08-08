/** Kopflose Balance-Simulation.
 *  Ein Bot spielt alle Wellen mit verschiedenen Turmstrategien durch, ohne
 *  Browser, in Millisekunden. Jede Aenderung an Schaden, Kosten, Reichweite
 *  oder Gegnerwerten wird sofort daran gemessen.
 *  Aufruf: npx tsx tools/sim.ts */
import { GameState } from '../src/game/state';
import { COLS, ROWS, TILE, START_LIVES } from '../src/data/config';
import { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor, type TowerId } from '../src/data/towers';
import { WAVES } from '../src/data/waves';
import { ABILITIES } from '../src/data/abilities';

const DT = 1 / 60;

/** Wie viele Tuerme ein Mensch auf dieser Karte tatsaechlich stellt.
 *  Vorher baute der Bot auf jeden freien Platz - rund hundert Stueck. Bei der
 *  Uebermacht war jede Balanceaussage wertlos: ein absichtlich entwerteter
 *  Ausbauzweig fiel nicht einmal auf. */
const MAX_TOWERS = 16;

/** Nur alle 0,5 Sekunden wird entschieden. Ein Mensch tippt nicht sechzigmal
 *  je Sekunde. */
const DECIDE_EVERY = 30;

/** Wieviel Gold liegen bleibt, damit auf eine Welle noch reagiert werden kann. */
const RESERVE = 40;

/** Bauplaetze nach Deckung bewertet: wie viele Pfadzellen liegen in Reichweite
 *  eines Turms auf dieser Zelle. Naehe allein taugt nicht - eine Zelle in der
 *  Innenkurve der Spirale deckt drei Pfadabschnitte, eine am Rand nur einen. */
function buildSpots(s: GameState) {
  const spots: { x: number; y: number; score: number }[] = [];
  const reach = 210 / TILE;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!s.canBuild(x, y)) continue;
      let covered = 0;
      let nearest = 1e9;
      for (const k of s.pathSet) {
        const px = k % COLS, py = Math.floor(k / COLS);
        const d2 = (px - x) ** 2 + (py - y) ** 2;
        if (d2 <= reach * reach) covered++;
        if (d2 < nearest) nearest = d2;
      }
      if (nearest > 4) continue; // zu weit weg, um je zu feuern
      spots.push({ x, y, score: covered });
    }
  }
  return spots.sort((a, b) => b.score - a.score);
}

interface Result {
  lives: number; wave: number; won: boolean;
  towers: number; upgrades: number; peakEnemies: number; peakFx: number;
  earned: number; spent: number;
  leakByWave: number[];
}

type BranchPick = (id: TowerId) => 0 | 1;

function play(strategy: TowerId[], pick: BranchPick = () => 0): Result {
  const s = new GameState();
  s.reset(20260807);
  const spots = buildSpots(s);
  let spotIdx = 0, si = 0, t = 0, frame = 0, upgrades = 0;
  let peakEnemies = 0, peakFx = 0;
  const leakByWave = new Array(WAVES.length).fill(0);
  let lastLives = s.lives;

  while (s.phase === 'playing' && t < 60 * 45) {
    if (frame % DECIDE_EVERY === 0) {
      // Eine Entscheidung je Takt, nicht zehn.
      let id = strategy[si % strategy.length];
      if (s.gold < TOWERS[id].base.cost) {
        const affordable = strategy.filter((c) => s.gold >= TOWERS[c].base.cost + RESERVE);
        if (affordable.length) id = affordable[0];
      }

      // Erst das Feld auf Breite bringen, dann in die Tiefe investieren -
      // und zwar in den Turm, der bisher am meisten geleistet hat.
      const wantBuild = s.towers.length < MAX_TOWERS && spotIdx < spots.length &&
        s.gold >= TOWERS[id].base.cost + RESERVE;

      if (wantBuild) {
        const sp = spots[spotIdx];
        if (s.build(sp.x, sp.y, id)) { si++; }
        spotIdx++;
      } else {
        let best: (typeof s.towers)[number] | null = null;
        for (const tw of s.towers) {
          if (tw.level >= MAX_LEVEL) continue;
          const n = nextFor(TOWERS[tw.def], tw.branch ?? pick(tw.def), tw.level);
          if (!n || s.gold < n.cost + RESERVE) continue;
          if (!best || tw.damageDone > best.damageDone) best = tw;
        }
        if (best && s.upgrade(best, (best.branch ?? pick(best.def)) as 0 | 1)) upgrades++;
      }
      useAbilities(s);
    }

    const wi = Math.min(s.waveIndex, WAVES.length - 1);
    if (s.canStartWave) s.startWave();
    s.update(DT);
    t += DT;
    frame++;
    if (s.lives < lastLives) { leakByWave[wi] += lastLives - s.lives; lastLives = s.lives; }
    if (s.enemies.length > peakEnemies) peakEnemies = s.enemies.length;
    const fx = s.particles.length + s.projectiles.length + s.rings.length;
    if (fx > peakFx) peakFx = fx;
  }
  return {
    lives: s.lives, wave: s.waveNumber, won: s.phase === 'won',
    towers: s.towers.length, upgrades, peakEnemies, peakFx, leakByWave,
    earned: s.stats.goldEarned, spent: s.stats.goldSpent,
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
  console.log(`${name.padEnd(13)} -> ${verdict.padEnd(28)} ${r.towers} Tuerme, ${r.upgrades} Ausbauten, ${r.earned} Gold verdient, ${r.earned - r.spent} uebrig`);
}

const mixed = results.get('gemischt')!;

// Kein toter Zweig.
//
// Die naheliegende Pruefung - einmal alles auf Zweig A, einmal alles auf
// Zweig B - ist zu grob: kein Mensch schickt sein ganzes Feld in dieselbe
// Richtung, und ein einzelner schwacher Zweig verschwindet in der Summe oder
// reisst umgekehrt das ganze Feld mit.
//
// Geprueft wird deshalb einzeln: ein gemischtes Feld, in dem genau ein
// Turmtyp in den einen oder den anderen Zweig geht, alle anderen bleiben auf
// Zweig A. So faellt auf, welcher Zweig genau nicht traegt.
const mixedPlan: TowerId[] = ['arrow', 'arrow', 'mortar', 'frost', 'prism'];
console.log('\nZweige einzeln (gemischtes Feld, ein Turmtyp umgestellt):');
const branchRuns = new Map<string, Result>();
for (const id of TOWER_ORDER) {
  for (const b of [0, 1] as const) {
    const r = play(mixedPlan, (t) => (t === id ? b : 0));
    branchRuns.set(`${id}:${b}`, r);
  }
}
for (const id of TOWER_ORDER) {
  const a = branchRuns.get(`${id}:0`)!, b = branchRuns.get(`${id}:1`)!;
  const fmt = (r: Result) => (r.won ? `${r.lives}/${START_LIVES}` : `verloren W${r.wave}`);
  const def = TOWERS[id];
  console.log(
    `  ${def.name.padEnd(11)} ${def.branches[0].name.padEnd(15)} ${fmt(a).padEnd(14)}` +
    `${def.branches[1].name.padEnd(15)} ${fmt(b)}`,
  );
}

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

// 4b. Jeder einzelne Zweig muss ein gemischtes Feld tragen, und die beiden
//     Zweige eines Turms duerfen nicht weit auseinanderliegen.
for (const id of TOWER_ORDER) {
  const def = TOWERS[id];
  const a = branchRuns.get(`${id}:0`)!, b = branchRuns.get(`${id}:1`)!;
  for (const [br, r] of [[def.branches[0], a], [def.branches[1], b]] as const) {
    if (!r.won) errors.push(`${def.name} / ${br.name}: gewinnt nicht - toter Ausbaupfad.`);
  }
  if (a.won && b.won && Math.abs(a.lives - b.lives) > 7) {
    errors.push(
      `${def.name}: die Zweige liegen ${Math.abs(a.lives - b.lives)} Kristall auseinander - ` +
      `"${a.lives > b.lives ? def.branches[0].name : def.branches[1].name}" ist die klar bessere Wahl.`,
    );
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
