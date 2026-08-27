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
  const p = KANDIDATEN.find(x => fs.existsSync(x));
  if (!p) throw new Error('Kein Chromium gefunden — das Tor kann nicht laufen.');
  return p;
}
export async function starte(opt = {}) {
  return chromium.launch({ executablePath: chromiumPfad(), ...opt });
}
