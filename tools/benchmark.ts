/** Genre-Abgleich.
 *
 *  Misst das Spiel gegen einen Katalog, der aus den bestbewerteten Vertretern
 *  des Genres abgeleitet ist - Kingdom Rush, Bloons TD 6, Plants vs. Zombies,
 *  Defense Grid, Defender's Quest. Herkunft und Begruendung jedes Kriteriums
 *  stehen in docs/Towerfront-BENCHMARK.md.
 *
 *  Wo es geht, wird tatsaechlich geprueft statt behauptet: manche Kriterien
 *  lassen sich am Spielzustand messen. Der Rest ist ausdruecklich als
 *  Handpruefung markiert und wird in jedem Lauf neu beurteilt.
 *
 *  Das Werkzeug bricht nichts ab. Es legt das Delta auf den Tisch.
 *  Aufruf: npx tsx tools/benchmark.ts */
import { GameState } from '../src/game/state';
import { TOWERS, TOWER_ORDER, nextFor } from '../src/data/towers';
import { ENEMIES } from '../src/data/enemies';
import type { Wave } from '../src/data/waves';
import { ABILITIES, ABILITY_ORDER } from '../src/data/abilities';
import { MAPS } from '../src/data/maps';
import { SPEEDS } from '../src/data/config';
import { DIFFICULTY_ORDER } from '../src/data/difficulty';
import { PERK_ORDER, starsFor } from '../src/data/perks';
import { fehltVorKauf } from '../src/game/turmwerte';
import { auswertung } from '../src/game/auswertung';
import { TUTORIAL } from '../src/game/tutorial';
import { Sfx, type SfxName } from '../src/core/audio';

const mem = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
};

type Verdict = boolean;

interface Criterion {
  id: string;
  area: string;
  /** Woher das Kriterium stammt. */
  from: string;
  text: string;
  /** true = gemessen, false = von Hand beurteilt. */
  measured: boolean;
  check: () => Verdict;
  /** Was zu tun waere, wenn es nicht erfuellt ist. */
  gap?: string;
  weight: 1 | 2 | 3;
}

// Ein echter Spielzustand fuer die messbaren Kriterien.
const s = new GameState();
s.reset(12345);

const attackKinds = new Set(TOWER_ORDER.map((id) => TOWERS[id].attack));
const enemyList = Object.values(ENEMIES);
const bossWaves = MAPS.flatMap((m: { waves: Wave[] }) => m.waves
  .map((w, i) => (w.groups.some((g) => ENEMIES[g.enemy].boss) ? i + 1 : 0))
  .filter(Boolean));

/** Baut es sich auch bei Pause? Defender's Quest nennt das Fehlen dieser
 *  Moeglichkeit den einen grossen Fehler von Cursed Treasure. */
function buildsWhilePaused(): boolean {
  const t = new GameState();
  t.reset(1);
  t.paused = true;
  return t.build(t.map.hint.x, t.map.hint.y, 'arrow');
}

/** Reagiert die Karte an einer Kleinigkeit - und nur dort?
 *
 *  `map.rough` sind die Kreise, in denen nicht gebaut werden darf: Fels,
 *  Dickicht, Wasser. Sie werden nicht gezeichnet, weil sie im Kartenfoto
 *  schon stehen - sie sind die unsichtbare Entsprechung dessen, was man dort
 *  sieht. Genau sie reagieren seit v134 auf Beruehrung. */
function beruehrbareKleinigkeiten(): boolean {
  const s = new GameState();
  s.reset();
  const gr = s.map.rough[0];
  if (!gr) return false;
  s.particles.length = 0;
  if (!s.beruehren(gr.x, gr.y) || !s.particles.length) return false;
  // Und daneben nicht: sonst staubt jeder Tipp im Feld.
  const fern = s.map.rough.reduce((m, g) => Math.max(m, g.x + g.r), 0) + 400;
  s.particles.length = 0;
  return s.beruehren(fern, 40) === false && s.particles.length === 0;
}

