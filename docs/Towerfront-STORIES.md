# Towerfront — Stories

Stand: v303 · 10.09.2026

**Nachgesehen in v291 — Paket N3 ist zu drei Vierteln gebaut, und die
Diagnose hat sich dabei umgedreht.** Förderer (v285), Wiederholungsaufschlag
(v287) und Werft (v290) stehen; **S-N3-04 ist zu**, S-N3-02 hängt seit v289
gemessen an ihr statt umgekehrt. Alle drei sind Regeln über den **Preis**, und
alle drei wirken messbar — entschieden hat bisher nur die Werft etwas
(Kristall 27→21 / 35→38 / 23→28 / 14→15).

**Warum die anderen zwei nichts entscheiden, ist seit v291 gemessen und war
drei Runden lang falsch begründet.** „Bei 28 % übrigem Gold entscheidet ein
Preis nichts" war keine Aussage über das Spiel: die Bots tragen
`maxTowers: 12`, eine Selbstbeschränkung, während die Karten rund zweihundert
Bauplätze halten. Ohne Deckel bleiben **−3 bis 16 %** liegen statt 40 bis 47 —
Gold **ist** knapp, sobald es ausgegeben wird. Nur verliert, wer 29 bis 41
Türme baut (Kristall 27→0 auf dem Spiralhain): die weiteren Plätze sehen zu
wenig, und das Gold fehlt beim Ausbauen.

**Die Knappheit fehlt also nicht beim Gold, sondern beim Bedarf.** Was N3
braucht, ist kein weiterer Kostenpunkt, sondern ein Grund, den dreizehnten
Turm zu wollen — und das ist eine Frage an den Nutzer, keine an das
Messgerät.

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

**Schliesst, wenn:** `text package.json "vorlauf" >= 1`

> **Warum hier `>= 1` steht und sonst überall `>= 2`.** Die Zwei ist kein
> Zufall: ein Bezeichner steht im Quelltext einmal an seiner Stelle und einmal
> im Kommentar darüber, und eine Bedingung auf `>= 1` schließt deshalb schon,
> wenn jemand den Namen versehentlich irgendwo hinschreibt. `package.json`
> kennt keine Kommentare — dort gibt es die zweite Stelle nicht, und `>= 2`
> wäre eine Bedingung, die nie eintreten kann. Genau das hat sie beim ersten
> Lauf auch getan.

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
* Der gestellte Fehler muss im Urteil **namentlich** vorkommen, und im echten
  Lauf darf er **nicht** vorkommen.

**Gegenprobe.** Zwei Durchgänge auf denselben Auftrag: einer sieht den echten
Stand, einer eine gestellte Fassung mit einer Leiste über der Spielfläche.
Nennt der gestellte Lauf die Leiste nicht, sieht der Inspektor nicht hin;
nennt der echte Lauf sie doch, halluziniert er.

> **Diese Abnahme stand in v271 zuerst falsch da, und der Durchgang hat es
> bewiesen.** Sie verlangte, das gestellte Bild müsse „Rückbau" ergeben und
> das echte „Freigabe" — beide urteilten `Schleife`, und beide zu Recht: die
> drei Urteile sagen, **was als Nächstes zu tun ist**, nicht wie schlimm es
> ist. Eine Leiste über dem Feld ist ein Mangel am selben Ziel, kein Beleg,
> dass das Ziel nicht trägt. Nach dem Buchstaben wäre der Inspektor
> durchgefallen; nach der Sache haben die zwei Berichte fast nichts
> gemeinsam — der gestellte nennt die Leiste im ersten Satz und auf allen
> 16 Aufnahmen, der echte erwähnt sie **kein einziges Mal**. Das ist das
> Maß, nicht die Urteilsstufe.

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

**Die Schliessbedingung ist in v273 berichtigt, und der Grund gehoert an die
Zeile.** Sie hiess `text src/gfx/sprites.ts "platzhalter" >= 2` — klein
geschrieben. Geschrieben wurde sie in v269, bevor es Code gab, und sie hat die
Schreibweise geraten: dieses Projekt schreibt Bezeichner in camelCase und
SCREAMING_CASE, kleines `platzhalter` kommt genau einmal vor (im Schluessel des
gebackenen Bildes). Zwei Treffer auf ein klein geschriebenes Wort waeren
ausserdem mit zwei Kommentarzeilen zu haben — die Bedingung haette **nichts**
festgehalten.

Gepinnt wird jetzt die Sache statt des Wortes: `PLATZHALTER_FARBE` muss
erklaert **und** benutzt sein. Ohne die Marke ist ein Platzhalter von einem
echten Bild nicht zu unterscheiden, und genau das ist der zweite
Abnahmepunkt.

**Schliesst, wenn:** `text src/gfx/sprites.ts "PLATZHALTER_FARBE" >= 2`

---

### S-N0-06 · Der Inspektor sagt, ob es überhaupt etwas Neues zu sehen gibt

**Paket:** N0 · **Aufwand:** S · **Hängt an:** — · **Herkunft:** gemessen in v274

**Problem.** Drei Runden hintereinander hat der Inspektor dieselben Kernbefunde
geliefert, weil sich das Bild nicht geändert hatte — eine Runde, die nur an
Werkzeugen und Dokumenten arbeitet, kann es gar nicht ändern. Jedes dieser
Urteile hat einen vollen Durchgang gekostet und nichts Neues gebracht.

**Ein Urteil über ein unverändertes Bild ist kein Urteil, sondern eine
Wiederholung.** Es ist aber auch keine Erlaubnis, den Blick zu überspringen:
gesagt werden darf nur, ob es etwas **zu sehen gibt**, und das muss gemessen
sein, nicht behauptet.

**Ein erster Entwurf ist in v274 gebaut und wieder zurückgenommen worden**, und
der Grund gehört hierher: er hat einen sha1 über die Bytes der Aufnahmen
gelegt und mit dem letzten beurteilten Lauf verglichen. Gemessen taugt das
nicht — `src/ui/ui.ts:393` schreibt `VERSION` in die Kopfzeile, also steht die
Fassungsnummer **in jedem Bild**, und sie ändert sich in jeder Runde. Der
Abdruck wäre jedes Mal verschieden gewesen, die Prüfung hätte nie angeschlagen
und dabei ausgesehen wie eine Prüfung (Regel 5). Lieber keine als eine, die
schweigt.

**Was gebaut wird.** Ein Vergleich, der den Fassungsstempel nicht mitzählt.
Zwei Wege sind zu messen, bevor einer gewählt wird: das Stempelfeld vor dem
Hashen ausblenden, oder statt der Bildpunkte die **Eingänge** des Bildes
vergleichen (alles unter `src/gfx`, `src/ui`, `src/game`, `index.html`,
`src/style.css` und der Bildvorrat).

**Abnahme.**
* Zwei Läufe ohne Änderung am Bild werden als **unverändert** gemeldet,
  obwohl die Fassungsnummer dazwischen gestiegen ist.
* Eine Änderung, die einen einzigen Bildpunkt bewegt, wird als **neu**
  gemeldet. Beide Richtungen, sonst beweist es nichts (Regel 13).

**Gegenprobe.** Ist selbst eine: der Lauf muss beide Fälle unterscheiden. Der
Inspektor steht nicht in der Torkette, also bezeugen ihn seine Selbsttests —
dieselbe Lage wie in v271, und sie fahren an **gestellten** Eingängen: eine
geänderte Datei, eine umbenannte, und eine höhere Fassungsnummer, die den
Abdruck nicht bewegen darf. Eine Prüfung, die den echten Baum ändern müsste,
um sich zu beweisen, fährt niemand.

**Die Schliessbedingung nennt `bildEingaenge`, nicht `beweisAbdruck`.** Der
erste Entwurf hieß so, weil die Story vor dem Bau geschrieben wurde und den
Weg über die Bildpunkte noch offen ließ; gewählt ist der über die Eingänge.
Dritte berichtigte Bedingung in drei Runden, und immer aus demselben Grund:
eine Bedingung, die vor dem Code geschrieben wird, rät den Namen.

**Schliesst, wenn:** `text tools/inspektor.mjs "bildEingaenge" >= 2`

---

### S-N0-07 · Gemessen wird gegen den Grund, auf dem die Figur wirklich steht

**Paket:** N0 · **Aufwand:** M · **Hängt an:** — · **Herkunft:** Inspektorlauf v274

**Problem.** v274 hat `npm run lesbarkeit` vom Rohbild auf das gebackene
Terrain umgestellt — und der Inspektor hat im selben Lauf gezeigt, dass das
erst die halbe Strecke war. Sein Befund, ohne jede Kenntnis der Runde:

