/** **Vorzeichen: die Welle sagt an, was kommt** (S-N6-05).
 *
 *  Eine Welle war bis v330 eine Liste - man sah, WER kommt, und konnte
 *  nichts daraus machen, was man nicht ohnehin schon tat. Ein Vorzeichen
 *  macht aus der Liste eine ANKUENDIGUNG: es steht vor der Welle im Bild,
 *  es aendert etwas Spuerbares, und es hat eine Antwort.
 *
 *  **Und es ist die Ebene, auf der der Kartenzug erst Sinn ergibt.** Drei
 *  Karten zwischen zwei Wellen zu waehlen ist eine Wette, solange man nicht
 *  weiss, wogegen. Mit einem Vorzeichen zieht man gegen etwas Bekanntes -
 *  genau das machen alle drei Vorbilder auf ihre Weise (Rogue Tower kuendigt
 *  die naechste Gefahr an, bevor die Karte gezogen wird).
 *
 *  **Sechs, und jedes hat eine ANDERE Antwort.** Das ist die Abnahme dieser
 *  Datei und nicht ihr Schmuck: zwei Vorzeichen, gegen die man dasselbe tut,
 *  sind ein Vorzeichen mit zwei Namen - dieselbe Ueberlegung wie bei den
 *  Wirkungskarten in v327 und bei den Zielmodi seit v223.
 *
 *  | Vorzeichen | was es aendert | die Antwort |
 *  |---|---|---|
 *  | Eisenregen | Panzerung +2 | Wucht statt Schnellfeuer - der Scharfschuetze durchschlaegt |
 *  | Schildwache | jede Gruppe traegt Schild | Schnellfeuer statt Wucht - der Schild zaehlt TREFFER |
 *  | Sturmlauf | Tempo +40 % | mehr Tuerme frueh an der Strecke, nicht mehr Schaden |
 *  | Schwarm | Zahl +70 %, Leben −40 % | Flaeche und Aura statt Einzelziel |
 *  | Schwerlast | Leben +60 %, Tempo −20 % | Schaden ueber Zeit - der Umweg ist der Freund |
 *  | Stoersender | Bremswiderstand +0,5 | der Frostturm faellt als Stuetze aus |
 *
 *  **Ein Gewinn dazu war gebaut und ist gemessen wieder heraus.** Der
 *  Gedanke ist richtig und steht im eigenen Haus: die Auflagen der
 *  Abschnittswahl (v305) stellen jeder Last einen Gewinn gegenueber, und ein
 *  Zeichen, das nur haerter macht, ist eine Steuer. Gebaut war ein Faktor
 *  auf den Wellenbonus (+30 bis +90 % je Zeichen). Gemessen macht er die
 *  erste Karte SCHLECHTER - fuenf von fuenf Aussaaten gewonnen ohne ihn,
 *  drei von fuenf mit -, und der Grund ist nicht das Gold, sondern wofuer es
 *  ausgegeben wird: der C18-Bot kauft von jedem Ueberschuss einen weiteren
 *  Turm, und der dreizehnte Turm ist weniger wert als ein Ausbau. Genau das
 *  hat v291 schon gemessen (29 bis 41 Tuerme: Kristall 27 -> 0).
 *
 *  Die Messstelle in derselben Runde umzubauen, in der die eigene Aenderung
 *  an ihr scheitert, waere kein Beweis mehr (v219). Der Gewinn steht deshalb
 *  als offener Punkt im Verzeichnis und nicht als Zahl im Code - ein Feld,
 *  das auf 1 steht und nie etwas tut, waere Regel 5 in Reinform.
 *
 *  **Gegensatzpaare, nicht sechs Abstufungen.** Eisenregen und Schildwache
 *  verlangen entgegengesetzte Antworten, Sturmlauf und Schwerlast auch,
 *  Schwarm und Stoersender treffen verschiedene Tuerme.
 *
 *  **Und kein Name steht im Spiel schon woanders** (v323, „ein Ding, ein
 *  Wort“). Der erste Entwurf hiess „Bollwerk“ wie die Fähigkeit und
 *  „Gedränge“ wie die Engstellenmessung - zwei Dinge unter einem Wort, und
 *  die Ankündigung hätte auf etwas gezeigt, das der Spieler kennt und das
 *  nicht gemeint war. Wer auf alles
 *  vorbereitet sein will, muss mischen - damit zahlt jedes Vorzeichen auf
 *  dieselbe Frage ein wie die Monokulturwelle aus v330.
 */

