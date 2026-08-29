import { C, WORLD_H, WORLD_W } from '../data/config';
import { MAPS } from '../data/maps';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../data/difficulty';
import { PERKS } from '../data/perks';
import type { Menu, Hotspot } from '../game/menu';
import { hexA } from './glow';
import { endlosBesten } from '../core/storage';

/** Die Landkarte zeichnen.
 *
 *  Alle anklickbaren Bereiche werden beim Zeichnen angelegt. Dadurch kann es
 *  keine Schaltfläche geben, die man sieht, aber nicht trifft - der häufigste
 *  Fehler der bisherigen Oberfläche, zuletzt der zweite Zweigknopf, der unter
 *  den Bildschirmrand gerutscht war. */
export function drawMenu(ctx: CanvasRenderingContext2D, m: Menu): void {
  m.hotspots = [];

  // Der Grund bleibt stehen, der Inhalt wechselt. Beides zugleich zu
  // ueberblenden saehe nach Ladebildschirm aus - der Ort ist ja derselbe,
  // nur die Auskunft darueber ist eine andere.
  backdrop(ctx, m.time);

  // Der Uebergang: einblenden und ein Stueck heraufziehen (D5).
  //
  // **Die Trefferflaechen wandern mit.** Sie werden beim Zeichnen angelegt,
  // und das Zeichnen ist waehrend des Uebergangs verschoben - stuenden sie
  // an der Endlage, gaebe es fuer zwei Zehntelsekunden Knoepfe, die man
  // sieht, aber nicht trifft. Genau der Fehler, gegen den diese Datei von
  // Anfang an gebaut ist.
  const p = m.uebergang();
  const ease = 1 - (1 - p) ** 3;
  const dy = (1 - ease) * WORLD_H * 0.03;
  const add = (h: Hotspot): Hotspot => {
    m.hotspots.push(dy ? { ...h, y: h.y + dy } : h);
    return h;
  };

  ctx.save();
  ctx.globalAlpha = ease;
  if (dy) ctx.translate(0, dy);
  if (m.view === 'result') drawResult(ctx, m, add);
  else if (m.view === 'map') drawMap(ctx, m, add);
  else if (m.view === 'brief') drawBrief(ctx, m, add);
  else drawProgress(ctx, m, add);
  ctx.restore();

  // **Die Tastaturmarkierung (D8) - gezeichnet, nicht als HTML.**
  //
  // Im Menue ist jedes Bedienelement gemalt; ein fokussierbarer HTML-Knopf
  // waere hier Spielbedienung im Menue und damit Regel 6. Also wird auch
  // die Markierung gemalt.
  //
  // Sie steht NACH dem Ausblenden des Uebergangs und ausserhalb des
  // verschobenen Blocks: die Trefferflaechen in `m.hotspots` tragen den
  // Versatz bereits (siehe `add`), ein zweites Verschieben legte den Rahmen
  // doppelt daneben.
  //
  // Zwei Ringe statt eines: ein dunkler aussen, ein heller innen. Ein
  // einzelner Ring verschwindet je nach Untergrund - auf dem hellen
  // Kartenknopf der eine, auf dem dunklen Grund der andere. So traegt immer
  // einer von beiden, dieselbe Ueberlegung wie bei der Zierde in v135.
  const wahl = m.tastenKnopf();
  if (wahl) {
    const r = wahl.round ? wahl.w / 2 + 8 : 10;
    const x = wahl.x - 6, y = wahl.y - 6, w = wahl.w + 12, h = wahl.h + 12;
    ctx.save();
    for (const [farbe, breite] of [[hexA(C.ink, 0.75), 7], [C.crystal, 3]] as const) {
      ctx.strokeStyle = farbe;
      ctx.lineWidth = breite;
      ctx.beginPath();
      if (wahl.round) ctx.arc(wahl.x + wahl.w / 2, wahl.y + wahl.h / 2, r, 0, Math.PI * 2);
      else roundRectPfad(ctx, x, y, w, h, r);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Ein abgerundetes Rechteck als Pfad - ohne `roundRect`.
 *
 *  `CanvasRenderingContext2D.roundRect` gibt es erst ab Safari 16.4. Das
 *  Zielgeraet ist ein iPhone, und Regel 11 hat dieses Verzeichnis schon
 *  einmal ein schwarzes Bild gekostet: hier wird nichts benutzt, was auf
 *  einem aelteren Safari wirft. */
function roundRectPfad(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  const k = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

// ------------------------------------------------------------------ Grundbild

function backdrop(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, WORLD_W * 0.4, WORLD_H);
  g.addColorStop(0, '#0D1730');
  g.addColorStop(0.55, '#0A1224');
  g.addColorStop(1, '#060A16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Ein paar Sterne und ein weicher Lichtschein - genug Atmosphäre, dass es
  // nach Ort aussieht, wenig genug, dass die Orte darauf lesbar bleiben.
  let seed = 99;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 90; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H * 0.9;
    const a = 0.1 + rnd() * 0.3 + Math.sin(t * 1.4 + i) * 0.05;
    ctx.fillStyle = `rgba(200,225,255,${a.toFixed(3)})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const glow = ctx.createRadialGradient(
    WORLD_W * 0.5, WORLD_H * 0.34, 40, WORLD_W * 0.5, WORLD_H * 0.34, WORLD_W * 0.6,
  );
  glow.addColorStop(0, 'rgba(127,231,224,0.1)');
  glow.addColorStop(1, 'rgba(127,231,224,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

// ------------------------------------------------------------------ Die Karte

function drawMap(
  ctx: CanvasRenderingContext2D, m: Menu, add: (h: Hotspot) => Hotspot,
): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = C.stone;
  ctx.font = '700 68px system-ui, sans-serif';
  ctx.fillText('Towerfront', WORLD_W / 2, 130);
  ctx.font = '400 26px system-ui, sans-serif';
  ctx.fillStyle = C.stoneDark;
  ctx.fillText('Wähle ein Land', WORLD_W / 2, 172);

  // Der Weg zwischen den Orten - gestrichelt, wie auf einer Wanderkarte.
  ctx.save();
  ctx.strokeStyle = hexA(C.stoneDark, 0.5);
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 14]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m.nodes[0].x, m.nodes[0].y);
  for (let i = 1; i < m.nodes.length; i++) {
    const a = m.nodes[i - 1], b = m.nodes[i];
    ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 90, b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < MAPS.length; i++) {
    const map = MAPS[i];
    const n = m.nodes[i];
    const r = 84;
    const stars = m.starsOf(map.id);
    const pressed = m.pressed === `node:${i}`;
    const k = pressed ? 0.95 : 1;

    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.scale(k, k);

    // Der Ort selbst: eine Scheibe in der Farbwelt seines Bioms. So erkennt
    // man ihn wieder, wenn man später darin steht.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(0, 8, r, 0, Math.PI * 2); ctx.fill();
    const face = ctx.createLinearGradient(0, -r, 0, r);
    face.addColorStop(0, map.palette.terrainHi);
    face.addColorStop(1, map.palette.terrainLo);
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

    // Ein Stück Weg im Ort - die Vorschau auf das, was einen erwartet.
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 4, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = map.palette.path;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r, 26);
    ctx.bezierCurveTo(-r * 0.3, 60, r * 0.2, -50, r, -14);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = hexA(C.stone, 0.55);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

    // Sterne über dem Ort - gezeichnet, nicht als Schriftzeichen. Ein
    // Sternsymbol fehlt in manchen Schriften und wird dann zum Kästchen.
    for (let k2 = 0; k2 < 3; k2++) {
      star(ctx, (k2 - 1) * 44, -r - 34, 17, k2 < stars);
    }

    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillStyle = C.stone;
    ctx.fillText(map.name, 0, r + 44);
    ctx.font = '400 21px system-ui, sans-serif';
    ctx.fillStyle = C.stoneDark;
    ctx.fillText(`${map.lanes.length > 1 ? `${map.lanes.length} Zuwege` : 'ein Zuweg'}`, 0, r + 74);
    ctx.restore();

    add({ id: `node:${i}`, x: n.x - r, y: n.y - r, w: r * 2, h: r * 2, round: true });
  }

  // Fortsetzen, falls ein Spielstand da ist - das ist die häufigste Absicht,
  // also steht es vorn und nicht in einer Unterebene.
  if (m.hasSave) {
    button(ctx, add, 'resume', WORLD_W / 2 - 300, WORLD_H - 132, 600, 76,
      m.saveLabel, C.crystal, m.pressed === 'resume', true);
  }

  // Fortschritt als eigener Ort am Rand.
  const px = WORLD_W - 190, py = 96;
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillStyle = C.gold;
  ctx.fillText(`${m.free()} frei`, WORLD_W - 60, py + 4);
  star(ctx, WORLD_W - 60 - ctx.measureText(`${m.free()} frei`).width - 22, py - 5, 13, true);
  ctx.font = '400 19px system-ui, sans-serif';
  ctx.fillStyle = C.stoneDark;
  ctx.fillText('Fortschritt ›', WORLD_W - 60, py + 34);
  ctx.restore();
  add({ id: 'progress', x: px - 60, y: py - 34, w: 250, h: 84 });

  // Einstellungen (D6) - auf der LEINWAND, nicht als HTML-Knopf.
  //
  // Der erste Anlauf setzte ein Zahnrad als HTML-Element in die Ecke, und das
  // Browsertor hat es sofort gemeldet: im Menue ist jedes bedienbare
  // HTML-Element Spielbedienung (Regel 6). Die Regel ist in diesem
  // Verzeichnis dreimal gebrochen worden und jedes Mal teuer gewesen - ein
  // Loch fuer den einen guten Fall haette den vierten vorbereitet. Der
  // Dialog selbst bleibt HTML; er erscheint erst, wenn jemand hier tippt.
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = '400 19px system-ui, sans-serif';
  ctx.fillStyle = C.stoneDark;
  ctx.fillText('Einstellungen ›', WORLD_W - 60, py + 86);
  ctx.restore();
  // Dieselbe Trefferhoehe wie "Fortschritt" darueber: 48 Weltpunkte waren
  // auf dem Telefon gerechnet zu klein, und der Rauchtest hat es gemeldet.
  add({ id: 'optionen', x: px - 60, y: py + 52, w: 250, h: 76 });
}

// -------------------------------------------------------------- Die Einweisung

function drawBrief(
  ctx: CanvasRenderingContext2D, m: Menu, add: (h: Hotspot) => Hotspot,
): void {
  const map = MAPS[m.picked];
  const x0 = WORLD_W * 0.5 - 520, y0 = 130, w = 1040;

  ctx.save();
  ctx.fillStyle = 'rgba(8,13,28,0.88)';
  roundRect(ctx, x0, y0, w, 780, 28); ctx.fill();
  ctx.strokeStyle = hexA(C.crystal, 0.3); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  back(ctx, add, x0 + 34, y0 + 30, m.pressed === 'back');

  ctx.textAlign = 'left';
  ctx.fillStyle = C.stone;
  ctx.font = '700 54px system-ui, sans-serif';
  ctx.fillText(map.name, x0 + 60, y0 + 132);

  ctx.font = '400 24px system-ui, sans-serif';
  ctx.fillStyle = C.stoneDark;
  wrap(ctx, map.blurb, x0 + 60, y0 + 180, w - 120, 34);

  // Was erwartet mich - die Einweisung, die im Vorbild vor jeder Stufe steht.
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillStyle = hexA(C.crystal, 0.9);
  ctx.fillText('WAS DICH ERWARTET', x0 + 60, y0 + 262);
  ctx.font = '400 23px system-ui, sans-serif';
  ctx.fillStyle = C.stone;
  const facts = [
    `${map.waves.length} Wellen · ${map.lanes.length > 1 ? `${map.lanes.length} Zuwege, die sich vereinen` : 'ein Zuweg'}`,
    `Bisher am weitesten: ${m.bestOf(map.id)}`,
  ];
  facts.forEach((f, i) => ctx.fillText(f, x0 + 60, y0 + 302 + i * 36));

  // Schwierigkeit - an der Stufe, nicht global. Genau wie im Vorbild.
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillStyle = hexA(C.crystal, 0.9);
  ctx.fillText('SCHWIERIGKEIT', x0 + 60, y0 + 420);
  DIFFICULTY_ORDER.forEach((id, i) => {
    const d = DIFFICULTIES[id];
    const bw = (w - 160) / 3, bx = x0 + 60 + i * (bw + 20);
    const on = m.difficulty === id;
    // Nur die halbe Beschreibung: der Knopf ist kein Absatz. Beim ersten
    // Versuch lief der Text unten heraus.
    const short = d.blurb.split('.')[0];
    button(ctx, add, `diff:${id}`, bx, y0 + 446, bw, 118,
      d.name, on ? C.crystal : C.stoneDark, m.pressed === `diff:${id}`, on, short);
  });

  // Modus als Umschalter, nicht als zwei Kacheln.
  button(ctx, add, 'endless', x0 + 60, y0 + 590, 330, 66,
    m.endless ? 'Endlos: an' : 'Endlos: aus',
    m.endless ? C.gold : C.stoneDark, m.pressed === 'endless', m.endless);

  // Die weitesten Endlosläufe auf DIESER Karte (C27).
  //
  // Sie stehen neben dem Umschalter und nur dann, wenn es welche gibt: eine
  // leere Bestenliste ist kein Ansporn, sondern eine Lücke im Bild. Ein
  // einzelner Bestwert sagt, wie weit man EINMAL kam - die kurze Reihe sagt,
  // wie weit man üblicherweise kommt, und das ist die Auskunft, nach der man
  // im Endlosmodus sucht.
  const besten = endlosBesten(map.id);
  if (besten.length) {
    ctx.save();
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillStyle = C.stoneDark;
    ctx.fillText('WEITESTE ENDLOSLÄUFE', x0 + 420, y0 + 594);
    ctx.font = '700 26px system-ui, sans-serif';
    besten.slice(0, 5).forEach((welle, i) => {
      ctx.fillStyle = i === 0 ? C.gold : C.stoneDark;
      ctx.fillText(`${welle}`, x0 + 420 + i * 66, y0 + 628);
    });
    ctx.restore();
  }

  button(ctx, add, 'start', x0 + w - 60 - 420, y0 + 662, 420, 92,
    'Spielen', C.crystal, m.pressed === 'start', true);
}

// ------------------------------------------------------------- Der Fortschritt

function drawProgress(
  ctx: CanvasRenderingContext2D, m: Menu, add: (h: Hotspot) => Hotspot,
): void {
  const x0 = WORLD_W * 0.5 - 560, y0 = 120, w = 1120;
  ctx.save();
  ctx.fillStyle = 'rgba(8,13,28,0.88)';
  roundRect(ctx, x0, y0, w, 820, 28); ctx.fill();
  ctx.strokeStyle = hexA(C.crystal, 0.3); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  back(ctx, add, x0 + 34, y0 + 30, m.pressed === 'back');

  ctx.textAlign = 'left';
  ctx.fillStyle = C.stone;
  ctx.font = '700 46px system-ui, sans-serif';
  ctx.fillText('Fortschritt', x0 + 60, y0 + 122);
  ctx.font = '400 24px system-ui, sans-serif';
  ctx.fillStyle = C.stoneDark;
  ctx.fillText(
    `${m.free()} von ${m.earned()} verdienten Sternen noch frei`, x0 + 60, y0 + 164,
  );

  const list = m.perkList();
  list.forEach((p, i) => {
    const def = PERKS[p.id];
    const bx = x0 + 60, by = y0 + 210 + i * 118;
    const bw = w - 120;
    const tone = p.owned ? C.crystal : p.affordable ? C.gold : C.stoneDark;
    ctx.save();
    ctx.fillStyle = hexA(tone, p.owned ? 0.14 : 0.07);
    roundRect(ctx, bx, by, bw, 100, 16); ctx.fill();
    ctx.strokeStyle = hexA(tone, p.owned ? 0.8 : 0.4); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillStyle = C.stone;
    ctx.fillText(def.name, bx + 26, by + 42);
    ctx.font = '400 21px system-ui, sans-serif';
    ctx.fillStyle = C.stoneDark;
    ctx.fillText(def.blurb, bx + 26, by + 74);

    ctx.textAlign = 'right';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillStyle = p.owned ? C.crystal : C.gold;
    ctx.fillText(p.owned ? 'gekauft' : `${def.cost}`, bx + bw - 26, by + 58);
    if (!p.owned) star(ctx, bx + bw - 26 - 34, by + 50, 12, true);

    if (!p.owned && p.affordable) add({ id: `perk:${p.id}`, x: bx, y: by, w: bw, h: 100 });
  });
}

// -------------------------------------------------------------- Das Ergebnis

/** Der Bildschirm nach einer Partie.
 *
 *  Die Sterne fliegen nacheinander auf, mit kurzer Verzögerung zwischen
 *  ihnen. Das ist kein Zierrat: der zweite und dritte Stern sind das Ziel,
 *  auf das man beim nächsten Anlauf hinspielt, und sie brauchen einen Moment
 *  Aufmerksamkeit. Springt alles gleichzeitig ins Bild, liest man nur "zwei".
 */
function drawResult(
  ctx: CanvasRenderingContext2D, m: Menu, add: (h: Hotspot) => Hotspot,
): void {
  const r = m.result;
  if (!r) { drawMap(ctx, m, add); return; }

  const x0 = WORLD_W * 0.5 - 470, y0 = 118, w = 940, h = 780;
  ctx.save();
  ctx.fillStyle = 'rgba(8,13,28,0.9)';
  roundRect(ctx, x0, y0, w, h, 28); ctx.fill();
  ctx.strokeStyle = hexA(r.won ? C.crystal : C.danger, 0.35);
  ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = r.won ? C.crystal : C.danger;
  ctx.font = '700 62px system-ui, sans-serif';
  ctx.fillText(r.won ? 'Gehalten' : 'Durchbruch', WORLD_W / 2, y0 + 108);

  ctx.font = '400 25px system-ui, sans-serif';
  ctx.fillStyle = C.stoneDark;
  ctx.fillText(
    r.won
      ? `${r.mapName} · alle ${r.waves} Wellen überstanden`
      : `${r.mapName} · Welle ${r.wave} von ${r.waves}`,
    WORLD_W / 2, y0 + 152,
  );

  // Sterne, nacheinander eingeblendet.
  for (let i = 0; i < 3; i++) {
    const due = 0.25 + i * 0.3;
    const t = Math.max(0, Math.min(1, (m.resultAge - due) / 0.35));
    const earned = i < r.stars;
    const pop = earned ? 1 + Math.sin(t * Math.PI) * 0.35 : 1;
    ctx.save();
    // MAL der Deckkraft, die schon anliegt, nicht statt ihr: waehrend des
    // Ansichtswechsels steht hier der Uebergang drin, und eine absolute
    // Zuweisung haette die Sterne allein voll sichtbar stehen lassen,
    // waehrend alles andere um sie herum noch einblendet.
    ctx.globalAlpha *= earned ? t : 0.9;
    star(ctx, WORLD_W / 2 + (i - 1) * 130, y0 + 268, 52 * pop, earned);
    ctx.restore();
    if (!earned) { star(ctx, WORLD_W / 2 + (i - 1) * 130, y0 + 268, 52, false); }
  }

  // Ein neuer Stern ist die eigentliche Nachricht - er wird benannt.
  if (r.stars > r.before) {
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillStyle = C.gold;
    ctx.fillText(
      r.stars - r.before === 1 ? 'Ein neuer Stern' : `${r.stars - r.before} neue Sterne`,
      WORLD_W / 2, y0 + 372,
    );
  }

  // Vier Zahlen, nicht zehn. Was man nicht vergleichen kann, hilft nicht.
  const facts: [string, string][] = [
    ['Kristall', `${r.lives} von ${r.maxLives}`],
    ['Erledigt', `${r.kills}`],
    ['Türme gebaut', `${r.built}`],
    ['Dauer', `${Math.floor(r.duration / 60)}:${String(Math.floor(r.duration % 60)).padStart(2, '0')}`],
  ];
  facts.forEach(([k, v], i) => {
    const cx = x0 + 90 + (i % 2) * (w - 180) / 2 + (w - 180) / 4;
    const cy = y0 + 442 + Math.floor(i / 2) * 96;
    ctx.font = '400 19px system-ui, sans-serif';
    ctx.fillStyle = C.stoneDark;
    ctx.fillText(k, cx, cy);
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillStyle = C.stone;
    ctx.fillText(v, cx, cy + 40);
  });

  // Der wahrscheinlichere Wunsch ist gefüllt: nach einem Sieg zieht man
  // weiter, nach einer Niederlage versucht man es noch einmal. Beim ersten
  // Anlauf war "Noch einmal" immer hervorgehoben - das schickt den Spieler
  // nach einem gewonnenen Level in dasselbe Level zurück.
  const bw = (w - 200) / 2;
  button(ctx, add, 'tomap', x0 + 70, y0 + h - 128, bw, 88,
    'Zur Karte', r.won ? C.crystal : C.stoneDark, m.pressed === 'tomap', r.won);
  button(ctx, add, 'retry', x0 + 70 + bw + 60, y0 + h - 128, bw, 88,
    'Noch einmal', r.won ? C.stoneDark : C.crystal, m.pressed === 'retry', !r.won);
}

// --------------------------------------------------------------------- Bausteine

function button(
  ctx: CanvasRenderingContext2D, add: (h: Hotspot) => Hotspot,
  id: string, x: number, y: number, w: number, h: number,
  label: string, tone: string, pressed: boolean, filled: boolean, sub?: string,
): void {
  ctx.save();
  const k = pressed ? 0.98 : 1;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(k, k);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = filled ? hexA(tone, 0.9) : hexA(tone, 0.1);
  roundRect(ctx, 0, 0, w, h, 14); ctx.fill();
  if (!filled) { ctx.strokeStyle = hexA(tone, 0.5); ctx.lineWidth = 2; ctx.stroke(); }
  ctx.textAlign = 'center';
  ctx.fillStyle = filled ? '#08131C' : C.stone;
  ctx.font = `700 ${sub ? 26 : 32}px system-ui, sans-serif`;
  ctx.fillText(label, w / 2, sub ? 42 : h / 2 + 11);
  if (sub) {
    ctx.font = '400 17px system-ui, sans-serif';
    ctx.fillStyle = filled ? 'rgba(8,19,28,0.78)' : C.stoneDark;
    wrap(ctx, sub, w / 2, 72, w - 30, 22);
  }
  ctx.restore();
  add({ id, x, y, w, h });
}

function back(
  ctx: CanvasRenderingContext2D, add: (h: Hotspot) => Hotspot,
  x: number, y: number, pressed: boolean,
): void {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = '400 26px system-ui, sans-serif';
  ctx.fillStyle = pressed ? C.stone : C.stoneDark;
  ctx.fillText('‹ Zurück', x, y + 26);
  ctx.restore();
  add({ id: 'back', x: x - 20, y: y - 14, w: 200, h: 66 });
}

function wrap(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  max: number, lh: number, centre = false,
): void {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, yy); yy += lh; line = word;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
  void centre;
}

/** Ein gezeichneter Stern. */
function star(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number, filled: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.44;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = C.gold; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  } else {
    ctx.strokeStyle = hexA(C.stoneDark, 0.7); ctx.lineWidth = 2.5; ctx.stroke();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
