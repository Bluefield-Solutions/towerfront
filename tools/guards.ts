/** Datenwaechter. Laeuft vor jedem Build und prueft die Inhaltsdateien auf
 *  Widersprueche, die im Spiel erst spaet oder gar nicht auffallen wuerden.
 *  Aufruf: npx tsx tools/guards.ts */
import { COLS, ROWS, START_GOLD, START_LIVES } from '../src/data/config';
import { MAPS, cellKey, pathCells } from '../src/data/maps';
import { TOWERS, TOWER_ORDER } from '../src/data/towers';
import { ENEMIES } from '../src/data/enemies';
import { WAVES } from '../src/data/waves';

const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);
const isHex = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s);

// ------------------------------------------------------------------ Karten

for (const map of MAPS) {
  let cells;
  try { cells = pathCells(map); } catch (e) { fail(`${map.id}: ${(e as Error).message}`); continue; }

  // Pfad darf sich nicht selbst kreuzen - das verwirrt beim Lesen der Karte.
  const seen = new Set<number>();
  const wps = map.waypoints;
  let raw = 0;
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
    let x = a.x, y = a.y;
    for (;;) {
      if (x >= 0 && y >= 0 && x < COLS && y < ROWS) {
        raw++;
        const k = cellKey(x, y);
        if (seen.has(k) && !(i > 0 && x === a.x && y === a.y)) {
          fail(`${map.id}: Pfad kreuzt sich bei Zelle ${x}/${y}.`);
        }
        seen.add(k);
      }
      if (x === b.x && y === b.y) break;
      x += sx; y += sy;
    }
  }
  if (raw < 25) warn(`${map.id}: Pfad ist mit ${raw} Zellen sehr kurz.`);

  const end = wps[wps.length - 1];
  if (end.x < 0 || end.y < 0 || end.x >= COLS || end.y >= ROWS) {
    fail(`${map.id}: Der Herzkristall liegt ausserhalb des Feldes.`);
  }

  const pathKeys = new Set(cells.map((c) => cellKey(c.x, c.y)));
  const blockKeys = new Set(map.blocked.map((b) => cellKey(b.x, b.y)));
  for (const b of map.blocked) {
    if (pathKeys.has(cellKey(b.x, b.y))) fail(`${map.id}: Deko-Zelle ${b.x}/${b.y} liegt auf dem Pfad.`);
    if (b.x < 0 || b.y < 0 || b.x >= COLS || b.y >= ROWS) fail(`${map.id}: Deko-Zelle ${b.x}/${b.y} ausserhalb.`);
  }
  let build = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = cellKey(x, y);
      if (!pathKeys.has(k) && !blockKeys.has(k)) build++;
    }
  }
  if (build < 40) fail(`${map.id}: nur ${build} Bauplaetze - zu wenig Spielraum.`);
}

// ------------------------------------------------------------------ Tuerme

for (const id of TOWER_ORDER) {
  const t = TOWERS[id];
  if (t.id !== id) fail(`Turm ${id}: id stimmt nicht mit dem Schluessel ueberein.`);
  if (!isHex(t.color) || !isHex(t.accent)) fail(`Turm ${id}: ungueltige Farbe.`);
  if (t.levels.length !== 3) fail(`Turm ${id}: es muessen genau 3 Stufen sein.`);
  if (!t.role || !t.blurb) fail(`Turm ${id}: Rolle oder Beschreibung fehlt.`);

  for (let i = 0; i < t.levels.length; i++) {
    const l = t.levels[i];
    if (l.cost <= 0 || l.damage <= 0 || l.range <= 0 || l.cooldown <= 0) {
      fail(`Turm ${id} Stufe ${i + 1}: Wert kleiner oder gleich null.`);
    }
    if (i > 0) {
      const p = t.levels[i - 1];
      if (l.damage <= p.damage) fail(`Turm ${id} Stufe ${i + 1}: Schaden steigt nicht.`);
      if (l.range < p.range) fail(`Turm ${id} Stufe ${i + 1}: Reichweite sinkt.`);
      if (l.cooldown > p.cooldown) fail(`Turm ${id} Stufe ${i + 1}: Takt wird langsamer.`);
    }
  }
  // Der Angriffstyp muss zu den Werten passen, sonst laeuft er ins Leere.
  const l0 = t.levels[0];
  if (t.attack === 'aura' && !l0.slow) fail(`Turm ${id}: Umkreisturm ohne Bremswert.`);
  if (t.attack === 'splash' && !l0.splash) fail(`Turm ${id}: Flaechenturm ohne Radius.`);
  if (t.attack === 'chain' && !l0.chains) fail(`Turm ${id}: Kettenturm ohne Spruenge.`);
  if ((t.attack === 'single' || t.attack === 'splash') && t.projectileSpeed <= 0) {
    fail(`Turm ${id}: Geschossturm ohne Geschossgeschwindigkeit.`);
  }
}

