import { WORLD_W, WORLD_H, C } from '../data/config';
import { muendung } from '../data/turmgestalt';
import { tempoFaktor, wirkungAnlegen, wirkungenTicken, type Wirkung, type WirkungsArt } from '../data/wirkungen';
import { ENEMIES, type EnemyId } from '../data/enemies';
import {
  TOWERS, MAX_LEVEL, accentFor, sellValue, statsFor, nextFor, hatZweigwahl,
  type BranchIndex, type TowerId,
} from '../data/towers';
import { EARLY_BONUS_MAX, EARLY_BONUS_WINDOW } from '../data/waves';
import {
  DIFFICULTIES, hpScale, type DifficultyDef, type DifficultyId,
} from '../data/difficulty';
import { ABILITIES, ABILITY_ORDER, type AbilityId } from '../data/abilities';
import {
  MAPS, mapById, goalOf, lanePaths, snap, PATH_CLEARANCE, type GameMap,
} from '../data/maps';
import type { LanePath } from '../core/path';
import type { Vec } from '../core/math';
import { dist, dist2 } from '../core/math';
import { Sfx } from '../core/audio';
import { mischen } from '../gfx/glow';
import { getProgress, getStars, recordEndlos, recordRun, recordStars } from '../core/storage';
import {
  NO_PERKS, perkEffect, starsFor, type PerkEffect,
} from '../data/perks';
import { Rng, newSeed } from '../core/rng';
import { clearGame, type SaveGame } from './save';
import { SpatialGrid } from '../core/spatialgrid';
import { Pool, compact } from '../core/pool';
import type {
  Bolt, Enemy, FloatText, Husk, Meteor, Particle, Phase, Projectile, Quality,
  Ring, RunStats, Tower, Zielwahl,
} from './types';
import { ZIELWAHL_ORDNUNG } from './types';

interface PendingSpawn {
  time: number; enemy: EnemyId; hpMul: number; lane: number;
  shield?: number; traeger?: number;
}

function emptyStats(): RunStats {
  return {
    goldEarned: 0, goldSpent: 0, damage: 0, damageBy: {},
    kills: 0, leaksByWave: [], damageByWave: [], abilityUses: {}, duration: 0, towersBuilt: 0,
    schuesse: 0, schuesseOhneWirkung: 0,
  };
}

/** Wie weit die Farbe eines beruehrten Flecks aufgehellt wird, bevor sie
 *  fliegt. Steht hier und nicht in `beruehren`, damit der Rauchtest sie
 *  nicht abschreiben muss - eine abgeschriebene Zahl veraltet (Regel 15). */
export const ZIER_AUFHELLUNG = 0.45;

/** Suchraum fuer ein Ersatzziel (TF-007), in Weltpunkten. Etwa eine halbe
 *  Turmreichweite - weit genug, damit der Nachbar im Pulk erreicht wird,
 *  zu kurz, um quer ueber die Karte zu greifen. */
export const ERSATZ_UMKREIS = 240;
/** Kosinus des halben Oeffnungswinkels des Suchkegels. 0,766 sind 40 Grad. */
export const ERSATZ_KEGEL = 0.766;

/** Wie lange der Muendungsversatz braucht, um auf die Bodenebene zu sinken.
 *  Eine Zehntelsekunde: bei Geschosstempo 840 sind das rund achtzig
 *  Weltpunkte Flug, also etwa die Hoehe, aus der es kommt. */
export const VERSATZ_ZEIT = 0.1;

/** Wie lange die Wegvorschau laeuft (TF-014), in Sekunden.
 *
 *  Zwei Sekunden fuer den Lauf plus ein halbe zum Ausklingen. Kuerzer las
 *  sich als Zucken, laenger haelt den Spieler auf, bevor er etwas tun darf. */
export const WEGVORSCHAU_DAUER = 2.5;

export class GameState {
  /** Die Karte kann zwischen zwei Partien wechseln, deshalb ist hier nichts
   *  mehr fest verdrahtet. */
  map: GameMap = MAPS[0];
  /** Die Kurven der Zuwege. Eine Karte kann mehrere haben, die sich
   *  unterwegs vereinen. */
  lanes: LanePath[] = [];

  goal: Vec = { x: 0, y: 0 };
  /** Gesamtlaenge der laengsten Bahn. Dient als gemeinsamer Massstab, damit
   *  fliegende und laufende Gegner beim Zielen vergleichbar sind. */
  pathTotal = 1;
  /** Luftlinie vom weitesten Tor zum Kristall - der Massstab der Flieger. */
  airTotal = 1;

  phase: Phase = 'title';
  /** Der gewaehlte Schwierigkeitsgrad. Er verstellt Startwerte, Kurvenform,
   *  Wellendichte und Einkommen gemeinsam. */
  difficulty: DifficultyId = 'normal';
  /** Endlosmodus: nach dem letzten Wellenplan geht es weiter, bis der
   *  Kristall faellt. */
  endless = false;
  /** Wirkung der dauerhaften Verbesserungen. */
  perks: PerkEffect = NO_PERKS;
  /** Sterne des letzten abgeschlossenen Laufs. */
  stars = 0;
  /** Sterne, die auf dieser Karte VOR diesem Lauf standen.
   *
   *  Wird in `finishRun` festgehalten, bevor das Ergebnis eingetragen wird -
   *  und genau darum geht es. Bis v134 holte sich der Ergebnisbildschirm die
   *  Zahl selbst, aber erst NACHDEM `finishRun` sie ueberschrieben hatte:
   *  "vorher" war dann immer schon "nachher", und die Zeile "Ein neuer Stern"
   *  konnte gar nie erscheinen. Zwei Stellen, dieselbe Zahl, eine davon zu
   *  spaet - Regel 15. */
  sterneVorher = 0;
  gold = DIFFICULTIES.normal.startGold;
  lives = DIFFICULTIES.normal.startLives;
  maxLives = DIFFICULTIES.normal.startLives;
  waveIndex = 0;
  waveActive = false;
  speed = 1;
  paused = false;
  quality: Quality = 'hoch';

  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  bolts: Bolt[] = [];
  rings: Ring[] = [];
  husks: Husk[] = [];
  /** Kurzes Aufleuchten des ganzen Feldes, etwa beim Meteoreinschlag. */
  flashT = 0;
  particles: Particle[] = [];
  floats: FloatText[] = [];

  meteors: Meteor[] = [];
  /** Restliche Abklingzeit je Faehigkeit. Null heisst einsatzbereit. */
  abilityCd: Record<AbilityId, number> = { meteor: 0, freeze: 0, bollwerk: 0, ernte: 0 };
  /** Gezielte Faehigkeit, die auf einen Tipp aufs Feld wartet. */
  aiming: AbilityId | null = null;

  buildChoice: TowerId | null = null;
  /** Wohin gebaut werden soll, wenn die Turmwahl offen ist.
   *
   *  Bis v101 musste man erst in der Leiste einen Turm waehlen und dann aufs
   *  Feld tippen - zwei Schritte, und die Leiste klappte dabei auf und zu.
   *  Jetzt tippt man zuerst auf den Platz; die Wahl erscheint dort. */
  buildAt: { x: number; y: number } | null = null;

  /** Der Grund, warum an einer Stelle nichts gebaut werden konnte - kurz
   *  eingeblendet, dort wo der Finger war.
   *
   *  Bis v124 geschah in diesem Fall GAR NICHTS: kein Bau, kein Hinweis,
   *  keine Ablehnung. Ein Tipp, der spurlos verpufft, ist fuer den Spieler
   *  nicht von einem verschluckten Tipp zu unterscheiden - und wer nicht
   *  weiss, ob er danebengetippt hat oder ob es verboten ist, zoomt hinein
   *  und probiert. Genau das war der Vorwurf.
   *
   *  Er lebt eine Sekunde und wird von der Zeit geloescht, nicht von einem
   *  Schalter, den man vergessen kann. */
  hinweis: { x: number; y: number; text: string; bis: number } | null = null;

  /** Welcher Turm wird gerade an der gewaehlten Stelle VORGEFUEHRT?
   *
   *  Gesetzt, solange ein Finger auf einem Knopf der Turmwahl liegt. Damit
   *  beantwortet die Wahl die Frage, die sie stellt: "welchen Turm kann ich
   *  hierhin bauen" heisst nicht "wie heisst er und was kostet er", sondern
   *  "wie viel Platz braucht er und wie weit reicht er - HIER".
   *
   *  Getrennt von `buildChoice`, weil das etwas anderes bedeutet: `buildChoice`
   *  heisst "der naechste Tipp aufs Feld baut diesen Turm". Eine Vorfuehrung
   *  darf nichts bauen. */
  vorschau: { id: TowerId; x: number; y: number } | null = null;

  /** Eine Kleinigkeit in der Karte antippen (D14, Kriterium P8).
   *
   *  Was da angetippt wird, steht schon in den Daten: `map.rough` sind die
   *  Kreise, in denen nicht gebaut werden darf - Fels, Dickicht, Wasser. Sie
   *  werden NICHT gezeichnet, weil sie im Kartenfoto schon stehen; sie sind
   *  die unsichtbare Entsprechung dessen, was man dort sieht.
   *
   *  Damit gibt es die Kleinigkeiten laengst, sie reagieren nur nicht. Genau
   *  das ist das offene Kriterium: im Vorbild hat die Karte Leben, das nichts
   *  mit dem Spiel zu tun hat - Voegel steigen auf, Fackeln flackern, wenn
   *  man sie beruehrt.
   *
   *  **Der Tipp wird nicht verbraucht.** Wer eine Kleinigkeit antippt, wollte
   *  vielleicht daneben bauen - und seit v125 rastet ein Tipp auf die naechste
   *  erlaubte Stelle ein. Beides passiert, und das ist richtig: eine Zierde,
   *  die einen Bauversuch schluckt, ist keine Zierde, sondern ein Hindernis.
   *
   *  Gibt zurueck, ob etwas beruehrt wurde - fuer den Rauchtest. */
  beruehren(x: number, y: number): boolean {
    let getroffen = false;
    for (const gr of this.map.rough) {
      // Grosszuegig: der Fels im Foto ist nicht auf den Punkt derselbe wie
      // sein Kreis in den Daten.
      if (Math.hypot(gr.x - x, gr.y - y) > gr.r * 1.1) continue;
      getroffen = true;

      // Wie der Fleck reagiert, haengt daran, WORAUS er besteht - und das
      // steht seit v136 an ihm dran, gemessen am Kartenbild (`npm run
      // gelaende`). Drei Arten, drei Bewegungen:
      //
      //   hart    Pflaster, Mauer, blanker Stein: es splittert. Wenige,
      //           kleine, schnelle Teilchen, die sofort zu Boden gehen.
      //   kalt    Eis und Schmelzwasser: es spritzt. Ein Stoss nach OBEN,
      //           der zurueckfaellt - das ist die Bewegung, an der man
      //           Wasser erkennt.
      //   locker  Asche, Laub, Lehm: es staubt. Viele, grosse, langsame
      //           Teilchen, die stehen bleiben und vergehen.
      //
      // Die Farbe kommt vom Fleck selbst, nicht aus der Farbwelt der Karte.
      // Bis v135 stob auf jeder Karte dasselbe Paar `mood`/`haze` auf - auf
      // dem Pflaster genau wie im Lehm daneben.
      const art = gr.art;
      // Die Farbe des Flecks, aber nicht in seiner Helligkeit.
      //
      // Der erste Anlauf nahm sie genau so, wie sie gemessen ist - und das
      // Ergebnis war auf der Aufnahme fast nicht zu sehen: ein Teilchen in
      // der MITTLEREN Farbe seines Untergrunds fliegt vor genau diesem
      // Untergrund. Es ist Befund B5 des Grafik-Audits im Kleinen.
      //
      // Also dieselbe Trennung wie bei der Einbettung: der Farbton sagt,
      // WOHER es kommt, die Helligkeit macht es sichtbar. Aufgewirbeltes
      // Material ist ohnehin heller als der Boden - es faengt Licht von
      // allen Seiten.
      // Und zwar in BEIDE Richtungen. Der erste Anlauf hellte nur auf - auf
      // der Ascheschlucht war das eine sichtbare Staubwolke, auf dem Schnee
      // der Frostspalte fast nichts. Ein Ton kann nicht vor jedem Grund
      // stehen; zwei koennen es, und dann traegt immer einer von beiden.
      const hellerTon = mischen(gr.farbe, '#FFFFFF', ZIER_AUFHELLUNG);
      const dunklerTon = mischen(gr.farbe, '#000000', 0.40);
      const hoch = this.quality === 'hoch';
      const n = art === 'hart' ? (hoch ? 14 : 7)
        : art === 'kalt' ? (hoch ? 20 : 9)
        : (hoch ? 26 : 12);
      for (let i = 0; i < n; i++) {
        if (this.particles.length >= this.particleCap) break;
        const a = this.zierRng.next() * Math.PI * 2;
        const t = this.particlePool.obtain();
        // Sie starten am RAND des beruehrten Flecks, nicht in seiner Mitte -
        // aufgescheucht wird, was neben dem Finger sitzt.
        const r0 = gr.r * (0.15 + this.zierRng.next() * 0.6);
        t.x = x + Math.cos(a) * r0; t.y = y + Math.sin(a) * r0;
        if (art === 'hart') {
          const sp = 150 + this.zierRng.next() * 160;
          t.vx = Math.cos(a) * sp; t.vy = Math.sin(a) * sp * 0.5 - 30;
          t.life = 0.3 + this.zierRng.next() * 0.3; t.maxLife = 0.6;
          t.size = 4 + this.zierRng.next() * 5;
          t.gravity = 560;
          t.grow = -5;
        } else if (art === 'kalt') {
          const sp = 60 + this.zierRng.next() * 90;
          t.vx = Math.cos(a) * sp; t.vy = -190 - this.zierRng.next() * 140;
          t.life = 0.5 + this.zierRng.next() * 0.45; t.maxLife = 0.95;
          t.size = 5 + this.zierRng.next() * 6;
          t.gravity = 700;
          t.grow = -3;
        } else {
          const sp = 40 + this.zierRng.next() * 80;
          t.vx = Math.cos(a) * sp; t.vy = Math.sin(a) * sp - 70 - this.zierRng.next() * 60;
          t.life = 0.7 + this.zierRng.next() * 0.9; t.maxLife = 1.6;
          t.size = 5 + this.zierRng.next() * 8;
          t.gravity = 130;
          t.grow = -3.5;
        }
        // Zwei Toene, damit es nicht wie ein Farbfleck aussieht: die eigene
        // Farbe des Flecks und der Saum der Karte, der sie sichtbar macht.
        t.color = this.zierRng.next() < 0.55 ? hellerTon : dunklerTon;
        this.particles.push(t);
      }
      // Ein flacher Ring am Boden: er sagt, dass die Beruehrung angekommen
      // ist, auch wenn die Teilchen im hellen Untergrund untergehen. Beim
      // Spritzer weiter und heller - eine Welle laeuft nach aussen.
      // Auch der Ring traegt die Farbe des Flecks - ein weisser Kreis sieht
      // aus wie Bedienung, ein erdfarbener wie aufgeworfener Boden.
      if (art === 'kalt') this.ring(x, y, gr.r * 1.1, hellerTon, 0.75, 7);
      else this.ring(x, y, gr.r * 0.8, hellerTon, 0.6, 6);
      break;
    }
    return getroffen;
  }

