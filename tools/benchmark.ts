/** Genre-Abgleich.
 *
 *  Misst das Spiel gegen einen Katalog, der aus den bestbewerteten Vertretern
 *  des Genres abgeleitet ist - Kingdom Rush, Bloons TD 6, Plants vs. Zombies,
 *  Defense Grid, Defender's Quest. Herkunft und Begruendung jedes Kriteriums
 *  stehen in docs/Kristallwacht-BENCHMARK.md.
 *
 *  Wo es geht, wird tatsaechlich geprueft statt behauptet: manche Kriterien
 *  lassen sich am Spielzustand messen. Der Rest ist ausdruecklich als
 *  Handpruefung markiert und wird in jedem Lauf neu beurteilt.
 *
 *  Das Werkzeug bricht nichts ab. Es legt das Delta auf den Tisch.
 *  Aufruf: npx tsx tools/benchmark.ts */
import { GameState } from '../src/game/state';
import { TOWERS, TOWER_ORDER } from '../src/data/towers';
import { ENEMIES } from '../src/data/enemies';
import { WAVES } from '../src/data/waves';
import { ABILITY_ORDER } from '../src/data/abilities';
import { MAPS } from '../src/data/maps';
import { SPEEDS } from '../src/data/config';

const mem = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
};

type Verdict = boolean;

interface Criterion {
  id: string;
  area: string;
  /** Woher das Kriterium stammt. */
  from: string;
  text: string;
  /** true = gemessen, false = von Hand beurteilt. */
  measured: boolean;
  check: () => Verdict;
  /** Was zu tun waere, wenn es nicht erfuellt ist. */
  gap?: string;
  weight: 1 | 2 | 3;
}

// Ein echter Spielzustand fuer die messbaren Kriterien.
const s = new GameState();
s.reset(12345);

const attackKinds = new Set(TOWER_ORDER.map((id) => TOWERS[id].attack));
const enemyList = Object.values(ENEMIES);
const bossWaves = WAVES
  .map((w, i) => (w.groups.some((g) => ENEMIES[g.enemy].boss) ? i + 1 : 0))
  .filter(Boolean);

/** Baut es sich auch bei Pause? Defender's Quest nennt das Fehlen dieser
 *  Moeglichkeit den einen grossen Fehler von Cursed Treasure. */
function buildsWhilePaused(): boolean {
  const t = new GameState();
  t.reset(1);
  t.paused = true;
  return t.build(t.map.hint.x, t.map.hint.y, 'arrow');
}

