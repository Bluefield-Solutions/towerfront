# Towerfront — Konzept für ein hochwertiges Spiel

*Version 1.0 · 08.08.2026 · nach 34 Versionen, geschrieben nach Recherche zu
Kingdom Rush, Bloons TD 6 und der Frage nach dem richtigen Unterbau*

> **ACHTUNG — in drei Punkten überholt.** Dies ist der Plan von v34, nicht die
> Beschreibung des heutigen Spiels. Er ist seither ausgeführt worden, und der
> Bruch, den Abschnitt 8 als Risiko beschreibt, hat stattgefunden.
>
> 1. Das Kachelraster in Abschnitt 0 und 8 gibt es seit v36 nicht mehr. Wege
>    sind Catmull-Rom-Kurven, gebaut wird auf freien Weltpositionen.
> 2. Das Feldverhältnis ist nicht 20:11, sondern 1920 × 1080.
> 3. Der „Rest von T15" in Etappe 6 ist erledigt — gemessen in v103 liegen
>    27 % der Verluste in der letzten Welle, verteilt über vier Wellen.
>
> Wer wissen will, wie das Spiel heute steht, liest `CLAUDE.md` und
> `Towerfront-BACKLOG.md`. Dieses Dokument bleibt, weil die Begründung des
> Schnitts noch trägt — nicht als Zustandsbeschreibung.

---

## 0. Der ehrliche Befund zuerst

Deine Kritik trifft, und sie trifft nicht die Ausführung, sondern eine
**Grundentscheidung aus v1**: Das Spielfeld ist ein Kachelraster, und der Weg
besteht aus achsenparallelen Segmenten auf diesem Raster.

Daraus folgt zwangsläufig alles, was dich stört:

| Was du siehst | Woher es kommt |
|---|---|
| Nur 90°-Winkel, harte Kanten | Der Weg *kann* nur aus Waagerechten und Senkrechten bestehen — der Datenwächter erzwingt es sogar |
| Level nicht sauber zentriert | Das Feld hat ein festes Verhältnis 20:11, der Bildschirm nicht |
| Bauplätze überall / an falschen Stellen | Sie waren bis v33 jede freie Zelle; seit v34 zwölf, aber immer noch auf Rasterpositionen statt an gestalteten Orten |
| Wirkt nicht wie aus einem Guss | Untergrund ist ein Foto, der Weg darüber ist gezeichnete Geometrie. Zwei Sprachen auf einem Bild |

**Das lässt sich nicht durch Nachbessern lösen.** Solange der Weg auf dem
Raster liegt, gibt es keine Kurven. Deshalb: neues Fundament für die Karte,
alles andere bleibt.

---

## 1. Was die Referenzspiele tatsächlich tun

Aus der Recherche, nicht aus der Erinnerung:

**Die Karte ist ein gemaltes Bild, kein Raster.** In Kingdom Rush ist jedes
Level ein handgezeichnetes Bild mit Wegen, die kurven, sich gabeln und
kreuzen. Es gibt <cite index="1-1">mehrere Startpunkte und mehrere
Ausgänge; Gegner erscheinen an einem Startpunkt und suchen sich ihren Weg zum
Ausgang</cite>.

**Die Wege werden als Kurven gezeichnet.** Im Forum des Entwicklers beschreibt
ein Beitrag genau das Verfahren: <cite index="4-1">ein Leveldesigner legt die
Wege der Gegner mit einem Bézier-Zeichenwerkzeug an und markiert Start- und
Endpunkte</cite>.

**Bauplätze sind wenige, feste, bewusst gesetzte Orte.** Sie liegen
<cite index="6-1">an keinen Rasterpositionen — Spieler haben sich eigene
Bezeichnungen ausgedacht, weil die Plätze keine Namen haben</cite>. Und
sie sind absichtlich ungleich verteilt: <cite index="2-1">die meisten Karten
haben eigenwillig gesetzte Turmplätze, und die Kunst besteht darin, die Zonen
zu finden, wo man am besten verteidigt — Engstellen und Stellen mit den
meisten Bauplätzen darüber</cite>.

