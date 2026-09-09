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
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIFF = join(ROOT, 'src/data/difficulty.ts');
const MAPS = join(ROOT, 'src/data/maps.ts');

const MARKE = join(ROOT, '.eichen-sicherung.json');

// --- Zuerst: liegt eine Sicherung von einem abgebrochenen Lauf herum?
//
// Diese Prüfung MUSS vor der Sauberkeitsprüfung stehen. Andersherum blockiert
// der Schutz genau den Fall, für den die Sicherung gedacht ist: nach einem
// Abbruch ist der Baum schmutzig, das Werkzeug verweigert den Dienst - und
// die Wiederherstellung kommt nie zum Zug. Die Gegenprobe hat das gefunden.
if (existsSync(MARKE)) {
  const alt = JSON.parse(readFileSync(MARKE, 'utf8'));
  for (const [f, s] of Object.entries(alt)) writeFileSync(f, s);
  rmSync(MARKE);
  console.log('EICHEN: ein abgebrochener Lauf wurde gefunden und zurückgestellt.\n');
}

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
const knie = opt('--knie');
const leben = opt('--leben');
const beute = opt('--beute');
const ruhig = opt('--ruhig');
const karte = opt('--karte');
const hp = opt('--hp');
const gold = opt('--gold');

if (!kurve && !knie && !leben && !beute && !ruhig && !hp && !gold) {
  console.log(`Eichen — einen Wert durchprobieren, alle Kennzahlen sehen.

  npm run eichen -- --kurve 30,34,38          Schwierigkeitskurve (hpEnd)
  npm run eichen -- --knie 0.35,0.40,0.45     Knie der Lebenskurve (KNIE_ANFANG)
  npm run eichen -- --leben 30,40,50          Groesse des Kristalls (startLives)
  npm run eichen -- --beute 0.7,0.85,1.0      Einkommen im Grad normal (bountyMul/bonusMul)
  npm run eichen -- --ruhig 11,13,15          Lebenskurve NUR im Grad Ruhig (hpEnd)
  npm run eichen -- --karte X --hp 0.85,0.9   Ausgleich einer Karte
  npm run eichen -- --karte X --gold 1.0,1.1  Einkommen einer Karte

Die Quelldateien werden nach jedem Lauf wiederhergestellt - der Baum sieht
danach aus wie vorher.`);
  process.exit(0);
}

// --- Sicherung, die auch einen harten Abbruch überlebt.
//
// Der erste Entwurf verließ sich auf Signalbehandler. Die Gegenprobe hat
// gezeigt, dass das nicht reicht: während der Messlauf läuft, steht die
// Ereignisschleife still, das Signal kommt also nie an, und eine geänderte
// Datei bleibt stehen. Deshalb liegt die Sicherung auf der Platte und wird
// beim nächsten Start gefunden.

const backup = new Map([[DIFF, readFileSync(DIFF, 'utf8')], [MAPS, readFileSync(MAPS, 'utf8')]]);
writeFileSync(MARKE, JSON.stringify(Object.fromEntries(backup)));
const restore = () => {
  for (const [f, s] of backup) writeFileSync(f, s);
};
const fertig = () => { restore(); if (existsSync(MARKE)) rmSync(MARKE); };
for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException']) {
  process.on(sig, (e) => { fertig(); if (e instanceof Error) console.error(e); process.exit(1); });
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

/** Das Knie der Lebenskurve setzen (S-P2-02).
 *
 *  `KNIE_ANFANG` sagt, ab welchem Anteil des Wellenplans die Lebenspunkte
 *  wirklich anziehen. Steht es spaet, bleibt der ganze Mittelteil folgenlos -
 *  und genau das ist gemessen: die Verluste liegen auf jeder Aussaat an
 *  denselben zwei Stellen, dreizehn Wellen kosten nichts.
 *
 *  Nur der ANFANG wird gefahren, nicht das Ende: beide zugleich waeren zwei
 *  Dinge auf einmal, und das Ende bei 0,92 ist der Punkt, an dem die Kurve
 *  ihre volle Hoehe erreicht - er gehoert ans Ende des Plans. */
function setKnie(v) {
  writeFileSync(DIFF, backup.get(DIFF).replace(
    /const KNIE_ANFANG = [0-9.]+;/, `const KNIE_ANFANG = ${v};`));
}

