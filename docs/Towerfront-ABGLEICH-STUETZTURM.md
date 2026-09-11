# Referenzabgleich — Stützturm (C3, „Bannturm")

Stand: v335 · 11.09.2026

**Nachgesehen in v335 — und der Bannturm hat seine Bestellung verloren und
eine neue bekommen.** Sein Bildauftrag stand seit v295 als `8d.4` mit
`33_bannturm.png`; v328 hat dem Sanitäter dieselbe Nummer **und** denselben
Dateinamen gegeben, ohne dass es jemandem auffiel. Eine Gegenprobe, die
`### 8d.4` greift, traf seitdem den falschen Abschnitt und schwieg — der
Nachtlauf hat sie in v334 als gegenstandslos gemeldet. Der Auftrag heißt
jetzt **8d.6** und **`35_bannturm.png`**, und `npm run doku` prüft seither,
dass keine zwei Aufträge dieselbe Kennung oder denselben Dateinamen tragen.

**An der Sache selbst hat sich nichts geändert, und das ist der Punkt:** der
Bannturm ist seit v295 gebaut, gemessen und von Wächtern gehalten — der
Schalter steht auf null, weil die Bauleiste kein siebtes Bauwerk trägt
(gemessen fallen mit sieben Knöpfen alle vier UX-Zustände). Das ist eine
Entscheidung über die Oberfläche und keine über den Turm. **Was v334 dazu
beigetragen hat, ist kein Fortschritt am Turm, sondern die Erkenntnis, dass
sein Auftrag zwei Fassungen lang unter einer fremden Kennung lag.**

**Nachgesehen in v328 — und diesmal ist etwas dazugekommen, das den Stützturm
wirklich betrifft.** Mit **S-N6-01** (v327) gibt es sechs Karten, die das
Verhalten ändern statt einer Zahl, und zwei davon sind Stützwirkungen:
**Raureif** verlängert jede Bremse, **Eisgriff** macht aus zwei Bremsen einen
Stillstand. Damit hat der Frostturm zum ersten Mal Material, das ihn vom
Beiwerk zum Träger macht — und zwar ohne einen neuen Turm.

**Das verschiebt die Frage hinter C3.** Sie hiess „fehlt ein fünfter Turm, der
stützt statt zu töten"; sie heisst jetzt „fehlt er noch, wenn der vorhandene
Stützturm über Karten wachsen kann". Gemessen ist das noch nicht: die sechs
Wirkungen sind in v327 auf *Unterscheidbarkeit* gemessen worden, nicht darauf,
wie stark sie einen einzelnen Turm heben. Das ist eine eigene Runde und steht
hier, damit sie nicht vergessen wird.

**Und mit S-N6-02** (v328) gibt es auf der Gegenseite eine Stütze: der
Sanitäter heilt seine Nachbarn. Ein Stützturm, der gegen eine Stütze steht,
ist eine andere Sache als einer, der gegen Masse steht — das Vorbild dafür ist
da, es ist nur noch nicht gemessen.

**Nachgesehen in v321 — unverändert, und das war eine Aussage über die
Runden und nicht über den Turm.** Der Bannturm ist seit v295 nicht angefasst;
v315 bis v321 haben an der Oberfläche und am Messgerät gearbeitet, nicht an
der Mechanik. S5 hält weiter.

**Eine Kleinigkeit betrifft ihn trotzdem** (v317): was ein Turm ausgerichtet
hat, steht seitdem an ihm selbst — Angerichtet, Verpufft, und warum ein Schuss
nichts bewirkt hat. Für einen Stützturm, der selbst keinen Schaden macht, ist
das die ehrlichste Zeile, die er bekommen konnte: sie zeigt die Null, und die
Wirkung steht bei seinen Nachbarn.

**Nachgesehen in v307 — nachgefahren, unveraendert, und S5 haelt weiter.**
Der Bannturm ist seit v295 nicht angefasst. Gemessen mit `npm run sim`,
derselbe Bot einmal mit und einmal ohne:

| Karte | ohne | unbedacht gestellt | ins Nest gebaut |
|---|---|---|---|
| Spiralhain | 21 | 21 (+0) | **23 (+2)** |
| Ascheschlucht | 33 | 33 (+0) | **35 (+2)** |
| Frostspalte | 30 | 22 (−8) | 9 (−21) |
| Farnkessel | 11 | 13 (+2) | 13 (+2) |

Wer absichtlich um ihn herum baut, erreicht gemessen **5,3 statt 2,2 Tuerme
im Umkreis** — Faktor 2,4. Das ist der Satz des Abgleichs: unbedacht gestellt
SOLL er sich nicht lohnen.

**Die Frostspalte ist kein neuer Befund, sondern derselbe zugespitzt.** Dort
kostet ein Bauplatz, der nicht schiesst, am meisten — die Karte hat die
laengsten Bahnen bei der duennsten Deckung. Ein Stuetzturm ist dort eine
Entscheidung gegen Feuerkraft, und sie kann falsch sein.

**Nachgesehen in v300 — C3 ist gebaut und gemessen, und der Befund ist
groesser als der Turm.** Der Bannturm steht seit v295: Radius 190, +40 %
Feuerrate, Preis 90, kein Schaden. Der Zuschlag teilt die **Nachladezeit**,
nicht den Schaden - den nimmt der Verbund schon, und zwei Regeln auf derselben
Zahl sind eine Zahl mit zwei Namen. `bannStapel` deckelt nach S6: der zweite
Mast zaehlt halb, jeder weitere gar nicht.

**S5 ist damit nicht mehr eine Wette, sondern eine Messung** - und sie faellt
deutlicher aus als der Abgleich vermutet hat. Auf dem Spiralhain:

