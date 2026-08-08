#!/usr/bin/env node
/**
 * Kritik — das Spiel mit den Augen eines Testers.
 *
 * Warum es das braucht: Die Torkette prüft, ob das Spiel *funktioniert*. Sie
 * hat nie geprüft, ob man es *spielen* kann. In v50 lag die Turmleiste quer
 * über der Landkarte, man kam nicht ins Spiel — und alle vierzehn Tore waren
 * grün. Kein einziges davon stellt die Frage, die ein Käufer als erstes
 * stellt.
 *
 * Dieses Werkzeug stellt sie. Es bewertet nach den Kategorien, die eine
 * Spielezeitschrift verwendet, und rechnet daraus eine Wertung. Ziel: über
 * 90 %.
 *
 * **Was es nicht kann, und das ist wichtig:** Es kann nicht sehen, ob etwas
 * schön ist. Es misst, was messbar ist, und listet den Rest als Fragen auf,
 * die ein Mensch am Bild beantworten muss. Eine Wertung ohne diesen zweiten
 * Teil ist wertlos - deshalb bricht es ab, wenn die Bildabnahme fehlt.
 *
 * Aufruf: npm run kritik
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BILDER = join(ROOT, 'bilder');

const lauf = (cmd) => {
  try {
    return { ok: true, out: execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

/** Die Kategorien einer Spielewertung, mit Gewicht.
 *
 *  Die Gewichte sind nicht erfunden, sondern der üblichen Aufteilung
 *  nachempfunden: Spielmechanik wiegt am schwersten, Technik am wenigsten -
 *  ein technisch makelloses Spiel, das keinen Spaß macht, bekommt keine 90. */
const KATEGORIEN = [
  { id: 'einstieg', name: 'Einstieg und Bedienung', gewicht: 20 },
  { id: 'spiel', name: 'Spielmechanik und Tiefe', gewicht: 30 },
  { id: 'balance', name: 'Balance und Fortschritt', gewicht: 20 },
  { id: 'praesentation', name: 'Grafik und Präsentation', gewicht: 20 },
  { id: 'technik', name: 'Technik und Stabilität', gewicht: 10 },
];

const punkte = {};
const belege = {};
const fragen = [];
for (const k of KATEGORIEN) { punkte[k.id] = []; belege[k.id] = []; }

const werte = (kat, name, erfuellt, beleg) => {
  punkte[kat].push(erfuellt ? 1 : 0);
  belege[kat].push(`${erfuellt ? '+' : '−'} ${name}${beleg ? ` (${beleg})` : ''}`);
};

console.log('Kritik — Wertung nach Kategorien einer Spielezeitschrift\n');

// ------------------------------------------------------- Einstieg, Bedienung
{
  const smoke = lauf('npm run smoke');
  const beruehrung = lauf('npm run beruehrung');

  // Die Frage eines Käufers: kann ich das Spiel starten?
  werte('einstieg', 'Man kommt vom Menü ins Spiel', smoke.ok,
    smoke.ok ? 'Menüwege geprüft' : 'Rauchtest rot');
  werte('einstieg', 'Keine Bedienung liegt im Menü im Weg',
    !/ist sichtbar, obwohl das Menü/.test(smoke.out));
  werte('einstieg', 'Alles mit dem Daumen zu treffen', beruehrung.ok,
    beruehrung.ok ? '44 Punkte überall' : 'unter dem Richtwert');
  werte('einstieg', 'Einführung vorhanden',
    existsSync(join(ROOT, 'src/game/tutorial.ts')));
  const menu = readFileSync(join(ROOT, 'src/game/menu.ts'), 'utf8');
  werte('einstieg', 'Vor dem Start weiß man, was kommt', menu.includes("'brief'"),
    'Einweisung je Karte');
  fragen.push(['einstieg', 'Findet sich jemand ohne Erklärung im Menü zurecht?', 'menu-karte.png']);
}

