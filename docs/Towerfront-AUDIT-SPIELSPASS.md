# Audit — Spielspaß, Entscheidungen und Verlauf

Stand: v353 · 13.09.2026

**Nachgesehen in v353 — keine Kennzahl dieses Audits hat sich bewegt, und der
Grund ist der wichtigste Satz, den es über diese Woche zu sagen gibt.** Die
Runden v347 bis v353 haben ausschließlich am Messgerät gearbeitet, weil die
zwei Fragen, die den Spielspaß noch tragen, **beim Nutzer liegen** und keine
Runde sie beantworten kann: die Machtkurve (S-N1-07) und ein Bild im neuen
Stil (S-N5-01b).

**Was diese Woche dafür geleistet hat, ist die Sichtbarkeit dieser Blockade.**
Bis v350 stand S-N1-07 im Katalog als **zu** — erfüllt hatte ihre Bedingung
das Messgerät, das in v339 gebaut wurde, um genau ihre Frage zu beantworten,
während ihre eigene Abnahme messbar offen ist (`Breite` bringt 0 von 9 Läufen
durch, N7B). `npm run naechste` bot daraufhin die daran hängende S-N1-05 an,
und der Grund für den Stillstand stand **in keiner Werkzeugausgabe**. Seit
v351 sagt die Kette es selbst.

**Die offene Ursache ist unverändert N1G und steht als Zahl da:** Schaden,
Takt, Reichweite und Beute sind Faktoren und verzinsen sich über sechzig Züge,
Gold und Kristall sind Summanden und tun es nicht — das Deck trägt
**Meister ×32,4, Breite ×1,83, Sparsam ×1,80**. Dieselbe Ursache trägt N7B
und N6S.

**Nachgesehen in v346 — die Kennzahlen dieses Audits sind seit v336 an einer
anderen Messstelle erhoben, und das ist beim Lesen mitzudenken:** `sim`
fährt seitdem **Läufe statt Partien**, also sechzig Wellen über vier
Abschnitte statt fünfzehn auf einer Karte. Sieben der zehn Spannungs-
kennzahlen haben dadurch neue Zahlen bekommen — „längste folgenlose
Strecke" springt von 13,0 auf 43,7 Wellen. Die alten Werte waren nie
falsch; sie beantworteten eine andere Frage (Regel 12).

**Was in v340 bis v346 dazukam, ist kein Spaß-Befund, sondern seine
Vorbedingung.** Der Stapel mischt Achsen, die sich verzinsen (Schaden,
Takt, Reichweite, Beute) mit solchen, die es nicht tun (Gold, Kristall) —
über sechzig Züge trägt das Deck **Meister ×32,4 gegen Breite ×1,83**
(N1G). Und der Weichenknopf, an dem die einzige echte Wegentscheidung des
Spiels hängt, sah bis v345 aus wie ein abgeschalteter Knopf (N4X). Beides
sind Antworten auf die Leitfrage dieses Audits: eine Entscheidung, die man
nicht als Entscheidung erkennt, ist keine.

**Nachgesehen in v339 — die Kennzahlen dieses Audits sind nicht mehr
dieselben Zahlen, obwohl sie dasselbe heißen.** Seit v336 misst `npm run sim`
LÄUFE statt Partien, und das verschiebt genau die Größe, um die es diesem
Audit geht: „längste folgenlose Strecke" stand über fünfzehn Wellen auf
**13,0** und steht über sechzig auf **43,7**. Die 13 war nie falsch — sie
beantwortete eine andere Frage.

**Damit ist der härteste Satz dieses Audits zum ersten Mal an der richtigen
Länge gemessen:** 43,7 Wellen ohne eine Folge sind kein Verlauf, sondern eine
Einführung mit Anhang (N1K). Was das Audit bisher als Zahl über eine Karte
führte, ist eine Aussage über den ganzen Lauf geworden.

**Und eine zweite Zahl steht seitdem auf UNBELEGT statt auf einem Wert:** der
Abstand der Spielstile. `Breite` bringt 0 von 9 Läufen durch, `Sparsam` 7,
`Meister` 9 — der Abstand beträge 22,22 und stünde zum ersten Mal auf
„ERREICHT". Eine Kennzahl, die sich durch einen scheiternden Bot verbessern
lässt, ist keine (v293). Als **N7B** im Verzeichnis.

