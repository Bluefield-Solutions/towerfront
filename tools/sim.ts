/** Kopflose Balance-Simulation.
 *  Ein Bot spielt alle Wellen mit verschiedenen Turmstrategien durch, ohne
 *  Browser, in Millisekunden. Jede Aenderung an Schaden, Kosten, Reichweite
 *  oder Gegnerwerten wird sofort daran gemessen.
 *  Aufruf: npx tsx tools/sim.ts */
import { GameState } from '../src/game/state';
import { COLS, ROWS, TILE } from '../src/data/config';
import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from '../src/data/difficulty';

const START_LIVES = DIFFICULTIES.normal.startLives;
import { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor, type TowerId } from '../src/data/towers';

import { MAPS } from '../src/data/maps';
import { ALL_PERKS, NO_PERKS, starsFor } from '../src/data/perks';
import { ABILITIES } from '../src/data/abilities';

const DT = 1 / 60;

const SEEDS = [20260807];

/** Eine Zahl, die Sieg und Niederlage vergleichbar macht: Niederlage zaehlt
 *  die erreichte Welle, Sieg 100 plus verbleibenden Kristall. */
function score(r: Result): number {
  return r.won ? 100 + r.lives : r.wave;
}

/** Spielstile.
 *
 *  Ein einzelner Bot ist ein einzelner Blickwinkel. Eine Kurve, die nur gegen
 *  "wenige starke Tuerme" stimmt, kann gegen "viele billige" voellig anders
 *  aussehen - und ein Mensch spielt mal so, mal so. Deshalb wird jede Runde
 *  gegen mehrere Stile gemessen. */
interface Bot {
  name: string;
  /** Wie viele Tuerme dieser Stil hoechstens stellt. */
  maxTowers: number;
  /** Bis zu welcher Stufe ausgebaut wird. */
  maxLevel: number;
  /** Wieviel Gold liegen bleibt, um auf eine Welle reagieren zu koennen. */
  reserve: number;
  /** Bilder zwischen zwei Entscheidungen - ein Mensch tippt nicht 60-mal je Sekunde. */
  decideEvery: number;
  /** Ab welchem Anteil der Turmzahl in die Tiefe statt in die Breite investiert wird. */
  deepenAt: number;
}

/** Die Stile bilden unterschiedliche *Entscheidungen* ab, keine Fehler.
 *  "Nie ueber Stufe 2 ausbauen" waere kein Stil, sondern schlechtes Spiel -
 *  dass ein schlecht gespieltes Feld verliert, ist gewollt. */
const BOTS: Bot[] = [
  {
    name: 'Meister', maxTowers: 16, maxLevel: 3, reserve: 40, decideEvery: 30, deepenAt: 1,
  },
  {
    // Erst in die Breite, dann in die Tiefe: viele Stellungen, spaeter ausgebaut.
    name: 'Breite', maxTowers: 26, maxLevel: 3, reserve: 15, decideEvery: 20, deepenAt: 0.85,
  },
  {
    // Wenige Stellungen, frueh tief ausgebaut, viel Gold in der Hand.
    name: 'Sparsam', maxTowers: 11, maxLevel: 3, reserve: 140, decideEvery: 30, deepenAt: 0.6,
  },
];

const MEISTER = BOTS[0];

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
  maxLives: number;
  earned: number; spent: number;
  leakByWave: number[];
}

type BranchPick = (id: TowerId) => 0 | 1;

