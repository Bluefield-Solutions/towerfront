import { TOWERS } from '../data/towers';
import type { GameState } from '../game/state';
import type { Renderer } from '../gfx/renderer';

/** Ein Fingertipp bzw. Klick auf das Spielfeld.
 *  Regel: Ist eine Turmsorte gewaehlt, baut der Tipp. Sonst waehlt er einen
 *  vorhandenen Turm aus oder hebt die Auswahl auf. */
export function bindInput(canvas: HTMLCanvasElement, s: GameState, r: Renderer): void {
  const toCell = (ev: { clientX: number; clientY: number }) => {
    const rect = canvas.getBoundingClientRect();
    const w = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    return s.worldToCell(w.x, w.y);
  };

  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    s.hoverCell = toCell(ev);
  });
  canvas.addEventListener('pointerleave', () => { s.hoverCell = null; });

  canvas.addEventListener('pointerdown', (ev) => {
    if (s.phase !== 'playing') return;
    ev.preventDefault();
    const c = toCell(ev);
    s.hoverCell = c;

    if (s.buildChoice) {
      const existing = s.towerOn(c.x, c.y);
      if (existing) { s.selectedTower = existing; s.buildChoice = null; return; }
      const choice = s.buildChoice;
      if (s.build(c.x, c.y, choice)) {
        // Reicht das Gold nicht mehr fuer den naechsten Turm, Auswahl loesen.
        if (s.gold < TOWERS[choice].levels[0].cost) s.buildChoice = null;
      }
      return;
    }

    const t = s.towerOn(c.x, c.y);
    s.selectedTower = t ?? null;
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === ' ') { ev.preventDefault(); s.startWave(); }
    if (ev.key === 'p' || ev.key === 'P') s.paused = !s.paused;
    if (ev.key === 'Escape') { s.buildChoice = null; s.selectedTower = null; }
    if (ev.key === '1') s.buildChoice = 'arrow';
    if (ev.key === '2') s.buildChoice = 'frost';
  });

  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
}
