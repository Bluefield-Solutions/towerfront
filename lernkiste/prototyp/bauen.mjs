import fs from 'node:fs';
import zlib from 'node:zlib';
import { KONTINENTE_GROB } from '../src/geo/kontinente.grob.js';
import { DEUTSCHLAND_MITTEL } from '../src/geo/deutschland.mittel.js';
import { LAENDER_EUROPA_GROB } from '../src/geo/laender-europa.grob.js';
import { LAENDER_AFRIKA_GROB } from '../src/geo/laender-afrika.grob.js';
import { STAEDTE } from '../src/geo/staedte.js';
import * as I from '../src/inhalt/erdkunde.js';
import { inline } from './inline.mjs';

const NACHBARN = JSON.parse(fs.readFileSync(new URL('./nachbarn.json', import.meta.url)));
function vierfaerben(ids){
  const reihe=[...ids].sort((a,b)=>(NACHBARN[b]||[]).length-(NACHBARN[a]||[]).length), f={};
  for(const id of reihe){ const belegt=new Set((NACHBARN[id]||[]).map(n=>f[n]).filter(x=>x!==undefined));
    let c=0; while(belegt.has(c))c++; f[id]=c; }
  const konflikte=Object.entries(NACHBARN).flatMap(([a,ns])=>ns.filter(b=>f[a]===f[b]));
  if(konflikte.length) throw new Error('Vierfärbung: Nachbarn gleich');
  return f;
}
const bbox = (l)=>{ const xs=[],ys=[];
  l.forEach(o=>{ const m=o.pfad.match(/-?\d+\.?\d*/g).map(Number);
    for(let i=0;i<m.length;i+=2){xs.push(m[i]);ys.push(m[i+1]);} });
  const x0=Math.min(...xs),y0=Math.min(...ys);
  return `${x0-8} ${y0-8} ${Math.max(...xs)-x0+16} ${Math.max(...ys)-y0+16}`; };

const kont = new Map(I.KONTINENTE.map(k=>[k.id,k]));
const laenderMeta = {};
for (const [k, l] of Object.entries(I.LAENDER)) for (const x of l) laenderMeta[x.a3] = x;

const D = {
  kontinente: KONTINENTE_GROB.map(k=>({ ...k, ...kont.get(k.id) })),
  laender: {
    europa: LAENDER_EUROPA_GROB.filter(l=>l.rang).map(l=>({ ...l, ...laenderMeta[l.a3] })),
    afrika: LAENDER_AFRIKA_GROB.filter(l=>l.rang).map(l=>({ ...l, ...laenderMeta[l.a3] })),
  },
  deutschland: DEUTSCHLAND_MITTEL.map(b=>{
    const s = STAEDTE.find(x=>x.id===b.id);
    return { id:b.id, name:b.name, pfad:b.pfad, hauptstadt:s.hauptstadt,
             stadtstaat:s.stadtstaat, anker:s.anker,
             ablenker: I.HAUPTSTADT_ABLENKER[b.id] || [] };
  }),
  farben: vierfaerben(DEUTSCHLAND_MITTEL.map(b=>b.id)),
};
D.vbK = bbox(D.kontinente);
D.vbD = bbox(D.deutschland);
D.vbL = { europa: bbox(LAENDER_EUROPA_GROB), afrika: bbox(LAENDER_AFRIKA_GROB) };
// Die Kontinentkarte zeigt ALLE Laender des Kontinents als Umgebung (G8),
// nicht nur die Ziele - sonst kann man durch Ausschluss raten.
D.umgebung = {
  europa: LAENDER_EUROPA_GROB.filter(l=>!l.rang).map(l=>l.pfad),
  afrika: LAENDER_AFRIKA_GROB.filter(l=>!l.rang).map(l=>l.pfad),
};

// Die Kernmodule werden eingebettet - eine Datei, kein Buendler.
const module = [
  inline(new URL('../src/vergleich/vergleich.js', import.meta.url), 'Vergleich'),
  inline(new URL('../src/kern/leitner.js', import.meta.url), 'Leitner'),
  inline(new URL('../src/profil/ablage.js', import.meta.url), 'Ablage'),
  inline(new URL('../src/protokoll/protokoll.js', import.meta.url), 'Protokoll',
         { 'ablage.js': 'const A = Ablage;' }),
].join('\n');

// Fassungsstempel. Ohne ihn ist "welche Fassung laeuft auf diesem iPad?"
// nicht zu beantworten - Konzept K3, Kapitel 13.2.
const BAU = {
  fassung: process.env.LERNKISTE_FASSUNG || 'p0.4',
  datum: new Date(fs.statSync(new URL('./spiel.js', import.meta.url)).mtime).toISOString().slice(0,16).replace('T',' '),
  standJahr: I.STAND.jahr,
};

const html = fs.readFileSync(new URL('./vorlage.html', import.meta.url), 'utf8')
  .replace('__DATEN__', JSON.stringify(D))
  .replace('__BAU__', JSON.stringify(BAU))
  + '<script>' + module + '\n' + fs.readFileSync(new URL('./spiel.js', import.meta.url), 'utf8') + '</script>\n</body></html>';
fs.writeFileSync(new URL('./spiel.html', import.meta.url), html);
const gz = zlib.gzipSync(Buffer.from(html)).length;
console.log(`  spiel.html  ${(html.length/1024).toFixed(0)} KB  →  ${(gz/1024).toFixed(0)} KB gzip`);
console.log(`  ${D.kontinente.length} Kontinente, ${D.laender.europa.length}+${D.laender.afrika.length} Länder, `
  + `${D.deutschland.length} Bundesländer, ${D.deutschland.filter(b=>!b.stadtstaat).length} Hauptstadt-Rätsel`);
