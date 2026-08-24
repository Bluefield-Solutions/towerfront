/** Ein Gedaechtnis fuer teure Tore.
 *
 *  **Warum.** Gemessen in der Tor-Bilanz (v153): `zielplattentor` braucht
 *  76 s und `grafiktor` 13 s - zusammen ein Drittel der ganzen Kette. Beide
 *  rechnen bei jedem Lauf dasselbe aus, weil sich ihre Eingaenge nur mit
 *  neuen Bildern aendern. Das Bildwerkzeug hatte dasselbe Problem und wurde
 *  in v31 so geloest: 62,3 s auf 0,3 s.
 *
 *  **Wie.** Ein sha256 ueber jede Eingangsdatei UND ueber das Werkzeug
 *  selbst. Stimmt der Abdruck mit dem letzten erfolgreichen Lauf ueberein,
 *  ist nichts zu tun.
 *
 *  **Warum das Werkzeug mitzaehlt.** Sonst aendert man die Pruefung und
 *  bekommt das alte Urteil zurueck - ein Tor, das seine eigene Verschaerfung
 *  verschlaeft. Dieselbe Familie wie eine Grenze, die absolut statt anteilig
 *  steht (Regel 2).
 *
 *  **Was NICHT zwischengespeichert wird:** das Urteil selbst. Der Abdruck
 *  sagt nur "dieselben Eingaenge wie beim letzten GRUENEN Lauf" - geschrieben
 *  wird er erst, wenn das Tor bestanden hat. Ein rotes Tor hinterlaesst
 *  keinen Abdruck und rechnet beim naechsten Mal wieder.
 *
 *  **Nicht eingecheckt.** Der Speicher liegt unter `.abdruck/` und steht in
 *  `.gitignore`. Auf dem Auslieferungsrunner ist er deshalb immer leer, und
 *  die Kette rechnet dort jedes Mal vollstaendig - genau so soll es sein: die
 *  fremde Umgebung ist eine eigene Pruefung (v151a).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAGER = join(ROOT, '.abdruck');

/** Alle Dateien unter einem Pfad, oder die Datei selbst. */
function dateien(pfad) {
  const p = join(ROOT, pfad);
  if (!existsSync(p)) return [];
  if (!statSync(p).isDirectory()) return [p];
  return readdirSync(p, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? dateien(join(pfad, e.name)) : [join(p, e.name)]);
}

/** Alle Module, die von diesen Einstiegen aus erreichbar sind.
 *
 *  **Warum abgeleitet und nicht aufgezaehlt.** Der erste Entwurf trug die
 *  Eingaenge je Werkzeug von Hand ein - und war sofort unvollstaendig:
 *  `artaudit.mjs` importiert auch `src/game/state.ts`, das in der Liste
 *  fehlte. Eine zu enge Liste ist der gefaehrliche Fall, denn dann
 *  ueberspringt das Tor stillschweigend, und das sieht aus wie bestanden.
 *
 *  Aufzaehlungen veralten - das ist an einem einzigen Tag zweimal passiert
 *  (eine Probe auf einer umnumerierten Tabellenzeile, eine Liste deutscher
 *  Zahlwoerter, die bei "sechsundzwanzig" endete). Also wird der Graph
 *  gelesen, nicht gepflegt.
 *
 *  Erfasst werden `import ... from '...'` und `await import('...')` mit
 *  relativen Pfaden. Pakete aus `node_modules` bleiben draussen: sie aendern
 *  sich nur mit `package-lock.json`, und das steht ohnehin in der Liste. */
function huelle(einstiege) {
  const gesehen = new Set();
  const rand = [...einstiege.map((e) => join(ROOT, e))];
  // Normalisiert, sonst zaehlt `../src/data/../core/math.ts` als etwas
  // anderes als `../src/core/math.ts` - dieselbe Datei, zweimal im Abdruck,
  // und `umfang` waere eine Phantasiezahl.
  while (rand.length) {
    const datei = aufloesen(resolve(rand.pop()));
    if (!datei || gesehen.has(datei)) continue;
    gesehen.add(datei);
    const text = readFileSync(datei, 'utf8');
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
      rand.push(join(dirname(datei), m[1]));
    }
  }
  return [...gesehen];
}

/** Aus `./x` wird `./x.ts`, `./x.mjs` oder `./x/index.ts` - je nachdem, was
 *  es gibt. Ohne das faende die Huelle kein einziges Modul, denn im Quelltext
 *  stehen die Endungen nicht. */
function aufloesen(pfad) {
  const p = pfad.replace(/\.js$/, '');
  for (const kandidat of [p, `${p}.ts`, `${p}.mjs`, `${p}.mts`, `${p}.js`,
    join(p, 'index.ts')]) {
    if (existsSync(kandidat) && !statSync(kandidat).isDirectory()) return kandidat;
  }
  return null;
}

function rechnen(eingaenge) {
  const h = createHash('sha256');
  for (const pfad of eingaenge) {
    for (const datei of dateien(pfad).sort()) {
      h.update(datei.slice(ROOT.length));
      h.update(readFileSync(datei));
    }
  }
  return h.digest('hex').slice(0, 32);
}

/** Hat sich seit dem letzten gruenen Lauf etwas geaendert?
 *
 *  `name` benennt den Speicher, `eingaenge` sind Pfade relativ zur Wurzel -
 *  Dateien oder Verzeichnisse. Das aufrufende Werkzeug gehoert IMMER dazu;
 *  der Aufrufer traegt es selbst ein, damit hier nicht geraten wird, wer
 *  gerade laeuft.
 *
 *  Rueckgabe: `{ unveraendert, merken() }`. `merken()` erst rufen, wenn das
 *  Tor bestanden hat. */
export function abdruck(name, { werkzeug, module = [], dateien: extra = [] }) {
  // Das Werkzeug selbst ist Einstieg UND Eingang: sonst aendert man die
  // Pruefung und bekommt das alte Urteil zurueck - ein Tor, das seine eigene
  // Verschaerfung verschlaeft.
  const alle = [...huelle([werkzeug, ...module]).map((f) => f.slice(ROOT.length + 1)),
    ...extra];
  const jetzt = rechnen(alle);
  const datei = join(LAGER, `${name}.txt`);
  const frueher = existsSync(datei) ? readFileSync(datei, 'utf8').trim() : null;
  return {
    kurz: jetzt.slice(0, 8),
    /** Wieviele Dateien der Abdruck umfasst - eine Zahl, die auffaellt, wenn
     *  die Huelle ploetzlich leer ist. */
    umfang: alle.length,
    unveraendert: !process.argv.includes('--frisch') && frueher === jetzt,
    merken() {
      mkdirSync(LAGER, { recursive: true });
      writeFileSync(datei, jetzt);
    },
  };
}
