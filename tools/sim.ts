/** Kopflose Balance-Simulation.
 *  Ein Bot spielt alle Wellen mit verschiedenen Turmstrategien durch, ohne
 *  Browser, in Millisekunden. Jede Aenderung an Schaden, Kosten, Reichweite
 *  oder Gegnerwerten wird sofort daran gemessen.
 *  Aufruf: npx tsx tools/sim.ts */
import { GameState } from '../src/game/state';
import { ZIELWAHL_ORDNUNG, type Zielwahl, type Tower } from '../src/game/types';

import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from '../src/data/difficulty';

const START_LIVES = DIFFICULTIES.normal.startLives;
import { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor, type TowerId } from '../src/data/towers';

import { MAPS } from '../src/data/maps';
import { WEGNETZ } from '../src/data/wegnetz';
import { ALL_PERKS, NO_PERKS, starsFor } from '../src/data/perks';
import { ABILITIES } from '../src/data/abilities';
import { candidateSpots } from './spots';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** **Die Spannungsratsche** (S-P1-02).
 *
 *  Vier Zahlen sagen, ob das Spiel spannend ist - und alle vier standen bis
 *  v252 nur in einem Dokument und in einem Hinweis, der nicht abbricht
 *  (`OFFEN (T15): ...`). Eine Regel, die nur aufgeschrieben ist, wird
 *  gebrochen; das hat dieses Projekt sechsmal gekostet. **Belegt an dieser
 *  Datei:** zwischen v238 und v248 ist der Stilabstand von 9 auf 6 gefallen,
 *  also schlechter geworden, und kein Tor hat ein Wort gesagt.
 *
 *  Die Ratsche ist **kein Soll**. Sie haelt nur fest, was schon einmal
 *  erreicht war - dasselbe Muster wie `bahntreue` und `wegdeckung`. Das Soll
 *  steht daneben und laeuft als Hinweis mit, solange es nicht erreicht ist.
 *
 *  **Und sie haelt gegen ihr eigenes Rauschen, nicht gegen eine nackte
 *  Zahl.** Jede der fuenf Kennzahlen schwankt mit der Aussaat; eine Ratsche
 *  ohne diese Spanne wuerde bei jedem zweiten Lauf anschlagen und damit
 *  genau das werden, was ein Tor nicht sein darf - eine Meldung, die man
 *  wegklickt. Erlaubt ist deshalb ein Rueckschritt bis zur gemessenen
 *  Rauschgrenze der Kennzahl, alles darueber bricht ab. */
const SPANNUNG_DATEI = fileURLToPath(new URL('spannung-stand.txt', import.meta.url));
const SPANNUNG_SCHREIBEN = process.argv.slice(2).includes('--spannung-schreiben');

interface Spannungswert {
  /** Der gemessene Wert dieses Laufs. */
  wert: number | null;
  /** Die Spanne ueber die Aussaaten - die Rauschgrenze dieser Kennzahl. */
  rauschen: number;
  /** Woran gemessen wurde (Regel 12). Steht in jeder Meldung mit drin. */
  messstelle: string;
}
const spannung = new Map<string, Spannungswert>();
const spannungGemessen = (
  schluessel: string, wert: number | null, rauschen: number, messstelle: string,
): void => { spannung.set(schluessel, { wert, rauschen, messstelle }); };

/** Mittelwert und Spanne einer Kennzahl ueber mehrere Laeufe. */
const mittelUndSpanne = (werte: number[]): { mittel: number; spanne: number } => ({
  mittel: werte.reduce((a, b) => a + b, 0) / werte.length,
  spanne: Math.max(...werte) - Math.min(...werte),
});

/** Die laengste Strecke aufeinanderfolgender Wellen ohne einen einzigen
 *  Verlust. Sie misst, wie lange nichts passiert - eine Partie, in der
 *  dreizehn Wellen hintereinander folgenlos bleiben, hat ihre Entscheidung
 *  laengst getroffen und spielt sie nur noch ab. */
const laengsteRuhe = (leakByWave: number[]): number => {
  let beste = 0, jetzt = 0;
  for (const v of leakByWave) { if (v > 0) jetzt = 0; else beste = Math.max(beste, ++jetzt); }
  return beste;
};

const KOPF = `# Die Spannungsratsche - der Stand, unter den kein Lauf fallen darf.
# Geschrieben von \`npx tsx tools/sim.ts --spannung-schreiben\`, gelesen von
# jedem Lauf. Vier Spalten: Kennzahl, Richtung (hoch = mehr ist besser),
# Stand, Soll. Das Soll wird von Hand gepflegt, der Stand nicht.
`;

/** Den Stand lesen. Eine fehlende oder leere Datei gibt eine leere Karte
 *  zurueck - der Aufrufer meldet das, statt sie fuer sauber zu halten. */
function leseSpannungsstand(): Map<string, {
  richtung: 'hoch' | 'tief'; stand: number | null; soll: number | null;
}> {
  const karte = new Map<string, {
    richtung: 'hoch' | 'tief'; stand: number | null; soll: number | null;
  }>();
  let text: string;
  try { text = readFileSync(SPANNUNG_DATEI, 'utf8'); } catch { return karte; }
  for (const zeile of text.split('\n')) {
    const z = zeile.trim();
    if (!z || z.startsWith('#')) continue;
    const [k, richtung, stand, soll] = z.split(/\s+/);
    if (!k || (richtung !== 'hoch' && richtung !== 'tief') || soll === undefined) continue;
    // **Ein Soll darf fehlen, und das steht als `-` da.** Regel 10: das Soll
    // kommt aus der Referenz, nicht aus mir. Fuer die Knappheit gibt es
    // keine Zahl aus einem Vorbild - sie laeuft deshalb als reine Ratsche,
    // und eine ausgedachte Linie stuende hier sonst wie eine gemessene.
    karte.set(k, {
      richtung, stand: stand === 'UNBELEGT' ? null : Number(stand),
      soll: soll === '-' ? null : Number(soll),
    });
  }
  return karte;
}

const DT = 1 / 60;

/** **Die Aussaaten** (v251, S-P1-01).
 *
 *  Bis v250 stand hier `const SEEDS = [20260807]` - EINE Zahl, und jede
 *  Balancezahl dieses Projekts hing daran. Die drei Abwandlungen darunter
 *  verstellen die Ruecklage des Bots und seinen Startplatz, **nicht** den
 *  Zufallsgeber des Spiels; sie messen also drei Bauverlaeufe in derselben
 *  Welt.
 *
 *  Nachgemessen an vier Aussaaten (Anforderungskatalog 2.1): der
 *  Zweigunterschied beim Moerser betraegt +11, +9, -1 und +9 Kristall, der
 *  Stilabstand 6, 8, 6 und 9 Punkte - **die Effekte, nach denen justiert
 *  wird, sind kleiner als die Streuung des Verfahrens.** Eine Zahl, die sich
 *  mit der Aussaat um mehr bewegt als durch die Aenderung, ist keine Zahl.
 *
 *  Drei Aussaaten, nicht mehr: gemessen kostet jede zusaetzliche rund
 *  zwanzig Sekunden, und die Torkette hat zweieinhalb Minuten. Drei reichen
 *  fuer eine Spanne; fuer eine Verteilung reichen sie nicht, und das steht
 *  hier, damit niemand die Spanne fuer ein Vertrauensintervall haelt. */
const AUSSAATEN = [20260807, 11111111, 22222222];

/** Drei leicht abgewandelte Spielverlaeufe je Messung.
 *
 *  Der Verlauf ist path-abhaengig: wann Gold ankommt, entscheidet, welcher
 *  Turm zuerst steht, und das entscheidet den Rest. Deshalb kann selbst
 *  *mehr* Schaden zu einem schlechteren Ergebnis fuehren - gemessen an einem
 *  einzelnen Verlauf ist das Chaos, nicht Balance. Erst der Mittelwert ueber
 *  mehrere vernuenftige Verlaeufe ist eine Zahl, nach der man justieren kann. */
const VARIANTS = [0, 1, 2];

/** Mittelwert einer Kennzahl ueber Aussaat UND Abwandlung - neun Laeufe.
 *
 *  `spanne` ist der Abstand zwischen der besten und der schlechtesten
 *  **Aussaat** (je Aussaat ueber die Abwandlungen gemittelt). Das ist die
 *  Rauschgrenze dieser Kennzahl: ein Unterschied, der kleiner ist, ist keiner.
 *
 *  Die Spanne ueber alle neun Laeufe waere die falsche Zahl - sie enthielte
 *  die Streuung der Bauverlaeufe, und die ist gewollt, nicht Rauschen. */
function overVariants(
  run: (variant: number, aussaat: number) => Result,
): { runs: Result[]; mean: number; spanne: number } {
  const runs: Result[] = [];
  const jeAussaat: number[] = [];
  for (const aussaat of AUSSAATEN) {
    aussaatGezaehlt('overVariants', aussaat);
    const dieser = VARIANTS.map((v) => run(v, aussaat));
    runs.push(...dieser);
    jeAussaat.push(dieser.reduce((a, r) => a + score(r), 0) / dieser.length);
  }
  return {
    runs,
    mean: runs.reduce((a, r) => a + score(r), 0) / runs.length,
    spanne: Math.max(...jeAussaat) - Math.min(...jeAussaat),
  };
}

/** Dasselbe fuer Messungen ohne Abwandlungen: nur ueber die Aussaaten.
 *
 *  Die Zweigtabelle braucht das. Mit Abwandlungen waeren es 72 Laeufe fuer
 *  acht Zweige, und die Kette hat zweieinhalb Minuten. */
/** Wieviele Aussaaten JEDE Mittelungsfunktion wirklich gefahren hat.
 *
 *  **Eine Mittelung ueber eine Aussaat ist keine**, und man sieht es der
 *  Ausgabe nicht an: sie meldet Mittelwerte, gleich wieviele Laeufe
 *  dahinterstehen.
 *
 *  **Je Funktion gezaehlt, nicht im ganzen Lauf** - und das ist der
 *  Unterschied zwischen einer Pruefung und einer Beruhigung. Der erste
 *  Entwurf sammelte die Aussaaten in `play`, also ueber alles zusammen:
 *  schnitt man dann die Schleife der einen Funktion zurueck, fuhr die andere
 *  weiterhin alle drei, die Menge war vollstaendig, und das Tor schwieg. Die
 *  zwei Gegenproben haben genau das gemeldet (Regel 3 - der Eingriff kam an,
 *  er loeste nur nichts aus). */
const aussaatenJeMessung = new Map<string, Set<number>>();
function aussaatGezaehlt(wo: string, aussaat: number): void {
  const da = aussaatenJeMessung.get(wo) ?? new Set<number>();
  da.add(aussaat);
  aussaatenJeMessung.set(wo, da);
}

function ueberAussaaten(run: (aussaat: number) => Result): {
  runs: Result[]; mittel: number; spanne: number;
} {
  const runs = AUSSAATEN.map((a) => { aussaatGezaehlt('ueberAussaaten', a); return run(a); });
  const werte = runs.map((r) => (r.won ? r.lives : 0));
  return {
    runs,
    mittel: werte.reduce((a, b) => a + b, 0) / werte.length,
    spanne: Math.max(...werte) - Math.min(...werte),
  };
}

/** Eine Zahl, die Sieg und Niederlage vergleichbar macht: Niederlage zaehlt
 *  die erreichte Welle, Sieg 100 plus verbleibenden Kristall. */
function score(r: Result): number {
  // Bewusst normiert von 0 bis 100 und nicht "100 plus Kristall": als der
  // Kristall von 20 auf 60 Punkte stieg, wurden alle absoluten Grenzen in
  // dieser Datei still falsch - zwei Pruefungen schlugen an, obwohl sich an
  // der Balance nichts verschlechtert hatte. Eine Kennzahl, deren Bedeutung
  // von einer anderen Einstellung abhaengt, ist keine Kennzahl.
  const waves = Math.max(1, MAPS[0].waves.length);
  if (!r.won) return (Math.min(r.wave, waves) / waves) * 50;
  return 50 + (r.lives / Math.max(1, r.maxLives)) * 50;
}

/** Spielstile.
 *
 *  Ein einzelner Bot ist ein einzelner Blickwinkel. Eine Kurve, die nur gegen
 *  "wenige starke Tuerme" stimmt, kann gegen "viele billige" voellig anders
 *  aussehen - und ein Mensch spielt mal so, mal so. Deshalb wird jede Runde
 *  gegen mehrere Stile gemessen. */
interface Bot {
  name: string;
  /** Wie viele Tuerme dieser Stil hoechstens stellt. */
  maxTowers: number;
  /** Bis zu welcher Stufe ausgebaut wird. */
  maxLevel: number;
  /** Wieviel Gold liegen bleibt, um auf eine Welle reagieren zu koennen. */
  reserve: number;
  /** Bilder zwischen zwei Entscheidungen - ein Mensch tippt nicht 60-mal je Sekunde. */
  decideEvery: number;
  /** Ab welchem Anteil der Turmzahl in die Tiefe statt in die Breite investiert wird. */
  deepenAt: number;
  /** Wie dieser Stil mit den Weichen umgeht (S-N2-06).
   *
   *  **Warum das eine vierte Dimension braucht und keine vierte Zeile in der
   *  Turmlogik ist:** die Weiche ist die einzige Entscheidung des Spiels, die
   *  nicht Gold kostet. Ein Bot, der sie nicht benutzt, misst ein anderes
   *  Spiel als das ausgelieferte - dieselbe Luecke, die v267 fuer die
   *  Ueberlappung ein eigenes Werkzeug gekostet hat.
   *
   *   `offen`    ruehrt keine Weiche an. Das ist der Zustand, gegen den die
   *              ganze Balance geeicht ist - er MUSS weiter vertreten sein,
   *              sonst misst der naechste Lauf gegen eine andere Karte.
   *   `lang`     macht alles zu, was zugeht: der laengste Weg, den die Karte
   *              hergibt. Defense Grids Labyrinth in einem Satz.
   *
   *  **Ein dritter Stil ist zweimal gebaut und zweimal gemessen gescheitert -
   *  und der zweite Anlauf hat die eigentliche Auskunft geliefert.**
   *  `deckung` sollte die Stellung mit der laengsten GEDECKTEN Strecke
   *  waehlen. In v283 lag es an der Zahl der Weichen: bei einer Weiche gibt
   *  es zwei Stellungen, und "waehle die bessere" faellt mit einer festen
   *  Strategie zusammen. In v284 hatte der Spiralhain vier Stellungen, der
   *  Stil entschied vor dem ersten Turm - und gewann trotzdem nirgends
   *  allein, weder gegen zwoelf Tuerme gerechnet noch gegen vier.
   *
   *  **Was daraus folgt, ist eine Aussage ueber die KENNZAHL, nicht ueber die
   *  Weiche: gedeckte Laenge sagt den Verlust nicht vorher.** Gemessen decken
   *  die zwoelf besten Plaetze auf dem laengeren Weg des Spiralhains 4896
   *  statt 3864 Weltpunkte - und `offen` gewinnt dort trotzdem W11, W14 und
   *  W15 allein. Ein Stil, der auf diese Zahl hin optimiert, optimiert auf
   *  das Falsche.
   *
   *  Gestrichen statt stillgelegt (Regel 5). Was ein dritter Stil braeuchte,
   *  ist keine dritte Strategie, sondern eine Kennzahl, die Verluste
   *  vorhersagt - und die gibt es heute nicht (M17). */
  weichenStil: 'offen' | 'lang';
  /** Wieviele Foerderer dieser Stil baut, bevor er Geschuetze stellt
   *  (S-N3-01).
   *
   *  **Zuerst, nicht nebenbei** - und das ist keine Bequemlichkeit: ein
   *  Einkommensgebaeude zahlt sich ueber die Restlaufzeit aus, also ist die
   *  einzige Frage, wie frueh man es hinstellt. Wer es spaet baut, hat es
   *  bezahlt und nichts davon. Defense Grid und Rogue Tower machen es
   *  genauso; in beiden ist die Eroeffnung die Stelle, an der man sich
   *  zwischen Feuerkraft und Einkommen entscheidet.
   *
   *  Null heisst: dieser Stil baut keine. Der Stil muss vertreten bleiben -
   *  die ganze Balance ist gegen ihn geeicht.
   *
   *  **Der Bot baut Foerderer, aber er baut sie nicht AUS, und das steht hier
   *  statt in einer Fussnote.** Sein Ausbauzweig nimmt den Turm mit dem
   *  meisten Schaden; ein Foerderer macht keinen und kommt deshalb nie an die
   *  Reihe. Eine Ersatzregel waere zu erfinden gewesen ("immer bis Stufe 2"),
   *  und eine erfundene Regel im Messgeraet misst die Regel statt das Spiel
   *  (Regel 4). Die Foerderer stehen also auf Stufe 1 mit 25 % Zuschlag - was
   *  hier gemessen wird, ist die untere Kante ihrer Wirkung. */
  foerderer: number;
}

