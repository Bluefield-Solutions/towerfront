import './style.css';
import { Loop } from './core/loop';
import { Menu } from './game/menu';
import { getStars, recordRun, recordStars, saveSettings } from './core/storage';
import { starsFor } from './data/perks';
import { loadGame } from './game/save';
import { bindInput } from './core/input';
import { Sfx } from './core/audio';
import { getSettings } from './core/storage';
import { GameState } from './game/state';
import { saveGame } from './game/save';
import { Renderer } from './gfx/renderer';
import { UI } from './ui/ui';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const state = new GameState();
const renderer = new Renderer(canvas);
const ui = new UI(state);

/** Seit v30 gibt es keine reservierten Baender mehr: das Spielfeld fuellt den
 *  ganzen Bildschirm, die Bedienung schwebt darueber und laesst sich
 *  einklappen. Bleibt nur, die Leinwand einzupassen. */
function layout(): void {
  renderer.resize();
}

// Das Menue liegt auf der Leinwand, nicht mehr im HTML.
const menu = new Menu();
renderer.menu = menu;
menu.onStart = (mapId, difficulty, endless) => {
  saveSettings({ map: mapId, difficulty });
  state.reset(undefined, difficulty, mapId, { endless });
  renderer.menu = null;
  ui.hideScreen();
};
menu.onResume = () => {
  const save = loadGame();
  if (save && state.restore(save)) { renderer.menu = null; ui.hideScreen(); }
};
ui.openMenu = () => {
  const save = loadGame();
  menu.hasSave = !!save;
  menu.saveLabel = save
    ? `Fortsetzen · Welle ${Math.min(save.waveIndex + 1, state.totalWaves)}`
    : '';
  menu.view = 'map';
  renderer.menu = menu;
  ui.hideScreen();
};

/** Das Ergebnis einer Partie - auf der Leinwand, in derselben Formensprache
 *  wie die Landkarte. */
function showResult(won: boolean): void {
  const before = getStars(state.map.id, state.difficulty);
  const stars = starsFor(won, state.lives, state.maxLives);
  recordStars(state.map.id, state.difficulty, stars);
  recordRun(state.map.id, state.difficulty, state.waveNumber, state.lives);
  menu.result = {
    won, mapId: state.map.id, mapName: state.map.name,
    wave: state.waveNumber, waves: state.totalWaves,
    lives: state.lives, maxLives: state.maxLives, stars, before,
    kills: state.stats.kills, built: state.stats.towersBuilt,
    damage: Math.round(state.stats.damage), duration: state.stats.duration,
  };
  menu.resultAge = 0;
  menu.view = 'result';
  renderer.menu = menu;
  ui.hideScreen();
}

menu.onRetry = () => {
  const r = menu.result;
  if (!r) return;
  state.reset(undefined, state.difficulty, r.mapId, { endless: menu.endless });
  menu.result = null;
  renderer.menu = null;
  ui.hideScreen();
};

layout();
bindInput(canvas, state, renderer);

let lastPhase = state.phase;

/** Bildrate beobachten und die Effektdichte anpassen.
 *  Herunter nach 2 s unter 48 fps, herauf erst nach 8 s ueber 57 fps.
 *  Die unterschiedlichen Schwellen verhindern ein Hin- und Herspringen. */
/** Alle zwei Sekunden sichern. Ein Anruf, ein App-Wechsel oder ein
 *  Neuladen kostet damit hoechstens zwei Sekunden Spielzeit. */
let saveIn = 0;
function autoSave(dt: number): void {
  if (state.phase !== 'playing') { saveIn = 0; return; }
  saveIn -= dt;
  if (saveIn <= 0) { saveIn = 2; saveGame(state.snapshot()); }
}

let slowFor = 0, fastFor = 0;
let fpsAvg = 60;
function adaptQuality(dt: number): void {
  const fps = 1 / Math.max(dt, 0.0001);
  fpsAvg += (fps - fpsAvg) * 0.08; // geglaettet, damit die Anzeige nicht flackert
  const setting = getSettings().quality;
  if (setting !== 'auto') { state.quality = setting; return; }
  if (fps < 48) { slowFor += dt; fastFor = 0; } else if (fps > 57) { fastFor += dt; slowFor = 0; }
  if (slowFor > 2 && state.quality === 'hoch') { state.quality = 'niedrig'; slowFor = 0; }
  if (fastFor > 8 && state.quality === 'niedrig') { state.quality = 'hoch'; fastFor = 0; }
}

const loop = new Loop(
  (dt) => {
    adaptQuality(dt);
    state.update(dt);
    autoSave(dt);
    if (state.phase !== lastPhase) {
      lastPhase = state.phase;
      if (state.phase === 'playing') ui.hideScreen();
      else if (state.phase === 'title') ui.openMenu();
      else showResult(state.phase === 'won');
    }
    ui.sync();
    ui.perf(fpsAvg);
    renderer.coachHint = ui.coachHint;
    // Die Einfuehrungsleiste schiebt das Feld nach unten und wieder zurueck.
    if (ui.bandsChanged()) layout();
  },
  () => {
    // Das Menue lebt auch, wenn die Simulation steht - sonst blieben die
    // Sterne im Ergebnis reglos stehen.
    if (renderer.menu) { menu.time += 1 / 60; menu.resultAge += 1 / 60; }
    renderer.draw(state);
  },
);

const onResize = () => /** Seit v30 gibt es keine reservierten Baender mehr: das Spielfeld fuellt den
 *  ganzen Bildschirm, die Bedienung schwebt darueber und laesst sich
 *  einklappen. Bleibt nur, die Leinwand einzupassen. */
function layout(): void {
  renderer.resize();
}

layout();
window.addEventListener('resize', onResize);
// Die Baender aendern ihre Hoehe auch ohne Fenstergroessenwechsel - etwa wenn
// die Einfuehrungsleiste erscheint oder die Schriften fertig geladen sind.
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(() => layout());
  ro.observe(canvas);
  const dockEl = document.getElementById('dock');
  if (dockEl) ro.observe(dockEl);
}
// Ein zweiter Durchlauf, nachdem der Browser das erste Bild gesetzt hat:
// beim allerersten Aufruf steht die Groesse der Leinwand noch nicht fest.
requestAnimationFrame(() => layout());
window.addEventListener('load', () => layout());
window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
window.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'f' || ev.key === 'F') ui.togglePerf();
});
const saveNow = (): void => { if (state.phase === 'playing') saveGame(state.snapshot()); };
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  saveNow();
  if (state.phase === 'playing') state.paused = true;
});
window.addEventListener('pagehide', saveNow);

loop.start();
