import fs from 'node:fs';
import zlib from 'node:zlib';
import { KONTINENTE_GROB } from '../src/geo/kontinente.grob.js';
import { DEUTSCHLAND_MITTEL } from '../src/geo/deutschland.mittel.js';
import { LAENDER_EUROPA_GROB } from '../src/geo/laender-europa.grob.js';
import { LAENDER_AFRIKA_GROB } from '../src/geo/laender-afrika.grob.js';
import { STAEDTE } from '../src/geo/staedte.js';
import * as I from '../src/inhalt/erdkunde.js';
import { inline } from './inline.mjs';
import { polDerUnzugaenglichkeit } from '../tools/geo-backen.mjs';
import { ANTARKTIKA_GROB } from '../src/geo/antarktika.grob.js';

const NACHBARN = JSON.parse(fs.readFileSync(new URL('./nachbarn.json', import.meta.url)));
function vierfaerben(ids){
  const reihe=[...ids].sort((a,b)=>(NACHBARN[b]||[]).length-(NACHBARN[a]||[]).length), f={};
  for(const id of reihe){ const belegt=new Set((NACHBARN[id]||[]).map(n=>f[n]).filter(x=>x!==undefined));
    let c=0; while(belegt.has(c))c++; f[id]=c; }
  const konflikte=Object.entries(NACHBARN).flatMap(([a,ns])=>ns.filter(b=>f[a]===f[b]));
  if(konflikte.length) throw new Error('Vierfärbung: Nachbarn gleich');
  return f;
}
/** Pfad zurueck in Polygone lesen - fuer die Anker. */
function pfadZuPolys(d){
  const polys=[];
  for (const teil of d.split('M').slice(1)) {
    const z=teil.match(/-?\d+\.?\d*/g); if(!z) continue;
    const ring=[]; for(let i=0;i+1<z.length;i+=2) ring.push([+z[i],+z[i+1]]);
    if (ring.length>2) polys.push([ring]);
  }
  return polys;
}
/** Anker fuer jede Form - der Marker im Spiel haengt daran. */
function ankerFuer(liste){
  return liste.map(x=>{
    const pu = polDerUnzugaenglichkeit(pfadZuPolys(x.pfad));
    return { ...x, anker: pu ? [+pu.punkt[0].toFixed(1), +pu.punkt[1].toFixed(1)] : null };
  });
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
  kontinente: ankerFuer(KONTINENTE_GROB.map(k=>({ ...k, ...kont.get(k.id) }))),
  // Antarktika bekommt eine EIGENE, polare Ansicht. In der Weltkarte liegt es
  // als Sockel am unteren Rand - Befund F4, und im Prototyp deutlich sichtbar.
  antarktika: ankerFuer(ANTARKTIKA_GROB.map(a=>({ ...a, ...kont.get('antarktika') })))[0],
  laender: {
    europa: ankerFuer(LAENDER_EUROPA_GROB.filter(l=>l.rang).map(l=>({ ...l, ...laenderMeta[l.a3] }))),
    afrika: ankerFuer(LAENDER_AFRIKA_GROB.filter(l=>l.rang).map(l=>({ ...l, ...laenderMeta[l.a3] }))),
  },
  deutschland: DEUTSCHLAND_MITTEL.map(b=>{
    const s = STAEDTE.find(x=>x.id===b.id);
    return { id:b.id, name:b.name, pfad:b.pfad, hauptstadt:s.hauptstadt,
             stadtstaat:s.stadtstaat, anker:s.anker,
             ablenker: I.HAUPTSTADT_ABLENKER[b.id] || [],
             falle: I.ECHTE_FALLEN.includes(b.id) };
  }),
  farben: vierfaerben(DEUTSCHLAND_MITTEL.map(b=>b.id)),
};
// Die Weltkarte wird UNTEN BESCHNITTEN. Natural Earth zieht Antarktikas
// Suedkante als gerade Linie bei -90 Grad; nach der Projektion steht dort ein
// Rechteck mit harter Unterkante, breiter als Afrika. Wir schneiden knapp
// unterhalb der Eiskante ab - so wie es Schulatlanten tun.
const antTeil = D.kontinente.find(k=>k.id==='antarktika');
const bK = (()=>{ const xs=[],ys=[];
  D.kontinente.filter(k=>k.id!=='antarktika').forEach(o=>{ const m=o.pfad.match(/-?\d+\.?\d*/g).map(Number);
    for(let i=0;i<m.length;i+=2){xs.push(m[i]);ys.push(m[i+1]);} });
  return { x0:Math.min(...xs), y0:Math.min(...ys), x1:Math.max(...xs), y1:Math.max(...ys) }; })();
