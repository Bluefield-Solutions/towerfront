/** Was tut man gegen diesen Gegner? (TF-034)
 *
 *  **Warum das gerechnet und nicht geschrieben wird.** Bis v151 standen die
 *  Konter in den handgeschriebenen Wellensaetzen - und zwar luecken- und
 *  widerspruchsvoll: von zwanzig Erstauftritten ueber drei Karten trugen
 *  zwoelf ueberhaupt einen Satz, und nur DREI nannten einen Konter (die drei
 *  Gleiter-Zeilen). Der Spalter wurde auf dem Spiralhain und der Frostspalte
 *  erklaert und auf der Ascheschlucht nicht - derselbe Gegner, dieselbe
 *  Ueberraschung, ein vergessener Eintrag. Eine Tabelle mit acht Zeilen ist
 *  bei der neunten Gegnerart still unvollstaendig, und eine fehlende Zeile
 *  faellt niemandem auf, weil dann eben kein Hinweis kommt.
 *
 *  Deshalb kommt der Satz aus den DATEN - aus denen des Gegners und aus
 *  denen der Tuerme. Wer einen Gegner hinzufuegt, bekommt seinen Satz
 *  umsonst; wer die Tuerme umbaut, bekommt einen Satz, der noch stimmt.
 *
 *  **Und deshalb steht nicht bei jedem einer.** Ein Hinweis, der immer
 *  dasteht, ist keiner mehr (Regel 13, dieselbe Falle wie beim
 *  Sprungzeichen). Genannt wird nur, was die Entscheidung des Spielers
 *  aendert: heute sechs von acht Gegnerarten. Schleicher und Infanterie
 *  bekommen nichts, weil an ihnen nichts zu kontern ist - Panzerung 1 kostet
 *  den Bogenturm 12 % eines Treffers, das ist keine Ansage wert. */
import { ENEMIES, type EnemyDef, type EnemyId } from './enemies';
import { TOWERS, type TowerDef } from './towers';

/** Schaden je Schuss auf Grundstufe - die Zahl, von der die Panzerung
 *  abzieht. Ausbauten bleiben aussen vor: der Satz kommt, BEVOR der Spieler
 *  ausgebaut hat, und soll ihm sagen, womit er anfangen soll. */
const schadenJeSchuss = (t: TowerDef): number => t.base.damage;

const tuerme = (): TowerDef[] => Object.values(TOWERS);

/** Wer bremst? Aus den Daten, nicht aus dem Namen. */
function bremser(): TowerDef | null {
  return tuerme().find((t) => (t.base.slow ?? 0) > 0) ?? null;
}

/** Die Tuerme, an denen man Schaden misst - also alle ausser der Bremse.
 *
 *  Der Frostturm hat den kleinsten Einzeltreffer im Spiel und waere damit
 *  automatisch "der, an dem Panzerung am meisten verpufft". Das ist zwar
 *  rechnerisch wahr und als Rat trotzdem falsch: er steht nicht da, um zu
 *  toeten. Wer seine Rolle mitzaehlt, misst zwei Dinge auf einmal - dieselbe
 *  Falle wie in Regel 4. Erkannt wird er an `slow`, nicht am Namen. */
function schadenstuerme(): TowerDef[] {
  const br = bremser();
  return tuerme().filter((t) => t !== br);
}
/** Der Turm mit den kleinsten Einzeltreffern - er leidet am meisten unter
 *  Panzerung, weil sie von JEDEM Treffer denselben Betrag abzieht. */
function schnellster(): TowerDef {
  return schadenstuerme().reduce((a, b) => (schadenJeSchuss(b) < schadenJeSchuss(a) ? b : a));
}
/** Der Turm mit den groessten Einzeltreffern - an ihm verpufft am wenigsten. */
function schwerster(): TowerDef {
  return schadenstuerme().reduce((a, b) => (schadenJeSchuss(b) > schadenJeSchuss(a) ? b : a));
}
/** Wer trifft die Luft nicht - und wer schon? */
function nurBoden(): TowerDef[] { return tuerme().filter((t) => !t.hitsAir); }
/** Wer macht Flaechenschaden? */
function flaeche(): TowerDef | null {
  return tuerme().find((t) => (t.base.splash ?? 0) > 0) ?? null;
}

/** Das Mittelmass der Laufgeschwindigkeit ueber alle Gegnerarten.
 *
 *  Ein fester Wert waere die Falle aus Regel 2: zieht die Balance alle
 *  Gegner um ein Drittel schneller, waeren ploetzlich alle "schnell" und
 *  die Ansage bedeutungslos - ohne dass etwas rot wird. */
function mittleresTempo(): number {
  const werte = Object.values(ENEMIES).map((e) => e.speed).sort((a, b) => a - b);
  const m = werte.length >> 1;
  return werte.length % 2 ? werte[m] : (werte[m - 1] + werte[m]) / 2;
}

