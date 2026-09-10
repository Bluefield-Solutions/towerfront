# Towerfront

Browser-Tower-Defense, deutsch, eine autarke HTML-Datei. TypeScript 5 + Vite +
`vite-plugin-singlefile`, Canvas 2D, kein Spielgerüst von der Stange.

**Diese Datei wird zu Beginn jeder Sitzung gelesen. Sie ist kurz gehalten, weil
eine lange Datei nicht gelesen wird. Alles Ausführliche steht in `docs/`.**

---

## Ab v269: das Spiel wird neu gebaut

**Der Nutzer hat in v269 entschieden, Level, Spielregeln und Oberfläche von
Grund auf neu zu bauen.** Der Unterbau bleibt: Kurvenmodell, Renderer-Gerüst,
Bildvorrat, Buildkette und das ganze Messgerät.

| Datei | was drinsteht |
|---|---|
| `docs/Towerfront-NEUBAU.md` | **die oberste Arbeitsgrundlage.** Der Referenzabgleich, alle Beschlüsse mit Begründung, und was ausdrücklich verworfen wurde |
| `docs/Towerfront-KETTE.md` | wie eine Runde läuft, wenn niemand zusieht |
| `docs/Towerfront-STORIES.md` | die Stories in der Reihenfolge, in der sie gefahren werden. **Wieviele es sind, steht hier absichtlich nicht** — `npm run naechste --alle` zaehlt sie, und jeder Inspektorlauf legt welche nach (Regel 15) |

**Die vier Sätze, aus denen alles folgt:**

* **Der Weg wird die Entscheidung.** Alle drei Vorbilder (Defense Grid,
  Infinitode 2, Rogue Tower) machen den Weg zur Entscheidung, keiner den
  Turm. Towerfront legt ihn fest — das ist die Ursache hinter „folgenlos".
  Gebaut werden **Weichen** im gemalten Netz: keine neue Wegfindung, kein
  Gitter, das Messgerät bleibt gültig.
* **Der Bogen wird ein Roguelite-Lauf** mit Kartenzug je Welle und Kartenwahl
  je Abschnitt. Turmzweige, Stufen, Grade und Sterne entfallen dafür.
* **Der Bauplatz wird knapp**: Einkommensgebäude, teurere Wiederholung,
  reparierbarer Kristall — dieselbe Fläche für drei Zwecke.
* **Leichte Schrägsicht, industrieller Stil, dunkler Grund.** Gemalt, nicht
  projiziert: die Weltkoordinaten bleiben flach, sonst verlieren `bahnmass`,
  `bauflaeche`, `wegdeckung`, `gedraenge`, `beruehrung` und `einbettung` in
  einem Zug ihren Gegenstand.

**Die Torkette läuft seit v269 auf dem Runner, nicht mehr hier** (gemessen
426 s je Lauf). Hier läuft `npm run vorlauf` — 4,4 s, nur `tsc`. Was das für
eine Runde heißt, steht in `docs/Towerfront-KETTE.md`.

## Nach dem Umzug: Rohbilder liegen nicht in Git

`art/roh/` ist ausgenommen (79 MB gegen 1,2 MB gepackt). Zum Bauen und Spielen
werden nur die gepackten Fassungen in `src/gfx/assets/` gebraucht - geprueft,
Build und Rauchtest laufen ohne die Rohbilder durch.

**Wer neue Bilder einbaut:** ablegen unter `art/roh/`, `npx tsx
tools/pack-art.mjs` laufen lassen, das ERGEBNIS einchecken. Wer nur am Code
arbeitet, braucht sie gar nicht.

---

## Wie hier gearbeitet wird

Der Nutzer gibt ein **Ziel** und ein **Abnahmekriterium**. Alles Weitere läuft
ohne ihn. Ein Durchgang:

```
0. Referenzabgleich   Drei Vorbilder benennen, aufschreiben was sie TUN,
                      Soll ableiten, Abstand messen. Entfällt nur, wenn es
                      für dieses Ziel schon einen Abgleich gibt.
1. Arbeiter           Genau ein Ziel umsetzen. Entscheidet nicht über Fertigkeit.
2. Prüfer             npm run schleife  →  schleife/bericht.md
3. Inspektor          Sieht nur Bericht und Bilder, nicht den Code und nicht
                      die Absicht. Urteil: Freigabe · neue Schleife · Rückbau.
```

**Höchstens drei Schleifen je Ziel.** Danach ist nicht die Ausführung das
Problem, sondern das Ziel — dann zurück zum Nutzer.

Jede angenommene Runde: `git commit` + `git tag vN`. Push auf `main` löst die
Auslieferung aus, aber **nur bei grüner Torkette**
(`.github/workflows/deploy.yml`).

### Was wann läuft (seit v155)

| Wann | Was | Dauer |
|---|---|---|
| **jede Runde** | `npm run vorlauf` — nur `tsc`, kein Tor | **4,4 s** |
| jeder Push auf `master` | die volle Torkette auf dem Runner | 3–4 min, ohne mich |
| **jede Nacht** | `npm run proben -- --voll` auf dem Runner | rund 50 min, ohne mich |
| bei Bedarf | `npm run gate` von Hand | **gemessen 426 s (7:06)** in v268 |

**Seit v269 ist es eine ZEITratsche, keine Fassungsratsche.** `npm run muster`
liest `tools/proben-stand.txt` und bricht ab, wenn der letzte volle Lauf älter
als **24 Stunden** ist. Vorher waren es drei Fassungen; das trug, solange eine
Fassung ungefähr ein Tag war, und blockierte die Kette, sobald sie schneller
wurde — sechs Runden in einer Nacht hätten sie zweimal für je 50 Minuten
angehalten. Wovor die Ratsche schützt (eine Probe hört leise auf zu beweisen),
ist ohnehin eine Frage von Zeit. Die Fassungszahl steht weiter in der Meldung,
sie urteilt nur nicht mehr.

Das Alter kommt aus einem dritten Feld in der Standdatei — **und sonst
nirgends**. Der erste Entwurf hatte einen Rückfallweg über das Commit-Datum
des vermerkten Standes, und der hat in v270 den ersten Runner-Lauf rot
gemacht: hier ging er, weil der Baum die ganze Geschichte hat; auf dem Runner
nicht, weil `actions/checkout@v4` **flach klont** und den Commit dort gar
nicht gibt. Dieselbe Klasse wie v225 — eine Regel, die auf einem Rechner
beweist und auf dem anderen nicht, ist keine.

**Ein unbekanntes Alter zählt als zu alt**, und genau das hat den Fehler laut
gemacht statt still: mit der Vorgabe „unbekannt ist frisch" hätte die Ratsche
vom ersten Tag an geschwiegen. Der Stand von v265 hat seine Zeit einmalig von
Hand bekommen; ab dem nächsten Nachtlauf schreibt der Runner sie selbst.

Erzwungen, nicht aufgeschrieben — eine Regel, die nur in einem Dokument steht,
wird gebrochen; das hat dieses Projekt sechsmal gekostet.

**Seit v221 muss der volle Lauf dafür niemandem die Zeit stehlen.** Er läuft
nachts auf dem Runner (`.github/workflows/proben.yml`) und schreibt bei
Erfolg Fassung **und Commit** in `tools/proben-stand.txt`. Der tägliche Lauf
hier ist ein **Umfangslauf**: er fährt nur die Proben, deren **Zieldatei**
seit dem letzten vollen Lauf angefasst wurde — oder deren `haengtAn` (v225).
Gemessen sind das nach einer Runde **11 Proben statt 253**, nach zweien 26.

Das Werkzeug des Tores zählt bewusst nicht mit, obwohl es naheliegt: an
`tools/smoke.ts` hängen 86 Proben, und eine einzige Zeile darin zöge den Lauf
von 11 auf 99 Proben und von vier Minuten auf anderthalb Stunden. Wer ein Tor
anfasst, fährt seine Proben gezielt — `npm run proben smoke` nimmt jeden
Namen und jedes Tor als Filter.

**Was der Umfangslauf nicht kann**, und das ist der Grund für die Nacht: eine
Probe kann auch verfallen, weil sich die **Karte** geändert hat und ihr Fall
nicht mehr vorkommt — genau das ist in v219 viermal passiert, und keine der
vier Zieldateien war angefasst.

**Seit v225 verschweigt er es wenigstens nicht mehr.** Er nennt die Zahl der
übersprungenen Proben, ihre Verteilung auf die Tore und den letzten vollen
Lauf — und wenn sich eine **Weltdatei** geändert hat (Karten, Wellen, Gegner,
Türme, Fähigkeiten, Grade), sagt er das eigens. Vorher stand am Ende „alle 11
Tore schlagen an", und das las sich wie ein Freispruch für 253.

Dazu ein Feld, das die Lücke wirklich schließt, wo man sie kennt:
**`haengtAn`** sagt, wovon der FALL einer Probe abhängt — `datei` sagt nur,
wo sie eingreift. Vier Proben tragen es, jede beim Lesen belegt. **Meine
erste Vermutung war gemessen falsch:** ich hielt die betroffenen für die mit
Zieldatei in `tools/`, tatsächlich lag nur eine der vier v219-Proben dort,
die anderen drei in `src/data/waves.ts` und `src/game/state.ts`. Gekostet hat
es in dieser Runde **zwei zusätzliche Proben** (80 statt 78) — die anderen
zwei wären ohnehin mitgefahren.

**Warum nicht öfter und nicht seltener.** Das Tor-Audit
(`docs/Towerfront-TOR-BILANZ.md`) hat gemessen: der volle Lauf ist **33
Minuten echte Arbeit** — er wird durch kein Gedächtnis kürzer, weil jede
Probe einen Eingang ändert. Bei einer Runde mit zwei geänderten Toren haben
aber **140 von 142 Proben nichts zu prüfen, was sich geändert hätte**.
Seltener als jede dritte Fassung ginge trotzdem nicht: eine Probe hört
*leise* auf zu beweisen, und je mehr Fassungen dazwischenliegen, desto
schwerer ist der Tag zu finden, an dem es passiert ist.

---

## Befehle

```
npm run vorlauf     nur `tsc`, gemessen 4,4 s. **Kein Tor** - die Weigerung,
                    etwas hochzuschieben, das gar nicht uebersetzt. Das kostet
                    sonst einen vollen Runner-Durchlauf (3-4 min) fuer eine
                    Auskunft von vier Sekunden. Seit v269 ist das der einzige
                    Schritt, der je Runde hier laeuft.
npm run gate        dreiunddreissig Prüfungen. Läuft seit v269 auf dem Runner;
                    hier nur noch von Hand, wenn eine Frage es verlangt.
                    **Gemessen 426 s (7:06) in v268** — Schritt für Schritt
                    einzeln, nacheinander, auf demselben warmen Baum.
                    Dieselbe Falle zum dritten Mal: hier stand „rund 190 s"
                    (v154, 97 Fassungen lang), dann „289 s (4:49)" (v251,
                    17 Fassungen lang) — und beide Male steht darunter der
                    Satz, dass eine Laufzeit, die niemand nachmisst, nicht
                    länger wird, sondern nur falscher. Sie ist seit v251 um
                    137 s gewachsen, ohne dass jemand etwas gemerkt hätte.
                    **Sechs Schritte tragen 85 % davon**, und das ist der
                    Ansatzpunkt für jede Beschleunigung:
                      sim 158 s (v311 nachgemessen; v268 waren es 127) -
                      davon 107 s der LAUF (`--lauf`), also zwei Drittel.
                      Das ist der groesste Hebel, den es noch gibt: an `sim`
                      haengen 31 Gegenproben, und nur neun davon fragen nach
                      dem Lauf. Ein eigenes Tor dafuer spart rund 39 Minuten
                      Rechenzeit im Nachtlauf - bei sechs Scheiben aber nur
                      sechs Minuten Wanduhr, und die 38 Minuten blockieren
                      nichts mehr. Deshalb gemessen und NICHT gemacht ·
                      browser 76 s · wegdeckungtor 64 s ·
                      bildtor 41 s · smoke 29 s · uxaudittor 26 s
                    Die übrigen 27 Schritte zusammen: 63 s.
                    Messstelle (Regel 12): dieser Rechner, warmer Baum,
                    `grafiktor` und `zielplattentor` gegen einen gefüllten
                    `.abdruck/`-Zwischenspeicher — die zwei 0,7-s-Zahlen sind
                    Treffer im Speicher, kein voller Lauf.
npm run schleife    Torkette + Bildabnahme + Bericht + rechenbares Urteil
npm run bilder      alle Aufnahmen (echte PNG ohne Browser)
npm run bildtor     der Querschnitt, den die Torkette prüft - und seit v273
                    die OFFENEN BESTELLUNGEN: welche Bilder das Spiel
                    erwartet (`src/gfx/bestellung.ts`, abgeleitet aus
                    ENEMIES, MAPS und TOWER_ORDER) und im Vorrat nicht
                    liegen. Gruen, aber nie verschwiegen - ein fehlendes Bild
                    ist eine laufende Bestellung, kein Fehler im Code.
                    Gebaut wird gegen `getPlatzhalter`: Silhouette in der
                    richtigen Groesse, Schraffur, kein Detail, Marke
                    #FF00E5. Bis v272 war ein fehlendes Bild unsichtbar - es
                    fiel auf die gezeichnete Ersatzform zurueck, und die
                    sieht ordentlich aus.
npm run pack-art    Bildvorrat aus art/roh/ neu einbacken
npm run netz        haelt die abgeleiteten Bahnen gegen einen eingefrorenen
                    Stand. Seit v278 stehen die Punkte nicht mehr in
                    `maps.ts`, sondern als Knoten und Kanten in
                    `src/data/wegnetz.ts`; seit v279 wird die Route dazu
                    GERECHNET (`kuerzesteRoute` in `src/core/route.ts`,
                    Dijkstra nach Bogenlaenge) statt eingetragen. Gemessen
                    werden 64 Abtastpunkte je Bahn - die Kurve, nicht die
                    Kontrollpunkte -, dazu drei Selbsttests: der Rundlauf
                    (`netzAusBahnen` und `bahnenAusNetz` sind invers), die
                    Ausweichprobe (jede benutzte Kante einzeln gesperrt; die
                    Rechnung muss ausweichen oder melden, nie schweigen) und
                    die Wahl selbst an einem GESTELLTEN Netz mit zwei Wegen -
                    keine der vier Karten hat heute eine zweite Route, an
                    ihnen bewiese die Rechnung gar nichts (Regel 5).
                    `--schreiben` setzt den Stand neu.
npm run eichen      einen Wert durchprobieren, alle Kennzahlen nebeneinander.
                    `--kurve` die Schwierigkeitskurve, `--knie` das Knie der
                    Lebenspunktkurve (seit v258), `--leben` die Groesse des
                    Kristalls (seit v259), `--beute` das Einkommen im Grad
                    normal (seit v260), `--ruhig` die Lebenskurve NUR im Grad
                    Ruhig (seit v261), `--karte X --hp/--gold` den Ausgleich
                    einer Karte. Jede Zeile zeigt seit v260 auch Knappheit
                    und uebriges Gold.
npm run einbettung  misst, wie sehr eine Figur zur Karte gehört (--eichen: Raum)
npm run zielplatte  findet die Zielplattform im Kartenbild und prüft die Zahl.
                    Seit v216 auch die GÜTE: die Suche gibt immer einen
                    besten Punkt zurück, auch auf einem Bild ganz ohne
                    Platte - und der lag bisher ungeprüft neben der Zahl.
npm run speicher    misst den Bildspeicher ueber vier Kartenbesuche: fremde
                    Eintraege je Ablage und Zuwachs gegen den ersten Besuch.
                    `--tor` prüft die Grenzen. Eine Byte-Zahl allein sieht
                    NICHT, wenn sich eine Ablage abmeldet - deshalb steht
                    daneben eine Namensliste. Und die Leuchtscheiben werden
                    eigens geprüft: sie hängen an keiner Karte, wachsen also
                    mit der Spielzeit statt mit den Karten.
npm run kristall    misst, ob der Kristall seinen Zustand zeigt: Rissdeckung je
                    Stufe am gebackenen Erzeugnis und Kantenzuwachs im
                    gezeichneten Bild. `--tor` prüft die Grenzen. Der
                    Farbabstand taugt hier nicht - der Lichtkranz erschlägt
                    ihn.
npm run bahnsuche   sucht im gemalten Wegenetz eine Route, die es noch nicht
                    gibt, und schreibt sie zum Hineinkopieren aus. Ohne
                    `--von` zeigt es, wo die Strasse den Bildrand beruehrt.
                    `--mindest` wirft Aeste heraus, die fuer den breitesten
                    Gegner zu schmal sind - ohne das findet es Routen, die
                    es nur auf dem Papier gibt (auf dem Spiralhain traegt
                    die schmalste Stelle acht Weltpunkte).
npm run bahnbau     Bahnen aus einer BESCHREIBUNG erzeugen, messen und
                    eintragen. Der Entwurf steht als Daten in
                    `entwurf/bahnen.json` (Mittelachse, Tore, Querversatz je
                    Bahn, Massstab), gerechnet wird in `tools/bahnmass.ts` -
                    derselben Datei, die `npm run guards` benutzt. Das
                    Werkzeug drueckt die KURVE aus den unwegsamen Flecken,
                    misst jede Regel und traegt nur ein, wenn alle halten.
                    `--suche` faehrt den Massstab durch und zeigt, wo das
                    Fenster liegt - oder dass es keins gibt.
                    Vorher wurden Bahnen von Hand gesetzt und mit
                    Wegwerfskripten gemessen; in v236 rechnete die Werkbank
                    anders als der Waechter (81 % gegen 62 %), weil sie die
                    Bauplaetze aus der KARTE nahm statt aus dem Entwurf.
npm run weichenbau  eine Weiche messen, BEVOR sie in die Karte kommt. Der
                    Entwurf steht als Daten in `entwurf/weichen.json`,
                    gerechnet wird mit `tools/bahnmass.ts` - derselben Datei,
                    die `npm run guards` benutzt -, eingetragen wird ueber
                    denselben Schreiber wie bei `bahnbau`. Gemessen werden
                    Laengengewinn, Fleckabstand, Knick (dieselben 25 Grad wie
                    der Waechter), Feldrand und die Spreizung ueber alle
                    Stellungen. `--schreiben` traegt ein, wenn jede Regel
                    haelt. Die erste Weiche (v280) war von Hand gesetzt und
                    mit einem Wegwerfskript gemessen - genau der Zustand, den
                    v237 fuer die Bahnen abgeschafft hat.
npm run wellenbau   Wellenplaene aus einer BESCHREIBUNG erzeugen, messen und
                    eintragen. Der Entwurf steht als Daten in
                    `entwurf/wellen.json` (Form und Hoehe der Kurve, wer wann
                    zum ersten Mal kommt, Luftanteil, ab wann Schilde),
                    gerechnet wird in `tools/wellenmass.ts` - derselben
                    Datei, aus der `npm run guards` seine Zahlen nimmt.
                    `--schreiben` traegt ein. Die Form trifft es auf Anhieb
                    (null Rueckfaelle, Finale gleich Spitze); die HOEHE ist
                    noch nicht gegen `npm run sim` geeicht - der erste
                    Entwurf verlor in Welle 14.
npm run baukarte    wieviel einer Karte ueberhaupt einen Turm annimmt, und
                    WO. Gefragt wird `warumNicht` ueber ein Raster von vier
                    Weltpunkten, dazu ein Bild je Karte. Gemessen sind rund
                    30 % baubar, und die groesste zusammenhaengende Insel
                    haelt 65 bis 82 % davon - die Flaeche ist gut gebaut,
                    sie war nur unsichtbar.
npm run uxaudit     nimmt das GEBAUTE Spiel in den Zustaenden auf, die man
                    beim Spielen wirklich erreicht, und misst die Belegung
                    des Bildschirms mit `elementFromPoint` statt ueber
                    Umrisskaesten - die lassen sich durch Verschachteln
                    kleinrechnen. `--tor` prueft die Grenzen. **Seit v286 je
                    WURZEL aufgeschluesselt**, im Bericht wie im Befund. Die
                    nackte Prozentzahl nannte den Verursacher nicht: der
                    Befund zu v285 ("welle 16,5 gegen 16") sah nach dem
                    fuenften Bauknopf aus, und das Dock stand in Ruhe und
                    Welle bei denselben 10,4 %. Es war `#b-wave` mit 3,0
                    gegen 4,4.
