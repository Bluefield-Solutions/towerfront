/** Determinismus-Pruefung.
 *
 *  Zwei Zusagen werden hier eingeloest:
 *
 *  1. Gleiche Aussaat, gleicher Verlauf. Ohne das laesst sich ein gemeldeter
 *     Fehler nicht nachstellen - man kann ihn nur beschreiben.
 *  2. Ein gesicherter Spielstand laeuft genauso weiter wie eine Partie, die nie
 *     unterbrochen wurde. Das ist der eigentliche Test fuer die Sicherung:
 *     nicht "laedt ohne Absturz", sondern "aendert nichts".
 *
 *  Aufruf: npx tsx tools/determinism.ts */
import { GameState } from '../src/game/state';
import { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor, type TowerId } from '../src/data/towers';
import { candidateSpots } from './spots';
import { NO_PERKS } from '../src/data/perks';
import { MAPS } from '../src/data/maps';

// Der Browser-Speicher fehlt hier - eine Attrappe genuegt, die Sicherung
// schreibt beim Zuruecksetzen hinein.
const mem = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
};

const DT = 1 / 60;
const SEED = 0x5EED_1234;

/** Ein festes Drehbuch: gleiche Zuege zu gleichen Zeitpunkten. */
function scriptedStep(s: GameState, frame: number, spots: { x: number; y: number }[]): void {
  if (frame % 20 === 0) {
    const idx = (frame / 20) % spots.length;
    const id: TowerId = TOWER_ORDER[(frame / 20) % TOWER_ORDER.length];
    const sp = spots[idx];
    if (s.gold >= TOWERS[id].base.cost) s.build(sp.x, sp.y, id);
  }
  if (frame % 137 === 0) {
    // Zweige abwechselnd waehlen, damit beide im Fingerabdruck landen.
    // Die Regel muss an der Feldposition haengen, nicht an der laufenden
    // Nummer: beim Laden werden die Nummern neu vergeben, die Position nicht.
    // Die Regel haengt am Bauplatz, nicht an der laufenden Nummer: beim Laden
    // werden die Nummern neu vergeben, der Bauplatz nicht.
    // Die Regel haengt an der Stellung, nicht an der laufenden Nummer: beim
    // Laden werden die Nummern neu vergeben, die Stellung nicht.
    const branchOf = (tw: { x: number; y: number }): 0 | 1 =>
      ((Math.round(tw.x / 12) + Math.round(tw.y / 12)) % 2) as 0 | 1;
    const t = s.towers.find((tw) => {
      if (tw.level >= MAX_LEVEL) return false;
      const n = nextFor(TOWERS[tw.def], tw.branch ?? branchOf(tw), tw.level);
      return !!n && s.gold >= n.cost;
    });
    if (t) s.upgrade(t, (t.branch ?? branchOf(t)) as 0 | 1);
  }
  // Faehigkeiten gehoeren mit ins Drehbuch - sie greifen auf den Zufall zu
  // und muessen deshalb beim Fortsetzen genauso wirken.
  if (frame % 401 === 0 && s.ready('meteor') && s.enemies.length) {
    const e = s.enemies[0];
    s.cast('meteor', e.x, e.y);
  }
  if (frame % 733 === 0 && s.ready('freeze')) s.cast('freeze', 0, 0);
  if (s.canStartWave) s.startWave();
}


/** Ein kurzer Fingerabdruck des Spielzustands. */
function fingerprint(s: GameState): string {
  let h = 2166136261;
  const mix = (v: number): void => {
    h ^= Math.round(v * 1000) | 0;
    h = Math.imul(h, 16777619);
  };
  mix(s.gold); mix(s.lives); mix(s.waveIndex); mix(s.rng.state / 1000);
  mix(s.enemies.length); mix(s.towers.length); mix(s.meteors.length);
  mix(s.abilityCd.meteor * 10); mix(s.abilityCd.freeze * 10);
  mix(s.stats.damage); mix(s.stats.goldSpent); mix(s.stats.kills); mix(s.stats.duration);
  for (const e of s.enemies) { mix(e.x); mix(e.y); mix(e.hp); mix(e.travelled); }
  for (const t of s.towers) { mix(t.x); mix(t.y); mix(t.level); mix(t.branch ?? -1); mix(t.kills); }
  return (h >>> 0).toString(16);
}

interface Run { prints: string[]; gold: number; lives: number; wave: number; }

