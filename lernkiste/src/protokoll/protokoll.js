/* Der Ereignisstrom. Anhaengend, nie aendernd.
 *
 * `roheingabe` ist der wertvollste Teil: nach zwei Wochen steht dort
 * schwarz auf weiss, wie das Erkennungssystem Fionas Aussprache tatsaechlich
 * hoert - und daraus waechst die eingefrorene Korpushaelfte mit echten Daten
 * statt mit Vermutungen.
 */
import * as A from '../profil/ablage.js';

export function eintrag(x) {
  return {
    zeit: x.zeit, profil: x.profil, modul: 'erdkunde', ebene: x.ebene, gebietId: x.gebietId,
    eingabeart: x.eingabeart, ergebnis: x.ergebnis,
    roheingabe: x.roheingabe ?? '', sicherheit: x.sicherheit ?? null,
    dauerMs: x.dauerMs, versuch: x.versuch,
    fachVorher: x.fachVorher ?? null, fachNachher: x.fachNachher ?? null,
  };
}
export const schreiben = (e) => A.anhaengen('protokoll', e).catch(() => {});
export const lesen = (profil) => A.alles('protokoll')
  .then(a => a.filter(e => !profil || e.profil === profil).sort((x, y) => x.zeit - y.zeit))
  .catch(() => []);

/* ---------------------------------------------------------- Auswertung -- */

export function auswerten(eintraege, namen) {
  const je = new Map();
  for (const e of eintraege) {
    const z = je.get(e.gebietId) || { id: e.gebietId, name: namen[e.gebietId] || e.gebietId,
                                      richtig: 0, fast: 0, falsch: 0, dauer: 0, n: 0 };
    z[e.ergebnis] = (z[e.ergebnis] || 0) + 1;
    z.dauer += e.dauerMs || 0; z.n++;
    je.set(e.gebietId, z);
  }
  const liste = [...je.values()].map(z => ({ ...z,
    quote: z.n ? z.richtig / z.n : 0, schnitt: z.n ? Math.round(z.dauer / z.n) : 0 }));
  return {
    gesamt: eintraege.length,
    richtig: eintraege.filter(e => e.ergebnis === 'richtig').length,
    jeGebiet: liste.sort((a, b) => a.quote - b.quote),
    /** Die fuenf mit den meisten Fehlversuchen. */
    wackelkandidaten: liste.filter(z => z.n >= 2).sort((a, b) =>
      (b.falsch + b.fast) - (a.falsch + a.fast)).slice(0, 5),
    /** Was gesagt wurde vs. was verstanden wurde. Der Rueckkanal fuer M4. */
    aussprache: eintraege.filter(e => e.eingabeart === 'sprechen' && e.roheingabe)
      .map(e => ({ zeit: e.zeit, gesagt: e.roheingabe, gemeint: namen[e.gebietId] || e.gebietId,
                   ergebnis: e.ergebnis, sicherheit: e.sicherheit })),
    /** Verlauf nach Tagen. */
    tage: [...eintraege.reduce((m, e) => {
      const t = new Date(e.zeit).toISOString().slice(0, 10);
      const z = m.get(t) || { tag: t, n: 0, richtig: 0 };
      z.n++; if (e.ergebnis === 'richtig') z.richtig++;
      return m.set(t, z);
    }, new Map()).values()],
  };
}

/* ------------------------------------------------------------- Ausfuhr -- */

export function alsCsv(eintraege, namen) {
  const kopf = ['zeit','profil','ebene','gebiet','eingabeart','ergebnis','roheingabe',
                'sicherheit','dauerMs','versuch','fachVorher','fachNachher'];
  const zeile = (e) => [
    new Date(e.zeit).toISOString(), e.profil, e.ebene, namen[e.gebietId] || e.gebietId,
    e.eingabeart, e.ergebnis, e.roheingabe, e.sicherheit ?? '', e.dauerMs, e.versuch,
    e.fachVorher ?? '', e.fachNachher ?? '',
  ].map(w => { const s = String(w ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; })
   .join(';');
  return '﻿' + [kopf.join(';'), ...eintraege.map(zeile)].join('\r\n');
}
export const alsJson = (eintraege) => JSON.stringify(eintraege, null, 2);
