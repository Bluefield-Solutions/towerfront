import { C, LICHT, WORLD_H, WORLD_W } from '../data/config';
import { ENEMIES, type EnemyId } from '../data/enemies';
import {
  TOWERS, TURM_BREITE, accentFor, statsFor,
  type BranchIndex, type TowerDef, type TowerId, type TowerLevel,
  DRAW_SCALE, TURM_HOEHE, TOWER_ORDER } from '../data/towers';
import { ABILITIES } from '../data/abilities';
import { makeRng } from '../core/math';
import { GameState } from '../game/state';
import type { Enemy, Husk, Tower } from '../game/types';
import { beginGlowBatch, endGlowBatch, hexA, stampGlow, stampGlowFast } from './glow';
import { terrainAuftrag, type TerrainAuftrag } from './terrain';
import { snap } from '../data/maps';
import { drawMenu } from './menurender';
import type { Menu } from '../game/menu';
import { backgroundVersion, getBackground } from './backgrounds';
import { artBreite, getTowerArt, towerArtScale, towerArtVersion } from './towerart';
import { getObjectArtEingebettet, getObjectArtStufeEingebettet } from './objectart';
import { enemyArtWidth, enemySichtRadius, getEnemyArt } from './enemyart';
import {
  drawSprite, getEnemySprite, getSchattenriss, getShadow, getTowerBase, getTowerWeapon,
  roundRect, ENEMY_FRAMES,
} from './sprites';
import { drawAurora, drawGroundFog, getMoodLayer } from './atmosphere';

/** Wieviel Zeit ein Bild in den Kartenaufbau stecken darf.
 *
 *  Sechs Millisekunden von den 16,7, die ein Bild bei 60 Hz hat. Ein Band
 *  wird immer zu Ende gerechnet, das Budget entscheidet nur, ob ein zweites
 *  folgt - sonst kaeme bei einem knappen Budget nie etwas voran. */
const TERRAIN_BUDGET_MS = 6;

/** Die vier Geschossformen (D17).
 *
 *  `laenge > 0` heisst laenglich und wird als Strich in Flugrichtung
 *  gezeichnet; sonst rund. Die Masse sind fuer die Anzeigegroesse gewaehlt,
 *  nicht fuer die Weltgroesse: bei kleinstem Massstab wird ein Weltpunkt zu
 *  rund 0,8 Bildschirmpunkten, ein Pfeil von 13 misst also gut zehn - lang
 *  genug, dass die Richtung ablesbar ist (Regel 12). */
export const PROJEKTILFORMEN = [
  { id: 'pfeil', laenge: 13, breite: 2.6, radius: 0, doppelt: 0 },
  // Die Salve schiesst ZWEI kurze Bolzen nebeneinander. Der erste Entwurf gab
  // ihr nur einen kuerzeren, dickeren Strich - herangezoomt unterscheidbar,
  // im Spiel nicht. Zwei nebeneinander sind es sofort, und sie sagen
  // ausserdem, was der Zweig heisst.
  { id: 'bolzen', laenge: 8, breite: 2.4, radius: 0, doppelt: 3 },
  { id: 'granate', laenge: 0, breite: 0, radius: 6, doppelt: 0 },
  { id: 'brocken', laenge: 0, breite: 0, radius: 8.5, doppelt: 0 },
] as const;

type Projektilform = (typeof PROJEKTILFORMEN)[number]['id'];

/** Welche Form gehoert zu diesem Geschoss?
 *
 *  Abgeleitet aus dem Turm und seinem Zweig, nicht am Geschoss gespeichert.
 *  Damit aendert sich weder der Speicherplan noch der Spielstand - und ein
 *  Turm, der den Zweig wechselt, schiesst sofort richtig. */
export function projektilform(p: { owner: Tower | null; splash: number }): Projektilform {
  if (!p.owner) return p.splash ? 'granate' : 'pfeil';
  const def = TOWERS[p.owner.def];
  if (def.attack === 'splash') return p.owner.branch === 1 ? 'brocken' : 'granate';
  return p.owner.branch === 1 ? 'bolzen' : 'pfeil';
}

/** Wie stark der Lichtteich um den Kristall aufgetragen wird.
 *
 *  Ausgeeicht am gerenderten Bild, nicht am Bildvorrat: gemessen wird die
 *  Buntheit des BODENS in einem Ring um die Zielplattform, mit und ohne
 *  Teich, und dagegen die Buntheit der Festung. Eine Zahl, die man nur
 *  ansieht, ist bei Deckungen von 6 bis 20 Prozent nicht zu beurteilen.
 *
 *  Gemessen wurde am Ende durch VERGLEICH ZWEIER BILDER, mit und ohne - das
 *  ist die einzige Messung ohne Annahmen. Zwei Anlaeufe mit von Hand
 *  gesetzten Messfenstern waren wertlos: das eine lag auf der Bedienleiste,
 *  das andere auf einer halben Festung. Erst der Bildvergleich zeigte, was
 *  zaehlt - die Aenderung ist ein radialer Fleck genau ueber der
 *  Zielplattform und ueber dem ganzen linken Zweidrittel exakt null.
 *
 *  Die STAERKE selbst ist nach Augenschein gesetzt, nicht gemessen. Das ist
 *  hier ehrlicher als eine Zahl, die nur sich selbst bestaetigt: wieviel
 *  Licht gut aussieht, sagt kein Tor. */
