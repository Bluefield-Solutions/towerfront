/** **Der Inspektor** (S-N0-03).
 *
 *  Der Ablauf dieses Projekts kennt seit Langem drei Rollen - Arbeiter,
 *  Pruefer, Inspektor. Der dritte steht in `CLAUDE.md` so beschrieben:
 *
 *    "Sieht nur Bericht und Bilder, nicht den Code und nicht die Absicht.
 *     Urteil: Freigabe · neue Schleife · Rueckbau."
 *
 *  Gefahren wurde er nie. Und das ist teuer: in v50 lag die Turmleiste ueber
 *  der Landkarte, man kam nicht ins Spiel, und **vierzehn Tore waren gruen**.
 *  Elf von 57 Befunden dieses Projekts kamen aus Bildschirmfotos.
 *
 *  **Warum ein Werkzeug und nicht bloss ein Vorsatz.** Wer die Absicht der
 *  Runde kennt, sieht das Bild nicht mehr - er sieht, was er bauen wollte.
 *  Ein Vorsatz kann das nicht ausschliessen, ein Ordner schon: dieses
 *  Werkzeug legt die Beweismittel in `schleife/inspektion/` und **prueft
 *  mechanisch, dass kein Quelltext darin liegt**. Was der Inspektor sieht,
 *  ist genau der Inhalt dieses Ordners.
 *
 *  Es urteilt selbst nicht. Es stellt die Beweismittel und nimmt das Urteil
 *  entgegen - das Urteil faellt ein eigener Durchgang, der nichts anderes
 *  bekommt als diesen Ordner.
 *
 *  Aufruf:
 *    npm run inspektor                       Beweismittel stellen
 *    npm run inspektor -- --urteil Freigabe "..."   Urteil festhalten
 *    npm run inspektor -- --pruefen          liegt ein gueltiges Urteil vor?
 */
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORDNER = join(ROOT, 'schleife/inspektion');
const URTEIL = join(ORDNER, 'urteil.md');
const AUFTRAG = join(ORDNER, 'auftrag.md');
/** Der Abdruck der zuletzt BEURTEILTEN Bildeingaenge.
 *
 *  Liegt ausserhalb von `ORDNER`, und das ist notwendig: das Zusammenstellen
 *  loescht die Mappe jedes Mal - und der naechste Durchgang soll ohnehin
 *  nicht lesen, was der vorige gefunden hat. */
const ABDRUCK = join(ROOT, 'schleife/bildeingaenge.txt');

/** Woraus das Bild entsteht. Alles unter `src/` und die eine HTML-Datei.
 *
 *  **Absichtlich zu weit gefasst.** Enger waere genauer - `src/data/waves.ts`
 *  aendert die Wellen, nicht das Aussehen - aber die Richtung des Irrtums
 *  entscheidet: zu weit heisst hoechstens, dass ein Durchgang gefahren wird,
 *  den es nicht gebraucht haette. Zu eng hiesse, eine Aenderung fuer
 *  unsichtbar zu erklaeren, die man sieht. Das erste kostet Zeit, das zweite
 *  einen ungesehenen Stand. */
const BILDQUELLEN = ['src', 'index.html'];

/** Die drei Urteile. Mehr gibt es nicht, und weniger auch nicht:
 *  "Freigabe" allein waere ein Stempel, "Freigabe oder nicht" liesse offen,
 *  ob nachgebessert oder zurueckgebaut wird - und das ist der Unterschied
 *  zwischen einer weiteren Schleife und dem Eingestaendnis, dass das ZIEL
 *  falsch war (hoechstens drei Schleifen je Ziel). */
const URTEILE = ['Freigabe', 'Schleife', 'Rueckbau'];

/** Was als Quelltext gilt und deshalb nie in den Ordner darf.
 *
 *  Die Liste ist absichtlich weit: lieber ein Bild zu wenig als ein Blick in
 *  den Code. Markdown ist ausgenommen - der Bericht ist ein Ergebnis, kein
 *  Bauplan -, aber auch er wird beschnitten (siehe `berichtOhneAbsicht`). */
const QUELLTEXT = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.html', '.json', '.yml', '.yaml'];