> *„Figuren verschwinden auf der dunklen **Fahrbahn**. Turm bei x≈1060/y≈600 —
> bronzefarben auf dunkelbraunem Weg, praktisch nur am gestrichelten Ring zu
> erkennen. Dieselben Gegner in `09` und `12` heben sich einwandfrei ab; der
> Kontrast bricht nur dort zusammen, wo eine Figur bronzefarben ist."*

**Das misst das Werkzeug bis heute nicht.** Es rechnet gegen den **Mittelwert
der ganzen Karte** — und Gegner laufen auf dem Weg, Türme stehen daneben. Der
Weg ist eine eigene Fläche, und wie weit sie vom Boden absteht, misst
`npm run wegdeckung` seit v217:

| Karte | Weg gegen Boden |
|---|---|
| Spiralhain | 53,6 Farbschritte |
| Ascheschlucht | 56,9 |
| Frostspalte | **60,9** |
| Farnkessel | 55,0 |

Eine Figur auf dem Weg wird also gegen einen Grund gerechnet, der rund
**55 Farbschritte** von dem entfernt ist, auf dem sie steht — und dieselbe
Zahl wird als Abnahme gepflegt (Band 40–90), sie ist also gewollt. Der
Mittelwert mittelt genau den Fall weg, der zählt: **der schlechteste Kontrast
im Spiel ist der zwischen Gegner und Weg**, und niemand misst ihn.

**Der Befund korrigiert dabei die Richtung, in die v274 gezeigt hat.** Dort
stand „Figuren verschwinden auf hellem Boden"; der Blick sagt „auf dunklem
Weg". Beides trifft dieselbe Ursache — Kontrast bricht zusammen, wo die
Helligkeit der Figur der des Untergrunds gleicht —, aber die Abhilfe ist
verschieden: den Boden zu verdunkeln hilft der Figur auf der Wiese und
**schadet** der auf dem Weg. Ohne diese Messung wäre die Grundhelligkeit im
Bildauftrag in die falsche Richtung bestellt worden.

**Was gebaut wird.** Der Kontrast wird gegen **beide** Flächen gerechnet und
der schlechtere Fall gewertet: Wegoberfläche für alles, was auf dem Weg ist,
Bodenfläche für alles, was daneben steht. Beide Werte kommen aus dem
gebackenen Terrain, nicht aus der Palette.

**Abnahme.**
* Der gemeldete schlechteste Kontrast ist **nicht besser** als der heutige —
  eine Messung, die durch Verfeinerung besser wird, hat sich etwas
  weggemittelt.
* Der vom Inspektor genannte Fall (bronzener Turm auf der Fahrbahn) taucht
  namentlich in der Liste der schwachen Kanten auf.
* Die Ratschen werden danach neu gesetzt, mit dem Grund an der Zeile.

**Gegenprobe.** Die Wegfarbe an die Bodenfarbe angleichen: das Tor muss den
Einbruch melden. Vorher wäre es stumm geblieben, weil der Mittelwert sich
kaum bewegt.

**Schliesst, wenn:** `text tools/readability.mjs "Wegflaeche" >= 2`

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

### S-N2-08 · Weichen auf den anderen drei Karten

**Paket:** N2 · **Aufwand:** L · **Hängt an:** S-N2-04

**Problem.** Die Weiche steht auf **einer von vier** Karten, und das ist keine
Kleinigkeit, sondern hält zwei Messungen an. In v283 gemessen: ein dritter
Bot-Weichenstil ist unmöglich, solange es je Karte nur eine Weiche gibt — bei
zwei Stellungen fällt „wähle die bessere" zwangsläufig mit einer der festen
Strategien zusammen. Und der Abstand der Spielstile steht bei 13,15 gegen ein
Soll von 20.

**Was gebaut wird.** Je eine Weiche für Ascheschlucht, Frostspalte und
Farnkessel, und **eine zweite** für den Spiralhain. Die Geometrie wird
gemessen, bevor sie in die Karte kommt — Freiraumraster, `tools/bahnmass.ts`,
und der Weichenfenster-Wächter aus S-N2-04.

**Abnahme.**
* Jede Karte hält den Weichenfenster-Wächter: jede Stellung lässt eine Route,
  keine fällt unter den Umwegfaktor, die Spreizung liegt im Band 1,10–2,50.
* `npm run netz` misst weiter 0,00 Weltpunkte Abweichung im Grundzustand —
  die Balance ist gegen ihn geeicht.
* `npm run sim` bleibt in seinen Ratschen.
* **Auf jeder Karte, die eine Weiche trägt, gewinnt ein Weichenstil irgendwo
  allein.** Das ist die Abnahme, die trägt — und sie ist schärfer als die
  ursprünglich hier stehende.

  Ursprünglich stand hier: „auf der Karte mit zwei Weichen bekommt ein
  dritter Stil (`deckung`) seinen Gegenstand zurück und gewinnt irgendwo
  allein — sonst war die Diagnose aus v283 falsch". **Die Diagnose war
  falsch, und die Messung hat es gesagt.** `deckung` ist in v284 mit vier
  Stellungen gefahren, vor dem ersten Turm entscheidend, einmal gegen zwölf
  und einmal gegen vier Türme gerechnet — und hat nie allein gewonnen. Was
  daraus folgt, ist eine Aussage über die **Kennzahl**: gedeckte Länge sagt
  den Verlust nicht vorher (M17). Ein dritter Stil braucht keine dritte
  Strategie, sondern eine Kennzahl, die Verluste vorhersagt.

**Gegenprobe.** Zwei Weichen einer Karte auf dieselbe Kante legen: der
Wächter muss melden, dass eine von beiden nichts entscheidet.

**Schliesst, wenn:** `text src/data/wegnetz.ts "weichen:" >= 4`

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

**Paket:** N3 · **Aufwand:** S · **Hängt an:** S-N3-04

> **Die Abhängigkeit ist in v287 gemessen worden und stand vorher auf „—".**
> Der Aufschlag ist gebaut und wirkt (er nimmt dem Häufer 693 Gold ab), aber
> er entscheidet nichts: 0 / −6 / 0 / +1 Kristall. Bei 28 % übrigem Gold ist
> ein Preis folgenlos. Was fehlt, ist eine **Verwendung für Gold, die mit dem
> Bauen konkurriert** — und die stellt S-N3-04 her, nicht S-N3-03. Letztere
> gibt zusätzliches Gold in eine Wirtschaft, in der Gold nicht knapp ist.

**Problem.** Nichts spricht heute dagegen, viermal denselben Turm zu bauen.
Genau daran hängt die **Zweigwirkung** — seit v253 die schwächste aller
Spannungskennzahlen. Rogue Tower verteuert jeden weiteren Turm derselben Art,
Infinitode jeden weiteren Miner, Defense Grid nimmt 25 % beim Verkauf.

**Was gebaut wird.** `wiederholungsAufschlag`: der Preis steigt mit der Zahl
bereits gebauter Türme derselben Art. Die Kurve wird **durchprobiert**
(Regel 9), nicht gesetzt.

**Abnahme — in v286 gemessen korrigiert.** Die ursprüngliche lautete: „die
Zweigwirkung steigt über ihren Stand, und der Zuwachs liegt über der Spanne
der Aussaaten." Sie ist mit dem heutigen Messgerät **nicht entscheidbar**,
und das ist gemessen, nicht vermutet:

* Der Aufschlag **wirkt** — `wiederholungMessen` in `npm run sim` nimmt dem
  Häufer 693 Gold ab und dem Verteiler 0 bis 349, über alle vier Karten.
* Er **entscheidet nichts** — derselbe Bot mit und ohne endet bei
  0 / −6 / 0 / +1 Kristall. Bei 28 % übrigem Gold ist ein Preis folgenlos;
  die Knappheit aus **S-N3-03** ist die Voraussetzung dieser Story, nicht
  ihre Folge.
* Die Ratsche, an der er scheitert, misst hier **Rauschen**: „Abstand der
  Spielstile" steht bei Zuschlag 0,15 auf 1,46, bei 0,25 auf 11,64 und bei
  0,35 auf 4,50 — zehn Punkte über einen Parameter, der die drei Stile gar
  nicht unterscheidet. Sie fahren alle dieselbe Turmliste (**M18**).

Die Abnahme lautet deshalb jetzt:
* `wiederholungMessen`: der Aufschlag trennt Häufen von Verteilen — er nimmt
  dem Häufer messbar mehr Gold ab als dem Verteiler. **Erfüllt** (v286).
