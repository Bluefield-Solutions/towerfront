#!/usr/bin/env node
/**
 * Dokumentenwächter — hält die Beschreibung an der Wirklichkeit fest.
 *
 * Die Doku stand acht Umbauten lang auf dem Kachelraster, ohne dass etwas rot
 * wurde. Kein Tor prüft Prosa, also veraltet sie lautlos — und eine falsche
 * Beschreibung ist schlimmer als keine, weil man ihr glaubt. Der
 * Referenzabgleich zum Menü ist genau daran fast gescheitert: die
 * Asset-Spezifikation forderte noch 20:11 und Bilder ohne Weg.
 *
 * Geprüft wird nur, was sich mechanisch prüfen lässt: Zahlen, Befehle und
 * Begriffe, die im Quelltext nachweisbar sind. Ob ein Absatz *gut* ist, sagt
 * dieses Werkzeug nicht.
 *
 * Aufruf: npm run doku
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ausDatei, gestellt, werte } from './schliessbedingung.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const lies = (p) => readFileSync(join(ROOT, p), 'utf8');

const probleme = [];
const hinweise = [];
const fail = (m) => probleme.push(m);
const warn = (m) => hinweise.push(m);

// --- Was ist wahr?
const pkg = JSON.parse(lies('package.json'));
const befehle = new Set(Object.keys(pkg.scripts));
const version = (lies('src/data/config.ts').match(/VERSION = '(v\d+)'/) ?? [])[1];
// Gezaehlt werden die Schritte, die abbrechen koennen. Der Genre-Abgleich
// meldet nur und gehoert nicht dazu.
const torSchritte = pkg.scripts.gate.split('&&')
  .filter((t) => !t.includes('bericht')).length;
const claude = lies('CLAUDE.md');

const dateien = readdirSync(DOCS).filter((f) => f.endsWith('.md'));
const alle = [['CLAUDE.md', claude], ...dateien.map((f) => [f, readFileSync(join(DOCS, f), 'utf8')])];

// --- 1. Jeder genannte Befehl muss es geben.
//
// Der häufigste Weg, wie eine Anleitung falsch wird: ein Befehl wird
// umbenannt, und in drei Dokumenten steht weiter der alte.
//
// **Ziffern gehören dazu, und bis v244 nicht.** Das Muster war `[a-z-]+`;
// `npm run c18` las es als `npm run c` und meldete einen Befehl, den es
// nicht gibt — für einen, den es gibt. Dieselbe Klasse wie die
// Zahlwort-Tabelle in v230: eine Prüfung, deren Zeichenvorrat hinter ihrem
// Gegenstand zurückbleibt, sieht aus wie eine Prüfung. Gefunden hat es
// `npm run c18` — der erste Befehl des Baums mit einer Ziffer im Namen.
// **Der Storykatalog ist die eine Ausnahme, und sie ist begruendet** (v269).
//
// Eine Story beschreibt Arbeit, die noch NICHT getan ist - sie nennt den
// Befehl, den sie selbst anlegen wird. Genau dieselbe Unterscheidung trifft
// `npm run naechste` schon bei der Zieldatei: fuer das Rueckstandsverzeichnis
// heisst eine fehlende Datei "die Bedingung zeigt ins Leere", fuer eine Story
// heisst sie "hier faengt die Arbeit an".
//
// **Es bleibt trotzdem sichtbar.** Ein Hinweis statt eines Fehlers, und der
// nennt den Befehl beim Namen: ein Tippfehler in einer Story faellt sonst
// erst auf, wenn jemand ihn abtippen will - und das ist der Tag, an dem er
// teuer wird (dieselbe Lehre wie `kartenprobe` in v229, dessen Eingang
// niemand prueft).
const NENNT_KUENFTIGES = 'Towerfront-STORIES.md';
for (const [name, text] of alle) {
  for (const m of text.matchAll(/`npm run ([a-z0-9-]+)`|npm run ([a-z0-9-]+)/g)) {
    const cmd = m[1] ?? m[2];
    if (!befehle.has(cmd) && name === NENNT_KUENFTIGES) {
      hinweise.push(`${name}: nennt "npm run ${cmd}" - den Befehl gibt es noch `
        + 'nicht. In einer Story ist das der Normalfall (sie legt ihn an); '
        + 'in jedem anderen Dokument waere es ein Fehler.');
      continue;
    }
    if (!befehle.has(cmd)) fail(`${name}: nennt "npm run ${cmd}" - den Befehl gibt es nicht.`);
  }
}

// --- 2. Die Zahl der Tore muss stimmen.
// Von drei bis zwanzig. Die erste Fassung begann bei acht - und ein
// eingebautes "sieben Prüfungen" rutschte in der Gegenprobe durch. Eine
// Prüfung mit Lücke ist eine Prüfung, der man nicht trauen kann.
const zahlwort = {
  3: 'drei', 4: 'vier', 5: 'fünf', 6: 'sechs', 7: 'sieben', 8: 'acht', 9: 'neun',
  10: 'zehn', 11: 'elf', 12: 'zwölf', 13: 'dreizehn', 14: 'vierzehn', 15: 'fünfzehn',
  16: 'sechzehn', 17: 'siebzehn', 18: 'achtzehn', 19: 'neunzehn', 20: 'zwanzig',
  21: 'einundzwanzig', 22: 'zweiundzwanzig', 23: 'dreiundzwanzig',
  24: 'vierundzwanzig', 25: 'fünfundzwanzig', 26: 'sechsundzwanzig',
  27: 'siebenundzwanzig', 28: 'achtundzwanzig', 29: 'neunundzwanzig',
  30: 'dreissig', 31: 'einunddreissig', 32: 'zweiunddreissig',
  33: 'dreiunddreissig', 34: 'vierunddreissig', 35: 'fünfunddreissig',
  36: 'sechsunddreissig', 37: 'siebenunddreissig', 38: 'achtunddreissig',
  39: 'neununddreissig', 40: 'vierzig',
};
// **Die Tabelle endete bis v230 bei fünfundzwanzig - und die Kette hatte 31
// Schritte.** Damit war die Prüfung dort blind, wo das Projekt steht:
// `Towerfront-KONZEPT-und-PIPELINE.md` behauptete "neunundzwanzig Prüfungen,
// rund 90 Sekunden", und niemand wurde rot. Gefunden erst, als der Rückstand
// dieses Dokuments die Standregel auslöste.
//
// Eine Prüfung, deren Wertebereich hinter dem Gegenstand zurückbleibt, sieht
// aus wie eine Prüfung. Der Bereich reicht jetzt bis vierzig; wer die
// vierzigste Prüfung einbaut, trägt hier nach - und `npm run proben` erwischt
// ihn, weil die Gegenprobe die heutige Zahl in Worten setzt.
// **Und die Tabelle muss die Kette ueberhaupt abdecken.**
//
// Genau daran ist die Pruefung bis v230 vorbeigelaufen: sie kannte drei bis
// fuenfundzwanzig, die Kette hatte einunddreissig Schritte, und
// `Towerfront-KONZEPT-und-PIPELINE.md` behauptete sieben Fassungen lang
// "neunundzwanzig Pruefungen". Niemand wurde rot.
//
// Eine Pruefung, deren Wertebereich hinter ihrem Gegenstand zurueckbleibt,
// sieht aus wie eine Pruefung. Deshalb faellt sie jetzt selbst auf, wenn die
// Kette aus dem Bereich herauswaechst - das ist billiger als ein Tor, das
// beim einundvierzigsten Schritt still verstummt.
if (!zahlwort[torSchritte]) {
  fail(`CLAUDE.md/Doku: die Kette hat ${torSchritte} abbrechende Schritte, aber `
    + `die Zahlwort-Tabelle in tools/docs.mjs kennt ${torSchritte} nicht `
    + `(sie reicht von ${Math.min(...Object.keys(zahlwort).map(Number))} bis `
    + `${Math.max(...Object.keys(zahlwort).map(Number))}). Solange die Zahl dort `
    + 'fehlt, prueft die Torzahl nichts - kein Dokument kann sie falsch schreiben.');
}

for (const [name, text] of alle) {
  // Nur der gültige Teil. Im Fundregister steht absichtlich, wieviele Tore es
  // *damals* gab - das ist der Sinn eines Registers.
  // Ein Dokument, das sich selbst als Messbericht ausweist, beschreibt einen
  // vergangenen Stand. Das ist keine Nachlässigkeit, sondern sein Zweck.
  if (/\*\*Messbericht\.\*\*/.test(text)) continue;
  const register = text.indexOf('# Fundregister');
  const aktuell = register >= 0 ? text.slice(0, register) : text;
  for (const [wort, n] of Object.entries(zahlwort).map(([k, v]) => [v, Number(k)])) {
    // Wortgrenze davor, sonst findet "zehn" sich in "vierzehn" wieder - der
    // Prüfer hat sich damit im ersten Lauf selbst ausgetrickst.
    // Nur wenn im selben Satz auch von der Kette die Rede ist. Sonst faengt
    // sich die Pruefung Saetze ein, die mit der Torkette nichts zu tun haben -
    // "hoechstens fuenf Pruefungen je Runde" etwa.
    const re = new RegExp(
      `[^.\n]*?(^|[^a-zäöüß])(${wort} (?:Prüfungen|Tore|Toren))[^.\n]*`, 'i',
    );
    const treffer = aktuell.match(re);
    const satz = treffer ? treffer[0] : '';
    const meintKette = /gate|Torkette|Kette|npm run/i.test(satz);
    if (treffer && meintKette && n !== torSchritte) {
      fail(`${name}: schreibt "${treffer[2]}", die Kette hat ${torSchritte} abbrechende Schritte.`);
    }
  }
}

