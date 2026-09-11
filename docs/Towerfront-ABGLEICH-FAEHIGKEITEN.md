# Referenzabgleich — Fähigkeiten freischalten (C18)

Stand: v328 · 11.09.2026

**Nachgesehen in v328 — nachgefahren, nicht gestempelt: unverändert.**
`npm run c18` meldet die erste Karte mit **einer** Fähigkeit als gewonnen,
Kristall **19 von 42** — dieselbe Zahl wie in v307 und v321, über einundzwanzig
Runden auf den Punkt.

**Und das ist bei dieser Zahl kein Stillstand, sondern die Zusage selbst.**
In diesen einundzwanzig Runden sind ein dunklerer Boden mit vier neuen
Wegfarben (v326), sechs Wirkungskarten (v327) und eine neue Gegnerart (v328)
dazugekommen. Dass die Eröffnung dabei auf den Kristallpunkt genau gleich
bleibt, ist gemessen — nicht angenommen: die sechs Wirkungskarten kosten alle
Erfahrung, der Grundstapel ist unverändert zwölf, und der Sanitäter steht auf
einer anderen Karte. **Genau dafür ist `npm run c18` da** — zwei Sekunden
statt zwei Minuten, jede Runde nachfahrbar.

**Nachgesehen in v321:**
`npm run c18` meldete die erste Karte mit **einer** Fähigkeit als gewonnen,
Kristall **19 von 42** — dieselbe Zahl wie in v307. An den Fähigkeiten ist
seit v286 nichts angefasst worden, und die sieben Runden v315 bis v321 haben
ausschließlich an der Oberfläche und am Messgerät gearbeitet.

**Was sich für S2 dieses Abgleichs geändert hat, ist die Darstellung, nicht
die Mechanik** (v315): ein gesperrtes Fähigkeitsfeld ist weiterhin ein PLAN
und kein leerer Fleck — sichtbar bleibt die nächste Freischaltung, die
weiteren stehen als Zahl daran. Die Fläche fiel dabei von 15,5 auf 13,1 % des
Bildschirms.

**Und die Messlücke aus M19 steht unverändert:** `npm run c18` fährt eine
Aussaat. Die Kante bei Zuschlag 0,15 ist damit weiterhin nicht von einem Wurf
zu unterscheiden.

**Nachgesehen in v307 — nachgefahren, und die Zahl hat sich bewegt.**
`npm run c18` meldet die erste Karte mit **einer** Faehigkeit als gewonnen,
Kristall **19 von 42** (v300: 17). Die zwei Punkte kommen nicht von den
Faehigkeiten — die sind seit v286 nicht angefasst —, sondern von der
Vielfaltsbeute (v301, scharf auf 0,10): wer mit mehreren Turmarten toetet,
verdient mehr, und der Bot tut das nebenbei.

**Was seit v300 dazugekommen ist und die Frage NICHT beruehrt.** Der
Kartenzug je Welle (v303), die Abschnittswahl (v305) und die Erfahrung
zwischen den Laeufen (v306) sind alle drei Teil des Laufs, nicht der
einzelnen Karte: C18 fragt, ob die erste Karte **ohne Verbesserungen** zu
gewinnen ist, und `c18probe` faehrt sie mit `karten: 0` und ohne Lauf. Der
Kartenstapel steht dabei auf dem Grundstapel und nie auf dem Kontostand des
Messenden (Regel 4, seit v306 als Selbsttest in `npm run sim`).

**Nachgesehen in v300:** unveraendert. Die vier Faehigkeiten sind seit v286
nicht angefasst; `npm run c18` faehrt sie in jeder Runde und meldet die erste
Karte mit **einer** Faehigkeit als gewonnen (17/42 Kristall), alle vier Karten
gewonnen. Was seitdem dazugekommen ist, beruehrt sie nicht: Bannturm (v295),
Wiederholungsaufschlag scharf (v297) und Vielfaltsbeute (v299) sind Regeln
ueber Preis und Beute, und keine Faehigkeit kostet Gold.

**Eine Zahl aus v299 gehoert hierher, weil sie die Faehigkeiten mitzaehlt:**
von allen getoeteten Gegnern sterben **2,9 % ohne jede Turmbeteiligung** -
Faehigkeiten, Kernraub und die Zielunit zusammen. Das ist die erste Messung
dieses Anteils ueberhaupt.

**Nachgesehen in v293:** unveraendert. Die vier Faehigkeiten sind seit v286
nicht angefasst worden; `npm run sim` und der Rauchtest fahren sie weiter,
beide gruen. Werft (v290) und Wiederholungsaufschlag (v287) beruehren sie
nicht - beides sind Regeln ueber den Preis, und keine Faehigkeit kostet Gold.

