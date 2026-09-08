/** UX-Audit: nimmt das GEBAUTE Spiel in den Zustaenden auf, die man beim
 *  Spielen wirklich erreicht - und misst dabei, was ein Blick nicht zaehlen
 *  kann (Flaechenanteile, Kontraste, Trefferflaechen).
 *
 *  Warum ein eigenes Werkzeug und nicht `npm run bilder`: die Bildabnahme
 *  zeichnet die LEINWAND. Die halbe Bedienung ist aber HTML - Kopfzeile,
 *  Turmleiste, Pruefsteg, Pausenkarte -, und genau darueber laeuft die
 *  Beschwerde. Ein Audit, das die HTML-Schicht nicht sieht, redet ueber ein
 *  anderes Spiel.
 *
 *  Regel 12: jede Zahl traegt ihre Messstelle. Aufgenommen wird auf
 *  844 x 390 (iPhone quer, das Zielgeraet) mit deviceScaleFactor 2 und
 *  zusaetzlich auf 1400 x 900 (Notebook, der zweite unterstuetzte Weg).
 *
 *  **Das Bauraster laeuft auf einer EIGENEN Seite.** Der erste Entwurf fuhr
 *  es vor den Aufnahmen, und es baute dabei einen Turm - danach zeigten die
 *  Bilder einen Zustand, den kein Spieler so herstellt. Ein Messlauf, der
 *  seinen Gegenstand veraendert, misst den naechsten mit.
 */
import { browserStarten } from './chromium.mjs';
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATEI = join(ROOT, 'dist/index.html');
const AUS = process.env.UXAUS || '/tmp/lab/ux';
mkdirSync(AUS, { recursive: true });

if (!existsSync(DATEI)) {
  console.error('UX-TOR: dist/index.html fehlt - erst `npm run build`.');
  process.exit(1);
}

// --- Ist die gebaute Datei ueberhaupt die aktuelle?
//
// Dieselbe Falle wie im Browsertor, und ich bin voll hineingelaufen: dieses
// Tor prueft ein ERZEUGNIS. Ohne diese Pruefung laedt es die dist von vorhin
// und meldet Gruen fuer Arbeit, die es nie gesehen hat.
//
// Gekostet hat es drei Gegenproben. Der Nachtlauf zu v238 meldete "Turmleiste
// sprengt das Band", "Turmname steht doppelt im Bild" und "Einklappknopf
// faellt unter den Richtwert" als gegenstandslos - alle drei bauen einen
// Fehler in `src/` ein und riefen dann `uxaudittor` auf, das gar nicht baut.
// Das Tor sah den Eingriff nie (Regel 3: pruefen, ob der Eingriff angekommen
// ist). Ein Tor ohne diese Pruefung ist nicht nur unscharf, es macht seine
// eigenen Gegenproben wertlos.
{
  const juengste = (verz) => {
    let t = 0;
    for (const e of readdirSync(verz, { withFileTypes: true })) {
      const pfad = join(verz, e.name);
      t = Math.max(t, e.isDirectory() ? juengste(pfad) : statSync(pfad).mtimeMs);
    }
    return t;
  };
  const quelle = Math.max(
    juengste(join(ROOT, 'src')),
    statSync(join(ROOT, 'index.html')).mtimeMs,
  );
  if (statSync(DATEI).mtimeMs < quelle) {
    console.error('UX-TOR: dist/index.html ist aelter als der Quelltext.\n');
    console.error('Geprueft wuerde ein Stand von vorhin. Erst `npm run build`,');
    console.error('oder gleich `npm run uxtor` - das baut selbst.');
    process.exit(1);
  }
}

const BREIT = 844, HOCH = 390;
const messwerte = {};

