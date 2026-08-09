#!/usr/bin/env node
/**
 * Karteneinbau — ausgelesene Bahnen in `src/data/maps.ts` schreiben.
 *
 * Bis v85 habe ich das bei jeder Kartenlieferung von Hand geskriptet, und
 * jedes Mal sind dieselben vier Fehler passiert:
 *
 *   1. Nach Punktzahl statt nach Länge sortiert — die Stützpunkte sind
 *      ausgedünnt, eine kurze Bahn kann mehr davon haben als eine lange.
 *   2. Doppelt vereinigt — der Auslesevorgang vereinigt schon beim Laufen;
 *      ein zweites Anhängen ließ eine Karte im Kreis laufen.
 *   3. Am falschen Punkt verbunden — gesucht wurde das nächste Punktepaar
 *      irgendwo statt dort, wo das ENDE des Nebenwegs auftrifft.
 *   4. Doppelte Punkte — zwei identische Punkte ergeben einen Abschnitt der
 *      Länge null, dessen Richtung undefiniert ist; der Wächter las das als
 *      Kehrtwende.
 *
 * Alle vier sind hier behoben und bleiben behoben. Zusätzlich verarbeitet das
 * Werkzeug bis zu VIER Zuwege — die Handfassung konnte nur zwei, und bestellt
 * sind Karten mit drei und vier Strängen.
 *
 * Aufruf:  node tools/mapapply.mjs <bilddaten.json> <MAP_KONSTANTE>
 *   z. B.  node tools/mapapply.mjs /tmp/karte2_daten.json MAP_ASCHESCHLUCHT
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [datenPfad, konstante] = process.argv.slice(2);
if (!datenPfad || !konstante) {
  console.error('Aufruf: node tools/mapapply.mjs <daten.json> <MAP_KONSTANTE>');
  process.exit(1);
}

const MAX_BAHNEN = 4;
/** Wie weit das Ziel ins Bild gezogen wird - dort steht ein Bauwerk. */
const ZIEL_HINEIN = 150;
/** Wie weit der Bahnanfang mindestens vor die Kante geschoben wird - dort
 *  steht das Tor. Liegt der Anfang noch im Feld, wird weiter geschoben, bis
 *  er draussen ist; ein fester Wert reichte bei einer Karte nicht, deren
 *  Zugang 130 Pixel innerhalb der Kante begann. */
const START_HINAUS = 120;
const WELT_B = 1920, WELT_H = 1080;

const abstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const laenge = (b) => b.reduce((s, _, i) => (i ? s + abstand(b[i - 1], b[i]) : 0), 0);

const daten = JSON.parse(readFileSync(datenPfad, 'utf8'));

// --- 1. Nach geometrischer Länge sortieren, doppelte Zuwege verwerfen.
let bahnen = [...daten.lanes].sort((a, b) => laenge(b) - laenge(a));
const behalten = [];
for (const b of bahnen) {
  if (b.length < 3) continue;
  if (behalten.some((o) => abstand(b[0], o[0]) < 260)) continue;
  behalten.push(b);
  if (behalten.length >= MAX_BAHNEN) break;
}
if (!behalten.length) {
  console.error('KARTENEINBAU: keine brauchbare Bahn in den Daten.');
  process.exit(1);
}

// --- 2. Ausrichten: Ziel ist das Ende der längsten Bahn, das am weitesten von
//        allen anderen Bahnanfängen entfernt liegt.
let haupt = behalten[0];
const andere = behalten.slice(1);
const starts = andere.length ? andere.map((b) => b[0]) : [haupt[0]];
const dAnfang = Math.min(...starts.map((s) => abstand(haupt[0], s)));
const dEnde = Math.min(...starts.map((s) => abstand(haupt[haupt.length - 1], s)));
if (dAnfang > dEnde) haupt = [...haupt].reverse();
let ziel = haupt[haupt.length - 1];

const fertig = [haupt];
for (const b of andere) {
  // Kommt die Bahn schon am Ziel an, wurde beim Auslesen bereits vereinigt -
  // ein zweites Anhängen ließe sie im Kreis laufen.
  if (Math.min(abstand(b[0], ziel), abstand(b[b.length - 1], ziel)) < 90) {
    fertig.push(abstand(b[b.length - 1], ziel) < abstand(b[0], ziel) ? b : [...b].reverse());
    continue;
  }
  // Sonst: ausrichten, dann ab dem Treffpunkt des ENDES die Hauptbahn anhängen.
  const eigen = abstand(b[b.length - 1], ziel) < abstand(b[0], ziel) ? b : [...b].reverse();
  let i = haupt.length - 1, best = Infinity;
  haupt.forEach((p, k) => {
    const d = abstand(p, eigen[eigen.length - 1]);
    if (d < best) { best = d; i = k; }
  });
  fertig.push([...eigen, ...haupt.slice(i + 1)]);
}

