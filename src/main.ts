import './style.css';
import { Loop } from './core/loop';
import { bindInput } from './core/input';
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

const loop = new Loop(
  (dt) => {
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

loop.start();
