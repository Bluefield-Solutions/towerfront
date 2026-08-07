const KEY = 'kristallwacht.v1';

export interface Settings {
  sound: boolean;
  quality: 'auto' | 'hoch' | 'niedrig';
  /** Kleine Technikanzeige: Bildrate, Objektzahlen, Qualitaetsstufe. */
  perf: boolean;
  /** Einfuehrung beim naechsten neuen Spiel zeigen. */
  tutorial: boolean;
}

export interface Best {
  wave: number;
  lives: number;
}

interface Store { settings: Settings; best: Best; }

const DEFAULTS: Store = {
  settings: { sound: true, quality: 'auto', perf: false, tutorial: true },
  best: { wave: 0, lives: 0 },
};

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredCloneSafe(DEFAULTS);
    const p = JSON.parse(raw) as Partial<Store>;
    return {
      settings: { ...DEFAULTS.settings, ...(p.settings ?? {}) },
      best: { ...DEFAULTS.best, ...(p.best ?? {}) },
    };
  } catch {
    return structuredCloneSafe(DEFAULTS);
  }
}

function write(s: Store): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* Speicher gesperrt - egal */ }
}

function structuredCloneSafe(s: Store): Store {
  return { settings: { ...s.settings }, best: { ...s.best } };
}

let store = read();

export const getSettings = (): Settings => store.settings;
export const getBest = (): Best => store.best;

export function saveSettings(patch: Partial<Settings>): void {
  store.settings = { ...store.settings, ...patch };
  write(store);
}

/** Merkt sich den besten Lauf: weiter gekommen schlaegt mehr Kristall. */
export function recordRun(wave: number, lives: number): void {
  const b = store.best;
  if (wave > b.wave || (wave === b.wave && lives > b.lives)) {
    store.best = { wave, lives };
    write(store);
  }
}
