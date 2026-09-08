/**
 * Wellenplaene aus einer BESCHREIBUNG erzeugen, messen und eintragen.
 *
 * **Warum es das braucht.** Die vier Plaene stehen seit v18 als
 * Punktlisten in `src/data/waves.ts` - 60 Wellen, rund 180 Gruppen, jede
 * Zahl von Hand gesetzt. Das laesst sich nicht durchprobieren: wer die
 * Steigung aendern will, aendert 180 Zahlen, und wer sie einmal geaendert
 * hat, kann nicht mehr sagen, welche davon Absicht war. Geeicht wird dann am
 * Gefuehl.
 *
 * Gemessen ist der Preis dafuer im Spielspass-Audit (v239): die Druckkurve
 * faellt auf allen vier Karten drei- bis fuenfmal, und **auf keiner ist die
 * letzte Welle die schwerste** - der Hoehepunkt liegt in der Mitte, und
 * danach wird es leichter, waehrend die Verteidigung weiter waechst.
 *
 * Dieselbe Bauart wie `bahnbau` seit v237: der Entwurf steht als Daten in
 * `entwurf/wellen.json`, gerechnet wird in `tools/wellenmass.ts` - derselben
 * Datei, aus der auch `npm run guards` seine Zahlen nimmt -, und eingetragen
 * wird nur, wenn jede Regel haelt.
 *
 * Aufruf: npm run wellenbau              messen und zeigen
 *         npm run wellenbau -- --schreiben   in src/data/waves.ts eintragen
 *         npm run wellenbau -- <karte>       nur diese Karte
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENEMIES, type EnemyId } from '../src/data/enemies';
import type { Wave, WaveGroup } from '../src/data/waves';
import { MAPS } from '../src/data/maps';
import { DIFFICULTIES, hpScale } from '../src/data/difficulty';
import { abstand, ausstoss, druck, kurve, luftanteil, mischung } from './wellenmass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHREIBEN = process.argv.includes('--schreiben');
const NUR = process.argv.slice(2).find((a) => !a.startsWith('-'));

interface ArtSpec { id: EnemyId; ab: number; gewicht: number; boss?: boolean }
interface KartenSpec {
  wellen: number;
  druck: { erste: number; letzte: number; form: number };
  arten: ArtSpec[];
  luft: number;
  schildAb: number;
  traegerAb: number;
  ausstossMax: number;
}

const entwurf = JSON.parse(
  readFileSync(join(ROOT, 'entwurf/wellen.json'), 'utf8'),
) as Record<string, KartenSpec | string[]>;

/** Der Zieldruck der Welle `i` von `n`.
 *
 *  Streng steigend, damit die Kurve monoton ist und die letzte Welle die
 *  staerkste - genau das, was heute auf keiner Karte gilt. `form` biegt sie:
 *  1 ist linear, 2 ist quadratisch, also lange flach und spaet steil. */
function zieldruck(s: KartenSpec, i: number): number {
  const t = i / Math.max(1, s.wellen - 1);
  const wirksam = s.druck.erste + (s.druck.letzte - s.druck.erste) * Math.pow(t, s.druck.form);
  return wirksam / skala(s, i);
}

/** Die Lebenspunktskala der Welle `i` - dieselbe, die das Spiel benutzt.
 *
 *  **Der Grund, aus dem der erste Entwurf gescheitert ist.** Er hat gegen den
 *  ROHEN Plan entworfen: null Rueckfaelle, Finale gleich Spitze, jede
 *  Datenregel gehalten - und `npm run sim` meldete "Gemischt muss gewinnen -
 *  die Kurve ist zu steil". Der Plan ist nur einer von zwei Faktoren; der
 *  andere ist `hpScale`, und der steigt ueber einen Lauf um das
 *  Zwanzigfache. Eine monotone rohe Kurve mal einer steilen Skala ist eine
 *  doppelt steile wirksame - die letzte Welle traf 1,75 mal so hart wie
 *  heute.
 *
 *  Entworfen wird deshalb in WIRKSAMEN Werten, und die Werkbank teilt durch
 *  die Skala. Damit ist die wirksame Kurve von Bauart monoton und endet dort,
 *  wo sie heute endet. */
