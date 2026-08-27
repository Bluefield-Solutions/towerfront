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
const geo = await shaper({ type:'FeatureCollection', features: roh.features
  .filter(f => f.properties.CONTINENT === 'Antarctica')
  .map(f => ({ type:'Feature', properties:{}, geometry:f.geometry })) }, '-dissolve2');

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
