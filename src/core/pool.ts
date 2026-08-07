/** Objektlager und Kompaktierung.
 *
 *  Kurzlebige Objekte - Partikel, Geschosse, Ringe - entstanden bisher bei
 *  jedem Treffer neu und wurden per `filter()` in ein jeweils frisches Array
 *  aussortiert. Beides erzeugt Speichermuell, und die Aufraeumlaeufe der
 *  Laufzeitumgebung sind genau die kurzen Haenger, die man auf dem Handy als
 *  Ruckeln wahrnimmt.
 *
 *  Hier werden Objekte stattdessen wiederverwendet und Arrays an Ort und
 *  Stelle zusammengeschoben. */

export class Pool<T> {
  private free: T[] = [];

  constructor(
    private readonly make: () => T,
    private readonly max = 600,
  ) {}

  get size(): number { return this.free.length; }

  obtain(): T {
    return this.free.pop() ?? this.make();
  }

  release(item: T): void {
    if (this.free.length < this.max) this.free.push(item);
  }
}

/** Entfernt alle Eintraege, fuer die `dead` wahr ist - ohne neues Array.
 *  `onRemove` bekommt jedes entfernte Objekt, typischerweise zum Zurueckgeben
 *  ins Lager. Gibt die Anzahl der entfernten Eintraege zurueck. */
export function compact<T>(arr: T[], dead: (o: T) => boolean, onRemove?: (o: T) => void): number {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i];
    if (dead(o)) { onRemove?.(o); continue; }
    arr[w++] = o;
  }
  const removed = arr.length - w;
  arr.length = w;
  return removed;
}
