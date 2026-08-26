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
 * ZWEI EINSCHRAENKUNGEN, damit niemand mehr aus diesen Zahlen liest, als
 * drinsteht:
 *
 * 1. Dieses Werkzeug rechnet die Einbettung NACH, es misst nicht die
 *    eingebaute. Der Grund ist praktisch - die eingebaute braucht eine
 *    Leinwand und einen Browser -, aber die Folge ist echt: aendert jemand
 *    das VERFAHREN in src/gfx/einbettung.ts, sieht dieses Tor es nicht. Es
 *    liest von dort genau eine Zahl, die Klimastaerke.
 *
 * 2. Deshalb ist die Helligkeits-Untergrenze hier derzeit NICHT beweisbar.
 *    Der Farbtongriff laesst die Leuchtdichte konstruktionsbedingt in Ruhe -
 *    ueber die Klimastaerke ist die Untergrenze also gar nicht zu erreichen.
 *    Eine Gegenprobe dafuer wurde geschrieben und wieder entfernt, weil sie
 *    nicht anschlug; eine Pruefung, die nie etwas meldet, ist kein Beweis
 *    (Regel 5). Die Grenze steht trotzdem hier - sie faengt den Rueckfall auf
 *    eine gewoehnliche Waschung ab, sobald das Werkzeug die eingebaute
 *    Einbettung misst statt einer Kopie. Das ist der naechste Schritt.
 *
 * Aufruf: npm run einbettung  (mit --tor als Pruefung)
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage, Image as NativeImage } from '@napi-rs/canvas';

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

/** Wieviel das Farbklima am Farbabstand mindestens gutmachen muss.
 *
 *  Eine RATSCHE auf dem heutigen Stand, kein erfundenes Soll (Regel 10):
 *  gemessen sinkt der Abstand im Mittel um 0,040 ueber alle Figuren und
 *  Karten. Die Ratsche steht knapp darunter, damit sie nicht bei jedem
 *  neuen Bild anschlaegt - aber weit genug ueber null, dass ein
 *  abgeschaltetes Klima sie reisst.
 *
 *  **Warum es diese Zahl ueberhaupt gibt.** Bis v165 prueften hier nur
 *  Grenzen auf dem PEGEL: "keine Figur weiter als 0,24 vom Boden". Mit
 *  `KLIMA_STAERKE = 0` blieb das gruen, weil die schlimmste Figur mit UND
 *  ohne Klima bei 0,20 liegt - eine Grenze auf dem Pegel kann die Wirkung
 *  gar nicht sehen, egal wie eng man sie zieht. Zwei Gegenproben
 *  behaupteten seit v132 das Gegenteil und bewiesen es nicht mehr; der
 *  volle Lauf zu v166 hat es gefunden. */
const KLIMA_MIN = 0.035;

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

