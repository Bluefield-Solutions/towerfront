#!/usr/bin/env node
/**
 * Sichtprüfung im echten Browser — das Tor, das T12 schließt.
 *
 * Warum es das gibt, steht in Regel 7: In v50 lag die Turmleiste über der
 * Landkarte, man kam nicht ins Spiel, und **alle vierzehn Tore waren grün**.
 * Ein Tor prüft, ob etwas funktioniert — nicht, ob man es spielen kann.
 *
 * Der Grund für die Lücke ist technisch und einfach: die Bildabnahme zeichnet
 * nur die Leinwand, die Bedienung ist aber HTML. Und der Rauchtest läuft in
 * jsdom, das keine Kaskade rechnet — es kennt die Stilvorlage, aber nicht das
 * Ergebnis. `getBoundingClientRect()` liefert dort überall Null. Was ein
 * Element WIRKLICH verdeckt, wie groß es WIRKLICH ist und ob man es
 * überhaupt trifft, kann nur ein Browser beantworten.
 *
 * Deshalb lädt dieses Tor die fertig gebaute Datei — dieselbe, die
 * ausgeliefert wird — in Chromium, auf dem Zielgerät: iPhone quer.
 *
 * Es prüft acht Dinge, und jedes davon ist ein Fehler, der schon einmal
 * passiert ist oder unentdeckt geblieben wäre:
 *
 *   1. Die Datei lädt ohne Fehler in der Konsole.
 *   2. Im Menü ist keine Spielbedienung sichtbar (Regel 6, gemessen statt
 *      aus der Stilvorlage gelesen).
 *   3. Die Landkarte ist überall erreichbar — nichts liegt darüber. Das
 *      war v50.
 *   4. Man kommt durch Tippen ins Spiel.
 *   5. Jeder Knopf im Spiel ist daumengroß UND liegt obenauf. Ein Knopf,
 *      der groß genug ist, aber verdeckt wird, ist kein Knopf.
 *   6. Das Bild ist nicht einfarbig.
 *   7. Der Schreibtisch ist nicht ausgesperrt: mit der Maus, quer wie
 *      hochkant, liegt nichts ueber dem Feld und man kommt hinein. Das
 *      war v121 - ein vergessener zweiter Hochkant-Hinweis ohne
 *      Zeigerpruefung deckte jedes schmale Fenster zu.
 *   8. Symbol und Startbilder stehen in der ausgelieferten Datei. Das Symbol
 *      misst 180x180 und zeigt eine Form - ein leeres ist in v121 durch alle
 *      Tore gekommen (S136). Jedes Startbild wird gegen die Masse geprueft,
 *      mit denen es angemeldet ist: passt es nicht aufs Bildpunkt, uebergeht
 *      iOS es stillschweigend.
 *
 * Aufruf: npm run browser
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserStarten } from './chromium.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATEI = join(ROOT, 'dist/index.html');

// Das Zielgerät, nicht der Schreibtisch. Dieselben Maße wie die Bildabnahme.
const BREIT = 844, HOCH = 390;

// Derselbe Richtwert wie in `npm run beruehrung` — dort ist er aus der
// Stilvorlage gelesen, hier gemessen. Zwei Wege zur selben Zahl, und der
// zweite ist der, der zählt.
const MINDEST = 44;

/** Alles, was zur Spielbedienung gehört und im Menü nichts zu suchen hat. */
// Der Versionsstempel ist keine Bedienung - aber er gehoert zur
// Spielansicht, und auf dem Titelbildschirm steht die Version ohnehin schon.
// Ein zweites Mal daneben waere doppelt.
const BEDIENUNG = ['#hud', '#dock', '#b-wave', '#inspector', '#pick', '#perf', '#v-version'];

// --- Die eingepasste Abbildung des Menues.
//
// Sie steht in `drawMenuFrame` und in `screenToWorld` als dieselbe Formel;
// hier ist sie ein drittes Mal noetig, um einen Tippweg von einer
// Fenstergroesse auf eine andere zu uebertragen. Die Weltmasse werden aus
// der Konfiguration GELESEN und nicht abgeschrieben - eine abgeschriebene
// Zahl waere nach der naechsten Feldaenderung stumm falsch.
const KONF = readFileSync(join(ROOT, 'src/data/config.ts'), 'utf8');
const weltMass = (name) => {
  const t = new RegExp(`export const ${name} = (\\d+)`).exec(KONF);
  if (!t) {
    console.error(`BROWSERTOR: ${name} steht nicht in src/data/config.ts.`);
    process.exit(1);
  }
  return Number(t[1]);
};
const WELT_B = weltMass('WORLD_W'), WELT_H = weltMass('WORLD_H');

/** Der leere Grund hinter dem eingepassten Menue, als "r,g,b" wie
 *  `getImageData` ihn liefert - aus der Konfiguration gelesen. */
const LEER = (() => {
  const t = /voidDeep: '#([0-9a-fA-F]{6})'/.exec(KONF);
  if (!t) {
    console.error('BROWSERTOR: voidDeep steht nicht in src/data/config.ts.');
    process.exit(1);
  }
  const n = parseInt(t[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
})();

const einpassung = (w, h) => Math.min(w / WELT_B, h / WELT_H);
const nachWelt = (sx, sy, w, h) => {
  const k = einpassung(w, h);
  return { x: (sx - (w - WELT_B * k) / 2) / k, y: (sy - (h - WELT_H * k) / 2) / k };
};
const nachSchirm = (wx, wy, w, h) => {
  const k = einpassung(w, h);
  return [wx * k + (w - WELT_B * k) / 2, wy * k + (h - WELT_H * k) / 2];
};

const probleme = [];
const fail = (m) => probleme.push(m);

// --- Woher kommt der Browser?
//

if (!existsSync(DATEI)) {
  console.error('BROWSERTOR: dist/index.html fehlt - erst `npm run build`.');
  process.exit(1);
}

// --- Ist die gebaute Datei ueberhaupt die aktuelle?
//
// Dieses Tor prueft ein ERZEUGNIS, nicht den Quelltext - und darin liegt eine
// Falle, die es sonst nirgends gibt. Wer etwas aendert und `npm run browser`
// aufruft, ohne neu zu bauen, prueft den Stand von vorhin. Das Tor meldet
// dann Gruen fuer Arbeit, die es nie gesehen hat.
//
// Genau daran waere auch die Gegenprobe gescheitert: sie baut einen Fehler in
// den Quelltext ein und ruft das Tor auf. Ohne diese Pruefung haette es die
// alte dist geladen, nichts gefunden und ausgesehen wie ein Tor, das nicht
// anschlaegt - waehrend in Wahrheit der Eingriff nie angekommen ist.
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
    console.error('BROWSERTOR: dist/index.html ist aelter als der Quelltext.\n');
    console.error('Geprueft wuerde ein Stand von vorhin. Erst `npm run build`,');
    console.error('oder gleich `npm run browsertor` - das baut selbst.');
    process.exit(1);
  }
}

const browser = await browserStarten();
const ctx = await browser.newContext({
  viewport: { width: BREIT, height: HOCH },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const seite = await ctx.newPage();

// --- 1. Lädt die Datei überhaupt sauber?
const konsole = [];
seite.on('console', (m) => { if (m.type() === 'error') konsole.push(m.text()); });
seite.on('pageerror', (e) => konsole.push(`Ausnahme: ${e.message}`));

await seite.goto(`file://${DATEI}`);
// Zwei Bilder abwarten reicht nicht: der Bildvorrat wird beim ersten Lauf
// gebacken, und vorher steht die Bedienung noch nicht.
await seite.waitForTimeout(1800);

for (const z of konsole) fail(`Konsole: ${z}`);

/** Was ist wirklich zu sehen? Nicht was die Stilvorlage zusagt. */
const sichtbarkeit = (auswahl) => seite.evaluate((sel) => {
  const treffer = [];
  for (const s of sel) {
    for (const e of document.querySelectorAll(s)) {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      const drin = r.right > 0 && r.bottom > 0
        && r.left < innerWidth && r.top < innerHeight;
      const sichtbar = drin && r.width > 1 && r.height > 1
        && cs.display !== 'none' && cs.visibility !== 'hidden'
        && Number(cs.opacity) > 0.05;
      if (sichtbar) {
        treffer.push({
          wahl: s,
          text: (e.textContent ?? '').trim().slice(0, 40),
          x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height),
        });
      }
    }
  }
  return treffer;
}, auswahl);

// --- 2. Im Menü ist keine Spielbedienung sichtbar. Niemals.
//
// Die Regel steht seit v50 in CLAUDE.md und ist seither zweimal gebrochen
// worden. Sie war bisher nur im Rauchtest geprüft - und der sieht in jsdom
// zwar `hidden`, aber nicht, was trotzdem im Bild steht.
// Zuerst die UMKEHRUNG, und zwar ohne Liste.
//
// `BEDIENUNG` unten zaehlt auf, was nicht ins Menue gehoert - und genau das
// ist die Bauart, vor der Regel 6 warnt: eine Aufzaehlung schuetzt nur, was
// sie kennt. In v149 kam der Wegknopf dazu, stand nicht in der Liste, und
// die Gegenprobe "Wegknopf bleibt im Menue stehen" bewies nichts.
//
// Diese Pruefung dreht die Frage um: im Menue darf UEBERHAUPT KEIN
// bedienbares HTML-Element sichtbar sein. Das Menue wird auf die Leinwand
// gezeichnet; alles andere im Bild ist Spielbedienung, ganz gleich wie es
// heisst. Damit ist der naechste Knopf schon geschuetzt, bevor es ihn gibt.
{
  const alleKnoepfe = await seite.evaluate(() => {
    const raus = [];
    for (const e of document.querySelectorAll('button, [role="button"], input, select')) {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (r.width < 2 || r.height < 2) continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) continue;
      if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
      raus.push({ id: e.id || e.className || e.tagName, text: (e.textContent ?? '').trim().slice(0, 30) });
    }
    return raus;
  });
  if (alleKnoepfe.length) {
    for (const k of alleKnoepfe) {
      fail(`Im Menü ist "${k.id}"${k.text ? ` ("${k.text}")` : ''} bedienbar sichtbar - `
        + 'das Menü wird auf die Leinwand gezeichnet, jedes HTML-Element darin ist '
        + 'Spielbedienung (Regel 6).');
    }
  } else {
    console.log('Im Menü ist kein bedienbares HTML-Element sichtbar.');
  }
}

const imMenue = await sichtbarkeit(BEDIENUNG);
for (const t of imMenue) {
  fail(
    `Menü: "${t.wahl}" ist sichtbar (${t.w}x${t.h} bei ${t.x},${t.y}` +
    `${t.text ? `, "${t.text}"` : ''}) - im Menü gehört keine Spielbedienung hin.`,
  );
}

// --- 3. Liegt etwas über der Landkarte?
//
// Das ist v50, wörtlich: die Turmleiste lag quer über der Karte, und man kam
// nicht mehr ins Spiel. Geprüft wird mit `elementFromPoint` über ein Raster -
// die einzige Frage, die zählt, ist: was trifft mein Daumen hier?
const verdeckt = await seite.evaluate((sel) => {
  const stoerer = new Set();
  for (const s of sel) for (const e of document.querySelectorAll(s)) stoerer.add(e);
  const gefunden = [];
  const schritt = 40;
  for (let y = schritt / 2; y < innerHeight; y += schritt) {
    for (let x = schritt / 2; x < innerWidth; x += schritt) {
      let e = document.elementFromPoint(x, y);
      while (e) {
        if (stoerer.has(e)) {
          gefunden.push({ x: Math.round(x), y: Math.round(y), id: e.id || e.className });
          break;
        }
        e = e.parentElement;
      }
    }
  }
  return gefunden;
}, BEDIENUNG);
if (verdeckt.length) {
  const erste = verdeckt.slice(0, 3).map((v) => `${v.x},${v.y} -> ${v.id}`).join('; ');
  fail(
    `Menü: an ${verdeckt.length} von ${Math.ceil(BREIT / 40) * Math.ceil(HOCH / 40)} ` +
    `Rasterpunkten liegt Bedienung über der Landkarte (${erste}).`,
  );
}

