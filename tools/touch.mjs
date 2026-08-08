#!/usr/bin/env node
/**
 * Berührungsflächen — ist alles mit dem Daumen zu treffen?
 *
 * Der Richtwert sind 44 Bildschirmpunkte (Apple) beziehungsweise 48
 * (Material). Das ist keine Geschmacksfrage: darunter steigt die Fehlerquote
 * messbar, und auf einem Spielfeld heißt eine Fehlberührung, dass man Gold
 * ausgibt, wo man nur nachsehen wollte.
 *
 * Geprüft werden zwei getrennte Welten:
 *
 *  1. **Auf der Leinwand.** Türme werden angetippt, um sie auszuwählen. Wie
 *     groß sie zu treffen sind, folgt aus Platzbedarf, Trefferzugabe und
 *     Maßstab — das lässt sich exakt ausrechnen. Der Maßstab ist im
 *     schlimmsten Fall der formatfüllende, also der kleinste.
 *
 *  2. **Im HTML.** Hier gibt es keine Layoutrechnung ohne Browser, also wird
 *     gelesen, was die Stilvorlage *zusagt*: Mindesthöhe, Innenabstand,
 *     Schriftgröße. Das ist eine Untergrenze, keine Messung — und wird auch
 *     so gemeldet.
 *
 * Aufruf: npm run beruehrung
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const { TOWERS, TOWER_ORDER } = await import('../src/data/towers.ts');
const { WORLD_W, WORLD_H } = await import('../src/data/config.ts');
// Die Groessenregel kommt aus der Engine, nicht aus einer Kopie hier.
const { GameState } = await import('../src/game/state.ts');

const MINDEST = 44;

/** Geräte, gegen die geprüft wird. Das kleinste zuerst - es entscheidet. */
const GERAETE = [
  ['kleines Handy quer', 568, 320],
  ['iPhone SE quer', 667, 375],
  ['iPhone 15 quer', 852, 393],
];

const probleme = [];
const hinweise = [];

// ------------------------------------------------------------ Auf der Leinwand
console.log('Auf der Leinwand — Turmauswahl, Durchmesser in Bildschirmpunkten:\n');
for (const [name, w, h] of GERAETE) {
  // Formatfüllend: das Feld deckt den Bildschirm, mehr wird nicht
  // herausgezoomt. Kleiner wird ein Turm also nie.
  const scale = Math.max(w / WORLD_W, h / WORLD_H);
  const teile = [];
  for (const id of TOWER_ORDER) {
    const d = GameState.tapSize(id, scale);
    teile.push(`${TOWERS[id].name.slice(0, 5).padEnd(5)} ${d.toFixed(0).padStart(3)}`);
    if (d < MINDEST) {
      probleme.push(
        `${TOWERS[id].name} auf ${name}: ${d.toFixed(0)} Punkte, ` +
        `mindestens ${MINDEST} nötig.`,
      );
    }
  }
  console.log(`  ${name.padEnd(20)} Maßstab ${scale.toFixed(3)}   ${teile.join('   ')}`);
}

// ------------------------------------------------------------------- Im HTML
//
// Ohne Browser gibt es keine Layoutrechnung. Gelesen wird deshalb die Zusage
// der Stilvorlage: Mindesthöhe, oder Innenabstand plus Zeilenhöhe.
const css = readFileSync(join(ROOT, 'src/style.css'), 'utf8');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

/** Die Regeln einer Auswahl einsammeln, spätere überschreiben frühere. */
function regeln(selektor) {
  const out = {};
  // Vor der Auswahl darf auch ein Kommentarende oder ein Semikolon stehen.
  // Die erste Fassung verlangte Zeilenanfang, Komma oder schliessende Klammer
  // und uebersah dadurch jede Regel, die direkt hinter einem Kommentar steht -
  // also ausgerechnet die gut erklaerten.
  const re = new RegExp(
    `(^|[,};]|\\*/)\\s*${selektor.replace(/\./g, '\\.')}\\s*(,[^{]*)?\\{([^}]*)\\}`, 'g',
  );
  for (const m of css.matchAll(re)) {
    for (const decl of m[3].split(';')) {
      const [k, v] = decl.split(':').map((x) => x && x.trim());
      if (k && v) out[k] = v;
    }
  }
  return out;
}

const px = (v) => {
  if (!v) return null;
  const m = /(-?[0-9.]+)px/.exec(v);
  return m ? Number(m[1]) : null;
};

/** Zugesagte Höhe: entweder ausdrücklich, oder Innenabstand + Text. */
function hoehe(sel) {
  const r = regeln(sel);
  const mh = px(r['min-height']) ?? px(r.height);
  if (mh) return mh;
  const pad = r.padding ? r.padding.split(/\s+/).map(px) : [];
  const oben = pad.length ? (pad[0] ?? 0) : 0;
  const unten = pad.length >= 3 ? (pad[2] ?? oben) : oben;
  const schrift = px(r['font-size']) ?? 13;
  // Zeilenhöhe konservativ mit 1,2 angesetzt.
  return oben + unten + schrift * 1.2;
}

const KNOEPFE = [
  ['.tower-btn', 'Turmsorte wählen'],
  ['.skill-btn', 'Fähigkeit'],
  ['.branch', 'Ausbauzweig'],
  ['.insp-ups .up', 'Ausbauen'],
  ['.chip', 'Tempo und Welle'],
  ['.x', 'Prüfsteg schließen'],
  ['.sell', 'Verkaufen'],
  ['.go', 'Welle starten'],
  ['.primary', 'Hauptknopf'],
  ['.choice', 'Einstellzeile'],
];

console.log('\nIm HTML — zugesagte Höhe laut Stilvorlage:\n');
for (const [sel, was] of KNOEPFE) {
  if (!css.includes(sel.split(' ').pop())) {
    hinweise.push(`Auswahl "${sel}" kommt in der Stilvorlage nicht vor - übersprungen.`);
    continue;
  }
  const h = hoehe(sel);
  const knapp = h < MINDEST;
  console.log(`  ${was.padEnd(22)} ${sel.padEnd(16)} ${h.toFixed(0).padStart(3)} Punkte${knapp ? '   ZU KLEIN' : ''}`);
  if (knapp) {
    probleme.push(`${was} (${sel}): zugesagt ${h.toFixed(0)} Punkte, mindestens ${MINDEST} nötig.`);
  }
}

// Jeder Knopf im Dokument sollte einer der geprüften Klassen angehören -
// sonst gibt es Bedienelemente, die niemand misst.
const klassen = [...html.matchAll(/<button[^>]*class="([^"]+)"/g)].map((m) => m[1].split(' ')[0]);
const geprueft = new Set(KNOEPFE.map(([s]) => s.split(' ').pop().replace('.', '')));
for (const k of new Set(klassen)) {
  if (!geprueft.has(k) && k !== 'link') hinweise.push(`Knopfklasse "${k}" wird nicht gemessen.`);
}

for (const h of hinweise) console.log(`\n  Hinweis: ${h}`);
if (probleme.length) {
  console.error(`\nBERUEHRUNG: ${probleme.length} Problem(e)`);
  for (const p of probleme) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nBERUEHRUNG: alle Flächen erreichen den Richtwert.');
