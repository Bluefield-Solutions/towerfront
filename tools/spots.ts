import type { GameState } from '../src/game/state';
import type { TowerId } from '../src/data/towers';
import { snap } from '../src/data/maps';

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
      // Gefragt wird nach dem GERASTERTEN Punkt, denn genau den baut `build`.
      //
      // Bis v138 pruefte dieses Werkzeug den rohen Punkt und gab ihn zurueck;
      // `build` rasterte ihn dann und lehnte ihn manchmal ab. Solange die
      // Grenzen weit genug weg lagen, fiel das nie auf - beim ersten
      // geaenderten Platzbedarf stuerzte der Rauchtest ab, weil `towers[0]`
      // nicht existierte. Ein Werkzeug, das eine andere Frage stellt als das
      // Spiel, beantwortet sie irgendwann anders.
      const px = snap(x), py = snap(y);
      if (!s.canPlace(id, px, py)) continue;
      const score = s.lanes.reduce((a, l) => a + l.coveredLength(px, py, REACH), 0);
      if (score > 0) out.push({ x: px, y: py, score });
    }
  }
  return out.sort((a, b) => b.score - a.score).map((o) => ({ x: o.x, y: o.y }));
}
