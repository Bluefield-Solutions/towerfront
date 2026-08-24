import type { Browser } from 'playwright';
/** Startet Chromium ueber den ersten Weg, der traegt. Bricht ab, wenn keiner traegt. */
export function browserStarten(): Promise<Browser>;
