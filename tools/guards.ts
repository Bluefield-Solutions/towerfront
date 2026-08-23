/** Datenwaechter. Laeuft vor jedem Build und prueft die Inhaltsdateien auf
 *  Widersprueche, die im Spiel erst spaet oder gar nicht auffallen wuerden.
 *  Aufruf: npx tsx tools/guards.ts */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_W, WORLD_H } from '../src/data/config';
import { DIFFICULTIES, DIFFICULTY_ORDER, hpScale } from '../src/data/difficulty';
import { PERKS, PERK_ORDER, starsFor } from '../src/data/perks';

const NORMAL = DIFFICULTIES.normal;
const START_GOLD = NORMAL.startGold;
const START_LIVES = NORMAL.startLives;
import { MAPS, goalOf, lanePaths } from '../src/data/maps';
import { GameState } from '../src/game/state';
import { projektilform } from '../src/gfx/renderer';
import type { Tower } from '../src/game/types';
import {
  TOWERS, TOWER_ORDER, MAX_LEVEL, DRAW_SCALE, TURM_BREITE, TURM_HOEHE, rangeFor, statsFor,
  type TowerId,
} from '../src/data/towers';
import { ENEMIES, type EnemyId } from '../src/data/enemies';
import { fehltVorKauf } from '../src/game/turmwerte';
import { enemyArtWidth } from '../src/gfx/enemyart';

import { ABILITIES, ABILITY_ORDER } from '../src/data/abilities';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);
const isHex = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s);

// ------------------------------------------------------------------ Karten

