# Audit — HUD, Bildschirmaufteilung und Turmmenüs

Stand: v346 · 11.09.2026

**Nachgesehen in v346 — die Belegungszahlen stehen unverändert, und der
wichtigste Befund der sieben Runden ist einer, den keine von ihnen messen
konnte.** `feldVerdeckung` hat in v344 eine dritte Fläche bekommen: die
Weichenringe. Gemessen liegen in `ruhe` **0,0 %** von ihnen unter der
Bedienung, in `welle` **50,0 %** und mit eingeklappter Leiste **26,9 %** —
und der Ring ist genau dann verdeckt, wenn er gar nicht bedienbar ist
(`weicheStellen` lehnt während einer Welle ab). Der Befund des
Inspektorlaufs war damit beantwortet, ohne eine Zeile Spiel zu ändern.

**Was danach übrig blieb, ist der Satz dieses Audits in Reinform** (v346,
N4X): der Ring war frei, gut getroffen und **sagte trotzdem nichts**. Er
trug einen liegenden Strich im Kreis, also das Zeichen für „entfernen" oder
„gesperrt", an der Stelle, an der der Spieler die einzige Wegentscheidung
des Spiels trifft. **Keine Belegungszahl kann das sehen** — Fläche, Treffer
und Verdeckung waren alle in Ordnung. Gefunden hat es der Blick (Regel 8),
gehalten wird es jetzt von zwei Zahlen in `npm run netz`: der Pfeil liegt
0,9 bis 8,7 Grad neben dem Ast, den die Gegner nehmen, und die Gabel
spreizt 30,1 bis 130,8 Grad.

**Nachgesehen in v339 — nachgefahren, nicht geglaubt.** `npm run uxtor` auf
demselben Gerät und in derselben Auflösung, nach sieben Runden (v333 bis
v339):

| Zustand | gesperrt | bemalt | Bahn | Bauplätze |
|---|---|---|---|---|
| zug | 7,9 % | 10,3 % | 0,0 % | 10,3 % |
| ruhe | **13,1 %** | 16,3 % | 17,8 % | 4,6 % |
| welle | 13,9 % | 16,1 % | 17,8 % | 4,0 % |
| bauwahl | 22,0 % | 25,2 % | 17,8 % | 17,2 % |
| prüfsteg | **27,0 %** | 30,2 % | 26,4 % | 26,4 % |
| dock zu | — | — | 13,2 % | 4,6 % |

**Punkt für Punkt dieselben Zahlen wie in v332** — keine der sieben Runden hat
die Oberfläche angefasst; sie sind Messgeräte und Torreparaturen. H1 verlangt
höchstens 25 % bei offenem Turmmenü, gemessen 27,0; die zwei Punkte liegen
unverändert als **N4M** im Verzeichnis, mit beiden gemessenen Wegen daneben.
17,8 % der Bahn unter der Bedienung stehen als **N4F** da, und das Einklappen
der Leiste ist gemessen nicht der Hebel (17,8 → 13,2, an den Bauplätzen gar
nichts).

**Der Selbsttest der Verdeckung trägt weiter** (ohne Fleck 0 Funde, mit Fleck
1, danach wieder 0) — eine Reihe aus acht Nullen sagt ohne ihn nichts
(Regel 5).

**Nachgesehen in v332 — nachgefahren, nicht geglaubt.** `npm run uxaudittor`
auf demselben Gerät und in derselben Auflösung, mit der Ankündigung der
Vorzeichen im Streifen (v332):

| Zustand | gesperrt | bemalt | Ratsche | v325 |
|---|---|---|---|---|
| `zug` | **7,9 %** | 10,3 % | 16 | 8,0 % |
| `ruhe` | **13,1 %** | 16,3 % | 14 | 13,1 % |
| `bauwahl` | **22,0 %** | 25,2 % | 23 | 22,0 % |
| `pruefsteg` | **27,0 %** | 30,2 % | 28 | 27,0 % |
| `teurer` | **21,7 %** | 24,7 % | — | — |
| `welle` | **13,9 %** | 16,1 % | 16 | 13,1 % |

**Die einzige Zahl, die sich bewegt hat, ist `welle` — 13,1 auf 13,9 %**, und
sie ist bezahlt: das ist das Vorzeichenband der nächsten Welle, gemessen als
`#dock` 8,3 → 9,2. Acht Zehntel Prozent für eine Ankündigung, die sagt, wogegen
die nächste Welle gebaut wird; die Ratsche von 16 bleibt unberührt, und der
Streifen selbst wächst nicht (`npm run streifen`: höchste Welle unverändert 67
von 86 Punkten). **Kein anderer Zustand hat sich um ein Zehntel geändert.**

