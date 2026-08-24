/** Bahnen auf die gemalte Strasse ziehen (TF-042).
 *
 *  **Der Befund.** `npm run bahntreue` misst, wieviel jeder Bahn auf der ins
 *  Kartenbild gemalten Strasse liegt: Spiralhain 96,9 %, Ascheschlucht 58,7
 *  bis 77,7 %, Frostspalte 60,5 und 62,4 %. Die Gegner laufen dort neben dem
 *  Weg, auf der Frostspalte bis zu 520 Weltpunkte am Stueck quer ueber den
 *  Schnee.
 *
 *  **Warum nicht neu erzeugen.** `tools/mapgraph.mjs` kann Mittellinien
 *  suchen, und genau so sind die Bahnen entstanden. Neu erzeugt bekaeme aber
 *  jede Karte eine andere Streckenfuehrung: andere Laenge, andere Kurven,
 *  andere Bauplaetze - und damit eine Balance, die von vorn geeicht werden
 *  muesste. Das waere eine neue Karte, keine Reparatur.
 *
 *  **Also ziehen statt erzeugen.** Jeder vorhandene Stuetzpunkt behaelt seine
 *  Rolle und wandert nur auf die MITTE der Strasse, die ihm am naechsten
 *  liegt. Die Streckenfuehrung bleibt, die Zahl der Punkte bleibt, die
 *  Reihenfolge bleibt - es aendert sich, wo genau sie liegen.
 *
 *  Die Wegmaske entsteht wie in `bahntreue`: Wegfarbe aus den Bahnpunkten,
 *  Gelaendefarbe als Mittel ueber alles, Schwelle aus dem Abstand. Dieses
 *  Verfahren traegt alle drei Karten - die Schwellenwahl in `mapgraph` (eine
 *  Helligkeits- oder Saettigungsgrenze) tut das ausdruecklich nicht, sie
 *  haelt auf der Winterkarte die ganze Flaeche fuer Weg.
 *
 *  Aufruf: npx tsx tools/bahnfit.ts [--schreiben]
 *  Ohne `--schreiben` wird nur gerechnet und berichtet.
 *
 *  Messstelle (Regel 12): gepacktes Kartenbild auf 480 Punkte Breite,
 *  Chamfer-Distanz zum Wegrand, Suchradius 90 Weltpunkte. */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { MAPS } from '../src/data/maps';
import { LanePath } from '../src/core/path';
import { MAP_BACKGROUNDS } from '../src/gfx/assets/backgrounds';

const WELT_B = 1920, WELT_H = 1080;
const B = 480, H = Math.round(B * WELT_H / WELT_B);
const SCHREIBEN = process.argv.includes('--schreiben');
/** Wie weit ein Punkt hoechstens wandern darf, in Weltpunkten.
 *
 *  Gross genug, um eine halbe Strassenbreite zu ueberbruecken, klein genug,
 *  dass ein Punkt nicht auf die NACHBARSTRASSE springt: die Gassen liegen
 *  rund 200 Weltpunkte auseinander. */
const RADIUS = 90;
/** In welchem Abstand die Kurve neu abgetastet wird, in Weltpunkten.
 *
 *  Klein genug, dass zwischen zwei Punkten kein Haken der Strasse Platz hat
 *  (die Gassen sind rund 80 breit), gross genug, dass keine Zackenkette
 *  entsteht - der Datenwaechter laesst hoechstens 25 Grad Knick zu. */
const ABSTAND = 40;
/** Ab welchem Verhaeltnis Strassenlaenge zu Luftlinie ein Sprung auf eine
 *  Nachbarstrasse angenommen wird. Bei 40 Weltpunkten Abstand misst ein
 *  Bogen der eigenen Strasse selten mehr als das Anderthalbfache. */
const UMWEG = 1.8;
/** Ab wieviel Grad zwischen zwei Stuetzpunkten der mittlere entfernt wird.
 *  Grosszuegiger als die 25 Grad des Waechters: der misst auf der ABGETASTETEN
 *  Kurve, wo ein Knick zwischen Stuetzpunkten sich auf mehrere Schritte
 *  verteilt. */
