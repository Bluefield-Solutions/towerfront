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

// Die UI greift Elemente ueber feste IDs. Fehlt eine, faellt das erst zur
// Laufzeit auf - hier faellt es beim Build auf.
const REQUIRED_IDS = [
  'view', 'v-gold', 'v-lives', 'v-wave', 'b-sound', 'b-speed', 'b-pause',
  'b-wave', 'b-wave-t', 'b-wave-b', 'next', 'n-list', 'build',
  'inspector', 'i-name', 'i-stats', 'i-up', 'i-sell', 'i-close',
  'screen', 's-eyebrow', 's-title', 's-text', 's-best', 's-action',
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
