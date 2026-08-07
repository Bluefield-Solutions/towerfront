import { SPEEDS } from '../data/config';
import { TOWERS, TOWER_ORDER, sellValue, type TowerId } from '../data/towers';
import type { GameState } from '../game/state';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export class UI {
  private gold = $('v-gold');
  private lives = $('v-lives');
  private wave = $('v-wave');
  private bSpeed = $<HTMLButtonElement>('b-speed');
  private bPause = $<HTMLButtonElement>('b-pause');
  private bWave = $<HTMLButtonElement>('b-wave');
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
  private sAction = $<HTMLButtonElement>('s-action');

  private btns = new Map<TowerId, HTMLButtonElement>();
  private lastSig = '';

  constructor(private s: GameState) {
    for (const id of TOWER_ORDER) {
      const def = TOWERS[id];
      const b = document.createElement('button');
      b.className = 'tower-btn';
      b.innerHTML = `<span class="n">${def.name}</span><span class="c">${def.levels[0].cost} Gold</span>`;
      b.addEventListener('click', () => {
        this.s.buildChoice = this.s.buildChoice === id ? null : id;
        this.s.selectedTower = null;
      });
      this.build.appendChild(b);
      this.btns.set(id, b);
    }

    this.bSpeed.addEventListener('click', () => {
      const i = SPEEDS.indexOf(this.s.speed as 1 | 2 | 3);
      this.s.speed = SPEEDS[(i + 1) % SPEEDS.length];
    });
    this.bPause.addEventListener('click', () => { this.s.paused = !this.s.paused; });
    this.bWave.addEventListener('click', () => this.s.startWave());
    $('i-close').addEventListener('click', () => { this.s.selectedTower = null; });
    this.iUp.addEventListener('click', () => {
      if (this.s.selectedTower) this.s.upgrade(this.s.selectedTower);
    });
    this.iSell.addEventListener('click', () => {
      if (this.s.selectedTower) this.s.sell(this.s.selectedTower);
    });
    this.sAction.addEventListener('click', () => this.s.reset());

    this.showScreen('title');
  }

  showScreen(kind: 'title' | 'won' | 'lost'): void {
    this.screen.hidden = false;
    if (kind === 'title') {
      this.sEyebrow.textContent = 'Spiralhain · Karte 1';
      this.sTitle.textContent = 'Kristallwacht';
      this.sText.textContent =
        'Der Herzkristall liegt am Ende des Pfades. Baue Türme auf das Gras, halte die Leere auf, überstehe zehn Wellen.';
      this.sAction.textContent = 'Beginnen';
    } else if (kind === 'won') {
      this.sEyebrow.textContent = 'Alle Wellen überstanden';
      this.sTitle.textContent = 'Der Kristall hält';
      this.sText.textContent = `Zehn Wellen abgewehrt, ${this.s.lives} Kristallpunkte übrig, ${this.s.gold} Gold auf der Hand.`;
      this.sAction.textContent = 'Noch einmal';
    } else {
      this.sEyebrow.textContent = `Welle ${this.s.waveNumber} von ${this.s.totalWaves}`;
      this.sTitle.textContent = 'Der Kristall zerbricht';
      this.sText.textContent = 'Die Leere ist durchgekommen. Mehr Türme an den Kurven, früher ausbauen.';
      this.sAction.textContent = 'Neu versuchen';
    }
  }

  hideScreen(): void { this.screen.hidden = true; }

  /** Wird jeden Frame gerufen, schreibt aber nur bei echten Aenderungen ins DOM. */
  sync(): void {
    const s = this.s;
    const sel = s.selectedTower;
    const sig = [
      s.gold, s.lives, s.waveNumber, s.waveActive, s.speed, s.paused,
      s.buildChoice, s.phase, sel ? `${sel.id}:${sel.level}` : '-',
    ].join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;

    this.gold.textContent = String(s.gold);
    this.lives.textContent = String(s.lives);
    this.wave.textContent = `${s.waveNumber}/${s.totalWaves}`;
    this.bSpeed.textContent = `${s.speed}×`;
    this.bPause.textContent = s.paused ? 'Weiter' : 'Pause';
    this.bWave.disabled = !s.canStartWave;
    this.bWave.textContent = s.waveActive
      ? 'Welle läuft'
      : s.waveIndex >= s.totalWaves ? 'Geschafft' : `Welle ${s.waveNumber} starten`;

    for (const [id, b] of this.btns) {
      b.dataset.on = s.buildChoice === id ? '1' : '0';
      b.dataset.poor = s.gold < TOWERS[id].levels[0].cost ? '1' : '0';
    }

    if (sel) {
      const def = TOWERS[sel.def];
      const st = s.stats(sel);
      const next = def.levels[sel.level];
      this.insp.hidden = false;
      this.iName.textContent = `${def.name} · Stufe ${sel.level}`;
      this.iStats.innerHTML = [
        row('Schaden', st.damage, next?.damage),
        row('Reichweite', Math.round(st.range), next ? Math.round(next.range) : undefined),
        row('Takt', `${st.cooldown.toFixed(2)} s`, next ? `${next.cooldown.toFixed(2)} s` : undefined),
        st.slow ? row('Bremse', `${Math.round(st.slow * 100)} %`, next?.slow ? `${Math.round(next.slow * 100)} %` : undefined) : '',
      ].join('');
      this.iUp.disabled = !next || s.gold < next.cost;
      this.iUp.textContent = next ? `Ausbauen · ${next.cost}` : 'Maximal';
      this.iSell.textContent = `Verkaufen · ${sellValue(def, sel.level)}`;
    } else {
      this.insp.hidden = true;
    }
  }
}

function row(label: string, value: string | number, next?: string | number): string {
  const arrow = next !== undefined && String(next) !== String(value)
    ? ` <span style="color:#7FE7E0">→ ${next}</span>` : '';
  return `<dt>${label}</dt><dd>${value}${arrow}</dd>`;
}
