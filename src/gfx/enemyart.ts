import { ENEMY_ART } from './assets/enemies';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { hexA } from './glow';
import { mapById } from '../data/maps';
import { drawRim } from './towerart';
import { ENEMIES as ALLE } from '../data/enemies';

/** Gerenderte Gegnerbilder.
 *
 *  Wie bei den Tuermen: alle stammen aus derselben Familie - dunkler Panzer
 *  mit Glut - und waeren im Feld nicht auseinanderzuhalten. Die Artfarbe wird
 *  deshalb ueber die Silhouette gelegt, dazu eine helle Kante von oben links.
 *
 *  Eine weisse Fassung fuer den Trefferblitz wird gleich mitgebacken; sie
 *  ersetzt das Weisstoenen zur Laufzeit, das je Treffer Rechenzeit kosten
 *  wuerde. */
const baked = new Map<string, HTMLCanvasElement>();
const raw = new Map<string, HTMLImageElement>();
const ready = new Set<string>();
let version = 0;


function load(id: EnemyId): HTMLImageElement | null {
  const src = ENEMY_ART[id];
  if (!src || typeof Image === 'undefined') return null;
  let img = raw.get(id);
  if (!img) {
    img = new Image();
    img.onload = () => { ready.add(id); version++; };
    img.onerror = () => { /* dann bleibt die gezeichnete Silhouette */ };
    img.src = src;
    raw.set(id, img);
  }
  return ready.has(id) ? img : null;
}

export function getEnemyArt(
  id: EnemyId, flash: boolean, mapId = 'spiralhain',
): HTMLCanvasElement | null {
  const rim = mapById(mapId).palette.rim;
  const cacheKey = `${id}|${flash ? 'f' : 'n'}|${rim}`;
  const hit = baked.get(cacheKey);
  if (hit) return hit;

  const img = load(id);
  if (!img) return null;

  const def = ENEMIES[id];
  const size = img.width;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d')!;
  // Aufsichten sind neu geliefert, hell genug und tragen ihre Form selbst -
  // ein Saum wuerde sie weiss umranden. Nur die verbliebenen Seitenansichten
  // aus dem Altbestand brauchen ihn noch.
  if (!flash && !ALLE[id].topdown) drawRim(g, img, size, rim, 2.0);

  const body = document.createElement('canvas');
  body.width = size; body.height = size;
  const bg = body.getContext('2d')!;
  bg.drawImage(img, 0, 0);
  bg.globalCompositeOperation = 'source-atop';
  if (flash) {
    bg.fillStyle = 'rgba(255,255,255,0.85)';
    bg.fillRect(0, 0, size, size);
  } else {
    // Dieselbe Altlast wie bei den Tuermen: der Farbschleier und der
    // Lichtverlauf stammen aus der Zeit, als alle Gegnerbilder aus derselben
    // Familie kamen und nur ueber die Farbe zu unterscheiden waren. Die neuen
    // Aufsichten haben eigene Farben und eigenes Licht - ein starker Schleier
    // verwaescht sie, der Verlauf legt ein zweites Licht darueber.
    //
    // Beim Span bleibt der Schleier hoeher: er kommt aus demselben Bild wie
    // der Spalter, und ohne Farbe waere er nur ein kleinerer Spalter.
    const neu = !!def.topdown;
    const staerke = neu ? (id === 'splitling' ? 0.30 : 0.15) : 0.38;
    bg.fillStyle = hexA(def.body, staerke);
    bg.fillRect(0, 0, size, size);
    if (!neu) {
      const lift = bg.createLinearGradient(0, 0, size * 0.7, size);
      lift.addColorStop(0, 'rgba(255,255,255,0.24)');
      lift.addColorStop(0.5, 'rgba(255,255,255,0.04)');
      lift.addColorStop(1, 'rgba(0,0,0,0.24)');
      bg.fillStyle = lift;
      bg.fillRect(0, 0, size, size);
    }

    // Sonnenanstrich, wie bei den Tuermen.
    //
    // Ein Gegner, der ueber dieselbe Karte laeuft, bekommt auch dasselbe Licht
    // ab. Ohne das wandern die Figuren mit ihrer eigenen Beleuchtung durch die
    // Landschaft - und genau das liest sich als aufgeklebt. Der Anstrich ist
    // schwaecher als bei den Tuermen, weil Gegner kleiner sind und ihre Farbe
    // zugleich das Erkennungsmerkmal ist.
    const sonne = mapById(mapId).palette.sonne;
    const licht = bg.createLinearGradient(0, 0, size * 0.55, size);
    licht.addColorStop(0, hexA(sonne, 0.20));
    licht.addColorStop(0.5, hexA(sonne, 0.09));
    licht.addColorStop(1, hexA(sonne, 0.01));
    bg.fillStyle = licht;
    bg.fillRect(0, 0, size, size);

    const dunkel = bg.createLinearGradient(0, size * 0.6, 0, size);
    dunkel.addColorStop(0, 'rgba(24,20,14,0)');
    dunkel.addColorStop(1, 'rgba(24,20,14,0.26)');
    bg.fillStyle = dunkel;
    bg.fillRect(0, 0, size, size);

    // Bodenlicht, wie bei den Tuermen - schwaecher, weil Gegner kleiner sind
    // und ihr Saum sonst die Koerperfarbe ueberdeckt.
    const rueckwurf = bg.createLinearGradient(0, size * 0.74, 0, size * 0.96);
    rueckwurf.addColorStop(0, hexA(sonne, 0));
    rueckwurf.addColorStop(0.55, hexA(sonne, 0.14));
    rueckwurf.addColorStop(1, hexA(sonne, 0));
    bg.fillStyle = rueckwurf;
    bg.fillRect(0, 0, size, size);
  }
  bg.globalCompositeOperation = 'source-over';
  g.drawImage(body, 0, 0);

  baked.set(cacheKey, cv);
  return cv;
}

