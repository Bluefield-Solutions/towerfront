/** `npm run netz` - haelt die abgeleiteten Bahnen gegen einen eingefrorenen
 *  Stand und faehrt die Ableitung in beide Richtungen.
 *
 *  **Warum es das braucht.** Seit v278 stehen die Bahnen nicht mehr als
 *  Punktlisten in `maps.ts`, sondern folgen aus `WEGNETZ`. Der Umbau ist nur
 *  dann folgenlos, wenn die abgeleiteten Kurven mit den alten
 *  DECKUNGSGLEICH sind - und das ist eine Messung, keine Behauptung. Der
 *  Stand in `tools/wegnetz-stand.txt` ist aus den Bahnen von v277 erzeugt,
 *  bevor die Ableitung eingebaut wurde.
 *
 *  Gemessen wird die KURVE, nicht die Kontrollpunkte: 64 Abtastpunkte in
 *  gleichen Bogenlaengen-Abstaenden je Bahn. Zwei verschiedene
 *  Punktlisten koennen dieselbe Kurve ergeben, und umgekehrt aendert ein
 *  verschobener Kontrollpunkt die Kurve auf ihrer ganzen Laenge.
 *  Messstelle (Regel 12): `LanePath` mit dem Standardwert `perSpan`, also
 *  dieselbe Kurve, auf der die Gegner laufen.
 *
 *  Zwei Selbsttests laufen bei jedem Aufruf mit:
 *
 *   1. **Rundlauf.** `netzAusBahnen(bahnenAusNetz(netz))` muss dieselben
 *      Bahnen ergeben. Die beiden Richtungen sind zueinander invers, oder
 *      eine von beiden ist falsch.
 *   2. **Ausweichprobe** (Regel 13). Eine benutzte Kante wird entfernt; die
 *      Ableitung MUSS dann eine andere Route liefern oder melden, dass es
 *      keine mehr gibt. Ohne diese Probe bewiese der Rundlauf nur, dass die
 *      Ableitung sich selbst treu ist - sie koennte die alte Route
 *      stillschweigend behalten, und niemand saehe es.
 *
 *   npm run netz               messen und berichten
 *   npm run netz -- --tor      dasselbe, aber rot bei Abweichung
 *   npm run netz -- --schreiben  den Stand neu setzen
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAPS } from '../src/data/maps';
import { LanePath, type PathPoint } from '../src/core/path';
import {
  WEGNETZ, bahnenAusNetz, netzAusBahnen, tore, weichenPfeil,
  type Wegnetz, type WeichenPfeil,
} from '../src/data/wegnetz';
import { kuerzesteRoute } from '../src/core/route';

const TOR = process.argv.includes('--tor');
const SCHREIBEN = process.argv.includes('--schreiben');
const STAND = fileURLToPath(new URL('wegnetz-stand.txt', import.meta.url));

/** Wieviele Punkte je Bahn abgetastet werden. */
const ABTAST = 64;
/** Was als deckungsgleich gilt. Erwartet werden 0,00 Weltpunkte - die
 *  Schwelle faengt nur das Rechenrauschen der Bogenlaengen-Tabelle ab. */
const SCHWELLE = 0.5;

/** Wieviel der Pfeil vom benutzten Ast abweichen darf, in Grad.
 *
 *  Nicht null: der Arm laeuft geradlinig aus dem Ring, der Ast ist eine
 *  Kurve, und die Richtung wird 90 Weltpunkte draussen abgegriffen. Gemessen
 *  liegen alle zehn Faelle (fuenf Weichen, zwei Stellungen) bei 0,0 Grad,
 *  weil beide dieselbe Stelle abgreifen; die Spanne ist der Platz fuer eine
 *  spaetere Glaettung im Bild, nicht ein gemessener Bedarf. */
const PFEIL_ABWEICHUNG = 12;

