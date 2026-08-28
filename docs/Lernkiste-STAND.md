# Lernkiste — Stand

Was gebaut ist, was gemessen ist, was offen bleibt. Ergänzt Konzept K3, den
Prüfbericht und das Grafik-Audit; ersetzt keines davon.

Stand: nach M0-Vorarbeit, M2, MG, dem Tor `ansicht`, **M3 bis M6**, der
Sichtrunde (Hervorhebung des Ziels, Naht in Antarktika) und dem **Umzug nach
`Bluefield-Solutions/Smart-Kids`** samt PWA und Auslieferung.

> **Der Baum ist umgezogen.** Gearbeitet wird ab jetzt in
> `Bluefield-Solutions/Smart-Kids`, nicht mehr in `towerfront/lernkiste`.
> Diese Datei liegt dort unter demselben Namen weiter.
Code: `lernkiste/` — ein Arbeitsbaum, der ins eigene Repository umzieht.

---

## Was läuft

Alle Befehle laufen im Unterordner `lernkiste/`, nicht in Towerfront:

```
npm --prefix lernkiste run backen     Kartenpipeline: Kontinente, Deutschland,
                                      Länder, Antarktika, Städte
npm --prefix lernkiste run prototyp   baut prototyp/spiel.html
npm --prefix lernkiste run tor        inhalt · topologie · beruehrung · marken
                                      · doku · vergleich · ansicht · smoke
```

**Die Torkette ist grün.** Sieben Prüfungen, davon zwei mit Gegenprobe belegt.

---

## Gemessen, nicht geschätzt

Alle Stufen halten die Hausdorff-Grenze von **0,75 Bildpunkten** ein. Die
Spalten sind grob · mittel · fein, jeweils gzip.

| Ebene | grob | mittel | fein | Hausdorff max |
|---|---|---|---|---|
| Kontinente | 29,7 KB | 105,0 KB | 134,2 KB | 0,74 px |
| Deutschland | 34,3 KB | 55,7 KB | 57,5 KB | 0,52 px |
| Länder Asien | 95,8 KB | 194,3 KB | 268,1 KB | 0,69 px |
| Länder Afrika | 66,2 KB | 132,0 KB | 154,8 KB | 0,69 px |
| Länder Europa | 105,6 KB | 186,5 KB | 220,5 KB | 0,73 px |
| Länder Nordamerika | 74,2 KB | 188,9 KB | 253,4 KB | 0,74 px |
| Länder Südamerika | 62,0 KB | 108,7 KB | 137,9 KB | 0,74 px |
| Antarktika, polar | 7,8 KB | 15,3 KB | 19,0 KB | 0,71 px |

**Das Budget hält, mit einer Ausnahme.** Konzept K3 setzt „< 250 KB je
nachgeladener Ebene". Asien fein (268 KB) und Nordamerika fein (253 KB) liegen
darüber. Beide werden auf Ebene 2 aber nur in der **mittleren** Stufe gezeigt —
dort ist der Kontinent formatfüllend, nicht ein einzelnes Land. Die feine
Stufe entsteht trotzdem, weil sie nichts kostet, solange sie niemand lädt.

Das Startbündel braucht nur `kontinente.grob`: **29,7 KB**. Die 90-KB-Grenze
aus K3 ist damit zu einem Drittel ausgenutzt.

---

## Vier Zahlen, die sich geändert haben

**64 Gebiete statt 69.** K2 und K3 rechneten mit 30 Ländern — als gäbe es
sechs Kontinente mit Ländern. Es sind fünf: Australien ist ausgenommen,
Antarktika hat keine. 5 × 5 = 25. Gefunden hat es das Tor `inhalt` beim
ersten Lauf; die Zahl wird jetzt gezählt und gegen das Konzept geprüft.

**14 von 16 Bundesländernamen passen nicht ins Gebiet.** Gemessen am Pol der
Unzugänglichkeit gegen die Textbreite, bei 470 px Kartenbreite. Nur Hessen und
Bayern haben Platz. **Die Fahne ist der Normalfall, nicht die Ausnahme** —
Befund G10 ist damit größer als gedacht.

**Vier Gebiete brauchen eine entkoppelte Trefferfläche:** Bremen 9,4 pt,
Hamburg 16,8 pt, Berlin 17,9 pt, Saarland 32,3 pt. Und ein Paar überlappt sich
dabei: Brandenburg/Berlin liegen 4 pt auseinander. Im Prototyp ist es
umgesetzt — unsichtbare 44-pt-Kreise um den Anker, das kleinere Gebiet
gewinnt.