/** **Wie alt eine Aufnahme sein darf** - und warum es diese Zeile gibt.
 *
 *  Der erste Entwurf kopierte alles, was auf das Muster passt. Die
 *  Gegenprobe hat ihn beim ersten Lauf erwischt: in `/tmp/lab/ux` lag
 *  `07-welle-fruch.png` - eine Datei mit Tippfehler im Namen, vom Vortag,
 *  die **v237** zeigte, waehrend alle anderen v270 trugen. Der Durchgang
 *  schrieb woertlich: *"In derselben Mappe liegen zwei Fassungen
 *  nebeneinander; ich haette beinahe die alte beurteilt."*
 *
 *  Das ist die schlimmste Art Fehler fuer dieses Werkzeug: der Inspektor
 *  kann sie nicht bemerken, weil er ja gerade NICHT wissen soll, was gebaut
 *  wurde. Er haette ueber eine 33 Fassungen alte Oberflaeche geurteilt und
 *  es fuer den heutigen Stand gehalten.
 *
 *  Der Lauf wird deshalb datiert: die Marke (`messwerte.json` schreibt das
 *  UX-Audit am Ende) sagt, wann die Aufnahmen entstanden sind; ohne Marke
 *  gilt die neueste Aufnahme des Ordners. Was aelter ist, bleibt draussen -
 *  und wird **genannt**, nicht verschwiegen. */
const TOLERANZ_MS = 5 * 60 * 1000;

/** Die eine Stelle, an der ueber das Alter entschieden wird - fuer die
 *  Aufnahmen wie fuer den Bericht (v272). Der Selbsttest fasst sie an, nicht
 *  den Vergleich daneben: eine Regel, die zweimal dasteht, veraltet einmal
 *  (Regel 15), und der Selbsttest bewiese dann nur die eine Haelfte. */
const zuAlt = (alterMs) => alterMs > TOLERANZ_MS;

/** Ein Alter so schreiben, dass man es lesen kann.
 *
 *  Bis v344 stand an beiden Meldestellen `Math.round(alter / 3600000)` und
 *  damit "0 h aelter als der Lauf" fuer eine Luecke von fuenf Minuten. Eine
 *  Meldung, die "0" sagt und die Datei trotzdem herauswirft, sagt dem Leser
 *  nichts - es hat eine Messung gekostet, ueberhaupt zu sehen, warum die
 *  Haelfte der Bilder fehlte. */
const alterText = (ms) => (ms < 3600000
  ? `${Math.round(ms / 60000)} min` : `${(ms / 3600000).toFixed(1)} h`);

/** Der Nullpunkt eines Laufs: die JUENGSTE seiner Aufnahmen.
 *
 *  Steht hier oben bei der Altersregel, weil der Selbsttest sie gestellt
 *  fahren muss - und der laeuft, bevor es die Quellen ueberhaupt gibt. Die
 *  lange Begruendung steht bei `QUELLEN`. */
const laufZeitAus = (zeiten) => (zeiten.length ? Math.max(...zeiten) : 0);


const version = () => (readFileSync(join(ROOT, 'src/data/config.ts'), 'utf8')
  .match(/VERSION = '(v\d+)'/) ?? [])[1] ?? 'v?';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

/** **Die zwei Regeln dieses Werkzeugs, an sich selbst geprueft - bei jedem
 *  Lauf.**
 *
 *  Der Inspektor steht NICHT in der Torkette; er gehoert zum Ablauf einer
 *  Runde wie `npm run kritik`. Damit gilt fuer ihn, was v229 an
 *  `kartenprobe` gelernt hat: *ein Werkzeug, dessen Eingang niemand prueft,
 *  ist im Ernstfall kaputt - und der Ernstfall ist genau der Tag, an dem man
 *  es braucht.* Eine Gegenprobe ueber ein Tor gibt es hier nicht, also
 *  bezeugen die Regeln sich selbst.
 *
 *  Beide Male wird BEIDE Richtungen geprueft. Eine Pruefung, die nur die
 *  eine kennt, besteht auch eine Regel, die immer anschlaegt. */
