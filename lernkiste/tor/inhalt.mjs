// Tore `inhalt`, `topologie`, `beruehrung`, `marken`.
//
// Alle vier arbeiten auf dem, was wirklich da ist - nicht auf dem, was im
// Konzept steht. Und `doku` vergleicht am Ende beides. Eine Zahl, die
// niemand prueft, veraltet lautlos.
import fs from 'node:fs';
import path from 'node:path';
import * as I from '../src/inhalt/erdkunde.js';
import { STAEDTE } from '../src/geo/staedte.js';
import { KONTINENTE_FEIN } from '../src/geo/kontinente.fein.js';
import { DEUTSCHLAND_FEIN } from '../src/geo/deutschland.fein.js';
import { vorzeichenFlaeche, ringFlaeche, imPolygon } from '../tools/geo-backen.mjs';

const fehler = [], hinweise = [];
const pruefe = (b, satz) => { if (!b) fehler.push(satz); };

/* ====================================================== Tor `inhalt` ==== */
console.log('\n  Tor `inhalt`');

const ids = new Set();
const eindeutig = (id, wo) => {
  if (ids.has(id)) fehler.push(`doppelte ID ${id} (${wo})`); ids.add(id);
};
I.KONTINENTE.forEach(k => {
  eindeutig(k.id, 'Kontinent');
  pruefe(k.name, `Kontinent ${k.id} ohne Namen`);
  pruefe(k.aussprache && k.aussprache.length >= 2,
    `Kontinent ${k.id}: mindestens zwei Aussprachevarianten nötig`);
  pruefe([1,2,3].includes(k.runde), `Kontinent ${k.id}: Runde fehlt oder ungültig`);
});
const laender = Object.entries(I.LAENDER).flatMap(([k,l])=>l.map(x=>({...x, kontinent:k})));
laender.forEach(l => {
  eindeutig(l.a3, 'Land');
  pruefe(l.name, `Land ${l.a3} ohne Namen`);
  pruefe(l.rang >= 1 && l.rang <= 5, `Land ${l.a3}: Rang außerhalb 1..5`);
  pruefe(l.aussprache && l.aussprache.length >= 2, `Land ${l.a3}: zu wenige Aussprachevarianten`);
  pruefe(I.KONTINENTE.some(k=>k.id===l.kontinent), `Land ${l.a3}: Elternknoten ${l.kontinent} fehlt`);
});
Object.entries(I.LAENDER).forEach(([k, l]) => {
  const raenge = l.map(x=>x.rang).sort().join(',');
  pruefe(raenge === '1,2,3,4,5', `${k}: Ränge sind ${raenge}, erwartet 1,2,3,4,5`);
});
STAEDTE.forEach(s => {
  eindeutig(s.id, 'Bundesland');
  pruefe(s.hauptstadt, `${s.id} ohne Hauptstadt`);
  pruefe(s.ort, `${s.id}: keine Stadtlage`);
  pruefe(s.anker, `${s.id}: kein Anker`);
  if (!s.stadtstaat)
    pruefe((I.HAUPTSTADT_ABLENKER[s.id]||[]).length >= 1,
      `${s.id}: kein Ablenker gepflegt — Ebene 4 wäre dort trivial`);
});
I.ECHTE_FALLEN.forEach(id => {
  const a = I.HAUPTSTADT_ABLENKER[id] || [];
  pruefe(a.length >= 1, `${id} ist als echte Falle geführt, hat aber keinen Ablenker`);
});
pruefe(new Date().getFullYear() - I.STAND.jahr <= 3,
  `Datenstand ${I.STAND.jahr} ist älter als drei Jahre`);

// Die Gebietszahl wird GEZAEHLT, nicht geschrieben.
const ZAHL = { kontinente:I.KONTINENTE.length, laender:laender.length,
               bundeslaender:STAEDTE.length, staedte:STAEDTE.length };
ZAHL.gesamt = ZAHL.kontinente + ZAHL.laender + ZAHL.bundeslaender + ZAHL.staedte;
console.log(`    ${ZAHL.kontinente} Kontinente + ${ZAHL.laender} Länder + `
  + `${ZAHL.bundeslaender} Bundesländer + ${ZAHL.staedte} Städte = ${ZAHL.gesamt} Gebiete`);

