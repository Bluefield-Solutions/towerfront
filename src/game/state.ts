import { COLS, ROWS, TILE, WORLD_W, WORLD_H, C } from '../data/config';
import { ENEMIES, type EnemyId } from '../data/enemies';
import {
  TOWERS, MAX_LEVEL, accentFor, sellValue, statsFor, nextFor,
  type BranchIndex, type TowerId,
} from '../data/towers';
import { EARLY_BONUS_MAX, EARLY_BONUS_WINDOW } from '../data/waves';
import {
  DIFFICULTIES, hpScale, type DifficultyDef, type DifficultyId,
} from '../data/difficulty';
import { ABILITIES, ABILITY_ORDER, type AbilityId } from '../data/abilities';
import {
  MAPS, mapById, cellCenter, cellKey, goalOf, laneCells, lanePoints, pathCells, pathLength,
  type GameMap,
} from '../data/maps';
import type { Vec } from '../core/math';
import { dist, dist2 } from '../core/math';
import { Sfx } from '../core/audio';
import { recordRun } from '../core/storage';
import { Rng, newSeed } from '../core/rng';
import { clearGame, type SaveGame } from './save';
import { SpatialGrid } from '../core/spatialgrid';
import { Pool, compact } from '../core/pool';
import type {
  Bolt, Enemy, FloatText, Husk, Meteor, Particle, Phase, Projectile, Quality,
  Ring, RunStats, Tower,
} from './types';

interface PendingSpawn { time: number; enemy: EnemyId; hpMul: number; lane: number; }

function emptyStats(): RunStats {
  return {
    goldEarned: 0, goldSpent: 0, damage: 0, damageBy: {},
    kills: 0, leaksByWave: [], abilityUses: {}, duration: 0, towersBuilt: 0,
  };
}

export class GameState {
  /** Die Karte kann zwischen zwei Partien wechseln, deshalb ist hier nichts
   *  mehr fest verdrahtet. */
  map: GameMap = MAPS[0];
  /** Die Bahnen in Weltkoordinaten. Eine Karte kann mehrere Zuwege haben,
   *  die sich unterwegs vereinen. */
  lanes: Vec[][] = [];
  readonly pathSet = new Set<number>();
  readonly blockedSet = new Set<number>();
  goal: Vec = { x: 0, y: 0 };
  /** Gesamtlaenge der laengsten Bahn. Dient als gemeinsamer Massstab, damit
   *  fliegende und laufende Gegner beim Zielen vergleichbar sind. */
  pathTotal = 1;
  /** Luftlinie vom weitesten Tor zum Kristall - der Massstab der Flieger. */
  airTotal = 1;

  phase: Phase = 'title';
  /** Der gewaehlte Schwierigkeitsgrad. Er verstellt Startwerte, Kurvenform,
   *  Wellendichte und Einkommen gemeinsam. */
  difficulty: DifficultyId = 'normal';
  gold = DIFFICULTIES.normal.startGold;
  lives = DIFFICULTIES.normal.startLives;
  maxLives = DIFFICULTIES.normal.startLives;
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
  husks: Husk[] = [];
  /** Kurzes Aufleuchten des ganzen Feldes, etwa beim Meteoreinschlag. */
  flashT = 0;
  particles: Particle[] = [];
  floats: FloatText[] = [];

  meteors: Meteor[] = [];
  /** Restliche Abklingzeit je Faehigkeit. Null heisst einsatzbereit. */
  abilityCd: Record<AbilityId, number> = { meteor: 0, freeze: 0 };
  /** Gezielte Faehigkeit, die auf einen Tipp aufs Feld wartet. */
  aiming: AbilityId | null = null;

  buildChoice: TowerId | null = null;
  selectedTower: Tower | null = null;
  hoverCell: Vec | null = null;
  /** Zelle unter dem gedrueckten Finger. Gebaut wird erst beim Loslassen. */
  pendingCell: Vec | null = null;

  /** Aussaat und Zufallszustand. Beides wandert in den Spielstand, damit eine
   *  fortgesetzte Partie exakt so weiterlaeuft wie eine ununterbrochene - und
   *  damit ein gemeldeter Fehler nachgestellt werden kann. */
  seed = newSeed();
  readonly rng = new Rng(this.seed);

  /** Zaehler fuer die Turmschicht. Aendert er sich, wird sie neu gebacken. */
  towersVersion = 0;

  /** Zahlen der laufenden Partie. */
  stats: RunStats = emptyStats();

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

  /** Raster fuer alle Umkreisabfragen. Zellenkante = Kachelgroesse.
   *  Wird einmal pro Simulationsschritt neu befuellt. */
  private grid = new SpatialGrid<Enemy>(160, WORLD_W, WORLD_H);
  /** Getrennte Kratzflaechen, damit sich verschachtelte Abfragen nicht
   *  gegenseitig ueberschreiben. */
  private qRaw: Enemy[] = [];
  private qTarget: Enemy[] = [];
  private qArea: Enemy[] = [];
  private qChain: Enemy[] = [];
  private chainSeen = new Set<number>();
  private chainPts: Vec[] = [];

