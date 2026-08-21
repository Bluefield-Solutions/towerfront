#!/usr/bin/env node
/**
 * Grafik-Audit — misst unsere Bilder gegen die Prinzipien, nach denen die
 * gut bewerteten Vertreter des Genres gebaut sind.
 *
 * Die Prinzipien sind nicht von mir — und seit v105 auch nicht mehr aus der
 * Lehre, sondern aus der **Messung am Zielbild**.
 *
 * Das ist der Unterschied, an dem dieses Werkzeug drei Jahre lang in die
 * falsche Richtung gezeigt hat. Die erste Fassung maß gegen die Lehre zur
 * flachen Zeichnung: drei bis vier Farben je Form, Figuren gesättigter als
 * der Boden, Figuren heller als der Boden. Dann hat der Grafik-Audit ein
 * echtes Zielbild vermessen (Abschnitt 5) und dabei genau diese drei Sätze
 * widerlegt — im Zielbild trägt ein einzelner Turm **889 Farben**, ist der
 * Boden mit 0,51 **gesättigter** als der Turm mit 0,37, und Turm und Boden
 * liegen mit 0,36 gegen 0,33 im **selben** Helligkeitsband.
 *
 * Die Korrektur steht seit v55 in Abschnitt 5.2 des Dokuments. Nur stand sie
 * nirgends im Werkzeug — es hat sie in jedem Lauf weiter als Fehler gemeldet.
 * Wer danach gehandelt hätte, hätte die Farbzahl auf 40 gedrückt, den Boden
 * entfärbt und die Figuren aufgehellt: drei Schritte, jeder von der Referenz
 * WEG.
 *
 * Deshalb steht die Referenz jetzt hier als eine Tabelle, in einer Fassung,
 * und die Befunde werden aus ihr gerechnet. Was gilt:
 *
 *  - **In einer gerenderten Szene macht das Licht die Hierarchie, nicht die
 *    Farbe.** Türme stehen in der Sonne, werfen Schatten, haben Glanzkanten.
 *    Ein Sättigungsgefälle wäre dort sogar falsch — es entfärbt den Boden.
 *  - **Kein reines Schwarz.** Das gilt unverändert, und es ist gemessen:
 *    1,3 % im Zielbild.
 *  - **Eine Sonne über alle Karten.** Gilt ebenfalls unverändert.
 *  - **Die Dichte trägt die Bildsprache.** Nicht "überall gleich", sondern
 *    im Band: Figuren dichter als der Boden, aber beide gedeckelt.
 *
 * Aufruf: npm run grafik
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const lies = (datei) => {
  const text = readFileSync(join(ROOT, 'src/gfx/assets', datei), 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/'([^']+)': 'data:image\/webp;base64,([^']+)'/g)) {
    out.set(m[1], Buffer.from(m[2], 'base64'));
  }
  return out;
};

/** Alle Kennzahlen eines Bildes auf einmal. */
async function messen(buffer, { transparent = true } = {}) {
  const bild = sharp(buffer).ensureAlpha();
  const { data, info } = await bild.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  const farben = new Map();
  let n = 0, sumL = 0, sumS = 0, dunkel = 0, schwarz = 0;
  const werte = [];

  const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  for (let i = 0; i < W * H; i++) {
    const a = data[i * 4 + 3];
    if (transparent && a < 200) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    n++;
    const l = lum(r, g, b);
    sumL += l;
    werte.push(l);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    sumS += max === 0 ? 0 : (max - min) / max;
    if (l < 0.06) dunkel++;
    if (r < 12 && g < 12 && b < 12) schwarz++;
    // Farben auf 5 Bit je Kanal zusammenfassen - feiner unterscheidet das
    // Auge bei diesen Groessen ohnehin nicht.
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    farben.set(key, (farben.get(key) ?? 0) + 1);
  }
  if (!n) return null;

  // Wieviele Farben tragen zusammen 90 Prozent der Flaeche? Das ist die
  // Zahl, die das Auge als "Palette" wahrnimmt - nicht die Gesamtzahl.
  const sortiert = [...farben.values()].sort((a, b) => b - a);
  let summe = 0, tragend = 0;
  for (const c of sortiert) { summe += c; tragend++; if (summe >= n * 0.9) break; }

  werte.sort((a, b) => a - b);
  const p = (q) => werte[Math.min(werte.length - 1, Math.floor(werte.length * q))];

  // Detaildichte: mittlere Helligkeitsaenderung zwischen Nachbarpunkten.
  // Ein Foto hat viel davon, eine flaechige Zeichnung wenig.
  let kanten = 0, kn = 0;
  for (let y = 1; y < H - 1; y += 2) {
    for (let x = 1; x < W - 1; x += 2) {
      const i = (y * W + x) * 4;
      if (transparent && data[i + 3] < 200) continue;
      const j = (y * W + x + 1) * 4, k = ((y + 1) * W + x) * 4;
      if (transparent && (data[j + 3] < 200 || data[k + 3] < 200)) continue;
      const a1 = lum(data[i], data[i + 1], data[i + 2]);
      kanten += Math.abs(a1 - lum(data[j], data[j + 1], data[j + 2]))
        + Math.abs(a1 - lum(data[k], data[k + 1], data[k + 2]));
      kn++;
    }
  }

  return {
    flaeche: n,
    palette: tragend,
    helligkeit: sumL / n,
    saettigung: sumS / n,
    spanne: p(0.95) - p(0.05),
    schwarzAnteil: schwarz / n,
    dunkelAnteil: dunkel / n,
    dichte: kn ? (kanten / kn) * 100 : 0,
  };
}

