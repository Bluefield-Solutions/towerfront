/* Fuenf Faecher nach Leitner.
 *
 * Reiner Zufall laesst ein Kind das, was es schon kann, endlos wiederholen
 * und das, was es nicht kann, zufaellig oft.
 *
 * Die Auswahl ist DETERMINISTISCH mit gesetztem Zufallskeim. Ohne das laesst
 * sich die Lernlogik nur behaupten, nicht beweisen.
 */
/**
 * Die Abstaende. Nicht die Lehrbuchreihe 1/3/7/21 Tage.
 *
 * Mit einem TAG zwischen Fach 1 und 2 kommt ein Kind, das nachmittags
 * dreimal spielt, nie ueber Fach 2 hinaus - und sieht deshalb tagelang
 * keinen einzigen Aufkleber. Der Rauchtest hat genau das gezeigt: drei
 * richtige Antworten, null Aufkleber.
 *
 * Zehn Minuten fuer den zweiten Durchgang macht den ersten Aufkleber
 * innerhalb einer Sitzungsfolge erreichbar, ohne die Wiederholungslogik
 * aufzugeben: ab Fach 3 gelten wieder Tage.
 */
export const FAECHER = [
  { fach: 1, minuten: 0 },        // jede Sitzung
  { fach: 2, minuten: 10 },       // gleicher Nachmittag
  { fach: 3, minuten: 60 * 24 },  // 1 Tag  - ab hier gibt es einen Aufkleber
  { fach: 4, minuten: 60 * 24 * 3 },
  { fach: 5, minuten: 60 * 24 * 10 },  // gilt als gekonnt
];
const MINUTE = 60000;

export function neuerStand() { return {}; }

/** Einen Gegenstand nach einer Antwort verschieben. */
export function verschieben(stand, id, richtig, jetzt) {
  const alt = stand[id] || { fach: 1, faellig: 0, richtig: 0, falsch: 0 };
  const fach = richtig ? Math.min(5, alt.fach + 1) : 1;
  return { ...stand, [id]: {
    fach,
    faellig: jetzt + FAECHER[fach - 1].minuten * MINUTE,
    richtig: alt.richtig + (richtig ? 1 : 0),
    falsch: alt.falsch + (richtig ? 0 : 1),
    zuletzt: jetzt,
  }};
}

export const istFaellig = (stand, id, jetzt) => !stand[id] || stand[id].faellig <= jetzt;
export const istGekonnt = (stand, id) => (stand[id]?.fach ?? 1) >= 5;

/**
 * Ab wann es einen Aufkleber gibt.
 *
 * NICHT erst bei Fach 5. Dorthin braucht ein Gegenstand vier richtige
 * Antworten ueber mehr als drei Wochen - das Forscherbuch bliebe fuer eine
 * Sechsjaehrige wochenlang leer, und die Zusage aus dem Konzept ("sichtbarer
 * Fortschritt, der bleibt") waere gebrochen.
 *
 * Fach 3 heisst: zweimal hintereinander richtig. Das ist innerhalb einer
 * oder zwei Sitzungen zu erreichen und bedeutet trotzdem etwas.
 */
export const HAT_AUFKLEBER = 3;
export const istGesammelt = (stand, id) => (stand[id]?.fach ?? 1) >= HAT_AUFKLEBER;

function keimZufall(keim) {
  let s = keim >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function mischen(a, r) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/**
 * Eine Sitzung zusammenstellen: 70 % faellig, 20 % neu, 10 % gekonnt zur
 * Auffrischung - und NIE mehr als zwei schwere hintereinander. Ein Kind, das
 * dreimal nacheinander scheitert, hoert auf zu spielen.
 */
export function sitzung(alle, stand, laenge, jetzt, keim) {
  const r = keimZufall(keim);
  const neu = alle.filter(g => !stand[g.id]);
  const faellig = alle.filter(g => stand[g.id] && istFaellig(stand, g.id, jetzt) && !istGekonnt(stand, g.id));
  const gekonnt = alle.filter(g => istGekonnt(stand, g.id));

  const nimm = (liste, n) => mischen(liste, r).slice(0, Math.max(0, n));
  let aus = [
    ...nimm(faellig, Math.round(laenge * 0.7)),
    ...nimm(neu,     Math.round(laenge * 0.2)),
    ...nimm(gekonnt, Math.round(laenge * 0.1)),
  ];
  // Auffuellen - und dabei ANGEFANGENES vor Neuem.
  //
  // Beim Zufallsauffuellen bekam ein Kind in der zweiten Sitzung fast nur
  // neue Gegenstaende, und kein einziger erreichte Fach 3: das Forscherbuch
  // blieb leer, obwohl zwoelf Antworten richtig waren. Wer etwas angefangen
  // hat, soll es zu Ende bringen duerfen.
  const rest = mischen(alle.filter(g => !aus.some(x => x.id === g.id)), r)
    .sort((a, b) => {
      const fa = stand[a.id]?.fach ?? 0, fb = stand[b.id]?.fach ?? 0;
      if (fa === fb) return 0;
      if (!fa) return 1; if (!fb) return -1;       // Neues ans Ende
      return fb - fa;                               // hoeheres Fach zuerst
    });
  aus = [...aus, ...rest.slice(0, Math.max(0, laenge - aus.length))]
    .slice(0, Math.min(laenge, alle.length));

  // Schwere Gegenstaende entzerren: hoechstens zwei am Stueck.
  const schwer = (g) => (stand[g.id]?.falsch ?? 0) > (stand[g.id]?.richtig ?? 0);
  aus = mischen(aus, r);
  for (let i = 2; i < aus.length; i++) {
    if (schwer(aus[i]) && schwer(aus[i-1]) && schwer(aus[i-2])) {
      const j = aus.findIndex((g, k) => k > i && !schwer(g));
      if (j > 0) { [aus[i], aus[j]] = [aus[j], aus[i]]; }
    }
  }
  return aus;
}

/**
 * Wieviel ist geschafft. Drei Zahlen, nicht eine:
 *   gesammelt  hat einen Aufkleber (Fach 3+)   - was das Kind SIEHT
 *   gekonnt    Fach 5                          - was es WIRKLICH kann
 *   anteil     mittlere Fachhoehe              - was der Balken zeigt
 *
 * Der Balken haengt am Mittel, nicht an Fach 5. Sonst steht er tagelang auf
 * null, obwohl jede Sitzung etwas bewegt hat.
 */
export function fortschritt(alle, stand) {
  const gesammelt = alle.filter(g => istGesammelt(stand, g.id)).length;
  const gekonnt = alle.filter(g => istGekonnt(stand, g.id)).length;
  const summe = alle.reduce((a, g) => a + ((stand[g.id]?.fach ?? 1) - 1), 0);
  return { gesammelt, gekonnt, gesamt: alle.length,
           anteil: alle.length ? summe / (alle.length * 4) : 0 };
}
