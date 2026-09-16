// Kartenpipeline. Aus Rohdaten werden SVG-Pfade - zur BAUZEIT, nie im Spiel.
//
// Die vier Dinge, die das Grafik-Audit verlangt und die hier wirklich
// passieren (Befunde G2, G3, G6, G7):
//
//   G3  Topologie VOR der Vereinfachung. mapshaper baut aus allen Flaechen
//       gemeinsame Boegen; geteilte Grenzen werden dadurch identisch
//       vereinfacht. Ohne das entstehen Luecken entlang jeder Landgrenze.
//   G2  Das Guetemass ist die HAUSDORFF-Distanz in Bildpunkten, nicht die
//       Flaechenabweichung in Prozent. Der Vereinfachungsgrad wird per
//       Bisektion gesucht, bis die Grenze eingehalten ist - gemessen,
//       nicht geraten.
//   G6  Drei Aufloesungsstufen je Form, jede gegen ihre eigene Grenze.
//   G7  Projektion mit gesetzten Standardparallelen.

import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import * as d3 from 'd3-geo';

const ROH = process.env.LERNKISTE_ROH
  || '/tmp/claude-0/-home-user-towerfront/4a4d3588-76df-54c7-9810-611a84f37cef/scratchpad/roh';
const AUS = path.join(process.cwd(), 'src/geo');

/** Die Stufen aus Konzept K3, Kapitel 5.3b. Breite = groesste Darstellung. */
export const STUFEN = [
  { name: 'grob',   breitePx: 200  },
  { name: 'mittel', breitePx: 800  },
  { name: 'fein',   breitePx: 2000 },
];
const HAUSDORFF_GRENZE = 0.75;   // Gerätebildpunkte

/* ---------------------------------------------------------------- Geometrie */

/** Alle Ringe einer Feature-Sammlung als flache Liste von Punktfolgen. */
function ringe(geo) {
  const out = [];
  const rein = (g) => {
    if (!g) return;
    if (g.type === 'Polygon') out.push(...g.coordinates);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => out.push(...p));
    else if (g.type === 'GeometryCollection') g.geometries.forEach(rein);
  };
  (geo.features || [geo]).forEach(f => rein(f.geometry || f));
  return out;
}

function projiziere(ringliste, proj) {
  return ringliste.map(r => r.map(([lon, lat]) => proj([lon, lat])).filter(Boolean));
}

/** Punkt-Segment-Abstand. */
function abstandSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const L = vx * vx + vy * vy;
  let t = L > 0 ? (wx * vx + wy * vy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = ax + t * vx - px, dy = ay + t * vy - py;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Einseitige Hausdorff-Distanz: wie weit wurde das Original weggeschoben.
 * Mit Gitterindex, sonst laeuft die Bisektion nicht durch.
 */
function hausdorff(orig, verein) {
  const seg = [];
  for (const r of verein)
    for (let i = 0; i + 1 < r.length; i++)
      seg.push([r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]]);
  if (!seg.length) return Infinity;

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of seg) {
    x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]);
    y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]);
  }
  const zelle = Math.max(2, Math.min(x1 - x0, y1 - y0) / 120);
  const sp = Math.ceil((x1 - x0) / zelle) + 1, ze = Math.ceil((y1 - y0) / zelle) + 1;
  const gitter = new Map();
  const schluessel = (i, j) => i * 100000 + j;
  seg.forEach((s, k) => {
    const i0 = Math.floor((Math.min(s[0], s[2]) - x0) / zelle), i1 = Math.floor((Math.max(s[0], s[2]) - x0) / zelle);
    const j0 = Math.floor((Math.min(s[1], s[3]) - y0) / zelle), j1 = Math.floor((Math.max(s[1], s[3]) - y0) / zelle);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const t = schluessel(i, j); let a = gitter.get(t); if (!a) gitter.set(t, a = []); a.push(k);
    }
  });

  let max = 0, stelle = null;
  for (const r of orig) for (const [px, py] of r) {
    const ci = Math.floor((px - x0) / zelle), cj = Math.floor((py - y0) / zelle);
    let best = Infinity;
    for (let ring = 0; ring < Math.max(sp, ze); ring++) {
      for (let i = ci - ring; i <= ci + ring; i++) for (let j = cj - ring; j <= cj + ring; j++) {
        if (ring > 0 && Math.abs(i - ci) !== ring && Math.abs(j - cj) !== ring) continue;
        const a = gitter.get(schluessel(i, j)); if (!a) continue;
        for (const k of a) {
          const s = seg[k];
          const d = abstandSeg(px, py, s[0], s[1], s[2], s[3]);
          if (d < best) best = d;
        }
      }
      // Sobald der bisher beste Treffer naeher liegt als der noch ungeprueft
      // erreichbare Ringabstand, kann kein weiterer Ring besser werden.
      if (best <= ring * zelle) break;
    }
    if (best > max) { max = best; stelle = [px, py]; }
  }
  return { d: max, stelle };
}

