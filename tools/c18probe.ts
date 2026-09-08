/** Nur die C18-Frage, in zwei Sekunden statt zwei Minuten.
 *
 *  Der Rauchtest misst sie mit, aber er braucht dafuer den ganzen Lauf. Beim
 *  Eichen einer Zahl gegen C18 will man sie zwanzigmal sehen. */
import { GameState } from '../src/game/state';
import { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor } from '../src/data/towers';
import { MAPS } from '../src/data/maps';
import { candidateSpots } from './spots';

type Z = { spot: number; si: number };
function botSchritt(g: GameState, plaetze: { x: number; y: number }[], z: Z): void {
  const id = TOWER_ORDER[z.si % TOWER_ORDER.length];
  if (z.spot < plaetze.length && g.gold >= TOWERS[id].base.cost) {
    const sp = plaetze[z.spot++];
    if (g.build(sp.x, sp.y, id)) z.si++;
  }
  const up = g.towers.find((t) => {
    if (t.level >= MAX_LEVEL) return false;
    const n = nextFor(TOWERS[t.def], t.branch ?? ((t.id % 2) as 0 | 1), t.level);
    return !!n && g.gold >= n.cost + 80;
  });
  if (up) g.upgrade(up, (up.branch ?? ((up.id % 2) as 0 | 1)) as 0 | 1);
  if (g.canStartWave) g.startWave();
}

const saaten = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const liste = saaten.length ? saaten : [4242];
for (const saat of liste) {
  const h = new GameState();
  h.reset(saat, 'normal', MAPS[0].id, { karten: 0 });
  const plaetze = candidateSpots(h);
  const z: Z = { spot: 0, si: 0 };
  let f = 0;
  while (h.phase === 'playing' && f < 60 * 60 * 20) {
    botSchritt(h, plaetze, z);
    h.update(1 / 60);
    f++;
  }
  console.log(`  Saat ${String(saat).padEnd(6)} ${h.phase === 'won' ? 'gewonnen' : `verloren in Welle ${h.waveNumber}`}`
    + `  Kristall ${h.lives}/${h.maxLives}`);
}