/** Wie weit die Gabel spreizen muss, damit man sie als Gabel sieht.
 *
 *  **Gemessen und nicht gesetzt** (Regel 10): ueber alle fuenf Weichen
 *  liegen die beiden Aeste 26,6 bis 123,0 Grad auseinander. Die Schranke
 *  steht bei 15 - deutlich unter der engsten, damit sie eine Weiche faengt,
 *  die zur Attrappe wird, und nicht die engste von heute. */
const GABEL_MIN = 15;

/** Der Winkel zwischen zwei Einheitsvektoren, in Grad. */
function winkel(a: { dx: number; dy: number }, b: { dx: number; dy: number }): number {
  const p = Math.max(-1, Math.min(1, a.dx * b.dx + a.dy * b.dy));
  return Math.acos(p) * 180 / Math.PI;
}

/** In welche Richtung ein Gegner den Abzweig verlaesst.
 *
 *  Gelesen an der abgeleiteten BAHN, also an der Kurve, die er wirklich
 *  abfaehrt - die unabhaengige Gegenrechnung zu `weichenPfeil`, das seine
 *  Richtung aus der Kantenliste nimmt.
 *
 *  Gesucht wird die Bahn, die dem Abzweig am naechsten kommt; liegt keine
 *  naeher als `BAHN_NAH`, gibt es `null` zurueck statt irgendeine zu nehmen.
 *  Die Richtung wird von dort aus dieselben 90 Weltpunkte weiter abgegriffen
 *  wie im Bild - ein Vergleich zweier verschiedener Abgriffstellen maesse die
 *  Kruemmung der Bahn und nicht den Pfeil (Regel 12). */
const BAHN_NAH = 80;

function richtungAufBahn(bahnen: PathPoint[][], pfeil: WeichenPfeil):
{ dx: number; dy: number } | null {
  let beste: { kurve: LanePath; s: number; d: number } | null = null;
  for (const b of bahnen) {
    const kurve = new LanePath(b);
    for (let t = 0; t <= 1.0001; t += 0.002) {
      const s = kurve.length * t;
      const q = kurve.at(s);
      const d = Math.hypot(q.x - pfeil.x, q.y - pfeil.y);
      if (!beste || d < beste.d) beste = { kurve, s, d };
    }
  }
  if (!beste || beste.d > BAHN_NAH) return null;
  const a = beste.kurve.at(beste.s);
  const b = beste.kurve.at(Math.min(beste.kurve.length, beste.s + 90));
  const dx = b.x - a.x, dy = b.y - a.y;
  const l = Math.hypot(dx, dy);
  return l > 0 ? { dx: dx / l, dy: dy / l } : null;
}

function abtasten(bahn: PathPoint[]): { x: number; y: number }[] {
  const kurve = new LanePath(bahn);
  const raus: { x: number; y: number }[] = [];
  for (let i = 0; i < ABTAST; i++) {
    const p = kurve.at((kurve.length * i) / (ABTAST - 1));
    raus.push({ x: p.x, y: p.y });
  }
  return raus;
}

const alsText = (ps: { x: number; y: number }[]): string =>
  ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(';');

const ausText = (t: string): { x: number; y: number }[] =>
  t.split(';').map((s) => {
    const [x, y] = s.split(',').map(Number);
    return { x, y };
  });

/** Der Stand, als Zeilen `<karte> <bahn> laenge=<n> abtast=<...>`. */
function standLesen(): Map<string, { laenge: number; punkte: { x: number; y: number }[] }> {
  const karte = new Map<string, { laenge: number; punkte: { x: number; y: number }[] }>();
  let text: string;
  try { text = readFileSync(STAND, 'utf8'); } catch { return karte; }
  for (const zeile of text.split('\n')) {
    if (!zeile.trim() || zeile.startsWith('#')) continue;
    const [id, nr, ...rest] = zeile.trim().split(/\s+/);
    const felder = new Map(rest.map((f) => f.split('=') as [string, string]));
    karte.set(`${id}:${nr}`, {
      laenge: Number(felder.get('laenge')),
      punkte: ausText(felder.get('abtast') ?? ''),
    });
  }
  return karte;
}

