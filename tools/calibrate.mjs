#!/usr/bin/env node
/**
 * Eichen — einen Wert durchprobieren und alle Kennzahlen auf einmal sehen.
 *
 * Warum es das gibt: T15 ist zweimal angegangen worden. Beim ersten Mal habe
 * ich von Hand justiert — Kurve ändern, messen, Zweige brachen, Zweige
 * richten, Sterne brachen, und nach drei Runden war die Torkette immer noch
 * rot. Beim zweiten Mal habe ich vier Kurvenwerte durchprobiert, für jeden
 * *alle* Kennzahlen nebeneinander gelegt und den passenden gewählt. Das ging
 * in einem Durchgang.
 *
 * Der Unterschied ist nicht Fleiß, sondern Reihenfolge: erst den Raum
 * ansehen, dann entscheiden. Blind justieren heißt, den Raum durch ein
 * Schlüsselloch zu betrachten.
 *
 * Aufruf:
 *   npm run eichen -- --kurve 30,34,38,42
 *   npm run eichen -- --karte spiralhain --hp 0.85,0.9,0.95
 *   npm run eichen -- --karte laubschlucht --gold 1.0,1.1,1.2
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIFF = join(ROOT, 'src/data/difficulty.ts');
const MAPS = join(ROOT, 'src/data/maps.ts');

// --- Schutz vor dem Fehler, der in dieser Sitzung dreimal Arbeit gekostet hat.
//
// Das Werkzeug schreibt in Quelldateien und stellt sie danach wieder her.
// Bricht es unterwegs ab - Strom weg, Abbruch von Hand - bliebe ein fremder
// Wert stehen. Bei einem sauberen Baum ist das mit einem `git checkout`
// geheilt; bei einem schmutzigen wäre nicht mehr zu erkennen, was von wem
// stammt.
const dirty = execSync('git status --porcelain -- src', { cwd: ROOT, encoding: 'utf8' }).trim();
if (dirty && !process.argv.includes('--trotzdem')) {
  console.error('EICHEN: der Baum unter src/ ist nicht sauber.\n');
  console.error(dirty.split('\n').map((l) => `  ${l}`).join('\n'));
  console.error('\nErst einchecken. Das Werkzeug schreibt in Quelldateien und stellt');
  console.error('sie danach wieder her - bei einem schmutzigen Baum liesse sich');
  console.error('hinterher nicht mehr trennen, was von wem stammt.');
  console.error('(Wenn du sicher bist: --trotzdem)');
  process.exit(1);
}

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const kurve = opt('--kurve');
const karte = opt('--karte');
const hp = opt('--hp');
const gold = opt('--gold');

if (!kurve && !hp && !gold) {
  console.log(`Eichen — einen Wert durchprobieren, alle Kennzahlen sehen.

  npm run eichen -- --kurve 30,34,38          Schwierigkeitskurve (hpEnd)
  npm run eichen -- --karte X --hp 0.85,0.9   Ausgleich einer Karte
  npm run eichen -- --karte X --gold 1.0,1.1  Einkommen einer Karte

Die Quelldateien werden nach jedem Lauf wiederhergestellt - der Baum sieht
danach aus wie vorher.`);
  process.exit(0);
}

/** Den Sicherungsstand aller Dateien, die angefasst werden. */
const backup = new Map([[DIFF, readFileSync(DIFF, 'utf8')], [MAPS, readFileSync(MAPS, 'utf8')]]);
const restore = () => { for (const [f, s] of backup) writeFileSync(f, s); };
// Auch bei Abbruch zurückstellen.
for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException']) {
  process.on(sig, (e) => { restore(); if (e instanceof Error) console.error(e); process.exit(1); });
}

/** Die Kurve aller drei Grade setzen. Ruhig und Erbarmungslos folgen der
 *  Mitte in festem Verhältnis - sonst eicht man drei Dinge auf einmal. */
function setKurve(v) {
  let s = backup.get(DIFF);
  s = s.replace(/hpEnd: [0-9.]+, hpCurve: 2\.4/, `hpEnd: ${+(v * 0.55).toFixed(1)}, hpCurve: 2.4`);
  s = s.replace(/hpEnd: [0-9.]+, hpCurve: 2\.6/, `hpEnd: ${v}, hpCurve: 2.6`);
  s = s.replace(/hpEnd: [0-9.]+, hpCurve: 2\.7/, `hpEnd: ${+(v * 1.18).toFixed(1)}, hpCurve: 2.7`);
  writeFileSync(DIFF, s);
}

