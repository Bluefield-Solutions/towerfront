# Towerfront — was wir noch nicht messen können

Stand: v352 · 13.09.2026

**Nachgesehen in v322 — und die sieben Runden v316 bis v322 haben die
Sammlung in eine Richtung erweitert, die hier bisher fehlte: das
BEWEISMITTEL.**

Bis v315 handelte jede Lücke davon, dass eine Zahl etwas anderes misst, als
sie behauptet. Zweimal hintereinander war es diesmal das Bild, das falsch
aussagte — und in beiden Fällen sah das Spiel **schlechter** aus, als es war:

* **v319:** `bilder/wellenvorschau.png` setzte an die Stelle des Gegnerbilds
  ein durchsichtiges 1×1-GIF — für die Höhenmessung genau richtig, und die
  Begründung dafür stand als Regel 12 daneben. Der Inspektorlauf v271 las die
  Zeilen als nackte Zahlen und schrieb „eine Vorschau ohne Gegenstand" als
  Befund auf. Im Spiel stand dort immer ein Bild.
* **v318:** `elementFromPoint` meldete `GOLD`, `KRISTALL`, `WELLE` in jedem
  Zustand als zu 100 % verdeckt, Täter `#view` — die Kopfzeile ist eine
  Anzeige und lässt Tipps durch. „Wer fängt den Finger" ist eine andere Frage
  als „wer deckt das Bild zu".

**Die Klasse heißt: ein Beweismittel, das eine Sache systematisch weglässt,
erzeugt Befunde über genau diese Sache.** Sie steht unten als **M22**.

---

**Nachgesehen in v343 — und die Runden v337 bis v343 haben dreimal dasselbe
gezeigt: die Lücke sass nicht im Eingriff, sondern in der Messstelle.**

* **v337, Mündungstor:** es verglich vier Summen am Ende einer Partie. Der
  eingebaute Fehler schiebt den Abschuss um hundert Weltpunkte, und alle vier
  bleiben Ziffer für Ziffer gleich — keine von ihnen zählt Zeit. Gemessen wird
  jetzt ein Abdruck über alle Lagen in jedem Bild.
* **v342, N1G:** der Punkt nannte seit v309 die falsche Ursache. „Gold kauft
  nichts mehr" ist gemessen kein Hebel (Exponent 0 bis 4, keine Wirkung); die
  Ursache ist, dass der Stapel Faktoren mit Summanden mischt.
* **v343, N4W:** die Spreizung misst das FENSTER und sieht nicht, was eine
  einzelne Weiche darin beiträgt. Fünf Eingriffe waren daran gescheitert,
  keiner war falsch gebaut.

---

**Nachgesehen in v350 — und die Runden v344 bis v350 haben eine Lücke
geliefert, die keine der bisherigen ist: eine Prüfung, die MISST, aber nur
den ersten von mehreren Fällen, und den Rest gar nicht ansieht.** Sie steht
unten als **M24**.

* **v350:** `doku` las `text.match(/Stand: (v\d+)/)` — die erste Standangabe
  eines Dokuments — und hörte dort auf. `Towerfront-BENCHMARK.md` trug seit
  v349 zwei davon, `v349` und `v342`; die zweite lag sieben Fassungen zurück
  und wäre allein für sich rot gewesen. Gemeldet hat es kein Tor, sondern der
  Nachtlauf, und auch der nur, weil die Gegenprobe zur Standregel an derselben
  Stelle stumm wurde.
* **v347:** dieselbe Form eine Ebene höher — `feldVerdeckung` beantwortete von
  zwei Zusagen nur eine. Gemessen fallen sie weit auseinander: der Weichenring
  steht in `welle` auf **50,0 % gefangen gegen 15,4 % zugedeckt**.

**Die Klasse heisst: eine Prüfung, die den ersten von mehreren Treffern nimmt,
prüft eine Stichprobe und meldet ein Urteil.** Sie ist gefährlicher als eine
fehlende Prüfung, weil sie grün aussieht — und sie ist in diesem Baum nicht
selten: `npm run muster` zählt **23 von 421 Gegenproben**, die auf den ersten
von mehreren Treffern greifen, und nennt das als Hinweis. Vor dieser Runde
waren es 23 — und die eine, die dabei wegfällt, ist genau die, die am 12.09.
nichts mehr bewiesen hat. Der Hinweis stand also über ihr, jeden Lauf.

**Und zweimal in diesen Runden hat eine Messung von mir selbst nichts
gemessen** — beide Male fiel es nur auf, weil Regel 3 gefahren wurde: die
Kantenmessung in v343 schrieb `kanten` statt `kante` und stand auf 24
sauberen Einsen; die Stufenmessung in v340 wäre ohne ihren Selbsttest eine
Tabelle über eine Schraube gewesen, die gar nicht greift.

**Was daraus als Lücke bleibt und hier hingehört:** es gibt kein Verfahren,
das eine Messstelle auf ihren Gegenstand prüft. Ein Tor prüft, ob die Zahl im
Band liegt; dass die Zahl die richtige Frage beantwortet, prüft nur ein
Blick — und der kommt, wenn überhaupt, Runden später.

**Nachgesehen in v336 — und eine ganze Klasse von Lücken ist damit zugefallen,
ohne dass eine einzige Zahl besser geworden wäre.**

Sieben der zehn Spannungskennzahlen wurden bis v335 an einer PARTIE gemessen
(eine Karte, fünfzehn Wellen), während ein Spieler seit S-N1-01 einen LAUF
über sechzig spielt. Keine von ihnen hat je gelogen; sie beantworteten eine
andere Frage als die, unter der sie standen. Die härteste Zahl dazu: „längste
folgenlose Strecke" steht an der Partie auf 13,0 Wellen und am Lauf auf
**43,7**.

**Die Lücke dahinter war aber nicht die Messstelle, sondern dass sie nirgends
stand.** Sie wurde seit v253 GEDRUCKT und nicht GESPEICHERT — und damit ließ
sich ein Stand gegen eine völlig andere Messung halten, ohne dass etwas
anschlägt. Seit v336 trägt jeder Stand seine Messstelle als Kennung in der
Datei, ein Bruch ist ein Fehler, und `--spannung-schreiben` erhebt neu statt
zu übernehmen.

**Der erste Fall kam in derselben Runde und war eine Regel-15-Falle:** `ruhe`
trug als Messstelle den VERWEIS `gleiche Messstelle wie "stellen"`. Ein
Verweis ändert sich nicht mit dem, worauf er zeigt — `stellen` wanderte zum
Lauf, `ruhe` behielt Wort für Wort dieselbe Kennung. Eine Messstelle, die
auf eine andere zeigt, statt sich aus ihr zu bilden, ist keine.

**Was dabei offen BLEIBT, ist M18 von der anderen Seite** (siehe dort):
`Breite` bringt 0 von 9 Läufen durch, und der Abstand der Spielstile steht
deshalb auf UNBELEGT statt auf 22,22.

---

**Nachgesehen in v329 — und diese Runde hat eine Lücke geliefert, die
gefährlicher ist als die meisten hier, weil sie nicht schweigt, sondern eine
falsche Ursache BEHAUPTET.** Sie steht unten als **M23**.

Der Hetzer (S-N6-03) brach beim Einbau `npm run c18`. Die Ursachensuche lief
über vier Verdächtige, alle einzeln gemessen und alle falsch — Tempo,
Lebenspunkte, Durchschlag, Beute. Bei der Beute schien es zu sitzen: mit 2
Gold gewann die Standard-Aussaat, mit 4 verlor sie, sauber reproduzierbar.

**Erst fünf Aussaaten haben es aufgeklärt: es war nie die Beute, es war die
Gruppe.** Drei zusätzliche Gegner brechen diese Welle, gleich welcher Art —
mit drei zusätzlichen Schleichern gewinnt der Lauf 3 von 5, mit drei Hetzern
2 von 5, ohne sie 5 von 5.

**Eine Zahl aus einer Aussaat hätte hier eine Balance-Änderung an der Beute
begründet, die mit der Sache nichts zu tun hat** — und sie hätte überzeugend
ausgesehen, weil sie reproduzierbar war. Reproduzierbar heißt nicht richtig:
derselbe Weg gibt dasselbe Ergebnis, auch wenn es der falsche Weg ist.

**Dazu ein dritter Fall derselben Familie, gefunden in v322:** die erste
Fassung von `kristallSichtbar` maß auf der LANDKARTE statt im Spiel — der
Renderer kehrt bei offenem Menü vor der Kamerarechnung um. Dasselbe Fenster
meldete „ragt 472 px heraus", während im Spiel 31 herausragten. Dieselbe
Regel 12 wie immer, nur diesmal im Werkzeug einer Story, die gerade erst
entstand.

**Zweiundzwanzig Luecken, sechs davon abgeraeumt** — fuenf geschlossen (M1,
M3, M6, M7, M10) und eine gegenstandslos (M8). Die Zahl steht hier, weil sie
falsch dastand: der Kopf sprach von „fuenfzehn", waehrend zwanzig Abschnitte
darunter lagen — und `M8` fuehrte einen Schwierigkeitsgrad, den es seit v314
nicht mehr gibt.

**Nachgesehen in v315 — und drei Zeilen waren falsch geworden, ohne dass
jemand etwas angefasst haette, was in ihnen steht.**

* **M8 ist gegenstandslos**, nicht behoben: der Grad „Ruhig" ist in v314
  ausgebaut worden (S-N1-05). Eine Luecke, deren Gegenstand verschwindet,
  faellt nicht zu — sie hoert auf, eine zu sein, und der Unterschied gehoert
  aufgeschrieben, sonst liest sich das naechste Verzeichnis wie eine
  Erfolgsmeldung.