// --- 2b. Die Tortabelle muss die ganze Kette fuehren.
//
// Die Zahlpruefung oben zaehlt nur Woerter. Als in v113 der Kartenwechsel
// dazukam und danach vier weitere Tore, blieb die Tabelle im
// Pipeline-Dokument bei fuenfzehn Zeilen stehen - sechs Tore fehlten, und
// nichts wurde rot, weil kein Satz eine falsche Zahl nannte. Das ist Regel
// 15: was zweimal dasteht, veraltet einmal. Wenn es schon zweimal dasteht,
// muss wenigstens die Abweichung anschlagen.
{
  const tabelle = alle.find(([n]) => n === 'Towerfront-KONZEPT-und-PIPELINE.md');
  if (tabelle) {
    const i = tabelle[1].indexOf('| # | Tor | Befehl | Bricht ab bei |');
    if (i < 0) {
      fail('Towerfront-KONZEPT-und-PIPELINE.md: die Tortabelle fehlt.');
    } else {
      const block = tabelle[1].slice(i, tabelle[1].indexOf('\n\n', i));
      // Reihenfolge UND Nummerierung, nicht nur Vorhandensein.
      //
      // Beim Einfuegen des achten Tores in v145 rutschten zwei Zeilen in die
      // falsche Reihenfolge (9 und 10 vertauscht), und die reine
      // Vorhandensein-Pruefung sah nichts. Eine Tabelle, deren Nummern nicht
      // stimmen, ist schlimmer als keine: man vergleicht sie mit der Kette
      // und glaubt, sie stimme.
      const kette = pkg.scripts.gate.split('&&')
        .map((t) => (t.match(/npm run ([a-z-]+)/) ?? [])[1])
        .filter((c) => c && c !== 'bericht');
      const zeilen = [...block.matchAll(/^\| (\d+) \| [^|]+\| `npm run ([a-z-]+)` \|/gm)]
        .map((m) => ({ nr: Number(m[1]), cmd: m[2] }));
      for (const cmd of kette) {
        if (!zeilen.some((z) => z.cmd === cmd)) {
          fail(`Towerfront-KONZEPT-und-PIPELINE.md: die Tortabelle fuehrt "npm run ${cmd}" nicht.`);
        }
      }
      for (let n = 0; n < Math.min(kette.length, zeilen.length); n++) {
        if (zeilen[n].nr !== n + 1) {
          fail(`Towerfront-KONZEPT-und-PIPELINE.md: Zeile ${n + 1} der Tortabelle `
            + `traegt die Nummer ${zeilen[n].nr}.`);
          break;
        }
        if (zeilen[n].cmd !== kette[n]) {
          fail(`Towerfront-KONZEPT-und-PIPELINE.md: an Stelle ${n + 1} steht `
            + `"${zeilen[n].cmd}", die Kette hat dort "${kette[n]}".`);
          break;
        }
      }
    }
  }
}

