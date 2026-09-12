// Tore `pwa` und `offline`.
//
// Die App soll ueber Safari auf den Startbildschirm gelegt werden und von
// dort starten - ohne Adressleiste, ohne Netz, und trotzdem immer aktuell.
// Das sind drei Zusagen, die man ansehen kann und die niemand ansieht:
// ein fehlendes Symbol faellt erst auf dem iPad auf, ein kaputter Service
// Worker erst im Zug.
//
// Regel 13 gilt auch hier: die Offline-Pruefung ist erst dann eine, wenn
// sie OHNE Service Worker durchfaellt. Genau das steht unten als
// Gegenprobe - sie laeuft bei jedem Lauf mit.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { starte } from './chromium.mjs';

const DIST = path.join(process.cwd(), 'dist');
const fehler = [];
const pruefe = (b, satz) => { if (!b) fehler.push(satz); };

/* ========================================================= Tor `pwa` ==== */
console.log('\n  Tor `pwa`');

const manifestPfad = path.join(DIST, 'manifest.webmanifest');
pruefe(fs.existsSync(manifestPfad), 'dist/manifest.webmanifest fehlt');
let manifest = null;
if (fs.existsSync(manifestPfad)) {
  try { manifest = JSON.parse(fs.readFileSync(manifestPfad, 'utf8')); }
  catch (e) { pruefe(false, `manifest.webmanifest ist kein gültiges JSON: ${e.message}`); }
}
if (manifest) {
  for (const feld of ['name', 'short_name', 'start_url', 'scope', 'display',
                      'background_color', 'theme_color', 'icons', 'lang'])
    pruefe(manifest[feld] !== undefined, `manifest: ${feld} fehlt`);
  pruefe(manifest.display === 'standalone',
    `manifest: display ist "${manifest.display}" — nur "standalone" startet ohne Adressleiste`);
  // Farben muessen HEX sein. oklch() im Manifest verstehen nicht alle
  // Systeme, und dann steht beim Start ein weisser Blitz vor dem Spiel.
  for (const feld of ['background_color', 'theme_color'])
    pruefe(/^#[0-9a-f]{6}$/i.test(manifest[feld] || ''),
      `manifest: ${feld} ist "${manifest[feld]}" — als Hex angeben, nicht als oklch()`);
  // Jedes genannte Symbol muss da sein UND die genannte Groesse haben.
  for (const s of manifest.icons || []) {
    const f = path.join(DIST, s.src.replace(/^\.\//, ''));
    if (!fs.existsSync(f)) { pruefe(false, `manifest nennt ${s.src}, die Datei fehlt`); continue; }
    const kopf = fs.readFileSync(f).subarray(16, 24);
    const breite = kopf.readUInt32BE(0), hoehe = kopf.readUInt32BE(4);
    pruefe(`${breite}x${hoehe}` === s.sizes,
      `${s.src} ist ${breite}×${hoehe}, das Manifest sagt ${s.sizes}`);
  }
  pruefe((manifest.icons || []).some(s => s.purpose === 'maskable'),
    'manifest: kein maskierbares Symbol — Android schneidet dann die Ecken vom normalen ab');
  console.log(`    Manifest: ${(manifest.icons||[]).length} Symbole, alle vorhanden `
    + `und in der genannten Größe`);
}

const seite = fs.existsSync(path.join(DIST, 'index.html'))
  ? fs.readFileSync(path.join(DIST, 'index.html'), 'utf8') : '';
pruefe(/rel="manifest"/.test(seite), 'index.html verweist nicht auf das Manifest');
pruefe(/rel="apple-touch-icon"/.test(seite),
  'index.html hat kein apple-touch-icon — iOS nimmt sonst ein Bildschirmfoto als Symbol');
pruefe(/apple-mobile-web-app-capable/.test(seite),
  'index.html fehlt apple-mobile-web-app-capable — dann bleibt die Adressleiste stehen');
pruefe(/serviceWorker/.test(seite), 'index.html meldet keinen Service Worker an');
pruefe(!/fonts\.(googleapis|gstatic)\.com/.test(seite),
  'index.html laedt noch Schrift von Google — offline gibt es dann keine, '
  + 'und eine Kinder-App soll bei niemandem anklopfen');

const sw = fs.existsSync(path.join(DIST, 'sw.js'))
  ? fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8') : '';
pruefe(sw.length > 0, 'dist/sw.js fehlt');
pruefe(!/__FASSUNG__|__VORRAT__/.test(sw),
  'sw.js enthält noch Platzhalter — der Bau hat sie nicht ersetzt');
const vorrat = (sw.match(/const VORRAT = (\[[\s\S]*?\]);/) || [])[1];
if (vorrat) {
  const liste = JSON.parse(vorrat);
  for (const eintrag of liste) {
    if (eintrag === './') continue;
    pruefe(fs.existsSync(path.join(DIST, eintrag.replace(/^\.\//, ''))),
      `sw.js will ${eintrag} ins Lager legen, die Datei gibt es nicht — `
      + `dann schlägt addAll fehl und der Service Worker installiert sich NIE`);
  }
  console.log(`    Service Worker: ${liste.length} Dateien im Vorrat, alle vorhanden`);
} else pruefe(false, 'sw.js: VORRAT nicht gefunden');

/* ===================================================== Tor `offline` ==== */
console.log('\n  Tor `offline`');

const server = http.createServer((q, a) => {
  const f = path.join(DIST, q.url === '/' ? '/index.html' : q.url.split('?')[0]);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    a.statusCode = 404; return a.end();
  }
  const typ = f.endsWith('.html') ? 'text/html; charset=utf-8'
    : f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript'
    : f.endsWith('.png') ? 'image/png' : f.endsWith('.woff2') ? 'font/woff2'
    : f.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/plain';
  a.setHeader('content-type', typ);
  a.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const ADRESSE = `http://127.0.0.1:${server.address().port}/`;

const b = await starte();

/** Startet die App und sagt, ob wirklich etwas Spielbares dasteht. */
async function laeuft(ctx) {
  const p = await ctx.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  try {
    await p.goto(ADRESSE, { waitUntil: 'domcontentloaded', timeout: 8000 });
    await p.waitForSelector('[data-profil="fiona"]', { timeout: 8000 });
    // Nicht nur "die Seite kam" - auch die Schrift muss da sein, sonst
    // stuende das Kind vor einer App in Times New Roman.
    const schrift = await p.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([document.fonts.load('700 20px "Plus Jakarta Sans"'),
                         document.fonts.load('400 20px "Andika"')]);
      return document.fonts.check('700 20px "Plus Jakarta Sans"')
          && document.fonts.check('400 20px "Andika"');
    });
    await p.close();
    return { da: true, schrift };
  } catch (e) { await p.close(); return { da: false, grund: e.message.slice(0, 90) }; }
}

/* --- Der eigentliche Beweis ------------------------------------------- */
const ctx = await b.newContext({ hasTouch: true, isMobile: true, locale: 'de-DE' });
const p = await ctx.newPage({ viewport: { width: 844, height: 390 } });
await p.goto(ADRESSE, { waitUntil: 'load' });
const bereit = await p.evaluate(() => navigator.serviceWorker.ready
  .then(r => !!r.active).catch(() => false));
pruefe(bereit, 'der Service Worker wurde nicht aktiv');
// Zweiter Besuch, damit die Seite selbst im Lager liegt.
await p.goto(ADRESSE, { waitUntil: 'load' });
await p.close();

await ctx.setOffline(true);
const ohneNetz = await laeuft(ctx);
pruefe(ohneNetz.da, `ohne Netz startet die App nicht: ${ohneNetz.grund || ''}`);
pruefe(ohneNetz.schrift, 'ohne Netz fehlt die Schrift — sie liegt nicht im Lager');
await ctx.setOffline(false);
console.log(`    Mit Lager, ohne Netz: ${ohneNetz.da ? 'startet' : 'STARTET NICHT'}`
  + `, Schrift ${ohneNetz.schrift ? 'da' : 'FEHLT'}`);

/* --- Gegenprobe: OHNE Service Worker muss dasselbe scheitern ---------- */
//
// Ohne sie misst die Pruefung oben vielleicht nur den Browser-Cache, und
// waere gruen, ohne je etwas bewiesen zu haben (Regel 13).
const ohne = await b.newContext({ hasTouch: true, isMobile: true, locale: 'de-DE',
  serviceWorkers: 'block' });
const p2 = await ohne.newPage({ viewport: { width: 844, height: 390 } });
await p2.goto(ADRESSE, { waitUntil: 'load' });
await p2.close();
await ohne.setOffline(true);
const ohneSw = await laeuft(ohne);
pruefe(!ohneSw.da,
  'ohne Service Worker startet die App AUCH ohne Netz — dann misst das Tor '
  + 'den Browser-Cache und nicht den Service Worker');
console.log(`    Gegenprobe ohne Service Worker: ${ohneSw.da ? 'startet TROTZDEM' : 'startet nicht'}`
  + ` — die Pruefung oben misst wirklich das Lager`);
await ohne.close(); await ctx.close(); await b.close(); server.close();

if (fehler.length) {
  console.log(`\n  ${fehler.length} FEHLER:`);
  fehler.forEach(f => console.log('    ✗ ' + f));
  process.exit(1);
}
console.log('\n  PWA grün: Manifest stimmt, Symbole da, ohne Netz startet sie.');