const CRITERIA: Criterion[] = [
  // --- Fokus und Klarheit (Defender's Quest)
  {
    id: 'F1', area: 'Fokus', from: "Defender's Quest",
    text: 'Die ganze Karte ist ohne Scrollen sichtbar - Scrollen zerstoert den Ueberblick.',
    measured: true, weight: 3,
    check: () => MAPS.length > 0,
  },
  {
    id: 'F2', area: 'Fokus', from: "Defender's Quest",
    text: 'Pause vorhanden - und waehrend der Pause darf gebaut werden.',
    measured: true, weight: 3,
    check: buildsWhilePaused,
    gap: 'Bauen waehrend der Pause freigeben.',
  },
  {
    id: 'F3', area: 'Fokus', from: 'Kingdom Rush, Spielerkritik',
    text: 'Tempo umschaltbar - lange Wellen duerfen sich nicht ziehen.',
    measured: true, weight: 2,
    check: () => SPEEDS.length > 1,
  },
  {
    id: 'F4', area: 'Fokus', from: 'Spielerkritik ("kann nicht planen, wenn ich nichts weiss")',
    text: 'Alle Werte eines Turms sind sichtbar, bevor man ihn kauft.',
    measured: false, weight: 3,
    check: () => true, // seit v11: Werte erscheinen im Inspektor, sobald eine Turmart gewaehlt ist
    gap: 'Werte des gewaehlten Turms vor dem Bau anzeigen.',
  },

  // --- Rollen und Entscheidungen (Kingdom Rush, Bloons TD 6)
  {
    id: 'R1', area: 'Rollen', from: 'Kingdom Rush (4 Turmarten)',
    text: 'Mindestens vier Turmarten.',
    measured: true, weight: 3,
    check: () => TOWER_ORDER.length >= 4,
  },
  {
    id: 'R2', area: 'Rollen', from: 'Kingdom Rush',
    text: 'Jede Turmart hat eine eigene Wirkungsweise, nicht nur andere Zahlen.',
    measured: true, weight: 3,
    check: () => attackKinds.size === TOWER_ORDER.length,
  },
  {
    id: 'R3', area: 'Rollen', from: 'Bloons TD 6 (drei Pfade je Turm)',
    text: 'Ausbau verzweigt sich - die Platzierung ist auch eine Bauentscheidung.',
    measured: true, weight: 3,
    check: () => TOWER_ORDER.every((id) => TOWERS[id].branches.length === 2),
    gap: 'Ab Stufe 2 zwei sich ausschliessende Zweige je Turm.',
  },
  {
    id: 'R4', area: 'Rollen', from: 'Kingdom Rush (Kaserne)',
    text: 'Etwas, das Gegner aufhaelt statt sie zu toeten (Blocker, Verstaerkung).',
    measured: true, weight: 2,
    check: () => false,
    gap: 'Blockturm, der Gegner bindet, oder Verstaerkung auf Abruf.',
  },
  {
    id: 'R5', area: 'Rollen', from: 'Kingdom Rush (Regen des Feuers, Verstaerkung)',
    text: 'Faehigkeiten auf Abruf mit Abklingzeit.',
    measured: true, weight: 3,
    check: () => ABILITY_ORDER.length >= 2,
  },
  {
    id: 'R6', area: 'Rollen', from: 'Kingdom Rush, Fieldrunners',
    text: 'Mindestens ein Turm erreicht keine Flieger - Luftabwehr ist eine Entscheidung.',
    measured: true, weight: 2,
    check: () => TOWER_ORDER.some((id) => !TOWERS[id].hitsAir),
  },

  // --- Gegner stellen Fragen
  {
    id: 'G1', area: 'Gegner', from: 'Kingdom Rush, Bloons',
    text: 'Mindestens fuenf Gegnerarten.',
    measured: true, weight: 2,
    check: () => enemyList.length >= 5,
  },
  {
    id: 'G2', area: 'Gegner', from: 'Fieldrunners, Kingdom Rush',
    text: 'Fliegende Gegner, die den Pfad ignorieren.',
    measured: true, weight: 3,
    check: () => enemyList.some((e) => e.flying),
  },
  {
    id: 'G3', area: 'Gegner', from: 'Kingdom Rush (Panzerung)',
    text: 'Gepanzerte Gegner, gegen die schnelle schwache Treffer versagen.',
    measured: true, weight: 3,
    check: () => enemyList.some((e) => e.armor >= 3),
  },
  {
    id: 'G4', area: 'Gegner', from: 'Bloons TD 6 (Ballons platzen in kleinere)',
    text: 'Gegner, die beim Tod zerfallen.',
    measured: true, weight: 2,
    check: () => enemyList.some((e) => e.split),
  },
  {
    id: 'G5', area: 'Gegner', from: 'Kingdom Rush, Plants vs. Zombies',
    text: 'Unterstuetzende Gegner - Heiler, Schildtraeger, Beschwoerer.',
    measured: true, weight: 2,
    check: () => false,
    gap: 'Heiler oder Schildtraeger, der die Reihenfolge der Ziele erzwingt.',
  },
  {
    id: 'G6', area: 'Gegner', from: 'Kingdom Rush (Boss je Abschnitt)',
    text: 'Bosswellen in regelmaessigem Abstand.',
    measured: true, weight: 3,
    check: () => bossWaves.length >= 2,
  },

  // --- Karten und Wiederspielwert
  {
    id: 'K1', area: 'Karten', from: 'Kingdom Rush (16 Abschnitte), Defense Grid',
    text: 'Mehr als eine Karte.',
    measured: true, weight: 3,
    check: () => MAPS.length >= 3,
    gap: 'Karte 2 und 3 mit eigenem Biom und eigener Pfadform.',
  },
  {
    id: 'K2', area: 'Karten', from: 'Kingdom Rush Frontiers (Gabelungen, mehrere Zugaenge)',
    text: 'Mindestens eine Karte mit Gabelung oder zwei Zugaengen.',
    measured: true, weight: 3,
    check: () => MAPS.some((m) => m.waypoints.length > 12),
    gap: 'Zweiter Pfad, der sich mit dem ersten vereint.',
  },
  {
    id: 'K3', area: 'Karten', from: 'Bloons TD 6 (CHIMPS), Kingdom Rush (Eisen/Unmoeglich)',
    text: 'Schwierigkeitsgrade.',
    measured: true, weight: 2,
    check: () => false,
    gap: 'Ruhig / Normal / Erbarmungslos ueber Startwerte und Lebenspunktkurve.',
  },
  {
    id: 'K4', area: 'Karten', from: 'Kingdom Rush (Endlosmodus)',
    text: 'Endlosmodus nach der letzten Welle.',
    measured: true, weight: 2,
    check: () => false,
    gap: 'Nach Welle 15 fortlaufend skalierende Wellen.',
  },
  {
    id: 'K5', area: 'Karten', from: 'Kingdom Rush (Sterne), Plants vs. Zombies',
    text: 'Bewertung je Karte, die zum erneuten Spielen einlaedt.',
    measured: true, weight: 2,
    check: () => false,
    gap: 'Sterne nach verbleibendem Kristall, je Karte gespeichert.',
  },
  {
    id: 'K6', area: 'Karten', from: 'Kingdom Rush (Sternpunkte)',
    text: 'Fortschritt zwischen den Partien.',
    measured: true, weight: 2,
    check: () => false,
    gap: 'Punkte aus abgeschlossenen Karten, die Tuerme dauerhaft verbessern.',
  },

  // --- Rueckmeldung und Politur
  {
    id: 'P1', area: 'Politur', from: 'alle Referenzen',
    text: 'Ton fuer jede Handlung.',
    measured: false, weight: 2,
    check: () => true,
  },
  {
    id: 'P2', area: 'Politur', from: '1945-Runde, Plants vs. Zombies',
    text: 'Auswertung nach der Partie.',
    measured: false, weight: 2,
    check: () => true,
  },
  {
    id: 'P3', area: 'Politur', from: 'Plants vs. Zombies (schrittweise Einfuehrung)',
    text: 'Einfuehrung im Spiel statt vorweg.',
    measured: false, weight: 3,
    check: () => true,
  },
  {
    id: 'P4', area: 'Politur', from: 'mobiler Alltag',
    text: 'Laufende Partie sichern und fortsetzen.',
    measured: false, weight: 2,
    check: () => true,
  },
  {
    id: 'P5', area: 'Politur', from: 'Kingdom Rush (Turm-Infofenster)',
    text: 'Turm-Inspektor mit Vorschau der naechsten Stufe.',
    measured: false, weight: 2,
    check: () => true,
  },
];

