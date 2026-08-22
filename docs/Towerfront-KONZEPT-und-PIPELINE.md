# Towerfront — Konzept und Entwicklungspipeline

Stand: v118 · 22.08.2026
Arbeitsverzeichnis: `/home/claude/tower-defense` · Auslieferung: `/mnt/user-data/outputs/Towerfront.html`

> **Aufbau dieses Dokuments.** Die Abschnitte 1 bis 3.4 beschreiben den
> **heutigen** Stand und werden fortgeschrieben. Alles ab 3.5 ist ein
> **Fundregister in umgekehrter Zeitfolge** — es hält fest, was wann gelernt
> wurde, und beschreibt absichtlich den Stand von damals. Wer wissen will,
> wie das Spiel heute funktioniert, liest die ersten Abschnitte; wer wissen
> will, warum es so geworden ist, liest weiter.

---

## 1. Was gebaut wird

**Towerfront** ist ein Tower-Defense-Spiel im Browser. Eine einzelne,
eigenständige HTML-Datei, die offline läuft — auf dem iPhone im Querformat
genauso wie im Desktop-Browser.

**Der Kern in einem Satz:** Die Leere schickt Wellen über einen gewundenen Weg
zum Herzkristall, und du entscheidest mit jedem Goldstück neu, ob du in Breite
oder in Tiefe investierst — wobei jeder Turm Platz braucht und nicht überall
Platz ist.

**Die Fantasie, die das Spiel bedient:** Ein Feld, das du selbst gebaut hast,
arbeitet ohne dich. Der Moment, in dem eine Welle startet und du nur noch
zuschaust, wie deine Anordnung sie zerlegt — das ist der Kern. Alles im Spiel
zahlt darauf ein.

### Gestalterische Richtung

Kein generisches grünes Wiesenfeld. Die Karte ist ein Diorama bei Nacht:
kaltes, mondbeschienenes Moos in Blaugrün, durchzogen von einem warmen,
knochenfarbenen Trampelpfad. Der Kontrast warm gegen kalt macht den Pfad auf
einem Handybildschirm in einer Zehntelsekunde lesbar — das ist kein
Schönheitsargument, sondern ein Bedienbarkeitsargument.

| Rolle | Farbe |
|---|---|
| Nachthintergrund | `#080B18` |
| Terrain (Moos) | `#173D3A` → `#215A50` |
| Pfad (Knochen/Sand) | `#C9A86A` |
| Herzkristall / UI-Akzent | `#7FE7E0` |
| Gold / Wirtschaft | `#F2C14E` |
| Gefahr / Verlust | `#E2566A` |
| Leere / Gegner | `#8B5CF6` |

**Das Signaturelement:** der Herzkristall. Er ist keine Zahl in der Ecke. Er
steht am Ende des Pfades, pulsiert, beleuchtet das Terrain um sich herum — und
bekommt sichtbare Risse, je mehr Leben verloren gehen. Der Spielstand ist ein
Objekt in der Welt, nicht ein Wert im HUD. Der Pfad windet sich einmal um ihn
herum, bevor er ihn erreicht: dadurch überlappen Turmreichweiten mehrfach und
gute Platzierung wird sichtbar belohnt.

**Schrift:** Systemschriften, bewusst. Eine eingebettete Schriftdatei würde die
HTML-Datei um hunderte Kilobyte aufblähen und den Offline-Anspruch teuer
erkaufen. Charakter entsteht stattdessen über Behandlung: winzige Großbuchstaben-
Labels mit weiter Laufweite über großen, tabellarischen Zahlen.

---

## 2. Architektur

Ein eigener Canvas-2D-Motor, kein Framework. Die Prüfung dieser Entscheidung
steht in `Towerfront-KONZEPT-2.0.md`: gemessen 0,17 ms je Simulationsschritt
und rund 2.400 von 3.000 Zeichenbefehlen im konstruierten Schlimmstfall. Der
Zeichendurchsatz ist nicht der Engpass und wird es nicht — ein Wechsel auf
PixiJS würde die Optik nicht verbessern.

**Kein Kachelraster.** Bis v35 lag das Spiel auf einem Gitter aus 20 × 11
Zellen; daraus folgten zwangsläufig 90-Grad-Ecken im Weg, feste Bauplätze und
ein Feld, das nie auf den Bildschirm passte. Seit v36 ist der Unterbau ein
Kurvenmodell:

- **Wege** sind Catmull-Rom-Kurven durch gesetzte Punkte, mit einer
  Bogenlängen-Tabelle. Ein Gegner hat als einzige Zustandsgröße die
  zurückgelegte Strecke; Position und Blickrichtung folgen daraus. Dadurch
  läuft er in einer engen Kurve genauso schnell wie auf der Geraden.
- **Jeder Kontrollpunkt trägt seine Breite.** Der Weg wird als Fläche zwischen
  zwei Rändern gezeichnet, nicht als Strich — mal weiter, mal enger.
- **Gebaut wird frei**, begrenzt durch vier Bedingungen: im Feld, weit genug
  vom Weg (gerechnet mit der *örtlichen* halben Breite), nicht in unwegsamem
  Gelände, ohne Überschneidung mit einem anderen Turm. Jede Turmsorte hat
  ihren eigenen Platzbedarf — darin besteht die Entscheidung.
- **Das Feld ist 1920 × 1080**, also 16:9.

**Das Menü liegt auf der Leinwand**, nicht im DOM. Das kam aus dem
Referenzabgleich — das Genre-Vorbild hat kein Einstellungsmenü, sondern eine
Landkarte — und hat einen zweiten Grund: HTML erscheint in der Bildabnahme
nicht, und genau dort war die Gestaltung abgesackt.

```
src/
  main.ts              Verdrahtung: Zustand, Renderer, UI, Eingabe, Schleife
  core/
    path.ts            Kurvenmodell mit Bogenlänge  ← das Fundament
    loop.ts            Spielschleife mit Zeitbegrenzung pro Bild
    input.ts           Zeiger- und Tastatureingabe
    storage.ts         Fortschritt, Sterne, Einstellungen
    math.ts            Vektor, Distanz, deterministischer Zufall
  data/                ← Hier wird Inhalt hinzugefügt, nicht im Code
    config.ts          Weltgröße, Farbwelt, Version
    maps.ts            Karten: Kurven, unwegsames Gelände, Ausgleich
    towers.ts          Türme, Zweige, sechs Ausbaustufen, Platzbedarf
    enemies.ts         Gegner
    waves.ts           Wellenpläne je Karte
    difficulty.ts      Drei Grade, Form der Schwierigkeitskurve
    perks.ts           Dauerhafte Verbesserungen, Sternvergabe
  game/
    types.ts           Datenformen der Entitäten
    state.ts           Der gesamte Spielzustand und alle Systeme
    menu.ts            Landkarte, Einweisung, Fortschritt, Ergebnis
    save.ts            Spielstand
  gfx/
    renderer.ts        Kamera, Welt, Entitäten, Kristall
    menurender.ts      Die Landkarte und ihre Tafeln
    terrain.ts         Untergrund und Wegband, einmal gebacken
    towerart.ts        Gerenderte Turmbilder mit Saum
    enemyart.ts        Gerenderte Gegnerbilder mit Saum
    backgrounds.ts     Untergrundfotos
    glow.ts            Vorgebackene Leuchtscheiben
  ui/ui.ts             HUD, Baumenü, Prüfsteg
tools/                 Torkette, Bildabnahme, Eichen, Schleife
art/roh/               Rohbilder → pack-art.mjs → src/gfx/assets/
```

### Fünf Prinzipien, die das Wachstum billig halten

**Inhalt lebt in `data/`.** Ein neuer Turm ist ein Objekt in `towers.ts`, eine
neue Karte eine Liste von Kurvenpunkten. Kein System muss dafür angefasst
werden.

**Statisches wird gebacken.** Untergrund und Wegband werden einmal gezeichnet
und danach kopiert. Leuchten, Türme, Gegner und ihre Säume sind vorgerenderte
Bilder. Auf dem iPhone ist das der Unterschied zwischen flüssig und ruckelig.

**Umkreisabfragen laufen über ein Suchraster.** Zielsuche, Umkreispuls,
Explosionsradius und Kettenblitz fragen nur die Zellen ab, die der Suchkreis
berührt. Dieses Raster ist reine Beschleunigung und hat mit dem früheren
Spielfeldgitter nichts zu tun.

**Kurzlebige Objekte werden wiederverwendet.** Partikel, Geschosse, Ringe und
Blitze kommen aus einem Lager und gehen dorthin zurück.

**Die Safari-Falle bleibt zu.** Ein Canvas darf sich niemals selbst mit
`drawImage` und `filter='blur'` oder `globalCompositeOperation='lighter'`
zeichnen. Auf dem Schreibtisch sieht das gut aus, auf iOS Safari wird das Bild
nach etwa einer Sekunde schwarz. Der Autarkie-Check sucht aktiv nach diesem
Muster.

---

## 3. Die Pipeline

### 3.1 Der Arbeitsablauf

Seit v40 läuft die Arbeit im **Schleifenbetrieb** mit getrennten Rollen. Die
ausführliche Beschreibung steht in `Towerfront-SCHLEIFENBETRIEB.md`; hier die
Kurzfassung.

Der Nutzer gibt ein **Ziel** und ein **Abnahmekriterium**. Alles Weitere läuft
ohne ihn:

```
0. Referenzabgleich   Drei Vorbilder benennen, aufschreiben was sie TUN,
                      Soll ableiten, Abstand messen. Erst dann bauen.
1. Arbeiter           Genau ein Ziel umsetzen. Entscheidet nicht über
                      Fertigkeit.
2. Prüfer             npm run schleife  →  Torkette, Kennzahlen, Bilder,
                      Änderungsumfang  →  schleife/bericht.md
3. Inspektor          Sieht nur Bericht und Bilder, nicht den Code und nicht
                      die Absicht. Urteil: Freigabe · neue Schleife · Rückbau.
```

**Höchstens drei Schleifen je Ziel.** Danach ist nicht die Ausführung das
Problem, sondern das Ziel — dann zurück zum Nutzer. Diese Grenze ist keine
Höflichkeit: T15 hat sie zweimal gebraucht, und beim ersten Mal war das
Überschreiten der Fehler.

Schritt 0 ist die jüngste Ergänzung und behebt einen strukturellen Mangel:
**Solange ich das Soll selbst setze, wandert es mit meiner Leistung mit.** Der
Beleg steht in `Towerfront-SOLL-UND-BETRIEB.md` — beim Menü hatte ich eine
saubere Einstellungsliste gebaut, während das Vorbild gar kein
Einstellungsmenü hat, sondern eine Landkarte.

Innerhalb von Schritt 1 gilt weiterhin:

1. **Ein Ziel.** Genau eine Sache, minimalinvasiv.
2. **Vor dem Ändern lesen.** Erst die Datei ansehen, dann greppen, ob es das
   schon gibt.
3. **`git diff` prüfen.** Nur die beabsichtigten Zeilen.
4. **Erst einchecken, dann gegenproben.** Gegenproben arbeiten mit
   `git checkout` und löschen sonst die frische Arbeit. Dreimal passiert.
5. **`npm run gate`** — siebzehn Prüfungen, rund 90 Sekunden. Alles grün, sonst
   wird nicht ausgeliefert.
6. **Ausliefern**, committen, `git tag vN`.

### 3.2 Die Qualitätstore

Ein Befehl fährt alles: `npm run gate`

