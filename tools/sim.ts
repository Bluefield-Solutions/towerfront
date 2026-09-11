/** Kopflose Balance-Simulation.
 *  Ein Bot spielt alle Wellen mit verschiedenen Turmstrategien durch, ohne
 *  Browser, in Millisekunden. Jede Aenderung an Schaden, Kosten, Reichweite
 *  oder Gegnerwerten wird sofort daran gemessen.
 *  Aufruf: npx tsx tools/sim.ts */
import { GameState } from '../src/game/state';
import { ZIELWAHL_ORDNUNG, type Zielwahl, type Tower } from '../src/game/types';

import {
  DIFFICULTIES, DIFFICULTY_ORDER, LAUF_STEIGUNG, type DifficultyId,
} from '../src/data/difficulty';
import {
  laufStarten, abschnittGeschafft, laufendeKarte, istLaufZuEnde, wellenDesLaufs,
  wellenDesAbschnitts, abschnittsWahl, abschnittWaehlen, WAHLARTEN, erfahrungFuer,
  type AbschnittsAngebot,
} from '../src/game/lauf';
import {
  laufErfahrung, laufErfahrungGutschreiben, karteFreischalten,
} from '../src/core/storage';

const START_LIVES = DIFFICULTIES.normal.startLives;
import { TOWERS, TOWER_ORDER, MAX_LEVEL, WIEDERHOLUNG_ZUSCHLAG, VIELFALT_BEUTE, nextFor, rangeFor, type TowerId } from '../src/data/towers';

import { MAPS } from '../src/data/maps';
import {
  KARTENSTAPEL, GRUNDSTAPEL, kartenWirkung, zieheKarten, type Karte, type KartenArt,
} from '../src/data/karten';
import { MONOKULTURWELLE, PLAN_SPIRALHAIN, type Wave } from '../src/data/waves';
import { VORZEICHEN_ORDNUNG, vorzeichenZahl, type Vorzeichen } from '../src/data/vorzeichen';
import { WEGNETZ } from '../src/data/wegnetz';
import { ALL_PERKS, NO_PERKS } from '../src/data/perks';
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
  /** Ob dieser Stil absichtlich um einen Bannturm herum baut (v295, C3).
   *  Ohne Angabe: nein - die geeichten drei Stile bleiben, wie sie sind. */
  bannStil?: 'egal' | 'nest';

  /** **Was dieser Stil BAUT** (v293, M18).
   *
   *  Bis v292 fuhren alle drei Stile dieselbe Turmliste und unterschieden
   *  sich nur in Ruecklage, Ausbautiefe und Entscheidungstakt. Ihr "Abstand"
   *  war damit der Unterschied zwischen drei fast gleichen Bots - und die
   *  Ratsche, die daran haengt, hat sich entsprechend verhalten: ueber einen
   *  Parameter, der die drei GAR NICHT unterscheidet (den
   *  Wiederholungsaufschlag), sprang sie von 1,46 auf 11,64 und zurueck auf
   *  4,50, bei einem angegebenen Rauschen von 3 bis 5.
   *
   *  Ohne Angabe bleibt es bei der gemischten Liste. Der **Meister** behaelt
   *  sie ausdruecklich: er ist der, gegen den jede andere Zahl dieses
   *  Werkzeugs geeicht ist, und wer ihn umstellt, verschiebt sie alle mit. */
  plan?: TowerId[];
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
   *  **Heute steht ueberall null, und das ist eine Messentscheidung** (v285).
   *  Vier Eichungen sind gemessen worden (Bonus 0,25 bis 0,40, Radius 192 bis
   *  230, ein bis drei Foerderer je Bot); jede hat die bestehende Eichung an
   *  anderer Stelle verschoben - unerreichbare Karten, Monokulturen, die das
   *  gemischte Feld schlagen, und einmal alle vier Zweigpaare unter dem
   *  Rauschen.
   *
   *  Der vierte Punkt hat gesagt, warum das so bleiben wuerde: das Rauschen
   *  dieser Kennzahlen schwankt zwischen 2,0 und 24,0 und liegt bei der
   *  Spanne der Spielstile mit 11,0 UEBER dem Messwert von 9. Wer daran
   *  weiterdreht, justiert gegen Zufall - genau wovor Abschnitt 2.1 des
   *  Anforderungskatalogs warnt (M1).
   *
   *  Die Bots bauen deshalb vorerst keine. Was der Foerderer TUT, misst der
   *  eigene Abschnitt weiter unten - mit demselben Bot, einmal mit und einmal
   *  ohne. Er misst und urteilt nicht; das Urteil braucht eine Eichrunde, und
   *  die braucht ein ruhigeres Messgeraet.
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
/** Ab welchem Vielfachen des Grundpreises der Bot auf eine andere Turmart
 *  ausweicht, wenn eine zum Grundpreis zu haben ist.
 *
 *  1,35 ist der ERSTE Aufschlag - der Bot weicht also aus, sobald das Haeufen
 *  ueberhaupt etwas kostet. Das ist die vorsichtigste Lesart der neuen
 *  Entscheidung und damit die, die am wenigsten ueber den Bot und am meisten
 *  ueber die Mechanik sagt. */
const AUSWEICHEN_AB = 1.34;

