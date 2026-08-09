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
 *  verändert wurde. `tor` ist der Befehl, der anschlagen soll.
 *
 *  Statt `suche` kann auch `regel` stehen: ein regulärer Ausdruck mit
 *  Ersetzung. Das ist der wichtigere Weg, und der Grund dafür ist Erfahrung:
 *  Proben, die auf feste Zahlen zeigen — eine Wegkoordinate, ein
 *  Kurvenwert — veralten bei jeder Balance-Runde. Zweimal hat das Verzeichnis
 *  deshalb "Muster fehlt" gemeldet, ohne dass an den Toren etwas falsch war.
 *  Eine Regel wie `hpEnd: [0-9.]+, hpCurve: 2\.4` überlebt das. */
const PROBEN = [
  {
    name: 'Weg knickt scharf ab',
    datei: 'src/data/maps.ts',
    // Der zweite Stuetzpunkt der ersten Bahn wird weit nach unten gezogen.
    // Als Regel, nicht als fester Wert: Wegkoordinaten aendern sich mit jeder
    // neuen Karte, und eine Probe, die daran haengt, veraltet lautlos.
    regel: /(lanes: \[\n\s*\[\n\s*\{[^}]*\}, \{ x: \d+, y: )(\d+)/,
    ersatz: '$1950',
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
    name: 'Uebersicht zeigt schwarze Raender',
    datei: 'src/gfx/renderer.ts',
    regel: /private get minZoom\(\): number \{ return this\.coverScale; \}/,
    ersatz: 'private get minZoom(): number { return this.fitScale; }',
    tor: 'smoke',
  },
  {
    name: 'Werteliste steht vor dem Ausbauen',
    datei: 'index.html',
    regel: /(<div class="insp-ups" id="i-ups"><\/div>)/,
    ersatz: '<dl class="insp-x"></dl>',
    tor: 'smoke',
  },
  {
    name: 'Sonne steht in der falschen Richtung',
    datei: 'src/data/config.ts',
    regel: /export const LICHT = \{ x: [-0-9.]+, y: [-0-9.]+ \};/,
    ersatz: 'export const LICHT = { x: -0.62, y: -0.78 };',
    tor: 'smoke',
  },
  {
    name: 'Ausbau bringt keine Reichweite',
    datei: 'src/data/towers.ts',
    regel: /const REICHWEITE_STUFE = \[[^\]]+\];/,
    ersatz: 'const REICHWEITE_STUFE = [1.00, 1.00, 1.00, 1.00, 1.00, 1.00];',
    tor: 'guards',
  },
  {
    name: 'Alle Tuerme gleich weit',
    datei: 'src/data/towers.ts',
    regel: /const REICHWEITE_GRUND: Record<TowerId, number> = \{/,
    ersatz: 'const REICHWEITE_GRUND: Record<TowerId, number> = { arrow: 0.17, frost: 0.17, mortar: 0.17, prism: 0.17, __alt: 0 } as unknown as Record<TowerId, number>; const __weg = {',
    tor: 'guards',
  },
  {
    name: 'Ausbaumenue zeigt falsche Werte',
    datei: 'src/data/towers.ts',
    regel: /  return statsFor\(def, branch, level \+ 1\);/,
    ersatz: '  return def.branches[branch].levels[level - 1] as TowerStats;',
    tor: 'smoke',
  },
  {
    name: 'Panzerung wieder als fester Abzug',
    datei: 'src/game/state.ts',
    regel: /const schluck = Math\.min\(0\.66, rest \* 0\.11\);/,
    ersatz: 'const schluck = 0;',
    tor: 'sim',
  },
  {
    name: 'Tuerme ueberdecken einander',
    datei: 'src/data/towers.ts',
    regel: /export const DRAW_SCALE = [0-9.]+;/,
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
    name: 'Turmleiste nicht mehr abgeleitet',
    datei: 'src/ui/ui.ts',
    suche: '    this.setSpielansicht(!this.istMenuOffen());',
    ersatz: '    void this.istMenuOffen;',
    tor: 'smoke',
  },
  {
    name: 'Ein Schwierigkeitsgrad wie der andere',
    datei: 'src/data/difficulty.ts',
    regel: /hpEnd: [0-9.]+, hpCurve: 2\.4/,
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
  const nachher = p.regel
    ? vorher.replace(p.regel, p.ersatz)
    : vorher.split(p.suche).length - 1 === 1
      ? vorher.replace(p.suche, p.ersatz)
      : null;
  if (nachher === null || nachher === vorher) {
    const treffer = p.regel ? 0 : vorher.split(p.suche).length - 1;
    console.log(`  ${p.name.padEnd(42)} MUSTER ${treffer === 0 ? 'FEHLT' : `${treffer}x`} in ${p.datei}`);
    fehler.push(`${p.name}: Eingriff kam nicht an (${p.regel ? 'Regel' : `Muster ${treffer}x`}).`);
    continue;
  }

  writeFileSync(pfad, nachher);
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
