/**
 * Die Zeichenwerkstatt: eine Leinwand, auf der man MESSEN darf.
 *
 * **Warum es sie gibt.** Das Geruest, mit dem ein Werkzeug die Zeichenschicht
 * ohne Browser betreibt - ein Dokument, das Flaechen anlegt, eine Bildklasse,
 * die das Laden mitzaehlt -, stand dreimal im Baum: in `kristall.mjs`, in
 * `speicher.mjs` und in `shots.mjs`. Wer eine neue Messung schreibt, kopiert
 * es aus dem naechstbesten Werkzeug.
 *
 * Und dabei kopiert er das Geruest, aber nicht die Sorgfalt. Genau so sind in
 * v188 zwei Messungen entstanden, die keine waren: sie zeichneten ihr erstes
 * Bild und verglichen es - und das erste Bild eines Laufs ist keine Messung
 * (Regel 16). Untergrund, Bilder, Schattenrisse und Leuchtscheiben entstehen
 * erst beim Zeichnen; in v182 waren das 97,6 % aller Bildpunkte bei
 * IDENTISCHEM Zustand, in v188 noch 7,15 Abstand ueber 75 113 Punkte.
 *
 * **Deshalb gibt diese Werkstatt kein rohes "zeichne" heraus, sondern nur
 * `warmesBild()`.** Das erste Bild wird gezeichnet und weggeworfen, danach
 * wird gemessen. Es gibt keine Stelle mehr, an der man es vergessen kann -
 * dieselbe Bewegung wie bei `ui.sync()` und Regel 6: eine Ableitung statt
 * eines Schalters.
 *
 * Die Tore, die es heute schon richtig machen, machen es weiter richtig:
 * nachgemessen ist keine ihrer Zahlen verfaelscht. `bench-draw` waermt
 * zwanzig Sekunden vor, und die Ruhepruefung in `shots.mjs` ist gegen das
 * Aufwaermen immun, weil sie zwei gleich behandelte Laeufe voneinander
 * abzieht - der Effekt faellt aus der Differenz heraus. Diese Werkstatt ist
 * fuer alles, was DANACH geschrieben wird.
 */
import { createCanvas, Image as NativeImage, Path2D as NativePath2D } from '@napi-rs/canvas';

let aufgebaut = false;
let offen = 0;

/** Dokument, Fenster und Bildklasse stellen. Mehrfach aufzurufen schadet
 *  nicht - das zweite Mal tut nichts. */
function geruest(breite, hoehe, nachLeinwand) {
  if (aufgebaut) return;
  // **Ein fremdes Geruest ist ein Fehler, kein Sonderfall.**
  //
  // Der erste Entwurf liess es einfach stehen ("wer zuerst da ist, gewinnt").
  // Das waere die schlechtere Haelfte gewesen: die fremde Bildklasse bedient
  // ihren EIGENEN Zaehler, `bilderAbwarten` haette also sofort
  // zurueckgegeben und falsche Sicherheit gestiftet - genau die Sorte
  // stiller Fehler, gegen die diese Werkstatt gebaut ist.
  if (globalThis.document) {
    throw new Error('Es steht schon ein anderes Zeichengeruest. Zwei davon in '
      + 'einem Prozess heisst: `bilderAbwarten` zaehlt den falschen Zaehler und '
      + 'gibt sofort zurueck. Das Werkzeug muss `geruestStellen()` benutzen '
      + 'statt sein eigenes Dokument zu setzen.');
  }
  aufgebaut = true;
  globalThis.document = {
    createElement: (tag) => {
      if (tag !== 'canvas') throw new Error(`nur canvas, nicht ${tag}`);
      const c = createCanvas(1, 1);
      // Ein Haken fuer Werkzeuge, die an JEDER Leinwand etwas mitzaehlen -
      // `kartenwechsel` haengt sich so an `getImageData` und `putImageData`.
      // Ohne ihn braeuchte es ein eigenes Geruest, und das waere die
      // naechste Kopie.
      return nachLeinwand ? (nachLeinwand(c) ?? c) : c;
    },
  };
  globalThis.window = { devicePixelRatio: 2, innerWidth: breite, innerHeight: hoehe };
  pfadklasseStellen();
  globalThis.Image = class extends NativeImage {
    set src(wert) {
      offen++;
      const fertig = () => { offen--; };
      const vorLaden = this.onload, vorFehler = this.onerror;
      this.onload = () => { fertig(); vorLaden?.(); };
      this.onerror = () => { fertig(); vorFehler?.(); };
      super.src = wert;
    }
    get src() { return super.src; }
  };
}

/** Nur die Pfadklasse stellen.
 *
 *  `Path2D` ist im Browser global; in Node ist es das nicht, und jsdom bringt
 *  es auch nicht mit. Seit v203 baut `gfx/bauflaeche.ts` die verbotene Flaeche
 *  als Pfad - ohne diese Klasse faellt JEDES Werkzeug um, das ein Bild mit
 *  gewaehlter Turmsorte zeichnet, mit `Path2D is not defined`.
 *
 *  Es steht hier und nicht in den drei jsdom-Werkzeugen, weil drei Attrappen
 *  drei Fassungen waeren (Regel 15) - und weil eine Attrappe die falsche
 *  Antwort gaebe: die echte Klasse rechnet, eine leere tut nur so. Wer sie
 *  ruft, braucht kein Zeichengeruest und stoert auch keines.
 *
 *  Mehrfach zu rufen schadet nicht. */
export function pfadklasseStellen() {
  globalThis.Path2D = NativePath2D;
}

/** Das Geruest allein - fuer Werkzeuge, die Bilder brauchen, bevor sie eine
 *  Werkstatt aufsetzen (das Kristalltor misst erst am gebackenen Erzeugnis
 *  und dann am Bild). */
