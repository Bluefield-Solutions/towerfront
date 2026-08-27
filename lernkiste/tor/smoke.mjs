// Rauchtest: spielt den Prototyp wirklich - Profilwahl, Ebene, ziehen,
// Belohnung, Ende. Das einzige Tor, das das Spiel spielt.
import { starte } from './chromium.mjs';

const b = await starte();
const fehler = [];
async function lauf(name, viewport, istPhone) {
  const p = await b.newPage({ viewport, deviceScaleFactor:2, hasTouch:istPhone,
                              isMobile:istPhone, locale:'de-DE' });
  p.on('pageerror', e => fehler.push(`${name}: ${e}`));
  await p.goto('file://' + process.cwd() + '/prototyp/spiel.html', { waitUntil:'networkidle' });
  await p.evaluate(()=>document.fonts.ready);

  const schritt = async (was, tunFn) => {
    try { await tunFn(); } catch(e){ fehler.push(`${name}/${was}: ${e.message}`); }
  };
  await schritt('Profil Fiona', async ()=>{ await p.click('[data-profil="fiona"]');
    await p.waitForSelector('.schirm.da [data-i]', { timeout:3000 }); });
  await schritt('Ebene Bundesländer', async ()=>{ await p.click('[data-i="3"]');
    await p.waitForSelector('.schirm.da .karte svg', { timeout:3000 }); });

  const zahl = await p.$$eval('.schirm.da .etikett', e=>e.length);
  if (zahl < 2) fehler.push(`${name}: nur ${zahl} Etiketten`);

  // Richtiges Etikett auf das richtige Gebiet ziehen - echte Pointer Events.
  await schritt('ziehen', async ()=>{
    const zielId = await p.$eval('.schirm.da path.ziel', e=>e.dataset.id);
    const name = await p.$eval('.schirm.da .frage', e=>e.textContent);
    const passend = await p.$$eval('.schirm.da .etikett', (els)=>els.map(e=>e.textContent));
    const gebietName = await p.evaluate((id)=>{
      const D=JSON.parse(document.getElementById('daten').textContent);
      return (D.deutschland.find(x=>x.id===id)||{}).name; }, zielId);
    const idx = passend.indexOf(gebietName);
    if (idx < 0) throw new Error(`Etikett "${gebietName}" nicht unter ${passend.join(', ')}`);
    const et = (await p.$$('.schirm.da .etikett'))[idx];
    const a = await et.boundingBox();
    // Abgelegt wird auf den ANKER, nicht auf die Mitte der Bounding-Box.
    // Bei einer konkaven Flaeche liegt die Mitte der Box ausserhalb - der
    // Rauchtest hat im Querformat genau daran zweimal danebengegriffen.
    const ziel = await p.evaluate((id)=>{
      const svg = document.querySelector('.schirm.da .karte svg');
      const D = JSON.parse(document.getElementById('daten').textContent);
      const b = D.deutschland.find(x=>x.id===id);
      const pt = svg.createSVGPoint(); pt.x = b.anker[0]; pt.y = b.anker[1];
      const s = pt.matrixTransform(svg.getScreenCTM());
      return { x:s.x, y:s.y };
    }, zielId);
    await p.mouse.move(a.x+a.width/2, a.y+a.height/2);
    await p.mouse.down();
    await p.mouse.move(ziel.x, ziel.y, { steps:12 });
    await p.mouse.up();
    await p.waitForFunction(()=>/Richtig/.test(document.querySelector('.schirm.da .frage').textContent),
      null, { timeout:3000 });
  });

  await p.screenshot({ path:`/tmp/smoke-${name}.png` });
  await p.close();
  return zahl;
}

const a = await lauf('iphone-quer', { width:844, height:390 }, true);
const c = await lauf('ipad-quer',   { width:1180, height:820 }, true);
const d = await lauf('iphone-hoch', { width:390, height:844 }, true);
await b.close();

console.log(`  Etiketten: quer ${a}, iPad ${c}, hoch ${d}`);
if (fehler.length) { console.log(`\n  ${fehler.length} FEHLER:`); fehler.forEach(f=>console.log('    ✗ '+f)); process.exit(1); }
console.log('\n  Rauchtest grün: Profil → Ebene → Ziehen → Belohnung, auf drei Formaten.');