npm run beruehrt    welche Tore an dem haengen, was gerade geaendert ist -
                    **seit v292 gilt fuer `autarkietor` eine Regel statt
                    einer Liste**: was unter `src/` liegt oder `index.html`
                    heisst, geht ins Buendel und beruehrt es. Vorher standen
                    dort zwei Dateien, und zweimal in drei Runden ist genau
                    deshalb der Runner rot geworden - einmal an einem
                    HTML-Kommentar, einmal an einer `blurb`-Zeile in
                    `towers.ts`.
                    gelesen aus den 346 Gegenproben, die ohnehin `datei` und
                    `tor` tragen, nicht aus einer zweiten Liste (Regel 15).
                    Dazu die Tore, die am gebauten BUENDEL messen und
                    deshalb keine Probe mit Zieldatei haben. Entstanden,
                    weil v286 `index.html` anfasste, fuenf passende Tore
                    lokal fuhr und `autarkie` nicht - genau das wurde auf dem
                    Runner rot, an einem Umlaut in einem HTML-Kommentar, der
                    mitausgeliefert wird. Es nennt, es faehrt nicht.
npm run bahnfit     zieht die Bahnen auf die gemalte Strasse (schreibt
                    maps.ts). `--umleiten` aendert Routen, nicht nur Lagen.
npm run bahntreue   prueft am Kartenbild, ob jede Bahn auf der GEMALTEN
                    Strasse laeuft - Ratsche, kein Soll. Gemessen wird die
                    Mittellinie UND der Schlauch (fuenf Querlagen bei -1 bis
                    +1 mal der halben Bahnbreite). Die Mitte allein sagt es
                    nicht: der Spiralhain steht dort auf 100 %, sein
                    Schlauch auf 51 % und dessen Rand auf 15 %.
npm run wegdeckung  misst das BILD gegen die Bahnen: wieviel der Karte ist
                    als Strasse gemalt, wieviel davon liegt an einer
                    benutzten Bahn, und wieviel Bebaubares sieht aus wie
                    Strasse. Auf dem Spiralhain sind 54 % der gemalten
                    Strasse Kulisse - daher kommt der Eindruck, man baue
                    auf den Weg. `--tor` prueft am gebackenen Untergrund,
                    ob die Kulisse sich vom benutzten Weg abhebt - Ratsche
                    je Karte, weil Weg und Boden auf der Frostspalte
                    einander ohnehin aehneln (43 Farbschritte) und auf dem
                    Spiralhain nicht (130).
npm run bauflaeche  haelt die GEZEIGTE Baukante gegen die Bauregel:
                    `isPointInPath` gegen `warumNicht`, 1200 Punkte je Karte
                    und Turmsorte. `--tor` prueft die Grenzen. Mit Nullprobe,
                    weil eine Null ohne sie nichts beweist - ein um sechs
                    Punkte verschobener Pfad muss durchfallen.
npm run konter      prueft, ob jede Gegnerart, an der etwas zu kontern ist,
                    es auch sagt - und ob es nicht ALLE tun.
npm run muster      prueft in 0,4 s, ob jede der 258 Gegenproben noch einen
                    Gegenstand hat - ohne ein Tor zu fahren. Ersetzt den
                    vollen Probenlauf nicht, faengt aber seine haeufigste
                    Verfallsart - und schlaegt an, wenn der volle Lauf mehr
                    als drei Fassungen zurueckliegt. Seit v227 liest er
                    ausserdem `tools/proben-befund.txt`: was der Nachtlauf
                    gefunden hat, macht die Torkette rot, statt im Protokoll
                    des Runners zu bleiben.
npm run bench       misst den heissen Pfad - und seit v272 als VERHAELTNIS,
                    nicht als Millisekundenzahl. Der Dichtefaktor ist die
                    dichte Last (320 Gegner) geteilt durch die duenne (24),
                    beide im selben Prozess; damit kuerzt sich die
                    Rechengeschwindigkeit heraus, und das Tor darf auf dem
                    Runner stehen (Regel 12). Stand in
                    `tools/bench-stand.txt`, Band 30 %, `--schreiben` setzt
                    ihn neu und lockert ihn dabei nie. Bis v271 hat es
                    NICHTS gemessen: Grenze 49-fach zu hoch, Last zu duenn,
                    Last schmilzt waehrend der Messung weg, und am Ende lief
                    gar keine Simulation mehr.
npm run streifen    misst beide Baender ueber dem Feld: die Wellenvorschau in
                    JEDER Welle und die Einweisungsblase beim laengsten Satz.
                    Echtes Markup, echte Stilvorlage - das Browsertor sieht
                    nur die erste, harmloseste Welle.
npm run gedraenge   misst die WIRKLICHE Breite jeder Gegnerfigur im
                    Bildvorrat gegen die engste Wegstelle - nicht ihre Kachel.
npm run muendung    prueft am Bildvorrat, wo das Rohr jedes Turms endet -
                    und dass die Muendung das Bild aendert, nicht das Spiel.
npm run geschosse   misst, wieviel Schaden in der Luft verpufft: Anteil der
                    zielsuchenden Schuesse ohne Wirkung, groesste
                    Richtungsaenderung, Luftfilter. `--tor` prueft die Grenzen.
npm run bahnentwurf was eine Bahn taugt, BEVOR die Simulation eine Minute
                    rechnet: Deckung durch die zwoelf besten Bauplaetze und
                    die WEGVIELFACHHEIT - gedeckte Bahnlaenge geteilt durch
                    zwei Reichweiten. 1,0 ist ein gerades Stueck, 2,0 sind
                    zwei Wege. In v217 haben drei Entwuerfe je einen
                    sim-Lauf gekostet, ohne dass die Meldung die Ursache
                    nannte; sie stand in diesen zwei Zahlen.
npm run gelaendesuche  liest die unwegsamen Flecken AUS dem Kartenbild statt
                    sie zu setzen - fuer eine Karte, deren Bild das Gelaende
                    mitbringt. Es entscheidet aber nicht: drei Kriterien, ein
                    Felsfeld von einem Schattenfleck im Gras zu trennen, sind
                    gemessen gescheitert. Deshalb legt es einen Kontaktbogen
                    vor, und der Blick trennt sie (Regel 8).
npm run gelaende    liest aus dem Kartenbild, woraus jeder unwegsame Fleck
                    besteht (Farbe, hart/kalt/locker) und legt einen
                    Kontaktbogen daneben. `--tor` prüft die Eintragung.
npm run doku        prüft die Dokumente gegen die Wirklichkeit - seit v224 auch,
                    ob ein als OFFEN gefuehrter Rueckstandspunkt noch offen IST.
                    Jede offene Zeile traegt eine Schliessbedingung, und die
                    wird gefahren. Drei Punkte standen offen da, waehrend sie
                    seit v217, v218 und v222 zugefallen waren. Seit v226 gilt
                    dasselbe eine Tabelle tiefer: eine FUNDZEILE darf Offenheit
                    nur behaupten, indem sie einen Punkt nennt, den es in einer
                    Offen-Tabelle gibt. Vier taten es nicht. Seit v256 meldet
                    er ausserdem, wenn das gesuchte Wort nur in ANDERER
                    Schreibweise in der Zieldatei steht - genau daran hing E6
                    zehn Fassungen lang.
npm run lesbarkeit  Kontrast jeder Figur gegen den Untergrund, Groesse auf dem
                    Bildschirm, Farbabstand der Gegnerarten. **Seit v274 gegen
                    das GEBACKENE Terrain** - bis v273 gegen das gepackte
                    Rohbild, also gegen einen Grund, den niemand sieht
                    (Regel 12). Der Unterschied ist der Messwert selbst: 20
                    von 20 Figuren liegen unter der Lesbarkeitslinie,
                    gemeldet waren 8. Gefunden hat es ein Durchlauf, kein
                    Verdacht: `BODEN_HELL` sechsmal durchprobiert, sechsmal
                    dieselbe Zahl. **Seit v275 zwei Flaechen je Karte** - der
                    Weg, auf dem die Gegner laufen, und der Boden daneben.
                    Sie stehen 53,6 bis 60,9 Farbschritte auseinander
                    (`wegdeckung` pflegt dieselbe Zahl als Abnahme), und der
                    Mittelwert mittelte genau den Fall weg, der zaehlt.
                    Gemessen: der Spiralhain-Weg ist mit 2,4 % dreimal
                    DUNKLER als sein Boden, die Wege von Ascheschlucht und
                    Frostspalte mit 14 % doppelt so HELL. 14 von 20 Figuren
                    liegen im Koerperkontrast unter dem Soll, alle gegen
                    einen Weg. Beide Ratschen halten den Stand; das Soll
                    kommt vom Handy (Regel 10) und wird bei jedem Lauf
                    genannt.
npm run beruehrung  prüft, ob alles mit dem Daumen zu treffen ist
npm run proben      baut Fehler ein und prüft, ob die Tore anschlagen - im
                    Standardlauf nur die, deren ZIELDATEI oder `haengtAn`
                    seit dem letzten vollen Lauf angefasst wurde (nach einer
                    Runde 11 statt 253). Er sagt seit v225 auch, was er NICHT
                    geprüft hat - und eigens, wenn sich eine Weltdatei
                    geändert hat. Ein Name oder ein Torname als Argument filtert
                    gezielt. `-- --voll` fährt alle; das dauert rund 50
                    Minuten und läuft deshalb nachts auf dem Runner.
                    **Seit v307 in Scheiben:** `-- --voll --teil=N/6` faehrt
                    jede sechste Probe. Der volle Lauf ist gemessen laenger
                    als zwei Stunden - er ist am 10.09.2026 an seiner eigenen
                    Zeitgrenze gestorben, ohne Stand und ohne Befund. Eine
                    Scheibe schreibt den Stand NICHT; das tut der
                    zusammenfuehrende Schritt, wenn alle sechs gruen waren.
npm run naechste    welche Story als naechste dran ist, mit ihrem vollen
                    Text - gelesen aus `docs/Towerfront-STORIES.md`, nicht
                    gemerkt. **Seit v289 liest es auch "Haengt an"** und
                    ueberspringt, was auf eine offene Story wartet - nie
                    still, der Grund steht darueber. Vorher nahm es die erste
                    offene in Dokumentreihenfolge, und damit blockierte eine
                    Story, die auf eine SPAETERE wartet, die ganze Kette:
                    genau das in v287, als gemessen herauskam, dass S-N3-02
                    an S-N3-04 haengt und nicht umgekehrt. Warten alle
                    aufeinander, ist es ein Ring - dann bricht es ab, statt
                    sich eine auszusuchen. Die Kette laeuft ueber Kontextgrenzen hinweg;
                    wer sich den Stand merkt, hat nach dem ersten Neustart
                    nichts mehr in der Hand. `--alle` zeigt den Stand aller
                    42. Es entscheidet nicht: die Reihenfolge des Katalogs
                    ist begruendet (Abschnitt 4).
npm run sim         Balance kopflos, drei Aussaaten - und seit v253 die
                    SPANNUNGSRATSCHE: fuenf Kennzahlen (Stellen mit Verlust,
                    laengste folgenlose Strecke, uebriges Gold, Abstand der
                    Spielstile, kleinste Zweigwirkung) stehen in
                    `tools/spannung-stand.txt`, und der Lauf bricht ab, wenn
                    eine darunter faellt. Sie haelt gegen das gemessene
                    Rauschen der Kennzahl, nicht gegen eine nackte Zahl -
                    sonst schlaegt sie bei jedem zweiten Lauf an. Das SOLL
                    steht daneben und laeuft als Hinweis mit.
                    `--spannung-schreiben` setzt den Stand neu und schreibt
                    damit auch jeden Rueckschritt fest. Seit v254 zaehlt der
                    Lauf ausserdem die ENTSCHEIDUNGEN je Welle - gemessen
                    3,7 je Welle und 51 % in der ersten Haelfte, waehrend
                    das Audit "gut zwei je Welle, meistens frueh" rechnete.
                    Seit v255 dazu DAUER und LEERLAUF je Karte (Spiralhain
                    470 s). Der Leerlauf misst den Bot, und der startet jede
                    Welle im selben Bild - 0,1 %. Was ein Spieler als Warten
                    erlebt, steht daneben als DUENNE Zeit: hoechstens ein
                    Gegner auf dem Feld, gemessen 17 bis 23 %.
                    Seit v257 der KNAPPHEITSANTEIL: an wievielen
                    Entscheidungszeitpunkten das Gold fuer den gewollten Kauf
                    nicht reichte (Meister 45 %). Er tritt an die Stelle von
                    "Gold uebrig" - jene Zahl mass zur Haelfte den Deckel des
                    Bots: ungedeckelt bleiben 14,6 % liegen statt 35,2.
npm run fruehstart  was die Ueberlappung bringt und was sie kostet: derselbe
                    Bot dreimal ueber alle Karten - nie ueberlappend, selektiv
                    und durchgehend. `--hub 0,1,2,3` probiert den Risikoaufschlag
                    durch. Es braucht ein eigenes Werkzeug, weil `npm run sim`
                    drei Bots faehrt, die alle drei NICHT ueberlappen - wer den
                    Bonus dort einstellt, misst gegen einen Lauf, in dem er nie
                    anfaellt. Kein Tor: es misst, es urteilt nicht.
npm run inspektor   stellt die Beweismittel fuer den INSPEKTOR: Aufnahmen des
                    gebauten Spiels und den Bericht, in `schleife/inspektion/`.
                    Der Bericht wird um seinen Abschnitt "Umfang" beschnitten -
                    der nennt die geaenderten Dateien und damit die Absicht der
                    Runde, und wer die kennt, sieht das Bild nicht mehr.
                    **Es prueft mechanisch, dass kein Quelltext im Ordner
                    liegt**; "sieht keinen Code" waere sonst eine Zusage, die
                    niemand nachsieht. `--urteil <Freigabe|Schleife|Rueckbau>
                    "<Grund>"` haelt das Urteil fest (ohne Begruendung wird es
                    abgelehnt - ein Urteil ohne Begruendung ist ein Stempel),
                    `--pruefen` sagt, ob eines fuer DIESE Fassung vorliegt.
                    Vier Selbsttests bei jedem Lauf, weil es nicht in der
                    Torkette steht (v229: ein Werkzeug, dessen Eingang niemand
                    prueft, ist im Ernstfall kaputt).
                    **Seit v275 sagt es vorweg, ob es ueberhaupt etwas Neues
                    zu sehen gibt** - verglichen werden die EINGAENGE des
                    Bildes (alles unter `src/`, dazu `index.html`), nicht
                    seine Bildpunkte, und die Zeile mit `VERSION` zaehlt nicht
                    mit. Der erste Entwurf hashte die Bildpunkte und ist genau
                    daran gescheitert: die Fassungsnummer steht in jedem Bild
                    und steigt jede Runde, die Pruefung haette nie
                    angeschlagen (Regel 5). Absichtlich zu weit gefasst - zu
                    weit kostet einen ueberfluessigen Durchgang, zu eng einen
                    ungesehenen Stand.
npm run kritik      Wertung nach Testerkategorien, Ziel über 90
npm run sim -- --lauf  nur der Lauf und seine Abschnittswahl - gemessen 104 s
                    statt eines vollen Durchlaufs. Es urteilt trotzdem: die
                    Spreizung zwischen den Auflagen (v305 gemessen 142,4) und
                    die Zahl der Wahlen sind dieselben Fehler wie im vollen
                    Lauf. Derselbe Grund wie bei `--faehigkeiten`.
                    `--steigung=a,b,c` faehrt den Lauf je Wert einmal durch
                    und legt die Kristallverluste nebeneinander (Regel 9),
                    `--stile` dazu ueber alle drei Bots: ein Wert, der nur
                    fuer EINEN Bot traegt, ist keine Einstellung, sondern ein
                    Zufall.
npm run c18         die C18-Frage allein: ist die erste Karte ohne
                    Verbesserungen zu gewinnen? Zwei Sekunden statt zwei
                    Minuten - der Rauchtest misst dasselbe, braucht dafür
                    aber den ganzen Lauf. Kein Tor: es meldet, es urteilt
                    nicht. In v244 hat es zwölf Messwerte getragen, die
                    sonst je zwei Minuten gekostet hätten.
Messschalter        In der Kopfzeile des Spiels: Messung an, und die Tafel
                    läuft mit. Aufklappen zum Ablesen, Kopieren gibt alles
                    als Text heraus — ein Foto muss abgetippt werden, und
                    abgetippte Messwerte sind falsche Messwerte. `#messung`
                    in der Adresse tut dasselbe für einen Besuch.
npm run wegvorlage  ZWEI Referenzblätter je Karte, weil es zwei
                    Bestellungen gibt. `vorlage-<id>.png` fuer Abschnitt 8b
                    (Bild MIT Weg): der Bahnschlauch in voller Breite ueber
                    die heutige Karte, dazu Bausperre, Zielplatte und die
                    unwegsamen Flecken. `vorlage-<id>-gelaende.png` fuer
                    Abschnitt 8c (Gelaende OHNE Weg): flache Biomfarbe statt
                    Kartenbild, dazu nur die Ringe. Das 8b-Blatt taugt fuer
                    8c NICHT - wer einem Maler eine Strasse zeigt, bekommt
                    eine Strasse. Ein Prompt beschreibt eine Stimmung, keine
                    Geometrie; dreimal hat genau das eine falsche Strasse
                    gebracht.
npm run bildprompt  gibt EINEN Bild-Prompt vollstaendig aus - Stil-Block
                    schon eingesetzt, zum Kopieren in einem Stueck. Ohne
                    Suchtext listet es alle. Das Dokument haelt den
                    Stil-Block einmal (Regel 15), der Empfaenger bekommt
                    ihn trotzdem jedes Mal mit.
npm run kartenprobe ein Kandidaten-KARTENbild pruefen, BEVOR es gepackt wird:
                    Mitte, Schlauch, Rand, Nutzung, Seitenverhaeltnis. Die
                    Grenzen liest es aus dem Bildauftrag (Abschnitt 8b),
                    steht also nicht ein zweites Mal da. `--bestand` misst
                    den heutigen Vorrat - der faellt durch, und genau
                    deshalb sind die drei Karten neu bestellt.
npm run bildwissen  baut die Wissensdatei fuer einen fremden Bild-Agenten:
                    bilder/TOWERFRONT-BILDWISSEN.md, dazu der Text fuers
                    Anweisungsfeld. Erzeugt, nicht geschrieben - eine von
                    Hand gepflegte zweite Fassung des Auftragswissens waere
                    Regel 15 in Reinform. Die Zahlen darin sind gemessen.
npm run probebild   Kandidatenbilder pruefen, BEVOR sie gepackt werden:
                    Format, Alpha, Rand, reines Schwarz, Feindetail,
                    Lichtwinkel - und die Silhouetten-Aehnlichkeit
                    UNTEREINANDER. Aufruf mit -- <ordner>. Die Feindetail-
                    Grenze gilt in ANZEIGEGROESSE, nicht an der Quelle: die
                    beiden Zahlen liegen um Faktor 2 bis 3 auseinander, und
                    bis v204 stand hier die falsche - ohne Grenze.
npm run rohbilder   welche Rohbilder fehlen und woran das hängt
npm run turmprobe   EINEN Entwurf messen und neben den heutigen Turm legen
npm run turmzeichnen  einen Turm konstruieren statt kaufen (Entwurf, nicht im Spiel)
npm run appsymbol   Startbildschirm-Symbol und die zehn Startbilder backen
npm run kartenwechsel  was ein Kartenaufbau an Bildpunkten kostet
                    (mit `-- --browser` zusätzlich im Browser mit Telefondrossel)
