import { ENEMY_ART } from './assets/enemies';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { hexA } from './glow';

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

export const enemyArtVersion = (): number => version;

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

export function getEnemyArt(id: EnemyId, flash: boolean): HTMLCanvasElement | null {
  const cacheKey = `${id}|${flash ? 'f' : 'n'}`;
  const hit = baked.get(cacheKey);
  if (hit) return hit;

  const img = load(id);
  if (!img) return null;

  const def = ENEMIES[id];
  const size = img.width;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;
  g.drawImage(img, 0, 0);

  g.globalCompositeOperation = 'source-atop';
  if (flash) {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(0, 0, size, size);
  } else {
    g.fillStyle = hexA(def.body, 0.38);
    g.fillRect(0, 0, size, size);
    const lift = g.createLinearGradient(0, 0, size * 0.7, size);
    lift.addColorStop(0, 'rgba(255,255,255,0.24)');
    lift.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    lift.addColorStop(1, 'rgba(0,0,0,0.24)');
    g.fillStyle = lift;
    g.fillRect(0, 0, size, size);
  }
  g.globalCompositeOperation = 'source-over';

  baked.set(cacheKey, cv);
  return cv;
}

/** Wie breit der Gegner im Spiel gezeichnet wird - abgeleitet aus seinem
 *  Radius, damit Bild und Treffererkennung zusammenpassen. */
export const enemyArtWidth = (id: EnemyId): number => ENEMIES[id].radius * 3.0;

export const hasEnemyArt = (id: EnemyId): boolean => id in ENEMY_ART;
