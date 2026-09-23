// Ebene 2: je Kontinent die einwohnerstaerksten Laender - und der ganze
// Kontinent als Umgebung.
//
// Befund G8 aus dem Audit: Zeigt man nur die fuenf Ziele, lernt das Kind
// eine Karte, die es nicht gibt, und kann durch Ausschluss raten. Also wird
// der ganze Kontinent gezeichnet, die Ziele hervorgehoben.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as d3 from 'd3-geo';
import { STUFEN, ROH, AUS, HAUSDORFF_GRENZE, ringe, shaper, bisAufGrenze,
         passe, svgPfad, teileUndLoecher, inselnFiltern } from './geo-backen.mjs';

const EUROPA_MASKE = [[
  [-32,36],[-12,34],[10,34],[26,34],[28,35],[41,37],[41,43],[47,44],
  [52,47],[52,51],[59,55],[62,60],[66,68],[60,70],[40,70],[32,72],
  [-10,72],[-32,66],[-32,36]
]];
fs.writeFileSync('/tmp/europa-maske.json', JSON.stringify(
  { type:'FeatureCollection', features:[{ type:'Feature', properties:{},
    geometry:{ type:'Polygon', coordinates:EUROPA_MASKE } }] }));

// Stand 2025. Reihenfolge = Rang. Die ersten DREI sind Fionas Menge.
const EBENEN = [
  { id:'asien', name:'Asien', ne:'Asia', projektion:'kegel',
    ziele:[['IND','Indien'],['CHN','China'],['IDN','Indonesien'],['PAK','Pakistan'],['BGD','Bangladesch']] },
  { id:'afrika', name:'Afrika', ne:'Africa', projektion:'azimutal',
    ziele:[['NGA','Nigeria'],['ETH','Äthiopien'],['EGY','Ägypten'],['COD','DR Kongo'],['TZA','Tansania']] },
  { id:'europa', name:'Europa', ne:'Europe', projektion:'kegel', klippen:true,
    ziele:[['RUS','Russland'],['DEU','Deutschland'],['GBR','Vereinigtes Königreich'],['FRA','Frankreich'],['ITA','Italien']] },
  { id:'nordamerika', name:'Nordamerika', ne:'North America', projektion:'kegel',
    ziele:[['USA','USA'],['MEX','Mexiko'],['CAN','Kanada'],['GTM','Guatemala'],['HTI','Haiti']] },
  { id:'suedamerika', name:'Südamerika', ne:'South America', projektion:'azimutal',
    ziele:[['BRA','Brasilien'],['COL','Kolumbien'],['ARG','Argentinien'],['PER','Peru'],['VEN','Venezuela']] },
];

const roh = JSON.parse(fs.readFileSync(path.join(ROH,'ne_10m_admin_0_countries.geojson'),'utf8'));

/** G7: Standardparallelen bei 1/6 und 5/6 der Breitenausdehnung. */
function projektionFuer(art, geo) {
  const b = d3.geoBounds(geo);
  const [lo0,la0] = b[0], [lo1,la1] = b[1];
  const mitte = -(lo0 + lo1) / 2;
  if (art === 'azimutal')
    return d3.geoAzimuthalEqualArea().rotate([mitte, -(la0+la1)/2]);
  return d3.geoConicEqualArea()
    .parallels([la0 + (la1-la0)/6, la0 + (la1-la0)*5/6]).rotate([mitte, 0]);
}

const bericht = { ebene:'laender', quelle:'Natural Earth 1:10m admin_0', standJahr:2025,
                  grenze:HAUSDORFF_GRENZE, kontinente:[] };
const ausgabe = {};
let gesamtGz = 0;

for (const k of EBENEN) {
  const ziele = new Map(k.ziele);
  let geo = { type:'FeatureCollection', features: roh.features
    .filter(f => f.properties.CONTINENT === k.ne)
    .map(f => ({ type:'Feature',
      properties:{ a3:f.properties.ADM0_A3, name: ziele.get(f.properties.ADM0_A3) || null,
                   rang: [...ziele.keys()].indexOf(f.properties.ADM0_A3) + 1 || null },
      geometry:f.geometry })) };
  if (k.klippen) geo = await shaper(geo, '-clip /tmp/europa-maske.json');

  const fehlend = [...ziele.keys()].filter(a3 => !geo.features.some(f=>f.properties.a3===a3));
  if (fehlend.length) throw new Error(`${k.name}: Zielländer nicht gefunden: ${fehlend.join(', ')}`);

  // G3: Topologie ueber ALLE Laender des Kontinents, vor dem Vereinfachen.
  const topo = await shaper(geo, '-clean');
  const zeilen = {};
  const perStufe = [];
  for (const st of STUFEN) {
    const projSt = passe(projektionFuer(k.projektion, topo), topo, st.breitePx);
    const g = inselnFiltern(topo, projSt, 4);
    const proj = passe(projektionFuer(k.projektion, g.geo), g.geo, st.breitePx);
    const r = await bisAufGrenze(g.geo, proj, HAUSDORFF_GRENZE);
    const skala = 1000 / st.breitePx;
    const stuecke = r.geo.features.map(f => {
      const tl = teileUndLoecher(f);
      return { a3:f.properties.a3, name:f.properties.name, rang:f.properties.rang,
               teile:tl.teile, loecher:tl.loecher,
               pfad: svgPfad({type:'FeatureCollection',features:[f]}, proj, skala) };
    }).filter(s => s.pfad);
    zeilen[st.name] = stuecke;
    const j = JSON.stringify(stuecke);
    const gz = zlib.gzipSync(Buffer.from(j)).length;
    perStufe.push({ stufe:st.name, laender:stuecke.length, hausdorffPx:+r.hausdorff.toFixed(3),
                    punkte: ringe(r.geo).reduce((a,x)=>a+x.length,0), gzip:gz });
    if (st.name === 'mittel') gesamtGz += gz;
  }
  ausgabe[k.id] = zeilen;
  bericht.kontinente.push({ id:k.id, name:k.name, ziele:k.ziele.map(z=>z[1]), stufen:perStufe });
  const m = perStufe[1];
  console.log(`  ${k.name.padEnd(14)} ${String(m.laender).padStart(3)} Länder  `
    + `Hausdorff ${m.hausdorffPx.toFixed(2)} px  ${(m.gzip/1024).toFixed(1).padStart(6)} KB gz (mittel)`);
}

fs.mkdirSync(AUS,{recursive:true});
for (const [id, zeilen] of Object.entries(ausgabe))
  for (const [stufe, s] of Object.entries(zeilen))
    fs.writeFileSync(path.join(AUS,`laender-${id}.${stufe}.js`),
      `// ERZEUGT von tools/backen-laender.mjs - nicht von Hand aendern.\n`+
      `export const LAENDER_${id.toUpperCase()}_${stufe.toUpperCase()} = ${JSON.stringify(s)};\n`);
fs.writeFileSync(path.join(AUS,'bericht-laender.json'), JSON.stringify(bericht,null,2));
console.log(`\n  Summe mittlere Stufe über alle fünf Kontinente: ${(gesamtGz/1024).toFixed(1)} KB gzip`);