const antOben = (()=>{ const m=antTeil.pfad.match(/-?\d+\.?\d*/g).map(Number); const ys=[];
  for(let i=1;i<m.length;i+=2) ys.push(m[i]); return Math.min(...ys); })();
D.vbK = `${bK.x0-8} ${bK.y0-8} ${bK.x1-bK.x0+16} ${(antOben + 26) - (bK.y0-8)}`;
D.vbD = bbox(D.deutschland);
D.vbL = { europa: bbox(LAENDER_EUROPA_GROB), afrika: bbox(LAENDER_AFRIKA_GROB) };
D.vbA = bbox([D.antarktika]);
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

const vorlage = fs.readFileSync(new URL('./vorlage.html', import.meta.url), 'utf8');
const rumpf = '<script>' + module + '\n'
  + fs.readFileSync(new URL('./spiel.js', import.meta.url), 'utf8') + '</script>\n</body></html>';

/** Zwei Fassungen aus EINER Quelle - der Unterschied steckt nur im Kopf. */
function bauen(kopf) {
  return vorlage.replace('__DATEN__', JSON.stringify(D))
                .replace('__BAU__', JSON.stringify(BAU))
                .replace('__KOPF__', kopf) + rumpf;
}

const SCHRIFT = new URL('../src/schrift/', import.meta.url);
const SYMBOL  = new URL('../src/symbol/',  import.meta.url);
const schriftCss = fs.readFileSync(new URL('schrift.css', SCHRIFT), 'utf8');
const schriftDateien = fs.readdirSync(SCHRIFT).filter(f => f.endsWith('.woff2'));

/* --- Fassung 1: EINE Datei, zum Ansehen -------------------------------- */
//
// Alles drin, auch die Schrift als Daten-URI. Diese Fassung laesst sich
// verschicken und mit einem Doppelklick oeffnen - dafuer ist sie 70 KB
// groesser. Die Tore pruefen sie, weil sie ohne Server auskommt.
const eingebettet = schriftCss.replace(/url\(\.\/schrift\/([^)]+)\)/g, (_, datei) =>
  `url(data:font/woff2;base64,${fs.readFileSync(new URL(datei, SCHRIFT)).toString('base64')})`);
const einzeln = bauen(`<style>${eingebettet}</style>`);
fs.writeFileSync(new URL('./spiel.html', import.meta.url), einzeln);
console.log(`  prototyp/spiel.html  ${(einzeln.length/1024).toFixed(0)} KB`
  + `  →  ${(zlib.gzipSync(Buffer.from(einzeln)).length/1024).toFixed(0)} KB gzip  (eine Datei)`);

/* --- Fassung 2: dist/, das was ausgeliefert wird ------------------------ */
//
// Hier liegen Schrift und Symbole DANEBEN statt drin. Das ist kein
// Schoenheitsfehler, sondern der Grund, warum die App schnell startet: die
// Seite aendert sich bei jeder Auslieferung, die Schrift nie. Wer sie
// einbettet, laedt sie bei jeder Fassung neu.
const DIST = new URL('../dist/', import.meta.url);
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(new URL('schrift/', DIST), { recursive: true });

