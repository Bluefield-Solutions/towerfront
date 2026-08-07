import { C } from '../data/config';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { TOWERS, type TowerDef, type TowerId } from '../data/towers';
import { hexA } from './glow';

/** Vorgebackene Bilder.
 *
 *  Gegner und Turmwaffen wurden bisher in jedem Bild als Vektorpfad neu
 *  gezeichnet: Pfad oeffnen, Punkte setzen, fuellen, Farbe wechseln - ein
 *  Dutzend Befehle pro Objekt. Bei 55 Gegnern und 170 Tuermen summiert sich
 *  das zu tausenden Befehlen je Bild.
 *
 *  Hier entsteht jede Form genau einmal in einem eigenen Bild. Im Spiel bleibt
 *  davon ein einziger `drawImage`-Aufruf pro Objekt. Gedreht wird beim
 *  Zeichnen, nicht beim Backen - sonst braeuchte man je Winkel ein Bild. */

/** Ueberabtastung: doppelt so fein gebacken, damit es auf grossen Bildschirmen
 *  nicht weich wird. */
const SS = 2;

const cache = new Map<string, HTMLCanvasElement>();

function bake(
  key: string, w: number, h: number,
  draw: (g: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w * SS));
  cv.height = Math.max(1, Math.ceil(h * SS));
  const g = cv.getContext('2d')!;
  g.setTransform(SS, 0, 0, SS, (w / 2) * SS, (h / 2) * SS);
  draw(g);
  cache.set(key, cv);
  return cv;
}

/** Zeichnet ein gebackenes Bild mittig auf (x, y). Ein einziger Befehl. */
export function drawSprite(
  ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement,
  x: number, y: number, scale = 1,
): void {
  const w = (sprite.width / SS) * scale;
  const h = (sprite.height / SS) * scale;
  ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
}

// ------------------------------------------------------------------ Gegner

/** Ein Bild je Gegnerart, plus eine weisse Fassung fuer den Trefferblitz. */
export function getEnemySprite(id: EnemyId, flash: boolean): HTMLCanvasElement {
  const def = ENEMIES[id];
  const r = def.radius;
  const box = r * 2.8;
  return bake(`enemy:${id}:${flash ? 'f' : 'n'}`, box, box, (g) => {
    paintEnemyBody(g, id);
    if (flash) {
      // Weiss ueber die vorhandene Form legen - die Silhouette bleibt exakt.
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#FFFFFF';
      g.fillRect(-box, -box, box * 2, box * 2);
      g.globalCompositeOperation = 'source-over';
    }
  });
}