/** F4 - stehen vor dem Kauf ALLE Werte da?
 *
 *  Nicht "gibt es ein Fenster", sondern: welches Feld liefert `statsFor` auf
 *  Stufe 1, und kommt jedes davon in der Liste vor, die die Bedienung zeigt?
 *  Gefragt wird an den Turmdaten, geantwortet aus `turmwerte.ts` - eine
 *  Liste, die sich aus den Feldern selbst baute, koennte nichts vergessen und
 *  wuerde damit nichts beweisen (Regel 13).
 *
 *  Beim ersten Lauf war es rot: `slowTime` und `falloff` standen seit jeher
 *  in den Daten und in keiner Liste. F4 galt trotzdem seit v11 als erfuellt -
 *  weil es von Hand beurteilt war. */
function alleWerteVorDemKauf(): boolean {
  return TOWER_ORDER.every((id) => fehltVorKauf(TOWERS[id]).length === 0);
}

/** P1 - hat jede Handlung ihren Ton?
 *
 *  `Sfx.play` wird abgehoert, dann wird jede Handlung wirklich ausgefuehrt.
 *  Drei Fragen, und die letzte ist die eigentliche:
 *   1. Klingt jede Handlung ueberhaupt?
 *   2. Klingt jede ANDERS? Ein einziges Klicken fuer alles waere kein
 *      Unterschied, sondern ein Geraeusch.
 *   3. Und schweigt es, wenn nichts geschieht? Ein abgelehnter Bau darf
 *      nicht klingen wie ein gelungener - sonst misst die Pruefung nur, dass
 *      ueberhaupt jemand `play` ruft (Regel 13). */
function tonJeHandlung(): boolean {
  const t = new GameState();
  t.reset(4711);
  t.gold = 9000;
  const spot = platzAmWeg(t) ?? t.map.hint;
  const lane = t.lanes[0];
  const aufDemWeg = lane.at(lane.length * 0.5);

  const gehoert: SfxName[] = [];
  const echt = Sfx.play.bind(Sfx);
  Sfx.play = (n: SfxName) => { gehoert.push(n); };
  try {
    const handlungen: (() => void)[] = [
      () => { t.build(spot.x, spot.y, 'arrow'); },
      () => { t.upgrade(t.towers[0], 0); },
      () => { t.startWave(); },
      () => { t.cast('meteor', t.goal.x, t.goal.y); },
      () => { t.sell(t.towers[0]); },
    ];
    const toene = new Set<SfxName>();
    for (const tun of handlungen) {
      const vorher = gehoert.length;
      tun();
      const neu = gehoert.slice(vorher);
      if (!neu.length) return false;
      for (const n of neu) toene.add(n);
    }
    if (toene.size < handlungen.length) return false;

    // Abschaltprobe: was nicht geschieht, klingt auch nicht.
    if (t.canPlace('arrow', aufDemWeg.x, aufDemWeg.y)) return false;
    const stumm = gehoert.length;
    t.build(aufDemWeg.x, aufDemWeg.y, 'arrow');
    return gehoert.length === stumm;
  } finally {
    Sfx.play = echt;
  }
}

/** Ein Platz, an dem ein Turm auch etwas trifft.
 *
 *  NICHT `map.hint` - der liegt auf 200/200, also in der Ecke, und ein Turm
 *  dort schiesst 45 Sekunden lang auf nichts. Genau daran ist die erste
 *  Fassung von P2 gescheitert, und das ist die Nachricht: der Bauhinweis ist
 *  ein Fingerzeig fuer den Anfaenger, kein guter Platz. Hier wird er am Weg
 *  gesucht, mit derselben Einrastung, die auch der Finger benutzt. */
function platzAmWeg(t: GameState, anteil = 0.35): { x: number; y: number } | null {
  const lane = t.lanes[0];
  const p = lane.at(lane.length * anteil);
  return t.einrasten('arrow', p.x, p.y, 220);
}

