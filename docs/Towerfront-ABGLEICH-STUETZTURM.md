# Referenzabgleich — Stützturm (C3, „Bannturm")

Stand: v272 · 08.09.2026

**Nachgesehen in v272:** unveraendert offen als C3. Die Schliessbedingung des Punktes ist nachgefahren - `"Bannturm"` kommt in `src/data/towers.ts` **null mal** vor.

**Nachgesehen in v265:** unveraendert offen als C3 — den Bannturm gibt es nicht.

**Nachgesehen in v258:** unverändert offen als C3 — den Bannturm gibt es nicht,
und die Schließbedingung des Punktes sagt es (`"Bannturm" >= 1` in
`src/data/towers.ts`, gemessen 0). Der Verbund aus v244 ist etwas anderes: er
verstärkt über Turm-VIELFALT, nicht über einen eigenen Turm.

Schritt 0 des Durchgangs, nach `docs/Towerfront-SOLL-UND-BETRIEB.md` Teil 2.
Er stand aus: C3 ist seit v40 im Rückstandsverzeichnis, und ein Soll dafür
gab es nie — nur den Satz „Bannturm: kein Schaden, verstärkt benachbarte
Türme". Was der Turm **tun** soll, stand nirgends.

---

## Schritt 1 — Referenz benennen

Drei Spiele, und für jedes: was tut es tatsächlich.

### Bloons TD 6 — Monkey Village

Ein eigener Turm, der **nichts abschießt**. Er gibt jedem Turm in seinem
Umkreis mehr Reichweite und mehr Durchschlag; die Ausbauten fügen Tarnsicht,
Preisnachlass und weitere Verstärkungen hinzu.

Was er dadurch tut, ist wichtiger als was er gibt: **er dreht die
Reihenfolge des Bauens um.** Ohne ihn setzt man Türme dorthin, wo der Weg
ist. Mit ihm setzt man zuerst das Dorf und dann die Türme **hinein** — der
Bauplatz wird von einer Frage an den Weg zu einer Frage an den eigenen
Aufbau. Der Preis dafür ist hart und sichtbar: das Dorf steht auf einem
Platz, der sonst geschossen hätte.

### Plants vs. Zombies — Torchwood

Eine Pflanze, die selbst nichts tut, aber jede Erbse, die sie **durchquert**,
in Brand setzt und ihren Schaden verdoppelt.

Der Unterschied zum Dorf ist der entscheidende: die Wirkung ist nicht
kreisförmig, sondern **gerichtet**. Sie hängt daran, wo im Lauf der Geschosse
das Ding steht — hinter den Schützen wirkt es, vor ihnen nicht. Das macht
aus einer Umkreisfrage eine Reihenfolgefrage, und man sieht sie: die Erbsen
ändern ihre Farbe.

### Dungeon Defenders — Buff Beam (Series EV)

Ein Balken, den man auslegt; Türme, die **darauf** stehen, feuern schneller
und härter. Er kostet laufend Mana, also hält man ihn nur unter den Türmen,
die es wert sind.

Er tut ein drittes Ding: er zwingt zur **Auswahl**. Nicht alle Türme kriegen
die Verstärkung, sondern die, für die man sie bezahlt. Und wieder ist die
Wirkung zu sehen, ohne eine Zahl zu lesen — die verstärkten Türme stehen
sichtbar im Strahl.

---

## Schritt 2 — Soll ableiten

Aus dem, was die drei **tun**, nicht aus dem, was sie geben:

| # | Soll | woher |
|---|---|---|
| S1 | Der Stützturm ist ein **eigener Bauplatz**, kein Zweig eines Schützen. Wer ihn setzt, gibt eine Schussposition auf | alle drei; das Dorf am deutlichsten |
| S2 | Er **verändert, wohin gebaut wird** — nicht nur, wieviel Schaden herauskommt. Messbar an der Verteilung der Türme im Feld | Monkey Village |
| S3 | Seine Wirkung ist **auswählend**, nicht allgemein: sie trifft einige Türme und andere nicht, und das hängt an der Lage | Buff Beam, Torchwood |
| S4 | Man **sieht**, wer verstärkt ist, ohne eine Zahl zu lesen | alle drei |
| S5 | Er ist eine **Wette**: bei wenigen Türmen ein Verlust, bei vielen dichten ein Gewinn. Es darf keine Lage geben, in der er immer richtig ist | Dorf und Balken kosten beide einen Platz bzw. laufend Mana |
| S6 | Die Verstärkung **stapelt sich nicht** ins Unsinnige — zwei Stützen über demselben Turm sind nicht doppelt so gut | Bloons deckelt das Dorf ausdrücklich |

## Schritt 3 — Abstand messen

