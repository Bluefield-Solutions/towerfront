import type { EnemyId } from '../data/enemies';
import type { BranchIndex, TowerId } from '../data/towers';
import type { Wirkung } from '../data/wirkungen';

export interface Enemy {
  id: number;
  def: EnemyId;
  x: number; y: number;
  hp: number; hpMax: number;
  speed: number;
  /** Auf welcher Bahn der Gegner laeuft. */
  lane: number;
  /** Blickrichtung, folgt aus der Kurve. */
  heading: number;
  /** Wo auf der Wegbreite dieser Gegner laeuft: -1 linker Rand, +1 rechter.
   *
   *  Ohne das laufen alle exakt auf der Mittellinie und verschmelzen zu einer
   *  Masse - mit uebereinanderliegenden Lebensbalken, an denen man nichts mehr
   *  ablesen kann. Der Wert bleibt ueber die ganze Strecke gleich, deshalb
   *  gehoert er zum Gegner und nicht zur Bewegung. */
  side: number;
  /** Rest bis zum naechsten Heilpuls eines Webers. */
  /** **Welche Turmarten diesen Gegner beschaedigt haben** (v299, S-N3-03).
   *
   *  Ein Bitmuster ueber `TOWER_ORDER`, kein `Set`: bei 320 Gegnern auf dem
   *  Feld waere jedes Set eine eigene Zuweisung je Bild, und der
   *  Determinismus haengt daran, dass hier nichts in wechselnder Reihenfolge
   *  steht. Eine Zahl laesst sich ausserdem speichern, ohne dass der
   *  Spielstand ein neues Format braucht.
   *
   *  Faehigkeiten und Kernschaden zaehlen NICHT mit - sie haben keinen
   *  Turm als Urheber, und die Frage lautet, wieviele TURMARTEN am Gegner
   *  gearbeitet haben. */
  arten: number;
  /** Wieviele Treffer der Schild noch schluckt. 0 heisst: keiner mehr. */
  shield: number;
  /** **Was das Vorzeichen dieser Welle an diesem Gegner geaendert hat**
   *  (S-N6-05). Beide stehen am GEGNER und nicht an seiner Art: dieselbe
   *  Gegnerart laeuft in zwei Wellen mit und ohne Vorzeichen, und ein Wert
   *  an der Art waere fuer beide derselbe.
   *
   *  Zusatzpanzerung, die auf `ENEMIES[def].armor` daraufkommt. */
  panzerPlus: number;
  /** Zusaetzlicher Bremswiderstand, gedeckelt bei 0,95 - ein Gegner, den
   *  keine Bremse mehr erreicht, macht den Frostturm nicht schwaecher,
   *  sondern gegenstandslos. */
  starrPlus: number;
  /** Wieviel Schild dieser Gegner an NACHBARN vergibt. 0 = kein Traeger. */
  traeger: number;
  /** Sekunden bis zur naechsten Vergabe.
   *
   *  Hiess bis v110 `healIn` und war ein totes Feld: nirgends gelesen, nur
   *  angelegt und mitgespeichert. Ein Ueberbleibsel eines Heilers, den es nie
   *  gab. Jetzt traegt es den Takt des Schildtraegers - und heisst danach. */
  auraIn: number;
  /** Stauchen nach einem Treffer: 1 = frisch getroffen, klingt ab.
   *  Aus der Animationslehre - was Kraft abbekommt, verformt sich. */
  squash: number;
  /** Angezeigte Lebenspunkte. Sie laufen dem echten Wert nach, statt zu
   *  springen - eine springende Leiste liest niemand. */
  hpShown: number;
  travelled: number; // Zurueckgelegte Strecke - Basis fuer "vorderstes Ziel"
  /** Was gerade an ihm haengt (TF-015).
   *
   *  `null`, solange nichts anliegt - und das ist der Normalfall. Bei
   *  zweihundert Gegnern im Feld ist ein leeres Feld billiger als
   *  zweihundert leere Listen.
   *
   *  Vorher standen hier `slowFactor` und `slowLeft`: zwei Felder fuer die
   *  einzigen zwei Wirkungen, die es gab. Sie liefen unabhaengig - Staerke
   *  nahm das Minimum, Dauer das Maximum -, und eine starke kurze Bremse
   *  plus eine schwache lange ergab die STARKE fuer die LANGE Dauer. */
  wirkungen: Wirkung[] | null;
  hitFlash: number;
  wobble: number;
  dead: boolean;
  leaked: boolean;
  /** **Der Kernraub** (S-P3-01): wieviele Kristallpunkte dieser Gegner
   *  gerade nach draussen traegt.
   *
   *  `0` ist der Normalfall. Ueber null heisst: er hat den Kristall erreicht,
   *  ist NICHT gestorben, sondern umgekehrt und laeuft seine Bahn rueckwaerts
   *  zum Tor. Erreicht er es, sind die Punkte endgueltig weg.
   *
   *  Bis v261 war ein Durchbruch ein Abzug: Kristall herunter, Ruckeln,
   *  Gegner tot. Ein Abzug ist kein Ereignis - der schlimmste Augenblick des
   *  Spiels war der ereignisloseste. */
  kernraub: number;
  /** **Aus welcher Welle dieser Gegner kommt** (S-P4-01).
   *
   *  Daran haengt dreierlei: die Skalierung seiner Lebenspunkte, die
   *  Verbuchung seines Durchbruchs und das Ende seiner Welle.
   *
   *  Bis v265 hiess dieses Feld `raubWelle` und wurde erst beim Raub
   *  gesetzt - eine zweite Wahrheit ueber dieselbe Sache (Regel 15). Der
   *  Grund war derselbe: ein Raeuber kann in einer spaeteren Welle sterben
   *  als der, in der er gestohlen hat, und die Rueckgabe muss dorthin, wo
   *  der Verlust verbucht wurde. Mit ueberlappenden Wellen gilt das fuer
   *  JEDEN Gegner, nicht nur fuer Raeuber. */
  welle: number;
}