/** P2 - gibt es nach der Partie eine Auswertung, und steht Wahres darin?
 *
 *  Zuerst die Abschaltprobe: vor der Partie muss alles auf null stehen.
 *  Sonst misst der zweite Teil nur, dass Zahlen existieren.
 *
 *  Dann wird wirklich gespielt, bis die Partie zu Ende ist - der Kristall
 *  wird dafuer auf den letzten Rest gesetzt, sonst dauerte es fuenfzehn
 *  Wellen. Geprueft wird die fertige Auswertung: sie muss dieselbe Partie
 *  beschreiben, die eben gelaufen ist. */
function auswertungNachDerPartie(): boolean {
  const t = new GameState();
  t.reset(2024);
  t.gold = 9000;
  const leer = auswertung(t);
  if (leer.kills || leer.built || leer.damage || leer.duration) return false;

  const platz = platzAmWeg(t);
  if (!platz || !t.build(platz.x, platz.y, 'arrow')) return false;
  t.startWave();
  for (let i = 0; i < 60 * 45 && t.phase === 'playing'; i++) t.update(1 / 60);
  if (t.stats.kills === 0) return false;

  // Und jetzt zu Ende bringen: ein einzelner Turm laesst genug durch, der
  // Kristall steht auf dem letzten Rest. Die Wellen muessen dabei gestartet
  // werden - von allein laeuft keine an.
  t.lives = 1;
  for (let i = 0; i < 60 * 300 && t.phase === 'playing'; i++) {
    if (t.canStartWave) t.startWave();
    t.update(1 / 60);
  }
  if (t.phase === 'playing') return false;

  const a = auswertung(t);
  return a.built === 1
    && a.kills === t.stats.kills
    && a.damage > 0
    && a.duration > 0
    && a.wave >= 1 && a.wave <= a.waves
    && a.waves === t.totalWaves
    && a.mapName === t.map.name
    && a.maxLives > 0
    && a.won === false;
}

/** P3 - wird im Spiel eingefuehrt statt vorweg?
 *
 *  Die Frage ist nicht, ob es Erklaertexte gibt. Sie ist, ob sie an
 *  HANDGRIFFEN haengen: kein Schritt darf zu Beginn schon erledigt sein
 *  (sonst laeuft die Einfuehrung an einer Textwand vorbei ins Leere), keiner
 *  darf durch blosses Zuwarten weiterspringen, und jeder muss durch genau die
 *  Handlung fallen, die er verlangt. */
function einfuehrungImSpiel(): boolean {
  if (TUTORIAL.length < 3) return false;
  if (TUTORIAL.some((st) => !st.text || !st.target)) return false;

  const t = new GameState();
  t.reset(31415);
  t.gold = 9000;
  // Vorweg ist nichts erledigt - sonst waere die Einfuehrung schon vorbei,
  // bevor sie beginnt.
  if (TUTORIAL.some((st) => st.done(t))) return false;

  // Abschaltprobe: zehn Sekunden Zuschauen bringen sie nicht weiter.
  for (let i = 0; i < 600; i++) t.update(1 / 60);
  if (TUTORIAL[0].done(t)) return false;

  // Und jetzt die Handgriffe, in der Reihenfolge der Schritte.
  t.buildChoice = 'arrow';
  if (!TUTORIAL[0].done(t)) return false;
  const platz = platzAmWeg(t);
  if (!platz || !t.build(platz.x, platz.y, 'arrow')) return false;
  if (!TUTORIAL[1].done(t)) return false;
  t.startWave();
  return TUTORIAL[2].done(t);
}

