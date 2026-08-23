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
for (const [name, text] of alle) {
  for (const m of text.matchAll(/`npm run ([a-z-]+)`|npm run ([a-z-]+)/g)) {
    const cmd = m[1] ?? m[2];
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
  24: 'vierundzwanzig', 25: 'fünfundzwanzig',
};
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
// Nur lebende Dokumente. Ein Messbericht traegt "Messung: vNN" und beschreibt
// absichtlich den Stand von damals - ihn zu aktualisieren waere Faelschung.
for (const [name, text] of alle) {
  const m = text.match(/Stand: (v\d+)/);
  if (!m) continue;
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

for (const h of hinweise) console.log(`  Hinweis: ${h}`);
if (probleme.length) {
  console.error(`DOKU-WAECHTER: ${probleme.length} Fehler`);
  for (const p of probleme) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`DOKU-WAECHTER: 0 Fehler, ${hinweise.length} Hinweis(e). ${alle.length} Dokumente geprüft.`);