/** Wonach ein Turm sein Ziel aussucht.
 *
 *  Vier Kriterien, und jedes hat eine Aufgabe, die die anderen nicht koennen:
 *
 *   - `vorn`    der am weitesten gelaufene. Der Standard, und der einzig
 *               richtige fuer den letzten Turm vor dem Kristall.
 *   - `stark`   der mit den meisten Lebenspunkten. Fuer Tuerme, die auf
 *               Kolosse warten sollen, statt Schleicher zu erledigen.
 *   - `nah`     der naechste. Haelt die Feuerrate hoch, weil der Turm nicht
 *               quer durch seine Reichweite zielen muss.
 *   - `schwach` der mit den wenigsten Lebenspunkten. Raeumt auf, statt
 *               Schaden an einem Gegner zu verschwenden, den ein anderer
 *               Turm ohnehin gleich erledigt.
 *
 *  Gemessen wird bei `stark` und `schwach` der AKTUELLE Lebensstand, nicht
 *  der volle: der Spieler sieht den Balken ueber dem Gegner, und was er
 *  sieht, muss das sein, wonach der Turm geht. */
export type Zielwahl = 'vorn' | 'stark' | 'nah' | 'schwach';

/** Kurzformen, und zwar aus Platzgruenden mit Mass.
 *
 *  Die Langformen ("Vorderster", "Schwächster") brauchten zwei Zeilen im
 *  Pruefsteg. Gemessen war der Steginhalt danach 284 Punkte hoch bei 238
 *  sichtbaren, und der Ueberlauf stand auf `hidden` - der Verkaufen-Knopf
 *  wurde abgeschnitten. Eine neue Einstellung darf keine alte Handlung
 *  verdraengen.
 *
 *  In v146 wurden "Stark" und "Schwach" zu **"Voll"** und **"Wund"**, und
 *  zwar aus zwei Gruenden zugleich. Der eine ist Platz: mit dem fuenften
 *  Modus teilen sich fuenf Knoepfe eine Reihe von 226 Punkten, also 43 je
 *  Knopf. "Schwach" braucht bei 12 px 54 Punkte und bei 10 px immer noch 45
 *  - es passt bei KEINER vernuenftigen Schriftgroesse hinein, und ein
 *  abgeschnittenes Wort ist kein Knopf.
 *
 *  Der andere Grund ist Genauigkeit, und der ist der wichtigere: gemessen
 *  wird der AKTUELLE Lebensstand, nicht die Gegnerart. "Stark" liest sich
 *  wie "der gefaehrliche Gegnertyp" - gemeint war immer "der mit den
 *  meisten Lebenspunkten gerade jetzt". "Voll" und "Wund" sagen genau das.
 *  Die inneren Namen bleiben `stark`/`schwach`: Spielstaende sichern den
 *  Index, nicht das Wort. */
