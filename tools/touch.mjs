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
    // Kommentare INNERHALB des Blocks raus, bevor geteilt wird.
    //
    // Sonst klebt der Kommentar an der ersten Angabe: aus
    // `/* ... */ min-height: 44px` wird ein Schluessel, der `min-height`
    // heisst und den Kommentar davor traegt - die Angabe verschwindet
    // lautlos. Genau so las die Zielwahl 26 statt 70 Punkte, und der
    // Kommentar, der das erklaerte, war die Ursache.
    for (const decl of m[3].replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
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

/** Was eine `::after`-Auflage ueber den Knopf hinaus an Hoehe zulegt.
 *
 *  Ein Knopf darf kleiner AUSSEHEN als er zu treffen ist - eine leere,
 *  absolut gesetzte Auflage mit negativem `inset` schiebt die Trefferflaeche
 *  nach aussen, ohne das Layout zu aendern. Ohne diese Zeilen haette die
 *  Pruefung genau die Loesung nicht gesehen, die sie erzwingt. */
function auflage(sel) {
  const r = regeln(`${sel}::after`);
  if (r.position !== 'absolute') return 0;
  const teile = r.inset ? r.inset.split(/\s+/).map(px) : [];
  if (!teile.length) return 0;
  const oben = teile[0] ?? 0;
  const unten = teile.length >= 3 ? (teile[2] ?? oben) : oben;
  // Nur nach AUSSEN zaehlt: ein positives `inset` verkleinert die Auflage,
  // vergroessert aber nicht den Knopf.
  return Math.max(0, -oben) + Math.max(0, -unten);
}

/** Zugesagte Höhe: entweder ausdrücklich, oder Innenabstand + Text. */
function hoehe(sel) {
  const r = regeln(sel);
  const mh = px(r['min-height']) ?? px(r.height);
  if (mh) return mh + auflage(sel);
  const pad = r.padding ? r.padding.split(/\s+/).map(px) : [];
  const oben = pad.length ? (pad[0] ?? 0) : 0;
  const unten = pad.length >= 3 ? (pad[2] ?? oben) : oben;
  const schrift = px(r['font-size']) ?? 13;
  // Zeilenhöhe konservativ mit 1,2 angesetzt.
  return oben + unten + schrift * 1.2 + auflage(sel);
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
  // Die beiden hier entstehen erst im Lauf und standen deshalb nie in
  // dieser Liste - obwohl die Zielwahl seit v137 fuenf Knoepfe hat und die
  // Wellenvorschau seit v194 acht.
  ['.insp-ziel .ziel', 'Zielwahl'],
  ['.next-eintrag', 'Gegner in der Vorschau'],
  // **Und die, die acht Fassungen lang nur als Hinweis dastanden.**
  //
  // Ein Hinweis, den man acht Mal untereinander liest, ist keiner mehr - er
  // ist die Zeile, ueber die man hinwegliest. Gemessen sind sie jetzt,
  // ausgenommen ist keiner: was der Finger trifft, gehoert in diese Liste.
  //
  // Vier der acht standen auf dem HTML-Titelschirm - `.back`, `.grade`,
  // `.perk`, `.link`, dazu `.primary` und `.choice`, die die Liste schon
  // hatte. Der Schirm war seit v43 nie wieder sichtbar; das Tor hat also
  // jahrelang Knoepfe vermessen, die niemand druecken konnte, und die
  // lebenden uebersprungen. Er ist in v196 entfernt, und mit ihm die
  // Eintraege.
  ['.pause-btn', 'Pausenmenue'],
  ['.opt-btn', 'Einstellung waehlen'],
  ['.dock-toggle', 'Leiste einklappen'],
  ['.coach-skip', 'Einweisung ueberspringen'],
  ['.pick-btn', 'Turm aus der Bauwahl'],
  ['#messtafel .mb', 'Messtafel: Aufklappen und Kopieren'],
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

// Jeder Knopf sollte einer der geprüften Klassen angehören - sonst gibt es
// Bedienelemente, die niemand misst.
//
// **Nicht nur im Dokument.** Bis v193 las diese Zeile allein `index.html`,
// und die Haelfte aller Knoepfe entsteht in `ui.ts`: Ausbauzweige, die
// Zielwahl, seit v194 die Wellenvorschau. Von denen war nur gemessen, was
// zufaellig schon in der Liste stand.
// Knoepfe entstehen an drei Stellen: im Dokument, in der Oberflaeche und in
// der Messtafel. Wer eine vierte aufmacht, traegt sie hier nach - sonst
// misst sie niemand, und genau das war v196.
const quellen = html
  + readFileSync(join(ROOT, 'src/ui/ui.ts'), 'utf8')
  + readFileSync(join(ROOT, 'src/core/messung.ts'), 'utf8');
const klassen = [...quellen.matchAll(/<button[^>]*class=["`]([^"`$]+)/g)]
  .map((m) => m[1].split(' ')[0]).filter((k) => k && !k.includes('{'));
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
