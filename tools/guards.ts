/** Datenwaechter. Laeuft vor jedem Build und prueft die Inhaltsdateien auf
 *  Widersprueche, die im Spiel erst spaet oder gar nicht auffallen wuerden.
 *  Aufruf: npx tsx tools/guards.ts */
import { COLS, ROWS, TILE } from '../src/data/config';
import { DIFFICULTIES, DIFFICULTY_ORDER, hpScale } from '../src/data/difficulty';
import { PERKS, PERK_ORDER, starsFor } from '../src/data/perks';

const NORMAL = DIFFICULTIES.normal;
const START_GOLD = NORMAL.startGold;
const START_LIVES = NORMAL.startLives;
import { MAPS, cellKey, laneCells, pathCells } from '../src/data/maps';
import { TOWERS, TOWER_ORDER } from '../src/data/towers';
import { ENEMIES } from '../src/data/enemies';

import { ABILITIES, ABILITY_ORDER } from '../src/data/abilities';

const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);
const isHex = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s);

// ------------------------------------------------------------------ Karten

for (const map of MAPS) {
  if (!map.name || !map.blurb) fail(`${map.id}: Name oder Beschreibung fehlt.`);
  if (!map.lanes.length) { fail(`${map.id}: keine Bahn.`); continue; }

  // Innerhalb einer Bahn darf keine Zelle zweimal vorkommen - ein Weg, der
  // sich selbst kreuzt, ist auf einen Blick nicht mehr lesbar. Zwischen zwei
  // Bahnen ist eine gemeinsame Zelle dagegen genau das Gewuenschte: dort
  // laufen sie zusammen.
  let laneCellLists: ReturnType<typeof laneCells>[];
  try {
    laneCellLists = map.lanes.map(laneCells);
  } catch (e) { fail(`${map.id}: ${(e as Error).message}`); continue; }

  for (let i = 0; i < map.lanes.length; i++) {
    const lane = map.lanes[i];
    const seen = new Set<number>();
    let raw = 0;
    for (let k = 0; k < lane.length - 1; k++) {
      const a = lane[k], b = lane[k + 1];
      const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
      let x = a.x, y = a.y;
      for (;;) {
        if (x >= 0 && y >= 0 && x < COLS && y < ROWS) {
          raw++;
          const key = cellKey(x, y);
          if (seen.has(key) && !(k > 0 && x === a.x && y === a.y)) {
            fail(`${map.id}, Bahn ${i + 1}: kreuzt sich selbst bei Zelle ${x}/${y}.`);
          }
          seen.add(key);
        }
        if (x === b.x && y === b.y) break;
        x += sx; y += sy;
      }
    }
    if (raw < 18) warn(`${map.id}, Bahn ${i + 1}: mit ${raw} Zellen sehr kurz.`);

    const end = lane[lane.length - 1];
    const goal = map.lanes[0][map.lanes[0].length - 1];
    if (end.x !== goal.x || end.y !== goal.y) {
      fail(`${map.id}, Bahn ${i + 1}: endet nicht am Herzkristall.`);
    }
    if (goal.x < 0 || goal.y < 0 || goal.x >= COLS || goal.y >= ROWS) {
      fail(`${map.id}: der Herzkristall liegt ausserhalb des Feldes.`);
    }
    // Der Start muss ausserhalb liegen - sonst erscheinen Gegner mitten im Feld.
    const start = lane[0];
    const outside = start.x < 0 || start.y < 0 || start.x >= COLS || start.y >= ROWS;
    if (!outside) fail(`${map.id}, Bahn ${i + 1}: beginnt innerhalb des Feldes.`);
  }

  // Bahnen muessen aehnlich lang sein. Eine deutlich kuerzere Bahn ist eine
  // Abkuerzung: die Haelfte der Gegner laeuft dann an viel weniger Tuermen
  // vorbei, und die Karte wird aus einem Grund schwer, den man ihr nicht
  // ansieht. Genau das war in v19 der Fall.
  if (map.lanes.length > 1) {
    const lens = laneCellLists.map((l) => l.length);
    const min = Math.min(...lens), max = Math.max(...lens);
    if (max > min * 1.3) {
      fail(
        `${map.id}: Bahnlaengen ${lens.join('/')} - die kuerzeste ist eine Abkuerzung ` +
        `(hoechstens 30 % Unterschied erlaubt).`,
      );
    }
  }

  // Mehrere Bahnen muessen sich vereinen - zwei voellig getrennte Wege waeren
  // zwei Karten nebeneinander, keine Gabelung.
  if (map.lanes.length > 1) {
    const first = new Set(laneCellLists[0].map((c) => cellKey(c.x, c.y)));
    for (let i = 1; i < laneCellLists.length; i++) {
      const shared = laneCellLists[i].filter((c) => first.has(cellKey(c.x, c.y))).length;
      if (shared < 2) {
        fail(`${map.id}: Bahn ${i + 1} trifft nie auf Bahn 1 - das ist keine Gabelung.`);
      }
    }
  }

  const cells = pathCells(map);
  const pathKeys = new Set(cells.map((c) => cellKey(c.x, c.y)));
  const blockKeys = new Set(map.blocked.map((b) => cellKey(b.x, b.y)));
  for (const b of map.blocked) {
    if (pathKeys.has(cellKey(b.x, b.y))) fail(`${map.id}: Deko-Zelle ${b.x}/${b.y} liegt auf dem Pfad.`);
    if (b.x < 0 || b.y < 0 || b.x >= COLS || b.y >= ROWS) fail(`${map.id}: Deko-Zelle ${b.x}/${b.y} ausserhalb.`);
  }

  const hk = cellKey(map.hint.x, map.hint.y);
  if (pathKeys.has(hk) || blockKeys.has(hk)) {
    fail(`${map.id}: der empfohlene Bauplatz ${map.hint.x}/${map.hint.y} ist nicht bebaubar.`);
  }
  let touches = false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (pathKeys.has(cellKey(map.hint.x + dx, map.hint.y + dy))) touches = true;
  }
  if (!touches) warn(`${map.id}: der empfohlene Bauplatz liegt nicht am Pfad.`);

  let build = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = cellKey(x, y);
      if (!pathKeys.has(k) && !blockKeys.has(k)) build++;
    }
  }
  if (build < 40) fail(`${map.id}: nur ${build} Bauplaetze - zu wenig Spielraum.`);

  const bal = map.balance;
  // Eng gefasst: seit jede Karte einen eigenen Wellenplan hat, ist ein
  // groesserer Ausgleich ein Zeichen dafuer, dass der Plan nicht stimmt.
  if (bal.hpMul < 0.85 || bal.hpMul > 1.2) {
    fail(`${map.id}: Ausgleich hpMul ${bal.hpMul} ausserhalb 0,85 bis 1,2 - dann gehoert der Wellenplan geaendert, nicht der Faktor.`);
  }
  if (bal.goldMul < 0.85 || bal.goldMul > 1.2) {
    fail(`${map.id}: Ausgleich goldMul ${bal.goldMul} ausserhalb 0,85 bis 1,2.`);
  }

  // Farbwelt vollstaendig und gueltig.
  for (const [key, val] of Object.entries(map.palette)) {
    if (!isHex(val)) fail(`${map.id}: Farbe "${key}" ist ungueltig (${val}).`);
  }
  // Deckungsdichte: wie oft wird eine Pfadzelle von einem Turm erfasst, wenn
  // sechzehn gute Stellungen besetzt sind?
  //
  // Liegt der Wert deutlich ueber zwei, ist der Pfad schon mehrfach abgedeckt -
  // dann bringt ein weiterer Turm keine neue Strecke, sondern nur Ueberlappung,
  // und "viele Tuerme" hoert auf, ein eigener Spielstil zu sein. Genau das war
  // der Befund zu T16.
  {
    const reach = 210 / TILE;
    const scores: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const k = cellKey(x, y);
        if (pathKeys.has(k) || blockKeys.has(k)) continue;
        let covered = 0, nearest = 1e9;
        for (const c of cells) {
          const d = (c.x - x) ** 2 + (c.y - y) ** 2;
          if (d <= reach * reach) covered++;
          if (d < nearest) nearest = d;
        }
        if (nearest <= 4) scores.push(covered);
      }
    }
    scores.sort((a, b) => b - a);
    const top16 = scores.slice(0, 16).reduce((a, b) => a + b, 0);
    const density = top16 / cells.length;
    console.log(
      `  Karte ${map.name}: ${map.lanes.length} Bahn(en), ${cells.length} Pfadzellen, ` +
      `${build} Bauplaetze, Deckung je Pfadzelle bei 16 Tuermen ${density.toFixed(1)}`,
    );
    if (density > 3) {
      warn(
        `${map.id}: schon 16 Tuerme decken jede Pfadzelle ${density.toFixed(1)}-fach ab - ` +
        'weitere Tuerme bringen keine neue Strecke (T16).',
      );
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
    if (b.levels.length !== 2) fail(`Turm ${id}, Zweig ${b.id}: es muessen genau 2 Stufen sein.`);
    const lv = chain(br);
    for (let i = 0; i < lv.length; i++) {
      const l = lv[i];
      if (l.cost <= 0 || l.damage <= 0 || l.range <= 0 || l.cooldown <= 0) {
        fail(`Turm ${id}, Zweig ${b.id}, Stufe ${i + 1}: Wert kleiner oder gleich null.`);
      }
      if (i > 0) {
        const p = lv[i - 1];
        // Schaden pro Sekunde muss steigen - einzelne Werte duerfen fallen,
        // sonst waeren Zweige wie "Salve" (weniger Wucht, mehr Takt) unmoeglich.
        if (l.damage / l.cooldown <= p.damage / p.cooldown) {
          fail(`Turm ${id}, Zweig ${b.id}, Stufe ${i + 1}: Schaden je Sekunde steigt nicht.`);
        }
        if (l.range < p.range * 0.9) {
          fail(`Turm ${id}, Zweig ${b.id}, Stufe ${i + 1}: Reichweite faellt um mehr als ein Zehntel.`);
        }
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
      rel(a.range, b.range),
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
    const l = t.branches[br].levels[1];
    const invest = t.base.cost + t.branches[br].levels[0].cost + l.cost;
    // Panzerung frisst pro Treffer, nicht pro Sekunde - schnelle Tuerme
    // verlieren dadurch mehr.
    const perHit = Math.max(1, l.damage - Math.max(0, avgArmor - (l.pierce ?? 0)));
    let dps = perHit / l.cooldown;
    if (l.splash) dps *= 1 + l.splash / 90;
    if (l.chains) dps *= 1 + l.chains * 0.5 * (l.falloff ?? 0.6);
    if (t.attack === 'aura') dps *= 1 + l.range / 260;   // trifft alles im Umkreis
    // Bremsen zaehlt schwer: ein gebremster Gegner steht laenger in der
    // Reichweite *aller* umliegenden Tuerme. Der Faktor 1,3 aus v12 war zu
    // niedrig - die Simulation liess einen Zweig scheitern, den das Modell
    // fuer 25 % besser hielt. Bei 2,4 stimmen beide ueberein.
    if (l.slow) dps *= 1 + l.slow * 2.4;
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

// ------------------------------------------------------------ Faehigkeiten

for (const id of ABILITY_ORDER) {
  const a = ABILITIES[id];
  if (a.id !== id) fail(`Faehigkeit ${id}: id stimmt nicht mit dem Schluessel ueberein.`);
  if (!isHex(a.color)) fail(`Faehigkeit ${id}: ungueltige Farbe.`);
  if (a.cooldown < 10) fail(`Faehigkeit ${id}: Abklingzeit ${a.cooldown} s ist zu kurz.`);
  if (!a.key || a.key.length !== 1) fail(`Faehigkeit ${id}: Tastenkuerzel fehlt.`);
  if (a.kind === 'aimed' && (!a.radius || !a.delay)) {
    fail(`Faehigkeit ${id}: gezielte Faehigkeit braucht Radius und Anflugzeit.`);
  }
  if (!a.damage && !a.slow) fail(`Faehigkeit ${id}: wirkt weder ueber Schaden noch ueber Bremsen.`);
  if (a.slow !== undefined && (a.slow <= 0 || a.slow >= 1)) {
    fail(`Faehigkeit ${id}: Bremswert ${a.slow} muss zwischen 0 und 1 liegen.`);
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
    if (i >= 5 && maxLeak < START_LIVES) {
      warn(`${map.id}, Welle ${i + 1}: selbst bei totalem Durchkommen bleibt der Kristall stehen.`);
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
      warn(`${map.id} und ${other.id} verlangen fast dasselbe (Abstand ${diff.toFixed(2)}) - die Karten unterscheiden sich nur in der Form.`);
    }
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