**Antarktika ist gelöst.** Der offene Punkt aus MG: in jeder Weltprojektion
liegt es als Sockel am unteren Rand. Es gibt jetzt eine **polare Aufsicht**
(azimutal flächentreu, auf den Südpol gedreht, 7,8 KB grob). Runde 3 bekommt
damit eine eigene Ansicht. Auf der Weltkarte kommt es **gar nicht mehr vor** —
sonst bliebe unten ein grauer Sockel stehen, der wie ein Fehler aussieht.

---

## Die Sichtrunde

Drei Befunde vom Gerät, keiner davon von einem Tor gemeldet.

**1. Man sah nicht, welches Gebiet gefragt ist.** Alle Flächen sahen gleich
aus, das Ziel war nur an einer etwas anderen Füllung zu ahnen. Jetzt tragen
die anderen `class="ruhig"` (Deckkraft 0,42, Sättigung 0,35), das Ziel behält
seine Farbe und bekommt zwei zusätzliche Umrisse: einen dunklen festen und
einen pulsierenden in der Akzentfarbe (Strichbreite 3 → 9, 1,5 s). Ist das
Ziel kleiner als 190 px, kommt ein hüpfender Zeiger auf den Anker dazu — in
fester **Bildschirmgröße**, also mit `1/k` gegenskaliert, sonst wäre er auf
der Weltkarte winzig und auf Bremen riesig. Bei `prefers-reduced-motion` wird
aus dem Puls ein dicker ruhender Strich. Nach der richtigen Antwort geht alles
aus.

**2. Ein Strich quer durch Antarktika.** Natural Earth speichert den Umriss
für eine **rechteckige** Weltkarte: er läuft bei 180 Grad die Längslinie
hinunter bis lat −89,999, einmal am unteren Rand entlang und bei −180 Grad
wieder hinauf. Auf der Weltkarte deckt sich das mit dem Kartenrand. In der
polaren Aufsicht sind 180 und −180 **dieselbe Linie**: beide Schenkel liegen
aufeinander und zeigen sich als Strich vom Rand bis in die Mitte.

Der Schnitt wird jetzt beim Backen durch **einen** Punkt ersetzt — den echten
Küstenpunkt bei 180 Grad. Gemessen: Fläche und Umgrenzung bleiben
**identisch** (432 160 px², dieselbe BBox), nur der nächste Umrisspunkt zur
Kartenmitte springt von **0,0 px auf 100,4 px**.

**3. Kein Tor hatte etwas davon gesehen** — und das war die eigentliche
Lücke. Beide Befunde sind jetzt eingefangen:

- Das Tor `topologie` sucht **Nadeln**: zwei Punkte desselben Ringes fallen
  aufeinander (< 0,15 px), der Weg dazwischen ist lang (≥ 20 px) und
  umschließt nichts (mittlere Breite < 0,05 px). Eine Naht ändert weder
  Fläche noch Umgrenzung noch Umlaufsinn — sie ist genau an dieser Kombination
  zu fassen. **Gegenprobe gefahren** (Regel 13): auf der alten Geometrie
  meldet es *1 Nadel, längste 236 px*, auf der neuen null.
  Die dünnsten **echten** Gebilde im Vorrat — drei Fjorde in Kanada, eine
  Nehrung in den USA — liegen bei 0,18 bis 0,27 px mittlerer Breite und
  kommen als Hinweis, nicht als Fehler: so stehen sie in der Wirklichkeit.
- Das Tor `ansicht` fotografiert jetzt auch den **lebenden Prototyp**, nicht
  nur die gemalten Entwürfe (`spiel-kontinent`, `spiel-bundesland`). Vorher
  steckte die ganze Spieldarstellung hinter keinem Tor: der Lauf blieb grün,
  während sich jeder Spielbildschirm änderte. Je Aufnahme wird die Ablage
  geleert, damit der Keim aus Sitzungsnummer 0 kommt — dreimal nacheinander
  0 Bildpunkte Unterschied.

---

## Vier stille Fallen beim Bauen

Keine davon wurde rot. Alle vier sind der Grund, warum es die Tore gibt.

1. **`-clean gap-fill-area=20km2` auf unprojizierten Graddaten** löste die
   halbe Geometrie auf. Die Messung meldete danach 0,00 px Abweichung bei
   2,4 % der Punkte — ein perfektes Ergebnis für nichts.
2. **d3-geo erwartet den entgegengesetzten Umlaufsinn zu RFC 7946.** Natural
   Earth liefert im Uhrzeigersinn und läuft; mapshaper dreht um, und danach
   umschließt jede Fläche rechnerisch den Nordpol: `geoBounds` meldet die
   ganze Erde, `fitWidth` liefert Maßstab 0, jede Fläche ist null.
