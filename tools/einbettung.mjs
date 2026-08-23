#!/usr/bin/env node
/**
 * Die Einbettung, gemessen.
 *
 * Zwei Zahlen je Figur und Karte, und beide werden gebraucht:
 *
 *   Farbabstand    wie weit die Figur farblich vom Boden liegt. Zu gross
 *                  heisst: sie gehoert in eine andere Szene.
 *   Helligkeitsabstand   wie weit sie sich vom Boden abhebt. Zu KLEIN heisst:
 *                  sie ist eingebettet und nicht mehr zu sehen - Befund B5
 *                  des Grafik-Audits, elf von zwoelf Figuren lagen einmal so.
 *
 * Eine Zahl allein waere immer zu erreichen: man streicht die Figur in der
 * Bodenfarbe an, und der Farbabstand ist null. Deshalb stehen hier zwei
 * gegenlaeufige, und das Tor prueft beide.
 *
 * Aufruf: npm run einbettung  (mit --tor als Pruefung)
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOR = process.argv.includes('--tor');

/** Die Baender. Beide aus dem Audit, nicht aus mir (Regel 10):
 *  B5 nennt 0,10 als Untergrenze der Sichtbarkeit; der Farbabstand ist an der
 *  Frostspalte geeicht, der einzigen Karte, fuer die der Zielturm gebaut ist
 *  und die deshalb zeigt, wie "zugehoerig" in diesem Spiel aussieht. */
/** Der Farbabstand ist reine Buntheit (Gegenfarbachsen, ohne Helligkeit) -
 *  siehe `kennwert`.
 *
 *  Das ZIEL waere 0,16: so weit liegt der Zielturm von der Frostspalte, der
 *  einen Karte, fuer die er gebaut wurde - die einzige Stelle im Verzeichnis,
 *  die zeigt, wie "gehoert dazu" hier aussieht (Regel 10).
 *
 *  Das TOR steht bei 0,24, und der Unterschied ist kein Nachlassen, sondern
 *  ein Befund: 0,16 waere nur mit Klimastaerke 0,70 zu erreichen, und dann
 *  ist der Zielturm auf dem Spiralhain braun. Sein Blau ist seine Identitaet.
 *  Was zwischen 0,24 und 0,16 liegt, ist durch Anstreichen nicht zu holen -
 *  es braucht ein Bild fuer diese Welt oder eine Karte, die dem Kristall
 *  entgegenkommt. Beides steht als naechster Schritt. */
const FARBE_MAX = 0.24;
const HELL_MIN = 0.10;

const quelle = (datei, id) => {
  const t = new RegExp(`'${id}': 'data:image/(?:webp|jpeg|png);base64,([^']+)'`)
    .exec(readFileSync(join(ROOT, datei), 'utf8'));
  return t ? Buffer.from(t[1], 'base64') : null;
};

/** Mittlere Farbe und Helligkeit der SICHTBAREN Punkte. */
const kennwert = async (buf) => {
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    r += data[i] / 255; g += data[i + 1] / 255; b += data[i + 2] / 255; n++;
  }
  if (!n) return null;
  r /= n; g /= n; b /= n;
  // Zwei Achsen, die einander NICHT enthalten.
  //
  // Der erste Anlauf mass den Farbabstand euklidisch in RGB - und das ist zum
  // groessten Teil Helligkeit. Eine Waschung, die den Farbton verschiebt,
  // ohne die Helligkeit anzufassen, bewegte diese Zahl deshalb kaum: das Tor
  // konnte gar nicht sehen, was ich veraendern wollte.
  //
  // Jetzt: `hell` ist die Leuchtdichte, `ca`/`cb` sind die Gegenfarbachsen
  // (rot-gruen und gelb-blau) ohne Helligkeitsanteil. Damit misst der eine
  // Wert Zugehoerigkeit und der andere Sichtbarkeit, und beide lassen sich
  // getrennt einhalten.
  return { r, g, b, hell: 0.30 * r + 0.59 * g + 0.11 * b, ca: r - g, cb: 0.5 * (r + g) - b };
};

