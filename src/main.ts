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
import { messungAus, messungGewuenscht, messungLaeuft, messungStarten } from './core/messung';
import { bildspeicherByte } from './gfx/speicher';
import {
  type LaufZustand, laufStarten, laufLaden, laufSpeichern, laufLoeschen,
  abschnittGeschafft, abschnittWaehlen, laufendeKarte, istLaufZuEnde, erfahrungFuer,
} from './game/lauf';
import { laufErfahrungGutschreiben } from './core/storage';
import { MAPS } from './data/maps';
// **Die Kostentabelle wird seit v314 nicht mehr hierher gereicht**
// (S-N1-05). Sie musste es, solange die Ablage die ausgegebenen STERNE aus
// den gekauften Verbesserungen zurueckrechnen musste - dafuer brauchte sie
// deren Preise. Erfahrung wird beim Kauf abgezogen und nicht zurueckgerechnet,
// also weiss die Ablage wieder nichts ueber Spielinhalte.

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
/** **Der laufende Lauf** (v305, S-N1-03).
 *
 *  Er lebt hier, nicht im Spielzustand: eine Partie ist ein Abschnitt des
 *  Laufs, und zwischen zwei Abschnitten gibt es gar keine Partie. Gesichert
 *  wird er in einer eigenen Ablage (`laufSpeichern`), damit er einen
 *  Neustart genau an der Grenze uebersteht - das ist die dritte Abnahme der
 *  Story.
 *
 *  **Was der Lauf im Spiel heute TUT und was noch nicht.** Er waehlt den
 *  naechsten Abschnitt, und die angenommene Auflage wirkt: `laufDruck` auf
 *  die Lebenspunkte, `laufBeute` auf alles Gold. Er fuettert die
 *  Lebenskurve NICHT - `laufVersatz` und `laufWellen` bleiben im Spiel auf
 *  0, und zwar so lange, bis die Kurvenform steht (N1K). Ueber 60 Wellen
 *  gestreckt ist sie heute gemessen drei Spaziergaenge und eine Wand; sie
 *  jetzt einzuschalten hiesse, das Spiel gegen eine Zahl zu verschlechtern,
 *  die noch nicht stimmt. `npm run sim` faehrt sie trotzdem - dort steht
 *  der Befund, hier steht das Spiel. */
let lauf: LaufZustand | null = laufLaden();
menu.lauf = lauf;

function laufSetzen(l: LaufZustand | null): void {
  lauf = l;
  menu.lauf = l;
  if (l) laufSpeichern(l); else laufLoeschen();
}

/** **Einen Lauf beenden und seine Erfahrung gutschreiben** (v306, S-N1-04).
 *
 *  Die eine Stelle, an der ein Lauf endet - ob gewonnen, verloren oder
 *  aufgegeben. Drei Stellen waeren drei Gelegenheiten, das Gutschreiben zu
 *  vergessen, und dieses Verzeichnis hat genau diese Sorte Fehler sechsmal
 *  bezahlt.
 *
 *  `welleGesamt` bekommt die Wellen des angefangenen Abschnitts noch mit:
 *  wer in Welle neun eines Abschnitts faellt, hat neun Wellen gefahren, und
 *  genau dieser Posten trennt eine Niederlage von null. */
function laufBeenden(l: LaufZustand, geschafft: boolean, angefangeneWellen = 0): void {
  const stand = { ...l, welleGesamt: l.welleGesamt + angefangeneWellen };
  menu.erfahrungPlus = erfahrungFuer(stand, geschafft);
  laufErfahrungGutschreiben(menu.erfahrungPlus);
  laufSetzen(null);
}

/** Einen Abschnitt betreten - dieselbe Stelle fuer den ersten und jeden
 *  weiteren. Zwei Stellen waeren die naechste, die veraltet (Regel 15). */
function abschnittBetreten(mapId: string, difficulty: typeof state.difficulty,
  aussaat: number | undefined): void {
  state.reset(aussaat, difficulty, mapId, { endless: false });
  // NACH `reset`: die Auflage gehoert zum Abschnitt, nicht zur Karte.
  state.laufDruck = lauf?.druck ?? 1;
  state.laufBeute = lauf?.beute ?? 1;
  renderer.menu = null;
  ui.setSpielansicht(true);
}

menu.onWahl = (angebotId) => {
  if (!lauf) return;
  const nachher = abschnittWaehlen(lauf, angebotId);
  // Ein Angebot, das es nicht gibt, aendert nichts - dann bleibt das Bild
  // stehen, statt in eine Partie zu springen, die niemand gewaehlt hat.
  if (nachher === lauf) return;
  laufSetzen(nachher);
  const karte = laufendeKarte(nachher);
  if (!karte) return;
  menu.result = null;
  abschnittBetreten(karte, nachher.grad, undefined);
};

menu.onLaufEnde = () => {
  // Aufgeben ist auch ein Ende: was gefahren wurde, bleibt angerechnet.
  if (lauf) laufBeenden(lauf, false);
};