for (const map of MAPS) {
  if (!map.name || !map.blurb) fail(`${map.id}: Name oder Beschreibung fehlt.`);
  if (!map.lanes.length) { fail(`${map.id}: keine Bahn.`); continue; }

  const paths = lanePaths(map);
  const goal = goalOf(map);
  const profile: string[] = [];

  for (let i = 0; i < map.lanes.length; i++) {
    const lane = map.lanes[i];
    const path = paths[i];
    if (lane.length < 3) fail(`${map.id}, Bahn ${i + 1}: unter drei Punkten gibt es keine Kurve.`);

    // Der Start muss ausserhalb liegen - sonst erscheinen Gegner mitten im Feld.
    const start = lane[0];
    const outside = start.x < 0 || start.y < 0 || start.x > WORLD_W || start.y > WORLD_H;
    if (!outside) fail(`${map.id}, Bahn ${i + 1}: beginnt innerhalb des Feldes.`);

    // Gemessen an der GERECHNETEN Bahn, nicht an den Rohpunkten.
    //
    // Seit v131 wandert der letzte Kontrollpunkt in `lanePaths` auf die
    // Zielplattform der Karte - die Rohdaten beschreiben den Verlauf, wo
    // alles endet, steht einmal in `map.ziel`. Ein Waechter, der die
    // Rohpunkte prueft, prueft damit etwas, das das Spiel gar nicht benutzt;
    // er meldete sechs Fehler, waehrend jede Bahn sauber am Kristall endete.
    const end = path.at(path.length);
    if (Math.hypot(end.x - goal.x, end.y - goal.y) > 1) {
      fail(`${map.id}, Bahn ${i + 1}: endet nicht am Herzkristall.`);
    }
    if (path.length < 900) {
      warn(`${map.id}, Bahn ${i + 1}: mit ${Math.round(path.length)} Pixeln sehr kurz.`);
    }

    // Kurven duerfen eng sein, aber nicht knicken. Geprueft wird der Winkel
    // zwischen aufeinanderfolgenden Abschnitten der abgetasteten Kurve: mehr
    // als 25 Grad auf einem Abtastschritt sieht wie eine Ecke aus, und genau
    // die wollten wir loswerden.
    let sharpest = 0;
    for (let k = 1; k < path.pts.length - 1; k++) {
      const a = path.pts[k - 1], b = path.pts[k], c = path.pts[k + 1];
      const a1 = Math.atan2(b.y - a.y, b.x - a.x);
      const a2 = Math.atan2(c.y - b.y, c.x - b.x);
      let d = Math.abs(a2 - a1);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d > sharpest) sharpest = d;
    }
    // Wie interessant ist der Weg?
    //
    // Drei Zahlen, weil "interessant" sonst Geschmackssache bleibt:
    //
    //  - Umwegfaktor: Weglaenge geteilt durch Luftlinie vom Tor zum Kristall.
    //    Eine Gerade hat 1,0 - da gibt es nichts zu entscheiden.
    //  - Richtungswechsel: wie oft die Kurve die Drehrichtung aendert. Ein
    //    einziger langer Bogen ist auch nur eine Gerade mit Umweg.
    //  - Breitenverhaeltnis: weiteste zu engster Stelle. Ein ueberall gleich
    //    breiter Weg hat keine Engstellen, und Engstellen sind das, worum das
    //    Spiel gespielt wird.
    {
      const air = Math.hypot(
        path.pts[path.pts.length - 1].x - path.pts[0].x,
        path.pts[path.pts.length - 1].y - path.pts[0].y,
      );
      const detour = path.length / Math.max(1, air);
      let turns = 0, lastSign = 0;
      for (let k = 2; k < path.pts.length; k++) {
        const a = path.pts[k - 2], b = path.pts[k - 1], c = path.pts[k];
        const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        const sign = Math.sign(cross);
        if (sign !== 0 && lastSign !== 0 && sign !== lastSign) turns++;
        if (sign !== 0) lastSign = sign;
      }
      const w = path.widthRange();
      const ratio = w.max / Math.max(1, w.min);
      // Bei einer gezeichneten Karte ist der Umweg unsere Entscheidung, bei
      // einem gelieferten Bild nicht - dort ist der Weg gemalt, und er laesst
      // sich nicht nachtraeglich verlaengern. Deshalb dort ein Hinweis statt
      // eines Abbruchs, mit derselben Zahl. Der Wert gehoert in die
      // Bildbestellung, nicht in eine Nachbesserung.
      if (detour < 1.8) {
        const text = `${map.id}, Bahn ${i + 1}: Umwegfaktor ${detour.toFixed(2)} - der Weg ist fast eine Gerade.`;
        if (map.pfadImBild) warn(`${text} Fuer das naechste Bild mehr Windungen bestellen.`);
        else fail(text);
      }
      if (turns < 3) {
        fail(`${map.id}, Bahn ${i + 1}: nur ${turns} Richtungswechsel - ein einziger Bogen ist keine Strecke.`);
      }
      if (ratio < 1.35) {
        fail(`${map.id}, Bahn ${i + 1}: Breitenverhaeltnis ${ratio.toFixed(2)} - der Weg hat keine Engstellen.`);
      }
      profile.push(
        `Bahn ${i + 1}: Umweg ${detour.toFixed(1)}x, ${turns} Wechsel, Breite ${w.min}-${w.max}`,
      );
    }

    const deg = (sharpest * 180) / Math.PI;
    if (deg > 25) {
      fail(`${map.id}, Bahn ${i + 1}: knickt um ${deg.toFixed(0)} Grad - das ist eine Ecke, keine Kurve.`);
    }
  }

  // Bahnlaengen muessen aehnlich sein - sonst ist die kuerzere eine Abkuerzung.
  if (paths.length > 1) {
    const lens = paths.map((p) => p.length);
    const min = Math.min(...lens), max = Math.max(...lens);
    if (max > min * 1.3) {
      fail(
        `${map.id}: Bahnlaengen ${lens.map((l) => Math.round(l)).join('/')} - die kuerzeste ` +
        'ist eine Abkuerzung (hoechstens 30 % Unterschied erlaubt).',
      );
    }
    // Mehrere Bahnen muessen sich vereinen.
    let shared = 0;
    for (const p of paths[0].pts) {
      for (let i = 1; i < paths.length; i++) if (paths[i].distanceTo(p.x, p.y) < 8) shared++;
    }
    if (shared < 10) fail(`${map.id}: die Bahnen treffen sich nie - das ist keine Gabelung.`);
  }

  // --- Baubare Flaeche
  //
  // Seit v37 wird frei gebaut. Statt einer Liste von Plaetzen wird die Karte
  // abgetastet: wieviel Prozent des Feldes trÃ¤gt einen Bogenturm, wieviel den
  // viel groesseren Moerser? Das macht "zu eng" und "zu offen" messbar statt
  // zur Geschmacksfrage.
  {
    const probe = new GameState(map.id);
    const STEP = 24;
    const share: Record<string, number> = {};
    let cells = 0;
    for (let y = 0; y < WORLD_H; y += STEP) for (let x = 0; x < WORLD_W; x += STEP) cells++;
    for (const id of TOWER_ORDER) {
      let ok = 0;
      for (let y = 0; y < WORLD_H; y += STEP) {
        for (let x = 0; x < WORLD_W; x += STEP) if (probe.canPlace(id, x, y)) ok++;
      }
      share[id] = ok / cells;
    }
    const small = share[TOWER_ORDER[0]];
    const big = Math.min(...TOWER_ORDER.map((t) => share[t]));
    if (small < 0.18) {
      fail(`${map.id}: nur ${(small * 100).toFixed(0)} % des Feldes tragen den kleinsten Turm - zu eng.`);
    }
    if (small > 0.62) {
      warn(`${map.id}: ${(small * 100).toFixed(0)} % des Feldes sind bebaubar - sehr offen, das Gelaende entscheidet kaum mit.`);
    }
    if (big < 0.07) {
      fail(`${map.id}: der groesste Turm passt nur auf ${(big * 100).toFixed(0)} % des Feldes.`);
    }
    // Der Platzbedarf muss ueberhaupt einen Unterschied machen - sonst ist er
    // eine Zahl ohne Wirkung.
    if (small - big < 0.05) {
      warn(`${map.id}: grosser und kleiner Turm haben fast dieselbe Flaeche - der Platzbedarf wirkt nicht.`);
    }

    // Der ganze Weg muss von irgendwo aus erreichbar sein.
    //
    // Gezaehlt wird nur, was im Feld liegt. Der Weg beginnt und endet
    // absichtlich ausserhalb des Bildes - dort steht das Tor, und dort kann
    // per Definition kein Turm stehen. Diese Punkte als unerreichbar zu
    // melden ist ein Fehlalarm; er trat auf, sobald die Tuerme mehr Platz
    // brauchten und die Meldung dadurch ueber die Schwelle rutschte.
    const reach = Math.max(...TOWER_ORDER.map((t) => rangeFor(t, null, 1)));
    let uncovered = 0, total = 0;
    for (const p of paths) {
      for (let k = 0; k < p.pts.length; k += 6) {
        const pt = p.pts[k];
        if (pt.x < 0 || pt.y < 0 || pt.x > WORLD_W || pt.y > WORLD_H) continue;
        total++;
        let found = false;
        for (let a = 0; a < 16 && !found; a++) {
          for (let d = 60; d <= reach && !found; d += 40) {
            const ang = (Math.PI * 2 * a) / 16;
            const x = pt.x + Math.cos(ang) * d, y = pt.y + Math.sin(ang) * d;
            if (probe.canPlace('arrow', x, y)) found = true;
          }
        }
        if (!found) uncovered++;
      }
    }
    if (uncovered > total * 0.03) {
      fail(
        `${map.id}: ${uncovered} von ${total} Wegpunkten sind von keiner bebaubaren Stelle ` +
        'aus erreichbar - dort kaeme jeder Gegner unbehelligt durch.',
      );
    }

    // Der Einfuehrungspunkt muss bebaubar sein.
    if (!probe.canPlace('arrow', map.hint.x, map.hint.y)) {
      fail(`${map.id}: der empfohlene Bauplatz ${map.hint.x}/${map.hint.y} ist nicht bebaubar.`);
    }

    for (const line of profile) console.log(`    ${line}`);
    console.log(
      `  Karte ${map.name}: ${map.lanes.length} Bahn(en), Weg ` +
      `${Math.round(Math.max(...paths.map((p) => p.length)))} px, bebaubar ` +
      TOWER_ORDER.map((t) => `${TOWERS[t].name.slice(0, 4)} ${(share[t] * 100).toFixed(0)} %`).join(', '),
    );
  }

  // Auf dem Weg darf nichts stehen.
  //
  // Diese Pruefung fehlte, und die Gegenprobe hat es gefunden: setzt man den
  // Mindestabstand auf einen negativen Wert, duerfte man Tuerme mitten auf die
  // Strasse bauen - und kein Tor sagte etwas. Die Flaechenkennzahl merkt es
  // nicht, weil mehr Baugrund fuer sie nach mehr Freiheit aussieht.
  {
    const probe2 = new GameState(map.id);
    let drauf = 0, geprueft = 0;
    for (const p of paths) {
      for (let k = 0; k < p.pts.length; k += 4) {
        geprueft++;
        if (probe2.canPlace('arrow', p.pts[k].x, p.pts[k].y)) drauf++;
      }
    }
    if (drauf > 0) {
      fail(`${map.id}: an ${drauf} von ${geprueft} Stellen liesse sich mitten auf den Weg bauen.`);
    }
    // Und knapp daneben ebenfalls nicht - der Weg hat eine Breite.
    let amRand = 0;
    for (const p of paths) {
      for (let k = 0; k < p.pts.length; k += 8) {
        const e = p.edgesAt(k);
        if (probe2.canPlace('arrow', e.lx, e.ly) || probe2.canPlace('arrow', e.rx, e.ry)) amRand++;
      }
    }
    if (amRand > 0) {
      fail(`${map.id}: an ${amRand} Stellen liesse sich direkt auf den Wegrand bauen.`);
    }
  }

  // Kein Gegner darf durch seinen Zuschnitt kleiner werden, als sein Radius
  // sagt.
  //
  // Der Span wurde ueber den Fuellgrad des Bildes verkleinert statt ueber
  // seinen Radius - im Spiel war er dadurch elf Bildschirmpunkte gross statt
  // siebzehn. Dieselbe Verwechslung wie bei den Tuermen: die Kachel ist nicht
  // die Figur. Die Groesse gehoert in die Spieldaten, nicht in die
  // Bildaufbereitung.
  {
    const kleinst = Math.max(568 / WORLD_W, 320 / WORLD_H);
    for (const [id, def] of Object.entries(ENEMIES)) {
      const px = enemyArtWidth(id as EnemyId) * kleinst;
      if (px < 13) {
        fail(`${def.name}: nur ${px.toFixed(0)} Bildschirmpunkte auf dem kleinsten Geraet.`);
      }
    }
  }

  // Passen die Gegner ueberhaupt auf den Weg?
  //
  // Das war lange nicht geprueft, und man sah es erst im Bild: der
  // Leerentitan war dreimal so breit wie die engste Stelle, ein Schleicher
  // anderthalbmal. Deshalb verschmolzen sie zu einer Masse, in der man weder
  // einzelne Gegner noch ihre Lebensbalken auseinanderhalten konnte - und
  // jeder Querversatz war wirkungslos, weil kein Platz da war.
  {
    const engste = Math.min(...paths.map((p) => p.widthRange().min)) * 2;
    for (const [id, def] of Object.entries(ENEMIES)) {
      const breit = enemyArtWidth(id as EnemyId);
      const anteil = breit / engste;
      if (anteil > 1.35) {
        fail(
          `${map.id}: ${def.name} ist ${Math.round(anteil * 100)} % der engsten Wegstelle ` +
          `(${Math.round(breit)} zu ${Math.round(engste)}) - er passt nicht auf die Strasse.`,
        );
      } else if (anteil > 1.0) {
        warn(`${map.id}: ${def.name} fuellt die engste Stelle zu ${Math.round(anteil * 100)} %.`);
      }
    }
    // Und zwei kleine Gegner sollten nebeneinander Platz haben - sonst gibt es
    // keine Kolonne, sondern eine Reihe.
    const kleinste = Math.min(...Object.keys(ENEMIES).map((id) => enemyArtWidth(id as EnemyId)));
    if (kleinste * 1.7 > engste) {
      warn(`${map.id}: zwei kleine Gegner passen nicht nebeneinander (${Math.round(kleinste)} bei Weg ${Math.round(engste)}).`);
    }
  }

  for (const [key, val] of Object.entries(map.palette)) {
    if (!isHex(val)) fail(`${map.id}: Farbe "${key}" ist ungueltig (${val}).`);
  }

  const bal = map.balance;
  if (bal.hpMul < 0.85 || bal.hpMul > 1.2) {
    fail(`${map.id}: Ausgleich hpMul ${bal.hpMul} ausserhalb 0,85 bis 1,2.`);
  }
  if (bal.goldMul < 0.85 || bal.goldMul > 1.2) {
    fail(`${map.id}: Ausgleich goldMul ${bal.goldMul} ausserhalb 0,85 bis 1,2.`);
  }

}

