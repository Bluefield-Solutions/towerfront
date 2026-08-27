// Tore `inhalt`, `topologie`, `beruehrung`, `marken`.
//
// Alle vier arbeiten auf dem, was wirklich da ist - nicht auf dem, was im
// Konzept steht. Und `doku` vergleicht am Ende beides. Eine Zahl, die
// niemand prueft, veraltet lautlos.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import * as I from '../src/inhalt/erdkunde.js';
import { STAEDTE } from '../src/geo/staedte.js';
import { KONTINENTE_FEIN } from '../src/geo/kontinente.fein.js';
import { DEUTSCHLAND_FEIN } from '../src/geo/deutschland.fein.js';
import { ANTARKTIKA_FEIN } from '../src/geo/antarktika.fein.js';
import { LAENDER_AFRIKA_FEIN } from '../src/geo/laender-afrika.fein.js';
import { LAENDER_ASIEN_FEIN } from '../src/geo/laender-asien.fein.js';
import { LAENDER_EUROPA_FEIN } from '../src/geo/laender-europa.fein.js';
import { LAENDER_NORDAMERIKA_FEIN } from '../src/geo/laender-nordamerika.fein.js';
import { LAENDER_SUEDAMERIKA_FEIN } from '../src/geo/laender-suedamerika.fein.js';

/** Alles, was gebacken wird - damit eine Pruefung nicht die Haelfte auslaesst. */
const GEBACKEN = {
  kontinente:   KONTINENTE_FEIN,
  deutschland:  DEUTSCHLAND_FEIN,
  antarktika:   ANTARKTIKA_FEIN,
  afrika:       LAENDER_AFRIKA_FEIN,
  asien:        LAENDER_ASIEN_FEIN,
  europa:       LAENDER_EUROPA_FEIN,
  nordamerika:  LAENDER_NORDAMERIKA_FEIN,
  suedamerika:  LAENDER_SUEDAMERIKA_FEIN,
};
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

// Nadeln: Schnitte ohne Flaeche.
//
// Natural Earth speichert Antarktika fuer eine rechteckige Weltkarte. Der
// Umriss laeuft dort bei 180 Grad hinunter zum Pol, am unteren Rand entlang
// und bei -180 Grad wieder hinauf. Auf der Weltkarte deckt sich das mit dem
// Kartenrand und faellt nicht auf. In der polaren Aufsicht sind 180 und -180
// DIESELBE Linie: beide Schenkel liegen aufeinander und zeigen sich als
// Strich quer durch den Kontinent. Zu sehen war es nur im Bild - keines der
// Tore hat es gemeldet, weil eine Nadel weder die Flaeche noch die
// Umgrenzung noch den Umlaufsinn aendert.
//
// Erkannt wird sie daran, was sie ausmacht: zwei Punkte desselben Ringes
// fallen aufeinander, und der Weg dazwischen umschliesst nichts. Eine echte
// schmale Halbinsel hat Flaeche, eine Nadel nicht.
// Die Schwellen sind so gewaehlt, dass sie eine Naht treffen und eine
// Kuestenlinie in Ruhe lassen. Bei 1000 px Breite liegen benachbarte
// Kuestenpunkte der feinen Stufe teils enger als ein halbes Bildpunkt
// beieinander - eine blosse Deckung zweier Punkte ist deshalb KEIN Befund.
// Was eine Naht ausmacht, ist der lange Umweg, der nichts umschliesst:
// hin zum Pol und auf demselben Weg zurueck.
const NADEL_DECKUNG = 0.15;  // px, so genau fallen zwei Punkte aufeinander
const NADEL_WEG     = 20;    // px, kuerzere Umwege sind Kuestenkringel
// Die mittlere Breite trennt sauber: eine Naht laeuft auf sich selbst
// zurueck und hat exakt 0. Die duennsten ECHTEN Gebilde im Vorrat - ein
// paar Fjorde in Kanada, eine Nehrung in den USA - liegen bei 0,18 bis 0,27
// px. Dazwischen ist Platz. Sie werden als Hinweis gemeldet, nicht als
// Fehler: sie stehen so in der Wirklichkeit.
const NADEL_BREITE  = 0.05;  // px mittlere Breite - darunter ist es ein Schnitt
const DUENN_BREITE  = 0.3;   // px, darunter nur noch ein Haar breit
function nadeln(d) {
  let zahl = 0, laengste = 0, duenn = 0;
  for (const ring of pfadZuPolys(d)) {
    const eimer = new Map();
    ring.forEach((p, i) => {
      const k = `${Math.round(p[0]/NADEL_DECKUNG)},${Math.round(p[1]/NADEL_DECKUNG)}`;
      if (!eimer.has(k)) eimer.set(k, []);
      eimer.get(k).push(i);
    });
    for (const gruppe of eimer.values()) {
      for (let a = 0; a < gruppe.length; a++) for (let b = a+1; b < gruppe.length; b++) {
        const i = gruppe[a], j = gruppe[b];
        if (j - i < 3) continue;
        if (Math.hypot(ring[i][0]-ring[j][0], ring[i][1]-ring[j][1]) > NADEL_DECKUNG) continue;
        const teil = ring.slice(i, j+1);
        let weg = 0;
        for (let k = 1; k < teil.length; k++)
          weg += Math.hypot(teil[k][0]-teil[k-1][0], teil[k][1]-teil[k-1][1]);
        if (weg < NADEL_WEG) continue;
        const breite = ringFlaeche(teil) / (weg/2);
        if (breite > DUENN_BREITE) continue;
        if (breite > NADEL_BREITE) { duenn++; continue; }
        zahl++;
        if (weg > laengste) laengste = weg;
      }
    }
  }
  return { zahl, laengste, duenn };
}
let nadelZahl = 0, nadelWo = [], duennZahl = 0;
for (const [quelle, liste] of Object.entries(GEBACKEN)) {
  for (const q of liste) {
    const n = nadeln(q.pfad);
    duennZahl += n.duenn;
    if (n.zahl) { nadelZahl += n.zahl; nadelWo.push(`${quelle}/${q.name} (${n.zahl}, längste ${n.laengste.toFixed(0)} px)`); }
  }
}
if (duennZahl) hinweise.push(`${duennZahl} echte Gebilde sind nur ein Haar breit `
  + `(unter ${DUENN_BREITE} px mittlere Breite) — sie stehen so in der Wirklichkeit, `
  + `sind aber bei keiner Größe zu sehen`);
