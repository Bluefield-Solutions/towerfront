import { TOWER_ART } from './assets/towers';
import { accentFor, TOWERS, type BranchIndex, type TowerId } from '../data/towers';
import { hexA } from './glow';

/** Gerenderte Turmbilder.
 *
 *  Zwoelf Zustaende: Stufe 1 je Turmsorte und die Endstufe je Zweig. Stufe 2
 *  bekommt dasselbe Bild wie Stufe 3, nur etwas kleiner - so ist der Ausbau
 *  sichtbar, ohne dass zwoelf weitere Bilder noetig waeren.
 *
 *  Zwei Dinge passieren hier zusaetzlich:
 *
 *  Erstens werden die Bilder eingefaerbt. Alle zwoelf kommen aus derselben
 *  Familie - dunkler Stein mit Glut - und waeren im Feld nicht zu
 *  unterscheiden. Die Zweigfarbe wird deshalb ueber die Silhouette gelegt.
 *
 *  Zweitens bekommen sie eine helle Kante. Auf dem dunklen Untergrundbild
 *  verschwaende ein dunkler Turm sonst schlicht. */
const tinted = new Map<string, HTMLCanvasElement>();
const raw = new Map<string, HTMLImageElement>();
const ready = new Set<string>();
let version = 0;

export const towerArtVersion = (): number => version;

function key(id: TowerId, branch: BranchIndex): string {
  if (branch === null) return `${id}_1`;
  return `${id}_${TOWERS[id].branches[branch].id}`;
}

function load(k: string): HTMLImageElement | null {
  const src = TOWER_ART[k];
  if (!src || typeof Image === 'undefined') return null;
  let img = raw.get(k);
  if (!img) {
    img = new Image();
    img.onload = () => { ready.add(k); version++; };
    img.onerror = () => { /* dann bleibt die gezeichnete Silhouette */ };
    img.src = src;
    raw.set(k, img);
  }
  return ready.has(k) ? img : null;
}

/** Das fertige, eingefaerbte Bild - oder null, solange nichts geladen ist.
 *  Der Renderer faellt dann auf die gezeichneten Formen zurueck. */
export function getTowerArt(
  id: TowerId, branch: BranchIndex, level: number,
): HTMLCanvasElement | null {
  const k = key(id, branch);
  const accent = accentFor(TOWERS[id], branch);
  const cacheKey = `${k}|${accent}`;
  const hit = tinted.get(cacheKey);
  if (hit) return hit;

  const img = load(k);
  if (!img) return null;

  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;
  g.drawImage(img, 0, 0, size, size);

  // Zweigfarbe ueber die Silhouette, nicht ueber das ganze Bild.
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = hexA(accent, 0.3);
  g.fillRect(0, 0, size, size);

  // Lichtkante von oben links, damit der Turm sich vom Boden abhebt.
  g.globalCompositeOperation = 'source-atop';
  const lift = g.createLinearGradient(0, 0, size * 0.7, size);
  lift.addColorStop(0, 'rgba(255,255,255,0.26)');
  lift.addColorStop(0.45, 'rgba(255,255,255,0.05)');
  lift.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = lift;
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'source-over';

  tinted.set(cacheKey, cv);
  void level;
  return cv;
}

/** Groesse des Turms nach Ausbaustufe. Stufe 2 nutzt dasselbe Bild wie
 *  Stufe 3, steht aber kleiner da. */
export function towerArtScale(level: number): number {
  return level >= 3 ? 1 : level === 2 ? 0.88 : 0.78;
}

export const hasTowerArt = (id: TowerId, branch: BranchIndex): boolean =>
  key(id, branch) in TOWER_ART;
