# Towerfront — Vollaudit v136

Messung: v136 · 23.08.2026 · gemessen an der ausgelieferten Datei, im Browser
gespielt (iPhone quer, 844 × 390), am Quelltext gelesen, mit eigenen Proben
belegt.

Vier Rollen, ein Ziel: eine Liste, an der man sich entlanghangeln kann.

**Dies ist ein Messbericht, kein lebendes Dokument.** Er beschreibt absichtlich
den Stand von v136; ihn mitzuziehen waere Faelschung. Was daraus abgearbeitet
ist, steht im Rueckstandsverzeichnis.

* **Teil A — Architektur** (IT-Architekt am Quelltext)
* **Teil B — Spielerlebnis** (Enduser, der zum ersten Mal spielt)
* **Teil C — Grafik** (Grafikdesigner am Bild)
* **Teil D — Testbericht** (Spielemagazin, systematische Prüfliste)
* **Teil E — Abarbeitungsplan** in Stapeln

**Grundsatz dieses Dokuments:** jeder Befund trägt seinen Beleg. Wo eine Zahl
steht, steht daneben, woran sie gemessen wurde (Regel 12). Was ich nicht
belegen kann, steht als Vermutung gekennzeichnet.

---

## Teil A — Architektur

### A0 Die Lage in Zahlen

| | |
|---|---|
| Quelltext Spiel | 11 148 Zeilen (`src/`) |
| Werkzeuge | 13 433 Zeilen (`tools/`) |
| Torkette | 20 Prüfungen, ~90 s |
| Stehende Gegenproben | 89, alle schlagen an |
| Rechenlast Simulation | 0,027 ms je Schritt (Budget 4 ms) |
| Zeichenbefehle je Bild | 1 245 (Budget 3 000) |
| Gebackene Bilder | 71, 7,6 MB (Budget 24 MB) |

**Das Wichtigste zuerst:** die Technik ist nicht das Nadelöhr. Bei 0,7 % der
Simulationszeit und 41 % des Zeichenbudgets ist Platz für erheblich mehr Bild
und erheblich mehr Spiel. Was fehlt, fehlt nicht aus Leistungsgründen.

### A1 `GameState` ist ein Gemischtwarenladen (1 710 Zeilen, 55 Methoden)

Eine Klasse trägt: Kartenladen, Bauregeln, Wirtschaft, Wellenplan, Zielsuche,
Geschossflug, Schadensrechnung, Fähigkeiten, Spielstand — **und die
Effektwerkstatt** (`float`, `ring`, `smoke`, `debris`, `spark`, `particles`).

Das ist der Grund, warum die antippbare Zierde in v134 beinahe den
**Spielwürfel** bewegt hätte: Effekte und Simulation ziehen aus derselben
Klasse, und nur ein aufmerksamer Blick hat verhindert, dass derselbe Spielstand
je nach Anzahl der Buschtipper anders verläuft. Die Regel „das Modell darf
nicht vom Gemessenen abhängen" wird heute von Hand durchgesetzt, nicht von der
Struktur.

**Vorschlag:** Trennung in `Sim` (deterministisch, würfelt aus `rng`) und `Fx`
(darstellend, würfelt aus `zierRng`, darf nichts zurückgeben). Damit wird aus
einer Regel eine Bauart.

### A2 `Renderer` ist eine Wand (2 124 Zeilen, 45 Methoden)

`drawTowers` 280 Zeilen, `drawEnemies` 216 Zeilen. Jede Figur bringt ihre
eigene Schatten-, Licht- und Auswahllogik mit. Ein neues Element bedeutet
heute: die drei Stellen finden, an denen etwas Ähnliches schon steht.

### A3 **Es gibt keine Tiefensortierung** — der größte einzelne Hebel

Gezeichnet wird nach *Kategorie*, nicht nach *Ort*:

```
drawCrystal → drawTowers → drawHusks → drawEnemies → drawProjectiles
```

