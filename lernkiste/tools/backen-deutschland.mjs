// Ebene 3: die 16 Bundeslaender. Erzeugt src/geo/deutschland.<stufe>.js
// und misst dabei alles, was Konzept K3 als Zahl verlangt.
import fs from 'node:fs';
import path from 'node:path';
import * as d3 from 'd3-geo';
import { STUFEN, ROH, AUS, HAUSDORFF_GRENZE, ringe, projiziere, hausdorff,
         shaper, bisAufGrenze, passe, svgPfad, teileUndLoecher,
         inselnFiltern } from './geo-backen.mjs';
import zlib from 'node:zlib';

const NAMEN = {
  'DE-BW':'Baden-Württemberg','DE-BY':'Bayern','DE-BE':'Berlin','DE-BB':'Brandenburg',
  'DE-HB':'Bremen','DE-HH':'Hamburg','DE-HE':'Hessen','DE-MV':'Mecklenburg-Vorpommern',
  'DE-NI':'Niedersachsen','DE-NW':'Nordrhein-Westfalen','DE-RP':'Rheinland-Pfalz',
  'DE-SL':'Saarland','DE-SN':'Sachsen','DE-ST':'Sachsen-Anhalt',
  'DE-SH':'Schleswig-Holstein','DE-TH':'Thüringen'
};
const HAUPTSTADT = {
  'DE-BW':'Stuttgart','DE-BY':'München','DE-BE':'Berlin','DE-BB':'Potsdam','DE-HB':'Bremen',
  'DE-HH':'Hamburg','DE-HE':'Wiesbaden','DE-MV':'Schwerin','DE-NI':'Hannover',
  'DE-NW':'Düsseldorf','DE-RP':'Mainz','DE-SL':'Saarbrücken','DE-SN':'Dresden',
  'DE-ST':'Magdeburg','DE-SH':'Kiel','DE-TH':'Erfurt'
};
// G9, zweite Stufe: namentlich behaltene Inseln, die die Silhouette ausmachen.
const INSELN = ['Sylt','Föhr','Amrum','Fehmarn','Rügen','Usedom','Helgoland','Pellworm','Norderney'];

const roh = JSON.parse(fs.readFileSync(path.join(ROH,'ne_10m_admin_1_states_provinces.geojson'),'utf8'));
const de = { type:'FeatureCollection', features: roh.features
  .filter(f => f.properties.adm0_a3 === 'DEU')
  .map(f => ({ type:'Feature',
    properties:{ id: f.properties.iso_3166_2, name: NAMEN[f.properties.iso_3166_2],
                 hauptstadt: HAUPTSTADT[f.properties.iso_3166_2] },
    geometry: f.geometry })) };
if (de.features.length !== 16) throw new Error(`16 Bundeslaender erwartet, ${de.features.length} gefunden`);

// G3: EINE Topologie ueber alle sechzehn, bevor irgendetwas vereinfacht wird.
// -clean schnappt fast gleiche Punkte zusammen und raeumt Splitter weg.
//
// OHNE Flaechenangabe. Die Daten liegen hier in Grad, nicht in Metern; eine
// Angabe wie gap-fill-area=20km2 wird dann still falsch verrechnet und hat
// beim ersten Versuch die halbe Geometrie aufgeloest, ohne dass etwas rot
// wurde - die Messung meldete danach 0,00 px Abweichung bei 2,4 % Punkten.
const topo = await shaper(de, '-clean');

// G7: der amtliche Schnitt fuer Deutschland - Lambert-Kegel, 48°40' und 53°40'.
const projRoh = () => d3.geoConicConformal().parallels([48+40/60, 53+40/60]).rotate([-10.5,0]);

const bericht = { ebene:'deutschland', quelle:'Natural Earth 1:10m admin_1 (ZWISCHENSTAND, siehe README)',
                  grenze: HAUSDORFF_GRENZE, stufen:[] };