function run(frames: number, pauseAt = -1): Run {
  const s = new GameState();
  // **Ohne Verbesserungen und mit fester Kartenzahl**, wie `npm run sim`.
  //
  // Sonst liest `reset` den gespeicherten Fortschritt - und der wandert
  // zwischen den beiden Laeufen: gewinnt der erste die Karte, schreibt das
  // Spiel einen Stern, der zweite startet mit anderen Verbesserungen und
  // laeuft anders. Genau das ist in v217 passiert, als die neu gezogene Bahn
  // den Lauf erstmals innerhalb der 240 Sekunden gewinnen liess - vorher
  // endete er nie, also fiel es nie auf. Ein Werkzeug, das seinen eigenen
  // Nebeneffekt misst, misst nicht mehr das Spiel (Regel 4).
  s.reset(SEED, 'normal', MAPS[0].id, { perks: NO_PERKS, karten: MAPS.length });
  const spots = candidateSpots(s).slice(0, 40);
  const prints: string[] = [];
  for (let f = 0; f < frames; f++) {
    // An dieser Stelle wird gesichert und sofort wieder geladen. Wenn die
    // Sicherung vollstaendig ist, darf sich danach nichts unterscheiden.
    if (f === pauseAt) {
      // Ueber JSON, damit auch ein Fehler beim Schreiben oder Lesen auffaellt.
      const snap = JSON.parse(JSON.stringify(s.snapshot()));
      if (!s.restore(snap)) throw new Error('Spielstand liess sich nicht laden.');
    }
    scriptedStep(s, f, spots);
    s.update(DT);
    if (f % 60 === 0) prints.push(fingerprint(s));
    if (s.phase !== 'playing') break;
  }
  return { prints, gold: s.gold, lives: s.lives, wave: s.waveNumber };
}

// **Wie lange der Lauf mitfaehrt.**
//
// 240 Sekunden reichten, solange eine Partie darin endete. Seit die
// Spiralhain-Bahn 3942 Weltpunkte lang ist, steht der Lauf nach 240 Sekunden
// erst bei Welle 10 - er endet nie, und damit wird nie ein Stern
// geschrieben. Das klingt harmlos, macht aber die Gegenprobe zur
// Fortschritts-Isolierung blind: sie baut den Fehler ein, und weil kein
// Ergebnis mehr anfaellt, aendert sich nichts. Gemeldet vom vollen
// Probenlauf zu v219.
//
// Gemessen endet die Partie jetzt nach 521 Sekunden (gewonnen, Kristall 55).
// 600 lassen Luft, ohne dass der Lauf traege wird - er ist ungezeichnet und
// kostet damit Sekunden, keine Minuten.
const FRAMES = 60 * 600;
const errors: string[] = [];

const a = run(FRAMES);
const b = run(FRAMES);

if (a.prints.length !== b.prints.length) {
  errors.push(`Gleiche Aussaat, verschieden lange Laeufe: ${a.prints.length} gegen ${b.prints.length}.`);
} else {
  const i = a.prints.findIndex((p, k) => p !== b.prints[k]);
  if (i >= 0) errors.push(`Gleiche Aussaat, Abweichung ab Sekunde ${i}.`);
}
console.log(
  `DETERMINISMUS: gleiche Aussaat -> ${a.prints.length} Pruefpunkte, ` +
  `Gold ${a.gold}, Kristall ${a.lives}, Welle ${a.wave}`,
);

// Sichern und Laden mitten in einer Welle darf den Verlauf nicht veraendern.
const PAUSE = 60 * 95;
const c = run(FRAMES, PAUSE);
if (c.prints.length !== a.prints.length) {
  errors.push(`Nach Sichern/Laden anderer Verlauf: ${c.prints.length} statt ${a.prints.length} Pruefpunkte.`);
} else {
  const i = a.prints.findIndex((p, k) => p !== c.prints[k]);
  if (i >= 0) {
    errors.push(
      `Sichern/Laden bei Sekunde ${PAUSE / 60} veraendert den Verlauf ab Sekunde ${i}.`,
    );
  }
}
console.log(
  `               nach Sichern/Laden -> Gold ${c.gold}, Kristall ${c.lives}, Welle ${c.wave}`,
);

// Eine andere Aussaat darf sich unterscheiden - sonst waere der Zufall wirkungslos.
if (a.prints.length === 0) errors.push('Kein einziger Pruefpunkt entstanden.');

if (errors.length) {
  console.error('DETERMINISMUS: nicht bestanden');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('DETERMINISMUS: bestanden.');