```

Die Torkette: `tsc` → `guards` → `netztor` → `doku` → `muster` → `art` → `determinism` → `sim` →
`konter` → `geschosse` → `muendung` → `gedraenge` → `bahntreue` → `bauflaeche` →
`wegdeckung` → `bench` →
`bench-draw` → `kartenwechsel` → `grafiktor` → `einbettung` → `zielplatte` → `kristall` → `speicher` → `gelaende` → `lesbarkeit` → `beruehrung` → `streifen` → `bildtor` → `smoke` →
`build` → `autarkie` → `browser` → `uxaudittor` → `bericht`.

`npm run browser` lädt die **gebaute** Datei in Chromium (iPhone quer) und ist
damit das einzige Tor, das die Kaskade wirklich rechnet. Einzeln aufgerufen
verlangt es einen frischen Build; `npm run browsertor` baut selbst.

---

## Eiserne Regeln

Jede hat mindestens eine Runde gekostet. Sie stehen hier, damit sie nicht ein
zweites Mal kosten.

1. **Erst einchecken, dann gegenproben.** Gegenproben arbeiten mit
   `git checkout` und löschen sonst die frische Arbeit. **Vier Mal passiert**,
   zuletzt in v49 — obwohl die Regel seit v40 hier steht. Deshalb setzt
   `npm run proben` sie jetzt durch und verweigert den Dienst bei schmutzigem
   Baum. Eine Regel, die nur aufgeschrieben ist, wird gebrochen.
2. **Grenzen anteilig, nie absolut.** Als der Kristall von 20 auf 60 stieg,
   wurden fünf Prüfungen still bedeutungslos, ohne dass etwas rot wurde.
   Dreimal dieselbe Falle.
3. **Prüfen, ob der Eingriff angekommen ist.** Drei von zehn Fehlerinjektionen
   scheiterten an der Probe, nicht am Tor.
4. **Das Modell darf nicht vom Gemessenen abhängen.** Hängt die Bewertung der
   Bauplätze an den Turmwerten, misst die Simulation zwei Dinge auf einmal.
5. **Eine Prüfung, die nie etwas meldet, ist kein Beweis.** `npm run proben`
   hält zwölf stehende Gegenproben und führt sie aus. Wer ein Tor ändert,
   trägt dort eine Probe nach. Jede Probe prüft zuerst, ob ihr Eingriff
   überhaupt angekommen ist — drei von zehn sind daran einmal gescheitert,
   und ein nicht angekommener Eingriff sieht aus wie ein bestandenes Tor.
6. **Im Menü ist keine Spielbedienung sichtbar. Niemals.** Keine Turmknöpfe,
   keine Kopfzeile, kein Prüfsteg — auf der Landkarte, in der Einweisung, im
   Fortschritt, auf dem Ergebnisbildschirm. Das ist zweimal schiefgegangen:
   einmal, weil niemand die Leiste ausblendete, und einmal, weil beim ersten
   Laden kein Phasenwechsel stattfand und der Aufruf ausblieb.

   Deshalb ist es **kein Schalter mehr, sondern eine Ableitung**: `ui.sync()`
   setzt die Sichtbarkeit in jedem Bild aus `istMenuOffen()`. Es gibt keine
   Stelle mehr, an der man es vergessen kann — und wer diese Ableitung
   entfernt, wird von `npm run proben` erwischt.
7. **Vor jeder Lieferung die vier Aufnahmen aus `npm run kritik` ansehen.**
   In v50 lag die Turmleiste über der Landkarte, man kam nicht ins Spiel, und
   alle vierzehn Tore waren grün. Ein Tor prüft, ob etwas funktioniert — nicht,
   ob man es spielen kann.
8. **Kein Tor ersetzt den Blick — und kein Blick die Tore.** Elf von 57
   Befunden kamen aus Bildschirmfotos. Seit v47 prüft `bildtor` wenigstens
   das Mechanische: einfarbige Fläche, falsche Helligkeit, nicht dekodierte
   Bilder. Ob es *gut aussieht*, sagt es weiterhin nicht.
9. **Vor dem Justieren den Raum ansehen.** `npm run eichen` probiert einen
   Wert durch und legt alle Kennzahlen nebeneinander. Blind nachjustieren
   heisst, durch ein Schlüsselloch zu schauen: T15 scheiterte so an drei
   Runden und gelang im zweiten Anlauf in einer.
10. **Das Soll kommt aus der Referenz, nicht aus mir.** Sonst wandert es mit
   der eigenen Leistung mit. Deshalb Schritt 0.
11. **Safari-Falle:** nie `drawImage(self)` mit `filter: blur` oder
   `globalCompositeOperation: 'lighter'`. Auf iOS schwarzes Bild nach etwa
   einer Sekunde, auf dem Schreibtisch unauffällig. Alles Leuchten wird
   gebacken.

12. **Jede Zahl trägt ihre Messstelle mit.** Gemessen woran, in welcher
   Auflösung, in welcher Umgebung. Fünf Runden kosteten genau das: die
   Figurendichte am Quellbild statt in Anzeigegröße (S84), der Untergrund am
   Foto statt am gebackenen Terrain (S86), der Kartenwechsel in Node statt im
   Browser (S105, Faktor zehn daneben), ein Vergleich mit Vignette gegen einen
   ohne (S110). Und zuletzt: die Browserzahlen entstehen unter **SwiftShader,
   also ohne Grafikkarte**. Der JavaScript-Anteil trägt auf ein Telefon über,
   Rastern und Zusammensetzen nicht. `npm run kartenwechsel -- --browser`
   schreibt das jetzt selbst über jeden Lauf — eine nackte Millisekundenzahl
   ist in diesem Verzeichnis kein Beleg mehr.
13. **Wer eine Wirkung misst, schaltet sie zuerst ab.** Eine Prüfung ist erst
   dann eine, wenn die Zahl OHNE die Sache messbar fällt. Sonst misst sie
   etwas anderes, das lauter ist — und bezeugt die Sache, ohne sie je
   geprüft zu haben. Vier Fälle in einer Runde (S126): die Ruheprüfung maß
   erst den Bodennebel, dann das Pulsieren der Türme, dann zwei
   Nulldurchgänge, und zuletzt lief der geprüfte Zweig gar nicht — bei einem
   halben Turm Versatz. Und im selben Zug meldete das Grafiktor grün,
   obwohl zwei von drei Karten unter dem Band lagen: es mittelte.
   `npm run proben` setzt das für Tore längst durch. Für jede andere Messung
   ist es Handarbeit und dauert neunzig Sekunden.
14. **Ein Raster ist nur so fein wie sein kleinstes Ziel.** Das Browsertor
   suchte den Weg ins Spiel mit 45 Punkten Schritt — der „Spielen"-Knopf ist
   im schmalen Fenster 33 Punkte hoch. Es traf ihn auf dem Telefon durch
   Glück und meldete auf dem Schreibtisch „nicht spielbar", während das Spiel
   einwandfrei lief. Ein zu grobes Raster beweist weder das eine noch das
   andere. Der Weg wird jetzt einmal gefunden und in **Weltkoordinaten**
   nachgespielt — gefunden am laufenden Spiel, nicht abgeschrieben.
15. **Was zweimal dasteht, veraltet einmal.** Der Hochkant-Hinweis stand als
   `.rotate` und als `#quer` in derselben Datei. Gepflegt wurde `#quer`,
   ausgesperrt hat `.rotate`: ohne Zeigerprüfung deckte er jedes schmale
   Schreibtischfenster zu, und siebzehn Tore meldeten grün.

16. **Das erste gezeichnete Bild ist keine Messung — und die Ursache sind
   die Bilder, nicht das Zeichnen.** In v182 waren 97,6 % aller Bildpunkte
   verschieden bei identischem Zustand, in v188 noch 7,15 über 75 113
   Punkte. Beide Male habe ich zuerst etwas anderes vermutet; beim zweiten
   Mal stand die falsche Begründung schon im Verzeichnis.

   **Gemessen in v190, an der Nullprobe des Kristalltors:** ohne auf die
   Bilder zu warten sind zwei Bilder desselben Zustands an **87 898**
   Punkten verschieden — mit `bilderAbwarten()` an **null**. Ein Wegwerfbild
   allein ändert daran nichts; es lässt nur Zeit vergehen und ist damit eine
   Wette auf das Timing, keine Lösung. Wer den Kartenaufbau nicht
   abschliesst, misst ausserdem auf einem halbfertigen Untergrund.

   Deshalb gehört beides nicht in jedes Werkzeug, sondern in
   `tools/leinwand.mjs`: die Werkstatt gibt kein rohes „zeichne" heraus,
   sondern eine Leinwand, auf der man messen darf. Sie ist seit v191 die
   einzige Stelle im Baum, die ein Zeichengerüst stellt — vorher waren es
   sechs, und ein zweites daneben wirft jetzt. **Und jede Messung, die
   zwei Bilder vergleicht, führt eine Nullprobe mit.** Ist sie nicht null,
   ist die Messung noch keine.

---

## Aufbau

```
src/core/      Kurvenmodell (path.ts), Bedienung, Ton, Ablage, Schleife
src/data/      Türme, Gegner, Karten, Wellen, Grade, Verbesserungen
src/game/      Zustand (state.ts), Menü, Spielstand, Einführung
src/gfx/       Renderer, Untergrund, Bildvorrat, Menüzeichnung
tools/         Torkette, Bildabnahme, Schleifenwerkzeug
art/roh/       Rohbilder → tools/pack-art.mjs → src/gfx/assets/
docs/          Konzept, Rückstandsverzeichnis, Referenzabgleiche
```

**Das Weichenfenster wird jetzt von OBEN gehalten (v313, N4W).** Die
Gegenprobe zur unteren Schranke liess `saeule1` den Umweg statt des kurzen
Astes sperren — gemessen faellt dieser Eingriff heute vorher als **Dublette**
auf, und die Spreizung bleibt offen. **Fuenf Eingriffe gebaut und gemessen,
keiner traegt:** 1,17 · 1,34 · 1,23 · zweimal gar nicht stellbar. Der Grund ist
strukturell — vier unabhaengige Weichen halten das Fenster auf, und die
Rechnung sucht nach jedem Eingriff die kuerzeste Route neu.

Gehalten wird deshalb dieselbe Rechnung von der anderen Seite: eine
aufgeblaehte Umleitung treibt `laengste / kuerzeste` ueber 2,5, und das Tor
meldet den Knopf. Bricht die Rechnung, fallen beide Schranken. **Was
ungehalten bleibt, steht als N4W im Verzeichnis** statt still zu bleiben — mit
Schliessbedingung, also gefahren und nicht geglaubt.

**Der Befund hat sich selbst am Leben gehalten (v313).** Ueber der
Befund-Pruefung stand seit v227, sie sei - anders als die Standregel - nicht
unter `PROBENLAUF` ausgenommen, denn *„dort gibt es einen Ringschluss, hier
nicht"*. Drei Laeufe am 10.09.2026 messen das Gegenteil:

    ein roter Lauf schreibt einen Befund
      -> `muster` ist rot
      -> jede Scheibe mit einer `muster`-Probe arbeitet gar nicht erst
      -> der Lauf ist rot
      -> er schreibt einen Befund. Von vorn.

**Der Befund geht nur weg, wenn ein Lauf gruen ist, und kein Lauf kann gruen
sein, solange er dasteht.** Daher stand der Stand seit dem 09.09. auf v265, und
daher kamen die 5-Minuten-Scheiben in allen drei Laeufen — zweimal gesehen und
nicht erklaert.

Der Ring hatte zwei Straenge. Unter `PROBENLAUF` wird jetzt ein Befund
uebergangen, den dieser Lauf **nicht selbst angerichtet** hat; ein eingebauter
unterscheidet sich vom eingecheckten Stand und wird geprueft wie immer.
Ausserhalb bleibt alles wie seit v227. Und dieselben drei Gegenproben griffen
die Zeile `sauber ...` — steht dort ein Befund, gibt es das Muster nicht; sie
verloren ihren Gegenstand immer dann, wenn man sie am dringendsten braucht.

**Der Ruhezustand faellt von 15,5 auf 13,1 % (v315, S-N4-01).** Drei
GESPERRTE Faehigkeitsfelder belegten 260 x 46 Punkte, ohne dass man eines
davon druecken kann. **Ausblenden waere falsch gewesen, und das stand schon
da:** S2 des Abgleichs verlangt, dass ein gesperrtes Feld ein PLAN ist und
kein leerer Fleck. Beide Sollwerte vertragen sich, wenn der Plan bleibt und
die FLAECHE geht - sichtbar ist die naechste Freischaltung, die weiteren
stehen als Zahl daran.

**Der eigentliche Gewinn steht im Bild, nicht in der Zahl:** die Leiste passt
dadurch wieder in EINE Reihe statt in drei, und das Mittelband ueber der Bahn
ist frei. Genau das setzt das HUD-Audit vor den Anteil - *die Lage ist das
Hauptproblem, nicht der Prozentwert*.

**Grade und Sterne sind ausgebaut - und die zweite Haelfte ist gemessen
aufgeschoben (v314, S-N1-05).** Drei Grade und die Sternwertung beantworteten
dieselbe Frage wie die Laufstruktur; solange beides nebeneinander stand, mass
die Balance zwei Dinge auf einmal (Regel 4). Wie hart es wird, entscheidet
jetzt der Lauf; was ein Lauf wert war, sagen Kristall und Erfahrung. Die
Sterne trugen dabei noch etwas Zweites - welche Karten gewonnen sind -, und
das ist eine eigene Liste geworden, aus den alten Sternen **abgeleitet**,
damit niemandes Fortschritt verfaellt.

**Die Stufen bleiben vorerst, und der Grund sind zwei Zahlen.** Ein voll
ausgebauter Turm leistet das **5,4- bis 39,1-fache** seiner ersten Stufe (1205
bis 3010 Gold statt 55 bis 140). Und der Kartenstapel, der das auffangen
soll, traegt ueber einen ganzen Lauf gemessen **x1,48** Feuerkraft und x1,19
Reichweite - 200 Aussaaten, Grundstapel, drei Angebote je Welle. **Faktor 16
dazwischen.**

Der Grund steht in der Zusammensetzung: von zwoelf Grundkarten wirken nur
**vier** auf Feuerkraft, die uebrigen acht geben Gold, Beute und Kristall.

**Eine Schaetzung dazu war falsch, und sie steht in der Story als Warnung
drin:** "fuenfzehn Karten zu +10 % ergeben x4,2, die Groessenordnung stimmt
also" - gerechnet, als waere jede gezogene Karte eine Schadenskarte. Der
Unterschied zwischen x4,2 und x1,48 ist genau dieser Denkfehler, und er waere
in eine Runde Arbeit gelaufen, haette ihn niemand nachgemessen (Regel 9: erst
den Raum ansehen).

Damit ist die zweite Haelfte keine Ausfuehrungsfrage mehr, sondern eine
**Entscheidung ueber den Stapel** - er muesste um eine Groessenordnung
umgebaut werden, oder die Tuerme behalten einen Teil ihrer Steigerung. Das
gehoert dem Nutzer, nicht der Story. Der mechanische Rueckbau selbst ist
gemacht und wieder zurueckgenommen: er dauert zwanzig Minuten, die **rund 25
Pruefbloecke**, die dabei ihren Gegenstand verlieren, dauern laenger - allein
`npm run guards` hatte 58 Uebersetzungsfehler.

**Vier Rauchtest-Schritte konnten still scheitern (v313).** Der zweite volle
Probenlauf meldete `Der Kartenzug unterbricht die Welle: "smoke" meldet nicht`
— und hier bewies dieselbe Probe einwandfrei. Die Klasse aus v225, und die
Ursache lag nicht in der Probe: `step` nahm `fn: () => void` und rief `fn()` in
einem try/catch, aber **vier Schritte aus v303 bis v306 sind `async`**. Eine
async-Funktion wirft nicht, sie lehnt ein Versprechen ab — das try/catch fing
nie etwas, der Befund kam nie in `problems`, und ob die Ablehnung ueberhaupt
auftauchte, entschied ein Wettlauf mit dem Ende des Prozesses. **Dass es
auffiel, war Glueck**: vier Abnahmen aus vier Runden waren nur scheinbar
gehalten.

`step` nimmt jetzt auch ein Versprechen, haengt ein `catch` daran, und das
Urteil wartet die offenen Schritte ab. **Der ORT des Selbsttests dazu ist
gemessen, nicht gewaehlt** (Regel 13): oben bei `step` kam die Marke auch OHNE
das Abwarten an, weil dutzende `await`s der Datei dazwischenliegen und jedes
dem Zeitgeber eine Runde gibt — die Nullprobe blieb gruen und bewies nur die
Haelfte. Unmittelbar vor dem Abwarten schlagen beide an.

**Und der Befund hat ein Loch, das dieselbe Runde zweimal gekostet hat:** die
Zusammenfuehrung schnitt nur ab „beweisen nichts" aus. Eine Scheibe, die wegen
eines schon roten Tores gar nicht erst arbeitet, traegt damit NICHTS bei — am
10.09.2026 stand ein Befund da, der nur aus seiner Kopfzeile bestand. Jetzt
wird auch ab „sind schon OHNE eingebauten Fehler rot" ausgeschnitten, und ein
Befund ohne Inhalt sagt das selbst.

**Zwei Haushalte sind mit 0,2 KB Abstand zusammengestossen (v313).** Fuenf der
sechs Probenscheiben haben gar nicht erst gearbeitet: `PROBEN: 1 Tor(e) sind
schon OHNE eingebauten Fehler rot: autarkie` — eine Gegenprobe an einem roten
Tor beweist nichts, sie schlaegt an, gleich was man einbaut. Die Schutzregel
hat also getan, was sie soll; rot war das Tor trotzdem zu Recht.

Die Gruppenbudgets reservierten zusammen **1075 KB roh**, erlaubt waren
**1074,75**. Die Regel steht seit v186 und ist richtig — *waechst der Code,
schrumpft der erlaubte Bildvorrat von selbst*. Der Code ist ueber v303 bis
v313 auf 366,9 KB gewachsen, die Grenze liegt bei 366,7. **Gerichtet wurde die
RESERVIERUNG, nicht die Obergrenze**: `tuerme` von 445 auf 400, gemessen 302
ueber 18 Eintraege plus rund 50 fuer die drei offenen Bestellungen. Die 1800 KB
sind unberuehrt — eine Ratsche in der Runde zu lockern, in der die eigene
Aenderung an ihr scheitert, waere kein Beweis mehr (v219).

**Das Tor nennt jetzt den Abstand, nicht nur die Ueberschreitung** (heute 44,8
KB, und jedes KB Code kostet 0,75 KB Bildvorrat). Es schwieg bis zur Kollision
und meldete dann etwas, das seit vielen Fassungen naeher gekrochen war.

**Der erste Lauf, der rot werden konnte, war rot - und beide Befunde waren
Proben, keine Tore (v313).** v312 hat `set -o pipefail` und den Protokollgriff
eingebaut; der Lauf danach meldete sofort zwei Gegenproben ohne Gegenstand. Die
Reparatur hat sich damit in der Runde nach ihrem Einbau selbst belegt.

Beide waren an einem FORTSCHRITT gestorben, nicht an einem Fehler. Die eine
machte aus dem Bogenturm einen Bannturm, damit war C3 erfuellt, waehrend es
offen dastand — **C3 ist in v295 zugefallen**, und seitdem bewies sie nichts;
der Kommentar darueber sagte den Verfall sogar voraus, rechnete aber nicht
damit, dass der Punkt selbst verschwindet. Die andere haengte S-N3-04 an
S-N3-02, und **S-N3-04 ist seit v290 zu**: eine zugefallene Story wird gar
nicht erst auf ihre Abhaengigkeit angesehen, also **kam der Eingriff an und
bewirkte nichts**. Das ist die stillste Verfallsart, die es gibt, und die
einzige, die `npm run muster` nicht sieht — es prueft, ob das Muster noch
trifft, nicht ob der Treffer noch etwas bewirkt. Beide greifen jetzt an etwas,
das der Fortschritt nicht wegnimmt: die eine an der BEDINGUNG statt an ihrem
Gegenstand, die andere an der letzten Story des Katalogs.

