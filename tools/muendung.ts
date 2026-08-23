/** Wo endet das Rohr? Gemessen am Bild, nicht behauptet (TF-019).
 *
 *  Die Muendungspunkte in `src/data/turmgestalt.ts` sind Bruchteile eines
 *  Turmbildes. Eine solche Zahl veraltet lautlos, sobald jemand ein Bild
 *  austauscht - das Geschoss kaeme dann aus der Luft, und kein Tor saehe es.
 *
 *  Dieses Werkzeug liest den gepackten Bildvorrat und prueft zwei Dinge:
 *   1. Der eingetragene Punkt liegt auf der FIGUR, nicht daneben. Gemessen
 *      wird in einer kleinen Umgebung, denn eine Spitze ist an ihrem
 *      aeussersten Punkt fast durchsichtig.
 *   2. Er liegt OBEN - im oberen Viertel der Figur. Ein Rohr, das aus dem
 *      Sockel kommt, ist keines.
 *  Dazu misst es, was an der Aenderung ueberhaupt dransteht: den Abstand
 *  zwischen Standmitte und Muendung, in Weltpunkten und in
 *  Bildschirmpunkten auf dem Zielgeraet.
 *
 *  Aufruf: npx tsx tools/muendung.ts [--tor]
 *
 *  Messstelle (Regel 12): gepackter Bildvorrat, 256 x 256 je Kachel; die
 *  Bildschirmpunkte gelten fuer 844 x 390 (iPhone quer) bei dem Massstab,
 *  den der Renderer dort mindestens verwendet.  */
import sharp from 'sharp';
import { TOWER_ART } from '../src/gfx/assets/towers';
import { OBJECT_ART } from '../src/gfx/assets/objects';
import { MUENDUNG, turmMasse, muendung, WAFFE_BREIT } from '../src/data/turmgestalt';
import { TOWERS, TOWER_ORDER, type TowerId } from '../src/data/towers';
import { WORLD_W, WORLD_H } from '../src/data/config';
import { GameState } from '../src/game/state';
import { candidateSpots } from './spots';

const TOR = process.argv.includes('--tor');
let fehler = 0;
const fail = (m: string): void => { console.error(`  FEHLER: ${m}`); fehler++; };

/** Welches Bild traegt die Muendung: das Waffenbild oder das Turmbild. */
function bildFuer(id: TowerId): { name: string; daten: string } {
  const waffe = (OBJECT_ART as Record<string, string>)[`waffe_${id}`];
  if (waffe) return { name: `waffe_${id}`, daten: waffe };
  const turm = (TOWER_ART as Record<string, string>)[`${id}_1_1`];
  return { name: `${id}_1_1`, daten: turm };
}

async function alpha(daten: string): Promise<{ d: Buffer; w: number; h: number }> {
  const roh = Buffer.from(daten.split(',')[1], 'base64');
  const { data, info } = await sharp(roh).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
}

console.log('MUENDUNG\n');

// Der kleinste Massstab, mit dem auf dem Zielgeraet gezeichnet wird - dieselbe
// Rechnung wie in `npm run beruehrung`.
const KLEINSTER = Math.max(844 / WORLD_W, 390 / WORLD_H);

for (const id of Object.keys(MUENDUNG) as TowerId[]) {
  const m = MUENDUNG[id];
  if (!m) continue;
  const { name, daten } = bildFuer(id);
  if (!daten) { fail(`${id}: kein Bild "${name}" im Vorrat.`); continue; }
  const { d, w, h } = await alpha(daten);

  // Kasten der Figur - der Rand der Kachel ist leer.
  let minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 40) { if (y < minY) minY = y; if (y > maxY) maxY = y; break; }
    }
  }
  const px = Math.round(m.x * w), py = Math.round(m.y * h);
  // Sitzt der Punkt am Ende von Material - oder schwebt er?
  //
  // Gemessen wird NACH INNEN, nicht rundherum. Der erste Anlauf nahm ein
  // Quadrat um den Punkt und liess den Bogenturm durchfallen: eine Spitze
  // hat ueber sich nun einmal nur Luft, also war die halbe Umgebung leer.
  // Das war ein Fehler der Messung, nicht des Punktes. Ein Rohrende erkennt
  // man daran, dass DAHINTER Material steht - beim Waffenbild wie beim
  // Turmbild zeigt die Waffe nach oben, innen ist also unten.
  const r = Math.round(w * 0.03);
  let voll = 0, feld = 0;
  for (let y = py; y <= py + 2 * r; y++) {
    for (let x = px - r; x <= px + r; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      feld++;
      if (d[(y * w + x) * 4 + 3] > 40) voll++;
    }
  }
  const anteil = feld ? voll / feld : 0;
  // Wie weit oben liegt er, gemessen an der Figur selbst?
  const hoch = (py - minY) / Math.max(1, maxY - minY);

  // Und was die Aenderung wert ist: Abstand Standmitte - Muendung.
  const nach_rechts = muendung(id, 0);
  const welt = Math.hypot(nach_rechts.x, nach_rechts.y);
  const schirm = welt * KLEINSTER;
  const dreh = m.dreht
    ? Math.hypot(muendung(id, 0).x - muendung(id, Math.PI).x,
      muendung(id, 0).y - muendung(id, Math.PI).y)
    : Math.abs(muendung(id, 0).x - muendung(id, Math.PI).x);

  console.log(`  ${TOWERS[id].name.padEnd(12)} ${name.padEnd(14)} `
    + `Punkt (${m.x.toFixed(3)}, ${m.y.toFixed(3)}) `
    + `Material dahinter ${(anteil * 100).toFixed(0)} %  oben ${(hoch * 100).toFixed(0)} %  `
    + `Abstand ${welt.toFixed(0)} Weltpunkte = ${schirm.toFixed(0)} Bildschirmpunkte  `
    + `Ausschlag ${dreh.toFixed(0)}`);

  if (anteil < 0.5) {
    fail(`${TOWERS[id].name}: hinter der Muendung steht kein Material `
      + `(${(anteil * 100).toFixed(0)} % Deckung, mindestens 50 % noetig) - `
      + 'der Punkt schwebt neben der Figur.');
  }
  if (hoch > 0.25) {
    fail(`${TOWERS[id].name}: die Muendung liegt bei ${(hoch * 100).toFixed(0)} % der `
      + 'Figurhoehe - ein Rohr gehoert ins obere Viertel, nicht in den Sockel.');
  }
  if (schirm < 20) {
    fail(`${TOWERS[id].name}: die Muendung liegt nur ${schirm.toFixed(0)} Bildschirmpunkte `
      + 'von der Standmitte - dann war die ganze Aenderung nicht noetig.');
  }
  if (dreh < 10) {
    fail(`${TOWERS[id].name}: die Muendung bewegt sich beim Zielwechsel nur `
      + `${dreh.toFixed(0)} Weltpunkte - sie zeigt nicht, wohin der Turm blickt.`);
  }
}