// --- 2b. Die Erledigt-Tabelle darf keine Luecke haben.
//
// **Zweimal passiert, und beide Male still.** In v230 endete sie bei v215 -
// acht Fassungen fehlten. In v237 fiel auf, dass die Zeile fuer v236 nie
// geschrieben worden war: das Einfuegeskript war an einem Tippfehler
// gescheitert, und weil niemand nachzaehlt, stand die Runde einfach nicht da.
//
// Geprueft wird nicht "jede Fassung hat eine Zeile" - kleine Ergaenzungen
// bekommen mit Absicht keine (der Bildauftrag in v231 zum Beispiel). Geprueft
// wird die LUECKE: zwischen der hoechsten eingetragenen Fassung und der
// aktuellen darf hoechstens eine liegen, und innerhalb der Tabelle darf keine
// Fassung fehlen, die kleiner ist als die hoechste und groesser als die
// zweithoechste plus eins... - das waere zu streng. Genommen wird die
// einfache Form, die beide Faelle gefangen haette: die hoechste Zeile darf
// nicht mehr als eine Fassung hinter `VERSION` liegen.
{
  const backlog = lies('docs/Towerfront-BACKLOG.md');
  const zahlen = [...backlog.matchAll(/^\| v(\d+) \|/gm)].map((m) => Number(m[1]));
  const heute = Number((version ?? 'v0').slice(1));
  if (!zahlen.length) {
    fail('Towerfront-BACKLOG.md: keine einzige Zeile in der Erledigt-Tabelle.');
  } else {
    const hoechste = Math.max(...zahlen);
    if (heute - hoechste > 1) {
      fail(`Towerfront-BACKLOG.md: die Erledigt-Tabelle endet bei v${hoechste}, das Spiel `
        + `steht auf ${version}. ${heute - hoechste} Fassung(en) fehlen. Eine Runde, die nicht `
        + 'darin steht, ist beim naechsten Nachschlagen nicht passiert - in v230 waren es acht, '
        + 'in v236 eine, und beide Male hat es niemand gemerkt.');
    }
  }
}

// --- 2c. Ein erledigtes Ticket muss ueberall erledigt sein.
//
// Ein TF-Ticket steht im Masterplan an drei Stellen: in der Gap-Analyse, im
// eigenen Abschnitt und in der Liste "Next 30". Nach TF-007 waren zwei davon
// nachgetragen und eine nicht - beim naechsten Nachschlagen stand das Ticket
// wieder offen da, und ich haette es ein zweites Mal umgesetzt. Genau Regel
// 15, nur mit drei Stellen statt zwei.
//
// Geprueft wird gegenseitig: was in der Gap-Analyse "ERLEDIGT vNNN" traegt,
// muss in "Next 30" fett als erledigt stehen - und umgekehrt.
{
  const mp = alle.find(([n]) => n === 'Towerfront-MASTERPLAN.md');
  if (mp) {
    const text = mp[1];
    // "erledigt" und "widerlegt" zaehlen gleich: beides heisst, dass an dem
    // Ticket nichts mehr zu tun ist. Der erste Entwurf kannte nur
    // "erledigt" - und liess damit genau die Sorte Eintrag durchrutschen,
    // die diese Pruefung ueberhaupt erst noetig gemacht hat.
    const erl = /(?:ERLEDIGT|WIDERLEGT) (v\d+)/;
    const lueckeErledigt = new Map();
    for (const m of text.matchAll(/^\| (TF-\d+) \| [^|]+\| \*{0,2}(?:ERLEDIGT|WIDERLEGT) (v\d+)\*{0,2} \|/gm)) {
      lueckeErledigt.set(m[1], m[2]);
    }
    void erl;
    const next30 = new Map();
    for (const m of text.matchAll(/^\| \d+ \| (TF-\d+) \|[^\n]*\*\*(?:erledigt|widerlegt) (v\d+)\*\*/gm)) {
      next30.set(m[1], m[2]);
    }
    // Nur Tickets, die ueberhaupt in beiden Listen vorkommen.
    const inNext30 = new Set(
      [...text.matchAll(/^\| \d+ \| (TF-\d+) \|/gm)].map((m) => m[1]),
    );
    for (const [id, v] of lueckeErledigt) {
      if (!inNext30.has(id)) continue;
      if (!next30.has(id)) {
        fail(`Towerfront-MASTERPLAN.md: ${id} ist in der Gap-Analyse als ${v} erledigt `
          + 'markiert, in "Next 30" aber nicht.');
      } else if (next30.get(id) !== v) {
        fail(`Towerfront-MASTERPLAN.md: ${id} steht in der Gap-Analyse als ${v}, `
          + `in "Next 30" als ${next30.get(id)}.`);
      }
    }
    for (const [id, v] of next30) {
      if (!lueckeErledigt.has(id)) {
        fail(`Towerfront-MASTERPLAN.md: ${id} ist in "Next 30" als ${v} erledigt `
          + 'markiert, in der Gap-Analyse aber nicht.');
      }
    }
  }
}