**Ein Befund aus v293 gilt hier aber mit:** die Turmwahl macht gemessen sechs
Punkte aus, die Zweigwahl gar nichts. Ob die Faehigkeiten mehr entscheiden,
ist nie eigens gemessen worden - sie stehen in `npm run sim` als Teil des
Bots, nicht als eigene Kennzahl. Das ist keine Luecke dieses Abgleichs,
sondern eine Frage an das Messgeraet.


**Nachgesehen in v286:** unveraendert. Die vier Faehigkeiten sind zwischen
v279 und v286 nicht angefasst worden; `npm run sim` und der Rauchtest fahren
sie weiter, beide im Runner-Lauf zu v284 gruen. Die Weichen (v278-v284) und
der Foerderer (v285) beruehren sie nicht - eine Weiche aendert die Bahn, und
keine der vier Faehigkeiten haengt an einer Bahnlage. Der Konter-Fund aus v285
(`neuerKonter` fragte `!canStartWave`) betrifft die Einweisung, nicht die
Faehigkeiten.

**Nachgesehen in v279:** unveraendert. Die Faehigkeiten werden von `npm run sim` und dem Rauchtest gefahren, beide im Runner-Lauf zu v278 gruen. v278 und v279 haben die Bahnen auf ein Wegenetz umgestellt - gemessen mit 0,00 Weltpunkten Abweichung, also ohne Wirkung auf diesen Abgleich.

**Nachgesehen in v265:** unveraendert.

**Nachgesehen in v258:** unverändert. Die Fähigkeiten werden von `npm run sim`
und dem Rauchtest gefahren, beide grün.

Schritt 0 des Durchgangs, nach `docs/Towerfront-SOLL-UND-BETRIEB.md` Teil 2.
Er stand aus: C18 steht seit v40 im Rückstandsverzeichnis, und das Soll war
ein halber Satz — „Fähigkeiten zwischen Karten freischalten statt von Anfang
an verfügbar". Was das Freischalten **tun** soll, stand nirgends.

---

## Schritt 1 — Referenz benennen

Drei Spiele, und für jedes: was es tatsächlich tut.

### Plants vs. Zombies — die Samentüte nach dem Level

Nach fast jedem Level bekommt der Spieler eine neue Pflanze, auf einem
eigenen Bildschirm, der sonst nichts zeigt.

Was das tut, ist nicht „mehr Auswahl": es macht das **nächste** Level zu
einer anderen Aufgabe. Man hält nie mehr als ein paar neue Werkzeuge
gleichzeitig, und keines davon hat man sich ausgesucht — die Freischaltung
ist **Belohnung fürs Fertigwerden**, nicht Einkauf. Sie ist unübersehbar und
unverpassbar; man kann sie nicht falsch ausgeben.

### Kingdom Rush — die Sternenbäume der Zauber

Die beiden Zauber (Verstärkung, Feuerregen) sind ab Level 1 da. Was mit
Sternen gekauft wird, sind ihre **Ausbaustufen**, in einem Baum mit
Voraussetzungen, neben den Türmen.

Zwei Dinge daran: die Zauber bleiben dieselben **Verben** und werden nur
stärker — man lernt sie einmal. Und der ganze Baum ist von Anfang an
**sichtbar**, samt Preis. Ein gesperrtes Feld ist dort kein leerer Fleck,
sondern ein Plan.

### Bloons TD 6 — Freischaltung über den Kontostand

Helden und Türme öffnen sich über Erfahrungsstufen, das Wissen über eigene
Punkte. Die Freischaltung hängt an **keiner einzelnen Karte**, und der
nächste Schritt steht immer mit seinem Abstand daneben.

Und hier steht die Referenz auch als **Warnung**: der am häufigsten
kritisierte Teil ist, dass die frühen Stunden sich wie eine Demo anfühlen,
weil zu vieles zu lange zu ist. Was fehlt, fehlt spürbar; die Sperre muss
sich rechtfertigen, nicht das Freigeben.

---

## Schritt 2 — Soll ableiten

Aus dem, was die drei **tun**:

| # | Soll | woher |
|---|---|---|
| S1 | Die Freischaltung ist **Belohnung für eine geschaffte Karte** — automatisch, unverpassbar, nicht gekauft | PvZ |
| S2 | Was noch zu ist, ist **sichtbar, samt Bedingung**, von der ersten Minute an. Ein gesperrtes Feld ist ein Plan, kein leerer Fleck | Kingdom Rush, BTD6 |
| S3 | Die Freischaltung ändert die **nächste** Karte — ein neues Verb, keine grössere Zahl. Wer sie bekommt, spielt anders, nicht stärker | PvZ; Kingdom Rush macht ausdrücklich das andere und trennt beides sauber |
| S4 | Die **erste Karte ist ohne sie vollständig**. Was am Anfang dasteht, muss zum Sieg reichen — sonst ist die Eröffnung eine Demo | BTD6, als Warnung |
| S5 | Die Freischaltung wird **gezeigt, wenn sie passiert** — ein Augenblick am Ende des Laufs, keine Zeile in einem Menü | PvZ |
| S6 | Einmal verdient bleibt verdient: in jedem Modus — mit einer Ausnahme, die v314 eigens prüft: der Endlosmodus schaltet nichts frei, weil er kein Ende hat, an dem man gewonnen hätte | alle drei |

