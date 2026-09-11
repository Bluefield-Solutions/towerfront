#!/usr/bin/env node
/**
 * Gegenproben — schlagen die Tore auch wirklich an?
 *
 * Ein Tor, das nie etwas meldet, ist kein Beweis. Es könnte genauso gut leer
 * sein. Die einzige Art, das zu prüfen, ist einen Fehler einzubauen und
 * nachzusehen, ob er auffällt.
 *
 * Bisher war das Handarbeit: Muster ersetzen, Prüfung starten, zurücknehmen.
 * Drei Dinge gingen dabei regelmäßig schief.
 *
 *  1. **Vier Mal hat ein `git checkout` frische Arbeit gelöscht**, weil noch
 *     nicht eingecheckt war. Deshalb verweigert dieses Werkzeug den Dienst bei
 *     schmutzigem Baum — die Regel steht nicht mehr nur in der Doku, sie wird
 *     durchgesetzt.
 *  2. **Die Proben waren nach der Sitzung weg.** Jetzt stehen sie hier und
 *     lassen sich jederzeit wiederholen.
 *  3. **Manche Probe kam gar nicht an** — das Muster hatte sich geändert, die
 *     Ersetzung lief ins Leere, und das Ergebnis sah aus wie ein bestandenes
 *     Tor. Drei von zehn waren betroffen. Deshalb prüft jede Probe zuerst, ob
 *     ihr Eingriff überhaupt gegriffen hat.
 *
 * Aufruf:  npm run proben              alle
 *          npm run proben -- lesbar    nur passende
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Das Verzeichnis der stehenden Gegenproben.
 *
 *  `suche` muss im Baum genau einmal vorkommen — sonst ist nicht klar, was
 *  verändert wurde. `tor` ist der Befehl, der anschlagen soll.
 *
 *  Statt `suche` kann auch `regel` stehen: ein regulärer Ausdruck mit
 *  Ersetzung. Das ist der wichtigere Weg, und der Grund dafür ist Erfahrung:
 *  Proben, die auf feste Zahlen zeigen — eine Wegkoordinate, ein
 *  Kurvenwert — veralten bei jeder Balance-Runde. Zweimal hat das Verzeichnis
 *  deshalb "Muster fehlt" gemeldet, ohne dass an den Toren etwas falsch war.
 *  Eine Regel wie `hpEnd: [0-9.]+, hpCurve: 2\.4` überlebt das. */
/** Ein gueltiges, aber leeres Symbol: 180 x 180, einfarbig dunkel.
 *  Von Hand als PNG gebaut, damit die Probe keine Bibliothek braucht - und
 *  weil genau diese Datei der Fehler aus S136 ist. */
const LEERES_SYMBOL = await (async () => {
  const sharp = (await import('sharp')).default;
  const b = await sharp({
    create: { width: 180, height: 180, channels: 3, background: '#080B18' },
  }).png().toBuffer();
  return b.toString('base64');
})();

export const PROBEN = [
  {
    name: 'Weg knickt scharf ab',
    datei: 'src/data/wegnetz.ts',
    // **Umgezogen in v278.** Bis v277 stand die Punktliste in `maps.ts`, und
    // die Probe griff dort zu. Seit die Bahnen aus `WEGNETZ` folgen, gibt es
    // in `maps.ts` keine Punkte mehr - die alte Regel haette auf KEINER Karte
    // mehr getroffen. Genau die Verfallsart, die dieselbe Probe schon in v233
    // hatte (K1: ein Tor, das seinen Gegenstand verliert, wird in derselben
    // Runde nachgezogen oder gestrichen).
    //
    // Als Regel, nicht als fester Wert: Wegkoordinaten aendern sich mit jeder
    // neuen Karte, und eine Probe, die daran haengt, veraltet lautlos.
    regel: /(punkte: \[\n\s*\{ x: \d+, y: )(\d+)/,
    // Nicht 950: bei Karten, deren erste Bahn ohnehin unten verlaeuft, waere
    // das kaum eine Aenderung. Null zieht den Punkt zuverlaessig an den
    // oberen Rand und erzeugt damit den scharfen Knick, den die Probe braucht.
    ersatz: '$10',
    tor: 'guards',
  },
  {
    // **Das Netz ist seit v278 die einzige Punktliste.** Verschiebt sie sich,
    // laufen die Gegner woanders - und niemand saehe es, weil `maps.ts` keine
    // zweite Liste mehr haelt, gegen die man vergleichen koennte. Der Stand in
    // `tools/wegnetz-stand.txt` ist aus den Bahnen von v277 erzeugt und haelt
    // genau das.
    name: 'Das Wegenetz ist verschoben',
    datei: 'src/data/wegnetz.ts',
    // Der erste Knoten wandert 200 Weltpunkte nach rechts. Als Regel, damit
    // die Probe eine neue Karte ueberlebt.
    regel: /(knoten: \[\n\s*\{ id: '[a-z0-9]+', x: )(-?\d+)/,
    ersatz: '$1900',
    tor: 'netztor',
    meldet: 'Weltpunkte neben dem Stand',
  },
  {
    // **Die Nullprobe der Ausweichprobe (Regel 13).** Das Tor behauptet, es
    // merke, wenn die Ableitung nach dem Wegfall einer Kante stillschweigend
    // die alte Route behaelt. Beweisen laesst sich das nur, indem man ihm den
    // Fall STELLT: wird gar keine Kante entfernt, MUSS es anschlagen. Ohne
    // diese Probe waere die Ausweichprobe eine Zeile, die nie etwas meldet.
    name: 'Die Ausweichprobe entfernt gar keine Kante',
    datei: 'tools/netz.ts',
    regel: /netz\.kanten\.filter\(\(k\) => k\.id !== weg\)/,
    ersatz: 'netz.kanten.filter(() => true)',
    tor: 'netztor',
    meldet: 'stillschweigend',
  },
  {
    // **Ein Einkommensgebaeude, das schiesst, ist kein Tausch mehr.** Der
    // ganze Sinn des Foerderers ist, dass er einen Bauplatz belegt und nichts
    // dafuer tut ausser Gold. Wer ihm einen Angriff gibt, macht ihn zum
    // fuenften Turm mit Bonus - und dann baut man ihn immer.
    name: 'Der Foerderer schiesst',
    datei: 'src/data/towers.ts',
    regel: /attack: 'keiner', hitsAir: false/,
    ersatz: "attack: 'single', hitsAir: false",
    tor: 'guards',
    meldet: 'schiesst nicht',
  },
  {
    // **Und er darf auch keine Schadenszahl tragen.** Der Angriffstyp allein
    // reicht nicht: eine Zahl, die heute niemand liest, wird morgen gelesen.
    name: 'Der Foerderer traegt Schaden',
    datei: 'src/data/towers.ts',
    regel: /base: \{ cost: 90, damage: 0, cooldown: 0 \}/,
    ersatz: 'base: { cost: 90, damage: 7, cooldown: 0 }',
    tor: 'guards',
    meldet: 'Schadenswerte',
  },
  {
    // **Zwei Weichen auf derselben Kante: eine von beiden entscheidet nichts.**
    // Der Eingriff haengt den Kammbogen auf die Kante der Nordschleife um.
    // Dann fallen zwei der vier Stellungen zusammen, und die Spreizung faellt
    // von 1,43 auf die einer einzelnen Weiche - der Weichenfenster-Waechter
    // muss es melden.
    name: 'Zwei Weichen sperren dieselbe Kante',
    datei: 'src/data/wegnetz.ts',
    regel: /\{ id: 'saeule3', kante: '[a-z0-9-]+', name: 'Kammbogen' \}/,
    ersatz: "{ id: 'saeule3', kante: 'kreuz1-kreuz2', name: 'Kammbogen' }",
    tor: 'guards',
    meldet: 'entscheidet nichts',
  },
  {
    // **Entwurf und Netz muessen dasselbe sagen.** Der Eingriff schiebt den
    // ersten Zwischenpunkt der Ascheschlucht-Weiche auf ihr groesstes
    // Felsnest; im Netz steht der alte. Laufen die beiden auseinander, luegt
    // eines von beiden - und das faellt sonst erst auf, wenn jemand Jahre
    // spaeter den Entwurf liest und glaubt, er beschreibe die Karte.
    name: 'Weichenentwurf und Netz laufen auseinander',
    datei: 'entwurf/weichen.json',
    // Die Datei steht mit einem Feld je Zeile da (so schreibt sie
    // `json.dump`), deshalb greift die Regel an der Zahl statt am Objekt.
    regel: /"x": 520,\n(\s*)"y": 430,/,
    ersatz: '"x": 957,\n$1"y": 135,',
    tor: 'weichenbau',
    meldet: 'laufen auseinander',
  },
  {
    // **Zwei Weichenstile, die dasselbe tun, sind ein Stil mit zwei Namen.**
    // Der Eingriff laesst `lang` alles offen lassen - dann sind beide Stile
    // derselbe, und `npm run sim` muss es melden. Genau diese Pruefung hat in
    // v283 den dritten Stil (`deckung`) erledigt; ohne die Probe waere sie
    // eine Zeile, die einmal etwas gesagt hat und danach nie wieder.
    name: 'Zwei Weichenstile tun dasselbe',
    datei: 'tools/sim.ts',
    regel: /if \(!alle\.length \|\| bot\.weichenStil === 'offen'\) return new Set\(\);/,
    // Ohne den Stiltest will JEDER Stil alles zu - und weil `weichenWahl`
    // seit v283 die einzige Stelle ist, an der das entschieden wird, trifft
    // der Eingriff beide Zeitpunkte: vor dem ersten Turm und vor jeder Welle.
    ersatz: 'if (!alle.length) return new Set();',
    tor: 'sim',
    meldet: 'zwei Namen fuer denselben Stil',
  },
  {
    // **Der Brocken sagte nicht, wohin er faellt (S-N5-06).** Der Eingriff
    // nimmt die Anflugbahn heraus und laesst alles andere stehen - Ring,
    // Brocken und Stummel bleiben also im Bild. Genau dieser Zustand hat den
    // Inspektorlauf v273 zu "zwei Anzeigen, die an verschiedene Orte zeigen"
    // gebracht, und genau er muss die groesste Luecke von 3,7 auf ueber
    // 60 % treiben.
    name: 'Der Meteor zeigt seinen Einschlag nicht an',
    datei: 'src/gfx/renderer.ts',
    regel: /    ctx\.moveTo\(fx, fy\); ctx\.lineTo\(zx, zy\);\n/,
    ersatz: '    ctx.moveTo(fx, fy); ctx.lineTo(fx, fy);\n',
    tor: 'bildtor',
    meldet: 'groesste Luecke zwischen Brocken und Einschlag',
  },
  {
    // **Eine Mechanik, die man nicht sieht, gibt es nicht.** Der Eingriff
    // nimmt die Zeichnung aus dem Bild; die Zahl der geaenderten Bildpunkte
    // muss dann auf null fallen. Ohne diese Probe bewiese die Messung nur,
    // dass zwei Bilder verschieden sind - nicht, dass der Unterschied die
    // Weiche ist (Regel 13).
    name: 'Die Weiche wird nicht mehr gezeichnet',
    datei: 'src/gfx/renderer.ts',
    regel: /\n    this\.weicheZeichnen\(s\);/,
    ersatz: '',
    tor: 'bildtor',
    meldet: 'nicht zu sehen',
  },
  {
    // **Eine Stellung, die alles zumacht, ist ein Knopf mit der Aufschrift
    // "gewinnen".** Der Waechter faehrt deshalb ALLE Stellungen, nicht die
    // eine, die gerade gesetzt ist - der Grundzustand ist trivial in Ordnung,
    // was schiefgeht, geht in einer der anderen schief.
    name: 'Eine Weichenstellung sperrt alles zu',
    datei: 'src/data/wegnetz.ts',
    regel: /\{ id: 'saeule1', kante: '[a-z0-9-]+', name: 'Nordschleife' \}/,
    ersatz: "{ id: 'saeule1', kante: 'tor1-kreuz1', name: 'Nordschleife' }",
    tor: 'guards',
    meldet: 'sperrt alles zu',
  },
  {
    // **Das Weichenfenster, von oben gehalten** (v313).
    //
    // Vorher stand hier "Die Weiche sperrt den Umweg statt des kurzen Wegs":
    // sie liess `saeule1` den UMWEG sperren, damit der kurze Ast bleibt, die
    // Bahn sich nicht aendert und die Spreizung auf 1,00 faellt - erwartet
    // wurde "Dekoration". Gemessen tut der Eingriff das heute nicht mehr: er
    // laesst zwei STELLUNGEN zusammenfallen, und das meldet die Pruefung eine
    // Zeile hoeher ("entscheidet nichts"), die ihre eigene Gegenprobe hat.
    //
    // **Fuenf Eingriffe sind fuer die untere Schranke gebaut und gemessen,
    // keiner traegt** (Spiralhain, Band 1,1 bis 2,5):
    //
    //   Umleitung auf die kurze Geometrie      1,17   (saeule3 haelt das Fenster)
    //   saeule3-Umleitung begradigt            1,34   (die Route rechnet um)
    //   gemeinsame Kante verlaengert           1,23   (dito - es ist ein VERHAELTNIS)
    //   saeule1 auf die Umleitung                --   faellt vorher als Dublette
    //   beide Umleitungen zugleich               --   ein Ersatz kann nur EINE Stelle treffen
    //
    // Der Grund ist strukturell und kein Versehen: vier unabhaengige Weichen
    // halten das Fenster auf, und die Rechnung sucht nach jedem Eingriff die
    // kuerzeste Route neu. Mit EINEM Eingriff ist die untere Schranke auf
    // diesem Netz nicht mehr zu stellen.
    //
    // **Gehalten wird die Rechnung deshalb von oben**, und das ist dieselbe
    // Rechnung: `laengste / kuerzeste` ueber alle Stellungen. Eine aufgeblaehte
    // Umleitung treibt sie ueber 2,5, und das Tor meldet den Knopf. Bricht die
    // Rechnung, fallen beide Schranken - die obere schlaegt dann an.
    //
    // **Was NICHT mehr gehalten ist, steht als N4W im Verzeichnis** statt hier
    // still zu bleiben: die untere Schranke selbst.
    //
    // Die Punkte werden VOR die vorhandenen gesetzt, nicht an ihre Stelle -
    // damit ueberlebt der Eingriff jede Umzeichnung der Umleitung.
    name: 'Das Weichenfenster wird zum Knopf',
    datei: 'src/data/wegnetz.ts',
    regel: /(id: 'kreuz1-kreuz2-2', von: '[a-z0-9]+', nach: '[a-z0-9]+',\n\s*punkte: \[\n)/,
    ersatz: '$1          { x: 300, y: 990, w: 46 }, { x: 1700, y: 990, w: 46 },\n'
      + '          { x: 1700, y: 120, w: 46 }, { x: 300, y: 120, w: 46 },\n',
    tor: 'guards',
    meldet: 'sondern ein Knopf',
  },
  {
    // **Eine Weiche wird nur zwischen den Wellen umgelegt.** Ohne die Sperre
    // springt jeder Gegner auf die neue Kurve - dieselbe zurueckgelegte
    // Strecke, anderer Ort. Der Rauchtest misst den Sprung, nicht den
    // Rueckgabewert: ein `false` sagt nur, dass die Funktion nein gesagt hat.
    name: 'Weiche laesst sich mitten in der Welle umlegen',
    datei: 'src/game/state.ts',
    regel: /if \(this\.waveActive \|\| this\.enemies\.length > 0 \|\| this\.pending\.length > 0\) return false;/,
    ersatz: '',
    tor: 'smoke',
    meldet: 'gesprungen',
  },
  {
    // **Die Weichenstellung gehoert in den Spielstand.** Ohne sie liefen die
    // Gegner nach dem Laden wieder die kurze Bahn, waehrend die Tuerme am
    // Umweg stehen. Geprueft wird nicht das Feld, sondern die Bahnlaenge
    // nach dem Laden - ein Feld, das beim Laden niemand liest, sieht aus wie
    // eines, das fehlt (v137).
    name: 'Der Spielstand vergisst die Weichen',
    datei: 'src/game/state.ts',
    regel: /for \(const id of save\.weichen \?\? \[\]\) this\.weicheStellen\(id, true\);/,
    ersatz: '',
    tor: 'smoke',
    meldet: 'Nach dem Laden ist die Bahn',
  },
  {
    // **Der Bahnspeicher muss die Weichenstellung mittragen.** Bis v279 stand
    // nur die Kartenkennung im Schluessel; seit eine Weiche die Bahn aendert,
    // waere das der Speicher, der nach dem Umlegen die ALTE Bahn zurueckgibt -
    // und zwar lautlos. Die Nullprobe des Rauchtests faengt es.
    name: 'Der Bahnspeicher vergisst die Weichenstellung',
    datei: 'src/data/maps.ts',
    regel: /const schluessel = weichen\?\.size\n\s*\? `\$\{map\.id\}\|\$\{\[\.\.\.weichen\]\.sort\(\)\.join\(','\)\}` : map\.id;/,
    ersatz: 'const schluessel = map.id;',
    tor: 'smoke',
    meldet: 'aendert die Bahn kaum',
  },
  {
    // **Die Kostenfunktion muss die KUERZESTE Route nehmen.** Heute hat keine
    // der vier Karten eine zweite Route - `kuerzesteRoute` koennte an ihnen
    // die laengste nehmen, die erstbeste oder wuerfeln, und alle sieben
    // Bahnen blieben deckungsgleich. Deshalb stellt das Tor den Fall an einem
    // eigenen Netz mit zwei Wegen; diese Probe prueft, dass es ihn wirklich
    // sieht (Regel 5).
    name: 'Die Route nimmt den laengsten Weg',
    datei: 'src/core/route.ts',
    regel: /alt\.kosten < kosten/,
    ersatz: 'alt.kosten > kosten',
    tor: 'netztor',
    meldet: 'kuerzeste Route',
  },
  {
    // **Bei Gleichstand darf nicht die Zeilenfolge entscheiden.** Sonst
    // haengt der Verlauf einer Partie daran, wer die Datei zuletzt sortiert
    // hat - und das Determinismus-Tor faende es nie, weil es zweimal
    // DIESELBE Datei fuehrt.
    name: 'Gleich lange Routen entscheidet die Zeilenfolge',
    datei: 'src/core/route.ts',
    regel: /\|\| \(alt\.kosten === kosten && alt\.weg\.join\(\) <= \[\.\.\.stand\.weg, kante\.id\]\.join\(\)\)/,
    ersatz: '|| alt.kosten === kosten',
    tor: 'netztor',
    meldet: 'Zeilenfolge',
  },
  {
    // **Eine Kreuzung ist kein Knoten**, und das ist keine Feinheit: auf der
    // Ascheschlucht laufen beide Bahnen durch 1330:980, kommen aber aus
    // verschiedenen Richtungen und gehen in verschiedene. Wer daraus einen
    // Knoten macht, gibt dem Netz eine Wahl, die es im Bild nicht gibt - und
    // die gerechnete Route nimmt fuer BEIDE Tore die kuerzere Fortsetzung,
    // also eine Bahn, die es nie gab.
    name: 'Jeder geteilte Punkt wird zum Knoten',
    datei: 'src/data/wegnetz.ts',
    regel: /(for \(const s of e\.vor\.values\(\)\) if \(s\.size > 1\) return true;    \/\/ Vereinigung\n    )return false;/,
    ersatz: '$1return true;',
    tor: 'netztor',
  },
  {
    // **Der Rundlauf haelt die beiden Richtungen zusammen.** `netzAusBahnen`
    // und `bahnenAusNetz` muessen zueinander invers sein; ist eine von beiden
    // falsch, faellt es sonst erst auf, wenn `npm run bahnbau` eine Karte
    // eintraegt - also genau an dem Tag, an dem eine neue Karte kommt.
    name: 'Netz aus Bahnen verliert einen Punkt',
    datei: 'src/data/wegnetz.ts',
    regel: /bahn\.slice\(vonIdx \+ 1, i\)/,
    ersatz: 'bahn.slice(vonIdx + 1, i - 1)',
    tor: 'netztor',
    meldet: 'Rundlauf',
  },
  {
    // **Der Waechter war blind, wo das Projekt steht.** Seine Zahlwort-Tabelle
    // kannte drei bis fuenfundzwanzig, die Kette hat einunddreissig Schritte -
    // also konnte kein Dokument die Torzahl mehr falsch schreiben, ohne dass
    // es durchging. `Towerfront-KONZEPT-und-PIPELINE.md` behauptete sieben
    // Fassungen lang "neunundzwanzig Pruefungen".
    //
    // Eine Pruefung, deren Wertebereich hinter ihrem Gegenstand zurueckbleibt,
    // sieht aus wie eine Pruefung.
    //
    // **Und die Probe selbst ist genau daran verfallen** (gefunden im vollen
    // Lauf zu v239). Sie nahm der Tabelle den Eintrag `31`, weil die Kette
    // damals einunddreissig Schritte hatte - "als Regel, damit sie mit jedem
    // neuen Tor mitwandert", stand hier. Sie wanderte nicht: mit dem
    // zweiunddreissigsten Tor (`uxaudittor`) fragt der Waechter nach 32, und
    // ob 31 in der Tabelle steht, ist ihm gleichgueltig. Der Eingriff kam an,
    // das Tor schwieg zu Recht, und `npm run muster` konnte es nicht sehen -
    // sein Muster passte ja noch.
    //
    // Jetzt wird die Tabelle bei 26 abgeschnitten, also auf ihren Stand vor
    // v230 zurueckgesetzt. Das ist der historische Fehler selbst, und es
    // bleibt richtig, solange die Kette mehr als 26 Schritte hat - bei
    // weniger waere die Tabelle ja auch nicht zu kurz.
    name: 'Zahlwort-Tabelle kuerzer als die Torkette',
    datei: 'tools/docs.mjs',
    regel: /\n  27: 'siebenundzwanzig'[\s\S]*?40: 'vierzig',/,
    ersatz: '',
    tor: 'doku',
    meldet: 'Zahlwort-Tabelle in tools/docs.mjs kennt',
  },
  {
    // **Die Abnahmegrenzen stehen nur im Bildauftrag** (Regel 15), und
    // `npm run kartenprobe` misst dagegen. Nur steht `kartenprobe` NICHT in
    // der Torkette - es prueft einen Kandidaten, nicht den Bestand.
    //
    // In v228 habe ich die Abnahmetabelle in Abschnitt 8c umsortiert und
    // damit den Leser gebrochen: die Forderung stand danach in der zweiten
    // statt in der letzten Spalte. Die Torkette blieb gruen. Aufgefallen ist
    // es erst, als ein Kandidat zu messen war - eine Runde spaeter.
    //
    // Ein Werkzeug, dessen Eingang niemand prueft, ist im Ernstfall kaputt.
    name: 'Abnahmegrenzen im Bildauftrag unlesbar',
    datei: 'docs/Towerfront-BILDAUFTRAG.md',
    // **Nachgestellt wird der Fehler selbst**, nicht ein anderer: die
    // Forderung wandert von der letzten in die zweite Spalte. Der erste
    // Entwurf setzte stattdessen ein Zeichen um und liess die Zahl lesbar -
    // das Tor schwieg zu Recht, und die Probe bewies nichts (Regel 3).
    //
    // An der Form statt an der Zahl: die Grenze darf sich aendern, ohne dass
    // die Probe veraltet.
    regel: /(\| `npm run kartenprobe` Wegfreiheit \| )(.*?)\| (\*\*≤ \d+ Farbschritte\*\*) \|/,
    ersatz: '$1$3 | $2|',
    tor: 'guards',
    meldet: 'steht keine Zahl',
  },
  {
    // **Gefunden beim Vorbereiten der Bildbestellung 8c (v228), und zwar mit
    // dem Auge**: das Referenzblatt zeigte einen roten Ring auf dem blauen.
    // Nachgemessen lagen drei unwegsame Flecken IN der Zielplattform, einer
    // davon 58 Weltpunkte vom Mittelpunkt. Er sperrt das Bauen am Kristall -
    // und `npm run wegvorlage` haette ihn als roten Ring in das naechste
    // Kartenbild getragen.
    name: 'Unwegsamer Fleck auf der Zielplattform',
    datei: 'src/data/maps.ts',
    // Als Regel, nicht als feste Lage: der erste Fleck der ersten Karte wird
    // auf ihren Zielpunkt geschoben. Feste Koordinaten veralten mit jeder
    // neuen Karte, und eine Probe, die daran haengt, veraltet lautlos.
    regel: /(rough: \[\n\s*)\{ x: \d+, y: \d+/,
    ersatz: '$1{ x: 1734, y: 454',
    tor: 'guards',
    meldet: 'ragt',
  },
  {
    name: 'Bauplatz mitten auf dem Weg',
    datei: 'src/data/maps.ts',
    suche: 'export const PATH_CLEARANCE = 30;',
    ersatz: 'export const PATH_CLEARANCE = -400;',
    tor: 'guards',
  },
  {
    // Diese Probe griff bis v104 am Rohwert an - und lief seit der
    // zusammenziehenden Anhebung ins Leere: der Zug zur Zielbreite holte den
    // eingebauten Fehler wieder heraus, bevor das Tor ihn sehen konnte
    // (Spaeher 20 statt 51 Rohbreite, gezogen auf 56 - unauffaellig).
    //
    // Das ist die dritte Fassung von Fall 3 aus dem Kopf dieser Datei: der
    // Eingriff KAM an, das Muster passte, und trotzdem bewies der Lauf
    // nichts. Ein Eingriff, den der Code selbst repariert, sieht genauso aus
    // wie ein bestandenes Tor. Deshalb greift die Probe jetzt am Ergebnis an,
    // hinter der letzten Rechnung - dort kann nichts mehr dazwischenkommen.
    name: 'Gegner zu klein zum Erkennen',
    datei: 'src/gfx/enemyart.ts',
    regel: /return roh >= ZIELBREITE \? roh : roh \+ \(ZIELBREITE - roh\) \* ZUG;/,
    ersatz: 'return roh * 0.35;',
    tor: 'lesbarkeit',
  },
  {
    name: 'Knopf unter dem Richtwert',
    datei: 'src/style.css',
    // Der Anker war bis v238 `.tower-btn .n` - die Namenszeile des
    // Turmknopfs. Sie ist mit v239 entfallen, weil der Knopf jetzt das
    // Turmbild traegt; die Probe zeigte danach ins Leere. Neuer Anker ist
    // die Bildflaeche, die an derselben Stelle steht.
    suche: '  min-height: 46px;\n}\n.tower-btn .t-bild',
    ersatz: '  min-height: 20px;\n}\n.tower-btn .t-bild',
    tor: 'beruehrung',
  },
  {
    // Die Auflage ist der Grund, aus dem ein 20 Punkte hoher Eintrag
    // trotzdem zu treffen ist. Faellt sie weg, muss die Stilvorlagenpruefung
    // das sehen - sonst haette sie die Loesung nie gemessen, die sie erlaubt.
    name: 'Trefferauflage der Vorschau geschrumpft',
    datei: 'src/style.css',
    suche: 'inset: -18px -5px -8px;',
    ersatz: 'inset: -2px -5px;',
    tor: 'beruehrung',
  },
  {
    name: 'Trefferzugabe abgeschaltet',
    datei: 'src/game/state.ts',
    suche: 'const slack = Math.max(10, GameState.tapSlack(scale));',
    ersatz: 'const slack = 10;',
    tor: 'smoke',
  },
  {
    name: 'Zweiter Ausbauzweig unerreichbar',
    datei: 'src/ui/ui.ts',
    suche: 'data-branch="${i}"',
    ersatz: 'data-branch="0"',
    tor: 'smoke',
  },
  {
    name: 'Kein Rückweg aus dem Ergebnis',
    datei: 'src/game/menu.ts',
    // Neu angesetzt in v305: der Zweig ist mit der Abschnittswahl mehrzeilig
    // geworden (er beendet jetzt auch den Lauf), und der alte Suchtext traf
    // nichts mehr. Gemeldet hat es `npm run muster` in derselben Runde -
    // genau wofuer es da ist.
    suche: "      if (this.lauf) this.onLaufEnde();\n      this.view = 'map';",
    ersatz: "      if (this.lauf) this.onLaufEnde();",
    tor: 'smoke',
  },
  {
    name: 'Schwarzes Bild',
    datei: 'src/gfx/renderer.ts',
    suche: '    drawMenu(ctx, this.menu!);',
    ersatz: '    ctx.fillStyle = "#000"; ctx.fillRect(-9e4, -9e4, 18e4, 18e4);',
    tor: 'bildtor',
  },
  {
    name: 'Doku nennt einen Befehl, den es nicht gibt',
    datei: 'CLAUDE.md',
    // Auf die Zeile im Befehlsblock verankert, nicht auf den blossen Text:
    // `npm run gate` steht seit v155 auch in der Ablauftabelle, und ein
    // Suchtext wirkt nur bei genau einem Treffer.
    regel: /^npm run gate( +)/m,
    ersatz: 'npm run gaat$1',
    tor: 'doku',
  },
  {
    // Als Regel, nicht als festes Zahlwort.
    //
    // Sie stand auf "vierzehn Prüfungen" und fiel aus, sobald die Kette um
    // ein Tor wuchs - "Muster fehlt", genau Fall 3 aus dem Kopf dieser
    // Datei. Eine Probe, die auf die Zahl zeigt, die sie prüfen soll,
    // veraltet zwangsläufig mit ihr. Die Regel trifft jedes Zahlwort und
    // überlebt jede weitere Torrunde.
    name: 'Doku zählt die Tore falsch',
    datei: 'CLAUDE.md',
    // KEINE Wortliste mehr. Sie ist zweimal veraltet: bis v144 endete sie bei
    // "zwanzig" und traf "einundzwanzig" nur zur Haelfte ("einunddrei
    // Prüfungen" - der Waechter sucht mit Wortgrenze und sah nichts), bis
    // v152 endete sie bei "fünfund" und traf "sechsundzwanzig" gar nicht
    // mehr. Zweimal dieselbe Ursache: eine Probe, die aufzaehlt, was sie
    // pruefen soll, veraltet mit ihrem Gegenstand.
    //
    // Jetzt wird nicht mehr aufgezaehlt, sondern die STELLE genommen: was
    // in dieser Zeile vor "Prüfungen" steht, ist die Zahl - gleich wie sie
    // heisst. Das ueberlebt jede weitere Torrunde.
    regel: /(npm run gate\s+)\S+( Prüfungen)/,
    // "drei" ist nie richtig, solange die Kette mehr als drei Schritte hat -
    // und sie hat seit v11 nie weniger gehabt.
    ersatz: '$1drei$2',
    tor: 'doku',
  },
  {
    // **Umgedreht in v236.** Bis dahin hiess die Forderung "herausziehen darf
    // keinen Rand zeigen", und die Grenze war `coverScale`. Das ist fuer den
    // STARTZUSTAND richtig - und war fuer die GRENZE falsch: das Feld ist
    // 16:9, ein Notebook-Fenster ist fast immer hoeher, und dann schneidet
    // `cover` links und rechts ab. Auf 1400 x 900 sind das rund 240
    // Weltpunkte, ein Achtel der Karte, und man kam nicht heran.
    //
    // Die Uebersicht (`toggleOverview`) steht weiterhin auf `coverScale`;
    // nur wer von Hand weiter herauszieht, sieht alles und nimmt den
    // Sternengrund am Rand in Kauf.
    name: 'Herausziehen zeigt nicht mehr das ganze Feld',
    datei: 'src/gfx/renderer.ts',
    regel: /private get minZoom\(\): number \{ return this\.fitScale; \}/,
    ersatz: 'private get minZoom(): number { return this.coverScale; }',
    tor: 'smoke',
  },
  {
    name: 'Werteliste steht vor dem Ausbauen',
    datei: 'index.html',
    regel: /(<div class="insp-ups" id="i-ups"><\/div>)/,
    ersatz: '<dl class="insp-x"></dl>',
    tor: 'smoke',
  },
  {
    name: 'Sonne steht in der falschen Richtung',
    datei: 'src/data/config.ts',
    regel: /export const LICHT = \{ x: [-0-9.]+, y: [-0-9.]+ \};/,
    ersatz: 'export const LICHT = { x: -0.62, y: -0.78 };',
    tor: 'smoke',
  },
  {
    name: 'Turmwahl faellt aus der Zeichenkennung',
    datei: 'src/ui/ui.ts',
    regel: /      s\.buildAt \? `\$\{Math\.round\(s\.buildAt\.x\)\}:\$\{Math\.round\(s\.buildAt\.y\)\}` : '-',/,
    ersatz: "      '-',",
    tor: 'smoke',
  },
  {
    name: 'Uebersichtskarte mit festen Punkten',
    datei: 'src/game/menu.ts',
    regel: /const n = MAPS\.length;/,
    // Fuenf, nicht drei - bei drei Karten waere der Fehler heute unsichtbar
    // und die Probe damit wertlos.
    ersatz: 'const n = 5;',
    tor: 'smoke',
  },
  {
    // Bis v138 hiess diese Probe "Tuerme verschieden gross" und gab dem
    // Moerser einen eigenen Platzbedarf - damals war das der Fehler, weil
    // EINE Zahl Platzbedarf UND Zeichengroesse war. Seit v139 sind es zwei,
    // und der Fehler liegt anders herum: ein Platzbedarf weit ueber der
    // Zeichenbreite ist eine unsichtbare Sperre.
    name: 'Platzbedarf weit ueber der Zeichenbreite',
    datei: 'src/data/towers.ts',
    regel: /(id: 'mortar',[\s\S]{0,400}?)footprint: 116/,
    ersatz: '$1footprint: 160',
    tor: 'guards',
  },
  {
    // Und die Gegenrichtung: alle Sorten wieder gleich. Dann behauptet das
    // Konzept eine Entscheidung, die es nicht gibt.
    name: 'Platzbedarf wieder fuer alle gleich',
    datei: 'src/data/towers.ts',
    regel: /(id: 'mortar',[\s\S]{0,400}?)footprint: 116/,
    ersatz: '$1footprint: FOOTPRINT',
    // Stand bis v144 auf "smoke" und bewies nichts: der Rauchtest spielt
    // eine Partie, und die geht auch mit gleichen Platzbedarfen durch. Jetzt
    // misst der Datenwaechter die FOLGE - wieviele Stellungen der groesste
    // Turm gegenueber dem kleinsten verliert.
    tor: 'guards',
  },
  {
    // Ein Zahlwort im Kartentext, das der Karte widerspricht - genau der
    // Zustand bis v138 ("Zwei Zuwege" bei drei Bahnen).
    //
    // **Der Eingriff sagt seit v237 DREI.** Vorher stand hier "Zwei Zuwege",
    // und das war ein Widerspruch, solange die Ascheschlucht drei Bahnen
    // hatte. Seit sie zwei hat, ist der Satz richtig - und die Probe schwieg
    // zu Recht. Gemeldet hat es der Umfangslauf in derselben Runde, in der
    // die Karte umgebaut wurde.
    name: 'Kartentext widerspricht der Karte',
    datei: 'src/data/maps.ts',
    regel: /blurb: 'Der Boden glüht noch\./,
    ersatz: "blurb: 'Drei Zuwege münden früh ineinander.",
    tor: 'guards',
  },
  {
    name: 'Ausbau bringt keine Reichweite',
    datei: 'src/data/towers.ts',
    regel: /const REICHWEITE_STUFE = \[[^\]]+\];/,
    ersatz: 'const REICHWEITE_STUFE = [1.00, 1.00, 1.00, 1.00, 1.00, 1.00];',
    tor: 'guards',
  },
  {
    name: 'Alle Tuerme gleich weit',
    datei: 'src/data/towers.ts',
    regel: /const REICHWEITE_GRUND: Record<TowerId, number> = \{/,
    ersatz: 'const REICHWEITE_GRUND: Record<TowerId, number> = { arrow: 0.17, frost: 0.17, mortar: 0.17, prism: 0.17, __alt: 0 } as unknown as Record<TowerId, number>; const __weg = {',
    tor: 'guards',
  },
  {
    name: 'Ausbaumenue zeigt falsche Werte',
    datei: 'src/data/towers.ts',
    regel: /^  return statsFor\(def, zweig, level \+ 1\);$/m,
    ersatz: '  return def.branches[zweig].levels[level - 1] as TowerStats;',
    tor: 'smoke',
  },
  {
    // **Die Probe hat in v264 ihren Gegenstand verloren, und der volle Lauf
    // hat es gemeldet.**
    //
    // Sie verlangte, dass `npm run sim` rot wird, wenn Panzerung gar nichts
    // mehr schluckt. Gemessen blieb sim gruen - auf jeder einzelnen
    // Kennzahl. Panzerung als Spielelement war damit von KEINEM Tor
    // gehalten, und das war schon vorher so; die Probe hatte es nur
    // verdeckt, weil sim aus anderen Gruenden rot wurde.
    //
    // Sie zeigt jetzt auf die Eigenschaft selbst: derselbe Schaden auf
    // denselben gepanzerten Gegner, einmal ohne und einmal mit Durchschlag.
    // Ohne Panzerungswirkung sind beide gleich, und der Rauchtest sagt es.
    name: 'Panzerung wieder als fester Abzug',
    datei: 'src/game/state.ts',
    regel: /const schluck = Math\.min\(0\.66, rest \* 0\.11\);/,
    ersatz: 'const schluck = 0;',
    tor: 'smoke',
    meldet: 'Panzerung macht keinen Unterschied',
  },
  {
    name: 'Tuerme ueberdecken einander',
    datei: 'src/data/towers.ts',
    regel: /export const DRAW_SCALE = [0-9.]+;/,
    ersatz: 'export const DRAW_SCALE = 2.4;',
    tor: 'guards',
  },
  {
    name: 'Bedienung liegt im Menue im Weg',
    datei: 'src/ui/ui.ts',
    suche: '    this.hud.hidden = !anzeigen;',
    ersatz: '    this.hud.hidden = false;',
    tor: 'smoke',
  },
  {
    // **Der Aufruf hat in v303 ein zweites Argument bekommen** - der
    // Kartenzug, dem die Bauleiste weicht. Die Probe zog damit ins Leere, und
    // `npm run muster` hat es im selben Lauf gemeldet, in dem die Zeile sich
    // geaendert hat. Sie trifft weiter den ganzen Aufruf, also beide
    // Ableitungen auf einmal.
    name: 'Turmleiste nicht mehr abgeleitet',
    datei: 'src/ui/ui.ts',
    suche: '    this.setSpielansicht(!this.istMenuOffen(), s.zugFaellig());',
    ersatz: '    void this.istMenuOffen;',
    tor: 'smoke',
  },
  {
    // Der Waechter darf den Begriff nicht nur suchen, er muss den Satz lesen.
    // Diese drei Proben gehoeren zusammen: die erste zeigt, dass er einen
    // echten Rueckschritt findet, die zweite, dass er richtige Prosa in Ruhe
    // laesst. Ohne die zweite waere die erste wertlos - ein Waechter, der
    // jedes Vorkommen meldet, besteht sie auch.
    name: 'Doku faellt auf das Kachelraster zurueck',
    datei: 'CLAUDE.md',
    regel: /^## Stand$/m,
    ersatz: '## Stand\n\nDas Spielfeld ist ein Kachelraster mit festen Rasterzellen.',
    tor: 'doku',
    meldet: 'verwendet "Kachelraster" im gültigen Teil',
  },
  {
    name: 'Doku nennt wieder das alte Feldmass',
    datei: 'CLAUDE.md',
    regel: /^## Stand$/m,
    ersatz: '## Stand\n\nDas Feld misst 20 × 11 Zellen.',
    tor: 'doku',
    meldet: 'verwendet "20 × 11" im gültigen Teil',
  },
  {
    name: 'Waechter mahnt richtige Prosa an',
    datei: 'CLAUDE.md',
    regel: /^## Stand$/m,
    ersatz: '## Stand\n\nEin Kachelraster gibt es hier nicht mehr.',
    tor: 'doku',
    meldetNicht: 'verwendet "Kachelraster" im gültigen Teil',
  },
  {
    // **Die drei Proben zu Abschnitt 6, und sie haengen zusammen.**
    //
    // C24, D28-A und D28-F standen als offen im Verzeichnis, waehrend sie in
    // Wahrheit seit v222, v217 und v218 zugefallen waren. Der Waechter prueft
    // jetzt jede offene Zeile gegen ihre Schliessbedingung - und diese Probe
    // stellt genau den Fall her: der Bannturm ist da, C3 steht weiter offen.
    name: 'Zugefallener Punkt steht weiter offen',
    datei: 'docs/Towerfront-BACKLOG.md',
    // **Und genau das ist ihr in v313 passiert** (gefunden vom ersten
    // Probenlauf, der ueberhaupt rot werden konnte). Sie machte aus dem
    // Bogenturm einen Bannturm - damit war C3 erfuellt, waehrend es offen
    // dastand. C3 ist in v295 zugefallen, und seitdem bewies sie nichts:
    // kein offener Punkt fragte mehr nach dem Bannturm. Der Kommentar
    // darueber sagte den Verfall sogar voraus ("faellt, sobald C3 eine
    // andere Schliessbedingung bekommt") - er hat nur nicht damit gerechnet,
    // dass C3 selbst verschwindet.
    //
    // Jetzt greift sie an der BEDINGUNG statt an ihrem Gegenstand: die erste
    // `text`-Bedingung der Offen-Tabelle wird durch eine ersetzt, die der
    // heutige Baum erfuellt. Welcher Punkt das gerade ist, spielt keine
    // Rolle - die Probe ueberlebt jeden, der zufaellt. Dieselbe Bewegung wie
    // bei "Story ohne Schliessbedingung" in v269, eine Tabelle tiefer.
    regel: /(\*\*Schliesst, wenn:\*\* `)text [^`]+(`)/,
    // Der Bogenturm steht seit der ersten Fassung in `towers.ts` und ist der
    // Turm, den das Spiel am wenigsten verlieren kann.
    ersatz: '$1text src/data/towers.ts "Bogenturm" >= 1$2',
    tor: 'doku',
    meldet: 'ist ERFUELLT',
  },
  {
    // Und die Zeile ohne Bedingung - die Form, in der die drei Punkte
    // tatsaechlich stehen geblieben sind. Ohne diese Probe waere die
    // Pflichtangabe eine Bitte.
    name: 'Offener Punkt ohne Schliessbedingung',
    datei: 'docs/Towerfront-BACKLOG.md',
    regel: / · \*\*Schliesst, wenn:\*\* `liste src\/data\/difficulty\.ts DIFFICULTY_ORDER >= 4`/,
    ersatz: '',
    tor: 'doku',
    meldet: 'keine Schliessbedingung',
  },
  {
    // **Und die Zeile, die der Waechter gar nicht erst liest** (v313).
    //
    // Bis v313 verlangte die Kennung hinter der Ziffer entweder nichts oder
    // einen Bindestrich - `N1K` und `N1G` fielen durch, standen seit v309
    // offen da und sind nie ausgewertet worden. Der Waechter uebergeht so
    // eine Zeile still, und still ist hier das Schlimmste: die Zeile sieht
    // aus wie geprueft.
    //
    // Der Eingriff verdoppelt die Kennung der ersten Zeile, die eine
    // Schliessbedingung traegt - solche Zeilen gibt es nur in den
    // Offen-Tabellen, also trifft er sicher dort und nicht in einer
    // Fundtabelle.
    name: 'Offene Zeile mit unlesbarer Kennung',
    datei: 'docs/Towerfront-BACKLOG.md',
    regel: /^\| ([A-Z]+\d+[A-Z]?(?:-[A-Z])?) (\| .*\*\*Schliesst, wenn:\*\*)/m,
    ersatz: '| $1$1 $2',
    tor: 'doku',
    meldet: 'ohne lesbare Kennung',
  },
  {
    // **Die zwei Proben zum Storykatalog (v252).**
    //
    // `npm run naechste` liest die Reihenfolge aus dem Katalog und waehlt die
    // erste offene Story - ueber Stunden und ueber Kontextgrenzen hinweg. Es
    // haelt sich also nichts im Kopf, sondern liest den Stand aus dem Baum;
    // genau deshalb muss der Baum ihn tragen koennen. Eine Story ohne
    // Bedingung gilt fuer immer als offen oder fuer immer als zu, je nachdem
    // wie man raet - dieselbe Klasse, an der C24, D28-A und D28-F eine Ebene
    // hoeher stehen geblieben sind.
    name: 'Story ohne Schliessbedingung',
    datei: 'docs/Towerfront-STORIES.md',
    // **In v269 nachgezogen**: der Katalog ist mit dem Neubau ersetzt worden,
    // und die alte Story gibt es nicht mehr. Gegriffen wird jetzt an einer
    // REGEL statt an einer festen Zeile - die erste Bedingung des Dokuments,
    // welche das auch sei. Eine Probe, die auf eine bestimmte Story zeigt,
    // veraltet mit ihr; das ist v269 zum zweiten Mal passiert.
    regel: /\*\*Schliesst, wenn:\*\* `[^`]+`/,
    ersatz: '',
    tor: 'doku',
    meldet: 'keine Schliessbedingung',
  },
  {
    // Und die Form der Ueberschriften. Sie ist die leisere Gefahr: eine
    // Story, deren Kopf das Muster nicht mehr trifft, faellt lautlos aus der
    // Reihe - `naechste` ueberspringt sie, ohne ein Wort zu sagen, und die
    // Kette arbeitet an der falschen Stelle weiter. Der Eingriff nimmt allen
    // Koepfen die Kennung, damit die Zahl wirklich faellt.
    name: 'Storykoepfe verlieren ihre Form',
    datei: 'docs/Towerfront-STORIES.md',
    regel: /^### S-/gm,
    ersatz: '### ',
    tor: 'doku',
    meldet: 'Stories erkannt',
  },
  {
    // **Die zwei Proben zur Spannungsratsche (v253).**
    //
    // Vier Spannungszahlen standen bis v252 nur in einem Dokument und in
    // einem Hinweis, der nicht abbricht. Zwischen v238 und v248 ist der
    // Stilabstand dabei von 9 auf 6 gefallen - schlechter geworden -, und
    // kein Tor hat ein Wort gesagt. Die erste Probe macht das Spiel
    // leichter: mit `hpEnd` 12 statt 19.5 traegt der Kristall die letzten
    // Wellen muehelos, die Verluste fallen auf eine Stelle, und die Ratsche
    // muss es sagen.
    name: 'Die Spannung faellt und niemand sagt es',
    datei: 'src/data/difficulty.ts',
    suche: 'hpEnd: 24.0',
    ersatz: 'hpEnd: 14.0',
    tor: 'sim',
    meldet: 'Spannungsratsche',
  },
  {
    // **Die Vielfaltsbeute trennt Mischen von Haeufen** (v299, S-N3-03).
    //
    // Gemessen am GESTELLTEN Wert 0,15, nicht am ausgelieferten - der steht
    // auf Null, und eine Zusage, die dann schweigt, ist keine (Regel 5, und
    // genau die Falle, in die der erste Entwurf dieser Runde gelaufen ist).
    //
    // Der Eingriff nimmt der Regel ihren Kern: `arten - 1` wird zu `arten`,
    // dann bekommt auch der Haeufer mit EINER Turmart seinen Zuschlag.
    //
    // **Erwartet wird seit v301 die scharfe Zusage**, nicht die Trennung:
    // "der Haeufer bekommt 0 Gold". Der erste Anlauf hier zielte auf die
    // Trennung ("schuettet Gold aus") und meldete NICHTS - beide Seiten
    // gewinnen dann naemlich, und die Differenz bleibt gross genug. Regel 3
    // in Reinform: der Eingriff kam an, die Pruefung sah an ihm vorbei.
    name: 'Die Vielfaltsbeute belohnt auch Haeufen',
    datei: 'src/data/towers.ts',
    suche: 'return grund * (1 + Math.max(0, arten - 1) * zuschlag);',
    ersatz: 'return grund * (1 + Math.max(0, arten) * zuschlag);',
    tor: 'sim',
    meldet: 'bringt dem Haeufer',
  },
  {
    // **Und die Zaehlung selbst.**
    //
    // `e.arten` ist ein Bitmuster ueber `TOWER_ORDER`; vermerkt wird NACH
    // Schild und Panzerung, also nur wo Schaden ankam. Faellt der Vermerk
    // weg, ist jeder Gegner von null Arten getroffen, und die Vielfaltsbeute
    // hebt nirgends etwas - auch beim Mischer nicht.
    name: 'Die Turmart wird am Gegner nicht vermerkt',
    datei: 'src/game/state.ts',
    suche: 'if (artIndex >= 0) e.arten |= 1 << artIndex;',
    ersatz: 'if (artIndex >= 999) e.arten |= 1 << artIndex;',
    tor: 'sim',
    meldet: 'schuettet Gold aus',
  },
  {
    // **Ein Gebaeudeauftrag traegt wieder den Kartenblock** (v304).
    //
    // Abschnitt 1b sagt selbst, dass er nur fuer Kartenbilder gilt - und
    // 8d.2 bis 8d.4 trugen ihn trotzdem: "512 x 512, freigestellt auf
    // Transparenz" drei Absaetze ueber "exactly 16:9, full bleed,
    // 2400 x 1350". Der Prompt widersprach sich selbst, und gefunden hat es
    // kein Tor, sondern der Versuch, die Auftraege wirklich herauszugeben.
    //
    // Der Waechter liest jetzt beide Bloecke und prueft, dass kein
    // Figurenauftrag den Kartenblock traegt. Der Eingriff dreht 8d.4 zurueck.
    name: 'Gebaeudeauftrag traegt den Kartenblock',
    // **Auf den Bannturm nachgezogen (v334, K1).** Sie griff `### 8d.4` -
    // und diese Kennung stand seit v328 ZWEIMAL da (Sanitaeter und
    // Bannturm), also traf sie den falschen Abschnitt und schwieg. Der
    // Nachtlauf hat sie als gegenstandslos gemeldet. Die Kennungen sind
    // gerichtet, und der Doku-Waechter prueft seitdem auf Dubletten.

    datei: 'docs/Towerfront-BILDAUFTRAG.md',
    regel: /### 8d\.6([\s\S]*?)\[AUSGABE-BLOCK FIGUR EINFÜGEN\]/,
    ersatz: '### 8d.6$1[AUSGABE-BLOCK EINFÜGEN]',
    tor: 'doku',
    meldet: 'Kartenblock',
  },
  {
    // **Der Kartenzug haengt nicht mehr an der Aussaat** (v303, S-N1-02).
    //
    // Die erste Abnahme der Story: zwei Laeufe mit derselben Aussaat ziehen
    // dieselben Karten - und zwei mit verschiedener eben nicht. Nimmt man die
    // Verwebung heraus, zieht jede Welle jeder Aussaat dasselbe.
    name: 'Der Kartenzug haengt nicht an der Aussaat',
    datei: 'src/data/karten.ts',
    suche: 'const rng = new Rng(((saat >>> 0) ^ Math.imul(welle + 1, 0x9e3779b1)) >>> 0);',
    ersatz: 'const rng = new Rng(1);',
    tor: 'sim',
    meldet: 'ziehen in Welle 38 dasselbe',
  },
  {
    // **Der Kartenzug unterbricht die Welle** (v303, S-N1-02).
    //
    // Die dritte Abnahme. `zugFaellig` ist die eine Stelle, an der die Frage
    // beantwortet wird; nimmt man ihr die Wellenbedingung, laesst sich mitten
    // im Gefecht ziehen - und die Entscheidung der Welle faellt unter
    // Zeitdruck statt davor.
    name: 'Ein async Schritt scheitert unbemerkt',
    datei: 'tools/smoke.ts',
    // **Die Probe zu der Falle, an der v313 zwei Laeufe verloren hat.**
    //
    // `step` nahm bis v313 nur `() => void`. Vier Schritte sind `async`, und
    // eine async-Funktion wirft nicht - sie lehnt ein Versprechen ab. Ihr
    // Befund kam damit nie in `problems`, und ob er ueberhaupt irgendwo
    // auftauchte, entschied ein Wettlauf mit dem Ende des Prozesses: hier
    // wurde er toedlich, auf dem Runner nicht.
    //
    // Der Eingriff nimmt dem Sammeln sein Ziel. Dann fehlt die Marke des
    // Selbsttests, und der Rauchtest sagt es - statt ueber vier ungepruefte
    // Schritte "bestanden" zu melden.
    regel: /offeneSchritte\.push\(\(ergebnis as Promise<void>\)/,
    ersatz: '[].push((ergebnis as Promise<void>)',
    tor: 'smoke',
    meldet: 'Selbsttest zu den asynchronen Schritten ist NICHT',
  },
  {
    name: 'Der Kartenzug unterbricht die Welle',
    datei: 'src/game/state.ts',
    suche: '      && !this.waveActive',
    ersatz: '      && true',
    tor: 'smoke',
    meldet: 'unterbricht er die Welle',
  },
  {
    // **Die Ruheebene holt die gesperrten Faehigkeiten zurueck** (v315,
    // S-N4-01).
    //
    // Drei gesperrte Felder belegten 260 x 46 Punkte, ohne dass man eines
    // davon druecken kann - und sie trieben die Leiste von einer Reihe auf
    // drei. Sichtbar ist jetzt die naechste Freischaltung, die weiteren
    // stehen als Zahl daran.
    //
    // Der Eingriff blendet sie wieder ein, genau wie es die Story verlangt
    // ("ein Element aus der Ruheebene in die Randleiste zurueckholen"): dann
    // steigt die Belegung im Ruhezustand von 13,1 auf 15,5 % gegen erlaubte
    // 14, und das Tor sagt es.
    name: 'Die Ruheebene wird wieder zur Leiste',
    datei: 'src/ui/ui.ts',
    suche: '      else { b.hidden = true; weitere++; }',
    ersatz: '      else { b.hidden = false; weitere++; }',
    tor: 'uxaudittor',
    meldet: 'sperrt',
  },
  {
    // **Die Bauleiste weicht dem Kartenzug nicht mehr** (v303).
    //
    // Beide zugleich sperren im Ruhezustand 21,7 % des Bildschirms gegen
    // erlaubte 16 - jede fuer sich passt, beide nicht. Die Ableitung haelt
    // das; ohne sie meldet das UX-Tor die Belegung.
    name: 'Bauleiste und Kartenzug stehen zugleich',
    datei: 'src/ui/ui.ts',
    suche: 'this.dock.hidden = !anzeigen || zugOffen;',
    ersatz: 'this.dock.hidden = !anzeigen;',
    tor: 'uxaudittor',
    meldet: 'Belegung',
  },
  {
    // **Der Wellenzaehler faengt beim Abschnittswechsel von vorn an**
    // (v302, S-N1-01).
    //
    // Die Gegenprobe, die die Story selbst verlangt. `abschnittGeschafft`
    // ADDIERT die gefahrenen Wellen; wer sie hier setzt statt addiert, macht
    // aus einem Lauf vier Partien hintereinander - jeder Abschnitt faengt
    // wieder am flachen Anfang der Lebenskurve an.
    //
    // **Neu angesetzt in v309, und der Grund ist die Lehre selbst.** Bis v308
    // hing die Lebenskurve am Wellenzaehler, und ein kaputter Zaehler fiel in
    // der Rampe auf. Seit die Kurve am ABSCHNITT haengt (N1K), traegt der
    // Zaehler nur noch die Erfahrung und die Laenge - und haette still falsch
    // sein koennen, ohne dass ein Tor ein Wort sagt. Ein Wert, den kein Tor
    // mehr haelt, ist ein Wert ohne Zusage (K1); `erfahrungMessen` haelt ihn
    // seitdem gegen die Summe der Abschnitte.
    name: 'Der Lauf zaehlt die Wellen nicht durch',
    datei: 'src/game/lauf.ts',
    suche: 'welleGesamt: l.welleGesamt + gefahreneWellen,',
    ersatz: 'welleGesamt: 0,',
    tor: 'sim',
    meldet: 'zaehlt er nicht durch',
  },
  {
    // **Der Lauf legt keinen Faktor mehr ueber die Abschnitte** (v309, N1K).
    //
    // Das ist die Zusage, die seit v309 an die Stelle des gestreckten
    // Wellenzaehlers getreten ist: jeder Abschnitt behaelt seine geeichte
    // Kurve, und der Lauf macht den spaeteren haerter als den frueheren.
    // Faellt der Faktor weg, ist ein Lauf wieder vier gleich schwere Partien
    // hintereinander - gemessen 0 / 0 / 0 / 0 Kristall Verlust.
    name: 'Der Lauf macht spaetere Abschnitte nicht haerter',
    datei: 'src/game/state.ts',
    // **Neu angesetzt in v310, und zwar nachdem sie sich selbst als
    // wirkungslos erwiesen hat** (Regel 3): der erste Anlauf baute den Fehler
    // in den Spielzustand ein, und `sim` meldete nichts - weil `laufMessen`
    // seine Rampentabelle DANEBEN noch einmal selbst rechnete. Das Tor mass
    // seine eigene Arithmetik statt des Spiels. Die Rampe steht seitdem an
    // einer Stelle (`GameState.laufRampe`), und das Werkzeug liest sie ab.
    // Auf die neue Stelle nachgezogen (v333, K1): `laufFaktor` bekommt seit
    // S-N6-06 den Schwanz als dritten Eingang.
    // **Und ein drittes Mal nachgezogen (v337), diesmal weil der Eingriff
    // den Baum ZERBROCHEN hat statt ihn zu aendern.** v333 hat den Aufruf
    // auf zwei Zeilen umgebrochen; `suche` traf nur die erste, und stehen
    // blieb ein `this.laufEndlos);` ohne Aufruf davor. `sim` starb damit
    // schon beim Uebersetzen und kam nie zu seiner Meldung - rot aus dem
    // falschen Grund sieht in einem Probenlauf aus wie gruen aus dem
    // falschen Grund: beides ist kein Beweis. Gegriffen wird jetzt der
    // GANZE Aufruf ueber beide Zeilen, und das Ergebnis ist gueltiger Code.
    regel: /\* laufFaktor\(this\.laufAbschnitt, this\.laufSteigung, this\.laufSchwanz,\n\s*this\.laufEndlos\)/,
    ersatz: '* 1',
    tor: 'sim',
    meldet: 'steigt im Lauf nicht durch',
  },
  {
    // **Der Lauf wird gar nicht mehr geprueft, bevor er geladen wird**
    // (v302, S-N1-01).
    //
    // Die zweite Abnahme: ein Stand, den niemand verstehen kann, wird GAR
    // NICHT gelesen statt halb. Nimmt man die Fassungspruefung heraus, laedt
    // ein Lauf aus einer fremden Fassung durch - und der Rauchtest faehrt
    // vier gestellte Faelle dagegen.
    name: 'Der Lauf prueft seine Fassung nicht',
    datei: 'src/game/lauf.ts',
    suche: 'if (l.v !== 2) return null;',
    ersatz: 'if (false) return null;',
    tor: 'smoke',
    meldet: 'wird gelesen statt verworfen',
  },
  {
    // **Der Bot zieht im Lauf keine Karten mehr** (v308, N1K).
    //
    // Das ist die Probe auf den Fund dieser Runde. Bis v307 fuhr `laufMessen`
    // einen Bot OHNE Deck durch sechzig Wellen und mass daran eine Rampe von
    // 14,89 - gegen einen Spieler, der in Welle 46 fuenfundvierzig Karten
    // genommen haette. Mit Deck gewinnt derselbe Lauf alle vier Abschnitte,
    // und die Nullprobe sagt, dass es das Deck war: derselbe letzte Abschnitt
    // faellt ohne Karten in Welle 9 und geht mit Karten mit 36 von 42
    // Kristall aus.
    //
    // Faellt der Zug wieder weg, misst der Lauf wieder den Falschen - und die
    // Nullprobe daneben vergleicht zweimal dasselbe.
    name: 'Der Bot zieht im Lauf keine Karten',
    datei: 'tools/sim.ts',
    suche: '    if (opts.zugStil && s.zugFaellig()) {',
    ersatz: '    if (false && opts.zugStil && s.zugFaellig()) {',
    tor: 'sim',
    meldet: 'Karten bei',
  },
  {
    // **Alle drei Auflagen werden gleich** (v305, S-N1-03).
    //
    // Die Gegenprobe, die die Story woertlich verlangt: "Beide Angebote
    // gleich machen - `sim` muss melden, dass die Wahl folgenlos ist."
    //
    // Als Regel und nicht als drei feste Zeilen: die Staerken sind noch
    // nicht geeicht (N1K), und eine Probe, die an `1.3` haengt, veraltet an
    // der ersten Eichrunde lautlos. Gemessen faellt die Spreizung damit von
    // 142,4 auf exakt 0 - dieselbe Karte, dieselbe Aussaat, dieselbe
    // Rechnung, dreimal.
    name: 'Alle Auflagen der Abschnittswahl sind gleich',
    datei: 'src/game/lauf.ts',
    regel: /(\{ id: '(?:ruhig|gerade|reich)', name: '[^']+', druck: )[\d.]+(, beute: )[\d.]+/g,
    ersatz: '$11$21',
    tor: 'sim',
    meldet: 'folgenlos',
  },
  {
    // **Die angenommene Auflage kommt im Spiel nicht an** (v305, S-N1-03).
    //
    // Die zweite Haelfte derselben Zusage: das Bild zeigt einen Handel, und
    // im Abschnitt gilt er. Nimmt man den Faktor aus der Lebenspunktrechnung,
    // steht der Handel weiter auf der Kachel und die Haelfte davon geschieht
    // nicht mehr - genau die Sorte Fehler, die kein Bild und keine
    // Uebersetzung fangen kann.
    name: 'Die Auflage wirkt nicht auf die Gegner',
    datei: 'src/game/state.ts',
    // Neu angesetzt in v312: die Zeile heisst seit v311 `this.laufRampe(welle)`
    // statt `ramp`. Gefunden hat es `npm run muster` - und dass der
    // NACHTLAUF es nicht gefunden hat, obwohl er genau dafuer da ist, ist der
    // eigentliche Fund dieser Runde (siehe proben.yml, `set -o pipefail`).
    suche: 'return Math.round(ENEMIES[id].hp * hpMul * this.laufRampe(welle) * this.laufDruck);',
    ersatz: 'return Math.round(ENEMIES[id].hp * hpMul * this.laufRampe(welle));',
    tor: 'sim',
    meldet: 'folgenlos',
  },
  {
    // **Nach einem Abschnitt geht keine Wahl mehr auf** (v305, S-N1-03).
    //
    // Dann faellt der Lauf still auf seinen Plan zurueck: er laeuft weiter,
    // gewinnt dieselben Abschnitte, und niemand hat je gewaehlt. Ein Bild,
    // das man nie zu sehen bekommt, ist keine Mechanik.
    name: 'Die Abschnittswahl geht nie auf',
    datei: 'src/game/lauf.ts',
    // Auf die neue Stelle nachgezogen (v333, K1): seit S-N6-06 geht die Wahl
    // an JEDER Grenze auf, auch am Ende des Plans - dort faengt der Schwanz
    // an, und der ist dieselbe Wahl und kein zweiter Bildschirm.
    suche: '    wahlOffen: true,',
    ersatz: '    wahlOffen: false,',
    tor: 'sim',
    meldet: 'Wahlen',
  },
  {
    // **Ein erfundenes Angebot wird angenommen** (v305, S-N1-03).
    //
    // `abschnittWaehlen` prueft die Kennung gegen den Zug, statt sie zu
    // glauben. Faellt die Pruefung auf das erste Angebot zurueck, laesst sich
    // der Lauf ueber die Ablage stellen: eine Kennung hineinschreiben, und
    // der naechste Abschnitt ist ein anderer als der gewaehlte.
    name: 'Die Abschnittswahl glaubt jede Kennung',
    datei: 'src/game/lauf.ts',
    suche: "  const angebot = abschnittsWahl(l).find((a) => a.id === angebotId);\n  if (!angebot) return l;",
    ersatz: "  const angebot = abschnittsWahl(l).find((a) => a.id === angebotId)\n    ?? abschnittsWahl(l)[0];\n  if (!angebot) return l;",
    tor: 'smoke',
    meldet: 'wird angenommen',
  },
  {
    // **Der Fortschritt faellt beim Lesen wieder auseinander** (v306,
    // S-N1-04) - und das ist die Probe auf einen Fehler, der bis v305
    // wirklich dastand.
    //
    // `fortschrittAus` uebernimmt den gespeicherten Fortschritt und bringt
    // nur die zwei Pflichtfelder in Form. Die alte Fassung baute ihn aus
    // GENAU DIESEN ZWEI Feldern neu auf, und alles andere fiel weg: die
    // Endlos-Bestenliste, die gesehenen Karten, die gesehenen Gegnerarten -
    // gemessen [17] hinein, [] heraus, ueber viele Fassungen hinweg und ohne
    // dass ein Tor ein Wort sagte.
    name: 'Der Fortschritt faellt beim Lesen auseinander',
    datei: 'src/core/storage.ts',
    suche: '    ...(p ?? {}),\n',
    ersatz: '',
    tor: 'smoke',
    meldet: 'ueberlebt den Neustart nicht',
  },
  {
    // **Der gekaufte Stapel bleibt der Grundstapel** (v306, S-N1-04).
    //
    // Dann ist der Kauf eine Zeile in der Ablage und sonst nichts: das
    // Konto sinkt, die Karte steht im Bild als "im Stapel", und im Zug
    // taucht sie nie auf.
    name: 'Die gekaufte Karte liegt nicht im Stapel',
    datei: 'src/data/karten.ts',
    suche: '  return KARTENSTAPEL.filter((k) => k.kosten === 0 || frei.has(k.id));',
    ersatz: '  return KARTENSTAPEL.filter((k) => k.kosten === 0);',
    tor: 'smoke',
    meldet: 'liegt trotzdem nicht im Stapel',
  },
  {
    // **Die Messung liest den Stapel aus der Ablage** (v306, S-N1-04).
    //
    // Regel 4 in einer Zeile: dann haengt `npm run sim` davon ab, wieviel
    // derjenige gespielt hat, der es fahren laesst - der Runner maesse etwas
    // anderes als ich, und beide haetten recht. Genau die Form des Fundes
    // aus v217, wo `determinism` seinen eigenen Nebeneffekt mass.
    name: 'Der Kartenstapel der Messung kommt aus der Ablage',
    datei: 'src/game/state.ts',
    suche: 'this.kartenStapel = stapelAus(opts.stapel ?? freigeschalteteKarten());',
    ersatz: 'this.kartenStapel = stapelAus(freigeschalteteKarten());',
    tor: 'sim',
    meldet: 'Regel 4',
  },
  {
    // **Ein verlorener Lauf bringt nichts** (v306, S-N1-04).
    //
    // Die erste Abnahme der Story, andersherum: ohne den Posten je gefahrener
    // Welle ist ein Roguelite eine Kette von Niederlagen. Rogue Tower gibt
    // 450 fuers Durchspielen gegen 1350 fuer den Sieg - nicht 0 gegen 1350.
    name: 'Ein verlorener Lauf bringt keine Erfahrung',
    datei: 'src/game/lauf.ts',
    // Auf die neue Stelle nachgezogen (v333, K1): `geschafft` ist seit
    // S-N6-06 eine Ableitung aus dem Zustand und kein Schalter mehr - der
    // Lauf endet nicht mehr am letzten geplanten Abschnitt, also gibt es
    // keinen Aufrufer, der es wuesste.
    suche: '  return l.welleGesamt * ERFAHRUNG_JE_WELLE\n'
      + '    + l.abschnitt * ERFAHRUNG_JE_ABSCHNITT\n'
      + '    + (planDurch(l) ? ERFAHRUNG_LAUF_GESCHAFFT : 0);',
    ersatz: '  return planDurch(l) ? ERFAHRUNG_LAUF_GESCHAFFT : 0;',
    tor: 'sim',
    meldet: 'bringt nichts',
  },
  {
    // **Karten kosten nichts mehr** (v306, S-N1-04).
    //
    // Die Pruefung steht in der Ablage und nicht am Knopf - das ist die
    // Zusage. Faellt sie weg, kauft ein leeres Konto den ganzen Stapel, und
    // die Erfahrung ist eine Zahl auf einem Bild.
    name: 'Karten kosten keine Erfahrung',
    datei: 'src/core/storage.ts',
    // **Seit v314 steht dieser Satz zweimal**: `buyPerk` prueft die Erfahrung
    // woertlich genauso, seit die Verbesserungen keine Sterne mehr kosten
    // (S-N1-05). Ein Suchtext wirkt nur bei GENAU einem Treffer, also greift
    // die Probe jetzt an der Funktion, zu der sie gehoert.
    regel: /(export function karteFreischalten[\s\S]*?)  if \(laufErfahrung\(\) < kosten\) return false;/,
    ersatz: '$1  if (false) return false;',
    tor: 'smoke',
    meldet: 'kostet nichts',
  },
  {
    // **Die Vielfaltsmarke steht nicht mehr im Bild** (v301, S-N3-03).
    //
    // Die Abnahme der Story verlangt sie woertlich: "Die Zahl steht im Bild,
    // nicht nur in der Bilanz." Kein Bildschirmfoto kann das halten - die
    // Marke lebt 1,1 Sekunden im Augenblick eines Kills, und keine der
    // fuenfzehn Aufnahmen des UX-Audits hat sie erwischt. Darauf zu warten
    // waere ein Messplatz, der auf einen Zufall wartet (v219, viermal
    // gemessen).
    //
    // Der Eingriff nimmt den Anhang weg: die Beute steigt weiter, aber der
    // Spieler erfaehrt nicht mehr, warum.
    name: 'Die Vielfaltsmarke fehlt im Bild',
    datei: 'src/game/state.ts',
    suche: "const vielfalt = bounty > ohne ? ` ×${arten}` : '';",
    ersatz: "const vielfalt = '';",
    tor: 'smoke',
    meldet: 'keine Marke',
  },
  {
    // **Der Bauhinweis steht wieder unter der Bauwahl** (v298).
    //
    // Die Ableitung `hinweisSichtbar` haelt beide auseinander. Nimmt man
    // ihr die Bedingung, stehen sie wieder zugleich im Bild - und der
    // Rauchtest muss es sagen, statt es dem naechsten Bildschirmfoto zu
    // ueberlassen. Genau daran hat es bis v298 gefehlt: gefunden hat den
    // Fall der Blick, nicht die Messung.
    name: 'Bauhinweis steht wieder unter der Bauwahl',
    datei: 'src/game/state.ts',
    suche: 'return this.hinweis !== null && this.buildAt === null;',
    ersatz: 'return this.hinweis !== null;',
    tor: 'smoke',
    meldet: 'stehen zugleich im Bild',
  },
  {
    // **Der fuenfte Zustand des UX-Audits: der vierte Turm derselben Art**
    // (v298, E12).
    //
    // Er misst, was bis v297 niemand gesehen hat: die Preismarke des
    // Wiederholungsaufschlags. Sie steht seit v287 im Stil und war bis dahin
    // tot, weil der Zuschlag auf Null stand; seit v297 ist er scharf, und
    // alle vierzehn Aufnahmen blieben trotzdem bei EINEM Turm stehen.
    //
    // Der Eingriff dreht den Zuschlag auf Null zurueck. Dann kostet der
    // fuenfte Bogenturm wieder 55, keine Marke erscheint, und der Zustand
    // meldet es - statt eine Aufnahme der Bauwahl unter falschem Namen
    // abzulegen. Damit haengt die Aufnahme an ihrem GEGENSTAND und nicht an
    // einer Klickzahl.
    name: 'Der Zustand "teurer" zeigt keinen Aufschlag',
    datei: 'src/data/towers.ts',
    suche: 'export const WIEDERHOLUNG_ZUSCHLAG: number = 0.10;',
    ersatz: 'export const WIEDERHOLUNG_ZUSCHLAG: number = 0;',
    tor: 'uxaudittor',
    meldet: 'traegt weder die Bauwahl noch die Bauleiste die Preismarke',
  },
  {
    // **Und die zwei Formpruefungen an derselben Bauwahl** (v298).
    //
    // Beide haben bei ihrem ersten Lauf null gemeldet, und das war das
    // Ergebnis: das Bild sah nach uebereinanderstehendem Text aus, gemessen
    // sind es 5 px Luecke ueberall und kein Ueberlauf. Regel 8 irrt in beide
    // Richtungen (v230).
    //
    // Eine Pruefung, die noch nie etwas gemeldet hat, ist damit aber noch
    // kein Beweis (Regel 5). Der Eingriff macht die Knoepfe so breit, dass
    // sechs davon nicht mehr nebeneinander passen - dann laufen sie
    // ineinander, und beide Zahlen muessen es sagen.
    // **Eine Kennung auf einem Kleinbuchstaben** (v324).
    //
    // Dieselbe Klasse wie der blinde Fleck des Doku-Waechters in v313: eine
    // Kennung, die die Regel nicht lesen kann, wird nicht gemeldet - sie
    // wird uebergangen. `S-N5-01b` fiel durch `S-[A-Z0-9-]+`, und damit bot
    // `naechste` weiter eine Story an, deren Gegenstand fehlt.
    //
    // Der Eingriff haengt eine ANDERE Story an diese Kennung. Die Kette muss
    // das Warten melden - kann sie die Kennung nicht lesen, schweigt sie.
    name: 'Die Kette liest eine Kennung mit Kleinbuchstaben nicht',
    datei: 'docs/Towerfront-STORIES.md',
    regel: /(### S-N5-06[^\n]*\n\n\*\*Paket:\*\*[^\n]*\*\*Hängt an:\*\* )—/,
    ersatz: '$1S-N5-01b',
    tor: 'naechste',
    meldet: 'wartet auf S-N5-01b',
  },
  {
    // **Das englische Wort kehrt zurueck** (v323, S-N4-10).
    //
    // Genau die Gegenprobe, die die Story verlangt: eines der drei Woerter
    // wieder einsetzen. Gegriffen wird der KNOPFTEXT im Dokument, also das,
    // was der Spieler sieht - und nicht ein Kommentar oder ein Bezeichner.
    name: 'Die Oberflaeche sagt wieder "Level"',
    datei: 'index.html',
    suche: '<button class="pause-btn warn" id="p-restart">Karte neu starten</button>',
    ersatz: '<button class="pause-btn warn" id="p-restart">Level neu starten</button>',
    tor: 'smoke',
    meldet: 'mehreren Woertern',
  },
  {
    // **Die Kamera laesst den Kristall wieder an den Rand** (v322, S-N4-09).
    //
    // Genau die Gegenprobe, die die Story verlangt. Der Eingriff schaltet
    // `zielEinpassen` ab - dann steht der Startzoom wieder auf `coverScale`,
    // und der Kristall ragt in allen vier Formaten heraus (gemessen 37 px auf
    // dem Telefon, 44 bis 61 am Schreibtisch). Das Browsertor nennt jedes
    // Format einzeln.
    name: 'Die Kamera laesst den Kristall am Rand liegen',
    datei: 'src/gfx/renderer.ts',
    suche: '    if (this.zoom > this.coverScale * 1.001) return;',
    ersatz: '    if (this.zoom > 0) return;',
    tor: 'browsertor',
    meldet: 'ragt mitsamt seinem Warnring',
  },
  {
    // **Die gesperrte Kachel verliert ihren Preis** (v321, S-N4-07).
    //
    // Genau die Gegenprobe, die die Story verlangt. Der Eingriff stellt den
    // Zustand von v320 wieder her: der Grund tritt AN DIE STELLE des
    // Preises. Das Browsertor sucht sich seit v321 selbst eine gesperrte
    // Kachel (auf dem Spiralhain der Moerser bei 24,70) und verlangt beides.
    name: 'Die gesperrte Kachel zeigt den Grund statt des Preises',
    datei: 'src/ui/ui.ts',
    suche: '    ? `${kosten}<span class="pick-nein">${grund}</span>`',
    ersatz: '    ? `<span class="pick-nein">${grund}</span>`',
    tor: 'browsertor',
    meldet: 'zeigt keinen Preis',
  },
  {
    // **Der Messgriff wird abgeschraubt** (v320, S-N4-06).
    //
    // Die staerkere der beiden Proben zu dieser Story, und sie ist Regel 13:
    // wer eine Wirkung misst, schaltet sie zuerst ab. `feldVerdeckung`
    // rechnet Weltpunkte mit `window.weltZuSchirm` auf den Schirm. Ohne den
    // Griff koennte es still eine Null liefern - "nichts liegt ueber dem
    // Feld", weil gar nichts gemessen wurde. Es meldet stattdessen, dass es
    // nicht messen kann.
    name: 'Der Messgriff fuer die Feldverdeckung fehlt',
    datei: 'src/main.ts',
    suche: '(window as unknown as Record<string, unknown>).weltZuSchirm =',
    ersatz: 'const unbenutzt =',
    tor: 'uxaudittor',
    meldet: 'Messgriff',
  },
  {
    // **Die Bauleiste schiebt sich weiter ueber die Bahn** (v320, S-N4-06).
    //
    // Genau die Gegenprobe, die die Story verlangt: "die Leiste ueber die
    // Bahn schieben - das Tor muss den Zustand namentlich melden". Der
    // Eingriff hebt sie vom unteren Rand weg nach oben, also mitten ins
    // Feld; die Bahn des Spiralhains laeuft dort entlang.
    name: 'Die Bauleiste schiebt sich ueber die Bahn',
    datei: 'src/style.css',
    suche: '  bottom: calc(10px + var(--sab));\n  z-index: 3; display: flex; align-items: flex-end; gap: 8px;',
    ersatz: '  bottom: calc(90px + var(--sab));\n  z-index: 3; display: flex; align-items: flex-end; gap: 8px;',
    tor: 'uxaudittor',
    meldet: 'Feldverdeckung',
  },
  {
    // **Eine Zeile der Wellenvorschau verliert ihren Namen** (v319, S-N4-05).
    //
    // Genau die Gegenprobe, die die Story verlangt. Der Eingriff laesst
    // `vorschauName` immer nur die Zahl zurueckgeben - dann steht in jeder
    // Welle OHNE erklaerenden Satz eine nackte Ziffer, und `streifen` muss
    // die Welle namentlich melden.
    //
    // Gegriffen wird der Zweig, nicht die ganze Funktion: die Hoehe bleibt
    // dabei unveraendert, also kann nur die neue Inhaltspruefung anschlagen
    // und nicht die alte Bandmessung (Regel 13).
    name: 'Eine Zeile der Wellenvorschau steht ohne Namen da',
    datei: 'src/ui/ui.ts',
    suche: 'return satz ? `${n}×` : `${n}× <span class="next-name">${name}</span>`;',
    ersatz: 'return `${n}×`;',
    tor: 'streifentor',
    meldet: 'tragen weder Namen noch Bild',
  },
  {
    // **Ein Element schiebt sich ueber eine Textzeile** (v318, S-N4-04).
    //
    // Genau die Gegenprobe, die die Story verlangt. Der Eingriff nimmt dem
    // Einweisungsband seine Lage - bis v317 stand dort gar kein `top`, und
    // genau so lag es ueber `GOLD`, `KRISTALL`, `WELLE`. Der Fehler ist also
    // nicht erfunden, sondern der historische.
    //
    // Das Tor hat dazu einen eigenen Selbsttest, der sich die Verdeckung
    // SELBST herstellt (ein deckender Fleck ueber der Goldzahl). Beides
    // nebeneinander ist Absicht: der Selbsttest beweist, dass die Messung
    // sieht; die Gegenprobe beweist, dass das URTEIL rot wird.
    name: 'Das Einweisungsband liegt wieder auf der Kopfzeile',
    datei: 'src/style.css',
    suche: '  top: calc(var(--kopf) + var(--sat));\n  display: flex; align-items: center; gap: 12px;',
    ersatz: '  display: flex; align-items: center; gap: 12px;',
    tor: 'uxaudittor',
    meldet: 'Verdeckung im Zustand',
  },
  {
    // **Das Turmmenue kehrt an den Rand zurueck** (v316, S-N4-02, H4).
    //
    // Der Eingriff laesst `turmRing` die Klasse nie setzen - der Steg steht
    // dann wieder rechts am Bildschirmrand, in voller Hoehe, mit
    // aufgeklappten Werten. Gemessen sind das 31,7 % statt 27,0, also ueber
    // der Ratsche von 28.
    //
    // **Gegriffen wird das Setzen, nicht die Lage.** Die zwei Zeilen mit
    // `style.left` sind die naheliegende Stelle, und sie waere falsch: ohne
    // sie stuende der Kasten bei 0/0, was ebenfalls anschlaegt - aber aus
    // einem anderen Grund als dem, den diese Probe behauptet.
    name: 'Das Turmmenue steht wieder am Rand',
    datei: 'src/ui/ui.ts',
    suche: "this.insp.classList.toggle('am-turm', p !== null);",
    ersatz: "this.insp.classList.toggle('am-turm', false);",
    tor: 'uxaudittor',
    meldet: 'pruefsteg',
  },
  {
    // **Die Werte am Turm klappen wieder auf** (v316, S-N4-02).
    //
    // Die andere Haelfte derselben Runde, und die groessere: von den 4,7
    // Punkten kommen 3,3 aus der Faltung. Ohne eigene Probe waere sie durch
    // die Zeile darueber mitgedeckt - und eine Zahl, die zwei Ursachen hat
    // und eine Probe, ist halb geprueft.
    // **Die Bilanz laeuft von der Messung weg** (v317, S-N4-03).
    //
    // Genau die Gegenprobe, die die Story verlangt: die Anzeige am Turm und
    // `npm run geschosse` messen dieselbe Groesse, also duerfen sie nicht
    // zwei Zahlen sein. Der Eingriff nimmt dem Turm seinen Zaehler, waehrend
    // die Summe weiterlaeuft - dann zeigt der Turm 0 % verpuffte Schuesse,
    // waehrend die Messung 2,1 % misst, und der Rauchtest sagt es.
    //
    // Gegriffen wird die gemeinsame Zeile, nicht der Turmzaehler allein:
    // dass beide IN EINER Zeile stehen, ist die Zusage (Regel 15).
    name: 'Anzeige und Messung zaehlen getrennt',
    datei: 'src/game/state.ts',
    suche: "if (kind === 'homing') { this.stats.schuesse++; t.schuesse++; }",
    ersatz: "if (kind === 'homing') { this.stats.schuesse++; }",
    tor: 'smoke',
    meldet: 'laufen auseinander',
  },
  {
    // **Der Schalter tut nichts mehr** (v316, S-N4-02).
    //
    // Die zwei Proben daneben halten, dass die Werte zugeklappt SIND. Diese
    // haelt die andere Haelfte, und ohne sie waere das Zuklappen eine Falle:
    // der Eingriff laesst den Klick ins Leere laufen, die Werte bleiben
    // versteckt, und `browsertor` meldet, dass die Werteliste fehlt. Eine
    // Flaeche zu sparen, indem man etwas unerreichbar macht, ist keine
    // Ersparnis (H10: ausgeduennt wird nach Wichtigkeit, nicht nach Platz).
    name: 'Der Schalter der Turmwerte klappt nichts auf',
    datei: 'src/ui/ui.ts',
    suche: 'this.werteOffen = !this.werteOffen;',
    ersatz: 'this.werteOffen = false;',
    tor: 'browsertor',
    meldet: 'Werteliste des Turms',
  },
  {
    name: 'Die Werte am Turm stehen wieder offen',
    datei: 'src/ui/ui.ts',
    suche: 'this.iStats.hidden = amTurm && !this.werteOffen;',
    ersatz: 'this.iStats.hidden = false;',
    tor: 'uxaudittor',
    meldet: 'pruefsteg',
  },
  {
    name: 'Die Bauwahl laeuft ineinander',
    datei: 'src/style.css',
    suche: 'gap: 1px; min-width: 54px; padding: 4px 6px 3px; cursor: pointer;',
    ersatz: 'gap: 1px; min-width: 240px; padding: 4px 6px 3px; cursor: pointer;',
    tor: 'uxaudittor',
    meldet: 'Bauwahl',
  },
  {
    // **Die Zusage am AUSGELIEFERTEN Wert (v297, S-N3-02).**
    //
    // Alles uebrige an `wiederholungMessen` laeuft gegen feste 0,35 - es
    // soll sagen, was der Aufschlag TAETE. Solange nichts den gesetzten Wert
    // ansieht, ist er ungeprueft: er koennte auf 0 stehen, auf 0,10 oder auf
    // einem Tippfehler, und die fuenf Zeilen darueber meldeten unveraendert
    // dieselben 693 gegen 349 Gold.
    //
    // Der Eingriff misst den Haeufer ohne Aufschlag, waehrend der Verteiler
    // seinen bekommt - dann faellt die Trennung von +192 auf -8, und "eine
    // Zahl in den Daten, keine Regel im Spiel" muss anschlagen.
    //
    // **Die zweite Seite der Zusage ist gebaut und wieder ausgebaut**, und
    // diese Gegenprobenmappe hat es entschieden: der Zweig "steht auf 0,
    // trennt aber" kann von Bauart nicht anschlagen, weil `gesetzt` zugleich
    // Schalter und weitergereichter Wert ist. Der Eingriff kam an, das Tor
    // schwieg zu Recht (Regel 3), und die Probe ist mit dem Zweig
    // verschwunden statt verbessert worden.
    name: 'Der scharf gestellte Zuschlag wirkt nicht',
    datei: 'tools/sim.ts',
    suche: 'const hAus = mittelAusgabe(haeufen, gesetzt) - mittelAusgabe(haeufen, 0);',
    ersatz: 'const hAus = mittelAusgabe(haeufen, 0) - mittelAusgabe(haeufen, 0);',
    tor: 'sim',
    meldet: 'keine Regel im Spiel',
  },
  {
    // **Das Rauschband des Stilabstands (v296, M18).**
    //
    // Was diese Probe haelt: dass die Ratsche ihr Band ueberhaupt LIEST.
    // Setzt man es auf null, faellt "Abstand der Spielstile" von seinem
    // Stand 12,43 auf gemessene 8,20 und die Ratsche schlaegt an - der
    // heutige gruene Lauf haengt also wirklich an diesem Band und nicht
    // daran, dass die Zahl zufaellig passt.
    //
    // **Was sie NICHT haelt, und das steht hier statt in einer Fussnote:**
    // ob das Band aus der richtigen QUELLE kommt. Gemessen ist es 19,0 je
    // Lauf gegen 4,4 je Stil - beide halten den heutigen Baum gruen (Fall
    // 4,23), der Unterschied zeigt sich erst unter einer Aenderung. Genau
    // das ist der Fall aus v287: mit dem alten Band wurde der
    // Wiederholungsaufschlag rot, mit dem neuen bleibt er still (10,58 gegen
    // Stand 12,43 bei Band 23,81). Ein Eingriff, der das auf dem heutigen
    // Baum zeigt, ist nicht zu stellen - dieselbe Lage wie beim zweiten
    // `bilderAbwarten` in v225.
    name: 'Die Ratsche liest ihr Rauschband nicht',
    datei: 'tools/sim.ts',
    suche: 'const stilRauschen = Math.max(stilRauschenZelle, stilRauschenStil);',
    ersatz: 'const stilRauschen = 0;',
    tor: 'sim',
    meldet: 'Abstand der Spielstile',
  },
  {
    // Und der leere Stand. Eine leere Datei galt in v227 schon einmal als
    // sauber, und `: > tools/proben-befund.txt` haette die Pruefung damit
    // still abgeschaltet - dieselbe Falle steht hier. Ein Lauf ohne Stand
    // sieht aus wie ein Lauf ohne Rueckschritt.
    //
    // **Die erste Fassung zaehlte die Kennzahlen auf, und der volle Lauf zu
    // v256 hat sie erwischt** - genau die Falle, gegen die dieses
    // Verzeichnis seit v219 anschreibt. Sie loeschte `stellen|ruhe|
    // goldUebrig|stilAbstand|zweigWirkung`; v254 und v255 haben drei
    // Kennzahlen dazugestellt, die drei Zeilen blieben stehen, der Stand war
    // nicht mehr leer, und das Tor meldete zu Recht etwas anderes. Eine
    // Probe, die ihren Gegenstand aufzaehlt, veraltet mit ihm. Sie trifft
    // jetzt die FORM einer Wertzeile, nicht ihre Namen.
    name: 'Die Spannungsratsche verliert ihren Stand',
    datei: 'tools/spannung-stand.txt',
    regel: /^[A-Za-z]+ (hoch|tief) .*$/gm,
    ersatz: '',
    tor: 'sim',
    meldet: 'ist leer oder fehlt',
  },
  {
    // **Der Zaehler der Entscheidungen (S-P1-03, v254).**
    //
    // Das Spielspass-Audit rechnete "36 Entscheidungen, gut zwei je Welle,
    // und die meisten davon frueh" - aus zwei Summenfeldern des Ergebnisses.
    // WANN sie fallen, hat niemand gemessen, und damit liess sich nicht
    // sagen, ob eine Welle ueberhaupt eine Entscheidung enthaelt (G7).
    //
    // Ohne diese Probe bewiese die neue Zeile nur, dass ein Zaehler zaehlt.
    // Mit einer Ruecklage von 9999 kann der Meister nichts mehr kaufen -
    // dann ist jede Welle entscheidungslos, und die Ratsche muss es sagen.
    name: 'Der Bot trifft keine Entscheidung mehr',
    datei: 'tools/sim.ts',
    // Mit dem Foerderer umgezogen (v285): die Zeile traegt ein Feld mehr.
    suche: "maxTowers: 12, maxLevel: 3, reserve: 40",
    ersatz: "maxTowers: 12, maxLevel: 3, reserve: 9999",
    tor: 'sim',
    meldet: 'Wellen ohne Entscheidung',
  },
  {
    // **Der Leerlauf muss steigen, wenn man wirklich wartet (S-P1-04, v255).**
    //
    // Gemessen liegt er bei 0,1 %, weil der Bot jede Welle in demselben Bild
    // startet, in dem er es darf. Eine Zahl, die immer auf null steht, sieht
    // aus wie eine Messung - erst wenn sie OHNE die Sache messbar faellt und
    // MIT ihr steigt, ist sie eine (Regel 13). Der Eingriff laesst den Bot
    // zehn Sekunden zwischen den Wellen warten; dann steht das Feld
    // tatsaechlich leer, und die Ratsche muss es sagen.
    //
    // `decideEvery` waere der falsche Griff und steht deshalb hier: es
    // verlangsamt das ENTSCHEIDEN, nicht den Wellenstart - der Bot wartet
    // dann genauso wenig, er baut nur seltener.
    name: 'Der Bot laesst das Feld leerlaufen',
    datei: 'tools/sim.ts',
    suche: 'if (s.canStartWave && !s.waveActive) s.startWave();',
    ersatz: 'if (s.canStartWave && !s.waveActive && frame % 600 === 0) s.startWave();',
    tor: 'sim',
    meldet: 'Leerlauf der Partie',
  },
  {
    // **Ein Grossbuchstabe hat E6 zehn Fassungen offengehalten (S-P1-06, v256).**
    //
    // Die Bedingung suchte `wellenfortschritt`, der Quelltext schreibt
    // `Wellenfortschritt`. Alle vier Teile des Punktes waren seit v239
    // geliefert; der Waechter verglich buchstabengetreu und schwieg - zu
    // Recht, denn eine Bedingung, die Schreibweisen mischt, faengt Treffer,
    // die keine sind. Falsch war nur, dass niemand den Zwischenfall meldete.
    //
    // Der Eingriff stellt genau ihn her: `bogenturm` klein, waehrend
    // `src/data/towers.ts` dreimal `Bogenturm` schreibt.
    //
    // **Die Nullprobe dazu ist der heutige Baum selbst** und braucht keinen
    // Eingriff: C3 sucht `Bannturm`, und das Wort kommt in towers.ts in
    // KEINER Schreibweise vor. Jeder gruene Doku-Lauf zeigt damit, dass die
    // Meldung schweigt, wenn ein Punkt einfach nur offen ist (Regel 13).
    name: 'Schliessbedingung nur in anderer Schreibweise',
    datei: 'docs/Towerfront-BACKLOG.md',
    // **Der Anker ist in v295 umgezogen, und das ist genau die Verfallsart,
    //   die `npm run muster` fangen soll.** Er hing an C3 (`Bannturm`); C3
    //   ist in v295 zugefallen und in die Erledigt-Tabelle gewandert, also
    //   kam der Eingriff nicht mehr an. Gemeldet hat es der Musterlauf, nicht
    //   ich. Jetzt haengt er an C16 (`Flakstellung`) - dem naechsten offenen
    //   Punkt, dessen Schliessbedingung auf `src/data/towers.ts` zeigt.
    //   **Die Nullprobe zieht mit um und braucht weiterhin keinen Eingriff:**
    //   `Flakstellung` kommt in `src/data/towers.ts` in keiner Schreibweise
    //   vor (gemessen 0), und jeder gruene Doku-Lauf zeigt damit, dass die
    //   Meldung dann schweigt.
    suche: 'text src/data/towers.ts "Flakstellung" >= 1',
    ersatz: 'text src/data/towers.ts "bogenturm" >= 1',
    tor: 'doku',
    meldet: 'andere Schreibweise',
  },
  {
    // **Die zwei Proben zur Knappheit (S-P2-01, v257), und sie ziehen in
    // entgegengesetzte Richtungen.**
    //
    // "42,7 % des verdienten Goldes bleiben liegen" ist die Kernzahl von G5 -
    // und das Spielspass-Audit traegt ihre Einschraenkung selbst: der Bot
    // baut hoechstens zwoelf Tuerme und 24 Ausbauten, er KANN gar nicht
    // alles ausgeben. Gemessen sind es beim ungedeckelten Bestleistungs-Bot
    // nur 14,6 % - mehr als die Haelfte der Zahl war der Deckel.
    //
    // Die Knappheit haengt nicht am Deckel. Mit 5000 Startgold faellt sie
    // fast auf null; eine Kennzahl, die sich in beide Richtungen nicht
    // bewegt, misst etwas anderes (Regel 13).
    name: 'Gold ist ploetzlich im Ueberfluss da',
    datei: 'src/data/difficulty.ts',
    suche: 'startGold: 220, startLives: 42',
    ersatz: 'startGold: 5000, startLives: 42',
    tor: 'sim',
    meldet: 'Knappheit',
  },
  {
    // **Das Knie darf nicht zum Sprung werden (S-P2-02, v258).**
    //
    // `KNIE_ANFANG` sagt, ab welchem Anteil des Wellenplans die
    // Lebenspunkte anziehen; `KNIE_ENDE` bei 0,92, wo sie ihre volle Hoehe
    // haben. Setzt man beide gleich, ist der Uebergang keine Kurve mehr,
    // sondern eine Stufe - die Wellen davor sind alle gleich leicht, die
    // danach alle gleich schwer.
    name: 'Die Lebenskurve springt statt zu steigen',
    datei: 'src/data/difficulty.ts',
    suche: 'const KNIE_ANFANG = 0.55;',
    ersatz: 'const KNIE_ANFANG = 0.92;',
    tor: 'guards',
    meldet: 'Kurve',
  },
  {
    // **Die zwei Proben zum Durchbruchgewicht (S-P2-03, v259), und sie
    // treffen dieselbe Zahl von beiden Seiten.**
    //
    // Der Kristall stand bis v258 auf 60, der Leerentitan nimmt 5 - also
    // 8,3 %. Kingdom Rush arbeitet mit 20 Leben, und ein einziger Durchbruch
    // ist dort sichtbar teuer. Gemessen wird der ANTEIL, nicht die
    // Punktzahl: als der Kristall von 20 auf 60 stieg, wurden fuenf
    // Pruefungen still bedeutungslos (Regel 2).
    name: 'Der Kristall ist wieder zu gross',
    datei: 'src/data/difficulty.ts',
    suche: 'startGold: 220, startLives: 42',
    ersatz: 'startGold: 220, startLives: 600',
    tor: 'guards',
    meldet: 'Durchbruchgewicht',
  },
  {
    // Von der anderen Seite: der schwerste Gegner nimmt nur noch 1 statt 5.
    // Ohne diese zweite Probe hinge die Regel allein am Nenner, und ein
    // Zaehler, der still auf null faellt, saehe genauso aus.
    name: 'Der schwerste Gegner tut nicht mehr weh',
    datei: 'src/data/enemies.ts',
    suche: 'hp: 682, speed: 53, bounty: 48, leak: 5',
    ersatz: 'hp: 682, speed: 53, bounty: 48, leak: 1',
    tor: 'guards',
    meldet: 'Durchbruchgewicht',
  },
  {
    // **Die Goldbindung (S-P2-04, v260).**
    //
    // Sie haelt das Verhaeltnis zwischen dem, was eine Karte ausschuettet,
    // und dem, was zwoelf voll ausgebaute Tuerme kosten. Heute 464 bis
    // 522 % - die Wirtschaft ist nicht locker, man kann sich ein Fuenftel
    // eines vollen Feldes leisten. Dreifaches Einkommen drueckt sie unter
    // die Schranke von 300 %.
    name: 'Das Einkommen wird verdreifacht',
    datei: 'src/data/difficulty.ts',
    suche: 'bountyMul: 1, bonusMul: 1,',
    ersatz: 'bountyMul: 3, bonusMul: 3,',
    tor: 'guards',
    meldet: 'Goldbindung',
  },
  {
    // **Kein Grad darf folgenlos sein (S-P2-05, v261).**
    //
    // "Ruhig" endete gemessen fuer alle drei Spielstile mit dem vollen
    // Kristall - nicht ein Punkt ging verloren. Derselbe Defekt wie G1, eine
    // Ebene tiefer: ein Grad, auf dem nichts passieren KANN, ist kein Grad,
    // sondern ein Abspielmodus. Kein Tor hat etwas gesagt; die Pruefungen
    // verlangten nur, dass nicht zu viele Stile scheitern.
    //
    // **Die Nullprobe dazu ist die Vorgeschichte selbst und braucht keinen
    // Eingriff:** mit dem alten Wert 10,7 schlug die Pruefung an, von Hand
    // nachgefahren, bevor der Wert auf 12,0 stieg. Sie meldet also den
    // Zustand, den diese Runde behoben hat - und nicht nur irgendeinen.
    name: 'Das Spiel kostet niemanden mehr etwas',
    datei: 'src/data/difficulty.ts',
    // **Neu angesetzt in v314** (S-N1-05): der Grad "Ruhig" ist entfallen, die
    // PRUEFUNG nicht - sie verlangt weiter, dass nicht alle Spielstile
    // verlustfrei durchkommen. Gegriffen wird deshalb die eine verbliebene
    // Lebenskurve statt der von Ruhig; flach genug, und das Spiel kostet
    // niemanden mehr etwas.
    regel: /hpEnd: 24\.0, hpCurve: 2\.6/,
    ersatz: 'hpEnd: 4.0, hpCurve: 2.6',
    tor: 'sim',
    meldet: 'verlustfrei',
  },
  {
    // **Die vier Proben zum Kernraub (S-P3-01/02, v262).**
    //
    // Ein durchgekommener Gegner war bis v261 ein Abzug: Kristall herunter,
    // Ruckeln, Gegner tot. Ein Abzug ist kein Ereignis - der schlimmste
    // Augenblick des Spiels war der ereignisloseste. Jetzt nimmt er einen
    // Splitter und laeuft damit hinaus, und solange er lebt, ist nichts
    // endgueltig verloren.
    //
    // Erstens: die Umkehr. Ohne sie laeuft der Raeuber weiter vorwaerts und
    // erreicht sein Tor nie.
    name: 'Der Raeuber kehrt nicht um',
    datei: 'src/game/state.ts',
    suche: 'const richtung = e.kernraub > 0 ? -GameState.KERNRAUB_TEMPO : 1;',
    ersatz: 'const richtung = 1;',
    tor: 'smoke',
    meldet: 'er kehrt nicht um',
  },
  {
    // Zweitens: der Kristall faellt SOFORT, nicht erst am Tor. Sonst zeigte
    // die Anzeige eine Zahl, die noch nicht wahr ist, und die Bilanz eine
    // andere als der Bildschirm - gemessen "91 Kristallverlust verbucht,
    // aber 0 fehlen".
    //
    // Erwartet wird deshalb die BILANZ-Meldung und nicht das Wort
    // "Kernraub": der erste Entwurf dieser Probe verlangte es und schwieg
    // zu Recht, weil der Raeuber ja weiter traegt, was verbucht wurde
    // (Regel 3 - der Eingriff kam an, nur meldete ein anderer Satz).
    name: 'Der Kristall faellt erst am Tor',
    datei: 'src/game/state.ts',
    suche: '    this.lives -= wirklich;',
    ersatz: '    /* kein Abzug beim Raub */',
    tor: 'smoke',
    meldet: 'Kristallverlust verbucht',
  },
  {
    // Drittens: die Deckelung auf `maxLives`. Das ist die Zusage aus v174
    // von der anderen Seite - dort der Abzug bei null, hier die Gutschrift
    // beim Hoechstwert.
    name: 'Die Rueckgabe hebt den Kristall ueber sein Maximum',
    datei: 'src/game/state.ts',
    suche: 'const gut = Math.min(sp.punkte, Math.max(0, this.maxLives - this.lives));',
    ersatz: 'const gut = sp.punkte;',
    tor: 'smoke',
    meldet: 'ueber seinen Hoechstwert',
  },
  {
    // Viertens: die Gutschrift wird verdoppelt. Dann steht am Kristall mehr,
    // als der Raeuber getragen hat, und die Bilanz meldet einen Verlust, den
    // es nicht mehr gibt.
    name: 'Die Rueckgabe wird verdoppelt',
    datei: 'src/game/state.ts',
    suche: '      this.lives += gut;',
    ersatz: '      this.lives += gut * 2;',
    tor: 'smoke',
    meldet: 'Splitter',
  },
  {
    // **Man muss SEHEN, dass etwas fortgetragen wird (S-P3-03, v263).**
    //
    // Der Schildtraeger hat es vorgemacht: gestrichelter Ring und Faeden zu
    // denen, die er versorgt - die Reihenfolge muss man sehen, nicht
    // erschliessen. Ohne Marke ist ein Raeuber ein Gegner, der aus
    // unerfindlichen Gruenden in die falsche Richtung laeuft.
    //
    // Der Eingriff nimmt dem Raeuber seinen Splitter. Geprueft wird nicht,
    // dass die Aufnahme entsteht - das bewiese nur, dass sie entsteht -,
    // sondern dass sie sich von derselben Karte OHNE Raeuber unterscheidet.
    name: 'Der Raeuber traegt seine Beute unsichtbar',
    datei: 'src/gfx/renderer.ts',
    suche: '      if (e.kernraub > 0) {',
    ersatz: '      if (false) {',
    tor: 'bildtor',
    meldet: 'nicht zu sehen',
  },
  {
    // **Die zwei Proben zu den ueberlappenden Wellen (S-P4-01, v266).**
    //
    // Erstens die Verbuchung. `stats.leaksByWave` buchte bis v265 unter
    // `this.waveIndex`, und der zeigt bei Ueberlappung auf die NEUERE Welle:
    // Verluste der alten wanderten in die neue, und die Verlustverteilung -
    // die Kennzahl von G1 - waere still falsch geworden. Verbucht wird
    // deshalb an der Welle DES GEGNERS.
    name: 'Verluste wandern in die neuere Welle',
    datei: 'src/game/state.ts',
    regel: /this\.stats\.leaksByWave\[e\.welle\] = \(this\.stats\.leaksByWave\[e\.welle\] \?\? 0\) \+ wirklich;/,
    ersatz: 'this.stats.leaksByWave[this.waveIndex] = '
      + '(this.stats.leaksByWave[this.waveIndex] ?? 0) + wirklich;',
    tor: 'smoke',
    meldet: 'Wellenbuchung',
  },
  {
    // Zweitens die Obergrenze. Drei Wellen zugleich waeren keine
    // Entscheidung mehr, sondern eine Lawine - und die Kreuzdeckung der
    // Karten ist auf einen Wellenstrom je Bahn eingemessen (v237).
    name: 'Drei Wellen lassen sich stapeln',
    datei: 'src/game/state.ts',
    suche: 'static readonly UEBERLAPPUNG_MAX = 2;',
    ersatz: 'static readonly UEBERLAPPUNG_MAX = 3;',
    tor: 'smoke',
    meldet: 'Obergrenze von zwei haelt nicht',
  },
  {
    // **Die zwei Proben zum Wellenband (S-P4-03, v268).**
    //
    // Erstens die, die die Story nennt: den laufenden Strom im Kompaktblock
    // ausblenden - also genau der Fehler, der den Fruehstart bis v243 auf dem
    // ZIELGERAET unsichtbar gemacht hat. Der Rauchtest sieht das nicht, weil
    // jsdom keine Stilvorlage kennt; es muss das Browsertor sein.
    name: 'Laufender Strom auf dem Zielgeraet ausgeblendet',
    datei: 'src/style.css',
    suche: '@media (max-height: 480px) {\n  /* **Die Skala schrumpft',
    ersatz: '@media (max-height: 480px) {\n  .go-lauf { display: none; }\n'
      + '  /* **Die Skala schrumpft',
    tor: 'browsertor',
    meldet: 'laufende Strom steht auf dem Zielgerät nicht im Bild',
  },
  {
    // **Zwei Bannmale summieren sich** (v295, C3, S6).
    //
    // Der Deckel ist die eine Zusage, an der die Wette haengt: summieren sie
    // sich, heisst die Antwort auf jede Lage "noch ein Bannturm", und aus
    // einer Entscheidung wird eine Rechenaufgabe. Bloons deckelt sein Dorf
    // aus demselben Grund ausdruecklich.
    name: 'Bannmale summieren sich',
    datei: 'src/data/towers.ts',
    suche: '  return (sortiert[0] ?? 0) + (sortiert[1] ?? 0) * 0.5;',
    ersatz: '  return sortiert.reduce((a, b) => a + b, 0);',
    tor: 'guards',
    meldet: 'sie summieren sich',
  },
  {
    // **Der Bannturm verstaerkt sich selbst** (v295).
    //
    // Dann waere die beste Stellung "zwei Bannturme nebeneinander", und das
    // ist keine Stellung, sondern eine Schleife. Dieselbe Regel wie beim
    // Schildtraeger der Gegner (v110), der seinen eigenen Schild nie
    // nachlaedt - nur faengt sie hier der Rauchtest, nicht der Waechter:
    // gemessen wird das VERHALTEN, nicht die Zahl.
    name: 'Bannturm verstaerkt sich selbst',
    datei: 'src/game/state.ts',
    suche: "    if (TOWERS[t.def].attack === 'keiner') return 0;",
    ersatz: '    // Eingriff: kein Riegel',
    tor: 'guards',
    meldet: 'Bannturm',
  },
  {
    // **Ein Spielstil, der nicht gewinnt** (v293, M18).
    //
    // "Abstand der Spielstile" laesst sich hochtreiben, indem man einen Bot
    // VERSCHLECHTERT - genau das ist beim Bau dieser Runde passiert:
    // `Sparsam` bekam die teuren Tuerme, verlor in Welle 14, und der Abstand
    // sprang von 8 auf 28. "ERREICHT", zum ersten Mal ueberhaupt. Eine
    // Kennzahl, die sich durch Verschlechtern verbessern laesst, ist keine.
    //
    // Der Eingriff stellt genau diesen Fall wieder her.
    //
    // **In v341 nachgezogen, und der Fehler lag bei mir** (K1): v336 hat den
    // Waechter vom "gewinnt die erste KARTE" auf "gewinnt den ersten
    // ABSCHNITT" umgestellt - mit dem Umstieg auf Laeufe war aus seiner
    // woertlichen Zusage ungewollt "gewinnt alle vier Abschnitte" geworden.
    // Die Meldung hat sich damit geaendert, und die Probe griff noch den
    // alten Satz. Wer ein Tor umbaut, zieht seine Proben in DERSELBEN Runde
    // nach; hier ist es eine Runde zu spaet passiert, und gefunden hat es
    // der Nachtlauf.
    //
    // Gegriffen wird jetzt der Satzanfang statt der ganzen Zeile: die Zahlen
    // darin (`${r.siege}`, die Punktzahl) aendern sich mit jeder Eichung.
    //
    // **Und der Eingriff musste schaerfer werden, nicht nur die Meldung.**
    // Bis v335 fragte der Waechter, ob der Stil den ganzen Lauf gewinnt;
    // seit v336 fragt er am ERSTEN Abschnitt, und der ist der leichteste.
    // Der alte Eingriff (nur teure Tuerme) gewinnt ihn gemessen weiterhin -
    // er kam an und bewirkte nichts, genau die Verfallsart aus v313. Jetzt
    // faehrt `Sparsam` ein reines Moerserfeld: `npm run sim -- --monokultur`
    // misst dafuer "verloren in Welle 11" von 15, also schon im ersten
    // Abschnitt. Der Moerser trifft keine Gleiter, und daran ist mit keiner
    // Baureihenfolge etwas zu retten.
    name: 'Ein Spielstil gewinnt die erste Karte nicht',
    datei: 'tools/sim.ts',
    suche: "    name: 'Sparsam', foerderer: 0, maxTowers: 12, maxLevel: 3, reserve: 140,",
    ersatz: "    plan: ['mortar', 'mortar', 'mortar', 'mortar'],\n"
      + "    name: 'Sparsam', foerderer: 0, maxTowers: 12, maxLevel: 3, reserve: 140,",
    tor: 'sim',
    meldet: 'gewinnt den ERSTEN Abschnitt nicht',
  },
  {
    // **Ersatzschreibung im ANGEZEIGTEN Text** (v292).
    //
    // Die Werft trug "ein Stueck des Kristalls" in ihrem `blurb` - also im
    // Text, den der Spieler liest -, und die Verdaechtigenliste kannte das
    // Wort nicht. Gefunden wurde die Zeile nur, weil im selben Satz "ueber"
    // und "fuer" standen. Die Probe greift jetzt an genau diesem Wort.
    //
    // Die Probe zu v288 traf einen HTML-KOMMENTAR, diese den angezeigten
    // Text: derselbe Waechter, zwei verschiedene Wege ins Buendel.
    name: 'Ersatzschreibung im angezeigten Text',
    datei: 'src/data/towers.ts',
    suche: 'ein Stück des Kristalls zusammen.',
    ersatz: 'ein Stueck des Kristalls zusammen.',
    tor: 'autarkietor',
    meldet: 'Ersatzschreibung statt Umlaut',
  },
  {
    // **Zwei Platzhalter sehen gleich aus** (v290).
    //
    // Solange ein einziges Bild fehlte, war das keine Frage. Seit v290 fehlen
    // zwei, und sie standen als identische Kacheln nebeneinander in der
    // Bauleiste. Gefunden hat es der Blick (Regel 8), das Tor kam danach.
    //
    // Der Eingriff nimmt den Buchstaben heraus - dann bleibt nur die
    // Schraffur, und die ist fuer beide dieselbe. Er trifft den ganzen
    // Zeichenblock: der erste Entwurf liess `strokeText` stehen, und dessen
    // dunkler Saum trennt die beiden weiterhin (Regel 3).
    name: 'Platzhalter unterscheidet zwei Bauwerke nicht',
    datei: 'src/gfx/sprites.ts',
    suche: "      const zeichen = wort[0].toUpperCase();",
    ersatz: "      const zeichen = 'X';",
    tor: 'bildtor',
    meldet: 'Zwei Platzhalter sehen gleich aus',
  },
  {
    // **Die Werft macht einen Durchbruch folgenlos** (v290, S-N3-04).
    //
    // Genau die Gegenprobe, die die Story verlangt: die Reparatur unbegrenzt
    // schnell machen. Dann steht der Kristall am Ende voll da, der Verlust
    // ist zurueckgekauft statt abgemildert, und `sim` muss es sagen.
    name: 'Werft macht einen Durchbruch folgenlos',
    datei: 'src/data/towers.ts',
    suche: 'export const WERFT_GRUND = 1;',
    ersatz: 'export const WERFT_GRUND = 99;',
    tor: 'sim',
    meldet: 'Durchbruch zurueckgekauft statt abgemildert',
  },
  {
    // **Die Werft schiesst** (v290).
    //
    // Dieselbe Regel wie beim Foerderer, und aus demselben Grund: wer ihr
    // Schaden gibt, macht sie zum Turm mit Bonus, und dann baut man sie
    // immer.
    name: 'Werft traegt Schadenswerte',
    datei: 'src/data/towers.ts',
    suche: "    attack: 'keiner', hitsAir: false, projectileSpeed: 0,\n"
      + '    base: { cost: 150, damage: 0, cooldown: 0 },',
    ersatz: "    attack: 'single', hitsAir: false, projectileSpeed: 700,\n"
      + '    base: { cost: 150, damage: 12, cooldown: 1 },',
    tor: 'guards',
    meldet: 'Werft greift mit',
  },
  {
    // **Die Kette geht ueber eine wartende Story hinweg** (v289).
    //
    // `npm run naechste` nahm bis v288 die erste offene in Dokumentreihen-
    // folge und sah die Zeile "Haengt an" gar nicht an. Damit blockiert eine
    // Story, die auf eine SPAETERE wartet, die ganze Kette - in v287 genau
    // passiert, als gemessen herauskam, dass S-N3-02 an S-N3-04 haengt.
    //
    // Der Eingriff laesst S-N3-04 auf S-N3-02 warten - und S-N3-02 wartet
    // auf S-N3-04. Das ist ein Ring, aber KEIN vollstaendiger: es gibt
    // andere freie Stories, das Werkzeug findet also eine und meldet keinen
    // Stillstand. Genau das hat der erste Entwurf dieser Probe erwartet und
    // damit nichts bewiesen (Regel 3).
    //
    // Was der Eingriff wirklich bewirkt, ist das Ueberspringen von S-N3-04 -
    // und dass es GENANNT wird. Daran greift sie jetzt; ohne die Zeile
    // "Haengt an" waere S-N3-04 weiter gewaehlt worden und stuende nirgends.
    name: 'Kette liest die Abhaengigkeit nicht',
    datei: 'docs/Towerfront-STORIES.md',
    // **Auch diese Probe hat in v313 ihren Gegenstand verloren.** Sie haengte
    // S-N3-04 an S-N3-02 - und S-N3-04 ist seit v290 zu. Eine zugefallene
    // Story wird gar nicht erst auf ihre Abhaengigkeit angesehen
    // (`zustandVon.get(a.id) !== 'OFFEN'` in `naechste.mjs`), also blieb der
    // Eingriff folgenlos. Er kam an und bewirkte nichts: die stillste Art,
    // wie eine Probe aufhoert zu beweisen.
    //
    // **Und in v341 ein drittes Mal, aus demselben Grund.** v313 hat sie an
    // S-N7-01 gehaengt, "der letzten Story des Katalogs", mit der
    // Begruendung: *sie gilt, solange es die letzte Story gibt*. S-N7-01 ist
    // in v335 zugefallen, und damit war der Eingriff wieder folgenlos - die
    // Kette sieht eine zugefallene Story gar nicht erst auf ihre
    // Abhaengigkeit an (`zustandVon.get(a.id) !== 'OFFEN'`).
    //
    // **Zweimal an einer VORHANDENEN Story zu greifen hat zweimal nicht
    // getragen, weil jede vorhandene zufallen kann.** Der Eingriff legt
    // deshalb seine EIGENE an: eine Story, deren Schliessbedingung nie
    // erfuellt ist (also dauerhaft OFFEN), die auf S-N4-08 wartet (HANDARBEIT,
    // wird nie "zu") und die es ohne den Eingriff nicht gibt. Damit haengt
    // die Probe an gar keinem Fortschritt mehr - weder an dem einer Story
    // noch an der Laenge des Katalogs.
    regel: /(\n## Rückbau — nur fahren, wenn eine Abnahme nach drei Schleifen nicht hält\n)/,
    ersatz: '\n### S-N9-99 · Gegenprobe: eine Story, die auf eine Handarbeit wartet\n\n'
      + '**Paket:** N9 · **Aufwand:** S · **Hängt an:** S-N4-08\n\n'
      + '**Schliesst, wenn:** `text src/data/config.ts "DIESE-ZEILE-GIBT-ES-NIE" >= 1`\n$1',
    tor: 'naechste',
    // Die Meldung nennt beide Namen. Ein blosses "wartet auf" waere KEINE
    // Probe: `naechste` nennt heute fuenf solcher Zeilen ohne jeden Eingriff
    // (S-N4-02, S-N4-03, S-N4-06, S-N6-02, S-N6-03), und eine Meldung, die
    // ohnehin kommt, beweist nichts (Regel 13).
    meldet: 'S-N9-99 wartet auf S-N4-08',
  },
  {
    // **Der Umlaut im ausgelieferten HTML-Kommentar** (v288).
    //
    // v286 hat ihn hinterlassen, und der Runner ist daran rot geworden:
    // HTML-Kommentare gehen mit ins Buendel, und im ausgelieferten Text
    // steht ein echter Umlaut, waehrend der Quelltext durchweg `ae/oe/ue`
    // schreibt. Der Waechter kann das - er hat es gemeldet -, geprueft war
    // aber nie, dass er es kann: es gab keine Probe darauf.
    name: 'Ersatzschreibung im ausgelieferten Kommentar',
    datei: 'index.html',
    suche: 'nicht die Fläche.',
    ersatz: 'nicht die Flaeche.',
    tor: 'autarkietor',
    meldet: 'Ersatzschreibung statt Umlaut',
  },
  {
    // **Der Wiederholungsaufschlag** (v287, S-N3-02).
    //
    // Der Preis entsteht seit v287 an EINER Stelle. Nimmt man die Freimenge
    // heraus, greift der Aufschlag ab dem zweiten Turm - und dann ist er
    // keine Strafe fuers Haeufen mehr, sondern eine globale Verteuerung:
    // das Spiel hat vier Geschuetze, zwoelf Tuerme sind drei je Sorte, auch
    // beim perfekten Verteiler. Gemessen kippt das die erste Karte.
    //
    // **Der erste Entwurf dieser Probe bewies nichts, und er hatte recht.**
    // Sie zielte auf die Trennung zwischen Haeufer und Verteiler - die bleibt
    // aber auch ohne Freimenge gross, denn wer zwoelf gleiche Tuerme baut,
    // zahlt in jedem Fall mehr als wer vier Arten mischt. Regel 3.
    //
    // Der zweite Entwurf bewies auch nichts: "gewinnt er noch?" haengt am
    // Bot, und der Meister gewinnt auch ohne Freimenge (25 statt 31
    // Kristall). `npm run c18` faehrt einen schwaecheren, deshalb kippt es
    // dort - eine Zusage, die auf einem Messplatz anschlaegt und auf dem
    // anderen nicht, ist keine (v225).
    //
    // Gemessen wird jetzt der KRISTALL des Verteilers, mit Aufschlag gegen
    // ohne. Er haeuft nichts, also darf ihn eine Regel gegen das Haeufen auch
    // nichts kosten.
    //
    // **Seit v300 gegen das eigene Rauschen, nicht gegen eine harte Null.**
    // Bis dahin stand die Zusage auf EINEM Lauf je Karte - und gemessen
    // schwankt der Wert auf der Ascheschlucht zwischen den drei Aussaaten um
    // **12 Kristall** (+6 / +12 / +0). Eine Null, die neben einem Rauschen
    // von 12 steht, beweist nichts; sie hat in v299 prompt einen
    // Rueckschritt gemeldet, den sie von einem Wurf nicht unterscheiden
    // kann. Diese Probe ist der Beleg, dass sie trotzdem noch anschlaegt:
    // ohne Freimenge zahlt der Verteiler auf einer Karte MEHR als ihr Band
    // breit ist.
    name: 'Wiederholungsaufschlag ohne Freimenge',
    datei: 'src/data/towers.ts',
    suche: 'export const WIEDERHOLUNG_FREI = 3;',
    ersatz: 'export const WIEDERHOLUNG_FREI = 0;',
    tor: 'sim',
    meldet: 'kostet den perfekten Verteiler',
  },
  {
    // **Die zwei Proben zur Trennung der FLAECHE (v286).**
    //
    // v268 hat den Satz getrennt - Zustand links, Handlung rechts - und die
    // Trefferflaeche nicht: der Strom stand IM Knopf, machte ihn von 208 auf
    // 317 Punkte breit, und wer die Anzeige antippte, startete eine Welle.
    // Gemessen kostete das 1,4 % des Bildschirms; `uxaudittor` wurde daran
    // rot, sobald ein fuenfter Bauknopf dazukam.
    //
    // Erstens: nimmt man die Durchlaessigkeit heraus, faengt der Strom
    // wieder. Das UX-Tor faende es auch, aber erst als Prozentzahl ohne
    // Ursache - hier steht die Sache selbst.
    name: 'Laufender Strom faengt den Finger wieder',
    datei: 'src/style.css',
    suche: '  color: var(--crystal);\n  pointer-events: none;',
    ersatz: '  color: var(--crystal);\n  pointer-events: auto;',
    tor: 'browsertor',
    meldet: 'laufende Strom fängt den Finger',
  },
  {
    // Zweitens: was den Knopf wirklich rechts haelt.
    //
    // Der erste Entwurf dieser Probe zog `margin-left: auto` heraus und
    // bewies NICHTS - zweimal, auch mit gestelltem Freiraum im Band. Die
    // Messung hat die Ursache genannt: `.dock-body` traegt `flex: 1 1 auto`
    // und frisst den Freiraum, es gibt also nie einen zu verteilen. Der
    // Knopf steht rechts, weil der Koerper waechst; die `margin`-Zeile stand
    // seit v239 da und hat nie etwas getan.
    //
    // Also greift die Probe an der Sache: waechst der Koerper nicht mehr,
    // dann schiebt die Breite des Stroms den Knopf nach rechts, sobald er
    // erscheint - und unter dem Daumen ist er woanders. Genau das misst das
    // Tor am gestellten Freiraum.
    name: 'Wellenknopf rutscht, wenn der Strom erscheint',
    datei: 'src/style.css',
    suche: '.dock-body {\n  display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto;',
    ersatz: '.dock-body {\n  display: flex; flex-direction: column; gap: 6px; flex: 0 1 auto;',
    tor: 'browsertor',
    meldet: 'Wellenknopf rutscht um',
  },
  {
    // Drittens: der Umbruch, den das Tor bis v285 gar nicht sehen konnte.
    //
    // Es prueft seit v268 die Hoehe des KNOPFES - solange der Strom sein
    // Kind war, machte ein Umbruch den Knopf zweizeilig. Daneben gestellt
    // aendert er die Knopfhoehe nicht mehr, und die Pruefung haette
    // geschwiegen. Sie tat es auch: er brach bei "Welle 15 · noch 71" auf
    // zwei Zeilen um, und gesehen hat es der Blick (Regel 8).
    name: 'Laufender Strom bricht auf zwei Zeilen um',
    datei: 'src/style.css',
    suche: '  white-space: nowrap;\n  /* **Er liegt jetzt auf dem Feld',
    ersatz: '  white-space: normal;\n  /* **Er liegt jetzt auf dem Feld',
    tor: 'browsertor',
    meldet: 'laufende Strom ist',
  },
  {
    // Zweitens die Mehrdeutigkeit selbst. `waveNumber` zeigt die NEUESTE
    // laufende Welle, `startWelle` die naechste startbare - solange nur eine
    // laufen konnte, waren beide dasselbe. Mit der alten Zahl sagt der Knopf
    // wieder "Welle 1 starten", waehrend er Welle 2 startet.
    name: 'Der Wellenknopf nennt die falsche Welle',
    datei: 'src/ui/ui.ts',
    suche: '      ? `Welle ${s.startWelle} starten`',
    ersatz: '      ? `Welle ${s.waveNumber} starten`',
    tor: 'smoke',
    meldet: 'er startet aber Welle 2',
  },
  {
    // **Die zwei Proben zum Fruehstart-Risiko (S-P4-02, v267).**
    //
    // Erstens die Lage selbst - das ist die Gegenprobe, die die Story
    // verlangt: den Lageanteil auf konstant setzen. Dann ist der Bonus bei
    // vollem und bei leerem Feld gleich, und genau das ist der Zustand vor
    // v267. Ein fester Wert und nicht null: bei null bliebe die Nullprobe
    // heil, und der Rauchtest meldete nur die Haelfte des Schadens.
    name: 'Die Lage zaehlt beim Fruehstart nicht mit',
    datei: 'src/game/state.ts',
    suche: '    return Math.min(1, steht / ganz);',
    ersatz: '    return 0.5;',
    tor: 'smoke',
    meldet: 'Lage',
  },
  {
    // Zweitens der Hub. Steht er auf null, ist der Bonus wieder allein die
    // Uhr - und die steht bei laufender Welle fest auf 1,0. Das ist die
    // Klasse, die von v266 bis v267 unbemerkt bestand: der Fruehstart HATTE
    // eine Zahl, sie bewegte sich nur nicht mehr.
    name: 'Der Fruehstart zahlt fuer Risiko nichts',
    datei: 'src/data/waves.ts',
    suche: 'export const EARLY_RISIKO_HUB = 2.0;',
    ersatz: 'export const EARLY_RISIKO_HUB = 0;',
    tor: 'smoke',
    meldet: 'Der Bonus folgt der Lage nicht',
  },
  {
    // **Die zwei Proben zu den Rettungen (S-P3-04, v264), und sie treffen
    // das Band von beiden Raendern.**
    //
    // Unter einem Drittel ist der Kernraub Dekoration - der Raeuber laeuft
    // davon, und man sieht nur zu. Ueber zwei Dritteln ist ein Leck
    // folgenlos, und dann ist G1 von der anderen Seite kaputt: es koennte
    // nichts mehr passieren, weil alles zurueckkommt.
    //
    // Zehnfaches Fluchttempo: er erreicht sein Tor immer.
    name: 'Der Raeuber ist nicht mehr einzuholen',
    datei: 'src/game/state.ts',
    suche: 'static readonly KERNRAUB_TEMPO = 2.4;',
    ersatz: 'static readonly KERNRAUB_TEMPO = 24;',
    tor: 'sim',
    meldet: 'Rettungen',
  },
  {
    // Und Tempo null: er kommt nie an, jeder Raub wird gerettet.
    name: 'Der Raeuber bleibt stehen',
    datei: 'src/game/state.ts',
    suche: 'static readonly KERNRAUB_TEMPO = 2.4;',
    ersatz: 'static readonly KERNRAUB_TEMPO = 0;',
    tor: 'sim',
    meldet: 'Rettungen',
  },
  // **Die andere Richtung hat KEINE Gegenprobe, und das steht hier statt in
  // einer Fussnote.**
  //
  // Zwei Gruende, beide gemessen. Erstens faengt die Ratsche nur den FALL
  // einer Kennzahl - ein Anstieg der Knappheit ist eine Verbesserung, und
  // ein Tor, das bei Verbesserungen anschlaegt, gibt es hier zu Recht
  // nicht. Zweitens ist der Anstieg zu klein: mit 60 statt 220 Startgold
  // steigt sie von 45,0 auf 55,4 % - um 10 Punkte, bei einer eigenen
  // Spanne von 17 bis 23. Nach dem Massstab dieses Projekts (S-P1-01) ist
  // dieser Anstieg damit UNBELEGT.
  //
  // Die Kennzahl beweist also zuverlaessig, DASS Knappheit da ist (mit 5000
  // Startgold faellt sie auf gemessene 0,0 %), taugt aber nicht, um kleine
  // Veraenderungen daran zu messen. Beide Zahlen sind von Hand gefahren.
  {
    // **Der Nachtlauf braucht einen Weg zurueck ins Tor.** Bis v226 landete
    // sein Befund nur im Protokoll auf dem Runner. In der Sitzung zu v226 ist
    // er dreimal gefahren, zweimal rot, und beide Befunde habe ich nur
    // gefunden, weil ich nachgesehen habe.
    name: 'Nachtlauf-Befund wird verschwiegen',
    datei: 'tools/proben-befund.txt',
    // **Nicht mehr an der `sauber`-Zeile** (v313): steht in der Datei ein
    // BEFUND statt einer sauberen Zeile, gibt es dieses Muster nicht - und
    // genau dann laeuft der naechste Lauf. Die drei Proben verloren ihren
    // Gegenstand also immer dann, wenn man sie am dringendsten braucht, und
    // machten `muster` ein zweites Mal rot. Gegriffen wird jetzt der ganze
    // Inhalt, was auch immer darin steht.
    regel: /[\s\S]+/,
    ersatz: 'BEFUND: eine Probe beweist nichts mehr.',
    tor: 'muster',
    meldet: 'hat einen Befund hinterlassen',
  },
  {
    // Und die Gegenrichtung: ein sauberer Lauf mit anderem Datum und anderem
    // Commit muss SCHWEIGEN. Ohne sie besteht die Probe darueber auch ein
    // Tor, das bei jedem Inhalt anschlaegt - und dann waere die Torkette
    // dauerrot und die Zeile in zwei Runden abgeschaltet.
    name: 'Sauberer Nachtlauf schweigt',
    datei: 'tools/proben-befund.txt',
    // **Nicht mehr an der `sauber`-Zeile** (v313): steht in der Datei ein
    // BEFUND statt einer sauberen Zeile, gibt es dieses Muster nicht - und
    // genau dann laeuft der naechste Lauf. Die drei Proben verloren ihren
    // Gegenstand also immer dann, wenn man sie am dringendsten braucht, und
    // machten `muster` ein zweites Mal rot. Gegriffen wird jetzt der ganze
    // Inhalt, was auch immer darin steht.
    regel: /[\s\S]+/,
    ersatz: 'sauber 2099-01-01 deadbeef',
    tor: 'muster',
    meldetNicht: 'hat einen Befund hinterlassen',
  },
  {
    // **Die leere Datei ist der dritte Fall, und er war die Luecke.** Der
    // erste Entwurf gab bei leerer UND bei fehlender Datei "kein Befund"
    // zurueck - ein `: > tools/proben-befund.txt` haette die Pruefung still
    // abgeschaltet, und still abschaltbar ist so gut wie nicht vorhanden.
    //
    // Die FEHLENDE Datei laesst sich mit diesem Mittel nicht stellen (der
    // Ersatz schreibt, er loescht nicht). Sie ist im Code behandelt und von
    // Hand nachgefahren; eine Gegenprobe hat sie nicht.
    name: 'Leere Befund-Datei gilt als sauber',
    datei: 'tools/proben-befund.txt',
    // **Nicht mehr an der `sauber`-Zeile** (v313): steht in der Datei ein
    // BEFUND statt einer sauberen Zeile, gibt es dieses Muster nicht - und
    // genau dann laeuft der naechste Lauf. Die drei Proben verloren ihren
    // Gegenstand also immer dann, wenn man sie am dringendsten braucht, und
    // machten `muster` ein zweites Mal rot. Gegriffen wird jetzt der ganze
    // Inhalt, was auch immer darin steht.
    regel: /[\s\S]+/,
    ersatz: '',
    tor: 'muster',
    meldet: 'hat einen Befund hinterlassen',
  },
  {
    // **Die Fundtabelle, eine Ebene unter Abschnitt 6.** Vier ihrer Zeilen
    // trugen einen Rueckstand vor, den es nicht gab - S151 seit v126, S112
    // seit v114, S84 seit S91, und S23 verwies auf ein T13, das in keinem
    // Dokument steht. Ein Rueckstand, der nur hier steht, hat keine
    // Schliessbedingung und faellt niemandem auf.
    name: 'Fundzeile nennt einen Punkt, den es nicht gibt',
    datei: 'docs/Towerfront-BACKLOG.md',
    regel: /^\| S121 \| /m,
    ersatz: '| S121 | Offen als D99. ',
    tor: 'doku',
    meldet: 'steht in keiner "Offen"-Tabelle',
  },
  {
    // Und die Gegenrichtung, ohne die die Probe darueber nichts beweist: ein
    // GUELTIGER Verweis muss durchgehen. Sonst besteht die Pruefung auch ein
    // Tor, das jedes grosse "Offen" in der Fundtabelle meldet - und dann
    // waere die Tabelle als Gedaechtnis unbrauchbar.
    name: 'Fundzeile darf auf einen offenen Punkt verweisen',
    datei: 'docs/Towerfront-BACKLOG.md',
    regel: /^\| S121 \| /m,
    ersatz: '| S121 | Offen als D27. ',
    tor: 'doku',
    meldetNicht: 'Fund S121',
  },
  {
    // **Die Gegenprobe, und ohne sie waeren die beiden darueber wertlos.**
    // Ein Waechter, der jede offene Zeile meldet, besteht sie auch - genau
    // die Falle, die bei "Kachelraster" schon einmal aufgeschrieben ist.
    // Hier wird die Bedingung durch eine andere, ebenso UNerfuellte ersetzt:
    // der Punkt bleibt zu Recht offen, und das Tor muss schweigen.
    // **Zum ZWEITEN Mal an einem Fortschritt gestorben** (v328). Sie griff
    // bis dahin C6 ("Heiler, regeneriert Umstehende") - und C6 ist mit
    // S-N6-02 zugefallen, der Punkt steht nicht mehr im Verzeichnis. Genau
    // dieselbe Verfallsart hatten zwei Proben schon in v313, und die
    // Reparatur damals hiess: an etwas greifen, das der Fortschritt nicht
    // wegnimmt.
    //
    // **Das ist bei einem OFFENEN Punkt nicht moeglich** - jeder offene
    // Punkt soll irgendwann zufallen, das ist sein Zweck. Gegriffen wird
    // deshalb jetzt **C16** (die Flakstellung): sie haengt an einem BILD,
    // das bestellt und nicht geliefert ist, und kann darum nicht nebenbei
    // durch eine Code-Runde zufallen. Wer sie liefert, faengt diese Probe
    // beim naechsten `npm run muster` - und das ist die richtige Stelle,
    // es zu merken.
    name: 'Offener Punkt bleibt zu Recht offen',
    datei: 'docs/Towerfront-BACKLOG.md',
    suche: '`text src/data/towers.ts "Flakstellung" >= 1`',
    ersatz: '`text src/data/towers.ts "Wunderflak" >= 1`',
    tor: 'doku',
    meldetNicht: 'Backlog C16',
  },
  {
    // Neu mit der Hoehe: der Waechter deckelt sie bei 1,25. Ohne Probe waere
    // das eine Grenze, von der niemand weiss, ob sie greift - und eine
    // Grenze, die nicht greift, ist eine Erlaubnis.
    name: 'Turm ins Unmassstaebliche gestreckt',
    datei: 'src/data/towers.ts',
    regel: /export const TURM_HOEHE = [0-9.]+;/,
    ersatz: 'export const TURM_HOEHE = 1.5;',
    tor: 'guards',
  },
  {
    // Der dritte Bruch von Regel 6 - genau der Fehler, den dieses Tor bei
    // seinem ersten Lauf gefunden hat. Er stand sichtbar auf der Landkarte,
    // und dreizehn andere Tore hatten ihn durchgelassen.
    //
    // **Sie hing bis v241 am Startknopf und bewies nichts mehr.** Seit v239
    // sitzt der Knopf IM Bedienband, also traegt ihn `dock.hidden` mit; die
    // eigene Zeile war eine zweite Stelle, die dasselbe sagt (Regel 15), und
    // ihr Ausbau aenderte am Bild nichts. Gemeldet hat es der Nachtlauf zu
    // v238. Sie greift jetzt an der Zeile, die den Knopf WIRKLICH traegt -
    // und trifft damit die ganze untere Bedienung statt nur ihn.
    //
    // Die Probe auf `hud.hidden` daneben ist damit keine Doppelung: die
    // Kopfzeile ist ein anderes Element und haengt am Rauchtest.
    // **Die Zeile traegt seit v303 zwei Gruende** - das Menue und den
    // Kartenzug. Die Probe nimmt beide weg; welchen der zwei das Browsertor
    // meldet, ist ihm gleich, und der zweite hat seine eigene Probe.
    name: 'Bedienband steht im Menue',
    datei: 'src/ui/ui.ts',
    regel: /this\.dock\.hidden = !anzeigen \|\| zugOffen;/,
    ersatz: 'this.dock.hidden = false;',
    tor: 'browsertor',
  },
  {
    // Gross genug ist eine Zusage der Stilvorlage; gemessen wird sie erst
    // im Browser. Deshalb steht diese Probe neben der fuer `beruehrung` und
    // nicht statt ihrer - zwei Wege zur selben Zahl.
    name: 'Knopf im Spiel unter dem Richtwert',
    datei: 'src/style.css',
    regel: /(\.dock-toggle \{\n  pointer-events: auto; cursor: pointer; flex: none;\n  width: )44px; height: 44px;/,
    ersatz: '$130px; height: 30px;',
    tor: 'browsertor',
  },
  {
    // Zugesagt ist nicht erreichbar: `overflow: hidden` am Elternteil
    // schneidet die Auflage weg, und die Stilvorlage sagt weiter 46. Genau
    // so war die erste Fassung von D10 gebaut - `beruehrung` meldete gruen,
    // im Browser waren es 20 Punkte.
    name: 'Trefferflaeche vom Elternteil abgeschnitten',
    datei: 'src/style.css',
    suche: 'gap: 26px 10px; flex-wrap: wrap;',
    ersatz: 'gap: 26px 10px; flex-wrap: wrap; overflow: hidden;',
    tor: 'browsertor',
  },
  {
    // v50, woertlich nachgestellt: die Landkarte nimmt keine Tipper mehr an,
    // und man kommt nicht ins Spiel. Damals waren alle vierzehn Tore gruen.
    name: 'Man kommt nicht mehr ins Spiel',
    datei: 'src/game/menu.ts',
    regel: /const hit = this\.hotspots\.find\(\(h\) => inside\(h, x, y\)\);/,
    ersatz: 'const hit = undefined;',
    tor: 'browsertor',
  },
  {
    // D10: der Gegnername war bis v193 nur ein `title` - auf dem Zielgeraet
    // unerreichbar. Faellt der Tipp aus, steht er wieder nirgends.
    name: 'Gegnerauskunft reagiert nicht auf den Tipp',
    datei: 'src/ui/ui.ts',
    suche: 'if (!auf) this.s.gegnerInfo = id;',
    ersatz: 'void auf;',
    tor: 'smoke',
  },
  {
    // Der Inspektor zeigt EINS. Ohne die Ableitung bleibt die Gegnerauskunft
    // stehen und verdeckt den gewaehlten Turm - sie steht im Block davor.
    name: 'Gegnerauskunft verdeckt den gewaehlten Turm',
    datei: 'src/ui/ui.ts',
    suche: 'if (sel || s.buildChoice || !s.canStartWave) s.gegnerInfo = null;',
    ersatz: 'void 0;',
    tor: 'smoke',
  },
  {
    // C18: die Sperre. Faellt sie weg, steht am Anfang alles bereit - und
    // der Fortschritt zwischen den Karten bedeutet wieder nichts.
    name: 'Faehigkeiten sind von Anfang an alle offen',
    datei: 'src/game/state.ts',
    suche: 'return this.karten >= ABILITIES[id].braucht;',
    ersatz: 'return true;',
    tor: 'smoke',
  },
  {
    // Und die andere Haelfte: gesperrt sein reicht nicht, man muss es sehen.
    // Ein Knopf, der aussieht wie bereit und nichts tut, ist schlimmer als
    // ein gesperrter (S2 des Abgleichs).
    name: 'Gesperrte Faehigkeit sieht aus wie bereit',
    datei: 'src/ui/ui.ts',
    suche: "b.dataset.zu = fehlt > 0 ? '1' : '0';",
    ersatz: "b.dataset.zu = '0';",
    tor: 'smoke',
  },
  {
    // Die Ansage am Ende des Laufs (S5). Ohne sie erfaehrt der Spieler von
    // seiner neuen Faehigkeit erst, wenn er zufaellig hinsieht.
    name: 'Freischaltung wird nicht angesagt',
    datei: 'src/game/state.ts',
    regel: /this\.freischaltung = nachher > this\.karten/,
    ersatz: 'this.freischaltung = false',
    tor: 'smoke',
  },
  {
    // Eine Faehigkeit, die mehr Karten verlangt, als es gibt, waere totes
    // Inventar - und niemand saehe es.
    name: 'Faehigkeit verlangt mehr Karten als es gibt',
    datei: 'src/data/abilities.ts',
    suche: 'gold: 120, braucht: 3,',
    ersatz: 'gold: 120, braucht: 9,',
    tor: 'guards',
  },
  {
    // Die Ziellogik muss WIRKEN, nicht nur einstellbar sein. Hier faellt die
    // Auswertung weg - alle Tuerme nehmen wieder den Vordersten.
    name: 'Ziellogik ohne Wirkung',
    datei: 'src/game/state.ts',
    regel: /const wert = wahl === 'vorn' \? e\.travelled/,
    ersatz: "const wert = true ? e.travelled",
    tor: 'smoke',
  },
  {
    // Und sie muss den Spielstand ueberleben.
    name: 'Ziellogik ueberlebt das Sichern nicht',
    datei: 'src/game/state.ts',
    regel: /ZIELWAHL_ORDNUNG\.indexOf\(t\.zielwahl\),/,
    ersatz: '0,',
    tor: 'smoke',
  },
  {
    // Die Anzeige muss dem Zustand folgen. Ohne die Zielwahl in der Signatur
    // schreibt `sync` nicht ins DOM, und der angetippte Knopf bleibt aus -
    // genau der Fehler, den das Browsertor bei seinem ersten Lauf fand.
    name: 'Anzeige folgt dem Zustand nicht',
    datei: 'src/ui/ui.ts',
    regel: /:\$\{sel\.zielwahl\}` : '-',/,
    ersatz: "` : '-',",
    tor: 'browsertor',
  },
  {
    // Versetzen waehrend der Welle waere keine Korrektur mehr, sondern eine
    // neue Mechanik - jeder Turm haette faktisch die Reichweite des halben
    // Feldes. Die Schranke muss halten.
    name: 'Turm laesst sich mitten in der Welle versetzen',
    datei: 'src/game/state.ts',
    regel: /return !this\.waveActive && this\.phase === 'playing';/,
    ersatz: "return this.phase === 'playing';",
    tor: 'smoke',
  },
  {
    // Der Schild muss Treffer schlucken. Hier faellt das Schlucken weg.
    name: 'Schild schluckt nichts',
    datei: 'src/game/state.ts',
    regel: /if \(e\.shield > 0\) \{\n      e\.shield--;/,
    ersatz: 'if (false) {\n      e.shield--;',
    tor: 'smoke',
  },
  {
    // Und er muss in einem Wellenplan STEHEN. Eine Mechanik, die nirgends
    // vorkommt, ist keine - genau das war sie eine Stunde lang, weil der
    // Eingriff im falschen Plan landete.
    name: 'Schild kommt in keiner Welle vor',
    datei: 'src/data/waves.ts',
    regel: /delay: 0, shield: 2 \},/,
    ersatz: 'delay: 0 },',
    tor: 'smoke',
  },
  {
    // Der Kartensatz muss die Karte nennen. Ohne Namen waere er beliebig.
    name: 'Karteneinfuehrung nennt die Karte nicht',
    datei: 'src/game/tutorial.ts',
    regel: /\$\{s\.map\.name\}: ein Zuweg/,
    ersatz: 'Diese Karte: ein Zuweg',
    tor: 'smoke',
  },
  {
    // Der Traeger muss den Nachbarn Schild geben.
    name: 'Schildtraeger versorgt niemanden',
    datei: 'src/game/state.ts',
    regel: /if \(e\.shield >= t\.traeger\) continue;/,
    ersatz: 'if (true) continue;',
    tor: 'smoke',
  },
  {
    // Und sich selbst NICHT - sonst muss man ihn nicht zuerst nehmen.
    name: 'Schildtraeger versorgt sich selbst',
    datei: 'src/game/state.ts',
    regel: /if \(e === t \|\| e\.dead\) continue;/,
    ersatz: 'if (e.dead) continue;',
    tor: 'smoke',
  },
  {
    // R4 lebt davon, dass das Bollwerk VOLL stoppt. Bremst es nur, ist es
    // ein zweiter Frostschlag - und das Genre-Kriterium meldet zu Recht
    // nichts mehr.
    name: 'Bollwerk bremst nur, statt zu stoppen',
    datei: 'src/data/abilities.ts',
    regel: /slow: 1, slowTime: 3,/,
    ersatz: 'slow: 0.5, slowTime: 3,',
    tor: 'smoke',
  },
  {
    // Die andere Haelfte von R4: es darf NICHT toeten.
    name: 'Bollwerk macht nebenbei Schaden',
    datei: 'src/game/state.ts',
    // Auf die neue Stelle nachgezogen: TF-015 hat `slowLeft` durch die
    // Wirkungsliste ersetzt, und der Musterlauf hat es gemeldet, bevor die
    // Probe stillschweigend nichts mehr bewies.
    regel: /(        e\.wirkungen = wirkungAnlegen\(e\.wirkungen, 'bremse', \(def\.slow \?\? 1\) \* w,\n          def\.slowTime \?\? 3\);)/,
    ersatz: '$1 e.hp -= 1;',
    tor: 'smoke',
  },
  {
    // Der Widerstand der Gegner muss weiter wirken - sonst steht der
    // Leerentitan so lange wie der kleinste Schleicher.
    //
    // Auf die neue Stelle nachgezogen (v331, K1): der Widerstand wird seit
    // S-N6-05 an EINER Stelle gerechnet (`bremswiderstand`), weil das
    // Vorzeichen noch etwas darauflegt - vorher stand `ENEMIES[e.def]
    // .slowResist` an vier Stellen. Der Musterlauf hat es in derselben Runde
    // gemeldet, in der es passierte.
    name: 'Bollwerk ignoriert den Widerstand der Gegner',
    datei: 'src/game/state.ts',
    regel: /const w = 1 - this\.bremswiderstand\(e\);/,
    ersatz: 'const w = 1;',
    tor: 'smoke',
  },
  {
    // Oertlich, nicht ueberall. Sonst waere es der Frostschlag mit Stopp.
    name: 'Bollwerk wirkt auf das ganze Feld',
    datei: 'src/game/state.ts',
    regel: /if \(dist2\(x, y, e\.x, e\.y\) > r2\) continue;/,
    ersatz: 'if (false) continue;',
    tor: 'smoke',
  },
  {
    // C17: die Ernte muss das Gold auch wirklich auszahlen.
    name: 'Ernte zahlt kein Gold aus',
    datei: 'src/game/state.ts',
    regel: /this\.gold \+= def\.gold;/,
    ersatz: 'this.gold += 0;',
    tor: 'smoke',
  },
  {
    // R4 als Genre-Kriterium darf nicht wieder fest verdrahtet werden - in
    // beide Richtungen. Hier: immer gruen.
    name: 'R4 ist wieder fest verdrahtet',
    datei: 'tools/benchmark.ts',
    // Ersetzt wird die GANZE Pruefung durch die feste Form. Ein `return true`
    // mitten im Rumpf faellt dem Waechter naemlich NICHT auf - er liest Text,
    // keine Bedeutung. Das ist keine Luecke, die hier versteckt wird, sondern
    // die Grenze seiner Zusage: er faengt die feste Form ab, und genau die
    // hatten R4 und G5 beide.
    regel: /check: \(\) => ABILITY_ORDER\.some\(\(id\) => \{[\s\S]*?\}\),/,
    ersatz: 'check: () => true,',
    tor: 'guards',
  },
  {
    // Die Umkehrung: der Waechter muss auch anschlagen, wenn ein Kriterium
    // fest auf "nicht erfuellt" steht. Genau so lagen R4 und G5 ueber
    // sechzig Versionen lang.
    name: 'Ein gemessenes Kriterium steht fest auf falsch',
    datei: 'tools/benchmark.ts',
    regel: /check: \(\) => TOWER_ORDER\.length >= 4,/,
    ersatz: 'check: () => false,',
    tor: 'guards',
  },
  {
    // Gold UND Wirkung auf dem Feld waere keine Abwaegung mehr.
    name: 'Ernte bringt Gold und macht Schaden',
    datei: 'src/data/abilities.ts',
    regel: /gold: 120,/,
    ersatz: 'gold: 120, damage: 50,',
    tor: 'guards',
  },
  {
    // Der Kern von D23: ein zusaetzlicher Punktdurchlauf ueber das ganze Feld
    // kostet auf dem Telefon eine Viertelsekunde eingefrorenes Bild - und war
    // bis v111 von keinem Tor zu sehen.
    name: 'Ein zweiter Punktdurchlauf im Kartenbacken',
    datei: 'src/gfx/terrain.ts',
    regel: /    saum\(g, photo !== null\);/,
    ersatz: '    saum(g, photo !== null); g.putImageData(g.getImageData(0, 0, WORLD_W, WORLD_H), 0, 0);',
    tor: 'kartenwechsel',
  },
  {
    // Und die Gegenrichtung: der Zaehler selbst darf nicht blind werden.
    // Ein Haken, der nichts mehr sieht, sieht aus wie ein bestandenes Tor.
    name: 'Der Bildpunktzaehler haengt nicht mehr ein',
    datei: 'tools/kartenwechsel.mjs',
    regel: /    g\.__gezaehlt = true;/,
    ersatz: '    g.__gezaehlt = true; return g;',
    tor: 'kartenwechsel',
  },
  {
    // D25: der Aufbau darf nicht wieder in einem Zug durchlaufen. Die
    // Gesamtsumme bliebe dabei gleich - nur das groesste Haeppchen faellt auf.
    name: 'Kartenaufbau laeuft wieder in einem Zug',
    datei: 'src/gfx/terrain.ts',
    regel: /      \} while \(performance\.now\(\) < bis\);/,
    ersatz: '      } while (true);',
    tor: 'kartenwechsel',
  },
  {
    // D24: was rollt, muss es anzeigen.
    // Der Hinweis muss auch nachziehen, wenn sich die HOEHE aendert -
    // gedrehtes Telefon, gezogenes Fenster. Ohne den Beobachter steht er
    // falsch, bis jemand rollt oder die Liste neu gefuellt wird.
    name: 'Rollhinweis merkt nichts von einer neuen Hoehe',
    datei: 'src/ui/ui.ts',
    regel: /      new ResizeObserver\(\(\) => this\.rollhinweis\(\)\)\.observe\(this\.iStats\);/,
    ersatz: '      void 0;',
    tor: 'browsertor',
  },
  {
    name: 'Rollhinweis der Werteliste abgeschaltet',
    datei: 'src/ui/ui.ts',
    regel: /    this\.iStats\.dataset\.mehr = rest > 1 \? '1' : '0';/,
    ersatz: "    this.iStats.dataset.mehr = '0';",
    tor: 'browsertor',
  },
  {
    // Und die Gegenrichtung: ein Schleier, der immer liegt, ist Deko.
    name: 'Rollhinweis steht auch am Ende noch',
    datei: 'src/ui/ui.ts',
    regel: /    this\.iStats\.dataset\.mehr = rest > 1 \? '1' : '0';/,
    ersatz: "    this.iStats.dataset.mehr = '1';",
    tor: 'browsertor',
  },
  {
    // D20: die Vorschau muss Bilder zeigen, nicht Namen.
    name: 'Wellenvorschau faellt auf Farbtupfer zurueck',
    datei: 'src/ui/ui.ts',
    regel: /    const cv = getEnemyArt\(id, false, karte\);/,
    ersatz: '    const cv = null;',
    tor: 'browsertor',
  },
  {
    // Der Fall, der in v114 durch alle sechzehn Tore kam: der Aufbau ist seit
    // v113 auf viele Bilder verteilt, die Bildabnahme zeichnet aber nur zwei.
    // Ohne den Abschluss zeigt sie den gemalten Ersatzuntergrund - und die
    // Farbzaehlung merkt es nicht, weil Tuerme und Gegner genug Farben
    // mitbringen. Gefunden wurde es durch Hinsehen (Regel 7).
    name: 'Aufnahme faengt vor dem fertigen Kartenaufbau',
    datei: 'tools/shots.mjs',
    regel: /  if \(!r\.menu\) r\.kartenaufbauAbschliessen\(s\);/,
    ersatz: '  if (false) r.kartenaufbauAbschliessen(s);',
    tor: 'bildtor',
  },
  {
    // Die Bildhaelfte der Fertigfrage: wartet die Bildabnahme nicht auf die
    // Dekodierung, zeigt sie die gemalten Ersatzformen.
    name: 'Bildabnahme wartet nicht auf die Bilder',
    datei: 'tools/shots.mjs',
    regel: /  await settle\(\);/,
    ersatz: '  await Promise.resolve();',
    tor: 'bildtor',
  },
  {
    // Die Aufbauhaelfte, gepruefte Seite Rauchtest: bleibt der Kartenaufbau
    // stehen, muss er auffallen - auch nach 2700 Bildern.
    name: 'Kartenaufbau wird nie fertig',
    datei: 'src/gfx/renderer.ts',
    regel: /      if \(this\.terrainArbeit\.schritt\(TERRAIN_BUDGET_MS\)\) \{/,
    ersatz: '      if (false) {',
    tor: 'smoke',
  },
  {
    // Derselbe Fehler, anderes Tor. Eine Probe, die nur die Pruefung
    // entfernt, beweist nichts - es steht ja nichts aus. Sie muss den
    // echten Fehler einbauen und dann fragen, ob DIESES Tor ihn sieht.
    name: 'Zeichenmessung misst den Aufbau mit',
    datei: 'src/gfx/renderer.ts',
    regel: /      if \(this\.terrainArbeit\.schritt\(TERRAIN_BUDGET_MS\)\) \{/,
    ersatz: '      if (false) {',
    tor: 'bench-draw',
  },
  {
    // D17: zwei Zweige duerfen nicht gleich aussehen.
    name: 'Beide Bogenzweige schiessen dieselbe Form',
    datei: 'src/gfx/renderer.ts',
    regel: /  return p\.owner\.branch === 1 \? 'bolzen' : 'pfeil';/,
    ersatz: "  return 'pfeil';",
    tor: 'guards',
  },
  {
    // D27: das Messgeraet darf ungefragt nicht auftauchen - Regel 6
    // sinngemaess. Seit v199 gibt es zwei Quellen (Schalter und Raute); die
    // Probe schaltet beide auf "immer an".
    name: 'Messtafel steht ungefragt im Spiel',
    datei: 'src/main.ts',
    regel: /  const soll = getSettings\(\)\.messung \|\| messungGewuenscht\(\);/,
    ersatz: '  const soll = true;',
    tor: 'browsertor',
  },
  {
    // Und die Gegenrichtung: ein Messgeraet, das nichts misst, ist keines.
    name: 'Messtafel misst nichts',
    datei: 'src/core/messung.ts',
    regel: /      if \(luecke > groessteLuecke\) groessteLuecke = luecke;/,
    ersatz: '      void luecke;',
    tor: 'browsertor',
  },
  {
    // Die Zielunit muss teurer sein als jede Turmlinie - Vorgabe des
    // Nutzers. Hier wird die letzte Stufe verbilligt, bis die Linie unter
    // die Schwelle faellt.
    name: 'Zielunit wird billiger als ein Turm',
    datei: 'src/data/towers.ts',
    regel: /^          \{ cost: 1950, damage: 210, cooldown: 0\.55, pierce: 3 \},$/m,
    ersatz: '          { cost: 195, damage: 210, cooldown: 0.55, pierce: 3 },',
    tor: 'guards',
  },
  {
    // Teurer UND staerker waere keine Entscheidung, sondern die einzige
    // richtige. Hier bekommt die Zielunit die Spitze des besten Turms.
    name: 'Zielunit wird zugleich die staerkste Waffe',
    datei: 'src/data/towers.ts',
    regel: /^          \{ cost: 1950, damage: 210, cooldown: 0\.55, pierce: 3 \},$/m,
    ersatz: '          { cost: 1950, damage: 600, cooldown: 0.55, pierce: 3 },',
    tor: 'guards',
  },
  {
    // Verkaufen hiesse, die Partie zu verkaufen. Der Riegel raus, und der
    // Rauchtest muss es sehen.
    name: 'Zielunit laesst sich verkaufen',
    datei: 'src/game/state.ts',
    regel: /^    if \(t\.def === 'core'\) return;$/m,
    ersatz: '    // Riegel entfernt.',
    tor: 'smoke',
  },
  {
    // Der Ausbau muss WIRKEN. Hier wird der Schadenszuwachs eingeebnet:
    // die Kosten bleiben, die Wirkung nicht.
    //
    // Auf der LETZTEN Stufe, nicht auf der vorletzten. Der erste Anlauf
    // traf Stufe 5, der Rauchtest misst aber Stufe 1 gegen Stufe 6 - der
    // Eingriff kam an und wurde trotzdem nicht gemessen. Eine Probe muss
    // dort ansetzen, wo die Pruefung hinsieht (Regel 3).
    name: 'Ausbau der Zielunit wirkt nicht mehr',
    datei: 'src/data/towers.ts',
    regel: /^          \{ cost: 1950, damage: 210, cooldown: 0\.55, pierce: 3 \},$/m,
    ersatz: '          { cost: 1950, damage: 11, cooldown: 0.55, pierce: 3 },',
    tor: 'smoke',
  },
  {
    // Seit v166 hat der Bogenturm kein Ganzbild mehr. Fragt die Bildpruefung
    // nur danach, meldet sie ihn dauerhaft als fehlend - und die Bildabnahme
    // bricht ab, obwohl im Feld ein vollstaendiger Turm steht.
    name: 'Zweiteiliger Turm gilt als bildlos',
    datei: 'src/gfx/renderer.ts',
    regel: /^      if \(!zweiteilig && !getTowerArt\(id, null, 1, s\.map\.id\)\) fehlt\.push\(`Turmbild \$\{id\}`\);$/m,
    ersatz: '      if (!getTowerArt(id, null, 1, s.map.id)) fehlt.push(`Turmbild ${id}`);',
    tor: 'bildtor',
  },
  {
    // Und dieselbe Frage in der Lesbarkeitsmessung: ohne den Rueckfall auf
    // den Sockel misst sie drei Tuerme statt vier - und was nicht gemessen
    // wird, faellt auch nicht auf.
    name: 'Lesbarkeit misst den Bogenturm nicht mehr',
    datei: 'tools/readability.mjs',
    regel: /^    if \(!buf\) \{\n      for \(let l = level; l >= 1 && !buf; l--\) \{\n.*\n      \}\n      if \(!buf && objectArt\.has\(`sockel_\$\{id\}`\)\).*\n    \}$/m,
    ersatz: '    // Rueckfall auf den Sockel entfernt.',
    tor: 'lesbarkeit',
  },
  {
    // Die Umkehrung von D18, seit v162: ein ruhender Turm steht still.
    // Eingebaut wird die alte Ruhebewegung - zwei Weltpunkte auf und ab -,
    // und das Tor muss sie sehen.
    //
    // **Sie griff bis v241 am SOCKEL allein und bewies damit nichts.** Der
    // Nachtlauf zu v238 hat es gemeldet, und die Ursache ist keine Aenderung
    // am Spiel, sondern ein Denkfehler in der Probe: das Tor misst die
    // Ober- und die Unterkante der Figur. Die Oberkante gehoert der WAFFE,
    // die im zweiteiligen Weg getrennt gezeichnet wird und stehen blieb; die
    // Unterkante liegt am Schatten, der ohnehin nicht mitwandert. Ein
    // Sockel, der sich zwischen beiden bewegt, aendert an keiner der zwei
    // gemessenen Zahlen etwas.
    //
    // Nachgefahren, weil die naheliegende Erklaerung ("der Zweig laeuft gar
    // nicht") gepruft gehoert (Regel 3): mit Ausschlag 40 statt 2 meldet das
    // Tor "Oberkante wandert 11 Bildzeilen". Der Zweig laeuft also, und der
    // Eingriff kommt an - er war nur zu klein fuer die Stelle, an der er
    // sass.
    //
    // Sie greift jetzt an der Verschiebung des GANZEN Turms, und das ist
    // ausserdem die ehrlichere Nachbildung: die Ruhebewegung von v116 bis
    // v161 liess den Turm atmen, nicht seinen Fuss. Gemessen: 4 Bildzeilen,
    // ein Befund.
    name: 'Tuerme atmen wieder',
    datei: 'src/gfx/renderer.ts',
    regel: /^      ctx\.translate\(t\.x, t\.y\);$/m,
    ersatz: '      ctx.translate(t.x, t.y + Math.sin(s.time * 1.9) * 2);',
    tor: 'bildtor',
  },
  {
    // C26: zwei Karten duerfen nicht dasselbe verlangen. Eingebaut wird der
    // ECHTE Fehler - zwei Karten mit demselben Wellenplan -, nicht das
    // Entfernen der Pruefung (S119).
    name: 'Zwei Karten mit demselben Wellenplan',
    datei: 'src/data/maps.ts',
    regel: /  waves: PLAN_ASCHESCHLUCHT,/,
    ersatz: '  waves: PLAN_SPIRALHAIN,',
    tor: 'guards',
  },
  {
    // B1: der Boden muss Feinstruktur tragen. Ohne Korn lagen zwei von drei
    // Karten UNTER dem Band - und niemand hat es gemerkt, weil `grafik`
    // damals kein Tor war.
    name: 'Der Boden verliert seine Feinstruktur',
    datei: 'src/gfx/terrain.ts',
    regel: /const KORN_STAERKE = 4\.0;/,
    ersatz: 'const KORN_STAERKE = 0;',
    tor: 'grafiktor',
  },
  {
    // Und die Gegenrichtung: zu viel Korn ist Rauschen.
    name: 'Der Boden rauscht',
    datei: 'src/gfx/terrain.ts',
    regel: /const KORN_STAERKE = 4\.0;/,
    ersatz: 'const KORN_STAERKE = 9;',
    tor: 'grafiktor',
  },
  {
    // C24: das Tor muss wirklich umlenken, nicht nur dastehen.
    name: 'Das Tor sperrt nicht mehr',
    datei: 'src/game/state.ts',
    regel: /    if \(!t \|\| t\.bahn !== bahn\) return false;/,
    ersatz: '    if (t) return false; if (!t || t.bahn !== bahn) return false;',
    tor: 'smoke',
  },
  {
    // Und es darf nicht dauerhaft sperren - dann waere es eine Bahn weniger.
    name: 'Das Tor bleibt fuer immer zu',
    datei: 'src/data/maps.ts',
    regel: /  tor: \{ bahn: 1, zu: 8, auf: 8 \},/,
    ersatz: '  tor: { bahn: 1, zu: 40, auf: 8 },',
    tor: 'guards',
  },
  {
    // Der Hochkant-Hinweis darf im QUERFORMAT nicht auftauchen - er wuerde
    // das ganze Spiel verdecken. Regel 6 sinngemaess.
    name: 'Hochkant-Hinweis liegt ueber dem Spiel',
    datei: 'src/style.css',
    regel: /@media \(orientation: portrait\) and \(max-width: 900px\) and \(pointer: coarse\) \{/,
    ersatz: '@media all {',
    tor: 'browsertor',
  },
  {
    // Der Gegenfall zur Probe darueber, und der eigentliche Befund S138: ein
    // Deckel, der NUR am Schreibtisch erscheint. Auf dem Telefonfenster ist
    // er unsichtbar - alle sechs alten Pruefungen bleiben gruen. Nur die
    // Schreibtischprobe kann ihn sehen. Genau so ist `.rotate` sechs Runden
    // lang durchgekommen.
    name: 'Ein Deckel, den nur der Schreibtisch sieht',
    datei: 'src/style.css',
    regel: /#quer \{ display: none; \}/,
    ersatz: '#quer { display: none; }\n'
      + '@media (pointer: fine) { #quer { display: flex; position: fixed;'
      + ' inset: 0; z-index: 200; background: #080B18; } }',
    tor: 'browsertor',
  },
  {
    // Traegt die Umrechnung Zeiger -> Welt im Menue ueberhaupt? Wenn Bild und
    // Trefferflaeche verschieden eingepasst werden, trifft man daneben - und
    // zwar an jeder Fenstergroesse anders. Das Nachspielen des Weges auf
    // fremden Seitenverhaeltnissen faellt darauf herein, wenn es sie gibt.
    name: 'Menue wird anders gezeichnet als getroffen',
    datei: 'src/gfx/renderer.ts',
    regel: /const k = Math\.min\(this\.cssW \/ WORLD_W, this\.cssH \/ WORLD_H\);\n    ctx\.save\(\);/,
    ersatz: 'const k = Math.max(this.cssW / WORLD_W, this.cssH / WORLD_H);\n    ctx.save();',
    tor: 'browsertor',
  },
  {
    // Das Symbol ist einmal leer durchgekommen (S136): gueltiges PNG,
    // richtige Masse, kein Bild darin. Hier wird genau das nachgestellt -
    // der Kristall bleibt weg, Grund und Bogen bleiben.
    name: 'Startbildschirm-Symbol ohne Figur',
    datei: 'index.html',
    regel: /rel="apple-touch-icon" href="data:image\/png;base64,[^"]+"/,
    // Ein reiner dunkler Grund, 180x180: dieselbe Form, dieselbe Adresse,
    // nur ohne Kristall. Genau das, was niemandem auffaellt.
    ersatz: 'rel="apple-touch-icon" href="data:image/png;base64,'
      + LEERES_SYMBOL + '"',
    tor: 'browsertor',
  },
  {
    // Ein Startbild, dessen Masse nicht zu seiner Anmeldung passen. iOS
    // uebergeht so eines STILLSCHWEIGEND - kein Fehler, keine Meldung, nur
    // wieder der weisse Blitz. Genau die Sorte Fehler, die ohne Tor jahrelang
    // stehenbleibt, weil niemand etwas vermisst, das er nie gesehen hat.
    name: 'Startbild passt nicht zu seiner Anmeldung',
    datei: 'index.html',
    regel: /\(device-width: 390px\) and \(device-height: 844px\)/,
    ersatz: '(device-width: 391px) and (device-height: 844px)',
    tor: 'browsertor',
  },
  {
    // Ohne Einrasten gilt der Tippunkt wieder woertlich - genau der Zustand,
    // ueber den sich der Nutzer beschwert hat: "an manchen Stellen kann man
    // gar nicht hinbauen, man muss ganz gross reinzoomen".
    name: 'Der Tippunkt gilt wieder woertlich',
    datei: 'src/game/state.ts',
    regel: /    if \(radius <= 0\) return null;/,
    ersatz: '    return null;',
    tor: 'smoke',
  },
  {
    // Ein Bauplatz ohne Begruendung: alles gilt als erlaubt, und die
    // Turmwahl kann nicht mehr sagen, was nicht passt.
    name: 'Bauverbote nennen keinen Grund mehr',
    datei: 'src/game/state.ts',
    regel: /      if \(lane\.schlauchAbstand\(x, y\) < r \+ PATH_CLEARANCE\) return 'Weg';/,
    ersatz: "      if (lane.schlauchAbstand(x, y) < r + PATH_CLEARANCE) return 'Rand';",
    tor: 'smoke',
  },
  {
    // **Die Baukante loest sich von der Bauregel.**
    //
    // Der Pfad, den der Spieler sieht, waechst um zwoelf Weltpunkte, waehrend
    // `warumNicht` unveraendert urteilt. Genau der Zustand, den es bis v202
    // gab, nur groesser: gemessen lagen Bild und Regel damals bis zu 30,8
    // Weltpunkte auseinander, und kein Tor hat es gemerkt - weil keines die
    // beiden je gegeneinander gehalten hat.
    name: 'Die gezeigte Baukante liegt neben der Bauregel',
    datei: 'src/gfx/bauflaeche.ts',
    regel: /  const r = TOWERS\[id\]\.footprint \/ 2 \+ wuchs;/,
    ersatz: '  const r = TOWERS[id].footprint / 2 + wuchs + 12;',
    tor: 'bauflaechetor',
  },
  {
    // **Das Werteraster zieht seine Zeilen wieder auseinander.**
    //
    // Diese Probe gab es in v206 schon einmal, und sie bewies nichts - nicht
    // weil die Regel wirkungslos war, sondern weil die MESSUNG es war: sie
    // verglich die Mitten von Wert und Beschriftung, und die liegen auch in
    // einer 99 Punkte hohen Zeile aufeinander. Gemessen wird jetzt die
    // Zeilenhoehe.
    name: 'Der Pruefsteg zieht seine Wertezeilen auseinander',
    datei: 'src/style.css',
    suche: '  align-content: start;',
    ersatz: '  align-content: stretch;',
    tor: 'browsertor',
  },
  {
    // **Der gezeichnete Weg liegt wieder als helles Papier auf dem Boden.**
    //
    // Genau der Fehler, den die erste gezeichnete Fassung hatte: ein
    // cremefarbenes Band auf hellgruenem Waldboden, 165 Farbschritte vom
    // Grund entfernt - mehr als das Doppelte jeder gemalten Strasse. Mit den
    // alten Palettenfarben steigt der Abstand auf 267,6 gegen erlaubte 40 bis
    // 90.
    //
    // Ohne diese Probe waere das Band eine Zahl, die niemand mehr bewegt:
    // die Palette ist Kartendaten, und ein Tor, das nur den heutigen Stand
    // bestaetigt, faellt still aus, sobald jemand die Farbe anfasst.
    // **Das Determinismus-Tor liest wieder den gespeicherten Fortschritt.**
    //
    // Dann wandert der Nebeneffekt des ersten Laufs in den zweiten: gewinnt
    // er die Karte, schreibt das Spiel einen Stern, und der zweite startet
    // mit anderen Verbesserungen. Gefunden in v217, als die neu gezogene
    // Bahn den Lauf erstmals innerhalb der 240 Sekunden gewinnen liess -
    // vorher endete er nie, also konnte es nie auffallen.
    name: 'Determinismus liest den gespeicherten Fortschritt',
    datei: 'tools/determinism.ts',
    // Der Fall braucht eine Partie, die im Horizont ENDET - sonst wird nichts
    // in den Fortschritt geschrieben und der eingebaute Fehler bleibt
    // folgenlos. Das haengt an der Bahnlaenge, nicht an diesem Werkzeug.
    haengtAn: ['src/data/maps.ts'],
    // Neu angesetzt in v306: der Aufruf traegt jetzt auch `stapel: []`
    // (Regel 4, S-N1-04) und ist zweizeilig geworden. `npm run muster` hat
    // es in derselben Runde gemeldet - genau wofuer es da ist.
    regel: /  s\.reset\(SEED, 'normal', MAPS\[0\]\.id,\n\s*\{ perks: NO_PERKS, karten: MAPS\.length, stapel: \[\] \}\);/,
    ersatz: '  s.reset(SEED);',
    tor: 'determinism',
  },
  {
    // **Die Wellenvorschau wieder auf 58vw.**
    //
    // Bei fuenf Gegnerarten und vier Marken bricht die Zeile dann um, und die
    // Vorschau ist 116 statt 70 Punkte hoch - ein Achtel des Feldes auf dem
    // Telefon. Ohne diese Probe waere die Breite eine Zahl, die niemand mehr
    // bewegt, und der naechste Wellenplan wuerde still zwei Zeilen erzeugen.
    name: 'Wellenvorschau wieder zu schmal',
    datei: 'src/style.css',
    regel: /^  max-width: 72vw;$/m,
    ersatz: '  max-width: 58vw;',
    tor: 'streifentor',
  },
  {
    // **"Gefahr" nimmt wieder den Dicksten statt den Traeger.**
    //
    // Der Modus hiess bis v223 "Voll" und war gemessen der schwaechste von
    // fuenfen - auf allen vier Karten letzter Platz, kein Alleinsieg in der
    // Wellenpruefung. Seit er den Schildtraeger vorzieht, hat er eine
    // Aufgabe, die kein anderer erfuellt. Ohne den Zuschlag ist er wieder
    // eine Wahl ohne Folgen, und der Rauchtest muss das sehen.
    name: 'Gefahr ignoriert den Schildtraeger',
    datei: 'src/game/state.ts',
    regel: /^const GEFAHR_TRAEGER = 800;$/m,
    ersatz: 'const GEFAHR_TRAEGER = 0;',
    tor: 'smoke',
  },
  {
    // Die Wegfarbe des Spiralhains steht seit v234 auf #3F3420 (vorher
    // #5A4B2E) - der Weg laeuft jetzt NACH dem Tonwertabgleich, und die
    // alten Farben waren gegen die Kurve geeicht statt gegen den Boden.
    // **In v326 an den PALETTENNAMEN gehaengt statt an den Farbwert.** Sie
    // griff `#3F3420` - und genau diese Zahl ist in v326 durchgerechnet
    // worden. `npm run muster` hat es in derselben Runde gemeldet, in der es
    // passierte; ohne das haette sie still aufgehoert zu beweisen. Der Name
    // `MOOS` aendert sich beim naechsten Durchrechnen nicht.
    name: 'Gezeichneter Weg wieder cremefarben',
    datei: 'src/data/maps.ts',
    regel: /(const MOOS: MapPalette = \{[^}]*?)path: '#[0-9A-F]{6}', pathEdge: '#[0-9A-F]{6}',/,
    ersatz: "$1path: '#EDE3C8', pathEdge: '#C9A86A',",
    tor: 'wegdeckungtor',
  },
  {
    // **Der Steg spannt wieder ueber die ganze Fensterhoehe.**
    //
    // 748 von 862 Punkten, die untere Haelfte leer - ein Glasstreifen ueber
    // dem halben Bild.
    //
    // **Sie greift seit v247 an der Regel OHNE Block.** Bis dahin galt das
    // Enden am Inhalt nur oberhalb von 480 Punkten Fensterhoehe, also stand
    // die Zeile in einem `@media` und war vier Zeichen eingerueckt. Jetzt
    // gilt sie ueberall; die Probe fuer das flache Geraet steht daneben und
    // trifft den Kompaktblock.
    name: 'Der Pruefsteg spannt ueber die ganze Fensterhoehe',
    datei: 'src/style.css',
    // Die zwei nackten Zahlen sind in v318 zu `--kopf` und `--fuss`
    // geworden - was zweimal dasteht, veraltet einmal (Regel 15), und
    // diese Probe ist die Stelle, an der es aufgefallen waere.
    regel: /^  max-height: calc\(100% - var\(--kopf\) - var\(--sat\) - var\(--fuss\) - var\(--sab\)\);$/m,
    ersatz: '  bottom: calc(58px + var(--sab));',
    tor: 'browsertor',
  },
  {
    // **Die Rolle nimmt sich wieder den Platz des Namens.**
    //
    // Aus "Bogenturm" wurde "Bo…", waehrend "DAUERFEUER" daneben in voller
    // Laenge stand. Die Pruefung auf ueberlaufenden Text sieht das NICHT -
    // sie ueberspringt, was sich selbst abschneidet.
    name: 'Der Turmname wird von der Rolle verdraengt',
    datei: 'src/style.css',
    suche: '  flex: 0 100 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;',
    ersatz: '  flex: 0 0 auto;',
    tor: 'browsertor',
  },
  {
    // **Ein Werkzeug rechnet die Anzeigegroesse wieder selbst.**
    //
    // Dieselbe Falle wie beim Chromium-Pfad, nur stiller: zwei Fassungen
    // derselben Umrechnung, beide heissen "Dichte", und sie liegen um den
    // Faktor 2 bis 3 auseinander. Bis v204 war das der Zustand - die
    // Kandidatenpruefung nahm ab, was das Grafiktor hinterher ablehnte.
    name: 'Werkzeug rechnet die Anzeigegroesse selbst',
    datei: 'tools/artaudit.mjs',
    regel: /  return messen\(await sharp\(buf\)\.ensureAlpha\(\)\.resize\(anzeigePunkte\(weltbreite\)\)\.png\(\)\.toBuffer\(\)\);/,
    ersatz: '  const ANZEIGE_MASSSTAB = 0.8;\n'
      + '  return messen(await sharp(buf).ensureAlpha()'
      + '.resize(Math.round(weltbreite * ANZEIGE_MASSSTAB)).png().toBuffer());',
    tor: 'guards',
  },
  {
    // **Die Knoepfe antworten dem Zeiger nicht mehr.**
    //
    // Der Zustand bis v203, und er hat dreissig Tore ueberlebt: alle messen,
    // ob ein Knopf da ist, gross genug und erreichbar - keines, ob er
    // ANTWORTET. Gemeldet hat es der Nutzer vom Schreibtisch aus.
    name: 'Knoepfe ohne Rueckmeldung fuer den Zeiger',
    datei: 'src/style.css',
    suche: '@media (hover: hover) and (pointer: fine) {',
    ersatz: '@media (hover: none) and (pointer: coarse) {',
    tor: 'browsertor',
  },
  {
    // Und die Landkarte: sie ist gezeichnet, bekommt also kein `:hover`
    // geschenkt und muss selbst antworten.
    name: 'Landkarte macht den Zeiger nicht zur Hand',
    datei: 'src/core/input.ts',
    regel: /      canvas\.style\.cursor = hit \? 'pointer' : '';/,
    ersatz: "      canvas.style.cursor = '';",
    tor: 'browsertor',
  },
  {
    // Die Gegenrichtung, und sie ist die eigentliche Aussage: eine Hand
    // UEBERALL sagt nichts. Ohne diese Probe waere die Pruefung darueber mit
    // einer Zeile zu erschleichen.
    name: 'Landkarte zeigt ueberall die Hand',
    datei: 'src/core/input.ts',
    regel: /      canvas\.style\.cursor = hit \? 'pointer' : '';/,
    ersatz: "      canvas.style.cursor = 'pointer';",
    tor: 'browsertor',
  },
  {
    // **Die letzte Welle wird schwaecher als die staerkste.**
    //
    // Gemessen bringt das Finale des Spiralhains 76 % der Spitze - schon
    // heute liegt der Hoehepunkt in der Mitte, und die Ratsche haelt bei
    // 74 %. Faellt der Titan aus der letzten Welle, sind es rund 30, und der
    // Lauf endet mit einer Enttaeuschung. Bis v239 hat das kein Tor gesehen.
    name: 'Finale schwaecher als die Spitze',
    datei: 'src/data/waves.ts',
    regel: /    \{ enemy: 'titan', count: 1, gap: 9, delay: 0 \},\n    \{ enemy: 'brute', count: 2, gap: 1\.6, delay: 4 \},/,
    ersatz: "    { enemy: 'brute', count: 1, gap: 1.6, delay: 4 },",
    tor: 'guards',
  },
  {
    // **Eine Welle in der Mitte bricht ein.**
    //
    // Ein zusaetzlicher Rueckfall ueber die Ratsche hinaus: der Spiralhain
    // hat drei, erlaubt sind drei. Wellen NACH einem Boss zaehlen nicht mit -
    // nach einem Titanen darf es leichter werden -, deshalb greift die Probe
    // eine Welle ohne Boss davor.
    name: 'Druckkurve bekommt einen Einbruch',
    datei: 'src/data/waves.ts',
    regel: /  \{ bonus: 211, note: 'Erste Gleiter', groups: \[\n    \{ enemy: 'crawler', count: 29/,
    ersatz: "  { bonus: 211, note: 'Erste Gleiter', groups: [\n    { enemy: 'crawler', count: 4",
    tor: 'guards',
  },
  {
    // **Die Typoskala bekommt eine sechste Stufe.**
    //
    // Gemessen standen im Ruhezustand elf Groessen nebeneinander, von denen
    // vier dasselbe meinten. Eine einzige Ausnahme reicht, damit es wieder
    // losgeht - genau so sind die elf entstanden: jede Zeile einzeln
    // gesetzt, und niemand hat je alle nebeneinander gelegt.
    name: 'Typoskala bekommt eine sechste Stufe',
    datei: 'src/style.css',
    regel: /\.pick-name \{ font-size: var\(--s-text\); font-weight: 600; \}/,
    ersatz: '.pick-name { font-size: 11.5px; font-weight: 600; }',
    tor: 'uxtor',
  },
  {
    // **Die Turmleiste wird wieder breit.**
    //
    // Dann passen die acht Knoepfe nicht mehr in eine Reihe, das Band waechst
    // von 96 auf rund 146 Punkte, und die Bedienung sperrt wieder mehr vom
    // Feld. Genau der Zustand vor v239, in dem die Turmleiste zwei von vier
    // Gegnern auf dem linken Bahnarm verdeckte.
    //
    // **Sie griff bis v241 an der GRUNDREGEL, und die gilt auf dem
    // Zielgeraet gar nicht.** `.tower-btn { min-width: 54px }` wird auf
    // 844 x 390 von `@media (max-height: 480px)` ueberschrieben; die Probe
    // setzte 200 Punkte an einer Stelle, die das Bild nicht erreicht
    // (Regel 3). Sie greift jetzt an der Regel des flachen Geraets - der
    // einzigen, die dort urteilt.
    //
    // Der Umbau hat dabei eine Doppelung in der Stilvorlage gefunden: es gab
    // ZWEI `@media (max-height: 480px)`-Bloecke, und beide setzten
    // `.tower-btn`. Die zweite Fassung gewann, also war `padding: 3px 5px 2px`
    // geschrieben und wirkungslos (Regel 15). Sie ist weg.
    // **Nachgezogen in v294**: die Zeile stand auf 50 Punkten, seit v294
    // steht sie auf 46 - sechs Bauwerke statt vier, und die
    // Beruehrungsgrenze liegt bei 44. Die Probe hat es selbst gemeldet
    // ("Muster FEHLT"), bevor sie still ins Leere gezeigt haette.
    name: 'Turmleiste sprengt das Band',
    datei: 'src/style.css',
    regel: /  \.tower-btn \{ min-width: 46px; padding: 3px 3px 2px; \}/,
    ersatz: '  .tower-btn { min-width: 200px; padding: 3px 3px 2px; }',
    tor: 'uxtor',
  },
  {
    // **Der Turmname steht wieder auf dem Leistenknopf.**
    //
    // Dann fuehren Leiste und Turmwahl dieselbe Liste, verschieden gesetzt -
    // Regel 15 als Bedienoberflaeche. Bis v238 standen so vier Turmnamen und
    // "Welle 1 starten" doppelt im Bild.
    name: 'Turmname steht doppelt im Bild',
    datei: 'src/ui/ui.ts',
    regel: /        `<span class="t-bild"><\/span>` \+/,
    ersatz: '        `<span class="t-bild"></span><span class="n">${def.name}</span>` +',
    tor: 'uxtor',
  },
  {
    // **Ein Knopf faellt unter den Richtwert.**
    //
    // Der Einklappknopf ist der, an dem es v198 schon einmal passiert ist:
    // 34 statt 44 Punkte, und das Beruehrungstor sagte selbst, dass es ihn
    // nicht misst. Hier wird die TREFFERFLAECHE gemessen, nicht der Kasten -
    // eine vergroesserte Flaeche ueber `::after` gilt also weiter.
    name: 'Einklappknopf faellt unter den Richtwert',
    datei: 'src/style.css',
    regel: /  width: 44px; height: 44px; border-radius: 10px;/,
    ersatz: '  width: 44px; height: 18px; border-radius: 10px;',
    tor: 'uxtor',
  },
  {
    // **Die Zweigwahl verliert ihre Auskunft.**
    //
    // Die Wahl ist endgueltig, und auf dem Zielgeraet steht der erklaerende
    // Satz nicht (`.br-b` traegt dort `display: none`). Ohne die Zahlen
    // waehlt man zwischen zwei Namen.
    name: 'Zweigwahl sagt nicht, was sie aendert',
    datei: 'src/ui/ui.ts',
    regel: /          `<span class="br-w">\$\{wirkung\[i\] \?\? ''\}<\/span>` \+/,
    ersatz: "          `<span class=\"br-w\"></span>` +",
    tor: 'browsertor',
  },
  {
    // **Beide Zweige sagen dasselbe.**
    //
    // Genau der Fehler der ersten Fassung: sie nahm je Zweig das Merkmal,
    // das sich am staerksten gegenueber HEUTE aendert, statt das, in dem
    // sich die zwei Zweige voneinander unterscheiden - und schrieb damit
    // bei vier von acht Zweigen "Durchschlag neu" auf beide Karten. Eine
    // Auskunft, die auf beiden Seiten gleich lautet, unterscheidet nichts.
    name: 'Beide Ausbauzweige sagen dasselbe',
    datei: 'src/game/turmwerte.ts',
    regel: /  return \[0, 1\]\.map\(\(i\) => \{/,
    ersatz: '  return [0, 0].map((i) => {',
    tor: 'browsertor',
    meldet: 'sagen dasselbe',
  },
  // **Gestrichen in v334: "Pruefsteg spannt ueber die ganze Hoehe".**
  //
  // Sie schob `bottom: calc(54px + var(--sab))` in den Kompaktblock zurueck
  // und erwartete, dass `uxtor` den gewachsenen Steg meldet. Gemessen aendert
  // der Eingriff heute NICHTS: Belegung 27,0 % / bemalt 30,2 % mit ihm wie
  // ohne ihn, Punkt fuer Punkt.
  //
  // Der Grund ist v316. Seit der Steg am TURM steht, setzt `turmRing` seine
  // Lage als Stilangabe am Element selbst, und die schlaegt jede Regel im
  // Blatt; die Hoehe kommt seitdem vom Inhalt und von `max-height`. Der
  // Schaden, gegen den die Zeile stand - ein Glasstreifen ueber 87 % des
  // Bildes (v205) -, ist damit strukturell weg, nicht nur ungemessen.
  //
  // Was die Flaeche des Stegs heute haelt, ist die Belegungsratsche des
  // UX-Tors (`pruefsteg` hoechstens 28 %). Sie ist die bessere Zusage: sie
  // misst, wieviel Bild die Bedienung nimmt, statt einer einzelnen Zeile im
  // Stilblatt zu folgen, die morgen woanders steht.
  {
    // **Das Turmbild im Kopf des Menues faellt weg.**
    //
    // Das Menue steht am rechten Rand, der gemeinte Turm irgendwo auf dem
    // Feld - ohne Bild muss die Zuordnung der Spieler leisten. Genau das ist
    // E3 des Bedienungs-Abgleichs.
    name: 'Turmmenue zeigt den Turm nicht',
    datei: 'src/ui/ui.ts',
    regel: /      const symbol = turmSymbol\(sel\.def, s\.map\.id\);/,
    ersatz: '      const symbol = null;',
    tor: 'browsertor',
  },
  {
    // **Der Bestleistungs-Bot wird so schwach, dass eine Karte unerreichbar
    // wird.**
    //
    // Zwei Tuerme reichen auf keiner Karte. Dann muss die Erreichbarkeits-
    // pruefung anschlagen - sie ist die einzige, die sagt, ob ein Ziel
    // ueberhaupt eines ist.
    name: 'Sterne sind nicht mehr erreichbar',
    datei: 'tools/sim.ts',
    // **Mit dem Foerderer umgezogen (v285).** Die Zeile traegt seitdem ein
    // Feld mehr; die Regel greift jetzt an dem Teil, der sie ausmacht, und
    // nicht an ihrer ganzen Laenge.
    regel: /(name: 'Bestleistung', foerderer: \d+, )maxTowers: 24, maxLevel: MAX_LEVEL,/,
    ersatz: '$1maxTowers: 2, maxLevel: 1,',
    tor: 'sim',
    meldet: 'unerreichbar',
  },
  // **"Bescheidener Aufbau holt ueberall drei Sterne" ist in v314 entfallen**
  // (S-N1-05, K1). Sie drehte an der Sternschwelle in `perks.ts` und
  // verlangte, dass `sim` "dann ist der dritte wertlos" meldet. Beides gibt
  // es nicht mehr: keine Schwelle, keine Wertung, und der Block in `sim`, den
  // sie hielt, ist mit ihr gegangen.
  //
  // **Ersatzlos, aber nicht ungeprueft:** was der Block fragte - holt schon
  // ein bescheidener Aufbau ueberall das Beste -, steht weiter in `sim`, und
  // zwar zweimal: "Spielstil X gewinnt ohne einen einzigen Verlust" und die
  // Pruefung, dass nicht ALLE Stile verlustfrei durchkommen. Beide haben ihre
  // eigenen Gegenproben.
  {
    // **Die Turmwahl verschweigt, was der Turm HIER bekaeme.**
    //
    // Der Verbund folgt aus der LAGE, und die waehlt man in genau dem
    // Augenblick, in dem diese Karte offen steht. Ihn erst am gebauten Turm
    // zu zeigen hiesse, die Auskunft nach der Entscheidung zu geben - dann
    // ist sie eine Bestaetigung und keine Grundlage.
    name: 'Turmwahl verschweigt den Verbund',
    datei: 'src/ui/ui.ts',
    regel: /        const verbund = grund === null && nachbarn > 0/,
    ersatz: '        const verbund = grund === null && nachbarn > 99',
    tor: 'smoke',
  },
  {
    // **Die Mittelung faellt auf eine Aussaat zurueck.**
    //
    // Genau der Zustand bis v250: `SEEDS = [20260807]`, eine Zahl, und jede
    // Balancezahl des Projekts haengt daran. Der Ausgabe sieht man es nicht
    // an - sie meldet Mittelwerte, gleich wieviele Laeufe dahinterstehen.
    // Deshalb zaehlt `play` die gefahrenen Aussaaten mit, und der Abgleich am
    // Ende meldet die fehlenden.
    name: 'Mittelung faellt auf eine Aussaat zurueck',
    datei: 'tools/sim.ts',
    regel: /  for \(const aussaat of AUSSAATEN\) \{/,
    ersatz: '  for (const aussaat of AUSSAATEN.slice(0, 1)) {',
    tor: 'sim',
    meldet: 'Eine Mittelung ueber eine Aussaat ist keine',
  },
  {
    // **Die Zweigtabelle mittelt wieder nicht.**
    //
    // Sie war bis v250 die EINZIGE Kennzahl dieser Datei ohne Mittelung, und
    // auf ihr stand der einzige Teilerfolg von G2 im Spielspass-Audit -
    // "18 % beim Moerser", eine Zahl aus einer Aussaat. Ueber drei gemessen
    // ist jedes der vier Zweigpaare UNBELEGT.
    //
    // **Die Probe zaehlt je Funktion, und das ist der Punkt.** Ihr erster
    // Entwurf schnitt dieselbe Schleife zurueck, aber der Selbsttest sammelte
    // die Aussaaten im ganzen Lauf: `overVariants` fuhr weiterhin alle drei,
    // die Menge war vollstaendig, und das Tor schwieg. Der Eingriff kam an
    // und loeste nichts aus (Regel 3).
    name: 'Zweigtabelle mittelt nicht mehr',
    datei: 'tools/sim.ts',
    regel: /  const runs = AUSSAATEN\.map\(\(a\) => \{ aussaatGezaehlt\('ueberAussaaten', a\); return run\(a\); \}\);/,
    ersatz: "  const runs = AUSSAATEN.slice(0, 1).map((a) => { aussaatGezaehlt('ueberAussaaten', a); return run(a); });",
    tor: 'sim',
    meldet: 'Eine Mittelung ueber eine Aussaat ist keine',
  },
  {
    // **Ein Prompt geht ohne Stil-Block heraus.**
    //
    // `npm run bildprompt` steht nicht in der Torkette - es wird genau an dem
    // Tag gebraucht, an dem eine Bestellung herausgeht. Faellt der Stil-Block
    // aus, bekommt der Bild-Agent acht Auftraege ohne Stil, und niemand sagt
    // es: das Werkzeug gibt seinen Text ja aus. Dieselbe Klasse wie
    // `kartenprobe` in v229 - ein Werkzeug, dessen Eingang niemand prueft,
    // ist im Ernstfall kaputt.
    name: 'Prompt geht ohne Stil-Block heraus',
    datei: 'tools/auftrag.ts',
    regel: /  let fertig = prompt\.split\(PLATZHALTER\)\.join\(stil\);/,
    ersatz: '  let fertig = prompt;',
    tor: 'guards',
  },
  {
    // **Ein Dokument ohne Standangabe wird wieder uebersehen.**
    //
    // Das war die Luecke, durch die der Genre-Abgleich 213 Fassungen lang
    // "27 von 30" behaupten konnte, waehrend das Werkzeug im selben Baum
    // 30 von 30 mass: seine Zeile begann mit "Messung: v" statt "Stand: v",
    // und wer die erwartete Form nicht traf, wurde gar nicht geprueft.
    // Dreizehn von vierundzwanzig Dokumenten standen so draussen.
    name: 'Dokument ohne Standangabe faellt durch das Netz',
    datei: 'docs/Towerfront-BENCHMARK.md',
    regel: /^Stand: v\d+ · /m,
    ersatz: 'Messung: v35 · ',
    tor: 'doku',
    meldet: 'weder "Stand: vNN" noch "Aufgezeichnet: vNN"',
  },
  {
    // **Und die Gegenrichtung, ohne die die Probe darueber nichts beweist:**
    // ein PROTOKOLL darf schweigen. Sonst besteht die Pruefung auch ein Tor,
    // das jedes Dokument zum Nachziehen zwingt - und dann waeren die zwoelf
    // Protokolle des Verzeichnisses entweder gefaelscht oder rot.
    name: 'Protokoll darf ohne Fassung stehenbleiben',
    datei: 'docs/Towerfront-MASTERPLAN.md',
    regel: /^Aufgezeichnet: v141 /m,
    ersatz: 'Aufgezeichnet: 23.08.2026 ',
    tor: 'doku',
    meldetNicht: 'weder "Stand: vNN"',
  },
  {
    // **Ein Befehl mit Ziffer im Namen wird wieder uebersehen.**
    //
    // Das Muster des Doku-Waechters war bis v244 `[a-z-]+`; `npm run c18`
    // las es als `npm run c`. Dieselbe Klasse wie die Zahlwort-Tabelle in
    // v230: eine Pruefung, deren Zeichenvorrat hinter ihrem Gegenstand
    // zurueckbleibt, sieht aus wie eine Pruefung.
    //
    // Der Eingriff nimmt die Ziffern wieder heraus. Dann meldet der Waechter
    // "npm run c gibt es nicht" - also einen Fehler, aber den falschen; er
    // wird trotzdem rot, und genau das ist hier zu zeigen. Waere er das
    // nicht, koennte man jeden Befehl mit Ziffer nennen, ohne dass ihn
    // jemand prueft.
    name: 'Doku-Waechter sieht keine Ziffern in Befehlen',
    datei: 'tools/docs.mjs',
    regel: /\/`npm run \(\[a-z0-9-\]\+\)`\|npm run \(\[a-z0-9-\]\+\)\/g/,
    ersatz: '/`npm run ([a-z-]+)`|npm run ([a-z-]+)/g',
    tor: 'doku',
    meldet: 'den Befehl gibt es nicht',
  },
  {
    // **Die Monokultur wird wieder die staerkste Aufstellung.**
    //
    // Ohne den Aurendeckel trifft die Aura jeden im Umkreis voll, ihre
    // Wirkung waechst also mit der Pulkgroesse - und genau die bringen die
    // schweren Wellen. Gemessen: "nur Frost" steigt von 11 auf 50 von 60
    // Kristall und schlaegt damit das gemischte Feld (43).
    name: 'Aurendeckel ausgebaut',
    datei: 'src/game/state.ts',
    regel: /        const teiler = targets\.length > AUREN_DECKEL \? AUREN_DECKEL \/ targets\.length : 1;/,
    ersatz: '        const teiler = 1;',
    tor: 'sim',
  },
  {
    // **Der Verbund gibt nichts mehr.**
    //
    // Dann faellt das gemischte Feld von 43 auf 39, und die C18-Eroeffnung
    // - die Karte mit einer Faehigkeit und ohne Verbesserungen - verliert in
    // Welle 14. Das ist die Zahl, an der die Sperre der Eroeffnung haengt.
    name: 'Verbund wirkt nicht mehr',
    datei: 'src/game/verbund.ts',
    regel: /export const VERBUND_STUFE = 0\.20;/,
    ersatz: 'export const VERBUND_STUFE = 0;',
    tor: 'smoke',
  },
  {
    // **Der Verbund wird zur zweiten Kasse.**
    //
    // Bei +25 % je Art und drei Arten sind es +75 % Schaden allein aus der
    // Lage - mehr als eine ganze Ausbaustufe, und die kostet Gold. Der
    // Waechter zieht die Grenze bei 75 %.
    name: 'Verbund schlaegt eine Ausbaustufe',
    datei: 'src/game/verbund.ts',
    regel: /export const VERBUND_STUFE = 0\.20;/,
    ersatz: 'export const VERBUND_STUFE = 0.30;',
    tor: 'guards',
  },
  {
    // **Der Verbund wird unerreichbar.**
    //
    // Zwei Tuerme koennen nicht dichter als 111 Weltpunkte stehen -
    // `canPlace` verlangt den halben Platzbedarf beider. Ein Umkreis von 80
    // waere ein Zuschlag, den niemand je bekommt, und eine Wirkung, die nie
    // eintritt, ist keine (Regel 5).
    name: 'Verbund wird unerreichbar eng',
    datei: 'src/game/verbund.ts',
    regel: /export const VERBUND_UMKREIS = 260;/,
    ersatz: 'export const VERBUND_UMKREIS = 80;',
    tor: 'guards',
  },
  {
    // **Der Pruefsteg verschweigt den Verbund.**
    //
    // Ein Zuschlag, den man nicht sieht, ist keine Entscheidung, sondern
    // eine Ueberraschung - genau der Befund, an dem der Fruehstart bis v242
    // haengengeblieben ist. Die Zeile steht auch dann da, wenn es keinen
    // Verbund gibt: wer allein baut, soll sehen, dass ihm etwas entgeht.
    name: 'Verbund steht nicht im Pruefsteg',
    datei: 'src/game/turmwerte.ts',
    regel: /    feld: null, name: 'Verbund',/,
    ersatz: "    feld: null, name: 'Erledigt',",
    tor: 'smoke',
  },
  {
    // **Der Fruehstart-Bonus wird auf dem Zielgeraet wieder unsichtbar.**
    //
    // Das ist die Regression, die es bis v242 wirklich gab: der Bonus stand
    // als zweite Zeile unter dem Wellenknopf und trug im Kompaktblock
    // `display: none`, weil unter 480 Punkten Hoehe keine zweite Zeile
    // hineinpasst. Die Mechanik war damit auf dem iPhone quer nicht
    // vorhanden, und kein Tor sagte ein Wort.
    name: 'Fruehstart verschwindet vom Zielgeraet',
    datei: 'src/style.css',
    regel: /  display: inline-block; min-width: 2\.4em; text-align: right;/,
    ersatz: '  display: none; min-width: 2.4em; text-align: right;',
    tor: 'browsertor',
  },
  {
    // **Der Platz der Zahl wird nicht mehr freigehalten.**
    //
    // Dann springt der Wellenknopf um seine Breite, sobald das Fenster
    // zufaellt - und die Turmreihe daneben rueckt mit. Ein Knopf, der unter
    // dem Daumen wandert, ist genau dann woanders, wenn man ihn treffen
    // will. Gemessen sind 36 Punkte Sprung.
    name: 'Wellenknopf springt beim Ablauf des Fensters',
    datei: 'src/style.css',
    regel: /  display: inline-block; min-width: 2\.4em; text-align: right;/,
    ersatz: '  display: inline-block; min-width: 0; text-align: right;',
    tor: 'browsertor',
  },
  {
    // **Der Bonus faellt nicht mehr.**
    //
    // Eine Zahl, die immer gleich bleibt, ist keine Entscheidung - und die
    // Fuellung im Knopf zeigte dann ein Fenster an, das es nicht gibt. Der
    // Rauchtest misst beide Haelften an derselben Stelle: Gold UND Anteil.
    name: 'Fruehstart-Bonus faellt nicht mehr',
    datei: 'src/game/state.ts',
    // **In v267 nachgezogen**: der Bonus haengt seitdem auch an der Lage,
    // die Zeile ist also eine andere. Der Eingriff bleibt derselbe - der
    // Anteil wird herausgenommen, die Zahl steht fest.
    regel: /    const gold = Math\.round\(anteil \* EARLY_BONUS_MAX \* \(1 \+ EARLY_RISIKO_HUB \* risiko\)\);/,
    ersatz: '    const gold = Math.round(EARLY_BONUS_MAX * (1 + EARLY_RISIKO_HUB * risiko));',
    tor: 'smoke',
  },
  {
    // **Die Vorwahl faellt weg.**
    //
    // Dann steht die baubare Flaeche erst da, wenn der Spieler von selbst
    // darauf kommt, in der Leiste zu tippen - genau der Zustand, den der
    // Nutzer als "man sieht nicht gut, wo man etwas hinbauen kann" gemeldet
    // hat.
    name: 'Keine Turmsorte ist vorgewaehlt',
    datei: 'src/game/state.ts',
    regel: /    this\.buildChoice = guenstigsterTurm\(\);/,
    ersatz: '    this.buildChoice = null;',
    tor: 'smoke',
  },
  {
    // **Die Vorkauf-Karte haengt wieder an der blossen Vorwahl.**
    //
    // Dann steht sie von der ersten Sekunde an im Bild und sperrt gemessen
    // 39,5 % des Bildschirms statt 17,6 %. Beim ersten Anlauf zu v238 ist
    // genau das passiert, und keine der einunddreissig Pruefungen hat es
    // gesagt - gefunden hat es die Messung, die fuer das Audit gebaut wurde.
    name: 'Vorkauf-Karte oeffnet ungefragt',
    datei: 'src/ui/ui.ts',
    regel: /if \(!sel && s\.buildChoice && s\.bauwahlErklaeren\) \{/,
    ersatz: 'if (!sel && s.buildChoice) {',
    tor: 'smoke',
  },
  {
    // **Die Kante faellt weg.**
    //
    // Uebrig bliebe eine gleichmaessig getoente Flaeche ohne Rand - genau die
    // Fassung aus v203, die die Frage nicht beantwortet hat.
    name: 'Die Baukante hat keinen Saum mehr',
    datei: 'src/gfx/bauflaeche.ts',
    regel: /export const KANTE = \{ band: 0\.40, breite: 7 \};/,
    ersatz: 'export const KANTE = { band: 0, breite: 7 };',
    tor: 'bildtor',
  },
  {
    // **Die Kante bekommt wieder ein Relief.**
    //
    // Der Befund aus v206: hell neben dunkel liest das Auge als gemauerte
    // Kante. Gemeldet als "eine komische Mauer, die durch den Weg geht".
    name: 'Die Baukante bekommt wieder ein Relief',
    datei: 'src/gfx/bauflaeche.ts',
    // Der dunkle Zug muss NEBEN den hellen, nicht unter ihn: unter ihm waere
    // er verdeckt und die Probe bewiese nichts. Genau das ist ihr im vollen
    // Lauf zu v207 passiert.
    regel: /    q\.globalAlpha = FUELLUNG;\n    q\.drawImage\(maske, 0, 0\);/,
    ersatz: '    q.globalAlpha = FUELLUNG;\n    q.drawImage(maske, 0, 0);\n'
      + '    q.globalAlpha = 0.5;\n'
      + "    q.drawImage(ohne(versetzt('source-over'), maske), 0, 0);",
    tor: 'bildtor',
  },
  {
    // Die Gegenrichtung, und sie ist der Befund aus v203: eine Toenung, die
    // zum Vorhang wird. Auf dem Telefon faellt sie nicht auf, am
    // Schreibtisch liegt sie ueber zwei Dritteln der Welt.
    name: 'Die Baukante wird wieder zum Vorhang',
    datei: 'src/gfx/bauflaeche.ts',
    regel: /export const FUELLUNG = 0\.20;/,
    ersatz: 'export const FUELLUNG = 0.38;',
    tor: 'bildtor',
  },
  {
    // **Die Ablage der Baukante leert nicht mehr.**
    //
    // Der fertige Pfad wird zwischengespeichert; verworfen wird er, wenn sich
    // der Turmbestand aendert. Faellt das weg, sieht das Bild richtig aus -
    // nur eben eine Runde zu alt. Genau die Sorte Fehler, die kein Blick auf
    // ein Standbild findet.
    name: 'Die Baukante zeigt einen alten Turmstand',
    datei: 'src/gfx/bauflaeche.ts',
    regel: /  if \(letzterTurmstand !== s\.towersVersion\) \{/,
    ersatz: '  if (false) {',
    tor: 'bauflaechetor',
  },
  {
    // **Die Baukante wird gar nicht mehr gezeichnet.**
    //
    // Eine Kante, die stimmt, aber unsichtbar ist, hilft niemandem - und das
    // Bauflaechentor wuerde sie weiter bezeugen, denn es vergleicht zwei
    // Rechnungen und sieht das Bild nie. Die Bildabnahme sieht es.
    name: 'Die Baukante wird nicht mehr gezeigt',
    datei: 'src/gfx/renderer.ts',
    regel: /    const wahl = s\.movingTower \? s\.movingTower\.def : s\.buildChoice;/,
    ersatz: '    const wahl = null as TowerId | null;',
    tor: 'bildtor',
  },
  {
    // **Das Zeichenwerk malt seine eigene Flaeche.**
    //
    // Der Rauchtest sieht im Quelltext nach, ob die gezeigte Kante aus
    // `bauflaeche.ts` kommt. Tut sie es nicht, zeigt das Bild etwas anderes
    // an, als die Bauregel sagt - genau der Zustand bis v202, nur diesmal
    // ohne Ausrede.
    name: 'Die Baukante kommt nicht mehr aus der Bauregel',
    datei: 'src/gfx/renderer.ts',
    regel: /    ctx\.drawImage\(bauflaechenBild\(s, wahl, ausser\), 0, 0, WORLD_W, WORLD_H\);/,
    ersatz: '    ctx.fillRect(0, 0, WORLD_W, WORLD_H);',
    tor: 'smoke',
  },
  {
    // Und die andere Haelfte derselben Pruefung: die Bauregel ein zweites
    // Mal im Zeichenwerk. Zwei Fassungen einer Regel sind eine zu viel -
    // gepflegt wird die eine, gezeigt die andere (Regel 15).
    name: 'Die Bauregel wird im Zeichenwerk nachgebaut',
    datei: 'src/gfx/renderer.ts',
    regel: /    const ausser = s\.movingTower;/,
    ersatz: '    const ausser = s.movingTower; // hier stand mal halfNear',
    tor: 'smoke',
  },
  {
    // Ohne Farbklima laufen Zielturm und Tor der Leere wieder mit ihrer
    // eigenen Farbwelt ueber die Karte - der Zustand, den der Nutzer
    // beanstandet hat.
    //
    // **Diese Probe stand bis v166 ZWEIMAL da**, wortgleich, einmal fuer den
    // Zielturm und einmal fuer das Tor: dieselbe Datei, dieselbe Regel,
    // dasselbe Tor. Zwei Fassungen einer Probe sind eine zu viel (Regel 15) -
    // und beide bewiesen im vollen Lauf zu v166 dasselbe Nichts.
    name: 'Farbklima abgeschaltet',
    datei: 'src/gfx/einbettung.ts',
    regel: /export const KLIMA_STAERKE = 0\.40;/,
    ersatz: 'export const KLIMA_STAERKE = 0;',
    tor: 'einbettungstor',
  },
  {
    // Ohne Zielplattform steht die Festung wieder am Rand statt in der Mitte.
    // Das Tor findet die Platte im Untergrundbild und vergleicht - eine
    // eingetragene Zahl ohne Nachpruefung veraltet in diesem Verzeichnis
    // zuverlaessig.
    name: 'Zielplattform nicht eingetragen',
    datei: 'src/data/maps.ts',
    regel: /  ziel: \{ x: 1734, y: 454 \},/,
    ersatz: '  // ziel entfernt',
    tor: 'zielplattentor',
  },
  {
    // Und eine falsche Zahl muss genauso auffallen wie eine fehlende.
    // v234: die Rundheit ist der Kern des neuen Suchers - der Anteil des
    // Kantenverlaufs, der RADIAL zeigt. Ohne ihn zaehlt nur noch, wie stark
    // die Kante ist, und das kann jeder Felsbrocken.
    //
    // **Dass dieser Eingriff ueberhaupt zu fangen ist, ist der Grund fuer
    // die eingebaute Nullprobe.** Ohne sie blieb das Tor gruen: auf allen
    // vier ausgelieferten Karten ist die Platte auch die staerkste Kante,
    // der Fund bleibt also richtig, und die Rundheit steht dann eben auf
    // 1,00 statt 0,98 (nachgefahren, Ausgang 0). Erst das zugedeckte Bild
    // macht den Unterschied sichtbar - dort springt sie ebenfalls auf 1,00,
    // und genau das meldet das Tor.
    name: 'Zielplatte misst die Kante statt den Kranz',
    datei: 'tools/zielplatte.mjs',
    regel: /bestR = Math\.abs\(gx\[i\] \* cx \+ gy\[i\] \* sy\);/,
    ersatz: 'bestR = gm[i];',
    tor: 'zielplattentor',
  },
  {
    name: 'Zielplattform steht falsch eingetragen',
    datei: 'src/data/maps.ts',
    regel: /  ziel: \{ x: 1734, y: 454 \},/,
    ersatz: '  ziel: { x: 1500, y: 380 },',
    tor: 'zielplattentor',
  },
  {
    // Ohne den Umzug des letzten Kontrollpunkts enden die Bahnen wieder am
    // Rand der Platte - der Waechter prueft die GERECHNETE Bahn gegen den
    // Zielpunkt und muss das sehen.
    name: 'Die Bahnen enden wieder neben der Platte',
    datei: 'src/data/maps.ts',
    suche: 'map.ziel ? [...l.slice(0, -1), { ...l[l.length - 1], ...map.ziel }] : l,',
    ersatz: '      l,',
    tor: 'guards',
  },
  {
    // Das Tor der Leere war bis v132 die letzte Gruppe ohne Einbettung.
    // Hier faellt es aus der Figurenliste des Tors heraus - dann prueft es
    // niemand mehr, und das Tor meldet trotzdem gruen. Genau die Bauart, an
    // der eine Messung leise aufhoert zu messen.
    name: 'Das Tor der Leere wird gar nicht mehr geprueft',
    datei: 'tools/einbettung.mjs',
    regel: /^const FIGUREN = Object\.keys\(OBJECT_ART\)\.map\($/m,
    ersatz: "const FIGUREN = Object.keys(OBJECT_ART).filter((k) => k !== 'gate').map(",
    tor: 'einbettungstor',
  },
  {
    // Der eigentliche Punkt an D14: die Zierde darf den SPIELWUERFEL nicht
    // bewegen. Zieht sie aus `rng`, laeuft dieselbe Partie je nach Anzahl der
    // Buschtipper verschieden - und niemand kaeme darauf, dort zu suchen.
    name: 'Die Zierde greift in den Spielwuerfel',
    datei: 'src/game/state.ts',
    regel: /        const a = this\.zierRng\.next\(\) \* Math\.PI \* 2;/,
    ersatz: '        const a = this.rng.next() * Math.PI * 2;',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: eine Zierde, die ueberall reagiert, ist keine
    // Kleinigkeit in der Karte, sondern Staub auf jedem Tipp.
    name: 'Die Zierde reagiert ueberall',
    suche: 'if (Math.hypot(gr.x - x, gr.y - y) > gr.r * 1.1) continue;',
    datei: 'src/game/state.ts',
    ersatz: 'if (false) continue;',
    tor: 'smoke',
  },
  {
    // F4: ein Turmwert, der in den Daten steht und in keiner Zeile. Genau so
    // sind `slowTime` und `falloff` bis v134 unsichtbar geblieben.
    name: 'Ein Turmwert steht vor dem Kauf nicht da',
    datei: 'src/game/turmwerte.ts',
    regel: /if \(st\.slowTime\) z\.push\(\{ feld: 'slowTime', name: 'Bremsdauer', wert: dauer\(st\.slowTime\) \}\);/,
    ersatz: '',
    tor: 'guards',
  },
  {
    // P2: "Sterne vorher" wird nicht mehr vor dem Eintragen festgehalten.
    // Dann steht dort immer der neue Wert und "Ein neuer Stern" erscheint nie.
    name: 'Der Sieg wird nicht eingetragen',
    datei: 'src/game/state.ts',
    // **Neu angesetzt in v314** (S-N1-05). Vorher log sie den Stand VOR dem
    // Lauf an, damit "Ein neuer Stern" nie erschiene. Sterne gibt es nicht
    // mehr; was `finishRun` heute hinterlaesst, ist die gewonnene Karte - und
    // daran haengen die Faehigkeiten. Traegt er sie nicht ein, schaltet ein
    // Sieg nichts frei, und der Rauchtest sagt es.
    regel: /if \(won && !this\.endless\) karteGewonnen\(this\.map\.id\);/,
    ersatz: 'if (false) karteGewonnen(this.map.id);',
    tor: 'smoke',
    meldet: 'schaltet nichts frei',
  },
  {
    // P2: der Bestwert wird wieder mit der laufenden statt der ueberstandenen
    // Welle eingetragen - eine Welle zuviel, bei jeder Partie.
    name: 'Bestwert eine Welle zu weit',
    datei: 'src/game/state.ts',
    regel: /recordRun\(this\.map\.id, this\.difficulty, reached, won \? this\.lives : 0, this\.endless\);/,
    ersatz: 'recordRun(this.map.id, this.difficulty, this.waveNumber, won ? this.lives : 0, this.endless);',
    tor: 'smoke',
  },
  {
    // P2: die Auswertung beschreibt eine andere Partie als die gespielte.
    name: 'Die Auswertung zaehlt nicht mit',
    datei: 'src/game/auswertung.ts',
    regel: /kills: s\.stats\.kills,/,
    ersatz: 'kills: 0,',
    tor: 'smoke',
  },
  {
    // Die Gelaendeart eines Kreises passt nicht mehr zum Bild - so, wie sie
    // nach einem neuen Kartenbild oder einem verschobenen Kreis dastuende.
    //
    // **Der Eingriff trifft `kalt`, und das ist seit v233 der Punkt.** Das
    // Tor entscheidet `hart` gegen `locker` nicht mehr - am Bild ist es
    // nicht entscheidbar (D29). Was es beidseitig haelt, ist `kalt`: blauer
    // als seine Karte, auf einer kalten Karte. Eine Probe auf hart/locker
    // wuerde seit v233 schweigen und saehe aus wie ein bestandenes Tor.
    // v234: die BUNTHEIT ist das Merkmal, das `hart` von `locker` trennt -
    // ueber alle 37 Kreise Dickicht 0,39 bis 0,71 des Kartenmittels, Fels
    // und Eis 1,35 bis 2,14. Ohne sie bleibt die alte Helligkeitsregel, und
    // die sieht dunklen Fels auf hellem Aschefeld nicht: elf Eintragungen
    // fallen durch.
    name: 'Gelaende erkennt Fels nur an der Helligkeit',
    datei: 'tools/gelaende.mjs',
    regel: /: \(dH > HART_AB \|\| buntVerhaeltnis >= BUNT_AB\) \? 'hart' : 'locker';/,
    ersatz: ": (dH > HART_AB) ? 'hart' : 'locker';",
    tor: 'gelaendetor',
  },
  {
    // v234: die Kaelteschwelle stand auf 0,07 und schnitt damit eine
    // gleichartige Gruppe mitten durch - alle zehn Flecken der Frostspalte
    // liegen zwischen 0,052 und 0,114. Die Luecke liegt bei 0,011 bis
    // 0,052, also gehoert die Schwelle dorthin.
    name: 'Kaelteschwelle schneidet das Eis mitten durch',
    datei: 'tools/gelaende.mjs',
    regel: /^const KALT_AB = 0\.03;$/m,
    ersatz: 'const KALT_AB = 0.07;',
    tor: 'gelaendetor',
  },
  {
    name: 'Gelaendeart falsch eingetragen',
    datei: 'src/data/maps.ts',
    regel: /art: 'kalt'/,
    ersatz: "art: 'locker'",
    tor: 'gelaendetor',
  },
  {
    // Und die Farbe: sie ist der Grund, warum auf dem Pflaster anderes
    // aufstiebt als im Lehm daneben.
    name: 'Fleckfarbe passt nicht zum Bild',
    datei: 'src/data/maps.ts',
    regel: /farbe: '#[0-9a-f]{6}' \}/,
    ersatz: "farbe: '#00ff00' }",
    tor: 'gelaendetor',
  },
  {
    // Und die Gegenrichtung: die Arten stehen zwar in den Daten, wirken sich
    // im Spiel aber nicht aus. Bis v135 war genau das der Zustand.
    name: 'Jeder Fleck reagiert wieder gleich',
    datei: 'src/game/state.ts',
    regel: /      const art = gr\.art;/,
    ersatz: "      const art = 'locker' as typeof gr.art;",
    tor: 'smoke',
  },
  {
    // Der Fehler aus dem Audit: ein wartender Gegner wird mit vier von sechs
    // Angaben gesichert, und der geladene Stand ist leichter als der laufende.
    name: 'Schild faellt aus dem Spielstand',
    datei: 'src/game/state.ts',
    regel: /p\.lane, p\.shield, p\.traeger, p\.welle\]\)/,
    ersatz: 'p.lane])',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: der Stand traegt die Felder, das Laden liest sie
    // nicht. Sieht im Stand richtig aus und kommt im Spiel nicht an.
    name: 'Spielstand liest den Schild nicht',
    datei: 'src/game/state.ts',
    regel: /lane: lane \?\? 0, shield: shield \?\? 0/,
    ersatz: 'lane: lane ?? 0, shield: 0',
    tor: 'smoke',
  },
  {
    // Der Trefferstopp ohne Deckel - das war bis v136 der wahre Zustand,
    // weil ein zweites, ungedeckeltes Feld danebenlief.
    name: 'Trefferstopp ohne Deckel',
    datei: 'src/game/state.ts',
    regel: /const left = Math\.max\(0, 0\.09 - this\.stopBudget\);/,
    ersatz: 'const left = 10;',
    tor: 'smoke',
  },
  {
    // Der groesste einzelne Posten fuer den Raumeindruck: ohne Sortierung
    // liegt jeder Gegner vor jedem Turm - der Zustand bis v139.
    name: 'Szene ohne Tiefensortierung',
    datei: 'src/gfx/renderer.ts',
    regel: /    stand\.sort\(\(a, b\) => a\.y - b\.y\);/,
    ersatz: '    void 0;',
    tor: 'bildtor',
  },
  {
    // Ohne den kalten Ton sieht man einem gebremsten Gegner nichts mehr an -
    // die Bremse waere wieder eine Zahl im Modell statt einer Auskunft.
    name: 'Gebremste Gegner sehen aus wie freie',
    datei: 'src/gfx/renderer.ts',
    // Ebenfalls nachgezogen (TF-015): der Frostueberzug liest seine
    // Restdauer jetzt aus der Wirkungsliste statt aus `slowLeft`.
    regel: /          ctx\.globalAlpha = Math\.min\(1, bremse \* 1\.6\) \* 0\.85;/,
    ersatz: '          ctx.globalAlpha = 0;',
    tor: 'bildtor',
  },
  {
    // Die Tortabelle im Pipeline-Dokument darf nicht hinter der Kette
    // zurueckbleiben - sechs Tore lang tat sie das unbemerkt.
    // Ein Ticket steht im Masterplan an drei Stellen. Nach TF-007 waren
    // zwei nachgetragen und eine nicht - beim naechsten Nachschlagen stand
    // es wieder offen da.
    // Und dasselbe fuer ein WIDERLEGTES Ticket. Der erste Entwurf des
    // Waechters kannte nur "erledigt" - und liess genau den Eintrag durch,
    // der ihn ausgeloest hatte.
    name: 'Widerlegtes Ticket nur an einer Stelle abgehakt',
    datei: 'docs/Towerfront-MASTERPLAN.md',
    regel: /\| 6 \| TF-030 \|([^\n]*)\*\*widerlegt v147\*\*[^\n|]*\|/,
    ersatz: '| 6 | TF-030 |$1— |',
    tor: 'doku',
  },
  {
    name: 'Erledigtes Ticket nur an einer Stelle abgehakt',
    datei: 'docs/Towerfront-MASTERPLAN.md',
    regel: /\| 3 \| TF-007 \|([^\n]*)\*\*erledigt v144\*\* \|/,
    ersatz: '| 3 | TF-007 |$1— |',
    tor: 'doku',
  },
  {
    // Und die Reihenfolge: zwei vertauschte Zeilen sind schwerer zu sehen
    // als eine fehlende - und richten mehr an, weil die Tabelle dann
    // vollstaendig aussieht.
    name: 'Zwei Tore in der Tabelle vertauscht',
    datei: 'docs/Towerfront-KONZEPT-und-PIPELINE.md',
    // OHNE Zeilennummern: die erste Fassung nannte "| 9 |" und "| 10 |" und
    // fiel aus, sobald ein Tor davor eingefuegt wurde - "Muster fehlt", also
    // Fall 3 aus dem Kopf dieser Datei. Eine Probe, die auf die Zahl zeigt,
    // die sie pruefen soll, veraltet zwangslaeufig mit ihr.
    regel: /\| (\d+) \| Messung Simulation \| `npm run bench` \|([^\n]*)\n\| (\d+) \| Messung Zeichnen \| `npm run bench-draw` \|([^\n]*)\n/,
    ersatz: '| $1 | Messung Zeichnen | `npm run bench-draw` |$4\n| $3 | Messung Simulation | `npm run bench` |$2\n',
    tor: 'doku',
  },
  {
    name: 'Ein Tor fehlt in der Tortabelle',
    datei: 'docs/Towerfront-KONZEPT-und-PIPELINE.md',
    // Nach dem BEFEHL gesucht, nicht nach der Zeilennummer: die Tabelle wird
    // bei jedem neuen Tor durchnumeriert, und diese Probe stand auf "7".
    // Als das Konter-Tor davor einsortiert wurde, zeigte sie ins Leere -
    // dieselbe Ursache wie bei der Probe "Zwei Tore in der Tabelle
    // vertauscht", die genau deshalb schon einmal umgestellt wurde.
    regel: /\| \d+ \| Geschosse \| `npm run geschossetor` \|[^\n]*\n/,
    ersatz: '',
    tor: 'doku',
  },
  {
    // Der Versionsstempel im laufenden Spiel: leer ist so gut wie nicht da.
    name: 'Versionsstempel bleibt leer',
    datei: 'src/ui/ui.ts',
    regel: /    this\.vVersion\.textContent = VERSION;/,
    ersatz: "    this.vVersion.textContent = '';",
    tor: 'browsertor',
  },
  {
    // Und er darf keinen Tipp abfangen - der Fehler aus v9, der das Spiel
    // auf dem Handy unbedienbar machte.
    name: 'Versionsstempel faengt Tipps ab',
    datei: 'src/style.css',
    regel: /  z-index: 2; pointer-events: none;/,
    ersatz: '  z-index: 2; pointer-events: auto;',
    tor: 'browsertor',
  },
  {
    // **Die zwei alten Gegenproben fuer `wegdeckungtor` sind in v234
    // entfallen** - sie drehten am Verblassen der Kulisse, und seit v233
    // malt keine Karte mehr eine Strasse, von der Kulisse uebrig bleiben
    // koennte. Der volle Lauf hat beide gemeldet; dieselbe Bewegung wie bei
    // `bahntreuetor` (D30).
    //
    // An ihre Stelle tritt, was das Tor jetzt wirklich haelt: der FARBTON
    // des gezeichneten Weges gegen seinen Boden. Der Eingriff nimmt die
    // Wegfarbe der Ascheschlucht auf den Stand vor v234 zurueck - damals
    // stand sie im Bild auf rgb 137,114,67 gegen einen Boden von 78,75,79,
    // also 72 Punkte waermer bei erlaubten 35. Der euklidische Abstand sah
    // das nicht; er lag mit 73,1 mitten im Band.
    // Dieselbe Umhaengung wie oben, aus demselben Anlass (v326): sie griff
    // `#969081`, die alte Wegfarbe der Ascheschlucht.
    name: 'Wegfarbe hat wieder einen anderen Farbton als ihr Boden',
    datei: 'src/data/maps.ts',
    regel: /(const LAUB: MapPalette = \{[^}]*?)path: '#[0-9A-F]{6}', pathEdge: '#[0-9A-F]{6}',/,
    ersatz: "$1path: '#D8B070', pathEdge: '#A88848',",
    tor: 'wegdeckungtor',
  },
  {
    // Und die Reihenfolge selbst: zeichnet der Weg wieder VOR dem
    // Tonwertabgleich, wird die Kurve an einer Leinwand geeicht, die das
    // Band schon enthaelt, und danach auf das Band angewandt. Gemessen
    // sprangen alle vier Karten dabei von 53 bis 61 Farbschritten auf 55
    // bis 73 - und die Ascheschlucht von 19 Waerme auf 72.
    name: 'Weg wird wieder vor dem Tonwertabgleich gezeichnet',
    datei: 'src/gfx/terrain.ts',
    regel: /^    wegZeichnen\(\);$/m,
    ersatz: '    void wegZeichnen;',
    tor: 'wegdeckungtor',
  },
  {
    // v237: `art/` galt als "hier liegen Bildgruppen", und jede JSON darin
    // wurde als eine gelesen. Eine Entwurfsbeschreibung dort abzulegen hat
    // die ganze Torkette mit einem Stapelabzug abgebrochen - kein Befund,
    // kein Satz. Der Eingriff nimmt die Pruefung heraus; dann versucht das
    // Werkzeug wieder, jede JSON zu packen.
    name: 'Bildwerkzeug haelt jede JSON fuer eine Bildgruppe',
    datei: 'tools/pack-art.mjs',
    //
    // Gefangen wird der Eingriff vom SELBSTTEST des Werkzeugs, nicht vom
    // Bestand: in `art/` liegt keine Nicht-Gruppe mehr, seit die
    // Entwurfsbeschreibung nach `entwurf/` umgezogen ist. Ohne den
    // Selbsttest bliebe diese Probe still (Regel 5).
    regel: /^const istGruppeSpec = \(d\) => typeof d\.source === 'string' && typeof d\.output === 'string';$/m,
    ersatz: 'const istGruppeSpec = () => true;',
    tor: 'art',
  },
  {
    // v237: die Kreuzdeckung. Der Eingriff nimmt die gierige Ueberdeckung
    // heraus und stellt die zwoelf INDIVIDUELL besten Plaetze - genau der
    // Fehler, den meine erste Fassung hatte: die stehen alle uebereinander,
    // und die Zahl bricht ein. Der Waechter muss das sehen.
    name: 'Kreuzdeckung stellt die Tuerme uebereinander',
    datei: 'tools/bahnmass.ts',
    regel: /^      if \(!best \|\| neu\.length > bestN\.length\) \{ best = p; bestN = neu; \}$/m,
    ersatz: '      if (!best || neu.length > bestN.length) { best = p; bestN = neu; }\n'
      + '      if (n > 0) break;',
    tor: 'guards',
  },
  {
    // Und das Gegengewicht: die Verschmelzung muss angeschlossen sein.
    //
    // **Die Grenze anzuheben taugt als Eingriff NICHT** - nachgefahren mit
    // `VERSCHMELZUNG_MAX = 999` blieb der Waechter gruen, weil keine Karte
    // in die Naehe der 55 kommt (die hoechste ist die Frostspalte mit 52).
    // Ein Eingriff, der nur wirkt, wenn ohnehin etwas anschlaegt, beweist
    // nichts. Gerueckt wird deshalb die MESSUNG: mit einem Schlauch von 400
    // statt 10 Weltpunkten liegt jede Bahn in jeder anderen, und die Grenze
    // muss anschlagen.
    name: 'Verschmelzung wird nicht mehr begrenzt',
    datei: 'tools/bahnmass.ts',
    regel: /if \(bahnen\[j\]\.schlauchAbstand\(q\.x, q\.y\) < 10\) n\+\+;/,
    ersatz: 'if (bahnen[j].schlauchAbstand(q.x, q.y) < 400) n++;',
    tor: 'guards',
  },
  // ---------------------------------------------------------------------
  // **`bahntreuetor` hat seit v233 KEINE Gegenprobe, und das steht hier
  // statt einer erfundenen.**
  //
  // Es fragt, ob eine Bahn auf der GEMALTEN Strasse laeuft. Mit der
  // Ascheschlucht ist die letzte Karte auf `weg: false` gegangen - im ganzen
  // Spiel gibt es keine gemalte Strasse mehr. Beide bisherigen Proben ("Eine
  // Bahn rutscht von der Strasse", "Bahnschlauch breiter als seine Strasse")
  // haben damit ihren Gegenstand verloren; `npm run muster` hat die erste in
  // demselben Lauf gemeldet.
  //
  // **Drei Ersatzproben sind gebaut und alle drei verworfen**, jede aus
  // demselben Grund - sie liessen das Tor gruen:
  //
  //   1. Bahn von der Strasse ziehen: es gibt keine Strasse.
  //   2. Die "gegenstandslos"-Meldung herausnehmen: dann behauptet das Tor
  //      wieder einen Beweis, aber es bricht nicht ab - der Ausgang bleibt 0.
  //   3. Eine Karte wieder auf `weg: true` setzen: nachgefahren, Ausgang 0.
  //      Das Tor ist eine RATSCHE - es schlaegt nur an, wenn eine Bahn
  //      schlechter wird als ihr Grundwert, und eine Karte ohne Grundwert
  //      hat nichts, wogegen sie fallen koennte.
  //
  // Damit ist `bahntreuetor` derzeit ein Tor, das nicht rot werden KANN.
  // Es bleibt in der Kette, weil `bildBringt.weg` je Karte gilt und die
  // naechste Karte ihn wieder umlegen kann - aber es beweist bis dahin
  // nichts, und es sagt das inzwischen selbst ("BAHNTREUE: gegenstandslos").
  // Als D30 im Rueckstandsverzeichnis: sobald wieder eine Karte eine Strasse
  // malt, gehoert die Probe zurueck.
  // ---------------------------------------------------------------------
  {
    // TF-014: die Wegvorschau abgeschaltet - man saehe nicht, woher es kommt.
    name: 'Wegvorschau abgeschaltet',
    datei: 'src/gfx/renderer.ts',
    regel: /    const t = s\.wegvorschauStand\(\);\n    if \(t === null\) return;/,
    ersatz: '    const t = s.wegvorschauStand();\n    if (t === null || t >= 0) return;',
    tor: 'bildtor',
  },
  {
    // Und sie muss beim Betreten einer Karte VON SELBST laufen. Ohne diese
    // Zeile gaebe es sie nur auf Knopfdruck - und der Knopf sagt nicht, was
    // er zeigt, bevor man ihn einmal gedrueckt hat.
    name: 'Wegvorschau laeuft nicht beim Betreten',
    datei: 'src/game/state.ts',
    regel: /^    this\.wegvorschauAb = this\.time;\n    this\.zielunitSetzen\(\);$/m,
    ersatz: '    this.wegvorschauAb = -99;\n    this.zielunitSetzen();',
    tor: 'smoke',
  },
  {
    // Regel 6 am echten Mechanismus: der Knopf ist im Menue unsichtbar, weil
    // er in der KOPFZEILE sitzt und die als ganze verschwindet. Wer ihn
    // herausnimmt, hat eine Spielbedienung ueber der Landkarte.
    //
    // Die erste Fassung dieser Probe setzte `bWeg.hidden = false` und bewies
    // nichts: ein Kind eines ausgeblendeten Elternteils bleibt unsichtbar.
    name: 'Wegknopf steht ausserhalb der Kopfzeile',
    datei: 'index.html',
    regel: /  <\/header>/,
    ersatz: '  </header>\n  <button class="chip" id="b-weg2" aria-label="Weg">Weg</button>',
    tor: 'browsertor',
  },
  {
    // TF-035: unerreichbarer Code muss den Uebersetzer stoeren. Genau so
    // stand vierzehn Zeilen tote Rechnung hinter einem `return`, und
    // `noUnusedParameters` sah die Parameter als benutzt an, weil der tote
    // Zweig sie las.
    name: 'Unerreichbarer Code faellt nicht auf',
    datei: 'src/gfx/renderer.ts',
    regel: /    return turmMasse\(\);\n  \}/,
    ersatz: '    return turmMasse();\n    console.log(1);\n  }',
    tor: 'tsc',
  },
  {
    // Der Zwischenspeicher der Gegnerbilder muss die KARTE tragen. Bis v147
    // trug er die Saumfarbe - die war je Karte zufaellig verschieden und
    // wirkte deshalb wie eine Kartenkennung.
    name: 'Gegnerbilder aller Karten im selben Fach',
    datei: 'src/gfx/enemyart.ts',
    regel: /  const cacheKey = `\$\{id\}\|\$\{flash \? 'f' : 'n'\}\|\$\{mapId\}`;/,
    ersatz: "  const cacheKey = `${id}|${flash ? 'f' : 'n'}`;",
    tor: 'einbettungstor',
  },
  {
    // Nachfolgerin von "Saum dunkel statt hell" (bis v147). Jene setzte die
    // Kartenfarbe `palette.rim` auf einen dunklen Wert und sah das
    // Lesbarkeitstor anschlagen - bewiesen hat das nur, dass die Rechnung
    // rechnet. Gezeichnet wurde diese Farbe nirgends, und mit dem Ausbau des
    // toten Saums in v148 gab es sie nicht mehr.
    //
    // Die Kantenmessung muss die KANTE messen. Wird sie durch einen festen
    // Wert ersetzt, faellt der Kontrast gegen den Boden zusammen - genau
    // das, was die alte Fassung mit `palette.rim` tat, nur andersherum.
    name: 'Kantenmessung liefert einen festen Wert',
    datei: 'tools/readability.mjs',
    regel: /  if \(!n\) throw new Error\('keine Randpunkte'\);\n  return \[r \/ n, g \/ n, b \/ n\];/,
    ersatz: "  if (!n) throw new Error('keine Randpunkte');\n  return [128, 128, 128];",
    tor: 'lesbarkeit',
  },
  {
    // TF-024, v168: das Lesbarkeitstor muss denselben Farbschleier auftragen
    // wie das Spiel. Bis v168 rechnete es mit 0,38 - dem Wert des
    // Alt-Zweigs, der seit v147 nicht mehr laeuft - und beurteilte damit
    // eine Figur, die niemand sieht (Regel 12).
    //
    // Der Eingriff stellt genau diesen Fehler wieder her. Er muss auffallen,
    // weil die eingetragenen Werte der Ratsche an der Messstelle haengen:
    // mit 0,38 rueckt Koloss/Spalter von 7,3 auf 5,4.
    name: 'Lesbarkeitstor faerbt anders als das Spiel',
    datei: 'src/gfx/enemyart.ts',
    regel: /export const FARBSCHLEIER = 0\.15;/,
    ersatz: 'export const FARBSCHLEIER = 0.38;',
    tor: 'lesbarkeit',
  },
  {
    // Und die Wetterart selbst wird geprueft, nicht uebersprungen: ein
    // Eintrag in der Palette, den niemand ansieht, ist die Stelle, an der
    // beim naechsten Mal ein Tippfehler stehen bleibt.
    name: 'Wetterart mit Tippfehler',
    datei: 'src/data/maps.ts',
    regel: /  wetter: 'regen', wetterTon: '#CFE6F2',/,
    ersatz: "  wetter: 'nieselregen' as never, wetterTon: '#CFE6F2',",
    tor: 'guards',
  },
  {
    // D13, v180: der Wellenverlauf und die Gesamtsumme werden an DERSELBEN
    // Stelle gebucht. Laufen sie auseinander, ist eine von beiden falsch,
    // ohne dass man saehe welche.
    name: 'Wellenverlauf laeuft von der Summe weg',
    datei: 'src/game/state.ts',
    regel: /this\.stats\.damageByWave\[e\.welle\] = \(this\.stats\.damageByWave\[e\.welle\] \?\? 0\) \+ dmg;/,
    ersatz: 'this.stats.damageByWave[e.welle] = '
      + '(this.stats.damageByWave[e.welle] ?? 0) + dmg * 0.5;',
    tor: 'smoke',
  },
  {
    // Und die Balken selbst: der Verlauf muss gezeichnet werden, nicht nur
    // gerechnet.
    name: 'Wellenverlauf wird nicht gezeichnet',
    datei: 'src/ui/statsblatt.ts',
    regel: /^  if \(gespielt < 2\) return '';           \/\/ eine Welle ist kein Verlauf$/m,
    ersatz: "  return '';",
    tor: 'smoke',
  },
  {
    // T10, v179: dieselbe Aussaat muss denselben Lauf ergeben. Ein
    // Eingabefeld, das eine Zahl annimmt und danach etwas anderes passiert,
    // ist schlimmer als keines - es verspricht Reproduzierbarkeit und
    // liefert Zufall.
    name: 'Aussaat wirkt nicht',
    datei: 'src/game/state.ts',
    regel: /^    this\.rng\.state = seed;$/m,
    ersatz: '    this.rng.state = newSeed();',
    tor: 'smoke',
  },
  {
    // Und der Block muss sich WIEDER EINLESEN lassen. Wer einen Lauf
    // weitergibt, kopiert ihn im Stueck; wer ihn nachstellt, fuegt ihn im
    // Stueck wieder ein.
    name: 'Laufblock laesst sich nicht wieder einlesen',
    datei: 'src/game/mitschrift.ts',
    regel: /^  const ausBlock = \/Aussaat\\s\+\(\\d\+\)\/i\.exec\(text\);$/m,
    ersatz: '  const ausBlock = null;',
    tor: 'smoke',
  },
  {
    // T11: ein Absturz darf nicht stumm bleiben.
    name: 'Fehlerfenster bleibt zu',
    datei: 'src/ui/ui.ts',
    regel: /^    this\.fehlerMenu\.hidden = false;$/m,
    ersatz: '    this.fehlerMenu.hidden = true;',
    tor: 'smoke',
  },
  {
    // Und die Verdrahtung dazwischen, die nur die gebaute Datei zeigt: das
    // Eingabefeld sitzt in der Oberflaeche, die Partie wird in main.ts
    // gestartet. Der Rauchtest baut beides selbst zusammen und saehe es
    // nicht.
    name: 'Eingegebene Aussaat erreicht die Partie nicht',
    datei: 'src/main.ts',
    regel: /^  const aussaat = ui\.wunschAussaat \?\? undefined;$/m,
    ersatz: '  const aussaat = undefined;',
    tor: 'browser',
  },
  {
    // D21, v178: keine Figur darf deutlich weniger Bildpunkte mitbringen als
    // die anderen. Der Eintrag stand zwei Fassungen lang still erledigt im
    // Rueckstandsverzeichnis und in CLAUDE.md - gemessen wurde er nie.
    // Eingebaut wird die Ursache, die das TOR auch sieht: die Figur wird
    // GROESSER gezeichnet, als ihr Bild hergibt. Ein Eingriff an
    // `art/gegner.json` waere hier wirkungslos - `lesbarkeit` liest den
    // gepackten Vorrat, und der aendert sich erst beim Neupacken (Regel 3).
    name: 'Eine Gegnerfigur wird groesser gezeichnet als ihr Bild hergibt',
    datei: 'src/data/enemies.ts',
    regel: /    hp: 52, speed: 96, bounty: 3, leak: 1, radius: 24, armor: 1, slowResist: 0\.1,/,
    ersatz: '    hp: 52, speed: 96, bounty: 3, leak: 1, radius: 60, armor: 1, slowResist: 0.1,',
    tor: 'lesbarkeit',
  },
  {
    // v177: die Niederlageaufnahme fiel mitten in den Ansichtswechsel - und
    // die Torkette hat es nicht gemeldet, weil sie nur den Querschnitt
    // faehrt. Seit alle Menueaufnahmen im Querschnitt stehen, faengt sie es.
    name: 'Niederlageaufnahme faellt in den Ansichtswechsel',
    datei: 'tools/shots.mjs',
    regel: /  \/\/ Aufnahme mitten hinein\.\n  return 20;/,
    ersatz: '  // Aufnahme mitten hinein.\n  return 10;',
    tor: 'bildtor',
  },
  {
    // D6, v176: der Ausweg aus einem Dialog muss GANZ im Bild stehen. Kein
    // anderes Tor konnte das melden: der Rauchtest fragt in jsdom nach
    // `hidden` und kennt keine Hoehen, die Beruehrungsmessung rechnet
    // Groessen aus der Stilvorlage statt aus dem Bild.
    name: 'Dialogkarte schneidet ihren Ausweg ab',
    datei: 'src/style.css',
    regel: /  min-width: 260px; max-height: 92vh; overflow: hidden; padding: 18px 24px;/,
    ersatz: '  min-width: 260px; max-height: 60vh; overflow: hidden; padding: 18px 24px;',
    tor: 'browser',
  },
  {
    // D6, v176: "Bewegung reduziert" muss dem Bild wirklich Bewegung
    // nehmen. Ein Schalter, der nur seinen eigenen Stand aendert, verspricht
    // eine Wahl, die es nicht gibt.
    name: 'Bewegungsreduktion laesst das Wetter stehen',
    datei: 'src/gfx/renderer.ts',
    regel: /^    if \(!ruhig\) drawWetter\(ctx, s\.crystalPulse, hi, s\.map\.palette\.wetter, s\.map\.palette\.wetterTon\);$/m,
    ersatz: '    drawWetter(ctx, s.crystalPulse, hi, s.map.palette.wetter, s.map.palette.wetterTon);',
    tor: 'bildtor',
  },
  {
    // Und die gespeicherte Lautstaerke muss beim Start ankommen: sie steht
    // im Speicher, der Regler zeigt sie an, und gehoert wird der
    // Standardwert - der haeufigste Fehler dieser Sorte.
    name: 'Gespeicherte Lautstaerke wird beim Start vergessen',
    datei: 'src/ui/ui.ts',
    regel: /^    Sfx\.setVolume\(getSettings\(\)\.volume\);$/m,
    ersatz: '    // Lautstaerke nicht uebernommen.',
    tor: 'smoke',
  },
  {
    // Vierter Fall derselben Familie: `sync` steigt frueh aus, wenn sich die
    // Signatur nicht geaendert hat - und die beschreibt den Spielzustand,
    // nicht die Einstellungen. Steht die Ableitung dahinter, bleibt der
    // gewaehlte Knopf ungewaehlt, bis sich zufaellig das Gold aendert.
    name: 'Einstellungen werden hinter dem Ausstieg abgeleitet',
    datei: 'src/ui/ui.ts',
    // **Mit dem Nachbarn zusammen gesucht, nicht allein.**
    //
    // `syncOptionen()` wird seit v196 an ZWEI Stellen gerufen - die zweite
    // steht in `endTutorial`. Die Probe griff danach die erste im Text, und
    // das war die falsche: das Tor blieb gruen, obwohl der Eingriff ankam.
    // Der volle Probenlauf zu v199 hat es gemeldet, der Musterlauf hatte
    // es als "2 Treffer, greift den ersten" schon angezeigt.
    // Seit v239 steht zwischen `syncOptionen()` und `const sel` die
    // Werkzeugklappe - aus demselben Grund und mit demselben Kommentar.
    // Der Eingriff nimmt weiterhin genau die eine Zeile heraus.
    regel: /    this\.syncOptionen\(\);\n    \/\/ Die Werkzeugklappe steht VOR/,
    ersatz: '    // Die Werkzeugklappe steht VOR',
    tor: 'smoke',
  },
  {
    // C28, v175: der Nachteil des Moersers muss ueberall etwas kosten. Wird
    // die Luft einer Karte wieder duenn, ist er dort geschenkt - und der
    // Moerser zum selben Preis der bessere Turm.
    name: 'Eine Karte verliert ihre Luft',
    datei: 'src/data/waves.ts',
    regel: /    \{ enemy: 'flyer', count: 7, gap: 1\.8, delay: 6 \} \] \},/,
    ersatz: "    { enemy: 'flyer', count: 1, gap: 1.8, delay: 6 } ] },",
    tor: 'guards',
  },
  {
    // Und die zweite Haelfte derselben Regel: Luft muss oft genug vorkommen,
    // um eine Entscheidung zu sein. Eine einzelne Luftwelle laesst sich
    // aussitzen.
    name: 'Luft nur noch in zwei Wellen',
    datei: 'src/data/waves.ts',
    regel: /    \{ enemy: 'flyer', count: 3, gap: 1\.6, delay: 10 \} \] \},/,
    ersatz: "    { enemy: 'flyer', count: 0, gap: 1.6, delay: 10 } ] },",
    tor: 'guards',
  },
  {
    // T6, v174: verbucht wird, was WIRKLICH verloren geht. Der Kristall
    // wird bei null abgeschnitten; ein Gegner mit drei Punkten Durchschlag
    // auf einen Kristall mit einem Punkt Rest kostete bis dahin trotzdem
    // drei in der Bilanz. Gefunden hat es der Durchlauf ueber jede Karte.
    //
    // **Und der Durchlauf hat sie in v232 verloren.** Er vergleicht nur die
    // Summen; auseinander gehen die nur, wenn eine Karte ihren Kristall auf
    // null bringt. Bis v231 tat das genau eine - die Frostspalte -, und seit
    // ihre Bahnen gewunden statt gerade sind, gewinnt der Durchlauf sie mit
    // 9 von 60. Damit gab es auf keiner Karte mehr einen Ueberlauf, und
    // diese Probe schwieg, ohne dass sich am geprueften Code etwas geaendert
    // haette. Genau die Form der vier v219-Funde: ein Messplatz, der auf
    // einen Zufall wartet.
    //
    // `tools/smoke.ts` STELLT den Fall jetzt - Kristall auf 1, ein Koloss
    // mit 3 Durchschlag ans Bahnende. Damit haengt die Probe wieder nur an
    // ihrer Zieldatei und braucht kein `haengtAn`.
    name: 'Kristallverlust wird zu hoch verbucht',
    datei: 'src/game/state.ts',
    regel: /^    const wirklich = Math\.min\(def\.leak, Math\.max\(0, this\.lives\)\);$/m,
    ersatz: '    const wirklich = def.leak;',
    tor: 'smoke',
  },
  {
    // Und die eine Zusage des Endlosmodus: er geht ueber den Plan hinaus.
    // Bis v174 hat das nie jemand nachgespielt.
    name: 'Endlosmodus endet mit dem Wellenplan',
    datei: 'src/game/state.ts',
    regel: /&& \(this\.endless \|\| this\.waveIndex < this\.waves\.length\);/,
    ersatz: '&& this.waveIndex < this.waves.length;',
    tor: 'smoke',
  },
  {
    // v193: der Fokusring ist gestaltet. Ohne ihn steht der Standardring des
    // Browsers - auf dieser dunklen Oberflaeche fast schwarz.
    name: 'Kein gestalteter Fokusring',
    datei: 'src/style.css',
    regel: /^:focus-visible \{$/m,
    ersatz: '.nie-fokus {',
    tor: 'browsertor',
  },
  {
    // v193: die Tastatur wandert im Menue ueber die Trefferflaechen. Bis
    // dahin waren auf dem Titelschirm NULL von 57 fokussierbaren Elementen
    // sichtbar - wer keinen Zeiger hat, kam nicht ins Spiel.
    name: 'Tastaturwahl bleibt am ersten Knopf',
    datei: 'src/game/menu.ts',
    regel: /^    this\.tastenId = liste\[naechst\]\.id;$/m,
    ersatz: '    this.tastenId = liste[0].id;',
    tor: 'smoke',
  },
  {
    // Und die andere Haelfte: Enter muss ausloesen, nicht nur markieren.
    name: 'Enter im Menue loest nichts aus',
    datei: 'src/game/menu.ts',
    regel: /^    return this\.tap\(hit\.x \+ hit\.w \/ 2, hit\.y \+ hit\.h \/ 2\);$/m,
    ersatz: '    return false;',
    tor: 'smoke',
  },
  {
    // v192: die Beruehrungsprobe laeuft ueber ALLE Karten. Bis dahin nur
    // ueber die erste - und `kalt` gibt es nur auf der Frostspalte, also
    // war eine von drei Bewegungen ungeprueft.
    name: 'Beruehrung prueft nur eine Karte',
    datei: 'tools/smoke.ts',
    // Der Fall braucht Karten, die sich in der Bedienbarkeit UNTERSCHEIDEN.
    // Waeren sie gleich, aendert das Beschneiden auf die erste nichts.
    haengtAn: ['src/data/maps.ts'],
    regel: /^  for \(const karte of ALLE_KARTEN\) \{$/m,
    ersatz: '  for (const karte of ALLE_KARTEN.slice(0, 1)) {',
    tor: 'smoke',
  },
  {
    // v190: die Zeichenwerkstatt wartet auf die Bilder, bevor sie eine
    // Leinwand zum Messen herausgibt. Ohne das sind zwei Bilder desselben
    // Zustands an 87 898 Punkten verschieden - und jede Messung, die zwei
    // Bilder vergleicht, misst dann das Nachladen statt der Sache.
    // **Bis v225 griff diese Probe am zweiten Aufruf an - und das war ein
    // Wettlauf.** Sie nahm `await bilderAbwarten()` aus `zeichenwerkstatt`
    // heraus; hier wurde das Kristalltor rot, im vollen Lauf auf dem Runner
    // nicht. `kristall.mjs` wartet schon VOR der Werkstatt, also ist dort
    // nichts mehr offen, und ob die zweite Zeile etwas aendert, entscheidet
    // die Maschine. Der Kasten an der Zeile selbst haelt es fest.
    //
    // Gegriffen wird jetzt an der FUNKTION. Dann trifft es den ERSTEN
    // Aufruf, und der ist tragend: das Bild der Ringstation ist nicht
    // geladen, wenn gemessen wird. Deterministisch, hier wie dort.
    name: 'Werkstatt wartet nicht auf die Bilder',
    datei: 'tools/leinwand.mjs',
    regel: /^  for \(let i = 0; i < 400 && offen > 0; i\+\+\) await new Promise\(\(r\) => setTimeout\(r, 5\)\);$/m,
    ersatz: '  // nicht gewartet',
    tor: 'kristalltor',
    meldet: 'kein Bild der Ringstation im Vorrat',
  },
  {
    // v187: die Leuchtscheiben haengen nicht mehr am Halbmesser. Bis dahin
    // waren es 48 Stueck und bis zu 13 MB - ein Drittel des gesamten
    // Bildspeichers -, weil zwei Aufrufstellen einen STETIGEN Halbmesser
    // liefern und die Ablage nie geraeumt wird.
    name: 'Leuchtscheibe wieder je Halbmesser',
    datei: 'src/gfx/glow.ts',
    regel: /^  const key = color;$/m,
    ersatz: '  const key = `${color}|${Math.round(radius)}`;',
    tor: 'speichertor',
  },
  {
    // v186: die Gruppenbudgets muessen zur Obergrenze der Datei passen. Bis
    // dahin summierten sie sich auf 2160 KB roh - eingebettet rund 2880 -
    // bei einer Datei, die 1600 darf. Jede Gruppe konnte gruen melden,
    // waehrend die Datei laengst zu gross war.
    name: 'Ein Gruppenbudget sprengt die Datei',
    datei: 'art/tuerme.json',
    // Als Regel statt als feste Zahl (v313): das Budget stand auf 445 und
    // steht jetzt auf 400. Eine Probe, die auf den heutigen Wert zeigt,
    // veraltet mit der naechsten Anpassung - und das ist genau die Klasse,
    // an der in dieser Runde schon zwei andere Proben gestorben sind.
    regel: /"budgetKb": \d+/,
    ersatz: '"budgetKb": 900',
    tor: 'autarkie',
  },
  {
    // v185: die Hauptpartie des Rauchtests laeuft auf einer FESTEN Aussaat.
    // Bis v184 stand hier `undefined`, also jede Runde ein anderes Spiel -
    // gemessen Kristall 28, 48, 48, 45, 47 bei fuenf gleichen Laeufen. Jede
    // Zahl darunter war ein Zufallswert, und Gegenproben an diesem Tor waren
    // mal blind und mal nicht.
    //
    // Die Probe zielte bis v195 auf den Titelknopf - und der sass auf einem
    // Bildschirm, den es im Spiel nicht gab. Sie trifft jetzt die Stelle,
    // die im Spiel wirklich liest, was im Einstellungsfeld steht.
    name: 'Die gesetzte Aussaat wird nicht gelesen',
    datei: 'src/ui/ui.ts',
    regel: /this\.wunschAussaat = aussaatLesen\(this\.oSeed\.value\);/,
    ersatz: 'this.wunschAussaat = null;',
    tor: 'smoke',
  },
  {
    // v202, B2 des Bedienungs-Abgleichs: ein Tipp aufs Feld darf niemals
    // Gold ausgeben. Die Probe stellt den alten Weg wieder her - gewaehlte
    // Turmsorte, ein Tipp, gebaut. Auf der Ascheschlucht sind 73 % der
    // Flaeche nicht bebaubar, und nichts zeigt vorher welche.
    name: 'Ein Tipp aufs Feld baut wieder sofort',
    datei: 'src/core/input.ts',
    suche: '      if (ziel) { s.buildAt = ziel; Sfx.play(\'tap\'); }',
    ersatz: '      if (ziel) { s.build(ziel.x, ziel.y, choice); }',
    tor: 'browsertor',
  },
  {
    // Und die Vorwahl muss in der Turmwahl zu sehen sein, sonst faengt die
    // Entscheidung nach dem Tipp von vorne an.
    name: 'Vorgewaehlte Turmsorte nicht hervorgehoben',
    datei: 'src/ui/ui.ts',
    suche: "          + `${id === s.buildChoice ? ' data-vor=\"1\"' : ''}`",
    ersatz: "          + ''",
    tor: 'browsertor',
  },
  {
    // v201: der Inhalt des Pruefstegs muss HINEINPASSEN. Der Boden unter der
    // Werteliste stand absolut (96 Punkte) und gab nicht nach, als die
    // Kopfzeile auf drei Zeilen wuchs: 322 Punkte Inhalt in 288 Punkten
    // Kasten, abgeschnitten wurde die Zielwahl (Regel 2).
    // Die erste Fassung setzte den Boden auf die alten 96 Punkte zurueck -
    // das kam an und loeste nichts mehr aus, seit die Kopfzeile nur noch
    // eine Zeile hoch ist (Regel 3, eine Ebene hoeher). Sie setzt ihn jetzt
    // so hoch, dass der Steg sicher ueberlaeuft: geprueft wird, ob das Tor
    // einen ueberlaufenden Steg ueberhaupt bemerkt - und genau das hat es
    // bis v201 nicht getan.
    //
    // **Dritte Fassung, und wieder aus demselben Grund** (v248): sie griff
    // an `min-height: 33%` der Werteliste und setzte sie auf 200 Punkte.
    // Seit der Steg an seinem Inhalt endet (v247), waechst er dann einfach
    // mit - die Liste ist 200 hoch, alle Zeilen sind zu sehen, und es gibt
    // nichts zu melden. Der volle Lauf zu v247 hat es gefangen.
    //
    // Sie greift jetzt ueber den Ausbauzweigen: die stehen fest
    // (`flex: 0 0 auto`), also verdraengen sie die Liste, statt den Kasten
    // zu dehnen. Nachgemessen: 394 Punkte Inhalt in 288, und von fuenf
    // Wertezeilen ist keine zu sehen.
    name: 'Pruefsteg laeuft ueber, ohne dass es auffaellt',
    datei: 'src/style.css',
    suche: '.insp-ups { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; flex: 0 0 auto; }',
    ersatz: '.insp-ups { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; flex: 0 0 auto; min-height: 260px; }',
    tor: 'browsertor',
  },
  {
    // Und der Schalter muss die Ziellogik wirklich aufklappen.
    name: 'Ziellogik klappt nicht auf',
    datei: 'src/ui/ui.ts',
    suche: '      this.iZiel.hidden = !this.zielOffen;',
    ersatz: '      this.iZiel.hidden = true;',
    tor: 'browsertor',
  },
  {
    // v200: das Kreuz des Pruefstegs war 21 Punkte BREIT - `min-height`
    // stand da, `min-width` nicht, und das Tor hat nie nach der Breite
    // gefragt. Gemeldet hat es der Nutzer, nicht die Torkette.
    //
    // **Die Probe stand bis v203 andersherum da und bewies nichts.** Sie
    // nahm `min-width` ganz weg - und `beruehrung` liest die Stilvorlage:
    // ohne Zusage kann es keine Breite rechnen, also gibt es einen Hinweis
    // und bleibt gruen. Der Fall gehoert deshalb ans Browsertor (die Probe
    // darunter); hier steht der Fall, den DIESES Tor sehen kann - eine
    // Zusage, die zu klein ist.
    name: 'Kreuz des Pruefstegs wieder zu schmal',
    datei: 'src/style.css',
    suche: '  min-height: 44px; min-width: 44px;',
    ersatz: '  min-height: 44px; min-width: 20px;',
    tor: 'beruehrung',
  },
  {
    // Und die andere Haelfte: gar keine Zusage. Die Stilvorlage sagt dann
    // nichts, was zu pruefen waere - im Browser ist das Kreuz aber 21 Punkte
    // breit, und dort wird es gemessen.
    name: 'Kreuz des Pruefstegs sagt gar keine Breite zu',
    datei: 'src/style.css',
    suche: '  min-height: 44px; min-width: 44px;',
    ersatz: '  min-height: 44px;',
    tor: 'browsertor',
  },
  {
    // Und die Zielwahl war 43 Punkte breit - die Zahl stand seit v137 als
    // Begruendung im Kommentar und wurde nie neben die Grenze gelegt.
    //
    // **Vier Punkte Abstand reichen als Eingriff nicht mehr.** Sie geben je
    // Knopf 42,4 Punkte, und die Grenze des Browsertors liegt fuer eine
    // Reihe gleich breiter Knoepfe bei 40 - der Eingriff kam an und loeste
    // nichts aus (Regel 3). Zwoelf Punkte druecken auf 36 und damit unter
    // die Grenze, die das Tor wirklich zieht.
    //
    // **Und zwoelf reichen seit v237 auch nicht mehr - weil ein Modus weg
    // ist.** "Hinten" ist damals entfallen; vier Knoepfe teilen sich die
    // Breite, die vorher fuenf teilten. Gemessen gibt Abstand 12 jetzt
    // 49 Punkte je Knopf, also neun ueber der Grenze. Die Probe ist an einer
    // Aenderung verfallen, die sie gar nicht betraf, und der Nachtlauf zu
    // v238 hat es gemeldet.
    //
    // Nachgemessen bei Abstand 28: 37 Punkte je Knopf, vier Befunde. Der
    // Eingriff bleibt damit derselbe - Knoepfe unter das Fingermass
    // druecken -, nur die Zahl ist an die vier Modi angepasst.
    name: 'Zielwahl unter das Fingermass gedraengt',
    datei: 'src/style.css',
    suche: '  display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px;',
    ersatz: '  display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px;',
    tor: 'browsertor',
  },
  {
    // Die Messtafel faengt EINGEKLAPPT an. Ausgeklappt deckt sie zu, was
    // man zum Spielen braucht - der Nutzer meldete "man kann Welle starten
    // nicht mehr klicken".
    name: 'Messtafel faengt ausgeklappt an',
    datei: 'src/core/messung.ts',
    suche: 'let eingeklappt = true;',
    ersatz: 'let eingeklappt = false;',
    tor: 'browsertor',
  },
  {
    // Und das Kreuz muss den Steg wirklich schliessen, nicht nur gross
    // genug sein.
    name: 'Kreuz schliesst den Pruefsteg nicht',
    datei: 'src/ui/ui.ts',
    suche: "$('i-close').addEventListener('click', () => { this.s.auswahlSchliessen(); });",
    ersatz: "$('i-close').addEventListener('click', () => { /* nichts */ });",
    tor: 'browsertor',
  },
  {
    // v199: der Messschalter muss seinen Zustand ZEIGEN. Ohne den Eintrag
    // in der Signatur setzt er die Einstellung, die Tafel erscheint - und
    // der Knopf bleibt aus, bis sich zufaellig etwas anderes aendert.
    // Sechster Fall derselben Familie.
    name: 'Messschalter zeigt seinen Zustand nicht',
    datei: 'src/ui/ui.ts',
    regel: /      getSettings\(\)\.messung,\n/,
    ersatz: '',
    tor: 'smoke',
  },
  {
    // Und die Tafel muss sich wieder wegraeumen lassen - sonst bleibt sie
    // nach dem Ausschalten stehen und deckt das Feld zu.
    name: 'Messtafel laesst sich nicht abschalten',
    datei: 'src/core/messung.ts',
    suche: '  tafel?.remove();',
    ersatz: '  void 0;',
    tor: 'smoke',
  },
  {
    // Zweimal anlegen darf keine zweite Tafel geben - der Aufruf steht in
    // der Bildschleife und kommt deshalb staendig.
    name: 'Messtafel legt sich doppelt an',
    datei: 'src/core/messung.ts',
    suche: '  if (tafel) return;',
    ersatz: '  if (false) return;',
    tor: 'smoke',
  },
  {
    // v198: die Tafel muss quer ins Bild passen. Gemeldet hat das ein Foto
    // vom Zielgeraet, kein Tor - abgeschnitten war ihr ganzer Kopf.
    name: 'Messtafel schneidet ihren Inhalt ab',
    datei: 'src/style.css',
    // Der Kompaktblock greift gar nicht mehr - dann ist die Tafel 438 statt
    // 274 Punkte hoch und ihr Kopf liegt ausserhalb des Bildes.
    //
    // Die erste Fassung schaltete nur den zweiten Fussteil wieder ein. Das
    // kam an, reichte aber nicht mehr: seit v199 ist der Text kuerzer, und
    // die Tafel blieb mit 332 Punkten knapp im Bild. Eine Gegenprobe, deren
    // Eingriff ankommt und trotzdem nichts ausloest, beweist genauso wenig
    // wie eine, die gar nicht ankommt (Regel 3).
    // **Und der dritte Anlauf, aus demselben Grund wie der zweite.** Den
    // Kompaktblock ganz abzuschalten macht die Tafel 332 Punkte hoch - sie
    // passt damit immer noch ins Bild, weil der Text seit v199 kuerzer ist.
    // Der Eingriff kam an und loeste nichts aus. Gebraucht wird ein Eingriff,
    // der die Tafel WIRKLICH ueber den Rand schiebt; die Zeilenhoehe tut das
    // unmittelbar und ist als Tippfehler jederzeit denkbar.
    regel: /    width: min\(300px, 46vw\); padding: 8px 10px; font-size: 11\.5px; line-height: 1\.35;/,
    ersatz: '    width: min(300px, 46vw); padding: 8px 10px; font-size: 11.5px; line-height: 4.2;',
    tor: 'browsertor',
  },
  {
    // Und sie darf keine Null melden, wo der Browser gar nicht misst.
    name: 'Messtafel behauptet null lange Aufgaben',
    datei: 'src/core/messung.ts',
    // **Die Null darf nie dastehen** - sie hiesse "noch nicht gemessen",
    // "nichts gefunden" oder "gar nicht gemessen", und sah in allen drei
    // Faellen gleich aus. Die Probe stellt die alte, mehrdeutige Fassung
    // wieder her.
    //
    // Zwei Anlaeufe davor waren keine Proben: die eine erzwang die
    // Anmeldung des Beobachters (gelingt in Chromium ohnehin), die andere
    // brach das Einsammeln - was seit dieser Fassung zum richtigen Satz
    // "keine ueber 50 ms" fuehrt und damit gar kein Fehler mehr ist.
    //
    // **Auch diese Probe musste in v203 nachgezogen werden.** Sie ersetzte
    // nur den letzten Zweig - und das Browsertor sieht die Tafel bei
    // LAUFENDER Messung, wo der Zweig darueber greift und einen Strich
    // ausgibt. Der Eingriff kam an und war nie zu sehen. Jetzt faellt der
    // Strich mit weg, und die Null steht genau dort, wo das Tor hinsieht.
    //
    // **Und der Eingriff darf nicht selbst von einer Messung abhaengen.**
    // Die Fassung mit `${schlimmste} ms` schlug im gefilterten Lauf an und
    // im vollen nicht: unter Last findet der Browser wirklich lange
    // Aufgaben, dann steht dort "84 ms" statt "0 ms", und das Tor hat recht
    // zu schweigen. Eine Gegenprobe, deren Wirkung an der Auslastung des
    // Rechners haengt, ist keine. Jetzt steht die Null fest da - genau die
    // Ausgabe, die es nie geben darf.
    regel: /        : laeuft \? '—'\n          : schlimmste > 0 \? `\$\{schlimmste\} ms` : `keine über \$\{SOLL_MS\} ms`/,
    ersatz: "        : '0 ms'",
    tor: 'browsertor',
  },
  {
    // v197: ein einzelnes schlechtes Bild darf die Schleife nicht toeten.
    // Steht die Bestellung des naechsten Bildes am Ende, ist das Spiel nach
    // dem ersten Fehler fuer den Rest der Sitzung tot - genau der Befund
    // vom Zielgeraet ("konnte nichts mehr anklicken").
    name: 'Schleife stirbt am ersten Fehler',
    datei: 'src/core/loop.ts',
    regel: /      this\.raf = requestAnimationFrame\(tick\);\n      let dt/,
    ersatz: '      let dt',
    tor: 'smoke',
  },
  {
    // Und sie darf nicht ewig sinnlos weiterrechnen, ohne es zu sagen.
    name: 'Schleife gibt nie auf',
    datei: 'src/core/loop.ts',
    regel: /const AUFGEBEN_NACH = 120;/,
    ersatz: 'const AUFGEBEN_NACH = 1e9;',
    tor: 'smoke',
  },
  {
    // **Die Einfuehrung lief bis v195 kein einziges Mal.** Ihr Aufruf hing
    // am Titelknopf, und der war seit v43 `display: none`. Siebzehn Tore
    // gruen. Sie haengt jetzt an einem neuen Lauf.
    name: 'Die Einfuehrung faengt nie an',
    datei: 'src/ui/ui.ts',
    regel: /      else this\.starteEinfuehrung\(\);/,
    ersatz: '      else this.tutStep = -1;',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: sie darf einen GELADENEN Lauf nicht einweisen.
    name: 'Fortgesetzter Lauf bekommt die Einfuehrung',
    datei: 'src/game/state.ts',
    regel: /    this\.fortgesetzt = true;/,
    ersatz: '    this.fortgesetzt = false;',
    tor: 'smoke',
  },
  // **Gestrichen in v334: "Ueberspringen deckt die Kopfzeile zu".**
  //
  // Sie nahm `order: -1` vom Ueberspringen-Knopf und erwartete, dass er die
  // Kopfzeile zudeckt. Gemessen tut er das nicht: `order` ordnet die Kinder
  // INNERHALB des Einweisungsbands um, und das Band ist mit und ohne die
  // Zeile gleich hoch - 41 Punkte bei 190 Zeichen, beide Male (`npm run
  // streifen`).
  //
  // Der Schaden, den sie meinte, stammt aus der Zeit, als das Band keine
  // eigene Lage hatte. Seit v318 hat es eine, und seitdem misst
  // `textVerdeckung` in ACHT Zustaenden direkt, ob ein Element den Text
  // eines anderen zudeckt - mit eigenem Selbsttest (ein deckender Fleck ueber
  // der Goldzahl muss gefunden werden). Das haelt die Frage besser, als eine
  // Gegenprobe an einer Stilzeile es je konnte.
  {
    // Ein Knopf ohne Messung ist rot, nicht mehr nur ein Hinweis.
    name: 'Knopfklasse steht in keiner Messung',
    datei: 'index.html',
    suche: 'class="coach-skip" id="coach-skip"',
    ersatz: 'class="ueberspringen" id="coach-skip"',
    tor: 'beruehrung',
  },
  {
    // Der Ueberspringen-Knopf war 16 Punkte hoch, acht Fassungen lang.
    name: 'Ueberspringen wieder zu klein',
    datei: 'src/style.css',
    suche: ".coach-skip::after { content: ''; position: absolute; inset: -6px -14px -28px; }",
    ersatz: ".coach-skip::after { content: ''; position: absolute; inset: -1px; }",
    tor: 'beruehrung',
  },
  {
    // T9, v183: beim Kartenwechsel wird geraeumt. Ohne das lagen nach vier
    // Besuchen 51,4 MB in den Ablagen statt 23,4 - und der Zuwachs hoerte
    // nicht auf. Auf einem Telefon ist Speicher die knappere Ware.
    name: 'Kartenwechsel raeumt nicht mehr',
    datei: 'src/gfx/renderer.ts',
    regel: /^      if \(this\.terrainFor && this\.terrainFor !== s\.map\.id\) karteWechseln\(s\.map\.id\);$/m,
    ersatz: '      if (false) karteWechseln(s.map.id);',
    tor: 'speichertor',
  },
  {
    // Und die andere Haelfte: eine Ablage, die sich nicht anmeldet, wird
    // nie geraeumt - und niemand merkt es, weil die Summe nur langsamer
    // waechst. Die Turmbilder sind die groesste der angemeldeten.
    name: 'Eine Ablage meldet sich nicht mehr an',
    datei: 'src/gfx/towerart.ts',
    regel: /^ablageAnmelden\('Türme eingebettet', tinted, tintedTafel\);$/m,
    ersatz: 'void tintedTafel;',
    tor: 'speichertor',
  },
  {
    // T8, v182: der Kristall zeigt seinen Zustand - und zwar im Bild, nicht
    // nur im Quelltext. Bis v181 lagen die Risse hinter einem `return`, das
    // immer fiel: elf von zwoelf Bildern nahmen den Bildzweig.
    name: 'Rissebene wird nicht gestempelt',
    datei: 'src/gfx/renderer.ts',
    regel: /^        if \(riss\) drawSprite\(ctx, riss, x, y \+ h \* \(0\.5 - HOCH\)\);$/m,
    ersatz: '        if (false && riss) drawSprite(ctx, riss, x, y + h * (0.5 - HOCH));',
    tor: 'kristalltor',
  },
  {
    // Und die andere Haelfte: die Stufen muessen WACHSEN. Mischten sie sich
    // je Stufe neu, saehe man ein Flackern statt eines fortschreitenden
    // Zerbrechens - und die Deckung waere auf jeder Stufe dieselbe.
    name: 'Rissstufen wachsen nicht mehr',
    datei: 'src/gfx/sprites.ts',
    regel: /^      for \(let i = 0; i < n \* 2; i\+\+\) \{$/m,
    ersatz: '      for (let i = 0; i < 2; i++) {',
    tor: 'kristalltor',
  },
  {
    // C27, v181: der Endlosmodus zaehlt ueber den Wellenplan hinaus. Bis
    // v180 lief sein Ergebnis in denselben Bestwert wie die normale Partie,
    // und der Titelbildschirm behauptete danach auf einer Karte mit
    // fuenfzehn Wellen "bisher am weitesten: Welle 20".
    name: 'Endlos schreibt in den normalen Bestwert',
    datei: 'src/core/storage.ts',
    regel: /^  `\$\{mapId\}\|\$\{difficulty\}\$\{endlos \? '\|endlos' : ''\}`;$/m,
    ersatz: "  `${mapId}|${difficulty}` + (endlos ? '' : '');",
    tor: 'smoke',
  },
  {
    // Eine Pruefung, die nebenbei den Zustand aendert, den andere Pruefungen
    // lesen, ist keine Pruefung. Der Durchlauf spielt drei Partien zu Ende
    // und traegt dabei Sterne ein - stellt er sie nicht zurueck, faellt die
    // Sternepruefung darunter um.
    name: 'Durchlauf laesst seinen Fortschritt stehen',
    datei: 'tools/smoke.ts',
    regel: /^  Object\.assign\(fortschritt, JSON\.parse\(abdruckVorher\)\);$/m,
    ersatz: '  // Fortschritt nicht zurueckgestellt.',
    tor: 'smoke',
  },
  {
    // D2, v173: die Asche muss glimmen. Ohne Glut ist Aschefall
    // beigefarbener Schnee - und die erste Fassung dieser Pruefung hat das
    // NICHT gemerkt: sie fragte nach "warm", und der Ascheton ist selbst
    // warm. Sie meldete mit abgeschalteter Glut unveraendert 29 Prozent.
    // Gemessen wird jetzt die Saettigung, die nur die Glut hat.
    name: 'Der Ascheschlucht geht die Glut aus',
    datei: 'src/gfx/atmosphere.ts',
    regel: /^        const istGlut = art === 'asche' && rnd\(\) < 0\.125;$/m,
    ersatz: '        const istGlut = false;',
    tor: 'bildtor',
  },
  {
    // Und die Sparfassung: bei niedriger Qualitaet duenner, aber nicht aus.
    // Ein Ort, dessen Wetter auf schwachen Geraeten verschwindet, waere
    // dort ein anderer Ort.
    name: 'Wetter faellt bei niedriger Qualitaet ganz weg',
    datei: 'src/gfx/atmosphere.ts',
    regel: /^  regen: \[130, 60\],$/m,
    ersatz: '  regen: [130, 0],',
    tor: 'bildtor',
  },
  {
    // D5, v172: der Ansichtswechsel muss von SELBST anspringen. Wird `view`
    // wieder ein einfaches Feld, laeuft das Menue ohne Uebergang - und die
    // Pruefung auf den Versatz saehe nichts davon, weil sie die Uhr von Hand
    // stellt.
    name: 'Ansichtswechsel springt nicht mehr an',
    datei: 'src/game/menu.ts',
    regel: /^  set view\(v: MenuView\) \{\n    if \(v === this\._view\) return;\n    this\._view = v;\n    this\.wechselZeit = this\.time;\n  \}$/m,
    ersatz: '  set view(v: MenuView) { this._view = v; }',
    tor: 'smoke',
  },
  {
    // D5, v172: die Trefferflaechen wandern beim Ansichtswechsel MIT. Bleiben
    // sie an der Endlage, gibt es fuer zwei Zehntelsekunden Knoepfe, die man
    // sieht, aber nicht trifft - der Fehler, gegen den die Menuezeichnung von
    // Anfang an gebaut ist.
    name: 'Trefferflaechen bleiben beim Ansichtswechsel stehen',
    datei: 'src/gfx/menurender.ts',
    regel: /^    m\.hotspots\.push\(dy \? \{ \.\.\.h, y: h\.y \+ dy \} : h\);$/m,
    ersatz: '    m.hotspots.push(h);',
    tor: 'smoke',
  },
  {
    // Und der Waechter dagegen, dass eine Aufnahme mitten im Uebergang
    // faellt: bei 93 Prozent Deckkraft sieht ein Bild richtig aus und ist es
    // trotzdem nicht.
    name: 'Aufnahme faellt mitten im Ansichtswechsel',
    datei: 'tools/shots.mjs',
    regel: /  \/\/ aus sieht und es trotzdem nicht ist\.\n  return 20;/,
    ersatz: '  // aus sieht und es trotzdem nicht ist.\n  return 4;',
    tor: 'bildtor',
  },
  {
    // D12, v171: die Bilanz muss den ganzen Schaden zeigen. Eingebaut wird
    // der echte Fehler, den es bis v170 gab - die Balkenliste laeuft ueber
    // TOWER_ORDER, und die Zielunit steht da nicht drin.
    name: 'Bilanz laesst die Zielunit weg',
    datei: 'src/ui/statsblatt.ts',
    regel: /^  liste\.push\(\[TOWERS\.core\.name, TOWERS\.core\.accent, st\.damageBy\.core \?\? 0\]\);$/m,
    ersatz: '  // Zielunit weggelassen.',
    tor: 'smoke',
  },
  {
    // Beim HINSEHEN gefunden, nicht von einem Tor (Regel 8): das Blatt
    // meldete mitten in der ersten Welle "Wellen 0/15". Am Ende ist
    // "ueberstanden" die richtige Lesart, waehrend des Laufs die falsche.
    name: 'Bilanz zaehlt mitten im Lauf die ueberstandenen Wellen',
    datei: 'src/ui/statsblatt.ts',
    regel: /\? \[`Welle`, `\$\{Math\.max\(1, s\.waveNumber\)\}\/\$\{s\.totalWaves\}`\]/,
    ersatz: "? ['Welle', `${Math.max(0, s.waveNumber - 1)}/${s.totalWaves}`]",
    tor: 'smoke',
  },
  {
    // Regel 6 am Bilanzblatt: seine Sichtbarkeit wird ABGELEITET, nicht
    // gesetzt. Faellt die Ableitung weg, bleibt es nach dem Fortsetzen
    // offen liegen - genau die Verfallsart, die im Menue zweimal die
    // Spielbedienung sichtbar gelassen hat.
    name: 'Bilanzblatt haengt an einem Schalter',
    datei: 'src/ui/ui.ts',
    regel: /^    if \(this\.pauseMenu\.hidden\) this\.bilanzOffen = false;$/m,
    ersatz: '    // Ableitung entfernt.',
    tor: 'smoke',
  },
  {
    // Und die dritte Falle derselben Familie: `sync` steigt frueh aus, wenn
    // sich die Signatur nicht geaendert hat. Steht der Zustand nicht darin,
    // tut der Knopf alles richtig und die Anzeige folgt trotzdem nicht.
    name: 'Bilanzblatt fehlt in der Signatur',
    datei: 'src/ui/ui.ts',
    regel: /^      this\.bilanzOffen \? 'b' : '-',$/m,
    ersatz: "      '-',",
    tor: 'smoke',
  },
  {
    // v169: die Turmformmessung muss die STUFE sehen. Wird der Rueckfall auf
    // Stufe 1 festgenagelt, sind alle sechs Stufen dasselbe Bild - und der
    // Ausbau, fuer den man bis 1950 Gold zahlt, waere im Umriss nicht mehr
    // zu unterscheiden, ohne dass sich am Spiel etwas geaendert haette.
    name: 'Turmform misst jede Stufe als Stufe 1',
    datei: 'tools/readability.mjs',
    regel: /    for \(let l = level; l >= 1 && !buf; l--\) buf = towerArt\.get\(`\$\{id\}_1_\$\{l\}`\) \?\? null;/,
    ersatz: '    for (let l = 1; l >= 1 && !buf; l--) buf = towerArt.get(`${id}_1_${l}`) ?? null;',
    tor: 'lesbarkeit',
  },
  {
    // Und die andere Haelfte: vier Sorten, die auf dem Feld dieselbe Figur
    // sind. Eingebaut wird der echte Fehler - drei Sorten holen sich das
    // Bild des Moersers -, nicht das Entfernen der Pruefung.
    name: 'Drei Turmsorten mit demselben Bild',
    datei: 'tools/readability.mjs',
    regel: /buf = towerArt\.get\(`\$\{id\}_1_\$\{l\}`\) \?\? null;/,
    ersatz: 'buf = towerArt.get(`mortar_1_${l}`) ?? null;',
    tor: 'lesbarkeit',
  },
  {
    // Regel 13 an der Formmessung: wer eine Wirkung misst, schaltet sie
    // zuerst ab. Liefert `umriss` fuer jedes Bild dieselbe volle Maske,
    // ueberdecken sich ALLE Paare zu 1,00 - und die Paare, die heute allein
    // die Farbe traegt, muessen dann als neu und zu nah gemeldet werden.
    name: 'Silhouettenmessung sieht ueberall dieselbe Form',
    datei: 'tools/silhouette.ts',
    regel: /^  for \(let i = 0; i < W \* H; i\+\+\) if \(data\[i \* 4 \+ 3\] > 24\) maske\[i\] = 1;$/m,
    ersatz: '  for (let i = 0; i < W * H; i++) maske[i] = 1;',
    tor: 'lesbarkeit',
  },
  {
    // Und die Gegenrichtung, weil eine Ratsche sonst zum Freibrief wird:
    // findet die Formmessung NIRGENDS mehr eine Aehnlichkeit, trifft der
    // Eintrag Koloss/Spalter auf nichts - und ein Eintrag ohne Gegenstand
    // ist genau die Verfallsart, die dieses Verzeichnis viermal gekostet
    // hat.
    name: 'Silhouettenmessung findet nie eine Aehnlichkeit',
    datei: 'tools/silhouette.ts',
    regel: /^  return oder \? und \/ oder : 1;$/m,
    ersatz: '  return oder ? 0 : 1;',
    tor: 'lesbarkeit',
  },
  {
    // TF-030: die Figuren wachsen ueber die Strasse hinaus.
    name: 'Gegner passen nicht mehr auf die Strasse',
    datei: 'src/gfx/enemyart.ts',
    regel: /  const roh = Math\.max\(ENEMIES\[id\]\.radius \* 3\.0, 50\);/,
    ersatz: '  const roh = Math.max(ENEMIES[id].radius * 6.0, 50);',
    tor: 'gedraengetor',
  },
  {
    // Und die Gegenrichtung: die Strasse schrumpft unter die Figuren.
    name: 'Strasse schrumpft unter die Gegner',
    // **Mit den Punkten umgezogen (v278).** Die Wegbreite steht seit dem
    // Umbau auf `WEGNETZ` in `wegnetz.ts` - in `maps.ts` gibt es kein `w`
    // mehr, und die Regel traf ins Leere. Gemeldet hat es `npm run muster`
    // in demselben Lauf, in dem der Umzug stattfand.
    datei: 'src/data/wegnetz.ts',
    regel: /w: (\d+) \}/g,
    ersatz: 'w: 18 }',
    tor: 'gedraengetor',
  },
  {
    // **Die Gegenprobe auf "hinten" ist in v237 entfallen** - den Modus gibt
    // es nicht mehr. Er hatte seinen einzigen (geteilten) Sieg auf der
    // dritten Bahn der Ascheschlucht, und die war der Fehler, der aus dem
    // Spiel gemeldet wurde: eine Verteidigung fuer eine der drei Bahnen sah
    // von den anderen 35 %. Mit zwei gut gedeckten Bahnen entscheidet die
    // Reihenfolge nichts mehr, und `npm run sim` hat es gemeldet.
    //
    // An ihre Stelle tritt die Probe auf den Modus, der die Lage jetzt
    // anders liest als "vorn": "nah" nimmt den naechsten statt den
    // vordersten. Macht man daraus eine Kopie von "vorn", muss der
    // Rauchtest es sehen.
    name: 'Zielmodus nah wirkt wie vorn',
    datei: 'src/game/state.ts',
    regel: /            : -d2;/,
    ersatz: '            : e.travelled;',
    tor: 'smoke',
  },
  {
    // Und derselbe Eingriff gegen das Balance-Tor: dort wird nicht geprueft,
    // ob der Modus ANDERS waehlt, sondern ob er etwas NUETZT. Seit v237 auf
    // "nah" statt auf "hinten" - der Modus, der als letzter dazugekommen
    // ist, muss sich rechtfertigen wie jeder andere.
    name: 'Zielmodus nah nuetzt nichts',
    datei: 'src/game/state.ts',
    regel: /            : -d2;/,
    ersatz: '            : e.travelled;',
    tor: 'sim',
  },
  {
    // Die Knopfreihe: feste vier Spalten bei fuenf Modi.
    // **Die feste Zahl muss UNTER der Modizahl liegen, sonst ist es kein
    // Eingriff.** Bis v236 stand hier 4 bei fuenf Modi; seit "hinten"
    // entfallen ist, sind es vier - und `repeat(4, ...)` waere dasselbe wie
    // die Ableitung. Drei bricht die Reihe bei jeder Modizahl ab drei.
    name: 'Zielreihe bricht auf zwei Zeilen um',
    datei: 'src/ui/ui.ts',
    regel: /      `repeat\(\$\{ZIELWAHL_ORDNUNG\.length\}, minmax\(0, 1fr\)\)`;/,
    ersatz: "      'repeat(3, minmax(0, 1fr))';",
    tor: 'browsertor',
  },
  {
    // Ungleiche Spalten: die Wortlaenge entscheidet, wie leicht ein Modus zu
    // treffen ist.
    //
    // **`1fr` reicht als Eingriff nicht mehr.** Es verteilt den Ueberschuss
    // gleichmaessig und faellt nur auf, wenn ein Wort lang genug ist, um die
    // Spalte zu sprengen - solange die fuenf Woerter kurz sind, kommt der
    // Eingriff an und aendert nichts (Regel 3). `auto` misst jede Spalte an
    // ihrem Inhalt und macht damit sichtbar, was gemeint ist: "Nah" bekommt
    // weniger Flaeche als "Hinten", ohne dass es dafuer einen Grund gaebe.
    name: 'Zielknoepfe verschieden breit',
    datei: 'src/ui/ui.ts',
    regel: /      `repeat\(\$\{ZIELWAHL_ORDNUNG\.length\}, minmax\(0, 1fr\)\)`;/,
    ersatz: '      `repeat(${ZIELWAHL_ORDNUNG.length}, auto)`;',
    tor: 'browsertor',
  },
  {
    // Eine Beschriftung, die nicht hineinpasst.
    name: 'Zielknopf schneidet sein Wort ab',
    datei: 'src/game/types.ts',
    regel: /  schwach: 'Wund',/,
    ersatz: "  schwach: 'Schwaechster',",
    tor: 'browsertor',
  },
  {
    // TF-019: die Muendung wieder in die Turmmitte legen.
    name: 'Schuesse kommen wieder aus dem Sockel',
    datei: 'src/data/turmgestalt.ts',
    // Am Ergebnis angesetzt, nicht am Verzeichnis: der erste Anlauf schob
    // ein leeres Objekt VOR die Eintraege - die standen danach immer noch da,
    // und die Probe bewies nichts (Regel 3).
    regel: /  const m = MUENDUNG\[id\];\n  if \(!m\) return \{ x: 0, y: 0 \};/,
    ersatz: '  const m = MUENDUNG[id];\n  if (m || !m) return { x: 0, y: 0 };',
    tor: 'muendungstor',
  },
  {
    // Ein Punkt, der neben der Figur liegt - das Rohr endet im Nichts.
    name: 'Muendung schwebt neben dem Turm',
    datei: 'src/data/turmgestalt.ts',
    regel: /^  mortar: \{ x: 0\.280, y: 0\.012, dreht: false \},$/m,
    ersatz: '  mortar: { x: 0.93, y: 0.012, dreht: false },',
    tor: 'muendungstor',
  },
  {
    // Die alte Muendung des Bogenturms - richtig auf dem Armbrustbild, falsch
    // auf der Zwillingskanone: dort liegt auf der Mittelachse Luft zwischen
    // den Laeufen. Sie kommt nur durch, wenn das Tor die STUFENLOSE
    // Rueckfallfassung misst statt der gezeichneten Stufe. Genau das war der
    // Fehler, den v160 aufgehoben hat.
    name: 'Muendung wieder auf der Mittelachse',
    datei: 'src/data/turmgestalt.ts',
    regel: /^  arrow: \{ x: 0\.352, y: 0\.031, dreht: true \},$/m,
    ersatz: '  arrow: { x: 0.5, y: 0.074, dreht: true },',
    tor: 'muendungstor',
  },
  {
    // Die Querlage wieder unterschlagen: dann sitzt die Muendung auf der
    // Zielachse, egal was in `x` steht - und der Blitz erscheint zwischen
    // den Laeufen in der Luft.
    name: 'Drehende Waffe unterschlaegt die Querlage',
    datei: 'src/data/turmgestalt.ts',
    regel: /^    const quer = \(m\.x - 0\.5\) \* ww;$/m,
    ersatz: '    const quer = 0;',
    tor: 'muendungstor',
  },
  {
    // Die Rueckfallkette abgeschaltet: dann finden Stufe 5 und 6 des
    // Bogenturms keine Waffe mehr, und der Rauchtest muss das melden.
    // Trifft zugleich den Renderer - beide lesen dieselbe Kette.
    name: 'Rueckfallkette der Bildstufen abgeschaltet',
    datei: 'src/gfx/objectart.ts',
    regel: /^  for \(let l = Math\.max\(1, Math\.round\(level\)\); l >= 1; l--\) \{$/m,
    ersatz: '  if (!(`${basis}_${Math.round(level)}` in OBJECT_ART)) return null;\n'
      + '  for (let l = Math.max(1, Math.round(level)); l >= 1; l--) {',
    tor: 'smoke',
  },
  {
    // Und einer, der im Sockel sitzt statt oben am Rohr.
    name: 'Muendung sitzt im Sockel',
    datei: 'src/data/turmgestalt.ts',
    regel: /^  prism: \{ x: 0\.316, y: 0\.012, dreht: false \},$/m,
    ersatz: '  prism: { x: 0.5, y: 0.62, dreht: false },',
    tor: 'muendungstor',
  },
  {
    // Der Frostturm hat kein Rohr - ein Eintrag waere eine Behauptung ueber
    // ein Bild, das keine Waffe zeigt.
    name: 'Frostturm bekommt ein Rohr angedichtet',
    datei: 'src/data/turmgestalt.ts',
    regel: /  \/\/ Der Frostturm hat kein Rohr/,
    ersatz: '  frost: { x: 0.5, y: 0.05, dreht: false },\n  // Der Frostturm hat kein Rohr',
    tor: 'muendungstor',
  },
  {
    // Die teuerste Lehre dieser Runde: der Versatz ist Hoehe im Bild. Wer
    // ihn in die Flugbahn zurueckholt, macht das Spiel messbar schwerer,
    // ohne dass eine Balancezahl es erklaeren wuerde.
    name: 'Muendungsversatz rutscht in die Flugbahn',
    datei: 'src/game/state.ts',
    regel: /    p\.x = t\.x; p\.y = t\.y; p\.sx = t\.x; p\.sy = t\.y; p\.tx = aim\.x; p\.ty = aim\.y;/,
    ersatz: '    p.x = t.x + m.x; p.y = t.y + m.y; p.sx = p.x; p.sy = p.y; p.tx = aim.x; p.ty = aim.y;',
    tor: 'muendungstor',
  },
  {
    // TF-007: das Ersatzziel wieder ausgebaut - dann verpufft wieder jeder
    // achte Schuss, und das Tor muss das sehen.
    name: 'Verwaiste Geschosse verpuffen wieder',
    datei: 'src/game/state.ts',
    regel: /      if \(!tgt\) tgt = this\.ersatzziel\(p\);/,
    ersatz: '      // Ersatzziel abgeschaltet.',
    tor: 'geschossetor',
  },
  {
    // Und der Suchraum selbst: auf Null gesetzt findet die Suche nie etwas.
    name: 'Suchraum fuer das Ersatzziel auf Null',
    datei: 'src/game/state.ts',
    regel: /export const ERSATZ_UMKREIS = 240;/,
    ersatz: 'export const ERSATZ_UMKREIS = 0;',
    tor: 'geschossetor',
  },
  {
    // Der Luftfilter im Ersatzziel. Ohne ihn nimmt ein bodengebundener
    // Schuetze einen Gleiter als Ersatz - eine Waffe, die er nicht hat.
    name: 'Ersatzziel nimmt auch Flieger',
    datei: 'src/game/state.ts',
    regel: /      if \(!p\.luft && ENEMIES\[e\.def\]\.flying\) continue;/,
    ersatz: '      // Luftfilter entfernt.',
    tor: 'geschossetor',
  },
  {
    // Der Kegel: weit geoeffnet nimmt ein Schuss auch ein Ziel HINTER sich an
    // und macht kehrt. Der Verpuffungsanteil wuerde dabei sogar besser - nur
    // die Richtungsmessung faellt darauf nicht herein.
    name: 'Der Suchkegel oeffnet sich nach hinten',
    datei: 'src/game/state.ts',
    regel: /export const ERSATZ_KEGEL = 0\.766;/,
    ersatz: 'export const ERSATZ_KEGEL = -1;',
    tor: 'geschossetor',
  },
  {
    // TF-016: ein bezahlter Schuss verfaellt, weil der Turm verkauft wurde.
    name: 'Verkauf loescht den Schuss in der Luft',
    datei: 'src/game/state.ts',
    regel: /    t\.target = null;\n    compact\(this\.towers, \(o\) => o === t\);/,
    ersatz: '    t.target = null;\n    for (const p2 of this.projectiles) if (p2.owner === t) p2.dead = true;\n    compact(this.towers, (o) => o === t);',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: ein Schuss, der schon unterwegs ist, wird durch
    // einen Ausbau nachtraeglich staerker.
    name: 'Ausbau wirkt rueckwirkend auf fliegende Schuesse',
    datei: 'src/game/state.ts',
    regel: /    t\.branch = chosen;\n    t\.level\+\+;/,
    ersatz: '    t.branch = chosen;\n    t.level++;\n    for (const p2 of this.projectiles) if (p2.owner === t) p2.damage = this.towerStats(t).damage;',
    tor: 'smoke',
  },
  {
    // TF-023: das Schildzeichen fehlt wieder. Bis v151 stand der Schild nur
    // im handgeschriebenen Satz - wer eine Welle ohne Satz baute, bekam
    // keinen Hinweis, und niemand haette es gemerkt.
    name: 'Schildzeichen fehlt in der Vorschau',
    datei: 'src/ui/ui.ts',
    regel: /      if \(schild\.has\(id\)\) marken\.push\('Schild'\);\n/,
    ersatz: '',
    tor: 'smoke',
  },
  {
    // Und dasselbe fuer den Traeger. Zwei Proben, nicht eine: die beiden
    // Zeilen koennen einzeln verschwinden, und eine Probe, die nur die
    // erste zieht, bezeugt die zweite nicht.
    name: 'Traegerzeichen fehlt in der Vorschau',
    datei: 'src/ui/ui.ts',
    regel: /      if \(traeger\.has\(id\)\) marken\.push\('Träger'\);\n/,
    ersatz: '',
    tor: 'smoke',
  },
  {
    // Das Sprungzeichen an JEDER Welle - aus einer einzigen zu kleinen Zahl.
    // Ein Zeichen, das immer dasteht, warnt vor nichts (Regel 13).
    name: 'Sprungzeichen an jeder Welle',
    datei: 'src/data/waves.ts',
    regel: /export const SPRUNG = [0-9.]+;/,
    ersatz: 'export const SPRUNG = 0.01;',
    tor: 'smoke',
  },
  {
    // Der Streifen quetscht den Erklaersatz wieder zur Saeule. Genau der
    // Zustand vor v151: Welle 15 wurde 94 statt 49 Bildpunkte hoch, und
    // das Browsertor sah es nicht, weil es nur Welle 1 kennt.
    name: 'Wellenvorschau quetscht den Satz',
    datei: 'src/style.css',
    regel: /  display: flex; align-items: center; gap: 26px 10px; flex-wrap: wrap;/,
    ersatz: '  display: flex; align-items: center; gap: 26px 10px; flex-wrap: nowrap;',
    tor: 'streifentor',
  },
  {
    // v151 lief hier gruen durch alle 25 Tore und brach im Ablaufplan ab:
    // ein festgeschriebener Chromium-Pfad, den es nur in dieser Umgebung
    // gibt. Der Waechter faengt die zweite Kopie ab - diese Probe faengt
    // den Waechter ab.
    name: 'Ein Werkzeug schreibt den Chromium-Pfad fest',
    datei: 'tools/streifen.ts',
    regel: /const browser = await browserStarten\(\);/,
    // Der Pfad wird ZUSAMMENGESETZT, nicht hingeschrieben: sonst traegt die
    // Probe selbst, wonach der Waechter sucht, und meldet sie als Fehler.
    // Eingebaut wird trotzdem der volle Pfad - der Eingriff ist derselbe.
    ersatz: "const browser = await (await import('playwright')).chromium.launch("
      + `{ executablePath: '/${'opt'}/pw-browsers/chromium' });`,
    tor: 'guards',
  },
  {
    // TF-034: der Konter-Satz kommt gar nicht mehr an. Der Rauchtest misst
    // die Blase im DOM - ohne diese Zeile bleibt sie leer.
    name: 'Konter-Satz erscheint nicht',
    datei: 'src/ui/ui.ts',
    regel: /    const frisch = this\.neuerKonter\(\);\n    if \(frisch\) \{[^\n]*\n/,
    ersatz: '    const frisch = null;\n',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: er bleibt stehen, wenn die Welle laeuft. Dann
    // ist er kein Rat mehr, sondern ein Vorwurf - und er verdeckt das Feld.
    name: 'Konter-Satz bleibt im Kampf stehen',
    datei: 'src/ui/ui.ts',
    regel: /        done: \(g2\) => g2\.waveActive \|\| !g2\.canStartWave,/,
    ersatz: '        done: () => false,',
    tor: 'smoke',
  },
  {
    // Regel 13 am Tor selbst: wenn JEDE Gegnerart etwas bekommt, hebt der
    // Satz nichts mehr hervor. Eine zu weiche Grenze sieht aus wie
    // Vollstaendigkeit.
    name: 'Jede Gegnerart bekommt einen Konter',
    datei: 'src/data/konter.ts',
    regel: /  if \(d\.speed >= mitte \* 1\.5\) \{/,
    ersatz: '  if (d.speed >= 0) {',
    tor: 'kontertor',
  },
  {
    // Regel 15 am Tor: eine abgeleitete Tatsache kehrt in einen
    // handgeschriebenen Wellensatz zurueck. Genau der Zustand vor v152.
    name: 'Wellensatz erzaehlt den Konter noch einmal',
    datei: 'src/data/waves.ts',
    regel: /note: 'Erster Koloss'/,
    ersatz: "note: 'Erster Koloss — Panzerung 3'",
    tor: 'kontertor',
  },
  {
    // Die Einweisungsblase waechst - aber nicht am Text, sondern an der
    // Stilvorlage.
    //
    // Die erste Fassung dieser Probe schrieb einen sehr langen Satz und
    // bewies NICHTS: `kontertor` deckelt bei 190 Zeichen, und so weit reicht
    // die Hoehengrenze gar nicht. Nachgemessen kostet ein 451-Zeichen-Satz
    // 71 Punkte, zusammen mit der Vorschau 120 von 130 - knapp darunter, und
    // ein Zustand, den ein anderes Tor ohnehin verbietet. Eine Probe auf
    // einen unerreichbaren Zustand ist keine.
    //
    // Erreichbar ist der Schriftgrad: er steht in derselben Datei wie alles
    // andere und aendert die Hoehe sofort. Das ist die Bruchstelle, die
    // dieses Tor wirklich bewacht.
    //
    // Und die zweite Fassung bewies wieder nichts, aus einem lehrreichen
    // Grund: `.coach-text` steht ZWEIMAL in der Stilvorlage - mit 12,5 px
    // allgemein und mit 11,5 px im Kompaktblock unter
    // `@media (max-height: 480px)`. Auf dem Zielgeraet gilt der zweite, und
    // die Probe hatte den ersten angefasst. Regel 15, hier einmal als
    // Falle fuer die Probe statt fuer den Code: gegriffen werden muss die
    // Regel, die auf dem gemessenen Geraet WIRKT.
    name: 'Einweisungsblase waechst ueber das Feld',
    datei: 'src/style.css',
    // Die eigene Groesse der Blase ist mit der Typoskala entfallen (v241);
    // sie nimmt jetzt `--s-text`. Der Eingriff greift deshalb die Stufe
    // selbst - dieselbe Wirkung, und er wandert mit, wenn die Skala einmal
    // umgebaut wird.
    regel: /    --s-text: 12px;/,
    ersatz: '    --s-text: 23px;',
    tor: 'streifentor',
  },
  {
    // TF-011: die Sonne wandert. `LICHT` ist die Richtung, mit der der
    // Renderer jeden Schatten zeichnet - dreht man sie, sind alle Figuren
    // ploetzlich von der falschen Seite beleuchtet, ohne dass sich ein
    // einziges Bild geaendert haette. Genau das soll die Messung sehen.
    name: 'Die Sonne steht woanders',
    datei: 'src/data/config.ts',
    regel: /export const LICHT = \{ x: 0\.62, y: 0\.78 \};/,
    ersatz: 'export const LICHT = { x: -0.62, y: -0.78 };',
    tor: 'grafiktor',
  },
  {
    // Und die Pruefung selbst: eine leere Liste besteht jede Pruefung.
    // Faengt die Auswahl keine Figur mehr ein, meldet das Tor gruen ueber
    // gar nichts - der haeufigste Weg, auf dem eine Messung aufhoert zu
    // messen, ohne dass etwas rot wird (Regel 5).
    name: 'Lichtmessung faengt keine Figur ein',
    datei: 'tools/artaudit.mjs',
    regel: /\.\.\.\[\.\.\.tw\]\.filter\(\(\[k\]\) => \/_1_1\$\/\.test\(k\)\), \.\.\.en\]/,
    ersatz: '...[...tw].filter(([k]) => /_9_9$/.test(k))]',
    tor: 'grafiktor',
  },
  {
    // Der Abdruck der teuren Tore (v154). Er darf NIE dazu fuehren, dass ein
    // echter Fehler durchrutscht: `maps.ts` gehoert zur Huelle von
    // `zielplatte`, also muss das Tor nach dieser Aenderung wieder rechnen
    // UND rot werden. Ohne die Probe waere ein zu enger Abdruck nicht von
    // einem bestandenen Tor zu unterscheiden.
    //
    // Zweimal hintereinander gefahren waere noch schaerfer, aber die
    // Probenumgebung faehrt jedes Tor genau einmal - und einmal genuegt:
    // der vorige gruene Lauf hat den Abdruck hinterlassen, dieser hier
    // muss ihn verwerfen.
    name: 'Abdruck verschlaeft eine geaenderte Karte',
    datei: 'src/data/maps.ts',
    regel: /  ziel: \{ x: 1734, y: 454 \},/,
    ersatz: '  ziel: { x: 1200, y: 506 },',
    tor: 'zielplattentor',
  },
  {
    // TF-012: das Randlicht abgeschaltet. Regel 13 in ihrer reinsten Form -
    // wer eine Wirkung misst, schaltet sie zuerst ab. Ohne diese Probe
    // koennte das Randlicht ein Fuellwort sein, das die Zahl nicht bewegt.
    //
    // Gemessen: ohne faellt der schwaechste Saum von 1,80 auf 1,26 und vier
    // von 24 Messungen rutschen unter 1,5.
    name: 'Randlicht abgeschaltet',
    datei: 'src/gfx/einbettung.ts',
    regel: /^export const RANDLICHT_STAERKE = 0\.75;$/m,
    ersatz: 'export const RANDLICHT_STAERKE = 0;',
    tor: 'einbettungstor',
  },
  {
    // Eine Teillieferung loescht alles, was nicht mitgeliefert wurde.
    //
    // Der Fehler hat in diesem Werkzeug schon einmal 1,2 MB gepackte Bilder
    // gekostet - damals fehlten ALLE Quellen. Repariert wurde der Fall, nicht
    // die Klasse: fehlen EINIGE, fiel der Rest bis v157 still heraus. Beim
    // Durchstich mit drei neuen Gegnern blieben drei von acht uebrig, und
    // `npm run art` meldete gruen dazu.
    //
    // Erreichbar ist der Fehler nur ueber den Selbsttest: `art/roh/` liegt
    // nicht in Git, also gibt es in der Gegenprobe kein einziges Rohbild -
    // und ohne Rohbild laeuft der Packweg gar nicht erst an.
    name: 'Teillieferung leert den Bildvorrat',
    datei: 'tools/pack-art.mjs',
    regel: /^        rows\.push\(\{ key, buffer: alt, uebernommen: true \}\);$/m,
    ersatz: '        void alt;',
    tor: 'art',
  },
  {
    // v233: das Budget wird an dem gemessen, was AUSGELIEFERT wird - nicht
    // am Packlauf. Vorher hing die Pruefung an drei Bedingungen, die fast
    // nie zutreffen: Rohbilder da, Abdruck geaendert, jeder Eintrag neu
    // gepackt. Auf dem Runner gibt es `art/roh` gar nicht, dort lief sie
    // NIE. Eingecheckt stand die Gruppe "untergrund" dabei auf 346 KB
    // gegen ein Budget von 250, und keines der einunddreissig Tore sagte
    // ein Wort.
    //
    // **Der Eingriff setzt die Grenze auf 1 KB, und das ist mit Absicht
    // genau dieses Feld:** `budgetKb` steht bewusst NICHT im Abdruck
    // (siehe `fingerprint`), eine Aenderung daran loest also keinen
    // Packlauf aus. Damit kann nur die neue Messung am ausgelieferten
    // Buendel anschlagen - die alte Summe entsteht beim Packen und kaeme
    // hier gar nicht erst zustande. Ein Eingriff, den nur die gepruefte
    // Sache sehen kann (Regel 13).
    // **Die zweite Reparatur derselben Runde hat KEINE Gegenprobe, und das
    // steht hier statt einer erfundenen.** `total` zaehlt beim Packen jetzt
    // auch die uebernommenen Eintraege - das wirkt nur in einem Lauf, der
    // wirklich packt, also mit Rohbildern und geaendertem Abdruck. `art/roh/`
    // liegt nicht in Git, auf dem Runner gibt es die Lage nie, und ein
    // Eingriff, der dort folgenlos bleibt, saehe aus wie ein bestandenes Tor
    // (dieselbe Falle wie "Werkstatt wartet nicht auf die Bilder" in v225,
    // die auf zwei Rechnern Verschiedenes bewies).
    //
    // Tragend ist ohnehin die Messung hier: sie braucht keinen Packlauf. Die
    // Summe beim Packen ist der Bericht, nicht der Beweis. Von Hand
    // nachgefahren (v233): mit `total += 0` meldet der Packlauf 0 KB statt
    // 260.
    name: 'Budget der Buendel wird nicht mehr geprueft',
    datei: 'art/untergrund.json',
    regel: /^ "budgetKb": 300,$/m,
    ersatz: ' "budgetKb": 1,',
    tor: 'art',
  },
  {
    // TF-015: die Wirkungen verschmelzen wieder zu einem Eintrag je Art -
    // genau die Semantik der beiden alten Felder. Dann traegt eine starke
    // kurze Bremse die Dauer einer schwachen langen, und der Rauchtest muss
    // das sehen.
    name: 'Wirkungen verschmelzen zu einer',
    datei: 'src/data/wirkungen.ts',
    regel: /    if \(Math\.abs\(w\.staerke - staerke\) < 1e-9\) \{/,
    ersatz: '    if (true) {',
    tor: 'smoke',
  },
  {
    // Und die Gegenrichtung: die Liste waechst mit jedem Bild. Eine Aura
    // legt in JEDEM Bild an - ohne das Wiedererkennen waeren das nach zehn
    // Sekunden sechshundert Eintraege je Gegner.
    //
    // Der Eingriff nimmt das Wiedererkennen der ART weg, nicht das
    // Auffrischen: das Wachstum ist DOPPELT abgesichert (Auffrischen bei
    // gleicher Staerke und Ueberdeckung bei schwaecherer), und ein Eingriff
    // an nur einer der beiden Stellen erreicht es gar nicht. Die erste
    // Fassung dieser Probe zielte auf das Auffrischen und blieb gruen.
    name: 'Wirkungsliste waechst mit jedem Bild',
    datei: 'src/data/wirkungen.ts',
    regel: /    if \(w\.art !== art\) continue;/,
    ersatz: '    continue;',
    tor: 'smoke',
  },
  {
    name: 'Ein Abschnitt wie der andere',
    datei: 'src/data/difficulty.ts',
    // **Neu angesetzt in v314** (S-N1-05). Vorher machte sie "Ruhig" haerter
    // als "Normal" und verlangte, dass der Waechter die verdrehte Reihenfolge
    // meldet. Die Grade sind entfallen; die Reihenfolge, die das Spiel heute
    // hat, ist die der ABSCHNITTE. Steht die Steigung auf 1, liegt jeder
    // Abschnitt gleichauf mit dem vorigen - dieselbe Verdrehung, ein
    // Gegenstand weiter.
    regel: /export const LAUF_STEIGUNG = [0-9.]+;/,
    ersatz: 'export const LAUF_STEIGUNG = 1.0;',
    tor: 'guards',
    // Nicht bloss "wird rot": genau diese Pruefung soll anschlagen.
    meldet: 'nicht haerter als',
  },
  {
    // **Die erste Gegenprobe fuer `bench` ueberhaupt** (S-N0-04). Von den 33
    // Kettenschritten hatten vier keine: `build` und `bericht` sind keine
    // Tore, `bahntreuetor` ist seit v233 bekannt gegenstandslos - und `bench`
    // war schlicht unbewiesen.
    //
    // **Der Versuch, sie zu bauen, hat gezeigt, warum es keine gab: das Tor
    // konnte nichts melden.** Es mass 0,081 ms gegen ein Budget von 4 - und
    // nimmt man dem Spiel das ganze Umkreisraster weg, misst es 0,079. Der
    // Umbau in v272 steht im Kopf von `tools/bench.ts`; hier steht nur, was
    // die Probe stellt.
    //
    // Gestellt wird der Fehler, gegen den dieses Tor ueberhaupt steht: die
    // Zellenkante des Umkreisrasters wird so gross, dass alle Gegner in
    // derselben Zelle liegen. Jede Abfrage gibt dann jeden Gegner zurueck -
    // das Ergebnis bleibt richtig, nur der Aufwand haengt wieder an der
    // Gesamtzahl statt an der Dichte. Ein verstellter Kantenwert ist auch
    // der wahrscheinlichste Weg, auf dem das im Ernst passiert.
    //
    // Gemessen: Dichtefaktor 5,83 bis 6,71 ueber fuenf Laeufe mit Raster,
    // 12,38 bis 13,06 ueber vier ohne. Keine Ueberschneidung, und die
    // Ratsche laesst bei einem Stand von 5,95 bis 7,74 zu.
    //
    // **Ein schwaecherer Eingriff war zuerst da und ist verworfen:** das
    // Raster alle Zellen durchsuchen zu lassen statt nur der beruehrten.
    // Der meldet zwar (8,70 gegen 7,74), aber nur mit 12 % Abstand zur
    // Schwelle - denn er verteuert auch die duenne Last, und im Verhaeltnis
    // kuerzt sich das halb heraus. Eine Gegenprobe, die im Rauschen des
    // naechsten Rechners verschwinden kann, ist keine.
    //
    // Als Regel, nicht als Muster: die Kantenlaenge ist eine Zahl, die sich
    // aendert, sobald jemand das Raster nachstellt.
    // **Ein fehlendes Bild war bis v272 unsichtbar** (S-N0-05). Jedes der
    // vier Bildmodule faellt bei fehlendem Eintrag auf `null` zurueck, der
    // Renderer zeichnet dann seine eigene Form, und die sieht ordentlich
    // aus. Kein Tor hat je gefragt, ob der Vorrat vollstaendig IST - es gab
    // gar keine Stelle, an der stand, was vollstaendig heisst.
    //
    // Gestellt wird genau der Fall: ein Bild aus dem Vorrat nehmen. Das Tor
    // muss es NENNEN und trotzdem gruen bleiben - deshalb `meldet` statt
    // `schlaegt an`. Ein fehlendes Bild ist kein Fehler im Code, sondern
    // eine laufende Bestellung; wuerde der Lauf daran rot, stuende die Kette
    // bis zur Lieferung still, und genau davor soll K5 sie bewahren.
    //
    // Als Regel und ohne Namen: `src/gfx/assets/enemies.ts` ist von
    // `pack-art` ERZEUGT, und welche Gegnerart dort zuerst steht, ist keine
    // Zusage. Eine Probe auf `'crawler'` veraltete beim ersten Umbau des
    // Bildvorrats - und der steht dem Neubau bevor.
    // **Bis v273 sah die Lesbarkeitsmessung die Helligkeit des Bodens gar
    // nicht** - sie rechnete jede Figur gegen das gepackte ROHBILD statt
    // gegen das gebackene Terrain, das der Spieler sieht. Gefunden hat es
    // ein Durchlauf, kein Verdacht (Regel 9): `BODEN_HELL` von 0,355 bis
    // 0,14 durchprobiert, sechs Werte, sechsmal exakt dieselbe Zahl.
    //
    // Diese Probe haelt genau das fest. Sie hellt den Boden auf; damit
    // sinkt der Kontrast jeder Figur gegen ihn, und das Tor muss es melden.
    // Vor v274 waere sie stumm geblieben - dieselbe Klasse wie die vier
    // Messplaetze aus v219, nur schlimmer, weil dieser nie etwas gemessen
    // hat statt es irgendwann zu verlernen.
    //
    // Als Regel auf die Zahl: die Backhelligkeit ist ein Wert, der sich
    // aendert, sobald jemand am Untergrund dreht - zuletzt in v232 von 0,52
    // auf 0,37 an einer Karte.
    // **Die Lesbarkeit misst seit v275 zwei Flaechen je Karte** - den Weg,
    // auf dem die Gegner laufen, und den Boden daneben. Sie stehen 53,6 bis
    // 60,9 Farbschritte auseinander, und das ist gewollt: `wegdeckung`
    // pflegt dieselbe Zahl als Abnahme im Band 40 bis 90.
    //
    // Die zwei Ratschen darauf sind EINSEITIG - sie schlagen an, wenn es
    // schlechter wird, nicht wenn weniger gemessen wird. Faellt die
    // Wegflaeche weg, faellt die schlechtere der beiden Flaechen weg, die
    // Zahlen werden besser, und alles bliebe still. Genau die Verfallsart,
    // die dieses Werkzeug in v274 selbst hatte.
    //
    // Der Eingriff nimmt die Wegflaeche heraus, indem die Schlauchgrenze
    // unerreichbar wird. Das Tor muss es NENNEN.
    // **Seit v277 hat der Bildauftrag zwei Stilbloecke** - den alten fuer den
    // ausgelieferten Vorrat, den neuen fuer alles, was ab jetzt bestellt
    // wird. `npm run bildprompt` steht nicht in der Torkette, also holt
    // `guards` das Lesen beider Bloecke in die Kette (dieselbe Bewegung wie
    // in v229 fuer die Abnahmegrenzen: ein Werkzeug, dessen Eingang niemand
    // prueft, ist im Ernstfall kaputt - und der Ernstfall ist genau der Tag,
    // an dem ein Bild bestellt wird).
    //
    // Der Eingriff nimmt dem Abschnitt seine Ueberschrift. Der Block ist
    // dann nicht mehr zu finden, die neuen Prompts gingen mit stehendem
    // Platzhalter heraus - also mit einem Bruchstueck an den Bild-Agenten.
    name: 'Der Stilblock Neubau ist nicht mehr zu finden',
    datei: 'docs/Towerfront-BILDAUFTRAG.md',
    regel: /### 8d\.0 Der Stilblock Neubau/,
    ersatz: '### 8d.0 Stilangaben',
    tor: 'guards',
  },
  {
    // **Eine entschaerfte Monokulturwelle bestraft niemanden** (S-N6-04).
    // Der Eingriff nimmt ihr die zwei Titanen - genau die Gruppe, die
    // Frostturm und Prisma trifft. Ohne sie halten beide die Welle mit null
    // Verlust, und die Messung muss das MELDEN: ein Vergleich, bei dem das
    // beste reine Feld null verliert, prueft nichts (Regel 5).
    //
    // Gegriffen wird die GRUPPE und nicht ihre Zahlen: wieviele Titanen es
    // sind und wie weit sie auseinanderstehen, ist eine Eichfrage.
    name: 'Die Monokulturwelle ist entschaerft',
    datei: 'src/data/waves.ts',
    regel: /\n    \{ enemy: 'titan', count: \d+, gap: \d+, delay: \d+ \},\n  \],\n\};/,
    ersatz: '\n  ],\n};',
    tor: 'sim',
    meldet: 'verliert keinen Kristall',
  },
  {
    // **Der Hetzer ohne Tempo ist ein Spaeher** (S-N6-03). Der Eingriff
    // setzt ihn auf das Tempo der Infanterie und laesst alles andere stehen.
    // Der gestellte Fall muss dann kippen: wer so langsam laeuft, kommt auch
    // auf der kurzen Route nicht durch.
    //
    // Gegriffen wird das Tempofeld ueber die Kennung davor - die Zahl selbst
    // ist eine Eichfrage und aendert sich; welche Zeile es ist, nicht.
    name: 'Der Hetzer ist nicht mehr schnell',
    datei: 'src/data/enemies.ts',
    regel: /id: 'hetzer', name: 'Hetzer',\n    hp: (\d+), speed: \d+,/,
    ersatz: "id: 'hetzer', name: 'Hetzer',\n    hp: 26, speed: 96,",
    tor: 'smoke',
    meldet: 'Hetzer',
  },
  {
    // **Der Heiler ohne Heilung ist ein Gegner mit einem Namen** (S-N6-02).
    // Der Eingriff setzt seine Heilung auf null und laesst alles andere
    // stehen - Bild, Ring, Faeden, Wellenplan. Der gestellte Fall im
    // Rauchtest muss dann kippen: der Verwundete holt nichts mehr zurueck.
    //
    // Gegriffen wird das FELD und nicht die Zahl: wie stark er heilt, ist
    // eine Eichfrage und aendert sich.
    name: 'Der Sanitaeter heilt nicht mehr',
    datei: 'src/data/enemies.ts',
    regel: /heilt: \d+,/,
    ersatz: 'heilt: 0,',
    tor: 'smoke',
    meldet: 'Sanitaeter',
  },
  {
    // **Zwei Karten, die dasselbe tun, sind eine Karte mit zwei Namen**
    // (S-N6-01). Der Eingriff macht aus dem Bajonett ein zweites
    // Zielfernrohr - gleiche Achse, gleicher Wert -, und die Messung muss
    // die beiden als ununterscheidbar melden.
    //
    // Gegriffen wird die ZEILE der Karte und nicht ihr Wert: welchen Anteil
    // eine Wirkung gerade traegt, aendert die naechste Eichrunde.
    name: 'Zwei Wirkungen sind dieselbe Karte',
    datei: 'src/data/karten.ts',
    regel: /\{ id: 'bajonett', name: '[^']+', text: '[^']+', art: 'nah', wert: ([0-9.]+), kosten: (\d+) \}/,
    ersatz: "{ id: 'bajonett', name: 'Bajonett', text: 'Mehr Schaden dicht am Turm.', art: 'weit', wert: 0.35, kosten: 700 }",
    tor: 'sim',
    meldet: 'nicht zu unterscheiden',
  },
  {
    // **Zwei Auftraege unter derselben Kennung** (v334). Der Eingriff gibt
    // dem Bannturm die Nummer des Sanitaeters zurueck - genau der Zustand,
    // der seit v328 bestand und eine Gegenprobe stumm gemacht hat.
    name: 'Zwei Bildauftraege tragen dieselbe Kennung',
    datei: 'docs/Towerfront-BILDAUFTRAG.md',
    regel: /### 8d\.6 `35_bannturm\.png`/,
    ersatz: '### 8d.4 `35_bannturm.png`',
    tor: 'doku',
    meldet: 'steht zweimal',
  },
  {
    // **Und dieselbe Datei zweimal in einer Familie.** Die zweite Lieferung
    // ueberschriebe die erste. Zwischen 8b und 8c ist es dagegen Absicht -
    // deshalb greift die Regel nur innerhalb einer Familie, und genau das
    // stellt dieser Eingriff.
    name: 'Zwei Bildauftraege bestellen dieselbe Datei',
    datei: 'docs/Towerfront-BILDAUFTRAG.md',
    regel: /### 8d\.6 `35_bannturm\.png`/,
    ersatz: '### 8d.6 `33_sanitaeter.png`',
    tor: 'doku',
    meldet: 'zweimal bestellt',
  },
  {
    // **Ein Stand von einer anderen Messstelle ist keine Ratsche, sondern
    // eine Behauptung** (v336, S-N7-02).
    //
    // Der Eingriff gibt dem Stand von "stellen" die Kennung einer anderen
    // Messstelle. Der Wert bleibt, die Richtung bleibt, das Soll bleibt -
    // nur woran gemessen wurde, stimmt nicht mehr. Genau das war bis v335
    // unsichtbar: die Messstelle stand in der gedruckten Meldung und nicht
    // in der Datei, und wer die Messung umbaute und den Stand stehen liess,
    // verglich zwei Zahlen zu verschiedenen Fragen.
    //
    // Gegriffen wird die KENNUNG und nicht der Wert: dass der Stand 2,00
    // betraegt, ist eine Eichfrage und aendert sich; dass er von DIESER
    // Messung stammt, ist die Zusage.
    // **Ein Lauf, der sich nicht nachstellen laesst, traegt keine einzige
    // Kennzahl** (v336, S-N7-02).
    //
    // Der Eingriff laesst den zweiten und jeden weiteren Abschnitt mit einer
    // gewuerfelten Aussaat starten. Der ERSTE bleibt unberuehrt - genau das
    // ist der Fall, der ohne diese Pruefung durchginge: eine Partie ist
    // weiter nachstellbar, der LAUF nicht, und der Unterschied faellt
    // niemandem auf, weil die gedruckten Zahlen ganz normal aussehen.
    // **Zwei Namen fuer eine Karte** (v338, S-N7-03) - die Gegenprobe, die
    // die Story woertlich verlangt.
    //
    // Der Eingriff gibt `wucht` den Wert von `schliff`. Beide sind
    // Grundkarten derselben Achse, also faellt weder ein Preis noch eine
    // Rangfolge auf; was bleibt, ist ein Angebot, in dem zwei Kacheln
    // dasselbe tun. Der Waechter muss BEIDE nennen - eine Meldung, die nur
    // die zweite nennt, sagt nicht, wogegen sie sich reibt.
    // **Die Nullprobe der Stapelkurve** (v339, S-N1-07, Regel 13).
    //
    // `stapelKurve` misst, was der Kartenstapel ueber einen ganzen Lauf
    // traegt - und jede ihrer Zahlen ist nur so viel wert wie die Zusage,
    // dass OHNE Karten genau 1,00 herauskommt. Der Eingriff laesst die
    // Nullprobe eine Karte je Welle nehmen: sie steht dann nicht mehr auf
    // 1,00, und die Messung muss es sagen, statt die Tabelle darueber
    // unveraendert zu drucken. Genau diese Tabelle hat in dieser Runde die
    // Praemisse einer Story widerlegt - eine Messung, die das kann, braucht
    // eine Nullprobe, die man nicht abschalten kann.
    // **Ein Hinweis darf keine Zahl nennen, die er nicht gemessen hat**
    // (v342, N1G, Regel 5).
    //
    // Der N1-Gold-Hinweis nennt seit v342, was das Deck je Spielstil ueber
    // einen ganzen Lauf traegt - und er nennt es, indem er die Zahl von
    // `stapelKurve` ABLIEST statt sie daneben zu behaupten (Regel 15). Der
    // Eingriff schaltet das Ablegen ab. Der Hinweis muss dann SAGEN, dass er
    // nichts gemessen hat, statt eine Zahl zu drucken, die aus einem
    // frueheren Lauf stammt oder gar keine ist - dieselbe Haltung wie beim
    // Messgriff des UX-Tors seit v320.
    // **Die untere Schranke des Weichenfensters hat nach 30 Fassungen wieder
    // eine Gegenprobe** (v343, N4W, Regel 5).
    //
    // `SPREIZUNG_MIN` faengt die Weiche, die den Weg nicht messbar aendert.
    // Sie stand seit v313 ohne Probe da: fuenf Eingriffe wurden gebaut, und
    // keiner traf sie, weil vier unabhaengige Weichen das FENSTER offenhalten
    // und die Rechnung nach jedem Eingriff die kuerzeste Route neu sucht.
    //
    // Seit v343 fragt der Waechter zusaetzlich je WEICHE, was sie allein
    // aendert - und daran greift der Eingriff: `saeule3` zeigt auf eine
    // Kante, die es nicht gibt, sperrt also nichts, und ihr eigener Faktor
    // faellt von 1,17 auf 1,000.
    //
    // **Die Dublettenpruefung faengt denselben Fall auch**, deshalb steht die
    // Einzelpruefung im Waechter davor: sie sagt, WELCHE Weiche tot ist, die
    // andere nur, dass zwei Stellungen zusammenfallen. Ihren eigenen
    // Gegenstand behaelt die Dublette (zwei Weichen auf DERSELBEN Kante
    // aendern jede fuer sich etwas und fallen trotzdem zusammen).
    //
    // **Was weiterhin NICHT zu stellen ist, steht als Messung daneben:** der
    // Fall "aendert etwas, aber zu wenig". Ueber alle 24 Kanten der vier
    // Netze gemessen gibt es keine einzige, deren Sperrung den Weg um
    // weniger als zehn Prozent aendert - jede sperrt entweder alles zu oder
    // bewegt ihn deutlich. Das ist derselbe strukturelle Befund wie in v313,
    // nur diesmal ueber den ganzen Raum statt ueber fuenf Versuche.
    // **Der Messgriff fuer die Weichen** (v344, Regel 5 und Regel 13).
    //
    // `feldVerdeckung` misst seit v344 auch, wieviel der Weichenringe unter
    // der Bedienung liegt - und sie liest dafuer aus dem SPIEL, wo die
    // Weichen sitzen (`window.weichenMarken`), statt es daneben zu rechnen.
    // Der Eingriff schraubt den Griff ab. Die Messung muss dann MELDEN, dass
    // sie nicht messen kann, statt sechs schoene Nullen zu drucken -
    // dieselbe Haltung und dieselbe Gegenprobe wie beim Griff
    // `weltZuSchirm` seit v320.
    name: 'Der Messgriff der Weichen fehlt',
    datei: 'src/main.ts',
    regel: /\(window as unknown as Record<string, unknown>\)\.weichenMarken =/,
    ersatz: '(window as unknown as Record<string, unknown>).weichenMarkenAbgeschraubt =',
    tor: 'uxtor',
    meldet: 'weichenMarken` fehlt',
  },
  {
    // **Die Altersregel des Inspektors mass jede Quelle an sich selbst.**
    //
    // Bis v344 hatte jede Bildquelle ihren eigenen Nullpunkt: bei EINEM
    // Treffer war das dessen eigene Zeit, das Alter also von Bauart null.
    // `bilder/browser.png` ist der einzige Treffer seines Musters - gemessen
    // am 11.09. war es neun Stunden alt und ging unbeanstandet durch. Fuer
    // diese Quelle konnte die Regel prinzipiell nie anschlagen (Regel 5),
    // und sie ist genau der Fall, fuer den v271 sie gebaut hat.
    //
    // Der Eingriff stellt den Fehler her, statt ihn nachzubauen: der
    // Nullpunkt wird der AELTESTE statt des juengsten, dann hat die alte
    // Aufnahme das Alter null und bleibt drin. Der fuenfte Selbsttest muss
    // das melden.
    //
    // Gefahren wird gegen `inspektortest` und nicht gegen `inspektor`: der
    // volle Lauf braucht Aufnahmen in `/tmp/lab/ux`, und die gibt es auf dem
    // Runner nicht - dort waere er OHNE eingebauten Fehler rot, und eine
    // Gegenprobe an einem roten Tor beweist nichts (v313). Die Selbsttests
    // haengen an keiner Datei und antworten auf jedem Rechner gleich (v225).
    name: 'Der Inspektor misst jede Bildquelle an sich selbst',
    datei: 'tools/inspektor.mjs',
    regel: /const laufZeitAus = \(zeiten\) => \(zeiten\.length \? Math\.max/,
    ersatz: 'const laufZeitAus = (zeiten) => (zeiten.length ? Math.min',
    tor: 'inspektortest',
    meldet: 'misst sich an sich selbst',
  },
  {
    name: 'Eine Weiche entscheidet nichts',
    datei: 'src/data/wegnetz.ts',
    regel: /\{ id: 'saeule3', kante: 'kreuz3-kreuz4', name: '([^']+)' \}/,
    ersatz: "{ id: 'saeule3', kante: 'diese-kante-gibt-es-nicht', name: '$1' }",
    tor: 'guards',
    meldet: 'Dekoration',
  },
  {
    name: 'Der Hinweis nennt eine ungemessene Zahl',
    datei: 'tools/sim.ts',
    regel: /if \(!voll && v\.name === 'heute'\) \{/,
    ersatz: "if (false) {",
    tor: 'sim',
    meldet: 'nicht gemessen in diesem Lauf',
  },
  {
    name: 'Die Stapelkurve misst ohne Nullprobe',
    datei: 'tools/sim.ts',
    regel: /const KURVE_NULL = 0;/,
    ersatz: 'const KURVE_NULL = 1;',
    tor: 'sim',
    meldet: 'Nullprobe der Stapelkurve',
  },
  {
    name: 'Zwei Karten sind dieselbe Karte',
    datei: 'src/data/karten.ts',
    regel: /\{ id: 'wucht', name: 'Wucht', text: '([^']+)', art: 'schaden', wert: 1\.10, kosten: 0 \}/,
    ersatz: "{ id: 'wucht', name: 'Wucht', text: '$1', art: 'schaden', wert: 1.06, kosten: 0 }",
    tor: 'guards',
    meldet: 'dieselbe Karte mit zwei Namen',
  },
  {
    // **Eine Karte, die nichts tut** (v338, S-N7-03).
    //
    // Der Eingriff setzt `schliff` auf den neutralen Faktor. Im Quelltext
    // sieht das unauffaellig aus - eine Zahl unter zwoelf anderen -, und im
    // Spiel verdraengt die Karte bei jedem Zug eine, die etwas bewirkt. Der
    // Waechter fragt deshalb nicht nach dem Eintrag, sondern nach der
    // WIRKUNG: `kartenWirkung([id])` gegen `KEINE_KARTEN` (Regel 13).
    name: 'Eine Karte ohne Wirkung',
    datei: 'src/data/karten.ts',
    regel: /art: 'schaden', wert: 1\.06, kosten: 0 \}/,
    ersatz: "art: 'schaden', wert: 1.00, kosten: 0 }",
    tor: 'guards',
    meldet: 'aendert am Wirkungsvektor nichts',
  },
  {
    name: 'Der Lauf ist nicht nachstellbar',
    datei: 'tools/sim.ts',
    regel: /(      \.\.\.opts,\n      seed: lauf\.saat,)/,
    ersatz: '      ...opts,\n      seed: lauf.saat + (teile.length ? Math.floor(Math.random() * 999) : 0),',
    tor: 'sim',
    meldet: 'nicht deterministisch',
  },
  {
    name: 'Der Stand stammt von einer anderen Messstelle',
    datei: 'tools/spannung-stand.txt',
    regel: /^stellen hoch ([0-9.]+) (\S+) [0-9a-f]{8}$/m,
    ersatz: 'stellen hoch $1 $2 deadbeef',
    tor: 'sim',
    meldet: 'ANDEREN Messstelle',
  },
  {
    // **Eine Kante, die niemand befaehrt, ist Kulisse in den Daten**
    // (v335, S-N7-01, D30).
    //
    // Der Eingriff laesst die Weiche `saeule1` auf eine Kante zeigen, die es
    // nicht gibt. Die Weiche sperrt damit nichts, die Rechnung nimmt immer
    // den kurzen Ast, und die lange Nordschleife (`kreuz1-kreuz2-2`) liegt in
    // KEINER Stellung mehr auf einer Route. Gemessen faellt die Netzdeckung
    // des Spiralhains von 100 auf 78,5 %, und das Tor nennt die tote Kante.
    //
    // **Drei Eingriffe sind durchprobiert, und zwei taugen nicht** (Regel 3):
    // die Kante zu LOESCHEN verkleinert Zaehler und Nenner zugleich, die
    // Deckung bleibt bei 100 % - dieselbe Falle wie bei jeder Ratsche, die
    // ihren eigenen Bezug mitverschiebt (Regel 2). Sie auf ihren eigenen
    // Anfangsknoten zu legen macht das Tor zwar rot, aber am falschen Ort:
    // dann fuehrt von `tor1` gar keine Route mehr zum Ziel, `maps.ts` wirft
    // schon beim Laden, und die Meldung kommt nie zustande.
    //
    // Was traegt, ist der Eingriff an der WEICHE: er laesst das Netz heil und
    // nimmt genau das weg, was die Messung misst - dass jede Kante irgendwann
    // an die Reihe kommt.
    name: 'Eine Kante des Netzes wird nie befahren',
    datei: 'src/data/wegnetz.ts',
    regel: /\{ id: 'saeule1', kante: 'kreuz1-kreuz2', name: '[^']+' \}/,
    ersatz: "{ id: 'saeule1', kante: 'gibtesnicht', name: 'Nordschleife' }",
    tor: 'bahntreuetor',
    meldet: 'in KEINER Weichenstellung',
  },
  {
    // **Ein Schwanz, der nicht endet, ist kein Ende** (S-N6-06). Der Eingriff
    // setzt die Steigerung des Schwanzes auf 1 - dann laeuft der beste Stil
    // durch alle zwoelf gemessenen Umlaeufe, und `sim` muss sagen, dass das
    // ein Bildschirmschoner ist und kein Abschluss.
    //
    // Das ist zugleich die Nullprobe der ganzen Messung (Regel 13): ohne die
    // Steigerung faellt die gemessene Weite von 5 auf 12+, sie misst also
    // wirklich die Steigerung und nicht die Karte.
    //
    // Gegriffen wird der WERT und nicht die Rechnung: wie stark der Schwanz
    // zulegt, ist eine Eichfrage und aendert sich; dass er ueberhaupt zulegt,
    // ist die Zusage.
    name: 'Der Schwanz des Laufs endet nie',
    datei: 'src/data/difficulty.ts',
    regel: /export const ENDLOS_STEIGERUNG = [0-9.]+;/,
    ersatz: 'export const ENDLOS_STEIGERUNG = 1;',
    tor: 'sim',
    meldet: 'endet nicht',
  },
  {
    // **Die Trennung wird ueber drei Aussaaten gemittelt** (v331) - bis v330
    // stand dort ein einziger Lauf je Karte, und der schwankte um mehr als
    // die Schranke selbst (Spiralhain 635 / 424 / 635 bei einer Forderung
    // von 200). Der Eingriff nimmt den Mittelwert wieder heraus und laesst
    // nur die ERSTE Aussaat zaehlen; die Streuungspruefung muss dann sagen,
    // dass dieser Lauf nichts entscheidet.
    //
    // Gegriffen wird die Streuungsrechnung und nicht der Mittelwert: eine
    // einzelne Aussaat kann zufaellig ueber der Schranke liegen, und dann
    // meldete gar nichts. Mit Rauschen 0 daneben behauptet die Zahl
    // Sicherheit, die sie nicht hat - genau das soll der Selbsttest fangen.
    name: 'Die Trennung kennt ihre eigene Streuung nicht',
    datei: 'tools/sim.ts',
    regel: /return spanne <= Math\.abs\(wert - schranke\);/,
    ersatz: 'return true;',
    tor: 'sim',
    meldet: 'Streuungspruefung',
  },
  {
    // **Zwei Vorzeichen, gegen die man dasselbe tut, sind eines mit zwei
    // Namen** (S-N6-05) - dieselbe Ueberlegung wie eine Probe weiter oben
    // bei den Wirkungskarten und wie bei den Zielmodi seit v223.
    //
    // Der Eingriff macht aus dem Stoersender einen zweiten Eisenregen:
    // gleiche Achse, gleicher Wert. Danach muessen die beiden in der
    // Vorzeichenmessung denselben Abdruck ueber alle vier reinen Felder
    // tragen, und `sim` muss sie als ununterscheidbar melden.
    //
    // Gegriffen wird die ZEILE des Vorzeichens und nicht sein Wert: wie
    // stark ein Zeichen gerade zieht, aendert die naechste Eichrunde - der
    // NAME und die Achse bleiben.
    name: 'Zwei Vorzeichen sind dasselbe',
    datei: 'src/data/vorzeichen.ts',
    regel: /(id: 'stoersender', name: 'St\u00f6rsender',\n    text: '[^']+',\n    )starr: [0-9.]+,/,
    ersatz: "$1panzer: 2,",
    tor: 'sim',
    meldet: 'nicht zu unterscheiden',
  },
  {
    name: 'Lesbarkeit findet die Wegflaeche nicht mehr',
    datei: 'tools/readability.mjs',
    regel: /if \(nah <= 0\) \{ wr \+= d\[j\];/,
    ersatz: 'if (nah <= -9999) { wr += d[j];',
    tor: 'lesbarkeit',
    meldet: 'keine Wegflaeche im gebackenen Terrain',
  },
  {
    // **Der Weg ist der Taeter, nicht der Boden (v326).** Bis v325 lagen
    // Ascheschlucht und Frostspalte mit 14,2 und 14,0 % genau auf der
    // Helligkeit der Figuren, und fast jede schwache Kante des Spiels nannte
    // eine der beiden. Ein Durchlauf ueber `BODEN_HELL` ALLEIN bewegte die
    // Zahl kein einziges Mal - von 0,355 bis 0,18 zwanzigmal 20 von 20.
    //
    // Der Eingriff holt eine Wegfarbe auf die helle Seite zurueck. Der Boden
    // bleibt dunkel; es ist also wirklich der Weg, der gemessen wird
    // (Regel 13). Die Ratsche steht seit v326 auf NULL, und damit muss schon
    // die erste Figur, die wieder darunter faellt, das Tor rot machen.
    //
    // Als Regel und nicht auf eine Farbe: welchen Sechserwert eine Karte
    // gerade traegt, aendert sich beim naechsten Durchrechnen. Gegriffen
    // wird der PALETTENNAME - und zwei aeltere Proben, die genau diesen
    // Fehler gemacht hatten, sind in derselben Runde mit umgehaengt worden.
    // Zurueckgesetzt wird auf `#7A92A6`, die Wegfarbe der Frostspalte bis
    // v325: 14,0 % Helligkeit, also mitten in der Figurenschar.
    //
    // **Der Palettenkopf muss dabei STEHENBLEIBEN** (`$1`), und der erste
    // Entwurf hat ihn mitgenommen: `terrain`, `terrainHi` und `terrainLo`
    // standen zwischen Kopf und Wegfarbe, danach war `pal.terrainLo`
    // undefiniert und das Tor starb mit einem Stapelabzug statt zu melden.
    // Ein Eingriff, der das Werkzeug zerstoert, prueft es nicht (Regel 3) -
    // gefunden hat es die Probe selbst, beim ersten Lauf.
    name: 'Eine Wegfarbe liegt wieder auf der Helligkeit der Figuren',
    datei: 'src/data/maps.ts',
    regel: /(const FROST: MapPalette = \{[^}]*?)path: '#[0-9A-F]{6}', pathEdge: '#[0-9A-F]{6}',/,
    ersatz: "$1path: '#7A92A6', pathEdge: '#5B6D7C',",
    tor: 'lesbarkeit',
    meldet: 'Figuren haben eine Kante unter',
  },
  {
    name: 'Lesbarkeit sieht die Helligkeit des Bodens nicht',
    datei: 'src/gfx/terrain.ts',
    regel: /const BODEN_HELL = [0-9.]+;/,
    ersatz: 'const BODEN_HELL = 0.42;',
    tor: 'lesbarkeit',
  },
  {
    name: 'Ein Gegnerbild fehlt im Vorrat',
    datei: 'src/gfx/assets/enemies.ts',
    regel: /\n  '[a-z]+': 'data:image[^']*',/,
    ersatz: '',
    tor: 'bildtor',
    meldet: 'OFFENE BESTELLUNGEN',
  },
  {
    name: 'Bildrate bricht ein',
    datei: 'src/game/state.ts',
    regel: /new SpatialGrid<Enemy>\(\d+, WORLD_W, WORLD_H\)/,
    ersatz: 'new SpatialGrid<Enemy>(100000, WORLD_W, WORLD_H)',
    tor: 'bench',
    meldet: 'Bildrate bricht ein',
  },
];

// ------------------------------------------------------------------- Schutz
//
// Der Musterlauf ist ausgenommen: er LIEST nur und fasst den Baum nie an.
// Genau das ist sein Zweck - er soll waehrend der Arbeit laufen koennen,
// nicht erst danach. Wer ihn hinter den Sauberkeits-Waechter sperrt, macht
// aus einer Zwei-Sekunden-Pruefung wieder eine, die man verschiebt.
// **Wer die Liste nur LIEST, faehrt nichts** (v288).
//
// `npm run beruehrt` importiert PROBEN, um zu sagen, welche Tore an den
// geaenderten Dateien haengen - und lief dabei in den Sauberkeits-Waechter,
// obwohl es keinen einzigen Eingriff macht. Die Zuordnung Datei -> Tor steht
// hier und soll auch nur hier stehen (Regel 15); dann muss sie sich lesen
// lassen, ohne den Lauf mitzustarten.
const NUR_LESEN = !process.argv[1]?.endsWith('probes.mjs');
if (!NUR_LESEN) {
// **Wer keine Probe faehrt, braucht den Sauberkeitscheck nicht** - und darf
// an ihm nicht scheitern (v310).
//
// Er schuetzt davor, dass eine Probe mit `git checkout` frische Arbeit
// mitnimmt (Regel 1, viermal passiert). `--muster` liest nur, und
// `--stand-schreiben` schreibt nur eine Zeile - keiner von beiden ruft je
// `git checkout`.
//
// Gekostet hat das den ersten geteilten Lauf vollstaendig: alle SECHS
// Scheiben waren gruen, und der zusammenfuehrende Schritt starb daran, dass
// er zwei Zeilen vorher selbst `tools/proben-befund.txt` geschrieben hatte.
// Ein Waechter, der an der eigenen Arbeit anschlaegt, haelt nichts - er
// blockiert nur.
//
// **Keine Gegenprobe, und das steht hier statt in einer Fussnote:** der
// Fehler tritt nur in einem Lauf auf, der wirklich zusammenfuehrt, und den
// gibt es nur auf dem Runner. Dieselbe Lage wie bei der Budgetpruefung in
// v233, die nur in einem echten Packlauf wirkt.
const NUR_SCHREIBEN = process.argv.includes('--muster')
  || process.argv.includes('--stand-schreiben');
const dreckig = NUR_SCHREIBEN
  ? '' : execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
if (dreckig) {
  console.error('PROBEN: der Baum ist nicht sauber.\n');
  console.error(dreckig.split('\n').slice(0, 10).map((l) => `  ${l}`).join('\n'));
  console.error('\nJede Probe nimmt sich mit `git checkout` zurück. Bei schmutzigem');
  console.error('Baum würde das die frische Arbeit mitnehmen - viermal passiert.');
  console.error('Erst einchecken.');
  process.exit(1);
}

/** Wo der letzte VOLLE Probenlauf stattgefunden hat.
 *
 *  Eingecheckt, nicht im Abdruck-Lager: der Abstand zum vollen Lauf ist eine
 *  Eigenschaft des Projekts, nicht dieses Rechners. */
const STAND_DATEI = join(ROOT, 'tools/proben-stand.txt');

/** **Was der letzte volle Lauf gefunden hat - eingecheckt, nicht im Protokoll.**
 *
 *  Der volle Lauf faehrt seit v221 nachts auf dem Runner. Das hat die
 *  fuenfzig Minuten aus jeder Runde genommen und dafuer eine neue Luecke
 *  aufgemacht: **sein Befund landet in einem Protokoll, das niemand liest.**
 *
 *  Gemessen an dieser Sitzung ist das keine Sorge, sondern die Erfahrung. Der
 *  Lauf ist dreimal gefahren, zweimal rot - einmal eine Probe, die auf zwei
 *  Rechnern Verschiedenes bewies, einmal ein Hinweis, den ich selbst
 *  hineingeschrieben hatte. Beide Male habe ich es nur gefunden, weil ich ins
 *  Protokoll gesehen habe. Wer das nicht tut, arbeitet weiter, waehrend eine
 *  Probe nichts mehr beweist.
 *
 *  Der Umweg ueber den Stand faengt es erst spaet und mit der falschen
 *  Begruendung: ein roter Lauf schreibt den Stand nicht fort, also schlaegt
 *  die Drei-Fassungs-Regel irgendwann an und sagt "fahr den vollen Lauf" -
 *  den man gefahren IST. Drei Fassungen zu spaet und am Thema vorbei.
 *
 *  Deshalb schreibt der Runner seinen Befund in diese Datei und checkt sie
 *  ein. Der Musterlauf liest sie bei JEDEM Lauf, also in jeder Torkette. Eine
 *  Zeile, die mit `sauber` beginnt, heisst: nichts gefunden. */
const BEFUND_DATEI = join(ROOT, 'tools/proben-befund.txt');

/** Der offene Befund, oder null.
 *
 *  **Eine fehlende Datei ist ein Befund, kein Freispruch.** Der erste Entwurf
 *  gab hier `null` zurueck - dann haette ein `rm tools/proben-befund.txt` die
 *  ganze Pruefung still abgeschaltet, und still abschaltbar ist so gut wie
 *  nicht vorhanden. Nachgefahren: die Datei geloescht, und der Musterlauf
 *  meldete nichts. */
const befundOffen = () => {
  if (!existsSync(BEFUND_DATEI)) {
    return 'Die Befund-Datei fehlt. Der Runner schreibt sie nach jedem vollen Lauf; '
      + 'ohne sie ist nicht zu unterscheiden, ob nichts gefunden wurde oder ob '
      + 'niemand nachgesehen hat.';
  }
  const t = readFileSync(BEFUND_DATEI, 'utf8').trim();
  // Leer ist genauso wenig ein Freispruch wie fehlend - der erste Entwurf
  // liess beides durch.
  if (!t) return 'Die Befund-Datei ist leer. Nur eine Zeile, die mit "sauber" beginnt, '
    + 'heisst "nichts gefunden".';
  return t.startsWith('sauber') ? null : t;
};

const filter = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const VOLL = process.argv.includes('--voll');

/** **Der volle Lauf wird in Scheiben gefahren** (v307).
 *
 *  Gemessen am 10.09.2026: der volle Lauf ist in **zwei Stunden nicht fertig
 *  geworden** und an seiner eigenen `timeout-minutes: 120` gestorben - ohne
 *  Stand, ohne Befund, ohne dass irgendjemand eine Zahl bekommen haette.
 *  Ueber der Werkstattdatei stand dabei "er dauert rund fuenfzig Minuten",
 *  und diese Zahl ist aus der Zeit von 249 Proben; heute sind es 377, und die
 *  teuersten sind dazugekommen (29 an `sim`, 49 an `browsertor`).
 *
 *  Dieselbe Falle wie bei `npm run gate` - dort steht sie seit v268 dreimal
 *  aufgeschrieben: **eine Laufzeit, die niemand nachmisst, wird nicht laenger,
 *  sondern nur falscher.** Der Unterschied ist, dass sie hier nicht nur eine
 *  Zahl im Dokument verdirbt: ohne den vollen Lauf schreibt niemand
 *  `tools/proben-stand.txt` fort, die Zeitratsche schlaegt an, und die ganze
 *  Torkette ist rot. Eine Vorsichtsmassnahme, die den Betrieb anhaelt, wenn
 *  sie selbst zu langsam wird, ist keine.
 *
 *  **Die Arbeit ist von Natur aus teilbar**: jede Probe baut ihren Fehler
 *  ein, faehrt ihr Tor und nimmt ihn zurueck. Keine weiss von der anderen.
 *  `--teil N/M` faehrt jede M-te, beginnend bei N - reihum ueber die ganze
 *  Liste und nicht in Bloecken: die Proben stehen nach Themen beieinander,
 *  und ein Block waere eine Scheibe voller `browsertor` neben einer voller
 *  Musterproben.
 *
 *  **Eine Scheibe schreibt den Stand NICHT.** Sie hat die anderen nicht
 *  gesehen; ihn fortzuschreiben hiesse, sich den Abstand schoenzurechnen -
 *  derselbe Grund, aus dem ein gefilterter Lauf es auch nicht darf. Der
 *  zusammenfuehrende Schritt tut es, wenn ALLE Scheiben gruen waren
 *  (`--stand-schreiben`). */
const teilArg = process.argv.find((a) => a.startsWith('--teil='))
  ?? (process.argv.includes('--teil') ? `--teil=${process.argv[process.argv.indexOf('--teil') + 1]}` : null);
let TEIL = null;
if (teilArg) {
  const [n, m] = teilArg.slice('--teil='.length).split('/').map(Number);
  if (!Number.isInteger(n) || !Number.isInteger(m) || m < 1 || n < 0 || n >= m) {
    console.error(`--teil ${teilArg.slice(7)} ergibt keine Scheibe. Erwartet wird N/M `
      + 'mit 0 <= N < M, zum Beispiel --teil=0/6.');
    process.exit(2);
  }
  TEIL = { n, m };
}

/** Nur den Stand fortschreiben - fuer den zusammenfuehrenden Schritt, wenn
 *  alle Scheiben gruen waren. Das FORMAT steht damit weiter an genau einer
 *  Stelle (Regel 15); ein `echo` in der Werkstattdatei waere die zweite. */
const STAND_SCHREIBEN = process.argv.includes('--stand-schreiben');

/** **Der Standardlauf faehrt nur die Proben, die etwas zu pruefen haben.**
 *
 *  Der volle Lauf dauert rund fuenfzig Minuten. Das ist keine Zahl, die man
 *  einmal am Tag hinnimmt - sie stand zwischen jeder Runde und der naechsten,
 *  und der Nutzer hat sie zu Recht abgelehnt. Das Tor-Audit hatte es schon
 *  gemessen: bei einer Runde mit zwei geaenderten Toren haben 140 von 142
 *  Proben nichts zu pruefen, was sich geaendert haette.
 *
 *  Der Umfang kommt deshalb aus `git diff` gegen den Stand des letzten
 *  vollen Laufs: eine Probe faehrt mit, wenn ihre ZIELDATEI angefasst wurde.
 *  Gemessen sind das nach einer Runde 11 Proben statt 249, nach zweien 26.
 *
 *  **Das Werkzeug des Tores zaehlt bewusst NICHT mit**, obwohl es naheliegt.
 *  Gemessen kostet es alles: `tools/smoke.ts` haengen 86 Proben an, und eine
 *  einzige Zeile darin zoege den Lauf von 11 auf 99 Proben und von vier
 *  Minuten auf anderthalb Stunden. Wer ein Tor anfasst, faehrt seine Proben
 *  gezielt - `npm run proben smoke` nimmt jeden Namen und jedes Tor als
 *  Filter.
 *
 *  **Was der Standardlauf NICHT kann**, und das steht hier, damit es niemand
 *  verwechselt: er sagt nichts ueber die uebersprungenen Proben. Eine Probe
 *  kann auch verfallen, weil sich die KARTE geaendert hat und ihr Fall nicht
 *  mehr vorkommt - genau das ist in v219 viermal passiert, und keine der vier
 *  Zieldateien war angefasst. Dagegen hilft nur der volle Lauf, und der
 *  laeuft deshalb jede Nacht auf dem Runner
 *  (`.github/workflows/proben.yml`), nicht hier.
 */
const geaenderteDateien = () => {
  const stand = existsSync(STAND_DATEI) ? readFileSync(STAND_DATEI, 'utf8').trim() : '';
  const sha = stand.split(/\s+/)[1];
  if (!sha) return null;   // alter Stand ohne Commit - dann kein Umfang
  try {
    return new Set(execSync(`git diff --name-only ${sha}..HEAD`, { cwd: ROOT, encoding: 'utf8' })
      .split('\n').map((z) => z.trim()).filter(Boolean));
  } catch { return null; }
};

/** **Woraus die Welt besteht.**
 *
 *  Karten, Wellen, Gegner, Tuerme, Faehigkeiten, Grade. Aendert sich eine
 *  dieser Dateien, kann eine Probe ihren Fall verlieren, OHNE dass ihre
 *  Zieldatei angefasst wurde - der Umfangslauf sieht davon nichts. Genau das
 *  ist in v219 viermal passiert.
 *
 *  Die Liste dient zwei Dingen: dem Bericht ueber die uebersprungenen Proben
 *  und der Pruefung von `haengtAn` (dort darf nur stehen, was es gibt). */
const WELTDATEIEN = [
  'src/data/maps.ts', 'src/data/waves.ts', 'src/data/enemies.ts',
  'src/data/towers.ts', 'src/data/abilities.ts', 'src/data/difficulty.ts',
];

/** **Faehrt diese Probe mit?**
 *
 *  Als eigene Funktion, damit sie sich pruefen laesst, ohne einen Lauf zu
 *  starten - dieselbe Antwort wie bei `standAbstandFehler`. Der Umfang war
 *  bis v224 vier Zeilen mitten im Ablauf, und ein Umfang, den niemand
 *  nachrechnen kann, ist eine Behauptung.
 *
 *  **`haengtAn` ist der Zusatz aus v225.** `datei` sagt, WO die Probe
 *  eingreift; `haengtAn` sagt, WOVON ihr Fall abhaengt. Die vier Proben, die
 *  in v219 ihren Gegenstand verloren haben, hatten ihre Zieldatei in
 *  `src/data/waves.ts`, `src/game/state.ts` (zweimal) und
 *  `tools/determinism.ts` - keine davon war angefasst, geaendert hatte sich
 *  `src/data/maps.ts`. Meine erste Vermutung, es haenge an Proben mit
 *  Zieldatei in `tools/`, war gemessen falsch: nur eine der vier lag dort. */
const imUmfang = (p, geaendert) => geaendert.has(p.datei)
  || (p.haengtAn ?? []).some((f) => geaendert.has(f));

/** Die Umfangsregel selbst pruefen, in beide Richtungen und bei jedem Lauf.
 *
 *  Eine Regel, die nur die eine Richtung kennt, besteht auch eine, die immer
 *  ja sagt. Deshalb drei gestellte Faelle: Zieldatei getroffen (muss mit),
 *  nur `haengtAn` getroffen (muss mit - das ist die ganze Neuerung), nichts
 *  getroffen (darf NICHT mit). */
const umfangSelbsttest = () => {
  const g = new Set(['src/data/maps.ts']);
  const ueber = imUmfang({ datei: 'src/data/maps.ts' }, g);
  const haengt = imUmfang({ datei: 'src/game/state.ts', haengtAn: ['src/data/maps.ts'] }, g);
  const fremd = imUmfang({ datei: 'src/game/state.ts' }, g);
  if (!ueber || !haengt || fremd) {
    console.error('PROBEN: der Selbsttest der Umfangsregel ist gescheitert - '
      + `Zieldatei ${ueber ? 'faehrt mit' : 'faehrt NICHT mit'}, `
      + `haengtAn ${haengt ? 'faehrt mit' : 'faehrt NICHT mit'}, `
      + `unbeteiligt ${fremd ? 'faehrt MIT' : 'bleibt draussen'}.`);
    process.exit(1);
  }
  // Und `haengtAn` selbst darf nicht verrotten: was dort steht, muss es
  // geben, und es darf nicht die Zieldatei wiederholen - das waere Zierrat,
  // der beim Lesen wie eine Angabe aussieht.
  let fehler = 0;
  for (const p of PROBEN) {
    for (const f of p.haengtAn ?? []) {
      if (!existsSync(join(ROOT, f))) {
        console.error(`PROBEN: "${p.name}" haengt an "${f}" - die Datei gibt es nicht.`);
        fehler++;
      }
      if (f === p.datei) {
        console.error(`PROBEN: "${p.name}" haengt an seiner eigenen Zieldatei "${f}".`);
        fehler++;
      }
    }
  }
  if (fehler) process.exit(1);
  const mit = PROBEN.filter((p) => p.haengtAn?.length).length;
  console.log('  Selbsttest: die Umfangsregel nimmt Zieldatei und haengtAn, laesst '
    + `Unbeteiligtes draussen. ${mit} Probe(n) mit haengtAn.`);
};

let umfangGrund = 'alle';
let liste = PROBEN;
/** Was der Lauf NICHT geprueft hat - und woran das liegt. */
let uebersprungen = [];
let weltGeaendert = [];
if (filter.length) {
  liste = PROBEN.filter((p) => filter.some((f) => `${p.name} ${p.tor}`.toLowerCase().includes(f.toLowerCase())));
  umfangGrund = `Filter "${filter.join(' ')}"`;
} else if (!VOLL && !process.argv.includes('--muster')) {
  const geaendert = geaenderteDateien();
  if (geaendert) {
    liste = PROBEN.filter((p) => imUmfang(p, geaendert));
    uebersprungen = PROBEN.filter((p) => !imUmfang(p, geaendert));
    weltGeaendert = WELTDATEIEN.filter((f) => geaendert.has(f));
    umfangGrund = `Zieldatei oder haengtAn seit dem letzten vollen Lauf angefasst `
      + `(${geaendert.size} geaenderte Datei(en), ${uebersprungen.length} Proben uebersprungen)`;
  }
}

// **Und jetzt die Scheibe.** Sie greift NACH der Umfangswahl: eine Scheibe
// eines Umfangslaufs waere eine halbe Auskunft ueber eine halbe Auskunft.
// Gedacht ist sie fuer `--voll`, verboten ist der Rest nicht - der Lauf sagt
// nur immer, welche Scheibe er war.
if (TEIL) {
  const ganz = liste.length;
  // **Selbsttest: die Scheiben decken die Liste genau einmal ab.**
  //
  // Eine Aufteilung, die etwas auslässt, sieht aus wie ein bestandener Lauf -
  // sechs gruene Scheiben, und niemand faehrt die vergessenen Proben. Das ist
  // dieselbe Klasse wie eine Probe, die nichts mehr beweist (Regel 5), nur
  // eine Ebene hoeher. Gerechnet wird sie bei JEDEM Scheibenlauf, sie kostet
  // nichts.
  const abdeckung = new Array(ganz).fill(0);
  for (let n = 0; n < TEIL.m; n += 1) {
    for (let i = 0; i < ganz; i += 1) if (i % TEIL.m === n) abdeckung[i] += 1;
  }
  const luecken = abdeckung.filter((x) => x !== 1).length;
  if (luecken) {
    console.error(`PROBEN: die Aufteilung in ${TEIL.m} Scheiben deckt ${luecken} von `
      + `${ganz} Proben nicht genau einmal ab. Sechs gruene Scheiben waeren dann `
      + 'ein Freispruch fuer Proben, die niemand gefahren hat.');
    process.exit(1);
  }
  liste = liste.filter((_, i) => i % TEIL.m === TEIL.n);
  umfangGrund = `${umfangGrund}, Scheibe ${TEIL.n + 1} von ${TEIL.m} `
    + `(${liste.length} von ${ganz} Proben)`;
  console.log(`  Selbsttest: ${TEIL.m} Scheiben decken alle ${ganz} Proben genau `
    + 'einmal ab.');
  if (!liste.length) {
    console.error(`PROBEN: Scheibe ${TEIL.n + 1} von ${TEIL.m} ist leer. Eine leere `
      + 'Scheibe meldet gruen und prueft nichts.');
    process.exit(1);
  }
}

/** **Was der Lauf nicht geprueft hat, sagt er selbst.**
 *
 *  Bis v224 stand am Ende "alle 11 Tore schlagen an" - und das las sich wie
 *  ein Freispruch fuer 253. Die 242 uebersprungenen kamen in keiner Zeile
 *  vor. Ein Lauf, der seine Luecke verschweigt, ist schlimmer als einer, der
 *  sie nennt: man glaubt ihm mehr, als er hergibt.
 *
 *  Die Weltzeile ist der wichtigere Teil. Sie steht nur da, wenn sich eine
 *  Weltdatei geaendert hat - und dann ist sie die Aufforderung, den vollen
 *  Lauf nicht bis zur dritten Fassung zu schieben. */
const umfangBericht = () => {
  if (!uebersprungen.length) return;
  const jeTor = {};
  for (const p of uebersprungen) jeTor[p.tor] = (jeTor[p.tor] ?? 0) + 1;
  const stand = existsSync(STAND_DATEI) ? readFileSync(STAND_DATEI, 'utf8').trim() : '?';
  console.log(`  NICHT geprueft: ${uebersprungen.length} von ${PROBEN.length} Proben. `
    + `Letzter voller Lauf: ${stand.split(/\s+/)[0]}.`);
  console.log('    ' + Object.entries(jeTor).sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t} ${n}`).join('  '));
  if (weltGeaendert.length) {
    console.log(`  ACHTUNG: die WELT hat sich seither geaendert - ${weltGeaendert.join(', ')}.`);
    console.log('    Eine Probe kann ihren Fall auch dadurch verlieren, ohne dass ihre');
    console.log('    Zieldatei angefasst wurde. In v219 ist das viermal passiert, und keine');
    console.log('    der vier waere je rot geworden. Wer den Fall kennt, traegt `haengtAn`');
    console.log('    nach; sonst faengt es erst der volle Lauf (naechtlich, oder `-- --voll`).');
  }
  console.log('');
};

// -------------------------------------------------------------- Musterlauf
//
// `npm run muster` prueft NUR, ob jede Regel noch greift - ohne ein einziges
// Tor zu fahren. Zwei Sekunden statt vierunddreissig Minuten.
//
// **Warum das die haeufigste Verfallsart ist.** Eine Probe hoert nicht
// dadurch auf zu beweisen, dass das Tor stumpf wird, sondern dadurch, dass
// ihr Eingriff nicht mehr ankommt - und ein nicht angekommener Eingriff
// sieht aus wie ein bestandenes Tor. Genau das ist an einem einzigen Tag
// zweimal passiert (v152): eine Probe zeigte auf eine umnumerierte
// Tabellenzeile, eine andere auf eine Liste deutscher Zahlwoerter, die bei
// "fuenfundzwanzig" endete. Beide meldeten "schlaegt nicht an", und beide
// waren Fehler in der Probe.
//
// Der Musterlauf ersetzt den vollen Lauf NICHT. Er sagt nur: jede Probe hat
// noch einen Gegenstand. Ob das Tor ihn auch meldet, sagt allein der volle
// Lauf - deshalb steht er weiter vor jeder Auslieferung.
const fassung = () => (readFileSync(join(ROOT, 'src/data/config.ts'), 'utf8')
  .match(/VERSION = 'v(\d+)'/)?.[1] ?? '0');

/** **Den Stand fortschreiben, ohne eine Probe zu fahren** (v307).
 *
 *  Fuer den Schritt, der die Scheiben zusammenfuehrt. Er weiss, dass alle
 *  gruen waren; die Zeilenform kennt er nicht - und soll sie nicht kennen.
 *  Ein `echo "v$N $SHA $ZEIT"` in der Werkstattdatei waere die zweite Stelle,
 *  an der dieses Format steht, und die erste, die veraltet (Regel 15). */
if (STAND_SCHREIBEN) {
  const kopf = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  const zeit = new Date().toISOString();
  writeFileSync(STAND_DATEI, `v${fassung()} ${kopf} ${zeit}\n`);
  console.log(`Stand festgehalten: v${fassung()} ${kopf.slice(0, 8)} ${zeit} `
    + '(tools/proben-stand.txt).');
  process.exit(0);
}
/** Wieviele Fassungen der volle Lauf zurueckliegen darf.
 *
 *  Drei - so hat der Nutzer den Ablauf entschieden, nachdem das Tor-Audit
 *  gezeigt hat, dass der volle Lauf 33 Minuten echte Arbeit ist und bei einer
 *  Runde mit zwei geaenderten Toren 140 von 142 Proben nichts zu pruefen
 *  haben. Nicht laenger, weil die Ratschen sonst verrotten: eine Probe hoert
 *  leise auf zu beweisen, und je mehr Fassungen dazwischenliegen, desto
 *  schwerer ist es, den Tag zu finden, an dem es passiert ist. */
const STAND_ABSTAND = 3;

/** **Wie alt der letzte volle Lauf sein darf** (S-N0-02, v269).
 *
 *  Bis v268 war die Ratsche eine FASSUNGSratsche: hoechstens drei Fassungen
 *  Abstand. Das trug, solange eine Fassung ungefaehr ein Tag war. Im Neubau
 *  ist sie das nicht mehr - sechs Runden in einer Nacht sind moeglich, und
 *  dann blockiert die Regel die Kette zweimal selbst, fuer je 50 Minuten,
 *  ausgerechnet wenn niemand da ist, der den Lauf anstossen koennte.
 *
 *  **Wovor die Ratsche schuetzt, ist eine Frage von Zeit.** Eine Probe hoert
 *  leise auf zu beweisen; je laenger das verborgen bleibt, desto schwerer ist
 *  der Tag zu finden, an dem es passiert ist. Ob dazwischen zwei Fassungen
 *  liegen oder acht, aendert daran nichts - die Nacht dazwischen schon,
 *  denn nachts faehrt der Runner den vollen Lauf.
 *
 *  Die Fassungszahl bleibt daneben stehen und wird gemeldet. Sie urteilt
 *  nur nicht mehr. */
const STAND_HOECHSTALTER_H = 24;

/** Ist der Abstand zum letzten vollen Lauf zu gross - und was ist zu sagen?
 *
 *  Als eigene Funktion, damit sie sich pruefen laesst, ohne ein Tor zu
 *  fahren. Siehe `standSelbsttest` weiter unten: die Gegenprobe zu dieser
 *  Regel kann NICHT ueber das Tor laufen, weil sie sich selbst im Weg
 *  steht. */
const standAbstandFehler = (jetzt, damals) => (jetzt - damals > STAND_ABSTAND
  ? `der letzte volle Probenlauf war v${damals}, jetzt ist v${jetzt} `
    + `- ${jetzt - damals} Fassungen dazwischen, erlaubt sind ${STAND_ABSTAND}.`
  : null);

/** Die Zeitratsche. `alterH` ist das Alter des letzten vollen Laufs in
 *  Stunden, oder `null`, wenn es sich nicht ermitteln laesst.
 *
 *  **Unbekannt ist kein Freispruch.** Ein Stand ohne Zeitangabe sieht sonst
 *  aus wie ein frischer - und das ist genau die Verfallsart, gegen die die
 *  ganze Ratsche gebaut ist. */
const zeitRatscheFehler = (alterH) => {
  if (alterH === null) {
    return 'der letzte volle Probenlauf traegt keine Zeit, und sie laesst sich '
      + 'auch nicht aus seinem Commit lesen. Unbekanntes Alter zaehlt als zu alt.';
  }
  return alterH > STAND_HOECHSTALTER_H
    ? `der letzte volle Probenlauf ist ${alterH.toFixed(1)} Stunden her, `
      + `erlaubt sind ${STAND_HOECHSTALTER_H}.`
    : null;
};

/** Wann der vermerkte Stand entstanden ist - **aus der Datei, sonst nirgends**.
 *
 *  **Der erste Entwurf hatte einen Rueckfallweg, und der hat den ersten
 *  Runner-Lauf rot gemacht.** Er las das Commit-Datum des vermerkten Standes:
 *  hier ging das, weil der Baum die ganze Geschichte hat. Auf dem Runner nicht
 *  - `actions/checkout@v4` klont **flach**, den Commit gibt es dort gar nicht,
 *  und `git log` faellt auf die Nase.
 *
 *  Das ist genau die Klasse aus v225: *eine Regel, die auf einem Rechner
 *  beweist und auf dem anderen nicht, ist keine* - und schlimmer als keine,
 *  weil ein gruener Lauf dann wie ein Beweis aussieht. Hier war es umgekehrt
 *  herum sichtbar (rot statt still gruen), und das nur, weil "unbekannt zaehlt
 *  als zu alt" gilt. Waere die Vorgabe "unbekannt ist frisch" gewesen, haette
 *  die Ratsche vom ersten Tag an geschwiegen.
 *
 *  Also nur noch die Datei. Der Stand von v265 hat seine Zeit einmalig von
 *  Hand bekommen - abgelesen am Commit, der ihn geschrieben hat, hier wo die
 *  Geschichte vollstaendig ist. Ab dem naechsten Nachtlauf schreibt der
 *  Runner sie selbst. */
const standZeit = (roh) => {
  const teile = roh.trim().split(/\s+/);
  return teile[2] && !Number.isNaN(Date.parse(teile[2])) ? Date.parse(teile[2]) : null;
};

/** Die Regel selbst pruefen, ohne ein Tor und ohne Ringschluss.
 *
 *  **Warum das hier steht und nicht als Gegenprobe.** Bis v162 gab es eine:
 *  sie setzte `STAND_ABSTAND` auf -1 und erwartete, dass `npm run muster`
 *  rot wird. Am Tag, an dem der volle Lauf faellig wurde, hat sich der
 *  Ringschluss gezeigt: `muster` war rot, WEIL der Lauf faellig war - und
 *  der volle Lauf verweigerte den Dienst, weil `muster` rot war. Beide
 *  warteten aufeinander, und der Lauf, der die Lage aufgeloest haette, kam
 *  nicht zustande.
 *
 *  Aufgeloest in zwei Schritten. Erstens: waehrend `npm run proben`
 *  laeuft, ist die Forderung "fahr den vollen Lauf" gegenstandslos - er
 *  laeuft ja gerade. Die Tore, die der Probenlauf startet, bekommen
 *  deshalb `PROBENLAUF=1` und ueberspringen genau diese eine Pruefung.
 *  Zweitens: damit kann keine Gegenprobe die Regel mehr ueber das Tor
 *  bezeugen - also bezeugt sie dieser Selbsttest, direkt an der Regel und
 *  bei JEDEM Lauf statt alle drei Fassungen. Dieselbe Antwort wie bei
 *  `pack-art` in v157, wo der Fehlerfall ohne `art/roh/` unerreichbar war.
 *
 *  Geprueft wird beides: dass sie bei einem Schritt zu viel anschlaegt und
 *  dass sie beim erlaubten Abstand schweigt. Eine Pruefung, die nur die
 *  eine Richtung kennt, besteht auch eine Regel, die immer anschlaegt. */
const standSelbsttest = () => {
  const zuviel = standAbstandFehler(100 + STAND_ABSTAND + 1, 100);
  const gerade = standAbstandFehler(100 + STAND_ABSTAND, 100);
  if (!zuviel || gerade) {
    console.error('PROBEN: der Selbsttest der Standregel ist gescheitert - '
      + `${STAND_ABSTAND + 1} Fassungen Abstand ${zuviel ? 'schlagen an' : 'schlagen NICHT an'}, `
      + `${STAND_ABSTAND} ${gerade ? 'schlagen AN' : 'schweigen'}.`);
    process.exit(1);
  }
  // Und dieselbe Prüfung fuer die Zeitratsche, aus demselben Grund: sie kann
  // nicht ueber ein Tor bezeugt werden, weil sie sich selbst im Weg steht.
  // Geprueft wird beides UND der unbekannte Fall - der galt im ersten
  // Entwurf als frisch, und damit haette ein Stand ohne Zeit die Ratsche
  // still abgeschaltet.
  const zuAlt = zeitRatscheFehler(STAND_HOECHSTALTER_H + 1);
  const geradeNoch = zeitRatscheFehler(STAND_HOECHSTALTER_H);
  const ohneZeit = zeitRatscheFehler(null);
  if (!zuAlt || geradeNoch || !ohneZeit) {
    console.error('PROBEN: der Selbsttest der Zeitratsche ist gescheitert - '
      + `${STAND_HOECHSTALTER_H + 1} h ${zuAlt ? 'schlagen an' : 'schlagen NICHT an'}, `
      + `${STAND_HOECHSTALTER_H} h ${geradeNoch ? 'schlagen AN' : 'schweigen'}, `
      + `unbekannt ${ohneZeit ? 'schlaegt an' : 'schlaegt NICHT an'}.`);
    process.exit(1);
  }
  console.log(`  Selbsttest: die Zeitratsche schlaegt bei ${STAND_HOECHSTALTER_H + 1} h `
    + `an, schweigt bei ${STAND_HOECHSTALTER_H} und wertet ein unbekanntes Alter als zu alt.`);
  console.log(`  Selbsttest: die Standregel schlaegt bei ${STAND_ABSTAND + 1} Fassungen `
    + `Abstand an und schweigt bei ${STAND_ABSTAND}.`);

  // **Und das LESEN des Standes, nicht nur die Regel darauf.**
  //
  // Der erste Entwurf hat den Runner rot gemacht, weil das Lesen auf zwei
  // Rechnern Verschiedenes tat (flacher Klon, siehe `standZeit`). Gefangen
  // hat das keine Pruefung, sondern die Vorgabe "unbekannt zaehlt als zu
  // alt" - sie hat es laut gemacht statt still. Was sich pruefen laesst,
  // ist die FORM: drei gestellte Staende, und keiner darf durchrutschen.
  const mitZeit = standZeit('v265 abc123 2026-09-09T11:01:50Z');
  const ohne = standZeit('v265 abc123');
  const kaputt = standZeit('v265 abc123 keinDatum');
  if (mitZeit === null || ohne !== null || kaputt !== null) {
    console.error('PROBEN: der Selbsttest des Standlesens ist gescheitert - '
      + `mit Zeit ${mitZeit === null ? 'NICHT gelesen' : 'gelesen'}, `
      + `ohne Zeit ${ohne === null ? 'unbekannt' : 'IRGENDWAS gelesen'}, `
      + `mit Unsinn ${kaputt === null ? 'unbekannt' : 'IRGENDWAS gelesen'}.`);
    process.exit(1);
  }
  console.log('  Selbsttest: der Stand wird nur aus seiner Zeitangabe gelesen - '
    + 'fehlt sie oder ist sie Unsinn, gilt das Alter als unbekannt.');
};

/** Umgebung fuer jedes Tor, das dieser Lauf startet.
 *
 *  `PROBENLAUF` schaltet in `--muster` die Abstandspruefung ab - siehe
 *  `standSelbsttest`. Nur diese eine; die Mustererkennung selbst laeuft
 *  vollstaendig weiter. */
const TOR_UMGEBUNG = { ...process.env, PROBENLAUF: '1' };

if (process.argv.includes('--muster')) {
  console.log(`Musterlauf: ${liste.length} Regel(n), kein Tor wird gefahren.\n`);
  // **Und was der letzte volle Lauf gefunden hat - vor allem anderen.**
  //
  // Die Reihenfolge ist gemessen, nicht gewaehlt. Stand sie hinter der
  // Mustererkennung, meldete die Gegenprobe dazu die FALSCHE Ursache: der
  // Eingriff ueberschreibt die `sauber`-Zeile, auf die drei Proben ihr Muster
  // stuetzen, also schlug zuerst "kein Gegenstand mehr" an. Ein Befund des
  // vollen Laufs ist ausserdem die dringendere Nachricht.
  //
  // **Der Satz "hier gibt es keinen Ringschluss" stand hier bis v313 - und er
  // war falsch.** Gemessen an drei Laeufen am 10.09.2026:
  //
  //   ein roter Lauf schreibt einen Befund
  //     -> `muster` ist rot
  //     -> jede Scheibe mit einer `muster`-Probe arbeitet gar nicht erst
  //        ("Eine Gegenprobe an einem roten Tor beweist nichts")
  //     -> der Lauf ist rot
  //     -> er schreibt einen Befund. Von vorn.
  //
  // Der Befund geht nur weg, wenn ein Lauf gruen ist, und kein Lauf kann gruen
  // sein, solange er dasteht. Genau die Form, die eine Zeile tiefer fuer die
  // Standregel schon erkannt war. Der Stand stand deshalb seit dem 09.09. auf
  // v265, und die 5-Minuten-Scheiben in allen drei Laeufen kamen daher.
  //
  // **Ausgenommen wird trotzdem nur, was dieser Lauf nicht selbst angerichtet
  // hat.** Ein Befund, den eine Gegenprobe gerade EINGEBAUT hat, unterscheidet
  // sich vom eingecheckten Stand - dann wird er geprueft wie immer. Die drei
  // Gegenproben aus v227 belegen das bei jedem vollen Lauf: sie bauen einen
  // Befund ein und verlangen, dass `muster` ihn meldet. Sie sind der Beweis,
  // dass diese Ausnahme nichts verschluckt.
  //
  // Ausserhalb eines Probenlaufs bleibt alles wie seit v227: die Torkette
  // sieht den Befund und wird rot.
  const befundIstEingebaut = () => {
    try {
      execSync(`git diff --quiet -- ${BEFUND_DATEI}`, { cwd: ROOT, stdio: 'pipe' });
      return false;
    } catch { return true; }
  };
  const befund = befundOffen();
  if (befund && (!process.env.PROBENLAUF || befundIstEingebaut())) {
    console.error('\nMUSTERLAUF: der letzte volle Probenlauf hat einen Befund '
      + 'hinterlassen - eine Probe beweist nichts mehr.');
    for (const z of befund.split('\n')) console.error(`  ${z}`);
    console.error('  Entweder die Probe richten oder sie streichen. Danach den vollen');
    console.error('  Lauf erneut fahren; er schreibt die Datei wieder auf "sauber".');
    console.error(`  (${BEFUND_DATEI.replace(ROOT + '/', '')})`);
    process.exit(1);
  }

  const stumm = [], mehrdeutig = [];
  for (const p of liste) {
    // Eine fehlende Zieldatei ist ein Befund wie jeder andere. Vorher starb
    // der Musterlauf hier mit einem Stapelabzug, und ein Stapelabzug sagt
    // nicht, WELCHE Probe ihren Gegenstand verloren hat.
    if (!existsSync(join(ROOT, p.datei))) {
      stumm.push(`${p.name}: die Zieldatei ${p.datei} gibt es nicht.`);
      continue;
    }
    const vorher = readFileSync(join(ROOT, p.datei), 'utf8');
    const treffer = p.regel
      ? (vorher.match(new RegExp(p.regel.source, p.regel.flags.includes('g')
        ? p.regel.flags : `${p.regel.flags}g`)) ?? []).length
      : vorher.split(p.suche).length - 1;
    // NULL Treffer ist der Fehler: der Eingriff kommt nicht mehr an, und ein
    // nicht angekommener Eingriff sieht aus wie ein bestandenes Tor.
    //
    // MEHRERE Treffer sind nur ein Hinweis. `replace` ohne `g` nimmt den
    // ersten, und bei sechs Proben ist das Absicht - "Strasse schrumpft
    // unter die Gegner" trifft 321 Wegbreiten und will genau eine davon.
    // Zum Fehler zu machen waere falsch; verschweigen aber auch: in v149
    // traf eine Probe den erstbesten `update(dt` und aenderte damit die
    // falsche Methode. Wer eine dieser Zeilen liest, soll wissen, dass ihr
    // Eingriff von der Reihenfolge im Quelltext abhaengt.
    //
    // **Ausser bei einem SUCHTEXT - da ist "mehrere" derselbe Fehler wie
    // "keiner".** Die Probenumgebung verweigert dort den Dienst, wenn es
    // nicht genau einen Treffer gibt (siehe unten: `.length - 1 === 1`),
    // aendert also gar nichts und die Probe beweist nichts.
    //
    // Aufgefallen ist das erst im vollen Lauf von v158: "Doku nennt einen
    // Befehl, den es nicht gibt" sucht `npm run gate` in CLAUDE.md, und die
    // neue Ablauftabelle aus v155 nennt den Befehl ein zweites Mal. Der
    // Musterlauf hatte das als Hinweis durchgehen lassen - er behandelte
    // Regel und Suchtext gleich, obwohl sie sich genau hier unterscheiden.
    // Dreiunddreissig Minuten spaeter fand es der volle Lauf.
    if (treffer === 0) stumm.push(`${p.name}: Muster FEHLT in ${p.datei}`);
    else if (treffer > 1 && !p.regel) {
      stumm.push(`${p.name}: ${treffer} Treffer fuer den Suchtext "${p.suche}" in `
        + `${p.datei} - bei einem Suchtext wirkt der Eingriff nur bei GENAU einem.`);
    } else if (treffer > 1) mehrdeutig.push(`${p.name}: ${treffer} Treffer in ${p.datei} `
      + '- greift den ersten');
  }
  for (const z of mehrdeutig) console.log(`  Hinweis: ${z}`);
  if (mehrdeutig.length) console.log('');
  if (stumm.length) {
    console.error(`MUSTERLAUF: ${stumm.length} von ${liste.length} Proben haben keinen `
      + 'Gegenstand mehr - ihr Eingriff kommt nicht an.');
    for (const z of stumm) console.error(`  - ${z}`);
    process.exit(1);
  }
  // Und der Abstand zum letzten vollen Lauf. Ohne diese Zeile waere die
  // Stufung eine Absichtserklaerung in einem Dokument - und die Bilanz von
  // v31 sagt genau darueber: eine Regel, die nur aufgeschrieben ist, wird
  // gebrochen. Deshalb steht sie hier, wo sie weh tut.
  const jetzt = Number(fassung());
  const roh = existsSync(STAND_DATEI) ? readFileSync(STAND_DATEI, 'utf8') : '';
  const damals = roh
    ? Number(roh.trim().split(/\s+/)[0].replace(/^v/, '')) : 0;
  const abstand = jetzt - damals;
  // **Seit v269 urteilt die Zeit, nicht die Fassungszahl** (S-N0-02).
  const zeit = roh ? standZeit(roh) : null;
  const alterH = zeit === null ? null : (Date.now() - zeit) / 3600000;
  // Waehrend `npm run proben` laeuft, ist diese Forderung gegenstandslos:
  // der Lauf, den sie verlangt, laeuft gerade. Ohne die Ausnahme stehen
  // sich beide im Weg - siehe den Kasten an `standSelbsttest`.
  const meldung = process.env.PROBENLAUF ? null : zeitRatscheFehler(alterH);
  if (meldung) {
    console.error(`\nMUSTERLAUF: ${meldung}`);
    console.error('  `npm run proben` faehrt ihn (rund 33 Minuten). Der Musterlauf prueft nur,');
    console.error('  ob jede Probe noch einen Gegenstand hat - nicht, ob ihr Tor ihn meldet.');
    process.exit(1);
  }
  console.log(`MUSTERLAUF: alle ${liste.length} Proben greifen noch, `
    + `${mehrdeutig.length} davon auf den ersten von mehreren Treffern. `
    + `Voller Lauf zuletzt bei v${damals}, ${abstand} Fassung(en) her, `
    + `${alterH === null ? 'Alter unbekannt' : `${alterH.toFixed(1)} h alt`} `
    + `(erlaubt ${STAND_HOECHSTALTER_H} h).`);
  process.exit(0);
}

/** Den Quelltext zuruecknehmen - UND das gebaute Ergebnis mit.
 *
 *  Ohne den zweiten Teil bleibt nach jeder Probe an einem Tor, das die
 *  gebaute Datei laedt, ein `dist/` mit dem eingebauten Fehler liegen. Der
 *  Quelltext ist dann sauber, die Datei daneben nicht - und wer als
 *  naechstes misst, misst den Fehler. Genau das ist beim Bau dieser Probe
 *  passiert: eine Messung am Menue kam voellig verdreht heraus, und die
 *  Ursache lag nicht im Spiel, sondern im liegengebliebenen Bau.
 *
 *  Neu gebaut wird nur nach den Toren, die ueberhaupt bauen oder bauen
 *  lassen - sonst kostete jede der 71 Proben unnoetig eine Sekunde. */
const BAUT = new Set(['browsertor', 'browser', 'build', 'autarkie', 'bildtor', 'smoke', 'uxtor', 'uxaudittor']);
const zuruecknehmen = (tor) => {
  execSync('git checkout -- .', { cwd: ROOT, stdio: 'pipe' });
  if (BAUT.has(tor)) execSync('npm run build', { cwd: ROOT, stdio: 'pipe', env: TOR_UMGEBUNG });
};

console.log(`Gegenproben: ${liste.length} von ${PROBEN.length} — Umfang: ${umfangGrund}\n`);
standSelbsttest();
umfangSelbsttest();
umfangBericht();


// --- Zuerst: sind die betroffenen Tore ueberhaupt GRUEN?
//
// Eine Gegenprobe sagt "schlaegt an", wenn das Tor mit dem eingebauten
// Fehler rot ist. Sie sagt NICHTS darueber, ob es vorher gruen war - und
// ein Tor, das schon vorher rot ist, schlaegt bei jedem Eingriff an. Damit
// bewiese die Probe genau nichts (Regel 13: wer eine Wirkung misst,
// schaltet sie zuerst ab).
//
// Aufgefallen in v158: TF-015 hatte den Frostueberzug abgeschnitten, das
// Bildtor meldete 0 statt 3409 Bildpunkte - und die Probe "Gebremste Gegner
// sehen aus wie freie" meldete trotzdem brav "schlaegt an".
//
// Gefahren wird jedes betroffene Tor genau EINMAL. Beim vollen Lauf ist das
// die ganze Kette und kostet rund zwei von dreiunddreissig Minuten; bei
// einem gefilterten Lauf nur die paar Tore, um die es geht.
{
  const tore = [...new Set(liste.map((p) => p.tor))].sort();
  const rot = [];
  for (const t of tore) {
    if (BAUT.has(t)) execSync('npm run build', { cwd: ROOT, stdio: 'pipe', env: TOR_UMGEBUNG });
    try { execSync(`npm run ${t}`, { cwd: ROOT, stdio: 'pipe', env: TOR_UMGEBUNG }); }
    catch { rot.push(t); }
  }
  if (rot.length) {
    console.error(`PROBEN: ${rot.length} Tor(e) sind schon OHNE eingebauten Fehler rot: `
      + `${rot.join(', ')}.`);
    console.error('  Eine Gegenprobe an einem roten Tor beweist nichts - sie schlaegt an,');
    console.error('  gleich was man einbaut. Erst die Kette gruen bekommen.');
    process.exit(1);
  }
  console.log(`  ${tore.length} betroffene(s) Tor(e) vorher gruen: ${tore.join(', ')}\n`);
}

const fehler = [];
for (const p of liste) {
  const pfad = join(ROOT, p.datei);
  const vorher = readFileSync(pfad, 'utf8');

  // Greift der Eingriff überhaupt? Drei von zehn Proben sind daran einmal
  // gescheitert, und ein nicht angekommener Eingriff sieht aus wie ein
  // bestandenes Tor.
  const nachher = p.regel
    ? vorher.replace(p.regel, p.ersatz)
    : vorher.split(p.suche).length - 1 === 1
      ? vorher.replace(p.suche, p.ersatz)
      : null;
  if (nachher === null || nachher === vorher) {
    const treffer = p.regel ? 0 : vorher.split(p.suche).length - 1;
    console.log(`  ${p.name.padEnd(42)} MUSTER ${treffer === 0 ? 'FEHLT' : `${treffer}x`} in ${p.datei}`);
    fehler.push(`${p.name}: Eingriff kam nicht an (${p.regel ? 'Regel' : `Muster ${treffer}x`}).`);
    continue;
  }

  writeFileSync(pfad, nachher);
  let schlaegtAn = false;
  let ausgabe = '';
  try {
    ausgabe = execSync(`npm run ${p.tor}`, {
      cwd: ROOT, encoding: 'utf8', stdio: 'pipe', env: TOR_UMGEBUNG,
    });
  } catch (e) {
    schlaegtAn = true;
    ausgabe = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  zuruecknehmen(p.tor);

  // Nicht jede Pruefung bricht ab. Der Dokumentenwaechter meldet Veraltetes
  // als Hinweis und laeuft weiter - mit Absicht, denn eine schiefe Formulierung
  // soll die Lieferung nicht aufhalten. Bis v103 hiess das aber auch: dieser
  // Teil liess sich gar nicht gegenproben, und genau dort sass der Fehler
  // (fuenf von sechs Hinweisen schlugen bei richtiger Prosa an).
  //
  // `meldet` prueft deshalb den Text statt den Abbruch, `meldetNicht` die
  // Stille. Beide zusammen sind erst der Beweis: dass etwas anschlaegt, sagt
  // nichts, solange es bei allem anschlaegt.
  const erfuellt = p.meldet
    ? ausgabe.includes(p.meldet)
    : p.meldetNicht
      ? !ausgabe.includes(p.meldetNicht)
      : schlaegtAn;
  const art = p.meldet ? 'meldet' : p.meldetNicht ? 'schweigt' : 'schlägt an';
  const grund = p.meldet
    ? `"${p.tor}" meldet "${p.meldet}" nicht, obwohl der Fehler eingebaut ist.`
    : p.meldetNicht
      ? `"${p.tor}" meldet "${p.meldetNicht}", obwohl der Text richtig ist.`
      : `"${p.tor}" bleibt grün, obwohl der Fehler eingebaut ist.`;

  // **Wenn die Probe nichts beweist, sagt der Befund WORAN es lag** (v337).
  //
  // Bis v336 stand da nur "meldet X nicht". Der Nachtlauf vom 11.09. hat
  // damit eine Probe gemeldet, deren Eingriff den Baum gar nicht geaendert,
  // sondern ZERBROCHEN hatte: `suche` traf eine von zwei Zeilen eines
  // umgebrochenen Aufrufs, und `sim` starb beim Uebersetzen statt zu pruefen.
  // Rot aus dem falschen Grund sieht im Befund genauso aus wie stumm aus dem
  // richtigen - und die Ursache stand die ganze Zeit in der Ausgabe, die
  // niemand mitgeschrieben hat.
  //
  // Mitgegeben werden die letzten drei nichtleeren Zeilen. Ganze Protokolle
  // gehoeren nicht in einen Befund, der eingecheckt wird; drei Zeilen tragen
  // den Uebersetzungsfehler, den Stapelabzug und die Schlusszeile eines Tors.
  const letzte = ausgabe.split('\n').map((z) => z.trimEnd()).filter((z) => z.trim())
    .slice(-3).join(' | ').slice(0, 400);
  console.log(`  ${p.name.padEnd(42)} ${p.tor.padEnd(11)} ${erfuellt ? art : art.toUpperCase() + ' NICHT'}`);
  if (!erfuellt) {
    fehler.push(`${p.name}: ${grund}`
      + (letzte ? ` Zuletzt sagte "${p.tor}": ${letzte}` : ` "${p.tor}" sagte gar nichts.`));
  }
}

// Zum Schluss in jedem Fall: sauberer Quelltext UND sauberer Bau.
zuruecknehmen('build');

if (fehler.length) {
  console.error(`\nPROBEN: ${fehler.length} von ${liste.length} Toren beweisen nichts`);
  for (const f of fehler) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nPROBEN: alle ${liste.length} Tore schlagen an.`);

// Den Stand nur bei einem VOLLEN Lauf festhalten. Ein gefilterter Lauf hat
// die uebrigen Proben nicht angefasst - ihn mitzuzaehlen hiesse, sich den
// Abstand schoenzurechnen, und genau dafuer ist die Zahl nicht da.
if (VOLL && !filter.length && !TEIL) {
  // Fassung UND Commit: die Fassung traegt die Drei-Fassungs-Regel, der
  // Commit sagt dem naechsten Standardlauf, wogegen er `git diff` rechnet.
  const kopf = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  // Drittes Feld seit v269: wann dieser Lauf gefahren ist. Der Commit
  // taugt als Ersatz (siehe `standZeit`), aber nur ungefaehr - ein Lauf
  // kann Stunden nach seinem Commit starten. Die eigene Zeit ist genauer.
  const zeit = new Date().toISOString();
  writeFileSync(STAND_DATEI, `v${fassung()} ${kopf} ${zeit}\n`);
  console.log(`  Stand festgehalten: v${fassung()} ${kopf.slice(0, 8)} ${zeit} `
    + '(tools/proben-stand.txt).');
} else if (TEIL) {
  console.log(`  Stand NICHT fortgeschrieben - das war Scheibe ${TEIL.n + 1} von `
    + `${TEIL.m}. Sie hat die anderen nicht gesehen; der zusammenfuehrende `
    + 'Schritt schreibt ihn, wenn alle gruen waren.');
} else if (!filter.length) {
  console.log('  Stand NICHT fortgeschrieben - das war ein Umfangslauf, kein voller.');
  console.log('  Der volle Lauf faehrt nachts auf dem Runner, oder hier mit `-- --voll`.');
}
}
