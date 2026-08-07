/** Raster fuer Umkreisabfragen.
 *
 *  Vorher lief die Zielsuche in O(Tuerme x Gegner): jeder Turm prueft jeden
 *  Gegner, jeden Frame. Bei 80 Tuermen und 40 Gegnern sind das 3.200
 *  Distanzrechnungen pro Bild - und das waechst quadratisch mit dem Feld.
 *
 *  Das Raster teilt die Welt in Zellen. Eine Abfrage schaut nur in die Zellen,
 *  die der Suchkreis ueberhaupt beruehrt. Damit haengt der Aufwand an der
 *  Gegnerdichte, nicht mehr an der Gesamtzahl.
 *
 *  Die Zellenlisten werden wiederverwendet und nur geleert, nie neu angelegt -
 *  das vermeidet Speicherzuteilung in der Schleife. */
export interface HasPos { x: number; y: number; }

export class SpatialGrid<T extends HasPos> {
  private cells: T[][] = [];
  private used: number[] = [];
  readonly cols: number;
  readonly rows: number;

  constructor(
    private readonly cell: number,
    worldW: number,
    worldH: number,
  ) {
    this.cols = Math.ceil(worldW / cell) + 2;
    this.rows = Math.ceil(worldH / cell) + 2;
    for (let i = 0; i < this.cols * this.rows; i++) this.cells.push([]);
  }

  /** Leert nur die Zellen, die zuletzt belegt waren. */
  clear(): void {
    for (const i of this.used) this.cells[i].length = 0;
    this.used.length = 0;
  }

  private index(x: number, y: number): number {
    // +1 Zelle Rand, damit Gegner hinter dem linken Bildrand mitzaehlen.
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cell) + 1));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cell) + 1));
    return cy * this.cols + cx;
  }

  insert(item: T): void {
    const i = this.index(item.x, item.y);
    const list = this.cells[i];
    if (list.length === 0) this.used.push(i);
    list.push(item);
  }

  /** Schreibt alle Kandidaten im Umkreis in `out` und gibt `out` zurueck.
   *  Kandidaten, nicht Treffer: die genaue Distanz prueft der Aufrufer. */
  query(x: number, y: number, radius: number, out: T[]): T[] {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - radius) / c) + 1);
    const x1 = Math.min(this.cols - 1, Math.floor((x + radius) / c) + 1);
    const y0 = Math.max(0, Math.floor((y - radius) / c) + 1);
    const y1 = Math.min(this.rows - 1, Math.floor((y + radius) / c) + 1);
    for (let cy = y0; cy <= y1; cy++) {
      const row = cy * this.cols;
      for (let cx = x0; cx <= x1; cx++) {
        const list = this.cells[row + cx];
        for (let i = 0; i < list.length; i++) out.push(list[i]);
      }
    }
    return out;
  }
}