const CRITERIA: Criterion[] = [
  // --- Fokus und Klarheit (Defender's Quest)
  {
    id: 'F1', area: 'Fokus', from: "Defender's Quest",
    text: 'Die ganze Karte ist ohne Scrollen sichtbar - Scrollen zerstoert den Ueberblick.',
    measured: true, weight: 3,
    check: () => MAPS.length > 0,
  },
  {
    id: 'F2', area: 'Fokus', from: "Defender's Quest",
    text: 'Pause vorhanden - und waehrend der Pause darf gebaut werden.',
    measured: true, weight: 3,
    check: buildsWhilePaused,
    gap: 'Bauen waehrend der Pause freigeben.',
  },
  {
    id: 'F3', area: 'Fokus', from: 'Kingdom Rush, Spielerkritik',
    text: 'Tempo umschaltbar - lange Wellen duerfen sich nicht ziehen.',
    measured: true, weight: 2,
    check: () => SPEEDS.length > 1,
  },
  {
    id: 'F4', area: 'Fokus', from: 'Spielerkritik ("kann nicht planen, wenn ich nichts weiss")',
    text: 'Alle Werte eines Turms sind sichtbar, bevor man ihn kauft.',
    // GEMESSEN seit v135. Vorher stand hier `check: () => true` mit dem
    // Vermerk "seit v11 erfuellt" - und es war nicht erfuellt.
    measured: true, weight: 3,
    check: alleWerteVorDemKauf,
    gap: 'Werte des gewaehlten Turms vor dem Bau anzeigen - vollstaendig.',
  },

  // --- Rollen und Entscheidungen (Kingdom Rush, Bloons TD 6)
  {
    id: 'R1', area: 'Rollen', from: 'Kingdom Rush (4 Turmarten)',
    text: 'Mindestens vier Turmarten.',
    measured: true, weight: 3,
    check: () => TOWER_ORDER.length >= 4,
  },
  {
    id: 'R2', area: 'Rollen', from: 'Kingdom Rush',
    text: 'Jede Turmart hat eine eigene Wirkungsweise, nicht nur andere Zahlen.',
    measured: true, weight: 3,
    check: () => attackKinds.size === TOWER_ORDER.length,
  },
  {
    id: 'R3', area: 'Rollen', from: 'Bloons TD 6 (drei Pfade je Turm)',
    text: 'Ausbau verzweigt sich - die Platzierung ist auch eine Bauentscheidung.',
    measured: true, weight: 3,
    check: () => TOWER_ORDER.every((id) => TOWERS[id].branches.length === 2),
    gap: 'Ab Stufe 2 zwei sich ausschliessende Zweige je Turm.',
  },
  {
    id: 'R4', area: 'Rollen', from: 'Kingdom Rush (Kaserne)',
    text: 'Etwas, das Gegner aufhaelt statt sie zu toeten (Blocker, Verstaerkung).',
    measured: true, weight: 2,
    // Bis v110 stand hier `() => false`, genau wie bei G5. Damit war das
    // Kriterium kein Massstab mehr, sondern eine Behauptung: es haette auch
    // dann noch offen gestanden, wenn die Sache laengst im Spiel waere.
    //
    // Gemessen wird jetzt, was der Satz verlangt - AUFHALTEN statt TOETEN.
    // Beides muss stimmen, und beides einzeln waere zu wenig:
    //
    //   `slow >= 1`   ein voller Halt, keine Bremse. Der Frostschlag bremst
    //                 auf 0,68 und erfuellt R4 damit ausdruecklich NICHT -
    //                 sonst waere das Kriterium seit v40 still gruen.
    //   kein Schaden  wer nebenbei toetet, haelt nicht auf, sondern toetet
    //                 langsamer. Der Punkt ist die Entscheidung gegen
    //                 Schaden, nicht ein Zusatz obendrauf.
    check: () => ABILITY_ORDER.some((id) => {
      const a = ABILITIES[id];
      return (a.slow ?? 0) >= 1 && !(a.damage ?? 0);
    }),
    gap: 'Etwas, das voll aufhaelt und dabei keinen Schaden macht.',
  },
  {
    id: 'R5', area: 'Rollen', from: 'Kingdom Rush (Regen des Feuers, Verstaerkung)',
    text: 'Faehigkeiten auf Abruf mit Abklingzeit.',
    measured: true, weight: 3,
    check: () => ABILITY_ORDER.length >= 2,
  },
  {
    id: 'R6', area: 'Rollen', from: 'Kingdom Rush, Fieldrunners',
    text: 'Mindestens ein Turm erreicht keine Flieger - Luftabwehr ist eine Entscheidung.',
    measured: true, weight: 2,
    check: () => TOWER_ORDER.some((id) => !TOWERS[id].hitsAir),
  },

  // --- Gegner stellen Fragen
  {
    id: 'G1', area: 'Gegner', from: 'Kingdom Rush, Bloons',
    text: 'Mindestens fuenf Gegnerarten.',
    measured: true, weight: 2,
    check: () => enemyList.length >= 5,
  },
  {
    id: 'G2', area: 'Gegner', from: 'Fieldrunners, Kingdom Rush',
    text: 'Fliegende Gegner, die den Pfad ignorieren.',
    measured: true, weight: 3,
    check: () => enemyList.some((e) => e.flying),
  },
  {
    id: 'G3', area: 'Gegner', from: 'Kingdom Rush (Panzerung)',
    text: 'Gepanzerte Gegner, gegen die schnelle schwache Treffer versagen.',
    measured: true, weight: 3,
    check: () => enemyList.some((e) => e.armor >= 3),
  },
  {
    id: 'G4', area: 'Gegner', from: 'Bloons TD 6 (Ballons platzen in kleinere)',
    text: 'Gegner, die beim Tod zerfallen.',
    measured: true, weight: 2,
    check: () => enemyList.some((e) => e.split),
  },
  {
    id: 'G5', area: 'Gegner', from: 'Kingdom Rush, Plants vs. Zombies',
    text: 'Unterstuetzende Gegner - Heiler, Schildtraeger, Beschwoerer.',
    measured: true, weight: 2,
    // Bis v110 stand hier `() => false` - fest verdrahtet auf "nicht
    // erfuellt". Ein Kriterium, das IMMER falsch meldet, misst genauso wenig
    // wie eines, das immer wahr meldet: es haette auch dann noch offen
    // gestanden, als der Traeger laengst im Spiel war.
    //
    // Gemessen wird jetzt die Sache selbst: traegt irgendeine Wellengruppe
    // einen Gegner, der ANDEREN hilft? Nicht "gibt es einen Gegner mit
    // besonderer Eigenschaft" - das waere schon mit dem Schild aus C7
    // erfuellt gewesen, und der schuetzt nur sich selbst.
    check: () => MAPS.some((m: { waves: Wave[] }) =>
      m.waves.some((w) => w.groups.some((g) => (g.traeger ?? 0) > 0))),
    gap: 'Heiler oder Schildtraeger, der die Reihenfolge der Ziele erzwingt.',
  },
  {
    id: 'G6', area: 'Gegner', from: 'Kingdom Rush (Boss je Abschnitt)',
    text: 'Bosswellen in regelmaessigem Abstand.',
    measured: true, weight: 3,
    check: () => bossWaves.length >= 2,
  },

  // --- Karten und Wiederspielwert
  {
    id: 'K1', area: 'Karten', from: 'Kingdom Rush (16 Abschnitte), Defense Grid',
    text: 'Mehr als eine Karte.',
    measured: true, weight: 3,
    check: () => MAPS.length >= 3,
    gap: 'Karte 2 und 3 mit eigenem Biom und eigener Pfadform.',
  },
  {
    id: 'K2', area: 'Karten', from: 'Kingdom Rush Frontiers (Gabelungen, mehrere Zugaenge)',
    text: 'Mindestens eine Karte mit Gabelung oder zwei Zugaengen.',
    measured: true, weight: 3,
    check: () => MAPS.some((m) => m.lanes.length > 1),
    gap: 'Zweiter Pfad, der sich mit dem ersten vereint.',
  },
  {
    id: 'K3', area: 'Karten', from: 'Bloons TD 6 (CHIMPS), Kingdom Rush (Eisen/Unmoeglich)',
    text: 'Schwierigkeitsgrade.',
    measured: true, weight: 2,
    check: () => DIFFICULTY_ORDER.length >= 3,
    gap: 'Ruhig / Normal / Erbarmungslos ueber Startwerte und Lebenspunktkurve.',
  },
  {
    id: 'K4', area: 'Karten', from: 'Kingdom Rush (Endlosmodus)',
    text: 'Endlosmodus nach der letzten Welle.',
    measured: true, weight: 2,
    // Bis v116 stand hier `() => true` bei `measured: false` - also eine
    // Behauptung. Der Endlosmodus ist aber schlicht ablesbar.
    check: () => DIFFICULTY_ORDER.length > 0 && MAPS.some((m: { waves: Wave[] }) => m.waves.length > 0)
      && typeof (new GameState()).endless === 'boolean', // seit v20
    gap: 'Nach Welle 15 fortlaufend skalierende Wellen.',
  },
  {
    id: 'K5', area: 'Karten', from: 'Kingdom Rush (Sterne), Plants vs. Zombies',
    text: 'Bewertung je Karte, die zum erneuten Spielen einlaedt.',
    measured: true, weight: 2,
    check: () => starsFor(true, 20, 20) === 3 && starsFor(true, 1, 20) === 1,
    gap: 'Sterne nach verbleibendem Kristall, je Karte gespeichert.',
  },
  {
    id: 'K6', area: 'Karten', from: 'Kingdom Rush (Sternpunkte)',
    text: 'Fortschritt zwischen den Partien.',
    measured: true, weight: 2,
    check: () => PERK_ORDER.length >= 4,
    gap: 'Punkte aus abgeschlossenen Karten, die Tuerme dauerhaft verbessern.',
  },

  // --- Rueckmeldung und Politur
  {
    id: 'P1', area: 'Politur', from: 'alle Referenzen',
    text: 'Ton fuer jede Handlung - und je Handlung ein eigener.',
    measured: true, weight: 2,
    check: tonJeHandlung,
    gap: 'Jeder Handlung einen eigenen Klang geben.',
  },
  {
    id: 'P2', area: 'Politur', from: '1945-Runde, Plants vs. Zombies',
    text: 'Auswertung nach der Partie - mit Zahlen aus dieser Partie.',
    measured: true, weight: 2,
    check: auswertungNachDerPartie,
    gap: 'Ergebnisbildschirm mit Kristall, Abschuessen, Tuermen, Dauer.',
  },
  {
    id: 'P3', area: 'Politur', from: 'Plants vs. Zombies (schrittweise Einfuehrung)',
    text: 'Einfuehrung im Spiel statt vorweg - an Handgriffen, nicht an Text.',
    measured: true, weight: 3,
    check: einfuehrungImSpiel,
    gap: 'Schritte an Handlungen binden statt an einen Weiter-Knopf.',
  },
  {
    id: 'P4', area: 'Politur', from: 'mobiler Alltag',
    text: 'Laufende Partie sichern und fortsetzen.',
    measured: true, weight: 2,
    // Sichern und Fortsetzen wird im Rauchtest ohnehin durchgespielt; hier
    // wird gemessen, dass es den Weg ueberhaupt gibt.
    check: () => {
      const g = new GameState();
      const stand = g.snapshot();
      return !!stand && typeof stand.v === 'number' && g.restore(stand);
    },
  },
  {
    id: 'P6', area: 'Politur', from: 'Kingdom Rush ("spectacular detail, color and animation")',
    text: 'Gegner sind animiert, nicht starr.',
    measured: false, weight: 3,
    check: () => true, // seit v15: sechs Einzelbilder je Gegnerart
    gap: 'Laufzyklus je Gegnerart backen.',
  },
  {
    id: 'P7', area: 'Politur', from: 'Kingdom Rush, Defense Grid',
    text: 'Die Welt lebt auch dann, wenn gerade keine Welle laeuft.',
    measured: false, weight: 2,
    check: () => true, // seit v15: Bodennebel, Polarlicht, Lichtschacht
    gap: 'Stimmungsschichten mit eigener Bewegung.',
  },
  {
    id: 'P8', area: 'Politur', from: 'Kingdom Rush (antippbare Kleinigkeiten in der Karte)',
    text: 'Kleinigkeiten in der Karte, die auf Beruehrung reagieren.',
    // GEMESSEN, seit v134 - vorher stand hier `measured: false` und
    // `check: () => false`, also eine Fehlanzeige von Hand.
    //
    // Geprueft wird nicht "gibt es die Funktion", sondern "reagiert die Karte
    // an einer Kleinigkeit UND nicht daneben". Ein Kriterium, das nur die
    // Anwesenheit einer Methode feststellt, waere wieder eine Behauptung.
    measured: true, weight: 1,
    check: beruehrbareKleinigkeiten,
    gap: 'Deko-Elemente, die bei Beruehrung reagieren - Voegel, Fackeln, Steine.',
  },
  {
    id: 'P5', area: 'Politur', from: 'Kingdom Rush (Turm-Infofenster)',
    text: 'Turm-Inspektor mit Vorschau der naechsten Stufe.',
    measured: true, weight: 2,
    // Vorschau der naechsten Stufe: gibt es zu jeder Stufe unter der
    // hoechsten einen Nachfolger, dessen Werte sich zeigen lassen?
    check: () => TOWER_ORDER.every((id) => {
      const def = TOWERS[id];
      return def.branches.every((_b, i) => !!nextFor(def, i as 0 | 1, 1));
    }),
  },
];