  /** Objektlager fuer kurzlebige Dinge. Gegner werden bewusst NICHT gelagert:
   *  Geschosse halten Verweise auf ihr Ziel, ein wiederverwendeter Gegner
   *  koennte von einem alten Geschoss faelschlich als lebendig gelesen werden. */
  private particlePool = new Pool<Particle>(() => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', gravity: 0, grow: 0,
  }), 900);
  private projectilePool = new Pool<Projectile>(() => ({
    kind: 'homing', x: 0, y: 0, sx: 0, sy: 0, tx: 0, ty: 0, target: null, owner: null,
    speed: 0, damage: 0, slow: 0, slowTime: 0, splash: 0, pierce: 0, color: '#fff',
    t: 0, dur: 1, life: 0, dead: true,
  }), 200);
  private ringPool = new Pool<Ring>(() => ({
    x: 0, y: 0, r: 0, rMax: 1, color: '#fff', life: 0, maxLife: 1, width: 1,
  }), 120);
  private floatPool = new Pool<FloatText>(() => ({
    x: 0, y: 0, text: '', color: '#fff', life: 0, size: 20,
  }), 80);
  private boltPool = new Pool<Bolt>(() => ({
    pts: [], color: '#fff', life: 0, maxLife: 1,
  }), 40);

  constructor(mapId = MAPS[0].id) {
    this.loadMap(mapId);
  }

  /** Setzt die Karte. Alles, was von ihr abhaengt, wird hier neu berechnet -
   *  so gibt es keinen Zustand, der zur alten Karte gehoert. */
  loadMap(mapId: string): void {
    this.map = mapById(mapId);
    this.lanes = this.map.lanes.map(lanePoints);
    this.pathSet.clear();
    this.blockedSet.clear();
    for (const c of pathCells(this.map)) this.pathSet.add(cellKey(c.x, c.y));
    for (const b of this.map.blocked) this.blockedSet.add(cellKey(b.x, b.y));
    this.goal = goalOf(this.map);
    this.pathTotal = Math.max(...this.lanes.map(pathLength));
    this.airTotal = Math.max(...this.lanes.map(
      (l) => dist(l[0].x, l[0].y, this.goal.x, this.goal.y),
    ));
    void laneCells;
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
    if (!this.canBuild(cx, cy) || this.gold < def.base.cost) return false;
    this.gold -= def.base.cost;
    this.stats.goldSpent += def.base.cost;
    this.stats.towersBuilt++;
    const c = cellCenter(cx, cy);
    const t: Tower = {
      id: this.nextId++, def: id, cx, cy, x: c.x, y: c.y,
      level: 1, branch: null, cooldownLeft: 0, angle: -Math.PI / 2, recoil: 0, flash: 0, pulse: 0,
      target: null, retargetIn: 0, kills: 0, damageDone: 0,
    };
    this.towers.push(t);
    this.towerAt.set(cellKey(cx, cy), t);
    this.towersVersion++;
    this.ring(c.x, c.y, 54, def.accent, 0.4, 3);
    Sfx.play('build');
    return true;
  }

  /** Ausbau. Auf Stufe 1 muss zugleich ein Zweig gewaehlt werden; danach ist
   *  die Entscheidung endgueltig und der Zweig steht fest. */
  upgrade(t: Tower, branch?: 0 | 1): boolean {
    const def = TOWERS[t.def];
    if (t.level >= MAX_LEVEL) return false;
    const chosen: BranchIndex = t.branch ?? (branch ?? null);
    if (chosen === null) return false;
    const next = nextFor(def, chosen, t.level);
    if (!next || this.gold < next.cost) return false;
    this.gold -= next.cost;
    this.stats.goldSpent += next.cost;
    t.branch = chosen;
    t.level++;
    this.towersVersion++;
    this.ring(t.x, t.y, 66, accentFor(def, t.branch), 0.45, 4);
    Sfx.play('upgrade');
    return true;
  }

  sell(t: Tower): void {
    const def = TOWERS[t.def];
    const value = sellValue(def, t.branch, t.level);
    this.gold += value;
    t.target = null;
    compact(this.towers, (o) => o === t);
    this.towersVersion++;
    this.towerAt.delete(cellKey(t.cx, t.cy));
    if (this.selectedTower === t) this.selectedTower = null;
    this.float(t.x, t.y - 10, `+${value}`, C.gold, 22);
    this.ring(t.x, t.y, 48, C.stoneDark, 0.35, 2);
    Sfx.play('sell');
  }

  /** Werte der aktuellen Ausbaustufe eines Turms. */
  towerStats(t: Tower) { return statsFor(TOWERS[t.def], t.branch, t.level); }

  // ---------------------------------------------------------------- Wellen

  /** Der Wellenplan der aktuellen Karte. */
  get waves() { return this.map.waves; }
  get waveNumber(): number { return Math.min(this.waveIndex + 1, this.waves.length); }
  get totalWaves(): number { return this.waves.length; }
  get canStartWave(): boolean { return !this.waveActive && this.waveIndex < this.waves.length; }
  get nextWave() { return this.waves[this.waveIndex]; }

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
      this.stats.goldEarned += bonus;
      this.float(this.goal.x, this.goal.y - 70, `Frueh gestartet  +${bonus}`, C.gold, 22);
    }
    const wave = this.waves[this.waveIndex];
    // Spaetere Wellen kommen dichter: was zaehlt, ist die Huelle je Sekunde.
    const dense = 1 + this.waveIndex * this.diff.densityRamp;
    this.pending = [];
    // Auf mehrspurigen Karten werden die Bahnen abwechselnd bedient, damit
    // eine Welle nicht zufaellig nur einen Zuweg belastet.
    const laneCount = this.lanes.length;
    let laneTurn = this.waveIndex % laneCount;
    for (const g of wave.groups) {
      for (let i = 0; i < g.count; i++) {
        this.pending.push({
          time: g.delay + (i * g.gap) / dense,
          enemy: g.enemy, hpMul: g.hpMul ?? 1,
          lane: laneTurn % laneCount,
        });
        laneTurn++;
      }
    }
    this.pending.sort((a, b) => a.time - b.time);
    this.waveTime = 0;
    this.waveActive = true;
    this.idleTime = 0;
    Sfx.play('wave');
  }

  private finishWave(): void {
    const wave = this.waves[this.waveIndex];
    const payout = Math.round(wave.bonus * this.diff.bonusMul * this.map.balance.goldMul);
    this.gold += payout;
    this.stats.goldEarned += payout;
    this.float(this.goal.x, this.goal.y - 56, `Welle geschafft  +${payout}`, C.gold, 26);
    this.waveIndex++;
    this.waveActive = false;
    this.idleTime = 0;
    if (this.waveIndex >= this.waves.length) {
      this.phase = 'won';
      clearGame();
      recordRun(this.map.id, this.difficulty, this.waves.length, this.lives);
      Sfx.play('win');
    }
  }

  // ----------------------------------------------------------- Faehigkeiten

  ready(id: AbilityId): boolean {
    return this.phase === 'playing' && this.abilityCd[id] <= 0;
  }

  /** Waehlt eine gezielte Faehigkeit an oder loest eine sofortige aus. */
  chooseAbility(id: AbilityId): void {
    if (!this.ready(id)) return;
    const def = ABILITIES[id];
    if (def.kind === 'instant') { this.cast(id, 0, 0); return; }
    this.aiming = this.aiming === id ? null : id;
    this.buildChoice = null;
    this.selectedTower = null;
  }

  cast(id: AbilityId, x: number, y: number): boolean {
    if (!this.ready(id)) return false;
    const def = ABILITIES[id];
    this.abilityCd[id] = def.cooldown;
    this.stats.abilityUses[id] = (this.stats.abilityUses[id] ?? 0) + 1;
    this.aiming = null;

    if (id === 'meteor') {
      this.meteors.push({
        x, y, t: 0, dur: def.delay ?? 0.7,
        radius: def.radius ?? 100, damage: def.damage ?? 100,
      });
      Sfx.play('meteor');
      return true;
    }

    // Frostschlag: legt sich ueber das ganze Feld.
    const eff = def.slow ?? 0.6;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const r = 1 - ENEMIES[e.def].slowResist;
      e.slowFactor = Math.min(e.slowFactor, 1 - eff * r);
      e.slowLeft = Math.max(e.slowLeft, def.slowTime ?? 3);
      this.ring(e.x, e.y, ENEMIES[e.def].radius * 2.4, def.color, 0.35, 2);
    }
    this.ring(this.goal.x, this.goal.y, WORLD_W, def.color, 0.7, 6);
    this.float(this.goal.x, this.goal.y - 90, 'Frostschlag', def.color, 26);
    Sfx.play('freeze');
    return true;
  }

  private updateMeteors(dt: number): void {
    if (!this.meteors.length) return;
    for (const m of this.meteors) {
      m.t += dt / m.dur;
      if (m.t < 1) continue;
      // Einschlag: trifft Boden und Luft, am Rand halber Schaden.
      const r2 = m.radius * m.radius;
      const cand = this.grid.query(m.x, m.y, m.radius, this.qRaw);
      for (let i = 0; i < cand.length; i++) {
        const e = cand[i];
        if (e.dead) continue;
        const d2 = dist2(m.x, m.y, e.x, e.y);
        if (d2 > r2) continue;
        const f = 1 - 0.5 * Math.sqrt(d2) / m.radius;
        this.damage(e, m.damage * f, null, ABILITIES.meteor.color, 0, 0);
      }
      this.ring(m.x, m.y, m.radius, ABILITIES.meteor.color, 0.5, 7);
      this.ring(m.x, m.y, m.radius * 1.5, '#FFFFFF', 0.3, 3);
      this.spark(m.x, m.y, ABILITIES.meteor.color, this.quality === 'hoch' ? 34 : 12, 340);
      this.smoke(m.x, m.y, 16, 150);
      this.debris(m.x, m.y, '#6B5B44', this.quality === 'hoch' ? 14 : 4, 320);
      this.shake = Math.min(1, this.shake + 0.8);
      this.hitstop = Math.max(this.hitstop, 0.07);
      this.flashT = 1;
      Sfx.play('boom');
    }
    compact(this.meteors, (m) => m.t >= 1);
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
    this.stats.duration += dt;
    this.crystalPulse += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dtReal * 3);
    if (this.crystalHit > 0) this.crystalHit = Math.max(0, this.crystalHit - dtReal * 2);
    if (!this.waveActive) this.idleTime += dtReal;

    if (this.waveActive) {
      this.waveTime += dt;
      while (this.pending.length && this.pending[0].time <= this.waveTime) {
        const p = this.pending.shift()!;
        this.spawnEnemy(p.enemy, p.hpMul, p.lane);
      }
      if (!this.pending.length && !this.enemies.length) this.finishWave();
    }

    for (const id of ABILITY_ORDER) {
      if (this.abilityCd[id] > 0) {
        this.abilityCd[id] = Math.max(0, this.abilityCd[id] - dt);
        if (this.abilityCd[id] === 0) Sfx.play('ready');
      }
    }

    this.updateEnemies(dt);
    this.rebuildGrid();
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateMeteors(dt);
    this.decayFx(dt);

    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = 'lost';
      clearGame();
      recordRun(this.map.id, this.difficulty, this.waveNumber - 1, 0);
      Sfx.play('lose');
    }
  }

  private spawnEnemy(id: EnemyId, hpMul: number, lane: number): void {
    const def = ENEMIES[id];
    const ln = lane % this.lanes.length;
    const p0 = this.lanes[ln][0];
    const ramp = hpScale(this.diff, this.waveIndex, this.waves.length, this.map.balance.hpMul);
    const hp = Math.round(def.hp * hpMul * ramp);
    // Flieger starten leicht versetzt, damit ein Schwarm nicht als eine Linie
    // uebereinander liegt.
    const off = def.flying ? (this.rng.next() - 0.5) * TILE * 2.2 : 0;
    this.enemies.push({
      id: this.nextId++, def: id, x: p0.x, y: p0.y + off,
      hp, hpMax: hp, speed: def.speed, lane: ln, seg: 0, travelled: 0,
      slowFactor: 1, slowLeft: 0, hitFlash: 0, wobble: this.rng.next() * 9,
      dead: false, leaked: false,
    });
  }

  /** Bruchstuecke eines zerfallenden Gegners. Sie erben Pfadposition und
   *  Fortschritt - sonst wuerden sie am Anfang wieder auftauchen. */
  private splitEnemy(parent: Enemy, rule: { into: EnemyId; count: number; hpFactor: number }): void {
    const child = ENEMIES[rule.into];
    const hp = Math.max(1, Math.round(parent.hpMax * rule.hpFactor));
    for (let i = 0; i < rule.count; i++) {
      const spread = (i - (rule.count - 1) / 2) * 14;
      this.enemies.push({
        id: this.nextId++, def: rule.into,
        x: parent.x + spread, y: parent.y + (this.rng.next() - 0.5) * 10,
        hp, hpMax: hp, speed: child.speed,
        lane: parent.lane, seg: parent.seg, travelled: Math.max(0, parent.travelled - 6),
        slowFactor: parent.slowFactor, slowLeft: parent.slowLeft,
        hitFlash: 0, wobble: this.rng.next() * 9,
        dead: false, leaked: false,
      });
    }
    this.ring(parent.x, parent.y, 46, child.trim, 0.3, 3);
  }

  private updateEnemies(dt: number): void {
    let leaked = false;
    for (const e of this.enemies) {
      if (e.slowLeft > 0) {
        e.slowLeft -= dt;
        if (e.slowLeft <= 0) e.slowFactor = 1;
      }
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 5);

      const edef = ENEMIES[e.def];
      if (edef.flying) {
        // Luftlinie zum Herzkristall - kein Pfad, keine Kurven.
        const dx = this.goal.x - e.x, dy = this.goal.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = e.speed * e.slowFactor * dt;
        // Fortschritt auf denselben Massstab wie am Boden bringen, damit
        // "vorderstes Ziel" fuer beide dasselbe bedeutet.
        e.travelled = this.pathTotal * (1 - d / (this.airTotal || d));
        if (d <= step + 6) {
          e.x = this.goal.x; e.y = this.goal.y;
          this.leak(e, edef);
          leaked = true;
        } else {
          e.x += (dx / d) * step;
          e.y += (dy / d) * step;
        }
        continue;
      }

      const path = this.lanes[e.lane] ?? this.lanes[0];
      let move = e.speed * e.slowFactor * dt;
      while (move > 0 && e.seg < path.length - 1) {
        const to = path[e.seg + 1];
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
      if (e.seg >= path.length - 1) {
        this.leak(e, edef);
        leaked = true;
      }
    }
    if (leaked) Sfx.play('leak');
    if (compact(this.enemies, (e) => e.dead) > 0) {
      // Verweise auf entfernte Gegner loesen.
      for (let i = 0; i < this.towers.length; i++) {
        const tw = this.towers[i];
        if (tw.target && tw.target.dead) tw.target = null;
      }
    }
  }

  private rebuildGrid(): void {
    this.grid.clear();
    for (let i = 0; i < this.enemies.length; i++) this.grid.insert(this.enemies[i]);
  }

  /** Ein Gegner erreicht den Kristall. */
  private leak(e: Enemy, def: typeof ENEMIES[EnemyId]): void {
    e.leaked = true; e.dead = true;
    this.lives -= def.leak;
    this.leakedTotal++;
    this.stats.leaksByWave[this.waveIndex] =
      (this.stats.leaksByWave[this.waveIndex] ?? 0) + def.leak;
    this.crystalHit = 1;
    this.shake = Math.min(1, this.shake + 0.55);
    this.float(this.goal.x, this.goal.y - 44, `-${def.leak}`, C.danger, 28);
    this.ring(this.goal.x, this.goal.y, 120, C.danger, 0.5, 5);
  }

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      const def = TOWERS[t.def];
      const st = this.towerStats(t);
      if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 6);
      if (t.flash > 0) t.flash = Math.max(0, t.flash - dt * 9);
      if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 2.2);
      t.cooldownLeft -= dt;

      if (def.attack === 'aura') {
        if (t.cooldownLeft > 0) continue;
        const targets = this.enemiesInRange(t.x, t.y, st.range, this.qArea, def.hitsAir);
        if (!targets.length) continue;
        t.cooldownLeft = st.cooldown;
        t.pulse = 1;
        t.flash = 1;
        this.ring(t.x, t.y, st.range, def.accent, 0.45, 3);
        Sfx.play('frost');
        for (let i = 0; i < targets.length; i++) {
          this.damage(targets[i], st.damage, t, accentFor(def, t.branch),
            st.slow ?? 0, st.slowTime ?? 0, st.pierce ?? 0);
        }
        continue;
      }

      // Die Zielsuche lief bisher jedes Bild fuer jeden Turm - auch waehrend
      // der Turm nachlaedt und gar nicht schiessen kann. Das Ziel wird nun
      // zwischengespeichert und nur alle 120 ms neu gesucht, oder sofort,
      // wenn es tot oder aus der Reichweite gelaufen ist.
      const r2 = st.range * st.range;
      let target = t.target;
      if (target && (target.dead || dist2(t.x, t.y, target.x, target.y) > r2)) target = null;
      t.retargetIn -= dt;
      if (!target || t.retargetIn <= 0) {
        target = this.findTarget(t.x, t.y, st.range, def.hitsAir);
        t.retargetIn = 0.12;
      }
      t.target = target;
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
      t.flash = 1;

      if (def.attack === 'single') {
        Sfx.play('arrow');
        this.projectiles.push(this.makeProjectile('homing', t, target, aim, st, accentFor(def, t.branch), def.projectileSpeed));
      } else if (def.attack === 'splash') {
        Sfx.play('mortar');
        this.projectiles.push(this.makeProjectile('ballistic', t, null, aim, st, accentFor(def, t.branch), def.projectileSpeed));
      } else {
        Sfx.play('prism');
        this.chain(t, target, st.damage, st.chains ?? 0, st.falloff ?? 0.6, st.range,
          accentFor(def, t.branch), st.pierce ?? 0);
      }
    }
  }

  private makeProjectile(
    kind: 'homing' | 'ballistic', t: Tower, target: Enemy | null,
    aim: Vec, st: { damage: number; slow?: number; slowTime?: number; splash?: number; pierce?: number },
    color: string, speed: number,
  ): Projectile {
    const d = dist(t.x, t.y, aim.x, aim.y);
    const p = this.projectilePool.obtain();
    p.kind = kind;
    p.x = t.x; p.y = t.y; p.sx = t.x; p.sy = t.y; p.tx = aim.x; p.ty = aim.y;
    p.target = target; p.owner = t; p.speed = speed; p.damage = st.damage;
    p.slow = st.slow ?? 0; p.slowTime = st.slowTime ?? 0; p.splash = st.splash ?? 0;
    p.pierce = st.pierce ?? 0;
    p.color = color; p.t = 0; p.dur = Math.max(0.12, d / speed);
    p.life = 3; p.dead = false;
    return p;
  }

  /** Vorhalten: wohin laeuft der Gegner in der Flugzeit des Geschosses. */
  private predict(e: Enemy, flight: number): Vec {
    const path = this.lanes[e.lane] ?? this.lanes[0];
    let x = e.x, y = e.y, seg = e.seg;
    let move = e.speed * e.slowFactor * flight;
    while (move > 0 && seg < path.length - 1) {
      const to = path[seg + 1];
      const d = dist(x, y, to.x, to.y);
      if (d <= move) { x = to.x; y = to.y; move -= d; seg++; }
      else { const k = move / d; x += (to.x - x) * k; y += (to.y - y) * k; move = 0; }
    }
    return { x, y };
  }

  private chain(
    t: Tower, first: Enemy, damage: number, jumps: number,
    falloff: number, range: number, color: string, pierce: number,
  ): void {
    const seen = this.chainSeen;
    seen.clear();
    const pts = this.chainPts;
    pts.length = 0;
    pts.push({ x: t.x, y: t.y });
    let cur: Enemy | null = first;
    let dmg = damage;
    const jumpRange = range * 0.62;
    for (let i = 0; i <= jumps && cur; i++) {
      seen.add(cur.id);
      pts.push({ x: cur.x, y: cur.y });
      this.damage(cur, dmg, t, color, 0, 0, pierce);
      dmg *= falloff;
      let next: Enemy | null = null;
      let bestD = jumpRange * jumpRange;
      const cand = this.grid.query(cur.x, cur.y, jumpRange, this.qChain);
      for (let k = 0; k < cand.length; k++) {
        const e = cand[k];
        if (e.dead || seen.has(e.id)) continue;
        const d = dist2(cur.x, cur.y, e.x, e.y);
        if (d < bestD) { bestD = d; next = e; }
      }
      cur = next;
    }
    const bolt = this.boltPool.obtain();
    bolt.pts.length = 0;
    for (let i = 0; i < pts.length; i++) bolt.pts.push(pts[i]);
    bolt.color = color; bolt.life = 0.14; bolt.maxLife = 0.14;
    this.bolts.push(bolt);
  }

  /** Alle lebenden Gegner im Umkreis, geschrieben in die uebergebene
   *  Kratzflaeche - kein neues Array pro Aufruf. */
  private enemiesInRange(x: number, y: number, range: number, out: Enemy[], airOk: boolean): Enemy[] {
    const cand = this.grid.query(x, y, range, this.qRaw);
    const r2 = range * range;
    const keep: Enemy[] = out;
    keep.length = 0;
    for (let i = 0; i < cand.length; i++) {
      const e = cand[i];
      if (e.dead) continue;
      if (!airOk && ENEMIES[e.def].flying) continue;
      if (dist2(x, y, e.x, e.y) <= r2) keep.push(e);
    }
    return keep;
  }

  /** Vorderstes Ziel in Reichweite - Standardstrategie in Tower Defense. */
  private findTarget(x: number, y: number, range: number, airOk: boolean): Enemy | null {
    const cand = this.grid.query(x, y, range, this.qTarget);
    let best: Enemy | null = null;
    const r2 = range * range;
    for (let i = 0; i < cand.length; i++) {
      const e = cand[i];
      if (e.dead) continue;
      if (!airOk && ENEMIES[e.def].flying) continue;
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
        this.damage(tgt, p.damage, p.owner, p.color, p.slow, p.slowTime, p.pierce);
        p.dead = true; any = true;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    if (any) {
      compact(this.projectiles, (p) => p.dead, (p) => {
        p.target = null; p.owner = null;
        this.projectilePool.release(p);
      });
    }
  }

  private explode(p: Projectile): void {
    Sfx.play('boom');
    this.ring(p.x, p.y, p.splash, p.color, 0.35, 5);
    this.spark(p.x, p.y, p.color, this.quality === 'hoch' ? 14 : 6, 220);
    this.smoke(p.x, p.y, 7, 90);
    this.debris(p.x, p.y, '#6B5B44', this.quality === 'hoch' ? 6 : 2, 190);
    this.shake = Math.min(1, this.shake + 0.18);
    const r2 = p.splash * p.splash;
    const cand = this.grid.query(p.x, p.y, p.splash, this.qRaw);
    for (let i = 0; i < cand.length; i++) {
      const e = cand[i];
      if (e.dead || ENEMIES[e.def].flying) continue;
      const d2 = dist2(p.x, p.y, e.x, e.y);
      if (d2 > r2) continue;
      // Am Rand der Explosion nur die Haelfte.
      const f = 1 - 0.5 * Math.sqrt(d2) / p.splash;
      this.damage(e, p.damage * f, p.owner, p.color, 0, 0, p.pierce);
    }
  }

  private damage(
    e: Enemy, raw: number, owner: Tower | null, color: string,
    slow: number, slowTime: number, pierce = 0,
  ): void {
    if (e.dead) return;
    const def = ENEMIES[e.def];
    const dmg = Math.max(1, Math.round(raw) - Math.max(0, def.armor - pierce));
    e.hp -= dmg;
    e.hitFlash = 1;
    if (owner) owner.damageDone += dmg;
    this.stats.damage += dmg;
    const src = owner ? owner.def : 'meteor';
    this.stats.damageBy[src] = (this.stats.damageBy[src] ?? 0) + dmg;
    if (slow > 0) {
      const eff = slow * (1 - def.slowResist);
      e.slowFactor = Math.min(e.slowFactor, 1 - eff);
      e.slowLeft = Math.max(e.slowLeft, slowTime);
    }
    this.spark(e.x, e.y, color, this.quality === 'hoch' ? 3 : 1, 140);
    Sfx.play('hit');
    if (e.hp <= 0) {
      e.dead = true;
      const bounty = Math.max(1, Math.round(def.bounty * this.diff.bountyMul * this.map.balance.goldMul));
      this.gold += bounty;
      this.stats.goldEarned += bounty;
      this.stats.kills++;
      if (owner) owner.kills++;
      this.float(e.x, e.y - 12, `+${bounty}`, C.gold, def.boss ? 30 : 20);
      this.spark(e.x, e.y, def.body, this.quality === 'hoch' ? (def.boss ? 44 : 12) : 6, def.boss ? 320 : 180);
      Sfx.play('kill');
      this.husks.push({
        def: e.def, x: e.x, y: e.y,
        alt: def.flying ? 30 : 0,
        angle: 0, spin: (this.rng.next() - 0.5) * 7,
        frame: Math.floor(e.wobble),
        t: 0, dur: def.boss ? 0.9 : 0.45,
      });
      if (def.split) this.splitEnemy(e, def.split);
      if (def.radius >= 22) this.debris(e.x, e.y, def.trim, def.boss ? 10 : 4, 180);
      if (def.boss || def.radius >= 24) {
        // Kurzes Stocken macht den Tod schwerer Gegner spuerbar.
        this.hitstop = def.boss ? 0.16 : 0.05;
        this.shake = Math.min(1, this.shake + (def.boss ? 0.9 : 0.22));
        this.ring(e.x, e.y, def.boss ? 190 : 80, def.trim, 0.5, 5);
        if (def.boss) this.smoke(e.x, e.y, 14, 120);
      }
    }
  }

  // ---------------------------------------------------------------- Effekte

  private decayFx(dt: number): void {
    if (this.particles.length) {
      for (const p of this.particles) {
        p.life -= dt;
        p.vy += p.gravity * dt;
        if (p.grow) p.size += p.grow * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.93; p.vy *= 0.93;
      }
      compact(this.particles, (p) => p.life <= 0, (p) => this.particlePool.release(p));
    }
    if (this.floats.length) {
      for (const f of this.floats) { f.life -= dt; f.y -= 28 * dt; }
      compact(this.floats, (f) => f.life <= 0, (f) => this.floatPool.release(f));
    }
    if (this.rings.length) {
      for (const r of this.rings) { r.life -= dt; r.r = r.rMax * (1 - r.life / r.maxLife); }
      compact(this.rings, (r) => r.life <= 0, (r) => this.ringPool.release(r));
    }
    if (this.husks.length) {
      for (const h of this.husks) {
        h.t += dt / h.dur;
        h.angle += h.spin * dt;
        h.alt = Math.max(0, h.alt - 70 * dt);
        h.y += 14 * dt;
      }
      compact(this.husks, (h) => h.t >= 1);
    }
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt * 4);
    if (this.bolts.length) {
      for (const b of this.bolts) b.life -= dt;
      compact(this.bolts, (b) => b.life <= 0, (b) => this.boltPool.release(b));
    }
  }

  float(x: number, y: number, text: string, color: string, size: number): void {
    const f = this.floatPool.obtain();
    f.x = x; f.y = y; f.text = text; f.color = color; f.life = 1.1; f.size = size;
    this.floats.push(f);
  }

  ring(x: number, y: number, rMax: number, color: string, life: number, width: number): void {
    if (this.quality === 'niedrig' && this.rings.length > 12) return;
    const r = this.ringPool.obtain();
    r.x = x; r.y = y; r.r = 0; r.rMax = rMax; r.color = color;
    r.life = life; r.maxLife = life; r.width = width;
    this.rings.push(r);
  }

  /** Obergrenze fuer Teilchen. Ohne sie waechst der teuerste Posten beim
   *  Zeichnen unbegrenzt - und genau der frisst auf dem Handy den Spielraum
   *  fuer alles andere. */
  private get particleCap(): number { return this.quality === 'hoch' ? 620 : 180; }

  /** Rauch: dunkle Ballen, die aufsteigen, wachsen und verwehen.
   *  Eine Explosion ohne Rauch ist ein Blitz, kein Einschlag. */
  smoke(x: number, y: number, n: number, spread: number): void {
    if (this.quality !== 'hoch') return;
    if (this.particles.length >= this.particleCap) return;
    n = Math.min(n, this.particleCap - this.particles.length);
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = spread * (0.2 + this.rng.next() * 0.6);
      const p = this.particlePool.obtain();
      p.x = x + Math.cos(a) * 6; p.y = y + Math.sin(a) * 6;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 26;
      p.life = 0.7 + this.rng.next() * 0.6; p.maxLife = 1.4;
      p.size = 5 + this.rng.next() * 6;
      p.color = '#2A3348';
      p.gravity = -18;
      p.grow = 22;
      this.particles.push(p);
    }
  }

  /** Truemmer: wenige groessere Brocken, die hochgeschleudert werden und fallen. */
  debris(x: number, y: number, color: string, n: number, spread: number): void {
    if (this.particles.length >= this.particleCap) return;
    n = Math.min(n, this.particleCap - this.particles.length);
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = spread * (0.5 + this.rng.next() * 0.8);
      const p = this.particlePool.obtain();
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 90;
      p.life = 0.6 + this.rng.next() * 0.5; p.maxLife = 1.1;
      p.size = 4 + this.rng.next() * 4;
      p.color = color;
      p.gravity = 620;
      p.grow = -3;
      this.particles.push(p);
    }
  }

  spark(x: number, y: number, color: string, n: number, spread: number): void {
    if (this.particles.length >= this.particleCap) return;
    n = Math.min(n, this.particleCap - this.particles.length);
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = spread * (0.3 + this.rng.next() * 0.7);
      const p = this.particlePool.obtain();
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.life = 0.35 + this.rng.next() * 0.35; p.maxLife = 0.7;
      p.size = 2 + this.rng.next() * 3; p.color = color; p.gravity = 120; p.grow = 0;
      this.particles.push(p);
    }
  }

  // ---------------------------------------------------------------- Steuerung

  get diff(): DifficultyDef { return DIFFICULTIES[this.difficulty]; }

  reset(
    seed = newSeed(),
    difficulty: DifficultyId = this.difficulty,
    mapId: string = this.map.id,
  ): void {
    this.seed = seed;
    this.rng.state = seed;
    this.difficulty = difficulty;
    if (mapId !== this.map.id) this.loadMap(mapId);
    clearGame();
    const d = DIFFICULTIES[difficulty];
    this.gold = d.startGold;
    this.lives = d.startLives;
    this.maxLives = d.startLives;
    this.waveIndex = 0;
    this.waveActive = false;
    this.enemies.length = 0; this.towers.length = 0; this.projectiles.length = 0;
    this.particles.length = 0; this.floats.length = 0;
    this.rings.length = 0; this.bolts.length = 0; this.meteors.length = 0;
    this.husks.length = 0;
    this.flashT = 0;
    this.abilityCd = { meteor: 0, freeze: 0 };
    this.aiming = null;
    this.grid.clear();
    this.towerAt.clear();
    this.towersVersion++;
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
    this.stats = emptyStats();
    this.phase = 'playing';
  }

  // ------------------------------------------------------------- Spielstand

  /** Nur das, was den Verlauf bestimmt. Reine Darstellung bleibt draussen. */
  snapshot(): SaveGame {
    return {
      v: 6,
      difficulty: this.difficulty,
      map: this.map.id,
      seed: this.seed,
      rng: this.rng.state,
      gold: this.gold,
      lives: this.lives,
      waveIndex: this.waveIndex,
      waveActive: this.waveActive,
      waveTime: this.waveTime,
      idleTime: this.idleTime,
      leaked: this.leakedTotal,
      time: this.time,
      speed: this.speed,
      hitstop: this.hitstop,
      stats: this.stats,
      abilityCd: ABILITY_ORDER.map((id) => [id, this.abilityCd[id]] as [AbilityId, number]),
      meteors: this.meteors.map((m) => [m.x, m.y, m.t, m.dur, m.radius, m.damage]) as
        [number, number, number, number, number, number][],
      shots: this.projectiles.map((p) => [
        p.kind, p.x, p.y, p.sx, p.sy, p.tx, p.ty,
        p.target ? this.enemies.indexOf(p.target) : -1,
        p.owner ? this.towers.indexOf(p.owner) : -1,
        p.speed, p.damage, p.slow, p.slowTime, p.splash, p.pierce, p.t, p.dur, p.life, p.color,
      ]) as unknown as SaveGame['shots'],
      pending: this.pending.map((p) => [p.time, p.enemy, p.hpMul, p.lane]),
      towers: this.towers.map((t) => [
        t.def, t.cx, t.cy, t.level, t.kills, t.damageDone, t.cooldownLeft, t.retargetIn, t.branch,
        t.target ? this.enemies.indexOf(t.target) : -1,
      ]) as SaveGame['towers'],
      enemies: this.enemies.map((e) => [
        e.def, e.x, e.y, e.hp, e.hpMax, e.seg, e.travelled, e.slowFactor, e.slowLeft, e.wobble,
        e.lane,
      ]),
    };
  }

  /** Setzt die Partie aus einem Spielstand fort. Gibt false zurueck, wenn der
   *  Stand nicht zu den aktuellen Daten passt - dann wird er verworfen statt
   *  halb geladen. */
  restore(save: SaveGame): boolean {
    if (save.v !== 6) return false;
    if (!MAPS.some((m) => m.id === save.map)) return false;
    if (!(save.difficulty in DIFFICULTIES)) return false;
    if (save.waveIndex < 0 || save.waveIndex > this.map.waves.length) return false;
    for (const [id] of save.towers) if (!(id in TOWERS)) return false;
    for (const [id] of save.enemies) if (!(id in ENEMIES)) return false;
    for (const [, id] of save.pending) if (!(id in ENEMIES)) return false;

    this.reset(save.seed, save.difficulty, save.map);
    this.rng.state = save.rng;
    this.gold = save.gold;
    this.lives = save.lives;
    this.waveIndex = save.waveIndex;
    this.waveActive = save.waveActive;
    this.waveTime = save.waveTime;
    this.idleTime = save.idleTime;
    this.leakedTotal = save.leaked;
    this.hitstop = save.hitstop ?? 0;
    if (save.stats) this.stats = { ...emptyStats(), ...save.stats };
    this.time = save.time;
    this.speed = save.speed === 2 || save.speed === 3 ? save.speed : 1;
    this.pending = save.pending.map(([time, enemy, hpMul, lane]) =>
      ({ time, enemy, hpMul, lane: lane ?? 0 }));
    for (const [id, cd] of save.abilityCd ?? []) {
      if (id in this.abilityCd) this.abilityCd[id] = Math.max(0, cd);
    }
    for (const [x, y, t, dur, radius, damage] of save.meteors ?? []) {
      this.meteors.push({ x, y, t, dur, radius, damage });
    }

    const targetIdx: number[] = [];
    for (const [def, cx, cy, level, kills, damageDone, cooldownLeft, retargetIn, branch, tIdx]
      of save.towers) {
      targetIdx.push(tIdx ?? -1);
      const c = cellCenter(cx, cy);
      const t: Tower = {
        id: this.nextId++, def, cx, cy, x: c.x, y: c.y,
        level, branch: branch ?? null,
        cooldownLeft: cooldownLeft ?? 0, angle: -Math.PI / 2, recoil: 0, flash: 0, pulse: 0,
        target: null, retargetIn: retargetIn ?? 0, kills, damageDone,
      };
      this.towers.push(t);
      this.towerAt.set(cellKey(cx, cy), t);
    }
    this.towersVersion++;

    for (const [def, x, y, hp, hpMax, seg, travelled, slowFactor, slowLeft, wobble, lane]
      of save.enemies) {
      this.enemies.push({
        id: this.nextId++, def, x, y, hp, hpMax,
        speed: ENEMIES[def].speed, lane: lane ?? 0, seg, travelled,
        slowFactor, slowLeft, hitFlash: 0, wobble,
        dead: false, leaked: false,
      });
    }
    for (const sh of save.shots ?? []) {
      const [kind, x, y, sx, sy, tx, ty, tIdx, oIdx,
        speed, damage, slow, slowTime, splash, pierce, t, dur, life, color] =
        sh as unknown as [
          'homing' | 'ballistic', number, number, number, number, number, number,
          number, number, number, number, number, number, number, number,
          number, number, number, string,
        ];
      const p = this.projectilePool.obtain();
      p.kind = kind; p.x = x; p.y = y; p.sx = sx; p.sy = sy; p.tx = tx; p.ty = ty;
      p.target = tIdx >= 0 && tIdx < this.enemies.length ? this.enemies[tIdx] : null;
      p.owner = oIdx >= 0 && oIdx < this.towers.length ? this.towers[oIdx] : null;
      p.speed = speed; p.damage = damage; p.slow = slow; p.slowTime = slowTime;
      p.splash = splash; p.pierce = pierce; p.t = t; p.dur = dur; p.life = life;
      p.color = color; p.dead = false;
      this.projectiles.push(p);
    }

    // Ziele erst jetzt verknuepfen - die Gegner gibt es vorher noch nicht.
    for (let i = 0; i < this.towers.length; i++) {
      const idx = targetIdx[i];
      this.towers[i].target = idx >= 0 && idx < this.enemies.length ? this.enemies[idx] : null;
    }
    this.rebuildGrid();
    this.phase = 'playing';
    return true;
  }

  worldToCell(wx: number, wy: number): Vec {
    return { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
  }
}
