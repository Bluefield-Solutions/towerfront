import type { PathPoint } from '../core/path';

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
 *  **Die Belegung ist die Entscheidung.** Das Netz spannt den Raum auf, die
 *  Belegung waehlt daraus je Bahn eine Kantenfolge. Die heutigen vier Karten
 *  sind eine solche Belegung und nichts weiter; eine Weiche verschiebt sie,
 *  ohne am Netz etwas zu aendern.
 *
 *  **Es steht nur einmal da (Regel 15).** `netzAusBahnen` und
 *  `bahnenAusNetz` sind zueinander invers, und `npm run netz` faehrt beide
 *  Richtungen bei jedem Lauf gegen einen eingefrorenen Stand. Die Bahnen in
 *  `maps.ts` sind seit v278 ABGELEITET - es gibt keine zweite Punktliste
 *  mehr, die auseinanderlaufen koennte. */

/** Ein Knoten des Netzes: ein Punkt, an dem eine Route anfaengt, aufhoert
 *  oder sich entscheidet. */
export interface WegKnoten {
  id: string;
  x: number; y: number; w?: number;
  /** `tor` beginnt eine Route (der Punkt darf ausserhalb des Feldes liegen),
   *  `ziel` beendet sie, `kreuz` ist alles dazwischen. */
  art: 'tor' | 'kreuz' | 'ziel';
}

/** Eine Kante: der Verlauf zwischen zwei Knoten.
 *
 *  `punkte` sind die ZWISCHENpunkte - die beiden Knoten stehen nicht darin.
 *  Sonst stuende jeder Knotenpunkt so oft da, wie Kanten an ihm haengen, und
 *  liefe beim ersten Verschieben auseinander. */
export interface WegKante {
  id: string;
  von: string; nach: string;
  punkte: PathPoint[];
}

/** Welche Kantenfolge eine Bahn heute benutzt. */
export interface Bahnbelegung {
  /** Der Torknoten, an dem diese Bahn beginnt. */
  tor: string;
  /** Die Kanten in Laufrichtung. */
  kanten: string[];
}

export interface Wegnetz {
  knoten: WegKnoten[];
  kanten: WegKante[];
  belegung: Bahnbelegung[];
}

const schluessel = (p: PathPoint | WegKnoten): string => `${p.x}:${p.y}:${p.w ?? ''}`;

/** Der Zielknoten eines Netzes. Es gibt genau einen - alle Bahnen enden am
 *  selben Kristall. */
export function zielKnoten(netz: Wegnetz): WegKnoten {
  const z = netz.knoten.find((k) => k.art === 'ziel');
  if (!z) throw new Error('WEGNETZ: das Netz hat keinen Zielknoten.');
  return z;
}

/** Die kuerzeste noch vorhandene Route von einem Tor zum Ziel.
 *
 *  Breitensuche ueber die Kanten, gewichtet nach der Zahl der Kontrollpunkte -
 *  eine Kantenzahl allein wuerde einen langen Umweg mit einer kurzen
 *  Abkuerzung verwechseln. Gibt `null` zurueck, wenn es keine mehr gibt; das
 *  ist eine Meldung, kein Ausweichen. */
export function routeSuchen(netz: Wegnetz, torId: string): string[] | null {
  const ziel = zielKnoten(netz).id;
  const beste = new Map<string, { kosten: number; weg: string[] }>();
  beste.set(torId, { kosten: 0, weg: [] });
  const rand = [torId];
  while (rand.length) {
    // Immer den billigsten offenen Knoten zuerst - sonst findet die Suche
    // irgendeine Route und nennt sie die kuerzeste.
    rand.sort((a, b) => beste.get(a)!.kosten - beste.get(b)!.kosten);
    const hier = rand.shift()!;
    const stand = beste.get(hier)!;
    for (const k of netz.kanten) {
      if (k.von !== hier) continue;
      const kosten = stand.kosten + k.punkte.length + 1;
      const alt = beste.get(k.nach);
      if (alt && alt.kosten <= kosten) continue;
      beste.set(k.nach, { kosten, weg: [...stand.weg, k.id] });
      if (!rand.includes(k.nach)) rand.push(k.nach);
    }
  }
  const treffer = beste.get(ziel);
  return treffer && treffer.weg.length ? treffer.weg : null;
}

