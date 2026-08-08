#!/usr/bin/env node
/**
 * Grafik-Audit — misst unsere Bilder gegen die Prinzipien, nach denen die
 * gut bewerteten Vertreter des Genres gebaut sind.
 *
 * Die Prinzipien sind nicht von mir. Sie stammen aus der Recherche und lassen
 * sich alle in Zahlen fassen:
 *
 *  1. **Begrenzte Farbzahl je Objekt.** Der Kingdom-Rush-Grafiker beschreibt
 *     seine Technik selbst so: drei bis vier Farben je Form, die den Eindruck
 *     von Körperlichkeit erzeugen. Nicht zwei-, nicht zweitausend.
 *  2. **Kein reines Schwarz**, und Farben leicht gedämpft — "die Gamma mit
 *     einem Hauch Grau".
 *  3. **Werthierarchie.** Was zuerst gelesen werden muss, hat den höchsten
 *     Helligkeitskontrast zum Hintergrund. Deko bleibt in engerem Wertebereich.
 *  4. **Sättigungsgefälle.** Der Hintergrund ist weniger gesättigt als die
 *     Spielfiguren. Der Blick geht zum Gesättigtsten.
 *  5. **Gleiche Detaildichte.** Gemischte Dichten wirken unfertig — ein
 *     detailarmer Turm neben einem fotorealistischen Boden fällt auseinander.
 *  6. **Lesbar in Graustufen.** Wer die Farbe wegnimmt und die Teile nicht
 *     mehr auseinanderhält, hat zu wenig Wertkontrast.
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

// ------------------------------------------------------------- Untergruende
console.log('Untergründe');
console.log('  Name             Palette  Helligk  Sätt.  Spanne  Dichte');
const bg = lies('backgrounds.ts');
const bgWerte = [];
for (const [id, buf] of bg) {
  const m = await messen(buf, { transparent: false });
  bgWerte.push({ id, ...m });
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

// --------------------------------------------------------------- Bewertung
const mittel = (arr, f) => arr.reduce((a, b) => a + f(b), 0) / arr.length;
const figuren = [...twWerte, ...enWerte];

console.log('\n─── Befunde ───\n');

// 1. Palette je Objekt
const gross = figuren.filter((f) => f.palette > 40);
console.log(`1. Palette: Figuren tragen im Mittel ${mittel(figuren, (f) => f.palette).toFixed(0)} Farben`);
console.log(`   (die 90 % der Fläche tragen). Referenz: drei bis vier je Form.`);
if (gross.length) {
  befunde.push(
    `Zu viele Farben: ${gross.length} von ${figuren.length} Figuren tragen über 40 Farben ` +
    `(${gross.slice(0, 3).map((f) => `${f.id} ${f.palette}`).join(', ')}). Das ist gerendert, ` +
    'nicht gezeichnet - und es ist der Hauptgrund, warum die Figuren nicht wie aus einer Hand wirken.',
  );
}

// 2. Sättigungsgefälle
const sBg = mittel(bgWerte, (f) => f.saettigung);
const sFig = mittel(figuren, (f) => f.saettigung);
console.log(`\n2. Sättigung: Untergrund ${sBg.toFixed(2)}, Figuren ${sFig.toFixed(2)}`);
console.log('   Referenz: Figuren deutlich gesättigter als der Untergrund.');
if (sFig < sBg * 1.25) {
  befunde.push(
    `Kein Sättigungsgefälle: Figuren ${sFig.toFixed(2)} gegen Untergrund ${sBg.toFixed(2)}. ` +
    'Der Blick wird nicht geführt - alles ist gleich laut.',
  );
}

// 3. Detaildichte
const dBg = mittel(bgWerte, (f) => f.dichte);
const dFig = mittel(figuren, (f) => f.dichte);
console.log(`\n3. Detaildichte: Untergrund ${dBg.toFixed(2)}, Figuren ${dFig.toFixed(2)}`);
console.log('   Referenz: gleiche Dichte über alle Ebenen, Untergrund eher ruhiger.');
const verhaeltnis = dBg / dFig;
if (verhaeltnis > 1.15 || verhaeltnis < 0.5) {
  befunde.push(
    `Detaildichte fällt auseinander: Figuren ${dFig.toFixed(2)} gegen Untergrund ${dBg.toFixed(2)} ` +
    `- die Figuren tragen ${(dFig / dBg).toFixed(1)}-mal so viel Feindetail wie der Boden. ` +
    'Drei Bildsprachen auf einem Bild: weich gezeichneter Untergrund, flächig gezeichneter ' +
    'Weg, fotorealistisch gerenderte Figuren. Gemischte Dichten wirken unfertig.',
  );
}

// 4. Reines Schwarz
const mitSchwarz = figuren.filter((f) => f.schwarzAnteil > 0.02);
console.log(`\n4. Reines Schwarz: ${mitSchwarz.length} von ${figuren.length} Figuren über 2 % Fläche`);
console.log('   Referenz: kein reines Schwarz, Farben leicht ins Graue gedämpft.');
if (mitSchwarz.length) {
  befunde.push(
    `Reines Schwarz in ${mitSchwarz.length} Figuren ` +
    `(${mitSchwarz.slice(0, 3).map((f) => `${f.id} ${(f.schwarzAnteil * 100).toFixed(0)} %`).join(', ')}). ` +
    'Es frisst Löcher in die Form statt sie zu begrenzen.',
  );
}

// 5. Wertspanne der Figuren gegen den Untergrund
const lBg = mittel(bgWerte, (f) => f.helligkeit);
const eng = figuren.filter((f) => Math.abs(f.helligkeit - lBg) < 0.1);
console.log(`\n5. Werthierarchie: Untergrund ${lBg.toFixed(2)}, ${eng.length} Figuren liegen weniger als 0,10 davon entfernt`);
console.log('   Referenz: was zuerst gelesen wird, hat den höchsten Helligkeitskontrast.');
if (eng.length > figuren.length * 0.4) {
  befunde.push(
    `${eng.length} von ${figuren.length} Figuren liegen im selben Helligkeitsband wie der ` +
    'Untergrund. Sie werden nur durch ihren Saum sichtbar, nicht durch ihre Form.',
  );
}

console.log(`\n─── ${befunde.length} Befund(e) ───\n`);
for (const b of befunde) console.log(`  • ${b}\n`);
if (!befunde.length) console.log('  Keine. Alle Prinzipien erfüllt.\n');
