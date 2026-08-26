/** Kopflose Balance-Simulation.
 *  Ein Bot spielt alle Wellen mit verschiedenen Turmstrategien durch, ohne
 *  Browser, in Millisekunden. Jede Aenderung an Schaden, Kosten, Reichweite
 *  oder Gegnerwerten wird sofort daran gemessen.
 *  Aufruf: npx tsx tools/sim.ts */
import { GameState } from '../src/game/state';
import { ZIELWAHL_ORDNUNG, type Zielwahl, type Tower } from '../src/game/types';

import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from '../src/data/difficulty';

const START_LIVES = DIFFICULTIES.normal.startLives;
import { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor, type TowerId } from '../src/data/towers';

import { MAPS, lanePaths } from '../src/data/maps';
import { ALL_PERKS, NO_PERKS, starsFor } from '../src/data/perks';
import { ABILITIES } from '../src/data/abilities';
import { candidateSpots } from './spots';

const DT = 1 / 60;

const SEEDS = [20260807];

/** Drei leicht abgewandelte Spielverlaeufe je Messung.
 *
 *  Der Verlauf ist path-abhaengig: wann Gold ankommt, entscheidet, welcher
 *  Turm zuerst steht, und das entscheidet den Rest. Deshalb kann selbst
 *  *mehr* Schaden zu einem schlechteren Ergebnis fuehren - gemessen an einem
 *  einzelnen Verlauf ist das Chaos, nicht Balance. Erst der Mittelwert ueber
 *  mehrere vernuenftige Verlaeufe ist eine Zahl, nach der man justieren kann. */
const VARIANTS = [0, 1, 2];

/** Mittelwert einer Kennzahl ueber alle Abwandlungen. */
function overVariants(run: (variant: number) => Result): { runs: Result[]; mean: number } {
  const runs = VARIANTS.map(run);
  return { runs, mean: runs.reduce((a, r) => a + score(r), 0) / runs.length };
}

/** Eine Zahl, die Sieg und Niederlage vergleichbar macht: Niederlage zaehlt
 *  die erreichte Welle, Sieg 100 plus verbleibenden Kristall. */
