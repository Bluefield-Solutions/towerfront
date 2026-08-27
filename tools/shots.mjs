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
const { wirkungAnlegen } = await import('../src/data/wirkungen.ts');
const { candidateSpots } = await import('./spots.ts');
const { Menu } = await import('../src/game/menu.ts');
// Wichtig: nicht die has*-Funktionen. Die sagen nur, ob ein Bild im Verzeichnis
// steht - nicht, ob es dekodiert wurde. Genau daran ist die erste Gegenprobe
// vorbeigelaufen. Die get*-Funktionen liefern erst etwas, wenn das Bild da ist.
const { getBackground } = await import('../src/gfx/backgrounds.ts');
const { getObjectArt } = await import('../src/gfx/objectart.ts');
const { OBJECT_ART } = await import('../src/gfx/assets/objects.ts');
const { getTowerArt } = await import('../src/gfx/towerart.ts');
const { getEnemyArt } = await import('../src/gfx/enemyart.ts');
const { ENEMIES } = await import('../src/data/enemies.ts');

const DT = 1 / 60;

/** Der erste Turm, den der SPIELER gestellt hat.
 *
 *  Seit v165 steht die Zielunit als fuenfter Turm von Anfang an in
 *  `s.towers`, und zwar an Stelle NULL. Jede Messung hier meint aber den
 *  gebauten Turm. Die Verdeckungspruefung hat es sofort gezeigt: sie setzte
 *  ihren Testgegner hinter die ZIELUNIT statt hinter den Turm, und dort
 *  deckt ihn nichts - 100 Prozent verdeckt wurden zu 49. */
const ersterTurm = (g) => g.gebaute[0];

// **Alle Menueaufnahmen gehoeren in den Torlauf, nicht nur zwei.**
//
// Seit v172 blendet das Menue seine Ansichten ein, und der Waechter oben
// verwirft eine Aufnahme, die mitten im Wechsel faellt. In v177 hat er genau
// das gemeldet - aber erst im vollen Lauf: `menu-niederlage` stand mit zehn
// Bildern da und lag bei 0,93 von 1. Die Torkette faehrt nur den
// Querschnitt, also war `npm run bilder` fuenf Fassungen lang kaputt, ohne
// dass irgendetwas rot wurde. Ein Tor, das weniger prueft als das Werkzeug,
// das es bewacht, laesst genau die Luecke.
const TOR = ['menu-karte', 'menu-einweisung', 'menu-fortschritt', 'menu-sieg',
  'menu-niederlage', 'welle8'];
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
    // Einzelobjekte gehoeren mit angefordert: Tor, Kristall und die
    // Waffenebenen werden erst beim Zeichnen geladen, und der erste Aufruf
    // liefert nur null. Ohne diese Zeile erschienen sie auf keiner Aufnahme -
    // im Spiel schon, weil dort tausend Bilder folgen.
    for (const k of Object.keys(OBJECT_ART)) getObjectArt(k);
    getBackground(s.map.id);
    for (const id of TOWER_ORDER) getTowerArt(id, null, 1, s.map.id);
    for (const id of Object.keys(ENEMIES)) getEnemyArt(id, false, s.map.id);
  }
  await settle();


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
  // Ein Menue mitten im Ansichtswechsel ist kein Beleg.
  //
  // Seit v172 blendet das Menue seine Ansichten ein (D5). Wird eine Aufnahme
  // waehrend des Uebergangs gemacht, zeigt sie eine halb durchsichtige,
  // verschobene Oberflaeche - und die Bildpruefung dahinter urteilt ueber
  // etwas, das im Spiel niemals eine Zehntelsekunde lang stillsteht. Dieselbe
  // Lehre wie beim Kartenaufbau eine Zeile weiter unten.
  if (r.menu && r.menu.uebergang() < 1) {
    throw new Error(
      `Aufnahme mitten im Ansichtswechsel (${r.menu.uebergang().toFixed(2)} von 1). `
      + 'Der Aufbau muss genug Bilder laufen lassen, sonst zeigt das Bild einen Zustand, '
      + 'den es im Spiel nicht gibt.',
    );
  }

  // Den Kartenaufbau zu Ende rechnen, BEVOR das Bild faellt.
  //
  // Seit v113 verteilt sich der Aufbau ueber rund 28 Bilder. Hier werden nur
  // zwei gezeichnet - ohne diese Zeile zeigt die Aufnahme den gemalten
  // Ersatzuntergrund statt des Fotos. Genau so ist es passiert, und keines
  // der sechzehn Tore hat es gemeldet: die Bildpruefung fragt nach
  // einfarbigen Flaechen und falscher Helligkeit, und ein Farbverlauf besteht
  // beides.
  if (!r.menu) r.kartenaufbauAbschliessen(s);

  // Und dann nachfragen, statt es zu hoffen.
  //
  // Eine Aufnahme ist nur dann ein Beleg, wenn sie einen FERTIGEN Zustand
  // zeigt. Was dazu gehoert, weiss die Zeichenschicht - nicht dieses
  // Werkzeug. Frueher stand die Liste hier, und als in v113 der
  // Kartenaufbau dazukam, wurde sie nicht nachgezogen: die Aufnahmen zeigten
  // den gemalten Ersatzuntergrund, und alle sechzehn Tore blieben gruen.
  const offen = [...r.imAufbau(s), ...r.fehlendeBilder(s)];
  if (offen.length) {
    throw new Error(
      `beim Ausloesen war noch nicht fertig (${offen.length}): `
      + `${offen.slice(0, 4).join(', ')}${offen.length > 4 ? ' ...' : ''}`,
    );
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
/** Messungen ohne Bild - sie pruefen etwas, das eine einzelne Aufnahme
 *  nicht zeigen kann. */
const pruefungen = [];

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
  // 10 Bilder waren es bis v172, und das reichte fuer den Ansichtswechsel
  // nicht - die Aufnahme lag bei 0,93 von 1. Gefangen hat es der Waechter
  // oben, nicht das Auge: bei 93 Prozent Deckkraft sieht ein Bild richtig
  // aus sieht und es trotzdem nicht ist.
  return 20;
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
  // 20 statt 10, aus demselben Grund wie bei der Siegaufnahme: der
  // Ansichtswechsel braucht 0,18 Sekunden, und bei 10 Bildern faellt die
  // Aufnahme mitten hinein.
  return 20;
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

// --- Passt der Leerentitan auf die Strasse? (TF-030)
//
// Gemessen ist er 102 Bildpunkte breit, die engste Stelle 80. Ob das
// aussieht wie ein Riese oder wie ein Fehler, sagt keine Zahl (Regel 8).
takes.push(['titan-enge', () => shot('titan-enge', 844, 390, (s, r) => {
  // Ascheschlucht, nicht Spiralhain: dort ist der begehbare Weg mit 80
  // Weltpunkten am schmalsten. Auf dem Spiralhain sind es 84.
  s.reset(1, 'normal', 'ascheschlucht');
  s.waveIndex = s.waves.length - 1;
  s.startWave();
  const bahn = s.lanes[0];
  let ziel = null;
  // Ohne Tuerme laeuft der Kristall leer, bevor der Titan ueberhaupt
  // erscheint - dann zeigt die Aufnahme eine leere Strasse (der Fehler der
  // ersten Fassung). Der Kristall wird deshalb in jedem Bild aufgefuellt,
  // nicht hochgesetzt: bei 99999 Leben rechnet der Renderer einen
  // Leuchtkreis von 71000 Punkten und Skia bricht ab.
  for (let i = 0; i < 60 * 200 && !ziel; i++) {
    s.lives = s.maxLives;
    s.update(DT);
    ziel = s.enemies.find((e) => e.def === 'titan') ?? null;
  }
  if (ziel) {
    // An die engste Stelle der Bahn setzen - nicht warten, bis er zufaellig
    // dort steht. Gesucht wird sie am Weg selbst, nicht abgeschrieben.
    // Die engste Stelle des BEGEHBAREN Wegs, nicht die engste ueberhaupt.
    //
    // Bei s = 0 ist jede Bahn 80 Punkte breit - das ist das Tor, aus dem die
    // Gegner treten. Die erste Fassung dieser Aufnahme setzte den Titanen
    // genau dorthin, wo ihn das Tor verdeckte, und zeigte eine leere
    // Strasse. Gesucht wird deshalb im mittleren Drittel der Bahn - dort
    // liegt die Engstelle, die ein Spieler wirklich sieht.
    let engste = 0, engstesMass = Infinity;
    for (let sw = bahn.length * 0.15; sw < bahn.length * 0.85; sw += 8) {
      const h = bahn.at(sw).half;
      if (h < engstesMass) { engstesMass = h; engste = sw; }
    }
    ziel.travelled = engste;
    ziel.lane = 0;
    ziel.side = 0;
    s.update(DT);
  }
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

takes.push(['neue-gegner', () => shot('neue-gegner', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 5);
  s.waveIndex = 6;
  s.startWave();
  for (let i = 0; i < 60 * 10; i++) s.update(DT);
  const ziel = s.enemies[0];
  if (ziel) {
    r.resize();
    r.zoomAt(2.2, 422, 195);
    const p = r.worldToScreen(ziel.x, ziel.y);
    r.panBy(422 - p.x, 195 - p.y);
  }
  return 0;
})]);

takes.push(['zweige', () => shot('zweige', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  s.gold = 200000;
  const spots = candidateSpots(s);
  const bauten = [];
  for (const sp of spots) {
    if (bauten.length >= 4) break;
    if (s.build(sp.x, sp.y, bauten.length < 2 ? 'arrow' : 'frost')) bauten.push(s.towers[s.towers.length - 1]);
  }
  // Je zwei Tuerme, einer je Zweig, beide auf Stufe 4.
  bauten.forEach((t, i) => { for (let k = 0; k < 3; k++) s.upgrade(t, i % 2); });
  if (bauten[0]) {
    r.resize();
    r.zoomAt(2.4, 422, 195);
    const p = r.worldToScreen(bauten[0].x, bauten[0].y);
    r.panBy(422 - p.x + 120, 195 - p.y);
  }
  return 6;
})]);

takes.push(['bauvorschau', () => shot('bauvorschau', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  s.gold = 9000;
  const spots = candidateSpots(s);
  // Ein echter Turm, daneben die Vorschau desselben Turms - beide muessen
  // gleich gross sein.
  const echt = spots.find((p) => s.build(p.x, p.y, 'frost'));
  s.buildChoice = 'frost';
  if (echt) s.hoverPoint = { x: echt.x + 190, y: echt.y };
  if (echt) {
    r.resize();
    r.zoomAt(2.6, 422, 195);
    const p = r.worldToScreen(echt.x + 95, echt.y);
    r.panBy(422 - p.x, 195 - p.y);
  }
  return 4;
})]);

takes.push(['spalter', () => shot('spalter', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 6);
  s.waveIndex = 7;
  s.startWave();
  for (let i = 0; i < 60 * 14; i++) s.update(DT);
  const ziel = s.enemies.find((e) => e.def === 'splitling') ?? s.enemies[0];
  if (ziel) {
    r.resize();
    r.zoomAt(2.8, 422, 195);
    const p = r.worldToScreen(ziel.x, ziel.y);
    r.panBy(422 - p.x, 195 - p.y);
  }
  return 0;
})]);

