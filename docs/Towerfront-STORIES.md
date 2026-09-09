# Towerfront — Stories

Stand: v269 · 09.09.2026

**Dieses Dokument ist das Lenkrad.** `npm run naechste` liest die Reihenfolge
hier und wählt die erste offene Story — über Stunden und über Kontextgrenzen
hinweg. Wer sich den Stand merkt, hat nach dem ersten Neustart nichts mehr in
der Hand.

**In v269 vollständig ersetzt.** Der alte Katalog (42 Stories, 20 zu) gehörte
zu einem Spiel, das es nicht mehr geben wird: er verbesserte Turmzweige, Grade
und Sterne, und alle drei entfallen mit `Towerfront-NEUBAU.md` Abschnitt 3.2.
Was inhaltlich überlebt hat, steht in Paket **N6** und ist dort umgewidmet —
nichts davon ist verlorengegangen, es hat nur eine andere Aufgabe bekommen.

Die Beschlüsse, aus denen diese Stories folgen, stehen in
`Towerfront-NEUBAU.md`. Der Ablauf einer Runde steht in
`Towerfront-KETTE.md`.

---

## Die Reihenfolge, und warum sie so ist

1. **N0 — die Kette.** Nichts davon ist Spiel; alles davon trägt jede weitere
   Runde. Zuerst, weil eine Kette, die falsch läuft, jede folgende Runde
   verdirbt.
2. **N5-01 — der Bildauftrag**, ganz früh und allein vorgezogen. Er ist der
   einzige Schritt, der den Nutzer braucht: Auftrag → Nutzer → Maler →
   Abnahme. Je eher er draußen ist, desto mehr läuft parallel.
3. **N2 — der Weg als Entscheidung.** Der Referenzbefund. Er wirkt auf den
   heutigen Karten, ist also nach einer Runde spielbar.
4. **N3 — Knappheit.** Braucht Bauplätze, um die konkurriert wird, also nach
   der neuen Geometrie.
5. **N1 — der Lauf.** Der Rahmen um alles. Er ist der größte Umbau am Zustand
   und kommt deshalb nicht vor den Mechaniken, die er umschließt.
6. **N4 — das HUD.** Kann erst zeigen, was es zu zeigen gibt.
7. **N5 — Schrägsicht und Bilder**, sobald sie eintreffen.
8. **N6 — Inhalt**, der aus dem alten Katalog überlebt.
9. **N7 — Tore nachziehen.** Steht am Ende der Liste, wird aber **nicht am
   Ende gefahren**: nach K1 wird jedes Tor in derselben Runde umgebaut, in der
   es seinen Gegenstand verliert. Was hier steht, sind die Umbauten, die
   absehbar so groß sind, dass sie eine eigene Runde brauchen.

---

## Paket N0 — die Kette

### S-N0-01 · Die Torkette läuft auf dem Runner, hier nur ein Vorlauf

**Paket:** N0 · **Aufwand:** S · **Hängt an:** —

**Problem.** Gemessen dauert `npm run gate` **426 s**, und sechs Schritte
tragen 85 % davon. Bei stundenlangem Betrieb ist das die Obergrenze des
Durchsatzes. Eine Umfangskette hätte gemessen nur 35 % gespart, weil `sim`
(127 s) und `browser` (76 s) an `state.ts` und `ui.ts` hängen — also an jeder
Spielrunde.

**Was gebaut wird.** `npm run vorlauf`: nur `tsc`, gemessen 4,4 s. Kein Tor,
sondern die Weigerung, etwas hochzuschieben, das nicht übersetzt. Die volle
Kette läuft auf dem Runner und hält die Auslieferung auf, wenn sie rot ist.
Dazu ein Weg, den letzten Runner-Lauf abzufragen, **bevor** die nächste Runde
beginnt — ein roter Lauf ist die nächste Runde.

**Abnahme.**
* `npm run vorlauf` bricht bei einem Übersetzungsfehler ab und ist unter 10 s.
* Der Auslieferungsplan liefert weiterhin nur bei grüner Kette aus.

**Gegenprobe.** Einen Typfehler einbauen: `vorlauf` muss abbrechen.

**Schliesst, wenn:** `text package.json "vorlauf" >= 2`

---

### S-N0-02 · Zeitratsche statt Fassungsratsche

**Paket:** N0 · **Aufwand:** S · **Hängt an:** —

**Problem.** `npm run muster` bricht ab, wenn der letzte volle Probenlauf mehr
als **drei Fassungen** zurückliegt. Im Umbau werden Fassungen schnell
hochgezählt; bei sechs Runden in einer Nacht blockiert die Regel die Kette
zweimal selbst — für 50 Minuten, ausgerechnet wenn niemand da ist.

**Was gebaut wird.** `zeitRatsche`: der letzte volle Lauf darf nicht älter als
**24 Stunden** sein. Er läuft ohnehin nachts auf dem Runner. Die Fassungszahl
bleibt als Hinweis stehen, urteilt aber nicht mehr.

**Abnahme.**
* Ein Stand von heute schweigt, einer von vorgestern meldet.
* Die Meldung nennt Alter **und** Fassungsabstand, damit beides lesbar bleibt.

**Gegenprobe.** Das Datum im Stand auf vor drei Tagen setzen: `muster` muss
melden. Und ein Stand von heute mit fünf Fassungen Abstand muss **schweigen** —
sonst ist die alte Regel nur umbenannt.

**Schliesst, wenn:** `text tools/probes.mjs "zeitRatsche" >= 2`

---

### S-N0-03 · Der Inspektor wird ein eigener Durchgang

**Paket:** N0 · **Aufwand:** M · **Hängt an:** —