/** Die Stile bilden unterschiedliche *Entscheidungen* ab, keine Fehler.
 *  "Nie ueber Stufe 2 ausbauen" waere kein Stil, sondern schlechtes Spiel -
 *  dass ein schlecht gespieltes Feld verliert, ist gewollt. */
/** Die drei Spielstile.
 *
 *  Bis v33 unterschieden sie sich in der *Anzahl* der Tuerme - und genau das
 *  war das Problem hinter T16 und T17: "viele Tuerme" war kein Stil, sondern
 *  Ueberdeckung. Seit es je Karte zwoelf feste Bauplaetze gibt, ist die Anzahl
 *  keine Entscheidung mehr. Die Stile unterscheiden sich jetzt darin, *wann*
 *  sie ausbauen und wieviel sie in der Hand behalten:
 *
 *  - Stellungen zuerst, Ausbau spaeter (Breite)
 *  - Wechselnd, immer der staerkste Turm zuerst (Meister)
 *  - Wenige Stellungen, frueh tief, grosse Ruecklage (Sparsam)
 *
 *  Alle drei koennen alle zwoelf Plaetze belegen - keiner ist durch die
 *  Obergrenze benachteiligt. */
const BOTS: Bot[] = [
  {
    name: 'Meister', foerderer: 1, maxTowers: 12, maxLevel: 3, reserve: 40, decideEvery: 30, deepenAt: 0.65,
    // Der Meister laesst offen - und zwar bewusst der, gegen den alle
    // uebrigen Zahlen dieses Werkzeugs geeicht sind. Wer ihn umstellt,
    // verschiebt jede andere Messung mit.
    weichenStil: 'offen',
  },
  {
    // Erst alle Stellungen besetzen, dann ausbauen.
    name: 'Breite', foerderer: 0, maxTowers: 12, maxLevel: 3, reserve: 15, decideEvery: 20, deepenAt: 1,
    weichenStil: 'offen',
  },
  {
    // Nur die Haelfte der Plaetze, dafuer frueh tief und mit Ruecklage.
    name: 'Sparsam', foerderer: 1, maxTowers: 12, maxLevel: 3, reserve: 140, decideEvery: 30, deepenAt: 0.5,
    weichenStil: 'lang',
  },
];


/** **Die Bestleistung** - der Spieler, der alles richtig macht (v246, F7).
 *
 *  Die drei Stile oben sind bewusst bescheiden: zwoelf Tuerme, hoechstens
 *  Stufe 3 von sechs. Das ist richtig fuer die Frage "kommt ein normaler
 *  Spieler durch" - und falsch fuer die Frage "sind drei Sterne ueberhaupt
 *  erreichbar". Die stand trotzdem seit jeher auf denselben drei Laeufen.
 *
 *  Gemessen ist der Unterschied gross: auf dem Farnkessel kommen die drei
 *  Stile auf 24 bis 29 von 60 Kristall, ein Bot ohne diese Deckel auf 38.
 *  "Auch der beste Spielstil holt nur zwei Sterne" hiess also in Wahrheit
 *  "auch der beste der drei bescheidenen Stile" - und daraus wurde im
 *  Rueckstandsverzeichnis (F7) der Satz "die Haelfte des Spiels hat kein
 *  erreichbares Bestergebnis". Dieselbe Klasse wie die Zahlwort-Tabelle in
 *  v230 und das Befehlsmuster in v244: eine Messung, die weniger sagt, als
 *  der Satz daneben behauptet.
 *
 *  Er zaehlt bewusst NICHT bei "keine Karte darf muehelos sein" - dort geht
 *  es um den gewoehnlichen Spieler, und der ist einer der drei. */
const BESTLEISTUNG: Bot = {
  name: 'Bestleistung', foerderer: 1, maxTowers: 24, maxLevel: MAX_LEVEL,
  reserve: 40, decideEvery: 20, deepenAt: 0.8,
  // **In der Sache Weichen ist auch die Bestleistung nicht die beste - und
  // das ist kein Versehen, sondern M17.**
  //
  // Der erste Entwurf gab ihr `lang`: der Spieler, der alles richtig macht,
  // baut sein Labyrinth zuerst. Seit der Spiralhain zwei Weichen hat, macht
  // `lang` dort beide zu (+43 % Weg), und der Waechter hat es sofort
  // gemeldet: "auch der beste Spielstil holt nur 1 Stern".
  //
  // Gemessen ist die beste Stellung je Karte verschieden - auf dem Spiralhain
  // gewinnt `offen` drei Wellen allein, auf der Frostspalte `lang` drei. Ein
  // FESTER Stil kann also nicht der beste Spieler sein, und ausrechnen laesst
  // sich die bessere Stellung heute nicht: gedeckte Laenge sagt den Verlust
  // nicht vorher (M17).
  //
  // Sie laesst deshalb offen - den Zustand, gegen den die ganze Balance
  // geeicht ist. Das ist ehrlicher als eine Wahl, die sich als beste ausgibt.
  weichenStil: 'offen',
};

const MEISTER = BOTS[0];
const NUR_MESSEN = process.argv.slice(2).includes('--faehigkeiten');

/** Bauplaetze nach abgedeckter Wegstrecke bewertet.
 *
 *  Naehe allein taugt nicht - ein Platz in der Innenkurve deckt drei
 *  Wegabschnitte, einer am Rand nur einen. Gemessen wird deshalb, wieviel
 *  Wegstrecke in Reichweite liegt.
 *
 *  Die Reichweite ist bewusst ein fester Wert und nicht die groesste im
 *  Sortiment: die Bewertung ist Teil des Bot-Modells. Haengt sie an den
 *  Turmwerten, aendert jede Turmaenderung zugleich das Verhalten des Bots -
 *  und dann misst die Simulation zwei Dinge auf einmal. */
function buildSpots(s: GameState): { x: number; y: number }[] {
  return candidateSpots(s);
}

interface Result {
  lives: number; wave: number; won: boolean;
  towers: number; upgrades: number; peakEnemies: number; peakFx: number;
  maxLives: number;
  earned: number; spent: number;
  leakByWave: number[];
  /** Wieviele Entscheidungen der Bot in jeder Welle getroffen hat (S-P1-03). */
  entscheidungenJeWelle: number[];
  /** Dauer der Partie in Sekunden (S-P1-04). */
  dauer: number;
  /** Anteil der Spielzeit, in dem kein Gegner lebt und keiner mehr kommt. */
  leerlaufAnteil: number;
  /** Anteil der Spielzeit, in dem hoechstens ein Gegner auf dem Feld steht. */
  duennAnteil: number;
  /** Anteil der Entscheidungszeitpunkte, an denen das Gold nicht reichte. */
  knappheitsAnteil: number;
  /** Wieviele Raeuber es gab und wieviele davon gerettet wurden (S-P3-04). */
  raeuber: number;
  gerettet: number;
  geretteteFunken: number;
}

type BranchPick = (id: TowerId) => 0 | 1;

/** Dem zuletzt gebauten Turm seine Ziellogik geben.
 *
 *  Am zuletzt gebauten und nicht am ganzen Feld: der Bot baut waehrend der
 *  Partie nach, und ein Durchlauf ueber alle Tuerme nach jedem Bau waere
 *  nicht nur teurer, er wuerde auch eine spaetere Handaenderung ueberschreiben.
 */
function stelleZiel(s: GameState, f?: (t: Tower, i: number, s: GameState) => Zielwahl): void {
  if (!f) return;
  const i = s.towers.length - 1;
  if (i >= 0) s.towers[i].zielwahl = f(s.towers[i], i, s);
}


/** **Die Weichenstile gegeneinander** (S-N2-06).
 *
 *  Gefahren wird DERSELBE Bot mit drei Weichenstilen, nicht die drei Bots
 *  gegeneinander: die unterscheiden sich in Ruecklage, Ausbautiefe und
 *  Entscheidungstakt, und ihr Unterschied im Verlust waere dann die
 *  Turmlogik, nicht die Weiche. Wer eine Wirkung misst, schaltet alles andere
 *  ab (Regel 13).
 *
 *  Zwei Pruefungen, beide aus v219 uebernommen und dort begruendet:
 *
 *   - **Kein Stil darf ueberall hinten liegen.** Eine Wahl, die nirgends
 *     etwas bringt, ist keine.
 *   - **Zwei Stile mit gleichem Verlust je Welle auf ALLEN Karten sind ein
 *     Stil mit zwei Namen.** Bei 15 Wellen und vier Karten treffen 60 Zahlen
 *     nicht versehentlich aufeinander.
 *
 *  **Und eine Zeile sagt, was heute nicht geht:** solange nur EINE Karte eine
 *  Weiche hat, koennen sich die Stile auf den anderen dreien gar nicht
 *  unterscheiden. Das steht als Zahl da, statt als stille Null in der
 *  Statistik zu verschwinden. */
const WEICHENSTILE = ['offen', 'lang'] as const;

/** Der Grad, auf dem die Weichenstile verglichen werden.
 *
 *  **Nicht "normal", und der Grund ist gemessen.** Auf `normal` gewinnt der
 *  Spiralhain mit 42 von 42 Kristallpunkten - es gibt fast keinen Verlust,
 *  und was es nicht gibt, kann keine Stile trennen: der erste Lauf meldete
 *  "keine Welle trennt die Stile", obwohl die Deckung sich messbar
 *  unterscheidet (die zwoelf besten Plaetze sehen mit gestellter Weiche 4896
 *  statt 3864 Weltpunkte, Wegvielfachheit 1,23 statt 0,87).
 *
 *  Verglichen wird deshalb dort, wo die Karte wirklich weh tut. Das ist eine
 *  Messstelle, keine Erleichterung (Regel 12): die Balance selbst bleibt
 *  gegen `normal` geeicht, hier wird nur die Frage gestellt, ob die
 *  Entscheidung ueberhaupt eine ist. */
const WEICHEN_GRAD: DifficultyId = 'erbarmungslos';

function weichenstileMessen(): void {
  const mitWeiche = MAPS.filter((m) => (WEGNETZ[m.id]?.weichen?.length ?? 0) > 0);
  console.log(`\nWeichenstile (derselbe Bot, ${WEICHENSTILE.length} Stellungsstrategien, `
    + `Grad ${WEICHEN_GRAD}) - `
    + `${mitWeiche.length} von ${MAPS.length} Karten haben ueberhaupt eine Weiche:`);
  if (!mitWeiche.length) {
    errors.push('Weichenstile: keine Karte hat eine Weiche - die Stile messen nichts.');
    return;
  }
  const siege: Record<string, number> = {};
  const geteilt: Record<string, number> = {};
  const verlauf: Record<string, string> = {};
  for (const w of WEICHENSTILE) { siege[w] = 0; geteilt[w] = 0; verlauf[w] = ''; }
  let entschieden = 0;
  for (const mm of mitWeiche) {
    const proStil: Record<string, number[]> = {};
    for (const w of WEICHENSTILE) {
      proStil[w] = play(mixedPlanBase, () => 0, { ...MEISTER, weichenStil: w },
        WEICHEN_GRAD, mm.id).leakByWave;
    }
    for (const w of WEICHENSTILE) verlauf[w] += `|${proStil[w].join(',')}`;
    const wellen = Math.max(...WEICHENSTILE.map((w) => proStil[w].length));
    const zeile: string[] = [];
    for (let i = 0; i < wellen; i++) {
      const werte = WEICHENSTILE.map((w) => proStil[w][i] ?? 0);
      const min = Math.min(...werte), max = Math.max(...werte);
      if (min === max) continue;
      entschieden++;
      const beste = WEICHENSTILE.filter((_w, k) => werte[k] === min);
      if (beste.length === 1) { siege[beste[0]]++; zeile.push(`W${i + 1}:${beste[0]}`); }
      else for (const w of beste) geteilt[w]++;
    }
    console.log(`  ${mm.id.padEnd(15)} ${zeile.join('  ') || 'keine Welle trennt die Stile'}`);
  }
  for (let i = 0; i < WEICHENSTILE.length; i++) {
    for (let j = i + 1; j < WEICHENSTILE.length; j++) {
      const a = WEICHENSTILE[i], b = WEICHENSTILE[j];
      if (verlauf[a] === verlauf[b]) {
        errors.push(`Weichenstil: "${a}" und "${b}" hinterlassen auf allen Karten `
          + 'denselben Verlust je Welle - das sind zwei Namen fuer denselben Stil.');
      }
    }
  }
  console.log(`  Alleinsiege: ${WEICHENSTILE.map((w) => `${w} ${siege[w]}`).join('  ')}`
    + `   (${entschieden} Wellen trennen ueberhaupt)`);
  console.log(`  geteilt:     ${WEICHENSTILE.map((w) => `${w} ${geteilt[w]}`).join('  ')}`);
  for (const w of WEICHENSTILE) {
    if (siege[w] + geteilt[w] === 0) {
      errors.push(`Weichenstil "${w}": in keiner Welle auf keiner Karte vorn - `
        + 'eine Wahl ohne Folgen.');
    }
  }
}