takes.push(['schwenk', () => shot('schwenk', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 5);
  s.waveIndex = 7;
  s.startWave();
  for (let i = 0; i < 60 * 12; i++) s.update(DT);
  const turm = s.gebaute.find((t) => t.target) ?? ersterTurm(s);
  if (turm) {
    r.resize();
    r.zoomAt(2.6, 422, 195);
    const p = r.worldToScreen(turm.x, turm.y);
    r.panBy(422 - p.x, 195 - p.y);
  }
  return 2;
})]);

takes.push(['stufen', () => shot('stufen', 844, 390, (s, r) => {
  s.reset(1, 'normal', 'spiralhain');
  s.gold = 900000;
  // Vier Frosttuerme nebeneinander auf Stufe 1, 3, 5 und 6 - der Koerper muss
  // bei allen gleich gross sein, nur die Aufbauten wachsen.
  const stufen = [1, 3, 5, 6];
  let i = 0;
  for (const sp of candidateSpots(s)) {
    if (i >= 4) break;
    if (!s.build(sp.x, sp.y, 'frost')) continue;
    const t = s.towers[s.towers.length - 1];
    for (let k = 1; k < stufen[i]; k++) s.upgrade(t, 0);
    i++;
  }
  if (ersterTurm(s)) {
    r.resize();
    r.zoomAt(1.9, 422, 195);
    const p = r.worldToScreen(ersterTurm(s).x, ersterTurm(s).y);
    r.panBy(422 - p.x + 150, 195 - p.y);
  }
  return 4;
})]);

