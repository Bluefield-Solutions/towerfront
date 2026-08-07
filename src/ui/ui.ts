import { SPEEDS, VERSION } from '../data/config';
import { ENEMIES } from '../data/enemies';
import { TOWERS, TOWER_ORDER, sellValue, type TowerId } from '../data/towers';
import { Sfx } from '../core/audio';
import { getBest, getSettings, saveSettings } from '../core/storage';
import { spriteCount } from '../gfx/sprites';
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
  private sPerf = $<HTMLButtonElement>('s-perf');
  private perfBox = $('perf');

  private btns = new Map<TowerId, HTMLButtonElement>();
  private lastSig = '';
  private lastBonus = -1;

  constructor(private s: GameState) {
    for (const id of TOWER_ORDER) {
      const def = TOWERS[id];
      const b = document.createElement('button');
      b.className = 'tower-btn';
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
    this.sAction.addEventListener('click', () => { Sfx.unlock(); this.s.reset(); });
    this.sPerf.addEventListener('click', () => this.togglePerf());

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

    if (kind === 'title') {
      this.sEyebrow.textContent = `Spiralhain · Karte 1 · ${VERSION}`;
      this.sTitle.textContent = 'Kristallwacht';
      this.sText.textContent =
        'Der Herzkristall liegt am Ende des Pfades. Baue Türme auf das Gras, halte die Leere auf, überstehe fünfzehn Wellen. Früh gestartete Wellen bringen zusätzliches Gold.';
      this.sAction.textContent = 'Beginnen';
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
      `Gebackene Bilder ${spriteCount()}`;
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
      parts.push(`<i><b style="background:${d.body}"></b>${n}× ${d.name}</i>`);
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
