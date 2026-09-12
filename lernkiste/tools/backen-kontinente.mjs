// Ebene 1: die sieben Kontinente.
//
// Der eigentliche Inhalt dieser Datei ist Befund L2/G-Klippung: Natural Earth
// ordnet RUSSLAND VOLLSTAENDIG EUROPA zu. Ein naives CONTINENT == 'Europe'
// baut ein Europa, das bis Wladiwostok reicht - und kein Tor schlaegt an,
// weil die Geometrie gueltig ist. Die Kanten stehen deshalb hier, namentlich.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as d3 from 'd3-geo';
import { STUFEN, ROH, AUS, HAUSDORFF_GRENZE, ringe, shaper, bisAufGrenze,
         passe, svgPfad, teileUndLoecher, inselnFiltern } from './geo-backen.mjs';

/**
 * Die Schulkonvention als Maske in Grad. Europa endet am Ural, am Uralfluss,
 * am Kaspischen Meer und am Kaukasus-Hauptkamm.
 */
const EUROPA_MASKE = [[
  [-32,36],[-12,34],[10,34],[26,34],[28,35],[41,37],[41,43],[47,44],
  [52,47],[52,51],[59,55],[62,60],[66,68],[60,70],[40,70],[32,72],
  [-10,72],[-32,66],[-32,36]
]];

const KONTINENTE = [
  { id:'afrika',      name:'Afrika',                ne:'Africa'        },
  { id:'antarktika',  name:'Antarktika',            ne:'Antarctica'    },
  { id:'asien',       name:'Asien',                 ne:'Asia'          },
  { id:'australien',  name:'Australien und Ozeanien', ne:'Oceania'     },
  { id:'europa',      name:'Europa',                ne:'Europe'        },
  { id:'nordamerika', name:'Nordamerika',           ne:'North America' },
  { id:'suedamerika', name:'Südamerika',            ne:'South America' },
];

const roh = JSON.parse(fs.readFileSync(path.join(ROH,'ne_50m_admin_0_countries.geojson'),'utf8'));
const maske = { type:'FeatureCollection', features:[
  { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates: EUROPA_MASKE } } ] };
fs.writeFileSync('/tmp/europa-maske.json', JSON.stringify(maske));

async function sammel(neName) {
  const f = roh.features.filter(x => x.properties.CONTINENT === neName);
  return { type:'FeatureCollection', features:f.map(x=>({type:'Feature',properties:{},geometry:x.geometry})) };
}

console.log('  Kontinente werden geklippt und verschmolzen …\n');
const stuecke = {};
for (const k of KONTINENTE) {
  let geo = await sammel(k.ne);
  if (k.ne === 'Europe') {
    // Europa: nur was innerhalb der Maske liegt. Schneidet Sibirien ab.
    geo = await shaper(geo, '-clip /tmp/europa-maske.json -dissolve2');
  } else if (k.ne === 'Asia') {
    // Asien: die asiatischen Laender PLUS der Rest Russlands ausserhalb der Maske.
    const eu = await sammel('Europe');
    const restRusland = await shaper(eu, '-erase /tmp/europa-maske.json -dissolve2');
    const zus = { type:'FeatureCollection',
      features:[...geo.features, ...restRusland.features] };
    geo = await shaper(zus, '-dissolve2');
  } else {
    geo = await shaper(geo, '-dissolve2');
  }
  stuecke[k.id] = { ...k, geo };
  const b = d3.geoBounds(geo);
  console.log(`  ${k.name.padEnd(24)} lon ${b[0][0].toFixed(0).padStart(5)} … ${b[1][0].toFixed(0).padStart(4)}`
    + `   lat ${b[0][1].toFixed(0).padStart(4)} … ${b[1][1].toFixed(0).padStart(3)}`);
}

// Weltansicht: geoNaturalEarth1, wie im Konzept festgelegt.
//
// Der erste Anlauf nahm ersatzweise geoEquirectangular, mit der Begruendung,
// d3-geo kenne geoNaturalEarth1 nicht. Das war schlicht falsch - sie steht
// dort. Der Entwurf hat es sofort gezeigt: Antarktika wurde ein Band am
// unteren Rand, breiter als Afrika. Genau Befund F4 aus dem Pruefbericht,
// diesmal am eigenen Werk.
const projRoh = () => d3.geoNaturalEarth1();

const alles = { type:'FeatureCollection',
  features: Object.values(stuecke).flatMap(s=>s.geo.features) };

const bericht = { ebene:'kontinente', quelle:'Natural Earth 1:50m admin_0',
                  klippkanten:{ europaAsien:'Ural, Uralfluss, Kaspisches Meer, Kaukasus (Maske in Grad)' },
                  grenze: HAUSDORFF_GRENZE, stufen:[] };
const ausgabe = {};

console.log('');
for (const st of STUFEN) {
  const projSt = passe(projRoh(), alles, st.breitePx);
  const t0 = Date.now();
  const proStueck = [];
  let punkte = 0, hMax = 0, anteilMin = 1;
  for (const s of Object.values(stuecke)) {
    const g = inselnFiltern(s.geo, projSt, 4);
    const r = await bisAufGrenze(g.geo, projSt, HAUSDORFF_GRENZE);
    const tl = teileUndLoecher(r.geo.features[0] || r.geo);
    const skala = 1000 / st.breitePx;
    proStueck.push({ id:s.id, name:s.name, teile:tl.teile, loecher:tl.loecher,
                     pfad: svgPfad(r.geo, projSt, skala) });
    punkte += ringe(r.geo).reduce((a,x)=>a+x.length,0);
    hMax = Math.max(hMax, r.hausdorff); anteilMin = Math.min(anteilMin, r.anteil);
  }
  const j = JSON.stringify(proStueck);
  const gz = zlib.gzipSync(Buffer.from(j)).length;
  ausgabe[st.name] = proStueck;
  bericht.stufen.push({ stufe:st.name, breitePx:st.breitePx, hausdorffPxMax:+hMax.toFixed(3),
                        punkte, bytes:j.length, gzip:gz });
  console.log(`  ${st.name.padEnd(7)} ${String(st.breitePx).padStart(5)} px  `
    + `Hausdorff max ${hMax.toFixed(2)} px  ${String(punkte).padStart(6)} Punkte  `
    + `${(gz/1024).toFixed(1).padStart(6)} KB gz  (${((Date.now()-t0)/1000).toFixed(1)} s)`);
}

fs.mkdirSync(AUS,{recursive:true});
for (const [stufe, s] of Object.entries(ausgabe))
  fs.writeFileSync(path.join(AUS,`kontinente.${stufe}.js`),
    `// ERZEUGT von tools/backen-kontinente.mjs - nicht von Hand aendern.\n`+
    `export const KONTINENTE_${stufe.toUpperCase()} = ${JSON.stringify(s)};\n`);
fs.writeFileSync(path.join(AUS,'bericht-kontinente.json'), JSON.stringify(bericht,null,2));
console.log(`\n  Startbündel-Kandidat (grob): ${(bericht.stufen[0].gzip/1024).toFixed(1)} KB gzip`);