/** Die Zeile mit der Fassungsnummer heraus - und sonst nichts.
 *
 *  **Das ist der ganze Grund, warum der erste Entwurf in v274 verworfen
 *  wurde.** Er hat die BILDPUNKTE der Aufnahmen gehasht; `src/ui/ui.ts:393`
 *  schreibt `VERSION` aber in die Kopfzeile, die Fassungsnummer steht damit
 *  in jedem Bild und steigt in jeder Runde. Der Abdruck waere jedes Mal
 *  verschieden gewesen, die Pruefung haette nie angeschlagen und dabei
 *  ausgesehen wie eine Pruefung (Regel 5).
 *
 *  Ueber die Eingaenge laesst sich die eine Zeile sauber ausnehmen. Was
 *  bleibt, ist eine ehrliche Frage: hat sich etwas geaendert, aus dem das
 *  Bild entsteht? */
const ohneFassung = (text) => text.replace(/^export const VERSION = '[^']*';$/m, '');

/** Der Abdruck aller Bildeingaenge: sha1 ueber Pfad und Inhalt.
 *
 *  Der PFAD geht mit ein, nicht nur der Inhalt - sonst waere das Umbenennen
 *  einer Datei unsichtbar, und ein umbenanntes Bildmodul ist genau die Sorte
 *  Aenderung, die man sehen will. */
const abdruckVon = (dateien) => {
  const h = createHash('sha1');
  for (const [pfad, inhalt] of [...dateien].sort((a, b) => a[0].localeCompare(b[0]))) {
    h.update(pfad);
    h.update('\u0000');
    h.update(inhalt);
  }
  return h.digest('hex').slice(0, 16);
};

/** Alle Bildeingaenge einlesen. */
const bildEingaenge = () => {
  const dateien = [];
  const gehen = (rel) => {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) return;
    if (statSync(abs).isDirectory()) {
      for (const f of readdirSync(abs).sort()) gehen(`${rel}/${f}`);
      return;
    }
    dateien.push([rel, ohneFassung(readFileSync(abs, 'utf8'))]);
  };
  for (const q of BILDQUELLEN) gehen(q);
  return dateien;
};

