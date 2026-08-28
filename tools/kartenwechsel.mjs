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
 * ## Was v113 daran geaendert hat
 *
 * Der Aufbau laeuft nicht mehr in einem Zug, sondern in 28 Haeppchen zu je
 * 0,154 Mpx (`terrainAuftrag`). Bis er fertig ist, bleibt die vorherige Karte
 * stehen - man sieht von der Aufteilung nichts. Gemessen fiel die
 * schlimmste Aufgabe damit von 939-1322 auf 426-622 ms.
 *
 * Wichtiger als die Zahl ist der Nachweis, dass der Rest NICHT mehr von hier
 * kommt: schaltet man den Tonwertabgleich vollstaendig ab (0,13 statt
 * 4,28 Mpx), bleibt die schlimmste Aufgabe bei 507-875 ms - unveraendert.
 * Ein Profillauf zeigt, warum: 19,5 von 22 Sekunden stehen unter
 * `(program)`, also browserinterne Arbeit (Dekodieren, Rastern), nicht
 * unser JavaScript. Weiter optimieren hiesse hier, an der falschen Stelle zu
 * ziehen. Das steht als D26.
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
import { createCanvas } from '@napi-rs/canvas';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Obergrenze in Millionen Bildpunkten je Kartenwechsel.
//
// Heute gemessen: 4,15 Mpx (ein getImageData und ein putImageData ueber
// 1920x1080). Das Budget laesst genau einen weiteren halben Durchgang zu —
// wer einen zweiten Punktdurchlauf einbaut, faellt auf.
const BUDGET_MPX = 5.5;

// --- Obergrenze fuer den GROESSTEN einzelnen Schritt.
//
// Das ist die eigentliche Zusage aus D25: der Aufbau darf nicht mehr in einem
// Zug durchlaufen. Ohne diese Grenze bliebe die Aufteilung ungeprueft - die
// Gesamtsumme aendert sich durch sie ja nicht, und genau deshalb faellt ihr
// Wegfall der Summe nicht auf.
//
// Heute: 40 Zeilen mal 1920 Punkte, gelesen und geschrieben, also 0,154 Mpx.
// Erlaubt ist das Vierfache - Luft fuer groessere Baender, aber weit unter
// den 4,15 Mpx, die ein ungeteilter Durchlauf braeuchte.
const BUDGET_HAEPPCHEN_MPX = 0.6;

// Die Norm, gegen die gemessen wird. Nicht erreichbar mit dem heutigen
// Aufbau, aber sie steht hier, damit der Abstand sichtbar bleibt.
const SOLL_MS = 50;

// --- Die Zeichenschicht braucht ein Dokument. Und wir brauchen einen Zaehler
// darin: jedes getImageData und putImageData wird mitgeschrieben.
let punkte = 0;
let durchgaenge = 0;

// Geruest und Bilderladen kommen aus der gemeinsamen Werkstatt (Regel 15).
// Der Haken zaehlt an JEDER angelegten Leinwand mit - das ist der Grund, aus
// dem dieses Werkzeug bis v191 ein eigenes Geruest brauchte.
import { geruestStellen, bilderAbwarten } from './leinwand.mjs';

geruestStellen(844, 390, (c) => {
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
});
const warten = bilderAbwarten;

const { MAPS } = await import('../src/data/maps.ts');
const { terrainAuftrag } = await import('../src/gfx/terrain.ts');
const { getBackground } = await import('../src/gfx/backgrounds.ts');
const { GameState } = await import('../src/game/state.ts');

// Erst alle Untergrundbilder anfordern, dann warten. Ohne das misst der Lauf
// den billigen Fall ohne Bild — und genau der ist nicht der teure.
for (const m of MAPS) getBackground(m.id);
await warten();

const fehlend = MAPS.filter((m) => !getBackground(m.id));
if (fehlend.length) {
  console.error('KARTENWECHSEL: fuer '
    + fehlend.map((m) => m.id).join(', ')
    + ' kam kein Untergrundbild an — gemessen waere der billige Fall, nicht der teure.');
  process.exit(1);
}