| # | Tor | Befehl | Bricht ab bei |
|---|---|---|---|
| 1 | Typen | `npm run tsc` | Typfehler, ungenutzte Variablen, fehlende Fälle — in `src` **und** `tools` |
| 2 | Datenwächter | `npm run guards` | widersprüchlichen Inhaltsdaten: Wegknicke über 25°, Umwegfaktor unter 1,8, zu wenig Richtungswechsel, fehlende Engstellen, zu enge oder zu weite Bauflächen |
| 3 | Dokumentenwächter | `npm run doku` | Befehlen, die es nicht gibt; falscher Torzahl; überholten Begriffen im gültigen Teil; Standangaben, die weit zurückliegen |
| 4 | Bildvorrat | `npm run art` | Rohbildern, die nicht ins Bündel gebacken wurden |
| 5 | Determinismus | `npm run determinism` | abweichendem Verlauf bei gleicher Aussaat oder nach Sichern/Laden |
| 6 | Balance | `npm run sim` | kaputter Schwierigkeitskurve, dominierender Turmsorte, totem Ausbaupfad, unerreichbaren Sternen |
| 7 | Messung Simulation | `npm run bench` | mehr als 4 ms Simulationszeit je Bild |
| 8 | Messung Zeichnen | `npm run bench-draw` | mehr als 3.000 Zeichenbefehlen **oder** 24 MB gebackenen Bildern |
| 9 | Lesbarkeit | `npm run lesbarkeit` | zu schwachem Saumkontrast, zu kleiner Silhouette, zu ähnlichen Gegnerfarben |
| 10 | Berührungsflächen | `npm run beruehrung` | Bedienelementen unter 44 Bildschirmpunkten — auf der Leinwand gerechnet, im HTML aus der Stilvorlage gelesen |
| 11 | Bildabnahme | `npm run bildtor` | einfarbiger Fläche, falscher Helligkeit, nicht dekodierten Bildern |
| 12 | Rauchtest | `npm run smoke` | Fehlern beim Zeichnen, in der Oberfläche, bei der Eingabe; unerreichbaren Menüwegen; zu kleinen Trefferflächen |
| 13 | Build | `npm run build` | Bündelfehler |
| 14 | Autarkie | `npm run autarkie` | externer URL, nicht inlintem Skript, Safari-Blur-Muster, fehlender DOM-Id, Ersatzschreibung statt Umlaut |
| 15 | Browser | `npm run browser` | Konsolenfehlern; Spielbedienung, die im Menü sichtbar ist; Bedienung, die über der Landkarte liegt; einem Spiel, in das man nicht hineinkommt; Knöpfen, die gerechnet unter 44 Punkten liegen oder verdeckt sind — als einziges Tor mit gerechneter Kaskade, im echten Chromium auf 844 × 390 |
| — | Genre-Abgleich | `npm run bericht` | nichts — er meldet, er bricht nicht ab |

Daneben zwei Werkzeuge, die nicht Teil der Kette sind:

| Werkzeug | Wozu |
|---|---|
| `npm run eichen` | Einen Wert durchprobieren und alle Kennzahlen nebeneinander sehen. Vor dem Justieren den Raum ansehen, statt blind nachzuziehen. |
| `npm run schleife` | Ein Durchgang im Schleifenbetrieb: Torkette, Bilder, Bericht, rechenbares Urteil. |

**Der Genre-Abgleich** ist das einzige Tor, das nichts verhindert. Es misst das
Spiel gegen 27 Kriterien aus Kingdom Rush, Bloons TD 6, Plants vs. Zombies,
Defense Grid und Defender's Quest und legt das Delta bei jedem Lauf auf den
Tisch. Wo möglich wird gemessen statt behauptet: Für „während der Pause darf
gebaut werden" erzeugt es einen Spielzustand, pausiert ihn und versucht zu
bauen. Sechs Kriterien lassen sich so nicht prüfen; sie sind als Handprüfung
markiert und werden jeden Lauf neu beurteilt.

**Die Determinismus-Prüfung** spielt dasselbe Drehbuch zweimal mit derselben
Aussaat und vergleicht alle 60 Bilder einen Fingerabdruck des Spielzustands.
Dann spielt sie es ein drittes Mal, sichert mitten in Welle 10 und lädt sofort
wieder — und verlangt, dass danach **kein einziger** Fingerabdruck abweicht.
Das ist der eigentliche Test für die Spielstandsicherung: nicht „lädt ohne
Absturz", sondern „ändert nichts". Vergisst jemand künftig ein Feld im
Spielstand, fällt es hier auf und nicht beim Spieler.

**Der Rauchtest** baut das echte `index.html` in einer jsdom-Umgebung auf,
ersetzt den Zeichenkontext durch eine Attrappe und lässt Renderer, Oberfläche
und Eingabe eine komplette Partie lang laufen — rund 33.000 gezeichnete Bilder,
inklusive Bauvorschau, Turmauswahl, Endbildschirm, Neustart und Größenwechsel.
Damit fällt beim Build auf, was bisher erst beim Antippen im Browser aufgefallen
wäre. Er prüft außerdem, dass eine Partie überhaupt endet: hängt eine Welle,
weil sie auf einen Gegner wartet, der nie stirbt, bricht das Tor ab.

**Die Zeichenmessung** zählt nicht Millisekunden, sondern Befehle. Echtes
Zeichnen lässt sich ohne Browser nicht sinnvoll in Zeit messen, und Zeit wäre
ohnehin von der Maschine abhängig. Gezählt wird stattdessen, wie viele Befehle
der Renderer je Bild an die Leinwand schickt — jeder Farbwechsel, jeder Pfad,
jeder Deckkraftwechsel. Diese Zahl ist deterministisch und maschinenunabhängig,
und sie fängt genau die Regression ab, die man sonst erst auf dem iPhone merkt:
eine Zeichnung, die wieder in die innere Schleife gerutscht ist. Nur die
sichtbare Leinwand wird gezählt; was einmal in ein Zwischenbild gebacken wird,
kostet im Spiel nichts mehr.

**Die Simulationsmessung** baut den schlimmsten Fall — jeder Bauplatz belegt und voll
ausgebaut, die letzte Welle unterwegs — und misst die reine Simulationszeit je
Bild. Bei 60 Bildern pro Sekunde stehen 16,7 ms zur Verfügung, das Zeichnen
braucht davon den größeren Teil; 4 ms sind die Obergrenze für die Simulation.

**Der Datenwächter** liest Karten, Türme, Gegner und Wellen und prüft, was
TypeScript nicht sehen kann: Kreuzt sich der Pfad? Liegt eine Deko-Zelle darauf?
Gibt es genug Bauplätze? Steigt bei jedem Turm der Schaden mit der Stufe und
sinkt der Takt? Hat ein Umkreisturm überhaupt einen Bremswert? Verweist eine
Welle auf einen Gegner, den es nicht gibt? Ist mindestens ein Turm mit dem
Startgold bezahlbar? Bricht der Druck zwischen zwei Wellen ein? Fehler stoppen
den Build, Hinweise werden nur gemeldet.

**Die Balance-Simulation** lässt einen Bot alle fünfzehn Wellen mit fünf
Strategien durchspielen — ohne Browser, in Millisekunden. Vier Bedingungen
müssen halten:

1. Die gemischte Strategie muss gewinnen. Sonst ist die Kurve zu steil.
2. Sie darf nicht ohne einen einzigen Verlust gewinnen. Sonst fehlt die Spannung.
3. Ein Feld mit Übergewicht am Boden muss an den Schwärmern scheitern. Sonst
   wäre der fliegende Gegner nur Dekoration.
4. Keine einzelne Turmsorte darf allein mit mehr als 85 % Kristall gewinnen.
   Das ist die Regel, die verhindert, dass ein Turm alle anderen überflüssig macht.
5. Die Effektspitze muss unter 900 gleichzeitigen Objekten bleiben — was die
   Simulation erzeugt, muss das iPhone auch zeichnen können.

Zusätzlich meldet sie, in welchen Wellen Kristall verloren geht. Das ist die
Landkarte für die nächste Feinjustierung.

**Der Autarkie-Check** prüft außerdem, ob jede DOM-Id, die die Oberfläche
anspricht, im HTML wirklich existiert. Eine umbenannte Schaltfläche fällt damit
beim Build auf statt erst beim Antippen.

Die Balance-Simulation ist das eigentlich Ungewöhnliche daran: ein Bot spielt
alle zehn Wellen mit drei verschiedenen Strategien durch, ohne Browser, in
Millisekunden. Jede Änderung an Schaden, Reichweite, Kosten oder Gegnerwerten
wird sofort daran gemessen. So merken wir eine kaputte Kurve nicht erst beim
Spielen.

Aktueller Stand der Simulation:

```
nur Bogen    -> gewonnen, Kristall 5/20     ← knapp, kein Selbstläufer mehr
nur Frost    -> verloren in Welle 5
nur Moerser  -> verloren in Welle 3         ← zu teuer für die Eröffnung, korrekt
nur Prisma   -> verloren in Welle 3         ← ebenso
gemischt     -> gewonnen, Kristall 5/20
Verluste (gemischt): W10:5  W15:10          ← beide Titanenwellen, wie gewollt
```

Die Kurve sitzt jetzt dort, wo sie hingehört: Die Verluste passieren an den
beiden Bosswellen, nicht verteilt über das ganze Spiel. Das heißt, das Spiel
ist da schwer, wo es dramatisch sein soll.

### 3.3 Wo das Spiel steht

Die vier Phasen aus dem ursprünglichen Plan sind durchlaufen.

| Phase | Abnahme | Stand |
|---|---|---|
| **A · Fundament** | Man kann gewinnen und verlieren | erledigt (v1) |
| **B · Spielgefühl** | Fünfzehn Wellen am Stück auf dem iPhone, ohne Haken | erledigt (v39: Trefferstopp, Stauchen, nachlaufende Lebensleisten, Turmfeder) |
| **C · Tiefe** | Zwei Spieler bauen dasselbe Feld unterschiedlich — und beide gewinnen | erledigt (v45: Abstand der Spielstile 3 von 100 Punkten, vier Türme mit je zwei Zweigen und sechs Stufen) |
| **D · Politur** | Sieht aus, als hätte ein Studio es gemacht | läuft |

**Grafik seit v56:** Alle drei Karten sind gelieferte, gerenderte Bilder mit
gemaltem Weg — die Engine zeichnet weder Weg noch Felsen mehr. Wegkurve und
unwegsames Gelände liest `tools/mapread.mjs` aus dem Bild aus, über die
Sättigung bei farbigem Boden und über die Helligkeit bei Schnee. Alle vier
Türme und sieben Gegner sind neu und in einem Stil mit den Karten. Bogen- und
Frostturm haben je sechs eigene Ausbaustufen; welches Bild eine Stufe bekommt,
entscheidet eine Rückfallkette vom Genauen zum Allgemeinen. Die Gegner sind
Aufsichten und drehen sich mit der Laufrichtung. Ein Farbring am Turmfuß zeigt
den Ausbauzweig. Herzkristall und Tor der Leere sind ebenfalls Bilder — im
Spielfeld ist damit keine gezeichnete Form mehr übrig. Türme schwenken beim
Zielen leicht mit; gedreht wird nur der obere Teil und gedämpft, sonst legt
sich das Bauwerk schief in die Landschaft.

**Kartenauslesung seit v92 als Wegsuche:** Abstandskarte plus Dijkstra vom
Endplatz aus, ein Schritt kostet mehr je näher am Rand. Die Mittellinie
entsteht dadurch aus der Kostenfunktion statt aus einem Skelett, und an
Kreuzungen wird der Ast genommen, der wirklich zum Ziel führt. Befehle:
`npm run karte-lesen` und `node tools/mapapply.mjs`.

**Pausenmenü seit v94:** Weiter, Level neu starten, Zurück zur Karte.

**Kartenauslesung seit v88:** Welcher Kanal und welche Schwelle den Weg vom
Boden trennen, entscheidet die *Schlankheit* — Umfang² durch Fläche. Ein Weg
ist ein langes schmales Band, ein Boden eine kompakte Fläche. Es wird über
beide Kanäle und alle Schwellen gesucht und genommen, was am meisten nach
einem Weg aussieht; `--schwelle` und `--hell/--dunkel` übersteuern von Hand.
Die Breitenmessung gab bis v89 die halbe Breite zurück.

**Kartenauslesung seit v92 als Wegsuche:** Abstandskarte plus Dijkstra vom
Endplatz aus, ein Schritt kostet mehr je näher am Rand. Die Mittellinie
entsteht dadurch aus der Kostenfunktion statt aus einem Skelett, und an
Kreuzungen wird der Ast genommen, der wirklich zum Ziel führt. Befehle:
`npm run karte-lesen` und `node tools/mapapply.mjs`.

**Pausenmenü seit v94:** Weiter, Level neu starten, Zurück zur Karte.

**Kartenauslesung seit v88:** Welcher Kanal und welche Schwelle den Weg vom
Boden trennen, entscheidet die *Schlankheit* — Umfang² durch Fläche. Ein Weg
ist ein langes schmales Band, ein Boden eine kompakte Fläche. Es wird über
beide Kanäle und alle Schwellen gesucht und genommen, was am meisten nach
einem Weg aussieht; `--schwelle` und `--hell/--dunkel` übersteuern von Hand.
Die Breitenmessung gab bis v89 die halbe Breite zurück.

**Einbettung seit v81:** Jede Figur bekommt zwei Schatten — einen
Schlagschatten in Lichtrichtung und einen engen Kontaktschatten darunter — und
einen Sonnenanstrich aus der Lichtfarbe der Karte. Ohne beides liegen die
Figuren auf der Landschaft statt darin. `npm run einbettung` misst dazu,
entscheidet aber nicht: vier Versuche, daraus ein Tor zu machen, haben jedes
Mal die Figur statt den Boden getroffen.

