/** **Die C18-Frage allein**, in zwei Sekunden statt zwei Minuten.
 *
 *  C18 heisst: die erste Karte muss mit einer Faehigkeit und ohne
 *  Verbesserungen zu gewinnen sein. Der Rauchtest misst das mit - aber er
 *  braucht dafuer den ganzen Lauf, und beim Eichen einer Zahl gegen C18 will
 *  man die Antwort zwanzigmal sehen.
 *
 *  **Kein Tor.** Es meldet, es urteilt nicht; das Urteil faellt im Rauchtest,
 *  und ein zweites daneben waere eine zweite Wahrheit ueber dieselbe Frage
 *  (Regel 15). Es fuehrt denselben Bot und denselben Aufbau - waere es ein
 *  eigener, sagte es etwas ueber einen anderen Spieler.
 *
 *  Entstanden in v244: der Aurendeckel bricht C18, und die Frage war, welche
 *  Zahl ihn wieder traegt. Ohne dieses Werkzeug haette jeder der zwoelf
 *  Messwerte zwei Minuten gekostet.
 *
 *  Aufruf:  npm run c18            die uebliche Aussaat
 *           npm run c18 -- 7 99    mehrere, nebeneinander */
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
  // **Die Bots ueberlappen nicht** (S-P4-01, v266).
  //
  // Seit v266 darf eine zweite Welle starten, waehrend die erste laeuft -
  // `canStartWave` allein heisst also nicht mehr "nichts laeuft". Ein Bot, der
  // bei jeder Gelegenheit startet, faehrt damit dauerhaft zwei Wellen, und das
  // ist die AGGRESSIVSTE Spielweise, nicht die vernuenftige: gemessen verliert
  // die erste Karte damit in Welle 13, und C18 waere rot.
  //
  // Die Ueberlappung ist eine Entscheidung des Spielers. Die Balance ist gegen
  // einen Bot geeicht, der sie nicht trifft; wer sie messen will, misst sie
  // eigens (S-P4-02).
  if (g.canStartWave && !g.waveActive) g.startWave();
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