const BOTS: Bot[] = [
  {
    name: 'Meister', foerderer: 0, maxTowers: 12, maxLevel: 3, reserve: 40, decideEvery: 30, deepenAt: 0.65,
    // Der Meister laesst offen - und zwar bewusst der, gegen den alle
    // uebrigen Zahlen dieses Werkzeugs geeicht sind. Wer ihn umstellt,
    // verschiebt jede andere Messung mit.
    weichenStil: 'offen',
  },
  {
    // Erst alle Stellungen besetzen, dann ausbauen - und dafuer die BILLIGEN
    // Tuerme (v293). Wer in die Breite geht, kauft Stueckzahl; der Bogenturm
    // kostet 55, das Prisma 140. Bis v292 baute dieser Stil dieselbe
    // Mischung wie die anderen zwei und war damit nur eine andere
    // Einstellung desselben Bots (M18).
    name: 'Breite', foerderer: 0, maxTowers: 12, maxLevel: 3, reserve: 15, decideEvery: 20, deepenAt: 1,
    plan: ['arrow', 'arrow', 'frost', 'arrow', 'mortar'],
    weichenStil: 'offen',
  },
  {
    // Nur die Haelfte der Plaetze, dafuer frueh tief und mit Ruecklage.
    //
    // **Er behaelt die gemischte Liste, und das ist gemessen** (v293). Der
    // erste Entwurf gab ihm die TEUREN Tuerme - "wer wenige Stellungen
    // haelt, will dass jede zaehlt" -, und er verlor damit in Welle 14, bei
    // 91 % Knappheit und 4045 statt 6300 Gold. Teure Tuerme frueh UND eine
    // Ruecklage von 140 heisst: zu wenig Verteidigung, zu wenig Beute, und
    // von da an kommt er nicht mehr in Fahrt. Auch mit einem milderen Plan
    // (Moerser statt Prisma zuerst) blieb es dabei.
    //
    // Seine dritte Achse ist die TIEFE, nicht das Sortiment - und die ist
    // real verschieden. Was M18 kritisiert hat, war, dass ALLE drei dasselbe
    // bauen; mit `Breite` auf einer eigenen Liste ist die Trennung da.
    name: 'Sparsam', foerderer: 0, maxTowers: 12, maxLevel: 3, reserve: 140, decideEvery: 30, deepenAt: 0.5,
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
  name: 'Bestleistung', foerderer: 0, maxTowers: 24, maxLevel: MAX_LEVEL,
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
/** Nur der Lauf und seine Wahl - fuer die Eichrunde. Derselbe Grund wie bei
 *  `--faehigkeiten`: eine Frage von zwei Minuten soll nicht den ganzen
 *  Durchlauf kosten. Es urteilt trotzdem, es meldet dieselben Fehler. */
const NUR_LAUF = process.argv.slice(2).includes('--lauf');
/** Nur die sechs Wirkungen (S-N6-01). Derselbe Grund wie oben: die Frage
 *  "ist diese Wirkung von jener zu unterscheiden" ist eine Eichfrage und
 *  soll nicht den ganzen Durchlauf kosten. Es urteilt trotzdem. */
const NUR_WIRKUNG = process.argv.slice(2).includes('--wirkungen');
/** Nur die Monokulturwelle (S-N6-04) - derselbe Grund wie oben. */
const NUR_MONO = process.argv.slice(2).includes('--monokultur');
/** Nur die sechs Vorzeichen (S-N6-05) - derselbe Grund wie oben. */
const NUR_VZ = process.argv.slice(2).includes('--vorzeichen');

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
  /** Wieviele Turmarten die getoeteten Gegner beschaedigt haben (S-N3-03). */
  artenJeKill: number[];
  /** Wieviele Karten der Bot in diesem Abschnitt gezogen hat (v308, N1K).
   *  0 heisst: er faehrt ohne Deck. */
  gezogeneKarten: number;
  /** **Die Rampe, mit der dieser Abschnitt wirklich gerechnet hat** (v310).
   *  Abgelesen am Spielzustand, nicht danebengerechnet - die Gegenprobe hat
   *  gezeigt, dass eine nachgerechnete Tabelle den Eingriff gar nicht sieht. */
  rampe: number;
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
/** **Der harte Grad ist in v314 entfallen - der Ersatz ist der LAUF**
 *  (S-N1-05).
 *
 *  Der Gedanke darueber bleibt woertlich gueltig: gemessen wird dort, wo die
 *  Karte weh tut, sonst ist die Weiche eine Entscheidung ohne Folgen. Nur
 *  heisst "hart" nicht mehr `erbarmungslos`, sondern ein spaeter ABSCHNITT -
 *  `laufFaktor` legt genau diese Steigerung ueber die Karte. Abschnitt 3 ist
 *  der letzte und traegt 1,3 ** 3 = 2,20. */
const WEICHEN_ABSCHNITT = 3;

function weichenstileMessen(): void {
  const mitWeiche = MAPS.filter((m) => (WEGNETZ[m.id]?.weichen?.length ?? 0) > 0);
  console.log(`\nWeichenstile (derselbe Bot, ${WEICHENSTILE.length} Stellungsstrategien, `
    + `Abschnitt ${WEICHEN_ABSCHNITT} des Laufs) - `
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
        'normal', mm.id, { laufAbschnitt: WEICHEN_ABSCHNITT }).leakByWave;
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

/** **Was der Foerderer TUT** (S-N3-01).
 *
 *  Derselbe Bot, einmal mit einem Foerderer und einmal ohne - nichts anderes
 *  unterschieden (Regel 13). Gemessen wird, was ein Einkommensgebaeude
 *  ueberhaupt bewegen kann: verdientes Gold, gebaute Ausbauten und der
 *  Kristall am Ende.
 *
 *  **Es misst und urteilt nicht**, und das ist die Entscheidung dieser Runde.
 *  Vier Eichungen sind gefahren, jede hat die bestehende Balance an anderer
 *  Stelle verschoben - und der vierte Punkt hat gezeigt, warum: das Rauschen
 *  dieser Kennzahlen liegt teils UEBER dem Effekt, den sie messen sollen
 *  (M1). Eine Ratsche darauf waere eine Ratsche auf Zufall. */
function foerdererMessen(): void {
  console.log('\nFoerderer (derselbe Bot, einmal mit und einmal ohne):');
  for (const mm of MAPS) {
    const ohne = play(mixedPlanBase, () => 0, { ...MEISTER, foerderer: 0 }, 'normal', mm.id);
    const mit = play(mixedPlanBase, () => 0, { ...MEISTER, foerderer: 1 }, 'normal', mm.id);
    const dGold = mit.earned - ohne.earned;
    console.log(`  ${mm.id.padEnd(15)} Gold ${ohne.earned} -> ${mit.earned} `
      + `(${dGold >= 0 ? '+' : ''}${dGold}, ${(100 * dGold / Math.max(1, ohne.earned)).toFixed(1)} %)`
      + `   Ausbauten ${ohne.upgrades} -> ${mit.upgrades}`
      + `   Kristall ${ohne.lives}/${ohne.maxLives} -> ${mit.lives}/${mit.maxLives}`);
  }
  console.log('  (misst, urteilt nicht - die Eichung braucht ein ruhigeres Messgeraet, siehe M1)');
}

/** **Ist der Bannturm eine Wette?** (v295, C3)
 *
 *  S5 des Referenzabgleichs verlangt genau das: bei wenigen Tuermen ein
 *  Verlust, bei vielen dichten ein Gewinn - es darf keine Lage geben, in der
 *  er immer richtig ist. Gerechnet ist die Spanne im Abgleich (unbedacht 0,88
 *  Bogentuerme fuer 1,64, absichtlich 2,12); hier wird sie GEFAHREN.
 *
 *  Zwei Bauplaene, derselbe Bot: einer stellt den Bannturm irgendwo in die
 *  Reihe, der andere gar keinen. Der Unterschied ist die Zahl, um die es
 *  geht - und sie muss klein bleiben, solange niemand ABSICHTLICH um ihn
 *  herum baut. Ein Bot, der das taete, waere ein anderer Bot; dass es sich
 *  dann lohnt, sagt die Geometrie (Faktor 2,4 im Abgleich, gemessen an
 *  `GameState.build`).
 *
 *  Kein Tor: es misst, es urteilt nicht. */
function bannMessen(): void {
  console.log('\nBannturm (derselbe Bot, einmal mit und einmal ohne):');
  // Der Bannturm ZUERST: wer fuer ihn baut, stellt ihn nicht als dritten.
  // Der Bannturm kommt als VIERTER: er verstaerkt Nachbarn, und vorher gibt
  // es keine. Wer ihn als ersten stellt, kauft einen Bonus auf nichts.
  const mitBann: TowerId[] = ['arrow', 'arrow', 'mortar', 'bann', 'frost', 'prism'];
  const nest = { ...MEISTER, bannStil: 'nest' as const };
  for (const mm of MAPS) {
    const ohne = play(mixedPlanBase, () => 0, MEISTER, 'normal', mm.id);
    const blind = play(mitBann, () => 0, MEISTER, 'normal', mm.id);
    const klug = play(mitBann, () => 0, nest, 'normal', mm.id);
    console.log(`  ${mm.id.padEnd(15)} ohne ${ohne.lives}   unbedacht ${blind.lives} `
      + `(${blind.lives - ohne.lives >= 0 ? '+' : ''}${blind.lives - ohne.lives})   `
      + `ins Nest gebaut ${klug.lives} `
      + `(${klug.lives - ohne.lives >= 0 ? '+' : ''}${klug.lives - ohne.lives})`
      + `   von ${ohne.maxLives}`);
  }
  console.log('  (misst, urteilt nicht - unbedacht gestellt SOLL er sich nicht lohnen,');
  console.log('   das ist S5 des Abgleichs. Wer absichtlich um ihn herum baut, erreicht');
  console.log('   gemessen 5,3 statt 2,2 Tuerme im Umkreis - Faktor 2,4.)');
}

/** **Ist Gold in diesem Spiel ueberhaupt knapp?** (v291)
 *
 *  Drei Runden haben dieselbe Antwort gegeben, ohne dass jemand die Frage
 *  gestellt hat: der Foerderer bringt -1,8 bis +2,4 % (v285), der
 *  Wiederholungsaufschlag aendert 0/-6/0/+1 Kristall (v287), die Werft senkt
 *  das uebrige Gold von 43 auf 35 bis 44 % (v290). Jedes Mal stand daneben
 *  "bei 28 % uebrigem Gold entscheidet ein Preis nichts".
 *
 *  **Nur ist diese Zahl gar keine Aussage ueber das Spiel.** Die drei Bots
 *  tragen `maxTowers: 12` - eine Selbstbeschraenkung, keine Regel; die Karten
 *  halten rund zweihundert Bauplaetze. Wer nicht mehr baut, weil er nicht
 *  will, laesst Gold liegen, das er ausgeben KOENNTE, und ein Preis kann bei
 *  ihm nichts entscheiden, ganz gleich wie hoch er ist. Genau derselbe
 *  Modellfehler wie in v285, wo der Foerderer gegen `maxTowers` gezaehlt
 *  wurde.
 *
 *  Gefragt wird deshalb hier, an einem Bot OHNE Deckel: wieviel Gold bleibt
 *  liegen, wenn einer wirklich alles ausgibt, was er kann? Bleibt auch dann
 *  viel uebrig, ist Gold nicht knapp und keine Preisregel wird je etwas
 *  entscheiden - dann fehlt dem Spiel eine Verwendung, nicht eine Zahl.
 *
 *  Kein Tor: es misst, es urteilt nicht. Die drei geeichten Bots bleiben
 *  unangetastet - wer sie umstellt, verschiebt jede andere Messung mit. */
function knappheitMessen(): void {
  console.log('\nIst Gold knapp? (derselbe Bot mit Deckel und ohne):');
  const ohneDeckel = { ...MEISTER, maxTowers: 200, maxLevel: MAX_LEVEL };
  for (const mm of MAPS) {
    const eng = play(mixedPlanBase, () => 0, MEISTER, 'normal', mm.id);
    const frei = play(mixedPlanBase, () => 0, ohneDeckel, 'normal', mm.id);
    const anteil = (r: Result) => 100 * (r.earned - r.spent) / Math.max(1, r.earned);
    console.log(`  ${mm.id.padEnd(15)} Tuerme ${eng.towers} -> ${frei.towers}`
      + `   Ausbauten ${eng.upgrades} -> ${frei.upgrades}`
      + `   Gold uebrig ${anteil(eng).toFixed(0)} % -> ${anteil(frei).toFixed(0)} %`
      + `   Kristall ${eng.lives} -> ${frei.lives} von ${frei.maxLives}`);
  }
  console.log('  (misst, urteilt nicht - die Zahl sagt, ob eine Preisregel ueberhaupt');
  console.log('   etwas entscheiden KANN, siehe S-N3-02 und M1)');
  console.log('  Gemessen in v291: ohne Deckel bleiben -3 bis 16 % liegen statt 40 bis 47.');
  console.log('  Gold IST also knapp, sobald es ausgegeben wird - der Bot gibt es nur');
  console.log('  nicht aus, weil zwoelf Tuerme reichen. Wer 29 bis 41 baut, verliert');
  console.log('  (Kristall 27 -> 0 auf dem Spiralhain): die weiteren Plaetze sehen zu');
  console.log('  wenig, und das Gold fehlt beim Ausbauen (24 -> 4 bis 21). Die');
  console.log('  Knappheit fehlt nicht beim GOLD, sondern beim BEDARF.');
}

/** **Trennt der Wiederholungsaufschlag Haeufen von Verteilen?** (v286, S-N3-02)
 *
 *  Die Story verlangt, dass die Zweigwirkung steigt - und gemessen tut sie
 *  das nicht. Bevor man das der Mechanik zuschreibt, ist zu pruefen, ob der
 *  Messplatz sie ueberhaupt sehen kann: die drei Spielstile fahren ALLE
 *  dieselbe Turmliste und unterscheiden sich nur in der Ausbautiefe. Eine
 *  Regel gegen das Haeufen kann zwischen drei Bots, von denen keiner haeuft,
 *  nichts trennen - sie nimmt allen dasselbe weg.
 *
 *  Hier wird der Fall GESTELLT statt abgewartet (dieselbe Bewegung wie in
 *  v219 und v231): ein Bot, der nur eine Turmart baut, gegen einen, der vier
 *  gleichmaessig verteilt - jeder einmal mit Aufschlag und einmal ohne. Wenn
 *  der Aufschlag etwas taugt, muss der Abstand zwischen beiden MIT groesser
 *  sein als OHNE. Ist er es nicht, liegt es an der Mechanik und nicht am
 *  Messplatz.
 *
 *  Kein Tor: es misst, es urteilt nicht. */
/** **Was die Werft kostet und was sie zurueckgibt** (v290, S-N3-04).
 *
 *  Derselbe Bot einmal mit und einmal ohne - die Bauweise aus v285, und sie
 *  hat sich seitdem zweimal bewaehrt: sie sagt in vier Zeilen mehr als vier
 *  Eichungen.
 *
 *  Die entscheidende Zahl ist NICHT "wieviel Kristall kommt zurueck" - das
 *  rechnet die Formel aus, dafuer braucht es keinen Lauf. Gefragt ist, ob ein
 *  Durchbruch danach noch wehtut: die Story verlangt ausdruecklich, dass die
 *  Reparatur Verluste nicht folgenlos macht. */
function werftMessen(): void {
  console.log('\nWerft (derselbe Bot, einmal mit und einmal ohne):');
  let schlechtester = 99;
  for (const mm of MAPS) {
    const ohne = play(mixedPlanBase, () => 0, MEISTER, 'normal', mm.id);
    const mit = play(werftPlan, () => 0, MEISTER, 'normal', mm.id);
    const dLeben = mit.lives - ohne.lives;
    console.log(`  ${mm.id.padEnd(15)} Kristall ${ohne.lives} -> ${mit.lives} von `
      + `${mit.maxLives} (${dLeben >= 0 ? '+' : ''}${dLeben})`
      + `   Tuerme ${ohne.towers} -> ${mit.towers}`
      + `   Gold uebrig ${(100 * (ohne.earned - ohne.spent) / Math.max(1, ohne.earned)).toFixed(0)} `
      + `% -> ${(100 * (mit.earned - mit.spent) / Math.max(1, mit.earned)).toFixed(0)} %`);
    // Was ein Durchbruch noch kostet: der Kristall darf mit Werft nicht
    // voll bleiben, sonst ist der Verlust zurueckgekauft statt abgemildert.
    schlechtester = Math.min(schlechtester, mit.maxLives - mit.lives);
  }
  console.log(`  Fehlender Kristall am Ende, bestenfalls: ${schlechtester} `
    + `(gefordert > ${WERFT_REST_MIN} - sonst ist ein Durchbruch folgenlos).`);
  if (schlechtester <= WERFT_REST_MIN) {
    errors.push(`Mit Werft endet die beste Partie mit ${schlechtester} fehlendem Kristall. `
      + 'Dann ist ein Durchbruch zurueckgekauft statt abgemildert, und die Verluste '
      + 'haben keine Folge mehr.');
  }
}

/** Der Bauplan mit Werft: dieselbe Mischung, eine Werft dazwischen. Sie
 *  ersetzt keinen Turm, sie kommt zu ihnen - genau das ist der Handel, den
 *  die Story messen will (derselbe Bauplatz fuer drei Zwecke). */
const werftPlan: TowerId[] = ['arrow', 'arrow', 'werft', 'mortar', 'frost', 'prism'];
/** Wieviel Kristall am Ende der besten Partie noch fehlen MUSS. */
const WERFT_REST_MIN = 0;

const MESS_ZUSCHLAG = 0.35;
/** Wieviel Gold der Aufschlag dem Haeufer MEHR abnehmen muss als dem
 *  Verteiler. Gemessen sind 344 bis 693 je Karte; 200 laesst Luft nach unten
 *  und faengt trotzdem den Fall, dass die Freimenge wegfaellt. */
const TRENNUNG_MIN = 200;
/** Wieviel Kristall der Aufschlag den perfekten Verteiler kosten darf: nichts.
 *  Null ist hier keine strenge Zahl, sondern die Aussage selbst - wer nicht
 *  haeuft, wird von einer Regel gegen das Haeufen nicht getroffen. */
const VERTEILER_VERLUST_MAX = 0;

/** **Was die Vielfaltsbeute dem MISCHER bringt und dem HAEUFER nicht**
 *  (v299, S-N3-03).
 *
 *  Der Lauf oben zeigt, dass der Zuschlag Gold ins Spiel bringt - 35,2 auf
 *  36,5 % uebriges Gold bei 0,15. Was er NICHT zeigt, ist, ob er eine
 *  Entscheidung trennt: die Bots fahren einen festen Plan, ihre gemessene
 *  Artenzahl bleibt bei 2,23, gleich wie hoch der Zuschlag steht. Ein
 *  Messplatz, an dem sich das Gemessene nicht bewegen KANN, sagt nichts
 *  (M18, dieselbe Klasse).
 *
 *  Gefragt wird deshalb wie beim Wiederholungsaufschlag: derselbe Bot,
 *  dieselbe Karte, einmal mit einer Turmart und einmal mit vieren, jeweils
 *  mit Zuschlag und ohne. Der Mischer muss mehr gewinnen als der Haeufer -
 *  sonst ist es eine Geldspritze und keine Regel.
 *
 *  **Am gesetzten Wert gemessen, nicht an einem gestellten** - die Lehre aus
 *  v297: eine Zusage, die etwas anderes misst als das, was ausgeliefert
 *  wird, bezeugt die Sache, ohne sie je geprueft zu haben (Regel 13). */
/** Wieviel Gold die Vielfaltsbeute dem Mischer mindestens bringen muss.
 *
 *  **30 statt 50, und der Grund ist eine Messstelle** (v301): die 50 waren
 *  am gestellten Zuschlag 0,15 abgelesen (Trennung 100 bis 251). Gesetzt ist
 *  0,10, und dort misst dieselbe Zahl **58 bis 170** - die alte Grenze
 *  bestand um 8 Gold. Eine Grenze, die auf dem Gemessenen sitzt, schlaegt
 *  beim naechsten Bauverlauf an und wird dann hochgesetzt statt ernst
 *  genommen (dieselbe Ueberlegung wie bei den UX-Ratschen in v294).
 *
 *  Sie ist bewusst eine Geruchsprobe und kein Sollwert aus einer Referenz:
 *  die eigentliche Zusage steht eine Zeile tiefer. */
const VIELFALT_TRENNUNG_MIN = 30;
/** Der Wert, an dem gemessen wird - **der ausgelieferte, solange es einen
 *  gibt** (v301).
 *
 *  In v299 stand hier fest 0,15, weil der Schalter auf Null stand und eine
 *  abgeschaltete Mechanik, die niemand mehr misst, still verfaellt
 *  (Regel 5). Seit v301 ist er scharf, und dann waere eine zweite feste
 *  0,15 daneben genau die Doppelung, die Regel 15 meint: gepflegt wuerde
 *  eine davon. Die Zusage misst deshalb den gesetzten Wert, und die 0,15
 *  bleibt nur als Rueckfall fuer den Fall stehen, dass jemand den Schalter
 *  wieder auf Null dreht - dann sagt sie weiter, was die Regel TAETE.
 *
 *  Damit haengt die Zusage in beiden Zustaenden an etwas: am Spiel, wenn es
 *  eins gibt, und am gestellten Fall, wenn nicht (die Lehre aus v297). */
const VIELFALT_MESS = VIELFALT_BEUTE > 0 ? VIELFALT_BEUTE : 0.15;

/** **Ein ganzer Lauf, kopflos gefahren** (v302, S-N1-01).
 *
 *  Die Abnahme der Story verlangt drei Dinge, und dieses eine Werkzeug haelt
 *  zwei davon: ein voller Lauf muss fahrbar sein und innerhalb eines festen
 *  Horizonts enden, und der Wellenzaehler muss ueber die Abschnitte hinweg
 *  durchlaufen.
 *
 *  **Die zweite Zahl ist die eigentliche Zusage, und sie ist gerechnet statt
 *  erspielt:** die Lebenskurve am ANFANG jedes Abschnitts. Faengt Abschnitt 2
 *  wieder bei rund 1,0 an, ist der Lauf vier Partien hintereinander; steigt
 *  sie von Abschnitt zu Abschnitt, ist er eine Klammer. Gerechnet, weil ein
 *  erspielter Wert die Wegabhaengigkeit mittraegt und diese Frage sie nicht
 *  braucht - `hpScale` ist eine Funktion, keine Partie.
 *
 *  Der Horizont ist kein Sollwert aus einer Referenz, sondern eine Sperre
 *  gegen das Haengenbleiben: ein Lauf, der nicht endet, ist ein Fehler, und
 *  ohne Grenze wuerde er den Runner blockieren statt zu melden. */
const LAUF_HORIZONT_S = 3600;

/** **Wie ein Bot zwischen drei Karten waehlt** (v303, S-N1-02).
 *
 *  **Die Bewertung darf nicht von dem abhaengen, was gemessen wird**
 *  (Regel 4). Gemessen wird, ob es eine Karte gibt, die IMMER oder NIE
 *  genommen wird; eine Bewertung, die die Karten nach ihrer gemessenen
 *  Wirkung sortierte, machte daraus einen Zirkel - sie naehme immer die
 *  staerkste, und die Messung faende genau das.
 *
 *  Gewaehlt wird deshalb nach dem STIL, nicht nach der Staerke: jeder Bot hat
 *  eine Vorliebe fuer eine Achse, und innerhalb der angebotenen drei nimmt er
 *  die, die am besten dazu passt. Das ist die Entscheidung, die ein Spieler
 *  trifft ("ich spiele auf Reichweite"), und sie ist unabhaengig davon, was
 *  am Ende dabei herauskommt.
 *
 *  Passt keine, entscheidet die Reihenfolge des Angebots - also der Zug, und
 *  damit die Aussaat. Ein Bot, der bei Gleichstand immer die erste nimmt,
 *  waere sonst ein Bot mit einer heimlichen dreizehnten Vorliebe. */
const KARTENSTIL: Record<string, KartenArt[]> = {
  // Der Meister nimmt, was die Tuerme staerker macht - er baut zwoelf und
  // will, dass jeder zaehlt.
  Meister: ['schaden', 'takt'],
  // Breite kauft Stueckzahl, also Gold und Beute.
  Breite: ['gold', 'beute'],
  // Sparsam haelt Ruecklage und wenige Stellungen: Reichweite und Kristall.
  Sparsam: ['reichweite', 'kristall'],
};

function karteWaehlen(stil: string, angebot: Karte[]): Karte {
  const vorliebe = KARTENSTIL[stil] ?? [];
  for (const art of vorliebe) {
    const treffer = angebot.filter((k) => k.art === art);
    if (treffer.length) {
      // Innerhalb der Vorliebe die staerkere - das ist keine Bewertung ueber
      // die Achsen hinweg, sondern die triviale Wahl zwischen zwei Karten
      // derselben Art.
      return treffer.reduce((a, b) => (b.wert > a.wert === (art !== 'takt') ? b : a));
    }
  }
  return angebot[0];
}

/** **Wird jede Karte irgendwann genommen, und keine immer?** (S-N1-02)
 *
 *  Die Abnahme der Story in einer Zahl. Gefahren wird der Zug ueber alle
 *  Wellen eines Laufs, fuer jeden der drei Stile - ohne zu spielen: der Zug
 *  haengt nur an Aussaat und Welle, und die Wahl nur am Stil. Eine Partie
 *  dazwischen brauchte diese Frage nicht und traege ihre Wegabhaengigkeit
 *  mit hinein. */
function kartenzugMessen(stapel: readonly Karte[], was: string): void {
  console.log(`\nKartenzug je Welle (S-N1-02) - ${was}, ${stapel.length} Karten:`);
  const wellen = MAPS.reduce((a, m) => a + m.waves.length, 0);
  const stile = Object.keys(KARTENSTIL);
  const genommen = new Map<string, Set<string>>();   // Karte -> Stile
  const angeboten = new Map<string, number>();
  for (const stil of stile) {
    const zaehl = new Map<string, number>();
    for (let w = 0; w < wellen; w += 1) {
      const angebot = zieheKarten(AUSSAATEN[0], w, undefined, stapel);
      for (const k of angebot) angeboten.set(k.id, (angeboten.get(k.id) ?? 0) + 1);
      const gewaehlt = karteWaehlen(stil, angebot);
      zaehl.set(gewaehlt.id, (zaehl.get(gewaehlt.id) ?? 0) + 1);
      if (!genommen.has(gewaehlt.id)) genommen.set(gewaehlt.id, new Set());
      genommen.get(gewaehlt.id)!.add(stil);
    }
    const oben = [...zaehl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    console.log(`  ${stil.padEnd(9)} ${oben.map(([id, n]) => `${id} ${n}`).join('  ')}`
      + `   (${zaehl.size} verschiedene von ${stapel.length})`);
  }

  // **Erstens: der Zug ist deterministisch.** Zweimal dieselbe Aussaat, und
  // zwar an einer SPAETEN Welle - die erste zoege auch aus einem kaputten
  // Zufall dasselbe.
  const a1 = zieheKarten(AUSSAATEN[0], 37, undefined, stapel).map((k) => k.id).join(',');
  const a2 = zieheKarten(AUSSAATEN[0], 37, undefined, stapel).map((k) => k.id).join(',');
  const b1 = zieheKarten(AUSSAATEN[1], 37, undefined, stapel).map((k) => k.id).join(',');
  console.log(`  Welle 38: Aussaat A "${a1}", noch einmal "${a2}", Aussaat B "${b1}".`);
  if (a1 !== a2) {
    errors.push(`Der Kartenzug ist nicht deterministisch: dieselbe Aussaat zieht in `
      + `derselben Welle "${a1}" und "${a2}". Dann laesst sich kein Lauf nachstellen.`);
  }
  if (a1 === b1) {
    errors.push(`Zwei verschiedene Aussaaten ziehen in Welle 38 dasselbe ("${a1}"). `
      + 'Dann haengt der Zug gar nicht an der Aussaat.');
  }

  // **Zweitens: keine Karte liegt tot im Stapel, und keine wird von allen
  //   genommen.** Das ist die Abnahme der Story, woertlich.
  const nie = stapel.filter((k) => !genommen.has(k.id));
  if (nie.length) {
    errors.push(`Diese Karten nimmt kein Stil je: ${nie.map((k) => k.id).join(', ')}. `
      + 'Eine Karte, die nie die richtige Wahl ist, ist keine Wahl, sondern Fuellmaterial '
      + '- sie macht das Angebot kleiner, ohne dass es jemand sieht.');
  }
  const immer = stapel.filter((k) => (genommen.get(k.id)?.size ?? 0) === stile.length
    && (angeboten.get(k.id) ?? 0) > 0
    && stile.every((stil) => {
      for (let w = 0; w < wellen; w += 1) {
        const angebot = zieheKarten(AUSSAATEN[0], w, undefined, stapel);
        if (angebot.some((x) => x.id === k.id) && karteWaehlen(stil, angebot).id !== k.id) {
          return false;
        }
      }
      return true;
    }));
  if (immer.length) {
    errors.push(`Diese Karten nimmt JEDER Stil, sooft sie angeboten werden: `
      + `${immer.map((k) => k.id).join(', ')}. Dann ist die Wahl keine - wer sie sieht, `
      + 'nimmt sie, und die anderen zwei Karten sind Dekoration.');
  }
  console.log(`  ${stapel.length - nie.length} von ${stapel.length} Karten `
    + `werden von mindestens einem Stil genommen, ${immer.length} von jedem immer.`);
}

/** **Wieviel eine Abschnittswahl ausmacht** (S-N1-03).
 *
 *  Gemessen wird die AUFLAGE bei gleicher Karte: dieselbe Grenze, dasselbe
 *  Ziel, dreimal - einmal je Art. Damit misst die Zahl die Wahl und nicht
 *  den Unterschied zwischen zwei Karten, und die Nullprobe der Story
 *  ("beide Angebote gleich machen") laesst die Spreizung wirklich auf null
 *  fallen statt auf den Kartenabstand.
 *
 *  Gemessen an den Grenzen 1 und 2 - nicht an 3: dort liegt heute die Wand
 *  aus N1K, und ein Abschnitt, den keine Auflage gewinnt, misst die Kurve
 *  statt der Wahl (Regel 13). */
// Gemessen 142,4 in v305 (Grenze 1: reich 1121 gegen ruhig 985; Grenze 2:
// ruhig 988 gegen gerade 839). Die Schwelle steht bei einem knappen Viertel
// davon: sie soll melden, dass die Wahl ueberhaupt etwas AUSMACHT, nicht wie
// stark - dafuer ist die Auflage noch nicht geeicht (N1K). Die Nullprobe der
// Story gibt exakt 0, denn ohne Unterschied zwischen den Auflagen laufen drei
// gleiche Aussaaten durch dieselbe Rechnung.
const WAHL_SPREIZUNG_MIN = 40;

function wahlNutzen(r: Result): number {
  // Gewinnen zaehlt am schwersten, dann der Kristall, und das uebrige Gold
  // nur noch als Feinheit - es ist am Ende eines Abschnitts fast nichts wert.
  return (r.won ? 500 : 0) + r.lives * 10 + (r.earned - r.spent) / 20;
}

function abschnittswahlMessen(): void {
  console.log('\nDie Abschnittswahl (S-N1-03):');
  const bester = new Map<string, number>();
  for (const a of WAHLARTEN) bester.set(a.id, 0);
  const spreizungen: number[] = [];
  let faelle = 0;

  for (const grenze of [1, 2]) {
    // Bis an die Grenze fahren - ohne zu spielen. Gebraucht werden nur der
    // Wellenversatz und das Angebot, und beides ist gerechnet.
    let l = laufStarten('normal', AUSSAATEN[0]);
    while (l.abschnitt < grenze) {
      const karte = laufendeKarte(l)!;
      l = abschnittGeschafft(l, 0, 0, wellenDesAbschnitts(karte));
      const angebot = abschnittsWahl(l);
      if (angebot.length) l = abschnittWaehlen(l, angebot[0].id);
    }
    // Und jetzt die Wahl selbst: dieselbe Karte, jede Auflage einmal.
    const offen = abschnittGeschafft(l, 0, 0, 0);
    const angebote: AbschnittsAngebot[] = abschnittsWahl(offen);
    const karte = angebote.length ? angebote[0].karte : laufendeKarte(l)!;
    const werte: { art: string; nutzen: number; r: Result }[] = [];
    for (const art of WAHLARTEN) {
      const r = play(mixedPlanBase, () => 0, MEISTER, 'normal', karte, {
        seed: l.saat, laufAbschnitt: l.abschnitt,
        druck: art.druck, beute: art.beute,
      });
      werte.push({ art: art.id, nutzen: wahlNutzen(r), r });
    }
    werte.sort((a, b) => b.nutzen - a.nutzen);
    bester.set(werte[0].art, (bester.get(werte[0].art) ?? 0) + 1);
    spreizungen.push(werte[0].nutzen - werte[werte.length - 1].nutzen);
    faelle += 1;
    console.log(`  Grenze ${grenze} (${karte}): `
      + werte.map((w) => `${w.art} ${w.nutzen.toFixed(0)}`
        + ` (${w.r.won ? `${w.r.lives} Kristall` : `Welle ${w.r.wave}`})`).join(' · '));
  }

  const spreizung = spreizungen.reduce((a, b) => a + b, 0) / Math.max(1, spreizungen.length);
  const immer = [...bester.entries()].filter(([, n]) => n === faelle);
  console.log(`  Spreizung ${spreizung.toFixed(1)} ueber ${faelle} Grenzen `
    + `(Soll >= ${WAHL_SPREIZUNG_MIN}), beste Auflage je Grenze: `
    + [...bester.entries()].map(([id, n]) => `${id} ${n}`).join(', '));

  // **Die Abnahme der Story, woertlich - und die Gegenprobe faellt genau
  //   hier durch**: sind alle Auflagen gleich, geht jede Grenze gleich aus.
  if (spreizung < WAHL_SPREIZUNG_MIN) {
    errors.push(`Die Abschnittswahl ist folgenlos: die Spreizung zwischen der besten `
      + `und der schlechtesten Auflage betraegt ${spreizung.toFixed(1)} von verlangten `
      + `${WAHL_SPREIZUNG_MIN}. Drei Angebote, die gleich ausgehen, sind ein Angebot `
      + 'mit drei Namen.');
  }
  // Und die andere Richtung: eine Auflage, die IMMER vorn liegt, ist keine
  // Wahl, sondern eine Ansage. Sie steht heute als Hinweis da und nicht als
  // Fehler - zwei Grenzen sind zu wenig, um "immer" zu behaupten, und die
  // Wand aus N1K haelt die dritte besetzt.
  if (immer.length) {
    console.log(`  OFFEN (N1-Wahl): ${immer.map(([id]) => id).join(', ')} liegt an allen `
      + `${faelle} gemessenen Grenzen vorn. Zwei Grenzen beweisen kein "immer" - `
      + 'die dritte ist heute die Wand aus N1K, und geeicht wird die Auflage, sobald '
      + 'die Kurve des Laufs steht.');
  }
}

/** **Was ein Lauf einbringt - und dass die Messung nichts davon merkt**
 *  (v306, S-N1-04).
 *
 *  Zwei Abnahmen der Story in einem Abschnitt, und die zweite ist die
 *  wichtigere: `npm run sim` darf nicht davon abhaengen, wieviel derjenige
 *  gespielt hat, der es fahren laesst (Regel 4). Sonst misst der Runner
 *  etwas anderes als ich, und beide haetten recht.
 *
 *  Geprueft wird das MECHANISCH und mit Nullprobe (Regel 13): erst wird in
 *  der Ablage wirklich eine Karte freigeschaltet, dann muss ein Spiel mit
 *  `stapel: []` trotzdem den Grundstapel haben - und ein Spiel OHNE die
 *  Angabe muss die freigeschaltete sehen. Ohne die zweite Haelfte bewiese
 *  die erste nur, dass der Eingriff nicht angekommen ist. */
function erfahrungMessen(): void {
  console.log('\nErfahrung je Lauf (S-N1-04):');

  // Ein ganzer Lauf, alle Abschnitte gewonnen - gerechnet, nicht gespielt:
  // was ein Lauf EINBRINGT, haengt an seinen Zahlen und nicht am Bot.
  let ganz = laufStarten('normal', AUSSAATEN[0]);
  while (!istLaufZuEnde(ganz)) {
    ganz = abschnittGeschafft(ganz, 0, 0, wellenDesAbschnitts(laufendeKarte(ganz) ?? ''));
    const angebot = abschnittsWahl(ganz);
    if (angebot.length) ganz = abschnittWaehlen(ganz, angebot[0].id);
  }
  const gewonnen = erfahrungFuer(ganz, true);

  // **Der Wellenzaehler zaehlt wirklich durch** (S-N1-01, neu geprueft in
  // v309). Bis v308 hing die Lebenskurve daran und der Fehler waere in der
  // Rampe aufgefallen; seit die Kurve am ABSCHNITT haengt, traegt der Zaehler
  // nur noch die Erfahrung und die Laenge - und haette still falsch sein
  // koennen. Ein Wert, den kein Tor mehr haelt, ist ein Wert ohne Zusage
  // (K1).
  if (ganz.welleGesamt !== wellenDesLaufs(ganz)) {
    errors.push(`Der Lauf hat ${ganz.abschnitte.length} Abschnitte mit zusammen `
      + `${wellenDesLaufs(ganz)} Wellen, sein Zaehler steht aber auf `
      + `${ganz.welleGesamt}. Dann zaehlt er nicht durch, und die Erfahrung eines `
      + 'Laufs haengt an einer Zahl, die es nicht gibt.');
  }

  // Und ein Lauf, der im zweiten Abschnitt in Welle 9 endet.
  let kurz = laufStarten('normal', AUSSAATEN[0]);
  kurz = abschnittGeschafft(kurz, 0, 0, wellenDesAbschnitts(laufendeKarte(kurz) ?? ''));
  const angebot = abschnittsWahl(kurz);
  if (angebot.length) kurz = abschnittWaehlen(kurz, angebot[0].id);
  const verloren = erfahrungFuer({ ...kurz, welleGesamt: kurz.welleGesamt + 9 }, false);

  const stapelPreis = KARTENSTAPEL.reduce((a, k) => a + k.kosten, 0);
  console.log(`  gewonnen ${gewonnen} · in Welle 9 des zweiten Abschnitts verloren `
    + `${verloren} (${(gewonnen / Math.max(1, verloren)).toFixed(1)}-fach)`);
  console.log(`  Der ganze Stapel kostet ${stapelPreis} - `
    + `${(stapelPreis / Math.max(1, gewonnen)).toFixed(1)} gewonnene Laeufe.`);

  if (verloren <= 0) {
    errors.push('Ein verlorener Lauf bringt nichts. Dann ist ein Roguelite eine Kette '
      + 'von Niederlagen, und die Story haelt ihre erste Abnahme nicht.');
  }
  // Das Verhaeltnis kommt aus der Referenz, nicht aus mir (Regel 10): Rogue
  // Tower gibt 450 fuers Durchspielen und 1350 fuer den Sieg, also das
  // Dreifache. Verlangt wird mindestens das Doppelte - eine Niederlage muss
  // spuerbar weniger bringen, ohne dass sie sich nicht lohnt.
  if (gewonnen < verloren * 2) {
    errors.push(`Ein gewonnener Lauf bringt ${gewonnen}, ein verlorener ${verloren} - `
      + 'weniger als das Doppelte. Dann lohnt sich das Gewinnen nicht.');
  }

  // **Regel 4, mechanisch.**
  const vorher = laufErfahrung();
  laufErfahrungGutschreiben(5000);
  const gekauft = KARTENSTAPEL.find((k) => k.kosten > 0);
  if (!gekauft || !karteFreischalten(gekauft.id, gekauft.kosten)) {
    errors.push('Der Regel-4-Selbsttest konnte keine Karte freischalten - dann prueft '
      + 'er nichts. Eine Pruefung, deren Eingriff nicht ankommt, sieht aus wie eine '
      + 'bestandene (Regel 3).');
  } else {
    const mitAblage = new GameState(MAPS[0].id);
    mitAblage.reset(1, 'normal', MAPS[0].id, { karten: MAPS.length });
    const ohneAblage = new GameState(MAPS[0].id);
    ohneAblage.reset(1, 'normal', MAPS[0].id, { karten: MAPS.length, stapel: [] });
    console.log(`  Regel 4: mit Ablage ${mitAblage.kartenStapel.length} Karten, `
      + `wie die Werkzeuge fahren ${ohneAblage.kartenStapel.length} `
      + `(Grundstapel ${GRUNDSTAPEL.length}).`);
    if (ohneAblage.kartenStapel.length !== GRUNDSTAPEL.length) {
      errors.push(`Ein Spiel mit "stapel: []" zieht aus ${ohneAblage.kartenStapel.length} `
        + `Karten statt aus ${GRUNDSTAPEL.length}. Dann haengt die Messung daran, wieviel `
        + 'derjenige gespielt hat, der sie fahren laesst (Regel 4).');
    }
    if (mitAblage.kartenStapel.length !== GRUNDSTAPEL.length + 1) {
      errors.push('Die Nullprobe traegt nicht: auch OHNE die Angabe sieht das Spiel die '
        + 'freigeschaltete Karte nicht. Dann beweist die Zeile darueber nichts.');
    }
  }
  void vorher;
}

function laufMessen(steigung = LAUF_STEIGUNG, bot: Bot = MEISTER): void {
  console.log(`\nDer Lauf ueber alle Abschnitte (S-N1-01), Steigung `
    + `${steigung.toFixed(2)}, Stil ${bot.name}:`);
  let lauf = laufStarten('normal', AUSSAATEN[0]);
  const gesamt = wellenDesLaufs(lauf);
  const rampen: number[] = [];
  let dauer = 0;
  let gefahren = 0;
  let abschnitte = 0;
  const gewaehlt: string[] = [];
  let karten = 0;
  const verluste: number[] = [];

  while (!istLaufZuEnde(lauf)) {
    const karte = laufendeKarte(lauf)!;
    const mm = MAPS.find((m) => m.id === karte)!;
    // Die Rampe der ERSTEN Welle dieses Abschnitts - gerechnet, nicht
    // erspielt.
    void mm;
    const r = play(bot.plan ?? mixedPlanBase, () => 0, bot, 'normal', karte, {
      seed: lauf.saat, laufAbschnitt: lauf.abschnitt, laufSteigung: steigung,
      // **Mit Deck** (v308, N1K). Bis v307 fuhr dieser Lauf ohne - und die
      // Rampe von 14,89 war damit gegen einen Spieler gemessen, der in
      // Welle 46 fuenfundvierzig Karten genommen haette.
      zugStil: bot.name,
    });
    karten += r.gezogeneKarten;
    // **Die Rampe wird ABGELESEN, nicht nachgerechnet** (v310). Bis dahin
    // stand hier dieselbe Formel ein zweites Mal - und die Gegenprobe zum
    // Lauffaktor lief deshalb ins Leere: sie baute den Fehler ins Spiel ein,
    // und diese Tabelle blieb unveraendert.
    rampen.push(r.rampe);
    dauer += r.dauer;
    verluste.push(r.maxLives - r.lives);
    const wellen = r.won ? wellenDesAbschnitts(karte) : r.wave;
    gefahren += wellen;
    abschnitte += r.won ? 1 : 0;
    console.log(`  ${String(lauf.abschnitt + 1)}. ${karte.padEnd(14)} `
      + `Rampe ${rampen[rampen.length - 1].toFixed(2)}   `
      + `${r.won ? 'gewonnen' : `verloren in Welle ${r.wave}`}, `
      + `Kristall ${r.lives}/${r.maxLives}, ${r.dauer.toFixed(0)} s`);
    // Weiter geht es auch nach einer Niederlage: gemessen wird hier der
    // LAUF, nicht das Koennen des Bots.
    lauf = abschnittGeschafft(lauf, r.earned - r.spent, r.lives, wellen);
    // **Und an der Grenze wird gewaehlt** (S-N1-03). Der Bot nimmt den
    // Klaren Weg, wo es ihn gibt - dieser Lauf misst die KURVE, und eine
    // Auflage darueber machte aus zwei Befunden einen. Was die Wahl
    // ausmacht, misst `abschnittswahlMessen` eigens.
    const angebot = abschnittsWahl(lauf);
    if (angebot.length) {
      const nimm = angebot.find((a) => a.art === 'gerade') ?? angebot[0];
      lauf = abschnittWaehlen(lauf, nimm.id);
      gewaehlt.push(`${nimm.name} (${nimm.auflage})`);
    }
  }

  console.log(`  ${abschnitte} von ${lauf.abschnitte.length} Abschnitten gewonnen, `
    + `${gefahren} von ${gesamt} Wellen gefahren, ${dauer.toFixed(0)} s `
    + `(Horizont ${LAUF_HORIZONT_S} s).`);
  console.log(`  Rampe je Abschnitt: ${rampen.map((r) => r.toFixed(2)).join(' -> ')}`);
  console.log(`  Karten gezogen: ${karten} von ${gefahren} gefahrenen Wellen.`);
  if (karten < gefahren) {
    errors.push(`Der Lauf hat ${karten} Karten bei ${gefahren} gefahrenen Wellen gezogen. `
      + 'Je Welle steht eine zur Wahl; wer weniger zieht, misst die Kurve gegen einen '
      + 'Spieler, den es nicht gibt.');
  }
  if (gewaehlt.length) console.log(`  Gewaehlt an den Grenzen: ${gewaehlt.join(' -> ')}`);
  if (lauf.gewaehlt.length !== lauf.abschnitte.length - 1) {
    errors.push(`Der Lauf hat ${lauf.abschnitte.length} Abschnitte, aber nur `
      + `${lauf.gewaehlt.length} Wahlen. An jeder Grenze steht eine - sonst faellt der `
      + 'Lauf still auf seinen Plan zurueck, und die Wahl waere ein Bild ohne Wirkung.');
  }

  if (dauer > LAUF_HORIZONT_S) {
    errors.push(`Ein voller Lauf dauert ${dauer.toFixed(0)} s und sprengt damit den `
      + `Horizont von ${LAUF_HORIZONT_S} s. Ein Lauf, der nicht endet, blockiert den `
      + 'Runner, statt etwas zu melden.');
  }
  // **Die Zusage: die Kurve steigt ueber die Abschnitte.**
  //
  // Nicht "irgendwie hoeher", sondern JEDER Abschnitt ueber seinem Vorgaenger
  // - sonst genuegte ein einziger steiler Abschnitt am Ende, und die drei
  // davor duerften von vorn anfangen. Der Kartenausgleich (`hpMul`) darf sie
  // dabei nicht umdrehen; taete er es, waere das ein Befund ueber die Karten
  // und nicht ueber den Lauf.
  // **Und der Befund, den dieser erste Lauf sofort geliefert hat** (v302).
  //
  // Die Lebenskurve ist an einer Karte mit 15 Wellen geeicht: ein flacher
  // Anfang, ein Knie bei 55 bis 92 % und ein Ende bei `hpEnd`. Ueber 60
  // Wellen gestreckt liegen die ersten drei Abschnitte im flachen Teil und
  // der vierte mitten im Knie - gemessen 1,00 / 1,12 / 1,82 / **15,17**.
  // Der Bot gewinnt die ersten drei mit 42 von 42 Kristall und verliert den
  // vierten in Welle 7.
  //
  // **Das ist kein Fehler dieser Story, sondern ihre erste Auskunft**: der
  // Wellenzaehler ueber die Abschnitte hinweg ist richtig, die KURVENFORM
  // dafuer nicht. Sie steht deshalb als Hinweis da und macht die Kette nicht
  // rot - der Lauf ist heute nur aus diesem Werkzeug erreichbar, und ein Tor,
  // das eine unfertige Mechanik rot macht, blockiert jede Runde danach statt
  // etwas zu halten. Die Zahl steht im Verzeichnis.
  // **Die Nullprobe zum Deck** (Regel 13): derselbe letzte Abschnitt, mit
  // demselben Versatz, einmal OHNE Karten. Ohne sie bezeugt der Lauf oben,
  // dass ein Deck getragen hat, ohne es je geprueft zu haben.
  const letzte = lauf.abschnitte[lauf.abschnitte.length - 1];
  const ohneDeck = play(mixedPlanBase, () => 0, MEISTER, 'normal', letzte, {
    seed: lauf.saat, laufAbschnitt: lauf.abschnitte.length - 1,
    laufSteigung: steigung,
  });
  const mitDeck = play(mixedPlanBase, () => 0, MEISTER, 'normal', letzte, {
    seed: lauf.saat, laufAbschnitt: lauf.abschnitte.length - 1,
    laufSteigung: steigung, zugStil: MEISTER.name,
  });
  console.log(`  Letzter Abschnitt (${letzte}) ohne Deck: `
    + `${ohneDeck.won ? 'gewonnen' : `verloren in Welle ${ohneDeck.wave}`}, `
    + `Kristall ${ohneDeck.lives} - mit Deck: `
    + `${mitDeck.won ? 'gewonnen' : `verloren in Welle ${mitDeck.wave}`}, `
    + `Kristall ${mitDeck.lives} (${mitDeck.gezogeneKarten} Karten).`);
  if (mitDeck.gezogeneKarten === 0) {
    errors.push('Die Nullprobe zum Deck zieht selbst keine Karten - dann vergleicht '
      + 'sie zweimal dasselbe und beweist nichts (Regel 3).');
  }

  // **N1K sagt seit v308 etwas anderes - und zwar, weil die Messung sich
  //   geaendert hat, nicht das Spiel** (Regel 12).
  //
  // Bis v307 stand hier: "die Rampe waechst um das 15-fache, und der letzte
  // Abschnitt ist so nicht zu gewinnen." Beide Haelften waren gegen einen Bot
  // OHNE Deck gemessen - gegen einen Spieler, der in Welle 46 fuenfundvierzig
  // Karten genommen haette. Mit Deck gewinnt derselbe Lauf alle vier
  // Abschnitte, und die Nullprobe oben sagt, dass es das Deck war: derselbe
  // letzte Abschnitt faellt ohne Karten in Welle 9 und geht mit Karten mit 36
  // von 42 Kristall aus. Die Rampe von 14,89 ist damit nicht zu steil,
  // sondern die Antwort auf ein Deck, das ueber sechzig Wellen waechst.
  //
  // **Was uebrig bleibt, ist die andere Haelfte, und die ist echt:** die
  // ersten Abschnitte kosten NICHTS. Wer 45 Wellen ohne einen einzigen
  // Kristall Verlust laeuft, spielt drei Spaziergaenge - und das misst diese
  // Zeile jetzt, statt eine Rampe zu beurteilen, deren Groesse gar nicht das
  // Problem war.
  const spanne = rampen[rampen.length - 1] / Math.max(0.01, rampen[0]);
  const makellos = verluste.filter((v) => v === 0).length;
  console.log(`  Kristallverlust je Abschnitt: ${verluste.join(' / ')} `
    + `(${makellos} von ${verluste.length} ohne einen Kratzer, Rampe ${spanne.toFixed(0)}-fach).`);
  // **Was diese Runde nebenbei gemessen hat und was noch offen ist** (N1G).
  //
  // Der Stil `Breite` bevorzugt Gold und Beute - und ist der einzige, der an
  // der Laufkurve bricht: bei Steigung 1,0 gewinnt er alle vier Abschnitte,
  // bei 1,3 drei, bei 1,6 zwei. Die Ursache steht im Modell: Gold kauft
  // Tuerme, die Turmzahl ist gedeckelt, also kauft diese Achse nach dem
  // Ausbau des Feldes nichts mehr. Ueber fuenfzehn Wellen faellt das nicht
  // auf, ueber sechzig entscheidet es - und vier der zwoelf Grundkarten
  // liegen darauf.
  console.log('  OFFEN (N1-Gold): Gold und Beute kaufen Tuerme, und die Turmzahl ist '
    + 'begrenzt - nach dem Ausbau kauft diese Achse nichts mehr. Gemessen: der Stil '
    + 'Breite gewinnt bei Steigung 1,0 alle vier Abschnitte, bei 1,3 drei, bei 1,6 zwei.');
  if (makellos > 1 || abschnitte < lauf.abschnitte.length) {
    console.log(`  OFFEN (N1-Kurve): ${makellos} von ${lauf.abschnitte.length} `
      + 'Abschnitten enden mit vollem Kristall, und '
      + `${lauf.abschnitte.length - abschnitte} sind nicht zu gewinnen. Ein Lauf, `
      + 'dessen erste Abschnitte nichts kosten, faengt erst in seiner zweiten '
      + 'Haelfte an. Erlaubt ist EINER - der erste darf eine Einfuehrung sein.');
  }
  for (let i = 1; i < rampen.length; i += 1) {
    if (rampen[i] <= rampen[i - 1]) {
      errors.push(`Die Lebenskurve steigt im Lauf nicht durch: Abschnitt ${i + 1} faengt `
        + `bei ${rampen[i].toFixed(2)} an, Abschnitt ${i} bei ${rampen[i - 1].toFixed(2)}. `
        + 'Dann ist ein Lauf vier Partien hintereinander und keine Klammer - genau das, '
        + 'was der Wellenzaehler ueber die Abschnitte hinweg verhindern soll.');
    }
  }
}

function vielfaltMessen(): void {
  console.log('\nVielfaltsbeute (Haeufen gegen Mischen, mit Zuschlag und ohne):');
  const haeufen: TowerId[] = ['arrow'];
  const mischen: TowerId[] = ['arrow', 'frost', 'mortar', 'prism'];
  const trennung: number[] = [];
  const gold = (plan: TowerId[], mapId: string, v: number) =>
    play(plan, () => 0, MEISTER, 'normal', mapId, { vielfalt: v }).earned;
  const haeuferGewinn: number[] = [];
  for (const mm of MAPS) {
    const h = gold(haeufen, mm.id, VIELFALT_MESS) - gold(haeufen, mm.id, 0);
    const m = gold(mischen, mm.id, VIELFALT_MESS) - gold(mischen, mm.id, 0);
    console.log(`  ${mm.id.padEnd(14)} Haeufen ${h >= 0 ? '+' : ''}${h} Gold, `
      + `Mischen ${m >= 0 ? '+' : ''}${m} - trennt um ${m - h >= 0 ? '+' : ''}${m - h}`);
    trennung.push(m - h);
    haeuferGewinn.push(h);
  }
  // **Die scharfe Zusage: der Haeufer bekommt NICHTS.**
  //
  // Sie ist keine Schaetzung, sondern eine Aussage ueber die Bauart: wer mit
  // einer einzigen Turmart toetet, hat an jedem Gegner `arten = 1`, und
  // `vielfaltsBeute` multipliziert dann mit genau 1. Gemessen sind es auf
  // allen vier Karten 0 Gold, auf die Muenze genau.
  //
  // Eine Zusage, die von Bauart immer haelt, waere kein Beweis (Regel 5) -
  // deshalb steht die Gegenprobe daneben: `arten - 1` zu `arten` gemacht,
  // und der Haeufer kassiert mit.
  const haeuferMax = Math.max(...haeuferGewinn.map((n) => Math.abs(n)));
  console.log(`  Der Haeufer gewinnt dabei ${haeuferMax} Gold (gefordert: 0 - `
    + 'wer eine Turmart baut, wird von einer Regel fuer Vielfalt nicht erreicht).');
  if (haeuferMax !== 0) {
    errors.push(`Die Vielfaltsbeute bringt dem Haeufer ${haeuferMax} Gold. Er toetet mit `
      + 'EINER Turmart, also darf eine Regel, die Vielfalt belohnt, ihn ueberhaupt nicht '
      + 'erreichen - sonst ist sie eine Geldspritze mit einem Namen.');
  }
  const kleinste = Math.min(...trennung);
  console.log(`  Kleinste Trennung: ${kleinste} Gold bei Zuschlag ${VIELFALT_MESS} `
    + `(gefordert > ${VIELFALT_TRENNUNG_MIN}) - `
    + `${VIELFALT_BEUTE > 0 ? 'das ist der ausgelieferte Wert'
      : `ausgeliefert steht er auf ${VIELFALT_BEUTE}, gemessen wird der gestellte Fall`}.`);
  // **Die Zusage haengt am GESTELLTEN Wert, nicht am ausgelieferten.**
  //
  // Der steht in v299 auf Null, und eine Zusage, die dann nichts mehr
  // prueft, ist keine (Regel 5) - genau die Falle, in die der erste Entwurf
  // gelaufen ist: `if (gesetzt > 0 && ...)` schweigt bei Null vollstaendig.
  // Was hier gehalten wird, ist die MECHANIK: wer mischt, muss mehr
  // bekommen als wer haeuft. Gemessen 100 bis 251 Gold je Karte.
  if (kleinste <= VIELFALT_TRENNUNG_MIN) {
    errors.push(`Die Vielfaltsbeute bringt dem Mischer auf einer Karte nur ${kleinste} Gold `
      + `mehr als dem Haeufer (gestellter Zuschlag ${VIELFALT_MESS}). Sie belohnt dann nicht `
      + 'Vielfalt, sondern schuettet Gold aus - und der Haeufer, der mit EINER Art toetet, '
      + 'bekaeme es genauso.');
  }
}

/** **Sind die sechs Wirkungen voneinander zu unterscheiden?** (S-N6-01)
 *
 *  Die Frage der Story ist nicht "wirkt jede", sondern "ist jede eine
 *  EIGENE Entscheidung". Ein Stapel, in dem zwei Karten dasselbe tun, hat
 *  eine Karte zu viel - und zwar eine, die man nie bereut und nie vermisst.
 *
 *  Gemessen wird je Karte des Spiels ein Lauf mit GENAU dieser Wirkung
 *  gegen einen Lauf ganz ohne. Der Abstand ist ein Zahlenpaar: was die
 *  Wirkung an Kristall haelt und was sie an Gold einbringt. Zwei Wirkungen
 *  gelten als dasselbe, wenn beide Zahlen auf ALLEN Karten uebereinstimmen -
 *  auf einer Karte kann sich viel zufaellig treffen, auf vieren nicht.
 *
 *  **Die Nullprobe ist der Lauf ohne jede Karte**, nicht der Lauf mit einer
 *  anderen Wirkung (Regel 13): sonst maesse die Zahl den Abstand zweier
 *  Wirkungen und nicht die Wirkung selbst, und wer beide gleich stark
 *  macht, bekaeme eine Null gemeldet, die nach "kein Unterschied" aussieht
 *  und "beide wirken gleich viel" heisst.
 *
 *  Gefahren wird auf EINER Bauliste mit allen vier Turmarten: eine Wirkung,
 *  die nur der Frostturm ausloest (Bremsdauer, Festfrieren), braucht ihn im
 *  Feld, und eine, die an der Entfernung haengt, braucht Tuerme in mehreren
 *  Abstaenden. */
const WIRKUNGSKARTEN = ['zunder', 'kerbe', 'eisgriff', 'zielfernrohr', 'bajonett', 'raureif'];

/** **Bestraft die Monokulturwelle wirklich die Monokultur?** (S-N6-04)
 *
 *  S-N3-02 und S-N3-03 haben Vielfalt billiger und eintraeglicher gemacht -
 *  der Verbund gibt Schaden je NACHBARART, die Vielfaltsbeute zahlt je
 *  Turmart, die einen Gegner beschaedigt hat. Beide belohnen; keiner
 *  ERZWINGT. Diese Messung schliesst den Kreis: eine Welle, an der ein Feld
 *  aus einer einzigen Turmart scheitert.
 *
 *  **Gemessen wird die Monokulturwelle allein, nicht eine ganze Partie.**
 *  Eine Partie misst fuenfzehn Wellen und ein Bauverhalten dazu; hier geht
 *  es um EINE Zusammensetzung. Gestellt werden fuenf Felder mit derselben
 *  Aussaat, denselben Plaetzen und demselben Gold - vier Monokulturen und
 *  ein gemischtes.
 *
 *  **Die Zusage ist ein VERGLEICH und keine absolute Zahl** (Regel 2): das
 *  gemischte Feld muss weniger durchlassen als JEDE Monokultur. Eine feste
 *  Grenze ("hoechstens drei kommen durch") haenge an der Wellenstaerke und
 *  wuerde still bedeutungslos, sobald jemand an ihr dreht.
 *
 *  **Und sie braucht ihre Gegenprobe von aussen**, nicht von innen: wird die
 *  Welle entschaerft, kommt auch die Monokultur durch, und die Messung muss
 *  das MELDEN statt zu schweigen. Deshalb steht unten nicht nur der
 *  Vergleich, sondern auch die Forderung, dass die Monokulturen ueberhaupt
 *  etwas durchlassen - eine Welle, die jeder haelt, bestraft niemanden. */
/** **Ein GESTELLTES Feld gegen eine GESTELLTE Welle** - der eine Ort, an dem
 *  das in diesem Werkzeug passiert.
 *
 *  Herausgeloest in v331 (S-N6-05), weil die Vorzeichenmessung genau dasselbe
 *  braucht: gleiches Gold, gleiche Plaetze, gleiche Zahl, gleicher Ausbau -
 *  nur eine Sache wechselt. Ein zweiter Aufbau daneben waere Regel 15 in
 *  Reinform gewesen, und in v311 hat genau das ein Tor seine eigene Kopie
 *  pruefen lassen.
 *
 *  `vz` geht unveraendert an `welleEinreihen` weiter: `undefined` heisst
 *  "wie im Spiel", `null` heisst "ausdruecklich keines".
 *
 *  **`kristall` hebt die Deckung auf.** Der Verlust je Gegner ist auf das
 *  gedeckelt, was der Kristall noch hat - wer bei 42 anfaengt, misst ab dem
 *  42. Punkt gar nichts mehr (Regel 2: eine Grenze, die der Gegenstand
 *  erreicht, hoert auf zu messen). Gemessen stand die Bogenreihe in Welle 14
 *  bei fuenf von sechs Vorzeichen auf demselben vollen Verlust. Mit einem
 *  unerreichbar hohen Kristall ist die Zahl der DURCHSCHLAG selbst, und der
 *  hat Aufloesung.
 *
 *  Gibt Kristallverlust, Rest und Zeit zurueck; wer davon was braucht,
 *  entscheidet der Aufrufer. */
interface GestelltErgebnis {
  /** Wieviel Kristall die Welle gekostet hat. */
  verlust: number;
  /** Wieviele Gegner am Ende noch ausstehen - Anmarsch und Feld. */
  offen: number;
  /** Dasselbe anteilig an der ganzen Welle (Regel 2). */
  anteil: number;
  /** Wie lange gerechnet wurde, in Sekunden. */
  sekunden: number;
}

function gestellteWelle(
  plan: TowerId[], wave: Wave, welle: number,
  opt: { vz?: Vorzeichen | null; kristall?: number; sekunden?: number } = {},
): GestelltErgebnis {
  const s = new GameState(MAPS[0].id);
  s.reset(AUSSAATEN[0], 'normal', MAPS[0].id,
    { perks: NO_PERKS, karten: MAPS.length, stapel: [] });
  // Gleiches Gold, gleiche Plaetze, gleiche Zahl - nur die Sorte wechselt.
  // Sonst maesse die Zahl den Preis der Tuerme und nicht ihre Rolle.
  s.gold = 100000;
  const plaetze = buildSpots(s);
  let i = 0;
  for (const sp of plaetze) {
    if (i >= GESTELLT_TUERME) break;
    if (s.build(sp.x, sp.y, plan[i % plan.length])) i++;
  }
  if (i < GESTELLT_TUERME) {
    errors.push(`Gestellte Welle: nur ${i} von ${GESTELLT_TUERME} Tuermen gesetzt - `
      + 'dann vergleicht die Messung verschieden grosse Felder.');
  }
  // **Mittlerer Ausbau, nicht voll** - das Feld, das ein Spieler in der
  // zwoelften Welle wirklich hat. Voll ausgebaut waere ein Endspielfeld,
  // und dort haelt jede Sorte alles; auf Grundstufe waere es ein Feld aus
  // der dritten Welle. Beides maesse etwas anderes als die Rolle.
  for (const t of s.gebaute) {
    for (let k = 0; k < GESTELLT_STUFEN; k++) s.upgrade(t, (t.id % 2) as 0 | 1);
  }
  if (opt.kristall !== undefined) s.lives = opt.kristall;
  const vorher = s.lives;
  // **Als SPAETE Welle eingereiht, nicht als erste** (Regel 12). Der erste
  // Entwurf stellte sie auf `welle: 0` - dort traegt jeder Gegner die
  // Lebenspunkte der ersten Welle, und drei der vier reinen Felder hielten
  // sie mit null Verlust. Die Zahl mass die Lebenskurve, nicht die
  // Zusammensetzung. `welle` ist der Platz im Plan, an dem die gestellte
  // Welle stuende.
  s.welleEinreihen(wave, welle, opt.vz);
  // Lang genug, dass die Welle wirklich durch ist - der letzte Gegner
  // startet nach 8 s und laeuft dann die ganze Bahn. Gefragt wird
  // `laufendeReste` und nicht die Gegnerliste: es zaehlt Anmarsch UND
  // Feld, und genau das heisst "die Welle ist durch".
  let bilder = 0;
  const offen = (): number => s.laufendeReste.reduce((n, l) => n + l.rest, 0);
  const gesamt = Math.max(1, offen());
  const horizont = 60 * (opt.sekunden ?? 120);
  for (; bilder < horizont && offen() > 0; bilder++) s.update(1 / 60);
  return {
    verlust: vorher - s.lives, offen: offen(), anteil: offen() / gesamt,
    sekunden: bilder / 60,
  };
}

function monokulturMessen(): void {
  console.log('\nMonokulturwelle (vier reine Felder gegen ein gemischtes, dieselbe Aussaat):');
  const felder: { was: string; plan: TowerId[] }[] = [
    { was: 'nur Bogen', plan: ['arrow'] },
    { was: 'nur Frost', plan: ['frost'] },
    { was: 'nur Moerser', plan: ['mortar'] },
    { was: 'nur Prisma', plan: ['prism'] },
    { was: 'gemischt', plan: ['arrow', 'frost', 'mortar', 'prism'] },
  ];
  const durch = (plan: TowerId[]): number => {
    const r = gestellteWelle(plan, MONOKULTURWELLE, MONOKULTUR_WELLE);
    // Diese Welle MUSS durch sein, wenn gezaehlt wird - sie ist so gebaut,
    // dass jede Sorte an ihr etwas durchlaesst, und ein abgeschnittener Lauf
    // zaehlte den Rest einfach nicht mit.
    if (r.offen > 0) {
      errors.push(`Monokulturwelle: nach ${r.sekunden.toFixed(0)} s stehen noch `
        + `${r.offen} Gegner aus - die Welle war nicht durch, als gezaehlt wurde.`);
    }
    return r.verlust;
  };
  const werte = felder.map((f) => ({ ...f, verlust: durch(f.plan) }));
  for (const w of werte) {
    console.log(`  ${w.was.padEnd(12)} ${w.verlust} Kristall verloren`);
  }
  const gemischt = werte[werte.length - 1];
  const reine = werte.slice(0, -1);
  const beste = reine.reduce((a, b) => (b.verlust < a.verlust ? b : a));
  console.log(`  Bestes reines Feld: ${beste.was} mit ${beste.verlust}, `
    + `gemischt ${gemischt.verlust}.`);
  // **Kommt ueberhaupt etwas durch?** Ohne diese Zeile bestuende die Messung
  // jede entschaerfte Welle: 0 gegen 0 ist kein Unterschied, sieht aber aus
  // wie "das gemischte Feld ist nicht schlechter" (Regel 5).
  if (beste.verlust === 0) {
    errors.push('Monokulturwelle: selbst das beste REINE Feld verliert keinen Kristall. '
      + 'Dann bestraft diese Welle keine Monokultur - sie ist eine Welle wie jede andere, '
      + 'und der Vergleich darunter prueft nichts.');
    return;
  }
  if (gemischt.verlust >= beste.verlust) {
    errors.push(`Monokulturwelle: das gemischte Feld verliert ${gemischt.verlust} Kristall, `
      + `das beste reine (${beste.was}) ${beste.verlust}. Wenn Mischen nicht besser ist, `
      + 'belohnt diese Welle die Vielfalt nicht - und S-N3-02 und S-N3-03 haben nichts, '
      + 'worauf sie einzahlen.');
  }
}

/** Der Platz im Wellenplan, an dem die Monokulturwelle gemessen wird. Zwoelf
 *  ist die zwoelfte von fuenfzehn - spaet genug, dass ein ausgebautes Feld
 *  dasteht, und frueh genug, dass es nicht die Bosswelle ist. */
const MONOKULTUR_WELLE = 12;
/** Wie weit die Tuerme eines gestellten Feldes ausgebaut sind - Stufe 3 von
 *  6. */
const GESTELLT_STUFEN = 2;
/** Wieviele Tuerme ein gestelltes Feld bekommt. Zwoelf wie bei
 *  jeder anderen Messung dieses Werkzeugs - drei je Sorte im gemischten
 *  Feld, also die Zahl, fuer die die Freimenge des Wiederholungsaufschlags
 *  gemacht ist (v287). */
const GESTELLT_TUERME = 12;

/** **Die Welle, auf der die Vorzeichen gemessen werden.**
 *
 *  Eine ECHTE Welle aus dem Plan der ersten Karte, nicht die
 *  Monokulturwelle: die ist eigens so gebaut, dass jede Turmsorte an ihr
 *  scheitert, und ueber ihr saehen sechs Vorzeichen einander aehnlicher, als
 *  sie sind. Genommen wird die elfte - spaet genug fuer ein ausgebautes
 *  Feld, und die Nummer, auf der auch `VORZEICHEN_TAKT` eines ausspielt. */
const VZ_WELLE = 13;
/** Wie lange je gestelltem Feld gerechnet wird. Nicht "bis die Welle durch
 *  ist": ein reines Frostfeld toetet nichts, seine Welle ist NIE durch, und
 *  ein Lauf ohne Ende waere keine Messung. Sechzig Sekunden sind laenger,
 *  als die Welle zum Anmarsch braucht - was danach noch steht, steht als
 *  Rest daneben. */
const VZ_SEKUNDEN = 60;
/** Der Kristall der gestellten Felder - unerreichbar hoch, damit die Deckung
 *  nicht misst (siehe `gestellteWelle`). */
const VZ_KRISTALL = 1000000;

/** **Ist jedes Vorzeichen von den anderen zu unterscheiden?** (S-N6-05)
 *
 *  Dieselbe Bauart wie die Wirkungsmessung aus v327 und aus demselben Grund:
 *  zwei Vorzeichen, gegen die man dasselbe tut, sind ein Vorzeichen mit zwei
 *  Namen - und die Ankuendigung ueber der Welle waere dann eine Verzierung.
 *
 *  **Gemessen wird gegen VIER REINE Felder, nicht gegen eines.** Das ist der
 *  Punkt der ganzen Messung und nicht ihre Genauigkeit: ein Vorzeichen ist
 *  eine Frage nach der ANTWORT, und eine Antwort ist eine Turmsorte. Ueber
 *  ein gemischtes Feld gemittelt saehen Eisenregen und Bollwerk gleich aus -
 *  beide machen die Welle haerter. Getrennt nach Sorten sagt der Abdruck,
 *  WELCHER Turm daran scheitert, und genau das soll der Spieler lesen.
 *
 *  Verglichen wird jeweils gegen denselben Lauf OHNE Vorzeichen (Regel 13) -
 *  sonst maesse die Zahl die Welle und nicht das Zeichen darueber. */
function vorzeichenMessen(): void {
  console.log(`\nVorzeichen (jedes gegen keines, je reinem Feld, Welle ${VZ_WELLE + 1} `
    + `des Spiralhains, ${VZ_SEKUNDEN} s, Kristall ohne Deckung):`);
  const felder: { was: string; plan: TowerId[] }[] = [
    { was: 'Bogen', plan: ['arrow'] },
    { was: 'Frost', plan: ['frost'] },
    { was: 'Moerser', plan: ['mortar'] },
    { was: 'Prisma', plan: ['prism'] },
  ];
  const welle = PLAN_SPIRALHAIN[VZ_WELLE];
  if (!welle) {
    errors.push(`Die Vorzeichenmessung kennt Welle ${VZ_WELLE + 1} des Spiralhains nicht - `
      + 'der Plan ist kuerzer geworden, und die Messung faehrt seitdem ins Leere (Regel 5).');
    return;
  }
  // **Die Nullprobe einmal je Feld**, nicht je Vorzeichen: derselbe Lauf,
  // dieselbe Aussaat, dasselbe Ergebnis. Sechsmal gefahren waere sie auch
  // nicht EINE Nullprobe mehr, sondern sechs, die zufaellig gleich ausgehen.
  const fahren = (plan: TowerId[], vz: Vorzeichen | null): number =>
    gestellteWelle(plan, welle, VZ_WELLE,
      { vz, kristall: VZ_KRISTALL, sekunden: VZ_SEKUNDEN }).verlust;
  const ohne = felder.map((f) => fahren(f.plan, null));
  console.log(`  ${'ohne Vorzeichen'.padEnd(16)} `
    + felder.map((f, i) => `${f.was} ${String(ohne[i]).padStart(3)}`).join('  ')
    + '   (Durchschlag)');
  const abdruck = new Map<string, string>();
  for (const vz of VORZEICHEN_ORDNUNG) {
    const spur = felder.map((f, i) => fahren(f.plan, vz) - ohne[i]);
    abdruck.set(vz.id, spur.join('/'));
    console.log(`  ${vz.name.padEnd(16)} `
      + felder.map((f, i) => `${f.was} ${spur[i] >= 0 ? '+' : ''}${String(spur[i]).padStart(3)}`)
        .join('  ')
      + `   Abdruck ${spur.join('/')}   ${vorzeichenZahl(vz)}`);
  }
  // **Hat die Messstelle ueberhaupt Luft nach unten?** Ein Feld, das schon
  // ohne Vorzeichen nichts durchlaesst, kann keine Verschaerfung zeigen -
  // seine Spalte stuende bei allen sechs auf null und saehe aus wie
  // Uebereinstimmung (Regel 13).
  felder.forEach((f, i) => {
    if (ohne[i] === 0) {
      errors.push(`Die Vorzeichenmessung misst am Feld "${f.was}" nichts: es laesst schon `
        + 'ohne Vorzeichen keinen Punkt durch. Eine Spalte ohne Spielraum trennt nichts - '
        + 'dann ist die Welle zu leicht oder das Feld zu stark gewaehlt (Regel 13).');
    }
  });
  // **Kommt ueberhaupt jedes an?** Ein Abdruck aus lauter Nullen heisst, dass
  // das Zeichen im Spiel nichts aendert. In der Gleichheitspruefung darunter
  // saehe das aus wie "von fuenf anderen unterscheidbar", solange nur eines
  // so dasteht - genau die Luecke, die Regel 5 beschreibt.
  for (const vz of VORZEICHEN_ORDNUNG) {
    if (abdruck.get(vz.id) === felder.map(() => 0).join('/')) {
      errors.push(`Das Vorzeichen "${vz.name}" aendert an KEINEM der vier reinen Felder `
        + 'etwas. Es steht ueber der Welle und kommt im Spiel nicht an - die Ankuendigung '
        + 'ist dann eine Verzierung.');
    }
  }
  const gleich: string[] = [];
  const ids = [...abdruck.keys()];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (abdruck.get(ids[i]) === abdruck.get(ids[j])) gleich.push(`${ids[i]} und ${ids[j]}`);
    }
  }
  console.log(`  ${ids.length} Vorzeichen, ${gleich.length} Paar(e) mit gleichem Abdruck `
    + `ueber alle ${felder.length} reinen Felder.`);
  if (gleich.length) {
    errors.push(`Diese Vorzeichen sind im Spiel nicht zu unterscheiden: ${gleich.join(', ')}. `
      + 'Auf jedem der vier reinen Felder derselbe Kristallverlust - das sind nicht zwei '
      + 'Ankuendigungen, sondern eine mit zwei Namen, und wer sie liest, lernt nichts '
      + 'daraus, was er nicht schon wusste.');
  }
}

function wirkungenMessen(): void {
  console.log('\nWirkungen als Kartenmaterial (jede allein gegen keine):');
  const plan: TowerId[] = ['arrow', 'frost', 'mortar', 'prism'];
  // Abdruck je Wirkung: je Karte ein Paar aus Kristall und Gold gegen die
  // Nullprobe. Zwei gleiche Abdruecke sind zwei Namen fuer eine Wirkung.
  const abdruck = new Map<string, string[]>();
  const zeilen: string[] = [];
  // **Die Nullprobe wird EINMAL je Karte gerechnet, nicht je Wirkung.**
  // Der erste Entwurf fuhr sie sechsmal - denselben Lauf, dieselbe Aussaat,
  // dasselbe Ergebnis, 24 Laeufe von 48 umsonst. Und sie ist damit auch
  // wirklich EINE Nullprobe und nicht sechs, die zufaellig gleich ausgehen.
  const nullprobe = new Map<string, { lives: number; earned: number }>();
  for (const mm of MAPS) {
    const r = play(plan, () => 0, MEISTER, 'normal', mm.id);
    nullprobe.set(mm.id, { lives: r.lives, earned: r.earned });
  }
  for (const id of WIRKUNGSKARTEN) {
    const karte = KARTENSTAPEL.find((k) => k.id === id);
    if (!karte) {
      errors.push(`Die Wirkungsmessung kennt die Karte "${id}" nicht - der Stapel hat sie `
        + 'verloren, und die Messung prueft seitdem eine leere Liste (Regel 5).');
      return;
    }
    const spuren: string[] = [];
    const teile: string[] = [];
    for (const mm of MAPS) {
      const ohne = nullprobe.get(mm.id)!;
      const mit = play(plan, () => 0, MEISTER, 'normal', mm.id, { genommen: [id] });
      const dk = mit.lives - ohne.lives;
      const dg = mit.earned - ohne.earned;
      spuren.push(`${dk}/${dg}`);
      teile.push(`${mm.id.slice(0, 5)} ${dk >= 0 ? '+' : ''}${dk}`);
    }
    abdruck.set(id, spuren);
    zeilen.push(`  ${karte.name.padEnd(14)} ${teile.join('  ')}   Abdruck ${spuren.join(' ')}`);
  }
  for (const z of zeilen) console.log(z);

  // **Wirkt ueberhaupt jede?** Ein Abdruck aus lauter Nullen sagt, dass die
  // Karte im Spiel gar nicht ankommt - das sieht in der Gleichheitspruefung
  // darunter aus wie "unterscheidbar von fuenf anderen", solange nur eine
  // einzige so dasteht.
  for (const [id, spur] of abdruck) {
    if (spur.every((x) => x === '0/0')) {
      errors.push(`Die Wirkung "${id}" aendert auf KEINER Karte etwas - weder Kristall noch `
        + 'Gold. Sie steht im Stapel und kommt im Spiel nicht an.');
    }
  }
  const gleich: string[] = [];
  const ids = [...abdruck.keys()];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = abdruck.get(ids[i])!, b = abdruck.get(ids[j])!;
      if (a.join(' ') === b.join(' ')) gleich.push(`${ids[i]} und ${ids[j]}`);
    }
  }
  console.log(`  ${ids.length} Wirkungen, ${gleich.length} Paar(e) mit gleichem Abdruck `
    + `ueber alle ${MAPS.length} Karten.`);
  if (gleich.length) {
    errors.push(`Diese Wirkungen sind im Spiel nicht zu unterscheiden: ${gleich.join(', ')}. `
      + 'Auf allen vier Karten dasselbe Ergebnis - das sind nicht zwei Karten, sondern eine '
      + 'mit zwei Namen, und die Wahl zwischen ihnen ist keine.');
  }
}