/** Die Welle, der eine Entscheidung zugeschlagen wird.
 *
 *  Dieselbe Rechnung wie im Entscheidungszaehler weiter unten - nur an einer
 *  Stelle, an der `welle` noch nicht in Reichweite ist. */
function welleNr(s: GameState): number {
  return Math.max(0, Math.min(s.waves.length - 1, s.waveIndex));
}

/** Welche Weichen dieser Stil gestellt haben will.
 *
 *  Zwei Stile, zwei Zeilen: `offen` ruehrt keine an, `lang` macht alles zu,
 *  was zugeht. Ein dritter, der die bessere Stellung WAEHLT, ist zweimal
 *  gebaut und zweimal gemessen gescheitert - nicht an sich, sondern an der
 *  Kennzahl, auf die er optimieren muesste (M17, siehe `Bot.weichenStil`).
 *
 *  Was nicht zugeht, meldet `weicheStellen` selbst, indem es die Stellung
 *  zuruecknimmt - der Weichenfenster-Waechter faengt den Fall ohnehin
 *  vorher. */
function weichenWahl(s: GameState, bot: Bot): Set<string> {
  const alle = s.weichenPunkte();
  if (!alle.length || bot.weichenStil === 'offen') return new Set();
  // Alles zu, was zugeht - und was nicht zugeht, meldet `weicheStellen`
  // selbst, indem es die Stellung zuruecknimmt.
  return new Set(alle.map((w) => w.id));
}

function play(
  strategy: TowerId[], pick: BranchPick = () => 0,
  bot: Bot = MEISTER, difficulty: DifficultyId = 'normal',
  mapId: string = MAPS[0].id,
  opts: {
    endless?: boolean; perks?: typeof NO_PERKS; seed?: number;
    /** Kleine Abwandlung des Bauverhaltens - siehe VARIANTS. */
    variant?: number;
    /** Ziellogik je Turm, nach Baureihenfolge. Ohne Angabe bleibt es beim
     *  Standard des Spiels. */
    ziel?: (t: Tower, i: number, s: GameState) => Zielwahl;
    /** Wieviele Karten als gewonnen gelten - entscheidet, welche
     *  Faehigkeiten es gibt (C18). Ohne Angabe alle: die Balance ist an
     *  allen vier geeicht, und ein Bot, der sie ploetzlich nicht mehr hat,
     *  wuerde hier eine Verschiebung melden, die kein Spieler erlebt. */
    karten?: number;
  } = {},
): Result {
  const s = new GameState(mapId);
  s.reset(opts.seed ?? AUSSAATEN[0], difficulty, mapId,
    { endless: opts.endless, perks: opts.perks ?? NO_PERKS,
      karten: opts.karten ?? MAPS.length });
  // **Der Stil "lang" stellt VOR dem ersten Turm** (S-N2-06).
  //
  // Das ist keine Feinheit, sondern der Unterschied zwischen einer Weiche und
  // einer Selbstverletzung: `candidateSpots` bewertet jeden Platz danach,
  // wieviel er von den HEUTIGEN Bahnen sieht. Wer erst baut und dann umlegt,
  // hat seine Tuerme an einer Strasse stehen, die es nicht mehr gibt - und
  // gemessen war genau das der erste Lauf: "lang" lag auf allen Karten und in
  // allen Wellen hinten, null Alleinsiege, null geteilte. Das sah aus wie ein
  // schlechter Stil und war ein schlechter Messaufbau (Regel 13).
  //
  // Defense Grid macht es andersherum: erst das Labyrinth, dann die Tuerme.
  // **Gefragt wird dieselbe Funktion wie spaeter je Welle** (Regel 15). Der
  // erste Entwurf schrieb hier `weichenStil === 'lang'` noch einmal hin - und
  // die Gegenprobe hat es sofort gefunden: sie legt `weichenWahl` lahm, und
  // der Stil stellte trotzdem, weil die zweite Stelle unberuehrt blieb. Zwei
  // Stellen, die dasselbe entscheiden, sind eine zu viel.
  const start = weichenWahl(s, bot);
  for (const w of s.weichenPunkte()) s.weicheStellen(w.id, start.has(w.id));
  let spots = buildSpots(s);
  // Die Abwandlung verschiebt Startreihenfolge und Ruecklage leicht. Damit
  // entstehen mehrere Spielverlaeufe, die alle vernuenftig sind - und der
  // Mittelwert misst die Balance statt einer einzelnen Bahn durch das Chaos.
  const variant = opts.variant ?? 0;
  const reserve = bot.reserve + variant * 15;
  let spotIdx = variant % 2, si = variant, t = 0, frame = 0, upgrades = 0;
  let peakEnemies = 0, peakFx = 0;
  // **Die Verluste je Welle kommen aus dem Spiel, nicht aus einer zweiten
  // Zaehlung hier** (S-P4-01, v266).
  //
  // Bis v265 zaehlte dieses Werkzeug selbst mit, ueber `s.waveIndex`. Der
  // bedeutet seit den ueberlappenden Wellen "gestartet" statt "fertig", und
  // die Zaehlung landete eine Welle zu weit: gemessen standen alle 16
  // Verluste in Welle 15, waehrend das Spiel 14 in Welle 14 verbuchte. Zwei
  // Zaehlungen derselben Sache, und eine davon veraltet (Regel 15) - jetzt
  // ist es eine, und sie steht dort, wo der Gegner seine Welle kennt.
  /** **Entscheidungen je Welle** (S-P1-03).
   *
   *  Das Spielspass-Audit rechnete "12 Bauentscheidungen und 24
   *  Ausbauentscheidungen, also 36 - gut zwei je Welle, und die meisten
   *  davon frueh". Die 36 sind zwei Summenfelder des Ergebnisses; WANN sie
   *  fallen, hat niemand gemessen. Damit liess sich nicht sagen, ob eine
   *  Welle ueberhaupt eine Entscheidung enthaelt - und genau das ist G7.
   *
   *  Gezaehlt wird, was der Bot wirklich tut: bauen, ausbauen, eine
   *  Faehigkeit ziehen. **Verkaufen, Versetzen und den Zielmodus umstellen
   *  tut er nicht** - ein Zaehler dafuer stuende auf ewig auf null und saehe
   *  aus wie eine Messung (Regel 5). Was der Bot nicht tut, misst diese
   *  Zeile deshalb auch nicht, und das steht hier statt in einer Fussnote. */
  const entscheidungenJeWelle = new Array(s.waves.length).fill(0);
  /** **Leerlauf** (S-P1-04): Zeit, in der kein Gegner lebt und keiner mehr
   *  aussteht. `wellenRest` sagt beides in einer Zahl - Wartende und
   *  Lebende. Gezaehlt wird VOR `update`, also im Zustand, den ein Spieler
   *  in diesem Bild vor sich haette. */
  let leerlaufBilder = 0;
  /** **Und die Zahl daneben, die der Leerlauf NICHT liefert.**
   *
   *  Gemessen liegt der Leerlauf des Bots bei 0,1 bis 0,2 % - er startet die
   *  naechste Welle in demselben Bild, in dem er es darf. Das ist nicht der
   *  Leerlauf eines Spielers, der die Vorschau liest und selbst drueckt, und
   *  eine Zahl, die auf 0,2 % steht, taugt als Vorher fuer P4 nicht.
   *
   *  Was die Frage von P4 wirklich trifft, ist die DUENNE Zeit: wie lange
   *  steht hoechstens ein Gegner auf dem Feld. Da laeuft nichts zusammen,
   *  da faellt keine Entscheidung, und genau die will die Ueberlappung
   *  fuellen. */
  let duennBilder = 0;
  /** **Knappheit** (S-P2-01): an wievielen Entscheidungszeitpunkten der Bot
   *  den Kauf, den er WOLLTE, nicht bezahlen konnte.
   *
   *  Die Kernzahl von G5 heisst "42,7 % des verdienten Goldes bleiben
   *  liegen" - und das Spielspass-Audit traegt ihre Einschraenkung selbst:
   *  der Bot baut hoechstens zwoelf Tuerme und 24 Ausbauten, er KANN also
   *  gar nicht alles ausgeben. Die Zahl beschreibt zu einem unbekannten
   *  Teil den Deckel des Bots.
   *
   *  Genau diese Klasse hat in v246 einen ganzen Rueckstandspunkt als
   *  Messfehler entlarvt: "auch der beste Spielstil holt nur zwei Sterne"
   *  hiess in Wahrheit "auch der beste der drei bescheidenen Stile".
   *
   *  Die Knappheit haengt nicht daran, wieviel der Bot bauen DARF, sondern
   *  daran, ob Gold der Engpass ist. Gezaehlt wird der VORZUG: was der Bot
   *  in diesem Bild als naechstes getan haette, und ob das Gold dafuer
   *  gereicht hat. */
  let entscheidungsBilder = 0, knappeBilder = 0;
  let lastLives = s.lives;

  while (s.phase === 'playing' && t < 60 * 45) {
    if (frame % bot.decideEvery === 0) {
      // **Erst die Foerderer, dann die Geschuetze** (S-N3-01). Gezaehlt wird,
      // wieviele schon stehen; die Plaetze kommen aus derselben Liste wie
      // fuer die Geschuetze, denn genau darum geht es: es ist DIESELBE
      // Flaeche.
      const stehen = s.gebaute.filter((tw) => tw.def === 'foerderer').length;
      const willFoerdern = stehen < bot.foerderer;
      let id = willFoerdern ? 'foerderer' as TowerId : strategy[si % strategy.length];
      if (s.gold < TOWERS[id].base.cost) {
        const affordable = strategy.filter((c) => s.gold >= TOWERS[c].base.cost + reserve);
        if (affordable.length) id = affordable[0];
      }

      // Gezaehlt werden die GEBAUTEN Tuerme, nicht die Zielunit.
      //
      // Seit v165 steht sie als fuenfter Turm von Anfang an im Feld. Ohne
      // diese Unterscheidung baute der Bot einen Turm weniger und schuettete
      // sein Gold in die teuerste Ausbaulinie des Spiels: die Zielunit steht
      // dort, wo alle Bahnen enden, sammelt deshalb schnell den meisten
      // Schaden - und "bau den aus, der am meisten leistet" fuehrte
      // geradewegs dorthin. Gemessen kostete das Normal/Meister 23 -> 11 von
      // 60, und das war kein Balancebefund, sondern ein Botfehler.
      const welle = Math.min(s.waveIndex, s.waves.length - 1);
      // **Gegen den Baudeckel zaehlen nur die GESCHUETZE** (S-N3-01).
      //
      // `maxTowers` ist die Selbstbeschraenkung des Bots ("bewusst
      // bescheiden", siehe BESTLEISTUNG), nicht eine Regel des Spiels - die
      // Karten halten rund zweihundert Bauplaetze. Der erste Entwurf zaehlte
      // den Foerderer mit, und damit kostete jedes Einkommensgebaeude ein
      // ganzes Geschuetz von zwoelfen: gemessen wurden zwei Karten
      // unspielbar, und alle vier Zweigpaare fielen unter das Rauschen, weil
      // dem Bot das Feuer fehlte, um zwischen zwei Zweigen zu unterscheiden.
      //
      // Bezahlt wird der Foerderer mit GOLD, und das ist der Tausch, um den
      // es geht - genau wie beim Command Tower, der 300 kostet und damit
      // mehrere Ausbauten. Um die Flaeche konkurriert er im Spiel weiterhin;
      // nur der Deckel des Bots ist keine Flaeche.
      const gebaut = s.gebaute.filter((tw) => tw.def !== 'foerderer');
      const wantBuild = gebaut.length < bot.maxTowers * bot.deepenAt &&
        spotIdx < spots.length && s.gold >= TOWERS[id].base.cost + reserve;

      // Was WOLLTE der Bot, und hat das Gold dafuer gereicht?
      //
      // Der Vorzug ist bauen, solange er unter seinem Baudeckel liegt und
      // ein Platz frei ist; sonst ausbauen. Gefragt wird nur nach dem
      // Vorzug - ein Bot, der ausbaut, weil er nicht bauen kann, hat den
      // Kauf, den er wollte, nicht getan.
      entscheidungsBilder++;
      const bauVorzug = gebaut.length < bot.maxTowers * bot.deepenAt && spotIdx < spots.length;
      if (bauVorzug) {
        if (s.gold < TOWERS[id].base.cost + reserve) knappeBilder++;
      } else {
        // Der teuerste Schritt, den er sich gerade NICHT leisten kann,
        // zaehlt nicht - gefragt ist der, den er nehmen wuerde: der Turm mit
        // dem meisten Schaden. Ohne diese Einschraenkung waere fast jedes
        // Bild knapp, weil irgendein Ausbau immer zu teuer ist.
        let vorzug: (typeof s.towers)[number] | null = null;
        for (const tw of gebaut) {
          if (tw.level >= Math.min(bot.maxLevel, MAX_LEVEL)) continue;
          if (!nextFor(TOWERS[tw.def], tw.branch ?? pick(tw.def), tw.level)) continue;
          if (!vorzug || tw.damageDone > vorzug.damageDone) vorzug = tw;
        }
        if (vorzug) {
          const n = nextFor(TOWERS[vorzug.def], vorzug.branch ?? pick(vorzug.def), vorzug.level);
          if (n && s.gold < n.cost + reserve) knappeBilder++;
        }
      }

      if (wantBuild) {
        // **Der Foerderer bekommt NICHT den besten Platz** (S-N3-01).
        //
        // Der erste Entwurf nahm die Liste von vorn, und die ist nach
        // Wegdeckung sortiert: der Bot stellte sein Einkommen genau dorthin,
        // wo die Geschuetze am meisten sehen. Das tut kein Mensch, und
        // gemessen hat es die Zweigwirkung auf allen vier Paaren unter das
        // Rauschen gedrueckt - der Bot hatte danach zu wenig Feuer, um
        // ueberhaupt noch zwischen zwei Zweigen zu unterscheiden.
        //
        // Ein Modell, das schlechter spielt als ein Mensch, misst seinen
        // eigenen Fehler (Regel 4). Der Foerderer nimmt deshalb den ersten
        // Platz HINTER dem Baudeckel: gut genug, um Abschuesse zu sehen,
        // ohne der Verteidigung ihre beste Stellung wegzunehmen.
        const fIdx = bot.maxTowers + stehen;
        const nimm = willFoerdern && fIdx < spots.length ? fIdx : spotIdx;
        const sp = spots[nimm];
        if (s.build(sp.x, sp.y, id)) { stelleZiel(s, opts.ziel); si++; entscheidungenJeWelle[welle]++; }
        if (!willFoerdern || nimm === spotIdx) spotIdx++;
      } else {
        // In die Tiefe: immer in den Turm, der bisher am meisten geleistet hat.
        let best: (typeof s.towers)[number] | null = null;
        for (const tw of gebaut) {
          if (tw.level >= Math.min(bot.maxLevel, MAX_LEVEL)) continue;
          const n = nextFor(TOWERS[tw.def], tw.branch ?? pick(tw.def), tw.level);
          if (!n || s.gold < n.cost + reserve) continue;
          if (!best || tw.damageDone > best.damageDone) best = tw;
        }
        if (best && s.upgrade(best, (best.branch ?? pick(best.def)) as 0 | 1)) {
          upgrades++; entscheidungenJeWelle[welle]++;
        }
        else if (gebaut.length < bot.maxTowers && spotIdx < spots.length &&
          s.gold >= TOWERS[id].base.cost + reserve) {
          const sp = spots[spotIdx];
          if (s.build(sp.x, sp.y, id)) { stelleZiel(s, opts.ziel); si++; entscheidungenJeWelle[welle]++; }
          spotIdx++;
        }
      }
      entscheidungenJeWelle[welle] += useAbilities(s);
    }

    if (s.wellenRest === 0) leerlaufBilder++;
    if (s.enemies.length <= 1) duennBilder++;
    // **Die Bots ueberlappen nicht** (S-P4-01, v266).
    //
    // Seit v266 darf eine zweite Welle starten, waehrend die erste laeuft -
    // `canStartWave` allein heisst also nicht mehr "nichts laeuft". Ein Bot, der
    // bei jeder Gelegenheit startet, faehrt damit dauerhaft zwei Wellen, und das
    // ist die AGGRESSIVSTE Spielweise, nicht die vernuenftige: gemessen verliert
    // die erste Karte damit in Welle 13, und C18 waere rot.
    //
    // Die Ueberlappung ist eine Entscheidung des Spielers. Die Balance ist gegen
    // einen Bot geeicht, der sie nicht trifft; wer sie messen will, misst sie
    // eigens (S-P4-02).
    // **Die Weichen werden zwischen den Wellen gestellt** (S-N2-06) - also
    // genau hier, unmittelbar bevor die naechste losgeht. `weicheStellen`
    // verweigert ohnehin, solange jemand auf dem Feld steht; der Aufruf an
    // einer anderen Stelle waere lautlos wirkungslos gewesen.
    if (s.canStartWave && !s.waveActive) {
      const gestellt = weichenWahl(s, bot);
      let umgelegt = false;
      for (const w of s.weichenPunkte()) {
        if (w.zu !== gestellt.has(w.id)) {
          if (s.weicheStellen(w.id, gestellt.has(w.id))) {
            entscheidungenJeWelle[welleNr(s)]++; umgelegt = true;
          }
        }
      }
      // **Die Bauplaetze folgen der Bahn.** Sie sind danach sortiert, wieviel
      // ein Platz vom Weg sieht - eine Liste, die zur alten Bahn gehoert,
      // stellt die naechsten Tuerme ins Leere.
      if (umgelegt) { spots = buildSpots(s); spotIdx = variant % 2; }
    }
    if (s.canStartWave && !s.waveActive) s.startWave();
    s.update(DT);
    t += DT;
    frame++;
    if (s.lives < lastLives) lastLives = s.lives;
    if (s.enemies.length > peakEnemies) peakEnemies = s.enemies.length;
    const fx = s.particles.length + s.projectiles.length + s.rings.length;
    if (fx > peakFx) peakFx = fx;
  }
  return {
    lives: s.lives, wave: s.waveNumber, won: s.phase === 'won',
    towers: s.gebaute.length, upgrades, peakEnemies, peakFx,
    leakByWave: Array.from({ length: s.waves.length }, (_, i) => s.stats.leaksByWave[i] ?? 0),
    entscheidungenJeWelle,
    dauer: t, leerlaufAnteil: frame > 0 ? leerlaufBilder / frame : 0,
    duennAnteil: frame > 0 ? duennBilder / frame : 0,
    knappheitsAnteil: entscheidungsBilder > 0 ? knappeBilder / entscheidungsBilder : 0,
    raeuber: s.raubTotal, gerettet: s.rettungTotal, geretteteFunken: s.rettungPunkte,
    maxLives: s.maxLives,
    earned: s.stats.goldEarned, spent: s.stats.goldSpent,
  };
}