takes.push(['flecke', () => shot('flecke', 844, 390, (s) => {
  // Die Kleinigkeiten in der Karte, alle drei Arten auf einmal (v136).
  //
  // Die Frostspalte ist die einzige Karte, die alle drei traegt: Eis, blanken
  // Stein und lockeren Grund. Angetippt werden fuenf Flecke gleichzeitig -
  // im Spiel ginge das nicht, aber hier geht es darum, die drei Bewegungen
  // nebeneinander zu SEHEN. Kein Tor sagt, ob ein Spritzer wie ein Spritzer
  // aussieht.
  s.reset(1, 'normal', 'frostspalte');
  for (const g of s.map.rough) {
    if (['312:979', '194:915', '924:254', '1012:950', '828:808'].includes(`${g.x}:${g.y}`)) {
      s.beruehren(g.x, g.y);
    }
  }
  return 12;
})]);

takes.push(['einbettung', () => shot('einbettung', 844, 390, (s, r) => {
  // Ein einzelner Turm auf freiem Boden, weit weg von Weg und Felsen.
  //
  // Die Einbettung an einer vollen Kampfszene zu messen, ging schief: das
  // Vergleichsfeld landete mal auf Sand, mal auf Pflaster, und dieselbe Zahl
  // schwankte zwischen plus 14 und minus 57 Prozent. Eine Messung braucht
  // eine ruhige Stelle.
  s.reset(1, 'normal', 'spiralhain');
  s.gold = 900000;
  const ziel = { x: 980, y: 240 };
  s.build(ziel.x, ziel.y, 'frost');
  r.resize();
  r.zoomAt(2.2, 422, 195);
  const p = r.worldToScreen(ziel.x, ziel.y);
  r.panBy(422 - p.x, 195 - p.y);
  return 3;
})]);

takes.push(['vier', () => shot('vier', 844, 390, (s, r) => {
  // Alle vier Turmsorten nebeneinander auf freiem Boden, gleiche Stufe.
  s.reset(1, 'normal', 'spiralhain');
  s.gold = 900000;
  // Freie Plaetze suchen, statt feste Punkte zu raten - der erste Versuch
  // baute nur einen Turm, die anderen Stellen lagen auf Fels oder Weg.
  const sorten = ['arrow', 'frost', 'mortar', 'prism'];
  const gesetzt = [];
  for (const sp of candidateSpots(s)) {
    if (gesetzt.length >= 4) break;
    if (gesetzt.some((g) => Math.hypot(g.x - sp.x, g.y - sp.y) < 210)) continue;
    if (s.build(sp.x, sp.y, sorten[gesetzt.length])) gesetzt.push({ x: sp.x, y: sp.y });
  }
  const mx = gesetzt.reduce((a, g) => a + g.x, 0) / Math.max(1, gesetzt.length);
  const my = gesetzt.reduce((a, g) => a + g.y, 0) / Math.max(1, gesetzt.length);
  r.resize();
  r.zoomAt(1.7, 422, 195);
  const p = r.worldToScreen(mx, my);
  r.panBy(422 - p.x, 195 - p.y);
  return 3;
})]);

takes.push(['baumaske', () => shot('baumaske', 844, 390, (s, r) => {
  s.reset(3, 'normal', 'frostspalte');
  s.gold = 9000;
  s.buildChoice = 'frost';
  s.hoverPoint = { x: 900, y: 500 };
  r.resize();
  return 2;
})]);

takes.push(['pause', () => shot('pause', 844, 390, (s) => {
  s.reset(3, 'normal', 'spiralhain');
  stock(s, 4);
  s.startWave();
  for (let i = 0; i < 60 * 6; i++) s.update(DT);
  s.paused = true;
  return 0;
})]);

takes.push(['welle8', () => shot('welle8', 844, 390, (s) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 10);
  s.waveIndex = 7;
  s.startWave();
  return 60 * 12;
})]);

takes.push(['r4-bollwerk', () => shot('r4-bollwerk', 844, 390, (s) => {
  s.reset(5, 'normal', 'spiralhain');
  stock(s, 10);
  s.waveIndex = 9;
  s.startWave();
  for (let i = 0; i < 60 * 18; i++) s.update(DT);
  // Den dichtesten Pulk suchen und DORT absperren - sonst zeigt das Bild
  // einen Ring auf leerem Boden. (S93: auch ein Pruefbild braucht einen
  // Aufbau, der die Sache zeigt.)
  let best = null, bestN = 0;
  for (const a of s.enemies) {
    if (a.dead) continue;
    // Nur Gegner in der Bildmitte: der Ausschnitt ist 844x390 auf einer Welt
    // von 1920x1080, unten und oben wird beschnitten. Der erste Versuch
    // sperrte den dichtesten Pulk ab - und der lag halb ausserhalb.
    if (a.y < 300 || a.y > 800 || a.x < 350 || a.x > 1600) continue;
    let n = 0;
    for (const b of s.enemies) {
      if (b.dead) continue;
      if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= 150 ** 2) n++;
    }
    if (n > bestN) { bestN = n; best = a; }
  }
  if (!best) {
    // Die Lage mitgeben, nicht nur "nichts gefunden". Beim Aufbau dieser
    // Aufnahme habe ich zweimal daneben gegriffen - der Pulk lag erst halb
    // ausserhalb des Ausschnitts, dann noch unterhalb des Fensters. Ohne die
    // Koordinaten haette jeder Versuch neu geraten werden muessen.
    const lage = s.enemies.filter((e) => !e.dead)
      .map((e) => `${Math.round(e.x)},${Math.round(e.y)}`).join(' ');
    throw new Error(`r4-bollwerk: kein Gegner im Fenster. Lage der Gegner: ${lage}`);
  }
  s.abilityCd.bollwerk = 0;
  if (!s.cast('bollwerk', best.x, best.y)) throw new Error('r4-bollwerk: Bollwerk liess sich nicht ausloesen.');
  return 26;   // 0,43 s bei 0,8 s Lebensdauer: der Ring ist gross und noch da
})]);

