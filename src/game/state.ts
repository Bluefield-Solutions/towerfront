import { WORLD_W, WORLD_H, C } from '../data/config';
import { muendung } from '../data/turmgestalt';
import { tempoFaktor, wirkungAnlegen, wirkungenTicken, type Wirkung, type WirkungsArt } from '../data/wirkungen';
import { ENEMIES, type EnemyId } from '../data/enemies';
import {
  TOWERS, TOWER_ORDER, MAX_LEVEL, accentFor, sellValue, statsFor, nextFor, hatZweigwahl,
  guenstigsterTurm, type BranchIndex, type TowerId,
  FOERDER_DECKEL, foerderZuschlag, wiederholungsFaktor, WIEDERHOLUNG_ZUSCHLAG,
  VIELFALT_BEUTE, vielfaltsBeute,
  werftErtrag, werftHoechstmass, bannZuschlag, bannStapel,
} from '../data/towers';
import { EARLY_BONUS_MAX, EARLY_BONUS_WINDOW, EARLY_RISIKO_HUB } from '../data/waves';
import { VERBUND_MAX, VERBUND_STUFE, VERBUND_UMKREIS } from './verbund';
import {
  DIFFICULTIES, hpScale, laufFaktor, LAUF_STEIGUNG,
  type DifficultyDef, type DifficultyId,
} from '../data/difficulty';
import { ABILITIES, ABILITY_ORDER, type AbilityId } from '../data/abilities';
import {
  MAPS, mapById, goalOf, lanePaths, snap, PATH_CLEARANCE, type GameMap,
} from '../data/maps';
import {
  KARTENSTAPEL, KEINE_KARTEN, kartenWirkung, zieheKarten, GRUNDSTAPEL, stapelAus,
  KARTEN_JE_WELLE,
  type Karte, type KartenWirkung,
} from '../data/karten';
import { WEGNETZ } from '../data/wegnetz';
import type { LanePath } from '../core/path';
import type { Vec } from '../core/math';
import { dist, dist2 } from '../core/math';
import { Sfx } from '../core/audio';
import { mischen } from '../gfx/glow';
import {
  freigeschalteteKarten,
  getProgress, getStars, gewonneneKarten, recordEndlos, recordRun, recordStars,
} from '../core/storage';
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
  /** Zeit **relativ zum Start der eigenen Welle** - so wie vor v266 auch.
   *
   *  Der erste Entwurf rechnete absolut, damit eine Warteschlange fuer zwei
   *  Wellen ohne zwei Zeitmassstaebe auskommt. Gemessen kostete das
   *  Genauigkeit: `waveTime` waechst auf mehrere hundert Sekunden, und
   *  `gross + klein` traegt weniger Stellen als `klein`. Der Lauf war
   *  danach um rund vier Bilder je Welle verschoben, und die Verluste
   *  wanderten von Welle 14 nach 15 - eine Aenderung der Balance ohne eine
   *  einzige geaenderte Zahl. Jede Welle traegt deshalb ihre eigene Uhr. */
  time: number; enemy: EnemyId; hpMul: number; lane: number;
  /** Aus welcher Welle dieser Gegner kommt. Daran haengt die Verbuchung des
   *  Verlusts, die Skalierung der Lebenspunkte und das Ende der Welle. */
  welle: number;
  shield?: number; traeger?: number;
}

/** Wieviele Bits in einer Zahl gesetzt sind - hier: wieviele Turmarten einen
 *  Gegner beschaedigt haben. Vier Arten, also hoechstens vier Durchlaeufe. */
export function zaehleBits(n: number): number {
  let z = 0;
  // **Vorzeichenlos schieben.** Mit `>>` bleibt das Vorzeichenbit stehen und
  // die Schleife endet bei einer negativen Zahl nie. Die Ursache oben ist
  // behoben; diese Zeile sorgt dafuer, dass derselbe Fehler beim naechsten
  // Mal MELDET statt zu haengen - eine falsche Zahl findet man, eine
  // stehende Schleife sucht man.
  for (let m = n >>> 0; m; m >>>= 1) z += m & 1;
  return z;
}

function emptyStats(): RunStats {
  return {
    goldEarned: 0, goldSpent: 0, damage: 0, damageBy: {},
    kills: 0, leaksByWave: [], damageByWave: [], abilityUses: {}, duration: 0, towersBuilt: 0,
    artenJeKill: [], schuesse: 0, schuesseOhneWirkung: 0,
  };
}

/** Wie weit die Farbe eines beruehrten Flecks aufgehellt wird, bevor sie
 *  fliegt. Steht hier und nicht in `beruehren`, damit der Rauchtest sie
 *  nicht abschreiben muss - eine abgeschriebene Zahl veraltet (Regel 15). */
export const ZIER_AUFHELLUNG = 0.45;

/** Wieviel ein Schildtraeger im Modus "Gefahr" zaehlt, zusaetzlich zu seinen
 *  eigenen Lebenspunkten.
 *
 *  **Warum es diesen Zuschlag gibt.** Der Modus hiess bis v223 "Voll" und
 *  nahm schlicht den Gegner mit den meisten Lebenspunkten. Gemessen war er
 *  damit der schwaechste von fuenfen: auf allen vier Karten der letzte Platz,
 *  und in der Wellenpruefung von `npm run sim` kein einziger Alleinsieg. Das
 *  ist auch einleuchtend - der Dickste stirbt ohnehin nicht am einzelnen
 *  Schuss, waehrend nebenan die Duennen durchlaufen.
 *
 *  Ein Schildtraeger ist etwas anderes: er laedt die Schilde seiner Nachbarn
 *  nach, solange er lebt (G5). Wer ihn stehen laesst, kommt gegen den Pulk
 *  nicht an, gleich wieviel Schaden er auffaehrt - und genau diese
 *  Entscheidung trifft kein anderer Modus. Er ist weder der vorderste noch
 *  der naechste noch der wundeste, und seine Lebenspunkte sind
 *  unauffaellig.
 *
 *  800 ist gemessen, nicht gewaehlt: der Leerentitan hat 682 Lebenspunkte,
 *  und der Traeger muss auch neben ihm gewaehlt werden. Darunter faellt er
 *  in der Bosswelle des Farnkessels wieder hinten runter. */
const GEFAHR_TRAEGER = 800;

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

/** Wieviele Gegner eine Aura hoechstens VOLL trifft (F4).
 *
 *  Ab hier wird der Schaden verteilt: bei zwoelf Zielen bekommt jedes ein
 *  Drittel. Die Bremse bleibt fuer alle voll - der Frostturm ist ein
 *  Stuetzturm, und was er stuetzt, soll er weiter stuetzen.
 *
 *  Die Vier ist gemessen, nicht gewaehlt: siehe die Tabelle im
 *  Rueckstandsverzeichnis unter F4. */