/** Haelt die eingetragene Belegung gegen das Netz.
 *
 *  Gibt die Kantenfolge zurueck, wenn sie durchgehend ist - sonst `null`.
 *  Geprueft wird alles drei: dass es jede Kante gibt, dass sie aneinander
 *  anschliessen, und dass die Folge wirklich vom Tor zum Ziel fuehrt. Eine
 *  Folge, die irgendwo im Feld endet, ist keine Bahn. */
function belegungPruefen(netz: Wegnetz, b: Bahnbelegung): WegKante[] | null {
  const kette: WegKante[] = [];
  let hier = b.tor;
  for (const id of b.kanten) {
    const k = netz.kanten.find((e) => e.id === id);
    if (!k || k.von !== hier) return null;
    kette.push(k); hier = k.nach;
  }
  if (!kette.length || hier !== zielKnoten(netz).id) return null;
  return kette;
}

/** Die Bahnen, die aus dem Netz folgen.
 *
 *  **Die Ableitung behaelt die alte Route nicht stillschweigend.** Faellt eine
 *  Kante weg, wird die Belegung ungueltig - dann sucht sie eine ANDERE Route
 *  und sagt es, oder sie meldet, dass es keine mehr gibt. Das ist der Punkt
 *  des ganzen Umbaus: ein Netz, das den Wegfall einer Kante verschweigt, ist
 *  wieder eine feste Bahnliste. */
export function bahnenAusNetz(netz: Wegnetz, meldungen?: string[]): PathPoint[][] {
  const knoten = new Map(netz.knoten.map((k) => [k.id, k]));
  const bahnen: PathPoint[][] = [];
  for (let i = 0; i < netz.belegung.length; i++) {
    const b = netz.belegung[i];
    let kette = belegungPruefen(netz, b);
    if (!kette) {
      const ersatz = routeSuchen(netz, b.tor);
      if (!ersatz) {
        throw new Error(`WEGNETZ: von "${b.tor}" fuehrt keine Route mehr zum Ziel.`);
      }
      kette = belegungPruefen(netz, { tor: b.tor, kanten: ersatz });
      if (!kette) throw new Error(`WEGNETZ: die Ersatzroute ab "${b.tor}" schliesst nicht an.`);
      meldungen?.push(
        `Bahn ${i}: die eingetragene Belegung (${b.kanten.join(' > ') || 'leer'}) `
        + `traegt nicht mehr - ausgewichen auf ${ersatz.join(' > ')}.`,
      );
    }
    const anfang = knoten.get(b.tor);
    if (!anfang) throw new Error(`WEGNETZ: den Torknoten "${b.tor}" gibt es nicht.`);
    const punkte: PathPoint[] = [{ x: anfang.x, y: anfang.y, w: anfang.w }];
    for (const k of kette) {
      for (const p of k.punkte) punkte.push({ ...p });
      const ende = knoten.get(k.nach);
      if (!ende) throw new Error(`WEGNETZ: die Kante "${k.id}" zeigt auf den unbekannten Knoten "${k.nach}".`);
      punkte.push({ x: ende.x, y: ende.y, w: ende.w });
    }
    bahnen.push(punkte);
  }
  return bahnen;
}

/** Der Rueckweg: aus einer Bahnliste ein Netz.
 *
 *  Knoten wird ein Punkt, der eine Bahn beginnt, eine Bahn beendet oder in
 *  mehr als einer Bahn vorkommt - genau dort steht eine Entscheidung. Zwei
 *  Kanten mit denselben Enden UND denselben Zwischenpunkten sind dieselbe
 *  Kante; zwei mit gleichen Enden und verschiedenem Verlauf sind zwei.
 *
 *  Gebraucht wird das an zwei Stellen: `npm run netz` faehrt damit den
 *  Rundlauf (Netz aus Bahnen aus Netz muss dasselbe ergeben), und
 *  `npm run bahnbau` traegt seine erzeugten Bahnen darueber ein. */
