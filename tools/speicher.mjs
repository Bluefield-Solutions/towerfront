#!/usr/bin/env node
/**
 * Wieviel Bildspeicher haelt das Zeichenwerk - und waechst er mit jeder
 * Karte?
 *
 * **Warum es dieses Werkzeug gibt.** Im Rueckstandsverzeichnis stand T9 als
 * "Bildpuffer bei Groessenwechsel gezielt verwerfen statt alles neu zu
 * backen". Gemessen stimmt daran nichts: der Untergrund wird in WELTMASSEN
 * gebacken und bei einem Groessenwechsel gar nicht angefasst - der kostet
 * ein bis fuenf Megabyte fuer den Himmel, mehr nicht. Und "statt alles neu
 * zu backen" setzt voraus, dass etwas verworfen wird; keine der acht
 * Ablagen hat je einen Eintrag geloescht.
 *
 * Der KARTENWECHSEL war der teure: nach vier Besuchen lagen 51,4 MB in den
 * Ablagen, und der Zuwachs hoerte nicht auf. Auf einem Telefon ist Speicher
 * die knappere Ware - genau der Grund, aus dem `spriteBytes` seit v70
 * existiert.
 *
 * Gemessen werden zwei Dinge:
 *
 *  1. **Fremde Eintraege.** Nach einem Wechsel darf keine Ablage mehr etwas
 *     von der verlassenen Karte halten. Das ist schaerfer als jede Byte-Zahl:
 *     eine Zahl kann aus vielen Gruenden klein sein, diese Liste ist nur
 *     dann leer, wenn wirklich geraeumt wurde.
 *  2. **Der Zuwachs ueber vier Kartenbesuche.** Verhaeltnis, keine feste
 *     Zahl (Regel 2): wieviel Megabyte richtig sind, sagt dieses Werkzeug
 *     nicht - das haengt an Bildern, die sich aendern duerfen. Es sagt nur,
 *     dass die vierte Karte nicht wesentlich teurer sein darf als die erste.
 *
 * **Messstelle** (Regel 12): vier Kartenbesuche (Spiralhain, Ascheschlucht,
 * Frostspalte, Spiralhain), je acht gebaute Tuerme und acht Sekunden Welle 6,
 * 844 x 390 bei doppelter Aufloesung, @napi-rs/canvas. Gerechnet wird mit
 * vier Byte je Bildpunkt - dieselbe Rechnung wie `spriteBytes`.
 *
 * Aufruf:  npm run speicher          Zahlen zeigen
 *          npm run speicher -- --tor Grenzen pruefen
 */
import { createCanvas } from '@napi-rs/canvas';

// Geruest und Bilderladen kommen aus der gemeinsamen Werkstatt - bis v189
// stand beides hier noch einmal (Regel 15).
import { geruestStellen, bilderAbwarten } from './leinwand.mjs';

geruestStellen();

const { GameState } = await import('../src/game/state.ts');
const { Renderer } = await import('../src/gfx/renderer.ts');
const { getObjectArt } = await import('../src/gfx/objectart.ts');
const { OBJECT_ART } = await import('../src/gfx/assets/objects.ts');
const { getBackground } = await import('../src/gfx/backgrounds.ts');
const { bildspeicher, bildspeicherByte, fremdeEintraege } = await import('../src/gfx/speicher.ts');
const { candidateSpots } = await import('./spots.ts');
const { TOWER_ORDER } = await import('../src/data/towers.ts');

const tor = process.argv.includes('--tor');
const probleme = [];
const MB = (b) => (b / 1048576).toFixed(2);

const flaeche = createCanvas(1688, 780);
Object.defineProperty(flaeche, 'clientWidth', { get: () => 844 });
Object.defineProperty(flaeche, 'clientHeight', { get: () => 390 });
const s = new GameState();
const r = new Renderer(flaeche);
r.menu = null;

function tuermeStellen(g, n) {
  g.gold = 100000;
  let i = 0;
  for (const sp of candidateSpots(g)) {
    if (i >= n) break;
    if (g.build(sp.x, sp.y, TOWER_ORDER[i % TOWER_ORDER.length])) i++;
  }
  g.gold = 400;
}

const besuche = ['spiralhain', 'ascheschlucht', 'frostspalte', 'spiralhain'];
const stand = [];
for (const karte of besuche) {
  s.reset(1, 'normal', karte);
  for (const k of Object.keys(OBJECT_ART)) getObjectArt(k);
  getBackground(karte);
  await bilderAbwarten();
  r.resize();
  // Eine Karte wirklich SPIELEN. Ohne Tuerme und ohne Gegner fuellen sich
  // die beiden Ablagen gar nicht, die am staerksten an der Karte haengen -
  // und die Messung uebersieht die Haelfte.
  tuermeStellen(s, 8);
  s.waveIndex = 5;
  s.startWave();
  for (let i = 0; i < 60 * 8; i++) { s.update(1 / 60); if (i % 30 === 0) r.draw(s); }
  r.draw(s);
  stand.push({ karte, byte: bildspeicherByte(), fremd: fremdeEintraege(karte) });
}

console.log('Messstelle: vier Kartenbesuche, je 8 Tuerme und 8 s Welle 6, '
  + '844 x 390 bei 2x, 4 Byte je Bildpunkt.');
console.log('');
stand.forEach((z, i) => console.log(
  `  ${(i + 1)}. ${z.karte.padEnd(15)} ${MB(z.byte).padStart(7)} MB   `
  + `${z.fremd.length} Eintrag/Eintraege fremder Karten`));