// --- 3. Begriffe, die das Spiel nicht mehr kennt.
//
// Nur außerhalb des Fundregisters: dort beschreiben sie absichtlich den Stand
// von damals.
const veraltet = [
  ['Kachelraster', 'src/core/path.ts', 'seit v36 gibt es kein Kachelraster mehr'],
  ['Rasterzelle', 'src/core/path.ts', 'gebaut wird frei, nicht auf Zellen'],
  ['20 × 11', 'src/data/config.ts', 'das Feld ist 1920 x 1080'],
];
// Ein Begriff allein sagt nichts. "Kein Kachelraster mehr" und "bis v35 lag
// das Spiel auf einem Gitter" sind genau die Saetze, die den Umbau
// festhalten - sie zu melden heisst, richtige Prosa anzumahnen.
//
// Das war kein Schoenheitsfehler: fuenf der sechs Hinweise in v103 waren von
// dieser Art. Ein Hinweis, der bei richtigem Text anschlaegt, wird nach dem
// dritten Mal ueberlesen, und dann geht der sechste - der echte - mit unter.
// Deshalb entscheidet der Satz, nicht das Wort.
const abgegolten = /\b(kein|keine|keinen|keiner|nicht|nie|statt|ohne|überholt|früher|damals|vormals|ehemals|war|waren|lag|lagen)\b|\b(bis|seit|vor|ab|in) v\d+/i;

/** Der Satz, in dem der Begriff steht - begrenzt durch Punkt, Zeilenende
 *  oder Doppelpunkt. Weiter zu greifen hiesse, sich die Entlastung aus einem
 *  Nachbarsatz zu holen. */
const satzUm = (text, i, laenge) => {
  const links = Math.max(
    ...['.', '\n', ':', '·'].map((z) => text.lastIndexOf(z, i)),
  );
  const rechts = Math.min(
    ...['.', '\n', ':', '·'].map((z) => {
      const j = text.indexOf(z, i + laenge);
      return j < 0 ? text.length : j;
    }),
  );
  return text.slice(links + 1, rechts);
};

for (const [name, text] of alle) {
  const register = text.indexOf('# Fundregister');
  const aktuell = register >= 0 ? text.slice(0, register) : text;
  // Dokumente mit eigenem Warnkasten sind bewusst historisch.
  if (/ACHTUNG — in drei Punkten überholt|Fundregister in umgekehrter Zeitfolge/.test(aktuell)
      && name !== 'Towerfront-KONZEPT-und-PIPELINE.md') continue;
  for (const [begriff, , grund] of veraltet) {
    let i = aktuell.indexOf(begriff);
    while (i >= 0) {
      if (!abgegolten.test(satzUm(aktuell, i, begriff.length))) {
        warn(`${name}: verwendet "${begriff}" im gültigen Teil - ${grund}.`);
        break;
      }
      i = aktuell.indexOf(begriff, i + begriff.length);
    }
  }
}

// --- 4. Die Standangabe darf nicht weit zurückliegen.
//
// Nur lebende Dokumente. Ein Protokoll beschreibt absichtlich den Stand von
// damals - es nachzuziehen waere Faelschung.
//
// **Bis v249 entschied das die ABWESENHEIT einer Zeile, und das war die
// Luecke.** Wer keine Standangabe trug, wurde nicht geprueft - und
// dreizehn von vierundzwanzig Dokumenten trugen keine. Darunter
// `Towerfront-BENCHMARK.md`, das seit v35 „27 von 30, gewichtet 93 %"
// behauptete, waehrend `npm run bericht` im selben Baum 30 von 30 mass:
// **213 Fassungen falsch, und unsichtbar, weil die Zeile mit „Messung: v"
// begann statt mit „Stand: v".** Eine Datei, die die erwartete Form nicht
// trifft, war fuer diese Pruefung keine falsche Datei, sondern gar keine.
//
// Jetzt muss sich jedes Dokument erklaeren. Es gibt genau zwei Antworten,
// und keine dritte:
//
//   Stand: vNN          lebendes Dokument - es darf nicht zurueckfallen
//   Aufgezeichnet: vNN  Protokoll - es bleibt absichtlich stehen
//   Aufgezeichnet: TT.MM.JJJJ   dasselbe, wenn das Dokument keine Fassung
//                               nennt: sechs der dreizehn tragen nur ein
//                               Datum, und eine Fassung dazuzuerfinden waere
//                               genau die Sorte Zahl, gegen die Regel 12 steht
//
// Die zweite Form ist kein Schlupfloch: sie steht in der Datei, ist im
// Verzeichnis zu sehen und muss beim Schreiben gewaehlt werden. Eine
// Ausnahme, die man ausspricht, ist etwas anderes als eine, die entsteht,
// weil niemand hingesehen hat.
for (const [name, text] of alle) {
  const m = text.match(/Stand: (v\d+)/);
  if (!m) {
    if (!/^Aufgezeichnet: (v\d+|\d{2}\.\d{2}\.\d{4})/m.test(text)) {
      fail(`${name}: hat weder "Stand: vNN" noch "Aufgezeichnet: vNN". `
        + 'Ohne eine der beiden Zeilen prueft niemand, ob der Inhalt noch stimmt - '
        + 'und genau so stand der Genre-Abgleich 213 Fassungen lang falsch da.');
    }
    continue;
  }
  const alt = Number(m[1].slice(1)), neu = Number(version.slice(1));
  if (neu - alt > 6) {
    fail(`${name}: steht auf ${m[1]}, aktuell ist ${version} - ${neu - alt} Versionen Rückstand.`);
  } else if (alt !== neu) {
    warn(`${name}: steht auf ${m[1]}, aktuell ist ${version}.`);
  }
}

