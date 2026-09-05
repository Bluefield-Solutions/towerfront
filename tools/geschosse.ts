/** Messstand fuer TF-007: wieviel Schaden verschwindet in der Luft?
 *
 *  Ein zielsuchendes Geschoss ist bezahlt, sobald es abgefeuert ist - die
 *  Abklingzeit laeuft. Stirbt sein Ziel im Flug, ist der Schuss heute weg.
 *  Bei sechs Salventuermen auf eine dichte Welle schiessen mehrere Tuerme
 *  auf denselben Gegner, und der Ueberschuss faellt zu Boden.
 *
 *  Gemessen wird an der Spiellogik, ohne Bild und ohne Bot: sechs Tuerme,
 *  eine spaete Welle, alles auf Salve ausgebaut. Die Zahl ist der Anteil
 *  der zielsuchenden Schuesse, die ohne jede Wirkung verschwinden.
 *
 *  Aufruf: npx tsx tools/geschosse.ts [--tor]
 *
 *  Messstelle (Regel 12): Spiellogik in Node, Feld 1920x1080, Karte
 *  Spiralhain, Grad normal, Welle 12, sechs Salventuerme Stufe 3, feste
 *  Aussaat. Keine Grafik beteiligt - die Zahl ist maschinenunabhaengig.  */
import { GameState } from '../src/game/state';
import { TOWERS } from '../src/data/towers';
import { candidateSpots } from './spots';

const DT = 1 / 60;
const TOR = process.argv.includes('--tor');

/** Das Soll aus dem Ticket: unter 5 % der Schuesse duerfen verpuffen. */
const GRENZE = 0.05;
/** Wieviel Grad ein Schuss von seiner Abschussrichtung abweichen darf. Ein
 *  zielsuchendes Geschoss zieht nach, das ist der Sinn - aber es dreht nicht
 *  um. Die Grenze steht bei 90 Grad: darueber liegt das Ziel hinter dem
 *  Schuss. */
const KEHRE = 90;

/** Sechs Salventuerme, so nah am Weg wie das Spiel es zulaesst. */
function aufbauen(seed: number): GameState {
  const s = new GameState();
  s.reset(seed, 'normal', 'spiralhain');
  s.gold = 999999;
  const plaetze = candidateSpots(s);
  let gebaut = 0;
  for (const sp of plaetze) {
    if (gebaut >= 6) break;
    if (!s.build(sp.x, sp.y, 'arrow')) continue;
    const t = s.towers[s.towers.length - 1];
    // Stufe 2 waehlt den Zweig, danach zwei weitere Stufen.
    // Zweig 1 ist die Salve (Schnellfeuer).
    for (let l = 0; l < 3; l++) s.upgrade(t, 1);
    gebaut++;
  }
  if (gebaut < 6) throw new Error(`nur ${gebaut} Tuerme gebaut`);
  return s;
}

/** Eine dichte Welle durchlaufen lassen und die Zaehler ablesen.
 *
 *  Nebenher wird die groesste Richtungsaenderung eines einzelnen Geschosses
 *  gemessen - Abschussrichtung gegen Endrichtung. Sie ist die Probe auf den
 *  Kegel: ein Schuss, der ein Ziel HINTER sich annimmt, macht kehrt, und das
 *  waere ein Zauber und keine Waffe. Ohne diese Zahl wuerde ein weit
 *  geoeffneter Kegel den Verpuffungsanteil verbessern und dabei unbemerkt
 *  die Waffe ersetzen. */
