// Rauchtest. Spielt den Prototyp wirklich - und prueft, was M3 bis M6
// zugesagt haben: dass der Fortschritt einen Neustart ueberlebt, dass das
// Forscherbuch fuellt, dass der Elternbereich Zahlen zeigt.
import { starte } from './chromium.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// IndexedDB braucht eine echte Herkunft. Unter file:// ist sie undurchsichtig,
// und die Ablage faellt still auf nichts zurueck - genau der Fall, den das
// Tor sonst uebersehen wuerde. Also ein winziger Server.
const wurzel = process.cwd();
const server = http.createServer((q, a) => {
  const f = path.join(wurzel, q.url === '/' ? '/prototyp/spiel.html' : q.url);
  if (!f.startsWith(wurzel) || !fs.existsSync(f)) { a.statusCode = 404; return a.end(); }
  a.setHeader('content-type', f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain');
  a.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const ADRESSE = `http://127.0.0.1:${server.address().port}/prototyp/spiel.html`;

const b = await starte();
const fehler = [];
const merke = (was, e) => fehler.push(`${was}: ${e.message || e}`);

async function neueSeite(viewport, ctx) {
  const p = await ctx.newPage({ viewport, deviceScaleFactor: 2 });
  p.on('pageerror', e => fehler.push(`Seitenfehler: ${String(e).slice(0, 140)}`));
  await p.goto(ADRESSE, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => document.fonts.ready);
  return p;
}

/** Eine Aufgabe loesen: das passende Etikett auf den Anker des Ziels ziehen. */
async function loese(p) {
  // Warten, bis der Bildschirmwechsel wirklich durch ist - sonst greift der
  // Test in die alte Aufgabe.
  await p.waitForFunction(() => document.querySelectorAll('.schirm').length === 1
    && document.querySelector('.schirm.da path.ziel'), null, { timeout: 5000 });
  const info = await p.evaluate(() => {
    const s = document.querySelector('.schirm.da');
    const ziel = s.querySelector('path.ziel'); if (!ziel) return null;
    const D = JSON.parse(document.getElementById('daten').textContent);
    const id = ziel.dataset.id;
    const b = D.deutschland.find(x => x.id === id);
    const svg = s.querySelector('.karte svg');
    const pt = svg.createSVGPoint(); pt.x = b.anker[0]; pt.y = b.anker[1];
    const q = pt.matrixTransform(svg.getScreenCTM());
    const namen = [...s.querySelectorAll('.etikett')].map(e => e.textContent);
    return { id, name: b.name, x: q.x, y: q.y, idx: namen.indexOf(b.name), namen };
  });
  if (!info) throw new Error('kein Ziel gefunden');
  if (info.idx < 0) throw new Error(`Etikett "${info.name}" fehlt unter ${info.namen.join(', ')}`);
  const et = (await p.$$('.schirm.da .etikett'))[info.idx];
  const a = await et.boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await p.mouse.down();
  await p.mouse.move(info.x, info.y, { steps: 10 });
  await p.mouse.up();
  await p.waitForFunction(() => /Richtig/.test(document.querySelector('.schirm.da .frage')?.textContent || ''),
    null, { timeout: 4000 });
  return info.name;
}

/* --- Durchgang 1: spielen und ablegen --------------------------------- */
const ctx = await b.newContext({ hasTouch: true, isMobile: true, locale: 'de-DE' });
let geloest = [];
try {
  const p = await neueSeite({ width: 844, height: 390 }, ctx);
  await p.click('[data-profil="fiona"]');
  await p.waitForSelector('.schirm.da [data-ebene]');
  await p.click('[data-ebene="bundeslaender"]');
  await p.waitForSelector('.schirm.da .karte svg');
  // ZWEI Sitzungen. Ein Aufkleber braucht Fach 3, also zweimal richtig -
  // mit einer Sitzung waere das Forscherbuch immer leer, und das Tor
  // koennte den Aufkleber nie sehen.
  for (let runde = 0; runde < 2; runde++) {
    for (let n = 0; n < 6; n++) {
      if (!(await p.$('.schirm.da .karte svg'))) break;
      geloest.push(await loese(p));
      await p.waitForTimeout(1800);
    }
    const nochmal = await p.$('.schirm.da #nochmal');
    if (nochmal) { await nochmal.click(); await p.waitForSelector('.schirm.da .karte svg'); }
  }
  await p.screenshot({ path: '/tmp/smoke-spiel.png' });
  await p.close();
} catch (e) { merke('spielen', e); }

/* --- Durchgang 2: NEUE Seite, gleiche Herkunft. Traegt die Ablage? ---- */
let fortschritt = null;
try {
  const p = await neueSeite({ width: 1180, height: 820 }, ctx);
  await p.click('[data-profil="fiona"]');
  await p.waitForSelector('.schirm.da [data-ebene="bundeslaender"]');
  fortschritt = await p.$eval('[data-ebene="bundeslaender"] .rolle', e => e.textContent.trim());
  // Der Beweis ist die ABLAGE, nicht der Text. Ein Regex auf "0 von 16"
  // trifft die 16 und meldet gruen - genau das ist beim ersten Lauf passiert.
  const abgelegt = await p.evaluate(() => new Promise(ja => {
    const a = indexedDB.open('lernkiste');
    a.onsuccess = () => { const d = a.result;
      const t = d.transaction('fortschritt', 'readonly');
      const g = t.objectStore('fortschritt').get('fiona:bundeslaender');
      g.onsuccess = () => ja(g.result ? Object.keys(g.result).length : 0);
      g.onerror = () => ja(-1); };
    a.onerror = () => ja(-1);
  }));
  console.log(`  In der Ablage:              ${abgelegt} Gegenstände im Leitner-Stand`);
  if (abgelegt < 3) merke('ablage', new Error(`nur ${abgelegt} Gegenstände abgelegt, erwartet mindestens 3`));
  // Forscherbuch
  await p.click('#buch');
  await p.waitForSelector('.schirm.da .aufkleber');
  const kleber = await p.$$eval('.schirm.da .aufkleber.da', e => e.length);
  if (kleber < 1) merke('forscherbuch', new Error('kein einziger Aufkleber nach zwei Sitzungen'));
  const alleKleber = await p.$$eval('.schirm.da .aufkleber', e => e.length);
  await p.screenshot({ path: '/tmp/smoke-buch.png' });
  // Elternbereich
  await p.click('#zur'); await p.waitForSelector('.schirm.da #eltern');
  await p.click('#eltern'); await p.waitForSelector('.schirm.da .ziffern');
  for (let i = 0; i < 4; i++) await p.click('.schirm.da [data-z="0"]');
  await p.waitForSelector('.schirm.da .kacheln', { timeout: 4000 });
  const antworten = await p.$eval('.schirm.da .wert b', e => e.textContent);
  // Gezielt die Fassungstabelle, nicht irgendeine - die erste ist die
  // Wackelkandidatenliste, und der Bericht meldete "Niedersachsen · 2".
  const fassung = await p.evaluate(() => {
    const h = [...document.querySelectorAll('.schirm.da .gruppe')].find(x => /Diese Fassung/.test(x.textContent));
    const t = h && h.nextElementSibling;
    return t ? [...t.querySelectorAll('tr')].map(r => [...r.cells].map(c => c.textContent).join(': ')) : [];
  });
  await p.screenshot({ path: '/tmp/smoke-eltern.png', fullPage: true });
  console.log(`  Fortschritt nach Neustart:  ${fortschritt}`);
  console.log(`  Forscherbuch:               ${kleber} von ${alleKleber} Aufklebern`);
  console.log(`  Elternbereich:              ${antworten} Antworten protokolliert`);
  console.log(`  Fassungsstempel:            ${fassung.join(' · ')}`);

  if (+antworten < 3) merke('protokoll', new Error(`nur ${antworten} Einträge`));
  await p.close();
} catch (e) { merke('ablage/eltern', e); }

/* --- Durchgang 3: Hochformat, Lea tippt ------------------------------- */
try {
  const p = await neueSeite({ width: 390, height: 844 }, ctx);
  await p.click('[data-profil="lea"]');
  await p.waitForSelector('.schirm.da [data-ebene]');
  await p.click('[data-ebene="bundeslaender"]');
  await p.waitForSelector('.schirm.da .eingabe');
  const name = await p.evaluate(() => {
    const id = document.querySelector('.schirm.da path.ziel').dataset.id;
    const D = JSON.parse(document.getElementById('daten').textContent);
    return D.deutschland.find(x => x.id === id).name;
  });
  await p.fill('.schirm.da .eingabe', name.toLowerCase());
  await p.click('.schirm.da .knopf:has-text("Prüfen")');
  await p.waitForFunction(() => /groß/.test(document.querySelector('.schirm.da .frage')?.textContent || ''),
    null, { timeout: 4000 });
  console.log(`  Rechtschreibhinweis:        „${name.toLowerCase()}" → Großschreibung gemeldet`);
  await p.close();
} catch (e) { merke('tippen', e); }

await ctx.close(); await b.close(); server.close();

console.log(`  Gelöst im ersten Durchgang: ${geloest.join(', ')}`);
if (fehler.length) { console.log(`\n  ${fehler.length} FEHLER:`); fehler.forEach(f => console.log('    ✗ ' + f)); process.exit(1); }
console.log('\n  Rauchtest grün: gespielt, abgelegt, Neustart überstanden, Buch gefüllt, Eltern gelesen, getippt.');
