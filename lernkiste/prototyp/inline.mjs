// Modul-Inliner. Kein Buendler noetig, solange es EINE Datei sein soll.
//
// Jedes Modul wird in eine benannte IIFE gewickelt und gibt seine Exporte
// zurueck. Damit bleiben die Namensraeume getrennt - sonst kollidiert
// `mischen` aus leitner.js mit `mischen` aus dem Spiel, und niemand merkt es.
import fs from 'node:fs';

export function inline(pfad, name, ersatz = {}) {
  let q = fs.readFileSync(pfad, 'utf8');
  const namen = new Set();
  // export const X = / export function X( / export let X
  for (const m of q.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm))
    namen.add(m[1]);
  // export const a = ..., b = ...   (Mehrfachdeklaration in einer Zeile)
  for (const m of q.matchAll(/^export\s+const\s+([^=;]+)=/gm)) {
    const kopf = m[1];
    if (!kopf.includes(',')) continue;
    for (const t of kopf.split(',')) { const n = t.trim().split(/\s/)[0]; if (n) namen.add(n); }
  }
  // export { a, b }
  for (const m of q.matchAll(/^export\s*\{([^}]+)\}/gm))
    for (const t of m[1].split(',')) { const n = t.trim().split(/\s+as\s+/).pop().trim(); if (n) namen.add(n); }

  q = q.replace(/^export\s+/gm, '');
  q = q.replace(/^\s*\{[^}]*\}\s*;?\s*$/gm, (z) => z);   // uebrig gebliebene export{}-Zeilen
  q = q.replace(/^\s*\{[^}]*\}\s*;\s*$/gm, '');
  for (const [von, nach] of Object.entries(ersatz))
    q = q.replace(new RegExp(`^import[^\\n]*${von}[^\\n]*;$`, 'm'), nach);
  q = q.replace(/^import[^\n]*;$/gm, '');

  const liste = [...namen].filter(n => /^[A-Za-z_$][\w$]*$/.test(n));
  return `const ${name} = (function(){\n${q}\nreturn { ${liste.join(', ')} };\n})();\n`;
}
