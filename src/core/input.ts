import { TOWERS, TOWER_ORDER } from '../data/towers';

/** Der guenstigste Turm - er entscheidet, ob ein Platz ueberhaupt taugt.
 *  Was dort nicht steht, steht nirgends. */
const guenstigster = () =>
  TOWER_ORDER.reduce((a, b) => (TOWERS[a].base.cost <= TOWERS[b].base.cost ? a : b));
import { ABILITIES, ABILITY_ORDER } from '../data/abilities';
import { Sfx } from './audio';
import type { GameState } from '../game/state';
import type { Renderer } from '../gfx/renderer';
import { inside as insideSpot } from '../game/menu';

/** Bedienung am Daumen.
 *  Bauen: druecken zeigt Vorschau und Reichweite, erst das Loslassen baut.
 *  Ein Fehltipp kostet damit kein Gold und keine Nerven.
 *  Ohne gewaehlte Turmsorte waehlt der Tipp einen vorhandenen Turm aus. */
export function bindInput(canvas: HTMLCanvasElement, s: GameState, r: Renderer): void {
  /** Weltpunkt unter dem Finger. */
  const toWorld = (ev: { clientX: number; clientY: number }) => {
    const rect = canvas.getBoundingClientRect();
    return r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
  };

  let down = false;
  /** Sobald der Finger weiter als das gewandert ist, ist es kein Tipp mehr,
   *  sondern ein Schieben - und dann darf am Ende nichts gebaut werden.
   *  Ohne diese Schwelle setzt jedes Verschieben einen Turm. */
  const DRAG_THRESHOLD = 11;
  let dragging = false;
  let startX = 0, startY = 0, lastX = 0, lastY = 0;
  /** Alle liegenden Finger - fuer das Kneifen. */
  const points = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;
  let pinchX: number | null = null;
  let pinchY: number | null = null;
  let lastTap = 0;

  const local = (ev: { clientX: number; clientY: number }) => {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  canvas.addEventListener('pointermove', (ev) => {
    const p = local(ev);
    if (points.has(ev.pointerId)) points.set(ev.pointerId, p);

    // Zwei Finger: kneifen UND schieben.
    //
    // Vorher wurde nur der Abstand ausgewertet und am Mittelpunkt gezoomt.
    // Der Mittelpunkt wandert aber mit den Fingern, und diese Bewegung wurde
    // verschluckt - das Bild rutschte beim Kneifen weg. Zwei Finger machen in
    // Wahrheit zweierlei: ihr Abstand ist der Zoom, ihre gemeinsame Mitte die
    // Verschiebung. Beides muss gelten.
    if (points.size >= 2) {
      const [a, b] = [...points.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (pinchDist > 0 && d > 0) {
        r.zoomAt(d / pinchDist, mx, my);
        if (pinchX !== null && pinchY !== null) r.panBy(mx - pinchX, my - pinchY);
      }
      pinchX = mx;
      pinchY = my;
      pinchDist = d;
      dragging = true;
      s.pendingPoint = null;
      return;
    }

    if (down) {
      if (s.aiming) {
        const rect = canvas.getBoundingClientRect();
        r.aimPoint = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      }
      if (!dragging && Math.hypot(p.x - startX, p.y - startY) > DRAG_THRESHOLD) {
        dragging = true;
        s.pendingPoint = null;
      }
      if (dragging) {
        r.panBy(p.x - lastX, p.y - lastY);
        lastX = p.x; lastY = p.y;
        return;
      }
      s.pendingPoint = toWorld(ev);
      return;
    }
    if (ev.pointerType !== 'touch') s.hoverPoint = toWorld(ev);
  });
  canvas.addEventListener('pointerleave', () => { s.hoverPoint = null; });

  canvas.addEventListener('pointerdown', (ev) => {
    Sfx.unlock();
    ev.preventDefault();
    // Im Menue laufen alle Tipper an die Landkarte - kein Bauen, kein Zoomen.
    if (r.menu) {
      const w = r.screenToWorld(ev.clientX - canvas.getBoundingClientRect().left,
        ev.clientY - canvas.getBoundingClientRect().top);
      const hit = r.menu.hotspots.find((h) => insideSpot(h, w.x, w.y));
      r.menu.pressed = hit ? hit.id : null;
      return;
    }
    const p = local(ev);
    points.set(ev.pointerId, p);
    if (points.size >= 2) {
      const [a, b] = [...points.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      dragging = true;
      s.pendingPoint = null;
      return;
    }
    canvas.setPointerCapture?.(ev.pointerId);
    down = true;
    dragging = false;
    if (s.aiming) r.aimPoint = r.screenToWorld(p.x, p.y);
    startX = lastX = p.x; startY = lastY = p.y;
    if (s.phase !== 'playing') return;
    const c = toWorld(ev);
    s.hoverPoint = c;
    s.pendingPoint = s.buildChoice || s.aiming ? c : null;
  });

  const finish = (ev: PointerEvent) => {
    if (r.menu) {
      const rect = canvas.getBoundingClientRect();
      const w = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      r.menu.pressed = null;
      if (r.menu.tap(w.x, w.y)) Sfx.play('tap');
      return;
    }
    points.delete(ev.pointerId);
    if (points.size < 2) { pinchDist = 0; pinchX = null; pinchY = null; }
    if (!down) return;
    down = false;
    const wasDragging = dragging;
    dragging = false;
    const at = s.pendingPoint;
    s.pendingPoint = null;
    // Geschoben statt getippt: nichts bauen, nichts auswaehlen.
    if (wasDragging) return;

    // Doppeltipp schaltet zwischen Uebersicht und Vollbild um - der schnellste
    // Weg, kurz das ganze Feld zu sehen und wieder heranzugehen.
    const now = performance.now();
    if (now - lastTap < 280) {
      lastTap = 0;
      const p = local(ev);
      r.toggleOverview();
      void p;
      return;
    }
    lastTap = now;

    if (s.phase !== 'playing') return;
    const c = at ?? toWorld(ev);

    // Eine angewaehlte Faehigkeit hat Vorrang: der Tipp zielt, er baut nicht.
    if (s.aiming) {
      const rect = canvas.getBoundingClientRect();
      const w = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      s.cast(s.aiming, w.x, w.y);
      r.aimPoint = null;
      return;
    }

    // Trefferzugabe so gross, dass die Flaeche 44 Punkte erreicht.
    const existing = s.towerUnder(c.x, c.y, r.scale);
    if (s.buildChoice) {
      if (existing) { s.selectedTower = existing; s.buildChoice = null; Sfx.play('tap'); return; }
      const choice = s.buildChoice;
      if (s.build(c.x, c.y, choice)) {
        // Reicht das Gold nicht mehr fuer den naechsten Turm, Auswahl loesen.
        if (s.gold < TOWERS[choice].base.cost) s.buildChoice = null;
      }
      return;
    }
    if (existing) { s.selectedTower = existing; s.buildAt = null; Sfx.play('tap'); return; }
    s.selectedTower = null;

    // Freier Platz: die Turmwahl oeffnet sich dort, wo getippt wurde.
    s.buildAt = s.canPlace(guenstigster(), c.x, c.y) ? { x: c.x, y: c.y } : null;
    if (s.buildAt) Sfx.play('tap');
  };

  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', (ev) => {
    points.delete(ev.pointerId);
    if (points.size < 2) { pinchDist = 0; pinchX = null; pinchY = null; }
    down = false; dragging = false; s.pendingPoint = null;
  });

  // Am Schreibtisch: Mausrad zoomt um den Zeiger.
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const p = local(ev);
    r.zoomAt(ev.deltaY < 0 ? 1.12 : 1 / 1.12, p.x, p.y);
  }, { passive: false });

  window.addEventListener('keydown', (ev) => {
    Sfx.unlock();
    if (ev.key === ' ') { ev.preventDefault(); s.startWave(); }
    if (ev.key === 'p' || ev.key === 'P') s.paused = !s.paused;
    if (ev.key === 'Escape') { s.buildChoice = null; s.selectedTower = null; s.aiming = null; }
    if (ev.key === 'o' || ev.key === 'O') r.toggleOverview();
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