Folge: **jeder Gegner liegt vor jedem Turm**, auch wenn er zwei Turmhöhen
weiter hinten läuft. Nichts verdeckt je etwas. Das zerstört den Raumeindruck
gründlicher als jedes Lichtproblem — und es ist die Ursache dafür, dass das
Feld „flach" aussieht, obwohl die Einzelbilder plastisch sind.

### A4 Zwei Turm-Zeichenwege, einer davon tot

`bakeTowerLayer` backt Türme **ohne** gerendertes Bild in eine
1920 × 1080-Leinwand. Alle vier Turmarten haben heute gerenderte Bilder — die
Schleife überspringt also jeden Turm, und übrig bleibt eine leere Leinwand von
rund 8 MB, die bei jeder Turmänderung neu geleert und gezeichnet wird.

### A5 Prüf-Schnittstellen im Auslieferungscode

`spawnZumPruefen`, `trefferZumPruefen`, `spawnsJeBahn`, `spawnsTrotzSperre`
stehen in `GameState` und werden mit ausgeliefert. Klein, aber sie verwischen
die Grenze zwischen Spiel und Prüfstand.

### A6 Toter Zweig: `topdown`

Alle acht Gegnerarten tragen `topdown: true`. Der Renderer hält daneben den
kompletten Weg für Seitenansichten (spiegeln statt drehen) vor. Ein Flag mit
genau einem Wert ist kein Flag.

---

## Teil A′ — Belegte Fehler

| # | Befund | Beleg | Schwere |
|---|---|---|---|
| **F1** | **Schild und Schildträger gehen beim Sichern verloren** | Probe: Welle 8 Spiralhain, nach 8 s hat der laufende Stand 10 Schildpunkte, der geladene **0** | hoch |
| **F2** | **Zwei Trefferstopp-Felder** `hitStop` und `hitstop` | beide halten die Simulation an, nur `hitstop` wird gesichert, nur `hitStop` ist gedeckelt | mittel |
| **F3** | **Turmwerte sind auf dem Zielgerät unsichtbar** | gemessen im Browser: `#i-stats` ist **4 px** hoch, wenn ein Turm gewählt ist | hoch |
| **F4** | **Karte 2 heißt dreierlei** | `id: 'ascheschlucht'`, `name: 'Laubschlucht'`, Bild zeigt Asche und Lava | hoch |
| **F5** | **Kartentext widerspricht der Karte** | Blurb „Zwei Zuwege", die Karte hat **drei**; der abgeleitete Text daneben sagt drei | mittel |
| **F6** | **Platzbedarf je Turmsorte gibt es nicht** | alle vier Türme `footprint: 96`, obwohl Konzept und `maps.ts` das Gegenteil behaupten | mittel |
| **F7** | **Bauplätze sind auf dem Telefon nur sichtbar, solange der Finger liegt** | `hoverPoint` wird nur für Nicht-Touch gesetzt; ohne liegenden Finger keine Punkte | hoch |
| **F8** | `pending` sichert 4 von 6 Feldern | Ursache von F1 | — |
| **F9** | `Math.random()` im Renderer (Bildwackeln) | inkonsistent zur eigenen Würfel-Doktrin, ohne Spielwirkung | niedrig |
| **F10** | Tote Felder | `TowerLevel.range` wird immer überschrieben; drei überlagerte Kommentarblöcke in `SaveGame` | niedrig |

---

## Teil B — Spielerlebnis

Gespielt wie ein Mensch: Datei öffnen, tippen, was da ist.

### B1 Die erste Minute

1. **Weltkarte.** Drei Kugeln auf einem Sternenfeld, alle drei sofort spielbar,
   alle drei Schwierigkeitsgrade sofort wählbar. Es gibt nichts zu erreichen.
2. **Einweisung.** Sauber, sagt was kommt — und widerspricht sich (F5).
3. **Feld.** Ein großes braunes Feld, ein Steinweg, der sich in vier
   Serpentinen darüberzieht, rechts eine Kristallburg. **Nirgends steht, wo man
   bauen darf.** Wer eine Turmart antippt, sieht auf dem Telefon weiterhin
   nichts (F7) — die Bauplatzpunkte erscheinen erst, während der Finger auf dem
   Feld liegt.

