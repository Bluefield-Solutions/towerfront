# Towerfront — Grafik-Audit

*v55 · 08.08.2026 · Alle Ebenen, gemessen statt geschätzt*

---

## 0. Wie ich vorgegangen bin

Nicht nach Geschmack. Ich habe zuerst recherchiert, **woran** sich die Grafik
der gut bewerteten Vertreter des Genres festmachen lässt, daraus messbare
Kennzahlen abgeleitet, ein Werkzeug gebaut (`npm run grafik`) und unsere
Bilder dagegen gehalten.

Die Prinzipien stammen aus zwei Quellen. Die erste ist der Grafiker von
Kingdom Rush selbst, der seine Technik in einem Forum beschreibt:

> <cite index="3-1">Sie verwenden diese cartoonhafte Technik, bei der nur drei
> oder vier Farben benutzt werden, um den Eindruck von etwas Dreidimensionalem
> zu erzeugen … Es braucht eine sorgfältige Planung der Farbpalette. Man
> beachte, dass er kein reines Schwarz verwendet. Die Farben sind außerdem
> leicht gedämpft, die Gamma mit einem Hauch Grau.</cite>

Die zweite ist die allgemeine Lehre zur Lesbarkeit:

> <cite index="12-1">Was der Spieler zuerst lesen muss, bekommt den höchsten
> Helligkeitskontrast zum Hintergrund. Dekoratives bleibt in einem engeren
> Wertebereich, der als Hintergrund gelesen wird.</cite>

> <cite index="17-1">Der Hintergrund soll weniger gesättigt sein als die
> Figuren. Wichtiges bekommt gesättigtere Farben. Das erzeugt eine natürliche
> Hierarchie — der Blick geht zum Hellsten und Gesättigtsten.</cite>

> <cite index="15-1">Gleichmäßige Detaildichte über alle Bildteile erzeugt
> visuelle Geschlossenheit … Einfache Formen mit klaren Silhouetten lesen sich
> immer besser als überladene Bilder.</cite>

Daraus sechs Kennzahlen: **tragende Farbzahl** (wieviele Farben decken 90 %
der Fläche), **mittlere Helligkeit**, **Sättigung**, **Wertspanne**,
**Detaildichte** (mittlere Helligkeitsänderung zwischen Nachbarpunkten) und
**Anteil reinen Schwarzes**.

---

## 1. Die Messung

```
Untergründe        Palette  Helligk   Sätt.  Spanne  Dichte
  spiralhain            84    0.13    0.54    0.26    2.41
  ascheschlucht        137    0.13    0.30    0.28    2.58
  frostspalte          231    0.27    0.55    0.50    3.69

Türme              Palette  Helligk   Sätt.  Spanne  Dichte  Schwarz
  arrow_1              395    0.27    0.35    0.62   16.76     5.4%
  frost_1              112    0.21    0.20    0.54   14.22    11.0%
  mortar_1             141    0.22    0.25    0.57   15.06     9.1%
  prism_1              180    0.23    0.29    0.57   16.95     9.6%

Gegner             Palette  Helligk   Sätt.  Spanne  Dichte  Schwarz
  crawler              206    0.23    0.32    0.66   15.87    12.3%
  runner               180    0.24    0.31    0.66   17.60    12.2%
  brute                256    0.24    0.34    0.69   13.49    15.3%
  flyer                427    0.31    0.26    0.76   20.25     5.8%
  splitter             134    0.27    0.25    0.68   18.81    12.3%
  splitling            113    0.23    0.27    0.66   21.59    14.2%
  titan                301    0.28    0.31    0.75   13.91    12.1%
  infantry             126    0.19    0.42    0.47   12.60     9.4%
```

---

## 2. Fünf Befunde — jedes Prinzip verletzt

### B1 · Die Figuren sind gerendert, nicht gezeichnet

**Zwölf von zwölf** tragen über 40 Farben; der Bogenturm 395, der Gleiter 427.
Die Referenz sind **drei bis vier je Form**.

Das ist nicht eine Kennzahl unter mehreren — **es ist die Wurzel von allem
anderen.** Ein Bild mit 400 Farben hat weiche Verläufe statt Flächen, feines
Rauschen statt Kanten, und keine planbare Palette. Es kann nicht mit einer
gezeichneten Landkarte oder einem flächigen Weg zusammengehen, weil es aus
einer anderen Herstellungsart stammt.

### B2 · Kein Sättigungsgefälle — alles ist gleich laut

Untergrund **0,46**, Figuren **0,30**. Das Verhältnis steht **auf dem Kopf**:
Der Boden ist gesättigter als das, worauf man achten soll. Der Blick wird
nicht geführt, er sucht.

### B3 · Drei Bildsprachen auf einem Bild

Detaildichte: Figuren **16,43** gegen Untergrund **2,90** — die Figuren tragen
**5,7-mal so viel Feindetail** wie der Boden. Dazwischen liegt der Weg als
flächige Zeichnung mit noch weniger.

Weich gezeichneter Untergrund, flächig gezeichneter Weg, fotorealistisch
gerenderte Figuren. Drei Herstellungsarten, die nichts miteinander zu tun
haben. Das ist der Grund, warum das Bild nicht aus einem Guss wirkt — nicht
die Qualität der einzelnen Teile.

### B4 · Reines Schwarz in allen zwölf Figuren

Zwischen 5 und 15 % der Fläche. Der Koloss besteht zu **15,3 %** aus nahezu
schwarzen Punkten. Schwarz frisst Löcher in die Form, statt sie zu begrenzen —
bei kleiner Darstellung bleibt ein Fleck statt einer Silhouette.

