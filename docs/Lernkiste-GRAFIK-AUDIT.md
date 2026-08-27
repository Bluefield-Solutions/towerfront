# Grafik-Audit zu K2

Ziel des Auftrags: **eine Oberfläche ohne Kompromisse.** Präzise Karten, bei
denen jede Ecke und jede Kante sauber mitgezeichnet ist, und eine Gestaltung,
die neben professionell gemachten Apps besteht.

Ergebnis: **21 Befunde.** Drei davon widersprechen K2 direkt — die
Datenquelle für die Karten ist zu grob gewählt, das Maß für die
Vereinfachung misst nicht das, worauf es ankommt, und ein Gebiet kann nicht
ein einzelner Pfad sein. Zehn weitere betreffen Dinge, die K2 gar nicht
angefasst hat: es gibt darin **kein Gestaltungssystem**, keine Typografie
jenseits der Leseschrift, keine Bewegung, keine Zustände und kein Tor, das
Aussehen prüft.

Das ist kein Vorwurf an K2 — dort ging es um Architektur und Prüfbarkeit.
Aber „extrem schön" war nirgends eine Anforderung, und deshalb steht auch
nirgends, wie man dahin kommt.

---

## 0. Der Kern in vier Sätzen

**Erstens:** Kartenqualität entsteht nicht beim Zeichnen, sondern beim
Backen. Wenn die Quelle zu grob ist oder falsch vereinfacht wird, rettet kein
Renderer das mehr.

**Zweitens:** Das derzeitige Gütemaß (2 % Flächenabweichung) ist blind für
genau das, was Sie meinen. Eine abgeschnittene Landspitze kostet 0,1 % Fläche
und 100 % Wiedererkennbarkeit.

**Drittens:** „Schön" ist kein Ergebnis von Sorgfalt beim Programmieren,
sondern von Entscheidungen, die vorher getroffen und aufgeschrieben werden —
Raster, Skalen, Farben, Bewegung. Ohne die entsteht ein Flickenteppich, auch
wenn jeder Bildschirm für sich in Ordnung ist.

**Viertens:** Und schön bleibt es nur, wenn Veränderung sichtbar wird.
Deshalb ist der wichtigste neue Vorschlag ein **visuelles Regressionstor**:
jeder Bildschirm wird bei jedem Lauf abfotografiert und Bildpunkt für
Bildpunkt gegen ein freigegebenes Vorbild verglichen.

---

## 1. Referenzabgleich

Nach der Arbeitsweise dieses Hauses: drei Vorbilder benennen, aufschreiben was
sie **tun**, Soll ableiten, Abstand messen. Ohne diesen Schritt kommt das Soll
aus mir, und dann wandert es mit meiner Leistung mit.

### R1 · Pok Pok (Playtime Studio)

Was es tut: Ein Kinderspiel, das einen Apple Design Award gewonnen hat.
**Es ist radikal ruhig.** Wenige Farben, viel Fläche, keine Umrandungen, keine
Verläufe, keine Comic-Schrift. Die Figuren sind aus einfachen geometrischen
Formen gebaut, und die ganze Wirkung entsteht aus zwei Dingen: einer sehr
genau abgestimmten Palette und einer Bewegung, die *Gewicht* hat — Dinge
fallen, federn nach, kommen zur Ruhe.

Ableitung: **Zurückhaltung ist der Unterschied zwischen hochwertig und
niedlich.** Kein Regenbogen, keine Sticker-Ästhetik, keine drei Schriften.

### R2 · Diercke Weltatlas

Was er tut: Der deutsche Schulatlas. **Er beweist, dass eine Karte gleichzeitig
präzise und ruhig sein kann.** Die Küstenlinien sind fein, aber nicht
zappelig — sie sind *generalisiert*, also von Hand vereinfacht nach dem, was
die Form ausmacht, nicht nach einer Zahl. Flächenfarben sind blass und
gleichmäßig hell, damit keine Region lauter ist als die andere. Grenzen sind
eine Linie, nicht zwei. Beschriftungen liegen nie über einer Grenze.

Ableitung: **Generalisieren ist eine gestalterische Entscheidung, kein
Schwellenwert.** Und: gleiche Helligkeit für alle Flächen.

### R3 · Duolingo

Was es tut: Die Belohnungschoreografie. Eine richtige Antwort ist kein Haken,
sondern ein **Ablauf**: Farbe läuft ein, Ton, Punktzahl zählt hoch, das
nächste kommt von selbst. Alles unter einer Sekunde, alles ohne dass man
warten muss.

Ableitung: **Der Belohnungsmoment ist ein eigenes Gestaltungsobjekt** und
muss so genau geplant werden wie ein Bildschirm. Gegenbeispiel, das Duolingo
auch liefert: die Oberfläche selbst ist laut. Das wollen wir nicht.

### Das abgeleitete Soll

| | Soll |
|---|---|
| Palette | höchstens **7 Flächenfarben + 1 Akzent + 1 Warnfarbe**, alle mit gleicher wahrgenommener Helligkeit |
| Umrisse | generalisiert nach Form, nicht nach Zahl; jede Ecke, die die Silhouette ausmacht, bleibt |
| Grenzen | **eine** Linie zwischen zwei Ländern, nie zwei |
| Bewegung | jeder Zustandswechsel hat eine benannte Dauer und Kurve; nichts springt |
| Belohnung | ein choreografierter Ablauf unter 900 ms, der den Lerninhalt wiederholt |
| Schrift | zwei Schnitte, nicht drei; die Leseschrift nur dort, wo das Kind liest |
| Zierrat | keiner. Kein Verlauf, kein Schlagschatten, kein Glanz |