**Und die erste Reparatur hat einen blinden Fleck des Doku-Waechters
aufgedeckt.** Sie schlug nicht an, obwohl der Eingriff ankam: seine
Kennungsregel `[A-Z]+\d+(?:-[A-Z])?` verlangt hinter der Ziffer entweder nichts
oder einen Bindestrich. **N1K und N1G enden auf einen Buchstaben** — beide
stehen seit v309 offen da, beide tragen eine Schliessbedingung, und keine ist
je ausgewertet worden. Dieselbe Klasse wie die Zahlwort-Tabelle in v230. Die
Kennung nimmt jetzt einen Buchstaben, und eine Zeile im Abschnitt „Offen",
deren Kennung der Waechter nicht lesen kann, wird **gemeldet statt
uebergangen** — sonst kommt derselbe Fleck mit der naechsten Namensform
zurueck.

**Der Nachtlauf konnte gar nicht rot werden - und das seit v221 (v312).** Der
Schritt lautete `npm run proben -- --voll ... 2>&1 | tee /tmp/proben-lauf.log`.
**Der Ausgang einer Rohrleitung ist der Ausgang des LETZTEN Gliedes**, also von
`tee`, und das gelingt immer. Der Lauf vom 10.09.2026 meldete deshalb sechs
gruene Scheiben, waehrend eine Probe ihren Gegenstand verloren hatte und der
Lauf mit Ausgang 1 endete. Bis v306 rettete es ein Griff nach dem Protokoll
(`grep "beweisen nichts"`); v307 hat den durch den Ausgang ersetzt und damit
die einzige funktionierende Haelfte entfernt. Jetzt `set -o pipefail` UND der
Protokollgriff - zwei unabhaengige Signale, an einer Stelle zu einem Urteil
zusammengefuehrt. **Ein Tor, das nicht rot werden KANN, ist kein Tor**, und
dieses konnte es anderthalb Jahre lang nicht.

**Danach die naheliegende Frage gestellt: gibt es das noch einmal?** Alle
vierunddreissig Schritte der Torkette durchgesehen, ob ihr Werkzeug ueberhaupt
einen Ausgang 1 kennt. Drei fallen auf, alle drei zu Recht: `tsc` und `build`
sind fremde Werkzeuge und melden selbst, und `bericht` ist ausdruecklich
**kein Tor** - es sagt das in seiner eigenen ersten Zeile. Der Fund von v312
lag im Ablaufplan, nicht in den Werkzeugen.

**Eine Gegenprobe hat sich selbst als wirkungslos erwiesen - und dabei ein Tor
entlarvt, das seine eigene Arithmetik mass (v311).** Die Probe zum Lauffaktor
baute den Fehler in `GameState` ein, und `npm run sim` meldete nichts:
`laufMessen` rechnete seine Rampentabelle DANEBEN noch einmal selbst, statt
sie am Spiel abzulesen. Ein Tor, das seinen Gegenstand nachrechnet statt ihn
abzulesen, prueft seine Kopie - Regel 5 und Regel 15 in einem. Gefunden hat es
Regel 3. Die Rampe steht jetzt an EINER Stelle (`GameState.laufRampe`), und
das Werkzeug liest sie ab.

**Der erste geteilte Probenlauf: sechs von sechs Scheiben gruen in 38 Minuten
(v310)** - gegen "in zwei Stunden nicht fertig und abgebrochen". Rot geendet
ist er trotzdem, an einem Waechter, der an der eigenen Arbeit anschlug: der
zusammenfuehrende Schritt schreibt erst den Befund und ruft dann
`--stand-schreiben`, und das prueft als erstes, ob der Baum sauber ist. Der
Check schuetzt davor, dass eine PROBE mit `git checkout` frische Arbeit
mitnimmt; wer keine Probe faehrt, braucht ihn nicht und darf an ihm nicht
scheitern.

**Ein Lauf hat zwei Kurven (v309, N1K).** Die eine laeuft INNERHALB eines
Abschnitts (ruhiger Anfang, steiles Ende - `hpScale`, geeicht an EINER Karte
mit fuenfzehn Wellen), die andere UEBER die Abschnitte. Bis v308 sollte eine
beide erledigen: `hpScale` ueber sechzig Wellen gestreckt, gemessen **0/0/0/6**
Kristall - drei Spaziergaenge und ein Abschnitt, der alles trug. Jetzt behaelt
jeder Abschnitt seine eigene Kurve und der Lauf legt einen Faktor darueber
(`laufFaktor`); bei Abschnitt 0 ist er 1, also rechnet eine einzelne Karte wie
vorher. **Der Wert ist gemessen und ein Kompromiss:** 1,6 sieht am besten aus
und traegt genau EINEN Stil (Breite und Sparsam verlieren dort je zwei
Abschnitte) - eine Nadel, keine Flaeche. Gesetzt ist **1,3**, der niedrigste
Wert, bei dem der Lauf jeden Stil etwas kostet. Nullprobe: bei 1,0 gewinnen
alle drei Stile alles. **Daraus der neue Punkt N1G:** Gold und Beute kaufen
Tuerme, die Turmzahl ist begrenzt, also kauft diese Achse nach dem Ausbau
nichts mehr - ueber 15 Wellen faellt das nicht auf, ueber 60 entscheidet es.

**Der Lauf zieht Karten - und N1K war ein Messfehler (v308).** Bis v307 fuhr
`laufMessen` einen Bot OHNE Deck durch sechzig Wellen und mass daran eine
Rampe von 14,89: "drei Spaziergaenge und eine Wand". Ein Spieler haette in
Welle 46 fuenfundvierzig Karten genommen. Mit Deck gewinnt derselbe Lauf
**alle vier Abschnitte** (60 von 60 Wellen, 1191 s), und die Nullprobe sagt,
dass es das Deck war: derselbe letzte Abschnitt faellt ohne Karten in Welle 9
und geht mit Karten mit 36 von 42 Kristall aus. **Die Rampe ist nicht zu
steil, sondern die Antwort auf ein Deck, das ueber sechzig Wellen waechst**
(Regel 12: die Messstelle war das Problem, nicht die Kurve). Was von N1K
bleibt, ist die andere Haelfte: Kristallverlust je Abschnitt **0 / 0 / 0 / 6**
- die ersten drei kosten nichts, und 45 Wellen ohne einen Kratzer sind kein
Lauf, sondern eine Einfuehrung mit Anhang.

**Der volle Probenlauf faehrt in Scheiben (v307) - und die alte Zahl war um
mehr als das Doppelte daneben.** Am 10.09.2026 ist er in zwei Stunden nicht
fertig geworden und um 13:15:35 an seiner eigenen `timeout-minutes: 120`
gestorben. Ueber der Werkstattdatei stand "rund fuenfzig Minuten" - das ist
die Zahl von 249 Proben; heute sind es **378**, und die teuersten sind
dazugekommen: 29 an `sim` (das allein misst gemessen **156 s**, dokumentiert
waren 127), 49 an `browsertor`, 114 an `smoke`. **Ein abgebrochener Lauf
schreibt nicht einmal seinen Befund** - `if: always()` laeuft bei einer
Absage nicht mehr -, also blieb weder Stand noch Meldung, die Zeitratsche
schlug an, und die ganze Torkette war rot. Eine Vorsichtsmassnahme, die den
Betrieb anhaelt, wenn sie selbst zu langsam wird, ist keine.

Die Arbeit ist von Natur aus teilbar - jede Probe baut ihren Fehler ein,
faehrt ihr Tor und nimmt ihn zurueck. `npm run proben -- --voll --teil=N/6`
faehrt jede sechste, reihum ueber die ganze Liste (nicht in Bloecken: die
Proben stehen nach Themen beieinander). **Eine Scheibe schreibt den Stand
nicht** - sie hat die anderen nicht gesehen; der zusammenfuehrende Schritt tut
es, wenn alle sechs gruen waren, und eine FEHLENDE Scheibe zaehlt dabei als
rot. Dazu ein Selbsttest bei jedem Scheibenlauf: die sechs Scheiben decken die
Liste genau einmal ab - eine Aufteilung, die etwas auslaesst, sieht aus wie
ein bestandener Lauf.

**Erfahrung zwischen den Laeufen (v306).** Ein Lauf bringt 10 je gefahrener
Welle, 100 je gewonnenem Abschnitt und 300 fuers Durchbringen - gemessen 1300
gewonnen gegen 340 verloren, das 3,8-fache. Gekauft werden **Karten, keine
Zahlen**: sechs neue, eine je Achse, der Stapel waechst von zwoelf auf
achtzehn, angeboten werden weiter drei je Welle. **Und die Runde hat einen
Fehler gefunden, der viele Fassungen lang dastand:** der Leser der Ablage baute
den Fortschritt aus GENAU ZWEI Feldern neu auf - `endlos`, `seenMaps` und
`seenEnemies` wurden geschrieben und nie zurueckgelesen (`[17]` hinein, `[]`
heraus). Er ist jetzt eine Ableitung (`fortschrittAus`), nicht eine Liste.

**Die Abschnittswahl (v305).** Nach jedem gewonnenen Abschnitt stehen zwei bis
drei Angebote zur Wahl - jedes eine KARTE mit einer AUFLAGE: Stille Schicht
(−15 % Leben, −15 % Beute), Klarer Weg, Reiche Ader (+30 % / +35 %). Der Ort
ist die Karte, die Entscheidung ist die Auflage. Gemessen mit
`npm run sim -- --lauf`: Spreizung **142,4** ueber zwei Grenzen, und keine
Auflage liegt zweimal vorn. Gemessen wird bei GLEICHER Karte - sonst maesse
die Zahl den Abstand zweier Karten, und die Nullprobe fiele nicht auf null.
**Der Lauf fuettert die Lebenskurve im Spiel weiterhin nicht** (`laufVersatz`
und `laufWellen` bleiben 0), bis die Kurvenform steht (N1K): ueber 60 Wellen
gestreckt ist sie drei Spaziergaenge und eine Wand.

**Der Kernraub (v262).** Wer den Kristall erreicht, stirbt nicht - er nimmt
einen Splitter und laeuft seine Bahn mit 2,4-fachem Tempo zurueck zum Tor. Der
Kristall faellt sofort; erwischt man den Raeuber, schwebt der Splitter zurueck
und schreibt die Punkte wieder gut. Solange er lebt, ist nichts endgueltig
verloren. Er traegt seinen Splitter sichtbar, und ein Faden zum Kristall
sagt, wohin das Stueck gehoert - er wird mit der Strecke schwaecher.

**Ueberlappende Wellen (v266).** Die naechste Welle laeuft los, waehrend die
alte noch auf dem Feld steht - hoechstens zwei zugleich. `waveIndex` heisst
seitdem "gestartet" statt "fertig", `waveActive` ist eine Ableitung, und jeder
Gegner traegt seine Welle: daran haengen seine Lebenspunkte, die Verbuchung
seines Durchbruchs und das Ende seiner Welle. Die Bots ueberlappen NICHT - die
Balance ist gegen einen Spieler geeicht, der diese Entscheidung nicht trifft.

**Der Fruehstart wiegt die Lage (v267).** Der Bonus fuer eine frueh
gestartete Welle hing bis dahin allein an der Uhr - und seit Wellen
ueberlappen duerfen, war das wirkungslos: `idleTime` waechst nur, wenn keine
Welle laeuft. `fruehstartRisiko` misst jetzt, wieviel der laufenden Wellen
noch auf dem Feld steht (Lebenspunkte, nicht Koepfe), und `EARLY_RISIKO_HUB`
sagt, um wieviel der Bonus dadurch steigt. Gemessen mit `npm run fruehstart`:
Ueberlappen kostet bei jedem Hub 22 bis 34 Punkte Kristall - die Stelle, an
der es sich "gerade lohnt", gibt es nicht. Entschieden hat der andere Rand:
ab Hub 3 verdient der durchgehend ueberlappende Bot mehr Gold als der
vorsichtige, und damit waere der Fruehstart eine Einnahmequelle statt eines
Risikos. Gesetzt ist 2,0.

**Sechs Bauwerke sprengen eine Leiste, die fuer vier gemessen wurde (v294).**
Foerderer und Werft trieben `#dock` von 10,4 auf 11,2 % der Bildschirmflaeche;
die Belegung lief im Pruefsteg auf 34,6 % gegen erlaubte 34. **Zuerst geholt,
was zu holen war, dann die Zahl nachgezogen:** `.pick-btn` stand auf 62 und
`.tower-btn` auf 50 Punkten Mindestbreite - beides Masse fuer ein ZIEL,
waehrend die Beruehrungsgrenze bei **44** liegt. Auf 54 und 46 gesenkt bringt
25,5 -> 24,5 und 34,6 -> 34,2; die Knoepfe messen danach 46 x 46. Erst DANACH
steigen die Ratschen (bauwahl 26, pruefsteg 35), mit ihrem Verlauf daneben.
**Die eigentliche Lehre ist die Luecke im Werkzeug:** v292 hat die
Buendel-Regel fuer `autarkietor` eingefuehrt und die anderen drei Tore in
einer Liste aus zwei Dateinamen gelassen - Regel 15 in Reinform, und sie hat
prompt eine Runde gekostet. Jetzt gilt sie fuer alle vier.

**Die Turmwahl macht sechs Punkte aus (v293, M18).** Die Vermutung stand seit
v287: die drei Spielstile fahren dieselbe Turmliste, deshalb misst "Abstand
der Spielstile" nur drei Einstellungen desselben Bots. `Breite` hat ein
eigenes Sortiment bekommen - und der Abstand blieb bei **8,20**, Punkt fuer
Punkt derselbe Wert. Das Sortiment aendert das Ergebnis kaum; dieselbe Ursache
steht eine Zeile tiefer als "kleinste Zweigwirkung UNBELEGT". **Solange die
Turmwahl sechs Punkte ausmacht, kann keine Kennzahl ueber Spielstile mehr als
sechs Punkte finden.** Dabei ist eine echte Luecke der Ratsche aufgefallen:
mit einem VERLIERENDEN Stil sprang der Abstand von 8 auf 28 und meldete zum
ersten Mal "ERREICHT". `npm run sim` verlangt seitdem, dass jeder Stil die
erste Karte in JEDEM Lauf gewinnt - eine Kennzahl, die sich durch
Verschlechtern verbessern laesst, ist keine.

**Gold ist knapp, sobald man es ausgibt - die Knappheit fehlt beim BEDARF
(v291).** Drei Runden lang stand "bei 28 % uebrigem Gold entscheidet ein Preis
nichts" als Erklaerung da, und diese Zahl war gar keine Aussage ueber das
Spiel: die Bots tragen `maxTowers: 12`, eine Selbstbeschraenkung, waehrend die
Karten rund zweihundert Bauplaetze halten. `knappheitMessen` fragt es jetzt an
einem Bot OHNE Deckel - dann bleiben **-3 bis 16 %** liegen statt 40 bis 47.
Nur: wer 29 bis 41 Tuerme baut, verliert (Kristall 27 -> 0 auf dem
Spiralhain), weil die weiteren Plaetze zu wenig sehen und das Gold beim
Ausbauen fehlt (24 -> 4 Ausbauten). **Foerderer, Wiederholungsaufschlag und
Werft sind alle drei Regeln ueber den PREIS - und ein Preis entscheidet nur,
wo man das Gekaufte braucht.** Was N3 fehlt, ist kein weiterer Kostenpunkt,
sondern ein Grund, den dreizehnten Turm zu wollen.

**Die Werft repariert den Kristall (v290).** Der Kristall konnte bisher nur
fallen; jetzt setzt ein Bauwerk nach jeder Welle ein Stueck zusammen, und
derselbe Bauplatz konkurriert zwischen Feuerkraft, Einkommen und Kristall.
Sie wirkt GLOBAL - die Lehre aus v285, wo der Foerderer an seinem Umkreis
folgenlos blieb: der Kristall steht an einer Stelle, ein Umkreis um ihn waere
keine Entscheidung, sondern eine Bauvorschrift. Zwei Zweige: `Takt` mehr je
Welle, `Schmelze` weniger, dafuer hebt sie das HOECHSTMASS um 15 % des
Startkristalls. Gemessen 27->21 / 35->38 / 23->28 / 14->15; das Minus ist der
Handel, dort ersetzt sie ein Geschuetz. Die eigentliche Abnahme ist die andere
Richtung: am Ende der besten Partie muessen Kristallpunkte FEHLEN, sonst ist
ein Durchbruch zurueckgekauft statt abgemildert (gemessen vier). Der Kernraub
bleibt unangetastet - er ist eine Rueckholung, keine Reparatur, und beide
duerfen sich nicht aufrechnen. Der Riss im Kristall geht damit zum ersten Mal
wieder zu; die Ableitung dafuer steht seit v263 und ist nie gefahren worden.

**Wiederholung wird teurer - gebaut, gemessen, nicht scharf gestellt
(v287).** Der Baupreis entsteht seit v287 an EINER Stelle
(`GameState.baupreis`); vorher stand `def.base.cost` an acht. Die Freimenge
(`WIEDERHOLUNG_FREI = 3`) kommt aus dem Spiel und nicht aus einem Durchlauf:
vier Geschuetze, zwoelf Tuerme, drei je Sorte - ein Zuschlag ab dem zweiten
Turm traefe den perfekten Verteiler genauso hart wie den Haeufer. Gemessen
kippte ohne Freimenge schon 0,10 die erste Karte.

**Der Zuschlag selbst steht auf 0, und das ist das Ergebnis der Runde.** Er
WIRKT (nimmt dem Haeufer 693 Gold ab, dem Verteiler 0 bis 349) und
ENTSCHEIDET NICHTS (0/-6/0/+1 Kristall): bei 28 % uebrigem Gold ist ein Preis
folgenlos - die Knappheit aus S-N3-03 ist die Voraussetzung dieser Story, nicht
ihre Folge. Die Ratsche, an der er scheitert, wirft dabei einen Wuerfel
(**M18**): "Abstand der Spielstile" steht bei Zuschlag 0,15 auf 1,46, bei 0,25
auf 11,64 und bei 0,35 auf 4,50, ueber einen Parameter, der die drei Stile gar
nicht unterscheidet - sie fahren alle dieselbe Turmliste. Sie in derselben
Runde zu lockern, in der die eigene Aenderung an ihr scheitert, waere kein
Beweis mehr (v219). Ungeprueft bleibt die Mechanik trotzdem nicht:
`wiederholungMessen` haelt eine Zusage - der Aufschlag muss den Haeufer um
ueber 200 Gold haerter treffen als den Verteiler.

**Der Zustand faengt den Finger nicht mehr (v286).** v268 hat Zustand und
Handlung im Wellenknopf getrennt - aber nur den SATZ, nicht die FLAECHE. Der
laufende Strom stand als Kind IM Knopf: er machte ihn von 208 auf 317 Punkte
breit, und wer auf die Anzeige tippte, startete eine Welle. Gemessen 1,4 % des
Bildschirms, und `uxaudittor` wurde daran rot, sobald der Foerderer als
fuenfter Bauknopf dazukam - der Auslöser, nicht die Ursache. Der Strom steht
jetzt daneben und ist durchlaessig; `welle` faellt von 16,5 auf 15,1 % und
liegt gleichauf mit `ruhe`. Eine Torpruefung stand dabei auf dem Kopf und ist
umgedreht worden (K1): sie verlangte, dass der Strom den Knopf BREITER macht -
als Beweis, dass er ueberhaupt gelegt wird. Genau das war der Schaden.

