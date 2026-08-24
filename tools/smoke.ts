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
const { ABILITIES } = await import('../src/data/abilities');
const { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor, statsFor } = await import('../src/data/towers');

const { TUTORIAL } = await import('../src/game/tutorial');
const { auswertung } = await import('../src/game/auswertung');
const { getBest, getStars, gegnerVergessen, saveSettings } = await import('../src/core/storage');
const { konterSatz } = await import('../src/data/konter');
type EnemyId = Parameters<typeof konterSatz>[0];
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
// Der Sternestand VOR dieser Partie - fuer die Auswertung weiter unten.
const sterneVorDerPartie = getStars(state.map.id, state.difficulty);
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
    state.waveActive = false;
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
      state.waveActive = true;
      ui.sync();
      if (!blase.hidden) {
        problems.push(`Konter W${i + 1}: die Blase steht noch, obwohl die Welle laeuft.`);
      }
      state.waveActive = false;
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
    state.waveActive = false;
    ui.sync();
    const arten = new Set(state.waves[i].groups.map((g) => g.enemy));
    const gezeigt = [...liste.querySelectorAll('i')]
      .filter((e) => !e.classList.contains('next-note')
        && !e.classList.contains('next-sprung')).length;
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
  for (let i = 0; i < state.waves.length; i++) {
    state.waveIndex = i;
    state.waveActive = false;
    ui.sync();
    const soll = { Schild: new Set<string>(), 'Träger': new Set<string>() };
    for (const g of state.waves[i].groups) {
      if (g.shield) soll.Schild.add(g.enemy);
      if (g.traeger) soll['Träger'].add(g.enemy);
    }
    mitSchild += soll.Schild.size ? 1 : 0;
    mitTraeger += soll['Träger'].size ? 1 : 0;
    for (const zeichen of ['Schild', 'Träger'] as const) {
      const gezeigt = [...liste.querySelectorAll('i')]
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
    state.waveActive = false;
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
  const { OBJECT_ART } = await import('../src/gfx/assets/objects');
  // Jetzt auch je Ausbaustufe: `waffe_frost_4` braucht `sockel_frost_4`.
  for (const id of ['arrow', 'frost', 'mortar', 'prism']) {
    for (const suffix of ['', '_1', '_2', '_3', '_4', '_5', '_6']) {
      const hatWaffe = `waffe_${id}${suffix}` in OBJECT_ART;
      const hatSockel = `sockel_${id}${suffix}` in OBJECT_ART;
      if (hatWaffe !== hatSockel) {
        problems.push(
          `Waffenebene ${id}${suffix}: ${hatWaffe ? 'Waffe ohne Sockel' : 'Sockel ohne Waffe'} - ` +
          'die Ebene braucht beide Teile, sonst bleibt sie ungenutzt.',
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
    if (knoepfe !== TOWER_ORDER.length) {
      problems.push(`Turmwahl: ${knoepfe} Knoepfe fuer ${TOWER_ORDER.length} Turmsorten.`);
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

// Die Baufeldpunkte bleiben oertlich.
//
// Auf der Frostkarte sind 311 Rasterstellen bebaubar. Zeigt man sie alle, liegt
// eine Tapete ueber der Landschaft - zweimal gemeldet als "passt nicht ins
// Level", und zweimal habe ich stattdessen an der Farbe gedreht. Die Auskunft
// wird nur dort gebraucht, wo der Finger ist.
{
  const quelle = readFileSync(new URL('../src/gfx/renderer.ts', import.meta.url), 'utf8');
  const stelle = quelle.indexOf('drawImage(this.buildFenster');
  if (stelle < 0) {
    problems.push('Baufelder: das oertliche Fenster fehlt - die Punkte liegen wieder ueber der ganzen Karte.');
  }
  if (/ctx\.drawImage\(this\.buildMask!, 0, 0\)/.test(quelle)) {
    problems.push('Baufelder: die volle Maske wird gezeichnet statt des Fensters um den Zeiger.');
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
    for (const t of state.towers) t.zielwahl = wahl;
    state.startWave();
    let summe = 0, weg = 0, n = 0;
    for (let i = 0; i < 60 * 60 && state.phase === 'playing'; i++) {
      state.update(1 / 60);
      for (const t of state.towers) {
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
  // Und dasselbe fuer das zweite Paar (TF-032). Gemessen wird die
  // zurueckgelegte STRECKE des anvisierten Gegners: mit "hinten" muss sie
  // unter der mit "vorn" liegen. Wieder eine Ordnung statt einer Grenze -
  // die Zahl selbst wandert mit jeder Balance-Runde, die Ordnung nicht.
  if (strecken.hinten >= strecken.vorn) {
    problems.push(
      `Ziellogik "hinten" wirkt nicht: sie visiert Gegner nach ${strecken.hinten.toFixed(0)} ` +
      `Weltpunkten an, "vorn" nach ${strecken.vorn.toFixed(0)} - hinten muesste darunter liegen.`,
    );
  }
  // Und die Einstellung muss den Spielstand ueberleben.
  {
    state.reset(999, 'normal', 'spiralhain');
    state.gold = 99999;
    const sp = candidateSpots(state)[0];
    state.build(sp.x, sp.y, 'arrow');
    state.towers[0].zielwahl = 'schwach';
    const stand = state.snapshot();
    const zweit = new GameState();
    if (!zweit.restore(stand)) {
      problems.push('Ziellogik: der Spielstand liess sich nicht zurueckladen.');
    } else if (zweit.towers[0]?.zielwahl !== 'schwach') {
      problems.push(
        `Ziellogik ueberlebt das Sichern nicht: gespeichert "schwach", geladen ` +
        `"${zweit.towers[0]?.zielwahl}".`,
      );
    }
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
  const turm = state.towers[0];

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
  state.reset(91, 'normal', 'spiralhain');
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
  state.reset(92, 'normal', 'spiralhain');
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
  state.reset(93, 'normal', 'spiralhain');
  state.abilityCd.bollwerk = 0; state.abilityCd.ernte = 0;
  state.cast('bollwerk', state.goal.x, state.goal.y);
  state.cast('ernte', 0, 0);
  const vorher = { b: state.abilityCd.bollwerk, e: state.abilityCd.ernte };
  if (vorher.b <= 0 || vorher.e <= 0) {
    problems.push('Faehigkeiten: nach dem Ausloesen laeuft keine Abklingzeit.');
  }
  const stand = state.snapshot();
  state.reset(93, 'normal', 'spiralhain');
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

// --- Kleinigkeiten in der Karte (D14).
//
// Zwei Fragen, und die zweite ist die wichtigere.
step('Beruehrbare Kleinigkeiten', () => {
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
    p.sell(p.towers[0]);
    for (let i = 0; i < 120; i++) p.update(DT);
    if (p.towers.length !== 0) throw new Error('Der Turm steht nach dem Verkauf noch da.');
    if (p.stats.damage <= vorher) {
      throw new Error('Das Geschoss des verkauften Turms hat keinen Schaden mehr gemacht - '
        + 'ein bezahlter Schuss darf nicht verfallen, weil der Turm weg ist.');
    }
  });

  step('Turm ausgebaut, waehrend sein Schuss fliegt', () => {
    const p = imFlug();
    if (!p) throw new Error('Es kam kein Geschoss in die Luft - die Probe misst nichts.');
    const unterwegs = p.projectiles[0].damage;
    const t = p.towers[0];
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
