#!/usr/bin/env node
/**
 * Bildabnahme — echte Bildpunkte ohne Browser.
 *
 * Elf von 57 Befunden in diesem Projekt kamen aus Bildschirmfotos, die
 * jemand von Hand geschickt hat: Bedienung über dem Spielfeld, fehlende
 * Umlaute, unsichtbare Bauplätze, ein flachgedrücktes Feld. Kein Tor hat
 * davon je eines gefunden, weil alle Tore Verhalten prüfen und keines
 * Darstellung.
 *
 * Dieses Werkzeug schließt die Lücke. Es zeichnet das Spiel mit derselben
 * Zeichenschicht wie der Browser, nur auf eine Fläche, die PNG ausgeben kann.
 * Damit kann der Inspektor im Schleifenbetrieb das Ergebnis tatsächlich
 * ansehen, statt es zu erschließen.
 *
 * Aufruf:  npm run bilder            alle Aufnahmen
 *          npm run bilder -- welle8  nur eine
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, Image as NativeImage, GlobalFonts } from '@napi-rs/canvas';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'bilder');
mkdirSync(OUT, { recursive: true });
void GlobalFonts;

// Die Zeichenschicht erwartet ein Dokument, das Flächen anlegen kann.
// Mehr braucht sie nicht - kein DOM, kein Browser.
globalThis.document = {
  createElement: (tag) => {
    if (tag !== 'canvas') throw new Error(`nur canvas, nicht ${tag}`);
    const c = createCanvas(1, 1);
    // Die Zeichenschicht setzt width/height nach dem Anlegen.
    return c;
  },
};
globalThis.window = { devicePixelRatio: 2, innerWidth: 844, innerHeight: 390 };

/** Bilder aus Datenadressen.
 *
 *  Ohne das faellt die Zeichenschicht auf ihre gemalten Ersatzformen zurueck -
 *  und die Aufnahme zeigt ein anderes Spiel als der Browser. Genau der Fehler,
 *  den eine Bildabnahme verhindern soll.
 *
 *  Die native Bildklasse nimmt Datenadressen direkt an und meldet `onload`,
 *  also reicht es, sie durchzureichen. Gewartet wird ueber einen Zaehler. */
let outstanding = 0;
globalThis.Image = class extends NativeImage {
  set src(value) {
    outstanding++;
    const done = () => { outstanding--; };
    const prevLoad = this.onload, prevErr = this.onerror;
    this.onload = () => { done(); prevLoad?.(); };
    this.onerror = () => { done(); prevErr?.(); };
    super.src = value;
  }
  get src() { return super.src; }
};

/** Warten, bis alle angeforderten Bilder da sind. */
async function settle() {
  for (let i = 0; i < 40 && outstanding > 0; i++) {
    await new Promise((r) => setTimeout(r, 25));
  }
}

const { GameState } = await import('../src/game/state.ts');
const { Renderer } = await import('../src/gfx/renderer.ts');
const { MAPS } = await import('../src/data/maps.ts');
const { TOWERS, TOWER_ORDER } = await import('../src/data/towers.ts');
const { candidateSpots } = await import('./spots.ts');
const { Menu } = await import('../src/game/menu.ts');
// Wichtig: nicht die has*-Funktionen. Die sagen nur, ob ein Bild im Verzeichnis
// steht - nicht, ob es dekodiert wurde. Genau daran ist die erste Gegenprobe
// vorbeigelaufen. Die get*-Funktionen liefern erst etwas, wenn das Bild da ist.
const { getBackground } = await import('../src/gfx/backgrounds.ts');
const { getTowerArt } = await import('../src/gfx/towerart.ts');
const { getEnemyArt } = await import('../src/gfx/enemyart.ts');
const { ENEMIES } = await import('../src/data/enemies.ts');

const DT = 1 / 60;

const TOR = ['menu-karte', 'menu-einweisung', 'menu-sieg', 'welle8'];
const nurTor = process.argv.includes('--tor');

/** Eine Aufnahme: Zustand herstellen, ein paar Bilder laufen lassen, ausgeben.
 *
 *  Die Vorlaufbilder sind wichtig: Partikel, Federn und Nachlauf brauchen
 *  ein paar Schritte, sonst sieht man einen Zustand, den es im Spiel so nie
 *  gibt. */
