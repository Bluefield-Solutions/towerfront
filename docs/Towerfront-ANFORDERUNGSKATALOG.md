# Towerfront — Anforderungskatalog

Stand: v265 · 08.09.2026 · erstellt gegen den Spielstand **v248** (`5623c3b`)
Ziel des Nutzers, wörtlich: *„kein kommerzielles Spiel — einfach ein Spiel,
das möglichst viel Spaß macht und das beste Tower-Defense-Spiel der Welt
ist."*

---

## 0. Wo die Zahlen in diesem Katalog herkommen

**Regel 12: jede Zahl trägt ihre Messstelle.** Der Prüflauf
`npm run proben -- --voll` lief während dieser Arbeit im Projektbaum und hatte
`src/game/turmwerte.ts` mit einem eingebauten Fehler stehen. Auf einem Baum
mit eingebautem Fehler zu messen hieße, das Messverfahren zu belügen.

Alle eigenen Messungen dieses Katalogs entstanden deshalb auf einem **Klon von
`5623c3b`** außerhalb des Projektbaums
(`scratchpad/klon`, `node_modules` als Symlink), Node 22, ohne Grafikkarte.
Gefahren wurden `tools/sim.ts`, `tools/guards.ts`, `tools/benchmark.ts`,
`tools/docs.mjs` — alle vier lesend. Nicht gefahren wurden `browser`,
`uxaudit`, `baukarte`, `bildtor`: sie brauchen einen Build oder Chromium; ihre
Zahlen stammen deshalb aus `docs/Towerfront-AUDIT-HUD-UND-BILDSCHIRM.md`
(v248, 844 × 390) und sind als solche gekennzeichnet.

---

## 1. Zielbild in fünf Sätzen

1. **`npm run sim` meldet die Verluste über mindestens fünf der fünfzehn
   Wellen verteilt und keine folgenlose Strecke von mehr als drei Wellen** —
   heute zwei Stellen (W14:10 W15:7), und das über vier Aussaaten unverändert.
2. **Am Ende einer gewonnenen Partie liegen weniger als 20 % des verdienten
   Goldes ungenutzt** (`npm run sim`, Zeile `gemischt`) — heute 2687 von 6297,
   also 42,7 %, und über vier Aussaaten zwischen 41,6 und 42,7 % stabil.
