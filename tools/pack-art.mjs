#!/usr/bin/env node
/**
 * Bildwerkzeug — aus gelieferten Rohbildern werden eingebettete Spielbilder.
 *
 * Dreimal habe ich das von Hand gemacht (Untergründe, Türme, Gegner), und
 * dreimal ist dabei etwas schiefgegangen, das man hätte prüfen können:
 * abgeschnittene Reste am Bildrand, die beim Zuschneiden das eigentliche
 * Objekt schrumpfen ließen; uneinheitliche Standlinien, sodass ein Turm
 * schwebte und der nächste versank; und ein Größenbudget, das erst auffiel,
 * als die Datei schon gewachsen war.
 *
 * Dieses Werkzeug macht daraus einen reproduzierbaren Schritt. Es liest eine
 * Beschreibung (art/<gruppe>.json), verarbeitet die Rohbilder und schreibt ein
 * TypeScript-Modul mit Datenadressen. Nichts davon geschieht mehr von Hand.
 *
 * Aufruf:
 *   npm run pack-art                 alle Gruppen
 *   npm run pack-art -- tuerme       nur eine Gruppe
 *   npm run pack-art -- --check      nur prüfen, nichts schreiben
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'art');
const OUT = join(ROOT, 'src', 'gfx', 'assets');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
/** Erzwingt das Neuerzeugen, auch wenn der Abdruck stimmt. */
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

/** Abdruck über Beschreibung und Rohbilder.
 *
 *  Die Prüfung kostete 62 Sekunden je Lauf - mehr als die Hälfte der gesamten
 *  Torkette - nur um festzustellen, dass sich nichts geändert hat. Sie
 *  dekodierte und komprimierte dafür 22 Bilder neu.
 *
 *  Jetzt steht der Abdruck im erzeugten Modul. Stimmt er, ist nichts zu tun.
 *  Der Abdruck geht über die Beschreibung *und* jede Rohdatei - ändert sich
 *  eine Zahl in der JSON oder ein Bild auf der Platte, fällt es auf. */
function fingerprint(spec, srcDir) {
  const h = createHash('sha256');
  // **`budgetKb` gehoert NICHT dazu.**
  //
  // Der Abdruck soll decken, was das ERGEBNIS bestimmt. Das Budget bestimmt
  // es nicht: es wird hinterher mit der Summe verglichen und beruehrt keine
  // einzige Bildzeile. Solange es mitzaehlte, erzwang jede Korrektur der
  // Obergrenze ein vollstaendiges Neupacken - rund eine Minute Rechnen und
  // ein Commit ueber alle Bildmodule, um am Ende dieselben Bytes zu
  // erzeugen. Aufgefallen ist es in v185, als die Gruppenbudgets von
  // Fantasiewerten auf gemessene gesetzt wurden.
  const { budgetKb, ...bestimmend } = spec;
  void budgetKb;
  h.update(JSON.stringify(bestimmend));
  for (const [key, entry] of Object.entries(spec.items)) {
    const file = typeof entry === 'string' ? entry : entry.file;
    const p = join(srcDir, file);
    h.update(key);
    h.update(existsSync(p) ? readFileSync(p) : 'fehlt');
  }
  return h.digest('hex').slice(0, 32);
}

const STAMP = '// abdruck:';

/** Zusammenhängende Bereiche im Alphakanal finden.
 *
 *  Mehrere Lieferungen enthielten neben dem eigentlichen Objekt noch
 *  abgeschnittene Reste am Bildrand. Ohne diesen Schritt bestimmt der Rest die
 *  Bildgrenze, und das Objekt wird beim Skalieren winzig. */
function largestBlob(data, w, h, alphaAt) {
  const seen = new Int32Array(w * h);
  let best = { id: 0, size: 0 };
  let id = 0;
  const stack = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || alphaAt(data, i) <= 24) continue;
    id++;
    let top = 0, size = 0;
    stack[top++] = i;
    seen[i] = id;
    while (top > 0) {
      const p = stack[--top];
      size++;
      const px = p % w, py = (p / w) | 0;
      if (px > 0) { const n = p - 1; if (!seen[n] && alphaAt(data, n) > 24) { seen[n] = id; stack[top++] = n; } }
      if (px < w - 1) { const n = p + 1; if (!seen[n] && alphaAt(data, n) > 24) { seen[n] = id; stack[top++] = n; } }
      if (py > 0) { const n = p - w; if (!seen[n] && alphaAt(data, n) > 24) { seen[n] = id; stack[top++] = n; } }
      if (py < h - 1) { const n = p + w; if (!seen[n] && alphaAt(data, n) > 24) { seen[n] = id; stack[top++] = n; } }
    }
    if (size > best.size) best = { id, size };
  }
  return { seen, best, count: id };
}