let fehler = 0;
const meldung = (t: string): void => { console.log(`  ! ${t}`); fehler++; };

console.log('NETZ - die Bahnen folgen aus dem Wegenetz.\n');

// ------------------------------------------------------- die Rechnung selbst
//
// **Der Fall wird gestellt, nicht abgewartet (Regel 5).** Heute hat KEINE der
// vier Karten eine zweite Route - von jedem Tor fuehrt genau ein Weg zum
// Ziel. Damit wuerde `kuerzesteRoute` an den ausgelieferten Netzen alles
// beweisen, was man will: sie koennte die laengste nehmen, die erstbeste,
// oder wuerfeln, und alle sieben Bahnen blieben deckungsgleich. Geprueft
// wird deshalb an einem eigens gebauten Netz mit einer echten Wahl.
//
// Das ist auch der Grund, warum die Gegenprobe aus der Story (die
// Kostenfunktion umdrehen, der Rauchtest meldet einen Umweg) heute NICHTS
// meldet: es gibt keinen Umweg, den man nehmen koennte. Sie wird tragen,
// sobald S-N2-03 Weichen dazulegt.
function probenetz(kurz: number, lang: number): Wegnetz {
  const punkte = (n: number, y: number) =>
    Array.from({ length: n }, (_, i) => ({ x: 100 + (i + 1) * 40, y, w: 40 }));
  return {
    knoten: [
      { id: 'tor1', x: 100, y: 500, w: 40, art: 'tor' },
      { id: 'ziel', x: 100 + (Math.max(kurz, lang) + 1) * 40, y: 500, w: 40, art: 'ziel' },
    ],
    kanten: [
      { id: 'a-lang', von: 'tor1', nach: 'ziel', punkte: punkte(lang, 300) },
      { id: 'b-kurz', von: 'tor1', nach: 'ziel', punkte: punkte(kurz, 500) },
    ],
  };
}

/** Zwei Kanten derselben Laenge: an y = 500 gespiegelt. */
function gleichstandsnetz(): Wegnetz {
  const punkte = (y: number) =>
    Array.from({ length: 6 }, (_, i) => ({ x: 100 + (i + 1) * 40, y, w: 40 }));
  return {
    knoten: [
      { id: 'tor1', x: 100, y: 500, w: 40, art: 'tor' },
      { id: 'ziel', x: 100 + 7 * 40, y: 500, w: 40, art: 'ziel' },
    ],
    kanten: [
      { id: 'a-oben', von: 'tor1', nach: 'ziel', punkte: punkte(400) },
      { id: 'b-unten', von: 'tor1', nach: 'ziel', punkte: punkte(600) },
    ],
  };
}