export function geruestStellen(breite = 844, hoehe = 390, nachLeinwand = null) {
  geruest(breite, hoehe, nachLeinwand);
}

/** Warten, bis kein Bild mehr laedt. */
export async function bilderAbwarten() {
  for (let i = 0; i < 400 && offen > 0; i++) await new Promise((r) => setTimeout(r, 5));
}

/**
 * Eine Werkstatt aufsetzen.
 *
 * `aufbau(zustand)` stellt die Partie her - Karte, Tuerme, Welle. Danach
 * werden alle Bilder angefordert und abgewartet, der Kartenaufbau zu Ende
 * gerechnet und ein Bild verworfen.
 */
export async function zeichenwerkstatt({
  breite = 844, hoehe = 390, aufbau = null,
} = {}) {
  geruest(breite, hoehe);
  const { GameState } = await import('../src/game/state.ts');
  const { Renderer } = await import('../src/gfx/renderer.ts');
  const { getObjectArt } = await import('../src/gfx/objectart.ts');
  const { OBJECT_ART } = await import('../src/gfx/assets/objects.ts');
  const { getBackground } = await import('../src/gfx/backgrounds.ts');

  const leinwand = createCanvas(breite * 2, hoehe * 2);
  Object.defineProperty(leinwand, 'clientWidth', { get: () => breite });
  Object.defineProperty(leinwand, 'clientHeight', { get: () => hoehe });
  const zustand = new GameState();
  const zeichner = new Renderer(leinwand);
  zeichner.menu = null;
  aufbau?.(zustand);

  for (const k of Object.keys(OBJECT_ART)) getObjectArt(k);
  getBackground(zustand.map.id);
  zeichner.resize();
  // **Dieser Aufruf hat seit v226 KEINE Gegenprobe, und das steht hier, statt
  // still zu bleiben.**
  //
  // Bis v225 gab es eine: sie nahm die Zeile heraus und erwartete, dass das
  // Kristalltor rot wird. Auf diesem Rechner tat es das - 87 898 Punkte
  // Unterschied, die Zahl von v190. Im vollen Lauf zu v225 auf dem Runner tat
  // es das NICHT, und zwar zu Recht: `tools/kristall.mjs` wartet schon vor der
  // Werkstatt einmal, also ist hier nichts mehr offen. Ob das zweite Warten
  // etwas aendert, entschied damit die Geschwindigkeit der Maschine.
  //
  // Eine Probe, die auf einem Rechner beweist und auf dem anderen nicht, ist
  // keine - und schlimmer als keine, weil ein Lauf ohne Befund wie ein Beweis
  // aussieht. Gemessen: `kristall.mjs` ist heute der EINZIGE Benutzer der
  // Werkstatt, und es wartet vorher. Fuer den naechsten, der das nicht tut,
  // ist diese Zeile richtig - beweisen laesst sie sich erst dann.
  //
  // Die FUNKTION ist weiterhin gegengeprobt, und deterministisch: bricht man
  // `bilderAbwarten` selbst, meldet das Kristalltor "kein Bild der
  // Ringstation im Vorrat" - hier wie auf dem Runner. Nachgefahren mit dem
  // ganzen Ausbau und mit einem Abzaehlfehler (`offen > 1`), beide Male rot.
  await bilderAbwarten();
  zeichner.kartenaufbauAbschliessen?.(zustand);

  // **Das Wegwerfbild.** Es steht hier und nicht beim Aufrufer, damit es
  // keine Werkstatt ohne eines gibt.
  //
  // Es ist aber NICHT das, was die Messung rettet - das ist `bilderAbwarten`
  // zwei Zeilen darueber. Nachgemessen an der Nullprobe des Kristalltors:
  // ohne `bilderAbwarten` sind zwei Bilder desselben Zustands an **87 898
  // Punkten** verschieden, mit ihm an null. Ohne den Kartenaufbau
  // abzuschliessen bleibt die Nullprobe null (die absoluten Zahlen
  // verschieben sich, weil sonst auf einem halbfertigen Untergrund gemessen
  // wird). Und ohne dieses Wegwerfbild bleibt sie ebenfalls null.
  //
  // Es bleibt trotzdem stehen, aber mit der richtigen Begruendung: fuer
  // alles, was beim ERSTEN Zeichnen entsteht und im selben Bild noch nicht
  // stimmt. Was das Aufwaermen in v182 und v188 wirklich verursacht hat,
  // waren die noch nicht geladenen Bilder.
  zeichner.draw(zustand);

  const g = leinwand.getContext('2d');
  return {
    zustand,
    zeichner,
    leinwand,
    breite: leinwand.width,
    hoehe: leinwand.height,
    /** Ein Bild zeichnen und seine Punkte zurueckgeben. Immer warm. */
    warmesBild() {
      zeichner.draw(zustand);
      return g.getImageData(0, 0, leinwand.width, leinwand.height).data;
    },
    /** Ein Ausschnitt um einen Weltpunkt, in Geraetepunkten. */
    ausschnitt(weltX, weltY, weltRadius) {
      zeichner.draw(zustand);
      const p = zeichner.worldToScreen(weltX, weltY);
      const rad = weltRadius * zeichner.scale;
      const x0 = Math.max(0, Math.round((p.x - rad) * 2));
      const x1 = Math.min(leinwand.width, Math.round((p.x + rad) * 2));
      const y0 = Math.max(0, Math.round((p.y - rad) * 2));
      const y1 = Math.min(leinwand.height, Math.round((p.y + rad) * 2));
      const breite2 = Math.max(1, x1 - x0);
      return { punkte: g.getImageData(x0, y0, breite2, Math.max(1, y1 - y0)).data, breite: breite2 };
    },
  };
}