export const ZIELWAHL_NAMEN: Record<Zielwahl, string> = {
  vorn: 'Vorn',
  // "Gefahr" und nicht mehr "Voll": der Modus nimmt seit v223 nicht den
  // Gegner mit den meisten Lebenspunkten, sondern den gefaehrlichsten - und
  // der gefaehrlichste ist der Schildtraeger, auch wenn er duenn ist.
  stark: 'Gefahr',
  nah: 'Nah',
  schwach: 'Wund',
};

// ANGEHAENGT, nicht eingeschoben: der Spielstand sichert die Zielwahl als
// INDEX in diese Liste. Wer einen Modus zwischen zwei bestehende schiebt,
// stellt jedem laufenden Spielstand die Tuerme um, ohne dass etwas rot wird.
//
// **"Hinten" ist in v237 entfallen, und zwar am Ende der Liste** - der
// einzige Platz, an dem sich ein Modus entfernen laesst, ohne die Indizes
// der uebrigen zu verschieben. Ein alter Spielstand mit Index 4 faellt in
// `state.ts` auf 'vorn' zurueck (`?? 'vorn'`).
//
// Der Grund ist gemessen, nicht geschmacklich: `npm run sim` verlangt von
// jedem Modus, dass er irgendwo eine Welle gewinnt. "Hinten" hatte seinen
// einzigen - geteilten - Sieg auf der dritten Bahn der Ascheschlucht, und
// die war der Fehler, der in v236 aus dem Spiel gemeldet wurde: eine
// Verteidigung fuer eine der drei Bahnen sah von den anderen 35 %. Mit zwei
// gut gedeckten Bahnen stirbt in Reichweite ohnehin jeder, und die
// Reihenfolge entscheidet nichts mehr. Ein Modus, dessen Nutzen an einem
// Kartenfehler hing, verschwindet mit ihm.
export const ZIELWAHL_ORDNUNG: Zielwahl[] = ['vorn', 'stark', 'nah', 'schwach'];