**Waffenebene seit v79:** Liegen für einen Turm ein Sockel *ohne* Waffe und
die Waffe allein vor, steht der Sockel still und die Waffe dreht sich zum
Ziel. Beides auch je Ausbaustufe (`waffe_frost_4`), mit derselben
Rückfallkette wie bei den Turmbildern. Fehlt ein Teil, bleibt es beim
gedämpften Schwenk des Ganzbilds.

**Reichweiten seit v71:** ein System statt 45 handgeschriebener Zahlen —
Anteil der Feldbreite, gemeinsame Stufenkurve bis ×1,62, Zweigneigung mit
Schadensausgleich je Turm. Panzerung schluckt seit v72 einen Anteil statt
einer festen Zahl. Das Licht kommt überall von
oben links; die Richtung steht als `LICHT` an einer Stelle.

**Heutiger Umfang:** drei Karten, vier Türme mit je zwei Ausbauzweigen und
sechs Stufen, sieben Gegnerarten, zwei Fähigkeiten, drei Schwierigkeitsgrade,
Endlosmodus, Sternfortschritt mit fünf dauerhaften Verbesserungen. Genre-Abgleich
27 von 30 Kriterien.

**Was noch aussteht** — nachgeführt in `Towerfront-BACKLOG.md`:
- Blockturm und Heiler, die letzten beiden Genre-Kriterien.
- Berührungsflächen im Spielfeld sind ungemessen (im Menü geprüft).
- Kartenbilder mit gemaltem Weg, sobald sie vorliegen.
- Gerichtete Bildsätze mit acht Richtungen.

### 3.4 Wie vergessen wir nichts

Drei Mechanismen greifen ineinander:

**Das Rückstandsverzeichnis** (`Towerfront-BACKLOG.md`) führt jeden offenen
Punkt mit Phase, Nutzen und Aufwand. Nichts wird mündlich vereinbart. Was nicht
im Verzeichnis steht, existiert nicht.

**Die Tore** fangen Regressionen automatisch ab. Eine Balanceänderung, die Welle
9 unspielbar macht, fällt beim `npm run sim` auf, nicht drei Wochen später.

**Die Tags.** Jede angenommene Iteration bekommt einen Tag. Jeder Stand ist
jederzeit wiederherstellbar. Ein Fehlversuch kostet eine Minute, nicht einen
Abend.

---

---

# Fundregister

*Ab hier steht, was wann gelernt wurde — in umgekehrter Zeitfolge. Diese
Abschnitte beschreiben absichtlich den Stand von damals und werden nicht
fortgeschrieben. Mehrere von ihnen sind inzwischen überholt: das Kachelraster
ist seit v36 weg, die festen Bauplätze seit v37.*

---

### 3.29 Feste Bauplätze — und warum der Kristall vervielfacht wurde

Vier Anläufe waren an derselben Sache gescheitert: Die Frage „wie viele Türme"
hat keine gute Antwort, solange man beliebig viele bauen kann. Jetzt gibt es je
Karte **zwölf gestaltete Stellungen**, und die Frage lautet „welcher Turm
hierhin und welcher Ausbau".

Die Wirkung war sofort messbar:

```
Abstand der Spielstile   vorher 42   jetzt 3
```

Damit ist **T16 erledigt.** „Viele Türme" war kein Spielstil, sondern
Überdeckung — nun unterscheiden sich die Stile darin, *wann* sie ausbauen und
wieviel sie in der Hand behalten, und alle drei können alle zwölf Plätze
belegen.

**Der zweite Befund war der wichtigere.** Auch mit gleich starken Stilen blieb
die Kante bei Welle 15. Der Grund lag nicht in der Kurve, sondern in der
Wirtschaft des Kristalls: **20 Punkte gegen Gegner, die einzeln 2 bis 5 kosten.**
Vier durchgekommene Kolosse waren das Spiel. Es gab keinen Zustand „teuer
erkauft" — nur „makellos" oder „tot".

Der Kristall steht jetzt bei 60 auf Normal (80 auf Ruhig, 52 auf
Erbarmungslos). Damit wird eine schlechte Welle bezahlbar statt tödlich, und
die Kurve mit Knie funktioniert plötzlich:

```
Verteilung der Verluste   vorher W15:5 (100 % in der letzten Welle)
                          jetzt  W13:6  W14:10  W15:29 (64 %)
Robustheit (±10 % Schaden) vorher Spanne 65,7   jetzt 14,2
```

Drei Wellen kosten Kristall statt einer. Damit ist **T15 zu zwei Dritteln
erledigt** — die Zahl der betroffenen Wellen stimmt, der Anteil der letzten
liegt mit 64 % noch knapp über der gewünschten Grenze von 60 %.

**Und die Messung war mitgewandert.** Als der Kristall von 20 auf 60 stieg,
wurden zwei Prüfungen still falsch: sie rechneten in absoluten Kristallpunkten
und schlugen an, obwohl sich an der Balance nichts verschlechtert hatte. Die
Kennzahl ist jetzt normiert von 0 bis 100 — Niederlage 0 bis 50 nach erreichter
Welle, Sieg 50 bis 100 nach verbleibendem Kristall. *Eine Kennzahl, deren
Bedeutung von einer anderen Einstellung abhängt, ist keine Kennzahl.*

### 3.28 Warum der Bildvorrat ein Werkzeug braucht

Drei Lieferungen von Hand eingebaut, drei Dinge dabei schiefgegangen — und
jedes davon wäre prüfbar gewesen:

- **Abgeschnittene Reste am Bildrand.** Sie bestimmen beim Zuschneiden die
  Bildgrenze, und das eigentliche Objekt wird beim Skalieren winzig. Beim
  Gegnersatz ist mir das aufgefallen, bei den Türmen nicht — das Werkzeug
  findet dort nachträglich **acht Bruchstücke**, die ich stehen gelassen hatte.
- **Uneinheitliche Standlinien.** Ein Turm schwebt, der nächste versinkt.
- **Das Größenbudget** fiel erst auf, als die Datei schon gewachsen war.

`tools/pack-art.mjs` macht daraus einen reproduzierbaren Schritt. Es liest eine
Beschreibung je Gruppe (`art/tuerme.json` und so weiter), verarbeitet die
Rohbilder und schreibt die eingebetteten Module.

Was es tut: einfarbige Hintergründe freistellen · **nur den größten
zusammenhängenden Bereich behalten** · auf den Rest zuschneiden · auf eine
gemeinsame Breite und Standlinie setzen · komprimieren · als Datenadresse in ein
TypeScript-Modul schreiben.

Was es prüft, und was beim Verstoß passiert:

| Prüfung | Verhalten |
|---|---|
| Objekt berührt den Bildrand | **Fehler.** Angeschnitten lässt sich nicht reparieren, nur melden. |
| Seitenverhältnis der Untergründe | **Fehler**, wenn es nicht exakt zum Spielfeld passt |
| Budget je Gruppe | **Fehler** bei Überschreitung |
| Frische | **Fehler**, wenn das eingebettete Modul nicht mehr zu den Rohbildern passt |

Die letzte Regel ist die wichtigste: Wer ein Assetmodul von Hand nachbessert,
fliegt im Tor auf. Gegenprobe gemacht — eine einzige angehängte Zeile in
`enemies.ts` meldet *„passt nicht mehr zu den Rohbildern — neu erzeugen mit
npm run pack-art"*. Und ein absichtlich angeschnittenes Testbild meldet
*„Objekt berührt den Bildrand (rechts, unten) — angeschnitten."*

Der Schritt läuft als zweites Tor, direkt nach dem Datenwächter.

### 3.27 Vom eingepassten Brett zur Kamera

Bis v29 wurden Kopfzeile und Bedienleiste als feste Bänder reserviert und das
Spielfeld dazwischen eingepasst. Das Ergebnis war ein kleines Brett als Insel
mit breiten toten Rändern — auf dem Handy quer blieb rund ein Drittel des
Bildschirms für Bedienung reserviert.

Die Vorbilder des Genres machen es genau umgekehrt: **die Karte füllt den
Bildschirm, die Bedienung schwebt darüber.** Das ist jetzt auch hier so.

**Zwei Bezugsgrößen.** `fitScale` zeigt alles mit Rändern, `coverScale` füllt
den Bildschirm und schneidet an. Gestartet wird bei `coverScale`; herausziehen
geht bis `fitScale`, hineinziehen bis zum Dreifachen.

**Verschieben ist begrenzt**, und zwar so, dass nie ein Rand des Feldes ins
Bild rutscht. Ist das Feld in einer Richtung kleiner als der Bildschirm, wird
es dort mittig gehalten statt frei beweglich.

**Zoomen geschieht um einen festen Punkt** — beim Kneifen der Punkt zwischen
den Fingern, am Schreibtisch der Mauszeiger. Ohne das rutscht immer der falsche
Ausschnitt weg.

**Tippen und Schieben mussten getrennt werden.** Ohne Schwelle setzt jedes
Verschieben am Ende einen Turm. Ab elf Punkten Fingerweg gilt es als Schieben,
und dann passiert beim Loslassen nichts. Doppeltipp schaltet zwischen Übersicht
und Vollbild um — der schnellste Weg, kurz das ganze Feld zu sehen.

**Die Bedienung ist milchiges Glas statt Farbe.** Die Regel dabei: nie so
deckend, dass man nicht mehr sieht, was darunter passiert, aber lesbar. Die
Turmleiste sitzt unten links und klappt weg; der Startknopf sitzt unten rechts
und bleibt immer stehen — er wird gebraucht, gerade wenn die Leiste weg ist.

**Geprüft wird das in vier Bildschirmformaten**: Startmaßstab gleich
`coverScale`, weit in jede Richtung schieben ohne sichtbaren Rand, Übersicht
zeigt tatsächlich das ganze Feld, Zoom bleibt begrenzt. Gegenprobe: entfernt man
die waagerechte Begrenzung, meldet der Rauchtest *„waagerecht über den Rand
geschoben (−8787..−8381)"*.

### 3.26 Ein flachgedrücktes Spielfeld

Nach dem Einbau der Turmbilder kam ein Bildschirmfoto zurück, auf dem das
Spielfeld **horizontal gestreckt und vertikal gestaucht** war. Nicht ein
bisschen daneben — komplett verzogen.

Die Ursache ist ein alter Klassiker. Eine Leinwand hat zwei Größen: ihre
Fläche auf dem Bildschirm und ihr Bildraster. Stimmen die Seitenverhältnisse
nicht überein, zieht der Browser das fertige Bild ungleichmäßig auseinander.
`resize` bricht ab, wenn die Fläche beim Aufruf noch keine Größe hat — dann
behält die Leinwand ihr Standardraster von 300 × 150, und das CSS zieht dieses
Raster über den ganzen Bildschirm.

Drei Dinge dagegen, in dieser Reihenfolge:

**Selbstheilung in jedem Bild.** Vor dem Zeichnen wird geprüft, ob das
Bildraster noch zur Fläche passt; wenn nicht, wird neu eingepasst. Das kostet
zwei Vergleiche je Bild und macht jede denkbare Ursache folgenlos.

**Ein Beobachter auf der Leinwand und der Bedienleiste.** Die Bänder ändern
ihre Höhe auch ohne Fenstergrößenwechsel — wenn die Einführungsleiste erscheint
oder Schriften fertig laden.

**Eine Prüfung im Rauchtest**, die genau den Fehlerfall nachstellt: Größe
ändern, `resize` **nicht** rufen, nur zeichnen. Baut man die Selbstheilung
wieder aus, meldet sie *„eine Größenänderung ohne resize wird beim Zeichnen
nicht geheilt — das Feld bliebe verzerrt."*

Dazu eine zweite Sache aus demselben Bild: Kopfzeile und Bedienleiste ließen
auf dem Handy quer nur noch rund 230 Punkte für das Brett übrig. Unterhalb von
480 Punkten Höhe sind jetzt alle Ränder, Schriftgrößen und Abstände kleiner —
das Brett ist wichtiger als der Rand.

### 3.25 Die Kennzahl war selbst falsch — und der Vorschlag, der daraus folgt

T17 lautete: Reichweiten kürzen und Pfade verlängern, damit ein siebzehnter
Turm wieder Strecke bringt. Beim Umsetzen fiel zuerst auf, dass die Kennzahl
aus v24 falsch gerechnet war.

**Sie nahm die sechzehn besten Einzelplätze** — und die liegen dicht
beieinander und decken dieselben Zellen doppelt. Ein Spieler setzt nicht so.
Gierig gewählt, also immer der Platz mit dem meisten *noch nicht* gedeckten Weg,
sieht es anders aus:

