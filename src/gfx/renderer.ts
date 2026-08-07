import { C, COLS, ROWS, TILE, WORLD_H, WORLD_W, START_LIVES } from '../data/config';
import { ENEMIES } from '../data/enemies';
import { TOWERS } from '../data/towers';
import { cellKey } from '../data/maps';
import { makeRng } from '../core/math';
import type { GameState } from '../game/state';
import { hexA, stampGlow } from './glow';
import { bakeTerrain } from './terrain';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement | null = null;
  private sky: HTMLCanvasElement | null = null;
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
    if (!this.terrain) this.terrain = bakeTerrain(s.pathSet, s.blockedSet);
    if (!this.sky) this.sky = this.bakeSky();

    ctx.fillStyle = C.voidDeep;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    if (this.sky) ctx.drawImage(this.sky, 0, 0, this.cssW, this.cssH);

    ctx.save();
    const sh = s.shake;
    const jx = sh > 0 ? (Math.random() - 0.5) * 12 * sh : 0;
    const jy = sh > 0 ? (Math.random() - 0.5) * 12 * sh : 0;
    ctx.translate(this.offX + jx, this.offY + jy);
    ctx.scale(this.scale, this.scale);

    ctx.drawImage(this.terrain!, 0, 0);

    this.drawPortal(s);
    this.drawBuildOverlay(s);
    this.drawCrystal(s);
    this.drawTowers(s);
    this.drawEnemies(s);
    this.drawProjectiles(s);
    this.drawParticles(s);
    this.drawFloats(s);

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
    for (let i = 0; i < 140; i++) {
      const x = rnd() * cv.width, y = rnd() * cv.height;
      const a = 0.12 + rnd() * 0.5;
      g.fillStyle = `rgba(200,225,255,${a})`;
      g.fillRect(x, y, 1.4, 1.4);
    }
    return cv;
  }

  // ------------------------------------------------------------- Welt

  private drawPortal(s: GameState): void {
    const ctx = this.ctx;
    const p = s.points[0];
    const t = s.crystalPulse;
    stampGlow(ctx, C.voidling, p.x + TILE * 0.4, p.y, 70, 0.5 + Math.sin(t * 2) * 0.1);
    ctx.save();
    ctx.translate(p.x + TILE * 0.35, p.y);
    ctx.strokeStyle = hexA(C.voidling, 0.9);
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const r = 16 + i * 9 + Math.sin(t * 3 - i) * 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.4, r, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.8 - i * 0.22;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBuildOverlay(s: GameState): void {
    if (!s.buildChoice) return;
    const ctx = this.ctx;
    const def = TOWERS[s.buildChoice];
    const affordable = s.gold >= def.levels[0].cost;
    ctx.save();
    ctx.lineWidth = 2;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!s.canBuild(x, y)) continue;
        const px = x * TILE, py = y * TILE;
        ctx.fillStyle = affordable ? hexA(def.accent, 0.1) : hexA(C.danger, 0.08);
        ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
        ctx.strokeStyle = affordable ? hexA(def.accent, 0.3) : hexA(C.danger, 0.25);
        ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
      }
    }
    const h = s.hoverCell;
    if (h && s.canBuild(h.x, h.y)) {
      const c = { x: h.x * TILE + TILE / 2, y: h.y * TILE + TILE / 2 };
      ctx.fillStyle = hexA(def.accent, 0.2);
      ctx.beginPath(); ctx.arc(c.x, c.y, def.levels[0].range, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexA(def.accent, 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(c.x, c.y, def.levels[0].range, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeRect(h.x * TILE + 4, h.y * TILE + 4, TILE - 8, TILE - 8);
    }
    ctx.restore();
  }

  private drawCrystal(s: GameState): void {
    const ctx = this.ctx;
    const { x, y } = s.goal;
    const t = s.crystalPulse;
    const health = Math.max(0, s.lives) / START_LIVES;
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    const glowR = (95 + Math.sin(t * 2) * 8) * (0.55 + health * 0.45);

    stampGlow(ctx, C.crystal, x, y, glowR, 0.85);
    if (s.crystalHit > 0) stampGlow(ctx, C.danger, x, y, 120, s.crystalHit * 0.8);

    // Sockel
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = hexA(C.ink, 0.45);
    ctx.beginPath(); ctx.ellipse(0, 30, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2A3348';
    ctx.beginPath();
    ctx.moveTo(-30, 30); ctx.lineTo(30, 30); ctx.lineTo(22, 16); ctx.lineTo(-22, 16);
    ctx.closePath(); ctx.fill();

    // Kristall
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

    // Facetten
    ctx.strokeStyle = hexA('#FFFFFF', 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(0, 22);
    ctx.moveTo(-w, -6); ctx.lineTo(w, -6);
    ctx.stroke();

    // Risse: sichtbarer Zustand statt nur einer Zahl im HUD
    const cracks = Math.round((1 - health) * 5);
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

  private drawTowers(s: GameState): void {
    const ctx = this.ctx;
    for (const t of s.towers) {
      const def = TOWERS[t.def];
      const st = s.stats(t);
      const sel = s.selectedTower === t;

      if (sel) {
        ctx.fillStyle = hexA(def.accent, 0.12);
        ctx.beginPath(); ctx.arc(t.x, t.y, st.range, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = hexA(def.accent, 0.75); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(t.x, t.y, st.range, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.fillStyle = hexA(C.ink, 0.4);
      ctx.beginPath(); ctx.ellipse(0, 20, 26, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Sockel
      ctx.fillStyle = C.stoneDark;
      roundRect(ctx, -24, -8, 48, 28, 8); ctx.fill();
      ctx.fillStyle = def.color;
      roundRect(ctx, -22, -14, 44, 20, 7); ctx.fill();
      ctx.fillStyle = hexA(C.ink, 0.25);
      roundRect(ctx, -22, 0, 44, 6, 3); ctx.fill();

      // Stufen-Punkte
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-14 + i * 14, 12, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = i < t.level ? def.accent : hexA(C.ink, 0.35);
        ctx.fill();
      }

      // Waffe
      ctx.rotate(t.angle);
      const rec = t.recoil * 6;
      if (t.def === 'arrow') {
        ctx.fillStyle = def.color;
        roundRect(ctx, -10 - rec, -5, 34, 10, 5); ctx.fill();
        ctx.fillStyle = def.accent;
        roundRect(ctx, 14 - rec, -3.5, 12, 7, 3.5); ctx.fill();
      } else {
        ctx.rotate(s.crystalPulse * 1.6);
        ctx.fillStyle = def.accent;
        for (let i = 0; i < 3; i++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.moveTo(0, -6); ctx.lineTo(20 - rec, 0); ctx.lineTo(0, 6);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();

      if (t.def === 'frost') stampGlow(ctx, def.accent, t.x, t.y - 6, 34, 0.5);
    }
  }

  private drawEnemies(s: GameState): void {
    const ctx = this.ctx;
    for (const e of s.enemies) {
      const def = ENEMIES[e.def];
      const r = def.radius;
      const wob = Math.sin(s.time * 9 + e.id) * 2;

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = hexA(C.ink, 0.35);
      ctx.beginPath(); ctx.ellipse(0, r * 0.85, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();

      const body = e.hitFlash > 0.01 ? mix(def.body, '#FFFFFF', e.hitFlash * 0.7) : def.body;

      if (e.def === 'runner') {
        const ang = Math.atan2(
          s.points[Math.min(e.seg + 1, s.points.length - 1)].y - e.y,
          s.points[Math.min(e.seg + 1, s.points.length - 1)].x - e.x,
        );
        ctx.rotate(ang);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(r * 1.3, 0); ctx.lineTo(-r * 0.8, r * 0.8); ctx.lineTo(-r * 0.3, 0);
        ctx.lineTo(-r * 0.8, -r * 0.8);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = def.trim;
        ctx.beginPath(); ctx.arc(r * 0.4, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
      } else if (e.def === 'brute') {
        ctx.fillStyle = body;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const px = Math.cos(a) * r, py = Math.sin(a) * r + wob * 0.3;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = def.trim; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = def.trim;
        ctx.fillRect(-r * 0.5, -r * 0.15, r, r * 0.3);
      } else {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(0, wob * 0.4, r, r * 0.92, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.trim;
        ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      if (e.slowLeft > 0) stampGlow(ctx, C.crystal, e.x, e.y, r * 2, 0.4);

      // Lebensbalken nur, wenn der Gegner schon getroffen wurde
      if (e.hp < e.hpMax) {
        const w = r * 2.1, hgt = 4;
        const bx = e.x - w / 2, by = e.y - r - 11;
        ctx.fillStyle = hexA(C.ink, 0.6);
        ctx.fillRect(bx - 1, by - 1, w + 2, hgt + 2);
        const p = e.hp / e.hpMax;
        ctx.fillStyle = p > 0.5 ? '#5FD08A' : p > 0.25 ? C.gold : C.danger;
        ctx.fillRect(bx, by, w * p, hgt);
      }
    }
  }

  private drawProjectiles(s: GameState): void {
    const ctx = this.ctx;
    for (const p of s.projectiles) {
      stampGlow(ctx, p.color, p.x, p.y, 16, 0.6);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawParticles(s: GameState): void {
    const ctx = this.ctx;
    for (const p of s.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawFloats(s: GameState): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.font = '700 22px ui-sans-serif, system-ui, sans-serif';
    for (const f of s.floats) {
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t)) + (((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t)) + (((pb >> 8) & 255) * t));
  const bl = Math.round(((pa & 255) * (1 - t)) + ((pb & 255) * t));
  return `rgb(${r},${g},${bl})`;
}

export const gridKey = cellKey;
