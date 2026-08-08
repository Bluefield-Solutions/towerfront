#!/usr/bin/env node
/**
 * Gegenproben — schlagen die Tore auch wirklich an?
 *
 * Ein Tor, das nie etwas meldet, ist kein Beweis. Es könnte genauso gut leer
 * sein. Die einzige Art, das zu prüfen, ist einen Fehler einzubauen und
 * nachzusehen, ob er auffällt.
 *
 * Bisher war das Handarbeit: Muster ersetzen, Prüfung starten, zurücknehmen.
 * Drei Dinge gingen dabei regelmäßig schief.
 *
 *  1. **Vier Mal hat ein `git checkout` frische Arbeit gelöscht**, weil noch
 *     nicht eingecheckt war. Deshalb verweigert dieses Werkzeug den Dienst bei
 *     schmutzigem Baum — die Regel steht nicht mehr nur in der Doku, sie wird
 *     durchgesetzt.
 *  2. **Die Proben waren nach der Sitzung weg.** Jetzt stehen sie hier und
 *     lassen sich jederzeit wiederholen.
 *  3. **Manche Probe kam gar nicht an** — das Muster hatte sich geändert, die
 *     Ersetzung lief ins Leere, und das Ergebnis sah aus wie ein bestandenes
 *     Tor. Drei von zehn waren betroffen. Deshalb prüft jede Probe zuerst, ob
 *     ihr Eingriff überhaupt gegriffen hat.
 *
 * Aufruf:  npm run proben              alle
 *          npm run proben -- lesbar    nur passende
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Das Verzeichnis der stehenden Gegenproben.
 *
 *  `suche` muss im Baum genau einmal vorkommen — sonst ist nicht klar, was
 *  verändert wurde. `tor` ist der Befehl, der anschlagen soll. */
const PROBEN = [
  {
    name: 'Weg knickt scharf ab',
    datei: 'src/data/maps.ts',
    suche: '{ x: -80, y: 210, w: 88 }, { x: 210, y: 226, w: 82 }',
    ersatz: '{ x: -80, y: 210, w: 88 }, { x: 210, y: 950, w: 82 }',
    tor: 'guards',
  },
  {
    name: 'Bauplatz mitten auf dem Weg',
    datei: 'src/data/maps.ts',
    suche: 'export const PATH_CLEARANCE = 30;',
    ersatz: 'export const PATH_CLEARANCE = -400;',
    tor: 'guards',
  },
  {
    name: 'Saum dunkel statt hell',
    datei: 'src/data/maps.ts',
    suche: "rim: '#DCEEFF'",
    ersatz: "rim: '#16233A'",
    tor: 'lesbarkeit',
  },
  {
    name: 'Gegner zu klein zum Erkennen',
    datei: 'src/gfx/enemyart.ts',
    suche: 'Math.max(ENEMIES[id].radius * 3.0, 50)',
    ersatz: 'ENEMIES[id].radius * 1.2',
    tor: 'lesbarkeit',
  },
  {
    name: 'Knopf unter dem Richtwert',
    datei: 'src/style.css',
    suche: '  min-height: 46px;\n}\n.tower-btn .n',
    ersatz: '  min-height: 20px;\n}\n.tower-btn .n',
    tor: 'beruehrung',
  },
  {
    name: 'Trefferzugabe abgeschaltet',
    datei: 'src/game/state.ts',
    suche: 'const slack = Math.max(10, GameState.tapSlack(scale));',
    ersatz: 'const slack = 10;',
    tor: 'smoke',
  },
  {
    name: 'Zweiter Ausbauzweig unerreichbar',
    datei: 'src/ui/ui.ts',
    suche: 'data-branch="${i}"',
    ersatz: 'data-branch="0"',
    tor: 'smoke',
  },
  {
    name: 'Kein Rückweg aus dem Ergebnis',
    datei: 'src/game/menu.ts',
    suche: "if (id === 'tomap') { this.result = null; this.view = 'map'; return true; }",
    ersatz: "if (id === 'tomap') { return true; }",
    tor: 'smoke',
  },
  {
    name: 'Schwarzes Bild',
    datei: 'src/gfx/renderer.ts',
    suche: '    drawMenu(ctx, this.menu!);',
    ersatz: '    ctx.fillStyle = "#000"; ctx.fillRect(-9e4, -9e4, 18e4, 18e4);',
    tor: 'bildtor',
  },
  {
    name: 'Doku nennt einen Befehl, den es nicht gibt',
    datei: 'CLAUDE.md',
    suche: 'npm run gate',
    ersatz: 'npm run gaat',
    tor: 'doku',
  },
  {
    name: 'Doku zählt die Tore falsch',
    datei: 'CLAUDE.md',
    suche: 'vierzehn Prüfungen',
    ersatz: 'sieben Prüfungen',
    tor: 'doku',
  },
  {
    name: 'Tuerme ueberdecken einander',
    datei: 'src/data/towers.ts',
    suche: 'export const DRAW_SCALE = 1.25;',
    ersatz: 'export const DRAW_SCALE = 2.4;',
    tor: 'guards',
  },
  {
    name: 'Bedienung liegt im Menue im Weg',
    datei: 'src/ui/ui.ts',
    suche: '    this.hud.hidden = !anzeigen;',
    ersatz: '    this.hud.hidden = false;',
    tor: 'smoke',
  },
  {
    name: 'Ein Schwierigkeitsgrad wie der andere',
    datei: 'src/data/difficulty.ts',
    suche: 'hpEnd: 9.9, hpCurve: 2.4',
    ersatz: 'hpEnd: 40, hpCurve: 2.4',
    tor: 'guards',
  },
];

