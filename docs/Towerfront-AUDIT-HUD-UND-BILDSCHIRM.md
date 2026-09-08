# Audit — HUD, Bildschirmaufteilung und Turmmenüs

Stand: v238 · 08.09.2026

Ausgelöst durch drei Sätze des Nutzers:

> „Das Gameplay und die Huds des Spiels sind der Kern und momentan nicht gut
> gelöst. Man sieht nicht gut, wo man etwas hinbauen kann, die Turmmenüs
> sehen nicht gut aus und es kommt kaum Spielspaß auf."

Für die **Bau-Interaktion** gibt es seit v237 einen Abgleich
(`docs/Towerfront-ABGLEICH-BEDIENUNG.md`, sieben Punkte B1–B7, alle als
erfüllt geführt). Für die **Bildschirmaufteilung** gab es nie einen. Das ist
die Lücke, die dieses Dokument schließt — und sie erklärt, warum B1
„erledigt" heißen und der Nutzer trotzdem recht haben kann.

Alle Zahlen sind am **ausgelieferten** Spiel gemessen, auf **844 × 390**
(iPhone quer, dem Zielgerät), mit `npm run uxaudit` und `npm run baukarte`
(Regel 12). Die Aufnahmen liegen unter `/tmp/lab/ux/`.

---

## Teil 1 — Was heute wirklich passiert

### 1.1 Die Bedienung belegt den Bildschirm, nicht den Rand

Gemessen wird **nicht über Umrisskästen** — die lassen sich durch
Verschachteln kleinrechnen, und `#hud` ist ein bildschirmbreiter Streifen mit
durchsichtigem Verlauf, der Tipps durchlässt. Gefragt wird stattdessen der
Browser selbst: `elementFromPoint` über ein Raster von 4 Punkten, gezählt
wird, was dort **wirklich** getroffen wird.

| Zustand | Tipp gesperrt | Bild überdeckt |
|---|---|---|
| Ruhe, nichts gewählt | 17,6 % | 18,0 % |
| Turmwahl offen | 24,3 % | 24,5 % |
| **Turmmenü offen** | **39,5 %** | **39,7 %** |
| Welle läuft | 16,4 % | 15,2 % |

**Mein erster Anlauf hat hier 40,0 % und 61,2 % gemeldet** — die vereinigten
Umrisskästen der obersten Bedienbehälter. Die Zahl ist nicht falsch
gerechnet, sie misst nur etwas anderes: `#hud` spannt sich über die volle
Breite und zählt deshalb mit 15 Prozentpunkten mit, obwohl man mitten
hindurch aufs Feld tippen kann. Regel 12, und diesmal hätte die falsche
Messstelle die Arbeit in die falsche Richtung gelenkt.

**Was bleibt, ist der Prüfsteg: 39,5 %.** Im meistbenutzten Zustand des
Spiels — Turm angetippt, Ausbau überlegen — sind zwei Fünftel des Feldes
nicht mehr da.

### 1.2 Und sie belegt genau die Stelle, an der gespielt wird

Der Anteil sagt nicht alles; die Lage sagt mehr. Die Turmleiste sitzt unten
links, und auf dem Spiralhain läuft die Bahn genau dort.

Gestellt als A/B im **selben Augenblick** (Spiel angehalten, nur der
Klappzustand der Leiste geändert — `ab-leiste-auf.png` gegen
`ab-leiste-zu.png`):

| | Leiste offen | Leiste zu |
|---|---|---|
| Gegner auf dem linken Bahnarm sichtbar | **2** | **4** |
| linker Bahnarm | unteres Drittel verdeckt | ganz sichtbar |

**Die Hälfte der Gegner auf diesem Abschnitt ist nicht zu sehen**, und der
Weg, auf dem sie laufen, endet für das Auge an der Oberkante der
Turmknöpfe. Mit eingeklappter Leiste sieht dasselbe Bild aus wie ein
anderes Spiel.

**Auch dazu ein Fehlversuch, der hier stehen bleibt:** ich habe zuerst
gerechnet statt hingesehen — Bahnpunkte in Bildschirmpunkte umgerechnet und
gefragt, wie viele davon unter einem Bedienelement liegen. Das Ergebnis
(18,6 % offen gegen 18,3 % zu) sagte, das Einklappen ändere nichts, und
widersprach damit der Aufnahme. Die Rechnung nahm die Startvergrößerung als
gegeben an, statt die Abbildung des laufenden Spiels zu benutzen — eine
Annahme, die niemand geprüft hat. **Regel 8 in beide Richtungen: die
Aufnahme hat recht behalten, nicht die Zahl.**

### 1.3 Baubar sind 30 % der Karte — und man sieht sie nicht

`npm run baukarte` fragt `warumNicht` — die eine Stelle, an der die Bauregel
steht — über ein Raster von 4 Weltpunkten, ohne gebaute Türme:

| Karte | Bogenturm | Frostturm | Mörser | Prisma | Inseln | größte Insel hält |
|---|---|---|---|---|---|---|
| Spiralhain | 30,0 % | 29,2 % | 25,0 % | 27,4 % | 6 | 82 % |
| Ascheschlucht | 34,5 % | 33,8 % | 29,7 % | 32,0 % | 14 | 69 % |
| Frostspalte | 33,5 % | 32,9 % | 28,8 % | 31,1 % | 6 | 65 % |
| Farnkessel | 31,7 % | 31,0 % | 27,1 % | 29,3 % | 9 | 75 % |

**Die Fläche ist nicht zerstückelt.** Eine einzige zusammenhängende Insel
hält zwei Drittel bis vier Fünftel von allem Baubaren. Das Feld ist also
gut gebaut — es ist nur unsichtbar.

Gegenprobe am gebauten Spiel, durch Tippen statt durch Rechnen: von 1508
freien Rasterpunkten (Schritt 12 px) öffnen **267 die Turmwahl — 17,7 %**.

Die Lücke zu den 30 % der Regel hat zwei Ursachen, und eine davon ist die
Messung selbst: der Tastlauf trägt seinen Zustand mit, ein Tipp nach einer
geöffneten Wahl schliesst sie wieder, und damit zählt jeder zweite Treffer
als Fehlschlag. **Die Zahl ist als Untergrenze zu lesen, nicht als Messwert**
— sie beweist, dass ein Tipp oft ins Leere geht, nicht wie oft. Die zweite
Ursache ist echt: bei der Startvergrößerung wird die 16:9-Welt auf ein
2,16:1-Fenster gelegt, oben und unten also beschnitten.

### 1.4 Die Baufläche wird gezeigt — als Kontur um das Verbotene

B1 gilt seit v203 als erfüllt, und der Code hält, was er verspricht: sobald
in der Leiste eine Turmsorte gewählt ist, zeichnet `src/gfx/bauflaeche.ts`
die Kante des verbotenen Bereichs. `npm run bauflaechetor` misst 0,00 ‰
Abweichung gegen die Regel.

**Gezeichnet wird aber eine weiße Linie um alles Verbotene** (Aufnahme
`kante-mit-wahl-dock-zu.png`). Sie umschließt Weg, Felsen, Dickicht und
Kartenrand zugleich; auf dem Spiralhain sind das mehrere ineinander
verschachtelte Umrisse. Was der Spieler sieht, ist eine Höhenlinienkarte —
und er muss selbst schließen, welche Seite jeder Linie die erlaubte ist.

**Eine Kontur beantwortet nicht die Frage, die gestellt wurde.** „Wo darf
ich bauen" ist eine Frage nach einer **Fläche**. Die Referenz beantwortet
sie auch als Fläche (siehe Teil 2). Deshalb ist B1 mechanisch erfüllt und
wahrnehmungsseitig offen — das ist kein Widerspruch, sondern eine fehlende
zweite Frage im damaligen Soll.

Dazu kommt: die Kante erscheint **nur bei gewählter Turmsorte**. Im
Ruhezustand — dem Zustand, in dem man sich das Feld ansieht und einen Plan
macht — steht nichts da.

### 1.5 Typografie: elf Schriftgrößen auf einem Bildschirm

Gemessen an den sichtbaren Textknoten des Ruhezustands:

```
8px ×4   10px ×10   10,5px ×2   11px ×9   11,5px ×1   12px ×4
13px ×2   13,33px ×8   15px ×2   16px ×9   17px ×3
```

**Elf Größen, elf Bedeutungen** — nur dass keine zwei davon einen
erkennbaren Rang trennen. 10, 10,5, 11 und 11,5 px stehen nebeneinander und
meinen dasselbe: „klein". Eine Skala hat drei bis fünf Stufen; alles darüber
ist Zufall aus der Entstehungsgeschichte.

### 1.6 Zweiunddreißig Textknoten stehen ohne eigene Fläche auf dem Foto

„GOLD 220", „KRISTALL 60", „WELLE 1/15" und der Versionsstempel liegen
direkt auf dem Kartenbild. Wo ein Kasten da ist, ist der Kontrast
ausgezeichnet (13:1 bis 16:1 gemessen); wo keiner ist, hängt die Lesbarkeit
davon ab, was das Foto an dieser Stelle zeigt. Auf hellem Gras steht heller
Text.

Der Versionsstempel steht dabei **mitten im Spielfeld** (Weltmitte unten),
nicht am Rand.

### 1.7 Jede Turmbeschriftung steht zweimal im Bild

Bei offener Turmwahl sind gleichzeitig sichtbar:

* die **Turmleiste** unten: „Bogenturm 55 Gold", „Frostturm 80 Gold", …
* die **Turmwahl** am Tipppunkt: „Bogenturm 55", „Frostturm 80", …