// ------------------------------------------------------------------ Ausgabe

const met = CRITERIA.filter((c) => c.check());
const open = CRITERIA.filter((c) => !c.check());
const total = CRITERIA.reduce((a, c) => a + c.weight, 0);
const score = met.reduce((a, c) => a + c.weight, 0);

// --- Wieviel von der Zahl ist gemessen, und wieviel behauptet?
//
// Bis v116 stand nur eine Zahl da, und zehn der dreissig Kriterien trugen
// `measured: false` - sie zaehlten voll mit, ohne dass irgendetwas sie
// prueft. Wer "gewichtet 99 %" liest, liest dann eine Zahl, die zu einem
// Teil aus Behauptungen besteht, und weiss es nicht.
//
// Das ist keine Kleinigkeit: G5 und R4 standen jahrelang falsch, WEIL eine
// Behauptung wie eine Messung aussah. Also werden beide Zahlen genannt.
const gemessen = CRITERIA.filter((c) => c.measured);
const behauptet = CRITERIA.filter((c) => !c.measured);
const gemessenGewicht = gemessen.reduce((a, c) => a + c.weight, 0);
const gemessenErfuellt = gemessen.filter((c) => c.check()).reduce((a, c) => a + c.weight, 0);

console.log(
  `GENRE-BERICHT (kein Tor): ${met.length}/${CRITERIA.length} Kriterien erfuellt ` +
  `(gewichtet ${Math.round((score / total) * 100)} %)`,
);
console.log(
  `  davon GEMESSEN: ${gemessenErfuellt}/${gemessenGewicht} Gewicht `
  + `(${Math.round((gemessenErfuellt / gemessenGewicht) * 100)} %) ueber ${gemessen.length} Kriterien.`,
);
console.log(
  `  BEHAUPTET (von Hand beurteilt, nichts prueft sie): ${behauptet.length} Kriterien, `
  + `Gewicht ${behauptet.reduce((a, c) => a + c.weight, 0)} von ${total} `
  + `(${Math.round((behauptet.reduce((a, c) => a + c.weight, 0) / total) * 100)} % der Zahl oben).`,
);

const areas = [...new Set(CRITERIA.map((c) => c.area))];
for (const area of areas) {
  const inArea = CRITERIA.filter((c) => c.area === area);
  const ok = inArea.filter((c) => c.check()).length;
  console.log(`  ${area.padEnd(8)} ${ok}/${inArea.length}`);
}

if (open.length) {
  console.log('\nDelta, nach Gewicht:');
  for (const c of [...open].sort((a, b) => b.weight - a.weight)) {
    const stars = '●'.repeat(c.weight);
    console.log(`  ${c.id} ${stars.padEnd(3)} ${c.text}`);
    console.log(`        Vorbild: ${c.from}`);
    if (c.gap) console.log(`        Naechster Schritt: ${c.gap}`);
  }
}

const byHand = CRITERIA.filter((c) => !c.measured).map((c) => c.id);
console.log(`\nVon Hand beurteilt (jeden Lauf neu pruefen): ${byHand.join(', ')}`);
void s;