takes.push(['d17-geschosse', () => shot('d17-geschosse', 844, 390, (s) => {
  // Alle vier Geschossformen zugleich in der Luft: beide Bogenzweige und
  // beide Moerserzweige. Sonst zeigt das Bild eine Form und beweist nichts.
  const aufbauen = (st) => {
    st.gold = 1000000;
    let i = 0;
    for (const sp of candidateSpots(st)) {
      if (i >= 8) break;
      const art = i % 2 === 0 ? 'arrow' : 'mortar';
      if (!st.build(sp.x, sp.y, art)) continue;
      const t = st.towerUnder(sp.x, sp.y, 1);
      if (!t) continue;
      // Auf Stufe 2 heben und den Zweig setzen - erst dort trennen sich die
      // Formen. Gerade und ungerade Zaehler bekommen verschiedene Zweige.
      const zweig = (i >> 1) % 2;
      st.upgrade(t, zweig);
      st.upgrade(t, zweig);
      i++;
    }
  };
  s.reset(3, 'normal', 'spiralhain');
  aufbauen(s);
  s.waveIndex = 9;
  s.startWave();
  // Den Augenblick suchen, in dem am meisten fliegt - statt eine Zeit zu
  // raten. Beim ersten Versuch war genau EIN Geschoss in der Luft, weil die
  // Gegner die Tuerme noch nicht erreicht hatten (S93: auch ein Pruefbild
  // braucht einen Aufbau, der die Sache zeigt).
  let bestF = 0, bestN = -1;
  const zaehlen = () => {
    const formen = new Set();
    for (const p of s.projectiles) {
      if (p.dead || !p.owner) continue;
      formen.add(`${p.owner.def}|${p.owner.branch}`);
    }
    // Vielfalt zaehlt mehr als Menge: vier Formen sind der Beleg.
    return formen.size * 100 + s.projectiles.length;
  };
  for (let f = 0; f < 60 * 30; f++) {
    s.update(DT);
    const n = zaehlen();
    if (n > bestN) { bestN = n; bestF = f; }
  }
  s.reset(3, 'normal', 'spiralhain');
  aufbauen(s);
  s.waveIndex = 9;
  s.startWave();
  for (let f = 0; f < bestF; f++) s.update(DT);
  console.log(`  (d17: ${Math.floor(bestN / 100)} Formen, ${bestN % 100} Geschosse bei Bild ${bestF})`);
  return 0;
})]);


takes.push(['c24-tor', () => shot('c24-tor', 844, 390, (s) => {
  // Der Augenblick, in dem das Tor ZU ist - sonst zeigt das Bild ein
  // offenes Tor und beweist nichts (S93).
  s.reset(31, 'normal', 'ascheschlucht');
  stock(s, 6);
  s.waveIndex = 6;
  s.startWave();
  let f = 0;
  while (f < 60 * 40 && !s.torZu(s.map.tor.bahn)) { s.update(DT); f++; }
  // Ein Stueck in die Sperre hinein, damit der Riegel voll steht.
  for (let i = 0; i < 90; i++) s.update(DT);
  if (!s.torZu(s.map.tor.bahn)) throw new Error('c24-tor: das Tor war nie zu.');
  return 0;
})]);

takes.push(['bauplaetze', () => shot('bauplaetze', 844, 390, (s) => {
  // Was der Spieler sieht, wenn er eine Turmart antippt und NICHT den Finger
  // aufs Feld legt - der Zustand auf dem Telefon.
  s.reset(3, 'normal', 'spiralhain');
  s.buildChoice = 'arrow';
  s.hoverPoint = null;
  s.pendingPoint = null;
  return 0;
})]);

// --- Kommt der Schuss aus dem Rohr? (TF-019)
//
// Eine Aufnahme mitten in der Salve, nah genug, dass man die Muendung sieht.
// Die Zahlen dazu stehen in `npm run muendung`; dieses Bild ist der Blick,
// den kein Tor ersetzt (Regel 8).
takes.push(['muendung', () => shot('muendung', 844, 390, (s) => {
  s.reset(5, 'normal', 'spiralhain');
  stock(s, 6);
  s.waveIndex = 6;
  s.startWave();
  // Genau das Bild, in dem ein Schuss frisch das Rohr verlaesst - der
  // Muendungsversatz haelt nur eine Zehntelsekunde, also sechs Bilder.
  // Abgezaehlt, nicht geraten: bei 127 steht ein Geschoss mit mehr als der
  // halben Versatzstaerke im Feld.
  return 127;
})]);

// --- Sieht man, WOHER es kommt? (TF-014)
//
// Gemessen liegen die Tore ausserhalb des Bildausschnitts: auf dem iPhone
// quer das des Spiralhains, auf dem Schreibtisch vier von sechs. Der Lauf
// beantwortet die Frage trotzdem - er kommt von dort herein.
//
// Das Bild faellt bei 40 % der Vorschau: da ist der Kopf mitten auf der Bahn
// und der Schweif voll ausgezogen.
takes.push(['wegvorschau', () => shot('wegvorschau', 844, 390, (s) => {
  s.reset(1, 'normal', 'ascheschlucht');
  return Math.round(60 * 2.5 * 0.4);
})]);

takes.push(['welle15', () => shot('welle15', 844, 390, (s) => {
  s.reset(1, 'normal', 'spiralhain');
  stock(s, 12);
  s.waveIndex = s.waves.length - 1;
  s.startWave();
  return 60 * 16;
})]);

// --- Nimmt "Bewegung reduziert" dem Bild wirklich Bewegung? (D6)
//
// Die Einstellung verspricht ein ruhigeres Feld. Ob sie es haelt, sagt kein
// Schalterstand, sondern nur ein Vergleich zweier Bilder: derselbe
// Zeitpunkt, dieselbe Karte, einmal voll und einmal reduziert - und
// dazwischen darf sich nichts anderes aendern.
//
// Gemessen wird der ruhende Fall ohne Welle. Genau dort muss der
// Unterschied stehen: Wetter und Ruckeln sind Stimmung, und wenn ein
// leeres Feld mit und ohne sie gleich aussieht, tut die Einstellung nichts.
pruefungen.push(async () => {
  const { getSettings, saveSettings } = await import('../src/core/storage.ts');
  const vorher = getSettings().bewegung;
  const bild = (modus) => {
    saveSettings({ bewegung: modus });
    const canvas = createCanvas(844 * 2, 390 * 2);
    Object.defineProperty(canvas, 'clientWidth', { get: () => 844 });
    Object.defineProperty(canvas, 'clientHeight', { get: () => 390 });
    const s = new GameState();
    const r = new Renderer(canvas);
    r.menu = null;
    s.reset(9, 'normal', 'spiralhain');
    r.resize();
    for (let i = 0; i < 120; i++) s.update(DT);
    r.kartenaufbauAbschliessen(s);
    r.draw(s); r.draw(s);
    return canvas.getContext('2d').getImageData(0, 0, 844 * 2, 390 * 2).data;
  };
  const voll = bild('voll');
  const ruhig = bild('reduziert');
  saveSettings({ bewegung: vorher });
  let anders = 0;
  for (let i = 0; i < voll.length; i += 4) {
    if (Math.abs(voll[i] - ruhig[i]) + Math.abs(voll[i + 1] - ruhig[i + 1])
      + Math.abs(voll[i + 2] - ruhig[i + 2]) > 6) anders++;
  }
  const anteil = anders / (voll.length / 4);
  // Das Wetter des Spiralhains deckt gemessen 0,47 Prozent der Bildpunkte
  // ab (v173). Die Grenze liegt darunter, damit sie nicht an einer
  // Nachkommastelle haengt - aber weit ueber null, denn null hiesse: die
  // Einstellung tut nichts.
  if (anteil < 0.002) {
    throw new Error(
      `Bewegung reduziert: nur ${(anteil * 100).toFixed(3)} % der Bildpunkte aendern sich gegenueber `
      + '"voll". Die Einstellung verspricht ein ruhigeres Feld und liefert dasselbe.',
    );
  }
  console.log(`Bewegung reduziert: ${(anteil * 100).toFixed(2)} % der Bildpunkte anders als bei voller Bewegung.`);
});