### B5 · Elf von zwölf Figuren liegen im Helligkeitsband des Untergrunds

Untergrund 0,18, die Figuren zwischen 0,19 und 0,31. **Sie werden nur durch
ihren Saum sichtbar, nicht durch ihre Form.** Der Saum aus v33 war die richtige
Notmaßnahme — aber er behandelt ein Symptom.

---

## 3. Was ich versucht habe, und warum es nicht reicht

Der naheliegende Gedanke: die vorhandenen Bilder nachträglich angleichen.
Werte auf Stufen legen, Schatten im Farbton kühlen, Schwarz anheben, Sättigung
heben, Umriss anlegen. Das habe ich gebaut (`tools/style.mjs`) und in drei
Stärken durchprobiert.

**Es funktioniert nicht.** Und der Grund ist lehrreich:

- **Nur staffeln** macht das Bild fleckig statt flächig. Staffeln entfernt kein
  Feindetail, es macht es schmutzig — aus einem weichen Verlauf werden Inseln.
- **Erst glätten, dann staffeln** entfernt zwar das Detail, aber mit ihm die
  Form: Aus dem Koloss wird ein brauner Klumpen. Genau die Information, die
  ihn lesbar machte, war das Detail.
- **Milde Fassung** bleibt erkennbar, sieht aber matschiger aus als das
  Original — Bänderung ohne Gewinn.

> **Ein Nachbearbeitungsschritt kann aus einem fotorealistischen Rendering
> keine gezeichnete Grafik machen. Er kann nur wegnehmen, und weggenommen wird
> zuerst das, was die Form trägt.**

Das Werkzeug bleibt im Baum, mit diesem Befund im Kopfkommentar. Damit es
niemand — auch ich nicht — ein zweites Mal versucht.

---

## 4. Der Weg: ein Stilbuch und neue Bilder

Wenn Nachbearbeitung ausscheidet, bleibt: **neu erzeugen, aber alles nach
einer Vorschrift.** Das ist keine Kapitulation, sondern der Weg, den die
Referenz gegangen ist — dort ist die Palette *vor* dem ersten Bild geplant
worden.

### 4.1 Die Vorschrift, messbar

Jedes neue Bild muss diese Werte treffen. `npm run grafik` prüft sie.

| Kennzahl | Figuren (Türme, Gegner) | Untergrund |
|---|---|---|
| Tragende Farben | **4 bis 12** | 12 bis 40 |
| Reines Schwarz | **0 %** | 0 % |
| Dunkelster Ton | nicht unter 0,12 Helligkeit | — |
| Mittlere Helligkeit | **0,35 bis 0,55** | 0,12 bis 0,22 |
| Sättigung | **0,40 bis 0,60** | **unter 0,25** |
| Detaildichte | 4 bis 9 | 2 bis 5 |
| Umriss | geschlossen, dunkel, nicht schwarz | — |

Die entscheidenden drei Zeilen: Figuren **heller** als der Boden, Figuren
**gesättigter** als der Boden, Detaildichte auf **einem Niveau**.

### 4.2 Was das für die Bilderzeugung heißt

Die bisherigen Bestellungen liefen auf „gerendert, realistisch, Aufsicht". Das
war der Fehler. Die neue Vorgabe je Bild:

```
Flache Vektorzeichnung, Zeichentrickstil, nur drei bis vier Farbflächen
je Form, harte Kanten zwischen den Flächen, kein Farbverlauf, kein Rauschen,
kein reines Schwarz — dunkelster Ton ein dunkles Blaugrau. Dunkler Umriss
gleichmäßiger Stärke um die ganze Silhouette. Schatten kühler als die
Grundfarbe, nicht nur dunkler. Aufsicht leicht geneigt. Freigestellt auf
Transparenz, kein eingebackener Schatten. Kräftige, aber leicht gedämpfte
Farben.
```

### 4.3 Reihenfolge

Nach Wirkung je Aufwand:

1. **Die vier Türme.** Sie stehen still, man sieht sie am längsten, es sind
   zwölf Bilder (vier mal Grundform und zwei Zweige).
2. **Die acht Gegner.** Sie bewegen sich und sind klein — hier zählt die
   Silhouette mehr als das Detail.
3. **Der Herzkristall und das Tor.** Zwei Einzelstücke, die den Blick tragen.
4. **Die drei Untergründe.** Zuletzt, weil sie zurücktreten sollen: gedämpft,
   detailarm, dunkel. Ein Untergrund, der auffällt, ist ein schlechter.
5. **Der Weg.** Er wird dann Teil des Kartenbildes statt gezeichnet zu werden.

### 4.4 Das Tor

`npm run grafik` wird zur **Abnahmeprüfung für eingehende Bilder**: Wer die
Werte aus 4.1 nicht trifft, kommt nicht ins Bündel. Damit kann die Grafik
nicht wieder auseinanderdriften, und du musst nicht jedes Bild selbst
beurteilen — nur die, die durchkommen.

---

## 5. Was ich von dir brauche

**Entweder** du erzeugst die Bilder nach der Vorgabe aus 4.2 — dann schicke
ich dir je Los eine fertige Liste mit Beschreibungen, und ich prüfe die
Lieferung gegen 4.1.

**Oder** wir arbeiten mit dem, was da ist, und akzeptieren, dass das Bild aus
drei Bildsprachen besteht. Das ist eine vertretbare Entscheidung — aber dann
ist „besser als die Referenz" nicht erreichbar, und ich sage das lieber
vorher.

Meine Empfehlung ist das Erste, in der Reihenfolge aus 4.3, ein Los nach dem
anderen. Nach jedem Los messe ich und zeige dir das Bild im Spiel.
