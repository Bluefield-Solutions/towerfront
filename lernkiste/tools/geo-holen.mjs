// Beschafft die Rohdaten. Sie werden NICHT eingecheckt (siehe .gitignore) -
// eingecheckt wird nur das gebackene Ergebnis in src/geo/.
import fs from 'node:fs';
import path from 'node:path';
import { ROH } from './geo-backen.mjs';

const SPIEGEL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const DATEIEN = [
  { name:'ne_50m_admin_0_countries',        zweck:'Kontinentumrisse (Ebene 1)' },
  { name:'ne_10m_admin_0_countries',        zweck:'Länder (Ebene 2)' },
  { name:'ne_10m_admin_1_states_provinces', zweck:'Bundesländer (Ebene 3, ZWISCHENSTAND)' },
  { name:'ne_10m_populated_places',         zweck:'Städtelagen (Ebene 4)' },
];

fs.mkdirSync(ROH, { recursive:true });
for (const d of DATEIEN) {
  const ziel = path.join(ROH, `${d.name}.geojson`);
  if (fs.existsSync(ziel)) { console.log(`  vorhanden  ${d.name}`); continue; }
  const r = await fetch(`${SPIEGEL}/${d.name}.geojson`);
  if (!r.ok) throw new Error(`${d.name}: HTTP ${r.status}`);
  fs.writeFileSync(ziel, Buffer.from(await r.arrayBuffer()));
  console.log(`  geholt     ${d.name}  ${(fs.statSync(ziel).size/1048576).toFixed(1)} MB  — ${d.zweck}`);
}
console.log('\n  Lizenz: Natural Earth ist Public Domain.');
console.log('  FEHLT NOCH: BKG VG250 für die Bundesländer — siehe README, Abschnitt "Offen".');
