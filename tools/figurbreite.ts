/** Wie breit ein Gegner WIRKLICH gezeichnet ist, in Weltpunkten.
 *
 *  Zwei Zahlen: die volle Ausdehnung (Stacheln, Fluegel, Waffen) und der
 *  Rumpf als Median der Zeilenbreiten. Die erste entscheidet, ob etwas ueber
 *  den Bordstein ragt; die zweite, wieviel Platz der Koerper wirklich
 *  braucht.
 *
 *  **Nicht die Kachel.** `enemyArtWidth` gibt die Kachel, und die ist beim
 *  Leerentitan 102 Weltpunkte breit, waehrend die Figur darin 54 misst. Wer
 *  die Kachel gegen die Strassenbreite haelt, misst Luft. Genau das stand in
 *  der ersten Fassung der Wissensdatei - "breiteste Figur 102 Weltpunkte",
 *  daneben `npm run gedraenge`, das 55 meldet (Regel 12).
 *
 *  Steht in einer eigenen Datei, weil zwei Werkzeuge sie brauchen:
 *  `gedraenge.ts` prueft damit, ob jeder Gegner auf die Strasse passt, und
 *  `bildwissen.ts` schreibt die Zahl in die Datei fuer den Bild-Agenten.
 *  Zwei Fassungen davon waeren eine zu viel (Regel 15). */
import sharp from 'sharp';
import { ENEMY_ART } from '../src/gfx/assets/enemies';
import { enemyArtWidth } from '../src/gfx/enemyart';
import type { EnemyId } from '../src/data/enemies';

export interface Figurbreite {
  /** Volle Ausdehnung quer zur Laufrichtung, in Weltpunkten. */
  voll: number;
  /** Der Rumpf: Median der Zeilenbreiten, in Weltpunkten. */
  rumpf: number;
  /** Die Kachel, in die sie gezeichnet wird. */
  kachel: number;
}

/** `null`, wenn es kein Bild im Vorrat gibt - dann misst hier nichts, und
 *  der Aufrufer sagt das hin, statt eine Zahl zu behaupten (Regel 10). */
export async function figurbreite(id: EnemyId): Promise<Figurbreite | null> {
  const d = (ENEMY_ART as Record<string, string>)[id];
  if (!d) return null;
  const { data, info } = await sharp(Buffer.from(d.split(',')[1], 'base64'))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let minX = w, maxX = 0;
  const zeilen: number[] = [];
  for (let y = 0; y < h; y++) {
    let a = w, b = -1;
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 60) { if (x < a) a = x; if (x > b) b = x; }
    }
    if (b >= 0) {
      if (a < minX) minX = a;
      if (b > maxX) maxX = b;
      zeilen.push(b - a + 1);
    }
  }
  if (!zeilen.length) return null;
  zeilen.sort((p, q) => p - q);
  const kachel = enemyArtWidth(id);
  return {
    voll: ((maxX - minX + 1) / w) * kachel,
    rumpf: (zeilen[Math.floor(zeilen.length / 2)] / w) * kachel,
    kachel,
  };
}
