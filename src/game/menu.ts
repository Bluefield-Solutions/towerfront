import { MAPS } from '../data/maps';
import { DIFFICULTY_ORDER, DIFFICULTIES, type DifficultyId } from '../data/difficulty';
import { PERK_ORDER, PERKS, type PerkId } from '../data/perks';
import {
  buyPerk, freeStars, getBest, getProgress, getSettings, getStars, saveSettings, totalStars,
} from '../core/storage';
import { WORLD_H, WORLD_W } from '../data/config';
import type { Auswertung } from './auswertung';

/** Das Menü als Landkarte.
 *
 *  Bis v41 war der Titelbildschirm eine Einstellungsliste - saubere
 *  Gliederung, aber die richtige Lösung für die falsche Aufgabe. Der
 *  Referenzabgleich hat es deutlich gemacht: das Genre-Vorbild hat gar kein
 *  Einstellungsmenü. Es hat eine Karte der Welt, auf der die Stufen als Orte
 *  liegen, mit den verdienten Sternen daneben. Die Schwierigkeit wird an der
 *  Stufe gewählt, nicht global, und vor dem Start steht eine kurze Einweisung.
 *
 *  Ein Spiel öffnet keine Systemeinstellungen, es zeigt eine Welt.
 *
 *  Zweiter Grund, und er wiegt fast ebenso schwer: auf der Leinwand kann ich
 *  das Menü in der Bildabnahme sehen. Als HTML war es die einzige Fläche des
 *  Spiels, die ich nie selbst beurteilen konnte - und genau dort ist die
 *  Gestaltung abgesackt. */
export type MenuView = 'map' | 'brief' | 'progress' | 'result';

/** Ein anklickbarer Bereich. Die Zeichenroutine legt sie an, die Bedienung
 *  liest sie - so kann es keine Schaltfläche geben, die man sieht, aber nicht
 *  trifft, und keine, die man trifft, aber nicht sieht. */
export interface Hotspot {
  id: string;
  x: number; y: number; w: number; h: number;
  round?: boolean;
}

/** Wie lange ein Ansichtswechsel dauert, in Sekunden.
 *
 *  Kurz genug, dass niemand darauf wartet, lang genug, dass das Auge den
 *  Wechsel als Bewegung liest statt als Sprung. Bis v171 schaltete das
 *  Menue hart um - Landkarte, Einweisung, Fortschritt, Ergebnis wechselten
 *  von einem Bild aufs naechste (D5). */
export const UEBERGANG = 0.18;

export class Menu {
  /** Die gezeigte Ansicht.
   *
   *  Sie liegt hinter einem Zugriff, damit der Uebergang von SELBST
   *  anspringt. Ein `wechselStarten()`, das man neben jeder Zuweisung rufen
   *  muss, waere die naechste Stelle zum Vergessen - und dieses Verzeichnis
   *  hat fuenf Runden an genau dieser Sorte Fehler verloren (Regel 6). */
  private _view: MenuView = 'map';
  get view(): MenuView { return this._view; }
  set view(v: MenuView) {
    if (v === this._view) return;
    this._view = v;
    this.wechselZeit = this.time;
  }
  /** `time` beim letzten Ansichtswechsel.
   *
   *  Der Uebergang haengt an der Menueuhr, nicht an einer eigenen: jeder
   *  Aufrufer treibt `time` ohnehin schon voran, eine zweite Uhr haette
   *  einer von ihnen vergessen. Der Anfangswert liegt so weit zurueck, dass
   *  das erste Bild fertig eingeblendet ist - ein Menue, das beim ersten
   *  Oeffnen aus dem Nichts auftaucht, sieht nach Ladefehler aus. */
  wechselZeit = -99;
  /** 0 beim Wechsel, 1 wenn er durch ist. */
  uebergang(): number {
    return Math.min(1, Math.max(0, (this.time - this.wechselZeit) / UEBERGANG));
  }
  /** Welcher Ort ist geöffnet - Index in MAPS. */
  picked = 0;
  /** Bereich unter dem Finger, für die Rückmeldung beim Drücken. */
  pressed: string | null = null;
  /** Wird von der Zeichenroutine je Bild neu gefüllt. */
  hotspots: Hotspot[] = [];
  /** Das Ergebnis der zuletzt beendeten Partie.
   *
   *  Bis v43 lag der Sieg- und Niederlagebildschirm als HTML über dem Spiel,
   *  während das Menü längst auf der Leinwand war - zwei Formensprachen
   *  hintereinander. Und weil HTML in meiner Bildabnahme nicht erscheint,
   *  war es zugleich die letzte Fläche, die ich nie sehen konnte. */
  result: Auswertung | null = null;
  /** Wie lange die Sterne schon auffliegen - für die Einblendung. */
  resultAge = 0;