{
  const netz = probenetz(2, 12);
  const kurz = kuerzesteRoute(netz, 'tor1');
  if (kurz?.join() !== 'b-kurz') {
    meldung(`Selbsttest: die kuerzeste Route ist "${kurz?.join(' > ')}" statt "b-kurz".`);
  }
  const ohneKurz = kuerzesteRoute(netz, 'tor1', new Set(['b-kurz']));
  if (ohneKurz?.join() !== 'a-lang') {
    meldung(`Selbsttest: gesperrte kurze Kante fuehrt auf "${ohneKurz?.join(' > ')}" statt "a-lang".`);
  }
  if (kuerzesteRoute(netz, 'tor1', new Set(['a-lang', 'b-kurz'])) !== null) {
    meldung('Selbsttest: bei zwei gesperrten Kanten meldet die Rechnung eine Route.');
  }
  // Gleichstand: dieselbe Antwort, gleich in welcher Reihenfolge die Kanten
  // in der Datei stehen. Sonst haengt der Verlauf einer Partie daran, wer
  // zuletzt sortiert hat - und das Determinismus-Tor faende es nie.
  //
  // **Der erste Entwurf war gar kein Gleichstand.** Er nahm `probenetz(6, 6)`,
  // und dessen zwei Kanten haben zwar gleich viele Punkte, laufen aber auf
  // verschiedenen Hoehen: die eine weicht nach oben aus und ist damit
  // laenger. Die Probe schwieg zu Recht, und sie bewies nichts (Regel 3).
  // Jetzt sind die beiden Kanten zueinander gespiegelt - gleiche Laenge auf
  // die letzte Stelle.
  const gleich = gleichstandsnetz();
  const gedreht: Wegnetz = { ...gleich, kanten: [...gleich.kanten].reverse() };
  const a = kuerzesteRoute(gleich, 'tor1')?.join();
  const b = kuerzesteRoute(gedreht, 'tor1')?.join();
  if (a !== b) meldung(`Selbsttest: bei Gleichstand entscheidet die Zeilenfolge ("${a}" gegen "${b}").`);
  console.log(`  Selbsttest: kuerzeste von zwei Routen "${kurz?.join()}", `
    + `gesperrt weicht sie auf "${ohneKurz?.join()}" aus, beide zu meldet sie keine. `
    + `Gleichstand entscheidet die Kennung ("${a}").\n`);
}


const stand = standLesen();
const neu: string[] = [
  '# Der eingefrorene Verlauf der abgeleiteten Bahnen.',
  '#',
  '# Erzeugt aus den Punktlisten, die bis v277 in src/data/maps.ts standen -',
  '# also VOR dem Umbau auf WEGNETZ. Solange `npm run netz` null Abweichung',
  '# meldet, hat der Umbau am Spiel nichts geaendert.',
  '#',
  `# ${ABTAST} Abtastpunkte je Bahn in gleichen Bogenlaengen-Abstaenden,`,
  '# gemessen auf LanePath mit dem Standardwert perSpan.',
  '',
];

