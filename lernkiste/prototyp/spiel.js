/* Lernkiste - spielbarer Prototyp.
 * Eine Aufgabe, drei Eingabewege. Die Aufgabenlogik sieht nur Antworten. */
const D = JSON.parse(document.getElementById('daten').textContent);
const buehne = document.getElementById('buehne');

/* ---------- Marken und Werkzeug ---------------------------------------- */
const FL = ['--f1','--f2','--f3','--f4','--f5','--f6','--f7'];
const VIER = ['--f1','--f3','--f5','--f6'];
const el = (t, k, i) => { const e=document.createElement(t); if(k) e.className=k;
  if(i!==undefined) e.innerHTML=i; return e; };
const STERN = (f)=>`<svg width="24" height="24" viewBox="-14 -14 28 28"><path d="M0 -12 3.7 -4 12 -2.8 6 3.2 7.4 12 0 7.8 -7.4 12 -6 3.2 -12 -2.8 -3.7 -4Z" fill="${f}" stroke="var(--tinte)" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
const ZURUECK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>';
const MIKRO = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>';
const sterne = (n)=>`<div class="sterne">${[0,1,2].map(i=>STERN(i<n?'oklch(.80 .14 85)':'oklch(.93 .01 250)')).join('')}</div>`;

/* ---------- Vorlesen. Fuer Fiona die Bedingung, nicht der Komfort. ------ */
let stimme = null, tonAn = true;
function stimmeSuchen(){
  const s = speechSynthesis.getVoices().filter(v=>v.lang.startsWith('de'));
  stimme = s.find(v=>v.localService) || s[0] || null;
}
if ('speechSynthesis' in window) {
  stimmeSuchen(); speechSynthesis.addEventListener('voiceschanged', stimmeSuchen);
}
let entsperrt = false;
function vorlesen(text){
  if (!tonAn || !('speechSynthesis' in window)) return;
  try {
    if (!entsperrt) { speechSynthesis.speak(new SpeechSynthesisUtterance('')); entsperrt = true; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang='de-DE'; u.rate=.92; if (stimme) u.voice=stimme;
    speechSynthesis.speak(u);
  } catch(e){}
}

/* ---------- Namensabgleich: normalisieren, Alias, Levenshtein ----------- */
function normal(s){
  return (s||'').toLowerCase().trim()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/^(das ist|ich glaube|das heisst|aeh|oehm)\s+/,'')
    .replace(/[^a-z0-9]/g,'');
}
function levenshtein(a,b){
  const m=a.length,n=b.length; if(!m)return n; if(!n)return m;
  let v0=Array.from({length:n+1},(_,i)=>i), v1=new Array(n+1);
  for(let i=0;i<m;i++){ v1[0]=i+1;
    for(let j=0;j<n;j++) v1[j+1]=Math.min(v1[j]+1, v0[j+1]+1, v0[j]+(a[i]===b[j]?0:1));
    [v0,v1]=[v1,v0]; }
  return v0[n];
}
/** Gibt {id, sicherheit} oder null. Geschlossene Kandidatenmenge. */
function abgleich(eingabe, kandidaten){
  const e = normal(eingabe); if (!e) return null;
  let best=null, bestD=Infinity, zweitD=Infinity;
  for (const k of kandidaten) {
    const formen = [k.name, ...(k.aliasse||[]), ...(k.aussprache||[])].map(normal);
    const d = Math.min(...formen.map(f => levenshtein(e,f) / Math.max(f.length,1)));
    if (d < bestD) { zweitD = bestD; bestD = d; best = k; }
    else if (d < zweitD) zweitD = d;
  }
  if (bestD > 0.42) return null;
  // Abstand zum Zweitbesten: sonst rueckfragen statt annehmen.
  const sicher = bestD < 0.12 || (zweitD - bestD) > 0.20;
  return { id: best.id, name: best.name, sicherheit: sicher ? 1 : 0.5, abstand: bestD };
}

/* ---------- Zustand ----------------------------------------------------- */
const PROFILE = {
  fiona: { name:'Fiona', alter:6, eingabe:['ziehen','sprechen'], vorlesen:true,
           kandidaten:4, laenderTiefe:3, sitzung:6, streng:false, farbe:'--f7' },
  lea:   { name:'Lea', alter:8, eingabe:['ziehen','tippen'], vorlesen:false,
           kandidaten:99, laenderTiefe:5, sitzung:8, streng:true, farbe:'--f5' },
};
let P = null, Sitzung = null;

/* ---------- Aufgabenvorrat --------------------------------------------- */
function vorrat(ebene, kontinent){
  if (ebene === 'kontinente')
    return D.kontinente
      .filter(k => P.name === 'Fiona' ? k.runde <= 2 : true)
      .map(k => ({ id:k.id, name:k.name, aliasse:k.aliasse, aussprache:k.aussprache, pfad:k.pfad }));
  if (ebene === 'laender')
    return D.laender[kontinent].filter(l => l.rang <= P.laenderTiefe)
      .map(l => ({ id:l.a3, name:l.name, aliasse:l.aliasse, aussprache:l.aussprache, pfad:l.pfad }));
  if (ebene === 'bundeslaender')
    return D.deutschland.map(b => ({ id:b.id, name:b.name, aliasse:[],
      aussprache:[b.name.toLowerCase()], pfad:b.pfad, anker:b.anker }));
  if (ebene === 'hauptstaedte')
    return D.deutschland.filter(b => !b.stadtstaat)
      .map(b => ({ id:b.id, name:b.hauptstadt, aliasse:[], aussprache:[b.hauptstadt.toLowerCase()],
                   pfad:b.pfad, anker:b.anker, gebiet:b.name, ablenker:b.ablenker||[] }));
  return [];
}
function mischen(a, keim){
  const r = () => { keim = (keim*1664525+1013904223)>>>0; return keim/4294967296; };
  const b = a.slice();
  for (let i=b.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; }
  return b;
}

/* ---------- Bildschirme ------------------------------------------------- */
function zeige(bau){
  const alt = buehne.querySelector('.schirm.da');
  const neu = bau();
  neu.classList.add('schirm');
  buehne.appendChild(neu);
  requestAnimationFrame(()=>{ neu.classList.add('da'); if(alt){ alt.classList.remove('da');
    setTimeout(()=>alt.remove(), 340); } });
}

function profilwahl(){
  const s = el('div');
  s.innerHTML = `<div class="kopf"><span></span>
      <button class="knopf" id="ton">${tonAn?'Ton an':'Ton aus'}</button></div>
    <div class="mitte">
      <div class="titel">Wer spielt?</div>
      <div class="wahl">${Object.entries(PROFILE).map(([id,p])=>`
        <button class="kachel" data-profil="${id}">
          <div class="kreis" style="background:var(${p.farbe})">${p.name[0]}</div>
          <div class="name">${p.name}</div>
          <div class="rolle">${p.alter} Jahre · ${p.eingabe.includes('sprechen')?'sprechen und ziehen':'tippen und ziehen'}</div>
        </button>`).join('')}</div>
      <div class="unter">Prototyp. Die Karten sind echt gebacken — Umrisse aus Natural Earth, Hausdorff unter 0,75 Bildpunkte.</div>
    </div>`;
  s.querySelector('#ton').onclick = (e)=>{ tonAn=!tonAn; e.target.textContent = tonAn?'Ton an':'Ton aus'; };
  s.querySelectorAll('[data-profil]').forEach(b => b.onclick = ()=>{
    P = PROFILE[b.dataset.profil]; vorlesen(P.name); zeige(ebenenwahl); });
  return s;
}

function ebenenwahl(){
  const s = el('div');
  const kacheln = [
    { e:'kontinente', t:'Kontinente', u: P.name==='Fiona' ? 'sechs Formen' : 'alle sieben' },
    { e:'laender', k:'europa', t:'Länder in Europa', u:`die ${P.laenderTiefe} größten` },
    { e:'laender', k:'afrika', t:'Länder in Afrika', u:`die ${P.laenderTiefe} größten` },
    { e:'bundeslaender', t:'Bundesländer', u:'alle sechzehn' },
    { e:'hauptstaedte', t:'Landeshauptstädte', u:'dreizehn Rätsel' },
  ];
  s.innerHTML = `<div class="kopf">
      <button class="knopf" id="zur">${ZURUECK}<span>Zurück</span></button>
      <span class="fortschritt">${P.name}</span></div>
    <div class="mitte">
      <div class="titel">Was möchtest du üben?</div>
      <div class="wahl">${kacheln.map((k,i)=>`
        <button class="kachel" data-i="${i}" style="min-width:190px">
          <div class="name" style="font-size:var(--s1)">${k.t}</div>
          <div class="rolle">${k.u}</div></button>`).join('')}</div>
    </div>`;
  s.querySelector('#zur').onclick = ()=>zeige(profilwahl);
  s.querySelectorAll('[data-i]').forEach(b => b.onclick = ()=>{
    const k = kacheln[+b.dataset.i];
    starten(k.e, k.k); });
  return s;
}

function starten(ebene, kontinent){
  const alle = vorrat(ebene, kontinent);
  const keim = (Date.now() ^ 0x9e3779b9) >>> 0;
  Sitzung = { ebene, kontinent, alle,
    liste: mischen(alle, keim).slice(0, Math.min(P.sitzung, alle.length)),
    i:0, richtig:0, versuche:0 };
  zeige(spielschirm);
}

/* ---------- Der Spielbildschirm ---------------------------------------- */
function spielschirm(){
  const s = el('div');
  const st = Sitzung, ziel = st.liste[st.i];
  const istHaupt = st.ebene === 'hauptstaedte';

  // Kandidaten: das Ziel plus Ablenker aus derselben Menge.
  let kand;
  if (istHaupt) {
    const ablenker = (ziel.ablenker||[]).slice(0,2)
      .map(n=>({ id:'x-'+n, name:n, aliasse:[], aussprache:[n.toLowerCase()] }));
    const andere = st.alle.filter(x=>x.id!==ziel.id);
    kand = mischen([ziel, ...ablenker,
      ...mischen(andere, st.i*7919+13).slice(0, Math.max(0, 4-1-ablenker.length))], st.i*104729+7);
  } else {
    const andere = mischen(st.alle.filter(x=>x.id!==ziel.id), st.i*7919+13);
    const n = Math.min(P.kandidaten, st.alle.length) - 1;
    kand = mischen([ziel, ...andere.slice(0, Math.max(1,n))], st.i*104729+7);
  }

  const vb = st.ebene === 'kontinente' ? D.vbK
           : st.ebene === 'laender' ? D.vbL[st.kontinent] : D.vbD;
  const farbeVon = (g, i) => st.ebene === 'bundeslaender' || istHaupt
    ? `var(${VIER[(D.farben[g.id] ?? i) % 4]})` : `var(${FL[i % 7]})`;
  const flaechen = st.alle.map((g,i)=>
    `<path class="geb ${g.id===ziel.id?'ziel':''}" data-id="${g.id}" d="${g.pfad}"
       fill-rule="evenodd" fill="${farbeVon(g,i)}"/>`).join('');
  const konturen = st.alle.map(g=>`<path d="${g.pfad}" fill-rule="evenodd"/>`).join('');

  const tippt = P.eingabe.includes('tippen');
  const spricht = P.eingabe.includes('sprechen');
  const frageText = istHaupt
    ? `Wie heißt die Hauptstadt von ${ziel.gebiet}?`
    : st.ebene === 'kontinente' ? 'Wie heißt dieser Kontinent?'
    : st.ebene === 'laender' ? 'Wie heißt dieses Land?' : 'Wie heißt dieses Bundesland?';

  s.innerHTML = `
    <div class="kopf">
      <button class="knopf" id="zur">${ZURUECK}<span>Zurück</span></button>
      <span class="fortschritt">${st.i+1} von ${st.liste.length}</span>
      ${sterne(Math.min(3, Math.floor(st.richtig / Math.max(1,Math.ceil(st.liste.length/3)))))}
    </div>
    <div class="frage" id="frage">${frageText}</div>
    <div class="feld">
      <div class="karte" id="karte">
        <svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet">
          <defs><clipPath id="wasch"><circle id="waschKreis" cx="0" cy="0" r="900"
            style="transform-box:fill-box;transform-origin:center"/></clipPath></defs>
          <g id="fl">${flaechen}</g>
          <g id="treffer"></g>
          <path id="belohn" d="" fill="oklch(.80 .12 155)" clip-path="url(#wasch)" style="display:none"/>
          <g fill="none" stroke="var(--tinte)" stroke-opacity=".5" stroke-width="1.1"
             vector-effect="non-scaling-stroke">${konturen}</g>
          <path id="kontur" d="" fill="none" stroke="var(--tinte)" stroke-width="2.4"
                vector-effect="non-scaling-stroke" stroke-linejoin="round" style="display:none"/>
        </svg>
      </div>
      <div class="seite" id="seite"></div>
    </div>`;

  /* --- Entkoppelte Trefferflaeche (Konzept 5.4, Befund G-Beruehrung) ---
     Bremen ist auf dem iPhone quer 9 Punkte breit, Hamburg 17, Berlin 18.
     Ein Spiel, in dem man Bremen nicht treffen kann, ist fuer ein Kind
     kaputt - egal was die Tore sagen. Der gezeichnete Umriss bleibt
     massstabsgetreu, die TREFFERFLAECHE ist ein unsichtbarer Kreis um den
     Anker. Ueberlappen sich zwei, gewinnt das KLEINERE Gebiet: es liegt
     weiter hinten im Dokument und damit obenauf. */
  const MIN_PT = 44;
  function trefferflaechen(){
    const svg = s.querySelector('.karte svg'); if (!svg) return;
    const g = svg.querySelector('#treffer'); if (!g) return;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const k = Math.abs(ctm.a) || 1;                 // Nutzer- zu Bildpunkten
    const rNutzer = (MIN_PT/2) / k;
    const mit = st.alle.filter(x=>x.anker);
    // Nach Groesse absteigend: das kleinste Gebiet landet zuletzt, also oben.
    const nach = mit.map(x=>{
      const p = s.querySelector(`path.geb[data-id="${x.id}"]`);
      const bb = p ? p.getBBox() : {width:0,height:0};
      return { x, gross: Math.max(bb.width, bb.height) };
    }).sort((a,b)=>b.gross-a.gross);
    g.innerHTML = nach
      .filter(n => n.gross * k < MIN_PT)            // nur, wer es noetig hat
      .map(n => `<circle data-id="${n.x.id}" cx="${n.x.anker[0]}" cy="${n.x.anker[1]}"
           r="${rNutzer.toFixed(1)}" fill="transparent" style="pointer-events:all"/>`).join('');
  }

  const seite = s.querySelector('#seite');
  // Die Wahlliste scrollt, das Werkzeug bleibt stehen. Sonst liegt der
  // Mikrofonknopf im Querformat unter der Falz und ist nicht zu sehen.
  const liste = el('div','wahlliste'), werkzeug = el('div','werkzeug');
  seite.append(liste, werkzeug);
  const karte = s.querySelector('#karte');
  s.querySelector('#zur').onclick = ()=>zeige(ebenenwahl);

  /* --- Eingabeweg Tippen (Lea) --- */
  if (tippt) {
    const eing = el('input','eingabe');
    eing.type='text'; eing.autocapitalize='off'; eing.autocorrect='off';
    eing.spellcheck=false; eing.placeholder='hier schreiben';
    eing.setAttribute('inputmode','text');
    const hin = el('div'); hin.style.minHeight='0';
    const ok = el('button','knopf'); ok.style.justifyContent='center';
    ok.style.fontSize='var(--s0)'; ok.textContent='Prüfen';
    liste.append(eing, ok, hin);
    const pruefen = ()=>bewerte(eing.value, 'tippen', {eing, hin});
    ok.onclick = pruefen;
    eing.addEventListener('keydown', e=>{ if(e.key==='Enter') pruefen(); });
    setTimeout(()=>eing.focus(), 360);
  }

  /* --- Eingabeweg Ziehen (beide) --- */
  if (!tippt) {
    kand.forEach(k=>{
      const b = el('div','etikett'); b.textContent = k.name; b.dataset.id = k.id;
      b.onclick = ()=>{ if(!b.dataset.gezogen) vorlesen(k.name); };
      ziehbar(b, k);
      liste.appendChild(b);
    });
  }

  /* --- Eingabeweg Sprechen (Fiona) --- */
  if (spricht) {
    const mik = el('button','mikro', MIKRO);
    const status = el('div','unter'); status.style.fontSize='var(--s-klein)';
    const Erk = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Erk) {
      mik.classList.add('tonaus');
      status.textContent = 'Sprechen geht in diesem Browser nicht — Stufe C: sag es laut und zieh dann.';
      mik.onclick = ()=>vorlesen('Sag es laut!');
    } else {
      mik.onclick = ()=>{
        const e = new Erk(); e.lang='de-DE'; e.interimResults=false; e.maxAlternatives=3;
        status.textContent='… ich höre';
        e.onresult = (ev)=>{
          const roh = ev.results[0][0].transcript;
          status.textContent = `gehört: „${roh}“`;
          bewerte(roh, 'sprechen', {status});
        };
        e.onerror = ()=>{ status.textContent='Das hat nicht geklappt — sag es noch einmal.'; };
        e.onend = ()=>{ if(status.textContent==='… ich höre') status.textContent='Nichts gehört.'; };
        try { e.start(); } catch(err){ status.textContent='Mikrofon nicht verfügbar.'; }
      };
    }
    werkzeug.appendChild(mik);
    liste.appendChild(status);
  }

  /* --- Ziehen mit Pointer Events. NICHT HTML5-Drag - das laeuft auf
         iOS Safari nicht verlaesslich. --- */
  function ziehbar(b, k){
    let start=null, versatz=null;
    b.addEventListener('pointerdown', ev=>{
      if (b.classList.contains('weg')) return;
      b.setPointerCapture(ev.pointerId);
      const r = b.getBoundingClientRect();
      start = { x:ev.clientX, y:ev.clientY };
      versatz = { x:ev.clientX-r.left, y:ev.clientY-r.top, w:r.width, h:r.height, l:r.left, t:r.top };
      b.classList.add('zieht');
      b.style.position='fixed'; b.style.left=r.left+'px'; b.style.top=r.top+'px';
      b.style.width=r.width+'px'; b.style.margin='0';
      b.style.transform='scale(1.06) rotate(-1.5deg)';
      vorlesen(k.name);
    });
    b.addEventListener('pointermove', ev=>{
      if (!start) return;
      // Kein Zustand waehrend der Bewegung - direkt am Element.
      b.style.transform =
        `translate3d(${ev.clientX-start.x}px, ${ev.clientY-start.y}px, 0) scale(1.06) rotate(-1.5deg)`;
    });
    const los = (ev)=>{
      if (!start) return;
      b.style.transform=''; b.classList.remove('zieht');
      b.style.position=''; b.style.left=''; b.style.top=''; b.style.width=''; b.style.margin='';
      const unten = document.elementFromPoint(ev.clientX, ev.clientY);
      start = null;
      // Erst der unsichtbare Trefferkreis, dann die gezeichnete Flaeche.
      const kreis = unten && unten.closest && unten.closest('#treffer circle');
      const pfad  = unten && unten.closest && unten.closest('path.geb');
      const id = kreis ? kreis.dataset.id : (pfad ? pfad.dataset.id : null);
      if (id) bewerte(k.name, 'ziehen', { etikett:b, getroffen: id });
      else if (istHaupt) { /* daneben: nichts */ }
    };
    b.addEventListener('pointerup', los);
    b.addEventListener('pointercancel', ()=>{ start=null; b.style.transform='';
      b.classList.remove('zieht'); b.style.position=''; });
  }

  /* --- Bewertung. EIN Ort, egal welcher Eingabeweg. --- */
  let erledigt = false;
  function bewerte(roh, art, ctx){
    if (erledigt) return;
    st.versuche++;
    let richtig = false, fast = false, text = '';

    if (art === 'ziehen') {
      // Beim Ziehen zaehlt, WOHIN gezogen wurde.
      richtig = ctx.getroffen === ziel.id && roh === ziel.name;
      if (!richtig && roh === ziel.name) text = 'Fast! Das ist das falsche Gebiet.';
      else if (!richtig) text = 'Das ist ein anderer Name.';
    } else {
      const t = abgleich(roh, kand);
      if (!t) text = P.name==='Fiona' ? 'Sag es noch einmal.' : 'Das kenne ich nicht.';
      else if (t.id !== ziel.id) text = `Das wäre ${t.name}.`;
      else if (t.sicherheit < 1) { text = `Meintest du ${t.name}?`; }
      else richtig = true;
      // Rechtschreibung nur beim Tippen und nur fuer Lea.
      if (art === 'tippen' && !richtig) {
        const e = (roh||'').trim();
        if (e && e.toLowerCase() === ziel.name.toLowerCase()) {
          fast = true; text = 'Fast! Namen schreibt man groß.';
        } else if (e && normal(e) === normal(ziel.name)) {
          fast = true; text = e.includes(' ') && ziel.name.includes('-')
            ? 'Fast! Da fehlt ein Bindestrich.' : 'Fast! Achte auf die Umlaute.';
        }
      }
    }

    if (richtig || fast) {
      erledigt = true; st.richtig += richtig ? 1 : 0.5;
      if (ctx.etikett) ctx.etikett.classList.add('weg');
      belohnung(s, ziel, fast ? text : null);
      vorlesen(fast ? text : ziel.name);
      setTimeout(()=>{ st.i++;
        if (st.i >= st.liste.length) zeige(endschirm); else zeige(spielschirm); }, fast ? 2400 : 1500);
      return;
    }

    // Falsch: kein Rot, kein Ruckeln, nur ein zweiter Versuch.
    if (ctx.hin) { ctx.hin.className='hinweis nochmal'; ctx.hin.textContent = text; }
    if (ctx.status) ctx.status.textContent = text;
    if (!ctx.hin && !ctx.status && text) {
      let h = liste.querySelector('.hinweis');
      if (!h) { h = el('div','hinweis nochmal'); liste.appendChild(h); }
      h.textContent = text;
    }
    vorlesen(text);
  }

  // Nach dem Einblenden messen - vorher steht die Groesse nicht fest.
  requestAnimationFrame(()=>requestAnimationFrame(trefferflaechen));
  addEventListener('resize', trefferflaechen, { once:false });

  return s;
}

/* ---------- Der Belohnungsmoment ---------------------------------------- */
function belohnung(s, ziel, fastText){
  const kontur = s.querySelector('#kontur'), fuell = s.querySelector('#belohn'),
        kreis = s.querySelector('#waschKreis');
  const flaeche = s.querySelector(`path.geb[data-id="${ziel.id}"]`);
  if (!kontur || !flaeche) return;
  flaeche.classList.add('treffer');
  kontur.setAttribute('d', ziel.pfad); fuell.setAttribute('d', ziel.pfad);
  kontur.style.display=''; fuell.style.display='';
  const b = flaeche.getBBox();
  kreis.setAttribute('cx', b.x + b.width/2); kreis.setAttribute('cy', b.y + b.height/2);
  kreis.setAttribute('r', Math.max(b.width, b.height));
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const L = kontur.getTotalLength();
  kontur.style.strokeDasharray = L;
  if (ruhig) { kontur.style.strokeDashoffset = 0; kreis.style.transform='scale(1)'; }
  else {
    kontur.style.strokeDashoffset = L;
    kontur.animate([{strokeDashoffset:L},{strokeDashoffset:0}],
      {duration:400, easing:'cubic-bezier(.2,0,0,1)', fill:'forwards'});
    kreis.style.transform='scale(0)';
    kreis.animate([{transform:'scale(0)'},{transform:'scale(1)'}],
      {duration:400, delay:360, easing:'cubic-bezier(.2,0,0,1)', fill:'forwards'});
  }
  const frage = s.querySelector('#frage');
  if (frage) frage.innerHTML = fastText
    ? `<span style="color:var(--warn)">${fastText}</span>`
    : `<span style="color:var(--gut)">Richtig — ${ziel.name}!</span>`;
}

/* ---------- Ende --------------------------------------------------------- */
function endschirm(){
  const st = Sitzung, s = el('div');
  const n = Math.max(1, Math.min(3, Math.round(st.richtig / st.liste.length * 3)));
  s.innerHTML = `<div class="kopf"><span></span><span></span></div>
    <div class="mitte">
      <div>${sterne(n).replace(/width="24" height="24"/g,'width="56" height="56"')}</div>
      <div class="gross">Geschafft!</div>
      <div class="unter">${Math.round(st.richtig)} von ${st.liste.length} richtig,
        ${st.versuche} Versuche.</div>
      <div class="reihe" style="margin-top:var(--r6)">
        <button class="knopf" id="nochmal">Noch einmal</button>
        <button class="knopf" id="andere">Etwas anderes</button>
      </div>
    </div>`;
  s.querySelector('#nochmal').onclick = ()=>starten(st.ebene, st.kontinent);
  s.querySelector('#andere').onclick = ()=>zeige(ebenenwahl);
  vorlesen('Geschafft!');
  return s;
}

zeige(profilwahl);