function messen(seed: number): { ab: number; weg: number; grad: number } {
  const s = aufbauen(seed);
  s.stats.schuesse = 0;
  s.stats.schuesseOhneWirkung = 0;
  s.waveIndex = 11;
  s.startWave();
  const start = new Map<object, { x: number; y: number }>();
  let grad = 0;
  for (let i = 0; i < 60 * 90; i++) {
    s.update(DT);
    const jetzt = new Set<object>();
    for (const p of s.projectiles) {
      if (p.kind !== 'homing') continue;
      jetzt.add(p);
      const a = start.get(p);
      if (!a) { start.set(p, { x: p.dirX, y: p.dirY }); continue; }
      const cos = Math.min(1, Math.max(-1, a.x * p.dirX + a.y * p.dirY));
      grad = Math.max(grad, (Math.acos(cos) * 180) / Math.PI);
    }
    // Geschosse aus dem Lager werden wiederverwendet - was nicht mehr
    // fliegt, muss raus, sonst wird der Nachfolger mit fremdem Start
    // verglichen.
    for (const k of start.keys()) if (!jetzt.has(k)) start.delete(k);
    if (!s.enemies.length && !s.waveActive) break;
  }
  return { ab: s.stats.schuesse, weg: s.stats.schuesseOhneWirkung, grad };
}

const SAATEN = [20260807, 4711, 99123];
let ab = 0, weg = 0, grad = 0;
for (const seed of SAATEN) {
  const m = messen(seed);
  ab += m.ab; weg += m.weg; grad = Math.max(grad, m.grad);
  const q = m.ab ? m.weg / m.ab : 0;
  console.log(`  Saat ${seed}: ${m.ab} Schuesse, ${m.weg} ohne Wirkung (${(q * 100).toFixed(1)} %)` +
    `, groesste Richtungsaenderung ${m.grad.toFixed(0)} Grad`);
}
const anteil = ab ? weg / ab : 0;
console.log('');
console.log(`GESCHOSSE: ${ab} zielsuchende Schuesse, ${weg} ohne Wirkung — ${(anteil * 100).toFixed(1)} %`);
console.log(`Messstelle: Spiellogik in Node, Spiralhain, normal, Welle 12, sechs Salventuerme Stufe 3.`);

console.log(`Groesste Richtungsaenderung eines Schusses: ${grad.toFixed(0)} Grad (Grenze ${KEHRE} Grad).`);