const selbsttest = () => {
  // 1. Erkennt die Quelltext-Sperre einen Quelltext - und schweigt sie ohne?
  const trifft = (namen) => namen.filter((f) => QUELLTEXT.includes(extname(f)));
  const mit = trifft(['02-spiel-ruhe.png', 'bericht.md', 'state.ts']);
  const ohne = trifft(['02-spiel-ruhe.png', 'bericht.md']);
  if (mit.length !== 1 || ohne.length !== 0) {
    console.error('INSPEKTOR: der Selbsttest der Quelltext-Sperre ist gescheitert - '
      + `mit einer .ts-Datei ${mit.length} Treffer, ohne ${ohne.length}.`);
    process.exit(1);
  }
  // 2. Nimmt die Urteilspruefung nur die drei Urteile?
  const unbekannt = URTEILE.includes('Vielleicht');
  const bekannt = URTEILE.every((u) => URTEILE.includes(u));
  if (unbekannt || !bekannt) {
    console.error('INSPEKTOR: der Selbsttest der Urteilsliste ist gescheitert.');
    process.exit(1);
  }
  // 3. Sortiert die Altersregel eine Leiche aus - und laesst frische durch?
  //
  // Diese Regel gibt es, weil die erste Gegenprobe eine 39 Stunden alte
  // Aufnahme in der Mappe gefunden hat, die eine 33 Fassungen aeltere
  // Oberflaeche zeigte. Ohne Selbsttest waere sie eine Zusage: der Inspektor
  // kann eine Leiche nicht bemerken, weil er ja gerade nicht wissen soll,
  // was gebaut wurde.
  //
  // Geprueft wird `zuAlt` selbst, nicht ein nachgebauter Vergleich - seit
  // v272 haengen zwei Stellen daran (Aufnahmen und Bericht).
  if (!zuAlt(TOLERANZ_MS + 1000) || zuAlt(TOLERANZ_MS - 1000) || zuAlt(0)) {
    console.error('INSPEKTOR: der Selbsttest der Altersregel ist gescheitert.');
    process.exit(1);
  }
  // 4. Sieht der Abdruck eine Aenderung - und eine hoehere Fassung NICHT?
  //
  // Beide Richtungen, und die zweite ist die eigentliche: an ihr ist der
  // erste Entwurf in v274 gescheitert. Gefahren wird an gestellten Eingaengen
  // statt am Baum - eine Pruefung, die den echten Baum aendern muesste, um
  // sich zu beweisen, faehrt niemand.
  {
    const a = [['src/x.ts', 'A'], ['src/y.ts', 'B']];
    const gleich = [['src/y.ts', 'B'], ['src/x.ts', 'A']];   // andere Reihenfolge
    const anders = [['src/x.ts', 'A'], ['src/y.ts', 'C']];
    const umbenannt = [['src/x.ts', 'A'], ['src/z.ts', 'B']];
    if (abdruckVon(a) !== abdruckVon(gleich)
      || abdruckVon(a) === abdruckVon(anders)
      || abdruckVon(a) === abdruckVon(umbenannt)) {
      console.error('INSPEKTOR: der Selbsttest des Abdrucks ist gescheitert.');
      process.exit(1);
    }
    // Und die Fassungsnummer darf ihn NICHT bewegen.
    const v1 = "export const VERSION = 'v274';\nexport const WORLD_W = 1920;\n";
    const v2 = "export const VERSION = 'v275';\nexport const WORLD_W = 1920;\n";
    const v3 = "export const VERSION = 'v275';\nexport const WORLD_W = 1900;\n";
    if (abdruckVon([['c', ohneFassung(v1)]]) !== abdruckVon([['c', ohneFassung(v2)]])
      || abdruckVon([['c', ohneFassung(v2)]]) === abdruckVon([['c', ohneFassung(v3)]])) {
      console.error('INSPEKTOR: der Selbsttest der Fassungsausnahme ist gescheitert - '
        + 'entweder bewegt die Fassungsnummer den Abdruck, oder sie nimmt zuviel heraus.');
      process.exit(1);
    }
  }
  // 5. Misst sich eine Quelle mit EINEM Bild an sich selbst?
  //
  // Das ist der Fall, fuer den die Altersregel in v271 gebaut wurde - und
  // fuer `bilder/browser.png` konnte sie ihn bis v344 nie sehen: ein
  // Nullpunkt JE QUELLE ist bei einem einzigen Treffer dessen eigene Zeit,
  // das Alter also von Bauart null. Gemessen ging so eine neun Stunden alte
  // Aufnahme unbeanstandet durch (Regel 5).
  //
  // Gestellt statt abgewartet: eine Quelle mit zwei frischen Aufnahmen, eine
  // zweite mit einer einzigen alten. Geprueft werden BEIDE Richtungen - die
  // alte muss herausfallen, die frischen muessen bleiben. Ohne die zweite
  // besteht den Test auch ein Nullpunkt, der alles herauswirft.
  {
    const spaet = 9 * 3600000;
    const frisch = [spaet, spaet + 60000];
    const einzeln = [0];
    const null0 = laufZeitAus([...frisch, ...einzeln]);
    if (!zuAlt(null0 - einzeln[0]) || zuAlt(null0 - frisch[0])) {
      console.error('INSPEKTOR: der Selbsttest des gemeinsamen Nullpunkts ist gescheitert - '
        + 'eine Quelle mit einer einzigen Aufnahme misst sich an sich selbst.');
      process.exit(1);
    }
    // Und der Nullpunkt ist der JUENGSTE, nicht der aelteste: nimmt er den
    // aeltesten, sind alle Alter negativ und nie zu alt - eine Regel, die
    // immer schweigt (Regel 5).
    if (null0 !== frisch[1]) {
      console.error('INSPEKTOR: der Nullpunkt ist nicht die juengste Aufnahme.');
      process.exit(1);
    }
  }
  console.log(`  Selbsttest: die Quelltext-Sperre trifft .ts und laesst .png und .md `
    + `durch; es gibt genau ${URTEILE.length} Urteile; was mehr als `
    + `${TOLERANZ_MS / 60000} min hinter dem Lauf liegt, bleibt draussen - `
    + 'Aufnahmen wie Bericht; der Abdruck sieht eine geaenderte und eine '
    + 'umbenannte Datei, die Fassungsnummer aber nicht; und eine Quelle mit '
    + 'einer einzigen Aufnahme misst sich nicht an sich selbst.');
};
selbsttest();