/** Ein Hintergrundbild: kein Freistellen, kein Zuschneiden, keine Standlinie -
 *  nur auf Zielgroesse bringen und komprimieren. Das Seitenverhaeltnis muss
 *  exakt dem Spielfeld entsprechen, sonst passt das Raster nicht. */
async function processBackground(srcPath, spec) {
  const meta = await sharp(srcPath).metadata();
  const want = (spec.width ?? 2000) / (spec.height ?? 1100);
  const have = meta.width / meta.height;
  const notes = [];
  // Abweichende Verhaeltnisse werden mittig beschnitten statt abgelehnt.
  //
  // Vorher brach das Werkzeug ab. Das war richtig, solange alle Bilder aus
  // einer Bestellung kamen; sobald aber Bilder aus verschiedenen Quellen
  // eintreffen, ist ein Zuschnitt die bessere Antwort als eine Verweigerung -
  // ein Prozent Unterschied sieht niemand, eine fehlende Karte schon.
  if (Math.abs(have / want - 1) > 0.12) {
    throw new Error(
      `Seitenverhaeltnis ${have.toFixed(3)} statt ${want.toFixed(3)} ` +
      `(${meta.width}x${meta.height}) - zu weit weg, das laesst sich nicht zuschneiden.`,
    );
  }
  if (Math.abs(have / want - 1) > 0.005) {
    notes.push(`zugeschnitten von ${have.toFixed(3)}`);
  }
  // --- Auf Tageslicht bringen.
  //
  // Das Zielbild hat einen Boden mit Helligkeit 0,33 und Saettigung 0,51 -
  // eine Mittagsszene. Unsere Untergruende lagen bei 0,13 bis 0,27: eine
  // Nachtszene. Das war der groesste einzelne Abstand im Grafik-Audit, und
  // er laesst sich an den vorhandenen Fotos zu einem guten Teil schliessen.
  //
  // `helligkeit` hebt linear an, `waerme` verschiebt zum Ocker hin,
  // `farbe` saettigt nach. In dieser Reihenfolge, sonst kippt der Farbton.
  let bild = sharp(srcPath)
    .resize(spec.width ?? 2400, spec.height ?? 1350, { fit: 'cover', position: 'centre' });

  if (spec.helligkeit || spec.farbe) {
    bild = bild.modulate({
      brightness: spec.helligkeit ?? 1,
      saturation: spec.farbe ?? 1,
    });
  }
  // Ein zu unruhiger Boden verschluckt die Einheiten. Die Laubschlucht kam
  // mit Detaildichte 11,2 an - gemessen das Vierfache des Zielwerts. Eine
  // leichte Weichzeichnung bringt sie in den Rahmen, ohne die Formen zu
  // verlieren; beim Untergrund ist das anders als bei Figuren unbedenklich,
  // er soll ohnehin zuruecktreten.
  if (spec.weich) bild = bild.blur(spec.weich);

  if (spec.waerme) {
    // Rot leicht hoch, Blau leicht herunter - das ist Sonnenlicht.
    const w = spec.waerme;
    bild = bild.linear([1 + w * 0.18, 1 + w * 0.05, 1 - w * 0.12], [0, 0, 0]);
  }

  const buffer = await bild
    .webp({ quality: spec.quality ?? 60, effort: 6 })
    .toBuffer();
  return { buffer, notes, touches: [], from: `${meta.width}x${meta.height}`, crop: '-' };
}