pruefe(nadelZahl === 0,
  `${nadelZahl} Nadeln ohne Fläche im Umriss: ${nadelWo.join(', ')} — auf einer anderen Projektion wird daraus ein Strich`);
console.log(`    ${Object.values(GEBACKEN).flat().length} Umrisse auf Nadeln geprüft, `
  + `${nadelZahl} gefunden, ${duennZahl} echte Haarlinien`);

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

/* ===================================================== Tor `schrift` === */
console.log('\n  Tor `schrift`');
//
// Die Schriften liegen nur im Schnitt `latin` im Baum - 51,6 KB statt 328.
// Das ist eine Zusage ueber den INHALT: kein angezeigter Name darf ein
// Zeichen ausserhalb dieses Bereichs brauchen. Wer sie bricht, sieht auf
// dem iPad ein leeres Kaestchen und sonst nichts - kein Absturz, keine
// Meldung, nur ein Name, den das Kind nicht lesen kann.
//
// Der Bereich wird NICHT hier festgeschrieben, sondern aus der erzeugten
// schrift.css gelesen. Aendert Google den Schnitt, wandert die Pruefung mit.
{
  const cssPfad = path.join(process.cwd(), 'src/schrift/schrift.css');
  if (!fs.existsSync(cssPfad)) {
    pruefe(false, 'src/schrift/schrift.css fehlt — `npm run schrift` wurde nie ausgeführt');
  } else {
    const css = fs.readFileSync(cssPfad, 'utf8');
    const bereiche = [];
    for (const m of css.matchAll(/U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/g))
      bereiche.push([parseInt(m[1], 16), parseInt(m[2] || m[1], 16)]);
    pruefe(bereiche.length > 0, 'schrift.css nennt keinen einzigen Zeichenbereich');
    const drin = (c) => bereiche.some(([a, b]) => c >= a && c <= b);

    // Was geprueft wird: alles, was als Name auf dem Schirm landen kann,
    // plus der Text der Oberflaeche. Der Inhalt waechst - dort passiert es.
    const quellen = [];
    const sammle = (was, wo) => {
      if (typeof was === 'string') quellen.push([was, wo]);
      else if (Array.isArray(was)) was.forEach(x => sammle(x, wo));
      else if (was && typeof was === 'object')
        for (const [k, v] of Object.entries(was)) sammle(v, wo);
    };
    sammle(I.KONTINENTE, 'Kontinente');
    sammle(I.LAENDER, 'Länder');
    sammle(I.HAUPTSTADT_ABLENKER, 'Ablenker');
    sammle(STAEDTE.map(x => x.hauptstadt), 'Hauptstädte');
    sammle(DEUTSCHLAND_FEIN.map(x => x.name), 'Bundesländer');
    for (const [quelle, liste] of Object.entries(GEBACKEN))
      sammle(liste.map(x => x.name).filter(Boolean), quelle);
    // Kommentare zaehlen nicht: sie werden nie angezeigt. Ohne das Streichen
    // meldet das Tor genau den Kommentar rot, der seinen eigenen Befund
    // beschreibt - und der Weg aus dem Rot waere, den Grund zu loeschen.
    const ohneKommentar = (t) => t
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    for (const datei of ['prototyp/spiel.js', 'prototyp/vorlage.html'])
      quellen.push([ohneKommentar(fs.readFileSync(path.join(process.cwd(), datei), 'utf8')), datei]);

    const fehlend = new Map();
    for (const [text, wo] of quellen)
      for (const z of text) {
        const c = z.codePointAt(0);
        if (!drin(c)) {
          const k = `U+${c.toString(16).toUpperCase().padStart(4,'0')} „${z}"`;
          if (!fehlend.has(k)) fehlend.set(k, new Set());
          fehlend.get(k).add(wo);
        }
      }
    pruefe(fehlend.size === 0, `${fehlend.size} Zeichen liegen außerhalb des Schnitts `
      + `latin: ${[...fehlend].map(([k,w])=>`${k} in ${[...w].join('/')}`).join(', ')}`);
    console.log(`    ${quellen.length} Texte gegen ${bereiche.length} Zeichenbereiche geprüft, `
      + `${fehlend.size} Zeichen ohne Schrift`);
  }
}

