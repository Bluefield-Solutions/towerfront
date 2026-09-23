// Aus src/symbol/symbol.svg die PNG backen, die iOS und das Manifest brauchen.
//
// In Chromium, nicht mit einer Bibliothek: der Browser ist derselbe, der die
// Datei spaeter anzeigt. Was hier herauskommt, ist genau das, was auf dem
// Startbildschirm steht.
import fs from 'node:fs';
import path from 'node:path';
import { starte } from '../tor/chromium.mjs';

const QUELLE = path.join(process.cwd(), 'src/symbol/symbol.svg');
const AUS = path.join(process.cwd(), 'src/symbol');
const svg = fs.readFileSync(QUELLE, 'utf8');

// 180: apple-touch-icon, die Groesse, die iOS fuer den Startbildschirm nimmt.
// 192/512: Web-App-Manifest. 1024: Vorrat, falls einmal ein Store dazukommt.
const GROESSEN = [180, 192, 512, 1024];

const b = await starte();
const p = await b.newPage({ viewport:{ width:1024, height:1024 }, deviceScaleFactor:1 });
for (const g of GROESSEN) {
  await p.setViewportSize({ width:g, height:g });
  await p.setContent(`<style>html,body{margin:0;padding:0;background:none}
    svg{display:block;width:${g}px;height:${g}px}</style>${svg}`);
  const bild = await p.screenshot({ omitBackground:false, animations:'disabled' });
  fs.writeFileSync(path.join(AUS, `symbol-${g}.png`), bild);
  console.log(`  symbol-${g}.png  ${(bild.length/1024).toFixed(1)} KB`);
}
await b.close();
