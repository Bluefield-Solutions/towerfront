// Der Browser wird NICHT heruntergeladen, sondern der vorhandene benutzt.
// Playwright erwartet eine bestimmte Bauzahl; die des Bildes weicht ab.
// Ein Tor, das sich beim Fehlen des Werkzeugs still ueberspringt, ist
// schlimmer als keines - deshalb bricht das hier ab statt gruen zu melden.
import fs from 'node:fs';
import { chromium } from 'playwright';

const KANDIDATEN = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
];
export function chromiumPfad() {
  return KANDIDATEN.find(x => fs.existsSync(x)) || null;
}
export async function starte(opt = {}) {
  // Hier im Bild liegt ein fertiger Chromium an bekannter Stelle, dessen
  // Bauzahl aber nicht die ist, die Playwright erwartet - deshalb der
  // ausdrueckliche Pfad. Auf dem Runner gibt es ihn nicht; dort loest
  // Playwright selbst auf (`npx playwright install chromium` im Ablauf).
  //
  // Was NICHT passiert: sich still ueberspringen. Findet weder das eine
  // noch das andere einen Browser, bricht das Tor ab. Ein Tor, das bei
  // fehlendem Werkzeug gruen meldet, ist schlimmer als keines.
  const pfad = chromiumPfad();
  try {
    return await chromium.launch(pfad ? { executablePath: pfad, ...opt } : opt);
  } catch (e) {
    throw new Error('Kein Chromium gefunden — das Tor kann nicht laufen. '
      + `Auf einem Runner hilft \`npx playwright install --with-deps chromium\`. (${e.message})`);
  }
}