function score(r: Result): number {
  // Bewusst normiert von 0 bis 100 und nicht "100 plus Kristall": als der
  // Kristall von 20 auf 60 Punkte stieg, wurden alle absoluten Grenzen in
  // dieser Datei still falsch - zwei Pruefungen schlugen an, obwohl sich an
  // der Balance nichts verschlechtert hatte. Eine Kennzahl, deren Bedeutung
  // von einer anderen Einstellung abhaengt, ist keine Kennzahl.
  const waves = Math.max(1, MAPS[0].waves.length);
  if (!r.won) return (Math.min(r.wave, waves) / waves) * 50;
  return 50 + (r.lives / Math.max(1, r.maxLives)) * 50;
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
/** Die drei Spielstile.
 *
 *  Bis v33 unterschieden sie sich in der *Anzahl* der Tuerme - und genau das
 *  war das Problem hinter T16 und T17: "viele Tuerme" war kein Stil, sondern
 *  Ueberdeckung. Seit es je Karte zwoelf feste Bauplaetze gibt, ist die Anzahl
 *  keine Entscheidung mehr. Die Stile unterscheiden sich jetzt darin, *wann*
 *  sie ausbauen und wieviel sie in der Hand behalten:
 *
 *  - Stellungen zuerst, Ausbau spaeter (Breite)
 *  - Wechselnd, immer der staerkste Turm zuerst (Meister)
 *  - Wenige Stellungen, frueh tief, grosse Ruecklage (Sparsam)
 *
 *  Alle drei koennen alle zwoelf Plaetze belegen - keiner ist durch die
 *  Obergrenze benachteiligt. */
const BOTS: Bot[] = [
  {
    name: 'Meister', maxTowers: 12, maxLevel: 3, reserve: 40, decideEvery: 30, deepenAt: 0.65,
  },
  {
    // Erst alle Stellungen besetzen, dann ausbauen.
    name: 'Breite', maxTowers: 12, maxLevel: 3, reserve: 15, decideEvery: 20, deepenAt: 1,
  },
  {
    // Nur die Haelfte der Plaetze, dafuer frueh tief und mit Ruecklage.
    name: 'Sparsam', maxTowers: 12, maxLevel: 3, reserve: 140, decideEvery: 30, deepenAt: 0.5,
  },
];


const MEISTER = BOTS[0];

/** Bauplaetze nach abgedeckter Wegstrecke bewertet.
 *
 *  Naehe allein taugt nicht - ein Platz in der Innenkurve deckt drei
 *  Wegabschnitte, einer am Rand nur einen. Gemessen wird deshalb, wieviel
 *  Wegstrecke in Reichweite liegt.
 *
 *  Die Reichweite ist bewusst ein fester Wert und nicht die groesste im
 *  Sortiment: die Bewertung ist Teil des Bot-Modells. Haengt sie an den
 *  Turmwerten, aendert jede Turmaenderung zugleich das Verhalten des Bots -
 *  und dann misst die Simulation zwei Dinge auf einmal. */
function buildSpots(s: GameState): { x: number; y: number }[] {
  return candidateSpots(s);
}

interface Result {
  lives: number; wave: number; won: boolean;
  towers: number; upgrades: number; peakEnemies: number; peakFx: number;
  maxLives: number;
  earned: number; spent: number;
  leakByWave: number[];
}

type BranchPick = (id: TowerId) => 0 | 1;

/** Dem zuletzt gebauten Turm seine Ziellogik geben.
 *
 *  Am zuletzt gebauten und nicht am ganzen Feld: der Bot baut waehrend der
 *  Partie nach, und ein Durchlauf ueber alle Tuerme nach jedem Bau waere
 *  nicht nur teurer, er wuerde auch eine spaetere Handaenderung ueberschreiben.
 */
function stelleZiel(s: GameState, f?: (t: Tower, i: number, s: GameState) => Zielwahl): void {
  if (!f) return;
  const i = s.towers.length - 1;
  if (i >= 0) s.towers[i].zielwahl = f(s.towers[i], i, s);
}

function play(
  strategy: TowerId[], pick: BranchPick = () => 0,
  bot: Bot = MEISTER, difficulty: DifficultyId = 'normal',
  mapId: string = MAPS[0].id,
  opts: {
    endless?: boolean; perks?: typeof NO_PERKS; seed?: number;
    /** Kleine Abwandlung des Bauverhaltens - siehe VARIANTS. */
    variant?: number;
    /** Ziellogik je Turm, nach Baureihenfolge. Ohne Angabe bleibt es beim
     *  Standard des Spiels. */
    ziel?: (t: Tower, i: number, s: GameState) => Zielwahl;
  } = {},
): Result {
  const s = new GameState(mapId);
  s.reset(opts.seed ?? SEEDS[0], difficulty, mapId,
    { endless: opts.endless, perks: opts.perks ?? NO_PERKS });
  const spots = buildSpots(s);
  // Die Abwandlung verschiebt Startreihenfolge und Ruecklage leicht. Damit
  // entstehen mehrere Spielverlaeufe, die alle vernuenftig sind - und der
  // Mittelwert misst die Balance statt einer einzelnen Bahn durch das Chaos.
  const variant = opts.variant ?? 0;
  const reserve = bot.reserve + variant * 15;
  let spotIdx = variant % 2, si = variant, t = 0, frame = 0, upgrades = 0;
  let peakEnemies = 0, peakFx = 0;
  const leakByWave = new Array(s.waves.length).fill(0);
  let lastLives = s.lives;

  while (s.phase === 'playing' && t < 60 * 45) {
    if (frame % bot.decideEvery === 0) {
      let id = strategy[si % strategy.length];
      if (s.gold < TOWERS[id].base.cost) {
        const affordable = strategy.filter((c) => s.gold >= TOWERS[c].base.cost + reserve);
        if (affordable.length) id = affordable[0];
      }

      // Gezaehlt werden die GEBAUTEN Tuerme, nicht die Zielunit.
      //
      // Seit v165 steht sie als fuenfter Turm von Anfang an im Feld. Ohne
      // diese Unterscheidung baute der Bot einen Turm weniger und schuettete
      // sein Gold in die teuerste Ausbaulinie des Spiels: die Zielunit steht
      // dort, wo alle Bahnen enden, sammelt deshalb schnell den meisten
      // Schaden - und "bau den aus, der am meisten leistet" fuehrte
      // geradewegs dorthin. Gemessen kostete das Normal/Meister 23 -> 11 von
      // 60, und das war kein Balancebefund, sondern ein Botfehler.
      const gebaut = s.gebaute;
      const wantBuild = gebaut.length < bot.maxTowers * bot.deepenAt &&
        spotIdx < spots.length && s.gold >= TOWERS[id].base.cost + reserve;

      if (wantBuild) {
        const sp = spots[spotIdx];
        if (s.build(sp.x, sp.y, id)) { stelleZiel(s, opts.ziel); si++; }
        spotIdx++;
      } else {
        // In die Tiefe: immer in den Turm, der bisher am meisten geleistet hat.
        let best: (typeof s.towers)[number] | null = null;
        for (const tw of gebaut) {
          if (tw.level >= Math.min(bot.maxLevel, MAX_LEVEL)) continue;
          const n = nextFor(TOWERS[tw.def], tw.branch ?? pick(tw.def), tw.level);
          if (!n || s.gold < n.cost + reserve) continue;
          if (!best || tw.damageDone > best.damageDone) best = tw;
        }
        if (best && s.upgrade(best, (best.branch ?? pick(best.def)) as 0 | 1)) upgrades++;
        else if (gebaut.length < bot.maxTowers && spotIdx < spots.length &&
          s.gold >= TOWERS[id].base.cost + reserve) {
          const sp = spots[spotIdx];
          if (s.build(sp.x, sp.y, id)) { stelleZiel(s, opts.ziel); si++; }
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
    towers: s.gebaute.length, upgrades, peakEnemies, peakFx, leakByWave, maxLives: s.maxLives,
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

  // Bollwerk: auf die dichteste Traube, aber nur wenn sie schon WEIT ist.
  //
  // Es macht keinen Schaden, es kauft Zeit - und Zeit ist nur dort etwas
  // wert, wo sonst gleich etwas durchkommt. Frueh gezogen verpufft es.
  if (s.ready('bollwerk')) {
    const r2 = (ABILITIES.bollwerk.radius ?? 150) ** 2;
    const spaet = s.enemies.filter((e) => e.travelled > s.pathTotal * 0.6);
    let best = null, bestN = 0;
    for (const a of spaet) {
      let n = 0;
      for (const b of spaet) {
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r2) n++;
      }
      if (n > bestN) { bestN = n; best = a; }
    }
    if (best && bestN >= 3) s.cast('bollwerk', best.x, best.y);
  }

  // Ernte: wenn das Gold fuer den naechsten Schritt nicht reicht.
  //
  // Nicht "sobald bereit". Ein Spieler zieht sie, wenn ihm etwas fehlt -
  // und ein Bot, der sie sofort zieht, misst eine Faehigkeit, die niemand so
  // benutzt. Die Schwelle ist der teuerste Turm: darunter ist man
  // handlungsunfaehig.
  if (s.ready('ernte')) {
    const teuerster = Math.max(...TOWER_ORDER.map((id) => TOWERS[id].base.cost));
    if (s.gold < teuerster) s.cast('ernte', 0, 0);
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

// Verteilung der Verluste.
//
// Das eigentliche Ziel von T15: der Kristall darf nicht an einer einzigen
// Welle haengen. Solange alle Verluste in der letzten Welle liegen, ist jeder
// Lauf entweder makellos oder gescheitert - und jede Aenderung am Sortiment
// kippt genau diese eine Entscheidung, statt sie zu verschieben.
{
  const r = play(mixedPlanBase);
  const hot = r.leakByWave
    .map((v, i) => ({ w: i + 1, v }))
    .filter((o) => o.v > 0);
  const last = MAPS[0].waves.length;
  const share = hot.length ? (r.leakByWave[last - 1] ?? 0) / hot.reduce((a, o) => a + o.v, 0) : 0;
  console.log(
    `\nVerteilung der Verluste: ${hot.length ? hot.map((o) => `W${o.w}:${o.v}`).join('  ') : 'keine'}` +
    `   davon in der letzten Welle ${Math.round(share * 100)} %`,
  );
  // Bewusst ein Hinweis und kein Abbruch: das ist der bekannte offene Punkt
  // T15, kein Rueckschritt. Er steht in jedem Lauf sichtbar da, bis er
  // erledigt ist.
  if (r.won && (hot.length < 3 || share > 0.6)) {
    console.log(
      `  OFFEN (T15): Verluste liegen an ${hot.length} Stelle(n), ` +
      `${Math.round(share * 100)} % davon in der letzten Welle.`,
    );
  }
}

// Abstand zwischen den Spielstilen.
//
// Der Kern von T15 liegt tiefer als die Kurvenform: die drei Stile sind zu
// unterschiedlich stark. Zieht man die Kurve so an, dass die Verluste sich
// verteilen, verlieren die schwaecheren Stile sofort ganz. Solange der Abstand
// so gross ist, gibt es kein Fenster, in dem beides zugleich gilt.
{
  const runs = BOTS.map((b) => {
    const o = overVariants((variant) => play(
      mixedPlanBase, () => 0, b, 'normal', MAPS[0].id, { variant },
    ));
    const avg = (f: (r: Result) => number) => o.runs.reduce((a, r) => a + f(r), 0) / o.runs.length;
    return {
      name: b.name, mean: o.mean,
      towers: avg((r) => r.towers), ups: avg((r) => r.upgrades),
      earned: avg((r) => r.earned), left: avg((r) => r.earned - r.spent),
    };
  });
  for (const r of runs) {
    console.log(
      `  ${r.name.padEnd(9)} ${r.mean.toFixed(0).padStart(4)} Punkte   ` +
      `${r.towers.toFixed(0).padStart(2)} Tuerme, ${r.ups.toFixed(0).padStart(2)} Ausbauten, ` +
      `${r.earned.toFixed(0).padStart(5)} Gold verdient, ${r.left.toFixed(0)} uebrig`,
    );
  }
  const best = Math.max(...runs.map((r) => r.mean));
  const worst = Math.min(...runs.map((r) => r.mean));
  console.log(
    `\nAbstand der Spielstile: ` + runs.map((r) => `${r.name} ${r.mean.toFixed(0)}`).join('   ') +
    `   Spanne ${(best - worst).toFixed(0)}`,
  );
  if (best - worst > 18) {
    console.log(
      '  OFFEN (T16): die Stile liegen zu weit auseinander - deshalb laesst sich ' +
      'die Kurve nicht anziehen, ohne die schwaecheren ganz zu verlieren.',
    );
  }
}

// Robustheitsprobe.
//
// Dasselbe Feld mit 10 % mehr und 10 % weniger Schaden - und jeweils ueber
// drei Abwandlungen des Bauverhaltens gemittelt.
//
// Warum gemittelt: an einem einzelnen Verlauf fuehrte *mehr* Schaden zu einem
// schlechteren Ergebnis. Das ist kein Widerspruch, sondern Pfadabhaengigkeit -
// frueher ankommendes Gold aendert die Baureihenfolge und damit alles
// Weitere. Eine Zahl, die so springt, taugt nicht zum Justieren.
{
  const shifted = (mul: number) => overVariants((variant) => play(
    mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id,
    { perks: { ...NO_PERKS, damageMul: mul }, variant },
  ));
  const low = shifted(0.9), mid = shifted(1), high = shifted(1.1);
  const span = Math.max(low.mean, mid.mean, high.mean) - Math.min(low.mean, mid.mean, high.mean);
  const spread = (r: { runs: Result[] }) => {
    const sc = r.runs.map(score);
    return Math.max(...sc) - Math.min(...sc);
  };
  console.log(
    `\nRobustheit (Schaden -10 / normal / +10 %, je 3 Abwandlungen gemittelt): ` +
    `${low.mean.toFixed(1)}  ${mid.mean.toFixed(1)}  ${high.mean.toFixed(1)}   Spanne ${span.toFixed(1)}`,
  );
  console.log(
    `  Streuung zwischen den Abwandlungen bei gleichem Schaden: ` +
    `${spread(low).toFixed(0)} / ${spread(mid).toFixed(0)} / ${spread(high).toFixed(0)}`,
  );
  if (span > 22) {
    errors.push(
      `Zehn Prozent Schaden bewegen das Ergebnis um ${span.toFixed(0)} Punkte - ` +
      'die Balance haengt an zu wenigen Stellen.',
    );
  }
  if (spread(mid) > 32) {
    errors.push(
      `Drei vernuenftige Bauverlaeufe liegen ${spread(mid).toFixed(0)} Punkte auseinander - ` +
      'dann misst jede einzelne Messung vor allem den Zufall der Reihenfolge.',
    );
  }
}

// Dauerhafte Verbesserungen duerfen helfen, aber nicht den Grad ersetzen.
{
  // Ueber die Abwandlungen gemittelt: ein einzelner Lauf haengt an der
  // Baureihenfolge, und die aendert sich mit dem Startgold.
  const plainMean = overVariants((variant) =>
    play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { variant })).mean;
  const buffedMean = overVariants((variant) =>
    play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { perks: ALL_PERKS, variant })).mean;
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
  // Verglichen wird die normierte Punktzahl, nicht der absolute Kristall.
  //
  // Die Verbesserung "Harter Kern" erhoeht den Kristall selbst - danach sind
  // 41 von 69 mehr wert als 50 von 60, obwohl die Zahl kleiner aussieht.
  // Dieselbe Falle wie bei allen absoluten Grenzen in dieser Datei.
  if (buffedMean < plainMean - 4) {
    errors.push(
      `Die dauerhaften Verbesserungen machen den Lauf schlechter statt besser ` +
      `(${buffedMean.toFixed(0)} statt ${plainMean.toFixed(0)} Punkte im Mittel).`,
    );
  }
  if (hardBuffed.won && hardBuffed.lives >= hardBuffed.maxLives) {
    errors.push('Mit allen Verbesserungen ist Erbarmungslos verlustfrei - der Fortschritt ersetzt den Grad.');
  }
  // Sterne muessen ueberhaupt vergeben werden koennen und drei muessen schwer sein.
  if (starsFor(true, plain.maxLives, plain.maxLives) !== 3) errors.push('Ein makelloser Lauf gibt keine drei Sterne.');
  if (starsFor(false, 0, 20) !== 0) errors.push('Eine Niederlage gibt Sterne.');
  // Die frueher hier stehende Pruefung "der uebliche Sieg darf keine drei
  // Sterne geben" ist entfallen: sie sah nur einen einzigen Lauf auf einer
  // einzigen Karte und widersprach der spaeteren Pruefung, die verlangt, dass
  // drei Sterne irgendwo erreichbar sind. Zwei Regeln fuer dieselbe Sache,
  // aus verschiedenen Blickwinkeln - das geht nicht gut. Geblieben ist die
  // Karten-Pruefung: erreichbar, aber nicht ueberall.
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
// Ziellogik: fuenf Modi, und der fuenfte muss etwas KOENNEN (TF-032).
//
// Ein Modus, der nirgends besser ist als der Standard, ist eine Wahl ohne
// Folgen - genau das, was der Waechter bei toten Ausbauzweigen verhindert.
// Der Rauchtest prueft, dass "hinten" ANDERE Gegner anvisiert; hier wird
// geprueft, dass es dabei etwas nuetzt.
//
// Und zwar NICHT als reine Einstellung. Alle Tuerme auf "hinten" laesst die
// Vordersten durch und ist ueberall schlechter (gemessen 73 gegen 84). Der
// Sinn ist die Arbeitsteilung nach STANDORT: wer weit vom Kristall steht,
// sieht jeden Gegner zuerst - er soll den Zulauf halten und hat die laengste
// Zeit am selben Ziel. Wer nah am Kristall steht, muss den Vordersten nehmen,
// sonst ist er zu spaet.
//
// Gemessen: 88 mit dieser Aufteilung, 84 mit dem besten reinen Modus - und
// 68, wenn man sie umdreht. Die zwanzig Punkte zwischen "fern" und "nah"
// sind der Beleg, dass hier eine Entscheidung liegt und kein Rauschen.
{
  console.log('\nZiellogik (gemischtes Feld, alle Tuerme umgestellt):');
  const messe = (f?: (t: Tower, i: number, s: GameState) => Zielwahl): number =>
    overVariants((variant) => play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id,
      { variant, ziel: f })).mean;
  const rein: Record<string, number> = {};
  for (const z of ZIELWAHL_ORDNUNG) rein[z] = messe(() => z);
  // Der Abstand, ab dem ein Turm als "weit vom Kristall" gilt. Anteilig an
  // der laengsten Bahn, nicht absolut (Regel 2): eine feste Zahl waere bei
  // der naechsten Karte still bedeutungslos.
  // 0,35 der Bahnlaenge - anteilig und nicht absolut (Regel 2). Der Wert ist
  // nicht getroffen, sondern aus dem Verlauf gewaehlt: durchprobiert wurden
  // 0,25 / 0,30 / 0,35 / 0,42 / 0,50 / 0,60 / 0,70 und gemessen 86,9 / 88,3 /
  // 88,3 / 85,0 / 88,3 / 82,5 / 81,9. Von 0,25 bis 0,50 liegt ein Plateau
  // ueber dem besten reinen Modus; der Einbruch bei 0,42 ist ein einzelner
  // Bauplatz, der dort die Seite wechselt. 0,35 liegt in der Mitte des
  // Plateaus und nicht auf seiner Kante.
  const weit = lanePaths(MAPS[0])[0].length * 0.35;
  const fernHinten = messe((t, _i, st) =>
    (Math.hypot(st.goal.x - t.x, st.goal.y - t.y) > weit ? 'hinten' : 'vorn'));
  const nahHinten = messe((t, _i, st) =>
    (Math.hypot(st.goal.x - t.x, st.goal.y - t.y) <= weit ? 'hinten' : 'vorn'));
  const bestesReines = Math.max(...ZIELWAHL_ORDNUNG.map((z) => rein[z]));
  console.log('  rein: ' + ZIELWAHL_ORDNUNG.map((z) => `${z} ${rein[z].toFixed(0)}`).join('  '));
  console.log(`  nach Standort (Grenze ${weit.toFixed(0)} Weltpunkte zum Kristall): `
    + `fern=hinten ${fernHinten.toFixed(0)}   nah=hinten ${nahHinten.toFixed(0)}`);
  if (fernHinten <= bestesReines) {
    errors.push(`Ziellogik "hinten" ist wirkungslos: nach Standort aufgeteilt `
      + `${fernHinten.toFixed(1)} Punkte, bester reiner Modus ${bestesReines.toFixed(1)}. `
      + 'Der fuenfte Modus muss eine Aufstellung ermoeglichen, die es ohne ihn nicht gibt.');
  }
  // Fuenf Punkte Abstand, nicht null: die Kennzahl streut ueber die
  // Abwandlungen um rund drei. Eine Grenze innerhalb der Streuung waere ein
  // Muenzwurf, kein Beweis - und ein Tor, das jede zweite Runde grundlos rot
  // wird, wird abgeschaltet.
  if (fernHinten <= nahHinten + 5) {
    errors.push('Ziellogik "hinten": die Aufteilung nach Standort ist beliebig - '
      + `fern ${fernHinten.toFixed(1)} gegen nah ${nahHinten.toFixed(1)}. `
      + 'Dann traegt nicht der Modus, sondern der Zufall.');
  }
}

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

// 3b. **Hier stand ein vierter Anlauf, und er ist weg** (C28, v175).
//
// Gesucht war eine Zahl, die sagt, was der Nachteil des Moersers ("erreicht
// keine Flieger") auf JEDER Karte kostet - Pruefung 3 darueber laeuft nur
// auf `MAPS[0]`, also ausgerechnet dort, wo die Luft am dicksten ist.
//
// Drei Entwuerfe, alle verworfen, und alle aus demselben Grund: sie messen
// das Umfeld statt der Sache (Regel 13).
//
//  1. **Bodenlastig gegen gemischt, je Karte.** Der Abstand blieb positiv,
//     selbst als die Frostspalte auf 1,2 Prozent Luft heruntergesetzt wurde
//     (Abstand 12). Ein gemischtes Feld ist aus zehn Gruenden besser, und
//     die Luft ist nur einer davon - die Zahl haette nie anschlagen koennen.
//  2. **Derselbe Lauf mit und ohne `hitsAir` am Moerser.** Klingt sauber, ist
//     es nicht: mit Luftfaehigkeit zielt der Moerser auch auf Flieger, seine
//     Flaechenwirkung verpufft dort, und der Lauf wird SCHLECHTER (Preis -46
//     auf der Frostspalte, 0 auf den anderen beiden). Der Eingriff aendert
//     das Zielverhalten mit, nicht nur die Reichweite.
//  3. **Verlorene Leben je Luftwelle.** Verworfen ohne Lauf: der Bot baut
//     nach fester Reihenfolge, und welche Welle ihn umwirft, haengt mehr an
//     seiner Kasse als an der Gegnerart.
//
// **Die Sache selbst ist messbar, nur nicht hier**: es ist der Anteil der
// Lebenspunkte, den der Moerser nicht erreichen kann. Der steht in
// `npm run guards` und ist dort eine Sperre - Faktor hoechstens 2 zwischen
// der dichtesten und der duennsten Karte. Eine zweite, schwaechere Fassung
// derselben Frage waere schlimmer als keine: sie stuende gruen daneben und
// saehe aus wie ein zweiter Beweis.

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
  // Der Abstand wird am Anteil des Kristalls gemessen, nicht in Punkten -
  // sonst haengt die Grenze am Schwierigkeitsgrad.
  const share = Math.abs(a.lives - b.lives) / Math.max(1, a.maxLives);
  if (a.won && b.won && share > 0.22) {
    errors.push(
      `${def.name}: die Zweige liegen ${Math.round(share * 100)} % des Kristalls auseinander - ` +
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
  // Verglichen wird die Punktzahl, nicht die Zahl der Sieger.
  //
  // Vorher stand hier ein Vergleich der Sieger-Anzahl. Seit alle drei Stile
  // auf allen Graden durchkommen, ist die auf beiden Seiten drei - die
  // Pruefung schlug an, obwohl die Grade sich klar unterscheiden. Dieselbe
  // Falle wie bei den absoluten Kristallgrenzen: eine Kennzahl, die im neuen
  // Zustand nicht mehr trennt.
  const meanOf = (id: DifficultyId) =>
    BOTS.reduce((a, b) => a + score(diffRuns.get(`${id}:${b.name}`)!), 0) / BOTS.length;
  const easy = meanOf('ruhig'), hardMean = meanOf('erbarmungslos');
  console.log(`  Ruhig ${easy.toFixed(0)} Punkte gegen Erbarmungslos ${hardMean.toFixed(0)}`);
  if (easy - hardMean < 12) {
    errors.push(
      `Ruhig liegt nur ${(easy - hardMean).toFixed(0)} Punkte vor Erbarmungslos - ` +
      'die Grade unterscheiden sich zu wenig.',
    );
  }
}

// Sterne muessen erreichbar sein - und nicht ueberall gleich.
//
// Nach dem Umbau des Kristalls waren drei Sterne auf zwei von drei Karten
// unmoeglich: der beste Stil kam auf 18 von 60 Punkten, gefordert waren 54.
// Ein Ziel, das niemand erreicht, ist kein Ziel.
{
  const best = new Map<string, number>();
  for (const m of MAPS) {
    let top = 0;
    for (const bot of BOTS) {
      const r = mapRuns.get(`${m.id}:${bot.name}`)!;
      top = Math.max(top, starsFor(r.won, r.lives, r.maxLives));
    }
    best.set(m.id, top);
    console.log(`  ${m.name.padEnd(15)} bester Lauf: ${top} Stern(e)`);
  }
  for (const m of MAPS) {
    if ((best.get(m.id) ?? 0) < 2) {
      errors.push(`Karte "${m.name}": auch der beste Spielstil holt nur ${best.get(m.id)} Stern(e) - unerreichbar.`);
    }
  }
  if (![...best.values()].some((v) => v >= 3)) {
    errors.push('Auf keiner Karte sind drei Sterne erreichbar - die Schwelle ist zu hoch.');
  }
  if ([...best.values()].every((v) => v >= 3)) {
    errors.push('Auf jeder Karte holt schon der Bot drei Sterne - dann ist der dritte wertlos.');
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