  /** Einen Grund einblenden. `null` heisst: es gibt keinen zu nennen. */
  bauHinweis(x: number, y: number, text: string | null): void {
    this.hinweis = text ? { x, y, text, bis: this.time + 1.1 } : null;
  }
  selectedTower: Tower | null = null;

  /** Welche Gegnerart im Inspektor erklaert wird (D10).
   *
   *  Bis v194 stand der Name eines Gegners in der Wellenvorschau nur im
   *  `title` - also im Zeigerhinweis. Auf dem Telefon gibt es keinen Zeiger:
   *  dort war der Name **unerreichbar**, und das Zielgeraet ist das Telefon.
   *
   *  Der Zustand steht hier und nicht in der Oberflaeche, weil ihn drei
   *  Stellen brauchen: die Vorschau setzt ihn, der Inspektor liest ihn, und
   *  ein Wellenstart raeumt ihn weg. Eine Kopie in der Oberflaeche waere die
   *  zweite Wahrheit. */
  gegnerInfo: EnemyId | null = null;
  /** Weltpunkt unter dem Zeiger. */
  hoverPoint: Vec | null = null;
  /** Zelle unter dem gedrueckten Finger. Gebaut wird erst beim Loslassen. */
  /** Weltpunkt, ueber dem gerade gedrueckt wird. */
  pendingPoint: Vec | null = null;

  /** Aussaat und Zufallszustand. Beides wandert in den Spielstand, damit eine
   *  fortgesetzte Partie exakt so weiterlaeuft wie eine ununterbrochene - und
   *  damit ein gemeldeter Fehler nachgestellt werden kann. */
  seed = newSeed();
  readonly rng = new Rng(this.seed);

  /** Der Wuerfel fuer ZIERDE - und nur dafuer.
   *
   *  Getrennt von `rng`, und das ist keine Ordnungsliebe, sondern Regel 4.
   *  Die vorhandenen Teilchenwerfer (`smoke`, `debris`, `spark`) ziehen aus
   *  dem Spielwuerfel. Wer damit eine Beruehrung ausschmueckte, verschoebe
   *  mit jedem Antippen den ganzen weiteren Wellenverlauf: dieselbe Partie,
   *  zweimal gespielt, liefe verschieden - je nachdem, wie oft jemand
   *  unterwegs einen Busch angetippt hat.
   *
   *  Fest gesetzt, nicht aus der Zeit: zwei Laeufe sollen dieselbe Zierde
   *  zeigen. Der Rauchfahne ist es gleich, dem Determinismus-Tor nicht. */
  readonly zierRng = new Rng(0x5EED);

  /** Zaehler fuer die Turmschicht. Aendert er sich, wird sie neu gebacken. */
  towersVersion = 0;

  /** Zahlen der laufenden Partie. */
  stats: RunStats = emptyStats();

  crystalPulse = 0;
  /** Wann die Wegvorschau begonnen hat, gemessen an `time` (TF-014).
   *
   *  REINE DARSTELLUNG. Sie steht hier und nicht im Renderer, weil sie einen
   *  Startzeitpunkt braucht, den auch die Bedienung setzen kann - der
   *  Wiederholknopf ist eine Handlung des Spielers, keine Frage der
   *  Zeichenschicht. Gelesen wird sie nur dort.
   *
   *  Ein grosser negativer Wert heisst "laeuft nicht". Genau den bekommt ein
   *  geladener Spielstand: wer eine Partie fortsetzt, kennt die Karte. */
  wegvorschauAb = -99;
  crystalHit = 0;
  shake = 0;
  /** Trefferstopp in Sekunden.
   *
   *  Bei einem schweren Treffer steht die Simulation drei bis fuenf Bilder
   *  still. Das klingt nach einem Fehler, ist aber der aelteste Kniff des
   *  Handwerks: die Pause gibt dem Auge Zeit, den Treffer ueberhaupt zu
   *  registrieren. Ohne sie fuehlt sich ein Schlag an, als ginge er durch
   *  Luft.
   *
   *  Bewusst gedeckelt: Politur darf das Spiel nicht anhalten. */
  hitStop = 0;
  /** Wieviel Trefferstopp in dieser Sekunde schon verbraucht wurde. */
  private stopBudget = 0;
  time = 0;
  idleTime = 0;      // Sekunden seit Ende der letzten Welle
  leakedTotal = 0;

  private pending: PendingSpawn[] = [];
  private waveTime = 0;
  private nextId = 1;

  /** Raster fuer alle Umkreisabfragen. Zellenkante = Kachelgroesse.
   *  Wird einmal pro Simulationsschritt neu befuellt. */
  private grid = new SpatialGrid<Enemy>(160, WORLD_W, WORLD_H);
  /** Getrennte Kratzflaechen, damit sich verschachtelte Abfragen nicht
   *  gegenseitig ueberschreiben. */
  private qRaw: Enemy[] = [];
  private qTarget: Enemy[] = [];
  private qArea: Enemy[] = [];
  private qChain: Enemy[] = [];
  private qErsatz: Enemy[] = [];
  private chainSeen = new Set<number>();
  private chainPts: Vec[] = [];