// Ausgeliefert werden nur die drei, die ein Geraet wirklich anfasst:
// 180 fuer iOS, 192 und 512 fuers Manifest. Die 1024 bleibt in src/symbol
// als Vorrat - sie waere 577 KB in jedem Lager, fuer nichts.
const symbole = [180, 192, 512];
const kopf = [
  `<link rel="manifest" href="./manifest.webmanifest">`,
  `<link rel="apple-touch-icon" href="./symbol-180.png">`,
  `<link rel="icon" type="image/png" sizes="192x192" href="./symbol-192.png">`,
  ...schriftDateien.map(f => `<link rel="preload" as="font" type="font/woff2" `
    + `href="./schrift/${f}" crossorigin>`),
  `<link rel="stylesheet" href="./schrift.css">`,
].join('\n');
const verteilt = bauen(kopf).replace('</body></html>',
  `<script>
// Der Service Worker haelt die App offline lauffaehig und holt trotzdem bei
// jedem Start die neueste Fassung. Faellt er aus, laeuft alles wie vorher -
// nur eben ohne Netz nicht.
if ('serviceWorker' in navigator)
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js')
    .catch(e => console.warn('Service Worker nicht registriert:', e)));
</script>
</body></html>`);

fs.writeFileSync(new URL('index.html', DIST), verteilt);
fs.writeFileSync(new URL('schrift.css', DIST), schriftCss);
for (const f of schriftDateien)
  fs.copyFileSync(new URL(f, SCHRIFT), new URL('schrift/' + f, DIST));
for (const g of symbole)
  fs.copyFileSync(new URL(`symbol-${g}.png`, SYMBOL), new URL(`symbol-${g}.png`, DIST));

// GitHub Pages laesst sonst Jekyll darueberlaufen und verschluckt alles,
// was mit einem Unterstrich anfaengt. Kostet nichts, verhindert Raetselraten.
fs.writeFileSync(new URL('.nojekyll', DIST), '');

fs.writeFileSync(new URL('manifest.webmanifest', DIST), JSON.stringify({
  name: 'Smart Kids — Erdkunde',
  short_name: 'Smart Kids',
  description: 'Kontinente, Länder, Bundesländer und Landeshauptstädte '
    + 'für Fiona und Lea.',
  lang: 'de', dir: 'ltr',
  start_url: './', scope: './', id: './',
  display: 'standalone',
  orientation: 'any',
  background_color: '#f6f3ee',   // = --grund, in Chromium ausgerechnet
  theme_color: '#1b2835',        // = --tinte
  icons: [
    { src:'./symbol-192.png',  sizes:'192x192',   type:'image/png', purpose:'any' },
    { src:'./symbol-512.png',  sizes:'512x512',   type:'image/png', purpose:'any' },
    // Die Kugel misst 75 % der Kante, die Schutzzone einer maskierbaren
    // Kachel 80 % - sie passt also hinein, egal welche Form das System
    // darum herum schneidet.
    { src:'./symbol-512.png',  sizes:'512x512',   type:'image/png', purpose:'maskable' },
  ],
}, null, 2) + '\n');

const vorrat = ['./', './index.html', './manifest.webmanifest', './schrift.css',
  ...symbole.map(g => `./symbol-${g}.png`),
  ...schriftDateien.map(f => `./schrift/${f}`)];
fs.writeFileSync(new URL('sw.js', DIST),
  fs.readFileSync(new URL('./pwa/sw.js', import.meta.url), 'utf8')
    .replace('__FASSUNG__', BAU.fassung + '-' + BAU.datum.replace(/[^0-9]/g, ''))
    .replace('__VORRAT__', JSON.stringify(vorrat, null, 2)));

const distGroesse = fs.readdirSync(DIST, { recursive:true })
  .map(f => { const st = fs.statSync(new URL(f, DIST)); return st.isFile() ? st.size : 0; })
  .reduce((a, b) => a + b, 0);
console.log(`  dist/                ${(verteilt.length/1024).toFixed(0)} KB Seite`
  + `  →  ${(zlib.gzipSync(Buffer.from(verteilt)).length/1024).toFixed(0)} KB gzip`
  + `,  ${(distGroesse/1024).toFixed(0)} KB gesamt mit Schrift und Symbolen`);
const html = verteilt;
console.log(`  ${D.kontinente.length} Kontinente, ${D.laender.europa.length}+${D.laender.afrika.length} Länder, `
  + `${D.deutschland.length} Bundesländer, ${D.deutschland.filter(b=>!b.stadtstaat).length} Hauptstadt-Rätsel`);