/* ------------------------------------------------------------- Vereinfachen */

/**
 * Ein mapshaper-Lauf ueber eine GeoJSON-Sammlung.
 *
 * Danach wird IMMER der Umlaufsinn normalisiert - siehe `nachD3`.
 */
async function shaper(geojson, befehle) {
  const raus = await mapshaper.applyCommands(
    `-i ein.json ${befehle} -o aus.json format=geojson`,
    { 'ein.json': Buffer.from(JSON.stringify(geojson)) }
  );
  return nachD3(alsSammlung(JSON.parse(Buffer.from(raus['aus.json']).toString('utf8'))));
}

/**
 * mapshaper gibt je nach Befehl eine FeatureCollection, eine
 * GeometryCollection oder eine nackte Geometrie zurueck. `-dissolve2` etwa
 * liefert eine GeometryCollection - und die lief durch die
 * Umlaufsinn-Korrektur unveraendert hindurch, weil die nur Features kannte.
 * Ergebnis wieder: geoBounds meldete die ganze Erde. Deshalb wird die
 * Ausgabe hier auf EINE Form gebracht, bevor irgendetwas anderes passiert.
 */
function alsSammlung(geo) {
  if (!geo) return { type: 'FeatureCollection', features: [] };
  if (geo.type === 'FeatureCollection') return geo;
  if (geo.type === 'GeometryCollection')
    return { type: 'FeatureCollection',
             features: geo.geometries.map(g => ({ type: 'Feature', properties: {}, geometry: g })) };
  if (geo.type === 'Feature') return { type: 'FeatureCollection', features: [geo] };
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: geo }] };
}

/** Vorzeichenbehaftete Flaeche eines Rings. Negativ = im Uhrzeigersinn. */
function vorzeichenFlaeche(r) {
  let a = 0;
  for (let i = 0, n = r.length; i < n; i++) {
    const j = (i + 1) % n;
    a += r[i][0] * r[j][1] - r[j][0] * r[i][1];
  }
  return a / 2;
}

/**
 * Umlaufsinn auf das drehen, was d3-geo erwartet.
 *
 * Der Fallstrick, der eine halbe Stunde gekostet hat: **d3-geo erwartet den
 * ENTGEGENGESETZTEN Umlaufsinn zu RFC 7946.** Die Norm verlangt Aussenringe
 * gegen den Uhrzeigersinn; d3 rechnet spaerisch und liest genau das als "der
 * ganze Rest der Kugel". Natural Earth liefert im Uhrzeigersinn und laeuft
 * deshalb; mapshaper dreht um, und danach umschloss jedes Bundesland
 * rechnerisch den Nordpol: geoBounds meldete die ganze Erde, fitWidth
 * lieferte Massstab 0, jede Flaeche war null.
 *
 * **Rot wurde dabei nichts.** Genau deshalb prueft das Tor `topologie` den
 * Umlaufsinn, und genau deshalb wird hier normalisiert statt einem
 * Ausgabeflag vertraut.
 */
function nachD3(geo) {
  const dreh = (ring, sollNegativ) => {
    const a = vorzeichenFlaeche(ring);
    return (a < 0) === sollNegativ ? ring : ring.slice().reverse();
  };
  const poly = (p) => p.map((ring, i) => dreh(ring, i === 0));
  const rein = (g) => {
    if (!g) return g;
    if (g.type === 'Polygon') return { ...g, coordinates: poly(g.coordinates) };
    if (g.type === 'MultiPolygon') return { ...g, coordinates: g.coordinates.map(poly) };
    if (g.type === 'GeometryCollection') return { ...g, geometries: g.geometries.map(rein) };
    return g;
  };
  if (geo.type === 'FeatureCollection')
    return { ...geo, features: geo.features.map(f => ({ ...f, geometry: rein(f.geometry) })) };
  return rein(geo);
}

