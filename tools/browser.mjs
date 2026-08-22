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
 * Es prüft sieben Dinge, und jedes davon ist ein Fehler, der schon einmal
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
 *
 * Aufruf: npm run browser
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATEI = join(ROOT, 'dist/index.html');

// Das Zielgerät, nicht der Schreibtisch. Dieselben Maße wie die Bildabnahme.
const BREIT = 844, HOCH = 390;

// Derselbe Richtwert wie in `npm run beruehrung` — dort ist er aus der
// Stilvorlage gelesen, hier gemessen. Zwei Wege zur selben Zahl, und der
// zweite ist der, der zählt.
const MINDEST = 44;

/** Alles, was zur Spielbedienung gehört und im Menü nichts zu suchen hat. */
const BEDIENUNG = ['#hud', '#dock', '#b-wave', '#inspector', '#pick', '#perf'];

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
// Zwei Welten: hier liegt ein vorinstalliertes Chromium unter
// /opt/pw-browsers, im Ablaufplan lädt `playwright install` seine eigene
// Fassung. Erst der Normalweg, dann der vorinstallierte - und wenn beides
// fehlt, ein Abbruch mit Ansage. Ein Tor, das sich bei fehlendem Browser
// still überspringt, ist genau die Prüfung, die nie etwas meldet.
async function browserStarten() {
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
  console.error('BROWSERTOR: kein Chromium startbar.\n');
  console.error(gescheitert.join('\n'));
  console.error('\nEntweder `npx playwright install chromium` laufen lassen');
  console.error('oder CHROMIUM_PFAD auf eine vorhandene Fassung setzen.');
  process.exit(1);
}

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
  const knoepfe = await seite.evaluate((mind) => {
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
      let oben = document.elementFromPoint(mx, my);
      let eigen = false;
      while (oben) { if (oben === e) { eigen = true; break; } oben = oben.parentElement; }
      raus.push({
        name: e.id || e.className,
        text: (e.textContent ?? '').trim().slice(0, 24),
        w: Math.round(r.width), h: Math.round(r.height),
        klein: Math.min(r.width, r.height) < mind,
        eigen,
      });
    }
    return raus;
  }, MINDEST);

  console.log(`\nKnöpfe im Spiel (gemessen, nicht zugesagt):`);
  for (const k of knoepfe) {
    const marke = k.klein ? ' ZU KLEIN' : k.eigen ? '' : ' VERDECKT';
    console.log(`  ${(k.name || '?').padEnd(22)} ${String(k.w).padStart(4)}x${String(k.h).padEnd(4)}${marke}`);
    if (k.klein) {
      fail(`Knopf "${k.name}" ist ${k.w}x${k.h} - die kürzere Seite bleibt unter ${MINDEST} Punkten.`);
    }
    if (!k.eigen) {
      fail(`Knopf "${k.name}" wird in seiner Mitte von etwas anderem verdeckt.`);
    }
  }
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
    for (const r of rollend) {
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
      const eintraege = [...l.querySelectorAll('i')].filter((e) => !e.classList.contains('next-note'));
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
  await s2.waitForTimeout(2500);
  const tafel = await s2.evaluate(() => {
    const t = document.getElementById('messtafel');
    return t ? (t.textContent || '').replace(/\s+/g, ' ') : null;
  });
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
    console.log(`\nMesstafel (#messung): ${tafel.slice(0, 150)}`);
  }
  await ctx2.close();
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
  for (const [name, w, h] of [['breit', 1400, 900], ['schmal', 700, 850]]) {
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
    await ctx3.close();
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
