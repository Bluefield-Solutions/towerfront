#!/usr/bin/env node
/**
 * Kartenwechsel — was kostet es, eine Karte aufzubauen?
 *
 * D23 stand vier Runden im Verzeichnis mit dem Satz „kein Tor sieht das".
 * Der Satz stimmte. Dieses Werkzeug schliesst die Luecke — und der Weg dahin
 * war lehrreicher als das Ergebnis.
 *
 * ## Was gemessen wurde
 *
 * Meine eigene Schaetzung im Verzeichnis lautete „88 bis 135 ms je
 * Kartenwechsel, auf dem iPhone vermutlich das Dreifache". Sie war um eine
 * Groessenordnung zu niedrig, weil sie `bakeTerrain` allein in Node mass und
 * nicht das erste Bild im Browser. Gemessen im gebauten Stand, Chromium auf
 * 844x390 mit vierfacher CPU-Drossel:
 *
 *     schlimmste Hauptstrang-Aufgabe   1372 ms
 *     zweitschlimmste                  1013 ms
 *
 * Zwei Aufgaben, weil zweimal gebacken wird: einmal sofort ohne Bild (billig,
 * 2 bis 8 ms) und einmal, sobald das Untergrundbild dekodiert ist (teuer).
 *
 * ## Wo die Zeit steckte
 *
 * Ueber der Punkteschleife stand die Behauptung, eine Nachschlagetabelle mache
 * „den Unterschied zwischen einem spuerbaren Ruckler beim Kartenwechsel und
 * keinem". Kein Tor hat sie je geprueft, und sie war falsch. Aufgeteilt:
 *
 *     getImageData   128 ms      Bildpunkte von der Grafikkarte holen
 *     Schleife        37 ms      die eigentliche Rechnung
 *     putImageData   112 ms      und wieder zurueck
 *
 * Ueber vier Fuenftel sind Umzug, nicht Rechnung. Ich hatte zuerst die
 * Schleife verbessert — die sichtbare Stelle — statt die Teile zu messen.
 * Regel 9 gilt auch innerhalb einer Funktion.
 *
 * ## Warum das Tor keine Millisekunden zaehlt
 *
 * Weil es dann kein Tor waere, sondern ein Wuerfel. Sieben Laeufe bei
 * unveraendertem, bereits verbessertem Stand ergaben 662, 724, 771, 820, 939,
 * 1106 und 1322 ms — Faktor zwei zwischen bestem und schlechtestem Lauf. Ein
 * Budget, das 1322 durchlaesst, faengt den alten Zustand (1372, 1164) nicht
 * mehr. Die Verbesserung ist im Mittel deutlich und im Einzellauf unbeweisbar;
 * beides gehoert gesagt.
 *
 * Gezaehlt wird deshalb das, was die Kosten VERURSACHT und sich nicht mit der
 * Maschine aendert: **wieviele Millionen Bildpunkte je Kartenwechsel bewegt
 * werden.** Das ist derselbe Weg, den `bench-draw` seit v10 geht — dort
 * Zeichenbefehle statt Millisekunden, hier Bildpunkte.
 *
 * ## Das Soll kommt von aussen
 *
 * Nicht von mir (Regel 10). Kingdom Rush und Bloons TD 6 bauen eine Stufe
 * hinter einem Ladeschritt auf, nie in einem laufenden Bild. Die Web-Norm
 * dazu ist scharf: eine Hauptstrang-Aufgabe ueber **50 ms** blockiert
 * Eingaben, ab **100 ms** fuehlt sich nichts mehr unmittelbar an; Lighthouse
 * bildet ein Telefon mit vierfacher CPU-Drossel ab.
 *
 * Davon sind wir weit entfernt, und das Tor tut nicht so, als waere es
 * anders: es haelt den erreichten Stand fest und meldet den Abstand zum Soll
 * bei jedem Lauf. Ein Tor, das gruen meldet, wo das Soll verfehlt ist, waere
 * schlimmer als keines.
 *
 * Aufruf:
 *   npm run kartenwechsel              das Tor (schnell, ohne Browser)
 *   npm run kartenwechsel -- --browser zusaetzlich im Browser mit Drossel
 */
import { createCanvas, Image as NativeImage } from '@napi-rs/canvas';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Obergrenze in Millionen Bildpunkten je Kartenwechsel.
//
// Heute gemessen: 4,15 Mpx (ein getImageData und ein putImageData ueber
// 1920x1080). Das Budget laesst genau einen weiteren halben Durchgang zu —
// wer einen zweiten Punktdurchlauf einbaut, faellt auf.
const BUDGET_MPX = 5.5;

// Die Norm, gegen die gemessen wird. Nicht erreichbar mit dem heutigen
// Aufbau, aber sie steht hier, damit der Abstand sichtbar bleibt.
const SOLL_MS = 50;

// --- Die Zeichenschicht braucht ein Dokument. Und wir brauchen einen Zaehler
// darin: jedes getImageData und putImageData wird mitgeschrieben.
let punkte = 0;
let durchgaenge = 0;