---

## 2. Die Karten

### G1 · Die Datenquelle ist eine Stufe zu grob gewählt — schwerster Kartenbefund

K2 wählt **BKG VG2500** für die Bundesländer. Das ist der Maßstab
**1 : 2 500 000** — ein Übersichtsdatensatz. Auf einem iPad füllt Deutschland
rund 1 600 Bildpunkte Breite; das sind bei etwa 640 km Ost-West-Ausdehnung
grob **400 Meter je Bildpunkt**. VG2500 ist für Karten gemacht, auf denen
Deutschland zehn Zentimeter breit ist.

Die Folge sieht man genau an den Stellen, die Sie meinen: die Nordseeküste
Schleswig-Holsteins wird zum Bogen, die Halligen verschwinden, der Bodensee
wird zur Delle, die Elbe zwischen Niedersachsen und Sachsen-Anhalt verliert
ihre Schleifen.

**Richtig ist VG250** — Maßstab **1 : 250 000**, also zehnmal feiner,
**dieselbe Lizenz** (dl-de/by-2-0), ebenfalls kostenlos, als Shape und
GeoPackage beim BKG. Damit liegt die Quellgenauigkeit unterhalb dessen, was
ein Bildpunkt auf dem iPad auflösen kann — und erst dann ist die Karte
*quellseitig* nicht mehr der begrenzende Faktor.

Dasselbe für die Weltebene: K2 nimmt **Natural Earth 1:50m**. Für die sieben
Kontinentumrisse reicht das. Für die **Länder innerhalb eines Kontinents**,
die formatfüllend gezeigt werden, ist **1:10m** die richtige Stufe.

| Ebene | K2 | neu | Faktor |
|---|---|---|---|
| Kontinente | NE 1:50m | NE 1:50m *(unverändert)* | — |
| Länder | NE 1:50m | **NE 1:10m** | 5× |
| Bundesländer | BKG VG2500 | **BKG VG250** | 10× |

Das kostet Dateigröße. Wie das aufgelöst wird, steht in G6.

### G2 · Das Gütemaß misst nicht das, was Sie meinen

K2 begrenzt die Vereinfachung auf **2 % Flächenabweichung**. Das ist ein
gebräuchliches Maß und für diesen Zweck **das falsche**.

Die Fläche ist blind für Ränder. Eine Landspitze, die abgeschnitten wird —
Kap Hoorn, die Spitze Jütlands, der Zipfel von Kaliningrad, die Halbinsel
Halbinsel Fischland-Darß — kostet einen Bruchteil eines Prozents Fläche und
ist genau das, woran ein Kind die Form erkennt. Umgekehrt kann eine Karte
2 % Flächenabweichung haben und trotzdem tadellos aussehen, wenn sie
gleichmäßig verteilt ist.

**Das richtige Maß ist die Hausdorff-Distanz**, also die **größte** Abweichung
irgendeines Punktes vom wahren Umriss — und sie wird nicht in Metern gemessen,
sondern **in Bildpunkten bei der größten Darstellung, in der die Form je
vorkommt**. Das ist die einzige Zahl, die etwas über das Aussehen sagt.

> **Soll: Hausdorff-Abstand ≤ 0,75 Gerätebildpunkte** bei der größten
> Darstellungsgröße der jeweiligen Ebene.

Unter einem Bildpunkt kann ein Auge den Unterschied nicht sehen — darüber
sofort. Damit ist „ohne Kompromisse" eine Zahl geworden statt einer Absicht.

**Zusätzlich ein zweites Kriterium**, weil Hausdorff eine einzelne, sehr
schmale Spitze übersieht, wenn sie kürzer als die Toleranz ist: eine
**Prägnanzpunkt-Prüfung**. Punkte mit hoher Krümmung — die Ecken, die die
Silhouette ausmachen — werden vor der Vereinfachung markiert und müssen danach
noch da sein.

### G3 · Pro Gebiet vereinfachen zerreißt die gemeinsamen Grenzen

K2 sagt „mapshaper: vereinfachen" und lässt offen, **worauf**. Wenn jedes
Land für sich vereinfacht wird, wird die gemeinsame Grenze zwischen
Deutschland und Polen zweimal vereinfacht — einmal als Teil Deutschlands,
einmal als Teil Polens — und die beiden Ergebnisse sind **nicht identisch**.
Das Resultat: sichtbare Lücken und Überlappungen entlang jeder Landgrenze.
Es ist der häufigste Grund, warum selbstgemachte Vektorkarten billig aussehen.

**Richtig: zuerst Topologie bilden, dann vereinfachen.** mapshaper zerlegt die
Flächen in gemeinsam genutzte Bögen; Grenzen, die zwei Nachbarn teilen,
werden dann **identisch** vereinfacht, und es entstehen weder Lücken noch
Überlappungen. Dazu:

```
mapshaper alle-ebenen.shp -combine-files      # eine Topologie über alles
          -clean gap-fill-area=<klein>        # Restlücken und Splitter
          -simplify weighted <ziel> keep-shapes
          -o format=topojson quantization=...
```

