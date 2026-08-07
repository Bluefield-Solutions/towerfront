/** Kopfloser Rauchtest.
 *
 *  Die Balance-Simulation prueft nur die Spiellogik. Alles, was das Bild und
 *  die Oberflaeche betrifft - fehlende DOM-Ids, ein Zeichenaufruf, der auf
 *  einer leeren Liste stolpert, ein Ereignis, das ins Leere greift - fiel
 *  bisher erst beim Antippen im Browser auf.
 *
 *  Dieser Test baut das echte index.html in einer jsdom-Umgebung auf, ersetzt
 *  den Zeichenkontext durch eine Attrappe und laesst Renderer, Oberflaeche und
 *  Eingabe eine komplette Partie lang laufen. Jeder geworfene Fehler bricht
 *  das Tor ab.
 *
 *  Aufruf: npx tsx tools/smoke.ts */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://local.test/' });
const win = dom.window;

// -------------------------------------------------------- Zeichen-Attrappe

const gradient = { addColorStop(): void { /* nichts */ } };
const noop = (): void => { /* nichts */ };

function fakeContext(canvas: unknown): unknown {
  const store: Record<string, unknown> = {};
  return new Proxy(store, {
    get(target, key: string) {
      if (key === 'canvas') return canvas;
      if (key === 'createLinearGradient' || key === 'createRadialGradient' ||
          key === 'createPattern') return () => gradient;
      if (key === 'measureText') return () => ({ width: 12 });
      if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (key in target) return target[key];
      // Unbekannte Zugriffe sind Zeichenbefehle - eine leere Funktion genuegt.
      return noop;
    },
    set(target, key: string, value) { target[key] = value; return true; },
  });
}

const CanvasProto = win.HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
CanvasProto.getContext = function getContext(this: unknown) { return fakeContext(this); };

// jsdom kennt kein Layout: die Leinwand bekommt eine feste Groesse,
// damit resize() eine echte Skalierung berechnet.
function sizeCanvas(el: unknown, w: number, h: number): void {
  Object.defineProperty(el, 'clientWidth', { value: w, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: h, configurable: true });
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0 }),
    configurable: true,
  });
}

// ------------------------------------------------- Globale Umgebung setzen

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
g.HTMLElement = win.HTMLElement;
g.devicePixelRatio = 2;
g.requestAnimationFrame = (cb: (t: number) => void) => win.setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => win.clearTimeout(id);

// Erst nach dem Aufbau der Umgebung laden - die Module greifen beim Import
// bereits auf document zu.
const { GameState } = await import('../src/game/state');
const { Renderer } = await import('../src/gfx/renderer');
const { UI } = await import('../src/ui/ui');
const { bindInput } = await import('../src/core/input');
const { TOWERS, TOWER_ORDER } = await import('../src/data/towers');
const { COLS, ROWS } = await import('../src/data/config');
const { TUTORIAL } = await import('../src/game/tutorial');

// ---------------------------------------------------------------- Ablauf

const problems: string[] = [];
const step = (name: string, fn: () => void): void => {
  try { fn(); } catch (e) { problems.push(`${name}: ${(e as Error).message}`); }
};

const canvas = win.document.getElementById('view') as unknown as HTMLCanvasElement;
if (!canvas) { console.error('RAUCHTEST: Leinwand #view fehlt im HTML.'); process.exit(1); }
sizeCanvas(canvas, 844, 390);

const state = new GameState();
const renderer = new Renderer(canvas);
let ui!: InstanceType<typeof UI>;

step('Oberflaeche aufbauen', () => { ui = new UI(state); });
step('Groesse berechnen', () => renderer.resize());
step('Eingabe verbinden', () => bindInput(canvas, state, renderer));
step('Titelbild zeichnen', () => renderer.draw(state));

if (problems.length) {
  console.error('RAUCHTEST: Aufbau fehlgeschlagen');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

// Die Baumenue-Knoepfe muessen tatsaechlich erzeugt worden sein.
const towerButtons = win.document.querySelectorAll('.tower-btn').length;
if (towerButtons !== TOWER_ORDER.length) {
  problems.push(`Baumenue zeigt ${towerButtons} statt ${TOWER_ORDER.length} Tuerme.`);
}

// Jede Einfuehrung zeigt auf ein Bedienelement. Fehlt eines - etwa weil ein
// Knopf umbenannt wurde -, zeigt der Satz ins Leere.
for (const step of TUTORIAL) {
  if (step.target === 'world') continue;
  if (!win.document.getElementById(step.target)) {
    problems.push(`Einfuehrung "${step.id}" zeigt auf "${step.target}" - das Element fehlt.`);
  }
}

// Jeder Schritt muss auch erfuellbar sein. Ein Schritt, dessen Bedingung nie
// eintritt, wuerde den Spieler in der Blase festhalten. Hier wird genau der
// Handgriff ausgefuehrt, den der Satz verlangt - und geprueft, ob er zaehlt.
{
  const probe = new GameState();
  probe.reset();
  const doStep: Record<string, () => void> = {
    pick: () => { probe.buildChoice = 'arrow'; },
    place: () => { probe.build(probe.map.hint.x, probe.map.hint.y, 'arrow'); },
    start: () => probe.startWave(),
    upgrade: () => { probe.gold += 2000; probe.upgrade(probe.towers[0]); },
    early: () => { probe.waveIndex = 1; probe.waveActive = false; probe.startWave(); },
    meteor: () => { probe.cast('meteor', probe.goal.x, probe.goal.y); },
    end: () => { probe.waveIndex = 3; },
  };
  for (const step of TUTORIAL) {
    const act = doStep[step.id];
    if (!act) { problems.push(`Einfuehrung "${step.id}": kein Handgriff im Rauchtest hinterlegt.`); continue; }
    act();
    if (!step.done(probe)) {
      problems.push(`Einfuehrung "${step.id}" gilt nach dem verlangten Handgriff nicht als erledigt.`);
    }
  }
}

// Eine echte Partie: bauen, ausbauen, Wellen starten, jedes Bild zeichnen.
// Ueber den Knopf starten statt direkt zuruecksetzen - so laeuft auch die
// Einfuehrung mit und ihre Positionsrechnung wird ausgefuehrt.
(win.document.getElementById('s-action') as unknown as HTMLButtonElement).click();
const spots: { x: number; y: number }[] = [];
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) if (state.canBuild(x, y)) spots.push({ x, y });
}
let spotIdx = 0, si = 0, frames = 0;
let outcome = 'playing';
const plan = TOWER_ORDER;
const DT = 1 / 60;