// Mindestens ein Turm muss vom Start weg bezahlbar sein.
if (!TOWER_ORDER.some((id) => TOWERS[id].levels[0].cost <= START_GOLD)) {
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
  const bestFirst = Math.max(...TOWER_ORDER.map((t) => TOWERS[t].levels[0].damage));
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

// ------------------------------------------------------------------ Wellen

let prevPressure = 0;
WAVES.forEach((w, i) => {
  if (!w.groups.length) fail(`Welle ${i + 1}: keine Gruppen.`);
  if (w.bonus <= 0) fail(`Welle ${i + 1}: kein Bonus.`);
  let pressure = 0, maxLeak = 0, dur = 0;
  for (const g of w.groups) {
    if (!(g.enemy in ENEMIES)) { fail(`Welle ${i + 1}: unbekannter Gegner "${g.enemy}".`); continue; }
    if (g.count <= 0) fail(`Welle ${i + 1}: Gruppe mit Anzahl ${g.count}.`);
    if (g.gap <= 0) fail(`Welle ${i + 1}: Abstand muss groesser als null sein.`);
    if (g.delay < 0) fail(`Welle ${i + 1}: negative Verzoegerung.`);
    const e = ENEMIES[g.enemy];
    const split = e.split ? e.split.count * e.split.hpFactor : 0;
    pressure += g.count * e.hp * (1 + split) * (g.hpMul ?? 1);
    maxLeak += g.count * (e.leak + (e.split ? e.split.count * ENEMIES[e.split.into].leak : 0));
    dur = Math.max(dur, g.delay + g.count * g.gap);
  }
  if (dur > 90) warn(`Welle ${i + 1}: dauert rechnerisch ${Math.round(dur)} s - sehr lang.`);
  // Ab der Mitte muss eine komplett durchgelassene Welle toedlich sein.
  if (i >= 5 && maxLeak < START_LIVES) {
    warn(`Welle ${i + 1}: selbst bei totalem Durchkommen bleibt der Kristall stehen.`);
  }
  // Der Druck darf zwischen zwei Wellen nicht einbrechen - ausser nach einer
  // Bosswelle, deren Spitze bewusst herausragt.
  const prevBoss = i > 0 && WAVES[i - 1].groups.some((g) => ENEMIES[g.enemy]?.boss);
  if (i > 0 && !prevBoss && pressure < prevPressure * 0.75) {
    warn(`Welle ${i + 1}: Druck faellt gegenueber Welle ${i} um mehr als ein Viertel.`);
  }
  prevPressure = Math.max(prevPressure, pressure);
});

// ------------------------------------------------------------------ Ausgabe

for (const w of warnings) console.warn(`  Hinweis: ${w}`);
if (errors.length) {
  console.error(`DATEN-WAECHTER: ${errors.length} Fehler`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`DATEN-WAECHTER: 0 Fehler, ${warnings.length} Hinweis(e).`);
