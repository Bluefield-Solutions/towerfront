/* Namensabgleich gegen eine GESCHLOSSENE Kandidatenmenge.
 *
 * Der eigentliche Trick liegt nicht in der Erkennung, sondern hier: wir
 * wissen zu jeder Aufgabe, welche drei bis sieben Antworten in Frage kommen.
 * Es muss also nicht erkannt werden, WAS gesagt wurde, sondern nur, welchem
 * der Woerter es am naechsten kommt.
 *
 * Fuenf Stufen (Konzept K3, Kapitel 6.2):
 *   1 normalisieren   2 Alias   3 Koelner Phonetik
 *   4 Levenshtein     5 Abstand zum Zweitbesten
 */

const FUELLWOERTER = /^(das ist|das hier ist|ich glaube|das heisst|das waere|aeh+|oeh?m+|hm+)\s+/;

export function normalisieren(s) {
  return (s || '').toLowerCase().trim()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(FUELLWOERTER, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Koelner Phonetik. Fuer Deutsch deutlich besser geeignet als Soundex, weil
 * sie auf die deutsche Aussprache gebaut ist: "Austraaljen" und "Australien"
 * bekommen denselben Code, "Meier" und "Mayr" auch.
 *
 * Regeln nach Postel 1969. Buchstaben ausserhalb A–Z werden uebersprungen.
 */
export function koelnerPhonetik(wort) {
  const w = normalisieren(wort).replace(/ /g, '').toUpperCase();
  if (!w) return '';
  const codes = [];
  for (let i = 0; i < w.length; i++) {
    const z = w[i], vor = w[i - 1], nach = w[i + 1];
    let c = null;
    switch (z) {
      case 'A': case 'E': case 'I': case 'J': case 'O': case 'U': case 'Y': c = '0'; break;
      case 'B': c = '1'; break;
      case 'P': c = (nach === 'H') ? '3' : '1'; break;
      case 'D': case 'T': c = 'CSZ'.includes(nach) ? '8' : '2'; break;
      case 'F': case 'V': case 'W': c = '3'; break;
      case 'G': case 'K': case 'Q': c = '4'; break;
      case 'C':
        if (i === 0) c = 'AHKLOQRUX'.includes(nach) ? '4' : '8';
        else if ('SZ'.includes(vor)) c = '8';
        else c = 'AHKOQUX'.includes(nach) ? '4' : '8';
        break;
      case 'X': c = 'CKQ'.includes(vor) ? '8' : '48'; break;
      case 'L': c = '5'; break;
      case 'M': case 'N': c = '6'; break;
      case 'R': c = '7'; break;
      case 'S': case 'Z': c = '8'; break;
      case 'H': c = null; break;   // H erzeugt keinen Code
      default: c = null;
    }
    if (c !== null) codes.push(c);
  }
  // Doppelte zusammenziehen, dann alle Nullen ausser der ersten streichen.
  let s = codes.join('').replace(/(.)\1+/g, '$1');
  return s[0] + s.slice(1).replace(/0/g, '');
}

/**
 * Damerau-Levenshtein: wie Levenshtein, aber eine VERTAUSCHUNG zaehlt als
 * ein Schritt, nicht als zwei.
 *
 * Das ist kein Feinschliff. "Bayren" statt "Bayern" ist der haeufigste
 * Tippfehler eines Kindes, und mit reinem Levenshtein liegt er zwei Schritte
 * daneben - also gleich weit wie ein echtes falsches Wort. Die Rueckmeldung
 * waere "falsch" gewesen statt "fast".
 */
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const kosten = a[i-1] === b[j-1] ? 0 : 1;
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + kosten);
      if (i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1])
        d[i][j] = Math.min(d[i][j], d[i-2][j-2] + 1);   // Vertauschung
    }
  return d[m][n];
}
const relativ = (a, b) => levenshtein(a, b) / Math.max(a.length, b.length, 1);

/** Alle Schreibweisen eines Kandidaten. */
function formen(k) {
  return [k.name, ...(k.aliasse || []), ...(k.aussprache || [])]
    .filter(Boolean).map(normalisieren).filter(Boolean);
}

/**
 * Abstand einer Eingabe zu EINEM Kandidaten. Klein ist gut.
 * Gibt zusaetzlich den Laengenunterschied zurueck - der entscheidet, ob ein
 * Treffer sicher ist oder nur eine Rueckfrage wert.
 *
 * Die Laengenstrafe ist nicht Feinschliff. Ohne sie nimmt der Abgleich
 * "euro" fuer Europa, "bayer" fuer Bayern und "afrikaner" fuer Afrika an:
 * lauter kuerzere oder laengere Woerter, die klanglich fast gleich sind. Das
 * Tor `vergleich` hat dafuer 11,6 % Falsch-Positiv gemeldet.
 */
