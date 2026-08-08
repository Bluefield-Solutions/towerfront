const KEY = 'kristallwacht.v1';

export interface Settings {
  sound: boolean;
  quality: 'auto' | 'hoch' | 'niedrig';
  /** Kleine Technikanzeige: Bildrate, Objektzahlen, Qualitaetsstufe. */
  perf: boolean;
  /** Einfuehrung beim naechsten neuen Spiel zeigen. */
  tutorial: boolean;
  /** Zuletzt gewaehlter Schwierigkeitsgrad. */
  difficulty: 'ruhig' | 'normal' | 'erbarmungslos';
}

export interface Best {
  wave: number;
  lives: number;
}

/** Bestleistung je Schwierigkeitsgrad - ein einziger Bestwert waere
 *  irrefuehrend, wenn er auf "Ruhig" entstanden ist. */
type BestMap = Partial<Record<string, Best>>;

interface Store { settings: Settings; best: BestMap; }

const DEFAULTS: Store = {
  settings: { sound: true, quality: 'auto', perf: false, tutorial: true, difficulty: 'normal' },
  best: {},
};

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredCloneSafe(DEFAULTS);
    const p = JSON.parse(raw) as Partial<Store>;
    return {
      settings: { ...DEFAULTS.settings, ...(p.settings ?? {}) },
      best: typeof p.best === 'object' && p.best ? { ...p.best } : {},
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
export const getBest = (difficulty: string): Best =>
  store.best[difficulty] ?? { wave: 0, lives: 0 };

export function saveSettings(patch: Partial<Settings>): void {
  store.settings = { ...store.settings, ...patch };
  write(store);
}

/** Merkt sich den besten Lauf je Grad: weiter gekommen schlaegt mehr Kristall. */
export function recordRun(difficulty: string, wave: number, lives: number): void {
  const b = store.best[difficulty] ?? { wave: 0, lives: 0 };
  if (wave > b.wave || (wave === b.wave && lives > b.lives)) {
    store.best[difficulty] = { wave, lives };
    write(store);
  }
}