globalThis.document = {
  createElement: (tag) => {
    if (tag !== 'canvas') throw new Error(`nur canvas, nicht ${tag}`);
    const c = createCanvas(1, 1);
    const echt = c.getContext.bind(c);
    c.getContext = (art, opts) => {
      const g = echt(art, opts);
      if (!g || g.__gezaehlt) return g;
      g.__gezaehlt = true;
      const gid = g.getImageData.bind(g);
      const pid = g.putImageData.bind(g);
      g.getImageData = (x, y, w, h) => { punkte += w * h; durchgaenge++; return gid(x, y, w, h); };
      g.putImageData = (bild, x, y) => {
        punkte += bild.width * bild.height; durchgaenge++; return pid(bild, x, y);
      };
      return g;
    };
    return c;
  },
};
globalThis.window = { devicePixelRatio: 2, innerWidth: 844, innerHeight: 390 };

let offen = 0;
globalThis.Image = class extends NativeImage {
  set src(v) {
    offen++;
    const fertig = () => { offen--; };
    const l = this.onload, e = this.onerror;
    this.onload = () => { fertig(); l?.(); };
    this.onerror = () => { fertig(); e?.(); };
    super.src = v;
  }
  get src() { return super.src; }
};

const { MAPS } = await import('../src/data/maps.ts');
const { bakeTerrain } = await import('../src/gfx/terrain.ts');
const { getBackground } = await import('../src/gfx/backgrounds.ts');
const { GameState } = await import('../src/game/state.ts');

// Erst alle Untergrundbilder anfordern, dann warten. Ohne das misst der Lauf
// den billigen Fall ohne Bild — und genau der ist nicht der teure.
for (const m of MAPS) getBackground(m.id);
for (let i = 0; i < 300 && offen > 0; i++) await new Promise((r) => setTimeout(r, 40));

const fehlend = MAPS.filter((m) => !getBackground(m.id));
if (fehlend.length) {
  console.error('KARTENWECHSEL: fuer '
    + fehlend.map((m) => m.id).join(', ')
    + ' kam kein Untergrundbild an — gemessen waere der billige Fall, nicht der teure.');
  process.exit(1);
}

console.log('KARTENWECHSEL\n');
console.log('Karte             Bildpunkte   Durchgaenge      Zeit (nur Anhalt)');

let schlimmste = 0, schlimmsteKarte = '';
for (const m of MAPS) {
  const s = new GameState(m.id);
  const bild = getBackground(m.id);
  bakeTerrain(m, s.lanes, m.palette, bild);        // aufwaermen

  punkte = 0; durchgaenge = 0;
  const t0 = performance.now();
  bakeTerrain(m, s.lanes, m.palette, bild);
  const ms = performance.now() - t0;
  const mpx = punkte / 1e6;

  if (mpx > schlimmste) { schlimmste = mpx; schlimmsteKarte = m.id; }
  console.log(`${m.id.padEnd(16)}${mpx.toFixed(2).padStart(8)} Mpx${String(durchgaenge).padStart(9)}`
    + `${ms.toFixed(0).padStart(15)} ms`);
}

// Regel 3, an der Messung selbst: hat der Zaehler ueberhaupt etwas gesehen?
// Ein Zaehler, der bei null bleibt, sieht aus wie ein bestandenes Tor.
if (schlimmste === 0) {
  console.error('\nKARTENWECHSEL: der Zaehler hat keinen einzigen Bildpunkt gesehen.');
  console.error('  Entweder wird nicht mehr ueber getImageData gearbeitet — dann ist das');
  console.error('  eine gute Nachricht und dieses Werkzeug gehoert angepasst — oder der');
  console.error('  Haken sitzt nicht mehr richtig. Beides muss jemand ansehen.');
  process.exit(1);
}

console.log(`\nSchlimmste Karte: ${schlimmsteKarte} mit ${schlimmste.toFixed(2)} Mpx `
  + `(Budget ${BUDGET_MPX.toFixed(2)} Mpx)`);
console.log(`Abstand zur Norm: eine Aufgabe ueber ${SOLL_MS} ms blockiert Eingaben. `
  + 'Im Browser mit\n  vierfacher Drossel liegt der Kartenwechsel bei 660 bis 1320 ms — '
  + 'dem Dreizehn-\n  bis Sechsundzwanzigfachen. Das Tor haelt den Stand fest, es '
  + 'behauptet nicht,\n  er sei gut.');

if (process.argv.includes('--browser')) {
  const { messenImBrowser } = await import('./kartenwechsel-browser.mjs');
  await messenImBrowser(ROOT);
}

if (schlimmste > BUDGET_MPX) {
  console.error(`\nKARTENWECHSEL: ueber Budget — ${schlimmste.toFixed(2)} Mpx statt hoechstens `
    + `${BUDGET_MPX.toFixed(2)} Mpx je Kartenwechsel.`);
  console.error('  Jeder zusaetzliche Punktdurchlauf ueber das ganze Feld kostet auf dem');
  console.error('  Telefon rund eine Viertelsekunde eingefrorenes Bild.');
  process.exit(1);
}
console.log('\nKARTENWECHSEL: im Budget.');