/** **`--selbsttest` faehrt nur die Regeln dieses Werkzeugs und geht.**
 *
 *  Damit bekommt der Inspektor eine Gegenprobe, die er als ganzes Werkzeug
 *  nicht haben kann: `npm run inspektor` braucht Aufnahmen in `/tmp/lab/ux`,
 *  und die gibt es auf dem Runner nicht - dort waere er OHNE eingebauten
 *  Fehler rot, und eine Gegenprobe an einem roten Tor beweist nichts
 *  (v313). Die Selbsttests dagegen haengen an keiner Datei und antworten auf
 *  jedem Rechner gleich (v225). */
if (args.includes('--selbsttest')) process.exit(0);

// ------------------------------------------------------------------ pruefen

if (args.includes('--pruefen')) {
  if (!existsSync(URTEIL)) {
    console.error('INSPEKTOR: es liegt kein Urteil vor.');
    console.error('  `npm run inspektor` stellt die Beweismittel, danach urteilt');
    console.error('  der Durchgang, der nur diesen Ordner sieht.');
    process.exit(1);
  }
  const text = readFileSync(URTEIL, 'utf8');
  const m = text.match(/^Urteil: (\S+)/m);
  const f = text.match(/^Fassung: (v\d+)/m);
  if (!m || !URTEILE.includes(m[1])) {
    console.error(`INSPEKTOR: "${m ? m[1] : '(nichts)'}" ist keines der drei Urteile `
      + `(${URTEILE.join(', ')}).`);
    process.exit(1);
  }
  // **Ein Urteil ueber eine andere Fassung ist keins ueber diese.** Ohne
  // diese Zeile traegt das Urteil der letzten Runde die naechste mit - und
  // genau so hoert eine Pruefung leise auf zu pruefen.
  if (!f || f[1] !== version()) {
    console.error(`INSPEKTOR: das Urteil steht auf ${f ? f[1] : '(keiner Fassung)'}, `
      + `das Spiel auf ${version()}. Ein Urteil ueber eine andere Fassung ist keins.`);
    process.exit(1);
  }
  console.log(`INSPEKTOR: Urteil "${m[1]}" fuer ${version()} liegt vor.`);
  process.exit(0);
}

// ------------------------------------------------------------------- urteil

if (args.includes('--urteil')) {
  const u = opt('--urteil');
  const grund = args[args.indexOf('--urteil') + 2] ?? '';
  if (!URTEILE.includes(u)) {
    console.error(`INSPEKTOR: "${u}" ist keines der drei Urteile (${URTEILE.join(', ')}).`);
    process.exit(1);
  }
  if (grund.trim().length < 20) {
    console.error('INSPEKTOR: ein Urteil ohne Begruendung ist ein Stempel. '
      + 'Mindestens ein Satz, und er nennt, was im BILD zu sehen ist.');
    process.exit(1);
  }
  mkdirSync(ORDNER, { recursive: true });
  writeFileSync(ABDRUCK, `${abdruckVon(bildEingaenge())} ${version()} ${u}\n`);
  writeFileSync(URTEIL, [
    `Urteil: ${u}`,
    `Fassung: ${version()}`,
    `Zeit: ${new Date().toISOString()}`,
    '',
    grund,
    '',
  ].join('\n'));
  console.log(`INSPEKTOR: "${u}" fuer ${version()} festgehalten.`);
  process.exit(0);
}

// ------------------------------------------------- Beweismittel zusammenstellen

/** Der Bericht OHNE den Abschnitt, der die Absicht verraet.
 *
 *  `schleife/bericht.md` endet mit "## Umfang" - der Liste der geaenderten
 *  Dateien. Wer sie liest, weiss, woran gearbeitet wurde, und sieht das Bild
 *  danach nicht mehr unbefangen: er sucht die Aenderung, statt das Ganze
 *  anzusehen. Genau das soll der Inspektor nicht koennen. */