Das ist der Kern der Beschwerde „man sieht nicht, wo man bauen kann". Sie ist
in v125 zur Hälfte gelöst worden (Einrasten, Begründung) und zur anderen Hälfte
nicht.

### B2 Der Rhythmus stimmt nicht

* **Eine Welle kann nicht gerufen werden, solange eine läuft** (`canStartWave`
  verlangt `!waveActive`). Damit fehlt der wichtigste Hebel des Genres: Risiko
  gegen Gold. Der Frühstart-Bonus greift nur in der Lücke *zwischen* Wellen.
* Gemessen: 213 Sekunden reine Ausschüttung über 15 Wellen auf dem Spiralhain,
  361 Gegner. Der Rest der Partie ist **Warten, bis der letzte Gegner die Bahn
  abgelaufen ist**.
* Ein Gegner braucht für die 1 505 Weltpunkte lange Bahn des Spiralhains rund
  13 Sekunden. Eine Welle schüttet 14 Sekunden lang aus. Fast die Hälfte jeder
  Welle ist Zusehen.

### B3 Die Karten sind nicht gleich viel Karte

| Karte | Bahnen | Weltpunkte Weg |
|---|---|---|
| Spiralhain | 1 | **1 505** |
| Laubschlucht | 3 | 6 238 |
| Frostspalte | 2 | 5 036 |

Der Spiralhain hat **ein Viertel** des Weges der zweiten Karte. Deshalb deckt
dort ein einziger gut gesetzter Turm fast alles ab, deshalb klumpen im
Endbild alle zwölf Türme in der Bildmitte, und deshalb bleibt die linke
Bildhälfte über die ganze Partie leer. „Ein Weg, viel Platz" ist in Wahrheit
„ein kurzer Weg, keine Entscheidung".

### B4 Die Entscheidungen tragen nicht

`npm run sim` misst, was ein umgestellter Ausbauzweig am Ergebnis ändert
(Kristall von 60):

| Turm | Zweig A | Zweig B |
|---|---|---|
| Bogenturm | Scharfschütze 30 | Salve 28 |
| Frostturm | Ewiges Eis 30 | Splitterfrost 24 |
| Mörser | Streubombe 30 | Brecher 31 |
| Prisma | Verzweigung 30 | **Bündelung 30** |