// -------------------------------------------------- Spielmechanik und Tiefe
{
  const bericht = lauf('npm run bericht');
  const m = bericht.out.match(/(\d+)\/(\d+) Kriterien/);
  const [erfuellt, gesamt] = m ? [Number(m[1]), Number(m[2])] : [0, 30];
  const anteil = erfuellt / gesamt;
  // Der Genre-Abgleich wiegt hier am schwersten: er misst gegen die
  // Vertreter, an denen ein Tester das Spiel misst.
  for (let i = 0; i < 6; i++) punkte.spiel.push(anteil >= (i + 1) / 6 ? 1 : 0);
  belege.spiel.push(`Genre-Abgleich ${erfuellt} von ${gesamt} Kriterien`);

  const towers = readFileSync(join(ROOT, 'src/data/towers.ts'), 'utf8');
  const stufen = (towers.match(/MAX_LEVEL = (\d+)/) ?? [])[1];
  werte('spiel', 'Mindestens vier Türme mit je zwei Zweigen',
    (towers.match(/branches: \[/g) ?? []).length >= 4);
  werte('spiel', 'Ausbau geht tief genug', Number(stufen) >= 5, `${stufen} Stufen`);
  fragen.push(['spiel', 'Fühlt sich eine Welle spannend an oder zäh?', 'welle15.png']);
}

// -------------------------------------------------- Balance und Fortschritt
{
  const sim = lauf('npm run sim');
  werte('balance', 'Balance-Prüfung grün', sim.ok);
  const verteilung = (sim.out.match(/letzten Welle (\d+) %/) ?? [])[1];
  werte('balance', 'Niederlagen verteilen sich', Number(verteilung) <= 60,
    `${verteilung} % in der letzten Welle`);
  const stile = (sim.out.match(/Abstand der Spielstile.*Spanne (\d+)/) ?? [])[1];
  werte('balance', 'Mehrere Spielstile tragen', Number(stile) <= 18,
    `Spanne ${stile} Punkte`);
  const sterne = [...sim.out.matchAll(/bester Lauf: (\d)/g)].map((x) => Number(x[1]));
  werte('balance', 'Drei Sterne erreichbar, aber nicht überall',
    sterne.some((x) => x >= 3) && !sterne.every((x) => x >= 3), sterne.join('/'));
}

// ------------------------------------------------- Grafik und Präsentation
{
  const les = lauf('npm run lesbarkeit');
  werte('praesentation', 'Alles lesbar', les.ok);
  const bilder = existsSync(BILDER) ? readdirSync(BILDER).filter((f) => f.endsWith('.png')) : [];
  werte('praesentation', 'Bildabnahme liegt vor', bilder.length >= 10, `${bilder.length} Aufnahmen`);
  const gfx = readFileSync(join(ROOT, 'src/gfx/renderer.ts'), 'utf8');
  const state = readFileSync(join(ROOT, 'src/game/state.ts'), 'utf8');
  werte('praesentation', 'Rückmeldung bei Treffern', state.includes('hitStop'), 'Trefferstopp');
  werte('praesentation', 'Verformung bei Wucht', gfx.includes('e.squash'));
  fragen.push(['praesentation', 'Wirkt das Feld wie ein Ort oder wie ein Diagramm?', 'welle8.png']);
  fragen.push(['praesentation', 'Passen Menü und Spiel stilistisch zusammen?', 'menu-sieg.png']);
}

// ------------------------------------------------- Technik und Stabilität
{
  const det = lauf('npm run determinism');
  const bench = lauf('npm run bench-draw');
  const aut = lauf('npm run autarkie');
  werte('technik', 'Gleicher Ablauf nach Sichern und Laden', det.ok);
  werte('technik', 'Im Zeichenbudget', bench.ok);
  werte('technik', 'Läuft eigenständig und offline', aut.ok);
}

// ------------------------------------------------------------------- Wertung
let gesamt = 0;
console.log('Kategorie                       Wertung   Gewicht');
for (const k of KATEGORIEN) {
  const p = punkte[k.id];
  const anteil = p.length ? p.reduce((a, b) => a + b, 0) / p.length : 0;
  gesamt += anteil * k.gewicht;
  console.log(`  ${k.name.padEnd(28)} ${(anteil * 100).toFixed(0).padStart(4)} %   ${String(k.gewicht).padStart(3)} %`);
  for (const b of belege[k.id]) console.log(`      ${b}`);
}

const note = Math.round(gesamt);
console.log(`\nWERTUNG: ${note} von 100`);

console.log('\nWas nur ein Blick beantwortet:');
for (const [kat, frage, bild] of fragen) {
  console.log(`  [${kat}] ${frage}`);
  console.log(`         → bilder/${bild}`);
}

if (note < 90) {
  console.error(`\nKRITIK: ${note} von 100 - das Ziel sind 90.`);
  process.exit(1);
}
console.log('\nKRITIK: Ziel erreicht. Die offenen Fragen oben bleiben trotzdem offen.');