**Das ist der eigentliche Unterschied zu uns.** Bei uns ist jeder Platz
gleichwertig — die Deckung liegt auf allen zwischen 8 und 10. Bei ihnen ist die
ungleiche Verteilung *der Inhalt*: Man sucht die Tötungszone, statt gleichmäßig
zu bestücken.

**Gleichmäßige Geschwindigkeit auf Kurven ist ein gelöstes Problem.** Wer
Gegner auf einer Kurve bewegt, stellt fest, dass sie <cite index="15-1">je
nach Kurvenform langsamer und schneller werden; die Lösung heißt
Bogenlängen-Neuparametrisierung — eine Nachschlagetabelle mit den tatsächlichen
Entfernungen entlang der Kurve</cite>. Catmull-Rom-Kurven eignen sich
dafür besonders, weil <cite index="16-1">die Kurve tatsächlich durch die
Kontrollpunkte läuft</cite> — man setzt Punkte auf den gemalten Weg, und
die Kurve trifft sie.

---

## 2. Der Unterbau — sind wir auf dem falschen Weg?

Du fragst nach dem TechStack. Die Recherche und unsere eigenen Messungen geben
eine klare, aber vielleicht überraschende Antwort.

**Die Kandidaten:**

| | Was es ist | Größe | Für uns |
|---|---|---|---|
| **Canvas 2D** (heute) | Zeichnen auf der CPU, Bilder auf den Bildschirm | 0 | Was wir haben |
| **PixiJS** | Reiner Renderer auf WebGL, <cite index="12-1">automatische Bündelung von Zeichenaufrufen, Filtersystem für Weichzeichnen, Leuchten, Masken, Mischmodi, etwa 150 KB gzip</cite> | ~150 KB | Der ernsthafte Kandidat |
| **Phaser** | Ganzes Spielgerüst mit Physik, Szenen, Ton | ~1,2 MB | Zu viel für uns, wir haben all das schon |

Die Faustregel aus der Recherche: <cite index="11-1">PixiJS spielt seine
Stärke bei komplexen Szenen mit über 1000 Bildern aus; Canvas reicht für
einfache Darstellungen unter 50 Objekten</cite>. Und:
<cite index="10-1">wähle PixiJS, wenn der Zeichendurchsatz der Engpass ist;
wähle Phaser, wenn du Spielsysteme fertig haben willst</cite>.

**Unsere Messung:** 0,17 ms je Simulationsschritt und 2.664 Zeichenbefehle je
Bild bei 171 Türmen und 55 Gegnern — im schlimmsten Fall, den wir konstruieren
konnten. Das Budget liegt bei 3.000. Im echten Spiel sind es zwölf Türme.

> **Der Zeichendurchsatz ist nicht unser Engpass, und er wird es auch nicht.
> Ein Wechsel auf PixiJS würde die Optik nicht verbessern — er würde uns eine
> Woche Umbau kosten und das Problem nicht anfassen.**

**Was uns wirklich fehlt, ist nichts, was ein Renderer liefert:** gekurvte
Wege, gestaltete Bauplätze, Bilder aus einem Guss, Rückmeldung bei jeder
Aktion. Das sind Daten- und Gestaltungsfragen.

**Empfehlung: Canvas 2D behalten.** Aber mit zwei Auflagen:

1. **Die Zeichenschicht wird gekapselt**, damit ein späterer Wechsel eine Datei
   betrifft und nicht dreißig. Konkret: alles Zeichnen geht über eine
   Szenenliste (Ebene, Bild, Position, Drehung, Farbe), die eine Rückwand
   ausführt. Heute Canvas, morgen notfalls Pixi.
2. **Ein benannter Auslöser für den Wechsel:** Wenn die gemessene Bildzeit auf
   dem iPhone dauerhaft über 12 ms liegt oder wir echtes Licht in Echtzeit
   brauchen (bewegte Schatten, Sichtkegel), dann und nur dann Pixi.