/** Ein Rohbild in ein Spielbild verwandeln. */
async function processOne(srcPath, spec, group) {
  const notes = [];
  let img = sharp(srcPath).ensureAlpha();
  const meta = await img.metadata();

  // Einfarbiger Hintergrund (Magenta oder Weiß) wird zu Transparenz.
  if (spec.keyColour) {
    const [kr, kg, kb] = spec.keyColour;
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const tol = spec.keyTolerance ?? 40;
    for (let i = 0; i < info.width * info.height; i++) {
      const o = i * 4;
      const d = Math.abs(data[o] - kr) + Math.abs(data[o + 1] - kg) + Math.abs(data[o + 2] - kb);
      if (d < tol * 3) data[o + 3] = 0;
    }
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
    notes.push('freigestellt');
  }

  // Nur den größten zusammenhängenden Bereich behalten.
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (d, i) => d[i * 4 + 3];
  const { seen, best, count } = largestBlob(data, info.width, info.height, alphaAt);
  if (best.size === 0) throw new Error('vollständig transparent');
  if (count > 1) {
    for (let i = 0; i < info.width * info.height; i++) {
      if (seen[i] !== best.id) data[i * 4 + 3] = 0;
    }
    notes.push(`${count - 1} Rest(e) entfernt`);
  }

  // Zuschneiden auf den verbliebenen Bereich.
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let i = 0; i < info.width * info.height; i++) {
    if (seen[i] !== best.id) continue;
    const x = i % info.width, y = (i / info.width) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const cropW = maxX - minX + 1, cropH = maxY - minY + 1;

  // Berührt das Objekt den Bildrand, ist es angeschnitten - das lässt sich
  // nicht reparieren, nur melden.
  //
  // Aber nicht jede Berührung ist ein Anschnitt. Eine einzelne Turmspitze,
  // die den oberen Rand streift, kostet nichts; eine Kante, die über ein
  // Zehntel der Bildbreite anliegt, ist abgeschnittenes Objekt. Vorher galt
  // beides gleich, und eine gute Lieferung wurde abgelehnt.
  // Ist das Bild ueberhaupt freigestellt?
  //
  // Die sechs Ausbaustufen des Bogenturms sahen im Betrachter transparent aus
  // und hatten einen weissen Hintergrund mit voller Deckung. Das faellt erst
  // auf, wenn man die Werte liest - oder wenn das Bild im Spiel als weisser
  // Kasten steht. Geprueft wird die aeusserste Zeile: dort gehoert nichts hin.
  {
    let deckend = 0, ges = 0, hell = 0;
    for (let x = 0; x < info.width; x++) {
      for (const y of [0, info.height - 1]) {
        const i = (y * info.width + x) * 4;
        ges++;
        if (data[i + 3] < 150) continue;
        deckend++;
        if (data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232) hell++;
      }
    }
    if (deckend > ges * 0.5 && hell > deckend * 0.7) {
      throw new Error(
        `nicht freigestellt - ${Math.round((deckend / ges) * 100)} % der obersten und untersten ` +
        'Zeile sind deckend und fast weiss. Erst "node tools/freistellen.mjs" laufen lassen.',
      );
    }
  }

  const anteilRand = (test) => {
    let n = 0, ges = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const x = i % info.width, y = (i / info.width) | 0;
      if (!test(x, y)) continue;
      ges++;
      // Deckend, nicht nur angehaucht: ein weicher Schein um den Turm ist
      // kein Objekt am Rand. Mit einer Schwelle von 24 zaehlte er mit und
      // meldete 67 Prozent, wo eine einzelne Spitze anlag.
      if (data[i * 4 + 3] >= 150) n++;
    }
    return ges ? n / ges : 0;
  };
  // Elf Prozent an einer Kante ist noch ein breiter Turmfuss, kein
  // Anschnitt. Gemessen an der Lieferung: der auffaellig angeschnittene Fall
  // lag bei zwei Dritteln.
  const GRENZE = 0.16;
  const touches = [];
  const knapp = [];
  const kanten = [
    ['links',  (x) => x <= 1],
    ['oben',   (_x, y) => y <= 1],
    ['rechts', (x) => x >= info.width - 2],
    ['unten',  (_x, y) => y >= info.height - 2],
  ];
  for (const [name, test] of kanten) {
    const anteil = anteilRand(test);
    if (anteil > GRENZE) touches.push(`${name} ${Math.round(anteil * 100)} %`);
    else if (anteil > 0) knapp.push(name);
  }
  // Ein bewusst hingenommener Anschnitt.
  //
  // Die Grenze zu verschieben, damit ein einzelnes Bild durchkommt, waere der
  // falsche Weg - dann faellt der naechste echte Fall auch nicht mehr auf.
  // Stattdessen wird das Bild namentlich ausgenommen, und im Kommentar steht,
  // warum. So bleibt die Regel scharf und die Ausnahme sichtbar.
  if (spec.randOk && touches.length) {
    notes.push(`Anschnitt hingenommen (${touches.join(', ')})`);
    touches.length = 0;
  }
  if (knapp.length) notes.push(`streift ${knapp.join('/')}`);

  const cropped = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH });

  // Auf Zielbreite bringen und auf die gemeinsame Standlinie setzen.
  const size = spec.size ?? 256;
  // Nach der laengeren Seite einpassen, nicht nach der Breite.
  //
  // Vorher wurde nur die Breite gesetzt und die Hoehe folgte dem
  // Seitenverhaeltnis - bei einem hohen, schmalen Turm lief das Bild oben aus
  // der Kachel heraus, und die Bildbibliothek brach ab. Betroffen war jedes
  // Bild, das hoeher als breit ist; die gelieferten Tuerme sind es alle.
  const platz = size * (spec.fill ?? 0.8);
  const k = Math.min(platz / cropW, platz / cropH);
  const targetW = Math.max(1, Math.round(cropW * k));
  const targetH = Math.max(1, Math.round(cropH * k));
  // Aufsichten werden mittig gesetzt, nicht auf eine Standlinie.
  //
  // Eine Seitenansicht steht auf dem Boden, also zaehlt ihre Unterkante. Eine
  // Aufsicht wird im Spiel gedreht, und gedreht wird um die Bildmitte - liegt
  // die Figur nicht dort, eiert sie beim Drehen um einen Punkt neben sich.
  const baseline = Math.round(size * (spec.baseline ?? 0.84));
  const top = spec.center
    ? Math.round((size - targetH) / 2)
    : Math.max(0, baseline - targetH);
  const left = Math.round((size - targetW) / 2);

  let skaliert = cropped.resize(targetW, targetH, { fit: 'fill' });

  // --- Sofortmassnahmen aus dem Grafik-Audit.
  //
  // Gemessen am Zielbild: dessen Tuerme haben eine Detaildichte von 3,4, die
  // unseren 12 bis 22. Der Unterschied ist kein Inhalt, sondern Koernung -
  // kleingerechnete, komprimierte Renderings rauschen. Eine milde
  // Weichzeichnung bringt den Koloss von 13,5 auf 6,3, und die Form bleibt
  // vollstaendig erhalten. Das Staffeln der Werte tut das *nicht*, siehe den
  // Warnkasten in tools/style.mjs.
  const entrauschen = spec.entrauschen ?? 0;
  if (entrauschen > 0) skaliert = skaliert.blur(entrauschen);

  let scaled = await skaliert.png().toBuffer();

  // Reines Schwarz frisst Loecher in die Form. Das Zielbild hat 1,3 Prozent
  // davon, wir 5 bis 15. Angehoben wird nur die dunkelste Zone, damit die
  // Zeichnung darueber unangetastet bleibt.
  const schwarzHeben = spec.schwarzHeben ?? 0;
  if (schwarzHeben > 0) {
    const { data: d, info: di } = await sharp(scaled).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    const boden = Math.round(schwarzHeben * 255);
    for (let i = 0; i < di.width * di.height; i++) {
      if (d[i * 4 + 3] < 8) continue;
      for (let c = 0; c < 3; c++) {
        // Der dunkelste Ton wird angehoben, ein heller bleibt, wo er ist.
        d[i * 4 + c] = Math.round(boden + d[i * 4 + c] * (1 - boden / 255));
      }
    }
    scaled = await sharp(d, { raw: { width: di.width, height: di.height, channels: 4 } })
      .png().toBuffer();
  }

  // Das Anheben des Schwarz waescht die Farbe aus - gemessen fiel die
  // Saettigung von 0,32 auf 0,15. Sie wird deshalb danach wieder angehoben,
  // nicht davor: vorher waere sie beim Anheben gleich wieder verloren.
  const farbe = spec.farbe ?? 1;
  const hell = spec.helligkeit ?? 1;
  if (farbe !== 1 || hell !== 1) {
    scaled = await sharp(scaled)
      .modulate({ saturation: farbe, brightness: hell })
      .png().toBuffer();
  }
  const out = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: scaled, left, top }])
    .webp({ quality: spec.quality ?? 82, effort: 6 })
    .toBuffer();

  return {
    buffer: out,
    notes,
    touches,
    from: `${meta.width}x${meta.height}`,
    crop: `${cropW}x${cropH}`,
  };
}