3. **`-dissolve2` gibt eine GeometryCollection zurück** und lief damit an der
   Umlaufsinn-Korrektur vorbei, die nur Features kannte.
4. **Die Inselregel muss je Stufe gelten.** Nur an der feinsten angewandt,
   steckte Fehmarn auch in der groben Stufe, wo es 0,4 × 0,4 Bildpunkte groß
   ist. Die Vereinfachung ließ es zusammenfallen, sein Umriss lag danach weit
   von allem entfernt — und die Abstandsmessung kam nicht unter 59 % Punkte.

Dazu drei Fehler in den Toren selbst, gefunden beim ersten Lauf: der
Umlaufsinn wird im **ausgegebenen** Pfad andersherum gemessen (y zeigt nach
unten), das Markentor las den Abendmodus mit, und das Tor `ansicht` war nicht
deterministisch — eine endlose Animation bleibt auch bei 1 ms Dauer irgendwo
stehen.

---

## M3 bis M6

Vier Kernmodule, alle einzeln prüfbar und ohne DOM:

| Modul | Was |
|---|---|
| `src/vergleich/` | Kölner Phonetik, Damerau-Levenshtein, drei Ausgänge (angenommen · Rückfrage · nochmal), Rechtschreibbewertung |
| `src/kern/leitner.js` | fünf Fächer, deterministische Sitzungsauswahl, Fortschritt |
| `src/profil/ablage.js` | IndexedDB ohne Abhängigkeit, `storage.persist()`, profilweises Löschen |
| `src/protokoll/` | anhängender Ereignisstrom, Auswertung, CSV- und JSON-Ausfuhr |

Im Prototyp sind sie eingebettet — ein kleiner Inliner wickelt jedes Modul in
eine benannte IIFE. Ohne das kollidiert `mischen` aus dem Leitner mit
`mischen` aus dem Spiel, und niemand merkt es.

### Das Tor `vergleich`

| Korpus | Trefferquote | Falsch-Positiv |
|---|---|---|
| erfunden (65 / 43 Fälle) | 100 % | 2,3 % |
| eingefroren | **fehlt noch** — entsteht aus echten Aufnahmen | — |

**Solange die eingefrorene Hälfte fehlt, gilt keine Zielzahl.** Das Tor sagt
das ausdrücklich, statt eine Zahl zu melden, die nichts bezeugt. Es fängt
trotzdem eine offensichtliche Fehlfunktion: ein Abgleich, der alles annimmt,
fällt durch.

Der erste Lauf meldete **11,6 % Falsch-Positiv**: „euro" wurde als Europa
angenommen, „bayer" als Bayern, „afrikaner" als Afrika. Lauter kürzere oder
längere Wörter, die klanglich fast gleich sind. Zwei Regeln haben es
behoben — eine Längenstrafe im Abstand, und die Regel, dass ein Wort, das
eine Silbe zu kurz oder zu lang ist, **nie ohne Rückfrage** angenommen wird.
„Meintest du Bayern?" ist die richtige Antwort auf „Bayer", nicht „richtig".

Was bleibt: **„aussen" wird als „Asien" angenommen.** Die Kölner Phonetik
gibt beiden denselben Code, und sie sind gleich lang. Das ist eine echte
Grenze des Verfahrens, kein Einstellfehler.

## Der Prototyp

`lernkiste/prototyp/spiel.html` — **eine Datei, läuft ohne Server**, 766 KB.

Beide Profile, vier Ebenen (Kontinente, Länder in Europa und Afrika,
Bundesländer, Landeshauptstädte), echtes Ziehen mit Pointer Events, Vorlesen,
Spracherkennung wo verfügbar mit Rückfall auf Stufe C, der Belohnungsmoment,
Abendmodus.

Was der Rauchtest wirklich fährt: Profilwahl → Ebenenwahl → Ziehen →
Belohnung, auf **iPhone quer, iPhone hoch und iPad quer**.

Zwei Layoutfehler hat erst der Rauchtest gefunden: die CSS-Regeln für das
Spielfeld waren auf `#spiel` gezielt, während der Bildschirm gar keine id
hatte — die Karte wuchs auf ihre Eigengröße. Und im Querformat rutschte das
erste Etikett **unter die Kopfleiste**, weil `justify-content: center` bei
Überlauf über die obere Kante hinausschiebt. Der Finger traf dort die Leiste.