export function abstandZu(eingabe, k) {
  const e = normalisieren(eingabe);
  if (!e) return { d: 1, laenge: 1 };
  const eP = koelnerPhonetik(e);
  let best = 1, besteLaenge = 1;
  for (const f of formen(k)) {
    const laenge = Math.abs(e.length - f.length) / Math.max(e.length, f.length, 1);
    if (f === e) return { d: 0, laenge: 0 };                // Stufe 1/2: Treffer
    const buchstaben = relativ(e, f);
    const klang = eP && koelnerPhonetik(f) ? relativ(eP, koelnerPhonetik(f)) : 1;
    // Der Klang zaehlt mehr: ein Kind spricht richtig und schreibt falsch.
    const d = Math.min(buchstaben, 0.35 * buchstaben + 0.65 * klang) + 0.8 * laenge;
    if (d < best) { best = d; besteLaenge = laenge; }
  }
  return { d: best, laenge: besteLaenge };
}

export const GRENZE_ANNAHME = 0.34;   // darueber: gar nicht erst annehmen
export const GRENZE_SICHER  = 0.12;   // darunter: ohne Rueckfrage
export const ABSTAND_NOETIG = 0.14;   // Vorsprung vor dem Zweitbesten
export const LAENGE_SICHER  = 0.15;   // darueber IMMER nur Rueckfrage

/**
 * Der Abgleich. Drei Ausgaenge statt zwei:
 *   { art:'angenommen' }  { art:'rueckfrage' }  { art:'nochmal' }
 *
 * Der mittlere ist der wichtigste: er verwandelt eine Erkennungsschwaeche in
 * eine Bestaetigungsfrage - und die kann ein Kind beantworten.
 */
export function abgleich(eingabe, kandidaten) {
  if (!normalisieren(eingabe)) return { art: 'nochmal', grund: 'leer' };
  const bewertet = kandidaten
    .map(k => { const r = abstandZu(eingabe, k); return { k, d: r.d, laenge: r.laenge }; })
    .sort((a, b) => a.d - b.d);
  const [erster, zweiter] = bewertet;
  if (!erster || erster.d > GRENZE_ANNAHME) return { art: 'nochmal', grund: 'zu weit' };
  const vorsprung = zweiter ? zweiter.d - erster.d : 1;
  // Ein Wort, das eine Silbe zu kurz oder zu lang ist, wird NIE ohne
  // Rueckfrage angenommen - auch wenn es klanglich passt. "Meintest du
  // Bayern?" ist die richtige Antwort auf "Bayer", nicht "richtig".
  const sicher = (erster.d <= GRENZE_SICHER || vorsprung >= ABSTAND_NOETIG)
                 && erster.laenge < LAENGE_SICHER;
  return {
    art: sicher ? 'angenommen' : 'rueckfrage',
    id: erster.k.id, name: erster.k.name,
    abstand: +erster.d.toFixed(3), vorsprung: +vorsprung.toFixed(3),
  };
}

/* -------------------------------------------------- Tippen (Lea) -------- */

/**
 * Rechtschreibbewertung. Die Rechtschreibung IST der Lerninhalt - deshalb
 * sagt die Rueckmeldung, WAS falsch war, nicht nur DASS.
 */
export function rechtschreibung(eingabe, name) {
  const e = (eingabe || '').trim();
  if (!e) return { urteil: 'leer' };
  if (e === name) return { urteil: 'richtig' };
  if (e.toLowerCase() === name.toLowerCase())
    return { urteil: 'fast', hinweis: 'Fast! Namen schreibt man groß.' };

  const ohneStrich = (x) => x.replace(/[- ]/g, '');
  if (ohneStrich(e).toLowerCase() === ohneStrich(name).toLowerCase()) {
    if (name.includes('-') && !e.includes('-'))
      return { urteil: 'fast', hinweis: 'Fast! Da fehlt ein Bindestrich.' };
    if (!name.includes('-') && e.includes('-'))
      return { urteil: 'fast', hinweis: 'Fast! Da gehört kein Bindestrich hin.' };
    return { urteil: 'fast', hinweis: 'Fast! Achte auf die Leerzeichen.' };
  }
  if (normalisieren(e) === normalisieren(name)) {
    const fehlt = [...'äöüß'].find(u => name.toLowerCase().includes(u) && !e.toLowerCase().includes(u));
    return { urteil: 'fast',
      hinweis: fehlt ? `Fast! Da gehört ein ${fehlt.toUpperCase()} hin.` : 'Fast! Achte auf die Umlaute.' };
  }
  // Ein einziger Buchstabe daneben: die Stelle zeigen, nicht die Lösung.
  const d = levenshtein(e.toLowerCase(), name.toLowerCase());
  if (d <= Math.max(1, Math.floor(name.length / 8))) {
    let i = 0; while (i < e.length && e[i].toLowerCase() === name[i]?.toLowerCase()) i++;
    return { urteil: 'fast', stelle: i,
      hinweis: `Fast! Schau noch mal ab dem ${i + 1}. Buchstaben.` };
  }
  return { urteil: 'falsch' };
}
