// Tor `vergleich` - das wichtigste, und das einzige, das sich in K1 selbst
// gemessen haette.
//
// Zwei Zahlen, nicht eine:
//   TREFFERQUOTE       wieviel von dem, was gemeint war, wird angenommen
//   FALSCH-POSITIV     wieviel von dem, was NICHT gemeint war, auch
//
// Ohne die zweite ist die Pruefung wertlos: ein Abgleich, der alles annimmt,
// hat 100 % Trefferquote und lehrt nichts.
//
// Und zwei Haelften, nicht eine: die ERFUNDENE zum Einstellen, die
// EINGEFRORENE aus echten Aufnahmen zum Beweisen. Solange die zweite fehlt,
// gilt hier KEINE Zielzahl - das Tor sagt das ausdruecklich, statt eine
// Zahl zu melden, die nichts bezeugt.
import fs from 'node:fs';
import path from 'node:path';
import { abgleich } from '../src/vergleich/vergleich.js';
import * as I from '../src/inhalt/erdkunde.js';
import { STAEDTE } from '../src/geo/staedte.js';

const ZIEL_TREFFER = 0.90, ZIEL_FALSCH = 0.02;

/** Alle Gebiete als Kandidaten, mit Aliassen und Aussprachevarianten. */
const ALLE = [
  ...I.KONTINENTE.map(k => ({ id:k.id, name:k.name, aliasse:k.aliasse, aussprache:k.aussprache })),
  ...Object.values(I.LAENDER).flat().map(l => ({ id:l.a3, name:l.name, aliasse:l.aliasse, aussprache:l.aussprache })),
  ...STAEDTE.map(s => ({ id:s.id, name:s.name, aliasse:[], aussprache:[] })),
];
const nachId = new Map(ALLE.map(k => [k.id, k]));

/** Die Kandidatenmenge einer Aufgabe: das Ziel plus vier Geschwister. */
function menge(zielId) {
  const ziel = nachId.get(zielId);
  if (!ziel) throw new Error(`Unbekannte ID im Korpus: ${zielId}`);
  const geschwister = ALLE.filter(k => k.id !== zielId
    && ((zielId.startsWith('DE-')) === (k.id.startsWith('DE-'))));
  return [ziel, ...geschwister.slice(0, 6)];
}

function pruefe(korpus, name) {
  let treffer = 0, trefferGes = 0, rueckfragen = 0;
  const verfehlt = [];
  for (const [zielId, eingaben] of korpus.treffer || []) {
    const kand = menge(zielId);
    for (const e of eingaben) {
      trefferGes++;
      const r = abgleich(e, kand);
      if (r.id === zielId && r.art === 'angenommen') treffer++;
      else if (r.id === zielId && r.art === 'rueckfrage') { treffer++; rueckfragen++; }
      else verfehlt.push(`${e} → ${r.art}${r.name ? ' ('+r.name+')' : ''}, erwartet ${zielId}`);
    }
  }
  let falsch = 0, falschGes = 0;
  const durchgerutscht = [];
  for (const [zielId, eingaben] of korpus.nichttreffer || []) {
    const kand = menge(zielId);
    for (const e of eingaben) {
      falschGes++;
      const r = abgleich(e, kand);
      if (r.id === zielId && r.art === 'angenommen') { falsch++; durchgerutscht.push(`${e} → ${zielId}`); }
    }
  }
  return { name, treffer, trefferGes, quote: treffer/trefferGes,
           rueckfragen, falsch, falschGes, rate: falsch/falschGes, verfehlt, durchgerutscht };
}

const erfunden = JSON.parse(fs.readFileSync(new URL('./korpus/erfunden.json', import.meta.url)));
const eingefrorenPfad = new URL('./korpus/eingefroren.json', import.meta.url);
const hatEingefroren = fs.existsSync(eingefrorenPfad);

const laeufe = [pruefe(erfunden, 'erfunden')];
if (hatEingefroren)
  laeufe.push(pruefe(JSON.parse(fs.readFileSync(eingefrorenPfad)), 'eingefroren'));

let rot = 0;
for (const r of laeufe) {
  const gilt = r.name === 'eingefroren';
  console.log(`\n  Korpus »${r.name}«${gilt ? '  — DIESE ZAHLEN GELTEN' : '  (nur zum Einstellen)'}`);
  console.log(`    Trefferquote      ${(r.quote*100).toFixed(1).padStart(5)} %   `
    + `(${r.treffer}/${r.trefferGes}, davon ${r.rueckfragen} als Rückfrage)`);
  console.log(`    Falsch-Positiv    ${(r.rate*100).toFixed(1).padStart(5)} %   (${r.falsch}/${r.falschGes})`);
  if (r.verfehlt.length) { console.log('    verfehlt:'); r.verfehlt.forEach(v=>console.log('      · '+v)); }
  if (r.durchgerutscht.length) { console.log('    durchgerutscht:'); r.durchgerutscht.forEach(v=>console.log('      ✗ '+v)); }
  if (gilt) {
    if (r.quote < ZIEL_TREFFER) { console.log(`    ROT: unter ${ZIEL_TREFFER*100} % Trefferquote`); rot++; }
    if (r.rate > ZIEL_FALSCH)   { console.log(`    ROT: über ${ZIEL_FALSCH*100} % Falsch-Positiv`); rot++; }
  }
}

if (!hatEingefroren) {
  console.log('\n  Die eingefrorene Hälfte fehlt noch — sie entsteht aus echten Aufnahmen');
  console.log('  in M4. Bis dahin gilt hier KEINE Zielzahl. Die Zahlen oben sagen, dass');
  console.log('  der Abgleich eingestellt ist, nicht dass er trägt.');
  // Eine offensichtliche Fehlfunktion faengt das Tor trotzdem: ein Abgleich,
  // der alles annimmt, faellt hier durch.
  const r = laeufe[0];
  if (r.rate > 0.20) { console.log(`\n  ROT: ${(r.rate*100).toFixed(0)} % Falsch-Positiv schon auf der erfundenen Hälfte.`); rot++; }
  if (r.quote < 0.60) { console.log(`\n  ROT: ${(r.quote*100).toFixed(0)} % Trefferquote schon auf der erfundenen Hälfte.`); rot++; }
}
if (rot) process.exit(1);