/**
 * Bisektion auf dem Erhaltungsanteil, bis die Hausdorff-Grenze steht.
 * `keep-shapes` verhindert, dass kleine Flaechen ganz verschwinden.
 */
async function bisAufGrenze(geojson, proj, grenze, {maxLaeufe = 11} = {}) {
  const origR = projiziere(ringe(geojson), proj);
  let unten = 0.02, oben = 1.0, besteAnteil = 1.0, bestes = geojson, besteH = 0, laeufe = 0;

  // Erst pruefen, ob ueberhaupt vereinfacht werden kann.
  for (let n = 0; n < maxLaeufe; n++) {
    const mitte = (unten + oben) / 2;
    const v = await shaper(geojson,
      `-simplify percentage=${mitte.toFixed(4)} weighted keep-shapes`);
    const h = hausdorff(origR, projiziere(ringe(v), proj));
    laeufe++;
    if (h.d <= grenze) { besteAnteil = mitte; bestes = v; besteH = h.d; oben = mitte; }
    else unten = mitte;
    if (oben - unten < 0.004) break;
  }
  return { geo: bestes, anteil: besteAnteil, hausdorff: besteH, laeufe };
}

/* -------------------------------------------------------------- Projektion */

/** G7: Standardparallelen bei 1/6 und 5/6 der Breitenausdehnung. */
function kegel(geo, breitePx, hoehePx, amtlich) {
  const b = d3.geoBounds(geo);
  const [lat0, lat1] = [b[0][1], b[1][1]];
  const p = amtlich ?? [lat0 + (lat1 - lat0) / 6, lat0 + (lat1 - lat0) * 5 / 6];
  return d3.geoConicEqualArea().parallels(p).rotate([-(b[0][0] + b[1][0]) / 2, 0]);
}

function passe(proj, geo, breitePx) {
  proj.fitWidth(breitePx, geo);
  return proj;
}

/* ------------------------------------------------------------------ Ausgabe */

function svgPfad(geo, proj, skala) {
  const pfad = d3.geoPath(proj);
  const d = pfad(geo);
  if (!d) return '';
  // auf viewBox 0..1000 bringen und auf eine Nachkommastelle runden
  return d.replace(/-?\d+\.?\d*/g, (z) => (parseFloat(z) * skala).toFixed(1));
}

function teileUndLoecher(geo) {
  const g = geo.geometry || geo;
  if (g.type === 'Polygon') return { teile: 1, loecher: g.coordinates.length - 1 };
  if (g.type === 'MultiPolygon')
    return { teile: g.coordinates.length,
             loecher: g.coordinates.reduce((s, p) => s + p.length - 1, 0) };
  return { teile: 0, loecher: 0 };
}

/* ----------------------------------------------------------- Inselregel G9 */

/** Flaeche eines projizierten Rings in Bildpunkten (Schnürsenkelformel). */
function ringFlaeche(r) {
  let a = 0;
  for (let i = 0, n = r.length; i < n; i++) {
    const j = (i + 1) % n;
    a += r[i][0] * r[j][1] - r[j][0] * r[i][1];
  }
  return Math.abs(a) / 2;
}

/**
 * G9, zweistufig: alles, was bei der feinsten Stufe mindestens `minPx` mal
 * `minPx` Bildpunkte ergibt - PLUS eine von Hand gepflegte Liste.
 *
 * Das muss VOR der Vereinfachung geschehen und nicht als Nebenwirkung von
 * ihr. Sonst faellt eine Insel weg, ohne dass jemand es entschieden hat -
 * und sie dominiert dann jede Abstandsmessung, weil ihr ganzer Umriss
 * ploetzlich weit von allem entfernt liegt.
 */
