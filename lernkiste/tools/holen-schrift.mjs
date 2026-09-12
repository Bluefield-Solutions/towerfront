// Die Schriften EINMAL holen und in den Baum legen.
//
// Warum nicht von Google laden: (1) Eine Kinder-App soll beim Start nicht
// bei einem Dritten anklopfen. (2) Ohne Netz gaebe es keine Schrift, und
// eine App auf dem Startbildschirm muss im Zug funktionieren. (3) Der Bau
// auf dem Runner braucht dann kein Netz.
//
// Beide Schriften stehen unter der SIL Open Font License 1.1, die das
// Weitergeben ausdruecklich erlaubt. Die Herkunft steht in
// src/schrift/HERKUNFT.md - ohne die waere es eine Lizenzverletzung.
import fs from 'node:fs';
import path from 'node:path';

const AUS = path.join(process.cwd(), 'src/schrift');
fs.mkdirSync(AUS, { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
         + '(KHTML, like Gecko) Version/17.0 Safari/605.1.15';
// Plus Jakarta Sans als VARIABLE Schrift (500..800 statt 500;600;700;800):
// Google liefert dann EINE Datei fuer alle vier Gewichte statt vier
// gleich grosser. Spart 80 KB. Andika hat keine variable Fassung.
const ADRESSE = 'https://fonts.googleapis.com/css2?family=Andika:wght@400;700'
              + '&family=Plus+Jakarta+Sans:wght@500..800&display=swap';

// NUR latin. Kein latin-ext, kein Kyrillisch, kein Vietnamesisch.
//
// latin deckt U+0000-00FF ab, also das gesamte deutsche Alphabet samt
// ÄÖÜäöüß - und jeden Namen, der in diesem Spiel vorkommt. latin-ext allein
// waere bei Andika 112 KB fuer Zeichen, die nie erscheinen.
//
// Das ist eine Zusage, also wird sie geprueft: das Tor `schrift` faehrt
// jeden angezeigten Namen gegen diesen Bereich. Wer einen Namen mit einem
// Zeichen ausserhalb ergaenzt - ein tschechisches oder polnisches Land
// etwa -, wird dort rot, statt auf dem iPad ein leeres Kaestchen zu sehen.
const NOETIG = new Set(['latin']);

const css = await (await fetch(ADRESSE, { headers:{ 'User-Agent': UA } })).text();

// Google schreibt vor jeden Block einen Kommentar mit dem Namen des Schnitts.
const bloecke = css.split('/*').slice(1).map(t => {
  const i = t.indexOf('*/');
  return { schnitt: t.slice(0, i).trim(), text: t.slice(i + 2) };
}).filter(b => NOETIG.has(b.schnitt));

let lokal = '';
let gesamt = 0;
for (const b of bloecke) {
  const familie = (b.text.match(/font-family:\s*'([^']+)'/) || [])[1];
  const gewicht = (b.text.match(/font-weight:\s*([\d ]+)/) || [])[1].trim();
  const stil    = (b.text.match(/font-style:\s*(\w+)/) || [])[1];
  const bereich = (b.text.match(/unicode-range:\s*([^;]+)/) || [])[1].trim();
  const url     = (b.text.match(/url\((https:[^)]+)\)/) || [])[1];
  const name = `${familie.toLowerCase().replace(/\s+/g,'-')}-${gewicht.replace(/\s+/g,'-')}-${b.schnitt}.woff2`;
  const daten = Buffer.from(await (await fetch(url, { headers:{ 'User-Agent': UA } })).arrayBuffer());
  fs.writeFileSync(path.join(AUS, name), daten);
  gesamt += daten.length;
  lokal += `@font-face{font-family:'${familie}';font-style:${stil};font-weight:${gewicht};`
        +  `font-display:swap;src:url(./schrift/${name}) format('woff2');`
        +  `unicode-range:${bereich}}\n`;
  console.log(`    ${name.padEnd(46)} ${(daten.length/1024).toFixed(1)} KB`);
}
fs.writeFileSync(path.join(AUS, 'schrift.css'), lokal);
fs.writeFileSync(path.join(AUS, 'HERKUNFT.md'),
`# Woher die Schriften kommen

| Schrift | Urheber | Lizenz |
|---|---|---|
| **Andika** | SIL International | SIL Open Font License 1.1 |
| **Plus Jakarta Sans** | Tokotype | SIL Open Font License 1.1 |

Beide erlaubt die OFL 1.1 ausdruecklich weiterzugeben und einzubetten,
solange die Urheber genannt werden und die Schriftdateien selbst nicht
verkauft werden. Beides ist hier erfuellt.

Geholt ueber \`npm run schrift\` von Google Fonts, **nur der Schnitt latin**.
Der deckt U+0000-00FF ab, also das gesamte deutsche Alphabet samt AeOeUess -
und jeden Namen, der in diesem Spiel vorkommt. Das Tor \`schrift\` prueft
das nach; wer einen Namen mit einem Zeichen ausserhalb ergaenzt, wird dort
rot statt auf dem iPad ein leeres Kaestchen zu sehen.

Andika ist die Schrift, die das **Kind liest** - sie ist fuer Leseanfaenger
gemacht und unterscheidet I, l und 1 sichtbar voneinander. Plus Jakarta Sans
traegt alles andere.
`);
console.log(`  ${bloecke.length} Schnitte, zusammen ${(gesamt/1024).toFixed(1)} KB`);