// --- Das Reichweitensystem muss ein System bleiben.
//
// Vorher standen 45 Reichweiten von Hand in den Stufendaten, und niemand
// merkte, dass der Frostturm ueber seine Zweige um das 2,2-fache wuchs und
// der Moerser um das 1,28-fache. Zwei Ausbauten kosteten dasselbe und
// brachten voellig Verschiedenes.
{
  for (const id of TOWER_ORDER) {
    // Jede Stufe muss spuerbar mehr bringen.
    for (let b = 0; b < 2; b++) {
      for (let l = 2; l <= MAX_LEVEL; l++) {
        const vor = rangeFor(id, b as 0 | 1, l - 1);
        const jetzt = rangeFor(id, b as 0 | 1, l);
        if (jetzt <= vor) {
          fail(`${TOWERS[id].name}, Zweig ${b + 1}: Stufe ${l} bringt keine Reichweite.`);
        } else if (jetzt / vor < 1.03) {
          warn(`${TOWERS[id].name}, Zweig ${b + 1}: Stufe ${l} bringt nur ${Math.round((jetzt / vor - 1) * 100)} % Reichweite.`);
        }
      }
    }
    // Und der Ausbau ueber sechs Stufen muss sich lohnen.
    for (let b = 0; b < 2; b++) {
      const gesamt = rangeFor(id, b as 0 | 1, MAX_LEVEL) / rangeFor(id, b as 0 | 1, 1);
      if (gesamt < 1.25) {
        fail(`${TOWERS[id].name}, Zweig ${b + 1}: nur ${gesamt.toFixed(2)}-fache Reichweite ueber sechs Stufen.`);
      }
    }
  }
  // Die Rollen muessen sich unterscheiden.
  const grund = TOWER_ORDER.map((id) => rangeFor(id, null, 1));
  const spanne = Math.max(...grund) / Math.min(...grund);
  if (spanne < 1.5) {
    fail(`Die Grundreichweiten liegen nur ${spanne.toFixed(2)}-fach auseinander - die Turmwahl ist raeumlich beliebig.`);
  }
  // Und keine darf das halbe Feld ueberspannen.
  for (const id of TOWER_ORDER) {
    const weit = rangeFor(id, 0, MAX_LEVEL);
    if (weit > WORLD_W * 0.5) {
      fail(`${TOWERS[id].name}: ${weit} px auf Stufe 6 - mehr als das halbe Feld, damit deckt ein Turm alles ab.`);
    }
  }
}

// --- Zeichengroesse gegen Platzbedarf.
//
// Diese Pruefung fehlte, und man sah das Ergebnis erst im Bild: gezeichnet
// wurde jeder Turm 81 Pixel breit, stehen durfte ein Bogenturm schon 48 Pixel
// neben dem naechsten - 46 % Ueberlappung. Die Tuerme sahen aus wie ein
// Haufen statt wie Gebaeude.
{
  if (DRAW_SCALE > 1.35) {
    fail(`Zeichenmassstab ${DRAW_SCALE} - darueber ueberdecken sich Nachbarn.`);
  }
  if (DRAW_SCALE < 1.05) {
    warn(`Zeichenmassstab ${DRAW_SCALE} - der Turm wirkt in seinen Platz gequetscht.`);
  }
  // Hoehe kostet keinen Boden - aber sie ist nicht umsonst.
  //
  // Das Turmbild ist quadratisch gerendert. Wird es gestreckt, streckt sich
  // alles mit, auch der runde Sockel. Ab etwa einem Viertel sieht man dem
  // Oval an, dass es eines ist, und die Ansicht kippt optisch nach oben,
  // waehrend Boden, Weg und Gegner in ihrer Neigung bleiben. Dann stehen
  // wieder zwei Bildsprachen im selben Bild - genau der Befund B3 aus dem
  // Grafik-Audit, nur andersherum.
  if (TURM_HOEHE > 1.25) {
    fail(`Turmhoehe ${TURM_HOEHE} - darueber sieht man dem Bild die Streckung an.`);
  }
  if (TURM_HOEHE < 1) {
    fail(`Turmhoehe ${TURM_HOEHE} - unter 1 waere der Turm breiter als hoch.`);
  }
  // Zwei Tuerme dicht nebeneinander duerfen sich hoechstens leicht ueberdecken.
  //
  // Gerechnet wird mit dem ENGSTEN Paar: die beiden kleinsten Platzbedarfe
  // stehen am dichtesten beieinander, und wenn dort nichts uebereinander
  // liegt, liegt nirgends etwas uebereinander.
  {
    const engste = [...TOWER_ORDER].map((id) => TOWERS[id].footprint).sort((a, b) => a - b);
    const abstand = (engste[0] + engste[1]) / 2 + 4;
    const breite = TURM_BREITE * DRAW_SCALE;
    const ueber = (breite - abstand) / breite;
    if (ueber > 0.22) {
      fail(`Die beiden engsten Tuerme ueberdecken sich zu ${Math.round(ueber * 100)} % - `
        + 'hoechstens 22 % sind vorgesehen.');
    }
  }
  // Der Platzbedarf darf sich von der Zeichengroesse nicht weit entfernen.
  //
  // Nach oben waere er eine unsichtbare Sperre: der Turm bedeckt 96 Punkte
  // und verbietet auf 140. Nach unten stuenden zwei Bilder ineinander.
  for (const id of TOWER_ORDER) {
    const anteil = TOWERS[id].footprint / TURM_BREITE;
    if (anteil > 1.25 || anteil < 0.8) {
      fail(`${TOWERS[id].name}: Platzbedarf ${TOWERS[id].footprint} gegen Zeichenbreite `
        + `${TURM_BREITE} (${anteil.toFixed(2)}). Erlaubt ist 0,80 bis 1,25.`);
    }
  }
  // Ein unterschiedlicher Platzbedarf muss auch etwas AENDERN.
  //
  // Bis hierhin steht nur, dass die Zahlen verschieden sind - das ist eine
  // Aussage ueber die Datei, nicht ueber das Spiel. Die Gegenprobe
  // "Platzbedarf wieder fuer alle gleich" lief deshalb ins Leere: sie baute
  // den Fehler ein, und kein Tor sah ihn (Regel 5, gefunden in v144).
  //
  // Gemessen wird die Folge: der groesste Turm muss spuerbar weniger
  // Stellungen finden als der kleinste. Abgetastet wird das ganze Feld in
  // Schritten von 16 Weltpunkten, auf jeder Karte, auf leerem Feld.
  {
    const gross = [...TOWER_ORDER].sort((a, b) => TOWERS[b].footprint - TOWERS[a].footprint)[0];
    const klein = [...TOWER_ORDER].sort((a, b) => TOWERS[a].footprint - TOWERS[b].footprint)[0];
    for (const m of MAPS) {
      const s = new GameState();
      s.reset(1, 'normal', m.id);
      const zaehle = (id: TowerId): number => {
        let n = 0;
        for (let x = 40; x < WORLD_W; x += 16) {
          for (let y = 40; y < WORLD_H; y += 16) if (s.warumNicht(id, x, y) === null) n++;
        }
        return n;
      };
      const a = zaehle(klein), b = zaehle(gross);
      const weniger = a ? 1 - b / a : 0;
      if (weniger < 0.08) {
        fail(`${m.name}: ${TOWERS[gross].name} findet nur ${Math.round(weniger * 100)} % `
          + `weniger Stellungen als ${TOWERS[klein].name} (${b} gegen ${a}). `
          + 'Mindestens 8 % - sonst ist der Platzbedarf eine Zahl ohne Wirkung.');
      }
    }
  }
  // Und ein Turm muss auf dem Handy ueberhaupt zu erkennen sein.
  const kleinst = Math.max(568 / WORLD_W, 320 / WORLD_H);
  {
    const px = TURM_BREITE * DRAW_SCALE * kleinst;
    if (px < 22) {
      fail(`Tuerme sind nur ${px.toFixed(0)} Bildschirmpunkte gross auf dem kleinsten Geraet.`);
    }
  }
}

