// Autarkie-Check: Die gebaute HTML-Datei muss ohne Netz laufen.
// Findet externe URLs, uebrig gebliebene <script src>/<link href> und Restfehler.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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

// Fehlende Umlaute im sichtbaren Text.
//
// Bis v21 stand im Spiel "Moerser", "Flaeche" und "Erste Fuehler" - weil die
// Inhaltsdateien in ASCII geschrieben sind und ich die Ersatzschreibung nicht
// von den Kommentaren getrennt habe. Im Bild sieht das nach Nachlaessigkeit
// aus, und genau das war es auch.
{
  const suspicious = [
    'Moerser', 'Flaeche', 'Fuehler', 'Schwaermer', 'Tuerme', 'Faehigkeit',
    'zaehlt', 'naechste', 'Ueberspringen', 'Bauplaetze', 'Erloes', 'Waechter',
    'Spruenge', 'Buendelung', 'Scharfschuetze', 'ueber ', 'fuer ', 'koennen',
  ];
  const found = suspicious.filter((w) => html.includes(w));
  if (found.length) {
    problems.push(
      `Ersatzschreibung statt Umlaut im ausgelieferten Text: ${found.join(', ')}`,
    );
  }
}

// Die UI greift Elemente ueber feste IDs. Fehlt eine, faellt das erst zur
// Laufzeit auf - hier faellt es beim Build auf.
const REQUIRED_IDS = [
  'view', 'v-gold', 'v-lives', 'v-wave', 'b-sound', 'b-speed', 'b-pause',
  'b-wave', 'b-wave-t', 'b-wave-b', 'next', 'n-list', 'build',
  'skills', 'inspector', 'i-name', 'i-stats', 'i-hint', 'i-ups', 'i-sell', 'i-close',
  'screen', 's-eyebrow', 's-title', 's-text', 's-best', 's-stats', 's-grades', 's-maps', 's-mode', 's-perks', 's-action', 'dock-toggle', 'dock-body',
  'v-main', 'v-choose', 'v-progress', 's-choice', 's-open-progress',
  's-resume', 's-perf', 's-tut', 'perf', 'coach', 'coach-text', 'coach-skip',
];
for (const id of REQUIRED_IDS) {
  if (!new RegExp(`id=["']${id}["']`).test(html)) problems.push(`Element mit id="${id}" fehlt im HTML.`);
}

// Groessenbudget.
//
// Jedes Bild wird als Datenadresse in die eine Datei geschrieben und wird
// dabei ein Drittel groesser. Ohne Obergrenze waechst sie mit jedem weiteren
// Bild unbemerkt.
//
// **Die Zahl ist jetzt gemessen, vorher war sie geraten** (Regel 12). Von v77
// bis v186 standen hier 1600 KB mit der Begruendung "bis der erste
// Ladevorgang auf dem Handy stoert" - und dahinter lag keine einzige
// Messung. Nachgemessen an der gebauten Datei (1506 KB, Chromium, lokal,
// also ohne Uebertragung): 386 ms bis zum `load`-Ereignis, 624 ms bis zum
// ersten gezeichneten Bild. Die Uebertragung kommt dazu und rechnet sich aus
// der Groesse: bei 20 Mbit/s 588 ms, bei 5 Mbit/s 2353 ms, bei 1,5 Mbit/s
// 7844 ms.
//
// Der Sprung auf 1800 KB kostet davon bei 5 Mbit/s rund 380 ms - einmalig,
// danach liegt die Datei im Zwischenspeicher. Dafuer passen die bestellten
// Bildsaetze hinein. Die Rechnung steht in docs/Towerfront-GROESSENHAUSHALT.md.
//
// Was diese Grenze NICHT ist: eine Aussage ueber den Arbeitsspeicher. Der
// wird von `npm run speichertor` gemessen und liegt bei 36 MB - auf einem
// Telefon unauffaellig.
const SIZE_BUDGET_KB = 1800;
const sizeKb = statSync(file).size / 1024;
if (sizeKb > SIZE_BUDGET_KB) {
  problems.push(
    `Die Datei ist ${sizeKb.toFixed(0)} KB gross - Obergrenze ${SIZE_BUDGET_KB} KB.`,
  );
}

// **Und die Gruppenbudgets muessen zu dieser Obergrenze passen.**
//
// Bis v185 gab es ZWEI Haushalte, die einander widersprachen. In `art/*.json`
// steht je Gruppe ein `budgetKb`, und `pack-art` schlaegt an, wenn eine
// Gruppe darueber liegt. Ihre Summe war 2160 KB roh - eingebettet rund
// 2880 - bei einer Datei, die 1600 darf. Jede Gruppe konnte also grün
// melden, waehrend die Datei laengst zu gross war; gebunden hat nur die
// Zahl hier, und die sah niemand beim Packen.
//
// Der Rest wird nicht geschaetzt, sondern an der gebauten Datei GEMESSEN
// (Regel 12): alles, was nicht WebP-Bildvorrat ist - Code, HTML, das
// Startbildschirm-Symbol und die zehn Startbilder als PNG. Waechst der Code,
// schrumpft der erlaubte Bildvorrat von selbst.
{
  const webp = [...html.matchAll(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g)];
  const vorratKb = webp.reduce((n, m) => n + m[0].length, 0) / 1024;
  const restKb = sizeKb - vorratKb;
  // Datenadresse: vier Zeichen je drei Byte, dazu der kurze Kopf je Eintrag.
  const AUFSCHLAG = 4 / 3;
  const erlaubtRohKb = (SIZE_BUDGET_KB - restKb) / AUFSCHLAG;

  let summeKb = 0;
  const gruppen = [];
  const artDir = 'art';
  if (existsSync(artDir)) {
    for (const name of readdirSync(artDir).filter((f) => f.endsWith('.json'))) {
      try {
        const spec = JSON.parse(readFileSync(join(artDir, name), 'utf8'));
        if (typeof spec.budgetKb !== 'number') continue;
        summeKb += spec.budgetKb;
        gruppen.push(`${name.replace('.json', '')} ${spec.budgetKb}`);
      } catch { /* eine unlesbare Vorschrift meldet der Packer selbst */ }
    }
  }
  if (gruppen.length && summeKb > erlaubtRohKb) {
    problems.push(
      `Die Gruppenbudgets summieren sich auf ${summeKb.toFixed(0)} KB roh `
      + `(${gruppen.join(', ')}), erlaubt sind ${erlaubtRohKb.toFixed(0)} KB - `
      + `die Datei darf ${SIZE_BUDGET_KB} KB, davon sind ${restKb.toFixed(0)} KB `
      + 'Code, HTML und Startbilder. Zwei Haushalte, die einander widersprechen: '
      + 'jede Gruppe kann gruen melden, waehrend die Datei zu gross wird.',
    );
  }
}

const kb = (statSync(file).size / 1024).toFixed(0);

if (problems.length) {
  console.error(`AUTARKIE-CHECK: ${problems.length} Problem(e) in ${file}`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`AUTARKIE-CHECK: 0 Probleme. ${file} (${kb} KB) ist eigenstaendig lauffaehig.`);
