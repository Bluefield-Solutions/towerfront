/** Datenwaechter. Laeuft vor jedem Build und prueft die Inhaltsdateien auf
 *  Widersprueche, die im Spiel erst spaet oder gar nicht auffallen wuerden.
 *  Aufruf: npx tsx tools/guards.ts */
import { WORLD_W, WORLD_H } from '../src/data/config';
import { DIFFICULTIES, DIFFICULTY_ORDER, hpScale } from '../src/data/difficulty';
import { PERKS, PERK_ORDER, starsFor } from '../src/data/perks';

const NORMAL = DIFFICULTIES.normal;
const START_GOLD = NORMAL.startGold;
const START_LIVES = NORMAL.startLives;
import { MAPS, goalOf, lanePaths } from '../src/data/maps';
import { GameState } from '../src/game/state';
import { TOWERS, TOWER_ORDER, MAX_LEVEL, DRAW_SCALE } from '../src/data/towers';
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

    const end = lane[lane.length - 1];
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
      if (detour < 1.8) {
        fail(`${map.id}, Bahn ${i + 1}: Umwegfaktor ${detour.toFixed(2)} - der Weg ist fast eine Gerade.`);
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
    const reach = Math.max(...TOWER_ORDER.map((t) => TOWERS[t].base.range));
    let uncovered = 0, total = 0;
    for (const p of paths) {
      for (let k = 0; k < p.pts.length; k += 6) {
        total++;
        const pt = p.pts[k];
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

  // Unwegsames Gelaende darf nicht auf dem Weg liegen - dort waere es unsichtbar.
  for (const gr of map.rough) {
    if (Math.min(...paths.map((p) => p.distanceTo(gr.x, gr.y))) < gr.r) {
      fail(`${map.id}: unwegsames Gelaende bei ${gr.x}/${gr.y} ueberdeckt den Weg.`);
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
  // Zwei Tuerme dicht nebeneinander duerfen sich hoechstens leicht ueberdecken.
  for (const a of TOWER_ORDER) {
    for (const b of TOWER_ORDER) {
      const abstand = (TOWERS[a].footprint + TOWERS[b].footprint) / 2 + 4;
      const breite = (TOWERS[a].footprint + TOWERS[b].footprint) / 2 * DRAW_SCALE;
      const ueber = (breite - abstand) / breite;
      if (ueber > 0.22) {
        fail(
          `${TOWERS[a].name} neben ${TOWERS[b].name}: ${Math.round(ueber * 100)} % ` +
          'Ueberdeckung - hoechstens 22 % sind vorgesehen.',
        );
      }
    }
  }
  // Und ein Turm muss auf dem Handy ueberhaupt zu erkennen sein.
  const kleinst = Math.max(568 / WORLD_W, 320 / WORLD_H);
  for (const id of TOWER_ORDER) {
    const px = TOWERS[id].footprint * DRAW_SCALE * kleinst;
    if (px < 22) {
      fail(`${TOWERS[id].name}: nur ${px.toFixed(0)} Bildschirmpunkte gross auf dem kleinsten Geraet.`);
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