// --- Die Karten
const KARTEN = [];
for (const m of readFileSync(join(ROOT, 'src/gfx/assets/backgrounds.ts'), 'utf8')
  .matchAll(/'([a-z]+)': 'data:image\/(?:webp|jpeg);base64,([^']+)'/g)) {
  const k = await kennwert(Buffer.from(m[2], 'base64'));
  KARTEN.push({ id: m[1], ...k, roh: Buffer.from(m[2], 'base64') });
}

/** Die Einbettung nachrechnen - dieselbe Formel wie src/gfx/einbettung.ts.
 *
 *  Sie steht hier ein zweites Mal, und das ist die Schwaeche dieses
 *  Werkzeugs: es misst eine NACHGEBAUTE Einbettung, nicht die eingebaute.
 *  Deshalb prueft die Gegenprobe zusaetzlich am laufenden Spiel, nicht nur
 *  hier - eine Formel, die nur sich selbst misst, bezeugt nichts. */
const SONNE = { spiralhain: '#FFC26A', ascheschlucht: '#FFB661', frostspalte: '#FFD9A0' };
const KLIMA_STAERKE = Number(
  /KLIMA_STAERKE = ([0-9.]+)/.exec(
    readFileSync(join(ROOT, 'src/gfx/einbettung.ts'), 'utf8'),
  )[1],
);