function skala(s: KartenSpec, i: number): number {
  const map = MAPS.find((m) => entwurf[m.id] === s);
  return hpScale(DIFFICULTIES.normal, i, s.wellen, map?.balance.hpMul ?? 1);
}

/** Ein Wuerfel mit fester Folge - zwei Laeufe muessen denselben Plan
 *  erzeugen, sonst ist der Entwurf keine Beschreibung, sondern ein Zufall. */
function wuerfel(saat: number): () => number {
  let z = saat >>> 0;
  return () => {
    z = (z * 1664525 + 1013904223) >>> 0;
    return z / 4294967296;
  };
}

/** Der Lebenspunktbeitrag EINES Gegners dieser Art - mit dem, was aus ihm
 *  wird. Dieselbe Rechnung wie `wellenDruck`, nur je Stueck. */
function stueckdruck(id: EnemyId): number {
  const e = ENEMIES[id];
  const zerfall = e.split ? e.split.count * e.split.hpFactor : 0;
  return e.hp * (1 + zerfall);
}

/** Einen Plan bauen. */
function bauen(id: string, s: KartenSpec): Wave[] {
  const w = wuerfel(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const plan: Wave[] = [];

  for (let i = 0; i < s.wellen; i += 1) {
    const nr = i + 1;
    const ziel = zieldruck(s, i);
    // Wer darf hier vorkommen? Der Boss erst ab seiner Welle, und dann nicht
    // in jeder - sonst ist er keiner.
    const offen = s.arten.filter((a) => a.ab <= nr && (!a.boss || nr >= a.ab));
    const bossJetzt = s.arten.find((a) => a.boss && nr >= a.ab)
      && (nr === s.wellen || (nr - (s.arten.find((a) => a.boss)?.ab ?? 99)) % 5 === 0);

    // Die neueste Art traegt die Welle, in der sie zum ersten Mal kommt.
    const neu = offen.find((a) => a.ab === nr);
    const auswahl: ArtSpec[] = [];
    if (neu) auswahl.push(neu);
    const rest = offen.filter((a) => a !== neu && !a.boss);
    // Zwei bis vier Gruppen: eine Welle aus einer Art ist langweilig, eine
    // aus sechs ist Brei.
    const zahl = Math.min(rest.length, 1 + Math.floor(w() * 3) + (nr > s.wellen / 2 ? 1 : 0));
    const gewichtet = [...rest].sort((a, b) => (b.gewicht * (0.7 + w() * 0.6))
      - (a.gewicht * (0.7 + w() * 0.6)));
    for (const a of gewichtet.slice(0, Math.max(1, zahl - auswahl.length))) auswahl.push(a);
    if (bossJetzt) {
      const boss = s.arten.find((a) => a.boss);
      if (boss) auswahl.unshift(boss);
    }

    // Den Druck auf die Gruppen verteilen, nach Gewicht.
    const summe = auswahl.reduce((a, b) => a + b.gewicht, 0);
    const groups: WaveGroup[] = [];
    let delay = 0;
    for (const a of auswahl) {
      const anteil = a.gewicht / summe;
      const count = Math.max(1, Math.round((ziel * anteil) / stueckdruck(a.id)));
      // **Der Abstand kommt aus dem Ausstossfenster, nicht umgekehrt.**
      //
      // Der erste Entwurf rechnete `ausstossMax / count` und legte den
      // Startversatz obendrauf - gemessen kamen 27 bis 35 Sekunden heraus,
      // wo 22 bis 24 erlaubt sind. Die Gruppe muss aber in das FENSTER
      // passen, das nach ihrem Versatz noch uebrig ist; sonst laeuft die
      // Welle laenger, je mehr Gruppen sie hat.
      const fenster = Math.max(3, s.ausstossMax - delay);
      const gap = Math.max(0.28, Math.min(2.4, fenster / Math.max(1, count - 1)));
      groups.push({ enemy: a.id, count, gap, delay: Math.round(delay * 10) / 10 });
      // Der Versatz waechst, aber nie ueber das halbe Fenster - sonst bliebe
      // fuer die letzte Gruppe kein Platz.
      delay = Math.min(s.ausstossMax * 0.55, delay + 2 + w() * 3);
    }

    // Schilde und Traeger: ab der beschriebenen Welle, auf der schnellsten
    // Gruppe - dort tun sie weh, weil Schnellfeuer sie sonst wegraeumt.
    if (nr >= s.schildAb) {
      const schnellste = groups
        .slice()
        .sort((x, y) => ENEMIES[y.enemy].speed - ENEMIES[x.enemy].speed)[0];
      if (schnellste) schnellste.shield = Math.min(10, 4 + Math.floor((nr - s.schildAb) / 2));
    }
    if (nr >= s.traegerAb) {
      const zaehste = groups
        .slice()
        .sort((x, y) => ENEMIES[y.enemy].hp - ENEMIES[x.enemy].hp)[0];
      if (zaehste && !ENEMIES[zaehste.enemy].boss) zaehste.traeger = 6;
    }

    plan.push({
      groups,
      bonus: Math.round(40 + ziel * 0.36),
      note: neu ? `Erste ${ENEMIES[neu.id].name}` : undefined,
    });
  }

  // **Der Luftanteil wird nachgezogen, nicht erhofft.**
  //
  // Er ist keine Vorliebe, sondern eine Sperre: der Moerser erreicht als
  // einziger Turm keine Flieger, und dieser Nachteil ist nur dann einer,
  // wenn Luft vorkommt. `npm run guards` haelt deshalb den Abstand zwischen
  // der dichtesten und der duennsten Karte auf hoechstens Faktor 2.
  //
  // Aus dem Gewicht allein kommt er nicht heraus: der erste Entwurf traf 0,5
  // bis 2,8 % bei verlangten 8 bis 16. Der Grund ist die Bauart des Ziehens -
  // eine Art mit kleinem Gewicht kommt selten in die Auswahl UND bekommt dann
  // wenige Stueck, also multipliziert sich die Seltenheit. Gezogen wird
  // deshalb hinterher, mit der Zahl, die zaehlt.
  const flieger = s.arten.find((a) => ENEMIES[a.id].flying);
  if (flieger) {
    for (let runde = 0; runde < 40; runde += 1) {
      const ist = luftanteil(plan).anteil;
      if (Math.abs(ist - s.luft) < 0.004) break;
      const faktor = ist > 0 ? Math.min(2.5, Math.max(0.4, s.luft / ist)) : 2.5;
      let getroffen = false;
      plan.forEach((wl, i) => {
        if (i + 1 < flieger.ab) return;
        const g = wl.groups.find((x) => x.enemy === flieger.id);
        if (g) {
          g.count = Math.max(1, Math.round(g.count * faktor));
          getroffen = true;
        } else if (ist < s.luft && (i + 1 - flieger.ab) % 2 === 0) {
          // Eine Welle mehr mit Luft - der Waechter zaehlt auch die WELLEN,
          // nicht nur die Lebenspunkte.
          const zielzahl = Math.max(1, Math.round(
            zieldruck(s, i) * 0.14 / stueckdruck(flieger.id),
          ));
          wl.groups.push({
            enemy: flieger.id, count: zielzahl,
            gap: Math.max(0.4, Math.min(1.8, s.ausstossMax * 0.4 / Math.max(1, zielzahl - 1))),
            delay: Math.round(s.ausstossMax * 0.45 * 10) / 10,
          });
          getroffen = true;
        }
      });
      // **Nach jedem Zug normieren.**
      //
      // Sonst jagen sich die beiden: der Luftzug hebt die Fliegerzahl, die
      // Normierung senkt danach die Bodengruppen, und der Anteil steigt ueber
      // das Ziel. Gemessen kamen so 18,0 % heraus, wo 15,6 verlangt sind -
      // und der Waechter erlaubt zwischen der dichtesten und der duennsten
      // Karte nur den Faktor zwei. Zusammen gerechnet finden beide ihren
      // Punkt.
      normieren(s, plan);
      if (!getroffen) break;
    }
  }

  // **Zum Schluss wird der Druck normiert und neu getaktet.**
  //
  // Der Luftzug davor aendert Anzahlen, und damit den Druck einer Welle -
  // gemessen kamen die Rueckfaelle zurueck (0 -> 3) und der Ausstoss stieg
  // auf 63 Sekunden. Beides ist kein Fehler des Ziehens, sondern die Folge
  // davon, dass drei Groessen an denselben Zahlen haengen: Zusammensetzung,
  // Druck und Takt.
  //
  // Also nacheinander statt gleichzeitig: erst steht, WER kommt (und mit
  // welchem Luftanteil), dann WIEVIEL Druck die Welle traegt, dann WANN.
  // Genormt wird ueber alles ausser der Luft - sonst waere der eben gezogene
  // Anteil wieder dahin.
  normieren(s, plan);
  return plan;
}

/** Druck auf das Ziel bringen und neu takten - ohne die Luft anzutasten. */
function normieren(s: KartenSpec, plan: Wave[]): void {
  plan.forEach((wl, i) => {
    const ziel = zieldruck(s, i);
    const luftDruck = wl.groups
      .filter((g) => ENEMIES[g.enemy].flying)
      .reduce((a, g) => a + g.count * stueckdruck(g.enemy), 0);
    const bodenGruppen = wl.groups.filter((g) => !ENEMIES[g.enemy].flying);
    const bodenDruck = bodenGruppen.reduce((a, g) => a + g.count * stueckdruck(g.enemy), 0);
    const sollBoden = Math.max(0, ziel - luftDruck);
    if (bodenDruck > 0 && sollBoden > 0) {
      const f = sollBoden / bodenDruck;
      for (const g of bodenGruppen) g.count = Math.max(1, Math.round(g.count * f));
    }
    // Und der Takt: jede Gruppe muss in das Fenster passen, das nach ihrem
    // Versatz noch uebrig ist.
    let versatz = 0;
    for (const g of wl.groups) {
      g.delay = Math.round(versatz * 10) / 10;
      const fenster = Math.max(3, s.ausstossMax - versatz);
      g.gap = Math.round(Math.max(0.28, Math.min(2.4, fenster / Math.max(1, g.count - 1))) * 100) / 100;
      versatz = Math.min(s.ausstossMax * 0.55, versatz + 2 + (i % 3));
    }
    wl.bonus = Math.round(40 + ziel * 0.36);
  });
}

// --- messen und zeigen
const karten = MAPS.filter((m) => !NUR || m.id === NUR);
const gebaut = new Map<string, Wave[]>();
let befunde = 0;

for (const map of karten) {
  const s = entwurf[map.id] as KartenSpec | undefined;
  if (!s || Array.isArray(s)) {
    console.error(`Kein Entwurf fuer "${map.id}" in entwurf/wellen.json.`);
    befunde += 1;
    continue;
  }
  const plan = bauen(map.id, s);
  gebaut.set(map.id, plan);

  // Gemessen wird die WIRKSAME Kurve - Plan mal Lebenspunktskala. Der Plan
  // allein ist nur einer von zwei Faktoren (siehe `skala`).
  const sk = (i: number) => skala(s, i);
  const k = kurve(plan, sk);
  const l = luftanteil(plan);
  const alt = kurve(map.waves, (i) => hpScale(DIFFICULTIES.normal, i, map.waves.length, map.balance.hpMul));
  const altL = luftanteil(map.waves);
  const maxAusstoss = Math.max(...plan.map(ausstoss));
  const rohSpitze = Math.max(...plan.map(druck));
  const rohSpitzeAlt = Math.max(...map.waves.map(druck));

  console.log(`\n${map.name}`);
  console.log(`  Druck        ${Math.round(druck(plan[0]))} -> ${Math.round(druck(plan[plan.length - 1]))}`
    + `   (heute ${Math.round(druck(map.waves[0]))} -> ${Math.round(druck(map.waves[map.waves.length - 1]))})`);
  console.log(`  Rueckfaelle  ${k.rueckfaelle}   (heute ${alt.rueckfaelle})`);
  console.log(`  Finale       ${Math.round(k.finaleGegenSpitze * 100)} % der Spitze`
    + `   (heute ${Math.round(alt.finaleGegenSpitze * 100)} %)`);
  console.log(`  Luftanteil   ${(l.anteil * 100).toFixed(1)} % in ${l.wellen} Wellen`
    + `   (heute ${(altL.anteil * 100).toFixed(1)} % in ${altL.wellen})`);
  console.log(`  Ausstoss     hoechstens ${Math.round(maxAusstoss)} s   (erlaubt ${s.ausstossMax})`);
  console.log(`  roher Druck  Spitze ${Math.round(rohSpitze)}   (heute ${Math.round(rohSpitzeAlt)})`);
}

// Der Abstand der Karten zueinander - zwei Plaene mit derselben Mischung
// sind zwei Namen fuer dieselbe Karte.
if (gebaut.size > 1) {
  console.log('\nAbstand der Mischungen (verlangt 0,125):');
  const ids = [...gebaut.keys()];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const d = abstand(mischung(gebaut.get(ids[i])!), mischung(gebaut.get(ids[j])!));
      const marke = d < 0.125 ? '  ZU NAH' : '';
      if (d < 0.125) befunde += 1;
      console.log(`  ${ids[i]} / ${ids[j]}   ${d.toFixed(3)}${marke}`);
    }
  }
}

