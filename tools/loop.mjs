#!/usr/bin/env node
/**
 * Schleifenbetrieb — ein Durchgang aus Arbeit, Prüfung und Abnahme.
 *
 * Der Gedanke: Ich gebe nicht jede Runde einzeln frei, sondern setze ein Ziel
 * mit Abnahmekriterien. Danach läuft die Schleife selbst — arbeiten, prüfen,
 * ansehen, entscheiden: freigeben oder noch eine Runde.
 *
 * Damit das keine Selbstbestätigung wird, muss die Prüfung von der Arbeit
 * getrennt sein. Getrennt heißt hier nicht "andere Überschrift", sondern:
 *
 *   Der Inspektor sieht nur Artefakte — Torausgabe, Kennzahlen, Bilder,
 *   Änderungsumfang. Er sieht nicht, was der Arbeiter vorhatte.
 *
 * Dieses Werkzeug erzeugt genau diese Artefakte und fällt den Teil des
 * Urteils, der sich rechnen lässt. Den Rest — sieht es gut aus, fühlt es sich
 * richtig an — kann nur ein Blick auf die Bilder entscheiden.
 *
 * Aufruf:  npm run schleife
 *          npm run schleife -- --ohne-bilder   (schneller, ohne Aufnahmen)
 */
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = join(ROOT, 'schleife');
mkdirSync(REPORT, { recursive: true });

const withShots = !process.argv.includes('--ohne-bilder');

function run(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

console.log('SCHLEIFE — Durchgang beginnt\n');

// ---------------------------------------------------------------- 1. Tore
console.log('1. Tore ...');
const gate = run('npm run gate');
const gateLines = gate.out.split('\n');
const pick = (re) => gateLines.filter((l) => re.test(l)).map((l) => l.trim());

const metrics = {
  tore: gate.ok ? 'alle bestanden' : 'FEHLGESCHLAGEN',
  fehler: pick(/^\s+- /),
  waechter: pick(/DATEN-WAECHTER:/)[0] ?? '',
  balance: pick(/BALANCE-CHECK:/)[0] ?? '',
  lesbarkeit: pick(/LESBARKEIT:/)[0] ?? '',
  rauchtest: pick(/RAUCHTEST:/)[0] ?? '',
  autarkie: pick(/AUTARKIE-CHECK:/)[0] ?? '',
  bericht: pick(/GENRE-BERICHT/)[0] ?? '',
  offen: pick(/OFFEN \(/),
  karten: pick(/^Karte |^\s*Karte /),
  wegprofil: pick(/Bahn \d+: Umweg/),
  verteilung: pick(/Verteilung der Verluste/)[0] ?? '',
  robustheit: pick(/Robustheit \(/)[0] ?? '',
  stile: pick(/Abstand der Spielstile/)[0] ?? '',
};
console.log(`   ${metrics.tore}`);

// ---------------------------------------------------------------- 2. Umfang
console.log('2. Änderungsumfang ...');
const diff = run('git diff --stat HEAD').out.trim().split('\n').slice(-1)[0] ?? '';
const files = run('git diff --name-only HEAD').out.trim().split('\n').filter(Boolean);
console.log(`   ${files.length} Datei(en)`);

// ---------------------------------------------------------------- 3. Bilder
let shots = [];
if (withShots) {
  console.log('3. Bildabnahme ...');
  const sh = run('npx tsx tools/shots.mjs');
  shots = sh.out.split('\n').filter((l) => l.includes('bilder/')).map((l) => l.trim());
  console.log(`   ${shots.length} Aufnahme(n)`);
} else {
  console.log('3. Bildabnahme übersprungen');
}

// ---------------------------------------------------------------- 4. Urteil
//
// Der rechenbare Teil. Was hier durchfällt, ist keine Geschmacksfrage.
const blockers = [];
if (!gate.ok) blockers.push('Ein Tor ist rot. Ohne grüne Tore gibt es keine Abnahme.');
if (files.length === 0) blockers.push('Keine Änderung im Baum - es gibt nichts abzunehmen.');
if (withShots && shots.length === 0) blockers.push('Keine Aufnahme entstanden - der Inspektor ist blind.');

const verdict = blockers.length ? 'NEUE SCHLEIFE' : 'BEREIT ZUR SICHTPRÜFUNG';

const lines = [
  `# Schleifenbericht · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
  '',
  `**Rechenbares Urteil: ${verdict}**`,
  '',
];
if (blockers.length) {
  lines.push('## Was blockiert', '');
  for (const b of blockers) lines.push(`- ${b}`);
  lines.push('');
}
lines.push('## Tore', '');
for (const k of ['waechter', 'balance', 'lesbarkeit', 'rauchtest', 'autarkie', 'bericht']) {
  if (metrics[k]) lines.push(`- ${metrics[k]}`);
}
if (metrics.fehler.length) {
  lines.push('', '### Meldungen', '');
  for (const f of metrics.fehler) lines.push(`- ${f.replace(/^- /, '')}`);
}
lines.push('', '## Kennzahlen', '');
for (const k of ['verteilung', 'robustheit', 'stile']) if (metrics[k]) lines.push(`- ${metrics[k]}`);
for (const o of metrics.offen) lines.push(`- ${o}`);
lines.push('', '## Karten', '');
for (const k of metrics.karten) lines.push(`- ${k}`);
for (const w of metrics.wegprofil) lines.push(`  - ${w}`);
lines.push('', '## Umfang', '', `- ${diff}`, ...files.slice(0, 20).map((f) => `  - ${f}`));
if (shots.length) {
  lines.push('', '## Aufnahmen zur Sichtprüfung', '');
  for (const s of shots) lines.push(`- ${s}`);
  lines.push('',
    '> Der rechenbare Teil ist damit erledigt. Was bleibt, entscheidet nur der',
    '> Blick auf diese Bilder: Wirkt es aus einem Guss? Ist alles lesbar? Liegt',
    '> etwas im Weg? Diese Fragen hat noch nie ein Tor beantwortet - elf von',
    '> 57 Befunden in diesem Projekt kamen aus Bildschirmfotos.');
}

const file = join(REPORT, 'bericht.md');
writeFileSync(file, lines.join('\n'));

// Der letzte Bericht bleibt zum Vergleich stehen.
const prev = join(REPORT, 'vorher.md');
if (existsSync(file) && !existsSync(prev)) writeFileSync(prev, lines.join('\n'));

console.log(`\n4. Urteil: ${verdict}`);
for (const b of blockers) console.log(`   - ${b}`);
console.log(`\nBericht: schleife/bericht.md`);
if (blockers.length) process.exit(1);
