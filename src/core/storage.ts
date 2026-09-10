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
  /** Seit v314 gibt es nur noch einen Grad (S-N1-05). Das Feld bleibt, damit
   *  alte Spielstaende lesbar sind - gewaehlt wird nichts mehr. */
  difficulty: 'normal';
  /** Zuletzt gewaehlte Karte. */
  map: string;
  /** Endlosmodus vorgewaehlt. */
  endless: boolean;
  /** Die Messtafel fuer D27 - anschaltbar IM SPIEL, nicht nur ueber die
   *  Adresse.
   *
   *  Sie bleibt eine Einstellung und kein Adressteil, weil sie ueber einen
   *  Neustart hinweg gelten soll: wer auf dem Telefon misst, laedt zwischen
   *  zwei Laeufen neu, und ein `#messung` in der Adresse ueberlebt das
   *  Teilen eines Links nicht. Die Raute schaltet sie weiterhin ein - dann
   *  aber ohne die Einstellung zu aendern. */
  messung: boolean;
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
  /** Die weitesten Endlosläufe je Karte, absteigend, hoechstens fuenf.
   *  Fehlt in Staenden vor v181 - deshalb optional, nicht als Bruch. */
  endlos?: Record<string, number[]>;
  /** **Sterne: Altlast seit v314** (S-N1-05).
   *
   *  Die Sternwertung ist entfallen; geschrieben wird das Feld nicht mehr.
   *  Gelesen schon: aus ihm wird beim ersten Start abgeleitet, welche Karten
   *  jemand schon gewonnen hat (siehe `fortschrittAus`). Wer das Feld
   *  entfernt, nimmt jedem bisherigen Spieler seinen Fortschritt. */
  stars?: Partial<Record<string, number>>;
  /** **Welche Karten je gewonnen wurden** (v314).
   *
   *  Vorher war das aus den Sternen gerechnet - die gab es nur fuer einen
   *  Sieg, und eine zweite Liste waere die zweite Wahrheit ueber dasselbe
   *  gewesen (Regel 15). Ohne Sterne gibt es nichts mehr zu rechnen, also
   *  steht es jetzt da. Abgeleitet wird beim Lesen alter Staende. */
  gewonnen?: string[];
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
  /** **Erfahrung aus gefahrenen Laeufen** (S-N1-04). Sie kauft Karten in den
   *  Stapel, nicht Zahlen an den Tuermen. Fehlt in Staenden vor v306 -
   *  deshalb optional, nicht als Bruch. */
  erfahrung?: number;
  /** Die dauerhaft freigeschalteten Karten. Die Grundkarten stehen NICHT
   *  darin: sie sind an ihrem Preis 0 zu erkennen, und eine Liste, die sie
   *  mitfuehrte, waere die zweite Wahrheit darueber (Regel 15). */
  stapel?: string[];
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
    messung: false,
  },
  best: {},
  progress: { perks: [], gewonnen: [], seenMaps: [] },
};

/** **Was gespeichert wurde, kommt auch zurueck** (v306).
 *
 *  Bis v305 stand im Leser eine Liste aus GENAU ZWEI Feldern, und alles
 *  andere fiel beim Lesen weg: `endlos` (die weitesten Endlosläufe, C27),
 *  `seenMaps` (der Einweisungssatz je Karte, B15) und `seenEnemies` (der
 *  Kontersatz je Gegnerart). Geschrieben wurden alle drei, gelesen keines -
 *  nachgemessen: `[17]` hinein, `[]` heraus. Damit war die Bestenliste nach
 *  jedem Neuladen leer und jeder Satz wieder neu, und keiner der
 *  dreiunddreissig Schritte sagte ein Wort.
 *
 *  Jetzt wird der gespeicherte Fortschritt UEBERNOMMEN und nur die zwei
 *  Pflichtfelder in Form gebracht. Das ist der Unterschied zwischen einer
 *  Ableitung und einer Liste (Regel 15): ein neues Feld - `erfahrung` und
 *  `stapel` aus S-N1-04 - braucht keine zweite Zeile mehr, und genau das
 *  Vergessen dieser zweiten Zeile war der Fehler.
 *
 *  **Als eigene Funktion, damit der Rauchtest sie fassen kann.** Der Store
 *  wird beim Laden des Moduls EINMAL gelesen; ein Neustart laesst sich im
 *  laufenden Prozess nicht stellen, und eine Zusage, die niemand nachfahren
 *  kann, ist keine. */