**Das Wellenband trennt Zustand und Handlung (v268).** Der Hauptknopf stand
auf "Welle 3 - noch 12" und startete Welle 4 - `waveNumber` zeigt die neueste
laufende, `startWelle` die naechste startbare. Links steht jetzt der Zustand,
rechts die Handlung; laesst sich nichts starten, traegt der Knopf wieder den
Fortschritt und der Streifen bleibt leer. Der erste Entwurf setzte ihn in die
Wellenvorschau, und `npm run streifen` hat ihn zurueckgewiesen: 113 Punkte
gegen erlaubte 86. Gesehen hat das Tor es erst, nachdem es den Fall STELLTE -
bis v267 mass es die Vorschau nur zwischen den Wellen, also in dem einen
Zustand, in dem es den Strom nicht gibt.

**Kein Gitter mehr.** Wege sind Catmull-Rom-Kurven mit
Bogenlängen-Tabelle; ein Gegner hat als einzige Zustandsgröße die
zurückgelegte Strecke. Gebaut wird frei, begrenzt durch Platzbedarf je
Turmsorte, Abstand zum Weg und unwegsames Gelände.

---

## Stand

Stand: v316. Feld 1920 × 1080 (16:9). **Vier** Karten (Spiralhain,
Ascheschlucht, Frostspalte, Farnkessel), vier Türme mit je zwei Zweigen und sechs Stufen, dazu der Förderer (Einkommen, schiesst nicht), vier
Fähigkeiten (eine von Anfang an, drei über gewonnene Karten), sieben Gegnerarten in den Wellen plus den Span, in den der
Spalter zerfällt, drei Grade, Endlosmodus. Genre-Abgleich 30 von 30,
gewichtet 100 %.

Die Zahl hinter „Stand" muss zu `VERSION` in `src/data/config.ts` passen —
`npm run doku` vergleicht beide und schlägt ab sechs Versionen Rückstand an.
Vorher stand hier „Version v42", während das Spiel bei v103 war: die Form
„Version vNN" kennt der Wächter nicht, also fiel der Rückstand von
61 Versionen keinem auf.

**Das Rückstandsverzeichnis wird seit v224 gefahren, nicht geglaubt.** Drei
Punkte standen als offen darin, während sie längst zugefallen waren: **C24**
(„die vierte Karte fehlt") seit v222, **D28-F** („die Prüfung läuft nur auf
`MAPS[0]`") seit v218, **D28-A** („mehr Bahnen durch das gemalte Netz") seit
v217. Dreimal derselbe Fehler, und S124 hat ihn schon einmal aufgeschrieben —
ein geschlossener Punkt, den kein Tor hält, kann still wieder aufgehen, und
ein offener kann still zufallen.

Jede offene Zeile trägt jetzt eine **Schließbedingung**, und `npm run doku`
wertet sie aus: ist sie erfüllt, ist der Punkt zugefallen und die Zeile lügt.
Fünf Formen, drei mechanische (`text … >= n`, `text … == 0`,
`liste … >= n`) und zwei, die es ehrlich ausschließen — `blick:` für das, was
nur das Auge sieht (Regel 8), `nutzer:` für das, was nur auf einem echten
Telefon zu messen ist. Beide brauchen eine Begründung.

**Was das Tor hält, ist gemessen — und es ist weniger, als es aussieht.** Die
Bedingung läuft zusätzlich gegen zwei gestellte Texte, einen der sie erfüllen
muss und einen der sie brechen muss; das fängt `>= 0`, eine unbekannte Form,
eine fehlende Datei und einen unbekannten Listennamen (alle vier einzeln
nachgefahren). Es fängt **nicht** die zu hohe Schwelle: `text … "Heiler" >= 99`
läuft gemessen durch, der Punkt bliebe still für immer offen. Kein billiges
Verfahren trennt „hoch" von „absurd" — deshalb steht es hier, statt als
Sicherheit verkauft zu werden (S129).

Nebenbei endete die Erledigt-Tabelle bei **v215**; acht Fassungen fehlten.

**Und der Doku-Wächter war blind, wo das Projekt steht (v230).** Seine
Zahlwort-Tabelle kannte drei bis fünfundzwanzig — die Kette hat
**einunddreissig** Schritte. Also konnte kein Dokument die Torzahl mehr falsch
schreiben, ohne durchzugehen: `Towerfront-KONZEPT-und-PIPELINE.md` behauptete
sieben Fassungen lang „29 Prüfungen, rund 90 Sekunden".

Gefunden hat es nicht die Torzahl-Prüfung, sondern die **Standregel** — das
Dokument lag sieben Fassungen zurück und wurde deshalb rot. Der Bereich reicht
jetzt bis vierzig, und der Wächter meldet selbst, wenn die Kette aus ihm
herauswächst: eine Prüfung, deren Wertebereich hinter ihrem Gegenstand
zurückbleibt, sieht aus wie eine Prüfung.

Beim Nachziehen der sieben zurückliegenden Dokumente kam der nächste Fund:
**`Towerfront-GROESSENHAUSHALT.md` stand auf v185.** Es führte drei
Untergründe bei einem Budget von 330, während es seit v222 vier bei 250 sind,
und „1506 KB von 1600 erlaubt", während die Grenze seit v187 bei 1800 liegt
und die Datei **1592** wiegt. Die Tabelle nennt jetzt den Befehl, aus dem ihre
Zahlen kommen (`npm run pack-art -- --force`), und die eine Zeile, die nicht
gemessen ist, steht als **Differenz** da statt als Messung.

**Bahnen entstehen seit v237 über ein System, nicht von Hand.** Der Anlass
war eine Forderung des Nutzers — *„wir brauchen für alles ein sauberes
reproduzierbares System, insbesondere für Karten, Wege, Gegnerläufe und
Turmpositionierungen"* — und sie trifft genau, was v236 gekostet hat: Bahnen
wurden als Punktlisten von Hand gesetzt und mit Wegwerfskripten gemessen. Die
Werkbank rechnete anders als der Wächter (81 % gegen 62 %, später 71 % gegen
16 %), weil sie die Bauplätze aus der KARTE nahm statt aus dem Entwurf — und
ein Umbau lief auf die falsche Zahl hin, bis es auffiel.

| | |
|---|---|
| `tools/bahnmass.ts` | die **eine** Stelle, an der Bahnzahlen entstehen. Wächter und Entwurfswerkzeug rechnen dieselbe Rechnung, und die Bauplätze kommen immer aus den Bahnen, die gerade gemessen werden |
| `art/bahnen.json` | der Entwurf als **Daten**: Mittelachse, Tore, Querversatz je Bahn, Maßstab |
| `npm run bahnbau` | erzeugt daraus die Punktlisten, drückt die **Kurve** aus den unwegsamen Flecken, misst jede Regel und trägt nur ein, wenn alle halten. `--suche` fährt den Maßstab durch |

**Damit ist D32 zu.** Der Durchlauf zeigt, was vier Handentwürfe nur vermuten
ließen: mit **drei** Bahnen gibt es auf dieser Karte kein Fenster — Kreuzdeckung
≥ 50 nur bei Maßstab 0,40–0,50, und dort liegen die Bahnen zu 77–79 %
übereinander. Mit **zwei** öffnet es sich:

| | vorher (3 Bahnen) | **v237 (2 Bahnen)** |
|---|---|---|
| Kreuzdeckung | 35 % | **61 %** |
| Verschmelzung | 54 % | **39 %** |
| Bauplätze | 157 | **217** |
| bester Lauf | 2 Sterne | **3 Sterne** |

**Neues Tor: die Verschmelzung.** Die Kreuzdeckung allein belohnt Nähe — ein
Entwurf stand in v236 bei 62 % und sah aus wie *ein* Weg statt wie drei. Die
Grenze von 55 % kommt von den angenommenen Karten (Frostspalte 52, Farnkessel
45).

**Der Zielmodus „hinten" ist entfallen.** Er hatte seinen einzigen — geteilten
— Sieg auf genau der dritten Bahn, also auf dem gemeldeten Fehler. Mit zwei
gut gedeckten Bahnen stirbt in Reichweite ohnehin jeder, und `npm run sim`
meldete „eine Wahl ohne Folgen". Gestrichen am **Ende** der Ordnung, dem
einzigen Platz, der die Indizes der übrigen nicht verschiebt; alte Spielstände
fallen auf „vorn" zurück.

**Und der Satz stand seit v18 im Konzept.** Abschnitt 3.18: *„Zwei Zuwege
halbieren die Deckung. Ein Turm sieht nur eine der beiden Seiten, solange die
Bahnen getrennt laufen."* In v233 habe ich die Ascheschlucht auf drei getrennte
Korridore umgebaut, ohne dass etwas rot wurde — die Regel war aufgeschrieben
und von keinem Tor gehalten. Seit v236 ist sie eine Zahl, seit v237 ein Tor.

**Nebenbei fehlte die v236-Zeile im Rückstandsverzeichnis.** Mein
Einfügeskript war an einem Tippfehler gescheitert, und weil niemand nachzählt,
stand die Runde einfach nicht da — dieselbe Klasse wie v230, wo acht Fassungen
fehlten. `npm run doku` prüft jetzt, dass die Erledigt-Tabelle höchstens eine
Fassung hinter `VERSION` zurückliegt.

**Auf dem Notebook ließ sich nicht weit genug herauszoomen (v236).** Die
Untergrenze war `coverScale` — „Bildschirm gefüllt". Das Feld ist 16:9, ein
Notebook-Fenster ist fast immer höher (16:10, 3:2), und dann schneidet `cover`
links und rechts ab: auf 1400 × 900 rund **240 Weltpunkte**, ein Achtel der
Karte, und weiter herausziehen war gesperrt. Die Sperre stammte aus der Zeit,
als Herausziehen schwarze Balken zeigte und der Himmel dabei je Bild neu
aufgebaut wurde — beides gilt seit Langem nicht mehr, der Himmel ist
zwischengespeichert und liegt ohnehin unter allem. Start und Übersicht bleiben
bei `coverScale`; nur wer von Hand weiter herauszieht, sieht alles.

**Der Rauchtest prüfte bis dahin das Gegenteil — an vier Fenstern, unter denen
der gemeldete Fall nicht war.** Alle vier sind breiter als 16:9 oder hochkant;
das Notebook-Format fehlte, und deshalb stand die Prüfung vier Fassungen lang
grün daneben. Jetzt sind 1400 × 900 und 1512 × 982 dabei.

**Die Kreuzdeckung ist eine Zahl, die dem Spiel gefehlt hat.** Gemeldet wurde:
„die Gegner laufen über einen ganz kurzen Weg direkt zum Ziel, wenn man auf
der anderen Seite Türme gebaut hat." Nachgesehen: die Bahn kommt aus dem
**Wellenplan**, die Gegner weichen also gar nicht aus — und sie werden
**reihum** auf die Bahnen verteilt, jede Welle nimmt alle drei. Wer für eine
baut, sieht zwei Drittel jeder Welle fast ungehindert durch.

Gemessen wird jetzt: zwölf Türme, gierig überdeckend für **eine** Bahn
gestellt — wieviel sehen sie von den anderen?

| Karte | schwächste Kreuzdeckung |
|---|---|
| **Ascheschlucht** | **35 %** |
| Frostspalte | 56 % |
| Farnkessel | 59 % |

**Keine der bisherigen Zahlen sah das.** `bahnentwurf` misst die Vereinigung
über alle Bahnen (51 %) und die mittlere Wegvielfachheit über alle Bauplätze
(2,89 — die höchste des Spiels). Beide standen für die Ascheschlucht gut da.

**Und die erste Fassung der neuen Messung war selbst falsch — sie hätte mich
eine Karte gekostet.** Sie nahm die zwölf *individuell besten* Plätze, und die
stehen alle übereinander: sie meldete für Bahn 2 eine Selbstdeckung von 36 %,
während die Auswahl für Bahn 3 davon 55 % sah. Eine Auswahl, bei der die
Bestenliste einer anderen Bahn besser abschneidet als die eigene, misst nicht,
was sie messen soll. Jetzt wird gierig überdeckt — wie jemand, der seine Türme
verteilt.

**Der Umbau steht als D32 aus, und vier Entwürfe sind dafür gemessen und
verworfen.** Ein enges Geflecht erreicht 62 %, verschmilzt die drei Bahnen
aber zu einem grauen Klumpen (Verschmelzung 77 % gegen 45–52 der anderen
Karten — angesehen, Regel 8); ein weites hält die Trennung und fällt auf 16 %;
zwei der heutigen drei Bahnen allein kommen auf 40–49 %. Die zwei Forderungen
ziehen direkt gegeneinander, und nach drei Schleifen ist nicht die Ausführung
das Problem, sondern das Ziel.

**D29 und D31 sind in v235 zu, und beide auf dieselbe Art: eine Messung kam
an die richtige Stelle.**

**D29 — die Buntheit trennt Fels von Geröll.** Die alte Regel hieß „heller als
seine Karte, also Stein" und konnte dunklen Fels auf hellem Aschefeld nicht
sehen. Zwei Ersatzmerkmale waren gemessen gescheitert; die **Buntheit im
Verhältnis zur Karte** trennt über alle 37 Kreise ohne eine einzige
Überschneidung:

| | Buntheit gegen das Kartenmittel |
|---|---|
| Dickicht (Spiralhain, Farnkessel) | 0,39 – 0,71 |
| **Lücke** | **0,64 breit** |
| Fels und Eis (Ascheschlucht, Frostspalte) | 1,35 – 2,14 |

Nebenbei stand die **Kälteschwelle** falsch: alle zehn Flecken der Frostspalte
liegen zwischen Δblau 0,052 und 0,114 — die Schwelle 0,07 schnitt eine
gleichartige Gruppe mitten durch, und vier Eisflächen hießen deshalb „locker"
wie loses Geröll. Die Lücke liegt bei 0,011 bis 0,052; die Schwelle steht
jetzt auf 0,03. Damit entscheidet das Tor wieder beide Fragen, und die
Ausnahme aus v233 ist zurückgenommen — eine Ausnahme, die man einmal
einräumt, bleibt sonst stehen, bis niemand mehr weiß, dass sie eine war.

**D31 — der Weg wurde vor dem Tonwertabgleich gezeichnet.** Die Kurve wurde an
einer Leinwand geeicht, die das Band schon enthielt, und danach auf das Band
angewandt, obwohl es gar nicht aus dem Foto stammt. Aus `#787367`
(rgb 120,115,103) wurde im Bild rgb **137,114,67**.

**Meine Begründung aus v233 war dabei falsch, und die Messung hat es gesagt.**
Ich hatte den Bodennebel verdächtigt und aus zwei Bildpunkten einer Aufnahme
geschlossen. Gemessen verschiebt die Luftschicht die Zahl um **0,5
Farbschritte** — sie liegt großflächig über Weg *und* Boden und kann eine
Differenz zwischen beiden gar nicht erzeugen. Die Messstelle war nicht das
Problem. Die **Größe** war es: der euklidische Abstand mischt Helligkeit und
Ton, alle vier Karten lagen bei 55–73, und nur eine hatte einen falschen Ton.

| | Abstand | Wärme (rot−blau) |
|---|---|---|
| Spiralhain | 53,6 | −25 |
| Ascheschlucht **vorher** | 73,1 | **+72** |
| Ascheschlucht **jetzt** | 57,0 | **+19** |
| Frostspalte | 60,9 | +4 |
| Farnkessel | 55,0 | −30 |

Der Weg läuft jetzt nach dem Abgleich, alle vier Wegfarben sind neu
durchprobiert — Waldwege dunkler, Asche- und Schneepfade heller. Die **Wärme
ist eine Abnahme geworden** (höchstens 35), gemessen am Bild.

**Und `wegdeckungtor` hat dabei seine Kulissen-Ratsche verloren.** Der volle
Probenlauf meldete zwei Gegenproben, die nichts mehr beweisen — sie drehen am
Verblassen einer gemalten Straße, die es seit v233 nirgends mehr gibt.
Dieselbe Bewegung wie D30. Das Tor sagt es jetzt, statt eine grüne Zeile über
vier ungeprüfte Karten zu schreiben; an ihre Stelle treten zwei Gegenproben
auf das, was es wirklich hält.

**`zielplatte` sucht seit v234 den Kranz statt einer Farbe — und trägt seine
Nullprobe selbst.** Auf dem Rand einer Kreisscheibe zeigt der
Helligkeitsverlauf **radial** nach außen; Fels und Glutrisse haben ebenso
starke Kanten, aber zufällig gerichtete. Gemessen wird deshalb nicht „wieviel
Kante", sondern „wieviel davon zeigt vom Mittelpunkt weg".

Damit fällt die Farbreferenz ersatzlos weg, und mit ihr zwei Schwächen, die
vier Fassungen lang bekannt waren: die **Trennschärfe** (auf grauer Asche fiel
heller Schotter in dieselbe Schwelle wie graues Pflaster, Güte 0,44 in v230 —
repariert wurde das damals, indem man dem Werkzeug ein leichteres Bild gab)
und ein **Kreis** (ohne gemalte Straße nahm der Sucher seine Farbreferenz aus
der *eingetragenen* Platte und suchte dann die Platte; seit v233 galt das für
alle vier Karten).

| | Farbe (bis v233) | **Kranz (v234)** |
|---|---|---|
| Fund daneben | 0–24 | **6–13** |
| Güte auf den vier Karten | 0,44–1,00 | **0,98–1,00** |
| Güte ohne Platte | — | **0,77–0,83** |
| Braucht eine Annahme | ja | **nein** |

**Die eingebaute Nullprobe ist der eigentliche Fortschritt, und sie war nötig,
nicht schmückend.** Nimmt man die Richtungsprüfung heraus, bleibt das Tor auf
den ausgelieferten Karten **grün**: die Platte ist dort auch die stärkste
Kante, der Fund bleibt richtig, und die Rundheit steht eben auf 1,00 statt
0,98. Eine Gegenprobe kann das nicht fangen — ihr fehlt das Bild ohne Platte.
Also stellt das Tor es sich selbst her: es deckt die Platte mit einem Stück
Boden derselben Karte zu und verlangt, dass die Rundheit dort **unter** die
Schwelle fällt. Mit dem Eingriff steht sie auf 1,00, und es meldet vier
Befunde statt zu schweigen.

**Seit v233 malt keine Karte mehr eine Straße.** Die Ascheschlucht ist die
letzte umgestellte; damit sind **D28-C und D28-E zugefallen**, gemeldet vom
Doku-Wächter, nicht von mir.

| | vorher | **v233** | verlangt |
|---|---|---|---|
| Umweg Bahn 1 / 2 / 3 | 1,10 / 1,12 / 1,65 | **2,00 / 2,51 / 2,29** | ≥ 1,8 |
| Weg gegen Boden | 170,0 | **65,0** | 40–90 |
| Wegfreiheit | — | **1,3** | ≤ 25 |
| Bahn in einem Fleck | zwei (4 und 39 hinein) | **keine** (26/21/61 daneben) | daneben |

**Gewunden statt verlängert, zum vierten Mal** — und hier kommt eine Regel
dazu, die es vorher nicht gab: der Wächter erlaubt höchstens 30 % Unterschied
zwischen den Bahnlängen. Damit muss sich die **kürzeste** am stärksten winden,
weil sie den kurzen Weg zum Ziel hat und ihn selbst lang machen muss. Die drei
Luftlinien fallen von 1807 / 1827 / 1409 auf 1256 / 862 / 1050, die Längen
bleiben bei 2510 / 2165 / 2401 (Spreizung 1,16).

**Die Deckungszahl aus v217 trägt als Prozentwert nicht.** `bahnentwurf`
meldet für die neue Karte 51 % gegen die Linie von 70 — die Zahl, hinter der
in v217 „unspielbar" stand. In **Weltpunkten** decken die zwölf besten Plätze
aber 3580, und damit genau so viel wie überall sonst:

| Karte | zwölf beste Plätze | Bahnstrecke | Anteil |
|---|---|---|---|
| Spiralhain | 3180 | 3942 | 81 % |
| Frostspalte | 3810 | 4984 | 76 % |
| Farnkessel | 3600 | 5198 | 69 % |
| **Ascheschlucht** | **3580** | **7076** | **51 %** |

Zwölf Türme sehen überall dieselbe absolute Strecke — ungefähr zwölf mal ihre
Reichweite. Der Anteil sagt deshalb mehr über die Länge der Bahn als über die
Deckung, und die 70-%-Linie aus v217 ist an einer **einbahnigen** Karte
gemessen. `npm run sim` bestätigt es: bestanden, Streuung 7/2/3, die drei
Bauverläufe auf 38/39/38 — gleichmäßiger als jede andere Karte.

**Und die Runde hat einen Haushaltsfehler gefunden, den seit v222 niemand
sehen konnte.** Die Gruppe „untergrund" wog eingecheckt **346 KB** gegen ein
Budget von 250, und keine der damals einunddreissig Prüfungen sagte ein Wort. Zwei
Ursachen, beide in derselben Zeile Gedankenlosigkeit:

* **`total` zählte beim Packen nur die NEU gepackten Einträge.** In einer
  normalen Runde ist ein Bild neu und der Rest wird übernommen — die Summe war
  also um genau die übernommenen zu klein. Sie meldete 222 KB, wo 346 standen.
  Über der Zeile steht seit v157 ein Absatz, der genau diese Klasse beschreibt
  („repariert wurde der Fall, der eingetreten war, nicht die Klasse"); eine
  Zeile tiefer ist sie noch einmal passiert.
* **Die Budgetprüfung lief überhaupt nur beim Packen.** Sie hängt an drei
  Bedingungen, die fast nie zutreffen: Rohbilder da, Abdruck geändert, jeder
  Eintrag neu gepackt. `art/roh/` liegt nicht in Git — auf dem Runner lief sie
  damit **nie**.

Gemessen wird jetzt das **ausgelieferte Bündel**, bei jedem Lauf, ohne
Rohbilder: die Größe steht in `src/gfx/assets/*.ts` und ist ohne Packlauf zu
lesen (Regel 12 — die Zahl trägt ihre Messstelle mit). Das Budget von 250 war
selbst auf einer Zahl aus der kaputten Summe geeicht („vier gepackte
Untergründe wiegen 162 KB") und steht jetzt auf **300** über gemessenen 260.

Die Gegenprobe dazu trifft absichtlich `budgetKb` in der JSON: dieses Feld
steht bewusst **nicht** im Abdruck, eine Änderung daran löst also keinen
Packlauf aus — nur die neue Messung kann anschlagen (Regel 13). Die zweite
Reparatur hat **keine** Gegenprobe, und das steht an der Zeile: sie wirkt nur
in einem Lauf, der wirklich packt, und den gibt es auf dem Runner nicht.

Nebenbei senkt das neue Aschebild die ausgelieferte Datei von 1541 auf
**1419 KB** (Grenze 1800).

**Der Zielpunkt stand in jeder Bahn ein zweites Mal — Regel 15, und die
Gegenprobe hat es gefunden.** Seit v131 setzt `lanePaths` den letzten
Kontrollpunkt auf `map.ziel`: die Rohdaten beschreiben den *Verlauf*, wo alles
endet, steht einmal. Schreibt jemand den Zielpunkt trotzdem in die Bahn, läuft
die Ableitung leer — sie ersetzt einen Wert durch sich selbst, und wer später
`map.ziel` verschiebt, verschiebt die Bahnen **nicht** mit.

Genau das stand da: **alle acht Bahnen aller vier Karten** trugen den
Zielpunkt doppelt. Bis v232 hielt eine einzige Karte die Probe am Leben — die
alte Ascheschlucht, deren Bahnen bei 1656:532 endeten. Mit ihren neuen Bahnen
war auch die letzte weg, und die Probe „Die Bahnen enden wieder neben der
Platte" schwieg.

Jede Bahn endet jetzt auf einem **Anfahrtspunkt** 60 Weltpunkte vor dem Ziel,
und ein Wächter hält es: der letzte Rohpunkt darf nicht der Zielpunkt sein.
Nachgefahren mit dem Ausbau der Ableitung — acht Fehler statt Schweigen. `sim`
danach unverändert bestanden (Streuung 7/2/3).

**Und der Blick hat gegen eine grüne Zahl recht behalten — D31.** `wegdeckung`
meldet für den gezeichneten Weg 73,1 Farbschritte gegen seinen Boden, mitten
im Band 40–90. Im **gerenderten** Bild steht er aber auf rgb 131,116,66 gegen
einen Boden von 102,97,90: heller *und* deutlich wärmer, und damit liest er
sich als Sandband auf grauer Asche. Die Zahl misst den **gebackenen**
Untergrund, gesehen wird das Bild danach — und dazwischen liegt die
Aschefall-Stimmung der Karte (`wetterTon: #E8C79A`). Die Frostspalte hat eine
kühle (`#EFF7FF`) und sieht deshalb stimmig aus.

**Zwei Auswege sind durchprobiert und beide schlechter:** ein dunklerer Weg
(`#5E5B55`) fällt mit 37,6 unter das Band, ein kühlerer (`#6A6970`) macht ihn
im Bild violett (114,104,133). Der Fehler liegt also nicht in der Wegfarbe,
sondern in der Messstelle — Regel 12, und diesmal hat sie eine grüne Zahl
gedeckt statt eine rote erklärt. Bewiesen ist der Zusammenhang mit einer
Nullprobe: mit `path: #FF00FF` sind 255 873 Bildpunkte magenta, das Band ist
also wirklich `pal.path` und nicht das Kartenbild.

**Ein Tor hat dabei seinen Gegenstand verloren, und das ist als D30 notiert.**
`bahntreuetor` fragt, ob eine Bahn auf der **gemalten** Straße läuft — die es
jetzt nirgends mehr gibt. Beide Gegenproben sind entfallen; **drei
Ersatzproben sind gebaut und alle drei verworfen**, weil sie das Tor grün
ließen: die Straße fehlt, das Herausnehmen der Meldung bricht den Lauf nicht
ab, und eine Karte wieder auf `weg: true` zu setzen bleibt folgenlos — das Tor
ist eine **Ratsche**, und eine Karte ohne Grundwert hat nichts, wogegen sie
fallen könnte (nachgefahren, Ausgang 0). Es bleibt in der Kette, weil der
Schalter je Karte gilt, sagt aber seitdem selbst „gegenstandslos" statt einer
grünen Zeile über vier Karten.

**`npm run muster` hat in derselben Runde zwei Proben gefangen, die ins Leere
zeigten.** Die neuen Bahnkommentare stehen zwischen `lanes: [` und der ersten
Bahn, und `\s*` fängt Leerraum, nicht Text: die Probe „Weg knickt scharf ab"
traf damit auf **keiner** der vier Karten mehr — obwohl sie eigens als Regel
statt als feste Koordinate geschrieben war, damit sie nicht veraltet. Sie
veraltete an einer Kommentarzeile.

**Neu offen als D29: die Gelände-Erkennung sieht harten Fels nicht, wenn er
dunkler ist als seine Karte.** Alle elf Flecken der Ascheschlucht sind im Bild
Felsnester mit Glutrissen — und alle elf messen `locker`, weil die Regel
„heller als seine Karte, also Stein" ein Plus verlangt und dunkler Fels auf
hellem Aschefeld ein Minus liefert (−0,068 bis −0,091). Eingetragen ist das
Gemessene, sonst wird das Tor rot; die Karte behauptet damit Geröll, wo Fels
steht.

**Die Frostspalte steht seit v232 im Spiel — als zweite Karte ohne gemalte
Straße** (`bildBringt: { weg: false, gelaende: true }`). Das Bild aus der
8c-Bestellung ist gebacken, die Kreise sind nachgezogen, beide Bahnen sind neu
gezogen.

| | vorher | **v232** | verlangt |
|---|---|---|---|
| Umweg Bahn 1 | 1,35 | **1,89** | ≥ 1,8 |
| Umweg Bahn 2 | 1,43 | **2,44** | ≥ 1,8 |
| Wegfreiheit (`kartenprobe`) | — | **5,1** | ≤ 25 |
| Bahn durch einen Fleck | 44 Weltpunkte hinein | **28 daneben** | daneben |
| Weg gegen Boden | 224,8 | **55,7** | 40–90 |

**Gewunden statt verlängert, zum dritten Mal.** Beide Tore sind an den unteren
Rand gerückt, näher ans Ziel: die Luftlinie fällt von 1813 und 1864 auf 1468
und 921, und der Umweg steigt, ohne dass mehr Gegner gleichzeitig unterwegs
sind. Genau daran sind v209 und v210 gescheitert — eine anderthalb mal so
lange Bahn verlangte dort `hpMul` 0,55 gegen erlaubte 0,85. Der Farnkessel
besteht aus demselben Grund (Luftlinie 1492 und 873).

**Drei Zahlen, die man am Bild nicht sieht, hingen an der Backhelligkeit — und
zwei davon zogen gegeneinander.** Der alte Wert 0,52 war für ein dunkles
Frostnetz geeicht; das neue Bild ist heller Schnee, und der gebackene Boden
lag auf 0,396 gegen das Band 0,30 bis 0,36. Elf Figuren verschwanden darauf.

Durchprobiert von 0,36 bis 0,40 (`--force` und dann beide Tore, je Wert):

| helligkeit | gebackener Boden | Kristall-Abstand | Weg gegen Boden |
|---|---|---|---|
| 0,36 | 0,30 | **0,12** | — |
| **0,37** | **0,31** | **0,11** | **55,7** |
| 0,38 | 0,30 | 0,11 | — |
| 0,39 | 0,31 | 0,0996 → Befund | 49,5 |
| 0,40 | 0,30 | 0,09 → Befund | 45,9 |

**Der Boden bewegt sich über die ganze Spanne um 0,01, der Kristall um 0,03.**
Damit ist die Backhelligkeit für das eine Maß kein Hebel und für das andere
einer — und das „im Band" bei 0,39 gegen „zu niedrig" bei 0,38 und 0,40 ist
eine Wackelei in der dritten Stelle, keine Wirkung. Eine Runde lang habe ich
versucht, beide Zahlen mit diesem einen Wert zu treffen; das war die Suche
nach einer Nadel, wo eine Fläche zu haben war. 0,37 hält den Kristall mit
Abstand.

**Zwei Tore haben danach nachgezogen, und beide hatten recht.** Die
Zielplattform sitzt im neuen Bild woanders — `npm run zielplatte` findet sie
mit Güte 0,98 bei 1683:467, eingetragen waren 1734:518, **72 Weltpunkte**
auseinander bei erlaubten 40. Und **alle zehn** unwegsamen Flecken trugen
plötzlich die falsche Farbe (0,12 bis 0,16 auseinander, erlaubt 0,06): sie
sind am **gebackenen** Boden abgelesen, nicht am Rohbild, und die Backhelligkeit
war ja gerade gefallen. Wer am Backen dreht, liest die Flecken danach neu —
das steht jetzt als Kasten an der Liste.

**Der volle Probenlauf hat danach eine Probe gefunden, die nichts mehr
beweist — und die Ursache war diese Runde.** Von 261 Gegenproben schwieg
eine: „Kristallverlust wird zu hoch verbucht" nimmt die Deckelung
`Math.min(def.leak, Math.max(0, lives))` heraus, und der Rauchtest blieb grün.

Der Rauchtest verglich nur **Summen** — verbuchter Verlust gegen das, was am
Kristall fehlt. Auseinander gehen die beiden nur, wenn ein Gegner mit mehr
Durchschlag ankommt, als der Kristall noch Punkte hat, und das setzt voraus,
dass eine Karte ihren Kristall überhaupt auf null bringt. Bis v231 tat das
genau eine: **die Frostspalte**. Seit ihre Bahnen gewunden statt gerade sind,
gewinnt der Durchlauf sie mit 9 von 60 — und damit gibt es auf keiner der
vier Karten mehr einen Überlauf.

Dieselbe Form wie die vier Funde aus v219: **ein Messplatz, der auf einen
Zufall wartet, hört leise auf zu prüfen, sobald sich die Karte ändert.** Der
Fall wird jetzt **gestellt** statt abgewartet — Kristall auf 1, ein Koloss mit
3 Durchschlag ans Bahnende, ein Bild gerechnet. Nachgefahren mit dem Eingriff:
„verbucht 3 statt 1". Die alte Summenprüfung bleibt daneben stehen, sie prüft
etwas anderes; sie ist nur nicht mehr der Beweis.

**Gemeldet hat es der Umfangslauf im selben Zug** — er nennt seit v225 eigens,
wenn sich eine Weltdatei geändert hat, und `src/data/maps.ts` stand darin.
Ohne diese Zeile hätte ich den vollen Lauf gar nicht erst gefahren.

**Das Ascheschlucht-Bild ist angenommen (v231) — eingebaut ist es noch nicht.**
Der zweite Kandidat hält jede Abnahmezahl, und die drei Anpassungen aus v230
haben gemessen gewirkt:

| | Kandidat 1 | **Kandidat 2** | Gefordert |
|---|---|---|---|
| Wegfreiheit | 17,0 | **1,3** (gebacken) | ≤ 25 |
| `zielplatte` Güte | 0,44 | **0,96** | ≥ 0,50 |
| Lage der Plattform | 31 daneben | **24** | ≤ 40 |
| Detaildichte | 2,25 | **1,86** | 1,5–3,0 |
| Fels an den 11 Kreisen | — | **11 von 11** | alle |
| Fels außerhalb | rund doppelt so viele | **keiner** | keiner |

**Den Sucher hat damals der Farbton repariert, nicht das Werkzeug.** Warmer
Sandstein statt Grau auf grauer Asche brachte die Güte von 0,44 auf 0,96 — das
Werkzeug wurde repariert, indem man ihm ein leichteres Bild gab. Die Schwäche
blieb und wäre bei der nächsten grauen Karte wiedergekommen; **v234 hat sie
behoben**, siehe oben.

**Die Auflösung wird nicht mehr abgelehnt.** Zwei Kandidaten kamen mit exakt
1672 × 941; die Bildfunktion lässt die Größe nicht einstellen. Alle
Abnahmezahlen sind am GEBACKENEN Bild gemessen, also nach dem Hochrechnen auf
2400 — ein Bild an seiner Quellauflösung abzulehnen, das durch den Bau geht
und dort besteht, hiesse die Messstelle gegen die Vermutung zu tauschen
(Regel 12). Gefordert bleibt 2400 × 1350, wenn das Werkzeug es kann, sonst
das größtmögliche 16:9. Nicht verhandelbar ist die Form.

Die elf unwegsamen Flecken lagen **alle richtig** — Farbe und Art sind aus dem
neuen Bild gelesen (drei von „hart" auf „locker", weil das Aschefeld jetzt
grau statt braun ist). `npm run sim` bestanden, Streuung 7/2/3.

**Warum es trotzdem noch nicht im Spiel ist.** Der Umschalter auf
`weg: false` aktiviert eine Forderung, die vorher nur ein Hinweis war: bei
gezeichnetem Weg ist der Umweg **unsere** Entscheidung, also verlangt
`npm run guards` einen Umwegfaktor von 1,8. Die drei Bahnen der Ascheschlucht
stehen bei **1,10 / 1,12 / 1,65** — sie sind an einer gemalten Straße
entlanggezogen, die es im neuen Bild nicht mehr gibt.

Das ist dieselbe Arbeit, die den Spiralhain drei Anläufe gekostet hat (v217:
Haarnadel zu unruhig, breiter Bogen unspielbar, erst die Serpentine trug) —
und hier sind es drei Bahnen statt einer. Sie bekommt eine eigene Runde.

Das Bild liegt solange auf dem Zweig `bildeingang`, weil `art/roh/` nicht in
Git steht und dieser Rechner vergänglich ist.

**Der erste Kandidat für die Ascheschlucht ist gemessen (v230) — eingebaut,
gebacken, geprüft, wieder ausgebaut.** Er ist inhaltlich näher dran als
erwartet: Wegfreiheit 17,0 (erlaubt 25), Zielplattform 31 Weltpunkte neben
der Bestellung (erlaubt 40), Detaildichte **2,25** — und damit **ruhiger als
das Bild, das heute im Spiel steht** (2,84). Ich hielt es für zu unruhig;
Regel 8 irrt in beide Richtungen.

Durchgefallen ist er an der **Auflösung** (1672 × 941 statt 2400 × 1350) und
an der **Güte der Zielplattform** (0,44 gegen 0,50). Die Güte ist zuerst eine
Schwäche des Werkzeugs: `zielplatte` sucht mit einer Farbschwelle, und auf
grauem Aschefeld fällt heller Schotter in dieselbe Schwelle wie graues
Pflaster. Auf dem braunen Waldboden ging es (0,98). Der Sucher sollte den
erhabenen Kranz suchen statt eine Farbe — **in v234 umgebaut**.

Vier Dinge gehen daraus in den Auftrag: die **Maße in den Prompt selbst**
statt nur in den Ausgabe-Block; **richtungslose, fleckige Variation** (die
17,0 kommen von waagerechten Aschebändern in Laufrichtung, nicht von einer
gemalten Straße); **unwegsames Gelände nur an den markierten Kreisen** (der
Kandidat hatte rund doppelt so viele Felsnester wie das Blatt Kreise, mehrere
auf der Bahn — im Spiel läuft der Gegner darüber, das Bild lügt dann); und
eine **Plattform mit eigenem Farbton** statt nur mehr Helligkeit.

**Und v228 hat prompt ein Werkzeug gebrochen, ohne dass die Torkette es
merkte (v229).** Die Abnahmegrenzen stehen nur im Bildauftrag (Regel 15);
`tools/auftrag.ts` liest die **letzte** Tabellenspalte, und ich habe die
Forderung beim Umbau nach vorn gestellt. `npm run kartenprobe` brach ab —
aufgefallen ist es erst, als ein Kandidat zu messen war, eine Runde später.

Der Grund ist einfach: **`kartenprobe` steht gar nicht in der Torkette.** Es
prüft einen Kandidaten, nicht den Bestand, also läuft es nur, wenn jemand ein
Bild vorlegt. Ein Werkzeug, dessen Eingang niemand prüft, ist im Ernstfall
kaputt — und der Ernstfall ist genau der Tag, an dem ein Bild ankommt.

`npm run guards` liest die Grenzen jetzt bei jedem Lauf mit und nennt sie als
Hinweis. Gegenprobe nachgetragen — und der **erste Entwurf der Gegenprobe
bewies nichts**: er setzte ein Zeichen um und ließ die Zahl lesbar, das Tor
schwieg zu Recht (Regel 3). Sie verschiebt jetzt die Spalte, also genau den
Fehler.

**Die Bestellung 8c für Ascheschlucht und Frostspalte liegt vor (v228) — und
das Vorbereiten hat einen Fehler in den Karten gefunden, den kein Tor hielt.**
Das Referenzblatt aus `npm run wegvorlage` zeigte einen **roten Ring auf dem
blauen**: unwegsames Gelände auf der Zielplattform. Nachgemessen lagen drei
Flecken darin — auf der Frostspalte einer **58 Weltpunkte** vom Mittelpunkt,
also mitten darauf, dazu einer 18 hinein, auf der Ascheschlucht einer 47.

Zwei Schäden auf einmal: im Spiel sperrt es das Bauen genau dort, wo man den
Kristall verteidigt, und in der Bestellung wäre es in das nächste Kartenbild
gewandert — der Maler malt Fels auf den roten Ring. **Die vorige Lieferung
hatte genau das** (v216, einer von acht Flecken unter der Platte); dass es in
den DATEN stand, ist erst jetzt aufgefallen.

Die drei sind gerichtet (`npm run sim` bestanden, Streuung 7/2/3), und ein
Wächter hält es: kein Fleck darf in die Platte ragen, 130 Weltpunkte Radius,
kein Zuschlag — ein Fleck *daneben* ist eine Entwurfsentscheidung, nur
*hinein* darf keiner. Nachgemessen waren die zwei Karten, deren Flecken aus
dem **Bild** gelesen sind (`npm run gelaendesuche`), sauber; die zwei von
Hand gesetzten nicht.

**Gefunden hat es der Blick, nicht die Messung** — Regel 8, und diesmal
andersherum als sonst: das Tor kam danach.

**Und ein Tor hat den Umzug sofort erwischt.** Der verschobene Fleck stand
weiter als „locker" mit seiner alten Farbe eingetragen; an der neuen Stelle
ist im Bild Eis. `npm run gelaendetor` meldete es in demselben Lauf —
0,244 Farbabstand gegen erlaubte 0,06. **Eine Lage verschieben und die
Beschreibung mitnehmen heißt, die Beschreibung zu erfinden**; Art und Farbe
sind jetzt aus dem Bild gelesen (`kalt`, `#113d5f`).

**Der Nachtlauf hat seit v227 einen Weg zurück ins Tor.** Bis dahin landete
sein Befund nur im Protokoll auf dem Runner. Das ist keine Sorge, sondern die
Erfahrung dieser Sitzung: der Lauf ist dreimal gefahren, **zweimal rot**, und
beide Befunde habe ich nur gefunden, weil ich nachgesehen habe.

Der Umweg über den Stand fängt es erst spät und mit der falschen Begründung —
ein roter Lauf schreibt den Stand nicht fort, also schlägt die
Drei-Fassungs-Regel irgendwann an und verlangt den vollen Lauf, den man
gefahren *ist*.

Jetzt schreibt der Runner seinen Befund nach `tools/proben-befund.txt` und
checkt ihn ein — auch nach einem roten Lauf (`continue-on-error`, das
Ergebnis wird im letzten Schritt durchgereicht). `npm run muster` liest die
Datei bei jedem Lauf, also in **jeder Torkette**, und zwar **vor** der
Mustererkennung: stand sie dahinter, meldete die Gegenprobe die falsche
Ursache, weil der Eingriff die `sauber`-Zeile überschreibt, auf die drei
Proben ihr Muster stützen.

**Drei Fälle, drei Gegenproben** (258 statt 255): ein Befund meldet, ein
sauberer Lauf mit anderem Datum schweigt, und eine **leere** Datei meldet —
die galt im ersten Entwurf als sauber, und `: > tools/proben-befund.txt` hätte
die Prüfung still abgeschaltet. Die *fehlende* Datei ist im Code behandelt und
von Hand nachgefahren; stellen lässt sie sich mit diesem Mittel nicht (der
Ersatz schreibt, er löscht nicht), und das steht an der Zeile.

Nebenbei starb `npm run muster` bisher mit einem Stapelabzug, wenn die
Zieldatei einer Probe fehlte — ein Stapelabzug sagt nicht, welche Probe ihren
Gegenstand verloren hat. Jetzt nennt er sie.

**Der volle Lauf zu v225 hat eine Probe gefunden, die auf zwei Rechnern
Verschiedenes beweist.** „Werkstatt wartet nicht auf die Bilder" nahm
`await bilderAbwarten()` aus `zeichenwerkstatt` heraus und erwartete, dass das
Kristalltor rot wird. Hier tat es das — 87 898 Punkte Unterschied, die Zahl
aus v190. **Auf dem Runner nicht**, und zwar zu Recht: `tools/kristall.mjs`
wartet schon **vor** der Werkstatt einmal, also ist dort nichts mehr offen.
Ob die zweite Zeile etwas ändert, entschied damit die Geschwindigkeit der
Maschine.

Eine Probe, die auf einem Rechner beweist und auf dem anderen nicht, ist keine
— und schlimmer als keine, weil ein Lauf ohne Befund wie ein Beweis aussieht.
Sie greift jetzt an der **Funktion** statt am zweiten Aufruf; dann trifft es
den ersten, und der ist tragend: das Kristalltor meldet „kein Bild der
Ringstation im Vorrat", hier wie dort. Nachgefahren mit dem ganzen Ausbau und
mit einem Abzählfehler (`offen > 1`), beide Male rot.

**Der zweite Aufruf hat damit keine Gegenprobe mehr, und das steht als Kasten
an der Zeile.** Gemessen ist `kristall.mjs` heute der einzige Benutzer der
Werkstatt, und es wartet vorher — für den nächsten, der das nicht tut, ist die
Zeile richtig, beweisen lässt sie sich erst dann. Ein Selbsttest an der
Funktion wurde gebaut und wieder **verworfen**: er war in diesem Tor
unerreichbar, weil jeder Bruch schon am ersten Aufruf stirbt. Eine Prüfung,
die nie anschlägt, ist keine (Regel 5).

**Und eine Tabelle tiefer stand dasselbe noch einmal (v226).** Unter den
„Offen"-Tabellen liegt die Fundtabelle — 150 Lehren, absichtlich ein
Gedächtnis und kein Arbeitsvorrat. Vier ihrer Zeilen trugen trotzdem einen
Rückstand vor, und alle vier waren falsch:

| Zeile | behauptete | Wirklichkeit |
|---|---|---|
| **S151** | „**Offen**, weil die Bahnlänge an der Balance hängt" | seit **v126/v131** zu — `goalOf` gibt die Plattenmitte zurück, `maps.ts` sagt es selbst |
| **S112** | „Offen als D26" | D26 seit **v114** als Fehlannahme geschlossen (S113) |
| **S84** | „Offen als D22" | D22 geschlossen, S91 hält es fest |
| **S23** | „Offen: … (siehe T13)" | **T13 gibt es in keinem Dokument** |

Ein Rückstand, der nur in der Fundtabelle steht, hat keine Schließbedingung,
steht in keiner Übersicht und fällt niemandem auf — genau die Lücke, die v224
eine Ebene höher geschlossen hat.

**Die Erkennung ist absichtlich eng:** „Offen" groß und am Satzanfang oder
fett, kleingeschriebenes „offen" mitten im Satz nicht. Sonst fängt sie Sätze
wie S121 ein („dorthin bringen, wo die Frage offen ist"), und ein Wächter, der
bei richtiger Prosa anschlägt, wird überlesen — dieselbe Lehre, die
Abschnitt 3 des Wächters für die veralteten Begriffe schon aufgeschrieben
hat. Vier Nullproben nachgefahren: unbekannte Kennung meldet,
Behauptung ohne Kennung meldet, **gültiger Verweis schweigt**, kleines
„offen" schweigt.

**Was der volle Probenlauf zu v219 gefunden hat — und es waren nicht die
Tore, sondern vier Messplätze.** Von 249 Gegenproben bewiesen vier nichts
mehr; alle vier sind daran gescheitert, dass die **Karte** sich geändert hat,
und keine davon wäre je rot geworden.

* **„Schild kommt in keiner Welle vor"** — der Rauchtest verlangte nur, dass
  irgendwo im Plan ein Schild steht. Seit die letzten beiden Wellen welche
  tragen, darf der **einführende** Schild aus Welle 9 verschwinden, ohne dass
  etwas anschlägt. Geprüft wird jetzt, was das Verzeichnis ohnehin behauptet:
  der erste Schild steht in der **ersten Hälfte** des Plans.
* **„Determinismus liest den gespeicherten Fortschritt"** — die Probe aus
  v218 kam nicht mehr an, weil der Lauf mit der langen Bahn innerhalb von 240
  Sekunden gar nicht mehr endet (Welle 10 von 15). Ohne Ergebnis wird nichts
  in den Fortschritt geschrieben, und der Fehler bleibt folgenlos. Horizont
  jetzt 600 Sekunden — gemessen endet die Partie nach 521.
* **„Zielmodus hinten nützt nichts"** — die neue Wellenprüfung aus v218 zählt
  geteilte Siege mit. Macht man „hinten" zu einer Kopie von „vorn", gewinnen
  beide dieselben Wellen, und die Prüfung ist zufrieden. Neu daneben: **zwei
  Modi mit gleichem Verlust je Welle auf allen Karten sind ein Modus mit zwei
  Namen** — 45 Zahlen treffen nicht versehentlich aufeinander.
* **„Ersatzziel nimmt auch Flieger"** — der Aufbau ließ eine ganze Welle
  laufen und wartete darauf, dass zufällig ein Gleiter neben einem sterbenden
  Bodenziel steht. Auf der neuen Bahn kommt das in **keiner** Welle mehr vor
  (gemessen an 7, 14 und 15, alle drei mit eingebautem Fehler, alle drei
  null). Der Fall wird jetzt **gestellt** statt abgewartet — und dabei kam
  heraus, dass Flieger gar keiner Bahn folgen: ihr `travelled` wird aus der
  Luftlinie zurückgerechnet, ein gesetztes wird im nächsten Bild
  überschrieben.

**Die gemeinsame Form:** ein Messplatz, der auf einen Zufall wartet, hört
leise auf zu prüfen, sobald sich die Umgebung ändert. Drei der vier warteten
auf etwas, einer zählte zu großzügig.

**Der Farnkessel (v222) ist die vierte Karte — und sie hat kein neues Bild
gekostet.** Dasselbe Waldboden-Foto, **gespiegelt und kühler gebacken**:
Zielplattform links, unwegsame Flecken auf der anderen Seite, eigene Bahnen.
`npm run pack-art` kann seit v222 spiegeln (`spiegeln: true` im Bildvorrat).
Die Vorbilder machen es genauso — Kingdom Rush baut eine ganze Welt aus einem
Kachelsatz.

**Zwei Bahnen, die sich vereinen**, und die Karte ist damit die dichteste,
die das Spiel hat:

| | Spiralhain | **Farnkessel** |
|---|---|---|
| Wegvielfachheit je Platz | 1,94 | **3,06** (bester 3,49) |
| Punkte, die zwei Wege sehen | 19 | **30** |
| Punkte, die **drei** sehen | 0 | **12** |
| Länge | 3942 | 2730 + 2468 |

**Zwei Regeln des Wächters haben den ersten Entwurf umgeworfen, und beide zu
Recht:** eine lange und eine kurze Bahn (2730/1645) sind keine Gabelung,
sondern eine Abkürzung — höchstens 30 % Unterschied erlaubt —, und zwei
Bahnen müssen sich irgendwo treffen, nicht nur denselben Kristall haben. Die
zweite Bahn ist deshalb länger und teilt sich mit der ersten die letzten 600
Weltpunkte.

Ihr Wellenplan trägt **Infanterie und Gleiter** statt Schleicher und Läufer,
und ab Welle 10 den **Schildträger** — das ist es, was sie vom Spiralhain
trennt (der Wächter misst den Abstand an „Anzahl × Leben" je Gegnerart). Der
Luftanteil musste dabei von 24,8 auf 15,6 % herunter: mehr als das Doppelte
der dünnsten Karte macht den Nachteil des Mörsers ungleich teuer.

Nebenbei fiel ein Widerspruch zwischen zwei Haushalten auf: die
Gruppenbudgets summierten sich mit dem vierten Untergrund auf 1105 KB, erlaubt
sind 1104. Das Untergrund-Budget stand auf 330 KB, während vier gepackte
Bilder zusammen 162 wiegen — jetzt 250.

**Der fünfte Zielmodus hat in v223 eine Aufgabe bekommen.** „Voll" nahm den
Gegner mit den meisten Lebenspunkten und war damit gemessen der schwächste
von fünfen — auf allen vier Karten letzter Platz, in der Wellenprüfung von
`npm run sim` **kein einziger Alleinsieg**. Das ist auch einleuchtend: der
Dickste stirbt ohnehin nicht am einzelnen Schuss, während nebenan die Dünnen
durchlaufen.

Er heißt jetzt **„Gefahr"** und zieht den **Schildträger** vor: 800 Punkte
Zuschlag auf seine Lebenspunkte, gemessen gegen die 682 des Leerentitanen.
Der Träger ist weder der vorderste noch der nächste noch der wundeste, seine
52 Lebenspunkte sind unauffällig — aber solange er lebt, lädt er die Schilde
des ganzen Pulks nach. Diese Entscheidung trifft kein anderer Modus.

Gemessen danach: **jeder der fünf Modi liegt irgendwo allein vorn** (vorn 4,
nah 3, schwach 3, stark 1, hinten 1 über 17 Wellen, die die Modi überhaupt
trennen). Geprüft wird es aber nicht an dieser Statistik, sondern am
Verhalten: ein Turm, ein Titan, ein Träger, beide in Reichweite — der Turm
muss den Träger nehmen. Mit Zuschlag 0 nimmt er den Titanen, und der
Rauchtest sagt es.

**Offen:**
- **D28 — das Bild verspricht ein Wegenetz, das Spiel benutzt einen Weg davon.**
  Gemessen mit `npm run wegdeckung`: auf dem Spiralhain sind 21,7 % der Karte
  als Straße gemalt, aber nur 8,2 % liegen an einer benutzten Bahn — **54 %
  der gemalten Straße ist Kulisse**, und sie ist von der echten nicht zu
  unterscheiden. Daher kommen gleich drei Meldungen: man baue auf den Weg
  (man baut auf Kulisse), es gebe zu viel Weg und zu wenig Fläche, und die
  Gegner benutzten nur einen der gezeigten Wege. Die Bauregel ist NICHT die
  Ursache: an einer benutzten Bahn sind nur 1 bis 6 % bebaubar.
  Vier Wege, und der Nutzer will alle vier in der besten Reihenfolge:
  **B** die Kulisse sichtbar abwerten (v208, erledigt — sie verblasst zum
  Gelände hin, gemessen 0,31/0,25/0,69), **A** mehr Bahnen durch das Netz,
  **C** neue Kartenbilder mit genau den benutzten Straßen, **D** das Bauen
  auf gemalter Straße verbieten.

  **A ist seit v217 gegenstandslos und stand bis v224 trotzdem offen da.**
  Es hieß „mehr Bahnen durch das GEMALTE Netz des Spiralhains" — und der
  Spiralhain hat seit v217 kein gemaltes Netz mehr, er zeichnet seinen Weg
  selbst. Was A wollte, ist auf dem anderen Weg gekommen: Serpentine (v217),
  vier Säulen (v218), linker Rand (v219), und im Farnkessel zwei Bahnen, die
  sich vereinen (v222). Offen bleiben C, D und E — alle drei nur noch für
  Ascheschlucht und Frostspalte.

  **Schritt A ist in v209 gemessen und liegt zurück — nicht an der
  Geometrie, sondern am Wellenplan.** `npm run bahnsuche` sucht die Route
  aus dem Kartenbild statt sie zu raten, und sie ist da: über die große
  linke Schleife und den Kamm, 2170 statt 1547 Weltpunkte, **zu 100 % auf
  der gemalten Straße**, und die Straßennutzung stiege von 38 auf 79 %.
  Beide Einbauarten scheitern an `npm run sim`:

  * **als zweite Bahn neben der ersten** teilt sie die Verteidigung — die
    Streuung zwischen drei vernünftigen Bauverläufen steigt von 21–24 auf
    26–38 Punkte, verboten ab 32. Dann misst die Karte die Baureihenfolge
    statt des Könnens.
  * **anstelle der ersten** ist sie ruhig (Streuung 4–15) und nimmt dem
    Spiralhain den Hinweis „Umwegfaktor 1,13 — fast eine Gerade" (1,8), ist
    aber anderthalb mal so lang, also steht anderthalb mal so viel
    gleichzeitig auf dem Feld. Der Ausgleich bräuchte `hpMul` 0,55; der
    Daten-Wächter lässt 0,85 bis 1,2 zu, und das zu Recht — der
    Kartenausgleich ist eine Feinschraube, kein Ersatz für einen
    Wellenplan. Die zwei naheliegenden Ersatzschrauben tragen nicht:
    Abstände × 1,5 bleibt bei einem Stern, Anzahlen × 0,65 holt drei
    Sterne, macht die Karte aber so leicht, dass die Ziellogik „hinten"
    wirkungslos wird.

  **In v210 ist auch der Wellenplan selbst durchprobiert — er trägt es
  nicht.** Es gibt Einstellungen, die durchkommen (Anzahlen × 0,82,
  Abstände × 1,20, `hpMul` 0,85, `goldMul` 1,2 und die Standort-Grenze der
  Ziellogik auf 0,50 statt 0,35): `npm run sim` meldet damit *bestanden*,
  drei Sterne, Streuung 8–13. Aber es ist eine Nadel, keine Fläche —
  Abstände × 1,15, × 1,22 und × 1,30 fallen durch, Anzahlen × 0,80 und
  × 0,84 ebenso, während die heutige Karte ± 2 % Störung unverändert
  aushält. Zwei weitere Erklärungen wurden geprüft und scheiden aus: **Gold
  ist nicht der Engpass** (Wellenbonus × 1,3 / 1,5 / 1,8 macht es
  schlechter, nicht besser), und **Deckung auch nicht** (bebaubare Fläche
  je 100 Weltpunkte Bahn 1,5 gegen 1,6; die zwölf besten Bauplätze decken
  73 % der langen gegen 76 % der kurzen Bahn — beides besser als
  Ascheschlucht 62 % und Frostspalte 40 %). Was bleibt, ist die schiere
  Länge.

  **Eine längengleiche Umleitung wurde ebenfalls gemessen und verworfen:**
  über die Westschleife und den mittleren Riegel, 1479 statt 1547
  Weltpunkte, 100 % auf gemalter Straße, `npm run sim` bestanden **ohne
  jede Balanceänderung**. Sie verschiebt die benutzte Straße aber nur — die
  Nutzung bleibt bei 8,3 %. Das beantwortet die Meldung nicht, deshalb
  nicht ausgeliefert. Der Verlauf steht in `tools/bahnsuche.ts`
  (`--nach 1141,704`) und ist in einer Minute wiederherzustellen.

  Damit hängt A am Kartenbild, nicht an den Zahlen — und die Reihenfolge
  ist **C vor A**, nicht umgekehrt.

  **Schritt C ist in v211 bestellt** (Abschnitt 8b) — und in v214 umgedreht.
  Das Spiel kann den Weg **selbst zeichnen**; `src/gfx/terrain.ts` hat die
  Bandzeichnung noch, sie war seit v36 nur abgeschaltet. Dann kann die
  gemalte Straße gar nicht mehr von der benutzten abweichen, weil es keine
  gibt: Mitte, Schlauch, Rand und Nutzung stehen **von Bauart auf 100 %**,
  und D28-D wie D28-E lösen sich mit auf.

  **Gemessen an einer Probe (v214, Spiralhain mit herausgerechneter
  Straße):** der gezeichnete Weg überzeugt — breites Band mit Randsteinen,
  auf fotografischem Boden lesbarer als die gemalte Straße. Das gezeichnete
  **Gelände** überzeugt nicht: flache blaugraue Vektorklumpen mit harter
  Kante, die neben dem Foto stehen wie aufgeklebt.

  Deshalb ist `pfadImBild` in **`bildBringt: { weg, gelaende }`** aufgeteilt
  — ein Schalter für beides war eine Vereinfachung zu viel. Alle drei Karten
  stehen unverändert auf `{ weg: true, gelaende: true }`; umgestellt wird
  erst, wenn ein Bild ohne Weg da ist.

  **Die Bestellung dafür steht als Abschnitt 8c**: Gelände ohne Weg, mit
  einer einzigen harten Abnahmezahl — Farbabstand zwischen dem Streifen
  unter der Bahn und dem Mittel der Karte **höchstens 25 Farbschritte**
  (heute 85,0 / 79,2 / 33,3). `npm run kartenprobe` misst genau das, sobald
  eine Karte auf `weg: false` steht. Abschnitt 8b bleibt als Rückfalllinie
  vollständig stehen.

  **Das erste Bild nach 8c ist da und liegt im Baum — nicht ausgeliefert.**
  Waldboden ohne Weg, geliefert am 04.09.2026. Gemessen: `kartenprobe`
  Wegfreiheit **8,7** gegen erlaubte 25 (heutiges Bild 85,0), `zielplatte`
  findet die Platte bei 1734:454 mit **Güte 0,98** — dem höchsten Wert der
  drei Karten —, `gelaende`, `sim` (3 Sterne, Streuung 19/25/16), `grafiktor`
  und 26 weitere Tore grün. Damit ist auch der Zweig für Karten ohne gemalte
  Straße erstmals an einem echten Bild gefahren.

  Die acht unwegsamen Flecken lagen alle falsch — einer unter der
  Zielplattform, drei auf blanker Wiese. Dafür gibt es jetzt
  `npm run gelaendesuche`: es liest sie **aus dem Bild**. Drei Kriterien, ein
  Felsfeld von einem Schattenfleck zu trennen, sind gemessen gescheitert
  (Größe, Abhebung, Streuung — überall Überschneidung); das Werkzeug legt
  deshalb einen Kontaktbogen vor, und der Blick entscheidet (Regel 8).

  **Beide roten Tore sind in v217 geschlossen — und der Spiralhain läuft
  seit v217 als erste Karte auf `bildBringt: { weg: false, gelaende: true }`.**

  * **Der Umwegfaktor.** Die Bahn ist neu gezogen: Tor in die Mitte des
    unteren Randes, drei Bögen statt einer Diagonale. **Umweg 1,91 gegen
    verlangte 1,8**, Länge 1652 statt 1555 (+6 %), bebaubare Fläche von 38
    auf 51 %. Gewunden, nicht verlängert — genau daran sind v209 und v210
    gescheitert.

    **Drei Anläufe, und der Weg dorthin ist die eigentliche Auskunft.** Eine
    Haarnadel (1830 Weltpunkte) trieb die Streuung zwischen den Bauverläufen
    auf 28–38, verboten ab 32. Ein breiter Bogen (2139) beruhigte sie auf
    10/10/7, machte die Karte aber unspielbar — verloren in Welle 14. Erst
    die Messung sagte, warum: **wieviel der Bahn die zwölf besten Bauplätze
    zusammen sehen.** Alte Bahn 76 %, Haarnadel 61 %, breiter Bogen 53 % —
    und die heutige Serpentine **85 %**, mehr als die alte Bahn je hatte.
    Nicht die Länge entscheidet, sondern ob die Bögen nah genug beieinander
    liegen, dass ein Turm zwei von ihnen sieht.

  * **Die Klimawirkung** ist jetzt **anteilig** gemessen, mit Ratsche je
    Karte (36 / 33 / 26 %) statt einer absoluten Zahl über alle drei. Das
    absolute Maß fiel, weil das neue Kartenbild heller ist und die Figuren
    näher am Boden starten — die Einbettung war besser geworden, die Zahl
    schlechter. Regel 2. Die Nullprobe trägt: mit `KLIMA_STAERKE = 0` fallen
    alle drei Karten auf 0 %.

    **Beim ersten Anlauf habe ich die drei Ratschen geraten** — 50 / 65 /
    −20 %, abgelesen aus einem halben Dutzend Zeilen statt gemessen über
    alle 14 Objekte. Alle drei falsch. Das Tor hat es gemeldet.

  **Zwei Tore mussten den Zweig für Karten ohne gemalte Straße nachziehen**,
  dieselbe Bewegung wie bei `zielplatte` und `kartenprobe` in v216:
  `wegdeckung` (das Verblassen der Kulisse gibt es ohne Kulisse nicht) und
  `bahntreue` (ob die Bahn auf der Farbe läuft, ist ohne Farbe keine Frage —
  es meldete 2 % statt 100). An ihre Stelle tritt in `wegdeckung` eine neue
  Abnahme: **wie weit der GEZEICHNETE Weg von seinem Boden absteht**,
  gemessen am gebackenen Untergrund, erlaubt 40 bis 90 Farbschritte. Heute
  68,5. Die Grenze ist von den gemalten Straßen abgelesen (Ascheschlucht
  75,4, Frostspalte 54,3), und die erste gezeichnete Fassung stand bei
  **165** — das ist die Zahl hinter „liegt darauf wie ausgeschnittenes
  Papier".

  **Ein Fund nebenbei, und er war älter als diese Runde:** `npm run
  determinism` maß seinen eigenen Nebeneffekt. Es fährt zwei Läufe mit
  derselben Aussaat; gewinnt der erste die Karte, schreibt das Spiel einen
  Stern, und der zweite startet mit anderen Verbesserungen. Aufgefallen ist
  es erst, als die neue Bahn den Lauf erstmals innerhalb der 240 Sekunden
  gewinnen ließ — vorher endete er nie. Jetzt fährt das Werkzeug ohne
  Verbesserungen und mit fester Kartenzahl, wie `npm run sim` (Regel 4).

  **In v218 ist die Bahn ein zweites Mal gezogen — auf Wunsch deutlich
  länger, mit Stellen für Türme, die zwei Wege treffen.** Vier Säulen im
  Abstand von 300 Weltpunkten, verbunden durch Kehren:

  | | v217 | v218 |
  |---|---|---|
  | Länge | 1652 | **3631** Weltpunkte |
  | Umweg | 1,91 | 2,75 |
  | Deckung durch die zwölf besten Plätze | 85 % | 73 % |
  | Wegvielfachheit je Platz | 1,25 | **1,87** (bester 2,02) |
  | Punkte, die zwei Wege sehen | 0 von 148 | **16 von 170** |

  Der Abstand von 300 ist gemessen, nicht gewählt: bei 268 waren die
  Korridore breit genug für die Reichweite, aber zu schmal zum **Bauen** —
  `canPlace` lehnte bei 126 Weltpunkten ab und ließ bei 132 zu. Dafür gibt es
  jetzt `npm run bahnentwurf`.

  **Die Karte ist damit sehr stark für den Verteidiger, und das hat vier
  Prüfungen gegeneinander gestellt.** Sechs Anläufe, alle gemessen: Anzahlen
  ×1,1 bricht die Eröffnung (C18 verlangt, dass die erste Karte mit einer
  Fähigkeit zu gewinnen ist), späte Wellen ×1,6 macht den Spiralhain der
  Ascheschlucht zu ähnlich (Abstand 0,23, nötig 0,25), nur die leichten
  Gruppen zu verstärken lässt den Meister verlustfrei durch, mehr Luft
  erschlägt die Eröffnung.

  **Was trägt, sind Schilde**, und zwar aus drei Gründen: sie sind die eigene
  Erfindung dieser Karte (Welle 9), sie bestrafen genau die vielen kleinen
  Treffer, die die neue Geometrie erlaubt, und sie sind für den
  Karten-Abstandswächter **unsichtbar** — der wiegt Gegnerarten nach `Anzahl ×
  Leben`, und ein Schild ändert daran nichts. Schild 7, 8 und 10 kommen alle
  durch: eine Fläche, keine Nadel.

  Dabei ist die Wellenvorschau umgebrochen — fünf Gegnerarten und vier Marken
  passten nicht mehr in `max-width: 58vw`, und zwei Zeilen kosten 46 von 390
  Punkten Bildhöhe. Jetzt 72vw, mit Gegenprobe.

  **In v219 greift die Bahn bis an den linken Rand.** Das Tor sitzt jetzt am
  linken Bildrand statt unten in der Mitte, die Bahn läuft am unteren Rand
  entlang und dann in die vier Säulen. Gemessen mit der neuen Zeile in
  `npm run bahnentwurf`:

  | | v218 | v219 |
  |---|---|---|
  | Karte näher als 300 Weltpunkte an einer Bahn | 68 % | **74 %** (Ascheschlucht 82, Frostspalte 81) |
  | Länge | 3631 | 3942 |
  | Wegvielfachheit | 1,87 | 1,94 |
  | baubare Punkte | 170 | **203** |
  | Punkte, die zwei Wege sehen | 16 | 19 |

  **Weiter nach links geht es nicht ohne ein neues Bild.** Die obere linke
  Ecke ist Felsfeld und Dickicht — die Flecken kommen aus dem Kartenbild,
  nicht aus den Daten, und eine Bahn mitten hindurch wäre falsch. 74 % ist,
  was dieses Bild hergibt.

  Ausgeglichen wurde die längere Bahn allein über `hpMul` 1,0 → 1,1; der
  Wellenplan blieb unangetastet.

  **Was der Umweg kostet, steht offen im Bild:** die obere linke Kartenecke
  wird nicht betreten. Solange der Kristall in der Ecke steht, ziehen „Umweg
  ≥ 1,8" und „die ganze Karte benutzen" gegeneinander — jeder Umweg muss
  sich dann um die Ecke wickeln. Der Ausweg ist eine Bestellung, kein Code:
  die Zielplattform im nächsten Kartenbild näher zur Mitte.


  **Zwei Messfunde nebenbei, beide älter als diese Runde:**
  1. **Die Bahnen sind breiter als die Straße, auf der sie laufen.** Seit
     v210 misst `npm run bahntreue` das mit: Mittellinie **und** Schlauch
     über fünf Querlagen. Gemessen liegt der Schlauch auf 44 bis 52 % über
     gemalter Straße, sein **Rand nur auf 11 bis 20 %** — die Bausperre
     steht rundherum über der Farbe. Der Spiralhain steht in der Mitte auf
     100 % und im Schlauch auf 51,5 %; genau diese Lücke konnte die alte
     Messung nicht sehen. Ratsche je Bahn, kein Soll: solange die Bilder
     ihre Straßen 60 Weltpunkte breit malen und die Schläuche 80 bis 162
     messen, kann keine Karte hoch liegen. Das löst Schritt C.
  2. **Die Prüfung „der fünfte Ziel-Modus muss etwas können" läuft nur auf
     `MAPS[0]`** und wäre auf der Ascheschlucht seit Langem rot (fern 61,4
     gegen bester reiner Modus 69,2). Das ist heute so, ohne jede Änderung
     von mir. Nicht angefasst, weil eine Prüfung, die ich in derselben
     Runde erweitere, in der meine eigene Änderung an ihr scheitert, kein
     Beweis mehr wäre.
- D19 (grafisch): Die drei benannten Teile sind umgesetzt (v104). Was bleibt,
  ist die Plastik im Bild selbst — Befund B1 aus dem Grafik-Audit, und der
  braucht neue Bilder, nicht Code.

  **Der Zusatz über die Infanterie stand hier zwei Fassungen zu lang.** Er
  sagte, sie fülle ihre Kachel als einzige schlechter und bleibe deshalb die
  kleinste Figur. Nachgemessen in v178 stimmt beides nicht mehr: die
  Lieferung vom 24.08.2026 hat alle acht auf denselben Füllgrad gebracht, und
  die Infanterie liegt mit 2,60 Bildpunkten je Weltpunkt mitten im Band 2,30
  bis 2,94. Seit v178 misst `npm run lesbarkeit` das, damit es nicht wieder
  still aufgeht.
- **Der Genre-Abgleich ist vollständig**: 30 von 30, gewichtet 100 % — und
  seit v135 zu **100 % gemessen** statt zu 79 %. Von Hand beurteilt sind noch
  P6 und P7 mit 5 von 73 Gewichtspunkten; beide sind rein sichtbar und in
  einem Werkzeug ohne Bildschirm nicht zu messen.
  Das Messen hat drei Fehler gefunden, die als „erfüllt" abgehakt waren: der
  Frostturm verschwieg seine Bremsdauer, der Bestwert wurde eine Welle zu
  weit eingetragen, und „Ein neuer Stern" konnte nie erscheinen.
- D26 ist **geschlossen, aber nicht durch eine Änderung**: der vermutete
  Hebel gab es nicht. Ein Ablaufmitschnitt zeigt **kein einziges
  Bild-Dekodieren** unter den teuren Posten; 16,8 von 22,9 s liegen auf
  `ProduceCanvasResource`, also auf Rastern und Zusammensetzen. Und das
  wiederum ist ein Artefakt der Messumgebung: hier rechnet **SwiftShader**,
  eine Software-Rasterung ohne Grafikkarte. `createImageBitmap` hätte an der
  falschen Stelle gezogen. Was offen bleibt, steht als D27 — aber erst,
  wenn eine Messung auf echter Hardware es belegt.

**Erledigt und hier zu lange falsch stehen geblieben** (nachgemessen in v103):
- B15 und C7 sind umgesetzt (v109). Beim ersten Betreten einer Karte
  erscheint **ein** Satz, aus Bahnzahl und engster Stelle abgeleitet — nicht
  je Karte geschrieben, damit er auch für die vierte gilt. Und Wellengruppen
  können einen **Schild** tragen, der ganze Treffer schluckt statt Anteile:
  gegen Panzerung hilft Wucht, gegen den Schild Schnellfeuer. Er sitzt an der
  Wellengruppe, nicht an einer neuen Gegnerart — deshalb braucht er kein
  neues Bild.
- G5 ist geschlossen (v110). Der **Schildträger** lädt die Schilde seiner
  Nachbarn nach, solange er lebt — und sich selbst nie. Wer ihn stehen lässt,
  kommt gegen den Pulk nicht an, ganz gleich wieviel Schaden er auffährt. Ein
  gestrichelter Ring markiert ihn, Fäden zeigen, wen er versorgt: die
  Reihenfolge muss man **sehen**, nicht erschließen.
- B11, B13, B14 sind umgesetzt (v108). Türme lassen sich **zwischen den
  Wellen** ziehen — nur der ausgewählte, sonst wäre jedes Schwenken ein
  Glücksspiel. Während einer Welle abgelehnt: das wäre keine Korrektur mehr,
  sondern eine neue Mechanik. Halten auf leerer Fläche zeigt alle
  Reichweiten. Am Kristall warnt ein roter Ring, sobald jemand die letzten
  260 Weltpunkte erreicht.
- B13 und B14 sind rein sichtbar und von **keinem Tor** geprüft — nur
  angesehen. Der Rauchtest deckt B11 ab (Wirkung, Weg, laufende Welle).
- B6 ist umgesetzt (v107). Jeder Turm einzeln: vorn, stark, nah, schwach —
  vier Knöpfe im Prüfsteg. Standard bleibt „vorn", weil die ganze Balance
  dagegen geeicht ist. Der Rauchtest misst die Wirkung an dem, was die Türme
  treffen, nicht daran, dass sich das Feld setzen lässt.
- Abstand A ist geschlossen, soweit er ohne neue Bilder zu schliessen ist
  (v106). `bakeTerrain` zieht den Untergrund auf die Referenz: Helligkeit von
  0,20 auf 0,30, Band 0,30 bis 0,36. Das Gamma wird je Karte aus dem Bild
  selbst gerechnet, gilt also auch für die vierte Karte. Der Rest ist nicht
  zu holen — eine Nachtszene wird durch Aufhellen keine Tagszene, sie bezieht
  ihre Tiefe aus dem Dunkel.
- T12 ist geschlossen (v105). `npm run browser` lädt `dist/index.html` in
  Chromium auf 844 × 390 und misst, was jsdom nicht kann: was wirklich
  sichtbar ist, was worüber liegt, wie groß ein Knopf gerechnet ist und ob
  man durch Tippen ins Spiel kommt. Beim ersten Lauf fand es drei Fehler,
  die dreizehn andere Tore durchgelassen hatten.
- T15 ist gelöst. `npm run sim` misst W12:4 W13:7 W14:16 W15:10 — vier Wellen
  tragen die Verluste, 27 % liegen in der letzten. Das Ziel waren höchstens
  60 % bei mindestens drei Wellen, und der Hinweis `OFFEN (T15)` bleibt im
  Lauf aus.
- Der Sieg- und Niederlagebildschirm wird auf der Leinwand gezeichnet
  (`drawResult` in `src/gfx/menurender.ts`), nicht in HTML. `npm run bildtor`
  nimmt ihn als `menu-sieg` ab.
- Die Berührungsflächen im Spiel sind gemessen: `npm run beruehrung` rechnet
  die Turmtreffer auf der Leinwand aus Platzbedarf, Trefferzugabe und dem
  kleinsten Maßstab aus.

---

## Der Anforderungskatalog — überholt von v269

**Diese Dokumente gelten weiter, aber `docs/Towerfront-NEUBAU.md` steht über
ihnen.** Ihre Messbefunde sind unverändert richtig; was umgeworfen ist, ist die
Richtung. `Towerfront-STORIES.md` ist in v269 vollständig ersetzt worden — der
alte Katalog verbesserte Turmzweige, Grade und Sterne, und alle drei entfallen.
Was inhaltlich überlebt hat, steht dort als Paket N6 und ist umgewidmet.

Seit v249 liegt der Plan als Katalog vor:

| Datei | was drinsteht |
|---|---|
| `docs/Towerfront-ANFORDERUNGSKATALOG.md` | Zielbild in fünf messbaren Sätzen, acht Pakete, die begründete Reihenfolge — und fünf verworfene Richtungen |
| `docs/Towerfront-STORIES.md` | dieselbe Datei wie oben — in v269 vollstaendig ersetzt. Der alte Katalog von 42 Stories steht nicht mehr darin |
| `docs/Towerfront-MESSLUECKEN.md` | was wir heute nicht messen können, und warum das schlimmer ist als eine fehlende Funktion |
| `docs/Towerfront-MARKTRECHERCHE.md` | was moderne Tower-Defense-Spiele ausmacht, mit Quellen |

**Die Reihenfolge ist nicht verhandelbar, und der Grund steht in Abschnitt 2.1
des Katalogs:** drei der vier Zielzahlen liegen heute unter dem Rauschen ihres
eigenen Messverfahrens. `npm run sim` fährt genau **eine** Aussaat, und die
Zweigtabelle mittelt gar nicht. Wer P2 (Knappheit) vor P1 (Messung) fährt,
justiert gegen Zufall — und dieses Projekt hat genau das schon fünfmal bezahlt.

Der wichtigste Satz des ganzen Katalogs: **der Genre-Abgleich steht auf 30 von
30, und das Spiel macht trotzdem wenig Spaß.** Die zweiunddreissig Tore prüfen
Korrektheit, nicht Spannung.

---

## Was der Nutzer erwartet

- Deutsch, auch im Quelltext (Kommentare, Bezeichner, Ausgaben).
- Nach jeder Runde: vier nächste Schritte, davon mindestens einer technisch
  und einer grafisch.
- **Jede neue Bildanforderung kommt mit ihrem fertigen Prompt.** Nicht "das
  müsste nachbestellt werden", sondern der vollständige Text zum Kopieren,
  Stil-Block schon eingesetzt (`npm run bildprompt -- <suchtext>`). Der
  Auftrag gehört dabei ZUERST ins Dokument und wird von dort ausgegeben — ein
  Prompt, der nur im Gespräch steht, ist beim nächsten Mal weg. Dazu die
  Abnahmezahlen und, wo es hilft, ein Referenzblatt aus dem ausgelieferten
  Vorrat.
- **Alles, was an den Bild-Agenten zurückgeht, kommt als fertiger Block zum
  Kopieren** — nie als Fließtext, aus dem der Nutzer sich die Antwort
  zusammensuchen muss. Das gilt für Rückfragen, Nachbesserungen und
  Abnahmebefunde genauso wie für den Prompt selbst. Der Block ist in sich
  verständlich: er wiederholt, worauf er antwortet, nennt die Zahlen und sagt,
  was unverändert gilt. Der Empfänger sieht diese Unterhaltung nicht.
- Die fertige Datei erreichbar — hier über Pages, nicht als Anhang.
- Getestet wird auf dem iPhone quer. Das ist das **Zielgerät** — dort wird
  geurteilt, ob es gut ist.
- Der Schreibtischbrowser ist seit v122 der **zweite** unterstützte Weg. Er
  bestimmt nichts, aber er darf nicht ausgesperrt sein: Fenster lassen sich
  ziehen, nicht drehen. Das Browsertor prüft ihn mit der Maus in beiden
  Formaten (1400 × 900 und 700 × 850).
