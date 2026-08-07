import type { EnemyId } from '../data/enemies';
import type { TowerId } from '../data/towers';

export interface Enemy {
  id: number;
  def: EnemyId;
  x: number; y: number;
  hp: number; hpMax: number;
  speed: number;
  seg: number;      // Index des aktuellen Pfadsegments
  travelled: number; // Zurueckgelegte Strecke - Basis fuer "vorderstes Ziel"
  slowFactor: number;
  slowLeft: number;
  hitFlash: number;
  dead: boolean;
  leaked: boolean;
}

export interface Tower {
  id: number;
  def: TowerId;
  cx: number; cy: number; // Gitterzelle
  x: number; y: number;   // Weltmitte
  level: number;          // 1..3
  cooldownLeft: number;
  angle: number;
  recoil: number;
  kills: number;
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  target: Enemy | null;
  speed: number;
  damage: number;
  slow: number;
  slowTime: number;
  color: string;
  life: number;
  dead: boolean;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
}

export interface FloatText {
  x: number; y: number;
  text: string;
  color: string;
  life: number;
}

export type Phase = 'title' | 'playing' | 'won' | 'lost';