export function netzAusBahnen(bahnen: PathPoint[][]): Wegnetz {
  // **Ein Knoten ist eine Entscheidung, kein gemeinsamer Punkt.** Der erste
  // Entwurf machte jeden Punkt zum Knoten, der in mehr als einer Bahn
  // vorkommt - und weil sich zwei Bahnen ihre letzten sechs Punkte teilen,
  // hatte der Farnkessel acht Knoten und sieben Kanten, davon vier ohne einen
  // einzigen Zwischenpunkt. Eine Kette von Knoten, an denen es nichts zu
  // waehlen gibt, ist ein Verlauf und gehoert in EINE Kante.
  //
  // Gezaehlt wird deshalb, was am Punkt zusammenlaeuft: mehr als ein
  // Vorgaenger oder mehr als ein Nachfolger.
  const vor = new Map<string, Set<string>>();
  const nach = new Map<string, Set<string>>();
  const merken = (karte: Map<string, Set<string>>, a: string, b: string): void => {
    let s = karte.get(a); if (!s) { s = new Set(); karte.set(a, s); }
    s.add(b);
  };
  for (const bahn of bahnen) {
    for (let i = 1; i < bahn.length; i++) {
      merken(vor, schluessel(bahn[i]), schluessel(bahn[i - 1]));
      merken(nach, schluessel(bahn[i - 1]), schluessel(bahn[i]));
    }
  }
  const zielS = schluessel(bahnen[0][bahnen[0].length - 1]);
  const istKnoten = (p: PathPoint, i: number, bahn: PathPoint[]): boolean => {
    if (i === 0 || i === bahn.length - 1) return true;
    const s = schluessel(p);
    return (vor.get(s)?.size ?? 0) > 1 || (nach.get(s)?.size ?? 0) > 1;
  };

  const knoten: WegKnoten[] = [];
  const nachId = new Map<string, string>();
  let tore = 0; let kreuze = 0;
  const knotenFuer = (p: PathPoint, art: WegKnoten['art']): string => {
    const s = schluessel(p);
    const da = nachId.get(s);
    if (da) return da;
    const id = art === 'ziel' ? 'ziel' : art === 'tor' ? `tor${++tore}` : `kreuz${++kreuze}`;
    nachId.set(s, id);
    knoten.push({ id, x: p.x, y: p.y, w: p.w, art });
    return id;
  };

  // Die Tore zuerst, damit sie in der Reihenfolge der Bahnen durchnummeriert
  // sind - eine Kennung, die von der Suchreihenfolge abhaengt, aendert sich
  // beim naechsten Umbau ohne Grund.
  knotenFuer(bahnen[0][bahnen[0].length - 1], 'ziel');
  for (const bahn of bahnen) knotenFuer(bahn[0], 'tor');

  const kanten: WegKante[] = [];
  const belegung: Bahnbelegung[] = [];
  for (const bahn of bahnen) {
    const tor = nachId.get(schluessel(bahn[0]))!;
    const folge: string[] = [];
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
      folge.push(treffer.id);
      vonIdx = i;
    }
    belegung.push({ tor, kanten: folge });
  }
  return { knoten, kanten, belegung };
}

/** Die Netze der vier heutigen Karten.
 *
 *  **Erzeugt, nicht abgeschrieben.** Die Punktlisten stammen aus den Bahnen,
 *  die bis v277 in `maps.ts` standen, durch `netzAusBahnen` - deshalb sind sie
 *  deckungsgleich und nicht ungefaehr gleich. `npm run netz` misst die
 *  Abweichung bei jedem Lauf gegen `tools/wegnetz-stand.txt` und laesst sie
 *  nicht wachsen.
 *
 *  Was hier heute steht, ist noch keine Entscheidung: jedes Netz hat genau so
 *  viele Routen, wie es Bahnen hat. Die Weichen kommen in S-N2-02 dazu - sie
 *  brauchen diese Form, nicht mehr. */
