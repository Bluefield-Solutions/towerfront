import { C, LICHT } from '../data/config';
import { makeRng } from '../core/math';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { TOWERS, accentFor, type BranchIndex, type TowerDef, type TowerId } from '../data/towers';
import { hexA } from './glow';

/** Vorgebackene Bilder.
 *
 *  Gegner und Turmwaffen wurden bisher in jedem Bild als Vektorpfad neu
 *  gezeichnet: Pfad oeffnen, Punkte setzen, fuellen, Farbe wechseln - ein
 *  Dutzend Befehle pro Objekt. Bei 55 Gegnern und 170 Tuermen summiert sich
 *  das zu tausenden Befehlen je Bild.
 *
 *  Hier entsteht jede Form genau einmal in einem eigenen Bild. Im Spiel bleibt
 *  davon ein einziger `drawImage`-Aufruf pro Objekt. Gedreht wird beim
 *  Zeichnen, nicht beim Backen - sonst braeuchte man je Winkel ein Bild. */

/** Ueberabtastung: doppelt so fein gebacken, damit es auf grossen Bildschirmen
 *  nicht weich wird. */
const SS = 2;

const cache = new Map<string, HTMLCanvasElement>();

function bake(
  key: string, w: number, h: number,
  draw: (g: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w * SS));
  cv.height = Math.max(1, Math.ceil(h * SS));
  const g = cv.getContext('2d')!;
  g.setTransform(SS, 0, 0, SS, (w / 2) * SS, (h / 2) * SS);
  draw(g);
  cache.set(key, cv);
  return cv;
}

/** Zeichnet ein gebackenes Bild mittig auf (x, y). Ein einziger Befehl. */
export function drawSprite(
  ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement,
  x: number, y: number, scale = 1,
): void {
  const w = (sprite.width / SS) * scale;
  const h = (sprite.height / SS) * scale;
  ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
}

// ------------------------------------------------------------------ Gegner

/** Wie viele Einzelbilder ein Laufzyklus hat. Mehr Bilder kosten nur
 *  Speicher beim Backen, im Spiel bleibt es ein einziger Zeichenbefehl. */
export const ENEMY_FRAMES = 6;

/** Ein Bild je Gegnerart, Laufphase und Trefferblitz. */
export function getEnemySprite(id: EnemyId, flash: boolean, frame = 0): HTMLCanvasElement {
  const def = ENEMIES[id];
  const r = def.radius;
  const box = r * 3.1;
  const f = ((frame % ENEMY_FRAMES) + ENEMY_FRAMES) % ENEMY_FRAMES;
  return bake(`enemy:${id}:${flash ? 'f' : 'n'}:${f}`, box, box, (g) => {
    paintEnemyBody(g, id, f / ENEMY_FRAMES);
    if (flash) {
      // Weiss ueber die vorhandene Form legen - die Silhouette bleibt exakt.
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#FFFFFF';
      g.fillRect(-box, -box, box * 2, box * 2);
      g.globalCompositeOperation = 'source-over';
    }
  });
}

