// Service Worker.
//
// Zwei Zusagen, die einander widersprechen:
//   1. Die App muss OHNE Netz starten - im Zug, im Keller, im Flugzeug.
//   2. Die App muss IMMER AKTUELL sein - was auf main liegt, laeuft.
//
// Aufgeloest wird das an der Stelle, an der es sich entscheidet: die SEITE
// wird zuerst aus dem Netz geholt, alles andere zuerst aus dem Lager.
//
//   - Die Seite (index.html) traegt das ganze Spiel und aendert sich bei
//     jeder Auslieferung. Also Netz zuerst - aber mit einer Reissleine von
//     2,5 Sekunden. Ein Kind wartet nicht auf ein muerbes Hotel-WLAN; nach
//     2,5 s kommt die letzte bekannte Fassung aus dem Lager, und die neue
//     wird beim naechsten Start da sein.
//   - Schrift und Symbole aendern sich INNERHALB einer Fassung nie. Also
//     Lager zuerst, ohne Umweg. Bei einer neuen Fassung heisst das Lager
//     anders, und alles wird einmal neu geholt.
const FASSUNG = '__FASSUNG__';
const LAGER = 'smart-kids-' + FASSUNG;
const VORRAT = __VORRAT__;
const ZU_LANGSAM = 2500;

self.addEventListener('install', (e) => {
  // skipWaiting: sonst uebernimmt die neue Fassung erst, wenn ALLE Fenster
  // zu sind. Auf einem Startbildschirm-Symbol ist das nie.
  e.waitUntil(caches.open(LAGER).then(l => l.addAll(VORRAT)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const name of await caches.keys())
      if (name.startsWith('smart-kids-') && name !== LAGER) await caches.delete(name);
    await self.clients.claim();
  })());
});

async function seiteHolen(anfrage) {
  const lager = await caches.open(LAGER);
  try {
    const netz = await Promise.race([
      fetch(anfrage, { cache: 'no-store' }),
      new Promise((_, nein) => setTimeout(() => nein(new Error('zu langsam')), ZU_LANGSAM)),
    ]);
    if (!netz || !netz.ok) throw new Error('Antwort nicht in Ordnung');
    await lager.put('./index.html', netz.clone());
    return netz;
  } catch (e) {
    const alt = await lager.match('./index.html');
    if (alt) return alt;
    throw e;
  }
}

async function stueckHolen(anfrage) {
  const lager = await caches.open(LAGER);
  const da = await lager.match(anfrage);
  if (da) return da;
  const netz = await fetch(anfrage);
  if (netz && netz.ok && new URL(anfrage.url).origin === self.location.origin)
    await lager.put(anfrage, netz.clone());
  return netz;
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') e.respondWith(seiteHolen(e.request));
  else if (new URL(e.request.url).origin === self.location.origin)
    e.respondWith(stueckHolen(e.request));
});