Neu mit M3 bis M6: **Ablage in IndexedDB** (der Fortschritt überlebt den
Neustart), **Leitner mit fünf Fächern**, **Forscherbuch** (der Aufkleber ist
der Umriss des Gebiets selbst), die **Stadtstaaten-Lerneinheit** vor Ebene 4,
und der **Elternbereich** hinter einer vierstelligen PIN: Trefferquoten,
Wackelkandidaten, Ausspracheliste, CSV- und JSON-Ausfuhr, profilweises
Löschen, Fassungsstempel, Speicherzustand und die Herkunft der Karten.

**Was der Prototyp NICHT ist:** keine PWA, kein Service Worker, kein
Startbildschirm-Symbol, keine Auslieferung. Das ist M1 und braucht das
Repository.

### Fünf Fehler, die erst der Rauchtest gezeigt hat

1. **Die CSS-Regeln fürs Spielfeld waren auf `#spiel` gezielt**, während der
   Bildschirm gar keine id hatte — die Karte wuchs auf ihre Eigengröße.
2. **Im Querformat rutschte das erste Etikett unter die Kopfleiste**, weil
   `justify-content: center` bei Überlauf über die obere Kante hinausschiebt.
   Der Finger traf dort die Leiste.
3. **Berlins 44-Punkt-Trefferkreis lag über Brandenburgs Anker.** Brandenburg
   war an seiner besten Stelle nicht mehr treffbar. „Das kleinere gewinnt"
   heißt nicht „das kleinere sperrt aus" — die Kreise schrumpfen jetzt, bevor
   sie den Anker eines Nachbarn verschlucken.
4. **Der Aufkleber kam erst bei Fach 5**, also nach vier richtigen Antworten
   über drei Wochen. Für eine Sechsjährige bliebe das Forscherbuch wochenlang
   leer. Jetzt ab Fach 3, mit einem Siegel bei Fach 5.
5. **Die Auffüllung der Sitzung bevorzugte Neues vor Angefangenem.** Ein Kind
   bekam in der zweiten Sitzung fast nur neue Gebiete, keines erreichte Fach 3,
   und das Buch blieb leer — bei zwölf richtigen Antworten.

Dazu zwei Fehler im Tor selbst: die Fortschrittsprüfung `/[1-9]/` traf die
**16** in „0 von 16 geschafft" und meldete grün, obwohl nichts abgelegt war —
sie liest jetzt die Ablage statt den Text. Und der Zufallskeim kam aus der
Uhr, womit keine Sitzung reproduzierbar war; er kommt jetzt aus einer
gespeicherten Sitzungsnummer.

---

## Der Umzug: PWA und Auslieferung

**Ebene 4 zeigt jetzt immer vier Städte.** Genau eine ist richtig, die
Reihenfolge wird je Aufgabe neu gewürfelt, und das gilt für **beide
Profile** — auf dieser Ebene tippt auch Lea nicht. Gefragt ist, *welche*
Stadt es ist, nicht wie man sie schreibt; eine Stadt zu tippen, die man nie
gesehen hat, prüft das Buchstabieren. Im Elternbereich abschaltbar.

Die drei falschen sind nicht beliebig: **eine** kommt aus demselben
Bundesland — bei fünf Ländern ist die größte Stadt nicht die Hauptstadt, und
dort sitzt der Irrtum. **Zwei** sind Hauptstädte anderer Länder, sonst
stünden vier Namen aus derselben Ecke Deutschlands da.

**Der neue Rauchtest dafür fand sofort einen echten Fehler.** Der einfache
lineare Kongruenzgenerator legte die richtige Antwort in **zehn Aufgaben
hintereinander nur auf Platz 2 oder 3** — nie auf 1 oder 4. Benachbarte
Aufgaben liegen im Keim 7919 auseinander, und bei einem LCG hängen die
Ausgaben zu benachbarten Keimen linear zusammen. Jede Einzelprüfung war
grün: vier Städte, eine richtig, eine aus demselben Land. Die Aufgabe war
trotzdem kaputt — wer rät, rät in der Mitte. Jetzt Mulberry32, alle vier
Plätze belegt.

**Das App-Symbol** ist ein Globus in orthographischer Aufsicht, gedreht auf
10° Ost / 15° Nord, aus **derselben Küste wie die Karten im Spiel** (Natural
Earth 1:50m, auf 0,81 px Hausdorff vereinfacht). Kein Clipart — ein Symbol,
das neben der App liegt, verspricht etwas anderes als sie hält. Die Kugel
misst 75 % der Kante und liegt damit innerhalb der iOS-Maske *und* der
80-%-Schutzzone maskierbarer Kacheln. Ausgeliefert werden 180 (iOS), 192 und
512 (Manifest); die 1024 bleibt als Vorrat im Baum.