console.log('KARTENWECHSEL\n');
console.log('Karte            gesamt Mpx  Haeppchen  groesstes  Zeit (Anhalt)');

let schlimmste = 0, schlimmsteKarte = '';
let groesstesHaeppchen = 0, haeppchenKarte = '';
for (const m of MAPS) {
  const s = new GameState(m.id);
  const bild = getBackground(m.id);
  terrainAuftrag(m, s.lanes, m.palette, bild).schritt(Infinity);   // aufwaermen

  punkte = 0; durchgaenge = 0;
  const t0 = performance.now();
  const auftrag = terrainAuftrag(m, s.lanes, m.palette, bild);
  // Mit Budget null: jeder Aufruf macht genau ein Haeppchen. So wird
  // sichtbar, was der GROESSTE einzelne Schritt bewegt - und genau das ist
  // die Frage bei D25. Die Gesamtsumme allein wuerde nicht auffallen, wenn
  // jemand die Aufteilung wieder entfernt: sie bliebe dieselbe.
  let haeppchen = 0;
  for (;;) {
    const vorher = punkte;
    const fertig = auftrag.schritt(0);
    const dieses = punkte - vorher;
    if (dieses > groesstesHaeppchen) { groesstesHaeppchen = dieses; haeppchenKarte = m.id; }
    haeppchen++;
    if (fertig) break;
  }
  const ms = performance.now() - t0;
  const mpx = punkte / 1e6;

  if (mpx > schlimmste) { schlimmste = mpx; schlimmsteKarte = m.id; }
  console.log(`${m.id.padEnd(16)}${mpx.toFixed(2).padStart(8)}${String(haeppchen).padStart(11)}`
    + `${(groesstesHaeppchen / 1e6).toFixed(3).padStart(11)}${ms.toFixed(0).padStart(11)} ms`);
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
console.log(`Groesstes Haeppchen: ${(groesstesHaeppchen / 1e6).toFixed(3)} Mpx auf ${haeppchenKarte} `
  + `(Budget ${BUDGET_HAEPPCHEN_MPX.toFixed(2)} Mpx) - der Aufbau ist aufgeteilt.`);
console.log(`Abstand zur Norm: eine Aufgabe ueber ${SOLL_MS} ms blockiert Eingaben. `
  + 'Im Browser mit\n  vierfacher Drossel bleiben 430 bis 620 ms — das Neun- bis '
  + 'Zwoelffache.\n  Der Kartenaufbau ist daran seit v113 nicht mehr beteiligt '
  + '(nachgewiesen:\n  schaltet man den Tonwertabgleich ganz ab, aendert sich die Zahl '
  + 'nicht).\n  Was bleibt, ist ueberwiegend keine Rechenzeit von uns - siehe D26.');

if (process.argv.includes('--browser')) {
  const { messenImBrowser } = await import('./kartenwechsel-browser.mjs');
  await messenImBrowser(ROOT);
}

if (groesstesHaeppchen / 1e6 > BUDGET_HAEPPCHEN_MPX) {
  console.error(`\nKARTENWECHSEL: ein einzelner Schritt bewegt `
    + `${(groesstesHaeppchen / 1e6).toFixed(2)} Mpx (${haeppchenKarte}), erlaubt sind `
    + `${BUDGET_HAEPPCHEN_MPX.toFixed(2)} Mpx.`);
  console.error('  Der Kartenaufbau muss sich ueber mehrere Bilder verteilen. Ein Zug ueber');
  console.error('  das ganze Feld friert das Bild auf dem Telefon fuer rund eine Sekunde ein.');
  process.exit(1);
}
if (schlimmste > BUDGET_MPX) {
  console.error(`\nKARTENWECHSEL: ueber Budget — ${schlimmste.toFixed(2)} Mpx statt hoechstens `
    + `${BUDGET_MPX.toFixed(2)} Mpx je Kartenwechsel.`);
  console.error('  Jeder zusaetzliche Punktdurchlauf ueber das ganze Feld kostet auf dem');
  console.error('  Telefon rund eine Viertelsekunde eingefrorenes Bild.');
  process.exit(1);
}
console.log('\nKARTENWECHSEL: im Budget.');
