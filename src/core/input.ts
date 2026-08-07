import { TOWERS } from '../data/towers';
import { ABILITIES, ABILITY_ORDER } from '../data/abilities';
import { Sfx } from './audio';
import type { GameState } from '../game/state';
import type { Renderer } from '../gfx/renderer';

/** Bedienung am Daumen.
 *  Bauen: druecken zeigt Vorschau und Reichweite, erst das Loslassen baut.
 *  Ein Fehltipp kostet damit kein Gold und keine Nerven.
 *  Ohne gewaehlte Turmsorte waehlt der Tipp einen vorhandenen Turm aus. */
export function bindInput(canvas: HTMLCanvasElement, s: GameState, r: Renderer): void {
  const toCell = (ev: { clientX: number; clientY: number }) => {
    const rect = canvas.getBoundingClientRect();
    const w = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    return s.worldToCell(w.x, w.y);
  };

  let down = false;

  canvas.addEventListener('pointermove', (ev) => {
    const c = toCell(ev);
    if (down) s.pendingCell = c;
    else if (ev.pointerType !== 'touch') s.hoverCell = c;
  });
  canvas.addEventListener('pointerleave', () => { s.hoverCell = null; });

  canvas.addEventListener('pointerdown', (ev) => {
    Sfx.unlock();
    if (s.phase !== 'playing') return;
    ev.preventDefault();
    canvas.setPointerCapture?.(ev.pointerId);
    down = true;
    const c = toCell(ev);
    s.hoverCell = c;
    s.pendingCell = s.buildChoice || s.aiming ? c : null;
  });

  const finish = (ev: PointerEvent) => {
    if (!down) return;
    down = false;
    const cell = s.pendingCell;
    s.pendingCell = null;
    if (s.phase !== 'playing') return;
    const c = cell ?? toCell(ev);

    // Eine angewaehlte Faehigkeit hat Vorrang: der Tipp zielt, er baut nicht.
    if (s.aiming) {
      const rect = canvas.getBoundingClientRect();
      const w = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      s.cast(s.aiming, w.x, w.y);
      return;
    }

    const existing = s.towerOn(c.x, c.y);
    if (s.buildChoice) {
      if (existing) { s.selectedTower = existing; s.buildChoice = null; Sfx.play('tap'); return; }
      const choice = s.buildChoice;
      if (s.build(c.x, c.y, choice)) {
        // Reicht das Gold nicht mehr fuer den naechsten Turm, Auswahl loesen.
        if (s.gold < TOWERS[choice].base.cost) s.buildChoice = null;
      }
      return;
    }
    s.selectedTower = existing ?? null;
    if (existing) Sfx.play('tap');
  };

  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', () => { down = false; s.pendingCell = null; });

  window.addEventListener('keydown', (ev) => {
    Sfx.unlock();
    if (ev.key === ' ') { ev.preventDefault(); s.startWave(); }
    if (ev.key === 'p' || ev.key === 'P') s.paused = !s.paused;
    if (ev.key === 'Escape') { s.buildChoice = null; s.selectedTower = null; s.aiming = null; }
    for (const id of ABILITY_ORDER) {
      if (ev.key.toLowerCase() === ABILITIES[id].key) s.chooseAbility(id);
    }
    if (ev.key === '1') s.buildChoice = 'arrow';
    if (ev.key === '2') s.buildChoice = 'frost';
    if (ev.key === '3') s.buildChoice = 'mortar';
    if (ev.key === '4') s.buildChoice = 'prism';
    // Am Schreibtisch: U baut im gewaehlten Zweig aus, auf Stufe 1 waehlen
    // Y und U den Zweig.
    if ((ev.key === 'y' || ev.key === 'Y') && s.selectedTower) s.upgrade(s.selectedTower, 0);
    if ((ev.key === 'u' || ev.key === 'U') && s.selectedTower) {
      s.upgrade(s.selectedTower, s.selectedTower.branch ?? 1);
    }
    if ((ev.key === 'x' || ev.key === 'X') && s.selectedTower) s.sell(s.selectedTower);
  });

  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
}