**Die PWA löst zwei Zusagen auf, die einander widersprechen:** ohne Netz
starten und immer aktuell sein. Getrennt wird an der Stelle, an der es sich
entscheidet — die **Seite** kommt Netz zuerst (mit 2,5 s Reißleine, ein Kind
wartet nicht auf ein mürbes Hotel-WLAN), **Schrift und Symbole** kommen
Lager zuerst, weil sie sich innerhalb einer Fassung nie ändern.

**Die Schriften liegen jetzt im Baum**, nicht bei Google. Drei Gründe: eine
Kinder-App soll beim Start nicht bei einem Dritten anklopfen, ohne Netz gäbe
es sonst keine Schrift, und der Bau auf dem Runner braucht so kein Netz. Nur
der Schnitt **latin** — 51,6 KB statt 328. Beide stehen unter der SIL OFL
1.1, Herkunft in `src/schrift/HERKUNFT.md`.

### Vier neue Tore, und was sie gefunden haben

| Tor | Was es prüft | Erster Fund |
|---|---|---|
| `schrift` | kein angezeigter Name braucht ein Zeichen außerhalb von latin | ●, ○ und ← in der PIN-Eingabe — sie sind jetzt gezeichnet statt getippt |
| `symbol` | quadratisch, undurchsichtig, nicht leer, Kugel in der Maske | — |
| `pwa` | Manifest vollständig, Symbole in der genannten Größe, **jede** Datei im Vorrat existiert wirklich | — |
| `offline` | startet die App ohne Netz | — |

`offline` fährt seine **Gegenprobe bei jedem Lauf mit**: ohne Service Worker
*muss* dasselbe durchfallen. Sonst misst das Tor den Browser-Cache und wäre
grün, ohne je etwas bewiesen zu haben (Regel 13).

### Das Tor `ansicht` läuft nicht auf dem Runner

Beim ersten Lauf dort waren **alle sieben Aufnahmen rot** — zwei davon mit
*geänderten Maßen*, also anderem Zeilenumbruch, nicht nur anderen
Bildpunkten. Das ist kein Befund über die App, sondern einer über die
Maschine: der Runner hat einen anderen Chromium-Bau, andere Ersatzschriften
und andere Kantenglättung. Ein Bildpunktvergleich gilt nur bei **gleicher
Zeichenumgebung**.

Es wird deshalb auf dem Runner übersprungen — **laut und mit Begründung im
Protokoll**, nicht still. Ein Tor, das sich unbemerkt überspringt, ist
schlimmer als keines. Ortsfest läuft es weiter mit `npm run ansicht`.

**Offen (D28):** Wer die Aufnahmen auch auf dem Runner will, muss die
Umgebung festnageln — im Playwright-Abbild bauen *und* die Vorbilder darin
aufnehmen. Solange beides nicht in derselben Umgebung passiert, misst der
Vergleich die Maschine.

**Geprüft wird ab jetzt `dist/`**, nicht mehr `prototyp/spiel.html`. Die eine
Datei ist eine Bequemlichkeit zum Verschicken; sie hat weder Manifest noch
Service Worker, ein grüner Lauf auf ihr beweist nichts über die App auf dem
Startbildschirm. Dabei kam heraus, dass die alten Vorbilder des Tors
`ansicht` die **Systemschrift** festgehalten hatten — die Google-Schrift war
beim Aufnehmen nie angekommen, und niemandem war es aufgefallen. Das Tor
prüft jetzt vor jeder Aufnahme, dass beide Schriften wirklich geladen sind.

Und die Zusammenfassung sagte „Alle **vier** Tore grün", während längst
sechs liefen. Die Zahl wird jetzt gezählt, nicht geschrieben.

---

## Die Sichtrunde am Gerät

Der Anlass war eine Bitte um **Gestaltungsvorschläge**. Beim Nachmessen auf
sechs Gerätegrößen kam heraus, dass die App auf dem **Zielgerät kaputt war** —
und drei Tore meldeten grün.

### Sechzehn Elemente waren nicht erreichbar

| Gerät | Was fehlte |
|---|---|
| iPhone quer 844×390 | vierte Antwort 22 px unter dem Rand · „Bundesländer" und „Landeshauptstädte" 10 px · „Verstanden" der Stadtstaaten-Einweisung 42 px |
| iPhone SE quer 667×375 | dasselbe, dazu drei Tasten der Eltern-PIN |
| iPhone hoch 390×844 | „Landeshauptstädte" 64 px · „Zurück" und „Eltern" **verdeckt** von der Überschrift |
| iPad, Schreibtisch | in Ordnung — deshalb ist es nie aufgefallen |