```
Deckung je Pfadzelle bei 16 Türmen   alte Rechnung   richtig
Spiralhain                                     3,1      2,5
Ascheschlucht                                  2,5      2,1
Frostspalte                                    2,7      1,8
```

Die Überdeckung ist also deutlich geringer als gedacht. Das Entscheidende steht
aber daneben: **sechzehn Türme erreichen auf jeder Karte 100 % des Weges.**
Genau das ist der Grund, warum ein siebzehnter nichts bringt — nicht die
Überdeckung, sondern die vollständige Abdeckung.

**Der Umbau selbst ist gescheitert.** Reichweiten minus 26 %, Spiralhain von 43
auf 57 Pfadzellen, Schaden zum Ausgleich erhöht. Ergebnis: eine Kette von
Nachjustierungen ohne Boden. Dabei ein Befund, der jede künftige
Reichweitenänderung betrifft: **ein pauschaler Schnitt ist nicht rollenneutral.**
Der Schaden eines Einzelzielturms ist Schadensleistung mal Zeit im Radius — er
verliert eins zu eins. Der Frostturm pulst auf alles, was da ist, und verliert
kaum. Nach dem Schnitt kam ausgerechnet das reine Frostfeld am weitesten,
während alles andere fünf Wellen früher zusammenbrach.

**Und eine Regel für die Simulation:** Die Bewertung der Bauplätze im Bot hing
kurzzeitig an der größten Reichweite im Sortiment. Damit änderte jede
Turmänderung zugleich das Verhalten des Bots — die Messung maß zwei Dinge auf
einmal. Sie ist jetzt wieder ein fester Wert. *Das Modell darf nicht vom
Gemessenen abhängen.*

**Der Vorschlag.** Vier Anläufe in Folge (T15 dreimal, T17 einmal) sind an
derselben Sache gescheitert: Die Frage „wie viele Türme" hat keine gute
Antwort, solange man beliebig viele bauen kann. Das Genre löst das anders — in
Kingdom Rush gibt es acht bis vierzehn **feste Bauplätze**, und die Entscheidung
lautet nicht „wie viele", sondern „welcher Turm hierhin und welcher Ausbau".

Genau das würde alle offenen Punkte auf einmal auflösen: „viele Türme" wäre kein
Spielstil mehr (T16), der Abstand der Stile verschwände, die Kurve ließe sich
gegen eine bekannte Obergrenze stellen (T15), und die Karten bekämen echte
Gestaltung statt einer Fläche aus Sockeln.

### 3.24 Zwei Ursachen für den Abstand der Spielstile

Der Abstand war 42 Punkte (Meister 116, Breite 78, Sparsam 74). Diesmal habe
ich nicht getunt, sondern zuerst gemessen — und zwei völlig verschiedene
Ursachen gefunden.

**Erste Ursache: ein Fehler im Bot, kein Spielstil.** Der sparsame Stil ließ am
Ende **1.642 Gold liegen** — ein Viertel seines gesamten Einkommens. Nicht weil
Sparen sein Wesen ist, sondern weil seine Obergrenze bei elf Türmen lag und er
das Übrige nirgends unterbringen konnte. Ein Mensch würde nicht auf einem
Viertel seines Geldes sitzen. Obergrenze auf fünfzehn: **74 → 110 Punkte.**

**Zweite Ursache: Stufe 1 war ein schlechtes Geschäft.** Schaden je tausend
Gold, gemessen:

| | Stufe 1 | bester Ausbau |
|---|---|---|
| Bogenturm | 264 | 371 |
| Frostturm | **55** | 192 |
| Mörser | 121 | 177 |
| Prisma | **88** | 184 |

Ein frischer Frostturm brachte ein Drittel dessen, was derselbe Betrag in einem
Ausbau gebracht hätte. Wer in die Breite baut, kauft also lauter schlechte
Geschäfte. Frost, Mörser und Prisma sind auf Stufe 1 jetzt spürbar stärker und
etwas billiger (Frost 55 → 103, Prisma 88 → 135, Mörser 121 → 156).

**Und die Ursache, die bleibt.** Der breite Stil wurde davon *nicht* besser. Die
Messung dazu:

```
Deckung je Pfadzelle bei 16 Türmen:  Spiralhain 3,1   Ascheschlucht 2,5   Frostspalte 2,7
```

**Schon sechzehn Türme decken jede Pfadzelle dreifach ab.** Ein siebzehnter
bringt keine neue Strecke, nur mehr Überlappung — und damit hört „viele Türme"
auf, ein eigener Spielstil zu sein. Das ist keine Frage der Wirtschaft, sondern
der Geometrie: Reichweite 200 gegen einen Pfad von 43 Kacheln.

Lösbar auf zwei Wegen, beide mit Folgen: kürzere Reichweiten oder längere Pfade.
Der Datenwächter meldet den Wert ab jetzt bei jedem Lauf und warnt oberhalb von
drei.

### 3.23 Warum T15 nicht an der Kurve liegt

Der Auftrag war klar: die Verluste liegen alle in der letzten Welle, das soll
sich ändern. Drei Anläufe, drei Rücknahmen — und am Ende ein präziserer Befund
als vorher.

**Erster Anlauf: Endfaktor hochziehen.** Wirkungslos bis Faktor 14, dann kippt
alles auf einmal. Kein Fenster dazwischen.

**Zweiter Anlauf: die Kurvenform ändern.** Ich habe die Potenzkurve durch eine
Form mit Knie ersetzt — flach, solange gebaut wird, steil im Bereich der
Sättigung, oben flacher auslaufend. Der Gedanke stimmte: eine Messung zeigte,
dass der Bot sein Feld **vor Welle 10** fertig hat und danach nur noch ausbaut.
Die Kurve zieht also erst ganz am Schluss daran vorbei.

Mit dem Knie und Endfaktor 16 lagen die Verluste tatsächlich in drei Wellen,
nur noch die Hälfte davon in der letzten. **Das Ziel war erreicht — und
gleichzeitig verloren zwei der drei Spielstile auf jeder Karte.**

**Dritter Anlauf ergab denselben Befund.** Und damit war klar, wo die Wand
wirklich steht:

```
Abstand der Spielstile: Meister 116   Breite 78   Sparsam 74   Spanne 42
```

**Der stärkste Spielstil liegt 42 Punkte vor den anderen beiden.** Zieht man
die Kurve so an, dass sich die Verluste verteilen, verlieren die schwächeren
Stile sofort ganz — es gibt kein Fenster, in dem beides zugleich gilt. T15 ist
nicht durch die Kurve zu lösen, sondern erst, wenn ein mittelmäßiges, aber
vernünftiges Feld auch trägt. Das ist der neue Punkt **T16**, und er kommt vor
T15.

**Und ein Messfehler, der alles davor in Frage stellt.** Bei einer der
Zwischenmessungen führte *zehn Prozent mehr Schaden* zu einem **schlechteren**
Ergebnis. Kein Widerspruch, sondern Pfadabhängigkeit: früher ankommendes Gold
ändert die Baureihenfolge, und die ändert alles Weitere. Eine Zahl, die so
springt, taugt nicht zum Justieren — und ich habe seit v13 danach justiert.

Behoben durch **drei leicht abgewandelte Bauverläufe je Messung** (verschobene
Startreihenfolge, andere Rücklage), über die gemittelt wird. Danach ist die
Kennzahl monoton, wie sie sein muss:

```
Robustheit (Schaden -10 / normal / +10 %, je 3 Abwandlungen gemittelt):
  110.7   116.0   119.3    Spanne 8.7
  Streuung zwischen den Abwandlungen bei gleichem Schaden: 9 / 3 / 2
```

**Was diese Runde liefert:** drei Messgeräte — Verteilung der Verluste, Abstand
der Spielstile, gemittelte Robustheit — und zwei offene Punkte, die in jedem
Lauf sichtbar gemeldet werden, ohne das Tor abzubrechen. Sie sind bekannte
Baustellen, keine Rückschritte.

### 3.22 Was ein Bildschirmfoto zeigte, das dreizehn Tore nicht sahen

Ein Foto vom iPhone, und vier Dinge sprangen sofort ins Auge:

**Die Bedienung lag auf dem Spielfeld.** Turmknöpfe, Wellenvorschau,
Einführungsblase und Startknopf überdeckten das untere Drittel des Bretts. Ich
hatte alles absolut positioniert und über das Feld gelegt.

**Drei Ebenen überlappten sich gegenseitig.** Die Einführungsblase verdeckte die
Wellenvorschau, die Wellenvorschau die Turmknöpfe.

**„Moerser", „Flaeche", „Erste Fuehler".** Fehlende Umlaute in sichtbarem Text,
weil die Inhaltsdateien in ASCII geschrieben sind und ich die Ersatzschreibung
nie von den Kommentaren getrennt habe.

**Man sah nicht, wo man bauen darf.** Die Bauplätze erschienen erst nach der
Wahl einer Turmsorte. Vorher war das Brett eine leere Fläche.

Behoben, und jeweils mit einer Prüfung abgesichert:

- **Kopfzeile, Einführungsband und Bedienleiste sind jetzt echte Bänder.** Der
  Renderer bekommt ihre Höhen und zeichnet das Feld *nur dazwischen*. Es kann
  nichts mehr überlappen, weil sich nichts mehr überlagert. Die Wellenvorschau
  ist in die Leiste gewandert, die Einführungsblase ist ein Band unter der
  Kopfzeile geworden.
- **Der Rauchtest prüft, dass das Feld die Bänder einhält.**
- **Der Autarkie-Check sucht Ersatzschreibungen im ausgelieferten Text** —
  `Moerser`, `Fuehler`, `zaehlt` und ein Dutzend weitere. Gegenprobe hat direkt
  einen übersehenen Fall gefunden.
- **Jeder Bauplatz liegt jetzt sichtbar als flache Steinplatte auf dem Feld.**
  Leise genug, um nicht zu stören, deutlich genug, um die Frage zu beantworten.
  Bei gewählter Turmsorte leuchten sie pulsierend auf.
- Dazu: größerer Kristall auf einem gestuften Sockel, Randsteine entlang des
  Weges, kräftigerer Saum.

**Die Lehre ist dieselbe wie in v9, nur teurer.** Die Tore prüfen Verhalten,
nicht Darstellung. Zehn grüne Tore und ein Spiel, dessen Bedienung auf dem
Brett liegt. Ein Blick auf das Gerät ersetzt keine Prüfung — aber keine Prüfung
ersetzt den Blick auf das Gerät. Und die neue Zeichenmessung zeigt: das
Aufleuchten der Bauplätze kostet 815 Befehle je Bild, gemessen im eigentlichen
Höchstfall — leeres Feld mit offener Auswahl, nicht volles Feld.

### 3.21 Eine Runde, die zurückgenommen wurde

Geplant waren zwei Dinge: ein Turm, der Gegner festhält statt sie zu töten
(Ankerturm), und ein Gegner, der die Zielreihenfolge erzwingt (Weber, heilt
seine Umgebung). Beide wurden vollständig gebaut — Werte, Grafik, Bedienung,
Wächterregeln — und beide sind wieder draußen.

**Was passierte.** Der Ankerturm ließ sich nicht einstellen. Bei einer
Abklingzeit von 4,0 Sekunden gewann das gemischte Feld mit 5 von 20 Kristall,
bei 3,6 Sekunden mit 20 von 20. Nicht ein bisschen besser — von fast verloren
auf makellos, bei einer Änderung von zehn Prozent an einer einzigen Zahl.
Dasselbe beim Weber: schwach genug, um die Balance zu halten, hieß zugleich zu
schwach, um überhaupt einen Unterschied zu machen.

**Die erste Diagnose war falsch.** Ich hielt es für Messrauschen und baute eine
Mittelung über drei Aussaaten ein. Ergebnis: alle drei Läufe identisch, bis
aufs Goldstück. Der Spielverlauf enthält gar keinen Zufall, der auf das Ergebnis
wirkt — die Aussaat steuert nur Partikel und Wackelbewegungen. Die Mittelung
war ein Werkzeug gegen ein Problem, das es nicht gibt.

**Der wahre Grund** steht seit v14 im Rückstandsverzeichnis und ich hatte ihn
nicht ernst genug genommen: *alle Verluste liegen in einer einzigen Welle.*
Entweder das Feld hält Welle 15 — dann ist der Lauf makellos — oder es hält sie
nicht — dann bricht alles weg. Dazwischen gibt es nichts. Jede Ergänzung am
Sortiment kippt diese eine Entscheidung, und was man dann misst, ist nicht die
Wirkung der Ergänzung, sondern auf welcher Seite der Kante man gelandet ist.