// --- 3. Zacken glätten, doppelte Punkte entfernen, Anfang hinausschieben.
const glatt = fertig.map((b) => {
  // Kurze Bahnen koennen nach dem Ausrichten unter drei Punkte fallen - dann
  // gibt es nichts zu glaetten, und der Zugriff auf den Vorvorgaenger lief
  // ins Leere.
  if (b.length < 3) return b;
  const ohneZacken = b.slice(0, 2);
  for (const p of b.slice(2)) {
    // Das Entfernen eines Zackens kann die Liste unter zwei Punkte schrumpfen;
    // dann gibt es keinen Vorvorgaenger, an dem sich ein Winkel messen liesse.
    if (ohneZacken.length < 2) { ohneZacken.push(p); continue; }
    const a = ohneZacken[ohneZacken.length - 2], c = ohneZacken[ohneZacken.length - 1];
    const w1 = Math.atan2(c.y - a.y, c.x - a.x);
    const w2 = Math.atan2(p.y - c.y, p.x - c.x);
    let d = Math.abs(w2 - w1);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d > (100 * Math.PI) / 180) { ohneZacken.pop(); continue; }
    ohneZacken.push(p);
  }
  const ohneDoppel = [ohneZacken[0]];
  for (const p of ohneZacken.slice(1)) {
    if (abstand(p, ohneDoppel[ohneDoppel.length - 1]) > 4) ohneDoppel.push(p);
  }
  if (ohneDoppel.length >= 2) {
    const dx = ohneDoppel[0].x - ohneDoppel[1].x, dy = ohneDoppel[0].y - ohneDoppel[1].y;
    const n = Math.hypot(dx, dy) || 1;
    let weit = START_HINAUS;
    for (let versuch = 0; versuch < 40; versuch++) {
      const x = ohneDoppel[0].x + (dx / n) * weit;
      const y = ohneDoppel[0].y + (dy / n) * weit;
      if (x < -20 || y < -20 || x > WELT_B + 20 || y > WELT_H + 20) break;
      weit += 60;
    }
    ohneDoppel[0] = {
      x: Math.round(ohneDoppel[0].x + (dx / n) * weit),
      y: Math.round(ohneDoppel[0].y + (dy / n) * weit),
      w: ohneDoppel[0].w,
    };
  }
  return ohneDoppel;
});

// --- 4. Ziel ins Bild ziehen, Punkte dahinter entfernen.
{
  const b = glatt[0];
  if (b.length >= 2) {
    const v = b[b.length - 2];
    const dx = ziel.x - v.x, dy = ziel.y - v.y;
    const n = Math.hypot(dx, dy) || 1;
    ziel = {
      x: Math.round(ziel.x - (dx / n) * ZIEL_HINEIN),
      y: Math.round(ziel.y - (dy / n) * ZIEL_HINEIN),
      w: ziel.w,
    };
  }
}
const bereinigt = glatt.map((b) => {
  const rest = b.slice(0, -1).filter((q) => abstand(q, ziel) > 170);
  return [...rest, { ...ziel }];
});

// --- 4b. Doppelgänger verwerfen — nach dem Ausrichten, nicht davor.
//
// Der erste Filter läuft vor dem Umdrehen der Hauptbahn. Danach können zwei
// Bahnen denselben Startpunkt haben, ohne dass es vorher zu sehen war: bei
// der Probe kamen zwei von drei Bahnen aus derselben Ecke.
const einzeln = [];
for (const b of bereinigt) {
  if (einzeln.some((o) => abstand(b[0], o[0]) < 220)) continue;
  einzeln.push(b);
}

// --- 5. In die Datei schreiben.
const alsText = (bahnenListe) => {
  let t = 'lanes: [\n';
  for (const b of bahnenListe) {
    t += '    [\n';
    for (let i = 0; i < b.length; i += 3) {
      t += '      ' + b.slice(i, i + 3)
        .map((p) => `{ x: ${p.x}, y: ${p.y}, w: ${p.w} }`).join(', ') + ',\n';
    }
    t += '    ],\n';
  }
  return t + '  ],';
};

const pfad = join(ROOT, 'src/data/maps.ts');
const quelle = readFileSync(pfad, 'utf8');
const i = quelle.indexOf(`export const ${konstante}`);
if (i < 0) {
  console.error(`KARTENEINBAU: ${konstante} steht nicht in maps.ts.`);
  process.exit(1);
}
const j = quelle.indexOf('\n};', i);
const teil = quelle.slice(i, j);
const k = teil.indexOf('lanes: [');
const l = teil.indexOf('\n  ],', k);
const neu = teil.slice(0, k) + alsText(einzeln) + teil.slice(l + '\n  ],'.length);
writeFileSync(pfad, quelle.slice(0, i) + neu + quelle.slice(j));

console.log(`KARTENEINBAU: ${einzeln.length} Bahn(en) in ${konstante} geschrieben.`);
for (const b of einzeln) {
  console.log(`  ${b.length} Stützpunkte, ${Math.round(laenge(b))} px, ` +
    `Start ${b[0].x}/${b[0].y}, Ziel ${b[b.length - 1].x}/${b[b.length - 1].y}`);
}
console.log('Jetzt `npm run guards` — der Wächter prüft Kurven, Breiten und Deckung.');