Gemessen: `Bogenturm`, `Frostturm`, `Mörser`, `Prisma` und `Welle 1 starten`
stehen je **zweimal** sichtbar im selben Bild. Das ist Regel 15 als
Bedienoberfläche — zwei Listen desselben Inhalts, verschieden gesetzt, und
gepflegt wird künftig eine davon.

### 1.8 Das Zielgerät bekommt weniger Information als der Schreibtisch

Auf 1400 × 900 trägt jeder Turmknopf eine Rollenzeile: DAUERFEUER,
UMKREIS-BREMSE, FLÄCHE NUR BODEN, KETTENBLITZ. Auf 844 × 390 fehlt sie.

**Damit steht auf dem Zielgerät nur der Preis** — und der Preis ist die
unwichtigste Eigenschaft eines Turms. Das Spiel wird auf dem iPhone quer
beurteilt (CLAUDE.md); die Ausdünnung läuft genau in die falsche Richtung.

### 1.9 Ein Entwicklerschalter ist das auffälligste Element des Spiels

Oben rechts stehen fünf gleich gestaltete Pillen: **Messung**, Weg, Ton, 1×,
Pause. „Messung" ist die breiteste (79 × 44) und steht an erster Stelle. Es
ist ein Messwerkzeug für mich, kein Spielelement.

