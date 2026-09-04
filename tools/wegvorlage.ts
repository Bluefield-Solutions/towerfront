/**
 * Referenzblatt fuer eine Kartenbestellung (D28, Schritt C).
 *
 * **Wozu.** Der Bildauftrag kann sagen "male die Strasse breiter", und das
 * naechste Bild hat dann wieder eine andere Strasse als das Spiel benutzt -
 * ein Prompt beschreibt eine Stimmung, keine Geometrie. Gemessen ist der
 * Abstand gross: auf dem Spiralhain liegen nur 38 % der gemalten Strasse an
 * einer benutzten Bahn, und vom Bahnschlauch liegen nur 51 % auf gemalter
 * Strasse (`npm run wegdeckung`, `npm run bahntreue`).
 *
 * Dieses Blatt schliesst die Luecke: es zeichnet den Bahnschlauch, den das
 * Spiel WIRKLICH benutzt, in voller Breite ueber die heutige Karte. Wer das
 * Bild malt, hat damit die Vorlage vor sich statt einer Beschreibung.
 *
 * **Zwei Blaetter je Karte, seit v216** - weil es zwei Bestellungen gibt und
 * ein Blatt lauter spricht als der Absatz daneben.
 *
 * `vorlage-<id>.png` gehoert zu **Abschnitt 8b** (Bild MIT Weg):
 *   - die heutige Karte, entfaerbt und abgedunkelt: das Biom bleibt lesbar,
 *     aber niemand kann das Blatt fuer ein fertiges Bild halten
 *   - der Bahnschlauch in voller Breite (2 x die oertliche halbe Breite) -
 *     GENAU dort muss Strasse sein, und nirgends sonst
 *   - der Saum daneben: die 30 Weltpunkte Bausperre, damit sichtbar ist,
 *     wo ohnehin nicht gebaut werden darf
 *   - die Zielplattform als Ring
 *   - die unwegsamen Flecken als Ringe: die muessen im Bild als unwegsam zu
 *     erkennen bleiben, sonst schlaegt `npm run gelaendetor` an
 *
 * `vorlage-<id>-gelaende.png` gehoert zu **Abschnitt 8c** (Gelaende OHNE
 * Weg). Dasselbe Blatt taugt dort NICHT: sein cremefarbenes Band zeigt eine
 * Strasse, und 8c verbietet gerade die. Auf dem 8c-Blatt bleibt das Band
 * eine Andeutung, der Saum entfaellt, und die Ringe werden doppelt so dick -
 * roter Ring: unwegsames Gelaende, blauer Ring: die gepflasterte
 * Zielplattform, die `npm run zielplatte` im Bild sucht.
 *
 * **Gezeichnet wird ohne Leinwand**, Bildpunkt fuer Bildpunkt ueber `sharp`.
 * Das ist hier kein Umweg, sondern der kuerzere Weg: die Frage lautet fuer
 * jeden Punkt "wie weit ist er vom Schlauch weg", und genau das rechnet
 * `schlauchAbstand`. Ein zweites Zeichengeruest neben `tools/leinwand.mjs`
 * entsteht dabei nicht (Regel 16).
 *
 * Aufruf: npm run wegvorlage
 *
 * Messstelle (Regel 12): Weltmass 1920 x 1080, ausgegeben auf 1200 x 675;
 * Schlauchbreite aus `lanePaths`, Bausperre aus `PATH_CLEARANCE`.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { MAPS, lanePaths, goalOf, PATH_CLEARANCE } from '../src/data/maps';
import { MAP_BACKGROUNDS } from '../src/gfx/assets/backgrounds';
import { WORLD_W as WELT_B, WORLD_H as WELT_H } from '../src/data/config';

const B = 1200, H = Math.round(B * WELT_H / WELT_B);
const k = B / WELT_B;

mkdirSync('bilder', { recursive: true });

/** Ein Blatt zeichnen. `art` sagt, wofuer es gedacht ist.
 *
 *  **8b** bestellt ein Bild MIT Weg: dort ist das cremefarbene Band die
 *  Hauptsache - genau dort muss Strasse sein und nirgends sonst.
 *
 *  **8c** bestellt Gelaende OHNE Weg: dort ist dasselbe Band eine Falle.
 *  Wer es einem Maler vorlegt, bekommt die Strasse zurueck, die 8c gerade
 *  verbietet - ein Blatt sagt lauter als ein Absatz. Es bleibt deshalb nur
 *  als Andeutung stehen (es zeigt, wo spaeter verdeckt wird), und die
 *  Ringe treten nach vorn.
 */