export const WEGNETZ: Record<string, Wegnetz> = {
  spiralhain: {
    knoten: [
      { id: 'ziel', x: 1730, y: 514, w: 68, art: 'ziel' },
      { id: 'tor1', x: -60, y: 1035, w: 38, art: 'tor' },
    ],
    kanten: [
      {
        id: 'tor1-ziel', von: 'tor1', nach: 'ziel',
        punkte: [
          { x: 160, y: 1050, w: 44 }, { x: 380, y: 1042, w: 46 }, { x: 520, y: 1000, w: 48 },
          { x: 524, y: 860, w: 50 }, { x: 528, y: 700, w: 50 }, { x: 540, y: 580, w: 48 },
          { x: 590, y: 516, w: 44 }, { x: 690, y: 500, w: 44 }, { x: 790, y: 548, w: 46 },
          { x: 816, y: 680, w: 50 }, { x: 820, y: 820, w: 50 }, { x: 826, y: 950, w: 48 },
          { x: 886, y: 1016, w: 44 }, { x: 996, y: 1030, w: 44 }, { x: 1096, y: 980, w: 46 },
          { x: 1116, y: 850, w: 50 }, { x: 1120, y: 700, w: 50 }, { x: 1128, y: 570, w: 48 },
          { x: 1182, y: 502, w: 44 }, { x: 1288, y: 490, w: 44 }, { x: 1390, y: 542, w: 46 },
          { x: 1408, y: 680, w: 50 }, { x: 1414, y: 820, w: 52 }, { x: 1444, y: 940, w: 52 },
          { x: 1540, y: 1004, w: 52 }, { x: 1646, y: 978, w: 54 }, { x: 1700, y: 850, w: 56 },
          { x: 1716, y: 700, w: 58 }, { x: 1726, y: 570, w: 62 },
        ],
      },
    ],
    belegung: [
      { tor: 'tor1', kanten: ['tor1-ziel'] },
    ],
  },
  ascheschlucht: {
    knoten: [
      { id: 'ziel', x: 1690, y: 480, w: 40, art: 'ziel' },
      { id: 'tor1', x: 1250, y: 1180, w: 40, art: 'tor' },
      { id: 'tor2', x: 1550, y: 1180, w: 40, art: 'tor' },
      { id: 'kreuz1', x: 1330, y: 980, w: 40, art: 'kreuz' },
    ],
    kanten: [
      {
        id: 'tor1-kreuz1', von: 'tor1', nach: 'kreuz1',
        punkte: [
          { x: 1280, y: 1090, w: 44 }, { x: 1300, y: 1020, w: 48 },
        ],
      },
      {
        id: 'kreuz1-ziel', von: 'kreuz1', nach: 'ziel',
        punkte: [
          { x: 1264, y: 905, w: 44 }, { x: 1094, y: 605, w: 48 }, { x: 959, y: 691, w: 52 },
          { x: 859, y: 599, w: 56 }, { x: 746, y: 515, w: 52 }, { x: 668, y: 470, w: 44 },
          { x: 714, y: 424, w: 40 }, { x: 885, y: 323, w: 44 }, { x: 1080, y: 354, w: 48 },
          { x: 1198, y: 502, w: 52 }, { x: 1308, y: 595, w: 56 }, { x: 1459, y: 576, w: 44 },
          { x: 1591, y: 515, w: 40 },
        ],
      },
      {
        id: 'tor2-kreuz1', von: 'tor2', nach: 'kreuz1',
        punkte: [
          { x: 1470, y: 1075, w: 44 }, { x: 1370, y: 1000, w: 48 },
        ],
      },
      {
        id: 'kreuz1-ziel-2', von: 'kreuz1', nach: 'ziel',
        punkte: [
          { x: 1291, y: 828, w: 44 }, { x: 1221, y: 645, w: 48 }, { x: 1021, y: 608, w: 52 },
          { x: 839, y: 687, w: 56 }, { x: 651, y: 660, w: 52 }, { x: 512, y: 470, w: 44 },
          { x: 808, y: 435, w: 40 }, { x: 872, y: 431, w: 44 }, { x: 990, y: 496, w: 48 },
          { x: 1136, y: 583, w: 52 }, { x: 1292, y: 665, w: 56 }, { x: 1481, y: 644, w: 44 },
          { x: 1609, y: 545, w: 40 },
        ],
      },
    ],
    belegung: [
      { tor: 'tor1', kanten: ['tor1-kreuz1', 'kreuz1-ziel'] },
      { tor: 'tor2', kanten: ['tor2-kreuz1', 'kreuz1-ziel-2'] },
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
    belegung: [
      { tor: 'tor1', kanten: ['tor1-kreuz1', 'kreuz1-ziel'] },
      { tor: 'tor2', kanten: ['tor2-kreuz1', 'kreuz1-ziel'] },
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
    belegung: [
      { tor: 'tor1', kanten: ['tor1-kreuz1', 'kreuz1-ziel'] },
      { tor: 'tor2', kanten: ['tor2-kreuz1', 'kreuz1-ziel'] },
    ],
  },
};
