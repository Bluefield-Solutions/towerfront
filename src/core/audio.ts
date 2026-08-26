/** Klang komplett synthetisch. Keine Audiodateien - die HTML-Datei bleibt klein
 *  und eigenstaendig. Der Kontext wird erst bei der ersten Berührung erzeugt,
 *  weil iOS Safari Audio ausserhalb einer Nutzergeste blockiert. */

type Wave = OscillatorType;

export type SfxName =
  | 'arrow' | 'mortar' | 'prism' | 'frost'
  | 'hit' | 'kill' | 'boom' | 'build' | 'upgrade' | 'sell'
  | 'wave' | 'leak' | 'win' | 'lose' | 'tap' | 'meteor' | 'freeze' | 'ready';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private budget = new Map<SfxName, number>();
  enabled = true;
  volume = 0.7;

  /** Muss aus einer echten Nutzergeste heraus gerufen werden. */
  unlock(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;

    const len = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    void ctx.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  }

  /** Lautstaerke 0 bis 1. Der Schalter bleibt, wie er ist: wer den Regler auf
   *  null zieht, hat den Ton nicht ABGESCHALTET, und wer ihn wieder
   *  aufzieht, muss ihn nicht erst wieder einschalten. */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
  }

  /** Pro Frame aufrufen: begrenzt gleichartige Klänge, damit es bei 3× Tempo
   *  nicht zu einer Geräuschwand wird. */
  frame(): void { this.budget.clear(); }

  private allow(name: SfxName, max: number): boolean {
    const n = this.budget.get(name) ?? 0;
    if (n >= max) return false;
    this.budget.set(name, n + 1);
    return true;
  }

  private tone(
    freq: number, freq2: number, dur: number,
    type: Wave, gain: number, delay = 0,
  ): void {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master || !this.enabled) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freq2 !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain: number, cutoff: number, sweepTo = cutoff): void {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master || !this.enabled || !this.noiseBuf) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(cutoff, t0);
    if (sweepTo !== cutoff) filt.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'arrow':
        if (!this.allow(name, 3)) return;
        this.tone(900, 520, 0.06, 'square', 0.05); break;
      case 'mortar':
        if (!this.allow(name, 2)) return;
        this.tone(150, 60, 0.14, 'sine', 0.22);
        this.noise(0.1, 0.1, 900, 200); break;
      case 'prism':
        if (!this.allow(name, 3)) return;
        this.tone(1500, 420, 0.09, 'sawtooth', 0.05); break;
      case 'frost':
        if (!this.allow(name, 2)) return;
        this.tone(480, 760, 0.16, 'sine', 0.05); break;
      case 'hit':
        if (!this.allow(name, 3)) return;
        this.noise(0.04, 0.06, 3200); break;
      case 'kill':
        if (!this.allow(name, 4)) return;
        this.tone(420, 180, 0.1, 'triangle', 0.08); break;
      case 'boom':
        if (!this.allow(name, 2)) return;
        this.noise(0.3, 0.28, 1800, 120);
        this.tone(110, 40, 0.28, 'sine', 0.18); break;
      case 'build':
        this.tone(520, 520, 0.07, 'triangle', 0.14);
        this.tone(780, 780, 0.09, 'triangle', 0.12, 0.07); break;
      case 'upgrade':
        this.tone(600, 600, 0.07, 'triangle', 0.13);
        this.tone(760, 760, 0.07, 'triangle', 0.13, 0.07);
        this.tone(980, 980, 0.12, 'triangle', 0.13, 0.14); break;
      case 'sell':
        this.tone(680, 680, 0.07, 'triangle', 0.11);
        this.tone(440, 440, 0.11, 'triangle', 0.11, 0.07); break;
      case 'wave':
        this.tone(330, 330, 0.13, 'sawtooth', 0.09);
        this.tone(440, 440, 0.13, 'sawtooth', 0.09, 0.12);
        this.tone(660, 660, 0.24, 'sawtooth', 0.1, 0.24); break;
      case 'leak':
        this.tone(240, 70, 0.4, 'sawtooth', 0.16);
        this.noise(0.35, 0.14, 700, 90); break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(f, f, 0.3, 'triangle', 0.13, i * 0.13)); break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) =>
          this.tone(f, f, 0.4, 'sawtooth', 0.12, i * 0.16)); break;
      case 'meteor':
        // Anflug: ein langer Abwaertsstrich, dann der Aufschlag.
        this.tone(1200, 180, 0.55, 'sawtooth', 0.09);
        this.noise(0.5, 0.3, 2400, 90);
        this.tone(90, 34, 0.5, 'sine', 0.24, 0.05); break;
      case 'freeze':
        [880, 1174, 1568].forEach((f, i) => this.tone(f, f * 1.5, 0.5, 'sine', 0.09, i * 0.05));
        this.noise(0.4, 0.08, 6000, 1200); break;
      case 'ready':
        this.tone(1320, 1320, 0.05, 'triangle', 0.06);
        this.tone(1760, 1760, 0.08, 'triangle', 0.06, 0.05); break;
      case 'tap':
        this.tone(1100, 900, 0.03, 'square', 0.04); break;
    }
  }
}

export const Sfx = new AudioEngine();