// --- 5. Die eisernen Regeln müssen durchnummeriert sein.
{
  const regeln = [...claude.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
  for (let i = 0; i < regeln.length; i++) {
    if (regeln[i] !== i + 1) {
      fail(`CLAUDE.md: die eisernen Regeln springen von ${regeln[i - 1]} auf ${regeln[i]}.`);
      break;
    }
  }
  if (regeln.length < 5) fail('CLAUDE.md: weniger als fünf eiserne Regeln - da fehlt etwas.');
}

// --- 6. Ein offener Punkt muss seine Schliessbedingung mitfuehren - und die
//        Bedingung wird gefahren, nicht geglaubt.
//
// **Zweimal derselbe Fehler, und S124 hat ihn schon einmal aufgeschrieben.**
// C24 ("die vierte Karte fehlt, sie braucht ein Untergrundbild") stand noch
// offen, als der Farnkessel seit v222 im Spiel war. D28-F ("die Pruefung des
// fuenften Zielmodus laeuft nur auf MAPS[0]") stand noch offen, seit v218
// alle Karten prueft. D28-A ("mehr Bahnen durch das GEMALTE Netz des
// Spiralhains") stand noch offen, seit der Spiralhain in v217 auf
// `weg: false` steht und gar kein gemaltes Netz mehr hat.
//
// Dreimal habe ich das Verzeichnis gelesen und ihm geglaubt. Der Waechter
// prueft Befehle, Torzahl und Begriffe - aber nie, ob ein als offen
// gefuehrter Punkt noch offen IST.
//
// Jede offene Zeile traegt jetzt eine Schliessbedingung in einer von fuenf
// Formen:
//
//     text <pfad> "<wort>" >= <n>     zu, sobald das Wort n-mal dasteht
//     text <pfad> "<wort>" == 0       zu, sobald das Wort verschwunden ist
//     liste <pfad> <NAME> >= <n>      zu, sobald die Liste n Eintraege hat
//     blick: <grund>                  kein Tor kann das sehen (Regel 8)
//     nutzer: <grund>                 nur der Nutzer kann es entscheiden
//
// **Die mechanischen drei werden zweimal ausgewertet.** Einmal gegen die
// Wirklichkeit: ist sie dort ERFUELLT, ist der Punkt still zugefallen und die
// Zeile luegt. Einmal gegen zwei gestellte Texte - einen, der sie erfuellen
// MUSS, und einen, der sie brechen MUSS. Eine Bedingung, die auf beiden
// dasselbe sagt, prueft nichts.
//
// **Was dieser zweite Lauf haelt, ist gemessen - und es ist weniger, als es
// aussieht.** Er schlaegt an bei `>= 0` (immer wahr, der plausible Vertipper
// fuer `>= 1`), bei einer Form, die der Waechter nicht kennt, bei einer
// Datei, die es nicht gibt, und bei einem Listennamen, den es nicht gibt -
// alle vier einzeln nachgefahren.
//
// **Er haelt NICHT die zu hohe Schwelle.** `text ... "Heiler" >= 99` laeuft
// gemessen durch: die Bedingung ist erfuellbar, nur nicht in diesem
// Jahrhundert, und kein billiges Verfahren trennt "hoch" von "absurd". Der
// Punkt bliebe still fuer immer offen. Gegattert wird, was man halten kann;
// berichtet, was man nicht halten kann (S129) - und diese Zeile ist der
// Bericht. Wer eine Schwelle ueber 1 schreibt, schreibt daneben, woher sie
// kommt.
/** Die Kennungen, die gerade in einer "Offen"-Tabelle stehen. Abschnitt 7
 *  braucht sie ein zweites Mal - einmal gelesen, nicht zweimal (Regel 15). */
const offeneIds = new Set();
{
  const backlog = alle.find(([n]) => n === 'Towerfront-BACKLOG.md');
  if (!backlog) {
    fail('Towerfront-BACKLOG.md fehlt - dann prueft hier nichts mehr.');
  } else {
    // **Die Auswertung steht seit v252 in `tools/schliessbedingung.mjs`.**
    //
    // Nicht aus Ordnungsliebe: seit v249 traegt jede der 42 Stories dieselbe
    // Art Bedingung, und `npm run naechste` faehrt sie, um zu sagen, welche
    // als naechste dran ist. Zwei Fassungen derselben Rechnung waeren hier
    // besonders teuer - die eine sagt, ob ein Punkt zugefallen ist, die
    // andere, woran gearbeitet wird. Gehen sie auseinander, arbeitet die
    // Kette an etwas, das der Waechter fuer erledigt haelt, und beide sind
    // fuer sich gruen (Regel 15).

    // Nur die Abschnitte, die "Offen" heissen. Die Fundtabellen darunter
    // fuehren absichtlich vergangene Staende.
    const bloecke = backlog[1].split(/^## /m).filter((b) => b.startsWith('Offen'));
    if (bloecke.length === 0) {
      fail('Towerfront-BACKLOG.md: kein Abschnitt "Offen" gefunden - die Form hat '
        + 'sich geaendert, und dann prueft hier nichts mehr.');
    }
    let gepruefte = 0;
    // **Die Kennung durfte bis v313 nicht auf einen Buchstaben enden** - und
    // genau daran waren N1K und N1G unsichtbar. Beide stehen seit v309 als
    // offene Punkte in der Tabelle, beide tragen eine Schliessbedingung, und
    // keine der beiden ist je ausgewertet worden: `[A-Z]+\d+(?:-[A-Z])?`
    // verlangt hinter der Ziffer entweder nichts oder einen Bindestrich.
    // Dieselbe Klasse wie die Zahlwort-Tabelle in v230 - eine Pruefung,
    // deren Wertebereich hinter ihrem Gegenstand zurueckbleibt, sieht aus
    // wie eine Pruefung.
    //
    // Gefunden hat es eine Gegenprobe, die daran scheiterte: sie ersetzte
    // die erste `text`-Bedingung des Dokuments durch eine erfuellte, und der
    // Waechter schwieg - weil die erste eben N1K gehoert.
    const KENNUNG = /^\| ([A-Z]+\d+[A-Z]?(?:-[A-Z])?) \| (.+?) \|[^|]*\|[^|]*\|\s*$/gm;
    // **Und die Luecke wird nicht nur breiter, sie wird laut.** Eine Zeile,
    // die wie eine Tabellenzeile aussieht und deren Kennung der Waechter
    // nicht lesen kann, wird nicht mehr uebergangen: sonst kommt derselbe
    // blinde Fleck mit der naechsten Namensform zurueck, und wieder merkt es
    // niemand. Kopfzeile und Trennzeile sind die zwei Ausnahmen.
    for (const block of bloecke) {
      for (const zeile of block.split('\n')) {
        if (!zeile.startsWith('|')) continue;
        if (/^\| # \| /.test(zeile) || /^\|[-|]+\|\s*$/.test(zeile)) continue;
        if (new RegExp(KENNUNG.source).test(zeile)) continue;
        fail('Towerfront-BACKLOG.md: Zeile ohne lesbare Kennung im Abschnitt "Offen" '
          + `- "${zeile.slice(0, 60)}...". Der Waechter uebergeht sie sonst still, `
          + 'und dann steht ein offener Punkt da, den nichts mehr prueft.');
      }
      for (const z of block.matchAll(KENNUNG)) {
        const [, id, inhalt] = z;
        offeneIds.add(id);
        gepruefte++;
        const b = inhalt.match(/\*\*Schliesst, wenn:\*\* `([^`]+)`/);
        if (!b) {
          fail(`Backlog ${id}: keine Schliessbedingung. Ohne sie kann niemand `
            + 'pruefen, ob der Punkt noch offen ist - und genau so sind C24, D28-A '
            + 'und D28-F stehen geblieben.');
          continue;
        }
        const bed = b[1];
        const weich = bed.match(/^(blick|nutzer): (.+)$/);
        if (weich) {
          if (weich[2].trim().length < 20) {
            fail(`Backlog ${id}: "${weich[1]}" ohne Begruendung. Wer ein Tor `
              + 'ausschliesst, sagt warum.');
          }
          continue;
        }
        // Gegen die Wirklichkeit.
        const echt = werte(bed, ausDatei);
        if (echt.fehler) {
          fail(`Backlog ${id}: die Bedingung laesst sich nicht auswerten - ${echt.fehler}.`);
          continue;
        }
        if (echt.erfuellt) {
          fail(`Backlog ${id}: die Schliessbedingung \`${bed}\` ist ERFUELLT - der `
            + 'Punkt ist zugefallen, steht aber offen. Ins Erledigte umtragen.');
        }
        // **Haelt eine andere Schreibweise den Punkt offen?** (S-P1-06)
        //
        // E6 stand von v239 bis v249 offen, weil ein einziger Grossbuchstabe
        // nicht passte: die Bedingung suchte `wellenfortschritt`, der
        // Quelltext schreibt `Wellenfortschritt`. Der Vergleich ist
        // buchstabengetreu (`inhalt.split(wort).length - 1`), und das ist
        // richtig so - eine Bedingung, die Schreibweisen mischt, faengt
        // Treffer, die keine sind. Falsch war nur, dass niemand es merkte.
        //
        // Gemeldet wird deshalb genau der Zwischenfall: das Wort kommt vor,
        // aber anders geschrieben. Kommt es GAR nicht vor, schweigt die
        // Meldung - sonst sagte sie nur, dass ein Punkt offen ist, und eine
        // Meldung, die immer kommt, ist keine (Regel 13).
        if (!echt.erfuellt) {
          const t = bed.match(/^text (\S+) "([^"]+)" >= (\d+)$/);
          if (t) {
            const [, pfad, wort] = t;
            const inhalt = ausDatei(pfad);
            if (inhalt) {
              const genau = inhalt.split(wort).length - 1;
              const egal = inhalt.toLowerCase().split(wort.toLowerCase()).length - 1;
              if (genau === 0 && egal > 0) {
                fail(`Backlog ${id}: fuer "${wort}" steht in ${pfad} nur eine `
                  + `andere Schreibweise (${egal}x, genau 0x). Genau daran hing E6 `
                  + 'zehn Fassungen lang - der Punkt war zu, und der Waechter sah '
                  + 'es nicht.');
              }
            }
          }
        }
        // Und gegen die zwei gestellten Texte (Regel 5 und 13).
        const g = gestellt(bed);
        const ja = werte(bed, () => g.ja);
        const nein = werte(bed, () => g.nein);
        if (!ja.erfuellt || nein.erfuellt) {
          fail(`Backlog ${id}: die Bedingung \`${bed}\` besteht ihre eigene `
            + 'Nullprobe nicht - sie kann nicht eintreten oder nicht ausbleiben. '
            + 'Eine Bedingung, die immer dasselbe sagt, prueft nichts.');
        }
      }
    }
    if (gepruefte === 0) {
      fail('Towerfront-BACKLOG.md: kein einziger offener Punkt erkannt - die '
        + 'Tabellenform hat sich geaendert, und dann prueft hier nichts mehr.');
    }
  }
}