**Was diese Runde deshalb liefert:** die **Robustheitsprobe**. Sie spielt
dasselbe Feld mit 10 % mehr und 10 % weniger Schaden und meldet, wie weit das
Ergebnis auseinanderläuft. Aktuell:

```
Robustheit (Schaden -10 % / normal / +10 %): 15/20   15/20   20/20   Spanne 5
  Hinweis: schon 10 % mehr Schaden machen den Lauf makellos - die
  Entscheidung faellt an einer einzigen Welle.
```

Die Spanne ist klein, aber der Hinweis sagt das Entscheidende: zehn Prozent
mehr Schaden genügen für einen makellosen Lauf. Solange das so ist, ist jede
Erweiterung des Sortiments ein Glücksspiel.

**Die Reihenfolge ist damit klar:** erst die Kante glätten — Druck über die
Wellen 10 bis 15 verteilen, statt alles auf die letzte zu legen — und danach
neue Türme und Gegner. Das ist der Preis dafür, den Befund aus v14 sieben
Runden lang als Notiz behandelt zu haben statt als Blocker.

### 3.20 Wie man Fortschritt prüft, ohne ihn zu entwerten

Dauerhafte Verbesserungen sind der einfachste Weg, ein Spiel kaputtzumachen:
irgendwann ersetzt der Fortschritt das Können. Die Simulation misst deshalb drei
Dinge:

- **Sie müssen helfen.** Derselbe Lauf mit allen Verbesserungen darf nicht
  schlechter ausgehen als ohne — klingt selbstverständlich, ist es bei
  gekoppelten Werten nicht.
- **Sie dürfen den Schwierigkeitsgrad nicht ersetzen.** Mit allen
  Verbesserungen muss *Erbarmungslos* weiterhin Kristall kosten. Aktuell: 11
  von 16 statt 3 von 14 — spürbar leichter, aber nicht geschenkt.
- **Der dritte Stern muss selten sein.** Wenn der übliche Sieg schon drei Sterne
  gibt, ist der dritte wertlos. Geprüft am tatsächlichen Ergebnis des
  Meister-Bots.

Für den Endlosmodus gilt eine eigene Regel, und zwar in beide Richtungen: er
**darf nicht gewonnen werden können**, muss aber über das Ende des normalen
Plans hinaus laufen und darf nicht mehr als 25 Wellen weiter tragen — sonst ist
die Steigerung zu flach und es wird zäh statt spannend. Aktuell endet er auf
Spiralhain in Welle 19 von 15 geplanten.

Der Datenwächter prüft dazu die Wirtschaft dahinter: alle Verbesserungen
zusammen kosten 14 Sterne, erreichbar sind 27. Kostete alles zusammen weniger
als ein Drittel des Erreichbaren, wäre der Fortschritt zu früh abgeschlossen.

### 3.19 Die Abkürzung, die man der Karte nicht ansieht

Frostspalte blieb hartnäckig unspielbar für zwei von drei Spielstilen — auch
nachdem der Wellenplan auf 55 % heruntergefahren war. Das war das Signal, mit
dem Tunen aufzuhören und nachzurechnen.

Die Zahlen sagten das Gegenteil des Erlebten: Frostspalte hat mit **24,5 Hülle
je Gold** die *niedrigste* Belastung aller drei Karten (Spiralhain 36,4). Sie
müsste die leichteste sein.

Der Fehler stand nicht in den Zahlen, sondern in der Geometrie: **Bahn 2 war 30
Kacheln lang, Bahn 1 dagegen 47.** Die Hälfte aller Gegner nahm eine Abkürzung
und lief an weit weniger Türmen vorbei. Von außen sieht man einer Karte das
nicht an — sie ist aus einem Grund schwer, den niemand benennen kann.

Behoben durch eine längere zweite Bahn. Und der Datenwächter verlangt es ab
jetzt: **Bahnen einer Karte dürfen sich um höchstens 30 % in der Länge
unterscheiden.** Alles darüber ist eine Abkürzung, keine Alternative.

Ein zweiter Fund derselben Art: Frostspalte hatte anfangs die
Schwärmer-Identität. Ihr Kristall liegt aber nahe am Rand, und Schwärmer fliegen
die Luftlinie — sie standen dort kaum unter Feuer. Die Identität wanderte
deshalb zur Ascheschlucht mit ihrem langen, offenen Weg; Frostspalte bekam
Panzerung statt Luft. **Nicht jede Gegnerart passt auf jede Karte, und das
entscheidet die Geometrie, nicht der Geschmack.**

### 3.18 Was zwei Zuwege mit der Balance machen

Beide neuen Karten waren beim ersten Lauf **unspielbar** — kein einziger
Spielstil kam durch, obwohl der Wellenplan derselbe ist.

Der Grund ist geometrisch: Zwei Zuwege halbieren die Deckung. Ein Turm sieht
nur eine der beiden Seiten, solange die Bahnen getrennt laufen. Dasselbe Feld
leistet auf einer zweispurigen Karte also deutlich weniger, ohne dass sich an
einer einzigen Zahl etwas geändert hätte.

Zwei Antworten darauf, in dieser Reihenfolge:

**Erst die Geometrie.** Die Wege wurden verlängert und die gemeinsame Strecke
vergrößert — Ascheschlucht von 43 auf 54 Pfadzellen, die Vereinigung früh statt
in der Mitte. Damit deckt der größte Teil der Türme beide Seiten.

**Dann ein Ausgleich je Karte.** Jede Karte trägt einen eigenen Faktor auf
Lebenspunkte und Einkommen. Die Alternative wäre gewesen, den Wellenplan je
Karte zu verdoppeln — dann müsste jede spätere Balanceänderung dreifach gemacht
werden.

Und der Wächter begrenzt diesen Faktor auf 0,4 bis 1,6. Das ist die
eigentliche Regel dahinter: **Braucht eine Karte einen extremeren Ausgleich,
stimmt die Karte nicht, nicht der Faktor.** Genau das ist passiert — Frostspalte
brauchte zunächst 0,34. Statt die Grenze zu dehnen, wurde die Vereinigung
vorgezogen; danach reichten 0,62.

Aktueller Stand auf Normal:

```
Spiralhain      Meister 15/20   Breite 15/20   Sparsam  6/20
Ascheschlucht   Meister 10/20   Breite W13     Sparsam 10/20
Frostspalte     Meister 13/20   Breite W14     Sparsam  7/20
```

### 3.17 Jeder Grad bekommt eine eigene Prüfung

Ein Schwierigkeitsgrad, den kein Spielstil schafft, ist kein Grad, sondern eine
Wand. Einer, der jeden Stil mühelos durchlässt, ist kein Grad, sondern ein
Menüpunkt. Die Balance-Simulation prüft deshalb je Grad:

- **Ruhig:** *jeder* Spielstil muss durchkommen. Der leichteste Grad muss
  verzeihen.
- **Erbarmungslos:** mindestens einer muss durchkommen — und der Meister darf
  nicht mit mehr als 60 % Kristall gewinnen.
- **Ruhig muss messbar leichter sein als Erbarmungslos**, sonst unterscheiden
  sich die Grade nicht.

Dazu verlangt der Datenwächter eine echte Reihenfolge: kein Grad darf an
irgendeiner Stelle milder sein als der leichtere vor ihm — nicht bei Kristall,
Startgold, Kurve, Einkommen oder Dichte. Und jeder Grad muss bei Welle 1 mit
Faktor 1 starten; eine schon skalierte erste Welle wäre ein Rechenfehler.

Aktueller Stand:

```
Ruhig           Meister 25/25   Breite 25/25   Sparsam 20/25
Normal          Meister 15/20   Breite 15/20   Sparsam  6/20
Erbarmungslos   Meister  3/14   Breite W12     Sparsam W13
```

**Ein Befund am Rande:** Erbarmungslos war zunächst mit 15 % weniger Einkommen
angesetzt — und *kein* Spielstil kam durch, auch nicht mit mehr Kristall und
milderer Kurve. Das Einkommen ist die empfindlichste Schraube im ganzen Spiel;
15 % weniger brechen den Lauf, während 30 % mehr Lebenspunkte kaum etwas ändern.
Der harte Grad läuft jetzt mit 95 % Einkommen und holt seine Härte aus Kristall,
Kurve und Dichte.

### 3.16 Wie man prüft, ob zwei Türme verschieden aussehen

Aussehen lässt sich nicht sinnvoll automatisch beurteilen — aber *Gleichheit*
schon, und die ist der eigentliche Fehler. Zwei Prüfungen greifen ineinander:

Der **Datenwächter** verlangt, dass die beiden Zweige eines Turms
unterschiedliche Bezeichner tragen und dass kein Bezeichner zweimal im Spiel
vorkommt. An diesem Bezeichner hängt die Zeichenroutine; gleicher Bezeichner
hieße zwangsläufig gleicher Umriss. Gegenprobe: benennt man die Salve in
`sniper` um, meldet er *„beide Zweige heißen `sniper` — sie bekämen denselben
Umriss."*

Der **Rauchtest** fordert für jeden Turm, jede Stufe und beide Zweige ein
eigenes gebackenes Bild an und verlangt, dass es nicht dasselbe Objekt ist.
Damit fällt auf, wenn eine neue Zweigform im Code vergessen wurde und still auf
die Standardform zurückfällt.

### 3.15 Grafik gegen ein Budget

Politur ohne Messung wird schnell zu Ruckeln auf dem Handy. Diese Runde lief
deshalb gegen zwei Zahlen.

**Zeichenbefehle je Bild.** Vor der Runde standen 2.874 von 3.000 — zu eng, um
noch etwas hinzuzufügen. Der größte Posten waren Teilchen: 907 Rechtecke. Also
zuerst eine Obergrenze (620 bei hoher Qualität, 180 bei niedriger), dann die
Politur. Ergebnis: 2.576 mit *mehr* Grafik als vorher.

**Backbudget.** Vorgebackene Bilder sind der Preis für wenige Zeichenbefehle —
und auf einem Handy ist Speicher die knappere Ware. Mit sechs Laufphasen je
Gegner, jeweils auch in einer weißen Trefferfassung, wächst der Vorrat schnell.
Deshalb misst das Tor jetzt auch, wie viele Bilder im Speicher liegen und wie
groß sie zusammen sind: 71 Bilder, 5,8 MB, Obergrenze 24 MB.

### 3.14 Warum nur ein Spielstil funktionierte

Mit drei Bots statt einem fiel sofort auf: **nur der Meister kam durch.** Der
breite Stil verlor in Welle 11, der sparsame in Welle 13.

Die Ursache war keine Zahl, sondern eine Rückkopplung. Das Einkommen hing fast
ganz am Abschuss: ein besseres Feld tötet mehr, verdient mehr, wird noch besser
— und ein schwächeres fällt immer weiter zurück. Der Meister verdiente 5.106
Gold, der breite Stil 2.082. Die Schere geht auf, nicht zu.

Behoben durch eine Verlagerung: **Abschussprämien auf 40 %, Wellenbonus auf das
4,4-fache.** Der Wellenbonus fällt auch dann an, wenn etwas durchgekommen ist —
er flacht die Spirale ab, ohne das gute Spiel zu bestrafen.

Das riss prompt eine neue Lücke auf: mit gekürzten Abschussprämien fehlte das
Geld für die Eröffnung, und plötzlich standen Verluste in **Welle 1**. Das
Startkapital musste von 140 auf 220 steigen.

Danach war noch einmal die Form der Kurve dran. Endfaktor und Verdichtung
prallten am voll ausgebauten Meisterfeld schlicht ab — bei Endfaktor 13 wie bei
Endfaktor 28 gewann er identisch mit 18 von 20, bis aufs Goldstück gleich. Was
half, war der steilere Exponent: von 2,2 auf 2,6, Endfaktor von 10 auf 13.

Stand danach: Meister **15/20**, Breite **10/20**, Sparsam verliert in Welle 15.
Zwei von drei Stilen kommen durch, keiner ohne Verlust.

### 3.13 Was ein besserer Bot über das Spiel verriet

Der alte Simulationsbot baute auf jeden freien Platz — rund hundert Türme,
alle auf Stufe 1, alle in der Nähe des Pfades. Das ist kein Spieler, das ist
eine Wand. Der neue baut höchstens **16 Türme**, entscheidet alle halbe Sekunde
statt sechzigmal je Sekunde, wählt Plätze nach **Pfaddeckung** (wie viele
Pfadzellen liegen in Reichweite) statt nach bloßer Nähe, investiert in den
Turm, der bisher am meisten geleistet hat, und hält 40 Gold Reserve.