const ECKE = 55;
/** Wieviele Glaettungsdurchgaenge. Durchprobiert, siehe Kopf der Datei. */
const GLATT = Number((process.argv.find((a) => a.startsWith('--glatt=')) ?? '--glatt=2').slice(8));

/** Wegmaske und Abstand zum Wegrand fuer eine Karte. */
async function maske(id: string): Promise<{ weg: Uint8Array; dist: Float32Array }> {
  const d = (MAP_BACKGROUNDS as Record<string, string>)[id];
  const { data } = await sharp(Buffer.from(d.split(',')[1], 'base64'))
    .resize(B, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const farbe = (i: number): number[] => [data[i * 3] / 255, data[i * 3 + 1] / 255, data[i * 3 + 2] / 255];
  const karte = MAPS.find((m) => m.id === id)!;
  let wr = 0, wg = 0, wb = 0, wn = 0;
  for (const bahn of karte.lanes) {
    for (const p of bahn) {
      const x = Math.round(p.x * B / WELT_B), y = Math.round(p.y * B / WELT_B);
      if (x < 0 || y < 0 || x >= B || y >= H) continue;
      const c = farbe(y * B + x); wr += c[0]; wg += c[1]; wb += c[2]; wn++;
    }
  }
  wr /= wn; wg /= wn; wb /= wn;
  let gr = 0, gg = 0, gb = 0;
  for (let i = 0; i < B * H; i++) { const c = farbe(i); gr += c[0]; gg += c[1]; gb += c[2]; }
  gr /= B * H; gg /= B * H; gb /= B * H;
  const schwelle = Math.hypot(wr - gr, wg - gg, wb - gb) * 0.55;
  const weg = new Uint8Array(B * H);
  for (let i = 0; i < B * H; i++) {
    const c = farbe(i);
    weg[i] = Math.hypot(c[0] - wr, c[1] - wg, c[2] - wb) < schwelle ? 1 : 0;
  }
  // Chamfer-Distanz zum Wegrand, wie in mapgraph.
  const dist = new Float32Array(B * H);
  for (let i = 0; i < B * H; i++) dist[i] = weg[i] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    const i = y * B + x;
    if (!weg[i]) continue;
    let m = dist[i];
    if (x > 0) m = Math.min(m, dist[i - 1] + 1);
    if (y > 0) m = Math.min(m, dist[i - B] + 1);
    if (x > 0 && y > 0) m = Math.min(m, dist[i - B - 1] + 1.414);
    if (x < B - 1 && y > 0) m = Math.min(m, dist[i - B + 1] + 1.414);
    dist[i] = m;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = B - 1; x >= 0; x--) {
    const i = y * B + x;
    if (!weg[i]) continue;
    let m = dist[i];
    if (x < B - 1) m = Math.min(m, dist[i + 1] + 1);
    if (y < H - 1) m = Math.min(m, dist[i + B] + 1);
    if (x < B - 1 && y < H - 1) m = Math.min(m, dist[i + B + 1] + 1.414);
    if (x > 0 && y < H - 1) m = Math.min(m, dist[i + B - 1] + 1.414);
    dist[i] = m;
  }
  return { weg, dist };
}

const quelle = readFileSync('src/data/maps.ts', 'utf8');
let neu = quelle;

