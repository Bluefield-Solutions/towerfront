/** Zeichenmessung.
 *
 *  Echtes Zeichnen laesst sich ohne Browser nicht sinnvoll in Millisekunden
 *  messen - und Millisekunden waeren ohnehin von der Maschine abhaengig.
 *  Gezaehlt wird stattdessen, wie viele Befehle der Renderer je Bild an die
 *  Leinwand schickt. Diese Zahl ist deterministisch, maschinenunabhaengig und
 *  genau das, was auf dem iPhone teuer ist: jeder Farbwechsel, jeder Pfad,
 *  jeder Deckkraftwechsel kostet.
 *
 *  Aufruf: npx tsx tools/bench-draw.ts */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

/** Obergrenze je Bild im schlimmsten Fall. Wird sie ueberschritten, ist
 *  irgendwo eine Zeichnung wieder in die innere Schleife gerutscht. */
const BUDGET = 3000;

const html = readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://local.test/' });
const win = dom.window;

const counts = new Map<string, number>();
let counting = false;
let mainCanvas: unknown = null;

const gradient = { addColorStop(): void { /* nichts */ } };
const noop = (): void => { /* nichts */ };

function tally(name: string): void {
  if (!counting) return;
  counts.set(name, (counts.get(name) ?? 0) + 1);
}

function fakeContext(canvas: unknown): unknown {
  const store: Record<string, unknown> = {};
  // Nur die sichtbare Leinwand wird gezaehlt. Was einmal in ein Zwischenbild
  // gebacken wird, kostet im Spiel nichts mehr.
  const watched = () => canvas === mainCanvas;
  return new Proxy(store, {
    get(target, key: string) {
      if (key === 'canvas') return canvas;
      if (key === 'createLinearGradient' || key === 'createRadialGradient' ||
          key === 'createPattern') {
        return () => { if (watched()) tally('gradient'); return gradient; };
      }
      if (key === 'measureText') return () => ({ width: 12 });
      if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (key in target) return target[key];
      if (!watched()) return noop;
      return (...args: unknown[]) => { tally(key); void args; };
    },
    set(target, key: string, value) {
      // Zustandswechsel sind der teuerste Teil beim Zeichnen - mitzaehlen.
      if (watched() && target[key] !== value) tally(`set ${key}`);
      target[key] = value;
      return true;
    },
  });
}

const CanvasProto = win.HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
CanvasProto.getContext = function getContext(this: unknown) { return fakeContext(this); };

function sizeCanvas(el: unknown, w: number, h: number): void {
  Object.defineProperty(el, 'clientWidth', { value: w, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: h, configurable: true });
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0 }),
    configurable: true,
  });
}

const g = globalThis as unknown as Record<string, unknown>;
const define = (key: string, value: unknown): void => {
  try { g[key] = value; }
  catch { Object.defineProperty(g, key, { value, configurable: true }); }
};
g.window = win;
g.document = win.document;
define('navigator', win.navigator);
g.localStorage = win.localStorage;
g.HTMLCanvasElement = win.HTMLCanvasElement;
g.devicePixelRatio = 2;
g.requestAnimationFrame = (cb: (t: number) => void) => win.setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => win.clearTimeout(id);

const { GameState } = await import('../src/game/state');
const { Renderer } = await import('../src/gfx/renderer');
const { COLS, ROWS } = await import('../src/data/config');
const { MAX_LEVEL, TOWER_ORDER } = await import('../src/data/towers');

const { spriteCount, spriteBytes } = await import('../src/gfx/sprites');

const canvas = win.document.getElementById('view') as unknown as HTMLCanvasElement;
mainCanvas = canvas;
sizeCanvas(canvas, 1280, 640);

const s = new GameState();
const r = new Renderer(canvas);
r.resize();

