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

const DT = 1 / 60;

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
  const frames = build(s, r) ?? 0;
  r.resize();
  // Einmal zeichnen fordert alle Bilder an, dann warten, dann richtig laufen.
  r.draw(s);
  await settle();
  for (let i = 0; i < frames; i++) { s.update(DT); if (r.menu) r.menu.time += DT; r.draw(s); }
  r.draw(s);

  const file = join(OUT, `${name}.png`);
  writeFileSync(file, canvas.toBuffer('image/png'));
  return { name, file, w, h };
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

const list = wanted.length ? takes.filter(([n]) => wanted.includes(n)) : takes;
console.log(`Bildabnahme: ${list.length} Aufnahme(n)\n`);
for (const [, run] of list) {
  const t0 = Date.now();
  const r = await run();
  console.log(`  ${r.name.padEnd(14)} ${r.w}x${r.h}  ${((Date.now() - t0) / 1000).toFixed(1)} s  bilder/${r.name}.png`);
}
console.log('\nBILDABNAHME: fertig.');
