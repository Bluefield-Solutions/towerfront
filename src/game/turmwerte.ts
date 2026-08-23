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
  nextFor, statsFor,
  type BranchIndex, type TowerDef, type TowerStats,
} from '../data/towers';

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

/** Was am gebauten Turm zu sehen ist, mit der naechsten Stufe daneben. */
export function werteAmTurm(
  def: TowerDef, branch: BranchIndex, level: number, kills: number,
): Wertzeile[] {
  const st = statsFor(def, branch, level);
  const nx = nextFor(def, branch, level);
  const z: Wertzeile[] = [
    {
      feld: 'damage', name: 'Schaden', wert: String(st.damage),
      danach: nx ? String(nx.damage) : undefined,
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
