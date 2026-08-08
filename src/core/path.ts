import type { Vec } from './math';

/** Ein Weg als Kurve.
 *
 *  Bis v35 war ein Weg eine Kette achsenparalleler Abschnitte auf einem
 *  Kachelraster. Daraus folgten zwangsläufig 90-Grad-Ecken - man konnte sie
 *  nicht abrunden, weil es nichts zum Abrunden gab.
 *
 *  Jetzt laeuft eine Catmull-Rom-Kurve durch gesetzte Punkte. Diese Kurvenart
 *  ist dafuer die richtige, weil sie *durch* ihre Kontrollpunkte laeuft und
 *  nicht nur in ihre Richtung gezogen wird - man setzt einen Punkt dorthin, wo
 *  der Weg im Bild liegt, und die Kurve trifft ihn.
 *
 *  Das zweite Problem der Kurven ist die Geschwindigkeit: laeuft man mit
 *  gleichmaessigem Kurvenparameter, wird man in engen Kurven langsamer und auf
 *  Geraden schneller. Deshalb wird die Kurve einmal dicht abgetastet und eine
 *  Tabelle der zurueckgelegten Strecke gefuehrt. Danach ist "wo bin ich nach
 *  740 Pixeln" eine Nachschlagefrage, und ein Gegner laeuft ueberall gleich
 *  schnell. */
export class LanePath {
  /** Dicht abgetastete Punkte entlang der Kurve. */
  readonly pts: Vec[] = [];
  /** Zurueckgelegte Strecke bis zum jeweiligen Punkt. */
  readonly cum: number[] = [];
  /** Gesamtlaenge in Pixeln. */
  readonly length: number;

  /** @param control Kontrollpunkte in Weltkoordinaten. Der erste darf
   *  ausserhalb des Feldes liegen - dort steht das Tor.
   *  @param perSpan Abtastpunkte je Abschnitt. 24 ist fein genug, dass man
   *  die Abtastung nicht sieht, und grob genug, dass die Tabelle klein bleibt. */
  constructor(readonly control: Vec[], perSpan = 24) {
    const n = control.length;
    if (n < 2) throw new Error('Ein Weg braucht mindestens zwei Punkte.');

    // Rand behandeln: die Kurve braucht je einen Punkt vor dem ersten und
    // hinter dem letzten. Gespiegelt, damit sie am Ende nicht ausschert.
    const p = (i: number): Vec => {
      if (i < 0) {
        return { x: 2 * control[0].x - control[1].x, y: 2 * control[0].y - control[1].y };
      }
      if (i >= n) {
        return {
          x: 2 * control[n - 1].x - control[n - 2].x,
          y: 2 * control[n - 1].y - control[n - 2].y,
        };
      }
      return control[i];
    };

    for (let i = 0; i < n - 1; i++) {
      const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
      const steps = i === n - 2 ? perSpan : perSpan - 1;
      for (let k = 0; k <= steps; k++) {
        const t = k / perSpan;
        const t2 = t * t, t3 = t2 * t;
        this.pts.push({
          x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t
            + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
            + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t
            + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
            + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        });
      }
    }

    this.cum.push(0);
    for (let i = 1; i < this.pts.length; i++) {
      const dx = this.pts[i].x - this.pts[i - 1].x;
      const dy = this.pts[i].y - this.pts[i - 1].y;
      this.cum.push(this.cum[i - 1] + Math.hypot(dx, dy));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  /** Position und Blickrichtung nach der Strecke `s`.
   *
   *  Die Suche geht binaer ueber die Streckentabelle - bei rund 200 Punkten
   *  sind das acht Vergleiche, und sie laeuft je Gegner und Bild einmal. */
  at(s: number): { x: number; y: number; angle: number } {
    const total = this.length;
    if (s <= 0) return this.pointAt(0, 0);
    if (s >= total) return this.pointAt(this.pts.length - 2, 1);

    let lo = 0, hi = this.cum.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= s) lo = mid; else hi = mid;
    }
    const span = this.cum[hi] - this.cum[lo];
    return this.pointAt(lo, span > 0 ? (s - this.cum[lo]) / span : 0);
  }

  private pointAt(i: number, f: number): { x: number; y: number; angle: number } {
    const a = this.pts[i], b = this.pts[Math.min(i + 1, this.pts.length - 1)];
    return {
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }

  /** Kuerzester Abstand eines Punktes zur Kurve. Wird gebraucht, um zu
   *  pruefen, ob ein Bauplatz den Weg ueberhaupt erreicht. */
  distanceTo(x: number, y: number): number {
    let best = Infinity;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      let t = len2 > 0 ? ((x - a.x) * dx + (y - a.y) * dy) / len2 : 0;
      t = Math.min(1, Math.max(0, t));
      const px = a.x + dx * t - x, py = a.y + dy * t - y;
      const d = px * px + py * py;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  /** Wieviel der Kurve liegt innerhalb eines Kreises? Ergebnis in Pixeln
   *  Wegstrecke - das Mass fuer "was deckt dieser Bauplatz ab". */
  coveredLength(x: number, y: number, radius: number): number {
    let sum = 0;
    const r2 = radius * radius;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1];
      const mx = (a.x + b.x) / 2 - x, my = (a.y + b.y) / 2 - y;
      if (mx * mx + my * my <= r2) sum += this.cum[i + 1] - this.cum[i];
    }
    return sum;
  }
}