async function shot(name, w, h, build) {
  const canvas = createCanvas(Math.round(w * 2), Math.round(h * 2));
  // Der Renderer misst die Flaeche ueber clientWidth/clientHeight.
  Object.defineProperty(canvas, 'clientWidth', { get: () => w });
  Object.defineProperty(canvas, 'clientHeight', { get: () => h });

  const s = new GameState();
  const r = new Renderer(canvas);
  r.menu = null;
  // Im Torlauf wird kuerzer simuliert: es geht um "sieht es richtig aus",
  // nicht um einen bestimmten Spielstand. Das halbiert die Laufzeit.
  const frames = build(s, r) ?? 0;
  r.resize();
  // Erst alle Bilder anfordern, dann warten, dann pruefen.
  //
  // Ein Gegnerbild wird sonst erst geladen, wenn dieser Gegner auftaucht -
  // die Pruefung meldete deshalb sieben fehlende Bilder, obwohl alles in
  // Ordnung war. Ein falscher Alarm ist genauso schaedlich wie ein
  // uebersehener Fehler: nach dem dritten glaubt ihn niemand mehr.
  r.draw(s);
  if (!r.menu) {
    getBackground(s.map.id);
    for (const id of TOWER_ORDER) getTowerArt(id, null, 1, s.map.id);
    for (const id of Object.keys(ENEMIES)) getEnemyArt(id, false, s.map.id);
  }
  await settle();

  // Sind die eingebetteten Bilder wirklich angekommen?
  //
  // Die Farbzaehlung taugt dafuer nicht - das hat die Gegenprobe gezeigt:
  // ohne dekodierte Bilder malt die Ersatzschicht Verlaeufe, und die bringen
  // genug Farben mit, um jede Schwelle zu passieren. Also wird direkt
  // gefragt, statt geraten.
  if (!r.menu) {
    const fehlt = [];
    if (!getBackground(s.map.id)) fehlt.push(`Untergrund ${s.map.id}`);
    for (const id of TOWER_ORDER) if (!getTowerArt(id, null, 1, s.map.id)) fehlt.push(`Turm ${id}`);
    for (const id of Object.keys(ENEMIES)) if (!getEnemyArt(id, false, s.map.id)) fehlt.push(`Gegner ${id}`);
    if (fehlt.length) {
      throw new Error(
        `Bilder nicht dekodiert (${fehlt.length}): ${fehlt.slice(0, 4).join(', ')}` +
        `${fehlt.length > 4 ? ' ...' : ''}`,
      );
    }
  }

  // Simulieren ist billig, Zeichnen ist teuer: 200 Simulationsschritte kosten
  // 10 Millisekunden, ein gezeichnetes Bild 180. Frueher wurde jedes Bild
  // gezeichnet, um am Ende genau eines zu behalten - das allein machte die
  // Bildabnahme von Sekunden auf Minuten lang. Jetzt laeuft die Simulation
  // durch und gezeichnet werden nur die letzten beiden Bilder: eines, damit
  // sich Schweife und Federn einschwingen, und das, was gespeichert wird.
  for (let i = 0; i < frames; i++) {
    s.update(DT);
    if (r.menu) { r.menu.time += DT; r.menu.resultAge += DT; }
  }
  r.draw(s);
  s.update(DT);
  r.draw(s);

  const file = join(OUT, `${name}.png`);
  writeFileSync(file, canvas.toBuffer('image/png'));
  return { name, file, w, h, befund: pruefen(name, canvas) };
}

/** Was auf dem Bild zu sehen ist - als Zahlen.
 *
 *  Eine Aufnahme im Tor nuetzt nichts, wenn niemand hinsieht. Deshalb rechnet
 *  das Werkzeug drei Dinge aus, die ohne Auge auskommen und genau die Faelle
 *  fangen, die uns schon getroffen haben:
 *
 *   - Streuung der Helligkeit. Nahe null heisst: einfarbige Flaeche. Das ist
 *     der schwarze Bildschirm, den die Safari-Falle erzeugt hat.
 *   - Mittlere Helligkeit. Zu dunkel oder zu hell heisst: da ist etwas
 *     grundlegend schief.
 *   - Zahl verschiedener Farben. Zu wenige heisst: die Bilder wurden nicht
 *     dekodiert und es sind nur die gemalten Ersatzformen zu sehen.
 */
