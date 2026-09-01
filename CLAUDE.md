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
| jede Runde | die Gegenproben der Tore, die ich angefasst habe | unter 1 min |
| **jede dritte Fassung** | `npm run proben` — alle 156, voll | rund 33 min |
| jeder Push auf `master` | die volle Kette auf dem Runner | 3–4 min, ohne mich |

**Die Drei ist erzwungen, nicht aufgeschrieben.** `npm run muster` liest
`tools/proben-stand.txt` und bricht ab, wenn der letzte volle Lauf mehr als
drei Fassungen zurückliegt — und der Musterlauf steht in der Kette. Eine
Regel, die nur in einem Dokument steht, wird gebrochen; das hat dieses
Projekt sechsmal gekostet.

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
npm run zielplatte  findet die Zielplattform im Kartenbild und prüft die Zahl
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
npm run bahnfit     zieht die Bahnen auf die gemalte Strasse (schreibt
                    maps.ts). `--umleiten` aendert Routen, nicht nur Lagen.
npm run bahntreue   prueft am Kartenbild, ob jede Bahn auf der GEMALTEN
                    Strasse laeuft - Ratsche, kein Soll.
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
npm run muster      prueft in 0,4 s, ob jede der 156 Gegenproben noch einen
                    Gegenstand hat - ohne ein Tor zu fahren. Ersetzt den
                    vollen Probenlauf nicht, faengt aber seine haeufigste
                    Verfallsart - und schlaegt an, wenn der volle Lauf mehr
                    als drei Fassungen zurueckliegt.
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
npm run gelaende    liest aus dem Kartenbild, woraus jeder unwegsame Fleck
                    besteht (Farbe, hart/kalt/locker) und legt einen
                    Kontaktbogen daneben. `--tor` prüft die Eintragung.
npm run doku        prüft die Dokumente gegen die Wirklichkeit
npm run beruehrung  prüft, ob alles mit dem Daumen zu treffen ist
npm run proben      baut Fehler ein und prüft, ob die Tore anschlagen
npm run kritik      Wertung nach Testerkategorien, Ziel über 90
Messschalter        In der Kopfzeile des Spiels: Messung an, und die Tafel
                    läuft mit. Aufklappen zum Ablesen, Kopieren gibt alles
                    als Text heraus — ein Foto muss abgetippt werden, und
                    abgetippte Messwerte sind falsche Messwerte. `#messung`
                    in der Adresse tut dasselbe für einen Besuch.
npm run bildprompt  gibt EINEN Bild-Prompt vollstaendig aus - Stil-Block
                    schon eingesetzt, zum Kopieren in einem Stueck. Ohne
                    Suchtext listet es alle. Das Dokument haelt den
                    Stil-Block einmal (Regel 15), der Empfaenger bekommt
                    ihn trotzdem jedes Mal mit.
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

Stand: v208. Feld 1920 × 1080 (16:9). Drei Karten (Spiralhain, Ascheschlucht,
Frostspalte), vier Türme mit je zwei Zweigen und sechs Stufen, vier
Fähigkeiten (eine von Anfang an, drei über gewonnene Karten), sieben Gegnerarten in den Wellen plus den Span, in den der
Spalter zerfällt, drei Grade, Endlosmodus. Genre-Abgleich 30 von 30,
gewichtet 100 %.

Die Zahl hinter „Stand" muss zu `VERSION` in `src/data/config.ts` passen —
`npm run doku` vergleicht beide und schlägt ab sechs Versionen Rückstand an.
Vorher stand hier „Version v42", während das Spiel bei v103 war: die Form
„Version vNN" kennt der Wächter nicht, also fiel der Rückstand von
61 Versionen keinem auf.

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
  auf gemalter Straße verbieten. Die Reihenfolge folgt den Abhängigkeiten:
  B sofort und ohne Balancefolgen, A entscheidet die Routen, C malt sie,
  D schliesst ab — erst wenn kein unbenutzter Weg mehr gemalt ist, kostet
  D keine Fläche mehr.
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
- Die fertige Datei erreichbar — hier über Pages, nicht als Anhang.
- Getestet wird auf dem iPhone quer. Das ist das **Zielgerät** — dort wird
  geurteilt, ob es gut ist.
- Der Schreibtischbrowser ist seit v122 der **zweite** unterstützte Weg. Er
  bestimmt nichts, aber er darf nicht ausgesperrt sein: Fenster lassen sich
  ziehen, nicht drehen. Das Browsertor prüft ihn mit der Maus in beiden
  Formaten (1400 × 900 und 700 × 850).
