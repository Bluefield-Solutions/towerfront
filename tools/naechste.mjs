/** **Welche Story ist als naechste dran?**
 *
 *  Der Anforderungskatalog (v249) traegt 42 Stories in fester Reihenfolge,
 *  und jede eine Schliessbedingung. Dieses Werkzeug faehrt sie der Reihe nach
 *  und nennt die erste, die noch nicht erfuellt ist - mit ihrem vollen Text.
 *
 *  **Warum es das braucht.** Die Kette soll ohne den Nutzer laufen, ueber
 *  Stunden und ueber Kontextgrenzen hinweg. Wer sich merkt, wo er steht, hat
 *  nach dem ersten Neustart nichts mehr in der Hand; wer es aus dem Baum
 *  liest, hat es immer. Dasselbe Muster wie `tools/proben-stand.txt`: der
 *  Stand steht in einer Datei, nicht in einem Kopf.
 *
 *  **Und es entscheidet nicht.** Es liest die Reihenfolge, die im Katalog
 *  steht, und wertet die Bedingungen aus, die dort stehen. Wollte es klug
 *  sein - eine Story ueberspringen, weil sie gerade schwierig aussieht -,
 *  waere es eine zweite Meinung neben dem Katalog, und die Reihenfolge des
 *  Katalogs ist begruendet (Abschnitt 4: wer P2 vor P1 faehrt, justiert gegen
 *  Rauschen).
 *
 *  Aufruf:  npm run naechste          die naechste offene Story, ganz
 *           npm run naechste -- --alle   der Stand aller 42
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ausDatei, werte } from './schliessbedingung.mjs';

const DATEI = join(ROOT, 'docs/Towerfront-STORIES.md');
const text = readFileSync(DATEI, 'utf8');
const ALLE = process.argv.includes('--alle');

/** Die Stories in der Reihenfolge des Dokuments, mit ihrem ganzen Text. */
const abschnitte = [];
{
  const zeilen = text.split('\n');
  let jetzt = null;
  for (const z of zeilen) {
    const m = z.match(/^### (S-[A-Z0-9-]+) · (.+)$/);
    if (m) {
      if (jetzt) abschnitte.push(jetzt);
      jetzt = { id: m[1], titel: m[2], text: [z] };
      continue;
    }
    if (jetzt) jetzt.text.push(z);
  }
  if (jetzt) abschnitte.push(jetzt);
}

if (abschnitte.length < 10) {
  console.error(`NAECHSTE: in ${DATEI} stehen nur ${abschnitte.length} Stories.`);
  console.error('Das Lesemuster passt nicht mehr auf das Dokument - erst das');
  console.error('reparieren, sonst arbeitet die Kette an der falschen Stelle.');
  process.exit(1);
}

let offen = null;
const stand = [];
for (const a of abschnitte) {
  const b = a.text.join('\n').match(/\*\*Schliesst, wenn:\*\* `([^`]+)`/);
  if (!b) {
    console.error(`NAECHSTE: Story ${a.id} traegt keine Schliessbedingung.`);
    process.exit(1);
  }
  const bed = b[1];
  // `blick:` und `nutzer:` sind keine mechanischen Formen - sie schliessen
  // die Sache ehrlich aus. Eine Story, die daran haengt, gilt hier als
  // OFFEN und wird ausdruecklich als solche gemeldet: die Kette darf sie
  // nicht still ueberspringen, aber auch nicht endlos an ihr haengen.
  // **Die Rueckbau-Stories traegt kein Fortschritt.** Vier Stories stehen
  // unter "Nur fahren, wenn" - sie bauen zurueck, falls eine andere Abnahme
  // nach drei Schleifen nicht zu halten ist. Ihre Bedingung ist eine
  // `== 0`-Form und heute trivial erfuellt: solange `KNIE_ANFANG` nirgends
  // steht, ist es auch nicht wieder ausgebaut. Als "zu" gezaehlt behaupten
  // sie einen Fortschritt, den es nicht gibt (7 von 42 statt 3); als offen
  // gezaehlt zoegen sie die Kette in einen Rueckbau, den niemand ausgeloest
  // hat. Also stehen sie eigens da und werden nicht gewaehlt.
  if (/\*\*Nur fahren, wenn\*\*/.test(a.text.join('\n'))) {
    stand.push({ id: a.id, zustand: 'BEDINGT', bed });
    continue;
  }
  if (/^(blick|nutzer):/.test(bed)) {
    stand.push({ id: a.id, zustand: 'HANDARBEIT', bed });
    continue;
  }
  // **Eine fehlende Datei ist hier kein Fehler, sondern der Normalfall.**
  // Der Waechter im Rueckstandsverzeichnis prueft Punkte, die zugefallen
  // sein SOLLEN - dort heisst eine fehlende Datei, dass die Bedingung ins
  // Leere zeigt. Eine Story beschreibt umgekehrt Arbeit, die noch nicht
  // getan ist; ihre Zieldatei gibt es naturgemaess erst danach. Wer das
  // gleich behandelt, bricht die Kette an der ersten unangefangenen Story
  // ab - genau daran ist der erste Lauf gescheitert (S-P7-01,
  // src/data/vorzeichen.ts).
  const datei = bed.match(/^(?:text|liste) (\S+)/);
  if (datei && ausDatei(datei[1]) === null) {
    stand.push({ id: a.id, zustand: 'OFFEN', bed });
    if (!offen) offen = a;
    continue;
  }
  const e = werte(bed);
  if (e.fehler) {
    console.error(`NAECHSTE: Story ${a.id} - ${e.fehler}`);
    process.exit(1);
  }
  stand.push({ id: a.id, zustand: e.erfuellt ? 'zu' : 'OFFEN', bed });
  if (!e.erfuellt && !offen) offen = a;
}

if (ALLE) {
  const zaehl = (z) => stand.filter((s) => s.zustand === z).length;
  const zu = zaehl('zu');
  console.log(`Stories: ${stand.length} - ${zu} zu, ${zaehl('HANDARBEIT')} `
    + `Handarbeit, ${zaehl('BEDINGT')} bedingt, ${zaehl('OFFEN')} offen\n`);
  for (const s of stand) {
    console.log(`  ${s.zustand.padEnd(10)} ${s.id.padEnd(10)} ${s.bed}`);
  }
  process.exit(0);
}

if (!offen) {
  console.log('NAECHSTE: keine offene Story mehr - der Katalog ist abgearbeitet.');
  console.log('Was bleibt, steht als HANDARBEIT da (`npm run naechste -- --alle`):');
  for (const s of stand.filter((x) => x.zustand === 'HANDARBEIT')) {
    console.log(`  ${s.id}  ${s.bed}`);
  }
  process.exit(0);
}

const zu = stand.filter((s) => s.zustand === 'zu').length;
console.log(`Naechste Story: ${offen.id} (${zu} von ${stand.length} sind zu)\n`);
console.log(offen.text.join('\n').replace(/\n+$/, ''));