// ------------------------------------------------------------------ Tuerme

for (const id of TOWER_ORDER) {
  const t = TOWERS[id];
  if (t.id !== id) fail(`Turm ${id}: id stimmt nicht mit dem Schluessel ueberein.`);
  if (!isHex(t.color) || !isHex(t.accent)) fail(`Turm ${id}: ungueltige Farbe.`);
  if (!t.role || !t.blurb) fail(`Turm ${id}: Rolle oder Beschreibung fehlt.`);
  if (t.branches.length !== 2) fail(`Turm ${id}: es muessen genau zwei Zweige sein.`);

  const chain = (br: 0 | 1) => [t.base, ...t.branches[br].levels];
  for (const br of [0, 1] as const) {
    const b = t.branches[br];
    if (!isHex(b.color)) fail(`Turm ${id}, Zweig ${b.id}: ungueltige Farbe.`);
    if (!b.name || !b.blurb) fail(`Turm ${id}, Zweig ${b.id}: Name oder Beschreibung fehlt.`);
    if (b.levels.length !== MAX_LEVEL - 1) {
      fail(`Turm ${id}, Zweig ${b.id}: ${b.levels.length} Stufen statt ${MAX_LEVEL - 1}.`);
    }
    const lv = chain(br);
    for (let i = 0; i < lv.length; i++) {
      const l = lv[i];
      if (l.cost <= 0 || l.damage <= 0 || l.cooldown <= 0) {
        fail(`Turm ${id}, Zweig ${b.id}, Stufe ${i + 1}: Wert kleiner oder gleich null.`);
      }
      if (i > 0) {
        const p = lv[i - 1];
        // Schaden pro Sekunde muss steigen - einzelne Werte duerfen fallen,
        // sonst waeren Zweige wie "Salve" (weniger Wucht, mehr Takt) unmoeglich.
        if (l.damage / l.cooldown <= p.damage / p.cooldown) {
          fail(`Turm ${id}, Zweig ${b.id}, Stufe ${i + 1}: Schaden je Sekunde steigt nicht.`);
        }
        // Die Reichweite steht nicht mehr in den Stufendaten - sie kommt aus
        // dem System und wird weiter oben eigens geprueft.
      }
    }
  }

  // Zwei Zweige duerfen nicht denselben Bezeichner tragen: an ihm haengt die
  // gezeichnete Form. Gleicher Bezeichner hiesse gleicher Umriss - und dann
  // sieht man im Feld nicht, was man gebaut hat.
  if (t.branches[0].id === t.branches[1].id) {
    fail(`Turm ${id}: beide Zweige heissen "${t.branches[0].id}" - sie bekaemen denselben Umriss.`);
  }

  // Die beiden Zweige muessen sich wirklich unterscheiden - sonst ist die
  // Wahl keine. Geprueft an Stufe 2, wo die Entscheidung faellt.
  {
    const a = t.branches[0].levels[0], b = t.branches[1].levels[0];
    const rel = (x: number, y: number) => (x + y === 0 ? 0 : Math.abs(x - y) / ((x + y) / 2));
    const spread = Math.max(
      rel(a.damage / a.cooldown, b.damage / b.cooldown),
      // Die Reichweite kommt aus dem System und unterscheidet die Zweige
      // ohnehin - sie stammt nicht mehr aus diesen Daten.
      rel(rangeFor(id, 0, 2), rangeFor(id, 1, 2)),
      rel(a.splash ?? 0, b.splash ?? 0),
      rel(a.chains ?? 0, b.chains ?? 0),
      rel(a.slow ?? 0, b.slow ?? 0),
      rel(a.pierce ?? 0, b.pierce ?? 0),
    );
    if (spread < 0.25) {
      fail(`Turm ${id}: die beiden Zweige unterscheiden sich um weniger als ein Viertel - das ist keine Wahl.`);
    }
  }

  const l0 = t.base;
  if (t.attack === 'aura' && !l0.slow) fail(`Turm ${id}: Umkreisturm ohne Bremswert.`);
  if (t.attack === 'splash' && !l0.splash) fail(`Turm ${id}: Flaechenturm ohne Radius.`);
  if (t.attack === 'chain' && !l0.chains) fail(`Turm ${id}: Kettenturm ohne Spruenge.`);
  if ((t.attack === 'single' || t.attack === 'splash') && t.projectileSpeed <= 0) {
    fail(`Turm ${id}: Geschossturm ohne Geschossgeschwindigkeit.`);
  }
}