/** Der Bot nutzt die Faehigkeiten so, wie ein aufmerksamer Spieler es taete:
 *  den Meteor auf die dichteste Traube, den Frostschlag, wenn es eng wird. */
/** Zieht die Faehigkeiten und gibt zurueck, wieviele wirklich gezogen
 *  wurden - `cast` sagt es selbst, geraten wird nichts (Regel 3). */
function useAbilities(s: GameState): number {
  let gezogen = 0;
  if (s.ready('meteor') && s.enemies.length >= 5) {
    const r2 = (ABILITIES.meteor.radius ?? 100) ** 2;
    let best = null, bestN = 0;
    for (const a of s.enemies) {
      let n = 0;
      for (const b of s.enemies) {
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r2) n++;
      }
      if (n > bestN) { bestN = n; best = a; }
    }
    if (best && bestN >= 4) { if (s.cast('meteor', best.x, best.y)) gezogen++; }
  }
  if (s.ready('freeze')) {
    const near = s.enemies.filter((e) => e.travelled > s.pathTotal * 0.75).length;
    if (near >= 4) { if (s.cast('freeze', 0, 0)) gezogen++; }
  }

  // Bollwerk: auf die dichteste Traube, aber nur wenn sie schon WEIT ist.
  //
  // Es macht keinen Schaden, es kauft Zeit - und Zeit ist nur dort etwas
  // wert, wo sonst gleich etwas durchkommt. Frueh gezogen verpufft es.
  if (s.ready('bollwerk')) {
    const r2 = (ABILITIES.bollwerk.radius ?? 150) ** 2;
    const spaet = s.enemies.filter((e) => e.travelled > s.pathTotal * 0.6);
    let best = null, bestN = 0;
    for (const a of spaet) {
      let n = 0;
      for (const b of spaet) {
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r2) n++;
      }
      if (n > bestN) { bestN = n; best = a; }
    }
    if (best && bestN >= 3) { if (s.cast('bollwerk', best.x, best.y)) gezogen++; }
  }

  // Ernte: wenn das Gold fuer den naechsten Schritt nicht reicht.
  //
  // Nicht "sobald bereit". Ein Spieler zieht sie, wenn ihm etwas fehlt -
  // und ein Bot, der sie sofort zieht, misst eine Faehigkeit, die niemand so
  // benutzt. Die Schwelle ist der teuerste Turm: darunter ist man
  // handlungsunfaehig.
  if (s.ready('ernte')) {
    const teuerster = Math.max(...TOWER_ORDER.map((id) => TOWERS[id].base.cost));
    if (s.gold < teuerster && s.cast('ernte', 0, 0)) gezogen++;
  }
  return gezogen;
}

const strategies: Record<string, TowerId[]> = {
  'nur Bogen': ['arrow'],
  'nur Frost': ['frost'],
  'nur Moerser': ['mortar'],
  'nur Prisma': ['prism'],
  'moerserlastig': ['mortar', 'mortar', 'arrow'],
  'gemischt': ['arrow', 'arrow', 'mortar', 'frost', 'prism'],
};

// --------------------------------------- Was ist eine Faehigkeit wert (C18)?
//
// S4 des Abgleichs (`docs/Towerfront-ABGLEICH-FAEHIGKEITEN.md`) verlangt,
// dass die ERSTE Karte ohne die drei gesperrten vollstaendig ist. Das ist
// keine Meinung, sondern diese Messung: derselbe Bot, dieselbe Aussaat,
// dieselben Tuerme - nur die Zahl gewonnener Karten steigt.
//
// Und sie ist zugleich die Gegenprobe nach Regel 13: faellt die Zahl mit
// weniger Faehigkeiten NICHT, dann misst hier nichts eine Faehigkeit.
if (NUR_MESSEN) {
  console.log('\nFaehigkeiten nach Fortschritt (C18) - Mittel ueber zwoelf Laeufe\n');
  const plan: TowerId[] = ['arrow', 'arrow', 'mortar', 'frost', 'prism'];
  // **Ein einzelner Lauf misst hier nichts.** Der erste Anlauf lief mit
  // einer Aussaat und einem Bot und kam auf 15, 12, 20, 21 - nicht einmal
  // steigend. Zwoelf Laeufe je Feld (drei Stile x vier Abwandlungen)
  // trennen die Wirkung vom Rauschen.
  console.log('  Karte             1 Faehigk.  2           3           4          Siege');
  for (const m of MAPS) {
    const zeile: string[] = [];
    const siege: string[] = [];
    for (let k = 0; k <= MAPS.length; k++) {
      let summe = 0, n = 0, gewonnen = 0;
      for (const b of BOTS) {
        for (let v = 0; v < 4; v++) {
          const r = play(plan, () => 0, b, 'normal', m.id, { karten: k, variant: v });
          summe += r.won ? r.lives : 0;
          if (r.won) gewonnen++;
          n++;
        }
      }
      zeile.push(`${(summe / n).toFixed(1)}`.padEnd(12));
      siege.push(`${gewonnen}/${n}`);
    }
    console.log(`  ${m.name.padEnd(15)} ${zeile.join('')}${siege.join(' ')}`);
  }
  console.log('\n  Spalten: wieviele Faehigkeiten verfuegbar waren (1 bis 4).');
  console.log('  Zahl: mittlerer uebriger Kristall ueber zwoelf Laeufe, eine Niederlage');
  console.log('  zaehlt als null - so schlaegt "kommt gar nicht durch" auch durch.');
  console.log('  Messstelle: tools/sim.ts, drei Bot-Stile x vier Abwandlungen, Plan '
    + `[${plan.join(', ')}], Grad "normal", keine Verbesserungen.`);
  process.exit(0);
}

const errors: string[] = [];
const results = new Map<string, Result>();

for (const [name, plan] of Object.entries(strategies)) {
  const r = play(plan);
  results.set(name, r);
  const verdict = r.won ? `gewonnen, Kristall ${r.lives}/${START_LIVES}` : `verloren in Welle ${r.wave}`;
  console.log(`${name.padEnd(13)} -> ${verdict.padEnd(28)} ${r.towers} Tuerme, ${r.upgrades} Ausbauten, ${r.earned} Gold verdient, ${r.earned - r.spent} uebrig`);
}

const mixed = results.get('gemischt')!;
const mixedPlanBase: TowerId[] = ['arrow', 'arrow', 'mortar', 'frost', 'prism'];

// Mehrere Spielstile: die Kurve muss fuer mehr als einen Blickwinkel stimmen.
console.log('\nSpielstile (gemischtes Feld):');
const styleRuns = new Map<string, Result>();
for (const bot of BOTS) {
  const r = play(mixedPlanBase, () => 0, bot);
  styleRuns.set(bot.name, r);
  const verdict = r.won ? `gewonnen, Kristall ${r.lives}/${START_LIVES}` : `verloren in Welle ${r.wave}`;
  console.log(
    `  ${bot.name.padEnd(9)} ${verdict.padEnd(30)}` +
    `${r.towers} Tuerme, ${r.upgrades} Ausbauten, ${r.earned} Gold`,
  );
}

// Verteilung der Verluste.
//
// Das eigentliche Ziel von T15: der Kristall darf nicht an einer einzigen
// Welle haengen. Solange alle Verluste in der letzten Welle liegen, ist jeder
// Lauf entweder makellos oder gescheitert - und jede Aenderung am Sortiment
// kippt genau diese eine Entscheidung, statt sie zu verschieben.
{
  // **Ueber die Aussaaten, nicht ueber einen Lauf** (v253). Bis v252 stand
  // hier ein einziges `play(mixedPlanBase)`, und aus dieser einen Partie kam
  // die Zahl, an der "die Verluste haengen an einer Welle" gemessen wurde.
  // Sie schwankt gemessen zwischen zwei und vier Stellen, je nach Aussaat -
  // als Ratsche waere sie damit ein Wuerfel gewesen.
  const o = ueberAussaaten((aussaat) => play(
    mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { seed: aussaat },
  ));
  const r = o.runs[0];
  const hot = r.leakByWave
    .map((v, i) => ({ w: i + 1, v }))
    .filter((o2) => o2.v > 0);
  const last = MAPS[0].waves.length;
  const share = hot.length ? (r.leakByWave[last - 1] ?? 0) / hot.reduce((a, o2) => a + o2.v, 0) : 0;
  const stellen = mittelUndSpanne(o.runs.map(
    (x) => x.leakByWave.filter((v) => v > 0).length,
  ));
  const ruhe = mittelUndSpanne(o.runs.map((x) => laengsteRuhe(x.leakByWave)));
  spannungGemessen('stellen', stellen.mittel, stellen.spanne,
    `Wellen mit Verlust, gemischtes Feld, Meister, ${MAPS[0].id}, normal, `
    + `${AUSSAATEN.length} Aussaaten`);
  spannungGemessen('ruhe', ruhe.mittel, ruhe.spanne,
    `laengste Strecke Wellen ohne Verlust, gleiche Messstelle wie "stellen"`);
  console.log(
    `\nVerteilung der Verluste: ${hot.length ? hot.map((o2) => `W${o2.w}:${o2.v}`).join('  ') : 'keine'}` +
    `   davon in der letzten Welle ${Math.round(share * 100)} %`,
  );
  // --- Entscheidungen je Welle (S-P1-03).
  //
  // Ueber Aussaat UND Abwandlung, weil eine Entscheidung genau davon
  // abhaengt: wann Gold ankommt, entscheidet, ob in Welle 7 gebaut wird
  // oder in Welle 8. Ein einzelner Verlauf zaehlt hier einen Zufall.
  {
    const o2 = overVariants((variant, aussaat) => play(
      mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { variant, seed: aussaat },
    ));
    const wellen = MAPS[0].waves.length;
    const jeWelle = Array.from({ length: wellen }, (_, i) =>
      o2.runs.reduce((a, r2) => a + (r2.entscheidungenJeWelle[i] ?? 0), 0) / o2.runs.length);
    const summe = jeWelle.reduce((a, b) => a + b, 0);
    const haelfte = jeWelle.slice(0, Math.ceil(wellen / 2)).reduce((a, b) => a + b, 0);
    // Leer ist eine Welle, in der im MITTEL weniger als eine halbe
    // Entscheidung faellt - nicht "genau null". Bei neun Laeufen ist eine
    // einzige Entscheidung in einem davon 0,11, und das ist keine Welle,
    // in der man etwas zu tun hat.
    const leereJeLauf = o2.runs.map((r2) =>
      r2.entscheidungenJeWelle.slice(0, wellen).filter((v) => v === 0).length);
    const leer = mittelUndSpanne(leereJeLauf);
    console.log(
      `\nEntscheidungen je Welle (gezaehlt am Bot, ${AUSSAATEN.length} Aussaaten x `
      + `${VARIANTS.length} Abwandlungen, gemischtes Feld, ${MAPS[0].id}, normal):`);
    console.log('  ' + jeWelle.map((v, i) => `W${i + 1}:${v.toFixed(1)}`).join('  '));
    console.log(
      `  Summe ${summe.toFixed(1)}   Wellen ohne jede Entscheidung `
      + `${leer.mittel.toFixed(1)} von ${wellen} (Rauschen ${leer.spanne.toFixed(1)})`
      + `   in der ersten Haelfte ${summe > 0 ? Math.round((haelfte / summe) * 100) : 0} %`);
    spannungGemessen('leereWellen', leer.mittel, leer.spanne,
      `Wellen ohne eine einzige Entscheidung des Bots, gemischtes Feld, Meister, `
      + `${MAPS[0].id}, normal, ${AUSSAATEN.length} Aussaaten x ${VARIANTS.length} Abwandlungen`);
  }
  console.log(
    `  ueber ${AUSSAATEN.length} Aussaaten: ${stellen.mittel.toFixed(1)} Stelle(n) `
    + `(Rauschen ${stellen.spanne.toFixed(1)}), laengste folgenlose Strecke `
    + `${ruhe.mittel.toFixed(1)} Wellen (Rauschen ${ruhe.spanne.toFixed(1)})`,
  );
  // Bewusst ein Hinweis und kein Abbruch: das ist der bekannte offene Punkt
  // T15, kein Rueckschritt. Er steht in jedem Lauf sichtbar da, bis er
  // erledigt ist.
  if (r.won && (hot.length < 3 || share > 0.6)) {
    console.log(
      `  OFFEN (T15): Verluste liegen an ${hot.length} Stelle(n), ` +
      `${Math.round(share * 100)} % davon in der letzten Welle.`,
    );
  }
}

