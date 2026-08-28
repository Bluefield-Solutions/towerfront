import './style.css';
import { Loop } from './core/loop';
import { Menu } from './game/menu';
import { saveSettings } from './core/storage';
import { loadGame } from './game/save';
import { bindInput } from './core/input';
import { Sfx } from './core/audio';
import { getSettings } from './core/storage';
import { GameState } from './game/state';
import { auswertung } from './game/auswertung';
import { saveGame } from './game/save';
import { Renderer } from './gfx/renderer';
import { UI } from './ui/ui';
import { messungGewuenscht, messungStarten } from './core/messung';

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
  // Eine von Hand gesetzte Aussaat gilt fuer GENAU DIESE Partie und wird
  // danach vergessen (T10). Sie stehen zu lassen waere die schlimmere
  // Ueberraschung: wer einen Lauf einmal nachstellt, will nicht, dass die
  // naechsten zehn Partien dieselben sind, ohne dass es irgendwo steht.
  const aussaat = ui.wunschAussaat ?? undefined;
  ui.wunschAussaat = null;
  state.reset(aussaat, difficulty, mapId, { endless });
  renderer.menu = null;
  ui.hideScreen();
  ui.setSpielansicht(true);
};
menu.onOptionen = () => ui.zeigeOptionen();
menu.onResume = () => {
  const save = loadGame();
  if (save && state.restore(save)) {
    renderer.menu = null;
    ui.hideScreen();
    ui.setSpielansicht(true);
  }
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
  ui.setSpielansicht(false);
};

/** Das Ergebnis einer Partie - auf der Leinwand, in derselben Formensprache
 *  wie die Landkarte. */
function showResult(): void {
  // Eingetragen hat das Ergebnis der Spielzustand selbst, als die Partie zu
  // Ende ging. Hier wird nur noch abgelesen - siehe auswertung.ts.
  menu.result = auswertung(state);
  menu.resultAge = 0;
  menu.view = 'result';
  renderer.menu = menu;
  ui.hideScreen();
  ui.setSpielansicht(false);
}

menu.onRetry = () => {
  const r = menu.result;
  if (!r) return;
  state.reset(undefined, state.difficulty, r.mapId, { endless: menu.endless });
  menu.result = null;
  renderer.menu = null;
  ui.hideScreen();
  ui.setSpielansicht(true);
};

/** Level neu starten - dieselbe Karte, derselbe Grad, von Welle eins.
 *
 *  Der Fortschritt der laufenden Partie ist damit weg; das ist gewollt, denn
 *  genau dafuer druecken Leute "neu starten". Der Spielstand anderer Karten
 *  bleibt unberuehrt, weil `reset` nur die laufende Partie ersetzt. */
ui.onRestart = () => {
  state.reset(undefined, state.difficulty, state.map.id, { endless: menu.endless });
  menu.result = null;
  renderer.menu = null;
  ui.hideScreen();
  ui.setSpielansicht(true);
};

/** Zurueck zur Kartenuebersicht.
 *
 *  Vorher gespeichert, damit die Partie beim naechsten Aufruf fortgesetzt
 *  werden kann - wer eine Karte verlaesst, will sie nicht verlieren. */
ui.onQuit = () => {
  if (state.phase === 'playing') saveGame(state.snapshot());
  ui.openMenu();
};

// Die Turmwahl am Bauplatz braucht zweierlei aus dem Hauptteil: wo die Stelle
// auf dem Schirm liegt, und was beim Antippen geschehen soll.
ui.worldToScreen = (x, y) => renderer.worldToScreen(x, y);
ui.onPick = (id, x, y) => { if (state.build(x, y, id)) Sfx.play('build'); };

layout();
bindInput(canvas, state, renderer);

// Beim ersten Laden steht die Landkarte, aber es gibt keinen Phasenwechsel -
// also lief `openMenu` nie, und die Turmleiste blieb ueber der Karte stehen.
// Genau der Fehler, der in v51 schon einmal behoben schien: dort war nur der
// Weg ueber den Phasenwechsel abgedeckt, nicht der Start.
ui.istMenuOffen = () => renderer.menu !== null;
ui.openMenu();

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
      else showResult();
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

// T11: eine Ausnahme darf nicht stumm bleiben.
//
// Bis v179 blieb die Leinwand bei einem Absturz einfach stehen. Der Spieler
// sah ein eingefrorenes Bild und hatte nichts in der Hand; ich bekam
// "es ging nicht mehr weiter" und baute eine Vermutung drumherum. Jetzt
// liegt der Lauf als Textblock da - Aussaat, Karte, Grad, Welle -, und
// damit ist er nachstellbar.
//
// Gemeldet wird nur der ERSTE Fehler. Ein Absturz in der Zeichenschleife
// wiederholt sich sechzig Mal in der Sekunde, und ein Fenster, das sich
// selbst immer wieder aufreisst, ist schlimmer als keines.
let fehlerGemeldet = false;
const fehlerMelden = (grund: string): void => {
  if (fehlerGemeldet) return;
  fehlerGemeldet = true;
  ui.zeigeFehler(grund);
};
window.addEventListener('error', (e) => fehlerMelden(e.message || 'Fehler'));
window.addEventListener('unhandledrejection', (e) => {
  fehlerMelden(String((e as PromiseRejectionEvent).reason ?? 'Abgewiesenes Versprechen'));
});
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

// --- Die Messung auf dem Zielgeraet (D27).
//
// Nur mit `#messung` in der Adresse. Ohne die Raute passiert nichts: kein
// Knopf, keine Anzeige, kein Rechenaufwand. Dieselbe Ueberlegung wie Regel 6 -
// was nicht hingehoert, darf nicht versehentlich auftauchen koennen.
//
// Sie laeuft NEBEN dem Spiel her und misst, was das Spiel ohnehin tut. Ein
// eigener Pruefablauf wuerde sich selbst messen.
if (messungGewuenscht()) messungStarten();