/** Im Torbetrieb wird nur gemessen, nicht aufgenommen und nicht getastet.
 *
 *  Das Bauraster braucht rund zehn Minuten - es tippt 2240 Stellen an. In
 *  einer Kette, die zweieinhalb Minuten dauert, hat das nichts zu suchen; es
 *  beantwortet ausserdem eine Entwurfsfrage ("wo darf man bauen"), keine
 *  Regressionsfrage. Das Tor faehrt die schnellen Messungen: Belegung des
 *  Bildschirms, doppelte Beschriftungen, kleinste Trefferflaeche. */
const TOR = process.argv.includes('--tor');
const befunde = [];
const fail = (m) => befunde.push(m);

/** Die Grenzen. Alle vier sind an v239 gemessen, mit Luft nach oben - eine
 *  Ratsche, kein Soll (Regel 2: anteilig, nicht absolut).
 *
 *  Sie halten fest, was v239 gekostet hat. Ohne sie wandert die Bedienung
 *  beim naechsten Umbau still zurueck ueber das Feld, und kein Tor sagt ein
 *  Wort - genau die Klasse, an der `kartenprobe` in v229 gebrochen ist: ein
 *  Werkzeug, dessen Eingang niemand prueft, ist im Ernstfall kaputt. */
const GRENZEN = {
  ruhe: 16,        // gemessen 13,0 %
  bauwahl: 24,     // gemessen 19,7 %
  // gemessen 32,9 % (v248). Der Verlauf steht dabei, weil eine Ratsche ohne
  // ihn nur eine Zahl ist: v239 31,9 -> v246 35,4 (der Verbund und die
  // Verbundzeile kamen dazu) -> v247 31,3 (der Steg endet an seinem Inhalt)
  // -> v248 32,9 (die Zweige tragen ihre Wirkung). Die Grenze steht ueber
  // dem Gemessenen und nicht darauf: 33 waere eine Nadel gewesen, und eine
  // Ratsche, die beim naechsten Textwechsel von selbst anschlaegt, wird
  // nach zwei Runden hochgesetzt statt ernst genommen.
  pruefsteg: 34,
  welle: 16,       // gemessen 13,2 %
};
/** Wieviele Beschriftungen zugleich doppelt im Bild stehen duerfen.
 *
 *  Null. Bei offener Turmwahl standen bis v238 Bogenturm, Frostturm, Moerser,
 *  Prisma und "Welle 1 starten" je zweimal da - die Leiste unten und die Wahl
 *  am Tipppunkt fuehrten dieselbe Liste, verschieden gesetzt. Das ist
 *  Regel 15 als Bedienoberflaeche: gepflegt wird eine von beiden. */
const DOPPELT_MAX = 0;

/** Wieviele verschiedene Schriftgroessen die Spielansicht haben darf.
 *
 *  Fuenf. Gemessen standen im Ruhezustand ELF nebeneinander - 8, 10, 10,5,
 *  11, 11,5, 12, 13, 13,33, 15, 16 und 17 Punkte -, von denen vier dasselbe
 *  meinen und keine zwei einen erkennbaren Rang trennen. Eine Skala hat drei
 *  bis fuenf Stufen; alles darueber ist Zufall aus der Entstehungsgeschichte.
 *
 *  **Gezaehlt wird an den BLATTKNOTEN.** Ein Behaelter traegt den Text seiner
 *  Kinder und meldet dabei seine eigene, geerbte Groesse - 16 px vom Koerper
 *  und 13,33 px von der Voreinstellung fuer Knoepfe. Beide sind nie gesetzt
 *  worden und nirgends zu sehen; sie mitzuzaehlen hiesse, eine Skala an
 *  Knoten zu messen, die keine Schrift zeigen. */
const GROESSEN_MAX = 5;

const browser = await browserStarten();

let nr = 0;
const schuss = async (seite, name) => {
  if (TOR) return null;
  nr += 1;
  const p = join(AUS, `${String(nr).padStart(2, '0')}-${name}.png`);
  await seite.screenshot({ path: p });
  console.log(`  ${p}`);
  return p;
};

