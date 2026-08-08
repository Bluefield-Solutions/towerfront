import './style.css';
import { Loop } from './core/loop';
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

/** Die Baender oben und unten messen und dem Renderer geben, damit das Feld
 *  nur zwischen ihnen liegt. */
function layout(): void {
  const hud = document.getElementById('hud');
  const dock = document.getElementById('dock');
  const coach = document.getElementById('coach');
  let top = hud ? hud.offsetHeight : 0;
  if (coach && !coach.hidden) {
    coach.style.top = `${top}px`;
    top += coach.offsetHeight;
  }
  renderer.resize(top, dock ? dock.offsetHeight : 0);
}

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
      else ui.showScreen(state.phase);
    }
    ui.sync();
    ui.perf(fpsAvg);
    renderer.coachHint = ui.coachHint;
    // Die Einfuehrungsleiste schiebt das Feld nach unten und wieder zurueck.
    if (ui.bandsChanged()) layout();
  },
  () => renderer.draw(state),
);

const onResize = () => /** Die Baender oben und unten messen und dem Renderer geben, damit das Feld
 *  nur zwischen ihnen liegt. */
function layout(): void {
  const hud = document.getElementById('hud');
  const dock = document.getElementById('dock');
  const coach = document.getElementById('coach');
  let top = hud ? hud.offsetHeight : 0;
  if (coach && !coach.hidden) {
    coach.style.top = `${top}px`;
    top += coach.offsetHeight;
  }
  renderer.resize(top, dock ? dock.offsetHeight : 0);
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
