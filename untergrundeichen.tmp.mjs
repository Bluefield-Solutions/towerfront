/* Der Untergrund: 3 Bilder, 2400 x 1350, heute Guete 55.
 *
 * Das Feld ist 1920 x 1080 Weltpunkte gross, und genau darauf wird das Bild
 * gebacken. 2400 ist also 1,25-fach ueberabgetastet. Gemessen wird der
 * Abstand in der Groesse, in der es WIRKLICH gezeichnet wird - und dazu
 * zuerst eine Eichung, damit die Zahl etwas bedeutet.
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const roh = readFileSync('/home/user/towerfront/src/gfx/assets/backgrounds.ts', 'utf8');
const satz = [...roh.matchAll(/'([a-z_0-9]+)':\s*'data:image\/webp;base64,([A-Za-z0-9+/=]+)'/g)]
  .map((m) => ({ name: m[1], puffer: Buffer.from(m[2], 'base64') }));

const ANZEIGE_W = 1920, ANZEIGE_H = 1080;

async function abstand(a, b) {
  const A = await sharp(a).resize(ANZEIGE_W, ANZEIGE_H, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  const B = await sharp(b).resize(ANZEIGE_W, ANZEIGE_H, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  let summe = 0;
  for (let i = 0; i < A.length; i += 4) {
    summe += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
  }
  return summe / (A.length / 4);
}

// **Eichung, damit die Zahl etwas heisst** (Regel 12).
//
// Ohne Bezug ist ein Abstand von 25 weder gut noch schlecht. Zwei Anker:
// oben das Bild gegen sich selbst, nur neu verpackt - das ist die Schwelle,
// unterhalb derer nichts passiert ist. Unten dasselbe Bild bei Guete 20 -
// ein Wert, bei dem WebP sichtbar zerfaellt.
{
  const b = satz[0].puffer;
  const gleich = await sharp(b).webp({ quality: 55, effort: 4 }).toBuffer();
  const kaputt = await sharp(b).webp({ quality: 20, effort: 4 }).toBuffer();
  console.log(`Eichung an "${satz[0].name}":`);
  console.log(`  nur neu verpackt (Guete 55): Abstand ${(await abstand(b, gleich)).toFixed(2)}`);
  console.log(`  sichtbar kaputt  (Guete 20): Abstand ${(await abstand(b, kaputt)).toFixed(2)}`);
}

const heute = satz.reduce((n, b) => n + b.puffer.length, 0);
console.log(`\n=== untergrund - ${satz.length} Bilder, heute ${(heute / 1024).toFixed(0)} KB roh ===`);
console.log('Breite  Guete     KB    gespart   Abstand bei 1920x1080');
for (const breite of [2400, 1920, 1600]) {
  for (const guete of [55, 48, 42]) {
    if (breite === 2400 && guete === 55) continue;
    const hoehe = Math.round(breite * 1350 / 2400);
    let byte = 0, summe = 0;
    for (const b of satz) {
      const neu = await sharp(b.puffer).resize(breite, hoehe, { fit: 'fill' })
        .webp({ quality: guete, effort: 4 }).toBuffer();
      byte += neu.length;
      summe += await abstand(b.puffer, neu);
    }
    console.log(`  ${String(breite).padStart(4)}     ${guete}   ${(byte / 1024).toFixed(0).padStart(5)}`
      + `   ${(100 - byte / heute * 100).toFixed(0).padStart(4)} %      ${(summe / satz.length).toFixed(2)}`);
  }
}
