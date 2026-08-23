import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h, name] of [[844, 390, 'iPhone quer'], [1400, 900, 'Schreibtisch']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 900 });
  await p.goto('file:///home/user/towerfront/dist/index.html');
  await p.waitForTimeout(1200);
  await p.mouse.click(w * 0.25, h * 0.57); await p.waitForTimeout(300);
  const spielen = await p.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.textContent?.trim() === 'Spielen');
    return el ? null : null;
  });
  void spielen;
  // ueber die Leinwand ins Spiel: der Weg aus dem Browsertor
  for (const [x, y] of [[w * 0.25, h * 0.57], [w * 0.6, h * 0.77]]) { await p.mouse.click(x, y); await p.waitForTimeout(400); }
  // Turm bauen
  const btn = await p.evaluate(() => {
    const e = document.getElementById('tb-arrow'); if (!e) return null;
    const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!btn) { console.log(`${name}: kein Bauknopf sichtbar`); await p.close(); continue; }
  await p.mouse.click(btn.x, btn.y); await p.waitForTimeout(300);
  await p.mouse.click(w * 0.35, h * 0.35); await p.waitForTimeout(300);
  await p.mouse.click(w * 0.35, h * 0.35); await p.waitForTimeout(400);
  await p.mouse.click(w * 0.35, h * 0.35); await p.waitForTimeout(400);
  const mass = await p.evaluate(() => {
    const r = (id) => { const e = document.getElementById(id); if (!e || e.hidden) return null;
      const b = e.getBoundingClientRect(); return { h: Math.round(b.height), w: Math.round(b.width), y: Math.round(b.y) }; };
    return { insp: r('inspector'), stats: r('i-stats'), ziel: r('i-ziel'), ups: r('i-ups'),
      sell: r('i-sell'), zeilen: document.querySelectorAll('#i-stats dt').length };
  });
  console.log(name, JSON.stringify(mass));
  await p.screenshot({ path: `/tmp/claude-0/-home-user-towerfront/33c3e282-7b9e-5288-9f13-0fb54071cd6d/scratchpad/insp-${w}.png` });
  await p.close();
}
await b.close();
