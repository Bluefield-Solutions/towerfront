/** Ein Wegenetz so schreiben, wie es in `src/data/wegnetz.ts` steht.
 *
 *  **Es gibt genau eine Stelle dafuer (Regel 15).** `npm run bahnbau` traegt
 *  seine erzeugten Bahnen hierueber ein; ein zweiter Schreiber daneben liefe
 *  beim ersten Formatwechsel auseinander, und der Unterschied faellt in einer
 *  Datendatei niemandem auf. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Wegnetz } from '../src/data/wegnetz';

const ZIEL = fileURLToPath(new URL('../src/data/wegnetz.ts', import.meta.url));

const punkt = (p: { x: number; y: number; w?: number }): string =>
  p.w === undefined ? `{ x: ${p.x}, y: ${p.y} }` : `{ x: ${p.x}, y: ${p.y}, w: ${p.w} }`;

/** Der Eintrag einer Karte als Quelltext - ohne die umgebende Klammer. */
export function netzText(id: string, netz: Wegnetz): string {
  const z: string[] = [`  ${id}: {`, '    knoten: ['];
  for (const k of netz.knoten) {
    z.push(`      { id: '${k.id}', x: ${k.x}, y: ${k.y}`
      + (k.w === undefined ? '' : `, w: ${k.w}`) + `, art: '${k.art}' },`);
  }
  z.push('    ],', '    kanten: [');
  for (const k of netz.kanten) {
    z.push('      {', `        id: '${k.id}', von: '${k.von}', nach: '${k.nach}',`);
    if (!k.punkte.length) z.push('        punkte: [],');
    else {
      const zeilen: string[] = []; let puffer: string[] = [];
      for (const p of k.punkte) {
        puffer.push(punkt(p));
        if (puffer.length === 3) { zeilen.push('          ' + puffer.join(', ') + ','); puffer = []; }
      }
      if (puffer.length) zeilen.push('          ' + puffer.join(', ') + ',');
      z.push('        punkte: [', ...zeilen, '        ],');
    }
    z.push('      },');
  }
  z.push('    ],', '  },');
  return z.join('\n');
}

/** Den Eintrag einer Karte in `wegnetz.ts` ersetzen.
 *
 *  Gesucht wird die Zeile `  <id>: {` und ihr Gegenstueck `  },` auf
 *  derselben Einrueckung. Findet sich der Eintrag nicht, wird NICHTS
 *  geschrieben und der Fehler gemeldet - ein Schreiber, der bei fehlendem
 *  Anker an den Anfang der Datei schreibt, hat in v229 eine Runde gekostet. */
export function netzEintragen(id: string, netz: Wegnetz): void {
  const s = readFileSync(ZIEL, 'utf8');
  const anfang = s.indexOf(`\n  ${id}: {\n`);
  if (anfang < 0) throw new Error(`NETZSCHRIFT: in wegnetz.ts gibt es keinen Eintrag "${id}".`);
  const ende = s.indexOf('\n  },\n', anfang);
  if (ende < 0) throw new Error(`NETZSCHRIFT: der Eintrag "${id}" hoert nicht auf.`);
  writeFileSync(ZIEL, s.slice(0, anfang + 1) + netzText(id, netz) + s.slice(ende + '\n  },'.length));
}