Das Ergebnis war unangenehm und lehrreich: **das Spiel war viel zu leicht.**
16 gut gesetzte, voll ausgebaute Türme hielten alles — 20 von 20 Kristall, kein
einziger Verlust. Die alte Schwierigkeit sah nur deshalb richtig aus, weil der
alte Bot schlecht spielte.

Der Weg dorthin führte über drei falsche Fährten:

**Erstens: mehr Lebenspunkte helfen nicht.** Ramp von 0,11 auf 0,28 erhöht —
das Ergebnis blieb 20/20. Der Bot baut sein Feld ja mit.

**Zweitens: weniger Gold hilft kaum.** Einkommen um ein Drittel gekürzt — immer
noch 20/20, nur mit weniger Restgold. Solange 16 Türme voll ausbaubar sind,
hält das Feld.

**Drittens: dichtere Wellen allein reichen auch nicht.** Ein voll ausgebautes
Feld leistet etwa dreimal so viel Schaden je Sekunde wie ankommt. Verdichtung
verschiebt nur, wann es ankommt.

Der eigentliche Fehler saß in der Form der Kurve: sie stieg **linear** und traf
damit die Mitte genauso hart wie das Ende. Stellt man sie flach genug für die
Mitte, ist das Ende belanglos; stellt man sie steil genug für das Ende, ist die
Mitte unspielbar. Genau dort saß die Wand in Welle 8 — zähe Gegner, während das
Feld noch nicht steht.

Ersetzt durch eine **Potenzkurve**: `1 + (i/n)^2,2 × 10`. Fast unverändert am
Anfang, Faktor 11 auf der letzten Welle. Dazu eine **Verdichtungsrampe** (der
Abstand zwischen zwei Gegnern schrumpft um 12 % je Welle) und ein um 15 %
gekürztes Einkommen.

Stand danach: gemischt gewinnt mit **17 von 20**, jede einzelne Turmsorte allein
verliert, ein bodenlastiges Feld verliert in Welle 12.

### 3.12 Zwei Funde beim verzweigten Ausbau

**Der Simulationsbot war zu stark, um Zweige zu unterscheiden.** Die naheliegende
Prüfung — beide Zweige einmal durchspielen und verlangen, dass beide gewinnen —
schlug nicht an, als ich einen Zweig absichtlich wertlos machte. *(In v13 behoben,
siehe 3.13. Die Prüfung selbst wurde außerdem verfeinert: nicht mehr das ganze
Feld in einen Zweig, sondern ein gemischtes Feld, in dem genau ein Turmtyp
umgestellt wird. Damit fällt auf, **welcher** Zweig nicht trägt.)*

Ersatz ist die **Zweig-Waage** im Datenwächter: eine direkte Rechnung, Wirkung je
investiertem Gold auf der Endstufe, über ein Modell mit den tatsächlichen
Gegnerwerten — Panzerung frisst pro Treffer und benachteiligt schnelle Türme,
Bremsen zählt als Schaden für andere, Flächenschaden und Sprünge werden
gewichtet. Zwei Zweige dürfen um höchstens den Faktor 1,4 auseinanderliegen.

Beim ersten Lauf fand sie sofort zwei Schieflagen: **Splitterfrost war je Gold
mehr als doppelt so wirksam wie Ewiges Eis** (Faktor 2,14), und die Salve lag
45 % vor dem Scharfschützen. Nach dem Nachjustieren liegen alle vier Paare
zwischen 1,04 und 1,26. Das ist ein Modell und kein Beweis — es findet grobe
Schieflagen, nicht die letzten fünf Prozent.

**Und der Spielstand war doch nicht vollständig.** Die Determinismus-Prüfung fiel
durch. Zwei Ursachen: das zwischengespeicherte Ziel jedes Turms fehlte — nach dem
Laden zielte jeder Turm sofort neu, statt bis zu 120 ms an seinem Ziel zu
bleiben. Und die Geschosse im Flug.

Letztere hatte ich in v5 ausdrücklich weggelassen, mit der Begründung, ein
Geschoss unterwegs sei „ein halber Treffer und keine Entscheidung". Die Prüfung
hat gezeigt, dass diese Begründung bequem war und nicht richtig: der Verlauf
wird messbar anders. Sie werden jetzt mitgesichert.

### 3.11 Eine Auswertung, die auch stimmt

Eine Statistik, die schöne Zahlen zeigt, aber die falschen, ist schlimmer als
keine — man trifft Entscheidungen danach. Der Rauchtest prüft deshalb nach jeder
Partie vier Gleichungen:

- Es wurde überhaupt Schaden und Gold verbucht.
- Es stehen nicht mehr Türme im Feld, als gebaut wurden.
- Die Summe der Schadensquellen ergibt den Gesamtschaden.
- Die verbuchten Kristallverluste je Welle ergeben zusammen den fehlenden
  Kristall.

Gegenprobe: Bucht man den Meteorschaden absichtlich nicht mit, meldet er
*„Schaden nach Quelle (16.256) passt nicht zur Summe (18.198)."*

Und weil die Zahlen im Spielstand mitwandern müssen — sonst fängt die
Auswertung nach dem Fortsetzen bei null an —, stehen sie jetzt auch im
Fingerabdruck der Determinismus-Prüfung. Lässt man sie beim Sichern weg, fällt
sie durch. Dieselbe Lehre wie in v7, diesmal von Anfang an berücksichtigt.

### 3.10 Der Fehler, den dreizehn Tore nicht gefunden haben

Bis v8 war das Spiel auf dem Handy unbedienbar. Nach dem Tippen auf „Beginnen"
reagierte kein einziger Knopf mehr.

Die Ursache war eine Zeile CSS:

```css
.screen { position: absolute; inset: 0; display: grid; ... }
```

Das `hidden`-Attribut setzt `display: none` nur über die Standardregeln des
Browsers. Jede eigene Regel schlägt sie. Die Titelkarte galt also als
versteckt, lag aber weiter bildschirmfüllend über allem und fing jeden Tipp ab.
Dasselbe galt für die Wellenvorschau.

Bemerkenswert ist, was das über die Pipeline sagt. Neun Tore liefen grün: Typen,
Daten, Determinismus, Balance, zwei Messungen, Rauchtest, Build, Autarkie. Der
Rauchtest ruft `ui.hideScreen()` auf, das Attribut wird korrekt gesetzt, alles
verhält sich wie vorgesehen — **nur der Browser zeigt die Ebene trotzdem an.**
Kein Test hat je den berechneten Stil betrachtet, weil bis dahin kein Test etwas
über Aussehen wusste.

Die Lehre ist nicht „mehr Tests", sondern: *Die Tore prüfen Verhalten, nicht
Darstellung.* Alles, was nur im echten Browser sichtbar wird — Stapelreihenfolge,
Kaskade, Sicherheitsabstände, Berührungsflächen —, braucht weiterhin einen Blick
auf dem Gerät. Ein Tor ersetzt das nicht, es entlastet es nur.

Behoben ist es mit einer Regel, die ganz oben steht und `!important` trägt:

```css
[hidden] { display: none !important; }
```

Der Autarkie-Check verlangt sie ab jetzt. Fehlt sie, bricht der Build ab —
Gegenprobe gemacht, sie schlägt an. Den berechneten Stil kann er nicht befragen:
jsdom wertet den Vorrang von `!important` in eigenen Stilvorlagen falsch aus und
meldet `display: grid`, wo ein Browser `display: none` berechnet. Geprüft wird
deshalb die Zusage selbst, auf der alle versteckten Ebenen beruhen.

### 3.9 Wie eine Einführung geprüft wird

Eine Einführung kann auf zwei Arten kaputtgehen, und beide merkt man erst, wenn
ein Spieler feststeckt: Der Satz zeigt auf einen Knopf, den es nicht mehr gibt.
Oder ein Schritt verlangt etwas, das gar nicht eintreten kann.

Der Rauchtest prüft beides. Er sucht für jeden Schritt das genannte
Bedienelement im echten HTML. Und er führt für jeden Schritt genau den
Handgriff aus, den der Satz verlangt, und verlangt, dass der Schritt danach als
erledigt gilt.

Gegenproben: Benennt man den Meteor-Knopf um, meldet er
*„Einführung `meteor` zeigt auf `sk-meteorX` — das Element fehlt."* Macht man
den Ausbau-Schritt unerfüllbar, meldet er *„Einführung `upgrade` gilt nach dem
verlangten Handgriff nicht als erledigt."*

Dazu prüft der Datenwächter, dass der empfohlene Bauplatz auf der Karte
überhaupt bebaubar ist und am Pfad liegt — ein Pfeil auf eine unbrauchbare
Zelle wäre schlimmer als kein Pfeil.

### 3.8 Was die Determinismus-Prüfung in v7 gefunden hat

Beim Einbau der Fähigkeiten fiel das Tor sofort durch: Sichern und Laden mitten
in Welle 10 kostete plötzlich fünf Kristall mehr. Die Ursache war eine
Unterscheidung, die im Konzept schon stand, aber im Code fehlte.

Ein Geschoss unterwegs ist ein halber Treffer — es darf beim Fortsetzen
verschwinden. Ein **Meteor** im Anflug ist etwas anderes: die Abklingzeit von
40 Sekunden läuft bereits, die Entscheidung ist bezahlt. Ihn verschwinden zu
lassen wäre ein echter Verlust. Ebenso fehlten der Nachladestand der Türme und
die Trefferpause — letztere fühlt sich wie ein Effekt an, hält aber die
Simulation an und gehört damit in den Zustand.

Drei Felder, die man beim Schreiben der Sicherung übersieht, und ein Test, der
sie in einem Lauf findet. Das ist der Grund, warum das Tor existiert.

### 3.7 Warum der Zufall eine Aussaat hat

`Math.random` lässt sich weder aussäen noch sichern. Solange der Zufall so
entsteht, kann ein gemeldeter Fehler nur beschrieben, nicht nachgestellt werden
— und ein Spielstand läuft nach dem Laden anders weiter als vorher.

Deshalb hat das Spiel jetzt einen eigenen Zufall mit sichtbarem Zustand
(xorshift32, der gesamte Zustand passt in eine 32-Bit-Zahl). Die Aussaat steht
in der Technikanzeige und wandert in jeden Spielstand. Zwei Läufe mit derselben
Aussaat sind Bild für Bild identisch.

Wie ernst das gemeint ist, zeigen zwei Gegenproben. Lässt man beim Laden den
Zufallszustand weg, meldet die Prüfung: Abweichung ab Sekunde 95. Verschiebt man
die Wellenuhr um ein Zehnmillionstel, meldet sie: Abweichung ab Sekunde 96. Die
Prüfung hat also Zähne.

### 3.6 Was die Zeichenmessung über v4 ergeben hat

Im schlimmsten Fall — 171 Türme, 62 Gegner, 626 Partikel — schickte der Renderer
**19.206 Befehle je Bild** an die Leinwand. Die Spitzenreiter verrieten sofort,
woher sie kamen: 4.792 `arcTo`, 2.427 `beginPath`, 2.348 `fill`. Jede Turmform
und jeder Gegner wurde in jedem einzelnen Bild als Vektorpfad neu gezeichnet.

Nach dem Umbau sind es **2.502** — ein Siebtel:

| | v3 | v4 |
|---|---|---|
| Befehle je Bild | 19.206 | 2.502 |
| `arcTo` | 4.792 | 0 |
| `fill` | 2.348 | 8 |
| `set fillStyle` | 1.495 | 9 |

Drei Eingriffe haben das bewirkt. **Turmsockel liegen in einer eigenen Schicht**,
die nur beim Bauen, Ausbauen oder Verkaufen neu entsteht — 171 Türme kosten
jetzt einen einzigen Kopierbefehl statt tausender Pfadbefehle. **Gegner und
Turmwaffen sind vorgebackene Bilder**, gedreht wird beim Zeichnen, nicht beim
Backen. **Partikel, Lebensbalken und Leuchtscheiben werden gebündelt**: statt
für jedes Teilchen Farbe und Deckkraft neu zu setzen, fällt beides nur noch je
Bündel an.

### 3.5 Was die Simulationsmessung über v3 ergeben hat

Die erste Fassung des Rasters war **langsamer** als die naive Schleife: 0,164 ms
gegenüber 0,145 ms. Bei 55 Gegnern sind 9.405 Distanzrechnungen auf einem
flachen Array für die Laufzeitumgebung nichts, während das Raster Verwaltung
kostet. Die Messung hat also eine Optimierung widerlegt, die auf dem Papier
richtig aussah.