**Eine Sache müssen wir dabei aufgeben:** Die eine autarke HTML-Datei wird mit
echter Grafik groß. Heute 1,1 MB, mit gerichteten Bildsätzen realistisch
4–8 MB. Das ist für ein Browserspiel vertretbar und für ein späteres
iOS-Bündel bedeutungslos — aber es ist eine bewusste Entscheidung, keine
Nebensache.

---

## 3. Das neue Kartenmodell

Das ist der Kern des Umbaus.

### 3.1 Eine Karte besteht aus vier Dingen

```
1. Ein Hintergrundbild        das ganze Brett, gemalt, mit Weg darauf
2. Ein oder mehrere Wegzüge   unsichtbare Kurven, die auf dem gemalten Weg liegen
3. Bauplätze                  freie Weltpositionen, keine Rasterzellen
4. Ein Ziel                   wo der Kristall steht
```

**Der Weg wird gemalt, nicht gezeichnet.** Das Bild bringt ihn mit — mit echten
Kurven, mal weiter, mal enger, mit Rändern, Pfützen, Karrenspuren. Die Engine
zeichnet ihn gar nicht mehr. Sie kennt nur die *Kurve*, die darauf liegt, und
die ist unsichtbar.

Damit verschwinden die 90°-Winkel restlos — nicht weil wir sie runden, sondern
weil der Weg nicht mehr von uns kommt.

### 3.2 Die Kurve

Catmull-Rom durch gesetzte Punkte, mit Bogenlängen-Tabelle für gleichmäßige
Geschwindigkeit. Ein Gegner hat eine Strecke `s` in Pixeln; daraus folgen
Position *und* Blickrichtung. Kurven kosten damit nichts an Genauigkeit: Ein
Gegner auf einer engen Kurve läuft genauso schnell wie auf der Geraden, und er
dreht sich weich mit.

Mehrere Züge können sich vereinen — sie teilen sich dann ab dem Treffpunkt
dieselben Punkte.

### 3.3 Bauplätze werden zu Orten

Kein Raster mehr. Ein Bauplatz ist:

```
{ x: 640, y: 380, art: 'fels' }
```

Damit können sie dort liegen, wo das Bild eine Stelle dafür zeigt — auf einem
Felsvorsprung, einer Ruine, einer Lichtung. **Und sie dürfen ungleich verteilt
sein.** Das ist keine Schlamperei, sondern der Inhalt: Drei Plätze über einer
Engstelle sind eine Tötungszone, ein einzelner Platz am Rand ist eine
Notlösung.

Neue Wächterregeln dazu: jeder Platz muss den Weg erreichen; zusammen müssen
sie den ganzen Weg abdecken; und es muss **mindestens eine Häufung** geben —
eine Stelle mit drei Plätzen in Reichweite voneinander. Ohne die ist eine Karte
ein gleichmäßiger Teppich, und den haben wir schon gehabt.

### 3.4 Ausrichtung und Zoom

Das Hintergrundbild bestimmt das Verhältnis. Vorgabe: **16:9** — das passt zu
Handy quer und Schreibtisch gleichermaßen und ist das Format, in dem
Bild-Generatoren am zuverlässigsten arbeiten.

- Startzustand: das Bild füllt den Bildschirm (kurze Kante passt genau).
- Herausziehen bis alles sichtbar ist, hineinziehen bis dreifach.
- Verschieben begrenzt auf das Bild.
- Doppeltipp schaltet um.

Das steht seit v30 und funktioniert; es fällt nur nicht auf, weil das Feld
20:11 ist und deshalb immer Ränder bleiben. Mit 16:9 verschwindet das Problem.

---

## 4. Bauen — wie es sich anfühlen soll

Genau wie du es beschreibst, und es ist auch das, was die Vorbilder tun:

