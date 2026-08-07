import type { EnemyId } from '../data/enemies';
import type { BranchIndex, TowerId } from '../data/towers';

export interface Enemy {
  id: number;
  def: EnemyId;
  x: number; y: number;
  hp: number; hpMax: number;
  speed: number;
  seg: number;       // Index des aktuellen Pfadsegments
  travelled: number; // Zurueckgelegte Strecke - Basis fuer "vorderstes Ziel"
  slowFactor: number;
  slowLeft: number;
  hitFlash: number;
  wobble: number;
  dead: boolean;
  leaked: boolean;
}

export interface Tower {
  id: number;
  def: TowerId;
  cx: number; cy: number; // Gitterzelle
  x: number; y: number;   // Weltmitte
  level: number;          // 1..3
  branch: BranchIndex;    // null solange Stufe 1, danach endgueltig
  cooldownLeft: number;
  angle: number;
  recoil: number;
  pulse: number;          // Sichtbarer Umkreispuls beim Frostturm
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