/** Die Groesse des Kristalls setzen (S-P2-03).
 *
 *  Ein Durchbruch soll wehtun. Der schwerste Gegner nimmt 5 Punkte; bei 60
 *  Kristall sind das 8,3 %, und Kingdom Rush arbeitet mit 20 Leben, wo ein
 *  einziger Durchbruch sichtbar teuer ist.
 *
 *  Die anderen zwei Grade folgen ANTEILIG - ruhig steht auf dem 1,333fachen
 *  von normal, erbarmungslos auf dem 0,867fachen. Drei Zahlen einzeln zu
 *  setzen hiesse, drei Dinge auf einmal zu eichen; und die Sternschwellen
 *  sind Anteile (`starsFor`), wandern also von selbst mit (Regel 2). */
function setLeben(v) {
  let s = backup.get(DIFF);
  s = s.replace(/startLives: \d+,\n(\s*)hpEnd: ([0-9.]+), hpCurve: 2\.4/,
    `startLives: ${Math.round(v * 80 / 60)},\n$1hpEnd: $2, hpCurve: 2.4`);
  s = s.replace(/startLives: \d+,\n(\s*)hpEnd: ([0-9.]+), hpCurve: 2\.6/,
    `startLives: ${v},\n$1hpEnd: $2, hpCurve: 2.6`);
  s = s.replace(/startLives: \d+,\n(\s*)hpEnd: ([0-9.]+), hpCurve: 2\.7/,
    `startLives: ${Math.round(v * 52 / 60)},\n$1hpEnd: $2, hpCurve: 2.7`);
  writeFileSync(DIFF, s);
}

/** Das Einkommen im Grad `normal` setzen (S-P2-04).
 *
 *  `bountyMul` ist das Gold je Abschuss, `bonusMul` der Wellenbonus. Beide
 *  stehen auf 1,0 und werden GEMEINSAM gefahren: getrennt waeren es zwei
 *  Dinge auf einmal, und sie ziehen ohnehin an derselben Schraube.
 *
 *  Die anderen zwei Grade bleiben stehen. Ruhig zahlt 1,3, Erbarmungslos
 *  0,85; der Waechter verlangt nur, dass ein haerterer Grad nicht MEHR
 *  zahlt, und das gilt, solange normal nicht ueber 1,3 steigt. */
function setBeute(v) {
  writeFileSync(DIFF, backup.get(DIFF).replace(
    /bountyMul: 1(\.0)?, bonusMul: 1(\.0)?,/, `bountyMul: ${v}, bonusMul: ${v},`));
}

/** Die Lebenskurve NUR im Grad "Ruhig" setzen (S-P2-05).
 *
 *  `--kurve` zieht alle drei Grade in festem Verhaeltnis; hier geht es
 *  gerade darum, einen einzelnen zu bewegen. Der Grad endete gemessen fuer
 *  alle drei Spielstile mit dem vollen Kristall - sanft ist er damit nicht,
 *  sondern folgenlos. */
function setRuhig(v) {
  writeFileSync(DIFF, backup.get(DIFF).replace(
    /hpEnd: [0-9.]+, hpCurve: 2\.4/, `hpEnd: ${v}, hpCurve: 2.4`));
}

/** Welche Kennung zu welcher Konstante gehört — **abgelesen, nicht
 *  aufgeschrieben**.
 *
 *  Hier stand bis v246 eine Tabelle von Hand, und sie war seit v222 falsch:
 *  der **Farnkessel fehlte** (23 Fassungen lang), und `laubschlucht` stand
 *  noch als Kennung darin, die es seit der Umbenennung nicht mehr gibt.
 *  `npm run eichen -- --karte farnkessel` antwortete „Karte gibt es nicht" —
 *  für eine Karte, die im Spiel steht.
 *
 *  Dieselbe Klasse wie die Zahlwort-Tabelle des Doku-Wächters (v230) und das
 *  Befehlsmuster ohne Ziffern (v244): eine Aufzählung, die hinter ihrem
 *  Gegenstand zurückbleibt, sieht aus wie eine Prüfung. Und wie dort fällt es
 *  erst auf, wenn jemand den fehlenden Fall wirklich braucht — hier war das
 *  F7, „zwei von vier Karten sind nicht auf drei Sterne spielbar".
 *
 *  Jetzt wird `src/data/maps.ts` gelesen: jede `export const MAP_X` mit der
 *  `id` darunter. Eine fünfte Karte ist damit von selbst dabei. */