`-combine-files` ist entscheidend: nur wenn alle Ebenen **vor** dem Aufbau der
Topologie zusammengeführt werden, bleiben Punkte gemeinsam, die auch
gemeinsam sein sollen. `keep-shapes` verhindert, dass kleine Flächen ganz
verschwinden.

### G4 · Ein Gebiet ist nicht ein Pfad — und in Deutschland fällt das sofort auf

K2 hat `pfad: string`, das Tor `geo` verlangt „geschlossen, Fläche > 0", der
Anker wird per Punkt-in-Polygon geprüft. Alle drei Annahmen brechen an der
Wirklichkeit:

**Mehrteilige Gebiete.** Italien ist Festland **plus Sizilien plus Sardinien**
plus ein paar Dutzend Inseln. Dänemark ist Jütland plus Fünen plus Seeland.
Indonesien und die Philippinen sind fast nur Inseln. Griechenland ohne seine
Inseln ist nicht Griechenland.

**Und in Deutschland, ohne dass man ins Ausland schauen müsste:**

| Fall | Was passiert |
|---|---|
| **Bremen** | besteht aus **zwei getrennten Teilen** — Bremen und Bremerhaven, rund 60 km auseinander |
| **Brandenburg** | hat ein **Loch**: Berlin liegt vollständig darin |
| **Niedersachsen** | hat ein **Loch**: die Stadt Bremen liegt vollständig darin |
| **Schleswig-Holstein** | Fehmarn, Sylt, Föhr, Amrum, die Halligen — ohne sie ist die Silhouette falsch |

Ohne Lochunterstützung liegt Berlins Trefferfläche **innerhalb** der Füllung
Brandenburgs. Das Kind tippt auf Berlin und trifft Brandenburg. Ohne
Mehrteiligkeit hat Bremen entweder Bremerhaven nicht oder einen Anker im
Nichts zwischen beiden Teilen.

**Richtig:**

```ts
pfad: string;        // MEHRERE Unterpfade, "M…Z M…Z M…Z"
fuellregel: 'evenodd';
teile: number;       // erwartete Anzahl getrennter Teile
loecher: string[];   // erwartete Löcher, z.B. ["de-be"] bei Brandenburg
```

Ein einzelnes `d`-Attribut kann das alles ausdrücken. Aber die **Tore müssen
es wissen**: „Fläche > 0" wird zu „Außenring positiv orientiert, jedes Loch
negativ"; Punkt-in-Polygon wird zu Punkt-in-Polygon-**mit-Löchern**; und der
Anker gehört in den **größten** Teil (Bremen-Stadt, nicht Bremerhaven).

### G5 · Grenzen werden zweimal gezeichnet, und das sieht man

Wenn jedes Bundesland ein Pfad mit `stroke` ist, wird jede Binnengrenze
**zweimal** gezeichnet — einmal von jedem Nachbarn. Bei voller Deckkraft
fällt das kaum auf; bei jeder Transparenz wird die Linie doppelt dunkel, und
durch die Kantenglättung entstehen an den Rändern feine helle oder dunkle
Nähte, die je nach Zoomstufe wandern.

**Richtig ist eine Trennung in zwei Ebenen:**

```
<g class="fuellung">   … 16 Pfade, NUR fill, kein stroke …
<g class="grenzen">    … die gemeinsamen Bögen, EINMAL, als Linien …
<g class="kueste">     … Außenkante, eigene Strichstärke …
```

Die Grenzbögen fallen bei der Topologiebildung (G3) ohnehin an — sie sind
genau die Arcs. Nebeneffekt: Küstenlinie und Binnengrenze können
unterschiedlich stark sein, wie in jedem guten Atlas.

**Und ein zweiter, feinerer Punkt:** Selbst reine Füllungen ohne Strich
erzeugen zwischen zwei Nachbarn eine haarfeine Lücke, weil jeder Pfad einzeln
gegen den Hintergrund kantengeglättet wird. Der Trick dagegen ist, unter die
Füllebene eine **einzige Fläche in der Grundfarbe** zu legen — dann ist die
Lücke nicht der Hintergrund, sondern eine unauffällige Trennfarbe.

### G6 · Auflösungsstufen — und damit die Auflösung des Budgetkonflikts

G1 und G2 verlangen mehr Punkte, K2 begrenzt die Geometrie auf 150 KB. Beides
zusammen geht nicht. Die Auflösung ist nicht ein Kompromiss, sondern eine
Trennung:

> **Eine Form braucht nur so viele Punkte, wie sie in der Ansicht, in der sie
> gerade gezeigt wird, auflösen kann.**

Deutschland auf der Weltkarte ist 40 Bildpunkte breit — dort sind zwölf
Punkte genug. Deutschland formatfüllend ist 1 600 Bildpunkte breit — dort
braucht es tausende.

**Drei Stufen je Form**, beim Backen erzeugt, jede gegen ihre eigene
Hausdorff-Grenze:

| Stufe | Für | Ziel |
|---|---|---|
| **grob** | Übersicht, Vorschau, Aufkleber | ≤ 0,75 px bei 200 px Breite |
| **mittel** | Kontinent mit Ländern | ≤ 0,75 px bei 800 px Breite |
| **fein** | formatfüllend, Deutschland | ≤ 0,75 px bei 2 000 px Breite |