Im Klartext: das Kind sah auf dem iPhone die vierte Antwort nicht, kam nicht
in die Landeshauptstädte, und auf dem SE ließ sich die Eltern-PIN nicht
eingeben.

### Warum kein Tor es sah

Der Rauchtest sucht Etiketten über das **DOM**, nicht über das Sichtbare — ein
Element in einem scrollenden Behälter *existiert*, es ist nur nicht da. Das
Tor `ansicht` fotografiert bei 1240 × 1000, wo alles passt. Und `beruehrung`
misst Kartenflächen, keine Knöpfe.

### Die Ursachen, der Reihe nach

1. **`justify-content:center` auf `.mitte`.** Läuft der Inhalt über, schiebt
   zentrierter Inhalt nach **oben und unten gleichzeitig** hinaus — deshalb lag
   die Überschrift über den Kopfknöpfen. Für `.seite` war das seit v109
   repariert, für `.mitte` nie nachgezogen. Regel 15, wörtlich.
2. **`style="min-width:200px"` inline im Markup.** Inline schlägt jede
   Stilregel. Vier Größen waren rot, während im Stylesheet ein sauberes Raster
   stand, das gegen eine Zahl im Markup arbeitete.
3. **Ein Rasterfeld ist mindestens so breit wie sein längstes Wort.**
   „Landeshauptstädte" sprengte die Spalte um bis zu 36 px.
4. **Eine Medienabfrage erhöht die Spezifität nicht.** Der Kurzschirm-Block
   stand vor `.ziffern` und war für die wirkungslos.
5. **Ohne `min-width:0` läuft der Text aus seinem eigenen Knopf** — der Kasten
   saß, der Inhalt nicht.

### Vier Marken, die es nie gab

Beim Aufräumen fiel auf: `--app-gut`, `--app-warn`, `--app-linie` und
`--f-mono` wurden an **neun Stellen benutzt und nirgends definiert**. Deshalb
hat sich **kein Fortschrittsbalken je gefüllt**, und „Richtig — Thüringen!"
stand nie in Grün. `marken.css` und die Kopie in `vorlage.html` waren
außerdem auseinandergelaufen (`--tinte-2` gegen `--tinte2`).

Die Kopie ist weg. Der Bau setzt `marken.css` jetzt selbst ein.

### Das Tor `passt`

Sechs Gerätegrößen × sieben Bildschirme. Kein bedienbares Element darf über
den Rand seines Behälters laufen, keines darf **verdeckt** sein
(`elementFromPoint` in seiner Mitte), und der **Text muss in seinen Knopf
passen**. `overflow:auto` zählt nicht als Lösung: ein Kind scrollt nicht in
einer Liste, von der es nicht weiß, dass sie weitergeht.

Alle drei Prüfungen sind gegengeprobt — jede meldet den Fehler, für den sie
gebaut wurde, und schweigt danach.

### Die Knöpfe

Vorher war **jeder** Knopf dieselbe weiße Pille: die Antwort, die
Ebenenkachel, „Zurück", „Eltern". Deshalb wirkte nichts gestaltet — es gab
keine Rangfolge. Jetzt drei Gewichte: `.knopf` **leise** (Werkzeug am Rand,
kein Füllton), `.kachel` **mittel**, `.etikett` **laut** (die Antwort, der
wichtigste Knopf der App).

Die Tiefe ist keine versetzte Fläche mehr, sondern eine **Kante**: helle Linie
oben innen, dunklere unten. Beim Drücken fährt der Knopf um genau die
Kantenhöhe nach unten. Und bei falscher Antwort **wackelt das Etikett** —
vorher passierte dort gar nichts, es kam nur ein Satz darunter.

---

## Die Ausbaurunde

Vier Punkte, die ohne Rückfrage zu machen waren — in dieser Reihenfolge,
damit die spätere Arbeit im System landet und nicht daneben.

### 1. Das Gestaltungssystem hält jetzt

Im Stylesheet standen **vier Farben, drei Dauern und ein Dutzend
Strichstärken** frei herum, in `spiel.js` vier weitere Farben — darunter die
der Sterne. Und `#1b2835` stand zweimal im Baum (Meta-Tag und Manifest).

Alles in `marken.css`, neue Marken für Kante, Ring, Puls, Treffer, Ziel,
Stern. Das Tor `marken` prüft es jetzt in fünf Kategorien — Farbe, Dauer,
Radius, Strich, Abstand — und alle vier Gegenproben schlagen an. Was ein
**Bauteilmaß** ist (44 pt Trefferfläche, 76 px Mikrofon), bleibt erlaubt:
das sind Größen, keine Marken.