// Abstand zwischen den Spielstilen.
//
// Der Kern von T15 liegt tiefer als die Kurvenform: die drei Stile sind zu
// unterschiedlich stark. Zieht man die Kurve so an, dass die Verluste sich
// verteilen, verlieren die schwaecheren Stile sofort ganz. Solange der Abstand
// so gross ist, gibt es kein Fenster, in dem beides zugleich gilt.
{
  const runs = BOTS.map((b) => {
    const o = overVariants((variant, aussaat) => play(
      mixedPlanBase, () => 0, b, 'normal', MAPS[0].id, { variant, seed: aussaat },
    ));
    const avg = (f: (r: Result) => number) => o.runs.reduce((a, r) => a + f(r), 0) / o.runs.length;
    return {
      name: b.name, mean: o.mean, rauschen: o.spanne,
      towers: avg((r) => r.towers), ups: avg((r) => r.upgrades),
      earned: avg((r) => r.earned), left: avg((r) => r.earned - r.spent),
    };
  });
  for (const r of runs) {
    console.log(
      `  ${r.name.padEnd(9)} ${r.mean.toFixed(0).padStart(4)} Punkte   ` +
      `${r.towers.toFixed(0).padStart(2)} Tuerme, ${r.ups.toFixed(0).padStart(2)} Ausbauten, ` +
      `${r.earned.toFixed(0).padStart(5)} Gold verdient, ${r.left.toFixed(0)} uebrig`,
    );
  }
  const best = Math.max(...runs.map((r) => r.mean));
  const worst = Math.min(...runs.map((r) => r.mean));
  // **Der Abstand steht seit v251 neben seiner Rauschgrenze** (G4).
  //
  // Er ist die Zahl, an der "die Stile liegen zu nah beieinander" gemessen
  // wird - und gemessen schwankt er selbst zwischen 6 und 10, je nachdem,
  // mit welcher Aussaat man rechnet. Eine Zahl ohne ihre Streuung daneben
  // laedt dazu ein, den naechsten Zufall fuer eine Verbesserung zu halten.
  const stilRauschen = Math.max(...runs.map((r) => r.rauschen));
  const stilAbstand = best - worst;
  spannungGemessen('stilAbstand', stilAbstand, stilRauschen,
    `bester minus schlechtester Stil, ${MAPS[0].id}, normal, `
    + `${AUSSAATEN.length} Aussaaten x ${VARIANTS.length} Abwandlungen`);
  // **Gold uebrig am Ende** - die Zahl hinter "es fehlt an nichts". Wer am
  // Ende 43 % seines Goldes nicht ausgegeben hat, hatte keine Entscheidung
  // zu treffen, sondern nur eine Reihenfolge. Gemessen ueber alle drei
  // Stile, weil ein einzelner sparsamer Bot nichts ueber die Karte sagt.
  const uebrigJeStil = runs.map((r) => (r.earned > 0 ? (r.left / r.earned) * 100 : 0));
  const gold = mittelUndSpanne(uebrigJeStil);
  spannungGemessen('goldUebrig', gold.mittel, Math.max(...runs.map((r) => r.rauschen)),
    `(verdient - ausgegeben) / verdient, Mittel ueber die ${runs.length} Stile, `
    + `${MAPS[0].id}, normal`);
  console.log(`  Gold uebrig am Ende: ${gold.mittel.toFixed(1)} % `
    + `(je Stil ${uebrigJeStil.map((v) => v.toFixed(0)).join(' / ')} %)`);

  // **Die ungedeckelte Zahl daneben** (S-P2-01). Der Bestleistungs-Bot darf
  // 24 Tuerme auf Stufe 6 bauen; bleibt auch bei ihm Gold liegen, ist es
  // nicht sein Deckel, sondern das Spiel.
  {
    const o = overVariants((variant, aussaat) => play(
      mixedPlanBase, () => 0, BESTLEISTUNG, 'normal', MAPS[0].id, { variant, seed: aussaat },
    ));
    const u = mittelUndSpanne(o.runs.map(
      (r) => (r.earned > 0 ? ((r.earned - r.spent) / r.earned) * 100 : 0)));
    console.log(`  dieselbe Zahl ohne Deckel (Bestleistung, 24 Tuerme, Stufe `
      + `${MAX_LEVEL}): ${u.mittel.toFixed(1)} % (Spanne ${u.spanne.toFixed(1)})`);
  }

  // --- Rettungen (S-P3-04).
  //
  // **Das Band ist 33 bis 67 %, und beide Raender haben einen Grund.** Unter
  // einem Drittel ist die Mechanik Dekoration - der Raeuber laeuft davon,
  // und man sieht nur zu. Ueber zwei Dritteln ist ein Leck folgenlos, und
  // dann waere G1 von der anderen Seite kaputt: es koennte nichts mehr
  // passieren, weil alles zurueckkommt.
  {
    const o = overVariants((variant, aussaat) => play(
      mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { variant, seed: aussaat },
    ));
    // **Erst ueber die Abwandlungen mitteln, dann die Spanne ueber die
    // Aussaaten nehmen** - so definiert diese Datei ihre Rauschgrenze seit
    // v251 (`overVariants`). Die Spanne ueber alle neun Laeufe enthielte die
    // Streuung der Bauverlaeufe, und die ist gewollt, nicht Rauschen: roh
    // gerechnet meldete diese Zahl eine Spanne von 41 bei einem Band von 34.
    const anteile = AUSSAATEN.map((_aussaat, i) => {
      const je = o.runs.slice(i * VARIANTS.length, (i + 1) * VARIANTS.length)
        .filter((r) => r.raeuber > 0)
        .map((r) => (r.gerettet / r.raeuber) * 100);
      return je.length ? je.reduce((x, y) => x + y, 0) / je.length : null;
    }).filter((v): v is number => v !== null);
    const raeuber = o.runs.reduce((a, r) => a + r.raeuber, 0) / o.runs.length;
    const punkte = o.runs.reduce((a, r) => a + r.geretteteFunken, 0) / o.runs.length;
    if (!anteile.length) {
      console.log('\nRettungen: in keinem Lauf kam ein Gegner durch - nichts zu retten.');
    } else {
      const a = mittelUndSpanne(anteile);
      console.log(
        `\nRettungen: ${a.mittel.toFixed(0)} % der Raeuber werden erwischt `
        + `(Spanne ${a.spanne.toFixed(0)}), ${raeuber.toFixed(1)} Raeuber je Partie, `
        + `${punkte.toFixed(1)} Kristall zurueckgeholt`,
      );
      spannungGemessen('rettungen', a.mittel, a.spanne,
        `Anteil der Raeuber, die vor ihrem Tor sterben, Meister, ${MAPS[0].id}, normal, `
        + `${AUSSAATEN.length} Aussaaten x ${VARIANTS.length} Abwandlungen`);
      if (a.mittel < 33) {
        errors.push(`Rettungen: nur ${a.mittel.toFixed(0)} % der Raeuber werden erwischt `
          + '(mindestens 33 %). Unter einem Drittel ist der Kernraub Dekoration - der '
          + 'Raeuber laeuft davon, und man sieht nur zu.');
      }
      if (a.mittel > 67) {
        errors.push(`Rettungen: ${a.mittel.toFixed(0)} % der Raeuber werden erwischt `
          + '(hoechstens 67 %). Ueber zwei Dritteln ist ein Leck folgenlos, und dann ist '
          + 'G1 von der anderen Seite kaputt.');
      }
    }
  }

  // --- Der Knappheitsanteil.
  const knappJeStil = BOTS.map((b) => {
    const o = overVariants((variant, aussaat) => play(
      mixedPlanBase, () => 0, b, 'normal', MAPS[0].id, { variant, seed: aussaat },
    ));
    return { name: b.name, ...mittelUndSpanne(o.runs.map((r) => r.knappheitsAnteil * 100)) };
  });
  console.log(`\nKnappheit - Anteil der Entscheidungszeitpunkte ohne Geld fuer den `
    + `gewollten Kauf\n  (${MAPS[0].id}, normal, ${AUSSAATEN.length} Aussaaten x `
    + `${VARIANTS.length} Abwandlungen):`);
  for (const k of knappJeStil) {
    console.log(`  ${k.name.padEnd(11)} ${k.mittel.toFixed(1).padStart(5)} % `
      + `(Spanne ${k.spanne.toFixed(1)})`);
  }
  {
    const jeKarte = MAPS.map((m) => {
      const o = overVariants((variant, aussaat) => play(
        mixedPlanBase, () => 0, MEISTER, 'normal', m.id, { variant, seed: aussaat },
      ));
      return { name: m.name, ...mittelUndSpanne(o.runs.map((r) => r.knappheitsAnteil * 100)) };
    });
    for (const k of jeKarte) {
      console.log(`  ${k.name.padEnd(15)} ${k.mittel.toFixed(1).padStart(5)} % `
        + `(Meister, Spanne ${k.spanne.toFixed(1)})`);
    }
    const meister = knappJeStil.find((k) => k.name === MEISTER.name)!;
    spannungGemessen('knappheitsAnteil', meister.mittel, meister.spanne,
      `Anteil der Entscheidungszeitpunkte, an denen das Gold fuer den gewollten `
      + `Kauf nicht reichte, Meister, ${MAPS[0].id}, normal, ${AUSSAATEN.length} `
      + `Aussaaten x ${VARIANTS.length} Abwandlungen`);
  }
  console.log(
    `\nAbstand der Spielstile: ` + runs.map((r) => `${r.name} ${r.mean.toFixed(0)}`).join('   ') +
    `   Spanne ${stilAbstand.toFixed(0)}` +
    `   (Rauschen ueber ${AUSSAATEN.length} Aussaaten: ${stilRauschen.toFixed(1)})`,
  );
  if (stilAbstand < stilRauschen) {
    console.log('  UNBELEGT: der Abstand der Stile ist kleiner als die Streuung des '
      + 'Verfahrens - er misst heute die Aussaat, nicht die Spielstile (G4).');
  }
  if (best - worst > 18) {
    console.log(
      '  OFFEN (T16): die Stile liegen zu weit auseinander - deshalb laesst sich ' +
      'die Kurve nicht anziehen, ohne die schwaecheren ganz zu verlieren.',
    );
  }
}

// Robustheitsprobe.
//
// Dasselbe Feld mit 10 % mehr und 10 % weniger Schaden - und jeweils ueber
// drei Abwandlungen des Bauverhaltens gemittelt.
//
// Warum gemittelt: an einem einzelnen Verlauf fuehrte *mehr* Schaden zu einem
// schlechteren Ergebnis. Das ist kein Widerspruch, sondern Pfadabhaengigkeit -
// frueher ankommendes Gold aendert die Baureihenfolge und damit alles
// Weitere. Eine Zahl, die so springt, taugt nicht zum Justieren.
{
  const shifted = (mul: number) => overVariants((variant, aussaat) => play(
    mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id,
    { perks: { ...NO_PERKS, damageMul: mul }, variant, seed: aussaat },
  ));
  const low = shifted(0.9), mid = shifted(1), high = shifted(1.1);
  const span = Math.max(low.mean, mid.mean, high.mean) - Math.min(low.mean, mid.mean, high.mean);
  const spread = (r: { runs: Result[] }) => {
    const sc = r.runs.map(score);
    return Math.max(...sc) - Math.min(...sc);
  };
  console.log(
    `\nRobustheit (Schaden -10 / normal / +10 %, je 3 Abwandlungen gemittelt): ` +
    `${low.mean.toFixed(1)}  ${mid.mean.toFixed(1)}  ${high.mean.toFixed(1)}   Spanne ${span.toFixed(1)}`,
  );
  console.log(
    `  Streuung zwischen den Abwandlungen bei gleichem Schaden: ` +
    `${spread(low).toFixed(0)} / ${spread(mid).toFixed(0)} / ${spread(high).toFixed(0)}`,
  );
  if (span > 22) {
    errors.push(
      `Zehn Prozent Schaden bewegen das Ergebnis um ${span.toFixed(0)} Punkte - ` +
      'die Balance haengt an zu wenigen Stellen.',
    );
  }
  if (spread(mid) > 32) {
    errors.push(
      `Drei vernuenftige Bauverlaeufe liegen ${spread(mid).toFixed(0)} Punkte auseinander - ` +
      'dann misst jede einzelne Messung vor allem den Zufall der Reihenfolge.',
    );
  }
}

