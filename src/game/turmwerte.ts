/** Die Werte eines Turms, als Zeilen - und zwar an EINER Stelle.
 *
 *  Bis v134 baute die Bedienung zwei Listen aus zwei Handvoll Zeilen: eine
 *  vor dem Kauf, eine am gebauten Turm. Beide standen mitten in `ui.sync()`,
 *  beide als HTML-Fetzen. Das hatte zwei Folgen, und beide waren zu sehen:
 *
 *  1. **Werte fehlten.** `slowTime` (wie lange die Bremse haelt) und
 *     `falloff` (wieviel ein Kettensprung noch traegt) stehen seit jeher in
 *     den Turmdaten und kamen in KEINER der beiden Listen vor. Der Frostturm
 *     zeigte "Bremse 30 %" und verschwieg, ob das eine halbe Sekunde oder
 *     fuenf sind - der Unterschied zwischen einem guten und einem nutzlosen
 *     Turm.
 *  2. **Niemand konnte es merken.** Kriterium F4 des Genre-Abgleichs ("alle
 *     Werte eines Turms sind sichtbar, bevor man ihn kauft") war von Hand
 *     beurteilt, mit dem Vermerk "seit v11 erfuellt". Es war nie erfuellt.
 *
 *  Deshalb liefern diese beiden Funktionen jetzt DATEN statt HTML. Die
 *  Bedienung macht Zeilen daraus, der Genre-Abgleich zaehlt sie ab: jedes
 *  Feld, das `statsFor` auf Stufe 1 liefert, muss vor dem Kauf vorkommen.
 *
 *  **Die Liste ist von Hand geschrieben, nicht aus den Feldern erzeugt.**
 *  Das ist Absicht. Eine Liste, die sich selbst aus den Feldern baut, koennte
 *  gar nichts vergessen - und damit wuerde die Pruefung nichts mehr pruefen
 *  (Regel 13). So faellt sie aus, sobald ein neuer Wert in die Turmdaten
 *  kommt und hier niemand eine Zeile nachtraegt. Genau das ist dreimal
 *  passiert. */
import {
  MAX_LEVEL, nextFor, statsFor,
  type BranchIndex, type TowerDef, type TowerStats,
} from '../data/towers';
import { VERBUND_STUFE } from './verbund';

/** Welchen Wert eine Zeile zeigt. `null` heisst abgeleitet - Schaden je
 *  Sekunde steht in keinem Feld, sondern folgt aus zweien. */
export type Wertfeld = keyof TowerStats | 'hitsAir' | null;

export interface Wertzeile {
  feld: Wertfeld;
  name: string;
  wert: string;
  /** Was auf der naechsten Stufe daraus wird - nur am gebauten Turm. */
  danach?: string;
}

const prozent = (v: number): string => `${Math.round(v * 100)} %`;
const sekunden = (v: number): string => `${v.toFixed(2)} s`;
const dauer = (v: number): string => `${v.toFixed(1)} s`;

/** Was vor dem Kauf zu sehen ist. Stufe 1, ohne Zweig. */
export function werteVorKauf(def: TowerDef): Wertzeile[] {
  const st = statsFor(def, null, 1);
  const z: Wertzeile[] = [
    { feld: 'cost', name: 'Kosten', wert: `${st.cost} Gold` },
    { feld: 'damage', name: 'Schaden', wert: String(st.damage) },
    { feld: 'range', name: 'Reichweite', wert: String(Math.round(st.range)) },
    { feld: 'cooldown', name: 'Takt', wert: sekunden(st.cooldown) },
    { feld: null, name: 'Schaden/s', wert: (st.damage / st.cooldown).toFixed(1) },
  ];
  if (st.splash) z.push({ feld: 'splash', name: 'Radius', wert: String(Math.round(st.splash)) });
  if (st.chains) z.push({ feld: 'chains', name: 'Sprünge', wert: String(st.chains) });
  if (st.falloff) {
    z.push({ feld: 'falloff', name: 'Je Sprung', wert: `${prozent(st.falloff)} Schaden` });
  }
  if (st.slow) z.push({ feld: 'slow', name: 'Bremse', wert: prozent(st.slow) });
  if (st.slowTime) z.push({ feld: 'slowTime', name: 'Bremsdauer', wert: dauer(st.slowTime) });
  if (st.pierce) z.push({ feld: 'pierce', name: 'Durchschlag', wert: String(st.pierce) });
  z.push({ feld: 'hitsAir', name: 'Luftziele', wert: def.hitsAir ? 'ja' : 'nein' });
  return z;
}

