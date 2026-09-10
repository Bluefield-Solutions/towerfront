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
import type { MenuView } from '../src/game/menu';
import type { GameState as Spielzustand } from '../src/game/state';

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

// Pfade rechnet die Werkstatt, nicht die Attrappe: die Baukante ist ein
// Path2D, und jsdom kennt keines.
const { pfadklasseStellen } = await import('./leinwand.mjs') as { pfadklasseStellen: () => void };
pfadklasseStellen();

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
// Fuer den Durchlauf ueber jede Karte (T6) - `step` ist synchron, der Import
// gehoert also hierher und nicht in den Schritt.
const { MAPS: ALLE_KARTEN } = await import('../src/data/maps');
const { Renderer } = await import('../src/gfx/renderer');
const { UI } = await import('../src/ui/ui');
const { bindInput } = await import('../src/core/input');
const { ABILITIES } = await import('../src/data/abilities');
const { TOWERS, TOWER_ORDER, BAU_ORDER, MAX_LEVEL, nextFor, statsFor } = await import('../src/data/towers');

const { TUTORIAL } = await import('../src/game/tutorial');
const { auswertung } = await import('../src/game/auswertung');
const { getBest, getProgress, getSettings, getStars, gegnerVergessen, saveSettings } = await import('../src/core/storage');
const { Sfx } = await import('../src/core/audio');
const { konterSatz } = await import('../src/data/konter');
const { wirkungAnlegen, wirkungenTicken, tempoFaktor } = await import('../src/data/wirkungen');
type EnemyId = Parameters<typeof konterSatz>[0];
const { candidateSpots } = await import('./spots');
const { WORLD_W, WORLD_H } = await import('../src/data/config');
const { EARLY_BONUS_WINDOW, EARLY_BONUS_MAX, EARLY_RISIKO_HUB } = await import('../src/data/waves');
const { VERBUND_UMKREIS } = await import('../src/game/verbund');
const { werteAmTurm } = await import('../src/game/turmwerte');

// ---------------------------------------------------------------- Ablauf

/** Der erste Turm, den der SPIELER gestellt hat.
 *
 *  Seit v165 steht die Zielunit als fuenfter Turm von Anfang an in
 *  `state.towers` - an Stelle NULL. Jede Pruefung hier meint aber den
 *  gebauten Turm: Ausbauzweige, Ziellogik, Versetzen, Verkaufen. Der
 *  Rauchtest hat es beim ersten Lauf selbst gemeldet, mit sechs Befunden
 *  auf einmal, und drei davon waren echte Spielfehler und keine
 *  Testartefakte (die Einweisung galt sofort als erledigt). */
const ersterTurm = (g: { gebaute: unknown[] }): any => g.gebaute[0];

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

// Eine Lautstaerke, die NICHT der Standard ist - sonst bewiese die Pruefung
// darunter nichts: 0,7 stuende auch dann im Tonwerk, wenn niemand sie
// gesetzt haette (Regel 13).
saveSettings({ volume: 0.42 });
step('Oberflaeche aufbauen', () => { ui = new UI(state); });
step('Gespeicherte Lautstaerke wird beim Start uebernommen', () => {
  if (Math.abs(Sfx.volume - 0.42) > 0.001) {
    throw new Error(
      `Das Tonwerk steht nach dem Aufbau auf ${Sfx.volume}, gespeichert waren 0,42. `
      + 'Die Einstellung steht im Speicher, der Regler zeigt sie an - und gehoert wird der Standardwert.',
    );
  }
  saveSettings({ volume: 0.7 });
  Sfx.setVolume(0.7);
});
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
if (towerButtons !== BAU_ORDER.length) {
  problems.push(`Baumenue zeigt ${towerButtons} statt ${BAU_ORDER.length} Bauwerke.`);
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
    upgrade: () => { probe.gold += 2000; probe.upgrade(ersterTurm(probe), 0); },
    // Der Verbund entsteht durch einen Nachbarn ANDERER Art im Umkreis.
    // Gesucht wird der naechste Platz, an dem wirklich einer steht - der
    // Frostturm braucht mehr Raum als der Bogenturm, und `candidateSpots`
    // rechnet fuer den Bogenturm.
    verbund: () => {
      probe.gold += 2000;
      const erst = ersterTurm(probe);
      const nah = candidateSpots(probe)
        .filter((p) => Math.hypot(p.x - erst.x, p.y - erst.y) > 0
          && Math.hypot(p.x - erst.x, p.y - erst.y) < VERBUND_UMKREIS)
        .sort((a, b) => Math.hypot(a.x - erst.x, a.y - erst.y)
          - Math.hypot(b.x - erst.x, b.y - erst.y));
      nah.some((p) => probe.build(p.x, p.y, 'frost'));
    },
    early: () => { probe.waveIndex = 1; probe.wellenZumPruefen([]); probe.startWave(); },
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
//
// **Mit fester Aussaat, und zwar auf dem Weg eines Spielers.**
//
// Bis v184 lief hier jede Runde ein ANDERES Spiel: der Knopf setzte die
// Partie mit einer Zufallsaussaat auf. Gemessen ueber fuenf gleiche Laeufe:
// Kristall 28, 48, 48, 45, 47 - erledigt 400 bis 419 - Sterne 2 oder 3.
// Alles, was danach eine Zahl aus dieser Partie prueft, prueft jedes Mal
// etwas anderes, und eine Gegenprobe an so einem Tor ist mal blind und mal
// nicht. Genau das hat der volle Probenlauf zu v184 gemeldet.
//
// Gesetzt wird ueber das EINGABEFELD, nicht ueber das Feld dahinter: so
// laeuft derselbe Weg wie beim Spieler - lesen, pruefen, uebernehmen -, und
// die Pruefung darunter faellt um, wenn dieser Weg bricht.
//
// **Die Zahl ist nicht beliebig.** Sechs Aussaaten durchprobiert: bei 4711,
// 2024, 815, 99 und 7 gewinnt die Partie mit DREI von drei Sternen, bei 1234
// mit zweien. Drei ist der Anschlag, und an einem Anschlag kann niemand mehr
// eine Veraenderung sehen - der Durchlauf weiter unten traegt dann keine
// Sterne mehr ein, die Gegenprobe an seiner Rueckstellung wird blind, und
// das Tor meldet gruen. Die Aussaat des Rauchtests muss den Stand also
// ungesaettigt lassen (Regel 2). Der Block unten prueft das selbst.
const AUSSAAT = 1234;
//
// **Gestartet wird seit v196 wie im Spiel** - `state.reset` mit der Aussaat.
//
// Bis v195 stand hier ein Klick auf "Beginnen" des HTML-Titelschirms. Der
// war seit v43 `display: none` und in keinem Browser mehr zu sehen; nur
// jsdom laesst `click()` auch auf verborgenen Knoepfen wirken. Der
// Rauchtest ist also fuenfzig Fassungen lang durch eine Tuer gegangen, die
// es nicht gab - und hat dabei den einzigen Aufruf der Einfuehrung
// mitgenommen, den es im ganzen Baum gab.
//
// Die Aussaat aus dem Einstellungsfeld (T10) wird trotzdem geprueft: das
// Feld ist lebendig, und `wunschAussaat` ist der Weg, den `menu.onStart`
// im Spiel geht.
{
  const feld = win.document.getElementById('o-seed') as unknown as HTMLInputElement;
  feld.value = String(AUSSAAT);
  feld.dispatchEvent(new win.Event('input', { bubbles: true }));
}
if (ui.wunschAussaat !== AUSSAAT) {
  problems.push(`Die Aussaat aus den Einstellungen kommt als ${ui.wunschAussaat} an, `
    + `nicht als ${AUSSAAT}. Wer einen Lauf nachstellen will, bekommt ein anderes Spiel.`);
}
state.reset(ui.wunschAussaat ?? undefined, getSettings().difficulty, getSettings().map);
ui.wunschAussaat = null;
if (state.seed !== AUSSAAT) {
  problems.push(`Die Partie laeuft auf Aussaat ${state.seed} statt ${AUSSAAT}. `
    + 'Damit spielt der Rauchtest jede Runde ein anderes Spiel, und jede Zahl '
    + 'darunter ist ein Zufallswert.');
}
// **Die Hauptpartie spielt mit allen vier Faehigkeiten** (C18).
//
// Seit v195 haengen drei davon an gewonnenen Karten, und im Rauchtest ist
// die Ablage bei jedem Lauf leer - der Bot haette also nur den Meteor. Das
// waere die falsche Messstelle: diese Partie ist der Abdeckungslauf, sie
// soll Zielhilfe, Einschlag und Frostschlag ZEICHNEN. Gemessen wurde der
// Unterschied auch: ohne den Frostschlag endet dieselbe Aussaat mit drei
// statt zwei Sternen - und drei ist der Anschlag, den der Kommentar oben
// ausdruecklich vermeidet.
//
// Die Sperre selbst wird weiter unten geprueft, mit ihren Gegenproben.
state.karten = ALLE_KARTEN.length;
// **Laeuft die Einfuehrung ueberhaupt?** (v196)
//
// Bis v195 lief sie kein einziges Mal im ausgelieferten Spiel: ihr einziger
// Aufruf hing am "Beginnen"-Knopf des HTML-Titelschirms, und der war seit
// v43 `display: none`. Siebzehn Tore waren gruen - weil keines gefragt hat,
// ob sie ANFAENGT. Geprueft wurde nur, ob ihre Schritte gut gebaut sind.
//
// Sie haengt jetzt an einem neuen Lauf, nicht an einem Knopf. Geprueft wird
// deshalb genau das, und in beide Richtungen: neuer Lauf zeigt sie, ein
// geladener nicht.
{
  const blase = win.document.getElementById('coach') as HTMLElement;
  ui.sync();
  if (blase.hidden) {
    problems.push('Einfuehrung: nach einem neuen Lauf erscheint keine Blase. '
      + 'Dann sieht ein neuer Spieler sie nie.');
  }
  const ersterSatz = (win.document.getElementById('coach-text')?.textContent ?? '').trim();
  if (ersterSatz !== TUTORIAL[0].text) {
    problems.push(`Einfuehrung: die Blase sagt "${ersterSatz}" statt "${TUTORIAL[0].text}".`);
  }
  // Gegenprobe: ein FORTGESETZTER Lauf bekommt sie nicht. Ohne diese Haelfte
  // waere "sie erscheint" auch dann gruen, wenn sie immer erschiene - und
  // eine Einweisung mitten in Welle neun ist Hohn.
  //
  // Am SELBEN Zustand und derselben Oberflaeche: eine zweite `UI` haengt
  // ihre Behandler ein zweites Mal an dieselben Knoepfe, und der erste
  // Versuch hat sich damit die Bedienleiste zerlegt.
  const stand = state.snapshot();
  if (!state.restore(stand)) {
    problems.push('Einfuehrung: der Stand fuer die Gegenprobe liess sich nicht laden.');
  }
  ui.sync();
  if (!blase.hidden) {
    problems.push('Einfuehrung: ein fortgesetzter Lauf zeigt sie trotzdem.');
  }
  // Und zurueck auf den Anfang - die Partie unten soll sie mitlaufen lassen.
  //
  // `reset` setzt `karten` neu aus der Ablage, also muss die Zeile von oben
  // HIER noch einmal stehen. Ohne sie spielte die Hauptpartie ohne den
  // Frostschlag und endete verloren statt gewonnen - gemessen, nicht
  // vermutet: 19294 gezeichnete Bilder und "won" wurden zu 18389 und "lost".
  state.reset(AUSSAAT, getSettings().difficulty, getSettings().map);
  state.karten = ALLE_KARTEN.length;

  // **Die Vorwahl aus `reset` darf die Vorkauf-Karte NICHT oeffnen** (v238).
  //
  // Sie ist da, damit die baubare Flaeche vom ersten Bild an sichtbar ist.
  // Haengt die Karte am selben Feld, steht sie von der ersten Sekunde an im
  // Bild und sperrt gemessen 39,5 % des Bildschirms statt 17,6 % - der neue
  // Spieler saehe die Antwort auf "wo darf ich bauen" und dahinter kein
  // Spielfeld mehr. Genau das ist beim ersten Anlauf passiert.
  //
  // Die Pruefung steht HIER und nicht bei der Bauvorschau weiter unten:
  // dort laeuft die Partie schon, und ein `reset` mittendrin loescht die
  // Mitschrift, aus der zwei spaetere Pruefungen ihre Zahlen nehmen.
  ui.sync();
  if (state.buildChoice === null) {
    problems.push('Vorwahl: nach einem neuen Lauf ist keine Turmsorte vorgewaehlt - '
      + 'dann bleibt die baubare Flaeche unsichtbar, bis der Spieler von selbst '
      + 'darauf kommt, in der Leiste zu tippen.');
  }
  if (!win.document.getElementById('inspector')?.hasAttribute('hidden')) {
    problems.push('Vorwahl: die Vorkauf-Karte steht schon im Bild, ohne dass jemand '
      + 'nach einem Turm gefragt hat - sie sperrt 39,5 % des Bildschirms.');
  }
  ui.sync();
}

const spots = candidateSpots(state);
// Der Sternestand VOR dieser Partie - fuer die Auswertung weiter unten.
const sterneVorDerPartie = getStars(state.map.id, state.difficulty);
// Und der GANZE Stand, nicht nur der dieser Karte.
//
// Der Durchlauf weiter unten spielt drei Karten. Traegt er dabei Sterne fuer
// Karten ein, die DIESE Partie nie gesehen hat, ist der Stand verunreinigt -
// und das sieht eine Zahl fuer die eigene Karte nicht. Zwei Netze also: hier
// die fremden Karten, unten im Durchlauf der Abdruck ueber alles.
const alleSterneVorDerPartie = { ...getProgress().stars };
let spotIdx = 0, si = 0, frames = 0;
let outcome = 'playing';
const plan = TOWER_ORDER;
const DT = 1 / 60;

/** Was der Bot in einem Bild entscheidet: bauen, ausbauen, Welle starten.
 *
 *  Herausgezogen, weil er seit v174 an zwei Stellen gebraucht wird - in der
 *  gezeichneten Partie hier und in den ungezeichneten Durchlaeufen ueber
 *  jede Karte und den Endlosmodus (T6). Zwei Bots waeren einer zu viel: der
 *  zweite haette angefangen, anders zu spielen als der erste, und dann
 *  saehen die beiden Laeufe nur noch aus, als pruefen sie dasselbe
 *  (Regel 15). */
function botSchritt(g: Spielzustand, plaetze: { x: number; y: number }[], z: { spot: number; si: number }): void {
  const id = TOWER_ORDER[z.si % TOWER_ORDER.length];
  if (z.spot < plaetze.length && g.gold >= g.baupreis(id)) {
    const sp = plaetze[z.spot++];
    if (g.build(sp.x, sp.y, id)) z.si++;
  }
  const up = g.towers.find((t) => {
    if (t.level >= MAX_LEVEL) return false;
    const n = nextFor(TOWERS[t.def], t.branch ?? ((t.id % 2) as 0 | 1), t.level);
    return !!n && g.gold >= n.cost + 80;
  });
  if (up) g.upgrade(up, (up.branch ?? ((up.id % 2) as 0 | 1)) as 0 | 1);
  // **Die Bots ueberlappen nicht** (S-P4-01, v266).
  //
  // Seit v266 darf eine zweite Welle starten, waehrend die erste laeuft -
  // `canStartWave` allein heisst also nicht mehr "nichts laeuft". Ein Bot, der
  // bei jeder Gelegenheit startet, faehrt damit dauerhaft zwei Wellen, und das
  // ist die AGGRESSIVSTE Spielweise, nicht die vernuenftige: gemessen verliert
  // die erste Karte damit in Welle 13, und C18 waere rot.
  //
  // Die Ueberlappung ist eine Entscheidung des Spielers. Die Balance ist gegen
  // einen Bot geeicht, der sie nicht trifft; wer sie messen will, misst sie
  // eigens (S-P4-02).
  if (g.canStartWave && !g.waveActive) g.startWave();
}

step('Partie durchspielen', () => {
  const zustand = { spot: spotIdx, si };
  while (state.phase === 'playing' && frames < 60 * 60 * 12) {
    botSchritt(state, spots, zustand);
    spotIdx = zustand.spot; si = zustand.si;
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
      state.selectedTower = ersterTurm(state) ?? null;
    }

    state.update(DT);
    renderer.draw(state);
    ui.sync();
    ui.perf(60);
    frames++;
  }
  outcome = state.phase;
});

// C27: der Endlosmodus hat einen eigenen Bestwert und eine eigene Liste.
//
// **Der Fund, den diese Pruefung festhaelt:** bis v181 teilte der
// Endlosmodus seinen Bestwert mit der normalen Partie. Weil er ueber den
// Wellenplan hinausgeht, schrieb ein Lauf bis Welle 21 genau das in den
// Bestwert einer Karte mit fuenfzehn Wellen - und der Titelbildschirm
// behauptete danach "bisher am weitesten: Welle 20". Eine Zahl, die es dort
// nicht geben kann, und niemand hat sie je gemessen.
{
  const { getBest, endlosBesten, recordEndlos, recordRun, getProgress: fortschritt }
    = await import('../src/core/storage');
  const vorher = { ...fortschritt().endlos };
  const eigen = fortschritt();
  eigen.endlos = {};

  // Gemessen wird die VERAENDERUNG, nicht ein fester Wert: die Hauptpartie
  // weiter oben hat auf dieser Karte laengst einen Bestwert hinterlassen,
  // und eine Pruefung, die 12 erwartet, prueft in Wahrheit die Reihenfolge
  // der Schritte in dieser Datei.
  const normalVorher = getBest('spiralhain', 'normal').wave;
  recordRun('spiralhain', 'normal', 21, 0, true);
  const normal = getBest('spiralhain', 'normal');
  const endlos = getBest('spiralhain', 'normal', true);
  if (normal.wave !== normalVorher) {
    problems.push(`Endlos: ein Endloslauf hat den normalen Bestwert von ${normalVorher} auf `
      + `${normal.wave} gehoben - auf einer Karte mit fuenfzehn Wellen ist das keine `
      + 'moegliche Zahl.');
  }
  if (endlos.wave !== 21) {
    problems.push(`Endlos: der eigene Bestwert steht auf ${endlos.wave}, erwartet 21.`);
  }

  // Die Liste: absteigend, hoechstens fuenf, und sie merkt sich mehr als eine.
  for (const w of [8, 21, 3, 14, 30, 5, 11]) recordEndlos('spiralhain', w);
  const liste = endlosBesten('spiralhain');
  if (liste.length !== 5) problems.push(`Endlosliste: ${liste.length} Eintraege, hoechstens fuenf.`);
  if (liste[0] !== 30) problems.push(`Endlosliste: fuehrt mit ${liste[0]}, erwartet 30.`);
  if (liste.some((v, i) => i > 0 && v > liste[i - 1])) {
    problems.push(`Endlosliste: nicht absteigend (${liste.join(', ')}).`);
  }
  if (endlosBesten('ascheschlucht').length) {
    problems.push('Endlosliste: eine andere Karte hat Eintraege abbekommen.');
  }
  eigen.endlos = vorher;
}

// T10 und T11: einen Lauf nachstellen und weitergeben.
//
// **Die Pruefung, die den Punkt traegt, ist nicht die Eingabe** - sie ist
// die Frage, ob dieselbe Aussaat wirklich denselben Lauf ergibt. Ein
// Eingabefeld, das eine Zahl entgegennimmt und danach etwas anderes
// passiert, waere schlimmer als keines: es verspricht Reproduzierbarkeit
// und liefert Zufall.
{
  const { laufAlsText, aussaatLesen } = await import('../src/game/mitschrift');
  const { candidateSpots: spotsT } = await import('./spots');

  // 1. Der Block nennt, was einen Lauf bestimmt.
  //
  // Auf einem EIGENEN Zustand, nicht auf dem der Hauptpartie: der erste
  // Anlauf setzte `state` zurueck und hat damit die Auswertung darunter
  // zerstoert - dieselbe Falle wie beim Durchlauf ueber jede Karte (T6).
  // Eine Pruefung, die den Zustand aendert, den andere lesen, ist keine.
  const laufProbe = new GameState();
  laufProbe.reset(4242, 'normal', 'ascheschlucht');
  const block = laufAlsText(laufProbe);
  for (const noetig of ['Aussaat', '4242', 'ascheschlucht', 'normal']) {
    if (!block.includes(noetig)) problems.push(`Laufblock: "${noetig}" fehlt darin.`);
  }

  // 2. Der Block laesst sich WIEDER EINLESEN - im Stueck, nicht nur als Zahl.
  if (aussaatLesen(block) !== 4242) {
    problems.push(`Laufblock: der eigene Block ergibt beim Einlesen ${aussaatLesen(block)} statt 4242.`);
  }
  if (aussaatLesen('4242') !== 4242) problems.push('Laufblock: eine nackte Zahl wird nicht angenommen.');
  if (aussaatLesen('Kaese') !== null) problems.push('Laufblock: Unsinn wird als Aussaat angenommen.');
  if (aussaatLesen('99999999999') !== null) problems.push('Laufblock: eine Zahl jenseits von 32 Bit wird angenommen.');

  // 3. **Dieselbe Aussaat, derselbe Lauf.** Zweimal gespielt, gleiche Zuege,
  //    und am Ende muessen alle Zahlen uebereinstimmen.
  const spiele = (aussaat: number) => {
    const g = new GameState();
    g.reset(aussaat, 'normal', 'ascheschlucht');
    const plaetze = spotsT(g);
    const z = { spot: 0, si: 0 };
    for (let i = 0; i < 60 * 90; i++) {
      botSchritt(g, plaetze, z);
      g.update(DT);
      if (g.phase !== 'playing') break;
    }
    return `${g.phase}|${g.lives}|${g.gold}|${Math.round(g.stats.damage)}|${g.stats.kills}|${g.waveNumber}`;
  };
  const a = spiele(4242), b = spiele(4242), c = spiele(4243);
  if (a !== b) {
    problems.push(`Aussaat 4242 ergibt zweimal Verschiedenes: "${a}" gegen "${b}". `
      + 'Ein Lauf laesst sich dann nicht nachstellen, und die Eingabe verspricht etwas Falsches.');
  }
  if (a === c) {
    problems.push('Aussaat 4242 und 4243 ergeben denselben Lauf - die Aussaat wirkt gar nicht, '
      + 'und die Pruefung darueber koennte nichts finden.');
  }

  // 4. Das Fehlerfenster: es zeigt den Lauf und laesst sich schliessen.
  const fm = document.getElementById('fehler-menu');
  const fb = document.getElementById('f-block') as HTMLTextAreaElement | null;
  if (!fm || !fb) {
    problems.push('Fehlerfenster: fehlt im Dokument.');
  } else {
    if (!fm.hidden) problems.push('Fehlerfenster: liegt offen, ohne dass etwas passiert ist.');
    ui.zeigeFehler('Probe');
    if (fm.hidden) problems.push('Fehlerfenster: bleibt zu, obwohl ein Fehler gemeldet wurde.');
    if (!fb.value.includes('Probe') || !fb.value.includes('Aussaat')) {
      problems.push('Fehlerfenster: der Block nennt weder den Anlass noch die Aussaat.');
    }
    (document.getElementById('f-zu') as HTMLButtonElement).dispatchEvent(new window.Event('click'));
    if (!fm.hidden) problems.push('Fehlerfenster: "Schliessen" schliesst es nicht.');
  }
}

// D6: der Einstellungsdialog.
//
// Geprueft wird nicht, dass sich Knoepfe druecken lassen, sondern dass die
// Einstellung ANKOMMT - im Speicher, im Tonwerk und im Bild. Ein Dialog,
// dessen Regler sich bewegt und sonst nichts, ist schlimmer als keiner: er
// verspricht eine Wahl, die es nicht gibt.
{
  const vorher = { ...getSettings() };
  const dialog = document.getElementById('optionen-menu');
  const vol = document.getElementById('o-vol') as HTMLInputElement | null;
  if (!dialog || !vol) {
    problems.push('Einstellungen: der Dialog fehlt im Dokument.');
  } else {
    if (!dialog.hidden) problems.push('Einstellungen: der Dialog liegt offen, ohne dass jemand ihn geoeffnet hat.');
    // Geoeffnet wird ueber den Weg, den auch der Spieler nimmt: den Eintrag
    // auf der LEINWAND. Ein HTML-Knopf im Menue waere Spielbedienung
    // (Regel 6), und das Browsertor hat den ersten Anlauf dafuer gemeldet.
    ui.zeigeOptionen();
    ui.sync();
    if (dialog.hidden) problems.push('Einstellungen: der Eintrag auf der Landkarte oeffnet den Dialog nicht.');

    // Lautstaerke: der Regler muss den Speicher UND das Tonwerk erreichen.
    vol.value = '35';
    vol.dispatchEvent(new window.Event('input'));
    if (Math.abs(getSettings().volume - 0.35) > 0.001) {
      problems.push(`Einstellungen: Lautstaerke steht nach dem Regler auf ${getSettings().volume}, erwartet 0,35.`);
    }
    if (Math.abs(Sfx.volume - 0.35) > 0.001) {
      problems.push(`Einstellungen: das Tonwerk steht auf ${Sfx.volume}, der Regler auf 0,35 - die Einstellung kommt nicht an.`);
    }

    // Effektdichte und Bewegung: gewaehlte Knoepfe werden auch als gewaehlt
    // angezeigt, sonst weiss niemand, was gilt.
    const waehle = (raum: string, wert: string) => {
      const b = document.querySelector(`#${raum} .opt-btn[data-${raum === 'o-qual' ? 'q' : 'b'}="${wert}"]`) as HTMLButtonElement;
      b.dispatchEvent(new window.Event('click', { bubbles: true }));
      ui.sync();
      return b.dataset.on === '1';
    };
    if (!waehle('o-qual', 'niedrig') || getSettings().quality !== 'niedrig') {
      problems.push('Einstellungen: "Sparsam" kommt nicht an oder wird nicht als gewaehlt gezeigt.');
    }
    if (!waehle('o-bew', 'reduziert') || getSettings().bewegung !== 'reduziert') {
      problems.push('Einstellungen: "Bewegung reduziert" kommt nicht an oder wird nicht als gewaehlt gezeigt.');
    }

    (document.getElementById('o-zurueck') as HTMLButtonElement).dispatchEvent(new window.Event('click'));
    ui.sync();
    if (!dialog.hidden) problems.push('Einstellungen: "Zurueck" schliesst den Dialog nicht.');
  }
  saveSettings(vorher);
  Sfx.setVolume(vorher.volume);
  ui.sync();
}