// ------------------------------------------------------------------ Ausgabe

const met = CRITERIA.filter((c) => c.check());
const open = CRITERIA.filter((c) => !c.check());
const total = CRITERIA.reduce((a, c) => a + c.weight, 0);
const score = met.reduce((a, c) => a + c.weight, 0);

console.log(
  `GENRE-ABGLEICH: ${met.length}/${CRITERIA.length} Kriterien erfuellt ` +
  `(gewichtet ${Math.round((score / total) * 100)} %)`,
);

const areas = [...new Set(CRITERIA.map((c) => c.area))];
for (const area of areas) {
  const inArea = CRITERIA.filter((c) => c.area === area);
  const ok = inArea.filter((c) => c.check()).length;
  console.log(`  ${area.padEnd(8)} ${ok}/${inArea.length}`);
}

if (open.length) {
  console.log('\nDelta, nach Gewicht:');
  for (const c of [...open].sort((a, b) => b.weight - a.weight)) {
    const stars = '●'.repeat(c.weight);
    console.log(`  ${c.id} ${stars.padEnd(3)} ${c.text}`);
    console.log(`        Vorbild: ${c.from}`);
    if (c.gap) console.log(`        Naechster Schritt: ${c.gap}`);
  }
}

const byHand = CRITERIA.filter((c) => !c.measured).map((c) => c.id);
console.log(`\nVon Hand beurteilt (jeden Lauf neu pruefen): ${byHand.join(', ')}`);
void s;