| # | Soll | heute | Abstand |
|---|---|---|---|
| S1 | eigener Bauplatz | **fehlt** — kein Turm im Spiel verzichtet auf Schaden | ganz |
| S2 | ändert die Bauverteilung | Bauplätze werden heute **einzeln** bewertet; kein Turm gibt einem Nachbarn etwas | ganz |
| S3 | auswählende Wirkung | die einzige Umkreiswirkung im Spiel ist der **Schildträger** — und der gehört den Gegnern (v110) | ganz |
| S4 | sichtbar ohne Zahl | **das Muster steht schon**: der Schildträger trägt einen gestrichelten Ring und Fäden zu denen, die er versorgt | keiner — übertragbar |
| S5 | echte Wette | — | ganz, und es ist die eigentliche Frage |
| S6 | kein Stapeln | — | ganz |

**Der Abstand ist bei fünf von sechs Punkten der volle.** Bei S4 ist er null:
die Antwort steht seit v110 im Spiel, nur auf der anderen Seite des Feldes.
Was der Schildträger für die Gegner tut — Nachbarn versorgen, sichtbar, mit
Ring und Fäden —, tut der Bannturm für die Türme. Das ist kein Zufall,
sondern das Argument dafür, dass die Mechanik in dieses Spiel gehört: sie ist
schon da und wird bisher nur gegen den Spieler gespielt.

## Schritt 4 — was das für den Auftrag heißt

Zwei Dinge, und nur eines davon lässt sich heute bauen.

**Die Figur ist blockiert, und zwar gemessen.** Ein fünfter kaufbarer Turm
steht in `TOWER_ORDER`; `tools/smoke.ts:1607` meldet dann „Turmbild fehlt",
und `npm run lesbarkeit` misst die Silhouetten **untereinander** — ein Turm,
der das Bild eines anderen mitbenutzt, käme dort auf 1,00 gegen eine Grenze
von 0,65. Es ist derselbe Vorlauf wie bei C16, und er ist nicht zu umgehen.
Der Bildauftrag steht in `docs/Towerfront-BILDAUFTRAG.md` §6.7.

**Die Zahlenfrage ist nicht blockiert** — und nach S5 ist sie die eigentliche
Frage. Wieviel Verstärkung macht aus einem verschenkten Bauplatz eine Wette,
die man eingehen will, ohne dass sie zur einzig richtigen Antwort wird? Das
ist an der Simulation zu messen, bevor es ein Bild gibt. Genau so ist C16
vom „reinen Luftturm" auf eine gemessene Luftverteilung gekommen.

---

# Die Zahlenfrage — gemessen, nicht geschätzt

S5 verlangt eine **Wette**: bei wenigen Türmen ein Verlust, bei vielen dichten
ein Gewinn. Ob es die überhaupt geben kann, hängt an einer Zahl, die man
messen kann — wieviele Türme ein Umkreis im wirklichen Feld fasst.

**Messstelle:** drei Karten, Bauplätze aus `tools/spots.ts`, Türme mit
`GameState.build` gesetzt (also mit Platzbedarf, Wegabstand und Gelände).
Die untere Reihe sind Felder, die der Bauplatzwähler gestellt hat — der
kennt keinen Bannturm und baut deshalb *unbedacht*. Die obere ist, wieviele
Türme in einem Umkreis wirklich stehen können.

| Radius | unbedacht | absichtlich | Faktor |
|---|---|---|---|
| 110 | 1,1 | 2,3 | 2,1 |
| 150 | 1,9 | 4,3 | 2,3 |
| 190 | 2,2 | 5,3 | 2,4 |
| 230 | 3,0 | 6,0 | 2,0 |
| 270 | 3,3 | 7,7 | 2,3 |

**Der Faktor liegt über alle Radien bei rund 2,2.** Wer für den Bannturm
baut, verdoppelt, was er erreicht — die Wette aus S5 ist also möglich, und
zwar unabhängig davon, welchen Radius man wählt. Das ist der Befund, der den
Turm rechtfertigt; ohne ihn wäre er Dekoration.

**Der erste Versuch dieser Messung war keiner** (Regel 13): er zählte
*Bauplätze* im Umkreis und kam auf 24 bis 63. Das ist nicht die Dichte des
Feldes, sondern die des Rasters — die Plätze liegen wenige Punkte
auseinander, ein Turm beansprucht Boden und sperrt seine Nachbarn aus.
Gemessen wird jetzt, was wirklich stehen kann.

## Daraus die Stärke

Türme kosten auf Stufe 1: Bogen 55, Frost 80, Mörser 125, Prisma 140. Der
Bannturm verdrängt keinen Bauplatz — davon gibt es Hunderte —, sondern
**Gold**. Bei einem Preis von 90 kostet er 1,64 Bogentürme.