/** Wieviel des Bildschirms gehoert der Bedienung?
 *
 *  **Nicht ueber Umrisskaesten.** Die lassen sich durch Verschachteln
 *  kleinrechnen: ein Behaelter der Hoehe null mit absolut gesetzten Kindern
 *  meldet null Flaeche und deckt trotzdem alles zu. Gefragt wird deshalb der
 *  Browser selbst - `elementFromPoint` ueber ein Raster von 4 Punkten - und
 *  gezaehlt wird, was an dieser Stelle WIRKLICH getroffen wird. Diese Zahl
 *  kann keine Umbauform beschoenigen.
 *
 *  Zwei Zahlen, weil es zwei Schaeden sind: `gesperrt` ist, was den Tipp
 *  abfaengt (dort kommt man nicht mehr ans Feld), `bemalt` ist, was das Bild
 *  ueberdeckt - auch dann, wenn es Tipps durchlaesst wie der Verlauf der
 *  Kopfzeile. */
const belegung = (seite) => seite.evaluate(() => {
  const WURZELN = '#hud, #dock, #b-wave, #inspector, #pick, #coach, #perf, #v-version, #werkzeuge';
  const w = innerWidth, h = innerHeight, S = 4;
  let gesperrt = 0, bemalt = 0, gesamt = 0;
  const malt = new Set();
  for (const e of document.querySelectorAll(`${WURZELN}, ${WURZELN.split(', ').map((s) => `${s} *`).join(', ')}`)) {
    const cs = getComputedStyle(e);
    const g = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    const a = g ? (Number(g[1].split(',')[3] ?? 1)) : 0;
    const hatBild = cs.backgroundImage !== 'none';
    if ((g && a > 0.12) || hatBild) malt.add(e);
  }
  for (let y = S / 2; y < h; y += S) {
    for (let x = S / 2; x < w; x += S) {
      gesamt += 1;
      const e = document.elementFromPoint(x, y);
      if (e && e.closest(WURZELN)) gesperrt += 1;
      // Bemalt: irgendein malendes Element deckt diesen Punkt.
      for (const m of malt) {
        const r = m.getBoundingClientRect();
        if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) { bemalt += 1; break; }
      }
    }
  }
  return { gesperrt: 100 * gesperrt / gesamt, bemalt: 100 * bemalt / gesamt };
});

/** Welche Schriftgroessen zeigt die Spielansicht wirklich - an den Blaettern?
 *
 *  Ein Knoten gilt als Blatt, wenn er Text hat und kein Kindknoten ihn
 *  traegt. Das ist enger als `children.length === 0`: ein `<span>` mit einem
 *  `<b>` darin hat Kinder, zeigt aber selbst Text. */
const schriftgroessen = (seite) => seite.evaluate(() => {
  const sichtbar = (e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 1 && r.height > 1 && cs.display !== 'none'
      && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05
      && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  };
  const zaehl = new Map();
  for (const e of document.querySelectorAll('#app *')) {
    if (!sichtbar(e)) continue;
    // Nur eigener Text, nicht der der Kinder.
    const eigen = [...e.childNodes]
      .filter((n) => n.nodeType === 3 && (n.textContent ?? '').trim())
      .length > 0;
    if (!eigen) continue;
    const g = parseFloat(getComputedStyle(e).fontSize);
    zaehl.set(g, (zaehl.get(g) ?? 0) + 1);
  }
  return [...zaehl].sort((a, b) => a[0] - b[0]).map(([g, n]) => ({ g, n }));
});

/** Welche sichtbaren Beschriftungen stehen ZWEIMAL im Bild?
 *
 *  Gezaehlt werden nur Blattknoten - ein Behaelter traegt den Text seiner
 *  Kinder, und jede Verschachtelung waere sonst ein Treffer. Und nur Text ab
 *  drei Zeichen: "6x" und "1x" stehen absichtlich mehrfach. */