  /** Objektlager fuer kurzlebige Dinge. Gegner werden bewusst NICHT gelagert:
   *  Geschosse halten Verweise auf ihr Ziel, ein wiederverwendeter Gegner
   *  koennte von einem alten Geschoss faelschlich als lebendig gelesen werden. */
  private particlePool = new Pool<Particle>(() => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', gravity: 0, grow: 0,
  }), 900);
  private projectilePool = new Pool<Projectile>(() => ({
    kind: 'homing', x: 0, y: 0, sx: 0, sy: 0, tx: 0, ty: 0, target: null, owner: null,
    dirX: 1, dirY: 0, luft: false, ox: 0, oy: 0, oT: 0,
    speed: 0, damage: 0, slow: 0, slowTime: 0, splash: 0, pierce: 0, color: '#fff',
    t: 0, dur: 1, life: 0, dead: true,
  }), 200);
  private ringPool = new Pool<Ring>(() => ({
    x: 0, y: 0, r: 0, rMin: 0, rMax: 1, color: '#fff', life: 0, maxLife: 1, width: 1,
  }), 120);
  private floatPool = new Pool<FloatText>(() => ({
    x: 0, y: 0, text: '', color: '#fff', life: 0, size: 20,
  }), 80);
  private boltPool = new Pool<Bolt>(() => ({
    pts: [], color: '#fff', life: 0, maxLife: 1,
  }), 40);

  constructor(mapId = MAPS[0].id) {
    this.loadMap(mapId);
  }

  /** Setzt die Karte. Alles, was von ihr abhaengt, wird hier neu berechnet -
   *  so gibt es keinen Zustand, der zur alten Karte gehoert. */
  loadMap(mapId: string): void {
    this.map = mapById(mapId);
    this.lanes = lanePaths(this.map);
    this.goal = goalOf(this.map);
    this.pathTotal = Math.max(...this.lanes.map((l) => l.length));
    this.airTotal = Math.max(...this.lanes.map(
      (l) => dist(l.pts[0].x, l.pts[0].y, this.goal.x, this.goal.y),
    ));
  }

  // ---------------------------------------------------------------- Bauen

  /** Darf hier ein Turm dieser Sorte stehen?
   *
   *  Vier Bedingungen, und jede hat einen Grund:
   *  - innerhalb des Feldes, mit dem eigenen Platzbedarf,
   *  - weit genug vom Weg, sonst klebt er auf der Strasse,
   *  - nicht in unwegsamem Gelaende,
   *  - ohne Ueberschneidung mit einem anderen Turm.
   *
   *  Der Platzbedarf haengt an der Turmsorte - genau darin besteht die
   *  Entscheidung beim freien Bauen. */
  /** Darf hier gebaut werden?
   *
   *  `ausser` nimmt einen Turm von der Kollisionspruefung aus. Das braucht
   *  das Versetzen: ein Turm, der ein Stueck zur Seite rutscht, ueberlappt
   *  sich sonst mit sich selbst und der Platz gilt als besetzt. */
  canPlace(id: TowerId, x: number, y: number, ausser: Tower | null = null): boolean {
    return this.warumNicht(id, x, y, ausser) === null;
  }

  /** Warum nicht? Dasselbe Urteil wie `canPlace`, nur mit Begruendung.
   *
   *  Es gibt genau EINE Stelle, an der die Bauregeln stehen - `canPlace` ist
   *  nur noch die Frage "gibt es einen Grund?". Zwei Fassungen derselben
   *  Regel waeren eine zu viel: gepflegt wuerde die eine, geurteilt haette
   *  die andere (Regel 15).
   *
   *  Der Text ist EIN Wort, weil er im Spiel neben dem Daumen steht. */
  warumNicht(
    id: TowerId, x: number, y: number, ausser: Tower | null = null,
  ): 'Rand' | 'Weg' | 'Gelände' | 'Turm' | null {
    const r = TOWERS[id].footprint / 2;
    if (x - r < 0 || y - r < 0 || x + r > WORLD_W || y + r > WORLD_H) return 'Rand';
    // Abstand zur Wegmitte minus der oertlichen halben Breite: an einer
    // Engstelle darf naeher gebaut werden als an einer breiten Stelle, und
    // genau das macht Engstellen wertvoll.
    for (const lane of this.lanes) {
      if (lane.distanceTo(x, y) < r + PATH_CLEARANCE + lane.halfNear(x, y)) return 'Weg';
    }
    for (const g of this.map.rough) {
      if (Math.hypot(g.x - x, g.y - y) < g.r + r) return 'Gelände';
    }
    for (const t of this.towers) {
      if (t === ausser) continue;
      if (Math.hypot(t.x - x, t.y - y) < r + TOWERS[t.def].footprint / 2 + 4) return 'Turm';
    }
    return null;
  }

  /** Den naechsten Punkt suchen, an dem dieser Turm stehen darf.
   *
   *  Warum es das braucht: ein Daumen ist kein Zeiger. Bei kleiner
   *  Vergroesserung deckt er hundert Weltpunkte ab, und bis v124 wurde der
   *  Tipppunkt WOERTLICH genommen - lag er zwei Punkte zu nah am Weg, geschah
   *  gar nichts. Kein Hinweis, keine Ablehnung, nichts. Wer bauen wollte,
   *  musste hineinzoomen, bis der Finger genauer war als die Regel.
   *
   *  Der Suchradius kommt deshalb NICHT aus einer festen Zahl, sondern aus
   *  der Ungenauigkeit des Fingers selbst: er wird in Bildschirmpunkten
   *  hereingereicht und hier in Weltpunkte umgerechnet. Weit herausgezoomt
   *  rastet es grosszuegig ein, herangezoomt kaum - beides Mal genau so weit,
   *  wie der Finger daneben liegen kann.
   *
   *  Ringweise nach aussen und mit fester Winkelfolge, damit zwei gleiche
   *  Laeufe denselben Platz finden. Ein Einrasten, das wuerfelt, waere im
   *  Determinismus-Tor sofort auffaellig - und im Spiel unheimlich.
   *
   *  Das Einrasten sitzt in der BEDIENUNG, nicht im Modell: `build` bekommt
   *  weiterhin einen fertigen Punkt. Sonst haenge die Balance daran, wie
   *  genau jemand tippt (Regel 4). */
  einrasten(
    id: TowerId, x: number, y: number, radius: number,
  ): { x: number; y: number } | null {
    if (this.canPlace(id, x, y)) return { x, y };
    if (radius <= 0) return null;
    const RINGE = 6, WINKEL = 16;
    for (let i = 1; i <= RINGE; i++) {
      const r = (radius * i) / RINGE;
      for (let w = 0; w < WINKEL; w++) {
        const a = (w / WINKEL) * Math.PI * 2;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (this.canPlace(id, px, py)) return { x: px, y: py };
      }
    }
    return null;
  }

  /** Werden gerade alle Reichweiten gezeigt? Gesetzt vom Halten auf leerer
   *  Flaeche, geloescht beim Loslassen. Kein Schalter, den man vergessen
   *  koennte - er haengt am Finger. */
  zeigeReichweiten = false;

  /** Zwei Haken fuer den Rauchtest.
   *
   *  Sie stehen hier und nicht im Werkzeug, weil `spawnEnemy` und `damage`
   *  privat sind - und privat sollen sie bleiben. Ein Test, der auf private
   *  Innereien greift, haelt sie fest; ein schmaler benannter Zugang laesst
   *  sie frei. */
  spawnZumPruefen(id: EnemyId, shield: number, traeger = 0): Enemy | undefined {
    this.spawnEnemy(id, 1, 0, shield, traeger);
    return this.enemies[this.enemies.length - 1];
  }

  trefferZumPruefen(e: Enemy, schaden: number): void {
    this.damage(e, schaden, null, '#fff', 0, 0);
  }

  /** Der Turm, der gerade gezogen wird, und wohin. Beides null, wenn nicht. */
  movingTower: Tower | null = null;
  movePoint: { x: number; y: number } | null = null;

  /** Darf dieser Turm ueberhaupt versetzt werden?
   *
   *  Nur zwischen den Wellen, und das ist eine Entscheidung mit Grund. B11
   *  steht im Verzeichnis als "gegen Fehlplatzierung" - also als Korrektur,
   *  nicht als Werkzeug. Waehrend einer Welle waere Versetzen etwas ganz
   *  anderes: man schoebe den Turm dorthin, wo es gerade brennt, und das ist
   *  eine neue Mechanik, keine Korrektur. Sie wuerde die Balance
   *  verschieben, und zwar deutlich - jeder Turm haette faktisch die
   *  Reichweite des halben Feldes.
   *
   *  Kostenlos, weil das Gegenteil schon existiert: Verkaufen und neu bauen
   *  kostet den Verkaufsabschlag. Waere Versetzen auch kostenpflichtig,
   *  waere es nur ein zweiter Weg zum selben Ergebnis. */
  canMove(): boolean {
    return !this.waveActive && this.phase === 'playing';
  }

  /** Die Tuerme, die der SPIELER gestellt hat - ohne die Zielunit.
   *
   *  Seit die Zielunit ein Turm ist, steht in `towers` von Anfang an einer
   *  drin. Jede Stelle, die "hat der Spieler schon gebaut?" oder "wieviele
   *  Tuerme stehen im Feld?" fragt, meint diese Liste und nicht jene. Die
   *  Einweisung hat es sofort gezeigt: drei ihrer Schritte galten mit dem
   *  ersten Bild als erledigt und erschienen nie mehr.
   *
   *  **Der Name heisst nicht `gebauteTuerme`, und das hat einen Grund.**
   *  Der Autarkie-Waechter liest die GEBAUTE Datei und sucht dort nach
   *  Ersatzschreibungen wie "Tuerme" - Eigenschaftsnamen ueberleben die
   *  Verkleinerung und stehen mit drin. Er faengt genau die Sorte Fehler,
   *  die man selbst nicht mehr sieht ("Moerser" stand bis v21 im Spiel);
   *  ihn dafuer stumpfer zu machen waere der falsche Weg. */
  get gebaute(): Tower[] {
    return this.towers.filter((t) => t.def !== 'core');
  }

  /** Einen Turm versetzen. Gibt zurueck, ob es geklappt hat. */
  moveTower(t: Tower, x: number, y: number): boolean {
    // Die Zielunit steht auf der Zielplattform. Sie zu verschieben hiesse,
    // das Ziel zu verschieben - die Bahnen enden weiterhin dort, wo sie
    // stand, und das Bauwerk staende daneben.
    if (t.def === 'core') return false;
    if (!this.canMove()) return false;
    if (!this.canPlace(t.def, x, y, t)) return false;
    t.x = x;
    t.y = y;
    // Das gespeicherte Ziel gilt nicht mehr - es kann ausser Reichweite
    // liegen, und ein Turm, der ins Leere zielt, sieht kaputt aus.
    t.target = null;
    t.retargetIn = 0;
    this.towersVersion++;
    return true;
  }

  /** Der Turm unter diesem Punkt - fuer die Auswahl. */
  /** Der Turm unter diesem Punkt - fuer die Auswahl.
   *
   *  `slack` ist die Trefferzugabe in Weltpixeln und kommt von der
   *  Bedienung: sie kennt den Massstab und weiss deshalb, wieviel Welt ein
   *  Fingerbreit ist. Gemessen war ein Bogenturm auf dem iPhone SE nur 22
   *  Bildschirmpunkte gross - halb so viel wie der Richtwert von 44.
   *
   *  Die Zugabe waechst nur, sie schrumpft nie: naeher heranzoomen darf das
   *  Treffen nicht erschweren. */
  towerUnder(x: number, y: number, scale: number): Tower | undefined {
    // Der Massstab ist Pflicht, kein Zusatz. Zuerst war die Trefferzugabe ein
    // Zusatzwert mit Vorgabe - und die Gegenprobe zeigte, dass man ihn an der
    // Aufrufstelle weglassen kann, ohne dass ein Tor es merkt. Eine Regel, die
    // man vergessen kann, wird vergessen.
    const slack = Math.max(10, GameState.tapSlack(scale));
    let best: Tower | undefined;
    let bestD = Infinity;
    for (const t of this.towers) {
      const d = Math.hypot(t.x - x, t.y - y);
      const r = TOWERS[t.def].footprint / 2 + slack;
      if (d < r && d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** Trefferzugabe in Weltpixeln fuer einen gegebenen Massstab.
   *
   *  Die eine Stelle, an der diese Regel steht. Bedienung und Pruefwerkzeug
   *  holen sie sich beide hier ab - haette das Werkzeug sie nachgebaut, waere
   *  die Gegenprobe durchgefallen, ohne dass es jemand merkt. */
  static tapSlack(scale: number, punkte = 44): number {
    return punkte / scale / 2;
  }

  /** Wie gross ein Turm auf dem Bildschirm zu treffen ist, in Punkten. */
  static tapSize(def: TowerId, scale: number): number {
    return (TOWERS[def].footprint / 2 + Math.max(10, GameState.tapSlack(scale))) * 2 * scale;
  }



  build(wx: number, wy: number, id: TowerId): boolean {
    // Die Zielunit steht schon. Sie ist nicht in TOWER_ORDER, also bietet
    // die Bauleiste sie nie an - hier steht der Riegel trotzdem, weil
    // "steht nicht im Menue" keine Regel ist, sondern eine Beobachtung.
    if (id === 'core') return false;
    const def = TOWERS[id];
    const x = snap(wx), y = snap(wy);
    if (!this.canPlace(id, x, y) || this.gold < def.base.cost) return false;
    this.gold -= def.base.cost;
    this.stats.goldSpent += def.base.cost;
    this.stats.towersBuilt++;
    const c = { x, y };
    const t: Tower = {
      id: this.nextId++, def: id, x: c.x, y: c.y,
      level: 1, branch: null, cooldownLeft: 0, angle: -Math.PI / 2, recoil: 0, flash: 0,
      pulse: 0, spring: 1,
      zielwahl: 'vorn',
      target: null, retargetIn: 0, kills: 0, damageDone: 0,
    };
    this.towers.push(t);
    this.towersVersion++;
    t.spring = 1;
    this.ring(c.x, c.y, 54, def.accent, 0.4, 3);
    Sfx.play('build');
    return true;
  }

  /** Ausbau. Auf Stufe 1 muss zugleich ein Zweig gewaehlt werden; danach ist
   *  die Entscheidung endgueltig und der Zweig steht fest. */
  upgrade(t: Tower, branch?: 0 | 1): boolean {
    const def = TOWERS[t.def];
    if (t.level >= MAX_LEVEL) return false;
    // Ein Turm ohne Verzweigung waehlt nicht - er baut geradeaus aus.
    const chosen: BranchIndex = t.branch ?? (hatZweigwahl(def) ? (branch ?? null) : 0);
    if (chosen === null) return false;
    const next = nextFor(def, chosen, t.level);
    if (!next || this.gold < next.cost) return false;
    this.gold -= next.cost;
    this.stats.goldSpent += next.cost;
    t.branch = chosen;
    t.level++;
    this.towersVersion++;
    t.spring = 1;
    this.ring(t.x, t.y, 66, accentFor(def, t.branch), 0.45, 4);
    Sfx.play('upgrade');
    return true;
  }

  sell(t: Tower): void {
    // Die Zielunit ist das Spielziel. Sie zu verkaufen hiesse, die Partie zu
    // verkaufen - und der Spieler haette dafuer auch noch Gold bekommen.
    if (t.def === 'core') return;
    const def = TOWERS[t.def];
    const value = sellValue(def, t.branch, t.level, this.perks.refund);
    this.gold += value;
    t.target = null;
    compact(this.towers, (o) => o === t);
    this.towersVersion++;
    if (this.selectedTower === t) this.selectedTower = null;
    this.float(t.x, t.y - 10, `+${value}`, C.gold, 22);
    this.ring(t.x, t.y, 48, C.stoneDark, 0.35, 2);
    Sfx.play('sell');
  }

  /** Werte der aktuellen Ausbaustufe eines Turms. */
  towerStats(t: Tower) { return statsFor(TOWERS[t.def], t.branch, t.level); }

  // ---------------------------------------------------------------- Wellen

  /** Der Wellenplan der aktuellen Karte. */
  get waves() { return this.map.waves; }
  get waveNumber(): number {
    return this.endless ? this.waveIndex + 1 : Math.min(this.waveIndex + 1, this.waves.length);
  }
  get totalWaves(): number { return this.waves.length; }
  get canStartWave(): boolean {
    return !this.waveActive && (this.endless || this.waveIndex < this.waves.length);
  }
  get nextWave() { return this.waveAt(this.waveIndex); }

  /** Der Wellenplan geht im Endlosmodus weiter: die letzten fuenf Wellen
   *  wiederholen sich, jede Runde mit mehr Gegnern. Die Lebenspunktkurve
   *  waechst ohnehin von selbst weiter. */
  waveAt(i: number) {
    const plan = this.waves;
    if (i < plan.length) return plan[i];
    const tail = Math.min(5, plan.length);
    const base = plan[plan.length - tail + ((i - plan.length) % tail)];
    const round = Math.floor((i - plan.length) / tail) + 1;
    const grow = 1 + round * 0.18;
    return {
      bonus: Math.round(base.bonus * (1 + round * 0.25)),
      note: `Endlos · Runde ${round}`,
      groups: base.groups.map((g) => ({ ...g, count: Math.max(1, Math.round(g.count * grow)) })),
    };
  }

  /** Gold fuer einen frueh gestarteten Angriff. Faellt linear auf null. */
  get earlyBonus(): number {
    if (!this.canStartWave || this.waveIndex === 0) return 0;
    const left = Math.max(0, EARLY_BONUS_WINDOW - this.idleTime);
    return Math.round((left / EARLY_BONUS_WINDOW) * EARLY_BONUS_MAX);
  }

  startWave(): void {
    if (!this.canStartWave) return;
    const bonus = this.earlyBonus;
    if (bonus > 0) {
      this.gold += bonus;
      this.stats.goldEarned += bonus;
      this.float(this.goal.x, this.goal.y - 70, `Frueh gestartet  +${bonus}`, C.gold, 22);
    }
    const wave = this.waveAt(this.waveIndex);
    // Spaetere Wellen kommen dichter: was zaehlt, ist die Huelle je Sekunde.
    const dense = 1 + this.waveIndex * this.diff.densityRamp;
    this.pending = [];
    // Auf mehrspurigen Karten werden die Bahnen abwechselnd bedient, damit
    // eine Welle nicht zufaellig nur einen Zuweg belastet.
    const laneCount = this.lanes.length;
    let laneTurn = this.waveIndex % laneCount;
    for (const g of wave.groups) {
      for (let i = 0; i < g.count; i++) {
        this.pending.push({
          time: g.delay + (i * g.gap) / dense,
          enemy: g.enemy, hpMul: g.hpMul ?? 1,
          shield: g.shield ?? 0,
          traeger: g.traeger ?? 0,
          lane: laneTurn % laneCount,
        });
        laneTurn++;
      }
    }
    this.pending.sort((a, b) => a.time - b.time);
    this.waveTime = 0;
    this.waveActive = true;
    this.idleTime = 0;
    Sfx.play('wave');
  }

  private finishWave(): void {
    const wave = this.waveAt(this.waveIndex);
    const payout = Math.round(wave.bonus * this.diff.bonusMul * this.map.balance.goldMul);
    this.gold += payout;
    this.stats.goldEarned += payout;
    this.float(this.goal.x, this.goal.y - 56, `Welle geschafft  +${payout}`, C.gold, 26);
    this.waveIndex++;
    this.waveActive = false;
    this.idleTime = 0;
    if (!this.endless && this.waveIndex >= this.waves.length) {
      this.finishRun(true);
      Sfx.play('win');
    }
  }

  // ----------------------------------------------------------- Faehigkeiten

  ready(id: AbilityId): boolean {
    return this.phase === 'playing' && this.abilityCd[id] <= 0;
  }

  /** Der Inspektor zumachen - was immer er gerade zeigt.
   *
   *  Er hat drei Fuellungen (gewaehlter Turm, Turm vor dem Kauf, Gegner aus
   *  der Wellenvorschau) und vier Wege, ihn zu schliessen: das Kreuz, die
   *  Esc-Taste, ein Tipp ins Leere und der Wellenstart. Ohne diese Stelle
   *  muesste jeder der vier alle drei Fuellungen kennen - und der vierte,
   *  der spaeter dazukommt, kennt sie nicht. */
  auswahlSchliessen(): void {
    this.selectedTower = null;
    this.buildChoice = null;
    this.gegnerInfo = null;
  }

  /** Waehlt eine gezielte Faehigkeit an oder loest eine sofortige aus. */
  chooseAbility(id: AbilityId): void {
    if (!this.ready(id)) return;
    const def = ABILITIES[id];
    if (def.kind === 'instant') { this.cast(id, 0, 0); return; }
    this.aiming = this.aiming === id ? null : id;
    this.buildChoice = null;
    this.selectedTower = null;
  }

  cast(id: AbilityId, x: number, y: number): boolean {
    if (!this.ready(id)) return false;
    const def = ABILITIES[id];
    this.abilityCd[id] = def.cooldown * this.perks.cooldownMul;
    this.stats.abilityUses[id] = (this.stats.abilityUses[id] ?? 0) + 1;
    this.aiming = null;

    if (id === 'meteor') {
      this.meteors.push({
        x, y, t: 0, dur: def.delay ?? 0.7,
        radius: def.radius ?? 100, damage: def.damage ?? 100,
      });
      Sfx.play('meteor');
      return true;
    }

    // Ernte: Gold statt Schaden.
    //
    // Sie ist die einzige Faehigkeit, die nichts auf dem Feld tut - und
    // deshalb die einzige, bei der man sich fragt, WANN. Frueh gezogen kauft
    // sie einen Turm mehr, spaet gezogen rettet sie eine Welle. Genau das
    // ist der Sinn von C17: eine Entscheidung, die nicht "wo", sondern
    // "wann" heisst.
    if (def.gold) {
      this.gold += def.gold;
      this.stats.goldEarned += def.gold;
      this.float(this.goal.x, this.goal.y - 90, `Ernte  +${def.gold}`, def.color, 26);
      this.ring(this.goal.x, this.goal.y, 260, def.color, 0.5, 5);
      Sfx.play('tap');
      return true;
    }

    // Bollwerk: haelt Gegner in einem Umkreis fest.
    //
    // Dieselbe Bremsmechanik wie der Frostschlag, nur oertlich und mit
    // vollem Stopp. Der Widerstand der Gegner wirkt weiter - ein
    // Leerentitan steht kuerzer als ein Schleicher.
    if (id === 'bollwerk') {
      const r2 = (def.radius ?? 150) ** 2;
      let gefasst = 0;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (dist2(x, y, e.x, e.y) > r2) continue;
        const w = 1 - ENEMIES[e.def].slowResist;
        e.wirkungen = wirkungAnlegen(e.wirkungen, 'bremse', (def.slow ?? 1) * w,
          def.slowTime ?? 3);
        this.ring(e.x, e.y, ENEMIES[e.def].radius * 2.2, def.color, 0.3, 2);
        gefasst++;
      }
      // Eine Grenze, keine Druckwelle.
    //
    // Der erste Entwurf nahm den ueblichen Ring: von null nach aussen,
    // Deckkraft an der Restlebensdauer. Der ist auf der Aufnahme SCHWAECHER
    // gewesen als die Reichweitenringe der Tuerme daneben - denn er
    // erreicht seinen vollen Radius genau dann, wenn er unsichtbar wird.
    // Fuer einen Stoss ist das richtig, fuer eine Sperre verkehrt herum.
    //
    // Jetzt steht er von Anfang an fast auf vollem Radius und haelt so
    // lange wie der Halt selbst. Damit zeigt das Bild, was die Regel sagt:
    // dieser Bereich ist fuer drei Sekunden dicht.
    const rr = def.radius ?? 150;
    this.ring(x, y, rr, def.color, def.slowTime ?? 3, 7, rr * 0.88);
      this.float(x, y - 60, gefasst ? `Bollwerk  ${gefasst}` : 'Bollwerk', def.color, 24);
      Sfx.play('freeze');
      return true;
    }

    // Frostschlag: legt sich ueber das ganze Feld.
    const eff = def.slow ?? 0.6;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const r = 1 - ENEMIES[e.def].slowResist;
      e.wirkungen = wirkungAnlegen(e.wirkungen, 'bremse', eff * r, def.slowTime ?? 3);
      this.ring(e.x, e.y, ENEMIES[e.def].radius * 2.4, def.color, 0.35, 2);
    }
    this.ring(this.goal.x, this.goal.y, WORLD_W, def.color, 0.7, 6);
    this.float(this.goal.x, this.goal.y - 90, 'Frostschlag', def.color, 26);
    Sfx.play('freeze');
    return true;
  }

  private updateMeteors(dt: number): void {
    if (!this.meteors.length) return;
    for (const m of this.meteors) {
      m.t += dt / m.dur;
      if (m.t < 1) continue;
      // Einschlag: trifft Boden und Luft, am Rand halber Schaden.
      const r2 = m.radius * m.radius;
      const cand = this.grid.query(m.x, m.y, m.radius, this.qRaw);
      for (let i = 0; i < cand.length; i++) {
        const e = cand[i];
        if (e.dead) continue;
        const d2 = dist2(m.x, m.y, e.x, e.y);
        if (d2 > r2) continue;
        const f = 1 - 0.5 * Math.sqrt(d2) / m.radius;
        this.damage(e, m.damage * f, null, ABILITIES.meteor.color, 0, 0);
      }
      this.ring(m.x, m.y, m.radius, ABILITIES.meteor.color, 0.5, 7);
      this.ring(m.x, m.y, m.radius * 1.5, '#FFFFFF', 0.3, 3);
      this.spark(m.x, m.y, ABILITIES.meteor.color, this.quality === 'hoch' ? 34 : 12, 340);
      this.smoke(m.x, m.y, 16, 150);
      this.debris(m.x, m.y, '#6B5B44', this.quality === 'hoch' ? 14 : 4, 320);
      this.shake = Math.min(1, this.shake + 0.8);
      this.stop(0.5);
      this.flashT = 1;
      Sfx.play('boom');
    }
    compact(this.meteors, (m) => m.t >= 1);
  }

  /** Abschluss eines Laufs: Bestwert, Sterne, Spielstand loeschen. */
  private finishRun(won: boolean): void {
    this.phase = won ? 'won' : 'lost';
    clearGame();
    const reached = won ? this.waveIndex : this.waveNumber - 1;
    recordRun(this.map.id, this.difficulty, reached, won ? this.lives : 0, this.endless);
    // Und im Endlosmodus zusaetzlich in die Liste - dort ist nicht der eine
    // Bestwert die Auskunft, sondern wie weit man ueblicherweise kommt (C27).
    if (this.endless) recordEndlos(this.map.id, reached);
    // Der Stand VOR diesem Lauf, festgehalten bevor er ueberschrieben wird.
    this.sterneVorher = getStars(this.map.id, this.difficulty);
    // Im Endlosmodus gibt es keine Sterne - er hat kein Ende, an dem man
    // messen koennte, wie sauber man durchgekommen ist.
    this.stars = this.endless ? 0 : starsFor(won, this.lives, this.maxLives);
    if (this.stars > 0) recordStars(this.map.id, this.difficulty, this.stars);
  }

  // ---------------------------------------------------------------- Update

  /** Trefferstopp ausloesen. `weight` von 0 bis 1.
   *
   *  Gedeckelt auf 90 Millisekunden je Sekunde: sonst steht das Spiel bei
   *  einem dichten Gefecht mehr still, als es laeuft. Politur darf spuerbar
   *  sein, aber nie im Weg stehen. */
  private stop(weight: number): void {
    const want = 0.02 + weight * 0.08;
    const left = Math.max(0, 0.09 - this.stopBudget);
    const use = Math.min(want, left);
    this.stopBudget += use;
    this.hitStop = Math.max(this.hitStop, use);
  }

  update(dtReal: number): void {
    Sfx.frame();
    if (this.phase !== 'playing' || this.paused) {
      this.time += dtReal;
      this.crystalPulse += dtReal;
      this.decayFx(dtReal);
      return;
    }

    const dt = dtReal * this.speed;
    this.time += dt;
    this.stats.duration += dt;
    this.crystalPulse += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dtReal * 3);
    this.stopBudget = Math.max(0, this.stopBudget - dtReal * 0.09);
    if (this.hitStop > 0) {
      // Waehrend des Trefferstopps steht die Welt still - Rueckmeldung und
      // Bedienung laufen weiter.
      this.hitStop = Math.max(0, this.hitStop - dtReal);
      return;
    }
    if (this.crystalHit > 0) this.crystalHit = Math.max(0, this.crystalHit - dtReal * 2);
    if (!this.waveActive) this.idleTime += dtReal;

    if (this.waveActive) {
      this.waveTime += dt;
      while (this.pending.length && this.pending[0].time <= this.waveTime) {
        const p = this.pending.shift()!;
        this.spawnEnemy(p.enemy, p.hpMul, this.offeneBahn(p.lane), p.shield ?? 0, p.traeger ?? 0);
      }
      if (!this.pending.length && !this.enemies.length) this.finishWave();
    }

    for (const id of ABILITY_ORDER) {
      if (this.abilityCd[id] > 0) {
        this.abilityCd[id] = Math.max(0, this.abilityCd[id] - dt);
        if (this.abilityCd[id] === 0) Sfx.play('ready');
      }
    }

    this.updateEnemies(dt);
    this.rebuildGrid();
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateMeteors(dt);
    this.decayFx(dt);

    if (this.lives <= 0) {
      this.lives = 0;
      this.finishRun(false);
      Sfx.play('lose');
    }
  }

  /** Nur zum Pruefen: wieviele Gegner je Bahn erschienen sind, und wieviele
   *  davon, obwohl ihre Bahn gesperrt war (muss null bleiben).
   *
   *  Gezaehlt wird beim ERSCHEINEN, nicht durch Absuchen der Gegnerliste: die
   *  Gegner kommen aus einem Vorrat und werden wiederverwendet, eine Zaehlung
   *  ueber Objektidentitaet zaehlt also zu wenig. */
  spawnsJeBahn: number[] = [];
  spawnsTrotzSperre = 0;

  /** Ist dieser Zuweg gerade gesperrt? (C24)
   *
   *  Der Takt haengt an `waveTime`, nicht an der Gesamtzeit: so beginnt er
   *  mit jeder Welle gleich, und wer einmal gesehen hat, wann das Tor faellt,
   *  kann damit planen. Ein Tor, dessen Takt man nicht vorhersagen kann, ist
   *  kein Hindernis, sondern eine Laune.
   */
  torZu(bahn: number, zeit = this.waveTime): boolean {
    const t = this.map.tor;
    if (!t || t.bahn !== bahn) return false;
    const takt = t.zu + t.auf;
    if (takt <= 0) return false;
    // Der Takt beginnt OFFEN: die erste Welle soll nicht mit einer Sperre
    // anfangen, bevor jemand verstanden hat, dass es ein Tor gibt.
    return ((zeit % takt) + takt) % takt >= t.auf;
  }

  /** Die Bahn, auf der jetzt wirklich erschienen wird.
   *
   *  Ist die vorgesehene gesperrt, rueckt es auf die naechste offene - und
   *  zwar der Reihe nach, nicht zufaellig: derselbe Spielstand muss denselben
   *  Ablauf ergeben (das Determinismus-Tor prueft genau das). */
  private offeneBahn(bahn: number): number {
    const n = this.lanes.length;
    for (let i = 0; i < n; i++) {
      const b = (bahn + i) % n;
      if (!this.torZu(b)) return b;
    }
    return bahn;   // alle zu waere ein Datenfehler; der Waechter faengt ihn
  }

  private spawnEnemy(
    id: EnemyId, hpMul: number, lane: number, shield = 0, traeger = 0,
  ): void {
    this.spawnsJeBahn[lane] = (this.spawnsJeBahn[lane] ?? 0) + 1;
    if (this.torZu(lane)) this.spawnsTrotzSperre++;
    const def = ENEMIES[id];
    const ln = lane % this.lanes.length;
    const p0 = this.lanes[ln].pts[0];
    const ramp = hpScale(this.diff, this.waveIndex, this.waves.length, this.map.balance.hpMul);
    const hp = Math.round(def.hp * hpMul * ramp);
    // Flieger starten leicht versetzt, damit ein Schwarm nicht als eine Linie
    // uebereinander liegt.
    const off = def.flying ? (this.rng.next() - 0.5) * 200 : 0;
    this.enemies.push({
      id: this.nextId++, def: id, x: p0.x, y: p0.y + off,
      hp, hpMax: hp, speed: def.speed, lane: ln, heading: 0,
      side: (this.rng.next() * 2 - 1) * 0.85, travelled: 0,
      wirkungen: null, auraIn: 0, shield, traeger,
      hitFlash: 0, squash: 0, hpShown: hp, wobble: this.rng.next() * 9,
      dead: false, leaked: false,
    });
  }

  /** Bruchstuecke eines zerfallenden Gegners. Sie erben Pfadposition und
   *  Fortschritt - sonst wuerden sie am Anfang wieder auftauchen. */
  private splitEnemy(parent: Enemy, rule: { into: EnemyId; count: number; hpFactor: number }): void {
    const child = ENEMIES[rule.into];
    const hp = Math.max(1, Math.round(parent.hpMax * rule.hpFactor));
    for (let i = 0; i < rule.count; i++) {
      const spread = (i - (rule.count - 1) / 2) * 14;
      this.enemies.push({
        id: this.nextId++, def: rule.into,
        x: parent.x + spread, y: parent.y + (this.rng.next() - 0.5) * 10,
        hp, hpMax: hp, speed: child.speed,
        // Spaene erben den Schild NICHT. Ein Spalter mit Schild waere sonst
        // ein Gegner mit drei Schilden - einer fuer sich, zwei fuer die
        // Bruchstuecke -, und das steht in keiner Wellenzeile.
        lane: parent.lane, heading: parent.heading, auraIn: 0, shield: 0, traeger: 0,
        // Spaene stieben zur Seite auseinander.
        side: Math.max(-1, Math.min(1, parent.side + (this.rng.next() - 0.5) * 0.9)),
        travelled: Math.max(0, parent.travelled - 6),
        // Der Span erbt, was am Spalter hing - eine KOPIE, sonst teilten
        // sich Erzeuger und Bruchstueck dieselbe Liste.
        wirkungen: parent.wirkungen ? parent.wirkungen.map((w) => ({ ...w })) : null,
        hitFlash: 0, squash: 0, hpShown: hp, wobble: this.rng.next() * 9,
        dead: false, leaked: false,
      });
    }
    this.ring(parent.x, parent.y, 46, child.trim, 0.3, 3);
  }

  /** Wie weit ein Schildtraeger wirkt, und wie oft. */
  private static readonly TRAEGER_REICHWEITE = 190;
  private static readonly TRAEGER_TAKT = 1.6;

  /** Die Schildtraeger laden ihre Nachbarn nach.
   *
   *  Getrennt von der Hauptschleife, weil hier ueber PAARE gelaufen wird:
   *  jeder Traeger sieht alle anderen. Bei einem Dutzend Gegnern in
   *  Reichweite kostet das nichts; bei einem Traeger, der jedes Bild rechnet,
   *  schon - deshalb der Takt.
   *
   *  Der Traeger gibt NUR anderen, nie sich selbst. Sonst waere er ein
   *  unsterblicher Einzelgaenger statt einer Stuetze, und die Zielreihenfolge
   *  waere wieder egal: man koennte ihn stehen lassen und den Rest raeumen.
   */
  private updateTraeger(dt: number): void {
    const R2 = GameState.TRAEGER_REICHWEITE ** 2;
    for (const t of this.enemies) {
      if (t.dead || t.traeger <= 0) continue;
      t.auraIn -= dt;
      if (t.auraIn > 0) continue;
      t.auraIn = GameState.TRAEGER_TAKT;
      for (const e of this.enemies) {
        if (e === t || e.dead) continue;
        if (e.shield >= t.traeger) continue;
        if (dist2(t.x, t.y, e.x, e.y) > R2) continue;
        e.shield++;
        this.ring(e.x, e.y, ENEMIES[e.def].radius * 1.3, '#B07CFF', 0.22, 2);
      }
    }
  }

  private updateEnemies(dt: number): void {
    this.updateTraeger(dt);
    let leaked = false;
    for (const e of this.enemies) {
      // Die Uhr aller anliegenden Wirkungen (TF-015). Abgelaufene fallen an
      // Ort und Stelle heraus; die Liste wird nicht neu erzeugt, weil dieser
      // Zweig in JEDEM Bild ueber JEDEN Gegner laeuft.
      if (e.wirkungen) {
        wirkungenTicken(e.wirkungen, dt);
        if (!e.wirkungen.length) e.wirkungen = null;
      }
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      if (e.squash > 0) e.squash = Math.max(0, e.squash - dt * 6);
      // Die Lebensleiste laeuft dem echten Wert nach - schnell, aber sichtbar.
      if (e.hpShown !== e.hp) {
        const d = e.hp - e.hpShown;
        e.hpShown += d * Math.min(1, dt * 9) + Math.sign(d) * Math.min(Math.abs(d), e.hpMax * dt * 0.6);
        if (Math.abs(e.hp - e.hpShown) < 0.5) e.hpShown = e.hp;
      }

      const edef = ENEMIES[e.def];
      if (edef.flying) {
        // Luftlinie zum Herzkristall - kein Pfad, keine Kurven.
        const dx = this.goal.x - e.x, dy = this.goal.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = e.speed * tempoFaktor(e.wirkungen) * dt;
        // Fortschritt auf denselben Massstab wie am Boden bringen, damit
        // "vorderstes Ziel" fuer beide dasselbe bedeutet.
        e.travelled = this.pathTotal * (1 - d / (this.airTotal || d));
        if (d <= step + 6) {
          e.x = this.goal.x; e.y = this.goal.y;
          this.leak(e, edef);
          leaked = true;
        } else {
          e.x += (dx / d) * step;
          e.y += (dy / d) * step;
        }
        continue;
      }

      // Bewegung auf der Kurve: die zurueckgelegte Strecke ist die einzige
      // Zustandsgroesse. Position und Blickrichtung folgen daraus - dadurch
      // laeuft ein Gegner in einer engen Kurve genauso schnell wie auf der
      // Geraden, und er dreht sich weich mit.
      const path = this.lanes[e.lane] ?? this.lanes[0];
      e.travelled += e.speed * tempoFaktor(e.wirkungen) * dt;
      if (e.travelled >= path.length) {
        e.x = this.goal.x; e.y = this.goal.y;
        this.leak(e, edef);
        leaked = true;
      } else {
        const p = path.at(e.travelled);
        // Quer zum Weg versetzt, aber nie ueber den Rand hinaus: bei einer
        // Engstelle ruecken alle zusammen, auf breiter Strecke faechern sie
        // auf. Genau dafuer traegt der Weg seine wechselnde Breite.
        const platz = Math.max(0, p.half - edef.radius * 0.55 - 4);
        const quer = e.side * platz;
        e.x = p.x + Math.cos(p.angle + Math.PI / 2) * quer;
        e.y = p.y + Math.sin(p.angle + Math.PI / 2) * quer;
        e.heading = p.angle;
      }
    }
    if (leaked) Sfx.play('leak');
    if (compact(this.enemies, (e) => e.dead) > 0) {
      // Verweise auf entfernte Gegner loesen.
      for (let i = 0; i < this.towers.length; i++) {
        const tw = this.towers[i];
        if (tw.target && tw.target.dead) tw.target = null;
      }
    }
  }

  private rebuildGrid(): void {
    this.grid.clear();
    for (let i = 0; i < this.enemies.length; i++) this.grid.insert(this.enemies[i]);
  }

  /** Ein Gegner erreicht den Kristall. */
  private leak(e: Enemy, def: typeof ENEMIES[EnemyId]): void {
    e.leaked = true; e.dead = true;
    // Verbucht wird, was WIRKLICH verloren geht, nicht was der Gegner
    // mitbringt.
    //
    // Der Kristall wird bei null abgeschnitten. Ein Koloss mit drei Punkten
    // Durchschlag, der auf einen Kristall mit einem Punkt Rest trifft,
    // kostete bis v174 trotzdem drei: die Bilanz meldete "Welle 14 (-3)",
    // die Anzeige zeigte "-3", und das Spiel verlor einen. Gefunden hat es
    // der Durchlauf ueber jede Karte (T6) - auf der Ascheschlucht standen
    // 61 verbuchte Punkte gegen 60 wirklich verlorene.
    const wirklich = Math.min(def.leak, Math.max(0, this.lives));
    this.lives -= wirklich;
    this.leakedTotal++;
    this.stats.leaksByWave[this.waveIndex] =
      (this.stats.leaksByWave[this.waveIndex] ?? 0) + wirklich;
    this.crystalHit = 1;
    this.shake = Math.min(1, this.shake + 0.55);
    this.stop(0.8);
    this.float(this.goal.x, this.goal.y - 44, `-${wirklich}`, C.danger, 28);
    this.ring(this.goal.x, this.goal.y, 120, C.danger, 0.5, 5);
  }

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      const def = TOWERS[t.def];
      const st = this.towerStats(t);
      if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 6);
      if (t.flash > 0) t.flash = Math.max(0, t.flash - dt * 9);
      if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 2.2);
      if (t.spring > 0) t.spring = Math.max(0, t.spring - dt * 3.2);
      t.cooldownLeft -= dt;

      if (def.attack === 'aura') {
        if (t.cooldownLeft > 0) continue;
        const targets = this.enemiesInRange(t.x, t.y, st.range, this.qArea, def.hitsAir);
        if (!targets.length) continue;
        t.cooldownLeft = st.cooldown;
        t.pulse = 1;
        t.flash = 1;
        this.ring(t.x, t.y, st.range, def.accent, 0.45, 3);
        Sfx.play('frost');
        for (let i = 0; i < targets.length; i++) {
          this.damage(targets[i], st.damage, t, accentFor(def, t.branch),
            st.slow ?? 0, st.slowTime ?? 0, st.pierce ?? 0);
        }
        continue;
      }

      // Die Zielsuche lief bisher jedes Bild fuer jeden Turm - auch waehrend
      // der Turm nachlaedt und gar nicht schiessen kann. Das Ziel wird nun
      // zwischengespeichert und nur alle 120 ms neu gesucht, oder sofort,
      // wenn es tot oder aus der Reichweite gelaufen ist.
      const r2 = st.range * st.range;
      let target = t.target;
      if (target && (target.dead || dist2(t.x, t.y, target.x, target.y) > r2)) target = null;
      t.retargetIn -= dt;
      if (!target || t.retargetIn <= 0) {
        target = this.findTarget(t.x, t.y, st.range, def.hitsAir, t.zielwahl);
        t.retargetIn = 0.12;
      }
      t.target = target;
      if (!target) continue;

      // Vorgehalten wird ueber die Strecke auf der KARTE - von der
      // Standmitte, nicht von der Muendung.
      //
      // Das ist keine Nachlaessigkeit, sondern der Punkt: die Karte ist in
      // Dreiviertelansicht gemalt. Die Muendung liegt hundertvierzehn
      // Bildpunkte ueber dem Fuss, aber sie steht auf demselben Fleck - das
      // ist HOEHE, keine Entfernung. Rechnet man sie als Entfernung mit,
      // fliegt jede Granate ein Sechstel zu lang und schlaegt hinter der
      // Traube ein: `npm run sim` fiel damit von 34 auf 16 von 60 Punkten
      // auf der Ascheschlucht, bevor es auffiel.
      const aim = def.attack === 'splash'
        ? this.predict(target, dist(t.x, t.y, target.x, target.y) / def.projectileSpeed)
        : { x: target.x, y: target.y };

      const want = Math.atan2(aim.y - t.y, aim.x - t.x);
      let diff = want - t.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.angle += diff * Math.min(1, dt * 12);
      if (t.cooldownLeft > 0) continue;
      t.cooldownLeft = st.cooldown;
      t.recoil = 1;
      t.flash = 1;

      if (def.attack === 'single') {
        Sfx.play('arrow');
        this.projectiles.push(this.makeProjectile('homing', t, target, aim, st, accentFor(def, t.branch), def.projectileSpeed));
      } else if (def.attack === 'splash') {
        Sfx.play('mortar');
        this.projectiles.push(this.makeProjectile('ballistic', t, null, aim, st, accentFor(def, t.branch), def.projectileSpeed));
      } else {
        Sfx.play('prism');
        this.chain(t, target, st.damage, st.chains ?? 0, st.falloff ?? 0.6, st.range,
          accentFor(def, t.branch), st.pierce ?? 0);
      }
    }
  }

  private makeProjectile(
    kind: 'homing' | 'ballistic', t: Tower, target: Enemy | null,
    aim: Vec, st: { damage: number; slow?: number; slowTime?: number; splash?: number; pierce?: number },
    color: string, speed: number,
  ): Projectile {
    // Der Schuss verlaesst das ROHR, nicht die Standmitte.
    //
    // Bis v144 stand hier `t.x, t.y` - beim Bogenturm rund hundert
    // Weltpunkte unter der Armbrust, beim Moerser hundertvierzehn unter der
    // Rohroeffnung. Auf dem Zielgeraet sind das gut siebzig
    // Bildschirmpunkte: das Geschoss erschien im Sockel und flog durch den
    // eigenen Turm hindurch (TF-019).
    //
    // Wo das Rohr endet, steht in `src/data/turmgestalt.ts` - derselben
    // Stelle, aus der die Zeichenschicht ihre Masse nimmt.
    const m = muendung(t.def, t.angle);
    const d = dist(t.x, t.y, aim.x, aim.y);
    const p = this.projectilePool.obtain();
    p.kind = kind;
    p.x = t.x; p.y = t.y; p.sx = t.x; p.sy = t.y; p.tx = aim.x; p.ty = aim.y;
    // Gesehen kommt der Schuss aus dem Rohr, gerechnet vom Fuss - siehe
    // `ox` in types.ts.
    p.ox = m.x; p.oy = m.y; p.oT = 1;
    p.target = target; p.owner = t; p.speed = speed; p.damage = st.damage;
    p.slow = st.slow ?? 0; p.slowTime = st.slowTime ?? 0; p.splash = st.splash ?? 0;
    p.pierce = st.pierce ?? 0;
    p.color = color; p.t = 0; p.dur = Math.max(0.12, d / speed);
    p.life = 3; p.dead = false;
    p.dirX = d > 0 ? (aim.x - t.x) / d : 1;
    p.dirY = d > 0 ? (aim.y - t.y) / d : 0;
    p.luft = TOWERS[t.def].hitsAir;
    if (kind === 'homing') this.stats.schuesse++;
    return p;
  }

  /** Vorhalten: wohin laeuft der Gegner in der Flugzeit des Geschosses. */
  /** Vorhalten: wo ist der Gegner, wenn das Geschoss ankommt?
   *
   *  Auf der Kurve ist das eine einzige Nachschlagefrage statt eines Laufs
   *  ueber Wegabschnitte - die Strecke ist bekannt, der Rest folgt. */
  private predict(e: Enemy, flight: number): Vec {
    if (ENEMIES[e.def].flying) {
      const d = dist(e.x, e.y, this.goal.x, this.goal.y);
      const move = Math.min(d, e.speed * tempoFaktor(e.wirkungen) * flight);
      return d > 0
        ? { x: e.x + ((this.goal.x - e.x) / d) * move, y: e.y + ((this.goal.y - e.y) / d) * move }
        : { x: e.x, y: e.y };
    }
    const path = this.lanes[e.lane] ?? this.lanes[0];
    const s2 = Math.min(path.length, e.travelled + e.speed * tempoFaktor(e.wirkungen) * flight);
    const p = path.at(s2);
    return { x: p.x, y: p.y };
  }


  private chain(
    t: Tower, first: Enemy, damage: number, jumps: number,
    falloff: number, range: number, color: string, pierce: number,
  ): void {
    const seen = this.chainSeen;
    seen.clear();
    const pts = this.chainPts;
    pts.length = 0;
    // Auch der Blitz geht vom Kristall aus, nicht vom Sockel.
    const m = muendung(t.def, t.angle);
    pts.push({ x: t.x + m.x, y: t.y + m.y });
    let cur: Enemy | null = first;
    let dmg = damage;
    const jumpRange = range * 0.62;
    for (let i = 0; i <= jumps && cur; i++) {
      seen.add(cur.id);
      pts.push({ x: cur.x, y: cur.y });
      this.damage(cur, dmg, t, color, 0, 0, pierce);
      dmg *= falloff;
      let next: Enemy | null = null;
      let bestD = jumpRange * jumpRange;
      const cand = this.grid.query(cur.x, cur.y, jumpRange, this.qChain);
      for (let k = 0; k < cand.length; k++) {
        const e = cand[k];
        if (e.dead || seen.has(e.id)) continue;
        const d = dist2(cur.x, cur.y, e.x, e.y);
        if (d < bestD) { bestD = d; next = e; }
      }
      cur = next;
    }
    const bolt = this.boltPool.obtain();
    bolt.pts.length = 0;
    for (let i = 0; i < pts.length; i++) bolt.pts.push(pts[i]);
    bolt.color = color; bolt.life = 0.14; bolt.maxLife = 0.14;
    this.bolts.push(bolt);
  }

  /** Alle lebenden Gegner im Umkreis, geschrieben in die uebergebene
   *  Kratzflaeche - kein neues Array pro Aufruf. */
  private enemiesInRange(x: number, y: number, range: number, out: Enemy[], airOk: boolean): Enemy[] {
    const cand = this.grid.query(x, y, range, this.qRaw);
    const r2 = range * range;
    const keep: Enemy[] = out;
    keep.length = 0;
    for (let i = 0; i < cand.length; i++) {
      const e = cand[i];
      if (e.dead) continue;
      if (!airOk && ENEMIES[e.def].flying) continue;
      if (dist2(x, y, e.x, e.y) <= r2) keep.push(e);
    }
    return keep;
  }

  /** Vorderstes Ziel in Reichweite - Standardstrategie in Tower Defense. */
  /** Das Ziel eines Turms.
   *
   *  Bis v106 gab es nur ein Kriterium - der am weitesten Gelaufene - und es
   *  steht bis heute als Standard fest. Das ist kein Zufall: die ganze
   *  Balance ist dagegen geeicht, und ein anderer Standard haette jede Zahl
   *  in `npm run sim` mitverschoben. Wer waehlt, waehlt bewusst.
   *
   *  Bei Gleichstand gewinnt der zuerst gefundene. Das ist wichtig fuer den
   *  Determinismus: die Reihenfolge aus dem Gitter ist bei gleicher Aussaat
   *  dieselbe, also ist es auch die Wahl. Deshalb steht ueberall ein striktes
   *  Groesser oder Kleiner und nirgends ein Groessergleich. */
  private findTarget(
    x: number, y: number, range: number, airOk: boolean, wahl: Zielwahl = 'vorn',
  ): Enemy | null {
    const cand = this.grid.query(x, y, range, this.qTarget);
    let best: Enemy | null = null;
    let bestWert = 0;
    const r2 = range * range;
    for (let i = 0; i < cand.length; i++) {
      const e = cand[i];
      if (e.dead) continue;
      if (!airOk && ENEMIES[e.def].flying) continue;
      const d2 = dist2(x, y, e.x, e.y);
      if (d2 > r2) continue;
      // Ein gemeinsames Mass, bei dem immer der groesste Wert gewinnt: dann
      // steht die Vergleichslogik einmal da und nicht viermal.
      const wert = wahl === 'vorn' ? e.travelled
        : wahl === 'hinten' ? -e.travelled
          : wahl === 'stark' ? e.hp
            : wahl === 'schwach' ? -e.hp
              : -d2;
      if (!best || wert > bestWert) { best = e; bestWert = wert; }
    }
    return best;
  }

  /** Ein Ersatzziel fuer ein verwaistes Geschoss.
   *
   *  Gesucht wird in einem Kegel um die Flugrichtung: naechster Gegner
   *  gewinnt, nicht vorderster. Ein Geschoss hat keinen Ueberblick, es hat
   *  eine Richtung.
   *
   *  Der Kegel ist bewusst eng (halber Oeffnungswinkel 40 Grad): weiter
   *  gefasst wuerde ein Schuss um die Ecke biegen, und die Frage, wohin ein
   *  Turm feuert, waere keine Frage mehr. Die Reichweite des Turms gilt hier
   *  NICHT - das Geschoss ist unterwegs, nicht der Turm. */
  private ersatzziel(p: Projectile): Enemy | null {
    const cand = this.grid.query(p.x, p.y, ERSATZ_UMKREIS, this.qErsatz);
    let best: Enemy | null = null;
    let bestD2 = ERSATZ_UMKREIS * ERSATZ_UMKREIS;
    for (let i = 0; i < cand.length; i++) {
      const e = cand[i];
      if (e.dead) continue;
      if (!p.luft && ENEMIES[e.def].flying) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > bestD2) continue;
      const d = Math.sqrt(d2);
      // Innerhalb des Kegels? Skalarprodukt der Einheitsvektoren.
      if (d > 1 && (dx / d) * p.dirX + (dy / d) * p.dirY < ERSATZ_KEGEL) continue;
      best = e; bestD2 = d2;
    }
    return best;
  }

  private updateProjectiles(dt: number): void {
    let any = false;
    for (const p of this.projectiles) {
      // Ein von aussen abgeschriebenes Geschoss fliegt sonst weiter.
      //
      // Gefunden durch eine Gegenprobe, die NICHT anschlug (Regel 3): sie
      // setzte beim Verkauf `dead` auf alle Geschosse des Turms - und der
      // Schaden kam trotzdem an, weil diese Schleife `dead` gar nicht liest.
      // Aufgeraeumt wird erst danach, und nur wenn IN der Schleife etwas
      // gestorben ist. Heute setzt niemand `dead` von aussen; wer es das
      // naechste Mal tut, faellt in dieselbe Falle.
      if (p.dead) { any = true; continue; }
      // Der Muendungsversatz sinkt auf die Bodenebene ab.
      if (p.oT > 0) p.oT = Math.max(0, p.oT - dt / VERSATZ_ZEIT);
      p.life -= dt;
      if (p.life <= 0) {
        if (p.kind === 'homing') this.stats.schuesseOhneWirkung++;
        p.dead = true; any = true; continue;
      }

      if (p.kind === 'ballistic') {
        p.t += dt / p.dur;
        if (p.t >= 1) {
          p.x = p.tx; p.y = p.ty;
          this.explode(p);
          p.dead = true; any = true;
        } else {
          p.x = p.sx + (p.tx - p.sx) * p.t;
          p.y = p.sy + (p.ty - p.sy) * p.t;
        }
        continue;
      }

      const step = p.speed * dt;
      let tgt = p.target && !p.target.dead ? p.target : null;

      // Das Ziel ist im Flug gestorben - bei sechs Schnellfeuertuermen auf
      // eine dichte Welle war das jeder achte Schuss. Der Schuss ist aber
      // laengst bezahlt: die Abklingzeit laeuft, seit er die Muendung
      // verlassen hat. Also sucht er sich ein Ersatzziel VOR sich, statt zu
      // verpuffen. Nur vor sich - ein Geschoss, das kehrt macht, waere ein
      // Zauber und keine Waffe.
      if (!tgt) tgt = this.ersatzziel(p);

      if (!tgt) {
        // Kein Ziel im Kegel: geradeaus weiter und am Rand verloeschen.
        // Es sucht in jedem Bild neu - wer in seine Bahn laeuft, wird
        // getroffen.
        p.target = null;
        p.x += p.dirX * step;
        p.y += p.dirY * step;
        if (p.x < -40 || p.x > WORLD_W + 40 || p.y < -40 || p.y > WORLD_H + 40) {
          this.stats.schuesseOhneWirkung++;
          p.dead = true; any = true;
        }
        continue;
      }

      p.target = tgt;
      const dx = tgt.x - p.x, dy = tgt.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d <= step + ENEMIES[tgt.def].radius * 0.6) {
        this.damage(tgt, p.damage, p.owner, p.color, p.slow, p.slowTime, p.pierce);
        p.dead = true; any = true;
      } else {
        p.dirX = dx / d; p.dirY = dy / d;
        p.x += p.dirX * step;
        p.y += p.dirY * step;
      }
    }
    if (any) {
      compact(this.projectiles, (p) => p.dead, (p) => {
        p.target = null; p.owner = null;
        this.projectilePool.release(p);
      });
    }
  }

  private explode(p: Projectile): void {
    Sfx.play('boom');
    this.ring(p.x, p.y, p.splash, p.color, 0.35, 5);
    this.spark(p.x, p.y, p.color, this.quality === 'hoch' ? 14 : 6, 220);
    this.smoke(p.x, p.y, 7, 90);
    this.debris(p.x, p.y, '#6B5B44', this.quality === 'hoch' ? 6 : 2, 190);
    this.shake = Math.min(1, this.shake + 0.18);
    const r2 = p.splash * p.splash;
    const cand = this.grid.query(p.x, p.y, p.splash, this.qRaw);
    for (let i = 0; i < cand.length; i++) {
      const e = cand[i];
      if (e.dead || ENEMIES[e.def].flying) continue;
      const d2 = dist2(p.x, p.y, e.x, e.y);
      if (d2 > r2) continue;
      // Am Rand der Explosion nur die Haelfte.
      const f = 1 - 0.5 * Math.sqrt(d2) / p.splash;
      this.damage(e, p.damage * f, p.owner, p.color, 0, 0, p.pierce);
    }
  }

  private damage(
    e: Enemy, raw: number, owner: Tower | null, color: string,
    slow: number, slowTime: number, pierce = 0,
  ): void {
    if (e.dead) return;
    const def = ENEMIES[e.def];

    // Der Schild schluckt ganze Treffer, nicht Anteile.
    //
    // Er zaehlt TREFFER, nicht Schaden - deshalb hilft Schnellfeuer und nicht
    // Wucht. Genau umgekehrt zur Panzerung, und das ist der Sinn: der Spieler
    // soll seine gewohnte Antwort einmal nicht geben koennen.
    //
    // Flaechenschaden und Kettenblitz zaehlen mit, jeder getroffene Gegner
    // fuer sich. Anders waere ein Moerser die Loesung fuer alles, und der
    // Schild waere keine Frage mehr.
    if (e.shield > 0) {
      e.shield--;
      e.hitFlash = 1;
      this.ring(e.x, e.y, ENEMIES[e.def].radius * 1.6, '#9FD4FF', 0.28, 3);
      return;
    }
    // Panzerung schluckt einen ANTEIL, nicht eine feste Zahl.
    //
    // Vorher war sie ein Abzug: `Schaden minus Panzerung`. Am Anfang wirkte
    // das - beim Leerentitan schluckte Panzerung 6 noch drei Viertel eines
    // Bogenschusses. Ueber sechs Ausbaustufen waechst der Schaden aber auf
    // das 33-fache, und derselbe Abzug schluckte am Ende noch 2 Prozent.
    // Panzerung verschwand als Spielelement genau dann, wenn der Boss kam,
    // und der Moerser verlor seine Rolle als Panzerbrecher.
    //
    // Jetzt zaehlt das Verhaeltnis: jeder Punkt Panzerung nimmt 11 Prozent,
    // gedeckelt bei zwei Dritteln. Sechs Punkte lassen also ein Drittel
    // durch - auf jeder Stufe gleich. Durchschlag (`pierce`) zieht vorher ab.
    const rest = Math.max(0, def.armor - pierce);
    const schluck = Math.min(0.66, rest * 0.11);
    const dmg = Math.max(1, Math.round(raw * this.perks.damageMul * (1 - schluck)));
    e.hp -= dmg;
    e.hitFlash = 1;
    e.squash = Math.min(1, e.squash + 0.55);
    if (owner) owner.damageDone += dmg;
    this.stats.damage += dmg;
    // Und derselbe Schaden noch einmal, nach Wellen sortiert (D13). An
    // DERSELBEN Stelle wie die Summe, damit die beiden nicht auseinander
    // laufen koennen - eine zweite Buchungsstelle waere die naechste Zahl,
    // die still falsch wird.
    this.stats.damageByWave[this.waveIndex] =
      (this.stats.damageByWave[this.waveIndex] ?? 0) + dmg;
    const src = owner ? owner.def : 'meteor';
    this.stats.damageBy[src] = (this.stats.damageBy[src] ?? 0) + dmg;
    if (slow > 0) {
      e.wirkungen = wirkungAnlegen(e.wirkungen, 'bremse',
        slow * (1 - def.slowResist), slowTime);
    }
    this.spark(e.x, e.y, color, this.quality === 'hoch' ? 3 : 1, 140);
    Sfx.play('hit');
    if (e.hp <= 0) {
      e.dead = true;
      const bounty = Math.max(1, Math.round(def.bounty * this.diff.bountyMul * this.map.balance.goldMul));
      this.gold += bounty;
      this.stats.goldEarned += bounty;
      this.stats.kills++;
      if (owner) owner.kills++;
      this.float(e.x, e.y - 12, `+${bounty}`, C.gold, def.boss ? 30 : 20);
      // Der Funke traegt den AKZENT, nicht die Grundfarbe.
      //
      // Seit v168 ist `body` fuer alle acht dieselbe Familie (Gunmetal) -
      // ein Funke daraus waere bei jedem Gegner derselbe graue Staub, und
      // die einzige Rueckmeldung "was ist da gerade gestorben" waere weg.
      this.spark(e.x, e.y, def.trim, this.quality === 'hoch' ? (def.boss ? 44 : 12) : 6, def.boss ? 320 : 180);
      Sfx.play('kill');
      this.husks.push({
        def: e.def, x: e.x, y: e.y,
        alt: def.flying ? 30 : 0,
        angle: 0, spin: (this.rng.next() - 0.5) * 7,
        frame: Math.floor(e.wobble),
        t: 0, dur: def.boss ? 0.9 : 0.45,
      });
      if (def.split) this.splitEnemy(e, def.split);
      if (def.radius >= 22) this.debris(e.x, e.y, def.trim, def.boss ? 10 : 4, 180);
      if (def.boss || def.radius >= 24) {
        this.shake = Math.min(1, this.shake + (def.boss ? 0.9 : 0.22));
        // Schwere Gegner bekommen einen Trefferstopp, kleine nicht - sonst
        // ruckelt jede Welle statt nur die Ereignisse, die zaehlen.
        if (def.boss) this.stop(1);
        else if (def.radius >= 24) this.stop(0.35);
        this.ring(e.x, e.y, def.boss ? 190 : 80, def.trim, 0.5, 5);
        if (def.boss) this.smoke(e.x, e.y, 14, 120);
      }
    }
  }

  // ---------------------------------------------------------------- Effekte

  private decayFx(dt: number): void {
    if (this.particles.length) {
      for (const p of this.particles) {
        p.life -= dt;
        p.vy += p.gravity * dt;
        if (p.grow) p.size += p.grow * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.93; p.vy *= 0.93;
      }
      compact(this.particles, (p) => p.life <= 0, (p) => this.particlePool.release(p));
    }
    if (this.floats.length) {
      for (const f of this.floats) { f.life -= dt; f.y -= 28 * dt; }
      compact(this.floats, (f) => f.life <= 0, (f) => this.floatPool.release(f));
    }
    if (this.rings.length) {
      for (const r of this.rings) {
        r.life -= dt;
        r.r = r.rMin + (r.rMax - r.rMin) * (1 - r.life / r.maxLife);
      }
      compact(this.rings, (r) => r.life <= 0, (r) => this.ringPool.release(r));
    }
    if (this.husks.length) {
      for (const h of this.husks) {
        h.t += dt / h.dur;
        h.angle += h.spin * dt;
        h.alt = Math.max(0, h.alt - 70 * dt);
        h.y += 14 * dt;
      }
      compact(this.husks, (h) => h.t >= 1);
    }
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt * 4);
    if (this.bolts.length) {
      for (const b of this.bolts) b.life -= dt;
      compact(this.bolts, (b) => b.life <= 0, (b) => this.boltPool.release(b));
    }
  }

  float(x: number, y: number, text: string, color: string, size: number): void {
    const f = this.floatPool.obtain();
    f.x = x; f.y = y; f.text = text; f.color = color; f.life = 1.1; f.size = size;
    this.floats.push(f);
  }

  ring(x: number, y: number, rMax: number, color: string, life: number, width: number,
    rMin = 0): void {
    if (this.quality === 'niedrig' && this.rings.length > 12) return;
    const r = this.ringPool.obtain();
    r.x = x; r.y = y; r.r = rMin; r.rMin = rMin; r.rMax = rMax; r.color = color;
    r.life = life; r.maxLife = life; r.width = width;
    this.rings.push(r);
  }

  /** Obergrenze fuer Teilchen. Ohne sie waechst der teuerste Posten beim
   *  Zeichnen unbegrenzt - und genau der frisst auf dem Handy den Spielraum
   *  fuer alles andere. */
  private get particleCap(): number { return this.quality === 'hoch' ? 620 : 180; }

  /** Rauch: dunkle Ballen, die aufsteigen, wachsen und verwehen.
   *  Eine Explosion ohne Rauch ist ein Blitz, kein Einschlag. */
  smoke(x: number, y: number, n: number, spread: number): void {
    if (this.quality !== 'hoch') return;
    if (this.particles.length >= this.particleCap) return;
    n = Math.min(n, this.particleCap - this.particles.length);
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = spread * (0.2 + this.rng.next() * 0.6);
      const p = this.particlePool.obtain();
      p.x = x + Math.cos(a) * 6; p.y = y + Math.sin(a) * 6;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 26;
      p.life = 0.7 + this.rng.next() * 0.6; p.maxLife = 1.4;
      p.size = 5 + this.rng.next() * 6;
      p.color = '#2A3348';
      p.gravity = -18;
      p.grow = 22;
      this.particles.push(p);
    }
  }

  /** Truemmer: wenige groessere Brocken, die hochgeschleudert werden und fallen. */
  debris(x: number, y: number, color: string, n: number, spread: number): void {
    if (this.particles.length >= this.particleCap) return;
    n = Math.min(n, this.particleCap - this.particles.length);
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = spread * (0.5 + this.rng.next() * 0.8);
      const p = this.particlePool.obtain();
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 90;
      p.life = 0.6 + this.rng.next() * 0.5; p.maxLife = 1.1;
      p.size = 4 + this.rng.next() * 4;
      p.color = color;
      p.gravity = 620;
      p.grow = -3;
      this.particles.push(p);
    }
  }

  spark(x: number, y: number, color: string, n: number, spread: number): void {
    if (this.particles.length >= this.particleCap) return;
    n = Math.min(n, this.particleCap - this.particles.length);
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = spread * (0.3 + this.rng.next() * 0.7);
      const p = this.particlePool.obtain();
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.life = 0.35 + this.rng.next() * 0.35; p.maxLife = 0.7;
      p.size = 2 + this.rng.next() * 3; p.color = color; p.gravity = 120; p.grow = 0;
      this.particles.push(p);
    }
  }

  // ---------------------------------------------------------------- Steuerung

  get diff(): DifficultyDef { return DIFFICULTIES[this.difficulty]; }

  reset(
    seed = newSeed(),
    difficulty: DifficultyId = this.difficulty,
    mapId: string = this.map.id,
    opts: { endless?: boolean; perks?: PerkEffect } = {},
  ): void {
    this.seed = seed;
    this.rng.state = seed;
    this.difficulty = difficulty;
    if (mapId !== this.map.id) this.loadMap(mapId);
    clearGame();
    this.endless = opts.endless ?? false;
    this.perks = opts.perks ?? perkEffect(getProgress().perks);
    const d = DIFFICULTIES[difficulty];
    this.gold = d.startGold + this.perks.goldBonus;
    this.lives = Math.round(d.startLives * (1 + this.perks.livesShare));
    this.maxLives = this.lives;
    this.stars = 0;
    this.sterneVorher = 0;
    this.waveIndex = 0;
    this.waveActive = false;
    this.enemies.length = 0; this.towers.length = 0; this.projectiles.length = 0;
    this.particles.length = 0; this.floats.length = 0;
    this.rings.length = 0; this.bolts.length = 0; this.meteors.length = 0;
    this.husks.length = 0;
    this.flashT = 0;
    this.abilityCd = { meteor: 0, freeze: 0, bollwerk: 0, ernte: 0 };
    this.spawnsJeBahn = [];
    this.spawnsTrotzSperre = 0;
    this.aiming = null;
    this.grid.clear();
    this.towersVersion++;
    this.pending = [];
    this.selectedTower = null;
    this.buildChoice = null;
    this.pendingPoint = null;
    this.speed = 1;
    this.paused = false;
    this.idleTime = 0;
    this.leakedTotal = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.stats = emptyStats();
    this.phase = 'playing';
    // Frisch betretene Karte: der Weg zeigt sich einmal von selbst.
    this.wegvorschauAb = this.time;
    this.zielunitSetzen();
  }

  /** Die Zielunit an ihren Platz stellen.
   *
   *  Sie steht dort, wo auch das Bild sie zeigt: auf der gemalten
   *  Rundplattform (`map.ziel`), nicht am rechnerischen Bahnende. Beide
   *  Punkte fallen seit v131 zusammen; der Rueckfall bleibt fuer eine Karte
   *  ohne eingetragene Platte stehen.
   *
   *  Sie wird NICHT als gebauter Turm gezaehlt: `stats.towersBuilt` ist die
   *  Zahl der Tuerme, die der Spieler gestellt hat, und sie steht auf dem
   *  Ergebnisbildschirm. Eine geschenkte Station dort mitzuzaehlen waere
   *  eine falsche Auskunft ueber die eigene Leistung. */
  private zielunitSetzen(): void {
    const { x, y } = this.map.ziel ?? this.goal;
    this.towers.push({
      id: this.nextId++, def: 'core', x, y,
      // Zweig 0 von Anfang an: die Zielunit hat nur einen, also gibt es
      // nichts zu waehlen, und `null` haette das Ausbaumenue eine Wahl
      // anbieten lassen, die es nicht gibt.
      level: 1, branch: 0, cooldownLeft: 0, angle: -Math.PI / 2, recoil: 0, flash: 0,
      pulse: 0, spring: 0,
      zielwahl: 'vorn',
      target: null, retargetIn: 0, kills: 0, damageDone: 0,
    });
    this.towersVersion++;
  }

  /** Die Wegvorschau noch einmal abspielen (Wiederholknopf). */
  wegvorschau(): void { this.wegvorschauAb = this.time; }

  /** Laeuft die Vorschau gerade, und wie weit ist sie? 0 bis 1, sonst null. */
  wegvorschauStand(): number | null {
    const d = this.time - this.wegvorschauAb;
    return d >= 0 && d <= WEGVORSCHAU_DAUER ? d / WEGVORSCHAU_DAUER : null;
  }

  // ------------------------------------------------------------- Spielstand

  /** Nur das, was den Verlauf bestimmt. Reine Darstellung bleibt draussen. */
  snapshot(): SaveGame {
    return {
      v: 7,
      difficulty: this.difficulty,
      endless: this.endless,
      map: this.map.id,
      seed: this.seed,
      rng: this.rng.state,
      gold: this.gold,
      lives: this.lives,
      waveIndex: this.waveIndex,
      waveActive: this.waveActive,
      waveTime: this.waveTime,
      idleTime: this.idleTime,
      leaked: this.leakedTotal,
      time: this.time,
      speed: this.speed,
      hitStop: this.hitStop,
      stats: this.stats,
      abilityCd: ABILITY_ORDER.map((id) => [id, this.abilityCd[id]] as [AbilityId, number]),
      meteors: this.meteors.map((m) => [m.x, m.y, m.t, m.dur, m.radius, m.damage]) as
        [number, number, number, number, number, number][],
      shots: this.projectiles.map((p) => [
        p.kind, p.x, p.y, p.sx, p.sy, p.tx, p.ty,
        p.target ? this.enemies.indexOf(p.target) : -1,
        p.owner ? this.towers.indexOf(p.owner) : -1,
        p.speed, p.damage, p.slow, p.slowTime, p.splash, p.pierce, p.t, p.dur, p.life, p.color,
        p.dirX, p.dirY, p.luft ? 1 : 0,
      ]) as SaveGame['shots'],
      // Schild und Traeger gehoeren dazu. Bis v136 fehlten sie: ein wartender
      // Gegner wurde mit vier von sechs Angaben gesichert, und wer die App
      // schloss und weiterspielte, bekam eine LEICHTERE Welle als der, der
      // durchspielte. Gemessen waren es 10 Schildpunkte gegen 0.
      pending: this.pending.map((p) => [p.time, p.enemy, p.hpMul, p.lane, p.shield, p.traeger]),
      towers: this.towers.map((t) => [
        t.def, t.x, t.y, t.level, t.kills, t.damageDone, t.cooldownLeft, t.retargetIn, t.branch,
        t.target ? this.enemies.indexOf(t.target) : -1,
        // Angehaengt, nicht eingeschoben: ein Spielstand aus v106 hat das
        // Feld nicht und laedt trotzdem - er bekommt den Standard. Die
        // Formatnummer bleibt deshalb, wo sie war, und niemandem wird die
        // laufende Partie verworfen.
        ZIELWAHL_ORDNUNG.indexOf(t.zielwahl),
        // Seit v144 Teil der Simulation, nicht mehr nur des Bildes: an ihm
        // haengt die Muendung.
        t.angle,
      ]) as SaveGame['towers'],
      enemies: this.enemies.map((e) => [
        e.def, e.x, e.y, e.hp, e.hpMax, e.travelled,
        // Die anliegenden Wirkungen, flach: Art, Staerke, Rest (TF-015).
        // Vorher standen hier zwei Zahlen fuer die einzigen zwei Felder.
        e.wirkungen ? e.wirkungen.flatMap((w) => [w.art, w.staerke, w.rest]) : [],
        e.wobble, e.lane, e.auraIn, e.side, e.shield, e.traeger,
      ]),
    };
  }

  /** Setzt die Partie aus einem Spielstand fort. Gibt false zurueck, wenn der
   *  Stand nicht zu den aktuellen Daten passt - dann wird er verworfen statt
   *  halb geladen. */
  restore(save: SaveGame): boolean {
    if (save.v !== 7) return false;
    if (!MAPS.some((m) => m.id === save.map)) return false;
    if (!(save.difficulty in DIFFICULTIES)) return false;
    if (save.waveIndex < 0) return false;
    for (const [id] of save.towers) if (!(id in TOWERS)) return false;
    // Jeder gespeicherte Turm muss auf einem Bauplatz dieser Karte stehen.
    //
    // Bis v33 durfte man auf jeder freien Zelle bauen. Ein Spielstand aus
    // dieser Zeit - oder ein von Hand veraenderter - haette Tuerme mitten im
    // Gelaende wiederhergestellt, und die Zelle waere dauerhaft blockiert
    // gewesen. Lieber neu anfangen als in einem unmoeglichen Zustand landen.
    // Jeder gespeicherte Turm muss dort ueberhaupt stehen duerfen. Ein Stand
    // aus einer aelteren Fassung - oder ein veraenderter - haette sonst
    // Tuerme im Fels oder auf dem Weg.
    {
      const probe = new GameState(save.map);
      for (const [def, tx, ty] of save.towers) {
        // Die Zielunit steht auf der Zielplattform, und die ist kein
        // Bauplatz - sie muesste diese Pruefung nicht bestehen und wuerde
        // sonst jeden Spielstand ungueltig machen.
        if (def === 'core') continue;
        if (!probe.canPlace(def, tx, ty)) return false;
        probe.towers.push({ x: tx, y: ty, def } as Tower);
      }
    }
    for (const [id] of save.enemies) if (!(id in ENEMIES)) return false;
    for (const [, id] of save.pending) if (!(id in ENEMIES)) return false;

    this.reset(save.seed, save.difficulty, save.map, { endless: save.endless });
    this.rng.state = save.rng;
    this.gold = save.gold;
    this.lives = save.lives;
    this.waveIndex = save.waveIndex;
    this.waveActive = save.waveActive;
    this.waveTime = save.waveTime;
    this.idleTime = save.idleTime;
    this.leakedTotal = save.leaked;
    // Der Draht hiess bis v136 `hitstop` und meinte ein ZWEITES, ungedeckeltes
    // Feld neben `hitStop`. Beide hielten die Simulation an, nur eines war
    // gedeckelt, nur das andere wurde gesichert. Jetzt gibt es eines - ein
    // alter Stand wird weiter gelesen.
    this.hitStop = save.hitStop ?? (save as { hitstop?: number }).hitstop ?? 0;
    if (save.stats) this.stats = { ...emptyStats(), ...save.stats };
    this.time = save.time;
    // Wer eine Partie fortsetzt, kennt die Karte - die Vorschau bleibt aus.
    // `reset` weiter oben hat sie gerade eingeschaltet; hier wird sie wieder
    // abgeschaltet, und zwar NACH `this.time`, sonst haengt der Vergleich an
    // einer Zeit, die es noch nicht gibt.
    this.wegvorschauAb = -99;
    this.speed = save.speed === 2 || save.speed === 3 ? save.speed : 1;
    this.pending = save.pending.map(([time, enemy, hpMul, lane, shield, traeger]) =>
      ({ time, enemy, hpMul, lane: lane ?? 0, shield: shield ?? 0, traeger: traeger ?? 0 }));
    for (const [id, cd] of save.abilityCd ?? []) {
      if (id in this.abilityCd) this.abilityCd[id] = Math.max(0, cd);
    }
    for (const [x, y, t, dur, radius, damage] of save.meteors ?? []) {
      this.meteors.push({ x, y, t, dur, radius, damage });
    }

    const targetIdx: number[] = [];
    // `reset` hat die Zielunit gerade gestellt; im Spielstand steht sie auch
    // drin. Ohne diese Zeile stuenden zwei uebereinander - eine mit der
    // gespeicherten Ausbaustufe und eine frische.
    this.towers.length = 0;
    for (const [def, tx, ty, level, kills, damageDone, cooldownLeft, retargetIn, branch, tIdx,
      zIdx, winkel] of save.towers) {
      targetIdx.push(tIdx ?? -1);
      const t: Tower = {
        id: this.nextId++, def, x: tx, y: ty,
        level, branch: (branch ?? null) as BranchIndex,
        cooldownLeft: cooldownLeft ?? 0, angle: winkel ?? -Math.PI / 2, recoil: 0, flash: 0,
        pulse: 0, spring: 0,
        zielwahl: ZIELWAHL_ORDNUNG[zIdx ?? 0] ?? 'vorn',
        target: null, retargetIn: retargetIn ?? 0, kills, damageDone,
      };
      this.towers.push(t);
      }
    // Ein Spielstand aus der Zeit vor der Zielunit hat sie nicht. Statt ihn
    // wegzuwerfen bekommt er eine frische auf Stufe 1 - dieselbe Haltung wie
    // beim Wirkungsformat in v158: eine laufende Partie soll weiterlaufen.
    if (!this.towers.some((t) => t.def === 'core')) this.zielunitSetzen();
    this.towersVersion++;

    // Ein Stand von VOR v158 hat an Stelle 6 den alten Bremsfaktor als ZAHL
    // und die Bremsrestzeit dahinter - alle Felder danach sind also um eins
    // verschoben. Die Zeile wird deshalb ZUERST auf die neue Form gebracht;
    // eine Umrechnung nur an Stelle 6 haette Wackeln, Bahn, Seite und
    // Schildreste um ein Feld verrutschen lassen.
    //
    // Wer mitten in einer Partie speichert und das Spiel aktualisiert
    // bekommt, soll weiterspielen koennen. Angehaengte Felder waren immer
    // vertraeglich; ein GEAENDERTES ist es nicht, und das ist der Preis.
    const zeilen = save.enemies.map((r) => {
      if (typeof r[6] !== 'number') return r;
      const [d, x0, y0, h, hm, tr, faktor, rest, ...schwanz] = r as unknown as
        [EnemyId, number, number, number, number, number, number, number, ...number[]];
      const w: (string | number)[] = faktor < 1 && rest > 0 ? ['bremse', 1 - faktor, rest] : [];
      return [d, x0, y0, h, hm, tr, w, ...schwanz] as SaveGame['enemies'][number];
    });

    for (const [def, x, y, hp, hpMax, travelled, roh, wobble, lane, auraIn, side,
      shield, traeger] of zeilen) {
      const wirkungen: Wirkung[] = [];
      const liste = roh as (string | number)[];
      for (let i = 0; i + 2 < (liste?.length ?? 0); i += 3) {
        wirkungen.push({
          art: liste[i] as WirkungsArt, staerke: Number(liste[i + 1]), rest: Number(liste[i + 2]),
        });
      }
      this.enemies.push({
        id: this.nextId++, def, x, y, hp, hpMax,
        speed: ENEMIES[def].speed, lane: lane ?? 0, heading: 0, travelled,
        wirkungen: wirkungen.length ? wirkungen : null,
        auraIn: auraIn ?? 0, shield: shield ?? 0, traeger: traeger ?? 0,
        hitFlash: 0, squash: 0, hpShown: hp,
        side: side ?? 0,
        wobble,
        dead: false, leaked: false,
      });
    }
    for (const sh of save.shots ?? []) {
      const [kind, x, y, sx, sy, tx, ty, tIdx, oIdx,
        speed, damage, slow, slowTime, splash, pierce, t, dur, life, color,
        dirX, dirY, luft] = sh;
      const p = this.projectilePool.obtain();
      p.kind = kind; p.x = x; p.y = y; p.sx = sx; p.sy = sy; p.tx = tx; p.ty = ty;
      p.target = tIdx >= 0 && tIdx < this.enemies.length ? this.enemies[tIdx] : null;
      p.owner = oIdx >= 0 && oIdx < this.towers.length ? this.towers[oIdx] : null;
      p.speed = speed; p.damage = damage; p.slow = slow; p.slowTime = slowTime;
      p.splash = splash; p.pierce = pierce; p.t = t; p.dur = dur; p.life = life;
      p.color = color; p.dead = false;
      // Aeltere Staende kennen die Richtung nicht - dann aus Start und
      // Zielpunkt rechnen, das ist die Richtung beim Abschuss.
      if (dirX === undefined || dirY === undefined) {
        const dd = Math.hypot(tx - sx, ty - sy) || 1;
        p.dirX = (tx - sx) / dd; p.dirY = (ty - sy) / dd;
      } else {
        p.dirX = dirX; p.dirY = dirY;
      }
      p.luft = luft === undefined ? !!p.owner && TOWERS[p.owner.def].hitsAir : luft === 1;
      this.projectiles.push(p);
    }

    // Ziele erst jetzt verknuepfen - die Gegner gibt es vorher noch nicht.
    for (let i = 0; i < this.towers.length; i++) {
      const idx = targetIdx[i];
      this.towers[i].target = idx >= 0 && idx < this.enemies.length ? this.enemies[idx] : null;
    }
    this.rebuildGrid();
    this.phase = 'playing';
    return true;
  }


}