// --- Hat jede Karte ihr Wetter, und sind die drei zu unterscheiden? (D2)
//
// Gemessen wird die SCHICHT ALLEIN, auf schwarzem Grund. Ueber dem Feld
// waere sie nicht zu fassen: bei 0,15 bis 0,47 Prozent veraenderter
// Bildpunkte verschwindet sie in jeder Schwelle, die man gegen ein Foto
// setzt - und eine Messung, die ihren Gegenstand nicht sieht, bezeugt ihn
// nur (Regel 13).
//
// Und die zweite Frage ist die wichtigere: Aschefall darf nicht einfach
// beigefarbener Schnee sein. Beide sind herabfallender Staub, beide rund,
// beide langsam - was sie trennt, ist die GLUT: jede achte Flocke der
// Ascheschlucht ist ein warmer, pulsierender Punkt. Ohne sie unterscheiden
// sich die beiden allein im Farbton, und ein Farbton allein traegt bei zwei
// Bildpunkten Durchmesser nicht.
pruefungen.push(async () => {
  const { drawWetter } = await import('../src/gfx/atmosphere.ts');
  const messen = (art, ton, dicht) => {
    const cv = createCanvas(1920, 1080);
    const g = cv.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 1920, 1080);
    drawWetter(g, 12.5, dicht, art, ton);
    const d = g.getImageData(0, 0, 1920, 1080).data;
    let gesetzt = 0, glut = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] < 8) continue;
      gesetzt++;
      // Glut heisst NICHT "warm" - der Ascheton ist selbst warm (#E8C79A,
      // Blau/Rot 0,66), und ein Warmtest meldete mit abgeschalteter Glut
      // unveraendert 29 Prozent. Er hat sie bezeugt, ohne sie je zu messen
      // (Regel 13). Was nur die Glut hat, ist die SAETTIGUNG: #FF9A3C liegt
      // bei Blau/Rot 0,24.
      if (d[i] > 12 && d[i + 2] / d[i] < 0.45) glut++;
    }
    return { gesetzt, glutAnteil: gesetzt ? glut / gesetzt : 0 };
  };

  const zeilen = [];
  for (const m of MAPS) {
    const art = m.palette.wetter;
    if (art === 'keines') { zeilen.push(`  ${m.name}: kein Wetter`); continue; }
    const hoch = messen(art, m.palette.wetterTon, true);
    const niedrig = messen(art, m.palette.wetterTon, false);
    if (hoch.gesetzt < 800) {
      throw new Error(
        `Wetter ${m.name} (${art}): nur ${hoch.gesetzt} Bildpunkte gesetzt - das ist keine Stimmung, das ist nichts.`,
      );
    }
    // Niedrige Qualitaet duenn, aber NICHT aus: ein Ort, dessen Wetter auf
    // schwachen Geraeten verschwindet, waere dort ein anderer Ort.
    if (niedrig.gesetzt < 200 || niedrig.gesetzt >= hoch.gesetzt) {
      throw new Error(
        `Wetter ${m.name}: bei niedriger Qualitaet ${niedrig.gesetzt} gegen ${hoch.gesetzt} Bildpunkte - `
        + 'entweder ist es dort ganz weg oder es spart nichts.',
      );
    }
    if (art === 'asche' && hoch.glutAnteil < 0.05) {
      throw new Error(
        `Wetter ${m.name}: nur ${(hoch.glutAnteil * 100).toFixed(1)} % der Aschepunkte glimmen - `
        + 'ohne Glut ist Aschefall beigefarbener Schnee.',
      );
    }
    if (art !== 'asche' && hoch.glutAnteil > 0.01) {
      throw new Error(
        `Wetter ${m.name}: ${(hoch.glutAnteil * 100).toFixed(1)} % der Punkte glimmen - `
        + 'nur die Asche hat Glut.',
      );
    }
    zeilen.push(`  ${m.name}: ${art}, ${hoch.gesetzt} Punkte (niedrig ${niedrig.gesetzt}), `
      + `Glut ${(hoch.glutAnteil * 100).toFixed(1)} %`);
  }
  const arten = new Set(MAPS.map((m) => m.palette.wetter).filter((w) => w !== 'keines'));
  if (arten.size < 2) {
    throw new Error(`Wetter: nur ${arten.size} Art(en) im Spiel - dann trennt es die Orte nicht.`);
  }
  console.log('Wetter je Karte:');
  for (const z of zeilen) console.log(z);
});