  /** Startet das Spiel - wird von außen gesetzt. */
  onStart: (mapId: string, difficulty: DifficultyId, endless: boolean) => void = () => {};
  onResume: () => void = () => {};
  /** Wird gerufen, wenn auf der Landkarte "Einstellungen" getippt wird. */
  onOptionen: () => void = () => {};
  /** Dieselbe Karte, derselbe Grad, noch einmal. */
  onRetry: () => void = () => {};
  /** Liegt ein Spielstand vor? */
  hasSave = false;
  saveLabel = '';
  time = 0;

  /** Die Orte auf der Karte. Bewusst ungleich verteilt und mit einem Weg
   *  verbunden - eine Reihe gleicher Kacheln wäre wieder eine Liste. */
  /** Die Punkte der Uebersichtskarte - einer je Karte.
   *
   *  Bis v98 standen hier drei feste Koordinaten. Die Uebersicht konnte damit
   *  genau drei Karten zeigen; eine vierte waere unsichtbar geblieben, eine
   *  Karte weniger haette einen Punkt ins Leere gelassen.
   *
   *  Jetzt entstehen sie aus der Zahl der Karten: gleichmaessig verteilt auf
   *  einer sanften Welle, damit der Weg nicht schnurgerade wirkt. Bei einer
   *  einzigen Karte steht ihr Punkt in der Mitte. */
  get nodes(): { x: number; y: number }[] {
    const n = MAPS.length;
    if (n === 1) return [{ x: WORLD_W * 0.5, y: WORLD_H * 0.5 }];
    const rand = 0.2;
    return MAPS.map((_, i) => {
      const t = i / (n - 1);
      return {
        x: WORLD_W * (rand + t * (1 - rand * 2)),
        y: WORLD_H * (0.5 + Math.sin(t * Math.PI * 1.3 + 0.5) * 0.16),
      };
    });
  }

  get endless(): boolean { return getSettings().endless === true; }
  set endless(v: boolean) { saveSettings({ endless: v }); }

  get difficulty(): DifficultyId { return getSettings().difficulty; }
  set difficulty(d: DifficultyId) { saveSettings({ difficulty: d }); }

  /** Sterne eines Ortes über alle Grade - auf der Karte zählt der beste Lauf. */
  starsOf(mapId: string): number {
    let best = 0;
    for (const g of DIFFICULTY_ORDER) best = Math.max(best, getStars(mapId, g));
    return best;
  }

  bestOf(mapId: string): string {
    const b = getBest(mapId, this.difficulty);
    return b.wave > 0 ? `Welle ${b.wave}${b.lives ? `, ${b.lives} Kristall` : ''}` : 'noch nicht gespielt';
  }

  /** Ein Tipper. Gibt zurück, ob er etwas getroffen hat. */
  tap(x: number, y: number): boolean {
    const hit = this.hotspots.find((h) => inside(h, x, y));
    if (!hit) return false;
    const id = hit.id;

    if (id === 'resume') { this.onResume(); return true; }
    if (id === 'retry') { this.onRetry(); return true; }
    if (id === 'tomap') { this.result = null; this.view = 'map'; return true; }
    if (id === 'back') { this.view = 'map'; return true; }
    if (id === 'progress') { this.view = 'progress'; return true; }
    // Die Einstellungen sind kein Menue-Bild, sondern ein Dialog darueber.
    // Das Menue meldet nur, dass jemand danach gefragt hat.
    if (id === 'optionen') { this.onOptionen(); return true; }
    if (id.startsWith('node:')) {
      this.picked = Number(id.slice(5));
      this.view = 'brief';
      return true;
    }
    if (id.startsWith('diff:')) { this.difficulty = id.slice(5) as DifficultyId; return true; }
    if (id === 'endless') { this.endless = !this.endless; return true; }
    if (id === 'start') {
      this.onStart(MAPS[this.picked].id, this.difficulty, this.endless);
      return true;
    }
    if (id.startsWith('perk:')) {
      const p = id.slice(5) as PerkId;
      buyPerk(p, PERKS[p].cost);
      return true;
    }
    return true;
  }

  free(): number { return freeStars(); }
  earned(): number { return totalStars(); }
  gradeName(): string { return DIFFICULTIES[this.difficulty].name; }
  perkList(): { id: PerkId; owned: boolean; affordable: boolean }[] {
    const owned = getProgress().perks;
    return PERK_ORDER.map((id) => ({
      id,
      owned: owned.includes(id),
      affordable: freeStars() >= PERKS[id].cost,
    }));
  }
}

export const inside = (h: Hotspot, x: number, y: number): boolean => {
  if (h.round) {
    const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
    return (x - cx) ** 2 + (y - cy) ** 2 <= (h.w / 2) ** 2;
  }
  return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
};