function play(
  strategy: TowerId[], pick: BranchPick = () => 0,
  bot: Bot = MEISTER, difficulty: DifficultyId = 'normal',
  mapId: string = MAPS[0].id,
  opts: { endless?: boolean; perks?: typeof NO_PERKS; seed?: number } = {},
): Result {
  const s = new GameState(mapId);
  s.reset(opts.seed ?? SEEDS[0], difficulty, mapId,
    { endless: opts.endless, perks: opts.perks ?? NO_PERKS });
  const spots = buildSpots(s);
  let spotIdx = 0, si = 0, t = 0, frame = 0, upgrades = 0;
  let peakEnemies = 0, peakFx = 0;
  const leakByWave = new Array(s.waves.length).fill(0);
  let lastLives = s.lives;

  while (s.phase === 'playing' && t < 60 * 45) {
    if (frame % bot.decideEvery === 0) {
      let id = strategy[si % strategy.length];
      if (s.gold < TOWERS[id].base.cost) {
        const affordable = strategy.filter((c) => s.gold >= TOWERS[c].base.cost + bot.reserve);
        if (affordable.length) id = affordable[0];
      }

      const wantBuild = s.towers.length < bot.maxTowers * bot.deepenAt &&
        spotIdx < spots.length && s.gold >= TOWERS[id].base.cost + bot.reserve;

      if (wantBuild) {
        const sp = spots[spotIdx];
        if (s.build(sp.x, sp.y, id)) { si++; }
        spotIdx++;
      } else {
        // In die Tiefe: immer in den Turm, der bisher am meisten geleistet hat.
        let best: (typeof s.towers)[number] | null = null;
        for (const tw of s.towers) {
          if (tw.level >= Math.min(bot.maxLevel, MAX_LEVEL)) continue;
          const n = nextFor(TOWERS[tw.def], tw.branch ?? pick(tw.def), tw.level);
          if (!n || s.gold < n.cost + bot.reserve) continue;
          if (!best || tw.damageDone > best.damageDone) best = tw;
        }
        if (best && s.upgrade(best, (best.branch ?? pick(best.def)) as 0 | 1)) upgrades++;
        else if (s.towers.length < bot.maxTowers && spotIdx < spots.length &&
          s.gold >= TOWERS[id].base.cost + bot.reserve) {
          const sp = spots[spotIdx];
          if (s.build(sp.x, sp.y, id)) si++;
          spotIdx++;
        }
      }
      useAbilities(s);
    }

    const wi = Math.min(s.waveIndex, s.waves.length - 1);
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
    towers: s.towers.length, upgrades, peakEnemies, peakFx, leakByWave, maxLives: s.maxLives,
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
const mixedPlanBase: TowerId[] = ['arrow', 'arrow', 'mortar', 'frost', 'prism'];

// Mehrere Spielstile: die Kurve muss fuer mehr als einen Blickwinkel stimmen.
console.log('\nSpielstile (gemischtes Feld):');
const styleRuns = new Map<string, Result>();
for (const bot of BOTS) {
  const r = play(mixedPlanBase, () => 0, bot);
  styleRuns.set(bot.name, r);
  const verdict = r.won ? `gewonnen, Kristall ${r.lives}/${START_LIVES}` : `verloren in Welle ${r.wave}`;
  console.log(
    `  ${bot.name.padEnd(9)} ${verdict.padEnd(30)}` +
    `${r.towers} Tuerme, ${r.upgrades} Ausbauten, ${r.earned} Gold`,
  );
}

// Robustheitsprobe.
//
// Beim Versuch, in v21 einen Werkzeugturm einzubauen, sprang das Ergebnis bei
// kleinsten Aenderungen zwischen 5 und 20 Kristall. Der erste Verdacht war
// Rauschen - falsch: der Spielverlauf hat gar keinen Zufall, der auf das
// Ergebnis wirkt (drei Aussaaten liefern dasselbe bis aufs Goldstueck).
//
// Der wahre Grund ist eine Kante: alle Verluste haengen an einer einzigen
// spaeten Welle. Entweder das Feld haelt sie - dann ist der Lauf makellos -
// oder es haelt sie nicht - dann bricht alles weg. Dazwischen gibt es nichts.
//
// Diese Probe macht die Kante sichtbar: dasselbe Feld mit 10 % mehr und 10 %
// weniger Schaden. Bewegt sich das Ergebnis dabei um mehr als 40 Punkte, haengt
// die Balance an einem Faden - und dann ist jede weitere Feinjustierung
// Gluecksspiel statt Arbeit.
{
  const shifted = (mul: number) => {
    const perks = { ...NO_PERKS, damageMul: mul };
    return play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { perks });
  };
  const runs = [0.9, 1, 1.1].map(shifted);
  const scores = runs.map(score);
  const span = Math.max(...scores) - Math.min(...scores);
  console.log(
    '\nRobustheit (Schaden -10 % / normal / +10 %): ' +
    runs.map((r) => (r.won ? `${r.lives}/${r.maxLives}` : `W${r.wave}`)).join('   ') +
    `   Spanne ${span}`,
  );
  const flawless = runs.findIndex((r) => r.won && r.lives >= r.maxLives);
  if (flawless >= 0 && !(runs[1].won && runs[1].lives >= runs[1].maxLives)) {
    console.log(
      '  Hinweis: schon 10 % mehr Schaden machen den Lauf makellos - die ' +
      'Entscheidung faellt an einer einzigen Welle.',
    );
  }
  if (span > 40) {
    errors.push(
      `Zehn Prozent Schaden bewegen das Ergebnis um ${span} Punkte - die Balance ` +
      'haengt an einer einzelnen Welle. Erst die Kante glaetten, dann weiter bauen.',
    );
  }
}

// Dauerhafte Verbesserungen duerfen helfen, aber nicht den Grad ersetzen.
{
  const plain = play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id);
  const buffed = play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { perks: ALL_PERKS });
  const hardBuffed = play(
    mixedPlanBase, () => 0, MEISTER, 'erbarmungslos', MAPS[0].id, { perks: ALL_PERKS },
  );
  console.log('\nFortschritt (Meister, Spiralhain):');
  console.log(
    `  ohne Verbesserungen ${plain.won ? `${plain.lives}/${plain.maxLives}` : `W${plain.wave}`}` +
    `   mit allen ${buffed.won ? `${buffed.lives}/${buffed.maxLives}` : `W${buffed.wave}`}` +
    `   erbarmungslos mit allen ` +
    `${hardBuffed.won ? `${hardBuffed.lives}/${hardBuffed.maxLives}` : `W${hardBuffed.wave}`}`,
  );
  if (buffed.won && plain.won && buffed.lives < plain.lives) {
    errors.push('Die dauerhaften Verbesserungen machen den Lauf schlechter statt besser.');
  }
  if (hardBuffed.won && hardBuffed.lives >= hardBuffed.maxLives) {
    errors.push('Mit allen Verbesserungen ist Erbarmungslos verlustfrei - der Fortschritt ersetzt den Grad.');
  }
  // Sterne muessen ueberhaupt vergeben werden koennen und drei muessen schwer sein.
  if (starsFor(true, plain.maxLives, plain.maxLives) !== 3) errors.push('Ein makelloser Lauf gibt keine drei Sterne.');
  if (starsFor(false, 0, 20) !== 0) errors.push('Eine Niederlage gibt Sterne.');
  if (plain.won && starsFor(true, plain.lives, plain.maxLives) === 3) {
    errors.push('Der uebliche Sieg gibt schon drei Sterne - dann ist der dritte wertlos.');
  }
}

