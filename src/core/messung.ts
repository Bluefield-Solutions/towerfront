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

/** Startet die Messung und zeigt sie an. Läuft neben dem Spiel her: gemessen
 *  wird, was das Spiel ohnehin tut, nicht ein eigener Prüfablauf. Ein
 *  eigener Ablauf misst sich selbst. */
export function messungStarten(): void {
  const tafel = document.createElement('div');
  tafel.id = 'messtafel';
  document.body.appendChild(tafel);

  const abstaende: number[] = [];
  const langeAufgaben: number[] = [];

  // Lange Aufgaben, wo der Browser sie meldet. Safari kennt den Beobachter
  // nicht - dann bleibt die Zeile leer statt falsch.
  let beobachterLaeuft = false;
  try {
    const po = new PerformanceObserver((liste) => {
      for (const e of liste.getEntries()) langeAufgaben.push(Math.round(e.duration));
    });
    po.observe({ entryTypes: ['longtask'] });
    beobachterLaeuft = true;
  } catch { /* nicht ueberall vorhanden */ }

  const start = performance.now();
  let vorher = start;
  /** Groesste Bildluecke seit dem Aufwaermen - der tragbare Ersatz fuer die
   *  lange Aufgabe. Ein Bild, das 300 ms auf sich warten laesst, hat 300 ms
   *  lang etwas anderes gemacht; ob der Browser das "long task" nennt, ist
   *  fuer den Spieler ohne Belang. */
  let groessteLuecke = 0;

  const zeigen = (): void => {
    const sortiert = [...abstaende].sort((a, b) => a - b);
    const mitte = sortiert.length ? sortiert[Math.floor(sortiert.length / 2)] : 0;
    const p95 = sortiert.length ? sortiert[Math.floor(sortiert.length * 0.95)] : 0;
    const schlimmste = langeAufgaben.length ? Math.max(...langeAufgaben) : 0;
    const bilderJeSek = mitte > 0 ? 1000 / mitte : 0;
    const laeuft = performance.now() - start < AUFWAERM_MS;

    const zeile = (name: string, wert: string, warnung = false): string =>
      `<div class="mz${warnung ? ' warn' : ''}"><span>${name}</span><b>${wert}</b></div>`;

    tafel.innerHTML =
      `<h2>Messung${laeuft ? ' · wärmt auf' : ''}</h2>`
      + `<div class="mw">${zeichenwerk()}</div>`
      + zeile('Bildpunkte', `${Math.round(window.innerWidth)} × ${Math.round(window.innerHeight)}`
        + ` · ${window.devicePixelRatio || 1}×`)
      + zeile('Bilddauer Mitte', `${mitte.toFixed(1)} ms  (${bilderJeSek.toFixed(0)}/s)`, mitte > 20)
      + zeile('Bilddauer p95', `${p95.toFixed(1)} ms`, p95 > 33)
      // Die tragbare Zahl steht OBEN, die browserabhaengige darunter.
      + zeile('Längste Bildlücke', `${groessteLuecke.toFixed(0)} ms`, groessteLuecke > SOLL_MS)
      + (beobachterLaeuft
        ? zeile('davon als Aufgabe', `${schlimmste} ms`, schlimmste > SOLL_MS)
        : zeile('davon als Aufgabe', 'meldet dieser Browser nicht'))
      + `<div class="mh"><b>Tippe in eine Karte und spiele eine Welle</b> — im Menü misst`
      + ' diese Tafel das Menü. Sie läuft weiter und rechnet über die letzten'
      + ` ${Math.round(FENSTER / 60)} Sekunden.<br><br>Norm: eine Aufgabe über ${SOLL_MS} ms`
      + ' blockiert die Eingabe. Diese Tafel gehört abfotografiert — die'
      + ' Entwicklungsmaschine hat keine Grafikkarte und kann diese Zahlen nicht'
      + ' selbst erzeugen.</div>';
  };

  const takt = (jetzt: number): void => {
    const luecke = jetzt - vorher;
    vorher = jetzt;
    // Erst nach dem Aufwaermen zaehlen - siehe AUFWAERM_MS.
    if (jetzt - start >= AUFWAERM_MS) {
      abstaende.push(luecke);
      if (abstaende.length > FENSTER) abstaende.shift();
      if (luecke > groessteLuecke) groessteLuecke = luecke;
    }
    requestAnimationFrame(takt);
    // Nicht in jedem Bild neu schreiben - das waere selbst eine Last.
    if (abstaende.length % 30 === 0) zeigen();
  };
  // Das erste Bild wird verworfen: sein Abstand enthaelt alles, was vorher lag.
  requestAnimationFrame((t) => { vorher = t; requestAnimationFrame(takt); });
  zeigen();
}
