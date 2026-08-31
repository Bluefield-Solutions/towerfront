import { TOWERS, TOWER_ORDER } from '../data/towers';

/** Der guenstigste Turm - er entscheidet, ob ein Platz ueberhaupt taugt.
 *  Was dort nicht steht, steht nirgends. */
const guenstigster = () =>
  TOWER_ORDER.reduce((a, b) => (TOWERS[a].base.cost <= TOWERS[b].base.cost ? a : b));

/** Wie weit ein Daumen danebenliegen darf, in Weltpunkten.
 *
 *  22 Bildschirmpunkte ist der halbe Daumen aus derselben Rechnung, aus der
 *  `npm run beruehrung` seine 44 nimmt - nur hier nach innen gewandt: dort
 *  ist es die Groesse, die ein Knopf haben muss, hier die Ungenauigkeit, die
 *  ein Tipp haben darf.
 *
 *  Geteilt durch den Massstab, weil ein Bildschirmpunkt weit herausgezoomt
 *  viele Weltpunkte bedeutet und herangezoomt wenige. Eine feste Weltzahl
 *  waere bei einer Vergroesserung zu grob und bei der anderen zu fein. */
const fingerInWelt = (massstab: number): number => 22 / Math.max(massstab, 0.05);
import { ABILITIES, ABILITY_ORDER } from '../data/abilities';
import { Sfx } from './audio';
import type { GameState } from '../game/state';
import type { Renderer } from '../gfx/renderer';
import { inside as insideSpot } from '../game/menu';

/** Bedienung am Daumen.
 *  Bauen: druecken zeigt Vorschau und Reichweite, erst das Loslassen baut.
 *  Ein Fehltipp kostet damit kein Gold und keine Nerven.
 *  Ohne gewaehlte Turmsorte waehlt der Tipp einen vorhandenen Turm aus. */
