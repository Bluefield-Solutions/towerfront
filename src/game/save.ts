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
  v: 5;
  difficulty: DifficultyId;
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
  shots: [
    'homing' | 'ballistic', number, number, number, number, number, number,
    number, number, number, number, number, number, number, number, number, string,
  ][];
  /** [Zeit, Gegnerart, Lebenspunktfaktor] */
  pending: [number, EnemyId, number][];
  /** Rest der Trefferpause - sie haelt die Simulation an und gehoert deshalb
   *  in den Stand, obwohl sie sich wie ein Effekt anfuehlt. */
  hitstop: number;
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
  towers: [TowerId, number, number, number, number, number, number, number, BranchIndex, number][];
  /** [Gegnerart, x, y, hp, hpMax, Segment, Strecke, Bremsfaktor, Bremsrest, Wackeln] */
  enemies: [EnemyId, number, number, number, number, number, number, number, number, number][];
}

const KEY = 'kristallwacht.lauf';

export function saveGame(s: SaveGame): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* Speicher gesperrt */ }
}

export function loadGame(): SaveGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SaveGame;
    // Ein Stand aus einer aelteren Fassung wird verworfen statt halb geladen.
    if (p.v !== 5 || !Array.isArray(p.towers) || !Array.isArray(p.enemies)) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try { localStorage.removeItem(KEY); } catch { /* Speicher gesperrt */ }
}

export function hasGame(): boolean {
  return loadGame() !== null;
}