function wiederholungMessen(): void {
  console.log('\nWiederholung (Haeufen gegen Verteilen, mit Aufschlag und ohne):');
  const trennung: number[] = [];
  const verteilerLeben: { mittel: number; spanne: number; id: string; je: number[] }[] = [];
  const haeufen: TowerId[] = ['arrow'];
  const verteilen: TowerId[] = ['arrow', 'frost', 'mortar', 'prism'];
  // Der Aufschlag laesst sich nicht zur Laufzeit abschalten - er steht als
  // Konstante in den Daten. Die Nullprobe faehrt deshalb einen Bot, dem der
  // Aufschlag NICHT begegnet: die Freimenge reicht fuer vier Tuerme je Art,
  // also baut `maxTowers: 12` mit vier Arten keinen einzigen teuren.
  for (const mm of MAPS) {
    const zeile = (was: string, plan: TowerId[]) => {
      const ohne = play(plan, () => 0, MEISTER, 'normal', mm.id, { zuschlag: 0 });
      // **Fest 0,35, nicht der gesetzte Wert.** Der steht seit v286 auf Null
      // (siehe `WIEDERHOLUNG_ZUSCHLAG`), und eine Messung, die den
      // ausgelieferten Wert nimmt, verglaeche dann Null mit Null und meldete
      // fuenf Zeilen Einsen. Sie soll sagen, WAS der Aufschlag taete - genau
      // die Auskunft, an der die Entscheidung haengt, ihn scharf zu stellen.
      const mit = play(plan, () => 0, MEISTER, 'normal', mm.id, { zuschlag: MESS_ZUSCHLAG });
      return {
        was,
        gold: mit.spent - ohne.spent,
        leben: mit.lives - ohne.lives,
        text: `${was.padEnd(10)} Kristall ${ohne.lives} -> ${mit.lives} von ${mit.maxLives}`
          + `   Gold ${ohne.spent} -> ${mit.spent}`
          + ` (${mit.spent - ohne.spent >= 0 ? '+' : ''}${mit.spent - ohne.spent})`,
      };
    };
    const h = zeile('Haeufen', haeufen);
    const v = zeile('Verteilen', verteilen);
    // **Der Kristall des Verteilers ueber die AUSSAATEN, nicht aus einem
    //   Lauf** (v300).
    //
    // Bis v299 stand hier `v.leben` - ein einzelner Lauf je Karte, gegen
    // eine harte Null. Zwei Kristall von 42 sind in diesem Werkzeug die
    // uebliche Wegabhaengigkeit, und genau daran ist v299 gescheitert: die
    // Vielfaltsbeute gibt dem Verteiler mehr Gold, er baut anders, der
    // Aufschlag trifft einen anderen Verlauf, und die Zusage meldete einen
    // Rueckschritt, den sie gar nicht von einem Wurf unterscheiden kann.
    //
    // Gemessen wird jetzt der Mittelwert ueber die drei Aussaaten UND die
    // Spanne zwischen ihnen - dieselbe Bewegung wie bei der
    // Spannungsratsche in v296: das Band gehoert an dieselbe Messstelle wie
    // der Wert (Regel 12).
    const jeAussaat = AUSSAATEN.map((aussaat) => {
      aussaatGezaehlt('verteilerLeben', aussaat);
      const o = play(verteilen, () => 0, MEISTER, 'normal', mm.id,
        { zuschlag: 0, seed: aussaat });
      const m2 = play(verteilen, () => 0, MEISTER, 'normal', mm.id,
        { zuschlag: MESS_ZUSCHLAG, seed: aussaat });
      return m2.lives - o.lives;
    });
    const vMittel = jeAussaat.reduce((a, b) => a + b, 0) / jeAussaat.length;
    const vSpanne = Math.max(...jeAussaat) - Math.min(...jeAussaat);
    verteilerLeben.push({ mittel: vMittel, spanne: vSpanne, id: mm.id, je: jeAussaat });
    console.log(`  ${mm.id}`);
    console.log(`    ${h.text}`);
    console.log(`    ${v.text}`);
    // Die Zahl, um die es geht: was der Aufschlag dem Haeufer MEHR abnimmt
    // als dem Verteiler. Ist sie null, trennt er die beiden nicht.
    const trennt = h.gold - v.gold;
    console.log(`    trennt um ${trennt >= 0 ? '+' : ''}${trennt} Gold`
      + ` und ${h.leben - v.leben >= 0 ? '+' : ''}${h.leben - v.leben} Kristall`);
    trennung.push(trennt);
  }
  // **Eine Zusage, kein blosser Bericht** (v287).
  //
  // Der erste Entwurf schrieb "misst, urteilt nicht" darunter - wie beim
  // Foerderer in v285. Dort war das richtig, weil die Zahl geeicht werden
  // sollte. Hier ist es falsch: der Aufschlag steht auf Null, und eine
  // Mechanik, die abgeschaltet UND ungeprueft ist, verfaellt still. Genau
  // das haelt Regel 5 fest.
  //
  // Die Zusage ist die, die die Story uebrig behaelt: der Aufschlag muss den
  // Haeufer haerter treffen als den Verteiler. Sie haengt an der FREIMENGE -
  // ohne sie zahlt auch der Verteiler, und die Trennung schrumpft. Gemessen
  // sind 344 bis 693 Gold je Karte.
  const kleinste = Math.min(...trennung);
  console.log(`  Kleinste Trennung: ${kleinste} Gold (gefordert > ${TRENNUNG_MIN}).`);

  // **Was die FREIMENGE haelt, und nur sie** (v287).
  //
  // Die Trennung oben haelt den Aufschlag: sie bliebe auch ohne Freimenge
  // gross, denn wer zwoelf gleiche Tuerme baut, zahlt in jedem Fall mehr als
  // wer vier Arten mischt. Die Gegenprobe hat genau das gemeldet, indem sie
  // schwieg (Regel 3).
  //
  // Die Freimenge haelt etwas anderes: der perfekte Verteiler darf durch den
  // Aufschlag NICHT verlieren. Vier Geschuetze, zwoelf Tuerme, drei je Sorte
  // - er haeuft nichts, also soll ihn nichts treffen. Gemessen kippt ohne
  // Freimenge genau das: `npm run c18`, dessen Bot die Sorten reihum baut,
  // verliert dort in Welle 14, und zwar bei jedem Zuschlag von 0,10 bis 0,35.
  //
  // **"Gewinnt er noch?" taugt dafuer nicht**, und die Gegenprobe hat es
  // gemessen: mit Freimenge 0 gewinnt derselbe Bot weiter, nur mit 25 statt
  // 31 Kristall. `npm run c18` faehrt einen schwaecheren Bot, deshalb kippt
  // es dort und hier nicht - eine Zusage, die auf dem einen Messplatz
  // anschlaegt und auf dem anderen nicht, ist keine (v225).
  //
  // Gemessen wird deshalb der KRISTALL des Verteilers, mit Aufschlag gegen
  // ohne. Er haeuft nichts, also darf ihn eine Regel gegen das Haeufen auch
  // nichts kosten: gemessen 0, +6, 0, 0 ueber die vier Karten.
  // **Der schlechteste Fall ist der, dessen Verlust sein eigenes Band
  //   ueberschreitet** - nicht der mit der kleinsten Zahl.
  //
  // Eine Karte, die im Mittel 2 Kristall verliert und zwischen den Aussaaten
  // um 6 schwankt, sagt nichts; eine, die 2 verliert und um 0 schwankt, sagt
  // alles. Bis v299 stand hier `Math.min` ueber vier einzelne Laeufe.
  for (const v of verteilerLeben) {
    console.log(`  ${v.id.padEnd(14)} Verteiler ${v.mittel >= 0 ? '+' : ''}`
      + `${v.mittel.toFixed(1)} Kristall im Mittel ueber ${AUSSAATEN.length} Aussaaten `
      + `(${v.je.map((n) => (n >= 0 ? `+${n}` : n)).join(' / ')}, Rauschen ${v.spanne})`);
  }
  const schlimmste = verteilerLeben.reduce((a, b) => (a.mittel <= b.mittel ? a : b));
  console.log(`  Der Verteiler zahlt durch den Aufschlag im schlechtesten Mittel `
    + `${schlimmste.mittel >= 0 ? '+' : ''}${schlimmste.mittel.toFixed(1)} Kristall `
    + `(${schlimmste.id}, Rauschen ${schlimmste.spanne}, `
    + `gefordert >= ${VERTEILER_VERLUST_MAX} ausserhalb des Rauschens).`);
  const ueberBand = verteilerLeben
    .filter((v) => VERTEILER_VERLUST_MAX - v.mittel > v.spanne);
  if (ueberBand.length) {
    const v = ueberBand[0];
    errors.push(`Der Wiederholungsaufschlag kostet den perfekten Verteiler auf `
      + `${v.id} im Mittel ${(-v.mittel).toFixed(1)} Kristall, und das liegt AUSSERHALB `
      + `des Rauschens dieser Zahl (${v.spanne} ueber ${AUSSAATEN.length} Aussaaten: `
      + `${v.je.join(' / ')}). Er haeuft nichts - vier Geschuetze, zwoelf Tuerme, drei je `
      + 'Sorte -, also darf ihn eine Regel gegen das Haeufen nicht treffen. Die Freimenge '
      + 'ist zu klein.');
  }
  if (kleinste <= TRENNUNG_MIN) {
    errors.push(`Der Wiederholungsaufschlag trennt Haeufen von Verteilen nur um ${kleinste} `
      + `Gold (gefordert ueber ${TRENNUNG_MIN}). Er trifft dann den, der gleichmaessig baut, `
      + 'fast so hart wie den, der haeuft - und ist damit eine Verteuerung statt einer Regel.');
  }

  // **Und dasselbe noch einmal am AUSGELIEFERTEN Wert** (v297, S-N3-02).
  //
  // Alles darueber laeuft gegen feste 0,35 - mit gutem Grund, denn es soll
  // sagen, was der Aufschlag TAETE. Nur: solange nichts den gesetzten Wert
  // ansieht, ist er ungeprueft. Er koennte auf 0 stehen, auf 0,10 oder auf
  // einem Tippfehler, und diese fuenf Zeilen meldeten unveraendert dieselben
  // 693 gegen 349 Gold. Eine Zusage, die etwas anderes misst als das, was
  // ausgeliefert wird, bezeugt die Sache, ohne sie je geprueft zu haben
  // (Regel 13).
  //
  // **Zweiseitig, und das ist der Kern:** steht der Wert auf 0, MUSS die
  // Trennung null sein - sonst greift irgendwo ein Aufschlag, den niemand
  // gesetzt hat. Steht er darueber, muss sie es auch zeigen. So haelt die
  // Zusage in beide Richtungen, statt bei Null stillschweigend zu bestehen.
  //
  // Gemittelt ueber drei Aussaaten mal drei Abwandlungen auf der ersten
  // Karte - die Monokultur-Zeile weiter unten faehrt EINEN Lauf, und aus
  // einem Lauf laesst sich hier nichts lesen (M1).
  const mittelAusgabe = (plan: TowerId[], zuschlag: number): number => {
    let summe = 0, n = 0;
    for (const aussaat of AUSSAATEN) {
      for (const variant of VARIANTS) {
        summe += play(plan, () => 0, MEISTER, 'normal', MAPS[0].id,
          { zuschlag, seed: aussaat, variant }).spent;
        n++;
      }
    }
    return summe / n;
  };
  const gesetzt = WIEDERHOLUNG_ZUSCHLAG;
  const hAus = mittelAusgabe(haeufen, gesetzt) - mittelAusgabe(haeufen, 0);
  const vAus = mittelAusgabe(verteilen, gesetzt) - mittelAusgabe(verteilen, 0);
  const trenntGesetzt = hAus - vAus;
  console.log(`  Am gesetzten Wert (${gesetzt}): Haeufer zahlt ${hAus >= 0 ? '+' : ''}`
    + `${hAus.toFixed(0)} Gold, Verteiler ${vAus >= 0 ? '+' : ''}${vAus.toFixed(0)} - `
    + `trennt um ${trenntGesetzt >= 0 ? '+' : ''}${trenntGesetzt.toFixed(0)}.`);
  console.log(`  (${MAPS[0].id}, Meister, normal, ${AUSSAATEN.length} Aussaaten x `
    + `${VARIANTS.length} Abwandlungen gemittelt)`);
  // **Die zweite Seite ist gebaut und wieder ausgebaut, und die Gegenprobe
  //   hat es gesagt** (Regel 5).
  //
  // Sie sollte lauten: steht der Wert auf 0, MUSS die Trennung null sein -
  // sonst greift ein Aufschlag, den niemand gesetzt hat. Das klingt wie eine
  // zweiseitige Zusage und ist keine: `gesetzt` ist zugleich der Schalter
  // UND der Wert, den `mittelAusgabe` an `play` weiterreicht. Steht er auf
  // 0, sind beide Laeufe derselbe Lauf, die Differenz ist von Bauart exakt
  // 0, und der Zweig kann nicht anschlagen.
  //
  // Nachgefahren mit dem Eingriff `const gesetzt = 0` bei laufendem 0,10:
  // das Tor schwieg zu Recht - die Messung nimmt ihren Wert eben NICHT
  // woanders her. Eine Pruefung, die nie etwas meldet, ist kein Beweis,
  // also steht sie hier als Satz statt als Code.
  if (gesetzt > 0 && trenntGesetzt <= 0) {
    errors.push(`Der Wiederholungsaufschlag steht auf ${gesetzt}, trennt am gesetzten Wert `
      + `aber nur um ${trenntGesetzt.toFixed(0)} Gold. Er ist scharf gestellt und wirkt `
      + 'nicht - dann ist er eine Zahl in den Daten und keine Regel im Spiel.');
  }
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
    /** Den Wiederholungsaufschlag abschalten oder anders setzen (v286).
     *  Eine Wirkung, die sich nicht abschalten laesst, ist nicht gemessen,
     *  sondern behauptet (Regel 13). */
    zuschlag?: number;
    /** Die Vielfaltsbeute abschalten oder anders setzen (v299, S-N3-03).
     *  Dieselbe Begruendung wie eine Zeile hoeher: eine Wirkung, die sich
     *  nicht abschalten laesst, ist nicht gemessen, sondern behauptet. */
    vielfalt?: number;
    /** Der wievielte Abschnitt eines Laufs, 0-basiert (v309, N1K). Ohne
     *  Angabe der erste - dann steht der Lauffaktor auf 1. */
    laufAbschnitt?: number;
    /** Wie stark ein Abschnitt gegenueber dem vorigen zulegt. Ohne Angabe der
     *  Wert des Spiels; eine Wirkung, die sich nicht abschalten laesst, ist
     *  nicht gemessen, sondern behauptet (Regel 13). */
    laufSteigung?: number;
    /** Die Auflage der Abschnittswahl (S-N1-03): Faktor auf die
     *  Lebenspunkte und Faktor auf alles Gold. Ohne Angabe je 1 - eine
     *  Wirkung, die sich nicht abschalten laesst, ist nicht gemessen,
     *  sondern behauptet (Regel 13). */
    druck?: number;
    beute?: number;
    /** Welche Karten ueber den Grundstapel hinaus im Zug liegen (S-N1-04).
     *  Ohne Angabe KEINE - nie der Kontostand dessen, der gerade misst
     *  (Regel 4). */
    stapel?: readonly string[];
    /** **Zieht der Bot je Welle eine Karte?** (v308, N1K)
     *
     *  Ohne Angabe NICHT - dann rechnet `play` Zeichen fuer Zeichen wie
     *  vorher, und jede an einzelnen Karten geeichte Zahl bleibt unberuehrt.
     *  Mit Angabe zieht er nach dem genannten Stil, genau dort, wo ein
     *  Spieler zoege: zwischen zwei Wellen.
     *
     *  **Das ist die Voraussetzung dafuer, die Kurve eines LAUFS zu eichen.**
     *  Bis v307 fuhr `laufMessen` einen Bot ohne Deck durch sechzig Wellen
     *  und mass daran eine Rampe von 14,89 - gegen einen Spieler, der in
     *  Welle 46 fuenfundvierzig Karten genommen haette. Eine Kurve gegen
     *  diesen Bot zu formen hiesse, sie gegen jemanden zu formen, den es
     *  nicht gibt. */
    zugStil?: string;
    /** **Welche Karten als GENOMMEN gelten** (S-N6-01).
     *
     *  `stapel` legt eine Karte in den Zug, `genommen` spielt sie. Fuer die
     *  Frage "ist diese Wirkung von jener zu unterscheiden" braucht es
     *  genau eine Wirkung und keine zweite, und ein Bot, der ziehen darf,
     *  nimmt irgendwann auch etwas anderes.
     *
     *  Ohne Angabe KEINE - die Nullprobe ist damit derselbe Lauf ohne jede
     *  Wirkung, und nicht ein Lauf mit einer anderen (Regel 13). */
    genommen?: readonly string[];
  } = {},
): Result {
  const s = new GameState(mapId);
  if (opts.zuschlag !== undefined) s.wiederholungZuschlag = opts.zuschlag;
  if (opts.vielfalt !== undefined) s.vielfaltZuschlag = opts.vielfalt;
  if (opts.laufAbschnitt !== undefined) s.laufAbschnitt = opts.laufAbschnitt;
  if (opts.laufSteigung !== undefined) s.laufSteigung = opts.laufSteigung;
  if (opts.druck !== undefined) s.laufDruck = opts.druck;
  if (opts.beute !== undefined) s.laufBeute = opts.beute;
  s.reset(opts.seed ?? AUSSAATEN[0], difficulty, mapId,
    { endless: opts.endless, perks: opts.perks ?? NO_PERKS,
      karten: opts.karten ?? MAPS.length, stapel: opts.stapel ?? [] });
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
  // Nach `reset`, weil das den Zustand neu aufbaut - davor gesetzt waere es
  // im naechsten Zeichen wieder weg.
  if (opts.genommen?.length) {
    s.genommeneKarten = [...opts.genommen];
    s.zugWirkung = kartenWirkung(s.genommeneKarten);
  }
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
      // **Der Bot weicht dem Aufschlag aus** (v286, S-N3-02).
      //
      // Seit die Wiederholung teurer wird, gibt es eine Entscheidung, die es
      // vorher nicht gab: den vierten Bogenturm zahlen oder etwas anderes
      // stellen. Ohne diese Zeilen trifft der Bot sie nicht - er faehrt seine
      // Liste stur durch -, und dann misst `sim` nicht die Mechanik, sondern
      // seine Sturheit. Das ist derselbe Modellfehler wie beim Foerderer in
      // v285, wo der Bot sein Einkommen auf die besten Bauplaetze stellte.
      //
      // Gefragt wird allein der PREIS, nicht der Nutzen: haengt die Wahl an
      // Schaden je Gold, misst der Lauf zwei Dinge auf einmal (Regel 4).
      if (!willFoerdern) {
        const grund = TOWERS[id].base.cost;
        if (s.baupreis(id) > grund * AUSWEICHEN_AB) {
          const guenstiger = strategy.find((c) => c !== id && s.baupreis(c) <= TOWERS[c].base.cost);
          if (guenstiger) id = guenstiger;
        }
      }
      if (s.gold < s.baupreis(id)) {
        const affordable = strategy.filter((c) => s.gold >= s.baupreis(c) + reserve);
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
        spotIdx < spots.length && s.gold >= s.baupreis(id) + reserve;

      // Was WOLLTE der Bot, und hat das Gold dafuer gereicht?
      //
      // Der Vorzug ist bauen, solange er unter seinem Baudeckel liegt und
      // ein Platz frei ist; sonst ausbauen. Gefragt wird nur nach dem
      // Vorzug - ein Bot, der ausbaut, weil er nicht bauen kann, hat den
      // Kauf, den er wollte, nicht getan.
      entscheidungsBilder++;
      const bauVorzug = gebaut.length < bot.maxTowers * bot.deepenAt && spotIdx < spots.length;
      if (bauVorzug) {
        if (s.gold < s.baupreis(id) + reserve) knappeBilder++;
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
        let nimm = willFoerdern && fIdx < spots.length ? fIdx : spotIdx;
        // **Der Nest-Bot baut ABSICHTLICH um den Bannturm herum** (v295, C3).
        //
        // Ohne ihn ist die Haelfte der Wette aus S5 ungeprueft: dass ein
        // unbedacht gestellter Bannturm sich nicht lohnt, sagt der Lauf
        // sofort (-4 bis -6 Kristall). Dass er sich lohnt, wenn man fuer ihn
        // baut, sagt bisher nur die Geometrie. Ein Bot, der die Entscheidung
        // nicht trifft, misst die Mechanik nicht - das ist die Lehre aus
        // v285 und v283, beide Male woertlich derselbe Fehler.
        //
        // Gefragt wird allein die LAGE, nicht der Nutzen: welcher der
        // naechsten Plaetze liegt im Umkreis eines stehenden Bannturms?
        // Haengt die Wahl an Schaden je Gold, misst der Lauf zwei Dinge auf
        // einmal (Regel 4).
        if (bot.bannStil === 'nest' && !willFoerdern) {
          if (id === 'bann') {
            // **Der Bannturm gehoert dorthin, wo er die meisten TUERME
            // erreicht - nicht auf den besten Bauplatz.**
            //
            // Der erste Entwurf stellte ihn als ersten in den Plan, also auf
            // Platz eins der nach Wegdeckung sortierten Liste. Gemessen
            // verlor der Bot damit ALLES (0 von 42 auf dem Spiralhain): ein
            // Turm, der nicht schiesst, hatte die beste Stellung besetzt,
            // und die Nachbarn mussten in seinen Umkreis statt dorthin, wo
            // sie etwas sehen.
            //
            // Das ist woertlich der Modellfehler aus v285, wo der Foerderer
            // auf die besten Plaetze kam - zweimal derselbe Griff, und beide
            // Male hat erst der Lauf es gesagt.
            let bestIdx = spotIdx; let bestN = -1;
            const reich = rangeFor('bann', null, 1);
            for (let k = spotIdx; k < Math.min(spots.length, spotIdx + 60); k++) {
              const p = spots[k];
              const n = s.gebaute.filter((tw) => TOWERS[tw.def].attack !== 'keiner'
                && Math.hypot(tw.x - p.x, tw.y - p.y) <= reich).length;
              if (n > bestN) { bestN = n; bestIdx = k; }
            }
            nimm = bestIdx;
          } else {
            const banne = s.gebaute.filter((tw) => tw.def === 'bann');
            if (banne.length) {
              for (let k = spotIdx; k < Math.min(spots.length, spotIdx + 40); k++) {
                const p = spots[k];
                if (banne.some((bt) => Math.hypot(bt.x - p.x, bt.y - p.y)
                  <= s.towerStats(bt).range)) { nimm = k; break; }
              }
            }
          }
        }
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
          s.gold >= s.baupreis(id) + reserve) {
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
    // **Die Karte wird gezogen, bevor die Welle losgeht** (v308, N1K) -
    // genau da, wo `zugFaellig()` es erlaubt und wo ein Spieler zieht.
    // Der Zustand entscheidet, nicht dieser Aufruf: `karteNehmen` prueft
    // selbst, ob ein Zug faellig ist und ob die Karte angeboten wurde.
    if (opts.zugStil && s.zugFaellig()) {
      const angebot = s.angeboteneKarten();
      if (angebot.length) {
        s.karteNehmen(karteWaehlen(opts.zugStil, angebot).id);
        entscheidungenJeWelle[welleNr(s)]++;
      }
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
    artenJeKill: s.stats.artenJeKill.slice(),
    gezogeneKarten: s.genommeneKarten.length,
    rampe: s.laufRampe(0),
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
    const teuerster = Math.max(...TOWER_ORDER.map((id) => s.baupreis(id)));
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
  const r = play(bot.plan ?? mixedPlanBase, () => 0, bot);
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
      b.plan ?? mixedPlanBase, () => 0, b, 'normal', MAPS[0].id, { variant, seed: aussaat },
    ));
    const avg = (f: (r: Result) => number) => o.runs.reduce((a, r) => a + f(r), 0) / o.runs.length;
    return {
      name: b.name, mean: o.mean, rauschen: o.spanne,
      // Die neun Einzelwerte in fester Reihenfolge (Aussaat-Haupt-,
      // Abwandlungs-Nebenordnung). Alle drei Stile fahren dieselbe
      // Reihenfolge, also ist Zelle i bei allen dreien derselbe Lauf.
      einzeln: o.runs.map((r) => score(r)),
      towers: avg((r) => r.towers), ups: avg((r) => r.upgrades),
      earned: avg((r) => r.earned), left: avg((r) => r.earned - r.spent),
      // Gewinnt dieser Stil die Karte in der MEHRHEIT der Laeufe?
      //
      // "In jedem" war der erste Entwurf und zu streng: die neun Laeufe sind
      // drei Aussaaten mal drei ABWANDLUNGEN, und eine Abwandlung ist eine
      // absichtliche Stoerung des Bauverhaltens. Dass ein Stil daran
      // gelegentlich scheitert, ist der Sinn der Sache - `Sparsam` steht bei
      // Punktzahl 71 und faellt trotzdem durch.
      //
      // Gefangen werden soll der Stil, der GAR NICHT traegt: der kaputte
      // `Sparsam` dieser Runde gewann null von neun. Die Mehrheit trennt
      // beides und ist keine geratene Feinheit, sondern die Aussage "dieser
      // Stil geht normalerweise auf".
      gewinnt: o.runs.filter((r) => r.won).length * 2 > o.runs.length,
      siege: `${o.runs.filter((r) => r.won).length} von ${o.runs.length}`,
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
  // **Und seit v296 steht daneben das Rauschen der Zahl SELBST, nicht das
  //   ihrer Bestandteile** (M18, S-N3-02).
  //
  // `r.rauschen` ist die Streuung EINES Stils ueber die Aussaaten. Geratscht
  // wird aber die DIFFERENZ zweier Stile, und die hat eine eigene Streuung:
  // der Verlauf ist wegabhaengig, also verschiebt schon eine Preisregel, die
  // alle drei Stile gleich trifft, wer wann welchen Turm stellt - und damit
  // den Abstand. Genau das ist in v286 gemessen worden und steht als M18 in
  // den Messluecken: ueber den Wiederholungsaufschlag sprang die Zahl auf
  // 1,46 / 11,64 / 4,50, waehrend das angegebene Rauschen bei 3 bis 5 stand.
  // Zehn Punkte Bewegung ueber einen Parameter, der die Stile gar nicht
  // unterscheidet - gegen ein Band, das diese Bewegung nicht kennt.
  //
  // Gemessen wird deshalb der Abstand JE LAUF - drei Aussaaten mal drei
  // Abwandlungen, neun Zellen - und die Spanne dieser neun ist das Band.
  // Die Abwandlungen gehoeren hier ausdruecklich hinein, waehrend sie bei
  // einer Kennzahl je Stil draussen bleiben (`overVariants`): dort ist der
  // Bauverlauf das Gemessene, hier ist er die Stoerung.
  //
  // Regel 12 in einem Satz: das Band gehoert an dieselbe Messstelle wie der
  // Wert.
  const zellen = runs[0].einzeln.map((_, i) => {
    const je = runs.map((r) => r.einzeln[i]);
    return Math.max(...je) - Math.min(...je);
  });
  const stilRauschenZelle = Math.max(...zellen) - Math.min(...zellen);
  const stilRauschenStil = Math.max(...runs.map((r) => r.rauschen));
  const stilRauschen = Math.max(stilRauschenZelle, stilRauschenStil);
  // **Ein Abstand zwischen drei Stilen sagt nur etwas, wenn alle drei
  //   spielbar sind** (v293).
  //
  // Sonst misst die Zahl die Schwaeche des schlechtesten statt die
  // Verschiedenheit der drei - und sie laesst sich beliebig hochtreiben,
  // indem man einen Bot verschlechtert. Genau das ist beim ersten Entwurf
  // dieser Runde passiert: `Sparsam` bekam nur teure Tuerme, verlor in Welle
  // 14, und der Abstand sprang von 8 auf 28 - "ERREICHT", zum ersten Mal
  // ueberhaupt. Eine Kennzahl, die sich durch Verschlechtern verbessern
  // laesst, ist keine.
  for (const r of runs) {
    if (!r.gewinnt) {
      errors.push(`Der Spielstil "${r.name}" gewinnt ${MAPS[0].id} nicht in jedem Lauf `
        + `(${r.siege} Laeufe, Punktzahl ${r.mean.toFixed(0)}). Der Abstand der Spielstile `
        + 'misst dann '
        + 'die Schwaeche des schlechtesten statt die Verschiedenheit der drei - und er '
        + 'laesst sich hochtreiben, indem man einen Bot verschlechtert.');
    }
  }
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
      b.plan ?? mixedPlanBase, () => 0, b, 'normal', MAPS[0].id, { variant, seed: aussaat },
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
    `   (Rauschen ${stilRauschen.toFixed(1)} = groesseres von `
    + `${stilRauschenZelle.toFixed(1)} je Lauf und ${stilRauschenStil.toFixed(1)} je Stil)`,
  );
  if (stilAbstand < stilRauschen) {
    console.log('  UNBELEGT: der Abstand der Stile ist kleiner als die Streuung des '
      + 'Verfahrens - er misst heute den Bauverlauf, nicht die Spielstile (G4, M18).');
    console.log('  Die Ratsche steht trotzdem daneben und haelt: sie faengt einen Fall, '
      + 'der groesser ist als dieses Band. Innerhalb des Bandes urteilt sie nicht - '
      + 'und genau das war bis v295 anders herum.');
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
  // Die dritte Spalte stand auf "erbarmungslos mit allen" und ist in v314
  // entfallen; an ihre Stelle tritt der spaeteste Abschnitt des Laufs, der
  // die Steigerung heute traegt.
  const hardBuffed = play(
    mixedPlanBase, () => 0, MEISTER, 'normal', MAPS[0].id,
    { perks: ALL_PERKS, laufAbschnitt: 3 },
  );
  console.log('\nFortschritt (Meister, Spiralhain):');
  console.log(
    `  ohne Verbesserungen ${plain.won ? `${plain.lives}/${plain.maxLives}` : `W${plain.wave}`}` +
    `   mit allen ${buffed.won ? `${buffed.lives}/${buffed.maxLives}` : `W${buffed.wave}`}` +
    `   Abschnitt 3 mit allen ` +
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
    errors.push('Mit allen Verbesserungen ist der letzte Abschnitt verlustfrei - '
      + 'der Fortschritt ersetzt den Lauf.');
  }
  // **Die Sternpruefungen sind in v314 entfallen** (S-N1-05): es gibt keine
  // Sterne mehr zu vergeben. Was sie hielten - dass ein makelloser Lauf sich
  // von einem knappen und einer Niederlage unterscheidet -, steht jetzt im
  // Kristall am Ende und in der Erfahrung, die der Lauf ausschuettet.
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
  // **Wieviele Turmarten treffen einen Gegner ueberhaupt?** (v299, S-N3-03)
  //
  // Die Story will Beute nach Vielfalt vergeben. Bevor eine Zahl gesetzt
  // wird, muss der Fall gemessen sein, auf den sie zielt (Regel 9): eine
  // Regel fuer einen Fall, den es kaum gibt, ist Buchhaltung. Und die Form
  // des Vorbilds traegt hier nicht ohne Pruefung - Rogue Tower gibt +1 Gold
  // je Art, waehrend die Beute hier bei 1 bis 7 liegt; das waere eine
  // Verdopplung, und die verbietet die Abnahme dieser Story ausdruecklich.
  {
    console.log('\nTurmarten je getoetetem Gegner (gemischtes Feld, alle vier Karten):');
    let summe: number[] = [];
    let kills = 0;
    for (const m of MAPS) {
      const r = play(mixedPlanBase, () => 0, MEISTER, 'normal', m.id);
      const je = r.artenJeKill;
      const gesamt = je.reduce((a, b) => a + (b ?? 0), 0);
      kills += gesamt;
      je.forEach((n, i) => { summe[i] = (summe[i] ?? 0) + (n ?? 0); });
      console.log(`  ${m.id.padEnd(14)} `
        + je.map((n, i) => `${i}:${(((n ?? 0) / Math.max(1, gesamt)) * 100).toFixed(0)} %`)
          .filter((_, i) => (je[i] ?? 0) > 0).join('  ')
        + `   (${gesamt} Kills)`);
    }
    const mittel = summe.reduce((a, n, i) => a + (n ?? 0) * i, 0) / Math.max(1, kills);
    console.log(`  zusammen: `
      + summe.map((n, i) => `${i} Art(en) ${(((n ?? 0) / Math.max(1, kills)) * 100).toFixed(1)} %`)
        .filter((_, i) => (summe[i] ?? 0) > 0).join('  ')
      + `   Mittel ${mittel.toFixed(2)}`);
  }

  if (NUR_MONO) {
    monokulturMessen();
    for (const e of errors) console.log(`FEHLER: ${e}`);
    process.exit(errors.length ? 1 : 0);
  }

  if (NUR_VZ) {
    vorzeichenMessen();
    for (const e of errors) console.log(`FEHLER: ${e}`);
    process.exit(errors.length ? 1 : 0);
  }

  if (NUR_WIRKUNG) {
    wirkungenMessen();
    for (const e of errors) console.log(`FEHLER: ${e}`);
    process.exit(errors.length ? 1 : 0);
  }

  if (NUR_LAUF) {
    // **Vor dem Justieren den Raum ansehen** (Regel 9). `--steigung a,b,c`
    // faehrt den Lauf je Wert einmal durch und legt die Kristallverluste
    // nebeneinander; blind nachzujustieren hiesse, durch ein Schluesselloch
    // zu schauen.
    const sweep = process.argv.find((a) => a.startsWith('--steigung='));
    // **Und dieselbe Steigung ueber alle drei Stile** (`--stile`). Ein Wert,
    // der nur fuer EINEN Bot traegt, ist keine Einstellung, sondern ein
    // Zufall - dieselbe Ueberlegung wie bei jeder anderen Eichung dieses
    // Verzeichnisses.
    const ueberStile = process.argv.includes('--stile');
    if (sweep) {
      for (const w of sweep.slice('--steigung='.length).split(',').map(Number)) {
        if (ueberStile) for (const b of BOTS) laufMessen(w, b);
        else laufMessen(w);
      }
      process.exit(errors.length ? 1 : 0);
    }
    laufMessen();
    abschnittswahlMessen();
    kartenzugMessen(GRUNDSTAPEL, 'Grundstapel');
    kartenzugMessen(KARTENSTAPEL, 'voll freigeschaltet');
    erfahrungMessen();
    for (const e of errors) console.log(`FEHLER: ${e}`);
    process.exit(errors.length ? 1 : 0);
  }

  weichenstileMessen();
  foerdererMessen();
  wirkungenMessen();
  monokulturMessen();
  vorzeichenMessen();
  wiederholungMessen();
  vielfaltMessen();
  laufMessen();
  abschnittswahlMessen();
  // **Beide Staende des Stapels** (S-N1-04): der, mit dem gespielt wird, und
  // der volle. Der erste ist die Abnahme der laufenden Partie; der zweite
  // faengt eine freischaltbare Karte, die niemand je nehmen wuerde - sie
  // waere ein Kaufangebot ohne Gegenwert, und ohne diesen zweiten Lauf
  // faende es niemand.
  kartenzugMessen(GRUNDSTAPEL, 'Grundstapel');
  kartenzugMessen(KARTENSTAPEL, 'voll freigeschaltet');
  erfahrungMessen();
  werftMessen();
  knappheitMessen();
  bannMessen();
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

// **4d ist in v314 entfallen** (S-N1-05, K1).
//
// Hier standen die Vergleiche zwischen den Graden: Ruhig muss jeden Stil
// durchlassen, Erbarmungslos mindestens einen, und zwischen beiden mussten
// zwoelf Punkte liegen. Mit EINEM Grad haben alle drei keinen Gegenstand mehr
// - sie verglichen etwas mit sich selbst.
//
// **Ersatzlos, aber nicht ersatzfrei:** was sie hielten - dass die Spanne
// zwischen leicht und hart eine echte ist -, misst seit v305 der Lauf, und
// zwar an derselben Karte statt an drei Zahlenwerken. `npm run sim -- --lauf`
// verlangt eine Spreizung von 40 zwischen den Auflagen (gemessen 142,4) und
// dass keine Auflage zweimal vorn liegt. Der Vergleich ist damit dorthin
// gewandert, wo die Entscheidung heute faellt.

// Sterne muessen erreichbar sein - und nicht ueberall gleich.
//
// Nach dem Umbau des Kristalls waren drei Sterne auf zwei von drei Karten
// unmoeglich: der beste Stil kam auf 18 von 60 Punkten, gefordert waren 54.
// Ein Ziel, das niemand erreicht, ist kein Ziel.
// **Der Sternblock ist in v314 entfallen** (S-N1-05, K1).
//
// Er fragte zweierlei: ist die hoechste Wertung ueberhaupt zu holen, und holt
// sie nicht schon ein bescheidener Aufbau ueberall. Ohne Sternwertung gibt es
// keine Wertung mehr zu erreichen - aber beide Fragen stehen weiter im Lauf,
// und zwar nicht neu erfunden, sondern nachgesehen:
//
//   * "erreichbar" -> 4e gleich darunter: jede Karte muss von mindestens zwei
//     der drei Stile zu schaffen sein.
//   * "nicht muehelos" -> die Pruefung eine Ebene hoeher, dass kein Spielstil
//     ohne einen einzigen Verlust gewinnt, und die daneben, dass nicht ALLE
//     Stile verlustfrei durchkommen.
//
// Beide waren schon da, bevor die Sterne gingen. Ein dritter Weg auf dieselbe
// Frage waere Regel 15.

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
