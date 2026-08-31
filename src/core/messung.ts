/** Die Messung auf dem Zielgerät.
 *
 *  Warum sie im Spiel steckt und nicht in einem Werkzeug: sie MUSS dort
 *  laufen, wo die Frage offen ist, und das ist das iPhone. Der Rechner, auf
 *  dem entwickelt wird, hat kein `/dev/dri` und keine Grafikkarte — er rechnet
 *  unter SwiftShader, einer Software-Rasterung. Genau der Teil, der dort
 *  dominiert (Rastern, Zusammensetzen), ist der, den ein Telefon anders zahlt.
 *  Alle Browserzahlen aus v112 bis v115 stehen deshalb unter Vorbehalt
 *  (Regel 12), und kein Werkzeug in diesem Verzeichnis kann den Vorbehalt
 *  auflösen. Ein Gerät kann es.
 *
 *  Aufruf: die ausgelieferte Datei mit `#messung` öffnen. Ohne die Raute
 *  passiert nichts — kein Knopf, keine Anzeige, kein Rechenaufwand. Das ist
 *  dieselbe Überlegung wie bei Regel 6: was nicht hingehört, darf nicht
 *  versehentlich auftauchen können.
 *
 *  Was gemessen wird, und warum gerade das:
 *
 *   - **Zeichenwerk.** Zuerst und in groß. Ohne diese Zeile ist jede Zahl
 *     darunter wertlos, denn sie sagt nicht, wer gerechnet hat.
 *   - **Bilddauer im Dauerbetrieb** (Mittelwert und p95). Das ist die Zahl,
 *     die über flüssig oder ruckelig entscheidet.
 *   - **Längste Einzelaufgabe.** Die Norm zieht die Grenze bei 50 ms; alles
 *     darüber blockiert die Eingabe.
 *
 *  Die Anzeige ist bewusst groß und ruhig: sie wird abfotografiert und
 *  weitergeschickt, nicht angetippt.
 */

/** Grenze aus der Web-Norm: darueber blockiert eine Aufgabe die Eingabe. */
const SOLL_MS = 50;

/** Wieviele Bildabstaende in das gleitende Fenster gehen. Bei 60 Bildern je
 *  Sekunde sind 600 rund zehn Sekunden - lang genug, dass eine Welle
 *  hineinpasst, kurz genug, dass die Zahl noch von JETZT handelt. */
const FENSTER = 600;

/** Wie lange nach dem Laden nichts gezaehlt wird.
 *
 *  Der erste Augenblick enthaelt Entpacken, Uebersetzen und das erste Bild -
 *  Dinge, die genau einmal vorkommen. Sie wuerden den Ausschlag fuer immer
 *  bestimmen und die eigentliche Frage zudecken. */
const AUFWAERM_MS = 2000;

export function messungGewuenscht(): boolean {
  return typeof location !== 'undefined' && location.hash.toLowerCase() === '#messung';
}

/** Laeuft die Tafel gerade? */
export function messungLaeuft(): boolean { return tafel !== null; }

/** Alles, was auf der Tafel steht, als Text - zum Weitergeben.
 *
 *  Ein Foto muss abgetippt werden, Text nicht. Und die Zeilen, auf die es
 *  ankommt, sind Zahlen: abgetippt werden sie falsch. */
export function messungAlsText(): string { return letzterText; }

let tafel: HTMLElement | null = null;
let letzterText = '';
// **Eingeklappt ist der Anfangszustand.**
//
// Ausgeklappt ist die Tafel je nach Geraet 274 bis 438 Punkte hoch und
// deckt damit auf jedem Bildschirm etwas zu, das man braucht. Wer sie
// anschaltet, will messen und weiterspielen; ablesen will er, wenn er
// hinsieht. Der erste Entwurf fing ausgeklappt an, und das erste, was der
// Nutzer meldete, war "man kann Welle starten nicht mehr klicken".
let eingeklappt = true;
/** Was der Kopierknopf gerade sagt, und bis wann.
 *
 *  Die Rueckmeldung muss das Neuzeichnen ueberleben: die Tafel schreibt sich
 *  alle dreissig Bilder neu, und die erste Fassung setzte "kopiert" direkt
 *  auf den Knopf - eine halbe Sekunde spaeter war es weg, oft bevor man
 *  hingesehen hatte. */