### 2. Der Grundriss folgt der Karte (D29)

Die Karte beanspruchte Platz, den sie nicht nutzen kann. Gemessen: auf dem
iPhone quer war ihr Kasten **420 Punkte breit, gezeichnet wurden 213** —
daneben ein Loch, das niemand nutzt. Deutschland ist hochformatig (0,74),
die Weltkarte quer (1,67); ein Kasten für beide verschenkt immer bei einer.

Das ist bewusst **keine Stilregel** geworden: CSS kann die eine Achse nicht
gegen die andere abwägen. `aspect-ratio` mit `width:100%` macht die Höhe
richtig und lässt die Breite stehen, mit `height:100%` genau andersherum.
`kartenGroesse()` misst den freien Platz und setzt beides — ein `Math.min`.

Dazu ist das Mikrofon verschwunden, wenn der Sprachmodus aus ist. Es stand
grau da, mit einer **Anweisung an die Eltern auf dem Spielbildschirm des
Kindes**, und kostete bis zu 120 Punkte Höhe.

| | vorher | jetzt |
|---|---|---|
| iPhone hoch · Deutschland | 45 % des Feldes | **62 %** |
| iPad hoch · Deutschland | 34 % | **49 %** |
| Fenster schmal · Weltkarte | 36 % | **51 %** |
| Karte füllt ihren Kasten | 43–100 % | **94–100 %** |

### 3. Die Karte füllt sich beim Spielen (D30)

Was schon saß, steht in voller Farbe und trägt einen grünen Haken; der Rest
bleibt gedämpft. Der Fortschritt steht damit **auf der Karte**, nicht nur als
Zahl in der Kopfzeile.

Der erste Anlauf hing an der Sitzung — der Rauchtest meldete sofort *null
gekonnte Gebiete*, weil die Karte nach jedem Neustart wieder leer war. Jetzt
kommt es aus dem **Leitner-Stand** (Fach ≥ 2): es überlebt das Schließen der
App und fällt zurück, wenn ein Gebiet später danebengeht.

### 4. Der Name am Ort (G10)

Bei richtiger Antwort steht der Name auf der Karte. Gehört hat das Kind ihn,
gelesen auf einem Etikett — aber nicht **am Ort**, und genau diese Verbindung
soll hängenbleiben.

**14 von 16 Bundesländernamen passen nicht in ihr Gebiet**, deshalb ist die
Fahne der Normalfall: ein Schild neben dem Gebiet mit einer Leitlinie
darauf. Entschieden wird **gemessen** — der Text wird gesetzt, ausgemessen
und mit dem Gebiet verglichen — nicht nach Liste. Damit gilt es auch für
Kontinente, Länder und jede Karte, die noch dazukommt.

Der Rauchtest prüft, dass der Name erscheint, ganz im Kartenfeld liegt und
dass **beide Sorten vorkommen**: fällt die Entscheidung immer gleich aus,
ist sie keine Messung, sondern eine feste Einstellung.

---

## Die Spielerrunde

Anlass: ein Kind tippte **„Australien"** und die App lehnte es ab. Ich habe
daraufhin aus Spielersicht alles durchgespielt — und **sechs Fehler**
gefunden, von denen zwölf Tore keinen gesehen hatten. Sie prüften, ob das
Programm läuft. Keines hatte je eine Antwort gegeben.

### 1. Beim Tippen zählte kein einziger Alias

`rechtschreibung()` bekam nur den kanonischen Namen. Der Kontinent heißt im
Vorrat „Australien und Ozeanien"; **„Australien" stand als Alias da und wurde
nie gelesen.** Mit ihm fielen durch: England, Großbritannien, Britannien,
Kongo, Amerika, Ozeanien, Antarktis, Südpol, Canada, Mexico, Tanzania,
Bangladesh, Aegypten, Aethiopien. **21 richtige Antworten** wurden abgelehnt.

### 2. Die Hervorhebung bewachte das Ziel

Der pulsierende Ring um das gesuchte Gebiet (`fill:none`, Strich bis 9 pt)
lag **über** der Fläche und fing den Zug ab. `elementFromPoint` lieferte
`path.zielpuls` — weder Gebiet noch Trefferkreis —, und die Bewertung lief
**gar nicht erst an**: kein Protokolleintrag, kein Hinweis, keine Bewegung.
Gemessen waren **21 bis 35 % der Zielfläche** blockiert; etwa jeder vierte
Zug landete auf nichts.

