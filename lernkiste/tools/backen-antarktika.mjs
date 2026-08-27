// Antarktika braucht eine EIGENE Ansicht.
//
// Der offene Punkt aus MG: in jeder Weltprojektion liegt Antarktika als
// Sockel am unteren Rand - breiter als Afrika, und formlos. Genau Befund F4:
// es ist dort die am schwersten wiederzuerkennende Flaeche, nicht die
// leichteste. Fionas dritte Runde braucht deshalb eine polare Aufsicht, auf
// der es rund ist.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as d3 from 'd3-geo';
import { ROH, AUS, HAUSDORFF_GRENZE, ringe, shaper, bisAufGrenze, passe,
         svgPfad, inselnFiltern, STUFEN } from './geo-backen.mjs';

const roh = JSON.parse(fs.readFileSync(path.join(ROH,'ne_50m_admin_0_countries.geojson'),'utf8'));

/**
 * Entfernt die kuenstliche Naht aus dem Umriss.
 *
 * Natural Earth speichert Antarktika fuer eine RECHTECKIGE Weltkarte. Der
 * Umriss laeuft deshalb bei 180 Grad die Laengslinie hinunter bis
 * lat -89,999, einmal quer ueber den ganzen unteren Rand und bei -180 Grad
 * wieder hinauf. Das hat keine Flaeche und faellt auf einer Weltkarte nicht
 * auf - in der polaren Aufsicht aber sind 180 und -180 DIESELBE Linie: die
 * beiden Schenkel liegen aufeinander und zeigen sich als Strich, der vom
 * Rand bis in die Mitte laeuft (im Bild von v-Vorschau deutlich sichtbar).
 *
 * Der Schnitt wird durch EINEN Punkt ersetzt - den echten Kuestenpunkt bei
 * 180 Grad. Flaeche und Umgrenzung aendern sich dadurch nicht (gemessen:
 * beide identisch), nur die Nullflaeche verschwindet.
 */
function nahtWeg(ring) {
  const amPol  = p => p[1] <= -89.5;
  const anNaht = p => Math.abs(Math.abs(p[0]) - 180) < 1e-6;
  let a = ring.findIndex(amPol);
  if (a < 0) return ring;
  let b = a;
  while (b + 1 < ring.length && amPol(ring[b + 1])) b++;
  while (a > 0 && anNaht(ring[a - 1])) a--;
  while (b + 1 < ring.length && anNaht(ring[b + 1])) b++;
  const kueste = [180, Math.max(ring[a][1], ring[b][1])];
  return [...ring.slice(0, a), kueste, ...ring.slice(b + 1)];
}
const ohneNaht = g => g.type === 'Polygon'
  ? { type:'Polygon', coordinates: g.coordinates.map(nahtWeg) }
  : { type:'MultiPolygon', coordinates: g.coordinates.map(p => p.map(nahtWeg)) };

const geo = await shaper({ type:'FeatureCollection', features: roh.features
  .filter(f => f.properties.CONTINENT === 'Antarctica')
  .map(f => ({ type:'Feature', properties:{}, geometry: ohneNaht(f.geometry) })) }, '-dissolve2');

// Aufsicht auf den Suedpol. clipAngle schneidet die Gegenhalbkugel weg.
const projRoh = () => d3.geoAzimuthalEqualArea().rotate([0, 90]).clipAngle(60);

const zeilen = {};
console.log('  Antarktika, polare Aufsicht:');
for (const st of STUFEN) {
  const projSt = passe(projRoh(), geo, st.breitePx);
  const g = inselnFiltern(geo, projSt, 4);
  const proj = passe(projRoh(), g.geo, st.breitePx);
  const r = await bisAufGrenze(g.geo, proj, HAUSDORFF_GRENZE);
  const skala = 1000 / st.breitePx;
  const pfad = svgPfad(r.geo, proj, skala);
  zeilen[st.name] = [{ id:'antarktika', name:'Antarktika', pfad }];
  const gz = zlib.gzipSync(Buffer.from(pfad)).length;
  console.log(`    ${st.name.padEnd(7)} Hausdorff ${r.hausdorff.toFixed(2)} px  `
    + `${String(ringe(r.geo).reduce((a,x)=>a+x.length,0)).padStart(5)} Punkte  `
    + `${(gz/1024).toFixed(1)} KB gz`);
}
for (const [stufe,z] of Object.entries(zeilen))
  fs.writeFileSync(path.join(AUS,`antarktika.${stufe}.js`),
    `// ERZEUGT von tools/backen-antarktika.mjs - polare Aufsicht.\n`+
    `export const ANTARKTIKA_${stufe.toUpperCase()} = ${JSON.stringify(z)};\n`);