// --- Steht ein ruhender Turm STILL? (Rueckbau von D18, v162)
//
// Von v116 bis v161 atmeten die Tuerme: zwei Weltpunkte auf und ab, damit
// ein ruhendes Feld kein Standbild ist. Der Nutzer hat es zweimal gemeldet
// und entschieden, dass ein Turm stillsteht. Hier standen deshalb frueher
// zwei Pruefungen, die das Gegenteil verlangten - DASS sich die Tuerme
// bewegen, und WO die Bewegung sitzt.
//
// Ersatzlos zu streichen waere falsch: dann waere der Rueckbau eine Zeile,
// die beim naechsten Umbau versehentlich zurueckkommt und die niemand
// bemerkt (Regel 5). Also dieselbe Messstelle, umgekehrte Frage.
//
// **Der Turm wird gefunden, nicht ausgerechnet.** Zu jedem Zeitpunkt ein
// Bild mit und eines ohne Turm; was sich unterscheidet, IST er. Der
// Bodennebel steht in beiden gleich und faellt dabei heraus - er bewegt
// sich weiter, und das soll er auch.
//
// **Koerper, nicht Schatten.** Ein Turm macht sein Bild dort heller, wo
// sein Koerper steht, und dunkler, wo seine Schatten liegen. Ohne diese
// Trennung fand die Vorgaengerfassung als Unterkante den Rand des
// Kontaktschattens - und der bewegt sich nie, ganz gleich was der Turm
// tut. Die Gegenprobe blieb dadurch gruen (Regel 13).
pruefungen.push(async () => {
  const rig = async (mitTurm) => {
    const canvas = createCanvas(844 * 2, 390 * 2);
    Object.defineProperty(canvas, 'clientWidth', { get: () => 844 });
    Object.defineProperty(canvas, 'clientHeight', { get: () => 390 });
    const s = new GameState();
    const r = new Renderer(canvas);
    r.menu = null;
    s.reset(9, 'normal', 'spiralhain');
    // Niedrige Qualitaet und keine Welle: gemessen werden soll der ruhende
    // Turm, nicht die Stimmung um ihn herum.
    s.quality = 'niedrig';
    s.gold = 99999;
    if (mitTurm) {
      const platz = candidateSpots(s)[0];
      if (!s.build(platz.x, platz.y, 'arrow')) throw new Error('Ruhepruefung: kein Turm setzbar.');
    }
    // Das Einfedern beim Bau ausklingen lassen - das ist eine Handlung und
    // darf sich bewegen; gemeint ist der Turm DANACH.
    //
    // In BEIDEN Laeufen, auch im leeren. Der erste Anlauf liess die Uhr nur
    // im Lauf mit Turm vorlaufen; damit stand der Bodennebel in den beiden
    // Bildern an verschiedenen Stellen, und die Messung meldete eine
    // Unterkante 314 Zeilen tiefer - Nebel, kein Turm.
    for (let i = 0; i < 120; i++) s.update(1 / 60);
    r.resize();
    r.draw(s);
    for (const k of Object.keys(OBJECT_ART)) getObjectArt(k);
    getBackground(s.map.id);
    for (const id of TOWER_ORDER) getTowerArt(id, null, 1, s.map.id);
    await settle();
    r.kartenaufbauAbschliessen(s);
    const fehlt = r.fehlendeBilder(s);
    if (fehlt.length) throw new Error(`Ruhepruefung ohne Bilder: ${fehlt.slice(0, 3).join(', ')}`);
    const g = canvas.getContext('2d');
    return {
      s,
      nimm: () => { r.draw(s); return g.getImageData(0, 0, canvas.width, canvas.height).data; },
      W: canvas.width, H: canvas.height,
    };
  };

  const mit = await rig(true);
  const ohne = await rig(false);
  const { W, H } = mit;
  // Acht Proben ueber gut drei Sekunden. So lang, weil die alte
  // Ruhebewegung eine Periode von 3,3 s hatte - eine kuerzere Reihe koennte
  // sie zwischen zwei Proben verstecken.
  const SCHRITT = 25;
  const oben = [], unten = [], flaeche = [];
  for (let probe = 0; probe < 8; probe++) {
    const a = mit.nimm(), b = ohne.nimm();
    let o = -1, u = -1, f = 0;
    for (let y = 0; y < H; y++) {
      let n = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (a[i] - b[i] > 20) n++;
      }
      f += n;
      // Mehr als sechs Punkte in einer Zeile: eine einzelne Kante aus dem
      // Kantenglaetten soll die Messung nicht verschieben.
      if (n > 6) { if (o < 0) o = y; u = y; }
    }
    if (o < 0) throw new Error('Ruhepruefung: der Turm ist im Bild nicht zu finden.');
    oben.push(o); unten.push(u); flaeche.push(f);
    for (let i = 0; i < SCHRITT; i++) { mit.s.update(1 / 60); ohne.s.update(1 / 60); }
  }
  const spanne = (v) => Math.max(...v) - Math.min(...v);
  const oS = spanne(oben), uS = spanne(unten);
  const fMittel = flaeche.reduce((a, b) => a + b, 0) / flaeche.length;
  // Die Flaeche steht daneben, ist aber KEIN Kriterium - sie misst die
  // Umgebung, nicht den Turm.
  //
  // Nachgemessen: sie schwankt um 1,5 % in einer glatten Kurve, und die
  // Kurve gehoert dem Lichtteich am Kristall (`lichtteich`, 1,4 rad/s, also
  // 4,5 s). Der hellt den Boden neben dem Turm auf und ab; damit wandert
  // der Abstand zwischen Turm und Boden ueber die Schwelle dieser Messung,
  // ohne dass sich am Turm etwas ruehrt. Eine Zahl, die sich ohne die Sache
  // aendert, misst die Sache nicht (Regel 13) - sie wird berichtet, damit
  // niemand sie noch einmal fuer eine Bewegung haelt, und nicht geprueft.
  console.log(`  ruhender Turm: Oberkante wandert ${oS} Bildzeilen, Unterkante ${uS} `
    + `(acht Proben ueber 3,3 s, Figur ${fMittel.toFixed(0)} Bildpunkte, 844 x 390 bei 2x)`);
  if (fMittel < 500) {
    throw new Error(`der Turm ist nur ${fMittel.toFixed(0)} Bildpunkte gross - `
      + 'dann misst diese Pruefung nicht den Turm, sondern das Rauschen.');
  }
  if (oS > 0 || uS > 0) {
    throw new Error(
      `ein ruhender Turm bewegt sich: Oberkante ${oS} Bildzeilen, Unterkante ${uS} `
      + '- zwischen zwei Wellen soll ein Turm stillstehen.',
    );
  }
});