* C18 hält über drei Aussaaten. **Erfüllt** (v286: 15/19/21 von 42).
* **Scharf gestellt (v297): `WIEDERHOLUNG_ZUSCHLAG = 0,10`, Torkette grün.**
  Die Ratsche, die keinen Würfel wirft, kam in v296 (M18: das Band stand an
  der falschen Messstelle, 19,0 je Lauf gegen 4,4 je Stil). Damit wurde der
  Parameter zum ersten Mal lesbar — und monoton:

  | Zuschlag | Knappheit | dünne Zeit | Abstand | Lauf |
  |---|---|---|---|---|
  | 0 | 44,4 | 14,7 | 8 | grün |
  | 0,05 | — | — | — | **grün** |
  | **0,10** | **44,9** | **15,5** | 10 | **grün** |
  | 0,12 | — | 17,4 | — | rot |
  | 0,15 | — | 16,8 | — | rot |
  | 0,20 | 54,9 | 15,9 | 11 | rot |
  | 0,30 | 55,7 | 17,1 | 13 | rot |

  **Eine Fläche, keine Nadel** — drei Werte hintereinander halten, und die
  Kante bei 0,12 hat einen Namen statt eines Zufalls.

**Die 0,3 in der alten Schliessbedingung ist gemessen widerlegt.** Sie war
geraten; ab 0,12 fällt der Lauf, und zwar immer an **derselben** Zahl: der
**dünnen Zeit**. Sie steigt monoton von 14,7 auf 17,1 %. Die Erklärung ist
der Ausweichpreis (`AUSWEICHEN_AB` 1,34): ein Aufschlag treibt den Bot früher
zur nächsten Turmart, ein gemischtes Feld tötet schneller, und ein Feld, das
schneller tötet, ist öfter leer. **Vielfalt und volles Feld ziehen
gegeneinander** — das ist der Preis dieser Mechanik, und er steht jetzt als
Zahl da statt als Vermutung.

**Die Zusage sieht seit v297 den ausgelieferten Wert an**, nicht nur die
gestellten 0,35: am gesetzten 0,10 zahlt der Häufer **+200 Gold**, der
Verteiler **+8** — trennt um **192**, über drei Aussaaten mal drei
Abwandlungen gemittelt.

**Die zweite Seite dieser Zusage ist gebaut und wieder ausgebaut.** „Steht der
Wert auf 0, MUSS die Trennung null sein" klingt zweiseitig und ist es nicht:
der gesetzte Wert ist zugleich der Schalter UND das, was die Messung an `play`
weiterreicht — bei 0 sind beide Läufe derselbe Lauf, die Differenz ist von
Bauart exakt null, und der Zweig kann nicht anschlagen. Die Gegenprobe hat es
gemeldet, indem sie schwieg (Regel 3).

**Gegenprobe.** Den Aufschlag auf null setzen: `wiederholungMessen` muss auf
null Gold Unterschied fallen.

**Schliesst, wenn:** `text src/data/towers.ts "WIEDERHOLUNG_ZUSCHLAG: number = 0.10" >= 1`

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

**Gebaut und gemessen in v299 — der Schalter steht auf Null.**

Jeder Gegner trägt ein Bitmuster darüber, welche **Turmarten** ihn beschädigt
haben (nach Schild und Panzerung, also nur wo Schaden ankam). Der Fall war
gemessen, bevor die Zahl gesetzt wurde:

| Turmarten je getötetem Gegner | Anteil |
|---|---|
| 0 (Fähigkeit, Kernraub, Zielunit) | 2,9 % |
| 1 | 25,3 % |
| 2 | **32,8 %** |
| 3 | 23,5 % |
| 4 | 15,5 % |
| **Mittel** | **2,23** |

Die Karten trennen sich dabei deutlich — Spiralhain 12 % Einzelart, Farnkessel
46 %.

**Rogue Towers Form trägt hier nicht, und das ist gemessen statt gemeint.**
Dort gibt es **+1 Gold je Art**; hier liegt die Beute bei 1 bis 7 (Boss 48),
ein flaches +1 wäre auf dem Schleicher eine Verdopplung — genau, was die
Abnahme verbietet. Regel 10 gilt für die FORM des Vorbilds, Regel 2 für ihre
Größe: anteilig, nicht absolut.

**Die Wirkung ist sauber getrennt.** Bei 0,15 bekommt der Häufer auf *jeder*
Karte **+0 Gold**, der Mischer **+100 bis +251**. Eine Regel, die den, der eine
Turmart baut, von Bauart nicht erreicht.

**Scharf gestellt in v301 auf 0,10, Kette grün.** Was zwei Runden gekostet
hat, war eine Zusage ohne Rauschband — und das ist die Lehre dieser Story.

In v299 meldete die Zusage aus S-N3-02, der Wiederholungsaufschlag koste den
perfekten Verteiler **2 von 42 Kristall**. Sie stand auf **einem** Lauf je
Karte gegen eine harte Null; über die drei Aussaaten gemessen schwankt dieselbe
Zahl auf der Ascheschlucht um **12**. v300 hat ihr das Band gegeben, das an
ihre Messstelle gehört (Regel 12) — und dieselben −2 lesen sich jetzt als
**−2 / +0 / +0, Mittel −0,7 bei Rauschen 2**: innerhalb des Bandes, also keine
Aussage.

Die Reihenfolge war Absicht: eine Zusage in derselben Runde zu reparieren, in
der die eigene Änderung an ihr scheitert, wäre kein Beweis (v219). Erst das
Band auf eigener Grundlage, dann der Schalter.

**Und dann hat C18 den Wert entschieden, nicht die Balance.** Durchprobiert:

| Zuschlag | erste Karte mit einer Fähigkeit |
|---|---|
| 0 | gewonnen, 17/42 |
| 0,05 | gewonnen, 17/42 |
| 0,08 | gewonnen, **19/42** |
| **0,10** | gewonnen, **19/42** |
| 0,12 | gewonnen, 15/42 |
| 0,15 | **verloren in Welle 14** |

Dass MEHR Gold die Eröffnung verliert, ist Wegabhängigkeit. Bei 0,10 steht C18
mit 19 gegen 17 Kristall **besser** da als ohne die Regel, und zwei Werte
darunter halten ebenfalls — eine Fläche, keine Nadel. Gemessen bringt die Regel
dort dem Häufer **+0 Gold** und dem Mischer **+58 bis +170**.

Dass C18 dabei **eine** Aussaat fährt und die Kante bei 0,15 steil ist, steht
seit v301 als **M19** in den Messlücken — und ist in dieser Runde ausdrücklich
nicht repariert worden.

**Die Zahl im Bild ist gemessen und der Befund gehört an die Story: sie steht
auf fünf von acht Gegnerarten.** Die Beute ist ganzzahlig, und bei 0,10 frisst
die Rundung den Zuschlag auf den billigsten Gegnern vollständig:

| Gegner | Beute | 1 Art | 2 Arten | 3 Arten | 4 Arten |
|---|---|---|---|---|---|
| Krabbler | 2 | +2 | +2 | +2 | +2 |
| Läufer | 2 | +2 | +2 | +2 | +2 |
| Span | 1 | +1 | +1 | +1 | +1 |
| Infanterie | 3 | +3 | +3 | +3 | **+4 ×4** |
| Gleiter | 4 | +4 | +4 | +4 | **+5 ×4** |
| Spalter | 6 | +5 | **+6 ×2** | **+6 ×3** | **+7 ×4** |
| Koloss | 7 | +6 | **+7 ×2** | **+8 ×3** | **+8 ×4** |
| Titan | 48 | +43 | **+48 ×2** | **+52 ×3** | **+56 ×4** |

**Und das ist kein Fehler, sondern der Preis einer ganzzahligen Beute** — die
Marke erscheint genau dann, wenn wirklich ein Gold mehr fliesst, und schweigt
sonst. Eine Marke an einer unveränderten Zahl wäre eine Lüge im Bild; der
Rauchtest hält beide Richtungen. Wer sie überall sehen will, müsste den Anteil
aufrunden — dann bekäme jeder Kill mit zwei Arten +1, auf einer Beute von 2
also +50 %, und genau das verbietet die Abnahme.

Nach oben ist das Fenster ohnehin eng: bei 0,25 fällt die Trennung des
Wiederholungsaufschlags von 599 auf 113 Gold und reisst ihre eigene Grenze von
200. **Brauchbar sind 0,10 bis 0,20.**

**Gegenprobe.** Zwei, und beide am GESTELLTEN Wert 0,15, nicht am
ausgelieferten — der steht auf Null, und eine Zusage, die dann schweigt, ist
keine (Regel 5): `arten - 1` zu `arten` machen (dann bekommt auch der Häufer
seinen Zuschlag), und den Vermerk am Gegner wegnehmen (dann ist jeder von null
Arten getroffen).

**Schliesst, wenn:** `text src/data/towers.ts "VIELFALT_BEUTE: number = 0." >= 1`

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

**Gebaut in v302 — und der erste Lauf hat sofort etwas gesagt.**