// Dauerhafte Verbesserungen duerfen helfen, aber nicht den Grad ersetzen.
{
  // Ueber die Abwandlungen gemittelt: ein einzelner Lauf haengt an der
  // Baureihenfolge, und die aendert sich mit dem Startgold.
  const plainMean = overVariants((variant, aussaat) =>
    play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { variant, seed: aussaat })).mean;
  const buffedMean = overVariants((variant, aussaat) =>
    play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id,
      { perks: ALL_PERKS, variant, seed: aussaat })).mean;
  const plain = play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id);
  const buffed = play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { perks: ALL_PERKS });
  const hardBuffed = play(
    mixedPlanBase, () => 0, MEISTER, 'erbarmungslos', MAPS[0].id, { perks: ALL_PERKS },
  );
  console.log('\nFortschritt (Meister, Spiralhain):');
  console.log(
    `  ohne Verbesserungen ${plain.won ? `${plain.lives}/${plain.maxLives}` : `W${plain.wave}`}` +
    `   mit allen ${buffed.won ? `${buffed.lives}/${buffed.maxLives}` : `W${buffed.wave}`}` +
    `   erbarmungslos mit allen ` +
    `${hardBuffed.won ? `${hardBuffed.lives}/${hardBuffed.maxLives}` : `W${hardBuffed.wave}`}`,
  );
  // Verglichen wird die normierte Punktzahl, nicht der absolute Kristall.
  //
  // Die Verbesserung "Harter Kern" erhoeht den Kristall selbst - danach sind
  // 41 von 69 mehr wert als 50 von 60, obwohl die Zahl kleiner aussieht.
  // Dieselbe Falle wie bei allen absoluten Grenzen in dieser Datei.
  if (buffedMean < plainMean - 4) {
    errors.push(
      `Die dauerhaften Verbesserungen machen den Lauf schlechter statt besser ` +
      `(${buffedMean.toFixed(0)} statt ${plainMean.toFixed(0)} Punkte im Mittel).`,
    );
  }
  if (hardBuffed.won && hardBuffed.lives >= hardBuffed.maxLives) {
    errors.push('Mit allen Verbesserungen ist Erbarmungslos verlustfrei - der Fortschritt ersetzt den Grad.');
  }
  // Sterne muessen ueberhaupt vergeben werden koennen und drei muessen schwer sein.
  if (starsFor(true, plain.maxLives, plain.maxLives) !== 3) errors.push('Ein makelloser Lauf gibt keine drei Sterne.');
  if (starsFor(false, 0, 20) !== 0) errors.push('Eine Niederlage gibt Sterne.');
  // Die frueher hier stehende Pruefung "der uebliche Sieg darf keine drei
  // Sterne geben" ist entfallen: sie sah nur einen einzigen Lauf auf einer
  // einzigen Karte und widersprach der spaeteren Pruefung, die verlangt, dass
  // drei Sterne irgendwo erreichbar sind. Zwei Regeln fuer dieselbe Sache,
  // aus verschiedenen Blickwinkeln - das geht nicht gut. Geblieben ist die
  // Karten-Pruefung: erreichbar, aber nicht ueberall.
}

// Der Endlosmodus muss enden - aber nicht zu frueh.
{
  const e = play(mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id, { endless: true });
  console.log(`  Endlos: bis Welle ${e.wave}, ${e.towers} Tuerme`);
  if (e.won) errors.push('Der Endlosmodus wurde gewonnen - er darf kein Ende haben.');
  if (e.wave <= MAPS[0].waves.length) {
    errors.push(`Endlos endet in Welle ${e.wave} - vor dem Ende des normalen Plans.`);
  }
  if (e.wave > MAPS[0].waves.length + 25) {
    errors.push(`Endlos laeuft bis Welle ${e.wave} - die Steigerung ist zu flach.`);
  }
}

// Jede Karte muss fuer sich spielbar sein. Eine Karte, die nur mit einem
// einzigen Stil zu schaffen ist, ist keine zweite Karte, sondern eine Huerde.
console.log('\nKarten (Normal, alle Stile):');
const mapRuns = new Map<string, Result>();
for (const m of MAPS) {
  const line: string[] = [];
  for (const bot of [...BOTS, BESTLEISTUNG]) {
    const r = play(mixedPlanBase, () => 0, bot, 'normal', m.id);
    mapRuns.set(`${m.id}:${bot.name}`, r);
    line.push(`${bot.name} ${r.won ? `${r.lives}/${r.maxLives}` : `W${r.wave}`}`);
  }
  console.log(`  ${m.name.padEnd(15)} ${line.join('   ')}`);
}

// --- Dauer und Leerlauf je Karte (S-P1-04).
//
// **Ohne diese zwei Zahlen hat P4 kein Vorher.** Der reine Gegnerausstoss
// aller fuenfzehn Wellen des Spiralhains betraegt 201 Sekunden; wie lange
// eine Partie WIRKLICH dauert und wieviel davon Warten ist, stand nirgends -
// `stats.duration` wurde mitgefuehrt und nie ausgewiesen.
//
// Leerlauf heisst: kein Gegner lebt, und keiner steht mehr aus. Das ist
// nicht dasselbe wie "zwischen zwei Wellen": solange der Bot die naechste
// Welle sofort startet, ist die Pause kurz - aber am ENDE einer Welle laeuft
// oft nur noch ein einzelner Nachzuegler, und diese Zeit zaehlt hier zu
// Recht nicht als Leerlauf, obwohl sie sich so anfuehlt.
console.log(`\nDauer und Leerlauf je Karte (Meister, normal, ${AUSSAATEN.length} Aussaaten `
  + `x ${VARIANTS.length} Abwandlungen):`);
console.log('  Der Leerlauf misst den BOT, und der startet jede Welle in demselben Bild, in dem\n'
  + '  er es darf - gemessen 0,1 bis 0,2 %. Was ein Spieler als Warten erlebt, steht daneben\n'
  + '  als "duenn": hoechstens ein Gegner auf dem Feld.');
for (const m of MAPS) {
  const o = overVariants((variant, aussaat) => play(
    mixedPlanBase, () => 0, MEISTER, 'normal', m.id, { variant, seed: aussaat },
  ));
  const d = mittelUndSpanne(o.runs.map((r) => r.dauer));
  const l = mittelUndSpanne(o.runs.map((r) => r.leerlaufAnteil * 100));
  const du = mittelUndSpanne(o.runs.map((r) => r.duennAnteil * 100));
  console.log(
    `  ${m.name.padEnd(15)} Dauer ${d.mittel.toFixed(0).padStart(4)} s `
    + `(Spanne ${d.spanne.toFixed(0)})   Leerlauf ${l.mittel.toFixed(1).padStart(5)} % `
    + `(Spanne ${l.spanne.toFixed(1)})   duenn ${du.mittel.toFixed(1).padStart(5)} % `
    + `(Spanne ${du.spanne.toFixed(1)})`,
  );
  if (m.id === MAPS[0].id) {
    spannungGemessen('duennAnteil', du.mittel, du.spanne,
      `Anteil der Spielzeit mit hoechstens EINEM Gegner auf dem Feld, Meister, `
      + `${m.id}, normal, ${AUSSAATEN.length} Aussaaten x ${VARIANTS.length} Abwandlungen`);
    spannungGemessen('leerlaufAnteil', l.mittel, l.spanne,
      `Anteil der Spielzeit ohne lebenden und ohne ausstehenden Gegner, Meister, `
      + `${m.id}, normal, ${AUSSAATEN.length} Aussaaten x ${VARIANTS.length} Abwandlungen`);
  }
}

// Jeder Schwierigkeitsgrad bekommt eine eigene Pruefung. Ein Grad, den kein
// Spielstil schafft, ist kein Grad, sondern ein Fehler - und einer, der jeden
// Stil muehelos durchlaesst, ebenso.
console.log('\nSchwierigkeitsgrade (gemischtes Feld, alle Stile):');
const diffRuns = new Map<string, Result>();
for (const id of DIFFICULTY_ORDER) {
  const line: string[] = [];
  for (const bot of BOTS) {
    const r = play(mixedPlanBase, () => 0, bot, id);
    diffRuns.set(`${id}:${bot.name}`, r);
    line.push(`${bot.name} ${r.won ? `${r.lives}/${r.maxLives}` : `W${r.wave}`}`);
  }
  console.log(`  ${DIFFICULTIES[id].name.padEnd(15)} ${line.join('   ')}`);
}

// **Kein Grad darf fuer alle Spielstile verlustfrei enden** (S-P2-05).
//
// Gemessen endete "Ruhig" fuer alle drei Stile mit dem vollen Kristall -
// nicht ein Punkt ging verloren. Das ist derselbe Defekt wie G1, eine Ebene
// tiefer: ein Grad, auf dem nichts passieren KANN, ist kein Grad, sondern
// ein Abspielmodus. Kein Tor hat etwas gesagt; die Pruefungen verlangten
// nur, dass nicht zu viele Stile scheitern.
//
// Sanft heisst nicht folgenlos. Verlangt wird ein einziger Punkt bei einem
// einzigen Stil - wer auf "Ruhig" gut spielt, darf weiter makellos
// durchkommen.
for (const id of DIFFICULTY_ORDER) {
  const laeufe = BOTS.map((b) => diffRuns.get(`${id}:${b.name}`)!);
  const verlustfrei = laeufe.every((r) => r.won && r.lives >= r.maxLives);
  if (verlustfrei) {
    errors.push(`Grad "${DIFFICULTIES[id].name}": alle ${BOTS.length} Spielstile enden `
      + 'verlustfrei mit dem vollen Kristall. Ein Grad, auf dem nichts passieren kann, '
      + 'ist kein Grad, sondern ein Abspielmodus.');
  }
}

// Kein toter Zweig.
//
// Die naheliegende Pruefung - einmal alles auf Zweig A, einmal alles auf
// Zweig B - ist zu grob: kein Mensch schickt sein ganzes Feld in dieselbe
// Richtung, und ein einzelner schwacher Zweig verschwindet in der Summe oder
// reisst umgekehrt das ganze Feld mit.
//
// Geprueft wird deshalb einzeln: ein gemischtes Feld, in dem genau ein
// Turmtyp in den einen oder den anderen Zweig geht, alle anderen bleiben auf
// Zweig A. So faellt auf, welcher Zweig genau nicht traegt.
const mixedPlan = mixedPlanBase;
// Ziellogik: fuenf Modi, und der fuenfte muss etwas KOENNEN (TF-032).
//
// Ein Modus, der nirgends besser ist als der Standard, ist eine Wahl ohne
// Folgen - genau das, was der Waechter bei toten Ausbauzweigen verhindert.
// Der Rauchtest prueft, dass "hinten" ANDERE Gegner anvisiert; hier wird
// geprueft, dass es dabei etwas nuetzt.
//
// Und zwar NICHT als reine Einstellung. Alle Tuerme auf "hinten" laesst die
// Vordersten durch und ist ueberall schlechter (gemessen 73 gegen 84). Der
// Sinn ist die Arbeitsteilung nach STANDORT: wer weit vom Kristall steht,
// sieht jeden Gegner zuerst - er soll den Zulauf halten und hat die laengste
// Zeit am selben Ziel. Wer nah am Kristall steht, muss den Vordersten nehmen,
// sonst ist er zu spaet.
//
// Gemessen: 88 mit dieser Aufteilung, 84 mit dem besten reinen Modus - und
// 68, wenn man sie umdreht. Die zwanzig Punkte zwischen "fern" und "nah"
// sind der Beleg, dass hier eine Entscheidung liegt und kein Rauschen.
{
  console.log('\nZiellogik (gemischtes Feld, alle Tuerme umgestellt):');
  const messe = (f?: (t: Tower, i: number, s: GameState) => Zielwahl): number =>
    overVariants((variant, aussaat) => play(mixedPlanBase, () => 0, MEISTER, 'normal',
      MAPS[0].id, { variant, seed: aussaat, ziel: f })).mean;
  const rein: Record<string, number> = {};
  for (const z of ZIELWAHL_ORDNUNG) rein[z] = messe(() => z);
  console.log('  rein (Spiralhain): ' + ZIELWAHL_ORDNUNG.map((z) => `${z} ${rein[z].toFixed(0)}`).join('  '));

  // **Und jetzt die Frage, die der Modus wirklich stellt.**
  //
  // Bis v218 stand hier: "der Modus `hinten` muss, nach Standort verteilt,
  // jeden reinen Modus schlagen". Zwei Fehler in einem Satz.
  //
  // Der erste war ein Einheitenfehler - eine Luftlinie gegen eine Weglaenge,
  // siehe oben. Der zweite ist grundsaetzlicher: die Frage wurde ueber den
  // GANZEN Lauf und auf EINER Karte gestellt. So misst man, welcher Modus im
  // Mittel am wenigsten falsch ist, und das ist auf allen drei Karten
  // derselbe:
  //
  //     Spiralhain     vorn 94  schwach 90  nah 81  hinten 78  stark 74
  //     Ascheschlucht  vorn 69  schwach 65  nah 64  hinten 59  stark 56
  //     Frostspalte    vorn 84  nah 76  schwach 75  hinten 71  stark 64
  //
  // Dieselbe Reihenfolge dreimal. Nach dem alten Massstab waeren VIER der
  // fuenf Modi tot - und das waere ein Urteil ueber den Massstab, nicht ueber
  // das Spiel. Kein Mensch stellt sein ganzes Feld eine ganze Partie lang auf
  // denselben Modus; er stellt EINEN Turm um, wenn eine Welle es verlangt.
  //
  // Geprueft wird deshalb je WELLE: welcher Modus laesst in dieser Welle die
  // wenigsten Gegner durch? Ein Modus, der in keiner einzigen Welle auf
  // keiner einzigen Karte allein vorn liegt, ist eine Wahl ohne Folgen.
  // Alle drei Karten, nicht nur MAPS[0] - der alte Zuschnitt haette auf der
  // Ascheschlucht seit Langem angeschlagen, ohne dass es jemand gesehen
  // haette.
  console.log('\nZiellogik je Welle (welcher Modus laesst am wenigsten durch):');
  const siege: Record<string, number> = {};
  const geteilt: Record<string, number> = {};
  for (const z of ZIELWAHL_ORDNUNG) { siege[z] = 0; geteilt[z] = 0; }
  let entschieden = 0;
  /** Der ganze Verlust-Verlauf je Modus, ueber alle Karten aneinandergehaengt -
   *  der Fingerabdruck, an dem zwei gleiche Modi auffallen. */
  const verlauf: Record<string, string> = {};
  for (const z of ZIELWAHL_ORDNUNG) verlauf[z] = '';
  for (const mm of MAPS) {
    const proModus: Record<string, number[]> = {};
    for (const z of ZIELWAHL_ORDNUNG) {
      proModus[z] = play(mixedPlanBase, () => 0, MEISTER, 'normal', mm.id,
        { ziel: () => z }).leakByWave;
    }
    for (const z of ZIELWAHL_ORDNUNG) verlauf[z] += `|${proModus[z].join(',')}`;
    const wellen = Math.max(...ZIELWAHL_ORDNUNG.map((z) => proModus[z].length));
    const zeile: string[] = [];
    for (let w = 0; w < wellen; w++) {
      const werte = ZIELWAHL_ORDNUNG.map((z) => proModus[z][w] ?? 0);
      const min = Math.min(...werte), max = Math.max(...werte);
      if (min === max) continue;          // in dieser Welle trennt nichts
      entschieden++;
      const beste = ZIELWAHL_ORDNUNG.filter((_z, i) => werte[i] === min);
      if (beste.length === 1) { siege[beste[0]]++; zeile.push(`W${w + 1}:${beste[0]}`); }
      else for (const z of beste) geteilt[z]++;
    }
    console.log(`  ${mm.id.padEnd(15)} ${zeile.join('  ') || 'keine Welle trennt die Modi'}`);
  }
  // **Und keine zwei Modi duerfen denselben Verlauf haben.**
  //
  // Der volle Probenlauf zu v219 hat gemeldet, dass die Gegenprobe
  // "Zielmodus hinten wirkt wie vorn" nichts mehr beweist: macht man
  // "hinten" zu einer Kopie von "vorn", gewinnen beide in denselben Wellen -
  // geteilt, aber eben gewonnen, und die Pruefung oben ist zufrieden.
  //
  // Zwei Modi mit gleichem Verlust je Welle auf ALLEN Karten sind ein Modus
  // mit zwei Namen. Bei 15 Wellen und drei Karten ist das kein Zufall
  // mehr - 45 Zahlen treffen nicht versehentlich aufeinander.
  for (let i = 0; i < ZIELWAHL_ORDNUNG.length; i++) {
    for (let j = i + 1; j < ZIELWAHL_ORDNUNG.length; j++) {
      const a = ZIELWAHL_ORDNUNG[i], b = ZIELWAHL_ORDNUNG[j];
      if (verlauf[a] === verlauf[b]) {
        errors.push(`Ziellogik: "${a}" und "${b}" hinterlassen auf allen Karten `
          + 'denselben Verlust je Welle - das sind zwei Namen fuer denselben Modus.');
      }
    }
  }
  weichenstileMessen();
  console.log(`  Alleinsiege: ${ZIELWAHL_ORDNUNG.map((z) => `${z} ${siege[z]}`).join('  ')}`
    + `   (${entschieden} Wellen trennen ueberhaupt)`);
  console.log(`  geteilt:     ${ZIELWAHL_ORDNUNG.map((z) => `${z} ${geteilt[z]}`).join('  ')}`);
  for (const z of ZIELWAHL_ORDNUNG) {
    if (siege[z] + geteilt[z] === 0) {
      errors.push(`Ziellogik "${z}": in keiner Welle auf keiner Karte vorn - eine Wahl `
        + 'ohne Folgen. Entweder der Modus kann etwas, dann muss es zu messen sein, '
        + 'oder er gehoert weg.');
    }
  }
}