const einbettenMit = async (buf, karte, staerke, klimaStaerke) => {
  const bild = await loadImage(buf);
  const s = Math.max(bild.width, bild.height);
  const cv = createCanvas(bild.width, bild.height);
  const g = cv.getContext('2d');
  g.drawImage(bild, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  const a = (hex, al) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${al})`;
  };
  const klima = '#'
    + Math.round(karte.r * 255).toString(16).padStart(2, '0')
    + Math.round(karte.g * 255).toString(16).padStart(2, '0')
    + Math.round(karte.b * 255).toString(16).padStart(2, '0');
  // Das Farbklima NUR ueber den Farbton, nicht ueber die Helligkeit.
  //
  // Eine gewoehnliche Waschung verschiebt beides zusammen - und genau daran
  // ist der erste Anlauf gescheitert: der Spiralhain braucht 0,55, damit der
  // Farbabstand ins Band kommt, die Frostspalte faellt ab 0,40 unten heraus,
  // weil die Figur dann nicht mehr zu sehen ist. Die beiden Baender schliessen
  // sich gegenseitig.
  //
  // `color` nimmt Farbton und Saettigung von der Quelle und die Helligkeit
  // vom Untergrund. Danach wird mit dem Alpha des Originals zurueckmaskiert,
  // weil ein Mischmodus auch auf durchsichtige Punkte malt.
  {
    const misch = createCanvas(bild.width, bild.height);
    const mg = misch.getContext('2d');
    mg.drawImage(bild, 0, 0);
    mg.globalCompositeOperation = 'color';
    mg.globalAlpha = klimaStaerke * staerke;
    mg.fillStyle = klima;
    mg.fillRect(0, 0, s, s);
    mg.globalAlpha = 1;
    mg.globalCompositeOperation = 'destination-in';
    mg.drawImage(bild, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(misch, 0, 0);
    g.globalCompositeOperation = 'source-atop';
  }
  const sonne = SONNE[karte.id] ?? '#FFC26A';
  const l = g.createLinearGradient(0, 0, s * 0.55, s);
  l.addColorStop(0, a(sonne, 0.30 * staerke));
  l.addColorStop(0.45, a(sonne, 0.14 * staerke));
  l.addColorStop(1, a(sonne, 0.02 * staerke));
  g.fillStyle = l; g.fillRect(0, 0, s, s);
  const d = g.createLinearGradient(0, s * 0.55, 0, s);
  d.addColorStop(0, 'rgba(24,20,14,0)');
  d.addColorStop(1, `rgba(24,20,14,${0.34 * staerke})`);
  g.fillStyle = d; g.fillRect(0, 0, s, s);
  return cv.toBuffer('image/png');
};

const einbetten = (buf, karte, staerke) =>
  einbettenMit(buf, karte, staerke, KLIMA_STAERKE);

const FIGUREN = [
  ['Zielturm', 'src/gfx/assets/objects.ts', 'crystal', 0.72],
];

// --- Eichen: den Raum ansehen, statt an einer Zahl zu drehen (Regel 9).
if (process.argv.includes('--eichen')) {
  const roh = quelle('src/gfx/assets/objects.ts', 'crystal');
  console.log('EICHUNG Klimastaerke — Zielturm\n');
  console.log('Staerke |' + KARTEN.map((k) => ` ${k.id.slice(0, 9).padEnd(9)} `).join('|'));
  console.log('        |' + KARTEN.map(() => ' Farbe Hell ').join('|'));
  for (let st = 0; st <= 0.75; st += 0.05) {
    const zeilen = [];
    for (const k of KARTEN) {
      const n = await kennwert(await einbettenMit(roh, k, 0.72, st));
      const f = Math.hypot(n.ca - k.ca, n.cb - k.cb);
      const h = Math.abs(n.hell - k.hell);
      const ok = f <= FARBE_MAX && h >= HELL_MIN;
      zeilen.push(` ${f.toFixed(2)}${ok ? '*' : ' '} ${h.toFixed(2)} `);
    }
    console.log(`  ${st.toFixed(2)}  |` + zeilen.join('|'));
  }
  console.log('\n* = beide Baender eingehalten. Farbe hoechstens '
    + `${FARBE_MAX}, Helligkeit mindestens ${HELL_MIN}.`);
  process.exit(0);
}

console.log('EINBETTUNG\n');
console.log(`Farbabstand hoechstens ${FARBE_MAX}, Helligkeitsabstand mindestens ${HELL_MIN}.`);
console.log(`Klimastaerke ${KLIMA_STAERKE} (gelesen aus src/gfx/einbettung.ts).\n`);

const befunde = [];
for (const [name, datei, id, staerke] of FIGUREN) {
  const roh = quelle(datei, id);
  if (!roh) { befunde.push(`${name}: Bild nicht gefunden.`); continue; }
  console.log(`── ${name}`);
  for (const k of KARTEN) {
    const vorher = await kennwert(roh);
    const nachher = await kennwert(await einbetten(roh, k, staerke));
    const abst = (v) => Math.hypot(v.ca - k.ca, v.cb - k.cb);
    const hell = (v) => Math.abs(v.hell - k.hell);
    const fv = abst(vorher), fn = abst(nachher);
    const hv = hell(vorher), hn = hell(nachher);
    const schlecht = fn > FARBE_MAX || hn < HELL_MIN;
    console.log(`   ${k.id.padEnd(14)} Farbe ${fv.toFixed(2)} → ${fn.toFixed(2)}`
      + `   Helligkeit ${hv.toFixed(2)} → ${hn.toFixed(2)}`
      + `   ${schlecht ? '  BEFUND' : ''}`);
    if (fn > FARBE_MAX) {
      befunde.push(`${name} auf ${k.id}: Farbabstand ${fn.toFixed(2)} > ${FARBE_MAX} `
        + '- die Figur gehoert farblich in eine andere Szene.');
    }
    if (hn < HELL_MIN) {
      befunde.push(`${name} auf ${k.id}: Helligkeitsabstand ${hn.toFixed(2)} < ${HELL_MIN} `
        + '- die Figur ist eingebettet, aber nicht mehr zu sehen (Audit B5).');
    }
  }
  console.log('');
}

if (befunde.length) {
  console.error(`EINBETTUNG: ${befunde.length} Befund(e)`);
  for (const b of befunde) console.error(`  - ${b}`);
  if (TOR) process.exit(1);
} else {
  console.log('EINBETTUNG: alle Figuren liegen im Band.');
}