export function fortschrittAus(p: Partial<Progress> | undefined): Progress {
  // **Die gewonnenen Karten aus den alten Sternen** (v314). Einen Stern gab
  // es nur fuer einen Sieg, also ist der Schluss dicht. Steht die Liste
  // schon da, gilt sie - abgeleitet wird nur einmal, beim ersten Lesen eines
  // alten Standes.
  const ausSternen = Object.entries(p?.stars ?? {})
    .filter(([, sterne]) => (sterne ?? 0) > 0)
    .map(([schluessel]) => schluessel.split('|')[0]);
  return {
    ...(p ?? {}),
    perks: Array.isArray(p?.perks) ? [...p.perks] : [],
    gewonnen: Array.isArray(p?.gewonnen)
      ? [...p.gewonnen]
      : [...new Set(ausSternen)],
  };
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredCloneSafe(DEFAULTS);
    const p = JSON.parse(raw) as Partial<Store>;
    return {
      settings: { ...DEFAULTS.settings, ...(p.settings ?? {}) },
      best: typeof p.best === 'object' && p.best ? { ...p.best } : {},
      progress: fortschrittAus(p.progress),

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
    progress: { ...s.progress, perks: [...s.progress.perks],
      gewonnen: [...(s.progress.gewonnen ?? [])] },
  };
}

let store = read();

export const getSettings = (): Settings => store.settings;
/** Der Bestwert haengt an Karte *und* Grad - alles andere waere irrefuehrend. */
/** Der Schluessel eines Bestwerts.
 *
 *  **Der Endlosmodus hat einen eigenen** (v181). Bis dahin teilte er ihn mit
 *  der normalen Partie, und weil er ueber den Wellenplan hinausgeht, schrieb
 *  ein Endloslauf bis Welle 21 genau das in den Bestwert einer Karte mit
 *  fuenfzehn Wellen. Der Titelbildschirm behauptete danach "bisher am
 *  weitesten: Welle 20" - eine Zahl, die es dort nicht geben kann. */
const bestSchluessel = (mapId: string, difficulty: string, endlos = false): string =>
  `${mapId}|${difficulty}${endlos ? '|endlos' : ''}`;

export const getBest = (mapId: string, difficulty: string, endlos = false): Best =>
  store.best[bestSchluessel(mapId, difficulty, endlos)] ?? { wave: 0, lives: 0 };

/** Die weitesten Endlosläufe einer Karte, absteigend. Hoechstens fuenf.
 *
 *  Ein einzelner Bestwert sagt, wie weit man EINMAL kam. Eine kurze Liste
 *  sagt, wie weit man ueblicherweise kommt - und das ist die Auskunft, nach
 *  der man im Endlosmodus sucht (C27). */
export const endlosBesten = (mapId: string): number[] =>
  [...(store.progress.endlos?.[mapId] ?? [])];

export function recordEndlos(mapId: string, wave: number): void {
  if (wave <= 0) return;
  const alle = store.progress.endlos ?? (store.progress.endlos = {});
  const liste = alle[mapId] ?? (alle[mapId] = []);
  liste.push(wave);
  liste.sort((a, b) => b - a);
  liste.length = Math.min(liste.length, 5);
  write(store);
}

export function saveSettings(patch: Partial<Settings>): void {
  store.settings = { ...store.settings, ...patch };
  write(store);
}

export const getProgress = (): Progress => store.progress;