// ---------------------------------------------------------------------------
// Der Luftfilter im Ersatzziel.
//
// Zielsuchende Geschosse kommen heute nur vom Bogenturm, und der trifft Luft.
// Der Zweig `if (!p.luft && ...flying) continue` liefe also nie - und was nie
// laeuft, ist kein Beweis (Regel 5). Er wird deshalb GESTELLT: dem Bogenturm
// wird die Luftfaehigkeit genommen, ein Bodengegner und ein Gleiter stehen
// dicht beieinander in Reichweite, und der Bodengegner faellt, waehrend der
// Schuss unterwegs ist. Genau dann sucht das Geschoss ein Ersatzziel - und
// darf den Gleiter nicht nehmen.
//
// **Die erste Fassung liess dafuer eine ganze Welle laufen und zaehlte, ob
// zufaellig ein Flieger Schaden nimmt.** Sie hat jahrelang funktioniert und
// in v219 aufgehoert, ohne rot zu werden: der volle Probenlauf meldete, dass
// die Gegenprobe "Ersatzziel nimmt auch Flieger" nichts mehr beweist. Auf der
// neuen, langen Bahn kommt der Fall in keiner Welle mehr vor - gemessen an
// den Wellen 7, 14 und 15, alle drei mit ausgebautem Fehler und alle drei
// bei null Treffern. Ein Aufbau, der auf einen Zufall wartet, hoert leise
// auf zu pruefen, sobald die Karte sich aendert (Regel 13).
{
  const merk = TOWERS.arrow.hitsAir;
  const merkCore = TOWERS.core.hitsAir;
  TOWERS.arrow.hitsAir = false;
  TOWERS.core.hitsAir = false;
  let fliegerSchaden = 0;
  let gestellt = false;
  try {
    const s = new GameState();
    s.reset(1, 'normal', 'spiralhain');
    s.gold = 999999;
    // Ein Turm, dicht an der Bahn - mehr braucht der Fall nicht.
    const sp = candidateSpots(s)[0];
    if (!s.build(sp.x, sp.y, 'arrow')) throw new Error('Luftfilter: kein Turm setzbar.');
    const turm = s.towers[0];
    // Die Stelle der Bahn, die dem Turm am naechsten liegt - dort stellen
    // wir beide Gegner hin.
    const bahn = s.lanes[0];
    let beste = 0, dm = Infinity;
    for (let t = 0; t <= bahn.length; t += 5) {
      const q = bahn.at(t);
      const d = Math.hypot(q.x - turm.x, q.y - turm.y);
      if (d < dm) { dm = d; beste = t; }
    }
    const boden = s.spawnZumPruefen('brute', 0);
    const flieger = s.spawnZumPruefen('flyer', 0);
    if (!boden || !flieger) throw new Error('Luftfilter: Gegner nicht setzbar.');
    boden.travelled = beste;
    s.update(DT);   // damit der Bodengegner seine Lage aus `travelled` bekommt
    // **Der Gleiter wird ueber x/y gesetzt, nicht ueber `travelled`.**
    //
    // Flieger folgen keiner Bahn: sie ziehen die Luftlinie zum Kristall, und
    // ihr `travelled` wird daraus RUECKGERECHNET. Ein gesetztes `travelled`
    // wird im naechsten Bild ueberschrieben - die erste Fassung dieses
    // Aufbaus tat genau das und stellte den Gleiter nie dorthin, wo er
    // gebraucht wurde.
    //
    // Er muss VOR dem Geschoss stehen, nicht daneben: das Ersatzziel wird in
    // einem Kegel von 40 Grad um die Flugrichtung gesucht.
    const rx = boden.x - turm.x, ry = boden.y - turm.y;
    const rl = Math.hypot(rx, ry) || 1;
    flieger.x = boden.x + (rx / rl) * 60;
    flieger.y = boden.y + (ry / rl) * 60;
    const vollFlieger = flieger.hp;
    for (let i = 0; i < 60 * 12; i++) {
      s.update(DT);
      // Sobald ein Schuss unterwegs ist, faellt sein Ziel: genau der Fall,
      // um den es geht.
      if (!gestellt && s.projectiles.length && boden.hp > 0) {
        boden.hp = 0; gestellt = true;
      }
      if (flieger.hp < vollFlieger) fliegerSchaden++;
      // Der Gleiter soll stehen bleiben, nicht davonfliegen - sonst ist er
      // aus dem Suchraum, bevor der Fall eintritt.
      flieger.x = boden.x + (rx / rl) * 60;
      flieger.y = boden.y + (ry / rl) * 60;
      if (gestellt && !s.projectiles.length) break;
    }
  } finally {
    TOWERS.arrow.hitsAir = merk;
    TOWERS.core.hitsAir = merkCore;
  }
  console.log(`Luftfilter: Schuss verliert sein Ziel${gestellt ? '' : ' (NICHT gestellt!)'}, `
    + `Gleiter nimmt ${fliegerSchaden > 0 ? 'Schaden' : 'keinen Schaden'} (Soll: keinen).`);
  if (!gestellt) {
    console.error('FEHLER: der Fall wurde gar nicht gestellt - kein Schuss war unterwegs, '
      + 'als das Ziel fiel. Dann sagt die Null nichts (Regel 3).');
    if (TOR) process.exit(1);
  }
  if (TOR && fliegerSchaden > 0) {
    console.error('FEHLER: der Luftfilter im Ersatzziel greift nicht - ein Schuetze ohne '
      + 'Luftziel hat einen Gleiter getroffen.');
    process.exit(1);
  }
}


if (TOR) {
  let fehler = 0;
  if (anteil >= GRENZE) {
    console.error(`FEHLER: ${(anteil * 100).toFixed(1)} % verpuffen, erlaubt sind unter ${(GRENZE * 100).toFixed(0)} %.`);
    fehler++;
  }
  if (grad > KEHRE) {
    console.error(`FEHLER: ein Schuss aenderte seine Richtung um ${grad.toFixed(0)} Grad — er macht kehrt.`);
    fehler++;
  }
  if (fehler) process.exit(1);
  console.log(`GESCHOSSE: Tor bestanden.`);
}