const berichtOhneAbsicht = (text) => {
  const i = text.indexOf('\n## Umfang');
  return (i < 0 ? text : text.slice(0, i))
    + '\n\n> Der Abschnitt "Umfang" ist absichtlich entfernt: er nennt die\n'
    + '> geaenderten Dateien und damit die Absicht der Runde.\n';
};

/** Woher die Bilder kommen.
 *
 *  Genommen wird, was das GEBAUTE Spiel in den Zustaenden zeigt, die man
 *  beim Spielen wirklich erreicht - die Aufnahmen des UX-Audits. Sie sind
 *  die einzigen, die die Frage "kann man das spielen?" ueberhaupt zeigen;
 *  ein Werkzeugbild aus `bilder/` zeigt eine Messung, kein Spiel. */
const QUELLEN = [
  { ordner: '/tmp/lab/ux', muster: /^\d\d-.*\.png$/ },
  // **`wellenvorschau.png` ist hier heraus (v272), und der Inspektor hat es
  // selbst gefunden.** Er meldete "Platzhaltertext in der Einweisung: *und so
  // weiter und so weiter und so weiter*" - und hatte recht, dass es dasteht.
  // Nur steht es nicht im Spiel: `tools/streifen.ts` fuellt den laengsten Satz
  // absichtlich auf `MAX_ZEICHEN` auf, um den schlimmsten Fall zu MESSEN.
  //
  // Damit war es ein Befund am Beweismaterial, nicht am Spiel - und der
  // Inspektor kann diesen Unterschied nicht sehen, weil er nicht wissen soll,
  // was ein Werkzeug ist und was das Spiel. Vier Zeilen weiter oben stand der
  // Satz schon richtig da ("ein Werkzeugbild aus `bilder/` zeigt eine Messung,
  // kein Spiel") - und darunter nahm der Code trotzdem eins.
  //
  // `browser.png` bleibt: es ist eine Aufnahme der GEBAUTEN Datei in Chromium,
  // also das Spiel, nur in einem anderen Format. Genau daran hing der Befund
  // ueber die verdeckte Zeile SCHADEN/REICHWEITE, den keine andere Aufnahme
  // zeigt.
  { ordner: join(ROOT, 'bilder'), muster: /^browser\.png$/ },
];

/** **Wann lief der Lauf, dessen Aufnahmen hier liegen?** Die JUENGSTE
 *  Aufnahme ueber ALLE Quellen - ein Nullpunkt, nicht einer je Quelle.
 *  Beides ist gemessen und nicht gewaehlt (v345).
 *
 *  **Die Marke war der falsche Nullpunkt.** Bis v344 las die Regel
 *  `messwerte.json`, und das schreibt `npm run uxaudit` NACH den Aufnahmen.
 *  Gemessen am 11.09.: die sechzehn Bilder liegen zwischen 16:48:20 und
 *  16:50:46, die Marke bei 16:53:36. Damit waren die ersten ACHT zwischen
 *  5:00 und 5:16 "aelter als der Lauf" und fielen an einer Toleranz von
 *  5:00 heraus - um bis zu sechzehn Sekunden, und alle acht aus genau dem
 *  Lauf, dessen andere acht blieben. Weg war die HAELFTE der Beweismittel,
 *  und zwar die mit Landkarte, Ruhe und Bauwahl - also genau die Zustaende,
 *  an denen "kommt man ins Spiel?" haengt. Ein Beweismittel, das eine Sache
 *  systematisch weglaesst, erzeugt Befunde ueber genau diese Sache (v319).
 *
 *  **Und eine Quelle mit EINEM Bild mass sich an sich selbst.**
 *  `bilder/browser.png` ist der einzige Treffer seines Musters; der alte
 *  Rueckfallweg nahm das Groesste seiner eigenen Treffer, also seine eigene
 *  Zeit, und das Alter stand von Bauart auf null. Gemessen am 11.09. war es
 *  NEUN Stunden alt und ging unbeanstandet durch - fuer diese Quelle konnte
 *  die Regel prinzipiell nie anschlagen (Regel 5), und sie ist genau der
 *  Fall, fuer den v271 sie gebaut hat. Mit einem gemeinsamen Nullpunkt
 *  faellt es auf.
 *
 *  Die Toleranz selbst ist unveraendert: sie hat nicht versagt, der
 *  Nullpunkt hat es. Eine Ratsche in der Runde zu lockern, in der die
 *  eigene Aenderung an ihr scheitert, waere kein Beweis mehr (v219). */
