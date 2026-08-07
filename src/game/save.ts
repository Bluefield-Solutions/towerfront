import type { EnemyId } from '../data/enemies';
import type { TowerId } from '../data/towers';
import type { AbilityId } from '../data/abilities';
import type { RunStats } from './types';

/** Spielstand einer laufenden Partie.
 *
 *  Bewusst als kurze Zahlenreihen statt als Objekte: der Stand wird alle zwei
 *  Sekunden geschrieben und soll im Speicher des Browsers nicht aufblaehen.
 *
 *  Nicht gesichert werden fliegende Geschosse, Partikel, Ringe und Zahlen -
 *  reine Darstellung. Ein Geschoss, das beim Sichern unterwegs war, geht beim
 *  Fortsetzen verloren; das ist ein halber Treffer und keine Entscheidung. */
export interface SaveGame {
  v: 3;
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
  /** [Zeit, Gegnerart, Lebenspunktfaktor] */
  pending: [number, EnemyId, number][];
  /** Rest der Trefferpause - sie haelt die Simulation an und gehoert deshalb
   *  in den Stand, obwohl sie sich wie ein Effekt anfuehlt. */
  hitstop: number;
  /** Die mitgeschriebenen Zahlen. Ohne sie faengt die Auswertung nach dem
   *  Fortsetzen bei null an - der Lauf waere derselbe, der Bericht nicht. */
  stats: RunStats;
  /** [Turmart, Spalte, Zeile, Stufe, Abschuesse, Schaden, Nachladerest, Zielsuche] */
  towers: [TowerId, number, number, number, number, number, number, number][];
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
    if (p.v !== 3 || !Array.isArray(p.towers) || !Array.isArray(p.enemies)) return null;
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