for (const m of MAPS) {
  const { dist } = await maske(m.id);
  const k = B / WELT_B;
  const rp = Math.round(RADIUS * k);
  console.log(`\n── ${m.name}`);
  m.lanes.forEach((bahn, bi) => {
    let gezogen = 0, summe = 0, weit = 0;
    const neuePunkte = bahn.map((p, pi) => {
      // Der ERSTE Punkt bleibt, wo er ist: er liegt bewusst vor der
      // Bildkante, dort steht kein Weg mehr, und ein Zug daran wuerde den
      // Spawn ins Feld holen.
      if (pi === 0) return { ...p };
      const px = p.x * k, py = p.y * k;
      let bx = p.x, by = p.y, bestW = -1;
      for (let dy = -rp; dy <= rp; dy++) {
        for (let dx = -rp; dx <= rp; dx++) {
          const x = Math.round(px + dx), y = Math.round(py + dy);
          if (x < 0 || y < 0 || x >= B || y >= H) continue;
          const dwelt = Math.hypot(dx, dy) / k;
          if (dwelt > RADIUS) continue;
          const dd = dist[y * B + x];
          if (dd <= 0) continue;
          // Mitte der Strasse bevorzugen, Naehe zum alten Punkt auch:
          // sonst springt ein Punkt auf die breiteste Stelle der Karte.
          const wert = dd - dwelt * k * 0.55;
          if (wert > bestW) { bestW = wert; bx = x / k; by = y / k; }
        }
      }
      const zug = Math.hypot(bx - p.x, by - p.y);
      if (zug > 1) { gezogen++; summe += zug; }
      if (zug > weit) weit = zug;
      return { x: Math.round(bx), y: Math.round(by), w: p.w };
    });
    console.log(`   Bahn ${bi}: ${gezogen} von ${bahn.length} Punkten gezogen, `
      + `im Mittel ${(gezogen ? summe / gezogen : 0).toFixed(0)}, hoechstens ${weit.toFixed(0)} Weltpunkte`);

    // --- Zweiter Durchgang: die Kurve neu abtasten.
    //
    // Ziehen allein reicht nicht. Nach dem ersten Durchgang lagen alle
    // Stuetzpunkte auf der Strasse - und die Frostspalte hatte immer noch
    // 520 Weltpunkte am Stueck daneben. Der Grund ist der ABSTAND: wo zwei
    // Punkte 90 Weltpunkte auseinander liegen und die Strasse dazwischen
    // einen Haken schlaegt, schneidet Catmull-Rom ihn ab. Kein Zug an den
    // Punkten kann das heilen, sie liegen ja richtig.
    //
    // Zwei Anlaeufe sind daran gescheitert: erst ein Vergleich von
    // Strassenlaenge und Luftlinie (fand einen einzigen Haken - falsche
    // Frage, die Kurve laeuft auch nicht auf der Luftlinie), dann ein
    // Einfuegen von Zwischenpunkten an gemessenen Abweichungen (machte es
    // SCHLECHTER, weil die Einfuegestelle in der Punktliste geraten war -
    // von 88,9 auf 79,9 %).
    //
    // Der dritte Anlauf laesst das Einfuegen ganz: die Kurve wird in festem
    // Abstand neu abgetastet, und JEDER Abtastpunkt wird auf die Wegmitte
    // gezogen. Die Streckenfuehrung bleibt - sie steckt in der Kurve -, aber
    // die Punkte stehen danach so dicht, dass zwischen ihnen kein Haken mehr
    // Platz hat.
    const bahn2 = new LanePath(neuePunkte as { x: number; y: number; w?: number }[]);
    const endgueltig: { x: number; y: number; w?: number }[] = [neuePunkte[0]];
    for (let sw = ABSTAND; sw < bahn2.length; sw += ABSTAND) {
      const p = bahn2.at(sw);
      let bx = p.x, by = p.y, bestW = -1;
      for (let dy = -rp; dy <= rp; dy++) for (let dx = -rp; dx <= rp; dx++) {
        const x = Math.round(p.x * k + dx), y = Math.round(p.y * k + dy);
        if (x < 0 || y < 0 || x >= B || y >= H) continue;
        const dwelt = Math.hypot(dx, dy) / k;
        if (dwelt > RADIUS) continue;
        const dd = dist[y * B + x];
        if (dd <= 0) continue;
        const wert = dd - dwelt * k * 0.55;
        if (wert > bestW) { bestW = wert; bx = x / k; by = y / k; }
      }
      // Die Breite kommt aus der Distanzkarte selbst - dort steht sie ja.
      // Gedeckelt auf das Band, in dem die alten Werte lagen (40 bis 81):
      // eine Kreuzung ist in der Distanzkarte sehr breit, aber sie ist
      // keine breite Strasse.
      const halb = bestW > 0 ? Math.round(Math.max(40, Math.min(81, (bestW + p.half * k * 0.55) / k))) : p.half;
      endgueltig.push({ x: Math.round(bx), y: Math.round(by), w: halb });
    }
    // Der letzte Punkt gehoert dazu, sonst endet die Bahn vor dem Kristall.
    endgueltig.push(neuePunkte[neuePunkte.length - 1]);
    console.log(`            neu abgetastet: ${bahn.length} → ${endgueltig.length} Punkte `
      + `bei ${ABSTAND} Weltpunkten Abstand`);

    // --- Glaetten, sonst zackt es.
    //
    // Das Ziehen ist punktweise: zwei benachbarte Punkte koennen auf
    // gegenueberliegende Seiten der Strasse rutschen, und schon steht dort
    // ein Knick. Der Datenwaechter hat genau das gemeldet - "knickt um 124
    // Grad, das ist eine Ecke, keine Kurve".
    //
    // Zwei sanfte Durchgaenge nach Laplace, Enden bleiben fest. Danach
    // liegen die Punkte etwas neben der Wegmitte, aber die Kurve laeuft
    // wieder rund - und die Kurve ist es, die gemessen wird.
    for (let runde = 0; runde < GLATT; runde++) {
      for (let n = 1; n < endgueltig.length - 1; n++) {
        endgueltig[n] = {
          x: Math.round(endgueltig[n].x * 0.5 + (endgueltig[n - 1].x + endgueltig[n + 1].x) * 0.25),
          y: Math.round(endgueltig[n].y * 0.5 + (endgueltig[n - 1].y + endgueltig[n + 1].y) * 0.25),
          w: endgueltig[n].w,
        };
      }
    }

    // --- Dritter Durchgang: wo die ROUTE am Weg vorbeigeht.
    //
    // Nach dem zweiten Durchgang liegen die Punkte dicht und auf der
    // Strasse - ausser dort, wo gar keine in Reichweite ist. Auf der
    // Frostspalte queren beide Bahnen dieselbe Schneeflaeche, weil die
    // Strasse dort einen weiten Bogen schlaegt und die Route geradeaus
    // ging. Ziehen kann das nicht heilen: es gibt nichts, wohin man ziehen
    // koennte, ohne die Strecke zu ERSETZEN.
    //
    // Also: zusammenhaengende Ketten von Punkten neben der Strasse suchen
    // und durch die gefundene Strasse zwischen ihren Nachbarn ersetzen.
    // Auf der Punktliste, nicht auf Kurvenstellen - der zweite Anlauf ist
    // genau daran gescheitert, dass er die Einfuegestelle geraten hat.
    // Nur auf Verlangen: dieser Durchgang aendert die ROUTE, nicht ihre Lage.
    //
    // Er hebt die Ascheschlucht-Bahn 2 von 82,4 auf 92,8 Prozent - und macht
    // sie dabei von 2329 auf 2593 Weltpunkte lang. Damit reissen die drei
    // Bahnlaengen auf 30,6 Prozent auseinander, und der Datenwaechter
    // schlaegt an: "die kuerzeste ist eine Abkuerzung". Zu Recht, denn eine
    // Bahn, die ein Viertel laenger ist als ihre Nachbarin, verschiebt die
    // Balance.
    //
    // Welche der drei gemalten Strassen diese Bahn nehmen soll, ist eine
    // Entwurfsentscheidung ueber die Karte - keine Reparatur einer
    // Ungenauigkeit. Deshalb steht der Durchgang hier bereit und laeuft
    // nicht von selbst.
    if (process.argv.includes('--umleiten')) {
      const aufWeg = (p: { x: number; y: number }): boolean => {
        const x = Math.round(p.x * k), y = Math.round(p.y * k);
        return x >= 0 && y >= 0 && x < B && y < H && dist[y * B + x] > 0;
      };
      const raus: { x: number; y: number; w?: number }[] = [];
      let i = 0, ersetzt = 0, gesetzt = 0;
      while (i < endgueltig.length) {
        if (aufWeg(endgueltig[i]) || i === 0 || i === endgueltig.length - 1) {
          raus.push(endgueltig[i]); i++; continue;
        }
        // Kette daneben: Anfang und Ende suchen.
        let j = i;
        while (j < endgueltig.length - 1 && !aufWeg(endgueltig[j])) j++;
        const vor = raus[raus.length - 1], nach = endgueltig[j];
        const strecke = wegZwischen(dist,
          Math.round(vor.x * k), Math.round(vor.y * k),
          Math.round(nach.x * k), Math.round(nach.y * k));
        if (!strecke || strecke.length < 2) { for (; i < j; i++) raus.push(endgueltig[i]); continue; }
        // Die gefundene Strasse im gewohnten Abstand abtasten.
        const schritt = Math.max(1, Math.round(ABSTAND * k));
        for (let n = schritt; n < strecke.length - schritt / 2; n += schritt) {
          raus.push({ x: Math.round(strecke[n].x / k), y: Math.round(strecke[n].y / k), w: vor.w });
          gesetzt++;
        }
        ersetzt += j - i;
        i = j;
      }
      // Und der andere Fall: zwei benachbarte Punkte liegen BEIDE auf der
      // Strasse, aber auf VERSCHIEDENEN. Die Kurve dazwischen ueberquert
      // dann die Luecke. Auf der Frostspalte ist das der ganze Rest - die
      // Pruefung oben findet dort nichts, weil kein einziger Punkt daneben
      // liegt.
      //
      // Erkennbar daran, dass die Strasse zwischen ihnen viel laenger ist
      // als ihr Abstand. Bei 40 Weltpunkten Abstand ist das eindeutig: ein
      // Bogen der eigenen Strasse misst dort selten mehr als das
      // Anderthalbfache, ein Sprung auf die Nachbarstrasse ein Vielfaches.
      {
        const zwei: { x: number; y: number; w?: number }[] = [raus[0]];
        let umwege = 0, dazu = 0;
        for (let n = 1; n < raus.length; n++) {
          const a = raus[n - 1], b2 = raus[n];
          const luft = Math.hypot(b2.x - a.x, b2.y - a.y);
          const strecke = luft > ABSTAND * 0.4 ? wegZwischen(dist,
            Math.round(a.x * k), Math.round(a.y * k),
            Math.round(b2.x * k), Math.round(b2.y * k)) : null;
          if (strecke && strecke.length / k > luft * UMWEG) {
            const schritt = Math.max(1, Math.round(ABSTAND * k));
            for (let q = schritt; q < strecke.length - schritt / 2; q += schritt) {
              zwei.push({ x: Math.round(strecke[q].x / k), y: Math.round(strecke[q].y / k), w: a.w });
              dazu++;
            }
            umwege++;
          }
          zwei.push(b2);
        }
        if (umwege) {
          console.log(`            ${umwege} Sprung/Spruenge auf eine Nachbarstrasse, `
            + `${dazu} Punkt(e) auf dem echten Weg dazwischen`);
          raus.length = 0;
          raus.push(...zwei);
          ersetzt++;
        }
      }
      if (ersetzt) {
        console.log(`            ${ersetzt} Punkt(e) neben der Strasse durch `
          + `${gesetzt} auf der Strasse ersetzt`);
        endgueltig.length = 0;
        endgueltig.push(...raus);
      }
    }

    // --- Letzter Durchgang: Punkte entfernen, die eine Ecke erzwingen.
    //
    // Der Datenwaechter laesst hoechstens 25 Grad Knick auf einem
    // Abtastschritt zu, und die gefundene Strasse aus dem dritten Durchgang
    // ist bildpunktweise gestuft - dort entsteht schon einmal eine
    // Haarnadel. Glaetten hilft nicht: durchprobiert mit zwei, drei, vier
    // und sechs Durchgaengen blieb der Knick stehen, und die Bahntreue fiel
    // von 80/84 auf 66/76 Prozent.
    //
    // Ein Stuetzpunkt, der eine Ecke erzwingt, ist ein schlechter
    // Stuetzpunkt. Ohne ihn zieht die Kurve seiner Nachbarn den Bogen von
    // selbst.
    for (let runde = 0; runde < 6; runde++) {
      let schlimmster = -1, schlimmstesMass = 0;
      for (let n = 1; n < endgueltig.length - 1; n++) {
        const a = endgueltig[n - 1], b2 = endgueltig[n], c = endgueltig[n + 1];
        const a1 = Math.atan2(b2.y - a.y, b2.x - a.x);
        const a2 = Math.atan2(c.y - b2.y, c.x - b2.x);
        let dd = Math.abs(a2 - a1);
        if (dd > Math.PI) dd = Math.PI * 2 - dd;
        if (dd > schlimmstesMass) { schlimmstesMass = dd; schlimmster = n; }
      }
      if (schlimmstesMass * 180 / Math.PI < ECKE) break;
      console.log(`            Punkt ${schlimmster} entfernt: erzwang `
        + `${(schlimmstesMass * 180 / Math.PI).toFixed(0)} Grad`);
      endgueltig.splice(schlimmster, 1);
    }

    if (SCHREIBEN) {
      const alt = textFuer(bahn);
      const ersatz = textFuer(endgueltig);
      if (!neu.includes(alt)) {
        console.error(`   FEHLER: Bahn ${bi} von ${m.id} nicht im Quelltext gefunden.`);
      } else {
        neu = neu.replace(alt, ersatz);
      }
    }
  });
}

