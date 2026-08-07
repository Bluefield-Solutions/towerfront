import { COLS, ROWS, TILE, START_GOLD, START_LIVES, C } from '../data/config';
import { ENEMIES } from '../data/enemies';
import { TOWERS, sellValue, type TowerId } from '../data/towers';
import { WAVES, WAVE_HP_RAMP } from '../data/waves';
import { MAP_SPIRALHAIN, cellCenter, cellKey, pathCells, pathPoints } from '../data/maps';
import type { Vec } from '../core/math';
import { dist, dist2 } from '../core/math';
import type { Enemy, FloatText, Particle, Phase, Projectile, Tower } from './types';

interface PendingSpawn { time: number; enemy: keyof typeof ENEMIES; hpMul: number; }

export class GameState {
  readonly map = MAP_SPIRALHAIN;
  readonly points: Vec[] = pathPoints(this.map);
  readonly pathSet = new Set<number>();
  readonly blockedSet = new Set<number>();
  readonly goal: Vec;

  phase: Phase = 'title';
  gold = START_GOLD;
  lives = START_LIVES;
  waveIndex = 0;         // 0-basiert, naechste zu startende Welle
  waveActive = false;
  speed = 1;
  paused = false;

  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  floats: FloatText[] = [];

  /** Auswahl im UI */
  buildChoice: TowerId | null = null;
  selectedTower: Tower | null = null;
  hoverCell: Vec | null = null;

  crystalPulse = 0;
  crystalHit = 0;
  shake = 0;
  time = 0;

  private pending: PendingSpawn[] = [];
  private waveTime = 0;
  private nextId = 1;
  private towerAt = new Map<number, Tower>();

  constructor() {
    for (const c of pathCells(this.map)) this.pathSet.add(cellKey(c.x, c.y));
    for (const b of this.map.blocked) this.blockedSet.add(cellKey(b.x, b.y));
    const last = this.map.waypoints[this.map.waypoints.length - 1];
    this.goal = cellCenter(last.x, last.y);
  }

  // ---------------------------------------------------------------- Bauen

  canBuild(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
    const k = cellKey(cx, cy);
    return !this.pathSet.has(k) && !this.blockedSet.has(k) && !this.towerAt.has(k);
  }

  towerOn(cx: number, cy: number): Tower | undefined {
    return this.towerAt.get(cellKey(cx, cy));
  }

  build(cx: number, cy: number, id: TowerId): boolean {
    const def = TOWERS[id];
    if (!this.canBuild(cx, cy) || this.gold < def.levels[0].cost) return false;
    this.gold -= def.levels[0].cost;
    const c = cellCenter(cx, cy);
    const t: Tower = {
      id: this.nextId++, def: id, cx, cy, x: c.x, y: c.y,
      level: 1, cooldownLeft: 0, angle: -Math.PI / 2, recoil: 0, kills: 0,
    };
    this.towers.push(t);
    this.towerAt.set(cellKey(cx, cy), t);
    this.spawnRing(c.x, c.y, def.accent, 10);
    return true;
  }

  upgrade(t: Tower): boolean {
    const def = TOWERS[t.def];
    if (t.level >= def.levels.length) return false;
    const cost = def.levels[t.level].cost;
    if (this.gold < cost) return false;
    this.gold -= cost;
    t.level++;
    this.spawnRing(t.x, t.y, def.accent, 14);
    return true;
  }

  sell(t: Tower): void {
    const def = TOWERS[t.def];
    const value = sellValue(def, t.level);
    this.gold += value;
    this.towers = this.towers.filter((o) => o !== t);
    this.towerAt.delete(cellKey(t.cx, t.cy));
    if (this.selectedTower === t) this.selectedTower = null;
    this.float(t.x, t.y - 10, `+${value}`, C.gold);
    this.spawnRing(t.x, t.y, C.stoneDark, 8);
  }

  stats(t: Tower) { return TOWERS[t.def].levels[t.level - 1]; }

  // ---------------------------------------------------------------- Wellen

  get waveNumber(): number { return Math.min(this.waveIndex + 1, WAVES.length); }
  get totalWaves(): number { return WAVES.length; }
  get canStartWave(): boolean { return !this.waveActive && this.waveIndex < WAVES.length; }

  startWave(): void {
    if (!this.canStartWave) return;
    const wave = WAVES[this.waveIndex];
    this.pending = [];
    for (const g of wave.groups) {
      for (let i = 0; i < g.count; i++) {
        this.pending.push({ time: g.delay + i * g.gap, enemy: g.enemy, hpMul: g.hpMul ?? 1 });
      }
    }
    this.pending.sort((a, b) => a.time - b.time);
    this.waveTime = 0;
    this.waveActive = true;
  }

  private finishWave(): void {
    const wave = WAVES[this.waveIndex];
    this.gold += wave.bonus;
    this.float(this.goal.x, this.goal.y - 50, `Welle geschafft  +${wave.bonus}`, C.gold);
    this.waveIndex++;
    this.waveActive = false;
    if (this.waveIndex >= WAVES.length) this.phase = 'won';
  }

  // ---------------------------------------------------------------- Update

  update(dtReal: number): void {
    if (this.phase !== 'playing' || this.paused) {
      this.time += dtReal;
      this.crystalPulse += dtReal;
      this.decayFx(dtReal);
      return;
    }
    const dt = dtReal * this.speed;
    this.time += dt;
    this.crystalPulse += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dtReal * 3);
    if (this.crystalHit > 0) this.crystalHit = Math.max(0, this.crystalHit - dtReal * 2);