const zeitenVon = (q) => (existsSync(q.ordner)
  ? readdirSync(q.ordner).filter((f) => q.muster.test(f))
    .map((f) => statSync(join(q.ordner, f)).mtimeMs)
  : []);

if (existsSync(ORDNER)) rmSync(ORDNER, { recursive: true, force: true });
mkdirSync(ORDNER, { recursive: true });

const bilder = [];
const veraltet = [];
const LAUF_MS = laufZeitAus(QUELLEN.flatMap(zeitenVon));
for (const q of QUELLEN) {
  if (!existsSync(q.ordner)) continue;
  for (const f of readdirSync(q.ordner).filter((x) => q.muster.test(x)).sort()) {
    const alter = LAUF_MS - statSync(join(q.ordner, f)).mtimeMs;
    if (zuAlt(alter)) {
      veraltet.push(`${f} (${alterText(alter)} aelter als der Lauf)`);
      continue;
    }
    copyFileSync(join(q.ordner, f), join(ORDNER, f));
    bilder.push(f);
  }
}

/** **Der Bericht steht unter derselben Altersregel wie die Aufnahmen** (v272).
 *
 *  In v271 bekamen die Bilder eine Marke, weil eine Aufnahme aus v237
 *  zwischen lauter v270 lag. Der Bericht blieb ungeprueft - und genau der
 *  faellt als Naechstes zurueck: er entsteht nur im vollen `npm run
 *  schleife`, die Aufnahmen dagegen in jedem `npm run uxaudit`. Wer die
 *  Bilder neu aufnimmt, hat danach frische Bilder und einen alten Bericht
 *  nebeneinander liegen - dieselbe Mappe, zwei Fassungen, und der Inspektor
 *  kann es nicht sehen.
 *
 *  Verglichen wird gegen die JUENGSTE Aufnahme, nicht gegen die Uhr: der
 *  Bericht darf aelter sein als heute, aber nicht aelter als der Stand, den
 *  er beschreibt. */
const berichtDatei = join(ROOT, 'schleife/bericht.md');
if (existsSync(berichtDatei)) {
  const juengste = bilder.length
    ? Math.max(...bilder.map((f) => statSync(join(ORDNER, f)).mtimeMs)) : 0;
  const alter = juengste - statSync(berichtDatei).mtimeMs;
  if (zuAlt(alter)) {
    veraltet.push(`bericht.md (${alterText(alter)} aelter als die Aufnahmen)`);
  } else {
    writeFileSync(join(ORDNER, 'bericht.md'),
      berichtOhneAbsicht(readFileSync(berichtDatei, 'utf8')));
  }
}

writeFileSync(AUFTRAG, [
  '# Auftrag an den Inspektor',
  '',
  `Fassung: ${version()}`,
  '',
  'Du siehst **nur diesen Ordner**: Bildschirmfotos des gebauten Spiels und,',
  'wenn vorhanden, einen Bericht. Du siehst **keinen Quelltext** und du',
  'erfaehrst **nicht**, woran in dieser Runde gearbeitet wurde. Das ist',
  'Absicht: wer die Absicht kennt, sieht das Bild nicht mehr - er sieht,',
  'was gebaut werden sollte.',
  '',
  '**Frage nicht, ob etwas funktioniert.** Das haben die Tore geprueft.',
  'Frage, ob man es SPIELEN kann und ob es gut aussieht:',
  '',
  '* Kommt man ins Spiel? Liegt etwas ueber etwas anderem?',
  '* Ist alles lesbar - Zahlen, Namen, Knoepfe?',
  '* Wirkt es aus einem Guss, oder sieht etwas aufgeklebt aus?',
  '* Sieht man, was gerade passiert und was man entscheiden soll?',
  '',
  '**Dein Urteil ist eines von dreien:**',
  '',
  '| Urteil | wann |',
  '|---|---|',
  '| `Freigabe` | es ist spielbar und stimmig |',
  '| `Schleife` | etwas ist schlecht, aber am selben Ziel zu beheben |',
  '| `Rueckbau` | das Ziel selbst traegt nicht |',
  '',
  'Begruende am **Bild**, nicht an der Vermutung: nenne die Aufnahme und was',
  'darauf zu sehen ist. Festgehalten wird es mit',
  '',
  '```',
  'npm run inspektor -- --urteil <Freigabe|Schleife|Rueckbau> "<Begruendung>"',
  '```',
  '',
  '## Was in diesem Ordner liegt',
  '',
  ...bilder.map((b) => `* ${b}`),
  existsSync(join(ORDNER, 'bericht.md')) ? '* bericht.md (ohne den Abschnitt "Umfang")' : '',
  '',
].filter((z) => z !== '').join('\n'));

