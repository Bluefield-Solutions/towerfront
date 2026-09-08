# Audit — Spielspaß, Entscheidungen und Verlauf

Stand: v237 · 08.09.2026

> „Es kommt kaum Spielspaß auf."

Das ist eine Empfindung, und Empfindungen sind nicht zu widerlegen. Sie sind
aber zu **erklären** — und im Fall dieses Spiels erklären sie sich fast
vollständig aus Zahlen, die schon gemessen werden. Dieses Dokument stellt
sie zusammen und leitet daraus ab, was fehlt.

Alle Zahlen aus `npm run sim` (v237, bestanden) und aus dem Wellenplan
selbst. Das Bildseitige steht im Nachbardokument
`docs/Towerfront-AUDIT-HUD-UND-BILDSCHIRM.md`; hier geht es um das Spiel.

---

## Teil 1 — Der Befund in einem Satz

**Dreizehn von fünfzehn Wellen haben kein Ergebnis, und die Entscheidungen,
die man trifft, ändern es um weniger als fünf Prozent.**

Alles Weitere ist Beleg.

---

## Teil 2 — Belege

### 2.1 Alle Verluste liegen in den letzten zwei Wellen

`npm run sim` fährt sechs Turmzusammenstellungen und drei Spielstile:

```
Verteilung der Verluste: W14:12  W15:5
```

**Siebzehn von siebzehn durchgelassenen Gegnern kommen in Welle 14 oder 15
durch.** In den Wellen 1 bis 13 verliert man nichts — ganz gleich, was man
baut.

Das ist die Bauart eines Spiels, in dem zwölf Minuten lang nichts auf dem
Spiel steht. Der Kristall steht auf 60 und bleibt auf 60, bis das Spiel
fast vorbei ist. Es gibt kein Zittern, keine Erholung, keinen Fehler, den
man ausbügeln müsste — und damit auch keinen Stolz, wenn es gutgeht.

Zum Vergleich: `T15` hat als Ziel „höchstens 60 % der Verluste in einer
Welle, verteilt über mindestens drei" gesetzt und gilt als gelöst. Der Lauf
meldet aber weiterhin selbst:

```
OFFEN (T15): Verluste liegen an 2 Stelle(n), 29 % davon in der letzten Welle.
```

Zwei Stellen, nicht drei. Die Kennzahl misst die **Verteilung** der
Verluste; sie misst nicht, dass die ersten dreizehn Wellen leer sind.

### 2.2 Die Zweigwahl ist folgenlos