/** Wie breit der Gegner gezeichnet wird. Der Mindestwert ist bewusst von der
 *  Treffererkennung entkoppelt: der Span hatte bei seinem Radius nur elf
 *  Bildschirmpunkte, und darunter ist nichts mehr zu erkennen.
 *
 *  Gemessen wurde vor der Anhebung: Spaeher 14, Infanterie 16, Span 17
 *  Bildschirmpunkte im schlechtesten Fall - bei einer Erkennbarkeitsgrenze
 *  von 13. Vier von acht Gegnerarten lagen damit im Bereich von ein bis vier
 *  Punkten ueber dem, was ueberhaupt noch als Form durchgeht, und der
 *  Lebensbalken darueber war breiter als das Wesen, zu dem er gehoert.
 *
 *  `radius` bleibt unberuehrt. Er ist Spielmodell - Treffer, Zielwahl,
 *  Flaechenschaden haengen daran. Waere die Zeichengroesse dasselbe wie der
 *  Radius, wuerde diese Runde die Balance mitverschieben, und niemand koennte
 *  hinterher trennen, was von der Grafik kam und was vom Modell.
 *
 *  Angehoben wird ZUSAMMENZIEHEND, nicht mit einem gemeinsamen Faktor. Der
 *  erste Versuch nahm alle mal 1,3 und wurde vom Waechter gestoppt: der
 *  Leerentitan war danach 166 % der engsten Wegstelle und passte nicht mehr
 *  auf die Strasse. Nachgerechnet ist ein gemeinsamer Faktor ueberhaupt nur
 *  bis 1,06 moeglich - der Titan liegt mit 102 Punkten schon dicht an der
 *  Obergrenze von 108.
 *
 *  Das war ohnehin die falsche Frage. Zu klein waren Spaeher, Span und
 *  Schleicher mit 14 bis 21 Bildschirmpunkten; der Koloss mit 41 war nie das
 *  Problem. Ein gemeinsamer Faktor haette den Grossen gegeben, was die
 *  Kleinen brauchen - und die Strasse verstopft.
 *
 *  Deshalb ein Zug in Richtung einer Zielbreite: wer darunter liegt, wird
 *  einen Teil des Wegs dorthin gezogen, wer darueber liegt, bleibt. Gross
 *  und klein ruecken zusammen, ohne dass die Rangfolge kippt - ein Koloss
 *  bleibt groesser als ein Spaeher. */
const ZIELBREITE = 80;
const ZUG = 0.6;

export const enemyArtWidth = (id: EnemyId): number => {
  const roh = Math.max(ENEMIES[id].radius * 3.0, 50);
  return roh >= ZIELBREITE ? roh : roh + (ZIELBREITE - roh) * ZUG;
};

/** Der Radius, an dem sich alles ausrichtet, was zum Gegner GEHOERT:
 *  Schatten, Lebensbalken, Markierungsringe, Bossglanz.
 *
 *  Getrennt von `radius` aus zwei Gruenden. Der erste ist Regel 4 - das
 *  Modell darf nicht an der Darstellung haengen, sonst verschiebt eine
 *  Grafikrunde die Balance mit. Der zweite ist praktischer: als die Figuren
 *  um 30 % wuchsen, blieben Balken und Ringe zurueck. Der Lebensbalken lag
 *  ploetzlich auf dem Panzer statt darueber, und der Ring, der einen
 *  gebremsten Gegner markiert, schnitt mitten durch ihn hindurch.
 *
 *  Vor der Anhebung war dieser Wert fuer die meisten Arten genau `radius`;
 *  fuer die kleinen, die an der Mindestbreite haengen, war er schon damals
 *  groesser - dort sassen die Ringe schon immer zu eng. */
export const enemySichtRadius = (id: EnemyId): number => enemyArtWidth(id) / 3.0;

export const hasEnemyArt = (id: EnemyId): boolean => id in ENEMY_ART;