/** **Was ein Zweig WIRKLICH aendert - als Zahlen statt als Satz** (v248, H6).
 *
 *  Die Zweigwahl ist endgueltig, und bis v247 stand daneben ein Satz ("Halbe
 *  Wucht, doppelte Schlagzahl"). Auf dem ZIELGERAET stand er nicht: `.br-b`
 *  trug dort `display: none`, weil vier Zeilen Prosa je Zweig neunzig Punkte
 *  kosten, die dieser Bildschirm nicht hat. Wer auf dem Telefon spielt -
 *  und das ist das Zielgeraet - waehlte also zwischen zwei Namen.
 *
 *  Zahlen kosten eine Zeile statt vier und sagen mehr: sie stehen im
 *  Verhaeltnis zu dem, was der Turm HEUTE kann, und sie stimmen auch dann
 *  noch, wenn jemand einen Wert aendert. Ein Satz veraltet still - und
 *  dieses Verzeichnis hat davon genug.
 *
 *  Gezeigt werden zwei Zahlen. **Schaden je Sekunde** fasst beide Haelften
 *  des Ausbaus zusammen; Schaden allein waere irrefuehrend, weil ein Zweig
 *  regelmaessig Wucht gegen Takt tauscht. Dazu die groesste Aenderung unter
 *  den Eigenschaften, die den Zweigen ihren Charakter geben - und genau die
 *  ist die Entscheidung: Schaden je Sekunde bekommen beide, weiter oder
 *  haerter wird nur einer.
 *
 *  Der Satz bleibt daneben stehen, wo Platz ist. Er erklaert die ABSICHT,
 *  die Zahlen die Wirkung; das eine ersetzt das andere nicht. */
const MERKMALE: [string, keyof TowerStats][] = [
  ['Reichweite', 'range'], ['Radius', 'splash'], ['Bremse', 'slow'],
  ['Durchschlag', 'pierce'], ['Sprünge', 'chains'], ['Bremsdauer', 'slowTime'],
];

function delta(v: number): string {
  const p = Math.round(v * 100);
  return `${p >= 0 ? '+' : '−'}${Math.abs(p)} %`;
}

export function zweigWirkung(def: TowerDef, von: BranchIndex, level: number): [string, string] {
  if (level >= MAX_LEVEL || def.branches.length < 2) return ['', ''];
  const jetzt = statsFor(def, von, level);
  const dann: TowerStats[] = [statsFor(def, 0, level + 1), statsFor(def, 1, level + 1)];
  const dps = (st: TowerStats): number => st.damage / st.cooldown;

  // **Gesucht ist das Merkmal, in dem sich die ZWEIGE unterscheiden - nicht
  // das, in dem sich jeder am meisten von heute unterscheidet.**
  //
  // Die erste Fassung fragte das zweite, und gemessen sagte sie bei vier von
  // acht Zweigen "Durchschlag neu": ein Merkmal, das der Turm heute gar
  // nicht hat, schlaegt jede prozentuale Aenderung. Beide Karten trugen
  // dieselbe Zeile, und die Entscheidung stand wieder nirgends. Die Frage
  // heisst nicht "was aendert sich", sondern "was ist der Unterschied".
  let feld: keyof TowerStats | null = null;
  let beste = 0;
  for (const [, f] of MERKMALE) {
    const a = Number(dann[0][f] ?? 0);
    const b = Number(dann[1][f] ?? 0);
    const gross = Math.max(a, b);
    if (gross === 0) continue;
    const unterschied = Math.abs(a - b) / gross;
    if (unterschied > beste) { beste = unterschied; feld = f; }
  }
  const name = MERKMALE.find(([, f]) => f === feld)?.[0] ?? '';

  return [0, 1].map((i) => {
    const teile = [`Schaden/s ${delta((dps(dann[i]) - dps(jetzt)) / dps(jetzt))}`];
    // Unter fuenf Prozent Unterschied ist es keine Entscheidung, sondern
    // Rauschen - dann steht die zweite Zahl gar nicht da.
    if (feld && beste >= 0.05) {
      const a = Number(jetzt[feld] ?? 0);
      const b = Number(dann[i][feld] ?? 0);
      // Was der Turm heute noch gar nicht hat, steht als ZAHL da, nicht als
      // Prozentsatz: "Durchschlag +100 %" ist bei einem Ausgangswert von
      // null keine Auskunft, sondern eine Division, die nicht stattgefunden
      // hat. Und die Null selbst wird zum Strich - die Entscheidung ist
      // "der eine kann es, der andere nicht", und ein Strich sagt das
      // schneller als eine Ziffer.
      teile.push(a === 0
        ? `${name} ${b > 0 ? Math.round(b * 100) / 100 : '—'}`
        : `${name} ${delta((b - a) / a)}`);
    }
    return teile.join(' · ');
  }) as [string, string];
}