**Ohne gewählten Turm ist das Brett ruhig.** Bauplätze sind höchstens als
dezente Struktur im Bild zu ahnen — ein Felsvorsprung, ein Fundament. Keine
leuchtenden Sockel, kein Raster.

**Turmsorte antippen → das Brett antwortet.** Jeder freie Bauplatz bekommt
einen grünen Ring, der ruhig pulst. Zu teuer: derselbe Ring in Rot mit dem
fehlenden Betrag. Besetzt: gedämpft, mit dem Umriss des vorhandenen Turms.

**Über einem Platz schweben → Reichweite und Vorschau.** Der Turm erscheint als
Geist, sein Wirkbereich als weicher Kreis, und die Wegstrecke, die er abdeckt,
leuchtet auf. *Das* ist die Information, die man beim Bauen braucht — nicht
„hier ist Platz", sondern „das hier deckt er ab".

**Loslassen baut.** Wegziehen bricht ab. Kein Fehltipp kostet Gold.

**Danach: Sammelanzeige.** Ein gebauter Turm zeigt bei Auswahl seine Reichweite,
seinen bisherigen Schaden und die zwei Ausbauwege nebeneinander — mit dem
Unterschied in Zahlen, nicht in Prosa.

---

## 5. Was „hochwertig" bedeutet

Du hast gefragt, was ich darunter verstehe. Fünf Dinge, in dieser Reihenfolge:

**1. Man versteht sofort, was passiert.** Jede Gegnerart auf einen Blick
unterscheidbar, jeder Turm erkennbar, jeder Treffer sichtbar. Das ist keine
Frage des Geschmacks, es ist messbar — unser Lesbarkeitstor tut genau das.

**2. Jede Handlung antwortet.** Aus der Recherche, und es deckt sich mit meiner
Erfahrung: <cite index="26-1">ein Spiel fühlt sich gut an, wenn drei Dinge
zusammenkommen — die Steuerung antwortet sofort, jede Handlung erzeugt eine
lesbare Rückmeldung, und eine Schicht Politur macht jede Interaktion
befriedigend</cite>. Uns fehlt vor allem die dritte Schicht. Konkret:
Trefferstopp von drei bis fünf Bildern beim schweren Treffer, Stauchen und
Strecken beim Aufprall, kurzer Bildstoß bei der Explosion, Aufblitzen der
Lebensleiste statt eines springenden Balkens, ein Turm, der beim Bauen kurz
einfedert.

Wichtig ist dabei die Warnung aus derselben Recherche:
<cite index="27-1">Politur ist kein Satz Tricks, sie muss das Spiel
verstärken — Bildstoß und Stauchen ergeben nur in bestimmten Situationen
Sinn</cite>. Bei uns heißt das: der Titan bekommt Wucht, der Schleicher
nicht.

**3. Die Entscheidungen sind echt.** Zwei Ausbauwege, die beide gewinnen
können. Karten, die etwas anderes verlangen. Ein Fehler, der Kristall kostet,
nicht das Spiel. Daran arbeiten wir seit v13 messbar.

**4. Es sieht aus wie aus einer Hand.** Ein Lichteinfall, eine Farbwelt je
Karte, ein Detailgrad. Der aktuelle Zustand — Foto-Untergrund, gezeichneter
Weg, gerenderte Panzer — ist genau das nicht.

**5. Nichts ist eine Sackgasse.** Kein toter Ausbauweg, kein unbrauchbarer
Bauplatz, kein Schwierigkeitsgrad, den niemand schafft. Das prüft die
Simulation.

---

## 6. Was ich von dir brauche

Du hast Hintergründe, Gegner und Türme angekündigt. Damit sie zusammenpassen,
hier die Vorgaben — das wird die Asset-Spezifikation 2.0.

### 6.1 Kartenbilder

**3840 × 2160 (16:9), WebP.** Der Weg ist **im Bild gemalt**: echte Kurven,
wechselnde Breite, weiche Ränder, Übergänge ins Gelände. Keine harten Kanten,
keine Rasterspuren.

