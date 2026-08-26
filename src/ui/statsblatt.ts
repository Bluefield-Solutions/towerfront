/** Das Bilanzblatt einer Partie - an EINER Stelle erzeugt.
 *
 *  Es steht an zwei Plaetzen: auf dem Ergebnisbildschirm nach der Partie und
 *  seit v171 in der Pausenkarte, also MITTEN im Lauf. Genau dort ist es
 *  nuetzlich - zwischen zwei Wellen will man wissen, welcher Turm traegt,
 *  bevor man das naechste Gold ausgibt, nicht erst wenn alles vorbei ist
 *  (D12).
 *
 *  Zwei Fassungen davon waeren eine zu viel (Regel 15): die zweite haette
 *  angefangen, andere Zahlen zu zeigen als die erste, und niemand haette
 *  gewusst, welche stimmt. Deshalb liefert diese Datei Markup, keine
 *  Anzeige - wo es hingehaengt wird, entscheidet der Aufrufer.
 *
 *  **Die Zielunit zaehlt mit.** Bis v170 lief die Balkenliste ueber
 *  `TOWER_ORDER`, und darin steht sie nicht. Ihr Schaden ging also in die
 *  Summe ein, fehlte aber in der Aufschluesselung - die Anteile summierten
 *  sich auf unter 100 %, und niemand sah es, weil der Rest gerundet wurde.
 *  Gemessen an einer durchgespielten Partie waren es 638 von 178 659
 *  Punkten. Klein - aber seit v165 laesst sie sich fuer bis zu 1950 Gold je
 *  Stufe ausbauen, und dann ist genau das die Zahl, die man sehen will. */
import { TOWERS, TOWER_ORDER } from '../data/towers';
import type { GameState } from '../game/state';

/** Alle Schadensquellen, die es geben kann - Tuerme, Zielunit, Meteor. */
function quellen(s: GameState): [string, string, number][] {
  const st = s.stats;
  const liste: [string, string, number][] = TOWER_ORDER.map(
    (id) => [TOWERS[id].name, TOWERS[id].accent, st.damageBy[id] ?? 0],
  );
  liste.push([TOWERS.core.name, TOWERS.core.accent, st.damageBy.core ?? 0]);
  if (st.damageBy.meteor) liste.push(['Meteor', '#F08A3C', st.damageBy.meteor]);
  liste.sort((a, b) => b[2] - a[2]);
  return liste;
}

/** Das Blatt als Markup. Leer, solange nichts passiert ist. */
export function bilanzblatt(s: GameState, kurz = false): string {
  const st = s.stats;
  if (!st.damage) return '';

  const mins = Math.floor(st.duration / 60);
  const secs = Math.floor(st.duration % 60);
  // Mitten im Lauf zaehlt die LAUFENDE Welle, am Ende die ueberstandenen.
  //
  // Das ist kein Feinschliff, sondern eine Falschauskunft gewesen: das Blatt
  // meldete waehrend der ersten Welle "Wellen 0/15". Am Ergebnisbildschirm
  // ist "ueberstanden" die richtige Lesart - dort ist die letzte Welle
  // vorbei -, waehrend des Spiels ist es die falsche. Gefunden beim
  // Hinsehen, nicht von einem Tor (Regel 8).
  const wellen = kurz
    ? [`Welle`, `${Math.max(1, s.waveNumber)}/${s.totalWaves}`]
    : ['Wellen', `${s.phase === 'won' ? s.totalWaves : Math.max(0, s.waveNumber - 1)}/${s.totalWaves}`];
  const figs = [
    wellen,
    ['Kristall', `${s.lives}/${s.maxLives}`],
    ['Dauer', `${mins}:${String(secs).padStart(2, '0')}`],
    ['Türme', String(st.towersBuilt)],
    ['Erledigt', String(st.kills)],
    ['Gold verbaut', String(st.goldSpent)],
  ].map(([l, v]) => `<div class="fig"><span>${l}</span><strong>${v}</strong></div>`).join('');

  const bars = quellen(s)
    .filter(([, , v]) => v > 0)
    .map(([name, tone, v]) => {
      const pct = Math.round((v / st.damage) * 100);
      return `<dt>${name}</dt>` +
        `<div class="track"><i style="width:${pct}%;background:${tone}"></i></div>` +
        `<dd>${pct} %</dd>`;
    }).join('');

  // Der Turm mit dem meisten Schaden - meist verraet seine Lage mehr als er
  // selbst. Gefragt sind die GEBAUTEN: die Zielunit steht immer da, sie ist
  // keine Entscheidung, die man beim naechsten Mal anders treffen koennte.
  let best: typeof s.gebaute[number] | null = null;
  for (const t of s.gebaute) if (t.damageDone > (best?.damageDone ?? 0)) best = t;
  const bestLine = best && best.damageDone > 0
    ? `<p class="note-line">Stärkster Turm: <b>${TOWERS[best.def].name} Stufe ${best.level}</b> ` +
      `bei ${Math.round(best.x)}/${Math.round(best.y)} — ${Math.round(best.damageDone)} Schaden, ` +
      `${best.kills} erledigt.</p>`
    : '';

  const kopf = `<div class="figs">${figs}</div>`
    + (bars ? `<h2>Schaden nach Quelle</h2><dl class="bars">${bars}</dl>` : '')
    + bestLine;
  // Mitten im Lauf zaehlt, was die naechste Entscheidung traegt. Der Rest -
  // wo der Kristall verloren ging, wieviele Faehigkeiten geworfen wurden -
  // ist Rueckschau und gehoert ans Ende.
  if (kurz) return kopf;

  const leaks = st.leaksByWave
    .map((v, i) => (v > 0 ? `Welle ${i + 1} (−${v})` : ''))
    .filter(Boolean);
  const leakLine = leaks.length
    ? `<p class="note-line">Kristall verloren in: <b>${leaks.join(', ')}</b>.</p>`
    : '<p class="note-line">Kein einziger Gegner ist durchgekommen.</p>';

  const uses = (st.abilityUses.meteor ?? 0) + (st.abilityUses.freeze ?? 0);
  const abilityLine = `<p class="note-line">Fähigkeiten eingesetzt: <b>${uses}</b> `
    + `(Meteor ${st.abilityUses.meteor ?? 0}, Frostschlag ${st.abilityUses.freeze ?? 0}).</p>`;

  return kopf + leakLine + abilityLine;
}