## Schritt 3 — Abstand messen

| # | Soll | heute | Abstand |
|---|---|---|---|
| S1 | Belohnung fürs Fertigwerden | **fehlt** — alle vier stehen in Welle 1 der ersten Karte bereit | ganz |
| S2 | sichtbar, samt Bedingung | **fehlt** — es ist nichts zu, also zeigt auch nichts einen Plan | ganz |
| S3 | neues Verb je Karte | **fehlt** — die drei Karten unterscheiden sich in Weg und Gelände, nicht im Handwerkszeug | ganz |
| S4 | erste Karte ohne sie vollständig | **unbekannt** — die ganze Balance ist mit allen vier geeicht. Das ist die Zahl, die diese Runde zuerst braucht | zu messen |
| S5 | Augenblick am Ende | **halb da** — die Zeile steht seit v135 genau dort und hat genau diese Form. Bis v313 hieß sie „Ein neuer Stern"; seit v314 ist es die Erfahrung, die der Lauf ausschüttet | klein |
| S6 | bleibt verdient | die gewonnenen Karten liegen in der Ablage (`progress.gewonnen`, bis v313 aus `progress.stars` gerechnet) | keiner |

**Der Abstand ist bei drei von sechs Punkten der volle, bei zweien
klein oder null** — und S4 ist keine Meinung, sondern eine Messung, die vor
allem anderen fällig ist. Eine Sperre, die die erste Karte unschaffbar
macht, ist kein Fortschritt, sondern ein Fehler.

## Schritt 4 — was das für den Auftrag heisst

**Die Ableitung statt einer Tabelle.** Vier Fähigkeiten, drei Karten: eine
steht von Anfang an, die drei anderen hängen an der Zahl der **je
gewonnenen Karten**. Keine Zuordnung „Ascheschlucht schaltet den Frost frei"
— die wäre bei der vierten Karte still falsch, und Karte 4 steht als C24 im
Verzeichnis. **Bis v313** wurde aus `progress.stars` gerechnet: eine Karte galt
als geschafft, sobald dort auf irgendeinem Grad ein Stern stand, und Sterne gab
es nur für einen Sieg. **Seit v314** steht es als eigene Liste
(`progress.gewonnen`) — die Sternwertung ist entfallen, und was aus ihr
abzuleiten war, ist beim ersten Lesen eines alten Standes einmalig abgeleitet
worden. Damit erfüllt S6 sich weiterhin von selbst.

**Der Zustand wird beim Start des Laufs eingefroren.** Wer während einer
Partie nichts freischalten kann, braucht auch keinen Fall dafür — und der
Spielstand einer laufenden Partie trägt die Freigabe mit, sonst hätte ein
fortgesetzter Lauf plötzlich andere Regeln als der begonnene.

**Was NICHT gebaut wird:** ein Laden. Die Splitter (`buyPerk`) sind der
Einkaufsweg und bleiben es; S1 verlangt ausdrücklich das Gegenteil davon.
Zwei Währungen für dieselbe Sache wären die zweite Wahrheit über den
Fortschritt.


---

## Nachtrag v251 — nachgesehen, nicht nachgezogen

An den Fähigkeiten hat sich seit diesem Abgleich **nichts geändert**:
`src/data/abilities.ts` ist zuletzt in **v195** angefasst worden (Fähigkeiten
hängen am Fortschritt, C18), und danach nie wieder. Die vier Fähigkeiten,
ihre Abklingzeiten und ihre Freischaltung über gewonnene Karten stehen wie
hier beschrieben.

**Das steht hier, weil die Standzeile sonst lügt.** Seit v249 verlangt der
Doku-Wächter von jedem lebenden Dokument, dass es nicht zurückfällt — und die
naheliegende Antwort darauf ist, die Zahl hochzusetzen und weiterzugehen. Das
wäre genau die Fälschung, gegen die die Regel steht. Die ehrliche Antwort ist
diese: nachgesehen, unverändert, und woran man es sieht.

**Was die sieben Fassungen seit v244 mittelbar berühren:** der Verbund (v244)
verstärkt Türme, keine Fähigkeiten — die Zahlen dieses Blattes bleiben
gültig. Sollte der Katalog später eine Fähigkeit anfassen (Paket P5 nennt
keine), gehört dieses Blatt vorher neu gemessen.
