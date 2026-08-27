// Tor `ansicht` - visuelles Regressionstor.
//
// Kein Tor kann sagen, ob etwas schoen ist. Aber jedes Tor kann sagen, ob
// sich etwas VERAENDERT hat - und das ist bei Gestaltung fast dasselbe wert,
// weil Verfall dort schleichend passiert.
//
// Aufruf:
//   node tor/ansicht.mjs                  pruefen
//   node tor/ansicht.mjs --aktualisieren  Vorbilder erneuern (bewusst!)
//
// EHRLICH DAZU: Die Vorbilder entstehen in Chromium. Das Tor findet
// VERAENDERUNGEN, nicht iOS-Richtigkeit. Kein Tor laeuft je auf dem Geraet,
// auf dem geurteilt wird.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { starte } from './chromium.mjs';

const VORBILDER = path.join(process.cwd(), 'tor/vorbilder');
const ABWEICHUNGEN = path.join(process.cwd(), 'tor/abweichungen');
const AKTUALISIEREN = process.argv.includes('--aktualisieren');

/** Was aufgenommen wird. Jede Aufnahme ist EINE Zeile hier. */
const AUFNAHMEN = [
  { name:'mg-fiona-kontinente', seite:'entwuerfe/mg.html', wahl:'#schirm1 .geraet' },
  { name:'mg-lea-deutschland',  seite:'entwuerfe/mg.html', wahl:'#schirm2 .geraet' },
  { name:'mg-belohnung',        seite:'entwuerfe/mg.html', wahl:'#schirm3 .geraet' },
  { name:'mg-farbstreifen',     seite:'entwuerfe/mg.html', wahl:'#s-ok' },
  { name:'karte-deutschland',   seite:'entwuerfe/mg.html', wahl:'#schirm2 .geraet svg' },
];

/** Zulaessige Abweichung: eine Handvoll Bildpunkte fuer Kantenglaettung. */
const GRENZE_ANTEIL = 0.0008;   // 0,08 % der Bildpunkte
const GRENZE_KANAL  = 12;       // ab hier gilt ein Bildpunkt als anders

function vergleiche(a, b) {
  if (a.width !== b.width || a.height !== b.height)
    return { masse: true, anders: Infinity, anteil: 1 };
  let anders = 0;
  const diff = new PNG({ width:a.width, height:a.height });
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.max(Math.abs(a.data[i]-b.data[i]),
                       Math.abs(a.data[i+1]-b.data[i+1]),
                       Math.abs(a.data[i+2]-b.data[i+2]));
    if (d > GRENZE_KANAL) {
      anders++;
      diff.data[i]=255; diff.data[i+1]=0; diff.data[i+2]=0; diff.data[i+3]=255;
    } else {
      const g = 230 + (a.data[i]>>4);
      diff.data[i]=g; diff.data[i+1]=g; diff.data[i+2]=g; diff.data[i+3]=255;
    }
  }
  return { masse:false, anders, anteil: anders/(a.width*a.height), diff };
}

const browser = await starte();
// Determinismus: feste Punktdichte, feste Groesse, Bewegung aus, Datum fest.
const seite = await browser.newPage({
  viewport:{ width:1240, height:1000 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
  colorScheme: 'light',
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
});
await seite.addInitScript(() => { Math.random = () => 0.42; });

fs.mkdirSync(VORBILDER, { recursive:true });
fs.mkdirSync(ABWEICHUNGEN, { recursive:true });

let rot = 0, neu = 0, gruen = 0;
let letzteSeite = null;
for (const a of AUFNAHMEN) {
  if (letzteSeite !== a.seite) {
    await seite.goto('file://' + path.join(process.cwd(), a.seite), { waitUntil:'networkidle' });
    await seite.evaluate(() => document.fonts.ready);   // sonst wandert der Text
    letzteSeite = a.seite;
  }
  const el = await seite.$(a.wahl);
  if (!el) { console.log(`  FEHLT   ${a.name}  (${a.wahl} nicht gefunden)`); rot++; continue; }
  // `animations: 'disabled'` haelt laufende Animationen an und spult sie ans
  // Ende. Ohne das bleibt eine ENDLOSE Animation - der atmende Ring am
  // Mikrofonknopf - auch bei 1 ms Dauer irgendwo stehen, und das Tor meldet
  // bei jedem Lauf einen anderen Unterschied. Das Tor war nicht
  // deterministisch; gefunden hat es sich selbst.
  const jetzt = await el.screenshot({ animations: 'disabled' });
  const ziel = path.join(VORBILDER, a.name + '.png');

  if (AKTUALISIEREN || !fs.existsSync(ziel)) {
    fs.writeFileSync(ziel, jetzt);
    console.log(`  ${fs.existsSync(ziel)&&!AKTUALISIEREN?'NEU    ':'ERNEUERT'} ${a.name}`);
    neu++; continue;
  }
  const v = vergleiche(PNG.sync.read(fs.readFileSync(ziel)), PNG.sync.read(jetzt));
  if (v.masse) {
    console.log(`  ROT     ${a.name}  — Maße geändert`); rot++;
  } else if (v.anteil > GRENZE_ANTEIL) {
    fs.writeFileSync(path.join(ABWEICHUNGEN, a.name + '.png'), PNG.sync.write(v.diff));
    fs.writeFileSync(path.join(ABWEICHUNGEN, a.name + '.jetzt.png'), jetzt);
    console.log(`  ROT     ${a.name}  — ${v.anders} Bildpunkte anders `
      + `(${(v.anteil*100).toFixed(3)} %, erlaubt ${(GRENZE_ANTEIL*100).toFixed(3)} %)`);
    rot++;
  } else {
    console.log(`  grün    ${a.name}  — ${v.anders} Bildpunkte anders (${(v.anteil*100).toFixed(4)} %)`);
    gruen++;
  }
}
await browser.close();

console.log(`\n  ${gruen} grün, ${neu} neu, ${rot} rot`);
if (rot) {
  console.log('\n  Die Unterschiede liegen in tor/abweichungen/ — rot markiert, was sich');
  console.log('  geändert hat. War die Änderung Absicht, dann:');
  console.log('      node tor/ansicht.mjs --aktualisieren');
  console.log('  und die neuen Vorbilder im SELBEN Commit einchecken. Dann steht die');
  console.log('  Veränderung im Diff und ist zu sehen.');
  process.exit(1);
}
