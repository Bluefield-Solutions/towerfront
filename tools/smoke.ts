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
const { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor, statsFor } = await import('../src/data/towers');

const { TUTORIAL } = await import('../src/game/tutorial');
const { candidateSpots } = await import('./spots');
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
    place: () => { probe.build(probe.map.hint.x, probe.map.hint.y, 'arrow'); },
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
const spots = candidateSpots(state);
let spotIdx = 0, si = 0, frames = 0;
let outcome = 'playing';
const plan = TOWER_ORDER;
const DT = 1 / 60;

step('Partie durchspielen', () => {
  while (state.phase === 'playing' && frames < 60 * 60 * 12) {
    const id = plan[si % plan.length];
    if (spotIdx < spots.length && state.gold >= TOWERS[id].base.cost) {
      const sp = spots[spotIdx++];
      if (state.build(sp.x, sp.y, id)) si++;
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
      state.hoverPoint = spots[(frames / 180) % Math.max(1, spots.length)] ?? null;
      state.pendingPoint = state.hoverPoint;
    }
    if (frames % 180 === 90) {
      state.buildChoice = null;
      state.pendingPoint = null;
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
  probe.build(probe.map.hint.x, probe.map.hint.y, 'arrow');
  const t = probe.towers[0];
  if (t.branch !== null) problems.push('Zweige: ein frisch gebauter Turm hat schon einen Zweig.');
  if (probe.upgrade(t)) problems.push('Zweige: Ausbau ohne Zweigwahl war moeglich.');
  if (!probe.upgrade(t, 1)) problems.push('Zweige: Ausbau mit Zweigwahl schlug fehl.');
  if (t.branch !== 1) problems.push('Zweige: der gewaehlte Zweig wurde nicht uebernommen.');
  if (!probe.upgrade(t, 0)) problems.push('Zweige: zweiter Ausbau schlug fehl.');
  if (t.branch !== 1) problems.push('Zweige: der Zweig liess sich nachtraeglich wechseln.');
  if (t.level !== 3) problems.push(`Zweige: Stufe ${t.level} statt 3 nach zwei Ausbauten.`);
  // Bis zur Endstufe durchbauen und dann einen Schritt zu weit versuchen.
  probe.gold = 100000;
  while (t.level < MAX_LEVEL) {
    if (!probe.upgrade(t, 0)) { problems.push(`Zweige: Ausbau auf Stufe ${t.level + 1} schlug fehl.`); break; }
  }
  if (t.level !== MAX_LEVEL) problems.push(`Zweige: Endstufe ${t.level} statt ${MAX_LEVEL}.`);
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

// Ein Turm muss aus 22 Punkten Entfernung noch zu treffen sein.
//
// Das Werkzeug `beruehrung` rechnet die Regel nach - aber es merkt nicht,
// wenn die Bedienung sie gar nicht anwendet. Deshalb hier eine Probe am
// Verhalten: ein Turm wird gesetzt, und aus dem halben Richtwert Entfernung
// muss der Tipper ihn finden. Auf dem kleinsten Geraet, also beim
// unguenstigsten Massstab.
{
  const probe = new GameState();
  probe.reset();
  probe.gold = 9000;
  probe.build(probe.map.hint.x, probe.map.hint.y, 'arrow');
  const t = probe.towers[0];
  const scale = Math.max(568 / 1920, 320 / 1080);
  // 22 Bildschirmpunkte entsprechen so vielen Weltpixeln:
  const weit = 22 / scale;
  if (!probe.towerUnder(t.x + weit, t.y, scale)) {
    problems.push(
      `Beruehrung: ein Turm ist aus 22 Punkten Entfernung nicht zu treffen ` +
      `(${weit.toFixed(0)} Weltpixel bei Massstab ${scale.toFixed(3)}).`,
    );
  }
  // Und weit daneben darf er nicht mehr treffen - sonst waere die Zugabe
  // nicht grosszuegig, sondern kaputt.
  if (probe.towerUnder(t.x + weit * 4, t.y, scale)) {
    problems.push('Beruehrung: ein Turm wird noch aus 88 Punkten Entfernung getroffen.');
  }
}

// Politur darf das Spiel nicht anhalten.
//
// Trefferstopp ist der aelteste Kniff des Handwerks - und der am leichtesten
// uebertriebene. Geprueft wird deshalb die Obergrenze: ueber eine ganze Welle
// darf hoechstens ein Zehntel der Zeit stillstehen.
{
  const probe = new GameState();
  probe.reset(99, 'normal');
  probe.gold = 100000;
  const cand = candidateSpots(probe).slice(0, 12);
  for (const sp of cand) probe.build(sp.x, sp.y, 'mortar');
  probe.waveIndex = probe.waves.length - 1;
  probe.startWave();
  let stopped = 0, total = 0;
  for (let i = 0; i < 60 * 60; i++) {
    const before = probe.hitStop;
    probe.update(DT);
    total += DT;
    if (before > 0) stopped += DT;
  }
  const share = stopped / total;
  if (share > 0.1) {
    problems.push(`Politur: ${(share * 100).toFixed(0)} % der Zeit steht das Spiel still - hoechstens 10 % sind vorgesehen.`);
  }
  if (stopped <= 0) {
    problems.push('Politur: der Trefferstopp loest nie aus - dann ist er nicht eingebaut.');
  }
}

// Jeder Ausbauzweig muss antippbar sein - und der Pruefsteg muss auf den
// Bildschirm passen.
//
// Auf dem Handy quer lief der Pruefsteg unten aus dem Bild, und der zweite
// Zweigknopf war nicht erreichbar. Ein Knopf, den man nicht treffen kann, ist
// dasselbe wie ein fehlender Knopf.
{
  const probe = new GameState();
  probe.reset();
  probe.gold = 9000;
  probe.build(probe.map.hint.x, probe.map.hint.y, 'arrow');
  state.selectedTower = null;
  const before = state.towers.length;
  void before;

  // Denselben Zustand im echten Steg herstellen.
  state.gold = 9000;
  if (!state.towers.length) state.build(state.map.hint.x, state.map.hint.y, 'arrow');
  const tw = state.towers[0];
  tw.branch = null; tw.level = 1;
  state.selectedTower = tw;
  ui.sync();

  const ups = win.document.getElementById('i-ups')!;
  const buttons = [...ups.querySelectorAll('button')];
  if (buttons.length !== 2) {
    problems.push(`Ausbau: ${buttons.length} Zweigknoepfe statt zwei.`);
  }
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i] as HTMLButtonElement;
    if (b.disabled) problems.push(`Ausbau: Zweigknopf ${i} ist gesperrt, obwohl Gold reicht.`);
    if (b.dataset.branch !== String(i)) {
      problems.push(`Ausbau: Zweigknopf ${i} traegt die Kennung "${b.dataset.branch}".`);
    }
  }
  // Beide Zweige muessen sich auch tatsaechlich waehlen lassen.
  for (const branch of [0, 1] as const) {
    const t2 = new GameState();
    t2.reset(); t2.gold = 9000; t2.build(t2.map.hint.x, t2.map.hint.y, 'arrow');
    if (!t2.upgrade(t2.towers[0], branch)) {
      problems.push(`Ausbau: Zweig ${branch} liess sich nicht waehlen.`);
    } else if (t2.towers[0].branch !== branch) {
      problems.push(`Ausbau: Zweig ${branch} gewaehlt, gespeichert wurde ${t2.towers[0].branch}.`);
    }
  }
  state.selectedTower = null;
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

    // Die Uebersicht fuellt den Bildschirm - weiter heraus geht nicht.
    //
    // Vorher wurde hier geprueft, dass in der Uebersicht das GANZE Feld zu
    // sehen ist. Genau das war der Fehler, der aus dem Spiel gemeldet wurde:
    // dann liegen schwarze Balken um das Kartenbild. Jetzt wird das Gegenteil
    // geprueft - kein Rand darf ins Bild.
    // Erst hineinziehen, sonst schaltet das Umschalten in die Nahsicht -
    // seit die Uebersicht der Startzustand ist, ist sie schon aktiv.
    renderer.zoomAt(2.5, w / 2, h / 2);
    renderer.toggleOverview();
    if (!renderer.atOverview) problems.push(`Kamera bei ${w}x${h}: Uebersicht laesst sich nicht einschalten.`);
    const tl = renderer.screenToWorld(0, 0);
    const br = renderer.screenToWorld(w, h);
    if (tl.x < -0.5 || tl.y < -0.5 || br.x > WORLD_W + 0.5 || br.y > WORLD_H + 0.5) {
      problems.push(
        `Kamera bei ${w}x${h}: in der Uebersicht liegt ein Rand im Bild ` +
        `(${tl.x.toFixed(0)}/${tl.y.toFixed(0)} bis ${br.x.toFixed(0)}/${br.y.toFixed(0)}) - ` +
        'dort waere schwarz.',
      );
    }
    renderer.zoomAt(6, w / 2, h / 2);
    if (renderer.scale > renderer.coverScale * 3 + 1e-6) {
      problems.push(`Kamera bei ${w}x${h}: Zoom nicht begrenzt.`);
    }

    // Und von Hand ganz herausziehen darf ebenfalls keinen Rand zeigen.
    //
    // Vorher prueften wir nur das Umschalten - dabei wird ein fester Wert
    // gesetzt, und der war richtig. Der gemeldete Fehler entstand beim
    // Herausziehen mit zwei Fingern, wo die Grenze greift. Eine Pruefung, die
    // nur den bequemen Weg geht, findet den Fehler nicht.
    renderer.zoomAt(0.05, w / 2, h / 2);
    const wtl = renderer.screenToWorld(0, 0);
    const wbr = renderer.screenToWorld(w, h);
    if (wtl.x < -0.5 || wtl.y < -0.5 || wbr.x > WORLD_W + 0.5 || wbr.y > WORLD_H + 0.5) {
      problems.push(
        `Kamera bei ${w}x${h}: von Hand herausgezogen liegt ein Rand im Bild ` +
        `(${wtl.x.toFixed(0)}/${wtl.y.toFixed(0)} bis ${wbr.x.toFixed(0)}/${wbr.y.toFixed(0)}).`,
      );
    }
    // Fuer die naechste Bildschirmgroesse wieder auf den Startzustand -
    // sonst schleppt der vorige Durchgang seinen Zoom mit, und die Pruefung
    // des Startmassstabs schlaegt beim Nachfolger an.
    renderer.zoomAt(0.01, w / 2, h / 2);
  }
  sizeCanvas(canvas, 844, 390);
  renderer.resize();
}

// Die Schatten muessen in Lichtrichtung fallen, und die ist oben links.
//
// Alle drei Kartenbilder sind so gerendert - gemessen -140, -135 und -116
// Grad. Zeigen unsere Schatten woandershin, schwebt jeder Turm sichtbar ueber
// dem Boden, auf dem er steht.
{
  const { LICHT } = await import('../src/data/config');
  if (LICHT.x <= 0 || LICHT.y <= 0) {
    problems.push(
      `Licht: Schatten fallen nach ${LICHT.x}/${LICHT.y} - erwartet nach unten rechts ` +
      '(beide Werte positiv), weil die Sonne oben links steht.',
    );
  }
  if (Math.hypot(LICHT.x, LICHT.y) < 0.5) {
    problems.push('Licht: die Schattenrichtung ist zu kurz - die Schatten liegen unter dem Objekt.');
  }
}

// Die Waffenebene braucht immer beide Teile.
//
// Ein Sockel MIT eingebauter Waffe plus eine zweite Waffe darueber waere
// doppelt; eine Waffe ohne Sockel schwebt. Deshalb wird die Ebene nur
// benutzt, wenn beides vorliegt - und hier geprueft, dass die Bildgruppe nie
// nur die Haelfte enthaelt.
{
  const { OBJECT_ART } = await import('../src/gfx/assets/objects');
  for (const id of ['arrow', 'frost', 'mortar', 'prism']) {
    const hatWaffe = `waffe_${id}` in OBJECT_ART;
    const hatSockel = `sockel_${id}` in OBJECT_ART;
    if (hatWaffe !== hatSockel) {
      problems.push(
        `Waffenebene ${id}: ${hatWaffe ? 'Waffe ohne Sockel' : 'Sockel ohne Waffe'} - ` +
        'die Ebene braucht beide Teile, sonst bleibt sie ungenutzt.',
      );
    }
  }
}

// Was das Ausbaumenue zeigt, muss der Ausbau auch liefern.
//
// Nach der Umstellung auf das Reichweitensystem stand im Menue die alte
// handgeschriebene Zahl und gebaut wurde die berechnete - bei Stufe 5 klafften
// 519 gegen 600 Pixel. Ein Menue, das etwas anderes verspricht als es liefert,
// ist schlimmer als gar keins.
{
  for (const id of TOWER_ORDER) {
    const def = TOWERS[id];
    for (const b of [0, 1] as const) {
      for (let l = 1; l < MAX_LEVEL; l++) {
        const versprochen = nextFor(def, b, l);
        const geliefert = statsFor(def, b, l + 1);
        if (!versprochen) { problems.push(`Ausbaumenue: keine naechste Stufe fuer ${id}/${b} ab ${l}.`); continue; }
        for (const feld of ['range', 'damage', 'cost', 'cooldown'] as const) {
          if (versprochen[feld] !== geliefert[feld]) {
            problems.push(
              `Ausbaumenue: ${id}/${b} Stufe ${l + 1} verspricht ${feld} ${versprochen[feld]}, ` +
              `liefert ${geliefert[feld]}.`,
            );
          }
        }
      }
    }
  }
}

// Ausbauen muss ohne Rollen erreichbar sein.
//
// Gemeldet aus dem Spiel: der Ausbauknopf lag auf einem Querformat-Bildschirm
// unter dem Rand des Pruefstegs, man musste erst scrollen. Das ist die
// Handlung, derentwegen man den Steg oeffnet.
{
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const iUps = html.indexOf('id="i-ups"');
  const iStats = html.indexOf('id="i-stats"');
  if (iUps < 0 || iStats < 0) {
    problems.push('Pruefsteg: Ausbau- oder Werteblock fehlt.');
  } else if (iUps > iStats) {
    problems.push('Pruefsteg: die Werteliste steht vor dem Ausbauen - der Knopf rutscht unter den Rand.');
  }
  if (!/\.insp-stats \{[^}]*overflow-y: auto/.test(readFileSync(new URL('../src/style.css', import.meta.url), 'utf8'))) {
    problems.push('Pruefsteg: die Werteliste rollt nicht eigenstaendig - dann wandern die Knoepfe mit aus dem Bild.');
  }
}

// Im Menue darf keine Spielbedienung sichtbar sein.
//
// Der schwerste Fehler dieser Sitzung: das Menue wanderte auf die Leinwand,
// die Turmleiste blieb darueber stehen, und man kam nicht mehr ins Spiel.
// Die Bildabnahme sah es nicht, weil sie nur die Leinwand zeichnet - die
// Bedienung ist HTML. Also wird es hier geprueft.
{
  const sichtbar = (id: string): boolean => {
    let el: HTMLElement | null = win.document.getElementById(id);
    while (el) {
      if (el.hidden) return false;
      el = el.parentElement as HTMLElement | null;
    }
    return true;
  };
  const bedienung = ['hud', 'dock', 'inspector'];

  // Geprueft wird der Weg, den das Spiel wirklich geht: die Sichtbarkeit wird
  // in jedem Bild aus dem Zustand abgeleitet. Frueher wurde hier nur der
  // Schalter geprueft - und der Fehler lag genau daneben, naemlich in einem
  // Pfad, der den Schalter nie umlegte.
  ui.istMenuOffen = () => true;
  ui.sync();
  for (const id of bedienung) {
    if (sichtbar(id)) problems.push(`Menue: "${id}" ist sichtbar, obwohl das Menue offen ist.`);
  }

  // Auch nach einem Turmbau und einer Auswahl darf nichts durchschlagen.
  state.gold = 9000;
  state.build(state.map.hint.x, state.map.hint.y, 'arrow');
  state.selectedTower = state.towers[0] ?? null;
  state.buildChoice = 'frost';
  ui.sync();
  for (const id of bedienung) {
    if (sichtbar(id)) problems.push(`Menue: "${id}" taucht nach einer Auswahl wieder auf.`);
  }
  if (state.buildChoice !== null) problems.push('Menue: eine Turmwahl bleibt im Menue bestehen.');

  ui.istMenuOffen = () => false;
  ui.sync();
  for (const id of ['hud', 'dock']) {
    if (!sichtbar(id)) problems.push(`Spiel: "${id}" fehlt, obwohl gespielt wird.`);
  }
}

// Die Landkarte: jeder anklickbare Bereich muss auch gezeichnet worden sein.
//
// Die Bereiche entstehen beim Zeichnen - dadurch kann es keine Schaltflaeche
// geben, die man sieht, aber nicht trifft. Geprueft wird, dass alle Wege
// begehbar sind: Ort antippen, Einweisung, zurueck, Fortschritt, zurueck.
{
  const { Menu } = await import('../src/game/menu');
  const { drawMenu } = await import('../src/gfx/menurender');
  const { MAPS } = await import('../src/data/maps');
  const m = new Menu();
  const g = canvas.getContext('2d')!;

  const ids = () => { drawMenu(g, m); return m.hotspots.map((h) => h.id); };

  const onMap = ids();
  for (let i = 0; i < MAPS.length; i++) {
    if (!onMap.includes(`node:${i}`)) problems.push(`Landkarte: Ort ${i} fehlt.`);
  }
  if (!onMap.includes('progress')) problems.push('Landkarte: Fortschritt ist nicht erreichbar.');

  // Ein Ort fuehrt zur Einweisung, und die hat alles Noetige.
  const nodeSpot = m.hotspots.find((h) => h.id === 'node:1')!;
  m.tap(nodeSpot.x + nodeSpot.w / 2, nodeSpot.y + nodeSpot.h / 2);
  if (m.view !== 'brief') problems.push('Landkarte: ein Ort oeffnet keine Einweisung.');
  const onBrief = ids();
  for (const need of ['back', 'start', 'endless', 'diff:normal', 'diff:ruhig', 'diff:erbarmungslos']) {
    if (!onBrief.includes(need)) problems.push(`Einweisung: "${need}" fehlt.`);
  }

  // Schwierigkeit laesst sich wirklich waehlen.
  const dh = m.hotspots.find((h) => h.id === 'diff:erbarmungslos')!;
  m.tap(dh.x + 4, dh.y + 4);
  if (m.difficulty !== 'erbarmungslos') problems.push('Einweisung: Schwierigkeit laesst sich nicht waehlen.');

  const back = m.hotspots.find((h) => h.id === 'back')!;
  m.tap(back.x + 4, back.y + 4);
  if (m.view !== 'map') problems.push('Einweisung: kein Rueckweg zur Karte.');

  // Und der Fortschritt.
  ids();
  const pr = m.hotspots.find((h) => h.id === 'progress')!;
  m.tap(pr.x + 4, pr.y + 4);
  if (m.view !== 'progress') problems.push('Landkarte: Fortschritt oeffnet nicht.');
  ids();
  const back2 = m.hotspots.find((h) => h.id === 'back')!;
  m.tap(back2.x + 4, back2.y + 4);
  if (m.view !== 'map') problems.push('Fortschritt: kein Rueckweg zur Karte.');

  // Das Ergebnis einer Partie liegt auf derselben Flaeche wie die Karte.
  //
  // Bis v43 war es HTML ueber dem Spiel - zwei Formensprachen hintereinander,
  // und zugleich die letzte Flaeche, die in der Bildabnahme nie erschien.
  for (const won of [true, false]) {
    m.view = 'result' as typeof m.view;
    m.resultAge = 3;
    m.result = {
      won, mapId: 'spiralhain', mapName: 'Spiralhain', wave: won ? 15 : 11, waves: 15,
      lives: won ? 47 : 0, maxLives: 60, stars: won ? 2 : 0, before: 0,
      kills: 200, built: 9, damage: 90000, duration: 480,
    };
    const onResult = ids();
    for (const need of ['tomap', 'retry']) {
      if (!onResult.includes(need)) problems.push(`Ergebnis (${won ? 'Sieg' : 'Niederlage'}): "${need}" fehlt.`);
    }
    // Der Rueckweg zur Karte muss funktionieren.
    const tm = m.hotspots.find((h) => h.id === 'tomap')!;
    m.tap(tm.x + 4, tm.y + 4);
    if ((m.view as string) !== 'map') problems.push('Ergebnis: kein Rueckweg zur Karte.');
    if (m.result !== null) problems.push('Ergebnis: bleibt nach dem Rueckweg stehen.');
  }
  m.view = 'map';

  // Nichts darf ausserhalb des Feldes liegen - sonst ist es unerreichbar.
  drawMenu(g, m);
  for (const h of m.hotspots) {
    if (h.x < 0 || h.y < 0 || h.x + h.w > 1920 || h.y + h.h > 1080) {
      problems.push(`Landkarte: "${h.id}" liegt ausserhalb des Bildes.`);
    }
    if (Math.min(h.w, h.h) < 60) {
      problems.push(`Landkarte: "${h.id}" ist mit ${Math.round(Math.min(h.w, h.h))} Punkten zu klein zum Treffen.`);
    }
  }
}

// Titelbildschirm: eine Ebene, eine Entscheidung.
//
// Vorher standen vierzehn antippbare Elemente gleichzeitig da - zwei Modi,
// drei Karten, drei Grade, fuenf Verbesserungen, der Startknopf. Wer das
// erste Mal hinschaut, weiss nicht, wo er anfangen soll.
//
// Die Regel dahinter ist alt und gut belegt: eine Ebene stellt eine Frage.
// Alles Weitere liegt dahinter, sichtbar durch eine Zeile, die den aktuellen
// Wert zeigt. Geprueft wird deshalb die *Anzahl* - denn genau die war das
// Problem, nicht das Aussehen.
{
  ui.showScreen('title');
  const visible = (root: Element | null): number => {
    if (!root) return 0;
    let n = 0;
    for (const b of root.querySelectorAll('button')) {
      let el: Element | null = b;
      let hidden = false;
      while (el && el !== root.parentElement) {
        if ((el as HTMLElement).hidden) { hidden = true; break; }
        el = el.parentElement;
      }
      if (!hidden) n++;
    }
    return n;
  };

  const card = win.document.getElementById('s-card');
  const onFirstLevel = visible(card);
  const MAX_FIRST = 5;
  if (onFirstLevel > MAX_FIRST) {
    problems.push(
      `Titelbildschirm: ${onFirstLevel} antippbare Elemente auf der ersten Ebene - ` +
      `hoechstens ${MAX_FIRST} sind vorgesehen.`,
    );
  }

  // Die tieferen Ebenen muessen erreichbar sein und ihren Inhalt zeigen.
  for (const [opener, view, inner] of [
    ['s-choice', 'v-choose', [['s-maps', 3], ['s-grades', 3], ['s-mode', 2]]],
    ['s-open-progress', 'v-progress', [['s-perks', 5]]],
  ] as const) {
    (win.document.getElementById(opener) as HTMLButtonElement)
      .dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    if ((win.document.getElementById(view) as HTMLElement).hidden) {
      problems.push(`Titelbildschirm: "${view}" laesst sich nicht oeffnen.`);
    }
    for (const [id, min] of inner) {
      const n = win.document.getElementById(id)?.querySelectorAll('button').length ?? 0;
      if (n < min) problems.push(`Titelbildschirm: "${id}" zeigt ${n} Knoepfe, erwartet ${min}.`);
    }
    // Und wieder zurueck - eine Ebene ohne Rueckweg ist eine Sackgasse.
    const back = [...(win.document.getElementById(view) as HTMLElement)
      .querySelectorAll('button')].find((b) => b.className === 'back');
    if (!back) problems.push(`Titelbildschirm: "${view}" hat keinen Rueckweg.`);
    else {
      back.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      if (!(win.document.getElementById(view) as HTMLElement).hidden) {
        problems.push(`Titelbildschirm: "${view}" laesst sich nicht schliessen.`);
      }
    }
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