/* ====================================================== Tor `symbol` === */
console.log('\n  Tor `symbol`');
//
// Ein Symbol faellt nicht auf, wenn es kaputt ist - es steht auf dem
// Startbildschirm und niemand sieht es sich noch einmal an. Geprueft wird
// deshalb das Mechanische, so wie `bildtor` es im anderen Projekt tut.
{
  const NOETIG = [180, 192, 512, 1024];
  const symbolDir = path.join(process.cwd(), 'src/symbol');
  for (const g of NOETIG) {
    const f = path.join(symbolDir, `symbol-${g}.png`);
    if (!fs.existsSync(f)) { pruefe(false, `symbol-${g}.png fehlt`); continue; }
    const bild = PNG.sync.read(fs.readFileSync(f));
    pruefe(bild.width === g && bild.height === g,
      `symbol-${g}.png ist ${bild.width}×${bild.height}, erwartet ${g}×${g}`);

    // iOS legt Durchsichtigkeit auf SCHWARZ. Ein Symbol mit Alpha sieht im
    // Entwurf gut aus und auf dem Startbildschirm nach Loch.
    let durchsichtig = 0;
    for (let i = 3; i < bild.data.length; i += 4) if (bild.data[i] < 255) durchsichtig++;
    pruefe(durchsichtig === 0,
      `symbol-${g}.png hat ${durchsichtig} durchsichtige Bildpunkte — iOS legt die auf Schwarz`);

    // Nicht einfarbig. Eine leere Flaeche besteht jede andere Pruefung.
    const toene = new Set();
    for (let i = 0; i < bild.data.length; i += 4)
      toene.add((bild.data[i] >> 3 << 10) | (bild.data[i+1] >> 3 << 5) | (bild.data[i+2] >> 3));
    pruefe(toene.size > 40, `symbol-${g}.png hat nur ${toene.size} Farbtöne — vermutlich leer`);

    // Die Kugel muss INNERHALB der iOS-Maske liegen. iOS schneidet die Ecken
    // rund ab; was dort steht, ist weg. Geprueft an den vier Ecken: dort darf
    // nur Grund stehen, kein Meer und kein Land.
    const punkt = (x, y) => { const i = (bild.width * y + x) << 2;
      return [bild.data[i], bild.data[i+1], bild.data[i+2]]; };
    const mitte = punkt(g >> 1, g >> 1);
    const rand = Math.round(g * 0.045);
    let eckenWieMitte = 0;
    for (const [x, y] of [[rand,rand], [g-1-rand,rand], [rand,g-1-rand], [g-1-rand,g-1-rand]]) {
      const e = punkt(x, y);
      const d = Math.max(Math.abs(e[0]-mitte[0]), Math.abs(e[1]-mitte[1]), Math.abs(e[2]-mitte[2]));
      if (d < 40) eckenWieMitte++;
    }
    pruefe(eckenWieMitte === 0,
      `symbol-${g}.png: ${eckenWieMitte} Ecken sehen aus wie die Mitte — die Kugel läuft in die iOS-Maske`);
  }
  console.log(`    ${NOETIG.length} Größen geprüft: quadratisch, undurchsichtig, nicht leer, `
    + `Kugel innerhalb der Maske`);
}

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
// Die Zahl wird GEZAEHLT, nicht hingeschrieben: hier stand "Alle vier Tore
// grün", während längst sechs liefen. Eine Zahl, die niemand nachrechnet,
// veraltet still.
const torZahl = (fs.readFileSync(new URL(import.meta.url), 'utf8')
  .match(/^console\.log\('\\n  Tor `/gm) || []).length;
console.log(`\n  Alle ${torZahl} Tore grün. ${ids.size} eindeutige IDs, ${ZAHL.gesamt} Gebiete.`);
