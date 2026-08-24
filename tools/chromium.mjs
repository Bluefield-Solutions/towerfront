/** Ein Chromium fuer alle Tore - und nur eine Stelle, die weiss, wo es liegt.
 *
 *  Zwei Welten: hier liegt ein vorinstalliertes Chromium unter
 *  /opt/pw-browsers, im Ablaufplan laedt `playwright install` seine eigene
 *  Fassung. Erst der Normalweg, dann ein gesetzter Pfad, dann der
 *  vorinstallierte - und wenn alles fehlt, ein Abbruch mit Ansage. Ein Tor,
 *  das sich bei fehlendem Browser still ueberspringt, ist genau die
 *  Pruefung, die nie etwas meldet.
 *
 *  **Warum das hier steht und nicht im Tor** (Regel 15): der feste Pfad
 *  `/opt/pw-browsers/chromium` stand ein zweites Mal in `tools/streifen.ts`.
 *  Hier lief es, im Ablaufplan brach v151 genau daran ab - dort gibt es
 *  dieses Verzeichnis nicht. Die Wahl des Browsers steht deshalb nur noch
 *  einmal da; wer ein neues Tor mit Browser baut, holt sie hier. */
import { chromium } from 'playwright';

export async function browserStarten() {
  const versuche = [
    [null, 'Playwright-eigene Fassung'],
    [process.env.CHROMIUM_PFAD, 'CHROMIUM_PFAD'],
    ['/opt/pw-browsers/chromium', 'vorinstalliert'],
  ];
  const gescheitert = [];
  for (const [pfad, name] of versuche) {
    if (pfad === undefined) continue;
    try {
      return await chromium.launch(pfad ? { executablePath: pfad } : {});
    } catch (e) {
      gescheitert.push(`  ${name}: ${e.message.split('\n')[0]}`);
    }
  }
  console.error('KEIN CHROMIUM STARTBAR.\n');
  console.error(gescheitert.join('\n'));
  console.error('\nEntweder `npx playwright install chromium` laufen lassen');
  console.error('oder CHROMIUM_PFAD auf eine vorhandene Fassung setzen.');
  process.exit(1);
}
