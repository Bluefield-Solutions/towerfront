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
  healIn: number;
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
export type Zielwahl = 'vorn' | 'stark' | 'nah' | 'schwach';

/** Kurzformen, und zwar aus Platzgruenden mit Mass.
 *
 *  Die Langformen ("Vorderster", "Schwächster") brauchten zwei Zeilen im
 *  Pruefsteg. Gemessen war der Steginhalt danach 284 Punkte hoch bei 238
 *  sichtbaren, und der Ueberlauf stand auf `hidden` - der Verkaufen-Knopf
 *  wurde abgeschnitten. Eine neue Einstellung darf keine alte Handlung
 *  verdraengen. */
export const ZIELWAHL_NAMEN: Record<Zielwahl, string> = {
  vorn: 'Vorn',
  stark: 'Stark',
  nah: 'Nah',
  schwach: 'Schwach',
};

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
}

export type ProjectileKind = 'homing' | 'ballistic';

export interface Projectile {
  kind: ProjectileKind;
  x: number; y: number;
  sx: number; sy: number;  // Startpunkt (fuer die Wurfbahn)
  tx: number; ty: number;  // Zielpunkt bei ballistisch
  target: Enemy | null;    // Ziel bei zielsuchend
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
}

export type Phase = 'title' | 'playing' | 'won' | 'lost';
export type Quality = 'hoch' | 'niedrig';