/* ==================================================== Tor `topologie` === */
console.log('\n  Tor `topologie`');
function pfadZuPolys(d) {
  const polys = [];
  for (const teil of d.split('M').slice(1)) {
    const z = teil.match(/-?\d+\.?\d*/g); if (!z) continue;
    const ring = []; for (let i=0;i+1<z.length;i+=2) ring.push([+z[i],+z[i+1]]);
    if (ring.length > 2) polys.push(ring);
  }
  return polys;
}
// Erwartete Teile und Loecher - aus der Wirklichkeit, nicht aus den Daten.
const ERWARTET = {
  'DE-HB': { teileMin:2, grund:'Bremen und Bremerhaven liegen 60 km auseinander' },
  'DE-BB': { loecherMin:1, grund:'Berlin liegt vollständig in Brandenburg' },
  'DE-NI': { loecherMin:1, grund:'die Stadt Bremen liegt vollständig in Niedersachsen' },
  'DE-SH': { teileMin:2, grund:'Sylt, Föhr, Amrum, Fehmarn' },
};
for (const b of DEUTSCHLAND_FEIN) {
  const e = ERWARTET[b.id]; if (!e) continue;
  if (e.teileMin) pruefe(b.teile >= e.teileMin,
    `${b.name}: ${b.teile} Teile, erwartet mindestens ${e.teileMin} — ${e.grund}`);
  if (e.loecherMin) pruefe(b.loecher >= e.loecherMin,
    `${b.name}: ${b.loecher} Löcher, erwartet mindestens ${e.loecherMin} — ${e.grund}`);
}
// Umlaufsinn IM AUSGEGEBENEN PFAD.
//
// Achtung, hier ist die Falle andersherum als bei der Eingabe: die Pfade
// liegen in Bildschirmkoordinaten, y zeigt nach UNTEN. Damit dreht sich das
// Vorzeichen der Schnürsenkelformel um. Ein Aussenring, der auf dem Schirm
// im Uhrzeigersinn laeuft - das, was d3-geo aus einem korrekten Eingabering
// macht - hat hier ein POSITIVES Vorzeichen.
//
// Das Tor hat beim ersten Lauf genau deshalb 23 von 23 Umrissen als falsch
// gemeldet. Nicht die Daten waren verkehrt, sondern die Pruefung.
let falscheRichtung = 0, entartet = 0;
for (const q of [...KONTINENTE_FEIN, ...DEUTSCHLAND_FEIN]) {
  const polys = pfadZuPolys(q.pfad);
  if (!polys.length) { entartet++; continue; }
  const groesster = polys.reduce((a,b)=>ringFlaeche(a)>ringFlaeche(b)?a:b);
  if (vorzeichenFlaeche(groesster) < 0) falscheRichtung++;
  if (ringFlaeche(groesster) <= 0) entartet++;
}
pruefe(falscheRichtung === 0,
  `${falscheRichtung} Außenringe laufen gegen den Uhrzeigersinn — d3-geo liest das als "der Rest der Kugel"`);
pruefe(entartet === 0, `${entartet} Gebiete mit Fläche 0`);
console.log(`    ${KONTINENTE_FEIN.length + DEUTSCHLAND_FEIN.length} Umrisse geprüft, `
  + `${falscheRichtung} falsch herum, ${entartet} entartet`);
// Anker liegt IM Gebiet
let ankerDraussen = 0;
for (const s of STAEDTE) {
  const b = DEUTSCHLAND_FEIN.find(x=>x.id===s.id);
  const polys = pfadZuPolys(b.pfad);
  const groesster = polys.reduce((a,c)=>ringFlaeche(a)>ringFlaeche(c)?a:c);
  if (!imPolygon(s.anker[0], s.anker[1], [groesster])) ankerDraussen++;
}
pruefe(ankerDraussen === 0, `${ankerDraussen} Anker liegen außerhalb ihres Gebiets`);
console.log(`    ${STAEDTE.length} Anker geprüft, ${ankerDraussen} außerhalb`);

/* =================================================== Tor `beruehrung` === */
console.log('\n  Tor `beruehrung`');
// Kleinste unterstuetzte Darstellung: iPhone quer, Karte 470 von 844 Punkten.
const KARTE_PX = 470, MIN_PT = 44;
const zuKlein = [];
for (const b of DEUTSCHLAND_FEIN) {
  const s = STAEDTE.find(x=>x.id===b.id);
  const durchmesserPx = s.radius * 2 * (KARTE_PX/1000);
  if (durchmesserPx < MIN_PT) zuKlein.push({ name:b.name, px:+durchmesserPx.toFixed(1) });
}
console.log(`    ${zuKlein.length} von ${DEUTSCHLAND_FEIN.length} Gebieten sind kleiner als `
  + `${MIN_PT} pt und brauchen eine entkoppelte Trefferfläche:`);