// --- 7. Auch die Fundtabelle darf keinen Rueckstand behaupten, den es nicht
//        gibt.
//
// Abschnitt 6 haelt die "Offen"-Tabellen. Darunter steht die Fundtabelle -
// 150 Lehren, absichtlich ein Gedaechtnis und kein Arbeitsvorrat. Nur trugen
// vier ihrer Zeilen einen RUECKSTAND vor, und alle vier waren falsch:
//
//   S151  "**Offen**, weil die Bahnlaenge an der Balance haengt"
//         Der Zielpunkt ist seit v126 die Plattenmitte, die Balance in v131
//         nachgezogen. `src/data/maps.ts` sagt es selbst.
//   S112  "Offen als D26"       D26 ist seit v114 als Fehlannahme geschlossen.
//   S84   "Offen als D22"       D22 ist geschlossen, S91 haelt es fest.
//   S23   "Offen: ... (siehe T13)"   T13 gibt es in keinem Dokument.
//
// Ein Rueckstand, der nur in der Fundtabelle steht, hat keine
// Schliessbedingung, steht in keiner Uebersicht und faellt niemandem auf -
// die Luecke, die Abschnitt 6 gerade geschlossen hat, nur eine Tabelle
// tiefer.
//
// Geprueft wird deshalb: eine Fundzeile darf Offenheit nur behaupten, indem
// sie einen Punkt NENNT, den es in einer "Offen"-Tabelle gibt. Sonst gehoert
// der Punkt dorthin - mit Schliessbedingung - oder die Zeile ist veraltet.
//
// **Die Erkennung ist absichtlich eng.** "Offen" gross und am Satzanfang
// oder fett; kleingeschriebenes "offen" mitten im Satz nicht. Sonst faengt
// sich die Pruefung Saetze wie S121 ein ("dorthin bringen, wo die Frage
// offen ist"), und ein Waechter, der bei richtiger Prosa anschlaegt, wird
// ueberlesen - dieselbe Lehre wie beim Kachelraster in Abschnitt 3.
{
  const backlog = alle.find(([n]) => n === 'Towerfront-BACKLOG.md');
  if (backlog) {
    let geprueft = 0;
    for (const z of backlog[1].split('\n')) {
      const kopf = z.match(/^\| (S\d+) \|/);
      if (!kopf) continue;
      const behauptung = z.match(/(?:^|[.·|]\s|\*\*)Offen\b(?: als ([A-Z]+\d+(?:-[A-Z])?))?/);
      if (!behauptung) continue;
      geprueft++;
      const id = behauptung[1];
      if (!id) {
        fail(`Fund ${kopf[1]}: behauptet Offenheit, ohne einen Punkt zu nennen. Ein `
          + 'Rueckstand, der nur in der Fundtabelle steht, hat keine Schliessbedingung '
          + 'und faellt niemandem auf. Entweder in eine "Offen"-Tabelle - oder die '
          + 'Zeile ist veraltet.');
      } else if (!offeneIds.has(id)) {
        fail(`Fund ${kopf[1]}: nennt "${id}" als offen - der Punkt steht in keiner `
          + '"Offen"-Tabelle. Entweder ist er zugefallen und die Zeile luegt, oder er '
          + 'fehlt in der Uebersicht.');
      }
    }
    // Eine Pruefung, die nie etwas ansieht, ist keine (Regel 5). Sie darf hier
    // aber auf null fallen - dann ist die Fundtabelle sauber. Gemeldet wird
    // nur der Fall, dass es die Tabelle gar nicht mehr gibt.
    if (!/^\| S\d+ \|/m.test(backlog[1])) {
      fail('Towerfront-BACKLOG.md: keine Fundzeile gefunden - die Form hat sich '
        + 'geaendert, und dann prueft hier nichts mehr.');
    }
    void geprueft;
  }
}

