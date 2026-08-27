# Lernkiste — Stand

Was gebaut ist, was gemessen ist, was offen bleibt. Ergänzt Konzept K3, den
Prüfbericht und das Grafik-Audit; ersetzt keines davon.

Stand: nach M0-Vorarbeit, M2, MG, dem Tor `ansicht`, **M3 bis M6** und der
Sichtrunde (Hervorhebung des Ziels, Naht in Antarktika).
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

## Offen

| | Was | Wer |
|---|---|---|
| O4 | **BKG VG250.** Der Host ist durch die Netzrichtlinie gesperrt (403 auf CONNECT). Die Bundesländer stehen auf Natural Earth 1:10m — gut genug zum Entwerfen, zu grob zum Ausliefern. Umstellung sind zwei Zeilen. | ihr oder Freigabe |
| — | Repository `lernkiste` anlegen, Pages auf GitHub Actions, Auslieferungsplan | ihr |
| — | **Die Entwürfe und den Prototyp auf dem iPad ansehen.** Kein Tor läuft auf iOS. | ihr |
| — | Schriftentscheidung: Plus Jakarta Sans oder Nunito, am Gerät | ihr |
| — | M1: Vite, Svelte, PWA, Service Worker, Ablage | ich, sobald das Repo steht |
| — | Beschriftungsfahnen zeichnen (14 von 16 brauchen eine) | ich |
| — | Leitner, Elternbereich, Protokoll | ich |