console.log('');
console.log('Was am Ende liegt:');
for (const a of bildspeicher().sort((x, y) => y.byte - x.byte)) {
  if (!a.eintraege) continue;
  console.log(`  ${a.name.padEnd(22)} ${String(a.eintraege).padStart(4)} Eintraege  ${MB(a.byte).padStart(7)} MB`);
}

// **Und die Leuchtscheiben duerfen nicht am Halbmesser haengen.**
//
// Sie haengen an keiner Karte, werden also nie geraeumt - der Kartentest oben
// sieht sie nicht. Bis v187 war ihr Schluessel Farbe PLUS Halbmesser, und
// zwei Aufrufstellen liefern einen stetigen Halbmesser: der Lichtkranz des
// Kristalls atmet und haengt an seiner Gesundheit, das Muendungsfeuer waechst
// mit dem Blitz. Jeder gerundete Zwischenwert bekam eine eigene Scheibe - 48
// Stueck und bis zu 13 MB, ein Drittel des gesamten Bildspeichers.
//
// **Der erste Entwurf dieser Pruefung spielte eine Minute und zaehlte
// nach.** Das dauerte allein laenger als die halbe Torkette und sagte die
// Sache nur mittelbar. Gefragt ist nicht "waechst es in einer Minute",
// sondern "haengt es ueberhaupt am Halbmesser" - und das ist in zwei Zeilen
// zu beantworten: zwei sehr verschiedene Halbmesser muessen DIESELBE Scheibe
// liefern, nicht nur eine gleich grosse.
{
  const { getGlowDisc } = await import('../src/gfx/glow.ts');
  const klein = getGlowDisc('#7FE7E0', 24);
  const gross = getGlowDisc('#7FE7E0', 208);
  console.log('');
  console.log(`Leuchtscheibe bei Halbmesser 24 und 208: ${klein === gross ? 'dieselbe' : 'zwei verschiedene'}`);
  if (klein !== gross) {
    probleme.push('Die Leuchtscheiben haengen wieder am Halbmesser: 24 und 208 liefern '
      + 'zwei verschiedene. Zwei Aufrufstellen im Renderer geben einen STETIGEN '
      + 'Halbmesser weiter - damit waechst die Ablage mit der Spielzeit, und sie '
      + 'wird nie geraeumt. Die Scheibe ist selbstaehnlich; sie in Zielgroesse zu '
      + 'backen bringt nichts, weil sie ohnehin gestreckt gezeichnet wird.');
  }
}

// **Die Ablagen namentlich, nicht nur ihre Summe.**
//
// Die erste Fassung dieses Tors mass nur Byte - und die Gegenprobe "eine
// Ablage meldet sich nicht mehr an" ging glatt durch: eine Ablage, die sich
// abmeldet, wird auch nicht mehr GEZAEHLT. Der Faktor fiel von 1,51 auf
// 1,46, das Tor meldete gruen, und der Speicher waere still gewachsen.
// Genau die Verfallsart aus Regel 5, nur an einer Messstelle statt an einer
// Probe. Deshalb steht hier eine Namensliste: sie ist eine Ratsche, kein
// Soll - wer eine Ablage dazunimmt, traegt sie nach.
const ERWARTET = ['Sprites', 'Leuchtscheiben', 'Stimmung', 'Bodennebel',
  'Objekte eingebettet', 'Türme eingebettet', 'Gegner eingebettet', 'Gegner vereist'];
const gemeldet = new Set(bildspeicher().map((a) => a.name));
const fehlend = ERWARTET.filter((n) => !gemeldet.has(n));
console.log('');
console.log(`Angemeldete Ablagen: ${gemeldet.size} von ${ERWARTET.length} erwarteten`);
if (fehlend.length) {
  probleme.push(`Diese Ablagen melden sich nicht mehr an: ${fehlend.join(', ')}. `
    + 'Was nicht angemeldet ist, wird weder gezaehlt noch geraeumt - und faellt '
    + 'deshalb durch jede Byte-Zahl hindurch.');
}

const letzte = stand[stand.length - 1];
if (letzte.fremd.length) {
  const bsp = letzte.fremd.slice(0, 3).map((f) => `${f.ablage}: ${f.schluessel}`).join(' , ');
  probleme.push(`Nach dem Wechsel liegen noch ${letzte.fremd.length} Eintraege fremder `
    + `Karten in den Ablagen (z. B. ${bsp}). Es wird nicht geraeumt.`);
}

// Der Boden kommt aus der Gegenprobe, nicht aus dem Bauch (Regel 13): ohne
// Raeumen steigt das Verhaeltnis auf 3,31, mit Raeumen liegt es bei 1,51.
// 1,8 trennt beide Faelle mit Luft nach beiden Seiten.
const ZUWACHS = 1.8;
const verhaeltnis = letzte.byte / stand[0].byte;
console.log('');
console.log(`Vierter Besuch gegen ersten: Faktor ${verhaeltnis.toFixed(2)} `
  + `(erlaubt ${ZUWACHS.toFixed(1)}; ohne Raeumen sind es 3,31)`);
if (verhaeltnis > ZUWACHS) {
  probleme.push(`Der Bildspeicher waechst mit jeder Karte: nach vier Besuchen das `
    + `${verhaeltnis.toFixed(2)}-fache des ersten, erlaubt ist das ${ZUWACHS.toFixed(1)}-fache.`);
}

console.log('');
if (!tor) {
  console.log('SPEICHER: gemessen (kein Tor). Mit --tor werden die Grenzen geprueft.');
} else if (probleme.length) {
  console.log(`SPEICHER: ${probleme.length} Problem(e)`);
  probleme.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
} else {
  console.log('SPEICHER: der Bildspeicher waechst nicht mit der Zahl der Karten.');
}