* **M11, Loch 3 ist zu** (v313) — und es hat vorher zugeschlagen, wie
  angekuendigt: `N1K` und `N1G` enden auf einen Buchstaben, die Kennungsregel
  verlangte hinter der Ziffer nichts oder einen Bindestrich, und **beide
  standen vier Fassungen lang mit einer Schliessbedingung da, die nie
  ausgewertet wurde.**
* **M4 beschreibt die Bots seit v293 falsch.** Der Satz „alle drei bauen
  dieselbe Turmmischung" gilt nicht mehr; der SCHLUSS daraus gilt trotzdem,
  und das ist die eigentliche Auskunft — siehe die Berichtigung dort.

**Die Story-Kennungen der ersten fuenfzehn Abschnitte (`S-P…`) gibt es seit
v269 nicht mehr.** Der Katalog ist damals ersetzt worden; was inhaltlich
ueberlebt hat, steht in `Towerfront-STORIES.md` als Paket N6. Die alten
Kennungen bleiben hier stehen, weil sie sagen, WOFUER die Luecke damals der
Grund war — sie sind Belege, keine Wegweiser. Einmal gesagt statt fuenfzehnmal
(Regel 15).

**Nachgesehen in v286 — achtzehn Luecken, und M1 hat seine erste Zahl aus dem
laufenden Betrieb bekommen.** Die achtzehnte (**M18**) ist in derselben Runde
entstanden: der Abstand der Spielstile misst drei Bots, die dasselbe bauen. Die Luecke gilt als geschlossen (drei Aussaaten, `UNBELEGT` statt
einer Zahl), und v285 hat gezeigt, wozu das gut ist: bei der vierten Eichung
des Foerderers lag das **Rauschen der Kennzahl (11,0) UEBER dem Messwert (9)**,
und die Eichung ist daraufhin abgebrochen worden statt weiterzudrehen. Die
Luecke ist damit nicht wieder offen - sie hat zum ersten Mal Arbeit verhindert,
statt Arbeit zu kosten. Was bleibt, steht als Preis daneben: **eine Wirkung
unterhalb dieses Rauschens ist heute nicht eichbar**, ganz gleich ob sie
besteht. Der Foerderer wartet aus genau diesem Grund auf eine ruhigere
Messung, nicht auf eine bessere Idee.

Eine **achtzehnte** Luecke ist in v286 aufgetaucht und in derselben Runde
geschlossen worden, deshalb steht sie hier nur als Klasse: `uxaudittor` meldete
„16,5 % gegen erlaubte 16" und nannte den Verursacher nicht. Meine erste
Vermutung (der fuenfte Bauknopf) war falsch; die richtige Ursache (der
laufende Strom im Wellenknopf) stand in einer Aufschluesselung, die es nicht
gab. **Eine Ratsche, die anschlaegt, ohne den Verursacher zu nennen, kostet
jedes Mal dieselbe halbe Stunde - und liefert dabei mit gleicher Sicherheit
den falschen.** Das Tor schluesselt seitdem je Wurzel auf.

**Nachgesehen in v284:** siebzehn Luecken, und die letzten beiden sind in
dieser Kette entstanden statt gesammelt worden. **M16** (ein Tor kann in der
Kette stehen, ohne je etwas bewiesen zu haben) hat seinen zweiten Fall
bekommen: `kuerzesteRoute` haette an den ausgelieferten Netzen nichts
beweisen koennen, weil keine Karte eine zweite Route hatte - das Tor stellt
den Fall seitdem selbst. **M17** ist der teuerste Fund der Kette: zwei
Anlaeufe fuer einen dritten Bot-Stil sind an einer Kennzahl gescheitert, die
klingt, als muesste sie stimmen.


Zu `KATALOG.md` und `STORIES.md`. **Die ersten fuenfzehn Abschnitte sind
gegen den Spielstand v248 (`5623c3b`) gemessen**; jeder spaetere nennt seine
eigene Fassung. Das ist Regel 12 und keine Formalie — dieses Verzeichnis
lebt davon, dass man einer Zahl ansieht, woran sie entstanden ist.

Dieses Verzeichnis hat mehrfach bezahlt, dass **eine Messung, die weniger sagt
als der Satz daneben, schlimmer ist als keine**: die Zahlwort-Tabelle (v230,
sie kannte 31 Schritte nicht und ließ sieben Fassungen lang eine falsche
Torzahl durch), die Sterne-Erreichbarkeit (v246, „zwei von vier Karten sind
nicht auf drei Sterne spielbar" hieß in Wahrheit „nicht mit drei bescheidenen
Bots"), und `min-height: 33%` (v248, eine Zusage aus v137, die still wegfiel,
weil ihr Bezugskasten verschwand).

Die folgenden Lücken sind in derselben Familie. Jede nennt: **welche
Frage** unbeantwortet ist, **warum** die vorhandenen Werkzeuge sie nicht
beantworten, und **wie** man sie messen würde.

Alle eigenen Zahlen hier stammen aus einem Klon von `5623c3b` außerhalb des
Projektbaums (`npx tsx tools/sim.ts`, `tools/guards.ts`, `tools/benchmark.ts`,
`tools/docs.mjs`), weil im Baum während dieser Arbeit ein Prüflauf mit
eingebautem Fehler stand (Regel 12).

---

## M1 · Die gemessenen Effekte sind kleiner als die Streuung des Messverfahrens

> **Geschlossen in v251/v253.** `AUSSAATEN` sind drei, jede Kennzahl trägt ihre
> Spanne, und wo ein Effekt kleiner ist als sie, steht **UNBELEGT** statt einer
> Zahl — gemessen gilt das für **alle vier** Zweigpaare. Seit v253 sind die
> Kennzahlen Ratschen (`tools/spannung-stand.txt`) und halten gegen ihr eigenes
> Rauschen.

**Die Frage.** Wenn `npm run sim` meldet, dass der Brecher elf Kristall mehr
bringt als die Streubombe — ist das eine Eigenschaft des Spiels oder ein
Zufall dieses einen Laufs?

**Warum die Werkzeuge sie nicht beantworten.** `tools/sim.ts` Zeile 21 trägt
`const SEEDS = [20260807];` — eine einzige Aussaat. Die drei „Abwandlungen"
(Zeile 30) verstellen die Rücklage des Bots (+0/15/30 Gold) und seinen
Startplatz, **nicht** den Zufallsgeber des Spiels. Sechs Kennzahlen laufen
über `overVariants`; die Zweigtabelle (Zeile 709–713) läuft als **ein einziger
Lauf je Zweig**, direkt unter dem eigenen Kommentar der Datei: *„gemessen an
einem einzelnen Verlauf ist das Chaos, nicht Balance."*

**Gemessen.** Vier Aussaaten, sonst unverändert:

| | 20260807 | 11111111 | 22222222 | 33333333 |
|---|---|---|---|---|
| Abstand der Spielstile | 6 | 10 | 5 | 7 |
| Mörser: Brecher − Streubombe | +11 | +1 | +3 | +1 |
| Prisma: Bündelung − Verzweigung | −2 | −10 | −1 | −10 |
| gemischt, Kristall von 60 | 43 | 47 | 43 | 47 |

Im selben Lauf meldet die Robustheitszeile eine Streuung von **5 / 5 / 7**
Punkten bei *identischen* Eingaben. Der Stilabstand (6) liegt darin; die
Zweigwirkung (2,5 Punkte auf der 100er-Skala) liegt weit darunter.

**Wie man es misst.** Drei Aussaaten × drei Abwandlungen, Mittelwert **und**
Spanne je Kennzahl, und eine Kennzahl, deren Effekt kleiner ist als ihre
Spanne, wird als `UNBELEGT` ausgegeben statt als Zahl. Die Zweigtabelle läuft
durch dieselbe Mittelung. Story S-P1-01.

**Was daran hängt.** G2 gilt heute als „zu einem Viertel erfüllt", und der
Beleg dafür sind die 18 % beim Mörser. Auf drei anderen Aussaaten sind es 2, 5
und 2 %. **G2 ist unbelegt, nicht teilweise erfüllt** — und jede Balancerunde
vor S-P1-01 justiert gegen Rauschen.

---

## M2 · „Macht Spaß" hat keine Messstelle, und die Ersatzzahlen messen etwas anderes

**Die Frage.** Woran erkennt ein Werkzeug, dass eine Partie Spaß gemacht hat?

**Warum die Werkzeuge sie nicht beantworten.** Sie können es grundsätzlich
nicht — Spaß ist eine Empfindung. Die zwölf Punkte des Spielspaß-Audits sind
Stellvertreter, und sie sind gut gewählt, aber sie sind **alle in eine
Richtung erfüllbar, die niemandem hilft**: Verluste über fünf Wellen, weniger
Restgold und ein größerer Stilabstand entstehen auch, wenn man das Spiel
einfach härter macht. Ein Spiel, das man verliert, erfüllt G1, G4 und G5 auf
einen Schlag.

**Wie man es misst.** Nicht direkt. Aber drei Ersatzfragen kommen näher als
die heutigen, und alle drei sind rechenbar:

1. **Entscheidungen, die etwas gekostet haben** — nicht wie viele Käufe der
   Bot tätigt, sondern wie oft er sich zwischen zwei Käufen entscheiden musste,
   weil das Gold nur für einen reichte (der Knappheitsanteil, S-P2-01).
2. **Umkehrpunkte** — Wellen, in denen der Kristall erst fiel und dann wieder
   stieg. Die gibt es heute nicht, weil der Kristall nie steigt; mit dem
   Kernraub (P3) werden sie zählbar, und der Rettungsanteil ist genau diese
   Zahl (S-P3-04).
