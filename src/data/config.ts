/** Zentrale Konstanten. Alles, was Balancing oder Look betrifft, gehoert hierher
 *  oder in eine data/-Datei - niemals verstreut in die Systeme. */

/** Wird auf dem Titelbildschirm angezeigt - so ist immer sichtbar,
 *  welcher Stand gerade im Browser liegt. */
export const VERSION = 'v191';

/** Das Spielfeld ist ab v36 ein Bild im Verhaeltnis 16:9, kein Kachelraster.
 *  1920 x 1080 ist die Bezugsgroesse aller Weltkoordinaten - Bilder duerfen
 *  groesser sein, sie werden darauf gezeichnet. */
export const WORLD_W = 1920;
export const WORLD_H = 1080;

/** Nur noch fuer die Hintergrundstruktur, nicht fuer das Spiel. */
export const TILE = 96;

/** Woher das Licht kommt - und damit, wohin jeder Schatten faellt.
 *
 *  Die Kartenbilder sind mit Sonne von oben links gerendert: jeder Fels, jeder
 *  Baumstumpf wirft seinen Schatten nach unten rechts. Unsere Figuren warfen
 *  ihren gerade nach unten. Bei einem einzelnen Objekt faellt das nicht auf,
 *  bei zwanzig auf einem Bild schon - es ist der Unterschied zwischen einer
 *  Szene und einer Sammlung von Ausschnitten.
 *
 *  Eine Stelle, an der es steht. Wer eine neue Sache mit Schatten zeichnet,
 *  holt sich die Richtung hier ab. */
export const LICHT = { x: 0.62, y: 0.78 };

/** Farbwelt "Towerfront": kaltes Mondmoos gegen warmen Knochenpfad.
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

/** Startwerte stehen im Schwierigkeitsgrad, siehe data/difficulty.ts. */

/** Rendering / Performance */
export const MAX_DT = 1 / 20; // Ein Frame simuliert nie mehr als 50 ms
export const SPEEDS = [1, 2, 3] as const;