menu.onStart = (mapId, difficulty, endless) => {
  saveSettings({ map: mapId, difficulty });
  // Eine von Hand gesetzte Aussaat gilt fuer GENAU DIESE Partie und wird
  // danach vergessen (T10). Sie stehen zu lassen waere die schlimmere
  // Ueberraschung: wer einen Lauf einmal nachstellt, will nicht, dass die
  // naechsten zehn Partien dieselben sind, ohne dass es irgendwo steht.
  const aussaat = ui.wunschAussaat ?? undefined;
  ui.wunschAussaat = null;
  state.reset(aussaat, difficulty, mapId, { endless });
  // **Jede Partie von der Landkarte beginnt einen Lauf** - ausser dem
  // Endlosmodus, der gar keine Abschnitte hat: er endet nicht, also gibt es
  // keine Grenze, an der zu waehlen waere.
  //
  // Der Plan beginnt bei der gewaehlten Karte; was danach kommt, entscheidet
  // die Wahl an jeder Grenze. Er steht trotzdem vollstaendig da, weil er der
  // Nenner der Lebenskurve ist.
  if (endless) {
    laufSetzen(null);
  } else {
    laufSetzen(laufStarten(difficulty, state.seed,
      [mapId, ...MAPS.map((m) => m.id).filter((id) => id !== mapId)]));
  }
  state.laufDruck = 1;
  state.laufBeute = 1;
  renderer.menu = null;
  ui.setSpielansicht(true);
};
menu.onOptionen = () => ui.zeigeOptionen();
menu.onResume = () => {
  const save = loadGame();
  if (save && state.restore(save)) {
    renderer.menu = null;
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
  ui.setSpielansicht(false);
};

/** Das Ergebnis einer Partie - auf der Leinwand, in derselben Formensprache
 *  wie die Landkarte. */
function showResult(): void {
  // Eingetragen hat das Ergebnis der Spielzustand selbst, als die Partie zu
  // Ende ging. Hier wird nur noch abgelesen - siehe auswertung.ts.
  menu.result = auswertung(state);
  menu.resultAge = 0;
  // **Der Lauf geht an dieser Stelle einen Abschnitt weiter** (S-N1-03).
  //
  // Nur nach einem Sieg: eine Niederlage beendet den Lauf. Das ist der
  // Beschluss aus `Towerfront-NEUBAU.md` - ein Roguelite, in dem man nach
  // einem verlorenen Abschnitt weiterzieht, hat keinen Einsatz.
  menu.erfahrungPlus = null;
  if (lauf) {
    if (state.phase === 'won' && !state.endless) {
      const weiter = abschnittGeschafft(lauf, state.gold, state.lives, state.totalWaves);
      if (istLaufZuEnde(weiter)) laufBeenden(weiter, true);
      else laufSetzen(weiter);
    } else {
      laufBeenden(lauf, false, state.waveIndex);
    }
  }
  menu.view = 'result';
  renderer.menu = menu;
  ui.setSpielansicht(false);
}

menu.onRetry = () => {
  const r = menu.result;
  if (!r) return;
  state.reset(undefined, state.difficulty, r.mapId, { endless: menu.endless });
  menu.result = null;
  renderer.menu = null;
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

/** **Ein Messgriff, kein Spielweg** (v320, S-N4-06).
 *
 *  `npm run uxaudit` fragt, ob Bedienung ueber dem Bahnschlauch oder ueber
 *  einem Bauplatz liegt - und dafuer muss es Weltpunkte auf den Schirm
 *  rechnen. Diese Rechnung kennt nur der Renderer: sie haengt an Massstab,
 *  Mitte und Zoom, und ein zweiter Nachbau davon im Werkzeug waere Regel 15
 *  in ihrer teuersten Form - er stimmte solange, bis jemand am Zoom dreht.
 *
 *  Das Werkzeug klickt bis heute mit einer eigenen Faustformel ins Spiel
 *  (`nachSchirm`), und die rechnet EINPASSEND, waehrend der Renderer FUELLEND
 *  rechnet. Auf der Landkarte trifft sie, im Spiel nicht - dieselbe Zahl,
 *  andere Wirklichkeit (Regel 12).
 *
 *  Er haengt am `window` und nicht am Spielzustand: er liest, er schreibt
 *  nicht, und kein Spielweg fuehrt an ihm vorbei. Wer ihn entfernt, wird von
 *  `uxaudittor` erwischt - es meldet dann, dass es gar nicht messen kann.
 */
(window as unknown as Record<string, unknown>).weltZuSchirm =
  (x: number, y: number) => renderer.worldToScreen(x, y);

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
      // Ein Phasenwechsel fuehrt entweder zurueck auf die Landkarte oder
      // auf den Ergebnisbildschirm - beide liegen auf der Leinwand. Der
      // dritte Fall, "es geht wieder los", braucht nichts zu tun: die
      // Spielansicht leitet `ui.sync()` in jedem Bild aus `istMenuOffen()`
      // ab (Regel 6).
      if (state.phase === 'title') ui.openMenu();
      else if (state.phase !== 'playing') showResult();
    }
    ui.sync();
    // Jedes Bild abgeleitet, wie die Spielansicht: der Schalter setzt nur
    // die Einstellung, hier entsteht daraus die Tafel. Der Aufruf kehrt
    // sofort zurueck, wenn sich nichts geaendert hat.
    messtafelPflegen();
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
  // Gibt die Schleife endgueltig auf, soll der Spieler es erfahren - und
  // zwar mit dem Lauf im Textblock, damit er nachstellbar ist. Ein
  // eingefrorenes Bild ohne Wort daneben ist genau der Fall, den v161
  // schon einmal gekostet hat.
  (grund) => fehlerMelden(`Die Schleife hat aufgegeben: ${grund}`),
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
// **Ob die Tafel dasteht, wird jedes Bild abgeleitet** (Regel 6).
//
// Zwei Quellen schalten sie ein: der Schalter in der Kopfzeile (bleibt
// gespeichert) und `#messung` in der Adresse (gilt fuer diesen Besuch).
// Beide muenden hier, damit es keine Stelle gibt, an der man das Anlegen
// oder das Aufraeumen vergessen kann.
const messtafelPflegen = (): void => {
  const soll = getSettings().messung || messungGewuenscht();
  if (soll === messungLaeuft()) return;
  if (soll) messungAnlegen(); else messungAus();
};

function messungAnlegen(): void {
  // **Was die Tafel ausser Zahlen noch sagen muss.**
  //
  // Der erste Befund vom Zielgeraet lautete "ich konnte nichts mehr
  // anklicken, dann war der Bildschirm schwarz" - und aus dieser Runde ist
  // gelernt, dass hier kein Tor helfen kann. Also sagt die Tafel jetzt
  // selbst, welcher der Faelle es war. Jede Zeile trennt zwei Ursachen, die
  // von aussen gleich aussehen.
  let vorherBilder = -1;
  messungStarten(() => {
    const zeilen: [string, string, boolean?][] = [];

    // Steht die Schleife still, waehrend die Tafel weiterzaehlt? Dann ist
    // nicht das Geraet lahm, sondern das Spiel tot.
    const steht = loop.bilder === vorherBilder;
    vorherBilder = loop.bilder;
    zeilen.push(['Spielschleife',
      loop.laeuft() ? `${loop.bilder} Bilder${steht ? ' — STEHT' : ''}` : 'AUFGEGEBEN',
      steht || !loop.laeuft()]);
    if (loop.letzterFehler) zeilen.push(['Letzter Fehler', loop.letzterFehler, true]);

    // Ist die Leinwand schwarz, oder nur der Bildschirm? Zwei sehr
    // verschiedene Ursachen - gezeichnet wird nichts mehr, oder gezeichnet
    // wird und der Browser zeigt es nicht (Regel 11).
    let hell = 0;
    try {
      const ctx = canvas.getContext('2d');
      for (let i = 0; i < 24 && ctx; i++) {
        const x = Math.floor(canvas.width * (0.1 + 0.8 * (i % 6) / 5));
        const y = Math.floor(canvas.height * (0.1 + 0.8 * Math.floor(i / 6) / 3));
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] + d[1] + d[2] > 60) hell++;
      }
      zeilen.push(['Leinwand', `${canvas.width}×${canvas.height}, ${hell} von 24 Punkten hell`,
        hell === 0]);
    } catch (e) {
      zeilen.push(['Leinwand', `nicht lesbar: ${e instanceof Error ? e.message : e}`, true]);
    }

    // Der Hochkant-Hinweis deckt alles zu. Bleibt er nach dem Zurueckdrehen
    // stehen, ist genau das "nichts mehr anklickbar".
    const quer = document.getElementById('quer');
    const querAn = !!quer && getComputedStyle(quer).display !== 'none';
    const liegt = window.innerWidth > window.innerHeight;
    // Der Hinweis GEHOERT hochkant vor das Spiel - das ist kein Befund. Ein
    // Befund ist er nur, wenn er im Querformat stehen bleibt. Die erste
    // Fassung schrieb "LIEGT DRUEBER" in beiden Faellen und las sich damit
    // hochkant wie ein Fehler.
    zeilen.push(['Ausrichtung',
      liegt
        ? (querAn ? 'quer · Hinweis KLEBT FEST' : 'quer')
        : (querAn ? 'hochkant · Hinweis steht, richtig so' : 'hochkant · Hinweis FEHLT'),
      querAn === liegt]);

    zeilen.push(['Bildspeicher', `${(bildspeicherByte() / 1048576).toFixed(1)} MB`,
      bildspeicherByte() > 64 * 1048576]);
    zeilen.push(['Zustand', `${state.phase}${state.paused ? ' · pausiert' : ''}`
      + ` · Welle ${state.waveNumber}`]);
    return zeilen;
  });
}
messtafelPflegen();
