import { COLS, ROWS, TILE, START_GOLD, START_LIVES, C } from '../data/config';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { TOWERS, sellValue, type TowerId } from '../data/towers';
import { WAVES, WAVE_HP_RAMP, EARLY_BONUS_MAX, EARLY_BONUS_WINDOW } from '../data/waves';
import { MAP_SPIRALHAIN, cellCenter, cellKey, pathCells, pathPoints } from '../data/maps';
import type { Vec } from '../core/math';
import { dist, dist2 } from '../core/math';
import { Sfx } from '../core/audio';
import { recordRun } from '../core/storage';
import type {
  Bolt, Enemy, FloatText, Particle, Phase, Projectile, Quality, Ring, Tower,
} from './types';

interface PendingSpawn { time: number; enemy: EnemyId; hpMul: number; }

export class GameState {
  readonly map = MAP_SPIRALHAIN;
  readonly points: Vec[] = pathPoints(this.map);
  readonly pathSet = new Set<number>();
  readonly blockedSet = new Set<number>();
  readonly goal: Vec;

  phase: Phase = 'title';
  gold = START_GOLD;
  lives = START_LIVES;
  waveIndex = 0;
  waveActive = false;
  speed = 1;
  paused = false;
  quality: Quality = 'hoch';

  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  bolts: Bolt[] = [];
  rings: Ring[] = [];
  particles: Particle[] = [];
  floats: FloatText[] = [];

  buildChoice: TowerId | null = null;
  selectedTower: Tower | null = null;
  hoverCell: Vec | null = null;
  /** Zelle unter dem gedrueckten Finger. Gebaut wird erst beim Loslassen. */
  pendingCell: Vec | null = null;