/** Der billigste Weg ueber die Strasse zwischen zwei Bildpunkten.
 *
 *  Dijkstra auf der Wegmaske, ein Schritt kostet umso mehr, je naeher er am
 *  Rand liegt - dieselbe Idee wie in `tools/mapgraph.mjs`. Der billigste Weg
 *  laeuft dadurch von selbst in der Mitte.
 *
 *  Gebraucht wird er im DRITTEN Durchgang, fuer Stellen, an denen die Route
 *  selbst am Weg vorbeigeht: dort hilft kein Ziehen, dort muss die Strasse
 *  gesucht werden. */
function wegZwischen(
  dist: Float32Array, ax: number, ay: number, bx: number, by: number,
): { x: number; y: number }[] | null {
  const rand = 70;
  const x0 = Math.max(0, Math.min(ax, bx) - rand), x1 = Math.min(B - 1, Math.max(ax, bx) + rand);
  const y0 = Math.max(0, Math.min(ay, by) - rand), y1 = Math.min(H - 1, Math.max(ay, by) + rand);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const idx = (x: number, y: number): number => (y - y0) * bw + (x - x0);
  if (dist[ay * B + ax] <= 0 || dist[by * B + bx] <= 0) return null;
  const kosten = new Float32Array(bw * bh).fill(Infinity);
  const woher = new Int32Array(bw * bh).fill(-1);
  const drin = new Uint8Array(bw * bh);
  const start = idx(ax, ay), ende = idx(bx, by);
  kosten[start] = 0;
  const offen: number[] = [start];
  drin[start] = 1;
  while (offen.length) {
    let bi = 0;
    for (let i = 1; i < offen.length; i++) if (kosten[offen[i]] < kosten[offen[bi]]) bi = i;
    const cur = offen.splice(bi, 1)[0];
    drin[cur] = 0;
    if (cur === ende) break;
    const cx = (cur % bw) + x0, cy = ((cur / bw) | 0) + y0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < x0 || ny < y0 || nx > x1 || ny > y1) continue;
      const dd = dist[ny * B + nx];
      if (dd <= 0) continue;
      const c = kosten[cur] + Math.hypot(dx, dy) * (1 + 3 / Math.max(1, dd));
      const ni = idx(nx, ny);
      if (c < kosten[ni]) {
        kosten[ni] = c; woher[ni] = cur;
        if (!drin[ni]) { drin[ni] = 1; offen.push(ni); }
      }
    }
  }
  if (!isFinite(kosten[ende])) return null;
  const bahn: { x: number; y: number }[] = [];
  for (let cur = ende; cur !== -1; cur = woher[cur]) {
    bahn.push({ x: (cur % bw) + x0, y: ((cur / bw) | 0) + y0 });
    if (cur === start) break;
  }
  bahn.reverse();
  return bahn;
}

/** Dieselbe Schreibweise wie in `maps.ts` - drei Punkte je Zeile. */
function textFuer(punkte: { x: number; y: number; w?: number }[]): string {
  const teile = punkte.map((p) => `{ x: ${p.x}, y: ${p.y}${p.w !== undefined ? `, w: ${p.w}` : ''} }`);
  const zeilen: string[] = [];
  for (let i = 0; i < teile.length; i += 3) {
    zeilen.push('      ' + teile.slice(i, i + 3).join(', ') + ',');
  }
  return zeilen.join('\n');
}

if (SCHREIBEN) {
  writeFileSync('src/data/maps.ts', neu);
  console.log('\nsrc/data/maps.ts geschrieben.');
} else {
  console.log('\n(nur gerechnet - mit --schreiben wird eingetragen)');
}