export const AUREN_DECKEL = 4;


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
  /** Der Kristall beim Start dieser Partie - die Bezugsgroesse der Werft.
   *  `maxLives` waechst mit der Schmelze; wer gegen das heutige Mass rechnet,
   *  bekommt Zinseszins statt einer Erhoehung je Stufe. */
  startLives = DIFFICULTIES.normal.startLives;
  /** Wieviele Wellen GESTARTET sind - nicht mehr, wieviele fertig sind.
   *
   *  Bis v265 stieg der Zaehler in `finishWave`, weil immer nur eine Welle
   *  laufen konnte und beides dasselbe war. Mit ueberlappenden Wellen ist es
   *  das nicht mehr, und von den zwei moeglichen Bedeutungen ist "gestartet"
   *  die tragende: daran haengt, welche Welle als naechste kommt. */
  waveIndex = 0;

  /** **Die laufenden Wellen** (S-P4-01, `ueberlappendeWellen`).
   *
   *  F10 woertlich: der Fruehstart hat sein Zeitfenster, aber kein Risiko.
   *  `canStartWave` verlangte `!waveActive` - man konnte erst starten, wenn
   *  die vorige durch war. Frueh starten kostete damit nur Bauzeit; es
   *  konnte nichts schiefgehen. Kingdom Rush legt genau dort das Risiko hin.
   *
   *  Je Welle steht hier, wann sie gestartet ist: der Takt der Tore haengt
   *  daran, und die Verbuchung des Bonus. */
  laufende: { welle: number; uhr: number }[] = [];

  /** **Hoechstens zwei zugleich.** Drei waeren keine Entscheidung mehr,
   *  sondern eine Lawine - und die Kreuzdeckung der Karten ist auf einen
   *  Wellenstrom je Bahn eingemessen (v237). */
  static readonly UEBERLAPPUNG_MAX = 2;

  /** Laeuft ueberhaupt eine Welle? Eine ABLEITUNG, kein Schalter - es gibt
   *  keine Stelle mehr, an der die beiden auseinanderlaufen koennen. */
  get waveActive(): boolean { return this.laufende.length > 0; }
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
  /** Wieviele Karten beim START dieses Laufs gewonnen waren (C18).
   *
   *  **Eingefroren, nicht jedes Bild gelesen.** Waehrend einer Partie kann
   *  man keine Karte gewinnen, also gaebe es nichts zu aktualisieren - und
   *  eine Ablageabfrage im Bildtakt waere ausserdem die einzige Stelle, an
   *  der die Simulation aus dem Speicher des Browsers liest. Sie geht in den
   *  Spielstand mit, sonst haette ein fortgesetzter Lauf andere Regeln als
   *  der begonnene. */
  karten = 0;
  /** Zaehlt jeden Aufsatz einer Partie hoch - und `fortgesetzt` sagt, ob es
   *  ein neuer Lauf war oder ein geladener.
   *
   *  Die Oberflaeche braucht beides, um die Einfuehrung zu starten, ohne
   *  dass irgendwer daran denken muss (Regel 6). Vorher hing sie an EINEM
   *  Knopf, und als der Titelschirm auf die Leinwand zog, lief sie kein
   *  einziges Mal mehr - siebzehn Tore gruen. */
  laufNummer = 0;
  fortgesetzt = false;
  /** Was dieser Lauf freigeschaltet hat, wenn etwas (C18).
   *
   *  Heisst `freischaltung` und nicht `neueFaehigkeit`, weil der
   *  Autarkie-Waechter die Ersatzschreibung "Faehigkeit" im ausgelieferten
   *  Text verbietet - und ein Feldname ueberlebt die Minimierung. Der
   *  Waechter hat recht: er kann nicht wissen, ob "Faehigkeit" in einem
   *  Bezeichner oder in einem Satz auf dem Bildschirm steht.
   *
   *  S5 des Abgleichs: die Freischaltung wird GEZEIGT, wenn sie passiert -
   *  ein Augenblick am Ende des Laufs, keine Zeile in einem Menue. Sie steht
   *  hier neben `sterneVorher`, weil sie dieselbe Aufgabe hat und dieselbe
   *  Falle: wer sie erst auf dem Ergebnisbildschirm ausrechnet, rechnet
   *  nach dem Eintragen und bekommt nie ein "neu". */
  freischaltung: AbilityId | null = null;
  /** Gezielte Faehigkeit, die auf einen Tipp aufs Feld wartet. */
  aiming: AbilityId | null = null;

  buildChoice: TowerId | null = null;
  /** Hat der Spieler diese Sorte SELBST gewaehlt - oder ist sie nur
   *  vorgewaehlt, damit die baubare Flaeche im Bild steht?
   *
   *  **Zwei Bedeutungen, die bis v238 in einem Feld lagen.** `buildChoice`
   *  beantwortet "welche Sorte ist scharf" und treibt zwei Dinge: die
   *  gezeichnete Baukante und die Vorkauf-Karte im Pruefsteg. Sobald `reset`
   *  eine Sorte vorwaehlt, damit die Flaeche vom ersten Bild an sichtbar ist,
   *  ging beides zugleich an - und die Karte sperrt gemessen 39,5 % des
   *  Bildschirms statt 17,6 %. Ein neuer Spieler saehe die Antwort auf "wo
   *  darf ich bauen" und dahinter kein Spielfeld mehr.
   *
   *  Die Karte haengt deshalb an DIESEM Feld: sie erscheint, wenn jemand in
   *  der Leiste auf einen Turm tippt, nicht wenn das Spiel eine Sorte
   *  bereitlegt. Gesetzt wird es an genau einer Stelle (dem Knopf), geloescht
   *  wo die Wahl geloescht wird. */
  bauwahlErklaeren = false;
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

  /** **Darf der Bauhinweis gerade zu sehen sein?** (v298)
   *
   *  Nein, solange die Bauwahl offen steht: sie nennt den Grund bereits an
   *  jedem Turm, fuer den er gilt - je Turm verschieden, waehrend der
   *  Hinweis ein einziges Wort ist. Zwei Fassungen derselben Auskunft, und
   *  die schlechtere scheint obendrein durch die halbdurchsichtige Leiste:
   *  in der Aufnahme zu v298 lag ein rotes "Weg" hinter den Namen "Prisma"
   *  und "Foerderer".
   *
   *  **Als benannte Ableitung und nicht als `if` im Renderer**, aus dem
   *  Grund, den Regel 6 aufgeschrieben hat: eine Bedingung, die nur im
   *  Zeichenweg steht, prueft niemand. So steht sie an einer Stelle, der
   *  Rauchtest fragt sie, und eine Gegenprobe kann sie brechen. */
  hinweisSichtbar(): boolean {
    return this.hinweis !== null && this.buildAt === null;
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

  /** **Wie oft geraubt und wie oft gerettet wurde** (S-P3-04).
   *
   *  Der Kernraub verschiebt jede Zahl in zwei Richtungen zugleich: ein Leck
   *  ist nicht mehr endgueltig, also ist das Spiel leichter - und ein
   *  Raeuber laeuft ein zweites Mal durch die Tuerme, also ist es schwerer.
   *  Welche ueberwiegt, sagt nur diese Zaehlung. Eine gebaute Mechanik ohne
   *  Messung ist eine Vermutung mit Quelltext. */
  raubTotal = 0;
  rettungTotal = 0;
  rettungPunkte = 0;

  /** **Splitter auf dem Rueckweg zum Kristall** (S-P3-02).
   *
   *  Stirbt ein Raeuber, faellt seine Beute nicht zu Boden - sie schwebt
   *  zurueck. Ohne diese Rueckholung waere der Kernraub nur ein langsamerer
   *  Abzug, und der ganze Wert der Mechanik liegt in dem Fenster, in dem die
   *  Entscheidung noch offen ist.
   *
   *  **Gemessen war das kein Feinschliff, sondern die Bedingung dafuer, dass
   *  die Mechanik ueberhaupt traegt:** mit Raub allein und ohne Rueckgabe
   *  verlor der Durchlauf die erste Karte in Welle 14 (C18 rot) und der
   *  Endlosmodus kam nur bis Welle 14 von 15. Die Tuerme schiessen auf einen
   *  Fliehenden, der niemandem mehr schaden kann - jeder Schuss auf ihn war
   *  verschwendet. Erst die Rueckgabe macht ihn wieder zu einem Ziel, das
   *  sich lohnt.
   *
   *  Die Schwebezeit ist FEST und nicht von der Strecke abhaengig: sonst
   *  waere ein Raeuber am Tor wertvoller als einer am Kristall, und das ist
   *  genau falsch herum. */
  splitter: {
    x: number; y: number; punkte: number; rest: number; dauer: number; welle: number;
  }[] = [];
  static readonly SPLITTER_DAUER = 1.1;

  /** **Wie schnell ein Raeuber flieht** (S-P3-01/02).
   *
   *  Bei einfachem Tempo ist der Rueckweg eine Schiessbude: er laeuft die
   *  ganze Bahn durch jeden Turm zurueck, und gemessen wurde fast jeder
   *  Raub wieder eingesammelt - alle drei Spielstile kamen auf 94 bis 98
   *  von 100 Punkten, und die Ratsche aus v253 hat es gemeldet (Stellen mit
   *  Verlust von 2 auf 1, Stilabstand von 9,3 auf 3,6).
   *
   *  Eine Mechanik, die jeden Fehler zurueckgibt, hat kein Fenster - und das
   *  Fenster ist ihr ganzer Wert. Der Wert steht deshalb hier und ist
   *  durchprobiert, nicht gewaehlt. */
  static readonly KERNRAUB_TEMPO = 2.4;

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
    this.weichen.clear();
    this.bahnStand++;
    this.bahnenNeu();
    this.goal = goalOf(this.map);
  }

  /** Die umgelegten Weichen. Leer heisst: alles offen, also die kuerzeste
   *  Route - der Zustand, gegen den die ganze Balance geeicht ist. */
  readonly weichen = new Set<string>();

  /** Zaehlt hoch, sooft sich die Bahnen aendern.
   *
   *  Der Renderer backt seinen Untergrund aus den Bahnen; ohne diese Zahl
   *  bliebe nach dem Umlegen die alte Strasse stehen, waehrend die Gegner
   *  woanders laufen. Eine Zahl statt eines Vergleichs, weil der Vergleich
   *  vier Bahnen mal dreissig Punkte je Bild waere. */
  bahnStand = 0;

  private bahnenNeu(): void {
    this.lanes = lanePaths(this.map, this.weichen);
    this.pathTotal = Math.max(...this.lanes.map((l) => l.length));
    this.airTotal = Math.max(...this.lanes.map(
      (l) => dist(l.pts[0].x, l.pts[0].y, this.goal.x, this.goal.y),
    ));
  }

  /** Radius der GEZEICHNETEN Weichenmarke in Weltpunkten. */
  static readonly WEICHE_RADIUS = 70;

  /** Wie gross die Weiche zu treffen ist, in Weltpunkten.
   *
   *  **Der gezeichnete Ring ist nicht der Griff** - genau wie beim Turm, wo
   *  `tapSize` seit jeher den Platzbedarf um `tapSlack` erweitert. Ein fester
   *  Radius von 70 traegt auf dem iPhone SE (Massstab 0,347) mit 49
   *  Bildschirmpunkten, faellt auf einem kleinen Android-Querformat (0,296)
   *  aber auf 41 - unter die geforderten 44. Gemessen, nicht geschaetzt:
   *  `npm run beruehrung` hat es beim ersten Lauf gemeldet.
   *
   *  Der Daumen bekommt deshalb dieselbe Zugabe wie beim Turm. Der Ring
   *  bleibt, wie er ist; groesser gezeichnet saehe er aus wie ein Bauwerk. */
  static weicheTapRadius(scale: number): number {
    return Math.max(GameState.WEICHE_RADIUS, GameState.tapSlack(scale));
  }

  /** Welche Weiche gerade angetippt ist - dann zeigt die Karte beide Routen
   *  im Vergleich, bevor man entscheidet. */
  weicheGewaehlt: string | null = null;

  /** Wo die Weichen dieser Karte sitzen und wie sie stehen.
   *
   *  Der Ort ist der Knoten, an dem sich die gesperrte Kante abzweigt - also
   *  die Stelle, an der die Entscheidung wirklich faellt. Ihn aus dem Netz zu
   *  lesen statt ihn eigens einzutragen ist kein Geiz: eine zweite Angabe
   *  neben der Kante liefe beim ersten Verschieben auseinander (Regel 15). */
  weichenPunkte(): { id: string; name: string; x: number; y: number; zu: boolean }[] {
    const netz = WEGNETZ[this.map.id];
    if (!netz?.weichen?.length) return [];
    const raus: { id: string; name: string; x: number; y: number; zu: boolean }[] = [];
    for (const w of netz.weichen) {
      const kante = netz.kanten.find((k) => k.id === w.kante);
      const knoten = netz.knoten.find((k) => k.id === kante?.von);
      if (!knoten) continue;
      raus.push({ id: w.id, name: w.name, x: knoten.x, y: knoten.y, zu: this.weichen.has(w.id) });
    }
    return raus;
  }

  /** Welche Weiche liegt unter diesem Punkt? */
  weicheTreffer(wx: number, wy: number, scale = 1): string | null {
    let beste: string | null = null; let nah = GameState.weicheTapRadius(scale);
    for (const w of this.weichenPunkte()) {
      const d = Math.hypot(wx - w.x, wy - w.y);
      if (d <= nah) { nah = d; beste = w.id; }
    }
    return beste;
  }

  /** Eine Weiche umlegen - zwischen den Wellen.
   *
   *  **Waehrend eine Welle laeuft, wird es abgelehnt**, und das ist keine
   *  Bequemlichkeit: ein Gegner traegt als einzige Zustandsgroesse seine
   *  zurueckgelegte Strecke. Tauscht man die Bahn unter ihm aus, springt er
   *  auf die neue Kurve - dieselbe Strecke, anderer Ort. Das waere keine
   *  Korrektur mehr, sondern eine neue Mechanik (dieselbe Begruendung wie
   *  beim Turmversetzen in v108).
   *
   *  Geprueft wird nicht nur `waveActive`, sondern ob ueberhaupt noch jemand
   *  auf dem Feld steht: ein Raeuber mit einem Splitter laeuft seine Bahn
   *  ZURUECK, und seine Welle kann laengst zu Ende sein.
   *
   *  Gibt zurueck, ob umgelegt wurde. */
  weicheStellen(id: string, zu: boolean): boolean {
    if (this.waveActive || this.enemies.length > 0 || this.pending.length > 0) return false;
    const netz = WEGNETZ[this.map.id];
    if (!netz?.weichen?.some((w) => w.id === id)) return false;
    if (zu === this.weichen.has(id)) return true;
    const vorher = new Set(this.weichen);
    if (zu) this.weichen.add(id); else this.weichen.delete(id);
    try {
      this.bahnenNeu();
    } catch {
      // Keine Route mehr - die Stellung wird zurueckgenommen statt das Spiel
      // anzuhalten. Dass es diese Stellung ueberhaupt gibt, faengt der
      // Weichenfenster-Waechter (S-N2-04).
      this.weichen.clear();
      for (const w of vorher) this.weichen.add(w);
      this.bahnenNeu();
      return false;
    }
    this.bahnStand++;
    return true;
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
    // Abstand zum Wegkoerper - die oertliche halbe Breite ist darin schon
    // abgezogen: an einer Engstelle darf naeher gebaut werden als an einer
    // breiten Stelle, und genau das macht Engstellen wertvoll.
    //
    // `schlauchAbstand` und nicht `distanceTo` + `halfNear`: die alte Fassung
    // fragte Abstand und Breite an verschiedenen Stellen der Kurve und hatte
    // deshalb ein Gebiet, das sich nicht zeichnen laesst. Die gezeigte
    // Baukante (`gfx/bauflaeche.ts`) ist die Vereinigung genau dieser Kreise
    // - Regel und Bild sind seit v203 dieselbe Rechnung.
    for (const lane of this.lanes) {
      if (lane.schlauchAbstand(x, y) < r + PATH_CLEARANCE) return 'Weg';
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

  /** Eine laufende Welle stellen oder abraeumen - fuer Werkzeuge (S-P4-01).
   *
   *  `waveActive` ist seit v266 eine ABLEITUNG aus `laufende` und laesst sich
   *  nicht mehr setzen. Das ist der Sinn der Sache: es gibt keine Stelle
   *  mehr, an der Schalter und Wirklichkeit auseinanderlaufen koennen. Wer
   *  einen Zustand stellen will, stellt ihn - und dieser eine Griff sagt,
   *  wie. */
  wellenZumPruefen(laufend: number[]): void {
    this.laufende = laufend.map((welle) => ({ welle, uhr: 0 }));
  }

  /** Nur zum Pruefen: den Anmarsch einer Welle kuerzen; gibt zurueck, wieviel
   *  danach noch aussteht.
   *
   *  Eine halb abgearbeitete Welle laesst sich sonst nur ABWARTEN, und ein
   *  Messplatz, der auf einen Zufall wartet, hoert leise auf zu pruefen,
   *  sobald sich die Karte aendert - viermal gemessen in v219. Gekuerzt wird
   *  die Warteschlange, nicht die Zahl: `fruehstartRisiko` rechnet danach
   *  dieselbe Rechnung wie im Spiel. */
  anmarschZumPruefen(welle: number, behalten: number): number {
    const eigene = this.pending.filter((p) => p.welle === welle);
    this.pending = this.pending.filter((p) => p.welle !== welle)
      .concat(eigene.slice(0, behalten));
    return this.pending.filter((p) => p.welle === welle).length;
  }

  trefferZumPruefen(e: Enemy, schaden: number, durchschlag = 0): void {
    this.damage(e, schaden, null, '#fff', 0, 0, durchschlag);
  }

  /** Einen Lauf beenden, ohne ihn zu spielen - fuer den Rauchtest.
   *
   *  `finishRun` ist privat und soll es bleiben: es traegt Bestwert, Sterne
   *  und Freischaltung ein, und genau deshalb darf es nicht von aussen
   *  gerufen werden koennen. Der Fortschritt (C18) haengt aber daran, und
   *  fuenfzehn Wellen zu spielen, nur um zu sehen, ob eine Zeile erscheint,
   *  waere zwanzig Sekunden fuer eine Zuweisung. */
  beendenZumPruefen(gewonnen: boolean): void {
    this.finishRun(gewonnen);
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



  /** **Was ein Turm dieser Art JETZT kostet** (v286, S-N3-02).
   *
   *  Die eine Stelle, an der ein Baupreis entsteht. Vorher stand
   *  `def.base.cost` an acht Stellen im Baum - drei hier, fuenf in der
   *  Bedienung -, und ein Preis, der an acht Stellen steht, veraltet an
   *  sieben (Regel 15). Der Knopf, die Vorkauf-Karte, die Ausgrauung und
   *  der Kauf selbst fragen seitdem alle hier.
   *
   *  Der Foerderer zaehlt fuer sich: er ist kein Geschuetz, und wer sein
   *  Einkommen ausbaut, haeuft nicht dieselbe Sache. */
  /** Der Zuschlag als FELD, nicht als Konstante - damit er sich abschalten
   *  laesst (Regel 13). Das Spiel setzt ihn nie um; `npm run sim` misst
   *  damit denselben Bot einmal mit und einmal ohne, und die Gegenprobe der
   *  Story greift genau hier. Eine Wirkung, die sich nicht abschalten laesst,
   *  ist nicht gemessen, sondern behauptet. */
  wiederholungZuschlag = WIEDERHOLUNG_ZUSCHLAG;
  /** Wie stark Vielfalt die Beute hebt - als Feld, damit eine Messung sie
   *  abschalten kann, ohne die Daten zu aendern (Regel 13). */
  vielfaltZuschlag = VIELFALT_BEUTE;

  /** **Die genommenen Karten dieses Laufs** (v303, S-N1-02).
   *
   *  Ihre Wirkung steht daneben als fertige Rechnung (`karten`) - nicht,
   *  weil das schneller waere, sondern damit es EINE Stelle gibt, an der aus
   *  Karten Zahlen werden. Wer sie an drei Stellen ausrechnet, hat drei
   *  Rechnungen, von denen zwei veralten (Regel 15).
   *
   *  Leer heisst: keine Karte genommen, und dann steht in `karten` ueberall
   *  die 1 - die Faktoren aendern nichts, und der ganze an EINZELNEN Karten
   *  geeichte Pfad rechnet Zeichen fuer Zeichen wie vorher. Dieselbe Haltung
   *  wie beim Lauf in v302. */
  genommeneKarten: string[] = [];
  /** **Heisst `zugWirkung` und nicht `karten`, und das ist kein Geschmack.**
   *  `this.karten` gibt es seit v193 und meint etwas ganz anderes: wieviele
   *  KARTEN (Level) gewonnen sind, woran die Faehigkeiten haengen (C18). Zwei
   *  Dinge unter einem Namen sind genau die Doppelung, die Regel 15 meint -
   *  hier waere sie sogar stumm gewesen, weil beide Zahlen sind. */
  zugWirkung: KartenWirkung = KEINE_KARTEN;

  /** Eine Karte nehmen: sie merken, die Rechnung neu bilden und die
   *  Sofortwirkungen gutschreiben.
   *
   *  Gold und Kristall wirken beim NEHMEN, nicht laufend - sonst waere eine
   *  Goldkarte in Welle 2 etwas anderes als dieselbe in Welle 40, und die
   *  Karte haette zwei Werte mit einem Namen. */
  /** **Steht gerade ein Zug an?** (v303, S-N1-02)
   *
   *  Eine ABLEITUNG, kein Schalter - dieselbe Bauart wie `istMenuOffen()`
   *  hinter Regel 6, und aus demselben Grund: es gibt keine Stelle, an der
   *  man das Wegnehmen vergessen kann.
   *
   *  Drei Bedingungen, und jede sagt etwas anderes:
   *  - **keine Welle laeuft.** Die Abnahme der Story woertlich: der Zug
   *    unterbricht die Welle nicht, er liegt dazwischen. Ein Zug mitten im
   *    Gefecht waere eine Entscheidung unter Zeitdruck, und Zeitdruck ist
   *    hier schon die Welle selbst.
   *  - **es laeuft eine Partie.** Im Menue ist keine Spielbedienung sichtbar
   *    (Regel 6), und der Kartenzug ist Spielbedienung.
   *  - **fuer diese Welle wurde noch nicht gezogen.** Sonst zoege man
   *    zwischen zwei Wellen beliebig oft. */
  zugFaellig(): boolean {
    return this.phase === 'playing'
      && !this.paused
      && !this.waveActive
      && this.genommeneKarten.length <= this.waveIndex
      && this.waveIndex < this.waves.length;
  }

  /** Die drei Karten, die gerade zur Wahl stehen - gezogen, nicht gemerkt.
   *
   *  Aus Aussaat und Welle, also deterministisch und ohne eigenen Zustand:
   *  wer denselben Lauf noch einmal faehrt, sieht in Welle 7 dieselben drei
   *  Karten. Ein gemerkter Zug muesste in den Spielstand, koennte davon
   *  abweichen und waere die zweite Wahrheit, die Regel 15 meint. */
  /** **Der Stapel, aus dem dieser Lauf zieht** (v306, S-N1-04).
   *
   *  Voreingestellt der Grundstapel, nicht der Kontostand des Messenden.
   *  Gesetzt wird er in `reset` - im Spiel aus der Ablage, in den Werkzeugen
   *  ausdruecklich leer. Das ist Regel 4 in einer Zeile: das Modell darf
   *  nicht davon abhaengen, wieviel derjenige gespielt hat, der es misst. */
  kartenStapel: Karte[] = GRUNDSTAPEL;

  angeboteneKarten(): Karte[] {
    return zieheKarten(this.seed, this.waveIndex, KARTEN_JE_WELLE, this.kartenStapel);
  }

  karteNehmen(id: string): void {
    // **Nicht waehrend einer Welle** - die Regel steht an der Ableitung, und
    // hier wird sie gefragt statt noch einmal geschrieben.
    if (!this.zugFaellig()) return;
    // Und nur aus dem, was wirklich angeboten wird: ohne diese Zeile koennte
    // ein Aufruf jede Karte des Stapels nehmen, und die Wahl aus dreien waere
    // eine Wahl aus zwoelf.
    if (!this.angeboteneKarten().some((x) => x.id === id)) return;
    const k = KARTENSTAPEL.find((x) => x.id === id);
    if (!k) return;
    this.genommeneKarten.push(id);
    this.zugWirkung = kartenWirkung(this.genommeneKarten);
    if (k.art === 'gold') this.gold += k.wert;
    // Kristall wie jede Reparatur am Hoechstmass gedeckelt - eine Karte darf
    // den Kristall nicht ueber das heben, was die Karte selbst zulaesst.
    if (k.art === 'kristall') this.lives = Math.min(this.maxLives, this.lives + k.wert);
  }

  wiederholungsAufschlag(id: TowerId): number {
    const gebaut = this.towers.reduce((n, t) => n + (t.def === id ? 1 : 0), 0);
    return wiederholungsFaktor(gebaut, this.wiederholungZuschlag);
  }

  baupreis(id: TowerId): number {
    return Math.round(TOWERS[id].base.cost * this.wiederholungsAufschlag(id));
  }

  build(wx: number, wy: number, id: TowerId): boolean {
    // Die Zielunit steht schon. Sie ist nicht in TOWER_ORDER, also bietet
    // die Bauleiste sie nie an - hier steht der Riegel trotzdem, weil
    // "steht nicht im Menue" keine Regel ist, sondern eine Beobachtung.
    if (id === 'core') return false;
    const def = TOWERS[id];
    const x = snap(wx), y = snap(wy);
    const preis = this.baupreis(id);
    if (!this.canPlace(id, x, y) || this.gold < preis) return false;
    this.gold -= preis;
    this.stats.goldSpent += preis;
    this.stats.towersBuilt++;
    const c = { x, y };
    const t: Tower = {
      id: this.nextId++, def: id, x: c.x, y: c.y,
      level: 1, branch: null, cooldownLeft: 0, angle: -Math.PI / 2, recoil: 0, flash: 0,
      pulse: 0, spring: 1,
      zielwahl: 'vorn',
      target: null, retargetIn: 0, kills: 0, damageDone: 0,
      bezahlt: preis,
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
    // Zurueck kommt ein Anteil des WIRKLICH Bezahlten, nicht des Grundpreises
    // (v286): sonst braechte der vierte Bogenturm 38 zurueck, wo er 110
    // gekostet hat, und ein Fehlkauf waere teurer als das Haeufen selbst.
    const value = sellValue(def, t.branch, t.level, this.perks.refund, t.bezahlt);
    this.gold += value;
    t.target = null;
    compact(this.towers, (o) => o === t);
    this.towersVersion++;
    if (this.selectedTower === t) this.selectedTower = null;
    this.float(t.x, t.y - 10, `+${value}`, C.gold, 22);
    this.ring(t.x, t.y, 48, C.stoneDark, 0.35, 2);
    Sfx.play('sell');
  }

  /** Wieviele ANDERE Turmarten stehen im Umkreis dieses Turms?
   *
   *  Gerechnet wird fuer alle Tuerme auf einmal und nur dann, wenn sich das
   *  Feld geaendert hat - `towersVersion` steigt bei Bau, Ausbau, Verkauf
   *  und Versetzen. Ohne das liefe die Rechnung je Turm und Bild, und sie
   *  ist quadratisch in der Turmzahl.
   *
   *  Der Ausbau aendert den Verbund nicht, zaehlt aber trotzdem mit: eine
   *  eigene Fassung des Zaehlers, die nur bei Bau und Verkauf steigt, waere
   *  eine zweite Wahrheit ueber denselben Zustand (Regel 15). */
  private verbundStand = -1;
  private readonly verbundWert = new Map<number, number>();
  verbundVon(t: Tower): number {
    if (this.verbundStand !== this.towersVersion) {
      this.verbundStand = this.towersVersion;
      this.verbundWert.clear();
      for (const a of this.towers) {
        if (a.def === 'core') continue;
        this.verbundWert.set(a.id, this.verbundPartnerAn(a.x, a.y, a.def, a).length);
      }
    }
    return this.verbundWert.get(t.id) ?? 0;
  }

  /** Welche Tuerme einen Verbund an DIESER Stelle traegen wuerden - je Art
   *  hoechstens einer, und zwar der naechste.
   *
   *  **Die eine Stelle, an der der Verbund gezaehlt wird** (v245). Vorher
   *  standen dieselben drei Zeilen zweimal: einmal zum Zaehlen, einmal fuer
   *  die Faeden im Bild - und als die Bauvorschau dazukam, waeren es drei
   *  gewesen. Genau so entsteht ein Bild, das etwas anderes sagt als der
   *  Pruefsteg (Regel 15).
   *
   *  `ohne` ist der Turm, der an dieser Stelle selbst steht; bei einer
   *  Vorschau gibt es ihn noch nicht. */
  verbundPartnerAn(x: number, y: number, art: TowerId, ohne: Tower | null = null): Tower[] {
    if (art === 'core') return [];
    const r2 = VERBUND_UMKREIS * VERBUND_UMKREIS;
    const naechste = new Map<TowerId, { turm: Tower; d: number }>();
    for (const b of this.towers) {
      if (b === ohne || b.def === 'core' || b.def === art) continue;
      const d = dist2(x, y, b.x, b.y);
      if (d > r2) continue;
      const alt = naechste.get(b.def);
      if (!alt || d < alt.d) naechste.set(b.def, { turm: b, d });
    }
    return [...naechste.values()]
      .sort((a, b) => a.d - b.d)
      .slice(0, VERBUND_MAX)
      .map((e) => e.turm);
  }

  /** Welche Tuerme den Verbund dieses Turms tragen - fuer die Faeden im
   *  Bild. Gezeichnet wird, was gezaehlt wird. */
  verbundPartner(t: Tower): Tower[] {
    return this.verbundPartnerAn(t.x, t.y, t.def, t);
  }

  /** Werte der aktuellen Ausbaustufe eines Turms - mit dem Verbund.
   *
   *  Der Zuschlag sitzt HIER und nicht an den Stellen, an denen Schaden
   *  ausgeteilt wird. Die gibt es naemlich dreimal (Aura, Geschoss,
   *  Flaechentreffer), und drei Fassungen desselben Zuschlags waeren zwei zu
   *  viel - der Pruefsteg, der den Wert anzeigt, waere die vierte. */
  towerStats(t: Tower) {
    const st = statsFor(TOWERS[t.def], t.branch, t.level);
    const v = this.verbundVon(t);
    const bann = this.bannVon(t);
    const k = this.zugWirkung;
    const kartenLos = k.schadenMul !== 1 || k.taktMul !== 1 || k.reichweiteMul !== 1;
    if (v <= 0 && bann <= 0 && !kartenLos) return st;
    return {
      ...st,
      // **Die Kartenwirkung liegt AUSSEN** (v303, S-N1-02).
      //
      // Sie ist ein Faktor auf das fertige Ergebnis, nicht ein Summand im
      // Turmwert: eine Karte, die zehn Prozent gibt, gibt sie auf jeder Stufe
      // und in jedem Zweig zehn Prozent. Innen verrechnet waere sie auf
      // Stufe 1 spuerbar und auf Stufe 6 verschwunden - und ein Zug, dessen
      // Wert davon abhaengt, wann man ihn macht, ist keine Entscheidung,
      // sondern eine Reihenfolge.
      range: st.range * k.reichweiteMul,
      damage: (v > 0 ? st.damage * (1 + VERBUND_STUFE * v) : st.damage) * k.schadenMul,
      // **Der Bann greift an der Abklingzeit, nicht am Schaden** (v295, C3).
      //
      // Zwei Gruende. Erstens ist der Verbund (v244) schon eine
      // Schadenszahl, und zwei Verstaerker auf derselben Groesse waeren
      // multiplikativ - dann ist "beides zugleich" die einzige richtige
      // Antwort. Zweitens sagen es die Vorbilder so: Torchwood und der Buff
      // Beam machen Schuesse HAEUFIGER oder staerker, das Dorf gibt
      // Reichweite - keines davon verrechnet sich mit einem anderen Bonus
      // desselben Spiels.
      //
      // Und es ist im Bild zu sehen, ohne eine Zahl zu lesen: ein Turm im
      // Bann feuert sichtbar schneller.
      cooldown: (bann > 0 ? st.cooldown / (1 + bann) : st.cooldown) * k.taktMul,
    };
  }

  /** **Wieviel Bann auf diesem Turm liegt** (v295, C3).
   *
   *  Die eine Stelle, an der die Verstaerkung entsteht. Sie fragt die
   *  Bannturme, nicht den Turm - ein Turm weiss nicht, wer ihn deckt, und
   *  eine zweite Buchhaltung darueber waere eine, die veraltet, sobald
   *  jemand einen Bannturm verkauft (Regel 15).
   *
   *  **Der Bannturm verstaerkt sich selbst nie**, und auch keinen anderen,
   *  der nicht schiesst: sonst waere die Antwort "zwei Bannturme
   *  nebeneinander", und das ist keine Stellung, sondern eine Schleife.
   *  Dieselbe Regel wie beim Schildtraeger der Gegner (v110), der seinen
   *  eigenen Schild nie nachlaedt. */
  bannVon(t: Tower): number {
    if (TOWERS[t.def].attack === 'keiner') return 0;
    const zuschlaege: number[] = [];
    for (const b of this.towers) {
      if (b.def !== 'bann') continue;
      const st = statsFor(TOWERS.bann, b.branch, b.level);
      if (Math.hypot(b.x - t.x, b.y - t.y) > st.range) continue;
      zuschlaege.push(bannZuschlag(b.branch, b.level));
    }
    return zuschlaege.length ? bannStapel(zuschlaege) : 0;
  }

  // ---------------------------------------------------------------- Wellen

  /** Der Wellenplan der aktuellen Karte. */
  get waves() { return this.map.waves; }
  get waveNumber(): number {
    // Gezeigt wird die NEUESTE laufende Welle; laeuft keine, die naechste.
    const i = this.laufende.length
      ? Math.max(...this.laufende.map((l) => l.welle))
      : this.waveIndex;
    return this.endless ? i + 1 : Math.min(i + 1, this.waves.length);
  }
  get totalWaves(): number { return this.waves.length; }
  get canStartWave(): boolean {
    return this.laufende.length < GameState.UEBERLAPPUNG_MAX
      && (this.endless || this.waveIndex < this.waves.length);
  }
  get nextWave() { return this.waveAt(this.waveIndex); }

  /** **Welche Welle der Knopf startet** (S-P4-03, `zweiWellenband`).
   *
   *  `waveNumber` beantwortet eine andere Frage: es zeigt die NEUESTE
   *  laufende. Solange nur eine Welle laufen konnte, waren beide dasselbe -
   *  seit v266 nicht mehr, und der Knopf sagte deshalb "Welle 3 · noch 12"
   *  und startete Welle 4. */
  get startWelle(): number {
    return this.endless
      ? this.waveIndex + 1
      : Math.min(this.waveIndex + 1, this.waves.length);
  }

  /** **Was von jeder laufenden Welle noch aussteht** - Anmarsch plus Feld.
   *
   *  `wellenRest` zaehlt alles zusammen, und das war richtig, solange nur
   *  eine Welle laufen konnte. Mit zweien ist "noch X" mehrdeutig: die Zahl
   *  gehoert zu keiner der beiden. */
  get laufendeReste(): { welle: number; rest: number }[] {
    return this.laufende.map((l) => ({
      welle: l.welle,
      rest: this.pending.filter((p) => p.welle === l.welle).length
        + this.enemies.filter((e) => !e.dead && !e.leaked && e.welle === l.welle).length,
    }));
  }

  /** Welche Welle die Vorschau zeigen soll.
   *
   *  `waveIndex` steigt erst in `finishWave`, nicht beim Start - waehrend
   *  Welle 3 zeigt `nextWave` also auf Welle 3 selbst. Solange die Vorschau
   *  zwischen den Wellen verschwand, fiel das nicht auf; seit sie stehen
   *  bleibt (v239, E6), haette sie die LAUFENDE Welle unter der Ueberschrift
   *  "Als Naechstes" gezeigt. Gesehen hat es die Aufnahme: der Knopf sagte
   *  "Welle 1 - noch 6", und daneben stand "Als Naechstes 6x Erste Fuehler".
   *
   *  Am Ende des Plans gibt es kein Danach - ausser im Endlosmodus, und den
   *  beantwortet `waveAt` von selbst. */
  get vorschauWelle() {
    // Seit v266 zeigt `waveIndex` auf die naechste Welle - die Vorschau
    // braucht deshalb keine Fallunterscheidung mehr.
    const i = this.waveIndex;
    if (!this.endless && i >= this.waves.length) return null;
    return this.waveAt(i);
  }

  /** Wieviele Gegner der laufenden Welle noch kommen oder noch leben.
   *
   *  **Warum das fehlte** (v239, E6): waehrend einer Welle stand nirgends,
   *  wie weit sie ist. Der Hauptknopf war ausgegraut ("Welle laeuft"), die
   *  Vorschau verschwand, und der Spieler sah eine unbestimmte Zeit lang
   *  Gegner laufen, ohne zu wissen, ob noch zwei oder noch zwanzig kommen.
   *  Alle drei Vorbilder zeigen den Wellenfortschritt laufend.
   *
   *  Gezaehlt wird beides zusammen - was noch erscheint UND was schon da
   *  ist. Nur das Ausstehende zu zaehlen liefe auf null, waehrend noch ein
   *  halbes Dutzend auf dem Weg ist; nur das Lebende zaehlt am Anfang zu
   *  wenig. Die Summe ist das, was der Spieler als "noch offen" empfindet.
   *
   *  Der Span zaehlt mit, sobald er da ist: er ist ein Gegner wie jeder
   *  andere. Was aus einem Spalter noch WIRD, zaehlt nicht - das waere eine
   *  Vorhersage, und eine Zahl, die beim Zerfallen nach oben springt, liest
   *  sich als Fehler. */
  get wellenRest(): number {
    return this.pending.length + this.enemies.length;
  }

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

  /** Der Fruehstart als EINE Auskunft: was er bringt, wieviel Zeit noch
   *  bleibt und wieviel des Fensters uebrig ist.
   *
   *  Bis v242 gab es nur die Goldzahl, und die Bedienung rechnete sich den
   *  Rest selbst zusammen - beziehungsweise sie tat es nicht: das Fenster
   *  stand nirgends im Bild. Wer eine Entscheidung zeigen will, braucht
   *  beide Haelften an einer Stelle, sonst entsteht die zweite irgendwo in
   *  der Oberflaeche noch einmal (Regel 15).
   *
   *  Die erste Welle traegt keinen Bonus: dort baut man ueberhaupt erst
   *  seinen ersten Turm, und ein Anreiz zur Eile waere eine Falle. */
  get fruehstart(): { gold: number; rest: number; anteil: number;
    risiko: number; fuellung: number } {
    const leer = { gold: 0, rest: 0, anteil: 0, risiko: 0, fuellung: 0 };
    if (!this.canStartWave || this.waveIndex === 0) return leer;
    const rest = Math.max(0, EARLY_BONUS_WINDOW - this.idleTime);
    const anteil = rest / EARLY_BONUS_WINDOW;
    const risiko = this.fruehstartRisiko;
    const gold = Math.round(anteil * EARLY_BONUS_MAX * (1 + EARLY_RISIKO_HUB * risiko));
    // **Die Fuellung ist eine Ableitung der Zahl, keine zweite Rechnung.**
    // Bis v266 stand dort `anteil`, und das war dasselbe - seit der Bonus
    // ueber `EARLY_BONUS_MAX` hinausgehen kann, ist es das nicht mehr. Waere
    // die Fuellung in der Oberflaeche gerechnet, haetten Balken und Zahl
    // zwei Quellen (Regel 15), und der Balken liefe bei jeder Ueberlappung
    // voll, waehrend die Zahl steigt.
    return { gold, rest, anteil, risiko, fuellung: Math.min(1, gold / EARLY_BONUS_MAX) };
  }

  /** **Wieviel der laufenden Wellen noch auf dem Feld steht** (S-P4-02).
   *
   *  0 heisst: nichts laeuft oder nichts ist mehr uebrig - der Fruehstart
   *  ist dann genau der von frueher. 1 heisst: die laufende Welle steht noch
   *  ganz da, und wer JETZT die naechste dazustellt, traegt zwei volle
   *  Wellen.
   *
   *  Gezaehlt werden Lebenspunkte, nicht Koepfe: zwoelf Krabbler und ein
   *  Koloss sind nicht dieselbe Lage, obwohl beides "ein Dutzend Gegner"
   *  sein kann.
   *
   *  **Warum nicht `wellenDruck` aus den Daten.** Das beantwortet die Frage
   *  des PLANS - mit den Bruchstuecken der Spalter und ohne die Kurve des
   *  Grades. Hier zaehlt, was wirklich auf dem Feld steht; Zaehler und
   *  Nenner muessen dieselbe Einheit haben, sonst steht die Zahl beim
   *  Wellenstart nicht auf 1. Der Spalter treibt sie kurz darueber, wenn er
   *  zerfaellt - deshalb der Deckel. */
  get fruehstartRisiko(): number {
    if (!this.laufende.length) return 0;
    const laeuft = new Set(this.laufende.map((l) => l.welle));
    let steht = 0;
    for (const e of this.enemies) {
      if (!e.dead && !e.leaked && laeuft.has(e.welle)) steht += e.hp;
    }
    for (const p of this.pending) {
      if (laeuft.has(p.welle)) steht += this.huelle(p.enemy, p.hpMul, p.welle);
    }
    let ganz = 0;
    for (const l of this.laufende) {
      for (const g of this.waveAt(l.welle).groups) {
        ganz += g.count * this.huelle(g.enemy, g.hpMul ?? 1, l.welle);
      }
    }
    if (ganz <= 0) return 0;
    return Math.min(1, steht / ganz);
  }

  /** Die Lebenspunkte, mit denen ein geplanter Gegner das Feld betritt.
   *
   *  Dieselbe Rechnung wie in `spawnEnemy`, und sie steht deshalb nur hier:
   *  liefe die Lagemessung auf einer eigenen Formel, zeigte sie beim
   *  Wellenstart irgendetwas neben 1,0 an, ohne dass jemand sagen koennte,
   *  woher der Unterschied kommt. */
  private huelle(id: EnemyId, hpMul: number, welle: number): number {
    // **Die Lebenskurve laeuft ueber den LAUF, nicht ueber die Karte**
    // (v302, S-N1-01).
    //
    // Ohne Lauf steht der Versatz auf 0 und die Gesamtzahl auf der
    // Wellenzahl dieser Karte - dann rechnet `hpScale` Zeichen fuer Zeichen
    // dasselbe wie vorher, und die ganze an EINZELNEN Karten geeichte
    // Balance bleibt unberuehrt. Mit Lauf faengt der zweite Abschnitt dort
    // an, wo der erste aufgehoert hat, statt am flachen Anfang der Kurve.
    // **Zwei Kurven, nicht eine gestreckte** (v309, N1K).
    //
    // `hpScale` laeuft INNERHALB dieses Abschnitts und bleibt damit genau die
    // Kurve, gegen die C18, die Spannungsratsche und jede Kartenzahl geeicht
    // sind. Der Lauf legt einen FAKTOR darueber, einen je Abschnitt.
    //
    // Bis v308 wurde stattdessen `hpScale` ueber alle sechzig Wellen
    // gestreckt. Gemessen kostete das 0 / 0 / 0 / 6 Kristall - drei
    // Spaziergaenge und ein Abschnitt, der alles trug. Der Wellenzaehler war
    // nicht falsch, aber er ist der Zaehler eines LAUFS und nicht der einer
    // Kurve; er traegt seitdem die Erfahrung (S-N1-04) und die Laenge.
    const ramp = hpScale(this.diff, welle, this.waves.length, this.map.balance.hpMul)
      * laufFaktor(this.laufAbschnitt, this.laufSteigung);
    // **Und die Auflage des Abschnitts liegt darueber** (v305, S-N1-03).
    //
    // Sie ist ein Faktor und kein zweiter Kurvenparameter: die Wahl aendert,
    // wie schwer DIESER Abschnitt ist, nicht wie die Kurve laeuft. Ohne Wahl
    // steht sie auf 1, und dann rechnet die Zeile dasselbe wie in v304.
    return Math.round(ENEMIES[id].hp * hpMul * ramp * this.laufDruck);
  }

  /** **Der wievielte Abschnitt eines Laufs das hier ist**, 0-basiert
   *  (v309, N1K). 0 heisst: einzelne Karte oder erster Abschnitt - dann steht
   *  der Faktor auf 1 und alles rechnet wie ohne Lauf. */
  laufAbschnitt = 0;
  /** Wie stark ein Abschnitt gegenueber dem vorigen zulegt. Steht auf dem
   *  Wert aus `difficulty.ts`; die Werkzeuge stellen ihn um, damit sich die
   *  Wirkung abschalten laesst (Regel 13). */
  laufSteigung = LAUF_STEIGUNG;
  /** Faktor auf die Lebenspunkte, aus der Abschnittswahl (S-N1-03). 1 heisst:
   *  keine Auflage - einzelne Karte oder Abschnitt ohne Wahl. */
  laufDruck = 1;
  /** Faktor auf alles Gold, aus derselben Wahl. Beide zusammen sind der
   *  Handel, den das Angebot sichtbar macht: mehr Druck gegen mehr Beute. */
  laufBeute = 1;

  /** Gold fuer einen frueh gestarteten Angriff. Faellt linear auf null. */
  get earlyBonus(): number {
    return this.fruehstart.gold;
  }

  startWave(): void {
    if (!this.canStartWave) return;
    const bonus = this.earlyBonus;
    if (bonus > 0) {
      this.gold += bonus;
      this.stats.goldEarned += bonus;
      this.float(this.goal.x, this.goal.y - 70, `Frueh gestartet  +${bonus}`, C.gold, 22);
    }
    const welle = this.waveIndex;
    const wave = this.waveAt(welle);
    // Spaetere Wellen kommen dichter: was zaehlt, ist die Huelle je Sekunde.
    const dense = 1 + welle * this.diff.densityRamp;
    // **Angehaengt, nicht ersetzt** (S-P4-01, `ueberlappendeWellen`). Bis
    // v265 stand hier `this.pending = []` - die zweite Welle haette die
    // erste einfach geloescht.
    const laneCount = this.lanes.length;
    let laneTurn = welle % laneCount;
    for (const g of wave.groups) {
      for (let i = 0; i < g.count; i++) {
        this.pending.push({
          time: g.delay + (i * g.gap) / dense,
          enemy: g.enemy, hpMul: g.hpMul ?? 1,
          welle,
          shield: g.shield ?? 0,
          traeger: g.traeger ?? 0,
          lane: laneTurn % laneCount,
        });
        laneTurn++;
      }
    }
    // Sortiert wird nur, was zu DIESER Welle gehoert - die Eintraege der
    // aelteren behalten ihre Reihenfolge und ihre eigene Uhr.
    const eigene = this.pending.filter((p) => p.welle === welle);
    eigene.sort((a, b) => a.time - b.time);
    this.pending = this.pending.filter((p) => p.welle !== welle).concat(eigene);
    this.laufende.push({ welle, uhr: 0 });
    this.waveIndex++;
    this.idleTime = 0;
    Sfx.play('wave');
  }

  /** Eine EINZELNE Welle ist durch: nichts mehr im Anmarsch, nichts mehr von
   *  ihr auf dem Feld.
   *
   *  **Der Bonus wird je Welle einzeln ausgezahlt** - sonst verschwimmen zwei
   *  Belohnungen zu einer, und der Spieler weiss nicht, wofuer er bezahlt
   *  wurde. */
  private finishWave(welle: number): void {
    const i = this.laufende.findIndex((l) => l.welle === welle);
    if (i < 0) return;
    this.laufende.splice(i, 1);
    const wave = this.waveAt(welle);
    const payout = Math.round(wave.bonus * this.diff.bonusMul * this.map.balance.goldMul
      * this.laufBeute);
    this.gold += payout;
    this.stats.goldEarned += payout;
    this.float(this.goal.x, this.goal.y - 56, `Welle ${welle + 1} geschafft  +${payout}`,
      C.gold, 26);
    this.kristallReparatur();
    this.idleTime = 0;
    // Gewonnen ist die Partie, wenn ALLE Wellen gestartet UND durch sind.
    if (!this.endless && this.waveIndex >= this.waves.length && !this.laufende.length) {
      this.finishRun(true);
      Sfx.play('win');
    }
  }

  /** **Die Werften setzen den Kristall zusammen** (v290, S-N3-04).
   *
   *  Je abgeschlossener Welle, an derselben Stelle wie der Wellenbonus: der
   *  Spieler soll sehen, wofuer er bezahlt wurde, und zwei Belohnungen an
   *  zwei Zeitpunkten verschwaemmen zu einem Gefuehl.
   *
   *  **Der Kernraub bleibt unangetastet, und das ist keine Feinheit.** Ein
   *  Raeuber traegt einen Splitter; erwischt man ihn, schwebt der zurueck und
   *  schreibt die Punkte wieder gut (`splitterZurueck`). Das ist eine
   *  RUECKHOLUNG - dasselbe Stueck kommt an dieselbe Stelle. Die Reparatur
   *  ist etwas anderes: sie macht neuen Kristall aus Gold. Beide addieren auf
   *  `lives`, also muessen sie sich am Deckel dieselbe Grenze teilen, aber
   *  sie duerfen sich nicht gegenseitig aufrechnen - wer beides mischt, hat
   *  eine Rueckholung, die manchmal nichts bringt, weil eine Werft den Platz
   *  schon gefuellt hat, und das waere aus dem Spiel heraus nicht zu
   *  verstehen.
   *
   *  Deshalb steht die Reparatur HINTER dem Wellenende, wo kein Raeuber mehr
   *  laeuft: `finishWave` faellt erst, wenn nichts mehr von dieser Welle auf
   *  dem Feld ist.
   *
   *  **Das Hoechstmass steigt zuerst, dann wird gefuellt.** Anders herum
   *  liefe die Schmelze eine Welle hinterher: sie hoebe die Grenze, die im
   *  selben Zug schon erreicht war. */
  private kristallReparatur(): void {
    let ertrag = 0;
    let hoehung = 0;
    for (const t of this.towers) {
      if (t.def !== 'werft') continue;
      ertrag += werftErtrag(t.branch, t.level);
      hoehung += werftHoechstmass(t.branch, t.level);
    }
    if (!ertrag && !hoehung) return;
    if (hoehung > 0) {
      // Anteilig am Startkristall des Grades, nicht am heutigen Hoechstmass -
      // sonst waechst die Erhoehung mit sich selbst.
      this.maxLives += Math.round(this.startLives * hoehung);
    }
    const gut = Math.min(Math.round(ertrag), Math.max(0, this.maxLives - this.lives));
    if (gut <= 0) return;
    this.lives += gut;
    this.float(this.goal.x, this.goal.y - 86, `Kristall +${gut}`, C.crystal, 24);
  }

  // ----------------------------------------------------------- Faehigkeiten

  /** Gibt es diese Faehigkeit schon (C18)?
   *
   *  Eine Ableitung, kein Schalter (Regel 6): es gibt keine Stelle, an der
   *  man das Freischalten vergessen koennte, weil es nirgends gesetzt wird.
   *  Wer eine Karte gewinnt, hat die naechste beim naechsten Start. */
  freigeschaltet(id: AbilityId): boolean {
    return this.karten >= ABILITIES[id].braucht;
  }

  /** Was noch fehlt, damit es diese Faehigkeit gibt - fuer die Anzeige.
   *  `0` heisst: sie ist da. */
  fehlendeKarten(id: AbilityId): number {
    return Math.max(0, ABILITIES[id].braucht - this.karten);
  }

  ready(id: AbilityId): boolean {
    return this.freigeschaltet(id)
      && this.phase === 'playing' && this.abilityCd[id] <= 0;
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
    this.bauwahlErklaeren = false;
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
    // Und erst JETZT, nach dem Eintragen: ist eine Karte dazugekommen, gibt
    // es dafuer genau eine Faehigkeit - die, die diese Zahl verlangt.
    // Abgeleitet aus `braucht` statt einer Zuordnung Karte -> Faehigkeit,
    // damit es auch fuer eine vierte Karte stimmt.
    const nachher = gewonneneKarten();
    this.freischaltung = nachher > this.karten
      ? (ABILITY_ORDER.find((id) => ABILITIES[id].braucht === nachher) ?? null)
      : null;
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
      // **Jede Welle hat ihre eigene Uhr** (S-P4-01), und die faengt bei null
      // an - genau wie `waveTime` es bis v265 tat. Damit rechnet der Ausstoss
      // Bild fuer Bild dieselbe Aufgabe wie vorher.
      for (const l of this.laufende) l.uhr += dt;
      // Durchgegangen wird die ganze Liste, nicht nur ihr Kopf: bei zwei
      // Wellen ist der naechste faellige Eintrag nicht zwingend der erste.
      // Die Liste ist kurz (Zehner), und die Reihenfolge bleibt die der
      // Warteschlange, damit der Ausstoss vorhersagbar ist.
      for (let i = 0; i < this.pending.length;) {
        const p = this.pending[i];
        const uhr = this.laufende.find((l) => l.welle === p.welle)?.uhr;
        if (uhr === undefined || p.time > uhr) { i++; continue; }
        this.pending.splice(i, 1);
        this.spawnEnemy(p.enemy, p.hpMul, this.offeneBahn(p.lane), p.shield ?? 0,
          p.traeger ?? 0, p.welle);
      }
      // **Ein fliehender Raeuber haelt die Welle nicht auf** (S-P3-01).
      //
      // Er laeuft die ganze Bahn zurueck - auf dem Spiralhain sind das
      // gemessen ueber 3900 Weltpunkte und damit fast eine Minute. Solange
      // er als "noch unterwegs" zaehlte, konnte die naechste Welle nicht
      // starten, und der Endlosmodus kam nur bis Welle 14 von 15.
      //
      // Die Welle ist vorbei, wenn nichts mehr ANGREIFT. Wer mit Beute nach
      // draussen laeuft, greift nicht an - er wird verfolgt, und genau das
      // soll er, waehrend die naechste Welle schon kommt.
      // **Je Welle geprueft, nicht fuer alle zusammen.** Sonst haengt die
      // erste Welle an der zweiten, und ihr Bonus kaeme zu spaet.
      for (const l of [...this.laufende]) {
        const offen = this.pending.some((p) => p.welle === l.welle)
          || this.enemies.some((e) => e.welle === l.welle && e.kernraub === 0);
        if (!offen) this.finishWave(l.welle);
      }
    }

    for (const id of ABILITY_ORDER) {
      if (this.abilityCd[id] > 0) {
        this.abilityCd[id] = Math.max(0, this.abilityCd[id] - dt);
        if (this.abilityCd[id] === 0) Sfx.play('ready');
      }
    }

    this.updateEnemies(dt);
    this.splitterZurueck(dt);
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
  torZu(bahn: number, zeit = this.laufende.length
    ? this.laufende[this.laufende.length - 1].uhr : 0): boolean {
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
    welle = this.waveIndex,
  ): void {
    this.spawnsJeBahn[lane] = (this.spawnsJeBahn[lane] ?? 0) + 1;
    if (this.torZu(lane)) this.spawnsTrotzSperre++;
    const def = ENEMIES[id];
    const ln = lane % this.lanes.length;
    const p0 = this.lanes[ln].pts[0];
    // **Die Skalierung kommt aus der Welle des Gegners, nicht aus dem
    // Zaehler des Spiels** (S-P4-01). Bei Ueberlappung zeigt der Zaehler auf
    // die neuere Welle - die Nachzuegler der aelteren waeren sonst still
    // haerter, als ihr Plan sagt.
    const hp = this.huelle(id, hpMul, welle);
    // Flieger starten leicht versetzt, damit ein Schwarm nicht als eine Linie
    // uebereinander liegt.
    const off = def.flying ? (this.rng.next() - 0.5) * 200 : 0;
    this.enemies.push({
      id: this.nextId++, def: id, x: p0.x, y: p0.y + off,
      hp, hpMax: hp, speed: def.speed, lane: ln, heading: 0,
      side: (this.rng.next() * 2 - 1) * 0.85, travelled: 0,
      wirkungen: null, auraIn: 0, arten: 0, shield, traeger,
      hitFlash: 0, squash: 0, hpShown: hp, wobble: this.rng.next() * 9,
      dead: false, leaked: false, kernraub: 0, welle,
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
        lane: parent.lane, heading: parent.heading, auraIn: 0, arten: 0, shield: 0, traeger: 0,
        // Spaene stieben zur Seite auseinander.
        side: Math.max(-1, Math.min(1, parent.side + (this.rng.next() - 0.5) * 0.9)),
        travelled: Math.max(0, parent.travelled - 6),
        // Der Span erbt, was am Spalter hing - eine KOPIE, sonst teilten
        // sich Erzeuger und Bruchstueck dieselbe Liste.
        wirkungen: parent.wirkungen ? parent.wirkungen.map((w) => ({ ...w })) : null,
        hitFlash: 0, squash: 0, hpShown: hp, wobble: this.rng.next() * 9,
        // Der Span gehoert zur Welle seines Erzeugers - sonst haenge die
        // alte Welle an Bruchstuecken, die auf die neue gebucht sind.
        dead: false, leaked: false, kernraub: 0, welle: parent.welle,
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
      // **Tote werden nicht mehr bewegt** (v262).
      //
      // Sie liegen bis zum `compact` am Ende dieser Schleife noch in der
      // Liste. Bisher fiel das nicht auf: wer in `updateEnemies` starb,
      // wurde im selben Durchlauf entfernt. Wer aber in `updateTowers` oder
      // an einem Geschoss stirbt - also NACH dieser Schleife -, wurde im
      // naechsten Bild noch einmal bewegt.
      //
      // Mit dem Kernraub kostete das echtes Geld: ein erschossener Raeuber
      // verlor seine Beute (`kernraub` faellt auf 0), lief im naechsten Bild
      // wieder vorwaerts, stand weiter am Bahnende - und stahl ein zweites
      // Mal. Gemessen fehlten dem Kristall 6 statt 3 Punkte.
      if (e.dead) continue;
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
        // **Ein fliegender Raeuber kehrt zu seinem Torpunkt zurueck**
        // (S-P3-01). Flieger folgen keiner Bahn: ihr `travelled` wird aus
        // der Luftlinie zurueckgerechnet und in jedem Bild ueberschrieben
        // (gemessen in v219, als eine Gegenprobe darauf hereinfiel). Ein
        // gesetztes `travelled` haette hier also keine Wirkung - der
        // Sonderfall steht deshalb im Quelltext und nicht in einer
        // Vermutung: er fliegt die Luftlinie zum Anfang seiner Bahn.
        const ziel = e.kernraub > 0
          ? (this.lanes[e.lane] ?? this.lanes[0]).at(0)
          : this.goal;
        const dx = ziel.x - e.x, dy = ziel.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = e.speed * tempoFaktor(e.wirkungen) * dt;
        if (e.kernraub > 0) {
          // Beim Rueckflug zaehlt der Fortschritt rueckwaerts, damit
          // "vorderstes Ziel" weiter bedeutet, was es bedeutet.
          e.travelled = this.pathTotal * (d / (this.airTotal || d));
          const flucht = step * GameState.KERNRAUB_TEMPO;
          if (d <= flucht + 6) { this.entkommen(e); } else {
            e.x += (dx / d) * flucht;
            e.y += (dy / d) * flucht;
          }
          continue;
        }
        // Luftlinie zum Herzkristall - kein Pfad, keine Kurven.
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
      // **Ein Raeuber laeuft dieselbe Bahn rueckwaerts** (S-P3-01). Die
      // zurueckgelegte Strecke ist die einzige Zustandsgroesse; das
      // Vorzeichen des Schritts genuegt, und die Figur dreht sich mit,
      // weil die Blickrichtung aus dem Weg folgt.
      const richtung = e.kernraub > 0 ? -GameState.KERNRAUB_TEMPO : 1;
      e.travelled += richtung * e.speed * tempoFaktor(e.wirkungen) * dt;
      if (e.kernraub > 0) {
        // **Ein Raeuber raubt nicht zweimal.** Er steht beim Umkehren am
        // Ende der Bahn, also weiter oberhalb von `path.length` - ohne
        // diese Trennung liefe er in jedem Bild erneut durch `leak()` und
        // zoege den Kristall Bild um Bild leer.
        if (e.travelled <= 0) this.entkommen(e);
        else {
          const p = path.at(Math.min(e.travelled, path.length - 1));
          const platz = Math.max(0, p.half - edef.radius * 0.55 - 4);
          const quer = e.side * platz;
          e.x = p.x + Math.cos(p.angle + Math.PI / 2) * quer;
          e.y = p.y + Math.sin(p.angle + Math.PI / 2) * quer;
          // Er laeuft rueckwaerts, also schaut er auch dorthin.
          e.heading = p.angle + Math.PI;
        }
      } else if (e.travelled >= path.length) {
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
  /** Aus einem sterbenden Raeuber wird ein Splitter (S-P3-02). */
  private splitterLoesen(e: Enemy): void {
    this.rettungTotal++;
    this.splitter.push({
      x: e.x, y: e.y, punkte: e.kernraub,
      rest: GameState.SPLITTER_DAUER, dauer: GameState.SPLITTER_DAUER,
      welle: e.welle,
    });
    e.kernraub = 0;
  }

  /** Die Splitter schweben heim und schreiben gut, was sie tragen.
   *
   *  **Der Kristall kann dabei nie ueber seinen Hoechstwert steigen**, und
   *  der Abzug bei null bleibt gedeckelt - das ist die Zusage aus v174, und
   *  sie darf nicht still wegfallen. Gutgeschrieben wird deshalb hoechstens
   *  bis `maxLives`, und die Bilanz wird um genau denselben Betrag
   *  zurueckgenommen: sonst meldete `stats.leaksByWave` am Ende der Welle
   *  einen Verlust, den es nicht gab. */
  private splitterZurueck(dt: number): void {
    for (const sp of this.splitter) {
      sp.rest -= dt;
      if (sp.rest > 0) continue;
      const gut = Math.min(sp.punkte, Math.max(0, this.maxLives - this.lives));
      this.lives += gut;
      this.rettungPunkte += gut;
      if (gut > 0) {
        // Zurueckgenommen wird in der Welle, in der GESTOHLEN wurde - nicht
        // in der laufenden. Ein Raeuber kann eine Welle spaeter sterben.
        const w = sp.welle >= 0 ? sp.welle : this.waveIndex;
        this.stats.leaksByWave[w] = Math.max(0, (this.stats.leaksByWave[w] ?? 0) - gut);
        this.float(this.goal.x, this.goal.y - 44, `+${gut}`, C.crystal, 26);
        this.ring(this.goal.x, this.goal.y, 100, C.crystal, 0.4, 4);
        // Die Rueckholung ist die Belohnung und muss sich anders anfuehlen
        // als "Welle geschafft" - deshalb der Aufbau-Klang, nicht der
        // Fertig-Klang (S-P3-03).
        Sfx.play('build');
      }
      sp.punkte = 0;
    }
    compact(this.splitter, (sp) => sp.rest <= 0);
  }

  /** Ein Raeuber erreicht sein Tor - die Beute ist endgueltig weg.
   *
   *  Abgezogen wurde sie schon beim Raub (siehe `leak`); hier verschwindet
   *  nur noch die Figur. Ein zweiter Abzug an dieser Stelle waere der
   *  naechstliegende Fehler und wuerde jeden Durchbruch doppelt zaehlen. */
  private entkommen(e: Enemy): void {
    e.dead = true;
    this.float(e.x, e.y - 30, `-${e.kernraub}`, C.danger, 22);
  }

  private leak(e: Enemy, def: typeof ENEMIES[EnemyId]): void {
    e.leaked = true;
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
    // **Verbucht wird an der Welle DES GEGNERS, nicht am Zaehler des
    // Spiels** (S-P4-01). Bei Ueberlappung zeigt `waveIndex` auf die neuere
    // Welle; die Verluste der aelteren wanderten sonst dorthin, und die
    // Verlustverteilung - die Kennzahl von G1 - waere still falsch.
    this.stats.leaksByWave[e.welle] = (this.stats.leaksByWave[e.welle] ?? 0) + wirklich;
    this.crystalHit = 1;
    this.shake = Math.min(1, this.shake + 0.55);
    this.stop(0.8);
    this.float(this.goal.x, this.goal.y - 44, `-${wirklich}`, C.danger, 28);
    this.ring(this.goal.x, this.goal.y, 120, C.danger, 0.5, 5);

    // **Er stirbt nicht, er nimmt und kehrt um** (S-P3-01, Kernraub).
    //
    // Der Kristall faellt SOFORT und nicht erst am Tor: sonst zeigte die
    // Anzeige eine Zahl, die noch nicht wahr ist, und die Bilanz eine
    // andere als der Bildschirm.
    //
    // Traegt er nichts - weil der Kristall schon leer ist -, dann gibt es
    // auch nichts zu tragen, und er verschwindet wie vorher. Ein Raeuber mit
    // null Beute waere ein Gegner, der aus dem Bild laeuft, ohne dass etwas
    // passiert ist.
    if (wirklich > 0) {
      e.kernraub = wirklich;
      this.raubTotal++;
    } else {
      e.dead = true;
    }
  }

  /** Um wieviel die Beute an dieser Stelle steigt (S-N3-01).
   *
   *  **Gezaehlt wird am ORT des Todes, nicht am Toeter.** Ein Zuschlag, der
   *  daran haengt, welcher Turm den letzten Treffer gesetzt hat, waere fuer
   *  den Spieler nicht nachvollziehbar - er sieht den Umkreis, nicht die
   *  Trefferbuchhaltung. So ist es dieselbe Frage wie beim Bauen: liegt diese
   *  Stelle im Kreis oder nicht.
   *
   *  Mehrere Foerderer addieren sich, aber gedeckelt: ohne Deckel waere die
   *  Antwort auf jede Karte "erst sechs Foerderer, dann Tuerme", und das ist
   *  keine Entscheidung mehr, sondern eine Reihenfolge. */
  foerderFaktor(x: number, y: number): number {
    let zuschlag = 0;
    for (const t of this.towers) {
      if (t.def !== 'foerderer') continue;
      const st = this.towerStats(t);
      if (Math.hypot(t.x - x, t.y - y) > st.range) continue;
      zuschlag += foerderZuschlag(t.branch, t.level);
    }
    return 1 + Math.min(FOERDER_DECKEL, zuschlag);
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

      // **Der Foerderer schiesst nicht** (S-N3-01). Er bekommt seine
      // Abklingzeit und seine Federung wie jeder andere - er soll sich im
      // Bild bewegen -, aber hier ist Schluss. Ohne diese Zeile suchte er ein
      // Ziel, faende eines und machte null Schaden: sichtbar waere ein Turm,
      // der auf alles feuert und nichts trifft.
      if (def.attack === 'keiner') continue;

      if (def.attack === 'aura') {
        if (t.cooldownLeft > 0) continue;
        const targets = this.enemiesInRange(t.x, t.y, st.range, this.qArea, def.hitsAir);
        if (!targets.length) continue;
        t.cooldownLeft = st.cooldown;
        t.pulse = 1;
        t.flash = 1;
        this.ring(t.x, t.y, st.range, def.accent, 0.45, 3);
        Sfx.play('frost');
        // **Der Aurendeckel** (v244, F4).
        //
        // Die Aura trifft jeden im Umkreis zugleich, ihre Wirkung waechst
        // also mit der Pulkgroesse - und genau die bringen die schweren
        // Wellen. Gemessen war "nur Frost" damit die staerkste Aufstellung
        // des Spiels (50 von 60 Kristall gegen 43 im gemischten Feld); eine
        // Monokultur, die das Mischen schlaegt, nimmt dem Spiel seine
        // Entscheidung.
        //
        // Gedeckelt wird der SCHADEN, nicht die Bremse: der Frostturm ist
        // ein Stuetzturm, und was er kann, soll er weiter koennen. Was er
        // nicht mehr kann, ist zwanzig Gegner auf einmal erschlagen.
        //
        // Verteilt statt abgeschnitten - wer nur die ersten vier trifft,
        // laesst den Rest ungebremst durch UND verschenkt die Bremse. Und
        // ein Treffer mit null Schaden waere schlimmer als keiner: er
        // verbraucht eine Schildladung.
        const teiler = targets.length > AUREN_DECKEL ? AUREN_DECKEL / targets.length : 1;
        for (let i = 0; i < targets.length; i++) {
          this.damage(targets[i], st.damage * teiler, t, accentFor(def, t.branch),
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
        : wahl === 'stark' ? e.hp + (e.traeger > 0 ? GEFAHR_TRAEGER : 0)
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
    // **Welche Turmart hat hier gearbeitet?** (v299, S-N3-03)
    //
    // Vermerkt wird NACH Schild und Panzerung, also nur wo wirklich Schaden
    // ankam: ein Turm, dessen Schuss der Schild geschluckt hat, hat den
    // Gegner nicht beschaedigt. Sonst zaehlte ein wirkungsloser Schuss so
    // viel wie ein toedlicher.
    // `indexOf` gibt -1 fuer alles, was nicht in `TOWER_ORDER` steht - und
    // das ist nicht theoretisch: die **Zielunit** schiesst und steht nicht
    // darin (siehe `hatZweigwahl`). `1 << -1` ist in JavaScript `1 << 31`,
    // also das Vorzeichenbit, und eine Zaehlschleife mit arithmetischem
    // Schieben kommt darauf nie zum Ende. Der erste Entwurf hat genau so
    // einen `npm run sim` fuer zwanzig Minuten aufgehaengt, ohne eine Zeile
    // auszugeben - ein Fehler, der nicht meldet, sondern steht.
    const artIndex = owner ? TOWER_ORDER.indexOf(owner.def) : -1;
    if (artIndex >= 0) e.arten |= 1 << artIndex;
    e.hitFlash = 1;
    e.squash = Math.min(1, e.squash + 0.55);
    if (owner) owner.damageDone += dmg;
    this.stats.damage += dmg;
    // Und derselbe Schaden noch einmal, nach Wellen sortiert (D13). An
    // DERSELBEN Stelle wie die Summe, damit die beiden nicht auseinander
    // laufen koennen - eine zweite Buchungsstelle waere die naechste Zahl,
    // die still falsch wird.
    // Wie beim Verlust: verbucht an der Welle DES GEGNERS (S-P4-01). Der
    // Zaehler des Spiels zeigt bei Ueberlappung auf die neuere Welle.
    this.stats.damageByWave[e.welle] = (this.stats.damageByWave[e.welle] ?? 0) + dmg;
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
      if (e.kernraub > 0) this.splitterLoesen(e);
      // **Vielfalt zahlt sich in der Beute aus** (v299, S-N3-03).
      //
      // Gerundet wird EINMAL, ganz am Ende: Grundbeute, Grad, Karte,
      // Foerderer und Vielfalt sind Faktoren auf dieselbe Zahl. Wer den
      // Vielfaltsanteil einzeln rundete, verloere ihn bei der haeufigsten
      // Beute (2 Gold) vollstaendig.
      const arten = zaehleBits(e.arten);
      const bounty = Math.max(1, Math.round(vielfaltsBeute(def.bounty, arten,
        this.vielfaltZuschlag) * this.diff.bountyMul
        * this.map.balance.goldMul * this.foerderFaktor(e.x, e.y)
        * this.zugWirkung.beuteMul * this.laufBeute));
      this.gold += bounty;
      this.stats.goldEarned += bounty;
      this.stats.kills++;
      // Die Verteilung, aus der die Beuteregel gefolgt ist - sie bleibt
      // stehen, damit `npm run sim` sie weiter nennt.
      this.stats.artenJeKill[arten] = (this.stats.artenJeKill[arten] ?? 0) + 1;
      if (owner) owner.kills++;
      // **Die Vielfalt steht IM BILD, nicht nur in der Bilanz** (S-N3-03).
      //
      // Der Zuschlag ist ein Faktor auf dieselbe Zahl, also waere er in
      // `+3` nicht zu erkennen - der Spieler saehe eine groessere Zahl und
      // wuesste nicht, warum. Angehaengt wird deshalb, WORAUS sie kommt,
      // und nur dann, wenn wirklich etwas dazugekommen ist: bei einer Art
      // steht dort nichts, und wo die Rundung den Anteil verschluckt, luegt
      // die Marke nicht.
      // Die Vergleichszahl traegt dieselben Faktoren wie die echte, nur ohne
      // die Vielfalt - sonst schriebe eine BEUTEkarte die Marke der Vielfalt
      // an eine Zahl, die von ihr gar nicht kommt.
      const ohne = Math.max(1, Math.round(def.bounty * this.diff.bountyMul
        * this.map.balance.goldMul * this.foerderFaktor(e.x, e.y)
        * this.zugWirkung.beuteMul * this.laufBeute));
      const vielfalt = bounty > ohne ? ` ×${arten}` : '';
      this.float(e.x, e.y - 12, `+${bounty}${vielfalt}`, C.gold, def.boss ? 30 : 20);
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
    opts: { endless?: boolean; perks?: PerkEffect;
      /** Nur fuer die Werkzeuge: die Zahl gewonnener Karten setzen, statt
       *  sie aus der Ablage zu lesen. Ohne das laesst sich C18 nicht
       *  messen, ohne die Ablage des Messenden zu faelschen. */
      karten?: number;
      /** Welche Karten ueber den Grundstapel hinaus im Zug liegen
       *  (S-N1-04). Ohne Angabe die aus der Ablage; die Werkzeuge geben
       *  `[]` und messen damit immer denselben Stapel (Regel 4). */
      stapel?: readonly string[] } = {},
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
    // Das Mass, gegen das die Schmelze rechnet - festgehalten beim Start,
    // damit ihre Erhoehung nicht mit sich selbst waechst (v290).
    this.startLives = this.lives;
    this.stars = 0;
    this.sterneVorher = 0;
    this.waveIndex = 0;
    this.laufende.length = 0;
    this.enemies.length = 0; this.towers.length = 0; this.projectiles.length = 0;
    this.particles.length = 0; this.floats.length = 0;
    this.rings.length = 0; this.bolts.length = 0; this.meteors.length = 0;
    this.husks.length = 0;
    this.flashT = 0;
    this.abilityCd = { meteor: 0, freeze: 0, bollwerk: 0, ernte: 0 };
    this.karten = opts.karten ?? gewonneneKarten();
    this.kartenStapel = stapelAus(opts.stapel ?? freigeschalteteKarten());
    this.freischaltung = null;
    this.laufNummer++;
    this.fortgesetzt = false;
    this.spawnsJeBahn = [];
    this.spawnsTrotzSperre = 0;
    this.aiming = null;
    this.grid.clear();
    this.towersVersion++;
    this.pending = [];
    this.selectedTower = null;
    // **Die baubare Flaeche steht vom ersten Bild an im Bild.**
    //
    // Sie wird nur waehrend der Turmwahl gezeichnet - ein dauerhafter
    // Schleier ueber 30 % der Karte war in v122 schon einmal da und ist zu
    // Recht wieder verschwunden. Der Preis dafuer war aber, dass ein Spieler
    // sie NIE zu sehen bekam: man muss erst wissen, dass man in der Leiste
    // eine Sorte waehlen muss, um die Antwort auf "wo darf ich bauen" zu
    // bekommen. Genau das hat der Nutzer gemeldet.
    //
    // Vorgewaehlt ist deshalb der guenstigste Turm. Er kostet nichts (ein
    // Tipp aufs Feld oeffnet die Wahl, er baut nicht - B2), er ist der,
    // dessen Flaeche am groessten ist, und er verschwindet, sobald der
    // Spieler etwas anderes tut. Kein Schleier, aber auch kein Geheimnis.
    this.buildChoice = guenstigsterTurm();
    this.bauwahlErklaeren = false;
    this.pendingPoint = null;
    this.speed = 1;
    this.paused = false;
    this.idleTime = 0;
    this.leakedTotal = 0;
    this.raubTotal = 0; this.rettungTotal = 0; this.rettungPunkte = 0;
    this.splitter.length = 0;
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
      id: this.nextId++, def: 'core', x, y, bezahlt: 0,
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
      v: 8,
      difficulty: this.difficulty,
      endless: this.endless,
      map: this.map.id,
      seed: this.seed,
      rng: this.rng.state,
      gold: this.gold,
      lives: this.lives,
      waveIndex: this.waveIndex,
      laufende: this.laufende.map((l) => [l.welle, l.uhr] as [number, number]),
      waveTime: this.waveTime,
      idleTime: this.idleTime,
      leaked: this.leakedTotal,
      time: this.time,
      speed: this.speed,
      hitStop: this.hitStop,
      stats: this.stats,
      abilityCd: ABILITY_ORDER.map((id) => [id, this.abilityCd[id]] as [AbilityId, number]),
      weichen: [...this.weichen].sort(),
      karten: this.karten,
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
      pending: this.pending.map((p) => [p.time, p.enemy, p.hpMul, p.lane, p.shield, p.traeger, p.welle]),
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
        // Seit v262: was er nach draussen traegt (S-P3-01). Ohne dieses Feld
        // liefe ein geladener Raeuber wieder auf den Kristall zu, den er
        // gerade bestohlen hat - und zoege ein zweites Mal ab.
        e.kernraub, e.welle,
      ]),
    };
  }

  /** Setzt die Partie aus einem Spielstand fort. Gibt false zurueck, wenn der
   *  Stand nicht zu den aktuellen Daten passt - dann wird er verworfen statt
   *  halb geladen. */
  restore(save: SaveGame): boolean {
    // **Fassung 8 seit v266.** `waveIndex` bedeutet jetzt "gestartet" statt
    // "fertig", und die laufenden Wellen stehen als Liste da. Ein Stand der
    // Fassung 7 laesst sich nicht umrechnen, ohne zu raten, welche Welle
    // gerade lief - er wird deshalb verworfen statt halb geladen, so wie es
    // hier seit jeher gehalten wird.
    if (save.v !== 8) return false;
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

    this.reset(save.seed, save.difficulty, save.map,
      { endless: save.endless, karten: save.karten });
    this.rng.state = save.rng;
    // **Die Weichenstellung gehoert zum Spielstand** - und sie muss HIER
    // stehen, vor `laufende` und `pending`. `weicheStellen` verweigert, sobald
    // jemand auf dem Feld ist oder eine Welle laeuft; eine Zeile weiter unten
    // waere der Aufruf also lautlos wirkungslos gewesen, und der Fehler zeigte
    // sich erst beim Fortsetzen einer angefangenen Welle.
    //
    // Gestellt wird ueber `weicheStellen` statt durch Einsetzen in die Menge:
    // dann laeuft dieselbe Pruefung wie im Spiel, und eine Weiche, die es in
    // der Karte nicht mehr gibt, wird still uebergangen statt den Stand
    // unlesbar zu machen.
    for (const id of save.weichen ?? []) this.weicheStellen(id, true);
    this.gold = save.gold;
    this.lives = save.lives;
    this.waveIndex = save.waveIndex;
    // `waveActive` ist seit v266 eine Ableitung; gesichert werden die
    // laufenden Wellen selbst.
    this.laufende = (save.laufende ?? []).map(([welle, uhr]) => ({ welle, uhr }));
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
    this.pending = save.pending.map(([time, enemy, hpMul, lane, shield, traeger, welle]) =>
      ({ time, enemy, hpMul, lane: lane ?? 0, shield: shield ?? 0, traeger: traeger ?? 0,
        welle: welle ?? 0 }));
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
        // **Der Kaufpreis wird beim Laden nachgerechnet, nicht gespeichert**
        // (v286). Die Tuerme kommen in Baureihenfolge zurueck, also ist der
        // Aufschlag dieselbe Rechnung wie beim Kauf - fuer jeden Spielstand,
        // in dem nichts verkauft wurde, auf den Goldstueck genau. Wer
        // zwischendurch verkauft hat, bekommt den Preis, den derselbe Turm
        // heute kostete; der Fehler liegt nach oben beim Zuschlag und trifft
        // nur den Verkaufswert. Ein Feld im Spielstand waere genauer und
        // haette dafuer ein Format gebrochen, das vier Fassungen alt ist.
        bezahlt: Math.round(TOWERS[def].base.cost
          * wiederholungsFaktor(this.towers.reduce((n, w) => n + (w.def === def ? 1 : 0), 0))),
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
      shield, traeger, kernraub, welle] of zeilen) {
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
        auraIn: auraIn ?? 0, arten: 0, shield: shield ?? 0, traeger: traeger ?? 0,
        kernraub: kernraub ?? 0, welle: welle ?? 0,
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
    // Ein geladener Lauf ist kein neuer: die Einfuehrung hat er schon
    // hinter sich, und sie mitten in Welle neun anzufangen waere Hohn.
    // `reset` hat das Feld eben auf false gesetzt - hier steht die einzige
    // Stelle, die es umdreht.
    this.fortgesetzt = true;
    return true;
  }


}
