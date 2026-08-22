/**
 * Der Kartenwechsel im echten Browser, mit Telefondrossel.
 *
 * Getrennt vom Tor, und zwar mit Absicht: diese Zahl schwankt zwischen 662 und
 * 1199 ms bei unveraendertem Stand. Als Budget waere sie ein Wuerfel. Als
 * Messung ist sie das Einzige, was die Wahrheit sagt — jsdom kennt keine
 * Grafikkarte, und Node kennt keinen Hauptstrang, der ein Bild blockiert.
 *
 * Aufruf ueber `npm run kartenwechsel -- --browser`.
 */
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const BREIT = 844, HOCH = 390;
// Lighthouse bildet ein Mittelklassetelefon mit vierfacher Drossel ab. Dieselbe
// Zahl hier, damit die Messung mit etwas vergleichbar ist.
const DROSSEL = 4;
const LAEUFE = 3;

export async function messenImBrowser(ROOT) {
  const datei = join(ROOT, 'dist/index.html');
  if (!existsSync(datei)) {
    console.error('\n  (--browser uebersprungen: dist/index.html fehlt. Erst `npm run build`.)');
    return;
  }
  const { chromium } = await import('playwright');
  const browser = await starten(chromium);

  console.log(`\nIm Browser, ${DROSSEL}-fache CPU-Drossel, ${LAEUFE} Laeufe:`);
  const schlimmste = [];
  for (let lauf = 1; lauf <= LAEUFE; lauf++) {
    const ctx = await browser.newContext({
      viewport: { width: BREIT, height: HOCH }, deviceScaleFactor: 2,
    });
    const seite = await ctx.newPage();
    const cdp = await ctx.newCDPSession(seite);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: DROSSEL });
    await seite.goto('file://' + datei);
    await seite.waitForTimeout(1500);

    await seite.evaluate(() => {
      window.__lang = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lang.push(Math.round(e.duration));
      }).observe({ entryTypes: ['longtask'] });
    });
    await seite.waitForTimeout(400);
    // Was beim Laden anfiel, gehoert nicht zum Kartenwechsel.
    await seite.evaluate(() => { window.__lang.length = 0; });

    // Wie ein Mensch ins Spiel tippen, nicht ueber den Zustand.
    let drin = false;
    for (let y = 60; y < HOCH - 20 && !drin; y += 50) {
      for (let x = 40; x < BREIT - 20 && !drin; x += 60) {
        await seite.mouse.click(x, y);
        await seite.waitForTimeout(90);
        drin = await seite.evaluate(() => !document.getElementById('hud')?.hidden);
      }
    }
    await seite.waitForTimeout(2500);

    const lang = await seite.evaluate(() => window.__lang.slice().sort((a, b) => b - a));
    if (!drin) {
      console.log(`  Lauf ${lauf}: NICHT ins Spiel gekommen — die Zahl sagt nichts.`);
    } else {
      schlimmste.push(lang[0] ?? 0);
      console.log(`  Lauf ${lauf}: ${(lang.slice(0, 3).join(', ') || 'keine Aufgabe ueber 50 ms')} ms`);
    }
    await ctx.close();
  }
  await browser.close();

  if (schlimmste.length) {
    const min = Math.min(...schlimmste), max = Math.max(...schlimmste);
    console.log(`  Schlimmste Aufgabe: ${min} bis ${max} ms ueber ${schlimmste.length} Laeufe.`);
    console.log('  Die Spanne ist der Grund, warum daraus kein Budget wird.');
  }
}

/** Denselben Weg wie das Browsertor: erst der Normalweg, dann das
 *  vorinstallierte Chromium. Ein stilles Ueberspringen gaebe es nicht. */
async function starten(chromium) {
  const versuche = [
    [null, 'Playwright-eigene Fassung'],
    [process.env.CHROMIUM_PFAD, 'CHROMIUM_PFAD'],
    ['/opt/pw-browsers/chromium', 'vorinstalliert'],
  ];
  const gescheitert = [];
  for (const [pfad, name] of versuche) {
    if (pfad === undefined) continue;
    try {
      return await chromium.launch(pfad ? { executablePath: pfad } : {});
    } catch (e) {
      gescheitert.push(`  ${name}: ${e.message.split('\n')[0]}`);
    }
  }
  throw new Error('Kein Chromium startbar:\n' + gescheitert.join('\n'));
}