async function blatt(m: (typeof MAPS)[number], art: '8b' | '8c'): Promise<string> {
  const roh = (MAP_BACKGROUNDS as Record<string, string>)[m.id];
  const { data } = await sharp(Buffer.from(roh.split(',')[1], 'base64'))
    .resize(B, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const bahnen = lanePaths(m);
  const ziel = goalOf(m);
  const out = Buffer.alloc(B * H * 3);

  // Auf dem 8c-Blatt sind die Ringe dicker: sie sind dort das Einzige, was
  // gemalt werden soll.
  const dick = art === '8c' ? 12 : 6;

  // **Auf dem 8c-Blatt steht KEIN Kartenbild.** Der erste Entwurf legte es
  // entfaerbt darunter, der zweite verrechnete es zu 24er-Bloecken - beide
  // Male blieb die alte gemalte Strasse als Treppenmuster stehen, weil sie
  // heller ist als alles andere auf der Karte. Und ein Maler, der ein Blatt
  // mit einer Strasse darauf bekommt, malt eine Strasse; genau die verbietet
  // Abschnitt 8c.
  //
  // Was vom Bild bleibt, ist sein MITTELWERT: eine flache Flaeche in der
  // Farbe der Karte. Sie sagt "Laubwald" oder "Asche", ohne eine einzige
  // Linie mitzuliefern, an der man entlangzeichnen koennte. Das Biom steht
  // ohnehin im Prompt - dieses Blatt traegt die Geometrie.
  let mr = 0, mg = 0, mb = 0;
  for (let i = 0; i < B * H; i++) { mr += data[i * 3]; mg += data[i * 3 + 1]; mb += data[i * 3 + 2]; }
  mr /= B * H; mg /= B * H; mb /= B * H;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      const i = (y * B + x) * 3;
      // Untergrund: entfaerbt und abgedunkelt. Das Blatt soll das Biom
      // zeigen, aber niemand darf es fuer ein fertiges Bild halten.
      const grau = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) * 0.34;
      let r = grau, g = grau, b = grau;
      if (art === '8c') { r = mr * 0.55; g = mg * 0.55; b = mb * 0.55; }

      const wx = (x + 0.5) / k, wy = (y + 0.5) / k;
      let d = 1e9;
      for (const p of bahnen) d = Math.min(d, p.schlauchAbstand(wx, wy));

      if (art === '8b') {
        if (d < 0) {
          // Der Schlauch selbst: hier MUSS Strasse sein.
          r = 246; g = 232; b = 196;
        } else if (d < PATH_CLEARANCE) {
          // Der Saum: Bausperre, aber nicht zwingend Strasse.
          r = grau * 0.5 + 104; g = grau * 0.5 + 88; b = grau * 0.5 + 56;
        }
      } else if (d < 0) {
        // Nur eine Andeutung: hier wird spaeter verdeckt. Der Saum entfaellt
        // ganz - er sagt etwas ueber das Bauen, nicht ueber das Bild.
        r = r * 0.7 + 34; g = g * 0.7 + 32; b = b * 0.7 + 26;
      }

      // Die Zielplattform - ein Ring, kein Fleck. Sie gehoert in BEIDE
      // Bestellungen: `npm run zielplatte` sucht sie im Kartenbild, auch
      // wenn das Spiel die Strasse selbst zeichnet.
      const dz = Math.hypot(wx - ziel.x, wy - ziel.y);
      if (dz > 130 && dz < 130 + dick) { r = 120; g = 220; b = 255; }

      // Unwegsames Gelaende - muss im Bild als unwegsam erkennbar bleiben.
      // Die Strichstaerke waechst mit dem Fleck: ein fester Wert macht aus
      // den kleinen Flecken (Radius 10) ausgefuellte Punkte, und die liest
      // niemand mehr als Flaeche.
      for (const f of m.rough) {
        const df = Math.hypot(wx - f.x, wy - f.y);
        const t = Math.max(3, Math.min(dick, f.r * 0.3));
        if (df > f.r - t && df < f.r) { r = 255; g = 120; b = 120; }
      }

      out[i] = r; out[i + 1] = g; out[i + 2] = b;
    }
  }

  const datei = art === '8b' ? `bilder/vorlage-${m.id}.png` : `bilder/vorlage-${m.id}-gelaende.png`;
  await sharp(out, { raw: { width: B, height: H, channels: 3 } }).png().toFile(datei);
  return datei;
}

for (const m of MAPS) {
  if (!(MAP_BACKGROUNDS as Record<string, string>)[m.id]) {
    console.log(`  ${m.id}: kein Kartenbild.`); continue;
  }
  const a = await blatt(m, '8b');
  const c = await blatt(m, '8c');

  const bahnen = lanePaths(m);
  const breiten = bahnen.flatMap((p) => p.half);
  const min = Math.round(Math.min(...breiten) * 2), max = Math.round(Math.max(...breiten) * 2);
  const laenge = Math.round(bahnen.reduce((a2, p) => a2 + p.length, 0));
  console.log(`  ${m.name.padEnd(15)} ${bahnen.length} Bahn(en), ${laenge} Weltpunkte, `
    + `Strasse ${min} bis ${max} Weltpunkte breit, Saum je ${PATH_CLEARANCE}`);
  console.log(`  ${''.padEnd(15)} -> ${a}   (Abschnitt 8b: Bild MIT Weg)`);
  console.log(`  ${''.padEnd(15)} -> ${c}   (Abschnitt 8c: Gelaende OHNE Weg)`);
}

console.log('\n  **Blatt fuer Abschnitt 8b** (Bild MIT Weg): das helle Band ist die Strasse,');
console.log('  die das Spiel benutzt - dort und nur dort. Das gedaempfte Band daneben ist');
console.log('  die Bausperre: darf Gelaende sein.');
console.log('\n  **Blatt fuer Abschnitt 8c** (Gelaende OHNE Weg): dort zaehlen die Ringe.');
console.log('  Rote Ringe - unwegsames Gelaende, muss im Bild sein, weil das Spiel es');
console.log('  nicht mehr zeichnet. Blauer Ring - die gepflasterte Zielplattform, die');
console.log('  `npm run zielplatte` im Bild sucht. Das schwach angedeutete Band sagt nur,');
console.log('  wo spaeter der gezeichnete Weg liegt; was darunter steht, wird verdeckt.');