    if (this.waveActive) {
      this.waveTime += dt;
      while (this.pending.length && this.pending[0].time <= this.waveTime) {
        const p = this.pending.shift()!;
        this.spawnEnemy(p.enemy, p.hpMul);
      }
      if (!this.pending.length && !this.enemies.length) this.finishWave();
    }

    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.decayFx(dt);

    if (this.lives <= 0) { this.lives = 0; this.phase = 'lost'; }
  }

  private spawnEnemy(id: keyof typeof ENEMIES, hpMul: number): void {
    const def = ENEMIES[id];
    const p0 = this.points[0];
    const ramp = 1 + this.waveIndex * WAVE_HP_RAMP;
    const hp = Math.round(def.hp * hpMul * ramp);
    this.enemies.push({
      id: this.nextId++, def: id, x: p0.x, y: p0.y,
      hp, hpMax: hp, speed: def.speed, seg: 0, travelled: 0,
      slowFactor: 1, slowLeft: 0, hitFlash: 0, dead: false, leaked: false,
    });
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (e.slowLeft > 0) {
        e.slowLeft -= dt;
        if (e.slowLeft <= 0) e.slowFactor = 1;
      }
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 5);

      let move = e.speed * e.slowFactor * dt;
      while (move > 0 && e.seg < this.points.length - 1) {
        const to = this.points[e.seg + 1];
        const d = dist(e.x, e.y, to.x, to.y);
        if (d <= move) {
          e.x = to.x; e.y = to.y; e.travelled += d; move -= d; e.seg++;
        } else {
          const k = move / d;
          e.x += (to.x - e.x) * k;
          e.y += (to.y - e.y) * k;
          e.travelled += move;
          move = 0;
        }
      }
      if (e.seg >= this.points.length - 1) {
        e.leaked = true; e.dead = true;
        const def = ENEMIES[e.def];
        this.lives -= def.leak;
        this.crystalHit = 1;
        this.shake = Math.min(1, this.shake + 0.5);
        this.float(this.goal.x, this.goal.y - 40, `-${def.leak}`, C.danger);
        this.spawnRing(this.goal.x, this.goal.y, C.danger, 14);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      const def = TOWERS[t.def];
      const st = this.stats(t);
      if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 6);
      t.cooldownLeft -= dt;

      const target = this.findTarget(t.x, t.y, st.range);
      if (target) {
        const want = Math.atan2(target.y - t.y, target.x - t.x);
        let diff = want - t.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        t.angle += diff * Math.min(1, dt * 12);
        if (t.cooldownLeft <= 0) {
          t.cooldownLeft = st.cooldown;
          t.recoil = 1;
          this.projectiles.push({
            x: t.x, y: t.y, vx: 0, vy: 0, target,
            speed: def.projectileSpeed, damage: st.damage,
            slow: st.slow ?? 0, slowTime: st.slowTime ?? 0,
            color: def.accent, life: 2.5, dead: false,
          });
        }
      }
    }
  }

  /** Vorderstes Ziel in Reichweite - Standardstrategie in Tower Defense. */
  private findTarget(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    const r2 = range * range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2(x, y, e.x, e.y) > r2) continue;
      if (!best || e.travelled > best.travelled) best = e;
    }
    return best;
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.life <= 0) { p.dead = true; continue; }
      const tgt = p.target && !p.target.dead ? p.target : null;
      if (!tgt) { p.dead = true; continue; }
      const dx = tgt.x - p.x, dy = tgt.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = p.speed * dt;
      if (d <= step + ENEMIES[tgt.def].radius * 0.6) {
        this.hit(tgt, p);
        p.dead = true;
      } else {
        p.vx = (dx / d) * p.speed;
        p.vy = (dy / d) * p.speed;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  private hit(e: Enemy, p: Projectile): void {
    const def = ENEMIES[e.def];
    const dmg = Math.max(1, p.damage - def.armor);
    e.hp -= dmg;
    e.hitFlash = 1;
    if (p.slow > 0) {
      e.slowFactor = Math.min(e.slowFactor, 1 - p.slow);
      e.slowLeft = Math.max(e.slowLeft, p.slowTime);
    }
    this.spark(e.x, e.y, p.color, 3);
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.gold += def.bounty;
      this.float(e.x, e.y - 12, `+${def.bounty}`, C.gold);
      this.spark(e.x, e.y, def.body, 12);
    }
  }

  // ---------------------------------------------------------------- Effekte

  private decayFx(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floats) { f.life -= dt; f.y -= 26 * dt; }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  float(x: number, y: number, text: string, color: string): void {
    this.floats.push({ x, y, text, color, life: 1.1 });
  }

  spark(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.3, maxLife: 0.65,
        size: 2 + Math.random() * 3, color,
      });
    }
  }

  private spawnRing(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.particles.push({
        x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90,
        life: 0.4, maxLife: 0.4, size: 3, color,
      });
    }
  }

  // ---------------------------------------------------------------- Steuerung

  reset(): void {
    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.waveIndex = 0;
    this.waveActive = false;
    this.enemies = []; this.towers = []; this.projectiles = [];
    this.particles = []; this.floats = [];
    this.towerAt.clear();
    this.pending = [];
    this.selectedTower = null;
    this.buildChoice = null;
    this.speed = 1;
    this.paused = false;
    this.phase = 'playing';
  }

  worldToCell(wx: number, wy: number): Vec {
    return { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
  }
}