/** Ein Befund: WAS auffaellt (der Kern), WAS man tut (der Rat), und wie
 *  stark er wiegt.
 *
 *  Getrennt, weil ein Gegner zwei Auffaelligkeiten haben kann: dann werden
 *  die Kerne aufgezaehlt und nur EIN Rat gegeben - der des staerksten
 *  Befunds. Die erste Fassung haengte zwei ganze Saetze aneinander, und der
 *  Leerentitan las sich dadurch wie ein Widerspruch: erst "vom Frostturm
 *  bleibt kaum etwas uebrig", dann "der Frostturm haelt ihn nicht auf". */
interface Befund { staerke: number; kern: string; rat: string; }

/** Alle Befunde zu einer Gegnerart, der wichtigste zuerst.
 *
 *  Die Grenzen sind keine gewaehlten Zahlen, sondern Saetze, die man einem
 *  Spieler vorlesen koennte: "die Bremse verliert mehr als die Haelfte ihrer
 *  Wirkung", "die Panzerung frisst mehr als ein Drittel jedes Treffers",
 *  "anderthalbmal so schnell wie ein durchschnittlicher Gegner". Wo eine
 *  Grenze nur eine Zahl waere, steht keine. */
function befunde(d: EnemyDef): Befund[] {
  const raus: Befund[] = [];

  // 1. Fliegen ist keine Abstufung, sondern eine Sperre: der Moerser
  //    erreicht ihn ueberhaupt nicht. Das schlaegt jede Zahl.
  const blind = nurBoden();
  if (d.flying && blind.length) {
    const alleAnderen = blind.length < tuerme().length - 1;
    raus.push({
      staerke: 100,
      kern: 'fliegt',
      rat: `${blind.map((t) => `Der ${t.name}`).join(' und ')} `
        + `${blind.length > 1 ? 'erreichen' : 'erreicht'} ihn nicht`
        + `${alleAnderen ? ', alle anderen schon.' : '.'}`,
    });
  }

  // 2. Zerfall: wer ihn totschiesst, hat noch nicht aufgeraeumt.
  if (d.split) {
    const teil = ENEMIES[d.split.into];
    const fl = flaeche();
    raus.push({
      staerke: 90,
      kern: `zerfällt beim Tod in ${d.split.count} ${teil.name}`,
      rat: fl
        ? `Der ${fl.name} räumt beides zusammen auf.`
        : 'Halte etwas für danach bereit.',
    });
  }

  // 3. Panzerung zieht von JEDEM Treffer ab. Gemessen wird der Anteil, den
  //    sie dem kleinsten Einzeltreffer nimmt.
  if (d.armor > 0) {
    const s = schnellster(), h = schwerster();
    const verlust = Math.min(1, d.armor / schadenJeSchuss(s));
    if (verlust >= 1 / 3) {
      raus.push({
        staerke: 50 + verlust * 20,
        kern: `Panzerung ${d.armor}`,
        // Ohne Fuerwort: bei zwei Kernen ("Panzerung 6, kaum zu bremsen")
        // wuesste ein "sie" nicht mehr, worauf es zeigt.
        rat: `Der ${s.name} verliert ${Math.round(verlust * 100)} % jedes Treffers, `
          + `der ${h.name} trifft schwer genug.`,
      });
    }
  }

  // 4. Bremsresistenz: die eine Wirkung, die man nicht sieht, bis sie fehlt.
  const br = bremser();
  if (br && d.slowResist > 0.5) {
    raus.push({
      staerke: 40 + d.slowResist * 10,
      kern: 'kaum zu bremsen',
      rat: `Der ${br.name} hält ihn nicht auf — er muss sterben, nicht warten.`,
    });
  }

  // 5. Tempo: kurz in Reichweite. Gemessen am Mittelmass der Gegner, nicht
  //    an einer festen Zahl.
  const mitte = mittleresTempo();
  if (d.speed >= mitte * 1.5) {
    raus.push({
      staerke: 20 + d.speed / mitte,
      // Komma statt Punkt: das Spiel ist deutsch, auch in den Zahlen.
      kern: `${(d.speed / mitte).toFixed(1).replace('.', ',')}-mal so schnell wie `
        + 'der Durchschnitt',
      rat: 'Türme am Anfang der Strecke bekommen mehr Schüsse auf ihn als Türme '
        + 'am Kristall.',
    });
  }

  return raus.sort((a, b) => b.staerke - a.staerke);
}

/** Der eine Satz zu einer Gegnerart - oder nichts.
 *
 *  Aufgezaehlt werden hoechstens ZWEI Kerne, geraten wird genau einmal. Drei
 *  Halbsaetze liest im Aufbau zwischen zwei Wellen niemand; die
 *  Wellenvorschau steht daneben und traegt den Rest. */
export function konterSatz(id: EnemyId): string | null {
  const liste = befunde(ENEMIES[id]);
  if (!liste.length) return null;
  const kerne = liste.slice(0, 2).map((b) => b.kern);
  return `${ENEMIES[id].name}: ${kerne.join(', ')}. ${liste[0].rat}`;
}

/** Alle Gegnerarten, zu denen es etwas zu sagen gibt. Fuer die Tore. */
export function mitKonter(): EnemyId[] {
  return (Object.keys(ENEMIES) as EnemyId[]).filter((id) => konterSatz(id) !== null);
}