// --------------------------------------------------------------- Zweig-Waage
//
// Der Simulationsbot baut rund hundert Tuerme und ueberdeckt damit jeden
// Unterschied zwischen zwei Ausbauzweigen - ein toter Zweig faellt dort nicht
// auf. Deshalb wird hier direkt gerechnet: Wirkung je investiertem Gold auf
// der Endstufe, ueber ein Modell mit den tatsaechlichen Gegnerwerten.
//
// Das ist ausdruecklich ein Modell und kein Beweis. Es soll grobe Schieflagen
// finden, nicht die letzten fuenf Prozent.
{
  // Die Panzerung wird nach dem gewichtet, was spaet tatsaechlich kommt -
  // ein Mittelwert ueber alle Gegnerarten unterschaetzt sie deutlich. Genau
  // dieser Fehler liess in v12 zwei tote Zweige durch.
  // Ueber alle Karten, jeweils die spaetere Haelfte des Plans.
  const late = MAPS.flatMap((m) => m.waves.slice(Math.floor(m.waves.length / 2)));
  let armorSum = 0, hpSum = 0, airHp = 0;
  for (const w of late) {
    for (const g of w.groups) {
      const e = ENEMIES[g.enemy];
      if (!e) continue;
      const bulk = g.count * e.hp;
      armorSum += e.armor * bulk;
      hpSum += bulk;
      if (e.flying) airHp += bulk;
    }
  }
  const avgArmor = hpSum ? armorSum / hpSum : 0;
  const airShare = hpSum ? airHp / hpSum : 0;

  const worth = (id: typeof TOWER_ORDER[number], br: 0 | 1): number => {
    const t = TOWERS[id];
    // Ueber statsFor: nur so tragen die Werte die Reichweite aus dem System
    // und den Schadensausgleich des Wucht-Zweiges.
    const l = statsFor(t, br, 3);
    const invest = t.base.cost + t.branches[br].levels[0].cost + l.cost;
    // Panzerung schluckt einen Anteil, nicht eine feste Zahl - dieselbe
    // Rechnung wie im Spiel.
    const schluck = Math.min(0.66, Math.max(0, avgArmor - (l.pierce ?? 0)) * 0.11);
    const perHit = Math.max(1, l.damage * (1 - schluck));
    let dps = perHit / l.cooldown;
    if (l.splash) dps *= 1 + l.splash / 90;
    if (l.chains) dps *= 1 + l.chains * 0.5 * (l.falloff ?? 0.6);
    if (t.attack === 'aura') dps *= 1 + l.range / 260;   // trifft alles im Umkreis
    // Bremsen zaehlt schwer: ein gebremster Gegner steht laenger in der
    // Reichweite *aller* umliegenden Tuerme. Der Faktor 1,3 aus v12 war zu
    // niedrig - die Simulation liess einen Zweig scheitern, den das Modell
    // fuer 25 % besser hielt. Bei 2,4 stimmen beide ueberein.
    // Bremsen: nicht nur die Staerke zaehlt, sondern wie lange sie anhaelt und
    // wie oft sie erneuert wird.
    //
    // Vorher stand hier `1 + slow * 2.4` - die Dauer kam gar nicht vor. Damit
    // war "Ewiges Eis" mit Bremse 72 % ueber 3,4 Sekunden im Modell kaum mehr
    // wert als eine kurze Bremse, und das Modell widersprach der Simulation um
    // Faktor 1,9. Die Bremse wirkt auf *alle* Tuerme in Reichweite, deshalb
    // ist ihr Wert ein Vielfaches ihres eigenen Schadens.
    if (l.slow) {
      const uptime = Math.min(1, (l.slowTime ?? 1) / Math.max(0.2, l.cooldown));
      dps *= 1 + l.slow * uptime * 3.4;
    }
    dps *= 1 + l.range / 900;                            // Reichweite = mehr Zeit am Ziel
    if (!t.hitsAir) dps *= 1 - airShare * 0.7;
    return dps / invest;
  };

  for (const id of TOWER_ORDER) {
    const a = worth(id, 0), b = worth(id, 1);
    const ratio = a > b ? a / b : b / a;
    const better = a > b ? TOWERS[id].branches[0].name : TOWERS[id].branches[1].name;
    const line = `${TOWERS[id].name}: ${TOWERS[id].branches[0].name} ${(a * 1000).toFixed(1)} ` +
      `gegen ${TOWERS[id].branches[1].name} ${(b * 1000).toFixed(1)} (Faktor ${ratio.toFixed(2)})`;
    if (ratio > 1.7) {
      fail(`Zweig-Waage ${line} - "${better}" ist die offensichtlich bessere Wahl.`);
    } else if (ratio > 1.4) {
      warn(`Zweig-Waage ${line} - schief, aber noch vertretbar.`);
    } else {
      console.log(`  Zweig-Waage ${line}`);
    }
  }
}

// Mindestens ein Turm muss vom Start weg bezahlbar sein.
if (!TOWER_ORDER.some((id) => TOWERS[id].base.cost <= START_GOLD)) {
  fail(`Kein Turm ist mit dem Startgold von ${START_GOLD} bezahlbar.`);
}

// ------------------------------------------------------------------ Gegner

for (const [id, e] of Object.entries(ENEMIES)) {
  if (e.id !== id) fail(`Gegner ${id}: id stimmt nicht mit dem Schluessel ueberein.`);
  if (!isHex(e.body) || !isHex(e.trim)) fail(`Gegner ${id}: ungueltige Farbe.`);
  if (e.hp <= 0 || e.speed <= 0 || e.radius <= 0) fail(`Gegner ${id}: Wert kleiner oder gleich null.`);
  if (e.leak <= 0) fail(`Gegner ${id}: Durchkommen muss wehtun.`);
  if (e.leak > START_LIVES / 3) warn(`Gegner ${id}: ein einziges Durchkommen kostet ${e.leak} von ${START_LIVES}.`);
  if (e.bounty <= 0) fail(`Gegner ${id}: keine Belohnung.`);
  if (e.slowResist < 0 || e.slowResist > 1) fail(`Gegner ${id}: Bremsresistenz ausserhalb 0..1.`);
  // Panzerung darf schwache Tuerme nicht voellig aussperren.
  const bestFirst = Math.max(...TOWER_ORDER.map((t) => TOWERS[t].base.damage));
  if (e.armor >= bestFirst) warn(`Gegner ${id}: Panzerung ${e.armor} entwertet alle Stufe-1-Tuerme.`);
}

// Fliegende Gegner brauchen mindestens einen Turm, der sie erreicht -
// sonst waere die Welle nicht loesbar, sondern kaputt.
const airTowers = TOWER_ORDER.filter((id) => TOWERS[id].hitsAir);
if (Object.values(ENEMIES).some((e) => e.flying) && airTowers.length === 0) {
  fail('Es gibt fliegende Gegner, aber keinen Turm, der sie erreicht.');
}
if (airTowers.length === TOWER_ORDER.length && Object.values(ENEMIES).some((e) => e.flying)) {
  warn('Alle Tuerme treffen Flieger - der Gegnertyp stellt damit keine Frage.');
}

// Zerfall darf nicht endlos sein.
for (const [id, e] of Object.entries(ENEMIES)) {
  if (!e.split) continue;
  const child = ENEMIES[e.split.into];
  if (!child) { fail(`Gegner ${id}: zerfaellt in unbekanntes "${e.split.into}".`); continue; }
  if (e.split.into === id) fail(`Gegner ${id}: zerfaellt in sich selbst - endlose Kette.`);
  if (child.split) fail(`Gegner ${id}: Bruchstueck ${child.id} zerfaellt erneut - Kette zu tief.`);
  if (e.split.count < 2) fail(`Gegner ${id}: Zerfall in weniger als zwei Teile ergibt keinen Sinn.`);
  if (e.split.hpFactor <= 0 || e.split.hpFactor >= 1) {
    fail(`Gegner ${id}: Zerfallsanteil ${e.split.hpFactor} muss zwischen 0 und 1 liegen.`);
  }
  // Der Zerfall darf die Gesamtlebenspunkte nicht ueber das Original heben.
  const total = e.split.count * e.split.hpFactor;
  if (total >= 1) warn(`Gegner ${id}: Bruchstuecke haben zusammen ${Math.round(total * 100)} % der Huelle.`);
  if (child.leak * e.split.count > e.leak * 2) {
    warn(`Gegner ${id}: die Bruchstuecke richten zusammen mehr Schaden am Kristall an als das Original.`);
  }
}