// Und der Gegenbeweis: ein Turm ohne Rohr darf keinen Eintrag haben.
for (const id of ['frost'] as TowerId[]) {
  if (MUENDUNG[id]) {
    fail(`${TOWERS[id].name} wirkt im Umkreis und hat kein Rohr - ein Muendungspunkt `
      + 'waere dort eine Behauptung ueber ein Bild, das keine Waffe zeigt.');
  }
  const m = muendung(id, 0);
  if (m.x !== 0 || m.y !== 0) {
    fail(`${TOWERS[id].name}: ohne Eintrag muss die Muendung die Standmitte sein.`);
  }
}

// ---------------------------------------------------------------------------
// Die Muendung aendert das BILD, niemals das Spiel.
//
// Das ist die Lehre dieser Runde, und sie hat eine Runde gekostet. Der erste
// Entwurf liess Geschosse wirklich an der Muendung entstehen - hundert
// Weltpunkte weiter oben. In einer Dreiviertelansicht ist das aber HOEHE und
// keine Entfernung: mitgerechnet flog jede Granate ein Sechstel zu lang und
// schlug hinter der Traube ein. `npm run sim` fiel von 34 auf 16 von 60
// Punkten, und keine einzige Torpruefung nannte den Grund.
//
// Also wird die Invariante gepruefert, statt sie zu meinen: dieselbe Partie
// zweimal, einmal mit den Muendungen und einmal ohne. Jede Zahl muss
// gleich sein. Weicht sie ab, ist der Versatz in die Flugbahn gerutscht.
{
  const lauf = (mit: boolean): string => {
    const sicherung = { ...MUENDUNG };
    if (!mit) for (const k of Object.keys(MUENDUNG)) delete MUENDUNG[k as TowerId];
    try {
      const s2 = new GameState();
      s2.reset(4242, 'normal', 'spiralhain');
      s2.gold = 100000;
      let n = 0;
      for (const sp of candidateSpots(s2)) {
        if (n >= 8) break;
        if (s2.build(sp.x, sp.y, TOWER_ORDER[n % TOWER_ORDER.length])) n++;
      }
      s2.gold = 400;
      s2.waveIndex = 9;
      s2.startWave();
      for (let i = 0; i < 60 * 60; i++) {
        s2.update(1 / 60);
        if (!s2.enemies.length && !s2.waveActive) break;
      }
      return `${s2.stats.damage.toFixed(3)} ${s2.stats.kills} ${s2.lives} ${s2.gold}`;
    } finally {
      Object.assign(MUENDUNG, sicherung);
    }
  };
  const mit = lauf(true), ohne = lauf(false);
  console.log(`\n  Mit Muendung:  ${mit}\n  Ohne Muendung: ${ohne}   (Schaden Erledigt Kristall Gold)`);
  if (mit !== ohne) {
    fail('Die Muendung veraendert den Spielverlauf. Sie ist Hoehe im Bild, '
      + 'keine Strecke auf der Karte - der Versatz gehoert in die Zeichnung, '
      + 'nicht in die Flugbahn.');
  }
}

const g = turmMasse();
console.log(`\n  Turmkasten ${g.w.toFixed(0)} x ${g.h.toFixed(0)} Weltpunkte, `
  + `Oberkante ${g.oben.toFixed(0)} ueber der Standmitte, `
  + `Waffenbild ${(g.w * WAFFE_BREIT).toFixed(0)} breit.`);
console.log(`  Messstelle: gepackter Bildvorrat 256 x 256; Bildschirmpunkte bei `
  + `Massstab ${KLEINSTER.toFixed(3)} (844 x 390, iPhone quer).`);

if (fehler) { console.error(`\nMUENDUNG: ${fehler} Fehler.`); if (TOR) process.exit(1); }
else console.log('\nMUENDUNG: jeder Punkt sitzt auf seiner Figur.');