let kopieMeldung = '';
let kopieBis = 0;
let laufendeAnimation = 0;
let abmelden: (() => void) | null = null;

/** Die Tafel schliessen und alles anhalten, was fuer sie laeuft. */
export function messungAus(): void {
  if (laufendeAnimation) cancelAnimationFrame(laufendeAnimation);
  laufendeAnimation = 0;
  abmelden?.();
  abmelden = null;
  tafel?.remove();
  tafel = null;
  letzterText = '';
}

/** Welches Zeichenwerk rechnet hier wirklich? */
function zeichenwerk(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'kein WebGL';
    const e = gl.getExtension('WEBGL_debug_renderer_info');
    return String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch {
    return 'nicht feststellbar';
  }
}

/** Eine Zeile, die von aussen kommt: Name, Wert, und ob sie warnen soll. */
export type Zusatzzeile = [string, string, boolean?];

/** Startet die Messung und zeigt sie an.
 *
 *  `zusatz` liefert Zeilen, die nur der Hauptteil kennt: laeuft die
 *  Spielschleife noch, wieviel Bildspeicher liegt herum, ist die Leinwand
 *  schwarz, welche Ausrichtung gilt. Sie stehen hier und nicht in einer
 *  zweiten Tafel, weil ein Befund vom Zielgeraet als EIN Foto zurueckkommt -
 *  und was auf zwei Tafeln steht, kommt halb zurueck. */
