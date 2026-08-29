import { SPEEDS, VERSION } from '../data/config';
import { istSprung } from '../data/waves';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { getEnemyArt } from '../gfx/enemyart';
import { ABILITIES, ABILITY_ORDER, type AbilityId } from '../data/abilities';
import {
  TOWERS, TOWER_ORDER, MAX_LEVEL, accentFor, nextFor, sellValue,
  type TowerId,
} from '../data/towers';
import { Sfx } from '../core/audio';
import {
  buyPerk, ersterBesuch, ersterGegner, freeStars, getBest, getSettings, getStars, saveSettings,
  setPerkCost,
  totalStars,
} from '../core/storage';
import { PERKS, PERK_ORDER, type PerkId } from '../data/perks';
import { ZIELWAHL_NAMEN, ZIELWAHL_ORDNUNG, type Tower, type Zielwahl } from '../game/types';
import { getProgress } from '../core/storage';
import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from '../data/difficulty';
import { MAPS, mapById } from '../data/maps';
import { spriteCount } from '../gfx/sprites';
import { clearGame, loadGame } from '../game/save';
import { TUTORIAL, kartenEinfuehrung, type TutorialStep } from '../game/tutorial';
import { konterSatz } from '../data/konter';
import type { GameState } from '../game/state';
import { werteAmTurm, werteVorKauf, type Wertzeile } from '../game/turmwerte';
import { bilanzblatt } from './statsblatt';
import { aussaatLesen, laufAlsText } from '../game/mitschrift';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export class UI {
  /** Wird gerufen, wenn in der Turmwahl ein Turm angetippt wurde. */
  onPick: ((id: TowerId, x: number, y: number) => void) | null = null;
  /** Rechnet Weltkoordinaten in Bildschirmpunkte um - setzt `main.ts`,
   *  damit die Turmwahl an der richtigen Stelle sitzt. */
  worldToScreen: ((x: number, y: number) => { x: number; y: number }) | null = null;

  /** Was das Pausenmenue ausloest. Setzt `main.ts`. */
  onRestart: (() => void) | null = null;
  onQuit: (() => void) | null = null;

  private gold = $('v-gold');
  private lives = $('v-lives');
  private wave = $('v-wave');
  private bSound = $<HTMLButtonElement>('b-sound');
  private bSpeed = $<HTMLButtonElement>('b-speed');
  private bPause = $<HTMLButtonElement>('b-pause');
  private pauseMenu = $<HTMLElement>('pause-menu');
  /** Zeigt die Pausenkarte gerade das Bilanzblatt statt der Knoepfe?
   *
   *  Reine Anzeigefrage, deshalb hier und nicht im Spielzustand. Sie faellt
   *  in `syncBilanz` von selbst zurueck, sobald die Pause endet - ein
   *  Schalter, den jemand zuruecksetzen muss, waere die naechste Stelle zum
   *  Vergessen (Regel 6). */
  private bilanzOffen = false;
  /** Liegt der Einstellungsdialog offen? Wie `bilanzOffen` eine reine
   *  Anzeigefrage - und wie dort in der Signatur aufgezaehlt, sonst sieht
   *  `sync` die Aenderung nicht. */
  private optionenOffen = false;
  private optMenu = $<HTMLElement>('optionen-menu');
  private oVol = $<HTMLInputElement>('o-vol');
  private oVolW = $<HTMLElement>('o-vol-w');
  private oQual = $<HTMLElement>('o-qual');
  private oBew = $<HTMLElement>('o-bew');
  private pBilanz = $<HTMLButtonElement>('p-bilanz');
  private pWahl = $<HTMLElement>('p-wahl');
  private pBlatt = $<HTMLElement>('p-blatt');
  private pBlattBody = $<HTMLElement>('p-blatt-body');
  private pTitle = $<HTMLElement>('p-title');
  private letzteBilanz = '';
  /** Zeigt der Einstellungsdialog gerade die zweite Karte ("Lauf
   *  nachstellen")? Wie `bilanzOffen` eine reine Anzeigefrage - und wie dort
   *  vor dem fruehen Ausstieg abgeleitet. */
  private laufOffen = false;
  private oWahl = $<HTMLElement>('o-wahl');
  private pOpt = $<HTMLElement>('p-opt');
  private optTitle = $<HTMLElement>('o-title');
  private pLauf = $<HTMLElement>('p-lauf');
  private oLaufZurueck = $<HTMLButtonElement>('o-lauf-zurueck');
  private oSeed = $<HTMLInputElement>('o-seed');
  private oBlock = $<HTMLTextAreaElement>('o-block');
  private fehlerMenu = $<HTMLElement>('fehler-menu');
  private fBlock = $<HTMLTextAreaElement>('f-block');
  /** Aussaat fuer die naechste Partie, aus dem Einstellungsdialog. `null`
   *  heisst: wie immer, eine neue. Sie steht bewusst NICHT im Spielstand -
   *  sie ist eine Absicht fuer den naechsten Lauf, kein Zustand des
   *  laufenden. */
  wunschAussaat: number | null = null;
  private pick = $<HTMLElement>('pick');
  private pickRow = $<HTMLElement>('pick-row');
  private pickKey = '';
  private bWave = $<HTMLButtonElement>('b-wave');
  private bWeg = $<HTMLButtonElement>('b-weg');
  private vVersion = $('v-version');
  private bWaveT = $('b-wave-t');
  private bWaveB = $('b-wave-b');
  private next = $('next');
  private nList = $('n-list');
  private build = $('build');
  private skills = $('skills');
  private insp = $('inspector');
  private iName = $('i-name');
  private iStats = $('i-stats');
  private iHint = $('i-hint');
  private iUps = $('i-ups');
  private iZiel = $('i-ziel');
  /** Woraus die Knoepfe zuletzt gebaut wurden. Ohne diesen Schluessel baut
   *  der Steg sie in jedem Bild neu, und ein Tipp trifft einen Knopf, den es
   *  im naechsten Augenblick nicht mehr gibt. Dieselbe Regel wie bei der
   *  Turmwahl. */
  private zielKey = '';
  private iSell = $<HTMLButtonElement>('i-sell');
  private screen = $('screen');
  private sEyebrow = $('s-eyebrow');
  private sTitle = $('s-title');
  private sText = $('s-text');
  private sBest = $('s-best');
  private sGrades = $('s-grades');
  private sMaps = $('s-maps');
  private sPerks = $('s-perks');
  private sMode = $('s-mode');
  private vMain = $('v-main');
  private vChoose = $('v-choose');
  private vProgress = $('v-progress');
  private sChoice = $('s-choice');
  private sChoiceVal = $('s-choice-val');
  private sOpenProgress = $('s-open-progress');
  private sProgressVal = $('s-progress-val');
  private hud = $('hud');
  private dock = $('dock');
  private dockToggle = $('dock-toggle');
  private dockToggleI = $('dock-toggle-i');
  private sStats = $('s-stats');
  private sAction = $<HTMLButtonElement>('s-action');
  private sResume = $<HTMLButtonElement>('s-resume');
  private sPerf = $<HTMLButtonElement>('s-perf');
  private perfBox = $('perf');
  private sTut = $<HTMLButtonElement>('s-tut');
  private coach = $('coach');
  private coachText = $('coach-text');

  private btns = new Map<TowerId, HTMLButtonElement>();
  private skillBtns = new Map<AbilityId, HTMLButtonElement>();
  private lastSkillSig = '';
  private endlessWanted = false;
  /** Wird von main gesetzt: zurueck zur Landkarte. */
  openMenu: () => void = () => {};

  /** Ist das Menue gerade offen?
   *
   *  Das ist eine *Frage*, kein Schalter - und darin liegt der Unterschied.
   *  Zweimal hat die Turmleiste im Menue gestanden: einmal, weil niemand sie
   *  ausblendete, und einmal, weil beim ersten Laden kein Phasenwechsel
   *  stattfand und der Aufruf deshalb ausblieb. Beide Male war die Ursache
   *  dieselbe - die Sichtbarkeit hing daran, dass jemand an der richtigen
   *  Stelle eine Funktion aufruft.
   *
   *  Jetzt wird sie in jedem Bild aus dem Zustand abgeleitet. Es gibt keine
   *  Stelle mehr, an der man es vergessen kann. */
  istMenuOffen: () => boolean = () => false;
  private view: (w: 'main' | 'choose' | 'progress') => void = () => {};
  private lastScreen: 'title' | 'won' | 'lost' = 'title';
  private tutStep = -1;
  /** Welche Kette gerade laeuft.
   *
   *  Es gibt zwei: die grosse Einfuehrung ins Spiel und der eine Satz je
   *  Karte. Statt einer zweiten Maschinerie daneben laeuft beides durch
   *  dieselbe - sie unterscheiden sich nur im Inhalt, nicht im Verhalten.
   *  Zwei Wege, die dasselbe tun, driften auseinander. */
  private tutKette: TutorialStep[] = TUTORIAL;
  /** Der Konter-Satz zur naechsten Welle, solange er noch dasteht (TF-034).
   *
   *  Er laeuft NICHT durch `tutKette`, obwohl er dieselbe Blase benutzt: die
   *  Kette ist eine feste Reihenfolge mit einem Zeiger, dieser Satz ist eine
   *  Antwort auf das, was gerade angesagt wird. In die Kette gepresst waere
   *  er entweder zu frueh (beim Betreten der Karte) oder zu spaet (wenn die
   *  Kette gerade dran ist). */
  private konterStep: TutorialStep | null = null;
  private tutTarget: HTMLElement | null = null;
  private lastSig = '';
  private lastBonus = -1;

  constructor(private s: GameState) {
    for (const id of TOWER_ORDER) {
      const def = TOWERS[id];
      const b = document.createElement('button');
      b.className = 'tower-btn';
      b.id = `tb-${id}`;
      b.title = def.blurb;
      b.innerHTML =
        `<span class="n">${def.name}</span>` +
        `<span class="c">${def.base.cost} Gold</span>` +
        `<span class="r">${def.role}</span>`;
      b.addEventListener('click', () => {
        Sfx.unlock(); Sfx.play('tap');
        this.s.buildChoice = this.s.buildChoice === id ? null : id;
        this.s.selectedTower = null;
      });
      this.build.appendChild(b);
      this.btns.set(id, b);
    }

    for (const id of ABILITY_ORDER) {
      const def = ABILITIES[id];
      const b = document.createElement('button');
      b.className = 'skill-btn';
      b.id = `sk-${id}`;
      b.title = def.blurb;
      b.style.setProperty('--tone', def.color);
      b.innerHTML =
        `<span class="s-fill"></span>` +
        `<span class="s-n">${def.name}</span>` +
        `<span class="s-cd">bereit</span>`;
      b.addEventListener('click', () => {
        Sfx.unlock();
        this.s.chooseAbility(id);
      });
      this.skills.appendChild(b);
      this.skillBtns.set(id, b);
    }

    // Beim Rollen mitfuehren: unten angekommen verschwindet der Schleier
    // wieder. Ein Hinweis, der auch am Ende noch steht, waere gelogen.
    this.iStats.addEventListener('scroll', () => this.rollhinweis(), { passive: true });
    // Und wenn sich die HOEHE aendert, ohne dass jemand rollt oder neu
    // fuellt: Telefon gedreht, Fenster gezogen, Schriftgroesse gestellt.
    // Bis v144 hing der Hinweis nur am Fuellen und am Rollen - danach stand
    // er falsch, bis der Nutzer zufaellig eines von beidem tat. Gefunden
    // hat das nicht das Auge, sondern eine Gegenprobe, die nichts bewies:
    // im Spiel rollt seit v138 nichts mehr, also lief die Rollpruefung im
    // Browsertor ueber eine leere Liste. Erst als sie den Zustand selbst
    // herstellte, kam der Fehler heraus.
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.rollhinweis()).observe(this.iStats);
    }

    // Die Leiste laesst sich wegklappen. Wer den Ausschnitt studieren will,
    // bekommt den ganzen Bildschirm - der Startknopf bleibt trotzdem stehen.
    this.dockToggle.addEventListener('click', () => {
      Sfx.unlock(); Sfx.play('tap');
      const folded = this.dock.dataset.folded === '1';
      this.dock.dataset.folded = folded ? '0' : '1';
      this.dockToggleI.textContent = folded ? '▾' : '▴';
      this.dockToggle.setAttribute(
        'aria-label', folded ? 'Leiste einklappen' : 'Leiste ausklappen',
      );
    });

    // Der Titelbildschirm hat drei Ebenen statt einer Wand aus vierzehn
    // Knoepfen. Ebene eins stellt genau eine Frage: spielen oder nicht.
    const showView = (which: 'main' | 'choose' | 'progress') => {
      this.vMain.hidden = which !== 'main';
      this.vChoose.hidden = which !== 'choose';
      this.vProgress.hidden = which !== 'progress';
      if (which !== 'main') this.renderProgress();
    };
    this.view = showView;
    this.sChoice.addEventListener('click', () => { Sfx.unlock(); Sfx.play('tap'); showView('choose'); });
    this.sOpenProgress.addEventListener('click', () => {
      Sfx.unlock(); Sfx.play('tap'); showView('progress');
    });
    for (const id of ['s-back-1', 's-back-2']) {
      $(id).addEventListener('click', () => { Sfx.play('tap'); showView('main'); });
    }

    setPerkCost((id) => PERKS[id as PerkId]?.cost ?? 0);

    this.sPerks.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button');
      if (!b?.dataset.perk) return;
      Sfx.unlock();
      if (buyPerk(b.dataset.perk, PERKS[b.dataset.perk as PerkId].cost)) {
        Sfx.play('upgrade');
        this.showScreen('title');
      }
    });

    this.sMode.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button');
      if (!b?.dataset.mode) return;
      Sfx.unlock(); Sfx.play('tap');
      this.endlessWanted = b.dataset.mode === 'endless';
      this.showScreen('title');
    });

    this.sMaps.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button');
      if (!b?.dataset.map) return;
      Sfx.unlock(); Sfx.play('tap');
      saveSettings({ map: b.dataset.map });
      this.s.loadMap(b.dataset.map);
      this.showScreen('title');
    });

    // Schwierigkeitsgrad waehlbar, bevor es losgeht.
    this.sGrades.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button');
      if (!b?.dataset.grade) return;
      Sfx.unlock(); Sfx.play('tap');
      saveSettings({ difficulty: b.dataset.grade as DifficultyId });
      this.renderGrades();
      this.showScreen('title');
    });

    Sfx.setEnabled(getSettings().sound);
    // Und die Lautstaerke gleich mit. Sie beim Start zu vergessen waere der
    // haeufigste Fehler dieser Sorte: die Einstellung steht im Speicher, der
    // Regler zeigt sie an, und gehoert wird trotzdem der Standardwert.
    Sfx.setVolume(getSettings().volume);
    this.bSound.addEventListener('click', () => {
      Sfx.unlock();
      const on = !getSettings().sound;
      saveSettings({ sound: on });
      Sfx.setEnabled(on);
      if (on) Sfx.play('tap');
      this.lastSig = '';
    });
    this.bSpeed.addEventListener('click', () => {
      Sfx.unlock(); Sfx.play('tap');
      const i = SPEEDS.indexOf(this.s.speed as 1 | 2 | 3);
      this.s.speed = SPEEDS[(i + 1) % SPEEDS.length];
    });
    this.bPause.addEventListener('click', () => { this.s.paused = !this.s.paused; });
    $<HTMLButtonElement>('p-resume').addEventListener('click', () => { this.s.paused = false; });
    this.pBilanz.addEventListener('click', () => { this.bilanzOffen = true; this.letzteBilanz = ''; });
    const oeffneOptionen = () => { this.optionenOffen = true; this.sync(); };
    this.zeigeOptionen = oeffneOptionen;
    $<HTMLButtonElement>('p-optionen').addEventListener('click', oeffneOptionen);
    $<HTMLButtonElement>('o-zurueck').addEventListener('click', () => { this.optionenOffen = false; this.sync(); });
    // Tippen NEBEN die Karte schliesst den Dialog.
    //
    // Nicht nur Bequemlichkeit: ein Fenster, das nur ueber einen einzigen
    // Knopf zu verlassen ist, sperrt ein, sobald der Knopf einmal nicht
    // erreichbar ist. Das Browsertor hat es sofort gezeigt - sein blinder
    // Tastraster oeffnete den Dialog und kam nicht mehr heraus, und danach
    // meldete es "man kommt nicht ins Spiel".
    this.optMenu.addEventListener('click', (e) => {
      if (e.target !== this.optMenu) return;      // nur der Grund, nicht die Karte
      this.optionenOffen = false;
      this.sync();
    });
    this.oVol.addEventListener('input', () => {
      const v = Number(this.oVol.value) / 100;
      saveSettings({ volume: v });
      Sfx.setVolume(v);
      this.oVolW.textContent = `${Math.round(v * 100)} %`;
    });
    // T10: eine Aussaat von Hand setzen. Angenommen wird auch ein ganzer
    // Block - wer einen Lauf weitergibt, kopiert ihn im Stueck, und wer ihn
    // nachstellt, fuegt ihn im Stueck wieder ein.
    this.oSeed.addEventListener('input', () => {
      this.wunschAussaat = aussaatLesen(this.oSeed.value);
      const gueltig = this.oSeed.value.trim() === '' || this.wunschAussaat !== null;
      this.oSeed.style.borderColor = gueltig ? '' : '#D6564A';
      if (this.wunschAussaat !== null && this.oSeed.value !== String(this.wunschAussaat)) {
        this.oSeed.value = String(this.wunschAussaat);
      }
    });
    $<HTMLButtonElement>('o-seed-ab').addEventListener('click', () => {
      this.wunschAussaat = null;
      this.oSeed.value = '';
      this.oSeed.style.borderColor = '';
    });
    // T11: den laufenden Lauf als Text ausgeben.
    $<HTMLButtonElement>('o-lauf').addEventListener('click', () => {
      this.oBlock.value = laufAlsText(this.s);
      this.oBlock.hidden = false;
      this.oBlock.select();
    });
    $<HTMLButtonElement>('f-zu').addEventListener('click', () => { this.fehlerMenu.hidden = true; });
    $<HTMLButtonElement>('o-zu-lauf').addEventListener('click', () => { this.laufOffen = true; this.sync(); });
    this.oLaufZurueck.addEventListener('click', () => {
      this.laufOffen = false;
      this.oBlock.hidden = true;
      this.sync();
    });
    this.oQual.addEventListener('click', (e) => {
      const q = (e.target as HTMLElement).closest<HTMLButtonElement>('.opt-btn')?.dataset.q;
      if (!q) return;
      saveSettings({ quality: q as 'auto' | 'hoch' | 'niedrig' });
      this.sync();
    });
    this.oBew.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.opt-btn')?.dataset.b;
      if (!b) return;
      saveSettings({ bewegung: b as 'voll' | 'reduziert' });
      this.sync();
    });
    $<HTMLButtonElement>('p-zurueck').addEventListener('click', () => { this.bilanzOffen = false; });
    $<HTMLButtonElement>('p-restart').addEventListener('click', () => {
      this.s.paused = false;
      this.onRestart?.();
    });
    $<HTMLButtonElement>('p-quit').addEventListener('click', () => {
      this.s.paused = false;
      this.onQuit?.();
    });
    this.bWave.addEventListener('click', () => { Sfx.unlock(); this.s.startWave(); });
    // Den Weg noch einmal zeigen (TF-014). Kein Spielzug: er aendert nichts
    // ausser dem Bild, und er darf deshalb auch waehrend einer Welle laufen.
    this.bWeg.addEventListener('click', () => { Sfx.unlock(); this.s.wegvorschau(); });
    // Einmal setzen, nie wieder anfassen - die Version aendert sich nicht
    // waehrend einer Partie.
    this.vVersion.textContent = VERSION;
    $('i-close').addEventListener('click', () => { this.s.auswahlSchliessen(); });
    // Die Ausbauknoepfe entstehen je nach Stufe neu - auf Stufe 1 sind es
    // zwei sich ausschliessende Zweige, danach einer.
    this.iUps.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button');
      if (!b || !this.s.selectedTower) return;
      const br = b.dataset.branch;
      Sfx.unlock();
      this.s.upgrade(this.s.selectedTower, br === '0' ? 0 : br === '1' ? 1 : undefined);
      this.lastSig = '';
    });
    this.iSell.addEventListener('click', () => {
      if (this.s.selectedTower) this.s.sell(this.s.selectedTower);
    });
    this.sAction.addEventListener('click', () => {
      Sfx.unlock();
      if (this.lastScreen !== 'title') { this.openMenu(); return; }
      // **Auch dieser Weg achtet auf eine von Hand gesetzte Aussaat (T10).**
      //
      // Bis v184 stand hier `undefined`, also jedes Mal eine neue
      // Zufallsaussaat. `wunschAussaat` wurde nur in `menu.onStart`
      // beachtet - wer sie in den Einstellungen eintrug und dann auf dem
      // Titelschirm auf "Beginnen" drueckte, bekam trotzdem ein
      // Zufallsspiel, ohne dass irgendwo stand, dass seine Eingabe
      // verfallen ist. Zwei Einstiege in dieselbe Partie, und nur einer
      // hielt sich an die Angabe.
      //
      // Gefunden hat es der volle Probenlauf, aber nicht direkt: er meldete
      // eine blinde Gegenprobe. Der Rauchtest startet ueber genau diesen
      // Knopf und spielte deshalb JEDE RUNDE EIN ANDERES SPIEL - gemessen
      // Kristall 28, 48, 48, 45, 47 bei fuenf gleichen Laeufen. Alles, was
      // danach eine Zahl aus dieser Partie prueft, prueft jedes Mal etwas
      // anderes.
      //
      // Wie in `menu.onStart` gilt sie fuer GENAU DIESE Partie und wird
      // danach vergessen.
      const aussaat = this.wunschAussaat ?? undefined;
      this.wunschAussaat = null;
      this.s.reset(aussaat, getSettings().difficulty, getSettings().map,
        { endless: this.endlessWanted });
      // Die Einfuehrung laeuft nur bei einem neuen Spiel, nie beim Fortsetzen.
      this.starteEinfuehrung();
    });
    this.sPerf.addEventListener('click', () => this.togglePerf());
    this.sTut.addEventListener('click', () => {
      const on = !getSettings().tutorial;
      saveSettings({ tutorial: on });
      this.sTut.textContent = on
        ? 'Einführung beim nächsten Spiel zeigen'
        : 'Einführung ist ausgeschaltet';
    });
    $('coach-skip').addEventListener('click', () => this.endTutorial());
    this.sResume.addEventListener('click', () => {
      Sfx.unlock();
      const save = loadGame();
      // Passt der Stand nicht mehr zu den aktuellen Daten, wird er verworfen -
      // lieber ein neuer Anlauf als eine halb geladene Partie.
      if (!save || !this.s.restore(save)) { clearGame(); this.sResume.hidden = true; }
    });

    if (!getSettings().tutorial) this.sTut.textContent = 'Einführung ist ausgeschaltet';
    if (getSettings().perf) {
      this.sPerf.textContent = 'Technikanzeige ausschalten';
      this.perfBox.hidden = false;
    }
    this.showScreen('title');
  }

  showScreen(kind: 'title' | 'won' | 'lost'): void {
    const s = this.s;
    this.lastScreen = kind;
    this.screen.hidden = false;
    this.view('main');
    const shown = kind === 'title' ? getSettings().difficulty : s.difficulty;
    const shownMap = kind === 'title' ? getSettings().map : s.map.id;
    const best = getBest(shownMap, shown);
    const gradeName = DIFFICULTIES[shown].name;
    const mapName = mapById(shownMap).name;
    this.sBest.textContent = best.wave > 0
      ? `Bisher am weitesten: Welle ${best.wave}${best.lives ? `, ${best.lives} Kristall` : ''}`
      : '';

    // Karte, Grad und Fortschritt liegen hinter je einer Zeile, die zeigt,
    // was gerade eingestellt ist - das Muster kennt jeder aus den
    // Einstellungen seines Telefons.
    this.sChoice.hidden = kind !== 'title';
    this.sOpenProgress.hidden = kind !== 'title';
    if (kind === 'title') {
      this.renderProgress(); this.renderMaps(); this.renderGrades();
      this.sChoiceVal.textContent =
        `${mapName} · ${gradeName}${this.endlessWanted ? ' · Endlos' : ''}`;
      const free = freeStars();
      this.sProgressVal.textContent = free > 0
        ? `${free} Splitter frei`
        : `${totalStars()} Sterne verdient`;
    }

    const save = kind === 'title' ? loadGame() : null;
    if (save) {
      this.sResume.hidden = false;
      this.sResume.textContent =
        `Fortsetzen · ${mapById(save.map).name} · Welle ` +
        `${Math.min(save.waveIndex + 1, s.totalWaves)}, Kristall ${save.lives}`;
      this.sAction.textContent = 'Neu beginnen';
    } else {
      this.sResume.hidden = true;
    }

    if (kind === 'title') this.sStats.hidden = true; else this.renderStats();

    if (kind === 'title') {
      this.sEyebrow.textContent = VERSION;
      this.sTitle.textContent = 'Towerfront';
      // Ein Satz, nicht vier. Wer mehr wissen will, erfaehrt es beim Spielen.
      this.sText.textContent =
        'Halte die Leere vom Herzkristall fern. Baue Türme neben den Weg und überstehe fünfzehn Wellen.';
      if (!save) this.sAction.textContent = 'Beginnen';
    } else if (kind === 'won') {
      this.sEyebrow.textContent = s.stars > 0
        ? `Geschafft · ${'★'.repeat(s.stars)}${'☆'.repeat(3 - s.stars)}`
        : 'Alle Wellen überstanden';
      this.sTitle.textContent = 'Der Kristall hält';
      // Die Zahl kommt aus einer Variablen, nicht direkt aus dem Zugriff.
      //
      // `gebaute` traegt den Ersatzbuchstaben im NAMEN, und der
      // Umlautwaechter sieht im ausgelieferten Text nur "Tuerme" - er kann
      // Code in einer Zeichenkettenschablone nicht von Text unterscheiden.
      // Ihn dafuer stumpfer zu machen waere der falsche Weg: er faengt
      // genau die Sorte Fehler, die man selbst nicht sieht.
      const gebaut = s.gebaute.length;
      this.sText.textContent =
        `Fünfzehn Wellen abgewehrt auf ${gradeName}, ${s.lives} von ${s.maxLives} ` +
        `Kristallpunkten übrig, ${gebaut} Türme im Feld.`;
      this.sAction.textContent = 'Noch einmal';
    } else {
      this.sEyebrow.textContent = s.endless
        ? `${mapName} · Endlos · Welle ${s.waveNumber}`
        : `${mapName} · Welle ${s.waveNumber} von ${s.totalWaves}`;
      this.sTitle.textContent = 'Der Kristall zerbricht';
      this.sText.textContent =
        'Die Leere ist durchgekommen. Mehr Türme an den Kurven, früher ausbauen — und den Mörser gegen dichte Gruppen einsetzen.';
      this.sAction.textContent = 'Neu versuchen';
    }
  }

  hideScreen(): void { this.screen.hidden = true; }

  /** Die Bedienung ein- und ausblenden.
   *
   *  Im Menue darf nichts davon zu sehen sein. Das klingt selbstverstaendlich,
   *  war es aber nicht: das Menue wanderte in v42 auf die Leinwand, und
   *  niemand blendete die Leiste darueber aus. Die Turmknoepfe lagen quer
   *  ueber der Landkarte, und man kam nicht mehr ins Spiel.
   *
   *  Meine Bildabnahme hat das nicht gesehen, weil sie nur die Leinwand
   *  zeichnet - die Bedienung ist HTML. Deshalb wird es hier geprueft und
   *  nicht im Bild. */
  setSpielansicht(anzeigen: boolean): void {
    this.hud.hidden = !anzeigen;
    this.dock.hidden = !anzeigen;
    // Der Startknopf gehoert dazu - und fehlte hier bis v105.
    //
    // Er stand auf der Landkarte gross und tuerkis unten rechts und war
    // anklickbar: "Welle 1 starten", 148 mal 46 Punkte, an vier Rasterpunkten
    // ueber der Karte. Dritter Bruch derselben Regel, und wieder hat es kein
    // Tor gesehen - der Rauchtest laeuft in jsdom und prueft `hidden`, aber
    // dieses Feld war nie gesetzt worden. Gefunden hat es erst das
    // Browsertor, das nachsieht, was TATSAECHLICH im Bild steht.
    //
    // Die Lehre ist nicht "eine Zeile vergessen", sondern: eine Ableitung
    // schuetzt nur das, was sie auch aufzaehlt.
    this.bWave.hidden = !anzeigen;
    // Der Versionsstempel gehoert zur Spielansicht: im Menue steht er schon
    // auf dem Titelbildschirm, ein zweites Mal daneben waere doppelt. Er
    // haengt an DERSELBEN Ableitung wie alles andere (Regel 6) - anders als
    // der Wegknopf hat er keinen ausgeblendeten Elternteil, der ihn traegt.
    this.vVersion.hidden = !anzeigen;
    // Der Wegknopf braucht hier NICHTS: er sitzt in der Kopfzeile, und die
    // wird als ganze ausgeblendet - wie Ton, Tempo und Pause auch. Eine
    // eigene Zeile dafuer stand hier eine Fassung lang und war eine zweite
    // Stelle, die dasselbe sagt (Regel 15). Aufgefallen ist sie, weil ihre
    // Gegenprobe nichts bewies: `hidden = false` an einem Kind eines
    // ausgeblendeten Elternteils aendert nichts.
    if (!anzeigen) {
      this.insp.hidden = true;
      this.s.selectedTower = null;
      this.s.buildChoice = null;
    }
  }

  private renderMaps(): void {
    const cur = getSettings().map;
    const grade = getSettings().difficulty;
    this.sMaps.innerHTML = MAPS.map((m) => {
      const lanes = m.lanes.length > 1 ? `${m.lanes.length} Zuwege` : 'ein Zuweg';
      const st = getStars(m.id, grade);
      const stars = '★★★'.slice(0, st) + '☆☆☆'.slice(0, 3 - st);
      return `<button class="grade" data-map="${m.id}" data-on="${m.id === cur ? 1 : 0}">` +
        `<b>${m.name} <i class="stars">${stars}</i></b>` +
        `<span>${m.blurb}<br>${lanes}</span></button>`;
    }).join('');
  }

  /** Modus und Fortschritt. Sterne sind die Waehrung: sie entstehen aus
   *  sauberen Laeufen und werden in bleibende Vorteile getauscht. */
  private renderProgress(): void {
    this.sMode.innerHTML = [
      ['kampagne', 'Kampagne', 'Alle Wellen der Karte. Nur hier gibt es Sterne.'],
      ['endless', 'Endlos', 'Nach der letzten Welle geht es weiter, bis der Kristall faellt.'],
    ].map(([id, name, blurb]) =>
      `<button class="grade" data-mode="${id}" ` +
      `data-on="${(id === 'endless') === this.endlessWanted ? 1 : 0}">` +
      `<b>${name}</b><span>${blurb}</span></button>`).join('');

    const free = freeStars();
    const owned = getProgress().perks;
    const head = `<p class="perk-head">Splitter: <b>${free}</b> frei von ${totalStars()} verdient</p>`;
    this.sPerks.innerHTML = head + PERK_ORDER.map((id) => {
      const p = PERKS[id];
      const have = owned.includes(id);
      const can = !have && free >= p.cost;
      return `<button class="perk" data-perk="${id}" data-have="${have ? 1 : 0}"` +
        `${have || !can ? ' disabled' : ''}>` +
        `<b>${p.name}</b><span>${p.blurb}</span>` +
        `<i>${have ? 'gekauft' : `${p.cost} ★`}</i></button>`;
    }).join('');
  }

  private renderGrades(): void {
    const cur = getSettings().difficulty;
    this.sGrades.innerHTML = DIFFICULTY_ORDER.map((id) => {
      const d = DIFFICULTIES[id];
      return `<button class="grade" data-grade="${id}" data-on="${id === cur ? 1 : 0}">` +
        `<b>${d.name}</b><span>${d.blurb}</span></button>`;
    }).join('');
  }

  /** Auswertung nach der Partie. Alle Zahlen wurden waehrend des Spiels
   *  ohnehin mitgeschrieben - hier werden sie nur lesbar gemacht.
   *
   *  Das Blatt selbst entsteht in `bilanzblatt` - dieselbe Fassung, die
   *  seit v171 auch die Pausenkarte fuellt (Regel 15). */
  private renderStats(): void {
    const html = bilanzblatt(this.s);
    this.sStats.hidden = !html;
    this.sStats.innerHTML = html;
  }

  /** Welche Einfuehrung passt zu dieser Partie?
   *
   *  Die grosse hat Vorrang: wer das Spiel noch nicht kennt, braucht keinen
   *  Hinweis zur Kartenform. Sie laeuft nur einmal ueberhaupt; danach greift
   *  bei jeder neuen Karte der eine Satz.
   *
   *  `ersterBesuch` vermerkt den Besuch gleich beim Fragen - deshalb wird es
   *  auch dann gerufen, wenn die grosse Einfuehrung laeuft. Sonst kaeme der
   *  Kartensatz beim zweiten Besuch der Startkarte nach, und das waere
   *  genau verkehrt herum. */
  private starteEinfuehrung(): void {
    const erst = ersterBesuch(this.s.map.id);
    if (getSettings().tutorial) {
      this.tutKette = TUTORIAL;
      this.tutStep = 0;
      return;
    }
    if (erst) {
      this.tutKette = kartenEinfuehrung(this.s);
      this.tutStep = 0;
      return;
    }
    this.tutStep = -1;
  }

  /** Die Einfuehrung ruecht weiter, sobald der Handgriff gemacht wurde.
   *  Sie blockiert nichts und wartet auf nichts ausser auf den Spieler. */
  private updateTutorial(): void {
    if (this.s.phase !== 'playing') { this.hideCoach(); return; }

    // Der Konter-Satz geht vor. Nicht aus Wichtigkeit, sondern aus
    // Verfallsdatum: er gilt fuer die Welle, die JETZT angesagt ist, und ist
    // nach dem Start wertlos. Ein Schritt der Einfuehrung gilt weiter.
    // Auf jeder Karte trifft das den Spaeher in Welle 3 - da laeuft die
    // Einfuehrung noch.
    if (this.konterStep) {
      if (this.konterStep.done(this.s)) this.konterStep = null;
      else { this.showCoach(this.konterStep); return; }
    }
    const frisch = this.neuerKonter();
    if (frisch) { this.konterStep = frisch; this.showCoach(frisch); return; }

    if (this.tutStep < 0) { this.hideCoach(); return; }

    while (this.tutStep < this.tutKette.length && this.tutKette[this.tutStep].done(this.s)) {
      this.tutStep++;
    }
    if (this.tutStep >= this.tutKette.length) { this.endTutorial(); return; }

    const step = this.tutKette[this.tutStep];
    if (step.wait?.(this.s)) { this.hideCoach(); return; }
    this.showCoach(step);
  }

  /** Steht in der angesagten Welle eine Gegnerart, die der Spieler noch nie
   *  angesagt bekommen hat - und gibt es zu ihr etwas zu sagen? (TF-034)
   *
   *  Gefragt wird nur, solange sich noch bauen laesst. Nach dem Start waere
   *  der Rat eine Beileidsbekundung.
   *
   *  `ersterGegner` vermerkt gleich beim Fragen, deshalb wird es erst hier
   *  gerufen und nicht schon beim Zusammensuchen: eine Art, die wir nur
   *  betrachtet und nicht gezeigt haben, gilt sonst als erklaert. */
  private neuerKonter(): TutorialStep | null {
    const s = this.s;
    if (!s.canStartWave) return null;
    const w = s.nextWave;
    if (!w) return null;
    for (const g of w.groups) {
      const satz = konterSatz(g.enemy as EnemyId);
      if (!satz) continue;
      if (!ersterGegner(g.enemy)) continue;
      return {
        id: `konter:${g.enemy}`,
        text: satz,
        // Auf die Vorschau gezeigt: dort steht das Bild, um das es geht.
        target: 'next',
        done: (g2) => g2.waveActive || !g2.canStartWave,
      };
    }
    return null;
  }

  private showCoach(step: TutorialStep): void {
    if (this.coachText.dataset.step !== step.id) {
      this.coachText.dataset.step = step.id;
      this.coachText.textContent = step.text;
      this.coach.hidden = false;
      this.markTarget(step.target);
    }
    this.placeCoach(step.target);
  }

  private markTarget(target: string): void {
    if (this.tutTarget) delete this.tutTarget.dataset.coach;
    this.tutTarget = target === 'world' ? null : document.getElementById(target);
    if (this.tutTarget) this.tutTarget.dataset.coach = '1';
  }

  /** Die Blase legt sich ueber das gemeinte Element: bei der Leiste unten
   *  darueber, sonst mittig unter die Kopfzeile. */
  private lastBands = '';
  /** Meldet, ob sich die Hoehe der Baender geaendert hat - dann muss das
   *  Spielfeld neu eingepasst werden. */
  bandsChanged(): boolean {
    const sig = `${this.coach.hidden ? 0 : 1}|${this.coachText.dataset.step ?? ''}`;
    if (sig === this.lastBands) return false;
    this.lastBands = sig;
    return true;
  }

  /** Die Blase ist ein eigenes Band unter der Kopfzeile. Positioniert wird
   *  sie nicht mehr - nur das gemeinte Bedienelement pulsiert. Frueher
   *  schwebte sie frei und verdeckte je nach Schritt die Wellenvorschau. */
  private placeCoach(_target: string): void { /* nichts zu tun */ }

  private hideCoach(): void {
    if (!this.coach.hidden) this.coach.hidden = true;
    this.coachText.dataset.step = '';
    if (this.tutTarget) { delete this.tutTarget.dataset.coach; this.tutTarget = null; }
  }

  private endTutorial(): void {
    this.tutStep = -1;
    this.hideCoach();
    saveSettings({ tutorial: false });
    this.sTut.textContent = 'Einführung ist ausgeschaltet';
  }

  /** Worauf die Einfuehrung gerade auf dem Spielfeld zeigt. Der Renderer
   *  setzt daraufhin eine Markierung - im HTML liesse sie sich nicht auf eine
   *  Gitterzelle legen. */
  get coachHint(): 'build' | 'tower' | null {
    if (this.tutStep < 0 || this.coach.hidden) return null;
    const step = this.tutKette[this.tutStep];
    if (!step || step.target !== 'world') return null;
    return step.id === 'place' ? 'build' : 'tower';
  }

  togglePerf(): void {
    const on = !getSettings().perf;
    saveSettings({ perf: on });
    this.sPerf.textContent = on ? 'Technikanzeige ausschalten' : 'Technikanzeige einschalten';
    this.perfBox.hidden = !on;
  }

  /** Kleine Technikanzeige. Wird nur beschrieben, wenn sie sichtbar ist -
   *  ausgeschaltet kostet sie nichts. */
  perf(fps: number): void {
    if (!getSettings().perf) { if (!this.perfBox.hidden) this.perfBox.hidden = true; return; }
    this.perfBox.hidden = false;
    const s = this.s;
    const warn = fps < 50 ? ' warn' : '';
    // Siehe oben: der Zugriff traegt den Ersatzbuchstaben im Namen.
    const gebaut = s.gebaute.length;
    this.perfBox.innerHTML =
      `<b class="${warn.trim()}">${fps.toFixed(0)} fps</b>   Qualitaet ${s.quality}\n` +
      `Gegner ${s.enemies.length}   Türme ${gebaut}\n` +
      `Geschosse ${s.projectiles.length}   Partikel ${s.particles.length}\n` +
      `Bilder ${spriteCount()}   Aussaat ${s.seed.toString(16)}`;
  }

  /** Jeden Frame gerufen, schreibt aber nur bei echten Aenderungen ins DOM. */
  sync(): void {
    const s = this.s;
    // Jedes Bild neu abgeleitet, nicht auf Zuruf gesetzt.
    this.setSpielansicht(!this.istMenuOffen());
    // VOR dem Ausstieg unten. `sync` kehrt frueh zurueck, wenn sich die
    // Signatur nicht geaendert hat - und die Signatur beschreibt den
    // SPIELZUSTAND. Der Einstellungsdialog haengt aber an Einstellungen:
    // Lautstaerke, Effektdichte, Bewegung. Stuende er dahinter, bliebe der
    // gewaehlte Knopf ungewaehlt, bis sich zufaellig das Gold aendert.
    //
    // Vierter Fall derselben Familie nach dem Startknopf (v105), der
    // Zielwahl und dem Bilanzblatt (v171). Die beiden Auswege sind: in die
    // Signatur eintragen, oder - wie hier - davor rechnen, weil es billig
    // ist und mit dem Spielzustand nichts zu tun hat.
    this.syncOptionen();
    const sel = s.selectedTower;
    // **Der Inspektor zeigt EINS.** Turm, Turm vor dem Kauf oder Gegner -
    // und weil die Gegnerauskunft im Block vor den beiden anderen steht,
    // wuerde ein liegengebliebener Gegner den gewaehlten Turm verdecken.
    //
    // Abgeleitet und nicht an den Tippstellen gesetzt (Regel 6): wer einen
    // Turm waehlt, will keinen Gegner mehr sehen, und wer die Welle
    // startet, hat keine Vorschau mehr, aus der die Auskunft stammt.
    if (sel || s.buildChoice || !s.canStartWave) s.gegnerInfo = null;
    const sig = [
      s.gold, s.lives, s.waveNumber, s.waveActive, s.speed, s.paused,
      s.buildChoice, s.phase, getSettings().sound,
      // buildAt gehoert dazu: aendert sich nur der gewaehlte Bauplatz, muss
      // die Oberflaeche trotzdem neu zeichnen - sonst bleibt die Turmwahl
      // unsichtbar, obwohl der Zustand sie verlangt.
      s.buildAt ? `${Math.round(s.buildAt.x)}:${Math.round(s.buildAt.y)}` : '-',
      // Die Zielwahl gehoert dazu, und sie hat gefehlt.
      //
      // Der Zustand war richtig gesetzt - der Rauchtest hat gemessen, dass
      // die Tuerme anders zielen - nur die Anzeige folgte nicht: die
      // Signatur aenderte sich nicht, also schrieb `sync` nicht ins DOM, und
      // der angetippte Knopf blieb aus. Gefunden hat es das Browsertor.
      //
      // Zweiter Fall derselben Art nach dem Startknopf in v105: eine
      // Ableitung schuetzt nur, was sie aufzaehlt.
      sel ? `${sel.id}:${sel.level}:${sel.branch}:${sel.zielwahl}` : '-',
      // Dritter Fall derselben Art nach dem Startknopf (v105) und der
      // Zielwahl - und diesmal beim Schreiben sofort aufgelaufen: das
      // Bilanzblatt oeffnete sich nicht, weil `sync` vorher aussteigt.
      // Der Knopf tat, was er sollte, der Schalter stand richtig, und die
      // Anzeige folgte trotzdem nicht. Wer hier etwas anzeigt, das nicht
      // aus dem Spielzustand kommt, traegt es in diese Zeile ein.
      this.bilanzOffen ? 'b' : '-',
      this.optionenOffen ? 'o' : '-',
      // Fuenfter Fall derselben Art nach Startknopf, Zielwahl, Bilanzblatt
      // und Einstellungen: die Gegnerauskunft aendert nichts am Gold und
      // nichts an der Welle. Ohne diesen Eintrag oeffnet sie sich erst,
      // wenn zufaellig etwas anderes passiert.
      s.gegnerInfo ?? '-',
    ].join('|');

    this.updateTutorial();

    // Abklingzeiten laufen fortlaufend - eigene, gröbere Prüfung.
    // Die Zahl gewonnener Karten steht mit drin: sie aendert sich nie
    // waehrend einer Partie, aber sie aendert sich zwischen zweien - und
    // ohne sie bliebe der Frostschlag nach der ersten gewonnenen Karte
    // gesperrt, bis zufaellig eine Abklingzeit tickt.
    const skillSig = `${this.s.karten}|` + ABILITY_ORDER
      .map((id) => `${Math.ceil(this.s.abilityCd[id])}${this.s.aiming === id ? 'a' : ''}`)
      .join(',');
    if (skillSig !== this.lastSkillSig) {
      this.lastSkillSig = skillSig;
      for (const [id, b] of this.skillBtns) {
        const def = ABILITIES[id];
        const cd = this.s.abilityCd[id];
        // **Gesperrt ist ein eigener Zustand, nicht "nie bereit"** (C18).
        //
        // S2 des Abgleichs: ein gesperrtes Feld soll ein PLAN sein, kein
        // leerer Fleck. Also steht der Name weiter da - man soll wissen,
        // was einen erwartet - und darunter die Bedingung statt der
        // Abklingzeit. Ausgeblendet waere die Leiste vier Wochen lang
        // dreiviertel leer und der Fortschritt unsichtbar.
        const fehlt = this.s.fehlendeKarten(id);
        b.dataset.zu = fehlt > 0 ? '1' : '0';
        b.disabled = fehlt > 0;
        const ready = fehlt === 0 && cd <= 0;
        b.dataset.ready = ready ? '1' : '0';
        b.dataset.on = this.s.aiming === id ? '1' : '0';
        b.title = fehlt > 0 ? `${def.blurb} — noch ${fehlt} Karte${fehlt > 1 ? 'n' : ''}` : def.blurb;
        (b.querySelector('.s-cd') as HTMLElement).textContent = fehlt > 0
          // Abgeleitet, nicht je Faehigkeit geschrieben: der Satz gilt auch
          // fuer eine fuenfte, und er gilt auch bei einer vierten Karte.
          ? (fehlt === 1 ? '1 Karte' : `${fehlt} Karten`)
          : ready ? (def.kind === 'aimed' ? 'zielen' : 'bereit') : `${Math.ceil(cd)} s`;
        (b.querySelector('.s-fill') as HTMLElement).style.transform =
          `scaleY(${ready || fehlt > 0 ? 0 : cd / def.cooldown})`;
      }
    }

    // Der Frühstart-Bonus tickt eigenstaendig herunter.
    const bonus = s.earlyBonus;
    if (bonus !== this.lastBonus) {
      this.lastBonus = bonus;
      this.bWaveB.textContent = bonus > 0 ? `+${bonus} Gold für den frühen Start` : '';
    }
    if (sig === this.lastSig) return;
    this.lastSig = sig;

    this.gold.textContent = String(s.gold);
    this.lives.textContent = String(s.lives);
    this.wave.textContent = s.endless ? `${s.waveNumber} ∞` : `${s.waveNumber}/${s.totalWaves}`;
    this.bSound.textContent = getSettings().sound ? 'Ton' : 'Stumm';
    this.bSpeed.textContent = `${s.speed}×`;
    this.bPause.textContent = s.paused ? 'Weiter' : 'Pause';
    // Das Pausenmenue haengt am Pausenzustand, nicht an einem eigenen
    // Schalter - sonst gaebe es zwei Wahrheiten ueber denselben Zustand.
    this.pauseMenu.hidden = !s.paused || s.phase !== 'playing';
    this.syncBilanz(s);
    this.syncPick(s);
    this.bWave.disabled = !s.canStartWave;
    this.bWaveT.textContent = s.waveActive
      ? 'Welle läuft'
      : s.waveIndex >= s.totalWaves ? 'Geschafft' : `Welle ${s.waveNumber} starten`;

    this.renderNext();

    for (const [id, b] of this.btns) {
      b.dataset.on = s.buildChoice === id ? '1' : '0';
      b.dataset.poor = s.gold < TOWERS[id].base.cost ? '1' : '0';
    }

    // **Die Gegnerauskunft (D10) - im selben Kasten wie alles andere.**
    //
    // Ein eigener Kasten waere eine zweite Formensprache fuer dieselbe Frage
    // ("was ist das und was kann es"), und er waere die zweite Stelle, an
    // der die Rollhinweise, die Berührungsflächen und das Streifenmass
    // gepflegt werden müssten (Regel 15). Der Inspektor hat schon drei
    // Füllungen: gewählter Turm, Turm vor dem Kauf, und jetzt Gegner.
    if (s.gegnerInfo) {
      const d = ENEMIES[s.gegnerInfo];
      this.insp.hidden = false;
      this.iName.textContent = `${d.name}${d.boss ? ' · Anführer' : ''}`;
      const zeilen: [string, string][] = [
        ['Leben', String(d.hp)],
        ['Tempo', `${Math.round(d.speed)}`],
        ['Panzerung', d.armor > 0 ? String(d.armor) : '—'],
        ['Gold', String(d.bounty)],
        ['Kristall', `−${d.leak}`],
      ];
      if (d.slowResist > 0) zeilen.push(['Bremsschutz', `${Math.round(d.slowResist * 100)} %`]);
      this.iStats.innerHTML = zeilen.map(([n, w]) => row(n, w)).join('');
      this.rollhinweis();
      // Der Konter-Satz steht schon geschrieben und wird auch in der
      // Einweisung benutzt - hier wird er gelesen, nicht neu erfunden.
      const rat = konterSatz(s.gegnerInfo);
      this.iHint.hidden = !rat;
      this.iHint.textContent = rat ?? '';
      this.iSell.hidden = true;
      this.turmteileLeeren();
      return;
    }

    // Vor dem Kauf zeigen, was der Turm kann. Ohne Werte laesst sich nicht
    // planen - und Planen ist der ganze Reiz des Genres.
    if (!sel && s.buildChoice) {
      const def = TOWERS[s.buildChoice];
      this.insp.hidden = false;
      this.iName.textContent = `${def.name} · ${def.role}`;
      this.iStats.innerHTML = werteVorKauf(def).map(zeile).join('');
      this.rollhinweis();
      this.iHint.hidden = false;
      this.iHint.textContent = def.blurb;
      this.iSell.hidden = true;
      this.turmteileLeeren();
      return;
    }
    this.iHint.hidden = true;
    // Die Zielunit hat keinen Verkaufen-Knopf. Sie zu verkaufen hiesse, die
    // Partie zu verkaufen - der Riegel sitzt in `sell()`, aber ein Knopf,
    // der nichts tut, ist schlimmer als keiner.
    this.iSell.hidden = !sel || sel.def === 'core';

    if (sel) {
      const def = TOWERS[sel.def];
      this.insp.hidden = false;
      const branchName = sel.branch === null ? '' : ` · ${def.branches[sel.branch].name}`;
      this.iName.textContent = `${def.name}${branchName} · Stufe ${sel.level}`;
      this.iStats.innerHTML = werteAmTurm(def, sel.branch, sel.level, sel.kills)
        .map(zeile).join('');
      this.rollhinweis();
      this.renderUpgrades();
      this.renderZielwahl(sel);
      this.iSell.textContent = `Verkaufen · ${sellValue(def, sel.branch, sel.level)}`;
    } else {
      this.insp.hidden = true;
    }
  }
  /** Die Pausenkarte: Knoepfe oder Bilanzblatt.
   *
   *  Beides wird JEDES BILD abgeleitet, nichts wird auf Zuruf gesetzt.
   *  Endet die Pause, faellt das Blatt zu; gibt es noch keine Zahlen, ist
   *  der Knopf gar nicht erst da - ein Knopf, der ein leeres Blatt oeffnet,
   *  ist schlimmer als keiner. */
  private syncBilanz(s: GameState): void {
    if (this.pauseMenu.hidden) this.bilanzOffen = false;
    const gibtZahlen = s.stats.damage > 0;
    if (!gibtZahlen) this.bilanzOffen = false;
    this.pBilanz.hidden = !gibtZahlen;
    this.pWahl.hidden = this.bilanzOffen;
    this.pBlatt.hidden = !this.bilanzOffen;
    this.pTitle.textContent = this.bilanzOffen ? 'Bilanz' : 'Pause';
    if (this.bilanzOffen) {
      const html = bilanzblatt(s, true);
      if (html !== this.letzteBilanz) {
        this.pBlattBody.innerHTML = html;
        this.letzteBilanz = html;
      }
    }
  }

  /** Ein Absturz ist passiert - den Lauf zum Weitergeben anbieten (T11).
   *
   *  Bis v179 blieb die Leinwand bei einer Ausnahme einfach stehen. Was
   *  passiert war, wusste niemand: nicht der Spieler, der es haette melden
   *  koennen, und nicht ich, der aus "es ging nicht mehr weiter" eine
   *  Vermutung bauen musste. */
  zeigeFehler(grund: string): void {
    this.fBlock.value = `${laufAlsText(this.s, grund)}\n`;
    this.fehlerMenu.hidden = false;
  }

  /** Den Einstellungsdialog oeffnen.
   *
   *  Von der Landkarte aus fuehrt der Weg ueber die LEINWAND: das Menue
   *  meldet den Tipp auf "Einstellungen", `main.ts` reicht ihn hierher. Ein
   *  HTML-Knopf im Menue waere Spielbedienung (Regel 6), und das Browsertor
   *  hat genau das am ersten Anlauf gemeldet. */
  zeigeOptionen: () => void = () => {};

  /** Der Einstellungsdialog: Sichtbarkeit und Stand, jedes Bild abgeleitet. */
  private syncOptionen(): void {
    this.optMenu.hidden = !this.optionenOffen;
    if (!this.optionenOffen) { this.oBlock.hidden = true; this.laufOffen = false; }
    this.pOpt.hidden = !this.optionenOffen || this.laufOffen;
    this.oWahl.hidden = !this.optionenOffen || this.laufOffen;
    this.pLauf.hidden = !this.optionenOffen || !this.laufOffen;
    this.oLaufZurueck.hidden = !this.optionenOffen || !this.laufOffen;
    this.optTitle.textContent = this.laufOffen ? 'Lauf nachstellen' : 'Einstellungen';
    if (!this.optionenOffen) return;
    const st = getSettings();
    // Der Block gehoert dem Augenblick, in dem er erzeugt wurde - beim
    // Schliessen verschwindet er, damit niemand eine alte Welle weitergibt.
    const prozent = Math.round(st.volume * 100);
    if (this.oVol.value !== String(prozent)) this.oVol.value = String(prozent);
    this.oVolW.textContent = `${prozent} %`;
    for (const b of this.oQual.querySelectorAll<HTMLButtonElement>('.opt-btn')) {
      b.dataset.on = b.dataset.q === st.quality ? '1' : '0';
    }
    for (const b of this.oBew.querySelectorAll<HTMLButtonElement>('.opt-btn')) {
      b.dataset.on = b.dataset.b === st.bewegung ? '1' : '0';
    }
  }

  /** Die vier Knoepfe fuer die Ziellogik.
   *
   *  Sie stehen an EINEM Turm, nicht an der Turmsorte: zwei Bogentuerme an
   *  verschiedenen Stellen haben verschiedene Aufgaben. Der eine vorn am
   *  Eingang soll aufraeumen, der andere am Kristall den Vordersten nehmen.
   *  Genau das ist der Sinn der Einstellung - eine Sorteneinstellung waere
   *  keine Entscheidung, sondern eine zweite Balance-Schraube. */
  private renderZielwahl(sel: Tower): void {
    const schluessel = `${sel.id}|${sel.zielwahl}`;
    if (schluessel === this.zielKey) return;
    this.zielKey = schluessel;
    // Eine Spalte je Modus, aus der Liste selbst. Umgebrochen waere die
    // Reihe zwei Zeilen hoch, und der Verkaufen-Knopf faende keinen Platz
    // mehr - der Fall, der in v137 schon einmal eintrat.
    // `minmax(0, 1fr)` und nicht `1fr`: letzteres weicht dem laengsten Wort
    // aus - gemessen 37, 42, 34, 63, 50 Punkte statt fuenfmal 45. Der
    // schmalste Knopf entscheidet, ob ein Daumen trifft, also muessen sie
    // gleich breit sein.
    this.iZiel.style.gridTemplateColumns =
      `repeat(${ZIELWAHL_ORDNUNG.length}, minmax(0, 1fr))`;
    this.iZiel.innerHTML = ZIELWAHL_ORDNUNG.map((z) =>
      `<button class="ziel" data-ziel="${z}" aria-pressed="${z === sel.zielwahl}">`
      + `${ZIELWAHL_NAMEN[z]}</button>`).join('');
    for (const b of this.iZiel.querySelectorAll<HTMLButtonElement>('.ziel')) {
      b.addEventListener('click', () => {
        const t = this.s.selectedTower;
        if (!t) return;
        t.zielwahl = b.dataset.ziel as Zielwahl;
        // Das gespeicherte Ziel faellt weg, sonst behielte der Turm bis zur
        // naechsten Zielsuche das alte - und die Einstellung saehe aus, als
        // haette sie nicht gewirkt.
        t.target = null;
        t.retargetIn = 0;
        this.zielKey = '';
      });
    }
  }

  /** Die Turmwahl an der angetippten Stelle zeigen.
   *
   *  Sie haengt an `state.buildAt`, nicht an einem eigenen Schalter - dieselbe
   *  Regel wie beim Pausenmenue. Die Knoepfe werden nur neu gebaut, wenn sich
   *  Ort oder Gold aendern; sonst flackerte die Auswahl bei jedem Bild.
   *
   *  **Sichtbarkeit und Position sind getrennt.** Beim ersten Anlauf hingen
   *  sie zusammen: fehlte die Umrechnung, blieb die Wahl verborgen. Im
   *  Rauchtest ist kein Renderer angeschlossen, und die Pruefung meldete eine
   *  Wahl, die es sehr wohl geben sollte.
   */
  private syncPick(s: GameState): void {
    const at = s.buildAt;
    if (!at || s.phase !== 'playing' || s.paused) {
      this.pick.hidden = true;
      // Kein Schalter, den man vergessen kann: ohne Wahl keine Vorfuehrung.
      s.vorschau = null;
      return;
    }
    this.pick.hidden = false;

    // Die Turmzahl gehoert in den Schluessel: baut jemand nebenan, aendert
    // sich, was hier noch passt - und die Wahl muesste es zeigen. Ohne sie
    // bliebe die Beschriftung von vorhin stehen.
    const schluessel = `${Math.round(at.x)}|${Math.round(at.y)}|${s.gold}|${s.towers.length}`;
    if (schluessel !== this.pickKey) {
      this.pickKey = schluessel;
      this.pickRow.innerHTML = TOWER_ORDER.map((id) => {
        const def = TOWERS[id];
        const reicht = s.gold >= def.base.cost;
        // Zwei verschiedene Gruende, nicht einer. Bis v124 wurde nur
        // ausgegraut, was man nicht BEZAHLEN konnte - nie das, was nicht
        // PASST. Wer den Moerser waehlte, wo nur der Bogenturm hinpasst,
        // druckte ins Leere: der Knopf sah benutzbar aus, der Bau kam nie
        // zustande, und es stand nirgends warum.
        //
        // Der Platzbedarf ist die eigentliche Entscheidung beim freien Bauen
        // (er unterscheidet die Tuerme staerker als der Preis). Dann muss er
        // auch in der Wahl stehen.
        const grund = s.warumNicht(id, at.x, at.y);
        const sperre = !reicht || grund !== null;
        const marke = grund !== null
          ? `<span class="pick-nein">${grund}</span>`
          : `<span class="pick-cost">${def.base.cost}</span>`;
        return `<button class="pick-btn${grund !== null ? ' eng' : ''}" data-turm="${id}"`
          + `${sperre ? ' disabled' : ''}`
          + ` title="${grund !== null ? `Passt hier nicht: ${grund}` : def.name}">`
          + `<span class="pick-name">${def.name}</span>${marke}</button>`;
      }).join('');
      for (const b of this.pickRow.querySelectorAll<HTMLButtonElement>('.pick-btn')) {
        const id = b.dataset.turm as TowerId;
        // Solange ein Finger auf dem Knopf liegt, steht der Turm im Feld:
        // Platzbedarf, Reichweite, und welche Wegstuecke er ueberdeckt. Das
        // ist die Antwort auf "welchen Turm kann ich hierhin bauen" - der
        // Name und der Preis sind es nicht.
        //
        // Auch fuer gesperrte Knoepfe. Gerade dort: wer sehen will, WARUM der
        // Moerser hier nicht hinpasst, sieht es an seinem Platzbedarf ueber
        // dem Weg - ein Wort daneben erklaert es nicht halb so gut.
        const zeigen = (): void => {
          const ziel = s.buildAt;
          if (ziel) s.vorschau = { id, x: ziel.x, y: ziel.y };
        };
        const weg = (): void => { s.vorschau = null; };
        b.addEventListener('pointerdown', zeigen);
        b.addEventListener('pointerenter', zeigen);
        b.addEventListener('pointerleave', weg);
        b.addEventListener('pointercancel', weg);
        b.addEventListener('click', () => {
          const ziel = s.buildAt;
          s.vorschau = null;
          if (!ziel) return;
          s.buildAt = null;
          this.pickKey = '';
          this.onPick?.(id, ziel.x, ziel.y);
        });
      }
    }

    const p = this.worldToScreen?.(at.x, at.y);
    if (p) {
      // Am Rand kippen und einhalten. Eine Wahl, die halb aus dem Fenster
      // ragt, ist genau am Rand unbrauchbar - und am Rand wird gebaut.
      const b = this.pick.getBoundingClientRect();
      const halb = (b.width || 260) / 2;
      const hoehe = b.height || 70;
      const unten = p.y - hoehe - 26 < 0;
      this.pick.classList.toggle('unten', unten);
      this.pick.style.left =
        `${Math.min(Math.max(p.x, halb + 8), window.innerWidth - halb - 8)}px`;
      this.pick.style.top = `${unten ? p.y + 26 : p.y - 26}px`;
    }
  }


  /** Ausbauknöpfe und Zielwahl gehören einem Turm. Zeigt der Inspektor
   *  etwas anderes - einen Turm vor dem Kauf oder einen Gegner -, müssen
   *  sie weg, sonst stehen die Knöpfe des zuletzt gewählten Turms unter
   *  fremden Werten. `renderUpgrades` räumt nur auf, wenn es gerufen wird,
   *  und in beiden Fällen wurde es bisher nicht gerufen. */
  private turmteileLeeren(): void {
    this.iUps.innerHTML = '';
    this.iZiel.innerHTML = '';
    // Der Schlüssel muss mit, sonst hält `renderZielwahl` die Reihe für
    // schon gezeichnet und der nächste Turm bekäme gar keine.
    this.zielKey = '';
  }

  /** Auf Stufe 1 stehen zwei Zweige zur Wahl, die sich ausschliessen. Danach
   *  gibt es nur noch den einen Weg innerhalb des gewaehlten Zweiges. */
  private renderUpgrades(): void {
    const s = this.s;
    const sel = s.selectedTower;
    if (!sel) { this.iUps.innerHTML = ''; return; }
    const def = TOWERS[sel.def];

    if (sel.level >= MAX_LEVEL) {
      this.iUps.innerHTML = '<p class="ups-max">Voll ausgebaut</p>';
      return;
    }

    if (sel.branch === null) {
      this.iUps.innerHTML = def.branches.map((br, i) => {
        const l = br.levels[0];
        const poor = s.gold < l.cost;
        return `<button class="branch" data-branch="${i}" style="--tone:${br.color}"` +
          `${poor ? ' disabled' : ''}>` +
          `<span class="br-n">${br.name}</span>` +
          `<span class="br-b">${br.blurb}</span>` +
          `<span class="br-c">${l.cost} Gold</span></button>`;
      }).join('');
      return;
    }

    const nx = nextFor(def, sel.branch, sel.level);
    if (!nx) { this.iUps.innerHTML = '<p class="ups-max">Voll ausgebaut</p>'; return; }
    const poor = s.gold < nx.cost;
    this.iUps.innerHTML =
      `<button class="up" data-branch="keep" style="--tone:${accentFor(def, sel.branch)}"` +
      `${poor ? ' disabled' : ''}>Ausbauen · ${nx.cost}</button>`;
  }

  /** Was in der naechsten Welle kommt - Planung braucht Vorwissen. */
  private renderNext(): void {
    const s = this.s;
    const w = s.canStartWave ? s.nextWave : null;
    if (!w) { this.next.hidden = true; return; }
    this.next.hidden = false;
    const counts = new Map<string, number>();
    // Schild und Traeger haengen an der GRUPPE, nicht an der Gegnerart -
    // dieselbe Art kann in einer Welle mit und ohne Schild kommen. Also
    // mitgesammelt, sonst waere die Zusammenfassung nach Art eine Luege.
    const schild = new Set<string>();
    const traeger = new Set<string>();
    for (const g of w.groups) {
      counts.set(g.enemy, (counts.get(g.enemy) ?? 0) + g.count);
      if (g.shield) schild.add(g.enemy);
      if (g.traeger) traeger.add(g.enemy);
    }
    const parts: string[] = [];
    // Ein Sprung im Druck haengt an der BESCHRIFTUNG, nicht als eigener
    // Eintrag in der Reihe.
    //
    // Als Eintrag hat er den Streifen auf Welle 8 von 52 auf 108 Bildpunkte
    // getrieben - 28 % der Bildhoehe auf dem Telefon, ueber der Grenze von
    // 22 %: er schob den langen Erklaersatz in den Umbruch. An der
    // Beschriftung kostet er gar keine Breite.
    //
    // Abgeleitet aus den Wellendaten, nicht je Welle hingeschrieben: ein
    // Satz veraltet, eine Rechnung nicht.
    this.next.dataset.sprung = istSprung(s.waves, s.waveIndex) ? '1' : '0';
    for (const [id, n] of counts) {
      const d = ENEMIES[id as keyof typeof ENEMIES];
      // Flieger und Zerfaller bekommen einen Zusatz - man soll vor dem Start
      // wissen, wogegen man baut. Der NAME faellt dagegen weg (D20): auf dem
      // Telefon war die Zeile zu lang, und die Vorbilder zeigen ohnehin das
      // Bild, nicht den Namen. Kingdom Rush, Bloons und Plants vs. Zombies
      // machen es alle drei so - das Bild traegt die Erkennung, die Zahl die
      // Menge. Wer den Namen braucht, haelt drauf (title).
      // Mehrere Zeichen sind moeglich: ein Gleiter mit Schild ist beides.
      // Die erste Fassung nahm nur EINS (`? :`), und der Schildtraeger aus
      // Welle 12 hatte gar keins - er stand nur im handgeschriebenen Satz.
      const marken: string[] = [];
      if (d.flying) marken.push('Luft');
      if (d.split) marken.push('zerfällt');
      if (schild.has(id)) marken.push('Schild');
      if (traeger.has(id)) marken.push('Träger');
      const mark = marken.map((t) => ` <span class="tag">${t}</span>`).join('');
      const bild = this.gegnerSymbol(id as EnemyId, s.map.id);
      // Solange der Bildvorrat nicht geladen ist, bleibt der Farbtupfer von
      // frueher stehen. Eine Vorschau, die auf Bilder wartet, waere leer -
      // und leer ist schlechter als grob.
      const symbol = bild
        ? `<img class="next-bild" src="${bild}" alt="">`
        // Der Punkt traegt den AKZENT: `body` ist seit v168 fuer alle acht
        // dieselbe Familie, und acht gleiche graue Punkte sagen nichts.
        : `<b style="background:${d.trim}"></b>`;
      // **Ein Knopf, kein Absatz** (D10).
      //
      // Bis v194 stand der Name nur im `title` - also im Zeigerhinweis. Auf
      // dem Telefon gibt es keinen Zeiger; dort war er unerreichbar, und das
      // Telefon ist das Zielgeraet. Der `title` bleibt fuer den
      // Schreibtisch stehen, er kostet nichts.
      //
      // Ein `<button>` und kein `<i>` mit Tipplauscher: damit ist der
      // Eintrag auch mit der Tastatur erreichbar, ohne dass jemand daran
      // denken muss (v193).
      parts.push(`<button type="button" class="next-eintrag" data-gegner="${id}" `
        + `data-on="${s.gegnerInfo === id ? '1' : '0'}" `
        + `aria-pressed="${s.gegnerInfo === id}" `
        + `title="${d.name}">${symbol}${n}×${mark}</button>`);
    }
    if (w.note) parts.push(`<i class="next-note">${w.note}</i>`);
    this.nList.innerHTML = parts.join('');
    for (const b of this.nList.querySelectorAll<HTMLButtonElement>('button[data-gegner]')) {
      b.addEventListener('click', () => {
        const id = b.dataset.gegner as EnemyId;
        const auf = this.s.gegnerInfo === id;
        // Erst zumachen, dann aufmachen: sonst raeumte `auswahlSchliessen`
        // die eben gesetzte Auskunft gleich wieder weg.
        this.s.auswahlSchliessen();
        // Noch einmal auf denselben schliesst ihn wieder - sonst gaebe es
        // keinen Weg zurueck ausser einem Turmtipp.
        if (!auf) this.s.gegnerInfo = id;
      });
    }
  }

  /** Gegnerbild als Adresse, einmal je Gegner und Karte gerechnet.
   *
   *  Das gebackene Bild gehoert dem Zeichenwerk und wird jedes Bild benutzt -
   *  es in die Seite zu haengen wuerde es dort wegnehmen. Also eine Kopie als
   *  Datenadresse, und die gemerkt: `toDataURL` ueber acht Gegner in jedem
   *  Wellenwechsel waere sonst Arbeit fuer nichts.
   *
   *  Nicht gemerkt wird der leere Fall. Ist der Vorrat noch nicht geladen,
   *  soll der naechste Aufruf es erneut versuchen - sonst bliebe der
   *  Farbtupfer fuer immer stehen. */
  /** Kantenlaenge des abgelegten Symbols in Geraetepunkten: 20 Punkte
   *  Anzeige mal zwei fuer die doppelte Aufloesung des iPhone. */
  private static readonly SYMBOL = 40;

  private gegnerSymbole = new Map<string, string>();

  private gegnerSymbol(id: EnemyId, karte: string): string {
    const schluessel = `${id}|${karte}`;
    const da = this.gegnerSymbole.get(schluessel);
    if (da) return da;
    const cv = getEnemyArt(id, false, karte);
    if (!cv) return '';
    // In ANZEIGEGROESSE ablegen, nicht in Quellgroesse.
    //
    // Das gebackene Bild ist rund hundert Punkte breit; angezeigt werden
    // zwanzig. Direkt umgewandelt ergab das 34 bis 116 KB je Gegner, also
    // ueber ein halbes Megabyte Zeichenketten fuer acht Symbole - fuer
    // Bildpunkte, die nie jemand sieht. Derselbe Fehler wie in S84 und S91,
    // nur an anderer Stelle: gemessen und abgelegt wird, was ankommt.
    const klein = document.createElement('canvas');
    klein.width = UI.SYMBOL; klein.height = UI.SYMBOL;
    const g = klein.getContext('2d');
    if (!g) return '';
    g.drawImage(cv, 0, 0, UI.SYMBOL, UI.SYMBOL);
    const url = klein.toDataURL();
    this.gegnerSymbole.set(schluessel, url);
    return url;
  }

  /** Zeigt die Werteliste an, dass es weitergeht - und nur dann.
   *
   *  D24: gerollt hat sie immer schon, angezeigt hat sie es nie. Auf dem
   *  iPhone quer endet sie mitten in einer Zeile, und ein halb
   *  abgeschnittenes Wort liest sich als Fehler, nicht als Hinweis. iOS und
   *  Material markieren die Kante, aber nur solange wirklich etwas folgt -
   *  ein Schleier, der immer liegt, ist Deko und beantwortet keine Frage.
   *
   *  Bewusst EINE Stelle statt eines Schalters an jeder Schreibstelle: die
   *  Werteliste wird an zwei Orten gefuellt, und die dritte kommt bestimmt.
   *  Dieselbe Ueberlegung wie bei `istMenuOffen()` in Regel 6. */
  private rollhinweis(): void {
    const rest = this.iStats.scrollHeight - this.iStats.clientHeight - this.iStats.scrollTop;
    this.iStats.dataset.mehr = rest > 1 ? '1' : '0';
  }
}

function row(label: string, value: string | number, next?: string | number): string {
  const arrow = next !== undefined && String(next) !== String(value)
    ? ` <span style="color:#7FE7E0">→ ${next}</span>` : '';
  return `<dt>${label}</dt><dd>${value}${arrow}</dd>`;
}

/** Eine Wertzeile aus `turmwerte.ts` als HTML. Die Bedienung entscheidet ueber
 *  die Form, nicht ueber den Inhalt - welche Werte gezeigt werden, steht
 *  dort, und der Genre-Abgleich zaehlt sie genau dort ab. */
const zeile = (z: Wertzeile): string => row(z.name, z.wert, z.danach);
