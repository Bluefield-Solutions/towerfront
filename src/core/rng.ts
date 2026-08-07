/** Wiederherstellbarer Zufall.
 *
 *  `Math.random` lässt sich weder aussaeen noch sichern. Damit ein Lauf exakt
 *  wiederholbar ist - und damit ein gesicherter Spielstand genau dort
 *  weiterlaeuft, wo er unterbrochen wurde - braucht der Zufall einen sichtbaren
 *  Zustand, der aus einer einzigen Zahl besteht.
 *
 *  xorshift32: schnell, gleichmaessig genug fuer Spielzwecke, und der ganze
 *  Zustand passt in eine 32-Bit-Zahl. */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }

  /** Der komplette Zustand - genau das, was in den Spielstand gehoert. */
  get state(): number { return this.s; }
  set state(v: number) { this.s = (v >>> 0) || 1; }

  /** Gleichverteilt in [0, 1). */
  next(): number {
    let x = this.s;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    this.s = x;
    return x / 4294967296;
  }

  /** Gleichverteilt in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }
}

/** Ein neuer Startwert. Wird im Spielstand mitgeschrieben, damit ein Lauf
 *  spaeter nachgestellt werden kann. */
export function newSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0 || 1;
}