Der eigentliche Gewinn lag woanders: **jeder Turm hat jedes Bild ein Ziel
gesucht, auch während er nachlud.** Mit zwischengespeichertem Ziel fiel die Zeit
auf 0,120 ms — ein Sechstel weniger als vorher, ohne dass sich am Spielgefühl
etwas ändert.

Das Raster bleibt trotzdem drin, aber aus einem anderen Grund als geplant: bei
320 Gegnern ist es 15 % schneller als die Vollprüfung, und die Kurve öffnet sich
weiter, je größer die Karten werden. Es kauft Luft für Phase C, keinen Gewinn
für heute.

| Messpunkt | ohne Raster | mit Raster |
|---|---|---|
| 171 Türme, 55 Gegner | 0,113 ms | 0,116 ms |
| 171 Türme, 320 Gegner | 0,397 ms | 0,338 ms |

Das ist der Sinn der Messung im Tor: Sie verhindert, dass Optimierungen aus
dem Bauch heraus als Verbesserung durchgehen.

---

## 4. Die Arbeitsteilung

**Ich übernehme:** Konzeption, Architektur, gesamten Code, Grafik, Balance,
Texte, Tests, Build, Auslieferung. Ich schlage nach jeder Runde die nächsten
Schritte vor, sortiert nach Nutzen für das Spiel.

**Du übernimmst:** Im Browser anschauen, eine Zahl tippen. Und wenn dir etwas
nicht gefällt, das sagen — dein Bauchgefühl beim Spielen ist die einzige
Information, die ich nicht selbst erzeugen kann.

Nach jeder Lieferung bekommst du:
- die vollständige, testbare HTML-Datei
- vier nächste Schritte, nach Nutzen sortiert, als antippbare Auswahl **und**
  als nummerierte Liste zum Abtippen
- darunter **immer mindestens einen rein technischen Schritt** — Leistung,
  Architektur, Aufräumen, Testautomatisierung, Ausbau der Pipeline

---

## 5. Stand v34

**Vier Türme mit vier echten Rollen** — nicht vier Zahlenvarianten. Der
Angriffstyp trennt sie, nicht die Schadenshöhe:

| Turm | Rolle | Wie er angreift |
|---|---|---|
| Bogenturm | Dauerfeuer | Einzelziel, zielsuchendes Geschoss |
| Frostturm | Umkreis-Bremse | kein Geschoss, pulst im Radius auf alle gleichzeitig |
| Mörser | Flächenschlag | ballistische Granate mit Vorhalten, Schaden fällt zum Rand ab |
| Prisma | Kettenblitz | Sofortstrahl, springt auf bis zu vier Nachbarn über |

**Sieben Gegnerarten**, jede mit einer eigenen Gegenfrage: der Schleicher als
Masse, die Husche als Tempo, der Koloss mit Panzerung 3, der Leerentitan mit
Panzerung 6 und 55 % Bremsresistenz — der Grund, warum reines Bremsen nicht
reicht. Dazu seit v6:

- **Schwärmer** fliegen die Luftlinie zum Kristall, ohne dem Pfad zu folgen.
  Der Mörser wirft im Bogen auf den Boden und erreicht sie nicht. Wer sein Feld
  auf Flächenschaden gebaut hat, muss umbauen statt nachrüsten — die Simulation
  bestätigt es: ein mörserlastiges Feld scheitert in Welle 15, während dasselbe
  Feld gemischt gewinnt. Die Flughöhe ist sichtbar: der Körper schwebt über
  seinem eigenen Schatten.
- **Spalter** zerfallen beim Tod in zwei Späne, die an derselben Pfadstelle
  weiterlaufen — schneller, kleiner, unbeschädigt. Der Riss im Panzer kündigt
  es an, bevor es passiert. Ein Mörser, der einen Pulk Spalter auf einmal
  erledigt, erzeugt sofort den doppelten Pulk.

**Fünfzehn Wellen** mit Titanen in Welle 10 und 15.

**Frühstart-Bonus:** Wer die nächste Welle startet, bevor die 22 Sekunden
abgelaufen sind, bekommt bis zu 40 Gold extra. Das belohnt Entschlossenheit,
ohne Zögern zu bestrafen — und schafft die Spannung, die einer reinen
Aufbaupause fehlt.

**Bedienung am Daumen:** Drücken zeigt den Turm halbtransparent samt Reichweite
auf der Zelle, erst das Loslassen baut. Ein Fehltipp kostet kein Gold.

**Ton**, komplett synthetisch über Web Audio erzeugt — keine Audiodateien, die
Datei bleibt bei 48 KB. Jede Turmsorte klingt anders, gleichartige Geräusche
werden pro Frame begrenzt, damit es bei dreifachem Tempo keine Geräuschwand gibt.

**Wellenvorschau** über dem Baumenü: was kommt, wie viele, und ein Hinweis bei
besonderen Wellen.

**Spürbarkeit:** Kurzes Stocken beim Tod schwerer Gegner, Bildschirmzittern,
Explosionsringe, Trefferblitze, Turmsilhouetten, die mit der Ausbaustufe sichtbar
wachsen.

**Technik:** Bildrate wird gemessen, die Effektdichte passt sich automatisch an
(herunter nach 2 s unter 48 fps, herauf erst nach 8 s über 57 fps — die
unterschiedlichen Schwellen verhindern Hin- und Herspringen). Einstellungen und
bester Lauf werden lokal gespeichert. Beim Wechsel in eine andere App pausiert
das Spiel.

**Tastatur am Desktop:** Leertaste startet die Welle, 1–4 wählen den Turm,
U baut aus, X verkauft, P pausiert, Esc hebt die Auswahl auf.

Der Titelbildschirm zeigt die Versionsnummer. So ist im Browser jederzeit
sichtbar, welcher Stand gerade geladen ist.

**Neu in v34 — feste Bauplätze, und damit fallen T16 und ein Großteil von T15.**
Zwölf gestaltete Stellungen je Karte statt 170 freier Zellen. Der Abstand der
Spielstile fällt von 42 auf 3 Punkte, die Verluste verteilen sich erstmals über
drei Wellen. Siehe Abschnitt 3.29.

**Neu in v31 — der Bildvorrat ist ein Werkzeug geworden.** Dreimal habe ich
Lieferungen von Hand eingebaut; ab jetzt macht das `tools/pack-art.mjs`, und das
Tor prüft, dass die eingebetteten Bilder noch zu den Rohdateien passen. Siehe
Abschnitt 3.28.

**Neu in v30 — echtes Vollbild mit Kamera.** Das Spielfeld füllt jetzt den
Bildschirm, statt zwischen zwei Bänder gequetscht zu werden; die Bedienung
schwebt darüber und lässt sich wegklappen. Verschieben, Kneifen, Doppeltipp.
Siehe Abschnitt 3.27.

**Neu in v26 bis v28 — gerenderte Grafik und ein Verzerrungsfehler.**
Drei Untergrundbilder und zwölf Türme sind eingebaut; Karte 2 heißt jetzt
Laubschlucht, weil im Bildsatz nichts Vulkanisches war. Dabei ist ein Fehler
entstanden, der im Bild sofort auffiel und den keine Prüfung gesehen hat —
siehe Abschnitt 3.26.

**Neu in v25 — nichts am Spiel. Eine korrigierte Kennzahl und ein Vorschlag,
wie es weitergeht.** Der Versuch, die Geometrie zu ändern, ist zurückgenommen.
Was dabei herauskam, steht in Abschnitt 3.25 — und am Ende ein Vorschlag, der
die ganze Frage anders stellt.

**Neu in v24 — T16 halb gelöst und die andere Hälfte erklärt.** Zwei der drei
Spielstile liegen jetzt nah beieinander (117 und 110 statt 116 und 74). Warum
der dritte nicht aufschließen kann, ist gemessen und hat einen Namen — siehe
Abschnitt 3.24. Nebenbei: Frostturm, Mörser und Prisma sind auf Stufe 1
deutlich stärker geworden.

**Neu in v23 — drei Messgeräte und eine Wand, die jetzt einen Namen hat.**
T15 (Verluste über mehrere Wellen verteilen) wurde dreimal angegangen und
dreimal zurückgenommen. Warum, und was stattdessen entstanden ist, steht in
Abschnitt 3.23.

**Neu in v22 — Bedienung und Bild, nach einem Blick auf den echten
Bildschirm.** Vier Fehler, die im Bild sofort zu sehen sind und die keine
Prüfung gefunden hat — siehe Abschnitt 3.22.

**Neu in v21 — nichts am Spiel. Eine zurückgenommene Runde und ein neues
Messgerät.** Der geplante Blockturm und der heilende Gegner wurden gebaut,
gemessen und wieder ausgebaut. Warum, steht in Abschnitt 3.21.

**Neu in v20 — Endlosmodus, Sterne und dauerhafter Fortschritt.**

**Endlos** wird auf dem Titelbildschirm gewählt. Nach der letzten Welle des
Plans wiederholen sich die letzten fünf, jede Runde mit 18 % mehr Gegnern; die
Lebenspunktkurve wächst ohnehin weiter. Es gibt kein Gewinnen, nur ein Weiter —
und deshalb auch keine Sterne, weil es kein Ende gibt, an dem man messen könnte,
wie sauber man durchgekommen ist.

**Sterne** gibt es je Karte und Grad: drei ab 90 % verbleibendem Kristall, zwei
ab 55 %, einer für jeden Sieg, keiner für eine Niederlage. Nur das beste
Ergebnis zählt.

**Verbesserungen** kosten Sterne und bleiben: +35 Startgold (2), +2 Kristall (3),
80 % statt 70 % Verkaufserlös (2), 10 % kürzere Abklingzeiten (3), +4 % Schaden
(4). Zusammen 14 Sterne von 27 erreichbaren — man kann also nicht alles haben,
ohne fast überall drei Sterne zu holen.

**Neu in v19 — jede Karte hat ihren eigenen Wellenplan.** Bis v18 teilten sich
alle Karten einen Plan, der über einen Faktor je Karte gebogen wurde. Das
funktionierte, war aber unehrlich: die Karten unterschieden sich in der Form des
Weges, nicht in dem, was darauf kam.

| Karte | Was dort verlangt wird |
|---|---|
| Spiralhain | Der Lehrplan: alle Gegnerarten in ausgewogener Mischung |
| Ascheschlucht | Masse und Panzerung — Spalter, die aus jedem Flächentreffer zwei Gegner machen |
| Frostspalte | Panzerwände statt Masse: Kolosse und Spalter, kaum Flieger |

Die Ausgleichsfaktoren stehen jetzt bei allen drei Karten auf 1,0 — die Pläne
tragen sich selbst. Der Faktor bleibt als letzte Feinschraube, aber der Wächter
lässt nur noch 0,85 bis 1,2 zu: ein größerer Bedarf heißt, dass der Plan nicht
stimmt.

**Neu in v18 — drei Karten, zwei davon mit Gabelung.**

| Karte | Zuwege | Pfadzellen | Bauplätze | Biom |
|---|---|---|---|---|
| Spiralhain | 1 | 43 | 171 | Mondmoos, kaltes Blaugrün |
| Ascheschlucht | 2, früh vereint | 54 | 147 | Asche und Lava, warmes Braunrot |
| Frostspalte | 2, spät vereint | 38 | 120 | Gletscher, kaltes Stahlblau |

Jede Karte bringt ihre eigene Farbwelt mit — Boden, Pfad, Felsen, Lichtstimmung
und Nebelton. Kristall, Gold und Gefahr bleiben überall gleich, damit die
Bedeutung der Farben nicht von der Karte abhängt.

Auf mehrspurigen Karten werden die Bahnen abwechselnd bedient, damit eine Welle
nicht zufällig nur einen Zuweg belastet. Jedes Tor dreht sich zur Bahn hin — man
sieht auf einen Blick, aus welchen Richtungen es kommt.

Karte und Schwierigkeitsgrad werden auf dem Titelbildschirm gewählt, der
Bestwert wird je Kombination getrennt geführt.

**Neu in v17 — drei Schwierigkeitsgrade, wählbar auf dem Titelbildschirm.**
Nicht ein einzelner Regler, sondern ein ganzer Satz Kurvenparameter — die
Erfahrung aus v13 und v14 war eindeutig: Höhe allein ändert nichts, weil ein
voll ausgebautes Feld eine feste Leistung hat.

| | Kristall | Startgold | Endfaktor | Exponent | Dichte | Gold |
|---|---|---|---|---|---|---|
| Ruhig | 25 | 300 | 9 | 2,4 | 11 % | +30 % |
| Normal | 20 | 220 | 13 | 2,6 | 16 % | — |
| Erbarmungslos | 14 | 190 | 17 | 2,7 | 20 % | −5 % |