3. **Wellen, in denen die Wahl etwas geändert hat** — heute 14 von 60 für die
   Zielwahl.

Der Rest bleibt `nutzer:` — der Nutzer urteilt auf dem iPhone quer, und das ist
kein Mangel, sondern die richtige Arbeitsteilung (Regel 8).

---

## M3 · Die Goldzahl misst zu einem unbekannten Teil den Bot

> **Geschlossen in v257, und die Lücke war größer als vermutet.** Neben der
> gedeckelten Zahl steht jetzt die ungedeckelte: der Bestleistungs-Bot (24 Türme,
> Stufe 6) lässt **14,6 %** liegen gegen 35,2 % — **mehr als die Hälfte der Zahl
> war der Deckel des Bots.** An ihre Stelle tritt der **Knappheitsanteil**
> (Meister 45,0 %), der nicht daran hängt, wieviel der Bot bauen darf.

**Die Frage.** Ist Gold in diesem Spiel knapp?

**Warum die Werkzeuge sie nicht beantworten.** „42,7 % des verdienten Goldes
bleiben liegen" (gemessen: 2687 von 6297) ist die Kernzahl von G5. Der Bot
baut höchstens zwölf Türme und 24 Ausbauten — er **kann** nicht alles
ausgeben. Das Spielspaß-Audit trägt die Einschränkung selbst und zieht
trotzdem den Schluss. Genau diese Klasse hat in v246 den Rückstandspunkt F7 als
Messfehler entlarvt.

**Gemessen daneben.** Über vier Aussaaten liegt der Restanteil bei 42,7 / 42,7
/ 41,6 / 42,7 % — sehr stabil, und das ist selbst ein Hinweis: eine Zahl, die
sich über vier Zufallsläufe um einen Prozentpunkt bewegt, beschreibt eher
einen Deckel als ein Spielgeschehen.

**Wie man es misst.** Der **Knappheitsanteil**: der Anteil der
Entscheidungszeitpunkte, an denen der Bot einen gewollten Kauf nicht bezahlen
konnte. Er hängt nicht am Deckel, sondern daran, ob Gold der Engpass ist. Dazu
dieselbe Zeile ein zweites Mal mit dem Bestleistungs-Bot (24 Türme, Stufe 6,
existiert seit v246). Story S-P2-01. Die Gegenprobe muss **in beide
Richtungen** laufen — 5000 Startgold und 50 Startgold —, sonst misst die neue
Zahl wieder etwas anderes (Regel 13).

---

## M4 · Der Stilabstand misst drei Botparameter, nicht drei Spielweisen

**Die Frage.** Wieviel besser ist ein guter Spieler als ein mittelmäßiger?

**Warum die Werkzeuge sie nicht beantworten.** Die drei Stile in
`tools/sim.ts` unterscheiden sich in `reserve` (40 / 15 / 140), `decideEvery`
(30 / 20 / 30) und `deepenAt` (0,65 / 1 / 0,5). Alle drei bauen zwölf Türme bis
Stufe 3, alle drei bauen dieselbe Turmmischung, alle drei zielen „vorn". **Die
drei Entscheidungen, die ein Mensch wirklich trifft — welcher Turm, welcher
Zweig, welcher Zielmodus — sind bei allen dreien gleich.** Ein Spiel, dessen
Zweigwahl 3 % bewegt, kann so gar keinen Stilabstand zeigen.

**Wie man es misst.** Eine vierte Achse, die eine echte Entscheidung
abbildet — der Stil „Hetze" aus S-P4-04 (startet früh und nimmt das Risiko) —
und danach ein Stil, der die Zweige falsch wählt. Der Abstand zwischen „wählt
richtig" und „wählt falsch" ist die Zahl, die G4 eigentlich meint.

> **Berichtigt in v315: der Befund oben stimmt nicht mehr, der Schluss schon.**
> Seit v293 baut `Breite` eine **eigene** Turmliste (`arrow, arrow, frost,
> arrow, mortar` — wer in die Breite geht, kauft Stueckzahl), und seit v284
> tragen die Stile verschiedene Weichenstellungen (`offen` gegen `lang`). Der
> Satz „alle drei bauen dieselbe Turmmischung" ist damit falsch.
>
> **Und genau das macht die Auskunft haerter statt weicher.** Der vorgeschlagene
> Eingriff ist gefahren worden, und der Abstand blieb bei **8,20** — Punkt fuer
> Punkt derselbe Wert wie mit gemeinsamer Liste. Ein zweiter Anlauf (`Sparsam`
> mit den teuren Tuermen) **verlor** in Welle 14. Die Vermutung dieses
> Abschnitts war also messbar, sie ist gemessen worden, und sie war falsch: die
> drei Stile lassen sich nicht trennen, weil zwischen ihnen wenig zu trennen
> ist. Die Fortsetzung steht in **M18**; ein Stil, der die Zweige absichtlich
> falsch waehlt, ist bis heute nicht gebaut.
>
> Der Preis fuers Stehenlassen waere hoch gewesen: eine Luecke, die ihren
> eigenen Loesungsvorschlag noch fuehrt, nachdem er gefahren und verworfen
> wurde, schickt den naechsten denselben Weg.

---

## M5 · Der Zielmodus wird gemessen, indem alle Türme umgestellt werden

**Die Frage.** Was bringt es, **einen** Turm auf „nah" zu stellen?