**Nachgesehen in v332 — die Kennzahlen dieses Audits sind unverändert, und
was sich seit v325 geändert hat, ist wieder eine ganze Klasse.** Sieben Runden
(v326 bis v332) haben dasselbe getan wie die fünf davor, nur an einer anderen
Stelle: **sie haben Entscheidungen gebaut, wo vorher nur Ausführung war.**

| Runde | was hinzukam | welche Entscheidung es stellt |
|---|---|---|
| v327 | sechs Wirkungskarten (Brand, Markierung, Frost) | dieselbe Feuerkraft anders ausgeben — halten oder verteilen |
| v328 | der Sanitäter | wen zuerst, wenn der Pulk sich selbst heilt |
| v329 | der Hetzer | die gestellte Weiche wird bestraft, wenn sie falsch steht |
| v330 | die Monokulturwelle | eine Welle, die jede reine Turmsorte schlägt |
| v332 | sechs Vorzeichen | **wogegen** man baut, angesagt, bevor die Welle läuft |

**Gemessen ist bei allen fünf dasselbe Kriterium, und es ist nicht „wirkt":
es ist „ist von den anderen zu UNTERSCHEIDEN".** Sechs Wirkungskarten, null
Paare mit gleichem Abdruck über vier Karten (v327); vier reine Felder gegen
eine gemischte Welle, jede Monokultur verliert mehr (v330); sechs Vorzeichen,
null Paare mit gleichem Abdruck über vier reine Felder (v332). Zwei Dinge, die
dieselbe Antwort verlangen, sind ein Ding mit zwei Namen — dieselbe Zusage wie
bei den Zielmodi seit v223.

**Was dieses Audit an dem Zuwachs NICHT sieht, steht daneben und ist
gemessen:** die Spannungsratsche bewegt sich nicht. „Stellen mit Verlust"
steht auf 2 bei einem Soll von 5, „längste folgenlose Strecke" auf 13 bei
einem Soll von 3. Fünf Runden neue Mechanik haben diese zwei Zahlen um Null
verändert. **Das ist kein Widerspruch, sondern die Lage:** die Vorbilder
verteilen den Verlust über den Lauf, und der Lauf ist bis heute nur aus
`npm run sim` erreichbar (N1K, N1G). Solange der Spieler eine EINZELNE Karte
spielt, entscheidet ihre Wellenkurve die Verteilung, und keine neue Gegnerart
ändert daran etwas.

**Nachgesehen in v325 — die Zahlen dieses Audits sind unverändert; was sich
seit v318 geändert hat, ist eine ganze Klasse von Befunden, und sie gehört
hierher.** Fünf Runden hintereinander haben dasselbe Muster gerichtet: **das
Spiel tat das Richtige und sagte es nicht.**

| Runde | die Mechanik war richtig | gesagt hat sie es nicht |
|---|---|---|
| v317 | jeder Turm führte Schüsse, Schild- und Panzerungsverluste mit | die Zahlen standen in der Messtafel für Entwickler |
| v319 | die Wellenvorschau zeigte Bild und Marken jeder Gegnerart | ohne erklärenden Satz stand dort kein Wort |
| v321 | der Mörser kostete auch auf einer gesperrten Kachel 125 | der Grund trat an die Stelle des Preises |
| v322 | die Zielplattform stand, wo sie steht | die Kamera schnitt sie an, in allen vier Formaten |
| v325 | der Brocken flog genau in seinen Wirkkreis | über drei Viertel des Fluges gab es keine Linie dorthin |

**Das ist kein Zufall und auch kein Zeichen von Nachlässigkeit — es ist die
Folge davon, wie hier geprüft wird.** Zweiunddreissig Tore messen, ob etwas
FUNKTIONIERT; keines fragt, ob man es SIEHT. Genau deshalb kamen alle fünf
Befunde aus Inspektorläufen und keiner aus einer Zahl (Regel 8). Und dreimal
davon war der Befund des Inspektors in seiner Begründung falsch und in seinem
Urteil richtig: er hat den Meteor für zwei widersprüchliche Anzeigen gehalten,
die Kachel für unlesbar und die Vorschau für gegenstandslos — die Sache traf
er jedes Mal.