// --- T6: jede Karte und der Endlosmodus, ungezeichnet durchgespielt.
//
// Die Partie oben laeuft auf EINER Karte und im normalen Modus. Damit war
// bis v174 die Haelfte des Spiels nie durchgespielt worden: zwei von drei
// Wellenplaenen und der Endlosmodus ueberhaupt nicht. Ein Wellenplan, der
// nicht zu Ende kommt, oder ein Endlosmodus, der bei Welle 16 stehenbleibt,
// waere niemandem aufgefallen ausser dem Spieler.
//
// Ungezeichnet, und das ist Absicht. Was hier gesucht wird, sind Abstuerze,
// Sackgassen und Plaene, die nicht enden - alles Fragen an die
// SIMULATION. Was die Zeichnung angeht, prueft die Partie oben, und die
// dreimal zu wiederholen kostete Sekunden ohne neue Auskunft.
step('Jede Karte und der Endlosmodus durchspielen', () => {
  // **Der Block laesst den Spielstand zurueck, wie er ihn vorfand.**
  //
  // Er spielt drei Partien zu Ende, und jede traegt Sterne und Bestwerte
  // ein. Beim ersten Lauf hat das die Sternepruefung darunter umgeworfen -
  // sie fand drei Sterne, wo zwei stehen sollten. Eine Pruefung, die
  // nebenbei den Zustand aendert, den andere Pruefungen lesen, ist keine
  // Pruefung, sondern eine Fehlerquelle.
  // Zurueckgestellt wird der Fortschritt IM SPEICHERMODUL, nicht in
  // `localStorage`: das Modul haelt eine eigene Kopie und liest sie nur
  // beim Laden ein. Die erste Fassung stellte brav den Browserspeicher
  // wieder her - und die Sternepruefung fiel trotzdem um, weil niemand ihn
  // noch einmal las (Regel 12: eine Zahl gehoert an ihre Messstelle).
  const fortschritt = getProgress();
  const sterneVorher = { ...fortschritt.stars };
  const perksVorher = [...fortschritt.perks];
  // Der Abdruck, an dem geprueft wird, dass der Block wirklich nichts
  // hinterlaesst.
  //
  // Bis v184 wurde das INDIREKT geprueft: die Sternepruefung weiter unten
  // fiel um, wenn hier nicht zurueckgestellt wurde. Der volle Probenlauf zu
  // v184 hat gemeldet, dass sie es nicht mehr zuverlaessig tut - und die
  // Ursache lag nicht in ihr, sondern darin, dass die Hauptpartie eine
  // ZUFALLSAUSSAAT hatte. Je nach Lauf endete sie mit zwei oder mit drei von
  // drei Sternen, und bei dreien konnte dieser Block gar nichts mehr
  // verunreinigen. Die Gegenprobe war damit mal blind und mal nicht.
  //
  // Die Aussaat ist jetzt fest, und die Pruefung steht dort, wo der Vertrag
  // steht: dieser Schritt aendert den Fortschritt nicht. Ein Abdruck ueber
  // den GANZEN Stand haengt an keiner einzelnen Zahl.
  const abdruckVorher = JSON.stringify(fortschritt);
  const zeilen: string[] = [];
  const GRENZE = 60 * 60 * 20;

  const durchspielen = (mapId: string, endlos: boolean) => {
    const g = new GameState();
    g.reset(4242, 'normal', mapId, { endless: endlos });
    const plaetze = candidateSpots(g);
    const z = { spot: 0, si: 0 };
    let f = 0;
    let hoechsteWelle = 0;
    // **Gezaehlt wird, was WIRKLICH gestartet ist.**
    //
    // `waveNumber` zaehlt die naechste Welle, nicht eine gespielte: nach der
    // letzten Welle des Plans steht sie auf 16, ohne dass je eine 16. Welle
    // lief. Die erste Fassung dieser Pruefung fragte danach - und blieb
    // gruen, als der Endlosmodus abgeschaltet wurde. Sie hat ihn bezeugt,
    // ohne ihn je zu pruefen (Regel 13).
    let gestartet = 0;
    let warAktiv = false;
    while (g.phase === 'playing' && f < GRENZE) {
      botSchritt(g, plaetze, z);
      g.update(DT);
      if (g.waveActive && !warAktiv) gestartet++;
      warAktiv = g.waveActive;
      hoechsteWelle = Math.max(hoechsteWelle, g.waveNumber);
      f++;
      // Der Endlosmodus endet nur durch Verlieren. Damit der Lauf nicht an
      // der Bildgrenze haengt, wird nach fuenf Wellen ueber dem Plan
      // abgebrochen - bewiesen ist dann, was zu beweisen war.
      if (endlos && gestartet > g.totalWaves + 5) break;
    }
    return { g, f, hoechsteWelle, gestartet };
  };

  for (const m of ALLE_KARTEN) {
    const { g, f, hoechsteWelle } = durchspielen(m.id, false);
    if (f >= GRENZE) {
      throw new Error(
        `${m.name}: die Partie kam in ${GRENZE / 60} Sekunden Spielzeit nicht zu Ende `
        + `(Welle ${hoechsteWelle} von ${g.totalWaves}). Der Wellenplan endet nicht.`,
      );
    }
    if (g.phase !== 'won' && g.phase !== 'lost') {
      throw new Error(`${m.name}: die Partie endete als "${g.phase}" - weder gewonnen noch verloren.`);
    }
    if (!g.stats.kills) throw new Error(`${m.name}: kein einziger Gegner erledigt - der Lauf misst nichts.`);
    const verbucht = g.stats.leaksByWave.reduce((a, b) => a + (b ?? 0), 0);
    if (verbucht !== g.maxLives - g.lives) {
      throw new Error(
        `${m.name}: ${verbucht} Kristallverlust verbucht, aber ${g.maxLives - g.lives} fehlen.`,
      );
    }
    zeilen.push(`  ${m.name.padEnd(14)} ${g.phase === 'won' ? 'gewonnen' : 'verloren '} `
      + `nach Welle ${hoechsteWelle}/${g.totalWaves}, ${g.stats.kills} erledigt, `
      + `Kristall ${g.lives}/${g.maxLives}`);
  }

  // Und der Endlosmodus: er muss ueber den Plan HINAUS gehen. Genau das ist
  // seine einzige Zusage, und genau das hat nie jemand nachgesehen.
  const e = durchspielen(ALLE_KARTEN[0].id, true);
  if (e.gestartet <= e.g.totalWaves) {
    throw new Error(
      `Endlosmodus: nur ${e.gestartet} Wellen wirklich gestartet, der Plan hat ${e.g.totalWaves} - `
      + 'er endet also mit dem Plan wie jede andere Partie.',
    );
  }
  if (e.f >= GRENZE) {
    throw new Error(
      `Endlosmodus: haengt nach ${GRENZE / 60} Sekunden Spielzeit bei Welle ${e.gestartet} fest, `
      + 'ohne zu verlieren und ohne weiterzugehen.',
    );
  }
  if (!e.g.endless) throw new Error('Endlosmodus: das Feld `endless` steht nach dem Aufsetzen auf false.');
  // Im Endlosmodus gibt es keine Sterne - er ist kein Fortschritt, sondern
  // eine Bestenliste (C27 waere ihre Anzeige).
  if (e.g.phase !== 'playing' && e.g.stars !== 0) {
    throw new Error(`Endlosmodus: ${e.g.stars} Stern(e) vergeben - dort gibt es keine.`);
  }
  zeilen.push(`  Endlosmodus    ${e.gestartet} Wellen gestartet (Plan hat ${e.g.totalWaves}), `
    + `${e.g.stats.kills} erledigt`);

  // **Erst pruefen, ob es ueberhaupt etwas zurueckzustellen GIBT** (Regel 13).
  //
  // Eine Rueckstellung, die nichts rueckgaengig macht, ist nicht zu pruefen:
  // schaltet man sie ab, aendert sich nichts, und jede Gegenprobe an ihr ist
  // blind. Genau so ist es in v184 passiert - die Aussaat der Hauptpartie war
  // zufaellig, und in den Laeufen, in denen sie drei von drei Sternen holte,
  // konnte dieser Block gar nichts mehr verunreinigen.
  if (JSON.stringify(fortschritt) === abdruckVorher) {
    throw new Error('Der Durchlauf hat den Fortschritt gar nicht veraendert. '
      + 'Dann ist seine Rueckstellung nicht pruefbar - vermutlich steht die '
      + 'Hauptpartie schon auf dem hoechsten Sternestand, und dort kann '
      + 'nichts mehr steigen.');
  }
  // **Alles zurueckstellen, nicht zwei benannte Felder.**
  //
  // Bis v218 standen hier nur `stars` und `perks` - die beiden, die beim
  // Schreiben dieses Blocks bekannt waren. Sobald der Durchlauf die erste
  // Karte GEWINNT, schreibt das Spiel aber auch Bestwerte, und die blieben
  // stehen. Aufgefallen ist es, als die neu gezogene Bahn den Durchlauf
  // erstmals gewinnen liess; vorher verlor er, und dann gab es nichts
  // einzutragen.
  //
  // Der Abdruck unten hat es gefangen, weil er ueber den GANZEN Stand geht.
  // Genau dafuer steht er da - und die Lehre ist, auch beim Zurueckstellen
  // den ganzen Stand zu nehmen statt einer Liste, die veraltet.
  Object.assign(fortschritt, JSON.parse(abdruckVorher));
  void sterneVorher; void perksVorher;
  if (JSON.stringify(fortschritt) !== abdruckVorher) {
    throw new Error('Der Durchlauf hat den Fortschritt veraendert und nicht '
      + 'zurueckgestellt. Alles, was danach Sterne, Verbesserungen oder '
      + 'Bestwerte liest, misst dann diesen Block mit.');
  }

  console.log('Durchgespielt:');
  for (const z of zeilen) console.log(z);
});

// --- Die Auswertung der eben gespielten Partie (P2).
//
// Der Genre-Abgleich misst sie an einer kurzen, kuenstlich beendeten Partie.
// Hier steht die echte daneben: fuenfzehn Wellen, vier Turmarten, alles
// gezeichnet. Und hier - nur hier - laesst sich die eine Zahl pruefen, die
// vier Versionen lang falsch war: "Sterne vorher".
step('Auswertung', () => {
  const a = auswertung(state);
  if (a.won !== (state.phase === 'won')) {
    throw new Error(`Auswertung sagt won=${a.won}, der Zustand steht auf "${state.phase}".`);
  }
  if (a.kills !== state.stats.kills || a.built !== state.stats.towersBuilt) {
    throw new Error(
      `Auswertung zaehlt ${a.kills}/${a.built}, die Partie ${state.stats.kills}/`
      + `${state.stats.towersBuilt}.`,
    );
  }
  if (a.duration <= 0) throw new Error('Auswertung meldet eine Partie ohne Dauer.');
  if (a.mapId !== state.map.id || a.waves !== state.totalWaves) {
    throw new Error('Auswertung beschreibt eine andere Karte als die gespielte.');
  }
  // Der Kern: "vorher" ist der Stand VOR dieser Partie. Bis v134 wurde er
  // gelesen, nachdem das Ergebnis schon eingetragen war - dann steht dort
  // immer der neue Wert, und "Ein neuer Stern" erscheint nie.
  if (a.before !== sterneVorDerPartie) {
    throw new Error(
      `Auswertung meldet ${a.before} Sterne vorher, vor der Partie standen `
      + `${sterneVorDerPartie}.`,
    );
  }
  // Eingetragen wird an EINER Stelle, im Spielzustand. Danach steht der
  // bessere der beiden Werte im Fortschritt.
  const jetzt = getStars(state.map.id, state.difficulty);
  if (jetzt !== Math.max(sterneVorDerPartie, a.stars)) {
    throw new Error(`Nach der Partie stehen ${jetzt} Sterne, erwartet war `
      + `${Math.max(sterneVorDerPartie, a.stars)}.`);
  }
  // Und NUR diese Karte darf sich geaendert haben. Ein Durchlauf, der seinen
  // Fortschritt stehen laesst, traegt Sterne fuer Karten ein, die diese
  // Partie nie gesehen hat - und das ist der Teil, den die Zahl oben nicht
  // mehr zeigen kann, seit sie am Anschlag steht.
  const eigen = `${state.map.id}|${state.difficulty}`;
  const jetztAlle = getProgress().stars;
  const fremd = Object.keys(jetztAlle)
    .filter((k) => k !== eigen && (jetztAlle[k] ?? 0) !== (alleSterneVorDerPartie[k] ?? 0));
  if (fremd.length) {
    throw new Error(`Nach der Partie stehen Sterne fuer Karten, die sie nicht `
      + `gespielt hat: ${fremd.join(', ')}. Eine Pruefung, die nebenbei den `
      + 'Zustand aendert, den andere lesen, ist keine Pruefung.');
  }
});

// --- Der Bestwert nach einer NIEDERLAGE.
//
// Warum eine zweite Partie: die oben endet als Sieg, und beim Sieg ist
// `waveNumber` gedeckelt - da faellt die eine Welle Unterschied gar nicht an.
// Die Gegenprobe (wieder `waveNumber` eintragen statt der erreichten Welle)
// lief deshalb gruen durch, obwohl der Fehler wieder drin war. Eine Pruefung,
// die den Fehler nicht sehen KANN, ist keine (Regel 13).
//
// Also eine eigene, kurze: kein Turm, ein Kristall, die erste Welle laeuft
// durch. Erreicht wurde damit Welle 0 - und genau das muss im Bestwert
// stehen. Ein anderer Grad als oben, damit die Ablage einen eigenen
// Schluessel hat und der Bestwert bei null anfaengt.
// Zwei Bremsen, zwei Uhren (TF-015).
//
// Das ist der Fall, den die beiden alten Felder nicht konnten: `slowFactor`
// nahm das Minimum, `slowLeft` das Maximum, und beide liefen unabhaengig.
// Eine starke kurze Bremse und eine schwache lange ergaben deshalb die
// STARKE fuer die LANGE Dauer - eine Wirkung, die keine der beiden Quellen
// hatte.
//
// Geprueft wird an `wirkungAnlegen` und `wirkungenTicken` selbst, denn das
// SIND die Stellen, die das Spiel ruft - keine nachgebaute Fassung daneben.
step('Zwei Bremsen halten zwei Uhren', () => {
  let l = wirkungAnlegen(null, 'bremse', 0.6, 1);
  l = wirkungAnlegen(l, 'bremse', 0.2, 5);
  if (Math.abs(tempoFaktor(l) - 0.4) > 1e-9) {
    problems.push(`Wirkungen: solange beide anliegen, muss die STAERKERE zaehlen `
      + `(0,40 erwartet, ${tempoFaktor(l).toFixed(2)}).`);
  }
  // Die starke laeuft ab, die schwache nicht.
  wirkungenTicken(l, 1.5);
  const nach = tempoFaktor(l);
  if (Math.abs(nach - 0.8) > 1e-9) {
    problems.push(`Wirkungen: nach dem Ablauf der starken Bremse muss die schwache `
      + `uebrig bleiben (0,80 erwartet, ${nach.toFixed(2)}). `
      + (nach === 1
        ? 'Sie ist ganz verschwunden - die Eintraege sind verschmolzen.'
        : 'Die starke wirkt weiter, obwohl ihre Zeit um ist.'));
  }
  // Und zuletzt ist nichts mehr da.
  wirkungenTicken(l, 4);
  if ((l?.length ?? 0) || tempoFaktor(l) !== 1) {
    problems.push('Wirkungen: nach Ablauf aller Uhren bremst noch etwas.');
  }
  // Regel 5: dieselbe Quelle, die weitertickt, darf die Liste nicht aufblaehen.
  let m = wirkungAnlegen(null, 'bremse', 0.3, 2);
  for (let i = 0; i < 200; i++) m = wirkungAnlegen(m, 'bremse', 0.3, 2);
  if ((m?.length ?? 0) !== 1) {
    problems.push(`Wirkungen: dieselbe Bremse 201-mal angelegt ergibt ${m?.length} Eintraege `
      + '- eine Aura tickt in jedem Bild, das waeren nach zehn Sekunden 600.');
  }
});

// Der Konter-Satz erscheint - einmal, rechtzeitig und dann nie wieder (TF-034).
//
// Geprueft wird an der BLASE im DOM, nicht an `konterSatz`. Ob die Ableitung
// rechnet, prueft `npm run konter`; hier geht es darum, ob der Spieler den
// Satz auch zu sehen bekommt. Genau diese Trennung fehlte dem alten Zustand:
// die Konter standen in den Wellensaetzen, und niemand hat je gemessen, ob
// sie vollstaendig waren.
step('Konter-Satz erscheint einmal und rechtzeitig', () => {
  const blase = win.document.getElementById('coach')!;
  const text = win.document.getElementById('coach-text')!;
  const vorher = state.snapshot();
  gegnerVergessen();
  // Ohne die grosse Einfuehrung: die hat in Welle 1 bis 3 Vorrang und wuerde
  // hier nur verdecken, was gemessen werden soll.
  saveSettings({ tutorial: false });
  state.reset(99, 'normal', 'spiralhain');
  ui.sync();

  const plan = state.waves;
  const gezeigt = new Map<string, number>();
  for (let i = 0; i < plan.length; i++) {
    state.waveIndex = i;
    state.wellenZumPruefen([]);
    ui.sync();
    if (!blase.hidden && text.dataset.step?.startsWith('konter:')) {
      const id = text.dataset.step.slice('konter:'.length);
      gezeigt.set(id, (gezeigt.get(id) ?? 0) + 1);
      if (text.textContent !== konterSatz(id as EnemyId)) {
        problems.push(`Konter W${i + 1}: in der Blase steht etwas anderes als der `
          + 'abgeleitete Satz.');
      }
      // Und er verschwindet, sobald die Welle laeuft: danach ist er kein Rat
      // mehr, sondern ein Vorwurf.
      state.wellenZumPruefen([state.waveIndex]);
      ui.sync();
      if (!blase.hidden) {
        // **Mit dem Schritt, der stehen bleibt.** Ohne ihn sagt die Meldung
        // nur, dass etwas steht - und die Blase traegt zwei Bewohner, den
        // Konter-Satz und die Einfuehrung. Beim ersten Auftreten (v285) hat
        // genau das eine Viertelstunde gekostet.
        const wer = (win.document.getElementById('coach-text') as HTMLElement | null)
          ?.dataset.step ?? 'unbekannt';
        problems.push(`Konter W${i + 1}: die Blase steht noch, obwohl die Welle laeuft `
          + `(Schritt "${wer}").`);
      }
      state.wellenZumPruefen([]);
    }
  }
  // Jede Art hoechstens einmal.
  for (const [id, n] of gezeigt) {
    if (n > 1) problems.push(`Konter: "${id}" wurde ${n}-mal angesagt, einmal ist genug.`);
  }
  // Und ueberhaupt einmal (Regel 5): kaeme nie einer, waere der ganze
  // Schritt eine gruene Zeile ohne Gegenstand.
  if (!gezeigt.size) {
    problems.push('Konter: in 15 Wellen wurde kein einziger Satz angesagt - dann prueft '
      + 'dieser Schritt nichts.');
  }
  console.log(`  Konter-Saetze: ${gezeigt.size} Gegnerart(en) in 15 Wellen angesagt `
    + `(${[...gezeigt.keys()].join(', ')}).`);
  state.restore(vorher);
  saveSettings({ tutorial: true });
  ui.sync();
});

// Die Wellenvorschau zeigt ALLE Gegnerarten der naechsten Welle (TF-023).
//
// Der Audit-Befund lautete "Vorschau nennt nur die erste Gruppe". Das war
// falsch: `renderNext` laeuft ueber alle Gruppen und fasst nach Art
// zusammen. Damit das nicht ein zweites Mal behauptet wird, steht es hier
// als Messung - fuer JEDE Welle, nicht fuer die erste.
//
// Geprueft wird am DOM, nicht am Aufruf: was in der Seite steht, ist die
// Vorschau; was die Funktion tut, ist eine Vermutung darueber.
step('Wellenvorschau zeigt alle Arten', () => {
  const liste = win.document.getElementById('n-list')!;
  const streifen = win.document.getElementById('next')!;
  // Sichern und wiederherstellen: der erste Anlauf setzte den Zustand
  // zurueck, und ein SPAETERER Schritt fiel darauf herein ("Auswertung: kein
  // Schaden mitgeschrieben"). Die Schritte teilen sich einen Zustand - wer
  // ihn anfasst, gibt ihn zurueck.
  const vorher = state.snapshot();
  state.reset(4711, 'normal', 'spiralhain');
  for (let i = 0; i < state.waves.length; i++) {
    state.waveIndex = i;
    state.wellenZumPruefen([]);
    ui.sync();
    const arten = new Set(state.waves[i].groups.map((g) => g.enemy));
    // Seit v194 ist jeder Eintrag ein `<button>` mit `data-gegner` - der
    // Erklaersatz bleibt ein `<i>` und faellt damit von selbst heraus.
    const gezeigt = liste.querySelectorAll('button[data-gegner]').length;
    if (gezeigt !== arten.size) {
      problems.push(`Wellenvorschau W${i + 1}: ${arten.size} Gegnerart(en) in der Welle, `
        + `${gezeigt} in der Vorschau.`);
      break;
    }
  }
  // Schild und Traeger standen bis v151 NUR im handgeschriebenen Satz - wer
  // eine Welle ohne Satz baute, bekam keinen Hinweis. Seit v151 leitet die
  // Vorschau beide aus den Gruppendaten ab. Geprueft wird an den Daten, nicht
  // an einer Wellennummer: sonst prueft der Schritt eine Welle, die es in
  // zwei Fassungen nicht mehr gibt.
  //
  // Und geprueft wird in BEIDE Richtungen (Regel 13): ein Zeichen, das immer
  // dasteht, bezeugt nichts. Ohne die Gegenrichtung wuerde ein fest
  // eingebautes `Schild` durchgehen.
  let mitSchild = 0, mitTraeger = 0;
  /** Die frueheste Welle mit einem Schild - siehe die Pruefung unten. */
  let ersterSchild = -1;
  for (let i = 0; i < state.waves.length; i++) {
    state.waveIndex = i;
    state.wellenZumPruefen([]);
    ui.sync();
    const soll = { Schild: new Set<string>(), 'Träger': new Set<string>() };
    for (const g of state.waves[i].groups) {
      if (g.shield) soll.Schild.add(g.enemy);
      if (g.traeger) soll['Träger'].add(g.enemy);
    }
    if (soll.Schild.size && ersterSchild < 0) ersterSchild = i;
    mitSchild += soll.Schild.size ? 1 : 0;
    mitTraeger += soll['Träger'].size ? 1 : 0;
    for (const zeichen of ['Schild', 'Träger'] as const) {
      const gezeigt = [...liste.querySelectorAll('button[data-gegner]')]
        .filter((e) => [...e.querySelectorAll('span.tag')]
          .some((t) => t.textContent === zeichen)).length;
      if (gezeigt !== soll[zeichen].size) {
        problems.push(`Wellenvorschau W${i + 1}: ${soll[zeichen].size} Gegnerart(en) `
          + `mit "${zeichen}" in den Daten, ${gezeigt} in der Vorschau.`);
        break;
      }
    }
  }
  // Das Sprungzeichen: es darf weder an jeder Welle stehen noch an keiner.
  // Beides waere kein Zeichen mehr, sondern Tapete - und beides kaeme aus
  // einer einzigen falschen Zahl in `SPRUNG`. Geprueft wird am DOM-Merkmal,
  // das die Stilvorlage liest, nicht am Rueckgabewert von `istSprung`:
  // letzteres waere dieselbe Rechnung zweimal.
  let sprungzahl = 0;
  for (let i = 0; i < state.waves.length; i++) {
    state.waveIndex = i;
    state.wellenZumPruefen([]);
    ui.sync();
    if (streifen.dataset.sprung === '1') sprungzahl++;
  }
  // Die erste Welle kann keinen Sprung haben - es gibt keine davor. Die
  // Obergrenze zaehlt deshalb die BERECHTIGTEN Wellen, sonst waere sie nie
  // erreichbar und die halbe Pruefung schliefe (Regel 5). Abgelesen sind es
  // acht von 45 ueber alle drei Karten, also etwa jede fuenfte; "mehr als
  // die Haelfte" ist reichlich Luft und trotzdem kein Freibrief.
  const moeglich = state.waves.length - 1;
  if (sprungzahl === 0 || sprungzahl > moeglich / 2) {
    problems.push(`Wellenvorschau: das Sprungzeichen steht an ${sprungzahl} von `
      + `${moeglich} moeglichen Wellen - an keiner oder an fast allen ist es kein `
      + 'Zeichen, sondern Tapete.');
  }
  if (!mitSchild || !mitTraeger) {
    problems.push(`Wellenvorschau: der Schritt prueft "Schild" an ${mitSchild} und `
      + `"Träger" an ${mitTraeger} Wellen - bei null prueft er nichts (Regel 5).`);
  }
  // **Und der Schild muss frueh kommen, nicht irgendwann.**
  //
  // "Mindestens einmal im Plan" war zu wenig, und der volle Probenlauf zu
  // v219 hat es gemeldet: seit die letzten beiden Wellen des Spiralhains
  // Schilde tragen, bleibt der Rauchtest gruen, wenn man den EINFUEHRENDEN
  // Schild aus Welle 9 herausnimmt - es sind ja noch zwei da. Die Probe
  // bewies damit nichts mehr.
  //
  // Geprueft wird jetzt, was das Verzeichnis ohnehin behauptet: der Schild
  // steht in der ersten Haelfte des Plans, "frueh genug, dass man ihn kennt,
  // bevor es eng wird". Ein Schild, der zum ersten Mal in Welle 14 auftaucht,
  // ist keine Lehrstunde mehr, sondern ein Hinterhalt.
  if (ersterSchild >= 0 && ersterSchild >= state.waves.length / 2) {
    problems.push(`Wellenvorschau: der erste Schild steht in Welle ${ersterSchild + 1} `
      + `von ${state.waves.length} - er gehoert in die erste Haelfte, sonst lernt ihn `
      + 'niemand kennen, bevor er entscheidet.');
  }
  state.restore(vorher);
  ui.sync();
});

// Die Wegvorschau laeuft beim Betreten einer Karte von selbst - und nur dann
// (TF-014). Ein geladener Spielstand bekommt sie nicht: wer fortsetzt, kennt
// die Karte.
step('Wegvorschau beim Betreten', () => {
  const p = new GameState();
  p.reset(7, 'normal', 'ascheschlucht');
  if (p.wegvorschauStand() === null) {
    problems.push('Beim Betreten einer Karte laeuft keine Wegvorschau - dann sieht '
      + 'der Spieler nicht, woher die Gegner kommen.');
  }
  // Und sie hoert wieder auf.
  p.update(3);
  if (p.wegvorschauStand() !== null) {
    problems.push('Die Wegvorschau laeuft nach drei Sekunden noch - sie soll zeigen, '
      + 'nicht dauerhaft ueber der Karte liegen.');
  }
  // Der Knopf spielt sie erneut ab.
  p.wegvorschau();
  if (p.wegvorschauStand() === null) {
    problems.push('Der Wiederholknopf startet die Wegvorschau nicht.');
  }
  // Ein fortgesetzter Stand bekommt sie nicht.
  const stand = p.snapshot();
  const q = new GameState();
  q.restore(stand);
  if (q.wegvorschauStand() !== null) {
    problems.push('Nach dem Fortsetzen laeuft die Wegvorschau - wer fortsetzt, kennt '
      + 'die Karte schon.');
  }
});

