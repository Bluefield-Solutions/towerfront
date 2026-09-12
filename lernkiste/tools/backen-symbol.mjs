// Das App-Symbol.
//
// Kein Clipart-Globus. Die Kuesten kommen aus DERSELBEN Quelle wie im Spiel
// (Natural Earth 1:50m) und in derselben Sorgfalt - das ist der Punkt des
// ganzen Projekts, und ein Symbol, das daneben liegt, verspricht etwas
// anderes als die App haelt.
//
// Aufsicht: orthographisch, also die Erde so, wie man sie aus dem All sieht.
// Gedreht auf 10 Grad Ost / 15 Grad Nord: dann stehen Europa, Afrika und der
// Rand Amerikas im Bild - drei Kontinente, die ein Kind wiedererkennt.
//
// Erzeugt wird EINE SVG-Datei. Die PNG entstehen daraus in Chromium
// (tools/symbol-backen-png.mjs), damit im Baum nur eine Quelle liegt.
import fs from 'node:fs';
import path from 'node:path';
import * as d3 from 'd3-geo';
import { ROH, shaper, bisAufGrenze, inselnFiltern, ringe } from './geo-backen.mjs';

const AUS = path.join(process.cwd(), 'src/symbol');
fs.mkdirSync(AUS, { recursive: true });

const roh = JSON.parse(fs.readFileSync(path.join(ROH, 'ne_50m_admin_0_countries.geojson'), 'utf8'));
// Antarktika bleibt draussen: in dieser Aufsicht liegt es am unteren Rand
// und wird zum Streifen. Dieselbe Entscheidung wie auf der Weltkarte.
const land = await shaper({ type:'FeatureCollection', features: roh.features
  .filter(f => f.properties.CONTINENT !== 'Antarctica')
  .map(f => ({ type:'Feature', properties:{}, geometry:f.geometry })) }, '-dissolve2');

const R = 512;                       // Zeichenflaeche, quadratisch
const KUGEL = R * 0.375;             // Radius der Kugel: 75 % der Kante
const proj = d3.geoOrthographic()
  .rotate([-10, -15])                // 10 Grad Ost, 15 Grad Nord
  .clipAngle(90)
  .scale(KUGEL)
  .translate([R/2, R/2]);
const pfad = d3.geoPath(proj);

// Vereinfachen, mit derselben Messlatte wie die Karten im Spiel: der
// Hausdorff-Abstand zum Original, in BILDPUNKTEN dieser Darstellung. Ein
// Symbol braucht keine 500 KB Kueste - was unter einem halben Bildpunkt
// liegt, ist bei 512 px nicht mehr zu sehen. Der Unterschied zu "einfach
// weniger Punkte nehmen" ist, dass hier gemessen wird, was verloren geht.
const gefiltert = inselnFiltern(land, proj, 4).geo;
const fein = await bisAufGrenze(gefiltert, proj, 0.9);
console.log(`  Kueste: Hausdorff ${fein.hausdorff.toFixed(2)} px bei `
  + `${ringe(fein.geo).reduce((a,x)=>a+x.length,0)} Punkten`);

const landPfad = pfad(fein.geo);
const netz = pfad(d3.geoGraticule().step([30, 30])());
if (!landPfad) throw new Error('Kein Landpfad - die Projektion hat nichts geliefert.');