function pruefen(name, canvas) {
  const g = canvas.getContext('2d');
  const { data, width, height } = g.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0, sum2 = 0, n = 0;
  const farben = new Set();
  // Jeder achte Bildpunkt reicht und kostet fast nichts.
  for (let i = 0; i < data.length; i += 4 * 8) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += l; sum2 += l * l; n++;
    farben.add(((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3));
  }
  const mittel = sum / n;
  const streuung = Math.sqrt(Math.max(0, sum2 / n - mittel * mittel));
  void width; void height;
  const probleme = [];
  if (streuung < 8) probleme.push(`fast einfarbig (Streuung ${streuung.toFixed(1)})`);
  if (mittel < 12) probleme.push(`fast schwarz (Helligkeit ${mittel.toFixed(0)})`);
  if (mittel > 235) probleme.push(`fast weiss (Helligkeit ${mittel.toFixed(0)})`);
  // Die Farbschwelle haengt davon ab, was zu sehen sein SOLL. Eine Menuetafel
  // ist von Hand gezeichnet und flach - 167 Farben sind dort richtig. Ein
  // Spielfeld zeigt ein Foto; bleiben dort die Farben aus, wurden die
  // eingebetteten Bilder nicht dekodiert, und die Aufnahme zeigt ein anderes
  // Spiel als der Browser.
  // Die Schwelle ist bewusst niedrig: die eigentliche Pruefung auf nicht
  // dekodierte Bilder fragt weiter unten die Bildschicht direkt. Diese hier
  // faengt nur den groben Fall. Bei einer Nahaufnahme fuellt der Weg das
  // halbe Bild, und 836 Farben sind dort voellig richtig - eine zu hohe
  // Schwelle waere ein Fehlalarm, und nach dem dritten glaubt ihn niemand.
  const mindestens = name.startsWith('menu') ? 90 : 500;
  if (farben.size < mindestens) {
    probleme.push(`nur ${farben.size} Farben, erwartet ${mindestens} - Bilder vermutlich nicht dekodiert`);
  }
  return { mittel, streuung, farben: farben.size, probleme };
}

/** Ein Feld aufbauen, wie es ein Spieler in dieser Welle haette. */
function stock(s, count, plan = TOWER_ORDER) {
  s.gold = 100000;
  const spots = candidateSpots(s);
  let i = 0;
  for (const sp of spots) {
    if (i >= count) break;
    if (s.build(sp.x, sp.y, plan[i % plan.length])) i++;
  }
  s.gold = 400;
}

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// Fuer die Torkette: nur ein Querschnitt, damit die Kette nicht auf das
// Dreifache waechst. Die Bildabnahme von Hand nimmt weiterhin alles auf.

const takes = [];

// --- Handy quer, das wichtigste Format
// --- Das Menue: seit v42 auf der Leinwand, also endlich sichtbar.
takes.push(['menu-karte', () => shot('menu-karte', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  r.menu = new Menu();
  r.menu.hasSave = true;
  r.menu.saveLabel = 'Fortsetzen · Welle 7';
  return 20;
})]);

takes.push(['menu-einweisung', () => shot('menu-einweisung', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  r.menu = new Menu();
  r.menu.view = 'brief';
  r.menu.picked = 1;
  return 20;
})]);

takes.push(['menu-fortschritt', () => shot('menu-fortschritt', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  r.menu = new Menu();
  r.menu.view = 'progress';
  return 20;
})]);

takes.push(['menu-sieg', () => shot('menu-sieg', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  r.menu = new Menu();
  r.menu.view = 'result';
  r.menu.resultAge = 2;
  r.menu.result = {
    won: true, mapId: 'spiralhain', mapName: 'Spiralhain', wave: 15, waves: 15,
    lives: 47, maxLives: 60, stars: 2, before: 1,
    kills: 214, built: 9, damage: 98000, duration: 512,
  };
  return 10;
})]);

takes.push(['menu-niederlage', () => shot('menu-niederlage', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'frostspalte');
  r.menu = new Menu();
  r.menu.view = 'result';
  r.menu.resultAge = 2;
  r.menu.result = {
    won: false, mapId: 'frostspalte', mapName: 'Frostspalte', wave: 12, waves: 15,
    lives: 0, maxLives: 60, stars: 0, before: 0,
    kills: 168, built: 8, damage: 71000, duration: 402,
  };
  return 10;
})]);

