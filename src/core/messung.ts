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

/** Grenze aus der Web-Norm: darüber blockiert eine Aufgabe die Eingabe. */
const SOLL_MS = 50;

/** So lange wird der Dauerbetrieb beobachtet. */
const MESSDAUER_MS = 6000;

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
  let fertig = false;

  const zeigen = (): void => {
    const sortiert = [...abstaende].sort((a, b) => a - b);
    const mitte = sortiert.length ? sortiert[Math.floor(sortiert.length / 2)] : 0;
    const p95 = sortiert.length ? sortiert[Math.floor(sortiert.length * 0.95)] : 0;
    const schlimmste = langeAufgaben.length ? Math.max(...langeAufgaben) : 0;
    const bilderJeSek = mitte > 0 ? 1000 / mitte : 0;

    const zeile = (name: string, wert: string, warnung = false): string =>
      `<div class="mz${warnung ? ' warn' : ''}"><span>${name}</span><b>${wert}</b></div>`;

    tafel.innerHTML =
      `<h2>Messung${fertig ? '' : ' läuft …'}</h2>`
      + `<div class="mw">${zeichenwerk()}</div>`
      + zeile('Bildpunkte', `${Math.round(window.innerWidth)} × ${Math.round(window.innerHeight)}`
        + ` · ${window.devicePixelRatio || 1}×`)
      + zeile('Bilder gemessen', String(abstaende.length))
      + zeile('Bilddauer Mitte', `${mitte.toFixed(1)} ms  (${bilderJeSek.toFixed(0)}/s)`, mitte > 20)
      + zeile('Bilddauer p95', `${p95.toFixed(1)} ms`, p95 > 33)
      + (beobachterLaeuft
        ? zeile('Längste Aufgabe', `${schlimmste} ms`, schlimmste > SOLL_MS)
        : zeile('Längste Aufgabe', 'nicht messbar (Safari)'))
      + `<div class="mh">Norm: eine Aufgabe über ${SOLL_MS} ms blockiert die Eingabe.`
      + ' Diese Tafel gehört abfotografiert — die Entwicklungsmaschine hat keine'
      + ' Grafikkarte und kann diese Zahlen nicht selbst erzeugen.</div>';
  };

  const takt = (jetzt: number): void => {
    abstaende.push(jetzt - vorher);
    vorher = jetzt;
    if (jetzt - start < MESSDAUER_MS) {
      requestAnimationFrame(takt);
      // Nicht in jedem Bild neu schreiben - das waere selbst eine Last.
      if (abstaende.length % 30 === 0) zeigen();
    } else {
      fertig = true;
      zeigen();
    }
  };
  // Das erste Bild wird verworfen: sein Abstand enthaelt alles, was vorher lag.
  requestAnimationFrame((t) => { vorher = t; requestAnimationFrame(takt); });
  zeigen();
}