step('Bestwert nach Niederlage', () => {
  const probe = new GameState();
  probe.reset(777, 'erbarmungslos', state.map.id);
  probe.lives = 1;
  for (let i = 0; i < 60 * 600 && probe.phase === 'playing'; i++) {
    if (probe.canStartWave) probe.startWave();
    probe.update(DT);
  }
  if (probe.phase !== 'lost') {
    throw new Error(`Ohne Turm endet die Partie als "${probe.phase}" statt als Niederlage - `
      + 'die Probe misst nicht, was sie messen soll.');
  }
  const erreicht = Math.max(0, probe.waveNumber - 1);
  const best = getBest(probe.map.id, 'erbarmungslos');
  if (best.wave !== erreicht) {
    throw new Error(`Bestwert steht auf Welle ${best.wave}, ueberstanden wurde Welle `
      + `${erreicht} (Welle ${probe.waveNumber} lief noch).`);
  }
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
  const t = ersterTurm(probe);
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
  const live = ersterTurm(state);
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
  const t = ersterTurm(probe);
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
  const before = state.gebaute.length;
  void before;

  // Denselben Zustand im echten Steg herstellen.
  state.gold = 9000;
  if (!state.gebaute.length) state.build(state.map.hint.x, state.map.hint.y, 'arrow');
  const tw = ersterTurm(state);
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
    if (!t2.upgrade(ersterTurm(t2), branch)) {
      problems.push(`Ausbau: Zweig ${branch} liess sich nicht waehlen.`);
    } else if (ersterTurm(t2).branch !== branch) {
      problems.push(`Ausbau: Zweig ${branch} gewaehlt, gespeichert wurde ${ersterTurm(t2).branch}.`);
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
  // **1400 x 900 ist seit v236 dabei, und es ist der gemeldete Fall.**
  //
  // Die vier alten Groessen sind entweder breiter als 16:9 (dann schneidet
  // `coverScale` oben und unten ab) oder hochkant. Ein Notebook ist WENIGER
  // breit als 16:9 - 16:10, 3:2 -, und genau dort schnitt die alte Grenze
  // links und rechts ab. Eine Pruefung, die den Fall nicht kennt, findet ihn
  // nicht: sie stand vier Fassungen lang gruen daneben.
  for (const [w, h] of [[844, 390], [1440, 780], [2200, 500], [390, 844],
    [1400, 900], [1512, 982]] as const) {
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

    // **Und von Hand ganz herausziehen muss das GANZE Feld zeigen (v236).**
    //
    // Hier stand bis v235 das Gegenteil: herausziehen durfte keinen Rand
    // zeigen, die Grenze war `coverScale`. Das ist fuer den Startzustand
    // richtig und war fuer die Grenze falsch - das Feld ist 16:9, ein
    // Notebook-Fenster ist fast immer hoeher, und dann schneidet `cover`
    // links und rechts ab. Gemessen auf 1400 x 900 rund 240 Weltpunkte, ein
    // Achtel der Karte, und man kam nicht heran.
    //
    // Jetzt gilt beides nebeneinander: die UEBERSICHT (oben geprueft) fuellt
    // den Bildschirm, wer weiter herauszieht sieht alles und nimmt den
    // Sternenrand in Kauf. Geprueft wird deshalb, dass der sichtbare
    // Ausschnitt das Feld ENTHAELT, nicht dass er darin liegt.
    renderer.zoomAt(0.05, w / 2, h / 2);
    const wtl = renderer.screenToWorld(0, 0);
    const wbr = renderer.screenToWorld(w, h);
    if (wtl.x > 0.5 || wtl.y > 0.5 || wbr.x < WORLD_W - 0.5 || wbr.y < WORLD_H - 0.5) {
      problems.push(
        `Kamera bei ${w}x${h}: ganz herausgezogen ist das Feld NICHT vollstaendig zu sehen ` +
        `(${wtl.x.toFixed(0)}/${wtl.y.toFixed(0)} bis ${wbr.x.toFixed(0)}/${wbr.y.toFixed(0)}, ` +
        `Feld 0/0 bis ${WORLD_W}/${WORLD_H}) - dieser Teil der Karte ist unerreichbar.`,
      );
    }
    // Und nicht weiter als noetig: sonst schrumpft das Feld zur Briefmarke.
    const fit = Math.min(w / WORLD_W, h / WORLD_H);
    if (renderer.scale < fit - 1e-6) {
      problems.push(`Kamera bei ${w}x${h}: laesst sich unter die Einpassung herausziehen `
        + `(${renderer.scale.toFixed(3)} gegen ${fit.toFixed(3)}).`);
    }
    // Fuer die naechste Bildschirmgroesse wieder auf den Startzustand -
    // sonst schleppt der vorige Durchgang seinen Zoom mit, und die Pruefung
    // des Startmassstabs schlaegt beim Nachfolger an.
    renderer.zoomAt(cover / renderer.scale, w / 2, h / 2);
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

// Alle Turmsorten sind gleich gross.
//
// Gemeldet aus dem Spiel: der Moerser war 1,5-mal so breit wie der Bogenturm
// und in der Flaeche mehr als doppelt so gross - nebeneinander sah das nach
// zwei Massstaeben aus, nicht nach zwei Rollen.
//
// Bis v138 wurde daraus "alle Platzbedarfe gleich". Das war die richtige
// Antwort auf die falsche Frage: schuld war nicht der eigene Platzbedarf,
// sondern dass EINE Zahl zwei Bedeutungen trug. Seit v139 sind es zwei, und
// geprueft werden beide Enden:
//
//   * Die ZEICHENGROESSE ist einheitlich - sonst stehen wieder zwei
//     Massstaebe im Bild.
//   * Der PLATZBEDARF ist es NICHT - sonst behauptet das Konzept eine
//     Entscheidung ("wieviel Flaeche gibt man wofuer her"), die es nicht
//     gibt. Genau das stand vier Jahre lang falsch in der Doku.
{
  const { TURM_BREITE } = await import('../src/data/towers');
  // Die Zeichenbreite ist EINE Zahl fuer alle - die Pruefung dafuer steht im
  // Datenwaechter (Platzbedarf im Band um TURM_BREITE). Hier geht es um das
  // andere Ende.
  void TURM_BREITE;
  const boden = TOWER_ORDER.map((id) => TOWERS[id].footprint);
  if (new Set(boden).size < 2) {
    problems.push(
      `Platzbedarf: alle Sorten beanspruchen ${boden[0]} Punkte - dann ist "wieviel `
      + 'Flaeche gibt man wofuer her" keine Entscheidung, sondern eine Behauptung.',
    );
  }
  // Und er muss sich AUSWIRKEN: der schwere Turm muss WEITER vom Nachbarn
  // weg stehen als der leichte. Gemessen, nicht gerechnet - gefragt wird das
  // Spiel selbst, in Schritten von vier Punkten nach aussen.
  //
  // Die Probe sucht sich eine Richtung, in der nur der NACHBAR im Weg steht.
  // Kaeme Weg oder Gelaende dazwischen, maesse sie etwas anderes (Regel 13).
  {
    const probe = new GameState();
    probe.reset();
    probe.gold = 100000;
    const gross = TOWER_ORDER.reduce((a, b) => (TOWERS[a].footprint >= TOWERS[b].footprint ? a : b));
    const klein = TOWER_ORDER.reduce((a, b) => (TOWERS[a].footprint <= TOWERS[b].footprint ? a : b));
    if (TOWERS[gross].footprint === TOWERS[klein].footprint) {
      problems.push('Platzbedarf: alle Sorten sind gleich - die Probe misst nichts.');
    } else {
      // Nicht der BESTE Platz, sondern einer mit Luft ringsum: der beste liegt
      // dicht am Weg, und dann steht in jeder Richtung der Weg im Weg statt
      // des Nachbarn. Gesucht wird der erste, an dem sich ueberhaupt messen
      // laesst.
      const plaetze = candidateSpots(probe, klein);
      const frei = plaetze.find((p2) => {
        const luft = TOWERS[gross].footprint + 40;
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(
          ([dx, dy]) => probe.warumNicht(gross, p2.x + dx * luft, p2.y + dy * luft) === null,
        );
      }) ?? plaetze[0];
      if (!frei || !probe.build(frei.x, frei.y, klein)) {
        problems.push('Platzbedarf: der Nachbarturm liess sich nicht setzen.');
      } else {
        /** Der erste Abstand, in dem dieser Turm neben dem Nachbarn Platz hat -
         *  oder null, wenn etwas anderes als der Nachbar im Weg ist. */
        const abstand = (id: typeof TOWER_ORDER[number], dx: number, dy: number): number | null => {
          for (let d = 8; d < 400; d += 4) {
            const grund = probe.warumNicht(id, frei.x + dx * d, frei.y + dy * d);
            if (grund === null) return d;
            if (grund !== 'Turm') return null;
          }
          return null;
        };
        let gemessen = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const a = abstand(klein, dx, dy);
          const b = abstand(gross, dx, dy);
          if (a === null || b === null) continue;
          gemessen = true;
          if (b <= a) {
            problems.push(
              `Platzbedarf: der ${TOWERS[gross].name} (${TOWERS[gross].footprint}) darf `
              + `genauso dicht neben den Nachbarn wie der ${TOWERS[klein].name} `
              + `(${TOWERS[klein].footprint}): ${b} gegen ${a} Punkte.`,
            );
          }
          break;
        }
        if (!gemessen) {
          problems.push('Platzbedarf: in keiner Richtung stand nur der Nachbar im Weg - '
            + 'die Probe konnte nichts messen.');
        }
      }
    }
  }
}

// Alle Ausbaustufen sind gleich gross.
//
// Frueher wuchs der Turm mit der Stufe, weil sich alle Stufen ein Bild
// teilten und der Zuwachs das einzige Zeichen eines Ausbaus war. Seit jede
// Stufe ihr eigenes Bild hat, springt der Turm dabei nur noch - und der
// Platzbedarf bleibt ohnehin gleich.
{
  const { towerArtScale } = await import('../src/gfx/towerart');
  for (let l = 2; l <= MAX_LEVEL; l++) {
    if (Math.abs(towerArtScale(l) - towerArtScale(1)) > 1e-6) {
      problems.push(
        `Turmgroesse: Stufe ${l} wird mit ${towerArtScale(l)} gezeichnet, Stufe 1 mit ` +
        `${towerArtScale(1)} - alle Stufen sollen gleich gross sein.`,
      );
    }
  }
}

// Die Waffenebene braucht immer beide Teile.
//
// Ein Sockel MIT eingebauter Waffe plus eine zweite Waffe darueber waere
// doppelt; eine Waffe ohne Sockel schwebt. Deshalb wird die Ebene nur
// benutzt, wenn beides vorliegt - und hier geprueft, dass die Bildgruppe nie
// nur die Haelfte enthaelt.
{
  // Gefragt ist, was der Renderer FINDET - nicht, was gleich heisst.
  //
  // Vorher stand hier `waffe_${id}_4` neben `sockel_${id}_4` und beides
  // musste zugleich da sein oder zugleich fehlen. Das war richtig, solange
  // es je Turm hoechstens ein Paar gab. Seit `getObjectArtStufe` eine
  // Rueckfallkette aufloest, ist es zu streng: der Bogenturm hat sechs
  // Sockel und vier Waffen, Stufe 5 und 6 nehmen die vierte Waffe - und
  // im Spiel steht ein vollstaendiger Turm, wo die alte Regel eine Luecke
  // meldete. Ein Tor, das eine Wahrheit meldet, die keine ist, kostet
  // genauso viel wie eins, das schweigt.
  //
  // Geprueft wird deshalb dieselbe Kette wie im Renderer: von der Stufe
  // abwaerts bis zur stufenlosen Fassung. Was der Renderer verlangt, ist
  // `waffe && sockel` - also muessen BEIDE Ketten aufgehen oder KEINE.
  // Die Kette kommt aus dem Renderer selbst, nicht aus einem Nachbau hier.
  const { objektStufenSchluessel } = await import('../src/gfx/objectart');
  const kette = (art: string, id: string, level: number): string | null =>
    objektStufenSchluessel(`${art}_${id}`, level);
  for (const id of ['arrow', 'frost', 'mortar', 'prism']) {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const waffe = kette('waffe', id, level);
      const sockel = kette('sockel', id, level);
      if (!waffe !== !sockel) {
        problems.push(
          `Waffenebene ${id} Stufe ${level}: ${waffe ? `Waffe (${waffe}) ohne Sockel` : `Sockel (${sockel}) ohne Waffe`} - `
          + 'die Ebene braucht beide Teile, sonst bleibt sie ungenutzt.',
        );
      }
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
  state.selectedTower = ersterTurm(state) ?? null;
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

  // --- D8: kommt man mit der TASTATUR ins Spiel?
  //
  // Gemessen im Browser vor v193: auf dem Titelschirm waren null von 57
  // fokussierbaren Elementen sichtbar, und ein Druck auf Tabulator aenderte
  // null Bildpunkte. Wer keinen Zeiger hat, kam nicht ins Spiel - nicht
  // umstaendlich, sondern gar nicht.
  //
  // Geprueft wird hier und nicht im Browser, weil hier der Zustand sichtbar
  // ist. Der Browser sieht nur, DASS sich etwas markiert; ob der Weg
  // irgendwo hinfuehrt, sagt er nicht. Ein Versuch mit blindem "Tabulator,
  // Enter, Tabulator, Enter" lief im Kreis zwischen Landkarte und
  // Fortschritt und meldete "kommt nicht rein" - das war die Messung, nicht
  // die Bedienung.
  {
    let gestartet: string | null = null;
    m.onStart = (mapId) => { gestartet = mapId; };
    m.tastenId = null;
    drawMenu(g, m);

    // 1. Jeder Knopf ist erreichbar, und der Rundgang schliesst sich.
    const rundgang: string[] = [];
    for (let i = 0; i < m.hotspots.length; i++) {
      m.tastenSchritt(1);
      drawMenu(g, m);
      rundgang.push(m.tastenId ?? '(nichts)');
    }
    const erreicht = new Set(rundgang);
    const alle = new Set(m.hotspots.map((h) => h.id));
    for (const id of alle) {
      if (!erreicht.has(id)) {
        problems.push(`Tastatur: "${id}" ist auf der Landkarte nicht erreichbar - `
          + `der Rundgang besucht ${erreicht.size} von ${alle.size} Knoepfen.`);
      }
    }
    // Und er darf nicht haengen bleiben: nach so vielen Schritten wie es
    // Knoepfe gibt, steht man wieder am Anfang.
    if (new Set(rundgang).size !== rundgang.length) {
      problems.push(`Tastatur: der Rundgang besucht einen Knopf doppelt, bevor er `
        + `durch ist (${rundgang.join(' -> ')}).`);
    }

    // 2. Der Weg ins Spiel: ein Land waehlen, dort "Spielen" ausloesen.
    //
    // Gesucht wird der Knopf, nicht seine Nummer - eine abgeschriebene
    // Schrittzahl waere nach der naechsten Umstellung still falsch (Regel 15).
    const zu = (ziel: string): boolean => {
      for (let i = 0; i < 40; i++) {
        if (m.tastenId === ziel) return true;
        m.tastenSchritt(1);
        drawMenu(g, m);
      }
      return false;
    };
    if (!zu('node:0')) {
      problems.push('Tastatur: das erste Land ist auf der Landkarte nicht anzusteuern.');
    } else {
      m.tastenAusloesen();
      drawMenu(g, m);
      const ansicht: string = m.view;
      if (ansicht !== 'brief') {
        problems.push(`Tastatur: Enter auf einem Land fuehrt nach "${ansicht}" statt in die Einweisung.`);
      } else if (!zu('start')) {
        problems.push('Tastatur: in der Einweisung ist "Spielen" nicht anzusteuern.');
      } else {
        m.tastenAusloesen();
        if (!gestartet) {
          problems.push('Tastatur: Enter auf "Spielen" startet keine Partie.');
        }
      }
    }

    // 3. Wer nicht getippt hat, sieht auch keine Markierung.
    m.tastenId = null;
    drawMenu(g, m);
    if (m.tastenKnopf()) {
      problems.push('Tastatur: es ist ein Knopf markiert, ohne dass jemand die Tastatur benutzt hat.');
    }
    m.result = null;
  }

  // D5, v172: der Ansichtswechsel blendet ein UND zieht herauf - und die
  // Trefferflaechen muessen dabei mitwandern. Stuenden sie an der Endlage,
  // gaebe es fuer knapp zwei Zehntelsekunden Knoepfe, die man sieht, aber
  // nicht trifft: der eine Fehler, gegen den die Menuezeichnung von Anfang
  // an gebaut ist.
  //
  // Gemessen wird die Lage DESSELBEN Bereichs einmal mitten im Uebergang
  // und einmal danach. Die Differenz muss der Zeichenversatz sein - nicht
  // null, und auch nicht irgendetwas.
  {
    const { UEBERGANG } = await import('../src/game/menu');
    const { WORLD_H } = await import('../src/data/config');
    m.time = 0; m.wechselZeit = 0;             // ganz am Anfang des Wechsels
    drawMenu(g, m);
    const fruehe = new Map(m.hotspots.map((h) => [h.id, h.y]));
    const p0 = m.uebergang();
    m.time = UEBERGANG * 2;                    // laengst durch
    drawMenu(g, m);
    const spaete = new Map(m.hotspots.map((h) => [h.id, h.y]));
    if (m.uebergang() !== 1 || p0 !== 0) {
      problems.push(`Uebergang: die Probe steht bei ${p0} und ${m.uebergang()}, gebraucht werden 0 und 1.`);
    }
    const soll = WORLD_H * 0.03;
    // Erst zaehlen, dann urteilen: wird die Zaehlung vom ersten Fund
    // abgebrochen, meldet die Probe zusaetzlich "zu wenig gemessen" und
    // verdeckt damit ihren eigenen Befund.
    const gemeinsam = [...spaete.keys()].filter((id) => fruehe.has(id));
    const geprueft = gemeinsam.length;
    for (const id of gemeinsam) {
      const y0 = fruehe.get(id)!;
      const y1 = spaete.get(id)!;
      if (Math.abs((y0 - y1) - soll) > 0.6) {
        problems.push(
          `Uebergang: Trefferflaeche "${id}" liegt mitten im Wechsel bei ${y0.toFixed(1)}, `
          + `danach bei ${y1.toFixed(1)} - der Versatz ist ${(y0 - y1).toFixed(1)} statt ${soll.toFixed(1)}. `
          + 'Gezeichnet wird verschoben, getroffen wird woanders.',
        );
        break;
      }
    }
    if (geprueft < 3) problems.push(`Uebergang: nur ${geprueft} Trefferflaechen verglichen - die Probe misst zu wenig.`);

    // Und der Ausloeser selbst: eine Zuweisung an `view` MUSS den Wechsel
    // starten. Die Pruefung oben stellt die Uhr von Hand und saehe es
    // nicht, wenn der Zugriff wieder ein einfaches Feld waere - dann liefe
    // das Menue ohne Uebergang, und alles hier bliebe gruen.
    //
    // Zugewiesen wird ueber eine Hilfe und nicht direkt: eine Zuweisung mit
    // einem festen Wort verengt den Typ von `m.view` fuer alles Folgende,
    // und die Pruefungen weiter unten waeren dann "unmoegliche Vergleiche".
    const ansicht = (v: MenuView): void => { m.view = v; };
    m.time = 50; m.wechselZeit = -99;
    ansicht('progress');
    if (m.wechselZeit !== 50) {
      problems.push('Uebergang: eine Zuweisung an `view` startet keinen Wechsel - er springt wieder hart um.');
    }
    ansicht('progress');
    if (m.wechselZeit !== 50) {
      problems.push('Uebergang: dieselbe Ansicht noch einmal zugewiesen startet einen Wechsel - das Menue blendet sich selbst neu ein.');
    }
    ansicht('map');
    m.wechselZeit = -99;                       // fuer alles Folgende: fertig
  }

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
      freischaltung: won ? 'freeze' : null,
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

// **Der HTML-Titelbildschirm ist weg (v196), und mit ihm diese Pruefung.**
//
// Sie zaehlte die Knoepfe je Ebene und verlangte hoechstens vier. Das war
// eine gute Regel fuer eine Flaeche, die es seit v43 nicht mehr gab: das
// Menue liegt auf der Leinwand, `#screen` war `display: none` ab dem ersten
// Bild. Geprueft hat sie also die Aufraeumung eines Zimmers, das niemand
// betreten konnte - und der Rauchtest kam nur hinein, weil `click()` in
// jsdom auch auf verborgenen Knoepfen wirkt.
//
// Was an ihre Stelle tritt, steht im Browsertor: es faehrt das
// Leinwandmenue mit der Maus und misst, was WIRKLICH sichtbar ist.

// Jeder Turmzustand braucht ein gerendertes Bild - sonst steht ein
// gezeichneter Turm neben elf gerenderten und faellt sofort auf.
//
// **Zwei Wege zaehlen, nicht einer.** Seit v166 hat der Bogenturm kein
// Ganzbild mehr, sondern Sockel und Waffe; danach zu fragen allein haette
// ihn dauerhaft als fehlend gemeldet, obwohl im Feld ein vollstaendiger
// Turm steht. Gefragt ist "wird er gezeichnet?", nicht "gibt es DIESE
// Datei?" - dieselbe Unterscheidung wie in `fehlendeBilder`.
{
  const { hasTowerArt } = await import('../src/gfx/towerart');
  const { OBJECT_ART } = await import('../src/gfx/assets/objects');
  const zweiteilig = (id: string) => `sockel_${id}_1` in OBJECT_ART && `waffe_${id}_1` in OBJECT_ART;
  for (const id of TOWER_ORDER) {
    if (zweiteilig(id)) continue;
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
//
// **Gedrueckt wird der KNOPF, nicht das Feld gesetzt** (seit v238). Vorher
// stand hier `state.buildChoice = 'mortar'`, und das ist seit der Trennung
// von Vorwahl und Nachfrage nicht mehr derselbe Zustand: `reset` waehlt eine
// Sorte vor, damit die baubare Flaeche im Bild steht, und die Vorkauf-Karte
// haengt seitdem an `bauwahlErklaeren` - der Frage "was kann dieser Turm?",
// die nur ein Tipp auf die Leiste stellt. Ein Test, der das Feld selbst
// setzt, prueft einen Zustand, den kein Spieler herstellt.
{
  state.selectedTower = null;
  state.buildChoice = null;
  state.bauwahlErklaeren = false;
  (win.document.getElementById('tb-mortar') as HTMLButtonElement | null)?.click();
  ui.sync();
  if (state.buildChoice !== 'mortar') {
    problems.push('Bauvorschau: ein Tipp auf den Leistenknopf waehlt die Sorte nicht.');
  }
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
  if (st.towersBuilt < state.gebaute.length) {
    problems.push(`Auswertung: ${st.towersBuilt} gebaute Tuerme, aber ${state.gebaute.length} stehen im Feld.`);
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

// T6: verbucht wird, was WIRKLICH verloren geht - und der Fall wird GESTELLT.
//
// **Die Prüfung oben hat ihn bis v232 abgewartet, und damit verloren.** Sie
// vergleicht nach jedem Durchlauf die verbuchte Summe mit dem, was am
// Kristall fehlt; auseinander gehen die beiden nur, wenn ein Gegner mit
// mehr Durchschlag ankommt, als der Kristall noch Punkte hat. Das setzt
// voraus, dass eine Karte ihren Kristall überhaupt auf null bringt.
//
// Bis v231 tat das genau eine: die Frostspalte. Seit ihre Bahnen gewunden
// statt gerade sind (v232), gewinnt der Durchlauf sie mit 9 von 60 Punkten,
// und damit gibt es auf keiner der vier Karten mehr einen Überlauf. Der
// volle Probenlauf hat es gemeldet - die Gegenprobe „Kristallverlust wird
// zu hoch verbucht" nimmt die Deckelung heraus, und die Prüfung schwieg.
//
// Dieselbe Form wie die vier Funde aus v219: ein Messplatz, der auf einen
// Zufall wartet, hört leise auf zu prüfen, sobald sich die Karte ändert.
// Deshalb steht der Fall jetzt da, statt zu kommen - ein Kristall mit einem
// Punkt Rest und ein Koloss mit drei.
{
  const probe = new GameState();
  probe.reset();
  probe.lives = 1;
  const vorher = probe.stats.leaksByWave.reduce((a, b) => a + (b ?? 0), 0);
  const e = probe.spawnZumPruefen('brute', 0);
  if (!e) {
    problems.push('Kristallbilanz: der Koloss liess sich nicht stellen - die Probe misst nichts.');
  } else {
    // Ans Ende der Bahn setzen und einen Schritt rechnen lassen: dann
    // durchlaeuft er `leak()`, ohne dass eine Welle gespielt werden muss.
    e.travelled = 1e9;
    probe.update(1 / 60);
    if (!e.leaked) {
      problems.push('Kristallbilanz: der Koloss ist nicht durchgekommen - der Fall ist nicht gestellt.');
    } else {
      const verbucht = probe.stats.leaksByWave.reduce((a, b) => a + (b ?? 0), 0) - vorher;
      if (probe.lives < 0) {
        problems.push(`Kristallbilanz: der Kristall steht auf ${probe.lives} - unter null.`);
      }
      if (verbucht !== 1) {
        problems.push(
          `Kristallbilanz: ein Koloss (3 Durchschlag) auf einen Kristall mit 1 Punkt Rest `
          + `verbucht ${verbucht} statt 1. Die Bilanz meldet mehr, als das Spiel verliert.`,
        );
      }
      // **Die Ersatzpruefung fuer denselben Aufbau** (S-P3-01).
      //
      // Mit dem Kernraub trifft dieser gestellte Fall etwas Neues: der
      // Koloss stirbt nicht mehr, er TRAEGT. Was er traegt, muss genau das
      // sein, was der Kristall verloren hat - nie mehr, nie weniger. Ein
      // Raeuber, der drei Punkte durch die Gegend traegt, waehrend der
      // Kristall nur einen verloren hat, verspricht eine Rueckgabe, die es
      // nicht geben kann (S-P3-02).
      if (e.kernraub !== verbucht) {
        problems.push(
          `Kernraub: der Raeuber traegt ${e.kernraub}, der Kristall hat aber ${verbucht} `
          + 'verloren. Was er traegt, muss genau der Verlust sein.',
        );
      }
    }
  }
}

// **Der Kernraub: wer den Kristall erreicht, lebt und kehrt um** (S-P3-01).
//
// Gestellt, nicht abgewartet - dieselbe Lehre wie oben und wie die vier
// Funde aus v219. Ein Messplatz, der auf einen Zufall wartet, hoert leise
// auf zu pruefen, sobald sich die Karte aendert.
{
  const probe = new GameState();
  probe.reset();
  const e = probe.spawnZumPruefen('brute', 0);
  if (!e) {
    problems.push('Kernraub: der Koloss liess sich nicht stellen - die Probe misst nichts.');
  } else {
    const bahn = probe.lanes[e.lane] ?? probe.lanes[0];
    e.travelled = bahn.length;
    probe.update(1 / 60);
    if (e.dead) {
      problems.push('Kernraub: der Gegner ist am Kristall gestorben, statt zu rauben.');
    } else if (e.kernraub <= 0) {
      problems.push('Kernraub: der Gegner hat den Kristall erreicht, traegt aber nichts.');
    } else {
      // **Laeuft er wirklich ZURUECK?**
      //
      // Nicht im naechsten Bild messen: `leak()` haelt das Spiel 0,8
      // Sekunden an (`stop(0.8)`), damit man den Einschlag sieht. Wer
      // gleich danach misst, misst den Stillstand und nennt ihn
      // "kehrt nicht um" - genau das hat der erste Entwurf dieser Probe
      // getan.
      for (let i = 0; i < 60; i++) probe.update(1 / 60);
      const vor = e.travelled;
      for (let i = 0; i < 10; i++) probe.update(1 / 60);
      if (e.travelled >= vor) {
        problems.push(
          `Kernraub: der Raeuber laeuft weiter vorwaerts (${vor.toFixed(1)} -> `
          + `${e.travelled.toFixed(1)}) - er kehrt nicht um.`,
        );
      }
      // Und erreicht er sein Tor? Ans Ende der Rueckreise setzen.
      e.travelled = 1;
      probe.update(1 / 60);
      if (!e.dead) {
        problems.push('Kernraub: der Raeuber hat sein Tor erreicht und ist immer noch da.');
      }
      void bahn;
    }
  }
}

// **Der Splitter kommt zurueck, wenn der Traeger stirbt** (S-P3-02).
//
// Ohne die Rueckholung ist der Kernraub nur ein langsamerer Abzug - und
// gemessen sogar schlechter als vorher: die Tuerme schiessen auf einen
// Fliehenden, der niemandem mehr schaden kann. Mit Raub ohne Rueckgabe
// verlor der Durchlauf die erste Karte in Welle 14 (C18 rot); mit Rueckgabe
// gewinnt er sie mit 37 von 42.
{
  const probe = new GameState();
  probe.reset();
  const e = probe.spawnZumPruefen('brute', 0);
  if (!e) {
    problems.push('Splitter: der Koloss liess sich nicht stellen - die Probe misst nichts.');
  } else {
    const bahn = probe.lanes[e.lane] ?? probe.lanes[0];
    e.travelled = bahn.length;
    probe.update(1 / 60);
    const nachRaub = probe.lives;
    const beute = e.kernraub;
    if (beute <= 0) {
      problems.push('Splitter: der Gegner traegt nichts - die Probe misst nichts.');
    } else {
      // Ihn toeten, statt auf einen Turm zu warten (gestellt, nicht
      // abgewartet).
      probe.trefferZumPruefen(e, e.hp * 4 + 100);
      if (!e.dead) {
        problems.push('Splitter: der Raeuber ist nicht gestorben - der Fall ist nicht gestellt.');
      } else if (!probe.splitter.length) {
        problems.push('Splitter: der Raeuber ist gestorben, aber kein Splitter ist entstanden.');
      } else {
        for (let i = 0; i < 180; i++) probe.update(1 / 60);
        if (probe.lives !== nachRaub + beute) {
          problems.push(
            `Splitter: der Kristall steht nach der Rueckgabe auf ${probe.lives}, `
            + `erwartet waren ${nachRaub + beute} (${nachRaub} plus ${beute} getragene).`,
          );
        }
        const verbucht = probe.stats.leaksByWave.reduce((a, b) => a + (b ?? 0), 0);
        if (verbucht !== probe.maxLives - probe.lives) {
          problems.push(
            `Splitter: die Bilanz meldet ${verbucht} Verlust, am Kristall fehlen aber `
            + `${probe.maxLives - probe.lives}. Zurueckgeholtes ist kein Verlust.`,
          );
        }
      }
    }
  }
}

// **Wellen duerfen ueberlappen** (S-P4-01).
//
// F10 woertlich: der Fruehstart hatte sein Zeitfenster, aber kein Risiko.
// `canStartWave` verlangte `!waveActive` - man konnte erst starten, wenn die
// vorige durch war, und frueh starten kostete nur Bauzeit. Kingdom Rush legt
// genau dort das Risiko hin.
//
// Gestellt, nicht abgewartet: eine Welle starten, ein paar Bilder rechnen,
// die zweite starten.
{
  const probe = new GameState();
  probe.reset();
  probe.startWave();
  for (let i = 0; i < 120; i++) probe.update(1 / 60);
  const ersteRest = probe.wellenRest;
  if (!probe.canStartWave) {
    problems.push('Ueberlappung: waehrend Welle 1 laeuft, laesst sich keine zweite starten.');
  } else {
    probe.startWave();
    if (probe.laufende.length !== 2) {
      problems.push(`Ueberlappung: nach zwei Starts laufen ${probe.laufende.length} Wellen.`);
    }
    // Beide Stroeme muessen wirklich ausstossen.
    for (let i = 0; i < 240; i++) probe.update(1 / 60);
    const wellen = new Set(probe.enemies.filter((e) => !e.dead).map((e) => e.welle));
    if (wellen.size < 2) {
      problems.push(
        `Ueberlappung: auf dem Feld stehen Gegner aus ${wellen.size} Welle(n) - `
        + 'die zweite stoesst nicht aus.');
    }
    // **Eine dritte wird abgelehnt.** Drei waeren keine Entscheidung mehr,
    // sondern eine Lawine.
    if (probe.canStartWave) {
      problems.push('Ueberlappung: eine dritte Welle laesst sich starten - '
        + 'die Obergrenze von zwei haelt nicht.');
    }
    void ersteRest;
  }
}

// **Der Verlust wird an der Welle DES GEGNERS verbucht** (S-P4-01).
//
// Das ist die Ersatzpruefung fuer das, was die Ueberlappung entwertet:
// `stats.leaksByWave` buchte unter `this.waveIndex`, und der zeigt bei
// Ueberlappung auf die NEUERE Welle. Damit wanderten Verluste der alten
// Welle in die neue, und die Verlustverteilung - die Kennzahl von G1 -
// waere still falsch geworden.
{
  const probe = new GameState();
  probe.reset();
  probe.startWave();
  for (let i = 0; i < 120; i++) probe.update(1 / 60);
  probe.startWave();
  // Ein Gegner AUS DER ERSTEN Welle ans Bahnende.
  const alt = probe.enemies.find((e) => e.welle === 0 && !e.dead);
  if (!alt) {
    problems.push('Wellenbuchung: kein Gegner aus Welle 1 auf dem Feld - der Fall ist nicht gestellt.');
  } else {
    const vorher = [...probe.stats.leaksByWave];
    const bahn = probe.lanes[alt.lane] ?? probe.lanes[0];
    alt.travelled = bahn.length;
    probe.update(1 / 60);
    const dazu = probe.stats.leaksByWave
      .map((v, i) => (v ?? 0) - (vorher[i] ?? 0))
      .map((v, i) => ({ i, v }))
      .filter((o) => o.v > 0);
    if (dazu.length !== 1 || dazu[0].i !== 0) {
      problems.push(
        `Wellenbuchung: der Verlust eines Gegners aus Welle 1 wurde bei `
        + `${dazu.map((o) => `Welle ${o.i + 1}`).join(', ') || 'keiner Welle'} verbucht.`);
    }
  }
}

// **Panzerung muss auf jeder Stufe etwas ausmachen - und Durchschlag auch.**
//
// Panzerung ist seit Langem ein ANTEIL und kein Abzug: jeder Punkt nimmt
// 11 %, gedeckelt bei zwei Dritteln. Der Grund steht an der Rechnung: als
// Abzug schluckte Panzerung 6 am Anfang drei Viertel eines Bogenschusses und
// am Ende, nach sechs Ausbaustufen, noch zwei Prozent - Panzerung
// verschwand als Spielelement genau dann, wenn der Boss kam, und der Moerser
// verlor seine Rolle als Panzerbrecher.
//
// **Gehalten hat das bis v264 kein einziges Tor.** Der volle Probenlauf hat
// es gemeldet: mit `schluck = 0` - Panzerung ohne jede Wirkung - blieb
// `npm run sim` gruen, und zwar auf jeder Kennzahl. Die Gegenprobe
// "Panzerung wieder als fester Abzug" bewies damit nichts mehr.
//
// Geprueft wird die Eigenschaft selbst, an einem gestellten Fall: derselbe
// Schaden auf denselben Gegner, einmal ohne und einmal mit Durchschlag.
{
  const probe = new GameState();
  probe.reset();
  const { ENEMIES: E } = await import('../src/data/enemies');
  const gepanzert = Object.keys(E).find((id) => E[id as keyof typeof E].armor >= 5);
  if (!gepanzert) {
    problems.push('Panzerung: kein Gegner mit mindestens 5 Panzerung - die Probe misst nichts.');
  } else {
    const messen = (durchschlag: number): number => {
      const g = new GameState();
      g.reset();
      const e = g.spawnZumPruefen(gepanzert as never, 0);
      if (!e) return -1;
      const vorher = e.hp;
      g.trefferZumPruefen(e, 100, durchschlag);
      return vorher - e.hp;
    };
    const ohne = messen(0);
    const mit = messen(E[gepanzert as keyof typeof E].armor);
    if (ohne < 0 || mit < 0) {
      problems.push('Panzerung: der gepanzerte Gegner liess sich nicht stellen.');
    } else if (mit <= ohne * 1.2) {
      problems.push(
        `Panzerung: 100 Schaden richten ohne Durchschlag ${ohne.toFixed(1)} an, mit `
        + `vollem Durchschlag ${mit.toFixed(1)} - Panzerung macht keinen Unterschied, `
        + 'und damit hat der Moerser seine Rolle als Panzerbrecher verloren.',
      );
    }
  }
}

// **Der Riss geht auch wieder zu** (S-P3-03).
//
// Die Rissstufe ist keine gespeicherte Zahl, sondern eine ABLEITUNG aus
// `lives / maxLives` - dieselbe Bauart wie `ui.sync()` bei Regel 6: es gibt
// keine Stelle, an der man das Zuruecksetzen vergessen kann. Genau deshalb
// steht hier eine Pruefung: eine Ableitung, die niemand nachfaehrt, ist eine
// Behauptung. Vor dem Kernraub konnte der Kristall nur fallen, die Richtung
// nach oben war also nie gefahren.
{
  const { rissStufe } = await import('../src/gfx/sprites');
  const probe = new GameState();
  probe.reset();
  const voll = rissStufe(probe.lives / probe.maxLives);
  const e = probe.spawnZumPruefen('brute', 0);
  if (!e) {
    problems.push('Riss: der Koloss liess sich nicht stellen - die Probe misst nichts.');
  } else {
    // Weit genug herunter, dass sich die Stufe ueberhaupt bewegt.
    probe.lives = Math.round(probe.maxLives * 0.4);
    const beschaedigt = rissStufe(probe.lives / probe.maxLives);
    if (beschaedigt <= voll) {
      problems.push(`Riss: bei ${probe.lives} von ${probe.maxLives} Kristall steht die `
        + `Rissstufe auf ${beschaedigt}, bei vollem Kristall auf ${voll} - der Riss waechst nicht.`);
    }
    // Und wieder hinauf, so wie es eine Rueckholung tut.
    probe.splitter.push({
      x: probe.goal.x, y: probe.goal.y, punkte: probe.maxLives - probe.lives,
      rest: 0.01, dauer: 1.1, welle: 0,
    });
    for (let i = 0; i < 30; i++) probe.update(1 / 60);
    const geheilt = rissStufe(probe.lives / probe.maxLives);
    if (geheilt >= beschaedigt) {
      problems.push(`Riss: nach der Rueckholung steht die Rissstufe auf ${geheilt}, `
        + `vorher auf ${beschaedigt} - der Riss geht nicht wieder zu.`);
    }
  }
}

// **Der Kristall darf durch Rueckgabe nie ueber seinen Hoechstwert steigen.**
//
// Das ist die Zusage aus v174, von der anderen Seite: dort wurde der Abzug
// bei null gedeckelt, hier die Gutschrift beim Hoechstwert. Geprueft wird
// mit DREI Splittern auf einen vollen Kristall - einer allein koennte auch
// durch Zufall passen.
{
  const probe = new GameState();
  probe.reset();
  for (let i = 0; i < 3; i++) {
    probe.splitter.push({ x: probe.goal.x, y: probe.goal.y, punkte: 5, rest: 0.01, dauer: 1.1, welle: 0 });
  }
  for (let i = 0; i < 30; i++) probe.update(1 / 60);
  if (probe.lives > probe.maxLives) {
    problems.push(
      `Splitter: der Kristall steht auf ${probe.lives} von ${probe.maxLives} - `
      + 'die Rueckgabe hat ihn ueber seinen Hoechstwert gehoben.',
    );
  }
}

// **Und der fliegende Raeuber** (S-P3-01) - der Sonderfall, der in v219
// schon einmal eine Gegenprobe blind gemacht hat.
//
// Flieger folgen keiner Bahn: ihr `travelled` wird aus der Luftlinie
// zurueckgerechnet und in jedem Bild ueberschrieben. Ein gesetztes
// `travelled` bewegt sie also nicht - sie muessen ueber ihre LAGE gestellt
// werden.
{
  const probe = new GameState();
  probe.reset();
  const e = probe.spawnZumPruefen('flyer', 0);
  if (!e) {
    problems.push('Kernraub: der Gleiter liess sich nicht stellen - die Probe misst nichts.');
  } else {
    e.x = probe.goal.x; e.y = probe.goal.y;
    probe.update(1 / 60);
    if (e.kernraub <= 0) {
      problems.push('Kernraub: der Gleiter hat den Kristall erreicht, traegt aber nichts.');
    } else {
      const tor = (probe.lanes[e.lane] ?? probe.lanes[0]).at(0);
      // Auch hier erst den Stillstand aus `leak()` abwarten.
      for (let i = 0; i < 60; i++) probe.update(1 / 60);
      const vor = Math.hypot(tor.x - e.x, tor.y - e.y);
      for (let i = 0; i < 30; i++) probe.update(1 / 60);
      const nach = Math.hypot(tor.x - e.x, tor.y - e.y);
      if (nach >= vor) {
        problems.push(
          `Kernraub: der fliegende Raeuber kommt seinem Tor nicht naeher `
          + `(${vor.toFixed(0)} -> ${nach.toFixed(0)} Weltpunkte).`,
        );
      }
      // Und er verschwindet dort auch wirklich.
      e.x = tor.x; e.y = tor.y;
      probe.update(1 / 60);
      if (!e.dead) {
        problems.push('Kernraub: der fliegende Raeuber hat sein Tor erreicht und ist noch da.');
      }
    }
  }
}

// D10: der Gegnername in der Wellenvorschau ist ANTIPPBAR.
//
// Bis v193 stand er nur im `title` - also im Zeigerhinweis. Auf dem
// Zielgeraet gibt es keinen Zeiger, dort war er unerreichbar. Geprueft wird
// deshalb nicht der `title`, sondern was nach einem Tipp im Inspektor steht.
//
// Und zweimal gegengeprobt: einmal derselbe Eintrag noch einmal (muss wieder
// zumachen), einmal ein gewaehlter Turm (muss die Auskunft verdraengen -
// sonst verdeckte der Gegnerblock den Turm, weil er davor steht).
{
  const { ENEMIES } = await import('../src/data/enemies');
  state.reset(1234, 'normal', 'spiralhain');
  state.selectedTower = null;
  state.buildChoice = null;
  ui.sync();
  const liste = win.document.getElementById('n-list');
  const eintraege = [...(liste?.querySelectorAll('button[data-gegner]') ?? [])];
  if (!eintraege.length) {
    problems.push('Gegnerauskunft: die Wellenvorschau hat keinen antippbaren Eintrag.');
  } else {
    const knopf = eintraege[0] as unknown as { click(): void; dataset: Record<string, string> };
    const art = knopf.dataset.gegner as keyof typeof ENEMIES;
    knopf.click();
    ui.sync();
    if (state.gegnerInfo !== art) {
      // Regel 3: kommt der Eingriff nicht an, beweist alles Weitere nichts.
      problems.push(`Gegnerauskunft: Tipp auf "${art}" setzt den Zustand nicht (${state.gegnerInfo}).`);
    }
    const panel = win.document.getElementById('inspector');
    const text = panel?.textContent ?? '';
    if (panel?.hasAttribute('hidden')) {
      problems.push('Gegnerauskunft: der Inspektor bleibt verborgen, obwohl ein Gegner gewaehlt ist.');
    }
    const d = ENEMIES[art];
    if (!text.includes(d.name)) {
      problems.push(`Gegnerauskunft: der Name "${d.name}" steht nicht im Inspektor.`);
    }
    for (const needle of ['Leben', 'Tempo', 'Panzerung', 'Gold']) {
      if (!text.includes(needle)) problems.push(`Gegnerauskunft: "${needle}" fehlt in den Werten.`);
    }
    // Die Ausbauknoepfe gehoeren einem Turm. Bleiben sie stehen, steht der
    // Kaufknopf des zuletzt gewaehlten Turms unter fremden Werten.
    if ((win.document.getElementById('i-ups')?.innerHTML ?? '') !== '') {
      problems.push('Gegnerauskunft: die Ausbauknoepfe des letzten Turms stehen noch da.');
    }
    // Gegenprobe 1: noch einmal derselbe Eintrag macht wieder zu.
    const wieder = [...(liste?.querySelectorAll('button[data-gegner]') ?? [])]
      .find((b) => (b as unknown as { dataset: Record<string, string> }).dataset.gegner === art);
    (wieder as unknown as { click(): void } | undefined)?.click();
    ui.sync();
    if (state.gegnerInfo !== null) {
      problems.push('Gegnerauskunft: derselbe Eintrag ein zweites Mal schliesst sie nicht.');
    }
    // Gegenprobe 2: ein gewaehlter Turm verdraengt die Auskunft.
    const { candidateSpots: spotsD } = await import('./spots');
    state.gold = 999999;
    const platzD = spotsD(state)[0];
    if (!platzD) {
      problems.push('Gegnerauskunft: kein Bauplatz fuer die Gegenprobe gefunden.');
    } else {
      state.build(platzD.x, platzD.y, 'arrow');
      state.gegnerInfo = art;
      state.selectedTower = state.gebaute[state.gebaute.length - 1] ?? null;
      ui.sync();
      if (state.gegnerInfo !== null) {
        problems.push('Gegnerauskunft: ein gewaehlter Turm raeumt sie nicht weg.');
      }
      const nachher = win.document.getElementById('inspector')?.textContent ?? '';
      if (nachher.includes(ENEMIES[art].name)) {
        problems.push('Gegnerauskunft: sie verdeckt den gewaehlten Turm.');
      }
    }
  }
}

// C18: die Faehigkeiten haengen am Fortschritt - und die erste Karte geht
// ohne sie.
//
// Vier Fragen, und jede hat ihre Gegenrichtung (Regel 13). Dass etwas
// gesperrt ist, beweist nichts, solange nicht auch gezeigt ist, dass es sich
// oeffnet - und umgekehrt.
{
  const { ABILITIES: FAEH, ABILITY_ORDER: FOLGE } = await import('../src/data/abilities');
  const g = new GameState();

  // 1. Ohne gewonnene Karte gibt es genau die Faehigkeiten mit `braucht: 0`.
  g.reset(1234, 'normal', 'spiralhain', { karten: 0 });
  const offen0 = FOLGE.filter((id) => g.freigeschaltet(id));
  const soll0 = FOLGE.filter((id) => FAEH[id].braucht === 0);
  if (offen0.join() !== soll0.join()) {
    problems.push(`Fortschritt: ohne Karte offen [${offen0.join(', ')}], erwartet [${soll0.join(', ')}].`);
  }
  if (!offen0.length) problems.push('Fortschritt: ohne Karte ist gar nichts da.');
  if (offen0.length === FOLGE.length) {
    problems.push('Fortschritt: ohne Karte ist schon alles offen - dann sperrt nichts.');
  }

  // 1b. Und man SIEHT es (S2 des Abgleichs): der Knopf steht da, mit Namen,
  //     und sagt, was fehlt. Geprueft am DOM, nicht am Zustand - ein
  //     gesperrter Zustand, den die Leiste als "bereit" zeichnet, waere die
  //     schlimmere Haelfte des Fehlers.
  {
    state.karten = 0;
    ui.sync();
    for (const id of FOLGE) {
      const b = win.document.getElementById(`sk-${id}`) as unknown as
        { disabled: boolean; dataset: Record<string, string>; textContent: string };
      const zu = FAEH[id].braucht > 0;
      if (!b) { problems.push(`Fortschritt: kein Knopf fuer "${id}".`); continue; }
      if (b.dataset.zu !== (zu ? '1' : '0')) {
        problems.push(`Fortschritt: "${id}" ist ${zu ? 'gesperrt' : 'offen'}, `
          + `der Knopf sagt data-zu="${b.dataset.zu}".`);
      }
      if (zu && !b.disabled) problems.push(`Fortschritt: der Knopf "${id}" ist gesperrt, aber druckbar.`);
      if (zu && !/Karten?/.test(b.textContent)) {
        problems.push(`Fortschritt: der gesperrte Knopf "${id}" sagt nicht, was fehlt `
          + `("${b.textContent.trim()}").`);
      }
      if (zu && !b.textContent.includes(FAEH[id].name)) {
        problems.push(`Fortschritt: der gesperrte Knopf "${id}" nennt seinen Namen nicht - `
          + 'dann ist es ein leerer Fleck statt eines Plans.');
      }
      if (!zu && /Karten?/.test(b.textContent)) {
        problems.push(`Fortschritt: der OFFENE Knopf "${id}" verlangt trotzdem Karten.`);
      }
    }
    state.karten = ALLE_KARTEN.length;
    ui.sync();
  }

  // 2. Eine gesperrte Faehigkeit laesst sich nicht ausloesen. Geprueft am
  //    ZUSTAND, nicht am Rueckgabewert: `chooseAbility` gibt nichts zurueck.
  const zu = FOLGE.find((id) => !g.freigeschaltet(id))!;
  g.chooseAbility(zu);
  if (g.abilityCd[zu] > 0 || g.aiming === zu) {
    problems.push(`Fortschritt: "${zu}" liess sich ausloesen, obwohl es gesperrt ist.`);
  }
  if (!g.cast(zu, g.goal.x, g.goal.y) === false) {
    problems.push(`Fortschritt: "${zu}" liess sich per cast() ausloesen.`);
  }

  // 3. Mit jeder Karte kommt eine dazu, und keine geht wieder weg.
  let vorher = 0;
  for (let k = 0; k <= ALLE_KARTEN.length; k++) {
    g.reset(1234, 'normal', 'spiralhain', { karten: k });
    const n = FOLGE.filter((id) => g.freigeschaltet(id)).length;
    if (n < vorher) problems.push(`Fortschritt: bei ${k} Karten weniger offen als bei ${k - 1}.`);
    vorher = n;
  }
  if (vorher !== FOLGE.length) {
    problems.push(`Fortschritt: nach allen Karten sind ${vorher} von ${FOLGE.length} offen.`);
  }

  // 4. Die erste Karte muss OHNE die gesperrten zu gewinnen sein (S4 des
  //    Abgleichs). Das ist die Zahl, an der die ganze Sperre haengt: eine
  //    Eroeffnung, die man nicht gewinnen kann, ist kein Fortschritt.
  //    Gemessen mit demselben Bot wie der Durchlauf oben - und der ruehrt
  //    KEINE Faehigkeit an. Das ist hier die richtige Messstelle: er misst
  //    den Boden, also den Fall, in dem die eine verbliebene auch noch
  //    ungenutzt bleibt. Was die Faehigkeiten wert sind, misst dagegen
  //    `npx tsx tools/sim.ts --faehigkeiten` ueber zwoelf Laeufe je Karte.
  //
  //    Der Fortschritt wird dabei angefasst - ein Sieg traegt Sterne ein.
  //    Also gesichert und zurueckgestellt, wie im Durchlauf oben, sonst
  //    misst alles Spaetere diesen Block mit.
  {
    const stand = getProgress();
    const sterne = { ...stand.stars };
    const abdruck = JSON.stringify(stand);

    const h = new GameState();
    h.reset(4242, 'normal', ALLE_KARTEN[0].id, { karten: 0 });
    const plaetze = candidateSpots(h);
    const z = { spot: 0, si: 0 };
    let f = 0;
    while (h.phase === 'playing' && f < 60 * 60 * 20) {
      botSchritt(h, plaetze, z);
      // Auch dieser Bot ueberlappt nicht - siehe die Begruendung bei
      // `botSchritt` weiter oben (S-P4-01).
      if (h.canStartWave && !h.waveActive) h.startWave();
      h.update(1 / 60);
      f++;
    }
    if (h.phase !== 'won') {
      problems.push(`Fortschritt: die erste Karte ist mit ${offen0.length} Faehigkeit(en) `
        + `nicht zu gewinnen (Ende in Welle ${h.waveNumber}). Dann sperrt C18 die Eroeffnung zu.`);
    }
    console.log(`  Erste Karte ohne die gesperrten: `
      + `${h.phase === 'won' ? 'gewonnen' : 'verloren'}, `
      + `Kristall ${h.lives}/${h.maxLives} mit ${offen0.length} von ${FOLGE.length} Faehigkeiten.`);

    // 5. Der Ergebnisbildschirm sagt die Freischaltung an (S5) - und nur
    //    dann, wenn wirklich eine dazugekommen ist. Der Lauf oben hat
    //    gerade die erste Karte gewonnen, also muss hier eine stehen.
    const a1 = auswertung(h);
    if (h.phase === 'won') {
      if (a1.freischaltung === null) {
        problems.push('Fortschritt: die erste gewonnene Karte schaltet nichts frei.');
      } else if (FAEH[a1.freischaltung].braucht !== 1) {
        problems.push(`Fortschritt: die erste Karte schaltet "${a1.freischaltung}" frei, `
          + `das aber ${FAEH[a1.freischaltung].braucht} Karten verlangt.`);
      }
    }

    // Gegenprobe: dieselbe Karte NOCH EINMAL bringt nichts Neues. Ohne sie
    // waere "es erscheint eine Zeile" auch dann gruen, wenn sie bei jedem
    // Sieg erschiene - und eine Freischaltung, die man zweimal bekommt, ist
    // keine.
    const h2 = new GameState();
    h2.reset(1234, 'normal', ALLE_KARTEN[0].id);
    h2.beendenZumPruefen(true);
    if (auswertung(h2).freischaltung !== null) {
      problems.push('Fortschritt: dieselbe Karte zweimal gewonnen schaltet zweimal frei.');
    }
    // Und die zweite Gegenrichtung: eine NIEDERLAGE schaltet nie etwas frei.
    const h3 = new GameState();
    h3.reset(1234, 'normal', ALLE_KARTEN[1].id, { karten: 1 });
    h3.beendenZumPruefen(false);
    if (auswertung(h3).freischaltung !== null) {
      problems.push('Fortschritt: eine verlorene Partie schaltet etwas frei.');
    }

    stand.stars = sterne;
    if (JSON.stringify(stand) !== abdruck) {
      problems.push('Fortschritt: der C18-Block hat den Fortschritt veraendert und nicht '
        + 'zurueckgestellt.');
    }
  }
}

// Der Messschalter (D27): anschalten IM SPIEL, nicht nur ueber die Adresse.
//
// Geprueft wird die Kette, nicht der Knopf: Tipp -> Einstellung -> Anzeige.
// Und in beide Richtungen (Regel 13) - ein Schalter, der nur einschaltet,
// ist ein Knopf, kein Schalter.
{
  const knopf = win.document.getElementById('b-mess') as unknown as
    { click(): void; dataset: Record<string, string> };
  if (!knopf) {
    problems.push('Messschalter: der Knopf "b-mess" fehlt in der Kopfzeile.');
  } else {
    const vorher = getSettings().messung;
    knopf.click();
    if (getSettings().messung === vorher) {
      problems.push('Messschalter: ein Tipp aendert die Einstellung nicht.');
    }
    ui.sync();
    if (knopf.dataset.on !== (getSettings().messung ? '1' : '0')) {
      problems.push('Messschalter: der Knopf zeigt seinen Zustand nicht - '
        + `Einstellung ${getSettings().messung}, Knopf "${knopf.dataset.on}".`);
    }
    // Gegenrichtung: noch einmal tippen schaltet wieder aus.
    knopf.click();
    ui.sync();
    if (getSettings().messung !== vorher) {
      problems.push('Messschalter: der zweite Tipp schaltet nicht wieder aus.');
    }
    if (knopf.dataset.on !== (vorher ? '1' : '0')) {
      problems.push('Messschalter: nach dem Ausschalten bleibt der Knopf an.');
    }
  }
}

// Die Messtafel: laesst sie sich anlegen, wieder wegraeumen, und gibt sie
// ihren Inhalt als Text heraus?
//
// Der Text ist der Grund, aus dem es den Kopierknopf gibt: ein Foto muss
// abgetippt werden, und abgetippte Messwerte sind falsche Messwerte.
{
  const { messungStarten, messungAus, messungLaeuft, messungAlsText } =
    await import('../src/core/messung');
  if (messungLaeuft()) messungAus();
  messungStarten(() => [['Probe', 'ja']]);
  if (!messungLaeuft()) problems.push('Messtafel: laesst sich nicht anlegen.');
  if (!win.document.getElementById('messtafel')) {
    problems.push('Messtafel: sie steht nicht im Dokument.');
  }
  const text = messungAlsText();
  for (const noetig of ['Bilddauer Mitte', 'Bildpunkte', 'Probe: ja']) {
    if (!text.includes(noetig)) {
      problems.push(`Messtafel: "${noetig}" fehlt im Text zum Kopieren.`);
    }
  }
  // **Zweimal anlegen darf nicht zwei Tafeln geben.** Sie haengt an einer
  // Einstellung, die jedes Bild abgeleitet wird - ein zweiter Aufruf ist
  // damit die Regel und nicht die Ausnahme.
  messungStarten(() => []);
  if (win.document.querySelectorAll('#messtafel').length !== 1) {
    problems.push('Messtafel: ein zweiter Aufruf legt eine zweite an.');
  }
  messungAus();
  if (messungLaeuft() || win.document.getElementById('messtafel')) {
    problems.push('Messtafel: sie laesst sich nicht wieder wegraeumen.');
  }
  if (messungAlsText() !== '') {
    problems.push('Messtafel: nach dem Abschalten steht der alte Text noch bereit.');
  }
}

// **Ein einziges schlechtes Bild darf die Schleife nicht toeten** (v197).
//
// Bis v196 stand `requestAnimationFrame` am ENDE des Bildes. Warf `update`
// oder `render` ein einziges Mal, wurde nie wieder ein Bild bestellt - die
// Schleife war fuer den Rest der Sitzung tot. Von aussen sieht das aus wie
// "das Spiel reagiert nicht mehr", und genau so ist es vom Zielgeraet
// gemeldet worden. Kein Tor hat je gefragt, ob die Schleife einen Fehler
// ueberlebt.
//
// Geprueft wird in beide Richtungen (Regel 13): ein Aussetzer wird
// ueberstanden, ein Dauerfehler fuehrt zum Aufgeben MIT Meldung. Ohne die
// zweite Haelfte waere eine Schleife gruen, die ewig sinnlos weiterrechnet.
{
  const { Loop } = await import('../src/core/loop');
  const warten = (n: number) => new Promise<void>((fertig) => {
    let i = 0;
    const takt = () => (++i >= n ? fertig() : (globalThis.requestAnimationFrame(takt), undefined));
    globalThis.requestAnimationFrame(takt);
  });

  // 1. Ein einzelner Aussetzer.
  {
    let bilder = 0;
    const l = new Loop(() => { bilder++; if (bilder === 3) throw new Error('einmal'); }, () => {});
    l.start();
    await warten(30);
    l.stop();
    if (bilder < 10) {
      problems.push(`Schleife: nach einem einzelnen Fehler nur ${bilder} Bilder - sie ist stehen geblieben.`);
    }
    if (l.letzterFehler !== 'einmal') {
      problems.push(`Schleife: der Fehler wurde nicht gemerkt (${l.letzterFehler}).`);
    }
  }

  // 2. Ein Dauerfehler: aufgeben, aber nicht schweigend.
  {
    let gemeldet: string | null = null;
    const l = new Loop(() => { throw new Error('immer'); }, () => {},
      (grund) => { gemeldet = grund; });
    l.start();
    await warten(200);
    if (l.laeuft()) {
      problems.push('Schleife: rechnet nach 200 gescheiterten Bildern immer noch weiter.');
      l.stop();
    }
    if (!gemeldet) {
      problems.push('Schleife: gibt auf, ohne es zu melden - dann steht der Spieler vor einem toten Bild.');
    } else if (!String(gemeldet).includes('immer')) {
      problems.push(`Schleife: meldet "${gemeldet}" statt den Grund.`);
    }
  }

  // 3. Und im Normalfall zaehlt sie mit - die Messtafel liest den Zaehler,
  //    um "Geraet lahm" von "Spiel tot" zu unterscheiden.
  {
    const l = new Loop(() => {}, () => {});
    l.start();
    await warten(20);
    l.stop();
    if (l.bilder < 5) problems.push(`Schleife: zaehlt nur ${l.bilder} Bilder statt mitzuzaehlen.`);
  }
}

// D12: die Bilanz ist MITTEN im Lauf abrufbar, nicht erst am Ende.
//
// Geprueft wird nicht, dass sich ein Knopf druecken laesst, sondern dass das
// Blatt danach WAS SAGT - und zwar vollstaendig. Genau daran ist die alte
// Fassung gescheitert: sie listete `TOWER_ORDER`, und die Zielunit steht da
// nicht drin. Ihr Schaden ging in die Summe ein und fehlte in den Balken,
// die Anteile summierten sich auf unter 100 % und niemand sah es.
{
  // Die Pausenkarte haengt an `phase === 'playing'`. Nach dem Hauptlauf steht
  // die Partie auf "won" - also wird hier ein frischer Lauf aufgesetzt und so
  // weit gespielt, bis wirklich Schaden mitgeschrieben ist. Ein Blatt ohne
  // Zahlen wuerde nichts beweisen.
  const { candidateSpots: spotsB } = await import('./spots');
  state.reset(7, 'normal', 'spiralhain');
  state.gold = 999999;
  const platz = spotsB(state)[0];
  if (platz) state.build(platz.x, platz.y, 'arrow');
  // Gespielt wird, bis MEHRERE Quellen Schaden gemacht haben - darunter die
  // Zielunit. Ein Lauf, in dem nur der eine Turm trifft, koennte die
  // Vollstaendigkeitspruefung unten gar nicht scheitern lassen: eine fehlende
  // Quelle faellt nur auf, wenn es sie gibt (Regel 13).
  for (let i = 0; i < 60 * 600; i++) {
    if (!state.waveActive && state.canStartWave) state.startWave();
    state.update(DT);
    // Und MINDESTENS zwei Wellen, sonst hat der Wellenverlauf unten keinen
    // Gegenstand: eine einzelne Welle ist kein Verlauf, und die Pruefung auf
    // die Balken koennte gar nicht scheitern (Regel 13).
    if ((state.stats.damageBy.core ?? 0) > 0 && (state.stats.damageBy.arrow ?? 0) > 0
      && state.stats.damageByWave.length >= 2) break;
  }
  const quellenZahl = Object.values(state.stats.damageBy).filter((v) => v > 0).length;
  if (quellenZahl < 2) {
    problems.push(
      `Bilanz: die Probe hat nur ${quellenZahl} Schadensquelle(n) zustande gebracht - `
      + 'die Vollstaendigkeitspruefung unten kann so gar nicht scheitern.',
    );
  }
  state.paused = true;
  ui.sync();
  const knopf = document.getElementById('p-bilanz') as HTMLButtonElement | null;
  const wahl = document.getElementById('p-wahl');
  const blatt = document.getElementById('p-blatt');
  const body = document.getElementById('p-blatt-body');
  if (!knopf || !wahl || !blatt || !body) {
    problems.push('Bilanz: die Pausenkarte hat kein Bilanzblatt.');
  } else {
    if (knopf.hidden) problems.push('Bilanz: der Knopf fehlt, obwohl Schaden mitgeschrieben ist.');
    if (!blatt.hidden) problems.push('Bilanz: das Blatt liegt offen, ohne dass jemand es geoeffnet hat.');
    knopf.dispatchEvent(new window.Event('click'));
    ui.sync();
    if (blatt.hidden || !wahl.hidden) {
      problems.push('Bilanz: nach dem Tippen liegt immer noch die Knopfseite oben.');
    }
    const text = body.textContent ?? '';
    if (text.length < 40) problems.push(`Bilanz: das Blatt ist so gut wie leer (${text.length} Zeichen).`);

    // Die laufende Welle, nicht die ueberstandene. Mitten im Spiel meldete
    // das Blatt "Wellen 0/15", waehrend die erste lief - am Ende ist
    // "ueberstanden" die richtige Lesart, waehrend des Laufs die falsche.
    const wellenFeld = [...body.querySelectorAll('.fig')]
      .find((n) => (n.querySelector('span')?.textContent ?? '').startsWith('Welle'));
    const gezeigt = Number((wellenFeld?.querySelector('strong')?.textContent ?? '0').split('/')[0]);
    if (gezeigt !== Math.max(1, state.waveNumber)) {
      problems.push(
        `Bilanz: das Blatt meldet Welle ${gezeigt}, gespielt wird ${state.waveNumber}.`,
      );
    }

    // D13: der Wellenverlauf muss den Lauf beschreiben, den es gab.
    //
    // Die Summe ueber die Wellen MUSS die Gesamtsumme sein - beide werden an
    // derselben Stelle gebucht, und wenn sie auseinanderlaufen, ist eine von
    // beiden falsch, ohne dass man saehe welche.
    {
      const proWelle = state.stats.damageByWave;
      const summe = proWelle.reduce((a, b) => a + (b ?? 0), 0);
      if (Math.abs(summe - state.stats.damage) > 1) {
        problems.push(
          `Wellenverlauf: ${Math.round(summe)} Schaden ueber die Wellen, `
          + `${Math.round(state.stats.damage)} in der Summe - die beiden laufen auseinander.`);
      }
      if (proWelle.length !== state.waveNumber) {
        problems.push(
          `Wellenverlauf: ${proWelle.length} Wellen verbucht, gespielt wird Welle ${state.waveNumber}.`);
      }
      const balken = body.querySelectorAll('.verlauf i').length;
      if (proWelle.length >= 2 && balken !== proWelle.length) {
        problems.push(`Wellenverlauf: ${balken} Balken gezeichnet, ${proWelle.length} Wellen verbucht.`);
      }
    }

    // Die eigentliche Pruefung: decken die Balken den ganzen Schaden ab?
    const anteile = [...body.querySelectorAll('.bars dd')]
      .map((n) => Number((n.textContent ?? '').replace(/[^0-9]/g, '')));
    const summe = anteile.reduce((a, b) => a + b, 0);
    if (!anteile.length) {
      problems.push('Bilanz: keine einzige Schadensquelle aufgefuehrt.');
    } else if (summe < 97 || summe > 103) {
      problems.push(
        `Bilanz: die Anteile summieren sich auf ${summe} %, nicht auf 100. `
        + 'Eine Schadensquelle fehlt in der Aufschluesselung oder wird doppelt gezaehlt.',
      );
    }

    (document.getElementById('p-zurueck') as HTMLButtonElement).dispatchEvent(new window.Event('click'));
    ui.sync();
    if (!blatt.hidden || wahl.hidden) problems.push('Bilanz: "Zurueck" fuehrt nicht zurueck.');

    // Und die Ableitung: endet die Pause, ist das Blatt zu (Regel 6).
    knopf.dispatchEvent(new window.Event('click'));
    ui.sync();
    state.paused = false;
    ui.sync();
    state.paused = true;
    ui.sync();
    if (!blatt.hidden) {
      problems.push('Bilanz: das Blatt stand nach dem Fortsetzen noch offen - es haengt an einem Schalter statt an einer Ableitung.');
    }
  }
  state.paused = false;
  ui.sync();
}

// Die Turmwahl erscheint am angetippten Platz.
//
// Bis v101 musste man erst in der Leiste einen Turm waehlen und dann aufs Feld
// tippen - zwei Schritte, und die Leiste klappte dabei auf und zu.
{
  const wahl = document.getElementById('pick');
  if (!wahl) {
    problems.push('Turmwahl: fehlt im Dokument.');
  } else {
    state.reset(3, 'normal', 'frostspalte');
    state.buildAt = null;
    ui.sync();
    if (!wahl.hidden) problems.push('Turmwahl: sichtbar, obwohl kein Platz gewaehlt ist.');

    state.buildAt = { x: state.map.hint.x, y: state.map.hint.y };
    ui.sync();
    if (wahl.hidden) problems.push('Turmwahl: bleibt verborgen, obwohl ein Platz gewaehlt ist.');
    const knoepfe = wahl.querySelectorAll('.pick-btn').length;
    if (knoepfe !== BAU_ORDER.length) {
      problems.push(`Turmwahl: ${knoepfe} Knoepfe fuer ${BAU_ORDER.length} Bauwerke.`);
    }

    // **Und sie sagt, was der Turm HIER an Verbund bekaeme** (v245, F4).
    //
    // Der Zuschlag folgt aus der Lage, und die waehlt man in genau diesem
    // Augenblick. Ihn erst am gebauten Turm zu zeigen hiesse, die Auskunft
    // nach der Entscheidung zu geben.
    //
    // Der Fall wird GESTELLT, nicht abgewartet: ein Turm anderer Art in
    // Reichweite des angetippten Platzes. Ohne ihn stuende die Marke zu
    // Recht nicht da, und die Probe bewiese nichts (Regel 13). Genau das
    // ist die Nullprobe daneben - vorher darf keine Marke stehen.
    if (wahl.querySelector('.pick-verbund')) {
      problems.push('Turmwahl: nennt einen Verbund, obwohl kein Turm in der Naehe steht.');
    }
    {
      state.gold = 99999;
      const ziel = state.buildAt!;
      // Nicht der NAECHSTE Platz, sondern einer im Band dazwischen. Der
      // erste Anlauf nahm den naechsten - und der stand so dicht, dass er
      // den angetippten Platz selbst zubaute: dann ist dort kein Turm mehr
      // moeglich, es steht "passt hier nicht" statt einer Verbundmarke, und
      // die Probe meldete einen Fehler, den es nicht gab. Zwei Tuerme
      // brauchen 111 Weltpunkte Abstand, der Verbund reicht 260 weit; die
      // Probe muss in diese Luecke zielen.
      const nah = candidateSpots(state)
        .filter((p) => Math.hypot(p.x - ziel.x, p.y - ziel.y) > 150
          && Math.hypot(p.x - ziel.x, p.y - ziel.y) < VERBUND_UMKREIS)
        .sort((a, b) => Math.hypot(a.x - ziel.x, a.y - ziel.y)
          - Math.hypot(b.x - ziel.x, b.y - ziel.y));
      if (!nah.some((p) => state.build(p.x, p.y, 'frost'))) {
        problems.push('Turmwahl: kein Nachbar im Verbundumkreis setzbar - die Probe misst nichts.');
      } else {
        ui.sync();
        const marken = [...wahl.querySelectorAll('.pick-verbund')]
          .map((e) => (e.textContent ?? '').trim());
        if (!marken.length) {
          problems.push('Turmwahl: nennt keinen Verbund, obwohl ein Frostturm danebensteht.');
        } else if (!marken.every((m) => /^\+\d+ %$/.test(m))) {
          problems.push(`Turmwahl: Verbundmarke lautet "${marken[0]}".`);
        }
        // Der Frostturm selbst darf keine bekommen - er ist die Art, die
        // schon dasteht.
        const frostKnopf = wahl.querySelector('.pick-btn[data-turm="frost"]');
        if (frostKnopf?.querySelector('.pick-verbund')) {
          problems.push('Turmwahl: der Frostturm bekommt Verbund von seinesgleichen.');
        }
      }
    }

    // Im Menue und in der Pause hat sie nichts zu suchen.
    state.paused = true;
    ui.sync();
    if (!wahl.hidden) problems.push('Turmwahl: sichtbar, obwohl pausiert.');
    state.paused = false;
    state.buildAt = null;
    ui.sync();
  }
}

// Die Uebersichtskarte traegt jede Kartenzahl.
//
// Bis v98 standen dort drei feste Koordinaten - eine vierte Karte waere
// unsichtbar geblieben, eine dritte weniger haette einen Punkt ins Leere
// gelassen. Geprueft wird deshalb: ein Punkt je Karte, und alle im Bild.
{
  const { Menu } = await import('../src/game/menu');
  const { MAPS } = await import('../src/data/maps');
  const m = new Menu();
  if (m.nodes.length !== MAPS.length) {
    problems.push(`Uebersicht: ${m.nodes.length} Punkte fuer ${MAPS.length} Karten.`);
  }
  for (const n of m.nodes) {
    if (n.x < 60 || n.y < 60 || n.x > WORLD_W - 60 || n.y > WORLD_H - 60) {
      problems.push(`Uebersicht: Punkt ${Math.round(n.x)}/${Math.round(n.y)} liegt am Rand oder ausserhalb.`);
    }
  }
  // Und die Punkte muessen die Breite auch ausnutzen.
  //
  // Die reine Anzahl reicht als Pruefung nicht: rechnet die Verteilung mit
  // einer falschen Kartenzahl, kommen trotzdem so viele Punkte heraus, wie es
  // Karten gibt - sie draengen sich nur auf der linken Haelfte. Genau das hat
  // die erste Fassung dieser Pruefung durchgelassen.
  if (m.nodes.length > 1) {
    const letzter = m.nodes[m.nodes.length - 1].x;
    if (letzter < WORLD_W * 0.7) {
      problems.push(
        `Uebersicht: der letzte Punkt liegt bei ${Math.round((letzter / WORLD_W) * 100)} % `
        + 'der Breite - die Karten draengen sich links.',
      );
    }
  }
}

// Die Baukante wird nicht nachgebaut.
//
// Hier stand bis v203 die Pruefung, dass die Bauauskunft nur ein Fenster um
// den Finger zeigt statt der ganzen Karte - richtig fuer ein Punktraster,
// gegenstandslos fuer eine Flaeche. Die Bildabnahme misst jetzt, was an ihre
// Stelle tritt: wie stark abgedunkelt wird, wieviel Zeichnung bleibt und ob
// die Kante hart ist.
//
// Was ein Textblick weiterhin kann, und die Bildabnahme nicht: sehen, ob das
// Zeichenwerk die Bauregel EIN ZWEITES MAL rechnet. Genau daran ist die alte
// Fassung gescheitert - die gezeigte Kante lag bis zu 30,8 Weltpunkte neben
// der Regel, weil beide dieselbe Frage getrennt beantworteten (Regel 15).
// Wer in `renderer.ts` wieder `PATH_CLEARANCE` oder `halfNear` anfasst, baut
// sie nach.
{
  const quelle = readFileSync(new URL('../src/gfx/renderer.ts', import.meta.url), 'utf8');
  if (!/bauflaechenBild\(/.test(quelle)) {
    problems.push('Baukante: das Zeichenwerk holt die verbotene Flaeche nicht mehr aus '
      + 'bauflaeche.ts - dann zeigt es etwas anderes an, als die Bauregel sagt.');
  }
  for (const wort of ['PATH_CLEARANCE', 'halfNear', 'schlauchAbstand']) {
    if (quelle.includes(wort)) {
      problems.push(`Baukante: renderer.ts rechnet mit \`${wort}\` - die Bauregel steht `
        + 'damit an zwei Stellen, und gepflegt wird eine davon.');
    }
  }
}

// Keine Farbe aus einer Variablen, die es nicht gibt.
//
// Im Pausenmenue standen `var(--ink)` und `var(--accent)` - beide sind in
// diesem Blatt nie definiert worden. CSS meldet das nicht, es erbt einfach
// irgendeine Farbe; im Spiel war die Schrift dadurch kaum zu lesen. Ein
// Tippfehler in einem Variablennamen ist unsichtbar, bis jemand hinsieht.
{
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const wurzel = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  const bekannt = new Set([...wurzel.matchAll(/--([a-z-]+):/g)].map((m) => m[1]));
  // Manche Variablen setzt die Oberflaeche zur Laufzeit je Element - etwa die
  // Zweigfarbe eines Turmknopfs. Die stehen zu Recht nicht in :root, also
  // zaehlt hier auch, was im Quelltext per setProperty oder style= gesetzt wird.
  const ts = ['ui.ts'].map((f) => readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8')).join('\n');
  for (const m of ts.matchAll(/--([a-z-]+)\s*[:,]/g)) bekannt.add(m[1]);
  for (const m of ts.matchAll(/setProperty\('--([a-z-]+)'/g)) bekannt.add(m[1]);
  const benutzt = new Set([...css.matchAll(/var\(--([a-z-]+)\)/g)].map((m) => m[1]));
  for (const name of benutzt) {
    if (!bekannt.has(name)) {
      problems.push(`Stilblatt: var(--${name}) wird benutzt, ist aber nirgends gesetzt.`);
    }
  }
}

// Das Pausenmenue haengt am Pausenzustand.
//
// Es liegt in HTML, nicht auf der Leinwand - die Bildabnahme sieht es also
// nicht. Geprueft wird deshalb hier: erscheint es mit der Pause, verschwindet
// es mit ihr, und sind die drei Knoepfe da und gross genug?
{
  const menue = document.getElementById('pause-menu');
  if (!menue) {
    problems.push('Pausenmenue: fehlt im Dokument.');
  } else {
    // Ganz am Ende, denn `reset` loescht die Auswertung des vorigen Tests -
    // genau daran ist dieser Block beim ersten Mal gescheitert.
    state.reset(3, 'normal', 'spiralhain');
    state.paused = false;
    ui.sync();
    if (!menue.hidden) problems.push('Pausenmenue: sichtbar, obwohl nicht pausiert.');
    state.paused = true;
    ui.sync();
    if (menue.hidden) problems.push('Pausenmenue: bleibt verborgen, obwohl pausiert.');
    for (const id of ['p-resume', 'p-restart', 'p-quit']) {
      if (!document.getElementById(id)) problems.push(`Pausenmenue: Knopf ${id} fehlt.`);
    }
    state.paused = false;
    ui.sync();
  }
}


// Wirkt die Ziellogik ueberhaupt?
//
// Ein Knopf, der sich druecken laesst und ein Feld setzt, beweist nichts -
// das ist genau die Sorte Pruefung, die immer gruen ist. Gemessen wird
// deshalb, was die Tuerme TREFFEN: mit "schwach" muss der mittlere
// Lebensstand des anvisierten Gegners unter dem mit "stark" liegen.
//
// Kein fester Schwellwert, sondern eine Ordnung. Absolute Grenzen an dieser
// Stelle veralteten mit jeder Balance-Runde (Regel 2); die Ordnung nicht:
// solange die Wahl wirkt, liegt schwach unter stark.
{
  const { ZIELWAHL_ORDNUNG } = await import('../src/game/types');
  const { candidateSpots } = await import('./spots');
  const staende: Record<string, number> = {};
  const strecken: Record<string, number> = {};
  for (const wahl of ZIELWAHL_ORDNUNG) {
    state.reset(12345, 'normal', 'spiralhain');
    state.gold = 99999;
    for (const sp of candidateSpots(state).slice(0, 6)) state.build(sp.x, sp.y, 'arrow');
    // Ohne die Zielunit - gemessen wird die WAHL, nicht der Standort.
    //
    // Sie steht am Ziel, wo alle Bahnen zusammenlaufen, und sieht deshalb
    // fast nur Gegner, die ohnehin schon fast durch sind: gleiche Strecke,
    // aehnlicher Lebensstand. Ihre Stichproben ziehen jede Wahl auf
    // denselben Mittelwert. Beim ersten Lauf nach v165 meldeten "schwach"
    // und "stark" beide 56 Prozent, und die Wahl wirkte tadellos - sie ging
    // nur im Rauschen unter (Regel 13: der Messplatz muss das Gesuchte zum
    // Lautesten machen).
    const gemessen = state.gebaute;
    for (const t of gemessen) t.zielwahl = wahl;
    // **Gemessen an einer Welle mit ZWEI Gegnerarten, nicht an der ersten.**
    //
    // "schwach" und "stark" unterscheiden sich am Lebensstand in Prozent. In
    // Welle 1 laufen sieben gleiche Kriecher, alle mit demselben Hoechstwert
    // und unter gleichmaessigem Feuer - der Lebensstand streut kaum, und die
    // beiden Modi landen auf demselben Mittelwert. Auf der kurzen Bahn ging
    // das gerade noch aus (52 gegen 51); auf der langen Serpentine, wo sich
    // die Reichweiten stark ueberlappen, gar nicht mehr.
    //
    // Welle 6 bringt Spalter und Laeufer zusammen: verschiedene
    // Hoechstwerte, verschiedene Geschwindigkeiten, echte Streuung. Derselbe
    // Gedanke wie im Absatz darueber - der Messplatz muss das Gesuchte zum
    // Lautesten machen (Regel 13), und der alte tat es nicht mehr.
    state.waveIndex = 5;
    state.startWave();
    let summe = 0, weg = 0, n = 0;
    for (let i = 0; i < 60 * 60 && state.phase === 'playing'; i++) {
      state.update(1 / 60);
      for (const t of gemessen) {
        if (t.target) { summe += t.target.hp / t.target.hpMax; weg += t.target.travelled; n++; }
      }
    }
    staende[wahl] = n ? summe / n : 0;
    strecken[wahl] = n ? weg / n : 0;
    if (!n) problems.push(`Ziellogik "${wahl}": kein Turm hat je ein Ziel gefasst.`);
  }
  if (staende.schwach >= staende.stark) {
    problems.push(
      `Ziellogik wirkt nicht: "schwach" visiert Gegner mit ${(staende.schwach * 100).toFixed(0)} % ` +
      `Lebensstand an, "stark" mit ${(staende.stark * 100).toFixed(0)} % - ` +
      'schwach muesste darunter liegen.',
    );
  }
  // **Das zweite Paar (TF-032) ist in v237 entfallen** - es verglich "vorn"
  // gegen "hinten", und "hinten" gibt es nicht mehr. Der Modus hatte seinen
  // einzigen Sieg auf der dritten Bahn der Ascheschlucht, und die war der
  // Fehler, der aus dem Spiel gemeldet wurde. `npm run sim` verlangt von
  // jedem Modus einen messbaren Fall; "hinten" hatte danach keinen mehr.
  //
  // Was an seine Stelle tritt, steht schon da: "nah" gegen "vorn". Beide
  // gehen nach der Lage, aber nach verschiedenen - und damit bleibt die
  // Ordnungspruefung fuer die Lage-Modi erhalten, statt ersatzlos zu
  // verschwinden.
  if (strecken.nah >= strecken.vorn) {
    problems.push(
      `Ziellogik "nah" wirkt nicht: sie visiert Gegner nach ${strecken.nah.toFixed(0)} ` +
      `Weltpunkten an, "vorn" nach ${strecken.vorn.toFixed(0)} - der naechste Gegner ist `
      + 'im Mittel weniger weit gekommen als der vorderste.',
    );
  }
  // **Und "Gefahr" muss den Schildtraeger nehmen, auch neben einem Titanen.**
  //
  // Das ist die Aufgabe, die der Modus seit v223 hat, und sie ist die
  // einzige, die kein anderer erfuellt: der Traeger ist weder der vorderste
  // noch der naechste noch der wundeste, und seine 52 Lebenspunkte sind
  // unauffaellig - aber solange er lebt, laedt er die Schilde des ganzen
  // Pulks nach (G5).
  //
  // Gestellt statt abgewartet: ein Turm, ein Titan mit 682 Lebenspunkten und
  // ein Traeger, beide in Reichweite. Ohne den Zuschlag nimmt der Modus den
  // Titanen - das ist die Gegenprobe.
  {
    state.reset(777, 'normal', 'farnkessel');
    state.gold = 99999;
    const sp = candidateSpots(state)[0];
    if (!state.build(sp.x, sp.y, 'arrow')) throw new Error('Gefahr: kein Turm setzbar.');
    const turm = ersterTurm(state);
    turm.zielwahl = 'stark';
    const bahn = state.lanes[0];
    let beste = 0, dm = Infinity;
    for (let t = 0; t <= bahn.length; t += 5) {
      const q = bahn.at(t);
      const d = Math.hypot(q.x - turm.x, q.y - turm.y);
      if (d < dm) { dm = d; beste = t; }
    }
    const titan = state.spawnZumPruefen('titan', 0);
    const traeger = state.spawnZumPruefen('infantry', 2, 2);
    if (!titan || !traeger) throw new Error('Gefahr: Gegner nicht setzbar.');
    titan.travelled = beste;
    traeger.travelled = beste - 30;
    state.update(1 / 60);
    const ziel = turm.target;
    if (!ziel) {
      problems.push('Ziellogik "Gefahr": der Turm hat gar kein Ziel gefasst - dann sagt '
        + 'die Pruefung nichts (Regel 3).');
    } else if (ziel !== traeger) {
      problems.push(`Ziellogik "Gefahr" nimmt "${ziel.def}" statt den `
        + 'Schildtraeger. Der Traeger haelt den ganzen Pulk am Leben - ihn stehen zu '
        + 'lassen ist der teuerste Fehler, den die Ziellogik machen kann.');
    }
  }
  // Und die Einstellung muss den Spielstand ueberleben.
  {
    state.reset(999, 'normal', 'spiralhain');
    state.gold = 99999;
    const sp = candidateSpots(state)[0];
    state.build(sp.x, sp.y, 'arrow');
    ersterTurm(state).zielwahl = 'schwach';
    const stand = state.snapshot();
    const zweit = new GameState();
    if (!zweit.restore(stand)) {
      problems.push('Ziellogik: der Spielstand liess sich nicht zurueckladen.');
    } else if (ersterTurm(zweit)?.zielwahl !== 'schwach') {
      problems.push(
        `Ziellogik ueberlebt das Sichern nicht: gespeichert "schwach", geladen ` +
        `"${ersterTurm(zweit)?.zielwahl}".`,
      );
    }
  }
}

// Die Zielunit: sie steht, sie schiesst, und man wird sie nicht los.
//
// Drei Zusagen, und alle drei koennte man mit einer Zeile brechen, ohne dass
// etwas anderes rot wuerde. Sie zu verkaufen hiesse, die Partie zu
// verkaufen - und der Spieler bekaeme dafuer auch noch Gold.
{
  const { candidateSpots } = await import('./spots');
  const g = new GameState();
  g.reset(4242, 'normal', 'spiralhain');
  const core = g.towers.find((t) => t.def === 'core');
  if (!core) {
    problems.push('Zielunit: nach dem Zuruecksetzen steht keine im Feld.');
  } else {
    // Verkaufen: muss folgenlos bleiben, und zwar OHNE Gutschrift.
    const goldVorher = g.gold;
    g.sell(core);
    if (!g.towers.includes(core)) problems.push('Zielunit: sie liess sich verkaufen.');
    if (g.gold !== goldVorher) {
      problems.push(`Zielunit: das Verkaufen hat ${g.gold - goldVorher} Gold gebracht.`);
    }
    // Versetzen: ebenfalls nicht - die Bahnen enden dort, wo sie steht.
    const sp = candidateSpots(g)[0];
    if (g.moveTower(core, sp.x, sp.y)) problems.push('Zielunit: sie liess sich versetzen.');

    // Sie zaehlt nicht als gebauter Turm.
    if (g.gebaute.includes(core)) {
      problems.push('Zielunit: sie zaehlt als gebauter Turm - die Einweisung gaelte sofort als erledigt.');
    }

    // Und sie schiesst. Ohne einen einzigen eigenen Turm.
    g.gold = 0;
    g.waveIndex = 8;
    g.startWave();
    for (let i = 0; i < 60 * 90 && g.phase === 'playing'; i++) g.update(1 / 60);
    if (core.damageDone <= 0) {
      problems.push('Zielunit: sie hat in einer ganzen Welle keinen Schaden gemacht - '
        + 'sie steht nur da.');
    }
  }
}

// Der Ausbau der Zielunit muss WIRKEN - sonst ist er nur eine Rechnung.
//
// Gemessen wird an dem, was sie ausrichtet, nicht daran, dass sich die Zahl
// im Menue aendert (Regel 13): dieselbe Welle, einmal auf Stufe 1 und einmal
// voll ausgebaut, ohne einen einzigen anderen Turm.
{
  const lauf = (stufe: number): { schaden: number; bezahlt: number } => {
    const g = new GameState();
    g.reset(4242, 'normal', 'spiralhain');
    const core = g.towers.find((t) => t.def === 'core')!;
    g.gold = 99999;
    let bezahlt = 0;
    while (core.level < stufe) {
      const v = g.gold;
      if (!g.upgrade(core)) break;
      bezahlt += v - g.gold;
    }
    if (core.level !== stufe) problems.push(`Zielunit: Ausbau auf Stufe ${stufe} misslungen.`);
    g.gold = 0;
    g.waveIndex = 8;
    g.startWave();
    for (let i = 0; i < 60 * 90 && g.phase === 'playing'; i++) g.update(1 / 60);
    return { schaden: core.damageDone, bezahlt };
  };
  const eins = lauf(1), sechs = lauf(6);
  console.log(`  Zielunit: Stufe 1 macht ${eins.schaden.toFixed(0)} Schaden, `
    + `voll ausgebaut ${sechs.schaden.toFixed(0)} fuer ${sechs.bezahlt} Gold.`);
  if (sechs.bezahlt <= 0) problems.push('Zielunit: der Ausbau hat nichts gekostet.');
  // Anteilig, nicht absolut (Regel 2): wer die Werte anhebt, hebt beide.
  if (sechs.schaden < eins.schaden * 4) {
    problems.push(`Zielunit: voll ausgebaut macht sie ${sechs.schaden.toFixed(0)} Schaden gegen `
      + `${eins.schaden.toFixed(0)} auf Stufe 1 - fuer ${sechs.bezahlt} Gold muss mehr `
      + 'herauskommen als das Vierfache.');
  }
}

// Laesst sich ein Turm versetzen - und zwar nur, wenn er darf?
//
// Zwei Behauptungen, und die zweite ist die wichtigere. Ein Versetzen
// waehrend der Welle waere keine Korrektur mehr, sondern eine neue Mechanik:
// man schoebe den Turm dorthin, wo es gerade brennt. Das haette die Balance
// verschoben, ohne dass eine einzige Zahl angefasst wurde.
{
  const { candidateSpots } = await import('./spots');
  state.reset(777, 'normal', 'spiralhain');
  state.gold = 99999;
  const plaetze = candidateSpots(state);
  state.build(plaetze[0].x, plaetze[0].y, 'arrow');
  const turm = ersterTurm(state);

  if (!turm) {
    problems.push('Versetzen: es liess sich kein Turm zum Pruefen bauen.');
  } else {
    // Zwischen den Wellen: muss gehen.
    const frei = plaetze.find((p) => state.canPlace('arrow', p.x, p.y, turm)
      && Math.hypot(p.x - turm.x, p.y - turm.y) > 1);
    if (!frei) {
      problems.push('Versetzen: kein zweiter freier Platz zum Pruefen gefunden.');
    } else if (!state.moveTower(turm, frei.x, frei.y)) {
      problems.push('Versetzen: zwischen den Wellen abgelehnt, obwohl es gehen muesste.');
    } else if (Math.round(turm.x) !== Math.round(frei.x)) {
      problems.push('Versetzen: gemeldet als erledigt, aber der Turm steht noch am alten Ort.');
    }

    // Auf den Weg: muss abgelehnt werden.
    const auf = state.lanes[0].at(state.lanes[0].length * 0.5);
    const vorher = { x: turm.x, y: turm.y };
    if (state.moveTower(turm, auf.x, auf.y)) {
      problems.push('Versetzen: ein Turm liess sich mitten auf den Weg stellen.');
    } else if (turm.x !== vorher.x || turm.y !== vorher.y) {
      problems.push('Versetzen: abgelehnt, aber der Turm ist trotzdem gewandert.');
    }

    // Waehrend der Welle: muss abgelehnt werden.
    state.startWave();
    const zurueck = plaetze.find((p) => state.canPlace('arrow', p.x, p.y, turm)
      && Math.hypot(p.x - turm.x, p.y - turm.y) > 1);
    if (zurueck && state.moveTower(turm, zurueck.x, zurueck.y)) {
      problems.push('Versetzen: waehrend einer laufenden Welle erlaubt - das ist keine Korrektur mehr.');
    }
  }
}

// Die kurze Einfuehrung je Karte: gibt es sie fuer JEDE Karte, und nennt
// sie die Karte beim Namen?
//
// Der Text wird abgeleitet, nicht je Karte geschrieben - deshalb ist die
// interessante Frage nicht "steht da ein Satz", sondern "steht da ein Satz
// fuer die vierte Karte, die es noch nicht gibt". Diese Pruefung laeuft ueber
// alle vorhandenen und faellt in dem Moment aus, in dem eine hinzukommt, fuer
// die die Ableitung nicht traegt.
{
  const { MAPS } = await import('../src/data/maps');
  const { kartenEinfuehrung } = await import('../src/game/tutorial');
  for (const m of MAPS) {
    state.reset(1, 'normal', m.id);
    const kette = kartenEinfuehrung(state);
    if (kette.length !== 1) {
      problems.push(`Karteneinfuehrung ${m.name}: ${kette.length} Schritte statt genau einem.`);
      continue;
    }
    const [schritt] = kette;
    if (!schritt.text.includes(m.name)) {
      problems.push(`Karteneinfuehrung ${m.name}: nennt die Karte nicht beim Namen.`);
    }
    if (schritt.text.length > 160) {
      problems.push(`Karteneinfuehrung ${m.name}: ${schritt.text.length} Zeichen - das ist keine kurze mehr.`);
    }
    if (schritt.done(state)) {
      problems.push(`Karteneinfuehrung ${m.name}: gilt sofort als erledigt und erscheint nie.`);
    }
  }
}

// Schluckt der Schild wirklich Treffer - und nur die ersten n?
//
// Gemessen am Lebensstand, nicht daran, dass das Feld gesetzt ist. Ein
// Schild, der im Datensatz steht und im Kampf nichts tut, sieht von aussen
// aus wie ein eingebauter Schild.
{
  const { MAPS } = await import('../src/data/maps');
  // Auf der EINSTIEGSKARTE, nicht irgendwo.
  //
  // "Irgendwo ein Schild" war die erste Fassung, und die Gegenprobe hat sie
  // sofort erledigt: sie nahm den Schild aus dem Spiralhain, die Frostspalte
  // behielt ihren, und die Pruefung blieb gruen. Eine Mechanik, die man erst
  // auf der dritten Karte kennenlernt, lernt man zu spaet - und eine
  // Pruefung, die das durchgehen laesst, prueft das Falsche.
  const start = MAPS[0];
  const aufStart = start.waves.reduce(
    (a, w) => a + w.groups.filter((g) => g.shield).reduce((b, g) => b + g.count, 0), 0);
  if (aufStart === 0) {
    problems.push(
      `Schild: auf ${start.name} traegt keine Wellengruppe einen - dort lernt man ihn kennen.`,
    );
  }

  state.reset(31, 'normal', 'spiralhain');
  const e = state.spawnZumPruefen('infantry', 3);
  if (!e) {
    problems.push('Schild: es liess sich kein Gegner zum Pruefen setzen.');
  } else {
    const voll = e.hp;
    state.trefferZumPruefen(e, 9999);
    if (e.hp !== voll) problems.push('Schild: der erste Treffer ging durch.');
    if (e.shield !== 2) problems.push(`Schild: nach einem Treffer ${e.shield} statt 2 uebrig.`);
    state.trefferZumPruefen(e, 9999);
    state.trefferZumPruefen(e, 9999);
    if (e.shield !== 0) problems.push('Schild: haelt laenger als die vorgesehenen Treffer.');
    if (e.hp !== voll) problems.push('Schild: einer der drei Treffer ging trotzdem durch.');
    // Und jetzt der vierte - der MUSS ankommen.
    //
    // Er fehlte im ersten Anlauf, und die Pruefung meldete prompt "schluckt
    // auch noch, nachdem er aufgebraucht ist". Der Schild war in Ordnung;
    // die Pruefung hatte drei Treffer gegen drei Schildpunkte gesetzt und
    // sich dann gewundert, dass nichts durchkam.
    state.trefferZumPruefen(e, 9999);
    if (e.hp === voll) problems.push('Schild: schluckt auch noch, nachdem er aufgebraucht ist.');
  }
}

// Der Schildtraeger: laedt er die Nachbarn nach - und sich selbst NICHT?
//
// Beide Haelften zaehlen. Ein Traeger, der sich selbst versorgt, waere ein
// unsterblicher Einzelgaenger, und die Zielreihenfolge waere wieder egal:
// man koennte ihn stehen lassen und den Rest raeumen. Genau das soll G5
// verhindern.
{
  const { MAPS } = await import('../src/data/maps');
  const start = MAPS[0];
  const imPlan = start.waves.reduce(
    (a, w) => a + w.groups.filter((g) => g.traeger).reduce((b, g) => b + g.count, 0), 0);
  if (imPlan === 0) {
    problems.push(`Schildtraeger: auf ${start.name} kommt keiner vor - die Mechanik ist tot.`);
  }

  state.reset(77, 'normal', 'spiralhain');
  const t = state.spawnZumPruefen('infantry', 0, 2);
  const n = state.spawnZumPruefen('crawler', 0, 0);
  if (!t || !n) {
    problems.push('Schildtraeger: es liessen sich keine zwei Gegner zum Pruefen setzen.');
  } else {
    n.x = t.x + 40; n.y = t.y;
    // Weit genug fuer mehrere Takte.
    for (let i = 0; i < 60 * 6; i++) state.update(1 / 60);
    if (n.shield <= 0) {
      problems.push('Schildtraeger: der Nachbar hat nach sechs Sekunden immer noch keinen Schild.');
    }
    if (n.shield > 2) {
      problems.push(`Schildtraeger: gibt ${n.shield} Schild statt hoechstens 2.`);
    }
    if (t.shield > 0) {
      problems.push('Schildtraeger: versorgt sich selbst - dann muss man ihn nicht zuerst nehmen.');
    }

    // Und ausser Reichweite darf nichts ankommen.
    const fern = state.spawnZumPruefen('crawler', 0, 0);
    if (fern) {
      fern.x = t.x + 600; fern.y = t.y;
      for (let i = 0; i < 60 * 4; i++) state.update(1 / 60);
      if (fern.shield > 0) {
        problems.push('Schildtraeger: wirkt ueber das ganze Feld statt in seinem Umkreis.');
      }
    }
  }
}

// Bollwerk (R4): haelt es wirklich AUF, und toetet es wirklich NICHT?
//
// Beide Haelften zaehlen, und zwar getrennt. Ein "Halt", der nebenbei
// Schaden macht, ist ein Meteor mit Bremse; eine Bremse, die nicht auf null
// geht, ist der Frostschlag. R4 verlangt genau die Mitte davon.
//
// Gemessen wird an der zurueckgelegten Strecke, nicht am Tempowert. Der
// Tempowert ist das, was der Code setzt - die Strecke ist das, was der
// Spieler sieht. Waere `slowFactor` gesetzt, aber irgendwo nicht angewandt,
// meldete eine Pruefung auf den Wert nichts.
{
  state.reset(91, 'normal', 'spiralhain', { karten: ALLE_KARTEN.length });
  const drin = state.spawnZumPruefen('crawler', 0);      // slowResist 0
  const zaeh = state.spawnZumPruefen('titan', 0);        // slowResist 0.55
  const raus = state.spawnZumPruefen('crawler', 0);
  if (!drin || !zaeh || !raus) {
    problems.push('Bollwerk: es liessen sich keine Gegner zum Pruefen setzen.');
  } else {
    const R = ABILITIES.bollwerk.radius ?? 150;
    zaeh.x = drin.x + 20; zaeh.y = drin.y;
    raus.x = drin.x + R * 3; raus.y = drin.y;
    const hpVorher = drin.hp;
    const weg = (e: { travelled: number }) => e.travelled;
    const s0 = weg(drin), z0 = weg(zaeh), f0 = weg(raus);

    state.abilityCd.bollwerk = 0;
    if (!state.cast('bollwerk', drin.x, drin.y)) {
      problems.push('Bollwerk: liess sich nicht ausloesen.');   // Regel 3
    }
    for (let i = 0; i < 60 * 2; i++) state.update(1 / 60);

    if (weg(drin) - s0 > 1) {
      problems.push(`Bollwerk: der Gegner im Umkreis lief ${(weg(drin) - s0).toFixed(1)} weiter - es haelt nicht auf.`);
    }
    if (weg(zaeh) - z0 <= 1) {
      problems.push('Bollwerk: der Leerentitan steht genauso still wie der Schleicher - der Widerstand wirkt nicht.');
    }
    if (weg(raus) - f0 <= 1) {
      problems.push('Bollwerk: auch ausserhalb des Umkreises steht alles - es wirkt aufs ganze Feld.');
    }
    if (drin.hp < hpVorher) {
      problems.push('Bollwerk: macht Schaden. Dann haelt es nicht auf, sondern toetet langsamer.');
    }
    if (state.ready('bollwerk')) {
      problems.push('Bollwerk: ist sofort wieder bereit - die Abklingzeit greift nicht.');
    }
  }
}

// Ernte (C17): bringt sie Gold, und laesst sie das Feld in Ruhe?
//
// Die zweite Haelfte ist die wichtigere. Eine Faehigkeit, die Gold bringt UND
// etwas auf dem Feld tut, waere keine Entscheidung mehr - man zoege sie
// immer. Der Sinn ist der Verzicht.
{
  state.reset(92, 'normal', 'spiralhain', { karten: ALLE_KARTEN.length });
  const zeuge = state.spawnZumPruefen('infantry', 0);
  const goldVorher = state.gold;
  const hpVorher = zeuge ? zeuge.hp : 0;
  const anzahlVorher = state.enemies.filter((e) => !e.dead).length;

  state.abilityCd.ernte = 0;
  if (!state.cast('ernte', 0, 0)) {
    problems.push('Ernte: liess sich nicht ausloesen.');       // Regel 3
  }
  const erwartet = ABILITIES.ernte.gold ?? 0;
  if (erwartet <= 0) {
    problems.push('Ernte: ist gar kein Goldbringer mehr - `gold` ist nicht gesetzt.');
  }
  if (state.gold - goldVorher !== erwartet) {
    problems.push(`Ernte: bringt ${state.gold - goldVorher} Gold statt ${erwartet}.`);
  }
  if (zeuge && zeuge.hp < hpVorher) {
    problems.push('Ernte: macht Schaden. Dann ist sie keine Entscheidung gegen Schaden mehr.');
  }
  if (state.enemies.filter((e) => !e.dead).length !== anzahlVorher) {
    problems.push('Ernte: raeumt das Feld ab, statt nur Gold zu bringen.');
  }
  if (state.ready('ernte')) {
    problems.push('Ernte: ist sofort wieder bereit - die Abklingzeit greift nicht.');
  }
}

// Beide neuen Faehigkeiten muessen ueber das Sichern kommen. Die Abklingzeit
// ist Teil des Spielstands; faellt sie beim Laden auf null, waere Sichern und
// Laden ein Weg, sie zu umgehen.
{
  state.reset(93, 'normal', 'spiralhain', { karten: ALLE_KARTEN.length });
  state.abilityCd.bollwerk = 0; state.abilityCd.ernte = 0;
  state.cast('bollwerk', state.goal.x, state.goal.y);
  state.cast('ernte', 0, 0);
  const vorher = { b: state.abilityCd.bollwerk, e: state.abilityCd.ernte };
  if (vorher.b <= 0 || vorher.e <= 0) {
    problems.push('Faehigkeiten: nach dem Ausloesen laeuft keine Abklingzeit.');
  }
  const stand = state.snapshot();
  state.reset(93, 'normal', 'spiralhain', { karten: ALLE_KARTEN.length });
  if (!state.restore(stand)) {
    problems.push('Faehigkeiten: der Spielstand liess sich nicht zurueckladen.');
  }
  if (Math.abs(state.abilityCd.bollwerk - vorher.b) > 0.01
    || Math.abs(state.abilityCd.ernte - vorher.e) > 0.01) {
    problems.push('Faehigkeiten: die Abklingzeit von Bollwerk oder Ernte ueberlebt das Laden nicht.');
  }
}

// Das Tor (C24): sperrt es wirklich, und lenkt es wirklich um?
//
// Nach Regel 13 zaehlt nicht, dass die Sperre haelt - das waere auch dann
// gruen, wenn nie jemand ins Sperrfenster faellt. Gezaehlt wird der
// UNTERSCHIED zur Verteilung ohne Tor, und die ist ausrechenbar: die Bahnen
// werden reihum bedient, jede bekommt also ihren Drittelanteil. Liegt die
// gesperrte Bahn darunter, hat das Tor umgelenkt.
{
  const { MAPS } = await import('../src/data/maps');
  const karte = MAPS.find((m) => m.tor);
  if (!karte) {
    problems.push('Keine Karte traegt ein Tor - C24 ist nicht umgesetzt.');
  } else {
    const tor = karte.tor!;
    if (tor.bahn >= karte.lanes.length) {
      problems.push(`Tor auf ${karte.id}: Bahn ${tor.bahn}, die Karte hat nur ${karte.lanes.length}.`);
    }
    /** Mehrere Wellen, einmal MIT und einmal OHNE Tor.
     *
     *  Ueber MEHRERE, nicht ueber eine: der erste Entwurf pruefte Welle 7 -
     *  und dort faellt zufaellig kein Gegner der Torbahn ins Sperrfenster,
     *  weil die Welle nach gut acht Sekunden durch ist. Gemessen ueber alle
     *  fuenfzehn werden 11 von 71 umgelenkt, und zwar fast nur in den spaeten,
     *  langen Wellen. Das ist die Sache selbst: kurze Wellen enden im ersten
     *  offenen Fenster, lange kreuzen den Takt - das Tor wird wichtig, wenn
     *  die Wellen lang werden, also wenn Abdeckung ohnehin die Frage ist. */
    const aufTorbahn = (): number => {
      let summe = 0;
      for (let w = 8; w < karte.waves.length; w++) {
        state.reset(31, 'normal', karte.id);
        state.waveIndex = w;
        state.startWave();
        for (let i = 0; i < 60 * 120 && state.waveActive; i++) state.update(DT);
        summe += state.spawnsJeBahn[tor.bahn] ?? 0;
        if (state.spawnsTrotzSperre > 0) {
          problems.push(`Tor: Welle ${w + 1} laesst ${state.spawnsTrotzSperre} Gegner `
            + 'erscheinen, obwohl ihre Bahn gesperrt ist.');
        }
      }
      return summe;
    };

    const mit = aufTorbahn();
    // Wirklich abschalten, nicht ausrechnen (Regel 13).
    //
    // Der erste Entwurf verglich gegen den idealen Drittelanteil - bei 22
    // Gegnern auf drei Bahnen sind das 7,33, waehrend reihum 7 herauskommen.
    // Sieben ist kleiner als 7,33, also meldete die Pruefung "umgelenkt",
    // auch als die Gegenprobe das Tor ganz abgeschaltet hatte. Ein
    // gerechneter Ersatz fuer den Vergleichslauf ist kein Vergleichslauf.
    const echtesTor = karte.tor;
    let ohne: number;
    try {
      (karte as { tor?: unknown }).tor = undefined;
      ohne = aufTorbahn();
    } finally {
      (karte as { tor?: unknown }).tor = echtesTor;
    }

    if (ohne < 10) {
      problems.push(`Tor: nur ${ohne} Gegner auf der Torbahn - zu wenig fuer eine Aussage.`);
    }
    if (mit >= ohne) {
      problems.push(
        `Tor: die gesperrte Bahn bekommt mit Tor ${mit} Gegner, ohne Tor ${ohne} - `
        + 'es wird nichts umgelenkt.',
      );
    }
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
      // Nach 2700 Bildern darf nichts mehr im Aufbau sein. Gefragt wird nur
      // nach dem Aufbau, NICHT nach Bildern: der Rauchtest laeuft in jsdom
      // ohne Bilddekoder, dort kommt nie eines an. "Noch nicht fertig" und
      // "kann hier gar nicht fertig werden" sehen gleich aus und bedeuten
      // Gegensaetzliches.
      const offen = renderer.imAufbau(state);
      if (offen.length) {
        throw new Error(`nach 45 Sekunden noch nicht fertig: ${offen.join(', ')}`);
      }
    });
  }
}

// Der Neustart muss ebenfalls durchlaufen. Der Endbildschirm wird nicht mehr
// hier gezeichnet: er liegt seit v43 auf der Leinwand, und seit v196 gibt es
// die HTML-Fassung nicht mehr. Abgenommen wird er als `menu-sieg` in
// `npm run bildtor`, und das Browsertor faehrt ihn mit der Maus an.
step('Neustart', () => {
  state.reset();
  for (let i = 0; i < 120; i++) { state.update(DT); renderer.draw(state); ui.sync(); }
});
step('Groessenwechsel', () => {
  sizeCanvas(canvas, 1440, 780);
  renderer.resize();
  renderer.draw(state);
});

// --- Einrasten und Begruendung.
//
// Beides ist neu in v125 und beides betrifft genau die Beschwerde, mit der
// die Runde anfing: "an manchen Stellen kann man gar nicht hinbauen, man muss
// ganz gross reinzoomen". Der Grund war, dass der Tippunkt WOERTLICH galt -
// zwei Punkte zu nah am Weg, und es geschah gar nichts.
//
// Geprueft wird beides an einer Stelle, von der bekannt ist, dass dort nicht
// gebaut werden darf: der Wegmitte. Regel 13 - erst nachweisen, dass die
// Stelle wirklich gesperrt ist, sonst prueft der Test nichts.
step('Einrasten', () => {
  const probe = new GameState();
  probe.reset();
  const lane = probe.lanes[0];
  const p = lane.at(lane.length * 0.5);

  const grund = probe.warumNicht('arrow', p.x, p.y);
  if (grund !== 'Weg') {
    throw new Error(`Die Wegmitte gilt nicht als Weg, sondern als "${grund}" - `
      + 'die Probe misst nicht, was sie messen soll.');
  }
  if (probe.canPlace('arrow', p.x, p.y)) {
    throw new Error('Auf der Wegmitte darf gebaut werden - dann prueft das Einrasten nichts.');
  }

  // Ohne Radius bleibt es bei der Ablehnung: das Einrasten darf nicht
  // heimlich immer etwas finden.
  if (probe.einrasten('arrow', p.x, p.y, 0) !== null) {
    throw new Error('Einrasten mit Radius 0 findet trotzdem einen Platz.');
  }

  // Mit Fingerbreite muss es einen finden - und der muss erlaubt sein.
  const ziel = probe.einrasten('arrow', p.x, p.y, 220);
  if (!ziel) throw new Error('Einrasten findet neben dem Weg keinen Platz.');
  if (!probe.canPlace('arrow', ziel.x, ziel.y)) {
    throw new Error('Einrasten liefert einen Platz, auf dem nicht gebaut werden darf.');
  }
  if (Math.hypot(ziel.x - p.x, ziel.y - p.y) > 220 + 1) {
    throw new Error('Einrasten springt weiter als der Radius erlaubt.');
  }

  // Zweimal dasselbe Ergebnis - sonst waere es im Determinismus-Tor ein
  // Wackelkandidat und im Spiel unheimlich.
  const nochmal = probe.einrasten('arrow', p.x, p.y, 220);
  if (!nochmal || nochmal.x !== ziel.x || nochmal.y !== ziel.y) {
    throw new Error('Einrasten liefert bei gleicher Lage zwei verschiedene Plaetze.');
  }

  // Und die zweite Begruendung: neben einem Turm sperrt der Turm.
  probe.build(ziel.x, ziel.y, 'arrow');
  if (probe.warumNicht('arrow', ziel.x, ziel.y) !== 'Turm') {
    throw new Error('Ein besetzter Platz nennt nicht "Turm" als Grund.');
  }
});

// --- Der Kartenzug liegt ZWISCHEN den Wellen (v303, S-N1-02).
//
// Die dritte Abnahme der Story, woertlich: "Der Zug unterbricht die Welle
// nicht - er liegt zwischen den Wellen." Ein Zug mitten im Gefecht waere eine
// Entscheidung unter Zeitdruck, und Zeitdruck ist hier schon die Welle selbst.
//
// Geprueft wird die ABLEITUNG `zugFaellig()`, nicht der Zeichenweg: sie ist
// die eine Stelle, an der die Frage beantwortet wird, und die Oberflaeche
// fragt dieselbe (Regel 6). Jede Bedingung einzeln, jede mit ihrer Nullprobe -
// sonst pruefte die Reihe nur, dass die Ableitung immer falsch zurueckgibt.
step('Der Kartenzug liegt zwischen den Wellen', async () => {
  const { KARTENSTAPEL } = await import('../src/data/karten');
  const probe = new GameState();
  probe.reset();
  probe.phase = 'playing';

  if (!probe.zugFaellig()) {
    throw new Error('Zwischen zwei Wellen steht kein Zug an - dann faellt die '
      + 'Entscheidung der Welle aus.');
  }
  if (probe.angeboteneKarten().length !== 3) {
    throw new Error(`Der Zug bietet ${probe.angeboteneKarten().length} Karten statt drei.`);
  }

  // **Erstens: waehrend einer Welle nicht.**
  probe.wellenZumPruefen([0]);
  if (probe.zugFaellig()) {
    throw new Error('Waehrend einer laufenden Welle steht ein Zug an. Dann unterbricht '
      + 'er die Welle, statt zwischen den Wellen zu liegen.');
  }
  const vorher = probe.genommeneKarten.length;
  probe.karteNehmen(probe.angeboteneKarten()[0].id);
  if (probe.genommeneKarten.length !== vorher) {
    throw new Error('Waehrend einer laufenden Welle laesst sich trotzdem eine Karte '
      + 'nehmen - die Ableitung sagt nein, und der Griff hoert nicht auf sie.');
  }
  probe.wellenZumPruefen([]);
  if (!probe.zugFaellig()) {
    throw new Error('Nach dem Ende der Welle steht kein Zug an - dann prueft die Zeile '
      + 'darueber nichts, sie schaltet den Zug nur ab.');
  }

  // **Zweitens: nur eine Karte je Welle.**
  const k = probe.angeboteneKarten()[0];
  probe.karteNehmen(k.id);
  if (probe.genommeneKarten.length !== 1) {
    throw new Error('Zwischen zwei Wellen laesst sich keine Karte nehmen.');
  }
  if (probe.zugFaellig()) {
    throw new Error('Nach dem Ziehen steht der Zug weiter an - dann zieht man in '
      + 'derselben Welle beliebig oft.');
  }

  // **Drittens: nur aus dem, was angeboten wird.** Ohne diese Regel waere die
  // Wahl aus dreien eine Wahl aus zwoelf.
  probe.waveIndex = 1;
  const nichtImAngebot = KARTENSTAPEL
    .find((x) => !probe.angeboteneKarten().some((a) => a.id === x.id));
  if (!nichtImAngebot) throw new Error('Alle Karten stehen im Angebot - die Probe misst nichts.');
  const stand = probe.genommeneKarten.length;
  probe.karteNehmen(nichtImAngebot.id);
  if (probe.genommeneKarten.length !== stand) {
    throw new Error(`Die Karte "${nichtImAngebot.id}" laesst sich nehmen, obwohl sie `
      + 'gar nicht angeboten wird. Dann ist die Wahl aus dreien eine aus zwoelf.');
  }
  // Nullprobe: eine ANGEBOTENE geht weiterhin.
  probe.karteNehmen(probe.angeboteneKarten()[0].id);
  if (probe.genommeneKarten.length !== stand + 1) {
    throw new Error('Auch eine angebotene Karte laesst sich nicht nehmen - dann prueft '
      + 'die Zeile darueber nichts.');
  }

  // **Viertens: im Menue nie** (Regel 6).
  probe.phase = 'won';
  if (probe.zugFaellig()) {
    throw new Error('Auf dem Ergebnisbildschirm steht ein Kartenzug an. Im Menue ist '
      + 'keine Spielbedienung sichtbar, niemals (Regel 6).');
  }
});

// --- Der Lauf ueberlebt einen Neustart (v302, S-N1-01).
//
// Die erste Abnahme der Story: "Ein unterbrochener Lauf laesst sich
// fortsetzen, auch ueber einen Neustart." Der Lauf liegt in einer EIGENEN
// Ablage und nicht im Spielstand der Partie - zwischen zwei Abschnitten gibt
// es keine Partie, und ein Lauf, der nur dort stuende, waere in genau diesem
// Augenblick weg.
//
// Geprueft wird beides: dass er wiederkommt, und dass ein Stand, den niemand
// verstehen kann, GAR NICHT gelesen wird statt halb. Der Preis ist ein
// verlorener Lauf, der Gegenwert ein Zustand, den niemand erraten muss.
step('Der Lauf ueberlebt einen Neustart', async () => {
  const { laufStarten, abschnittGeschafft, laufSpeichern, laufLaden, laufLoeschen,
    laufendeKarte, istLaufZuEnde, wellenDesLaufs } = await import('../src/game/lauf');

  laufLoeschen();
  if (laufLaden() !== null) throw new Error('Eine leere Ablage liefert einen Lauf.');

  let lauf = laufStarten('normal', 4242);
  if (laufendeKarte(lauf) !== ALLE_KARTEN[0].id) {
    throw new Error(`Ein frischer Lauf faengt nicht auf der ersten Karte an `
      + `(${laufendeKarte(lauf)}).`);
  }
  // Einen Abschnitt abschliessen - Gold, Kristall und Wellen gehen mit.
  lauf = abschnittGeschafft(lauf, 777, 31, ALLE_KARTEN[0].waves.length);
  laufSpeichern(lauf);

  const zurueck = laufLaden();
  if (!zurueck) throw new Error('Ein gespeicherter Lauf kommt nicht zurueck.');
  if (zurueck.abschnitt !== 1 || zurueck.gold !== 777 || zurueck.kristall !== 31) {
    throw new Error(`Der geladene Lauf steht anders da als der gespeicherte `
      + `(Abschnitt ${zurueck.abschnitt}, Gold ${zurueck.gold}, `
      + `Kristall ${zurueck.kristall}).`);
  }
  if (zurueck.welleGesamt !== ALLE_KARTEN[0].waves.length) {
    throw new Error(`Der Wellenzaehler des Laufs steht nach einem Abschnitt auf `
      + `${zurueck.welleGesamt} statt auf ${ALLE_KARTEN[0].waves.length}. Ohne ihn faengt der `
      + 'zweite Abschnitt am flachen Anfang der Lebenskurve wieder an.');
  }
  if (wellenDesLaufs(zurueck) !== ALLE_KARTEN.reduce((a, m) => a + m.waves.length, 0)) {
    throw new Error('Die Wellenzahl des Laufs stimmt nicht mit den Karten ueberein.');
  }

  // **Gar nicht lesen statt falsch lesen** - vier gestellte Faelle.
  const kaputt: [string, string][] = [
    ['aeltere Fassung', JSON.stringify({ ...zurueck, v: 0 })],
    ['unbekannte Karte', JSON.stringify({ ...zurueck, abschnitte: ['gibtesnicht'] })],
    ['Abschnitt hinter dem Ende', JSON.stringify({ ...zurueck, abschnitt: 99 })],
    ['kein JSON', '{'],
  ];
  for (const [was, roh] of kaputt) {
    localStorage.setItem('towerfront.lauf-zustand', roh);
    if (laufLaden() !== null) {
      throw new Error(`Ein Lauf mit dem Fehler "${was}" wird gelesen statt verworfen. `
        + 'Ein halb verstandener Zustand ist schlimmer als keiner.');
    }
  }

  // Und die Nullprobe: der HEILE Stand muss danach weiterhin gelesen werden -
  // sonst prueft die Schleife oben nur, dass `laufLaden` immer null gibt.
  laufSpeichern(zurueck);
  if (laufLaden() === null) {
    throw new Error('Auch der heile Lauf wird verworfen - dann prueft die Ablage '
      + 'nichts, sie lehnt nur ab.');
  }

  // Am Ende der Abschnitte ist der Lauf zu Ende, nicht vorher.
  let ende = zurueck;
  while (!istLaufZuEnde(ende)) ende = abschnittGeschafft(ende, 0, 0, 1);
  if (ende.abschnitt !== ende.abschnitte.length) {
    throw new Error('Ein Lauf endet nicht am letzten Abschnitt.');
  }
  laufLoeschen();
});

// --- Die Abschnittswahl (v305, S-N1-03).
//
// Drei Zusagen, die kein Bild und keine Simulation fangen kann:
//
// 1. **Das Angebot ist eine reine Funktion aus Aussaat und Abschnitt.** Ein
//    Lauf, der an der Grenze gesichert und spaeter geladen wird, findet
//    dasselbe Angebot vor - sonst waere "spaeter fortsetzen" eine andere
//    Wahl als die, vor der man stand. Das ist die dritte Abnahme der Story.
// 2. **Ein Angebot, das es nicht gibt, aendert nichts.** Sonst waere der
//    Lauf ueber die Ablage zu stellen: eine Kennung mit `druck` 0,1
//    hineingeschrieben, und der Abschnitt ist geschenkt.
// 3. **Die Wahl setzt Karte UND Auflage.** Beides zusammen ist das Angebot;
//    wer nur die Karte uebernaehme, liesse den sichtbaren Handel fallen.
step('Die Abschnittswahl ist reproduzierbar und geprueft', async () => {
  const { laufStarten, abschnittGeschafft, abschnittsWahl, abschnittWaehlen,
    laufSpeichern, laufLaden, laufLoeschen, laufendeKarte, WAHLARTEN,
    ANGEBOTE_JE_WAHL } = await import('../src/game/lauf');

  laufLoeschen();
  const frisch = laufStarten('normal', 4242);
  if (abschnittsWahl(frisch).length) {
    throw new Error('Ein frischer Lauf haelt schon eine Wahl offen. Gewaehlt wird '
      + 'NACH einem Abschnitt, sonst waere der erste Ort keine Entscheidung des '
      + 'Spielers auf der Landkarte mehr.');
  }

  const grenze = abschnittGeschafft(frisch, 500, 40, ALLE_KARTEN[0].waves.length);
  const angebot = abschnittsWahl(grenze);
  if (angebot.length < 2 || angebot.length > ANGEBOTE_JE_WAHL) {
    throw new Error(`An der Grenze stehen ${angebot.length} Angebote. Eines ist keine `
      + `Wahl, mehr als ${ANGEBOTE_JE_WAHL} passen nicht ins Bild.`);
  }
  if (new Set(angebot.map((a) => a.karte)).size !== angebot.length) {
    throw new Error('Zwei Angebote zeigen dieselbe Karte - dann schrumpft die Wahl '
      + 'still auf die Auflage zusammen.');
  }
  if (new Set(angebot.map((a) => a.art)).size !== angebot.length) {
    throw new Error('Zwei Angebote tragen dieselbe Auflage.');
  }
  // Der Satz ist ABGELEITET, nicht danebengeschrieben (Regel 15).
  for (const a of angebot) {
    const art = WAHLARTEN.find((w) => w.id === a.art)!;
    if (a.druck !== art.druck || a.beute !== art.beute) {
      throw new Error(`Das Angebot "${a.id}" traegt andere Zahlen als seine Auflage.`);
    }
    if (art.druck !== 1 && !a.satz.includes(`${Math.round(Math.abs(art.druck - 1) * 100)} %`)) {
      throw new Error(`Der Satz von "${a.id}" nennt den Druck nicht: "${a.satz}". `
        + 'Dann steht der Unterschied nicht vor der Wahl im Bild.');
    }
  }

  // 1. Ueber die Ablage hinweg dasselbe Angebot.
  laufSpeichern(grenze);
  const zurueck = laufLaden();
  if (!zurueck) throw new Error('Ein Lauf an der Grenze kommt nicht zurueck.');
  const wieder = abschnittsWahl(zurueck);
  if (wieder.map((a) => a.id).join('|') !== angebot.map((a) => a.id).join('|')) {
    throw new Error(`Nach dem Laden steht ein anderes Angebot da `
      + `(${wieder.map((a) => a.id).join(', ')} statt `
      + `${angebot.map((a) => a.id).join(', ')}).`);
  }

  // 2. Eine erfundene Kennung aendert nichts.
  if (abschnittWaehlen(grenze, 'spiralhain:geschenkt') !== grenze) {
    throw new Error('Ein Angebot, das gar nicht im Zug steht, wird angenommen. '
      + 'Dann laesst sich der Lauf ueber die Ablage stellen.');
  }

  // 3. Karte und Auflage kommen beide an.
  const nimm = angebot[angebot.length - 1];
  const nachher = abschnittWaehlen(grenze, nimm.id);
  if (laufendeKarte(nachher) !== nimm.karte) {
    throw new Error(`Gewaehlt wurde ${nimm.karte}, gelaufen wird auf `
      + `${laufendeKarte(nachher)}.`);
  }
  if (nachher.druck !== nimm.druck || nachher.beute !== nimm.beute) {
    throw new Error('Die Auflage des Angebots kommt im Lauf nicht an - dann ist der '
      + 'sichtbare Handel ein Bild ohne Wirkung.');
  }
  if (nachher.wahlOffen) throw new Error('Die Wahl bleibt nach dem Waehlen offen.');
  if (abschnittsWahl(nachher).length) {
    throw new Error('Nach der Wahl steht immer noch ein Angebot da.');
  }
  if (new Set(nachher.abschnitte).size !== nachher.abschnitte.length) {
    throw new Error(`Der Plan des Laufs traegt eine Karte doppelt `
      + `(${nachher.abschnitte.join(', ')}).`);
  }
  laufLoeschen();
});

// --- Die Vielfaltsbeute steht IM BILD (v301, S-N3-03).
//
// Die Abnahme der Story verlangt es woertlich: "Die Zahl steht im Bild, nicht
// nur in der Bilanz." Der Zuschlag ist ein Faktor auf dieselbe Zahl - in einem
// blossen `+3` waere er nicht zu erkennen, der Spieler saehe eine groessere
// Zahl und wuesste nicht, warum. Angehaengt wird deshalb `×N`, die Zahl der
// beteiligten Turmarten.
//
// **Geprueft wird es hier, weil kein Bild es fangen kann.** Die Marke lebt
// 1,1 Sekunden im Augenblick eines Kills; keine der fuenfzehn Aufnahmen des
// UX-Audits hat sie erwischt, und darauf zu warten waere ein Messplatz, der
// auf einen Zufall wartet - genau die Verfallsart, die v219 viermal gekostet
// hat. Der Fall wird deshalb GESTELLT.
step('Vielfaltsbeute steht im Bild', () => {
  const probe = new GameState();
  probe.reset();

  /** Einen Gegner setzen, ihn mit `arten` Turmarten toeten, den Text der
   *  Goldzahl zurueckgeben. */
  const toeten = (art: 'runner' | 'brute', arten: number): string => {
    probe.floats.length = 0;
    probe.enemies.length = 0;
    const e = probe.spawnZumPruefen(art, 0);
    if (!e) throw new Error('Kein Gegner gesetzt - die Probe misst nicht, was sie soll.');
    e.arten = (1 << arten) - 1;   // die untersten `arten` Bits
    e.hp = 1;
    probe.trefferZumPruefen(e, 9999);
    const f = probe.floats.find((t) => t.text.startsWith('+'));
    return f ? f.text : '';
  };
  const nurZahl = (t: string) => Number(t.replace(/[^0-9]/g, ''));

  // **Erstens: mit EINER Turmart steht keine Marke da.** Von Bauart - `arten`
  // ist dann 1 und der Faktor genau 1 -, und deshalb ist es die Zusage, die
  // am schaerfsten ist: eine Marke hier waere eine behauptete Belohnung.
  for (const art of ['runner', 'brute'] as const) {
    const t = toeten(art, 1);
    if (!t.startsWith('+')) throw new Error(`Ein toter ${art} erzeugt keine Goldzahl.`);
    if (t.includes('×')) {
      throw new Error(`Mit EINER Turmart traegt ${art} trotzdem eine Vielfaltsmarke `
        + `("${t}"). Dann behauptet das Bild eine Belohnung, die es nicht gibt.`);
    }
  }

  // **Zweitens: wo die Beute wirklich steigt, steht die Marke.** Der Koloss
  // traegt 7 Gold, dort landet der Zuschlag ab der zweiten Turmart.
  const eine = toeten('brute', 1);
  const zwei = toeten('brute', 2);
  if (!zwei.includes('×2')) {
    throw new Error(`Zwei Turmarten am Koloss bringen mehr Gold, aber keine Marke `
      + `("${eine}" -> "${zwei}"). Die Beute steigt dann, ohne dass der Spieler `
      + 'erfaehrt warum - und die Abnahme von S-N3-03 verlangt es ausdruecklich.');
  }
  if (nurZahl(zwei) <= nurZahl(eine)) {
    throw new Error(`Die Marke steht am Koloss an einer Zahl, die sich gar nicht `
      + `geaendert hat (${eine} gegen ${zwei}).`);
  }

  // **Drittens: wo die Rundung den Zuschlag frisst, luegt die Marke nicht.**
  //
  // Und das ist kein Randfall, sondern der haeufigste Gegner: der Laeufer
  // traegt 2 Gold, 2 x 1,2 sind 2,4, und gerundet bleiben 2. Bei Zuschlag
  // 0,10 ist die Vielfaltsbeute auf den drei billigsten Gegnerarten
  // (Krabbler 2, Laeufer 2, Span 1) UNSICHTBAR - gemessen ueber alle vier
  // Artenzahlen. Sie zeigt sich auf fuenf von acht Arten, ab zwei Arten bei
  // Koloss, Spalter und Titan, ab vier bei Infanterie und Gleiter.
  //
  // Das ist der Preis einer ganzzahligen Beute und steht so im Verzeichnis;
  // was die Prueferin hier haelt, ist die Ehrlichkeit der Marke: keine
  // Vielfaltsmarke an einer Zahl, die gleich geblieben ist.
  const laeuferEins = toeten('runner', 1);
  const laeuferDrei = toeten('runner', 3);
  if (nurZahl(laeuferDrei) === nurZahl(laeuferEins) && laeuferDrei.includes('×')) {
    throw new Error(`Der Laeufer traegt eine Vielfaltsmarke ("${laeuferDrei}"), obwohl `
      + `sich seine Beute nicht geaendert hat ("${laeuferEins}"). Eine Marke an einer `
      + 'unveraenderten Zahl ist eine Luege im Bild.');
  }
});

// --- Der Bauhinweis und die Bauwahl sagen dasselbe (v298).
//
// Der Hinweis ist ein Wort auf der Leinwand, dort wo der Finger war. Die
// Bauwahl nennt denselben Grund an jedem Turm, fuer den er gilt - je Turm
// verschieden. Stehen beide zugleich da, ist es Regel 15 als Bedienoberflaeche,
// und die schlechtere Fassung scheint durch die halbdurchsichtige Leiste: in
// der Aufnahme zu v298 lag ein rotes "Weg" hinter "Prisma" und "Foerderer",
// und "Prisma" las sich als "PrismaWeg".
//
// **Gefunden hat es der Blick.** Vier Messungen an derselben Leiste haben
// vorher null gemeldet - Ueberlauf im Kasten, Kinder ueber den Kasten,
// Abstaende zwischen den Knoepfen, Knoepfe im Behaelter -, weil dieses
// Kaestchen gar nicht zur Leiste gehoert. Regel 8 und Regel 15 in einem Bild.
//
// Geprueft wird die ABLEITUNG, nicht der Zeichenweg: `hinweisSichtbar()` ist
// die eine Stelle, an der die Frage beantwortet wird, und der Renderer fragt
// sie. Eine Bedingung, die nur im Zeichenweg steht, prueft niemand (Regel 6).
step('Bauhinweis und Bauwahl stehen nicht zugleich', () => {
  const probe = new GameState();
  probe.reset();
  const lane = probe.lanes[0];
  const p = lane.at(lane.length * 0.5);

  // Der Fall wird GESTELLT, nicht abgewartet: ein Hinweis auf der Wegmitte.
  probe.bauHinweis(p.x, p.y, probe.warumNicht('arrow', p.x, p.y));
  if (probe.hinweis === null) {
    throw new Error('Auf der Wegmitte entsteht kein Bauhinweis - die Probe misst nicht, '
      + 'was sie messen soll.');
  }
  if (!probe.hinweisSichtbar()) {
    throw new Error('Der Bauhinweis ist unsichtbar, obwohl keine Bauwahl offen steht. '
      + 'Dann sieht der Spieler nie, warum dort nichts hinkann.');
  }

  // Und jetzt die Bauwahl daneben. Derselbe Hinweis, derselbe Augenblick.
  const ziel = probe.einrasten('arrow', p.x, p.y, 220);
  if (!ziel) throw new Error('Neben dem Weg findet sich kein Bauplatz fuer die Probe.');
  probe.buildAt = ziel;
  if (probe.hinweisSichtbar()) {
    throw new Error('Bauhinweis und Bauwahl stehen zugleich im Bild. Die Wahl nennt den '
      + 'Grund bereits an jedem Turm, fuer den er gilt - das Wort auf der Leinwand sagt '
      + 'dasselbe ein zweites Mal und liegt dabei hinter ihren Beschriftungen.');
  }

  // Die Nullprobe: ohne Bauwahl ist er wieder da. Ohne sie koennte
  // `hinweisSichtbar` schlicht immer falsch zurueckgeben.
  probe.buildAt = null;
  if (!probe.hinweisSichtbar()) {
    throw new Error('Der Bauhinweis bleibt auch ohne Bauwahl unsichtbar - dann prueft '
      + 'die Bedingung nichts, sie schaltet ihn nur ab.');
  }
});

// --- Kleinigkeiten in der Karte (D14).
//
// Zwei Fragen, und die zweite ist die wichtigere.
step('Beruehrbare Kleinigkeiten', () => {
  // **Jede Karte, nicht nur die erste.**
  //
  // Bis v192 lief diese Probe auf `MAPS[0]`. Genau so hat in v175 eine
  // Luecke ueberlebt: die Pruefung des Moerser-Nachteils lief auf der Karte,
  // wo Luft ohnehin am dicksten ist. Nachgemessen reagieren zwar alle drei
  // Karten (8, 11 und 11 Flecken, 12,0 bis 13,6 Prozent des Feldes) - aber
  // das wusste vorher niemand, weil es niemand gefragt hat.
  //
  // Und die drei Gelaendearten haengen an den Karten: `kalt` gibt es nur auf
  // der Frostspalte. Wer nur die erste Karte prueft, prueft eine von drei
  // Bewegungen.
  const arten = new Set<string>();
  for (const karte of ALLE_KARTEN) {
    const p2 = new GameState();
    p2.reset(1234, 'normal', karte.id);
    if (!p2.map.rough.length) {
      problems.push(`Beruehrung: Karte "${karte.id}" hat kein unwegsames Gelaende.`);
      continue;
    }
    let stumm = 0;
    for (const fleck of p2.map.rough) {
      arten.add(fleck.art);
      p2.particles.length = 0;
      if (!p2.beruehren(fleck.x, fleck.y) || !p2.particles.length) stumm++;
    }
    if (stumm) {
      problems.push(`Beruehrung: auf "${karte.id}" reagieren ${stumm} von `
        + `${p2.map.rough.length} Flecken nicht.`);
    }
  }
  if (arten.size < 3) {
    problems.push(`Beruehrung: nur ${arten.size} von drei Gelaendearten kommen ueberhaupt `
      + `vor (${[...arten].join(', ')}). Dann ist eine der drei Bewegungen ungeprueft.`);
  }

  const probe = new GameState();
  probe.reset();
  const gr = probe.map.rough[0];
  if (!gr) throw new Error('Die erste Karte hat kein unwegsames Gelaende - die Probe misst nichts.');

  // 1. Reagiert sie ueberhaupt? Und reagiert sie NUR dort?
  probe.particles.length = 0;
  if (probe.beruehren(gr.x, gr.y) !== true) {
    throw new Error('Ein Tipp mitten ins Dickicht loest nichts aus.');
  }
  if (!probe.particles.length) {
    throw new Error('Die Beruehrung meldet Erfolg, erzeugt aber kein einziges Teilchen.');
  }
  // Weit weg von allem Unwegsamen: dort darf nichts passieren, sonst wuerde
  // jeder Tipp im Feld stauben.
  const fern = { x: probe.map.rough.reduce((m, g) => Math.max(m, g.x + g.r), 0) + 400, y: 40 };
  probe.particles.length = 0;
  if (probe.beruehren(fern.x, fern.y) !== false || probe.particles.length) {
    throw new Error('Auch auf freiem Feld staubt es - dann reagiert nicht die Kleinigkeit, '
      + 'sondern alles.');
  }

  // 2. Bewegt sie den SPIELWUERFEL? Sie darf nicht (Regel 4).
  //
  // Das ist der eigentliche Punkt dieser Probe. Die vorhandenen Teilchenwerfer
  // ziehen aus `rng`; haette die Zierde das auch getan, liefe dieselbe Partie
  // je nach Anzahl der Buschtipper verschieden - und niemand kaeme darauf,
  // dort zu suchen.
  const vorher = probe.rng.state;
  for (let i = 0; i < 20; i++) probe.beruehren(gr.x, gr.y);
  if (probe.rng.state !== vorher) {
    throw new Error('Das Antippen einer Kleinigkeit bewegt den Spielwuerfel - '
      + 'damit haengt der Wellenverlauf daran, wie oft jemand ins Dickicht tippt.');
  }
});

// --- Was passiert mit einem Geschoss, dessen Turm verschwindet? (TF-016)
//
// Zwei Faelle aus dem QA-Katalog, die das Audit als NOT VERIFIED gefuehrt
// hat: ein Turm wird verkauft oder ausgebaut, waehrend sein Geschoss noch
// fliegt. Beide sind nachgestellt worden und beide verhalten sich richtig -
// deshalb stehen sie hier: was einmal geprueft ist und nirgends festgehalten
// wird, ist beim naechsten Umbau wieder ungeprueft.
//
// Was richtig heisst:
//   Verkauf  Das Geschoss trifft trotzdem. Der Schaden zaehlt fuer die
//            Partie; die Gutschrift am Turm ist verloren, weil es den Turm
//            nicht mehr gibt. Kein Absturz.
//   Ausbau   Das Geschoss traegt den Schaden, mit dem es abgefeuert wurde,
//            nicht den der neuen Stufe. Ein Schuss, der schon unterwegs ist,
//            wird nicht nachtraeglich staerker.
{
  const { candidateSpots: spots2 } = await import('./spots');
  /** Ein Feld mit genau einem Turm und mindestens einem Geschoss in der Luft. */
  const imFlug = () => {
    const p = new GameState();
    p.reset(31, 'normal', 'spiralhain');
    p.gold = 999999;
    const sp = spots2(p)[0];
    if (!sp || !p.build(sp.x, sp.y, 'arrow')) return null;
    p.waveIndex = 4;
    p.startWave();
    for (let i = 0; i < 60 * 60 && !p.projectiles.length; i++) p.update(DT);
    return p.projectiles.length ? p : null;
  };

  step('Turm verkauft, waehrend sein Schuss fliegt', () => {
    const p = imFlug();
    if (!p) throw new Error('Es kam kein Geschoss in die Luft - die Probe misst nichts.');
    const vorher = p.stats.damage;
    p.sell(ersterTurm(p));
    for (let i = 0; i < 120; i++) p.update(DT);
    if (p.gebaute.length !== 0) throw new Error('Der Turm steht nach dem Verkauf noch da.');
    if (p.stats.damage <= vorher) {
      throw new Error('Das Geschoss des verkauften Turms hat keinen Schaden mehr gemacht - '
        + 'ein bezahlter Schuss darf nicht verfallen, weil der Turm weg ist.');
    }
  });

  step('Turm ausgebaut, waehrend sein Schuss fliegt', () => {
    const p = imFlug();
    if (!p) throw new Error('Es kam kein Geschoss in die Luft - die Probe misst nichts.');
    const unterwegs = p.projectiles[0].damage;
    // Der GEBAUTE Turm, nicht die Zielunit.
    //
    // Sie steht seit v165 an Stelle null, und das Geschoss in der Luft
    // gehoert dem Bogenturm. Ausgebaut wurde damit ein anderer Turm als der,
    // dessen Schuss geprueft wird - die Gegenprobe "Ausbau wirkt
    // rueckwirkend" blieb deshalb im vollen Lauf zu v166 stumm.
    const t = ersterTurm(p);
    if (!p.upgrade(t, 0)) throw new Error('Der Ausbau schlug fehl - die Probe misst nichts.');
    const neu = p.towerStats(t).damage;
    if (neu <= unterwegs) {
      throw new Error(`Der Ausbau bringt keinen groesseren Schaden (${unterwegs} -> ${neu}) - `
        + 'dann kann die Probe den Unterschied nicht sehen.');
    }
    if (p.projectiles[0].damage !== unterwegs) {
      throw new Error(`Ein Geschoss in der Luft traegt nach dem Ausbau ${p.projectiles[0].damage} `
        + `statt ${unterwegs} Schaden - ein Schuss wird nachtraeglich staerker.`);
    }
    for (let i = 0; i < 120; i++) p.update(DT);
  });
}

// --- Bleibt der Trefferstopp im Rahmen? (v137)
//
// Bis v136 gab es ZWEI Felder fuer dieselbe Sache: `hitStop` mit Budget und
// `hitstop` ohne. Beide hielten die Simulation an, also war das Budget in
// Wahrheit keines - ein Bossabschuss fror das Bild 160 ms ein, obwohl der
// Deckel bei 90 ms je Sekunde liegt.
//
// Geprueft wird die Wirkung, nicht das Feld: wieviele Bilder steht die Welt
// still, wenn in EINEM Augenblick sechs schwere Gegner fallen? Und die
// Gegenrichtung dazu - sie muss ueberhaupt stillstehen, sonst misst die
// Probe eine Sache, die gar nicht stattfindet (Regel 13).
step('Trefferstopp bleibt im Rahmen', () => {
  const probe = new GameState();
  probe.reset(5);
  const opfer = [];
  for (let i = 0; i < 6; i++) {
    const e = probe.spawnZumPruefen('titan', 0, 0);
    if (e) opfer.push(e);
  }
  if (opfer.length < 6) throw new Error('Die Probe bekommt keine sechs Gegner aufs Feld.');
  for (const e of opfer) probe.trefferZumPruefen(e, 99999);

  // Gemessen an einem ZEUGEN, nicht an der Uhr: `time` laeuft auch waehrend
  // des Stopps weiter, stehen bleibt die WELT. Also ein Gegner, der sonst
  // jede Sekunde ein Stueck weiter waere.
  const zeuge = probe.spawnZumPruefen('crawler', 0, 0);
  if (!zeuge) throw new Error('Kein Zeuge auf dem Feld.');
  let still = 0;
  for (let i = 0; i < 60; i++) {
    const vorher = zeuge.travelled;
    probe.update(DT);
    if (zeuge.travelled === vorher) still++;
  }
  if (still === 0) {
    throw new Error('Sechs Bossabschuesse halten die Welt gar nicht an - '
      + 'dann prueft die Grenze nichts.');
  }
  // 90 ms je Sekunde sind bei 60 Bildern hoechstens 6 Bilder Stillstand.
  if (still > 6) {
    throw new Error(`Sechs Bossabschuesse halten die Welt ${still} Bilder an `
      + `(${(still / 60 * 1000).toFixed(0)} ms). Erlaubt sind 90 ms je Sekunde.`);
  }
});

/** **Eine Weiche wird nur zwischen den Wellen umgelegt** (v280, S-N2-03).
 *
 *  Ein Gegner traegt als einzige Zustandsgroesse seine zurueckgelegte
 *  Strecke. Tauscht man die Bahn unter ihm aus, springt er auf die neue
 *  Kurve: dieselbe Strecke, anderer Ort. Das waere keine Korrektur mehr,
 *  sondern eine neue Mechanik - dieselbe Begruendung wie beim Turmversetzen
 *  in v108.
 *
 *  **Gemessen wird der Sprung, nicht der Rueckgabewert.** Ein `false` sagt
 *  nur, dass die Funktion nein gesagt hat; ob dabei trotzdem etwas an den
 *  Bahnen passiert ist, sagt es nicht. Also: Ort jedes Gegners vorher und
 *  nachher.
 *
 *  Die Nullprobe steht daneben (Regel 13): OHNE Gegner auf dem Feld muss
 *  dieselbe Weiche sich umlegen lassen und die Bahn messbar aendern - sonst
 *  bewiese die Probe nur, dass die Weiche gar nicht geht. */
step('Weiche laesst sich waehrend einer Welle nicht umlegen', () => {
  const g = new GameState();
  g.reset(4242, 'normal', 'spiralhain');

  // Nullprobe zuerst, im Ruhezustand: die Weiche geht, und sie wirkt.
  const vorLaenge = g.lanes[0].length;
  if (!g.weicheStellen('saeule1', true)) {
    throw new Error('Die Weiche laesst sich zwischen den Wellen gar nicht umlegen.');
  }
  const nachLaenge = g.lanes[0].length;
  if (Math.abs(nachLaenge - vorLaenge) < 100) {
    throw new Error(`Die Weiche aendert die Bahn kaum: ${vorLaenge.toFixed(0)} -> `
      + `${nachLaenge.toFixed(0)} Weltpunkte.`);
  }
  if (!g.weicheStellen('saeule1', false)) throw new Error('Die Weiche geht nicht zurueck.');

  // Jetzt mit laufender Welle - und zwar so weit, dass wenigstens einer die
  // Weiche schon PASSIERT hat.
  //
  // **Zwei Anlaeufe haben an der falschen Stelle gemessen.** Der erste liess
  // 400 Bilder laufen und prueft dann; da steht der vorderste Gegner noch auf
  // dem gemeinsamen Anfang, und der ist bei jeder Weichenstellung derselbe.
  // Der zweite wartete auf 900 Weltpunkte - die Abzweigung liegt bei 885, der
  // Gegner stand also 15 Weltpunkte dahinter, und dort laufen beide Aeste noch
  // nebeneinander. Beide Male war der Sprung null, mit und ohne Fehler
  // (Regel 3). Gewartet wird jetzt auf 1100: zwei Drittel in den kurzen Ast
  // hinein, wo die Nordschleife rund 300 Weltpunkte daneben liegt.
  g.startWave();
  const abzweig = 1100;
  for (let i = 0; i < 4000 && !g.enemies.some((e) => e.travelled > abzweig); i++) g.update(DT);
  if (!g.enemies.some((e) => e.travelled > abzweig)) {
    throw new Error('Kein Gegner hinter der Weiche - die Probe misst nichts.');
  }

  const vorher = g.enemies.map((e) => ({ id: e.id, x: e.x, y: e.y }));
  const bahnVorher = g.lanes[0].length;
  g.weicheStellen('saeule1', true);
  g.update(DT);

  let groesster = 0;
  for (const a of vorher) {
    const b = g.enemies.find((e) => e.id === a.id);
    if (!b) continue;
    groesster = Math.max(groesster, Math.hypot(b.x - a.x, b.y - a.y));
  }
  // Ein Bild Bewegung ist erlaubt; ein Bahnwechsel wirft den Gegner um
  // Hunderte von Weltpunkten.
  if (groesster > 60) {
    throw new Error(`Ein Gegner ist beim Umlegen um ${groesster.toFixed(0)} Weltpunkte `
      + 'gesprungen - die Route wurde mitten im Lauf gewechselt.');
  }
  if (Math.abs(g.lanes[0].length - bahnVorher) > 0.5) {
    throw new Error(`Die Bahn hat sich waehrend der Welle geaendert: `
      + `${bahnVorher.toFixed(0)} -> ${g.lanes[0].length.toFixed(0)} Weltpunkte.`);
  }
});

/** **Die Weichenstellung ueberlebt das Sichern** (v280).
 *
 *  Ohne sie liefen die Gegner nach dem Laden wieder die kurze Bahn, waehrend
 *  die Tuerme am Umweg stehen - ein Fehler, den man erst in der naechsten
 *  Welle sieht und dann nicht mehr erklaeren kann.
 *
 *  Geprueft wird nicht, ob das Feld im Stand STEHT, sondern was nach dem
 *  Laden auf dem Feld ankommt: die Laenge der Bahn. Ein Feld im Stand, das
 *  beim Laden niemand liest, sieht genauso aus wie eines, das fehlt (v137). */
step('Weichenstellung ueberlebt das Sichern', () => {
  const g = new GameState();
  g.reset(4242, 'normal', 'spiralhain');
  const kurz = g.lanes[0].length;
  if (!g.weicheStellen('saeule1', true)) throw new Error('Die Weiche liess sich nicht umlegen.');
  const lang = g.lanes[0].length;

  const b = new GameState();
  if (!b.restore(g.snapshot())) throw new Error('Der Stand liess sich nicht laden.');
  if (Math.abs(b.lanes[0].length - lang) > 0.5) {
    throw new Error(`Nach dem Laden ist die Bahn ${b.lanes[0].length.toFixed(0)} statt `
      + `${lang.toFixed(0)} Weltpunkte lang (offen waeren ${kurz.toFixed(0)}).`);
  }

  // Nullprobe (Regel 13): ein Stand OHNE umgelegte Weiche laedt die kurze
  // Bahn. Sonst bewiese die Probe nur, dass beide Staende gleich aussehen.
  const c = new GameState();
  c.reset(4242, 'normal', 'spiralhain');
  const d = new GameState();
  if (!d.restore(c.snapshot())) throw new Error('Der offene Stand liess sich nicht laden.');
  if (Math.abs(d.lanes[0].length - kurz) > 0.5) {
    throw new Error(`Ein Stand ohne Weiche laedt ${d.lanes[0].length.toFixed(0)} statt `
      + `${kurz.toFixed(0)} Weltpunkte.`);
  }
});

// --- Ueberlebt eine Welle das Sichern? (v137)
//
// Bis v136 sicherte `snapshot` von jedem WARTENDEN Gegner vier von sechs
// Angaben: Schild und Schildtraeger fielen weg. Wer die App schloss und
// weiterspielte, bekam eine leichtere Welle als der, der durchspielte -
// gemessen 10 Schildpunkte gegen 0.
//
// Geprueft wird nicht, ob die Felder im Stand STEHEN, sondern ob nach dem
// Laden dasselbe auf dem Feld ankommt. Ein Feld im Stand, das beim Laden
// niemand liest, sieht genauso aus wie eines, das fehlt.
/** **Der Verbund steht im Pruefsteg und stimmt** (v244, F4).
 *
 *  Ein Zuschlag, den man nicht sieht, ist keine Entscheidung, sondern eine
 *  Ueberraschung - genau der Befund, an dem der Fruehstart bis v242 hing.
 *  Und einer, der ANDERS angezeigt wird, als er wirkt, ist schlimmer als
 *  keiner: dann plant der Spieler mit einer Zahl, die es nicht gibt.
 *
 *  Geprueft wird deshalb beides an derselben Stelle: die Zeile ist da, und
 *  der angezeigte Schaden ist der, den der Turm wirklich macht. Die
 *  Nullprobe steht daneben (Regel 13) - ein Turm allein muss "allein"
 *  melden und seinen Grundschaden zeigen. */
step('Verbund steht im Pruefsteg und stimmt', () => {
  const g = new GameState();
  g.reset(4242, 'normal', 'spiralhain');
  g.gold = 99999;
  const plaetze = candidateSpots(g);
  if (plaetze.length < 2) throw new Error('Zu wenige Bauplaetze - die Probe misst nichts.');

  // Erst allein: kein Verbund, Grundschaden.
  if (!g.build(plaetze[0].x, plaetze[0].y, 'arrow')) throw new Error('Kein Turm setzbar.');
  const t = g.gebaute[0];
  if (g.verbundVon(t) !== 0) {
    throw new Error(`Ein einzelner Turm hat Verbund ${g.verbundVon(t)}.`);
  }
  const allein = werteAmTurm(TOWERS[t.def], t.branch, t.level, t.kills, g.verbundVon(t));
  const zeile = (n: string) => allein.find((z) => z.name === n);
  if (zeile('Verbund')?.wert !== 'allein') {
    throw new Error(`Der einzelne Turm meldet Verbund "${zeile('Verbund')?.wert}".`);
  }

  // Jetzt einen Turm ANDERER Art danebenstellen, innerhalb des Umkreises.
  //
  // Gesucht wird der naechste Platz, an dem ein Frostturm WIRKLICH steht -
  // nicht der naechste in der Liste. `candidateSpots` ist fuer den Bogenturm
  // gerechnet, und der Frostturm braucht mehr Platz; der erste Anlauf nahm
  // den naechstbesten und scheiterte am Bauriegel.
  const nahe = plaetze
    .filter((p) => Math.hypot(p.x - t.x, p.y - t.y) > 0
      && Math.hypot(p.x - t.x, p.y - t.y) < VERBUND_UMKREIS)
    .sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
  if (!nahe.length) throw new Error('Kein zweiter Bauplatz im Verbundumkreis - die Probe misst nichts.');
  if (!nahe.some((p) => g.build(p.x, p.y, 'frost'))) {
    throw new Error(`An keinem der ${nahe.length} Plaetze im Umkreis laesst sich ein `
      + 'Frostturm setzen - die Probe misst nichts.');
  }
  if (g.verbundVon(t) !== 1) {
    throw new Error(`Mit einem Nachbarn anderer Art steht der Verbund auf ${g.verbundVon(t)}.`);
  }

  // Und die angezeigte Zahl muss die WIRKENDE sein.
  const werte = werteAmTurm(TOWERS[t.def], t.branch, t.level, t.kills, g.verbundVon(t));
  const gezeigt = Number(werte.find((z) => z.name === 'Schaden')?.wert);
  const wirklich = g.towerStats(t).damage;
  if (!Number.isFinite(gezeigt) || Math.abs(gezeigt - wirklich) > 0.11) {
    throw new Error(`Der Pruefsteg zeigt ${gezeigt} Schaden, der Turm macht ${wirklich}.`);
  }
  if (!/^\+\d+ % · 1 Art$/.test(werte.find((z) => z.name === 'Verbund')?.wert ?? '')) {
    throw new Error(`Die Verbundzeile lautet "${werte.find((z) => z.name === 'Verbund')?.wert}".`);
  }
  // Und die Faeden im Bild zeigen auf genau den Nachbarn, der zaehlt.
  const partner = g.verbundPartner(t);
  if (partner.length !== 1 || partner[0].def !== 'frost') {
    throw new Error(`Die Verbundfaeden gehen zu ${partner.length} Turm/Tuermen `
      + `(${partner.map((o) => o.def).join(', ')}) statt zu dem einen Frostturm.`);
  }
});

/** **Der Fruehstart als Entscheidung** (v243, F2).
 *
 *  Die Sache gibt es seit Langem, im Bild stand aber nichts davon - eine
 *  zweite Zeile unter dem Wellenknopf, und die war auf dem Zielgeraet
 *  `display: none`. Geprueft wird deshalb beides: die Zahl UND dass sie im
 *  Knopf ankommt.
 *
 *  Die Nullprobe steht mit drin (Regel 13): nach Ablauf des Fensters muss
 *  alles auf null fallen. Ohne sie bewiese die Messung nur, dass irgendeine
 *  Zahl da steht - und eine feste Zahl bestuende sie auch. */
step('Fruehstart zeigt sein Fenster', () => {
  const g = new GameState();
  g.reset(4242, 'normal', 'spiralhain');
  // Erst NACH der ersten Welle gibt es einen Bonus: in Welle 1 baut man
  // ueberhaupt seinen ersten Turm.
  if (g.fruehstart.gold !== 0) {
    throw new Error(`Vor der ersten Welle steht ein Bonus von ${g.fruehstart.gold}.`);
  }
  g.waveIndex = 3;
  g.idleTime = 0;
  const voll = g.fruehstart;
  if (voll.gold <= 0 || voll.anteil <= 0.99) {
    throw new Error(`Gleich nach der Welle stehen ${voll.gold} Gold bei Anteil ${voll.anteil.toFixed(2)}.`);
  }
  // Die Haelfte des Fensters: beide Zahlen muessen mitgehen, nicht nur eine.
  g.idleTime = EARLY_BONUS_WINDOW / 2;
  const halb = g.fruehstart;
  if (Math.abs(halb.anteil - 0.5) > 0.02 || Math.abs(halb.gold - voll.gold / 2) > 1) {
    throw new Error(`Nach der Haelfte des Fensters ${halb.gold} Gold bei Anteil ${halb.anteil.toFixed(2)}.`);
  }
  // Nullprobe: Fenster abgelaufen.
  g.idleTime = EARLY_BONUS_WINDOW + 1;
  const leer = g.fruehstart;
  if (leer.gold !== 0 || leer.anteil !== 0) {
    throw new Error(`Nach dem Fenster stehen noch ${leer.gold} Gold bei Anteil ${leer.anteil.toFixed(2)}.`);
  }

  // Und kommt es im KNOPF an? Die Oberflaeche haengt am gemeinsamen Zustand,
  // also wird der hier gefahren - eine zweite `UI` waere eine zweite
  // Wahrheit ueber dasselbe Bild.
  state.waveIndex = 3;
  state.wellenZumPruefen([]);
  state.idleTime = 0;
  ui.sync();
  const plus = win.document.getElementById('b-wave-p') as HTMLElement;
  const fuell = win.document.getElementById('b-wave-f') as HTMLElement;
  if (!plus || !fuell) throw new Error('Der Wellenknopf traegt keine Fruehstart-Anzeige.');
  if (!/^\+\d+$/.test(plus.textContent ?? '')) {
    throw new Error(`Im Knopf steht "${plus.textContent}" statt einer Bonuszahl.`);
  }
  if (plus.getAttribute('data-an') !== '1' || fuell.getAttribute('data-an') !== '1') {
    throw new Error('Die Fruehstart-Anzeige meldet sich als abgeschaltet, obwohl ein Bonus laeuft.');
  }
  state.idleTime = EARLY_BONUS_WINDOW + 1;
  ui.sync();
  if (plus.textContent !== '' || plus.getAttribute('data-an') !== '0') {
    throw new Error(`Nach dem Fenster steht im Knopf noch "${plus.textContent}"`
      + ` (data-an ${plus.getAttribute('data-an')}).`);
  }
});

/** **Der Fruehstart wiegt die Lage** (S-P4-02, `fruehstartRisiko`).
 *
 *  Bis v266 hing der Bonus allein an der Uhr - und seit Wellen ueberlappen
 *  duerfen, war das wirkungslos: `idleTime` waechst nur, wenn KEINE Welle
 *  laeuft, also stand der Anteil waehrend einer laufenden Welle fest auf 1,0.
 *  Wer nachlegte, bekam immer denselben vollen Bonus, ob die alte Welle noch
 *  ganz stand oder ihr letzter Nachzuegler lief.
 *
 *  Gestellt, nicht abgewartet: die Welle wird gestartet und ihr Anmarsch
 *  gekuerzt. Auf ihr Abarbeiten zu warten hiesse, auf einen Zufall zu warten
 *  - genau die Klasse, an der v219 vier Messplaetze verloren hat.
 *
 *  Die Nullprobe steht mit drin (Regel 13): bei leerem Feld muss der Bonus
 *  GENAU der von frueher sein. Ohne sie bewiese die Messung nur, dass
 *  irgendeine Zahl groesser ist als eine andere. */
step('Fruehstart wiegt die Lage', () => {
  const g = new GameState();
  g.reset(4242, 'normal', 'spiralhain');
  g.startWave();
  // Nichts ist ausgestossen, nichts erledigt: die Welle steht ganz da.
  const voll = g.fruehstart;
  if (Math.abs(voll.risiko - 1) > 0.001) {
    throw new Error(`Gleich nach dem Start steht die Lage auf ${voll.risiko.toFixed(3)} statt 1.`);
  }
  // Die Haelfte des Anmarschs herausnehmen.
  const ganz = g.anmarschZumPruefen(0, 999);
  g.anmarschZumPruefen(0, Math.floor(ganz / 2));
  const halb = g.fruehstart;
  if (halb.risiko <= 0.2 || halb.risiko >= 0.8) {
    throw new Error(`Halb abgearbeitet steht die Lage auf ${halb.risiko.toFixed(3)} - `
      + 'das ist keine halbe Welle.');
  }
  // Und leer: nichts mehr im Anmarsch, nichts mehr auf dem Feld.
  g.anmarschZumPruefen(0, 0);
  const leer = g.fruehstart;
  if (leer.risiko !== 0) {
    throw new Error(`Bei leerem Feld steht die Lage auf ${leer.risiko.toFixed(3)} statt 0.`);
  }

  // **Der Bonus folgt der Lage, und bei leerem Feld ist er der heutige.**
  if (leer.gold !== EARLY_BONUS_MAX) {
    throw new Error(`Bei leerem Feld ${leer.gold} Gold statt der heutigen ${EARLY_BONUS_MAX}.`);
  }
  if (!(voll.gold > halb.gold && halb.gold > leer.gold)) {
    throw new Error(`Der Bonus folgt der Lage nicht: voll ${voll.gold}, halb ${halb.gold}, `
      + `leer ${leer.gold}.`);
  }
  // Messbar hoeher heisst: nicht im Rundungsrauschen. Bei vollem Feld ist es
  // der Hub, und der steht in den Daten - nicht hier ein zweites Mal.
  if (voll.gold !== Math.round(EARLY_BONUS_MAX * (1 + EARLY_RISIKO_HUB))) {
    throw new Error(`Bei vollem Feld ${voll.gold} Gold - der Hub ${EARLY_RISIKO_HUB} `
      + `verlangt ${Math.round(EARLY_BONUS_MAX * (1 + EARLY_RISIKO_HUB))}.`);
  }

  // **Die Zahl entsteht an EINER Stelle.** Die Fuellung des Knopfes ist eine
  // Ableitung des Goldes, keine zweite Rechnung - sonst liefe der Balken bei
  // jeder Ueberlappung voll, waehrend die Zahl steigt (Regel 15).
  if (Math.abs(leer.fuellung - leer.gold / EARLY_BONUS_MAX) > 0.001) {
    throw new Error(`Fuellung ${leer.fuellung.toFixed(3)} passt nicht zu ${leer.gold} Gold.`);
  }
  if (voll.fuellung !== 1) {
    throw new Error(`Bei vollem Feld steht die Fuellung auf ${voll.fuellung} statt 1.`);
  }
});

/** **Zwei Stroeme, zwei Stellen** (S-P4-03, `zweiWellenband`).
 *
 *  Seit v266 duerfen zwei Wellen zugleich laufen, und der Hauptknopf war
 *  damit mehrdeutig: er stand auf "Welle 3 · noch 12" und startete Welle 4.
 *  Links steht jetzt der Zustand, rechts die Handlung - und wenn sich nichts
 *  starten laesst, traegt der Knopf wieder den Fortschritt (G12, er ist nie
 *  tot).
 *
 *  Geprueft wird beides an derselben Oberflaeche, die das Spiel benutzt: eine
 *  zweite `UI` waere eine zweite Wahrheit ueber dasselbe Bild. */
step('Wellenband trennt Zustand und Handlung', () => {
  const wave = win.document.getElementById('b-wave') as HTMLButtonElement;
  const wt = win.document.getElementById('b-wave-t') as HTMLElement;
  const wl = win.document.getElementById('b-wave-l') as HTMLElement;
  const hud = win.document.getElementById('v-wave') as HTMLElement;
  if (!wave || !wt || !wl || !hud) throw new Error('Das Wellenband fehlt im Markup.');

  // Abgelesen wird in Schnappschuessen: `textContent` bleibt sonst auf den
  // ersten Vergleich festgelegt, und die spaeteren pruefen dann nichts mehr.
  const lies = (): { t: string; l: string; an: string; hud: string; zu: boolean } => {
    ui.sync();
    return { t: wt.textContent ?? '', l: wl.textContent ?? '',
      an: wl.dataset.an ?? '', hud: hud.textContent ?? '', zu: wave.disabled };
  };

  state.reset(4242, 'normal', 'spiralhain');
  const ruhe = lies();
  if (ruhe.t !== 'Welle 1 starten') {
    throw new Error(`Vor der ersten Welle steht im Knopf "${ruhe.t}".`);
  }
  if (ruhe.an !== '0') throw new Error('Ohne laufende Welle steht ein Strom im Knopf.');

  // Eine Welle laeuft: der Knopf startet die NAECHSTE und sagt das auch.
  state.startWave();
  const eine = lies();
  if (eine.t !== 'Welle 2 starten') {
    throw new Error(`Waehrend Welle 1 laeuft, steht im Knopf "${eine.t}" - `
      + 'er startet aber Welle 2.');
  }
  if (eine.an !== '1' || !/^Welle 1 · noch \d+$/.test(eine.l)) {
    throw new Error(`Der laufende Strom steht auf "${eine.l}" (an ${eine.an}) `
      + 'statt auf "Welle 1 · noch X".');
  }
  if (eine.zu) throw new Error('Der Knopf ist gesperrt, obwohl sich Welle 2 starten laesst.');
  if (eine.hud !== '1/15') {
    throw new Error(`Die Kopfzeile zeigt "${eine.hud}" bei einer laufenden Welle.`);
  }

  // Zwei Wellen: nichts mehr zu starten, also traegt der Knopf wieder den
  // Fortschritt - und der Strom bleibt leer, sonst stuende dasselbe zweimal.
  state.startWave();
  const zwei = lies();
  if (!zwei.zu) throw new Error('Bei zwei laufenden Wellen laesst sich eine dritte starten.');
  if (!/^Welle 2 · noch \d+$/.test(zwei.t)) {
    throw new Error(`Bei zwei laufenden Wellen steht im Knopf "${zwei.t}".`);
  }
  if (zwei.an !== '0') {
    throw new Error(`Der Strom steht neben demselben Satz im Knopf ("${zwei.l}") - `
      + 'eine Doppelung.');
  }
  if (zwei.hud !== '1–2/15') {
    throw new Error(`Die Kopfzeile zeigt "${zwei.hud}" statt "1–2/15" - `
      + 'die aeltere laufende Welle fehlt darin.');
  }
});

step('Welle ueberlebt das Sichern', () => {
  const schildWelle = (g: InstanceType<typeof GameState>) => {
    for (let i = 0; i < g.totalWaves; i++) {
      if (g.waveAt(i).groups.some((x) => (x.shield ?? 0) > 0 || (x.traeger ?? 0) > 0)) return i;
    }
    return -1;
  };
  const a = new GameState();
  a.reset(99, 'normal', 'spiralhain');
  const welle = schildWelle(a);
  if (welle < 0) throw new Error('Keine Welle mit Schild - die Probe misst nichts.');
  a.waveIndex = welle;
  a.startWave();

  const stand = a.snapshot();
  const b = new GameState();
  if (!b.restore(stand)) throw new Error('Der Stand laesst sich nicht laden.');

  // Beide gleich weit laufen lassen und zaehlen, was ankommt.
  for (let i = 0; i < 60 * 8; i++) { a.update(DT); b.update(DT); }
  const schild = (g: InstanceType<typeof GameState>) =>
    g.enemies.reduce((n, e) => n + e.shield, 0);
  const traeger = (g: InstanceType<typeof GameState>) =>
    g.enemies.reduce((n, e) => n + e.traeger, 0);

  if (schild(a) === 0 && traeger(a) === 0) {
    throw new Error('Im laufenden Stand kommt selbst nichts an - die Probe misst nichts.');
  }
  if (schild(b) !== schild(a)) {
    throw new Error(`Nach dem Laden ${schild(b)} Schildpunkte statt ${schild(a)}.`);
  }
  if (traeger(b) !== traeger(a)) {
    throw new Error(`Nach dem Laden ${traeger(b)} Traegerpunkte statt ${traeger(a)}.`);
  }
});

// --- Reagieren VERSCHIEDENE Flecke auch verschieden (v136)?
//
// Bis v135 stob ueberall dasselbe auf. Seit v136 haengt die Reaktion an der
// Art des Flecks, und die ist am Kartenbild gemessen. Geprueft wird hier
// nicht, dass es die Arten GIBT - das tut `npm run gelaendetor` -, sondern
// dass sie sich im Spiel auch auswirken. Ohne diese Frage waere die
// Unterscheidung eine Behauptung mit drei Namen (Regel 13).
{
  const { MAPS } = await import('../src/data/maps');
  const { mischen } = await import('../src/gfx/glow');
  const { ZIER_AUFHELLUNG } = await import('../src/game/state');
  step('Flecke unterscheiden sich', () => {
    const proben: Record<string, { mapId: string; x: number; y: number }> = {};
    for (const m of MAPS) {
      for (const g of m.rough) {
        if (!proben[g.art]) proben[g.art] = { mapId: m.id, x: g.x, y: g.y };
      }
    }
    const arten = Object.keys(proben);
    if (arten.length < 3) {
      throw new Error(`Nur ${arten.length} Gelaendearten in allen Karten zusammen `
        + `(${arten.join(', ')}) - dann unterscheidet die Probe nichts.`);
    }

    /** Einen Fleck antippen und beschreiben, was aufgestoben ist. */
    const stoss = (mapId: string, gx: number, gy: number) => {
      const t = new GameState();
      t.reset(2, 'normal', mapId);
      t.particles.length = 0;
      if (!t.beruehren(gx, gy)) throw new Error(`${mapId} ${gx}:${gy} reagiert gar nicht.`);
      const ps = t.particles;
      return {
        anzahl: ps.length,
        vy: ps.reduce((a, q) => a + q.vy, 0) / ps.length,
        groesse: ps.reduce((a, q) => a + q.size, 0) / ps.length,
        farben: new Set(ps.map((q) => q.color)),
      };
    };

    const hart = stoss(proben.hart.mapId, proben.hart.x, proben.hart.y);
    const kalt = stoss(proben.kalt.mapId, proben.kalt.x, proben.kalt.y);
    const locker = stoss(proben.locker.mapId, proben.locker.x, proben.locker.y);

    // Hart splittert: weniger und kleiner als der lockere Staub.
    if (hart.anzahl >= locker.anzahl) {
      throw new Error(`Hart wirft ${hart.anzahl} Teilchen, locker ${locker.anzahl} - `
        + 'Pflaster staubt wie Asche.');
    }
    if (hart.groesse >= locker.groesse) {
      throw new Error(`Splitter sind mit ${hart.groesse.toFixed(1)} nicht kleiner als `
        + `Staub mit ${locker.groesse.toFixed(1)}.`);
    }
    // Kalt spritzt: der Stoss geht deutlich weiter nach oben als der Staub.
    if (kalt.vy >= locker.vy - 40) {
      throw new Error(`Kalt steigt mit ${kalt.vy.toFixed(0)}, locker mit `
        + `${locker.vy.toFixed(0)} - der Spritzer ist keiner.`);
    }

    // Und die Farbe kommt vom Fleck, nicht aus der Farbwelt der Karte: zwei
    // Flecke DERSELBEN Karte mit verschiedener Farbe muessen verschieden
    // stauben. Ohne diese Frage bezeugte die Probe nur die Karte.
    const karte = MAPS.find((m) => new Set(m.rough.map((g) => g.farbe)).size > 1);
    if (!karte) {
      throw new Error('Keine Karte mit zwei verschiedenen Fleckfarben - die Farbprobe '
        + 'misst nichts.');
    }
    const sortiert = [...karte.rough].sort((u, v) => u.farbe.localeCompare(v.farbe));
    const a = sortiert[0], b = sortiert[sortiert.length - 1];
    const fa = stoss(karte.id, a.x, a.y).farben;
    const fb = stoss(karte.id, b.x, b.y).farben;
    // Nicht die gemessene Farbe selbst - die waere vor ihrem eigenen Grund
    // unsichtbar -, sondern der daraus abgeleitete helle Ton.
    const erwartet = mischen(a.farbe, '#FFFFFF', ZIER_AUFHELLUNG);
    if (!fa.has(erwartet)) {
      throw new Error(`Der Fleck ${a.x}:${a.y} ist ${a.farbe}, erwartet war ${erwartet} `
        + `unter den Teilchenfarben, da stehen aber ${[...fa].join(', ')}.`);
    }
    if ([...fa].every((c) => fb.has(c)) && [...fb].every((c) => fa.has(c))) {
      throw new Error(`Zwei Flecke derselben Karte (${a.farbe}, ${b.farbe}) stauben in `
        + 'denselben Farben - die Farbe kommt nicht vom Fleck.');
    }
  });
}

if (problems.length) {
  console.error('RAUCHTEST: nicht bestanden');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(
  `RAUCHTEST: bestanden. ${frames} Bilder gezeichnet, ` +
  `Partie endete als "${outcome}", ${towerButtons} Baumenue-Knoepfe.`,
);