// --- 4. Kommt man ins Spiel?
//
// Die Landkarte wird auf der Leinwand gezeichnet, ihre Trefferflächen stehen
// nur im Spielzustand. Statt in den Zustand zu greifen wird getippt, wie ein
// Mensch tippt: ein Raster über die Leinwand, bis die Spielansicht auftaucht.
// Das ist zugleich der ehrlichere Test - er fragt nicht "gibt es einen
// Knopf", sondern "komme ich rein".
//
// Der Weg wird dabei MITGESCHRIEBEN, in Weltkoordinaten. Pruefung 7 spielt
// ihn auf Schreibtischfenstern nach: das Menue ist an jeder Groesse dieselbe
// eingepasste Welt, derselbe Weltpunkt trifft dort also dasselbe. Damit
// braucht Pruefung 7 kein eigenes Raster - und vor allem keine Kopie der
// Knopfkoordinaten, die nach der naechsten Umstellung still falsch waere.
let start = null;
const pfad = [];
for (let y = 60; y < HOCH - 20 && !start; y += 50) {
  for (let x = 40; x < BREIT - 20 && !start; x += 60) {
    await seite.mouse.click(x, y);
    pfad.push(nachWelt(x, y, BREIT, HOCH));
    await seite.waitForTimeout(90);
    const drin = await seite.evaluate(() => !document.getElementById('hud')?.hidden);
    if (drin) start = { x, y };
  }
}

if (!start) {
  fail('Man kommt durch Tippen nicht ins Spiel - kein Punkt der Landkarte startet eine Partie.');
} else {
  await seite.waitForTimeout(900);

  // --- 5. Ist im Spiel jeder Knopf zu treffen?
  //
  // Zwei Fragen, nicht eine. Gross genug ist die eine; obenauf zu liegen die
  // andere. `npm run beruehrung` beantwortet die erste aus der Stilvorlage -
  // hier wird beides am gerechneten Layout gemessen.
  //
  // **Und zwar in JEDEM Zustand, den man beim Spielen erreicht.**
  //
  // Bis v199 lief diese Messung genau einmal: gleich nach dem Betreten,
  // mit geschlossenem Pruefsteg, ohne Bauwahl, ohne Messtafel. Was in
  // diesen Zustaenden erscheint, hat sie nie gesehen - und genau dort
  // sassen die beiden Fehler, die der Nutzer gemeldet hat: das Kreuz des
  // Stegs war 21 Punkte breit, und die Messtafel lag ueber "Welle
  // starten". Ein Tor, das nur den Ruhezustand kennt, prueft das Spiel
  // nicht, sondern sein Standbild.
  const messeKnoepfe = (scope = null) => seite.evaluate(([mind, scope]) => {
    const raus = [];
    for (const e of document.querySelectorAll('button')) {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      const sichtbar = r.width > 1 && r.height > 1
        && cs.display !== 'none' && cs.visibility !== 'hidden'
        && Number(cs.opacity) > 0.05
        && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
      if (!sichtbar) continue;
      const mx = r.left + r.width / 2, my = r.top + r.height / 2;
      const meins = (x, y) => {
        let k = document.elementFromPoint(x, y);
        while (k) { if (k === e) return true; k = k.parentElement; }
        return false;
      };
      const eigen = meins(mx, my);
      // **Gemessen wird die ERREICHBARE Flaeche, nicht der Kasten.**
      //
      // Ein Knopf darf kleiner aussehen, als er zu treffen ist - eine leere
      // `::after`-Auflage schiebt die Flaeche nach aussen, ohne das Layout
      // anzufassen. Die Wellenvorschau lebt davon: 20 Punkte Bild, 46
      // Punkte Finger. Der Kasten haette sie als "ZU KLEIN" gemeldet.
      //
      // Und die Gegenrichtung faengt es auch: `overflow: hidden` am
      // Elternteil hat genau diese Auflage einmal auf 20 Punkte
      // zurueckgeschnitten, waehrend die Stilvorlage weiter 46 zusagte.
      // Aus dem Blatt ist das nicht zu lesen (Regel 12).
      const reichweite = (dx, dy) => {
        const ax = dx > 0 ? r.right : dx < 0 ? r.left : mx;
        const ay = dy > 0 ? r.bottom : dy < 0 ? r.top : my;
        let n = 0;
        while (n < mind && meins(ax + dx * (n + 1), ay + dy * (n + 1))) n++;
        return n;
      };
      const eh = eigen ? r.height + reichweite(0, -1) + reichweite(0, 1) : r.height;
      const ew = eigen ? r.width + reichweite(-1, 0) + reichweite(1, 0) : r.width;
      raus.push({
        name: e.id || e.className,
        text: (e.textContent ?? '').trim().slice(0, 24),
        w: Math.round(r.width), h: Math.round(r.height),
        ew: Math.round(ew), eh: Math.round(eh),
        klein: Math.min(ew, eh) < mind,
        eigen,
        drin: !!(scope && e.closest(scope)),
      });
    }
    return raus;
  }, [MINDEST, scope]);

  /** Einen Zustand herstellen, messen, und wieder aufraeumen.
   *
   *  `nurIn` grenzt die Messung auf eine Flaeche ein. Das ist kein
   *  Schlupfloch, sondern die Regel fuer eine SPERRENDE Karte: die
   *  Pausenkarte deckt das Feld absichtlich zu, und dann ist "der Turmknopf
   *  darunter ist verdeckt" kein Befund, sondern der Sinn der Sache.
   *  Ueberall sonst gilt: was sichtbar ist, muss zu treffen sein. */
  const inZustand = async (name, aufbau, abbau, nurIn = null) => {
    if (aufbau) await aufbau();
    await seite.waitForTimeout(350);
    const knoepfe = (await messeKnoepfe(nurIn)).filter((k) => !nurIn || k.drin);
    console.log(`\nKnöpfe — ${name} (gemessen, nicht zugesagt) - Kasten | erreichbar:`);
    for (const k of knoepfe) {
      const marke = k.klein ? ' ZU KLEIN' : k.eigen ? '' : ' VERDECKT';
      const gewachsen = k.ew > k.w || k.eh > k.h ? ` | ${k.ew}x${k.eh}` : '';
      console.log(`  ${(k.name || '?').padEnd(22)} ${String(k.w).padStart(4)}x`
        + `${String(k.h).padEnd(4)}${gewachsen.padEnd(12)}${marke}`);
      if (k.klein) {
        fail(`${name}: Knopf "${k.name}" ist erreichbar ${k.ew}x${k.eh} `
          + `(Kasten ${k.w}x${k.h}) - die kürzere Seite bleibt unter ${MINDEST} Punkten.`);
      }
      if (!k.eigen) {
        fail(`${name}: Knopf "${k.name}" wird in seiner Mitte von etwas anderem verdeckt.`);
      }
    }
    if (abbau) { await abbau(); await seite.waitForTimeout(250); }
  };

  await inZustand('im Spiel');

  // **Den echten Bauablauf gehen, nicht einen Zustand herbeireden.**
  //
  // Leeres Feld antippen -> Turmwahl -> Turmart druecken -> denselben Fleck
  // noch einmal antippen. Genau diese Kette hat der Nutzer als "das
  // Handling ist nicht gut" gemeldet, und genau sie stellt die beiden
  // Zustaende her, die vorher niemand gemessen hat.
  let bauFleck = null;
  for (let y = 70; y < HOCH - 70 && !bauFleck; y += 26) {
    for (let x = 24; x < BREIT * 0.62 && !bauFleck; x += 26) {
      await seite.mouse.click(x, y);
      const auf = await seite.evaluate(() => !document.getElementById('pick').hidden);
      if (auf) bauFleck = { x, y };
    }
  }
  if (!bauFleck) {
    fail('Kein Tipp auf freies Feld oeffnet die Turmwahl - so kommt man nicht zum Bauen.');
  } else {
    console.log(`\nBauwahl geöffnet mit einem Tipp auf ${bauFleck.x},${bauFleck.y}.`);

    // **Ein Tipp aufs Feld darf niemals Gold ausgeben** (B2).
    //
    // Bis v201 baute er sofort, sobald in der Turmleiste eine Sorte gewaehlt
    // war - auf der Ascheschlucht sind 73 % der Flaeche nicht bebaubar, und
    // nichts zeigt vorher welche. Geprueft wird das Gold, nicht der Code:
    // Leiste waehlen, aufs Feld tippen, Gold vergleichen.
    {
      const goldJetzt = () => seite.evaluate(() =>
        Number(document.getElementById('v-gold').textContent));
      await seite.evaluate(() => document.getElementById('i-close')?.click());
      await seite.evaluate(() => document.getElementById('tb-arrow').click());
      await seite.waitForTimeout(250);
      const vorher = await goldJetzt();
      await seite.mouse.click(bauFleck.x, bauFleck.y);
      await seite.waitForTimeout(350);
      const nachher = await goldJetzt();
      if (nachher !== vorher) {
        fail(`Ein Tipp aufs Feld hat ${vorher - nachher} Gold ausgegeben. `
          + 'Mit gewaehlter Turmsorte muss er die Wahl OEFFNEN, nicht bauen - '
          + 'sonst ist jeder Fehlgriff bezahlt.');
      }
      if (await seite.evaluate(() => document.getElementById('pick').hidden)) {
        fail('Ein Tipp aufs Feld mit gewaehlter Turmsorte oeffnet die Turmwahl nicht.');
      }
      // Und die gewaehlte Sorte muss darin hervorgehoben sein, sonst faengt
      // die Entscheidung von vorne an.
      if (!(await seite.evaluate(() => !!document.querySelector('.pick-btn[data-vor="1"]')))) {
        fail('In der Turmwahl ist die vorgewaehlte Sorte nicht hervorgehoben.');
      }
      // Bezahlt wird erst auf der benannten Flaeche.
      const konnte = await seite.evaluate(() => {
        const b = document.querySelector('.pick-btn:not([disabled])');
        if (!b) return false;
        b.click(); return true;
      });
      await seite.waitForTimeout(350);
      if (!konnte) {
        fail('In der Turmwahl war kein Turm baubar, obwohl der Fleck als bebaubar galt.');
      } else if ((await goldJetzt()) >= vorher) {
        fail('Ein Tipp auf die Turmwahl baut nicht - dann fuehrt kein Weg mehr zum Bauen.');
      }
      // Zurueck auf Anfang fuer die naechsten Zustaende.
      await seite.evaluate(() => document.getElementById('i-close')?.click());
      await seite.waitForTimeout(200);
    }
    await inZustand('mit offener Bauwahl');

    // Bauen, und danach denselben Fleck noch einmal antippen: das oeffnet
    // den Pruefsteg fuer den eben gesetzten Turm.
    const gebaut = await seite.evaluate(() => {
      const b = document.querySelector('#pick-row .pick-btn:not([disabled])');
      if (!b) return false;
      b.click();
      return true;
    });
    if (!gebaut) {
      fail('In der Turmwahl war kein einziger Turm baubar.');
    } else {
      await seite.waitForTimeout(400);
      if (!(await seite.evaluate(() => document.getElementById('pick').hidden))) {
        fail('Die Turmwahl bleibt nach dem Bauen offen - sie liegt dann ueber dem neuen Turm.');
      }
      await seite.mouse.click(bauFleck.x, bauFleck.y);
      await seite.waitForTimeout(400);
      if (await seite.evaluate(() => document.getElementById('inspector').hidden)) {
        fail('Ein Tipp auf den eben gebauten Turm oeffnet den Pruefsteg nicht.');
      } else {
        // Hier lebt das Kreuz, und hier lebt die Zielwahl - beides hat die
        // alte Messung nie gesehen. Das Kreuz war 21 Punkte breit.
        await inZustand('mit offenem Prüfsteg');

        // **Passt der Inhalt in den Steg?**
        //
        // Gemeldet hat das der Nutzer, nicht die Torkette: 322 Punkte
        // Inhalt in einem Kasten von 288, abgeschnitten wurde die
        // Zielwahl-Reihe. Gemessen wird mit und ohne aufgeklappte
        // Ziellogik - der zweite Fall braucht mehr Platz und war der, in
        // dem Verkaufen unter die Kante rutschte.
        for (const [wie, auf] of [['zu', false], ['auf', true]]) {
          await seite.evaluate((soll) => {
            const k = document.getElementById('i-ziel-auf');
            const offen = !document.getElementById('i-ziel').hidden;
            if (offen !== soll) k?.click();
          }, auf);
          await seite.waitForTimeout(300);
          const passt = await seite.evaluate(() => {
            const insp = document.getElementById('inspector');
            const kasten = Math.round(insp.getBoundingClientRect().height);
            const inhalt = insp.scrollHeight;
            // Und laeuft irgendein Text ueber seinen eigenen Kasten hinaus?
            const ueber = [];
            for (const e of insp.querySelectorAll('span, button, dt, dd, p')) {
              const cs = getComputedStyle(e);
              if (cs.overflow !== 'visible' || cs.position === 'absolute') continue;
              if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0) {
                ueber.push(`${e.id || e.className}: ${e.scrollWidth} in ${e.clientWidth}`);
              }
            }
            return { kasten, inhalt, ueber };
          });
          if (passt.inhalt > passt.kasten + 1) {
            fail(`Prüfsteg (Ziellogik ${wie}): ${passt.inhalt} Punkte Inhalt in einem Kasten `
              + `von ${passt.kasten} - unten wird abgeschnitten.`);
          }
          if (passt.ueber.length) {
            fail(`Prüfsteg (Ziellogik ${wie}): Text laeuft ueber seinen Kasten hinaus - `
              + passt.ueber.join('; '));
          }
          // **Stehen Wert und Beschriftung beieinander?**
          //
          // Auf dem Telefon ist der Steg fest so hoch wie das Fenster, und
          // die Werteliste hat einen Boden von einem Drittel - bei einer
          // kurzen Liste bleibt darin Platz uebrig, und ein Raster verteilt
          // uebrigen Platz auf seine Zeilen. Genau hier wirkt
          // `align-content: start`; am Schreibtisch ist der Steg seit v206
          // inhaltshoch, dort gibt es nichts zu verteilen.
          {
            const weit = await seite.evaluate(() => {
              const dts = [...document.querySelectorAll('.insp-stats dt')];
              const dds = [...document.querySelectorAll('.insp-stats dd')];
              let schlimm = { was: '', ab: -1 };
              for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
                const a = dts[i].getBoundingClientRect(), b = dds[i].getBoundingClientRect();
                const ab = Math.abs((a.top + a.height / 2) - (b.top + b.height / 2));
                if (ab > schlimm.ab) schlimm = { was: dts[i].textContent.trim(), ab };
              }
              return schlimm;
            });
            if (weit.ab > 12) {
              fail(`Prüfsteg (Ziellogik ${wie}): "${weit.was}" steht `
                + `${Math.round(weit.ab)} Punkte von seinem Wert entfernt (erlaubt 12). `
                + 'Ein Raster ohne `align-content` zieht seine Zeilen auseinander, sobald '
                + 'in der Liste Platz uebrig ist.');
            }
          }
          // **Und der Name eigens**, weil ihn die Pruefung darueber nicht
          // sieht: sie ueberspringt alles mit `overflow: hidden`, und genau
          // das traegt er - er kuerzt sich mit drei Punkten ab, statt seinen
          // Nachbarn zu ueberschreiben. Sichtbar bleibt er dabei trotzdem
          // unvollstaendig, und der Name ist das Wort, an dem man den Turm
          // erkennt. Auf 250 Punkten Steg blieben ihm bis v205 genau 67.
          {
            const kurz = await seite.evaluate(() => {
              const n = document.querySelector('.insp-name');
              return n && n.scrollWidth > n.clientWidth
                ? { text: n.textContent.trim(), fehlt: Math.round(n.scrollWidth - n.clientWidth) }
                : null;
            });
            if (kurz) {
              fail(`Prüfsteg (Ziellogik ${wie}): der Turmname ist abgeschnitten `
                + `("${kurz.text}", ${kurz.fehlt} Punkte fehlen). Wenn der Kopf eng wird, `
                + 'muss die Rolle nachgeben, nicht der Name.');
            }
          }
        }
        // Zustand zuruecklassen, wie er war: die Pruefungen danach messen
        // die Werteliste, und die gibt bei offener Ziellogik absichtlich
        // nach. Eine Pruefung, die den Zustand fuer die naechste veraendert,
        // misst deren Aufraeumen mit.
        await seite.evaluate(() => {
          if (!document.getElementById('i-ziel').hidden) {
            document.getElementById('i-ziel-auf')?.click();
          }
        });
        await seite.waitForTimeout(300);
        // Und es muss den Steg auch wirklich schliessen.
        await seite.evaluate(() => document.getElementById('i-close').click());
        await seite.waitForTimeout(300);
        if (!(await seite.evaluate(() => document.getElementById('inspector').hidden))) {
          fail('Das Kreuz schliesst den Pruefsteg nicht.');
        }
      }
    }
  }

  // **Der Steg mit einer KURZEN Liste - der Gegner aus der Wellenvorschau.**
  //
  // Er ist der Zustand, in dem auf dem Telefon Platz uebrig bleibt: fuenf
  // Zeilen in einem Steg, der so hoch ist wie das Fenster, ohne Ausbau und
  // ohne Fusszeile. Ein Raster verteilt uebrigen Platz auf seine Zeilen -
  // gemessen zog es Wert und Beschriftung rund zwanzig Punkte auseinander.
  // Beim Turm faellt das nicht auf, weil dessen Liste den Steg fuellt; genau
  // deshalb hat die Gegenprobe zu `align-content` an ihm nichts bewiesen.
  {
    const auf = await seite.evaluate(() => {
      const k = document.querySelector('.next-eintrag');
      if (!k) return false;
      k.click();
      return true;
    });
    await seite.waitForTimeout(350);
    const gegner = auf ? await seite.evaluate(() => {
      const el = document.getElementById('inspector');
      if (!el || el.hidden) return null;
      const dts = [...el.querySelectorAll('.insp-stats dt')];
      const dds = [...el.querySelectorAll('.insp-stats dd')];
      let schlimm = { was: '', ab: -1 };
      for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
        const a = dts[i].getBoundingClientRect(), b = dds[i].getBoundingClientRect();
        const ab = Math.abs((a.top + a.height / 2) - (b.top + b.height / 2));
        if (ab > schlimm.ab) schlimm = { was: dts[i].textContent.trim(), ab };
      }
      const n = el.querySelector('.insp-name');
      return { zeilen: dts.length, schlimm,
        name: n ? n.textContent.trim() : '', ab: n ? n.scrollWidth - n.clientWidth : 0 };
    }) : null;
    if (!gegner || !gegner.zeilen) {
      fail('Der Gegner aus der Wellenvorschau laesst sich nicht oeffnen - der Zustand '
        + 'mit der kuerzesten Werteliste bleibt damit ungemessen.');
    } else {
      console.log(`Gegnerinfo: ${gegner.zeilen} Wertezeilen, schlimmster Abstand `
        + `${Math.round(gegner.schlimm.ab)} P (${gegner.schlimm.was}), Name "${gegner.name}"`);
      if (gegner.schlimm.ab > 12) {
        fail(`Gegnerinfo: "${gegner.schlimm.was}" steht ${Math.round(gegner.schlimm.ab)} `
          + 'Punkte von seinem Wert entfernt (erlaubt 12). Bei einer kurzen Liste '
          + 'verteilt das Raster den uebrigen Platz auf seine Zeilen.');
      }
      if (gegner.ab > 0) {
        fail(`Gegnerinfo: der Gegnername ist abgeschnitten ("${gegner.name}", `
          + `${Math.round(gegner.ab)} Punkte fehlen).`);
      }
    }
    await seite.evaluate(() => document.getElementById('i-close')?.click());
    await seite.waitForTimeout(250);
  }

  // Mit angeschalteter Messtafel. Sie liegt ueber dem Feld, und der erste
  // Entwurf legte sie ausgerechnet auf "Welle starten".
  await inZustand('mit Messtafel',
    () => seite.evaluate(() => document.getElementById('b-mess').click()),
    () => seite.evaluate(() => document.getElementById('b-mess').click()));

  // In der Pause. Die Karte sperrt absichtlich - geprueft wird deshalb, was
  // AUF ihr steht, nicht was sie zudeckt.
  await inZustand('in der Pause',
    () => seite.evaluate(() => document.getElementById('b-pause').click()),
    () => seite.evaluate(() => document.getElementById('p-resume').click()),
    '#pause-menu');
}