3. **Der Abstand zwischen bestem und schwächstem Spielstil beträgt mindestens
   20 von 100 Punkten** (`npm run sim`, Zeile „Abstand der Spielstile") —
   heute 6, und damit kleiner als die Streuung des Messverfahrens selbst
   (5 bis 7 Punkte bei identischen Eingaben).
4. **Jede endgültige Zweigwahl bewegt das Ergebnis um mindestens 15 % des
   Kristalls (9 von 60), gemittelt über mindestens drei Aussaaten**, und jeder
   der vier Zielmodi gewinnt mindestens eine Welle allein (`npm run sim`) —
   heute bewegt der beste Zweig auf der Hausaussaat 11 Punkte und auf drei
   anderen Aussaaten 1, 3 und 1; der Zielmodus „stark" gewinnt auf **keiner**
   der vier Aussaaten eine Welle allein.
5. **Auf dem Zielgerät (844 × 390) sperrt die Bedienung im Ruhezustand
   höchstens 14 % und mit offenem Turmmenü höchstens 25 % des Bildschirms, und
   das Turmmenü sitzt am Turm** (`npm run uxaudittor`) — heute 14,2 % und
   32,9 %, und das Menü braucht 228 Punkte, wo 218 frei sind.

Diese fünf Sätze sind das Abnahmekriterium des ganzen Katalogs. Sie sind
absichtlich **keine Adjektive**: „macht Spaß" ist nicht widerlegbar, „die
Verluste liegen an zwei Stellen" ist es.

---

## 2. Der Befund — und die eine Korrektur, die die Reihenfolge umwirft

Der Auftrag geht von sechs Zahlen aus. Fünf davon habe ich nachgemessen und
bestätigt. Eine ist **kein Befund über das Spiel, sondern über das
Messverfahren** — und das ändert, womit angefangen werden muss.

### 2.1 `npm run sim` fährt genau eine Aussaat, und die Zweigtabelle mittelt gar nicht

> **Erledigt in v251 bis v257, und dieser Abschnitt bleibt als Befund stehen.**
> Er beschreibt den Zustand, aus dem der Katalog entstanden ist. `AUSSAATEN`
> sind seit v251 drei, die Zweigtabelle mittelt, und **jedes der vier
> Zweigpaare ist gemessen UNBELEGT** — der Abstand liegt unter der eigenen
> Streuung. Die Kennzahlen darunter sind seit v253 Ratschen
> (`tools/spannung-stand.txt`), also nicht mehr nur aufgeschrieben.

`tools/sim.ts` Zeile 21: `const SEEDS = [20260807];` — eine einzige Zahl. Die
drei „Abwandlungen" (`VARIANTS = [0, 1, 2]`, Zeile 30) verstellen die Rücklage
des Bots (+0/15/30 Gold) und seinen Startplatz, **nicht** den Zufallsgeber des
Spiels. Sechs Kennzahlen laufen über `overVariants`; die **Zweigtabelle nicht**
— sie besteht aus einem einzigen Lauf je Zweig (Zeile 709 bis 713). Über ihr
steht der eigene Kommentar der Datei (Zeile 23 bis 30): *„gemessen an einem
einzelnen Verlauf ist das Chaos, nicht Balance."*

Gemessen mit vier Aussaaten (Klon von `5623c3b`, sonst unverändert; `SEEDS`
nacheinander auf 20260807, 11111111, 22222222, 33333333 gesetzt):

| Kennzahl | 20260807 | 11111111 | 22222222 | 33333333 |
|---|---|---|---|---|
| gemischt, Kristall von 60 | 43 | 47 | 43 | 47 |
| Gold übrig | 42,7 % | 42,7 % | 41,6 % | 42,7 % |
| Verluste, Stellen | 2 | 2 | 2 | 2 |
| Abstand der Spielstile | **6** | **10** | **5** | **7** |
| Mörser: Brecher gegen Streubombe | **+11** | **+1** | **+3** | **+1** |
| Prisma: Bündelung gegen Verzweigung | **−2** | **−10** | **−1** | **−10** |
| Zielmodus „stark", Alleinsiege | 0 | 0 | 0 | 0 |

**Unabhängig nachgemessen mit drei weiteren Aussaaten** (derselbe Klon, andere
Zahlen — 4242, 99, 7), weil eine Messung, die die Reihenfolge des ganzen
Katalogs umwirft, nicht auf einem Lauf stehen darf:

| Kennzahl | 20260807 | 4242 | 99 | 7 |
|---|---|---|---|---|
| Abstand der Spielstile | 6 | 8 | 6 | 9 |
| Mörser: Brecher gegen Streubombe | +11 | +9 | **−1** | +9 |
| Verluste, Stellen | 2 | 2 | 2 | 2 |

**Die Zahlen der zwei Reihen decken sich NICHT, und das ist der Befund.** Über
alle sieben Aussaaten liegt der Mörser-Unterschied bei +11, +9, −1, +9, +1, +3,
+1 — im Mittel **4,7 von 60, also 8 %** gegen ein Soll von 15, und auf einer
Aussaat kehrt sich das Vorzeichen um. Zwei Messreihen, die zu verschiedenen
Zahlen und derselben Folgerung kommen, sind ein stärkerer Beleg als eine, die
sich selbst bestätigt.

**Drei Folgerungen, und alle drei sind Arbeitsanweisungen:**

* **G2 ist nicht „zu einem Viertel erfüllt".** Die 18 % beim Mörser, mit denen
  das Spielspaß-Audit den einzigen Teilerfolg belegt, sind ein Aussaat-Effekt:
  über sieben Aussaaten bleiben **8 %** übrig, und auf einer davon ist der
  angeblich stärkere Zweig der schwächere. G2 ist **unbelegt**, nicht teilweise
  erfüllt — und die Zeile im Audit ist berichtigt.
* **G4 kann heute gar nicht gemessen werden.** Der Stilabstand schwankt
  aussaatabhängig zwischen 5 und 10 Punkten; die Robustheitsmessung meldet im
  selben Lauf eine Streuung von 5/5/7 Punkten bei *identischen* Eingaben. Der
  gesuchte Effekt ist kleiner als das Rauschen des Verfahrens.
* **Zwei Befunde sind dagegen hart.** Die Verluste liegen auf **jeder** der
  vier Aussaaten an genau zwei Stellen, und der Zielmodus „stark" gewinnt auf
  **keiner** eine Welle allein. G1 und G8 sind belegt.

**Deshalb steht Paket P1 vor allem anderen.** Ohne es würde jede Balancerunde
gegen ein Rauschen justieren — genau der Fehler, den dieses Verzeichnis unter
Regel 9 („vor dem Justieren den Raum ansehen") und Regel 13 („wer eine Wirkung
misst, schaltet sie zuerst ab") schon fünfmal bezahlt hat.

### 2.2 Was sonst bestätigt ist

| Messung | Wert (eigener Lauf, Klon `5623c3b`) | **im Baum, v258** | Soll |
|---|---|---|---|
| Verluste verteilt über | 2 von 15 Wellen (W14:10 W15:7) | **1,7** (drei Aussaaten, v265) | ≥ 5 |
| ungenutztes Gold am Ende | 42,7 % (2687 von 6297) | **35,2 %** — und **14,6 %** ohne den Deckel des Bots | < 20 % |
| Abstand bester/schwächster Stil | 6 von 100 | **12,4** (Rauschen 5,2, v265) | ≥ 20 |
| Zielmodi mit einem Alleinsieg | 3 von 4 (stark: 0) | 4 von 4 |
| Genre-Abgleich (`npm run bericht`) | 30/30, gewichtet 100 % | — |
| Daten-Wächter (`npm run guards`) | 0 Fehler, 13 Hinweise | — |
| Doku-Wächter (`npm run doku`) | 0 Fehler, 5 Hinweise | — |

Dazu drei Zahlen, die im Auftrag nicht stehen und die ich für wichtig halte:

* **Der Grad „Ruhig" verliert nie einen einzigen Punkt.** Gemessen 80/80 für
  alle drei Spielstile. Das ist derselbe Defekt wie G1, eine Ebene tiefer —
  und kein Tor sagt ein Wort dazu.
* **Der Endlosmodus endet bei Welle 19**, vier Wellen über dem
  Pflichtprogramm.
* **Von 60 gefahrenen Wellen berühren nur 14 die Zielwahl überhaupt.** In den
  übrigen 46 ist ein Bedienelement mit vier Knöpfen wirkungslos.

---

## 3. Die acht Pakete

**Acht Pakete, 42 Stories.** Sie stehen ausgeschrieben in `STORIES.md`, in der
Reihenfolge, in der sie gefahren werden.

Nutzen ●●● hoch · ●● mittel · ● gering. Aufwand S = eine Runde,
M = zwei bis drei, L = vier und mehr.

### P1 · Die Spannung wird messbar (Werkzeug vor Wirkung)

**Problem.** Zweiunddreißig Tore prüfen Korrektheit; keines prüft Spannung.
Die vier Zahlen, an denen der Spielspaß hängt, entstehen als Hinweise, die
nichts abbrechen — und drei davon liegen unter der Streuung ihres eigenen
Messverfahrens (2.1). Zwischen v238 und v248 ist G4 still von 9 auf 6 gefallen,
und kein Tor hat etwas gemeldet.

**Erwarteter Effekt auf den Spielspaß.** Keiner, direkt. Aber jedes folgende
Paket wird ohne P1 auf eine Zahl hin gebaut, die es nicht gibt — und in diesem
Projekt sind zwei fertige Mechaniken (E3, F4) nach Messung zurückgebaut worden,
weil die Messung erst nachher kam.

**Was sonst noch drinsteht.** Die **Bildbestellung** für das Turmmenü
(S-P1-00) sitzt in diesem Paket, obwohl sie inhaltlich zu P8 gehört. Der Grund
ist die Laufzeit: sie ist das einzige Stück Arbeit, das den Nutzer braucht, und
sie blockiert nichts. Sie geht in der ersten Runde heraus und wartet, während
sieben Pakete weiterlaufen.

**Hängt an.** Nichts. **Aufwand** S bis M (7 Stories). **Nutzen** ●●●

### P2 · Knappheit — die eine Schraube, an der alles andere hängt

**Problem.** 42,7 % des verdienten Goldes werden nie ausgegeben (im Baum
gemessen **35,2 %**, und **14,6 %** beim ungedeckelten Bestleistungs-Bot —
mehr als die Hälfte der Zahl war der Deckel des Bots, v257), dreizehn von
fünfzehn Wellen kosten nichts, und der sparsamste Stil gewinnt. Ein Spiel, in
dem nichts knapp ist, hat keine Entscheidung, die etwas kostet — und ohne eine
solche verpufft jede Rückmeldung, so gut sie gebaut ist (Audit 2.10:
Trefferstopp, Ruckeln, siebzehn Geräusche sind alle da).

**Erwarteter Effekt.** Der größte im ganzen Katalog. G1, G4 und G5 messen
dasselbe von drei Seiten; sie fallen zusammen oder gar nicht.

**Hängt an.** P1 (sonst justiert man gegen Rauschen). **Aufwand** L (6 Stories).
**Nutzen** ●●●

### P3 · Der Durchbruch ist ein Ereignis, kein Abzug

**Problem.** Ein durchgekommener Gegner zieht eine Zahl ab; seit v239 schlägt
sie sichtbar aus. Defense Grid macht daraus ein Ereignis mit Verlauf: der
Gegner **stiehlt** einen Kristallsplitter und trägt ihn zum Tor zurück; wer ihn
unterwegs tötet, bekommt den Splitter zurück. Der schlimmste Augenblick des
Spiels wird damit zum spannendsten, und Verlieren wird spielbar.

**Erwarteter Effekt.** Die Rettung ist die Erzählung, die dem Spiel fehlt. Und
sie macht die Türme auf dem Rückweg ein zweites Mal wirksam, also die
Platzierung wichtiger.

**Hängt an.** P2 — solange nichts durchkommt, gibt es kein Ereignis zu
erzählen. **Aufwand** L (5 Stories). **Nutzen** ●●●

### P4 · Die wiederkehrende Entscheidung, und diesmal mit Risiko

**Problem.** Der Frühstart hat seit v243 ein sichtbares Zeitfenster und einen
schrumpfenden Bonus — aber kein Risiko: `canStartWave` verlangt, dass die
vorige Welle durch ist, also kostet früh starten nur Bauzeit. Kingdom Rush legt
genau dort das Risiko hin. Das ist F10 im Rückstandsverzeichnis.

**Erwarteter Effekt.** Eine Entscheidung in **jeder** Welle statt zweier
Bauentscheidungen je Welle, die meisten davon früh (Audit 2.7).

**Hängt an.** P2 (die Kurve muss erst stehen) und P1 (die Dauer- und
Leerlaufmessung entsteht dort). **Aufwand** L (5 Stories). **Nutzen** ●●●

### P5 · Zweige und Ziele, die etwas entscheiden

**Problem.** Acht Ausbauzweige, und die Wahl bewegt das Ergebnis gemittelt um
wenige Prozent (2.1). Vier Zielmodi, und einer gewinnt auf keiner Aussaat eine
Welle allein. Die Zweige unterscheiden sich in Zahlen, nicht in Rollen — genau
das, wovor die Marktrecherche warnt („dieselbe Strategie mit anderen Zahlen").

**Erwarteter Effekt.** Die Entscheidung, die im Konzept als „der Kern, aus dem
Bloons TD 6 seine Tiefe bezieht" steht, wird zum ersten Mal eine.

**Hängt an.** P1 (die Zweigwirkung muss über mehrere Aussaaten gemittelt
werden, sonst misst man Zufall) und P2 (in einem Spiel ohne Knappheit ist jede
Zweigwahl folgenlos). **Aufwand** L (7 Stories). **Nutzen** ●●●

### P6 · Gegner, die zu anderem Handeln zwingen

**Problem.** Sieben Gegnerarten unterscheiden sich in Werten. Zwei Ausnahmen
gibt es schon, und beide sind gut: der Schild (schluckt ganze Treffer statt
Anteile) und der Schildträger (erzwingt die Reihenfolge). Beide sitzen an der
**Wellengruppe**, brauchen also kein neues Bild — das ist die billigste
bewährte Bauart des Projekts, und sie ist zweimal ungenutzt geblieben.

**Erwarteter Effekt.** Die Zielwahl bekommt Wellen, in denen sie zählt (heute
14 von 60), und die Monokultur bekommt Gegner, an denen sie scheitert.

**Hängt an.** P5 (erst brauchen die Türme unterscheidbare Rollen, dann lohnt
es sich, gegen sie zu spielen). **Aufwand** M (4 Stories). **Nutzen** ●●

### P7 · Die Aufgabe ist nie zweimal dieselbe

**Problem.** Vier feste Karten, ein Endlosmodus, der bei Welle 19 endet und nur
die Zahlen erhöht. Der gemeinsame Nenner der Roguelites ist nicht „Zufall",
sondern: die Aufgabe darf nicht zweimal dieselbe sein.

**Erwarteter Effekt.** Wiederspielwert ohne ein einziges neues Kartenbild —
über benannte Vorzeichen je Partie und eine eigene Steigerungsregel im
Endlosmodus.

**Hängt an.** P2 bis P6 — ein Vorzeichen, das eine folgenlose Welle
modifiziert, ist selbst folgenlos. **Aufwand** M (4 Stories). **Nutzen** ●●

### P8 · Das Menü am Turm und der Bildschirm des Zielgeräts

**Problem.** Von zwölf HUD-Soll-Punkten sind sieben erledigt, drei halb, zwei
offen — und beide offenen hängen an derselben Sache: das Turmmenü braucht 228
Punkte, wo 218 frei sind, und der erklärende Zweigsatz braucht 90, die es nicht
gibt. Die Antwort auf beides ist dieselbe: **Symbole statt Sätze**, und das ist
Bildmaterial, kein Code.

**Erwarteter Effekt.** Der Bildschirm, den man am häufigsten sieht, hört auf,
ein Drittel des Feldes zuzudecken.

**Hängt an.** Einer Bildlieferung durch den Nutzer — und darauf kann kein
anderes Paket warten. Der Code-Teil hängt außerdem an P5, weil das Menü dann
Rollen statt Zahlen zeigen muss. **Aufwand** M (4 Stories). **Nutzen** ●●●

---

## 4. Die Reihenfolge, und warum

```
P1 ──► P2 ──► P3 ──► P4 ──► P5 ──► P6 ──► P7
                                    │
                                    └────► P8   (Bildbestellung sofort,
                                                 Code nach P5)
```

**P1 zuerst, und ohne Ausnahme.** Nicht weil Werkzeuge schön sind, sondern
weil drei der vier Zielzahlen heute unter dem Rauschen ihres Messverfahrens
liegen (2.1). Wer P2 vor P1 fährt, justiert den Kristall gegen eine Zahl, die
sich mit der Aussaat um mehr bewegt als durch die Änderung. Dieses Projekt hat
genau das schon bezahlt: die Zweigwaage, die Klimawirkung, die Zielplatte —
jedes Mal war die Messstelle das Problem und nicht der Gegenstand.

**P2 als zweites, weil ohne Knappheit nichts von P3 bis P7 wirken kann.** Ein
Kernraub (P3) braucht Lecks; ein Frühstart mit Risiko (P4) braucht etwas, das
schiefgehen kann; eine Zweigwahl (P5) braucht eine Lage, in der die falsche
Wahl auffällt. Das Spielspaß-Audit sagt dasselbe („Ohne Knappheit wirkt keine
der übrigen Änderungen"), und die Messung stützt es: bei 42,7 % ungenutztem
Gold kostet keine Entscheidung etwas.

**P3 vor P4, weil P3 die Sichtbarkeit liefert, die P4 riskant macht.** Wer die
nächste Welle startet, während die alte noch läuft, muss sehen können, was
das anrichtet. Ein Splitterträger, der zum Tor zurückläuft, ist genau diese
Sichtbarkeit — und er entsteht ohnehin aus P2.

**P5 nach P4, nicht vor,** weil der Wert einer Zweigentscheidung an der Frage
hängt, wie viel gleichzeitig auf dem Feld steht. Vor P4 misst man sie in einem
Spiel, in dem Wellen einzeln kommen; danach in dem Spiel, das ausgeliefert
wird. Eine Zahl, die zwischen zwei Paketen ihre Bedeutung ändert, wird zweimal
eingemessen.

**P6 nach P5,** weil ein Gegner, der „zu anderem Handeln zwingt", einen zweiten
Handlungsweg voraussetzt. Solange alle acht Zweige dasselbe tun, zwingt er zu
nichts.

**P7 zuletzt auf der Spielseite,** weil Vorzeichen und Endlossteigerung
multiplizieren, was da ist. Ein Vorzeichen auf einer folgenlosen Welle ist eine
folgenlose Welle mit Namen.

**P8 läuft daneben, in zwei Hälften.** Die **Bildbestellung** ist die allererste
Story des ganzen Katalogs, die überhaupt zum Nutzer geht — sie steht deshalb
schon in P1 als S-P1-00 und blockiert nichts. Der **Code** dazu kommt nach P5,
weil das Menü dann Rollen anzeigen muss und nicht Zahlen; wer es vorher baut,
baut es zweimal.

**Was nie passieren darf:** ein Paket wartet auf eines, das später kommt. Die
einzige Wartestelle im ganzen Plan ist die Bildlieferung, und sie ist mit einem
ausdrücklichen Ausweichweg versehen (S-P8-02).

---

## 5. Was wir NICHT tun, und warum

### 5.1 Keine prozeduralen Karten

Rogue Tower löst den Wiederspielwert damit, und die Marktrecherche nennt es als
den klarsten Hebel. Trotzdem nein, aus drei gemessenen Gründen:

* Der Bildvorrat ist mit **1095 von 1429 KB** (77 % der ausgelieferten Datei)
  der teuerste Posten des Projekts, und eine Karte kostet 64 KB. Prozedural
  erzeugte Karten hätten kein Bild.
* Eine Bahn muss heute **sechs gemessene Regeln** halten (Umweg ≥ 1,8;
  Kreuzdeckung ≥ 50 %; Verschmelzung ≤ 55 %; Längenspreizung ≤ 30 %; kein
  unwegsamer Fleck in der Bahn; Mindestbreite für den breitesten Gegner).
  D32 hat vier von Hand entworfene Bahnsätze gemessen und verworfen, bevor
  `npm run bahnbau` ein Fenster fand — ein Erzeuger, der das zur Laufzeit
  trifft, ist ein eigenes Projekt.
* Der Ersatz kostet fast nichts: **benannte Vorzeichen je Partie** (P7) machen
  dieselbe Karte zu einer anderen Aufgabe, sind deterministisch aus der Aussaat
  ableitbar (also hält `npm run determinism`) und brauchen kein Bild.

### 5.2 Kein sechster Turm, und der fünfte erst nach P5

Der naheliegende Griff gegen „zu wenig Entscheidung" ist ein neuer Turm. Er
wäre falsch, und die Zahlen sagen warum:

* Die **acht vorhandenen Zweige** bewegen das Ergebnis gemittelt um wenige
  Prozent (2.1). Ein neunter und zehnter Zweig vervielfacht eine Entscheidung,
  die keine ist.
* Das **Gruppenbudget für Turmbilder** liegt bei 445 KB, belegt sind 302 KB,
  und ein vollständiger Satz aus sechs Stufen wiegt gemessen **93 bis 106 KB**
  (Frost 105,6 · Mörser 102,8 · Prisma 93,4). Es passt genau **einer** hinein.
  Der Bannturm (C3) müsste das Budget sprengen oder einen anderen verdrängen.
* Für die Flakstellung (C16) liegt der Bildauftrag seit v205 fertig vor
  (Abschnitt 6.6), die Bilder sind nicht geliefert. Sie ist deshalb als
  Bestellung in P6 aufgenommen und nicht als Code-Runde.

### 5.3 Keine Ladezeit- und Zeichenpolitur

Die ausgelieferte Datei wiegt 1429 von 1800 erlaubten KB, der Arbeitsspeicher
36,3 MB. Es gibt **keine einzige Messung vom Zielgerät** — alle Browserzahlen
entstehen unter SwiftShader ohne Grafikkarte (Regel 12, D27). Optimieren ohne
Messung wäre hier dasselbe, was v226 als „eine Messung, die weniger sagt als
der Satz daneben" beschreibt. D27 bleibt offen und `nutzer:`.

### 5.4 Kein Mehrspieler, keine Helden, keine Meta-Kampagne

Die Entwicklerliteratur im Genre-Abgleich nennt es als den häufigsten
Baufehler: alles gleichzeitig bauen, bevor bewiesen ist, dass die Kernschleife
trägt. Sie trägt gemessen **nicht** — G1, G4 und G5 sind offen. Das Projekt hat
diesen Fehler bisher vermieden; er bleibt vermieden.

### 5.5 Keine Scrollkarte und kein größeres Spielfeld

Defender's Quest nennt scrollende Karten ausdrücklich den Feind der
Konzentration, und F1 („ganze Karte ohne Scrollen") ist erfüllt. Die
gemessenen 30 % baubare Fläche je Karte, davon 65 bis 82 % in **einer**
zusammenhängenden Insel, sind reichlich — sie waren nur unsichtbar, und das
ist seit v238 behoben.

### 5.6 Keine neue Turmsorte als Antwort auf den Zielmodus „stark"

Der Modus gewinnt auf keiner der vier Aussaaten eine Welle allein. Die
Versuchung ist, ihm einen Turm zu bauen, für den er gut ist. Der Zielmodus
„hinten" ist in v237 aus genau diesem Grund **gestrichen** worden, und das war
richtig: eine Wahl ohne Folgen gehört weg oder bekommt eine Aufgabe, die nur
sie erfüllt (so wie „Gefahr" in v223). P5 gibt ihm eine Aufgabe; scheitert sie
messbar, wird er gestrichen — die Story dafür steht als S-P5-07.

---

## 6. Was der Katalog an Dateigröße kostet

| Posten | Schätzung eingebettet | Grundlage |
|---|---|---|
| Flakstellung, 6 Stufen (P6) | **125 bis 140 KB** | gemessene Satzgrößen 93–106 KB im Vorrat, Aufschlag 1,34 durch die `data:`-Adresse |
| Symbolsatz für das Turmmenü (P8) | **8 bis 20 KB** | Symbole sind klein; kein Vergleichswert im Vorrat, deshalb als Spanne |
| Kristallsplitter (P3) | **0 KB** | wird gezeichnet, nicht geladen — Regel 11 verbietet Leuchten zur Laufzeit ohnehin |
| Vorzeichen, Heiler, Hetzer (P6, P7) | **0 KB** | Eigenschaften an der Wellengruppe, sichtbar über Ring und Fäden wie beim Schildträger |
| **Summe** | **rund 135 bis 160 KB** | heute 1429 von 1800 KB, also 371 KB Luft |

Das Gruppenbudget für Türme (445 KB, belegt 302) trägt die Flakstellung; das
Gegnerbudget (80 KB, belegt 71) trägt **keine** neue Gegnerfigur mehr — deshalb
sitzen Heiler und Hetzer an der Wellengruppe und nicht in `ENEMIES`.

---

## 7. Hinweise für den Entwickler-Agenten

1. **Die Schließbedingung muss zum Wächter passen.** `tools/docs.mjs` liest
   Zeilen einer „Offen"-Tabelle nur, wenn ihre Kennung dem Muster
   `[A-Z]+\d+(-[A-Z])?` folgt. Eine Zeile mit der Kennung `S-P1-03` wird
   **stillschweigend übersprungen** — sie wäre dann nicht gehalten, ohne dass
   etwas rot wird. Beim Übertragen in `docs/Towerfront-BACKLOG.md` also eine
   Kennung im Muster vergeben, etwa `SP103`.
2. **`text … "wort" >= n` zählt buchstabengetreu und auch in Kommentaren.**
   Ein Bezeichner, der zuerst in einem Kommentar auftaucht, schließt den Punkt,
   bevor die Sache da ist. Deshalb steht in diesem Katalog überall `>= 2` oder
   ein Bezeichner, der nur im Code Sinn ergibt (Definition plus Benutzung).
   Wie teuer die andere Richtung ist, zeigt E6: es steht seit v239 offen, weil
   die Bedingung `wellenfortschritt` klein schreibt und der Quelltext
   `Wellenfortschritt` groß — gemessen null gegen einen Treffer.
3. **Regel 1 gilt weiter:** erst einchecken, dann `npm run proben`.
4. **Jede Story, die ein Tor entwertet, liefert die Ersatzprüfung mit.** Das
   steht in den betroffenen Stories ausdrücklich dabei (S-P3-01, S-P4-01) —
   in v248 ist genau das zweimal versäumt worden.
5. **Neue Mechaniken haben ihre Rückbau-Story direkt hinter sich** (S-P3-05,
   S-P4-05, S-P7-04). Sie wird nur gefahren, wenn die Abnahme der Mechanik
   reißt. Zwei gebaute Mechaniken sind in diesem Projekt schon zurückgebaut
   worden (E3, F4 in v239), und es war beide Male richtig.
6. **Nach jeder Runde vier nächste Schritte**, davon mindestens einer technisch
   und einer grafisch — das erwartet der Nutzer, und der Katalog ersetzt es
   nicht.
