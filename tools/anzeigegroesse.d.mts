/** Typen fuer die Anzeigegroessen-Rechnung. Sie ist bewusst .mjs: sie liest
 *  JSON und laedt Spielmodule dynamisch, und beides ist in TypeScript ein
 *  Kampf ohne Gewinn. Hier steht nur, was die Werkzeuge RUFEN. */
export const ANZEIGE_MASSSTAB: number;
export const TURM_WELT: number;
export function anzeigePunkte(weltbreite: number): number;
export function bildTafel(): Map<string, { gruppe: string; name: string }>;
export function anzeigeBreiteFuer(
  datei: string, tafel?: Map<string, { gruppe: string; name: string }>,
): Promise<number | null>;