// --- 5b. Folgt die Anzeige dem Zustand?
//
// Ein Umschalter, der sich druecken laesst und im Modell wirkt, aber im Bild
// nicht umspringt, ist ein kaputter Umschalter. Genau das ist bei der
// Ziellogik passiert: der Rauchtest mass, dass die Tuerme anders zielen, und
// die Knoepfe zeigten trotzdem den alten Stand - `sync` schreibt nur bei
// geaenderter Signatur ins DOM, und die Zielwahl stand nicht darin.
//
// jsdom haette das nicht gefunden: dort ist `aria-pressed` genauso gesetzt
// oder nicht. Was fehlte, war der Durchlauf durch die echte Schleife.
if (start) {
  const ziel = await seite.evaluate(async () => {
    const bau = document.querySelector('.pick-btn');
    return { hatWahl: !!bau };
  });
  void ziel;

  // Einen Turm bauen und den Pruefsteg oeffnen - durch Tippen, wie ein Mensch.
  let gebaut = false;
  for (let y = 90; y < HOCH - 50 && !gebaut; y += 40) {
    for (let x = 120; x < BREIT - 80 && !gebaut; x += 60) {
      await seite.mouse.click(x, y);
      await seite.waitForTimeout(70);
      const wahlOffen = await seite.evaluate(() => !document.getElementById('pick')?.hidden);
      if (!wahlOffen) continue;
      await seite.evaluate(() => document.querySelector('.pick-btn')?.click());
      await seite.waitForTimeout(280);
      await seite.mouse.click(x, y);
      await seite.waitForTimeout(280);
      gebaut = await seite.evaluate(() => !document.getElementById('inspector')?.hidden);
    }
  }

  if (!gebaut) {
    fail('Es liess sich kein Turm bauen und antippen - der Prüfsteg ging nie auf.');
  } else {
    const stand = await seite.evaluate(async () => {
      const knoepfe = [...document.querySelectorAll('.insp-ziel .ziel')];
      if (!knoepfe.length) return { fehlt: true };
      const anders = knoepfe.find((k) => k.getAttribute('aria-pressed') !== 'true');
      if (!anders) return { keineAuswahl: true };
      anders.click();
      await new Promise((r) => setTimeout(r, 250));
      return {
        anzahl: knoepfe.length,
        gewaehlt: anders.dataset.ziel,
        an: [...document.querySelectorAll('.insp-ziel .ziel')]
          .filter((k) => k.getAttribute('aria-pressed') === 'true')
          .map((k) => k.dataset.ziel),
      };
    });
    if (stand.fehlt) {
      fail('Im Prüfsteg fehlen die Knöpfe für die Ziellogik.');
    } else if (stand.keineAuswahl) {
      fail('Alle Ziellogik-Knöpfe sind gleichzeitig aktiv.');
    } else if (stand.an.length !== 1 || stand.an[0] !== stand.gewaehlt) {
      fail(
        `Ziellogik: nach dem Tippen auf "${stand.gewaehlt}" ist ` +
        `${stand.an.length === 0 ? 'kein Knopf' : `"${stand.an.join(', ')}"`} aktiv. ` +
        'Die Anzeige folgt dem Zustand nicht.',
      );
    } else {
      console.log(`\nZiellogik: ${stand.anzahl} Knöpfe, Tippen auf "${stand.gewaehlt}" springt um.`);
    }

    // Und wird im offenen Steg etwas abgeschnitten?
    //
    // Das ist NICHT dieselbe Frage wie "liegt es im Fenster". Der Pruefsteg
    // hat `overflow: hidden`, also schneidet ER ab, nicht der Bildschirm.
    // Ein Knopf kann vollstaendig im Fenster liegen und trotzdem unsichtbar
    // sein, weil sein Behaelter dort aufhoert.
    //
    // Genau so ist es passiert: die vier Ziel-Knoepfe machten den Inhalt 284
    // Punkte hoch bei 238 sichtbaren, und "Verkaufen" verschwand. Gemessen
    // gegen das Fenster sah alles gut aus - der Knopf endete bei 318 von 390.
    // Eine neue Einstellung darf keine alte Handlung verdraengen.
    const beschnitten = await seite.evaluate(() => {
      const steg = document.getElementById('inspector');
      if (!steg || steg.hidden) return [];
      const aussen = steg.getBoundingClientRect();
      const raus = [];
      for (const e of steg.querySelectorAll('button')) {
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.bottom > aussen.bottom + 1 || r.top < aussen.top - 1) {
          raus.push({
            name: e.id || e.className,
            text: (e.textContent ?? '').trim().slice(0, 20),
            unten: Math.round(r.bottom), grenze: Math.round(aussen.bottom),
          });
        }
      }
      return raus;
    });
    for (const b of beschnitten) {
      fail(
        `Prüfsteg schneidet "${b.text || b.name}" ab: der Knopf endet bei ${b.unten}, ` +
        `der Steg bei ${b.grenze}. Im Fenster liegt er - im Behälter nicht.`,
      );
    }

    // --- 5c. Sind die WERTE des Turms ueberhaupt zu sehen? (v138)
    //
    // Der Befund, der dieses Tor gebraucht haette: der Pruefsteg darf 284
    // Punkte hoch sein, und Kopfzeile, Ausbau, Ziellogik und Verkaufen
    // verlangten zusammen mehr. Uebrig blieben fuer die Werteliste
    // GEMESSENE VIER Bildpunkte - Schaden, Reichweite und Takt waren auf dem
    // Zielgeraet unsichtbar, und zwanzig Tore meldeten gruen.
    //
    // Geprueft wird nicht die Stilvorlage, sondern das Ergebnis: wieviele
    // Zeilen liegen VOLLSTAENDIG im sichtbaren Bereich ihres Behaelters?
    // Eine Liste, die rollt, ist in Ordnung - eine, die nichts zeigt, nicht.
    const werte = await seite.evaluate(() => {
      const liste = document.getElementById('i-stats');
      if (!liste || liste.hidden) return { fehlt: true };
      const box = liste.getBoundingClientRect();
      const zeilen = [...liste.querySelectorAll('dt')];
      const drin = zeilen.filter((z) => {
        const r = z.getBoundingClientRect();
        return r.bottom <= box.bottom + 1 && r.top >= box.top - 1;
      });
      return {
        hoehe: Math.round(box.height),
        zeilen: zeilen.length,
        sichtbar: drin.length,
        namen: drin.map((z) => (z.textContent ?? '').trim()),
      };
    });
    const MINDEST_ZEILEN = 3;
    if (werte.fehlt) {
      fail('Im offenen Prüfsteg fehlt die Werteliste des Turms.');
    } else if (werte.zeilen === 0) {
      fail('Die Werteliste des Turms ist leer - dann prüft die Messung nichts.');
    } else if (werte.sichtbar < Math.min(MINDEST_ZEILEN, werte.zeilen)) {
      fail(
        `Turmwerte: von ${werte.zeilen} Zeilen sind ${werte.sichtbar} zu sehen ` +
        `(Liste ${werte.hoehe} Punkte hoch). Ohne Werte lässt sich nicht planen.`,
      );
    } else {
      console.log(
        `Turmwerte: ${werte.sichtbar} von ${werte.zeilen} Zeilen sichtbar ` +
        `auf ${werte.hoehe} Punkten — ${werte.namen.join(', ')}.`,
      );
    }

    // --- 5e. Steht die Version im laufenden Spiel? (v151)
    //
    // Sie stand bisher nur auf dem Titelbildschirm - wer eine Partie
    // fortsetzt, sah sie nie. Geprueft wird nicht, DASS ein Element da ist,
    // sondern dass eine Versionsnummer darin steht: ein leeres Feld sieht im
    // Bauplan genauso aus wie ein gefuelltes.
    const stempel = await seite.evaluate(() => {
      const e = document.getElementById('v-version');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return {
        text: (e.textContent ?? '').trim(),
        sichtbar: r.width > 1 && r.height > 1 && cs.display !== 'none'
          && Number(cs.opacity) > 0.05,
        groesse: Math.round(parseFloat(cs.fontSize)),
        klick: cs.pointerEvents,
      };
    });
    if (!stempel) {
      fail('Im laufenden Spiel fehlt der Versionsstempel.');
    } else if (!/^v\d+$/.test(stempel.text)) {
      fail(`Der Versionsstempel zeigt "${stempel.text}" - erwartet wird vNNN.`);
    } else if (!stempel.sichtbar) {
      fail(`Der Versionsstempel "${stempel.text}" steht da, ist aber nicht zu sehen.`);
    } else if (stempel.klick !== 'none') {
      fail('Der Versionsstempel faengt Tipps ab (pointer-events). Genau daran ist '
        + 'in v9 die Bedienung auf dem Handy gescheitert.');
    } else {
      console.log(`Versionsstempel: ${stempel.text}, ${stempel.groesse} px, nicht anfassbar.`);
    }

    // --- 5d. Sind die Zielknoepfe noch zu treffen? (v146)
    //
    // Sie stehen in EINER Reihe, eine Spalte je Modus. Jeder weitere Modus
    // macht jeden Knopf schmaler - und die Reihe steht in einem Steg, dessen
    // Breite feststeht. Das laesst sich nicht abschaetzen, es muss gemessen
    // werden: `npm run beruehrung` liest die Mindesthoehe aus der
    // Stilvorlage, ueber die BREITE sagt sie nichts, weil die erst im Raster
    // entsteht.
    //
    // Bis v145 fiel diese Reihe durch jedes Raster: die Knopfmessung oben
    // kennt die Klassen der Kopfzeile und der Turmleiste, nicht die des
    // Pruefstegs.
    // Seit v201 stehen sie hinter einem Schalter - erst aufklappen, sonst
    // misst diese Pruefung fuenf Knoepfe der Groesse null und meldet das
    // als Befund. Das Aufklappen ueber den Knopf selbst zu machen ist dabei
    // kein Umweg, sondern eine Messung mit: er muss es koennen.
    await seite.evaluate(() => {
      if (document.getElementById('i-ziel')?.hidden) {
        document.getElementById('i-ziel-auf')?.click();
      }
    });
    await seite.waitForTimeout(300);
    if (await seite.evaluate(() => document.getElementById('i-ziel').hidden)) {
      fail('Der Schalter "Ziel" klappt die Ziellogik nicht auf.');
    }
    const zielKnoepfe = await seite.evaluate(() => [...document.querySelectorAll('.ziel')]
      .map((b) => {
        const r = b.getBoundingClientRect();
        return {
          text: (b.textContent ?? '').trim(),
          w: Math.round(r.width), h: Math.round(r.height),
          // Passt die Beschriftung ueberhaupt hinein? Ein Knopf, dessen Wort
          // abgeschnitten ist, ist gross genug zum Treffen und trotzdem
          // unbrauchbar.
          ueber: b.scrollWidth - b.clientWidth,
        };
      }));
    if (!zielKnoepfe.length) {
      fail('Im offenen Prüfsteg steht keine Ziellogik - dann prüft die Messung nichts.');
    } else {
      console.log(`Zielknöpfe: ${zielKnoepfe.map((k) => `${k.text} ${k.w}x${k.h}`).join(', ')}`);
      // 44 Punkte ist der Richtwert von Apple und Google fuer die Hoehe. In
      // der Breite ist eine Reihe gleich breiter Knoepfe traditionell
      // schmaler zulaessig - aber unter 32 Punkten trifft ein Daumen den
      // Nachbarn.
      for (const k of zielKnoepfe) {
        if (k.h < 44) fail(`Zielknopf "${k.text}" ist nur ${k.h} Punkte hoch (44 nötig).`);
        if (k.w < 40) {
          fail(`Zielknopf "${k.text}" ist nur ${k.w} Punkte breit. Bei ${zielKnoepfe.length} `
            + 'Modi in einer Reihe trifft der Daumen den Nachbarn.');
        }
        if (k.ueber > 1) {
          fail(`Zielknopf "${k.text}" schneidet seine Beschriftung um ${k.ueber} Punkte ab.`);
        }
      }
      // Gleich breit, nicht nur breit genug.
      //
      // Das ist die eigentliche Aussage, und die Mindestbreite oben ist nur
      // ihr Nebeneffekt. `1fr` verteilt den UEBERSCHUSS gleichmaessig und
      // gibt jedem Knopf vorher so viel, wie sein Wort braucht - "Wund"
      // bekommt damit mehr als "Voll", ohne dass es einen Grund gaebe.
      // Solange die Woerter kurz sind, faellt dabei niemand unter das
      // Fingermass, und eine reine Mindestbreite meldete nichts: die
      // Gegenprobe "Zielknoepfe verschieden breit" schlug erst an, als
      // zufaellig ein langes Wort dabei war. Eine Pruefung, die von der
      // Wortlaenge abhaengt, prueft nicht das Raster.
      const schmal = Math.min(...zielKnoepfe.map((k) => k.w));
      const breit = Math.max(...zielKnoepfe.map((k) => k.w));
      if (breit - schmal > 2) {
        fail(`Die Zielknöpfe sind verschieden breit (${schmal} bis ${breit} Punkte). `
          + 'Gleich grosse Schaltflaechen einer Reihe muessen gleich gross sein - '
          + 'sonst entscheidet die Wortlaenge, wie leicht ein Modus zu treffen ist.');
      }

      // Und die Reihe darf nicht umbrechen - zwei Zeilen schieben den
      // Verkaufen-Knopf aus dem Steg (der Fall aus v137).
      const zeilen = new Set(zielKnoepfe.map(() => 0));
      const oben = await seite.evaluate(() => [...document.querySelectorAll('.ziel')]
        .map((b) => Math.round(b.getBoundingClientRect().top)));
      void zeilen;
      if (new Set(oben).size > 1) {
        fail(`Die Ziellogik bricht auf ${new Set(oben).size} Zeilen um - `
          + 'das kostet Hoehe, die der Steg nicht hat.');
      }
    }

    // Und ein Bild davon. Die Zahlen oben sagen, dass die Knoepfe gross
    // genug sind und ihr Wort tragen - ob die Reihe GUT aussieht, sagt kein
    // Tor (Regel 8). Aufgenommen wird nur der Steg, nicht der ganze Schirm.
    {
      const steg = await seite.$('#inspector') ?? await seite.$('.insp') ?? null;
      if (steg) {
        mkdirSync(join(ROOT, 'bilder'), { recursive: true });
        writeFileSync(join(ROOT, 'bilder/ziellogik.png'), await steg.screenshot());
      }
    }

    // --- 8. Rollt etwas, ohne es anzuzeigen?
    //
    // Die Prüfung oben fragt nach Knöpfen, die abgeschnitten werden. D24 war
    // der andere Fall: TEXT, der abgeschnitten wird, und zwar völlig
    // regelkonform - der Behälter rollt ja. Nur sah man das nicht, und auf
    // dem iPhone quer endete die Werteliste mitten in einer Zeile.
    //
    // Geprüft wird deshalb nicht "hat die Werteliste einen Schleier",
    // sondern die Regel dahinter: **was rollt, muss es anzeigen.** Damit
    // greift sie auch für die nächste rollende Liste, die noch niemand
    // gebaut hat. Und die Gegenrichtung zählt mit: wer unten angekommen ist,
    // darf keinen Hinweis mehr sehen - ein Hinweis, der immer steht, ist
    // Deko.
    const rollend = await seite.evaluate(() => {
      const raus = [];
      for (const e of document.querySelectorAll('*')) {
        const st = getComputedStyle(e);
        if (!/auto|scroll/.test(st.overflowY)) continue;
        if (e.scrollHeight - e.clientHeight < 2) continue;      // rollt gar nicht
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;              // nicht sichtbar
        const rest = e.scrollHeight - e.clientHeight - e.scrollTop;
        raus.push({
          name: e.id || e.className || e.tagName,
          mehr: e.dataset ? e.dataset.mehr : undefined,
          rest: Math.round(rest),
        });
      }
      return raus;
    });
    const urteile = (liste) => {
      for (const r of liste) {
        if (r.rest > 1 && r.mehr !== '1') {
          fail(
            `"${r.name}" rollt noch ${r.rest} Punkte weiter, zeigt es aber nicht an ` +
            '(data-mehr fehlt). Technisch richtig, sichtbar wie ein Fehler.',
          );
        }
        if (r.rest <= 1 && r.mehr === '1') {
          fail(`"${r.name}" ist unten angekommen, behauptet aber weiter, es ginge weiter.`);
        }
      }
    };
    urteile(rollend);

    // Und jetzt der Teil, ohne den die Pruefung oben nichts wert ist.
    //
    // Seit die Werteliste in v138 vier von vier Zeilen zeigt, ROLLT im
    // ganzen Spiel nichts mehr. Die Schleife darueber lief also ueber eine
    // leere Liste und meldete gruen - zwei stehende Gegenproben ("Rollhinweis
    // abgeschaltet", "Rollhinweis steht auch am Ende noch") bewiesen ein Jahr
    // lang nichts, und niemand sah es, weil eine leere Schleife wie eine
    // bestandene aussieht. Genau Regel 13: wer eine Wirkung misst, schaltet
    // sie zuerst ein.
    //
    // Also wird der Zustand hergestellt: die Werteliste bekommt eine Hoehe,
    // bei der sie ueberlaeuft. Danach MUSS etwas rollen, und der Hinweis muss
    // sich in beide Richtungen richtig verhalten - oben angezeigt, unten
    // wieder weg. Geprueft wird die Ableitung, nicht die heutige Zeilenzahl.
    const messe = () => seite.evaluate(() => {
      const raus = [];
      for (const e of document.querySelectorAll('*')) {
        const st = getComputedStyle(e);
        if (!/auto|scroll/.test(st.overflowY)) continue;
        if (e.scrollHeight - e.clientHeight < 2) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        raus.push({
          name: e.id || e.className || e.tagName,
          mehr: e.dataset ? e.dataset.mehr : undefined,
          rest: Math.round(e.scrollHeight - e.clientHeight - e.scrollTop),
        });
      }
      return raus;
    });
    await seite.evaluate(() => {
      const l = document.getElementById('i-stats');
      // `min-height: 96px` in der Stilvorlage schlaegt eine blosse Hoehen-
      // grenze - beides setzen, sonst passiert nichts und die Pruefung
      // meldet wieder, dass sie nichts gefunden hat.
      if (l) {
        l.style.minHeight = '24px';
        l.style.maxHeight = '24px';
        l.style.flex = '0 0 24px';
        l.scrollTop = 0;
      }
    });
    await seite.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const eng = await messe();
    if (!eng.length) {
      fail('Die Rollprüfung fand nichts, was rollt - sie beweist damit nichts.');
    } else {
      urteile(eng);
      console.log(`Rollhinweis: ${eng.length} rollende Liste(n) im Blick, oben `
        + `${eng.filter((r) => r.mehr === '1').length} mit Hinweis.`);
      // Und die Gegenrichtung am selben Behaelter: ans Ende rollen, dann darf
      // kein Hinweis mehr stehen.
      await seite.evaluate(() => {
        const l = document.getElementById('i-stats');
        if (l) l.scrollTop = l.scrollHeight;
      });
      await seite.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      urteile(await messe());
    }
    await seite.evaluate(() => {
      const l = document.getElementById('i-stats');
      if (l) { l.style.minHeight = ''; l.style.maxHeight = ''; l.style.flex = ''; }
    });

    // --- 10. Die Messtafel darf im Spiel NICHT auftauchen (D27).
    //
    // Sie hat dieselbe Eigenschaft wie die Spielbedienung im Menue: sie
    // gehoert nur an eine Stelle, und wer sie sonst sieht, sieht einen
    // Fehler. Regel 6 in neuer Kleidung - deshalb wird hier beides geprueft,
    // nicht nur das Auftauchen mit Raute.
    // Der Hochkant-Hinweis gehoert im Querformat nicht auf den Schirm - er
    // deckt sonst das ganze Spiel zu.
    const querHinweis = await seite.evaluate(() => {
      const q = document.getElementById('quer');
      return q ? getComputedStyle(q).display !== 'none' : null;
    });
    if (querHinweis === null) {
      fail('Der Hochkant-Hinweis fehlt ganz - aufrecht gehaltene Telefone sehen ein gequetschtes Feld.');
    } else if (querHinweis) {
      fail('Der Hochkant-Hinweis liegt im QUERFORMAT ueber dem Spiel.');
    }

    const tafelImSpiel = await seite.evaluate(() => !!document.getElementById('messtafel'));
    if (tafelImSpiel) {
      fail('Die Messtafel steht im Spiel, obwohl "#messung" nicht in der Adresse steht.');
    }

    // --- 9. Zeigt die Wellenvorschau Bilder statt Namen? (D20)
    //
    // Auf dem Telefon war die Zeile zu lang: drei Gegnerarten mit Namen
    // stapelten sich auf drei Zeilen ueber dem Spielfeld. Die Vorbilder
    // zeigen alle drei das Bild, nicht den Namen.
    //
    // Geprueft wird das Ergebnis, nicht die Umsetzung: hat jeder Eintrag der
    // Vorschau ein Bild? Der Farbtupfer von frueher ist als Rueckfall
    // erlaubt, solange der Bildvorrat laedt - aber hier, eine Sekunde nach
    // dem Betreten, ist er ein Fehler.
    const vorschau = await seite.evaluate(() => {
      const l = document.getElementById('n-list');
      if (!l || document.getElementById('next')?.hidden) return null;
      const eintraege = [...l.querySelectorAll('i')].filter((e) => !e.classList.contains('next-note')
        && !e.classList.contains('next-sprung'));
      return {
        eintraege: eintraege.length,
        bilder: l.querySelectorAll('img.next-bild').length,
        tupfer: l.querySelectorAll('b').length,
        hoehe: Math.round(document.getElementById('next').getBoundingClientRect().height),
        fenster: innerHeight,
      };
    });
    if (vorschau && vorschau.eintraege > 0) {
      if (vorschau.bilder === 0) {
        fail(
          `Wellenvorschau zeigt ${vorschau.eintraege} Gegnerart(en), aber kein einziges Bild ` +
          `(${vorschau.tupfer} Farbtupfer). Auf dem Telefon wird daraus wieder eine Textzeile.`,
        );
      }
      // Und sie darf das Spielfeld nicht zustellen.
      const anteil = vorschau.hoehe / vorschau.fenster;
      if (anteil > 0.22) {
        fail(
          `Wellenvorschau nimmt ${Math.round(anteil * 100)} % der Bildhoehe ` +
          `(${vorschau.hoehe} von ${vorschau.fenster}) - sie steht ueber dem Spielfeld.`,
        );
      }
      console.log(`\nWellenvorschau: ${vorschau.eintraege} Art(en), ${vorschau.bilder} Bild(er), `
        + `${vorschau.hoehe} von ${vorschau.fenster} Punkten hoch.`);
    }

    // Und die Gegenrichtung wirklich pruefen, statt sie nur zu behaupten.
    //
    // Der erste Entwurf prüfte beide Richtungen in EINER Momentaufnahme -
    // und die Gegenprobe "der Hinweis steht auch am Ende noch" blieb grün,
    // weil die Liste in dieser Aufnahme nie unten ankam. Eine Bedingung, die
    // im geprüften Zustand gar nicht auftreten kann, prüft nichts. Also wird
    // jetzt ans Ende gerollt und noch einmal gefragt.
    const amEnde = await seite.evaluate(() => {
      const raus = [];
      for (const e of document.querySelectorAll('*')) {
        const st = getComputedStyle(e);
        if (!/auto|scroll/.test(st.overflowY)) continue;
        if (e.scrollHeight - e.clientHeight < 2) continue;
        e.scrollTop = e.scrollHeight;
        e.dispatchEvent(new Event('scroll'));
        raus.push({ name: e.id || e.className || e.tagName, mehr: e.dataset ? e.dataset.mehr : undefined });
      }
      return raus;
    });
    for (const r of amEnde) {
      if (r.mehr === '1') {
        fail(
          `"${r.name}" ist ans Ende gerollt, behauptet aber weiter, es ginge weiter. ` +
          'Ein Hinweis, der immer steht, ist Deko.',
        );
      }
    }

    if (rollend.length) {
      console.log(`\nRollende Behälter: ${rollend.map((r) => `${r.name} (noch ${r.rest})`).join(', ')}`
        + ` — am Ende angekommen meldet ${amEnde.filter((r) => r.mehr !== '1').length} von ${amEnde.length} korrekt nichts mehr.`);
    }
  }
}