const MAP_CONST = {
  spiralhain: 'MAP_SPIRALHAIN',
  laubschlucht: 'MAP_ASCHESCHLUCHT',
  ascheschlucht: 'MAP_ASCHESCHLUCHT',
  frostspalte: 'MAP_FROSTSPALTE',
};

function setKarte(id, feld, v) {
  const name = MAP_CONST[id];
  if (!name) { restore(); console.error(`Karte "${id}" gibt es nicht.`); process.exit(1); }
  const s = backup.get(MAPS);
  const i = s.indexOf(`export const ${name}`);
  const j = s.indexOf('\n};', i);
  const seg = s.slice(i, j).replace(
    /balance: \{ hpMul: ([0-9.]+), goldMul: ([0-9.]+) \}/,
    (_, h, g) => `balance: { hpMul: ${feld === 'hp' ? v : h}, goldMul: ${feld === 'gold' ? v : g} }`,
  );
  writeFileSync(MAPS, s.slice(0, i) + seg + s.slice(j));
}

/** Einen Lauf machen und die Kennzahlen herausziehen. */
function messen() {
  let out = '';
  try {
    out = execSync('npx tsx tools/sim.ts', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  const line = (re) => (out.match(re) ?? [])[1] ?? '';
  const fehler = [...out.matchAll(/^ {2}- (.+)$/gm)].map((m) => m[1]);
  const sterne = [...out.matchAll(/^ {2}(\S+)\s+bester Lauf: (\d)/gm)]
    .map((m) => m[2]).join('/');
  return {
    verteilung: line(/Verluste: (.+?)\s{2,}davon/) || 'keine',
    anteil: line(/letzten Welle (\d+) %/),
    robust: line(/Robustheit.*Spanne ([0-9.]+)/),
    stile: line(/Abstand der Spielstile.*Spanne (\d+)/),
    sterne,
    fehler,
  };
}

const rows = [];
const werte = (kurve ?? hp ?? gold).split(',').map((v) => Number(v.trim()));
const was = kurve ? 'Kurve' : `${karte} ${hp ? 'hpMul' : 'goldMul'}`;

console.log(`Eichen: ${was}, ${werte.length} Werte\n`);
for (const v of werte) {
  restore();
  if (kurve) setKurve(v);
  else setKarte(karte, hp ? 'hp' : 'gold', v);
  const m = messen();
  rows.push([v, m]);
  console.log(
    `  ${String(v).padEnd(6)} ${m.verteilung.padEnd(26)} ` +
    `letzte ${(m.anteil + ' %').padStart(5)}  ` +
    `Robust ${m.robust.padStart(5)}  Stile ${m.stile.padStart(3)}  ` +
    `Sterne ${m.sterne.padEnd(6)} Fehler ${m.fehler.length}`,
  );
}

restore();

// --- Empfehlung. Bewusst nur ein Vorschlag, keine Entscheidung.
console.log('');
const gruen = rows.filter(([, m]) => m.fehler.length === 0);
if (gruen.length) {
  // Unter den fehlerfreien der mit der besten Verteilung: möglichst wenig
  // Anteil in der letzten Welle, das ist das offene Ziel T15.
  const best = gruen.sort((a, b) => Number(a[1].anteil || 100) - Number(b[1].anteil || 100))[0];
  console.log(`EICHEN: fehlerfrei bei ${gruen.map(([v]) => v).join(', ')}.`);
  console.log(`        Bester Anteil in der letzten Welle: ${best[0]} (${best[1].anteil} %).`);
} else {
  const wenigste = rows.sort((a, b) => a[1].fehler.length - b[1].fehler.length)[0];
  console.log(`EICHEN: kein Wert ist fehlerfrei. Am nächsten: ${wenigste[0]} mit ${wenigste[1].fehler.length}:`);
  for (const f of wenigste[1].fehler) console.log(`        - ${f}`);
}
console.log('\nDie Quelldateien stehen wieder wie vorher.');
