/* Lernkiste - Prototyp mit M3 bis M6.
 *
 * Eine Aufgabe, drei Eingabewege. Die Aufgabenlogik sieht nur Antworten.
 * Leitner statt Zufall, Protokoll statt Vergessen, Elternbereich statt
 * Vermuten.
 */
const D = JSON.parse(document.getElementById('daten').textContent);
const BAU = JSON.parse(document.getElementById('bau').textContent);
const buehne = document.getElementById('buehne');

const FL = ['--f1','--f2','--f3','--f4','--f5','--f6','--f7'];
const VIER = ['--f1','--f3','--f5','--f6'];
const el = (t,k,i)=>{ const e=document.createElement(t); if(k)e.className=k; if(i!==undefined)e.innerHTML=i; return e; };
const STERN = (f,g=24)=>`<svg width="${g}" height="${g}" viewBox="-14 -14 28 28"><path d="M0 -12 3.7 -4 12 -2.8 6 3.2 7.4 12 0 7.8 -7.4 12 -6 3.2 -12 -2.8 -3.7 -4Z" fill="${f}" stroke="var(--tinte)" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
const LOESCHEN='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6H9L3 12l6 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><path d="M17 10l-4 4M13 10l4 4"/></svg>';
const ZURUECK='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>';
const MIKRO='<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>';
const sterne=(n,g)=>`<div class="sterne">${[0,1,2].map(i=>STERN(i<n?'oklch(.80 .14 85)':'oklch(.93 .01 250)',g)).join('')}</div>`;

/* ---------- Vorlesen ---------------------------------------------------- */
let stimme=null, tonAn=true, entsperrt=false;
function stimmeSuchen(){ const s=speechSynthesis.getVoices().filter(v=>v.lang.startsWith('de'));
  stimme=s.find(v=>v.localService)||s[0]||null; }
if ('speechSynthesis' in window){ stimmeSuchen(); speechSynthesis.addEventListener('voiceschanged',stimmeSuchen); }
function vorlesen(text){
  if(!tonAn||!('speechSynthesis' in window)||!text) return;
  try{ if(!entsperrt){ speechSynthesis.speak(new SpeechSynthesisUtterance('')); entsperrt=true; }
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text); u.lang='de-DE'; u.rate=.92;
    if(stimme)u.voice=stimme; speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- Profile und Ebenen ------------------------------------------ */
const PROFILE = {
  fiona:{ id:'fiona', name:'Fiona', alter:6, eingabe:['ziehen','sprechen'], vorlesen:true,
          kandidaten:4, laenderTiefe:3, sitzung:6, streng:false, farbe:'--f7' },
  lea:  { id:'lea', name:'Lea', alter:8, eingabe:['ziehen','tippen'], vorlesen:false,
          kandidaten:99, laenderTiefe:5, sitzung:8, streng:true, farbe:'--f5' },
};
const EBENEN = [
  { id:'kontinente',    titel:'Kontinente',        unter:'die sieben' },
  { id:'laender:europa',titel:'Länder in Europa',  unter:'die größten' },
  { id:'laender:afrika',titel:'Länder in Afrika',  unter:'die größten' },
  { id:'bundeslaender', titel:'Bundesländer',      unter:'alle sechzehn' },
  { id:'hauptstaedte',  titel:'Landeshauptstädte', unter:'dreizehn Rätsel' },
];
let P=null, Sitzung=null, Stand={}, Einst={ ton:true, abend:false, sprachmodus:false, pin:'0000',
  stadtstaatenGezeigt:false, hauptstadtAuswahl:true };

/* ---------- Aufgabenvorrat ---------------------------------------------- */
function vorrat(ebeneId){
  const [art, kont] = ebeneId.split(':');
  if (art==='kontinente')
    return D.kontinente.filter(k=>P.id==='fiona' ? k.runde<=3 : true)
      .map(k=>({ id:k.id, name:k.name, aliasse:k.aliasse, aussprache:k.aussprache,
                 pfad:k.pfad, anker:k.anker }));
  if (art==='laender')
    return D.laender[kont].filter(l=>l.rang<=P.laenderTiefe)
      .map(l=>({ id:l.a3, name:l.name, aliasse:l.aliasse, aussprache:l.aussprache,
                 pfad:l.pfad, anker:l.anker }));
  if (art==='bundeslaender')
    return D.deutschland.map(b=>({ id:b.id, name:b.name, aliasse:[], aussprache:[b.name.toLowerCase()],
      pfad:b.pfad, anker:b.anker }));
  if (art==='hauptstaedte')
    return D.deutschland.filter(b=>!b.stadtstaat).map(b=>({ id:b.id, name:b.hauptstadt,
      aliasse:[], aussprache:[b.hauptstadt.toLowerCase()], pfad:b.pfad, anker:b.anker,
      gebiet:b.name, ablenker:b.ablenker||[], falle:b.falle }));
  return [];
}
const NAMEN = {};
D.kontinente.forEach(k=>NAMEN[k.id]=k.name);
Object.values(D.laender).flat().forEach(l=>NAMEN[l.a3]=l.name);
D.deutschland.forEach(b=>NAMEN[b.id]=b.name);

const standSchluessel = (ebeneId)=>`${P.id}:${ebeneId}`;
async function standLaden(ebeneId){
  try { Stand = (await Ablage.hole('fortschritt', standSchluessel(ebeneId))) || Leitner.neuerStand(); }
  catch(e){ Stand = Leitner.neuerStand(); }
}
async function standSichern(ebeneId){
  try { await Ablage.setze('fortschritt', standSchluessel(ebeneId), Stand); } catch(e){}
}
async function einstLaden(){
  try { Einst = { ...Einst, ...(await Ablage.hole('einstellungen','alles') || {}) }; } catch(e){}
  tonAn = Einst.ton;
  document.documentElement.setAttribute('data-abend', Einst.abend ? 'an' : 'aus');
}
async function einstSichern(){ try{ await Ablage.setze('einstellungen','alles',Einst); }catch(e){} }

/* ---------- Bildschirmwechsel ------------------------------------------- */
function zeige(bau){
  Promise.resolve(bau()).then(neu=>{
    // ALLE bisherigen Bildschirme, nicht nur den sichtbaren. Wird zeige()
    // zweimal kurz hintereinander gerufen, bleibt sonst einer haengen -
    // im Elternbereich schimmerten drei Bildschirme uebereinander.
    const alte = [...buehne.querySelectorAll('.schirm')];
    neu.classList.add('schirm'); buehne.appendChild(neu);
    requestAnimationFrame(()=>{
      neu.classList.add('da');
      alte.forEach(a=>{ a.classList.remove('da'); setTimeout(()=>a.remove(),340); });
    });
  });
}

/* ---------- Profilwahl --------------------------------------------------- */
function profilwahl(){
  const s = el('div');
  s.innerHTML = `<div class="kopf"><span></span>
      <div class="reihe">
        <button class="knopf" id="ton">${tonAn?'Ton an':'Ton aus'}</button>
        <button class="knopf" id="abend">${Einst.abend?'Abend':'Tag'}</button>
      </div></div>
    <div class="mitte">
      <div class="titel">Wer spielt?</div>
      <div class="wahl">${Object.values(PROFILE).map(p=>`
        <button class="kachel" data-profil="${p.id}">
          <div class="kreis" style="background:var(${p.farbe})">${p.name[0]}</div>
          <div class="name">${p.name}</div>
          <div class="rolle">${p.alter} Jahre · ${p.eingabe.includes('sprechen')?'sprechen und ziehen':'tippen und ziehen'}</div>
        </button>`).join('')}</div>
      <div class="unter">Prototyp · Fassung ${BAU.fassung} · ${BAU.datum}</div>
    </div>`;
  s.querySelector('#ton').onclick=(e)=>{ tonAn=!tonAn; Einst.ton=tonAn; einstSichern();
    e.target.textContent=tonAn?'Ton an':'Ton aus'; };
  s.querySelector('#abend').onclick=(e)=>{ Einst.abend=!Einst.abend; einstSichern();
    document.documentElement.setAttribute('data-abend',Einst.abend?'an':'aus');
    e.target.textContent=Einst.abend?'Abend':'Tag'; };
  s.querySelectorAll('[data-profil]').forEach(b=>b.onclick=()=>{
    P=PROFILE[b.dataset.profil]; Ablage.setze('profile',P.id,{ id:P.id, zuletzt:Date.now() }).catch(()=>{});
    vorlesen(P.name); zeige(ebenenwahl); });
  return s;
}

/* ---------- Ebenenwahl mit Fortschritt ----------------------------------- */
async function ebenenwahl(){
  const s = el('div');
  const balken = [];
  for (const e of EBENEN) {
    let st = {};
    try { st = (await Ablage.hole('fortschritt', `${P.id}:${e.id}`)) || {}; } catch(err){}
    const alle = vorrat(e.id);
    balken.push({ ...e, ...Leitner.fortschritt(alle, st) });
  }
  s.innerHTML = `<div class="kopf">
      <button class="knopf" id="zur">${ZURUECK}<span>Zurück</span></button>
      <span class="fortschritt">${P.name}</span>
      <div class="reihe">
        <button class="knopf" id="buch">Forscherbuch</button>
        <button class="knopf" id="eltern">Eltern</button>
      </div></div>
    <div class="mitte">
      <div class="titel">Was möchtest du üben?</div>
      <div class="wahl">${balken.map(b=>`
        <button class="kachel" data-ebene="${b.id}" style="min-width:200px">
          <div class="name" style="font-size:var(--s1)">${b.titel}</div>
          <div class="rolle">${b.gesammelt} von ${b.gesamt} gesammelt${b.gekonnt?` · ${b.gekonnt} sicher`:''}</div>
          <div class="balken"><i style="width:${Math.round(b.anteil*100)}%"></i></div>
        </button>`).join('')}</div>
    </div>`;
  s.querySelector('#zur').onclick=()=>zeige(profilwahl);
  s.querySelector('#buch').onclick=()=>zeige(forscherbuch);
  s.querySelector('#eltern').onclick=()=>zeige(elternTor);
  s.querySelectorAll('[data-ebene]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.ebene;
    if (id==='hauptstaedte' && !Einst.stadtstaatenGezeigt) zeige(()=>stadtstaaten(id));
    else starten(id); });
  return s;
}

/* ---------- Die Stadtstaaten-Lerneinheit --------------------------------- */
function stadtstaaten(danach){
  const s = el('div');
  const drei = D.deutschland.filter(b=>b.stadtstaat);
  s.innerHTML = `<div class="kopf">
      <button class="knopf" id="zur">${ZURUECK}<span>Zurück</span></button><span></span></div>
    <div class="mitte">
      <div class="titel">Drei sind anders</div>
      <div class="unter">Berlin, Hamburg und Bremen sind <strong>Stadtstaaten</strong>:
        die Stadt ist das ganze Bundesland. Sie haben keine eigene Hauptstadt —
        sie <em>sind</em> ihre Hauptstadt.</div>
      <div class="wahl">${drei.map((b,i)=>`
        <button class="kachel" data-lesen="${b.name}" style="min-width:150px">
          <svg viewBox="${D.vbD}" style="width:96px;height:96px" aria-hidden="true">
            <path d="${b.pfad}" fill-rule="evenodd" fill="var(${VIER[i%4]})"
                  stroke="var(--tinte)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
          <div class="name" style="font-size:var(--s1)">${b.name}</div>
        </button>`).join('')}</div>
      <button class="knopf" id="weiter" style="font-size:var(--s1);padding:var(--r3) var(--r8)">Verstanden</button>
    </div>`;
  s.querySelector('#zur').onclick=()=>zeige(ebenenwahl);
  s.querySelectorAll('[data-lesen]').forEach(b=>b.onclick=()=>vorlesen(b.dataset.lesen));
  s.querySelector('#weiter').onclick=()=>{ Einst.stadtstaatenGezeigt=true; einstSichern(); starten(danach); };
  vorlesen('Drei sind anders. Berlin, Hamburg und Bremen sind Stadtstaaten.');
  return s;
}

/* ---------- Sitzung starten ---------------------------------------------- */
/** Ein Keim, der sich reproduzieren laesst. Aus der Uhr geht das nicht. */
function keimAus(text){
  let h = 2166136261;
  for (let i=0;i<text.length;i++){ h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
async function starten(ebeneId){
  await standLaden(ebeneId);
  const alle = vorrat(ebeneId);
  // Die Sitzungsnummer waechst, die Uhr nicht: gleicher Fortschritt +
  // gleiche Nummer = gleiche Aufgabenfolge. Ohne das laesst sich die
  // Lernlogik nur behaupten, nicht nachrechnen (Konzept K3, Kapitel 7).
  const nrSchluessel = `nr:${P.id}:${ebeneId}`;
  let nr = 0;
  try { nr = (await Ablage.hole('einstellungen', nrSchluessel)) || 0; } catch(e){}
  nr++;
  try { await Ablage.setze('einstellungen', nrSchluessel, nr); } catch(e){}
  const keim = keimAus(`${P.id}|${ebeneId}|${nr}`);
  const liste = Leitner.sitzung(alle, Stand, P.sitzung, Date.now(), keim);
  Sitzung = { ebeneId, alle, liste, i:0, richtig:0, versuche:0, keim, begonnen:Date.now() };
  zeige(spielschirm);
}

/* ---------- Der Spielbildschirm ------------------------------------------ */
function spielschirm(){
  const s = el('div'), st = Sitzung, ziel = st.liste[st.i];
  const [art, kont] = st.ebeneId.split(':');
  const istHaupt = art==='hauptstaedte';
  const beginn = Date.now();
  let versuch = 0, erledigt = false;

  // Kandidaten: Ziel plus Ablenker. Bei Ebene 4 sind die Ablenker das
  // Eigentliche - fuenf Bundeslaender haben eine Hauptstadt, die NICHT ihre
  // groesste Stadt ist.
  // Mulberry32 statt eines einfachen linearen Kongruenzgenerators.
  //
  // Der LCG (x = x*1664525 + 1013904223) sieht fuer sich genommen zufaellig
  // aus, aber die Keime benachbarter Aufgaben liegen nur 7919 auseinander -
  // und bei einem LCG haengen die Ausgaben zu benachbarten Keimen linear
  // zusammen. Das Ergebnis: die richtige Stadt landete in zehn Aufgaben
  // hintereinander nur auf Platz 2 oder 3, nie auf 1 oder 4. Jede
  // Einzelpruefung war gruen - vier Staedte, eine richtig, eine aus dem
  // gleichen Land -, und die Aufgabe war trotzdem kaputt: wer raet, raet
  // in der Mitte.
  //
  // Mulberry32 verwuerfelt den Keim erst, bevor er zaehlt. Gefunden hat das
  // der Rauchtest, nicht das Auge.
  const rnd = (k)=>{ let x=k>>>0; return ()=>{
    x=(x+0x6D2B79F5)>>>0;
    let t=Math.imul(x^(x>>>15), 1|x);
    t=(t+Math.imul(t^(t>>>7), 61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296; }; };
  const misch=(a,r)=>{ const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };
  const r1 = rnd(st.keim + st.i*7919);
  let kand;
  if (istHaupt) {
    // IMMER genau vier Staedte, genau eine richtig, Reihenfolge je Aufgabe
    // neu gewuerfelt.
    //
    // Die drei falschen sind nicht beliebig zusammengesucht:
    //
    // EINE kommt aus demselben Bundesland. Das ist die eigentliche Falle -
    // bei fuenf Laendern ist die groesste Stadt NICHT die Hauptstadt
    // (Frankfurt/Wiesbaden, Koeln/Duesseldorf, Leipzig/Dresden,
    // Halle/Magdeburg, Rostock/Schwerin). Dort steht der Irrtum, um den es
    // geht, also steht dort die erstgenannte Stadt fest. Bei den anderen
    // acht wechselt sie, damit die Aufgabe nicht auswendig zu lernen ist.
    //
    // ZWEI sind Hauptstaedte ANDERER Bundeslaender. Ohne sie stuenden vier
    // Namen aus derselben Ecke Deutschlands da, und das Kind koennte die
    // richtige an der Landsmannschaft erkennen statt am Wissen.
    const ausDemLand = ziel.ablenker || [];
    const gewaehlt = ausDemLand.length
      ? (ziel.falle ? ausDemLand[0] : ausDemLand[Math.floor(r1() * ausDemLand.length)])
      : null;
    const falle = gewaehlt
      ? [{ id:'x-'+gewaehlt, name:gewaehlt, aliasse:[], aussprache:[gewaehlt.toLowerCase()] }] : [];
    const fremd = misch(st.alle.filter(x=>x.id!==ziel.id), r1).slice(0, 3 - falle.length);
    kand = misch([ziel, ...falle, ...fremd], r1);
  } else {
    const n = Math.min(P.kandidaten, st.alle.length) - 1;
    kand = misch([ziel, ...misch(st.alle.filter(x=>x.id!==ziel.id), r1).slice(0, Math.max(1,n))], r1);
  }

  // Antarktika bekommt seine EIGENE, polare Ansicht. In der Weltkarte liegt
  // es als Sockel am unteren Rand und ist dort gerade nicht formtypisch.
  const polar = art==='kontinente' && ziel.id==='antarktika';
  // Antarktika kommt in der Weltkarte GAR NICHT vor. Es hat seine eigene
  // Ansicht; in der Weltkarte bleibt sonst ein grauer Sockel am unteren Rand
  // stehen, der wie ein Fehler aussieht.
  const formen = polar ? [D.antarktika]
    : art==='kontinente' ? st.alle.filter(g=>g.id!=='antarktika') : st.alle;
  const vb = polar ? D.vbA : art==='kontinente' ? D.vbK : art==='laender' ? D.vbL[kont] : D.vbD;
  const farbeVon=(g,i)=> (art==='bundeslaender'||istHaupt) ? `var(${VIER[(D.farben[g.id]??i)%4]})` : `var(${FL[i%7]})`;
  const umgebung = (art==='laender' && D.umgebung[kont])
    ? D.umgebung[kont].map(p=>`<path d="${p}" fill="var(--app-linie)" opacity=".55"/>`).join('') : '';
  const flaechen = formen.map((g,i)=>`<path class="geb ${g.id===ziel.id?'ziel':'ruhig'}" data-id="${g.id}"
      d="${g.pfad}" fill-rule="evenodd" fill="${farbeVon(g,i)}"/>`).join('');
  const konturen = formen.map(g=>`<path d="${g.pfad}" fill-rule="evenodd"/>`).join('');
  // Der Umriss des gesuchten Gebiets, zweimal: ein ruhiger dicker Rand und
  // darueber ein pulsierender. Ohne das ist bei sieben Pastellflaechen nicht
  // zu erkennen, welche gemeint ist.
  const zielForm = formen.find(g=>g.id===ziel.id) || ziel;
  // Der Zeiger wird in BILDSCHIRMPUNKTEN gezeichnet, nicht in
  // Kartenkoordinaten: sonst schrumpft er mit dem Massstab und ist auf
  // Thueringen nur noch ein blauer Fleck.
  const zeiger = zielForm.anker
    ? `<g class="zeiger" data-x="${zielForm.anker[0]}" data-y="${zielForm.anker[1]}">
         <path d="M0 -2 L-9 -17 L9 -17 Z" fill="var(--akzent)"/>
         <circle cy="-26" r="11" fill="var(--akzent)" stroke="white" stroke-width="2.5"/>
         <path d="M0 -32 L0 -21 M0 -18.5 L0 -18.4" stroke="white" stroke-width="2.6"
               stroke-linecap="round" fill="none"/>
       </g>` : '';
  // Ebene 4 fragt nach der Hauptstadt, nicht nach der Schreibweise. Eine Stadt
  // zu tippen, die man noch nie gesehen hat, prueft das Buchstabieren - nicht
  // das Wissen, um das es hier geht. Deshalb ist diese Ebene fuer BEIDE
  // Profile eine Auswahl. Im Elternbereich abschaltbar, dann tippt Lea auch
  // hier wieder.
  const tippt = P.eingabe.includes('tippen') && !(istHaupt && Einst.hauptstadtAuswahl);
  const spricht = P.eingabe.includes('sprechen');
  const frageText = istHaupt ? `Wie heißt die Hauptstadt von ${ziel.gebiet}?`
    : art==='kontinente' ? 'Wie heißt dieser Kontinent?'
    : art==='laender' ? 'Wie heißt dieses Land?' : 'Wie heißt dieses Bundesland?';
  const fach = Stand[ziel.id]?.fach ?? 1;

  s.innerHTML = `
    <div class="kopf">
      <button class="knopf" id="zur">${ZURUECK}<span>Zurück</span></button>
      <span class="fortschritt">${st.i+1} von ${st.liste.length}
        <span class="fach" title="Leitner-Fach">Fach ${fach}</span></span>
      ${sterne(Math.min(3, Math.floor(st.richtig/Math.max(1,Math.ceil(st.liste.length/3)))))}
    </div>
    <div class="frage" id="frage">${frageText}</div>
    <div class="feld">
      <div class="karte" id="karte">
        <svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet">
          <defs><clipPath id="wasch"><circle id="waschKreis" cx="0" cy="0" r="900"
            style="transform-box:fill-box;transform-origin:center"/></clipPath></defs>
          <g id="umg">${umgebung}</g>
          <g id="fl">${flaechen}</g>
          <g id="treffer"></g>
          <path id="belohn" d="" fill="oklch(.80 .12 155)" clip-path="url(#wasch)" style="display:none"/>
          <g fill="none" stroke="var(--tinte)" stroke-opacity=".5" stroke-width="1.1"
             vector-effect="non-scaling-stroke">${konturen}</g>
          <path class="zielrand" d="${zielForm.pfad}" fill="none" fill-rule="evenodd"
                stroke="var(--tinte)" stroke-width="3.5" stroke-linejoin="round"
                vector-effect="non-scaling-stroke"/>
          <path class="zielpuls" d="${zielForm.pfad}" fill="none" fill-rule="evenodd"
                stroke="var(--akzent)" stroke-width="3" stroke-linejoin="round"
                vector-effect="non-scaling-stroke"/>
          ${zeiger}
          <path id="kontur" d="" fill="none" stroke="var(--tinte)" stroke-width="2.4"
                vector-effect="non-scaling-stroke" stroke-linejoin="round" style="display:none"/>
          <circle id="stadtpunkt" r="0" fill="var(--akzent)" stroke="white" stroke-width="2"
                  vector-effect="non-scaling-stroke" style="display:none"/>
        </svg>
      </div>
      <div class="seite" id="seite"></div>
    </div>`;

  const seite = s.querySelector('#seite');
  const liste = el('div','wahlliste'), werkzeug = el('div','werkzeug');
  seite.append(liste, werkzeug);
  s.querySelector('#zur').onclick=()=>zeige(ebenenwahl);

  const MIN_PT = 44, MIN_REST = 20;
  function trefferflaechen(){
    const svg=s.querySelector('.karte svg'); if(!svg) return;
    const g=svg.querySelector('#treffer'); const ctm=svg.getScreenCTM(); if(!g||!ctm) return;
    const k=Math.abs(ctm.a)||1;
    const mit = formen.filter(x=>x.anker).map(x=>{
      const p=s.querySelector(`path.geb[data-id="${x.id}"]`); const bb=p?p.getBBox():{width:0,height:0};
      return { x, gross:Math.max(bb.width,bb.height) };
    }).sort((a,b)=>b.gross-a.gross);

    // Ein Trefferkreis darf den Anker eines ANDEREN Gebiets nicht
    // verschlucken. Berlins 44-Punkt-Kreis lag genau auf Brandenburgs Anker -
    // und Brandenburg war an seiner besten Stelle nicht mehr zu treffen.
    // "Das kleinere gewinnt" heisst nicht "das kleinere sperrt aus".
    // Der Zeiger hilft bei kleinen Gebieten und stoert bei grossen.
    const zg = s.querySelector('.zeiger');
    if (zg) {
      const zp = s.querySelector(`path.geb[data-id="${ziel.id}"]`);
      const zb = zp ? zp.getBBox() : {width:0,height:0};
      const gross = Math.max(zb.width, zb.height) * k;
      zg.style.display = gross < 190 ? '' : 'none';
      // Feste Groesse am Bildschirm: 1/k hebt den Kartenmassstab auf.
      const px = 1 / k;
      const x = +zg.dataset.x, y = +zg.dataset.y;
      const oben = (zb.height * k < 44) ? -zb.height/2 - 4*px : 0;   // ueber winzigen Flaechen
      zg.setAttribute('transform', `translate(${x} ${y + oben}) scale(${px.toFixed(3)})`);
    }
    g.innerHTML = mit.filter(n=>n.gross*k<MIN_PT).map(n=>{
      let rPx = MIN_PT/2;
      for (const m of mit) {
        if (m.x.id === n.x.id) continue;
        const d = Math.hypot(n.x.anker[0]-m.x.anker[0], n.x.anker[1]-m.x.anker[1]) * k;
        if (d > 0) rPx = Math.min(rPx, d * 0.55);
      }
      rPx = Math.max(rPx, MIN_REST/2);
      return `<circle data-id="${n.x.id}" cx="${n.x.anker[0]}" cy="${n.x.anker[1]}"
        r="${(rPx/k).toFixed(1)}" fill="transparent" style="pointer-events:all"/>`;
    }).join('');
  }

  if (tippt) {
    const eing=el('input','eingabe'); eing.type='text'; eing.autocapitalize='off';
    eing.autocorrect='off'; eing.spellcheck=false; eing.placeholder='hier schreiben';
    eing.setAttribute('inputmode','text');
    const hin=el('div');
    const ok=el('button','knopf'); ok.style.justifyContent='center'; ok.style.fontSize='var(--s0)';
    ok.textContent='Prüfen';
    liste.append(eing, ok, hin);
    const p=()=>bewerte(eing.value,'tippen',{eing,hin});
    ok.onclick=p; eing.addEventListener('keydown',e=>{ if(e.key==='Enter')p(); });
    setTimeout(()=>eing.focus(),360);
  } else {
    kand.forEach(k=>{ const b=el('div','etikett'); b.textContent=k.name; b.dataset.id=k.id;
      b.onclick=()=>vorlesen(k.name); ziehbar(b,k); liste.appendChild(b); });
  }

  if (spricht) {
    const mik=el('button','mikro',MIKRO);
    const status=el('div','unter'); status.style.fontSize='var(--s-klein)';
    const Erk = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Erk || !Einst.sprachmodus) {
      mik.classList.add('tonaus');
      status.textContent = !Erk
        ? 'Sprechen geht in diesem Browser nicht — Stufe C: sag es laut, dann zieh.'
        : 'Sprachmodus ist aus. Im Elternbereich einschalten.';
      mik.onclick=()=>vorlesen('Sag es laut!');
    } else {
      mik.onclick=()=>{
        const e=new Erk(); e.lang='de-DE'; e.interimResults=false; e.maxAlternatives=3;
        status.textContent='… ich höre';
        e.onresult=(ev)=>{ const roh=ev.results[0][0].transcript;
          status.textContent=`gehört: „${roh}“`; bewerte(roh,'sprechen',{status}); };
        e.onerror=()=>{ status.textContent='Das hat nicht geklappt — sag es noch einmal.'; };
        try{ e.start(); }catch(err){ status.textContent='Mikrofon nicht verfügbar.'; }
      };
    }
    werkzeug.appendChild(mik); liste.appendChild(status);
  }

  function ziehbar(b,k){
    let start=null;
    b.addEventListener('pointerdown',ev=>{
      if(b.classList.contains('weg')) return;
      b.setPointerCapture(ev.pointerId);
      const r=b.getBoundingClientRect(); start={x:ev.clientX,y:ev.clientY};
      b.classList.add('zieht'); b.style.position='fixed'; b.style.left=r.left+'px';
      b.style.top=r.top+'px'; b.style.width=r.width+'px'; b.style.margin='0';
      b.style.transform='scale(1.06) rotate(-1.5deg)'; vorlesen(k.name);
    });
    b.addEventListener('pointermove',ev=>{ if(!start) return;
      b.style.transform=`translate3d(${ev.clientX-start.x}px,${ev.clientY-start.y}px,0) scale(1.06) rotate(-1.5deg)`; });
    const los=(ev)=>{ if(!start) return;
      b.style.transform=''; b.classList.remove('zieht'); b.style.position='';
      b.style.left=''; b.style.top=''; b.style.width=''; b.style.margin='';
      const unten=document.elementFromPoint(ev.clientX,ev.clientY); start=null;
      const kreis=unten&&unten.closest&&unten.closest('#treffer circle');
      const pfad =unten&&unten.closest&&unten.closest('path.geb');
      const id = kreis?kreis.dataset.id : (pfad?pfad.dataset.id:null);
      if (id) bewerte(k.name,'ziehen',{ etikett:b, getroffen:id });
    };
    b.addEventListener('pointerup',los);
    b.addEventListener('pointercancel',()=>{ start=null; b.style.transform='';
      b.classList.remove('zieht'); b.style.position=''; });
  }

  /* --- Bewertung. EIN Ort, egal welcher Eingabeweg. --- */
  async function bewerte(roh, eingabeart, ctx){
    if (erledigt) return;
    versuch++; st.versuche++;
    let ergebnis='falsch', text='', sicherheit=null;

    if (eingabeart==='ziehen') {
      if (ctx.getroffen===ziel.id && roh===ziel.name) ergebnis='richtig';
      else if (roh===ziel.name) text='Fast! Das ist das falsche Gebiet.';
      else text='Das ist ein anderer Name.';
    } else if (eingabeart==='tippen') {
      const r = Vergleich.rechtschreibung(roh, ziel.name);
      if (r.urteil==='richtig') ergebnis='richtig';
      else if (r.urteil==='fast'){ ergebnis='fast'; text=r.hinweis; }
      else { const t=Vergleich.abgleich(roh,kand);
        text = t.art==='nochmal' ? 'Das kenne ich nicht.'
             : t.id===ziel.id ? 'Fast! Schau noch mal genau hin.' : `Das wäre ${t.name}.`; }
    } else {
      const t = Vergleich.abgleich(roh, kand);
      sicherheit = t.abstand!==undefined ? +(1-t.abstand).toFixed(2) : null;
      if (t.art==='nochmal') text='Sag es noch einmal.';
      else if (t.id!==ziel.id) text=`Das wäre ${t.name}.`;
      else if (t.art==='rueckfrage'){ text=`Meintest du ${t.name}?`; ergebnis='fast'; }
      else ergebnis='richtig';
    }

    const fachVorher = Stand[ziel.id]?.fach ?? 1;
    if (ergebnis!=='falsch') {
      erledigt = true;
      Stand = Leitner.verschieben(Stand, ziel.id, ergebnis==='richtig', Date.now());
      st.richtig += ergebnis==='richtig' ? 1 : 0.5;
      if (ctx.etikett) ctx.etikett.classList.add('weg');
      belohnung(s, ziel, ergebnis==='fast' ? text : null, istHaupt);
      vorlesen(ergebnis==='fast' ? text : ziel.name);
      standSichern(st.ebeneId);
    } else {
      if (ctx.hin){ ctx.hin.className='hinweis nochmal'; ctx.hin.textContent=text; }
      else if (ctx.status) ctx.status.textContent=text;
      else { let h=liste.querySelector('.hinweis');
        if(!h){ h=el('div','hinweis nochmal'); liste.appendChild(h); } h.textContent=text; }
      vorlesen(text);
    }

    Protokoll.schreiben(Protokoll.eintrag({
      zeit: Date.now(), profil: P.id, ebene: st.ebeneId, gebietId: ziel.id,
      eingabeart, ergebnis, roheingabe: eingabeart==='ziehen' ? '' : roh,
      sicherheit, dauerMs: Date.now()-beginn, versuch,
      fachVorher, fachNachher: Stand[ziel.id]?.fach ?? fachVorher,
    }));

    if (erledigt) setTimeout(()=>{ st.i++;
      if (st.i>=st.liste.length) zeige(endschirm); else zeige(spielschirm);
    }, ergebnis==='fast' ? 2400 : 1600);
  }

  requestAnimationFrame(()=>requestAnimationFrame(trefferflaechen));
  addEventListener('resize', trefferflaechen);
  return s;
}

/* ---------- Belohnungsmoment --------------------------------------------- */
function belohnung(s, ziel, fastText, zeigeStadt){
  // Beim Belohnen wird die Hervorhebung still - sonst blinkt es weiter,
  // waehrend sich der Umriss nachzeichnet.
  const kontur=s.querySelector('#kontur'), fuell=s.querySelector('#belohn'),
        kreis=s.querySelector('#waschKreis'), punkt=s.querySelector('#stadtpunkt');
  const flaeche=s.querySelector(`path.geb[data-id="${ziel.id}"]`);
  if(!kontur||!flaeche) return;
  flaeche.classList.add('treffer');
  s.querySelectorAll('.zielpuls,.zielrand,.zeiger').forEach(x=>x.style.display='none');
  s.querySelectorAll('path.geb.ruhig').forEach(x=>x.classList.remove('ruhig'));
  kontur.setAttribute('d',ziel.pfad); fuell.setAttribute('d',ziel.pfad);
  kontur.style.display=''; fuell.style.display='';
  const b=flaeche.getBBox();
  kreis.setAttribute('cx',b.x+b.width/2); kreis.setAttribute('cy',b.y+b.height/2);
  kreis.setAttribute('r',Math.max(b.width,b.height));
  const ruhig=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const L=kontur.getTotalLength(); kontur.style.strokeDasharray=L;
  if (ruhig){ kontur.style.strokeDashoffset=0; kreis.style.transform='scale(1)'; }
  else {
    kontur.style.strokeDashoffset=L;
    kontur.animate([{strokeDashoffset:L},{strokeDashoffset:0}],
      {duration:400,easing:'cubic-bezier(.2,0,0,1)',fill:'forwards'});
    kreis.style.transform='scale(0)';
    kreis.animate([{transform:'scale(0)'},{transform:'scale(1)'}],
      {duration:400,delay:360,easing:'cubic-bezier(.2,0,0,1)',fill:'forwards'});
  }
  // Ebene 4: der Stadtpunkt erscheint NACH der richtigen Antwort - als Zugabe.
  const stadt = zeigeStadt && D.deutschland.find(x=>x.id===ziel.id);
  if (stadt && stadt.ort && punkt) {
    punkt.setAttribute('cx',stadt.ort[0]); punkt.setAttribute('cy',stadt.ort[1]);
    punkt.style.display='';
    punkt.animate([{r:0},{r:7}],{duration:300,delay:600,easing:'cubic-bezier(.34,1.56,.64,1)',fill:'forwards'});
  }
  const frage=s.querySelector('#frage');
  if (frage) frage.innerHTML = fastText
    ? `<span style="color:var(--app-warn)">${fastText}</span>`
    : `<span style="color:var(--app-gut)">Richtig — ${ziel.name}!</span>`;
}

/* ---------- Ende ---------------------------------------------------------- */
function endschirm(){
  const st=Sitzung, s=el('div');
  const n=Math.max(1,Math.min(3,Math.round(st.richtig/st.liste.length*3)));
  const f=Leitner.fortschritt(st.alle, Stand);
  s.innerHTML=`<div class="kopf"><span></span><span></span></div>
    <div class="mitte">
      <div>${sterne(n,56)}</div>
      <div class="gross">Geschafft!</div>
      <div class="unter">${Math.round(st.richtig)} von ${st.liste.length} richtig,
        ${st.versuche} Versuche.<br>Du hast <strong>${f.gesammelt} von ${f.gesamt}</strong> Aufklebern${
        f.gekonnt?`, ${f.gekonnt} davon sicher`:''}.</div>
      <div class="balken" style="width:min(340px,70vw)"><i style="width:${Math.round(f.anteil*100)}%"></i></div>
      <div class="reihe" style="margin-top:var(--r6)">
        <button class="knopf" id="nochmal">Noch einmal</button>
        <button class="knopf" id="buch">Forscherbuch</button>
        <button class="knopf" id="andere">Etwas anderes</button>
      </div>
    </div>`;
  s.querySelector('#nochmal').onclick=()=>starten(st.ebeneId);
  s.querySelector('#buch').onclick=()=>zeige(forscherbuch);
  s.querySelector('#andere').onclick=()=>zeige(ebenenwahl);
  vorlesen('Geschafft!');
  return s;
}

/* ---------- Forscherbuch: der Aufkleber IST der Umriss ------------------- */
async function forscherbuch(){
  const s = el('div');
  const gruppen = [];
  for (const e of EBENEN) {
    let st={}; try{ st=(await Ablage.hole('fortschritt',`${P.id}:${e.id}`))||{}; }catch(err){}
    const alle = vorrat(e.id);
    const vb = e.id.startsWith('kontinente') ? D.vbK
             : e.id.startsWith('laender') ? D.vbL[e.id.split(':')[1]] : D.vbD;
    gruppen.push({ titel:e.titel, vb, stuecke: alle.map((g,i)=>({
      ...g, gesammelt: Leitner.istGesammelt(st, g.id), gekonnt: Leitner.istGekonnt(st, g.id),
      fach: st[g.id]?.fach ?? 0, i })) });
  }
  const gesamt = gruppen.reduce((a,g)=>a+g.stuecke.filter(x=>x.gesammelt).length,0);
  s.innerHTML = `<div class="kopf">
      <button class="knopf" id="zur">${ZURUECK}<span>Zurück</span></button>
      <span class="fortschritt">${gesamt} Aufkleber</span><span></span></div>
    <div class="rollen">
      ${gruppen.map(g=>`
        <h3 class="gruppe">${g.titel}</h3>
        <div class="kleber">${g.stuecke.map(x=>`
          <button class="aufkleber ${x.gesammelt?'da':''} ${x.gekonnt?'sicher':''}"
                  data-lesen="${x.name}" title="Fach ${x.fach||'—'}">
            <svg viewBox="${g.vb}" aria-hidden="true"><path d="${x.pfad}" fill-rule="evenodd"
              fill="${x.gesammelt?`var(${FL[x.i%7]})`:'var(--app-linie)'}"
              stroke="var(--tinte)" stroke-opacity="${x.gesammelt?.6:.25}" stroke-width="1.6"
              vector-effect="non-scaling-stroke"/></svg>
            <span>${x.gesammelt?x.name:'?'}</span>
            ${x.gekonnt?'<i class="siegel"></i>':''}
          </button>`).join('')}</div>`).join('')}
    </div>`;
  s.querySelector('#zur').onclick=()=>zeige(ebenenwahl);
  s.querySelectorAll('[data-lesen]').forEach(b=>b.onclick=()=>vorlesen(b.dataset.lesen));
  return s;
}

/* ---------- Elternbereich ------------------------------------------------ */
/* Die PIN ist eine Tuerklinke, kein Schloss: sie liegt unverschluesselt in
   der Ablage und haelt neugierige Achtjaehrige ab, nicht Angreifer. */
function elternTor(){
  const s = el('div'); let eingabe='';
  s.innerHTML = `<div class="kopf">
      <button class="knopf" id="zur">${ZURUECK}<span>Zurück</span></button><span></span></div>
    <div class="mitte">
      <div class="titel">Elternbereich</div>
      <div class="unter">Vier Ziffern. Voreingestellt ist <code>0000</code>.</div>
      <div class="pin" id="pin">${'<i></i>'.repeat(4)}</div>
      <div class="ziffern">${[1,2,3,4,5,6,7,8,9,0].map(z=>`<button class="knopf zi" data-z="${z}">${z}</button>`).join('')}
        <button class="knopf zi" data-z="x" aria-label="löschen">${LOESCHEN}</button></div>
      <div class="unter" id="fehl" style="color:var(--app-warn)"></div>
    </div>`;
  // Punkte und Pfeil sind gezeichnet, nicht getippt. Als Schriftzeichen
  // (●, ○, ←) lagen sie ausserhalb des Schnitts `latin` und waeren aus der
  // Systemschrift gekommen - also in einer anderen Schrift als alles daneben.
  // Gefunden hat das Tor `schrift`.
  const anzeige=()=>s.querySelectorAll('#pin i')
    .forEach((p,i)=>p.classList.toggle('voll', i<eingabe.length));
  s.querySelector('#zur').onclick=()=>zeige(ebenenwahl);
  s.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{
    const z=b.dataset.z;
    if (z==='x') eingabe=eingabe.slice(0,-1);
    else if (eingabe.length<4) eingabe+=z;
    anzeige();
    if (eingabe.length===4) {
      if (eingabe===(Einst.pin||'0000')) zeige(elternbereich);
      else { s.querySelector('#fehl').textContent='Das war nicht richtig.'; eingabe=''; anzeige(); }
    }
  });
  return s;
}

async function elternbereich(){
  const s = el('div');
  const eintraege = await Protokoll.lesen();
  const a = Protokoll.auswerten(eintraege, NAMEN);
  const speicher = await Ablage.dauerhaft();
  const jeProfil = {};
  for (const e of eintraege) jeProfil[e.profil] = (jeProfil[e.profil]||0)+1;

  const zeile = (z)=>`<tr><td>${z.name}</td>
    <td class="num">${z.n}</td>
    <td class="num">${Math.round(z.quote*100)} %</td>
    <td class="num">${(z.schnitt/1000).toFixed(1)} s</td>
    <td><div class="balken klein"><i style="width:${Math.round(z.quote*100)}%;
      background:${z.quote>.7?'var(--app-gut)':z.quote>.4?'oklch(.75 .13 85)':'var(--app-warn)'}"></i></div></td></tr>`;

  s.innerHTML = `<div class="kopf">
      <button class="knopf" id="zur">${ZURUECK}<span>Zurück</span></button>
      <span class="fortschritt">Elternbereich</span><span></span></div>
    <div class="rollen eltern">
      <h3 class="gruppe">Überblick</h3>
      <div class="kacheln">
        <div class="wert"><b>${a.gesamt}</b><span>Antworten</span></div>
        <div class="wert"><b>${a.gesamt?Math.round(a.richtig/a.gesamt*100):0} %</b><span>richtig</span></div>
        <div class="wert"><b>${a.tage.length}</b><span>Tage gespielt</span></div>
        <div class="wert"><b>${Object.keys(jeProfil).length}</b><span>Profile</span></div>
      </div>

      <h3 class="gruppe">Wackelkandidaten</h3>
      ${a.wackelkandidaten.length ? `<table class="tab"><thead><tr><th>Gebiet</th>
        <th class="num">Versuche</th><th class="num">richtig</th><th class="num">Ø Zeit</th><th></th></tr></thead>
        <tbody>${a.wackelkandidaten.map(zeile).join('')}</tbody></table>`
        : `<p class="unter">Noch zu wenig gespielt.</p>`}

      <h3 class="gruppe">Ausspracheliste — was gesagt, was verstanden</h3>
      ${a.aussprache.length ? `<table class="tab"><thead><tr><th>gesagt</th><th>gemeint</th>
        <th class="num">Ergebnis</th></tr></thead><tbody>
        ${a.aussprache.slice(-25).reverse().map(x=>`<tr><td><em>„${x.gesagt}“</em></td>
          <td>${x.gemeint}</td><td class="num">${x.ergebnis}</td></tr>`).join('')}</tbody></table>`
        : `<p class="unter">Noch nichts gesprochen. Der Sprachmodus ist
           <strong>${Einst.sprachmodus?'an':'aus'}</strong>.</p>`}

      <h3 class="gruppe">Sprachmodus</h3>
      <p class="unter">Die Spracherkennung läuft <strong>nicht auf dem Gerät</strong>.
        Was das Kind sagt, geht zur Erkennung an Apple beziehungsweise den Browserhersteller.
        Alles andere — Fortschritt, Protokoll, Profile — bleibt hier und geht nirgendwohin.</p>
      <div class="reihe" style="justify-content:flex-start">
        <button class="knopf" id="sprach">${Einst.sprachmodus?'Sprachmodus ausschalten':'Sprachmodus einschalten'}</button>
      </div>

      <h3 class="gruppe">Landeshauptstädte</h3>
      <p class="unter">Auf dieser Ebene stehen <strong>vier Städte</strong> zur Auswahl,
        eine davon stimmt — für beide Kinder. Gefragt ist, <em>welche</em> Stadt es ist,
        nicht wie man sie schreibt. Wer lieber tippt, schaltet die Auswahl hier ab;
        dann gilt auf dieser Ebene wieder der Eingabeweg des Profils.</p>
      <div class="reihe" style="justify-content:flex-start">
        <button class="knopf" id="hsw">${Einst.hauptstadtAuswahl?'Auswahl abschalten, tippen lassen':'Auswahl einschalten'}</button>
      </div>

      <h3 class="gruppe">Ausfuhr und Löschen</h3>
      <div class="reihe" style="justify-content:flex-start">
        <button class="knopf" id="csv">Als CSV sichern</button>
        <button class="knopf" id="json">Als JSON sichern</button>
        <button class="knopf" id="weg" style="color:var(--app-warn)">Alles von ${P.name} löschen</button>
      </div>
      <div id="ausgabe"></div>

      <h3 class="gruppe">Diese Fassung</h3>
      <table class="tab"><tbody>
        <tr><td>Fassung</td><td class="num">${BAU.fassung}</td></tr>
        <tr><td>Gebaut am</td><td class="num">${BAU.datum}</td></tr>
        <tr><td>Stand der Daten</td><td class="num">${BAU.standJahr}</td></tr>
        <tr><td>Speicher dauerhaft</td><td class="num">${
          speicher.moeglich ? (speicher.gewaehrt?'ja':'abgelehnt') : 'nicht verfügbar'}</td></tr>
        ${speicher.platz ? `<tr><td>belegt</td><td class="num">${(speicher.platz.benutzt/1048576).toFixed(1)} MB</td></tr>`:''}
      </tbody></table>

      <h3 class="gruppe">Herkunft der Karten</h3>
      <p class="unter">Kontinente, Länder und Städtelagen: <strong>Natural Earth</strong>
        (Public Domain). Bundesländer: derzeit ebenfalls Natural Earth — vorgesehen ist
        <strong>BKG VG250</strong>, Datenlizenz Deutschland Namensnennung 2.0
        (© GeoBasis-DE / BKG). Einwohnerzahlen: Stand ${BAU.standJahr}.</p>
    </div>`;

  s.querySelector('#zur').onclick=()=>zeige(ebenenwahl);
  s.querySelector('#sprach').onclick=async(e)=>{
    Einst.sprachmodus=!Einst.sprachmodus; await einstSichern();
    e.target.textContent=Einst.sprachmodus?'Sprachmodus ausschalten':'Sprachmodus einschalten'; };
  s.querySelector('#hsw').onclick=async(e)=>{
    Einst.hauptstadtAuswahl=!Einst.hauptstadtAuswahl; await einstSichern();
    e.target.textContent=Einst.hauptstadtAuswahl?'Auswahl abschalten, tippen lassen':'Auswahl einschalten'; };

  const sichern=(text,name,typ)=>{
    const ausgabe=s.querySelector('#ausgabe');
    try {
      const b=new Blob([text],{type:typ});
      const u=URL.createObjectURL(b); const a2=document.createElement('a');
      a2.href=u; a2.download=name; document.body.appendChild(a2); a2.click();
      setTimeout(()=>{ URL.revokeObjectURL(u); a2.remove(); },1000);
      ausgabe.innerHTML=`<p class="unter">Gesichert als <code>${name}</code>.</p>`;
    } catch(err) {
      // Faellt das Sichern aus (etwa in einer Vorschau ohne Download), wird
      // der Inhalt gezeigt statt verschwiegen.
      ausgabe.innerHTML=`<p class="unter">Sichern ging nicht — hier zum Kopieren:</p>
        <textarea class="ausgabefeld" readonly>${text.replace(/</g,'&lt;')}</textarea>`;
    }
  };
  s.querySelector('#csv').onclick=()=>sichern(Protokoll.alsCsv(eintraege,NAMEN),
    `lernkiste-${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8');
  s.querySelector('#json').onclick=()=>sichern(Protokoll.alsJson(eintraege),
    `lernkiste-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  s.querySelector('#weg').onclick=async(e)=>{
    if (e.target.dataset.sicher!=='ja'){ e.target.dataset.sicher='ja';
      e.target.textContent=`Wirklich? Alles von ${P.name} löschen`; return; }
    await Ablage.profilLoeschen(P.id);
    for (const eb of EBENEN) await Ablage.loesche('fortschritt',`${P.id}:${eb.id}`).catch(()=>{});
    s.querySelector('#ausgabe').innerHTML=`<p class="unter">Gelöscht.</p>`;
    setTimeout(()=>zeige(profilwahl),900);
  };
  return s;
}

/* ---------- Start --------------------------------------------------------- */
(async ()=>{ await einstLaden(); zeige(profilwahl); })();