// Der Endlosmodus muss enden - aber nicht zu frueh.
{
  const e = play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { endless: true });
  console.log(`  Endlos: bis Welle ${e.wave}, ${e.towers} Tuerme`);
  if (e.won) errors.push('Der Endlosmodus wurde gewonnen - er darf kein Ende haben.');
  if (e.wave <= MAPS[0].waves.length) {
    errors.push(`Endlos endet in Welle ${e.wave} - vor dem Ende des normalen Plans.`);
  }
  if (e.wave > MAPS[0].waves.length + 25) {
    errors.push(`Endlos laeuft bis Welle ${e.wave} - die Steigerung ist zu flach.`);
  }
}

// Jede Karte muss fuer sich spielbar sein. Eine Karte, die nur mit einem
// einzigen Stil zu schaffen ist, ist keine zweite Karte, sondern eine Huerde.
console.log('\nKarten (Normal, alle Stile):');
const mapRuns = new Map<string, Result>();
for (const m of MAPS) {
  const line: string[] = [];
  for (const bot of BOTS) {
    const r = play(mixedPlanBase, () => 0, bot, 'normal', m.id);
    mapRuns.set(`${m.id}:${bot.name}`, r);
    line.push(`${bot.name} ${r.won ? `${r.lives}/${r.maxLives}` : `W${r.wave}`}`);
  }
  console.log(`  ${m.name.padEnd(15)} ${line.join('   ')}`);
}

