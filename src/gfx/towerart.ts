import { TOWER_ART } from './assets/towers';
import { accentFor, TOWERS, type BranchIndex, type TowerId } from '../data/towers';
import { hexA } from './glow';
import { mapById } from '../data/maps';

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
/** Saum um eine Silhouette: das Bild achtfach versetzt in einer Farbe,
 *  darunter gelegt.
 *
 *  Der Saum stammt aus v33 und war die richtige Antwort auf ein anderes
 *  Problem: dunkle, gerenderte Figuren auf einem dunklen Waldfoto - elf von
 *  zwoelf lagen im selben Helligkeitsband wie der Boden und waren nur an
 *  ihrem Saum zu erkennen.
 *
 *  Seit die Bilder und die Karten neu sind, gilt das nicht mehr. Die Figuren
 *  sind heller als der Boden und tragen ihre Form selbst. Der helle Saum ist
 *  dadurch von einer Notmassnahme zu einem Fehler geworden - im Spiel sah man
 *  weisse Umrandungen um jeden Turm und jeden Gegner.
 *
 *  Er bleibt im Code, weil er fuer die verbliebenen Altbilder noch gebraucht
 *  wird; welche Figur ihn bekommt, entscheidet `brauchtSaum`. */
export function drawRim(
  g: CanvasRenderingContext2D, img: HTMLImageElement | HTMLCanvasElement,
  size: number, colour: string, width = 2.5,
): void {
  const mask = document.createElement('canvas');
  mask.width = size; mask.height = size;
  const mg = mask.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    mg.drawImage(img, Math.cos(a) * width, Math.sin(a) * width, size, size);
  }
  mg.globalCompositeOperation = 'source-atop';
  mg.fillStyle = colour;
  mg.fillRect(0, 0, size, size);
  g.globalAlpha = 0.92;
  g.drawImage(mask, 0, 0);
  g.globalAlpha = 1;
}

/** Welche Bilder brauchen noch einen Saum?
 *
 *  Die neu gelieferten tragen ihre Form selbst und sind heller als der Boden.
 *  Ein Saum wuerde sie mit einer weissen Linie umranden. Die Liste schrumpft
 *  mit jeder Lieferung; steht sie leer, kann `drawRim` ganz weg. */
const OHNE_SAUM = new Set<string>(['arrow', 'frost', 'mortar', 'prism']);
export const brauchtSaum = (id: string): boolean => !OHNE_SAUM.has(id);

const tinted = new Map<string, HTMLCanvasElement>();

/** Wie breit die Figur im Bild tatsaechlich ist, als Anteil der Kachel.
 *
 *  Seit die Bilder nach der laengeren Seite eingepasst werden, fuellt ein
 *  hoher schmaler Turm nur ein Drittel der Breite - gezeichnet wurde aber
 *  immer die volle Kachel, und der Turm wirkte winzig. Gemessen wird einmal
 *  je Bild und danach gemerkt. */
const breiten = new Map<string, number>();

export function artBreite(art: HTMLCanvasElement, schluessel: string): number {
  const hit = breiten.get(schluessel);
  if (hit !== undefined) return hit;
  const g = art.getContext('2d')!;
  const { data } = g.getImageData(0, 0, art.width, art.height);
  let minX = art.width, maxX = -1;
  for (let y = 0; y < art.height; y += 2) {
    for (let x = 0; x < art.width; x++) {
      if (data[(y * art.width + x) * 4 + 3] < 40) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  const anteil = maxX < 0 ? 1 : (maxX - minX + 1) / art.width;
  breiten.set(schluessel, anteil);
  return anteil;
}
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
  id: TowerId, branch: BranchIndex, level: number, mapId = 'spiralhain',
): HTMLCanvasElement | null {
  const k = key(id, branch);
  const accent = accentFor(TOWERS[id], branch);
  const rim = mapById(mapId).palette.rim;
  const cacheKey = `${k}|${accent}|${rim}`;
  const hit = tinted.get(cacheKey);
  if (hit) return hit;

  const img = load(k);
  if (!img) return null;

  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;

  // Erst der Saum, dann der eingefaerbte Koerper darueber - so bleibt die
  // Kante sauber und wird nicht mit eingefaerbt.
  // Nur noch fuer Altbilder, siehe Kommentar an drawRim.
  if (brauchtSaum(id)) drawRim(g, img, size, rim, 2.0);

  const body = document.createElement('canvas');
  body.width = size; body.height = size;
  const bg = body.getContext('2d')!;
  bg.drawImage(img, 0, 0, size, size);
  bg.globalCompositeOperation = 'source-atop';
  bg.fillStyle = hexA(accent, 0.38);
  bg.fillRect(0, 0, size, size);
  const lift = bg.createLinearGradient(0, 0, size * 0.7, size);
  lift.addColorStop(0, 'rgba(255,255,255,0.34)');
  lift.addColorStop(0.45, 'rgba(255,255,255,0.10)');
  lift.addColorStop(1, 'rgba(0,0,0,0.22)');
  bg.fillStyle = lift;
  bg.fillRect(0, 0, size, size);
  bg.globalCompositeOperation = 'source-over';
  g.drawImage(body, 0, 0);

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
