import type { EnemyId } from '../data/enemies';
import type { BranchIndex, TowerId } from '../data/towers';

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
  /** Wieviele Treffer der Schild noch schluckt. 0 heisst: keiner mehr. */
  shield: number;
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
  slowFactor: number;
  slowLeft: number;
  hitFlash: number;
  wobble: number;
  dead: boolean;
  leaked: boolean;
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
export type Zielwahl = 'vorn' | 'hinten' | 'stark' | 'nah' | 'schwach';

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
  hinten: 'Hinten',
  stark: 'Voll',
  nah: 'Nah',
  schwach: 'Wund',
};

// ANGEHAENGT, nicht eingeschoben: der Spielstand sichert die Zielwahl als
// INDEX in diese Liste. Wer 'hinten' zwischen 'vorn' und 'stark' schiebt,
// stellt jedem laufenden Spielstand die Tuerme um, ohne dass etwas rot wird.
export const ZIELWAHL_ORDNUNG: Zielwahl[] = ['vorn', 'stark', 'nah', 'schwach', 'hinten'];

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
  abilityUses: Record<string, number>;
  duration: number;
  towersBuilt: number;
  /** Abgefeuerte zielsuchende Geschosse und davon die, die ohne jede
   *  Wirkung verschwunden sind (Ziel im Flug gestorben, kein Ersatz).
   *  Ballistische zaehlen nicht mit: die fliegen auf einen Punkt und
   *  detonieren dort immer. */
  schuesse: number;
  schuesseOhneWirkung: number;
}

export type Phase = 'title' | 'playing' | 'won' | 'lost';
export type Quality = 'hoch' | 'niedrig';
