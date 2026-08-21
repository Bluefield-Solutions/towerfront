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

> **ÜBERHOLT.** Abschnitt 4 entstand vor deinem Zielbild und ging von einem
> flachen Zeichentrickstil aus. Das Zielbild ist gerendert — damit sind 4.1
> und 4.2 hinfällig. **Gültig sind die Zahlen und die Bildbeschreibung aus
> Abschnitt 5.4.** Abschnitt 4.3 (Reihenfolge) und 4.4 (Abnahmeprüfung) gelten
> weiter.

### 4.1 Die Vorschrift, messbar *(überholt, siehe 5.4)*

> **Achtung — bis v105 hat `npm run grafik` gegen DIESE Tabelle gemessen**,
> obwohl sie seit v55 als überholt markiert ist. Der Satz darunter lautete
> „`npm run grafik` prüft sie", und das stimmte. Der Widerspruch stand also
> wörtlich in dieser Datei: eine Vorschrift, die als überholt gekennzeichnet
> ist, und direkt daneben die Aussage, dass ein Werkzeug sie durchsetzt.
>
> Seit v105 misst das Werkzeug gegen 5.4. Die Bänder stehen dort, wo sie
> ausgeführt werden — als `REFERENZ` in `tools/artaudit.mjs`.

Jedes neue Bild musste diese Werte treffen.

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

### 4.2 Was das für die Bilderzeugung heißt *(überholt, siehe 5.4)*

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

## 5. Das Zielbild — gemessen

Du hast ein Bild geschickt: eine gerenderte Aufsicht, sonnenbeschienen, warmer
Sandboden, kühle Felsen, gepflasterter Weg, Türme mit Mündungsfeuer und blauen
Energieeffekten. Ich habe den Spielbereich herausgeschnitten und **mit
denselben Kennzahlen gemessen** wie unsere eigene Grafik.

```
                  Palette  Helligk   Sätt.  Spanne  Dichte  Schwarz
Zielbild gesamt      1238    0.34    0.52    0.59    3.00    1.3 %
  davon Boden         294    0.33    0.51    0.39    1.63
  davon ein Turm      889    0.36    0.37    0.67    3.44

Wir: Untergründe               0.13-0.27  0.30-0.55         2.4-3.7
Wir: Figuren                   0.19-0.31  0.20-0.42        12.6-21.6  5-15 %
```

### 5.1 Drei harte Abstände

**A · Das Zielbild ist eine Tagszene, unsere ist eine Nachtszene.**
Helligkeit 0,34 gegen 0,18 beim Boden. Das ist der größte einzelne Abstand und
er zieht sich durch alles: Untergründe, Farbwelt, Leuchteffekte, Stimmung.
Keine Detailarbeit an Einzelbildern holt das auf.

**B · Unsere Figuren rauschen.** Detaildichte 12,6 bis 21,6 gegen **3,44** beim
Zielturm. Nicht weil sie mehr Inhalt hätten — sie sind kleingerechnete,
komprimierte Renderings mit Kompressionskörnung. Das Zielbild ist ein glattes
Rendering.

**C · Schwarz.** 5 bis 15 % gegen **1,3 %**. Bleibt bestehen.

### 5.2 Eine Korrektur an meinem eigenen Audit

Befund B2 sagte: *„Figuren müssen gesättigter sein als der Untergrund."* Das
stammt aus der Lehre zur Pixelgrafik — und **im Zielbild gilt es nicht.** Dort
ist der Boden mit 0,51 deutlich **gesättigter** als der Turm mit 0,37.

Der Grund ist die andere Bauart: In einer gerenderten Szene macht das **Licht**
die Hierarchie, nicht die Farbe. Türme stehen im Sonnenlicht, werfen Schatten,
haben Glanzkanten — das hebt sie heraus. Ein Sättigungsgefälle wäre dort sogar
falsch, weil es den Boden entfärbt und die Szene tot wirken lässt.

**B2 ist damit hinfällig.** Was bleibt: Werthierarchie durch Licht.

### 5.3 Was ohne neue Bilder geht

> **Widerlegt in v105, erster Punkt.** Hier stand: *„Entrauschen wirkt … die
> Form bleibt vollständig erhalten."* Der erste Halbsatz stimmt, der zweite
> nicht. Nachgemessen und **angesehen** mit `npm run entrauschprobe`:
>
> | Verfahren | Rauschen | Dichte | Was das Bild zeigt |
> |---|---|---|---|
> | ohne | 0,78 | 8,37 | scharf, alle Details da |
> | median 3 | 0,82 | 6,50 | Plattenkanten weg |
> | median 5 | 0,62 | 4,86 | der Koloss ist ein Klumpen |
> | Weichzeichnen 1,4 | 0,12 | 5,10 | Armbrust und Beine verschwinden |
>
> Jeder Weg bringt die Dichte ins Zielband von 3 bis 6. Jeder kostet sichtbar
> Form. Der Grund ist Auflösung: die Figur liegt als 256er Bild vor und wird
> mit rund 108 Gerätepunkten gezeichnet — bei dieser Größe liegen Korn und
> Form im selben Frequenzband, und kein Filter trennt, was physisch nicht
> getrennt ist.
>
> **Der Satz „gemessen und ausprobiert" war zur Hälfte wahr.** Gemessen wurde,
> ausprobiert nicht — sonst hätte man es gesehen. Genau dafür steht Regel 8:
> kein Tor ersetzt den Blick.
>
> Damit ist B1 ohne neue Bilder nicht zu lösen. Die beiden anderen Punkte
> unten stehen noch aus und sind davon unberührt.

Gemessen und ausprobiert:

