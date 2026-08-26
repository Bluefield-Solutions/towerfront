// Der Schluessel hiess bis v42 'kristallwacht.v1'. Mit der Umbenennung
// beginnt der Fortschritt bei null - vertretbar, weil die Auslieferung
// ohnehin auf eine neue Adresse umzieht und die Ablage an die Adresse
// gebunden ist. Alte Staende waeren dort so oder so nicht sichtbar.
const KEY = 'towerfront.v1';

export interface Settings {
  sound: boolean;
  /** Lautstaerke 0 bis 1.
   *
   *  Getrennt von `sound`: der Schalter sagt "Ton aus", der Regler sagt "so
   *  laut". Wer den Regler auf null zieht, hat den Ton nicht abgeschaltet -
   *  er findet ihn beim naechsten Mal dort wieder, wo er ihn gelassen hat. */
  volume: number;
  quality: 'auto' | 'hoch' | 'niedrig';
  /** Weniger Bewegung auf dem Feld: kein Wetter, kein Ruckeln, weniger
   *  Partikel.
   *
   *  Nicht nur Bequemlichkeit. Ein Feld, auf dem staendig etwas fliegt,
   *  ruckelt und aufblitzt, ist fuer manche Menschen unbenutzbar - und die
   *  Voreinstellung nimmt deshalb die Systemeinstellung des Geraets
   *  (`prefers-reduced-motion`) als Ausgangspunkt, statt sie zu ignorieren. */
  bewegung: 'voll' | 'reduziert';
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
  /** Karten, deren kurze Einfuehrung schon gelaufen ist.
   *
   *  Getrennt von den Sternen, obwohl beides je Karte gilt: Sterne
   *  entstehen erst am Ende einer Partie, der Hinweis muss aber schon beim
   *  Betreten weg sein. Wer eine Karte dreimal verliert, will nicht dreimal
   *  denselben Satz lesen. */
  seenMaps?: string[];
  /** Gegnerarten, deren Konter-Satz schon einmal dastand.
   *
   *  Dauerhaft und nicht je Partie: wer den Gleiter kennt, will nicht bei
   *  jedem neuen Anlauf wieder lesen, dass der Moerser ihn nicht erreicht.
   *  Aus demselben Grund gilt es ueber Karten hinweg - der Gegner ist
   *  derselbe, gleich auf welcher Karte man ihm zuerst begegnet. */
  seenEnemies?: string[];
}

interface Store { settings: Settings; best: BestMap; progress: Progress; }

/** Was das Geraet ueber Bewegung sagt. Ohne Medienabfrage: volle Bewegung. */
function systemBewegung(): 'voll' | 'reduziert' {
  try {
    return typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduziert' : 'voll';
  } catch { return 'voll'; }
}

const DEFAULTS: Store = {
  settings: {
    sound: true, volume: 0.7, quality: 'auto',
    // Die Voreinstellung kommt vom GERAET, nicht von mir. Wer im System
    // "Bewegung reduzieren" gesetzt hat, hat die Frage laengst beantwortet -
    // ihn noch einmal zu fragen waere so, als haette man nicht zugehoert.
    bewegung: systemBewegung(),
    perf: false, tutorial: true, difficulty: 'normal', map: 'spiralhain', endless: false,
  },
  best: {},
  progress: { stars: {}, perks: [], seenMaps: [] },
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

/** War der Spieler schon einmal auf dieser Karte?
 *
 *  Beim ersten Mal wird sie gleich als besucht vermerkt und `true`
 *  zurueckgegeben. Das ist Absicht: der Aufrufer soll nicht daran denken
 *  muessen, es hinterher zu setzen - genau dort wuerde es vergessen.
 */
export function ersterBesuch(mapId: string): boolean {
  const liste = store.progress.seenMaps ?? (store.progress.seenMaps = []);
  if (liste.includes(mapId)) return false;
  liste.push(mapId);
  write(store);
  return true;
}

/** Ist diese Gegnerart dem Spieler zum ersten Mal angesagt worden? (TF-034)
 *
 *  Wie `ersterBesuch` vermerkt es gleich beim Fragen - und aus demselben
 *  Grund: wer es hinterher setzen muesste, vergisst es genau einmal, und
 *  dann steht der Satz zweimal da. */
export function ersterGegner(id: string): boolean {
  const liste = store.progress.seenEnemies ?? (store.progress.seenEnemies = []);
  if (liste.includes(id)) return false;
  liste.push(id);
  write(store);
  return true;
}

/** Alle Gegner wieder unbekannt machen - fuer die Tore und fuer den
 *  Schalter "Einfuehrung neu". Ohne diesen Weg liesse sich der Satz nach dem
 *  ersten Lauf nie wieder pruefen. */
export function gegnerVergessen(): void {
  store.progress.seenEnemies = [];
  write(store);
}