export interface Vorzeichen {
  id: string;
  /** Wie es im Bild heisst - ein Wort, damit es in das Band ueber dem Feld
   *  passt (die Wellenvorschau hat gemessen 86 Punkte Hoehe, v319). */
  name: string;
  /** Was es TUT, in einem Satz. Nicht wie stark - die Zahl steht daneben und
   *  wird aus den Feldern gebildet, damit Satz und Zahl nicht auseinander
   *  laufen koennen (Regel 15). */
  text: string;
  /** Panzerung, die JEDER Gegner der Welle zusaetzlich traegt. */
  panzer?: number;
  /** Schildladungen, die jede Gruppe zusaetzlich bekommt. */
  schild?: number;
  /** Faktor auf das Tempo. */
  tempo?: number;
  /** Faktor auf die Zahl der Gegner je Gruppe. */
  zahl?: number;
  /** Faktor auf die Lebenspunkte. */
  leben?: number;
  /** Bremswiderstand, der zusaetzlich anliegt (0..1, gedeckelt bei 0,95). */
  starr?: number;
}

export const VORZEICHEN_ORDNUNG: Vorzeichen[] = [
  {
    id: 'eisenregen', name: 'Eisenregen',
    text: 'Sie kommen gepanzert.',
    panzer: 2,
  },
  {
    id: 'schildwache', name: 'Schildwache',
    text: 'Jede Gruppe trägt Schilde.',
    schild: 2,
  },
  {
    id: 'sturmlauf', name: 'Sturmlauf',
    text: 'Sie laufen schneller.',
    tempo: 1.4,
  },
  {
    id: 'schwarm', name: 'Schwarm',
    text: 'Mehr von ihnen, jeder dünner.',
    zahl: 1.7, leben: 0.6,
  },
  {
    id: 'schwerlast', name: 'Schwerlast',
    text: 'Schwerer und langsamer.',
    leben: 1.6, tempo: 0.8,
  },
  {
    id: 'stoersender', name: 'Störsender',
    text: 'Bremsen greifen kaum.',
    starr: 0.5,
  },
];

/** **Welches Vorzeichen ueber einer Welle steht - gerechnet, nicht gemerkt.**
 *
 *  Dieselbe Bauart wie der Kartenzug seit v303: eine reine Funktion aus
 *  Aussaat und Wellennummer, kein laufender Zufallszustand. Zwei Laeufe mit
 *  derselben Aussaat sehen in Welle 7 dasselbe Vorzeichen, gleich was
 *  dazwischen passiert ist - und `npm run determinism` haengt daran.
 *
 *  **Nicht jede Welle bekommt eines.** Ein Vorzeichen, das immer dasteht,
 *  ist keine Ankuendigung mehr, sondern der Normalfall (Regel 13, dieselbe
 *  Falle wie beim Konter-Satz). Die ersten `VORZEICHEN_AB` Wellen bleiben
 *  frei - man soll das Spiel kennen, bevor es sich aendert - und danach
 *  traegt jede DRITTE eines.
 *
 *  **Und das FINALE bleibt frei, und das ist gemessen** (v331). Die letzten
 *  Wellen eines Abschnitts sind die Spitze, die der Wellenplan selbst baut
 *  (`npm run wellenbau`: „Finale gleich Spitze"). Ein Vorzeichen obendrauf
 *  ist eine zweite Steigerung auf derselben Stelle - und die erste Karte hat
 *  dafuer keinen Platz: ohne Vorzeichen gewinnt sie ueber fuenf Aussaaten mit
 *  11 bis 17 Kristall, mit einem auf Welle 14 verliert sie fuenfmal von
 *  fuenf. Durchprobiert wurde erst die STAERKE (Regel 9) - 0,35 · 0,5 · 0,65
 *  · 0,8 · 1,0, und keine Abstufung traegt: bei 0,35 gewinnt eine von fuenf,
 *  bei 0,5 vier, bei 0,65 wieder eine. Die Zahl schwankt mit dem Zeichen,
 *  das gerade auf Welle 14 faellt, nicht mit seiner Hoehe. Derselbe Satz
 *  Aussaaten mit freiem Finale: vier von fuenf bei VOLLER Staerke.
 *
 *  Es ist also keine Abschwaechung, sondern eine Stelle: zwei Steigerungen
 *  auf derselben Welle sind eine zu viel.
 */