// **Die Zweigtabelle mittelt seit v251 - vorher war sie die einzige Kennzahl
// dieser Datei, die es nicht tat.**
//
// Ein einziger Lauf je Zweig, direkt unter dem eigenen Kommentar der Datei
// ("gemessen an einem einzelnen Verlauf ist das Chaos, nicht Balance"). Auf
// dieser Zahl stand im Spielspass-Audit der einzige Teilerfolg von G2 - "18 %
// beim Moerser". Ueber sieben Aussaaten nachgemessen bleiben 8 %, und auf
// einer ist der angeblich staerkere Zweig der schwaechere.
//
// Gemeldet wird deshalb Mittelwert UND Spanne, und wo der Unterschied
// zwischen den Zweigen kleiner ist als die groessere der beiden Spannen,
// steht UNBELEGT statt einer Zahl. Das ist keine Zierde: genau diese
// Unterscheidung haette den falschen Satz im Audit verhindert.
console.log('\nZweige einzeln (gemischtes Feld, ein Turmtyp umgestellt, '
  + `${AUSSAATEN.length} Aussaaten):`);
const branchRuns = new Map<string, Result[]>();
const branchMittel = new Map<string, { mittel: number; spanne: number }>();
for (const id of TOWER_ORDER) {
  for (const b of [0, 1] as const) {
    const o = ueberAussaaten((aussaat) => play(
      mixedPlan, (t) => (t === id ? b : 0), MEISTER, 'normal', MAPS[0].id, { seed: aussaat },
    ));
    branchRuns.set(`${id}:${b}`, o.runs);
    branchMittel.set(`${id}:${b}`, { mittel: o.mittel, spanne: o.spanne });
  }
}
let unbelegteZweige = 0;
for (const id of TOWER_ORDER) {
  const a = branchMittel.get(`${id}:0`)!, b = branchMittel.get(`${id}:1`)!;
  const def = TOWERS[id];
  const abstand = Math.abs(a.mittel - b.mittel);
  const rauschen = Math.max(a.spanne, b.spanne);
  const urteil = abstand < rauschen
    ? `UNBELEGT (Abstand ${abstand.toFixed(1)} < Rauschen ${rauschen.toFixed(1)})`
    : `Abstand ${abstand.toFixed(1)} von ${START_LIVES}`;
  if (abstand < rauschen) unbelegteZweige++;
  const fmt = (o: { mittel: number; spanne: number }) =>
    `${o.mittel.toFixed(1)}±${(o.spanne / 2).toFixed(1)}`;
  console.log(
    `  ${def.name.padEnd(11)} ${def.branches[0].name.padEnd(15)} ${fmt(a).padEnd(12)}` +
    `${def.branches[1].name.padEnd(15)} ${fmt(b).padEnd(12)} ${urteil}`,
  );
}
{
  // **Die kleinste Zweigwirkung, und nur die belegten zaehlen.** Ein Paar,
  // dessen Abstand unter seinem eigenen Rauschen liegt, hat keinen Wert,
  // den man festhalten koennte - es haette sonst die Ratsche auf einen
  // Zufall gesetzt.
  const belegte = TOWER_ORDER
    .map((id) => {
      const a = branchMittel.get(`${id}:0`)!, b = branchMittel.get(`${id}:1`)!;
      return { abstand: Math.abs(a.mittel - b.mittel), rauschen: Math.max(a.spanne, b.spanne) };
    })
    .filter((o) => o.abstand >= o.rauschen);
  spannungGemessen('zweigWirkung',
    belegte.length ? Math.min(...belegte.map((o) => o.abstand)) : null,
    belegte.length ? Math.max(...belegte.map((o) => o.rauschen)) : 0,
    `kleinster belegter Zweigabstand von ${START_LIVES} Kristall, ${MAPS[0].id}, `
    + `${AUSSAATEN.length} Aussaaten`);
}
if (unbelegteZweige === TOWER_ORDER.length) {
  console.log(`  Alle ${unbelegteZweige} Zweigpaare sind UNBELEGT - die Zweigwahl bewegt `
    + 'heute nichts, was ueber der Streuung des Verfahrens liegt (G2).');
}

// 1. Die gemischte Strategie muss gewinnen, sonst ist die Kurve zu steil.
if (!mixed.won) errors.push('Gemischt muss gewinnen - die Kurve ist zu steil.');

// 2. Sie darf nicht muehelos gewinnen, sonst fehlt die Spannung.
if (mixed.won && mixed.lives === START_LIVES) {
  errors.push('Gemischt gewinnt ohne einen einzigen Verlust - zu einfach.');
}

// 3. Ein Feld mit Uebergewicht am Boden muss an den Schwaermern scheitern -
//    sonst waere der fliegende Gegner nur Dekoration.
const ground = results.get('moerserlastig');
if (ground && ground.won && ground.lives >= mixed.lives) {
  errors.push('Moerserlastig kommt genauso weit wie gemischt - Flieger stellen keine Frage.');
}

// 3b. **Hier stand ein vierter Anlauf, und er ist weg** (C28, v175).
//
// Gesucht war eine Zahl, die sagt, was der Nachteil des Moersers ("erreicht
// keine Flieger") auf JEDER Karte kostet - Pruefung 3 darueber laeuft nur
// auf `MAPS[0]`, also ausgerechnet dort, wo die Luft am dicksten ist.
//
// Drei Entwuerfe, alle verworfen, und alle aus demselben Grund: sie messen
// das Umfeld statt der Sache (Regel 13).
//
//  1. **Bodenlastig gegen gemischt, je Karte.** Der Abstand blieb positiv,
//     selbst als die Frostspalte auf 1,2 Prozent Luft heruntergesetzt wurde
//     (Abstand 12). Ein gemischtes Feld ist aus zehn Gruenden besser, und
//     die Luft ist nur einer davon - die Zahl haette nie anschlagen koennen.
//  2. **Derselbe Lauf mit und ohne `hitsAir` am Moerser.** Klingt sauber, ist
//     es nicht: mit Luftfaehigkeit zielt der Moerser auch auf Flieger, seine
//     Flaechenwirkung verpufft dort, und der Lauf wird SCHLECHTER (Preis -46
//     auf der Frostspalte, 0 auf den anderen beiden). Der Eingriff aendert
//     das Zielverhalten mit, nicht nur die Reichweite.
//  3. **Verlorene Leben je Luftwelle.** Verworfen ohne Lauf: der Bot baut
//     nach fester Reihenfolge, und welche Welle ihn umwirft, haengt mehr an
//     seiner Kasse als an der Gegnerart.
//
// **Die Sache selbst ist messbar, nur nicht hier**: es ist der Anteil der
// Lebenspunkte, den der Moerser nicht erreichen kann. Der steht in
// `npm run guards` und ist dort eine Sperre - Faktor hoechstens 2 zwischen
// der dichtesten und der duennsten Karte. Eine zweite, schwaechere Fassung
// derselben Frage waere schlimmer als keine: sie stuende gruen daneben und
// saehe aus wie ein zweiter Beweis.

// 4. Keine einzelne Turmsorte darf das Spiel allein tragen.
//
// **Die Grenze ist seit v244 das gemischte Feld selbst, nicht 85 % vom
// Kristall.** Die alte Fassung war eine Zahl neben der Sache: "nur Frost"
// stand bei 50 von 60, die Schwelle bei 51, und das gemischte Feld bei 43 -
// die Monokultur war die staerkste Aufstellung des Spiels, und die Pruefung
// meldete gruen. Sie fragte "ist eine Sorte zu stark", wo die Frage
// "schlaegt eine Sorte das Mischen" heisst; und die zweite Frage ist die,
// wegen der es vier Turmarten gibt.
//
// Ein Gleichstand ist erlaubt. Es geht nicht darum, dass Mischen immer
// besser sein MUSS - es darf nur nicht schlechter sein.
const gemischtLeben = results.get('gemischt')?.lives ?? 0;
for (const [name, r] of results) {
  if (name === 'gemischt') continue;
  if (r.won && r.lives > gemischtLeben) {
    errors.push(`"${name}" gewinnt allein mit ${r.lives}/${START_LIVES} und schlaegt damit `
      + `das gemischte Feld (${gemischtLeben}) - dann ist die Turmwahl keine Frage mehr.`);
  }
}

// 4b. Jeder einzelne Zweig muss ein gemischtes Feld tragen, und die beiden
//     Zweige eines Turms duerfen nicht weit auseinanderliegen.
for (const id of TOWER_ORDER) {
  const def = TOWERS[id];
  const a = branchRuns.get(`${id}:0`)!, b = branchRuns.get(`${id}:1`)!;
  for (const [br, laeufe] of [[def.branches[0], a], [def.branches[1], b]] as const) {
    // Tot ist ein Zweig, der auf KEINER Aussaat gewinnt. Bis v258 stand hier
    // `runs[0]` - eine einzelne Aussaat, und ein Zweig, der auf zweien
    // gewinnt und auf der dritten knapp verliert, hiess "toter Ausbaupfad".
    if (laeufe.every((r) => !r.won)) {
      errors.push(`${def.name} / ${br.name}: gewinnt auf keiner Aussaat - toter Ausbaupfad.`);
    }
  }
  // **Der Abstand kommt seit v259 aus der Mittelung, und er muss ueber dem
  // eigenen Rauschen liegen.**
  //
  // Bis v258 las diese Regel `a.lives` - EINE Aussaat, waehrend
  // `branchMittel` wenige Zeilen weiter oben denselben Wert ueber drei
  // Aussaaten gemittelt bereithielt. Gefunden hat es S-P2-03: bei 48
  // Kristall meldete die Regel "die Moerserzweige liegen 23 % auseinander",
  // waehrend die Zweigtabelle im selben Lauf UNBELEGT sagte - der Abstand
  // lag unter seiner eigenen Streuung. Ein Tor, das eine Zahl verurteilt,
  // die die Datei daneben fuer Rauschen haelt, blockiert Arbeit auf einen
  // Zufall hin.
  //
  // Der Anteil bleibt am Kristall gemessen und nicht in Punkten, sonst
  // haengt die Grenze am Schwierigkeitsgrad (Regel 2).
  const ma = branchMittel.get(`${id}:0`)!, mb = branchMittel.get(`${id}:1`)!;
  const abstand = Math.abs(ma.mittel - mb.mittel);
  const rauschen = Math.max(ma.spanne, mb.spanne);
  const share = abstand / Math.max(1, a[0].maxLives);
  const gewinntBeides = a.some((r) => r.won) && b.some((r) => r.won);
  if (gewinntBeides && abstand > rauschen && share > 0.22) {
    errors.push(
      `${def.name}: die Zweige liegen ${Math.round(share * 100)} % des Kristalls auseinander ` +
      `(Abstand ${abstand.toFixed(1)} ueber ${AUSSAATEN.length} Aussaaten, Rauschen ` +
      `${rauschen.toFixed(1)}) - "` +
      `${ma.mittel > mb.mittel ? def.branches[0].name : def.branches[1].name}" ist die klar bessere Wahl.`,
    );
  }
}

// 4c. Mehr als ein Spielstil muss durchkommen, und keiner muehelos.
{
  const won = BOTS.filter((b) => styleRuns.get(b.name)!.won);
  if (won.length < 2) {
    errors.push(
      `Nur ${won.length} von ${BOTS.length} Spielstilen kommt durch - die Kurve ist zu eng gestellt.`,
    );
  }
  for (const b of BOTS) {
    const r = styleRuns.get(b.name)!;
    if (r.won && r.lives >= START_LIVES) {
      errors.push(`Spielstil "${b.name}" gewinnt ohne einen einzigen Verlust - zu einfach.`);
    }
  }
}