const ausgabe = {};

// G9 gilt JE STUFE, nicht einmal fuer alle.
//
// Beim ersten Anlauf wurde die Inselregel nur an der feinsten Stufe
// angewandt. Folge: Fehmarn steckte auch in der groben Stufe, wo es 0,4 mal
// 0,4 Bildpunkte gross ist - unsichtbar, aber in den Daten. Die
// Vereinfachung liess es zusammenfallen, und sein ganzer Umriss lag danach
// weit von allem entfernt: die Abstandsmessung schlug an, die Bisektion kam
// nicht unter 59 % Punkte. Eine Insel, die man nicht sehen kann, gehoert
// nicht in die Stufe.
for (const st of STUFEN) {
  const projSt = passe(projRoh(), topo, st.breitePx);
  const g = inselnFiltern(topo, projSt, 4);
  const proj = passe(projRoh(), g.geo, st.breitePx);
  const t0 = Date.now();
  const r = await bisAufGrenze(g.geo, proj, HAUSDORFF_GRENZE);
  // Nach der Vereinfachung noch einmal die Topologie saeubern.
  const fertig = r.geo;

  const skala = 1000 / st.breitePx;
  const stuecke = fertig.features.map(f => {
    const tl = teileUndLoecher(f);
    return { id: f.properties.id, name: f.properties.name,
             hauptstadt: f.properties.hauptstadt,
             teile: tl.teile, loecher: tl.loecher,
             pfad: svgPfad(f, proj, skala) };
  });
  const roh_ = JSON.stringify(stuecke);
  const gz = zlib.gzipSync(Buffer.from(roh_)).length;
  const punkte = ringe(fertig).reduce((s,r_)=>s+r_.length,0);

  ausgabe[st.name] = stuecke;
  bericht.stufen.push({ stufe: st.name, breitePx: st.breitePx,
    inselnBehalten: g.behalten, inselnWeg: g.weg,
    anteil: +(r.anteil*100).toFixed(1), hausdorffPx: +r.hausdorff.toFixed(3),
    laeufe: r.laeufe, punkte, bytes: roh_.length, gzip: gz, sekunden: +((Date.now()-t0)/1000).toFixed(1) });
  console.log(`  ${st.name.padEnd(7)} ${String(st.breitePx).padStart(5)} px  `
    + `Anteil ${(r.anteil*100).toFixed(1).padStart(5)} %  `
    + `Hausdorff ${r.hausdorff.toFixed(2)} px  ${String(punkte).padStart(6)} Punkte  `
    + `${(gz/1024).toFixed(1).padStart(6)} KB gz  `
    + `${String(g.behalten).padStart(3)} Flächen (${g.weg} zu klein)  `
    + `(${((Date.now()-t0)/1000).toFixed(1)} s)`);
}

fs.mkdirSync(AUS,{recursive:true});
for (const [stufe, stuecke] of Object.entries(ausgabe))
  fs.writeFileSync(path.join(AUS,`deutschland.${stufe}.js`),
    `// ERZEUGT von tools/backen-deutschland.mjs - nicht von Hand aendern.\n`+
    `export const DEUTSCHLAND_${stufe.toUpperCase()} = ${JSON.stringify(stuecke)};\n`);
fs.writeFileSync(path.join(AUS,'bericht-deutschland.json'), JSON.stringify(bericht,null,2));

// Was die Tore spaeter pruefen: Teile und Loecher gegen die Wirklichkeit.
console.log('\n  Teile und Löcher (feinste Stufe):');
ausgabe.fein.filter(s=>s.teile>1||s.loecher>0)
  .sort((a,b)=>b.teile-a.teile)
  .forEach(s=>console.log(`    ${s.name.padEnd(24)} ${s.teile} Teile, ${s.loecher} Löcher`));
console.log(`\n  Gesamt fein: ${(bericht.stufen[2].gzip/1024).toFixed(1)} KB gzip`);