export const VORZEICHEN_AB = 4;
export const VORZEICHEN_TAKT = 5;
/** Wieviele Wellen am ENDE eines Abschnitts frei bleiben. */
export const VORZEICHEN_FINALE = 2;

export function vorzeichenFuer(
  aussaat: number, welle: number, wellen = Infinity,
): Vorzeichen | null {
  if (welle < VORZEICHEN_AB) return null;
  if (welle >= wellen - VORZEICHEN_FINALE) return null;
  if ((welle - VORZEICHEN_AB) % VORZEICHEN_TAKT !== 0) return null;
  // Die Mischung ist dieselbe wie in `zieheKarten`: Aussaat und Welle gehen
  // beide ein, damit zwei benachbarte Wellen nicht dasselbe ziehen.
  let h = (aussaat * 2654435761 + welle * 40503) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13;
  // **Das letzte `>>> 0` ist tragend, nicht Zierde.** `^` liefert eine
  // VORZEICHENBEHAFTETE 32-Bit-Zahl - bei gesetztem obersten Bit wird `h`
  // negativ, `h % 6` ebenso, und der Zugriff gibt `undefined` zurueck. Das
  // sieht aus wie "diese Welle hat kein Vorzeichen" und ist genau deshalb
  // nicht aufgefallen: der Fall ist erlaubt. Gemessen fielen vier von fuenf
  // Wellen still aus (4, 7, 13 leer, nur 10 trug eines), und die
  // Streifenmessung stand unveraendert gruen daneben.
  h >>>= 0;
  return VORZEICHEN_ORDNUNG[h % VORZEICHEN_ORDNUNG.length];
}

/** **Was ein Vorzeichen zahlenmaessig tut - aus den Feldern gebildet.**
 *
 *  Der Satz (`text`) sagt, WAS sich aendert; diese Zeile sagt, WIEVIEL.
 *  Beides aus derselben Quelle: schriebe jemand die Zahl in den Satz, waere
 *  sie beim naechsten Justieren falsch, und niemand faende es (Regel 15 -
 *  dieselbe Falle, die in v319 die Wellenvorschau und in v311 ein ganzes Tor
 *  gekostet hat).
 *
 *  Prozent nur dort, wo ein FAKTOR steht; Panzerung und Schild sind
 *  Stueckzahlen und werden auch so genannt. */
export function vorzeichenZahl(vz: Vorzeichen): string {
  const teile: string[] = [];
  const proz = (f: number): string => `${f > 1 ? '+' : '−'}${Math.round(Math.abs(f - 1) * 100)} %`;
  if (vz.panzer) teile.push(`Panzerung +${vz.panzer}`);
  if (vz.schild) teile.push(`Schild +${vz.schild}`);
  if (vz.leben) teile.push(`Leben ${proz(vz.leben)}`);
  if (vz.zahl) teile.push(`Zahl ${proz(vz.zahl)}`);
  if (vz.tempo) teile.push(`Tempo ${proz(vz.tempo)}`);
  if (vz.starr) teile.push(`Bremswiderstand +${Math.round(vz.starr * 100)} %`);
  return teile.join(' · ');
}