**Nur die grobe Stufe liegt im Startbündel.** Die feineren sind eigene
Dateien, werden beim Öffnen der Ebene geladen und danach vom Service Worker
dauerhaft vorgehalten — beim zweiten Start ist alles da, auch ohne Netz. Das
Startbudget bleibt klein, und die Karte, die das Kind ansieht, ist die feine.

Der Wechsel muss unsichtbar sein: die grobe Stufe wird sofort gezeichnet, die
feine blendet in 200 ms darüber. Kein Aufblitzen, kein Sprung.

### G7 · Die Projektion braucht Standardparallelen, sonst verzerrt sie

K2 sagt „geoConicEqualArea, auf den Kontinent zentriert". Eine Kegelprojektion
ohne gesetzte **Standardparallelen** ist aber nur an einer einzigen Breite
verzerrungsfrei. Afrika bekommt dann oben und unten unterschiedliche
Streckung — und Kinder lernen die Form falsch.

**Regel:** die beiden Standardparallelen bei ⅙ und ⅚ der Breitenausdehnung
des jeweiligen Kontinents (Albers-Faustregel). Für Deutschland ist der
amtliche Wert bekannt: **Lambert-Kegel, Standardparallelen 48°40′ und
53°40′** — das ist die Projektion, in der Deutschland in jedem Schulatlas und
jeder amtlichen Übersichtskarte steht. Wer sie nimmt, bekommt eine Form, die
Erwachsene wiedererkennen, ohne zu wissen warum.

Zusätzlich: Afrika und Südamerika liegen über dem Äquator hinweg; dort ist
eine Kegelprojektion generell schlecht. Für diese beiden ist **Lambert
azimutal flächentreu**, auf den Flächenschwerpunkt zentriert, die bessere
Wahl.

### G8 · Strichstärken auf einem 3×-Bildschirm

Drei Kleinigkeiten, die zusammen den Unterschied zwischen „scharf" und
„matschig" machen:

- **`vector-effect: non-scaling-stroke`** auf allen Grenzlinien. Ohne das
  skaliert die Strichstärke mit dem Zoom mit: Deutschland herangeholt bekommt
  fette Grenzen, herausgezoomt unsichtbare.
- **Mindeststärke 0,75 CSS-Punkte.** Eine 0,5-Punkte-Linie ist auf einem
  2×-Gerät ein Gerätebildpunkt und auf einem 1×-Gerät ein halber — sie wird
  grau statt schwarz und flackert beim Zoomen.
- **`shape-rendering`** bleibt auf `auto` (also kantengeglättet).
  `crispEdges` klingt richtig und ist hier falsch: es schaltet die
  Kantenglättung ab und macht aus jeder schrägen Küste eine Treppe.

### G9 · Welche Inseln bleiben — das braucht eine Regel, nicht einen Schwellenwert

`keep-shapes` verhindert, dass Flächen verschwinden, aber nicht, dass die
Karte von 3 000 bedeutungslosen Felsen zugestellt wird. Eine reine
Mindestfläche ist auch falsch: Helgoland ist winzig und gehört auf eine
deutsche Karte, ein namenloses Riff vor Norwegen nicht.

**Zweistufige Regel:**

1. Alle Inseln oberhalb einer Fläche, die bei der feinsten Stufe mindestens
   **4 × 4 Bildpunkte** ergibt.
2. **Plus** eine von Hand gepflegte Liste namentlich behaltener Inseln:
   Sizilien, Sardinien, Kreta, Korsika, Mallorca, Island, Sylt, Fehmarn,
   Rügen, Usedom, Helgoland, Föhr, Amrum.

Die zweite Liste ist der Punkt, an dem eine Zahl nicht mehr reicht und jemand
entscheiden muss. Genau so macht es ein Atlas.

### G10 · Wo steht der Name, wenn er nicht hineinpasst

Ungelöst in K2. „Mecklenburg-Vorpommern" passt in Mecklenburg-Vorpommern;
„Bremen" passt nicht in Bremen, und „Baden-Württemberg" passt nicht in das
Saarland-große Rechteck daneben.

Die Entscheidung lässt sich **beim Backen** treffen, weil dort schon der Pol
der Unzugänglichkeit gerechnet wird — der Punkt im Gebiet mit dem größten
Abstand zum Rand. Sein **Abstand** ist zugleich der Radius des größten
Kreises, der ins Gebiet passt:

```
Radius × 2  ≥  Textbreite   →  Name liegt IM Gebiet
sonst                       →  Name liegt AUSSEN, mit Fahne:
                               Haarlinie vom Anker nach außen,
                               Punkt am Anker, Name am Linienende
```

Die Fahnen werden **beim Backen** so verteilt, dass sie sich nicht kreuzen und
nicht überlappen — auf einer festen Kartengröße, also einmal, deterministisch,
prüfbar. Kein Layoutalgorithmus zur Laufzeit.

---

## 3. Die Oberfläche

Hier fehlt in K2 nicht ein Detail, sondern die ganze Ebene.

### G11 · Es gibt kein Gestaltungssystem

K2 nennt zwei Zahlen (44 Punkte Trefferfläche, 20 Punkte Schriftgröße) und
sonst nichts. Ohne festgelegte Skalen entsteht bei jedem Bildschirm ein neuer
Abstand, ein neuer Radius, ein neuer Grauton — und das Ergebnis wirkt
unruhig, ohne dass man sagen könnte, woran es liegt.

