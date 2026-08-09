import { C, LICHT, WORLD_H, WORLD_W } from '../data/config';
import { ENEMIES } from '../data/enemies';
import {
  TOWERS, accentFor, statsFor,
  type BranchIndex, type TowerDef, type TowerId, type TowerLevel,
  DRAW_SCALE,
} from '../data/towers';
import { ABILITIES } from '../data/abilities';
import { makeRng } from '../core/math';
import { GameState } from '../game/state';
import type { Tower } from '../game/types';
import { beginGlowBatch, endGlowBatch, hexA, stampGlow, stampGlowFast } from './glow';
import { bakeTerrain } from './terrain';
import { snap } from '../data/maps';
import { drawMenu } from './menurender';
import type { Menu } from '../game/menu';
import { backgroundVersion, getBackground } from './backgrounds';
import { artBreite, getTowerArt, towerArtScale, towerArtVersion } from './towerart';
import { getObjectArt } from './objectart';
import { enemyArtWidth, getEnemyArt } from './enemyart';
import {
  drawSprite, getEnemySprite, getShadow, getTowerBase, getTowerWeapon, ENEMY_FRAMES,
} from './sprites';
import { drawAurora, drawGroundFog, getMoodLayer } from './atmosphere';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement | null = null;
  private terrainFor = '';
  private terrainBgVersion = -1;
  /** Weltpunkt, auf den gerade gezielt wird. */
  aimPoint: { x: number; y: number } | null = null;
  /** Ist gesetzt, solange das Menue offen ist - dann wird es statt des
   *  Spielfeldes gezeichnet. */
  menu: Menu | null = null;
  private sky: HTMLCanvasElement | null = null;
  /** Alle Turmsockel in einem Bild. Wird nur neu gebacken, wenn sich am
   *  Bestand etwas aendert - nicht in jedem Bild. */
  private towerLayer: HTMLCanvasElement | null = null;
  private towerLayerVersion = -1;
  private towerArtVersionAt = -1;
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

  /** `insetTop` und `insetBottom` sind die Baender, die Kopfzeile und
   *  Bedienleiste belegen. Das Spielfeld wird nur in den Bereich dazwischen
   *  gezeichnet - vorher lag die Bedienung ueber dem Brett, und das untere
   *  Drittel des Feldes war schlicht verdeckt. */
  /** Kamera.
   *
   *  Bis v29 wurde das Spielfeld zwischen Kopfzeile und Bedienleiste
   *  eingepasst - das Brett lag als Insel in der Mitte, mit breiten toten
   *  Raendern. Die Vorbilder des Genres machen es umgekehrt: die Karte fuellt
   *  den Bildschirm, die Bedienung schwebt darueber.
   *
   *  Zwei Bezugsgroessen:
   *  - `fitScale`  - alles ist sichtbar, es bleiben Raender
   *  - `coverScale`- der Bildschirm ist gefuellt, es wird beschnitten
   *
   *  **`coverScale` ist die Untergrenze, nicht `fitScale`.** Solange das Feld
   *  ein gezeichnetes Brett war, waren Raender daneben vertretbar. Seit die
   *  Karte ein Bild ist, sind sie es nicht: wer herauszog, sah schwarze
   *  Balken um das Bild, und weil die Himmelsschicht sich dabei je Bild neu
   *  aufbaute, flackerte es dazu. Gemeldet aus dem Spiel, und zu Recht.
   *
   *  Der Startwert ist `coverScale`. Herausziehen endet dort; wer Genaues
   *  braucht, zieht hinein. Verschieben ist immer so begrenzt, dass kein Rand
   *  des Feldes ins Bild rutscht. */
  private zoom = 1;
  private camX = WORLD_W / 2;
  private camY = WORLD_H / 2;
  fitScale = 1;
  coverScale = 1;

  /** Wie weit man hoechstens herausziehen darf.
   *
   *  Die eine Stelle, an der diese Regel steht. Vorher stand sie zweimal -
   *  einmal beim Zoomen, einmal beim Nachkorrigieren - und die Gegenprobe
   *  konnte den Fehler nicht nachstellen, weil die jeweils andere Stelle ihn
   *  gleich wieder ausbuegelte. Eine Regel an zwei Stellen ist eine Regel,
   *  die man nicht pruefen kann. */
  private get minZoom(): number { return this.coverScale; }
  private get maxZoom(): number { return this.coverScale * 3; }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    const wasAtCover = Math.abs(this.zoom - this.coverScale) < 1e-6;
    this.cssW = w; this.cssH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.fitScale = Math.min(w / WORLD_W, h / WORLD_H);
    this.coverScale = Math.max(w / WORLD_W, h / WORLD_H);
    // Beim ersten Mal und solange nicht selbst gezoomt wurde: Bildschirm fuellen.
    if (this.zoom <= 0 || wasAtCover) this.zoom = this.coverScale;
    this.clamp();
    this.sky = null;
  }

  /** Grenzen einhalten: nie ueber den Rand des Feldes hinaus, und wenn das
   *  Feld in einer Richtung kleiner ist als der Bildschirm, mittig. */
  private clamp(): void {
    this.zoom = Math.min(Math.max(this.zoom, this.minZoom), this.maxZoom);
    const halfW = this.cssW / 2 / this.zoom;
    const halfH = this.cssH / 2 / this.zoom;
    this.camX = halfW * 2 >= WORLD_W
      ? WORLD_W / 2
      : Math.min(Math.max(this.camX, halfW), WORLD_W - halfW);
    this.camY = halfH * 2 >= WORLD_H
      ? WORLD_H / 2
      : Math.min(Math.max(this.camY, halfH), WORLD_H - halfH);
    this.scale = this.zoom;
    this.offX = this.cssW / 2 - this.camX * this.zoom;
    this.offY = this.cssH / 2 - this.camY * this.zoom;
  }

  /** Verschieben um eine Strecke in Bildschirmpunkten. */
  panBy(dx: number, dy: number): void {
    this.camX -= dx / this.zoom;
    this.camY -= dy / this.zoom;
    this.clamp();
  }

  /** Zoomen um einen festen Punkt auf dem Bildschirm - der bleibt stehen,
   *  alles andere bewegt sich darum herum. Ohne das rutscht beim Kneifen
   *  immer der falsche Ausschnitt weg. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const before = this.screenToWorld(sx, sy);
    this.zoom = Math.min(Math.max(this.zoom * factor, this.minZoom), this.maxZoom);
    this.clamp();
    const after = this.screenToWorld(sx, sy);
    this.camX += before.x - after.x;
    this.camY += before.y - after.y;
    this.clamp();
  }

  /** Bildschirmpunkt -> Weltkoordinate. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    if (this.menu) {
      // Im Menue gilt die eingepasste Abbildung, sonst traefe man daneben.
      const k = Math.min(this.cssW / WORLD_W, this.cssH / WORLD_H);
      return {
        x: (sx - (this.cssW - WORLD_W * k) / 2) / k,
        y: (sy - (this.cssH - WORLD_H * k) / 2) / k,
      };
    }
    return { x: (sx - this.offX) / this.scale, y: (sy - this.offY) / this.scale };
  }

  /** Weltkoordinate -> Bildschirmpunkt. */
  /** Das Menue fuellt dieselbe Flaeche wie das Spielfeld - dadurch stimmen
   *  Bedienung und Bild ohne Sonderfaelle zusammen, und die Bildabnahme sieht
   *  es genauso wie der Browser. */
  private drawMenuFrame(): void {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.voidDeep;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    // Das Menue ist eine feste Anordnung - es muss ganz sichtbar sein.
    // Deshalb wird es eingepasst und nicht wie das Spielfeld formatfuellend
    // beschnitten. Beim ersten Versuch lagen Titel und Startknopf ausserhalb.
    const k = Math.min(this.cssW / WORLD_W, this.cssH / WORLD_H);
    ctx.save();
    ctx.translate((this.cssW - WORLD_W * k) / 2, (this.cssH - WORLD_H * k) / 2);
    ctx.scale(k, k);
    drawMenu(ctx, this.menu!);
    ctx.restore();
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: wx * this.scale + this.offX, y: wy * this.scale + this.offY };
  }

  /** Zwischen Uebersicht und Nahsicht umschalten.
   *
   *  Die Uebersicht ist jetzt `coverScale` - weiter heraus geht nicht mehr.
   *  Die Nahsicht ist das Doppelte davon. */
  toggleOverview(): void {
    // Die Grenze ist anteilig, nicht absolut: bei einem sehr breiten Fenster
    // liegt coverScale weit ueber 1, und ein fester Schwellwert traf dann
    // nie zu. Schon der vierte Fall dieser Art.
    const atCover = this.zoom <= this.coverScale * 1.001;
    this.zoom = atCover ? this.coverScale * 2 : this.coverScale;
    this.clamp();
  }

  get atOverview(): boolean {
    return this.zoom <= this.coverScale * 1.001;
  }

  /** Passt das Bildraster der Leinwand noch zu ihrer Flaeche auf dem
   *  Bildschirm? Wenn nicht, streckt der Browser das fertige Bild - und zwar
   *  in beide Richtungen unterschiedlich. Genau so entstand in v27 ein
   *  flachgedruecktes Spielfeld: `resize` war einmal zu frueh gelaufen, die
   *  Leinwand behielt ihre Standardgroesse von 300 x 150, und das CSS zog
   *  dieses Raster ueber den ganzen Bildschirm.
   *
   *  Deshalb wird das jetzt in jedem Bild geprueft, nicht nur bei einem
   *  Groessenwechsel. Die Pruefung kostet zwei Vergleiche. */
  private ensureFrame(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wantW = Math.round(w * dpr), wantH = Math.round(h * dpr);
    if (this.canvas.width !== wantW || this.canvas.height !== wantH) {
      this.resize();
    }
  }

  /** Weicht das Seitenverhaeltnis des Bildrasters von dem der Flaeche ab?
   *  Nur fuer die Pruefwerkzeuge - im Spiel darf das nie vorkommen. */
  frameSkew(): number {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h || !this.canvas.height) return 0;
    return Math.abs((this.canvas.width / this.canvas.height) / (w / h) - 1);
  }

  draw(s: GameState): void {
    this.ensureFrame();
    const ctx = this.ctx;
    if (this.menu) { this.drawMenuFrame(); return; }
    // Neu backen bei Kartenwechsel - und noch einmal, sobald das
    // Untergrundbild fertig dekodiert ist.
    const bgV = backgroundVersion();
    if (!this.terrain || this.terrainFor !== s.map.id || this.terrainBgVersion !== bgV) {
      this.terrain = bakeTerrain(s.map, s.lanes, s.map.palette, getBackground(s.map.id));
      this.terrainFor = s.map.id;
      this.terrainBgVersion = bgV;
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
    // Nur die gezeichneten Tuerme kommen in die Schicht. Gerenderte werden
    // je Bild gezeichnet, weil sie sich zum Ziel hin spiegeln.
    for (const t of s.towers) {
      if (getTowerArt(t.def, t.branch, t.level, s.map.id)) continue;
      drawSprite(g, getTowerBase(t.def, t.branch, t.level), t.x, t.y);
    }
    this.towerLayerVersion = s.towersVersion;
    this.towerArtVersionAt = towerArtVersion();
  }

  // ------------------------------------------------------------- Welt

  /** Ein Tor je Bahn - auf mehrspurigen Karten sieht man auf einen Blick,
   *  aus wie vielen Richtungen es kommt. Das Tor dreht sich zur Bahn hin. */
  private drawPortal(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    const t = s.crystalPulse;
    for (const lane of s.lanes) {
      // Weit genug ins Feld hinein, damit das Tor auch zu sehen ist.
      //
      // Der Bahnanfang liegt bewusst vor der Bildkante - dort beginnt der Weg.
      // Bei 34 Pixeln Abstand stand das Tor deshalb halb ausserhalb. Der Wert
      // muss groesser sein als der Ueberstand des Bahnanfangs.
      const p = lane.pts[0], nx = lane.pts[1] ?? p;
      const ang = Math.atan2(nx.y - p.y, nx.x - p.x);
      const hinein = 150;
      const x = p.x + Math.cos(ang) * hinein;
      const y = p.y + Math.sin(ang) * hinein;
      if (hi) stampGlow(ctx, C.voidling, x, y, 72, 0.5 + Math.sin(t * 2) * 0.1);

      const art = getObjectArt('gate');
      if (art) {
        // Das Tor steht aufrecht und wird NICHT zur Bahn gedreht - es ist ein
        // Bauwerk, kein Fahrzeug. Ein gedrehtes Steintor liegt schief in der
        // Landschaft. Verschoben wird es stattdessen so, dass der Durchgang
        // dort liegt, wo die Bahn beginnt.
        const b = 132 * (1 + Math.sin(t * 2) * 0.012);
        const h = b * (art.height / art.width);
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.ellipse(x + LICHT.x * b * 0.3, y + LICHT.y * b * 0.16, b * 0.42, b * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.drawImage(art, x - b / 2, y - h * 0.78, b, h);
        ctx.restore();
      } else {
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
    }
    ctx.globalAlpha = 1;
  }

  /** Die Bauplätze antworten auf die Turmwahl.
   *
   *  Ohne gewaehlte Turmsorte bleibt das Brett ruhig - die Plattformen sind
   *  nur als Struktur im Untergrund zu ahnen. Erst die Wahl hebt sie hervor:
   *  gruen, wenn bezahlbar, rot, wenn das Gold fehlt, gedaempft, wenn schon
   *  besetzt. */
  /** Das Feld antwortet auf die Turmwahl.
   *
   *  Gezeigt wird nicht mehr eine Handvoll fester Plaetze, sondern die ganze
   *  Flaeche, auf der dieser Turm stehen darf - gruen. Weil das von seinem
   *  Platzbedarf abhaengt, sieht die Flaeche fuer den Moerser anders aus als
   *  fuer den Bogenturm, und genau das ist die Entscheidung.
   *
   *  Die Flaeche wird gebacken und nur neu gerechnet, wenn sich Turmsorte
   *  oder Turmbestand aendern - sonst waeren es zehntausend Pruefungen je Bild.
   */
  private buildMask: HTMLCanvasElement | null = null;
  private buildMaskKey = '';

  private drawBuildOverlay(s: GameState): void {
    if (!s.buildChoice) return;
    const ctx = this.ctx;
    const def = TOWERS[s.buildChoice];
    const affordable = s.gold >= def.base.cost;
    const key = `${s.map.id}|${s.buildChoice}|${s.towersVersion}|${affordable}`;

    if (this.buildMaskKey !== key) {
      const STEP = 12;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(WORLD_W / STEP);
      cv.height = Math.ceil(WORLD_H / STEP);
      const g = cv.getContext('2d')!;
      g.fillStyle = affordable ? '#5BE07A' : C.danger;
      for (let gy = 0; gy < cv.height; gy++) {
        for (let gx = 0; gx < cv.width; gx++) {
          if (s.canPlace(s.buildChoice, gx * STEP, gy * STEP)) g.fillRect(gx, gy, 1, 1);
        }
      }
      this.buildMask = cv;
      this.buildMaskKey = key;
    }

    const beat = 0.5 + 0.5 * Math.sin(s.crystalPulse * 2.4);
    ctx.save();
    ctx.globalAlpha = (affordable ? 0.2 : 0.12) + beat * 0.07;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buildMask!, 0, 0, WORLD_W, WORLD_H);
    ctx.restore();
  }

  private drawGhost(s: GameState): void {
    const at = s.pendingPoint ?? (s.buildChoice ? s.hoverPoint : null);
    if (!at || !s.buildChoice) return;
    const ctx = this.ctx;
    const def = TOWERS[s.buildChoice];
    const lvl = def.base;
    const x = snap(at.x), y = snap(at.y);
    const ok = s.canPlace(s.buildChoice, x, y) && s.gold >= lvl.cost;
    const tone = ok ? def.accent : C.danger;

    ctx.save();
    // Der Platzbedarf als eigener Kreis - er ist die eigentliche Groesse,
    // ueber die man beim freien Bauen entscheidet.
    ctx.fillStyle = hexA(tone, 0.2);
    ctx.beginPath(); ctx.arc(x, y, def.footprint / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(tone, 0.9); ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(x, y, def.footprint / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = hexA(tone, 0.12);
    ctx.beginPath(); ctx.arc(x, y, lvl.range, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(tone, 0.7); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, lvl.range, 0, Math.PI * 2); ctx.stroke();

    if (ok) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(tone, 0.55);
      ctx.lineWidth = 12;
      const r2 = lvl.range * lvl.range;
      for (const lane of s.lanes) {
        let drawing = false;
        ctx.beginPath();
        for (const p of lane.pts) {
          const inside = (p.x - x) ** 2 + (p.y - y) ** 2 <= r2;
          if (inside && !drawing) { ctx.moveTo(p.x, p.y); drawing = true; }
          else if (inside) ctx.lineTo(p.x, p.y);
          else if (drawing) { ctx.stroke(); ctx.beginPath(); drawing = false; }
        }
        if (drawing) ctx.stroke();
      }
      ctx.restore();
    }

    ctx.globalAlpha = ok ? 0.7 : 0.3;
    this.paintTower(def, 1, x, y, s.crystalPulse, s.map.id);
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
    ctx.beginPath(); ctx.ellipse(0, 48, 62, 21, 0, 0, Math.PI * 2); ctx.fill();
    // Ein gestufter Sockel gibt dem Kristall Stand und Groesse.
    ctx.fillStyle = '#1D2436';
    ctx.beginPath();
    ctx.moveTo(-56, 48); ctx.lineTo(56, 48); ctx.lineTo(43, 28); ctx.lineTo(-43, 28);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2A3348';
    ctx.beginPath();
    ctx.moveTo(-43, 28); ctx.lineTo(43, 28); ctx.lineTo(34, 11); ctx.lineTo(-34, 11);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = hexA('#FFFFFF', 0.12);
    ctx.fillRect(-43, 27, 86, 3);

    ctx.scale(pulse, pulse);
    ctx.translate(0, -20);
    const h = 82, w = 42;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(w, -10); ctx.lineTo(0, 30); ctx.lineTo(-w, -10);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-w, -h, w, 30);
    grad.addColorStop(0, '#EAFFFE');
    grad.addColorStop(0.45, C.crystal);
    grad.addColorStop(1, C.crystalDeep);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = hexA('#EAFFFE', 0.8); ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = hexA('#FFFFFF', 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(0, 30);
    ctx.moveTo(-w, -10); ctx.lineTo(w, -10);
    ctx.moveTo(0, -h); ctx.lineTo(-w * 0.55, 10);
    ctx.moveTo(0, -h); ctx.lineTo(w * 0.55, 10);
    ctx.stroke();

    // Risse: der Spielstand ist ein Gegenstand in der Welt, keine Zahl.
    const cracks = Math.round((1 - health) * 6);
    if (cracks > 0) {
      const rnd = makeRng(99);
      ctx.strokeStyle = hexA(C.ink, 0.65); ctx.lineWidth = 2;
      for (let i = 0; i < cracks; i++) {
        const sx = (rnd() - 0.5) * w * 1.4;
        const sy = -h + rnd() * (h + 28);
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
      const art = getEnemyArt(h.def, false, s.map.id);
      if (art) {
        const w = enemyArtWidth(h.def) * shrink;
        const hh = w * (art.height / art.width);
        ctx.drawImage(art, -w / 2, -hh * 0.72, w, hh);
      } else {
        drawSprite(ctx, getEnemySprite(h.def, false, h.frame), 0, 0, shrink);
      }
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
    if (this.towerLayerVersion !== s.towersVersion ||
      this.towerArtVersionAt !== towerArtVersion()) this.bakeTowerLayer(s);
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
      // Bei gerenderten Tuermen entfaellt die drehbare Waffe: ein Objekt in
      // Dreiviertelansicht kippt, wenn man es in der Flaeche dreht. Statt zu
      // drehen wird gespiegelt, sobald das Ziel links steht.
      const art = getTowerArt(t.def, t.branch, t.level, s.map.id);
      if (art) {
        const masse = this.artMasse(t.def, t.branch, t.level, art);
        const w = masse.w, h = masse.h;

        // Ein Schlagschatten in Lichtrichtung.
        //
        // Bis v59 warfen gerenderte Tuerme gar keinen - sie standen auf dem
        // Boden, ohne ihn zu beruehren. Auf dem Kartenbild wirft jeder Fels
        // und jeder Stumpf seinen Schatten nach unten rechts; ein Turm ohne
        // Schatten schwebt dann sichtbar darueber. Der Schatten ist das, was
        // ein Objekt in eine Szene setzt.
        const fuss = TOWERS[def.id].footprint / 2;
        ctx.save();
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.ellipse(
          t.x + LICHT.x * fuss * 0.85, t.y + LICHT.y * fuss * 0.42,
          fuss * 1.05, fuss * 0.44, 0.32, 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();

        // Ein Farbring am Fuss zeigt den Ausbauzweig.
        //
        // Solange die Zweige auf dieselben Bilder zurueckfallen, sieht ein
        // Scharfschuetze aus wie eine Salve - man kann seinem eigenen Feld
        // nicht ansehen, wie es gebaut ist. Der Ring ist die kleinste
        // ehrliche Antwort darauf: er behauptet nicht, ein anderes Bauwerk zu
        // sein, sondern markiert die Entscheidung.
        if (t.branch !== null) {
          // Groesser als der Turmfuss, sonst liegt der Ring dahinter.
          const ring = TOWERS[def.id].footprint * 0.86;
          ctx.save();
          ctx.translate(t.x, t.y + TOWERS[def.id].footprint * 0.1);
          ctx.scale(1, 0.4);
          ctx.strokeStyle = hexA(accentFor(TOWERS[def.id], t.branch), 0.85);
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, ring, 0, Math.PI * 2);
          ctx.stroke();
          // Ein zweiter, feinerer Ring fuer den zweiten Zweig - so sind sie
          // auch ohne Farbsehen zu unterscheiden.
          if (t.branch === 1) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, ring * 0.72, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        const facingLeft = Math.cos(t.angle) < 0;
        const rec = t.recoil * 3;
        ctx.save();
        ctx.translate(t.x, t.y - rec * 0.4);
        if (facingLeft) ctx.scale(-1, 1);
        // Der frisch gebaute Turm federt einmal ein und schwingt aus.
        if (t.spring > 0.01) {
          const q = Math.sin(t.spring * Math.PI * 2.2) * t.spring * 0.16;
          ctx.scale(1 - q, 1 + q);
        }
        // Der Fuss des Bildes liegt bei 86 % - so steht der Turm auf der
        // Kachel statt darueber zu schweben.
        ctx.drawImage(art, -w / 2, -h * 0.72, w, h);
        ctx.restore();
      } else {
        this.paintWeapon(t.def, t.branch, t.level, t.x, t.y, t.angle, t.recoil, t.pulse, s.crystalPulse);
      }
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

  /** Nur fuer die Bauvorschau: der Turm, wie er nach dem Bauen aussehen wird.
   *
   *  Vorher wurde hier die gezeichnete Silhouette gemalt, waehrend gebaute
   *  Tuerme das gerenderte Bild zeigen. Man sah beim Bauen also etwas anderes
   *  als das, was danach dastand. */
  /** Wie gross ein Turmbild gezeichnet wird - die eine Stelle dafuer.
   *
   *  Die Kachel wird so gross gezeichnet, dass die FIGUR darin den
   *  Platzbedarf ausfuellt, nicht die Kachel selbst. Vorher stand diese
   *  Rechnung an zwei Stellen: einmal fuer gebaute Tuerme, einmal fuer die
   *  Bauvorschau - und nur die erste kannte den Breitenausgleich. Die
   *  Vorschau war dadurch rund 40 Prozent kleiner als das, was danach dort
   *  stand. Man entschied ueber eine Groesse, die man nicht sah. */
  private artMasse(
    id: TowerId, branch: BranchIndex, level: number, art: HTMLCanvasElement,
  ): { w: number; h: number; oben: number } {
    const anteil = artBreite(art, `${id}:${branch}:${level}`);
    const w = (TOWERS[id].footprint * DRAW_SCALE * towerArtScale(level)) / Math.max(0.3, anteil);
    return { w, h: w, oben: -w * 0.72 };
  }

  private paintTower(
    def: TowerDef, level: number, x: number, y: number, time: number, mapId = 'spiralhain',
  ): void {
    const art = getTowerArt(def.id, null, level, mapId);
    if (art) {
      const m = this.artMasse(def.id, null, level, art);
      this.ctx.drawImage(art, x - m.w / 2, y + m.oben, m.w, m.h);
      return;
    }
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
      // Der Schatten faellt in Lichtrichtung, nicht senkrecht nach unten -
      // dieselbe Richtung wie im Kartenbild.
      if (def.flying) {
        // Ein Flieger steht hoch ueber dem Boden, sein Schatten liegt weiter weg.
        const alt = this.altitude(e, s.time, true);
        ctx.globalAlpha = 0.4;
        drawSprite(ctx, getShadow(def.radius),
          e.x + LICHT.x * alt * 0.9, e.y + LICHT.y * alt * 0.5, 0.8);
        ctx.globalAlpha = 1;
      } else {
        const weit = def.radius * 0.85;
        drawSprite(ctx, getShadow(def.radius),
          e.x + LICHT.x * weit * 0.7, e.y + LICHT.y * weit);
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
      const art = getEnemyArt(e.def, false, s.map.id);

      if (art) {
        // Zwei Arten von Bildern, zwei Arten sie zu setzen.
        //
        // Seitenansichten schauen nach links und werden nur gespiegelt - ein
        // Fahrzeug in Dreiviertelansicht kippt beim Drehen. Aufsichten drehen
        // sich mit der Laufrichtung; ihr Bild blickt im Ausgangszustand nach
        // oben, deshalb der Viertelkreis Zuschlag.
        const dirX = def.flying ? s.goal.x - e.x : Math.cos(e.heading);
        const facingRight = dirX >= 0;
        const w = enemyArtWidth(e.def);
        const h = w * (art.height / art.width);
        ctx.save();
        ctx.translate(e.x, e.y - alt + wob * 0.3);
        if (def.topdown) ctx.rotate(e.heading + Math.PI / 2);
        else if (facingRight) ctx.scale(-1, 1);
        // Stauchen und Strecken: was getroffen wird, wird breiter und
        // flacher. Die Flaeche bleibt gleich, deshalb liest das Auge es als
        // Wucht und nicht als Groessenaenderung.
        if (e.squash > 0.01) {
          const q = e.squash * 0.22;
          ctx.scale(1 + q, 1 - q);
        }
        // Aufsichten sitzen mittig im Bild, Seitenansichten stehen auf ihrer
        // Unterkante - das muss beim Zeichnen zusammenpassen.
        const oben = def.topdown ? -h / 2 : -h * 0.72;
        ctx.drawImage(art, -w / 2, oben, w, h);
        if (e.hitFlash > 0.01) {
          const hot = getEnemyArt(e.def, true, s.map.id);
          if (hot) {
            ctx.globalAlpha = e.hitFlash * 0.8;
            ctx.drawImage(hot, -w / 2, oben, w, h);
            ctx.globalAlpha = 1;
          }
        }
        ctx.restore();
        if (def.boss) {
          ctx.save();
          ctx.translate(e.x, e.y - alt);
          ctx.rotate(s.time * 0.8);
          ctx.strokeStyle = hexA(def.trim, 0.7); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, def.radius * 1.35, 0, Math.PI * 1.3); ctx.stroke();
          ctx.restore();
        }
      } else {
        const rotating = e.def === 'runner' || !!def.flying;
        const cycle = def.flying ? s.time * 7 + e.wobble : e.travelled / 26 + e.wobble;
        const frame = Math.floor(cycle) % ENEMY_FRAMES;
        if (rotating || def.boss) {
          ctx.save();
          ctx.translate(e.x, e.y - alt);
          if (def.flying) {
            ctx.rotate(Math.atan2(s.goal.y - e.y, s.goal.x - e.x));
          } else if (rotating) {
            ctx.rotate(e.heading);
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
    // Zuerst der Nachlauf: der Teil, der gerade verloren geht, bleibt kurz
    // als heller Streifen stehen. Erst dadurch sieht man, *wieviel* ein
    // Treffer gekostet hat - eine springende Leiste liest niemand.
    ctx.fillStyle = 'rgba(255,236,180,0.75)';
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.hpShown <= e.hp || e.hpShown >= e.hpMax) continue;
      const def = ENEMIES[e.def];
      const w = Math.max(def.radius * 2.1, def.boss ? 90 : 0);
      const h = def.boss ? 7 : 4;
      const a = this.altitude(e, s.time, !!def.flying);
      const x0 = e.x - w / 2 + w * (e.hp / e.hpMax);
      ctx.fillRect(x0, e.y - a - def.radius - 12, w * ((e.hpShown - e.hp) / e.hpMax), h);
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
    // Beim Zielen gibt es keinen Bauplatz - die Faehigkeit trifft einen Punkt.
    const p = this.aimPoint;
    if (!p) return;
    const ctx = this.ctx;
    const x = p.x, y = p.y;
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
      x = h.x; y = h.y; r = 62;
    } else {
      const t = s.towers[0];
      if (!t) return;
      x = t.x; y = t.y; r = 62;
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
