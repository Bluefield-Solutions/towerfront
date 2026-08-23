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
/** Ein gueltiges, aber leeres Symbol: 180 x 180, einfarbig dunkel.
 *  Von Hand als PNG gebaut, damit die Probe keine Bibliothek braucht - und
 *  weil genau diese Datei der Fehler aus S136 ist. */
const LEERES_SYMBOL = await (async () => {
  const sharp = (await import('sharp')).default;
  const b = await sharp({
    create: { width: 180, height: 180, channels: 3, background: '#080B18' },
  }).png().toBuffer();
  return b.toString('base64');
})();

const PROBEN = [
  {
    name: 'Weg knickt scharf ab',
    datei: 'src/data/maps.ts',
    // Der zweite Stuetzpunkt der ersten Bahn wird weit nach unten gezogen.
    // Als Regel, nicht als fester Wert: Wegkoordinaten aendern sich mit jeder
    // neuen Karte, und eine Probe, die daran haengt, veraltet lautlos.
    regel: /(lanes: \[\n\s*\[\n\s*\{[^}]*\}, \{ x: \d+, y: )(\d+)/,
    // Nicht 950: bei Karten, deren erste Bahn ohnehin unten verlaeuft, waere
    // das kaum eine Aenderung. Null zieht den Punkt zuverlaessig an den
    // oberen Rand und erzeugt damit den scharfen Knick, den die Probe braucht.
    ersatz: '$10',
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
    // Diese Probe griff bis v104 am Rohwert an - und lief seit der
    // zusammenziehenden Anhebung ins Leere: der Zug zur Zielbreite holte den
    // eingebauten Fehler wieder heraus, bevor das Tor ihn sehen konnte
    // (Spaeher 20 statt 51 Rohbreite, gezogen auf 56 - unauffaellig).
    //
    // Das ist die dritte Fassung von Fall 3 aus dem Kopf dieser Datei: der
    // Eingriff KAM an, das Muster passte, und trotzdem bewies der Lauf
    // nichts. Ein Eingriff, den der Code selbst repariert, sieht genauso aus
    // wie ein bestandenes Tor. Deshalb greift die Probe jetzt am Ergebnis an,
    // hinter der letzten Rechnung - dort kann nichts mehr dazwischenkommen.
    name: 'Gegner zu klein zum Erkennen',
    datei: 'src/gfx/enemyart.ts',
    regel: /return roh >= ZIELBREITE \? roh : roh \+ \(ZIELBREITE - roh\) \* ZUG;/,
    ersatz: 'return roh * 0.35;',
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
    // Als Regel, nicht als festes Zahlwort.
    //
    // Sie stand auf "vierzehn Prüfungen" und fiel aus, sobald die Kette um
    // ein Tor wuchs - "Muster fehlt", genau Fall 3 aus dem Kopf dieser
    // Datei. Eine Probe, die auf die Zahl zeigt, die sie prüfen soll,
    // veraltet zwangsläufig mit ihr. Die Regel trifft jedes Zahlwort und
    // überlebt jede weitere Torrunde.
    name: 'Doku zählt die Tore falsch',
    datei: 'CLAUDE.md',
    regel: /(drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig) Prüfungen/,
    // "drei" ist nie richtig, solange die Kette mehr als drei Schritte hat -
    // und sie hat seit v11 nie weniger gehabt.
    ersatz: 'drei Prüfungen',
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
    name: 'Turmwahl faellt aus der Zeichenkennung',
    datei: 'src/ui/ui.ts',
    regel: /      s\.buildAt \? `\$\{Math\.round\(s\.buildAt\.x\)\}:\$\{Math\.round\(s\.buildAt\.y\)\}` : '-',/,
    ersatz: "      '-',",
    tor: 'smoke',
  },
  {
    name: 'Uebersichtskarte mit festen Punkten',
    datei: 'src/game/menu.ts',
    regel: /const n = MAPS\.length;/,
    // Fuenf, nicht drei - bei drei Karten waere der Fehler heute unsichtbar
    // und die Probe damit wertlos.
    ersatz: 'const n = 5;',
    tor: 'smoke',
  },
  {
    // Bis v138 hiess diese Probe "Tuerme verschieden gross" und gab dem
    // Moerser einen eigenen Platzbedarf - damals war das der Fehler, weil
    // EINE Zahl Platzbedarf UND Zeichengroesse war. Seit v139 sind es zwei,
    // und der Fehler liegt anders herum: ein Platzbedarf weit ueber der
    // Zeichenbreite ist eine unsichtbare Sperre.
    name: 'Platzbedarf weit ueber der Zeichenbreite',
    datei: 'src/data/towers.ts',
    regel: /(id: 'mortar',[\s\S]{0,400}?)footprint: 116/,
    ersatz: '$1footprint: 160',
    tor: 'guards',
  },
  {
    // Und die Gegenrichtung: alle Sorten wieder gleich. Dann behauptet das
    // Konzept eine Entscheidung, die es nicht gibt.
    name: 'Platzbedarf wieder fuer alle gleich',
    datei: 'src/data/towers.ts',
    regel: /(id: 'mortar',[\s\S]{0,400}?)footprint: 116/,
    ersatz: '$1footprint: FOOTPRINT',
    tor: 'smoke',
  },
  {
    // Ein Zahlwort im Kartentext, das der Karte widerspricht - genau der
    // Zustand bis v138 ("Zwei Zuwege" bei drei Bahnen).
    name: 'Kartentext widerspricht der Karte',
    datei: 'src/data/maps.ts',
    regel: /blurb: 'Der Boden glüht noch\./,
    ersatz: "blurb: 'Zwei Zuwege münden früh ineinander.",
    tor: 'guards',
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
    // Der Waechter darf den Begriff nicht nur suchen, er muss den Satz lesen.
    // Diese drei Proben gehoeren zusammen: die erste zeigt, dass er einen
    // echten Rueckschritt findet, die zweite, dass er richtige Prosa in Ruhe
    // laesst. Ohne die zweite waere die erste wertlos - ein Waechter, der
    // jedes Vorkommen meldet, besteht sie auch.
    name: 'Doku faellt auf das Kachelraster zurueck',
    datei: 'CLAUDE.md',
    regel: /^## Stand$/m,
    ersatz: '## Stand\n\nDas Spielfeld ist ein Kachelraster mit festen Rasterzellen.',
    tor: 'doku',
    meldet: 'verwendet "Kachelraster" im gültigen Teil',
  },
  {
    name: 'Doku nennt wieder das alte Feldmass',
    datei: 'CLAUDE.md',
    regel: /^## Stand$/m,
    ersatz: '## Stand\n\nDas Feld misst 20 × 11 Zellen.',
    tor: 'doku',
    meldet: 'verwendet "20 × 11" im gültigen Teil',
  },
  {
    name: 'Waechter mahnt richtige Prosa an',
    datei: 'CLAUDE.md',
    regel: /^## Stand$/m,
    ersatz: '## Stand\n\nEin Kachelraster gibt es hier nicht mehr.',
    tor: 'doku',
    meldetNicht: 'verwendet "Kachelraster" im gültigen Teil',
  },
  {
    // Neu mit der Hoehe: der Waechter deckelt sie bei 1,25. Ohne Probe waere
    // das eine Grenze, von der niemand weiss, ob sie greift - und eine
    // Grenze, die nicht greift, ist eine Erlaubnis.
    name: 'Turm ins Unmassstaebliche gestreckt',
    datei: 'src/data/towers.ts',
    regel: /export const TURM_HOEHE = [0-9.]+;/,
    ersatz: 'export const TURM_HOEHE = 1.5;',
    tor: 'guards',
  },
  {
    // Der dritte Bruch von Regel 6 - genau der Fehler, den dieses Tor bei
    // seinem ersten Lauf gefunden hat. Er stand sichtbar auf der Landkarte,
    // und dreizehn andere Tore hatten ihn durchgelassen.
    name: 'Startknopf steht im Menue',
    datei: 'src/ui/ui.ts',
    regel: /this\.bWave\.hidden = !anzeigen;/,
    ersatz: 'this.bWave.hidden = false;',
    tor: 'browsertor',
  },
  {
    // Gross genug ist eine Zusage der Stilvorlage; gemessen wird sie erst
    // im Browser. Deshalb steht diese Probe neben der fuer `beruehrung` und
    // nicht statt ihrer - zwei Wege zur selben Zahl.
    name: 'Knopf im Spiel unter dem Richtwert',
    datei: 'src/style.css',
    regel: /(\.dock-toggle \{\n  pointer-events: auto; cursor: pointer; flex: none;\n  width: )44px; height: 44px;/,
    ersatz: '$130px; height: 30px;',
    tor: 'browsertor',
  },
  {
    // v50, woertlich nachgestellt: die Landkarte nimmt keine Tipper mehr an,
    // und man kommt nicht ins Spiel. Damals waren alle vierzehn Tore gruen.
    name: 'Man kommt nicht mehr ins Spiel',
    datei: 'src/game/menu.ts',
    regel: /const hit = this\.hotspots\.find\(\(h\) => inside\(h, x, y\)\);/,
    ersatz: 'const hit = undefined;',
    tor: 'browsertor',
  },
  {
    // Die Ziellogik muss WIRKEN, nicht nur einstellbar sein. Hier faellt die
    // Auswertung weg - alle Tuerme nehmen wieder den Vordersten.
    name: 'Ziellogik ohne Wirkung',
    datei: 'src/game/state.ts',
    regel: /const wert = wahl === 'vorn' \? e\.travelled/,
    ersatz: "const wert = true ? e.travelled",
    tor: 'smoke',
  },
  {
    // Und sie muss den Spielstand ueberleben.
    name: 'Ziellogik ueberlebt das Sichern nicht',
    datei: 'src/game/state.ts',
    regel: /ZIELWAHL_ORDNUNG\.indexOf\(t\.zielwahl\),/,
    ersatz: '0,',
    tor: 'smoke',
  },
  {
    // Die Anzeige muss dem Zustand folgen. Ohne die Zielwahl in der Signatur
    // schreibt `sync` nicht ins DOM, und der angetippte Knopf bleibt aus -
    // genau der Fehler, den das Browsertor bei seinem ersten Lauf fand.
    name: 'Anzeige folgt dem Zustand nicht',
    datei: 'src/ui/ui.ts',
    regel: /:\$\{sel\.zielwahl\}` : '-',/,
    ersatz: "` : '-',",
    tor: 'browsertor',
  },
  {
    // Versetzen waehrend der Welle waere keine Korrektur mehr, sondern eine
    // neue Mechanik - jeder Turm haette faktisch die Reichweite des halben
    // Feldes. Die Schranke muss halten.
    name: 'Turm laesst sich mitten in der Welle versetzen',
    datei: 'src/game/state.ts',
    regel: /return !this\.waveActive && this\.phase === 'playing';/,
    ersatz: "return this.phase === 'playing';",
    tor: 'smoke',
  },
  {
    // Der Schild muss Treffer schlucken. Hier faellt das Schlucken weg.
    name: 'Schild schluckt nichts',
    datei: 'src/game/state.ts',
    regel: /if \(e\.shield > 0\) \{\n      e\.shield--;/,
    ersatz: 'if (false) {\n      e.shield--;',
    tor: 'smoke',
  },
  {
    // Und er muss in einem Wellenplan STEHEN. Eine Mechanik, die nirgends
    // vorkommt, ist keine - genau das war sie eine Stunde lang, weil der
    // Eingriff im falschen Plan landete.
    name: 'Schild kommt in keiner Welle vor',
    datei: 'src/data/waves.ts',
    regel: /delay: 0, shield: 2 \},/,
    ersatz: 'delay: 0 },',
    tor: 'smoke',
  },
  {
    // Der Kartensatz muss die Karte nennen. Ohne Namen waere er beliebig.
    name: 'Karteneinfuehrung nennt die Karte nicht',
    datei: 'src/game/tutorial.ts',
    regel: /\$\{s\.map\.name\}: ein Zuweg/,
    ersatz: 'Diese Karte: ein Zuweg',
    tor: 'smoke',
  },
  {
    // Der Traeger muss den Nachbarn Schild geben.
    name: 'Schildtraeger versorgt niemanden',
    datei: 'src/game/state.ts',
    regel: /if \(e\.shield >= t\.traeger\) continue;/,
    ersatz: 'if (true) continue;',
    tor: 'smoke',
  },
  {
    // Und sich selbst NICHT - sonst muss man ihn nicht zuerst nehmen.
    name: 'Schildtraeger versorgt sich selbst',
    datei: 'src/game/state.ts',
    regel: /if \(e === t \|\| e\.dead\) continue;/,
    ersatz: 'if (e.dead) continue;',
    tor: 'smoke',
  },
  {
    // R4 lebt davon, dass das Bollwerk VOLL stoppt. Bremst es nur, ist es
    // ein zweiter Frostschlag - und das Genre-Kriterium meldet zu Recht
    // nichts mehr.
    name: 'Bollwerk bremst nur, statt zu stoppen',
    datei: 'src/data/abilities.ts',
    regel: /slow: 1, slowTime: 3,/,
    ersatz: 'slow: 0.5, slowTime: 3,',
    tor: 'smoke',
  },
  {
    // Die andere Haelfte von R4: es darf NICHT toeten.
    name: 'Bollwerk macht nebenbei Schaden',
    datei: 'src/game/state.ts',
    regel: /e\.slowLeft = Math\.max\(e\.slowLeft, def\.slowTime \?\? 3\);/,
    ersatz: 'e.slowLeft = Math.max(e.slowLeft, def.slowTime ?? 3); e.hp -= 1;',
    tor: 'smoke',
  },
  {
    // Der Widerstand der Gegner muss weiter wirken - sonst steht der
    // Leerentitan so lange wie der kleinste Schleicher.
    name: 'Bollwerk ignoriert den Widerstand der Gegner',
    datei: 'src/game/state.ts',
    regel: /const w = 1 - ENEMIES\[e\.def\]\.slowResist;/,
    ersatz: 'const w = 1;',
    tor: 'smoke',
  },
  {
    // Oertlich, nicht ueberall. Sonst waere es der Frostschlag mit Stopp.
    name: 'Bollwerk wirkt auf das ganze Feld',
    datei: 'src/game/state.ts',
    regel: /if \(dist2\(x, y, e\.x, e\.y\) > r2\) continue;/,
    ersatz: 'if (false) continue;',
    tor: 'smoke',
  },
  {
    // C17: die Ernte muss das Gold auch wirklich auszahlen.
    name: 'Ernte zahlt kein Gold aus',
    datei: 'src/game/state.ts',
    regel: /this\.gold \+= def\.gold;/,
    ersatz: 'this.gold += 0;',
    tor: 'smoke',
  },
  {
    // R4 als Genre-Kriterium darf nicht wieder fest verdrahtet werden - in
    // beide Richtungen. Hier: immer gruen.
    name: 'R4 ist wieder fest verdrahtet',
    datei: 'tools/benchmark.ts',
    // Ersetzt wird die GANZE Pruefung durch die feste Form. Ein `return true`
    // mitten im Rumpf faellt dem Waechter naemlich NICHT auf - er liest Text,
    // keine Bedeutung. Das ist keine Luecke, die hier versteckt wird, sondern
    // die Grenze seiner Zusage: er faengt die feste Form ab, und genau die
    // hatten R4 und G5 beide.
    regel: /check: \(\) => ABILITY_ORDER\.some\(\(id\) => \{[\s\S]*?\}\),/,
    ersatz: 'check: () => true,',
    tor: 'guards',
  },
  {
    // Die Umkehrung: der Waechter muss auch anschlagen, wenn ein Kriterium
    // fest auf "nicht erfuellt" steht. Genau so lagen R4 und G5 ueber
    // sechzig Versionen lang.
    name: 'Ein gemessenes Kriterium steht fest auf falsch',
    datei: 'tools/benchmark.ts',
    regel: /check: \(\) => TOWER_ORDER\.length >= 4,/,
    ersatz: 'check: () => false,',
    tor: 'guards',
  },
  {
    // Gold UND Wirkung auf dem Feld waere keine Abwaegung mehr.
    name: 'Ernte bringt Gold und macht Schaden',
    datei: 'src/data/abilities.ts',
    regel: /gold: 120,/,
    ersatz: 'gold: 120, damage: 50,',
    tor: 'guards',
  },
  {
    // Der Kern von D23: ein zusaetzlicher Punktdurchlauf ueber das ganze Feld
    // kostet auf dem Telefon eine Viertelsekunde eingefrorenes Bild - und war
    // bis v111 von keinem Tor zu sehen.
    name: 'Ein zweiter Punktdurchlauf im Kartenbacken',
    datei: 'src/gfx/terrain.ts',
    regel: /    saum\(g, photo !== null\);/,
    ersatz: '    saum(g, photo !== null); g.putImageData(g.getImageData(0, 0, WORLD_W, WORLD_H), 0, 0);',
    tor: 'kartenwechsel',
  },
  {
    // Und die Gegenrichtung: der Zaehler selbst darf nicht blind werden.
    // Ein Haken, der nichts mehr sieht, sieht aus wie ein bestandenes Tor.
    name: 'Der Bildpunktzaehler haengt nicht mehr ein',
    datei: 'tools/kartenwechsel.mjs',
    regel: /      g\.__gezaehlt = true;/,
    ersatz: '      g.__gezaehlt = true; return g;',
    tor: 'kartenwechsel',
  },
  {
    // D25: der Aufbau darf nicht wieder in einem Zug durchlaufen. Die
    // Gesamtsumme bliebe dabei gleich - nur das groesste Haeppchen faellt auf.
    name: 'Kartenaufbau laeuft wieder in einem Zug',
    datei: 'src/gfx/terrain.ts',
    regel: /      \} while \(performance\.now\(\) < bis\);/,
    ersatz: '      } while (true);',
    tor: 'kartenwechsel',
  },
  {
    // D24: was rollt, muss es anzeigen.
    name: 'Rollhinweis der Werteliste abgeschaltet',
    datei: 'src/ui/ui.ts',
    regel: /    this\.iStats\.dataset\.mehr = rest > 1 \? '1' : '0';/,
    ersatz: "    this.iStats.dataset.mehr = '0';",
    tor: 'browsertor',
  },
  {
    // Und die Gegenrichtung: ein Schleier, der immer liegt, ist Deko.
    name: 'Rollhinweis steht auch am Ende noch',
    datei: 'src/ui/ui.ts',
    regel: /    this\.iStats\.dataset\.mehr = rest > 1 \? '1' : '0';/,
    ersatz: "    this.iStats.dataset.mehr = '1';",
    tor: 'browsertor',
  },
  {
    // D20: die Vorschau muss Bilder zeigen, nicht Namen.
    name: 'Wellenvorschau faellt auf Farbtupfer zurueck',
    datei: 'src/ui/ui.ts',
    regel: /    const cv = getEnemyArt\(id, false, karte\);/,
    ersatz: '    const cv = null;',
    tor: 'browsertor',
  },
  {
    // Der Fall, der in v114 durch alle sechzehn Tore kam: der Aufbau ist seit
    // v113 auf viele Bilder verteilt, die Bildabnahme zeichnet aber nur zwei.
    // Ohne den Abschluss zeigt sie den gemalten Ersatzuntergrund - und die
    // Farbzaehlung merkt es nicht, weil Tuerme und Gegner genug Farben
    // mitbringen. Gefunden wurde es durch Hinsehen (Regel 7).
    name: 'Aufnahme faengt vor dem fertigen Kartenaufbau',
    datei: 'tools/shots.mjs',
    regel: /  if \(!r\.menu\) r\.kartenaufbauAbschliessen\(s\);/,
    ersatz: '  if (false) r.kartenaufbauAbschliessen(s);',
    tor: 'bildtor',
  },
  {
    // Die Bildhaelfte der Fertigfrage: wartet die Bildabnahme nicht auf die
    // Dekodierung, zeigt sie die gemalten Ersatzformen.
    name: 'Bildabnahme wartet nicht auf die Bilder',
    datei: 'tools/shots.mjs',
    regel: /  await settle\(\);/,
    ersatz: '  await Promise.resolve();',
    tor: 'bildtor',
  },
  {
    // Die Aufbauhaelfte, gepruefte Seite Rauchtest: bleibt der Kartenaufbau
    // stehen, muss er auffallen - auch nach 2700 Bildern.
    name: 'Kartenaufbau wird nie fertig',
    datei: 'src/gfx/renderer.ts',
    regel: /      if \(this\.terrainArbeit\.schritt\(TERRAIN_BUDGET_MS\)\) \{/,
    ersatz: '      if (false) {',
    tor: 'smoke',
  },
  {
    // Derselbe Fehler, anderes Tor. Eine Probe, die nur die Pruefung
    // entfernt, beweist nichts - es steht ja nichts aus. Sie muss den
    // echten Fehler einbauen und dann fragen, ob DIESES Tor ihn sieht.
    name: 'Zeichenmessung misst den Aufbau mit',
    datei: 'src/gfx/renderer.ts',
    regel: /      if \(this\.terrainArbeit\.schritt\(TERRAIN_BUDGET_MS\)\) \{/,
    ersatz: '      if (false) {',
    tor: 'bench-draw',
  },
  {
    // D17: zwei Zweige duerfen nicht gleich aussehen.
    name: 'Beide Bogenzweige schiessen dieselbe Form',
    datei: 'src/gfx/renderer.ts',
    regel: /  return p\.owner\.branch === 1 \? 'bolzen' : 'pfeil';/,
    ersatz: "  return 'pfeil';",
    tor: 'guards',
  },
  {
    // D27: das Messgeraet darf im Spiel nicht auftauchen - Regel 6 sinngemaess.
    name: 'Messtafel steht auch ohne Raute im Spiel',
    datei: 'src/main.ts',
    regel: /if \(messungGewuenscht\(\)\) messungStarten\(\);/,
    ersatz: 'messungStarten();',
    tor: 'browsertor',
  },
  {
    // Und die Gegenrichtung: ein Messgeraet, das nichts misst, ist keines.
    name: 'Messtafel misst nichts',
    datei: 'src/core/messung.ts',
    regel: /      if \(luecke > groessteLuecke\) groessteLuecke = luecke;/,
    ersatz: '      void luecke;',
    tor: 'browsertor',
  },
  {
    // D18: ein ruhendes Feld darf kein Standbild sein.
    name: 'Tuerme atmen nicht mehr',
    datei: 'src/gfx/renderer.ts',
    regel: /        const atem = Math\.sin\(s\.time \* 1\.9 \+ \(t\.x \+ t\.y \* 1\.7\) \* 0\.03\) \* 2;/,
    ersatz: '        const atem = 0;',
    tor: 'bildtor',
  },
  {
    // C26: zwei Karten duerfen nicht dasselbe verlangen. Eingebaut wird der
    // ECHTE Fehler - zwei Karten mit demselben Wellenplan -, nicht das
    // Entfernen der Pruefung (S119).
    name: 'Zwei Karten mit demselben Wellenplan',
    datei: 'src/data/maps.ts',
    regel: /  waves: PLAN_ASCHESCHLUCHT,/,
    ersatz: '  waves: PLAN_SPIRALHAIN,',
    tor: 'guards',
  },
  {
    // B1: der Boden muss Feinstruktur tragen. Ohne Korn lagen zwei von drei
    // Karten UNTER dem Band - und niemand hat es gemerkt, weil `grafik`
    // damals kein Tor war.
    name: 'Der Boden verliert seine Feinstruktur',
    datei: 'src/gfx/terrain.ts',
    regel: /const KORN_STAERKE = 4\.0;/,
    ersatz: 'const KORN_STAERKE = 0;',
    tor: 'grafiktor',
  },
  {
    // Und die Gegenrichtung: zu viel Korn ist Rauschen.
    name: 'Der Boden rauscht',
    datei: 'src/gfx/terrain.ts',
    regel: /const KORN_STAERKE = 4\.0;/,
    ersatz: 'const KORN_STAERKE = 9;',
    tor: 'grafiktor',
  },
  {
    // C24: das Tor muss wirklich umlenken, nicht nur dastehen.
    name: 'Das Tor sperrt nicht mehr',
    datei: 'src/game/state.ts',
    regel: /    if \(!t \|\| t\.bahn !== bahn\) return false;/,
    ersatz: '    if (t) return false; if (!t || t.bahn !== bahn) return false;',
    tor: 'smoke',
  },
  {
    // Und es darf nicht dauerhaft sperren - dann waere es eine Bahn weniger.
    name: 'Das Tor bleibt fuer immer zu',
    datei: 'src/data/maps.ts',
    regel: /  tor: \{ bahn: 1, zu: 8, auf: 8 \},/,
    ersatz: '  tor: { bahn: 1, zu: 40, auf: 8 },',
    tor: 'guards',
  },
  {
    // Der Hochkant-Hinweis darf im QUERFORMAT nicht auftauchen - er wuerde
    // das ganze Spiel verdecken. Regel 6 sinngemaess.
    name: 'Hochkant-Hinweis liegt ueber dem Spiel',
    datei: 'src/style.css',
    regel: /@media \(orientation: portrait\) and \(max-width: 900px\) and \(pointer: coarse\) \{/,
    ersatz: '@media all {',
    tor: 'browsertor',
  },
  {
    // Der Gegenfall zur Probe darueber, und der eigentliche Befund S138: ein
    // Deckel, der NUR am Schreibtisch erscheint. Auf dem Telefonfenster ist
    // er unsichtbar - alle sechs alten Pruefungen bleiben gruen. Nur die
    // Schreibtischprobe kann ihn sehen. Genau so ist `.rotate` sechs Runden
    // lang durchgekommen.
    name: 'Ein Deckel, den nur der Schreibtisch sieht',
    datei: 'src/style.css',
    regel: /#quer \{ display: none; \}/,
    ersatz: '#quer { display: none; }\n'
      + '@media (pointer: fine) { #quer { display: flex; position: fixed;'
      + ' inset: 0; z-index: 200; background: #080B18; } }',
    tor: 'browsertor',
  },
  {
    // Traegt die Umrechnung Zeiger -> Welt im Menue ueberhaupt? Wenn Bild und
    // Trefferflaeche verschieden eingepasst werden, trifft man daneben - und
    // zwar an jeder Fenstergroesse anders. Das Nachspielen des Weges auf
    // fremden Seitenverhaeltnissen faellt darauf herein, wenn es sie gibt.
    name: 'Menue wird anders gezeichnet als getroffen',
    datei: 'src/gfx/renderer.ts',
    regel: /const k = Math\.min\(this\.cssW \/ WORLD_W, this\.cssH \/ WORLD_H\);\n    ctx\.save\(\);/,
    ersatz: 'const k = Math.max(this.cssW / WORLD_W, this.cssH / WORLD_H);\n    ctx.save();',
    tor: 'browsertor',
  },
  {
    // Das Symbol ist einmal leer durchgekommen (S136): gueltiges PNG,
    // richtige Masse, kein Bild darin. Hier wird genau das nachgestellt -
    // der Kristall bleibt weg, Grund und Bogen bleiben.
    name: 'Startbildschirm-Symbol ohne Figur',
    datei: 'index.html',
    regel: /rel="apple-touch-icon" href="data:image\/png;base64,[^"]+"/,
    // Ein reiner dunkler Grund, 180x180: dieselbe Form, dieselbe Adresse,
    // nur ohne Kristall. Genau das, was niemandem auffaellt.
    ersatz: 'rel="apple-touch-icon" href="data:image/png;base64,'
      + LEERES_SYMBOL + '"',
    tor: 'browsertor',
  },
  {
    // Ein Startbild, dessen Masse nicht zu seiner Anmeldung passen. iOS
    // uebergeht so eines STILLSCHWEIGEND - kein Fehler, keine Meldung, nur
    // wieder der weisse Blitz. Genau die Sorte Fehler, die ohne Tor jahrelang
    // stehenbleibt, weil niemand etwas vermisst, das er nie gesehen hat.
    name: 'Startbild passt nicht zu seiner Anmeldung',
    datei: 'index.html',
    regel: /\(device-width: 390px\) and \(device-height: 844px\)/,
    ersatz: '(device-width: 391px) and (device-height: 844px)',
    tor: 'browsertor',
  },
  {
    // Ohne Einrasten gilt der Tippunkt wieder woertlich - genau der Zustand,
    // ueber den sich der Nutzer beschwert hat: "an manchen Stellen kann man
    // gar nicht hinbauen, man muss ganz gross reinzoomen".
    name: 'Der Tippunkt gilt wieder woertlich',
    datei: 'src/game/state.ts',
    regel: /    if \(radius <= 0\) return null;/,
    ersatz: '    return null;',
    tor: 'smoke',
  },
  {
    // Ein Bauplatz ohne Begruendung: alles gilt als erlaubt, und die
    // Turmwahl kann nicht mehr sagen, was nicht passt.
    name: 'Bauverbote nennen keinen Grund mehr',
    datei: 'src/game/state.ts',
    regel: /      if \(lane\.distanceTo\(x, y\) < r \+ PATH_CLEARANCE \+ lane\.halfNear\(x, y\)\) return 'Weg';/,
    ersatz: "      if (lane.distanceTo(x, y) < r + PATH_CLEARANCE + lane.halfNear(x, y)) return 'Rand';",
    tor: 'smoke',
  },
  {
    // Ohne Farbklima laeuft der Zielturm wieder mit seiner eigenen Farbwelt
    // ueber die Karte - genau der Zustand, den der Nutzer beanstandet hat.
    name: 'Der Zielturm bringt seine eigene Farbwelt mit',
    datei: 'src/gfx/einbettung.ts',
    regel: /export const KLIMA_STAERKE = 0\.40;/,
    ersatz: 'export const KLIMA_STAERKE = 0;',
    tor: 'einbettungstor',
  },
  {
    // Ohne Zielplattform steht die Festung wieder am Rand statt in der Mitte.
    // Das Tor findet die Platte im Untergrundbild und vergleicht - eine
    // eingetragene Zahl ohne Nachpruefung veraltet in diesem Verzeichnis
    // zuverlaessig.
    name: 'Zielplattform nicht eingetragen',
    datei: 'src/data/maps.ts',
    regel: /  ziel: \{ x: 1734, y: 506 \},/,
    ersatz: '  // ziel entfernt',
    tor: 'zielplattentor',
  },
  {
    // Und eine falsche Zahl muss genauso auffallen wie eine fehlende.
    name: 'Zielplattform steht falsch eingetragen',
    datei: 'src/data/maps.ts',
    regel: /  ziel: \{ x: 1734, y: 506 \},/,
    ersatz: '  ziel: { x: 1500, y: 380 },',
    tor: 'zielplattentor',
  },
  {
    // Ohne den Umzug des letzten Kontrollpunkts enden die Bahnen wieder am
    // Rand der Platte - der Waechter prueft die GERECHNETE Bahn gegen den
    // Zielpunkt und muss das sehen.
    name: 'Die Bahnen enden wieder neben der Platte',
    datei: 'src/data/maps.ts',
    suche: 'map.ziel ? [...l.slice(0, -1), { ...l[l.length - 1], ...map.ziel }] : l,',
    ersatz: '      l,',
    tor: 'guards',
  },
  {
    // Ohne Farbklima bringt auch das Tor der Leere wieder seine eigene
    // Farbwelt mit - es war bis v132 die letzte Gruppe, die das tat.
    name: 'Das Tor der Leere bleibt uneingebettet',
    datei: 'src/gfx/einbettung.ts',
    regel: /export const KLIMA_STAERKE = 0\.40;/,
    ersatz: 'export const KLIMA_STAERKE = 0;',
    tor: 'einbettungstor',
  },
  {
    // Der eigentliche Punkt an D14: die Zierde darf den SPIELWUERFEL nicht
    // bewegen. Zieht sie aus `rng`, laeuft dieselbe Partie je nach Anzahl der
    // Buschtipper verschieden - und niemand kaeme darauf, dort zu suchen.
    name: 'Die Zierde greift in den Spielwuerfel',
    datei: 'src/game/state.ts',
    regel: /        const a = this\.zierRng\.next\(\) \* Math\.PI \* 2;/,
    ersatz: '        const a = this.rng.next() * Math.PI * 2;',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: eine Zierde, die ueberall reagiert, ist keine
    // Kleinigkeit in der Karte, sondern Staub auf jedem Tipp.
    name: 'Die Zierde reagiert ueberall',
    suche: 'if (Math.hypot(gr.x - x, gr.y - y) > gr.r * 1.1) continue;',
    datei: 'src/game/state.ts',
    ersatz: 'if (false) continue;',
    tor: 'smoke',
  },
  {
    // F4: ein Turmwert, der in den Daten steht und in keiner Zeile. Genau so
    // sind `slowTime` und `falloff` bis v134 unsichtbar geblieben.
    name: 'Ein Turmwert steht vor dem Kauf nicht da',
    datei: 'src/game/turmwerte.ts',
    regel: /if \(st\.slowTime\) z\.push\(\{ feld: 'slowTime', name: 'Bremsdauer', wert: dauer\(st\.slowTime\) \}\);/,
    ersatz: '',
    tor: 'guards',
  },
  {
    // P2: "Sterne vorher" wird nicht mehr vor dem Eintragen festgehalten.
    // Dann steht dort immer der neue Wert und "Ein neuer Stern" erscheint nie.
    name: 'Sterne vorher stimmen nicht mehr',
    datei: 'src/game/state.ts',
    regel: /this\.sterneVorher = getStars\(this\.map\.id, this\.difficulty\);/,
    ersatz: 'this.sterneVorher = 3;',
    tor: 'smoke',
  },
  {
    // P2: der Bestwert wird wieder mit der laufenden statt der ueberstandenen
    // Welle eingetragen - eine Welle zuviel, bei jeder Partie.
    name: 'Bestwert eine Welle zu weit',
    datei: 'src/game/state.ts',
    regel: /recordRun\(this\.map\.id, this\.difficulty, reached, won \? this\.lives : 0\);/,
    ersatz: 'recordRun(this.map.id, this.difficulty, this.waveNumber, won ? this.lives : 0);',
    tor: 'smoke',
  },
  {
    // P2: die Auswertung beschreibt eine andere Partie als die gespielte.
    name: 'Die Auswertung zaehlt nicht mit',
    datei: 'src/game/auswertung.ts',
    regel: /kills: s\.stats\.kills,/,
    ersatz: 'kills: 0,',
    tor: 'smoke',
  },
  {
    // Die Gelaendeart eines Kreises passt nicht mehr zum Bild - so, wie sie
    // nach einem neuen Kartenbild oder einem verschobenen Kreis dastuende.
    name: 'Gelaendeart falsch eingetragen',
    datei: 'src/data/maps.ts',
    regel: /art: 'kalt'/,
    ersatz: "art: 'locker'",
    tor: 'gelaendetor',
  },
  {
    // Und die Farbe: sie ist der Grund, warum auf dem Pflaster anderes
    // aufstiebt als im Lehm daneben.
    name: 'Fleckfarbe passt nicht zum Bild',
    datei: 'src/data/maps.ts',
    regel: /farbe: '#[0-9a-f]{6}' \}/,
    ersatz: "farbe: '#00ff00' }",
    tor: 'gelaendetor',
  },
  {
    // Und die Gegenrichtung: die Arten stehen zwar in den Daten, wirken sich
    // im Spiel aber nicht aus. Bis v135 war genau das der Zustand.
    name: 'Jeder Fleck reagiert wieder gleich',
    datei: 'src/game/state.ts',
    regel: /      const art = gr\.art;/,
    ersatz: "      const art = 'locker' as typeof gr.art;",
    tor: 'smoke',
  },
  {
    // Der Fehler aus dem Audit: ein wartender Gegner wird mit vier von sechs
    // Angaben gesichert, und der geladene Stand ist leichter als der laufende.
    name: 'Schild faellt aus dem Spielstand',
    datei: 'src/game/state.ts',
    regel: /p\.lane, p\.shield, p\.traeger\]\)/,
    ersatz: 'p.lane])',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: der Stand traegt die Felder, das Laden liest sie
    // nicht. Sieht im Stand richtig aus und kommt im Spiel nicht an.
    name: 'Spielstand liest den Schild nicht',
    datei: 'src/game/state.ts',
    regel: /lane: lane \?\? 0, shield: shield \?\? 0/,
    ersatz: 'lane: lane ?? 0, shield: 0',
    tor: 'smoke',
  },
  {
    // Der Trefferstopp ohne Deckel - das war bis v136 der wahre Zustand,
    // weil ein zweites, ungedeckeltes Feld danebenlief.
    name: 'Trefferstopp ohne Deckel',
    datei: 'src/game/state.ts',
    regel: /const left = Math\.max\(0, 0\.09 - this\.stopBudget\);/,
    ersatz: 'const left = 10;',
    tor: 'smoke',
  },
  {
    // Der Pruefsteg wird wieder von oben gedeckelt statt von unten begrenzt -
    // genau der Zustand bis v137. Dann verlangt sein Inhalt mehr Hoehe, als
    // er hat, und etwas verschwindet: entweder die Knoepfe (dann schlaegt die
    // Abschneide-Pruefung an) oder die Werte (dann die Werte-Pruefung).
    //
    // Von Hand nachgestellt: mit BEIDEN Aenderungen zusammen - Deckel zurueck
    // und Mindesthoehe der Liste weg - meldet das Tor "von 4 Zeilen sind 2 zu
    // sehen (Liste 48 Punkte hoch)". Eine Probe darf nur EINE Datei anfassen,
    // deshalb steht hier die Aenderung, die fuer sich allein anschlaegt.
    name: 'Pruefsteg wieder von oben gedeckelt',
    datei: 'src/style.css',
    regel: /  bottom: calc\(58px \+ var\(--sab\)\);/,
    ersatz: '  max-height: calc(100% - 150px - var(--sat) - var(--sab));',
    tor: 'browsertor',
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

/** Den Quelltext zuruecknehmen - UND das gebaute Ergebnis mit.
 *
 *  Ohne den zweiten Teil bleibt nach jeder Probe an einem Tor, das die
 *  gebaute Datei laedt, ein `dist/` mit dem eingebauten Fehler liegen. Der
 *  Quelltext ist dann sauber, die Datei daneben nicht - und wer als
 *  naechstes misst, misst den Fehler. Genau das ist beim Bau dieser Probe
 *  passiert: eine Messung am Menue kam voellig verdreht heraus, und die
 *  Ursache lag nicht im Spiel, sondern im liegengebliebenen Bau.
 *
 *  Neu gebaut wird nur nach den Toren, die ueberhaupt bauen oder bauen
 *  lassen - sonst kostete jede der 71 Proben unnoetig eine Sekunde. */
const BAUT = new Set(['browsertor', 'browser', 'build', 'autarkie', 'bildtor', 'smoke']);
const zuruecknehmen = (tor) => {
  execSync('git checkout -- .', { cwd: ROOT, stdio: 'pipe' });
  if (BAUT.has(tor)) execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
};

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
  let ausgabe = '';
  try {
    ausgabe = execSync(`npm run ${p.tor}`, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    schlaegtAn = true;
    ausgabe = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  zuruecknehmen(p.tor);

  // Nicht jede Pruefung bricht ab. Der Dokumentenwaechter meldet Veraltetes
  // als Hinweis und laeuft weiter - mit Absicht, denn eine schiefe Formulierung
  // soll die Lieferung nicht aufhalten. Bis v103 hiess das aber auch: dieser
  // Teil liess sich gar nicht gegenproben, und genau dort sass der Fehler
  // (fuenf von sechs Hinweisen schlugen bei richtiger Prosa an).
  //
  // `meldet` prueft deshalb den Text statt den Abbruch, `meldetNicht` die
  // Stille. Beide zusammen sind erst der Beweis: dass etwas anschlaegt, sagt
  // nichts, solange es bei allem anschlaegt.
  const erfuellt = p.meldet
    ? ausgabe.includes(p.meldet)
    : p.meldetNicht
      ? !ausgabe.includes(p.meldetNicht)
      : schlaegtAn;
  const art = p.meldet ? 'meldet' : p.meldetNicht ? 'schweigt' : 'schlägt an';
  const grund = p.meldet
    ? `"${p.tor}" meldet "${p.meldet}" nicht, obwohl der Fehler eingebaut ist.`
    : p.meldetNicht
      ? `"${p.tor}" meldet "${p.meldetNicht}", obwohl der Text richtig ist.`
      : `"${p.tor}" bleibt grün, obwohl der Fehler eingebaut ist.`;

  console.log(`  ${p.name.padEnd(42)} ${p.tor.padEnd(11)} ${erfuellt ? art : art.toUpperCase() + ' NICHT'}`);
  if (!erfuellt) fehler.push(`${p.name}: ${grund}`);
}

// Zum Schluss in jedem Fall: sauberer Quelltext UND sauberer Bau.
zuruecknehmen('build');

if (fehler.length) {
  console.error(`\nPROBEN: ${fehler.length} von ${liste.length} Toren beweisen nichts`);
  for (const f of fehler) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nPROBEN: alle ${liste.length} Tore schlagen an.`);