Bei einer Verstärkung *b* auf *N* erreichte Türme lohnt er sich ab
`b · N ≥ 1,64`:

| Radius 190 | erreicht | nötige Verstärkung |
|---|---|---|
| unbedacht gebaut | 2,2 | **+74 %** |
| absichtlich gebaut | 5,3 | **+31 %** |

**Vorschlag: Radius 190, +40 % Feuerrate, Preis 90.** Damit bringt der
unbedachte Aufbau 0,88 Bogentürme für 1,64 — ein spürbarer Verlust —, der
absichtliche 2,12 — ein klarer Gewinn. Genau die Spanne, die S5 verlangt.

Zu S6: zwei Bannmale über demselben Turm dürfen sich nicht summieren. Der
zweite zählt halb, weiter gestapelte gar nicht — sonst wird aus der Wette
eine Rechenaufgabe.

**Was davon noch nicht geprüft ist:** die Simulation. Die Zahlen oben sind
Geometrie und Gold, nicht gespielte Wellen. Sobald der Turm baubar ist, gilt
Regel 9 — `npm run eichen` über die Verstärkung, bevor irgendetwas
festgeschrieben wird. Die Werte hier sind der Startpunkt der Suche, nicht ihr
Ergebnis.


---

## Nachtrag v244 — dieselbe Frage, eine andere Antwort

Der **Verbund** (F4) beantwortet einen Teil dessen, wofür dieses Blatt den
Bannturm entworfen hat — und zwar ohne einen fünften Turm.

Jeder Turm zählt, wieviele **andere Turmarten** in 260 Weltpunkten stehen,
und bekommt je Art +20 % Schaden, höchstens drei. Der Anlass war ein anderer
als der hier beschriebene: „nur Frost" war mit 50 von 60 Kristall die stärkste
Aufstellung des Spiels, gegen 43 im gemischten Feld. Gesucht war eine Regel,
die das Mischen belohnt; gefunden wurde eine, die den Bauplatz zu einer Frage
an den **eigenen Aufbau** macht — genau das, was Schritt 1 am Monkey Village
als das Wichtige benannt hat.

**Was er vom Bannturm übernimmt:**

| | Bannturm (entworfen) | Verbund (gebaut) |
|---|---|---|
| Bauplatz wird eine Frage an den eigenen Aufbau | ja | ja |
| Sichtbare Verbindung zwischen zwei Figuren | Bannmal | Fäden, wie beim Schildträger |
| Stapelt nicht beliebig | zweiter zählt halb | zweite Art derselben Sorte zählt gar nicht |
| Gemessen statt geschätzt | offen | Stufe über sechs Werte durchprobiert |

**Was er NICHT beantwortet, und was damit offen bleibt:** der Bannturm kostet
**Gold und einen Bauplatz** — er ist eine Wette, die schiefgehen kann. Der
Verbund kostet nichts als Aufmerksamkeit; er ist eine Belohnung für gutes
Stellen, keine Entscheidung gegen etwas anderes. S5 dieses Blattes („der
unbedachte Aufbau muss ein Verlust sein") ist damit ausdrücklich **nicht**
erfüllt.

C3 bleibt also offen — aber der Teil davon, der „das Mischen muss sich lohnen"
heisst, ist beantwortet, und die Zahlen dafür stehen in `src/game/verbund.ts`.


---

## Nachtrag v251 — was der Verbund inzwischen sichtbar macht

Der Nachtrag oben (v244) hält fest, dass der Verbund einen Teil dessen
beantwortet, wofür dieses Blatt den Bannturm entworfen hat. Seither ist die
**Sichtbarkeit** dazugekommen, und die war der eigentliche Prüfstein:

* **v245** — die Turmwahl trägt, was diese Sorte an **dieser Stelle** bekäme.
  Damit steht die Auskunft vor der Entscheidung statt danach; genau das
  verlangt Schritt 2 dieses Blattes vom Bannturm („der Bauplatz wird von einer
  Frage an den Weg zu einer Frage an den eigenen Aufbau" — das geht nur, wenn
  man die Antwort vorher sieht).
* **v247/v248** — das Turmmenü zeigt das Bild seines Turms, und die zwei
  Zweige sagen in Zahlen, worin sie sich unterscheiden.

**S5 bleibt unerfüllt, und das ist unverändert der Kern:** der Bannturm kostet
Gold und einen Bauplatz — er ist eine Wette, die schiefgehen kann. Der Verbund
kostet nur Aufmerksamkeit. Solange das so ist, ist er eine Belohnung für gutes
Stellen und keine Entscheidung gegen etwas anderes. C3 bleibt offen.