**Warum die Werkzeuge sie nicht beantworten.** `npm run sim` überschreibt in
der Zeile „Ziellogik (gemischtes Feld, **alle Türme** umgestellt)" jede
Zielwahl gleichzeitig. Ein Spieler stellt einen einzelnen Turm um; die Messung
beantwortet also eine Frage, die niemand stellt. Die zweite Zeile („Ziellogik
je Welle") zählt Alleinsiege ganzer Karten, nicht die Wirkung an einer Stelle.

**Gemessen.** Über vier Aussaaten gewinnt „stark" **null** Alleinsiege
(0/0/0/0) — das ist der einzige Befund dieser Familie, der über alle Aussaaten
hält. „nah" liegt bei 1/1/1/0.

**Wie man es misst.** Ein gestellter Fall je Modus im Rauchtest — ein Turm,
zwei Ziele, das richtige muss genommen werden — und daneben eine Messung, die
**einen** Turm umstellt und den Unterschied an dem misst, was dieser Turm
trifft. Story S-P5-07 verlangt beides.

---

## M6 · Wie lange eine Partie dauert und wieviel davon Warten ist, misst niemand

> **Geschlossen in v255 — mit einem Befund über die Messstelle.** Dauer je Karte:
> Spiralhain **470 s**, Frostspalte 398, Ascheschlucht 287, Farnkessel 276. Der
> Leerlaufanteil kommt auf **0,1 %**, misst aber den Bot: der startet jede Welle
> in demselben Bild, in dem er es darf. Was ein Spieler als Warten erlebt, steht
> daneben als **dünne Zeit** (höchstens ein Gegner, 17–23 %).

**Die Frage.** Zieht sich das Spiel?

**Warum die Werkzeuge sie nicht beantworten.** Der reine Gegnerausstoß aller
fünfzehn Wellen des Spiralhains beträgt 201 Sekunden (Audit 2.7); dazu kommen
Laufzeit über 3942 Weltpunkte Bahn und die Zeit zwischen den Wellen.
`stats.duration` wird im Spielzustand mitgeführt und **von keinem Werkzeug
ausgegeben**. Damit gibt es für P4 (überlappende Wellen) kein Vorher und kein
Nachher, und der häufigste Vorwurf an Kingdom Rush — „lange Abschnitte ziehen
sich" — ist bei uns unmessbar.

**Wie man es misst.** Dauer je Partie und **Leerlaufanteil**: der Anteil der
Spielzeit, in dem kein Gegner lebt und keine Welle ausstößt. Story S-P1-04.
Die Gegenprobe ist hier heikel: eine Zahl, die sich beim Verlängern der Pausen
nicht bewegt, misst etwas anderes.

---

## M7 · Wann eine Entscheidung fällt, misst niemand

> **Geschlossen in v254, und die alte Zahl war falsch.** Gezählt am Bot über drei
> Aussaaten × drei Abwandlungen: **55,2** Entscheidungen, **3,7 je Welle**,
> **51 %** in der ersten Hälfte — gegen „36, gut zwei je Welle, meistens früh".
> **Keine Welle** ist entscheidungslos.

**Die Frage.** Enthält jede Welle eine Entscheidung (G7)?

**Warum die Werkzeuge sie nicht beantworten.** Das Audit rechnet „12
Bauentscheidungen und 24 Ausbauentscheidungen, also 36 — gut zwei je Welle, und
die meisten davon früh". Die 36 sind zwei Summenfelder des Ergebnisses. Der
Halbsatz „die meisten davon früh" ist **nicht gemessen**; er ist plausibel und
steht ohne Zahl da.

**Wie man es misst.** Ein Zähler je Welle über alle Entscheidungsarten (Bauen,
Ausbauen, Verkaufen, Versetzen, Fähigkeit, Zielmodus), daraus zwei Zahlen:
Wellen ohne jede Entscheidung, und Anteil der Entscheidungen in der ersten
Planhälfte. Story S-P1-03.

---

## M8 · Der Grad „Ruhig" verliert nie einen Punkt, und kein Tor sagt es

> **Gegenstandslos seit v314 — und das ist ausdruecklich keine Behebung.** Die
> drei Grade sind mit S-N1-05 ausgebaut worden: sie beantworteten dieselbe
> Frage wie die Laufstruktur, und solange beides nebeneinander stand, mass die
> Balance zwei Dinge auf einmal (Regel 4). Es gibt nur noch `normal`; ein Grad,
> auf dem nichts passieren kann, kann damit nicht mehr existieren.
>
> **Was von der Luecke bleibt, ist der Satz eine Ebene hoeher, und der ist
> heute offen:** die Frage „kann ueberhaupt etwas passieren" wandert von den
> Graden auf die ABSCHNITTE des Laufs — und dort steht sie als **N1K** im
> Verzeichnis. Gemessen: **0 / 0 / 0 / 6** Kristallverlust in v308, und nach
> der Lauf-Steigung von v309 **0 / 0 / 7 / 11** — aus drei folgenlosen
> Abschnitten sind zwei geworden, erlaubt ist einer. Ein Abschnitt, der nichts
> kostet, ist derselbe Defekt wie ein Grad, der nichts kostet; nur die Ebene
> hat gewechselt. Die alte Story `S-P2-05` ist mit dem Katalog von v269
> entfallen.

**Die Frage.** Kann auf jedem Schwierigkeitsgrad überhaupt etwas passieren?

**Warum die Werkzeuge sie nicht beantworten.** `npm run sim` prüft, dass
mindestens zwei von drei Spielstilen durchkommen und dass das gemischte Feld
nicht verlustfrei gewinnt — beides **nur auf dem Grad „Normal"**. Für die
anderen Grade prüft es nur die Reihenfolge der Ergebnisse.

**Gemessen.** Auf „Ruhig" enden alle drei Stile mit **80 von 80** Kristall.
Nicht ein Punkt geht verloren, auf keiner der geprüften Läufe. Das ist derselbe
Defekt wie G1, eine Ebene tiefer.

**Wie man es misst.** Eine Prüfung „kein Grad darf für alle Spielstile
verlustfrei enden". Sie muss **heute schon anschlagen** — eine Prüfung, die
den Zustand, den sie behebt, nicht meldet, prüft nichts (Regel 13). Story
S-P2-05.

---

## M9 · Der Genre-Abgleich widerspricht seinem eigenen Werkzeug, und der Wächter kann es nicht sehen

**Die Frage.** Stimmt das Dokument, das sich selbst „die Grundlage für
`npm run bericht`" nennt?

**Der Widerspruch.** `docs/Towerfront-BENCHMARK.md` beginnt mit *„Messung: v35
· Aktueller Wert: 27 von 30 Kriterien, gewichtet 93 %"*, führt **drei** Karten
und nennt R4 („etwas, das aufhält statt tötet") und G5 („unterstützende
Gegner") als offenes Delta. Gemessen im Klon: `npm run bericht` meldet
**30/30, gewichtet 100 %, davon 68/68 Gewicht gemessen**; es gibt **vier**
Karten; R4 ist das Bollwerk (der Quelltext von `src/data/abilities.ts` nennt R4
ausdrücklich) und G5 der Schildträger (v110, im Rückstandsverzeichnis als
geschlossen geführt). Das Dokument liegt **213 Fassungen** zurück.

**Warum der Wächter schweigt.** `tools/docs.mjs` Zeile 321 sucht
`Stand: (v\d+)` und überspringt jede Datei ohne diese Form — mit der
ausdrücklichen Begründung: „Ein Messbericht trägt `Messung: vNN` und beschreibt
absichtlich den Stand von damals; ihn zu aktualisieren wäre Fälschung." Der
Ausnahmegrund ist richtig. Er trifft nur dieses Dokument nicht, weil es kein
Messbericht ist. **Eine Ausnahme, die man einmal einräumt, bleibt stehen, bis
niemand mehr weiß, dass sie eine war** — dieser Satz steht wörtlich in
`CLAUDE.md`, über einer anderen Ausnahme.

**Wie man es misst.** Das Dokument bekommt `Stand: vNNN` und fällt damit unter
die Standregel; seine Zahlen werden durch den Befehl ersetzt, aus dem sie
kommen (das Muster, das `Towerfront-GROESSENHAUSHALT.md` in v230 bekommen hat).
Und eine Gegenprobe, die `Stand: v` durch `Messung: v` ersetzt — sonst ist die
Ausnahme ein Loch, durch das jedes Dokument schlüpfen kann. Story S-P1-05.

---

## M10 · Ein Rückstandspunkt wird von einem Großbuchstaben offengehalten — und zwei Dokumente messen dieselbe Sache verschieden

> **Geschlossen in v249 und v256.** E6 ist zu; und der Doku-Wächter meldet seit
> v256 den Fall selbst, an dem es hing: das gesuchte Wort steht nur in **anderer
> Schreibweise** in der Zieldatei. Kommt es gar nicht vor, schweigt die Meldung.

**Die Frage.** Ist E6 („Das Wellenband: Vorschau, Fortschritt, lebender
Hauptknopf") noch offen?

**Gemessen.** Nein. Alle drei Symptome sind seit v239 behoben: `src/ui/ui.ts`
Zeile 835 setzt `Welle N · noch X`, die Vorschau bleibt stehen
(`vorschauWelle`), der Hauptknopf ist nie tot. Der Quelltext an Zeile 828 nennt
E6 und G12 selbst. Offen bleibt der Punkt, weil seine Bedingung
`text src/ui/ui.ts "wellenfortschritt" >= 1` **klein** schreibt und der
Quelltext `Wellenfortschritt` **groß**: `grep -c` liefert **0 gegen 1**, und
`tools/docs.mjs` vergleicht buchstabengetreu (`inhalt.split(wort).length - 1`).

**Der zweite Widerspruch, dieselbe Sache.** E6 schreibt: *„Die Anzahl-Marke der
Vorschau misst 38 × 20 und liegt damit unter den 44 Punkten aus
`npm run beruehrung`."* `docs/Towerfront-AUDIT-HUD-UND-BILDSCHIRM.md` Teil 4
schreibt zu H12: *„erledigt — Kasten 40 × 20, **Trefferfläche 52 × 46**;
gemessen wird die Trefferfläche, nicht der Kasten."* Beide Sätze beschreiben
dasselbe Element. Einer misst den Kasten, der andere die Trefferfläche, und
keiner sagt es dem anderen.

**Wie man es misst.** Zwei Dinge, und das zweite ist das wichtigere: E6 ins
Erledigte umtragen — und `tools/docs.mjs` meldet künftig, wenn eine
Schließbedingung **nur in anderer Groß-/Kleinschreibung** in ihrer Zieldatei
vorkommt. Story S-P1-06.

---

## M11 · Drei Löcher in der Schließbedingung — eines ist bekannt, zwei nicht

**Die Frage.** Kann man sich darauf verlassen, dass ein offener Punkt offen ist
und ein geschlossener geschlossen?

**Was gehalten wird.** `tools/docs.mjs` wertet jede Bedingung zweimal aus:
gegen die Wirklichkeit und gegen zwei gestellte Texte. Das fängt `>= 0`, eine
unbekannte Form, eine fehlende Datei und einen unbekannten Listennamen — alle
vier einzeln nachgefahren, und es steht ehrlich im Quelltext.

**Loch 1 (bekannt, steht in `CLAUDE.md`).** Die **zu hohe Schwelle**:
`text … "Heiler" >= 99` läuft durch, der Punkt bliebe still für immer offen.
Kein billiges Verfahren trennt „hoch" von „absurd".

**Loch 2 (nicht aufgeschrieben).** Die **zu niedrige Schwelle**. `text … >= 1`
zählt Vorkommen im ganzen Dateitext, **auch in Kommentaren**. Wer über eine
Funktion schreibt „hier käme später der Heiler hin", schließt C6, ohne dass
etwas gebaut wurde. Gegenmittel, das nichts kostet: `>= 2` verlangen
(Definition **und** Benutzung) und Bezeichner wählen, die nur im Code Sinn
ergeben. In `STORIES.md` steht deshalb fast überall `>= 2`.

**Loch 3 — geschlossen in v313, und es hatte vorher zugeschlagen.** Eine Zeile
mit einer **Kennung außerhalb des Musters** wurde stillschweigend übersprungen;
der Abbruch kam erst, wenn **keine einzige** Zeile passte (`if (gepruefte ===
0)`). Der Verdacht stand hier mit erfundenen Beispielen (`E6b`, `F10a`) — die
Wirklichkeit lieferte zwei echte: **`N1K` und `N1G`**, beide seit v309 offen,
beide mit Schliessbedingung, und **keine ist je ausgewertet worden**, weil die
Regel `[A-Z]+\d+(?:-[A-Z])?` hinter der Ziffer nichts oder einen Bindestrich
verlangte und nicht einen Buchstaben.

Die Kennung nimmt jetzt einen Buchstaben, und — das ist der wichtigere Teil —
eine Zeile im Abschnitt „Offen", die der Waechter nicht lesen kann, wird
**gemeldet statt uebergangen**. Sonst kommt derselbe blinde Fleck mit der
naechsten Namensform zurueck, und wieder merkt es niemand.

**Was offen bleibt.** Loch 1 (die zu hohe Schwelle) wird berichtet, nicht
behauptet (S129). Loch 2 (die zu niedrige) ist billig gehalten, aber nicht
erzwungen: `STORIES.md` verlangt fast ueberall `>= 2`, ein Tor prueft das
nicht.

---

## M12 · Der Endlosmodus wird von einem Bot gemessen, und nur bis Welle 19

**Die Frage.** Ist der Endlosmodus ein Modus?

**Warum die Werkzeuge sie nicht beantworten.** `npm run sim` fährt ihn genau
einmal, mit dem Stil „Meister", und meldet „Endlos: bis Welle 19, 12 Türme".
Die Frage, für die der Modus da ist — *kommt ein guter Spieler weiter als ein
mittelmäßiger* —, wird nicht gestellt: es läuft nur ein Stil, und der
Bestleistungs-Bot aus v246 läuft dort gar nicht.

**Wie man es misst.** Alle vier Stile plus Bestleistung im Endlosmodus, und die
Kennzahl ist der **Abstand zwischen ihnen**, nicht die erreichte Welle. Er muss
größer sein als im Pflichtprogramm — sonst ist der Modus dieselbe Karte mit
mehr Wellen. Story S-P7-02.

---

## M13 · Das Zielgerät ist ungemessen, und die HUD-Zahlen stammen aus verschiedenen Läufen

**Die Frage.** Wie verhält sich das Spiel auf dem iPhone quer?

**Warum die Werkzeuge sie nicht beantworten.** Alle Browserzahlen entstehen
unter **SwiftShader, also ohne Grafikkarte**. Der JavaScript-Anteil trägt auf
ein Telefon über, Rastern und Zusammensetzen nicht (Regel 12). D27 steht seit
Langem offen und ist ausdrücklich `nutzer:` — dieser Rechner hat kein
`/dev/dri`. Es gibt bis heute **keine einzige Messung vom Zielgerät**, auch
keine Ladezeit; das Größenbudget von 1800 KB ruht auf Chromium-Zahlen einer
lokalen Datei.

**Ein zweiter, kleinerer Fall derselben Art.** Der HUD-Audit vergleicht in
Teil 4 die Belegung „v238 gegen v248" — 39,5 % gegen 32,9 % beim Prüfsteg. Die
39,5 stammen aus dem Erstlauf des Audits, die 32,9 aus dem Lauf zu v248. Was
sich dazwischen an der **Messung** geändert hat (v242: das UX-Tor baute nicht
selbst und sah seine eigenen Eingriffe nicht), steht im Verzeichnis, aber nicht
an der Tabelle. Zwei Zahlen in einer Zeile, die nicht aus demselben Verfahren
kommen, sind ein Vergleich mit Vignette gegen einen ohne (S110).

**Wie man es misst.** D27 bleibt `nutzer:`. Für den zweiten Fall genügt eine
Zeile an der Tabelle: mit welcher Fassung des Werkzeugs jede Spalte gemessen
wurde.

---

## M14 · Ob es gut aussieht, sagt kein Tor — und eine der HUD-Zahlen ist als Untergrenze zu lesen

**Die Frage.** Sieht das Spiel gut aus, und trifft man beim Tippen, was man
treffen will?

**Warum die Werkzeuge sie nicht beantworten.** Regel 8 sagt es selbst: das
Bildtor prüft das Mechanische — einfarbige Fläche, falsche Helligkeit, nicht
dekodierte Bilder. Ob es *gut aussieht*, sagt es nicht. D19 („Plastik im Bild
selbst") ist deshalb `blick:` und braucht neue Bilder, nicht Code.

**Und eine Zahl im HUD-Audit trägt ihre Einschränkung mit, wird aber gern ohne
sie zitiert.** „Von 1508 freien Rasterpunkten öffnen 267 die Turmwahl —
17,7 %" gegen 30 % nach der Bauregel. Der Audit schreibt dazu: der Tastlauf
trägt seinen Zustand mit, ein Tipp nach einer geöffneten Wahl schließt sie
wieder, **jeder zweite Treffer zählt deshalb als Fehlschlag**. Die 17,7 % sind
eine Untergrenze, kein Messwert — sie beweisen, dass ein Tipp oft ins Leere
geht, nicht wie oft.

**Wie man es misst.** Ein Tastlauf, der zwischen zwei Tipps den Zustand
zurücksetzt. Solange es den nicht gibt, gehört an jede Verwendung der 17,7 %
das Wort „mindestens".

---

## M15 · Niemand misst, ob der Spieler versteht, warum er verloren hat

**Die Frage.** Weiß der Spieler nach einer Niederlage, was er hätte anders
machen sollen?

**Warum die Werkzeuge sie nicht beantworten.** Die Auswertung
(`src/game/auswertung.ts`) liefert erreichte Welle, Kristall, Sterne, Kills,
gebaute Türme, Schaden und Dauer, und die Bilanz nennt den Schadensanteil je
Quelle — das ist mehr, als die Referenzen zeigen, und es steht zu Recht als
Stärke im Genre-Abgleich. Gemessen wird davon, **dass** die Zahlen entstehen
(Kriterium P2 in `npm run bericht`, dazu der Rauchtest an einer wirklich
durchgespielten Partie), nicht, dass sie eine Frage beantworten.

Die Frage nach der Niederlage ist eine andere als die nach dem Schaden: „mein
Mörser hat 40 % gemacht" sagt nicht, dass in Welle 12 zwei Gleiter durchkamen,
weil an der linken Bahn kein Turm mit Luftziel stand.

**Wie man es misst.** Aus dem, was der Spielzustand ohnehin führt: `leaksByWave`
weiß, wann; die Bahn des durchgekommenen Gegners weiß, wo; `konterSatz` weiß
schon heute, was gegen ihn hilft, und er wird aus den Daten gerechnet statt
geschrieben. Ein Satz je Niederlage, aus diesen drei Quellen abgeleitet, wäre
prüfbar — der Rauchtest kann verlangen, dass er für jede Gegnerart entsteht und
**nicht für alle** (das ist die Regel, an der `npm run konter` schon hängt: ein
Hinweis, der immer dasteht, ist keiner).

**Warum es hier steht und nicht als Story.** Es ist die einzige Lücke dieser
Liste, für die es noch keinen belegten Bedarf gibt — der Nutzer hat sie nicht
gemeldet, und keine Messung zeigt darauf. Sie gehört ins Verzeichnis, damit sie
nicht vergessen wird, nicht in den Plan.

---

## M16 · Ein Tor kann seit jeher in der Kette stehen, ohne je etwas bewiesen zu haben

**Gefunden in v269, geschlossen in v272 — und dieses Verzeichnis konnte es
nicht wissen.** Die fuenfzehn Luecken davor sind aus dem gesammelt, wovon wir
wissen, dass wir es nicht messen. Ein Tor, das laeuft, gruen meldet und dabei
nichts prueft, kommt in so einer Sammlung nicht vor: es sieht von aussen aus
wie eine Messung.

Sichtbar wurde es durch eine Zaehlung, nicht durch ein Nachdenken. Von 33
Kettenschritten hatten vier keine einzige Gegenprobe. Zwei sind keine Tore
(`build`, `bericht`), einer ist seit v233 bekannt gegenstandslos
(`bahntreuetor`) — und `bench` war schlicht unbewiesen.

**Es war schlimmer als unbewiesen: es konnte nichts melden.** Gemessen in
v272, vier Ursachen: die Grenze lag 49 mal ueber dem Messwert (4 ms gegen
0,081); die Last war so duenn, dass das Herausnehmen des ganzen
Umkreisrasters 0,079 statt 0,081 ms ergab; die Last schmolz waehrend der
Messung von 320 auf 84 Gegner; und der letzte Block mass gar keine Simulation
mehr, weil die Partie zwischendurch endete. Die letzten beiden waren
unsichtbar, solange 1500 Schritte in einem Stueck gemittelt wurden.

**Die Luecke ist damit nicht `bench`, sondern das Verfahren.** Was ein Tor
haelt, weiss man erst, wenn jemand den Fehler stellt, gegen den es steht. Die
Zaehlung „welcher Kettenschritt hat wieviele Gegenproben" gehoert deshalb
regelmaessig gefahren, nicht einmal.

**Offen bleibt der zweite Teil.** Eine Gegenprobe belegt, dass ein Tor bei
EINEM gestellten Fehler anschlaegt. Sie sagt nichts darueber, wieviel von dem,
was es zu halten vorgibt, es wirklich haelt — `bench` faengt jetzt einen
Aufwand, der mit der Gegnerzahl waechst, und ausdruecklich NICHT einen, der
beide Lasten gleich trifft. Das steht im Kopf des Werkzeugs, gemessen wird es
nicht.

**Drei Faelle in drei Fassungen (v311 bis v313), und keiner ist am Spiel
aufgefallen.** Sie stehen hier zusammen, weil erst die Reihe die Klasse zeigt:

| Fassung | was gruen meldete, ohne pruefen zu koennen |
|---|---|
| **v311** | `laufMessen` rechnete die Rampentabelle DANEBEN noch einmal selbst, statt sie am Spiel abzulesen. Ein Fehler in `GameState` kam an und bewirkte nichts — das Tor prueft seine eigene Kopie (Regel 5 und Regel 15 in einem). Die Rampe steht jetzt an EINER Stelle (`GameState.laufRampe`) |
| **v312** | Der Nachtlauf konnte seit v221 **gar nicht rot werden**: der Schritt endete auf `\| tee`, und der Ausgang einer Rohrleitung ist der des LETZTEN Gliedes. Anderthalb Jahre lang. Jetzt `set -o pipefail` UND der Protokollgriff — zwei unabhaengige Signale |
| **v313** | Vier Rauchtest-Schritte aus v303–v306 sind `async`; `step` nahm `fn: () => void` und fing im try/catch nie eine abgelehnte Zusage. **Vier Abnahmen aus vier Runden waren nur scheinbar gehalten**, und dass es auffiel, war Glueck |

**Was die drei gemeinsam haben, ist nicht der Fehler, sondern die
Unsichtbarkeit:** jedes dieser Tore lief, meldete gruen und sah dabei von
aussen aus wie eine Messung. Die Zaehlung „welcher Kettenschritt hat wieviele
Gegenproben" haette keinen der drei gefunden — alle drei HATTEN Gegenproben.

**Daraus die eine Frage, die dieses Verzeichnis noch nicht beantwortet:** kann
dieses Tor ueberhaupt einen Ausgang ungleich null erzeugen? In v312 ist sie
zum ersten Mal fuer alle vierunddreissig Kettenschritte von Hand gestellt
worden (drei Ausnahmen, alle drei zu Recht: `tsc` und `build` melden selbst,
`bericht` ist ausdruecklich kein Tor). **Von Hand** heisst: beim naechsten Mal
wieder von Hand, oder gar nicht.

---

## M20 · Ein Bot ohne Deck misst ein Spiel, das eines hat — und die Lücke ist zugefallen, weil eine Zahl zu schlecht aussah

**Gefunden in v308, und zwar an einer roten Zahl statt an einer grünen.** Der
Lauf über alle Abschnitte (`laufMessen`) meldete seit v302 eine Rampe von
**1,00 → 1,12 → 1,82 → 14,89** und einen letzten Abschnitt, der in Welle 7
verloren geht. Daraus wurde der Rückstandspunkt N1K: „die Kurvenform überlebt
das Strecken auf einen Lauf nicht."

**Der Bot fuhr aber ohne Deck.** `play` zog keine Karte — der Kartenzug aus
v303 lebt in `karteNehmen`, und den ruft nur die Oberfläche. Ein Spieler hätte
in Welle 46 **fünfundvierzig** Karten genommen. Gemessen mit Deck:

| | ohne Deck | mit Deck |
|---|---|---|
| Abschnitte gewonnen | 3 von 4 | **4 von 4** |
| letzter Abschnitt | verloren in Welle 9 | **gewonnen, 36/42 Kristall** |
| Wellen gefahren | 54 von 60 | **60 von 60** |

Die Nullprobe steht daneben und läuft bei jedem Lauf mit: derselbe letzte
Abschnitt, derselbe Versatz, einmal ohne Karten.

**Die Klasse ist Regel 12, und diesmal andersherum als sonst.** Die Regel ist
in diesem Verzeichnis fünfmal an einer Zahl bezahlt worden, die zu GUT aussah;
hier sah eine zu SCHLECHT aus, und das Ergebnis war dasselbe — eine Runde
Arbeit an der falschen Ursache wäre die Folge gewesen (eine Kurvenform, die
gar nicht kaputt ist). **Eine Messung, die eine Mechanik des Spiels nicht
mitfährt, misst ein anderes Spiel**, und ob das auffällt, hängt allein davon
ab, in welche Richtung die Zahl abweicht.

**Was daraus folgt und noch nicht getan ist:** derselbe Verdacht gilt für
jede weitere Mechanik, die nur über die Oberfläche erreichbar ist. Die
Abschnittswahl (`abschnittWaehlen`) fährt der Bot inzwischen mit, die
Erfahrung zwischen den Läufen (S-N1-04) absichtlich nicht (Regel 4). Wer die
nächste solche Mechanik baut, muss den Bot in derselben Runde mitziehen —
sonst entsteht die Lücke ein zweites Mal, und dann an einer Zahl, die niemand
nachprüft.

## M19 · C18 faehrt eine Aussaat und hat eine steile Kante

**Die Frage.** Ist die erste Karte mit **einer** Faehigkeit zu gewinnen? Das
ist die Abnahme der ganzen Eroeffnung (S4 des Faehigkeiten-Abgleichs), sie
steht im Rauchtest und macht die Torkette rot.

**Warum sie heute wackelt.** `npm run c18` faehrt **eine** Aussaat (4242).
Gemessen beim Scharfstellen der Vielfaltsbeute (v301):

| Zuschlag | erste Karte |
|---|---|
| 0 | gewonnen, 17/42 |
| 0,05 | gewonnen, 17/42 |
| 0,08 | gewonnen, **19/42** |
| 0,10 | gewonnen, **19/42** |
| 0,12 | gewonnen, 15/42 |
| 0,15 | **verloren in Welle 14** |

**Der Sprung von 15 auf verloren ist kein Verlauf, sondern eine Kante** — und
sie liegt zwischen zwei Werten desselben Parameters, der dem Spieler nur MEHR
Gold gibt. Dass mehr Gold die Eroeffnung verliert, ist Wegabhaengigkeit: der
Bot kauft frueher etwas anderes, und der Verlauf kippt.

**Warum das schlimmer ist als eine fehlende Funktion.** Eine Zahl aus einem
Lauf kann eine Kante nicht von einem Wurf unterscheiden. Steht die Kante
wirklich dort, ist 0,15 unspielbar; ist sie ein Wurf dieser einen Aussaat,
haben wir eine brauchbare Einstellung verworfen. Beides ist heute nicht zu
entscheiden — und dieselbe Klasse hat in dieser Sitzung schon zweimal Runden
gekostet (M18 und die Verteiler-Zusage, v296 und v300).

**Was fehlt.** Dasselbe wie dort: mehrere Aussaaten und ein Band an derselben
Messstelle. Der Preis ist Laufzeit — `npm run c18` ist heute zwei Sekunden und
sitzt im Rauchtest.

**Nicht in v301 repariert, und das ist Absicht:** eine Pruefung in derselben
Runde zu lockern, in der die eigene Aenderung an ihr scheitert, waere kein
Beweis (v219). Gesetzt ist deshalb 0,10 — ein Wert, an dem C18 mit 19 gegen 17
Kristall BESSER dasteht als ohne die Regel, und zwei Werte darunter halten
ebenfalls.

---

## M18 · Der Abstand der Spielstile misst drei Bots, die dasselbe bauen

**Die Frage.** `npm run sim` haelt „Abstand der Spielstile" als Ratsche:
bester minus schlechtester Stil, Spiralhain, normal, drei Aussaaten mal drei
Abwandlungen. Sie soll sagen, ob das Spiel verschiedene Spielweisen belohnt.

**Warum sie das nicht sagt.** Die drei Stile (`Meister`, `Breite`,
`Sparsam`) fahren **dieselbe Turmliste** — `['arrow', 'arrow', 'mortar',
'frost', 'prism']`. Sie unterscheiden sich in Ruecklage, Ausbautiefe und
Entscheidungstakt, nicht darin, WAS sie bauen. Ihr „Abstand" ist damit der
Unterschied zwischen drei fast gleichen Bots.

**Gemessen in v286**, beim Einbau des Wiederholungsaufschlags:

| Zuschlag | Abstand der Spielstile |
|---|---|
| 0 | 8,20 |
| 0,15 | **1,46** |
| 0,25 | **11,64** |
| 0,35 | 4,50 |

Zehn Punkte Spanne ueber einen Parameter, der die drei Stile **gar nicht
unterscheidet** — er trifft alle gleich, weil alle dieselbe Liste fahren.
Angegeben ist ein Rauschen von 3 bis 5; das misst nur die Aussaat, nicht die
Lage. Nicht monoton, also kein Zusammenhang.

**Warum das schlimmer ist als eine fehlende Funktion.** Die Ratsche steht in
der Torkette und macht Runden rot. Sie hat in v286 eine Mechanik abgelehnt,
die nachweislich tut, was sie soll — und sie haette dieselbe Mechanik bei
Zuschlag 0,25 durchgelassen. Eine Pruefung, deren Urteil vom Wuerfel abhaengt,
ist schlimmer als keine: sie sieht aus wie ein Beweis.

**Gemessen in v293 — und die Ursache liegt tiefer als der Messplatz.** Die
Vermutung war: gebt den Stilen eigene Sortimente, dann trennt der Abstand
etwas. `Breite` hat seins bekommen (drei Bogentuerme statt der gemischten
Liste — wer in die Breite geht, kauft Stueckzahl), und **der Abstand blieb bei
8,20.** Punkt fuer Punkt derselbe Wert wie mit gemeinsamer Liste.

**Das Sortiment aendert das Ergebnis kaum.** Vier Geschuetze, und welches man
baut, macht sechs Punkte aus. Damit ist M18 keine Luecke des Messgeraets
allein: die drei Stile lassen sich nicht trennen, weil es zwischen ihnen wenig
zu trennen gibt. Dieselbe Ursache steht eine Zeile tiefer schon als **kleinste
Zweigwirkung UNBELEGT** — die Zweigwahl bewegt nichts ueber der Streuung, und
die Turmwahl offenbar auch nicht.

**Ein zweiter Anlauf ist gemessen und verworfen:** `Sparsam` bekam die teuren
Tuerme („wer wenige Stellungen haelt, will dass jede zaehlt") und **verlor** in
Welle 14, bei 91 % Knappheit und 4045 statt 6300 Gold. Teure Tuerme frueh und
eine Ruecklage von 140 heisst zu wenig Verteidigung, zu wenig Beute, und von da
an kommt er nicht mehr in Fahrt. Seine dritte Achse ist die **Tiefe**, nicht
das Sortiment.

**Der Versuch hat dabei eine echte Luecke der Ratsche gefunden, und die ist
geschlossen.** Mit dem verlierenden `Sparsam` sprang der Abstand von 8 auf 28
und meldete zum ersten Mal ueberhaupt **ERREICHT** — eine Kennzahl, die sich
durch **Verschlechtern** eines Bots verbessern laesst, ist keine.
`npm run sim` verlangt seitdem, dass **jeder** Stil die erste Karte in
**jedem** Lauf gewinnt; sonst misst der Abstand die Schwaeche des
schlechtesten statt die Verschiedenheit der drei.

**Was bleibt.** Nicht mehr „der Messplatz sieht nichts", sondern: es ist wenig
da. Solange die Turmwahl sechs Punkte ausmacht, kann keine Kennzahl ueber
Spielstile mehr als sechs Punkte finden — und das ist eine Aussage ueber das
Spiel, die in kein Werkzeug gehoert, sondern in den Katalog.

**Gemessen in v296 — das Band stand an der falschen Messstelle, und das ist
die Ursache hinter dem Wuerfel.** `r.rauschen` war die Streuung EINES Stils
ueber die Aussaaten. Geratscht wird aber die DIFFERENZ zweier Stile, und die
hat eine eigene Streuung: der Verlauf ist wegabhaengig, also verschiebt schon
eine Preisregel, die alle drei Stile gleich trifft, wer wann welchen Turm
stellt — und damit den Abstand.

| | gemessen am heutigen Baum |
|---|---|
| Wert | **8,20** |
| Band je Stil (bis v295) | 4,4 |
| **Band je Lauf (ab v296)** | **19,0** |

Der Wert liegt vollstaendig in seiner eigenen Streuung. Und wie knapp das
alte Band gehalten hat, sagt die dritte Zahl: der Stand steht auf 12,43, der
Fall betraegt 4,23, das alte Band 4,37 — **die Ratsche bestand um 0,14
Punkte.** Sie hat weder gehalten noch geschlagen; sie sass im Rauschen.

**Die Probe darauf ist der Fall aus v287 selbst.** Derselbe
Wiederholungsaufschlag von 0,15, der die Ratsche damals rot gemacht hat,
laesst sie jetzt schweigen: 10,58 gegen Stand 12,43 bei einem Band von 23,81.
Und der Lauf ist trotzdem rot — an zwei Befunden, die das SPIEL betreffen:
die Ziellogik „stark" gewinnt keine Welle mehr, und die duenne Zeit steigt von
15,06 auf 16,84 bei einem Band von 1,63. Das ist der Unterschied, um den es
geht: **was uebrig bleibt, ist Arbeit statt eines Wurfs.**

**Die Zahl selbst bleibt unbelegt, und der Lauf sagt es jetzt.** Bis v295 lag
8,20 ueber dem angegebenen Band von 4,4, die Meldung „UNBELEGT" blieb also
aus; mit dem richtigen Band kommt sie in jedem Lauf. M18 ist damit nicht
geschlossen — die Ursache („es ist wenig da") ist unveraendert. Was zu ist:
die Ratsche urteilt nicht mehr ueber etwas, das sie nicht messen kann.

---

## M17 · Gedeckte Länge sagt den Verlust nicht vorher

**Die Frage.** Welche Weichenstellung ist die bessere?

**Warum die Werkzeuge sie nicht beantworten.** Die naheliegende Zahl ist die
**gedeckte Länge**: wieviel der Bahn die eigenen Türme zusammen sehen.
`bahnentwurf` misst sie seit v217, und sie klingt richtig — mehr Strecke unter
Feuer heisst mehr Schaden.

**Gemessen in v284 stimmt das nicht.** Auf dem Spiralhain decken die zwölf
besten Plätze mit gestellter Weiche **4896 statt 3864** Weltpunkte, die
Wegvielfachheit steigt von 0,87 auf 1,23 — und der Stil `offen` gewinnt
trotzdem die Wellen 11, 14 und 15 allein. Zweimal nachgerechnet, einmal gegen
zwölf Türme und einmal gegen vier: der Stil, der auf gedeckte Länge hin
optimiert, gewinnt **nirgends** allein.

Damit ist ein ganzer Bot-Stil zweimal an dieser Zahl gescheitert (v283 und
v284), und die Ursache liegt nicht bei ihm.

**Was fehlt.** Eine Kennzahl, die aus der Geometrie einer Stellung den
erwarteten Verlust schätzt — Zeit unter Feuer je Gegner, gewichtet nach der
Zahl der Türme, die eine Stelle sehen, und danach, WANN sie im Lauf steht.
Solange es sie nicht gibt, kann kein Bot eine Weichenstellung *bewerten*; er
kann sie nur fest wählen (`offen`, `lang`) und das Ergebnis abwarten.

**Warum das mehr ist als eine fehlende Zahl.** Der Spieler steht vor derselben
Frage, und ihm hilft heute niemand: die Karte zeigt seit v282 beide Routen,
aber nicht, welche die bessere ist. Eine Entscheidung, deren Folgen man nicht
abschätzen kann, ist ein Ratespiel — genau der Vorwurf, den das
Spielspaß-Audit dem alten Turmausbau macht.

---

## M22 · Ein Beweismittel, das eine Sache weglässt, erzeugt Befunde über genau diese Sache

**Gefunden zweimal in zwei Runden (v318, v319), und beide Male hat es einen
Befund über das Spiel erzeugt, den es nicht gab.**

Der Inspektor sieht Bericht und Bilder, nicht den Code — das ist der Sinn der
Einrichtung, und sie hat elf von 57 Befunden geliefert. Sie hat aber eine
Voraussetzung, die nirgends geprüft wird: **dass das Bild zeigt, was das Spiel
zeigt.**

| Runde | was das Blatt weggelassen hat | was der Inspektor daraus las |
|---|---|---|
| v319 | das Gegnerbild in der Wellenvorschau (durchsichtiges 1×1-GIF, damit die HÖHE stimmt) | „9×, eine Zahl ohne Gegenstand" |
| v318 | nichts — hier war es die Messung: `elementFromPoint` sieht durchlässige Anzeigen nicht | „`GOLD` zu 100 % verdeckt" |

**Die Frage.** Woran erkennt jemand, dass ein Beweisbild weniger zeigt als das
Spiel?

**Warum die Werkzeuge sie nicht beantworten.** Jedes dieser Blätter ist für
seine eigene Frage richtig gebaut, und die Begründung steht jeweils im Code —
in v319 sogar mit Regel 12 als Beleg. Was fehlt, ist die Gegenrichtung: die
Auslassung ist dokumentiert, aber **im Bild unsichtbar**, und der Inspektor
sieht nur das Bild.

**Wie man es misst.** Nicht direkt; billig ist nur die Gewohnheit, und die ist
in v319 eingeführt: **was ein Beweisblatt nicht laden kann, bekommt einen
sichtbaren Platzhalter** statt einer Lücke — dieselbe Größe, dieselbe Marke
`#FF00E5` wie `getPlatzhalter`. Dann sagt das Bild selbst „hier fehlt etwas,
das das Spiel hat". Für die zwei anderen Beweisblätter der Kette
(`bilder/browser.png`, `schleife/inspektion/`) ist es **nicht** nachgeholt, und
das steht hier, statt als erledigt zu gelten.

---

## M21 · Eine Gegenprobe kann am FORTSCHRITT sterben, und `npm run muster` sieht es nicht

**Gefunden in v313, an zwei Faellen im selben Lauf.** Von 382 Gegenproben
bewiesen zwei nichts mehr — und beide waren nicht an einem Fehler gestorben,
sondern daran, dass das Projekt weitergekommen ist:

* Die eine machte aus dem Bogenturm einen Bannturm und erwartete, dass der
  Doku-Waechter den Rueckstandspunkt **C3** meldet. **C3 ist in v295
  zugefallen** — der Punkt, an dem sie haengt, existiert nicht mehr. Der
  Kommentar darueber sagte den Verfall sogar voraus, rechnete aber damit, dass
  der Punkt *offen bleibt* und nicht, dass er *verschwindet*.
* Die andere haengte `S-N3-04` an `S-N3-02`, damit `npm run naechste` die
  Abhaengigkeit meldet. **S-N3-04 ist seit v290 zu**, und eine zugefallene
  Story wird gar nicht erst auf ihre Abhaengigkeit angesehen: **der Eingriff
  kam an und bewirkte nichts.**

**Die Frage.** Woran erkennt ein Werkzeug, dass eine Gegenprobe zwar noch
trifft, ihr Treffer aber folgenlos geworden ist?

**Warum die Werkzeuge sie nicht beantworten.** `npm run muster` prueft in 0,4 s,
ob das Suchmuster jeder Probe in ihrer Zieldatei noch **vorkommt**. Genau das
ist hier gegeben: der Bogenturm steht da, `S-N3-04` steht da, beide Eingriffe
lassen sich einwandfrei einbauen. Was fehlt, ist die andere Haelfte — ob das
Tor danach noch etwas zu melden HAT. Und die kostet einen vollen Lauf.

**Das ist die stillste Verfallsart, die es gibt**, stiller als die vier aus
v219 (dort wartete ein Messplatz auf einen Zufall, der nicht mehr eintrat).
Hier ist die Probe technisch in Ordnung; nur die Welt hinter ihr hat sich
verbessert. Und **ein Fortschritt macht nichts rot** — er wird gefeiert und
nimmt im Vorbeigehen einen Beweis mit.

**Wie man es misst.** Billig ist es nicht. Was ohne vollen Lauf ginge: die
Proben nennen, die auf eine **Kennung** oder eine **Story** zeigen, und
gegenpruefen, ob die noch offen ist — das haette beide gefangen. Was es nicht
faengt, ist der allgemeine Fall (ein Eingriff, der ankommt und das Tor kalt
laesst); dafuer gibt es nur den vollen Lauf, und der ist der Grund, warum er
jede Nacht faehrt.

**Behelf bis dahin, gemessen wirksam:** beide Proben greifen jetzt an etwas,
das der Fortschritt nicht wegnimmt — die eine an der **Bedingung** statt an
ihrem Gegenstand, die andere an der **letzten** Story des Katalogs. Das ist
eine Gewohnheit, kein Tor.

---

## M23 · `npm run c18` trägt eine Abnahme auf EINER Aussaat, und das kann eine falsche Ursache belegen

**Was fehlt.** C18 heisst: die erste Karte muss mit einer Fähigkeit und ohne
Verbesserungen zu gewinnen sein. Gemessen wird das von `npm run c18` und vom
Rauchtest — beide auf der **einen** Aussaat 4242.

**Warum das nicht reicht, und zwar gemessen (v329).** Beim Einbau des Hetzers
lief die Ursachensuche über vier Verdächtige:

| geändert | Aussaat 4242 |
|---|---|
| Tempo 238 → 178 → 114 | verliert, verliert, verliert |
| Lebenspunkte 26 → 34 | verliert |
| Durchschlag 2 → 1 | verliert |
| **Beute 4 → 2** | **gewinnt, 19 von 42** |

Das sieht nach einer klaren Antwort aus: die Beute ist es. Sie war es nicht.
Über fünf Aussaaten gemessen:

| in Welle 11 des Spiralhains | gewonnen |
|---|---|
| nichts dazu | **5 von 5** |
| drei Schleicher dazu | 3 von 5 |
| drei Hetzer dazu (Beute 2) | 2 von 5 |
| drei Hetzer dazu (Beute 4) | 0 von 5 |

Die Beute kippt nur die **eine** Aussaat, die zufällig noch knapp gewann. Die
Ursache ist die Gruppengröße, und die sieht man erst, wenn man mehr als einen
Weg fährt.

**Warum es nicht einfach zu schliessen ist.** Der Rauchtest fährt C18 einmal,
und jede zusätzliche Aussaat kostet dort einen vollen Durchlauf. `npm run c18`
kann seit jeher mehrere (`npm run c18 -- 7 99`), nur fragt das niemand ab —
die Zahl im Rauchtest bleibt die eine.

**Was es billig besser machen würde:** der Rauchtest fährt drei Aussaaten
statt einer und meldet „3 von 3 gewonnen". Das kostet gemessen zwei Sekunden
je zusätzlicher Aussaat (`npm run c18` ist genau dafür gebaut) und macht aus
einer Behauptung über einen Weg eine über drei. **Nicht in derselben Runde
gemacht, in der die Lücke gefunden wurde** — ein Tor zu ändern, während die
eigene Änderung an ihm hängt, ist kein Beweis (v219).

**Die allgemeine Form.** Reproduzierbar heisst nicht richtig. Eine Messung,
die immer denselben Weg fährt, gibt immer dasselbe Ergebnis — auch dann, wenn
das Ergebnis an diesem Weg hängt und nicht an der Sache.

---

## M24 · Eine Prüfung, die den ERSTEN von mehreren Treffern nimmt, misst eine Stichprobe

**Was fehlt.** Es gibt kein Verfahren, das sagt, welche Prüfungen dieses Baums
an einem `match`, `find` oder `replace` ohne `g` hängen — also überall dort, wo
ein zweiter Fall danebenstehen könnte und nie angesehen wird.

**Warum das nicht theoretisch ist, und zwar gemessen (v350).** `doku` las die
erste Standangabe je Dokument. `Towerfront-BENCHMARK.md` trug zwei, und die
zweite stand sieben Fassungen zurück, ohne dass etwas rot wurde. Der Fall ist
jetzt zu — der Wächter verlangt **genau eine** Angabe, gemessen über alle 29
Dokumente —, aber die Frage bleibt für jede andere Prüfung offen.

**Was dagegen spricht, es einfach zu verbieten.** Bei sechs Gegenproben ist
„der erste Treffer" ausdrücklich Absicht; die Zeile über dem Hinweis in
`tools/probes.mjs` erklärt das seit v149 („trifft 321 Wegbreiten und will
genau eine davon"). Ein Werkzeug, das alle 23 Fälle zu Fehlern macht, wird
nach zwei Runden abgeschaltet — dieselbe Lehre wie bei der engen
Offen-Erkennung in v226.

**Was es bräuchte.** Eine Unterscheidung zwischen „der erste Treffer ist der
gemeinte" und „es dürfte nur einen geben". Die zweite Hälfte lässt sich
erzwingen, wo der Gegenstand eine Liste mit bekannter Länge ist — so wie es
`doku` jetzt für die Standangabe tut. Für den allgemeinen Fall gibt es heute
kein billiges Verfahren, und deshalb steht es hier statt als Tor.

**Behelf bis dahin, gemessen wirksam:** der Musterlauf DRUCKT die Zahl schon
(„23 davon auf den ersten von mehreren Treffern"). Wer eine Probe anfasst,
liest ihre Zeile — das ist eine Gewohnheit, kein Tor.

**Die Zahl ist in v351 um eins gestiegen, und zwar mit Absicht.** Die neue
Gegenprobe zu M25 setzt die Marke „Entscheidung des Nutzers" in die erste
Story mit mechanischer Bedingung — sie trifft sieben und will genau eine.
Pinnte sie stattdessen eine bestimmte Story an, hinge sie an deren Fortschritt,
und das ist die Todesart aus v341. Der erste Treffer ist hier also das
robustere Verfahren, nicht das nachlässigere.

---

## M25 · Eine Schliessbedingung ist ein Stellvertreter, und niemand prüft, ob er noch die Sache meint

**Was fehlt.** Jede offene Zeile des Rückstandsverzeichnisses und jede Story
trägt eine Schließbedingung der Form `text <Datei> "<Wort>" >= n`. Das ist ein
**Stellvertreter** für die Abnahme, nicht die Abnahme. Es gibt kein Verfahren,
das sagt, ob der Stellvertreter noch dasselbe meint wie der Text darüber.

**Der gemessene Fall (v351).** S-N1-07 schloss auf
`text tools/sim.ts "stapelKurve" >= 2`. Erfüllt hat diese Bedingung das
**Messgerät**, das in v339 gebaut wurde, um genau die Frage der Story zu
beantworten — nicht die Sache. Ihre eigene Abnahme lautet *„`npm run sim`
gewinnt jede Karte mit jedem der drei Spielstile"* und ist messbar offen:
`Breite` bringt 0 von 9 Läufen durch (N7B).

**Der Schaden war nicht die falsche Zahl, sondern die unsichtbare Blockade.**
S-N1-05 hängt an S-N1-07; `npm run naechste` hielt die Vorbedingung für
erfüllt und bot eine Story an, die ohne die Entscheidung des Nutzers niemand
fahren kann. Die Kette stand einen Tag lang vor ihr, und der Grund stand in
**keiner Werkzeugausgabe** — er stand nur in einem Kopf, und genau das soll
dieser Katalog ausschließen.

**Was in v351 erzwungen ist, und was nicht.** Erzwungen ist der Sonderfall,
der sich mechanisch fassen lässt: wer die Entscheidung im Text dem Nutzer
zuschreibt, darf nicht mechanisch schließen (gemessen trifft die Regel heute
genau eine Story von 53). Nicht erzwungen ist der allgemeine Fall — dass ein
Wort in einer Datei etwas anderes belegt als der Abnahmesatz daneben. Dafür
müsste ein Werkzeug den Abnahmesatz VERSTEHEN, und das kann keines.

**Woran man ihn von Hand erkennt**, aus diesem Fall abgelesen: die
Zieldatei der Bedingung liegt in `tools/`, während die Abnahme von einer
Wirkung im SPIEL spricht. Für Paket N7 ist genau das richtig — dort ist das
Messgerät die Sache. Überall sonst ist es ein Verdacht.

**In v352 einmal durchgezählt, und der Verdacht trägt heute nichts mehr.**
Vierzehn Schließbedingungen zeigen in `tools/`; **dreizehn davon zu Recht** —
es sind Messgerät-Stories (Paket N0 und N7, die Wächter), oder ihre Zusage ist
zusätzlich als Tor gebaut und wird gefahren. `S-N2-06` etwa schließt auf
`text tools/sim.ts "weichenStil" >= 2`, und ihre Abnahme („mindestens ein
Weichenstil gewinnt irgendwo allein") steht daneben als `errors.push` —
`npm run sim` meldet selbst, wenn ein Stil „in keiner Welle auf keiner Karte
vorn" liegt. Die vierzehnte war S-N1-07, und die ist in v351 gerichtet.

**Dieselbe Durchzählung hat dafür eine ANDERE Lücke gefunden, und die ist
erzwingbar** — sie steht seit v352 als Regel in `npm run doku`: eine Bedingung
kann auf eine Datei zeigen, in der ihr Wort gar nicht lebt. **F8** schloss auf
`text src/data/waves.ts "ENDLOS_STEIGERUNG" >= 1`; deklariert wird das Wort in
`src/data/difficulty.ts`, und v333 hatte die Arbeit achtzehn Fassungen zuvor
getan. Die Bedingung war nicht schwer zu erfüllen, sondern **unerfüllbar** —
und das ist schlimmer als die zu hohe Schwelle aus S129: dort fehlt die
Arbeit, hier fehlt nur der Zeiger darauf.

---

## Was das für die Reihenfolge bedeutet

**M1, M3 und M4 sind keine Nebenbefunde, sondern die Begründung dafür, dass
Paket P1 vor allem anderen steht.** Drei der vier Zahlen, an denen dieser
Katalog sein Ziel festmacht, sind heute nicht messbar: eine liegt unter dem
Rauschen ihres Verfahrens (M1), eine misst den Deckel des Bots (M3), und eine
misst drei Botparameter statt drei Spielweisen (M4). Wer P2 vor P1 fährt,
justiert den Kristall gegen eine Zahl, die sich mit der Aussaat um mehr bewegt
als durch die Änderung — und merkt es erst, wenn er die Runde nicht
reproduzieren kann.

**M9, M10 und M11 sind billig und sollten früh laufen**, weil sie das
Verzeichnis wieder ehrlich machen: ein Punkt, der wegen eines Großbuchstabens
offensteht, und ein Dokument, das seit 213 Fassungen etwas anderes sagt als
sein Werkzeug, kosten in dem Augenblick Zeit, in dem jemand ihnen glaubt.
