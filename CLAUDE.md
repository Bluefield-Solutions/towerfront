# Towerfront

Browser-Tower-Defense, deutsch, eine autarke HTML-Datei. TypeScript 5 + Vite +
`vite-plugin-singlefile`, Canvas 2D, kein Spielgerüst von der Stange.

**Diese Datei wird zu Beginn jeder Sitzung gelesen. Sie ist kurz gehalten, weil
eine lange Datei nicht gelesen wird. Alles Ausführliche steht in `docs/`.**

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
| **jede Runde** | `npm run gate` — enthält den Musterlauf | **rund 2,5 min** |
| **jede Runde** | `npm run proben` — nur die betroffenen Proben | **wenige Minuten** |
| **jede Nacht** | `npm run proben -- --voll` auf dem Runner | rund 50 min, ohne mich |
| jeder Push auf `master` | die volle Kette auf dem Runner | 3–4 min, ohne mich |

**Die Drei ist erzwungen, nicht aufgeschrieben.** `npm run muster` liest
`tools/proben-stand.txt` und bricht ab, wenn der letzte volle Lauf mehr als
drei Fassungen zurückliegt — und der Musterlauf steht in der Kette. Eine
Regel, die nur in einem Dokument steht, wird gebrochen; das hat dieses
Projekt sechsmal gekostet.

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
npm run gate        einunddreissig Prüfungen. Muss vor jedem Commit grün sein.
                    Gemessen 264 s vor v154, danach rund 190 - die teuren Tore
                    haben ein Gedaechtnis bekommen (docs/Towerfront-TOR-BILANZ.md).
npm run schleife    Torkette + Bildabnahme + Bericht + rechenbares Urteil
npm run bilder      alle 13 Aufnahmen (echte PNG ohne Browser)
npm run bildtor     der Querschnitt, den die Torkette prüft
npm run pack-art    Bildvorrat aus art/roh/ neu einbacken
npm run eichen      einen Wert durchprobieren, alle Kennzahlen nebeneinander
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
                    Offen-Tabelle gibt. Vier taten es nicht.
npm run beruehrung  prüft, ob alles mit dem Daumen zu treffen ist
npm run proben      baut Fehler ein und prüft, ob die Tore anschlagen - im
                    Standardlauf nur die, deren ZIELDATEI oder `haengtAn`
                    seit dem letzten vollen Lauf angefasst wurde (nach einer
                    Runde 11 statt 253). Er sagt seit v225 auch, was er NICHT
                    geprüft hat - und eigens, wenn sich eine Weltdatei
                    geändert hat. Ein Name oder ein Torname als Argument filtert
                    gezielt. `-- --voll` fährt alle; das dauert rund 50
                    Minuten und läuft deshalb nachts auf dem Runner.
npm run kritik      Wertung nach Testerkategorien, Ziel über 90
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

Die Torkette: `tsc` → `guards` → `doku` → `muster` → `art` → `determinism` → `sim` →
`konter` → `geschosse` → `muendung` → `gedraenge` → `bahntreue` → `bauflaeche` →
`wegdeckung` → `bench` →
`bench-draw` → `kartenwechsel` → `grafiktor` → `einbettung` → `zielplatte` → `kristall` → `speicher` → `gelaende` → `lesbarkeit` → `beruehrung` → `streifen` → `bildtor` → `smoke` →
`build` → `autarkie` → `browser` → `bericht`.

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

**Kein Gitter mehr.** Wege sind Catmull-Rom-Kurven mit
Bogenlängen-Tabelle; ein Gegner hat als einzige Zustandsgröße die
zurückgelegte Strecke. Gebaut wird frei, begrenzt durch Platzbedarf je
Turmsorte, Abstand zum Weg und unwegsames Gelände.

---

## Stand

Stand: v231. Feld 1920 × 1080 (16:9). **Vier** Karten (Spiralhain,
Ascheschlucht, Frostspalte, Farnkessel), vier Türme mit je zwei Zweigen und sechs Stufen, vier
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

**Den Sucher hat der Farbton repariert, nicht das Werkzeug.** Warmer Sandstein
statt Grau auf grauer Asche bringt die Güte von 0,44 auf 0,96 — der Umbau des
Suchers, der als eigener Punkt anstand, ist damit vorerst nicht nötig. Er
bleibt trotzdem richtig: die Schwäche ist gemessen und kommt bei der nächsten
grauen Karte wieder.

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
erhabenen Kranz suchen statt eine Farbe — das steht als eigener Punkt an.

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