// --- 6. Ein Bild, und es darf nicht einfarbig sein.
//
// Dieselbe Mindestprüfung wie in der Bildabnahme, nur diesmal aus dem echten
// Browser: die dortige Aufnahme zeichnet die Leinwand nach, diese hier zeigt,
// was der Spieler sieht - Leinwand UND Bedienung, mit gerechneter Kaskade.
mkdirSync(join(ROOT, 'bilder'), { recursive: true });
const bild = await seite.screenshot();
writeFileSync(join(ROOT, 'bilder/browser.png'), bild);

const streuung = await seite.evaluate(() => {
  const c = document.getElementById('view');
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let n = 0, s = 0, s2 = 0;
  for (let i = 0; i < d.length; i += 4 * 97) {
    const h = (d[i] + d[i + 1] + d[i + 2]) / 3;
    n++; s += h; s2 += h * h;
  }
  return Math.round(Math.sqrt(s2 / n - (s / n) ** 2));
});
if (streuung < 6) {
  fail(`Das Bild ist praktisch einfarbig (Streuung ${streuung}).`);
}

// --- Und einmal MIT Raute: die Messung muss laufen und etwas melden.
//
// Ein Messgeraet, das nur da ist, misst nichts. Geprueft wird deshalb, dass
// die Tafel das Zeichenwerk nennt und eine Bilddauer ausweist - denn genau
// diese beiden Zeilen sind der Grund, warum es das Geraet gibt (D27).
{
  const ctx2 = await browser.newContext({
    viewport: { width: BREIT, height: HOCH }, deviceScaleFactor: 2,
  });
  const s2 = await ctx2.newPage();
  await s2.goto(`file://${DATEI}#messung`);
  // Auf den Wert warten, nicht auf die Uhr.
  //
  // Bis v148 stand hier eine feste Wartezeit von 2,5 Sekunden. Die Tafel
  // zaehlt aber live mit, und auf dem Titelbildschirm faellt nicht in jedem
  // Fenster ein langes Bild - der Lauf meldete deshalb gelegentlich "keine
  // laengste Bildluecke ueber null" und war beim naechsten Mal ohne jede
  // Aenderung gruen. Ein Tor, das jede zwanzigste Runde grundlos rot wird,
  // wird abgeschaltet, und dann faengt es gar nichts mehr.
  //
  // Gewartet wird jetzt auf die ZAHL, hoechstens sechs Sekunden. Bleibt sie
  // danach bei null, ist das ein Befund und kein Zufall.
  const lies = () => s2.evaluate(() => {
    const t = document.getElementById('messtafel');
    return t ? (t.textContent || '').replace(/\s+/g, ' ') : null;
  });
  // **Erst aufklappen.** Seit v200 faengt die Tafel eingeklappt an - dann
  // steht dort nur eine Zeile, und die Pruefung darunter suchte Zahlen, die
  // gar nicht da sein sollten. Aufgeklappt wird ueber ihren eigenen Knopf,
  // nicht ueber einen Schalter im Code: so ist zugleich gemessen, dass der
  // Knopf tut, was er soll.
  await s2.waitForTimeout(400);
  await s2.evaluate(() => {
    document.querySelector('#messtafel .mb[data-mess="klappe"]')?.click();
  });
  let tafel = null;
  for (let i = 0; i < 24; i++) {
    await s2.waitForTimeout(250);
    tafel = await lies();
    if (tafel && /Längste Bildlücke\s*[1-9]\d* ms/.test(tafel)) break;
  }
  if (tafel && !/Bilddauer Mitte/.test(tafel)) {
    fail('Die Messtafel laesst sich ueber ihren Knopf nicht aufklappen - '
      + `sie zeigt weiter "${tafel.slice(0, 60)}".`);
  }
  if (!tafel) {
    fail('Mit "#messung" erscheint keine Messtafel - das Messgeraet fuer D27 fehlt.');
  } else {
    if (!/Bilddauer Mitte\s*[\d.]+ ms/.test(tafel)) {
      fail(`Die Messtafel nennt keine Bilddauer: "${tafel.slice(0, 120)}"`);
    }
    // Die tragbare Zahl MUSS dastehen: auf dem Zielgeraet meldet Safari keine
    // langen Aufgaben, und dann bliebe sonst genau die Zeile leer, um die es
    // bei der 50-ms-Norm geht.
    // GROESSER als null. Der erste Entwurf liess `\d+` zu - und "0 ms" ist
    // eine Ziffer, also blieb das Tor gruen, als die Gegenprobe das Mitzaehlen
    // ausbaute. Eine Bildluecke ist nie null: zwischen zwei Bildern liegen
    // immer mindestens rund sechzehn Millisekunden.
    if (!/Längste Bildlücke\s*[1-9]\d* ms/.test(tafel)) {
      fail('Die Messtafel nennt keine längste Bildlücke über null - auf Safari bliebe '
        + 'sie damit stumm, und genau dort wird gemessen.');
    }
    // **Sie muss ins Bild passen** - und zwar QUER, denn quer wird gemessen.
    //
    // Auf 844 x 390 war sie 473 Punkte hoch; 95 davon lagen ueber dem oberen
    // Rand. Abgeschnitten wurde ausgerechnet der Kopf: Zeichenwerk,
    // Bildpunkte, Bilddauer - alles, wofuer es sie gibt. Gemeldet hat es
    // nicht dieses Tor, sondern ein Foto vom Zielgeraet.
    const kasten = await s2.evaluate(() => {
      const t = document.getElementById('messtafel');
      if (!t) return null;
      const r = t.getBoundingClientRect();
      return { oben: Math.round(r.top), unten: Math.round(r.bottom),
        hoehe: Math.round(r.height), fenster: window.innerHeight,
        inhalt: t.scrollHeight, innen: t.clientHeight };
    });
    if (kasten && (kasten.oben < 0 || kasten.unten > kasten.fenster)) {
      fail(`Die Messtafel passt nicht ins Bild: ${kasten.hoehe} Punkte hoch, `
        + `oben ${kasten.oben}, unten ${kasten.unten} bei ${kasten.fenster} Punkten Fenster. `
        + 'Abgeschnitten wird ihr Kopf - also genau die Zahlen, wegen derer sie da ist.');
    }
    // **Und die Frage darueber konnte gar nicht mehr rot werden.**
    //
    // Die Tafel traegt `max-height: calc(100vh - 72px)` und `overflow:
    // hidden`, ihre Lage ist mit `inset` festgenagelt. Damit ist "sie ragt
    // aus dem Bild" seit v198 unmoeglich - die Pruefung darueber bezeugte
    // etwas, das die Stilvorlage ohnehin garantiert (Regel 5). Was seitdem
    // WIRKLICH passiert, wenn die Tafel zu hoch wird, ist etwas anderes und
    // sieht genauso aus: sie schneidet unten ab. Der Kasten ist dann kleiner
    // als sein Inhalt, und genau danach wird jetzt gefragt.
    if (kasten && kasten.inhalt > kasten.innen + 1) {
      fail(`Die Messtafel schneidet ihren Inhalt ab: ${kasten.inhalt} Punkte Inhalt in `
        + `${kasten.innen} Punkten Kasten (Fenster ${kasten.fenster}). Was unten wegfaellt, `
        + 'sind die Zeilen, wegen derer sie da ist.');
    }
    // Und sie darf nicht behaupten, es gaebe keine langen Aufgaben, wo der
    // Browser sie gar nicht meldet (Regel 5).
    if (/davon als Aufgabe\s*0 ms/.test(tafel)) {
      fail('Die Messtafel meldet "0 ms" lange Aufgaben. Entweder misst sie wirklich, '
        + 'dann steht dort eine Zahl - oder der Browser kennt die Art nicht, dann '
        + 'muss das dastehen statt einer Null.');
    }
    console.log(`\nMesstafel (#messung): ${kasten?.hoehe} Punkte hoch bei `
      + `${kasten?.fenster} — ${tafel.slice(0, 150)}`);
  }
  await ctx2.close();
}