const z = (v, k = 2) => v.toFixed(k).padStart(6);

console.log('GRAFIK-AUDIT\n');
const befunde = [];

/** Woher kommt das Licht in einem Bild?
 *
 *  An jeder Kante ist eine Seite heller als die andere. Mittelt man ueber alle
 *  Kanten, zeigt der Vektor zur Lichtquelle. Das ist die eine Eigenschaft, die
 *  ueber alle Karten gleich sein muss - sonst steht die Sonne je Karte woanders
 *  und die Szene kippt. Ein geliefertes Bild mit Sonne von rechts faellt hier
 *  auf, bevor es im Spiel landet.
 */
async function lichtrichtung(buffer) {
  const B = 300;
  const { data, info } = await sharp(buffer).resize(B, null).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const l = (i) => (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  let gx = 0, gy = 0, n = 0;
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const dx = l(((y) * W + x + 2) * 4) - l(((y) * W + x - 2) * 4);
      const dy = l(((y + 2) * W + x) * 4) - l(((y - 2) * W + x) * 4);
      if (Math.hypot(dx, dy) < 0.12) continue;
      gx += dx; gy += dy; n++;
    }
  }
  // Der Vektor zeigt zum Helleren, also zur Sonne.
  return { winkel: (Math.atan2(gy / n, gx / n) * 180) / Math.PI, kanten: n };
}

// ------------------------------------------------------------- Untergruende
console.log('Untergründe');
console.log('  Name             Palette  Helligk  Sätt.  Spanne  Dichte');
const bg = lies('backgrounds.ts');
const bgWerte = [];
for (const [id, buf] of bg) {
  const m = await messen(buf, { transparent: false });
  const licht = await lichtrichtung(buf);
  bgWerte.push({ id, ...m, licht: licht.winkel });
  console.log(`  ${id.padEnd(16)} ${String(m.palette).padStart(6)}  ${z(m.helligkeit)}  ${z(m.saettigung)}  ${z(m.spanne)}  ${z(m.dichte)}`);
}

// ------------------------------------------------------------------- Tuerme
console.log('\nTürme');
console.log('  Name             Palette  Helligk  Sätt.  Spanne  Dichte  Schwarz');
const tw = lies('towers.ts');
const twWerte = [];
for (const [id, buf] of tw) {
  if (!/_1$/.test(id)) continue;
  const m = await messen(buf);
  twWerte.push({ id, ...m });
  console.log(`  ${id.padEnd(16)} ${String(m.palette).padStart(6)}  ${z(m.helligkeit)}  ${z(m.saettigung)}  ${z(m.spanne)}  ${z(m.dichte)}  ${z(m.schwarzAnteil * 100, 1)}%`);
}

// ------------------------------------------------------------------ Gegner
console.log('\nGegner');
console.log('  Name             Palette  Helligk  Sätt.  Spanne  Dichte  Schwarz');
const en = lies('enemies.ts');
const enWerte = [];
for (const [id, buf] of en) {
  const m = await messen(buf);
  enWerte.push({ id, ...m });
  console.log(`  ${id.padEnd(16)} ${String(m.palette).padStart(6)}  ${z(m.helligkeit)}  ${z(m.saettigung)}  ${z(m.spanne)}  ${z(m.dichte)}  ${z(m.schwarzAnteil * 100, 1)}%`);
}

// --------------------------------------------------------- Lichtrichtung
console.log('\nLichtrichtung (Winkel zur Sonne, -135 = oben links)');
for (const b of bgWerte) console.log(`  ${b.id.padEnd(16)} ${b.licht.toFixed(0).padStart(5)}°`);

// --------------------------------------------------------------- Bewertung
const mittel = (arr, f) => arr.reduce((a, b) => a + f(b), 0) / arr.length;
const figuren = [...twWerte, ...enWerte];