export interface Tower {
  id: number;
  def: TowerId;
  x: number; y: number;   // Weltmitte
  level: number;          // 1..3
  branch: BranchIndex;    // null solange Stufe 1, danach endgueltig
  cooldownLeft: number;
  angle: number;
  recoil: number;
  /** Muendungsblitz, klingt nach dem Schuss ab. */
  flash: number;
  /** Aufbau-Regung: der Turm federt beim Bauen und Ausbauen einmal ein. */
  spring: number;
  pulse: number;          // Sichtbarer Umkreispuls beim Frostturm
  zielwahl: Zielwahl;     // Nach welchem Kriterium dieser Turm auswaehlt
  target: Enemy | null;   // Zwischengespeichertes Ziel
  retargetIn: number;     // Sekunden bis zur naechsten Zielsuche
  kills: number;
  damageDone: number;
  /** **Die Wirkungsbilanz dieses Turms** (v317, S-N4-03).
   *
   *  Die Zahlen gab es schon - als SUMME ueber alle Tuerme, in `stats`, und
   *  damit nur in der Messtafel fuer Entwickler. Die Frage des Spielers ist
   *  aber eine andere: taugt DIESER Moerser hier etwas? Sie stehen deshalb
   *  am Turm.
   *
   *  **Gebucht wird in denselben Zeilen wie die Summe** - nicht an einer
   *  zweiten Stelle, die auseinanderlaufen kann (Regel 15). Der Rauchtest
   *  haelt es nach: die Summe ueber alle Tuerme muss `stats.schuesse` und
   *  `stats.schuesseOhneWirkung` treffen. */
  schuesse: number;
  schuesseOhneWirkung: number;
  /** Treffer, die ein Schild geschluckt hat - ganze Treffer, kein Anteil. */
  vomSchild: number;
  /** Schaden, den Panzerung geschluckt hat - ein Anteil, kein Abzug. */
  vonPanzerung: number;
  /** Sekunden, in denen dieser Turm kein Ziel hatte, obwohl ein FLIEGER in
   *  Reichweite stand. Nur Tuerme ohne Luftziel zaehlen sie; bei den anderen
   *  bleibt sie null, und dann steht die Zeile gar nicht erst da. */
  luftBlind: number;
  /** Was dieser Turm beim Bau WIRKLICH gekostet hat (v286, S-N3-02).
   *
   *  Seit die Wiederholung teurer wird, ist der Grundpreis nicht mehr der
   *  bezahlte. Ohne dieses Feld gaebe der Verkauf 70 % des GRUNDpreises
   *  zurueck - der vierte Bogenturm kostete dann 110 und braechte 38, und
   *  ein Fehlkauf waere teurer als die Wiederholung selbst. Bestraft werden
   *  soll das Haeufen, nicht das Berichtigen. */
  bezahlt: number;
}

export type ProjectileKind = 'homing' | 'ballistic';

export interface Projectile {
  kind: ProjectileKind;
  x: number; y: number;
  sx: number; sy: number;  // Startpunkt (fuer die Wurfbahn)
  tx: number; ty: number;  // Zielpunkt bei ballistisch
  target: Enemy | null;    // Ziel bei zielsuchend
  /** Flugrichtung, normiert. Nur bei zielsuchend gefuehrt - sie ist die
   *  Achse des Kegels, in dem ein Ersatzziel gesucht wird, wenn das
   *  eigentliche Ziel im Flug stirbt. */
  dirX: number; dirY: number;
  /** Anfangsversatz zur Muendung und wie stark er noch wirkt (1 bis 0).
   *
   *  Er gehoert zur ZEICHNUNG, nicht zur Flugbahn. Die Karte ist in
   *  Dreiviertelansicht gemalt: die Muendung liegt hundert Bildpunkte ueber
   *  dem Turmfuss, steht aber auf demselben Fleck. Als Strecke mitgerechnet
   *  waere jeder Schuss laenger unterwegs, und der Moerser schluege hinter
   *  der Traube ein - gemessen ein Fuenftel weniger Punkte in `npm run sim`.
   *  Also fliegt das Geschoss auf der Karte wie eh und je, und was man
   *  SIEHT, kommt aus dem Rohr und sinkt binnen einer Zehntelsekunde auf die
   *  Bodenebene. Genau das tut ein Geschoss in dieser Ansicht auch. */
  ox: number; oy: number; oT: number;
  /** Ob der Schuetze Luftziele trifft. Steht am Geschoss und nicht am Turm,
   *  weil der Turm verkauft sein kann, waehrend sein Schuss noch fliegt. */
  luft: boolean;
  owner: Tower | null;
  speed: number;
  damage: number;
  slow: number;
  slowTime: number;
  splash: number;
  pierce: number;
  color: string;
  t: number;               // 0..1 Fortschritt bei ballistisch
  dur: number;
  life: number;
  dead: boolean;
}