Danebengestellt: der einzige Knopf, der den Spielfluss trägt („Welle 1
starten"), sitzt in der Ecke gegenüber.

### 1.10 Die kleinste Trefferfläche liegt unter dem Mindestmaß

| Größe | Element |
|---|---|
| **38 × 20** | die Anzahl-Marke „6×" in der Wellenvorschau |
| 44 × 44 | „1×", die Einklappen-Taste |
| 45 × 44 | „Ton" |

`npm run beruehrung` verlangt 44 Punkte. Die Wellenvorschau ist heute keine
Schaltfläche, also schlägt kein Tor an — sie ist aber die einzige Stelle,
an der steht, was als Nächstes kommt, und damit die erste, die ein Spieler
antippen will.

### 1.11 Was gut ist, und warum das die Diagnose schärft

Die **Pausenkarte** (`10-pause.png`) ist sauber: unscharfer Hintergrund,
eine Spalte, klare Rangfolge, die gefährliche Handlung farblich abgesetzt,
großzügige Trefferflächen. Die **Vorkauf-Karte** bei gewählter Turmsorte
zeigt Kosten, Schaden, Reichweite, Takt, **Schaden/s** und Luftziele — genau
die Angaben, die man zum Entscheiden braucht.

Das Gestaltungssystem kann es also. Es ist im HUD nur nicht angewandt.

---

## Teil 2 — Referenzabgleich (Schritt 0)

### Kingdom Rush — das HUD ist ein Rahmen, das Feld bleibt frei

Oben eine schmale Leiste mit Gold, Leben, Welle. Unten rechts der
Wellenknopf. **Sonst nichts.** Es gibt keine dauerhaft sichtbare Turmleiste
— die Türme wohnen in einem Ring, der am Bauplatz aufgeht und wieder
verschwindet.

Was das tut: die Bedienung belegt Rand, nie Fläche. Alles, was nur manchmal
gebraucht wird, ist auch nur manchmal da. Und weil der Ring **am Ort der
Handlung** aufgeht, muss der Blick nie zwischen Feld und Leiste wandern.

### Bloons TD 6 — eine feste Seitenspalte, und das Feld hört dort auf

Die Türme stehen in einer schmalen Spalte am rechten Rand. Sie überlagert
das Feld **nicht**: das Spielfeld ist entsprechend schmaler ausgelegt. Das
Turmmenü öffnet in derselben Spalte, mit einer Turmabbildung, einem
Ausbaupfad als Symbolreihe und einer Zeile Klartext.

Was das tut: es gibt genau eine Stelle für Bedienung, und sie nimmt dem
Spiel nichts weg. Und der Ausbaupfad ist **eine Landkarte**, keine Liste —
man sieht, wo man steht und was noch kommt, bevor man kauft.

### Defense Grid — Zustand am Objekt statt im Menü

Türme tragen ihren Zustand am Objekt: Stufenringe, Farbe, Reichweite beim
Berühren. Das Menü ist ein kleiner Kreis direkt am Turm, mit zwei bis drei
Symbolen.

Was das tut: die Entscheidung fällt dort, wo ihr Gegenstand steht. Es gibt
keine Zuordnungsarbeit zwischen einem Kasten am Rand und einem Ding auf dem
Feld.

### Was alle drei gemeinsam machen — und Towerfront nicht

1. **Bedienung liegt am Rand oder in einer eigenen Spalte, nie über dem
   Feld.**
2. **Selten Gebrauchtes ist selten sichtbar.** Kein Spiel zeigt dauerhaft
   alle Türme, alle Fähigkeiten und alle Einstellungen zugleich.
3. **Das Turmmenü sitzt am Turm.**
4. **Ein Turm wird als Bild verkauft, nicht als Preisschild.**
5. **Der Ausbau ist ein Weg, kein Angebot.** Man sieht die Stufen davor und
   danach.

---

## Teil 3 — Soll

| # | Soll | woher |
|---|---|---|
| H1 | Die Bedienung sperrt im Ruhezustand **höchstens 14 %** des Bildschirms, mit offenem Turmmenü höchstens 25 % | Kingdom Rush, BTD6 |
| H2 | **Kein Bedienelement liegt über einer benutzten Bahn**, solange eine Welle läuft | alle drei |
| H3 | „Wo darf ich bauen" wird als **Fläche** beantwortet, nicht als Kontur — und auch ohne gewählte Turmsorte abrufbar | BTD6, PvZ |
| H4 | Das Turmmenü sitzt **am Turm**, nicht am Bildschirmrand | Defense Grid, Kingdom Rush |
| H5 | Ein Turm wird durch **sein Bild** angeboten; Name und Preis sind Beiwerk | alle drei |
| H6 | Der Ausbau steht als **Weg mit Stufen** da, nicht als zwei Preisknöpfe | BTD6 |
| H7 | **Eine Typoskala mit höchstens fünf Stufen.** Jede Größe hat genau eine Bedeutung | Handwerk |
| H8 | **Jeder Text hat eine Fläche unter sich.** Nichts steht nackt auf dem Foto | Handwerk |
| H9 | **Keine Beschriftung steht zweimal gleichzeitig im Bild** | Regel 15 |
| H10 | Das Zielgerät zeigt **nicht weniger** als der Schreibtisch; ausgedünnt wird nach Wichtigkeit, nicht nach Platz | CLAUDE.md |
| H11 | Entwicklerwerkzeuge stehen **nicht** in der ersten Reihe der Spielbedienung | Handwerk |
| H12 | Jede Trefferfläche misst mindestens 44 Punkte — auch die, die heute keine Schaltfläche ist | `npm run beruehrung` |

---

## Teil 4 — Abstand

| # | Soll | heute | Abstand |
|---|---|---|---|
| H1 | ≤ 14 % / ≤ 25 % | **17,6 % / 39,5 %** | +3,6 / +14,5 Punkte |
| H2 | nichts über der Bahn | Turmleiste verdeckt zwei von vier Gegnern auf dem linken Bahnarm | voll offen |
| H3 | Fläche, immer abrufbar | Kontur, nur bei gewählter Sorte | halb |
| H4 | Menü am Turm | Menü am rechten Bildschirmrand | voll offen |
| H5 | Turm als Bild | Text und Preis, kein Bild | voll offen |
| H6 | Ausbauweg | zwei Preisknöpfe, kein Pfad, keine Endstufe sichtbar | voll offen |
| H7 | ≤ 5 Größen | **11** | voll offen |
| H8 | Text auf Fläche | 32 Knoten ohne Fläche | voll offen |
| H9 | keine Doppelung | 5 Beschriftungen doppelt | voll offen |
| H10 | Telefon ≥ Schreibtisch | Telefon zeigt weniger | voll offen |
| H11 | keine Werkzeuge vorn | „Messung" ist das breiteste Element oben | voll offen |
| H12 | ≥ 44 | kleinste 38 × 20 | knapp offen |

**Zwölf Punkte, einer halb erfüllt, elf offen.** Der Abgleich für die
*Bedienung* stand nach v203 auf sieben von sieben erfüllt — und das stimmt
weiterhin. Gemessen wurde damals der **Ablauf**; nie die **Fläche**.

---

## Teil 5 — Was daraus folgt

Die Reihenfolge folgt aus dem Abstand und aus der Abhängigkeit, nicht aus
dem Aufwand.

1. **H2 und H11 zuerst — Platz an der richtigen Stelle.** Der Anteil ist im
   Ruhezustand mit 17,6 % gar nicht das Hauptproblem; die **Lage** ist es.
   Die Leiste muss weg von der Bahn, und die Werkzeuge müssen aus der ersten
   Reihe. Danach H1 für den Prüfsteg, der mit 39,5 % der Ausreisser ist.
2. **H3 — die Baufläche als Fläche.** Danach, weil sie den frei gewordenen
   Platz braucht.
3. **H4, H5, H6 — das Turmmenü.** Der Bildschirm, den man am häufigsten
   sieht.
4. **H7 bis H10, H12 — die Hygiene.** Sie ist billig und macht alles davor
   sichtbar besser.

Die Pakete stehen als **E1 bis E8** im Rückstandsverzeichnis, jedes mit
Schließbedingung.