function inselnFiltern(geo, proj, minPx = 4) {
  const grenze = minPx * minPx;
  let weg = 0, behalten = 0;
  const ringOk = (ring) => {
    const p = ring.map(([lon, lat]) => proj([lon, lat])).filter(Boolean);
    if (p.length < 4) return false;
    return ringFlaeche(p) >= grenze;
  };
  const polyFiltern = (poly) => {
    // Ring 0 ist die Aussenkante, alles weitere sind Loecher.
    if (!ringOk(poly[0])) { weg++; return null; }
    behalten++;
    return [poly[0], ...poly.slice(1).filter(ringOk)];
  };
  const features = geo.features.map(f => {
    const g = f.geometry;
    if (g.type === 'Polygon') {
      const p = polyFiltern(g.coordinates);
      return { ...f, geometry: p ? { type: 'Polygon', coordinates: p } : null };
    }
    if (g.type === 'MultiPolygon') {
      const ps = g.coordinates.map(polyFiltern).filter(Boolean);
      // keep-shapes von Hand: die groesste Flaeche bleibt in jedem Fall.
      if (!ps.length) {
        let best = null, bestA = -1;
        for (const poly of g.coordinates) {
          const a = ringFlaeche(poly[0].map(([lo, la]) => proj([lo, la])).filter(Boolean));
          if (a > bestA) { bestA = a; best = [poly[0]]; }
        }
        return { ...f, geometry: { type: 'MultiPolygon', coordinates: [best] } };
      }
      return { ...f, geometry: { type: 'MultiPolygon', coordinates: ps } };
    }
    return f;
  }).filter(f => f.geometry);
  return { geo: { type: 'FeatureCollection', features }, weg, behalten };
}

export { ringe, projiziere, hausdorff, shaper, bisAufGrenze, kegel, passe, svgPfad,
         teileUndLoecher, ringFlaeche, inselnFiltern, nachD3, alsSammlung, vorzeichenFlaeche,
         ROH, AUS, HAUSDORFF_GRENZE };

/* -------------------------------------------------- Anker und Beschriftung */

/** Punkt-in-Polygon mit Loechern (gerade-ungerade). */
function imRing(x, y, r) {
  let drin = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}
function imPolygon(x, y, poly) {
  if (!imRing(x, y, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) if (imRing(x, y, poly[i])) return false;  // Loch
  return true;
}
function abstandZumRand(x, y, poly) {
  let min = Infinity;
  for (const ring of poly)
    for (let i = 0; i + 1 < ring.length; i++) {
      const d = abstandSeg(x, y, ring[i][0], ring[i][1], ring[i+1][0], ring[i+1][1]);
      if (d < min) min = d;
    }
  return imPolygon(x, y, poly) ? min : -min;
}

/**
 * Pol der Unzugaenglichkeit: der Punkt IM Gebiet mit dem groessten Abstand
 * zum Rand. NICHT der Schwerpunkt - der Schwerpunkt Italiens liegt im Meer,
 * der von Bremen zwischen seinen beiden Teilen.
 *
 * Der Abstand ist zugleich der Radius des groessten Kreises, der ins Gebiet
 * passt - und entscheidet damit, ob der Name hineinpasst (Befund G10).
 */
function polDerUnzugaenglichkeit(polygone) {
  // Nur der groesste Teil - der Anker gehoert nach Bremen-Stadt, nicht
  // zwischen Bremen und Bremerhaven.
  let poly = null, best = -1;
  for (const p of polygone) {
    const a = ringFlaeche(p[0]);
    if (a > best) { best = a; poly = p; }
  }
  if (!poly) return null;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for (const [x,y] of poly[0]) { x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y); }
  let beste = null, besterAbstand = -Infinity, schritt = Math.max(x1-x0, y1-y0) / 24;
  let mx = (x0+x1)/2, my = (y0+y1)/2;
  for (let runde = 0; runde < 7; runde++) {
    for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
      const x = mx + i*schritt, y = my + j*schritt;
      const d = abstandZumRand(x, y, poly);
      if (d > besterAbstand) { besterAbstand = d; beste = [x,y]; }
    }
    if (beste) { mx = beste[0]; my = beste[1]; }
    schritt /= 3;
  }
  return { punkt: beste, radius: besterAbstand };
}

export { imPolygon, abstandZumRand, polDerUnzugaenglichkeit };