/** Ein ganzes Bündel verarbeiten und als TypeScript-Modul schreiben. */
async function packGroup(name, umgebung = {}) {
  // `umgebung` ist NUR fuer den Selbsttest da. Der normale Aufruf laesst sie
  // weg und arbeitet auf den echten Verzeichnissen - das Werkzeug prueft sich
  // also mit demselben Weg, den es sonst geht, und nicht mit einer zweiten
  // Fassung daneben. Vier Mal hat in diesem Projekt schon ein Werkzeug die
  // Regel nachgebaut statt sie zu benutzen, und vier Mal war genau dort die
  // Luecke.
  const artDir = umgebung.art ?? ART;
  const outDir = umgebung.out ?? OUT;
  // Der Selbsttest schreibt immer - er prueft ja gerade das Ergebnis. Ohne
  // das erbte er den --check-Modus des aeusseren Aufrufs und meldete
  // "passt nicht mehr zu den Rohbildern", statt zu packen.
  const nurPruefen = umgebung.schreiben ? false : checkOnly;
  const specPath = join(artDir, `${name}.json`);
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const srcDir = join(artDir, spec.source);
  const rows = [];
  let total = 0;
  const problems = [];
  const uebersprungen = [];

  /** Steht der Schluessel schon gepackt im Quelltext? */
  const fertigVorhanden = (spec, key) => {
    const ziel = join(outDir, spec.output ?? '');
    if (!spec.output || !existsSync(ziel)) return false;
    return readFileSync(ziel, 'utf8').includes(`'${key}':`);
  };

  /** Die schon gepackte Fassung eines Eintrags, falls es sie gibt.
   *
   *  Sie wird gebraucht, wenn nur EINIGE Rohbilder nachgeliefert werden: die
   *  uebrigen Eintraege muessen unveraendert im Buendel bleiben. Ohne das
   *  waere jede Teillieferung ein Datenverlust. */
  const fertigeFassung = (spec, key) => {
    const ziel = join(outDir, spec.output ?? '');
    if (!spec.output || !existsSync(ziel)) return null;
    const m = new RegExp(`'${key}': 'data:image/webp;base64,([^']+)'`)
      .exec(readFileSync(ziel, 'utf8'));
    return m ? Buffer.from(m[1], 'base64') : null;
  };

  // Ein Buendel wird nie geleert.
  //
  // Beim Probelauf ohne art/roh hat dieses Werkzeug alle vier Buendel mit
  // einer leeren Liste ueberschrieben - 1,2 MB gepackte Bilder waren weg, und
  // nur weil sie eingecheckt waren, liessen sie sich zurueckholen. Fehlen alle
  // Quellen, ist die richtige Antwort: nichts tun.
  if (!existsSync(srcDir) || readdirSync(srcDir).filter((f) => f.endsWith('.png')).length === 0) {
    console.log(`  ${name}: keine Rohbilder da, gepackte Fassung bleibt unangetastet.`);
    return [];
  }

  const stamp = fingerprint(spec, srcDir);
  const target = join(outDir, spec.output);
  const existing = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const stampLine = `${STAMP}${stamp}`;
  if (existing.includes(stampLine) && !force) {
    console.log(`  unverändert (Abdruck ${stamp.slice(0, 8)}) - nichts zu tun.`);
    return [];
  }

  for (const [key, entry] of Object.entries(spec.items)) {
    const file = typeof entry === 'string' ? entry : entry.file;
    const item = { ...spec.defaults, ...(typeof entry === 'string' ? {} : entry) };
    const srcPath = join(srcDir, file);
    if (!existsSync(srcPath)) {
      // Fehlt das Rohbild, ist das nur dann ein Fehler, wenn auch die
      // gepackte Fassung fehlt.
      //
      // Seit dem Umzug liegen die Rohbilder nicht mehr in Git (79 MB gegen
      // 1,2 MB gepackt). Auf einem frischen Klon gibt es sie also nicht -
      // gebraucht werden sie aber nur, um NEU zu packen. Das Ergebnis steht
      // eingecheckt in src/gfx/assets/ und reicht zum Bauen und Spielen
      // vollstaendig aus.
      //
      // Ohne diese Ausnahme scheiterte die Torkette auf jedem frischen Klon,
      // obwohl alles vorhanden war, was das Spiel braucht.
      //
      // **Und die gepackte Fassung wird MITGENOMMEN, nicht nur uebersprungen.**
      //
      // Bis v157 stand hier nur `continue`. Wer ein einzelnes Bild
      // nachlieferte, bekam ein Buendel, das NUR dieses eine enthielt - beim
      // Durchstich mit drei neuen Gegnern fielen die uebrigen fuenf still
      // heraus, und `npm run art` meldete gruen dazu.
      //
      // Es ist dieselbe Klasse Fehler, die weiter oben schon einmal 1,2 MB
      // gekostet hat ("Ein Buendel wird nie geleert"). Repariert wurde damals
      // der Fall, der eingetreten war - ALLE Quellen fehlen -, nicht die
      // Klasse: EINIGE fehlen.
      const alt = fertigeFassung(spec, key);
      if (alt) {
        uebersprungen.push(key);
        rows.push({ key, buffer: alt, uebernommen: true });
        continue;
      }
      problems.push(`${key}: Datei ${file} fehlt, und es gibt keine gepackte Fassung.`);
      continue;
    }
    try {
      const r = spec.mode === 'background'
        ? await processBackground(srcPath, item)
        : await processOne(srcPath, item, name);
      total += r.buffer.length;
      rows.push({ key, buffer: r.buffer });
      const warn = r.touches.length ? `  ANGESCHNITTEN: ${r.touches.join(',')}` : '';
      console.log(
        `  ${key.padEnd(18)} ${file.padEnd(30)} ${r.from} -> ${r.crop} ` +
        `${(r.buffer.length / 1024).toFixed(0).padStart(4)} KB` +
        `${r.notes.length ? '  [' + r.notes.join(', ') + ']' : ''}${warn}`,
      );
      if (r.touches.length) {
        problems.push(`${key}: Objekt berührt den Bildrand (${r.touches.join(', ')}) - angeschnitten.`);
      }
    } catch (e) {
      problems.push(`${key}: ${e.message}`);
    }
  }

  // Vollzaehligkeit ansagen. Eine Teillieferung ist erlaubt - aber sie soll
  // dastehen, nicht stillschweigend geschehen.
  const soll = Object.keys(spec.items).length;
  const neu = rows.filter((r) => !r.uebernommen).length;
  if (neu < soll) {
    console.log(`  ${neu} von ${soll} Eintraegen neu gepackt, `
      + `${rows.length - neu} aus der bestehenden Fassung uebernommen.`);
  }
  if (rows.length < soll) {
    problems.push(`Gruppe "${name}": nur ${rows.length} von ${soll} Eintraegen im Buendel - `
      + `${soll - rows.length} haben weder ein Rohbild noch eine gepackte Fassung.`);
  }

  const budget = (spec.budgetKb ?? 400) * 1024;
  console.log(
    `  Summe ${(total / 1024).toFixed(0)} KB von ${(budget / 1024).toFixed(0)} KB erlaubt` +
    ` (eingebettet rund ${(total * 1.34 / 1024).toFixed(0)} KB)`,
  );
  if (total > budget) problems.push(`Gruppe "${name}": ${(total / 1024).toFixed(0)} KB über dem Budget.`);

  const lines = [`/** ${spec.comment ?? name}`, ' *',
    ` *  Erzeugt von tools/pack-art.mjs aus art/${name}.json - nicht von Hand`,
    ' *  bearbeiten. Neu erzeugen mit: npm run pack-art', ' */', ''];
  lines.push(`export const ${spec.exportName}: Record<string, string> = {`);
  for (const r of rows) {
    lines.push(`  '${r.key}': 'data:image/webp;base64,${r.buffer.toString('base64')}',`);
  }
  lines.push('};', '');
  lines.push(stampLine, '');
  const text = lines.join('\n');

  if (nurPruefen) {
    // Frischepruefung: das eingebettete Modul muss zu den Rohbildern passen.
    // Sonst liegt im Spiel eine Fassung, die niemand mehr nachvollziehen kann -
    // etwa weil jemand von Hand nachgebessert hat.
    if (!problems.length) {
      const have = existing;
      if (have !== text) {
        problems.push(
          `Gruppe "${name}": ${spec.output} passt nicht mehr zu den Rohbildern - ` +
          'neu erzeugen mit "npm run pack-art".',
        );
      } else {
        console.log('  Modul ist auf dem Stand der Rohbilder.');
      }
    }
  } else if (!problems.length) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(target, text);
    console.log(`  geschrieben: ${outDir === OUT ? 'src/gfx/assets' : outDir}/${spec.output}`);
  }
  return problems;
}

