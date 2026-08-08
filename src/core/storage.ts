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
  /** Zuletzt gewaehlte Karte. */
  map: string;
  /** Endlosmodus vorgewaehlt. */
  endless: boolean;
}

export interface Best {
  wave: number;
  lives: number;
}

/** Bestleistung je Schwierigkeitsgrad - ein einziger Bestwert waere
 *  irrefuehrend, wenn er auf "Ruhig" entstanden ist. */
type BestMap = Partial<Record<string, Best>>;

/** Fortschritt zwischen den Partien. */
export interface Progress {
  /** Sterne je Karte und Grad - der beste Lauf zaehlt. */
  stars: Partial<Record<string, number>>;
  /** Gekaufte dauerhafte Verbesserungen. */
  perks: string[];
}

interface Store { settings: Settings; best: BestMap; progress: Progress; }

const DEFAULTS: Store = {
  settings: { sound: true, quality: 'auto', perf: false, tutorial: true, difficulty: 'normal', map: 'spiralhain', endless: false },
  best: {},
  progress: { stars: {}, perks: [] },
};

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredCloneSafe(DEFAULTS);
    const p = JSON.parse(raw) as Partial<Store>;
    return {
      settings: { ...DEFAULTS.settings, ...(p.settings ?? {}) },
      best: typeof p.best === 'object' && p.best ? { ...p.best } : {},
      progress: {
        stars: { ...(p.progress?.stars ?? {}) },
        perks: Array.isArray(p.progress?.perks) ? [...p.progress.perks] : [],
      },
    };
  } catch {
    return structuredCloneSafe(DEFAULTS);
  }
}

function write(s: Store): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* Speicher gesperrt - egal */ }
}

function structuredCloneSafe(s: Store): Store {
  return {
    settings: { ...s.settings },
    best: { ...s.best },
    progress: { stars: { ...s.progress.stars }, perks: [...s.progress.perks] },
  };
}

let store = read();

export const getSettings = (): Settings => store.settings;
/** Der Bestwert haengt an Karte *und* Grad - alles andere waere irrefuehrend. */
export const getBest = (mapId: string, difficulty: string): Best =>
  store.best[`${mapId}|${difficulty}`] ?? { wave: 0, lives: 0 };

export function saveSettings(patch: Partial<Settings>): void {
  store.settings = { ...store.settings, ...patch };
  write(store);
}

export const getProgress = (): Progress => store.progress;

/** Alle je verdienten Sterne. */
export function totalStars(): number {
  let n = 0;
  for (const v of Object.values(store.progress.stars)) n += v ?? 0;
  return n;
}

/** Noch nicht ausgegebene Splitter. */
export function freeStars(): number {
  return totalStars() - spentStars();
}

let perkCost: (id: string) => number = () => 0;
/** Die Kostentabelle liegt in data/perks.ts - sie wird beim Start gesetzt,
 *  damit die Ablage nichts ueber Spielinhalte wissen muss. */
export function setPerkCost(fn: (id: string) => number): void { perkCost = fn; }

export function spentStars(): number {
  return store.progress.perks.reduce((a, id) => a + perkCost(id), 0);
}

export function buyPerk(id: string, cost: number): boolean {
  if (store.progress.perks.includes(id)) return false;
  if (freeStars() < cost) return false;
  store.progress.perks.push(id);
  write(store);
  return true;
}

/** Sterne eines Laufs eintragen - nur ein besseres Ergebnis zaehlt. */
export function recordStars(mapId: string, difficulty: string, stars: number): void {
  const key = `${mapId}|${difficulty}`;
  if ((store.progress.stars[key] ?? 0) >= stars) return;
  store.progress.stars[key] = stars;
  write(store);
}

export const getStars = (mapId: string, difficulty: string): number =>
  store.progress.stars[`${mapId}|${difficulty}`] ?? 0;

/** Merkt sich den besten Lauf je Grad: weiter gekommen schlaegt mehr Kristall. */
export function recordRun(
  mapId: string, difficulty: string, wave: number, lives: number,
): void {
  const key = `${mapId}|${difficulty}`;
  const b = store.best[key] ?? { wave: 0, lives: 0 };
  if (wave > b.wave || (wave === b.wave && lives > b.lives)) {
    store.best[key] = { wave, lives };
    write(store);
  }
}
