import { TOWER_ART } from './assets/towers';
import { accentFor, TOWERS, type BranchIndex, type TowerId } from '../data/towers';
import { hexA } from './glow';
import { mapById } from '../data/maps';

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
/** Saum um eine Silhouette: das Bild achtfach versetzt in einer Farbe,
 *  darunter gelegt.
 *
 *  Der Saum stammt aus v33 und war die richtige Antwort auf ein anderes
 *  Problem: dunkle, gerenderte Figuren auf einem dunklen Waldfoto - elf von
 *  zwoelf lagen im selben Helligkeitsband wie der Boden und waren nur an
 *  ihrem Saum zu erkennen.
 *
 *  Seit die Bilder und die Karten neu sind, gilt das nicht mehr. Die Figuren
 *  sind heller als der Boden und tragen ihre Form selbst. Der helle Saum ist
 *  dadurch von einer Notmassnahme zu einem Fehler geworden - im Spiel sah man
 *  weisse Umrandungen um jeden Turm und jeden Gegner.
 *
 *  Er bleibt im Code, weil er fuer die verbliebenen Altbilder noch gebraucht
 *  wird; welche Figur ihn bekommt, entscheidet `brauchtSaum`. */
export function drawRim(
  g: CanvasRenderingContext2D, img: HTMLImageElement | HTMLCanvasElement,
  size: number, colour: string, width = 2.5,
): void {
  const mask = document.createElement('canvas');
  mask.width = size; mask.height = size;
  const mg = mask.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    mg.drawImage(img, Math.cos(a) * width, Math.sin(a) * width, size, size);
  }
  mg.globalCompositeOperation = 'source-atop';
  mg.fillStyle = colour;
  mg.fillRect(0, 0, size, size);
  g.globalAlpha = 0.92;
  g.drawImage(mask, 0, 0);
  g.globalAlpha = 1;
}

/** Welche Bilder brauchen noch einen Saum?
 *
 *  Die neu gelieferten tragen ihre Form selbst und sind heller als der Boden.
 *  Ein Saum wuerde sie mit einer weissen Linie umranden. Die Liste schrumpft
 *  mit jeder Lieferung; steht sie leer, kann `drawRim` ganz weg. */
const OHNE_SAUM = new Set<string>(['arrow', 'frost', 'mortar', 'prism']);
export const brauchtSaum = (id: string): boolean => !OHNE_SAUM.has(id);

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
const einfaerbung = (id: string): { farbe: number; verlauf: boolean } =>
  (OHNE_SAUM.has(id) ? { farbe: 0.13, verlauf: false } : { farbe: 0.38, verlauf: true });

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
  const rim = mapById(mapId).palette.rim;
  const cacheKey = `${k}|${accent}|${rim}`;
  const hit = tinted.get(cacheKey);
  if (hit) return hit;

  const img = load(k);
  if (!img) return null;

  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;

  // Erst der Saum, dann der eingefaerbte Koerper darueber - so bleibt die
  // Kante sauber und wird nicht mit eingefaerbt.
  // Nur noch fuer Altbilder, siehe Kommentar an drawRim.
  if (brauchtSaum(id)) drawRim(g, img, size, rim, 2.0);

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
  const sonne = mapById(mapId).palette.sonne;
  const stil = einfaerbung(id);
  bg.globalCompositeOperation = 'source-atop';
  bg.fillStyle = hexA(accent, stil.farbe);
  bg.fillRect(0, 0, size, size);
  if (stil.verlauf) {
    const lift = bg.createLinearGradient(0, 0, size * 0.7, size);
    lift.addColorStop(0, 'rgba(255,255,255,0.34)');
    lift.addColorStop(0.45, 'rgba(255,255,255,0.10)');
    lift.addColorStop(1, 'rgba(0,0,0,0.22)');
    bg.fillStyle = lift;
    bg.fillRect(0, 0, size, size);
  }
  {
    const licht = bg.createLinearGradient(0, 0, size * 0.55, size);
    licht.addColorStop(0, hexA(sonne, 0.30));
    licht.addColorStop(0.45, hexA(sonne, 0.14));
    licht.addColorStop(1, hexA(sonne, 0.02));
    bg.fillStyle = licht;
    bg.fillRect(0, 0, size, size);

    // Bodennaehe verschatten: dort faellt weniger Licht ein.
    const dunkel = bg.createLinearGradient(0, size * 0.55, 0, size);
    dunkel.addColorStop(0, 'rgba(24,20,14,0)');
    dunkel.addColorStop(1, 'rgba(24,20,14,0.34)');
    bg.fillStyle = dunkel;
    bg.fillRect(0, 0, size, size);

    // Bodenlicht: der helle Sand wirft Sonne zurueck.
    //
    // Ich hatte zunaechst vermutet, die Figuren wirkten wegen harter Kanten
    // aufgeklebt. Gemessen stimmt das nicht: kein einziger harter Kantenpunkt,
    // dafuer 2.684 weiche Uebergaenge - die Silhouette ist laengst weich.
    //
    // Was fehlt, ist das Licht, das der Boden zurueckwirft. In einer echten
    // Szene ist die Unterseite eines Gegenstands nicht nur dunkler, sondern
    // auch waermer, weil der beschienene Sand darunter Sonne hinaufwirft. Der
    // Saum sitzt deshalb ZWISCHEN Verschattung und Standflaeche: ganz unten
    // dunkel, knapp darueber ein warmer Schimmer.
    const rueckwurf = bg.createLinearGradient(0, size * 0.72, 0, size * 0.94);
    rueckwurf.addColorStop(0, hexA(sonne, 0));
    rueckwurf.addColorStop(0.55, hexA(sonne, 0.20));
    rueckwurf.addColorStop(1, hexA(sonne, 0));
    bg.fillStyle = rueckwurf;
    bg.fillRect(0, 0, size, size);
  }

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