Der Bestwert wird je Grad getrennt geführt — ein einziger wäre irreführend,
wenn er auf „Ruhig" entstanden ist.

**Neu in v16 — jeder Zweig hat jetzt eine eigene Gestalt.** Bis v15 unterschied
nur die Farbe, was man gebaut hatte. Im Gewühl erkennt man einen Umriss aber
schneller als einen Farbton, und auf dem Handy ist ein Turm keine 45 Bildpunkte
groß.

| Zweig | Woran man ihn erkennt |
|---|---|
| Scharfschütze | schlanker hoher Turm, langer dünner Lauf mit Zielrohr und Zweibein |
| Salve | breite Zinnen, drei kurze Läufe im Fächer |
| Ewiges Eis | Eisring auf zwei Säulen, sechs lange schmale Zapfen |
| Splitterfrost | aufgestellte Klingen, drei breite gezackte Schneiden |
| Streubombe | flacher breiter Kasten, vier kurze weite Rohre |
| Brecher | massiver Bunker mit Verstärkungsbändern, ein einziges dickes Rohr |
| Verzweigung | drei kleine Träger, drei umlaufende Splitter |
| Bündelung | ein großer Ring, ein einzelner Kristall in der Fassung |

Auf Stufe 3 setzt jeder Zweig zusätzlich eine eigene Krone auf: eine Spitze bei
Scharfschütze, Splitterfrost und Bündelung, eine Zinne bei den übrigen.

**Explosionen haben Gewicht bekommen.** Rauch, der aufsteigt und wächst, dazu
Trümmer, die hochgeschleudert werden und fallen. Eine Explosion ohne Rauch ist
ein Blitz, kein Einschlag. Schwere Gegner hinterlassen beim Tod ebenfalls
Trümmer.

**Neu in v15 — die große Grafikrunde.**

**Gegner laufen.** Sechs Einzelbilder je Gegnerart, vorgebacken: der Schleicher
staucht und streckt sich und setzt drei Füße, der Koloss verlagert das Gewicht
von Bein zu Bein, der Schwärmer schlägt mit den Flügeln, dem Spalter pulsiert
der Riss, die Husche zieht Streifen hinter sich her. Die Laufphase hängt an der
zurückgelegten Strecke, nicht an der Uhr — ein gebremster Gegner bewegt die
Beine langsamer.

**Der Tod hat jetzt ein Ende.** Vorher verschwand ein Gegner ohne Übergang.
Jetzt kippt seine Hülle, schrumpft und verblasst.

**Licht.** Der Herzkristall wirft eine Lichtpfütze auf den Boden statt nur
selbst zu leuchten. Jeder Schuss erzeugt einen Mündungsblitz, der die Stellung
und den Boden davor kurz erhellt. Der Meteoreinschlag lässt das ganze Feld
aufleuchten — als gefülltes Rechteck, ausdrücklich nicht als Kopie der Leinwand
auf sich selbst; letzteres lässt iOS Safari nach kurzer Zeit schwarz werden.

**Die Welt lebt.** Das Feld scrollt nicht, klassische Parallaxe gibt es hier
also nicht. Tiefe entsteht über Schichten mit eigener Bewegung: ein ruhender
Mondlichtschacht von oben links, acht Bodennebelscheiben in verschiedenen
Tempi, ein Polarlicht, das darüber zieht.

**Terrain.** Kachelfasen mit heller Lippe oben und Schatten unten, Steine und
Risse, dreilagiger Pfad mit dunklem Saum und ausgetretener Mitte, Fußabdrücke.

Kosten: **2.576 Zeichenbefehle je Bild** statt 2.874 vorher — die Politur ist
*billiger* geworden, weil zugleich die Partikelzahl gedeckelt wurde. Dazu
71 gebackene Bilder mit 5,8 MB.

**Neu in v14 — die Kurve trägt jetzt mehr als einen Spielstil.** Die
Balance-Simulation misst gegen drei Bots: *Meister* (16 Stellungen, tief
ausgebaut), *Breite* (26 Stellungen, erst in die Breite, dann in die Tiefe) und
*Sparsam* (11 Stellungen, früh tief, viel Gold in der Hand). Mindestens zwei
müssen durchkommen, keiner ohne Verlust. Dafür wurde das Einkommen umgebaut:
der größere Teil kommt jetzt aus dem Wellenbonus statt aus dem einzelnen
Abschuss — siehe Abschnitt 3.14.

**Neu in v13 — die Schwierigkeit stimmt jetzt gegen einen Spieler, der weiß
was er tut.** Der Simulationsbot spielt nicht mehr wie ein Anfänger: höchstens
16 Türme, eine Entscheidung alle halbe Sekunde, Bauplätze nach Pfaddeckung
gewählt statt nach Nähe, Ausbau in den Turm mit der bisher größten Leistung,
40 Gold Reserve. Die Kurve wurde daraufhin von Grund auf neu gestellt — siehe
Abschnitt 3.13.

**Neu in v12 — verzweigter Ausbau.** Jeder Turm steht auf Stufe 1 vor einer
Entscheidung, die nicht zurückgenommen werden kann:

| Turm | Zweig A | Zweig B |
|---|---|---|
| Bogenturm | **Scharfschütze** — weite Reichweite, harter Einzelschuss, durchschlägt Panzerung | **Salve** — halbe Wucht, dreifache Schlagzahl |
| Frostturm | **Ewiges Eis** — weiter Umkreis, 68 % Bremse, kaum Schaden | **Splitterfrost** — bremst wenig, schneidet dafür |
| Mörser | **Streubombe** — doppelter Wirkradius, schnellere Folge | **Brecher** — enger Radius, gewaltige Wucht, Durchschlag 8 |
| Prisma | **Verzweigung** — bis zu acht Sprünge, kaum Abfall | **Bündelung** — ein Sprung, dafür ein Strahl, der wehtut |

Neu ist damit auch **Panzerdurchschlag**: Scharfschütze, Brecher und Bündelung
ziehen die Panzerung des Ziels teilweise ab. Der Leerentitan mit Panzerung 6 ist
damit nicht mehr nur eine Frage der Masse.

Aus vier Türmen sind faktisch acht geworden, ohne eine Zeile neuen Inhalt — das
ist genau der Mechanismus, aus dem Bloons TD 6 seine Tiefe bezieht.

**Neu in v11 — Genre-Abgleich in der Pipeline und volle Turmwerte vor dem Kauf.**
Sobald eine Turmart gewählt ist, zeigt der Inspektor Kosten, Schaden, Reichweite,
Takt, Schaden pro Sekunde, Wirkradius, Bremswert und ob der Turm Luftziele
erreicht — vor dem Bau, nicht danach. Der häufigste Vorwurf an schwächere
Vertreter des Genres lautet: man kann nicht planen, wenn man nichts weiß.

**Neu in v10 — Auswertung nach der Partie.** Auf dem Sieg- und
Niederlagebildschirm steht jetzt, was tatsächlich getragen hat: Wellen, Kristall,
Dauer, gebaute Türme, erledigte Gegner, verbautes Gold. Darunter ein Balken je
Schadensquelle mit Anteil in Prozent, der stärkste Turm mit Stufe und Feldposition,
die Wellen, in denen Kristall verloren ging, und wie oft die Fähigkeiten liefen.

Das kostet fast nichts: die Türme führten Abschüsse und Schaden ohnehin schon.
Neu ist nur, dass die Zahlen an einer Stelle zusammenlaufen und lesbar werden.

**Neu in v9 — Fehlerbehebung Bedienbarkeit.** Versteckte Ebenen verschwinden
jetzt wirklich; bis v8 lag die Titelkarte unsichtbar über dem Spielfeld und fing
jeden Tipp ab. Dazu `-webkit-`-Präfixe für den Weichzeichner und ein Ersatz für
`color-mix`, das ältere Safari-Fassungen nicht kennen.

**Neu in v8 — die Einführung.** Sie erklärt nichts vorab. Sie zeigt jeweils
einen Satz zum richtigen Zeitpunkt, hebt hervor, was gemeint ist, und
verschwindet, sobald der Handgriff gemacht wurde. Kein Weiter-Knopf, keine
Textwand, kein Modus, der das Spiel anhält — sieben Sätze über die ersten drei
Wellen verteilt:

Bogenturm wählen → auf eine helle Fläche drücken (mit Pfeil auf einen
empfohlenen Platz am Pfad) → Welle starten → Turm ausbauen statt einen zweiten
danebenzustellen → Frühstart-Bonus → Meteor gegen Flieger → Wellenvorschau lesen.

Wer sie nicht braucht, tippt „Einführung überspringen"; sie kommt dann nicht
wieder und lässt sich auf dem Titelbildschirm wieder einschalten. Beim
Fortsetzen einer gesicherten Partie läuft sie nie an.

**Neu in v7 — zwei Fähigkeiten auf Abruf.** Bisher war die Welle selbst reine
Zuschauerzeit: gebaut wurde davor, danach lief es ohne dich. Zwei Fähigkeiten
mit Abklingzeit geben dir während der Welle etwas zu entscheiden, bewusst mit
zwei verschiedenen Handgriffen:

- **Meteor** (40 s) wird gezielt: antippen, eine Stelle wählen, der Brocken
  fällt mit dreiviertel Sekunden Anflug ein. Der Ring zieht sich zusammen,
  damit man den Zeitpunkt sieht und nicht nur das Ergebnis. Trifft Boden
  **und** Luft — das einzige im Spiel, das beides erreicht.
- **Frostschlag** (32 s) wirkt sofort auf das ganze Feld: drei Sekunden lang
  alles bei einem Drittel Tempo. Der Notknopf, wenn eine Kette durchbricht.

Die Simulation nutzt sie jetzt so, wie ein aufmerksamer Spieler es täte — den
Meteor auf die dichteste Traube, den Frostschlag, wenn vier Gegner die letzten
25 % des Weges erreicht haben. Das Ergebnis bleibt bei 5 von 20 Kristall: die
Fähigkeiten helfen gegen Schwärme, nicht gegen die Titanen. Genau so soll es sein.

**Neu in v6:** Schwärmer und Spalter samt Wellenplan, der sie einführt.
Türme tragen jetzt die Eigenschaft, ob sie Luftziele erreichen; der Datenwächter
verlangt, dass es mindestens einen solchen Turm gibt, und warnt, wenn *alle*
Türme Flieger treffen — dann stellt der Gegnertyp keine Frage mehr. Er prüft
außerdem, dass eine Zerfallskette nicht endlos ist, nicht in sich selbst führt
und die Bruchstücke zusammen nicht mehr Hülle mitbringen als das Original. In
der Wellenvorschau sind Flieger und Zerfaller markiert, im Turm-Inspektor steht
beim Mörser „Luftziele: nein".

**Neu in v5 (Spielstand und Determinismus):** Eine laufende Partie wird alle
zwei Sekunden gesichert, zusätzlich beim Wechsel in eine andere App und beim
Schließen der Seite. Auf dem Titelbildschirm erscheint dann „Partie fortsetzen"
mit Welle und Kristallstand. Gesichert wird nur, was den Verlauf bestimmt —
Aussaat, Zufallszustand, Gold, Leben, Wellenuhr, ausstehende Spawns, Türme,
Gegner. Fliegende Geschosse und Partikel bleiben draußen: das ist reine
Darstellung, und ein Geschoss unterwegs ist ein halber Treffer, keine
Entscheidung. Passt ein Stand nicht mehr zu den aktuellen Daten, wird er
verworfen statt halb geladen.

**Neu in v4 (Zeichnen):** eigene Schicht für alle Turmsockel, die nur bei
Bestandsänderungen neu entsteht · vorgebackene Bilder für Gegner, Trefferblitze,
Bodenschatten, Turmsockel und Turmwaffen · gebündelte Partikel, Lebensbalken und
Leuchtscheiben · Zeichenmessung als achtes Tor. Ergebnis: ein Siebtel der
Zeichenbefehle je Bild.

**Neu in v3 (Technik):** Raster für alle Umkreisabfragen, zwischengespeicherte
Turmziele, Objektlager für Partikel, Geschosse, Ringe und Blitze, Listen werden
an Ort und Stelle zusammengeschoben. Dazu eine zuschaltbare Technikanzeige
(Titelbildschirm oder Taste F) mit Bildrate, Qualitätsstufe und Objektzahlen —
ausgeschaltet kostet sie nichts. Und zwei neue Tore in der Pipeline: der
kopflose Rauchtest und die Leistungsmessung.

Was noch fehlt: mehr als eine Karte, fliegende Gegner, Fähigkeiten auf Abruf,
Endlosmodus. Das komplette Rückstandsverzeichnis steht in der zweiten Datei.