/** Die Referenz, in einer Fassung.
 *
 *  Herkunft: `docs/Towerfront-GRAFIK-AUDIT.md`, Abschnitt 5.4 — abgeleitet
 *  aus der Messung eines echten Zielbilds (Abschnitt 5). Die Zahlen in
 *  Klammern sind die dort gemessenen Werte des Zielbilds selbst.
 *
 *  Steht eine Zahl in beiden Dateien, driftet sie. Deshalb ist DIESE hier
 *  die Fassung, die zählt, und das Dokument verweist hierher - dieselbe
 *  Lehre wie aus S76: wer eine Zahl in ein Dokument schreibt, schreibt den
 *  Befehl daneben, der sie erzeugt. */
const REFERENZ = {
  figur: {
    helligkeit: [0.33, 0.40],   // Zielturm 0,36
    saettigung: [0.35, 0.45],   // Zielturm 0,37
    dichte: [3, 6],             // Zielturm 3,44
  },
  grund: {
    helligkeit: [0.30, 0.36],   // Zielboden 0,33
    saettigung: [0.45, 0.55],   // Zielboden 0,51
    dichte: [1.5, 3],           // Zielboden 1,63
  },
  schwarzAnteil: 0.02,          // Zielbild 1,3 %
  lichtSpanne: 40,
  lichtMitte: [-175, -95],
};

console.log('\n─── Befunde ───\n');

/** Liegt der Wert im Band? Und wenn nicht, in welche Richtung? */
const ausserhalb = (wert, [min, max]) =>
  wert < min ? 'zu niedrig' : wert > max ? 'zu hoch' : null;

/** Eine Kennzahl über eine Gruppe, gegen ihr Band. */
function pruefen(gruppe, name, feld, band, einheit = '') {
  const m = mittel(gruppe, (f) => f[feld]);
  const abweichler = gruppe
    .map((f) => ({ id: f.id, wert: f[feld], wie: ausserhalb(f[feld], band) }))
    .filter((f) => f.wie);
  const lage = ausserhalb(m, band);
  console.log(
    `  ${name.padEnd(24)} ${m.toFixed(2)}${einheit}  Band ${band[0]}-${band[1]}` +
    `  ${lage ? lage.toUpperCase() : 'im Band'}` +
    `  (${abweichler.length}/${gruppe.length} daneben)`,
  );
  return { m, lage, abweichler };
}

console.log('Gegen die Referenz aus Abschnitt 5.4:\n');

const figH = pruefen(figuren, 'Figuren Helligkeit', 'helligkeit', REFERENZ.figur.helligkeit);
const figS = pruefen(figuren, 'Figuren Sättigung', 'saettigung', REFERENZ.figur.saettigung);
const figD = pruefen(figuren, 'Figuren Detaildichte', 'dichte', REFERENZ.figur.dichte);
const grH = pruefen(bgWerte, 'Untergrund Helligkeit', 'helligkeit', REFERENZ.grund.helligkeit);
const grS = pruefen(bgWerte, 'Untergrund Sättigung', 'saettigung', REFERENZ.grund.saettigung);
const grD = pruefen(bgWerte, 'Untergrund Detaildichte', 'dichte', REFERENZ.grund.dichte);

const nenne = (a) => a.slice(0, 3).map((f) => `${f.id} ${f.wert.toFixed(2)}`).join(', ');

// --- Die Figuren.
if (figD.lage === 'zu hoch') {
  befunde.push(
    `Figuren rauschen: Detaildichte ${figD.m.toFixed(2)} gegen ein Band von ` +
    `${REFERENZ.figur.dichte.join(' bis ')} (Zielturm 3,44). ` +
    `${figD.abweichler.length} von ${figuren.length} liegen daneben (${nenne(figD.abweichler)}). ` +
    'Das ist Befund B1: kleingerechnete Renderings mit Kompressionskörnung, ' +
    'nicht mehr Inhalt. Entrauschen hilft, neue Bilder helfen mehr.',
  );
}
if (figH.lage) {
  befunde.push(
    `Figuren im Mittel ${figH.lage}: Helligkeit ${figH.m.toFixed(2)} gegen ` +
    `${REFERENZ.figur.helligkeit.join(' bis ')} (Zielturm 0,36).`,
  );
}
if (figS.lage) {
  befunde.push(
    `Figuren im Mittel ${figS.lage} gesättigt: ${figS.m.toFixed(2)} gegen ` +
    `${REFERENZ.figur.saettigung.join(' bis ')} (Zielturm 0,37).`,
  );
}