// --- 8. Der Storykatalog muss auswertbar bleiben.
//
// **Weil die Kette ihm folgt, nicht mir.** `npm run naechste` liest die
// Reihenfolge aus `docs/Towerfront-STORIES.md` und waehlt die erste offene
// Story - ueber Stunden und ueber Kontextgrenzen hinweg. Faellt das Dokument
// aus der Form, hat der Naechste nichts mehr in der Hand: eine Ueberschrift,
// die das Muster nicht mehr trifft, verschwindet lautlos aus der Reihe, und
// eine Story ohne Schliessbedingung gilt fuer immer als offen oder fuer immer
// als zu, je nachdem wie man raet.
//
// Geprueft wird deshalb dasselbe, was Abschnitt 6 fuer das Verzeichnis
// prueft - nur mit einem Unterschied, und der ist der wichtige: eine
// ERFUELLTE Bedingung ist hier kein Fehler. Eine Story, die zu ist, ist
// getan; ein offener Punkt, der zu ist, luegt.
{
  const stories = alle.find(([n]) => n === 'Towerfront-STORIES.md');
  if (!stories) {
    fail('Towerfront-STORIES.md fehlt - dann weiss die Kette nicht mehr, woran '
      + 'sie arbeitet.');
  } else {
    const koepfe = [...stories[1].matchAll(/^### (S-[A-Z0-9-]+) · (.+)$/gm)];
    if (koepfe.length < 10) {
      fail(`Towerfront-STORIES.md: nur ${koepfe.length} Stories erkannt - die `
        + 'Form der Ueberschriften hat sich geaendert, und dann liest '
        + '`npm run naechste` die falsche Reihenfolge.');
    }
    const bloecke = stories[1].split(/^### (?=S-)/m).slice(1);
    for (const block of bloecke) {
      const id = block.match(/^(S-[A-Z0-9-]+)/)[1];
      const b = block.match(/\*\*Schliesst, wenn:\*\* `([^`]+)`/);
      if (!b) {
        fail(`Story ${id}: keine Schliessbedingung. Dann kann die Kette nicht `
          + 'entscheiden, ob sie getan ist.');
        continue;
      }
      const bed = b[1];
      if (/^(blick|nutzer): /.test(bed)) continue;
      // Die Form muss der Auswerter kennen. Ob die ZIELDATEI schon da ist,
      // wird hier NICHT verlangt - eine Story beschreibt Arbeit, die noch
      // nicht getan ist, ihre Datei entsteht erst dabei.
      const g = gestellt(bed);
      if (!g) {
        fail(`Story ${id}: die Form \`${bed}\` kennt der Waechter nicht.`);
        continue;
      }
      const ja = werte(bed, () => g.ja);
      const nein = werte(bed, () => g.nein);
      if (!ja.erfuellt || nein.erfuellt) {
        fail(`Story ${id}: die Bedingung \`${bed}\` besteht ihre eigene `
          + 'Nullprobe nicht - sie kann nicht eintreten oder nicht ausbleiben.');
      }
    }
  }
}