- ~~**Entrauschen wirkt**~~ — siehe Kasten. Widerlegt.
- **Schwarz anheben** ist ein Zweizeiler im Bildwerkzeug.
- **Untergründe aufhellen und wärmen** — **erledigt in v106**, und der
  Halbsatz „schließt A nicht ganz" war richtig. `bakeTerrain` zieht den
  Untergrund auf 0,30 (Band 0,30 bis 0,36), das Gamma je Karte aus dem Bild
  selbst gerechnet. Drei Anläufe, und die ersten beiden waren lehrreich:
  hinter dem Foto angesetzt liess es Weg und Felsen zurück, ans Ende
  verschoben half es kaum, weil Gamma Hell und Dunkel grundsätzlich
  annähert. Erst eine Kontrastspreizung um die Zielmitte hielt die Tiefe.
  Was bleibt, ist nicht zu holen: eine Nachtszene bezieht ihre Tiefe aus dem
  Dunkel, und der relative Kontrast fällt beim Aufhellen von 0,83 auf 0,73,
  ganz gleich wie man rechnet.

### 5.4 Was neue Bilder braucht

Der Boden. Ein sonnenbeschienenes, gerendertes Gelände mit echten Felsen,
Grasbüscheln und gepflastertem Weg **im Bild** — das ist der eine große Hebel,
und der Weg als gezeichnetes Band verschwindet dabei gleich mit.

Die Vorgabe für die Bilderzeugung lautet damit **nicht mehr** „flache
Vektorzeichnung" wie in Abschnitt 4.2, sondern:

```
Gerenderte Aufsicht, leicht geneigte Kamera, sonnenbeschienen von oben links,
warme Mittagssonne. Warmer Sandboden in Ocker, kühlgraue Felsformationen,
gepflasterter Weg aus grauen Steinen. Weiche lange Schatten in derselben
Richtung. Kräftige, natürliche Sättigung. Kein reines Schwarz - dunkelster Ton
ein warmes Braungrau. Glatte Oberflächen ohne Körnung. Detailgrad mittel: die
Formen tragen, nicht die Textur.
```

**Der Abschnitt 4.1 gilt weiter, aber mit diesen Zahlen aus der Referenz:**

| Kennzahl | Figuren | Untergrund |
|---|---|---|
| Mittlere Helligkeit | **0,33 bis 0,40** | **0,30 bis 0,36** |
| Sättigung | 0,35 bis 0,45 | 0,45 bis 0,55 |
| Detaildichte | **3 bis 6** | 1,5 bis 3 |
| Reines Schwarz | unter 2 % | unter 2 % |
| Lichtrichtung | oben links, überall gleich | oben links |

**Diese Tabelle steht doppelt, und das ist Absicht — aber nur eine Fassung
zählt:** `REFERENZ` in `tools/artaudit.mjs`. Was hier steht, ist die Lesefassung.
Weicht `npm run grafik` davon ab, hat das Werkzeug recht und diese Tabelle
ist zu berichtigen. Zwei Stellen mit derselben Zahl driften, und es war schon
zweimal so — bei T15 und hier.

### 5.5 Was das Werkzeug bis v105 gemeldet hat, und warum es falsch war

Drei seiner sechs Befunde standen gegen die eigene Messung aus Abschnitt 5:

| Befund des Werkzeugs | Was das Zielbild sagt |
|---|---|
| „Zu viele Farben: über 40 je Figur" | Ein einzelner Turm im Zielbild trägt **889** Farben, der Boden 294. Unsere 707 im Mittel liegen **darunter**. |
| „Kein Sättigungsgefälle: Figuren müssen gesättigter sein" | Im Zielbild ist der **Boden** mit 0,51 gesättigter als der Turm mit 0,37. Genau umgekehrt — und in 5.2 seit v55 als hinfällig vermerkt. |
| „Figuren liegen im Helligkeitsband des Untergrunds" | Im Zielbild liegen Turm (0,36) und Boden (0,33) **0,03** auseinander. Das Zielbild wäre an dieser Prüfung durchgefallen. |

Ein vierter, die Detaildichte, schlug aus dem richtigen Grund an, maß aber
das falsche Ding: er forderte „gleiche Dichte über alle Ebenen", während das
Zielbild die Figuren mit 3,44 gegen 1,63 gut **doppelt** so dicht zeichnet.

**Wer den alten Befunden gefolgt wäre**, hätte die Farbzahl auf 40 gedrückt,
den Boden entfärbt und die Figuren aufgehellt: drei Schritte, jeder von der
Referenz weg. Ein Werkzeug, das misst, ist nicht besser als eines, das
schätzt, solange es das Falsche misst — es ist gefährlicher, weil es Zahlen
liefert.

Was jetzt herauskommt, deckt sich mit den drei harten Abständen aus 5.1:
Figuren rauschen (7,59 gegen ein Band von 3 bis 6), der Untergrund ist zu
dunkel (0,24 gegen 0,30 bis 0,36 — Abstand A), der Untergrund ist zu glatt
(1,24 gegen 1,5 bis 3), und die Sättigung der drei Karten streut von 0,33
bis 0,85.

---

## 6. Was ich von dir brauche

**Entweder** du erzeugst die Bilder nach der Vorgabe aus 5.4 — dann schicke
ich dir je Los eine fertige Liste mit Beschreibungen, und ich prüfe die
Lieferung gegen 5.4.

**Oder** wir arbeiten mit dem, was da ist, und akzeptieren, dass das Bild aus
drei Bildsprachen besteht. Das ist eine vertretbare Entscheidung — aber dann
ist „besser als die Referenz" nicht erreichbar, und ich sage das lieber
vorher.

Meine Empfehlung ist das Erste, in der Reihenfolge aus 4.3, ein Los nach dem
anderen. Nach jedem Los messe ich und zeige dir das Bild im Spiel.