**Und `#hud` steht in JEDEM Zustand bei denselben 1,7 %** — die Kopfzeile ist
die einzige Fläche, die nie verschwindet, und sie ist die kleinste. Das ist die
Antwort auf H2 („die Lage ist das Hauptproblem, nicht der Prozentwert"): was
dauerhaft über dem Feld liegt, ist `#dock` mit 8,3 bis 9,2 und `#b-wave` mit
3,0, und beide sitzen am unteren Rand — dort, wohin v219 die Bahn gezogen hat.
Das steht unverändert als **N4F** im Verzeichnis, mit beiden Zahlen.

**Nachgesehen in v325 — nachgefahren, nicht geglaubt.** `npm run uxaudittor`
auf demselben Gerät und in derselben Auflösung:

| Zustand | gesperrt | bemalt | Ratsche | v311 |
|---|---|---|---|---|
| `zug` (neu seit v303) | **8,0 %** | 10,4 % | 16 | 7,9 % |
| `ruhe` | **13,1 %** | 16,3 % | 14 | 15,5 % |
| `bauwahl` | **22,0 %** | 25,2 % | 23 | 24,5 % |
| `pruefsteg` | **27,0 %** | 30,2 % | 28 | 34,2 % |
| `teurer` | **21,7 %** | 24,7 % | 23 | 24,2 % |
| `welle` | **13,9 %** | 16,1 % | 14 | 15,5 % |

**Fünf Zustände sind gefallen, und die Ratschen sind in v320 hinterhergezogen**
— sie standen bis dahin auf den Zahlen von v294 und hätten einen Rückfall um
zwei bis sieben Punkte stillschweigend zugelassen. Gebracht haben es v315 (die
drei gesperrten Fähigkeitsfelder geben ihre Fläche her, `ruhe` 15,5 → 13,1) und
v316 (das Turmmenü steht am Turm und klappt seine Werte zu, `pruefsteg`
34,2 → 27,0). **Der Ort brachte davon 1,3 Punkte, das Zuklappen 3,3** — der
Inhalt ist die Fläche, nicht die Lage.

Fünf Schriftgrößen (8/10/12/15/17 px), keine Doppelungen, alle
Trefferflächen über 44.

**Seit v318 und v320 misst das Tor zwei Dinge mehr, und beide beantworten
Fragen, die der Prozentwert nicht beantwortet.** `textVerdeckung` fragt, ob
Bedienung Bedienung zudeckt (acht Zustände, alle auf null, mit gestelltem
Fleck als Selbsttest); `feldVerdeckung` fragt, ob die Fläche an der richtigen
Stelle liegt — eine Leiste am Rand und eine Leiste auf der Bahn messen
dieselben Prozente. Gemessen liegen **17,8 % des Bahnschlauchs** unter `#dock`
und `#b-wave`, in jedem Spielzustand; das ist H2 als Zahl und steht als **N4F**
im Verzeichnis.

**Der Kartenzug hat die Leiste nicht gesprengt, weil er sie ERSETZT.**
`setSpielansicht` blendet das Dock aus, solange eine Karte zu ziehen ist;
beide zugleich sperren gemessen 21,7 % gegen erlaubte 16. Jede für sich passt,
beide nicht — dieselbe Auskunft wie beim siebten Bauknopf, nur an anderer
Stelle.

**Zwei neue Bildschirme sind dazugekommen und zählen hier NICHT mit**
(v305 Abschnittswahl, v306 Kartenstapel): sie sind Menü, und im Menü ist keine
Spielbedienung sichtbar (Regel 6). Abgenommen werden sie als Aufnahmen
(`menu-wahl`, `menu-stapel`) statt über die Belegung.

**Nachgesehen in v304 — der Bildschirm hat eine neue Dauerbewohnerin bekommen
und dafuer eine abgegeben.**

Der **Kartenzug** (v303) steht zwischen zwei Wellen ueber dem Feld, und die
Bauleiste weicht ihm. Das ist gemessen und nicht gewaehlt: mit beiden zugleich
sperrt die Bedienung im Ruhezustand **21,7 %** des Bildschirms gegen erlaubte
16 - die Leiste allein sind 10,8, der Zug 6,2. Jede fuer sich passt, beide
nicht.

**Vorher ist geholt worden, was zu holen war** (dieselbe Reihenfolge wie in
v294): der Zug trug erst Name, Zahl UND Satz und mass 11,7 %; mit Name und
Zahl sind es 6,2, und der Satz steht weiter im `title`. Erst danach die
Entwurfsentscheidung, und die sagt mehr als Platz: zwischen zwei Wellen ist
die Karte die **erste** Entscheidung.

| Zustand | Grenze | gemessen |
|---|---|---|
| zug (neu) | 16 | **7,9** |
| ruhe | 16 | 15,5 |
| bauwahl | 26 | 24,5 |
| teurer | 26 | 24,2 |
| pruefsteg | 35 | 34,2 |
| welle | 16 | 15,5 |

**Und das Audit hat sich dabei fast selbst entwertet.** Ohne den Zug zu
ziehen, mass es alle folgenden Zustaende **ohne Bauleiste** - vier Ratschen
waeren still lockerer geworden, ohne dass der Bildschirm besser geworden ist.
Der Zug kommt jetzt vor dem Ruhezustand und wird gezogen; danach stehen alle
vier Zahlen wieder da, wo sie standen. Dieselbe Verfallsart wie die vier Funde
aus v219.

**Der Kartenknopf misst 46 x 84 Punkte**, und das Beruehrungstor hat ihn beim
ersten Lauf selbst verlangt: "Knopfklasse zug-btn steht in keiner geprueften
Auswahl."

**Nachgesehen in v297 — und der offene Punkt dieses Audits hat aufgehoert,
eine Meinung zu sein: die Bauleiste traegt sechs Bauwerke und kein siebtes.**

Gemessen in v294 und v295, mit derselben Zahl zweimal:

| | ruhe | bauwahl | pruefsteg | welle |
|---|---|---|---|---|
| Grenze | 16 | 26 | 35 | 16 |
| sechs Bauwerke (v294) | 15,1 | 24,5 | 34,2 | 15,1 |
| **sieben (v295, Bannturm)** | **16,3** | **27,0** | **35,0** | **16,3** |

Alle vier Zustaende reissen zugleich. Der Bannturm ist deshalb gebaut,
gemessen und von fuenf Zusagen gehalten — und **nicht kaufbar**; er steht
nicht in `BAU_ORDER`. Das ist keine Entscheidung ueber den Turm, sondern eine
ueber diese Oberflaeche, und sie gehoert damit in dieses Audit.

**Was v294 vorher geholt hat, ist geholt:** `.pick-btn` von 62 auf 54 Punkte
Mindestbreite, `.tower-btn` von 50 auf 46 — beides waren Masse fuer ein ZIEL,
waehrend die Beruehrungsgrenze bei 44 liegt. Das brachte 25,5 → 24,5 und
34,6 → 34,2, und `npm run beruehrung` haelt weiter. Der naechste Schritt ist
kein Feilen mehr an Punkten, sondern eine andere Form: ein Ausklapper fuer die
Bauwerke, oder weniger Faehigkeitsknoepfe.

**Und die Aufschluesselung je WURZEL ist der Grund, warum das ueberhaupt zu
sehen war** (v286). Die nackte Prozentzahl nannte den Verursacher nicht: der
Befund zu v285 („welle 16,5 gegen 16") sah nach dem fuenften Bauknopf aus, und
das Dock stand in Ruhe und Welle bei denselben 10,4 %. Es war `#b-wave` mit
3,0 gegen 4,4.

**Nachgesehen in v290 — und ein Befund dieses Audits ist seit v286
geschlossen, ohne dass er hier stand.** Der laufende Strom im Wellenknopf trug
dessen Trefferfläche mit (208 → 317 Punkte breit) und startete eine Welle, wenn
man auf die **Anzeige** tippte. Ein Zustand, der wie eine Handlung reagiert,
ist genau die Klasse, die dieses Audit meint. Gemessen sperrte die Bedienung im
Zustand „welle" 16,5 % des Bildschirms gegen erlaubte 16; jetzt 15,1 % und
damit gleichauf mit dem Ruhezustand.

`uxaudit` schlüsselt die gesperrte Fläche seitdem **je Wurzel** auf — die
nackte Prozentzahl nannte den Verursacher nicht, und die erste Vermutung
(ein fünfter Bauknopf) war falsch. Das Dock steht in beiden Zuständen bei
denselben 10,4 %.


**Nachgesehen in v283:** die Messbefunde stehen unveraendert, und die drei
Inspektorlaeufe zu v278 bis v280 haben sie ohne eine einzige neue Kennung
bestaetigt - verdeckter Text, Bedienung ueber dem Spielfeld, zwei Turmleisten,
angeschnittener Kristall. Sie stehen als S-N4-04 bis S-N4-10 im Katalog. Was
seitdem dazugekommen ist, steht NICHT hier, sondern dort: ein Audit sammelt
einmal, die Kette arbeitet ab.

**Nachgesehen in v269:** die Messungen gelten unverändert — Belegung, Typoskala
und Trefferflächen sind gemessen in Ordnung, und genau das ist der Grund, warum
„HUD extrem verbessern" nicht „aufgeräumter" heißen kann. Der Neubau
(`Towerfront-NEUBAU.md`) zieht daraus den Schluss, den dieses Audit nicht
gezogen hat: es fehlt nicht Platz, sondern **Tiefe am Ort**. Der Prüfsteg mit
seinen gemessenen 32,9 % ist dafür der erste Kandidat (Story S-N4-02).

**Nachgemessen in v262** (`npm run uxtor`): 14,2 / 20,8 / **32,9** / 14,3 % —
unveraendert gegenueber v255. Die Zahlen der Tabelle unten gelten weiter.

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

| Zustand | Tipp gesperrt | Bild überdeckt | v248 (Tipp gesperrt) |
|---|---|---|---|
| Ruhe, nichts gewählt | 14,2 % | 17,1 % | 17,6 % |
| Turmwahl offen | 20,8 % | 23,6 % | 24,3 % |
| **Turmmenü offen** | **32,9 %** | **35,6 %** | **39,5 %** |
| Welle läuft | 14,3 % | 16,6 % | 16,4 % |

**Nachgemessen in v255** (`npm run uxtor`, 844 × 390, Raster 4). Die rechte
Spalte hält den Stand von v248 daneben, weil die Differenz die Auskunft ist:
der Prüfsteg ist von **39,5 auf 32,9 %** gefallen — das ist die Arbeit aus
v247 und v248, und ohne die alte Spalte stünde hier eine neue Zahl ohne
Vorher. Der Befund selbst bleibt: im meistbenutzten Zustand ist ein Drittel
des Feldes nicht mehr da.

**Mein erster Anlauf hat hier 40,0 % und 61,2 % gemeldet** — die vereinigten
Umrisskästen der obersten Bedienbehälter. Die Zahl ist nicht falsch
gerechnet, sie misst nur etwas anderes: `#hud` spannt sich über die volle
Breite und zählt deshalb mit 15 Prozentpunkten mit, obwohl man mitten
hindurch aufs Feld tippen kann. Regel 12, und diesmal hätte die falsche
Messstelle die Arbeit in die falsche Richtung gelenkt.

**Was bleibt, ist der Prüfsteg: 32,9 % (v255, vorher 39,5).** Im meistbenutzten Zustand des
Spiels — Turm angetippt, Ausbau überlegen — ist ein Drittel des Feldes
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

| # | Soll | v238 | v248 | v318 | Stand |
|---|---|---|---|---|---|
| H1 | ≤ 14 % / ≤ 25 % | 17,6 % / 39,5 % | 14,2 % / 32,9 % | **13,1 % / 27,0 %** | erste Hälfte **erledigt** (v315); zweite noch 2,0 Punkte, als **N4M** im Verzeichnis |
| H2 | nichts über der Bahn | Turmleiste verdeckt zwei von vier Gegnern | Band 96 statt 151 Punkte, eine Reihe statt drei | — | erledigt in v239, gemessen an einem A/B-Paar im selben Augenblick: 4 statt 2 sichtbare Gegner |
| H3 | Fläche, immer abrufbar | Kontur, nur bei gewählter Sorte | Fläche (v238), und eine Sorte ist von Anfang an vorgewählt (v242) | — | erledigt |
| H4 | Menü am Turm | am rechten Bildschirmrand, braucht 265 Punkte bei 218 freien | am Rand, braucht 228 bei 218 | **am Turm**, 175 bei 218 | **erledigt in v316** — der Kasten tritt zur Seite, links wenn dort Platz ist, sonst rechts; die Werte klappen zu und geben die fehlenden Punkte her |
| H5 | Turm als Bild | Text und Preis, kein Bild | Bild auf dem Leistenknopf (v239) und im Kopf des Menüs (v247) | — | erledigt |
| H6 | Ausbauweg | zwei Preisknöpfe, keine Auskunft | zwei Knöpfe, die in Zahlen sagen, worin sie sich unterscheiden (v248) | — | halb — die Auskunft ist da, der **Weg mit Stufen** nicht |
| H7 | ≤ 5 Größen | 11 | 8, 10, 12, 15, 17 | — | erledigt in v241, vom UX-Tor gehalten |
| H8 | Text auf Fläche | 32 Knoten ohne Fläche | die drei Zahlen haben seit v239 eine Fläche | — | halb — der Versionsstempel steht weiter nackt am Rand |
| H9 | keine Doppelung | 5 Beschriftungen doppelt | keine | — | erledigt in v239, vom UX-Tor gehalten |
| H10 | Telefon ≥ Schreibtisch | Telefon zeigt weniger | Frühstart (v243) und Zweigwirkung (v248) stehen jetzt auf beiden | — | halb — der erklärende Zweigsatz bleibt Schreibtisch-only, dafür fehlen 90 Punkte |
| H11 | keine Werkzeuge vorn | „Messung" ist das breiteste Element oben | hinter der Werkzeugklappe (v239) | — | erledigt |
| H12 | ≥ 44 | kleinste 38 × 20 | Kasten 40 × 20, **Trefferfläche 52 × 46** | — | erledigt — gemessen wird die Trefferfläche, nicht der Kasten |

**Dreizehn Punkte: neun erledigt, drei halb, einer fast.** Beim Abgleich in
v238 war einer halb erfüllt und elf offen. H1 (erste Hälfte) ist in v315
zugefallen, H4 in v316, und H13 ist in v318 dazugekommen — siehe unten.

**Was an H1 noch fehlt, ist gemessen und steht als N4M im Verzeichnis:** 2,0
Punkte. Der Ortswechsel des Turmmenüs hat 1,3 gebracht, das Zuklappen der
Werte 3,3 — **der Ort kostet fast nichts, der Inhalt IST die Fläche.** Die
zwei verbleibenden Punkte liegen in der Bauleiste (8,3 %, und sie steht auch
dann da, wenn man gerade keinen Turm baut) oder in H6 und H10, die beide
dieselbe Sache lösen: **Symbole statt Sätze**. Das ist Bildmaterial, kein
Code, und steht als E9.

---

## H13 — kein Element verdeckt den Text eines anderen (v318)

**Ein dreizehnter Punkt, und er kommt nicht aus der Referenz, sondern aus dem
eigenen Inspektorlauf v271.** Zwei Zustände, in denen Bedienung Bedienung
verdeckt — und beide Male genau die Zahlen, wegen derer man hinsieht:

| gefunden | was | bis wann |
|---|---|---|
| v271 | das Einweisungsband lag zu **100 %** über `GOLD`, `KRISTALL`, `WELLE` und ihren Zahlen, dazu zu 60 % über den drei runden Kopfknöpfen — beim ERSTEN Betreten einer Karte | v318 |
| v271 | die Aufwertungskarten lagen über `SCHADEN 8` und `REICHWEITE 326` | v316 (die Werte klappen zu), nachgemessen in v318 im Zustand mit aufgeklappten Werten |

**Beide sind sieben Fassungen lang durch alle Tore gegangen**, weil das UX-Tor
BELEGUNG misst — wieviel Fläche die Bedienung nimmt — und nicht, ob sie sich
selbst zudeckt. Seit v318 misst `textVerdeckung` das in acht Zuständen, zwei
davon eigens dafür hergestellt (das Einweisungsband wird in der Aufnahmereihe
zwei Zeilen früher weggeklickt; die Turmwerte sind seit v316 zugeklappt).

**Die Messstelle ist nicht `elementFromPoint`, und das ist gemessen** (Regel
12). Der erste Entwurf fragte danach — dieselbe Stelle wie die Belegung — und
meldete in jedem Zustand `GOLD`, `KRISTALL`, `WELLE` als zu 100 % verdeckt,
Täter `#view`: die Kopfzeile ist eine Anzeige und lässt Tipps durch, also gibt
der Browser die Leinwand darunter zurück. **„Wer fängt den Finger" ist eine
andere Frage als „wer deckt das Bild zu".** Gefragt wird seitdem nach
Überlappung mal Malordnung.

Die Ratsche steht auf **null** — ohne Band, weil eine halb zugedeckte Zahl so
unlesbar ist wie eine ganz zugedeckte.

Der Abgleich für die *Bedienung* stand nach v203 auf sieben von sieben
erfüllt — und das stimmt weiterhin. Gemessen wurde damals der **Ablauf**; nie
die **Fläche**.

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