/** **Verbesserungen kosten seit v314 Erfahrung, nicht Sterne** (S-N1-05).
 *
 *  Die Sternwertung ist entfallen, und damit ihre Waehrung. Erfahrung gibt es
 *  ohnehin schon (S-N1-04) und sie kauft schon Karten - ein zweites Konto
 *  daneben waere genau der zweite Weg, den diese Story schliesst.
 *
 *  Die Pruefung steht HIER und nicht am Knopf, dieselbe Haltung wie bei
 *  `karteFreischalten`: ein Knopf, der sich auf seine eigene Sichtbarkeit
 *  verlaesst, ist eine zweite Wahrheit ueber denselben Zustand. */
export function buyPerk(id: string, kosten: number): boolean {
  if (store.progress.perks.includes(id)) return false;
  if (kosten <= 0) return false;
  if (laufErfahrung() < kosten) return false;
  store.progress.erfahrung = laufErfahrung() - kosten;
  store.progress.perks.push(id);
  write(store);
  return true;
}

// ------------------------------------------------------ Erfahrung und Stapel

/** **Was ein Lauf einbringt** (S-N1-04).
 *
 *  Der Kontostand, nicht der Ertrag eines einzelnen Laufs: `laufErfahrung`
 *  liest, `laufErfahrungGutschreiben` legt dazu. Beides an einer Stelle, weil
 *  beides dieselbe Zahl meint.
 *
 *  **Sie liegt in der Ablage und nicht im Lauf.** Ein Lauf endet - das ist
 *  gerade der Augenblick, in dem die Erfahrung entsteht -, und ein Wert, der
 *  im endenden Ding steht, ist mit ihm weg. */
export function laufErfahrung(): number {
  const e = store.progress.erfahrung;
  return typeof e === 'number' && e >= 0 ? e : 0;
}

/** Erfahrung gutschreiben und den neuen Stand zurueckgeben. Negatives wird
 *  nicht verrechnet: ein Lauf kann nichts kosten, nur nichts bringen. */
export function laufErfahrungGutschreiben(punkte: number): number {
  const neu = laufErfahrung() + Math.max(0, Math.round(punkte));
  store.progress.erfahrung = neu;
  write(store);
  return neu;
}

/** Die dauerhaft freigeschalteten Karten. */
export function freigeschalteteKarten(): string[] {
  const l = store.progress.stapel;
  return Array.isArray(l) ? [...l] : [];
}

/** Eine Karte kaufen. Gibt zurueck, ob es geklappt hat.
 *
 *  Dieselbe Haltung wie `buyPerk`: die Pruefung steht HIER und nicht am
 *  Knopf. Ein Knopf, der sich auf seine eigene Sichtbarkeit verlaesst, ist
 *  eine zweite Wahrheit ueber denselben Zustand. */
export function karteFreischalten(id: string, kosten: number): boolean {
  const frei = store.progress.stapel ?? (store.progress.stapel = []);
  if (frei.includes(id)) return false;
  if (kosten <= 0) return false;
  if (laufErfahrung() < kosten) return false;
  store.progress.erfahrung = laufErfahrung() - kosten;
  frei.push(id);
  write(store);
  return true;
}

/** Eine gewonnene Karte eintragen (C18). Doppelte zaehlen einmal. */
export function karteGewonnen(mapId: string): void {
  const liste = store.progress.gewonnen ?? (store.progress.gewonnen = []);
  if (liste.includes(mapId)) return;
  liste.push(mapId);
  write(store);
}

/** Wieviele verschiedene Karten je gewonnen wurden (C18).
 *
 *  Bis v314 aus den Sternen gerechnet. Die gibt es nicht mehr; was aus ihnen
 *  abzuleiten war, steht seit dem ersten Lesen eines alten Standes in
 *  `progress.gewonnen` (siehe `fortschrittAus`). */
export function gewonneneKarten(): number {
  return (store.progress.gewonnen ?? []).length;
}

/** Merkt sich den besten Lauf je Grad: weiter gekommen schlaegt mehr Kristall. */
export function recordRun(
  mapId: string, difficulty: string, wave: number, lives: number, endlos = false,
): void {
  const key = bestSchluessel(mapId, difficulty, endlos);
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
