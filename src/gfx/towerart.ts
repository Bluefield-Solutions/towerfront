import { TOWER_ART } from './assets/towers';
import { accentFor, TOWERS, type BranchIndex, type TowerId } from '../data/towers';
import { hexA } from './glow';
import { einbetten, einbettungSchluessel } from './einbettung';

/** Gerenderte Turmbilder.
 *
 *  Zwoelf Zustaende: Stufe 1 je Turmsorte und die Endstufe je Zweig. Stufe 2
 *  bekommt dasselbe Bild wie Stufe 3, nur etwas kleiner - so ist der Ausbau
 *  sichtbar, ohne dass zwoelf weitere Bilder noetig waeren.
 *
 *  Zwei Dinge passieren hier zusaetzlich:
 *
 *  Erstens werden die Bilder eingefaerbt. Alle zwoelf kommen aus derselben
 *  Familie - dunkler Stein mit Glut - und waeren im Feld nicht zu
 *  unterscheiden. Die Zweigfarbe wird deshalb ueber die Silhouette gelegt.
 *
 *  Zweitens bekommen sie eine helle Kante. Auf dem dunklen Untergrundbild
 *  verschwaende ein dunkler Turm sonst schlicht. */
// Der Saum ist weg (v147), und der Grund gehoert aufgeschrieben.
//
// `drawRim` stammte aus v33 und war die richtige Antwort auf ein anderes
// Problem: dunkle, gerenderte Figuren auf einem dunklen Waldfoto - elf von
// zwoelf lagen im selben Helligkeitsband wie der Boden und waren nur an
// ihrem Saum zu erkennen. Mit den neuen Bildern wurde daraus ein Fehler: man
// sah weisse Umrandungen um jeden Turm und jeden Gegner.
//
// Abgeschaltet wurde er deshalb ueber zwei Listen - `OHNE_SAUM` fuer Tuerme,
// `topdown` fuer Gegner. Beide waren VOLLSTAENDIG: alle vier Turmarten
// standen in OHNE_SAUM, alle acht Gegner tragen `topdown: true`. Damit war
// die Funktion seit Fassungen unerreichbar, und mit ihr `palette.rim`, das
// nur sie las.
//
// Bemerkt hat das niemand, weil das Lesbarkeitstor die Saumfarbe weiter
// gegen den Boden rechnete: zwanzigmal dieselbe Zahl (8,43) gegen eine
// Grenze von 3,0. Eine gruene Meldung ueber eine Farbe, die kein Bildpunkt
// je trug. Seit v147 misst es den aeussersten Ring der Figur selbst.

/** Wie stark ein Bild eingefaerbt wird.
 *
 *  Die alten Turmbilder kamen alle aus derselben Familie - dunkler Stein mit
 *  Glut - und waren im Feld nicht zu unterscheiden. Deshalb wurde die
 *  Zweigfarbe mit 38 Prozent darueber gelegt, dazu ein Lichtverlauf von oben
 *  links, der ihnen Koerper gab.
 *
 *  Die neuen Bilder brauchen beides nicht: sie haben eigene Farben und ihr
 *  eigenes Licht. Der starke Farbschleier verwaescht sie, und der Verlauf
 *  legt ein zweites Licht ueber das schon vorhandene. Geblieben ist ein
 *  Hauch Farbe, damit man den Ausbauzweig noch ablesen kann. */
// Bis v147 stand hier eine Fallunterscheidung: neue Bilder bekamen 0,13
// Farbe ohne Verlauf, alte 0,38 mit. Die Liste der "neuen" enthielt aber
// alle vier Turmarten - der zweite Fall lief nie. Er ist weg, und was
// bleibt, ist die Zahl, die tatsaechlich gilt.
// Exportiert aus demselben Grund wie bei den Gegnern: das Lesbarkeitstor
// misst die gebackene Figur und muss denselben Schleier auftragen.
export const FARBSCHLEIER = 0.13;

