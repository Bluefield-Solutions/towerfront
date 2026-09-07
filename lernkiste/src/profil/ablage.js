/* Ablage. IndexedDB, ohne Zeremonie und ohne Abhaengigkeit.
 *
 * Alles bleibt auf dem Geraet. Nichts geht ins Netz - siehe Konzept K3,
 * Kapitel 13.3. Das ist keine Einstellung, sondern die Bauweise: es gibt
 * keinen Code, der etwas hochlaedt.
 */
const DB = 'lernkiste', FASSUNG = 1;
const LAEDEN = ['profile', 'fortschritt', 'protokoll', 'einstellungen'];

let db = null;
function oeffnen() {
  if (db) return db;
  db = new Promise((ja, nein) => {
    if (!('indexedDB' in globalThis)) return nein(new Error('kein IndexedDB'));
    const a = indexedDB.open(DB, FASSUNG);
    a.onupgradeneeded = () => {
      for (const l of LAEDEN)
        if (!a.result.objectStoreNames.contains(l)) a.result.createObjectStore(l);
    };
    a.onsuccess = () => ja(a.result);
    a.onerror = () => nein(a.error);
  });
  return db;
}

async function tun(laden, art, fn) {
  const d = await oeffnen();
  return new Promise((ja, nein) => {
    const t = d.transaction(laden, art);
    const s = t.objectStore(laden);
    const a = fn(s);
    t.oncomplete = () => ja(a && 'result' in a ? a.result : undefined);
    t.onerror = () => nein(t.error);
  });
}

export const hole   = (laden, k) => tun(laden, 'readonly',  s => s.get(k));
export const setze  = (laden, k, w) => tun(laden, 'readwrite', s => s.put(w, k));
export const loesche= (laden, k) => tun(laden, 'readwrite', s => s.delete(k));
export const alles  = (laden) => tun(laden, 'readonly', s => s.getAll());
export const leeren = (laden) => tun(laden, 'readwrite', s => s.clear());

/** Anhaengen an eine Liste. Fuer das Protokoll: nur schreiben, nie aendern. */
export async function anhaengen(laden, eintrag) {
  const d = await oeffnen();
  return new Promise((ja, nein) => {
    const t = d.transaction(laden, 'readwrite');
    t.objectStore(laden).put(eintrag, `${eintrag.zeit}-${Math.random().toString(36).slice(2,8)}`);
    t.oncomplete = ja; t.onerror = () => nein(t.error);
  });
}

/**
 * Befund L6: ohne diese Anforderung gilt der Speicher als "best effort" und
 * darf vom System geraeumt werden. Ein Aufruf, eine Zeile.
 *
 * Sie kann abgelehnt werden - deshalb wird das Ergebnis GEMERKT und im
 * Elternbereich angezeigt, statt es zu behaupten.
 */
export async function dauerhaft() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return { moeglich:false };
    const schon = await navigator.storage.persisted();
    const gewaehrt = schon || await navigator.storage.persist();
    let platz = null;
    if (navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      platz = { benutzt: e.usage, frei: e.quota };
    }
    return { moeglich:true, gewaehrt, platz };
  } catch (e) { return { moeglich:false, fehler:String(e) }; }
}

/** Alles zu einem Profil loeschen. Unwiderruflich, ein Tipp. */
export async function profilLoeschen(profilId) {
  const d = await oeffnen();
  for (const laden of ['fortschritt', 'protokoll']) {
    const schluessel = await tun(laden, 'readonly', s => s.getAllKeys());
    const werte = await alles(laden);
    await tun(laden, 'readwrite', s => {
      werte.forEach((w, i) => { if (w && w.profil === profilId) s.delete(schluessel[i]); });
    });
  }
  await loesche('profile', profilId);
}