  crystalPulse = 0;
  crystalHit = 0;
  shake = 0;
  time = 0;
  hitstop = 0;
  idleTime = 0;      // Sekunden seit Ende der letzten Welle
  leakedTotal = 0;

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
      level: 1, cooldownLeft: 0, angle: -Math.PI / 2, recoil: 0, pulse: 0,
      kills: 0, damageDone: 0,
    };
    this.towers.push(t);
    this.towerAt.set(cellKey(cx, cy), t);
    this.ring(c.x, c.y, 54, def.accent, 0.4, 3);
    Sfx.play('build');
    return true;
  }

  upgrade(t: Tower): boolean {
    const def = TOWERS[t.def];
    if (t.level >= def.levels.length) return false;
    const cost = def.levels[t.level].cost;
    if (this.gold < cost) return false;
    this.gold -= cost;
    t.level++;
    this.ring(t.x, t.y, 66, def.accent, 0.45, 4);
    Sfx.play('upgrade');
    return true;
  }

  sell(t: Tower): void {
    const def = TOWERS[t.def];
    const value = sellValue(def, t.level);
    this.gold += value;
    this.towers = this.towers.filter((o) => o !== t);
    this.towerAt.delete(cellKey(t.cx, t.cy));
    if (this.selectedTower === t) this.selectedTower = null;
    this.float(t.x, t.y - 10, `+${value}`, C.gold, 22);
    this.ring(t.x, t.y, 48, C.stoneDark, 0.35, 2);
    Sfx.play('sell');
  }

  stats(t: Tower) { return TOWERS[t.def].levels[t.level - 1]; }

  // ---------------------------------------------------------------- Wellen

  get waveNumber(): number { return Math.min(this.waveIndex + 1, WAVES.length); }
  get totalWaves(): number { return WAVES.length; }
  get canStartWave(): boolean { return !this.waveActive && this.waveIndex < WAVES.length; }
  get nextWave() { return WAVES[this.waveIndex]; }

  /** Gold fuer einen frueh gestarteten Angriff. Faellt linear auf null. */
  get earlyBonus(): number {
    if (!this.canStartWave || this.waveIndex === 0) return 0;
    const left = Math.max(0, EARLY_BONUS_WINDOW - this.idleTime);
    return Math.round((left / EARLY_BONUS_WINDOW) * EARLY_BONUS_MAX);
  }

  startWave(): void {
    if (!this.canStartWave) return;
    const bonus = this.earlyBonus;
    if (bonus > 0) {
      this.gold += bonus;
      this.float(this.goal.x, this.goal.y - 70, `Frueh gestartet  +${bonus}`, C.gold, 22);
    }
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
    this.idleTime = 0;
    Sfx.play('wave');
  }

  private finishWave(): void {
    const wave = WAVES[this.waveIndex];
    this.gold += wave.bonus;
    this.float(this.goal.x, this.goal.y - 56, `Welle geschafft  +${wave.bonus}`, C.gold, 26);
    this.waveIndex++;
    this.waveActive = false;
    this.idleTime = 0;
    if (this.waveIndex >= WAVES.length) {
      this.phase = 'won';
      recordRun(WAVES.length, this.lives);
      Sfx.play('win');
    }
  }

  // ---------------------------------------------------------------- Update

  update(dtReal: number): void {
    Sfx.frame();
    if (this.phase !== 'playing' || this.paused) {
      this.time += dtReal;
      this.crystalPulse += dtReal;
      this.decayFx(dtReal);
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop -= dtReal;
      this.decayFx(dtReal * 0.25);
      return;
    }

    const dt = dtReal * this.speed;
    this.time += dt;
    this.crystalPulse += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dtReal * 3);
    if (this.crystalHit > 0) this.crystalHit = Math.max(0, this.crystalHit - dtReal * 2);
    if (!this.waveActive) this.idleTime += dtReal;

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

    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = 'lost';
      recordRun(this.waveNumber - 1, 0);
      Sfx.play('lose');
    }
  }

  private spawnEnemy(id: EnemyId, hpMul: number): void {
    const def = ENEMIES[id];
    const p0 = this.points[0];
    const ramp = 1 + this.waveIndex * WAVE_HP_RAMP;
    const hp = Math.round(def.hp * hpMul * ramp);
    this.enemies.push({
      id: this.nextId++, def: id, x: p0.x, y: p0.y,
      hp, hpMax: hp, speed: def.speed, seg: 0, travelled: 0,
      slowFactor: 1, slowLeft: 0, hitFlash: 0, wobble: Math.random() * 9,
      dead: false, leaked: false,
    });
  }

  private updateEnemies(dt: number): void {
    let leaked = false;
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
        this.leakedTotal++;
        this.crystalHit = 1;
        this.shake = Math.min(1, this.shake + 0.55);
        this.float(this.goal.x, this.goal.y - 44, `-${def.leak}`, C.danger, 28);
        this.ring(this.goal.x, this.goal.y, 120, C.danger, 0.5, 5);
        leaked = true;
      }
    }
    if (leaked) Sfx.play('leak');
    if (this.enemies.some((e) => e.dead)) {
      this.enemies = this.enemies.filter((e) => !e.dead);
    }
  }

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      const def = TOWERS[t.def];
      const st = this.stats(t);
      if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 6);
      if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 2.2);
      t.cooldownLeft -= dt;

      if (def.attack === 'aura') {
        if (t.cooldownLeft > 0) continue;
        const targets = this.enemiesInRange(t.x, t.y, st.range);
        if (!targets.length) continue;
        t.cooldownLeft = st.cooldown;
        t.pulse = 1;
        this.ring(t.x, t.y, st.range, def.accent, 0.45, 3);
        Sfx.play('frost');
        for (const e of targets) this.damage(e, st.damage, t, def.accent, st.slow ?? 0, st.slowTime ?? 0);
        continue;
      }

      const target = this.findTarget(t.x, t.y, st.range);
      if (!target) continue;

      const aim = def.attack === 'splash'
        ? this.predict(target, dist(t.x, t.y, target.x, target.y) / def.projectileSpeed)
        : { x: target.x, y: target.y };

      const want = Math.atan2(aim.y - t.y, aim.x - t.x);
      let diff = want - t.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.angle += diff * Math.min(1, dt * 12);
      if (t.cooldownLeft > 0) continue;
      t.cooldownLeft = st.cooldown;
      t.recoil = 1;

      if (def.attack === 'single') {
        Sfx.play('arrow');
        this.projectiles.push(this.makeProjectile('homing', t, target, aim, st, def.accent, def.projectileSpeed));
      } else if (def.attack === 'splash') {
        Sfx.play('mortar');
        this.projectiles.push(this.makeProjectile('ballistic', t, null, aim, st, def.accent, def.projectileSpeed));
      } else {
        Sfx.play('prism');
        this.chain(t, target, st.damage, st.chains ?? 0, st.falloff ?? 0.6, st.range, def.accent);
      }
    }
  }

  private makeProjectile(
    kind: 'homing' | 'ballistic', t: Tower, target: Enemy | null,
    aim: Vec, st: { damage: number; slow?: number; slowTime?: number; splash?: number },
    color: string, speed: number,
  ): Projectile {
    const d = dist(t.x, t.y, aim.x, aim.y);
    return {
      kind, x: t.x, y: t.y, sx: t.x, sy: t.y, tx: aim.x, ty: aim.y,
      target, owner: t, speed, damage: st.damage,
      slow: st.slow ?? 0, slowTime: st.slowTime ?? 0, splash: st.splash ?? 0,
      color, t: 0, dur: Math.max(0.12, d / speed), life: 3, dead: false,
    };
  }

  /** Vorhalten: wohin laeuft der Gegner in der Flugzeit des Geschosses. */
  private predict(e: Enemy, flight: number): Vec {
    let x = e.x, y = e.y, seg = e.seg;
    let move = e.speed * e.slowFactor * flight;
    while (move > 0 && seg < this.points.length - 1) {
      const to = this.points[seg + 1];
      const d = dist(x, y, to.x, to.y);
      if (d <= move) { x = to.x; y = to.y; move -= d; seg++; }
      else { const k = move / d; x += (to.x - x) * k; y += (to.y - y) * k; move = 0; }
    }
    return { x, y };
  }

  private chain(
    t: Tower, first: Enemy, damage: number, jumps: number,
    falloff: number, range: number, color: string,
  ): void {
    const pts: Vec[] = [{ x: t.x, y: t.y }];
    const seen = new Set<number>();
    let cur: Enemy | null = first;
    let dmg = damage;
    const jumpRange = range * 0.62;
    for (let i = 0; i <= jumps && cur; i++) {
      seen.add(cur.id);
      pts.push({ x: cur.x, y: cur.y });
      this.damage(cur, dmg, t, color, 0, 0);
      dmg *= falloff;
      let next: Enemy | null = null;
      let bestD = jumpRange * jumpRange;
      for (const e of this.enemies) {
        if (e.dead || seen.has(e.id)) continue;
        const d = dist2(cur.x, cur.y, e.x, e.y);
        if (d < bestD) { bestD = d; next = e; }
      }
      cur = next;
    }
    this.bolts.push({ pts, color, life: 0.14, maxLife: 0.14 });
  }

  private enemiesInRange(x: number, y: number, range: number): Enemy[] {
    const r2 = range * range;
    const out: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2(x, y, e.x, e.y) <= r2) out.push(e);
    }
    return out;
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
    let any = false;
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.life <= 0) { p.dead = true; any = true; continue; }

      if (p.kind === 'ballistic') {
        p.t += dt / p.dur;
        if (p.t >= 1) {
          p.x = p.tx; p.y = p.ty;
          this.explode(p);
          p.dead = true; any = true;
        } else {
          p.x = p.sx + (p.tx - p.sx) * p.t;
          p.y = p.sy + (p.ty - p.sy) * p.t;
        }
        continue;
      }

      const tgt = p.target && !p.target.dead ? p.target : null;
      if (!tgt) { p.dead = true; any = true; continue; }
      const dx = tgt.x - p.x, dy = tgt.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = p.speed * dt;
      if (d <= step + ENEMIES[tgt.def].radius * 0.6) {
        this.damage(tgt, p.damage, p.owner, p.color, p.slow, p.slowTime);
        p.dead = true; any = true;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    if (any) this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  private explode(p: Projectile): void {
    Sfx.play('boom');
    this.ring(p.x, p.y, p.splash, p.color, 0.35, 5);
    this.spark(p.x, p.y, p.color, this.quality === 'hoch' ? 16 : 7, 220);
    this.shake = Math.min(1, this.shake + 0.18);
    const r2 = p.splash * p.splash;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d2 = dist2(p.x, p.y, e.x, e.y);
      if (d2 > r2) continue;
      // Am Rand der Explosion nur die Haelfte.
      const f = 1 - 0.5 * Math.sqrt(d2) / p.splash;
      this.damage(e, p.damage * f, p.owner, p.color, 0, 0);
    }
  }

  private damage(
    e: Enemy, raw: number, owner: Tower | null, color: string,
    slow: number, slowTime: number,
  ): void {
    if (e.dead) return;
    const def = ENEMIES[e.def];
    const dmg = Math.max(1, Math.round(raw) - def.armor);
    e.hp -= dmg;
    e.hitFlash = 1;
    if (owner) owner.damageDone += dmg;
    if (slow > 0) {
      const eff = slow * (1 - def.slowResist);
      e.slowFactor = Math.min(e.slowFactor, 1 - eff);
      e.slowLeft = Math.max(e.slowLeft, slowTime);
    }
    this.spark(e.x, e.y, color, this.quality === 'hoch' ? 3 : 1, 140);
    Sfx.play('hit');
    if (e.hp <= 0) {
      e.dead = true;
      this.gold += def.bounty;
      if (owner) owner.kills++;
      this.float(e.x, e.y - 12, `+${def.bounty}`, C.gold, def.boss ? 30 : 20);
      this.spark(e.x, e.y, def.body, this.quality === 'hoch' ? (def.boss ? 44 : 12) : 6, def.boss ? 320 : 180);
      Sfx.play('kill');
      if (def.boss || def.radius >= 24) {
        // Kurzes Stocken macht den Tod schwerer Gegner spuerbar.
        this.hitstop = def.boss ? 0.16 : 0.05;
        this.shake = Math.min(1, this.shake + (def.boss ? 0.9 : 0.22));
        this.ring(e.x, e.y, def.boss ? 190 : 80, def.trim, 0.5, 5);
      }
    }
  }

  // ---------------------------------------------------------------- Effekte

  private decayFx(dt: number): void {
    if (this.particles.length) {
      for (const p of this.particles) {
        p.life -= dt;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.93; p.vy *= 0.93;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
    }
    if (this.floats.length) {
      for (const f of this.floats) { f.life -= dt; f.y -= 28 * dt; }
      this.floats = this.floats.filter((f) => f.life > 0);
    }
    if (this.rings.length) {
      for (const r of this.rings) { r.life -= dt; r.r = r.rMax * (1 - r.life / r.maxLife); }
      this.rings = this.rings.filter((r) => r.life > 0);
    }
    if (this.bolts.length) {
      for (const b of this.bolts) b.life -= dt;
      this.bolts = this.bolts.filter((b) => b.life > 0);
    }
  }

  float(x: number, y: number, text: string, color: string, size: number): void {
    this.floats.push({ x, y, text, color, life: 1.1, size });
  }

  ring(x: number, y: number, rMax: number, color: string, life: number, width: number): void {
    if (this.quality === 'niedrig' && this.rings.length > 12) return;
    this.rings.push({ x, y, r: 0, rMax, color, life, maxLife: life, width });
  }

  spark(x: number, y: number, color: string, n: number, spread: number): void {
    if (this.quality === 'niedrig' && this.particles.length > 160) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spread * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.35, maxLife: 0.7,
        size: 2 + Math.random() * 3, color, gravity: 120,
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
    this.particles = []; this.floats = []; this.rings = []; this.bolts = [];
    this.towerAt.clear();
    this.pending = [];
    this.selectedTower = null;
    this.buildChoice = null;
    this.pendingCell = null;
    this.speed = 1;
    this.paused = false;
    this.idleTime = 0;
    this.leakedTotal = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.phase = 'playing';
  }

  worldToCell(wx: number, wy: number): Vec {
    return { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
  }
}