const doppelteBeschriftung = (seite) => seite.evaluate(() => {
  const zaehl = new Map();
  for (const e of document.querySelectorAll('#app *')) {
    if (e.children.length) continue;
    const t = (e.textContent ?? '').trim();
    if (t.length < 3) continue;
    // Reine Zahlen zaehlen nicht. Der Preis steht absichtlich zweimal da -
    // am Leistenknopf, damit man sieht was man sich leisten kann, und in der
    // Turmwahl, weil dort bezahlt wird (B2 des Bedienungs-Abgleichs verlangt
    // eine "benannte Flaeche, die ihren Preis traegt"). Gemeint ist die
    // doppelte BESCHRIFTUNG, nicht die doppelte Zahl.
    if (/^[\d.,\s×x/-]+$/.test(t)) continue;
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    if (r.width < 2 || r.height < 2) continue;
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) continue;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
    zaehl.set(t, (zaehl.get(t) ?? 0) + 1);
  }
  return [...zaehl].filter(([, n]) => n > 1).map(([t, n]) => `${n}x "${t}"`);
});

/** Was steht wo, wie gross, in welcher Farbe? */
const layout = (seite) => seite.evaluate(() => {
  const raus = [];
  const sichtbar = (e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 1 && r.height > 1 && cs.display !== 'none'
      && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05
      && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  };
  for (const e of document.querySelectorAll('#app *')) {
    if (!sichtbar(e)) continue;
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    raus.push({
      id: e.id || '', klasse: String(e.className || ''), tag: e.tagName.toLowerCase(),
      text: (e.textContent ?? '').trim().slice(0, 40),
      x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      farbe: cs.color, grund: cs.backgroundColor,
      groesse: cs.fontSize, gewicht: cs.fontWeight, radius: cs.borderRadius,
    });
  }
  return raus;
});

// Regel 14: das Menue ist auf jeder Fenstergroesse dieselbe eingepasste Welt.
const WELT_B = 1920, WELT_H = 1080;
const nachSchirm = (wx, wy, w, h) => {
  const k = Math.min(w / WELT_B, h / WELT_H);
  return [wx * k + (w - WELT_B * k) / 2, wy * k + (h - WELT_H * k) / 2];
};
const insSpiel = async (s, w, h) => {
  for (const [wx, wy] of [[384, 620], [1209, 838]]) {
    const [x, y] = nachSchirm(wx, wy, w, h);
    await s.mouse.click(x, y);
    await s.waitForTimeout(500);
  }
  for (let i = 0; i < 8; i += 1) {
    if (await s.evaluate(() => document.getElementById('coach')?.hidden !== false)) break;
    await s.evaluate(() => document.getElementById('coach-skip')?.click());
    await s.waitForTimeout(220);
  }
  return !(await s.evaluate(() => document.getElementById('hud')?.hidden));
};

const neueSeite = async (w, h, mobil = true) => {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2, isMobile: mobil, hasTouch: mobil,
  });
  const s = await ctx.newPage();
  s.on('pageerror', (e) => console.log(`  Ausnahme: ${e.message}`));
  await s.goto(`file://${DATEI}`);
  await s.waitForTimeout(2200);
  return s;
};

console.log('Aufnahmen:');

// ============================================================ Seite A: Bilder
const a = await neueSeite(BREIT, HOCH);
await schuss(a, 'landkarte');
messwerte.landkarte = await layout(a);
if (!(await insSpiel(a, BREIT, HOCH))) { console.error('Kein Weg ins Spiel.'); process.exit(1); }
await a.waitForTimeout(600);
await schuss(a, 'spiel-ruhe');
messwerte.ruhe = await layout(a);
messwerte.belegung = { ruhe: await belegung(a) };
messwerte.doppelt = { ruhe: await doppelteBeschriftung(a) };
messwerte.groessen = { ruhe: await schriftgroessen(a) };