**Für den Spielspaß heißt das: die Lücke liegt nicht zwischen Können und
Ausführung, sondern zwischen Zustand und Auskunft.** Wer den Konter auswendig
lernen muss, statt ihn zu sehen, spielt ein anderes Spiel als der, dem das
Bild es sagt — und beide sehen in jeder Messung gleich aus.

**Nachgesehen in v318 — ein Befund dieses Audits ist zugefallen, und zwei
Zahlen darin sind heute von einem Tor gehalten.**

* *„Man sieht nicht, ob der Mörser etwas taugt — die Zahlen dazu stehen in
  der Messtafel für Entwickler und nirgends sonst."* Seit **v317** steht die
  Wirkungsbilanz am Turm: Angerichtet, Verpufft, Schild schluckt, Panzerung
  frisst, Ohne Luftziel. **Die zweite Hälfte ist die wichtigere** — warum ein
  Schuss nichts bewirkt hat. Ohne sie ist der Konter etwas, das man auswendig
  lernt, statt es zu sehen.
* Gebucht wird in denselben Zeilen wie die Summe, und der Rauchtest hält
  nach, dass die Anzeige genau die Zahl zeigt, die `npm run geschosse` misst
  — zwei Zählwerke für dieselbe Sache wären Regel 15 in Reinform.

**Unverändert offen bleibt, was dieses Audit zuerst gesagt hat:** der
Genre-Abgleich steht auf 30 von 30, und das Spiel macht trotzdem wenig Spaß.
Die Tore prüfen Korrektheit, nicht Spannung.

**Nachgesehen in v311 — der Lauf ist zum ersten Mal ein Bogen und nicht vier
Partien hintereinander.** Gemessen über einen vollen Lauf mit Deck
(`npm run sim -- --lauf`):

| Abschnitt | Rampe | Ergebnis | Kristall verloren |
|---|---|---|---|
| 1 · Spiralhain | 1,00 | gewonnen | **0** |
| 2 · Ascheschlucht | 1,30 | gewonnen | **0** |
| 3 · Frostspalte | 1,69 | gewonnen | **7** |
| 4 · Ascheschlucht | 2,20 | gewonnen | **11** |

60 von 60 Wellen, 1316 s, 60 Karten gezogen. **Zwei Abschnitte kosten noch
nichts**, und genau das steht als N1K offen — erlaubt ist einer.

**Der Befund, der am meisten über den Spielspaß sagt, ist aber ein anderer:**
die drei Spielstile laufen über einen Lauf weit auseinander. Bei Steigung 1,6
gewinnt `Meister` alle vier Abschnitte und `Breite` nur zwei. Über eine
einzelne Karte messen sie sich mit 8,20 Punkten Abstand (M18) — über sechzig
Wellen entscheidet derselbe Unterschied über den Lauf. Die Ursache steht als
**N1G**: Gold und Beute kaufen Türme, die Turmzahl ist begrenzt, also kauft
diese Achse nach dem Ausbau nichts mehr.

**Was das für die Frage dieses Audits heißt:** die Entscheidung je Welle ist
gebaut und misst sich (12 von 12 Karten werden genommen, 0 von jedem immer),
die Entscheidung je Abschnitt auch (Spreizung 142,4). Was fehlt, ist nicht
noch eine Entscheidung, sondern dass **jede Spielweise über einen ganzen Lauf
trägt**.

**Nachgesehen in v304 — das Spiel hat zum ersten Mal eine Entscheidung je
WELLE, und der Lauf hat gesagt, was ihm fehlt.**

Der **Kartenzug** (v303) liegt zwischen zwei Wellen: drei Karten aus zwoelf,
eine wird genommen. Gemessen ueber einen ganzen Lauf und drei Stile werden
**12 von 12 Karten von mindestens einem Stil genommen und 0 von jedem immer** -
die Wahl ist also keine Reihenfolge. Die Stile trennen sich sauber: Meister
nimmt Wucht und Schliff, Breite Hort und Pacht, Sparsam Warte und Linse.

