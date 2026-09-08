/**
 * Was ein Wellenplan taugt - EINMAL gerechnet, von allen benutzt.
 *
 * **Warum es diese Datei gibt.** Dieselbe Lehre wie bei `bahnmass.ts`, nur
 * eine Ecke weiter: die Druckformel stand zweimal im Baum. Einmal als
 * `wellenDruck` in `src/data/waves.ts` - mit einem Absatz darueber, der genau
 * das begruendet ("zwei Fassungen davon waeren eine zu viel") - und einmal
 * als vier Zeilen mitten im Waechter:
 *
 *     pressure += g.count * e.hp * (1 + split) * (g.hpMul ?? 1);
 *
 * Beide rechneten zufaellig dasselbe. Das ist kein Trost, sondern der
 * Normalfall bei Regel 15: eine Doppelung faellt nicht auf, solange niemand
 * eine der beiden aendert. Gefunden habe ich sie erst, als ein Werkzeug
 * gebraucht wurde, das Plaene ENTWIRFT statt sie zu pruefen - dieselbe
 * Bewegung, mit der v237 `bahnmass.ts` entstanden ist.
 *
 * Hier ist die eine Stelle. Wer einen Entwurf misst und wer den
 * ausgelieferten Plan prueft, bekommt dieselbe Rechnung.
 */
import { ENEMIES } from '../src/data/enemies';
import { wellenDruck, type Wave } from '../src/data/waves';
import type { GameMap } from '../src/data/maps';

/** Der Druck einer Welle: wieviel Leben sie insgesamt aufs Feld bringt.
 *
 *  Steht bewusst NICHT hier, sondern wird durchgereicht: die Formel gehoert
 *  zu den Daten, die sie beschreibt (v151), und dieses Modul ist die
 *  Messwerkstatt, nicht ihre zweite Heimat. */
export const druck = wellenDruck;

/** Wieviel Kristall eine Welle im schlimmsten Fall kosten kann.
 *  Zerfallende Gegner zaehlen mit dem, was aus ihnen wird. */
export function hoechstverlust(w: Wave): number {
  let summe = 0;
  for (const g of w.groups) {
    const e = ENEMIES[g.enemy];
    if (!e) continue;
    summe += g.count * (e.leak + (e.split ? e.split.count * ENEMIES[e.split.into].leak : 0));
  }
  return summe;
}

/** Wie lange eine Welle Nachschub ausstoesst, in Sekunden.
 *
 *  Nicht wie lange sie DAUERT - dazu kaeme die Laufzeit ueber die Bahn, und
 *  die haengt an der Karte. Gemessen ist der Ausstoss, denn er bestimmt, wie
 *  dicht die Gegner auf dem Feld stehen. */
export function ausstoss(w: Wave): number {
  let ende = 0;
  for (const g of w.groups) ende = Math.max(ende, g.delay + (g.count - 1) * g.gap);
  return ende;
}

/** Welche Gegnerarten fliegen, und welcher Anteil der Lebenspunkte. */
export function luftanteil(plan: Wave[]): { anteil: number; wellen: number } {
  let luft = 0, hp = 0, wellen = 0;
  for (const w of plan) {
    let hatLuft = false;
    for (const g of w.groups) {
      const e = ENEMIES[g.enemy];
      if (!e) continue;
      const p = g.count * e.hp * (g.hpMul ?? 1);
      hp += p;
      if (e.flying) { luft += p; hatLuft = true; }
    }
    if (hatLuft) wellen += 1;
  }
  return { anteil: hp ? luft / hp : 0, wellen };
}