/** Einen Bauplatz suchen, ohne etwas zu bauen: tippen, pruefen, wieder zu. */
const bauplatzSuchen = async (s, w, h, schritt = 22) => {
  for (let y = 70; y < h - 70; y += schritt) {
    for (let x = 20; x < w - 20; x += schritt) {
      await s.mouse.click(x, y);
      if (await s.evaluate(() => !document.getElementById('pick').hidden)) return { x, y };
      await s.evaluate(() => document.getElementById('i-close')?.click());
    }
  }
  return null;
};
const fleck = await bauplatzSuchen(a, BREIT, HOCH);
if (!fleck) { console.error('Kein Bauplatz gefunden.'); }
else {
  console.log(`  (Bauwahl geoeffnet bei ${fleck.x},${fleck.y})`);
  await a.waitForTimeout(300);
  await schuss(a, 'bauwahl');
  messwerte.bauwahl = await layout(a);
messwerte.belegung.bauwahl = await belegung(a);
  messwerte.doppelt.bauwahl = await doppelteBeschriftung(a);
  messwerte.groessen.bauwahl = await schriftgroessen(a);
  await a.evaluate(() => document.querySelector('#pick-row .pick-btn:not([disabled])')?.click());
  await a.waitForTimeout(500);
  await schuss(a, 'turm-gebaut');
  await a.mouse.click(fleck.x, fleck.y);
  await a.waitForTimeout(450);
  await schuss(a, 'pruefsteg');
  messwerte.pruefsteg = await layout(a);
messwerte.belegung.pruefsteg = await belegung(a);
  messwerte.groessen.pruefsteg = await schriftgroessen(a);
  await a.evaluate(() => document.getElementById('i-ziel-auf')?.click());
  await a.waitForTimeout(300);
  await schuss(a, 'pruefsteg-ziel');
  await a.evaluate(() => document.getElementById('i-close')?.click());
  await a.waitForTimeout(250);
}

await a.evaluate(() => document.getElementById('b-wave')?.click());
await a.waitForTimeout(2600);
await schuss(a, 'welle-frueh');
await a.waitForTimeout(4200);
await schuss(a, 'welle-mitte');
messwerte.welle = await layout(a);
messwerte.belegung.welle = await belegung(a);
await a.waitForTimeout(5200);
await schuss(a, 'welle-spaet');

await a.evaluate(() => document.getElementById('b-pause')?.click());
await a.waitForTimeout(400);
await schuss(a, 'pause');
messwerte.pause = await layout(a);
await a.evaluate(() => document.getElementById('p-optionen')?.click());
await a.waitForTimeout(350);
await schuss(a, 'optionen');
await a.evaluate(() => document.getElementById('o-zurueck')?.click());
await a.evaluate(() => document.getElementById('p-resume')?.click());
await a.waitForTimeout(300);
await a.evaluate(() => document.getElementById('dock-toggle')?.click());
await a.waitForTimeout(350);
await schuss(a, 'dock-zu');