Ab Stufe 2 entscheidet man sich für einen von zwei Ausbauzweigen, endgültig.
Das ist ausdrücklich als der Kern der Tiefe angelegt („der Kern, aus dem
Bloons TD 6 seine Tiefe bezieht", `src/data/towers.ts`). Gemessen, jeweils
ein Turmtyp umgestellt, Kristall von 60:

| Turm | Zweig A | Zweig B | Unterschied |
|---|---|---|---|
| Bogenturm | Scharfschütze 43 | Salve **45** | 2 |
| Frostturm | Ewiges Eis **43** | Splitterfrost 41 | 2 |
| Mörser | Streubombe 43 | Brecher **46** | 3 |
| Prisma | Verzweigung **43** | Bündelung 41 | 2 |

**Die größte Auswirkung einer endgültigen Entscheidung beträgt 3 von 60 —
fünf Prozent.** Acht Zweige, und keiner davon ist eine Entscheidung; es sind
acht Namen für dieselbe Sache.

### 2.3 Ein einziger Turmtyp schlägt das gemischte Feld

```
nur Frost  -> gewonnen, Kristall 50/60
nur Prisma -> gewonnen, Kristall 18/60
gemischt   -> gewonnen, Kristall 43/60
nur Bogen  -> verloren in Welle 14
nur Mörser -> verloren in Welle 11
```

**„Nur Frost" ist die beste gemessene Zusammenstellung des Spiels** — besser
als das gemischte Feld, das die Karte eigentlich verlangt. Damit ist die
ganze Anlage aus Kontern, Panzerung, Schilden und Luftzielen für den besten
Weg unerheblich: man baut viermal dasselbe.

Die Gegenrichtung stimmt: Bogen und Mörser allein verlieren. Es gibt also
schlechte Antworten — nur ist die beste Antwort keine Mischung, sondern eine
Monokultur.

### 2.4 Können zahlt sich kaum aus, Geiz zahlt sich aus

```
Meister   85 Punkte
Breite    78 Punkte
Sparsam   87 Punkte
```

**Der sparsame Stil gewinnt.** Der „Meister" — der Stil, der die
Entscheidungen bewusst gut trifft — liegt zwei Punkte dahinter, die Spanne
über alle drei beträgt 9 von 100.

Und die Robustheitsmessung sagt dasselbe von der anderen Seite: ±10 %
Schaden bewegen das Ergebnis um 80,3 / 84,7 / 85,3 — **eine Zehn-Prozent-
Änderung an allen Turmwerten kostet fünf Punkte.** Ein Spiel, dessen
Ergebnis so wenig auf seine eigenen Zahlen reagiert, reagiert auch nicht auf
den Spieler.

### 2.5 Gold ist kein Engpass

```
gemischt -> 6297 Gold verdient, 2687 uebrig
```

**Zweiundvierzig Prozent des verdienten Goldes werden nie ausgegeben.**

Diese Zahl trägt ihre Messstelle mit (Regel 12): die Simulation baut
höchstens zwölf Türme und vierundzwanzig Ausbauten, sie *kann* also nicht
alles ausgeben. Die Aussage bleibt trotzdem: eine Strategie, die vier
Zehntel ihres Einkommens liegen lässt, gewinnt. Knappheit ist der Motor
jeder Aufbauentscheidung; hier läuft er im Leerlauf.

### 2.6 Die Druckkurve fällt am Ende ab

Aus dem Wellenplan gerechnet (`wellenDruck` — Lebenspunkte, die eine Welle
aufs Feld bringt, Zerfallende mitgezählt):

| Karte | Rückfälle | größter Rückfall | letzte Welle gegen die Spitze |
|---|---|---|---|
| Spiralhain | 3 von 14 | −43 % bei W10 | **76 %** (Spitze W9) |
| Ascheschlucht | 3 von 14 | −48 % bei W12 | **89 %** (Spitze W11) |
| Frostspalte | 5 von 14 | −43 % bei W13 | **72 %** (Spitze W9) |
| Farnkessel | 5 von 14 | −59 % bei W13 | **93 %** (Spitze W14) |

**Auf keiner der vier Karten ist die letzte Welle die schwerste.** Auf dem
Spiralhain bringt Welle 9 ein Drittel mehr Lebenspunkte aufs Feld als das
Finale. Der Höhepunkt liegt in der Mitte, und danach wird es leichter —
während gleichzeitig die Verteidigung weiter wächst.

Dass man trotzdem in W14/15 verliert, liegt an der Zusammensetzung
(Schilde, Titanen), nicht an der Menge. Aber empfunden wird die Menge.

### 2.7 Ein Durchgang dauert lange und besteht meist aus Warten

Der reine Ausstoß aller fünfzehn Wellen des Spiralhains beträgt **201
Sekunden** — im Mittel 13 Sekunden Gegnernachschub je Welle. Dazu kommt die
Laufzeit über 3942 Weltpunkte Bahn und die Zeit zwischen den Wellen.

In dieser Zeit trifft der Spieler nach Ausweis der Simulation **12
Bauentscheidungen und 24 Ausbauentscheidungen**, also 36 — gut zwei je
Welle, und die meisten davon früh, weil später das Gold ohnehin reicht.

### 2.8 Von fünf Zielmodi trägt einer gar nichts

```
Alleinsiege: vorn 4  stark 1  nah 0  schwach 3   (13 Wellen trennen ueberhaupt)
```

**„Nah" gewinnt keine einzige Welle allein.** Und nur 13 von 60 gefahrenen
Wellen werden von der Wahl überhaupt berührt; in den übrigen 47 ist der
Zielmodus eine Einstellung ohne Wirkung. Der Modus „hinten" ist aus genau
diesem Grund in v237 gestrichen worden — „nah" steht heute da, wo „hinten"
stand.

### 2.9 Zwei von vier Karten sind nicht auf drei Sterne spielbar

```
Spiralhain      bester Lauf: 3 Stern(e)
Ascheschlucht   bester Lauf: 3 Stern(e)
Frostspalte     bester Lauf: 2 Stern(e)
Farnkessel      bester Lauf: 2 Stern(e)
```

Die Hälfte des Spiels hat kein erreichbares Bestergebnis. Der Endlosmodus
endet bei Welle 19 — vier Wellen über dem Pflichtprogramm.

### 2.10 Was im Gefecht gut ist

Der Werkzeugkasten für Wucht ist da und wird benutzt: Bildschirmruckeln
(`s.shake`), **Trefferstopp** (die Simulation steht drei bis fünf Bilder
still), Trefferblitz an jeder Figur (`hitFlash`), Mündungsblitz, Partikel
nach Farbe gebündelt, siebzehn Geräusche.

**Es fehlt also nicht an Wucht, sondern an Anlass.** Ein Trefferstopp
braucht einen Treffer, der etwas bedeutet; ein Ruckeln braucht eine Gefahr.
Wenn dreizehn Wellen folgenlos sind, verpufft die beste Rückmeldung.

Was auf der Rückmeldungsseite trotzdem fehlt, ist die Ebene darüber:

* **Keine Wellenfortschrittsanzeige.** Während einer Welle steht nirgends,
  wie viele Gegner noch kommen. Die Vorschau „Als Nächstes" verschwindet
  beim Start und hinterlässt eine Lücke.
* **Der Hauptknopf ist während der Welle tot** („Welle läuft", ausgegraut) —
  an der prominentesten Stelle des Bildschirms steht die längste Zeit über
  eine Schaltfläche, die nichts tut.
* **Kein Ereignis wird benannt.** Kein „Welle überstanden", kein
  Fortschrittsbalken, keine Belohnungsmeldung. Der einzige Übergang ist,
  dass der Knopf wieder angeht.

---

## Teil 3 — Referenzabgleich (Schritt 0)

### Kingdom Rush — jede Welle kann wehtun, und man sieht sie kommen

Leben stehen auf 20, nicht auf 60. Ein einziger Durchbruch ist sichtbar
teuer. Vor jeder Welle zeigt ein Banner am Wegeingang, **was** kommt; die
Welle lässt sich früh starten und zahlt dafür Gold.

Was das tut: die Spannung entsteht aus Knappheit, nicht aus Menge. Und der
Frühstart ist eine echte Entscheidung — Risiko gegen Geld — die in *jeder*
Welle neu ansteht.

### Bloons TD 6 — die Entscheidung ist der Ausbaupfad, und er ist teuer

Drei Pfade je Turm, aber nur einer darf weit gehen. Die späte Stufe kostet
ein Vielfaches der frühen und verändert den Turm **qualitativ** — aus einem
Schützen wird etwas, das eine andere Aufgabe erfüllt.

Was das tut: die Entscheidung ist unumkehrbar *und* spürbar. Ein Spieler,
der falsch abbiegt, merkt es.

### Defense Grid — die Niederlage ist ein Verlauf, kein Schalter

Gegner tragen die gestohlenen Kerne zurück zum Ausgang. Solange sie leben,
kann man den Kern zurückholen. Ein Durchbruch ist damit ein **Ereignis mit
Verlauf**, kein stiller Abzug einer Zahl.

Was das tut: der schlimmste Augenblick des Spiels ist zugleich der
spannendste. Verlieren ist spielbar.

### Was alle drei gemeinsam machen

1. **Jede Welle kann etwas kosten.** Es gibt keine folgenlose Phase.
2. **Es gibt eine wiederkehrende Entscheidung**, die in jeder Welle neu
   ansteht (Frühstart, Fähigkeit, Zielprioritäten) — nicht nur beim Bauen.
3. **Ausbauten verändern die Rolle**, nicht die dritte Stelle.
4. **Der Durchbruch ist ein Ereignis**, das man sieht, hört und
   beantworten kann.
5. **Das Finale ist die schwerste Welle.**

---

## Teil 4 — Soll

| # | Soll | woher | heute |
|---|---|---|---|
| G1 | **Verluste verteilen sich über mindestens fünf Wellen**, und keine Phase von mehr als drei Wellen ist folgenlos | Kingdom Rush | 2 Wellen, 13 folgenlos |
| G2 | **Die Zweigwahl ändert das Ergebnis um mindestens 15 %** eines Kristalls | BTD6 | 5 % |
| G3 | **Kein einzelner Turmtyp schlägt das gemischte Feld** | alle drei | „nur Frost" ist der beste Lauf |
| G4 | **Der Abstand zwischen dem besten und dem schwächsten Spielstil beträgt mindestens 20 Punkte** | Handwerk | 9 |
| G5 | **Weniger als 20 % des Goldes bleiben liegen** | Kingdom Rush | 42 % |
| G6 | **Die Druckkurve steigt monoton**, und die letzte Welle ist die Spitze | alle drei | fällt 3–5 mal, Finale bei 72–93 % |
| G7 | **In jeder Welle steht eine Entscheidung an**, nicht nur beim Bauen | Kingdom Rush | keine |
| G8 | **Jeder Zielmodus gewinnt irgendwo allein** | Regel 5, sinngemäß | „nah" nirgends |
| G9 | **Jede Karte ist auf drei Sterne spielbar** | Handwerk | 2 von 4 |
| G10 | **Der Wellenfortschritt ist jederzeit ablesbar** | alle drei | nicht vorhanden |
| G11 | **Ein Durchbruch ist ein benanntes Ereignis** mit Bild und Ton, kein stiller Abzug | Defense Grid | still |
| G12 | **Der Hauptknopf ist nie tot** — während der Welle trägt er die nächste Handlung | Kingdom Rush (Frühstart) | ausgegraut |

**Zwölf Punkte, null erfüllt.** Das ist unangenehm und es ist genau der
Grund, warum die Empfindung „kaum Spielspaß" richtig ist: das Spiel ist
technisch sauber, gemessen bestanden und in fast jeder Genre-Kategorie
abgehakt — aber die Kennzahlen, die es prüft, prüfen Korrektheit, nicht
Spannung.

---

## Teil 5 — Was daraus folgt

Die Reihenfolge folgt aus der Abhängigkeit: Knappheit zuerst, dann
Entscheidungen, dann Rückmeldung.

1. **G1, G5, G6 — Knappheit herstellen.** Kristall herunter, Druckkurve
   monoton, Gold enger. Ohne Knappheit wirkt keine der übrigen Änderungen,
   weil nichts von ihnen etwas kosten kann. **Das ist der Schlüsselschritt**,
   und er hängt an `npm run sim`: die Karten müssen danach neu eingemessen
   werden.
2. **G7, G12 — die wiederkehrende Entscheidung.** Ein Frühstart mit
   Goldbonus gibt es bereits (`EARLY_BONUS_MAX`, `EARLY_BONUS_WINDOW`) —
   er steht nur nicht als Entscheidung im Bild. Das ist der billigste
   große Gewinn im ganzen Verzeichnis.
3. **G2, G3, G8 — die Entscheidungen schärfen.** Zweige, die die Rolle
   ändern statt der dritten Stelle; Gegner, gegen die eine Monokultur
   scheitert.
4. **G10, G11 — die Rückmeldung.** Sie ist zuletzt dran, weil sie etwas
   melden muss, das es vorher noch nicht gibt.
5. **G4, G9** fallen aus 1 bis 3 heraus und werden gemessen, nicht gebaut.

Die Pakete stehen als **F1 bis F8** im Rückstandsverzeichnis, jedes mit
Schließbedingung.
