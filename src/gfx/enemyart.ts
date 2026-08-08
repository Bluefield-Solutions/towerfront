import { ENEMY_ART } from './assets/enemies';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { hexA } from './glow';
import { mapById } from '../data/maps';
import { drawRim } from './towerart';

/** Gerenderte Gegnerbilder.
 *
 *  Wie bei den Tuermen: alle stammen aus derselben Familie - dunkler Panzer
 *  mit Glut - und waeren im Feld nicht auseinanderzuhalten. Die Artfarbe wird
 *  deshalb ueber die Silhouette gelegt, dazu eine helle Kante von oben links.
 *
 *  Eine weisse Fassung fuer den Trefferblitz wird gleich mitgebacken; sie
 *  ersetzt das Weisstoenen zur Laufzeit, das je Treffer Rechenzeit kosten
 *  wuerde. */
const baked = new Map<string, HTMLCanvasElement>();
const raw = new Map<string, HTMLImageElement>();
const ready = new Set<string>();
let version = 0;


function load(id: EnemyId): HTMLImageElement | null {
  const src = ENEMY_ART[id];
  if (!src || typeof Image === 'undefined') return null;
  let img = raw.get(id);
  if (!img) {
    img = new Image();
    img.onload = () => { ready.add(id); version++; };
    img.onerror = () => { /* dann bleibt die gezeichnete Silhouette */ };
    img.src = src;
    raw.set(id, img);
  }
  return ready.has(id) ? img : null;
}

export function getEnemyArt(
  id: EnemyId, flash: boolean, mapId = 'spiralhain',
): HTMLCanvasElement | null {
  const rim = mapById(mapId).palette.rim;
  const cacheKey = `${id}|${flash ? 'f' : 'n'}|${rim}`;
  const hit = baked.get(cacheKey);
  if (hit) return hit;

  const img = load(id);
  if (!img) return null;

  const def = ENEMIES[id];
  const size = img.width;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;
  if (!flash) drawRim(g, img, size, rim);

  const body = document.createElement('canvas');
  body.width = size; body.height = size;
  const bg = body.getContext('2d')!;
  bg.drawImage(img, 0, 0);
  bg.globalCompositeOperation = 'source-atop';
  if (flash) {
    bg.fillStyle = 'rgba(255,255,255,0.85)';
    bg.fillRect(0, 0, size, size);
  } else {
    bg.fillStyle = hexA(def.body, 0.38);
    bg.fillRect(0, 0, size, size);
    const lift = bg.createLinearGradient(0, 0, size * 0.7, size);
    lift.addColorStop(0, 'rgba(255,255,255,0.24)');
    lift.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    lift.addColorStop(1, 'rgba(0,0,0,0.24)');
    bg.fillStyle = lift;
    bg.fillRect(0, 0, size, size);
  }
  bg.globalCompositeOperation = 'source-over';
  g.drawImage(body, 0, 0);

  baked.set(cacheKey, cv);
  return cv;
}

/** Wie breit der Gegner im Spiel gezeichnet wird - abgeleitet aus seinem
 *  Radius, damit Bild und Treffererkennung zusammenpassen. */
/** Wie breit der Gegner gezeichnet wird. Der Mindestwert ist bewusst von der
 *  Treffererkennung entkoppelt: der Span hatte bei seinem Radius nur elf
 *  Bildschirmpunkte, und darunter ist nichts mehr zu erkennen. */
export const enemyArtWidth = (id: EnemyId): number =>
  Math.max(ENEMIES[id].radius * 3.0, 50);

export const hasEnemyArt = (id: EnemyId): boolean => id in ENEMY_ART;