// --- 6c. Steht der Ausweg aus einem Dialog GANZ im Bild? (v176)
//
// Der Einstellungsdialog war beim ersten Blick unten angeschnitten: sein
// "Zurueck" lag im rollenden Bereich, und die Karte klebte an ihrer eigenen
// Hoehengrenze. Man kam noch heran - mit Rollen -, aber ein Dialog, aus dem
// man erst herausrollen muss, ist eine Falle.
//
// Kein Tor hat das gemeldet, und keines konnte es: der Rauchtest fragt in
// jsdom nach `hidden`, dort gibt es keine Hoehen. Die Beruehrungsmessung
// rechnet Groessen aus der Stilvorlage, nicht aus dem Bild. Erst hier steht
// beides zusammen - gerechnete Lage und wirkliches Fenster.
{
  // Geoeffnet wird ueber die Pausenkarte - denselben Weg, den ein Spieler
  // MITTEN IM SPIEL nimmt. Von der Landkarte aus fuehrt der Weg ueber die
  // Leinwand, und deren Trefferflaechen hier nachzurechnen hiesse, die
  // Koordinaten ein zweites Mal aufzuschreiben (Regel 15). Gemessen wird
  // ohnehin dieselbe Karte mit demselben Knopf.
  {
    await seite.evaluate(() => document.getElementById('b-pause')?.click());
    await seite.waitForTimeout(200);
    await seite.evaluate(() => document.getElementById('p-optionen')?.click());
    await seite.waitForTimeout(250);
    const lage = await seite.evaluate(() => {
      const knopf = document.getElementById('o-zurueck');
      const karte = document.querySelector('#optionen-menu .pause-card');
      if (!knopf || !karte) return null;
      const k = knopf.getBoundingClientRect(), c = karte.getBoundingClientRect();
      return {
        knopfUnten: k.bottom, knopfOben: k.top, hoehe: k.height,
        karteUnten: c.bottom, fenster: window.innerHeight,
      };
    });
    if (!lage) {
      fail('Der Einstellungsdialog hat keinen Zurueck-Knopf.');
    } else {
      if (lage.hoehe < 40) fail(`Zurueck im Einstellungsdialog ist nur ${lage.hoehe.toFixed(0)} Punkte hoch.`);
      if (lage.knopfUnten > lage.karteUnten + 0.5) {
        fail(`Zurueck im Einstellungsdialog steht ${(lage.knopfUnten - lage.karteUnten).toFixed(0)} Punkte `
          + 'ueber die Unterkante seiner Karte hinaus - er wird abgeschnitten.');
      }
      if (lage.knopfUnten > lage.fenster || lage.knopfOben < 0) {
        fail('Zurueck im Einstellungsdialog liegt ausserhalb des Fensters.');
      }
      console.log(`Einstellungen: Zurueck ${lage.hoehe.toFixed(0)} Punkte hoch, `
        + `${(lage.karteUnten - lage.knopfUnten).toFixed(0)} Punkte Luft zur Kartenkante.`);
    }
    // T10: kommt eine eingegebene Aussaat wirklich in der Partie an?
    //
    // Der Rauchtest kann das nicht pruefen: er baut Zustand und Oberflaeche
    // selbst zusammen, waehrend die Verdrahtung "Eingabefeld -> naechste
    // Partie" in `main.ts` sitzt. Genau die Sorte Luecke, die dieses
    // Verzeichnis viermal gekostet hat - eine Ableitung schuetzt nur, was
    // sie aufzaehlt. Hier laeuft die GEBAUTE Datei mit ihrer echten
    // Verdrahtung, also wird es hier geprueft.
    await seite.evaluate(() => document.getElementById('o-zu-lauf')?.click());
    await seite.waitForTimeout(150);
    await seite.evaluate(() => {
      const f = document.getElementById('o-seed');
      f.value = '12345';
      f.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await seite.waitForTimeout(120);
    await seite.evaluate(() => document.getElementById('o-lauf-zurueck')?.click());
    await seite.evaluate(() => document.getElementById('o-zurueck')?.click());
    await seite.evaluate(() => document.getElementById('b-pause')?.click());
    await seite.waitForTimeout(150);
    // Zurueck auf die Landkarte und eine neue Partie starten.
    await seite.evaluate(() => document.getElementById('b-pause')?.click());
    await seite.waitForTimeout(200);
    await seite.evaluate(() => document.getElementById('p-quit')?.click());
    await seite.waitForTimeout(600);
    let neuDrin = false;
    for (let y = 60; y < HOCH - 20 && !neuDrin; y += 50) {
      for (let x = 40; x < BREIT - 20 && !neuDrin; x += 60) {
        await seite.mouse.click(x, y);
        await seite.waitForTimeout(70);
        neuDrin = await seite.evaluate(() => !document.getElementById('hud')?.hidden);
      }
    }
    if (!neuDrin) {
      fail('Nach dem Setzen einer Aussaat kommt man nicht mehr ins Spiel.');
    } else {
      await seite.evaluate(() => document.getElementById('b-pause')?.click());
      await seite.waitForTimeout(150);
      await seite.evaluate(() => document.getElementById('p-optionen')?.click());
      await seite.evaluate(() => document.getElementById('o-zu-lauf')?.click());
      await seite.waitForTimeout(150);
      await seite.evaluate(() => document.getElementById('o-lauf')?.click());
      await seite.waitForTimeout(150);
      const block = await seite.evaluate(() => document.getElementById('o-block')?.value ?? '');
      if (!/Aussaat\s+12345/.test(block)) {
        fail('Die eingegebene Aussaat 12345 kommt in der Partie nicht an - der Laufblock '
          + `meldet stattdessen: ${(block.split('\n')[1] ?? '?').trim()}`);
      } else {
        console.log('Aussaat: 12345 eingegeben, in der Partie angekommen.');
      }
      await seite.evaluate(() => document.getElementById('o-lauf-zurueck')?.click());
      await seite.evaluate(() => document.getElementById('o-zurueck')?.click());
      await seite.evaluate(() => document.getElementById('b-pause')?.click());
      await seite.waitForTimeout(150);
    }
  }
}

// --- 7. Der Schreibtisch. Nichts darf ihn aussperren.
//
// Bis v121 tat genau das ein zweiter, vergessener Hochkant-Hinweis: er fragte
// nur nach Ausrichtung und Hoehe, nicht nach dem Zeiger. Ein ganz normales
// Fenster von 700 x 850 bekam ihn ueber die volle Flaeche und kam nicht ins
// Spiel - waehrend alle siebzehn Tore gruen meldeten. Wieder Regel 7, wieder
// dieselbe Form wie v50.
//
// Geprueft werden BEIDE Formen, und das ist der Punkt: quer soll es laufen,
// hochkant soll es AUCH laufen, denn ein Fenster kann man ziehen und ein
// Schreibtisch laesst sich nicht drehen. Der Hinweis gehoert an Geraete, die
// man kippt - `pointer: coarse` -, nicht an Fenster, die man zieht.
{
  // **Drei Fenster, und das dritte ist kein Schmuck.**
  //
  // 'flach' liegt mit 620 Punkten Hoehe knapp UNTER der Schwelle, ab der der
  // Pruefsteg inhaltshoch wird (640). Dort ist er also fest so hoch wie das
  // Fenster und hat trotzdem Platz uebrig - der einzige Zustand, in dem ein
  // Raster seine Zeilen auseinanderziehen kann. Auf dem Telefon ist die Liste
  // dafuer zu lang, am Schreibtisch der Steg zu kurz; ohne dieses Fenster
  // bewies die Gegenprobe dazu nichts, und genau das hat sie gemeldet.
  for (const [name, w, h] of [['breit', 1400, 900], ['schmal', 700, 850], ['flach', 1000, 620]]) {
    // Kein `isMobile`, kein `hasTouch`: das ist hier die ganze Frage. So
    // meldet die Kaskade `pointer: fine`, also Maus.
    const ctx3 = await browser.newContext({ viewport: { width: w, height: h } });
    const s3 = await ctx3.newPage();
    await s3.goto('file://' + DATEI);
    await s3.waitForTimeout(800);

    const zeiger = await s3.evaluate(() => matchMedia('(pointer: coarse)').matches);
    if (zeiger) {
      // Regel 3: kommt der Eingriff an? Ohne Maus prueft dieser Block nichts.
      fail(`Schreibtischprobe ${name}: der Browser meldet einen groben Zeiger - `
        + 'die Probe misst nicht, was sie messen soll.');
      await ctx3.close();
      continue;
    }

    // Was liegt ueber der ganzen Flaeche? Gefragt ist nicht "ist der Hinweis
    // da", sondern "verdeckt IRGENDETWAS das Feld" - ein Tor auf einen
    // bestimmten Klassennamen waere nach der naechsten Umbenennung blind.
    const deckel = await s3.evaluate(() => [...document.querySelectorAll('body *')]
      .filter((e) => {
        const st = getComputedStyle(e), r = e.getBoundingClientRect();
        return st.display !== 'none' && st.visibility !== 'hidden'
          && st.opacity !== '0'
          && r.width > innerWidth * 0.8 && r.height > innerHeight * 0.8
          && (st.position === 'fixed' || st.position === 'absolute')
          && Number(st.zIndex) > 10;
      })
      .map((e) => e.id ? '#' + e.id : '.' + String(e.className).split(' ')[0]));

    if (deckel.length) {
      fail(`Schreibtischprobe ${name} (${w}x${h}, Maus): ${deckel.join(', ')} liegt `
        + 'ueber der ganzen Flaeche. Am Rechner gibt es nichts zu drehen.');
    }

    // Liegt das BILD auf derselben Einpassung wie die TREFFERFLAECHE?
    //
    // Zwei Formeln, dieselbe Zahl - `drawMenuFrame` passt das Menue ein,
    // `screenToWorld` rechnet zurueck. Gehen sie auseinander, trifft man
    // ueberall daneben, und zwar an jeder Fenstergroesse anders. Der Weg
    // unten faende trotzdem hinein, denn er rechnet mit derselben falschen
    // Formel: er bezeugte die Sache, ohne sie je zu pruefen (Regel 13).
    //
    // Geprueft wird am Bild, nicht an der Rechnung: bei einem Fenster, das
    // nicht 16:9 ist, MUSS oben und unten der leere Grund stehen, genau so
    // breit wie die Einpassung es vorhersagt. Wird stattdessen formatfuellend
    // gezeichnet, steht dort Inhalt.
    {
      const k = einpassung(w, h);
      const randY = (h - WELT_H * k) / 2;
      if (randY < 24) {
        fail(`Schreibtischprobe ${name}: kein Balken vorhergesagt (${randY.toFixed(0)} px) - `
          + 'die Probe misst nicht, was sie messen soll.');
      } else {
        const punkte = await s3.evaluate(([mx, by, fy]) => {
          const cv = document.querySelector('canvas');
          const g = cv.getContext('2d');
          const d = Math.min(devicePixelRatio || 1, 2);
          const lies = (x, y) => {
            const q = g.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data;
            return `${q[0]},${q[1]},${q[2]}`;
          };
          return { balken: lies(mx, by), feld: lies(mx, fy) };
        }, [w / 2, randY / 2, randY + Math.min(60, WELT_H * k * 0.12)]);

        if (punkte.balken !== LEER) {
          fail(`Schreibtischprobe ${name} (${w}x${h}): im Balken oben steht `
            + `rgb(${punkte.balken}) statt des leeren Grundes rgb(${LEER}). Bild und `
            + 'Trefferflaeche benutzen verschiedene Einpassungen - man trifft daneben.');
        }
        // Regel 13, an der Probe selbst: waere BEIDES leer, bewiese der Test
        // nichts - dann stuende das Menue schlicht woanders.
        if (punkte.feld === LEER) {
          fail(`Schreibtischprobe ${name} (${w}x${h}): auch im Feld steht der leere `
            + 'Grund - der Vergleich unterscheidet nichts.');
        }
      }
    }

    // **Antwortet die Landkarte auf den Zeiger?** (v204)
    //
    // Sie ist auf der Leinwand gezeichnet, hat also keine HTML-Knoepfe und
    // bekommt vom Browser kein `:hover` geschenkt - sie muss selbst
    // antworten. Abgelesen wird das Zeigersymbol: ueber einem Ort wird es
    // zur Hand, daneben nicht. Mit Nullprobe, denn eine Hand ueberall waere
    // genauso gruen und genauso nutzlos (Regel 13).
    if (name === 'breit') {
      const zeigerBei = async (x, y) => {
        await s3.mouse.move(x, y);
        await s3.waitForTimeout(50);
        return s3.evaluate(() => document.querySelector('canvas').style.cursor);
      };
      let hand = null;
      for (let y = 40; y < h - 20 && !hand; y += 30) {
        for (let x = 40; x < w - 20 && !hand; x += 30) {
          if (await zeigerBei(x, y) === 'pointer') hand = { x, y };
        }
      }
      const leer = await zeigerBei(4, h - 4);
      if (!hand) {
        fail('Auf der Landkarte wird der Zeiger nirgends zur Hand - am Schreibtisch '
          + 'sieht sie damit aus wie ein Bild, nicht wie eine Bedienung.');
      } else if (leer === 'pointer') {
        fail('Auf der Landkarte ist der Zeiger UEBERALL eine Hand - dann sagt er nichts.');
      } else {
        console.log(`Landkarte: Zeiger wird zur Hand bei ${hand.x},${hand.y}, `
          + `in der Ecke nicht ("${leer}").`);
      }
      await s3.mouse.move(4, h - 4);
    }

    // Und die eigentliche Frage: kommt man rein?
    //
    // NICHT mit einem eigenen Raster. Ein Raster mit 45 Punkten Schritt ist
    // groeber als der "Spielen"-Knopf, der im schmalen Fenster nur 33 Punkte
    // hoch ist - es trifft ihn oder es trifft ihn nicht, je nachdem wie die
    // Reihen fallen. Genau daran hat diese Pruefung im ersten Entwurf
    // "NICHT spielbar" gemeldet, waehrend das Spiel einwandfrei lief; auf
    // dem Telefon geht dasselbe Raster nur durch Glueck auf.
    //
    // Stattdessen der in Pruefung 4 mitgeschriebene Weg, umgerechnet. Der
    // ist am laufenden Spiel gefunden, nicht abgeschrieben.
    let drin = false;
    for (const wp of pfad) {
      await s3.mouse.click(...nachSchirm(wp.x, wp.y, w, h));
      await s3.waitForTimeout(45);
      drin = await s3.evaluate(() => !document.getElementById('hud')?.hidden);
      if (drin) break;
    }
    if (!drin) {
      fail(`Schreibtischprobe ${name} (${w}x${h}, Maus): derselbe Weg, der auf dem `
        + 'Telefon ins Spiel fuehrt, fuehrt hier nicht hinein.');
    }
    console.log(`Schreibtisch ${name.padEnd(6)} ${w}x${h}: `
      + `${drin ? 'spielbar' : 'NICHT spielbar'}`
      + `${deckel.length ? `, verdeckt von ${deckel.join(', ')}` : ''}`);

    // **Und antwortet hier ueberhaupt etwas auf den Zeiger?** (v204)
    //
    // Gemeldet vom Schreibtisch: "es gibt kein MouseOver-Feedback ueber den
    // Buttons". Es stimmte woertlich - von vierzehn Knopfklassen hatten drei
    // ein `:hover`, die des Pausenmenues. Alle dreissig Tore messen, ob ein
    // Knopf da ist, gross genug und erreichbar; keines, ob er ANTWORTET.
    //
    // Diese Frage gehoert hierher und nicht zur Telefonprobe: dort meldet die
    // Kaskade `pointer: coarse`, und dann soll es keine Rueckmeldung geben -
    // ein "hover" ohne Zeiger bleibt nach dem Tippen haengen.
    if (drin && name === 'breit') {
      const filterVon = (sel) => s3.evaluate((q) => {
        const el = document.querySelector(q);
        return el ? getComputedStyle(el).filter : null;
      }, sel);
      const stumm = [];
      for (const sel of ['#tb-arrow', '#b-wave', '#b-pause', '.chip']) {
        const vorher = await filterVon(sel);
        if (vorher === null) continue;
        await s3.hover(sel).catch(() => {});
        await s3.waitForTimeout(80);
        const drueber = await filterVon(sel);
        await s3.mouse.move(w / 2, h / 2);
        await s3.waitForTimeout(60);
        const danach = await filterVon(sel);
        if (drueber === vorher) stumm.push(`${sel} (bleibt "${vorher}")`);
        else if (danach !== vorher) {
          fail(`Der Knopf ${sel} bleibt nach dem Verlassen hell ("${danach}") - `
            + 'eine Rueckmeldung, die haengenbleibt, ist eine Falschaussage.');
        }
      }
      if (stumm.length) {
        fail(`Diese Knoepfe antworten dem Zeiger nicht: ${stumm.join(', ')}. Am `
          + 'Schreibtisch sieht ein Knopf ohne Rueckmeldung aus wie eine Beschriftung.');
      } else {
        console.log('Zeiger: die Knoepfe antworten und lassen wieder los.');
      }
    }

    // **Und wie steht der Pruefsteg auf einem HOHEN Fenster?** (v206)
    //
    // Bis v205 spannte er von oben nach unten, also ueber die ganze
    // Fensterhoehe. Auf dem Telefon quer sind das 276 Punkte und genau
    // richtig; auf 1920 x 862 waren es **748**, und das Werteraster verteilte
    // den uebrigen Platz auf seine Zeilen: sechs Zeilen zu 99 Punkten, Wert
    // oben, Beschriftung mittig, **44 Punkte dazwischen**. Gemeldet als "der
    // Pruefsteg ist am Schreibtisch eine ueberhohe Spalte".
    //
    // Das Browsertor hat es nicht gesehen, weil es den Steg nur auf 844 x 390
    // gemessen hat - dort passt die Liste ohnehin nicht, es bleibt kein Platz
    // zu verteilen, und die Zahl ist grundlos richtig. Dieselbe Sorte Lücke
    // wie beim MouseOver eine Fassung davor: gemessen wurde ein Zustand, den
    // der Nutzer nicht hat.
    if (drin) {
      await s3.click('#tb-arrow').catch(() => {});
      await s3.waitForTimeout(300);
      const steg = await s3.evaluate(() => {
        const el = document.getElementById('inspector');
        if (!el || el.hidden) return null;
        const r = el.getBoundingClientRect();
        const paare = [];
        const dts = [...el.querySelectorAll('.insp-stats dt')];
        const dds = [...el.querySelectorAll('.insp-stats dd')];
        for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
          const a = dts[i].getBoundingClientRect(), b = dds[i].getBoundingClientRect();
          paare.push({ was: dts[i].textContent.trim(),
            ab: Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) });
        }
        // **Wieviel Steg steht unter dem letzten SICHTBAREN Zeichen leer?**
        //
        // Nicht unter dem letzten Kind: die Werteliste ist ein Flex-Kind mit
        // `flex: 1 1 auto` und dehnt sich auf die volle Steghoehe, auch wenn
        // ihre Zeilen oben zusammenstehen. Gemessen an den Kaesten waere der
        // Steg dann randvoll - und die Gegenprobe hat genau das gezeigt: der
        // eingebaute Fehler blieb gruen. Gezaehlt werden deshalb die BLAETTER,
        // also Elemente ohne Kinder, denn nur die tragen Text.
        let unten = r.top;
        for (const k of el.querySelectorAll('*')) {
          if (k.children.length) continue;
          const kr = k.getBoundingClientRect();
          if (kr.height > 0 && kr.width > 0) unten = Math.max(unten, kr.bottom);
        }
        const name = el.querySelector('.insp-name');
        return {
          hoehe: Math.round(r.height), fensterhoehe: innerHeight,
          leer: Math.round(r.bottom - unten),
          schlimmstesPaar: paare.reduce((m, p) => (p.ab > m.ab ? p : m), { was: '-', ab: 0 }),
          zeilen: paare.length,
          nameAb: name ? Math.round(name.scrollWidth - name.clientWidth) : 0,
          nameText: name ? name.textContent.trim() : '',
        };
      });
      if (!steg) {
        fail(`Schreibtischprobe ${name}: der Pruefsteg liess sich nicht oeffnen - `
          + 'ohne ihn misst dieser Block nichts.');
      } else {
        console.log(`Pruefsteg ${name}: ${steg.hoehe} von ${steg.fensterhoehe} Punkten hoch, `
          + `${steg.leer} leer, ${steg.zeilen} Wertezeilen, schlimmster Abstand `
          + `Wert/Beschriftung ${Math.round(steg.schlimmstesPaar.ab)} P `
          + `(${steg.schlimmstesPaar.was}), Name "${steg.nameText}"`);
        if (!steg.zeilen) {
          fail(`Schreibtischprobe ${name}: der Pruefsteg zeigt keine einzige Wertezeile - `
            + 'die Messung darunter unterscheidet dann nichts.');
        }
        if (steg.schlimmstesPaar.ab > 12) {
          fail(`Schreibtischprobe ${name}: "${steg.schlimmstesPaar.was}" steht `
            + `${Math.round(steg.schlimmstesPaar.ab)} Punkte von seinem Wert entfernt `
            + '(erlaubt 12). Wert und Beschriftung gehoeren sichtbar zusammen; auf einem '
            + 'hohen Fenster zieht ein Raster ohne `align-content` seine Zeilen auseinander.');
        }
        // Der leere Rest gilt nur oberhalb der Schwelle: darunter ist der
        // Steg absichtlich so hoch wie das Fenster.
        if (h >= 481 && steg.leer > 60) {
          fail(`Schreibtischprobe ${name}: unter dem Inhalt stehen ${steg.leer} Punkte `
            + 'leerer Steg (erlaubt 60). Er soll dort enden, wo sein Inhalt endet, statt '
            + 'als Glasstreifen ueber das halbe Bild zu laufen.');
        }
        if (steg.nameAb > 0) {
          fail(`Schreibtischprobe ${name}: der Turmname ist abgeschnitten ("${steg.nameText}", `
            + `${steg.nameAb} Punkte fehlen). Am Schreibtisch ist Platz genug - er fehlt nur, `
            + 'weil der Steg dort so schmal ist wie auf dem Telefon.');
        }
      }
    }

    await ctx3.close();
  }
}