/** Was am gebauten Turm zu sehen ist, mit der naechsten Stufe daneben.
 *
 *  `verbund` ist die Zahl der ANDEREN Turmarten im Umkreis (v244, F4). Sie
 *  steht hier und nicht nur im Zustand, weil der Schaden sonst zweimal
 *  gerechnet wuerde: einmal fuer die Wirkung und einmal fuer die Anzeige -
 *  und die zweite Rechnung wandert bei der naechsten Aenderung weg von der
 *  ersten (Regel 15). Der Pruefsteg zeigt, was der Turm WIRKLICH macht. */
export function werteAmTurm(
  def: TowerDef, branch: BranchIndex, level: number, kills: number, verbund = 0,
): Wertzeile[] {
  const st = statsFor(def, branch, level);
  const nx = nextFor(def, branch, level);
  const mal = 1 + VERBUND_STUFE * verbund;
  const schaden = (v: number): string => String(Math.round(v * mal * 10) / 10);
  const z: Wertzeile[] = [
    {
      feld: 'damage', name: 'Schaden', wert: schaden(st.damage),
      danach: nx ? schaden(nx.damage) : undefined,
    },
    {
      feld: 'range', name: 'Reichweite', wert: String(Math.round(st.range)),
      danach: nx ? String(Math.round(nx.range)) : undefined,
    },
    {
      feld: 'cooldown', name: 'Takt', wert: sekunden(st.cooldown),
      danach: nx ? sekunden(nx.cooldown) : undefined,
    },
  ];
  if (st.splash) {
    z.push({
      feld: 'splash', name: 'Radius', wert: String(Math.round(st.splash)),
      danach: nx?.splash ? String(Math.round(nx.splash)) : undefined,
    });
  }
  if (st.chains) {
    z.push({
      feld: 'chains', name: 'Sprünge', wert: String(st.chains),
      danach: nx?.chains ? String(nx.chains) : undefined,
    });
  }
  if (st.falloff) {
    z.push({
      feld: 'falloff', name: 'Je Sprung', wert: `${prozent(st.falloff)} Schaden`,
      danach: nx?.falloff ? `${prozent(nx.falloff)} Schaden` : undefined,
    });
  }
  if (st.slow) {
    z.push({
      feld: 'slow', name: 'Bremse', wert: prozent(st.slow),
      danach: nx?.slow ? prozent(nx.slow) : undefined,
    });
  }
  if (st.slowTime) {
    z.push({
      feld: 'slowTime', name: 'Bremsdauer', wert: dauer(st.slowTime),
      danach: nx?.slowTime ? dauer(nx.slowTime) : undefined,
    });
  }
  if (st.pierce) {
    z.push({
      feld: 'pierce', name: 'Durchschlag', wert: String(st.pierce),
      danach: nx?.pierce ? String(nx.pierce) : undefined,
    });
  }
  // Luftziele stehen am gebauten Turm nur, wenn er KEINE trifft: eine
  // Einschraenkung ist eine Nachricht, eine Selbstverstaendlichkeit nicht.
  if (!def.hitsAir) z.push({ feld: 'hitsAir', name: 'Luftziele', wert: 'nein' });
  // **Der Verbund steht auch dann da, wenn es keinen gibt.**
  //
  // Eine Zeile, die nur bei Erfolg erscheint, erzaehlt nur die halbe Sache:
  // wer allein baut, sieht nie, dass ihm etwas entgeht. Genau die Frage soll
  // sie stellen.
  z.push({
    feld: null, name: 'Verbund',
    wert: verbund > 0
      ? `+${Math.round(VERBUND_STUFE * verbund * 100)} % · ${verbund} Art${verbund > 1 ? 'en' : ''}`
      : 'allein',
  });
  z.push({ feld: null, name: 'Erledigt', wert: String(kills) });
  return z;
}

/** Welche Werte der Stufe 1 vor dem Kauf NICHT zu sehen sind.
 *
 *  Gefragt wird an `statsFor`, nicht an der Liste oben - sonst pruefte sich
 *  die Liste an sich selbst. Ein neues Feld in den Turmdaten taucht hier
 *  sofort auf, solange niemand eine Zeile dafuer schreibt. */
export function fehltVorKauf(def: TowerDef): string[] {
  const st = statsFor(def, null, 1) as unknown as Record<string, unknown>;
  const gezeigt = new Set<string>();
  for (const z of werteVorKauf(def)) if (z.feld !== null) gezeigt.add(z.feld);
  const fehlt = Object.keys(st).filter(
    (k) => typeof st[k] === 'number' && !gezeigt.has(k),
  );
  if (!gezeigt.has('hitsAir')) fehlt.push('hitsAir');
  return fehlt;
}