// Die Farben stehen auch hier nur EINMAL: sie kommen aus marken.css.
const marken = fs.readFileSync(path.join(process.cwd(), 'src/marken/marken.css'), 'utf8');
const holen = (name) => {
  const zeile = marken.split("\n").find(z => z.trim().startsWith("--" + name + ":"));
  const m = zeile && zeile.match(/oklch\([^)]*\)/);
  if (!m) throw new Error(`Marke --${name} steht nicht in marken.css`);
  return m[0];
};
const TINTE = holen('tinte'), AKZENT = holen('akzent'), GRUND = holen('grund');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${R} ${R}" width="${R}" height="${R}">
  <title>Smart Kids</title>
  <defs>
    <!-- Der Grund: tiefes Tintenblau, nach unten dunkler. Ein Symbol ohne
         Verlauf wirkt auf dem Startbildschirm flach wie ein Aufkleber. -->
    <linearGradient id="grund" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="oklch(0.36 0.050 250)"/>
      <stop offset="1" stop-color="oklch(0.21 0.038 258)"/>
    </linearGradient>
    <!-- Das Meer. Das Licht kommt von oben links; als Verlauf GEBACKEN,
         nie als Filter (Regel 11 - auf iOS wird daraus sonst ein
         schwarzes Bild). -->
    <radialGradient id="meer" cx="0.34" cy="0.28" r="0.92">
      <stop offset="0"    stop-color="oklch(0.68 0.115 235)"/>
      <stop offset="0.45" stop-color="oklch(0.56 0.125 245)"/>
      <stop offset="1"    stop-color="oklch(0.40 0.095 255)"/>
    </radialGradient>
    <!-- Das Land: warm und HELL gegen das kalte Meer. Der Kontrast traegt
         die Kuestenlinie - sie ist der eigentliche Inhalt dieses Symbols. -->
    <linearGradient id="landfarbe" x1="0.15" y1="0" x2="0.75" y2="1">
      <stop offset="0"   stop-color="oklch(0.94 0.045 105)"/>
      <stop offset="0.6" stop-color="oklch(0.89 0.070 95)"/>
      <stop offset="1"   stop-color="oklch(0.82 0.085 80)"/>
    </linearGradient>
    <!-- Die Rundung: unten rechts laeuft die Kugel ins Dunkle. Ohne das
         bleibt sie eine Scheibe. -->
    <radialGradient id="rundung" cx="0.32" cy="0.26" r="0.95">
      <stop offset="0"    stop-color="oklch(1 0 0)" stop-opacity="0.10"/>
      <stop offset="0.58" stop-color="oklch(1 0 0)" stop-opacity="0"/>
      <stop offset="0.86" stop-color="oklch(0.18 0.03 258)" stop-opacity="0.16"/>
      <stop offset="1"    stop-color="oklch(0.15 0.03 258)" stop-opacity="0.46"/>
    </radialGradient>
    <clipPath id="kugel"><circle cx="${R/2}" cy="${R/2}" r="${KUGEL}"/></clipPath>
  </defs>

  <rect width="${R}" height="${R}" fill="url(#grund)"/>

  <!-- EIN Hof, als Strich statt als zwei gefuellte Kreise: die legten sich
       als sichtbare Stufe uebereinander. -->
  <circle cx="${R/2}" cy="${R/2}" r="${(KUGEL*1.085).toFixed(1)}" fill="none"
          stroke="${AKZENT}" stroke-opacity="0.22" stroke-width="${(KUGEL*0.17).toFixed(1)}"/>

  <circle cx="${R/2}" cy="${R/2}" r="${KUGEL}" fill="url(#meer)"/>

  <g clip-path="url(#kugel)">
    <!-- Gradnetz: der Atlas-Anklang. Sehr leise, sonst wird es bei 180 px
         zu Grieß. -->
    <path d="${netz}" fill="none" stroke="oklch(1 0 0)" stroke-opacity="0.16"
          stroke-width="1.2"/>
    <path d="${landPfad}" fill="url(#landfarbe)" fill-rule="evenodd"
          stroke="oklch(0.28 0.050 252)" stroke-width="2.4"
          stroke-linejoin="round" paint-order="stroke fill"/>
    <!-- Rundung ueber alles, Land wie Meer - sonst schwebt das Land
         vor der Kugel statt auf ihr zu liegen. -->
    <circle cx="${R/2}" cy="${R/2}" r="${KUGEL}" fill="url(#rundung)"/>
  </g>

  <!-- Der Rand zuletzt, damit er ueber den Kuesten liegt. -->
  <circle cx="${R/2}" cy="${R/2}" r="${(KUGEL-1).toFixed(1)}" fill="none"
          stroke="oklch(0.22 0.042 258)" stroke-width="3"/>
</svg>
`;
fs.writeFileSync(path.join(AUS, 'symbol.svg'), svg);
console.log(`  src/symbol/symbol.svg  ${(svg.length/1024).toFixed(1)} KB`);
console.log(`  Kugel ${(KUGEL*2/R*100).toFixed(0)} % der Kante — innerhalb der iOS-Maske`);