// ------------------------------------------------------------------- Schutz
const dreckig = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
if (dreckig) {
  console.error('PROBEN: der Baum ist nicht sauber.\n');
  console.error(dreckig.split('\n').slice(0, 10).map((l) => `  ${l}`).join('\n'));
  console.error('\nJede Probe nimmt sich mit `git checkout` zurück. Bei schmutzigem');
  console.error('Baum würde das die frische Arbeit mitnehmen - viermal passiert.');
  console.error('Erst einchecken.');
  process.exit(1);
}

const filter = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const liste = filter.length
  ? PROBEN.filter((p) => filter.some((f) => `${p.name} ${p.tor}`.toLowerCase().includes(f.toLowerCase())))
  : PROBEN;

const zuruecknehmen = () => execSync('git checkout -- .', { cwd: ROOT, stdio: 'pipe' });

console.log(`Gegenproben: ${liste.length} von ${PROBEN.length}\n`);

const fehler = [];
for (const p of liste) {
  const pfad = join(ROOT, p.datei);
  const vorher = readFileSync(pfad, 'utf8');

  // Greift der Eingriff überhaupt? Drei von zehn Proben sind daran einmal
  // gescheitert, und ein nicht angekommener Eingriff sieht aus wie ein
  // bestandenes Tor.
  const treffer = vorher.split(p.suche).length - 1;
  if (treffer !== 1) {
    console.log(`  ${p.name.padEnd(42)} MUSTER ${treffer === 0 ? 'FEHLT' : `${treffer}x`} in ${p.datei}`);
    fehler.push(`${p.name}: Muster kommt ${treffer}x vor, erwartet genau einmal.`);
    continue;
  }

  writeFileSync(pfad, vorher.replace(p.suche, p.ersatz));
  let schlaegtAn = false;
  try {
    execSync(`npm run ${p.tor}`, { cwd: ROOT, stdio: 'pipe' });
  } catch {
    schlaegtAn = true;
  }
  zuruecknehmen();

  console.log(`  ${p.name.padEnd(42)} ${p.tor.padEnd(11)} ${schlaegtAn ? 'schlägt an' : 'SCHLÄGT NICHT AN'}`);
  if (!schlaegtAn) fehler.push(`${p.name}: "${p.tor}" bleibt grün, obwohl der Fehler eingebaut ist.`);
}

zuruecknehmen();

if (fehler.length) {
  console.error(`\nPROBEN: ${fehler.length} von ${liste.length} Toren beweisen nichts`);
  for (const f of fehler) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nPROBEN: alle ${liste.length} Tore schlagen an.`);