**Was festzulegen ist, einmal, als Datei:**

```
raster       4 pt. ALLE Abstände sind Vielfache:
             4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96
radien       8 (klein) · 16 (Karten) · 24 (Flächen) · voll (Knöpfe)
schrift      Grundgröße 20, Verhältnis 1,25:
             16 (nur Elternbereich) · 20 · 25 · 31 · 39 · 49 · 61
strich       0,75 · 1,5 · 3 (Küste)
tiefe        3 Stufen, als versetzte Fläche (G15), nicht als Filter
dauer        120 (Tippantwort) · 200 (Zustand) · 320 (Bildschirm)
             · 500 (Belohnung)
kurve        standard  cubic-bezier(.2, 0, 0, 1)
             feder     linear(…)  — siehe G14
```

Und die Regel, die das durchsetzt: **In keiner Komponente steht je ein
Zahlenwert für Farbe, Abstand, Radius oder Dauer.** Alles kommt aus den
Merkmalen. Ein Tor prüft das (G20).

### G12 · Andika ist die falsche Schrift für die Oberfläche

K2 setzt **alles** in Andika. Andika ist hervorragend für das, wofür sie
gemacht ist: einzelne Wörter, die ein Leseanfänger entziffert. Als Schrift für
Knöpfe, Überschriften, den Elternbereich und die Fortschrittsanzeige ist sie
schwach — sie hat wenige Schnitte, ein weites Bild und wenig Charakter.
Eine App, die durchgehend in einer Lernschrift gesetzt ist, sieht nach
Arbeitsblatt aus, nicht nach Produkt.

**Zwei Schriften, klar getrennte Aufgaben:**

| Wo | Schrift | Warum |
|---|---|---|
| Wörter, die das Kind **liest oder lernt** — Etiketten, Namen, Auflösungen | **Andika** | einstöckiges a und g, genau die Formen aus der 1. Klasse |
| alles andere — Knöpfe, Überschriften, Zahlen, Elternbereich | **eine gut gezeichnete Grotesk** | Charakter, mehrere Schnitte, gute Ziffern |

Für die zweite ist mein Vorschlag **Plus Jakarta Sans** (offene Lizenz, sehr
sauber gezeichnet, vollständige deutsche Zeichen, echte Kapitälchenwirkung im
Halbfetten). Alternative mit mehr Wärme: **Nunito** — verbreiteter in
Kinder-Apps und dadurch etwas gewöhnlicher.

**Das ist eine Entscheidung, die man ansehen muss, nicht lesen.** Sie gehört
in den Gestaltungsmeilenstein (Kapitel 6), mit beiden Varianten nebeneinander
am echten Bildschirm.

Beide Schriften werden **mitgeliefert und auf die gebrauchten Zeichen
beschnitten** — deutsche Buchstaben, Ziffern, eine Handvoll Satzzeichen. Das
sind je Schnitt etwa 15–25 KB statt 120 KB.

### G13 · Farben von Hand mischen führt zu einer Karte, die schreit

K2 fordert sieben unterscheidbare Kontinentfarben und vier Bundeslandfarben.
Wer die in RGB oder HSL mischt, bekommt Farben mit **unterschiedlicher
wahrgenommener Helligkeit** — ein reines Gelb wirkt viel heller als ein
gleich gesättigtes Blau. Auf einer Karte heißt das: eine Region springt einem
entgegen, die anderen treten zurück, und das Kind hält die lauteste für die
wichtigste.

**Richtig ist OKLCH.** Der Farbraum ist so gebaut, dass die Helligkeit `L`
tatsächlich der wahrgenommenen entspricht. Damit lässt sich eine Palette
**rechnen** statt mischen:

```
Flächen:  L = 0.88   C = 0.055   H = 25 · 75 · 130 · 175 · 230 · 285 · 330
          → sieben Farben, exakt gleich hell, exakt gleich bunt
Auswahl:  dieselbe Farbe mit C = 0.12          (kräftiger, nicht heller)
Richtig:  dieselbe Farbe mit L = 0.72, C = 0.15
Text:     L = 0.25 — auf allen sieben identisch lesbar, weil L überall gleich
```

Der letzte Punkt ist der eigentliche Gewinn: **weil alle Flächen dieselbe
Helligkeit haben, ist derselbe Textton auf allen sieben lesbar.** Das muss
nicht siebenmal einzeln geprüft werden.

OKLCH ist in Safari seit 15.4 verfügbar und gilt als allgemein verfügbar. Die
Werte werden trotzdem beim Bauen zusätzlich als sRGB-Rückfall ausgegeben —
das kostet nichts.

Die Vierfärbung der Bundesländer (K2, Kapitel 5.6) wird damit ebenfalls besser:
vier Farbtöne aus demselben Ring, gleiche Helligkeit, kein Nachbarpaar gleich.

### G14 · Bewegung ist nicht spezifiziert — und dort wird „hochwertig" entschieden

Das ist der Befund mit der größten Wirkung auf den Eindruck. Eine App fühlt
sich teuer an, wenn Dinge Gewicht haben; sie fühlt sich billig an, wenn Dinge
springen.

**Fünf Momente, jeder mit Dauer, Kurve und Zweck:**