// Jeder Zweig-Bezeichner muss im ganzen Spiel eindeutig sein - die
// Zeichenroutine unterscheidet die Umrisse allein daran.
{
  const seen = new Map<string, string>();
  for (const id of TOWER_ORDER) {
    for (const b of TOWERS[id].branches) {
      const other = seen.get(b.id);
      if (other) fail(`Zweig-Bezeichner "${b.id}" kommt bei ${other} und ${id} vor.`);
      seen.set(b.id, id);
    }
  }
}

// ------------------------------------------------------ Schwierigkeitsgrade
//
// Die Grade muessen eine Reihenfolge bilden. Ein "Ruhig", das an einer Stelle
// haerter ist als "Normal", verwirrt mehr, als es hilft.
{
  for (let i = 1; i < DIFFICULTY_ORDER.length; i++) {
    const a = DIFFICULTIES[DIFFICULTY_ORDER[i - 1]];
    const b = DIFFICULTIES[DIFFICULTY_ORDER[i]];
    if (b.startLives > a.startLives) fail(`${b.name} gibt mehr Kristall als ${a.name}.`);
    if (b.startGold > a.startGold) fail(`${b.name} gibt mehr Startgold als ${a.name}.`);
    if (b.hpEnd <= a.hpEnd) fail(`${b.name} hat keine haertere Lebenspunktkurve als ${a.name}.`);
    if (b.bountyMul > a.bountyMul) fail(`${b.name} zahlt mehr je Abschuss als ${a.name}.`);
    if (b.densityRamp < a.densityRamp) fail(`${b.name} schickt duennere Wellen als ${a.name}.`);
  }
  for (const id of DIFFICULTY_ORDER) {
    const d = DIFFICULTIES[id];
    if (!d.name || !d.blurb) fail(`Schwierigkeitsgrad ${id}: Name oder Beschreibung fehlt.`);
    if (d.startLives < 5) fail(`Schwierigkeitsgrad ${id}: unter 5 Kristall ist kein Spiel mehr.`);
    if (d.hpCurve < 1.5) {
      warn(`Schwierigkeitsgrad ${id}: flacher Exponent ${d.hpCurve} - die Mitte wird haerter als das Ende.`);
    }
    // Die erste Welle darf nirgends schon skaliert sein.
    const first = hpScale(d, 0, MAPS[0].waves.length);
    if (Math.abs(first - 1) > 1e-9) fail(`Schwierigkeitsgrad ${id}: Welle 1 startet nicht bei Faktor 1.`);
    if (!TOWER_ORDER.some((t) => TOWERS[t].base.cost <= d.startGold)) {
      fail(`Schwierigkeitsgrad ${id}: kein Turm ist mit ${d.startGold} Startgold bezahlbar.`);
    }
  }
}

// ------------------------------------------------------------- Fortschritt
{
  const maxStars = MAPS.length * DIFFICULTY_ORDER.length * 3;
  const totalCost = PERK_ORDER.reduce((a, id) => a + PERKS[id].cost, 0);
  if (totalCost > maxStars) {
    fail(`Die Verbesserungen kosten ${totalCost} Sterne, es gibt aber hoechstens ${maxStars}.`);
  }
  if (totalCost < maxStars * 0.3) {
    warn(`Alle Verbesserungen kosten nur ${totalCost} von ${maxStars} Sternen - zu frueh alles gekauft.`);
  }
  for (const id of PERK_ORDER) {
    const p = PERKS[id];
    if (p.id !== id) fail(`Verbesserung ${id}: id passt nicht zum Schluessel.`);
    if (!p.name || !p.blurb) fail(`Verbesserung ${id}: Name oder Beschreibung fehlt.`);
    if (p.cost < 1) fail(`Verbesserung ${id}: Kosten unter einem Stern.`);
  }
  // Die Sternschwelle muss eine Schwelle sein.
  if (starsFor(true, 20, 20) !== 3 || starsFor(true, 1, 20) !== 1 || starsFor(false, 5, 20) !== 0) {
    fail('Die Sternvergabe ist nicht monoton: makellos, knapp und verloren muessen sich unterscheiden.');
  }
  console.log(`  Fortschritt: ${totalCost} Sterne fuer alle Verbesserungen, ${maxStars} erreichbar`);
}

// --- Zwei Zweige duerfen nicht gleich aussehen (D17).
//
// R3 verlangt, dass der Ausbau sich verzweigt und die Wahl eine Wahl ist. Bis
// v115 schoss jeder Zweig denselben Punkt, nur in anderer Farbe - wer die
// Farben nicht auswendig kann, sah acht Endausbauten gleich schiessen. Die
// Vorbilder machen es anders: bei Kingdom Rush und Bloons nennt die
// SILHOUETTE die Waffe.
//
// Geprueft wird die Sache, nicht die Zeichnung: bekommen zwei Zweige
// desselben Turms verschiedene Formen? Eine Zeichnung laesst sich hier nicht
// pruefen, eine Zuordnung schon.
{
  const formenJeTurm = new Map<string, Set<string>>();
  for (const id of TOWER_ORDER) {
    const def = TOWERS[id];
    // Nur Tuerme, die ueberhaupt etwas fliegen lassen. Frostturm (Umkreis)
    // und Prisma (Blitz) haben kein Geschoss - dort waere die Frage sinnlos.
    if (def.attack === 'aura' || def.attack === 'chain') continue;
    const menge = new Set<string>();
    for (let zweig = 0; zweig < def.branches.length; zweig++) {
      const form = projektilform({
        owner: { def: id, branch: zweig } as unknown as Tower,
        splash: def.attack === 'splash' ? 1 : 0,
      });
      menge.add(form);
    }
    formenJeTurm.set(id, menge);
    if (menge.size < def.branches.length) {
      fail(`Turm ${id}: beide Zweige schiessen dieselbe Form (${[...menge].join(', ')}) - `
        + 'die Wahl ist dann nur an der Farbe zu erkennen.');
    }
  }
  // Und ueber die Tuerme hinweg: keine Form doppelt vergeben.
  const alle = [...formenJeTurm.values()].flatMap((m) => [...m]);
  if (new Set(alle).size !== alle.length) {
    fail(`Zwei verschiedene Zweige schiessen dieselbe Form: ${alle.join(', ')}`);
  }
  // Regel 3 an der Pruefung selbst: hat sie ueberhaupt etwas gesehen?
  if (alle.length < 4) {
    fail(`Die Geschossformen-Pruefung hat nur ${alle.length} Formen gefunden - `
      + 'das Muster passt nicht mehr, und die Pruefung lief ins Leere.');
  }
  console.log(`  Geschossformen: ${alle.join(', ')}`);
}

