/* Reagiert die Karte auf ALLEN Karten - oder nur auf der ersten?
 *
 * Der Rauchtest prueft `MAPS[0]`. In v175 hat genau das eine Luecke
 * verdeckt: die Pruefung lief auf der Karte, wo die Sache ohnehin am
 * staerksten ist.
 */
import { geruestStellen, bilderAbwarten } from './tools/leinwand.mjs';
geruestStellen();
const { GameState } = await import('./src/game/state.ts');
const { MAPS } = await import('./src/data/maps.ts');

console.log('Karte            Flecken  hart  kalt  locker   reagieren   Teilchen (Mittel)');
for (const m of MAPS) {
  const s = new GameState();
  s.reset(1234, 'normal', m.id);
  const arten = { hart: 0, kalt: 0, locker: 0 };
  for (const gr of s.map.rough) arten[gr.art] = (arten[gr.art] ?? 0) + 1;
  let reagieren = 0, teilchen = 0;
  for (const gr of s.map.rough) {
    s.particles.length = 0;
    if (s.beruehren(gr.x, gr.y)) { reagieren++; teilchen += s.particles.length; }
  }
  console.log(`${m.id.padEnd(16)}${String(s.map.rough.length).padStart(6)}`
    + `${String(arten.hart).padStart(6)}${String(arten.kalt).padStart(6)}${String(arten.locker).padStart(8)}`
    + `${String(reagieren).padStart(12)}${(teilchen / Math.max(1, reagieren)).toFixed(1).padStart(12)}`);
}

// Wie gross ist die Flaeche, die ueberhaupt reagiert - gemessen am Feld?
console.log('');
const { WORLD_W, WORLD_H } = await import('./src/data/config.ts');
for (const m of MAPS) {
  const s = new GameState();
  s.reset(1234, 'normal', m.id);
  let treffer = 0, versuche = 0;
  for (let y = 40; y < WORLD_H; y += 40) {
    for (let x = 40; x < WORLD_W; x += 40) {
      versuche++;
      s.particles.length = 0;
      if (s.beruehren(x, y)) treffer++;
    }
  }
  console.log(`${m.id.padEnd(16)} ${(treffer / versuche * 100).toFixed(1)} % des Feldes reagieren auf einen Tipp`);
}