step('Partie durchspielen', () => {
  while (state.phase === 'playing' && frames < 60 * 60 * 12) {
    const id = plan[si % plan.length];
    if (spotIdx < spots.length && state.gold >= TOWERS[id].levels[0].cost) {
      const sp = spots[spotIdx++];
      if (state.build(sp.x, sp.y, id)) si++;
    }
    const up = state.towers.find(
      (t) => t.level < TOWERS[t.def].levels.length &&
        state.gold >= TOWERS[t.def].levels[t.level].cost + 80,
    );
    if (up) state.upgrade(up);
    if (state.canStartWave) state.startWave();
    // Faehigkeiten mitlaufen lassen - Zielhilfe und Einschlag zeichnen eigene Wege.
    if (frames % 300 === 0) state.chooseAbility('meteor');
    if (frames % 300 === 60 && state.enemies.length) {
      const e = state.enemies[0];
      state.cast('meteor', e.x, e.y);
    }
    if (frames % 500 === 0) state.chooseAbility('freeze');

    // Auswahl und Bauvorschau mitlaufen lassen - beide zeichnen eigene Wege.
    if (frames % 180 === 0) {
      state.buildChoice = plan[(frames / 180) % plan.length];
      state.hoverCell = { x: (frames / 180) % COLS, y: 2 };
      state.pendingCell = state.hoverCell;
    }
    if (frames % 180 === 90) {
      state.buildChoice = null;
      state.pendingCell = null;
      state.selectedTower = state.towers[0] ?? null;
    }

    state.update(DT);
    renderer.draw(state);
    ui.sync();
    ui.perf(60);
    frames++;
  }
  outcome = state.phase;
});

// Wenn die Partie in zwoelf Minuten Spielzeit nicht endet, haengt etwas -
// zum Beispiel eine Welle, die auf einen Gegner wartet, der nie stirbt.
if (outcome === 'playing') problems.push('Partie endet nicht - moeglicher Haenger in der Wellenlogik.');

// Genre-Kriterium F4: vor dem Kauf muessen die Werte sichtbar sein.
{
  state.selectedTower = null;
  state.buildChoice = 'mortar';
  ui.sync();
  const panel = win.document.getElementById('inspector');
  const text = panel?.textContent ?? '';
  if (panel?.hasAttribute('hidden')) {
    problems.push('Bauvorschau: der Inspektor bleibt verborgen, obwohl eine Turmart gewaehlt ist.');
  }
  for (const needle of ['Kosten', 'Schaden', 'Reichweite', 'Luftziele']) {
    if (!text.includes(needle)) {
      problems.push(`Bauvorschau: "${needle}" fehlt in den Werten vor dem Kauf.`);
    }
  }
  state.buildChoice = null;
  ui.sync();
}

// Die Auswertung darf nicht nur hübsch sein, sie muss stimmen.
{
  const st = state.stats;
  if (st.damage <= 0) problems.push('Auswertung: kein Schaden mitgeschrieben.');
  if (st.goldSpent <= 0) problems.push('Auswertung: kein ausgegebenes Gold mitgeschrieben.');
  if (st.towersBuilt < state.towers.length) {
    problems.push(`Auswertung: ${st.towersBuilt} gebaute Tuerme, aber ${state.towers.length} stehen im Feld.`);
  }
  const bySource = Object.values(st.damageBy).reduce((a, b) => a + b, 0);
  if (Math.abs(bySource - st.damage) > 1) {
    problems.push(`Auswertung: Schaden nach Quelle (${Math.round(bySource)}) passt nicht zur Summe (${Math.round(st.damage)}).`);
  }
  const leaked = st.leaksByWave.reduce((a, b) => a + (b ?? 0), 0);
  const lost = 20 - state.lives;
  if (state.phase !== 'playing' && leaked < lost) {
    problems.push(`Auswertung: ${leaked} Kristallverlust verbucht, aber ${lost} fehlen.`);
  }
}

// Endbildschirm und Neustart muessen ebenfalls durchlaufen.
step('Endbildschirm', () => {
  ui.showScreen(state.phase === 'won' ? 'won' : 'lost');
  renderer.draw(state);
});
step('Neustart', () => {
  state.reset();
  for (let i = 0; i < 120; i++) { state.update(DT); renderer.draw(state); ui.sync(); }
});
step('Groessenwechsel', () => {
  sizeCanvas(canvas, 1440, 780);
  renderer.resize();
  renderer.draw(state);
});

if (problems.length) {
  console.error('RAUCHTEST: nicht bestanden');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(
  `RAUCHTEST: bestanden. ${frames} Bilder gezeichnet, ` +
  `Partie endete als "${outcome}", ${towerButtons} Baumenue-Knoepfe.`,
);
