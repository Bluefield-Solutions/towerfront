/* Wieviel Platz ist im Bildvorrat zu holen - und was kostet er an Bild?
 *
 * Regel 9: erst den Raum ansehen, statt einen Wert nachzuziehen. Zwei
 * Stellschrauben, Kachelgroesse und Guete, werden nebeneinandergelegt.
 *
 * Regel 12: gemessen wird der Unterschied NICHT an der Kachel, sondern in
 * ANZEIGEGROESSE. Ein Turm steht auf dem Telefon quer mit rund 76
 * Geraetepunkten im Bild. Ob eine Kachel 256 oder 192 Punkte hat,
 * entscheidet sich dort - an der Kachel selbst sieht man einen Unterschied,
 * den nie jemand zu sehen bekommt.
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const GRUPPEN = [
  { name: 'tuerme', datei: 'towers', anzeige: 76 },
  { name: 'gegner', datei: 'enemies', anzeige: 60 },
  { name: 'objekte', datei: 'objects', anzeige: 132 },
];

function bilder(datei) {
  const roh = readFileSync(`/home/user/towerfront/src/gfx/assets/${datei}.ts`, 'utf8');
  return [...roh.matchAll(/'([a-z_0-9]+)':\s*'data:image\/webp;base64,([A-Za-z0-9+/=]+)'/g)]
    .map((m) => ({ name: m[1], puffer: Buffer.from(m[2], 'base64') }));
}

/** Abstand zwischen zwei Fassungen, gemessen in Anzeigegroesse. */
async function abstand(a, b, n) {
  const A = await sharp(a).resize(n, n, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  const B = await sharp(b).resize(n, n, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  let summe = 0;
  for (let i = 0; i < A.length; i += 4) {
    // Der Alphakanal zaehlt mit: eine weichere Kante ist ein sichtbarer
    // Unterschied, auch wenn die Farben darunter gleich bleiben.
    summe += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1])
      + Math.abs(A[i + 2] - B[i + 2]) + Math.abs(A[i + 3] - B[i + 3]);
  }
  return summe / (A.length / 4);
}

const GROESSEN = [256, 224, 192, 160];
const GUETEN = [82, 74, 66];
// Beim Durchprobieren mit `effort: 4` statt 6 - das ist rund viermal so
// schnell und liefert etwas GROESSERE Dateien. Die Auswahl wird dadurch
// vorsichtig, nicht optimistisch; gepackt wird am Ende weiter mit 6.
const MUEHE = 4;

for (const g of GRUPPEN) {
  const satz = bilder(g.datei);
  const heute = satz.reduce((n, b) => n + b.puffer.length, 0);
  console.log(`\n=== ${g.name} - ${satz.length} Bilder, heute ${(heute / 1024).toFixed(0)} KB `
    + `roh, gezeichnet mit ${g.anzeige} Geraetepunkten ===`);
  console.log('Kachel  Guete     KB     gespart   Abstand in Anzeigegroesse');
  for (const groesse of GROESSEN) {
    for (const guete of GUETEN) {
      if (groesse === 256 && guete === 82) continue;
      let byte = 0, summe = 0;
      for (const b of satz) {
        const neu = await sharp(b.puffer).resize(groesse, groesse, { fit: 'fill' })
          .webp({ quality: guete, effort: MUEHE }).toBuffer();
        byte += neu.length;
        summe += await abstand(b.puffer, neu, g.anzeige);
      }
      const mittel = summe / satz.length;
      console.log(`  ${String(groesse).padStart(3)}     ${guete}   ${(byte / 1024).toFixed(0).padStart(5)}`
        + `   ${(100 - byte / heute * 100).toFixed(0).padStart(4)} %      ${mittel.toFixed(2)}`);
    }
  }
}