`LaufZustand` steht in `src/game/lauf.ts`: Aussaat, Grad, Abschnitte,
Wellenzähler über alle Abschnitte, Gold, Kristall, Deck, Verbesserungen.
**Türme stehen nicht darin**, und das ist die Stelle, an der man den Beschluss
sieht.

**Additiv gebaut, und das war die wichtigste Entscheidung der Runde.** Ohne
Lauf steht der Versatz auf 0 und die Gesamtzahl auf der Wellenzahl der Karte —
dann rechnet `hpScale` Zeichen für Zeichen dasselbe wie vorher. Die ganze
Balance ist an EINZELNEN Karten geeicht (sim, C18, die Spannungsratsche); ein
Lauf, der diesen Pfad mitverschiebt, hätte in derselben Runde jede dieser
Zahlen bewegt und keine davon erklärbar gemacht.

**Der Lauf ist fahrbar** (`laufMessen` in `npm run sim`) und endet in **1048 s**
gegen einen Horizont von 3600.

**Und hier ist der Befund:**

| Abschnitt | Rampe | Ergebnis |
|---|---|---|
| Spiralhain | 1,00 | gewonnen, 42/42 |
| Ascheschlucht | 1,12 | gewonnen, 42/42 |
| Frostspalte | 1,82 | gewonnen, 42/42 |
| **Farnkessel** | **15,17** | **verloren in Welle 7** |

Die Lebenskurve ist an einer Karte mit **15** Wellen geeicht: flacher Anfang,
Knie bei 55–92 %, Ende bei `hpEnd`. Über **60** Wellen gestreckt liegen die
ersten drei Abschnitte im flachen Teil und der vierte mitten im Knie. Ein Lauf
ist damit heute **drei Spaziergänge und eine Wand**.

**Das ist kein Fehler dieser Story, sondern ihre erste Auskunft:** der
Wellenzähler über die Abschnitte hinweg ist richtig, die **Kurvenform** dafür
nicht. Sie steht als `OFFEN (N1-Kurve)` in jedem Lauf und macht die Kette
nicht rot — der Lauf ist heute nur aus dem Werkzeug erreichbar, und ein Tor,
das eine unfertige Mechanik rot macht, blockiert jede Runde danach, statt
etwas zu halten.

**Gegenprobe.** Zwei: den Wellenzähler beim Abschnittswechsel zurücksetzen
(`sim` meldet, dass die Kurve nicht durchsteigt), und die Fassungsprüfung der
Ablage herausnehmen (der Rauchtest fährt vier gestellte kaputte Stände
dagegen, mit Nullprobe am heilen).

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

**Gebaut in v303 — und zwei der drei Funde kamen vom Blick, nicht von einem
Tor.**

`src/data/karten.ts` hält **zwölf Karten als Daten**: Name, Satz, Achse, Wert.
Vier Achsen (was die Türme austeilen, was hereinkommt, was aushält), je zwei
Stärken. Wer eine dazulegt, schreibt keine Logik — und das ist die Bedingung
dafür, dass `npm run sim` über alle Karten messen kann, ohne für jede einen
Zweig zu kennen.

**Der Zug ist eine reine Funktion aus Aussaat UND Welle**, kein laufender
Zufallszustand. Zwei Läufe mit derselben Aussaat ziehen in Welle 7 dieselben
drei Karten, gleich was dazwischen passiert ist; ein Zug aus dem laufenden
`Rng` hinge an jedem Schuss, der vorher gefallen ist. Verwoben statt addiert,
sonst zöge Lauf A in Welle 8, was Lauf B in Welle 7 gezogen hat.

**Gemessen über einen ganzen Lauf und drei Stile:**

| Stil | die drei häufigsten | verschiedene |
|---|---|---|
| Meister | wucht 17, schliff 16, kadenz 10 | 12 von 12 |
| Breite | hort 15, pacht 14, zoll 9 | 11 von 12 |
| Sparsam | warte 19, linse 10, kitt 10 | 11 von 12 |

**12 von 12 Karten werden von mindestens einem Stil genommen, 0 von jedem
immer.** Die Bewertung des Bots hängt dabei am **Stil**, nicht an der Stärke
(Regel 4): eine Bewertung nach gemessener Wirkung machte aus der Messung einen
Zirkel — sie nähme immer die stärkste, und die Messung fände genau das.

**Der Zug liegt zwischen den Wellen, als Ableitung.** `zugFaellig()` ist die
eine Stelle, an der die Frage beantwortet wird; Oberfläche und Rauchtest
fragen dieselbe (Regel 6). Vier Bedingungen, jede mit ihrer Nullprobe.

**Die Bauleiste weicht dem Zug — und die Zahl sagt, dass es keinen dritten Weg
gibt.** Mit beiden zugleich sperrt die Bedienung im Ruhezustand **21,7 %** des
Bildschirms gegen erlaubte 16; die Leiste allein sind 10,8, der Zug 6,2. Jede
für sich passt, beide nicht. Vorher ist geholt worden, was zu holen war: der
Zug trägt Name und Zahl statt Name, Zahl und Satz, und das hat ihn von 11,7
auf 6,2 % gebracht (der Satz steht weiter im `title`). Es ist aber nicht nur
Platz, sondern Reihenfolge: zwischen zwei Wellen ist die Karte die **erste**
Entscheidung.

**Zwei Funde vom Blick (Regel 8):**

* **„Geölter Lauf −5 %"** stand als Minus an einer Karte, die man nehmen soll.
  Der Takt ist eine Nachladezeit; ein Faktor unter eins ist dort das Gute. Das
  Vorzeichen sagt jetzt **besser**, nicht größer — für eine Messung sind beide
  Zeichen gleich lang.
* **Das UX-Audit maß ohne den Zug alle Zustände ohne Bauleiste.** Die vier
  Ratschen wären still lockerer geworden, ohne dass der Bildschirm besser
  geworden ist — genau die Verfallsart, gegen die dieses Verzeichnis seit v219
  anschreibt. Der Zug kommt jetzt vor dem Ruhezustand und wird gezogen; danach
  stehen alle vier Zahlen wieder da, wo sie standen.

**Gegenprobe.** Drei: die Verwebung von Aussaat und Welle herausnehmen (`sim`
meldet, dass zwei Aussaaten dasselbe ziehen), die Wellenbedingung aus
`zugFaellig` nehmen (der Rauchtest meldet, dass der Zug die Welle
unterbricht), und die Ableitung der Bauleiste zurücknehmen (das UX-Tor meldet
die Belegung). Dazu zwei **bestehende** Proben, die `npm run muster` im selben
Lauf gemeldet hat, weil ihre Zeile sich geändert hat.

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

**Gebaut in v305 — und die Wahl macht gemessen 142 Punkte aus.**

`abschnittsWahl` steht in `src/game/lauf.ts`: zwei bis drei Angebote, jedes
eine **Karte mit einer Auflage**. Der Ort ist die Karte, die Entscheidung ist
die Auflage — `Stille Schicht` (−15 % Leben, −15 % Beute), `Klarer Weg`
(unverändert), `Reiche Ader` (+30 % Leben, +35 % Beute).

**Der Unterschied steht vor der Wahl im Bild** (`bilder/menu-wahl.png`, in der
Torabnahme). Jede Kachel trägt beide Seiten des Handels farbig, und die Farbe
kommt aus der **Zahl**, nicht aus dem Text: mehr Druck rot, weniger Druck
Kristall, mehr Beute Gold, weniger Beute rot. So steht auf der stillen Schicht
der Gewinn neben dem Preis, genau wie auf der reichen Ader — eine Kachel, auf
der nur eine Seite hervorsticht, liest sich als Empfehlung. Der Satz ist aus
`druck` und `beute` **abgeleitet** (Regel 15).

**Zwei Funde vom Blick, beide an der ersten Aufnahme** (Regel 8): der
neutrale Satz „Gegner und Beute wie gehabt." lief rechts aus der Kachel
heraus — er ist jetzt zweiteilig wie die anderen —, und der Knopf lag über der
zweiten Zeile.

**Gemessen mit `npm run sim --lauf`** (neu, damit eine Frage von zwei Minuten
nicht den ganzen Durchlauf kostet):

| Grenze | Karte | reich | gerade | ruhig |
|---|---|---|---|---|
| 1 | Frostspalte | **1121** (42 Kristall) | 1024 (42) | 985 (42) |
| 2 | Farnkessel | 984 (27 Kristall) | 839 (22) | **988** (40) |

**Spreizung 142,4** über zwei Grenzen, und **keine Auflage liegt zweimal
vorn** — das ist die zweite Abnahme, wörtlich. Gemessen wird die Auflage bei
**gleicher Karte**: sonst mäße die Zahl den Abstand zweier Karten, und die
Nullprobe fiele nicht auf null.