/** Selbsttest: eine Teillieferung darf das Buendel nicht leeren.
 *
 *  **Warum es diesen Test ueberhaupt gibt.** `art/roh/` liegt seit dem Umzug
 *  nicht mehr in Git. Auf einem frischen Klon, im Ablaufplan und in jeder
 *  Gegenprobe gibt es also KEIN einziges Rohbild - und ohne Rohbild laeuft
 *  der Packweg gar nicht erst an. Der schwerste Fehler, den dieses Werkzeug
 *  machen kann, waere damit von keinem Tor zu erreichen: er hat schon einmal
 *  1,2 MB gepackte Bilder geloescht, und in v157 haette er beim Durchstich
 *  fuenf von acht Gegnern still verschwinden lassen, waehrend `npm run art`
 *  gruen meldete.
 *
 *  Deshalb baut sich der Test seine eigene kleine Welt: zwei Eintraege im
 *  Buendel, aber nur EIN Rohbild. Danach muessen beide noch da sein.
 *
 *  Gefahren wird der ECHTE `packGroup`, nur auf anderen Verzeichnissen -
 *  keine nachgebaute Fassung (Regel: vier Mal hat ein Werkzeug in diesem
 *  Projekt die Regel nachgebaut statt sie zu benutzen). */
async function selbsttest() {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const wurzel = mkdtempSync(join(tmpdir(), 'packart-'));
  const art = join(wurzel, 'art'), out = join(wurzel, 'out');
  const roh = join(art, 'roh');
  mkdirSync(roh, { recursive: true });
  mkdirSync(out, { recursive: true });

  // Ein winziges Rohbild - ein Fleck, der den Rand nicht beruehrt.
  const bild = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{
    input: await sharp({
      create: { width: 24, height: 24, channels: 4, background: { r: 90, g: 120, b: 70, alpha: 1 } },
    }).png().toBuffer(),
    left: 20, top: 20,
  }]).png().toBuffer();
  writeFileSync(join(roh, 'eins.png'), bild);

  writeFileSync(join(art, 'probe.json'), JSON.stringify({
    source: 'roh', output: 'probe.ts', exportName: 'PROBE_ART', budgetKb: 100,
    defaults: { size: 64, fill: 0.5, quality: 70 },
    items: { eins: { file: 'eins.png' }, zwei: { file: 'zwei.png' } },
  }));
  // Das Buendel enthaelt beide - "zwei" hat kein Rohbild und muss ueberleben.
  const altB64 = bild.toString('base64');
  writeFileSync(join(out, 'probe.ts'),
    `export const PROBE_ART: Record<string, string> = {\n`
    + `  'eins': 'data:image/webp;base64,${altB64}',\n`
    + `  'zwei': 'data:image/webp;base64,${altB64}',\n};\n`);

  const laut = console.log;
  console.log = () => { /* der Selbsttest meldet sich mit einer Zeile, nicht mit einer Gruppe */ };
  let probleme;
  try { probleme = await packGroup('probe', { art, out, schreiben: true }); }
  finally { console.log = laut; }
  const danach = readFileSync(join(out, 'probe.ts'), 'utf8');
  const drin = [...danach.matchAll(/'(\w+)': 'data:image/g)].map((m) => m[1]);
  rmSync(wurzel, { recursive: true, force: true });

  const fehler = [];
  if (probleme.length) fehler.push(`packGroup meldete: ${probleme.join('; ')}`);
  if (!drin.includes('eins')) fehler.push('der neu gepackte Eintrag fehlt im Buendel.');
  if (!drin.includes('zwei')) {
    fehler.push('der Eintrag OHNE Rohbild ist aus dem Buendel gefallen - eine '
      + 'Teillieferung loescht damit alles, was nicht mitgeliefert wurde.');
  }
  if (fehler.length) {
    console.error('\nSELBSTTEST: Teillieferung leert das Buendel');
    for (const f of fehler) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`  Selbsttest: Teillieferung haelt beide Eintraege (${drin.join(', ')}).`);
}

const groups = only.length
  ? only
  : readdirSync(ART).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

await selbsttest();

let allProblems = [];
for (const g of groups) {
  console.log(`\nGruppe "${g}":`);
  allProblems = allProblems.concat(await packGroup(g));
}

if (allProblems.length) {
  console.error(`\nBILDWERKZEUG: ${allProblems.length} Problem(e)`);
  for (const p of allProblems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nBILDWERKZEUG: alle Bilder verarbeitet.');