// --- 9. Ein Bildauftrag darf sich nicht selbst widersprechen (v304).
//
// **Der Fall, aus dem diese Pruefung entstanden ist.** Abschnitt 1b des
// Bildauftrags sagt seit v211 selbst: "Er gilt nur fuer die Kartenbilder." Die
// drei Gebaeudeauftraege 8d.2 bis 8d.4 trugen ihn trotzdem - "512 x 512,
// quadratisch, freigestellt auf Transparenz" stand drei Absaetze ueber
// "ASPECT RATIO: exactly 16:9 ... FULL BLEED ... 2400 x 1350". Ein Empfaenger,
// der dem Ausgabeblock folgt, liefert ein randloses Gelaende statt eines
// freigestellten Sprites.
//
// Gefunden hat es kein Tor, sondern der Versuch, die Auftraege wirklich
// herauszugeben - dieselbe Klasse wie v229, wo `kartenprobe` an einer
// verschobenen Tabellenspalte brach und es erst auffiel, als ein Bild ankam.
// Ein Auftrag, den niemand ausgibt, ist im Ernstfall kaputt.
//
// **Die Regel ist eine Ableitung, keine Liste** (Regel 15): wer im Prompt
// "512 x 512" schreibt, bestellt eine Figur, und eine Figur bekommt den
// Figurenblock. Eine gepflegte Liste der Figurenabschnitte veraltete an dem
// Tag, an dem einer dazukommt.
// **Keine zwei Auftraege unter derselben Kennung** (v334).
//
// v295 bestellte den Bannturm als `8d.4` mit `33_bannturm.png`; v328 gab dem
// Sanitaeter DIESELBE Nummer und DENSELBEN Dateinamen. Zwei Aufträge unter
// einer Kennung sind kein Schoenheitsfehler: die Pruefungen dieses Dokuments
// lesen die Abschnitte nach ihrer Ueberschrift, und eine Gegenprobe, die
// `### 8d.4` greift, trifft seitdem den falschen. Der Nachtlauf hat sie als
// gegenstandslos gemeldet, und die Ursache lag nicht in der Probe.
//
// Geprueft wird BEIDES, weil es zwei Fehler sind: eine doppelte Nummer
// verwirrt den Leser und die Werkzeuge, ein doppelter Dateiname laesst die
// zweite Lieferung die erste ueberschreiben.
{
  const auftrag0 = alle.find(([n]) => n === 'Towerfront-BILDAUFTRAG.md');
  if (auftrag0) {
    const kennungen = new Map();
    const dateien = new Map();
    for (const z of auftrag0[1].split('\n')) {
      const m = /^###\s+(\d+[a-z]?(?:\.\d+)*)\s/.exec(z);
      if (!m) continue;
      const k = m[1];
      if (kennungen.has(k)) {
        fail(`Bildauftrag: die Kennung ${k} steht zweimal - "${kennungen.get(k)}" und `
          + `"${z.trim()}". Die Pruefungen lesen die Abschnitte nach ihrer Ueberschrift; `
          + 'zwei Abschnitte unter einer Kennung heisst, dass eine Gegenprobe den falschen '
          + 'trifft und dabei schweigt.');
      } else kennungen.set(k, z.trim());
      const d = /`([0-9A-Za-z_]+\.png)`/.exec(z);
      if (!d) continue;
      // **Nur INNERHALB einer Abschnittsfamilie** (8b, 8c, 8d). Dass 8b und
      // 8c dieselbe Datei bestellen, ist Absicht und steht so im Dokument:
      // 8c ist die Fassung OHNE gemalten Weg und tritt an die Stelle von 8b,
      // das als Rueckfalllinie stehen bleibt. Zwei Bestellungen in DERSELBEN
      // Familie sind dagegen genau der Fehler, den v334 gefunden hat.
      const familie = `${k.split('.')[0]}|${d[1]}`;
      if (dateien.has(familie)) {
        fail(`Bildauftrag: die Datei \`${d[1]}\` wird in Abschnitt `
          + `${k.split('.')[0]} zweimal bestellt - in "${dateien.get(familie)}" und in `
          + `"${z.trim()}". Die zweite Lieferung ueberschriebe die erste.`);
      } else dateien.set(familie, z.trim());
    }
  }
}

{
  const auftrag = alle.find(([n]) => n === 'Towerfront-BILDAUFTRAG.md');
  if (auftrag) {
    const zeilen = auftrag[1].split('\n');
    let kopf = '';
    let inBlock = false;
    let block = [];
    const pruefen = () => {
      const text = block.join('\n');
      if (!kopf) return;
      const figur = /512\s*x\s*512/i.test(text);
      const karte = text.includes('[AUSGABE-BLOCK EINFÜGEN]');
      if (figur && karte) {
        fail(`Bildauftrag ${kopf}: der Prompt bestellt eine Figur (512 x 512), traegt `
          + 'aber den Kartenblock `[AUSGABE-BLOCK EINFÜGEN]`. Der sagt 16:9, randlos '
          + 'und 2400 x 1350 - der Auftrag widerspricht sich selbst, und der Empfaenger '
          + 'liefert ein Gelaende statt eines freigestellten Sprites. '
          + 'Gemeint ist `[AUSGABE-BLOCK FIGUR EINFÜGEN]` (Abschnitt 1c).');
      }
    };
    for (const z of zeilen) {
      if (/^### /.test(z)) { pruefen(); kopf = z.replace(/^###\s*/, '').slice(0, 40); block = []; }
      if (z.startsWith('```')) { inBlock = !inBlock; continue; }
      if (inBlock) block.push(z);
    }
    pruefen();
  }
}

for (const h of hinweise) console.log(`  Hinweis: ${h}`);
if (probleme.length) {
  console.error(`DOKU-WAECHTER: ${probleme.length} Fehler`);
  for (const p of probleme) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`DOKU-WAECHTER: 0 Fehler, ${hinweise.length} Hinweis(e). ${alle.length} Dokumente geprüft.`);