**Dazu brauche ich je Karte zwei Zusatzbilder in derselben Größe:**

- `_pfad.png` — der Weg als weiße Fläche auf Schwarz. Daraus lese ich die
  Mittellinie automatisch aus und bekomme die Kurve, ohne sie von Hand zu
  setzen.
- `_plaetze.png` — die vorgesehenen Bauplätze als grüne Punkte auf Schwarz.
  Daraus lese ich ihre Positionen.

Diese beiden sind der entscheidende Trick: **Damit passen Bild und Spiellogik
zwangsläufig zusammen**, statt dass ich Punkte nach Augenmaß auf ein Foto lege.
Wenn dein Bild-Agent sie nicht liefern kann, mache ich sie aus dem Kartenbild —
aber es wird ungenauer.

### 6.2 Gerichtete Bildsätze

Für alles, was sich dreht: **acht Richtungen**, im Uhrzeigersinn ab Osten.

```
e_panzer_00.png   nach rechts        e_panzer_04.png   nach links
e_panzer_01.png   rechts unten       e_panzer_05.png   links oben
e_panzer_02.png   nach unten         e_panzer_06.png   nach oben
e_panzer_03.png   links unten        e_panzer_07.png   rechts oben
```

Acht reicht: bei acht Richtungen beträgt der größte Fehler 22,5°, und bei
30 Bildpunkten Objektgröße sieht das niemand. Sechzehn wären doppelte Arbeit
für nichts.

Türme: derselbe Satz für den **drehbaren Aufsatz**, der Sockel bleibt ein
einziges Bild.

Alles Weitere — Größen, Standlinie, Rand, kein eingebackener Schatten — wie in
der bestehenden Spezifikation. Das Bildwerkzeug erkennt Sätze am Namensschema
automatisch.

---

## 7. Der Weg dorthin

Sechs Etappen. Jede endet mit einem spielbaren Stand, keine bricht das Spiel.

**Etappe 1 · Fundament: Kurven statt Raster.**
Kurvenmodell mit Bogenlänge, Karten auf 16:9, Weg aus dem Bild statt gezeichnet,
Bauplätze als freie Orte. Die drei bestehenden Karten werden übersetzt — sie
sehen zunächst gleich aus, laufen aber auf dem neuen Fundament. Wächter und
Simulation ziehen mit.

**Etappe 2 · Bauen, wie du es beschrieben hast.**
Bauplätze erst nach Turmwahl sichtbar, grün und rot, Reichweitenvorschau mit
markierter Wegstrecke, Geistvorschau.

**Etappe 3 · Erste echte Karte.**
Dein erstes Kartenbild samt Weg- und Platzbild. Ab hier sieht man, wohin es
geht.

**Etappe 4 · Gerichtete Bildsätze.**
Acht Richtungen für Gegner und Turmaufsätze, Bildwerkzeug erweitert.

**Etappe 5 · Politur.**
Trefferstopp, Stauchen, Bildstoß, Lebensleisten, Bauanimation, Ton je Ereignis.
Das ist die Etappe, die aus „funktioniert" ein „fühlt sich gut an" macht.

**Etappe 6 · Inhalt.**
Blockturm und Heiler, weitere Karten, Rest von T15.

---

## 8. Was das kostet

Ehrlich gesagt: Etappe 1 ist ein Bruch. Das Kachelraster steckt in
`maps.ts`, `state.ts`, `terrain.ts`, `renderer.ts`, in vier Wächterprüfungen
und in der Simulation. Das sind die verwundbarsten Stellen des Projekts, und
sie werden alle angefasst.

Dagegen steht: **Ohne diesen Schnitt bleibt jede weitere Grafikrunde ein
Anstrich auf einem Raster.** Die letzten fünf Runden haben das gezeigt.

Die Tore sind genau für diesen Fall gebaut. Sie werden mitwandern müssen — und
nach der Erfahrung dieser Sitzung gilt dabei: **erst prüfen, ob die Messung
noch misst, was sie soll.**