// **Die Prüfung, die den Auftrag erst zu einem macht.**
//
// "Sieht keinen Quelltext" ist eine Zusage, solange es niemand nachsieht.
// Hier wird der Ordner durchgezaehlt, und ein einziger Quelltext darin
// bricht den Lauf ab - dann ist die Trennung naemlich keine mehr.
const fremd = readdirSync(ORDNER).filter((f) => QUELLTEXT.includes(extname(f)));
if (fremd.length) {
  console.error(`INSPEKTOR: im Beweismittelordner liegt Quelltext: ${fremd.join(', ')}.`);
  console.error('  Damit waere die Trennung aufgehoben, auf der das ganze Verfahren steht.');
  process.exit(1);
}

if (!bilder.length) {
  console.error('INSPEKTOR: keine Aufnahmen gefunden.');
  console.error('  `npm run uxaudit` nimmt das gebaute Spiel in den Zustaenden auf,');
  console.error('  die man beim Spielen wirklich erreicht. Ohne Bilder kein Blick,');
  console.error('  und ohne Blick kein Urteil (Regel 8).');
  process.exit(1);
}

if (veraltet.length) {
  console.log(`  Uebergangen, weil aelter als der Lauf: ${veraltet.join(', ')}.`);
}
console.log(`INSPEKTOR: ${bilder.length} Aufnahme(n) und `
  + `${existsSync(join(ORDNER, 'bericht.md')) ? 'ein Bericht' : 'kein Bericht'} `
  + `liegen in schleife/inspektion/ - kein Quelltext (${QUELLTEXT.length} Endungen geprueft).`);
// **Gibt es ueberhaupt etwas Neues zu sehen?** Gemessen, nicht behauptet
// (S-N0-06). Verglichen werden die EINGAENGE des Bildes, nicht seine
// Bildpunkte - der erste Entwurf in v274 hat die Bildpunkte gehasht und ist
// an der Fassungsnummer in der Kopfzeile gescheitert.
//
// Es ist ausdruecklich keine Erlaubnis, den Blick zu ueberspringen: die
// Zeile sagt nur, ob es etwas zu sehen GIBT.
{
  const jetzt = abdruckVon(bildEingaenge());
  const alt = existsSync(ABDRUCK) ? readFileSync(ABDRUCK, 'utf8').trim().split(/\s+/) : null;
  if (alt && alt[0] === jetzt) {
    console.log(`  UNVERAENDERT: an den Bildeingaengen hat sich seit dem Urteil `
      + `"${alt[2]}" fuer ${alt[1]} nichts geaendert (die Fassungsnummer zaehlt nicht mit). `
      + 'Ein zweites Urteil ueber dasselbe Bild waere eine Wiederholung.');
  } else if (alt) {
    console.log(`  NEU: die Bildeingaenge haben sich seit dem Urteil "${alt[2]}" fuer `
      + `${alt[1]} geaendert. Es gibt etwas zu sehen.`);
  } else {
    console.log('  Kein frueherer Abdruck - der erste wird mit dem naechsten Urteil gesetzt.');
  }
}
console.log(`  Auftrag: ${basename(AUFTRAG)}`);
console.log('  Danach: npm run inspektor -- --pruefen');