/** Einen Plan als Quelltext ausgeben - in derselben Form, in der er seit v18
 *  in `src/data/waves.ts` steht. Von Hand lesbar bleibt er absichtlich: wer
 *  eine einzelne Welle nachsehen will, soll das koennen, ohne das Werkzeug
 *  zu starten. */
function alsQuelltext(plan: Wave[]): string {
  const zeilen = plan.map((w) => {
    const gruppen = w.groups.map((g) => {
      const teile = [`enemy: '${g.enemy}'`, `count: ${g.count}`, `gap: ${g.gap}`,
        `delay: ${g.delay}`];
      if (g.hpMul !== undefined) teile.push(`hpMul: ${g.hpMul}`);
      if (g.shield !== undefined) teile.push(`shield: ${g.shield}`);
      if (g.traeger !== undefined) teile.push(`traeger: ${g.traeger}`);
      return `    { ${teile.join(', ')} }`;
    }).join(',\n');
    const kopf = w.note ? `{ bonus: ${w.bonus}, note: '${w.note}', groups: [`
      : `{ bonus: ${w.bonus}, groups: [`;
    return `  ${kopf}\n${gruppen} ] },`;
  });
  return zeilen.join('\n');
}

if (SCHREIBEN) {
  if (befunde) {
    console.error('\nNicht eingetragen: es stehen Befunde offen.');
    process.exit(1);
  }
  const pfad = join(ROOT, 'src/data/waves.ts');
  let quelle = readFileSync(pfad, 'utf8');
  for (const [id, plan] of gebaut) {
    const name = `PLAN_${id.toUpperCase()}`;
    const anfang = quelle.indexOf(`export const ${name}: Wave[] = [`);
    if (anfang < 0) {
      console.error(`\n${name} steht nicht in waves.ts - nichts eingetragen.`);
      process.exit(1);
    }
    const kopfEnde = quelle.indexOf('\n', anfang) + 1;
    const ende = quelle.indexOf('\n];', kopfEnde);
    quelle = quelle.slice(0, kopfEnde) + alsQuelltext(plan) + quelle.slice(ende);
  }
  writeFileSync(pfad, quelle);
  console.log(`\nEingetragen in src/data/waves.ts: ${[...gebaut.keys()].join(', ')}.`);
  console.log('Jetzt `npm run sim` - erst dort faellt das Urteil.');
}
if (befunde) process.exit(1);
