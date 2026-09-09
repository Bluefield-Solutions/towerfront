import type { PathPoint } from '../core/path';
import {
  kuerzesteRoute, zielKnotenVon,
  type RouteKante, type RouteKnoten, type RoutenNetz,
} from '../core/route';

/** Das Wegenetz einer Karte: Knoten und Kanten als Daten.
 *
 *  **Warum es das gibt.** Bis v277 trug jede Karte eine feste Liste von
 *  Bahnen. Der Weg war damit gesetzt, nicht entschieden - und genau das ist
 *  der gemessene Abstand zu allen drei Vorbildern (Defense Grid, Infinitode 2,
 *  Rogue Tower): alle drei machen den WEG zur Entscheidung, keiner den Turm.
 *
 *  Am Kurvenmodell aendert sich dabei nichts. Eine Kante ist weiterhin eine
 *  Folge von Kontrollpunkten, durch die eine Catmull-Rom-Kurve laeuft; erst
 *  die Ableitung setzt sie zu Bahnen zusammen. Was sich aendert, ist allein,
 *  WOHER die Route kommt - und dass es mehr als eine gibt.
 *
 *  **Die Route wird gerechnet (v279).** Bis v278 stand hier je Bahn eine
 *  `belegung` - die Kantenfolge, von Hand hingeschrieben. Das war der Weg
 *  weiterhin gesetzt, nur in anderer Schreibweise. Jetzt sagt das Netz, was
 *  moeglich ist, und `kuerzesteRoute` sagt, was ein Gegner davon nimmt; eine
 *  gesperrte Kante aendert die Antwort, ohne dass irgendwo eine Liste
 *  nachzuziehen waere.
 *
 *  **Es steht nur einmal da (Regel 15).** `netzAusBahnen` und
 *  `bahnenAusNetz` sind zueinander invers, und `npm run netz` faehrt beide
 *  Richtungen bei jedem Lauf gegen einen eingefrorenen Stand. Die Bahnen in
 *  `maps.ts` sind seit v278 ABGELEITET - es gibt keine zweite Punktliste
 *  mehr, die auseinanderlaufen koennte. */

/** Ein Knoten des Netzes: ein Punkt, an dem eine Route anfaengt, aufhoert
 *  oder sich entscheidet. */
export type WegKnoten = RouteKnoten;

/** Eine Kante: der Verlauf zwischen zwei Knoten.
 *
 *  `punkte` sind die ZWISCHENpunkte - die beiden Knoten stehen nicht darin.
 *  Sonst stuende jeder Knotenpunkt so oft da, wie Kanten an ihm haengen, und
 *  liefe beim ersten Verschieben auseinander. */
export type WegKante = RouteKante;

/** Eine Weiche: ein Schalter, der genau eine Kante zumacht.
 *
 *  **Warum eine Kante und nicht ein Knoten.** Der Beschluss lautet "an
 *  mehreren Knoten sitzen Weichen"; gebaut ist es als Sperre auf einer KANTE,
 *  und das ist dasselbe mit einer Stelle weniger zum Irren. Ein Knoten mit
 *  drei Ausgaengen braeuchte sonst eine zweite Angabe, WELCHEN er zumacht -
 *  und die stuende dann neben der Kante, die sie meint (Regel 15).
 *
 *  **Zu heisst laenger, nie kuerzer.** Offen nimmt die Rechnung die kuerzeste
 *  Route; eine Weiche kann sie also nur verlaengern. Das ist die Entscheidung
 *  aus dem Vorbild (Defense Grid mauert, der Gegner rechnet neu) - und der
 *  Grund, warum `map.lanes` im Grundzustand unveraendert bleibt: dort ist
 *  keine Weiche gestellt. */
export interface Weiche {
  id: string;
  /** Die Kante, die diese Weiche zumacht. */
  kante: string;
  /** Was der Spieler davon sieht (S-N2-05). */
  name: string;
}