// ======================================================= Seite B: Bauraster
//
// Die Frage des Nutzers, als Zahl: wieviele Stellen des Bildes nehmen einen
// Turm an - und sieht man ihnen das an? Gemessen wird durch Tippen, also
// genau so, wie ein Spieler es erfaehrt.
const b = TOR ? null : await neueSeite(BREIT, HOCH);
if (b && await insSpiel(b, BREIT, HOCH)) {
  await b.waitForTimeout(500);
  const grund = join(AUS, 'raster-grund.png');
  await b.screenshot({ path: grund });
  const raster = [];
  const SCH = 12;
  for (let y = 6; y < HOCH; y += SCH) {
    for (let x = 6; x < BREIT; x += SCH) {
      const ueber = await b.evaluate(([px, py]) => {
        const e = document.elementFromPoint(px, py);
        return !!(e && e.closest('#hud, #dock, #b-wave, #inspector, #pick, #coach, #perf'));
      }, [x, y]);
      if (ueber) { raster.push({ x, y, baubar: false, verdeckt: true }); continue; }
      await b.mouse.click(x, y);
      const auf = await b.evaluate(() => !document.getElementById('pick').hidden);
      raster.push({ x, y, baubar: auf, verdeckt: false });
      if (auf) await b.evaluate(() => { document.getElementById('pick').hidden = true; });
      await b.evaluate(() => document.getElementById('i-close')?.click());
    }
  }
  messwerte.bauraster = raster;
  const frei = raster.filter((r) => !r.verdeckt);
  const baubar = frei.filter((r) => r.baubar);
  console.log(`\nBauraster (Schritt ${SCH} px, iPhone quer):`);
  console.log(`  ${raster.length} Punkte, davon ${raster.length - frei.length} von der `
    + `Bedienung verdeckt (${(100 * (raster.length - frei.length) / raster.length).toFixed(1)} %)`);
  console.log(`  baubar: ${baubar.length} von ${frei.length} freien `
    + `(${(100 * baubar.length / frei.length).toFixed(1)} %)`);

  // Die Bau-Karte als Bild: gruen = nimmt einen Turm, rot = tut nichts.
  const bild = await loadImage(grund);
  const cv = createCanvas(bild.width, bild.height);
  const g = cv.getContext('2d');
  g.drawImage(bild, 0, 0);
  const s = bild.width / BREIT;
  for (const r of raster) {
    if (r.verdeckt) continue;
    g.fillStyle = r.baubar ? 'rgba(60,220,120,0.85)' : 'rgba(255,60,60,0.5)';
    g.beginPath();
    g.arc(r.x * s, r.y * s, r.baubar ? 5 : 3, 0, Math.PI * 2);
    g.fill();
  }
  writeFileSync(join(AUS, 'raster-baukarte.png'), cv.toBuffer('image/png'));
  console.log(`  ${join(AUS, 'raster-baukarte.png')}`);
}

// ======================================================= Seite C: Notebook
const c = TOR ? null : await neueSeite(1400, 900, false);
if (c) {
  nr += 1;
  await c.screenshot({ path: join(AUS, `${String(nr).padStart(2, '0')}-notebook-landkarte.png`) });
  console.log(`  ${join(AUS, `${String(nr).padStart(2, '0')}-notebook-landkarte.png`)}`);
}
if (c && await insSpiel(c, 1400, 900)) {
  await c.waitForTimeout(700);
  await schuss(c, 'notebook-spiel');
  messwerte.notebook = await layout(c);
}

console.log('\nBelegung des Bildschirms (844 x 390, Raster 4):');
for (const [k, v] of Object.entries(messwerte.belegung ?? {})) {
  console.log(`  ${k.padEnd(11)} gesperrt ${v.gesperrt.toFixed(1)} %   bemalt ${v.bemalt.toFixed(1)} %`);
}

writeFileSync(join(AUS, 'messwerte.json'), JSON.stringify(messwerte, null, 1));
console.log(`\nMesswerte: ${join(AUS, 'messwerte.json')}`);