/** `phase` laeuft von 0 bis 1 durch den Bewegungszyklus. */
function paintEnemyBody(g: CanvasRenderingContext2D, id: EnemyId, phase: number): void {
  const def = ENEMIES[id];
  const r = def.radius;
  const sw = Math.sin(phase * Math.PI * 2);      // -1..1, weich
  const st = Math.sin(phase * Math.PI * 4);      // doppelt so schnell (Schritte)
  if (id === 'runner') {
    // Nach rechts zeigend gebacken, im Spiel wird gedreht.
    g.fillStyle = def.body;
    g.beginPath();
    g.moveTo(r * 1.3, 0); g.lineTo(-r * 0.8, r * 0.8);
    g.lineTo(-r * 0.3, 0); g.lineTo(-r * 0.8, -r * 0.8);
    g.closePath(); g.fill();
    g.fillStyle = def.trim;
    g.beginPath(); g.arc(r * 0.4, 0, r * 0.28, 0, Math.PI * 2); g.fill();
    return;
  }
  if (id === 'flyer') {
    // Fluegelschlag: die Spannweite atmet, der Rumpf bleibt ruhig.
    const beat = 0.62 + 0.38 * (0.5 + 0.5 * sw);
    g.fillStyle = def.trim;
    g.beginPath();
    g.moveTo(-r * 0.2, 0);
    g.lineTo(-r * 1.2, -r * 1.05 * beat); g.lineTo(r * 0.35, -r * 0.3 * beat);
    g.lineTo(r * 0.35, r * 0.3 * beat); g.lineTo(-r * 1.2, r * 1.05 * beat);
    g.closePath(); g.fill();
    g.globalAlpha = 0.35;
    g.beginPath();
    g.moveTo(-r * 0.2, 0);
    g.lineTo(-r * 1.1, -r * 1.3 * (1.4 - beat)); g.lineTo(r * 0.2, 0);
    g.lineTo(-r * 1.1, r * 1.3 * (1.4 - beat));
    g.closePath(); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = def.body;
    g.beginPath();
    g.moveTo(r * 1.25, 0); g.lineTo(-r * 0.5, r * 0.5);
    g.lineTo(-r * 0.75, 0); g.lineTo(-r * 0.5, -r * 0.5);
    g.closePath(); g.fill();
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.arc(r * 0.5, 0, r * 0.18, 0, Math.PI * 2); g.fill();
    return;
  }
  if (id === 'splitter') {
    // Der Riss in der Mitte kuendigt an, was beim Tod passiert.
    g.fillStyle = def.body;
    g.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
    g.strokeStyle = def.trim; g.lineWidth = 3; g.stroke();
    const gap = 1 + 0.5 * (0.5 + 0.5 * sw);
    g.strokeStyle = C.ink; g.lineWidth = 3 * gap;
    g.beginPath();
    g.moveTo(-r * 0.15 * gap, -r); g.lineTo(r * 0.12 * gap, -r * 0.2);
    g.lineTo(-r * 0.12 * gap, r * 0.25); g.lineTo(r * 0.1 * gap, r);
    g.stroke();
    g.strokeStyle = hexA(def.trim, 0.5); g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, r * 0.78, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    return;
  }
  if (id === 'splitling') {
    g.rotate(phase * Math.PI * 2);
    g.fillStyle = def.body;
    g.beginPath();
    g.moveTo(0, -r); g.lineTo(r * 0.9, r * 0.7); g.lineTo(-r * 0.9, r * 0.7);
    g.closePath(); g.fill();
    g.fillStyle = def.trim;
    g.beginPath(); g.arc(0, r * 0.05, r * 0.28, 0, Math.PI * 2); g.fill();
    return;
  }
  if (id === 'brute' || id === 'titan') {
    // Zwei Beine, die abwechselnd tragen - dazu wiegt sich der Koerper.
    g.fillStyle = hexA(C.ink, 0.55);
    g.fillRect(-r * 0.62, r * 0.55 + st * r * 0.14, r * 0.42, r * 0.5);
    g.fillRect(r * 0.2, r * 0.55 - st * r * 0.14, r * 0.42, r * 0.5);

    g.save();
    g.translate(0, -Math.abs(st) * r * 0.09);
    g.rotate(sw * 0.05);
    const sides = def.boss ? 8 : 6;
    g.fillStyle = def.body;
    g.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + Math.PI / sides;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
    // Lichtkante oben, Schattenkante unten - das gibt der Flaeche Koerper.
    g.strokeStyle = def.trim; g.lineWidth = def.boss ? 5 : 3; g.stroke();
    g.strokeStyle = hexA('#FFFFFF', 0.3); g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, r * 0.82, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    const core = 0.8 + 0.2 * (0.5 + 0.5 * sw);
    g.fillStyle = def.trim;
    g.fillRect(-r * 0.5 * core, -r * 0.15 * core, r * core, r * 0.3 * core);
    g.restore();
    return;
  }
  // Kriechen: der Koerper staucht und streckt, drei Fuesse laufen mit.
  const squash = 1 + sw * 0.11;
  g.fillStyle = hexA(C.ink, 0.5);
  for (let i = 0; i < 3; i++) {
    const px = (i - 1) * r * 0.6;
    const lift = Math.sin(phase * Math.PI * 2 + i * 2.1) * r * 0.16;
    g.beginPath(); g.ellipse(px, r * 0.78 - lift, r * 0.17, r * 0.12, 0, 0, Math.PI * 2); g.fill();
  }
  g.save();
  g.scale(1 / squash, squash);
  g.fillStyle = def.body;
  g.beginPath(); g.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = hexA('#FFFFFF', 0.16);
  g.beginPath(); g.ellipse(0, -r * 0.32, r * 0.72, r * 0.34, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = def.trim;
  g.beginPath(); g.arc(-r * 0.32, -r * 0.15, r * 0.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(r * 0.32, -r * 0.15, r * 0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.ink;
  g.beginPath(); g.arc(-r * 0.3, -r * 0.13, r * 0.09, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(r * 0.34, -r * 0.13, r * 0.09, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** Bodenschatten, nach Radius gestaffelt - so teilen sich viele Gegner
 *  dasselbe Bild. */
export function getShadow(radius: number): HTMLCanvasElement {
  const r = Math.round(radius / 4) * 4;
  return bake(`shadow:${r}`, r * 2.2, r * 1.1, (g) => {
    g.fillStyle = hexA(C.ink, 0.35);
    g.beginPath(); g.ellipse(0, 0, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); g.fill();
  });
}

// ------------------------------------------------------------------ Tuerme

/** Sockel samt Schatten und Stufenpunkten. Aendert sich nur beim Bauen,
 *  Ausbauen oder Verkaufen. */
export function getTowerBase(id: TowerId, branch: BranchIndex, level: number): HTMLCanvasElement {
  const def = TOWERS[id];
  const accent = accentFor(def, branch);
  const bid = branch === null ? '' : def.branches[branch].id;
  return bake(`base:${id}:${branch}:${level}`, 86, 86, (g) => {
    const grow = 1 + (level - 1) * 0.12;
    g.fillStyle = hexA(C.ink, 0.4);
    g.beginPath(); g.ellipse(0, 21, 27, 10, 0, 0, Math.PI * 2); g.fill();

    g.save();
    g.scale(grow, grow);
    g.fillStyle = C.stoneDark;
    roundRect(g, -24, -8, 48, 28, 8); g.fill();
    g.fillStyle = def.color;
    roundRect(g, -22, -14, 44, 20, 7); g.fill();
    g.fillStyle = hexA(C.ink, 0.25);
    roundRect(g, -22, 0, 44, 6, 3); g.fill();
    // Ab Stufe 2 bekommt jeder Zweig einen eigenen Aufbau. Die Farbe allein
    // reicht nicht - im Gewuehl erkennt man einen Umriss schneller als einen
    // Farbton, und auf dem Handy ist der Turm keine 45 Bildpunkte gross.
    if (level >= 2) {
      g.fillStyle = def.color;
      switch (bid) {
        case 'sniper': // schlanker hoher Turm mit Ausguck
          roundRect(g, -7, -34, 14, 26, 4); g.fill();
          g.fillStyle = accent;
          roundRect(g, -10, -36, 20, 6, 3); g.fill();
          break;
        case 'volley': // breite Zinnen, drei Scharten
          for (let i = -1; i <= 1; i++) { roundRect(g, i * 13 - 5, -24, 10, 14, 2); g.fill(); }
          break;
        case 'eternal': // Eisring auf Saeulen
          g.strokeStyle = accent; g.lineWidth = 3;
          g.beginPath(); g.arc(0, -20, 17, Math.PI * 0.15, Math.PI * 0.85, true); g.stroke();
          roundRect(g, -20, -22, 6, 14, 2); g.fill();
          roundRect(g, 14, -22, 6, 14, 2); g.fill();
          break;
        case 'shard': // aufgestellte Klingen
          g.fillStyle = accent;
          for (const o of [-14, 0, 14]) {
            g.beginPath();
            g.moveTo(o, -34); g.lineTo(o + 5, -12); g.lineTo(o - 5, -12);
            g.closePath(); g.fill();
          }
          break;
        case 'cluster': // flacher breiter Kasten mit Klappen
          roundRect(g, -25, -22, 50, 14, 4); g.fill();
          g.fillStyle = accent;
          roundRect(g, -22, -26, 10, 6, 2); g.fill();
          roundRect(g, 12, -26, 10, 6, 2); g.fill();
          break;
        case 'breaker': // massiver Bunker mit Baendern
          roundRect(g, -20, -26, 40, 18, 3); g.fill();
          g.fillStyle = accent;
          g.fillRect(-20, -20, 40, 3);
          g.fillRect(-20, -12, 40, 3);
          break;
        case 'fork': // drei kleine Traeger
          g.fillStyle = accent;
          for (const o of [-16, 0, 16]) {
            g.beginPath(); g.arc(o, -22, 5, 0, Math.PI * 2); g.fill();
          }
          break;
        case 'lens': // ein grosser Ring
          g.strokeStyle = accent; g.lineWidth = 4;
          g.beginPath(); g.arc(0, -22, 15, 0, Math.PI * 2); g.stroke();
          break;
        default:
          roundRect(g, -26, -20, 9, 12, 3); g.fill();
          roundRect(g, 17, -20, 9, 12, 3); g.fill();
      }
    }
    if (level >= 3) {
      // Stufe 3 setzt eine Krone auf, deren Form ebenfalls am Zweig haengt.
      g.fillStyle = accent;
      if (bid === 'sniper' || bid === 'shard' || bid === 'lens') {
        g.beginPath();
        g.moveTo(0, -48); g.lineTo(7, -36); g.lineTo(-7, -36);
        g.closePath(); g.fill();
      } else {
        roundRect(g, -9, -40, 18, 8, 3); g.fill();
        g.fillRect(-2, -46, 4, 8);
      }
    }
    g.restore();

    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(-14 + i * 14, 13, 3.2, 0, Math.PI * 2);
      g.fillStyle = i < level ? accent : hexA(C.ink, 0.35);
      g.fill();
    }
  });
}

/** Waffe, nach rechts zeigend gebacken. Drehung und Rueckstoss kommen beim
 *  Zeichnen dazu. */
export function getTowerWeapon(id: TowerId, branch: BranchIndex, level: number): HTMLCanvasElement {
  const def = TOWERS[id];
  const grow = 1 + (level - 1) * 0.12;
  const bid = branch === null ? '' : def.branches[branch].id;
  return bake(`weapon:${id}:${branch}:${level}`, 86 * grow, 86 * grow, (g) => {
    g.scale(grow, grow);
    paintWeapon(g, def, accentFor(def, branch), bid);
  });
}

/** Die Waffe traegt die Zweig-Identitaet. Ein Scharfschuetze muss auch als
 *  Umriss anders aussehen als eine Salve - nicht nur anders gefaerbt. */
function paintWeapon(
  g: CanvasRenderingContext2D, def: TowerDef, accent: string, bid: string,
): void {
  if (def.attack === 'single') {
    if (bid === 'sniper') {
      // Ein langer duenner Lauf mit Zweibein und Zielrohr.
      g.fillStyle = C.stoneDark;
      roundRect(g, -6, -3, 46, 6, 3); g.fill();
      g.fillStyle = accent;
      roundRect(g, 30, -2.5, 14, 5, 2.5); g.fill();
      g.fillStyle = def.color;
      roundRect(g, 2, -8, 16, 5, 2); g.fill();   // Zielrohr
      g.fillRect(6, 2, 3, 9); g.fillRect(14, 2, 3, 9); // Zweibein
      return;
    }
    if (bid === 'volley') {
      // Drei kurze Laeufe im Faecher.
      g.fillStyle = def.color;
      for (const a of [-0.22, 0, 0.22]) {
        g.save(); g.rotate(a);
        roundRect(g, -8, -3.5, 26, 7, 3.5); g.fill();
        g.restore();
      }
      g.fillStyle = accent;
      g.beginPath(); g.arc(-4, 0, 7, 0, Math.PI * 2); g.fill();
      return;
    }
    g.fillStyle = def.color;
    roundRect(g, -10, -5, 34, 10, 5); g.fill();
    g.fillStyle = accent;
    roundRect(g, 14, -3.5, 12, 7, 3.5); g.fill();
    return;
  }

  if (def.attack === 'splash') {
    if (bid === 'cluster') {
      // Vier kurze weite Rohre nebeneinander.
      g.fillStyle = C.stoneDark;
      roundRect(g, -14, -12, 24, 24, 6); g.fill();
      g.fillStyle = accent;
      for (const o of [-8, -2.5, 3, 8.5]) {
        roundRect(g, 8, o - 2, 14, 4, 2); g.fill();
      }
      return;
    }
    if (bid === 'breaker') {
      // Ein einziges massives Rohr mit Verstaerkungsringen.
      g.fillStyle = C.stoneDark;
      roundRect(g, -16, -11, 40, 22, 5); g.fill();
      g.fillStyle = accent;
      roundRect(g, 18, -13, 12, 26, 4); g.fill();
      g.fillStyle = hexA(C.ink, 0.45);
      g.fillRect(-6, -11, 4, 22);
      g.fillRect(6, -11, 4, 22);
      return;
    }
    g.fillStyle = C.stoneDark;
    roundRect(g, -14, -9, 30, 18, 6); g.fill();
    g.fillStyle = accent;
    roundRect(g, 8, -6, 16, 12, 4); g.fill();
    return;
  }

  if (def.attack === 'aura') {
    if (bid === 'eternal') {
      // Sechs lange schmale Zapfen - ein weiter, ruhiger Ring.
      g.fillStyle = accent;
      for (let i = 0; i < 6; i++) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.moveTo(0, -4); g.lineTo(26, 0); g.lineTo(0, 4);
        g.closePath(); g.fill();
      }
      g.fillStyle = hexA('#FFFFFF', 0.6);
      g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
      return;
    }
    if (bid === 'shard') {
      // Drei breite, gezackte Klingen - aggressiv statt ruhig.
      g.fillStyle = accent;
      for (let i = 0; i < 3; i++) {
        g.rotate((Math.PI * 2) / 3);
        g.beginPath();
        g.moveTo(0, -9); g.lineTo(12, -5); g.lineTo(20, 0); g.lineTo(12, 5); g.lineTo(0, 9);
        g.closePath(); g.fill();
      }
      return;
    }
    g.fillStyle = accent;
    for (let i = 0; i < 3; i++) {
      g.rotate((Math.PI * 2) / 3);
      g.beginPath();
      g.moveTo(0, -6); g.lineTo(19, 0); g.lineTo(0, 6);
      g.closePath(); g.fill();
    }
    return;
  }

  // Kettenblitz
  if (bid === 'fork') {
    // Drei kleine Splitter im Kreis - die Ladung verteilt sich.
    g.fillStyle = accent;
    for (let i = 0; i < 3; i++) {
      g.save();
      g.rotate((Math.PI * 2 * i) / 3);
      g.translate(0, -12);
      g.beginPath();
      g.moveTo(0, -8); g.lineTo(6, 0); g.lineTo(0, 8); g.lineTo(-6, 0);
      g.closePath(); g.fill();
      g.restore();
    }
    return;
  }
  if (bid === 'lens') {
    // Ein einziger grosser Kristall in einer Fassung.
    g.strokeStyle = hexA(accent, 0.8); g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.stroke();
    g.fillStyle = accent;
    g.beginPath();
    g.moveTo(0, -17); g.lineTo(12, 0); g.lineTo(0, 17); g.lineTo(-12, 0);
    g.closePath(); g.fill();
    g.fillStyle = hexA('#FFFFFF', 0.7);
    g.beginPath();
    g.moveTo(0, -17); g.lineTo(12, 0); g.lineTo(0, 0);
    g.closePath(); g.fill();
    return;
  }
  g.fillStyle = accent;
  g.beginPath();
  g.moveTo(0, -13); g.lineTo(9, 0); g.lineTo(0, 13); g.lineTo(-9, 0);
  g.closePath(); g.fill();
  g.fillStyle = hexA('#FFFFFF', 0.55);
  g.beginPath();
  g.moveTo(0, -13); g.lineTo(9, 0); g.lineTo(0, 0);
  g.closePath(); g.fill();
}

export function roundRect(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Wie viele Bilder gerade im Speicher liegen - fuer die Technikanzeige. */
export const spriteCount = (): number => cache.size;

/** Grober Speicherbedarf aller gebackenen Bilder in Byte (4 Byte je Bildpunkt).
 *  Gebackene Bilder sind der Preis fuer wenige Zeichenbefehle - und auf einem
 *  Handy ist Speicher die knappere Ware. Deshalb wird auch das gemessen. */
export function spriteBytes(): number {
  let total = 0;
  for (const cv of cache.values()) total += cv.width * cv.height * 4;
  return total;
}

/** Wieviele Rissstufen der Kristall kennt. Null ist heil. */
export const RISS_STUFEN = 6;

/** Die Rissstufe zu einem Gesundheitsanteil (1 = heil, 0 = am Ende). */
export const rissStufe = (anteil: number): number =>
  Math.max(0, Math.min(RISS_STUFEN, Math.round((1 - anteil) * RISS_STUFEN)));

/** Die Risse im Kristall — eine gebackene Ebene je Stufe, auf den Umriss
 *  des Bauwerks beschnitten.
 *
 *  **Warum das hier steht und nicht mehr im Renderer.** Bis v181 zeichnete
 *  `drawCrystal` Risse als Pfade — aber erst NACH einem `return`, das immer
 *  fiel, sobald das Bild der Ringstation geladen war. Gemessen: von zwölf
 *  Bildern nehmen elf den Bildzweig, den Pfadzweig nur das erste. Der Satz
 *  „der Spielstand ist ein Gegenstand in der Welt“ stand also im Quelltext
 *  und nicht im Spiel. Zwischen vollem und fast leerem Kristall lagen 1,45 %
 *  der Bildpunkte, und die kamen ausschliesslich aus dem Lichtkranz, der mit
 *  der Gesundheit schrumpft.
 *
 *  **Die Risse wachsen, sie mischen sich nicht neu.** Jede Stufe nimmt
 *  dieselbe Aussaat und die ersten N Risse daraus. Ein Riss, der bei Stufe 2
 *  da war, steht bei Stufe 3 an derselben Stelle — sonst sähe man kein
 *  fortschreitendes Zerbrechen, sondern ein Flackern.
 *
 *  **Beschnitten auf das Bauwerk, nicht auf sein Rechteck.** Die Station ist
 *  ein Ring mit einem Loch in der Mitte. Ein Riss, der frei über dem Loch
 *  hinge, wäre ein Sprung in der Luft — derselbe Fehler, den v160 beim
 *  Turmschatten und v163 beim Kontaktschatten gemacht haben. `destination-in`
 *  gegen das Bild selbst lässt nur stehen, was auf Material liegt.
 *
 *  Kein `blur`, kein `lighter` (Regel 11): die weiche Kante entsteht aus
 *  einem zweiten, breiteren Strich mit geringerer Deckung. */
export function getRissbild(
  bild: HTMLCanvasElement | HTMLImageElement, schluessel: string,
  breite: number, hoehe: number, stufe: number,
): HTMLCanvasElement | null {
  const n = Math.max(0, Math.min(RISS_STUFEN, Math.round(stufe)));
  if (n <= 0) return null;
  return bake(`riss-kristall:${schluessel}:${Math.round(breite)}x${Math.round(hoehe)}:${n}`,
    breite, hoehe, (g) => {
      const W = Math.max(1, Math.ceil(breite * SS)), H = Math.max(1, Math.ceil(hoehe * SS));
      const hilfe = document.createElement('canvas');
      hilfe.width = W; hilfe.height = H;
      const hg = hilfe.getContext('2d');
      if (!hg) return;
      hg.setTransform(SS, 0, 0, SS, (breite / 2) * SS, (hoehe / 2) * SS);
      hg.lineCap = 'round';
      hg.lineJoin = 'round';

      // Zwei Risse je Stufe. Bei einem allein waere der Unterschied zwischen
      // zwei Stufen im Spiel nicht zu sehen; bei dreien ist die Station schon
      // auf Stufe 3 durchzogen und die letzten Stufen sagen nichts mehr.
      //
      // **Sie laufen im STEINBAND, nicht durch die Mitte.** Der erste Anlauf
      // setzte sie von 0,16 bis 0,62 des Halbmessers an - gemessen am Bild
      // liegen dort nur 5170 der 33 600 deckenden Punkte, der Rest sitzt
      // zwischen 0,5 und 1,0. Angesehen (Regel 8) sah es aus wie Gekritzel
      // ueber dem Wasser: was ich fuer einen Teich hielt, war der Lichtkranz
      // durch das LOCH im Ring. Auf dem Material lag fast nichts.
      //
      // Ein Riss laeuft von innen nach aussen quer ueber das Band. Wo er
      // eine Fuge zwischen zwei Segmenten kreuzt, schneidet ihn die Maske
      // weg - er zerfaellt in Stuecke, und genau so bricht ein Ring.
      const rnd = makeRng(1481);
      const R = Math.min(breite, hoehe) * 0.5;
      // Kreis auf die Kachel abgebildet - die Aufsicht steckt schon im Bild,
      // ein zweites Stauchen machte aus dem Ring eine Ellipse.
      const hoch = hoehe / breite;
      for (let i = 0; i < n * 2; i++) {
        // Alle Risse werden gewuerfelt, gezeichnet nur die ersten - so
        // bleibt jeder Riss ueber die Stufen an seinem Platz.
        const winkel = rnd() * Math.PI * 2;
        const start = 0.48 + rnd() * 0.12;
        const laenge = 0.20 + rnd() * 0.20;
        const punkte: Array<[number, number]> = [];
        let a = winkel;
        for (let k = 0; k <= 4; k++) {
          const r = (start + (laenge * k) / 4) * R;
          // Das Zittern muss KLEINER bleiben als der Schritt nach aussen.
          // Bei +-0,10 rad trug ein Punkt auf halbem Halbmesser rund zehn
          // Bildpunkte zur Seite, waehrend er nur sieben nach aussen kam -
          // der Riss kringelte sich, statt zu laufen, und die gebackene
          // Ebene sah aus wie hingekritzelt.
          a += (rnd() - 0.5) * 0.09;
          punkte.push([Math.cos(a) * r, Math.sin(a) * r * hoch]);
        }
        // **Auslaufend, nicht durchgezogen.** Ein Bruch ist dort am
        // breitesten, wo er entstanden ist, und laeuft nach aussen aus. Mit
        // gleicher Staerke ueber die ganze Laenge sah er aus wie mit dem
        // Filzstift gezogen - so stand er nach dem ersten Anlauf im Bild,
        // und angesehen war das der erste Einwand (Regel 8).
        const zeichne = (farbe: string, stark: number, deckung: number,
          dx: number, dy: number): void => {
          hg.strokeStyle = farbe;
          hg.globalAlpha = deckung;
          for (let k = 1; k < punkte.length; k++) {
            const duenner = 1.15 - (k - 1) / (punkte.length - 1);
            hg.lineWidth = Math.max(0.4, stark * duenner);
            hg.beginPath();
            hg.moveTo(punkte[k - 1][0] + dx, punkte[k - 1][1] + dy);
            hg.lineTo(punkte[k][0] + dx, punkte[k][1] + dy);
            hg.stroke();
          }
        };
        // Erst der weiche Saum, dann der harte Kern, dann die Lichtkante auf
        // der Sonnenseite - so liest sich der Riss als Vertiefung und nicht
        // als aufgemalter Strich.
        zeichne(C.ink, breite * 0.017, 0.22, 0, 0);
        zeichne(C.ink, breite * 0.0060, 0.75, 0, 0);
        zeichne('#FFFFFF', breite * 0.005, 0.42, -LICHT.x * 1.5, -LICHT.y * 1.5);
      }
      hg.globalAlpha = 1;
      // Nur, was auf dem Bauwerk liegt - und zwar auf dem FESTEN Teil.
      //
      // Eine Maske aus dem rohen Alpha reicht nicht: die Innenflaeche der
      // Station ist halbdurchsichtig, ein Riss ueberlebt dort mit einem
      // Viertel Deckung und haengt als Kritzel ueber dem Licht, das durch
      // das Loch faellt. Angesehen war das der zweite Einwand (Regel 8).
      // Deshalb wird die Maske hart geschnitten: gemessen am Bild liegen
      // 29 203 der 36 450 angefassten Punkte ueber 190 - das ist die
      // Struktur, der Rest ist Saum und Schleier.
      hg.setTransform(1, 0, 0, 1, 0, 0);
      const maske = document.createElement('canvas');
      maske.width = W; maske.height = H;
      const mg = maske.getContext('2d');
      if (!mg) return;
      mg.drawImage(bild, 0, 0, W, H);
      const felder = mg.getImageData(0, 0, W, H);
      const px = felder.data;
      for (let i = 3; i < px.length; i += 4) px[i] = px[i] > 190 ? 255 : 0;
      mg.putImageData(felder, 0, 0);
      hg.globalCompositeOperation = 'destination-in';
      hg.drawImage(maske, 0, 0);
      g.drawImage(hilfe, -breite / 2, -hoehe / 2, breite, hoehe);
    });
}

/** Der Schattenriss einer Figur — ihr eigener Umriss, in Lichtrichtung
 *  gelegt.
 *
 *  Bis v127 warf jede Figur dieselbe Ellipse. Der Mörser mit seinem Rohr warf
 *  denselben Fleck wie der Bogenturm, der Titan denselben wie der Späher. Ein
 *  Schatten sagt dann nur "hier steht etwas" — er sagt nicht, WAS.
 *
 *  Gebacken wird einmal je Bild und Größe. Drei Dinge passieren dabei:
 *
 *   - Der Umriss wird zu reinem Schwarz eingefärbt (`source-in` auf eine
 *     gefüllte Fläche): aus dem Bild bleibt nur die Silhouette.
 *   - Er wird gestaucht und in Lichtrichtung geschert. Die Stauchung erzählt
 *     die Aufsicht, die Scherung die Sonnenrichtung.
 *   - Er wird dreimal leicht versetzt übereinandergelegt statt weichgezeichnet.
 *
 *  **Warum nicht weichzeichnen:** Regel 11. `filter: blur` ist auf Safari die
 *  Falle, die dieses Projekt schon einmal ein schwarzes Bild gekostet hat.
 *  Drei Kopien mit halber Deckung geben eine weiche Kante, ohne den Filter
 *  anzufassen — und kosten beim Backen ein Dreifaches von fast nichts. */
export function getSchattenriss(
  bild: HTMLCanvasElement | HTMLImageElement, schluessel: string,
  breite: number, hoehe: number, hebel = 1.25,
): HTMLCanvasElement {
  // Die Schattenfläche ist breiter als die Figur, weil die Scherung sie
  // seitlich hinauszieht.
  //
  // `bake` setzt den Ursprung in die MITTE der Flaeche. Gezeichnet wird so,
  // dass der FUSS der Figur genau dort liegt: dann laesst sich der Riss ohne
  // weiteren Versatz an den Standpunkt setzen. Der erste Anlauf verschob
  // zusaetzlich beim Zeichnen UND beim Setzen - der Schatten lag doppelt
  // daneben und war kaum zu sehen.
  //
  // `hebel` ist die Schattenlaenge, und sie gehoert zur HOEHE des Dings.
  // Ein Turm ragt auf und wirft weit; ein kriechendes Wesen liegt flach und
  // wirft kurz. Mit demselben Hebel fuer beide zog der Schatten eines
  // Schleichers als langer dunkler Streifen hinter ihm her - er sah aus wie
  // eine Spur, nicht wie ein Schatten.
  const B = Math.ceil(breite * 2.4), H = Math.ceil(hoehe * 1.4);
  return bake(`riss:${schluessel}:${Math.round(breite)}x${Math.round(hoehe)}:${hebel}`, B, H, (g) => {
    for (const [wachs, deckung] of [[1.0, 0.30], [1.07, 0.18], [1.15, 0.12]]) {
      g.save();
      // Stauchen: von oben gesehen liegt ein Schatten flach.
      g.scale(wachs, 0.42 * wachs);
      // Scheren: je hoeher ein Punkt der Figur, desto weiter wandert er in
      // Lichtrichtung. Genau das erzaehlt die Hoehe.
      g.transform(1, 0, -LICHT.x * hebel, 1, 0, 0);
      const w = breite, h = hoehe;
      g.globalAlpha = deckung;
      // Erst das Bild, dann mit Tinte fuellen: `source-in` behaelt nur, was
      // im Bild deckend ist - die Silhouette.
      const hilfe = document.createElement('canvas');
      hilfe.width = Math.ceil(w); hilfe.height = Math.ceil(h);
      const hg = hilfe.getContext('2d');
      if (hg) {
        hg.drawImage(bild, 0, 0, hilfe.width, hilfe.height);
        hg.globalCompositeOperation = 'source-in';
        hg.fillStyle = C.ink;
        hg.fillRect(0, 0, hilfe.width, hilfe.height);
        g.drawImage(hilfe, -w / 2, -h);
      }
      g.restore();
    }
  });
}