const MAP_CONST = Object.fromEntries(
  [...backup.get(MAPS).matchAll(/export const (MAP_[A-Z_]+): GameMap = \{\s*\n\s*id: '([^']+)'/g)]
    .map((m) => [m[2], m[1]]),
);
if (Object.keys(MAP_CONST).length < 2) {
  fertig();
  console.error('EICHEN: in src/data/maps.ts sind keine Karten zu finden.');
  console.error('Das Muster passt nicht mehr - erst das reparieren, sonst eicht');
  console.error('dieses Werkzeug ins Leere.');
  process.exit(1);
}

function setKarte(id, feld, v) {
  const name = MAP_CONST[id];
  if (!name) { fertig(); console.error(`Karte "${id}" gibt es nicht.`); process.exit(1); }
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
  // Bei einer Kartenprobe zaehlt, was auf DIESER Karte passiert. Verteilung
  // und Robustheit werden auf der ersten Karte gemessen und aendern sich
  // nicht mit - sie hier zu zeigen waere irrefuehrend.
  let eigen = '';
  if (karte) {
    const zeile = [...out.matchAll(/^ {2}(\S+)\s+Meister (\S+)\s+Breite (\S+)\s+Sparsam (\S+)/gm)]
      .find((m) => m[1].toLowerCase().startsWith(karte.slice(0, 5).toLowerCase()));
    if (zeile) eigen = `${zeile[2]} ${zeile[3]} ${zeile[4]}`;
  }
  return {
    eigen,
    verteilung: line(/Verluste: (.+?)\s{2,}davon/) || 'keine',
    anteil: line(/letzten Welle (\d+) %/),
    robust: line(/Robustheit.*Spanne ([0-9.]+)/),
    stile: line(/Abstand der Spielstile.*Spanne (\d+)/),
    // Seit v260 mitgemessen: was ohne diese zwei Zahlen nicht zu sehen war,
    // ist genau das, was S-P2-04 einstellt. Der Knappheitsanteil sagt, ob
    // Gold der Engpass ist; "uebrig" sagt, wieviel liegen bleibt.
    knapp: line(/^ {2}Meister\s+([0-9.]+) % \(Spanne/m),
    uebrig: line(/Gold uebrig am Ende: ([0-9.]+) %/),
    ruhigZeile: line(/^ {2}Ruhig\s+(.+?)\s*$/m),
    sterne,
    fehler,
  };
}

const rows = [];
const werte = (kurve ?? knie ?? leben ?? beute ?? ruhig ?? hp ?? gold).split(',').map((v) => Number(v.trim()));
const was = kurve ? 'Kurve' : knie ? 'KNIE_ANFANG' : leben ? 'startLives' : beute ? 'bountyMul/bonusMul' : ruhig ? 'hpEnd (Ruhig)' : `${karte} ${hp ? 'hpMul' : 'goldMul'}`;

console.log(`Eichen: ${was}, ${werte.length} Werte\n`);
for (const v of werte) {
  restore();
  if (kurve) setKurve(v);
  else if (knie) setKnie(v);
  else if (leben) setLeben(v);
  else if (beute) setBeute(v);
  else if (ruhig) setRuhig(v);
  else setKarte(karte, hp ? 'hp' : 'gold', v);
  const m = messen();
  rows.push([v, m]);
  console.log(karte
    ? `  ${String(v).padEnd(6)} ${karte}: ${m.eigen.padEnd(26)} ` +
      `Sterne ${m.sterne.padEnd(6)} Fehler ${m.fehler.length}`
    : `  ${String(v).padEnd(6)} ${m.verteilung.padEnd(22)} ` +
      `knapp ${(m.knapp + ' %').padStart(7)}  uebrig ${(m.uebrig + ' %').padStart(7)}  ` +
      `Robust ${m.robust.padStart(5)}  Stile ${m.stile.padStart(3)}  ` +
      `Sterne ${m.sterne.padEnd(6)} Fehler ${m.fehler.length}` +
      (ruhig ? `\n         Ruhig: ${m.ruhigZeile}` : ''));
}

fertig();

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
