/** Welche Bilder das Spiel erwartet - und welche davon noch fehlen.
 *
 *  **Warum es das braucht** (S-N0-05): bis v272 war ein fehlendes Bild
 *  unsichtbar. Jedes der vier Bildmodule faellt bei einem fehlenden Eintrag
 *  auf `null` zurueck, der Renderer zeichnet dann seine eigene Form, und die
 *  sieht ordentlich aus. Kein Tor hat je gefragt, ob der Vorrat vollstaendig
 *  ist - es gab gar keine Stelle, an der stuende, was vollstaendig HEISST.
 *
 *  Der Neubau macht mittelfristig den ganzen Bildvorrat neu. Wartet die Kette
 *  auf Bilder, steht sie; wartet sie nicht, liefert sie stillschweigend
 *  Luecken aus. Beides ist schlecht, und beides faellt weg, wenn die Luecke
 *  einen Namen hat.
 *
 *  **Das Register ist nicht die Messung, sondern die Bestellung.** Was im
 *  BILD steckt, misst `npm run bildtor` an der Marke des Platzhalters
 *  (`PLATZHALTER_FARBE`). Hier steht, was ueberhaupt erwartet wird - und
 *  zwar abgeleitet aus den Daten, nicht als zweite Liste daneben (Regel 15):
 *  kommt eine Gegnerart oder eine Karte dazu, wandert die Bestellung von
 *  selbst mit.
 *
 *  **Nicht zu verwechseln mit `Renderer.fehlendeBilder`**, und der Unterschied
 *  ist der ganze Grund fuer diese Datei. Jenes fragt zur LAUFZEIT: ist dieses
 *  Bild gerade dekodiert? Es kennt drei Antworten - fertig, noch nicht
 *  fertig, kann hier gar nicht fertig werden (kein Dekoder). Hier steht die
 *  vierte, die es dort nicht gibt: **gar nicht erst bestellt.** Beide leiten
 *  ihre Erwartung aus denselben Daten ab (`ENEMIES`, `MAPS`, `TOWER_ORDER`);
 *  keine der beiden ist eine von Hand gepflegte Kopie der anderen. */
import { ENEMIES, type EnemyId } from '../data/enemies';
import { MAPS } from '../data/maps';
import { TOWER_ORDER } from '../data/towers';
import { ENEMY_ART } from './assets/enemies';
import { MAP_BACKGROUNDS } from './assets/backgrounds';
import { OBJECT_ART } from './assets/objects';
import { TOWER_ART } from './assets/towers';

export interface Bestellung {
  /** Wofuer - `gegner`, `turm`, `karte` oder `gegenstand`. */
  art: 'gegner' | 'turm' | 'karte' | 'gegenstand';
  /** Der Schluessel, unter dem das Spiel das Bild sucht. */
  schluessel: string;
}

/** Gegenstaende, ohne die das Spiel nicht auskommt.
 *
 *  Die einzige Liste hier, die von Hand steht - und sie steht von Hand, weil
 *  es keine Datenquelle dafuer gibt: `gate` und `crystal` sind zwei Dinge,
 *  die jede Karte hat, ohne dass eine Datei sie aufzaehlt. Die Turmsockel
 *  und -waffen stehen NICHT darin: welche davon gebraucht werden, sagt
 *  `TOWERS` (siehe unten). */
const PFLICHT_GEGENSTAENDE = ['gate', 'crystal'];

/** Alle Bilder, die das Spiel im Lauf einer Partie anfragt. */
export function erwarteteBilder(): Bestellung[] {
  const aus: Bestellung[] = [];
  for (const id of Object.keys(ENEMIES) as EnemyId[]) {
    aus.push({ art: 'gegner', schluessel: id });
  }
  for (const m of MAPS) aus.push({ art: 'karte', schluessel: m.id });
  for (const s of PFLICHT_GEGENSTAENDE) aus.push({ art: 'gegenstand', schluessel: s });
  // Je KAUFBAREM Turm ein Bild auf der ersten Stufe - mehr ist Kuer.
  //
  // `TOWER_ORDER`, nicht `TOWERS`: die Zielunit `core` steht in `TOWERS`,
  // hat aber ausdruecklich kein Turmbild - sie wird als Kristall gezeichnet,
  // und der steht als Pflichtgegenstand ohnehin schon auf der Liste. Der
  // erste Entwurf nahm `TOWERS` und meldete prompt `core_1_1` als offene
  // Bestellung. Nachgesehen im Renderer: `if (t.def === 'core') continue`,
  // mit dem Satz daneben, dass die Zielunit kein Turmbild hat. Eine
  // Bestellung, die niemand aufgeben will, ist keine Luecke.
  //
  // Die Stufen zwei bis sechs sind aus demselben Grund nicht Pflicht:
  // `towerart` faellt gezielt auf die naechstniedrigere Stufe zurueck, und
  // dieser Rueckfall ist eine ENTSCHEIDUNG. Wer ihn als Luecke fuehrte,
  // meldete auf Dauer zwei Dutzend offene Bestellungen - und eine Meldung,
  // die immer dasteht, wird ueberlesen.
  for (const id of TOWER_ORDER) {
    aus.push({ art: 'turm', schluessel: `${id}_1_1` });
  }
  return aus;
}

/** Ob es fuer eine Bestellung ein Bild im Vorrat gibt.
 *
 *  Der Turm ist der einzige Fall mit zwei moeglichen Ablagen: die vier Tuerme
 *  liegen teils in `towers.ts`, teils als Sockel und Waffe in `objects.ts`.
 *  Beides ist ein geliefertes Bild - wer nur eine Ablage fragte, meldete den
 *  Bogenturm als fehlend, obwohl er im Spiel steht. */
export function istGeliefert(b: Bestellung): boolean {
  switch (b.art) {
    case 'gegner': return !!ENEMY_ART[b.schluessel as EnemyId];
    case 'karte': return !!MAP_BACKGROUNDS[b.schluessel];
    case 'gegenstand': return !!(OBJECT_ART as Record<string, string>)[b.schluessel];
    case 'turm': {
      const id = b.schluessel.split('_')[0];
      return !!(TOWER_ART as Record<string, string>)[b.schluessel]
        || !!(OBJECT_ART as Record<string, string>)[`sockel_${id}`]
        || !!(OBJECT_ART as Record<string, string>)[`sockel_${id}_1`];
    }
    default: return false;
  }
}

/** Was noch fehlt. Leer heisst: der Vorrat ist vollstaendig. */
export function offeneBestellungen(): Bestellung[] {
  return erwarteteBilder().filter((b) => !istGeliefert(b));
}
