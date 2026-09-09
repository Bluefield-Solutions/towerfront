import { LanePath, type PathPoint } from './path';

/** Die Route vom Tor zum Kristall - gerechnet, nicht eingetragen.
 *
 *  **Warum das die eigentliche Aenderung ist.** Bis v278 stand in jedem Netz
 *  eine `belegung`: je Bahn die Kantenfolge, von Hand hingeschrieben. Damit
 *  war der Weg weiterhin gesetzt - das Netz war nur eine andere Schreibweise
 *  fuer dieselbe feste Liste. Der gemessene Befund dahinter ist die
 *  Kreuzdeckung aus v236: die Bahn kam aus dem Wellenplan, die Gegner wichen
 *  also gar nicht aus, und wer fuer eine Bahn baute, sah den Rest jeder Welle
 *  fast ungehindert durch.
 *
 *  Jetzt wird gerechnet. Das Netz sagt, was moeglich ist; `kuerzesteRoute`
 *  sagt, was ein Gegner davon nimmt. Eine gesperrte Kante - spaeter eine
 *  umgelegte Weiche - aendert die Antwort, ohne dass irgendwo eine Liste
 *  nachgezogen werden muesste.
 *
 *  **Die Kosten sind Bogenlaengen, keine Kantenzahl.** Eine Kantenzahl
 *  verwechselt einen langen Umweg mit einer kurzen Abkuerzung; auf der
 *  Ascheschlucht liegen zwei Kanten mit 218 und 2203 Weltpunkten
 *  nebeneinander.
 *
 *  Messstelle (Regel 12): gemessen wird die Kurve der Kante ALLEIN, also mit
 *  ihren beiden Knoten als Endpunkten. Das ist nicht dasselbe wie ihr Stueck
 *  in der fertigen Bahn - eine Catmull-Rom-Kurve haengt an ihren Nachbarn,
 *  und ueber die vier heutigen Karten gehen die Summen um bis zu 3,2
 *  Weltpunkte auseinander. Fuer einen VERGLEICH zweier Routen ist das
 *  belanglos; als Laengenangabe waere es falsch, und deshalb steht es hier
 *  und nicht als Zahl im Bericht. */

export interface RouteKnoten {
  id: string;
  x: number; y: number; w?: number;
  art: 'tor' | 'kreuz' | 'ziel';
}

export interface RouteKante {
  id: string;
  von: string; nach: string;
  punkte: PathPoint[];
}

export interface RoutenNetz {
  knoten: readonly RouteKnoten[];
  kanten: readonly RouteKante[];
}

/** Die Bogenlaenge einer Kante, einmal gerechnet und gemerkt.
 *
 *  Der Schluessel ist die Kante selbst, nicht ihre Kennung: zwei Netze
 *  duerfen dieselbe Kennung tragen, und ein Netz mit gesperrten Kanten ist
 *  ein anderes Netz mit denselben Kanten-Gegenstaenden. */
const laengen = new WeakMap<RouteKante, number>();

export function kantenLaenge(netz: RoutenNetz, kante: RouteKante): number {
  const da = laengen.get(kante);
  if (da !== undefined) return da;
  const a = netz.knoten.find((k) => k.id === kante.von);
  const b = netz.knoten.find((k) => k.id === kante.nach);
  if (!a || !b) throw new Error(`ROUTE: die Kante "${kante.id}" haengt an einem unbekannten Knoten.`);
  const laenge = new LanePath([
    { x: a.x, y: a.y, w: a.w }, ...kante.punkte, { x: b.x, y: b.y, w: b.w },
  ]).length;
  laengen.set(kante, laenge);
  return laenge;
}

/** Der Zielknoten. Es gibt genau einen - alle Routen enden am selben
 *  Kristall. */
export function zielKnotenVon(netz: RoutenNetz): RouteKnoten {
  const z = netz.knoten.find((k) => k.art === 'ziel');
  if (!z) throw new Error('ROUTE: das Netz hat keinen Zielknoten.');
  return z;
}

/** Die kuerzeste offene Route von einem Tor zum Kristall.
 *
 *  Gibt die Kantenkennungen in Laufrichtung zurueck - oder `null`, wenn das
 *  Ziel von diesem Tor aus nicht mehr erreichbar ist. `null` ist eine
 *  Antwort, kein Ausweichen: eine Sperre, die alles zumacht, muss auffallen
 *  (der Waechter aus S-N2-04 haengt daran).
 *
 *  **Deterministisch bei gleichen Kosten.** Zwei Routen derselben Laenge
 *  entscheidet die Kennung, nicht die Reihenfolge im Feld - sonst haengt der
 *  Verlauf einer Partie daran, in welcher Zeile eine Kante steht, und das
 *  Determinismus-Tor faende es erst, wenn jemand die Datei umsortiert. */
export function kuerzesteRoute(
  netz: RoutenNetz, torId: string, gesperrt?: ReadonlySet<string>,
): string[] | null {
  const ziel = zielKnotenVon(netz).id;
  const offen = netz.kanten.filter((k) => !gesperrt?.has(k.id));
  const beste = new Map<string, { kosten: number; weg: string[] }>();
  beste.set(torId, { kosten: 0, weg: [] });
  const rand = new Set<string>([torId]);
  while (rand.size) {
    let hier: string | null = null;
    for (const k of rand) {
      if (hier === null) { hier = k; continue; }
      const a = beste.get(k)!, b = beste.get(hier)!;
      if (a.kosten < b.kosten || (a.kosten === b.kosten && k < hier)) hier = k;
    }
    rand.delete(hier!);
    const stand = beste.get(hier!)!;
    for (const kante of offen) {
      if (kante.von !== hier) continue;
      const kosten = stand.kosten + kantenLaenge(netz, kante);
      const alt = beste.get(kante.nach);
      // Gleichstand geht an die kleinere Kennung, nicht an die erste Zeile.
      if (alt && (alt.kosten < kosten
        || (alt.kosten === kosten && alt.weg.join() <= [...stand.weg, kante.id].join()))) continue;
      beste.set(kante.nach, { kosten, weg: [...stand.weg, kante.id] });
      rand.add(kante.nach);
    }
  }
  const treffer = beste.get(ziel);
  return treffer && treffer.weg.length ? treffer.weg : null;
}
