// Autarkie-Check: Die gebaute HTML-Datei muss ohne Netz laufen.
// Findet externe URLs, uebrig gebliebene <script src>/<link href> und Restfehler.
import { readFileSync, existsSync, statSync } from 'node:fs';

const file = process.argv[2] ?? 'dist/index.html';
if (!existsSync(file)) {
  console.error(`FEHLER: ${file} existiert nicht. Erst "npm run build".`);
  process.exit(1);
}
const html = readFileSync(file, 'utf8');
const problems = [];

const externals = html.match(/(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+["']/gi) ?? [];
for (const e of externals) problems.push(`Externe Referenz: ${e.slice(0, 90)}`);

const scriptSrc = html.match(/<script[^>]+\bsrc\s*=/gi) ?? [];
for (const s of scriptSrc) problems.push(`Nicht inlinter Script-Tag: ${s.slice(0, 60)}`);

const linkCss = html.match(/<link[^>]+rel\s*=\s*["']stylesheet["'][^>]*>/gi) ?? [];
for (const l of linkCss) problems.push(`Nicht inlintes Stylesheet: ${l.slice(0, 60)}`);

// Safari-Falle: selbstreferenzierendes Canvas-Bloom fuehrt zu Blackscreen auf iOS.
if (/drawImage\(\s*(this\.)?canvas/.test(html) && /filter\s*=\s*["'`]blur/.test(html)) {
  problems.push('Safari-Falle: drawImage(canvas) zusammen mit filter=blur gefunden.');
}

// Versteckte Ebenen muessen wirklich verschwinden.
//
// Das hidden-Attribut setzt display:none nur ueber die Standardregeln des
// Browsers. Eine eigene Regel wie ".screen { display: grid }" schlaegt sie -
// die Ebene bleibt sichtbar, liegt ueber dem Spielfeld und faengt jeden Tipp
// ab. Von aussen sieht das aus, als reagiere kein einziger Knopf mehr. Genau
// dieser Fehler steckte bis v8 im Spiel und machte es auf dem Handy
// unbedienbar.
//
// Der berechnete Stil laesst sich hier nicht befragen: jsdom wertet den
// Vorrang von !important in eigenen Stilvorlagen nicht richtig aus und meldet
// auch dann display:grid, wenn ein Browser display:none berechnet. Geprueft
// wird deshalb die Regel selbst - sie ist die Zusage, auf der alle versteckten
// Ebenen beruhen.
if (!/\[hidden\][^{]*\{[^}]*display\s*:\s*none\s*!important/.test(html)) {
  problems.push(
    'Die Regel [hidden] { display: none !important } fehlt. Ohne sie bleiben ' +
    'versteckte Ebenen sichtbar und fangen jeden Tipp ab.',
  );
}

// Die UI greift Elemente ueber feste IDs. Fehlt eine, faellt das erst zur
// Laufzeit auf - hier faellt es beim Build auf.
const REQUIRED_IDS = [
  'view', 'v-gold', 'v-lives', 'v-wave', 'b-sound', 'b-speed', 'b-pause',
  'b-wave', 'b-wave-t', 'b-wave-b', 'next', 'n-list', 'build',
  'skills', 'inspector', 'i-name', 'i-stats', 'i-hint', 'i-ups', 'i-sell', 'i-close',
  'screen', 's-eyebrow', 's-title', 's-text', 's-best', 's-stats', 's-grades', 's-maps', 's-action',
  's-resume', 's-perf', 's-tut', 'perf', 'coach', 'coach-text', 'coach-skip',
];
for (const id of REQUIRED_IDS) {
  if (!new RegExp(`id=["']${id}["']`).test(html)) problems.push(`Element mit id="${id}" fehlt im HTML.`);
}

const kb = (statSync(file).size / 1024).toFixed(0);

if (problems.length) {
  console.error(`AUTARKIE-CHECK: ${problems.length} Problem(e) in ${file}`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`AUTARKIE-CHECK: 0 Probleme. ${file} (${kb} KB) ist eigenstaendig lauffaehig.`);