// Jeder Schwierigkeitsgrad bekommt eine eigene Pruefung. Ein Grad, den kein
// Spielstil schafft, ist kein Grad, sondern ein Fehler - und einer, der jeden
// Stil muehelos durchlaesst, ebenso.
console.log('\nSchwierigkeitsgrade (gemischtes Feld, alle Stile):');
const diffRuns = new Map<string, Result>();
for (const id of DIFFICULTY_ORDER) {
  const line: string[] = [];
  for (const bot of BOTS) {
    const r = play(mixedPlanBase, () => 0, bot, id);
    diffRuns.set(`${id}:${bot.name}`, r);
    line.push(`${bot.name} ${r.won ? `${r.lives}/${r.maxLives}` : `W${r.wave}`}`);
  }
  console.log(`  ${DIFFICULTIES[id].name.padEnd(15)} ${line.join('   ')}`);
}

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
const mixedPlan = mixedPlanBase;
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

// 4c. Mehr als ein Spielstil muss durchkommen, und keiner muehelos.
{
  const won = BOTS.filter((b) => styleRuns.get(b.name)!.won);
  if (won.length < 2) {
    errors.push(
      `Nur ${won.length} von ${BOTS.length} Spielstilen kommt durch - die Kurve ist zu eng gestellt.`,
    );
  }
  for (const b of BOTS) {
    const r = styleRuns.get(b.name)!;
    if (r.won && r.lives >= START_LIVES) {
      errors.push(`Spielstil "${b.name}" gewinnt ohne einen einzigen Verlust - zu einfach.`);
    }
  }
}

// 4d. Die Grade muessen sich unterscheiden und jeder muss Sinn ergeben.
{
  const wonCount = (id: DifficultyId) => BOTS.filter((b) => diffRuns.get(`${id}:${b.name}`)!.won).length;
  if (wonCount('ruhig') < BOTS.length) {
    errors.push('Ruhig: nicht jeder Spielstil kommt durch - der leichteste Grad muss verzeihen.');
  }
  if (wonCount('erbarmungslos') < 1) {
    errors.push('Erbarmungslos: kein Spielstil kommt durch - das ist kein Grad, sondern eine Wand.');
  }
  const hard = diffRuns.get('erbarmungslos:Meister')!;
  if (hard.won && hard.lives > hard.maxLives * 0.6) {
    errors.push(
      `Erbarmungslos: der Meister gewinnt mit ${hard.lives}/${hard.maxLives} - zu bequem fuer den haertesten Grad.`,
    );
  }
  if (wonCount('ruhig') <= wonCount('erbarmungslos')) {
    errors.push('Ruhig ist nicht leichter als Erbarmungslos - die Grade unterscheiden sich nicht.');
  }
}

// 4e. Jede Karte muss von mindestens zwei Stilen zu schaffen sein und keine
//     darf muehelos sein.
for (const m of MAPS) {
  const runs = BOTS.map((b) => mapRuns.get(`${m.id}:${b.name}`)!);
  const won = runs.filter((r) => r.won);
  if (won.length < 2) {
    errors.push(`Karte "${m.name}": nur ${won.length} von ${BOTS.length} Stilen kommt durch.`);
  }
  if (won.length && won.every((r) => r.lives >= r.maxLives)) {
    errors.push(`Karte "${m.name}": jeder Sieg ohne einen einzigen Verlust - zu einfach.`);
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
