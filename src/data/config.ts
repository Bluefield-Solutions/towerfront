/** Zentrale Konstanten. Alles, was Balancing oder Look betrifft, gehoert hierher
 *  oder in eine data/-Datei - niemals verstreut in die Systeme. */

export const TILE = 80;
export const COLS = 20;
export const ROWS = 11;
export const WORLD_W = COLS * TILE; // 1600
export const WORLD_H = ROWS * TILE; // 880

/** Farbwelt "Kristallwacht": kaltes Mondmoos gegen warmen Knochenpfad.
 *  Hoher Kontrast, damit der Pfad auf dem Handy sofort lesbar ist. */
export const C = {
  voidDeep: '#080B18',
  voidMid: '#0F1630',
  terrain: '#173D3A',
  terrainHi: '#215A50',
  terrainLo: '#102B2B',
  path: '#C9A86A',
  pathEdge: '#9C7F49',
  crystal: '#7FE7E0',
  crystalDeep: '#2C8F92',
  gold: '#F2C14E',
  danger: '#E2566A',
  voidling: '#8B5CF6',
  voidlingDark: '#4C2C8F',
  stone: '#D8DCE8',
  stoneDark: '#7C8399',
  ink: '#05070F',
} as const;

/** Spielstart */
export const START_GOLD = 140;
export const START_LIVES = 20;

/** Rendering / Performance */
export const MAX_DT = 1 / 20; // Ein Frame simuliert nie mehr als 50 ms
export const SPEEDS = [1, 2, 3] as const;
