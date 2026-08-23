/** Die Auswertung einer Partie - an EINER Stelle.
 *
 *  Was auf dem Ergebnisbildschirm steht, entstand bis v134 in `main.ts`,
 *  direkt beim Anzeigen: dort wurden die Zahlen aus dem Zustand
 *  zusammengetragen, UND dort wurden Bestwert und Sterne eingetragen. Beides
 *  tat `finishRun` im Spielzustand aber laengst schon, ein paar
 *  Millisekunden vorher, im selben Bild. Zwei Stellen, dieselbe Aufgabe -
 *  Regel 15 - und beide Fassungen waren inzwischen auseinandergelaufen:
 *
 *  * Der Bestwert wurde mit `waveNumber` eingetragen statt mit der wirklich
 *    erreichten Welle. Auf der Landkarte stand danach eine Welle mehr, als
 *    ueberstanden wurde - bei jeder Partie, seit es die Bestwerte gibt.
 *  * "Vorher" wurde gelesen, NACHDEM `finishRun` die Sterne schon
 *    eingetragen hatte. Damit war `stars > before` nie wahr und die Zeile
 *    "Ein neuer Stern" erschien kein einziges Mal.
 *
 *  Jetzt traegt der Spielzustand ein, und diese Funktion liest nur noch ab.
 *  Sie schreibt NICHTS - das ist der Punkt.
 *
 *  Gemessen wird sie in `tools/benchmark.ts` (Kriterium P2) und im
 *  Rauchtest, dort an einer wirklich durchgespielten Partie. */
import type { GameState } from './state';

export interface Auswertung {
  won: boolean;
  mapId: string;
  mapName: string;
  /** Die erreichte Welle und wieviele es insgesamt sind. */
  wave: number;
  waves: number;
  lives: number;
  maxLives: number;
  stars: number;
  /** Sterne vor diesem Lauf - fuer "Ein neuer Stern". */
  before: number;
  kills: number;
  built: number;
  damage: number;
  duration: number;
}

export function auswertung(s: GameState): Auswertung {
  return {
    won: s.phase === 'won',
    mapId: s.map.id,
    mapName: s.map.name,
    wave: s.waveNumber,
    waves: s.totalWaves,
    lives: s.lives,
    maxLives: s.maxLives,
    stars: s.stars,
    before: s.sterneVorher,
    kills: s.stats.kills,
    built: s.stats.towersBuilt,
    damage: Math.round(s.stats.damage),
    duration: s.stats.duration,
  };
}