takes.push(['start', () => shot('start', 844, 390, (s) => {
  s.reset(1, 'normal', 'spiralhain');
  return 30;
})]);

takes.push(['bauauswahl', () => shot('bauauswahl', 844, 390, (s) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 4);
  s.gold = 900;
  s.buildChoice = 'mortar';
  const sp = candidateSpots(s)[6];
  s.hoverPoint = { x: sp.x, y: sp.y };
  return 30;
})]);

takes.push(['infanterie-nah', () => shot('infanterie-nah', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  s.waveIndex = 3;
  s.startWave();
  // Erst laufen lassen, dann die Kamera auf einen echten Gegner richten -
  // sonst zeigt die Nahaufnahme eine leere Wiese.
  for (let i = 0; i < 60 * 8; i++) s.update(DT);
  const ziel = s.enemies.find((e) => e.def === 'infantry') ?? s.enemies[0];
  if (ziel) {
    r.resize();
    r.zoomAt(3.4, 422, 195);
    const p = r.worldToScreen(ziel.x, ziel.y);
    r.panBy(422 - p.x, 195 - p.y);
  }
  return 0;
})]);

takes.push(['infanterie', () => shot('infanterie', 844, 390, (s) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 6);
  s.waveIndex = 3;
  s.startWave();
  return 60 * 9;
})]);

takes.push(['welle8', () => shot('welle8', 844, 390, (s) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 10);
  s.waveIndex = 7;
  s.startWave();
  return 60 * 12;
})]);

takes.push(['welle15', () => shot('welle15', 844, 390, (s) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 12);
  s.waveIndex = s.waves.length - 1;
  s.startWave();
  return 60 * 16;
})]);

// --- Die anderen Karten
for (const m of MAPS.slice(1)) {
  takes.push([m.id, () => shot(m.id, 844, 390, (s) => {
    s.reset(1, 'normal', m.id);
    stock(s, 8);
    s.waveIndex = 6;
    s.startWave();
    return 60 * 10;
  })]);
}

// --- Schreibtischformat, damit auch das geprueft wird
takes.push(['breit', () => shot('breit', 1440, 780, (s) => {
  s.reset(1, 'normal', 'laubschlucht' in MAPS ? 'laubschlucht' : MAPS[1].id);
  stock(s, 10);
  s.waveIndex = 9;
  s.startWave();
  return 60 * 10;
})]);

// --- Ganz nah heran: sieht ein einzelner Turm gut aus?
takes.push(['nah', () => shot('nah', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 6);
  s.gold = 100000;
  for (const t of s.towers) { s.upgrade(t, 0); s.upgrade(t, 0); s.upgrade(t, 0); }
  s.selectedTower = s.towers[0] ?? null;
  s.waveIndex = 5;
  s.startWave();
  r.resize();
  const t = s.towers[0];
  if (t) { r.zoomAt(2.6, 422, 195); r.panBy((422 - t.x) * 0, 0); }
  return 60 * 6;
})]);

const auswahl = nurTor ? TOR : wanted;
const list = auswahl.length ? takes.filter(([n]) => auswahl.includes(n)) : takes;
console.log(`Bildabnahme: ${list.length} Aufnahme(n)\n`);
const probleme = [];
for (const [, run] of list) {
  const t0 = Date.now();
  const r = await run();
  const b = r.befund;
  console.log(
    `  ${r.name.padEnd(16)} ${r.w}x${r.h}  ${((Date.now() - t0) / 1000).toFixed(1)} s  ` +
    `Helligkeit ${b.mittel.toFixed(0).padStart(3)}  Streuung ${b.streuung.toFixed(0).padStart(3)}  ` +
    `${String(b.farben).padStart(4)} Farben` +
    (b.probleme.length ? `   ${b.probleme.join(', ')}` : ''),
  );
  for (const p of b.probleme) probleme.push(`${r.name}: ${p}`);
}

if (probleme.length) {
  console.error(`\nBILDABNAHME: ${probleme.length} Problem(e)`);
  for (const p of probleme) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nBILDABNAHME: alle Aufnahmen plausibel.');