**Was der Lauf im Spiel heute tut und was noch nicht.** Er wählt den nächsten
Abschnitt, und die Auflage wirkt (`laufDruck` auf die Lebenspunkte,
`laufBeute` auf alles Gold). Er füttert die Lebenskurve **nicht** —
`laufVersatz` und `laufWellen` bleiben im Spiel auf 0, bis die Kurvenform
steht (N1K). Über 60 Wellen gestreckt ist sie gemessen drei Spaziergänge und
eine Wand; sie jetzt einzuschalten hieße, das Spiel gegen eine Zahl zu
verschlechtern, die noch nicht stimmt. `npm run sim` fährt sie trotzdem —
dort steht der Befund, im Spiel steht das Spiel.

**Gegenprobe.** Vier: alle drei Auflagen gleich machen (`sim` meldet
„folgenlos", Spreizung fällt von 142,4 auf exakt 0), den Druckfaktor aus der
Lebenspunktrechnung nehmen (dasselbe), die Wahl nie aufgehen lassen (`sim`
meldet, dass der Lauf keine Wahlen hat), und eine erfundene Kennung annehmen
lassen (der Rauchtest meldet es — sonst wäre der Lauf über die Ablage zu
stellen). Dazu eine **bestehende** Probe, die `npm run muster` im selben Lauf
gemeldet hat, weil ihre Zeile sich geändert hat.

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

**Gebaut in v306 — und die Runde hat einen Fehler gefunden, der viele
Fassungen lang dastand.**

`laufErfahrung` liegt in `src/core/storage.ts`, gerechnet wird sie in
`erfahrungFuer` aus dem **Lauf**: 10 je gefahrener Welle, 100 je gewonnenem
Abschnitt, 300 für den ganzen Lauf. Gemessen **1300 gewonnen gegen 340 in
Welle 9 des zweiten Abschnitts verloren — das 3,8-fache**; die Referenz gibt
450 fürs Durchspielen gegen 1350 für den Sieg, also ungefähr das Dreifache
(Regel 10). Der Posten je gefahrener Welle ist der, der eine Niederlage von
null trennt.

**Gekauft werden Karten, keine Zahlen.** Sechs neue, eine je Achse und je die
stärkste: der Stapel wächst von zwölf auf achtzehn, angeboten werden weiter
drei je Welle — die Auswahl wird breiter, nicht die Zahl auf dem Knopf größer.
Der ganze Stapel kostet 4200, also **3,2 gewonnene Läufe**. Ein eigenes
Menübild (`bilder/menu-stapel.png`, in der Torabnahme), nicht eine zweite
Liste im Fortschritt: dort wird mit Sternen eine Wertschraube gekauft.

**Sie machen die schwächere Karte derselben Achse nicht tot** — gemessen über
beide Stände des Stapels:

| | Karten | von mindestens einem Stil genommen | von jedem immer |
|---|---|---|---|
| Grundstapel | 12 | **12** | 0 |
| voll freigeschaltet | 18 | **18** | 0 |

**Regel 4 steht jetzt als Selbsttest da, nicht als Vorsatz.** `npm run sim`
schaltet in seiner eigenen Ablage wirklich eine Karte frei und verlangt dann,
dass ein Spiel mit `stapel: []` trotzdem aus zwölf zieht — **und** dass eines
ohne die Angabe dreizehn sieht. Ohne die zweite Hälfte bewiese die erste nur,
dass der Eingriff nicht angekommen ist (Regel 13).

**Der Fund: drei gespeicherte Felder wurden nie zurückgelesen.** Der Leser der
Ablage baute den Fortschritt aus **genau zwei** Feldern neu auf —
`stars` und `perks`. Alles andere fiel weg:

| Feld | wofür | was es hieß |
|---|---|---|
| `endlos` | die weitesten Endlosläufe (C27) | Bestenliste nach jedem Neuladen leer |
| `seenMaps` | der Einweisungssatz je Karte (B15) | jeder Satz wieder neu |
| `seenEnemies` | der Kontersatz je Gegnerart | derselbe Hinweis immer wieder |

Nachgemessen: **`[17]` hinein, `[]` heraus.** Geschrieben wurden alle drei,
gelesen keines, und keiner der dreiunddreissig Schritte sagte ein Wort — es
sieht ja nach nichts aus, wenn eine Liste leer ist. Gefunden hat es nicht ein
Verdacht, sondern die Frage dieser Story: „überlebt der Fortschritt einen
Neustart?" ist genau dieselbe Frage.

Der Leser ist jetzt eine **Ableitung** (`fortschrittAus`): er übernimmt, was
gespeichert wurde, und bringt nur die zwei Pflichtfelder in Form. Ein neues
Feld — `erfahrung` und `stapel` — braucht keine zweite Zeile mehr, und genau
das Vergessen dieser zweiten Zeile war der Fehler (Regel 15). Als eigene,
prüfbare Funktion, weil der Store beim Laden **einmal** gelesen wird: ein
Neustart lässt sich im laufenden Prozess nicht stellen, und eine Zusage, die
niemand nachfahren kann, ist keine.

**Die vorgeschlagene Gegenprobe misst nichts, und der Grund gehört
aufgeschrieben.** „Die Erfahrung an den Determinismus-Lauf koppeln" setzt
voraus, dass ein Lauf den nächsten **von selbst** verändert — so war es in
v217, wo ein Sieg einen Stern schrieb und der zweite Lauf mit anderen
Verbesserungen startete. Freischalten ist aber ein **Kauf**: zwei Läufe mit
derselben Aussaat ziehen denselben Stapel, ganz gleich wieviel Erfahrung
dazwischen entstanden ist. An ihre Stelle tritt der Selbsttest in `sim`, der
dieselbe Frage stellt und sie beantworten **kann**.

**Gegenprobe.** Fünf: den Leser wieder auf zwei Felder zurückbauen (der
Rauchtest meldet, dass der Fortschritt den Neustart nicht überlebt), den
gekauften Stapel ignorieren, Karten nichts kosten lassen, die Erfahrung eines
verlorenen Laufs auf null setzen, und den Stapel der Messung aus der Ablage
lesen (`sim` meldet Regel 4). Dazu eine **bestehende** Probe, die
`npm run muster` im selben Lauf gemeldet hat.

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

**Der Umfang ist in v307 gezählt, bevor die Runde beginnt** — die zweite
Abnahme verlangt es wörtlich („werden gezählt und einzeln ersetzt oder als
entfallen begründet"), und eine Zählung, die erst mitten im Umbau entsteht,
zählt schon nicht mehr dasselbe.

Gemessen über alle **378** Gegenproben, nach Stichwort im Probenblock
(Überschneidungen inbegriffen — mehrere Proben hängen an zweien):

| hängt an | Proben |
|---|---|
| Stufen / Ausbau | **22** |
| Zweige | **16** |
| Grade | **13** |
| Sterne | **6** |

Dazu betroffene Quelldateien: `towers.ts`, `turmwerte.ts`, `types.ts`,
`state.ts`, `save.ts`, `ui.ts`, `input.ts`, `towerart.ts`, `sprites.ts`,
`menurender.ts`, `menu.ts`, `perks.ts`, `difficulty.ts`, `storage.ts`,
`auswertung.ts`, `main.ts` — und auf der Werkzeugseite `sim.ts`, `guards.ts`,
`smoke.ts`, `benchmark.ts`, `determinism.ts`, `review.mjs`, `shots.mjs`.

**Diese Story wird nicht auf einem ungelieferten Stand gefahren.** In v307
lagen fünf Fassungen (v303–v307) auf dem Zweig, weil der nächtliche
Probenlauf an seiner eigenen Zeitgrenze gestorben war; ein Rückbau dieser
Größe auf einem Stand, den die volle Torkette nie gesehen hat, wäre ein
Rückbau ohne Netz. Die Reihenfolge ist deshalb: erst ausliefern, dann
abtragen.

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

**Abnahme.**
* `npm run uxtor`: Belegung im Ruhezustand fällt gegen die Ratsche von heute;
  fünf Schriftgrößen, null Doppelungen, Trefferflächen ≥ 44.
* **Die Leiste bleibt eine Reihe, auch während einer Welle.** Der
  Inspektorlauf v271 hat gemessen, dass sie beim Wellenstart von rund 130 auf
  **210 Punkte** umbricht — ein Viertel der Bildhöhe für Knöpfe, während
  darunter die Gegner laufen.

**Gegenprobe.** Ein Element aus der Ruheebene in die Randleiste zurückholen:
das UX-Tor muss die gestiegene Belegung melden.

**Schliesst, wenn:** `text src/ui/ui.ts "ruheEbene" >= 2`

---

**Nachgetragen aus dem Inspektorlauf v273:** die drei Fähigkeitsfelder laufen
zu **einem grauen Block** zusammen. Zwischen „2 KARTEN" und „Ernte" liegen 45
Punkte ohne erkennbare Rahmentrennung; die gestrichelten Kästen berühren
einander. Drei Entscheidungen, die aussehen wie eine Fläche — nachgesehen in
`browser.png`, der Befund trägt.

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

### S-N4-04 · Kein Element verdeckt den Text eines anderen

**Paket:** N4 · **Aufwand:** M · **Hängt an:** — · **Herkunft:** Inspektorlauf v271

**Problem.** Der erste Inspektorlauf hat zwei Zustände gefunden, in denen
**Bedienung Bedienung verdeckt — und beide Male genau die Zahlen, wegen derer
man hinsieht**:

* In `browser.png` (2532 × 1170, also am Zielgerät) liegen die
  Aufwertungskarten „Scharfschütze" und „Salve" über der Kennzahlenzeile des
  Turms. Von `SCHADEN 8` und `REICHWEITE 326` stehen nur noch die untersten
  Pixelreihen hervor. **In `05-pruefsteg.png` bei gleicher Punktgröße steht
  dieselbe Zeile vollständig da** — der Fehler ist formatabhängig und damit
  genau die Sorte, die kein Standardfall zeigt.
* Das Einweisungsband schneidet die obere Kante des Ressourcenkastens ab:
  `GOLD`, `KRISTALL`, `WELLE` liegen dahinter, sichtbar bleiben `102 36 1/15`
  — drei nackte Zahlen, und zwar **beim ersten Betreten einer Karte**, wenn
  niemand weiß, was sie bedeuten.

Das UX-Tor misst heute **Belegung** — wieviel Fläche die Bedienung nimmt. Es
misst nicht, ob ein Element den *Text* eines anderen zudeckt. Beide Zustände
sind grün durchgegangen.

**Was gebaut wird.** `textVerdeckung` im UX-Audit: für jedes Element mit Text
wird geprüft, ob ein anderes Element darüberliegt — mit `elementFromPoint` an
den Textzeilen selbst, nicht über Umrisskästen (die lassen sich durch
Verschachteln kleinrechnen, das ist seit v248 die Messstelle dieses Tores).

**Nachgetragen aus dem Inspektorlauf v272 — es trifft nicht nur Text,
sondern Knöpfe.** Der aufgeklappte Prüfsteg schneidet in `05`, `06` und
`browser.png` die beiden runden Kopfknöpfe (`•••`, `Pause`) unten ab, und in
`06` und `browser.png` liegt er über der oberen Rundung des türkisen
Hauptknopfs „Welle 1 starten" — **des einen Knopfes, ohne den das Spiel nicht
weitergeht**. Ein angeschnittener Text ist unlesbar; ein angeschnittener Knopf
ist unter dem Daumen auch noch unerreichbar.

**Abnahme.**
* Beide gefundenen Zustände werden gemeldet, bevor sie behoben sind — sonst
  misst die Prüfung nicht, was sie messen soll.
* Gemessen wird in **allen** Formaten, die das Browsertor fährt, nicht nur im
  Standardfenster: der Fehler war formatabhängig.
* Gemessen wird auch an **Knöpfen**, nicht nur an Textzeilen: kein Element
  darf über der Trefferfläche eines anderen liegen.
* Nach der Behebung: null verdeckte Textzeilen, und das ist eine Ratsche.

**Gegenprobe.** Ein Element über eine Textzeile schieben: das Tor muss es
namentlich melden.

**Schliesst, wenn:** `text tools/uxaudit.mjs "textVerdeckung" >= 2`

---

### S-N4-05 · Jede Zeile der Wellenvorschau trägt ihren Namen

**Paket:** N4 · **Aufwand:** S · **Hängt an:** — · **Herkunft:** Inspektorlauf v271

**Problem.** Zwischen den Wellen steht in der Vorschau „6× *Erste Fühler*".
Sobald eine Welle läuft, wird daraus „**9×**" — eine nackte Zahl ohne
Gegnernamen und ohne Symbol. Der Inspektor hat es zweimal unabhängig
gefunden, im Spiel und im Werkzeugblatt `wellenvorschau.png`, wo mehrere
Zeilen gar keinen erklärenden Satz tragen.

Eine Vorschau, die nicht sagt, **was** kommt, ist eine Zahl ohne Gegenstand —
und sie steht ausgerechnet an der Stelle, an der man entscheidet, wofür das
nächste Gold ausgegeben wird.

**Was gebaut wird.** `vorschauName`: jede Zeile der Vorschau trägt Zahl,
Symbol und Namen, in jedem Zustand — auch während einer laufenden Welle.

**Abnahme.** `npm run streifen` prüft es für **jede** Welle jeder Karte, nicht
nur die erste; die Bandhöhe hält ihre Grenze von 86 Punkten.

**Gegenprobe.** Den Namen in einer Zeile weglassen: `streifen` muss die Welle
namentlich melden.

**Schliesst, wenn:** `text src/ui/ui.ts "vorschauName" >= 2`

---

### S-N4-06 · Die Bedienung liegt nicht über dem Spielfeld

**Paket:** N4 · **Aufwand:** M · **Hängt an:** S-N4-01 · **Herkunft:** Inspektorlauf v272

**Problem.** Zweimal derselbe Fehler an zwei Rändern, und beide Male ist das
Verdeckte das, worum es im Spiel geht.

* **Unten liegt die Bedienleiste auf der Bahn.** In `08-welle-mitte.png` schaut
  bei x≈450/y≈570 ein Gegner zur Hälfte hinter einer Turmkachel hervor, ein
  zweiter bei x≈480/y≈660 hinter „Bollwerk", ein dritter ist am unteren Rand
  nur noch angeschnitten. In `09-welle-spaet.png` steht derselbe Fall. Auf
  diesem Abschnitt sieht man nicht, was passiert — **und bauen kann man dort
  auch nicht**, weil die Knöpfe die Fläche belegen.
* **Oben links verdeckt die Statusleiste den Bauplatz.** In `03-bauwahl.png`
  liegt die Turmvorschau bei x≈50/y≈110 zu zwei Dritteln hinter der
  `GOLD/KRISTALL/WELLE`-Kachel; sichtbar bleibt ein Streifen Dach. In
  `04-turm-gebaut.png` gilt dasselbe für den **fertig gebauten** Turm, und der
  Reichweitenring läuft links aus dem Bild. Der Spieler baut ins Blinde.

`12-dock-zu.png` sagt, was zu holen ist: mit eingeklapptem Dock atmet das Feld,
und die Gegner auf der Bahn sind sofort zu zählen. Der Zustand existiert also
schon — er ist nur nicht der Normalfall.

**Was gebaut wird.** `feldVerdeckung` im UX-Audit: an den Punkten, an denen das
Spiel wirklich stattfindet — auf dem Bahnschlauch und auf der bebaubaren
Fläche — wird mit `elementFromPoint` gefragt, ob dort Bedienung liegt.
Gemessen an denselben Zuständen, die das Audit ohnehin aufnimmt.

**Abnahme.**
* Beide gefundenen Zustände werden gemeldet, **bevor** sie behoben sind.
* Nach der Behebung: kein Punkt des Bahnschlauchs und kein Bauplatz liegt
  unter einem Bedienelement — Ratsche je Zustand.
* Der Reichweitenring eines gewählten Turms liegt vollständig im Bild.

**Gegenprobe.** Die Leiste über die Bahn schieben: das Tor muss den Zustand
namentlich melden.

**Schliesst, wenn:** `text tools/uxaudit.mjs "feldVerdeckung" >= 2`

---

### S-N4-07 · Eine Wahl, eine Leiste

**Paket:** N4 · **Aufwand:** S · **Hängt an:** — · **Herkunft:** Inspektorlauf v272

**Problem.** In `03-bauwahl.png` stehen **zwei** Turmleisten gleichzeitig im
Bild: oben links eine mit Namen und Preisen (Bogenturm 55, Frostturm 80,
Mörser, Prisma 140), unten die Kachelleiste mit Bildern und Preisen
(55, 80, 125, 140). Sie sehen aus wie dieselbe Wahl in zwei Größen.

Sie sind es nicht — die obere zeigt, was **an dieser Stelle** baubar ist, und
deshalb trägt der Mörser dort statt seines Preises das rote Wort `RAND`. Das
ist eine gute Auskunft, und niemand kann sie so lesen: an derselben Stelle, an
der drei Nachbarn eine Zahl tragen, steht bei einem ein Wort. Der Inspektor
hat es wörtlich als *„zwei Leisten für dieselbe Wahl, und in einer davon fehlt
die Zahl"* gelesen.

**Und der nächste Durchgang hat genau das Gegenteil gesagt** (v273): *„Die
Bauwahl ist verständlich: Preis unter jedem Namen, der nicht baubare Mörser
trägt statt einer Zahl den Grund `RAND` in Rot. Das erklärt sich von
selbst."* — aufgeführt unter **was gut aussieht.**

Dieselbe Aufnahme, zwei Durchgänge, entgegengesetzte Urteile. Das steht hier,
weil es die Story nicht erledigt, sondern ihre Prämisse in Frage stellt: wenn
ein unbefangener Blick es zweimal verschieden liest, ist „unlesbar" nicht
gemessen, sondern eine von zwei Meinungen. Bevor hier gebaut wird, braucht es
einen dritten Blick oder eine Messung — **nicht meine Entscheidung, welcher
der beiden recht hatte.**

**Was gebaut wird.** Eine Leiste. Die Ortsauskunft (`warumNicht`) wandert an
die Kacheln, die es ohnehin gibt, und sie sagt sie als **Zustand**, nicht als
Ersatz für den Preis: der Preis bleibt stehen, die Kachel wird gesperrt und
nennt den Grund.

**Abnahme.**
* Im Zustand „Turm gewählt" steht genau **eine** Turmleiste im Bild.
* Eine gesperrte Kachel zeigt Preis **und** Grund, nie den Grund statt des
  Preises.
* `npm run beruehrung` hält seine Grenzen: eine Leiste weniger darf die
  übrigen Trefferflächen nicht schrumpfen lassen.

**Gegenprobe.** Den Preis auf einer gesperrten Kachel ausblenden: das
Browsertor muss es melden.

**Schliesst, wenn:** `text src/ui/ui.ts "gesperrteKachel" >= 2`

---

### S-N4-08 · Zwei Dinge im Bild, die niemand erklären kann

**Paket:** N4 · **Aufwand:** S · **Hängt an:** — · **Herkunft:** Inspektorlauf v272

**Problem.** Der Inspektor hat zwei Erscheinungen gemeldet, für die er keine
Deutung fand — und das ist der Befund, nicht die Nebenbemerkung:

* **Ein doppeltes, versetztes Turmbild.** In `14-notebook-spiel.png` liegen bei
  x≈1300 zwei Turmbilder übereinander: ein aufrechter Turm bei y≈900 und ein
  zweiter, halbdurchsichtiger bei y≈990 in einem rot gestrichelten Kreis.
  Wörtlich: *„es sieht aus wie ein Geisterbild, nicht wie Turm plus Marker"*.
* **Eine lila Linie.** In `02-spiel-ruhe.png` und `14` liegt ein violetter
  Strich mit weißem Endpunkt mitten auf dem Weg, ohne Beschriftung und ohne
  erkennbaren Bezug zu irgendetwas.

Beides ist wahrscheinlich klein zu richten. Es steht hier trotzdem als eigene
Story, weil **ein Zeichen, das niemand deuten kann, im Bild schlimmer wirkt als
ein fehlendes**: der Spieler sucht eine Bedeutung, findet keine und traut dem
Rest auch nicht mehr.

**Was gebaut wird.** Erst die Ursache beider finden, dann entscheiden: eine
Erscheinung bekommt eine Bedeutung, die man sieht, oder sie verschwindet. Kein
Drittes.

**Abnahme.** Der nächste Inspektorlauf nennt keines von beiden mehr — und die
Ursache steht aufgeschrieben, nicht nur die Behebung.

**Gegenprobe.** Hängt an der Ursache und wird mit ihr nachgetragen; steht sie
fest und ist mechanisch, kommt sie in `tools/probes.mjs`.

**Schliesst, wenn:** `blick: was ein Zeichen im Bild bedeutet, beantwortet kein Tor - beide Befunde stammen aus einem Blick, und nur ein Blick kann sagen, dass sie weg sind`

---

### S-N4-09 · Der Kristall gehört ganz ins Bild

**Paket:** N4 · **Aufwand:** M · **Hängt an:** — · **Herkunft:** Inspektorlauf v273

**Problem.** Das Ding, das man verteidigt, ragt in **beiden**
Schreibtischformaten aus dem Bild:

* `browser.png` (2532 × 1170): die Ringstation liegt bei x 0–330 und ist am
  **linken** Rand angeschnitten. Selbst nachgesehen — sie trägt.
* `14-notebook-spiel.png`: dieselbe Station bei x 1780–2000+, am **rechten**
  Rand angeschnitten, rund ein Drittel fehlt.

Im Telefonformat (`02`, `12`) steht sie vollständig da. Der Fehler ist also
**formatabhängig**, und das ist die Sorte, die kein Standardfall zeigt — genau
wie die verdeckte Zeile `SCHADEN/REICHWEITE` in S-N4-04.

Dazu ein zweiter Weg zum selben Schaden: in `05-pruefsteg.png` und `06` legt
sich die Turmkarte **vollständig** über die Station; solange man einen Turm
ansieht, sieht man den Kristall nicht.

**Der Zusammenhang mit der Kamera ist bekannt und alt.** Die Zielplattform
steht in der Ecke, und seit v219 steht im Verzeichnis, was das kostet: *„der
Ausweg ist eine Bestellung, kein Code — die Zielplattform im nächsten
Kartenbild näher zur Mitte."* Hier ist der zweite Beleg dafür, und er kommt
aus einer anderen Richtung.

**Was gebaut wird.** Der Bildausschnitt hält den Kristall vollständig im Bild,
in jedem Format, das das Browsertor fährt. Ob das über die Kamerauntergrenze
geht oder über die Lage der Plattform im nächsten Kartenbild, entscheidet die
Messung — nicht die Vermutung.

**Abnahme.**
* In allen Formaten des Browsertores liegt der Kristall mitsamt seinem
  Warnring vollständig im sichtbaren Bereich.
* Die aufgeklappte Turmkarte verdeckt ihn nicht.

**Gegenprobe.** Die Kamera so setzen, dass der Kristall am Rand liegt: das Tor
muss das Format namentlich melden.

**Schliesst, wenn:** `text tools/browser.mjs "kristallSichtbar" >= 1`

---

### S-N4-10 · Ein Ding, ein Wort

**Paket:** N4 · **Aufwand:** S · **Hängt an:** — · **Herkunft:** Inspektorlauf v273

**Problem.** Für dieselbe Sache stehen drei Wörter im Bild, und eines davon ist
das einzige englische in einer sonst durchgehend deutschen Oberfläche:

| wo | Wort |
|---|---|
| `10-pause.png` | „**Level** neu starten" |
| `10-pause.png`, eine Zeile tiefer | „Zurück zur **Karte**" |
| `01-landkarte.png` | „Wähle ein **Land**" |

Der Inspektor hat sie nebeneinander gesehen und gefragt, was der Unterschied
ist. Es gibt keinen. Das ist Regel 15 in der Oberfläche: was dreimal dasteht,
meint zweimal etwas anderes, als der Leser denkt.

**Was gebaut wird.** Ein Wort, überall. Welches, entscheidet der Bestand —
`Karte` steht in `maps.ts`, im Quelltext, in den Dokumenten und in der
Landkarte; `Level` und `Land` stehen je einmal in der Oberfläche.

**Abnahme.** In der ganzen Oberfläche kommt für diese Sache genau ein Wort
vor, und es ist deutsch.

**Gegenprobe.** Eines der Wörter wieder einsetzen: der Rauchtest muss es
melden.

**Die Schliessbedingung zeigt auf `index.html`, und das ist nachgesehen, nicht
geraten.** Der erste Entwurf hiess `text src/ui/ui.ts "Level" == 0` — und war
**vom ersten Augenblick an erfüllt**, weil das Wort dort gar nicht steht.
`npm run naechste` hätte die Story sofort als zugefallen geführt, ohne dass
jemand etwas getan hätte; genau die Lücke, vor der die Doku-Wächter-Regel aus
v224 warnt (*ein offener Punkt kann still zufallen*). Gemessen steht
`Level neu starten` als Knopftext in `index.html:113`, dazu je einmal als
Kommentar in `style.css` und `main.ts`. Der Knopftext ist das, was der Spieler
sieht — also hängt die Bedingung daran.

**Schliesst, wenn:** `text index.html "Level" == 0`

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

### S-N5-05 · Rot bedeutet eine Sache, und das Tor steht im Bild

**Paket:** N5 · **Aufwand:** M · **Hängt an:** — · **Herkunft:** Inspektorlauf v271

**Problem.** Zwei Befunde, die nur der Blick sieht, und beide sind
Verwechslungen:

* **Dieselbe Farbe sagt Gegensätzliches.** In `02-spiel-ruhe.png` trägt die
  Bauvorschau einen rot gestrichelten Fußring und einen großen roten Kreis —
  Rot liest sich als „verboten". In `04-turm-gebaut.png` trägt der **fertig
  gebaute** Turm denselben roten Ring. In `03` und `05` ist der Vorschauring
  dagegen gelb. Drei Zustände, zwei Farben, keine Regel.
* **Das Tor, aus dem die Gegner kommen, ist angeschnitten.** Der Steinbogen
  unten links ist zu zwei Dritteln vom unteren Bildrand abgeschnitten — auch
  in `12-dock-zu.png`, wo nichts im Weg ist. Wo die Welle herkommt, sieht man
  nicht.

Dazu ein dritter: über der Karte liegen weiße Schlaufen um Baumgruppen und
Felsfelder, ohne Verlauf und ohne Legende. Auf dem Notebook-Bild beherrschen
sie das Bild und lesen sich als Gekritzel. Der Inspektor konnte nicht sagen,
was sie darstellen sollen — und das ist der Befund.

**Der zweite Inspektorlauf (v272) hat dazu die Hälfte nachgeliefert, die
fehlte: sie verschwinden ganz, sobald die Welle läuft.** In `02` bis `06`
beherrschen sie das Bild, in `07` bis `09` sind sie weg — wörtlich *„der
Übergang ist ein harter Bruch im Erscheinungsbild"*. Damit ist auch klar, was
sie sind: die Baukante, gezeichnet nur während der Turmwahl. Eine Linie, die
eine Regel des Spiels zeigt, ist richtig; eine reinweiße Kontur ohne Schatten
und ohne Perspektive über einem Foto ist die falsche Art, sie zu zeigen.

**Und der dritte Durchgang hat dieselbe Fläche ein drittes Mal gemeldet, als
etwas anderes** (v273): *„eine harte rechteckige Kante im Untergrund … darunter
liegt das Gras merklich milchiger und flauer als darüber. Eine gerade
Rechteckkante mitten in einer gemalten Landschaft — das kann kein Wetter und
kein Nebel sein."*

**Nachgesehen, und die Diagnose stimmt nicht ganz:** eine gerade Rechteckkante
ist es nicht, die Grenze folgt dem Weg. Es ist die **Baukante** — derselbe
Schleier, den v272 als weiße Konturlinien meldete, nur diesmal an seiner
Fläche statt an seinem Umriss erkannt. Damit haben zwei unbefangene Durchgänge
dieselbe Anzeige unabhängig voneinander für einen technischen Fehler gehalten,
einmal als Gekritzel und einmal als Rechteck. Das ist das stärkste Argument
dieser Story: die Anzeige sagt eine richtige Sache auf eine Art, die als Panne
gelesen wird.

**Was gebaut wird.** Eine Farbregel, die einmal dasteht (Regel 15): welche
Farbe welchen Zustand meint, und keine Farbe zwei. Das Tor rückt so weit ins
Feld, dass es ganz zu sehen ist. Die Geländelinien bekommen entweder eine
Bedeutung, die man sieht, oder sie verschwinden.

**Abnahme.** Der nächste Inspektorlauf nennt keinen dieser drei Punkte mehr.

**Gegenprobe.** Entfällt: was hier zu prüfen ist, sieht nur das Auge — und
genau dafür gibt es den Inspektor.

**Schliesst, wenn:** `blick: ob eine Farbe zwei Dinge sagt und ob ein Tor im Bild steht, beantwortet kein Tor - das ist Regel 8, und die drei Befunde stammen selbst aus einem Blick`

---

### S-N5-06 · Der Meteor sagt nicht, wohin er fällt

**Paket:** N5 · **Aufwand:** S · **Hängt an:** — · **Herkunft:** Inspektorlauf v273

**Problem.** Der Inspektor meldete zwei Anzeigen für dieselbe Handlung, die an
verschiedene Orte zeigen: ein violetter Bogen endet mit einem weißen Punkt bei
(835, 1078), der rote Wirkkreis liegt bei (1300, 880) — der markierte Punkt
liegt **außerhalb** seines eigenen Kreises. In `02` derselbe Abstand.

**Nachgesehen im Quelltext, und die Sache ist anders als der Befund, aber der
Befund bleibt richtig.** Es sind nicht zwei widersprüchliche Anzeigen: der
weiße Punkt ist der **fliegende Brocken**, gezeichnet bei
`(m.x + 340·(1−t), m.y − 620·(1−t))`. Er wandert im Lauf des Fluges in den
Kreis hinein, und bei `t = 1` liegt er genau in dessen Mitte. Die Anzeige ist
also korrekt.

Der Fehler ist, dass sie das nicht **sagt**: gezeichnet wird nur ein Stummel
von 46 × 84 Punkten hinter dem Brocken, keine Linie zum Ziel. Über
drei Viertel des Fluges steht damit ein leuchtender Punkt irgendwo im Bild,
ohne sichtbaren Bezug zu dem Kreis, den er meint — und ein unbefangener Blick
liest genau das, was er gemeldet hat.

**Was gebaut wird.** Der Brocken bekommt eine sichtbare Verbindung zu seinem
Einschlagpunkt — Anflugbahn statt Stummel, oder eine Führungslinie, die mit
dem Aufschlag verschwindet.

**Abnahme.** Zu jedem Zeitpunkt des Fluges ist im Bild zu sehen, **wohin** der
Brocken fällt, ohne dass man auf ihn warten muss.

**Gegenprobe.** Die Verbindung entfernen: das Bildtor muss die Aufnahme mit
fliegendem Meteor namentlich melden.

**Schliesst, wenn:** `text src/gfx/renderer.ts "anflugbahn" >= 1`

---

### S-N5-07 · Der Grund wird dunkel

**Paket:** N5 · **Aufwand:** M · **Hängt an:** S-N5-01 · **Herkunft:** gemessen in v274/v276

**Problem.** `BODEN_HELL` steht auf 0,355 und zieht **jeden** Untergrund
dorthin — auch einen, der dunkel geliefert wird. Solange das so ist, wäre die
Bestellung aus Abschnitt 8d umsonst: das Bild käme dunkel an und würde beim
Backen wieder aufgehellt.

Was das kostet, ist gemessen (`npm run lesbarkeit`, Durchlauf über
`BODEN_HELL`):

| gebackener Boden | Figuren mit Kante unter 1,5 | schwächste Kante |
|---|---|---|
| **0,355** (heute) | **20 von 20** | 1,10 |
| 0,30 | 14 von 20 | 1,27 |
| 0,24 | **1 von 20** | 1,49 |
| 0,18 | **0 von 20** | 1,74 |

**Was gebaut wird.** `BODEN_HELL` sinkt, und alles, was daran hängt, wird in
derselben Runde nachgezogen. Vier Tore hängen daran, und keines davon darf
stummgeschaltet werden (K1):

* `grafiktor` — Bodenband 0,30–0,36. Das Band stammt aus **einer** Szene
  („warmer Sandboden in Ocker") und trägt seine eigene Warnung im Quelltext:
  *„für eine Schneelandschaft ist es keine Vorgabe, sondern eine
  Fehlanzeige"*. Es kommt aus der alten Referenz und muss aus der neuen neu
  hergeleitet werden (Regel 10) — nicht einfach verschoben.
* `wegdeckung` — Weg gegen Boden, 40–90 Farbschritte. Der Weg kommt aus
  `pal.path`, also von uns; er muss mitwandern, sonst kippt der Abstand.
* `kristall` — der Farbabstand des Kristalls gegen seinen Grund.
* `einbettung` — die Klimawirkung je Karte, drei Ratschen.

**Und der Weg ist die eigentliche Arbeit, nicht der Boden.** Seit v276
gemessen: 14 von 20 Figuren liegen im Körperkontrast unter dem Soll, **alle
gegen einen Weg**. Den Boden zu verdunkeln hilft der Figur auf der Fläche und
**schadet** der auf einem dunklen Weg (Spiralhain 2,4 %). `pal.path` und
`pal.pathEdge` gehören deshalb im selben Zug durchprobiert — Regel 9, alle
Kennzahlen nebeneinander, nicht eine nach der anderen.

**Abnahme.**
* Höchstens **2 von 20** Figuren mit einer Kante unter 1,5, und keine unter 1,2.
* Der Körperkontrast verfehlt das Soll bei höchstens **4 von 20** statt heute 14.
* Alle vier genannten Tore grün, mit neu hergeleiteten Grenzen statt
  verschobener.

**Gegenprobe.** Die vorhandene Probe „Lesbarkeit sieht die Helligkeit des
Bodens nicht" fährt schon gegen `BODEN_HELL`; sie muss nach dem Umbau
weiterhin anschlagen, mit dem neuen Wert als Ausgangspunkt.

**Schliesst, wenn:** `text src/gfx/terrain.ts "BODEN_HELL = 0.2" >= 1`

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