const tinted = new Map<string, HTMLCanvasElement>();

/** Wie breit die Figur im Bild tatsaechlich ist, als Anteil der Kachel.
 *
 *  Seit die Bilder nach der laengeren Seite eingepasst werden, fuellt ein
 *  hoher schmaler Turm nur ein Drittel der Breite - gezeichnet wurde aber
 *  immer die volle Kachel, und der Turm wirkte winzig. Gemessen wird einmal
 *  je Bild und danach gemerkt. */
const breiten = new Map<string, number>();

export function artBreite(art: HTMLCanvasElement, schluessel: string): number {
  const hit = breiten.get(schluessel);
  if (hit !== undefined) return hit;
  const g = art.getContext('2d')!;
  const { data } = g.getImageData(0, 0, art.width, art.height);
  // Gemessen wird der FUSS, nicht die groesste Ausdehnung.
  //
  // Vorher zaehlte die Gesamtbreite. Rechnerisch waren damit alle Tuerme
  // gleich breit - im Bild nicht: beim Frostturm ragen Eiszinnen seitlich
  // heraus, also wurde sein Koerper kleiner gezeichnet, damit die
  // Gesamtbreite stimmt. Der Bogenturm hat keine Auswuechse und stand
  // dadurch groesser da.
  //
  // Was ein Turm an Groesse ausstrahlt, ist seine Standflaeche. Also wird
  // nur das untere Viertel des Bildes gemessen; was oben herausragt, darf
  // herausragen.
  let minX = art.width, maxX = -1;
  const vonY = Math.floor(art.height * 0.62);
  for (let y = vonY; y < art.height; y += 2) {
    for (let x = 0; x < art.width; x++) {
      if (data[(y * art.width + x) * 4 + 3] < 40) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  const anteil = maxX < 0 ? 1 : (maxX - minX + 1) / art.width;
  breiten.set(schluessel, anteil);
  return anteil;
}
const raw = new Map<string, HTMLImageElement>();
const ready = new Set<string>();
let version = 0;

export const towerArtVersion = (): number => version;

/** Welche Bilder kommen fuer diesen Turm in Frage - vom genauesten zum
 *  allgemeinsten.
 *
 *  Bis v66 ging die Ausbaustufe gar nicht in die Bildwahl ein: ein Turm auf
 *  Stufe 6 sah aus wie ein frisch gebauter. Jetzt wird zuerst nach dem Bild
 *  fuer genau diese Stufe gesucht, dann nach der naechstniedrigeren, und
 *  zuletzt nach dem stufenlosen Bild. So kann ein Satz Stueck fuer Stueck
 *  wachsen, ohne dass zwischendurch etwas fehlt. */
function kandidaten(id: TowerId, branch: BranchIndex, level: number): string[] {
  const zweig = branch === null ? '1' : TOWERS[id].branches[branch].id;
  const aus: string[] = [];
  for (let l = Math.max(1, Math.round(level)); l >= 1; l--) {
    aus.push(`${id}_${zweig}_${l}`);
  }
  if (zweig !== '1') for (let l = Math.max(1, Math.round(level)); l >= 1; l--) aus.push(`${id}_1_${l}`);
  aus.push(`${id}_${zweig}`);
  if (zweig !== '1') aus.push(`${id}_1`);
  return aus;
}

function key(id: TowerId, branch: BranchIndex, level = 1): string {
  for (const k of kandidaten(id, branch, level)) if (TOWER_ART[k]) return k;
  return `${id}_1`;
}

function load(k: string): HTMLImageElement | null {
  const src = TOWER_ART[k];
  if (!src || typeof Image === 'undefined') return null;
  let img = raw.get(k);
  if (!img) {
    img = new Image();
    img.onload = () => { ready.add(k); version++; };
    img.onerror = () => { /* dann bleibt die gezeichnete Silhouette */ };
    img.src = src;
    raw.set(k, img);
  }
  return ready.has(k) ? img : null;
}

/** Das fertige, eingefaerbte Bild - oder null, solange nichts geladen ist.
 *  Der Renderer faellt dann auf die gezeichneten Formen zurueck. */
export function getTowerArt(
  id: TowerId, branch: BranchIndex, level: number, mapId = 'spiralhain',
): HTMLCanvasElement | null {
  const k = key(id, branch, level);
  const accent = accentFor(TOWERS[id], branch);
  // Der Schluessel traegt die Einbettung mit: solange das Untergrundbild
  // nicht geladen ist, gibt es kein Farbklima, und ein Bild ohne Klima
  // duerfte nicht dauerhaft haengenbleiben.
  const cacheKey = `${k}|${accent}|${einbettungSchluessel(mapId)}`;
  const hit = tinted.get(cacheKey);
  if (hit) return hit;

  const img = load(k);
  if (!img) return null;

  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;

  const body = document.createElement('canvas');
  body.width = size; body.height = size;
  const bg = body.getContext('2d')!;
  bg.drawImage(img, 0, 0, size, size);
  // --- Sonnenanstrich: die Figur nimmt das Licht der Karte an.
  //
  // Das ist der Kern der Einbettung. Ein Turm, der seine eigene, kuehle
  // Beleuchtung mitbringt, liegt auf der Landschaft statt darin - gemessen
  // 0,14 Farbtemperaturabstand zum Boden bei erlaubten 0,10.
  //
  // Aufgetragen wird von oben links, wo die Sonne steht, und nach unten hin
  // abnehmend; unten uebernimmt stattdessen die Verschattung, weil dort das
  // Licht vom Boden geschluckt wird.
  bg.globalCompositeOperation = 'source-atop';
  bg.fillStyle = hexA(accent, FARBSCHLEIER);
  bg.fillRect(0, 0, size, size);
  // --- Sonne, Verschattung, Rueckwurf und Farbklima der Karte.
  //
  // Der Block stand bis v125 hier ausgeschrieben - und NUR hier. Der
  // Zielturm, die Tore und die Sockel liefen daran vorbei, weil sie ueber
  // `getObjectArt` kommen. Jetzt steht er in `einbettung.ts`, und beide Wege
  // gehen hindurch: was zweimal dasteht, veraltet einmal (Regel 15) - was nur
  // einmal dasteht, gilt eben auch nur einmal.
  einbetten(bg, size, mapId);

  bg.globalCompositeOperation = 'source-over';
  g.drawImage(body, 0, 0);

  tinted.set(cacheKey, cv);
  void level;
  return cv;
}

/** Groesse des Turms nach Ausbaustufe.
 *
 *  Frueher wuchs der Turm mit der Stufe - 78 Prozent auf Stufe 1, volle
 *  Groesse ab Stufe 3. Das war die richtige Antwort, solange sich alle Stufen
 *  ein einziges Bild teilten: der Zuwachs war das einzige sichtbare Zeichen
 *  eines Ausbaus.
 *
 *  Seit jede Stufe ihr eigenes Bild hat, sagt das Bild selbst, wie weit
 *  ausgebaut wurde. Ein zusaetzlich wachsender Massstab stoert dann zweimal:
 *  der Platzbedarf bleibt gleich, waehrend das Bild groesser wird, und beim
 *  Ausbau springt der Turm. Deshalb ist die Groesse jetzt fuer alle Stufen
 *  dieselbe.
 *
 *  Die Funktion bleibt, weil sie an vier Stellen aufgerufen wird und weil ein
 *  spaeterer Grund fuer eine Stufenabhaengigkeit hier landen wuerde. */
export function towerArtScale(level: number): number {
  void level;
  return 1;
}

export const hasTowerArt = (id: TowerId, branch: BranchIndex): boolean =>
  key(id, branch) in TOWER_ART;