// --- Verdeckt ein Turm einen Gegner, der HINTER ihm steht? (Stapel 3.1)
//
// Bis v139 nicht, und das war der groesste einzelne Posten fuer den
// Raumeindruck: gezeichnet wurde nach Kategorie - erst alle Tuerme, dann alle
// Gegner -, also lag jeder Gegner vor jedem Turm. Nichts verdeckte je etwas,
// und ein Feld aus plastischen Einzelbildern sah flach aus.
//
// Gemessen wird nicht "gibt es eine Sortierung", sondern die Wirkung: wie
// viele Bildpunkte des Gegners sind zu sehen, wenn er hinter dem Turm steht,
// und wie viele, wenn er davor steht? Ohne Sortierung sind beide Zahlen
// gleich - deshalb steht die Gegenrichtung in derselben Pruefung (Regel 13).
pruefungen.push(async () => {
  const sichtbar = async (dy) => {
    const canvas = createCanvas(844 * 2, 390 * 2);
    Object.defineProperty(canvas, 'clientWidth', { get: () => 844 });
    Object.defineProperty(canvas, 'clientHeight', { get: () => 390 });
    const s = new GameState();
    const r = new Renderer(canvas);
    r.menu = null;
    s.reset(3, 'normal', 'spiralhain');
    // Niedrige Qualitaet: kein Leuchten, kein Nebelflimmern. Gemessen werden
    // soll die Flaeche des Gegners, nicht die Stimmung um ihn herum.
    s.quality = 'niedrig';
    s.gold = 99999;
    const platz = candidateSpots(s)[0];
    if (!s.build(platz.x, platz.y, 'arrow')) throw new Error('Verdeckung: kein Turm setzbar.');
    const t = ersterTurm(s);
    r.resize();
    r.draw(s);
    for (const k of Object.keys(OBJECT_ART)) getObjectArt(k);
    getBackground(s.map.id);
    for (const id of TOWER_ORDER) getTowerArt(id, null, 1, s.map.id);
    for (const id of Object.keys(ENEMIES)) getEnemyArt(id, false, s.map.id);
    await settle();
    r.kartenaufbauAbschliessen(s);
    const fehlt = r.fehlendeBilder(s);
    if (fehlt.length) throw new Error(`Verdeckung ohne Bilder: ${fehlt.slice(0, 3).join(', ')}`);

    const g = canvas.getContext('2d');
    const nimm = () => {
      r.draw(s);
      return Uint8ClampedArray.from(g.getImageData(0, 0, canvas.width, canvas.height).data);
    };
    const ohne = nimm();
    const e = s.spawnZumPruefen('brute', 0, 0);
    if (!e) throw new Error('Verdeckung: kein Gegner setzbar.');
    e.x = t.x;
    e.y = t.y + dy;
    const mit = nimm();
    let anders = 0;
    for (let i = 0; i < ohne.length; i += 4) {
      if (Math.abs(ohne[i] - mit[i]) > 6 || Math.abs(ohne[i + 1] - mit[i + 1]) > 6) anders++;
    }
    return anders;
  };

  const hinten = await sichtbar(-30);
  const vorn = await sichtbar(30);
  const verdeckt = vorn > 0 ? (1 - hinten / vorn) * 100 : 0;
  console.log(`  Verdeckung: Gegner vor dem Turm ${vorn} Bildpunkte, dahinter ${hinten} `
    + `- ${verdeckt.toFixed(0)} % verdeckt`);
  if (vorn < 500) {
    throw new Error(`der Gegner ist vor dem Turm nur ${vorn} Bildpunkte gross - `
      + 'dann misst die Verdeckungspruefung nichts.');
  }
  // Die Grenze liegt dort, wo die beiden Faelle WIRKLICH auseinanderliegen.
  //
  // Gemessen mit Sortierung: 100 %. Ohne Sortierung: 16 % - nicht null, weil
  // ein Gegner auf dem grauen Bunkerkoerper weniger Bildpunkte veraendert
  // als auf dem braunen Boden. Das ist keine Verdeckung, sondern Aehnlichkeit
  // der Farben, und sie zaehlt hier faelschlich mit.
  //
  // Die alte Grenze war 15 % - gewaehlt, als der Bogenturm noch der schmale
  // Armbrustturm war und der Rest bei wenigen Prozent lag. Mit dem breiten,
  // hellgrauen Bunker aus v160 ist der Rest auf 16 % gewachsen, und die
  // Grenze trennte nichts mehr: die Gegenprobe "Szene ohne Tiefensortierung"
  // ist im vollen Lauf zu v162 als erste von 150 durchgefallen. Regel 2 in
  // neuer Kleidung - eine absolute Grenze, die still bedeutungslos wird,
  // weil sich das Gemessene aendert.
  //
  // 60 % laesst zu beiden Seiten vierzig Punkte Luft.
  if (verdeckt < 60) {
    throw new Error(
      `ein Gegner hinter einem Turm wird nur zu ${verdeckt.toFixed(0)} % verdeckt `
      + '- die Szene hat keine Tiefe, alles liegt in einer Ebene.',
    );
  }
});

// --- Sieht man einem gebremsten Gegner an, dass er gebremst ist? (v141)
//
// Bis v140 lag um jeden Gebremsten ein cyanfarbener Ring. Bei einem
// Frostturm ueber einer Traube waren das zwoelf Ringe uebereinander - ein
// Muster statt einer Auskunft, und es verdeckte genau die Gegner, um die es
// ging. Jetzt traegt die Figur selbst die Kaelte.
//
// Gemessen wird der Unterschied zwischen demselben Gegner mit und ohne
// Bremse. Bleibt er unter der Schwelle, sagt das Bild nichts - dann ist die
// Bremse eine Zahl im Modell und keine Auskunft auf dem Schirm.
pruefungen.push(async () => {
  const canvas = createCanvas(844 * 2, 390 * 2);
  Object.defineProperty(canvas, 'clientWidth', { get: () => 844 });
  Object.defineProperty(canvas, 'clientHeight', { get: () => 390 });
  const s = new GameState();
  const r = new Renderer(canvas);
  r.menu = null;
  s.reset(4, 'normal', 'spiralhain');
  s.quality = 'niedrig';
  r.resize();
  r.draw(s);
  for (const k of Object.keys(OBJECT_ART)) getObjectArt(k);
  getBackground(s.map.id);
  for (const id of Object.keys(ENEMIES)) getEnemyArt(id, false, s.map.id);
  await settle();
  r.kartenaufbauAbschliessen(s);
  const g = canvas.getContext('2d');
  const nimm = () => {
    r.draw(s);
    return Uint8ClampedArray.from(g.getImageData(0, 0, canvas.width, canvas.height).data);
  };
  const e = s.spawnZumPruefen('brute', 0, 0);
  if (!e) throw new Error('Bremsanzeige: kein Gegner setzbar.');
  e.travelled = s.lanes[0].length * 0.45;
  s.update(1 / 60);
  const frei = nimm();
  // Ueber die ECHTE Regel bremsen, nicht ueber die Felder.
  //
  // Bis v158 standen hier `e.slowLeft = 3; e.slowFactor = 0.5;`. Als TF-015
  // die beiden Felder durch die Wirkungsliste ersetzte, setzte dieses
  // Werkzeug zwei Felder, die es nicht mehr gibt - der Gegner war nie
  // gebremst, und der Frostueberzug fiel von 3409 auf NULL Bildpunkte. Die
  // Bildabnahme hat es gefangen; die Gegenprobe daneben konnte es nicht,
  // denn sie prueft nur, dass ein Eingriff das Tor rot macht - und rot war
  // es schon.
  //
  // Der fuenfte Fall in diesem Verzeichnis, in dem ein Werkzeug die Regel
  // nachbaut statt sie zu benutzen.
  e.wirkungen = wirkungAnlegen(e.wirkungen, 'bremse', 0.5, 3);
  const gebremst = nimm();
  let anders = 0;
  for (let i = 0; i < frei.length; i += 4) {
    if (Math.abs(frei[i] - gebremst[i]) > 8 || Math.abs(frei[i + 2] - gebremst[i + 2]) > 8) anders++;
  }
  console.log(`  Bremsanzeige: ${anders} Bildpunkte aendern sich, wenn ein Gegner bremst`);
  if (anders < 300) {
    throw new Error(`ein gebremster Gegner sieht zu ${anders} Bildpunkten anders aus als ein `
      + 'freier - man sieht der Figur die Bremse nicht an.');
  }
});