export interface Wegnetz extends RoutenNetz {
  knoten: WegKnoten[];
  kanten: WegKante[];
  weichen?: Weiche[];
}

/** Welche Kanten bei dieser Weichenstellung zu sind.
 *
 *  `gestellt` nennt die Weichen, die der Spieler umgelegt hat. Eine Weiche,
 *  die es im Netz nicht gibt, wird uebergangen statt zu werfen - ein alter
 *  Spielstand darf eine Karte nicht unspielbar machen. */
export function gesperrteKanten(netz: Wegnetz, gestellt?: ReadonlySet<string>): Set<string> {
  const zu = new Set<string>();
  if (!gestellt?.size) return zu;
  for (const w of netz.weichen ?? []) if (gestellt.has(w.id)) zu.add(w.kante);
  return zu;
}

const schluessel = (p: PathPoint | WegKnoten): string => `${p.x}:${p.y}:${p.w ?? ''}`;

/** Der Zielknoten eines Netzes. */
export function zielKnoten(netz: Wegnetz): WegKnoten {
  return zielKnotenVon(netz);
}

/** Die Tore in der Reihenfolge, in der sie im Netz stehen.
 *
 *  Diese Reihenfolge ist die Bahnnummer - daran haengen die Wellenplaene.
 *  Sie kommt aus der Datei, nicht aus einer Suche: eine Nummer, die von der
 *  Suchreihenfolge abhaengt, verschiebt sich beim naechsten Umbau lautlos. */
export function tore(netz: Wegnetz): WegKnoten[] {
  return netz.knoten.filter((k) => k.art === 'tor');
}

/** Die Bahnen, die aus dem Netz folgen.
 *
 *  Je Tor die kuerzeste OFFENE Route. Gibt es von einem Tor aus keine mehr,
 *  wirft es - eine Sperre, die eine Bahn ganz zumacht, ist ein Datenfehler
 *  und darf nicht als "dann eben eine Bahn weniger" durchgehen. */
export function bahnenAusNetz(netz: Wegnetz, gestellt?: ReadonlySet<string>): PathPoint[][] {
  const gesperrt = gesperrteKanten(netz, gestellt);
  const knoten = new Map(netz.knoten.map((k) => [k.id, k]));
  const bahnen: PathPoint[][] = [];
  for (const tor of tore(netz)) {
    const route = kuerzesteRoute(netz, tor.id, gesperrt);
    if (!route) throw new Error(`WEGNETZ: von "${tor.id}" fuehrt keine Route zum Ziel.`);
    const punkte: PathPoint[] = [{ x: tor.x, y: tor.y, w: tor.w }];
    for (const id of route) {
      const kante = netz.kanten.find((k) => k.id === id)!;
      for (const p of kante.punkte) punkte.push({ ...p });
      const ende = knoten.get(kante.nach);
      if (!ende) throw new Error(`WEGNETZ: die Kante "${id}" zeigt auf den unbekannten Knoten "${kante.nach}".`);
      punkte.push({ x: ende.x, y: ende.y, w: ende.w });
    }
    bahnen.push(punkte);
  }
  return bahnen;
}

/** Der Rueckweg: aus einer Bahnliste ein Netz.
 *
 *  **Ein Knoten ist eine Verzweigung oder eine Vereinigung - eine KREUZUNG
 *  ist keins.** Das ist die Verfeinerung, die v279 gebraucht hat, und sie
 *  kam aus einer Messung: auf der Ascheschlucht laufen beide Bahnen durch
 *  den Punkt 1330:980, aber die eine kommt von rechts und geht nach
 *  links-oben, die andere kommt von links und geht nach oben. Sie kreuzen
 *  sich dort, sie treffen sich nicht. Wer daraus einen Knoten macht, gibt
 *  dem Netz eine Wahl, die es im Bild nicht gibt - und die gerechnete Route
 *  nimmt fuer BEIDE Tore die kuerzere Fortsetzung (2504,8 statt 2814,3), also
 *  eine Bahn, die es nie gab.
 *
 *  Gezaehlt wird deshalb nicht, wieviele Bahnen den Punkt beruehren, sondern
 *  ob dort wirklich etwas zusammenlaeuft: hat ein Vorgaenger mehr als einen
 *  Nachfolger (Verzweigung) oder ein Nachfolger mehr als einen Vorgaenger
 *  (Vereinigung)? Bei einer Kreuzung ist beides eins zu eins.
 *
 *  Zwei Kanten mit denselben Enden UND denselben Zwischenpunkten sind
 *  dieselbe Kante; zwei mit gleichen Enden und verschiedenem Verlauf sind
 *  zwei. */