| Moment | Dauer | Was passiert |
|---|---|---|
| **Aufnehmen** | 120 ms | Etikett wächst auf 1,06; die Schattenfläche darunter rutscht von 2 auf 6 Punkt Versatz. Es *hebt ab*. |
| **Ziehen** | — | 1 : 1 am Finger, **kein** Nachlauf. Kinder erwarten das Etikett unter dem Finger, nicht dahinter. |
| **Einrasten, richtig** | 500 ms | Federkurve ins Ziel. Gleichzeitig **zeichnet sich der Umriss des Gebiets in 400 ms selbst nach**, dann läuft die Füllfarbe vom Ablegepunkt aus ein. |
| **Zurückkehren, falsch** | 320 ms | Bogen zurück auf den Platz. Kein Ruck, kein Rot, kein Rütteln. |
| **Bildschirmwechsel** | 320 ms | Gemeinsame Elemente bleiben stehen und wandern, der Rest blendet. |

Der dritte Punkt ist der wichtigste und zugleich fast umsonst zu haben: Das
Nachzeichnen des Umrisses ist eine Animation von `stroke-dashoffset` auf einem
Pfad, den es ohnehin gibt. **Der Belohnungsmoment wiederholt den Lerninhalt** —
das Kind sieht die Form, die es gerade benannt hat, noch einmal entstehen.
Das ist genau das, was R3 richtig macht, ohne dessen Lautstärke.

**Technisch, drei Regeln:**

- Animiert werden **nur `transform` und `opacity`** (plus `stroke-dashoffset`,
  das ebenfalls nicht das Layout anfasst). Nie `width`, `top`, `margin`.
- Die Federkurve kommt aus **CSS `linear()`** — damit lässt sich ein echtes
  Federverhalten ohne eine Zeile JavaScript beschreiben. Verfügbar ab
  **Safari 17.2**; darunter greift ein `cubic-bezier`-Rückfall, der nur etwas
  weniger schwingt. Kein Bruch, nur weniger Charme.
- **`prefers-reduced-motion`** schaltet alle Bewegung auf 1 ms und ersetzt sie
  durch eine Überblendung. Die Belohnung bleibt, sie federt nur nicht.

### G15 · Tiefe ist verboten, aber es steht kein Ersatz da

K2 untersagt `filter: drop-shadow` auf Kartenpfaden — richtig, das kostet auf
einem iPad zweistellige Millisekunden je Bild. Es sagt aber nicht, wie
stattdessen Tiefe entsteht, und flache Flächen ohne jede Staffelung sehen
unfertig aus.

**Ersatz: die versetzte Fläche.** Derselbe Pfad, zwei bis sechs Punkte nach
unten versetzt, in einer dunkleren Abstufung derselben Farbe, dahinter
gezeichnet. Kein Filter, keine Unschärfe, kein Rechenaufwand — und beim
Aufnehmen eines Etiketts wird der Versatz animiert, was den Eindruck von
Anheben erzeugt.

Für Flächen mit rechteckigem Umriss (Knöpfe, Karten) reicht ein einzelner,
sehr weicher `box-shadow`; der ist billig, weil das Element rechteckig ist.
Verboten bleibt der Filter auf komplexen Pfaden.

### G16 · Zwischenzustände fehlen vollständig

Eine hochwertige App zeigt nie eine leere Fläche und nie einen Sprung. In K2
gibt es keinen einzigen Satz dazu. Zu spezifizieren:

- **Erster Aufbau:** Der Umriss wird als Haarlinie gezeichnet, bevor die
  Füllung da ist — der Bildschirm ist nie leer, und es sieht nach Absicht aus.
- **Stufenwechsel (G6):** grob sofort, fein blendet in 200 ms darüber.
- **Sprachaufnahme läuft:** ein ruhiger, atmender Ring um den Mikrofonknopf,
  keine zappelnde Pegelanzeige.
- **Erkennung rechnet:** höchstens 2,5 s (K2, Kapitel 8) — in dieser Zeit
  braucht es eine Anzeige, die nicht nach Fehler aussieht.
- **Kein Netz:** ein ruhiger Streifen, kein Warnschild. Das Spiel läuft ja.
- **Fehler:** gibt es für das Kind nicht. Alles, was schiefgeht, wird zu
  „nochmal" oder zu einem Rückfall (K2, Stufe C).

### G17 · Emoji sind keine Symbole

Nirgends ausgeschlossen in K2, und die naheliegende Abkürzung. Emoji sehen
auf jedem Gerät anders aus, folgen keiner Strichstärke, lassen sich nicht
einfärben und ziehen jede Gestaltung ins Beliebige.

**Ein eigener Symbolsatz**, auf einem 24er Raster gezeichnet, eine
Strichstärke (1,5), gerundete Enden, als Inline-SVG. Gebraucht werden etwa
fünfzehn: zurück, Ton an/aus, Mikrofon, Tastatur, Stern, Buch, Schloss,
Haken, Kreuz, Pfeil, Zahnrad, Person, Karte, Frage, Teilen. Das ist ein
halber Tag Arbeit und der Unterschied zwischen Produkt und Bastelei.

### G18 · Dunkelmodus — eine Entscheidung, keine Auslassung

K2 sagt dazu nichts. Karten vertragen eine naive Umkehrung schlecht: aus
hellen Landflächen werden dunkle Löcher, die Beschriftung verliert ihren
Halt, und die sorgfältig gleich hellen Flächen aus G13 stimmen nicht mehr.