Zwei von vier Entscheidungen sind messbar bedeutungslos. Die Zweige sind auf
dem Papier schön beschrieben („halbe Wucht, doppelte Schlagzahl") und im
Ergebnis austauschbar.

### B5 Die Grade fragen nichts

* **Ruhig:** 80 von 80 Kristall bei allen drei Spielstilen — unverlierbar.
* **Normal:** 30–45 von 60.
* **Erbarmungslos:** 5 von 52 bei einem Stil, gewonnen bei einem anderen.

Drei Grade, von denen einer keine Aufgabe stellt und einer vom Spielstil
abhängt statt vom Können.

### B6 Die Gegner tun nichts

Acht Arten, und alle acht sind „laufen und sterben" mit anderen Zahlen für
Leben, Tempo, Rüstung. Kein Gegner heilt, keiner beschleunigt, keiner greift
etwas an, keiner zwingt zu einer Reaktion — außer dem Schildträger (v110), und
der sitzt an der *Wellengruppe*, nicht an einer Art.

Zum Vergleich: im Genre erzwingen Gegner Antworten (Luft, Panzer, Tarnung,
Heilung, Teilung, Bosse mit Phasen). Hier gibt es Luft, Panzer und Teilung —
drei von vielen.

### B7 Es gibt nichts zu erreichen

* Keine Karte ist gesperrt, kein Grad ist gesperrt.
* Fünf dauerhafte Verbesserungen für zusammen 14 Sterne; erreichbar sind 27.
  Man kann alles kaufen, und alles zusammen ist +35 Gold, +15 % Kristall,
  +4 % Schaden, −10 % Abklingzeit, +10 % Verkaufserlös.
* Kein Ziel je Karte außer „überstehen". Keine Herausforderung, keine
  Bestenliste, kein Grund für einen zweiten Lauf.

---

## Teil C — Grafik

### C0 Der Befund in einem Satz

Die **Einzelteile** sind gut (gemalte Untergründe, sauber gerenderte Türme, eine
schöne Kristallburg). Was fehlt, ist alles, was aus Einzelteilen eine **Szene**
macht: eine Tiefenordnung, ein Licht, ein Schatten, ein Maßstab, eine
Farbwelt. Genau das ist der Eindruck „zusammengewürfelt".

### C1 Keine Verdeckung, keine Tiefe (= A3)

Nichts steht je vor oder hinter etwas. Das ist der größte Einzelposten.

### C2 Gegner werfen keinen Schatten

Türme werfen zwei (Schlagschatten + Kontaktschatten), die Kristallburg wirft
zwei, **Gegner werfen keinen**. Sie schweben über der Landschaft. Auf dem Bild
`neue-gegner.png` sieht man vierzehn Schleicher ohne einen einzigen
Berührungspunkt zum Boden.

### C3 Drei Kameras in einem Bild

Der Untergrund ist aus rund 55–60° gemalt. Die Turmbilder sind aus
unterschiedlichen Winkeln gerendert — der Frostturm auf `stufen.png` von oben,
der ausgebaute daneben flacher. Die Gegner sind Aufsichten. Ein Bild verträgt
eine Kamera.

### C4 Gegner sind zu klein zum Lesen

Gemessen auf dem Zielgerät (844 Punkte Breite):

| Gegner | Bildschirmbreite |
|---|---|
| Span | **12,3 px** |
| Späher | 14,9 px |
| Gleiter | 16,7 px |
| Schleicher | 17,6 px |
| Infanterie | 21,1 px |
| Spalter | 22,9 px |
| Koloss | 25,5 px |
| Leerentitan | 29,9 px |

Zum Vergleich: die eigene Berührungsvorgabe des Projekts ist **44 px**. Der
größte Gegner ist zwei Drittel davon, der kleinste ein Viertel. Man kann sie
weder erkennen noch unterscheiden — auf `neue-gegner.png` ist eine ganze Welle
ein violetter Fleck.

### C5 Das Nutzerbild frisst das Spielbild

Über den Gegnern liegen gleichzeitig: Gesundheitsbalken (immer an, breiter als
der Gegner), ein cyanfarbener Bremsring **je Gegner**, aufsteigende Goldzahlen,
Reichweitenkreise. Bei vierzehn Gegnern sind das vierzehn Ringe und vierzehn
Balken auf 200 × 100 Bildpunkten.

### C6 Weitere Einzelbefunde

| # | Befund |
|---|---|
| C6.1 | Auswahlring ist ein **Kreis**, keine Bodenellipse — er steht senkrecht in einer liegenden Welt |
| C6.2 | Reichweitenringe überlagern sich zu einem Ringteppich |
| C6.3 | Kontaktschatten der Türme ist eine weiche Ellipse, der Schlagschatten ein harter Riss — zwei Schattensprachen |
| C6.4 | Kein Gegenlicht/Randlicht an irgendeiner Figur; alle Silhouetten laufen in den Boden |
| C6.5 | Acht Gegner in acht unabhängigen Bunttönen — keine Fraktion, keine Ordnung |
| C6.6 | Menü: sichtbare Pillarbox-Ränder links und rechts (16:9-Welt in 2,16:1-Fenster) |
| C6.7 | Weltkarte = drei Kugeln mit Schwung auf Sternenfeld; sagt nichts über die Welt |
| C6.8 | Turmknöpfe sind Textkästen ohne Bild — man erkennt den Turm nicht wieder |
| C6.9 | Der Weg dominiert 50 % der Fläche und ist überall gleich hell — er liest sich als Schaltplan |
| C6.10 | Kein Wetter, keine Tageszeit, keine Bewegung im Hintergrund außer Bodennebel |

---

## Teil D — Testbericht

*Wie ein Magazin ihn schreiben würde, mit der Prüfliste, die dazugehört.*

### Einstieg — 6/10
Einweisung an Handgriffen, nicht an Text — richtig gemacht. Aber: kein
Levelschloss, keine Reihenfolge, kein Ziel. Wer zum ersten Mal spielt, steht
vor drei gleichwertigen Karten und drei Graden und weiß nicht, wo er anfangen
soll. Und er sieht nicht, wo er bauen darf.

### Steuerung — 7/10
Kneifen, Schieben, Einrasten auf den nächsten erlaubten Platz, Begründung bei
Ablehnung: alles vorhanden und sauber. Abzug für: Bauplätze nur unter dem
Finger, Werteliste unlesbar (F3), Turm verschieben nur zwischen Wellen (richtig
entschieden, aber nirgends erklärt).

### Rückmeldung — 6/10
Ton für jede Handlung, Trefferstopp, Bildwackeln, Zahlen, Ringe. Zu viel davon
gleichzeitig, zu wenig Unterschied zwischen wichtig und beiläufig. Ein
Durchbruch am Kristall fühlt sich an wie ein Treffer.

### Balance — 5/10
Gemessen sauber (`npm run sim` läuft durch), aber flach: zwei von vier
Zweigentscheidungen ohne Wirkung, ein Grad unverlierbar, eine Karte ein Viertel
so lang wie die anderen.

### Umfang — 3/10
Drei Karten, vier Türme, acht Gegner, vier Fähigkeiten, 15 Wellen. Das ist ein
solider Prototyp. Ein fertiges Spiel des Genres bringt 15–25 Stufen, 8–12
Türme, 20+ Gegnerarten und Bosse mit eigenen Regeln mit.

### Wiederspielwert — 3/10
Endlosmodus vorhanden, Bestwert wird gespeichert, sonst nichts: keine
Sternziele, keine Herausforderungen, keine Freischaltungen, keine Bestenliste.

### Präsentation — 5/10
Schöne Untergründe und Türme, keine Szene daraus. Siehe Teil C.

### Technik — 9/10
20 Tore, 89 Gegenproben, eine autarke Datei, läuft offline, 1,4 MB, im
Zeichen- und Rechenbudget. Das ist außergewöhnlich solide.

### Barrierefreiheit — 4/10
Kein Farbenblindmodus (Gegner unterscheiden sich fast nur über Farbe), keine
Schriftgrößenwahl, keine Bedienung über Tastatur im Spiel, keine Untertitel für
Tonhinweise, kein Modus „weniger Effekte".

### Fazit
**Ein technisch bemerkenswert sauberer Prototyp mit einem ungelösten
Kernproblem: Er sieht aus wie eine Sammlung guter Teile und spielt sich wie
eine Rechenaufgabe ohne Entscheidungen.** Was fehlt, ist nicht Politur, sondern
Zusammenhang — im Bild wie im Spiel.

### Was ein Test außerdem prüft und hier fehlt

- [ ] Verhalten bei Unterbrechung (Anruf, App-Wechsel, Bildschirm aus)
- [ ] Verhalten bei Verbindungsverlust — geprüft, läuft offline
- [ ] Spielstand über App-Neustart hinweg — geprüft, funktioniert
- [ ] Spielstand über Versionswechsel hinweg — teilweise (Formatnummer 7)
- [ ] Was passiert bei 3× Tempo mit Ton und Effekten
- [ ] Ladezeit auf einem alten Gerät
- [ ] Akkuverbrauch
- [ ] Kein Ton auf stumm geschaltetem iPhone (iOS-Sonderfall)
- [ ] Erstmaliges Antippen ohne Nutzergeste → Tonsperre
- [ ] Doppeltippen, Dreifingertippen, versehentliches Kneifen im Gefecht
- [ ] Sehr lange Sitzung (Speicherwachstum, Zahlenüberlauf im Endlosmodus)

---

## Teil E — Abarbeitungsplan

Sechs Stapel. Jeder Stapel ist in sich abgeschlossen, jeder Punkt hat ein
Abnahmekriterium. Die Reihenfolge ist so gewählt, dass jeder Stapel den
nächsten trägt.

### Stapel 1 — Wahrheit herstellen (Technik)
*Alles, was heute nachweislich falsch ist. Ohne diesen Stapel misst jeder
weitere Schritt auf einem schiefen Grund.*

| Nr | Aufgabe | Fertig, wenn |
|---|---|---|
| 1.1 | Schild und Träger in den Spielstand (F1, F8) | Probe: geladener Stand hat dieselben Schildpunkte wie der laufende; Gegenprobe im Verzeichnis |
| 1.2 | Trefferstopp vereinheitlichen (F2) | ein Feld, gedeckelt, gesichert; Gegenprobe |
| 1.3 | Inspektor neu aufbauen (F3) | Turmwerte auf 844 × 390 sichtbar, im Browsertor gemessen |
| 1.4 | Karte 2 in Einklang bringen (F4, F5) | id, Name, Bild und Text sagen dasselbe; Kartentexte werden abgeleitet, nicht geschrieben |
| 1.5 | Platzbedarf je Turmsorte echt machen (F6) | vier verschiedene Werte, Wächter prüft sie gegen die Zeichengröße |
| 1.6 | Toter Turm-Zeichenweg raus (A4) | keine leere Vollbildleinwand mehr; Zeichenmessung belegt die Ersparnis |
| 1.7 | `topdown` und tote Felder raus (A6, F10) | Wächter meldet keine unbenutzten Felder mehr |

### Stapel 2 — Verstehen, was zu tun ist (Bedienung)
*Der Spieler soll ohne Erklärung wissen, wo er bauen kann, was kommt und was
gerade passiert.*

| Nr | Aufgabe | Fertig, wenn |
|---|---|---|
| 2.1 | Bauplätze dauerhaft zeigen, sobald eine Turmart gewählt ist (F7) | auf dem Telefon ohne liegenden Finger sichtbar; Browsertor prüft es |
| 2.2 | Wegvorschau: woher kommen sie, wohin laufen sie | beim ersten Betreten und auf Knopf; im Bildtor abgenommen |
| 2.3 | HUD neu ordnen | Gold/Kristall/Welle in einer Zeile, Wellenknopf mit aufklappbarer Vorschau; Berührungsflächen ≥ 44 px |
| 2.4 | „Als Nächstes" mit Gegnerbild, Zahl und Gefahrzeichen | erkennbar, ohne den Namen zu lesen |
| 2.5 | Turmknöpfe mit Turmbild statt Text | Wiedererkennung zwischen Knopf und Feld |
| 2.6 | Reichweite beim Halten eines Knopfes am Bauplatz zeigen | schon vorhanden — im Bildtor absichern |

### Stapel 3 — Tiefe ins Bild (Grafikfundament)
*Das ist der Stapel, der „plastischer und dreidimensionaler" beantwortet. Kein
Punkt darin braucht neues Bildmaterial.*

| Nr | Aufgabe | Fertig, wenn |
|---|---|---|
| **3.1** | **Eine Szenenliste mit Tiefensortierung** (A3, C1) | Gegner hinter einem Turm werden verdeckt; Messung: Anteil verdeckter Bildpunkte > 0 |
| 3.2 | Ein Schattensystem für alles, auch für Gegner (C2, C6.3) | jede Figur wirft denselben Schatten nach derselben Regel; Länge aus der Höhe |
| 3.3 | Bodenellipsen statt Kreise (C6.1, C6.2) | Auswahl, Reichweite, Bremsring liegen in der Ebene |
| 3.4 | Randlicht/Gegenlicht an jeder Figur (C6.4) | Silhouette trennt sich messbar vom Untergrund |
| 3.5 | Gegner vergrößern und ordnen (C4, C6.5) | kleinster Gegner ≥ 24 px auf 844 Punkten; Fraktionsfarbwelt statt acht Bunttönen |
| 3.6 | Gesundheitsbalken nur bei Schaden, schmaler, in der Figurfarbe (C5) | Wellenbild ohne Balkenteppich |
| 3.7 | Ein Kamerawinkel (C3) | alle Figuren auf denselben Winkel gebracht (Scherung/Stauchung), gemessen |

### Stapel 4 — Spielgefühl
*Entscheidungen, die etwas ändern.*

| Nr | Aufgabe | Fertig, wenn |
|---|---|---|
| **4.1** | **Welle rufen, während eine läuft** (B2) | Bonus steigt mit dem Risiko; Simulation zeigt einen Unterschied zwischen früh und spät |
| 4.2 | Zweige mit Folgen (B4) | Simulation: jeder Zweigwechsel ändert das Ergebnis um mehr als 4 Punkte |
| 4.3 | Grade neu eichen (B5) | Ruhig verlierbar, Erbarmungslos für jeden Stil schaffbar |
| 4.4 | Spiralhain verlängern oder ersetzen (B3) | Weglänge in derselben Größenordnung wie die anderen Karten |
| 4.5 | Gegner mit Verhalten (B6) | mindestens drei Arten, die eine Antwort erzwingen (Heiler, Gräber, Panzerbrecher) |
| 4.6 | Bosse mit Phasen | ein Boss, der sein Verhalten während des Kampfes ändert |

### Stapel 5 — Fortschritt und Umfang
| Nr | Aufgabe | Fertig, wenn |
|---|---|---|
| 5.1 | Levelschloss und Sternziele (B7) | Karte 2 erst nach Karte 1; je Karte drei benannte Ziele |
| 5.2 | Herausforderungen je Karte | „ohne Frostturm", „nur 6 Türme", „kein Kristallverlust" |
| 5.3 | Vierte und fünfte Karte | dieselbe Torkette, dieselben Werkzeuge |
| 5.4 | Endlos mit Bestenliste | Bestwert je Karte sichtbar auf der Weltkarte |
| 5.5 | Mehr Türme (Ziel: 6–8) | jeder mit einer Rolle, die keiner der anderen hat |

### Stapel 6 — Politur
| Nr | Aufgabe | Fertig, wenn |
|---|---|---|
| 6.1 | Weltkarte als gemalte Landkarte (C6.7) | kein Sternenfeld mehr |
| 6.2 | Pillarbox beseitigen (C6.6) | Menü füllt jedes Fenster |
| 6.3 | Ergebnisbildschirm mit Verlauf | Welle für Welle, wo es eng wurde |
| 6.4 | Ton: Grundklang und Wellenmusik | ohne Dateien, synthetisch wie der Rest |
| 6.5 | Barrierefreiheit | Gegnerform statt Farbe, Modus „weniger Effekte", größere Schrift |

---

## Anhang — Was gemessen wurde und wie

| Befund | Messstelle |
|---|---|
| Schildverlust | `GameState`, Welle 8 Spiralhain, Stand gesichert und geladen, 8 s simuliert |
| Inspektorhöhe | Chromium, `dist/index.html`, 844 × 390, `getBoundingClientRect()` |
| Gegnergröße | `radius × 2 × (844 / 1920)` |
| Weglängen | `lanePaths` Bogenlänge je Karte |
| Zweigwirkung | `npm run sim`, gemischtes Feld, ein Turmtyp umgestellt |
| Rechen- und Zeichenlast | `npm run bench`, `npm run bench-draw` — **in Node unter SwiftShader**, der JavaScript-Anteil überträgt, das Rastern nicht (Regel 12) |
| Bildbefunde | `bilder/welle15.png`, `neue-gegner.png`, `stufen.png` und eine im Browser gespielte Sitzung |