// --- Saumkontrast am gebackenen Bild (TF-012)
//
// Dieselbe Rechnung wie im Lesbarkeitstor, damit die beiden Zahlen
// vergleichbar bleiben: WCAG-Kontrastverhaeltnis zwischen dem aeussersten
// deckenden Ring der Figur und der mittleren Helligkeit des Untergrunds.
const leuchte = (r, g, b) => {
  const f = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const kontrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Der aeusserste deckende Ring einer Figur. */
async function kantenLeuchte(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const deckend = (x, y) => (x < 0 || y < 0 || x >= W || y >= H)
    ? false : data[(y * W + x) * 4 + 3] > 200;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!deckend(x, y)) continue;
    if (deckend(x - 1, y) && deckend(x + 1, y) && deckend(x, y - 1) && deckend(x, y + 1)) continue;
    const i = (y * W + x) * 4;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  return n ? leuchte(r / n, g / n, b / n) : null;
}
const bodenCache = new Map();
async function bodenLeuchte(k) {
  if (bodenCache.has(k.id)) return bodenCache.get(k.id);
  const { data, info } = await sharp(k.roh).resize(240, 132, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0;
  const n = info.width * info.height;
  for (let i = 0; i < n; i++) { r += data[i * 3]; g += data[i * 3 + 1]; b += data[i * 3 + 2]; }
  const l = leuchte(r / n, g / n, b / n);
  bodenCache.set(k.id, l);
  return l;
}
/** Unterhalb dieses Kontrasts laeuft eine Silhouette in den Boden.
 *  Dieselbe Schwelle wie im Lesbarkeitstor - eine zweite Zahl fuer dieselbe
 *  Frage waere eine zweite Wahrheit. */
const SAUM_HINWEIS = 1.5;
/** Ratschen auf dem heutigen Stand, kein Soll.
 *
 *  Gemessen mit und ohne Randlicht (Regel 13): ohne liegt der schwaechste
 *  Saum bei **1,26** (Koloss auf der Frostspalte) und vier von 24 Messungen
 *  unter 1,5. Mit sind es **1,80** und keine einzige. Die Ratsche steht
 *  deshalb dicht unter dem neuen Stand - schlechter wird es nicht mehr. */
const SAUM_MIN = 1.75;
const SAUM_RATSCHE = 0;

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

/** Die Staerke, mit der eine Figur eingebettet wird - wie im Renderer.
 *
 *  Der Zielturm bekommt weniger als ein Turm: er ist dreimal so gross, und
 *  derselbe Anstrich waere auf dieser Flaeche eine Waschung statt einer
 *  Beleuchtung (siehe `drawCrystal`). Alles andere volle Staerke. */
const STAERKE = { crystal: 0.72 };

/** JEDES Einzelobjekt, nicht eine Liste von vieren.
 *
 *  Bis v166 standen hier vier Namen von Hand. Das hat zweimal geschadet:
 *  seit v160 gibt es zehn weitere Eintraege (Sockel und Waffen je
 *  Ausbaustufe), und keiner davon wurde je gemessen - das Tor sagte "alle
 *  Figuren liegen im Band" und meinte vier von vierzehn. Und eine
 *  Gegenprobe, die eine Zeile aus der Liste nimmt, bewiese nichts: das Tor
 *  misst dann eben eine weniger und bleibt gruen.
 *
 *  Jetzt kommt die Liste aus `OBJECT_ART` selbst - derselben Quelle, aus der
 *  der Renderer sie holt. Was das Spiel zeichnet, wird gemessen; wer ein
 *  Objekt hinzufuegt, bekommt die Messung geschenkt und kann sie nicht
 *  vergessen (dieselbe Antwort wie bei Regel 6: eine Ableitung statt einer
 *  Aufzaehlung). */
const { OBJECT_ART } = await import('../src/gfx/assets/objects.ts');
const FIGUREN = Object.keys(OBJECT_ART).map(
  (id) => [id, 'src/gfx/assets/objects.ts', id, STAERKE[id] ?? 1],
);

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

// --- Bekommt jede Karte auch WIRKLICH ihr eigenes Bild? (v147)
//
// Alles darunter misst eine NACHGEBAUTE Einbettung: `einbettenMit` in dieser
// Datei ist eine zweite Fassung der Regel aus `src/gfx/einbettung.ts`. Damit
// prueft das Tor die Rechnung, aber nicht den Weg, den das Spiel geht - und
// genau dort sass eine Luecke.
//
// Der Zwischenspeicher der Gegnerbilder trug bis v147 die SAUMFARBE als
// einzige Kartenkennung im Schluessel. Die war je Karte zufaellig
// verschieden, wirkte also wie eine Kennung - und als der Saum in dieser
// Runde als toter Code ausgebaut wurde, waere daraus ein Fach fuer alle drei
// Karten geworden: jeder Gegner haette ueberall das Klima der zuerst
// gebackenen Karte getragen. Dreiundzwanzig Tore haetten gruen gemeldet.
//
// Deshalb hier eine Pruefung, die den ECHTEN Weg nimmt: dasselbe Gegnerbild
// ueber `getEnemyArt` von drei Karten holen. Drei Karten, drei verschiedene
// Bilder - sonst greift der Zwischenspeicher zu weit.
{
  globalThis.document ??= {
    createElement: (t) => { if (t !== 'canvas') throw new Error(t); return createCanvas(1, 1); },
  };
  globalThis.window ??= { devicePixelRatio: 2, innerWidth: 844, innerHeight: 390 };
  // Die native Bildklasse durchreichen, nicht nachbauen: eine eigene Klasse
  // ist fuer `drawImage` kein Bild, und der erste Anlauf brach genau daran ab.
  let offen = 0;
  globalThis.Image ??= class extends NativeImage {
    set src(v) {
      offen++;
      const fertig = () => { offen--; };
      const a = this.onload, b = this.onerror;
      this.onload = () => { fertig(); a?.(); };
      this.onerror = () => { fertig(); b?.(); };
      super.src = v;
    }
    get src() { return super.src; }
  };
  const { getEnemyArt } = await import('../src/gfx/enemyart.ts');
  const { ENEMIES } = await import('../src/data/enemies.ts');
  const ids = Object.keys(ENEMIES);
  for (const id of ids) for (const k of KARTEN) getEnemyArt(id, false, k.id);
  for (let i = 0; i < 80 && offen > 0; i++) await new Promise((r) => setTimeout(r, 40));
  await new Promise((r) => setTimeout(r, 600));
  let geprueft = 0, gleich = 0;
  for (const id of ids) {
    const summen = new Set();
    let da = 0;
    for (const k of KARTEN) {
      const cv = getEnemyArt(id, false, k.id);
      if (!cv) continue;
      da++;
      summen.add(createHash('sha1').update(cv.toBuffer('image/png')).digest('hex'));
    }
    if (da < KARTEN.length) continue;
    geprueft++;
    if (summen.size < KARTEN.length) gleich++;
  }
  console.log(`Kartenbindung: ${geprueft} Gegnerbilder ueber ${KARTEN.length} Karten geholt, `
    + `${gleich} davon mehrfach identisch.`);

  // --- Der Saumkontrast am GEBACKENEN Bild (TF-012).
  //
  // **Warum hier und nicht im Lesbarkeitstor.** Das misst die GEPACKTEN
  // Quellbilder - und das Spiel zeichnet sie nie. Zwischen Quelle und Schirm
  // liegen Farbklima, Sonnenanstrich, Bodenverschattung, Rueckwurf und seit
  // v156 das Randlicht. Eine Zahl ueber die Quelle beschreibt ein Bild, das
  // niemand sieht (Regel 12), und sie kann eine Aenderung an der Einbettung
  // gar nicht sehen - dieselbe Falle wie in v148, als die Messlatte die
  // Kartenfarbe statt der Figur rechnete.
  //
  // Und gemessen wird ueber `getEnemyArt`, nicht ueber die nachgebaute
  // Einbettung weiter unten in dieser Datei: was das Spiel zeichnet, ist die
  // Frage - nicht, was die Rechnung ergaebe.
  const kanten = [];
  for (const id of ids) {
    for (const k of KARTEN) {
      const cv = getEnemyArt(id, false, k.id);
      if (!cv) continue;
      const l = await kantenLeuchte(cv.toBuffer('image/png'));
      if (l === null) continue;
      kanten.push({ id, karte: k.id, wert: kontrast(l, await bodenLeuchte(k)) });
    }
  }
  if (kanten.length < ids.length) {
    befunde.push(`Saumkontrast: nur ${kanten.length} Messungen fuer ${ids.length} Gegnerarten `
      + `auf ${KARTEN.length} Karten - eine leere Messung besteht immer (Regel 5).`);
  } else {
    kanten.sort((a, b) => a.wert - b.wert);
    const schwach = kanten.filter((m) => m.wert < SAUM_HINWEIS);
    console.log(`\nSaumkontrast am gebackenen Bild (${kanten.length} Messungen, `
      + `Hinweis unter ${SAUM_HINWEIS}):`);
    for (const m of kanten.slice(0, 5)) {
      console.log(`  ${m.id.padEnd(12)} ${m.karte.padEnd(14)} ${m.wert.toFixed(2)}`);
    }
    console.log(`  schwaechster ${kanten[0].wert.toFixed(2)}, `
      + `${schwach.length} unter ${SAUM_HINWEIS} (Ratsche ${SAUM_RATSCHE})`);
    if (kanten[0].wert < SAUM_MIN) {
      befunde.push(`Saumkontrast: "${kanten[0].id}" auf ${kanten[0].karte} liegt bei `
        + `${kanten[0].wert.toFixed(2)}, die Ratsche steht bei ${SAUM_MIN}. Eine Silhouette, `
        + 'die in den Boden laeuft, ist keine.');
    }
    if (schwach.length > SAUM_RATSCHE) {
      befunde.push(`Saumkontrast: ${schwach.length} von ${kanten.length} Messungen liegen `
        + `unter ${SAUM_HINWEIS}, die Ratsche steht bei ${SAUM_RATSCHE}.`);
    }
  }
  if (!geprueft) {
    befunde.push('Kartenbindung: kein einziges Gegnerbild kam an - dann prueft dieser '
      + 'Abschnitt nichts.');
  } else if (gleich) {
    befunde.push(`Kartenbindung: ${gleich} von ${geprueft} Gegnern sehen auf mindestens `
      + 'zwei Karten gleich aus. Der Zwischenspeicher greift zu weit - die Figuren tragen '
      + 'das Klima der zuerst gebackenen Karte.');
  }
}

// Wieviel das FARBKLIMA allein ausmacht - gesammelt ueber alle Figuren.
const klimaWirkung = [];

for (const [name, datei, id, staerke] of FIGUREN) {
  const roh = quelle(datei, id);
  if (!roh) { befunde.push(`${name}: Bild nicht gefunden.`); continue; }
  console.log(`── ${name}`);
  for (const k of KARTEN) {
    const vorher = await kennwert(roh);
    const nachher = await kennwert(await einbetten(roh, k, staerke));
    // Dieselbe Figur, dieselbe Karte, nur ohne Klima (Regel 13).
    const ohneKlima = await kennwert(await einbettenMit(roh, k, staerke, 0));
    const abst = (v) => Math.hypot(v.ca - k.ca, v.cb - k.cb);
    const hell = (v) => Math.abs(v.hell - k.hell);
    klimaWirkung.push({ name, karte: k.id, ohne: abst(ohneKlima), mit: abst(nachher) });
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

// --- Ist wirklich JEDES Einzelobjekt gemessen worden?
//
// Die Ableitung oben schuetzt vor dem Vergessen, nicht vor dem Wegnehmen.
// Ohne diese Zeile bliebe das Tor gruen, wenn jemand einen Eintrag aus der
// Liste filtert - es maesse dann eben einen weniger und meldete weiter
// "alle Figuren liegen im Band" (Regel 5).
{
  const soll = Object.keys(OBJECT_ART).length;
  const ist = new Set(klimaWirkung.map((w) => w.name)).size;
  if (ist !== soll) {
    befunde.push(`Vollzaehligkeit: gemessen wurden ${ist} von ${soll} Einzelobjekten. `
      + 'Was der Renderer einbettet, muss dieses Tor auch pruefen.');
  }
}

// --- Was das Farbklima allein bewirkt.
{
  const n = klimaWirkung.length;
  if (!n) {
    befunde.push('Klimawirkung: keine Figur gemessen - dann prueft dieser Abschnitt nichts.');
  } else {
    const mittel = klimaWirkung.reduce((a, w) => a + (w.ohne - w.mit), 0) / n;
    const beste = [...klimaWirkung].sort((a, b) => (b.ohne - b.mit) - (a.ohne - a.mit))[0];
    console.log(`Klimawirkung: der Farbabstand sinkt im Mittel um ${mittel.toFixed(3)} `
      + `(${n} Messungen, am staerksten "${beste.name}" auf ${beste.karte}: `
      + `${beste.ohne.toFixed(2)} → ${beste.mit.toFixed(2)}). Ratsche ${KLIMA_MIN}.`);
    if (mittel < KLIMA_MIN) {
      befunde.push(`Klimawirkung: der Farbabstand sinkt nur um ${mittel.toFixed(3)}, `
        + `die Ratsche steht bei ${KLIMA_MIN}. Das Farbklima traegt nichts mehr bei - `
        + 'dann ist es ein Fuellwort und keine Einbettung.');
    }
  }
}

if (befunde.length) {
  console.error(`EINBETTUNG: ${befunde.length} Befund(e)`);
  for (const b of befunde) console.error(`  - ${b}`);
  if (TOR) process.exit(1);
} else {
  console.log('EINBETTUNG: alle Figuren liegen im Band.');
}
