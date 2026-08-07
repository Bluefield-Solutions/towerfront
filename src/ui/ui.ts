import { SPEEDS, VERSION } from '../data/config';
import { ENEMIES } from '../data/enemies';
import { ABILITIES, ABILITY_ORDER, type AbilityId } from '../data/abilities';
import { TOWERS, TOWER_ORDER, sellValue, type TowerId } from '../data/towers';
import { Sfx } from '../core/audio';
import { getBest, getSettings, saveSettings } from '../core/storage';
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
  private iUp = $<HTMLButtonElement>('i-up');
  private iSell = $<HTMLButtonElement>('i-sell');
  private screen = $('screen');
  private sEyebrow = $('s-eyebrow');
  private sTitle = $('s-title');
  private sText = $('s-text');
  private sBest = $('s-best');
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
        `<span class="c">${def.levels[0].cost} Gold</span>` +
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
    $('i-close').addEventListener('click', () => { this.s.selectedTower = null; });
    this.iUp.addEventListener('click', () => {
      if (this.s.selectedTower) this.s.upgrade(this.s.selectedTower);
    });
    this.iSell.addEventListener('click', () => {
      if (this.s.selectedTower) this.s.sell(this.s.selectedTower);
    });
    this.sAction.addEventListener('click', () => {
      Sfx.unlock();
      this.s.reset();
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
    this.screen.hidden = false;
    const best = getBest();
    this.sBest.textContent = best.wave > 0
      ? `Bester Lauf: Welle ${best.wave}${best.lives ? `, Kristall ${best.lives}` : ''}`
      : '';

    const save = kind === 'title' ? loadGame() : null;
    if (save) {
      this.sResume.hidden = false;
      this.sResume.textContent =
        `Partie fortsetzen · Welle ${Math.min(save.waveIndex + 1, s.totalWaves)}, Kristall ${save.lives}`;
      this.sAction.textContent = 'Neu beginnen';
    } else {
      this.sResume.hidden = true;
    }

    if (kind === 'title') {
      this.sEyebrow.textContent = `Spiralhain · Karte 1 · ${VERSION}`;
      this.sTitle.textContent = 'Kristallwacht';
      this.sText.textContent =
        'Der Herzkristall liegt am Ende des Pfades. Baue Türme auf das Gras, halte die Leere auf, überstehe fünfzehn Wellen. Früh gestartete Wellen bringen zusätzliches Gold.';
      if (!save) this.sAction.textContent = 'Beginnen';
    } else if (kind === 'won') {
      this.sEyebrow.textContent = 'Alle Wellen überstanden';
      this.sTitle.textContent = 'Der Kristall hält';
      this.sText.textContent =
        `Fünfzehn Wellen abgewehrt, ${s.lives} von 20 Kristallpunkten übrig, ${s.towers.length} Türme im Feld.`;
      this.sAction.textContent = 'Noch einmal';
    } else {
      this.sEyebrow.textContent = `Welle ${s.waveNumber} von ${s.totalWaves}`;
      this.sTitle.textContent = 'Der Kristall zerbricht';
      this.sText.textContent =
        'Die Leere ist durchgekommen. Mehr Türme an den Kurven, früher ausbauen — und den Mörser gegen dichte Gruppen einsetzen.';
      this.sAction.textContent = 'Neu versuchen';
    }
  }

  hideScreen(): void { this.screen.hidden = true; }

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
  private placeCoach(target: string): void {
    const el = target === 'world' ? null : document.getElementById(target);
    const w = this.coach.offsetWidth || 280;
    if (!el) {
      this.coach.style.left = `${Math.max(12, (window.innerWidth - w) / 2)}px`;
      this.coach.style.top = '64px';
      this.coach.style.bottom = 'auto';
      return;
    }
    const r = el.getBoundingClientRect();
    const left = Math.min(
      Math.max(12, r.left + r.width / 2 - w / 2),
      Math.max(12, window.innerWidth - w - 12),
    );
    this.coach.style.left = `${left}px`;
    if (r.top > window.innerHeight / 2) {
      this.coach.style.bottom = `${window.innerHeight - r.top + 10}px`;
      this.coach.style.top = 'auto';
    } else {
      this.coach.style.top = `${r.bottom + 10}px`;
      this.coach.style.bottom = 'auto';
    }
  }

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
      `Gegner ${s.enemies.length}   Tuerme ${s.towers.length}\n` +
      `Geschosse ${s.projectiles.length}   Partikel ${s.particles.length}\n` +
      `Gebackene Bilder ${spriteCount()}   Aussaat ${s.seed.toString(16)}`;
  }

  /** Jeden Frame gerufen, schreibt aber nur bei echten Aenderungen ins DOM. */
  sync(): void {
    const s = this.s;
    const sel = s.selectedTower;
    const sig = [
      s.gold, s.lives, s.waveNumber, s.waveActive, s.speed, s.paused,
      s.buildChoice, s.phase, getSettings().sound,
      sel ? `${sel.id}:${sel.level}` : '-',
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
    this.wave.textContent = `${s.waveNumber}/${s.totalWaves}`;
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
      b.dataset.poor = s.gold < TOWERS[id].levels[0].cost ? '1' : '0';
    }

    if (sel) {
      const def = TOWERS[sel.def];
      const st = s.stats(sel);
      const nx = def.levels[sel.level];
      this.insp.hidden = false;
      this.iName.textContent = `${def.name} · Stufe ${sel.level}`;
      this.iStats.innerHTML = [
        row('Schaden', st.damage, nx?.damage),
        row('Reichweite', Math.round(st.range), nx ? Math.round(nx.range) : undefined),
        row('Takt', `${st.cooldown.toFixed(2)} s`, nx ? `${nx.cooldown.toFixed(2)} s` : undefined),
        st.splash ? row('Radius', Math.round(st.splash), nx?.splash ? Math.round(nx.splash) : undefined) : '',
        st.chains ? row('Sprünge', st.chains, nx?.chains) : '',
        st.slow ? row('Bremse', pct(st.slow), nx?.slow ? pct(nx.slow) : undefined) : '',
        def.hitsAir ? '' : row('Luftziele', 'nein'),
        row('Erledigt', sel.kills),
      ].join('');
      this.iUp.disabled = !nx || s.gold < nx.cost;
      this.iUp.textContent = nx ? `Ausbauen · ${nx.cost}` : 'Maximal';
      this.iSell.textContent = `Verkaufen · ${sellValue(def, sel.level)}`;
    } else {
      this.insp.hidden = true;
    }
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