zuKlein.sort((a,b)=>a.px-b.px).forEach(z=>console.log(`      ${z.name.padEnd(24)} ${z.px} pt`));
hinweise.push(`${zuKlein.length} Gebiete brauchen eine entkoppelte Trefferfläche (Konzept 5.4)`);
// Ueberlappen sich zwei 44-pt-Kreise, gewinnt das kleinere.
let paare = 0;
for (let i=0;i<STAEDTE.length;i++) for (let j=i+1;j<STAEDTE.length;j++) {
  const a=STAEDTE[i], b=STAEDTE[j];
  const d = Math.hypot(a.anker[0]-b.anker[0], a.anker[1]-b.anker[1]) * (KARTE_PX/1000);
  if (d < MIN_PT) { paare++; hinweise.push(`Trefferkreise überlappen: ${a.name} / ${b.name} (${d.toFixed(0)} pt)`); }
}
console.log(`    ${paare} Paare mit überlappenden Trefferkreisen — dort gewinnt das kleinere Gebiet`);

/* ====================================================== Tor `marken` ==== */
console.log('\n  Tor `marken`');
// NUR der Grundblock. Der Abendmodus definiert dieselben Marken absichtlich
// dunkler - beim ersten Lauf hat das Tor beide Bloecke gelesen und
// "unterschiedliche Helligkeit" gemeldet. Auch das war die Pruefung, nicht
// die Sache.
const MARKEN_ALLES = fs.readFileSync('src/marken/marken.css','utf8');
const MARKEN = MARKEN_ALLES.slice(MARKEN_ALLES.indexOf(':root {'),
                                 MARKEN_ALLES.indexOf(':root[data-abend'));
const QUELLEN = ['entwuerfe/koerper.html','entwuerfe/skript.html'];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
let verstoesse = 0;
for (const q of QUELLEN) {
  if (!fs.existsSync(q)) continue;
  const t = fs.readFileSync(q,'utf8');
  if (EMOJI.test(t)) { fehler.push(`${q}: Emoji im Oberflächentext`); verstoesse++; }
  if (/filter:\s*drop-shadow/.test(t)) { fehler.push(`${q}: filter auf einem Pfad`); verstoesse++; }
  const layout = t.match(/transition:[^;]*\b(width|height|top|left|margin|padding)\b/g);
  if (layout) { fehler.push(`${q}: Animation auf Layouteigenschaft — ${layout[0]}`); verstoesse++; }
}
pruefe(/--f1:\s*oklch/.test(MARKEN), 'Palette steht nicht in OKLCH');
// Der Abendmodus muss ebenfalls in sich gleich hell sein.
const abend = [...MARKEN_ALLES.slice(MARKEN_ALLES.indexOf(':root[data-abend'))
  .matchAll(/--f[1-7]:\s*oklch\(([\d.]+)/g)].map(m=>+m[1]);
pruefe(abend.length === 7 && new Set(abend).size === 1,
  `Abendmodus: ${abend.length} Farben mit Helligkeiten ${[...new Set(abend)].join(', ')}`);
const ls = [...MARKEN.matchAll(/--f[1-7]:\s*oklch\(([\d.]+)/g)].map(m=>+m[1]);
pruefe(ls.length === 7, `${ls.length} Flächenfarben gefunden, erwartet 7`);
pruefe(new Set(ls).size === 1, `Flächenfarben haben unterschiedliche Helligkeit: ${[...new Set(ls)].join(', ')}`);
console.log(`    ${ls.length} Flächenfarben, alle mit L = ${ls[0]} — derselbe Textton ist auf allen lesbar`);
console.log(`    ${verstoesse} Markenverstöße in ${QUELLEN.length} Quellen`);

/* ======================================================== Tor `doku` ==== */
console.log('\n  Tor `doku`');
const KONZEPT = '../docs/Lernkiste-KONZEPT.md';
if (fs.existsSync(KONZEPT)) {
  const t = fs.readFileSync(KONZEPT,'utf8');
  const m = t.match(/Gebiete gesamt \| \*\*(\d+)\*\*/);
  if (!m) hinweise.push('Konzept nennt keine Gebietszahl');
  else if (+m[1] !== ZAHL.gesamt)
    fehler.push(`Konzept sagt ${m[1]} Gebiete, gezählt sind ${ZAHL.gesamt} `
      + `(${ZAHL.kontinente}+${ZAHL.laender}+${ZAHL.bundeslaender}+${ZAHL.staedte})`);
  else console.log(`    Gebietszahl stimmt: ${ZAHL.gesamt}`);
}

/* ------------------------------------------------------------- Ergebnis */
console.log('');
hinweise.forEach(h=>console.log(`  Hinweis: ${h}`));
if (fehler.length) {
  console.log(`\n  ${fehler.length} FEHLER:`);
  fehler.forEach(f=>console.log(`    ✗ ${f}`));
  process.exit(1);
}
console.log(`\n  Alle vier Tore grün. ${ids.size} eindeutige IDs, ${ZAHL.gesamt} Gebiete.`);
