/** Wie hoch werden die Baender ueber dem Spielfeld? (TF-023, TF-034)
 *
 *  Zwei Baender legen sich ueber das Feld: die Wellenvorschau unten und die
 *  Einweisungsblase oben. Beide wachsen mit ihrem Text, beide sind auf dem
 *  Telefon teuer - nach Kopfzeile und Leiste bleiben rund 230 von 390
 *  Punkten fuer das Brett.
 *
 *  **Warum es dieses Werkzeug gibt.** Das Browsertor misst den Streifen an
 *  der Welle, die es sieht: der ersten. Die ist die harmloseste - eine
 *  Gegnerart, ein kurzer Satz, 27 von 390 Bildpunkten. Welle 8 hat drei
 *  Arten und einen langen Erklaersatz, Welle 15 fuenf Arten.
 *
 *  Aufgefallen ist das, weil ein neues Zeichen ("Sprung") den Streifen auf
 *  Welle 8 von 52 auf 108 Bildpunkte trieb - 28 % der Bildhoehe, ueber der
 *  Grenze von 22 %. Das Browsertor haette es nie gesehen.
 *
 *  Gemessen wird mit ECHTEM Markup und ECHTER Stilvorlage: das Markup kommt
 *  aus der Oberflaeche des Spiels (in jsdom), die Stilvorlage aus
 *  `src/style.css`, zusammengesetzt in Chromium. Keines von beidem ist
 *  nachgebaut - jsdom kennt kein Layout, Chromium kennt das Spiel nicht,
 *  also muss jeder das tun, was er kann.
 *
 *  Aufruf: npx tsx tools/streifen.ts [--tor]
 *
 *  Messstelle (Regel 12): 844 x 390 in Chromium (iPhone quer), Stilvorlage
 *  `src/style.css` unveraendert, Markup aus `Ui.sync()`. Das Fenster muss
 *  genau dieses Mass haben: an ihm haengen `max-width: 58vw` und der ganze
 *  Kompaktblock unter `@media (max-height: 480px)`. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { browserStarten } from './chromium.mjs';
import { konterSatz, mitKonter } from '../src/data/konter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOR = process.argv.includes('--tor');
/** Wieviel der Bildhoehe die Vorschau hoechstens einnehmen darf. Dieselbe
 *  Zahl wie im Browsertor - sie steht dort in Prozent der Fensterhoehe. */
const ANTEIL = 0.22;
const SCHIRM_H = 390, BREITE = 844;

// --- Das Markup: die echte Oberflaeche in jsdom.
const dom = new JSDOM(readFileSync(join(ROOT, 'index.html'), 'utf8'),
  { pretendToBeVisual: true, url: 'https://local.test/' });
const win = dom.window;
const gradient = { addColorStop(): void { /* nichts */ } };
const noop = (): void => { /* nichts */ };
(win.HTMLCanvasElement.prototype as unknown as Record<string, unknown>).getContext =
  function getContext(this: unknown): unknown {
    const store: Record<string, unknown> = {};
    return new Proxy(store, {
      get: (t, k: string) => (k === 'canvas' ? this
        : k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern'
          ? () => gradient
          : k === 'measureText' ? () => ({ width: 12 })
            : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) })
              : k in t ? t[k] : noop),
      set: (t, k: string, v) => { t[k] = v; return true; },
    });
  };
// Dieselbe Reihenfolge wie im Rauchtest: `navigator` hat nur einen Lesezugang
// und muss ueber `defineProperty` gesetzt werden.
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
g.requestAnimationFrame = (cb: (t: number) => void): number => win.setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number): void => win.clearTimeout(id);

const { GameState } = await import('../src/game/state');
const { UI } = await import('../src/ui/ui');
const state = new GameState();
const ui = new UI(state);
state.reset(1, 'normal', 'spiralhain');
const liste = win.document.getElementById('n-list')!;
const streifen = win.document.getElementById('next')!;

const wellen: { nr: number; markup: string; sprung: string }[] = [];
for (let i = 0; i < state.waves.length; i++) {
  state.waveIndex = i;
  state.waveActive = false;
  ui.sync();
  wellen.push({ nr: i + 1, markup: liste.innerHTML, sprung: streifen.dataset.sprung ?? '0' });
}