**Problem.** Der Ablauf kennt drei Rollen — Arbeiter, Prüfer, **Inspektor**
(„sieht nur Bericht und Bilder, nicht den Code und nicht die Absicht"). Der
Inspektor wird faktisch nie gefahren. In v50 waren vierzehn Tore grün, während
man nicht ins Spiel kam.

**Was gebaut wird.** `npm run inspektor`: sammelt Bericht und Bildschirmfotos
der Runde in einen Ordner und legt genau das einem eigenen Durchgang vor —
ohne Quelltext, ohne die Absicht der Runde. Urteil in drei Stufen:
**Freigabe · neue Schleife · Rückbau**, mit Begründung am Bild.

**Abnahme.**
* Der Durchgang bekommt nachweislich keinen Quelltext zu sehen.
* Sein Urteil steht als Datei, nicht nur auf der Ausgabe — die Kette muss es
  in der nächsten Runde lesen können.
* Ein absichtlich kaputtes Bild (Leiste über der Landkarte) muss „Rückbau"
  ergeben; ein normales „Freigabe".

**Gegenprobe.** Dem Inspektor ein Bild der letzten grünen Runde vorlegen und
eines mit verdeckter Spielfläche: fällt das Urteil gleich aus, urteilt er
nicht.

**Schliesst, wenn:** `text tools/inspektor.mjs "Freigabe" >= 2`

---

### S-N0-04 · `bench` bekommt seine erste Gegenprobe

**Paket:** N0 · **Aufwand:** S · **Hängt an:** —

**Problem.** Gemessen in v269: von 33 Kettenschritten haben vier keine einzige
Gegenprobe. `build` und `bericht` sind keine Tore, `bahntreuetor` ist seit
v233 bekannt gegenstandslos — und **`bench` ist schlicht unbewiesen**. Es gibt
keinen Beleg, dass es je etwas melden würde. Regel 5.

**Was gebaut wird.** Eine Gegenprobe, die die Bildrate absichtlich einbrechen
lässt, und der Nachweis, dass `bench` das meldet. Meldet es nicht, ist nicht
die Probe das Problem, sondern das Tor — dann wird es repariert oder
gestrichen (K1).

**Abnahme.** `npm run proben -- "<Name>"` schlägt an.

**Gegenprobe.** Ist selbst eine.

**Schliesst, wenn:** `text tools/probes.mjs "Bildrate bricht ein" >= 1`

---

### S-N0-05 · Platzhalterbilder, die das Bildtor meldet

**Paket:** N0 · **Aufwand:** S · **Hängt an:** —

**Problem.** Der neue Stil macht mittelfristig den ganzen Bildvorrat neu. Wenn
die Kette auf Bilder wartet, steht sie — und der Nutzer wird zum Flaschenhals
einer Kette, die gerade deshalb existiert, damit er keiner ist.

**Was gebaut wird.** Ein erkennbarer Platzhalter je fehlendem Bild: Silhouette
in der richtigen Größe, Schraffur, kein Detail. Das Bildtor zählt sie und
meldet sie als **offene Bestellung**, nicht als Fehler — grün darf der Lauf
sein, verschweigen darf er es nicht.

**Abnahme.**
* Ein fehlendes Bild führt nicht zum Abbruch, steht aber in der Ausgabe.
* Der Platzhalter ist von einem echten Bild maschinell unterscheidbar.

**Gegenprobe.** Ein echtes Bild durch einen Platzhalter ersetzen: die Zahl der
offenen Bestellungen muss steigen.

**Schliesst, wenn:** `text src/gfx/sprites.ts "platzhalter" >= 2`

---

## Paket N5 (vorgezogen) — der Bildauftrag

### S-N5-01 · Der Bildauftrag für den neuen Stil

**Paket:** N5 · **Aufwand:** M · **Hängt an:** —

**Problem.** Der Neubau steht auf leichter Schrägsicht und industriellem Stil
mit dunklem Grund. Beides braucht neue Bilder, und jede Bestellung hat bisher
mehrere Anläufe gekostet — von den letzten drei Kartenbestellungen kam keine
beim ersten Versuch durch.

**Was gebaut wird.** Ein neuer **Stil-Block** im Bildauftrag, aus dem
`npm run bildprompt` seine Prompts baut: Kamerawinkel, Lichtwinkel,
Grundhelligkeit, Farbraum, wie Leuchten auszusehen hat (und dass es **gebacken**
wird, Regel 11). Dazu die erste Bestellung: **eine** Karte im neuen Stil, mit
allen Abnahmezahlen aus `npm run kartenprobe`.

**Abnahme.**
* `npm run bildprompt -- <suchtext>` gibt den Prompt vollständig aus, Stil-Block
  eingesetzt, in einem Stück zum Kopieren.
* Die Abnahmezahlen stehen **nur** im Auftrag (Regel 15) und werden von
  `kartenprobe` von dort gelesen.
* Der Auftrag nennt die Maße im Prompt selbst, nicht nur im Ausgabe-Block —
  das war der Fund aus v230.

**Gegenprobe.** Die Spalte mit den Abnahmezahlen verschieben: `kartenprobe`
muss abbrechen statt still die falsche Zahl zu lesen.

**Schliesst, wenn:** `text docs/Towerfront-BILDAUFTRAG.md "Stilblock Neubau" >= 1`

---

## Paket N2 — der Weg als Entscheidung

### S-N2-01 · Das Wegenetz als Daten

**Paket:** N2 · **Aufwand:** L · **Hängt an:** —

**Problem.** Heute trägt jede Karte eine feste Liste von Bahnen. Der Weg ist
damit gesetzt, nicht entschieden — und das ist der gemessene Abstand zu allen
drei Vorbildern.

**Was gebaut wird.** `WEGNETZ`: Knoten und Kanten als Daten, aus denen die
heutigen Bahnen als **eine** mögliche Belegung folgen. Die Kanten sind
weiterhin Catmull-Rom-Kurven mit Bogenlängen-Tabelle — am Kurvenmodell ändert
sich nichts, nur daran, woher die Route kommt.

**Abnahme.**
* Die vier heutigen Karten lassen sich verlustfrei als Netz ausdrücken; die
  daraus abgeleiteten Bahnen sind mit den heutigen **deckungsgleich** (die
  Abweichung wird gemessen, nicht behauptet).
* `npm run guards` rechnet Länge, Umweg und Kreuzdeckung unverändert.

**Gegenprobe.** Eine Kante entfernen: die Ableitung muss eine andere Route
liefern oder melden, dass keine mehr existiert — nicht stillschweigend die
alte behalten.

**Schliesst, wenn:** `text src/data/wegnetz.ts "WEGNETZ" >= 2`

---

### S-N2-02 · Die Route wird gerechnet, nicht eingetragen

**Paket:** N2 · **Aufwand:** M · **Hängt an:** S-N2-01

**Problem.** Solange die Bahn im Wellenplan steht, weichen die Gegner gar
nicht aus — das war der Befund hinter der Kreuzdeckung in v236.

**Was gebaut wird.** `kuerzesteRoute`: vom Tor zum Kristall über das offene
Netz, gerechnet. Ein Gegner behält seine Route, solange er unterwegs ist;
gerechnet wird beim Erscheinen.

**Abnahme.**
* Auf allen vier Karten ist die gerechnete Route bei voll geöffnetem Netz
  dieselbe wie heute.
* `npm run sim` bleibt in seinen Ratschen.
* Die Rechnung ist deterministisch: zwei Läufe mit derselben Aussaat sind
  bitgleich.

**Gegenprobe.** Die Kostenfunktion umdrehen (längste statt kürzeste Route):
der Rauchtest muss melden, dass die Gegner einen Umweg nehmen.

**Schliesst, wenn:** `text src/core/route.ts "kuerzesteRoute" >= 2`

---

### S-N2-03 · Weichen, umlegbar zwischen den Wellen

**Paket:** N2 · **Aufwand:** L · **Hängt an:** S-N2-02

**Problem.** Der Kern des Neubaus. Alle drei Vorbilder machen den Weg zur
Entscheidung; Towerfront hat ihn bisher festgelegt.

**Was gebaut wird.** `weicheStellen`: an mehreren Knoten sitzt eine Weiche, die
zwischen den Wellen umgelegt werden kann. Die Gegner nehmen die kürzeste
**offene** Route. Während einer Welle ist das Umlegen abgelehnt — das wäre
keine Korrektur mehr, sondern eine neue Mechanik (dieselbe Begründung wie beim
Turmversetzen in v108).

**Abnahme.**
* Umlegen ändert die Route der **nächsten** Welle, nicht die der laufenden.
* Es gibt keine Stellung, bei der gar keine Route mehr existiert (siehe
  S-N2-04).
* Der Umweg zwischen der kürzesten und der längsten erlaubten Stellung ist
  messbar verschieden — sonst ist die Weiche Dekoration.

**Gegenprobe.** Das Umlegen während einer laufenden Welle zulassen: der
Rauchtest muss melden, dass Gegner mitten im Lauf die Route wechseln.

**Schliesst, wenn:** `text src/game/state.ts "weicheStellen" >= 2`

---

### S-N2-04 · Wächter: keine Stellung darf alles sperren

**Paket:** N2 · **Aufwand:** M · **Hängt an:** S-N2-03

**Problem.** Defense Grid und Infinitode lösen das, indem Gegner **durch**
Türme laufen. Towerfront hat keine Türme als Mauern — hier sperrt die Weiche,
und eine Karte, auf der man alles zumachen kann, ist keine Entscheidung,
sondern ein Knopf mit der Aufschrift „gewinnen".

**Was gebaut wird.** Der Wächter `Weichenfenster`: über **alle** Stellungen
einer Karte wird geprüft, dass immer eine Route existiert, dass die kürzeste
nicht unter den Umwegfaktor fällt und dass die Spreizung zwischen kürzester
und längster Stellung in einem Band liegt — anteilig zur Kartengröße, nicht
absolut (Regel 2).

**Abnahme.** Der Wächter hält auf allen vier Karten und nennt je Karte die
Zahl der Stellungen, die er geprüft hat.

**Gegenprobe.** Eine Karte so verdrahten, dass eine Stellung alles sperrt: der
Wächter muss sie namentlich melden.

**Schliesst, wenn:** `text tools/guards.ts "Weichenfenster" >= 2`

---

### S-N2-05 · Die Weiche im Bild

**Paket:** N2 · **Aufwand:** M · **Hängt an:** S-N2-03

**Problem.** Eine Mechanik, die man nicht sieht, gibt es nicht — das hat der
Schildträger in v110 vorgemacht und der Kernraub in v263 wiederholt.

**Was gebaut wird.** `weicheZeichnen`: der Knoten trägt sichtbar, welcher Ast
offen ist; der geschlossene Ast liegt gedämpft darunter. Beim Antippen zeigt
die Karte **beide** Routen im Vergleich, bevor man entscheidet. Alles gebacken
(Regel 11).

**Abnahme.**
* `npm run bildtor` nimmt eine Aufnahme mit gestellter Weiche ab.
* Der Fall wird **gestellt**, nicht abgewartet, und die Aufnahme wird gegen
  dieselbe Lage **ohne** Weichenmarke gemessen (Regel 13) — ist der
  Unterschied null, misst die Prüfung nichts.
* `npm run beruehrung`: der Knoten ist mit dem Daumen zu treffen (≥ 44).

**Gegenprobe.** Die Markierung ausbauen: die Zahl der veränderten Bildpunkte
muss auf null fallen.

**Schliesst, wenn:** `text src/gfx/renderer.ts "weicheZeichnen" >= 2`

---

### S-N2-06 · Der Bot legt Weichen um

**Paket:** N2 · **Aufwand:** M · **Hängt an:** S-N2-03

**Problem.** `npm run sim` misst die Balance gegen Bots. Ein Bot, der die
Weichen nicht benutzt, misst ein anderes Spiel als das, das ausgeliefert wird —
dieselbe Lücke, die v267 für die Überlappung ein eigenes Werkzeug gekostet hat.

**Was gebaut wird.** `weichenStil` als vierte Dimension der Bots: einer lässt
alles offen, einer stellt auf die längste Route, einer stellt nach Deckung.
Der Abstand der Spielstile (G4) misst damit zum ersten Mal die Entscheidung,
um die es geht.

**Abnahme.**
* Mindestens ein Weichenstil gewinnt irgendwo allein — sonst ist die
  Entscheidung keine.
* Die Spannungsratsche hält.
* Zwei Stile mit gleichem Verlust je Welle auf allen Karten sind ein Stil mit
  zwei Namen; die Prüfung dafür gibt es seit v219 und wird mitbenutzt.

**Gegenprobe.** Zwei Weichenstile identisch machen: `sim` muss melden.

**Schliesst, wenn:** `text tools/sim.ts "weichenStil" >= 2`

---

## Paket N3 — Knappheit

### S-N3-01 · Einkommen wird eine Bauentscheidung

**Paket:** N3 · **Aufwand:** M · **Hängt an:** S-N2-03

**Problem.** Alle drei Vorbilder machen Einkommen zu einer Bauentscheidung:
Command Tower (125/135/145 % für je 300, schießt nicht), Miner auf denselben
Kacheln wie Türme, House = angrenzende Türme × Wellennummer. Towerfront hat
nur Abschussbeute und Wellenbonus — Gold kommt von selbst.

**Was gebaut wird.** Der `foerderer`: belegt einen Bauplatz, schießt nicht,
erhöht die Beute in seinem Umkreis. Er konkurriert damit um genau die Plätze,
die auch Feuerkraft wollen.

**Abnahme.**
* `npm run sim`: der Knappheitsanteil bleibt über seiner Ratsche — ein
  Einkommensgebäude, das die Knappheit auffrisst, hebt P2 wieder auf.
* Ein Bot, der Förderer baut, und einer, der keine baut, unterscheiden sich
  messbar — und keiner gewinnt überall.

**Gegenprobe.** Den Förderer schießen lassen: dann ist es kein Tausch mehr,
und `sim` muss melden, dass er in jedem Stil gebaut wird.

**Schliesst, wenn:** `text src/data/towers.ts "foerderer" >= 2`

---

### S-N3-02 · Wiederholung wird teurer

**Paket:** N3 · **Aufwand:** S · **Hängt an:** —

**Problem.** Nichts spricht heute dagegen, viermal denselben Turm zu bauen.
Genau daran hängt die **Zweigwirkung** — seit v253 die schwächste aller
Spannungskennzahlen. Rogue Tower verteuert jeden weiteren Turm derselben Art,
Infinitode jeden weiteren Miner, Defense Grid nimmt 25 % beim Verkauf.

**Was gebaut wird.** `wiederholungsAufschlag`: der Preis steigt mit der Zahl
bereits gebauter Türme derselben Art. Die Kurve wird **durchprobiert**
(Regel 9), nicht gesetzt.

**Abnahme.**
* `npm run sim`: die Zweigwirkung steigt über ihren Stand, und der Zuwachs
  liegt über der Spanne der Aussaaten.
* C18 hält: die erste Karte bleibt ohne Verbesserungen zu gewinnen.

**Gegenprobe.** Den Aufschlag auf null setzen: die Zweigwirkung muss messbar
fallen.

**Schliesst, wenn:** `text src/game/state.ts "wiederholungsAufschlag" >= 2`

---

### S-N3-03 · Vielfalt zahlt sich in der Beute aus

**Paket:** N3 · **Aufwand:** S · **Hängt an:** S-N3-02

**Problem.** Der Aufschlag aus S-N3-02 bestraft Wiederholung. Rogue Tower
macht zusätzlich das Gegenstück: **+1 Gold für jede Turmart, die den Gegner
beschädigt hat.** Damit ist Vielfalt nicht nur billiger, sondern einträglicher —
und der Spieler sieht es an der Zahl, die aufsteigt.

**Was gebaut wird.** `vielfaltsBeute`: die Beute eines Gegners steigt mit der
Zahl verschiedener Turmarten, die ihn getroffen haben.

**Abnahme.**
* Die Zahl steht im Bild, nicht nur in der Bilanz.
* `npm run sim`: der Knappheitsanteil bleibt in seinem Band — Vielfalt darf
  sich lohnen, aber nicht das Gold verdoppeln.

**Gegenprobe.** Den Zuschlag auf null setzen: der Rauchtest muss melden, dass
zwei Turmarten dieselbe Beute bringen wie eine.

**Schliesst, wenn:** `text src/game/state.ts "vielfaltsBeute" >= 2`

---

### S-N3-04 · Der Kristall lässt sich reparieren

**Paket:** N3 · **Aufwand:** M · **Hängt an:** S-N3-01

**Problem.** Der Kristall kann heute nur fallen. Rogue Tower macht die
Lebenspunkte zu einer Ressource, in die man investiert (Mine an einer
Eisenader: +1 Höchstleben, +10 % je Stufe auf Wiederherstellung). Damit
konkurriert derselbe Bauplatz zwischen **Feuerkraft, Einkommen und Kristall** —
und „der Bauplatz ist die härteste Knappheit" ist der Befund aus zwei der drei
Vorbilder.

**Was gebaut wird.** `kristallReparatur`: ein Bau, der über die Wellen hinweg
Kristall zurückgibt. Langsam genug, dass ein Durchbruch wehtut; schnell genug,
dass er eine Entscheidung ist.

**Abnahme.**
* Der Kernraub bleibt unangetastet — die Rückholung ist etwas anderes als die
  Reparatur, und beide dürfen sich nicht verrechnen.
* `npm run sim`: die Verlustverteilung hält ihre Ratsche; die Reparatur darf
  Verluste nicht folgenlos machen.
* Der Riss im Kristall geht sichtbar wieder zu — die Ableitung dafür steht
  seit v263 und wird hier zum ersten Mal wirklich gefahren.

**Gegenprobe.** Die Reparatur unbegrenzt schnell machen: `sim` muss melden,
dass ein Durchbruch nichts mehr kostet.

**Schliesst, wenn:** `text src/game/state.ts "kristallReparatur" >= 2`

---

## Paket N1 — der Lauf

### S-N1-01 · Der Lauf als Zustand

**Paket:** N1 · **Aufwand:** L · **Hängt an:** S-N3-04

**Problem.** Eine Partie dauert heute gemessen 470 s und endet ohne Grund zur
Wiederkehr. Rogue Tower kommt auf **45 Wellen ≈ eine Stunde je Lauf**.

**Was gebaut wird.** `LaufZustand`: der Lauf ist die Klammer über mehreren
Karten — Wellenzähler über Abschnitte hinweg, Deck, Gold, Verbesserungen.
Türme bleiben zwischen den Abschnitten **nicht** stehen; alles andere schon.
Der Spielstand sichert den Lauf, nicht die Partie.

**Abnahme.**
* Ein unterbrochener Lauf lässt sich fortsetzen, auch über einen Neustart.
* Das Spielstandformat zählt hoch und liest alte Stände nicht falsch, sondern
  gar nicht.
* Ein voller Lauf ist in der Simulation fahrbar und endet innerhalb eines
  festen Horizonts.

**Gegenprobe.** Den Wellenzähler beim Abschnittswechsel zurücksetzen: `sim`
muss melden, dass die Schwierigkeit im zweiten Abschnitt von vorn beginnt.

**Schliesst, wenn:** `text src/game/lauf.ts "LaufZustand" >= 2`

---

### S-N1-02 · Der Kartenzug je Welle

**Paket:** N1 · **Aufwand:** L · **Hängt an:** S-N1-01

**Problem.** Das ist die Entscheidung, die jede einzelne Welle trägt — und der
Ersatz für Turmzweige und Stufen, die mit F18 entfallen. Rogue Tower zieht
anfangs alle drei Wellen 1 aus 3, später jede Welle 1 aus 6.

**Was gebaut wird.** `KARTENSTAPEL`: je Welle drei Karten zur Wahl, eine wird
genommen. Karten geben Werte, Wirkungen oder Bauten. Der Stapel ist Daten, kein
Quelltext.

**Abnahme.**
* Der Zug ist deterministisch aus der Aussaat — zwei Läufe mit derselben
  Aussaat ziehen dieselben Karten.
* Keine Karte ist in jedem Lauf die richtige Wahl: über die Simulation gibt es
  keine Karte, die in allen Stilen genommen wird, und keine, die nie genommen
  wird.
* Der Zug unterbricht die Welle nicht — er liegt zwischen den Wellen.

**Gegenprobe.** Allen Karten dieselbe Wirkung geben: `sim` muss melden, dass
die Wahl folgenlos ist.

**Schliesst, wenn:** `text src/data/karten.ts "KARTENSTAPEL" >= 2`

---

### S-N1-03 · Die Kartenwahl je Abschnitt

**Paket:** N1 · **Aufwand:** M · **Hängt an:** S-N1-01

**Problem.** Ohne eine zweite Ebene über der Welle ist ein Lauf eine lange
Kette gleichartiger Entscheidungen. Und ein Lauf von einer Stunde am Telefon
braucht Stellen, an denen man aufhören kann.

**Was gebaut wird.** `abschnittsWahl`: nach jedem Abschnitt zwei bis drei
Karten zur Auswahl, mit **sichtbarem** Unterschied — mehr Beute gegen mehr
Druck. Die vier vorhandenen Karten werden damit Inhalt statt Kampagnenstufen.

**Abnahme.**
* Der Unterschied steht vor der Wahl im Bild, nicht danach in der Bilanz.
* Keine Karte ist in der Simulation immer die beste Wahl.
* Der Lauf lässt sich an einer Abschnittsgrenze sichern und später fortsetzen.

**Gegenprobe.** Beide Angebote gleich machen: `sim` muss melden, dass die Wahl
folgenlos ist.

**Schliesst, wenn:** `text src/game/lauf.ts "abschnittsWahl" >= 2`

---

### S-N1-04 · Erfahrung zwischen den Läufen

**Paket:** N1 · **Aufwand:** M · **Hängt an:** S-N1-02

**Problem.** Ohne etwas, das einen verlorenen Lauf trotzdem lohnend macht, ist
ein Roguelite eine Kette von Niederlagen. Rogue Tower gibt XP fürs
Durchspielen, für einen neuen Rekord und für den Sieg (450/900/1350 nach Zahl
der Pfade).

**Was gebaut wird.** `laufErfahrung`: was ein Lauf einbringt, kauft dauerhaft
**neue Karten in den Stapel** — nicht mehr Zahlen, sondern mehr Auswahl. Das
hält die Entscheidung im Mittelpunkt statt einer Wertschraube.

**Abnahme.**
* Ein verlorener Lauf bringt messbar weniger als ein gewonnener, aber nicht
  null.
* Der Fortschritt überlebt einen Neustart.
* Die Simulation läuft weiterhin **ohne** Meta-Fortschritt (Regel 4: das
  Modell darf nicht vom Gemessenen abhängen).

**Gegenprobe.** Die Erfahrung an den Determinismus-Lauf koppeln: das
Determinismus-Tor muss melden, dass zwei Läufe mit derselben Aussaat
auseinanderlaufen — genau der Fund aus v217.

**Schliesst, wenn:** `text src/core/storage.ts "laufErfahrung" >= 2`

---

### S-N1-05 · Zweige, Stufen, Grade und Sterne werden ausgebaut

**Paket:** N1 · **Aufwand:** L · **Hängt an:** S-N1-02

**Problem.** Sie sind ersetzt, nicht ergänzt. Solange beides nebeneinander
steht, gibt es zwei Wege, denselben Turm stärker zu machen — und die Balance
misst dann zwei Dinge auf einmal (Regel 4).

**Was gebaut wird.** `keineGrade`: Zweige und Stufen entfallen zugunsten des
Kartenstapels, die drei Grade und die Sternwertung zugunsten der Laufstruktur.
Der Endlosmodus wird der Schwanz des Laufs (S-N6-06).

**Abnahme.**
* Kein Tor prüft mehr etwas, das es nicht mehr gibt (K1) — jedes betroffene
  wird in derselben Runde umgebaut oder gestrichen.
* Die Gegenproben, die an Zweigen und Graden hingen, werden gezählt und
  einzeln ersetzt oder als entfallen begründet.
* `npm run muster` meldet keine Probe ohne Gegenstand.

**Gegenprobe.** Ist der Musterlauf selbst: bleibt eine Probe stehen, die auf
Zweige zeigt, meldet er sie.

**Schliesst, wenn:** `text src/game/lauf.ts "keineGrade" >= 2`

---

## Paket N4 — das HUD in Ebenen

### S-N4-01 · Der Ruhezustand wird minimal

**Paket:** N4 · **Aufwand:** M · **Hängt an:** S-N1-03

**Problem.** Gemessen ist das HUD unauffällig — 14,2 % in Ruhe, fünf
Schriftgrößen, keine Doppelung. „Extrem verbessert" heißt also nicht
„aufgeräumter", sondern: die Tiefe fehlt, und die Randleiste ist der falsche
Ort dafür.

**Was gebaut wird.** `ruheEbene`: im Ruhezustand steht nur, was man ohne
Nachdenken braucht. Alles andere wandert auf Anforderung an den Ort, an dem es
gilt.

**Abnahme.** `npm run uxtor`: Belegung im Ruhezustand fällt gegen die Ratsche
von heute; fünf Schriftgrößen, null Doppelungen, Trefferflächen ≥ 44.

**Gegenprobe.** Ein Element aus der Ruheebene in die Randleiste zurückholen:
das UX-Tor muss die gestiegene Belegung melden.

**Schliesst, wenn:** `text src/ui/ui.ts "ruheEbene" >= 2`

---

### S-N4-02 · Tiefe am Ort: der Ring am Turm

**Paket:** N4 · **Aufwand:** L · **Hängt an:** S-N4-01

**Problem.** Der Prüfsteg belegt gemessen **32,9 %** des Bildschirms und liegt
am Rand — weit weg von dem Turm, um den es geht.

**Was gebaut wird.** `turmRing`: was ein Turm kann, kostet und trifft, steht
als Ring um ihn herum. Der Prüfsteg entfällt oder schrumpft auf das, was
wirklich keinen Ort hat.

**Abnahme.**
* `npm run uxtor`: die Belegung im Turmzustand fällt deutlich unter 32,9 %.
* `npm run beruehrung`: jede Fläche des Rings ≥ 44 Punkte — bei kleinstem
  Maßstab gerechnet, nicht bei größtem.
* Der Ring verdeckt den Turm nicht, um den es geht.

**Gegenprobe.** Den Ring bei kleinstem Maßstab zeichnen lassen: das
Berührungstor muss melden, wenn eine Fläche unter 44 fällt.

**Schliesst, wenn:** `text src/ui/ui.ts "turmRing" >= 2`

---

### S-N4-03 · Man sieht, was ein Schuss bewirkt hat

**Paket:** N4 · **Aufwand:** M · **Hängt an:** S-N4-02

**Problem.** Man sieht heute nicht, ob der Mörser etwas taugt. Die Zahlen dazu
gibt es — sie stehen in der Messtafel für Entwickler und nirgends sonst.

**Was gebaut wird.** `wirkungsBilanz`: je Turm, was er wirklich getroffen und
angerichtet hat, an seinem Ring. Und sichtbar, **warum** ein Schuss nichts
bewirkt hat: Panzerung, Schild, Luftziel.

**Abnahme.**
* Die Zahl entsteht an einer Stelle, nicht zweimal (Regel 15).
* `npm run geschosse` misst weiterhin den Anteil wirkungsloser Schüsse; die
  neue Anzeige muss mit dieser Zahl übereinstimmen.

**Gegenprobe.** Die Bilanz von der Messung abkoppeln und eine feste Zahl
zeigen: der Rauchtest muss melden, dass Anzeige und Messung auseinanderlaufen.

**Schliesst, wenn:** `text src/ui/ui.ts "wirkungsBilanz" >= 2`

---

## Paket N5 — Schrägsicht und Bild

### S-N5-02 · Figuren bekommen Fuß und Schatten

**Paket:** N5 · **Aufwand:** M · **Hängt an:** S-N5-01

**Problem.** In der Draufsicht hängt eine Figur in der Mitte ihrer Kachel. In
der Schrägsicht steht sie auf einem Punkt — und ohne diesen Punkt schwebt sie.
Befund B1 aus dem Grafik-Audit steht seit v104 offen: die Plastik fehlt im Bild.

**Was gebaut wird.** `fussPunkt`: jede Figur hängt an ihrem Fuß statt an ihrer
Mitte, bekommt einen gebackenen Bodenschatten und wird nach y sortiert.
Weltkoordinaten bleiben flach (F9/A).

**Abnahme.**
* `npm run einbettung` steigt gegen seinen Stand.
* `npm run gedraenge` misst weiterhin die wirkliche Breite; der Fußpunkt darf
  sie nicht verschieben.
* Zwei Figuren hintereinander werden richtig überdeckt.

**Gegenprobe.** Die Sortierung ausbauen: die Aufnahme muss sich messbar ändern.

**Schliesst, wenn:** `text src/gfx/renderer.ts "fussPunkt" >= 2`

---

### S-N5-03 · Die erste Karte im neuen Stil

**Paket:** N5 · **Aufwand:** M · **Hängt an:** S-N5-01, S-N2-01

**Problem.** Der Stil steht als Auftrag, nicht als Bild. Was ein Bild können
muss, weiß man erst, wenn das Spiel dagegen läuft.

**Was gebaut wird.** Das erste gelieferte Bild wird gemessen
(`npm run kartenprobe`), gebacken, das Wegenetz daraufgelegt, die unwegsamen
Flecken aus dem Bild gelesen — und dann **angesehen**.

**Abnahme.** Alle Abnahmezahlen aus dem Auftrag; dazu der Blick.

**Gegenprobe.** Entfällt: hier wird ein Bild abgenommen, kein Tor gebaut.

**Schliesst, wenn:** `blick: ob eine Karte im neuen Stil gut aussieht, sagt kein Tor - das ist Regel 8, und es ist der Grund, warum diese Story eine eigene ist`

---

### S-N5-04 · Türme und Gegner im neuen Stil

**Paket:** N5 · **Aufwand:** L · **Hängt an:** S-N5-03

**Problem.** Eine Karte im neuen Stil mit Figuren im alten sieht schlechter
aus als beides im alten. Und drei gemessene Befunde hängen daran: Figuren auf
hellem Boden, Weg gegen Boden, Silhouetten-Überdeckung 0,76 bei erlaubten 0,65.

**Was gebaut wird.** Die Bestellung für Türme und Gegner im neuen Stil, in
Wellen — nicht alle auf einmal. `npm run probebild` misst jede Lieferung, und
die Silhouetten werden **untereinander** gemessen.

**Abnahme.** `npm run probebild` und `npm run lesbarkeit` halten; die
Silhouetten-Ähnlichkeit fällt unter 0,65.

**Gegenprobe.** Zwei Figuren mit derselben Silhouette liefern lassen: das
Werkzeug muss sie nennen.

**Schliesst, wenn:** `blick: ob eine Figur im neuen Stil zu ihrer Karte gehoert, ist genau die Frage, die kein Tor beantwortet (Regel 8)`

---

## Paket N6 — was aus dem alten Katalog überlebt

**Alle sechs Wirkungs-Stories des alten Pakets P5 sind hier
zusammengefasst.** Sie sollten Turmzweigen eine spürbare Wirkung geben; Zweige
gibt es nicht mehr. Die **Wirkungen** aber sind genau das Material, aus dem ein
Kartenstapel besteht — sie sind umgewidmet, nicht gestrichen.

### S-N6-01 · Wirkungen als Kartenmaterial

**Paket:** N6 · **Aufwand:** L · **Hängt an:** S-N1-02

**Problem.** Ein Kartenstapel ohne unterscheidbare Wirkungen ist eine Liste von
Prozentzahlen. Die sechs Wirkungen aus dem alten Paket P5 — Brand, Markierung,
Festfrieren, Weitschuss, Nahzuschlag, Bremsdauer — sind entworfen und nie
gebaut worden.

**Was gebaut wird.** `brandSchaden` und die übrigen als **Kartenwirkungen**:
jede verändert, wie ein Turm sich verhält, nicht nur wie hoch seine Zahl ist.

**Abnahme.**
* Jede Wirkung ist in der Simulation von den anderen unterscheidbar: keine
  zwei Karten mit gleichem Ergebnis auf allen Karten.
* Jede Wirkung ist im Bild zu sehen, nicht nur in der Zahl.

**Gegenprobe.** Zwei Wirkungen identisch machen: `sim` muss melden.

**Schliesst, wenn:** `text src/data/wirkungen.ts "brandSchaden" >= 2`

---

### S-N6-02 · Der Heiler

**Paket:** N6 · **Aufwand:** M · **Hängt an:** S-N6-01

**Problem.** Alle heutigen Gegnerarten sind Ziele. Keiner von ihnen verändert,
was der Spieler tun **muss** — außer dem Schildträger, und der ist gemessen
die interessanteste Art des Spiels.

**Was gebaut wird.** Der `heiler`: stellt Lebenspunkte seiner Nachbarn wieder
her, solange er lebt. Wer ihn stehen lässt, kommt gegen den Pulk nicht an.
Sichtbar markiert wie der Träger seit v110.

**Abnahme.**
* Der Rauchtest stellt den Fall: ein Heiler, ein Verwundeter, beide in
  Reichweite — ohne Heiler stirbt der Verwundete, mit ihm nicht.
* `npm run konter` sagt an, was gegen ihn hilft.

**Gegenprobe.** Die Heilung auf null setzen: der gestellte Fall muss kippen.

**Schliesst, wenn:** `text src/data/enemies.ts "heiler" >= 2`

---

### S-N6-03 · Der Hetzer

**Paket:** N6 · **Aufwand:** M · **Hängt an:** S-N6-01

**Problem.** Mit Weichen wird die Route zur Entscheidung — und eine Gegnerart,
die genau diese Entscheidung bestraft, macht sie erst scharf. Defense Grids
Racer ist dafür das Vorbild: er stürmt zu den Kernen und ist als Träger kaum
noch einzuholen.

**Was gebaut wird.** Der `hetzer`: sehr schnell, wenig Lebenspunkte. Wer seine
Türme für die lange Route gestellt hat, sieht ihn auf der kurzen durchlaufen.

**Abnahme.**
* Gestellt: derselbe Aufbau hält ihn auf der einen Weichenstellung und nicht
  auf der anderen.
* `npm run gedraenge`: er passt durch die engste Stelle.

**Gegenprobe.** Sein Tempo auf das der Infanterie setzen: der gestellte Fall
muss kippen.

**Schliesst, wenn:** `text src/data/enemies.ts "hetzer" >= 2`

---

### S-N6-04 · Die Welle, die Monokultur bestraft

**Paket:** N6 · **Aufwand:** M · **Hängt an:** S-N3-03

**Problem.** S-N3-02 und S-N3-03 machen Vielfalt billiger und einträglicher.
Eine Welle, die sie **erzwingt**, schließt den Kreis — und prüft zugleich, ob
die zwei Schrauben überhaupt wirken.

**Was gebaut wird.** `Monokulturwelle`: eine Wellenzusammensetzung, gegen die
ein Feld aus einer einzigen Turmart gemessen scheitert, während ein gemischtes
durchkommt.

**Abnahme.** Genau das wird gemessen, mit beiden Feldern, in derselben
Aussaat.

**Gegenprobe.** Die Welle entschärfen: die Messung muss melden, dass auch die
Monokultur durchkommt.

**Schliesst, wenn:** `text tools/sim.ts "Monokulturwelle" >= 2`

---

### S-N6-05 · Vorzeichen: die Welle sagt an, was kommt

**Paket:** N6 · **Aufwand:** M · **Hängt an:** S-N1-02

**Problem.** Eine Welle ist heute eine Liste. Ein Vorzeichen macht sie zu
einer Ankündigung, auf die man reagieren kann — und das ist die Ebene, auf der
die Kartenwahl erst Sinn ergibt: man zieht gegen etwas Bekanntes.

**Was gebaut wird.** `VORZEICHEN_ORDNUNG`: mindestens sechs Vorzeichen, jedes
mit sichtbarer Ankündigung und spürbarer Folge.

**Abnahme.**
* Jedes Vorzeichen ist in der Simulation von den anderen unterscheidbar.
* Die Ankündigung steht vor der Welle im Bild, nicht währenddessen.

**Gegenprobe.** Zwei Vorzeichen identisch machen: `sim` muss melden.

**Schliesst, wenn:** `liste src/data/vorzeichen.ts VORZEICHEN_ORDNUNG >= 6`

---

### S-N6-06 · Der Schwanz des Laufs

**Paket:** N6 · **Aufwand:** M · **Hängt an:** S-N1-01

**Problem.** Rogue Tower geht nach 45 Wellen endlos weiter. Towerfront hat
einen Endlosmodus, aber er steht neben dem Spiel statt an seinem Ende.

**Was gebaut wird.** `ENDLOS_STEIGERUNG` als Fortsetzung des Laufs: nach dem
letzten Abschnitt geht es weiter, mit einer Kurve, die durchprobiert und nicht
gesetzt ist (Regel 9).

**Abnahme.**
* Der Übergang ist nahtlos — kein Bildschirm dazwischen, keine zweite
  Zählweise.
* Die Steigerung ist so gewählt, dass ein guter Lauf messbar weiterkommt als
  ein mittelmäßiger.

**Gegenprobe.** Die Steigerung auf null setzen: der Lauf darf dann nicht mehr
enden, und die Messung muss das melden.

**Schliesst, wenn:** `text src/game/lauf.ts "ENDLOS_STEIGERUNG" >= 2`

---

## Paket N7 — Tore, die eine eigene Runde brauchen

**K1 gilt trotzdem:** ein Tor wird in derselben Runde umgebaut, in der es
seinen Gegenstand verliert. Hier stehen nur die Umbauten, die absehbar zu groß
für einen Anhang sind.

### S-N7-01 · `bahntreue` und `wegdeckung` messen das Netz

**Paket:** N7 · **Aufwand:** L · **Hängt an:** S-N2-01

**Problem.** `bahntreuetor` fragt, ob eine Bahn auf der gemalten Straße läuft —
seit v233 gibt es keine, und das Tor sagt seitdem selbst „gegenstandslos"
(D30). `wegdeckung` misst Kulisse gegen benutzte Bahn; mit einem Netz, in dem
jede Kante benutzt werden **kann**, ist der Begriff Kulisse ein anderer.

**Was gebaut wird.** Beide messen gegen das `wegnetz`: wieviel des gemalten
Netzes ist als Kante eingetragen, und wieviel davon ist in mindestens einer
Weichenstellung befahrbar. Damit bekommt D30 nach 36 Fassungen wieder einen
Gegenstand.

**Abnahme.**
* Beide Tore melden auf allen vier Karten eine Zahl, die sich bei einer
  Änderung am Netz bewegt.
* Die entfallenen Gegenproben sind ersetzt, nicht gestrichen.

**Gegenprobe.** Eine Kante aus dem Netz nehmen, die im Bild gemalt ist: die
Deckung muss fallen.

**Schliesst, wenn:** `text tools/bahntreue.ts "wegnetz" >= 2`

---

### S-N7-02 · `sim` fährt Läufe statt Partien

**Paket:** N7 · **Aufwand:** L · **Hängt an:** S-N1-01

**Problem.** `npm run sim` fährt heute je Karte eine Partie. Ein Lauf über
mehrere Abschnitte mit wachsendem Deck ist etwas anderes — und alle
Spannungskennzahlen sind gegen die Partie geeicht.

**Was gebaut wird.** `laufStil`: die Bots spielen Läufe. Die Spannungsratsche
wird auf den Lauf umgestellt; jede Kennzahl bekommt ihre neue Messstelle
aufgeschrieben (Regel 12), und der alte Stand wird **nicht** übernommen,
sondern neu erhoben — ein Stand, der aus einer anderen Messung stammt, ist
keine Ratsche, sondern eine Behauptung.

**Abnahme.**
* Der Lauf ist deterministisch.
* Die neuen Stände sind gemessen, jede Zahl mit ihrer Spanne über die
  Aussaaten.
* Die Laufzeit bleibt im Rahmen — `sim` ist mit 127 s schon der teuerste
  Schritt der Kette.

**Gegenprobe.** Den alten Stand in die neue Messung übernehmen: der Lauf muss
melden, dass Stand und Messstelle nicht zusammenpassen.

**Schliesst, wenn:** `text tools/sim.ts "laufStil" >= 2`

---

### S-N7-03 · `guards` prüft den Kartenstapel

**Paket:** N7 · **Aufwand:** M · **Hängt an:** S-N1-02

**Problem.** Der Wächter prüft heute Türme, Gegner, Wellen, Karten und Grade.
Der Kartenstapel wird die wichtigste Datenmenge des Spiels und hat keinen
Wächter.

**Was gebaut wird.** Der Wächter `Kartenstapel`: jede Karte hat eine Wirkung,
keine zwei Karten sind gleich, jede ist irgendwann ziehbar, und der Stapel
enthält keine Karte, die alles andere schlägt.

**Abnahme.** Der Wächter hält und nennt die Zahl der geprüften Karten.

**Gegenprobe.** Zwei gleiche Karten einsetzen: der Wächter muss beide nennen.

**Schliesst, wenn:** `text tools/guards.ts "Kartenstapel" >= 2`

---

## Rückbau — nur fahren, wenn eine Abnahme nach drei Schleifen nicht hält

### S-N2-07 · Rückbau: die Weichen wieder heraus

**Paket:** N2 · **Aufwand:** M · **Hängt an:** S-N2-03

**Nur fahren, wenn** `Weichenfenster` oder die Spannungsratsche nach drei
Schleifen nicht zu halten sind. Dann ist nicht die Ausführung das Problem,
sondern das Ziel — und dann zurück zum Nutzer, bevor irgendetwas ausgebaut
wird.

**Was gebaut wird.** Die Weichen entfallen, das Wegenetz bleibt: eine feste
Belegung je Karte, wie heute. Das Netz allein ist schon ein Fortschritt, weil
es die Bahnen ableitbar macht.

**Schliesst, wenn:** `text src/game/state.ts "weicheStellen" == 0`

---

### S-N1-06 · Rückbau: der Kartenzug wieder heraus

**Paket:** N1 · **Aufwand:** M · **Hängt an:** S-N1-02

**Nur fahren, wenn** der Kartenzug nach drei Schleifen keine Entscheidung
erzeugt, die die Simulation trennen kann — also wenn keine Karte irgendwo
allein vorn liegt.

**Was gebaut wird.** Der Stapel entfällt, die Turmzweige kommen zurück. Das
ist ausdrücklich der schlechtere Zustand und steht hier nur, damit der Weg
zurück beschrieben ist.

**Schliesst, wenn:** `text src/data/karten.ts "KARTENSTAPEL" == 0`

---