// --- 8. Steht das Startbildschirm-Symbol in der AUSGELIEFERTEN Datei?
//
// Es wird von `npm run appsymbol` erzeugt und von Hand nie angefasst - genau
// deshalb faellt es niemandem auf, wenn es fehlt oder leer ist. In v121 ist
// ein leeres Symbol durchgegangen: 13 KB, gueltiges PNG, richtige Masse, kein
// Bild darin (S136). Der Erzeuger prueft sich seitdem selbst, aber er laeuft
// nur, wenn ihn jemand aufruft. Hier wird geprueft, was wirklich ausgeliefert
// wird.
{
  const html = readFileSync(DATEI, 'utf8');
  const t = /rel="apple-touch-icon"[^>]*href="data:image\/png;base64,([^"]+)"/.exec(html);
  if (!t) {
    fail('In der gebauten Datei steht kein Startbildschirm-Symbol (apple-touch-icon '
      + 'als data:-Adresse). Ohne es zeigt iOS eine graue Bildschirmabnahme.');
  } else {
    const roh = Buffer.from(t[1], 'base64');
    const sharp = (await import('sharp')).default;
    const masse = await sharp(roh).metadata();
    if (masse.width !== 180 || masse.height !== 180) {
      fail(`Das Startbildschirm-Symbol ist ${masse.width}x${masse.height} statt 180x180 - `
        + 'iOS rechnet es hoch, und das sieht weich aus.');
    }
    // Dieselbe Frage wie im Erzeuger, aber am Ergebnis: ist eine FORM drauf?
    // Nur helle Punkte zu zaehlen genuegt nicht - ein ganz helles Feld waere
    // ebenso falsch wie ein leeres.
    const px = await sharp(roh).removeAlpha().raw().toBuffer();
    let hell = 0;
    for (let i = 0; i < px.length; i += 3) {
      if (px[i] * 0.30 + px[i + 1] * 0.59 + px[i + 2] * 0.11 > 110) hell++;
    }
    const anteil = hell / (px.length / 3);
    if (anteil < 0.04 || anteil > 0.45) {
      fail(`Das Startbildschirm-Symbol hat ${(anteil * 100).toFixed(1)} % helle Flaeche `
        + '(erwartet 4 bis 45 %). Darunter fehlt die Figur, darueber der Grund.');
    }
    console.log(`Startbildschirm-Symbol: ${masse.width}x${masse.height}, `
      + `${(anteil * 100).toFixed(1)} % helle Flaeche, ${(roh.length / 1024).toFixed(0)} KB.`);
  }

  // --- Und die Startbilder, die iOS beim Oeffnen zeigt.
  //
  // Sie haben eine eigene Falle: iOS nimmt ein Startbild NUR, wenn seine
  // Masse aufs Bildpunkt genau zu der Medienabfrage passen, mit der es
  // angemeldet ist. Ein Bild mit falscher Groesse wird stillschweigend
  // ignoriert - kein Fehler, keine Meldung, nur wieder der weisse Blitz.
  // Genau deshalb wird hier das Bild GEGEN SEINE EIGENE ANMELDUNG geprueft
  // und nicht gegen eine Liste: eine Liste waere eine zweite Wahrheit.
  const start = [...html.matchAll(
    /rel="apple-touch-startup-image" media="\(device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\)[^"]*" href="data:image\/png;base64,([^"]+)"/g,
  )];
  if (!start.length) {
    fail('In der gebauten Datei steht kein Startbild (apple-touch-startup-image). '
      + 'Beim Oeffnen vom Startbildschirm zeigt iOS dann seinen weissen Grund.');
  } else {
    const sharp = (await import('sharp')).default;
    let gesamt = 0;
    for (const [, cw, ch, d, b64] of start) {
      const bild = Buffer.from(b64, 'base64');
      gesamt += bild.length;
      const m = await sharp(bild).metadata();
      const sollB = Number(cw) * Number(d), sollH = Number(ch) * Number(d);
      if (m.width !== sollB || m.height !== sollH) {
        fail(`Startbild fuer ${cw}x${ch}@${d} ist ${m.width}x${m.height} statt `
          + `${sollB}x${sollH} - iOS uebergeht es stillschweigend.`);
      }
    }
    console.log(`Startbilder: ${start.length} Groessen, `
      + `${(gesamt / 1024).toFixed(0)} KB zusammen.`);
  }
}