// --- Die Hoehe: echte Stilvorlage in Chromium.
const css = readFileSync(join(ROOT, 'src/style.css'), 'utf8');
// In jsdom ist der Bildvorrat nicht geladen, also liefert `gegnerSymbol`
// nichts und die Oberflaeche faellt auf den Farbtupfer zurueck - 9 Punkte
// statt 17. Gemessen wuerde damit ein Streifen, den es im Spiel nicht gibt:
// jede Zeile acht Punkte zu niedrig (Regel 12). Der Tupfer wird deshalb
// durch ein leeres Bild MIT der echten Klasse ersetzt - die Groesse kommt
// dann wieder aus `src/style.css`, nicht von hier.
const LEER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const echt = (markup: string): string =>
  markup.replace(/<b style="[^"]*"><\/b>/g, `<img class="next-bild" src="${LEER}" alt="">`);
const bloecke = wellen.map((w) =>
  `<div style="width:${BREITE}px">`
  + `<div class="next" data-sprung="${w.sprung}" data-nr="${w.nr}">`
  + '<span class="next-lab">Als nächstes</span>'
  + `<div class="next-list">${echt(w.markup)}</div></div></div>`).join('');

// Genau 844 x 390 - nicht groesser (Regel 12). Zwei Stilregeln haengen
// daran, und beide wuerden bei einem bequemeren Fenster ausbleiben:
// `max-width: 58vw` am Streifen und der ganze Kompaktblock unter
// `@media (max-height: 480px)`. Auf 904 x 900 gemessen faellt der Streifen
// breiter und die Schrift groesser aus als auf dem Zielgeraet - dieselbe
// Zahl, andere Wirklichkeit. Die Wellen unterhalb des Fensterrands lassen
// sich trotzdem messen: `getBoundingClientRect` braucht keine Sicht.
const browser = await browserStarten();
const seite = await (await browser.newContext({
  viewport: { width: BREITE, height: SCHIRM_H }, deviceScaleFactor: 2,
})).newPage();
// Die Stilvorlage sperrt das Blaettern (das Spiel steht still auf dem
// Schirm). Fuers Bild muss das zurueck, sonst haelt `fullPage` bei 390
// Punkten an und die spaeten Wellen fehlen genau da, wo es eng wird. Auf
// die Streifenhoehe wirkt es nicht - `getBoundingClientRect` misst auch,
// was unter dem Rand liegt.
await seite.setContent(`<style>${css}</style>`
  + '<style>html, body { height: auto !important; overflow: visible !important; }</style>'
  + `<body style="background:#20242e;margin:0;padding:0">${bloecke}</body>`);
await seite.waitForTimeout(300);
// --- Und dasselbe fuer die Einweisungsblase (TF-034).
//
// Sie ist ein zweites Band mit demselben Risiko, und der laengste Satz ist
// derjenige, der es sprengt. Gemessen wird deshalb der laengste, den die
// Ableitung ueberhaupt hergibt - nicht ein beliebiger.
//
// Gemessen wird nicht der laengste Satz von heute, sondern der laengste, den
// `kontertor` ueberhaupt durchlaesst: 190 Zeichen. Sonst haengt die Zahl an
// einer Formulierung statt an einer Grenze - und der Lauf saehe gut aus,
// solange gerade niemand ausfuehrlich geschrieben hat.
const MAX_ZEICHEN = 190;
const echte = mitKonter().map((id) => konterSatz(id)!).sort((a, b) => b.length - a.length);
const saetze = [echte[0].padEnd(MAX_ZEICHEN, ' und so weiter'), ...echte];
//
// Die Blasen bleiben stehen, statt gemessen und weggeraeumt zu werden: das
// Bild ist der zweite Teil der Pruefung (Regel 8). Eine Zahl sagt, dass sie
// passt - ob der Satz auch LESBAR ist, sagt nur der Blick.
const blase = await seite.evaluate(([css2, ...alle]) => {
  const halter = document.createElement('div');
  halter.style.cssText = 'position:relative;width:844px';
  halter.innerHTML = `<style>${css2}</style>`
    + alle.map((satz) => '<div class="coach" style="position:static;margin-top:6px">'
      + `<p class="coach-text">${satz}</p>`
      + '<button class="coach-skip">Überspringen</button></div>').join('');
  document.body.appendChild(halter);
  return Math.round(
    (halter.querySelector('.coach') as HTMLElement).getBoundingClientRect().height);
}, [css, ...saetze] as string[]);

