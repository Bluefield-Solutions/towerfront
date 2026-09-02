/**
 * Die Wissensdatei fuer einen fremden Bild-Agenten bauen.
 *
 * **Wozu.** Die Bilder entstehen nicht hier, sondern bei einem Agenten in
 * einer anderen Umgebung - er hat dieses Verzeichnis nicht, kann `npm run
 * bildprompt` nicht aufrufen und sieht keine Messung. Was er bekommt, ist
 * eine Datei, die er in seinen Projektordner legt und die von da an bei
 * jeder Anfrage mitliest.
 *
 * **Warum sie erzeugt und nicht geschrieben wird.** Eine von Hand gepflegte
 * zweite Fassung des Auftragswissens waere genau die Falle aus Regel 15:
 * zwei Stellen, eine davon veraltet, und die veraltete ist die, mit der
 * gearbeitet wird. Hier steht deshalb nur, was NICHT im Auftragsdokument
 * steht - der Rahmen um das Spiel, der Ablauf und die Uebersetzung der
 * Messungen. Alles Uebrige wird woertlich uebernommen: der Stil-Block, die
 * Regelabschnitte, die offenen Bestellungen.
 *
 * **Und die Zahlen sind gemessen, nicht abgeschrieben** (Regel 12): Weltmass,
 * Kachelgroessen, Figurenbreiten und Strassenbreiten holt das Werkzeug aus
 * dem laufenden Spielstand, mit der Messstelle daneben.
 *
 * Aufruf: npm run bildwissen
 * Ergebnis: bilder/TOWERFRONT-BILDWISSEN.md
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, stilBlock, promptAbschnitte, einsetzen, abschnittstext,
} from './auftrag';
import { MAPS, lanePaths } from '../src/data/maps';
import { ENEMIES, type EnemyId } from '../src/data/enemies';
import { TOWERS, TOWER_ORDER, type TowerId } from '../src/data/towers';
import { VERSION, WORLD_W, WORLD_H } from '../src/data/config';
import { figurbreite } from './figurbreite';
import { anzeigePunkte, TURM_WELT } from './anzeigegroesse.mjs';

const stil = stilBlock();
const teile: string[] = [];
const schreib = (s: string): void => { teile.push(s); };

// --- Was gemessen wird, bevor es aufgeschrieben wird.
const engsteStrasse = Math.min(
  ...MAPS.flatMap((m) => lanePaths(m).map((p) => p.widthRange().min)),
) * 2;
// Die KACHEL ist nicht die Figur: der Leerentitan hat eine 102 Weltpunkte
// breite Kachel und misst darin 54. Wer die Kachel gegen die Strasse haelt,
// misst Luft - genau das stand in der ersten Fassung dieser Datei.
const figuren: {
  id: EnemyId; name: string; kachel: number; voll: number; punkte: number;
}[] = [];
for (const id of Object.keys(ENEMIES) as EnemyId[]) {
  const f = await figurbreite(id);
  if (!f) continue;
  figuren.push({
    id, name: ENEMIES[id].name, kachel: f.kachel, voll: f.voll,
    punkte: anzeigePunkte(f.kachel),
  });
}
if (!figuren.length) {
  console.error('BILDWISSEN: kein Gegnerbild im Vorrat - dann steht in der Datei nichts Gemessenes.');
  process.exit(1);
}
const breiteste = figuren.reduce((a, b) => (b.voll > a.voll ? b : a));
const turmPunkte = anzeigePunkte(TURM_WELT);

schreib(`# Towerfront — Bildwissen

**Erzeugt von \`npm run bildwissen\` aus \`docs/Towerfront-BILDAUFTRAG.md\`
und dem laufenden Spielstand ${VERSION}. Nicht von Hand ändern** — die
nächste Fassung überschreibt jede Änderung. Wer etwas ändern will, ändert das
Auftragsdokument im Projekt und lässt die Datei neu bauen.

Diese Datei ist als **Projektwissen** gedacht: einmal in den Projektordner
legen, danach liest sie bei jeder Bildanfrage mit.

---

## A. Wie ein Auftrag hier aussieht — und was daran nicht verhandelbar ist

Towerfront ist ein Browser-Tower-Defense in **einer einzigen HTML-Datei**.
Alle Bilder werden in diese Datei eingebacken; getestet wird auf dem
**iPhone quer**. Das entscheidet fast alles, was in diesem Dokument steht:
eine Gegnerkachel wird mit **${Math.min(...figuren.map((f) => f.punkte))} bis ${Math.max(...figuren.map((f) => f.punkte))} Bildschirmpunkten** gezeichnet, ein Turm mit **${turmPunkte}**. Was bei 40 Punkten nicht mehr zu erkennen ist, existiert nicht — es kostet nur Dateigröße und Unruhe.

**Ein Auftrag besteht immer aus drei Teilen:**

1. **Der Stil-Block** (Abschnitt 1). Er steht **wörtlich am Anfang jedes
   Prompts**, ohne Kürzung. Er ist nicht Geschmack, sondern Messprotokoll —
   zu jeder Zeile gibt es eine Prüfung, die anschlägt.
2. **Der Auftragstext** für die eine Datei (Abschnitte 5 bis 8b).
3. **Die Referenz**, wo es eine gibt — bei Kartenbildern ein Referenzblatt,
   das die Straßenführung zeigt. **Ohne das Blatt ist eine Kartenbestellung
   unvollständig**; dreimal ist genau daran eine Lieferung gescheitert.

**Was zurückkommt, wird gemessen, nicht besprochen.** Abschnitt D nennt die
Zahlen und was sie prüft. Eine Lieferung, die eine Grenze reißt, wird nicht
nachbearbeitet, sondern neu bestellt — Weichzeichnen und Nachschärfen sind
durchprobiert und kosten sichtbar Form.

---

## B. Das Spiel in Zahlen — die Messstellen zu jeder Angabe

| Was | Wert | Woher |
|---|---|---|
| Spielfeld | ${WORLD_W} × ${WORLD_H} Weltpunkte (16:9) | \`src/data/config.ts\` |
| Zielgerät | iPhone quer, Leinwand 1688 × 780 Gerätepunkte | Browsertor |
| Maßstab Welt → Bildschirm | 0,8 Gerätepunkte je Weltpunkt | Browsertor, gemessen |
| Engste Straße | ${engsteStrasse.toFixed(0)} Weltpunkte | \`lanePaths\`, alle Karten |
| Breiteste **Figur** | ${breiteste.voll.toFixed(0)} Weltpunkte (${breiteste.name}) | \`npm run gedraenge\` |
| Turm auf dem Schirm | ${turmPunkte} Gerätepunkte breit | \`tools/anzeigegroesse.mjs\` |
| Karten | ${MAPS.length} (${MAPS.map((m) => m.name).join(', ')}) | \`src/data/maps.ts\` |

**Jede Gegnerfigur, wie sie wirklich gezeichnet wird:**

Die **Kachel** ist der Platz, in den gezeichnet wird; die **Figur** ist, was
darin wirklich Deckkraft hat. Nur die zweite Zahl entscheidet, ob jemand über
den Bordstein ragt.

| Gegner | Kennung | Kachel | Figur darin | Kachel auf dem Schirm |
|---|---|---|---|---|
${figuren.map((f) => `| ${f.name} | \`${f.id}\` | ${f.kachel.toFixed(0)} | `
  + `${f.voll.toFixed(0)} (${((f.voll / f.kachel) * 100).toFixed(0)} %) | ${f.punkte} |`).join('\n')}

**Die vier Türme:**

| Turm | Kennung | Platzbedarf | Rolle |
|---|---|---|---|
${TOWER_ORDER.map((id) => {
  const t = TOWERS[id as TowerId];
  return `| ${t.name} | \`${id}\` | ${t.footprint} Weltpunkte | ${t.role} |`;
}).join('\n')}

> **Warum die Anzeigegröße und nicht die Quellgröße zählt.** Verkleinern
> ERHÖHT die Detaildichte — dasselbe Detail drängt sich auf weniger Punkte.
> Derselbe Bogenturm misst an der 256er Quelle 8,46 und in Anzeigegröße
> 13,55. Zwei Werkzeuge sind daran einmal auseinandergelaufen, und eine
> Lieferung konnte die Abnahme bestehen und hinterher im Tor durchfallen.

---

## 1. Der Stil-Block — wörtlich an den Anfang jedes Prompts

\`\`\`
${stil}
\`\`\`

**Er wird nicht gekürzt und nicht umformuliert.** Wo ein Auftrag eine Zeile
davon aufhebt (Kartenbilder heben \`BACKGROUND\` und \`MARGIN\` auf), steht
das im Auftragstext selbst — und zwar danach, nicht statt dessen.

---

`);

// --- Die Regelabschnitte woertlich uebernehmen, MIT ihrer Nummer.
//
// Nicht umnummeriert: die Unterpunkte darin heissen 3.1, 3.2b, 4.1 und so
// fort, und die stehen im Fliesstext. Eine zweite Zaehlung darueber haette
// "Abschnitt 4" bedeuten lassen, was "3.1" enthaelt. Die eigenen Teile
// tragen deshalb Buchstaben - so sprechen Wissensdatei und Auftragsdokument
// dieselbe Sprache.
for (const ab of ['## 2. Technische Grundregeln', '## 3. Die Kachel-Geometrie',
  '## 4. Die Farbfamilien']) {
  schreib(abschnittstext(ab) + '\n\n---\n\n');
}

schreib(`## C. Was schon schiefgegangen ist — die teuren Fälle

Jeder Punkt hier hat eine Lieferung gekostet. Sie stehen nicht als Vorwurf
da, sondern weil sie sich sonst wiederholen.

| Was passiert ist | Was daraus folgt |
|---|---|
| **Acht gute Aufsichten — sieben davon Kettenfahrzeuge.** Silhouetten-Ähnlichkeit 0,83 im Mittel, schlimmstes Paar 0,93; 25 von 28 Paaren zu ähnlich | Fünf Grundformen, höchstens **zwei** Figuren mit Geschützrohr. Kein Paar über **0,65** Ähnlichkeit |
| **Cel-shading mit harter Kontur um jedes Teil**, 14,3 – 25,2 % reines Schwarz | Keine Konturlinien. Formen trennen sich durch Wert und Licht |
| **Alle acht Kandidaten berührten den Kachelrand** | 5 % leerer Rand auf allen vier Seiten |
| **Figuren tragen 5,1-mal so viel Feindetail wie der Untergrund** (12,4 gegen 2,45; erlaubt 3,0) | Der QUIET TEST im Stil-Block. Nachbearbeitung hilft nicht — sie kostet Form |
| **Drei Kartenlieferungen mit der falschen Straße.** Ein Prompt beschreibt eine Stimmung, keine Geometrie | Kartenbilder nur noch **mit Referenzblatt**, und das Blatt ist verbindlich |
| **Bildschatten und Randlicht mitgeliefert** | Das Spiel backt Schatten, Sonnenanstrich, Bodenverschattung und Farbklima je Karte selbst auf. Mitgeliefertes ist doppelt und kommt aus der falschen Richtung |

---

## D. Abnahme — welche Zahl womit gemessen wird

Diese Grenzen entscheiden, ob eine Lieferung eingebaut wird. Sie werden
maschinell geprüft, bevor ein Bild in das Spiel kommt.

| Was | Grenze | Prüfung |
|---|---|---|
| Reines Schwarz | höchstens **2 %** der Fläche | \`probebild\` |
| Detaildichte in **Anzeigegröße** | höchstens **3,5** | \`probebild\` |
| Silhouetten-Ähnlichkeit je Paar | höchstens **0,65** | \`probebild\` |
| Silhouette Stufe 1 gegen Stufe 6 | höchstens **0,85** | \`probebild\` |
| Alphakanal, freigestellt | Pflicht, kein weißer Saum | \`probebild\` |
| Leerer Rand | mindestens **5 %** auf allen Seiten | \`probebild\` |
| Lichtwinkel | Sonne oben links, ~130° | \`grafiktor\` |
| Helligkeit der Figuren | Band **0,33 – 0,40** | \`grafiktor\` |
| Sättigung der Figuren | Band **0,35 – 0,45** | \`grafiktor\` |
| Untergrund: Helligkeit / Sättigung / Detaildichte | **0,30–0,36 / 0,45–0,55 / 1,5–3,0** | \`grafiktor\` |
| Figur passt auf die Straße | volle Breite unter **${engsteStrasse.toFixed(0)}** Weltpunkten, heute höchstens ${breiteste.voll.toFixed(0)} | \`gedraenge\` |
| Mündung erkennbar | je Ausbaustufe | \`muendung\` |
| Kartenbild: Bahn auf gemalter Straße | Mitte ≥ 99 %, Schlauch ≥ 90 %, Rand ≥ 75 % | \`bahntreue\` |
| Kartenbild: benutzte Straße | ≥ 90 % der gemalten Straße | \`wegdeckung\` |

**Die Detaildichte wird in ANZEIGEGRÖSSE gemessen, nicht an der Quelle.**
Zwischen beiden Zahlen liegt je Figur ein Faktor 2 bis 3.

---

`);

// --- Die offenen Bestellungen, jede vollstaendig.
const abschnitte = promptAbschnitte();
schreib(`## Die Aufträge — jeder vollständig

Jeder Block unten ist der **Auftragstext ohne den Stil-Block**. Der fertige
Prompt ist immer: **Abschnitt 1 wörtlich, dann dieser Text.** Wo ein Auftrag
ein Referenzblatt nennt, gehört das Blatt in dieselbe Anfrage.

${abschnitte.length} Aufträge stehen im Dokument:

${abschnitte.map((a) => `* ${a.titel}`).join('\n')}

`);

for (const a of abschnitte) {
  // Der Platzhalter wird durch einen VERWEIS ersetzt, nicht durch den Block:
  // die Datei traegt ihn einmal (Abschnitt 2), und siebzehn Kopien darin
  // waeren derselbe Fehler wie siebzehn Kopien im Auftragsdokument.
  const ohneStil = einsetzen(a.prompt, '→ HIER DEN STIL-BLOCK AUS ABSCHNITT 1 EINSETZEN ←');
  schreib(`### ${a.titel}\n\n\`\`\`\n${ohneStil}\n\`\`\`\n\n`);
}

schreib(`---

${abschnittstext('## 9. Was **nicht** geliefert werden soll').replace(/\n+---\s*$/, '')}

---

## E. Was nach der Lieferung passiert

1. Die Rohbilder werden abgelegt und mit \`npm run probebild -- <ordner>\`
   geprüft — **bevor** sie eingebaut werden. Das ist der Schritt, an dem eine
   Lieferung noch billig zu korrigieren ist.
2. \`npm run pack-art\` backt sie in den Bildvorrat. Dabei wird reines
   Schwarz angehoben, getrimmt und neu eingepasst — das rettet Kleinigkeiten,
   aber keine Formfehler.
3. Die Torkette läuft. Was dort anschlägt, geht als Nachbestellung zurück,
   mit der gemessenen Zahl daneben.

**Fehlende Stufen sind erlaubt.** Findet das Spiel eine Ausbaustufe nicht,
nimmt es die nächstniedrigere. Ein Satz darf Stück für Stück wachsen.

**Was nie geliefert werden muss:** Schatten, Glühen, Randlicht, Bodenkontakt,
Farbanpassung an die Karte. Das trägt das Spiel je Karte selbst auf, und
Mitgeliefertes steht doppelt.
`);

const datei = join(ROOT, 'bilder/TOWERFRONT-BILDWISSEN.md');
mkdirSync(join(ROOT, 'bilder'), { recursive: true });
const inhalt = teile.join('');
writeFileSync(datei, inhalt);

// **Und die Anweisung dazu.**
//
// Projektwissen ist passiv - es liegt da und wird gelesen, wenn der Agent
// von selbst darauf kommt. Was ihn dazu bringt, ist die Anweisung des
// Projekts. Sie steht deshalb als eigene Datei daneben und nicht als
// Absatz IN der Wissensdatei: die eine wird hochgeladen, die andere in ein
// Feld eingefuegt, und wer beides in einer Datei hat, fuegt das Falsche ein.
const anweisung = `Du erstellst Bilder fuer das Spiel Towerfront.

Im Projektwissen liegt TOWERFRONT-BILDWISSEN.md. Lies sie, BEVOR du ein Bild
erzeugst - jedes Mal, auch wenn die Anfrage klein wirkt.

Drei Regeln, die alles andere tragen:

1. Jeder Prompt beginnt WOERTLICH mit dem Stil-Block aus Abschnitt 1. Nicht
   gekuerzt, nicht umformuliert, nicht zusammengefasst.
2. Kein Bild ohne seinen Auftragstext aus den Abschnitten 5 bis 8b. Wenn zu
   einer Anfrage dort nichts steht, frag nach, statt zu erfinden.
3. Eine Kartenbestellung ohne Referenzblatt ist unvollstaendig. Das Blatt
   zeigt, wo die Strasse liegen MUSS. Liegt keines bei, frag danach.

Bevor du lieferst, geh die Abnahmetabelle in Abschnitt D durch und sag zu
jeder Zeile, ob dein Bild sie haelt. Wo du unsicher bist, sag es hin - eine
Lieferung, die eine Grenze reisst, wird nicht nachbearbeitet, sondern neu
bestellt.

Antworte auf Deutsch. Die Prompts selbst bleiben Englisch.
`;
const anweisungsdatei = join(ROOT, 'bilder/TOWERFRONT-PROJEKTANWEISUNG.txt');
writeFileSync(anweisungsdatei, anweisung);

console.log(`BILDWISSEN: ${inhalt.split('\n').length} Zeilen, `
  + `${(inhalt.length / 1024).toFixed(1)} KB -> bilder/TOWERFRONT-BILDWISSEN.md`);
console.log(`  ${abschnitte.length} Auftraege, Stil-Block einmal, `
  + `${figuren.length} Gegner und ${TOWER_ORDER.length} Tuerme mit gemessenen Groessen.`);
console.log('  Dazu bilder/TOWERFRONT-PROJEKTANWEISUNG.txt - der Text fuer das '
  + 'Anweisungsfeld des Projekts.');
console.log('\n  Beides in den Projektordner. Dazu gehoeren die Referenzblaetter aus');
console.log('  `npm run wegvorlage` - eine Kartenbestellung ohne Blatt ist unvollstaendig.');