| | Kristall von 42 |
|---|---|
| ohne Bannturm | 27 |
| **unbedacht gebaut** | **11** (−16) |
| **ins Nest gebaut** | **29** (+2) |

**18 Punkte Spanne durch die LAGE** — und zum Vergleich: die ganze Turmwahl
macht nach v293 sechs Punkte aus. Ascheschlucht 35 → 37/37, Frostspalte
23 → 11/10, Farnkessel 14 → 13/13: auf zwei Karten kostet er, auf einer
traegt er. Genau das ist eine Entscheidung.

**S4 bleibt offen, und zwar unveraendert:** man sieht nicht, wer verstaerkt
ist. Der Schildtraeger tut es seit v110 fuer die Gegner (gestrichelter Ring,
Faeden) - die Mechanik ist im Spiel, sie wird nur gegen den Spieler gespielt.

**Und der Turm ist nicht kaufbar.** Mit sieben Bauknoepfen reissen alle vier
UX-Zustaende zugleich; er steht deshalb nicht in `BAU_ORDER`. Das Bild fehlt
ebenfalls noch (Auftrag 8d.4, `33_bannturm.png`).

**Nachgesehen in v293 — C3 ist zur Haelfte gebaut, und die andere Haelfte ist
jetzt genau benannt.** Seit v290 steht mit der **Werft** ein zweites Gebaeude
im Spiel, das nicht schiesst: sie belegt einen Bauplatz, kostet 150 (mehr als
jedes Geschuetz) und setzt nach jeder Welle Kristall zusammen. Damit sind S1,
S3 und S6 zum zweiten Mal erfuellt — und S5, die echte Wette, zum ersten Mal:
gemessen 27→21 Kristall auf dem Spiralhain (dort ersetzt sie Feuerkraft) gegen
35→38, 23→28 und 14→15 auf den anderen drei. Sie ist also *manchmal* richtig
und *manchmal* falsch, und das ist genau, was S5 verlangt.

**Was offen bleibt, ist S2 und S4 — und damit der Bannturm selbst.** Weder
Foerderer noch Werft wirken auf **Tuerme**; beide wirken auf Gegner oder auf
den Kristall. Die drei Vorbilder dieses Abgleichs (Monkey Village, Torchwood,
Buff Beam) tun alle dasselbe: sie machen die NACHBARN besser, und deshalb
aendern sie, **wohin** gebaut wird. Das ist die Frage, die nach v293 zaehlt:
gemessen macht die Turmwahl heute sechs Punkte aus, die Zweigwahl gar nichts —
ein Gebaeude, das die Wahl des Nachbarn belohnt, waere der erste Grund, warum
eine Stellung anders ausgeht als die andere.

**Nachgesehen in v286 — und diesmal nicht unveraendert: seit v285 steht ein
Gebaeude im Spiel, das nicht schiesst.** Der **Foerderer** ist nicht der
Bannturm (er verstaerkt keine Tuerme, er erhoeht die Beute), aber er ist die
erste Antwort auf S1, und er hat drei der sechs Sollpunkte gemessen
beantwortet:

| # | Soll | der Foerderer | Abstand heute |
|---|---|---|---|
| S1 | eigener Bauplatz, kein Zweig | **erfuellt** - `attack: 'keiner'`, 90 Gold, belegt einen Platz | keiner |
| S3 | auswaehlende Wirkung an der Lage | **erfuellt** - 230 Weltpunkte Umkreis, `foerderFaktor(x, y)` fragt den Ort des Gegners | keiner |
| S6 | stapelt sich nicht ins Unsinnige | **erfuellt** - `FOERDER_DECKEL` bei 0,75 | keiner |
| S5 | echte Wette | **hier ist der Fund** - siehe unten | ganz |
| S2, S4 | Bauverteilung, sichtbar ohne Zahl | unveraendert offen | ganz |

**Und S5 hat die Messung von v285 beantwortet, indem sie ihn durchfallen
liess.** Derselbe Bot einmal mit und einmal ohne Foerderer, ueber alle vier
Karten: **-1,8 bis +2,4 % Gold**. Das ist keine Wette, das ist Rauschen - fuer
90 Gold und einen Bauplatz. Vier Eichungen sind davor gefahren, und beim
vierten Punkt lag das Rauschen der Kennzahl UEBER dem Messwert.

**Die Ursache ist die FORM des Vorbilds, nicht seine Zahl.** Defense Grids
Command Tower gibt seine 25 % **global**; ich habe einen Umkreis von 230
Weltpunkten gebaut und dieselbe Referenz zitiert. Regel 10 sagt, das Soll kommt
aus der Referenz - sie gilt auch fuer die Form, nicht nur fuer den Prozentsatz.
Und die drei Vorbilder dieses Abgleichs sagen dasselbe von der anderen Seite:
Monkey Village, Torchwood und Buff Beam wirken alle auf **Tuerme**, nicht auf
Gegner. Ein Umkreis um Gegner herum trifft, wer gerade vorbeilaeuft; ein
Umkreis um Tuerme herum trifft, was der Spieler gestellt hat - und nur das
Zweite ist eine Entscheidung.

Damit steht C3 weiter offen, aber die Frage ist enger geworden: nicht mehr
„ein Gebaeude, das nicht schiesst" (das steht), sondern „**eine Umkreiswirkung
auf die eigenen Tuerme**".

**Nachgesehen in v279:** unveraendert offen als C3. Die Schliessbedingung des Punktes ist nachgefahren - `"Bannturm"` kommt in `src/data/towers.ts` **null mal** vor.

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