const hoehen = await seite.evaluate(() => [...document.querySelectorAll('.next')]
  .map((e) => ({
    nr: Number((e as HTMLElement).dataset.nr),
    h: Math.round(e.getBoundingClientRect().height),
    sprung: (e as HTMLElement).dataset.sprung === '1',
  })));
mkdirSync(join(ROOT, 'bilder'), { recursive: true });
writeFileSync(join(ROOT, 'bilder/wellenvorschau.png'), await seite.screenshot({ fullPage: true }));
await browser.close();

console.log('WELLENVORSCHAU\n');
let fehler = 0;
const grenze = SCHIRM_H * ANTEIL;
for (const h of hoehen) {
  const anteil = h.h / SCHIRM_H;
  const schlecht = anteil > ANTEIL;
  console.log(`  Welle ${String(h.nr).padStart(2)}: ${String(h.h).padStart(3)} Punkte `
    + `(${(anteil * 100).toFixed(0)} % der Bildhoehe)${h.sprung ? '   ▲ Sprung' : ''}`
    + `${schlecht ? '   ZU HOCH' : ''}`);
  if (schlecht) {
    console.error(`  FEHLER: Welle ${h.nr}: die Vorschau ist ${h.h} Punkte hoch, erlaubt sind `
      + `${grenze.toFixed(0)} (${(ANTEIL * 100).toFixed(0)} % von ${SCHIRM_H}).`);
    fehler++;
  }
}
const hoechste0 = hoehen.reduce((a, b) => (b.h > a.h ? b : a)).h;
// Nicht jedes Band fuer sich, sondern BEIDE ZUSAMMEN - denn zwischen zwei
// Wellen stehen sie gleichzeitig da. Eine Grenze je Band waere die Falle aus
// Regel 2 in klein: zweimal knapp bestanden ist einmal deutlich zuviel.
//
// Ein Drittel des Schirms, und die Zahl ist keine Wahl: nach Kopfzeile und
// Leiste bleiben auf dem Telefon rund 230 der 390 Punkte fuer das Brett
// (so steht es im Kompaktblock von `src/style.css`). Nehmen die Baender ein
// Drittel des ganzen Schirms, bleibt vom Brett gerade noch die Haelfte -
// darunter laesst sich nicht mehr entscheiden, wohin ein Turm soll.
const ZUSAMMEN = 1 / 3;
const summeGrenze = SCHIRM_H * ZUSAMMEN;
const summe = hoechste0 + blase;
console.log(`\n  Einweisungsblase: ${blase} Punkte bei ${saetze[0].length} Zeichen `
  + `(so lang, wie kontertor es zulaesst; der laengste echte Satz hat `
  + `${echte[0].length}).`);
console.log(`  Beide Baender zusammen: ${hoechste0} + ${blase} = ${summe} Punkte `
  + `(${((summe / SCHIRM_H) * 100).toFixed(0)} % der Bildhoehe, Grenze `
  + `${summeGrenze.toFixed(0)}).`);
if (summe > summeGrenze) {
  console.error(`  FEHLER: Wellenvorschau und Einweisungsblase nehmen zusammen ${summe} `
    + `Punkte, erlaubt sind ${summeGrenze.toFixed(0)} (${(ZUSAMMEN * 100).toFixed(0)} % von `
    + `${SCHIRM_H}). Vom Brett bliebe zu wenig uebrig, um zu entscheiden.`);
  fehler++;
}

const hoechste = hoehen.reduce((a, b) => (b.h > a.h ? b : a));
console.log(`\n  Hoechste: Welle ${hoechste.nr} mit ${hoechste.h} Punkten `
  + `(Grenze ${grenze.toFixed(0)}). Bild: bilder/wellenvorschau.png`);
console.log(`  Messstelle: ${BREITE} x ${SCHIRM_H} in Chromium (iPhone quer), `
  + 'src/style.css unveraendert - also mit `max-width: 58vw` und dem Kompaktblock '
  + 'unter `@media (max-height: 480px)`. Markup aus Ui.sync().');

if (fehler) { console.error(`\nBAENDER: ${fehler} Band/Baender zu hoch.`); if (TOR) process.exit(1); }
else console.log('\nBAENDER: Wellenvorschau und Einweisungsblase bleiben im Rahmen.');
