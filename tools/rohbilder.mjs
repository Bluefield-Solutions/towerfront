#!/usr/bin/env node
/**
 * Rohbilder — was fehlt, damit `npm run pack-art` etwas zu tun hat.
 *
 * Warum es das gibt: `art/roh/` liegt nicht in Git (79 MB gegen 1,2 MB
 * gepackt), und ohne die Rohbilder sind drei der groessten offenen Punkte
 * nicht zu bewegen — B1 (Figurendichte), D21 (Infanterie) und die vierte
 * Karte aus C24. Wer sie beschaffen soll, braucht keine Prosa, sondern eine
 * Liste: welche Datei, wohin, wie gross.
 *
 * Diese Liste steht bewusst NICHT in einem Dokument. Ein Dokument haette
 * nach der ersten Aenderung an `art/*.json` gelogen, und niemand haette es
 * gemerkt — genau die Familie, die in diesem Verzeichnis vier Runden lang
 * eine veraltete Zahl weitergetragen hat (S124). Gelesen werden die
 * Beschreibungen selbst.
 *
 * Aufruf: npm run rohbilder
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'art');

const gruppen = readdirSync(ART).filter((f) => f.endsWith('.json')).sort();

console.log('ROHBILDER\n');
console.log('`art/roh/` liegt nicht in Git. Zum Bauen und Spielen wird nichts davon');
console.log('gebraucht — gepackt liegt alles in src/gfx/assets/. Gebraucht wird es nur,');
console.log('wer ein Bild ERSETZEN oder ein neues aufnehmen will.\n');

let fehlt = 0, da = 0;

for (const datei of gruppen) {
  const spec = JSON.parse(readFileSync(join(ART, datei), 'utf8'));
  const quelle = join(ROOT, 'art', spec.source.replace(/^roh\//, 'roh/'));
  const items = spec.items ?? {};
  const eintraege = Object.entries(items);
  if (!eintraege.length) continue;

  const d = spec.defaults ?? {};
  const mass = d.width && d.height
    ? `${d.width} x ${d.height}`
    : d.size ? `${d.size} x ${d.size} (quadratisch)` : 'siehe Beschreibung';

  console.log(`── ${datei.replace('.json', '')}  →  art/${spec.source}/`);
  console.log(`   Zielmass ${mass}, PNG mit Alpha, Budget ${spec.budgetKb} KB gepackt.`);
  if (d.fill) {
    console.log(`   Fuellgrad ${d.fill}: so viel der Kachel soll die Figur wirklich ausfuellen.`);
  }
  if (spec.comment) {
    console.log(`   ${spec.comment.split('.')[0]}.`);
  }

  for (const [key, e] of eintraege) {
    const name = typeof e === 'string' ? e : e.file;
    const pfad = join(quelle, name);
    const vorhanden = existsSync(pfad);
    if (vorhanden) da++; else fehlt++;
    const hinweis = typeof e === 'object' && e.comment ? `  — ${e.comment.split('.')[0]}.` : '';
    console.log(`     ${vorhanden ? '[da]  ' : '[FEHLT]'} ${name.padEnd(30)} (${key})${hinweis}`);
  }
  console.log('');
}

console.log(`${da} vorhanden, ${fehlt} fehlen.\n`);

if (fehlt) {
  console.log('Wenn die Bilder liegen:');
  console.log('  1. npx tsx tools/pack-art.mjs      packt sie nach src/gfx/assets/');
  console.log('  2. npm run gate                    Torkette, darunter das Grafiktor');
  console.log('  3. das ERGEBNIS einchecken, nicht die Rohbilder.\n');
  console.log('Woran es haengt, wenn sie fehlen:');
  console.log('  B1   Figuren tragen 6,0-mal so viel Feindetail wie der Boden (erlaubt 3,0).');
  console.log('       Filtern hilft nicht - `npm run entrauschprobe` zeigt, dass dabei die');
  console.log('       Form verlorengeht. Es braucht ruhiger gezeichnete Figuren.');
  console.log('  D21  Die Infanterie fuellt ihre Kachel nur zu 0,22 statt 0,35 und bleibt');
  console.log('       deshalb als einzige bei 17 px.');
  console.log('  C24  Die vierte Karte braucht ein Untergrundbild; ohne eines faellt sie');
  console.log('       auf den gemalten Untergrund zurueck und stuende neben den drei');
  console.log('       fotografierten.');
}
