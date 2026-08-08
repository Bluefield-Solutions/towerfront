import { C, COLS, ROWS, TILE, WORLD_H, WORLD_W } from '../data/config';
import { ENEMIES } from '../data/enemies';
import {
  TOWERS, accentFor, statsFor,
  type BranchIndex, type TowerDef, type TowerId, type TowerLevel,
} from '../data/towers';
import { ABILITIES } from '../data/abilities';
import { makeRng } from '../core/math';
import type { GameState } from '../game/state';
import type { Tower } from '../game/types';
import { beginGlowBatch, endGlowBatch, hexA, stampGlow, stampGlowFast } from './glow';
import { bakeTerrain } from './terrain';
import {
  drawSprite, getEnemySprite, getShadow, getTowerBase, getTowerWeapon, ENEMY_FRAMES,
} from './sprites';
import { drawAurora, drawGroundFog, getMoodLayer } from './atmosphere';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement | null = null;
  private terrainFor = '';
  private sky: HTMLCanvasElement | null = null;
  /** Alle Turmsockel in einem Bild. Wird nur neu gebacken, wenn sich am
   *  Bestand etwas aendert - nicht in jedem Bild. */
  private towerLayer: HTMLCanvasElement | null = null;
  private towerLayerVersion = -1;
  /** Partikel werden nach Farbe und Deckkraft gebuendelt, damit nicht fuer
   *  jedes einzelne die Zeichenfarbe neu gesetzt werden muss. */
  private pBatch = new Map<string, number[]>();
  /** Markierung der Einfuehrung auf dem Spielfeld. */
  coachHint: 'build' | 'tower' | null = null;
  scale = 1; offX = 0; offY = 0;
  private cssW = 0; private cssH = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.cssW = w; this.cssH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min(w / WORLD_W, h / WORLD_H);
    this.offX = (w - WORLD_W * this.scale) / 2;
    this.offY = (h - WORLD_H * this.scale) / 2;
    this.sky = null;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.offX) / this.scale, y: (sy - this.offY) / this.scale };
  }

  draw(s: GameState): void {
    const ctx = this.ctx;
    if (!this.terrain || this.terrainFor !== s.map.id) {
      this.terrain = bakeTerrain(s.pathSet, s.blockedSet, s.map.palette);
      this.terrainFor = s.map.id;
      this.towerLayerVersion = -1;
    }
    if (!this.sky) this.sky = this.bakeSky();
    const hi = s.quality === 'hoch';

    ctx.fillStyle = C.voidDeep;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    if (this.sky) ctx.drawImage(this.sky, 0, 0, this.cssW, this.cssH);

    ctx.save();
    const sh = s.shake;
    const jx = sh > 0 ? (Math.random() - 0.5) * 14 * sh : 0;
    const jy = sh > 0 ? (Math.random() - 0.5) * 14 * sh : 0;
    ctx.translate(this.offX + jx, this.offY + jy);
    ctx.scale(this.scale, this.scale);

    ctx.drawImage(this.terrain!, 0, 0);
    ctx.drawImage(getMoodLayer(s.map.palette), 0, 0);
    if (hi) drawAurora(ctx, s.crystalPulse);

    this.drawPortal(s, hi);
    this.drawBuildOverlay(s);
    this.drawCrystal(s, hi);
    this.drawRings(s);
    this.drawTowers(s, hi);
    this.drawHusks(s);
    this.drawEnemies(s, hi);
    this.drawProjectiles(s, hi);
    this.drawBolts(s);
    this.drawParticles(s);
    drawGroundFog(ctx, s.crystalPulse, hi, s.map.palette.haze);
    this.drawMeteors(s, hi);
    this.drawGhost(s);
    this.drawAim(s);
    this.drawCoach(s);
    this.drawFloats(s);

    // Kurzes Aufleuchten des ganzen Feldes. Bewusst ein gefuelltes Rechteck
    // und kein Kopieren der Leinwand auf sich selbst - letzteres laesst
    // iOS Safari nach kurzer Zeit schwarz werden.
    if (s.flashT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA('#FFD8A8', s.flashT * 0.22);
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  // ------------------------------------------------------------- Hintergrund

  private bakeSky(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = Math.max(2, Math.round(this.cssW));
    cv.height = Math.max(2, Math.round(this.cssH));
    const g = cv.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, cv.height);
    grad.addColorStop(0, C.voidMid);
    grad.addColorStop(1, C.voidDeep);
    g.fillStyle = grad;
    g.fillRect(0, 0, cv.width, cv.height);
    const rnd = makeRng(4711);
    for (let i = 0; i < 150; i++) {
      const x = rnd() * cv.width, y = rnd() * cv.height;
      g.fillStyle = `rgba(200,225,255,${0.12 + rnd() * 0.5})`;
      g.fillRect(x, y, 1.4, 1.4);
    }
    return cv;
  }

  private bakeTowerLayer(s: GameState): void {
    if (!this.towerLayer) {
      const cv = document.createElement('canvas');
      cv.width = WORLD_W; cv.height = WORLD_H;
      this.towerLayer = cv;
    }
    const g = this.towerLayer.getContext('2d')!;
    g.clearRect(0, 0, WORLD_W, WORLD_H);
    for (const t of s.towers) {
      drawSprite(g, getTowerBase(t.def, t.branch, t.level), t.x, t.y);
    }
    this.towerLayerVersion = s.towersVersion;
  }

  // ------------------------------------------------------------- Welt

  /** Ein Tor je Bahn - auf mehrspurigen Karten sieht man auf einen Blick,
   *  aus wie vielen Richtungen es kommt. Das Tor dreht sich zur Bahn hin. */
  private drawPortal(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    const t = s.crystalPulse;
    for (const lane of s.lanes) {
      const p = lane[0], nx = lane[1] ?? p;
      const ang = Math.atan2(nx.y - p.y, nx.x - p.x);
      const x = p.x + Math.cos(ang) * TILE * 0.35;
      const y = p.y + Math.sin(ang) * TILE * 0.35;
      if (hi) stampGlow(ctx, C.voidling, x, y, 72, 0.5 + Math.sin(t * 2) * 0.1);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.strokeStyle = hexA(C.voidling, 0.9);
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const r = 16 + i * 9 + Math.sin(t * 3 - i) * 3;
        ctx.globalAlpha = 0.8 - i * 0.22;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.4, r, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawBuildOverlay(s: GameState): void {
    if (!s.buildChoice) return;
    const ctx = this.ctx;
    const def = TOWERS[s.buildChoice];
    const affordable = s.gold >= def.base.cost;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.fillStyle = affordable ? hexA(def.accent, 0.09) : hexA(C.danger, 0.07);
    ctx.strokeStyle = affordable ? hexA(def.accent, 0.26) : hexA(C.danger, 0.22);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!s.canBuild(x, y)) continue;
        ctx.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
        ctx.strokeRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
      }
    }
    ctx.restore();
  }

  /** Halbtransparenter Turm unter dem Finger, samt Reichweite.
   *  Gebaut wird erst beim Loslassen - Fehltipps kosten kein Gold. */
  private drawGhost(s: GameState): void {
    const cell = s.pendingCell ?? (s.hoverCell && s.buildChoice ? s.hoverCell : null);
    if (!cell || !s.buildChoice) return;
    const ctx = this.ctx;
    const def = TOWERS[s.buildChoice];
    const lvl = def.base;
    const ok = s.canBuild(cell.x, cell.y) && s.gold >= lvl.cost;
    const cx = cell.x * TILE + TILE / 2, cy = cell.y * TILE + TILE / 2;
    const tone = ok ? def.accent : C.danger;

    ctx.save();
    ctx.fillStyle = hexA(tone, 0.16);
    ctx.beginPath(); ctx.arc(cx, cy, lvl.range, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(tone, 0.8); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, lvl.range, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(cell.x * TILE + 4, cell.y * TILE + 4, TILE - 8, TILE - 8);
    ctx.setLineDash([]);
    ctx.globalAlpha = ok ? 0.65 : 0.3;
    this.paintTower(def, 1, cx, cy, s.crystalPulse);
    ctx.restore();
  }

  private drawCrystal(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    const { x, y } = s.goal;
    const t = s.crystalPulse;
    const health = Math.max(0, s.lives) / Math.max(1, s.maxLives);
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    const glowR = (95 + Math.sin(t * 2) * 8) * (0.55 + health * 0.45);

    // Lichtpfuetze auf dem Boden - der Kristall beleuchtet seine Umgebung,
    // statt nur selbst zu leuchten.
    if (hi) {
      ctx.save();
      ctx.translate(x, y + 26);
      ctx.scale(1, 0.42);
      stampGlow(ctx, C.crystal, 0, 0, glowR * 2.1, 0.4);
      ctx.restore();
    }
    stampGlow(ctx, C.crystal, x, y, glowR, hi ? 0.9 : 0.55);
    if (s.crystalHit > 0) stampGlow(ctx, C.danger, x, y, 125, s.crystalHit * 0.8);

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = hexA(C.ink, 0.45);
    ctx.beginPath(); ctx.ellipse(0, 30, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2A3348';
    ctx.beginPath();
    ctx.moveTo(-30, 30); ctx.lineTo(30, 30); ctx.lineTo(22, 16); ctx.lineTo(-22, 16);
    ctx.closePath(); ctx.fill();

    ctx.scale(pulse, pulse);
    ctx.translate(0, -4);
    const h = 42, w = 22;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(w, -6); ctx.lineTo(0, 22); ctx.lineTo(-w, -6);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-w, -h, w, 22);
    grad.addColorStop(0, '#EAFFFE');
    grad.addColorStop(0.45, C.crystal);
    grad.addColorStop(1, C.crystalDeep);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = hexA('#EAFFFE', 0.8); ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = hexA('#FFFFFF', 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(0, 22);
    ctx.moveTo(-w, -6); ctx.lineTo(w, -6);
    ctx.stroke();

    // Risse: der Spielstand ist ein Gegenstand in der Welt, keine Zahl.
    const cracks = Math.round((1 - health) * 6);
    if (cracks > 0) {
      const rnd = makeRng(99);
      ctx.strokeStyle = hexA(C.ink, 0.65); ctx.lineWidth = 2;
      for (let i = 0; i < cracks; i++) {
        const sx = (rnd() - 0.5) * w * 1.4;
        const sy = -h + rnd() * (h + 20);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (rnd() - 0.5) * 18, sy + 10 + rnd() * 14);
        ctx.lineTo(sx + (rnd() - 0.5) * 24, sy + 24 + rnd() * 12);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Die Huellen gefallener Gegner: kippen, schrumpfen, verblassen. */
  private drawHusks(s: GameState): void {
    if (!s.husks.length) return;
    const ctx = this.ctx;
    for (const h of s.husks) {
      const k = 1 - h.t;
      ctx.save();
      ctx.globalAlpha = k * 0.85;
      ctx.translate(h.x, h.y - h.alt);
      ctx.rotate(h.angle);
      const shrink = 0.5 + k * 0.5;
      drawSprite(ctx, getEnemySprite(h.def, false, h.frame), 0, 0, shrink);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawRings(s: GameState): void {
    const ctx = this.ctx;
    for (const r of s.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.75;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * a + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawTowers(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    if (this.towerLayerVersion !== s.towersVersion) this.bakeTowerLayer(s);
    if (this.towerLayer) ctx.drawImage(this.towerLayer, 0, 0);

    // Reichweite und Umkreispuls sind Ausnahmen und betreffen wenige Tuerme.
    const sel = s.selectedTower;
    if (sel) {
      const def = TOWERS[sel.def];
      const st = statsFor(def, sel.branch, sel.level);
      const tone = accentFor(def, sel.branch);
      ctx.fillStyle = hexA(tone, 0.12);
      ctx.beginPath(); ctx.arc(sel.x, sel.y, st.range, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexA(tone, 0.75); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, st.range, 0, Math.PI * 2); ctx.stroke();
    }

    for (const t of s.towers) {
      const def = TOWERS[t.def];
      if (def.attack === 'aura' && t.pulse > 0) {
        ctx.strokeStyle = hexA(accentFor(def, t.branch), t.pulse * 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, s.towerStats(t).range * (1 - t.pulse * 0.15), 0, Math.PI * 2);
        ctx.stroke();
      }
      this.paintWeapon(t.def, t.branch, t.level, t.x, t.y, t.angle, t.recoil, t.pulse, s.crystalPulse);
    }

    if (hi) {
      beginGlowBatch(ctx);
      for (const t of s.towers) {
        const def = TOWERS[t.def];
        const tone = accentFor(def, t.branch);
        if (def.attack === 'aura' || def.attack === 'chain') {
          stampGlowFast(ctx, tone, t.x, t.y - 8, 36, 0.5);
        }
        // Muendungsblitz: erhellt kurz die Stellung und den Boden davor.
        if (t.flash > 0.02) {
          const st = s.towerStats(t);
          const reach = def.attack === 'aura' ? 0 : 26;
          stampGlowFast(ctx, tone,
            t.x + Math.cos(t.angle) * reach, t.y + Math.sin(t.angle) * reach,
            44 + t.flash * 16, t.flash * 0.75);
          void st;
        }
      }
      endGlowBatch(ctx);
    }
  }

  /** Ein gebackenes Waffenbild, gedreht und um den Rueckstoss versetzt.
   *  Statt eines Dutzends Pfadbefehle bleibt ein `drawImage`. */
  private paintWeapon(
    id: TowerId, branch: BranchIndex, level: number, x: number, y: number,
    angle: number, recoil: number, pulse: number, time: number,
  ): void {
    const ctx = this.ctx;
    const def = TOWERS[id];
    const sprite = getTowerWeapon(id, branch, level);
    ctx.save();
    ctx.translate(x, y);
    if (def.attack === 'single') {
      ctx.rotate(angle);
      ctx.translate(-recoil * 6, 0);
      drawSprite(ctx, sprite, 0, 0);
    } else if (def.attack === 'splash') {
      ctx.rotate(angle);
      ctx.translate(-recoil * 10, 0);
      drawSprite(ctx, sprite, 0, 0);
    } else if (def.attack === 'aura') {
      ctx.rotate(time * 1.5);
      drawSprite(ctx, sprite, 0, 0, 1 + pulse * 0.08);
    } else {
      ctx.translate(0, -20 + Math.sin(time * 2.2) * 3);
      ctx.rotate(time * 0.9);
      drawSprite(ctx, sprite, 0, 0);
    }
    ctx.restore();
  }

  /** Nur fuer die Bauvorschau: Sockel und Waffe eines noch nicht gebauten Turms. */
  private paintTower(def: TowerDef, level: number, x: number, y: number, time: number): void {
    drawSprite(this.ctx, getTowerBase(def.id, null, level), x, y);
    this.paintWeapon(def.id, null, level, x, y, -Math.PI / 2, 0, 0, time);
  }

  /** Flughoehe eines Schwaermers: der Koerper schwebt ueber seinem Schatten,
   *  damit sofort lesbar ist, warum der Moerser ihn nicht erwischt. */
  private altitude(e: { wobble: number }, t: number, flying: boolean): number {
    return flying ? 30 + Math.sin(t * 6 + e.wobble) * 3 : 0;
  }

  private drawEnemies(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    const list = s.enemies;

    // Schatten zuerst, alle mit demselben gebackenen Bild.
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const def = ENEMIES[e.def];
      if (def.flying) {
        ctx.globalAlpha = 0.55;
        drawSprite(ctx, getShadow(def.radius), e.x, e.y + 6, 0.8);
        ctx.globalAlpha = 1;
      } else {
        drawSprite(ctx, getShadow(def.radius), e.x, e.y + def.radius * 0.85);
      }
    }

    if (hi) {
      let boss = false;
      for (let i = 0; i < list.length; i++) if (ENEMIES[list[i].def].boss) { boss = true; break; }
      if (boss) {
        beginGlowBatch(ctx);
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          const def = ENEMIES[e.def];
          if (def.boss) stampGlowFast(ctx, def.trim, e.x, e.y, def.radius * 2.4, 0.6);
        }
        endGlowBatch(ctx);
      }
    }

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const def = ENEMIES[e.def];
      const wob = Math.sin(s.time * 9 + e.wobble) * 2;
      const alt = this.altitude(e, s.time, !!def.flying);
      const rotating = e.def === 'runner' || !!def.flying;
      // Die Laufphase haengt an der zurueckgelegten Strecke, nicht an der Uhr:
      // ein gebremster Gegner bewegt die Beine langsamer.
      const cycle = def.flying ? s.time * 7 + e.wobble : e.travelled / 26 + e.wobble;
      const frame = Math.floor(cycle) % ENEMY_FRAMES;

      if (rotating || def.boss) {
        ctx.save();
        ctx.translate(e.x, e.y - alt);
        if (def.flying) {
          ctx.rotate(Math.atan2(s.goal.y - e.y, s.goal.x - e.x));
        } else if (rotating) {
          const path = s.lanes[e.lane] ?? s.lanes[0];
          const nx = path[Math.min(e.seg + 1, path.length - 1)];
          ctx.rotate(Math.atan2(nx.y - e.y, nx.x - e.x));
        }
        drawSprite(ctx, getEnemySprite(e.def, false, frame), 0, 0);
        if (e.hitFlash > 0.01) {
          ctx.globalAlpha = e.hitFlash * 0.7;
          drawSprite(ctx, getEnemySprite(e.def, true, frame), 0, 0);
          ctx.globalAlpha = 1;
        }
        if (def.boss) {
          ctx.rotate(s.time * 0.8);
          ctx.strokeStyle = hexA(def.trim, 0.7); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, def.radius * 1.35, 0, Math.PI * 1.3); ctx.stroke();
        }
        ctx.restore();
      } else {
        drawSprite(ctx, getEnemySprite(e.def, false, frame), e.x, e.y + wob * 0.4);
        if (e.hitFlash > 0.01) {
          ctx.globalAlpha = e.hitFlash * 0.7;
          drawSprite(ctx, getEnemySprite(e.def, true, frame), e.x, e.y + wob * 0.4);
          ctx.globalAlpha = 1;
        }
      }

      if (e.slowLeft > 0) {
        ctx.strokeStyle = hexA(C.crystal, 0.7);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y - alt, def.radius + 4, 0, Math.PI * 2); ctx.stroke();
      }
    }

    this.drawHealthBars(s);
  }

  /** Lebensbalken gesammelt: erst alle Hintergruende, dann die Fuellungen nach
   *  Farbe gruppiert. Spart pro Balken zwei Farbwechsel. */
  private drawHealthBars(s: GameState): void {
    const ctx = this.ctx;
    const list = s.enemies;
    let any = false;
    for (let i = 0; i < list.length; i++) if (list[i].hp < list[i].hpMax) { any = true; break; }
    if (!any) return;

    ctx.fillStyle = hexA(C.ink, 0.6);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.hp >= e.hpMax) continue;
      const def = ENEMIES[e.def];
      const w = Math.max(def.radius * 2.1, def.boss ? 90 : 0);
      const h = def.boss ? 7 : 4;
      const a = this.altitude(e, s.time, !!def.flying);
      ctx.fillRect(e.x - w / 2 - 1, e.y - a - def.radius - 13, w + 2, h + 2);
    }
    const tones = ['#5FD08A', C.gold, C.danger];
    for (let band = 0; band < 3; band++) {
      let drew = false;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.hp >= e.hpMax) continue;
        const p = e.hp / e.hpMax;
        const b = p > 0.5 ? 0 : p > 0.25 ? 1 : 2;
        if (b !== band) continue;
        if (!drew) { ctx.fillStyle = tones[band]; drew = true; }
        const def = ENEMIES[e.def];
        const w = Math.max(def.radius * 2.1, def.boss ? 90 : 0);
        const h = def.boss ? 7 : 4;
        const a = this.altitude(e, s.time, !!def.flying);
        ctx.fillRect(e.x - w / 2, e.y - a - def.radius - 12, w * p, h);
      }
    }
  }

  private drawProjectiles(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    const list = s.projectiles;
    if (!list.length) return;

    if (hi) {
      beginGlowBatch(ctx);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const py = p.kind === 'ballistic' ? p.y - Math.sin(p.t * Math.PI) * 46 : p.y;
        stampGlowFast(ctx, p.color, p.x, py, p.splash ? 24 : 16, 0.6);
      }
      endGlowBatch(ctx);
    }

    // Bodenschatten der Wurfgeschosse zusammen.
    let ballistic = false;
    for (let i = 0; i < list.length; i++) if (list[i].kind === 'ballistic') { ballistic = true; break; }
    if (ballistic) {
      ctx.fillStyle = hexA(C.ink, 0.28);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (p.kind !== 'ballistic') continue;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const py = p.kind === 'ballistic' ? p.y - Math.sin(p.t * Math.PI) * 46 : p.y;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, py, p.splash ? 7 : 4.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawBolts(s: GameState): void {
    const ctx = this.ctx;
    for (const b of s.bolts) {
      const a = Math.max(0, b.life / b.maxLife);
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 5 * a + 1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < b.pts.length - 1; i++) {
        const p0 = b.pts[i], p1 = b.pts[i + 1];
        ctx.moveTo(p0.x, p0.y);
        // Ein Knick pro Abschnitt reicht fuer den Blitzeindruck.
        const mx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 26;
        const my = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * 26;
        ctx.lineTo(mx, my);
        ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /** Partikel nach Farbe und Deckkraftstufe gebuendelt. Vorher kostete jedes
   *  einzelne Teilchen einen Deckkraft- und einen Farbwechsel; jetzt fallen
   *  beide nur noch je Buendel an. */
  private drawParticles(s: GameState): void {
    const ctx = this.ctx;
    const list = s.particles;
    if (!list.length) return;
    const batch = this.pBatch;
    for (const arr of batch.values()) arr.length = 0;

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const a = p.life / p.maxLife;
      const bucket = a > 0.75 ? 3 : a > 0.5 ? 2 : a > 0.25 ? 1 : 0;
      const key = `${p.color}|${bucket}`;
      let arr = batch.get(key);
      if (!arr) { arr = []; batch.set(key, arr); }
      arr.push(p.x - p.size / 2, p.y - p.size / 2, p.size);
    }

    for (const [key, arr] of batch) {
      if (!arr.length) continue;
      const bar = key.lastIndexOf('|');
      ctx.fillStyle = key.slice(0, bar);
      ctx.globalAlpha = (Number(key.slice(bar + 1)) + 0.5) / 4;
      ctx.beginPath();
      for (let i = 0; i < arr.length; i += 3) ctx.rect(arr[i], arr[i + 1], arr[i + 2], arr[i + 2]);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Anflug und Einschlagmarke. Der Ring zieht sich zusammen, damit man den
   *  Zeitpunkt sieht und nicht nur das Ergebnis. */
  private drawMeteors(s: GameState, hi: boolean): void {
    if (!s.meteors.length) return;
    const ctx = this.ctx;
    const tone = ABILITIES.meteor.color;
    for (const m of s.meteors) {
      const t = Math.min(1, m.t);
      ctx.strokeStyle = hexA(tone, 0.35 + t * 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(m.x, m.y, m.radius * (1 - t * 0.9), 0, Math.PI * 2); ctx.stroke();

      // Der Brocken faellt von oben rechts ins Ziel.
      const fx = m.x + 340 * (1 - t);
      const fy = m.y - 620 * (1 - t);
      if (hi) stampGlow(ctx, tone, fx, fy, 46, 0.8);
      ctx.strokeStyle = hexA(tone, 0.75);
      ctx.lineWidth = 7 * t + 2;
      ctx.beginPath();
      ctx.moveTo(fx + 46, fy - 84); ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = '#FFF3E2';
      ctx.beginPath(); ctx.arc(fx, fy, 11, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** Zielhilfe fuer eine angewaehlte Faehigkeit. */
  private drawAim(s: GameState): void {
    if (!s.aiming) return;
    const def = ABILITIES[s.aiming];
    if (def.kind !== 'aimed' || !def.radius) return;
    const cell = s.pendingCell ?? s.hoverCell;
    if (!cell) return;
    const ctx = this.ctx;
    const x = cell.x * TILE + TILE / 2, y = cell.y * TILE + TILE / 2;
    ctx.save();
    ctx.fillStyle = hexA(def.color, 0.16);
    ctx.beginPath(); ctx.arc(x, y, def.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(def.color, 0.9);
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(x, y, def.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 16); ctx.lineTo(x, y + 16);
    ctx.stroke();
    ctx.restore();
  }

  /** Zeigt auf den empfohlenen Bauplatz oder auf den ersten Turm. Ein Pfeil,
   *  der sich bewegt - der Satz in der Blase braucht eine Adresse im Bild. */
  private drawCoach(s: GameState): void {
    if (!this.coachHint) return;
    let x: number, y: number, r: number;
    if (this.coachHint === 'build') {
      const h = s.map.hint;
      if (!s.canBuild(h.x, h.y)) return;
      x = h.x * TILE + TILE / 2; y = h.y * TILE + TILE / 2; r = TILE * 0.52;
    } else {
      const t = s.towers[0];
      if (!t) return;
      x = t.x; y = t.y; r = TILE * 0.5;
    }
    const ctx = this.ctx;
    const beat = 0.5 + 0.5 * Math.sin(s.crystalPulse * 4);
    ctx.save();
    ctx.strokeStyle = hexA(C.crystal, 0.5 + beat * 0.5);
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -s.crystalPulse * 30;
    ctx.beginPath(); ctx.arc(x, y, r + beat * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    const ay = y - r - 26 - beat * 8;
    ctx.fillStyle = hexA(C.crystal, 0.85 + beat * 0.15);
    ctx.beginPath();
    ctx.moveTo(x, ay + 20); ctx.lineTo(x - 13, ay); ctx.lineTo(x + 13, ay);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  private drawFloats(s: GameState): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    for (const f of s.floats) {
      ctx.font = `700 ${f.size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.globalAlpha = Math.min(1, f.life * 1.6);
      ctx.lineWidth = 4;
      ctx.strokeStyle = hexA(C.ink, 0.8);
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}

export type { Tower, TowerLevel };
