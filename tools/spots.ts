import type { GameState } from '../src/game/state';
import type { TowerId } from '../src/data/towers';

/** Baubare Punkte einer Karte, grob abgetastet.
 *
 *  Seit v37 wird frei gebaut - es gibt keine Liste von Plaetzen mehr. Die
 *  Werkzeuge brauchen trotzdem eine endliche Auswahl, also wird das Feld
 *  abgetastet und nach abgedeckter Wegstrecke sortiert. Das entspricht dem,
 *  was ein Mensch tut: die Stellen suchen, die am meisten Weg sehen. */
export function candidateSpots(s: GameState, id: TowerId = 'arrow'): { x: number; y: number }[] {
  const REACH = 252;
  const out: { x: number; y: number; score: number }[] = [];
  for (let y = 40; y < 1080; y += 36) {
    for (let x = 40; x < 1920; x += 36) {
      if (!s.canPlace(id, x, y)) continue;
      const score = s.lanes.reduce((a, l) => a + l.coveredLength(x, y, REACH), 0);
      if (score > 0) out.push({ x, y, score });
    }
  }
  return out.sort((a, b) => b.score - a.score).map((o) => ({ x: o.x, y: o.y }));
}