// --- Das Tor auf einer Karte (C24).
{
  for (const map of MAPS) {
    const t = map.tor;
    if (!t) continue;
    if (t.bahn < 0 || t.bahn >= map.lanes.length) {
      fail(`${map.id}: das Tor sitzt auf Bahn ${t.bahn}, die Karte hat ${map.lanes.length}.`);
    }
    // Auf einer einspurigen Karte waere ein Tor keine Umleitung, sondern eine
    // Pause - der Druck kann nirgends hin.
    if (map.lanes.length < 2) {
      fail(`${map.id}: ein Tor auf einer einspurigen Karte lenkt nichts um, es haelt nur an.`);
    }
    if (t.zu <= 0 || t.auf <= 0) {
      fail(`${map.id}: Torttakt ${t.zu}/${t.auf} - beide Haelften muessen groesser als null sein.`);
    }
    // Waere die Sperre laenger als eine ganze Welle dauert, gaebe es keinen
    // Takt mehr, sondern eine dauerhaft tote Bahn.
    if (t.zu > 25) {
      fail(`${map.id}: das Tor bleibt ${t.zu} s zu - das ist keine Sperre mehr, sondern eine `
        + 'Bahn weniger.');
    }
  }
  const mitTor = MAPS.filter((m) => m.tor);
  console.log(`  Tore: ${mitTor.length ? mitTor.map((m) => `${m.id} Bahn ${m.tor!.bahn} `
    + `(${m.tor!.zu} zu / ${m.tor!.auf} auf)`).join(', ') : 'keins'}`);
}

// ------------------------------------------------------------ Faehigkeiten

for (const id of ABILITY_ORDER) {
  const a = ABILITIES[id];
  if (a.id !== id) fail(`Faehigkeit ${id}: id stimmt nicht mit dem Schluessel ueberein.`);
  if (!isHex(a.color)) fail(`Faehigkeit ${id}: ungueltige Farbe.`);
  if (a.cooldown < 10) fail(`Faehigkeit ${id}: Abklingzeit ${a.cooldown} s ist zu kurz.`);
  if (!a.key || a.key.length !== 1) fail(`Faehigkeit ${id}: Tastenkuerzel fehlt.`);
  // Eine gezielte Faehigkeit braucht immer einen Radius - ohne ihn waere die
  // Stelle, die der Spieler antippt, ohne Bedeutung. Eine Anflugzeit
  // dagegen nur dann, wenn sie zuschlaegt: ein Brocken fliegt, eine Sperre
  // steht sofort. Bis v110 verlangte die Regel beides, weil es nur eine
  // gezielte Faehigkeit gab und die zufaellig beides hatte.
  if (a.kind === 'aimed' && !a.radius) {
    fail(`Faehigkeit ${id}: gezielte Faehigkeit ohne Radius - die angetippte Stelle waere ohne Bedeutung.`);
  }
  if (a.kind === 'aimed' && a.damage && !a.delay) {
    fail(`Faehigkeit ${id}: schlaegt gezielt zu, aber ohne Anflugzeit - dem Treffer fehlt die Ansage.`);
  }
  if (!a.damage && !a.slow && !a.gold) {
    fail(`Faehigkeit ${id}: wirkt weder ueber Schaden noch ueber Bremsen noch ueber Gold.`);
  }
  // Ein Bremswert von genau 1 ist der volle Halt - das ist R4 und
  // ausdruecklich erlaubt. Darueber hinaus waere es kein Tempo mehr,
  // sondern ein Rueckwaertsgang.
  if (a.slow !== undefined && (a.slow <= 0 || a.slow > 1)) {
    fail(`Faehigkeit ${id}: Bremswert ${a.slow} muss groesser als 0 und hoechstens 1 sein.`);
  }
  // Eine Faehigkeit, die Gold bringt UND auf dem Feld wirkt, ist keine
  // Entscheidung mehr - man zoege sie immer. Der Sinn von C17 ist der
  // Verzicht.
  if (a.gold && (a.damage || a.slow)) {
    fail(`Faehigkeit ${id}: bringt Gold und wirkt zusaetzlich auf dem Feld - dann gibt es nichts abzuwaegen.`);
  }
}
if (new Set(ABILITY_ORDER.map((id) => ABILITIES[id].key)).size !== ABILITY_ORDER.length) {
  fail('Zwei Faehigkeiten teilen sich dasselbe Tastenkuerzel.');
}
// Eine Faehigkeit darf eine Welle nicht im Alleingang entscheiden.
{
  const meteor = ABILITIES.meteor;
  const strongest = Math.max(...TOWER_ORDER.flatMap((t) =>
    TOWERS[t].branches.map((b) => (b.levels[1].damage / b.levels[1].cooldown) * 8)));
  if ((meteor.damage ?? 0) > strongest * 2) {
    warn(`Meteor schlaegt mit ${meteor.damage} zu - mehr als das Doppelte dessen, ` +
      'was der staerkste Turm in acht Sekunden schafft.');
  }
}

// ------------------------------------------------------------------ Wellen
//
// Jede Karte hat ihren eigenen Plan - und jeder wird einzeln geprueft.
for (const map of MAPS) {
  const plan = map.waves;
  if (plan.length < 12) fail(`${map.id}: nur ${plan.length} Wellen - zu kurz fuer einen Lauf.`);
  if (!plan.some((w) => w.groups.some((g) => ENEMIES[g.enemy]?.boss))) {
    fail(`${map.id}: kein einziger Boss im Wellenplan.`);
  }

  let prevPressure = 0;
  plan.forEach((w, i) => {
    if (!w.groups.length) fail(`${map.id}, Welle ${i + 1}: keine Gruppen.`);
    if (w.bonus <= 0) fail(`${map.id}, Welle ${i + 1}: kein Bonus.`);
    let pressure = 0, maxLeak = 0, dur = 0;
    for (const g of w.groups) {
      if (!(g.enemy in ENEMIES)) { fail(`${map.id}, Welle ${i + 1}: unbekannter Gegner "${g.enemy}".`); continue; }
      if (g.count <= 0) fail(`${map.id}, Welle ${i + 1}: Gruppe mit Anzahl ${g.count}.`);
      if (g.gap <= 0) fail(`${map.id}, Welle ${i + 1}: Abstand muss groesser als null sein.`);
      if (g.delay < 0) fail(`${map.id}, Welle ${i + 1}: negative Verzoegerung.`);
      const e = ENEMIES[g.enemy];
      const split = e.split ? e.split.count * e.split.hpFactor : 0;
      pressure += g.count * e.hp * (1 + split) * (g.hpMul ?? 1);
      maxLeak += g.count * (e.leak + (e.split ? e.split.count * ENEMIES[e.split.into].leak : 0));
      dur = Math.max(dur, g.delay + g.count * g.gap);
    }
    if (dur > 90) warn(`${map.id}, Welle ${i + 1}: dauert rechnerisch ${Math.round(dur)} s - sehr lang.`);
    // Anteilig, nicht absolut.
    //
    // Vorher stand hier `maxLeak < START_LIVES`. Als der Kristall von 20 auf
    // 60 stieg, meldete diese Zeile 22 Wellen auf einmal - nicht weil sich
    // etwas verschlechtert haette, sondern weil eine einzelne Welle bei 60
    // Kristall gar nicht mehr toedlich sein *soll*. Genau darum ging es beim
    // Umbau. Geprueft wird jetzt, ob eine spaete Welle wenigstens ein Viertel
    // des Kristalls kosten koennte - sonst ist sie belanglos.
    if (i >= plan.length * 0.6 && maxLeak < START_LIVES * 0.25) {
      warn(
        `${map.id}, Welle ${i + 1}: koennte hoechstens ${maxLeak} von ${START_LIVES} Kristall ` +
        'kosten - fuer eine spaete Welle zu belanglos.',
      );
    }
    const prevBoss = i > 0 && plan[i - 1].groups.some((g) => ENEMIES[g.enemy]?.boss);
    if (i > 0 && !prevBoss && pressure < prevPressure * 0.75) {
      warn(`${map.id}, Welle ${i + 1}: Druck faellt gegenueber Welle ${i} um mehr als ein Viertel.`);
    }
    prevPressure = Math.max(prevPressure, pressure);
  });

  // Jede Karte soll etwas anderes verlangen. Zwei Plaene, die dieselbe
  // Gegnermischung haben, sind zwei Namen fuer dieselbe Karte.
  const mixOf = (p: typeof plan) => {
    const m = new Map<string, number>();
    let total = 0;
    for (const w of p) for (const g of w.groups) {
      const e = ENEMIES[g.enemy];
      if (!e) continue;
      m.set(g.enemy, (m.get(g.enemy) ?? 0) + g.count * e.hp);
      total += g.count * e.hp;
    }
    return { m, total };
  };
  for (const other of MAPS) {
    if (other.id <= map.id) continue;
    const a = mixOf(map.waves), b = mixOf(other.waves);
    let diff = 0;
    for (const key of new Set([...a.m.keys(), ...b.m.keys()])) {
      diff += Math.abs((a.m.get(key) ?? 0) / a.total - (b.m.get(key) ?? 0) / b.total);
    }
    if (diff < 0.25) {
      // Bis v116 nur ein Hinweis - und Hinweise scrollen vorbei, einunddreissig
      // Stueck sind es. C26 stand deshalb vier Runden im Verzeichnis mit einer
      // Zahl (0,22), die niemand nachgemessen hatte; sie war laengst auf 0,34
      // gestiegen. Ein geschlossener Punkt, den kein Tor haelt, kann still
      // wieder aufgehen, und ein offener kann still zufallen. Beides ist
      // passiert.
      //
      // Das Soll kommt von aussen (Regel 10): Kingdom Rush und Plants vs.
      // Zombies geben jeder Stufe ein eigenes Aufgebot. Heute liegen alle drei
      // Paare bei 0,34 bis 0,44 - die Grenze ist mit Abstand gehalten, also
      // kostet die Verschaerfung nichts und haelt kuenftig etwas.
      fail(`${map.id} und ${other.id} verlangen fast dasselbe (Abstand ${diff.toFixed(2)}, `
        + 'noetig sind 0,25) - dann sind es zwei Namen fuer dieselbe Karte, und die '
        + 'zweite stellt keine eigene Frage.');
    }
  }
}