function paintEnemyBody(g: CanvasRenderingContext2D, id: EnemyId): void {
  const def = ENEMIES[id];
  const r = def.radius;
  if (id === 'runner') {
    // Nach rechts zeigend gebacken, im Spiel wird gedreht.
    g.fillStyle = def.body;
    g.beginPath();
    g.moveTo(r * 1.3, 0); g.lineTo(-r * 0.8, r * 0.8);
    g.lineTo(-r * 0.3, 0); g.lineTo(-r * 0.8, -r * 0.8);
    g.closePath(); g.fill();
    g.fillStyle = def.trim;
    g.beginPath(); g.arc(r * 0.4, 0, r * 0.28, 0, Math.PI * 2); g.fill();
    return;
  }
  if (id === 'brute' || id === 'titan') {
    const sides = def.boss ? 8 : 6;
    g.fillStyle = def.body;
    g.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + Math.PI / sides;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
    g.strokeStyle = def.trim; g.lineWidth = def.boss ? 5 : 3; g.stroke();
    g.fillStyle = def.trim;
    g.fillRect(-r * 0.5, -r * 0.15, r, r * 0.3);
    return;
  }
  g.fillStyle = def.body;
  g.beginPath(); g.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = def.trim;
  g.beginPath(); g.arc(-r * 0.32, -r * 0.15, r * 0.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(r * 0.32, -r * 0.15, r * 0.2, 0, Math.PI * 2); g.fill();
}

/** Bodenschatten, nach Radius gestaffelt - so teilen sich viele Gegner
 *  dasselbe Bild. */
export function getShadow(radius: number): HTMLCanvasElement {
  const r = Math.round(radius / 4) * 4;
  return bake(`shadow:${r}`, r * 2.2, r * 1.1, (g) => {
    g.fillStyle = hexA(C.ink, 0.35);
    g.beginPath(); g.ellipse(0, 0, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); g.fill();
  });
}

// ------------------------------------------------------------------ Tuerme

/** Sockel samt Schatten und Stufenpunkten. Aendert sich nur beim Bauen,
 *  Ausbauen oder Verkaufen. */
export function getTowerBase(id: TowerId, level: number): HTMLCanvasElement {
  const def = TOWERS[id];
  return bake(`base:${id}:${level}`, 78, 78, (g) => {
    const grow = 1 + (level - 1) * 0.12;
    g.fillStyle = hexA(C.ink, 0.4);
    g.beginPath(); g.ellipse(0, 21, 27, 10, 0, 0, Math.PI * 2); g.fill();

    g.save();
    g.scale(grow, grow);
    g.fillStyle = C.stoneDark;
    roundRect(g, -24, -8, 48, 28, 8); g.fill();
    g.fillStyle = def.color;
    roundRect(g, -22, -14, 44, 20, 7); g.fill();
    g.fillStyle = hexA(C.ink, 0.25);
    roundRect(g, -22, 0, 44, 6, 3); g.fill();
    if (level >= 2) {
      g.fillStyle = def.color;
      roundRect(g, -26, -20, 9, 12, 3); g.fill();
      roundRect(g, 17, -20, 9, 12, 3); g.fill();
    }
    if (level >= 3) {
      g.fillStyle = def.accent;
      roundRect(g, -5, -26, 10, 10, 3); g.fill();
    }
    g.restore();

    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(-14 + i * 14, 13, 3.2, 0, Math.PI * 2);
      g.fillStyle = i < level ? def.accent : hexA(C.ink, 0.35);
      g.fill();
    }
  });
}

/** Waffe, nach rechts zeigend gebacken. Drehung und Rueckstoss kommen beim
 *  Zeichnen dazu. */
export function getTowerWeapon(id: TowerId, level: number): HTMLCanvasElement {
  const def = TOWERS[id];
  const grow = 1 + (level - 1) * 0.12;
  return bake(`weapon:${id}:${level}`, 64 * grow, 64 * grow, (g) => {
    g.scale(grow, grow);
    paintWeapon(g, def);
  });
}

function paintWeapon(g: CanvasRenderingContext2D, def: TowerDef): void {
  if (def.attack === 'single') {
    g.fillStyle = def.color;
    roundRect(g, -10, -5, 34, 10, 5); g.fill();
    g.fillStyle = def.accent;
    roundRect(g, 14, -3.5, 12, 7, 3.5); g.fill();
  } else if (def.attack === 'splash') {
    g.fillStyle = C.stoneDark;
    roundRect(g, -14, -9, 30, 18, 6); g.fill();
    g.fillStyle = def.accent;
    roundRect(g, 8, -6, 16, 12, 4); g.fill();
    g.fillStyle = hexA(C.ink, 0.5);
    g.beginPath(); g.arc(22, 0, 4.5, 0, Math.PI * 2); g.fill();
  } else if (def.attack === 'aura') {
    g.fillStyle = def.accent;
    for (let i = 0; i < 3; i++) {
      g.rotate((Math.PI * 2) / 3);
      g.beginPath();
      g.moveTo(0, -6); g.lineTo(19, 0); g.lineTo(0, 6);
      g.closePath(); g.fill();
    }
  } else {
    g.fillStyle = def.accent;
    g.beginPath();
    g.moveTo(0, -13); g.lineTo(9, 0); g.lineTo(0, 13); g.lineTo(-9, 0);
    g.closePath(); g.fill();
    g.fillStyle = hexA('#FFFFFF', 0.55);
    g.beginPath();
    g.moveTo(0, -13); g.lineTo(9, 0); g.lineTo(0, 0);
    g.closePath(); g.fill();
  }
}

export function roundRect(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Wie viele Bilder gerade im Speicher liegen - fuer die Technikanzeige. */
export const spriteCount = (): number => cache.size;
