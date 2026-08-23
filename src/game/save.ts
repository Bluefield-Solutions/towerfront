import type { EnemyId } from '../data/enemies';
import type { BranchIndex, TowerId } from '../data/towers';
import type { AbilityId } from '../data/abilities';
import type { RunStats } from './types';
import type { DifficultyId } from '../data/difficulty';

/** Spielstand einer laufenden Partie.
 *
 *  Bewusst als kurze Zahlenreihen statt als Objekte: der Stand wird alle zwei
 *  Sekunden geschrieben und soll im Speicher des Browsers nicht aufblaehen.
 *
 *  Nicht gesichert werden Partikel, Ringe, Blitze und aufsteigende Zahlen -
 *  reine Darstellung ohne Wirkung auf den Verlauf.
 *
 *  Geschosse im Flug werden dagegen mitgesichert. Sie als "halben Treffer"
 *  wegzulassen war bequem, aber falsch: die Determinismus-Pruefung hat gezeigt,
 *  dass eine fortgesetzte Partie dadurch messbar anders verlaeuft. */
export interface SaveGame {
  v: 7;
  difficulty: DifficultyId;
  map: string;
  endless: boolean;
  seed: number;
  rng: number;
  gold: number;
  lives: number;
  waveIndex: number;
  waveActive: boolean;
  waveTime: number;
  idleTime: number;
  leaked: number;
  time: number;
  speed: number;
  /** Restliche Abklingzeit je Faehigkeit. */
  abilityCd: [AbilityId, number][];
  /** Meteore im Anflug: [x, y, Fortschritt, Dauer, Radius, Schaden].
   *  Anders als ein Geschoss ist ein Meteor eine bereits bezahlte
   *  Entscheidung - die Abklingzeit laeuft schon. Ihn beim Fortsetzen
   *  verschwinden zu lassen waere ein echter Verlust, kein halber Treffer. */
  meteors: [number, number, number, number, number, number][];
  /** Geschosse im Flug. Zielt ein Geschoss auf einen Gegner, steht dort dessen
   *  Index in der Gegnerliste; bei ballistischen Geschossen -1. */
  /** [Art, x, y, sx, sy, tx, ty, Zielindex, Schuetzenindex, Tempo, Schaden,
   *  Bremse, Bremsdauer, Splitterradius, Panzerbruch, t, Dauer, Restzeit,
   *  Farbe, Richtung x, Richtung y, trifft Luft]
   *
   *  Richtung und Luftfaehigkeit sind ANGEHAENGT (v144): ein aelterer Stand
   *  hat neunzehn Felder und laedt weiter, die Richtung wird dann aus Start
   *  und Zielpunkt gerechnet.
   *
   *  Diese Liste stand bis v143 mit siebzehn Feldern hier, waehrend neunzehn
   *  geschrieben wurden - der Unterschied verschwand in einem
   *  `as unknown as`. Genau das ist Regel 15: was zweimal dasteht, veraltet
   *  einmal. Die Umschreibung ist jetzt weg, damit der Uebersetzer die
   *  zweite Stelle prueft. */
  shots: [
    'homing' | 'ballistic', number, number, number, number, number, number,
    number, number, number, number, number, number, number, number, number,
    number, number, string, number?, number?, number?,
  ][];
  /** [Zeit, Gegnerart, Lebenspunktfaktor, Bahn, Schild, Traeger]
   *
   *  Schild und Traeger sind ANGEHAENGT: ein Stand aus v136 hat vier Felder
   *  und laedt weiter, er bekommt Null. Deshalb bleibt auch die Formatnummer,
   *  wo sie war. */
  pending: [number, EnemyId, number, number, number?, number?][];
  /** Rest der Trefferpause - sie haelt die Simulation an und gehoert deshalb
   *  in den Stand, obwohl sie sich wie ein Effekt anfuehlt.
   *
   *  Hiess bis v136 `hitstop` und war eines von ZWEI Feldern fuer dieselbe
   *  Sache. Ein alter Stand wird weiter gelesen. */
  hitStop: number;
  /** Die mitgeschriebenen Zahlen. Ohne sie faengt die Auswertung nach dem
   *  Fortsetzen bei null an - der Lauf waere derselbe, der Bericht nicht. */
  stats: RunStats;
  /** [Turmart, Spalte, Zeile, Stufe, Abschuesse, Schaden, Nachladerest, Zielsuche, Zweig,
   *  Zielindex in der Gegnerliste oder -1]
   *
   *  Das zwischengespeicherte Ziel gehoert dazu: ohne es sucht nach dem Laden
   *  jeder Turm sofort neu, waehrend er ohne Unterbrechung noch bis zu
   *  120 ms an seinem alten Ziel geblieben waere. Genug, um den Verlauf zu
   *  veraendern. */
  /** [Turmart, x, y, Stufe, Erledigt, Schaden, Nachladerest, Zielsuchrest,
   *  Zweig, Zielindex, Zielwahl, Zielwinkel]
   *
   *  Die Zielwahl ist ANGEHAENGT, nicht eingeschoben. Ein Stand aus v106 hat
   *  zehn Felder und laedt weiter - er bekommt den Standard. Deshalb bleibt
   *  auch die Formatnummer, wo sie war: niemandem wird die laufende Partie
   *  verworfen, nur weil ein Turm jetzt mehr weiss.
   *
   *  Der Zielwinkel kam in v145 dazu. Er ist reine Darstellung - an ihm
   *  haengt, wohin die Waffe blickt und damit, wo die Muendung sitzt. Ohne
   *  ihn stuenden nach dem Fortsetzen alle Tuerme auf demselben Winkel und
   *  schwenkten erst beim naechsten Ziel wieder auseinander. Das sieht man,
   *  also gehoert es in den Stand.
   *
   *  Der Zwischenschritt dorthin ist es wert, aufgeschrieben zu werden: der
   *  erste Entwurf liess Geschosse WIRKLICH an der Muendung entstehen. Damit
   *  wurde der Winkel Teil der Simulation, die Determinismus-Pruefung schlug
   *  an - und die Balance fiel um ein Fuenftel, weil ein Versatz von hundert
   *  Bildpunkten als hundert Weltpunkte Flugstrecke mitgerechnet wurde. In
   *  einer Dreiviertelansicht ist er aber HOEHE. Deshalb sinkt heute nur der
   *  Zeichenversatz ab, und die Flugbahn ist dieselbe wie in v144. */
  towers: [TowerId, number, number, number, number, number, number, number, BranchIndex, number,
    number?, number?][];
  /** [Gegnerart, x, y, hp, hpMax, Segment, Strecke, Bremsfaktor, Bremsrest, Wackeln] */
  /** [Gegnerart, x, y, hp, hpMax, Segment, Strecke, Bremsfaktor, Bremsrest,
   *  Wackeln, Bahn] */
  /** ... zuletzt die Schildreste. Angehaengt wie die Zielwahl bei den
   *  Tuermen: ein Stand ohne das Feld laedt weiter und bekommt Null. */
  enemies: [
    EnemyId, number, number, number, number, number, number, number, number, number, number,
    number, number?, number?,
  ][];
}

// Vormals 'kristallwacht.lauf' - siehe Hinweis in storage.ts.
const KEY = 'towerfront.lauf';

export function saveGame(s: SaveGame): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* Speicher gesperrt */ }
}

export function loadGame(): SaveGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SaveGame;
    // Ein Stand aus einer aelteren Fassung wird verworfen statt halb geladen.
    if (p.v !== 7 || !Array.isArray(p.towers) || !Array.isArray(p.enemies)) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try { localStorage.removeItem(KEY); } catch { /* Speicher gesperrt */ }
}