export function netzAusBahnen(bahnen: PathPoint[][]): Wegnetz {
  const paare = new Map<string, { vor: Map<string, Set<string>>; nach: Map<string, Set<string>> }>();
  const eintrag = (s: string) => {
    let e = paare.get(s);
    if (!e) { e = { vor: new Map(), nach: new Map() }; paare.set(s, e); }
    return e;
  };
  const dazu = (karte: Map<string, Set<string>>, a: string, b: string) => {
    let s = karte.get(a); if (!s) { s = new Set(); karte.set(a, s); }
    s.add(b);
  };
  for (const bahn of bahnen) {
    for (let i = 1; i < bahn.length - 1; i++) {
      const hier = eintrag(schluessel(bahn[i]));
      dazu(hier.nach, schluessel(bahn[i - 1]), schluessel(bahn[i + 1]));
      dazu(hier.vor, schluessel(bahn[i + 1]), schluessel(bahn[i - 1]));
    }
  }
  const zielS = schluessel(bahnen[0][bahnen[0].length - 1]);
  const istKnoten = (p: PathPoint, i: number, bahn: PathPoint[]): boolean => {
    if (i === 0 || i === bahn.length - 1) return true;
    const e = paare.get(schluessel(p));
    if (!e) return false;
    for (const s of e.nach.values()) if (s.size > 1) return true;   // Verzweigung
    for (const s of e.vor.values()) if (s.size > 1) return true;    // Vereinigung
    return false;
  };

  const knoten: WegKnoten[] = [];
  const nachId = new Map<string, string>();
  let tor = 0; let kreuz = 0;
  const knotenFuer = (p: PathPoint, art: WegKnoten['art']): string => {
    const s = schluessel(p);
    const da = nachId.get(s);
    if (da) return da;
    const id = art === 'ziel' ? 'ziel' : art === 'tor' ? `tor${++tor}` : `kreuz${++kreuz}`;
    nachId.set(s, id);
    knoten.push({ id, x: p.x, y: p.y, w: p.w, art });
    return id;
  };

  // Ziel und Tore zuerst, damit die Tornummern der Reihenfolge der Bahnen
  // folgen und nicht der Suchreihenfolge.
  knotenFuer(bahnen[0][bahnen[0].length - 1], 'ziel');
  for (const bahn of bahnen) knotenFuer(bahn[0], 'tor');

  const kanten: WegKante[] = [];
  for (const bahn of bahnen) {
    let vonIdx = 0;
    for (let i = 1; i < bahn.length; i++) {
      if (!istKnoten(bahn[i], i, bahn)) continue;
      const von = knotenFuer(bahn[vonIdx], schluessel(bahn[vonIdx]) === zielS ? 'ziel'
        : vonIdx === 0 ? 'tor' : 'kreuz');
      const nach = knotenFuer(bahn[i], schluessel(bahn[i]) === zielS ? 'ziel'
        : i === bahn.length - 1 ? 'ziel' : 'kreuz');
      const punkte = bahn.slice(vonIdx + 1, i).map((p) => ({ ...p }));
      const abdruck = `${von}|${nach}|${punkte.map(schluessel).join(',')}`;
      let treffer = kanten.find((k) => `${k.von}|${k.nach}|${k.punkte.map(schluessel).join(',')}` === abdruck);
      if (!treffer) {
        const gleiche = kanten.filter((k) => k.von === von && k.nach === nach).length;
        treffer = { id: gleiche ? `${von}-${nach}-${gleiche + 1}` : `${von}-${nach}`, von, nach, punkte };
        kanten.push(treffer);
      }
      vonIdx = i;
    }
  }
  return { knoten, kanten };
}