for (const map of MAPS) {
  const netz: Wegnetz | undefined = WEGNETZ[map.id];
  console.log(`── ${map.name}`);
  if (!netz) { meldung(`${map.id}: kein Wegenetz eingetragen.`); continue; }

  let bahnen: PathPoint[][];
  try { bahnen = bahnenAusNetz(netz); } catch (e) {
    meldung(`${map.id}: ${(e as Error).message}`); continue;
  }

  const kreuze = netz.knoten.filter((k) => k.art === 'kreuz').length;
  const wege = tore(netz).map((t) => kuerzesteRoute(netz, t.id));
  console.log(`  ${netz.knoten.length} Knoten (${tore(netz).length} Tore, ${kreuze} Knotenpunkte), `
    + `${netz.kanten.length} Kanten`);
  for (let i = 0; i < wege.length; i++) {
    console.log(`  Route ${i}: ${wege[i]?.join(' > ') ?? 'KEINE'}`);
  }

  // Selbsttest 1: der Rundlauf.
  const zurueck = netzAusBahnen(bahnen);
  const wieder = bahnenAusNetz(zurueck);
  if (JSON.stringify(wieder) !== JSON.stringify(bahnen)) {
    meldung(`${map.id}: der Rundlauf ist nicht deckungsgleich - `
      + 'netzAusBahnen und bahnenAusNetz sind nicht invers.');
  }

  // Selbsttest 2: die Ausweichprobe (Regel 13).
  //
  // Jede Kante, die die erste Route benutzt, wird einmal gesperrt. Die
  // Rechnung muss dann eine ANDERE Bahn liefern oder melden, dass keine Route
  // mehr existiert - sie darf die alte nicht stillschweigend behalten.
  let ausgewichen = 0; let ohneRoute = 0;
  for (const weg of wege[0] ?? []) {
    const ohne: Wegnetz = { ...netz, kanten: netz.kanten.filter((k) => k.id !== weg) };
    try {
      const ersatz = bahnenAusNetz(ohne);
      if (JSON.stringify(ersatz[0]) === JSON.stringify(bahnen[0])) {
        meldung(`${map.id}: ohne die Kante "${weg}" liefert die Rechnung dieselbe `
          + 'Bahn - sie behaelt die alte Route stillschweigend.');
      } else ausgewichen++;
    } catch {
      // Keine Route mehr, und das ist eine gueltige Antwort: sie ist gemeldet
      // worden statt verschwiegen.
      ohneRoute++;
    }
  }
  console.log(`  Ausweichprobe: ${wege[0]?.length ?? 0} benutzte Kante(n) einzeln `
    + `gesperrt - ${ausgewichen} mal eine andere Route, ${ohneRoute} mal gar keine mehr`);

  // Was die Weichen ausmachen. **Gemessen, nicht beurteilt** - das Urteil
  // steht seit v281 im Weichenfenster-Waechter (`npm run guards`), und zwar
  // an genau einer Stelle: eine Grenze, die in zwei Werkzeugen steht,
  // veraltet in einem von beiden (Regel 15).
  for (const w of netz.weichen ?? []) {
    try {
      const zu = bahnenAusNetz(netz, new Set([w.id]));
      const auf = new LanePath(bahnen[0]).length;
      const dann = new LanePath(zu[0]).length;
      console.log(`  Weiche "${w.id}" (${w.name}, sperrt ${w.kante}): `
        + `Bahn 0 ${auf.toFixed(0)} -> ${dann.toFixed(0)} Weltpunkte `
        + `(${dann > auf ? '+' : ''}${(100 * (dann / auf - 1)).toFixed(0)} %)`);
    } catch (e) {
      console.log(`  Weiche "${w.id}" (${w.name}): keine Route mehr - ${(e as Error).message}`);
    }
  }

  // **Zeigt die Weiche, wohin sie stellt? (v346, N4X)**
  //
  // Der Ring im Bild trug bis v345 einen liegenden Strich - das Zeichen fuer
  // "entfernen". Seit v346 ist es eine Gabel: der volle Arm entlang des
  // Astes, den der Verkehr nimmt, der gestrichelte entlang des ruhenden.
  // Gemessen werden hier die zwei Zusagen, von denen das abhaengt.
  //
  // Gefragt wird an `weichenPfeil`, also an derselben Funktion, aus der der
  // Renderer malt (Regel 15) - ein Pfeil kann damit nicht woandershin
  // zeigen als der Verkehr laeuft.
  for (const w of netz.weichen ?? []) {
    for (const zu of [false, true]) {
      const gestellt = new Set(zu ? [w.id] : []);
      const pfeil = weichenPfeil(netz, w.id, gestellt);
      if (!pfeil) {
        meldung(`${map.id}: die Weiche "${w.id}" hat in Stellung `
          + `${zu ? 'ZU' : 'OFFEN'} keine rechenbare Richtung - `
          + 'der Ring zeigt dann gar nichts an.');
        continue;
      }

      // 1. Der volle Arm zeigt dorthin, wo die GEGNER laufen.
      //
      //    Gefragt wird an der abgeleiteten BAHN - der Kurve, die ein Gegner
      //    wirklich abfaehrt -, und nicht an der Kantenliste, aus der
      //    `weichenPfeil` seine Richtung nimmt. Beides an derselben Liste zu
      //    fragen waere eine Kopie gegen sich selbst (v311, Regel 5); so
      //    faellt auch ein falscher Knoten, eine verkehrt herum gelesene
      //    Kante oder eine schief abgegriffene Tangente auf.
      const soll = richtungAufBahn(bahnenAusNetz(netz, gestellt), pfeil);
      if (!soll) {
        meldung(`${map.id}: am Abzweig der Weiche "${w.id}" laeuft in Stellung `
          + `${zu ? 'ZU' : 'OFFEN'} gar keine Bahn vorbei - der Ring sitzt `
          + 'dann neben dem Weg.');
        continue;
      }
      const ab = winkel(pfeil.aktiv, soll);
      if (ab > PFEIL_ABWEICHUNG) {
        meldung(`${map.id}: der Pfeil der Weiche "${w.id}" zeigt in Stellung `
          + `${zu ? 'ZU' : 'OFFEN'} ${ab.toFixed(1)} Grad neben dem Ast, den der `
          + `Verkehr nimmt (erlaubt ${PFEIL_ABWEICHUNG}).`);
      }

      // 2. Die Gabel muss als Gabel zu sehen sein. Zwei Arme, die
      //    uebereinanderliegen, sind ein Strich - und ein Strich war genau
      //    der Befund (Regel 13: ohne den Unterschied faellt die Zahl).
      const spreizung = winkel(pfeil.aktiv, pfeil.ruhend);
      if (spreizung < GABEL_MIN) {
        meldung(`${map.id}: die Gabel der Weiche "${w.id}" spreizt in Stellung `
          + `${zu ? 'ZU' : 'OFFEN'} nur ${spreizung.toFixed(1)} Grad `
          + `(noetig ${GABEL_MIN}) - zwei Arme darauf sehen aus wie einer.`);
      }
      if (!zu) {
        console.log(`  Weiche "${w.id}": Pfeil ${ab.toFixed(1)} Grad neben dem `
          + `benutzten Ast, Gabel spreizt ${spreizung.toFixed(1)} Grad`);
      }
    }
  }

  for (let i = 0; i < bahnen.length; i++) {
    const kurve = new LanePath(bahnen[i]);
    const punkte = abtasten(bahnen[i]);
    const alt = stand.get(`${map.id}:${i}`);
    let text = `  Bahn ${i}: ${bahnen[i].length} Kontrollpunkte, Laenge ${kurve.length.toFixed(1)}`;
    if (!alt) {
      text += ' - kein Stand';
      if (!SCHREIBEN) meldung(`${map.id} Bahn ${i}: im Stand nicht vermerkt.`);
    } else {
      // Verglichen wird auf der Aufloesung des Standes: er haelt eine
      // Nachkommastelle, und eine ungerundete Zahl dagegen zu halten
      // meldet immer 0,07 - das ist die Rundung, nicht die Abweichung.
      let groesste = 0;
      const rund = (z: number): number => Math.round(z * 10) / 10;
      for (let j = 0; j < Math.min(punkte.length, alt.punkte.length); j++) {
        const dx = rund(punkte[j].x) - alt.punkte[j].x, dy = rund(punkte[j].y) - alt.punkte[j].y;
        groesste = Math.max(groesste, Math.hypot(dx, dy));
      }
      if (punkte.length !== alt.punkte.length) groesste = Infinity;
      text += `, Abweichung ${groesste.toFixed(2)} Weltpunkte`;
      if (groesste > SCHWELLE) {
        meldung(`${map.id} Bahn ${i}: ${groesste.toFixed(2)} Weltpunkte neben dem Stand `
          + `(erlaubt ${SCHWELLE}).`);
      }
    }
    console.log(text);
    neu.push(`${map.id} ${i} laenge=${kurve.length.toFixed(1)} abtast=${alsText(punkte)}`);
  }
  console.log('');
}

if (SCHREIBEN) {
  writeFileSync(STAND, neu.join('\n') + '\n');
  console.log('NETZ: Stand neu geschrieben - damit ist die Deckungsgleichheit von hier an gemessen.');
} else if (fehler) {
  console.error(`\nNETZ: ${fehler} Befund(e).`);
  if (TOR) process.exit(1);
} else {
  console.log('NETZ: alle Bahnen deckungsgleich mit dem Stand, Rundlauf und Ausweichprobe halten.');
}
