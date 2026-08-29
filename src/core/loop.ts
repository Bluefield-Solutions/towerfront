import { MAX_DT } from '../data/config';

/** Wie oft ein Bild hintereinander scheitern darf, bevor die Schleife
 *  aufgibt. Zwei Sekunden bei sechzig Bildern.
 *
 *  Die Zahl trennt zwei sehr verschiedene Faelle: ein einzelnes Bild, das an
 *  einem halb geladenen Bildvorrat oder einer verlorenen Leinwand scheitert
 *  (das naechste laeuft wieder), und ein Fehler, der bei jedem Bild
 *  wiederkommt. Beim ersten waere Aufgeben falsch, beim zweiten waere
 *  Weitermachen nur noch Batterie. */
const AUFGEBEN_NACH = 120;

export class Loop {
  private raf = 0;
  private last = 0;
  private running = false;
  /** Gezaehlte Bilder. Die Messtafel liest ihn: steht er still, waehrend die
   *  Tafel weiterzaehlt, ist die Schleife tot und nicht das Geraet lahm. */
  bilder = 0;
  /** Wieviele Bilder hintereinander gerade scheitern, und woran. */
  fehlerFolge = 0;
  letzterFehler: string | null = null;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: () => void,
    /** Wird gerufen, wenn die Schleife endgueltig aufgibt. */
    private readonly melden: (grund: string) => void = () => {},
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      // **Das naechste Bild wird ZUERST bestellt.**
      //
      // Bis v196 stand diese Zeile am Ende. Warf `update` oder `render` ein
      // einziges Mal, wurde nie wieder ein Bild angefordert - die Schleife
      // war fuer den Rest der Sitzung tot. Von aussen sah das aus wie "das
      // Spiel reagiert nicht mehr": das Bild stand still, die Kopfzeile
      // aendert sich nicht mehr, und ein Tipp auf die Leinwand kam zwar an,
      // aenderte aber nichts Sichtbares mehr.
      //
      // Ein Fehler in einem Bild ist nicht dasselbe wie ein Fehler in allen.
      this.raf = requestAnimationFrame(tick);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > MAX_DT) dt = MAX_DT;
      try {
        this.update(dt);
        this.render();
        this.bilder++;
        this.fehlerFolge = 0;
      } catch (e) {
        this.letzterFehler = e instanceof Error ? e.message : String(e);
        this.fehlerFolge++;
        if (this.fehlerFolge >= AUFGEBEN_NACH) {
          this.stop();
          this.melden(`${this.letzterFehler} (${this.fehlerFolge} Bilder hintereinander)`);
        }
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  laeuft(): boolean { return this.running; }
}