Das ist die Antwort auf den zentralen Befund dieses Audits ("gut zwei
Entscheidungen je Welle, meistens frueh"): jetzt ist es mindestens eine je
Welle, und sie liegt genau dort, wo vorher nichts war.

**Der Lauf selbst ist seit v302 ein Zustand** - und der erste kopflos
gefahrene hat sofort gesagt, was ihm fehlt: Rampe **1,00 / 1,12 / 1,82 /
15,17** ueber die vier Abschnitte, die ersten drei mit 42 von 42 Kristall
gewonnen, der vierte in Welle 7 verloren. **Drei Spaziergaenge und eine Wand.**
Die Lebenskurve ist an EINER Karte mit 15 Wellen geeicht; ueber 60 gestreckt
liegen drei Abschnitte im flachen Teil und einer im Knie. Steht als N1K im
Verzeichnis.

**Nachgesehen in v297 — der wichtigste Satz steht unveraendert, und die
Antwort darauf hat sich in v291 bis v297 gedreht.**

Bis v290 lautete die Erklaerung: „bei 28 % uebrigem Gold ist ein Preis
folgenlos". **Diese Zahl war gar keine Aussage ueber das Spiel** (v291): die
Bots tragen `maxTowers: 12`, eine Selbstbeschraenkung gegen rund zweihundert
Bauplaetze. Ohne Deckel bleiben **−3 bis 16 %** liegen. Nur: wer 29 bis 41
Tuerme baut, verliert (Spiralhain 27 → 0), weil die weiteren Plaetze zu wenig
sehen und das Gold beim Ausbauen fehlt.

**Und die Turmwahl ist der fehlende Grund nicht** (v293): ein eigenes
Sortiment fuer `Breite` liess den Abstand der Spielstile Punkt fuer Punkt auf
8,20 stehen. Vier Geschuetze, und welches man baut, macht sechs Punkte aus.

**Was traegt, ist die LAGE** (v295, Bannturm): derselbe Turm, dasselbe Gold,
dieselbe Welle — auf dem Spiralhain **11 Kristall unbedacht gebaut gegen 29
ins Nest gebaut**, gegen 27 ganz ohne ihn. **18 Punkte Spanne durch die
Lage**, wo die ganze Turmwahl sechs entscheidet. Das ist der erste
Gegenbeleg zu M18 und zeigt, wo Spannung in diesem Spiel wirklich sitzt.

**Der Wiederholungsaufschlag ist seit v297 scharf** (0,10, Kette gruen) und
kostet etwas, das dieses Audit angeht: die **duenne Zeit** steigt monoton von
14,7 auf 17,1 %, weil ein Aufschlag den Bot frueher zur naechsten Turmart
treibt, ein gemischtes Feld schneller toetet und ein Feld, das schneller
toetet, oefter leer ist. **Vielfalt und volles Feld ziehen gegeneinander.**

**Nachgesehen in v290 — der wichtigste Satz dieses Audits hat in v285 bis
v290 zwei harte Zahlen bekommen.** Er lautet: der Genre-Abgleich steht auf 30
von 30, und das Spiel macht trotzdem wenig Spass. Gemessen ist jetzt, woran
das in Paket N3 liegt:

* Der **Förderer** (v285) bringt −1,8 bis +2,4 % Gold.
* Der **Wiederholungsaufschlag** (v287) nimmt dem Häufer 693 Gold ab und
  ändert am Ergebnis 0 / −6 / 0 / +1 Kristall.

Beide wirken, beide entscheiden nichts — **bei 28 % übrigem Gold ist ein Preis
folgenlos**. Die **Werft** (v290) ist der erste Baustein des Pakets, der die
Zahl bewegt: sie gibt je Welle Kristall zurück, kostet dafür einen Bauplatz
(auf dem Spiralhain −6 Kristall, weil sie Feuerkraft ersetzt) und macht einen
Durchbruch nicht folgenlos — am Ende der besten Partie fehlen weiter vier
Punkte.

Was das für dieses Audit heisst: **Spannung entsteht nicht durch Preisregeln,
sondern durch eine Verwendung für Gold, die mit dem Bauen konkurriert.**


**Nachgesehen in v283:** unveraendert gueltig, und der Kernsatz erst recht -
der Genre-Abgleich steht auf 30 von 30, und das Spiel macht trotzdem wenig
Spass. **Eine seiner Zahlen hat sich seit v280 zum ersten Mal bewegt, und
zwar in die richtige Richtung:** der Abstand der Spielstile stand auf 12,43
und steht jetzt auf 13,15 - die Weichen sind die erste Entscheidung, an der
sich zwei Bots ueberhaupt unterscheiden koennen, ohne dass einer schlechter
spielt. Zum Soll von 20 ist es weit; das Rauschen der Kennzahl liegt bei
3,17, die Bewegung ist also noch keine Aussage. Dieses Dokument ist die
Diagnose, nicht der Plan - was daraus folgt, steht in
`Towerfront-NEUBAU.md`.

**Nachgesehen in v269:** dieses Audit hat die Diagnose gestellt, aus der der
Neubau folgt — „der Genre-Abgleich steht auf 30 von 30, und das Spiel macht
trotzdem wenig Spaß". Seine Befunde gelten unverändert. Was der Referenzabgleich
in `Towerfront-NEUBAU.md` hinzufügt, ist die **Ursache**, die hier noch fehlte:
alle drei Vorbilder machen den WEG zur Entscheidung, keiner den Turm.

**Der schlimmste Augenblick des Spiels war der ereignisloseste — seit v262
nicht mehr.** Ein durchgekommener Gegner war ein Abzug: Kristall herunter,
Ruckeln, Gegner tot. Jetzt nimmt er einen Splitter und laeuft damit hinaus;
wer ihn erwischt, bekommt die Punkte zurueck. Gemessen hebt das den
Stilabstand von 9,3 auf **12,4** und die erste Karte von 7 auf **15 von 42**
Kristall (C18). Die Zahlen der Teile 2 und 3 unten sind damit teilweise
ueberholt; was gilt, sagt `npm run sim`.

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

### 2.6 Die Druckkurve fällt am Ende ab — und diese Zahl war falsch gemessen

Aus dem Wellenplan gerechnet (`wellenDruck` — Lebenspunkte, die eine Welle
aufs Feld bringt, Zerfallende mitgezählt):

| Karte | Rückfälle | größter Rückfall | letzte Welle gegen die Spitze |
|---|---|---|---|
| Spiralhain | 3 von 14 | −43 % bei W10 | 76 % (Spitze W9) |
| Ascheschlucht | 3 von 14 | −48 % bei W12 | 89 % (Spitze W11) |
| Frostspalte | 5 von 14 | −43 % bei W13 | 72 % (Spitze W9) |
| Farnkessel | 5 von 14 | −59 % bei W13 | 93 % (Spitze W14) |

**Daraus stand hier: „Auf keiner der vier Karten ist die letzte Welle die
schwerste." Das ist falsch, und der Fehler ist meiner** (bemerkt in v240).

Der Druck einer Welle ist nur EIN Faktor der Schwierigkeit. Der andere ist
`hpScale` — die Lebenspunkte jedes Gegners werden mit ihr multipliziert, und
sie steigt über einen Lauf von 1 auf über 20. Was ein Spieler erlebt, ist das
Produkt. Dieselben Pläne, mit der Skala gerechnet:

| Karte | Rückfälle | größter Rückfall | letzte Welle gegen die Spitze |
|---|---|---|---|
| Spiralhain | **1** | −19 % | **81 %** |
| Ascheschlucht | **2** | −29 % | **100 %** |
| Frostspalte | **2** | −27 % | **94 %** |
| Farnkessel | **3** | −48 % | **96 %** |

**Auf der Ascheschlucht IST das Finale die Spitze**, und die übrigen liegen
zwischen 81 und 96 % statt zwischen 72 und 93. Die Kurve ist unruhiger, als
sie sein sollte — aber sie bricht nicht ein, und der Höhepunkt liegt nicht in
der Mitte.

Regel 12, diesmal gegen den eigenen Befund: die Zahl war nicht falsch
gerechnet, sie stand an der falschen Stelle. Seit v240 misst
`tools/wellenmass.ts` beides und der Wächter hält die **wirksame** Kurve als
Ratsche je Karte.

### 2.7 Ein Durchgang dauert lange und besteht meist aus Warten

Der reine Ausstoß aller fünfzehn Wellen des Spiralhains beträgt **201
Sekunden** — im Mittel 13 Sekunden Gegnernachschub je Welle. Dazu kommt die
Laufzeit über 3942 Weltpunkte Bahn und die Zeit zwischen den Wellen.

~~In dieser Zeit trifft der Spieler nach Ausweis der Simulation **12
Bauentscheidungen und 24 Ausbauentscheidungen**, also 36 — gut zwei je
Welle, und die meisten davon früh, weil später das Gold ohnehin reicht.~~

**Dieser Absatz war falsch, und v254 hat es gemessen.** Die 36 sind zwei
**Summenfelder des Ergebnisses**; *wann* die Entscheidungen fallen, hat hier
niemand gezählt — es war eine Vermutung mit zwei belastbaren Zahlen davor.
Gezählt am Bot über drei Aussaaten × drei Abwandlungen:

| | behauptet | **gemessen (v254)** |
|---|---|---|
| Entscheidungen gesamt | 36 | **55,2** |
| je Welle | „gut zwei" | **3,7** |
| in der ersten Hälfte | „die meisten" | **51 %** |
| Wellen ohne jede Entscheidung | — | **0,0 von 15** |

Weder zwei je Welle noch „meistens früh". Der Befund von Teil 1 wird davon
nicht besser: es fallen genug Entscheidungen, sie **wirken** nur nicht
(G2 — alle vier Zweigpaare liegen unter ihrem eigenen Rauschen).

**Und die Dauer stand nirgends** (v255): Spiralhain **470 s**, Frostspalte
398, Ascheschlucht 287, Farnkessel 276 — gegen 201 Sekunden reinen Ausstoß.
Der Leerlauf des Bots beträgt 0,1 %, misst aber den Bot: er startet jede
Welle in demselben Bild, in dem er es darf. Was ein Spieler als Warten
erlebt, steht daneben als **dünne Zeit** — höchstens ein Gegner auf dem
Feld, gemessen **17,5 / 19,7 / 16,8 / 23,2 %**.

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

| # | Soll | woher | v238 | v248 |
|---|---|---|---|---|
| G1 | **Verluste über mindestens fünf Wellen**, keine folgenlose Phase von mehr als drei | Kingdom Rush | 2 Stellen, 29 % in der letzten | **2 Stellen** (W14:10 W15:7) — offen |
| G2 | **Die Zweigwahl ändert das Ergebnis um mindestens 15 %** | BTD6 | 5 % | **unbelegt** — die 18 % beim Mörser waren eine Zahl aus einer Aussaat; über sieben gemessene Aussaaten bleiben **8 %**, und auf einer ist der Zweig mit dem höheren Wert der schwächere. Siehe Anforderungskatalog 2.1 |
| G3 | **Kein einzelner Turmtyp schlägt das gemischte Feld** | alle drei | „nur Frost" 50 gegen 43 | **11 gegen 43** — erfüllt in v244, und der Wächter misst jetzt gegen das gemischte Feld statt gegen eine Zahl |
| G4 | **Abstand zwischen bestem und schwächstem Spielstil ≥ 20 Punkte** | Handwerk | 9 | **6 bis 10 je nach Aussaat** — und die Robustheitsmessung meldet im selben Lauf 5 bis 7 Punkte Streuung bei *identischen* Eingaben. Der gesuchte Effekt ist kleiner als das Rauschen des Verfahrens; G4 ist heute nicht messbar |
| G5 | **Weniger als 20 % des Goldes bleiben liegen** | Kingdom Rush | 42 % | **35,2 %** (v253, drei Aussaaten × drei Abwandlungen über alle drei Stile) — offen. Die 43 % stammten aus **einem** Lauf des gemischten Feldes |
| G6 | **Die Druckkurve steigt monoton**, letzte Welle ist die Spitze | alle drei | wirksam 1–3 Rückfälle, Finale 81–100 % | unverändert — die Ratsche aus v240 hält es, der Hebel ist das Knie und nicht der Plan (F9) |
| G7 | **In jeder Welle steht eine Entscheidung an** | Kingdom Rush | keine | **der Frühstart steht im Wellenknopf** (v243) — erfüllt, das Risiko fehlt (F10) |
| G8 | **Jeder Zielmodus gewinnt irgendwo allein** | Regel 5 | „nah" nirgends | „nah" 1, **„stark" 0** — der Punkt ist gewandert, nicht verschwunden (F6) |
| G9 | **Jede Karte ist auf drei Sterne spielbar** | Handwerk | 2 von 4 | **4 von 4** — erfüllt in v246, und es war ein Messfehler, kein Balancefehler |
| G10 | **Der Wellenfortschritt ist jederzeit ablesbar** | alle drei | nicht vorhanden | **„Welle 3 · noch 12" im Hauptknopf** (v239) — erfüllt |
| G11 | **Ein Durchbruch ist ein benanntes Ereignis** | Defense Grid | still | **die Zahl in der Kopfzeile schlägt aus** (v239) — erfüllt |
| G12 | **Der Hauptknopf ist nie tot** | Kingdom Rush | ausgegraut, „Welle läuft" | erfüllt in v239, seit v243 trägt er zusätzlich das Frühstart-Fenster |

**Beim Abgleich in v238: zwölf Punkte, null ganz erfüllt** — und einer davon,
G6, stand nach einer falsch gemessenen Zahl schlimmer da, als er ist (siehe
2.6). Das war der Grund, warum die Empfindung „kaum Spielspaß" richtig war:
das Spiel war technisch sauber, gemessen bestanden und in fast jeder
Genre-Kategorie abgehakt — aber die Kennzahlen, die es prüfte, prüften
Korrektheit, nicht Spannung.

**Berichtigt am 08.09.2026, noch am selben Tag.** Die zwei Zeilen zu G2 und G4
standen eine Fassung lang mit Zahlen aus **einer einzigen Aussaat** da —
`tools/sim.ts` fährt genau eine (`SEEDS = [20260807]`), und die Zweigtabelle
ist die einzige Kennzahl der Datei, die gar nicht mittelt. Nachgemessen über
sieben Aussaaten ist G2 unbelegt statt teilweise erfüllt, und G4 ist nicht
messbar statt schlecht. Dieselbe Klasse wie der Fund in v246 — eine Messung,
die weniger trägt, als der Satz daneben behauptet, und diesmal war der Satz
meiner.

**Stand v248: fünf erfüllt, sechs offen, einer nicht messbar.** Erfüllt
sind die fünf, an denen etwas SICHTBAR wurde (G7, G10, G11, G12) oder an denen
eine Regel dazukam, die das Mischen belohnt (G3). Offen sind die, die an der
**Knappheit** hängen: G1, G4 und G5 messen alle dasselbe von drei Seiten — der
Bot beendet die Partie mit 43 % ungenutztem Gold, also kostet nichts etwas,
also gibt es keine Spannung. Das ist weiterhin der Schlüsselschritt, und er ist
in diesen sieben Fassungen **nicht** angefasst worden: er verlangt, jede Karte
neu einzumessen.

**Zwei Punkte sind dabei genauer geworden statt erledigt**, und das ist der
ehrlichere Ausgang: G8 ist gewandert („nah" hat jetzt einen Alleinsieg, „stark"
keinen — die Vermutung aus v239, der Aurendeckel schliesse ihn von selbst, ist
damit gemessen widerlegt), und G4 ist **schlechter** geworden, weil der Verbund
die schwächeren Spielstile mithebt.

---

## Teil 5 — Was daraus folgt

Die Reihenfolge folgt aus der Abhängigkeit: Knappheit zuerst, dann
Entscheidungen, dann Rückmeldung.

1. **G1 und G5 — Knappheit herstellen.** Kristall herunter, Gold enger. (G6
   ist nach der Korrektur in 2.6 der kleinste der drei: die wirksame Kurve
   bricht nicht ein.) Ohne Knappheit wirkt keine der übrigen Änderungen,
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