// --- Kein Zahlwort im Kartentext, das der Karte widerspricht.
//
// Der Blurb der zweiten Karte sagte "Zwei Zuwege", die Karte hat drei, und
// die ABGELEITETE Zeile direkt darunter sagte es richtig. Beides stand
// gleichzeitig auf dem Einweisungsbildschirm.
//
// Die Lehre ist nicht "besser aufpassen", sondern: gezaehlt wird gezaehlt,
// geschrieben wird beschrieben. Ein Kartentext darf sagen, wie sich die Karte
// anfuehlt - die Anzahl der Zuwege steht daneben und kommt aus den Daten.
{
  const ZAHLWORT: Record<string, number> = {
    ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, 'fünf': 5,
  };
  const SACHE = /(zuwege?|bahnen?|wege?)/i;
  for (const map of MAPS) {
    for (const treffer of map.blurb.matchAll(
      /\b(ein|eine|einen|zwei|drei|vier|fuenf|fünf)\s+([A-Za-zÄÖÜäöüß]+)/gi,
    )) {
      const zahl = ZAHLWORT[treffer[1].toLowerCase()];
      if (!zahl || !SACHE.test(treffer[2])) continue;
      if (zahl !== map.lanes.length) {
        fail(`${map.id}: der Text sagt "${treffer[0]}", die Karte hat `
          + `${map.lanes.length} Bahnen. Zahlen gehoeren nicht in den Kartentext - `
          + 'die Einweisung zaehlt sie selbst.');
      }
    }
  }
}

// --- Jeder Wert eines Turms muss vor dem Kauf zu sehen sein (F4).
//
// Der Genre-Bericht misst das auch, aber er ist kein Tor. Hier ist es eines,
// und zwar deshalb: der Fehler entsteht nicht durch Loeschen, sondern durch
// WACHSEN. `pierce`, `slowTime` und `falloff` kamen nacheinander in die
// Turmdaten, und jedes Mal hat niemand daran gedacht, sie auch anzuzeigen.
// Zwei davon standen bis v134 in keiner der beiden Listen - der Frostturm
// verschwieg, wie lange seine Bremse haelt.
//
// Gefragt wird an `statsFor`, geantwortet aus `turmwerte.ts`. Wer ein neues
// Feld eintraegt, wird hier abgeholt.
for (const id of TOWER_ORDER) {
  const fehlt = fehltVorKauf(TOWERS[id]);
  if (fehlt.length) {
    fail(`${id}: ${fehlt.join(', ')} steht in den Turmdaten, aber in keiner Zeile vor `
      + 'dem Kauf. Ohne alle Werte laesst sich nicht planen (F4) - Zeile in '
      + 'src/game/turmwerte.ts nachtragen.');
  }
}

// --- Kein Genre-Kriterium darf behaupten, gemessen zu sein, und dabei
// konstant antworten.
//
// R4 und G5 standen zusammen ueber sechzig Versionen auf `check: () => false`
// bei `measured: true`. Beide waren damit keine Massstaebe mehr, sondern
// Behauptungen: G5 blieb rot, als der Schildtraeger laengst im Spiel war,
// und R4 waere rot geblieben, egal was jemand baut. Aufgefallen ist es
// keinem Tor - der Genre-Bericht ist selbst keines.
//
// Die Regel ist scharf, weil die Daten scharf sind: von zehn konstanten
// Pruefungen sind heute zehn mit `measured: false` gekennzeichnet, also
// ausdruecklich von Hand beurteilt. Das ist der erlaubte Fall. Konstant UND
// als gemessen ausgewiesen ist keiner - und soll keiner werden.
//
// Die Grenze der Zusage, damit sie niemand ueberdehnt: geprueft wird die
// FESTE FORM, nicht die Bedeutung. Ein `return true` mitten in einem
// laengeren Rumpf faellt hier nicht auf. Das ist vertretbar, weil die feste
// Form genau das ist, was zweimal passiert ist - aber es ist eben eine
// Formpruefung, und die Gegenprobe steht auf derselben Form.
{
  const quelle = readFileSync(join(ROOT, 'tools/benchmark.ts'), 'utf8');
  // Die Bloecke beginnen mit einer Zeile, die nur "  {" enthaelt.
  const bloecke = quelle.split(/\n {2}\{\n/).slice(1);
  let gesehen = 0;
  for (const b of bloecke) {
    const id = /id: '([A-Z0-9]+)'/.exec(b);
    if (!id) continue;
    gesehen++;
    const konstant = /check: \(\) => (true|false)[,\s]/.exec(b);
    const gemessen = /measured: true/.test(b);
    if (konstant && gemessen) {
      fail(`Genre-Kriterium ${id[1]} ist als gemessen ausgewiesen, antwortet aber immer `
        + `"${konstant[1]}". Entweder wirklich messen oder auf "measured: false" `
        + `setzen - eine Behauptung ist kein Massstab.`);
    }
  }
  // Regel 3, an der Pruefung selbst: findet sie ueberhaupt etwas?
  if (gesehen < 25) {
    fail(`Der Genre-Waechter hat nur ${gesehen} Kriterien gefunden - das Muster passt `
      + 'nicht mehr auf tools/benchmark.ts, und die Pruefung lief ins Leere.');
  }
}

// ------------------------------------------------------------------ Ausgabe

for (const w of warnings) console.warn(`  Hinweis: ${w}`);
if (errors.length) {
  console.error(`DATEN-WAECHTER: ${errors.length} Fehler`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`DATEN-WAECHTER: 0 Fehler, ${warnings.length} Hinweis(e).`);