// --- Sieht man, wo die Tastatur steht? (D8)
//
// Zwei Fragen, und beide nur hier zu beantworten. Der Rauchtest prueft, dass
// der WEG durchs Menue funktioniert; ob man die Markierung SIEHT, sagt nur
// ein gerechnetes Bild.
//
// Gemessen vor v193: im Spiel stand der Standardring des Browsers,
// `outline: rgb(16,16,16) auto 1px` - ein duenner, fast schwarzer Strich auf
// einer dunklen Oberflaeche. Und im Menue gab es gar nichts: null von 57
// fokussierbaren Elementen sichtbar, null Bildpunkte Unterschied nach einem
// Tabulator.
{
  const ringe = await seite.evaluate(() => {
    const treffer = [];
    for (const regel of [...document.styleSheets].flatMap((b) => {
      try { return [...b.cssRules]; } catch { return []; }
    })) {
      // **Nicht "gibt es eine Regel", sondern "gibt es einen Ring".**
      //
      // Der erste Entwurf zaehlte jede Regel mit `:focus-visible` im
      // Selektor - und die Gegenprobe ging glatt durch, weil die
      // Aufraeumregel `:focus:not(:focus-visible) { outline: none }` stehen
      // blieb und mitgezaehlt wurde. Eine Regel, die den Ring ABSCHALTET,
      // als Beleg dafuer, dass es einen gibt (Regel 5).
      const umriss = regel.style?.outline ?? '';
      if (regel.selectorText && regel.selectorText.includes(':focus-visible')
        && umriss && umriss !== 'none') {
        treffer.push({ wahl: regel.selectorText, umriss });
      }
    }
    return treffer;
  });
  if (!ringe.length) {
    fail('Es gibt keinen `:focus-visible`-Stil. Dann steht der Standardring des '
      + 'Browsers - auf dieser dunklen Oberflaeche fast schwarz.');
  } else {
    console.log(`Fokusring: ${ringe.length} Regel(n), z. B. "${ringe[0].wahl}" -> ${ringe[0].umriss}`);
  }
}

await browser.close();

console.log(`\nGeladen: dist/index.html in Chromium, ${BREIT}x${HOCH} (iPhone quer)`);
console.log(`Ins Spiel gekommen: ${start ? `Tipp auf ${start.x},${start.y}` : 'NEIN'}`);
console.log(`Streuung der Leinwand: ${streuung}`);
console.log('Bild: bilder/browser.png');

if (probleme.length) {
  console.error(`\nBROWSERTOR: ${probleme.length} Befund(e)`);
  for (const p of probleme) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nBROWSERTOR: die gebaute Datei ist im Browser bedienbar.');