export const LICHTTEICH = 1.35;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement | null = null;
  private terrainFor = '';
  private terrainBgVersion = -1;
  /** Der laufende Kartenaufbau, solange er noch nicht fertig ist. */
  private terrainArbeit: TerrainAuftrag | null = null;
  /** Wurde die gezeigte Karte aus dem Foto gebacken oder aus der Palette
   *  gemalt? Nur zum Pruefen - im Spiel entscheidet das niemand. */
  private terrainMitFoto = false;

  /** Den laufenden Kartenaufbau sofort zu Ende rechnen.
   *
   *  Fuer alles, was NICHT viele Bilder zeichnet: Bildabnahme, Rauchtest,
   *  Messwerkzeuge. Im Spiel verteilt sich der Aufbau ueber rund 28 Bilder
   *  und ist nach einer halben Sekunde fertig - wer aber nur zwei Bilder
   *  zeichnet, saehe fuer immer die vorherige Karte.
   *
   *  Genau das ist in v114 passiert: die Aufnahmen zeigten den gemalten
   *  Ersatzuntergrund statt des Fotos, und alle sechzehn Tore blieben gruen.
   *  Gefunden wurde es durch Hinsehen (Regel 7). */
  /** Arbeit, die die Zeichenschicht noch VOR SICH HAT.
   *
   *  Leere Liste heisst: was gerade gezeichnet wurde, aendert sich von selbst
   *  nicht mehr. Gilt in jeder Umgebung - auch dort, wo es gar keinen
   *  Bilddekoder gibt.
   *
   *  Warum es das gibt: in v113 wurde der Kartenaufbau ueber 28 Bilder
   *  verteilt. Die Bildabnahme zeichnet zwei - also zeigte jede Aufnahme den
   *  gemalten Ersatzuntergrund statt des Fotos, und alle sechzehn Tore
   *  blieben gruen. Die Farbzaehlung faengt so etwas nicht: Tuerme und
   *  Gegner bringen genug Farben mit.
   *
   *  Die Lehre ist allgemeiner als der eine Fall. Ein Werkzeug, das wenige
   *  Bilder zeichnet, kann NICHT wissen, was die Zeichenschicht noch vor sich
   *  hat - und wenn es das schaetzt, schaetzt es irgendwann falsch. Also
   *  fragt es hier nach. Genauso macht es Espressos IdlingResource: nicht
   *  warten, sondern das Teilsystem selbst melden lassen.
   *
   *  Wer etwas Neues verzoegert baut, traegt es HIER nach. */
  imAufbau(s: GameState): string[] {
    const offen: string[] = [];
    if (this.menu) return offen;      // im Menue gibt es weder Karte noch Turmschicht
    if (this.terrainArbeit) offen.push('Kartenaufbau laeuft noch');
    // Nur wenn ein Foto ueberhaupt vorliegt. Ohne Dekoder gibt es keines,
    // und dann ist der gemalte Untergrund richtig statt falsch.
    if (getBackground(s.map.id) && !this.terrainMitFoto) {
      offen.push(`Untergrund ${s.map.id} gemalt statt aus dem Foto gebacken`);
    }
    return offen;
  }

  /** Bilder, die noch nicht dekodiert sind.
   *
   *  BEWUSST getrennt von `imAufbau`. Der erste Anlauf warf beides in eine
   *  Liste - und `smoke` wie `bench-draw` schlugen sofort an, weil dort gar
   *  kein Bilddekoder laeuft und Bilder deshalb NIE ankommen. Das war kein
   *  Fehler im Spiel, sondern eine Frage, die in jener Umgebung keinen Sinn
   *  ergibt.
   *
   *  Die Unterscheidung ist der eigentliche Punkt: "noch nicht fertig" und
   *  "kann hier gar nicht fertig werden" sehen gleich aus und bedeuten
   *  Gegensaetzliches. Nur wer einen Dekoder hat, darf das hier fragen.
   *
   *  Nebenwirkung mit Absicht: die Abfragen fordern fehlende Bilder an. */
  fehlendeBilder(s: GameState): string[] {
    const fehlt: string[] = [];
    if (this.menu) return fehlt;
    if (!getBackground(s.map.id)) fehlt.push(`Untergrund ${s.map.id}`);
    for (const id of TOWER_ORDER) {
      if (!getTowerArt(id, null, 1, s.map.id)) fehlt.push(`Turmbild ${id}`);
    }
    for (const id of Object.keys(ENEMIES) as EnemyId[]) {
      if (!getEnemyArt(id, false, s.map.id)) fehlt.push(`Gegnerbild ${id}`);
    }
    return fehlt;
  }

  /** Traegt die gezeigte Karte ihr Foto? Fuer Pruefungen. */
  terrainHatFoto(): boolean { return this.terrainMitFoto; }

  kartenaufbauAbschliessen(s: GameState): void {
    // Erst einmal zeichnen, damit ein noetiger Auftrag ueberhaupt entsteht.
    this.draw(s);
    while (this.terrainArbeit) {
      if (this.terrainArbeit.schritt(Infinity)) {
        this.terrain = this.terrainArbeit.flaeche;
        this.terrainMitFoto = !!getBackground(s.map.id);
        this.terrainArbeit = null;
        this.towerLayerVersion = -1;
      }
    }
  }
  /** Weltpunkt, auf den gerade gezielt wird. */
  aimPoint: { x: number; y: number } | null = null;
  /** Ist gesetzt, solange das Menue offen ist - dann wird es statt des
   *  Spielfeldes gezeichnet. */
  menu: Menu | null = null;
  private sky: HTMLCanvasElement | null = null;
  /** Alle Turmsockel in einem Bild. Wird nur neu gebacken, wenn sich am
   *  Bestand etwas aendert - nicht in jedem Bild. */
  private towerLayer: HTMLCanvasElement | null = null;
  private towerLayerVersion = -1;
  private towerArtVersionAt = -1;
  /** Partikel werden nach Farbe und Deckkraft gebuendelt, damit nicht fuer
   *  jedes einzelne die Zeichenfarbe neu gesetzt werden muss. */
  private pBatch = new Map<string, number[]>();
  /** Markierung der Einfuehrung auf dem Spielfeld. */
  coachHint: 'build' | 'tower' | null = null;
  scale = 1; offX = 0; offY = 0;
  private cssW = 0; private cssH = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  /** `insetTop` und `insetBottom` sind die Baender, die Kopfzeile und
   *  Bedienleiste belegen. Das Spielfeld wird nur in den Bereich dazwischen
   *  gezeichnet - vorher lag die Bedienung ueber dem Brett, und das untere
   *  Drittel des Feldes war schlicht verdeckt. */
  /** Kamera.
   *
   *  Bis v29 wurde das Spielfeld zwischen Kopfzeile und Bedienleiste
   *  eingepasst - das Brett lag als Insel in der Mitte, mit breiten toten
   *  Raendern. Die Vorbilder des Genres machen es umgekehrt: die Karte fuellt
   *  den Bildschirm, die Bedienung schwebt darueber.
   *
   *  Zwei Bezugsgroessen:
   *  - `fitScale`  - alles ist sichtbar, es bleiben Raender
   *  - `coverScale`- der Bildschirm ist gefuellt, es wird beschnitten
   *
   *  **`coverScale` ist die Untergrenze, nicht `fitScale`.** Solange das Feld
   *  ein gezeichnetes Brett war, waren Raender daneben vertretbar. Seit die
   *  Karte ein Bild ist, sind sie es nicht: wer herauszog, sah schwarze
   *  Balken um das Bild, und weil die Himmelsschicht sich dabei je Bild neu
   *  aufbaute, flackerte es dazu. Gemeldet aus dem Spiel, und zu Recht.
   *
   *  Der Startwert ist `coverScale`. Herausziehen endet dort; wer Genaues
   *  braucht, zieht hinein. Verschieben ist immer so begrenzt, dass kein Rand
   *  des Feldes ins Bild rutscht. */
  private zoom = 1;
  private camX = WORLD_W / 2;
  private camY = WORLD_H / 2;
  fitScale = 1;
  coverScale = 1;

  /** Wie weit man hoechstens herausziehen darf.
   *
   *  Die eine Stelle, an der diese Regel steht. Vorher stand sie zweimal -
   *  einmal beim Zoomen, einmal beim Nachkorrigieren - und die Gegenprobe
   *  konnte den Fehler nicht nachstellen, weil die jeweils andere Stelle ihn
   *  gleich wieder ausbuegelte. Eine Regel an zwei Stellen ist eine Regel,
   *  die man nicht pruefen kann. */
  private get minZoom(): number { return this.coverScale; }
  private get maxZoom(): number { return this.coverScale * 3; }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    const wasAtCover = Math.abs(this.zoom - this.coverScale) < 1e-6;
    this.cssW = w; this.cssH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.fitScale = Math.min(w / WORLD_W, h / WORLD_H);
    this.coverScale = Math.max(w / WORLD_W, h / WORLD_H);
    // Beim ersten Mal und solange nicht selbst gezoomt wurde: Bildschirm fuellen.
    if (this.zoom <= 0 || wasAtCover) this.zoom = this.coverScale;
    this.clamp();
    this.sky = null;
  }

  /** Grenzen einhalten: nie ueber den Rand des Feldes hinaus, und wenn das
   *  Feld in einer Richtung kleiner ist als der Bildschirm, mittig. */
  private clamp(): void {
    this.zoom = Math.min(Math.max(this.zoom, this.minZoom), this.maxZoom);
    const halfW = this.cssW / 2 / this.zoom;
    const halfH = this.cssH / 2 / this.zoom;
    this.camX = halfW * 2 >= WORLD_W
      ? WORLD_W / 2
      : Math.min(Math.max(this.camX, halfW), WORLD_W - halfW);
    this.camY = halfH * 2 >= WORLD_H
      ? WORLD_H / 2
      : Math.min(Math.max(this.camY, halfH), WORLD_H - halfH);
    this.scale = this.zoom;
    this.offX = this.cssW / 2 - this.camX * this.zoom;
    this.offY = this.cssH / 2 - this.camY * this.zoom;
  }

  /** Verschieben um eine Strecke in Bildschirmpunkten. */
  panBy(dx: number, dy: number): void {
    this.camX -= dx / this.zoom;
    this.camY -= dy / this.zoom;
    this.clamp();
  }

  /** Zoomen um einen festen Punkt auf dem Bildschirm - der bleibt stehen,
   *  alles andere bewegt sich darum herum. Ohne das rutscht beim Kneifen
   *  immer der falsche Ausschnitt weg. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const before = this.screenToWorld(sx, sy);
    this.zoom = Math.min(Math.max(this.zoom * factor, this.minZoom), this.maxZoom);
    this.clamp();
    const after = this.screenToWorld(sx, sy);
    this.camX += before.x - after.x;
    this.camY += before.y - after.y;
    this.clamp();
  }

  /** Bildschirmpunkt -> Weltkoordinate. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    if (this.menu) {
      // Im Menue gilt die eingepasste Abbildung, sonst traefe man daneben.
      const k = Math.min(this.cssW / WORLD_W, this.cssH / WORLD_H);
      return {
        x: (sx - (this.cssW - WORLD_W * k) / 2) / k,
        y: (sy - (this.cssH - WORLD_H * k) / 2) / k,
      };
    }
    return { x: (sx - this.offX) / this.scale, y: (sy - this.offY) / this.scale };
  }

  /** Weltkoordinate -> Bildschirmpunkt. */
  /** Das Menue fuellt dieselbe Flaeche wie das Spielfeld - dadurch stimmen
   *  Bedienung und Bild ohne Sonderfaelle zusammen, und die Bildabnahme sieht
   *  es genauso wie der Browser. */
  private drawMenuFrame(): void {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.voidDeep;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    // Das Menue ist eine feste Anordnung - es muss ganz sichtbar sein.
    // Deshalb wird es eingepasst und nicht wie das Spielfeld formatfuellend
    // beschnitten. Beim ersten Versuch lagen Titel und Startknopf ausserhalb.
    const k = Math.min(this.cssW / WORLD_W, this.cssH / WORLD_H);
    ctx.save();
    ctx.translate((this.cssW - WORLD_W * k) / 2, (this.cssH - WORLD_H * k) / 2);
    ctx.scale(k, k);
    drawMenu(ctx, this.menu!);
    ctx.restore();
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: wx * this.scale + this.offX, y: wy * this.scale + this.offY };
  }

  /** Zwischen Uebersicht und Nahsicht umschalten.
   *
   *  Die Uebersicht ist jetzt `coverScale` - weiter heraus geht nicht mehr.
   *  Die Nahsicht ist das Doppelte davon. */
  toggleOverview(): void {
    // Die Grenze ist anteilig, nicht absolut: bei einem sehr breiten Fenster
    // liegt coverScale weit ueber 1, und ein fester Schwellwert traf dann
    // nie zu. Schon der vierte Fall dieser Art.
    const atCover = this.zoom <= this.coverScale * 1.001;
    this.zoom = atCover ? this.coverScale * 2 : this.coverScale;
    this.clamp();
  }

  get atOverview(): boolean {
    return this.zoom <= this.coverScale * 1.001;
  }

  /** Passt das Bildraster der Leinwand noch zu ihrer Flaeche auf dem
   *  Bildschirm? Wenn nicht, streckt der Browser das fertige Bild - und zwar
   *  in beide Richtungen unterschiedlich. Genau so entstand in v27 ein
   *  flachgedruecktes Spielfeld: `resize` war einmal zu frueh gelaufen, die
   *  Leinwand behielt ihre Standardgroesse von 300 x 150, und das CSS zog
   *  dieses Raster ueber den ganzen Bildschirm.
   *
   *  Deshalb wird das jetzt in jedem Bild geprueft, nicht nur bei einem
   *  Groessenwechsel. Die Pruefung kostet zwei Vergleiche. */
  private ensureFrame(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wantW = Math.round(w * dpr), wantH = Math.round(h * dpr);
    if (this.canvas.width !== wantW || this.canvas.height !== wantH) {
      this.resize();
    }
  }

  /** Weicht das Seitenverhaeltnis des Bildrasters von dem der Flaeche ab?
   *  Nur fuer die Pruefwerkzeuge - im Spiel darf das nie vorkommen. */
  frameSkew(): number {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h || !this.canvas.height) return 0;
    return Math.abs((this.canvas.width / this.canvas.height) / (w / h) - 1);
  }

  draw(s: GameState): void {
    this.ensureFrame();
    const ctx = this.ctx;
    if (this.menu) { this.drawMenuFrame(); return; }
    // Neu backen bei Kartenwechsel - und noch einmal, sobald das
    // Untergrundbild fertig dekodiert ist.
    const bgV = backgroundVersion();
    if (!this.terrain || this.terrainFor !== s.map.id || this.terrainBgVersion !== bgV) {
      this.terrainArbeit = terrainAuftrag(s.map, s.lanes, s.map.palette, getBackground(s.map.id));
      this.terrainFor = s.map.id;
      this.terrainBgVersion = bgV;
    }
    // Der Aufbau laeuft ueber mehrere Bilder statt in einem Zug. Bis er
    // fertig ist, bleibt die VORHERIGE Karte stehen - deshalb sieht man von
    // der Aufteilung nichts. Wer stattdessen die halbfertige Flaeche zeigte,
    // saehe einen Helligkeitsstreifen von oben nach unten wandern.
    if (this.terrainArbeit) {
      if (this.terrainArbeit.schritt(TERRAIN_BUDGET_MS)) {
        this.terrain = this.terrainArbeit.flaeche;
        this.terrainMitFoto = !!getBackground(s.map.id);
        this.terrainArbeit = null;
        this.towerLayerVersion = -1;
      } else if (!this.terrain) {
        // Beim allerersten Bild gibt es nichts Vorheriges. Dann lieber die
        // dunklere Zwischenstufe als eine leere Flaeche - sie ist gueltig,
        // nur noch nicht abgeglichen.
        this.terrain = this.terrainArbeit.flaeche;
      }
    }
    if (!this.sky) this.sky = this.bakeSky();
    const hi = s.quality === 'hoch';

    ctx.fillStyle = C.voidDeep;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    if (this.sky) ctx.drawImage(this.sky, 0, 0, this.cssW, this.cssH);

    ctx.save();
    const sh = s.shake;
    const jx = sh > 0 ? (Math.random() - 0.5) * 14 * sh : 0;
    const jy = sh > 0 ? (Math.random() - 0.5) * 14 * sh : 0;
    ctx.translate(this.offX + jx, this.offY + jy);
    ctx.scale(this.scale, this.scale);

    ctx.drawImage(this.terrain!, 0, 0);
    ctx.drawImage(getMoodLayer(s.map.palette), 0, 0);
    if (hi) drawAurora(ctx, s.crystalPulse);

    this.lichtteich(s);
    this.drawPortal(s, hi);
    this.drawBuildOverlay(s);
    this.drawRings(s);
    this.zeichneStand(s, hi);
    this.drawHealthBars(s);
    this.drawProjectiles(s, hi);
    this.drawBolts(s);
    this.drawParticles(s);
    drawGroundFog(ctx, s.crystalPulse, hi, s.map.palette.haze);
    this.drawMeteors(s, hi);
    this.drawBauplatz(s);
    this.drawGhost(s);
    this.drawHinweis(s);
    this.drawVersetzen(s);
    this.drawAlleReichweiten(s);
    this.drawAim(s);
    this.drawCoach(s);
    this.drawFloats(s);

    // Kurzes Aufleuchten des ganzen Feldes. Bewusst ein gefuelltes Rechteck
    // und kein Kopieren der Leinwand auf sich selbst - letzteres laesst
    // iOS Safari nach kurzer Zeit schwarz werden.
    if (s.flashT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA('#FFD8A8', s.flashT * 0.22);
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  // ------------------------------------------------------------- Hintergrund

  private bakeSky(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = Math.max(2, Math.round(this.cssW));
    cv.height = Math.max(2, Math.round(this.cssH));
    const g = cv.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, cv.height);
    grad.addColorStop(0, C.voidMid);
    grad.addColorStop(1, C.voidDeep);
    g.fillStyle = grad;
    g.fillRect(0, 0, cv.width, cv.height);
    const rnd = makeRng(4711);
    for (let i = 0; i < 150; i++) {
      const x = rnd() * cv.width, y = rnd() * cv.height;
      g.fillStyle = `rgba(200,225,255,${0.12 + rnd() * 0.5})`;
      g.fillRect(x, y, 1.4, 1.4);
    }
    return cv;
  }

  private bakeTowerLayer(s: GameState): void {
    if (!this.towerLayer) {
      const cv = document.createElement('canvas');
      cv.width = WORLD_W; cv.height = WORLD_H;
      this.towerLayer = cv;
    }
    const g = this.towerLayer.getContext('2d')!;
    g.clearRect(0, 0, WORLD_W, WORLD_H);
    // Nur die gezeichneten Tuerme kommen in die Schicht. Gerenderte werden
    // je Bild gezeichnet, weil sie sich zum Ziel hin spiegeln.
    for (const t of s.towers) {
      if (getTowerArt(t.def, t.branch, t.level, s.map.id)) continue;
      drawSprite(g, getTowerBase(t.def, t.branch, t.level), t.x, t.y);
    }
    this.towerLayerVersion = s.towersVersion;
    this.towerArtVersionAt = towerArtVersion();
  }

  // ------------------------------------------------------------- Welt

  /** Ein Tor je Bahn - auf mehrspurigen Karten sieht man auf einen Blick,
   *  aus wie vielen Richtungen es kommt. Das Tor dreht sich zur Bahn hin. */
  /** Der Riegel vor einem gesperrten Zuweg (C24).
   *
   *  Zwei Dinge zugleich, und beide sind noetig: der Weg ist ZU (ein Balken
   *  quer, kein Symbol - man soll nicht erst lernen muessen, was es
   *  bedeutet), und er geht wieder AUF (der Balken hat dieselbe Farbe wie
   *  die Sperrmarke am Kristall, also die Farbe von "Achtung", nicht die von
   *  "kaputt").
   *
   *  Kein Zeitbalken: eine Uhr am Tor waere eine vierte Zahl auf dem Feld,
   *  und der Takt ist mit acht Sekunden ohnehin schnell abgezaehlt. */
  private torSperre(x: number, y: number, breite: number): void {
    const ctx = this.ctx;
    ctx.save();
    // Der Durchgang wird abgedunkelt, damit der Riegel nicht auf hellem
    // Stein verschwindet.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(x, y - breite * 0.22, breite * 0.3, breite * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#F08A3C';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - breite * 0.3, y - breite * 0.22);
    ctx.lineTo(x + breite * 0.3, y - breite * 0.22);
    ctx.stroke();
    ctx.restore();
  }

  private drawPortal(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    const t = s.crystalPulse;
    for (let bahnNr = 0; bahnNr < s.lanes.length; bahnNr++) {
      const lane = s.lanes[bahnNr];
      // Sperrt hier gerade ein Tor? (C24)
      const zu = s.torZu(bahnNr);
      // Weit genug ins Feld hinein, damit das Tor auch zu sehen ist.
      //
      // Der Bahnanfang liegt bewusst vor der Bildkante - dort beginnt der Weg.
      // Bei 34 Pixeln Abstand stand das Tor deshalb halb ausserhalb. Der Wert
      // muss groesser sein als der Ueberstand des Bahnanfangs.
      const p = lane.pts[0], nx = lane.pts[1] ?? p;
      const ang = Math.atan2(nx.y - p.y, nx.x - p.x);
      const hinein = 150;
      const x = p.x + Math.cos(ang) * hinein;
      const y = p.y + Math.sin(ang) * hinein;
      // Ein gesperrter Zuweg leuchtet nicht. Das Leuchten sagt "hier kommt
      // etwas heraus" - genau das stimmt dann nicht.
      if (hi && !zu) stampGlow(ctx, C.voidling, x, y, 72, 0.5 + Math.sin(t * 2) * 0.1);

      // EINGEBETTET, wie alles andere seit v126. Die Tore waren die letzte
      // Gruppe, die ihr eigenes Licht und ihre eigene Farbwelt behielt - drei
      // gleiche Sprites aus einem vierten Bildersatz, roh auf die Karte
      // gestempelt. Genau der Zustand, in dem der Zielturm bis v126 war.
      const art = getObjectArtEingebettet('gate', s.map.id);
      if (art) {
        // Das Tor steht aufrecht und wird NICHT zur Bahn gedreht - es ist ein
        // Bauwerk, kein Fahrzeug. Ein gedrehtes Steintor liegt schief in der
        // Landschaft. Verschoben wird es stattdessen so, dass der Durchgang
        // dort liegt, wo die Bahn beginnt.
        const b = 132 * (1 + Math.sin(t * 2) * 0.012);
        const h = b * (art.height / art.width);
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.ellipse(x + LICHT.x * b * 0.3, y + LICHT.y * b * 0.16, b * 0.42, b * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.drawImage(art, x - b / 2, y - h * 0.78, b, h);
        ctx.restore();
        if (zu) this.torSperre(x, y, b);
      } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.strokeStyle = hexA(C.voidling, 0.9);
        ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) {
          const r = 16 + i * 9 + Math.sin(t * 3 - i) * 3;
          ctx.globalAlpha = 0.8 - i * 0.22;
          ctx.beginPath(); ctx.ellipse(0, 0, r * 0.4, r, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Die Bauplätze antworten auf die Turmwahl.
   *
   *  Ohne gewaehlte Turmsorte bleibt das Brett ruhig - die Plattformen sind
   *  nur als Struktur im Untergrund zu ahnen. Erst die Wahl hebt sie hervor:
   *  gruen, wenn bezahlbar, rot, wenn das Gold fehlt, gedaempft, wenn schon
   *  besetzt. */
  /** Das Feld antwortet auf die Turmwahl.
   *
   *  Gezeigt wird nicht mehr eine Handvoll fester Plaetze, sondern die ganze
   *  Flaeche, auf der dieser Turm stehen darf - gruen. Weil das von seinem
   *  Platzbedarf abhaengt, sieht die Flaeche fuer den Moerser anders aus als
   *  fuer den Bogenturm, und genau das ist die Entscheidung.
   *
   *  Die Flaeche wird gebacken und nur neu gerechnet, wenn sich Turmsorte
   *  oder Turmbestand aendern - sonst waeren es zehntausend Pruefungen je Bild.
   */
  private buildMask: HTMLCanvasElement | null = null;
  private buildMaskKey = '';
  private buildFenster: HTMLCanvasElement | null = null;

  private drawBuildOverlay(s: GameState): void {
    if (!s.buildChoice) return;
    const ctx = this.ctx;
    const def = TOWERS[s.buildChoice];
    const affordable = s.gold >= def.base.cost;
    const key = `${s.map.id}|${s.buildChoice}|${s.towersVersion}|${affordable}`;

    if (this.buildMaskKey !== key) {
      // Ein Punktraster statt einer Farbfläche.
      //
      // Vorher wurde eine Maske im 12-Pixel-Raster erzeugt und dann weich auf
      // die volle Feldgröße hochgezogen. Daraus wurde ein verwaschener grüner
      // Schleier über der halben Karte: Man sah, DASS irgendwo gebaut werden
      // kann, aber nicht WO genau.
      //
      // Der erste Punktraster-Versuch löste das, sah aber aufgedruckt aus -
      // gemeldet als "passt nicht ins Level". Drei Gründe, alle behoben:
      //
      //   * **Die Farbe war fremd.** Neongrün #5BE07A kommt in diesem Spiel
      //     nirgends vor. Jetzt das Kristall-Türkis der Oberfläche.
      //   * **Die Punkte lagen auf der Karte, nicht darin.** Harte Kreise mit
      //     scharfer Kante. Jetzt ein weicher Verlauf mit dunklem Ring
      //     darunter - derselbe Kontaktschatten wie bei Türmen und Gegnern.
      //   * **Das Raster war mechanisch.** Gleiche Größe überall wie
      //     Millimeterpapier. Jetzt schwankt der Punkt leicht mit seinem Ort,
      //     sodass das Muster lebt statt gedruckt zu wirken.
      const STEP = 48;
      const cv = document.createElement('canvas');
      cv.width = WORLD_W;
      cv.height = WORLD_H;
      const g = cv.getContext('2d')!;
      const ton = affordable ? C.crystal : C.danger;
      for (let wy = STEP / 2; wy < WORLD_H; wy += STEP) {
        for (let wx = STEP / 2; wx < WORLD_W; wx += STEP) {
          if (!s.canPlace(s.buildChoice, wx, wy)) continue;
          // Eine ruhige Schwankung aus dem Ort selbst - kein Zufall, damit
          // das Bild bei gleichem Spielstand gleich aussieht.
          const wellen = Math.sin(wx * 0.021) * Math.cos(wy * 0.019);
          const r = 4.6 + wellen * 1.1;

          // Kontaktschatten: der Punkt liegt auf dem Boden.
          g.fillStyle = hexA(C.ink, 0.30);
          g.beginPath();
          g.ellipse(wx, wy + r * 0.5, r * 1.15, r * 0.6, 0, 0, Math.PI * 2);
          g.fill();

          // Weicher Punkt statt harter Scheibe.
          const scheibe = g.createRadialGradient(wx, wy, 0, wx, wy, r);
          scheibe.addColorStop(0, hexA(ton, 0.95));
          scheibe.addColorStop(0.6, hexA(ton, 0.7));
          scheibe.addColorStop(1, hexA(ton, 0));
          g.fillStyle = scheibe;
          g.beginPath();
          g.arc(wx, wy, r, 0, Math.PI * 2);
          g.fill();
        }
      }

      this.buildMask = cv;
      this.buildMaskKey = key;
    }

    // Nur dort zeigen, wo die Entscheidung faellt.
    //
    // Zweimal gemeldet als "passt nicht ins Level", und zweimal habe ich an
    // der Farbe gedreht. Gemessen sind es auf der Frostkarte **311 Punkte
    // gleichzeitig** - das ist eine Tapete ueber der ganzen Landschaft, egal
    // wie sie eingefaerbt ist. Das Bild war nicht falsch gefaerbt, es war zu
    // viel davon da.
    //
    // Gebraucht wird die Auskunft nur an einer Stelle: dort, wo der Finger
    // gerade ist. Dort sind es rund fuenfzehn Punkte, und die Karte bleibt
    // sonst frei. Wer weiter weg bauen will, zieht den Finger dorthin - und
    // die Auskunft wandert mit.
    const at = s.pendingPoint ?? s.hoverPoint;
    if (!at) return;

    const SICHT = 330;
    const beat = 0.5 + 0.5 * Math.sin(s.crystalPulse * 2.4);
    if (!this.buildFenster) {
      this.buildFenster = document.createElement('canvas');
      this.buildFenster.width = SICHT * 2;
      this.buildFenster.height = SICHT * 2;
    }
    const f = this.buildFenster.getContext('2d')!;
    f.clearRect(0, 0, SICHT * 2, SICHT * 2);
    f.drawImage(this.buildMask!, at.x - SICHT, at.y - SICHT, SICHT * 2, SICHT * 2,
      0, 0, SICHT * 2, SICHT * 2);
    // Zum Rand hin ausblenden, damit kein Kreis mit Kante entsteht.
    f.globalCompositeOperation = 'destination-in';
    const blende = f.createRadialGradient(SICHT, SICHT, SICHT * 0.35, SICHT, SICHT, SICHT);
    blende.addColorStop(0, 'rgba(0,0,0,1)');
    blende.addColorStop(0.7, 'rgba(0,0,0,0.55)');
    blende.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = blende;
    f.fillRect(0, 0, SICHT * 2, SICHT * 2);
    f.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalAlpha = (affordable ? 0.62 : 0.42) + beat * 0.08;
    ctx.drawImage(this.buildFenster, at.x - SICHT, at.y - SICHT);
    ctx.restore();
  }

  /** Die Vorschau beim Versetzen.
   *
   *  Absichtlich dieselbe Formensprache wie die Bauvorschau: gestrichelter
   *  Kreis fuer den Platzbedarf, voller Kreis fuer die Reichweite, rot wenn
   *  es nicht geht. Wer einmal gebaut hat, muss nichts Neues lernen - es ist
   *  dieselbe Frage ("passt der Turm hier hin?") und verdient dieselbe
   *  Antwort.
   *
   *  Zusaetzlich eine Linie vom alten zum neuen Ort. Ohne sie sieht man zwei
   *  Kreise und weiss nicht, welcher der Turm ist, den man gerade haelt. */
  private drawVersetzen(s: GameState): void {
    const t = s.movingTower, ziel = s.movePoint;
    if (!t || !ziel) return;
    const ctx = this.ctx;
    const def = TOWERS[t.def];
    const st = s.towerStats(t);
    const x = ziel.x, y = ziel.y;
    const ok = s.canPlace(t.def, x, y, t);
    const tone = ok ? accentFor(def, t.branch) : C.danger;

    ctx.save();
    ctx.strokeStyle = hexA(tone, 0.5);
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = hexA(tone, 0.2);
    ctx.beginPath(); ctx.arc(x, y, def.footprint / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(tone, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, def.footprint / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    this.reichweite(x, y, st.range, tone);
    ctx.restore();
  }

  /** Alle Reichweiten auf einmal - solange der Finger liegen bleibt.
   *
   *  Wozu: welche Ecke des Feldes niemand abdeckt, sieht man einem Feld aus
   *  zwoelf Tuermen nicht an. Einzeln antippen beantwortet die Frage nicht,
   *  weil man immer nur einen Ring zur Zeit sieht und den vorigen schon
   *  wieder vergessen hat.
   *
   *  Sehr blass gezeichnet, und mit Absicht: zwoelf Ringe in voller Deckung
   *  waeren eine weisse Flaeche. Was zaehlt, ist wo sich NICHTS ueberlagert. */
  /** Die Reichweite als Bodenmarkierung, nicht als technischer Umriss.
   *
   *  Bis v129 war sie ein 3 Punkte starker heller Kreis mit flacher Fuellung.
   *  Auf einem fotografierten Untergrund liest sich das als Overlay, das
   *  jemand ueber das Bild gelegt hat - es liegt VOR der Welt statt IN ihr.
   *  In der Nahaufnahme kreuzten sich drei solcher Ringe quer ueber Weg,
   *  Gelaende und Tuerme.
   *
   *  Was eine Flaeche auf den Boden legt, sind drei Dinge:
   *
   *   - Ein VERLAUF nach aussen statt einer gleichmaessigen Fuellung. Licht
   *     auf dem Boden ist in der Mitte dichter.
   *   - Eine WEICHE Kante: der Ring bekommt seine Staerke aus einem schmalen
   *     Verlauf, nicht aus einer Linie mit fester Breite.
   *  NICHT gestaucht, obwohl alles andere im Bild flach liegt - Schatten,
   *  Kontaktzonen, die Zielplattform. Der erste Entwurf staucht sie auf 0,62,
   *  und das war falsch: die Reichweite ist im MODELL ein Kreis, der Schaden
   *  richtet sich nach dem euklidischen Abstand. Eine Ellipse wuerde dem
   *  Spieler erzaehlen, hinten sei weniger abgedeckt als seitlich - und das
   *  stimmt nicht.
   *
   *  **Stauchen ist fuer einen Schatten richtig und fuer eine Auskunft
   *  falsch.** Der Schatten ist eine Erfindung des Bildes, die Reichweite ist
   *  eine Aussage ueber die Regeln.
   *
   *  Eine Stelle fuer alle drei Aufrufer (Auswahl, Vorschau, alle Ringe):
   *  vorher stand dieselbe Zeichnung dreimal da und lief bereits auseinander
   *  - 0,10 gegen 0,11 Fuellung, 0,60 gegen 0,70 Linie (Regel 15). */
  private reichweite(x: number, y: number, r: number, tone: string, stark = 1): void {
    const ctx = this.ctx;
    ctx.save();
    // Die Fuellung bleibt schwach: sie deckt eine grosse Flaeche, und was
    // eine grosse Flaeche deckt, waescht das Bild aus. Der erste Entwurf ging
    // bis 0,17 am Rand - der halbe Bildschirm wurde blass.
    const fuellung = ctx.createRadialGradient(x, y, r * 0.30, x, y, r);
    fuellung.addColorStop(0, hexA(tone, 0.015 * stark));
    fuellung.addColorStop(0.72, hexA(tone, 0.05 * stark));
    fuellung.addColorStop(1, hexA(tone, 0.09 * stark));
    ctx.fillStyle = fuellung;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Die Kante: ein schmaler Verlauf statt einer Linie. Er endet weich nach
    // aussen, wie ein Lichtsaum auf dem Boden.
    const kante = ctx.createRadialGradient(x, y, r * 0.93, x, y, r * 1.02);
    kante.addColorStop(0, hexA(tone, 0));
    kante.addColorStop(0.6, hexA(tone, 0.55 * stark));
    kante.addColorStop(1, hexA(tone, 0));
    ctx.fillStyle = kante;
    ctx.beginPath(); ctx.arc(x, y, r * 1.02, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  private drawAlleReichweiten(s: GameState): void {
    if (!s.zeigeReichweiten) return;
    const ctx = this.ctx;
    ctx.save();
    for (const t of s.towers) {
      const def = TOWERS[t.def];
      const st = s.towerStats(t);
      const tone = accentFor(def, t.branch);
      // Deckung angehoben nach dem ersten Blick: bei 0,07 Fuellung und 0,42
      // Linie war auf dem Untergrund kaum etwas zu sehen, und eine Anzeige,
      // die man suchen muss, beantwortet keine Frage.
      this.reichweite(t.x, t.y, st.range, tone);
    }
    ctx.restore();
  }

  /** Warum hier nichts gebaut werden konnte - ein Wort, dort wo der Finger
   *  war, und nach einer Sekunde weg.
   *
   *  Bewusst auf der Leinwand und nicht in HTML: er gehoert an eine Stelle im
   *  FELD, und die verschiebt sich beim Schwenken mit. Ein HTML-Kaestchen
   *  muesste jedes Bild nachgerechnet werden - dieselbe Doppelung, die Regel
   *  15 meint. */
  private drawHinweis(s: GameState): void {
    const h = s.hinweis;
    if (!h) return;
    const rest = h.bis - s.time;
    if (rest <= 0) { s.hinweis = null; return; }
    const ctx = this.ctx;
    // Die letzten 0,35 s ausblenden, damit er nicht abgeschnitten verschwindet.
    const a = Math.min(1, rest / 0.35);
    // Er steigt ein Stueck - so unterscheidet er sich von allem, was steht.
    const y = h.y - 26 - (1 - Math.min(1, rest / 1.1)) * 14;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const b = ctx.measureText(h.text).width + 34;
    ctx.fillStyle = hexA(C.ink, 0.82);
    roundRect(ctx, h.x - b / 2, y - 21, b, 42, 12);
    ctx.fill();
    ctx.strokeStyle = hexA(C.danger, 0.85);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.danger;
    ctx.fillText(h.text, h.x, y);
    ctx.restore();
  }

  /** Wo wird gebaut? Ein Ring an der gewaehlten Stelle.
   *
   *  Bis v124 gab es ihn nicht: man tippte, irgendwo erschien ein Menue, und
   *  auf welchen Punkt es sich bezog, stand nirgends. Ein Menue ohne Anker
   *  ist ein Menue ueber nichts.
   *
   *  Gezeigt wird der Platzbedarf des kleinsten Turms - er ist der, der ueber
   *  "geht hier ueberhaupt etwas" entscheidet. */
  /** Der Lichtteich um den Kristall.
   *
   *  Der andere Weg zur Einbettung, und der bessere. Bis v127 wurde die
   *  Kristallfestung farblich zur Karte gezogen - das schliesst die Haelfte
   *  des Abstands und stoesst dann an eine Wand: bei voller Angleichung waere
   *  sie auf dem Spiralhain braun, und ihr Blau IST ihre Identitaet.
   *
   *  Also andersherum. Der Kristall leuchtet, und was leuchtet, faerbt seine
   *  Umgebung. Der Boden um die Zielplattform nimmt seine Farbe an - nach
   *  aussen auslaufend. Damit ist der Farbuebergang ein VERLAUF IN DER WELT
   *  statt einer Kante an der Silhouette, und genau daran erkennt das Auge,
   *  ob etwas dazugehoert.
   *
   *  Erzaehlerisch ist es ausserdem richtig herum: nicht die Festung passt
   *  sich der Asche an, die Asche liegt im Licht der Festung.
   *
   *  Gezeichnet nach dem Untergrund und VOR allem, was darauf steht - der
   *  Teich liegt auf dem Boden, nicht ueber den Tuermen. Und ohne
   *  Mischmodus: `lighter` ist auf Safari die Falle aus Regel 11. Ein
   *  gewoehnlicher Verlauf mit kleiner Deckung tut dasselbe und ist sicher. */
  private lichtteich(s: GameState): void {
    const z = s.map.ziel;
    if (!z || LICHTTEICH <= 0) return;
    const ctx = this.ctx;
    // Der Teich atmet mit dem Kristall - dieselbe Schwingung, damit er zu
    // ihm gehoert und nicht daneben pulsiert.
    const puls = 0.9 + Math.sin(s.time * 1.4) * 0.1;
    ctx.save();
    // Weit und sehr schwach: das ist das Klima.
    const weit = ctx.createRadialGradient(z.x, z.y, 60, z.x, z.y, 520 * puls);
    weit.addColorStop(0, hexA(C.crystal, 0.13 * LICHTTEICH));
    weit.addColorStop(0.45, hexA(C.crystal, 0.06 * LICHTTEICH));
    weit.addColorStop(1, hexA(C.crystal, 0));
    ctx.fillStyle = weit;
    ctx.fillRect(z.x - 560, z.y - 560, 1120, 1120);
    // Eng und heller: das ist das Licht.
    const eng = ctx.createRadialGradient(z.x, z.y, 10, z.x, z.y, 210 * puls);
    eng.addColorStop(0, hexA(C.crystal, 0.20 * LICHTTEICH));
    eng.addColorStop(1, hexA(C.crystal, 0));
    ctx.fillStyle = eng;
    ctx.fillRect(z.x - 230, z.y - 230, 460, 460);
    ctx.restore();
  }

  private drawBauplatz(s: GameState): void {
    if (!s.buildAt || s.vorschau || s.buildChoice) return;
    const ctx = this.ctx;
    const { x, y } = s.buildAt;
    const r = Math.min(...TOWER_ORDER.map((id) => TOWERS[id].footprint)) / 2;
    const puls = 0.75 + Math.sin(s.time * 4) * 0.25;
    ctx.save();
    ctx.fillStyle = hexA(C.crystal, 0.14);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(C.crystal, 0.5 + puls * 0.4);
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 7]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Ein Kreuz in der Mitte: der Ring allein sagt "hier herum", das Kreuz
    // sagt "genau hier". Beim Einrasten ist das der Unterschied zwischen
    // "der hat meinen Tipp verschoben" und "der hat ihn verstanden".
    ctx.strokeStyle = hexA(C.crystal, 0.9);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y);
    ctx.moveTo(x, y - 13); ctx.lineTo(x, y + 13);
    ctx.stroke();
    ctx.restore();
  }

  private drawGhost(s: GameState): void {
    // Die Vorfuehrung hat Vorrang: sie beantwortet gerade eine Frage.
    const v = s.vorschau;
    const at = v ? { x: v.x, y: v.y } : (s.pendingPoint ?? (s.buildChoice ? s.hoverPoint : null));
    const wahl = v ? v.id : s.buildChoice;
    if (!at || !wahl) return;
    const ctx = this.ctx;
    const def = TOWERS[wahl];
    // Ueber statsFor, damit die Vorschau dieselbe Reichweite zeigt wie der
    // gebaute Turm - die Rohdaten tragen keine mehr.
    const lvl = statsFor(def, null, 1);
    const x = snap(at.x), y = snap(at.y);
    const ok = s.canPlace(wahl, x, y) && s.gold >= lvl.cost;
    const tone = ok ? def.accent : C.danger;

    ctx.save();
    // Der Platzbedarf als eigener Kreis - er ist die eigentliche Groesse,
    // ueber die man beim freien Bauen entscheidet.
    ctx.fillStyle = hexA(tone, 0.2);
    ctx.beginPath(); ctx.arc(x, y, def.footprint / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(tone, 0.9); ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(x, y, def.footprint / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    this.reichweite(x, y, lvl.range, tone, 1.15);

    if (ok) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(tone, 0.55);
      ctx.lineWidth = 12;
      const r2 = lvl.range * lvl.range;
      for (const lane of s.lanes) {
        let drawing = false;
        ctx.beginPath();
        for (const p of lane.pts) {
          const inside = (p.x - x) ** 2 + (p.y - y) ** 2 <= r2;
          if (inside && !drawing) { ctx.moveTo(p.x, p.y); drawing = true; }
          else if (inside) ctx.lineTo(p.x, p.y);
          else if (drawing) { ctx.stroke(); ctx.beginPath(); drawing = false; }
        }
        if (drawing) ctx.stroke();
      }
      ctx.restore();
    }

    ctx.globalAlpha = ok ? 0.7 : 0.3;
    this.paintTower(def, 1, x, y, s.crystalPulse, s.map.id);
    ctx.restore();
  }



  /** Wie nah der naechste Gegner dem Kristall schon ist - 0 bis 1.
   *
   *  Gemessen an der RESTSTRECKE, nicht am Luftabstand: ein Gegner kann
   *  zwanzig Weltpunkte neben dem Kristall stehen und noch eine halbe Runde
   *  vor sich haben. Die Strecke ist das, was zaehlt.
   *
   *  Die letzten 260 Weltpunkte sind der Warnbereich. Bei der langsamsten
   *  Art (Leerentitan, 53 Punkte je Sekunde) sind das fuenf Sekunden, bei
   *  der schnellsten (Spaeher, 206) eineinviertel - genug, um eine Faehigkeit
   *  zu zuenden, und zu wenig, um noch einen Turm zu bauen. Genau das soll
   *  die Warnung sagen: jetzt oder nie. */
  private kristallNot(s: GameState): number {
    const WARNSTRECKE = 260;
    let naehe = 0;
    for (const e of s.enemies) {
      if (e.dead) continue;
      const bahn = s.lanes[e.lane] ?? s.lanes[0];
      const rest = bahn.length - e.travelled;
      if (rest > WARNSTRECKE) continue;
      naehe = Math.max(naehe, 1 - Math.max(0, rest) / WARNSTRECKE);
    }
    return naehe;
  }

  private drawCrystal(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    // Gezeichnet wird auf der PLATTE, getroffen wird am Bahnende.
    //
    // Jede Karte bringt im Untergrundbild eine gemauerte Rundplattform mit -
    // der Ort, den der Kuenstler fuer das Ziel gebaut hat. Die Bahnen enden
    // an ihrem RAND: 102 Weltpunkte daneben auf dem Spiralhain, 164 auf der
    // Laubschlucht, 99 auf der Frostspalte. Die Festung stand deshalb oben
    // links auf dem Rand statt in der Mitte.
    //
    // Seit v131 ist `goalOf` selbst dieser Punkt - Bild und Modell stimmen
    // wieder ueberein, und die Gegner laufen bis in die Mitte der Festung.
    // Der Rueckfall auf `s.goal` bleibt fuer eine Karte ohne eingetragene
    // Platte stehen.
    const { x, y } = s.map.ziel ?? s.goal;
    const t = s.crystalPulse;

    // --- Warnung: es kommt jemand durch.
    //
    // Sie liegt UNTER dem Bauwerk, nicht darueber. Eine Warnung, die den
    // Kristall verdeckt, nimmt einem den Blick auf das, wovor sie warnt.
    {
      const not = this.kristallNot(s);
      if (not > 0.01) {
        const takt = 0.55 + 0.45 * Math.sin(s.time * (5 + not * 6));
        const r = 150 + not * 120;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 0.55);
        const g = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
        g.addColorStop(0, hexA(C.danger, 0));
        g.addColorStop(0.72, hexA(C.danger, 0.10 + 0.26 * not * takt));
        g.addColorStop(1, hexA(C.danger, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = hexA(C.danger, 0.25 + 0.5 * not * takt);
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    const health = Math.max(0, s.lives) / Math.max(1, s.maxLives);
    // Das Bauwerk steht still.
    //
    // Frueher atmete es: die ganze Burg wuchs und schrumpfte im Takt. Bei
    // einer gemalten Kristallform ging das durch - sie war ohnehin ein
    // Leuchtzeichen. Ein Bauwerk aus Stein, das sich hebt und senkt, sieht
    // aus, als schwebe es ueber dem Boden. Was pulsiert, ist nur noch das
    // Licht, und auch das ruhiger als vorher.
    const pulse = 1;
    const glowR = (95 + Math.sin(t * 2) * 4) * (0.55 + health * 0.45);

    // Lichtpfuetze auf dem Boden - der Kristall beleuchtet seine Umgebung,
    // statt nur selbst zu leuchten.
    if (hi) {
      ctx.save();
      ctx.translate(x, y + 26);
      ctx.scale(1, 0.42);
      stampGlow(ctx, C.crystal, 0, 0, glowR * 2.1, 0.4);
      ctx.restore();
    }
    stampGlow(ctx, C.crystal, x, y, glowR, hi ? 0.9 : 0.55);
    if (s.crystalHit > 0) stampGlow(ctx, C.danger, x, y, 125, s.crystalHit * 0.8);

    // Ist das Bild da, wird es gezeichnet - sonst die gemalte Form darunter.
    // EINGEBETTET, nicht roh. Bis v125 wurde hier `getObjectArt` gestempelt -
    // die Festung war die einzige grosse Figur im Bild, die ihr eigenes Licht
    // und ihre eigene Farbwelt behielt.
    //
    // Schwaecher als bei einem Turm (0,72): sie wird dreimal so gross
    // gezeichnet, und derselbe Anstrich waere auf dieser Flaeche eine
    // Waschung statt einer Beleuchtung.
    const burg = getObjectArtEingebettet('crystal', s.map.id, 0.72);
    if (burg) {
      const b = 300 * pulse;
      const h = b * (burg.height / burg.width);
      ctx.save();
      // KEIN eigenes Podest mehr.
      //
      // In v126 stand hier eines, und es war damals richtig: die Festung
      // stand NEBEN der Platte des Kuenstlers und brauchte einen Boden.
      // Seit sie auf der Platte steht, legt ein gezeichnetes Podest eine
      // zweite Scheibe ueber die erste - und zwar eine mit anderer
      // Perspektive, weil eine Ellipse mit festem Verhaeltnis flacher liegt
      // als die gemalte Platte. Zwei Boeden sind schlimmer als keiner.
      // Schatten in Lichtrichtung, wie bei allem anderen.
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.ellipse(x + LICHT.x * 60, y + LICHT.y * 26, b * 0.36, b * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Kontaktschatten unter der Burg.
      ctx.globalAlpha = 0.52;
      ctx.beginPath();
      ctx.ellipse(x, y + b * 0.03, b * 0.30, b * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Bei Treffern zuckt die Burg rot, wie jeder andere Getroffene auch.
      ctx.drawImage(burg, x - b / 2, y - h * 0.74, b, h);
      if (s.crystalHit > 0.01) {
        ctx.globalAlpha = s.crystalHit * 0.5;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = C.danger;
        ctx.fillRect(x - b / 2, y - h * 0.74, b, h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = hexA(C.ink, 0.45);
    ctx.beginPath(); ctx.ellipse(0, 48, 62, 21, 0, 0, Math.PI * 2); ctx.fill();
    // Ein gestufter Sockel gibt dem Kristall Stand und Groesse.
    ctx.fillStyle = '#1D2436';
    ctx.beginPath();
    ctx.moveTo(-56, 48); ctx.lineTo(56, 48); ctx.lineTo(43, 28); ctx.lineTo(-43, 28);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2A3348';
    ctx.beginPath();
    ctx.moveTo(-43, 28); ctx.lineTo(43, 28); ctx.lineTo(34, 11); ctx.lineTo(-34, 11);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = hexA('#FFFFFF', 0.12);
    ctx.fillRect(-43, 27, 86, 3);

    ctx.scale(pulse, pulse);
    ctx.translate(0, -20);
    const h = 82, w = 42;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(w, -10); ctx.lineTo(0, 30); ctx.lineTo(-w, -10);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-w, -h, w, 30);
    grad.addColorStop(0, '#EAFFFE');
    grad.addColorStop(0.45, C.crystal);
    grad.addColorStop(1, C.crystalDeep);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = hexA('#EAFFFE', 0.8); ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = hexA('#FFFFFF', 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(0, 30);
    ctx.moveTo(-w, -10); ctx.lineTo(w, -10);
    ctx.moveTo(0, -h); ctx.lineTo(-w * 0.55, 10);
    ctx.moveTo(0, -h); ctx.lineTo(w * 0.55, 10);
    ctx.stroke();

    // Risse: der Spielstand ist ein Gegenstand in der Welt, keine Zahl.
    const cracks = Math.round((1 - health) * 6);
    if (cracks > 0) {
      const rnd = makeRng(99);
      ctx.strokeStyle = hexA(C.ink, 0.65); ctx.lineWidth = 2;
      for (let i = 0; i < cracks; i++) {
        const sx = (rnd() - 0.5) * w * 1.4;
        const sy = -h + rnd() * (h + 28);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (rnd() - 0.5) * 18, sy + 10 + rnd() * 14);
        ctx.lineTo(sx + (rnd() - 0.5) * 24, sy + 24 + rnd() * 12);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Die Huellen gefallener Gegner: kippen, schrumpfen, verblassen. */
  /** Eine gefallene Huelle. Steht wie alles andere in der Szenenliste. */
  private huelleMalen(s: GameState, h: Husk): void {
    const ctx = this.ctx;
    {
      const k = 1 - h.t;
      ctx.save();
      ctx.globalAlpha = k * 0.85;
      ctx.translate(h.x, h.y - h.alt);
      ctx.rotate(h.angle);
      const shrink = 0.5 + k * 0.5;
      const art = getEnemyArt(h.def, false, s.map.id);
      if (art) {
        const w = enemyArtWidth(h.def) * shrink;
        const hh = w * (art.height / art.width);
        ctx.drawImage(art, -w / 2, -hh * 0.72, w, hh);
      } else {
        drawSprite(ctx, getEnemySprite(h.def, false, h.frame), 0, 0, shrink);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawRings(s: GameState): void {
    const ctx = this.ctx;
    for (const r of s.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.75;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * a + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Alles, was auf dem Boden STEHT - in der Reihenfolge, in der man es
   *  sieht: von hinten nach vorn.
   *
   *  Bis v139 wurde nach KATEGORIE gezeichnet: erst alle Tuerme, dann alle
   *  Huellen, dann alle Gegner. Damit lag jeder Gegner vor jedem Turm, auch
   *  wenn er zwei Turmhoehen weiter hinten lief. Nichts verdeckte je etwas,
   *  und genau das ist der Grund, warum ein Feld aus plastischen Einzelbildern
   *  flach aussah. Es ist der groesste einzelne Hebel fuer den Raumeindruck -
   *  und er kostet keine neuen Bilder, nur eine andere Reihenfolge.
   *
   *  Drei Schichten, und die Trennung hat je einen Grund:
   *
   *   1. **Der Boden.** Schatten gehoeren zur Erde und liegen unter allem,
   *      was auf ihr steht. Zusammen mit den Koerpern sortiert liefe der
   *      Schatten eines nahen Gegners ueber den Fuss eines entfernten.
   *   2. **Das Stehende**, nach der Standlinie sortiert. Die Standlinie ist
   *      `y` - der Punkt, an dem die Figur den Boden beruehrt -, nicht ihre
   *      Mitte und nicht ihre Oberkante.
   *   3. **Die Luft.** Ein Flieger steht auf nichts; er gehoert ueber alles,
   *      was steht, sonst verschwindet er hinter einem Turm, unter dem er
   *      hindurchfliegt. */
  private zeichneStand(s: GameState, hi: boolean): void {
    // --- 1. Boden.
    //
    // Die Kristallburg bringt ihren Schatten selbst mit, statt ihn hier
    // abzugeben: er haengt an Masszahlen, die tief in ihrer Zeichnung
    // stehen, und ihn herauszuloesen hiesse, sie ein zweites Mal
    // auszurechnen (Regel 15). Der Preis ist gering - die Burg steht am
    // Rand, und was hinter ihr steht, steht in ihrem Grundriss.
    this.turmAuskunftBoden(s);
    for (const t of s.towers) this.turmBoden(s, t);
    for (const e of s.enemies) this.gegnerBoden(s, e);
    this.bossLeuchten(s);

    // --- 2. Das Stehende, nach der Standlinie.
    //
    // Die Liste wird je Bild neu gebaut. Bei 29 Tuermen und 60 Gegnern sind
    // das rund 90 Eintraege - gemessen unter einem Zehntel dessen, was ein
    // einziges gezeichnetes Bild kostet.
    const stand: { y: number; mal: () => void }[] = [];
    stand.push({ y: s.goal.y, mal: () => this.drawCrystal(s, hi) });
    for (const t of s.towers) stand.push({ y: t.y, mal: () => this.turmMalen(s, t, hi) });
    for (const h of s.husks) stand.push({ y: h.y, mal: () => this.huelleMalen(s, h) });
    for (const e of s.enemies) {
      if (ENEMIES[e.def].flying) continue;
      stand.push({ y: e.y, mal: () => this.gegnerMalen(s, e, hi) });
    }
    stand.sort((a, b) => a.y - b.y);
    for (const o of stand) o.mal();

    // --- 3. Luft.
    for (const e of s.enemies) if (ENEMIES[e.def].flying) this.gegnerMalen(s, e, hi);

    this.turmLeuchten(s, hi);
  }

  /** Was VOR den Figuren auf dem Boden liegt: die Reichweite des gewaehlten
   *  Turms und die Ersatzbilder, falls noch keine echten da sind.
   *
   *  Die Reichweite gehoert unter die Figuren, nicht darueber. Als Scheibe
   *  ueber dem Feld faerbt sie jeden Gegner ein, der darin steht - und der
   *  Ring soll sagen, wie weit der Turm reicht, nicht, wie die Welt aussieht. */
  private turmAuskunftBoden(s: GameState): void {
    const ctx = this.ctx;
    if (this.towerLayerVersion !== s.towersVersion ||
      this.towerArtVersionAt !== towerArtVersion()) this.bakeTowerLayer(s);
    if (this.towerLayer) ctx.drawImage(this.towerLayer, 0, 0);

    const sel = s.selectedTower;
    if (sel) {
      const def = TOWERS[sel.def];
      const st = statsFor(def, sel.branch, sel.level);
      const tone = accentFor(def, sel.branch);
      ctx.fillStyle = hexA(tone, 0.12);
      ctx.beginPath(); ctx.arc(sel.x, sel.y, st.range, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexA(tone, 0.75); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, st.range, 0, Math.PI * 2); ctx.stroke();
    }
  }

  /** Das Leuchten der Tuerme: Umkreispuls, Muendungsblitz. Licht liegt ueber
   *  allem, was steht - es faellt schliesslich darauf. */
  private turmLeuchten(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    if (hi) {
      beginGlowBatch(ctx);
      for (const t of s.towers) {
        const def = TOWERS[t.def];
        const tone = accentFor(def, t.branch);
        if (def.attack === 'aura' || def.attack === 'chain') {
          stampGlowFast(ctx, tone, t.x, t.y - 8, 36, 0.5);
        }
        // Muendungsblitz: erhellt kurz die Stellung und den Boden davor.
        if (t.flash > 0.02) {
          const st = s.towerStats(t);
          const reach = def.attack === 'aura' ? 0 : 26;
          stampGlowFast(ctx, tone,
            t.x + Math.cos(t.angle) * reach, t.y + Math.sin(t.angle) * reach,
            44 + t.flash * 16, t.flash * 0.75);
          void st;
        }
      }
      endGlowBatch(ctx);
    }
  }

  /** EIN Turm, mit allem, was zu ihm gehoert: Schatten, Fuss, Bild, Waffe.
   *
   *  Seit v140 wird er nicht mehr in einer Schleife ueber alle Tuerme
   *  gezeichnet, sondern aus der SZENENLISTE heraus - zusammen mit Gegnern,
   *  Huellen und der Kristallburg, sortiert nach dem Ort, an dem er steht.
   *  Erst dadurch kann ein Gegner hinter einem Turm verschwinden. */
  /** Der Bodenteil EINES Turms: Schlagschatten, Kontaktschatten, Zweigring.
   *
   *  Getrennt vom Koerper und VOR der Szenenliste gezeichnet - Schatten
   *  gehoeren zur Erde. Laege der Schatten beim Koerper, fiele der eines
   *  nahen Turms ueber den Fuss eines entfernten. */
  private turmBoden(s: GameState, t: Tower): void {
    const ctx = this.ctx;
    const def = TOWERS[t.def];
    const art = getTowerArt(t.def, t.branch, t.level, s.map.id);
    if (!art) return;
    const masse = this.artMasse(t.def, t.branch, t.level, art);
    const w = masse.w, h = masse.h;
    // Der Schlagschatten - der eigene Umriss, nicht mehr eine Ellipse.
    //
    // Bis v59 warfen gerenderte Tuerme gar keinen. Bis v127 warfen sie
    // alle DENSELBEN: eine Ellipse, gleich fuer den Moerser mit seinem
    // Rohr wie fuer den Bogenturm. Ein Schatten sagte damit nur "hier
    // steht etwas" - er sagte nicht, was.
    //
    // Zwei Schatten, nicht einer. Der Schlagschatten faellt in
    // Lichtrichtung und sagt, woher die Sonne kommt. Er allein reicht
    // nicht: gemessen waren die Tuerme an ihrem Fuss 21 Prozent HELLER
    // als der Boden daneben - sie lagen auf der Landschaft statt darin.
    // Was fehlt, ist der Kontaktschatten darunter, die enge dunkle Zone,
    // wo kein Licht hinkommt. Erst beide zusammen setzen einen
    // Gegenstand auf den Boden.
    const fuss = TOWERS[def.id].footprint / 2;
    ctx.save();
    {
      const riss = getSchattenriss(
        art, `turm:${t.def}:${t.branch}:${t.level}`, w, h,
      );
      // Am Fuss ansetzen. Die Laenge des Schattens erzaehlt die Hoehe:
      // wuchs der Turm nach oben, ohne dass der Schatten mitwaechst,
      // liest das Auge keinen hoeheren Turm, sondern einen naeher
      // stehenden - bei fester Sonne ist die Schattenlaenge die einzige
      // Hoehenangabe, die ein Bild von oben ueberhaupt machen kann.
      drawSprite(ctx, riss, t.x, t.y);
    }

    // Weich auslaufend statt als Flecken.
    //
    // Zwei uebereinandergelegte Ellipsen mit fester Deckung sahen selbst
    // wie ein Aufkleber aus - ein dunkler Ring mit sichtbarer Kante unter
    // dem Turm. Ein echter Kontaktschatten ist innen dicht und verliert
    // sich nach aussen. Ausserdem war er breiter als der Turm; jetzt
    // endet er knapp innerhalb der Standflaeche.
    ctx.globalAlpha = 1;
    const kontakt = ctx.createRadialGradient(
      t.x, t.y + fuss * 0.08, fuss * 0.12,
      t.x, t.y + fuss * 0.08, fuss * 0.92,
    );
    kontakt.addColorStop(0, hexA(C.ink, 0.52));
    kontakt.addColorStop(0.55, hexA(C.ink, 0.26));
    kontakt.addColorStop(1, hexA(C.ink, 0));
    ctx.save();
    ctx.translate(t.x, t.y + fuss * 0.08);
    ctx.scale(1, 0.38);
    ctx.translate(-t.x, -(t.y + fuss * 0.08));
    ctx.fillStyle = kontakt;
    ctx.beginPath();
    ctx.arc(t.x, t.y + fuss * 0.08, fuss * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // Ein Farbring am Fuss zeigt den Ausbauzweig.
    //
    // Solange die Zweige auf dieselben Bilder zurueckfallen, sieht ein
    // Scharfschuetze aus wie eine Salve - man kann seinem eigenen Feld
    // nicht ansehen, wie es gebaut ist. Der Ring ist die kleinste
    // ehrliche Antwort darauf: er behauptet nicht, ein anderes Bauwerk zu
    // sein, sondern markiert die Entscheidung.
    if (t.branch !== null) {
      // Groesser als der Turmfuss, sonst liegt der Ring dahinter.
      const ring = TOWERS[def.id].footprint * 0.86;
      ctx.save();
      ctx.translate(t.x, t.y + TOWERS[def.id].footprint * 0.1);
      ctx.scale(1, 0.4);
      ctx.strokeStyle = hexA(accentFor(TOWERS[def.id], t.branch), 0.85);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, ring, 0, Math.PI * 2);
      ctx.stroke();
      // Ein zweiter, feinerer Ring fuer den zweiten Zweig - so sind sie
      // auch ohne Farbsehen zu unterscheiden.
      if (t.branch === 1) {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ring * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private turmMalen(s: GameState, t: Tower, hi: boolean): void {
    const ctx = this.ctx;
    void hi;
    const def = TOWERS[t.def];
    if (def.attack === 'aura' && t.pulse > 0) {
      ctx.strokeStyle = hexA(accentFor(def, t.branch), t.pulse * 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, s.towerStats(t).range * (1 - t.pulse * 0.15), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Bei gerenderten Tuermen entfaellt die drehbare Waffe: ein Objekt in
    // Dreiviertelansicht kippt, wenn man es in der Flaeche dreht. Statt zu
    // drehen wird gespiegelt, sobald das Ziel links steht.
    const art = getTowerArt(t.def, t.branch, t.level, s.map.id);
    if (art) {
      const masse = this.artMasse(t.def, t.branch, t.level, art);
      const w = masse.w, h = masse.h;

      // Liegt die Waffe als eigenes Bild vor, wird sie einzeln gedreht.
      //
      // Das ist der saubere Weg: der Sockel steht still, die Waffe zielt.
      // Er braucht zwei Bilder je Turm - einen Sockel OHNE Waffe und die
      // Waffe allein, mit dem Drehpunkt in der Bildmitte. Fehlt eines von
      // beiden, bleibt es beim gedaempften Schwenk darunter; ein Sockel mit
      // eingebauter Waffe plus zweiter Waffe darueber waere doppelt.
      // --- Ruhebewegung (D18): der Turm atmet.
      //
      // Ein ruhendes Feld war bis v116 ein Standbild - zwischen zwei Wellen
      // bewegte sich nichts ausser dem Nebel. Kingdom Rush und Bloons lassen
      // ihre Tuerme leicht atmen; das kostet nichts und macht aus einem
      // Diagramm einen Ort.
      //
      // HIER berechnet, nicht weiter unten: es gibt ZWEI Zeichenwege. Tuerme
      // mit eigenem Sockel- und Waffenbild (der Bogenturm) laufen durch den
      // Zweig gleich darunter und enden dort mit `continue`. Mein erster
      // Versuch stand hinter diesem `continue` - bei Amplitude 60, also
      // einem halben Turm Versatz, bewegte sich nichts. Zwei Aufnahmen
      // nebeneinander haben es gezeigt, keine Kennzahl.
      //
      // Drei Entscheidungen:
      //  - KLEIN, aber nicht unsichtbar. 2 Weltpunkte sind bei kleinstem
      //    Massstab rund 1,6 Bildschirmpunkte. Der erste Wert (0,75) waere
      //    ein halber Punkt gewesen - Regel 12: beurteilt wird in
      //    Anzeigegroesse, und ein halber Punkt ist keine Bewegung.
      //  - VERSETZT. Die Phase kommt aus der Standposition, sonst atmet das
      //    ganze Feld im Gleichtakt. Aus der Position und nicht aus einem
      //    Zufall, damit sie ueber Sichern und Laden dieselbe bleibt.
      //  - OHNE SCHATTEN. Der Schatten liegt schon und bleibt liegen. Bewegt
      //    er sich mit, schwebt der Turm; bleibt er, hebt sich der Turm.
      const atem = Math.sin(s.time * 1.9 + (t.x + t.y * 1.7) * 0.03) * 2;

      // Eingebettet wie der Turm daneben - siehe getObjectArtStufeEingebettet.
      const waffe = getObjectArtStufeEingebettet(`waffe_${t.def}`, t.level, s.map.id);
      const sockel = getObjectArtStufeEingebettet(`sockel_${t.def}`, t.level, s.map.id);
      if (waffe && sockel) {
        // Die Groesse kommt aus dem SOCKELBILD, nicht aus dem Ganzbild.
        //
        // `w` oben stammt aus artMasse und rechnet den Breitenanteil des
        // Ganzbilds heraus - das fuellt seine Kachel nur zur Haelfte. Auf
        // den Sockel angewandt war er dadurch fast doppelt so gross und
        // schob den Kristall aus dem Bild. Die Einzelobjekte sind mit
        // Fuellgrad 0,94 gepackt (siehe art/objekte.json), also fuellt die
        // Figur die Kachel fast ganz.
        const FUELLUNG = 0.94;
        const bw = (TURM_BREITE * DRAW_SCALE) / FUELLUNG;
        const rec2 = t.recoil * 4;
        ctx.save();
        ctx.translate(t.x, t.y + atem);
        // Auch dieser Weg bekommt die Hoehe - sonst waere der Bogenturm der
        // einzige, der nicht mitwaechst.
        //
        // Er ist der einzige Turm mit eigenem Sockel- und Waffenbild und
        // laeuft deshalb hier durch statt durch artMasse. Ohne diese Zeile
        // haetten drei Tuerme die neue Hoehe und einer die alte - genau der
        // Fall, gegen den die Gegenprobe "Tuerme verschieden gross" steht.
        const sh0 = bw * (sockel.height / sockel.width);
        const sh = sh0 * TURM_HOEHE;
        // Fuss bleibt liegen: die Unterkante war 0,28 * Sockelhoehe unter
        // der Mitte und bleibt es. Gewachsen wird nach oben.
        const oben = 0.28 * sh0 - sh;
        ctx.drawImage(sockel, -bw / 2, oben, bw, sh);
        // Die Waffe sitzt auf der Plattform, nicht auf dem Boden.
        // Auf die Plattform, nicht in den Schaft. Ihr Platz wird von der
        // Oberkante aus gemessen, nicht von der Mitte - die Plattform ist
        // ein Punkt IM Bild und wandert mit ihm nach oben.
        ctx.translate(0, oben + sh * 0.12);
        // Das Bild blickt nach oben, der Winkel zaehlt von rechts.
        ctx.rotate(t.angle + Math.PI / 2);
        // Rueckstoss laeuft entgegen der Schussrichtung.
        ctx.translate(0, rec2);
        const ww = bw * 0.56;
        const wh = ww * (waffe.height / waffe.width);
        ctx.drawImage(waffe, -ww / 2, -wh / 2, ww, wh);
        ctx.restore();
        return;
      }

      // Der Turm dreht sich zum Ziel - aber nur der obere Teil.
      //
      // Ein Turm ist ein Bauwerk: dreht man das ganze Bild, kippt der Sockel
      // mit und die Burg legt sich schief in die Landschaft. Gedreht wird
      // deshalb um einen Punkt hoch oben im Bild, und nur um einen Teil des
      // Zielwinkels. Das liest sich als "die Kanone schwenkt", ohne dass das
      // Gebaeude umfaellt.
      //
      // Bis der Bildsatz eine eigene Waffenebene bekommt, ist das die
      // ehrlichste Naeherung: es behauptet nicht, ein Drehkranz zu sein.
      const facingLeft = Math.cos(t.angle) < 0;
      const rec = t.recoil * 3;
      ctx.save();
      ctx.translate(t.x, t.y - rec * 0.4);
      if (facingLeft) ctx.scale(-1, 1);
      // Der Winkel zum Ziel, gespiegelt mitgerechnet, auf die Waagerechte
      // bezogen und gedaempft.
      const roh = facingLeft ? Math.PI - t.angle : t.angle;
      const schwenk = Math.max(-0.15, Math.min(0.15, roh * 0.2));
      ctx.translate(0, -h * 0.22);
      ctx.rotate(schwenk);
      ctx.translate(0, h * 0.22);
      // Der frisch gebaute Turm federt einmal ein und schwingt aus.
      if (t.spring > 0.01) {
        const q = Math.sin(t.spring * Math.PI * 2.2) * t.spring * 0.16;
        ctx.scale(1 - q, 1 + q);
      }
      // Die Oberkante kommt aus artMasse, nicht aus einer zweiten Rechnung.
      //
      // Hier stand `-h * 0.72`. Solange Bild und Grundriss gleich hoch
      // waren, war das dasselbe Ergebnis - seit die Hoehe eigenstaendig
      // ist, waere es der Punkt, an dem der Turm vom Boden abhebt: die
      // Oberkante waechst mit der Hoehe mit, die Unterkante nicht.
      // Zwei Stellen, die dieselbe Zahl ausrechnen, driften auseinander.
      // --- Ruhebewegung (D18): der Turm atmet.
      //
      // Ein ruhendes Feld war bis v116 ein Standbild - zwischen zwei Wellen
      // bewegte sich nichts ausser dem Nebel. Kingdom Rush und Bloons lassen
      // ihre Tuerme leicht atmen; das kostet nichts und macht aus einem
      // Diagramm einen Ort.
      //
      // Drei Entscheidungen, jede mit Grund:
      //  - KLEIN. Eineinhalb Weltpunkte, bei kleinstem Massstab gut ein
      //    Bildschirmpunkt. Mehr laese sich als Rueckstoss, also als
      //    Handlung - und eine Ruhebewegung, die nach Handlung aussieht,
      //    luegt.
      //  - VERSETZT. Die Phase kommt aus der Standposition, sonst atmet das
      //    ganze Feld im Gleichtakt und wirkt wie ein Fehler. Aus der
      //    Position und nicht aus einem Zufall, damit sie ueber Sichern und
      //    Laden dieselbe bleibt.
      //  - OHNE SCHATTEN. Der Schatten liegt schon und bleibt liegen. Bewegt
      //    er sich mit, schwebt der Turm; bleibt er, hebt sich der Turm.
      ctx.drawImage(art, -w / 2, masse.oben + atem, w, h);
      ctx.restore();
    } else {
      this.paintWeapon(t.def, t.branch, t.level, t.x, t.y, t.angle, t.recoil, t.pulse, s.crystalPulse);
    }
  }

  /** Ein gebackenes Waffenbild, gedreht und um den Rueckstoss versetzt.
   *  Statt eines Dutzends Pfadbefehle bleibt ein `drawImage`. */
  private paintWeapon(
    id: TowerId, branch: BranchIndex, level: number, x: number, y: number,
    angle: number, recoil: number, pulse: number, time: number,
  ): void {
    const ctx = this.ctx;
    const def = TOWERS[id];
    const sprite = getTowerWeapon(id, branch, level);
    ctx.save();
    ctx.translate(x, y);
    if (def.attack === 'single') {
      ctx.rotate(angle);
      ctx.translate(-recoil * 6, 0);
      drawSprite(ctx, sprite, 0, 0);
    } else if (def.attack === 'splash') {
      ctx.rotate(angle);
      ctx.translate(-recoil * 10, 0);
      drawSprite(ctx, sprite, 0, 0);
    } else if (def.attack === 'aura') {
      ctx.rotate(time * 1.5);
      drawSprite(ctx, sprite, 0, 0, 1 + pulse * 0.08);
    } else {
      ctx.translate(0, -20 + Math.sin(time * 2.2) * 3);
      ctx.rotate(time * 0.9);
      drawSprite(ctx, sprite, 0, 0);
    }
    ctx.restore();
  }

  /** Nur fuer die Bauvorschau: der Turm, wie er nach dem Bauen aussehen wird.
   *
   *  Vorher wurde hier die gezeichnete Silhouette gemalt, waehrend gebaute
   *  Tuerme das gerenderte Bild zeigen. Man sah beim Bauen also etwas anderes
   *  als das, was danach dastand. */
  /** Wie gross ein Turmbild gezeichnet wird - die eine Stelle dafuer.
   *
   *  Die Kachel wird so gross gezeichnet, dass die FIGUR darin den
   *  Platzbedarf ausfuellt, nicht die Kachel selbst. Vorher stand diese
   *  Rechnung an zwei Stellen: einmal fuer gebaute Tuerme, einmal fuer die
   *  Bauvorschau - und nur die erste kannte den Breitenausgleich. Die
   *  Vorschau war dadurch rund 40 Prozent kleiner als das, was danach dort
   *  stand. Man entschied ueber eine Groesse, die man nicht sah. */
  private artMasse(
    id: TowerId, branch: BranchIndex, level: number, art: HTMLCanvasElement,
  ): { w: number; h: number; oben: number } {
    // Alle Turmbilder werden gleich gross gezeichnet - ohne Ausgleich.
    //
    // Zweimal habe ich versucht, die Groesse aus dem Bild zu errechnen: erst
    // aus der Gesamtbreite der Figur, dann aus der Breite ihres Fusses.
    // Beide Male waren die Tuerme rechnerisch gleich und im Bild
    // verschieden - nur jedes Mal andersherum. Ein Ausgleich, der die
    // Bildinhalte gegeneinander normiert, kaempft gegen die Gestaltung an.
    //
    // Die Bilder kommen aus einer Serie und sind alle mit demselben
    // Fuellgrad gepackt. Also fuellen sie ihre Kachel schon gleich, und die
    // richtige Antwort ist: gar nichts ausgleichen. Was der Bildagent als
    // gross gezeichnet hat, ist gross.
    void artBreite;
    const FUELLUNG = 0.94;
    const w0 = (TURM_BREITE * DRAW_SCALE * towerArtScale(level)) / FUELLUNG;
    // Hoehe getrennt von der Breite - und der Fuss bleibt, wo er war.
    //
    // Der Turm waechst nach OBEN aus seiner Standflaeche heraus, nicht um
    // seine Mitte. Waechst er um die Mitte, sinkt er zugleich in den Boden
    // ein: die Unterkante rutscht nach unten, der Kontaktschatten sitzt
    // ploetzlich im Bauch statt am Fuss, und der Turm steht einen halben
    // Meter tief im Gelaende.
    //
    // Unterkante war und bleibt y + 0,28 * Breite. Daraus folgt die
    // Oberkante, nicht umgekehrt.
    const h0 = w0 * TURM_HOEHE;
    return { w: w0, h: h0, oben: 0.28 * w0 - h0 };

    // Der Massstab kommt IMMER von Stufe 1, nie von der gezeigten Stufe.
    //
    // Gemessen waechst die Figurenbreite mit dem Ausbau - beim Frostturm von
    // 50 auf 80 Prozent der Kachel, weil Eiskronen seitlich herauswachsen.
    // Rechnete man je Stufe aus, schrumpfte der Turmkoerper genau dann, wenn
    // der Turm staerker wird: auf Stufe 6 um ueber ein Drittel.
    //
    // Mit Stufe 1 als Bezug bleibt der Koerper gleich gross, und was
    // dazukommt, ragt darueber hinaus. Genau so soll ein Ausbau aussehen.
    const grund = getTowerArt(id, branch, 1) ?? art;
    const anteil = artBreite(grund, `${id}:${branch}:1`);
    const w = (TURM_BREITE * DRAW_SCALE * towerArtScale(level)) / Math.max(0.3, anteil);
    return { w, h: w, oben: -w * 0.72 };
  }

  private paintTower(
    def: TowerDef, level: number, x: number, y: number, time: number, mapId = 'spiralhain',
  ): void {
    const art = getTowerArt(def.id, null, level, mapId);
    if (art) {
      const m = this.artMasse(def.id, null, level, art);
      this.ctx.drawImage(art, x - m.w / 2, y + m.oben, m.w, m.h);
      return;
    }
    drawSprite(this.ctx, getTowerBase(def.id, null, level), x, y);
    this.paintWeapon(def.id, null, level, x, y, -Math.PI / 2, 0, 0, time);
  }

  /** Flughoehe eines Schwaermers: der Koerper schwebt ueber seinem Schatten,
   *  damit sofort lesbar ist, warum der Moerser ihn nicht erwischt. */
  private altitude(e: { wobble: number }, t: number, flying: boolean): number {
    return flying ? 30 + Math.sin(t * 6 + e.wobble) * 3 : 0;
  }

  /** Der Bodenteil EINES Gegners: Schlagschatten und Kontaktschatten.
   *
   *  Getrennt vom Koerper, weil Schatten zur Erde gehoeren: sie liegen unter
   *  ALLEM, was auf ihr steht. Wuerden sie mit dem Koerper zusammen sortiert,
   *  liefe der Schatten eines nahen Gegners ueber den Fuss eines entfernten. */
  private gegnerBoden(s: GameState, e: Enemy): void {
    const ctx = this.ctx;
    const def = ENEMIES[e.def];
    const sicht = enemySichtRadius(e.def);
    // Der Schatten faellt in Lichtrichtung, nicht senkrecht nach unten -
    // dieselbe Richtung wie im Kartenbild.
    if (def.flying) {
      // Ein Flieger steht hoch ueber dem Boden, sein Schatten liegt weiter weg.
      const alt = this.altitude(e, s.time, true);
      ctx.globalAlpha = 0.4;
      drawSprite(ctx, getShadow(sicht),
        e.x + LICHT.x * alt * 0.9, e.y + LICHT.y * alt * 0.5, 0.8);
      ctx.globalAlpha = 1;
    } else {
      // Zwei Schatten, wie bei den Tuermen: der Schlagschatten sagt, woher
      // die Sonne kommt, der Kontaktschatten setzt den Gegner auf den Boden.
      // Bei einem laufenden Wesen ist die Kontaktzone kleiner und dichter -
      // es beruehrt den Boden nur mit den Fuessen.
      // Der Schlagschatten traegt seit v132 den EIGENEN Umriss, wie bei den
      // Tuermen seit v128. Der Koloss warf bis dahin denselben Fleck wie der
      // Spaeher; jetzt sieht man am Boden, was da laeuft.
      //
      // Der Rueckfall auf die Ellipse bleibt fuer den Fall, dass noch kein
      // Bild geladen ist - dann gibt es keinen Umriss, den man legen
      // koennte.
      const weit = sicht * 0.85;
      const bild = getEnemyArt(e.def, false, s.map.id);
      if (bild) {
        const b = enemyArtWidth(e.def);
        // Hebel 0,45 statt 1,25: ein Gegner liegt flach auf dem Boden.
        drawSprite(ctx, getSchattenriss(bild, `gegner:${e.def}`, b, b, 0.45),
          e.x + LICHT.x * weit * 0.22, e.y + LICHT.y * weit * 0.22);
      } else {
        drawSprite(ctx, getShadow(sicht),
          e.x + LICHT.x * weit * 0.7, e.y + LICHT.y * weit);
      }
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + sicht * 0.16, sicht * 0.72, sicht * 0.28,
        0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Der Koerper EINES Gegners. Wird aus der Szenenliste gerufen, nach dem
   *  Ort sortiert - siehe zeichneStand. */
  private gegnerMalen(s: GameState, e: Enemy, hi: boolean): void {
    const ctx = this.ctx;
    void hi;
    const def = ENEMIES[e.def];
    const sicht = enemySichtRadius(e.def);
    const wob = Math.sin(s.time * 9 + e.wobble) * 2;
    const alt = this.altitude(e, s.time, !!def.flying);
    const art = getEnemyArt(e.def, false, s.map.id);

    if (art) {
      // Zwei Arten von Bildern, zwei Arten sie zu setzen.
      //
      // Seitenansichten schauen nach links und werden nur gespiegelt - ein
      // Fahrzeug in Dreiviertelansicht kippt beim Drehen. Aufsichten drehen
      // sich mit der Laufrichtung; ihr Bild blickt im Ausgangszustand nach
      // oben, deshalb der Viertelkreis Zuschlag.
      const dirX = def.flying ? s.goal.x - e.x : Math.cos(e.heading);
      const facingRight = dirX >= 0;
      const w = enemyArtWidth(e.def);
      const h = w * (art.height / art.width);
      ctx.save();
      ctx.translate(e.x, e.y - alt + wob * 0.3);
      if (def.topdown) ctx.rotate(e.heading + Math.PI / 2);
      else if (facingRight) ctx.scale(-1, 1);
      // Stauchen und Strecken: was getroffen wird, wird breiter und
      // flacher. Die Flaeche bleibt gleich, deshalb liest das Auge es als
      // Wucht und nicht als Groessenaenderung.
      if (e.squash > 0.01) {
        const q = e.squash * 0.22;
        ctx.scale(1 + q, 1 - q);
      }
      // Aufsichten sitzen mittig im Bild, Seitenansichten stehen auf ihrer
      // Unterkante - das muss beim Zeichnen zusammenpassen.
      const oben = def.topdown ? -h / 2 : -h * 0.72;
      ctx.drawImage(art, -w / 2, oben, w, h);
      if (e.hitFlash > 0.01) {
        const hot = getEnemyArt(e.def, true, s.map.id);
        if (hot) {
          ctx.globalAlpha = e.hitFlash * 0.8;
          ctx.drawImage(hot, -w / 2, oben, w, h);
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
      // Der Schildtraeger: ein eigener Ring plus Faeden zu denen, die er
      // versorgt.
      //
      // Der Ring allein reichte nicht. Zwei Gegner mit blauem Schildring
      // und einer davon mit violettem Traegerring - das sieht nach zwei
      // Sorten Schild aus, nicht nach Ursache und Wirkung. Erst die Faeden
      // sagen, WOHER der Schild kommt, und damit, wen man zuerst nehmen
      // muss. Das ist der ganze Sinn von G5: die Reihenfolge muss man
      // SEHEN, nicht erschliessen.
      if (e.traeger > 0) {
        ctx.save();
        const puls = 0.55 + 0.35 * Math.sin(s.time * 3 + e.wobble);
        // Deckung angehoben nach dem ersten Blick, wie bei den
        // Reichweitenringen in v108: bei 0,35 waren die Faeden im Gewimmel
        // nicht auszumachen, und damit war nicht zu sehen, WER die Quelle
        // ist. Genau das muessen sie zeigen.
        ctx.strokeStyle = hexA('#C9A0FF', 0.55 + 0.25 * puls);
        ctx.lineWidth = 3;
        for (const o of s.enemies) {
          if (o === e || o.dead || o.shield <= 0) continue;
          const dx = o.x - e.x, dy = o.y - e.y;
          if (dx * dx + dy * dy > 190 * 190) continue;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y - alt);
          ctx.lineTo(o.x, o.y);
          ctx.stroke();
        }
        ctx.translate(e.x, e.y - alt);
        ctx.strokeStyle = hexA('#C9A0FF', 0.7 + 0.3 * puls);
        ctx.lineWidth = 4;
        ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.arc(0, 0, sicht * 1.75, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Der Schild: ein Ring, dessen Staerke die Restzahl zeigt.
      //
      // Kein Zahlentext. Wieviele Treffer noch kommen muessen, liest man an
      // der Dicke ab - und wer es genau wissen will, sieht beim naechsten
      // Treffer, dass es duenner wird. Ein Text an einem 25 Punkte grossen
      // Gegner waere ohnehin nicht zu lesen.
      if (e.shield > 0) {
        const rs = sicht * 1.35;
        ctx.save();
        ctx.translate(e.x, e.y - alt);
        ctx.strokeStyle = hexA('#9FD4FF', 0.45 + 0.12 * Math.sin(s.time * 4 + e.wobble));
        ctx.lineWidth = 2 + Math.min(4, e.shield) * 1.4;
        ctx.beginPath(); ctx.arc(0, 0, rs, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      if (def.boss) {
        ctx.save();
        ctx.translate(e.x, e.y - alt);
        ctx.rotate(s.time * 0.8);
        ctx.strokeStyle = hexA(def.trim, 0.7); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, sicht * 1.35, 0, Math.PI * 1.3); ctx.stroke();
        ctx.restore();
      }
    } else {
      const rotating = e.def === 'runner' || !!def.flying;
      const cycle = def.flying ? s.time * 7 + e.wobble : e.travelled / 26 + e.wobble;
      const frame = Math.floor(cycle) % ENEMY_FRAMES;
      if (rotating || def.boss) {
        ctx.save();
        ctx.translate(e.x, e.y - alt);
        if (def.flying) {
          ctx.rotate(Math.atan2(s.goal.y - e.y, s.goal.x - e.x));
        } else if (rotating) {
          ctx.rotate(e.heading);
        }
        drawSprite(ctx, getEnemySprite(e.def, false, frame), 0, 0);
        if (e.hitFlash > 0.01) {
          ctx.globalAlpha = e.hitFlash * 0.7;
          drawSprite(ctx, getEnemySprite(e.def, true, frame), 0, 0);
          ctx.globalAlpha = 1;
        }
        if (def.boss) {
          ctx.rotate(s.time * 0.8);
          ctx.strokeStyle = hexA(def.trim, 0.7); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, sicht * 1.35, 0, Math.PI * 1.3); ctx.stroke();
        }
        ctx.restore();
      } else {
        drawSprite(ctx, getEnemySprite(e.def, false, frame), e.x, e.y + wob * 0.4);
        if (e.hitFlash > 0.01) {
          ctx.globalAlpha = e.hitFlash * 0.7;
          drawSprite(ctx, getEnemySprite(e.def, true, frame), e.x, e.y + wob * 0.4);
          ctx.globalAlpha = 1;
        }
      }
    }

    if (e.slowLeft > 0) {
      ctx.strokeStyle = hexA(C.crystal, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y - alt, sicht + 4, 0, Math.PI * 2); ctx.stroke();
    }
  }

  /** Das Leuchten der Bosse, gebuendelt: ein Halo unter allem, was steht. */
  private bossLeuchten(s: GameState): void {
    const ctx = this.ctx;
    const list = s.enemies;
    let boss = false;
    for (let i = 0; i < list.length; i++) if (ENEMIES[list[i].def].boss) { boss = true; break; }
    if (!boss) return;
    beginGlowBatch(ctx);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const def = ENEMIES[e.def];
      if (def.boss) stampGlowFast(ctx, def.trim, e.x, e.y, enemySichtRadius(e.def) * 2.4, 0.6);
    }
    endGlowBatch(ctx);
  }

  private drawHealthBars(s: GameState): void {
    const ctx = this.ctx;
    const list = s.enemies;
    let any = false;
    for (let i = 0; i < list.length; i++) if (list[i].hp < list[i].hpMax) { any = true; break; }
    if (!any) return;

    ctx.fillStyle = hexA(C.ink, 0.6);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.hp >= e.hpMax) continue;
      const def = ENEMIES[e.def];
      const sicht = enemySichtRadius(e.def);
      const w = Math.max(sicht * 2.1, def.boss ? 90 : 0);
      const h = def.boss ? 7 : 4;
      const a = this.altitude(e, s.time, !!def.flying);
      ctx.fillRect(e.x - w / 2 - 1, e.y - a - sicht - 13, w + 2, h + 2);
    }
    // Zuerst der Nachlauf: der Teil, der gerade verloren geht, bleibt kurz
    // als heller Streifen stehen. Erst dadurch sieht man, *wieviel* ein
    // Treffer gekostet hat - eine springende Leiste liest niemand.
    ctx.fillStyle = 'rgba(255,236,180,0.75)';
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.hpShown <= e.hp || e.hpShown >= e.hpMax) continue;
      const def = ENEMIES[e.def];
      const sicht = enemySichtRadius(e.def);
      const w = Math.max(sicht * 2.1, def.boss ? 90 : 0);
      const h = def.boss ? 7 : 4;
      const a = this.altitude(e, s.time, !!def.flying);
      const x0 = e.x - w / 2 + w * (e.hp / e.hpMax);
      ctx.fillRect(x0, e.y - a - sicht - 12, w * ((e.hpShown - e.hp) / e.hpMax), h);
    }

    const tones = ['#5FD08A', C.gold, C.danger];
    for (let band = 0; band < 3; band++) {
      let drew = false;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.hp >= e.hpMax) continue;
        const p = e.hp / e.hpMax;
        const b = p > 0.5 ? 0 : p > 0.25 ? 1 : 2;
        if (b !== band) continue;
        if (!drew) { ctx.fillStyle = tones[band]; drew = true; }
        const def = ENEMIES[e.def];
        const sicht = enemySichtRadius(e.def);
        const w = Math.max(sicht * 2.1, def.boss ? 90 : 0);
        const h = def.boss ? 7 : 4;
        const a = this.altitude(e, s.time, !!def.flying);
        ctx.fillRect(e.x - w / 2, e.y - a - sicht - 12, w * p, h);
      }
    }
  }

  private drawProjectiles(s: GameState, hi: boolean): void {
    const ctx = this.ctx;
    const list = s.projectiles;
    if (!list.length) return;

    if (hi) {
      beginGlowBatch(ctx);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const py = p.kind === 'ballistic' ? p.y - Math.sin(p.t * Math.PI) * 46 : p.y;
        stampGlowFast(ctx, p.color, p.x, py, p.splash ? 24 : 16, 0.6);
      }
      endGlowBatch(ctx);
    }

    // Bodenschatten der Wurfgeschosse zusammen.
    let ballistic = false;
    for (let i = 0; i < list.length; i++) if (list[i].kind === 'ballistic') { ballistic = true; break; }
    if (ballistic) {
      ctx.fillStyle = hexA(C.ink, 0.28);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (p.kind !== 'ballistic') continue;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // --- Die Form nennt die Waffe, nicht die Farbe (D17).
    //
    // Bis v115 war jedes Geschoss derselbe Punkt; wer die acht Endausbauten
    // auseinanderhalten wollte, musste die Farbe kennen. Kingdom Rush, Bloons
    // und Defense Grid machen es alle drei anders: Pfeil, Granate und Strahl
    // sind eigene Silhouetten, und im Flug liest man daran ab, welcher Turm
    // gerade schiesst. Genau das ist bei zwei Zweigen je Turm die Frage.
    //
    // Gezeichnet wird NACH FORM GRUPPIERT, ein Pfad je Form statt eines je
    // Geschoss. Damit haengt die Zahl der Zeichenbefehle nicht mehr an der
    // Zahl der Geschosse - und genau dort haette sie sonst gestanden, denn
    // `bench-draw` zaehlt Befehle, nicht Bilder.
    for (const art of PROJEKTILFORMEN) {
      let offen = false;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (projektilform(p) !== art.id) continue;
        if (!offen) {
          ctx.beginPath();
          offen = true;
        }
        const py = p.kind === 'ballistic' ? p.y - Math.sin(p.t * Math.PI) * 46 : p.y;
        if (art.laenge > 0) {
          // Laenglich, und zwar in Flugrichtung. Ein Pfeil, der quer steht,
          // ist kein Pfeil.
          const zx = p.target && !p.target.dead ? p.target.x : p.tx;
          const zy = p.target && !p.target.dead ? p.target.y : p.ty;
          let dx = zx - p.x, dy = zy - py;
          const len = Math.hypot(dx, dy);
          if (len < 0.001) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
          const hx = p.x + dx * art.laenge * 0.35, hy = py + dy * art.laenge * 0.35;
          const rx = p.x - dx * art.laenge, ry = py - dy * art.laenge;
          if (art.doppelt) {
            // Quer zur Flugrichtung versetzt - zwei Bolzen nebeneinander.
            const qx = -dy * art.doppelt, qy = dx * art.doppelt;
            ctx.moveTo(rx + qx, ry + qy); ctx.lineTo(hx + qx, hy + qy);
            ctx.moveTo(rx - qx, ry - qy); ctx.lineTo(hx - qx, hy - qy);
          } else {
            ctx.moveTo(rx, ry); ctx.lineTo(hx, hy);
          }
        } else {
          ctx.moveTo(p.x + art.radius, py);
          ctx.arc(p.x, py, art.radius, 0, Math.PI * 2);
        }
      }
      if (!offen) continue;
      // Die Farbe kommt weiter vom Zweig - sie faellt nicht weg, sie ist nur
      // nicht mehr das Einzige. Genommen wird die des ersten Geschosses
      // dieser Form; innerhalb einer Form ist sie ohnehin gleich.
      const erstes = list.find((p) => projektilform(p) === art.id);
      if (art.laenge > 0) {
        ctx.strokeStyle = erstes ? erstes.color : '#fff';
        ctx.lineWidth = art.breite;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        ctx.fillStyle = erstes ? erstes.color : '#fff';
        ctx.fill();
      }
    }
  }

  private drawBolts(s: GameState): void {
    const ctx = this.ctx;
    for (const b of s.bolts) {
      const a = Math.max(0, b.life / b.maxLife);
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 5 * a + 1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < b.pts.length - 1; i++) {
        const p0 = b.pts[i], p1 = b.pts[i + 1];
        ctx.moveTo(p0.x, p0.y);
        // Ein Knick pro Abschnitt reicht fuer den Blitzeindruck.
        const mx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 26;
        const my = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * 26;
        ctx.lineTo(mx, my);
        ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /** Partikel nach Farbe und Deckkraftstufe gebuendelt. Vorher kostete jedes
   *  einzelne Teilchen einen Deckkraft- und einen Farbwechsel; jetzt fallen
   *  beide nur noch je Buendel an. */
  private drawParticles(s: GameState): void {
    const ctx = this.ctx;
    const list = s.particles;
    if (!list.length) return;
    const batch = this.pBatch;
    for (const arr of batch.values()) arr.length = 0;

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const a = p.life / p.maxLife;
      const bucket = a > 0.75 ? 3 : a > 0.5 ? 2 : a > 0.25 ? 1 : 0;
      const key = `${p.color}|${bucket}`;
      let arr = batch.get(key);
      if (!arr) { arr = []; batch.set(key, arr); }
      arr.push(p.x - p.size / 2, p.y - p.size / 2, p.size);
    }

    for (const [key, arr] of batch) {
      if (!arr.length) continue;
      const bar = key.lastIndexOf('|');
      ctx.fillStyle = key.slice(0, bar);
      ctx.globalAlpha = (Number(key.slice(bar + 1)) + 0.5) / 4;
      ctx.beginPath();
      for (let i = 0; i < arr.length; i += 3) ctx.rect(arr[i], arr[i + 1], arr[i + 2], arr[i + 2]);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Anflug und Einschlagmarke. Der Ring zieht sich zusammen, damit man den
   *  Zeitpunkt sieht und nicht nur das Ergebnis. */
  private drawMeteors(s: GameState, hi: boolean): void {
    if (!s.meteors.length) return;
    const ctx = this.ctx;
    const tone = ABILITIES.meteor.color;
    for (const m of s.meteors) {
      const t = Math.min(1, m.t);
      ctx.strokeStyle = hexA(tone, 0.35 + t * 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(m.x, m.y, m.radius * (1 - t * 0.9), 0, Math.PI * 2); ctx.stroke();

      // Der Brocken faellt von oben rechts ins Ziel.
      const fx = m.x + 340 * (1 - t);
      const fy = m.y - 620 * (1 - t);
      if (hi) stampGlow(ctx, tone, fx, fy, 46, 0.8);
      ctx.strokeStyle = hexA(tone, 0.75);
      ctx.lineWidth = 7 * t + 2;
      ctx.beginPath();
      ctx.moveTo(fx + 46, fy - 84); ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = '#FFF3E2';
      ctx.beginPath(); ctx.arc(fx, fy, 11, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** Zielhilfe fuer eine angewaehlte Faehigkeit. */
  private drawAim(s: GameState): void {
    if (!s.aiming) return;
    const def = ABILITIES[s.aiming];
    if (def.kind !== 'aimed' || !def.radius) return;
    // Beim Zielen gibt es keinen Bauplatz - die Faehigkeit trifft einen Punkt.
    const p = this.aimPoint;
    if (!p) return;
    const ctx = this.ctx;
    const x = p.x, y = p.y;
    ctx.save();
    ctx.fillStyle = hexA(def.color, 0.16);
    ctx.beginPath(); ctx.arc(x, y, def.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(def.color, 0.9);
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(x, y, def.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 16); ctx.lineTo(x, y + 16);
    ctx.stroke();
    ctx.restore();
  }

  /** Zeigt auf den empfohlenen Bauplatz oder auf den ersten Turm. Ein Pfeil,
   *  der sich bewegt - der Satz in der Blase braucht eine Adresse im Bild. */
  private drawCoach(s: GameState): void {
    if (!this.coachHint) return;
    let x: number, y: number, r: number;
    if (this.coachHint === 'build') {
      const h = s.map.hint;
      x = h.x; y = h.y; r = 62;
    } else {
      const t = s.towers[0];
      if (!t) return;
      x = t.x; y = t.y; r = 62;
    }
    const ctx = this.ctx;
    const beat = 0.5 + 0.5 * Math.sin(s.crystalPulse * 4);
    ctx.save();
    ctx.strokeStyle = hexA(C.crystal, 0.5 + beat * 0.5);
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -s.crystalPulse * 30;
    ctx.beginPath(); ctx.arc(x, y, r + beat * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    const ay = y - r - 26 - beat * 8;
    ctx.fillStyle = hexA(C.crystal, 0.85 + beat * 0.15);
    ctx.beginPath();
    ctx.moveTo(x, ay + 20); ctx.lineTo(x - 13, ay); ctx.lineTo(x + 13, ay);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  private drawFloats(s: GameState): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    for (const f of s.floats) {
      ctx.font = `700 ${f.size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.globalAlpha = Math.min(1, f.life * 1.6);
      ctx.lineWidth = 4;
      ctx.strokeStyle = hexA(C.ink, 0.8);
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}

export type { Tower, TowerLevel };