/** Die Netze der vier heutigen Karten.
 *
 *  **Erzeugt, nicht abgeschrieben.** Die Punktlisten stammen aus den Bahnen,
 *  die bis v277 in `maps.ts` standen, durch `netzAusBahnen` - deshalb sind sie
 *  deckungsgleich und nicht ungefaehr gleich. `npm run netz` misst die
 *  Abweichung bei jedem Lauf gegen `tools/wegnetz-stand.txt` und laesst sie
 *  nicht wachsen.
 *
 *  Was hier heute steht, ist noch keine Entscheidung: von jedem Tor fuehrt
 *  genau eine Route zum Ziel, die gerechnete ist also zwangslaeufig die
 *  heutige. Das ist der Zustand, den S-N2-03 aufbricht - die Weichen legen
 *  Kanten dazu, und erst dann hat `kuerzesteRoute` etwas zu waehlen. */
export const WEGNETZ: Record<string, Wegnetz> = {
  spiralhain: {
    knoten: [
      { id: 'ziel', x: 1730, y: 514, w: 68, art: 'ziel' },
      { id: 'tor1', x: -60, y: 1035, w: 38, art: 'tor' },
      { id: 'kreuz1', x: 528, y: 700, w: 50, art: 'kreuz' },
      { id: 'kreuz2', x: 690, y: 500, w: 44, art: 'kreuz' },
    ],
    kanten: [
      {
        id: 'tor1-kreuz1', von: 'tor1', nach: 'kreuz1',
        punkte: [
          { x: 160, y: 1050, w: 44 }, { x: 380, y: 1042, w: 46 }, { x: 520, y: 1000, w: 48 },
          { x: 524, y: 860, w: 50 },
        ],
      },
      {
        id: 'kreuz1-kreuz2', von: 'kreuz1', nach: 'kreuz2',
        punkte: [
          { x: 540, y: 580, w: 48 }, { x: 590, y: 516, w: 44 },
        ],
      },
      {
        id: 'kreuz1-kreuz2-2', von: 'kreuz1', nach: 'kreuz2',
        punkte: [
          { x: 430, y: 630, w: 48 }, { x: 300, y: 580, w: 46 }, { x: 210, y: 460, w: 44 },
          { x: 185, y: 330, w: 44 }, { x: 245, y: 215, w: 44 }, { x: 370, y: 155, w: 44 },
          { x: 490, y: 190, w: 44 }, { x: 520, y: 290, w: 44 }, { x: 560, y: 400, w: 44 },
          { x: 620, y: 460, w: 44 },
        ],
      },
      {
        id: 'kreuz2-ziel', von: 'kreuz2', nach: 'ziel',
        punkte: [
          { x: 790, y: 548, w: 46 }, { x: 816, y: 680, w: 50 }, { x: 820, y: 820, w: 50 },
          { x: 826, y: 950, w: 48 }, { x: 886, y: 1016, w: 44 }, { x: 996, y: 1030, w: 44 },
          { x: 1096, y: 980, w: 46 }, { x: 1116, y: 850, w: 50 }, { x: 1120, y: 700, w: 50 },
          { x: 1128, y: 570, w: 48 }, { x: 1182, y: 502, w: 44 }, { x: 1288, y: 490, w: 44 },
          { x: 1390, y: 542, w: 46 }, { x: 1408, y: 680, w: 50 }, { x: 1414, y: 820, w: 52 },
          { x: 1444, y: 940, w: 52 }, { x: 1540, y: 1004, w: 52 }, { x: 1646, y: 978, w: 54 },
          { x: 1700, y: 850, w: 56 }, { x: 1716, y: 700, w: 58 }, { x: 1726, y: 570, w: 62 },
        ],
      },
    ],
    weichen: [
      // **Die Nordschleife** schickt die Gegner durch die obere linke
      // Kartenhaelfte, die seit v219 gemessen nie betreten wird. Zu heisst
      // laenger: die Bahn waechst von 3882 auf 4914 Weltpunkte (+25 %), der
      // Umwegfaktor von 2,08 auf 2,64. Gemessen mit `tools/bahnmass.ts`,
      // also derselben Rechnung wie der Waechter: Knick 6,3 Grad wie heute,
      // engster Fleckabstand unveraendert, und KEIN Punkt laeuft mehr aus
      // dem Feld (heute neun).
      { id: 'saeule1', kante: 'kreuz1-kreuz2', name: 'Nordschleife' },
    ],
  },
  ascheschlucht: {
    knoten: [
      { id: 'ziel', x: 1690, y: 480, w: 40, art: 'ziel' },
      { id: 'tor1', x: 1250, y: 1180, w: 40, art: 'tor' },
      { id: 'tor2', x: 1550, y: 1180, w: 40, art: 'tor' },
    ],
    kanten: [
      {
        id: 'tor1-ziel', von: 'tor1', nach: 'ziel',
        punkte: [
          { x: 1280, y: 1090, w: 44 }, { x: 1300, y: 1020, w: 48 }, { x: 1330, y: 980, w: 40 },
          { x: 1264, y: 905, w: 44 }, { x: 1094, y: 605, w: 48 }, { x: 959, y: 691, w: 52 },
          { x: 859, y: 599, w: 56 }, { x: 746, y: 515, w: 52 }, { x: 668, y: 470, w: 44 },
          { x: 714, y: 424, w: 40 }, { x: 885, y: 323, w: 44 }, { x: 1080, y: 354, w: 48 },
          { x: 1198, y: 502, w: 52 }, { x: 1308, y: 595, w: 56 }, { x: 1459, y: 576, w: 44 },
          { x: 1591, y: 515, w: 40 },
        ],
      },
      {
        id: 'tor2-ziel', von: 'tor2', nach: 'ziel',
        punkte: [
          { x: 1470, y: 1075, w: 44 }, { x: 1370, y: 1000, w: 48 }, { x: 1330, y: 980, w: 40 },
          { x: 1291, y: 828, w: 44 }, { x: 1221, y: 645, w: 48 }, { x: 1021, y: 608, w: 52 },
          { x: 839, y: 687, w: 56 }, { x: 651, y: 660, w: 52 }, { x: 512, y: 470, w: 44 },
          { x: 808, y: 435, w: 40 }, { x: 872, y: 431, w: 44 }, { x: 990, y: 496, w: 48 },
          { x: 1136, y: 583, w: 52 }, { x: 1292, y: 665, w: 56 }, { x: 1481, y: 644, w: 44 },
          { x: 1609, y: 545, w: 40 },
        ],
      },
    ],
  },
  frostspalte: {
    knoten: [
      { id: 'ziel', x: 1669, y: 525, w: 40, art: 'ziel' },
      { id: 'tor1', x: 400, y: 1180, w: 40, art: 'tor' },
      { id: 'tor2', x: 1100, y: 1180, w: 40, art: 'tor' },
      { id: 'kreuz1', x: 1570, y: 730, w: 56, art: 'kreuz' },
    ],
    kanten: [
      {
        id: 'tor1-kreuz1', von: 'tor1', nach: 'kreuz1',
        punkte: [
          { x: 392, y: 1030, w: 44 }, { x: 352, y: 900, w: 48 }, { x: 300, y: 770, w: 52 },
          { x: 286, y: 620, w: 56 }, { x: 340, y: 490, w: 52 }, { x: 452, y: 400, w: 44 },
          { x: 592, y: 356, w: 40 }, { x: 730, y: 352, w: 40 }, { x: 862, y: 396, w: 44 },
          { x: 972, y: 470, w: 48 }, { x: 1052, y: 574, w: 52 }, { x: 1080, y: 704, w: 56 },
          { x: 1008, y: 806, w: 48 }, { x: 1092, y: 884, w: 40 }, { x: 1232, y: 922, w: 44 },
          { x: 1372, y: 900, w: 48 }, { x: 1482, y: 832, w: 52 },
        ],
      },
      {
        id: 'kreuz1-ziel', von: 'kreuz1', nach: 'ziel',
        punkte: [
          { x: 1626, y: 636, w: 48 }, { x: 1664, y: 546, w: 40 },
        ],
      },
      {
        id: 'tor2-kreuz1', von: 'tor2', nach: 'kreuz1',
        punkte: [
          { x: 1128, y: 1020, w: 44 }, { x: 1234, y: 908, w: 48 }, { x: 1348, y: 826, w: 52 },
          { x: 1408, y: 698, w: 56 }, { x: 1364, y: 574, w: 52 }, { x: 1238, y: 512, w: 44 },
          { x: 1102, y: 528, w: 40 }, { x: 1008, y: 620, w: 44 }, { x: 984, y: 736, w: 48 },
          { x: 1044, y: 830, w: 52 }, { x: 1170, y: 858, w: 56 }, { x: 1310, y: 862, w: 48 },
          { x: 1444, y: 824, w: 44 }, { x: 1540, y: 764, w: 48 },
        ],
      },
    ],
  },
  farnkessel: {
    knoten: [
      { id: 'ziel', x: 241, y: 479, w: 60, art: 'ziel' },
      { id: 'tor1', x: 1500, y: 1160, w: 44, art: 'tor' },
      { id: 'tor2', x: 700, y: 1160, w: 44, art: 'tor' },
      { id: 'kreuz1', x: 780, y: 590, w: 48, art: 'kreuz' },
    ],
    kanten: [
      {
        id: 'tor1-kreuz1', von: 'tor1', nach: 'kreuz1',
        punkte: [
          { x: 1440, y: 1020, w: 48 }, { x: 1420, y: 870, w: 50 }, { x: 1416, y: 720, w: 50 },
          { x: 1430, y: 600, w: 48 }, { x: 1370, y: 530, w: 44 }, { x: 1260, y: 520, w: 44 },
          { x: 1150, y: 575, w: 46 }, { x: 1090, y: 700, w: 50 }, { x: 1086, y: 860, w: 50 },
          { x: 1090, y: 1000, w: 48 }, { x: 1020, y: 1062, w: 44 }, { x: 910, y: 1062, w: 44 },
          { x: 820, y: 990, w: 46 }, { x: 770, y: 860, w: 50 }, { x: 766, y: 710, w: 50 },
        ],
      },
      {
        id: 'kreuz1-ziel', von: 'kreuz1', nach: 'ziel',
        punkte: [
          { x: 700, y: 520, w: 44 }, { x: 570, y: 520, w: 46 }, { x: 440, y: 540, w: 48 },
          { x: 310, y: 510, w: 52 },
        ],
      },
      {
        id: 'tor2-kreuz1', von: 'tor2', nach: 'kreuz1',
        punkte: [
          { x: 720, y: 1020, w: 46 }, { x: 640, y: 910, w: 48 }, { x: 500, y: 880, w: 48 },
          { x: 380, y: 935, w: 48 }, { x: 285, y: 845, w: 48 }, { x: 290, y: 705, w: 50 },
          { x: 340, y: 585, w: 48 }, { x: 460, y: 530, w: 46 }, { x: 590, y: 570, w: 46 },
          { x: 660, y: 690, w: 48 }, { x: 780, y: 730, w: 48 }, { x: 880, y: 660, w: 46 },
          { x: 850, y: 560, w: 44 },
        ],
      },
    ],
  },
};
