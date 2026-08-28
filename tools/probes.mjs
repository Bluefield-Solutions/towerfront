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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
    // Auf die Zeile im Befehlsblock verankert, nicht auf den blossen Text:
    // `npm run gate` steht seit v155 auch in der Ablauftabelle, und ein
    // Suchtext wirkt nur bei genau einem Treffer.
    regel: /^npm run gate( +)/m,
    ersatz: 'npm run gaat$1',
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
    // KEINE Wortliste mehr. Sie ist zweimal veraltet: bis v144 endete sie bei
    // "zwanzig" und traf "einundzwanzig" nur zur Haelfte ("einunddrei
    // Prüfungen" - der Waechter sucht mit Wortgrenze und sah nichts), bis
    // v152 endete sie bei "fünfund" und traf "sechsundzwanzig" gar nicht
    // mehr. Zweimal dieselbe Ursache: eine Probe, die aufzaehlt, was sie
    // pruefen soll, veraltet mit ihrem Gegenstand.
    //
    // Jetzt wird nicht mehr aufgezaehlt, sondern die STELLE genommen: was
    // in dieser Zeile vor "Prüfungen" steht, ist die Zahl - gleich wie sie
    // heisst. Das ueberlebt jede weitere Torrunde.
    regel: /(npm run gate\s+)\S+( Prüfungen)/,
    // "drei" ist nie richtig, solange die Kette mehr als drei Schritte hat -
    // und sie hat seit v11 nie weniger gehabt.
    ersatz: '$1drei$2',
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
    // Stand bis v144 auf "smoke" und bewies nichts: der Rauchtest spielt
    // eine Partie, und die geht auch mit gleichen Platzbedarfen durch. Jetzt
    // misst der Datenwaechter die FOLGE - wieviele Stellungen der groesste
    // Turm gegenueber dem kleinsten verliert.
    tor: 'guards',
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
    regel: /^  return statsFor\(def, zweig, level \+ 1\);$/m,
    ersatz: '  return def.branches[zweig].levels[level - 1] as TowerStats;',
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
    // Auf die neue Stelle nachgezogen: TF-015 hat `slowLeft` durch die
    // Wirkungsliste ersetzt, und der Musterlauf hat es gemeldet, bevor die
    // Probe stillschweigend nichts mehr bewies.
    regel: /(        e\.wirkungen = wirkungAnlegen\(e\.wirkungen, 'bremse', \(def\.slow \?\? 1\) \* w,\n          def\.slowTime \?\? 3\);)/,
    ersatz: '$1 e.hp -= 1;',
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
    // Der Hinweis muss auch nachziehen, wenn sich die HOEHE aendert -
    // gedrehtes Telefon, gezogenes Fenster. Ohne den Beobachter steht er
    // falsch, bis jemand rollt oder die Liste neu gefuellt wird.
    name: 'Rollhinweis merkt nichts von einer neuen Hoehe',
    datei: 'src/ui/ui.ts',
    regel: /      new ResizeObserver\(\(\) => this\.rollhinweis\(\)\)\.observe\(this\.iStats\);/,
    ersatz: '      void 0;',
    tor: 'browsertor',
  },
  {
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
    // Die Zielunit muss teurer sein als jede Turmlinie - Vorgabe des
    // Nutzers. Hier wird die letzte Stufe verbilligt, bis die Linie unter
    // die Schwelle faellt.
    name: 'Zielunit wird billiger als ein Turm',
    datei: 'src/data/towers.ts',
    regel: /^          \{ cost: 1950, damage: 210, cooldown: 0\.55, pierce: 3 \},$/m,
    ersatz: '          { cost: 195, damage: 210, cooldown: 0.55, pierce: 3 },',
    tor: 'guards',
  },
  {
    // Teurer UND staerker waere keine Entscheidung, sondern die einzige
    // richtige. Hier bekommt die Zielunit die Spitze des besten Turms.
    name: 'Zielunit wird zugleich die staerkste Waffe',
    datei: 'src/data/towers.ts',
    regel: /^          \{ cost: 1950, damage: 210, cooldown: 0\.55, pierce: 3 \},$/m,
    ersatz: '          { cost: 1950, damage: 600, cooldown: 0.55, pierce: 3 },',
    tor: 'guards',
  },
  {
    // Verkaufen hiesse, die Partie zu verkaufen. Der Riegel raus, und der
    // Rauchtest muss es sehen.
    name: 'Zielunit laesst sich verkaufen',
    datei: 'src/game/state.ts',
    regel: /^    if \(t\.def === 'core'\) return;$/m,
    ersatz: '    // Riegel entfernt.',
    tor: 'smoke',
  },
  {
    // Der Ausbau muss WIRKEN. Hier wird der Schadenszuwachs eingeebnet:
    // die Kosten bleiben, die Wirkung nicht.
    //
    // Auf der LETZTEN Stufe, nicht auf der vorletzten. Der erste Anlauf
    // traf Stufe 5, der Rauchtest misst aber Stufe 1 gegen Stufe 6 - der
    // Eingriff kam an und wurde trotzdem nicht gemessen. Eine Probe muss
    // dort ansetzen, wo die Pruefung hinsieht (Regel 3).
    name: 'Ausbau der Zielunit wirkt nicht mehr',
    datei: 'src/data/towers.ts',
    regel: /^          \{ cost: 1950, damage: 210, cooldown: 0\.55, pierce: 3 \},$/m,
    ersatz: '          { cost: 1950, damage: 11, cooldown: 0.55, pierce: 3 },',
    tor: 'smoke',
  },
  {
    // Seit v166 hat der Bogenturm kein Ganzbild mehr. Fragt die Bildpruefung
    // nur danach, meldet sie ihn dauerhaft als fehlend - und die Bildabnahme
    // bricht ab, obwohl im Feld ein vollstaendiger Turm steht.
    name: 'Zweiteiliger Turm gilt als bildlos',
    datei: 'src/gfx/renderer.ts',
    regel: /^      if \(!zweiteilig && !getTowerArt\(id, null, 1, s\.map\.id\)\) fehlt\.push\(`Turmbild \$\{id\}`\);$/m,
    ersatz: '      if (!getTowerArt(id, null, 1, s.map.id)) fehlt.push(`Turmbild ${id}`);',
    tor: 'bildtor',
  },
  {
    // Und dieselbe Frage in der Lesbarkeitsmessung: ohne den Rueckfall auf
    // den Sockel misst sie drei Tuerme statt vier - und was nicht gemessen
    // wird, faellt auch nicht auf.
    name: 'Lesbarkeit misst den Bogenturm nicht mehr',
    datei: 'tools/readability.mjs',
    regel: /^    if \(!buf\) \{\n      for \(let l = level; l >= 1 && !buf; l--\) \{\n.*\n      \}\n      if \(!buf && objectArt\.has\(`sockel_\$\{id\}`\)\).*\n    \}$/m,
    ersatz: '    // Rueckfall auf den Sockel entfernt.',
    tor: 'lesbarkeit',
  },
  {
    // Die Umkehrung von D18, seit v162: ein ruhender Turm steht still.
    // Eingebaut wird die alte Ruhebewegung - zwei Weltpunkte auf und ab -,
    // und das Tor muss sie sehen.
    name: 'Tuerme atmen wieder',
    datei: 'src/gfx/renderer.ts',
    regel: /^      ctx\.drawImage\(sockel, -bw \/ 2, oben, bw, sh\);$/m,
    ersatz: '      ctx.drawImage(sockel, -bw / 2, oben + Math.sin(s.time * 1.9) * 2, bw, sh);',
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
    // Ohne Farbklima laufen Zielturm und Tor der Leere wieder mit ihrer
    // eigenen Farbwelt ueber die Karte - der Zustand, den der Nutzer
    // beanstandet hat.
    //
    // **Diese Probe stand bis v166 ZWEIMAL da**, wortgleich, einmal fuer den
    // Zielturm und einmal fuer das Tor: dieselbe Datei, dieselbe Regel,
    // dasselbe Tor. Zwei Fassungen einer Probe sind eine zu viel (Regel 15) -
    // und beide bewiesen im vollen Lauf zu v166 dasselbe Nichts.
    name: 'Farbklima abgeschaltet',
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
    // Das Tor der Leere war bis v132 die letzte Gruppe ohne Einbettung.
    // Hier faellt es aus der Figurenliste des Tors heraus - dann prueft es
    // niemand mehr, und das Tor meldet trotzdem gruen. Genau die Bauart, an
    // der eine Messung leise aufhoert zu messen.
    name: 'Das Tor der Leere wird gar nicht mehr geprueft',
    datei: 'tools/einbettung.mjs',
    regel: /^const FIGUREN = Object\.keys\(OBJECT_ART\)\.map\($/m,
    ersatz: "const FIGUREN = Object.keys(OBJECT_ART).filter((k) => k !== 'gate').map(",
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
    regel: /recordRun\(this\.map\.id, this\.difficulty, reached, won \? this\.lives : 0, this\.endless\);/,
    ersatz: 'recordRun(this.map.id, this.difficulty, this.waveNumber, won ? this.lives : 0, this.endless);',
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
    // Der groesste einzelne Posten fuer den Raumeindruck: ohne Sortierung
    // liegt jeder Gegner vor jedem Turm - der Zustand bis v139.
    name: 'Szene ohne Tiefensortierung',
    datei: 'src/gfx/renderer.ts',
    regel: /    stand\.sort\(\(a, b\) => a\.y - b\.y\);/,
    ersatz: '    void 0;',
    tor: 'bildtor',
  },
  {
    // Ohne den kalten Ton sieht man einem gebremsten Gegner nichts mehr an -
    // die Bremse waere wieder eine Zahl im Modell statt einer Auskunft.
    name: 'Gebremste Gegner sehen aus wie freie',
    datei: 'src/gfx/renderer.ts',
    // Ebenfalls nachgezogen (TF-015): der Frostueberzug liest seine
    // Restdauer jetzt aus der Wirkungsliste statt aus `slowLeft`.
    regel: /          ctx\.globalAlpha = Math\.min\(1, bremse \* 1\.6\) \* 0\.85;/,
    ersatz: '          ctx.globalAlpha = 0;',
    tor: 'bildtor',
  },
  {
    // TF-001: ohne das weite Raster sieht man auf dem Telefon nicht, wo man
    // bauen darf - der Zustand bis v141.
    name: 'Bauplaetze nur unter dem Finger',
    datei: 'src/gfx/renderer.ts',
    regel: /      ctx\.globalAlpha = affordable \? 0\.55 : 0\.34;/,
    ersatz: '      ctx.globalAlpha = 0;',
    tor: 'bildtor',
  },
  {
    // Und die Gegenrichtung, die Lehre aus v122: ein volles Raster ueber der
    // ganzen Karte ist eine Tapete, keine Auskunft.
    name: 'Bauauskunft wird zur Tapete',
    datei: 'src/gfx/renderer.ts',
    regel: /      this\.buildWeit = raster\(88, 0\.92\);/,
    ersatz: '      this.buildWeit = raster(40, 1.4);',
    tor: 'bildtor',
  },
  {
    // Die Tortabelle im Pipeline-Dokument darf nicht hinter der Kette
    // zurueckbleiben - sechs Tore lang tat sie das unbemerkt.
    // Ein Ticket steht im Masterplan an drei Stellen. Nach TF-007 waren
    // zwei nachgetragen und eine nicht - beim naechsten Nachschlagen stand
    // es wieder offen da.
    // Und dasselbe fuer ein WIDERLEGTES Ticket. Der erste Entwurf des
    // Waechters kannte nur "erledigt" - und liess genau den Eintrag durch,
    // der ihn ausgeloest hatte.
    name: 'Widerlegtes Ticket nur an einer Stelle abgehakt',
    datei: 'docs/Towerfront-MASTERPLAN.md',
    regel: /\| 6 \| TF-030 \|([^\n]*)\*\*widerlegt v147\*\*[^\n|]*\|/,
    ersatz: '| 6 | TF-030 |$1— |',
    tor: 'doku',
  },
  {
    name: 'Erledigtes Ticket nur an einer Stelle abgehakt',
    datei: 'docs/Towerfront-MASTERPLAN.md',
    regel: /\| 3 \| TF-007 \|([^\n]*)\*\*erledigt v144\*\* \|/,
    ersatz: '| 3 | TF-007 |$1— |',
    tor: 'doku',
  },
  {
    // Und die Reihenfolge: zwei vertauschte Zeilen sind schwerer zu sehen
    // als eine fehlende - und richten mehr an, weil die Tabelle dann
    // vollstaendig aussieht.
    name: 'Zwei Tore in der Tabelle vertauscht',
    datei: 'docs/Towerfront-KONZEPT-und-PIPELINE.md',
    // OHNE Zeilennummern: die erste Fassung nannte "| 9 |" und "| 10 |" und
    // fiel aus, sobald ein Tor davor eingefuegt wurde - "Muster fehlt", also
    // Fall 3 aus dem Kopf dieser Datei. Eine Probe, die auf die Zahl zeigt,
    // die sie pruefen soll, veraltet zwangslaeufig mit ihr.
    regel: /\| (\d+) \| Messung Simulation \| `npm run bench` \|([^\n]*)\n\| (\d+) \| Messung Zeichnen \| `npm run bench-draw` \|([^\n]*)\n/,
    ersatz: '| $1 | Messung Zeichnen | `npm run bench-draw` |$4\n| $3 | Messung Simulation | `npm run bench` |$2\n',
    tor: 'doku',
  },
  {
    name: 'Ein Tor fehlt in der Tortabelle',
    datei: 'docs/Towerfront-KONZEPT-und-PIPELINE.md',
    // Nach dem BEFEHL gesucht, nicht nach der Zeilennummer: die Tabelle wird
    // bei jedem neuen Tor durchnumeriert, und diese Probe stand auf "7".
    // Als das Konter-Tor davor einsortiert wurde, zeigte sie ins Leere -
    // dieselbe Ursache wie bei der Probe "Zwei Tore in der Tabelle
    // vertauscht", die genau deshalb schon einmal umgestellt wurde.
    regel: /\| \d+ \| Geschosse \| `npm run geschossetor` \|[^\n]*\n/,
    ersatz: '',
    tor: 'doku',
  },
  {
    // Der Versionsstempel im laufenden Spiel: leer ist so gut wie nicht da.
    name: 'Versionsstempel bleibt leer',
    datei: 'src/ui/ui.ts',
    regel: /    this\.vVersion\.textContent = VERSION;/,
    ersatz: "    this.vVersion.textContent = '';",
    tor: 'browsertor',
  },
  {
    // Und er darf keinen Tipp abfangen - der Fehler aus v9, der das Spiel
    // auf dem Handy unbedienbar machte.
    name: 'Versionsstempel faengt Tipps ab',
    datei: 'src/style.css',
    regel: /  z-index: 2; pointer-events: none;/,
    ersatz: '  z-index: 2; pointer-events: auto;',
    tor: 'browsertor',
  },
  {
    // TF-042: eine Bahn wieder von der Strasse ziehen. Die Ratsche muss das
    // sehen - sonst haelt sie nichts fest.
    name: 'Eine Bahn rutscht von der Strasse',
    datei: 'src/data/maps.ts',
    regel: /(export const MAP_SPIRALHAIN[\s\S]{0,4000}?lanes: \[\n    \[\n)/,
    ersatz: '$1      { x: 900, y: 200 }, { x: 1100, y: 240 },\n',
    tor: 'bahntreuetor',
  },
  {
    // TF-014: die Wegvorschau abgeschaltet - man saehe nicht, woher es kommt.
    name: 'Wegvorschau abgeschaltet',
    datei: 'src/gfx/renderer.ts',
    regel: /    const t = s\.wegvorschauStand\(\);\n    if \(t === null\) return;/,
    ersatz: '    const t = s.wegvorschauStand();\n    if (t === null || t >= 0) return;',
    tor: 'bildtor',
  },
  {
    // Und sie muss beim Betreten einer Karte VON SELBST laufen. Ohne diese
    // Zeile gaebe es sie nur auf Knopfdruck - und der Knopf sagt nicht, was
    // er zeigt, bevor man ihn einmal gedrueckt hat.
    name: 'Wegvorschau laeuft nicht beim Betreten',
    datei: 'src/game/state.ts',
    regel: /^    this\.wegvorschauAb = this\.time;\n    this\.zielunitSetzen\(\);$/m,
    ersatz: '    this.wegvorschauAb = -99;\n    this.zielunitSetzen();',
    tor: 'smoke',
  },
  {
    // Regel 6 am echten Mechanismus: der Knopf ist im Menue unsichtbar, weil
    // er in der KOPFZEILE sitzt und die als ganze verschwindet. Wer ihn
    // herausnimmt, hat eine Spielbedienung ueber der Landkarte.
    //
    // Die erste Fassung dieser Probe setzte `bWeg.hidden = false` und bewies
    // nichts: ein Kind eines ausgeblendeten Elternteils bleibt unsichtbar.
    name: 'Wegknopf steht ausserhalb der Kopfzeile',
    datei: 'index.html',
    regel: /  <\/header>/,
    ersatz: '  </header>\n  <button class="chip" id="b-weg2" aria-label="Weg">Weg</button>',
    tor: 'browsertor',
  },
  {
    // TF-035: unerreichbarer Code muss den Uebersetzer stoeren. Genau so
    // stand vierzehn Zeilen tote Rechnung hinter einem `return`, und
    // `noUnusedParameters` sah die Parameter als benutzt an, weil der tote
    // Zweig sie las.
    name: 'Unerreichbarer Code faellt nicht auf',
    datei: 'src/gfx/renderer.ts',
    regel: /    return turmMasse\(\);\n  \}/,
    ersatz: '    return turmMasse();\n    console.log(1);\n  }',
    tor: 'tsc',
  },
  {
    // Der Zwischenspeicher der Gegnerbilder muss die KARTE tragen. Bis v147
    // trug er die Saumfarbe - die war je Karte zufaellig verschieden und
    // wirkte deshalb wie eine Kartenkennung.
    name: 'Gegnerbilder aller Karten im selben Fach',
    datei: 'src/gfx/enemyart.ts',
    regel: /  const cacheKey = `\$\{id\}\|\$\{flash \? 'f' : 'n'\}\|\$\{mapId\}`;/,
    ersatz: "  const cacheKey = `${id}|${flash ? 'f' : 'n'}`;",
    tor: 'einbettungstor',
  },
  {
    // Nachfolgerin von "Saum dunkel statt hell" (bis v147). Jene setzte die
    // Kartenfarbe `palette.rim` auf einen dunklen Wert und sah das
    // Lesbarkeitstor anschlagen - bewiesen hat das nur, dass die Rechnung
    // rechnet. Gezeichnet wurde diese Farbe nirgends, und mit dem Ausbau des
    // toten Saums in v148 gab es sie nicht mehr.
    //
    // Die Kantenmessung muss die KANTE messen. Wird sie durch einen festen
    // Wert ersetzt, faellt der Kontrast gegen den Boden zusammen - genau
    // das, was die alte Fassung mit `palette.rim` tat, nur andersherum.
    name: 'Kantenmessung liefert einen festen Wert',
    datei: 'tools/readability.mjs',
    regel: /  if \(!n\) throw new Error\('keine Randpunkte'\);\n  return \[r \/ n, g \/ n, b \/ n\];/,
    ersatz: "  if (!n) throw new Error('keine Randpunkte');\n  return [128, 128, 128];",
    tor: 'lesbarkeit',
  },
  {
    // TF-024, v168: das Lesbarkeitstor muss denselben Farbschleier auftragen
    // wie das Spiel. Bis v168 rechnete es mit 0,38 - dem Wert des
    // Alt-Zweigs, der seit v147 nicht mehr laeuft - und beurteilte damit
    // eine Figur, die niemand sieht (Regel 12).
    //
    // Der Eingriff stellt genau diesen Fehler wieder her. Er muss auffallen,
    // weil die eingetragenen Werte der Ratsche an der Messstelle haengen:
    // mit 0,38 rueckt Koloss/Spalter von 7,3 auf 5,4.
    name: 'Lesbarkeitstor faerbt anders als das Spiel',
    datei: 'src/gfx/enemyart.ts',
    regel: /export const FARBSCHLEIER = 0\.15;/,
    ersatz: 'export const FARBSCHLEIER = 0.38;',
    tor: 'lesbarkeit',
  },
  {
    // Und die Wetterart selbst wird geprueft, nicht uebersprungen: ein
    // Eintrag in der Palette, den niemand ansieht, ist die Stelle, an der
    // beim naechsten Mal ein Tippfehler stehen bleibt.
    name: 'Wetterart mit Tippfehler',
    datei: 'src/data/maps.ts',
    regel: /  wetter: 'regen', wetterTon: '#CFE6F2',/,
    ersatz: "  wetter: 'nieselregen' as never, wetterTon: '#CFE6F2',",
    tor: 'guards',
  },
  {
    // D13, v180: der Wellenverlauf und die Gesamtsumme werden an DERSELBEN
    // Stelle gebucht. Laufen sie auseinander, ist eine von beiden falsch,
    // ohne dass man saehe welche.
    name: 'Wellenverlauf laeuft von der Summe weg',
    datei: 'src/game/state.ts',
    regel: /^      \(this\.stats\.damageByWave\[this\.waveIndex\] \?\? 0\) \+ dmg;$/m,
    ersatz: '      (this.stats.damageByWave[this.waveIndex] ?? 0) + dmg * 0.5;',
    tor: 'smoke',
  },
  {
    // Und die Balken selbst: der Verlauf muss gezeichnet werden, nicht nur
    // gerechnet.
    name: 'Wellenverlauf wird nicht gezeichnet',
    datei: 'src/ui/statsblatt.ts',
    regel: /^  if \(gespielt < 2\) return '';           \/\/ eine Welle ist kein Verlauf$/m,
    ersatz: "  return '';",
    tor: 'smoke',
  },
  {
    // T10, v179: dieselbe Aussaat muss denselben Lauf ergeben. Ein
    // Eingabefeld, das eine Zahl annimmt und danach etwas anderes passiert,
    // ist schlimmer als keines - es verspricht Reproduzierbarkeit und
    // liefert Zufall.
    name: 'Aussaat wirkt nicht',
    datei: 'src/game/state.ts',
    regel: /^    this\.rng\.state = seed;$/m,
    ersatz: '    this.rng.state = newSeed();',
    tor: 'smoke',
  },
  {
    // Und der Block muss sich WIEDER EINLESEN lassen. Wer einen Lauf
    // weitergibt, kopiert ihn im Stueck; wer ihn nachstellt, fuegt ihn im
    // Stueck wieder ein.
    name: 'Laufblock laesst sich nicht wieder einlesen',
    datei: 'src/game/mitschrift.ts',
    regel: /^  const ausBlock = \/Aussaat\\s\+\(\\d\+\)\/i\.exec\(text\);$/m,
    ersatz: '  const ausBlock = null;',
    tor: 'smoke',
  },
  {
    // T11: ein Absturz darf nicht stumm bleiben.
    name: 'Fehlerfenster bleibt zu',
    datei: 'src/ui/ui.ts',
    regel: /^    this\.fehlerMenu\.hidden = false;$/m,
    ersatz: '    this.fehlerMenu.hidden = true;',
    tor: 'smoke',
  },
  {
    // Und die Verdrahtung dazwischen, die nur die gebaute Datei zeigt: das
    // Eingabefeld sitzt in der Oberflaeche, die Partie wird in main.ts
    // gestartet. Der Rauchtest baut beides selbst zusammen und saehe es
    // nicht.
    name: 'Eingegebene Aussaat erreicht die Partie nicht',
    datei: 'src/main.ts',
    regel: /^  const aussaat = ui\.wunschAussaat \?\? undefined;$/m,
    ersatz: '  const aussaat = undefined;',
    tor: 'browser',
  },
  {
    // D21, v178: keine Figur darf deutlich weniger Bildpunkte mitbringen als
    // die anderen. Der Eintrag stand zwei Fassungen lang still erledigt im
    // Rueckstandsverzeichnis und in CLAUDE.md - gemessen wurde er nie.
    // Eingebaut wird die Ursache, die das TOR auch sieht: die Figur wird
    // GROESSER gezeichnet, als ihr Bild hergibt. Ein Eingriff an
    // `art/gegner.json` waere hier wirkungslos - `lesbarkeit` liest den
    // gepackten Vorrat, und der aendert sich erst beim Neupacken (Regel 3).
    name: 'Eine Gegnerfigur wird groesser gezeichnet als ihr Bild hergibt',
    datei: 'src/data/enemies.ts',
    regel: /    hp: 52, speed: 96, bounty: 3, leak: 1, radius: 24, armor: 1, slowResist: 0\.1,/,
    ersatz: '    hp: 52, speed: 96, bounty: 3, leak: 1, radius: 60, armor: 1, slowResist: 0.1,',
    tor: 'lesbarkeit',
  },
  {
    // v177: die Niederlageaufnahme fiel mitten in den Ansichtswechsel - und
    // die Torkette hat es nicht gemeldet, weil sie nur den Querschnitt
    // faehrt. Seit alle Menueaufnahmen im Querschnitt stehen, faengt sie es.
    name: 'Niederlageaufnahme faellt in den Ansichtswechsel',
    datei: 'tools/shots.mjs',
    regel: /  \/\/ Aufnahme mitten hinein\.\n  return 20;/,
    ersatz: '  // Aufnahme mitten hinein.\n  return 10;',
    tor: 'bildtor',
  },
  {
    // D6, v176: der Ausweg aus einem Dialog muss GANZ im Bild stehen. Kein
    // anderes Tor konnte das melden: der Rauchtest fragt in jsdom nach
    // `hidden` und kennt keine Hoehen, die Beruehrungsmessung rechnet
    // Groessen aus der Stilvorlage statt aus dem Bild.
    name: 'Dialogkarte schneidet ihren Ausweg ab',
    datei: 'src/style.css',
    regel: /  min-width: 260px; max-height: 92vh; overflow: hidden; padding: 18px 24px;/,
    ersatz: '  min-width: 260px; max-height: 60vh; overflow: hidden; padding: 18px 24px;',
    tor: 'browser',
  },
  {
    // D6, v176: "Bewegung reduziert" muss dem Bild wirklich Bewegung
    // nehmen. Ein Schalter, der nur seinen eigenen Stand aendert, verspricht
    // eine Wahl, die es nicht gibt.
    name: 'Bewegungsreduktion laesst das Wetter stehen',
    datei: 'src/gfx/renderer.ts',
    regel: /^    if \(!ruhig\) drawWetter\(ctx, s\.crystalPulse, hi, s\.map\.palette\.wetter, s\.map\.palette\.wetterTon\);$/m,
    ersatz: '    drawWetter(ctx, s.crystalPulse, hi, s.map.palette.wetter, s.map.palette.wetterTon);',
    tor: 'bildtor',
  },
  {
    // Und die gespeicherte Lautstaerke muss beim Start ankommen: sie steht
    // im Speicher, der Regler zeigt sie an, und gehoert wird der
    // Standardwert - der haeufigste Fehler dieser Sorte.
    name: 'Gespeicherte Lautstaerke wird beim Start vergessen',
    datei: 'src/ui/ui.ts',
    regel: /^    Sfx\.setVolume\(getSettings\(\)\.volume\);$/m,
    ersatz: '    // Lautstaerke nicht uebernommen.',
    tor: 'smoke',
  },
  {
    // Vierter Fall derselben Familie: `sync` steigt frueh aus, wenn sich die
    // Signatur nicht geaendert hat - und die beschreibt den Spielzustand,
    // nicht die Einstellungen. Steht die Ableitung dahinter, bleibt der
    // gewaehlte Knopf ungewaehlt, bis sich zufaellig das Gold aendert.
    name: 'Einstellungen werden hinter dem Ausstieg abgeleitet',
    datei: 'src/ui/ui.ts',
    regel: /^    this\.syncOptionen\(\);$/m,
    ersatz: '    // Ableitung verschoben.',
    tor: 'smoke',
  },
  {
    // C28, v175: der Nachteil des Moersers muss ueberall etwas kosten. Wird
    // die Luft einer Karte wieder duenn, ist er dort geschenkt - und der
    // Moerser zum selben Preis der bessere Turm.
    name: 'Eine Karte verliert ihre Luft',
    datei: 'src/data/waves.ts',
    regel: /    \{ enemy: 'flyer', count: 7, gap: 1\.8, delay: 6 \} \] \},/,
    ersatz: "    { enemy: 'flyer', count: 1, gap: 1.8, delay: 6 } ] },",
    tor: 'guards',
  },
  {
    // Und die zweite Haelfte derselben Regel: Luft muss oft genug vorkommen,
    // um eine Entscheidung zu sein. Eine einzelne Luftwelle laesst sich
    // aussitzen.
    name: 'Luft nur noch in zwei Wellen',
    datei: 'src/data/waves.ts',
    regel: /    \{ enemy: 'flyer', count: 3, gap: 1\.6, delay: 10 \} \] \},/,
    ersatz: "    { enemy: 'flyer', count: 0, gap: 1.6, delay: 10 } ] },",
    tor: 'guards',
  },
  {
    // T6, v174: verbucht wird, was WIRKLICH verloren geht. Der Kristall
    // wird bei null abgeschnitten; ein Gegner mit drei Punkten Durchschlag
    // auf einen Kristall mit einem Punkt Rest kostete bis dahin trotzdem
    // drei in der Bilanz. Gefunden hat es der Durchlauf ueber jede Karte.
    name: 'Kristallverlust wird zu hoch verbucht',
    datei: 'src/game/state.ts',
    regel: /^    const wirklich = Math\.min\(def\.leak, Math\.max\(0, this\.lives\)\);$/m,
    ersatz: '    const wirklich = def.leak;',
    tor: 'smoke',
  },
  {
    // Und die eine Zusage des Endlosmodus: er geht ueber den Plan hinaus.
    // Bis v174 hat das nie jemand nachgespielt.
    name: 'Endlosmodus endet mit dem Wellenplan',
    datei: 'src/game/state.ts',
    regel: /^    return !this\.waveActive && \(this\.endless \|\| this\.waveIndex < this\.waves\.length\);$/m,
    ersatz: '    return !this.waveActive && this.waveIndex < this.waves.length;',
    tor: 'smoke',
  },
  {
    // T9, v183: beim Kartenwechsel wird geraeumt. Ohne das lagen nach vier
    // Besuchen 51,4 MB in den Ablagen statt 23,4 - und der Zuwachs hoerte
    // nicht auf. Auf einem Telefon ist Speicher die knappere Ware.
    name: 'Kartenwechsel raeumt nicht mehr',
    datei: 'src/gfx/renderer.ts',
    regel: /^      if \(this\.terrainFor && this\.terrainFor !== s\.map\.id\) karteWechseln\(s\.map\.id\);$/m,
    ersatz: '      if (false) karteWechseln(s.map.id);',
    tor: 'speichertor',
  },
  {
    // Und die andere Haelfte: eine Ablage, die sich nicht anmeldet, wird
    // nie geraeumt - und niemand merkt es, weil die Summe nur langsamer
    // waechst. Die Turmbilder sind die groesste der angemeldeten.
    name: 'Eine Ablage meldet sich nicht mehr an',
    datei: 'src/gfx/towerart.ts',
    regel: /^ablageAnmelden\('Türme eingebettet', tinted, tintedTafel\);$/m,
    ersatz: 'void tintedTafel;',
    tor: 'speichertor',
  },
  {
    // T8, v182: der Kristall zeigt seinen Zustand - und zwar im Bild, nicht
    // nur im Quelltext. Bis v181 lagen die Risse hinter einem `return`, das
    // immer fiel: elf von zwoelf Bildern nahmen den Bildzweig.
    name: 'Rissebene wird nicht gestempelt',
    datei: 'src/gfx/renderer.ts',
    regel: /^        if \(riss\) drawSprite\(ctx, riss, x, y \+ h \* \(0\.5 - HOCH\)\);$/m,
    ersatz: '        if (false && riss) drawSprite(ctx, riss, x, y + h * (0.5 - HOCH));',
    tor: 'kristalltor',
  },
  {
    // Und die andere Haelfte: die Stufen muessen WACHSEN. Mischten sie sich
    // je Stufe neu, saehe man ein Flackern statt eines fortschreitenden
    // Zerbrechens - und die Deckung waere auf jeder Stufe dieselbe.
    name: 'Rissstufen wachsen nicht mehr',
    datei: 'src/gfx/sprites.ts',
    regel: /^      for \(let i = 0; i < n \* 2; i\+\+\) \{$/m,
    ersatz: '      for (let i = 0; i < 2; i++) {',
    tor: 'kristalltor',
  },
  {
    // C27, v181: der Endlosmodus zaehlt ueber den Wellenplan hinaus. Bis
    // v180 lief sein Ergebnis in denselben Bestwert wie die normale Partie,
    // und der Titelbildschirm behauptete danach auf einer Karte mit
    // fuenfzehn Wellen "bisher am weitesten: Welle 20".
    name: 'Endlos schreibt in den normalen Bestwert',
    datei: 'src/core/storage.ts',
    regel: /^  `\$\{mapId\}\|\$\{difficulty\}\$\{endlos \? '\|endlos' : ''\}`;$/m,
    ersatz: "  `${mapId}|${difficulty}` + (endlos ? '' : '');",
    tor: 'smoke',
  },
  {
    // Eine Pruefung, die nebenbei den Zustand aendert, den andere Pruefungen
    // lesen, ist keine Pruefung. Der Durchlauf spielt drei Partien zu Ende
    // und traegt dabei Sterne ein - stellt er sie nicht zurueck, faellt die
    // Sternepruefung darunter um.
    name: 'Durchlauf laesst seinen Fortschritt stehen',
    datei: 'tools/smoke.ts',
    regel: /^  fortschritt\.stars = sterneVorher;$/m,
    ersatz: '  // Fortschritt nicht zurueckgestellt.',
    tor: 'smoke',
  },
  {
    // D2, v173: die Asche muss glimmen. Ohne Glut ist Aschefall
    // beigefarbener Schnee - und die erste Fassung dieser Pruefung hat das
    // NICHT gemerkt: sie fragte nach "warm", und der Ascheton ist selbst
    // warm. Sie meldete mit abgeschalteter Glut unveraendert 29 Prozent.
    // Gemessen wird jetzt die Saettigung, die nur die Glut hat.
    name: 'Der Ascheschlucht geht die Glut aus',
    datei: 'src/gfx/atmosphere.ts',
    regel: /^        const istGlut = art === 'asche' && rnd\(\) < 0\.125;$/m,
    ersatz: '        const istGlut = false;',
    tor: 'bildtor',
  },
  {
    // Und die Sparfassung: bei niedriger Qualitaet duenner, aber nicht aus.
    // Ein Ort, dessen Wetter auf schwachen Geraeten verschwindet, waere
    // dort ein anderer Ort.
    name: 'Wetter faellt bei niedriger Qualitaet ganz weg',
    datei: 'src/gfx/atmosphere.ts',
    regel: /^  regen: \[130, 60\],$/m,
    ersatz: '  regen: [130, 0],',
    tor: 'bildtor',
  },
  {
    // D5, v172: der Ansichtswechsel muss von SELBST anspringen. Wird `view`
    // wieder ein einfaches Feld, laeuft das Menue ohne Uebergang - und die
    // Pruefung auf den Versatz saehe nichts davon, weil sie die Uhr von Hand
    // stellt.
    name: 'Ansichtswechsel springt nicht mehr an',
    datei: 'src/game/menu.ts',
    regel: /^  set view\(v: MenuView\) \{\n    if \(v === this\._view\) return;\n    this\._view = v;\n    this\.wechselZeit = this\.time;\n  \}$/m,
    ersatz: '  set view(v: MenuView) { this._view = v; }',
    tor: 'smoke',
  },
  {
    // D5, v172: die Trefferflaechen wandern beim Ansichtswechsel MIT. Bleiben
    // sie an der Endlage, gibt es fuer zwei Zehntelsekunden Knoepfe, die man
    // sieht, aber nicht trifft - der Fehler, gegen den die Menuezeichnung von
    // Anfang an gebaut ist.
    name: 'Trefferflaechen bleiben beim Ansichtswechsel stehen',
    datei: 'src/gfx/menurender.ts',
    regel: /^    m\.hotspots\.push\(dy \? \{ \.\.\.h, y: h\.y \+ dy \} : h\);$/m,
    ersatz: '    m.hotspots.push(h);',
    tor: 'smoke',
  },
  {
    // Und der Waechter dagegen, dass eine Aufnahme mitten im Uebergang
    // faellt: bei 93 Prozent Deckkraft sieht ein Bild richtig aus und ist es
    // trotzdem nicht.
    name: 'Aufnahme faellt mitten im Ansichtswechsel',
    datei: 'tools/shots.mjs',
    regel: /  \/\/ aus sieht und es trotzdem nicht ist\.\n  return 20;/,
    ersatz: '  // aus sieht und es trotzdem nicht ist.\n  return 4;',
    tor: 'bildtor',
  },
  {
    // D12, v171: die Bilanz muss den ganzen Schaden zeigen. Eingebaut wird
    // der echte Fehler, den es bis v170 gab - die Balkenliste laeuft ueber
    // TOWER_ORDER, und die Zielunit steht da nicht drin.
    name: 'Bilanz laesst die Zielunit weg',
    datei: 'src/ui/statsblatt.ts',
    regel: /^  liste\.push\(\[TOWERS\.core\.name, TOWERS\.core\.accent, st\.damageBy\.core \?\? 0\]\);$/m,
    ersatz: '  // Zielunit weggelassen.',
    tor: 'smoke',
  },
  {
    // Beim HINSEHEN gefunden, nicht von einem Tor (Regel 8): das Blatt
    // meldete mitten in der ersten Welle "Wellen 0/15". Am Ende ist
    // "ueberstanden" die richtige Lesart, waehrend des Laufs die falsche.
    name: 'Bilanz zaehlt mitten im Lauf die ueberstandenen Wellen',
    datei: 'src/ui/statsblatt.ts',
    regel: /\? \[`Welle`, `\$\{Math\.max\(1, s\.waveNumber\)\}\/\$\{s\.totalWaves\}`\]/,
    ersatz: "? ['Welle', `${Math.max(0, s.waveNumber - 1)}/${s.totalWaves}`]",
    tor: 'smoke',
  },
  {
    // Regel 6 am Bilanzblatt: seine Sichtbarkeit wird ABGELEITET, nicht
    // gesetzt. Faellt die Ableitung weg, bleibt es nach dem Fortsetzen
    // offen liegen - genau die Verfallsart, die im Menue zweimal die
    // Spielbedienung sichtbar gelassen hat.
    name: 'Bilanzblatt haengt an einem Schalter',
    datei: 'src/ui/ui.ts',
    regel: /^    if \(this\.pauseMenu\.hidden\) this\.bilanzOffen = false;$/m,
    ersatz: '    // Ableitung entfernt.',
    tor: 'smoke',
  },
  {
    // Und die dritte Falle derselben Familie: `sync` steigt frueh aus, wenn
    // sich die Signatur nicht geaendert hat. Steht der Zustand nicht darin,
    // tut der Knopf alles richtig und die Anzeige folgt trotzdem nicht.
    name: 'Bilanzblatt fehlt in der Signatur',
    datei: 'src/ui/ui.ts',
    regel: /^      this\.bilanzOffen \? 'b' : '-',$/m,
    ersatz: "      '-',",
    tor: 'smoke',
  },
  {
    // v169: die Turmformmessung muss die STUFE sehen. Wird der Rueckfall auf
    // Stufe 1 festgenagelt, sind alle sechs Stufen dasselbe Bild - und der
    // Ausbau, fuer den man bis 1950 Gold zahlt, waere im Umriss nicht mehr
    // zu unterscheiden, ohne dass sich am Spiel etwas geaendert haette.
    name: 'Turmform misst jede Stufe als Stufe 1',
    datei: 'tools/readability.mjs',
    regel: /    for \(let l = level; l >= 1 && !buf; l--\) buf = towerArt\.get\(`\$\{id\}_1_\$\{l\}`\) \?\? null;/,
    ersatz: '    for (let l = 1; l >= 1 && !buf; l--) buf = towerArt.get(`${id}_1_${l}`) ?? null;',
    tor: 'lesbarkeit',
  },
  {
    // Und die andere Haelfte: vier Sorten, die auf dem Feld dieselbe Figur
    // sind. Eingebaut wird der echte Fehler - drei Sorten holen sich das
    // Bild des Moersers -, nicht das Entfernen der Pruefung.
    name: 'Drei Turmsorten mit demselben Bild',
    datei: 'tools/readability.mjs',
    regel: /buf = towerArt\.get\(`\$\{id\}_1_\$\{l\}`\) \?\? null;/,
    ersatz: 'buf = towerArt.get(`mortar_1_${l}`) ?? null;',
    tor: 'lesbarkeit',
  },
  {
    // Regel 13 an der Formmessung: wer eine Wirkung misst, schaltet sie
    // zuerst ab. Liefert `umriss` fuer jedes Bild dieselbe volle Maske,
    // ueberdecken sich ALLE Paare zu 1,00 - und die Paare, die heute allein
    // die Farbe traegt, muessen dann als neu und zu nah gemeldet werden.
    name: 'Silhouettenmessung sieht ueberall dieselbe Form',
    datei: 'tools/silhouette.ts',
    regel: /^  for \(let i = 0; i < W \* H; i\+\+\) if \(data\[i \* 4 \+ 3\] > 24\) maske\[i\] = 1;$/m,
    ersatz: '  for (let i = 0; i < W * H; i++) maske[i] = 1;',
    tor: 'lesbarkeit',
  },
  {
    // Und die Gegenrichtung, weil eine Ratsche sonst zum Freibrief wird:
    // findet die Formmessung NIRGENDS mehr eine Aehnlichkeit, trifft der
    // Eintrag Koloss/Spalter auf nichts - und ein Eintrag ohne Gegenstand
    // ist genau die Verfallsart, die dieses Verzeichnis viermal gekostet
    // hat.
    name: 'Silhouettenmessung findet nie eine Aehnlichkeit',
    datei: 'tools/silhouette.ts',
    regel: /^  return oder \? und \/ oder : 1;$/m,
    ersatz: '  return oder ? 0 : 1;',
    tor: 'lesbarkeit',
  },
  {
    // TF-030: die Figuren wachsen ueber die Strasse hinaus.
    name: 'Gegner passen nicht mehr auf die Strasse',
    datei: 'src/gfx/enemyart.ts',
    regel: /  const roh = Math\.max\(ENEMIES\[id\]\.radius \* 3\.0, 50\);/,
    ersatz: '  const roh = Math.max(ENEMIES[id].radius * 6.0, 50);',
    tor: 'gedraengetor',
  },
  {
    // Und die Gegenrichtung: die Strasse schrumpft unter die Figuren.
    name: 'Strasse schrumpft unter die Gegner',
    datei: 'src/data/maps.ts',
    regel: /w: (\d+) \}/g,
    ersatz: 'w: 18 }',
    tor: 'gedraengetor',
  },
  {
    // TF-032: "hinten" tut dasselbe wie "vorn" - eine Wahl ohne Folgen.
    name: 'Zielmodus hinten wirkt wie vorn',
    datei: 'src/game/state.ts',
    regel: /        : wahl === 'hinten' \? -e\.travelled/,
    ersatz: "        : wahl === 'hinten' ? e.travelled",
    tor: 'smoke',
  },
  {
    // Und derselbe Eingriff gegen das Balance-Tor: dort wird nicht geprueft,
    // ob der Modus ANDERS waehlt, sondern ob er etwas NUETZT.
    name: 'Zielmodus hinten nuetzt nichts',
    datei: 'src/game/state.ts',
    regel: /        : wahl === 'hinten' \? -e\.travelled/,
    ersatz: "        : wahl === 'hinten' ? e.travelled",
    tor: 'sim',
  },
  {
    // Die Knopfreihe: feste vier Spalten bei fuenf Modi.
    name: 'Zielreihe bricht auf zwei Zeilen um',
    datei: 'src/ui/ui.ts',
    regel: /      `repeat\(\$\{ZIELWAHL_ORDNUNG\.length\}, minmax\(0, 1fr\)\)`;/,
    ersatz: "      'repeat(4, minmax(0, 1fr))';",
    tor: 'browsertor',
  },
  {
    // Ungleiche Spalten: der schmalste Knopf faellt unter das Fingermass.
    name: 'Zielknoepfe verschieden breit',
    datei: 'src/ui/ui.ts',
    regel: /      `repeat\(\$\{ZIELWAHL_ORDNUNG\.length\}, minmax\(0, 1fr\)\)`;/,
    ersatz: '      `repeat(${ZIELWAHL_ORDNUNG.length}, 1fr)`;',
    tor: 'browsertor',
  },
  {
    // Eine Beschriftung, die nicht hineinpasst.
    name: 'Zielknopf schneidet sein Wort ab',
    datei: 'src/game/types.ts',
    regel: /  schwach: 'Wund',/,
    ersatz: "  schwach: 'Schwaechster',",
    tor: 'browsertor',
  },
  {
    // TF-019: die Muendung wieder in die Turmmitte legen.
    name: 'Schuesse kommen wieder aus dem Sockel',
    datei: 'src/data/turmgestalt.ts',
    // Am Ergebnis angesetzt, nicht am Verzeichnis: der erste Anlauf schob
    // ein leeres Objekt VOR die Eintraege - die standen danach immer noch da,
    // und die Probe bewies nichts (Regel 3).
    regel: /  const m = MUENDUNG\[id\];\n  if \(!m\) return \{ x: 0, y: 0 \};/,
    ersatz: '  const m = MUENDUNG[id];\n  if (m || !m) return { x: 0, y: 0 };',
    tor: 'muendungstor',
  },
  {
    // Ein Punkt, der neben der Figur liegt - das Rohr endet im Nichts.
    name: 'Muendung schwebt neben dem Turm',
    datei: 'src/data/turmgestalt.ts',
    regel: /^  mortar: \{ x: 0\.280, y: 0\.012, dreht: false \},$/m,
    ersatz: '  mortar: { x: 0.93, y: 0.012, dreht: false },',
    tor: 'muendungstor',
  },
  {
    // Die alte Muendung des Bogenturms - richtig auf dem Armbrustbild, falsch
    // auf der Zwillingskanone: dort liegt auf der Mittelachse Luft zwischen
    // den Laeufen. Sie kommt nur durch, wenn das Tor die STUFENLOSE
    // Rueckfallfassung misst statt der gezeichneten Stufe. Genau das war der
    // Fehler, den v160 aufgehoben hat.
    name: 'Muendung wieder auf der Mittelachse',
    datei: 'src/data/turmgestalt.ts',
    regel: /^  arrow: \{ x: 0\.352, y: 0\.031, dreht: true \},$/m,
    ersatz: '  arrow: { x: 0.5, y: 0.074, dreht: true },',
    tor: 'muendungstor',
  },
  {
    // Die Querlage wieder unterschlagen: dann sitzt die Muendung auf der
    // Zielachse, egal was in `x` steht - und der Blitz erscheint zwischen
    // den Laeufen in der Luft.
    name: 'Drehende Waffe unterschlaegt die Querlage',
    datei: 'src/data/turmgestalt.ts',
    regel: /^    const quer = \(m\.x - 0\.5\) \* ww;$/m,
    ersatz: '    const quer = 0;',
    tor: 'muendungstor',
  },
  {
    // Die Rueckfallkette abgeschaltet: dann finden Stufe 5 und 6 des
    // Bogenturms keine Waffe mehr, und der Rauchtest muss das melden.
    // Trifft zugleich den Renderer - beide lesen dieselbe Kette.
    name: 'Rueckfallkette der Bildstufen abgeschaltet',
    datei: 'src/gfx/objectart.ts',
    regel: /^  for \(let l = Math\.max\(1, Math\.round\(level\)\); l >= 1; l--\) \{$/m,
    ersatz: '  if (!(`${basis}_${Math.round(level)}` in OBJECT_ART)) return null;\n'
      + '  for (let l = Math.max(1, Math.round(level)); l >= 1; l--) {',
    tor: 'smoke',
  },
  {
    // Und einer, der im Sockel sitzt statt oben am Rohr.
    name: 'Muendung sitzt im Sockel',
    datei: 'src/data/turmgestalt.ts',
    regel: /^  prism: \{ x: 0\.316, y: 0\.012, dreht: false \},$/m,
    ersatz: '  prism: { x: 0.5, y: 0.62, dreht: false },',
    tor: 'muendungstor',
  },
  {
    // Der Frostturm hat kein Rohr - ein Eintrag waere eine Behauptung ueber
    // ein Bild, das keine Waffe zeigt.
    name: 'Frostturm bekommt ein Rohr angedichtet',
    datei: 'src/data/turmgestalt.ts',
    regel: /  \/\/ Der Frostturm hat kein Rohr/,
    ersatz: '  frost: { x: 0.5, y: 0.05, dreht: false },\n  // Der Frostturm hat kein Rohr',
    tor: 'muendungstor',
  },
  {
    // Die teuerste Lehre dieser Runde: der Versatz ist Hoehe im Bild. Wer
    // ihn in die Flugbahn zurueckholt, macht das Spiel messbar schwerer,
    // ohne dass eine Balancezahl es erklaeren wuerde.
    name: 'Muendungsversatz rutscht in die Flugbahn',
    datei: 'src/game/state.ts',
    regel: /    p\.x = t\.x; p\.y = t\.y; p\.sx = t\.x; p\.sy = t\.y; p\.tx = aim\.x; p\.ty = aim\.y;/,
    ersatz: '    p.x = t.x + m.x; p.y = t.y + m.y; p.sx = p.x; p.sy = p.y; p.tx = aim.x; p.ty = aim.y;',
    tor: 'muendungstor',
  },
  {
    // TF-007: das Ersatzziel wieder ausgebaut - dann verpufft wieder jeder
    // achte Schuss, und das Tor muss das sehen.
    name: 'Verwaiste Geschosse verpuffen wieder',
    datei: 'src/game/state.ts',
    regel: /      if \(!tgt\) tgt = this\.ersatzziel\(p\);/,
    ersatz: '      // Ersatzziel abgeschaltet.',
    tor: 'geschossetor',
  },
  {
    // Und der Suchraum selbst: auf Null gesetzt findet die Suche nie etwas.
    name: 'Suchraum fuer das Ersatzziel auf Null',
    datei: 'src/game/state.ts',
    regel: /export const ERSATZ_UMKREIS = 240;/,
    ersatz: 'export const ERSATZ_UMKREIS = 0;',
    tor: 'geschossetor',
  },
  {
    // Der Luftfilter im Ersatzziel. Ohne ihn nimmt ein bodengebundener
    // Schuetze einen Gleiter als Ersatz - eine Waffe, die er nicht hat.
    name: 'Ersatzziel nimmt auch Flieger',
    datei: 'src/game/state.ts',
    regel: /      if \(!p\.luft && ENEMIES\[e\.def\]\.flying\) continue;/,
    ersatz: '      // Luftfilter entfernt.',
    tor: 'geschossetor',
  },
  {
    // Der Kegel: weit geoeffnet nimmt ein Schuss auch ein Ziel HINTER sich an
    // und macht kehrt. Der Verpuffungsanteil wuerde dabei sogar besser - nur
    // die Richtungsmessung faellt darauf nicht herein.
    name: 'Der Suchkegel oeffnet sich nach hinten',
    datei: 'src/game/state.ts',
    regel: /export const ERSATZ_KEGEL = 0\.766;/,
    ersatz: 'export const ERSATZ_KEGEL = -1;',
    tor: 'geschossetor',
  },
  {
    // TF-016: ein bezahlter Schuss verfaellt, weil der Turm verkauft wurde.
    name: 'Verkauf loescht den Schuss in der Luft',
    datei: 'src/game/state.ts',
    regel: /    t\.target = null;\n    compact\(this\.towers, \(o\) => o === t\);/,
    ersatz: '    t.target = null;\n    for (const p2 of this.projectiles) if (p2.owner === t) p2.dead = true;\n    compact(this.towers, (o) => o === t);',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: ein Schuss, der schon unterwegs ist, wird durch
    // einen Ausbau nachtraeglich staerker.
    name: 'Ausbau wirkt rueckwirkend auf fliegende Schuesse',
    datei: 'src/game/state.ts',
    regel: /    t\.branch = chosen;\n    t\.level\+\+;/,
    ersatz: '    t.branch = chosen;\n    t.level++;\n    for (const p2 of this.projectiles) if (p2.owner === t) p2.damage = this.towerStats(t).damage;',
    tor: 'smoke',
  },
  {
    // TF-023: das Schildzeichen fehlt wieder. Bis v151 stand der Schild nur
    // im handgeschriebenen Satz - wer eine Welle ohne Satz baute, bekam
    // keinen Hinweis, und niemand haette es gemerkt.
    name: 'Schildzeichen fehlt in der Vorschau',
    datei: 'src/ui/ui.ts',
    regel: /      if \(schild\.has\(id\)\) marken\.push\('Schild'\);\n/,
    ersatz: '',
    tor: 'smoke',
  },
  {
    // Und dasselbe fuer den Traeger. Zwei Proben, nicht eine: die beiden
    // Zeilen koennen einzeln verschwinden, und eine Probe, die nur die
    // erste zieht, bezeugt die zweite nicht.
    name: 'Traegerzeichen fehlt in der Vorschau',
    datei: 'src/ui/ui.ts',
    regel: /      if \(traeger\.has\(id\)\) marken\.push\('Träger'\);\n/,
    ersatz: '',
    tor: 'smoke',
  },
  {
    // Das Sprungzeichen an JEDER Welle - aus einer einzigen zu kleinen Zahl.
    // Ein Zeichen, das immer dasteht, warnt vor nichts (Regel 13).
    name: 'Sprungzeichen an jeder Welle',
    datei: 'src/data/waves.ts',
    regel: /export const SPRUNG = [0-9.]+;/,
    ersatz: 'export const SPRUNG = 0.01;',
    tor: 'smoke',
  },
  {
    // Der Streifen quetscht den Erklaersatz wieder zur Saeule. Genau der
    // Zustand vor v151: Welle 15 wurde 94 statt 49 Bildpunkte hoch, und
    // das Browsertor sah es nicht, weil es nur Welle 1 kennt.
    name: 'Wellenvorschau quetscht den Satz',
    datei: 'src/style.css',
    regel: /  display: flex; align-items: center; gap: 8px 10px; flex-wrap: wrap; overflow: hidden;/,
    ersatz: '  display: flex; align-items: center; gap: 8px 10px; flex-wrap: nowrap; overflow: hidden;',
    tor: 'streifentor',
  },
  {
    // v151 lief hier gruen durch alle 25 Tore und brach im Ablaufplan ab:
    // ein festgeschriebener Chromium-Pfad, den es nur in dieser Umgebung
    // gibt. Der Waechter faengt die zweite Kopie ab - diese Probe faengt
    // den Waechter ab.
    name: 'Ein Werkzeug schreibt den Chromium-Pfad fest',
    datei: 'tools/streifen.ts',
    regel: /const browser = await browserStarten\(\);/,
    // Der Pfad wird ZUSAMMENGESETZT, nicht hingeschrieben: sonst traegt die
    // Probe selbst, wonach der Waechter sucht, und meldet sie als Fehler.
    // Eingebaut wird trotzdem der volle Pfad - der Eingriff ist derselbe.
    ersatz: "const browser = await (await import('playwright')).chromium.launch("
      + `{ executablePath: '/${'opt'}/pw-browsers/chromium' });`,
    tor: 'guards',
  },
  {
    // TF-034: der Konter-Satz kommt gar nicht mehr an. Der Rauchtest misst
    // die Blase im DOM - ohne diese Zeile bleibt sie leer.
    name: 'Konter-Satz erscheint nicht',
    datei: 'src/ui/ui.ts',
    regel: /    const frisch = this\.neuerKonter\(\);\n    if \(frisch\) \{[^\n]*\n/,
    ersatz: '    const frisch = null;\n',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: er bleibt stehen, wenn die Welle laeuft. Dann
    // ist er kein Rat mehr, sondern ein Vorwurf - und er verdeckt das Feld.
    name: 'Konter-Satz bleibt im Kampf stehen',
    datei: 'src/ui/ui.ts',
    regel: /        done: \(g2\) => g2\.waveActive \|\| !g2\.canStartWave,/,
    ersatz: '        done: () => false,',
    tor: 'smoke',
  },
  {
    // Regel 13 am Tor selbst: wenn JEDE Gegnerart etwas bekommt, hebt der
    // Satz nichts mehr hervor. Eine zu weiche Grenze sieht aus wie
    // Vollstaendigkeit.
    name: 'Jede Gegnerart bekommt einen Konter',
    datei: 'src/data/konter.ts',
    regel: /  if \(d\.speed >= mitte \* 1\.5\) \{/,
    ersatz: '  if (d.speed >= 0) {',
    tor: 'kontertor',
  },
  {
    // Regel 15 am Tor: eine abgeleitete Tatsache kehrt in einen
    // handgeschriebenen Wellensatz zurueck. Genau der Zustand vor v152.
    name: 'Wellensatz erzaehlt den Konter noch einmal',
    datei: 'src/data/waves.ts',
    regel: /note: 'Erster Koloss'/,
    ersatz: "note: 'Erster Koloss — Panzerung 3'",
    tor: 'kontertor',
  },
  {
    // Die Einweisungsblase waechst - aber nicht am Text, sondern an der
    // Stilvorlage.
    //
    // Die erste Fassung dieser Probe schrieb einen sehr langen Satz und
    // bewies NICHTS: `kontertor` deckelt bei 190 Zeichen, und so weit reicht
    // die Hoehengrenze gar nicht. Nachgemessen kostet ein 451-Zeichen-Satz
    // 71 Punkte, zusammen mit der Vorschau 120 von 130 - knapp darunter, und
    // ein Zustand, den ein anderes Tor ohnehin verbietet. Eine Probe auf
    // einen unerreichbaren Zustand ist keine.
    //
    // Erreichbar ist der Schriftgrad: er steht in derselben Datei wie alles
    // andere und aendert die Hoehe sofort. Das ist die Bruchstelle, die
    // dieses Tor wirklich bewacht.
    //
    // Und die zweite Fassung bewies wieder nichts, aus einem lehrreichen
    // Grund: `.coach-text` steht ZWEIMAL in der Stilvorlage - mit 12,5 px
    // allgemein und mit 11,5 px im Kompaktblock unter
    // `@media (max-height: 480px)`. Auf dem Zielgeraet gilt der zweite, und
    // die Probe hatte den ersten angefasst. Regel 15, hier einmal als
    // Falle fuer die Probe statt fuer den Code: gegriffen werden muss die
    // Regel, die auf dem gemessenen Geraet WIRKT.
    name: 'Einweisungsblase waechst ueber das Feld',
    datei: 'src/style.css',
    regel: /  \.coach-text \{ font-size: 11\.5px; \}/,
    ersatz: '  .coach-text { font-size: 23px; }',
    tor: 'streifentor',
  },
  {
    // TF-011: die Sonne wandert. `LICHT` ist die Richtung, mit der der
    // Renderer jeden Schatten zeichnet - dreht man sie, sind alle Figuren
    // ploetzlich von der falschen Seite beleuchtet, ohne dass sich ein
    // einziges Bild geaendert haette. Genau das soll die Messung sehen.
    name: 'Die Sonne steht woanders',
    datei: 'src/data/config.ts',
    regel: /export const LICHT = \{ x: 0\.62, y: 0\.78 \};/,
    ersatz: 'export const LICHT = { x: -0.62, y: -0.78 };',
    tor: 'grafiktor',
  },
  {
    // Und die Pruefung selbst: eine leere Liste besteht jede Pruefung.
    // Faengt die Auswahl keine Figur mehr ein, meldet das Tor gruen ueber
    // gar nichts - der haeufigste Weg, auf dem eine Messung aufhoert zu
    // messen, ohne dass etwas rot wird (Regel 5).
    name: 'Lichtmessung faengt keine Figur ein',
    datei: 'tools/artaudit.mjs',
    regel: /\.\.\.\[\.\.\.tw\]\.filter\(\(\[k\]\) => \/_1_1\$\/\.test\(k\)\), \.\.\.en\]/,
    ersatz: '...[...tw].filter(([k]) => /_9_9$/.test(k))]',
    tor: 'grafiktor',
  },
  {
    // Der Abdruck der teuren Tore (v154). Er darf NIE dazu fuehren, dass ein
    // echter Fehler durchrutscht: `maps.ts` gehoert zur Huelle von
    // `zielplatte`, also muss das Tor nach dieser Aenderung wieder rechnen
    // UND rot werden. Ohne die Probe waere ein zu enger Abdruck nicht von
    // einem bestandenen Tor zu unterscheiden.
    //
    // Zweimal hintereinander gefahren waere noch schaerfer, aber die
    // Probenumgebung faehrt jedes Tor genau einmal - und einmal genuegt:
    // der vorige gruene Lauf hat den Abdruck hinterlassen, dieser hier
    // muss ihn verwerfen.
    name: 'Abdruck verschlaeft eine geaenderte Karte',
    datei: 'src/data/maps.ts',
    regel: /  ziel: \{ x: 1734, y: 506 \},/,
    ersatz: '  ziel: { x: 1200, y: 506 },',
    tor: 'zielplattentor',
  },
  {
    // TF-012: das Randlicht abgeschaltet. Regel 13 in ihrer reinsten Form -
    // wer eine Wirkung misst, schaltet sie zuerst ab. Ohne diese Probe
    // koennte das Randlicht ein Fuellwort sein, das die Zahl nicht bewegt.
    //
    // Gemessen: ohne faellt der schwaechste Saum von 1,80 auf 1,26 und vier
    // von 24 Messungen rutschen unter 1,5.
    name: 'Randlicht abgeschaltet',
    datei: 'src/gfx/einbettung.ts',
    regel: /^export const RANDLICHT_STAERKE = 0\.75;$/m,
    ersatz: 'export const RANDLICHT_STAERKE = 0;',
    tor: 'einbettungstor',
  },
  {
    // Eine Teillieferung loescht alles, was nicht mitgeliefert wurde.
    //
    // Der Fehler hat in diesem Werkzeug schon einmal 1,2 MB gepackte Bilder
    // gekostet - damals fehlten ALLE Quellen. Repariert wurde der Fall, nicht
    // die Klasse: fehlen EINIGE, fiel der Rest bis v157 still heraus. Beim
    // Durchstich mit drei neuen Gegnern blieben drei von acht uebrig, und
    // `npm run art` meldete gruen dazu.
    //
    // Erreichbar ist der Fehler nur ueber den Selbsttest: `art/roh/` liegt
    // nicht in Git, also gibt es in der Gegenprobe kein einziges Rohbild -
    // und ohne Rohbild laeuft der Packweg gar nicht erst an.
    name: 'Teillieferung leert den Bildvorrat',
    datei: 'tools/pack-art.mjs',
    regel: /^        rows\.push\(\{ key, buffer: alt, uebernommen: true \}\);$/m,
    ersatz: '        void alt;',
    tor: 'art',
  },
  {
    // TF-015: die Wirkungen verschmelzen wieder zu einem Eintrag je Art -
    // genau die Semantik der beiden alten Felder. Dann traegt eine starke
    // kurze Bremse die Dauer einer schwachen langen, und der Rauchtest muss
    // das sehen.
    name: 'Wirkungen verschmelzen zu einer',
    datei: 'src/data/wirkungen.ts',
    regel: /    if \(Math\.abs\(w\.staerke - staerke\) < 1e-9\) \{/,
    ersatz: '    if (true) {',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: die Liste waechst mit jedem Bild. Eine Aura
    // legt in JEDEM Bild an - ohne das Wiedererkennen waeren das nach zehn
    // Sekunden sechshundert Eintraege je Gegner.
    //
    // Der Eingriff nimmt das Wiedererkennen der ART weg, nicht das
    // Auffrischen: das Wachstum ist DOPPELT abgesichert (Auffrischen bei
    // gleicher Staerke und Ueberdeckung bei schwaecherer), und ein Eingriff
    // an nur einer der beiden Stellen erreicht es gar nicht. Die erste
    // Fassung dieser Probe zielte auf das Auffrischen und blieb gruen.
    name: 'Wirkungsliste waechst mit jedem Bild',
    datei: 'src/data/wirkungen.ts',
    regel: /    if \(w\.art !== art\) continue;/,
    ersatz: '    continue;',
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
//
// Der Musterlauf ist ausgenommen: er LIEST nur und fasst den Baum nie an.
// Genau das ist sein Zweck - er soll waehrend der Arbeit laufen koennen,
// nicht erst danach. Wer ihn hinter den Sauberkeits-Waechter sperrt, macht
// aus einer Zwei-Sekunden-Pruefung wieder eine, die man verschiebt.
const dreckig = process.argv.includes('--muster')
  ? '' : execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
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

// -------------------------------------------------------------- Musterlauf
//
// `npm run muster` prueft NUR, ob jede Regel noch greift - ohne ein einziges
// Tor zu fahren. Zwei Sekunden statt vierunddreissig Minuten.
//
// **Warum das die haeufigste Verfallsart ist.** Eine Probe hoert nicht
// dadurch auf zu beweisen, dass das Tor stumpf wird, sondern dadurch, dass
// ihr Eingriff nicht mehr ankommt - und ein nicht angekommener Eingriff
// sieht aus wie ein bestandenes Tor. Genau das ist an einem einzigen Tag
// zweimal passiert (v152): eine Probe zeigte auf eine umnumerierte
// Tabellenzeile, eine andere auf eine Liste deutscher Zahlwoerter, die bei
// "fuenfundzwanzig" endete. Beide meldeten "schlaegt nicht an", und beide
// waren Fehler in der Probe.
//
// Der Musterlauf ersetzt den vollen Lauf NICHT. Er sagt nur: jede Probe hat
// noch einen Gegenstand. Ob das Tor ihn auch meldet, sagt allein der volle
// Lauf - deshalb steht er weiter vor jeder Auslieferung.
/** Wo der letzte VOLLE Probenlauf stattgefunden hat.
 *
 *  Eingecheckt, nicht im Abdruck-Lager: der Abstand zum vollen Lauf ist eine
 *  Eigenschaft des Projekts, nicht dieses Rechners. */
const STAND_DATEI = join(ROOT, 'tools/proben-stand.txt');
const fassung = () => (readFileSync(join(ROOT, 'src/data/config.ts'), 'utf8')
  .match(/VERSION = 'v(\d+)'/)?.[1] ?? '0');
/** Wieviele Fassungen der volle Lauf zurueckliegen darf.
 *
 *  Drei - so hat der Nutzer den Ablauf entschieden, nachdem das Tor-Audit
 *  gezeigt hat, dass der volle Lauf 33 Minuten echte Arbeit ist und bei einer
 *  Runde mit zwei geaenderten Toren 140 von 142 Proben nichts zu pruefen
 *  haben. Nicht laenger, weil die Ratschen sonst verrotten: eine Probe hoert
 *  leise auf zu beweisen, und je mehr Fassungen dazwischenliegen, desto
 *  schwerer ist es, den Tag zu finden, an dem es passiert ist. */
const STAND_ABSTAND = 3;

/** Ist der Abstand zum letzten vollen Lauf zu gross - und was ist zu sagen?
 *
 *  Als eigene Funktion, damit sie sich pruefen laesst, ohne ein Tor zu
 *  fahren. Siehe `standSelbsttest` weiter unten: die Gegenprobe zu dieser
 *  Regel kann NICHT ueber das Tor laufen, weil sie sich selbst im Weg
 *  steht. */
const standAbstandFehler = (jetzt, damals) => (jetzt - damals > STAND_ABSTAND
  ? `der letzte volle Probenlauf war v${damals}, jetzt ist v${jetzt} `
    + `- ${jetzt - damals} Fassungen dazwischen, erlaubt sind ${STAND_ABSTAND}.`
  : null);

/** Die Regel selbst pruefen, ohne ein Tor und ohne Ringschluss.
 *
 *  **Warum das hier steht und nicht als Gegenprobe.** Bis v162 gab es eine:
 *  sie setzte `STAND_ABSTAND` auf -1 und erwartete, dass `npm run muster`
 *  rot wird. Am Tag, an dem der volle Lauf faellig wurde, hat sich der
 *  Ringschluss gezeigt: `muster` war rot, WEIL der Lauf faellig war - und
 *  der volle Lauf verweigerte den Dienst, weil `muster` rot war. Beide
 *  warteten aufeinander, und der Lauf, der die Lage aufgeloest haette, kam
 *  nicht zustande.
 *
 *  Aufgeloest in zwei Schritten. Erstens: waehrend `npm run proben`
 *  laeuft, ist die Forderung "fahr den vollen Lauf" gegenstandslos - er
 *  laeuft ja gerade. Die Tore, die der Probenlauf startet, bekommen
 *  deshalb `PROBENLAUF=1` und ueberspringen genau diese eine Pruefung.
 *  Zweitens: damit kann keine Gegenprobe die Regel mehr ueber das Tor
 *  bezeugen - also bezeugt sie dieser Selbsttest, direkt an der Regel und
 *  bei JEDEM Lauf statt alle drei Fassungen. Dieselbe Antwort wie bei
 *  `pack-art` in v157, wo der Fehlerfall ohne `art/roh/` unerreichbar war.
 *
 *  Geprueft wird beides: dass sie bei einem Schritt zu viel anschlaegt und
 *  dass sie beim erlaubten Abstand schweigt. Eine Pruefung, die nur die
 *  eine Richtung kennt, besteht auch eine Regel, die immer anschlaegt. */
const standSelbsttest = () => {
  const zuviel = standAbstandFehler(100 + STAND_ABSTAND + 1, 100);
  const gerade = standAbstandFehler(100 + STAND_ABSTAND, 100);
  if (!zuviel || gerade) {
    console.error('PROBEN: der Selbsttest der Standregel ist gescheitert - '
      + `${STAND_ABSTAND + 1} Fassungen Abstand ${zuviel ? 'schlagen an' : 'schlagen NICHT an'}, `
      + `${STAND_ABSTAND} ${gerade ? 'schlagen AN' : 'schweigen'}.`);
    process.exit(1);
  }
  console.log(`  Selbsttest: die Standregel schlaegt bei ${STAND_ABSTAND + 1} Fassungen `
    + `Abstand an und schweigt bei ${STAND_ABSTAND}.`);
};

/** Umgebung fuer jedes Tor, das dieser Lauf startet.
 *
 *  `PROBENLAUF` schaltet in `--muster` die Abstandspruefung ab - siehe
 *  `standSelbsttest`. Nur diese eine; die Mustererkennung selbst laeuft
 *  vollstaendig weiter. */
const TOR_UMGEBUNG = { ...process.env, PROBENLAUF: '1' };

if (process.argv.includes('--muster')) {
  console.log(`Musterlauf: ${liste.length} Regel(n), kein Tor wird gefahren.\n`);
  const stumm = [], mehrdeutig = [];
  for (const p of liste) {
    const vorher = readFileSync(join(ROOT, p.datei), 'utf8');
    const treffer = p.regel
      ? (vorher.match(new RegExp(p.regel.source, p.regel.flags.includes('g')
        ? p.regel.flags : `${p.regel.flags}g`)) ?? []).length
      : vorher.split(p.suche).length - 1;
    // NULL Treffer ist der Fehler: der Eingriff kommt nicht mehr an, und ein
    // nicht angekommener Eingriff sieht aus wie ein bestandenes Tor.
    //
    // MEHRERE Treffer sind nur ein Hinweis. `replace` ohne `g` nimmt den
    // ersten, und bei sechs Proben ist das Absicht - "Strasse schrumpft
    // unter die Gegner" trifft 321 Wegbreiten und will genau eine davon.
    // Zum Fehler zu machen waere falsch; verschweigen aber auch: in v149
    // traf eine Probe den erstbesten `update(dt` und aenderte damit die
    // falsche Methode. Wer eine dieser Zeilen liest, soll wissen, dass ihr
    // Eingriff von der Reihenfolge im Quelltext abhaengt.
    //
    // **Ausser bei einem SUCHTEXT - da ist "mehrere" derselbe Fehler wie
    // "keiner".** Die Probenumgebung verweigert dort den Dienst, wenn es
    // nicht genau einen Treffer gibt (siehe unten: `.length - 1 === 1`),
    // aendert also gar nichts und die Probe beweist nichts.
    //
    // Aufgefallen ist das erst im vollen Lauf von v158: "Doku nennt einen
    // Befehl, den es nicht gibt" sucht `npm run gate` in CLAUDE.md, und die
    // neue Ablauftabelle aus v155 nennt den Befehl ein zweites Mal. Der
    // Musterlauf hatte das als Hinweis durchgehen lassen - er behandelte
    // Regel und Suchtext gleich, obwohl sie sich genau hier unterscheiden.
    // Dreiunddreissig Minuten spaeter fand es der volle Lauf.
    if (treffer === 0) stumm.push(`${p.name}: Muster FEHLT in ${p.datei}`);
    else if (treffer > 1 && !p.regel) {
      stumm.push(`${p.name}: ${treffer} Treffer fuer den Suchtext "${p.suche}" in `
        + `${p.datei} - bei einem Suchtext wirkt der Eingriff nur bei GENAU einem.`);
    } else if (treffer > 1) mehrdeutig.push(`${p.name}: ${treffer} Treffer in ${p.datei} `
      + '- greift den ersten');
  }
  for (const z of mehrdeutig) console.log(`  Hinweis: ${z}`);
  if (mehrdeutig.length) console.log('');
  if (stumm.length) {
    console.error(`MUSTERLAUF: ${stumm.length} von ${liste.length} Proben haben keinen `
      + 'Gegenstand mehr - ihr Eingriff kommt nicht an.');
    for (const z of stumm) console.error(`  - ${z}`);
    process.exit(1);
  }
  // Und der Abstand zum letzten vollen Lauf. Ohne diese Zeile waere die
  // Stufung eine Absichtserklaerung in einem Dokument - und die Bilanz von
  // v31 sagt genau darueber: eine Regel, die nur aufgeschrieben ist, wird
  // gebrochen. Deshalb steht sie hier, wo sie weh tut.
  const jetzt = Number(fassung());
  const damals = existsSync(STAND_DATEI)
    ? Number(readFileSync(STAND_DATEI, 'utf8').trim().replace(/^v/, '')) : 0;
  const abstand = jetzt - damals;
  // Waehrend `npm run proben` laeuft, ist diese Forderung gegenstandslos:
  // der Lauf, den sie verlangt, laeuft gerade. Ohne die Ausnahme stehen
  // sich beide im Weg - siehe den Kasten an `standSelbsttest`.
  const meldung = process.env.PROBENLAUF ? null : standAbstandFehler(jetzt, damals);
  if (meldung) {
    console.error(`\nMUSTERLAUF: ${meldung}`);
    console.error('  `npm run proben` faehrt ihn (rund 33 Minuten). Der Musterlauf prueft nur,');
    console.error('  ob jede Probe noch einen Gegenstand hat - nicht, ob ihr Tor ihn meldet.');
    process.exit(1);
  }
  console.log(`MUSTERLAUF: alle ${liste.length} Proben greifen noch, `
    + `${mehrdeutig.length} davon auf den ersten von mehreren Treffern. `
    + `Voller Lauf zuletzt bei v${damals}, ${abstand} Fassung(en) her (erlaubt `
    + `${STAND_ABSTAND}).`);
  process.exit(0);
}

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
  if (BAUT.has(tor)) execSync('npm run build', { cwd: ROOT, stdio: 'pipe', env: TOR_UMGEBUNG });
};

console.log(`Gegenproben: ${liste.length} von ${PROBEN.length}\n`);
standSelbsttest();


// --- Zuerst: sind die betroffenen Tore ueberhaupt GRUEN?
//
// Eine Gegenprobe sagt "schlaegt an", wenn das Tor mit dem eingebauten
// Fehler rot ist. Sie sagt NICHTS darueber, ob es vorher gruen war - und
// ein Tor, das schon vorher rot ist, schlaegt bei jedem Eingriff an. Damit
// bewiese die Probe genau nichts (Regel 13: wer eine Wirkung misst,
// schaltet sie zuerst ab).
//
// Aufgefallen in v158: TF-015 hatte den Frostueberzug abgeschnitten, das
// Bildtor meldete 0 statt 3409 Bildpunkte - und die Probe "Gebremste Gegner
// sehen aus wie freie" meldete trotzdem brav "schlaegt an".
//
// Gefahren wird jedes betroffene Tor genau EINMAL. Beim vollen Lauf ist das
// die ganze Kette und kostet rund zwei von dreiunddreissig Minuten; bei
// einem gefilterten Lauf nur die paar Tore, um die es geht.
{
  const tore = [...new Set(liste.map((p) => p.tor))].sort();
  const rot = [];
  for (const t of tore) {
    if (BAUT.has(t)) execSync('npm run build', { cwd: ROOT, stdio: 'pipe', env: TOR_UMGEBUNG });
    try { execSync(`npm run ${t}`, { cwd: ROOT, stdio: 'pipe', env: TOR_UMGEBUNG }); }
    catch { rot.push(t); }
  }
  if (rot.length) {
    console.error(`PROBEN: ${rot.length} Tor(e) sind schon OHNE eingebauten Fehler rot: `
      + `${rot.join(', ')}.`);
    console.error('  Eine Gegenprobe an einem roten Tor beweist nichts - sie schlaegt an,');
    console.error('  gleich was man einbaut. Erst die Kette gruen bekommen.');
    process.exit(1);
  }
  console.log(`  ${tore.length} betroffene(s) Tor(e) vorher gruen: ${tore.join(', ')}\n`);
}

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
    ausgabe = execSync(`npm run ${p.tor}`, {
      cwd: ROOT, encoding: 'utf8', stdio: 'pipe', env: TOR_UMGEBUNG,
    });
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

// Den Stand nur bei einem VOLLEN Lauf festhalten. Ein gefilterter Lauf hat
// die uebrigen Proben nicht angefasst - ihn mitzuzaehlen hiesse, sich den
// Abstand schoenzurechnen, und genau dafuer ist die Zahl nicht da.
if (!filter.length) {
  writeFileSync(STAND_DATEI, `v${fassung()}\n`);
  console.log(`  Stand festgehalten: v${fassung()} (tools/proben-stand.txt).`);
}