**Vorschlag: ein einziges, sehr sorgfältig gemachtes helles Thema**, plus
einen **„Abendmodus", der die Gesamthelligkeit senkt** (in OKLCH ist das ein
Griff: alle `L` um einen festen Betrag herunter), statt die Farben
umzukehren. Das ist ehrlicher als ein schlechter Dunkelmodus und für ein Kind,
das abends spielt, das eigentlich Gewünschte.

### G19 · App-Symbol und Startbild sind kein Nebenprodukt

K2 behandelt sie als Werkzeugaufgabe („`npm run appsymbol`"). Das Symbol ist
aber das **erste**, was von der App zu sehen ist, und auf einem
Startbildschirm steht es neben Symbolen, die von Gestaltungsabteilungen
gemacht wurden.

Es wird von Hand entworfen, nicht generiert: eine einzelne, sofort
erkennbare Form auf einer ruhigen Fläche — kein Text, kein Verlauf, kein
Schlagschatten (iOS setzt seine eigene Maske darüber). Das Startbild zeigt
dieselbe Form auf demselben Grund, damit der Übergang vom Tippen zum Start
nahtlos wirkt.

---

## 4. Wie man Schönheit prüfbar macht

Kein Tor kann sagen, ob etwas schön ist. Aber **jedes Tor kann sagen, ob sich
etwas verändert hat** — und das ist bei Gestaltung fast dasselbe wert, weil
Verfall dort schleichend passiert.

### G20 · Es fehlt das visuelle Regressionstor — der wichtigste neue Vorschlag

**Was es tut:** Bei jedem Lauf werden alle Bildschirme und alle Karten in
festen Größen aufgenommen und **Bildpunkt für Bildpunkt** gegen freigegebene
Vorbilder verglichen. Jede unbeabsichtigte Veränderung bricht die Kette.

Damit das funktioniert, muss die Aufnahme **deterministisch** sein:

```
Zufallskeim gesetzt · Bewegung aus (prefers-reduced-motion)
Schriften vollständig geladen (document.fonts.ready abwarten)
feste Gerätepunktdichte · feste Fenstergrößen
Datum eingefroren · Fortschrittsstand fest vorgegeben
```

Vorbilder liegen im Repository. Wer etwas absichtlich ändert, erneuert sie
im selben Commit — dann steht die Veränderung **im Diff und ist zu sehen**.
Das ist der Punkt: Gestaltungsänderungen werden überprüfbar wie Code.

*Ehrlich dazu, in der Linie von Befund L4:* Die Vorbilder entstehen in
Chromium. Das Tor findet **Veränderungen**, nicht **iOS-Richtigkeit**.

### Die neuen und geänderten Tore im Überblick

| Tor | Was es prüft | neu? |
|---|---|---|
| `ansicht` | Bildvergleich aller Bildschirme und Karten gegen Vorbilder | **neu** |
| `geo` | **Hausdorff ≤ 0,75 px** je Stufe statt 2 % Fläche; Prägnanzpunkte erhalten | geändert |
| `topologie` | gemeinsame Grenzen identisch, keine Lücken, keine Selbstschnitte, Umlaufsinn, **erwartete Löcher und Teile vorhanden** (Berlin in Brandenburg, Bremen zweiteilig) | **neu** |
| `marken` | kein Farb-, Abstands-, Radius- oder Dauerwert außerhalb der Merkmalsdatei; keine Emoji in Oberflächentexten; kein `filter` auf Kartenpfaden; keine Animation auf Layouteigenschaften | **neu** |
| `lesbarkeit` | Kontrast **am gerenderten Bild** gemessen, nicht an den Merkmalen; zusätzlich Deuteranopie-Simulation | geändert |
| `budget` | getrennt nach Startbündel und nachladbaren Stufen | geändert |
| `browser` | zusätzlich Bilddauern beim Ziehen, 95. Perzentil | geändert |

### Was weiterhin kein Tor kann

Ob die Palette angenehm ist. Ob die Federkurve sich richtig anfühlt. Ob das
Symbol auf dem Startbildschirm neben den anderen besteht. Ob Fiona den
Belohnungsmoment schön findet.

Dafür bleibt: hinsetzen, ansehen, und die vier festgelegten **Prüfformen**
bei jeder Geometrieänderung von Hand anschauen —

> **Norwegen** (Fjorde) · **Griechenland** (Inseln) · **Chile** (Südspitze) ·
> **Dänemark** (Jütland und Inseln) · **Italien** (Stiefel und Sizilien) ·
> **Schleswig-Holstein** (Wattenmeer, Fehmarn, Sylt) · **Brandenburg** (Loch
> Berlin) · **Bremen** (zwei Teile)

Diese acht sind der Härtetest. Wenn sie stimmen, stimmt der Rest.

### G21 · Es fehlt der Schritt, an dem Gestaltung *entsteht*

In K2 geht es von der Kartenpipeline (M2) direkt in gebaute Bildschirme (M3).
Es gibt keinen Meilenstein, in dem etwas **entworfen** wird. Gestaltung, die
beim Programmieren nebenbei entsteht, wird nie besser als das, was gerade
funktioniert hat.

Vorschlag steht in Kapitel 6.

---

## 5. Was das kostet

Die höhere Auflösung ist nicht umsonst, und „ohne Kompromisse" heißt hier
nicht „ohne Folgen". Ehrlich aufgeschrieben:

| | K2 | neu |
|---|---|---|
| Startbündel, gzip | < 400 KB | **< 400 KB** *(unverändert)* |
| davon Geometrie | < 150 KB | < 90 KB (nur grobe Stufe) |
| davon Schriften | < 45 KB | < 60 KB (zwei Schnitte, beschnitten) |
| Nachladbar je Ebene | — | < 250 KB |
| Geometrie gesamt | 150 KB | **≈ 600–900 KB**, nach dem ersten Start dauerhaft vorgehalten |
| Erstes Bild, kalt | < 1,5 s | **< 1,5 s** *(unverändert — die grobe Stufe reicht dafür)* |
| Ebene erstmalig öffnen, mit Netz | — | < 800 ms bis zur feinen Stufe |
| Ebene öffnen, danach | — | < 100 ms |

**Die Zahlen für die Geometrie sind geschätzt, nicht gemessen.** Sie hängen
davon ab, wie viele Punkte VG250 nach der Topologievereinfachung tatsächlich
behält. Der erste Lauf der Pipeline in M2 liefert die echten Werte; wenn sie
deutlich darüber liegen, ist die Antwort eine vierte, gröbere Stufe — nicht
eine niedrigere Genauigkeit.

**Der einzige echte Kompromiss, der bleibt:** Beim allerersten Öffnen einer
Ebene wird kurz nachgeladen. Danach nie wieder. Das ist der Preis dafür,
dass die Karte scharf ist, und er ist es wert.

---

## 6. Was sich am Konzept ändert

Zusammengefasst, damit K3 nichts vergisst:

**Kapitel 2 (Technikwahl)** — zweite Schrift; `mapshaper` arbeitet auf
TopoJSON mit Topologie; keine neue Laufzeitabhängigkeit.

**Kapitel 3 (Architektur)** — `Gebiet` bekommt `fuellregel`, `teile`,
`loecher`; `pfad` wird mehrteilig; drei Auflösungsstufen je Form; neues
Verzeichnis `src/marken/` für das Gestaltungssystem.

**Kapitel 5 (Karten)** — VG250 statt VG2500, NE 1:10m für Länder;
Hausdorff statt Fläche; Topologie vor Vereinfachung; getrennte Füll-, Grenz-
und Küstenebene; Auflösungsstufen; Standardparallelen; Inselregel;
Beschriftungsplatzierung beim Backen.

**Kapitel 8 (Leistung)** — neues Budget nach Kapitel 5 dieses Audits.

**Kapitel 10 (Barrierefreiheit)** — Kontrast am gerenderten Bild;
OKLCH-Palette mit gleicher Helligkeit; Abendmodus statt Dunkelmodus.

**Kapitel 11 (Torkette)** — drei neue Tore (`ansicht`, `topologie`,
`marken`), drei geänderte. Die Kette wächst von 19 auf **22** Schritte.

**Kapitel 15 (Meilensteine)** — ein neuer Meilenstein:

### MG · Gestaltung — zwischen M2 und M3

Er kommt **nach** der Kartenpipeline, weil man ein Kartenbild nicht entwerfen
kann, bevor die echten Umrisse da sind, und **vor** den gebauten
Bildschirmen, weil sonst das Gebaute die Gestaltung bestimmt statt umgekehrt.

Inhalt: Merkmalsdatei (Raster, Skalen, Farben, Bewegung) · Schriftentscheidung
am Bildschirm · Symbolsatz · **drei Bildschirme als statische Entwürfe** —
Kontinentaufgabe, Deutschland mit 16 Ländern, Belohnungsmoment · App-Symbol
und Startbild · die ersten Vorbilder für das Tor `ansicht`.

**Abnahme:**
- Die drei Entwürfe liegen als Bilder nebeneinander und sind **angesehen** —
  auf dem iPad, nicht auf dem Schreibtisch.
- Die **acht Prüfformen** sind einzeln angesehen, bei feinster Stufe.
- Die sieben Flächenfarben haben gemessen **dieselbe Helligkeit** (±0,01 in
  OKLCH-L), und derselbe Textton ist auf allen sieben lesbar.
- Der Belohnungsmoment läuft als Vorführung: Umriss zeichnet sich nach,
  Farbe läuft ein — unter 900 ms, auf dem Gerät.
- Danach steht das Tor `ansicht` mit seinen ersten Vorbildern.

*Und die ehrliche Bedingung:* Wenn ein Entwurf beim Ansehen nicht überzeugt,
wird er verworfen und neu gemacht — nicht verbessert. Das ist der Meilenstein,
an dem das erlaubt ist, und der einzige.

---

## 7. Reihenfolge

Zwei Befunde müssen **vor** M2 entschieden sein, weil sie die Pipeline
bestimmen und ein zweiter Durchlauf teuer ist:

1. **G1** — VG250 und NE 1:10m beschaffen. Beides kostenlos, beides
   Download.
2. **G6** — die drei Auflösungsstufen, weil sie die Struktur der erzeugten
   Dateien festlegen.

Alles Übrige der Kartenbefunde (G2–G5, G7–G10) ist Arbeit **in** M2.
Alles zur Oberfläche (G11–G19) ist MG. Die Tore (G20) entstehen mit dem,
was sie prüfen.