// --- Der Untergrund.
//
// Abstand A aus dem Audit: das Zielbild ist eine Tagszene, unsere eine
// Nachtszene. Der groesste einzelne Abstand, und keine Detailarbeit an
// Einzelbildern holt ihn auf.
if (grH.lage) {
  befunde.push(
    `Untergrund ${grH.lage}: Helligkeit ${grH.m.toFixed(2)} gegen ` +
    `${REFERENZ.grund.helligkeit.join(' bis ')} (Zielboden 0,33). ` +
    (grH.lage === 'zu niedrig'
      ? 'Das ist Abstand A: das Zielbild ist eine Tagszene, unseres eine Nachtszene.'
      : ''),
  );
}
if (grS.abweichler.length) {
  befunde.push(
    `Untergrundsättigung streut: ${grS.abweichler.length} von ${bgWerte.length} Karten ` +
    `liegen ausserhalb von ${REFERENZ.grund.saettigung.join(' bis ')} (${nenne(grS.abweichler)}). ` +
    'Die Karten sollen sich in der Farbe unterscheiden, nicht in der Lautstärke.',
  );
}
if (grD.lage) {
  befunde.push(
    `Untergrund ${grD.lage === 'zu niedrig' ? 'zu glatt' : 'zu unruhig'}: Detaildichte ` +
    `${grD.m.toFixed(2)} gegen ${REFERENZ.grund.dichte.join(' bis ')} (Zielboden 1,63). ` +
    (grD.lage === 'zu niedrig'
      ? 'Der Boden trägt zu wenig Struktur - Fels und Grasbüschel fehlen IM Bild.'
      : ''),
  );
}

// --- Reines Schwarz. Unveraendert gueltig, und gemessen: 1,3 % im Zielbild.
const mitSchwarz = figuren.filter((f) => f.schwarzAnteil > REFERENZ.schwarzAnteil);
console.log(`\n  Reines Schwarz: ${mitSchwarz.length} von ${figuren.length} Figuren über ` +
  `${(REFERENZ.schwarzAnteil * 100).toFixed(0)} % Fläche (Zielbild 1,3 %)`);
if (mitSchwarz.length) {
  befunde.push(
    `Reines Schwarz in ${mitSchwarz.length} Figuren ` +
    `(${mitSchwarz.slice(0, 3).map((f) => `${f.id} ${(f.schwarzAnteil * 100).toFixed(0)} %`).join(', ')}). ` +
    'Es frisst Löcher in die Form statt sie zu begrenzen.',
  );
}

// --- Eine Sonne. Ebenfalls unveraendert gueltig.
{
  const winkel = bgWerte.map((b) => b.licht);
  const spanne = Math.max(...winkel) - Math.min(...winkel);
  const mitte = winkel.reduce((a, b) => a + b, 0) / winkel.length;
  console.log(`  Lichtrichtung: Spanne ${spanne.toFixed(0)}°, Mitte ${mitte.toFixed(0)}° ` +
    `(erlaubt bis ${REFERENZ.lichtSpanne}°, ${REFERENZ.lichtMitte.join(' bis ')}°)`);
  if (spanne > REFERENZ.lichtSpanne) {
    befunde.push(
      `Die Sonne steht je Karte woanders (Spanne ${spanne.toFixed(0)}°). ` +
      'Figurenschatten passen dann auf einer Karte und auf der nächsten nicht.',
    );
  }
  if (mitte > REFERENZ.lichtMitte[1] || mitte < REFERENZ.lichtMitte[0]) {
    befunde.push(
      `Die Sonne steht im Mittel bei ${mitte.toFixed(0)}°, erwartet oben links. ` +
      'Die Schatten im Renderer zeigen in die falsche Richtung.',
    );
  }
}

// --- Die Farbzahl: gemessen, aber NICHT als Befund.
//
// Sie stand hier als Fehler, sobald eine Figur ueber 40 Farben trug - alle
// zwoelf taten das. Das Zielbild traegt 889 Farben in einem einzigen Turm.
// Eine Pruefung, die die Referenz selbst durchfallen liesse, misst das
// falsche Ding. Der Wert bleibt in der Ausgabe, weil er den Unterschied
// zwischen gezeichnet und gerendert zeigt - aber er ist kein Befund.
console.log(`  Palette: Figuren im Mittel ${mittel(figuren, (f) => f.palette).toFixed(0)} Farben, ` +
  'Zielturm 889 - kein Befund, siehe Abschnitt 5.4.');

console.log(`\n─── ${befunde.length} Befund(e) ───\n`);
for (const b of befunde) console.log(`  • ${b}\n`);
if (!befunde.length) console.log('  Keine. Alle Prinzipien erfüllt.\n');