/** **Die Form der Druckkurve** - das, was ein Spieler als Steigerung erlebt.
 *
 *  Drei Zahlen, und jede beantwortet eine eigene Frage:
 *
 *  * `rueckfaelle` - wie oft der Druck gegenueber der Vorwelle faellt. Eine
 *    Kurve, die viermal einbricht, ist keine Steigerung, sondern ein
 *    Zickzack. Wellen nach einem Boss zaehlen nicht mit: nach einem Titanen
 *    darf es leichter werden, das ist die Erholung und kein Rueckschritt.
 *  * `tiefsterRueckfall` - wie tief der groesste Einbruch geht, anteilig.
 *  * `finaleGegenSpitze` - was die letzte Welle im Verhaeltnis zur staerksten
 *    bringt. Steht sie unter 1, war der Hoehepunkt vorher, und das Finale ist
 *    eine Enttaeuschung, die kein Tor bisher gesehen hat.
 *
 *  **Und `skala` ist der Grund, aus dem diese Funktion ueberhaupt einen
 *  zweiten Anlauf gebraucht hat.** Der Druck einer Welle ist nur EIN Faktor
 *  der Schwierigkeit; der andere ist `hpScale`, und der steigt ueber einen
 *  Lauf um das Zwanzigfache. Was ein Spieler erlebt, ist das Produkt.
 *
 *  Die erste Fassung mass nur den rohen Druck und meldete: 3 bis 5
 *  Rueckfaelle je Karte, das Finale bei 72 bis 93 % der Spitze, "auf KEINER
 *  Karte ist die letzte Welle die schwerste". Mit der Skala gerechnet sind es
 *  **1 bis 3 Rueckfaelle und 81 bis 100 %** - auf der Ascheschlucht IST das
 *  Finale die Spitze. Regel 12 gegen den eigenen Befund: die Zahl war nicht
 *  falsch gerechnet, sie stand nur an der falschen Stelle.
 *
 *  Ohne `skala` bleibt die rohe Kurve - die beschreibt den PLAN und ist beim
 *  Entwerfen die richtige Frage. Mit `skala` die wirksame, und die ist beim
 *  Pruefen die richtige. */
export function kurve(plan: Wave[], skala?: (i: number) => number): {
  rueckfaelle: number; tiefsterRueckfall: number; finaleGegenSpitze: number;
  druecke: number[];
} {
  const d = plan.map((w, i) => druck(w) * (skala ? skala(i) : 1));
  const bossVor = plan.map((_w, i) => i > 0
    && plan[i - 1].groups.some((g) => ENEMIES[g.enemy]?.boss));
  let rueckfaelle = 0, tiefster = 0;
  for (let i = 1; i < d.length; i += 1) {
    if (bossVor[i] || d[i] >= d[i - 1]) continue;
    rueckfaelle += 1;
    tiefster = Math.max(tiefster, 1 - d[i] / d[i - 1]);
  }
  const spitze = Math.max(...d, 1);
  return {
    rueckfaelle,
    tiefsterRueckfall: tiefster,
    finaleGegenSpitze: d[d.length - 1] / spitze,
    druecke: d,
  };
}

/** Die Gegnermischung eines Plans, gewichtet nach Anzahl mal Leben.
 *  Zwei Plaene mit derselben Mischung sind zwei Namen fuer dieselbe Karte. */
export function mischung(plan: Wave[]): Map<string, number> {
  const m = new Map<string, number>();
  let gesamt = 0;
  for (const w of plan) {
    for (const g of w.groups) {
      const e = ENEMIES[g.enemy];
      if (!e) continue;
      const p = g.count * e.hp;
      m.set(g.enemy, (m.get(g.enemy) ?? 0) + p);
      gesamt += p;
    }
  }
  for (const [k, v] of m) m.set(k, gesamt ? v / gesamt : 0);
  return m;
}

/** Der Abstand zweier Mischungen - null heisst gleich, eins heisst fremd. */
export function abstand(a: Map<string, number>, b: Map<string, number>): number {
  let summe = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    summe += Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0));
  }
  return summe / 2;
}

/** Alle vier Plaene mit ihrer Kurve - fuer den Waechter und die Werkbank. */
export function kurvenAller(karten: GameMap[]): {
  id: string; name: string; k: ReturnType<typeof kurve>;
}[] {
  return karten.map((m) => ({ id: m.id, name: m.name, k: kurve(m.waves) }));
}
