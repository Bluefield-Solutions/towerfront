import { SPEEDS, VERSION } from '../data/config';
import { ENEMIES } from '../data/enemies';
import { ABILITIES, ABILITY_ORDER, type AbilityId } from '../data/abilities';
import {
  TOWERS, TOWER_ORDER, MAX_LEVEL, accentFor, nextFor, sellValue,
  type TowerId,
} from '../data/towers';
import { Sfx } from '../core/audio';
import {
  buyPerk, freeStars, getBest, getSettings, getStars, saveSettings, setPerkCost, totalStars,
} from '../core/storage';
import { PERKS, PERK_ORDER, type PerkId } from '../data/perks';
import { getProgress } from '../core/storage';
import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from '../data/difficulty';
import { MAPS, mapById } from '../data/maps';
import { spriteCount } from '../gfx/sprites';
import { clearGame, loadGame } from '../game/save';
import { TUTORIAL, type TutorialStep } from '../game/tutorial';
import type { GameState } from '../game/state';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export class UI {
  private gold = $('v-gold');
  private lives = $('v-lives');
  private wave = $('v-wave');
  private bSound = $<HTMLButtonElement>('b-sound');
  private bSpeed = $<HTMLButtonElement>('b-speed');
  private bPause = $<HTMLButtonElement>('b-pause');
  private bWave = $<HTMLButtonElement>('b-wave');
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
  private iActions = document.querySelector('.insp-actions') as HTMLElement;
  private iUps = $('i-ups');
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
  private view: (w: 'main' | 'choose' | 'progress') => void = () => {};
  private lastScreen: 'title' | 'won' | 'lost' = 'title';
  private tutStep = -1;
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
    this.bWave.addEventListener('click', () => { Sfx.unlock(); this.s.startWave(); });
    $('i-close').addEventListener('click', () => {
      this.s.selectedTower = null;
      this.s.buildChoice = null;
    });
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
      this.s.reset(undefined, getSettings().difficulty, getSettings().map,
        { endless: this.endlessWanted });
      // Die Einfuehrung laeuft nur bei einem neuen Spiel, nie beim Fortsetzen.
      this.tutStep = getSettings().tutorial ? 0 : -1;
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
      this.sTitle.textContent = 'Kristallwacht';
      // Ein Satz, nicht vier. Wer mehr wissen will, erfaehrt es beim Spielen.
      this.sText.textContent =
        'Halte die Leere vom Herzkristall fern. Baue Türme neben den Weg und überstehe fünfzehn Wellen.';
      if (!save) this.sAction.textContent = 'Beginnen';
    } else if (kind === 'won') {
      this.sEyebrow.textContent = s.stars > 0
        ? `Geschafft · ${'★'.repeat(s.stars)}${'☆'.repeat(3 - s.stars)}`
        : 'Alle Wellen überstanden';
      this.sTitle.textContent = 'Der Kristall hält';
      this.sText.textContent =
        `Fünfzehn Wellen abgewehrt auf ${gradeName}, ${s.lives} von ${s.maxLives} ` +
        `Kristallpunkten übrig, ${s.towers.length} Türme im Feld.`;
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
   *  ohnehin mitgeschrieben - hier werden sie nur lesbar gemacht. */
  private renderStats(): void {
    const s = this.s;
    const st = s.stats;
    if (!st.damage) { this.sStats.hidden = true; return; }
    this.sStats.hidden = false;

    const mins = Math.floor(st.duration / 60);
    const secs = Math.floor(st.duration % 60);
    const figs = [
      ['Wellen', `${s.phase === 'won' ? s.totalWaves : Math.max(0, s.waveNumber - 1)}/${s.totalWaves}`],
      ['Kristall', `${s.lives}/${s.maxLives}`],
      ['Dauer', `${mins}:${String(secs).padStart(2, '0')}`],
      ['Türme', String(st.towersBuilt)],
      ['Erledigt', String(st.kills)],
      ['Gold verbaut', String(st.goldSpent)],
    ].map(([l, v]) => `<div class="fig"><span>${l}</span><strong>${v}</strong></div>`).join('');

    // Woran der Schaden hing - die eigentlich interessante Zahl.
    const sources: [string, string, number][] = TOWER_ORDER.map(
      (id) => [TOWERS[id].name, TOWERS[id].accent, st.damageBy[id] ?? 0],
    );
    if (st.damageBy.meteor) sources.push(['Meteor', '#F08A3C', st.damageBy.meteor]);
    sources.sort((a, b) => b[2] - a[2]);
    const bars = sources
      .filter(([, , v]) => v > 0)
      .map(([name, tone, v]) => {
        const pct = Math.round((v / st.damage) * 100);
        return `<dt>${name}</dt>` +
          `<div class="track"><i style="width:${pct}%;background:${tone}"></i></div>` +
          `<dd>${pct} %</dd>`;
      }).join('');

    // Der Turm mit dem meisten Schaden - meist verrät seine Lage mehr als er selbst.
    let best = s.towers[0] ?? null;
    for (const t of s.towers) if (t.damageDone > (best?.damageDone ?? 0)) best = t;
    const bestLine = best && best.damageDone > 0
      ? `<p class="note-line">Stärkster Turm: <b>${TOWERS[best.def].name} Stufe ${best.level}</b> ` +
        `bei ${Math.round(best.x)}/${Math.round(best.y)} — ${Math.round(best.damageDone)} Schaden, ` +
        `${best.kills} erledigt.</p>`
      : '';

    const leaks = st.leaksByWave
      .map((v, i) => (v > 0 ? `Welle ${i + 1} (−${v})` : ''))
      .filter(Boolean);
    const leakLine = leaks.length
      ? `<p class="note-line">Kristall verloren in: <b>${leaks.join(', ')}</b>.</p>`
      : `<p class="note-line">Kein einziger Gegner ist durchgekommen.</p>`;

    const uses = (st.abilityUses.meteor ?? 0) + (st.abilityUses.freeze ?? 0);
    const abilityLine = `<p class="note-line">Fähigkeiten eingesetzt: <b>${uses}</b> ` +
      `(Meteor ${st.abilityUses.meteor ?? 0}, Frostschlag ${st.abilityUses.freeze ?? 0}).</p>`;

    this.sStats.innerHTML =
      `<div class="figs">${figs}</div>` +
      (bars ? `<h2>Schaden nach Quelle</h2><dl class="bars">${bars}</dl>` : '') +
      bestLine + leakLine + abilityLine;
  }

  /** Die Einfuehrung ruecht weiter, sobald der Handgriff gemacht wurde.
   *  Sie blockiert nichts und wartet auf nichts ausser auf den Spieler. */
  private updateTutorial(): void {
    if (this.tutStep < 0) return;
    if (this.s.phase !== 'playing') { this.hideCoach(); return; }

    while (this.tutStep < TUTORIAL.length && TUTORIAL[this.tutStep].done(this.s)) {
      this.tutStep++;
    }
    if (this.tutStep >= TUTORIAL.length) { this.endTutorial(); return; }

    const step = TUTORIAL[this.tutStep];
    if (step.wait?.(this.s)) { this.hideCoach(); return; }
    this.showCoach(step);
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
    const step = TUTORIAL[this.tutStep];
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
    this.perfBox.innerHTML =
      `<b class="${warn.trim()}">${fps.toFixed(0)} fps</b>   Qualitaet ${s.quality}\n` +
      `Gegner ${s.enemies.length}   Türme ${s.towers.length}\n` +
      `Geschosse ${s.projectiles.length}   Partikel ${s.particles.length}\n` +
      `Bilder ${spriteCount()}   Aussaat ${s.seed.toString(16)}`;
  }

  /** Jeden Frame gerufen, schreibt aber nur bei echten Aenderungen ins DOM. */
  sync(): void {
    const s = this.s;
    const sel = s.selectedTower;
    const sig = [
      s.gold, s.lives, s.waveNumber, s.waveActive, s.speed, s.paused,
      s.buildChoice, s.phase, getSettings().sound,
      sel ? `${sel.id}:${sel.level}:${sel.branch}` : '-',
    ].join('|');

    this.updateTutorial();

    // Abklingzeiten laufen fortlaufend - eigene, gröbere Prüfung.
    const skillSig = ABILITY_ORDER
      .map((id) => `${Math.ceil(this.s.abilityCd[id])}${this.s.aiming === id ? 'a' : ''}`)
      .join(',');
    if (skillSig !== this.lastSkillSig) {
      this.lastSkillSig = skillSig;
      for (const [id, b] of this.skillBtns) {
        const def = ABILITIES[id];
        const cd = this.s.abilityCd[id];
        const ready = cd <= 0;
        b.dataset.ready = ready ? '1' : '0';
        b.dataset.on = this.s.aiming === id ? '1' : '0';
        (b.querySelector('.s-cd') as HTMLElement).textContent =
          ready ? (def.kind === 'aimed' ? 'zielen' : 'bereit') : `${Math.ceil(cd)} s`;
        (b.querySelector('.s-fill') as HTMLElement).style.transform =
          `scaleY(${ready ? 0 : cd / def.cooldown})`;
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
    this.bWave.disabled = !s.canStartWave;
    this.bWaveT.textContent = s.waveActive
      ? 'Welle läuft'
      : s.waveIndex >= s.totalWaves ? 'Geschafft' : `Welle ${s.waveNumber} starten`;

    this.renderNext();

    for (const [id, b] of this.btns) {
      b.dataset.on = s.buildChoice === id ? '1' : '0';
      b.dataset.poor = s.gold < TOWERS[id].base.cost ? '1' : '0';
    }

    // Vor dem Kauf zeigen, was der Turm kann. Ohne Werte laesst sich nicht
    // planen - und Planen ist der ganze Reiz des Genres.
    if (!sel && s.buildChoice) {
      const def = TOWERS[s.buildChoice];
      const l1 = def.base;
      this.insp.hidden = false;
      this.iName.textContent = `${def.name} · ${def.role}`;
      this.iStats.innerHTML = [
        row('Kosten', `${l1.cost} Gold`),
        row('Schaden', l1.damage),
        row('Reichweite', Math.round(l1.range)),
        row('Takt', `${l1.cooldown.toFixed(2)} s`),
        row('Schaden/s', (l1.damage / l1.cooldown).toFixed(1)),
        l1.splash ? row('Radius', Math.round(l1.splash)) : '',
        l1.chains ? row('Sprünge', l1.chains) : '',
        l1.slow ? row('Bremse', pct(l1.slow)) : '',
        row('Luftziele', def.hitsAir ? 'ja' : 'nein'),
      ].join('');
      this.iHint.hidden = false;
      this.iHint.textContent = def.blurb;
      this.iActions.hidden = true;
      return;
    }
    this.iHint.hidden = true;
    this.iActions.hidden = false;

    if (sel) {
      const def = TOWERS[sel.def];
      const st = s.towerStats(sel);
      const nx = nextFor(def, sel.branch, sel.level);
      this.insp.hidden = false;
      const branchName = sel.branch === null ? '' : ` · ${def.branches[sel.branch].name}`;
      this.iName.textContent = `${def.name}${branchName} · Stufe ${sel.level}`;
      this.iStats.innerHTML = [
        row('Schaden', st.damage, nx?.damage),
        row('Reichweite', Math.round(st.range), nx ? Math.round(nx.range) : undefined),
        row('Takt', `${st.cooldown.toFixed(2)} s`, nx ? `${nx.cooldown.toFixed(2)} s` : undefined),
        st.splash ? row('Radius', Math.round(st.splash), nx?.splash ? Math.round(nx.splash) : undefined) : '',
        st.chains ? row('Sprünge', st.chains, nx?.chains) : '',
        st.slow ? row('Bremse', pct(st.slow), nx?.slow ? pct(nx.slow) : undefined) : '',
        def.hitsAir ? '' : row('Luftziele', 'nein'),
        st.pierce ? row('Durchschlag', st.pierce, nx?.pierce) : '',
        row('Erledigt', sel.kills),
      ].join('');
      this.renderUpgrades();
      this.iSell.textContent = `Verkaufen · ${sellValue(def, sel.branch, sel.level)}`;
    } else {
      this.insp.hidden = true;
    }
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
    for (const g of w.groups) counts.set(g.enemy, (counts.get(g.enemy) ?? 0) + g.count);
    const parts: string[] = [];
    for (const [id, n] of counts) {
      const d = ENEMIES[id as keyof typeof ENEMIES];
      // Flieger und Zerfaller bekommen einen Zusatz - man soll vor dem Start
      // wissen, wogegen man baut.
      const mark = d.flying ? ' <span class="tag">Luft</span>'
        : d.split ? ' <span class="tag">zerfällt</span>' : '';
      parts.push(`<i><b style="background:${d.body}"></b>${n}× ${d.name}${mark}</i>`);
    }
    if (w.note) parts.push(`<i class="next-note">${w.note}</i>`);
    this.nList.innerHTML = parts.join('');
  }
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

function row(label: string, value: string | number, next?: string | number): string {
  const arrow = next !== undefined && String(next) !== String(value)
    ? ` <span style="color:#7FE7E0">→ ${next}</span>` : '';
  return `<dt>${label}</dt><dd>${value}${arrow}</dd>`;
}
