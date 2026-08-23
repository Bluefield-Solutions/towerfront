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
import { ENEMIES } from '../src/data/enemies';
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
// laeuft, ist kein Beweis (Regel 5). Statt ihn wegzulassen und den naechsten
// bodengebundenen Schuetzen hineinlaufen zu lassen, wird er hier
// durchgespielt: dem Bogenturm wird die Luftfaehigkeit genommen, dann darf
// kein Flieger mehr Schaden nehmen. Ohne den Filter nimmt er welchen, sobald
// ein Bodenziel im Flug stirbt und ein Gleiter im Kegel steht.
{
  const merk = TOWERS.arrow.hitsAir;
  TOWERS.arrow.hitsAir = false;
  let getroffen = 0;
  const flieger = new Set<object>();
  try {
    const s = aufbauen(SAATEN[0]);
    // Welle 13 traegt Gleiter neben Bodenvolk. Welle 8 hatte ich zuerst
    // genommen und dort NULL Flieger gefunden - die Messung war leer und
    // die Null kein Beweis (Regel 3). Deshalb zaehlt der Block die Flieger
    // jetzt selbst und schlaegt an, wenn keiner da ist.
    s.waveIndex = 12;
    s.startWave();
    const voll = new Map<object, number>();
    for (let i = 0; i < 60 * 90; i++) {
      s.update(DT);
      for (const e of s.enemies) {
        if (!ENEMIES[e.def].flying) continue;
        flieger.add(e);
        const alt = voll.get(e);
        if (alt === undefined) { voll.set(e, e.hp); continue; }
        if (e.hp < alt) { getroffen++; voll.set(e, e.hp); }
      }
      if (!s.enemies.length && !s.waveActive) break;
    }
  } finally {
    TOWERS.arrow.hitsAir = merk;
  }
  console.log(`Luftfilter: ein Schuetze ohne Luftziel trifft ${getroffen}x einen Flieger ` +
    `(Soll 0, ${flieger.size} Flieger auf dem Feld).`);
  if (TOR && getroffen > 0) {
    console.error(`FEHLER: der Luftfilter im Ersatzziel greift nicht.`);
    process.exit(1);
  }
  // Ohne Flieger misst der Block nichts - dann ist die Null kein Beweis.
  if (TOR && flieger.size === 0) {
    console.error(`FEHLER: in dieser Welle fliegt niemand, die Messung ist leer.`);
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