// --- Das Urteil.
if (TOR) {
  for (const [zustand, grenze] of Object.entries(GRENZEN)) {
    const w = messwerte.belegung?.[zustand];
    if (!w) { fail(`Belegung "${zustand}" wurde gar nicht gemessen.`); continue; }
    if (w.gesperrt > grenze) {
      fail(`Belegung "${zustand}": die Bedienung sperrt ${w.gesperrt.toFixed(1)} % des `
        + `Bildschirms, erlaubt sind ${grenze} %. Auf dem Zielgeraet ist das Feld `
        + 'das Spiel; was darueber liegt, nimmt es weg.');
    }
  }
  for (const [zustand, liste] of Object.entries(messwerte.doppelt ?? {})) {
    if (liste.length > DOPPELT_MAX) {
      fail(`Doppelte Beschriftung im Zustand "${zustand}": ${liste.join(', ')}. `
        + 'Zwei Fassungen desselben Textes im selben Bild - gepflegt wird eine '
        + 'davon (Regel 15).');
    }
  }
  // **Gemessen wird die TREFFERFLAECHE, nicht der Kasten.**
  //
  // Der erste Entwurf nahm `getBoundingClientRect` und meldete prompt einen
  // Befund, den es nicht gibt: der Eintrag der Wellenvorschau ist 30 x 20
  // Punkte gross, traegt aber ein `::after` mit `inset: -18px -5px -8px` und
  // faengt den Finger damit auf 46 Punkten Hoehe. Ein Tor, das den Kasten
  // misst, verbietet genau die Loesung, die das Problem behebt.
  //
  // Gefragt wird deshalb der Browser: von der Mitte aus nach aussen tasten,
  // solange `elementFromPoint` noch diesen Knopf trifft.
  // **Ueber ALLE gemessenen Zustaende, nicht nur den Ruhezustand.**
  //
  // Der erste Anlauf zaehlte nur die Ruhe, und die Gegenprobe bewies damit
  // nichts: sie setzte `.pick-name` auf eine sechste Groesse, und die
  // Turmwahl ist im Ruhezustand gar nicht offen. Ein Tor, das einen Zustand
  // misst, prueft das Spiel nicht, sondern sein Standbild (Regel 3).
  const alleGr = new Map();
  for (const liste of Object.values(messwerte.groessen ?? {})) {
    for (const x of liste) alleGr.set(x.g, (alleGr.get(x.g) ?? 0) + x.n);
  }
  const gr = [...alleGr].sort((a, b) => a[0] - b[0]);
  console.log(`\nSchriftgroessen der Spielansicht: ${gr.map(([g, n]) => `${g}px x${n}`).join('  ')}`);
  if (gr.length > GROESSEN_MAX) {
    fail(`${gr.length} verschiedene Schriftgroessen in der Spielansicht `
      + `(${gr.map(([g]) => g).join(', ')}), erlaubt sind ${GROESSEN_MAX}. Eine Skala `
      + 'hat drei bis fuenf Stufen; alles darueber ist Zufall aus der '
      + 'Entstehungsgeschichte, und keine zwei Groessen trennen dann noch einen Rang.');
  }

  const zuKlein = await a.evaluate((mind) => {
    const raus = [];
    for (const e of document.querySelectorAll('#app button')) {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (r.width < 2 || r.height < 2) continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) continue;
      if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      const trifft = (x, y) => {
        const t = document.elementFromPoint(x, y);
        return !!t && (t === e || e.contains(t));
      };
      if (!trifft(cx, cy)) continue;   // verdeckt - das prueft das Browsertor
      const weit = (dx, dy) => {
        let n = 0;
        while (n < 60 && trifft(cx + dx * (n + 1), cy + dy * (n + 1))) n += 1;
        return n;
      };
      const b = weit(-1, 0) + weit(1, 0) + 1;
      const h = weit(0, -1) + weit(0, 1) + 1;
      if (Math.min(b, h) < mind) {
        raus.push(`${e.id || e.className || e.tagName} ("${(e.textContent ?? '').trim().slice(0, 14)}") `
          + `trifft auf ${b}x${h}`);
      }
    }
    return raus;
  }, 44);
  for (const k of zuKlein) {
    fail(`Trefferflaeche zu klein: ${k} - ein Daumen braucht 44 Punkte.`);
  }
  if (befunde.length) {
    console.error(`\nUX-TOR: ${befunde.length} Befund(e)`);
    for (const f of befunde) console.error(`  - ${f}`);
    await browser.close();
    process.exit(1);
  }
  console.log('UX-TOR: Belegung, Doppelungen und Trefferflaechen in Ordnung.');
}
await browser.close();