// --- Sieht man ohne liegenden Finger, wo man bauen darf? (TF-001)
//
// In v122 hing ein volles Punktraster ueber der ganzen Karte - auf der
// Frostspalte 311 Punkte, also eine Tapete. Die Antwort war, es nur noch
// unter dem Finger zu zeigen. Das war die halbe Loesung: `hoverPoint` gibt es
// nur fuer Maus und Stift, auf dem Telefon sah man ohne liegenden Finger
// GAR NICHTS.
//
// Gemessen wird genau dieser Zustand: eine Turmart ist gewaehlt, kein Finger
// liegt, kein Zeiger schwebt. Der Unterschied zum Bild ohne Turmwahl ist die
// Auskunft, die der Spieler bekommt.
pruefungen.push(async () => {
  const canvas = createCanvas(844 * 2, 390 * 2);
  Object.defineProperty(canvas, 'clientWidth', { get: () => 844 });
  Object.defineProperty(canvas, 'clientHeight', { get: () => 390 });
  const s = new GameState();
  const r = new Renderer(canvas);
  r.menu = null;
  s.reset(3, 'normal', 'spiralhain');
  s.quality = 'niedrig';
  r.resize();
  r.draw(s);
  for (const k of Object.keys(OBJECT_ART)) getObjectArt(k);
  getBackground(s.map.id);
  for (const id of TOWER_ORDER) getTowerArt(id, null, 1, s.map.id);
  await settle();
  r.kartenaufbauAbschliessen(s);
  const g = canvas.getContext('2d');
  const nimm = () => {
    r.draw(s);
    return Uint8ClampedArray.from(g.getImageData(0, 0, canvas.width, canvas.height).data);
  };

  s.buildChoice = null;
  s.hoverPoint = null;
  s.pendingPoint = null;
  const ohne = nimm();
  s.buildChoice = 'arrow';
  const mit = nimm();
  let anders = 0;
  for (let i = 0; i < ohne.length; i += 4) {
    if (Math.abs(ohne[i + 1] - mit[i + 1]) > 5 || Math.abs(ohne[i + 2] - mit[i + 2]) > 5) anders++;
  }
  console.log(`  Bauplaetze ohne Finger: ${anders} Bildpunkte Auskunft`);
  if (anders < 2000) {
    throw new Error(
      `nach der Turmwahl aendern sich nur ${anders} Bildpunkte - ohne liegenden `
      + 'Finger sieht der Spieler nicht, wo er bauen darf.',
    );
  }
  // Und die Gegenrichtung: es darf keine Tapete werden. Bei einem vollen
  // Raster ueber der halben Karte waeren es ueber 60 000.
  if (anders > 45000) {
    throw new Error(`die Bauauskunft bedeckt ${anders} Bildpunkte - das ist eine `
      + 'Tapete ueber der Landschaft, nicht eine Auskunft.');
  }
});

// --- Sieht man die Wegvorschau? (TF-014)
//
// Dieselbe Bauart wie darueber: dasselbe Bild einmal MIT laufender Vorschau
// und einmal ohne. Ohne den Vergleich wuerde die Pruefung den Bodennebel
// messen und die Vorschau bezeugen, ohne sie je gesehen zu haben (Regel 13).
//
// Gemessen wird auf der Ascheschlucht, weil sie drei Bahnen hat - eine
// Pruefung auf einer einbahnigen Karte saehe nicht, ob die Vorschau ALLE
// Bahnen zeigt.
pruefungen.push(async () => {
  const canvas = createCanvas(844 * 2, 390 * 2);
  Object.defineProperty(canvas, 'clientWidth', { get: () => 844 });
  Object.defineProperty(canvas, 'clientHeight', { get: () => 390 });
  const s = new GameState();
  const r = new Renderer(canvas);
  r.menu = null;
  s.reset(3, 'normal', 'ascheschlucht');
  s.quality = 'niedrig';
  r.resize();
  r.draw(s);
  for (const k of Object.keys(OBJECT_ART)) getObjectArt(k);
  getBackground(s.map.id);
  await settle();
  r.kartenaufbauAbschliessen(s);
  const g = canvas.getContext('2d');
  const nimm = () => {
    r.draw(s);
    return Uint8ClampedArray.from(g.getImageData(0, 0, canvas.width, canvas.height).data);
  };
  // Die Vorschau haengt an `time` gegen `wegvorschauAb`. Beide werden von
  // Hand gesetzt, damit das Bild reproduzierbar bei 40 % steht - nicht
  // "ungefaehr da, wo die Schleife gerade war".
  s.time = 1000;
  s.wegvorschauAb = -99;
  const ohne = nimm();
  s.wegvorschauAb = 1000 - 2.5 * 0.4;
  const mit = nimm();
  let anders2 = 0;
  for (let i = 0; i < ohne.length; i += 4) {
    if (Math.abs(ohne[i] - mit[i]) > 5 || Math.abs(ohne[i + 2] - mit[i + 2]) > 5) anders2++;
  }
  console.log(`  Wegvorschau: ${anders2} Bildpunkte zeigen den Weg`);
  if (anders2 < 1500) {
    throw new Error(`die Wegvorschau aendert nur ${anders2} Bildpunkte - man saehe nicht, `
      + 'woher die Gegner kommen.');
  }
  if (anders2 > 60000) {
    throw new Error(`die Wegvorschau bedeckt ${anders2} Bildpunkte - sie deckt die Karte zu, `
      + 'statt sie zu zeigen.');
  }
});

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
  for (const t of s.gebaute) { s.upgrade(t, 0); s.upgrade(t, 0); s.upgrade(t, 0); }
  s.selectedTower = ersterTurm(s) ?? null;
  s.waveIndex = 5;
  s.startWave();
  r.resize();
  const t = ersterTurm(s);
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

// Messungen ohne Bild - nach den Aufnahmen, damit der Bildvorrat steht.
for (const pruefung of pruefungen) {
  try {
    await pruefung();
  } catch (e) {
    probleme.push(e.message);
  }
}

if (probleme.length) {
  console.error(`\nBILDABNAHME: ${probleme.length} Problem(e)`);
  for (const p of probleme) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nBILDABNAHME: alle Aufnahmen plausibel.');
