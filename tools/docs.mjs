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
    /** Quelltext einer Datei, oder null. Als Funktion, damit die gestellten
     *  Texte durch dieselbe Auswertung laufen wie die echten Dateien. */
    const ausDatei = (pfad) => {
      try { return lies(pfad); } catch { return null; }
    };
    /** Wieviele Eintraege hat das Array, das <NAME> zugewiesen bekommt? */
    const listenLaenge = (inhalt, name) => {
      const m = inhalt.match(new RegExp(`${name}[^=\\n]*=\\s*\\[([^\\]]*)\\]`));
      if (!m) return null;
      return m[1].split(',').map((s) => s.trim()).filter(Boolean).length;
    };
    /**
     * Eine Bedingung auswerten. `quelle(pfad)` liefert den Text - bei der
     * echten Auswertung aus der Datei, bei der Nullprobe der gestellte Text.
     * Rueckgabe: { erfuellt } oder { fehler }.
     */
    const werte = (bed, quelle) => {
      let m;
      if ((m = bed.match(/^text (\S+) "([^"]+)" (>=|==) (\d+)$/))) {
        const [, pfad, wort, op, n] = m;
        const inhalt = quelle(pfad);
        if (inhalt === null) return { fehler: `die Datei ${pfad} gibt es nicht` };
        const anzahl = inhalt.split(wort).length - 1;
        return { erfuellt: op === '>=' ? anzahl >= Number(n) : anzahl === Number(n) };
      }
      if ((m = bed.match(/^liste (\S+) ([A-Za-z_][A-Za-z0-9_]*) >= (\d+)$/))) {
        const [, pfad, name, n] = m;
        const inhalt = quelle(pfad);
        if (inhalt === null) return { fehler: `die Datei ${pfad} gibt es nicht` };
        const laenge = listenLaenge(inhalt, name);
        if (laenge === null) return { fehler: `die Liste ${name} steht nicht in ${pfad}` };
        return { erfuellt: laenge >= Number(n) };
      }
      return { fehler: `die Form "${bed}" kennt der Waechter nicht` };
    };
    /**
     * Die zwei gestellten Texte zu einer Bedingung: einer, der sie erfuellen
     * muss, und einer, der sie brechen muss. `null`, wenn die Form keine
     * mechanische ist.
     */
    const gestellt = (bed) => {
      let m;
      if ((m = bed.match(/^text \S+ "([^"]+)" (>=|==) (\d+)$/))) {
        const [, wort, op, n] = m;
        // Der Trenner darf das Wort nicht selbst enthalten, sonst zaehlt die
        // Auswertung mehr Treffer als gesetzt wurden.
        return op === '>='
          ? { ja: Array(Number(n)).fill(wort).join('\n'), nein: '' }
          : { ja: '', nein: wort };
      }
      if ((m = bed.match(/^liste \S+ ([A-Za-z_][A-Za-z0-9_]*) >= (\d+)$/))) {
        const [, name, n] = m;
        const bau = (k) => `export const ${name} = [${Array(k).fill("'x'").join(', ')}];`;
        return { ja: bau(Number(n)), nein: bau(0) };
      }
      return null;
    };

    // Nur die Abschnitte, die "Offen" heissen. Die Fundtabellen darunter
    // fuehren absichtlich vergangene Staende.
    const bloecke = backlog[1].split(/^## /m).filter((b) => b.startsWith('Offen'));
    if (bloecke.length === 0) {
      fail('Towerfront-BACKLOG.md: kein Abschnitt "Offen" gefunden - die Form hat '
        + 'sich geaendert, und dann prueft hier nichts mehr.');
    }
    let gepruefte = 0;
    for (const block of bloecke) {
      for (const z of block.matchAll(/^\| ([A-Z]+\d+(?:-[A-Z])?) \| (.+?) \|[^|]*\|[^|]*\|\s*$/gm)) {
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

for (const h of hinweise) console.log(`  Hinweis: ${h}`);
if (probleme.length) {
  console.error(`DOKU-WAECHTER: ${probleme.length} Fehler`);
  for (const p of probleme) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`DOKU-WAECHTER: 0 Fehler, ${hinweise.length} Hinweis(e). ${alle.length} Dokumente geprüft.`);