// Schlimmster Fall: jeder Bauplatz belegt und voll ausgebaut.
s.reset();
s.gold = 1_000_000;
let i = 0;
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (!s.canBuild(x, y)) continue;
    const id = TOWER_ORDER[i++ % TOWER_ORDER.length];
    if (s.build(x, y, id)) {
      const t = s.towerOn(x, y)!;
      while (t.level < MAX_LEVEL) s.upgrade(t, (i % 2) as 0 | 1);
    }
  }
}
s.waveIndex = s.waves.length - 1;
s.gold = 1_000_000;
s.startWave();

const keepAlive = (): void => {
  s.lives = 999;
  for (const e of s.enemies) { e.hp = 1e9; e.hpMax = 1e9; }
};

const DT = 1 / 60;
// Aufwaermen: Untergrund, Himmel und alle Bilder werden hier gebacken.
for (let f = 0; f < 60 * 20; f++) { s.update(DT); keepAlive(); r.draw(s); }

const FRAMES = 120;
counting = true;
for (let f = 0; f < FRAMES; f++) { s.update(DT); keepAlive(); r.draw(s); }
counting = false;

// Zweiter Fall: leeres Feld mit gewaehlter Turmsorte. Dann sind alle Sockel
// hervorgehoben - der Hoechstwert liegt hier, nicht beim vollen Feld, denn ein
// belegter Bauplatz wird nicht mehr hervorgehoben. Beide Faelle messen.
const buildCounts = new Map<string, number>();
{
  const empty = new GameState();
  empty.reset(1, 'normal');
  empty.buildChoice = 'arrow';
  const r2 = new Renderer(canvas);
  r2.resize();
  r2.draw(empty);
  counts.clear();
  counting = true;
  for (let f = 0; f < 30; f++) { empty.update(DT); r2.draw(empty); }
  counting = false;
  for (const [k, v] of counts) buildCounts.set(k, v / 30);
  counts.clear();
  counting = true;
  for (let f = 0; f < FRAMES; f++) { s.update(DT); keepAlive(); r.draw(s); }
  counting = false;
}

let total = 0;
for (const n of counts.values()) total += n;
const perFrame = total / FRAMES;

const top = [...counts.entries()]
  .map(([k, v]) => [k, v / FRAMES] as const)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8);

console.log(
  `ZEICHENMESSUNG: ${s.towers.length} Tuerme, ${s.enemies.length} Gegner, ` +
  `${s.particles.length} Partikel, ${s.projectiles.length} Geschosse`,
);
let buildTotal = 0;
for (const n of buildCounts.values()) buildTotal += n;
console.log(`                ${perFrame.toFixed(0)} Befehle je Bild (Budget ${BUDGET})`);
console.log(`                ${buildTotal.toFixed(0)} Befehle je Bild bei offener Bauauswahl`);
console.log('                ' + top.map(([k, v]) => `${k} ${v.toFixed(0)}`).join('  ·  '));

// Backbudget: gebackene Bilder sparen Zeichenbefehle, kosten aber Speicher.
const SPRITE_BUDGET_MB = 24;
const mb = spriteBytes() / (1024 * 1024);
console.log(`                ${spriteCount()} gebackene Bilder, ${mb.toFixed(1)} MB (Budget ${SPRITE_BUDGET_MB} MB)`);
if (mb > SPRITE_BUDGET_MB) {
  console.error(`ZEICHENMESSUNG: Backbudget ueberschritten - ${mb.toFixed(1)} MB statt hoechstens ${SPRITE_BUDGET_MB} MB.`);
  process.exit(1);
}

if (buildTotal > BUDGET) {
  console.error(
    `ZEICHENMESSUNG: Bauauswahl ueber Budget - ${buildTotal.toFixed(0)} statt hoechstens ${BUDGET}.`,
  );
  process.exit(1);
}

if (perFrame > BUDGET) {
  console.error(`ZEICHENMESSUNG: ueber Budget - ${perFrame.toFixed(0)} statt hoechstens ${BUDGET}.`);
  process.exit(1);
}
console.log('ZEICHENMESSUNG: im Budget.');