export function messungStarten(zusatz: () => Zusatzzeile[] = () => []): void {
  if (tafel) return;
  tafel = document.createElement('div');
  tafel.id = 'messtafel';
  document.body.appendChild(tafel);
  // Die beiden Knoepfe der Tafel wirken ueber die Ereignisblase, damit sie
  // das Neuschreiben des Inhalts ueberleben - sonst haenge nach dem ersten
  // Bild kein Behandler mehr an ihnen.
  const aufTipp = (ev: Event): void => {
    const knopf = (ev.target as HTMLElement).closest('button');
    if (!knopf) return;
    if (knopf.dataset.mess === 'klappe') { eingeklappt = !eingeklappt; zeigen(); }
    if (knopf.dataset.mess === 'kopie') kopieren(knopf);
  };
  tafel.addEventListener('click', aufTipp);

  const abstaende: number[] = [];
  const langeAufgaben: number[] = [];

  // Lange Aufgaben, wo der Browser sie meldet. Safari kennt den Beobachter
  // nicht - dann bleibt die Zeile leer statt falsch.
  //
  // **Und "kein Fehler" ist nicht dasselbe wie "keine langen Aufgaben"**
  // (Regel 5). Die erste Fassung fragte nur, ob `observe` wirft. Safari
  // wirft nicht - es nimmt die Art `longtask` entgegen und meldet nie
  // etwas. Auf dem Zielgeraet stand daraufhin "0 ms", und das las sich wie
  // ein gutes Ergebnis, obwohl gar nicht gemessen wurde. Gefragt wird
  // deshalb die Liste der unterstuetzten Arten.
  let beobachterLaeuft = false;
  try {
    const arten = (PerformanceObserver as unknown as { supportedEntryTypes?: string[] })
      .supportedEntryTypes;
    if (arten && arten.includes('longtask')) {
      const po = new PerformanceObserver((liste) => {
        for (const e of liste.getEntries()) langeAufgaben.push(Math.round(e.duration));
      });
      po.observe({ entryTypes: ['longtask'] });
      beobachterLaeuft = true;
    }
  } catch { /* nicht ueberall vorhanden */ }

  const start = performance.now();
  let vorher = start;
  /** Groesste Bildluecke seit dem Aufwaermen - der tragbare Ersatz fuer die
   *  lange Aufgabe. Ein Bild, das 300 ms auf sich warten laesst, hat 300 ms
   *  lang etwas anderes gemacht; ob der Browser das "long task" nennt, ist
   *  fuer den Spieler ohne Belang. */
  let groessteLuecke = 0;
  /** Wurde die Seite seit dem letzten Bild verborgen? Dann ist der naechste
   *  Abstand die Pause und nicht die Bilddauer. */
  let versteckt = false;
  const aufSichtbarkeit = (): void => { if (document.hidden) versteckt = true; };
  document.addEventListener('visibilitychange', aufSichtbarkeit);
  // Beim Abschalten wieder abmelden - sonst haengt nach dem dritten
  // Ein und Aus derselbe Behandler dreimal am Dokument.
  abmelden = () => document.removeEventListener('visibilitychange', aufSichtbarkeit);

  const zeigen = (): void => {
    const sortiert = [...abstaende].sort((a, b) => a - b);
    const mitte = sortiert.length ? sortiert[Math.floor(sortiert.length / 2)] : 0;
    const p95 = sortiert.length ? sortiert[Math.floor(sortiert.length * 0.95)] : 0;
    const schlimmste = langeAufgaben.length ? Math.max(...langeAufgaben) : 0;
    const bilderJeSek = mitte > 0 ? 1000 / mitte : 0;
    const laeuft = performance.now() - start < AUFWAERM_MS;

    // **Die Zeilen entstehen als DATEN, nicht als Markup** - und der Text
    // zum Weitergeben fällt aus denselben Daten. Zwei Fassungen derselben
    // Zahl waeren die zweite Wahrheit (Regel 15), und ausgerechnet beim
    // Abschreiben von Messwerten faellt so etwas niemandem auf.
    // **Waehrend des Aufwaermens steht ein Strich, keine Null.**
    //
    // "0.0 ms (0/s)" liest sich wie ein Befund, ist aber nur "noch nichts
    // gezaehlt" - und seit die Tafel mitten im Spiel angeschaltet werden
    // kann, sieht man diese zwei Sekunden jedes Mal.
    const noch = (wert: string): string => (laeuft ? '—' : wert);
    const daten: Zusatzzeile[] = [
      ['Bildpunkte', `${Math.round(window.innerWidth)} × ${Math.round(window.innerHeight)}`
        + ` · ${window.devicePixelRatio || 1}×`],
      ['Bilddauer Mitte', noch(`${mitte.toFixed(1)} ms  (${bilderJeSek.toFixed(0)}/s)`),
        !laeuft && mitte > 20],
      ['Bilddauer p95', noch(`${p95.toFixed(1)} ms`), !laeuft && p95 > 33],
      // Die tragbare Zahl steht OBEN, die browserabhaengige darunter.
      ['Längste Bildlücke', noch(`${groessteLuecke.toFixed(0)} ms`),
        !laeuft && groessteLuecke > SOLL_MS],
      ['davon als Aufgabe', beobachterLaeuft
        ? noch(`${schlimmste} ms`) : 'meldet dieser Browser nicht',
      beobachterLaeuft && !laeuft && schlimmste > SOLL_MS],
      // **Der Zustandsteil.** Er misst nichts, er sagt, was gerade los ist -
      // und er steht hier, weil diese Tafel das einzige ist, was vom
      // Zielgeraet zurueckkommt.
      ...zusatz(),
    ];

    const werk = zeichenwerk();
    letzterText = [`Towerfront-Messung ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      werk, ...daten.map(([n, w]) => `${n}: ${w}`)].join('\n');

    const zeile = ([name, wert, warnung]: Zusatzzeile): string =>
      `<div class="mz${warnung ? ' warn' : ''}"><span>${name}</span><b>${wert}</b></div>`;

    // Eingeklappt bleibt EINE Zeile stehen: die Bilddauer. Sie ist die
    // Zahl, wegen derer man die Tafel anmacht - und eingeklappt deckt sie
    // kein Spielfeld mehr zu.
    const kopf = `<div class="mk">`
      + `<button type="button" class="mb" data-mess="klappe" aria-expanded="${!eingeklappt}">`
      + `${eingeklappt ? '▸' : '▾'} Messung${laeuft ? ' · wärmt auf' : ''}`
      + `${eingeklappt && !laeuft ? ` · ${bilderJeSek.toFixed(0)}/s` : ''}</button>`
      + `<button type="button" class="mb" data-mess="kopie">`
      + `${performance.now() < kopieBis ? kopieMeldung : 'Kopieren'}</button></div>`;

    tafel!.innerHTML = eingeklappt ? kopf : kopf
      + `<div class="mw">${werk}</div>`
      + daten.map(zeile).join('')
      // **Zwei Fussteile statt einem.** Der erste sagt, was zu tun ist, und
      // bleibt immer stehen; der zweite erklaert und faellt auf flachen
      // Geraeten weg. Auf dem iPhone quer war die Tafel 473 Punkte hoch bei
      // 390 Punkten Bildschirm - abgeschnitten wurden oben genau die Zeilen,
      // wegen derer sie existiert (Zeichenwerk, Bildpunkte, Bilddauer).
      + `<div class="mh mh-tun"><b>Quer halten, in eine Karte tippen, eine Welle`
      + ' spielen</b> — im Menü misst diese Tafel das Menü.</div>'
      + `<div class="mh mh-mehr">Sie rechnet über die letzten`
      + ` ${Math.round(FENSTER / 60)} Sekunden. Norm: eine Aufgabe über ${SOLL_MS} ms`
      + ' blockiert die Eingabe.</div>';
  };

  /** Alles in die Zwischenablage. Zwei Wege, weil der bequeme nicht ueberall
   *  da ist: `navigator.clipboard` braucht eine sichere Verbindung, und ein
   *  Telefon, das die Datei ueber `file://` oeffnet, hat keine. */
  const kopieren = (knopf: HTMLElement): void => {
    const fertig = (wie: string): void => {
      kopieMeldung = wie;
      kopieBis = performance.now() + 1600;
      knopf.textContent = wie;
    };
    const alt = (): void => {
      const feld = document.createElement('textarea');
      feld.value = letzterText;
      feld.setAttribute('readonly', '');
      feld.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(feld);
      feld.select();
      feld.setSelectionRange(0, letzterText.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      feld.remove();
      fertig(ok ? 'kopiert' : 'ging nicht');
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(letzterText).then(() => fertig('kopiert'), alt);
    } else {
      alt();
    }
  };

  const takt = (jetzt: number): void => {
    const luecke = jetzt - vorher;
    vorher = jetzt;
    // **Was im Hintergrund passiert, ist keine Bildluecke.**
    //
    // Auf dem Zielgeraet stand hier 158 179 ms - zweieinhalb Minuten. Das
    // war kein Ruckeln, das war ein gesperrter Bildschirm: `rAF` haelt an,
    // solange die Seite verborgen ist, und der erste Takt danach traegt die
    // ganze Pause. Die auffaelligste Zahl der Tafel mass damit, wie lange
    // das Telefon in der Tasche war (Regel 13).
    //
    // Gezaehlt wird deshalb nur, was zwischen zwei SICHTBAREN Bildern liegt.
    if (versteckt) { versteckt = false; return; }
    // Erst nach dem Aufwaermen zaehlen - siehe AUFWAERM_MS.
    if (jetzt - start >= AUFWAERM_MS) {
      abstaende.push(luecke);
      if (abstaende.length > FENSTER) abstaende.shift();
      if (luecke > groessteLuecke) groessteLuecke = luecke;
    }
    laufendeAnimation = requestAnimationFrame(takt);
    // Nicht in jedem Bild neu schreiben - das waere selbst eine Last.
    if (abstaende.length % 30 === 0) zeigen();
  };
  // Das erste Bild wird verworfen: sein Abstand enthaelt alles, was vorher lag.
  laufendeAnimation = requestAnimationFrame((t) => {
    vorher = t;
    laufendeAnimation = requestAnimationFrame(takt);
  });
  zeigen();
}