Ausgerechnet die Hervorhebung, die zeigen soll wohin man ziehen muss.

### 3. Fionas drei Runden gab es nicht

Das Konzept (4.1) gibt ihr drei aufeinander aufbauende Runden. Im Code stand
`k.runde<=3` — **immer wahr**. Sie bekam von Anfang an alle sieben
Kontinente, das Feld `runde` war Dekoration. Jetzt öffnet die nächste Runde,
wenn jeder Kontinent der bisherigen einmal saß (Fach 2).

Dabei ist gleich der nächste aufgefallen: die Runde begrenzte auch die
**Karte** — auf Fionas Weltkarte fehlten Asien und Nordamerika ganz. Die
Runde begrenzt jetzt, wonach gefragt wird, nicht was es auf der Welt gibt.

### 4. Fünfzehn Länder waren nicht erreichbar

Die Torkette zählte **25 Länder**, spielbar waren **10**. Asien, Nord- und
Südamerika lagen gebacken im Baum und waren nicht verdrahtet. Die
Ebenenwahl kommt jetzt aus den Daten statt aus einer zweiten Liste.

### 5. Guatemala hatte keine Fläche

Und dann waren es 24 statt 25. Auf der groben Stufe misst Guatemala rund
anderthalb Bildpunkte, und der Inselfilter warf es weg — ein **MultiPolygon**
behielt dort immer seine größte Fläche, ein einfaches **Polygon** fiel
ersatzlos. Guatemala ist ein einfaches Polygon. Es stand in den Daten, wurde
gezählt und konnte nie gefragt werden.

### 6. Der ausgeblendete Bildschirm nahm noch an

Die unsichtbaren Trefferkreise setzen `pointer-events:all` und hoben damit
das `none` ihres ausgeblendeten Bildschirms auf — 340 ms lang. Gefunden beim
Suchen nach Fehler 2, behoben, auch wenn es nicht die Ursache war.

### Das Startpaket wurde dabei kleiner

Mit fünf Kontinenten wäre die Seite von 297 auf **537 KB gzip** gesprungen —
fast die Hälfte davon Umgebungskarten. Die Länderebenen werden jetzt einzeln
nachgeladen und vom Service Worker ins Lager gelegt. **Start: 132 KB gzip**,
je Kontinent 63–107 KB einmalig. Das Offline-Tor läuft jetzt bis zu einer
nachgeladenen Ebene, nicht nur bis zum Startbildschirm.

### Zwei neue Tore

**`spielprobe`** (ohne Browser, 0,3 s): 455 Antworten und Zusammenhänge.
Jeder Name, jeder Alias, kleingeschrieben, ein Buchstabe daneben, jede
hinterlegte Aussprache — für alle Ebenen und beide Tiefen. Dazu: Ränge 1–5
je Kontinent lückenlos, kein Ablenker ist die Hauptstadt, jedes Gebiet aus
den Daten hat eine Fläche auf der Karte.

**`passt`** prüft zusätzlich, ob das gesuchte Gebiet den Finger **überall**
annimmt, wo man es sieht — mit `elementsFromPoint` über den ganzen Stapel.
Ein Nachbargebiet an der gemeinsamen Grenze zählt nicht als Störung, Schmuck
schon.

Und der **Rauchtest** spielt jetzt jede Ebene mit beiden Profilen: 16
Kombinationen, jedes Mal eine richtige Antwort — beim Tippen bewusst der
Alias.

---

## Offen

| | Was | Wer |
|---|---|---|
| O4 | **BKG VG250.** Der Host ist durch die Netzrichtlinie gesperrt (403 auf CONNECT). Die Bundesländer stehen auf Natural Earth 1:10m — gut genug zum Entwerfen, zu grob zum Ausliefern. Umstellung sind zwei Zeilen. | ihr oder Freigabe |
| — | **Pages einschalten**: Settings → Pages → Source = *GitHub Actions*. Ein Klick, und die Auslieferung läuft. | ihr |
| — | **Die Entwürfe und den Prototyp auf dem iPad ansehen.** Kein Tor läuft auf iOS. | ihr |
| — | Schriftentscheidung: Plus Jakarta Sans oder Nunito, am Gerät | ihr |
| — | M1: Vite und Svelte. PWA, Service Worker und Ablage stehen bereits. | ich |
| D28 | `ansicht` auf dem Runner: nur im festgenagelten Playwright-Abbild sinnvoll, samt dort aufgenommener Vorbilder | ich |
| — | Leitner, Elternbereich, Protokoll | ich |
