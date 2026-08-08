import sharp from 'sharp';
const lum=(r,g,b)=>(0.2126*r+0.7152*g+0.0722*b)/255;
const datei=process.argv[2];
const meta=await sharp(datei).metadata();
const {data,info}=await sharp(datei).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height;
const farben=new Map(); let n=0,sumL=0,sumS=0,schwarz=0; const werte=[];
for(let i=0;i<W*H;i++){
  const r=data[i*4],g=data[i*4+1],b=data[i*4+2];
  n++; const l=lum(r,g,b); sumL+=l; werte.push(l);
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  sumS+=max===0?0:(max-min)/max;
  if(r<12&&g<12&&b<12)schwarz++;
  farben.set(((r>>3)<<10)|((g>>3)<<5)|(b>>3),1);
}
let kanten=0,kn=0;
for(let y=1;y<H-1;y+=2)for(let x=1;x<W-1;x+=2){
  const i=(y*W+x)*4,j=(y*W+x+1)*4,k=((y+1)*W+x)*4;
  const a=lum(data[i],data[i+1],data[i+2]);
  kanten+=Math.abs(a-lum(data[j],data[j+1],data[j+2]))+Math.abs(a-lum(data[k],data[k+1],data[k+2]));kn++;
}
werte.sort((a,b)=>a-b);
const hell=sumL/n, saett=sumS/n, dichte=(kanten/kn)*100, sw=schwarz/n*100;
const pruef=(name,wert,min,max,form=(v)=>v.toFixed(2))=>{
  const ok=wert>=min&&wert<=max;
  console.log(`  ${name.padEnd(22)} ${form(wert).padStart(7)}   Ziel ${form(min)}-${form(max)}   ${ok?'erfüllt':'ABWEICHUNG'}`);
  return ok;
};
console.log(`\n${datei}`);
console.log(`  Auflösung              ${meta.width}x${meta.height}   Verhältnis ${(meta.width/meta.height).toFixed(3)} (Ziel 1.778)\n`);
let alle=true;
alle=pruef('Mittlere Helligkeit',hell,0.30,0.36)&&alle;
alle=pruef('Sättigung',saett,0.45,0.55)&&alle;
alle=pruef('Detaildichte',dichte,1.5,3.0)&&alle;
alle=pruef('Reines Schwarz %',sw,0,2,(v)=>v.toFixed(1))&&alle;
console.log(`\n  ${alle?'Alle Zielwerte erfüllt.':'Abweichungen siehe oben.'}`);
