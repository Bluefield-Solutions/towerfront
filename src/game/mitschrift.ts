/** Was ein Lauf braucht, um nachgestellt zu werden - als Text (T10, T11).
 *
 *  **Wozu.** Zwoelf Runden lang sind Fehler aus Messungen rekonstruiert
 *  worden: der Nutzer meldet, was er gesehen hat, und ich baue drumherum
 *  eine Vermutung. Mit diesem Block wird daraus ein Befund - dieselbe
 *  Aussaat, dieselbe Karte, derselbe Grad, und der Lauf verhaelt sich
 *  bitgleich (das prueft `npm run determinism` seit v90).
 *
 *  **Kurz und lesbar, nicht vollstaendig.** Der Block nennt, was einen Lauf
 *  BESTIMMT, nicht seinen ganzen Zustand: Aussaat, Karte, Grad, Endlos,
 *  erreichte Welle. Ein vollstaendiger Spielstand steht im Browserspeicher
 *  und ist ein paar Kilobyte gross - den will niemand in ein Gespraech
 *  kopieren, und gebraucht wird er nicht: aus der Aussaat entsteht derselbe
 *  Lauf noch einmal.
 *
 *  Die Fassungsnummer steht dabei, weil ein Lauf aus v170 in v178 nicht
 *  mehr derselbe sein muss - wer den Block liest, sieht sofort, ob er
 *  ueberhaupt vergleichbar ist. */
import { VERSION } from '../data/config';
import type { GameState } from './state';

/** Ein Lauf als Textblock, zum Weitergeben. */
export function laufAlsText(s: GameState, anlass = ''): string {
  const zeilen = [
    `Towerfront ${VERSION}${anlass ? ` — ${anlass}` : ''}`,
    `Aussaat   ${s.seed}`,
    `Karte     ${s.map.id}`,
    `Grad      ${s.difficulty}${s.endless ? ' (Endlos)' : ''}`,
    `Welle     ${s.waveNumber}/${s.totalWaves}`,
    `Kristall  ${s.lives}/${s.maxLives}`,
    `Gold      ${s.gold}`,
    `Türme     ${s.gebaute.map((t) => `${t.def}${t.level}`).join(' ') || '—'}`,
  ];
  return zeilen.join('\n');
}

/** Liest eine Aussaat aus einer Eingabe. `null`, wenn nichts Brauchbares
 *  drinsteht.
 *
 *  Nimmt auch einen ganzen Textblock an, nicht nur die nackte Zahl: wer
 *  einen Lauf weitergibt, kopiert den Block, und wer ihn nachstellt, fuegt
 *  denselben Block wieder ein. Ihn dabei von Hand auf die Zahl zu kuerzen
 *  waere ein Handgriff, den sich niemand merkt. */
export function aussaatLesen(text: string): number | null {
  const ausBlock = /Aussaat\s+(\d+)/i.exec(text);
  const roh = ausBlock ? ausBlock[1] : text.trim();
  if (!/^\d+$/.test(roh)) return null;
  const n = Number(roh);
  // Der Zufallsgeber rechnet mit 32 Bit ohne Vorzeichen.
  return Number.isFinite(n) && n >= 0 && n <= 0xFFFFFFFF ? n : null;
}
