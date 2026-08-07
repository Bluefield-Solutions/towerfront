import './style.css';
import { Loop } from './core/loop';
import { bindInput } from './core/input';
import { Sfx } from './core/audio';
import { getSettings } from './core/storage';
import { GameState } from './game/state';
import { Renderer } from './gfx/renderer';
import { UI } from './ui/ui';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const state = new GameState();
const renderer = new Renderer(canvas);
const ui = new UI(state);

renderer.resize();
bindInput(canvas, state, renderer);

let lastPhase = state.phase;

/** Bildrate beobachten und die Effektdichte anpassen.
 *  Herunter nach 2 s unter 48 fps, herauf erst nach 8 s ueber 57 fps.
 *  Die unterschiedlichen Schwellen verhindern ein Hin- und Herspringen. */
let slowFor = 0, fastFor = 0;
function adaptQuality(dt: number): void {
  const setting = getSettings().quality;
  if (setting !== 'auto') { state.quality = setting; return; }
  const fps = 1 / Math.max(dt, 0.0001);
  if (fps < 48) { slowFor += dt; fastFor = 0; } else if (fps > 57) { fastFor += dt; slowFor = 0; }
  if (slowFor > 2 && state.quality === 'hoch') { state.quality = 'niedrig'; slowFor = 0; }
  if (fastFor > 8 && state.quality === 'niedrig') { state.quality = 'hoch'; fastFor = 0; }
}

const loop = new Loop(
  (dt) => {
    adaptQuality(dt);
    state.update(dt);
    if (state.phase !== lastPhase) {
      lastPhase = state.phase;
      if (state.phase === 'playing') ui.hideScreen();
      else ui.showScreen(state.phase);
    }
    ui.sync();
  },
  () => renderer.draw(state),
);

const onResize = () => renderer.resize();
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
window.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'playing') state.paused = true;
});

loop.start();