// 4d. Die Grade muessen sich unterscheiden und jeder muss Sinn ergeben.
{
  const wonCount = (id: DifficultyId) => BOTS.filter((b) => diffRuns.get(`${id}:${b.name}`)!.won).length;
  if (wonCount('ruhig') < BOTS.length) {
    errors.push('Ruhig: nicht jeder Spielstil kommt durch - der leichteste Grad muss verzeihen.');
  }
  if (wonCount('erbarmungslos') < 1) {
    errors.push('Erbarmungslos: kein Spielstil kommt durch - das ist kein Grad, sondern eine Wand.');
  }
  const hard = diffRuns.get('erbarmungslos:Meister')!;
  if (hard.won && hard.lives > hard.maxLives * 0.6) {
    errors.push(
      `Erbarmungslos: der Meister gewinnt mit ${hard.lives}/${hard.maxLives} - zu bequem fuer den haertesten Grad.`,
    );
  }
  // Verglichen wird die Punktzahl, nicht die Zahl der Sieger.
  //
  // Vorher stand hier ein Vergleich der Sieger-Anzahl. Seit alle drei Stile
  // auf allen Graden durchkommen, ist die auf beiden Seiten drei - die
  // Pruefung schlug an, obwohl die Grade sich klar unterscheiden. Dieselbe
  // Falle wie bei den absoluten Kristallgrenzen: eine Kennzahl, die im neuen
  // Zustand nicht mehr trennt.
  const meanOf = (id: DifficultyId) =>
    BOTS.reduce((a, b) => a + score(diffRuns.get(`${id}:${b.name}`)!), 0) / BOTS.length;
  const easy = meanOf('ruhig'), hardMean = meanOf('erbarmungslos');
  console.log(`  Ruhig ${easy.toFixed(0)} Punkte gegen Erbarmungslos ${hardMean.toFixed(0)}`);
  if (easy - hardMean < 12) {
    errors.push(
      `Ruhig liegt nur ${(easy - hardMean).toFixed(0)} Punkte vor Erbarmungslos - ` +
      'die Grade unterscheiden sich zu wenig.',
    );
  }
}

// Sterne muessen erreichbar sein - und nicht ueberall gleich.
//
// Nach dem Umbau des Kristalls waren drei Sterne auf zwei von drei Karten
// unmoeglich: der beste Stil kam auf 18 von 60 Punkten, gefordert waren 54.
// Ein Ziel, das niemand erreicht, ist kein Ziel.
{
  // **Erreichbarkeit fragt den Bestleistungs-Bot**, nicht die drei
  // bescheidenen Stile - sonst misst sie die Bescheidenheit mit.
  const best = new Map<string, number>();
  for (const m of MAPS) {
    const r = mapRuns.get(`${m.id}:${BESTLEISTUNG.name}`)!;
    const top = starsFor(r.won, r.lives, r.maxLives);
    best.set(m.id, top);
    const stile = Math.max(...BOTS.map((b) => {
      const o = mapRuns.get(`${m.id}:${b.name}`)!;
      return starsFor(o.won, o.lives, o.maxLives);
    }));
    console.log(`  ${m.name.padEnd(15)} bester Lauf: ${top} Stern(e) `
      + `(${r.won ? `${r.lives}/${r.maxLives}` : `verloren in W${r.wave}`}) `
      + `· die drei Stile: ${stile}`);
  }
  for (const m of MAPS) {
    if ((best.get(m.id) ?? 0) < 2) {
      errors.push(`Karte "${m.name}": auch der beste Spielstil holt nur ${best.get(m.id)} Stern(e) - unerreichbar.`);
    }
  }
  if (![...best.values()].some((v) => v >= 3)) {
    errors.push('Auf keiner Karte sind drei Sterne erreichbar - die Schwelle ist zu hoch.');
  }
  // **Diese Frage bleibt bei den drei Stilen.** Dass die Bestleistung ueberall
  // drei Sterne holt, ist erlaubt - sie ist der Spieler, der alles richtig
  // macht. Wertlos waere der dritte Stern erst, wenn ihn schon ein
  // bescheidener Aufbau ueberall bekaeme.
  const stileBest = MAPS.map((m) => Math.max(...BOTS.map((b) => {
    const r = mapRuns.get(`${m.id}:${b.name}`)!;
    return starsFor(r.won, r.lives, r.maxLives);
  })));
  if (stileBest.every((v) => v >= 3)) {
    errors.push('Auf jeder Karte holt schon ein bescheidener Aufbau drei Sterne - '
      + 'dann ist der dritte wertlos.');
  }
}

// 4e. Jede Karte muss von mindestens zwei Stilen zu schaffen sein und keine
//     darf muehelos sein.
for (const m of MAPS) {
  const runs = BOTS.map((b) => mapRuns.get(`${m.id}:${b.name}`)!);
  const won = runs.filter((r) => r.won);
  if (won.length < 2) {
    errors.push(`Karte "${m.name}": nur ${won.length} von ${BOTS.length} Stilen kommt durch.`);
  }
  if (won.length && won.every((r) => r.lives >= r.maxLives)) {
    errors.push(`Karte "${m.name}": jeder Sieg ohne einen einzigen Verlust - zu einfach.`);
  }
}

// 5. Effektbudget: was die Simulation erzeugt, muss der Browser zeichnen koennen.
if (mixed.peakFx > 900) errors.push(`Effektspitze ${mixed.peakFx} ist zu hoch fuer das Handy.`);

// 5b. **Hat dieser Lauf wirklich ueber alle Aussaaten gemittelt?** (v251)
//
// Der Ausgabe sieht man es nicht an: sie meldet Mittelwerte, gleich wieviele
// Laeufe dahinterstehen. Faellt die Schleife auf eine Aussaat zurueck - durch
// eine Aenderung, einen Tippfehler, eine gut gemeinte Beschleunigung -, dann
// steht ueberall weiter eine Zahl, und sie ist wieder das, was sie bis v250
// war: ein Zufall mit Nachkommastelle.
{
  const teile: string[] = [];
  for (const wo of ['overVariants', 'ueberAussaaten']) {
    const da = aussaatenJeMessung.get(wo) ?? new Set<number>();
    teile.push(`${wo} ${da.size}`);
    const fehlend = AUSSAATEN.filter((a) => !da.has(a));
    if (fehlend.length) {
      errors.push(`${wo} hat nur ${da.size} von ${AUSSAATEN.length} Aussaaten gefahren `
        + `(es fehlen ${fehlend.join(', ')}). Eine Mittelung ueber eine Aussaat ist keine.`);
    }
  }
  console.log(`\nAussaaten: ${AUSSAATEN.join(', ')} - gefahren von ${teile.join(', ')}.`);
}

// Wo tut es weh - Grundlage fuer die naechste Feinjustierung.
const hot = mixed.leakByWave
  .map((v, i) => ({ w: i + 1, v }))
  .filter((o) => o.v > 0);
if (hot.length) {
  console.log('Verluste (gemischt): ' + hot.map((o) => `W${o.w}:${o.v}`).join('  '));
}

// --- Die Spannungsratsche.
//
// Sie steht hier unten, weil sie alle fuenf Kennzahlen braucht, und vor dem
// Urteil, weil ihr Befund in dasselbe Urteil gehoert.
{
  // **`knappheitsAnteil` tritt an die Stelle von `goldUebrig`** (S-P2-01):
  // die alte Zahl misst zu einem unbekannten Teil den Deckel des Bots. Sie
  // bleibt als HINWEIS in der Tabelle stehen, weil sie die Zahl ist, die im
  // Audit steht - aber sie haelt nichts mehr.
  const ORDNUNG = ['stellen', 'ruhe', 'leereWellen', 'leerlaufAnteil', 'duennAnteil',
    'knappheitsAnteil', 'rettungen', 'goldUebrig', 'stilAbstand', 'zweigWirkung'];
  // `rettungen` steht in der Tabelle, haelt aber nichts: die Zahl hat ihr
  // eigenes Band (33 bis 67 %) ein paar Zeilen weiter oben, und zwei Tore
  // auf dieselbe Zahl waeren eines zu viel (Regel 15).
  const NUR_HINWEIS = ['goldUebrig', 'rettungen'];
  const NAMEN: Record<string, string> = {
    stellen: 'Stellen mit Verlust', ruhe: 'laengste folgenlose Strecke',
    leereWellen: 'Wellen ohne Entscheidung', leerlaufAnteil: 'Leerlauf der Partie', rettungen: 'Rettungen',
    duennAnteil: 'duenne Zeit (<=1 Gegner)', knappheitsAnteil: 'Knappheit',
    goldUebrig: 'Gold uebrig am Ende', stilAbstand: 'Abstand der Spielstile',
    zweigWirkung: 'kleinste Zweigwirkung',
  };

  // Erst schreiben, wenn danach gefragt wird - sonst waere die Ratsche keine:
  // ein Lauf, der seinen eigenen Stand fortschreibt, kann nicht darunter
  // fallen. Deshalb ist `--spannung-schreiben` ein ausdruecklicher Griff.
  if (SPANNUNG_SCHREIBEN) {
    const alt2 = leseSpannungsstand();
    // **Der Schreiber senkt keinen Stand.**
    //
    // Das ist keine Vorsicht, sondern eine Reparatur: in v262 hat dieser
    // Griff die Kennzahl "Stellen mit Verlust" von 2,00 auf 1,67
    // heruntergeschrieben - genau die eine Zahl, die schlechter geworden
    // war. Ein Schreiber, der Staende senkt, macht aus der Ratsche eine
    // Anzeige. Wer wirklich senken will, aendert die Datei von Hand und
    // schreibt daneben, warum.
    const gesenkt: string[] = [];
    const zeilen = ORDNUNG.map((k) => {
      const m = spannung.get(k)!;
      const a = alt2.get(k);
      const tiefer = ['ruhe', 'goldUebrig', 'leereWellen', 'leerlaufAnteil',
        'duennAnteil'].includes(k);
      const richtung = a?.richtung ?? (tiefer ? 'tief' : 'hoch');
      let wert = m.wert;
      if (a && a.stand !== null && wert !== null) {
        // Auf zwei Stellen vergleichen - in der Datei stehen zwei, und ein
        // Rundungsrest hinter der zweiten meldete sonst "44,66 statt 44,66".
        const gerundet = Number(wert.toFixed(2));
        const schlechter = richtung === 'hoch' ? gerundet < a.stand : gerundet > a.stand;
        if (schlechter) {
          gesenkt.push(`${k} ${wert.toFixed(2)} statt ${a.stand.toFixed(2)}`);
          wert = a.stand;
        }
      }
      return `${k} ${richtung} `
        + `${wert === null ? 'UNBELEGT' : wert.toFixed(2)} `
        + `${a === undefined ? 0 : (a.soll === null ? '-' : a.soll)}`;
    });
    if (gesenkt.length) {
      console.log(`  Nicht gesenkt (der alte Stand bleibt): ${gesenkt.join(', ')}.`);
    }
    writeFileSync(SPANNUNG_DATEI, KOPF + zeilen.join('\n') + '\n');
    console.log(`\nSpannungsratsche: Stand geschrieben (${SPANNUNG_DATEI}).`);
  }

  const stand = leseSpannungsstand();
  if (stand.size === 0) {
    // **Eine leere Datei galt in v227 schon einmal als sauber**, und
    // `: > tools/proben-befund.txt` haette die Pruefung damit still
    // abgeschaltet. Dieselbe Falle steht hier - also wird sie hier benannt.
    errors.push('Spannungsratsche: tools/spannung-stand.txt ist leer oder fehlt. '
      + 'Ohne Stand haelt die Ratsche nichts, und ein Lauf ohne Stand sieht aus '
      + 'wie ein Lauf ohne Rueckschritt. Mit `npx tsx tools/sim.ts '
      + '--spannung-schreiben` neu setzen - und dabei wissen, dass man damit '
      + 'jeden Rueckschritt festschreibt.');
  }
  console.log('\nSpannungsratsche (Stand halten, Soll anstreben):');
  for (const k of ORDNUNG) {
    const m = spannung.get(k);
    if (!m) { errors.push(`Spannungsratsche: die Kennzahl "${k}" wurde in diesem Lauf `
      + 'gar nicht gemessen - dann haelt sie auch nichts.'); continue; }
    const z = stand.get(k);
    const wert = m.wert === null ? 'UNBELEGT' : m.wert.toFixed(2);
    if (!z) {
      if (stand.size > 0) {
        errors.push(`Spannungsratsche: fuer "${k}" steht kein Stand in der Datei.`);
      }
      continue;
    }
    const besser = z.richtung === 'hoch' ? '>=' : '<=';
    const sollErreicht = z.soll !== null && m.wert !== null
      && (z.richtung === 'hoch' ? m.wert >= z.soll : m.wert <= z.soll);
    console.log(
      `  ${NAMEN[k].padEnd(30)} ${wert.padStart(9)}   Stand `
      + `${z.stand === null ? 'UNBELEGT' : z.stand.toFixed(2)}   `
      + `${z.soll === null ? 'kein Soll (Regel 10)' : `Soll ${besser} ${z.soll}`}`
      + `${sollErreicht ? '   ERREICHT' : ''}   (Rauschen ${m.rauschen.toFixed(2)})`,
    );
    if (z.soll !== null && !sollErreicht) {
      console.log(`    OFFEN: ${NAMEN[k]} liegt noch nicht beim Soll (${besser} ${z.soll}).`);
    }
    if (NUR_HINWEIS.includes(k)) {
      console.log('    (nur Hinweis - diese Zahl haelt nichts, siehe S-P2-01)');
      continue;
    }
    // Der Vergleich selbst - und er laesst das Rauschen der Kennzahl zu.
    if (z.stand === null || m.wert === null) {
      if (z.stand !== null && m.wert === null) {
        errors.push(`Spannungsratsche: "${NAMEN[k]}" war belegt (Stand `
          + `${z.stand.toFixed(2)}) und ist es nicht mehr. Eine Kennzahl, die aus `
          + 'der Messbarkeit faellt, ist ein Rueckschritt wie jeder andere. '
          + `Gemessen an: ${m.messstelle}.`);
      }
      continue;
    }
    const abfall = z.richtung === 'hoch' ? z.stand - m.wert : m.wert - z.stand;
    if (abfall > m.rauschen) {
      errors.push(`Spannungsratsche: "${NAMEN[k]}" faellt von ${z.stand.toFixed(2)} auf `
        + `${m.wert.toFixed(2)} - ${abfall.toFixed(2)} schlechter bei einem Rauschen von `
        + `${m.rauschen.toFixed(2)}. Gemessen an: ${m.messstelle}.`);
    }
  }
}

if (errors.length) {
  console.error('BALANCE-CHECK: nicht bestanden');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('BALANCE-CHECK: bestanden.');