export function bindInput(canvas: HTMLCanvasElement, s: GameState, r: Renderer): void {
  /** Weltpunkt unter dem Finger. */
  const toWorld = (ev: { clientX: number; clientY: number }) => {
    const rect = canvas.getBoundingClientRect();
    return r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
  };

  let down = false;
  /** Sobald der Finger weiter als das gewandert ist, ist es kein Tipp mehr,
   *  sondern ein Schieben - und dann darf am Ende nichts gebaut werden.
   *  Ohne diese Schwelle setzt jedes Verschieben einen Turm. */
  const DRAG_THRESHOLD = 11;
  let dragging = false;
  /** Wo das Ziehen in Weltkoordinaten begann - fuer das Versetzen. */
  let startWeltX = 0, startWeltY = 0;
  /** Der Wecker fuer das Halten. Nach dieser Zeit ohne Bewegung erscheinen
   *  alle Reichweiten.
   *
   *  350 ms, und die Zahl hat einen Grund: unter etwa 300 loest die Geste
   *  bei jedem etwas langsameren Tipp aus, ueber 500 haelt niemand so lange
   *  still, ohne zu glauben, es sei nichts passiert. */
  const HALTEZEIT = 350;
  let halteWecker: ReturnType<typeof setTimeout> | null = null;
  const halteAus = () => {
    if (halteWecker !== null) { clearTimeout(halteWecker); halteWecker = null; }
    s.zeigeReichweiten = false;
  };
  let startX = 0, startY = 0, lastX = 0, lastY = 0;
  /** Alle liegenden Finger - fuer das Kneifen. */
  const points = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;
  let pinchX: number | null = null;
  let pinchY: number | null = null;
  let lastTap = 0;

  const local = (ev: { clientX: number; clientY: number }) => {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  canvas.addEventListener('pointermove', (ev) => {
    const p = local(ev);
    if (points.has(ev.pointerId)) points.set(ev.pointerId, p);

    // Zwei Finger: kneifen UND schieben.
    //
    // Vorher wurde nur der Abstand ausgewertet und am Mittelpunkt gezoomt.
    // Der Mittelpunkt wandert aber mit den Fingern, und diese Bewegung wurde
    // verschluckt - das Bild rutschte beim Kneifen weg. Zwei Finger machen in
    // Wahrheit zweierlei: ihr Abstand ist der Zoom, ihre gemeinsame Mitte die
    // Verschiebung. Beides muss gelten.
    if (points.size >= 2) {
      const [a, b] = [...points.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (pinchDist > 0 && d > 0) {
        r.zoomAt(d / pinchDist, mx, my);
        if (pinchX !== null && pinchY !== null) r.panBy(mx - pinchX, my - pinchY);
      }
      pinchX = mx;
      pinchY = my;
      pinchDist = d;
      dragging = true;
      s.pendingPoint = null;
      return;
    }

    if (down) {
      if (s.aiming) {
        const rect = canvas.getBoundingClientRect();
        r.aimPoint = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      }
      if (!dragging && Math.hypot(p.x - startX, p.y - startY) > DRAG_THRESHOLD) {
        dragging = true;
        s.pendingPoint = null;
        halteAus();
        // Beginnt das Ziehen auf dem AUSGEWAEHLTEN Turm, wird versetzt statt
        // geschwenkt.
        //
        // Die Einschraenkung auf den ausgewaehlten ist der ganze Trick. Ohne
        // sie waere jedes Schwenken ein Gluecksspiel: wer die Karte
        // verschieben will und dabei einen Turm erwischt, haette ihn
        // mitgenommen. Ausgewaehlt heisst: der Pruefsteg steht offen, man hat
        // diesen Turm gerade angetippt, man meint ihn.
        const sel = s.selectedTower;
        if (sel && s.canMove()) {
          const w = toWorld(ev);
          const fuss = TOWERS[sel.def].footprint / 2 + 24;
          if (Math.hypot(sel.x - startWeltX, sel.y - startWeltY) < fuss) {
            s.movingTower = sel;
            s.movePoint = w;
          }
        }
      }
      if (s.movingTower) {
        s.movePoint = toWorld(ev);
        lastX = p.x; lastY = p.y;
        return;
      }
      if (dragging) {
        r.panBy(p.x - lastX, p.y - lastY);
        lastX = p.x; lastY = p.y;
        return;
      }
      s.pendingPoint = toWorld(ev);
      return;
    }
    if (ev.pointerType !== 'touch') s.hoverPoint = toWorld(ev);
    // Und die Rueckmeldung fuer den Zeiger: was liegt unter ihm?
    //
    // Sie steht hier und nicht in der Zeichenschicht, weil nur die Bedienung
    // weiss, ob ueberhaupt ein Zeiger im Spiel ist. Ein Finger bekommt sie
    // nicht - er verdeckt, was er anfasst, und ein Hand-Zeigersymbol gibt es
    // dort ohnehin nicht.
    if (ev.pointerType !== 'touch') zeigerPflegen(ev);
  });
  canvas.addEventListener('pointerleave', () => {
    s.hoverPoint = null;
    if (r.menu) r.menu.zeiger = null;
    canvas.style.cursor = '';
  });

  /** Worueber steht der Zeiger - und wird er zur Hand? */
  function zeigerPflegen(ev: PointerEvent): void {
    const w = toWorld(ev);
    if (r.menu) {
      const hit = r.menu.hotspots.find((h) => insideSpot(h, w.x, w.y));
      r.menu.zeiger = hit ? hit.id : null;
      canvas.style.cursor = hit ? 'pointer' : '';
      return;
    }
    // Im Spiel wird die Hand ueber dem, was man anfassen kann: ein Turm, und
    // beim Bauen jeder Fleck, auf dem der gewaehlte Turm stehen darf.
    const greifbar = !!s.towerUnder(w.x, w.y, r.scale)
      || (!!s.buildChoice && s.canPlace(s.buildChoice, w.x, w.y));
    canvas.style.cursor = greifbar ? 'pointer' : '';
  }

  canvas.addEventListener('pointerdown', (ev) => {
    Sfx.unlock();
    ev.preventDefault();
    // Im Menue laufen alle Tipper an die Landkarte - kein Bauen, kein Zoomen.
    if (r.menu) {
      const w = r.screenToWorld(ev.clientX - canvas.getBoundingClientRect().left,
        ev.clientY - canvas.getBoundingClientRect().top);
      const hit = r.menu.hotspots.find((h) => insideSpot(h, w.x, w.y));
      r.menu.pressed = hit ? hit.id : null;
      return;
    }
    const p = local(ev);
    points.set(ev.pointerId, p);
    if (points.size >= 2) {
      const [a, b] = [...points.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      dragging = true;
      s.pendingPoint = null;
      return;
    }
    canvas.setPointerCapture?.(ev.pointerId);
    down = true;
    dragging = false;
    if (s.aiming) r.aimPoint = r.screenToWorld(p.x, p.y);
    startX = lastX = p.x; startY = lastY = p.y;
    {
      const w = toWorld(ev);
      startWeltX = w.x; startWeltY = w.y;
    }
    if (s.phase !== 'playing') return;
    const c = toWorld(ev);
    s.hoverPoint = c;
    s.pendingPoint = s.buildChoice || s.aiming ? c : null;

    // Halten auf LEERER Flaeche zeigt alle Reichweiten.
    //
    // Leer heisst: kein Turm darunter, keine Turmsorte gewaehlt, nicht am
    // Zielen. Sonst waere die Geste zweideutig - wer einen Turm haelt, will
    // ihn versetzen, und wer eine Faehigkeit zielt, will zielen.
    halteAus();
    if (!s.buildChoice && !s.aiming && !s.towerUnder(c.x, c.y, r.scale)) {
      halteWecker = setTimeout(() => {
        halteWecker = null;
        if (down && !dragging) s.zeigeReichweiten = true;
      }, HALTEZEIT);
    }
  });

  const finish = (ev: PointerEvent) => {
    if (r.menu) {
      const rect = canvas.getBoundingClientRect();
      const w = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      r.menu.pressed = null;
      if (r.menu.tap(w.x, w.y)) Sfx.play('tap');
      return;
    }
    points.delete(ev.pointerId);
    if (points.size < 2) { pinchDist = 0; pinchX = null; pinchY = null; }
    if (!down) return;
    down = false;
    const wasDragging = dragging;
    dragging = false;
    const hieltReichweiten = s.zeigeReichweiten;
    halteAus();
    const at = s.pendingPoint;
    s.pendingPoint = null;

    // Wer gehalten hat, wollte sehen - nicht bauen. Ohne das oeffnet sich
    // beim Loslassen die Turmwahl an der Stelle, auf der der Finger lag.
    if (hieltReichweiten) return;

    // Wurde ein Turm gezogen, entscheidet das Loslassen.
    //
    // Klappt es nicht, bleibt der Turm einfach stehen - ohne Meldung. Das
    // Ziel ist sichtbar rot markiert, solange man zieht; wer trotzdem
    // loslaesst, hat es gesehen und braucht keinen Hinweis hinterher.
    if (s.movingTower) {
      const t = s.movingTower, ziel = s.movePoint;
      s.movingTower = null;
      s.movePoint = null;
      if (ziel && s.moveTower(t, ziel.x, ziel.y)) Sfx.play('tap');
      return;
    }

    // Geschoben statt getippt: nichts bauen, nichts auswaehlen.
    if (wasDragging) return;

    // Doppeltipp schaltet zwischen Uebersicht und Vollbild um - der schnellste
    // Weg, kurz das ganze Feld zu sehen und wieder heranzugehen.
    const now = performance.now();
    if (now - lastTap < 280) {
      lastTap = 0;
      const p = local(ev);
      r.toggleOverview();
      void p;
      return;
    }
    lastTap = now;

    if (s.phase !== 'playing') return;
    const c = at ?? toWorld(ev);

    // Kleinigkeiten in der Karte reagieren - und VERBRAUCHEN den Tipp nicht.
    //
    // Wer einen Busch antippt, wollte vielleicht daneben bauen; seit v125
    // rastet ein Tipp auf die naechste erlaubte Stelle ein. Beides geschieht.
    // Eine Zierde, die einen Bauversuch schluckt, ist keine Zierde, sondern
    // ein Hindernis - und genau das war der Grund, warum es sie bis v134
    // nicht gab.
    s.beruehren(c.x, c.y);

    // Eine angewaehlte Faehigkeit hat Vorrang: der Tipp zielt, er baut nicht.
    if (s.aiming) {
      const rect = canvas.getBoundingClientRect();
      const w = r.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      s.cast(s.aiming, w.x, w.y);
      r.aimPoint = null;
      return;
    }

    // Trefferzugabe so gross, dass die Flaeche 44 Punkte erreicht.
    const existing = s.towerUnder(c.x, c.y, r.scale);
    // **Ein Tipp aufs Feld gibt niemals Gold aus** (B2 des
    // Bedienungs-Abgleichs).
    //
    // Bis v201 stand hier `s.build(...)`: wer in der Turmleiste eine Sorte
    // gewaehlt hatte, baute mit dem naechsten Tipp - sofort, ohne
    // Zwischenschritt, ohne Zurueck. Auf der Ascheschlucht sind **73 % der
    // Flaeche nicht bebaubar** und nichts zeigt vorher welche; der Tipp war
    // damit eine Wette, die Gold kostet.
    //
    // Jetzt oeffnet er dieselbe Turmwahl wie ein Tipp auf freies Feld -
    // nur mit der gewaehlten Sorte schon hervorgehoben. Bezahlt wird auf
    // einer benannten Flaeche, die ihren Preis traegt. Es kostet keinen
    // Handgriff mehr als vorher: vorher Leiste + Feld, jetzt Feld + Wahl.
    if (s.buildChoice) {
      if (existing) { s.selectedTower = existing; s.buildChoice = null; Sfx.play('tap'); return; }
      const choice = s.buildChoice;
      const ziel = s.einrasten(choice, c.x, c.y, fingerInWelt(r.scale));
      if (ziel) { s.buildAt = ziel; Sfx.play('tap'); }
      // Ein Fehlgriff kostet nichts und loescht die Wahl nicht (B4): man
      // versucht es einfach nebenan.
      else s.bauHinweis(c.x, c.y, s.warumNicht(choice, c.x, c.y));
      return;
    }
    if (existing) { s.selectedTower = existing; s.buildAt = null; Sfx.play('tap'); return; }
    s.auswahlSchliessen();

    // Freier Platz: die Turmwahl oeffnet sich dort, wo getippt wurde - oder,
    // wenn es dort nicht geht, an der naechsten Stelle, an der wenigstens der
    // kleinste Turm steht. Wer mit dem Daumen irgendwohin faellt, will sehen,
    // was dort hin kann, und nicht raten, warum nichts passiert ist.
    s.buildAt = s.einrasten(guenstigster(), c.x, c.y, fingerInWelt(r.scale));
    if (s.buildAt) Sfx.play('tap');
    else s.bauHinweis(c.x, c.y, s.warumNicht(guenstigster(), c.x, c.y));
  };

  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', (ev) => {
    points.delete(ev.pointerId);
    if (points.size < 2) { pinchDist = 0; pinchX = null; pinchY = null; }
    down = false; dragging = false; s.pendingPoint = null;
    s.movingTower = null; s.movePoint = null;
    halteAus();
  });

  // Am Schreibtisch: Mausrad zoomt um den Zeiger.
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const p = local(ev);
    r.zoomAt(ev.deltaY < 0 ? 1.12 : 1 / 1.12, p.x, p.y);
  }, { passive: false });

  window.addEventListener('keydown', (ev) => {
    Sfx.unlock();

    // **Im Menue bedient die Tastatur das Menue** (D8).
    //
    // Gemessen vor v193: auf dem Titelschirm waren NULL von 57
    // fokussierbaren Elementen sichtbar, und ein Druck auf Tabulator
    // aenderte null Bildpunkte. Wer keinen Zeiger hat, kam nicht ins Spiel -
    // nicht "umstaendlich", sondern gar nicht.
    //
    // Das Menue ist gemalt, nicht HTML (Regel 6), also kann der Browser hier
    // nichts fokussieren. Gewandert wird deshalb ueber die Trefferflaechen,
    // die das Zeichnen ohnehin anlegt - keine zweite Liste, die veraltet.
    //
    // Und die Spieltasten darunter laufen NICHT mit: `startWave` oder ein
    // Turmkauf waehrend der Landkarte waere Spielbedienung im Menue.
    if (r.menu) {
      const menue = r.menu;
      if (ev.key === 'Tab' || ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        menue.tastenSchritt(1);
        return;
      }
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        menue.tastenSchritt(-1);
        return;
      }
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        // Noch nichts gewaehlt: der erste Druck waehlt, statt ins Leere zu
        // greifen. Sonst muesste man wissen, dass man zuerst Tabulator
        // druecken muss.
        if (!menue.tastenKnopf()) menue.tastenSchritt(1);
        else menue.tastenAusloesen();
        return;
      }
      if (ev.key === 'Escape') { menue.tastenId = null; return; }
      return;
    }

    if (ev.key === ' ') { ev.preventDefault(); s.startWave(); }
    if (ev.key === 'p' || ev.key === 'P') s.paused = !s.paused;
    if (ev.key === 'Escape') { s.auswahlSchliessen(); s.aiming = null; }
    if (ev.key === 'o' || ev.key === 'O') r.toggleOverview();
    for (const id of ABILITY_ORDER) {
      if (ev.key.toLowerCase() === ABILITIES[id].key) s.chooseAbility(id);
    }
    if (ev.key === '1') s.buildChoice = 'arrow';
    if (ev.key === '2') s.buildChoice = 'frost';
    if (ev.key === '3') s.buildChoice = 'mortar';
    if (ev.key === '4') s.buildChoice = 'prism';
    // Am Schreibtisch: U baut im gewaehlten Zweig aus, auf Stufe 1 waehlen
    // Y und U den Zweig.
    if ((ev.key === 'y' || ev.key === 'Y') && s.selectedTower) s.upgrade(s.selectedTower, 0);
    if ((ev.key === 'u' || ev.key === 'U') && s.selectedTower) {
      s.upgrade(s.selectedTower, s.selectedTower.branch ?? 1);
    }
    if ((ev.key === 'x' || ev.key === 'X') && s.selectedTower) s.sell(s.selectedTower);
  });

  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
}