/** Kettenblitz: nur Darstellung, der Schaden faellt sofort an. */
export interface Bolt {
  pts: { x: number; y: number }[];
  color: string;
  life: number;
  maxLife: number;
}

/** Die Huelle eines gefallenen Gegners: sie kippt, schrumpft und verblasst.
 *  Vorher verschwand ein Gegner ohne Uebergang - der Treffer hatte kein Ende. */
export interface Husk {
  def: EnemyId;
  x: number; y: number;
  alt: number;
  angle: number;
  spin: number;
  frame: number;
  t: number; dur: number;
}

export interface Ring {
  x: number; y: number;
  r: number; rMax: number;
  /** Startradius. Null heisst Druckwelle (von innen nach aussen), ein Wert
   *  nahe rMax heisst Grenze: der Ring steht praktisch still und zeigt eine
   *  Flaeche an, statt einen Stoss. */
  rMin: number;
  color: string;
  life: number; maxLife: number;
  width: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  gravity: number;
  /** Groessenaenderung je Sekunde - Rauch waechst, Funken bleiben. */
  grow: number;
}

export interface FloatText {
  x: number; y: number;
  text: string;
  color: string;
  life: number;
  size: number;
}

/** Ein anfliegender Meteor. Die kurze Verzoegerung macht den Einschlag
 *  sichtbar - ohne sie waere die Faehigkeit ein unsichtbarer Zahlenabzug. */
export interface Meteor {
  x: number; y: number;
  t: number;      // 0..1
  dur: number;
  radius: number;
  damage: number;
}

/** Mitgeschriebene Zahlen einer Partie. Sie kosten fast nichts - die Tuerme
 *  fuehrten Abschuesse und Schaden ohnehin schon - und ergeben am Ende eine
 *  Auswertung, die zeigt, was tatsaechlich getragen hat. */
export interface RunStats {
  goldEarned: number;
  goldSpent: number;
  damage: number;
  /** Schaden nach Quelle: Turmart oder 'meteor'. */
  damageBy: Record<string, number>;
  kills: number;
  /** Kristallverlust je Welle, Index = Wellennummer minus eins. */
  leaksByWave: number[];
  /** Angerichteter Schaden je Welle, Index = Wellennummer minus eins.
   *
   *  Die Summe ist `damage`, aber die Summe sagt nur, WIEVIEL - nicht,
   *  WANN es eng wurde. Genau danach sucht man zwischen zwei Wellen: eine
   *  Welle, in der die Tuerme kaum Schaden gemacht haben, war eine, gegen
   *  die die Aufstellung nicht passte (D13). */
  damageByWave: number[];
  abilityUses: Record<string, number>;
  duration: number;
  towersBuilt: number;
  /** Abgefeuerte zielsuchende Geschosse und davon die, die ohne jede
   *  Wirkung verschwunden sind (Ziel im Flug gestorben, kein Ersatz).
   *  Ballistische zaehlen nicht mit: die fliegen auf einen Punkt und
   *  detonieren dort immer. */
  /** **Wieviele Turmarten die getoeteten Gegner beschaedigt haben** (v299).
   *
   *  Ein Eimer je Zahl: `artenJeKill[2]` ist die Zahl der Gegner, an denen
   *  genau zwei Turmarten gearbeitet haben. Gemessen wird es, BEVOR
   *  entschieden ist, was Vielfalt einbringen soll - eine Beuteregel fuer
   *  einen Fall, den es kaum gibt, waere Buchhaltung (Regel 9). */
  artenJeKill: number[];
  schuesse: number;
  schuesseOhneWirkung: number;
}

export type Phase = 'title' | 'playing' | 'won' | 'lost';
export type Quality = 'hoch' | 'niedrig';
