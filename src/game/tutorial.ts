import type { GameState } from './state';

/** Die Einfuehrung erklaert nichts vorab. Sie zeigt jeweils einen Satz zum
 *  richtigen Zeitpunkt, hebt hervor, was gemeint ist, und verschwindet, sobald
 *  der Handgriff gemacht wurde. Kein Fortschrittsknopf, keine Textwand -
 *  gelernt wird durch Tun.
 *
 *  `target` ist die Kennung des Bedienelements, das hervorgehoben wird, oder
 *  `world` fuer einen Hinweis auf dem Spielfeld. */
export interface TutorialStep {
  id: string;
  text: string;
  target: string;
  /** Erledigt - der naechste Schritt beginnt. */
  done: (s: GameState) => boolean;
  /** Noch nicht so weit - der Schritt wartet, ohne etwas anzuzeigen. */
  wait?: (s: GameState) => boolean;
}

export const TUTORIAL: TutorialStep[] = [
  {
    id: 'pick',
    text: 'Tipp auf den Bogenturm.',
    target: 'tb-arrow',
    done: (s) => s.buildChoice !== null || s.towers.length > 0,
  },
  {
    id: 'place',
    text: 'Jetzt auf eine helle Fläche neben dem Pfad drücken. Gebaut wird erst beim Loslassen.',
    target: 'world',
    done: (s) => s.towers.length > 0,
  },
  {
    id: 'start',
    text: 'Die Welle wartet auf dich. Türme schießen von allein — du entscheidest nur, wo sie stehen.',
    target: 'b-wave',
    done: (s) => s.waveActive || s.waveIndex > 0,
  },
  {
    id: 'upgrade',
    text: 'Tipp deinen Turm an. Ausbauen ist meistens stärker als ein zweiter Turm daneben.',
    target: 'world',
    wait: (s) => s.waveIndex < 1,
    done: (s) => s.towers.some((t) => t.level > 1) || s.waveIndex > 1,
  },
  {
    id: 'early',
    text: 'Startest du die nächste Welle früh, gibt es zusätzliches Gold. Der Bonus schrumpft mit jeder Sekunde.',
    target: 'b-wave',
    wait: (s) => s.waveIndex < 1,
    done: (s) => s.waveIndex > 1 || (s.waveActive && s.waveIndex === 1),
  },
  {
    id: 'meteor',
    text: 'Der Meteor trifft auch fliegende Gegner. Antippen, dann eine Stelle auf dem Feld wählen.',
    target: 'sk-meteor',
    wait: (s) => s.waveIndex < 1,
    done: (s) => s.abilityCd.meteor > 0 || s.waveIndex > 1,
  },
  {
    id: 'end',
    text: 'Das war alles. Der Rest steht in der Wellenvorschau — schau nach, was kommt, bevor du startest.',
    target: 'next',
    wait: (s) => s.waveIndex < 2,
    done: (s) => s.waveIndex > 2,
  },
];

/** Die zweite, kuerzere Einfuehrung: einmal je Karte, beim ersten Betreten.
 *
 *  Warum ueberhaupt eine zweite: die grosse Einfuehrung erklaert das SPIEL -
 *  Turm waehlen, bauen, ausbauen, Faehigkeit. Sie laeuft einmal und ist dann
 *  vorbei. Was sie nicht erklaeren kann, ist die KARTE, denn die kennt sie
 *  noch nicht. Wer nach dem Spiralhain zum ersten Mal die Laubschlucht
 *  betritt, steht vor drei Zuwegen statt einem und muss selbst darauf kommen,
 *  dass das etwas anderes verlangt.
 *
 *  Ein einziger Satz, und er verschwindet beim ersten Turm. Wer schon baut,
 *  hat verstanden.
 *
 *  Der Text wird ABGELEITET, nicht je Karte geschrieben. Eine Tabelle mit
 *  drei Eintraegen waere bei der vierten Karte still unvollstaendig - und
 *  eine fehlende Zeile faellt niemandem auf, weil dann eben kein Hinweis
 *  kommt. So gilt er fuer jede Karte, die es je geben wird.
 */
export function kartenEinfuehrung(s: GameState): TutorialStep[] {
  const bahnen = s.lanes.length;
  const eng = Math.round(Math.min(...s.lanes.map((l) => l.widthRange().min)) * 2);
  const text = bahnen === 1
    ? `${s.map.name}: ein Zuweg. Alles läuft hier durch — ein guter Platz deckt fast die ganze Strecke.`
    : `${s.map.name}: ${bahnen} Zuwege. Sie münden alle im Kristall — wer nur einen bewacht, lässt die anderen laufen.`;
  return [{
    id: `karte:${s.map.id}`,
    text: `${text} Engste Stelle: ${eng} Punkte.`,
    target: 'world',
    done: (g) => g.towers.length > 0,
  }];
}
