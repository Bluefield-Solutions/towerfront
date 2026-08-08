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
const { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor } = await import('../src/data/towers');

const { TUTORIAL } = await import('../src/game/tutorial');
const { WORLD_W, WORLD_H } = await import('../src/data/config');

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
    place: () => { probe.build(probe.map.hint, 'arrow'); },
    start: () => probe.startWave(),
    upgrade: () => { probe.gold += 2000; probe.upgrade(probe.towers[0], 0); },
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
const spots = state.map.spots.map((_, i) => i);
let spotIdx = 0, si = 0, frames = 0;
let outcome = 'playing';
const plan = TOWER_ORDER;
const DT = 1 / 60;

step('Partie durchspielen', () => {
  while (state.phase === 'playing' && frames < 60 * 60 * 12) {
    const id = plan[si % plan.length];
    if (spotIdx < spots.length && state.gold >= TOWERS[id].base.cost) {
      const sp = spots[spotIdx++];
      if (state.build(sp, id)) si++;
    }
    const up = state.towers.find((t) => {
      if (t.level >= MAX_LEVEL) return false;
      const n = nextFor(TOWERS[t.def], t.branch ?? ((t.id % 2) as 0 | 1), t.level);
      return !!n && state.gold >= n.cost + 80;
    });
    if (up) state.upgrade(up, (up.branch ?? ((up.id % 2) as 0 | 1)) as 0 | 1);
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
      state.hoverSpot = (frames / 180) % state.map.spots.length;
      state.pendingSpot = state.hoverSpot;
    }
    if (frames % 180 === 90) {
      state.buildChoice = null;
      state.pendingSpot = -1;
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

// Verzweigter Ausbau: auf Stufe 1 muessen zwei Zweige zur Wahl stehen, und
// die Wahl muss endgueltig sein.
{
  const probe = new GameState();
  probe.reset();
  probe.gold = 5000;
  probe.build(probe.map.hint, 'arrow');
  const t = probe.towers[0];
  if (t.branch !== null) problems.push('Zweige: ein frisch gebauter Turm hat schon einen Zweig.');
  if (probe.upgrade(t)) problems.push('Zweige: Ausbau ohne Zweigwahl war moeglich.');
  if (!probe.upgrade(t, 1)) problems.push('Zweige: Ausbau mit Zweigwahl schlug fehl.');
  if (t.branch !== 1) problems.push('Zweige: der gewaehlte Zweig wurde nicht uebernommen.');
  if (!probe.upgrade(t, 0)) problems.push('Zweige: zweiter Ausbau schlug fehl.');
  if (t.branch !== 1) problems.push('Zweige: der Zweig liess sich nachtraeglich wechseln.');
  if (t.level !== 3) problems.push(`Zweige: Stufe ${t.level} statt 3 nach zwei Ausbauten.`);
  if (probe.upgrade(t, 0)) problems.push('Zweige: Ausbau ueber die Endstufe hinaus war moeglich.');

  // Und die Oberflaeche muss die Wahl auch anbieten - geprueft am echten
  // Zustand, an dem die Oberflaeche haengt.
  const live = state.towers[0];
  if (live) {
    const keepLevel = live.level, keepBranch = live.branch;
    live.level = 1; live.branch = null;
    state.selectedTower = live;
    state.gold = 5000;
    ui.sync();
    const ups = win.document.getElementById('i-ups')?.querySelectorAll('button').length ?? 0;
    if (ups !== 2) problems.push(`Zweige: ${ups} Auswahlknoepfe statt 2 auf Stufe 1.`);
    live.level = keepLevel; live.branch = keepBranch;
    state.selectedTower = null;
    ui.sync();
  }
}

// Das Bildraster der Leinwand muss immer zu ihrer Flaeche passen.
//
// Weicht es ab, streckt der Browser das fertige Bild ungleichmaessig - das
// Spielfeld wird flachgedrueckt. Genau das ist in v27 passiert, weil `resize`
// einmal zu frueh lief und die Leinwand ihre Standardgroesse behielt.
// Geprueft wird deshalb auch der Fall, in dem `resize` gar nicht erst
// aufgerufen wurde: ein Bild zeichnen muss reichen, um es zu heilen.
{
  for (const [w, h] of [[844, 390], [390, 844], [1440, 780], [2200, 500]] as const) {
    sizeCanvas(canvas, w, h);
    renderer.resize();
    if (renderer.frameSkew() > 0.01) {
      problems.push(
        `Seitenverhaeltnis: bei ${w}x${h} weicht das Bildraster um ` +
        `${(renderer.frameSkew() * 100).toFixed(0)} % ab.`,
      );
    }
  }

  // Der eigentliche Fehlerfall: Groesse aendert sich, resize wird NICHT
  // gerufen, es wird nur gezeichnet.
  sizeCanvas(canvas, 900, 420);
  renderer.draw(state);
  if (renderer.frameSkew() > 0.01) {
    problems.push(
      'Seitenverhaeltnis: eine Groessenaenderung ohne resize wird beim Zeichnen ' +
      'nicht geheilt - das Feld bliebe verzerrt.',
    );
  }
  sizeCanvas(canvas, 844, 390);
  renderer.resize();
}

// Die Leiste muss sich ein- und ausklappen lassen.
{
  const dock = win.document.getElementById('dock')!;
  const toggle = win.document.getElementById('dock-toggle')!;
  const before = dock.dataset.folded ?? '0';
  toggle.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  if ((dock.dataset.folded ?? '0') === before) {
    problems.push('Die Bedienleiste laesst sich nicht einklappen.');
  }
  toggle.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  if ((dock.dataset.folded ?? '0') !== before) {
    problems.push('Die Bedienleiste laesst sich nicht wieder ausklappen.');
  }
}

// Kamera: fuellen, verschieben, zoomen - und nie ueber den Rand hinaus.
//
// Das Spielfeld fuellt jetzt den Bildschirm, statt zwischen Baendern zu
// liegen. Damit wird das Verschieben zur eigentlichen Fehlerquelle: ein
// falsch begrenzter Ausschnitt zeigt schwarze Flaechen neben dem Feld.
{
  for (const [w, h] of [[844, 390], [1440, 780], [2200, 500], [390, 844]] as const) {
    sizeCanvas(canvas, w, h);
    renderer.resize();

    // Startzustand fuellt den Bildschirm: in einer Richtung genau passend,
    // in der anderen ueberstehend.
    const cover = Math.max(w / WORLD_W, h / WORLD_H);
    if (Math.abs(renderer.scale - cover) > 1e-3) {
      problems.push(`Kamera bei ${w}x${h}: Startmassstab ${renderer.scale.toFixed(3)}, erwartet ${cover.toFixed(3)}.`);
    }

    // Weit in jede Richtung schieben - danach darf kein Rand sichtbar sein.
    for (const [dx, dy] of [[9000, 9000], [-9000, -9000], [9000, -9000]] as const) {
      renderer.panBy(dx, dy);
      const tl = renderer.screenToWorld(0, 0);
      const br = renderer.screenToWorld(w, h);
      const eps = 0.5;
      if (br.x - tl.x <= WORLD_W + eps && (tl.x < -eps || br.x > WORLD_W + eps)) {
        problems.push(`Kamera bei ${w}x${h}: waagerecht ueber den Rand geschoben (${tl.x.toFixed(0)}..${br.x.toFixed(0)}).`);
      }
      if (br.y - tl.y <= WORLD_H + eps && (tl.y < -eps || br.y > WORLD_H + eps)) {
        problems.push(`Kamera bei ${w}x${h}: senkrecht ueber den Rand geschoben (${tl.y.toFixed(0)}..${br.y.toFixed(0)}).`);
      }
    }

    // Ganz herauszoomen zeigt alles, ganz hinein bleibt begrenzt.
    renderer.toggleOverview();
    if (!renderer.atOverview) problems.push(`Kamera bei ${w}x${h}: Uebersicht laesst sich nicht einschalten.`);
    const tl = renderer.screenToWorld(0, 0);
    const br = renderer.screenToWorld(w, h);
    if (tl.x > 0.5 || tl.y > 0.5 || br.x < WORLD_W - 0.5 || br.y < WORLD_H - 0.5) {
      problems.push(`Kamera bei ${w}x${h}: in der Uebersicht ist nicht das ganze Feld zu sehen.`);
    }
    renderer.zoomAt(6, w / 2, h / 2);
    if (renderer.scale > renderer.coverScale * 3 + 1e-6) {
      problems.push(`Kamera bei ${w}x${h}: Zoom nicht begrenzt.`);
    }
    renderer.toggleOverview();
  }
  sizeCanvas(canvas, 844, 390);
  renderer.resize();
}

// Titelbildschirm: Modus, Karten, Grade und Fortschritt muessen erscheinen.
{
  ui.showScreen('title');
  const need: [string, number][] = [['s-mode', 2], ['s-maps', 3], ['s-grades', 3], ['s-perks', 5]];
  for (const [id, min] of need) {
    const n = win.document.getElementById(id)?.querySelectorAll('button').length ?? 0;
    if (n < min) problems.push(`Titelbildschirm: "${id}" zeigt ${n} Knoepfe, erwartet mindestens ${min}.`);
  }
  ui.hideScreen();
}

// Jeder Turmzustand braucht ein gerendertes Bild - sonst steht ein
// gezeichneter Turm neben elf gerenderten und faellt sofort auf.
{
  const { hasTowerArt } = await import('../src/gfx/towerart');
  for (const id of TOWER_ORDER) {
    if (!hasTowerArt(id, null)) problems.push(`Turmbild fehlt: ${id} Stufe 1.`);
    for (const b of [0, 1] as const) {
      if (!hasTowerArt(id, b)) {
        problems.push(`Turmbild fehlt: ${id} Zweig ${TOWERS[id].branches[b].id}.`);
      }
    }
  }
}

// Jede Gegnerart braucht ein gerendertes Bild - sonst laeuft eine gezeichnete
// Silhouette zwischen gerenderten Fahrzeugen.
{
  const { hasEnemyArt } = await import('../src/gfx/enemyart');
  const { ENEMIES } = await import('../src/data/enemies');
  for (const id of Object.keys(ENEMIES) as (keyof typeof ENEMIES)[]) {
    if (!hasEnemyArt(id)) problems.push(`Gegnerbild fehlt: ${id}.`);
  }
}

// Jeder Zweig braucht einen eigenen Umriss. Geprueft wird nicht das Aussehen,
// sondern dass ueberhaupt unterschiedliche Bilder entstehen: gleiche Bildpunkte
// hiessen gleicher Turm, und dann verrieten nur noch die Farben, was da steht.
{
  const { getTowerBase, getTowerWeapon } = await import('../src/gfx/sprites');
  for (const id of TOWER_ORDER) {
    for (const level of [2, 3]) {
      const a = getTowerBase(id, 0, level), b = getTowerBase(id, 1, level);
      if (a === b) problems.push(`Umriss: ${id} Stufe ${level} liefert fuer beide Zweige dasselbe Bild.`);
      const wa = getTowerWeapon(id, 0, level), wb = getTowerWeapon(id, 1, level);
      if (wa === wb) problems.push(`Umriss: ${id} Waffe Stufe ${level} ist fuer beide Zweige gleich.`);
    }
  }
}

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

// Jede Karte muss sich aufbauen und zeichnen lassen. Ein Pfad, der ins Leere
// fuehrt, oder eine Farbwelt mit Luecke faellt sonst erst beim Antippen auf.
{
  const { MAPS } = await import('../src/data/maps');
  const { hasBackground } = await import('../src/gfx/backgrounds');
  for (const m of MAPS) {
    if (!hasBackground(m.id)) {
      problems.push(`Karte ${m.name} hat kein Untergrundbild - sie faellt optisch aus der Reihe.`);
    }
    step(`Karte ${m.name}`, () => {
      state.reset(4711, 'normal', m.id);
      if (state.map.id !== m.id) throw new Error('Karte wurde nicht geladen.');
      if (!state.lanes.length) throw new Error('keine Bahn in Weltkoordinaten.');
      for (const lane of state.lanes) {
        const end = lane.pts[lane.pts.length - 1];
        if (Math.abs(end.x - state.goal.x) > 2 || Math.abs(end.y - state.goal.y) > 2) {
          throw new Error('eine Bahn endet nicht am Kristall.');
        }
      }
      state.startWave();
      for (let i = 0; i < 60 * 45; i++) { state.update(DT); renderer.draw(state); }
      if (!state.stats.kills && !state.leakedTotal) {
        throw new Error('in 45 Sekunden kam kein einziger Gegner an oder um.');
      }
    });
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
