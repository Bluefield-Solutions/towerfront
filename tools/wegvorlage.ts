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
 * **Was drauf ist.**
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

for (const m of MAPS) {
  const roh = (MAP_BACKGROUNDS as Record<string, string>)[m.id];
  if (!roh) { console.log(`  ${m.id}: kein Kartenbild.`); continue; }
  const { data } = await sharp(Buffer.from(roh.split(',')[1], 'base64'))
    .resize(B, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const bahnen = lanePaths(m);
  const ziel = goalOf(m);
  const out = Buffer.alloc(B * H * 3);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      const i = (y * B + x) * 3;
      // Untergrund: entfaerbt und auf ein Drittel abgedunkelt.
      const grau = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) * 0.34;
      let r = grau, g = grau, b = grau;

      const wx = (x + 0.5) / k, wy = (y + 0.5) / k;
      let d = 1e9;
      for (const p of bahnen) d = Math.min(d, p.schlauchAbstand(wx, wy));

      if (d < 0) {
        // Der Schlauch selbst: hier MUSS Strasse sein.
        r = 246; g = 232; b = 196;
      } else if (d < PATH_CLEARANCE) {
        // Der Saum: Bausperre, aber nicht zwingend Strasse.
        r = grau * 0.5 + 104; g = grau * 0.5 + 88; b = grau * 0.5 + 56;
      }

      // Die Zielplattform - ein Ring, kein Fleck: das Bild soll dort eine
      // gepflasterte Rundplatte tragen, `npm run zielplatte` misst sie nach.
      const dz = Math.hypot(wx - ziel.x, wy - ziel.y);
      if (dz > 150 && dz < 162) { r = 120; g = 220; b = 255; }

      // Unwegsames Gelaende - muss im Bild als unwegsam erkennbar bleiben.
      for (const f of m.rough) {
        const df = Math.hypot(wx - f.x, wy - f.y);
        if (df > f.r - 6 && df < f.r) { r = 255; g = 120; b = 120; }
      }

      out[i] = r; out[i + 1] = g; out[i + 2] = b;
    }
  }

  const datei = `bilder/vorlage-${m.id}.png`;
  await sharp(out, { raw: { width: B, height: H, channels: 3 } }).png().toFile(datei);

  const breiten = bahnen.flatMap((p) => p.half);
  const min = Math.round(Math.min(...breiten) * 2), max = Math.round(Math.max(...breiten) * 2);
  const laenge = Math.round(bahnen.reduce((a, p) => a + p.length, 0));
  console.log(`  ${m.name.padEnd(15)} ${bahnen.length} Bahn(en), ${laenge} Weltpunkte, `
    + `Strasse ${min} bis ${max} Weltpunkte breit, Saum je ${PATH_CLEARANCE} -> ${datei}`);
}

console.log('\n  Das helle Band ist die Strasse, die das Spiel benutzt - dort und nur dort.');
console.log('  Das gedaempfte Band daneben ist die Bausperre: darf Gelaende sein.');
console.log('  Blauer Ring: Zielplattform. Rote Ringe: unwegsame Flecken.');
