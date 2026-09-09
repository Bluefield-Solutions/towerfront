# Towerfront — was wir noch nicht messen können

Stand: v286 · 09.09.2026

**Nachgesehen in v286 — und M1 hat seine erste Zahl aus dem laufenden Betrieb
bekommen.** Die Luecke gilt als geschlossen (drei Aussaaten, `UNBELEGT` statt
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


Zu `KATALOG.md` und `STORIES.md`. Stand des Spiels **v248** (`5623c3b`).

Dieses Verzeichnis hat mehrfach bezahlt, dass **eine Messung, die weniger sagt
als der Satz daneben, schlimmer ist als keine**: die Zahlwort-Tabelle (v230,
sie kannte 31 Schritte nicht und ließ sieben Fassungen lang eine falsche
Torzahl durch), die Sterne-Erreichbarkeit (v246, „zwei von vier Karten sind
nicht auf drei Sterne spielbar" hieß in Wahrheit „nicht mit drei bescheidenen
Bots"), und `min-height: 33%` (v248, eine Zusage aus v137, die still wegfiel,
weil ihr Bezugskasten verschwand).

Die folgenden fünfzehn Lücken sind in derselben Familie. Jede nennt: **welche
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

**Loch 3 (nicht aufgeschrieben).** Eine Zeile mit einer **Kennung außerhalb des
Musters** wird stillschweigend übersprungen. Die Zeilenregel lautet
`^\| ([A-Z]+\d+(?:-[A-Z])?) \| … \|` und der Abbruch kommt erst, wenn
**keine einzige** Zeile passt (`if (gepruefte === 0)`). Eine Kennung wie
`S-P1-03`, `E6b` oder `F10a` wäre also im Verzeichnis sichtbar und vom Wächter
unsichtbar — genau der Zustand, den C24, D28-A und D28-F drei Runden gekostet
haben.

**Wie man es misst.** Loch 2 und 3 sind billig zu halten: der Wächter zählt,
wieviele Zeilen einer „Offen"-Tabelle er **nicht** erkannt hat, und meldet jede
einzeln. Loch 1 bleibt offen und wird berichtet, nicht behauptet (S129).

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

---

## Was das für die Reihenfolge bedeutet

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
