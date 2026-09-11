# Referenzabgleich — Bauen und Prüfsteg (Bedienung)

Stand: v342 · 11.09.2026

**Nachgesehen in v342 — keine Zahl hat sich bewegt, und das ist die Aussage.**
`npm run uxtor` misst unverändert `zug` 7,9 · `ruhe` 13,1 · `bauwahl` 22,0 ·
`pruefsteg` 27,0 · `welle` 13,9 %. Die sieben Runden v336 bis v342 haben die
Bedienung nicht angefasst: sie sind Messgeräte (v336, v339, v340, v342) und
Torreparaturen (v337, v338, v341).

**Was offen bleibt, bleibt aus demselben Grund wie in v335:** H1 verlangt
höchstens 25 % bei offenem Turmmenü, gemessen 27,0 — die zwei Punkte liegen
als **N4M** im Verzeichnis, und beide gemessenen Wege dorthin kosten Inhalt,
nicht Ordnung. 17,8 % der Bahn unter der Bedienung stehen als **N4F** da.

**Nachgesehen in v335 — eine Zahl hat sich bewegt, und sie ist bezahlt.**
`npm run uxaudittor` misst `zug` 7,9 · `ruhe` 13,1 · `bauwahl` 22,0 ·
`pruefsteg` 27,0 · `teurer` 21,7 · **`welle` 13,9 %** (vorher 13,1). Die acht
Zehntel sind das Vorzeichenband der nächsten Welle aus v332 — `#dock` 8,3 →
9,2 —, und die Ratsche von 16 bleibt unberührt. Kein anderer Zustand hat sich
um ein Zehntel geändert.

**Und die Verdeckungsmessung hat in v334 einen blinden Fleck verloren.** Die
Zeilenmessung des Prüfstegs las sechs Wertezeilen mit **null Punkten Höhe** —
seit v316 ist die Liste am Turm zugeklappt, und null ist nie größer als die
Grenze. Sie war seitdem still, nicht grün. Sie klappt jetzt selbst auf (14
statt 0) und meldet eine leere oder flache Liste, statt über ihr grün zu
werden. **Das ist dieselbe Klasse wie B2 und H12 in diesem Dokument:** eine
Zusage über die Bedienung, die den Zustand nicht herstellt, in dem sie gilt,
misst den falschen.

**Nachgesehen in v328 — jede Zahl steht, wo sie in v321 stand.** `npm run
uxaudittor` misst unverändert `zug` 8,0 · `ruhe` 13,1 · `bauwahl` 22,0 ·
`pruefsteg` 27,0 · `teurer` 21,7 · `welle` 13,9 %, und die Ratschen stehen seit
v320 auf den heutigen Werten statt auf denen von v294.

**Sieben Runden ohne Bewegung sind hier eine gute Nachricht und keine
schlechte:** v322 bis v328 haben am Kristallbild, am Meteor, am Untergrund, am
Kartenstapel und an einer neuen Gegnerart gearbeitet — also überall dort, wo
ein Rückschritt in der Bedienung am ehesten unbemerkt passiert. Der Sanitäter
(v328) bringt zum Beispiel einen Ring und Fäden ins Bild; sie liegen auf dem
Spielfeld und nicht in der Bedienung, und die Zahlen sagen genau das.

**Was offen bleibt, ist unverändert N4M und N4F** — die letzten zwei Punkte
auf H1 und die 17,8 % der Bahn unter `#dock` und `#b-wave`. Beide sind in v320
gemessen und seitdem nicht angefasst.

**Nachgesehen in v321 — jede Zahl dieser Tabelle hatte sich bewegt, und zwar
nach unten.** Gemessen mit `npm run uxaudittor`, dasselbe Gerät, dieselbe
Auflösung:

| Zustand | v314 | **v321** | Ratsche |
|---|---|---|---|
| `zug` | 7,9 % | 7,9 % | 16 |
| `ruhe` | 15,5 % | **13,1 %** | **14** |
| `bauwahl` | 24,5 % | **22,0 %** | **23** |
| `pruefsteg` | 34,2 % | **27,0 %** | **28** |
| `teurer` | 24,2 % | **21,7 %** | **23** |
| `welle` | 15,5 % | **13,1 %** | **14** |

**Der Prüfsteg hat 7,2 Punkte verloren, und das Verhältnis darin ist die
Auskunft:** 1,3 kommen daher, dass das Menü an den Turm gewandert ist (v316,
H4), 3,3 daher, dass die Werte dort zuklappen, der Rest aus der Ruheleiste
darunter. **Der Ort kostet fast nichts, der Inhalt ist die Fläche.**

**Neu gemessen wird seit v320 auch, ob die Bedienung die RICHTIGE Fläche
nimmt** — zwei Leisten mit gleicher Prozentzahl können sehr verschieden
stehen. `feldVerdeckung` fragt am Bahnschlauch und an den Bauplätzen: 17,8 %
der Bahn liegen unter `#dock` und `#b-wave`. Das ist offen und steht als N4F.

**Nachgesehen in v307 — nachgefahren, nicht geglaubt: die Grenze aus v300
haelt, und der Kartenzug hat sie NICHT gesprengt.** Seit v303 liegt zwischen
zwei Wellen ein eigenes Band mit drei Karten (`#zug`). Gemessen mit
`npm run uxaudittor` auf demselben Geraet und in derselben Aufloesung:

| Zustand | gesperrt | Ratsche |
|---|---|---|
| `zug` (neu seit v303) | **7,9 %** | 16 |
| `ruhe` | 15,5 % | 16 |
| `bauwahl` | 24,5 % | 26 |
| `pruefsteg` | 34,2 % | 35 |
| `teurer` | 24,2 % | 26 |
| `welle` | 15,5 % | 16 |

Fuenf Schriftgroessen (8/10/12/15/17 px), keine Doppelungen, alle
Trefferflaechen ueber 44.

**Warum das nicht die Grenze aus v300 widerlegt.** Der Zug steht nicht NEBEN
der Bauleiste, sondern an ihrer Stelle: `setSpielansicht` blendet das Dock
aus, solange eine Karte zu ziehen ist. Beide zugleich sperren gemessen 21,7 %
gegen erlaubte 16 — jede fuer sich passt, beide nicht. Das ist dieselbe
Auskunft wie beim siebten Bauknopf, nur an einer anderen Stelle: **die Leiste
ist voll, und was dazukommt, muss etwas anderes ersetzen.**

Die Menuebilder aus v305 und v306 (Abschnittswahl, Kartenstapel) zaehlen hier
nicht mit und stehen absichtlich nicht in der Tabelle: sie sind Menue, und im
Menue ist keine Spielbedienung sichtbar (Regel 6). Abgenommen werden sie als
Aufnahmen (`menu-wahl`, `menu-stapel`).

**Nachgesehen in v300 — und die Bedienung hat ihre Grenze gefunden, gemessen
statt vermutet.** Mit einem SIEBTEN Bauknopf (dem Bannturm, v295) reissen
**alle vier** Zustaende zugleich: 16,3 / 27,0 / 35,0 / 16,3 % gegen die
Ratschen 16 / 26 / 35 / 16. Der Turm ist deshalb gebaut, gemessen und von
fuenf Zusagen gehalten - und steht nicht in `BAU_ORDER`. Das ist keine
Entscheidung ueber den Turm, sondern ueber diese Bedienung, und sie gehoert
dem Nutzer.

**Zwei Funde aus v298, beide vom BLICK und nicht von der Messung** (Regel 8,
und sie irrt in beide Richtungen):

* **Escape schloss die Bauwahl nicht.** `auswahlSchliessen` raeumt Turmauswahl
  und Sorte weg, aber nicht `buildAt` - und daran haengt die Wahl. Am
  Schreibtisch blieb sie offen, gleich wie oft man drueckte; auf dem Telefon
  schliesst sie ein Tipp auf Unbebaubares, dort faellt es nicht auf. Der
  Schreibtisch ist seit v122 der zweite unterstuetzte Weg, also ist das ein
  Fehler und kein Randfall.
* **Der Bauhinweis lag UNTER der Bauwahl.** Ein rotes „Weg" auf der Leinwand
  schien durch die halbdurchsichtige Leiste und ueberschnitt zwei Namen -
  „Prisma" las sich als „PrismaWeg". Er sagt dabei dasselbe wie die Wahl, die
  den Grund an jedem Turm nennt, fuer den er gilt: Regel 15 als
  Bedienoberflaeche. Vier Messungen an derselben Leiste hatten vorher null
  gemeldet, weil sie alle nach der LEISTE fragten und das Kaestchen nicht zu
  ihr gehoert.

**Die Preismarke des Wiederholungsaufschlags ist seit v298 zum ersten Mal
angesehen worden** - das UX-Audit hat dafuer einen fuenften Zustand („vierter
Turm derselben Art"): vier Bogentuerme stehen, der fuenfte kostet 61 statt 55
und traegt das Dreieck in Wahl und Leiste. Gemessen 24,2 % Belegung gegen die
24,5 % der gewoehnlichen Bauwahl - die Marke kostet keine Flaeche.

**Nachgesehen in v293:** unveraendert seit v286. Die Bedienung ist in v290
um einen sechsten Bauknopf gewachsen (die Werft), und das UX-Tor haelt: die
Belegung im Zustand "welle" steht auf 15,1 % gegen erlaubte 16, gleichauf mit
dem Ruhezustand. Die zwei fehlenden Bilder tragen seit v290 ihren
Anfangsbuchstaben (F und W) - ein Platzhalter, der zwei Bauwerke gleich
aussehen laesst, ist im Bauband eine Falle.


**Nachgesehen in v286 — und einer der sieben Punkte hat eine Messung
bekommen.** v286 hat den laufenden Strom aus dem Wellenknopf herausgeloest:
er stand als Kind IM Knopf, trug dessen Trefferflaeche mit (208 -> 317 Punkte
breit) und startete eine Welle, wenn man auf die ANZEIGE tippte. Ein Zustand,
der wie eine Handlung reagiert, ist genau die Klasse, die dieser Abgleich
meint. Gemessen: die Bedienung sperrte im Zustand „welle" 16,5 % des
Bildschirms gegen erlaubte 16, jetzt 15,1 % - gleichauf mit dem Ruhezustand.

Das Browsertor haelt seitdem drei Zusagen, die es vorher nicht hatte (der
Strom faengt den Finger nicht, der Knopf wird durch ihn nicht breiter, seine
rechte Kante rutscht nicht), und `uxaudit` schluesselt die gesperrte Flaeche
je Wurzel auf statt eine Gesamtzahl zu melden. Die uebrigen sechs Punkte
unveraendert.

**Nachgesehen in v279:** unveraendert. Die sieben Punkte haengen an `bauflaechetor` und dem Browsertor; an beiden hat seit v272 keine Runde etwas angefasst, und beide liefen im Runner-Lauf zu v278 gruen.

**Nachgesehen in v265:** unveraendert, alle sieben Punkte haengen an gruenen Toren.

**Nachgesehen in v258:** alle sieben Punkte hängen an `bauflaechetor` und dem
Browsertor, beide in jeder Torkette grün.

Schritt 0 des Durchgangs, nach `docs/Towerfront-SOLL-UND-BETRIEB.md` Teil 2.
Ausgelöst durch vier Befunde vom Zielgerät:

1. „Man sieht nicht exakt, wo der Weg endet, das ist nicht pixelgenau."
2. „Wenn man zuerst auf einen Turm klickt und dann ins Spiel, wird er direkt
   dorthin gebaut — es braucht noch eine Bestätigung oder
   Langzieh-Möglichkeit."
3. „Schriften im Turmmenü sind überlappend."
4. „Die Anordnung der einzelnen Menüpunkte muss besser werden, wie in anderen
   Tower-Defense-Spielen."

Ein Soll für die Bedienung gab es nie. Gebaut wurde sie in v30 und seither
an den Rändern nachgezogen; gemessen hat sie nie jemand.

---

## Was heute wirklich passiert — gemessen, nicht erinnert

**Wieviel vom Feld ist überhaupt bebaubar?** Gerastert über die ganze
Weltfläche, 5184 Punkte je Karte, gefragt wird `canPlace('arrow', x, y)` —
also der kleinste Turm, der beste Fall:

| Karte | bebaubar | Weg | Gelände | Rand |
|---|---|---|---|---|
| Spiralhain | **53,2 %** | 21 % | 15 % | 11 % |
| Ascheschlucht | **26,8 %** | 46 % | 15 % | 11 % |
| Frostspalte | **33,7 %** | 39 % | 16 % | 11 % |

**Auf der Ascheschlucht sind drei von vier Tippern daneben** — und nichts im
Bild sagt vorher, welcher der vierte ist. Das ist Befund 1 als Zahl.

**Was kostet ein Fehltipp?** In `input.ts` steht bei gesetzter Turmwahl:

```
if (s.buildChoice) { … if (ziel && s.build(ziel.x, ziel.y, choice)) … }
```

Ein einziger Tipp, und das Gold ist ausgegeben. Kein Zwischenschritt, kein
Zurück. Das ist Befund 2.

**Der Prüfsteg passt nicht in sich selbst.** Gemessen am ausgelieferten
Spiel, iPhone quer, Turm auf Stufe 2 mit Zweig: Inhalt **322 Punkte**,
Kasten **288**. Die Zielwahl-Reihe reicht von 310 bis 354, der Steg endet
bei 336 — **18 Punkte werden abgeschnitten**. Und der Name steht in einem
Kasten von 53 Punkten Breite, während „Scharfschütze" allein rund 90
braucht: er läuft über den Verkaufen-Knopf. Das sind Befunde 3 und 4.

---

## Schritt 1 — Referenz benennen

### Kingdom Rush — der Bauplatz ist ein Ding auf der Karte

Es gibt keine Turmleiste. Auf der Karte stehen **markierte Sockel**, und nur
dort kann gebaut werden. Ein Tipp auf einen Sockel öffnet einen Ring mit
vier Türmen samt Preis; ein zweiter Tipp wählt.

Was das tut: **die Frage „wo darf ich?" ist beantwortet, bevor man sie
stellt.** Man sucht keinen Platz, man wählt einen. Und der erste Tipp kostet
nichts — er öffnet nur. Ein Fehltipp ist folgenlos, weil der Tipp auf die
Karte gar keine Bauhandlung ist.

Der Preis dafür ist hart: die Sockel sind vom Spiel gesetzt, nicht vom
Spieler. Freies Bauen gibt es nicht.

### Bloons TD 6 — der Geisterturm hängt am Finger

Ein Turm wird in der Leiste gewählt, danach **hängt ein halbdurchsichtiges
Abbild am Finger**, mitsamt seinem Reichweitenkreis. Grün heisst „hier
geht es", rot heisst „hier nicht" — und das sieht man, **während** man
sucht, nicht danach. Gebaut wird beim Loslassen.

Was das tut: es macht die Regel sichtbar, ohne sie zu erklären. Der Spieler
lernt die Bauregeln, indem er den Finger bewegt. Und es gibt kein
Versehen: solange rot, passiert nichts.

### Plants vs. Zombies — die Zelle leuchtet, und die Wahl bleibt

Eine Samentüte wird gewählt, danach hebt sich **die Zelle unter dem Zeiger**
hervor. Ein Tipp auf eine ungültige Zelle tut nichts und **die Wahl bleibt
bestehen** — man versucht es einfach nebenan. Ein zweiter Tipp auf die
gewählte Tüte legt sie zurück.

Was das tut: der Fehlgriff ist kostenlos und man verliert dabei nicht den
Faden. Der Abbruch ist genauso leicht wie die Wahl.

### Und die Anordnung: alle drei trennen dieselben drei Dinge

Beim gewählten Turm zeigen alle drei getrennt: **wer ist das** (Name, Bild),
**was kann er** (Werte), **was kann ich tun** (Ausbauen, Verkaufen). Nie
liegen Handlung und Beschriftung in derselben Zeile, und der Verkaufen-Knopf
steht nirgends neben dem Namen — er ist die gefährlichste Handlung und
bekommt deshalb Abstand.

---

## Schritt 2 — Soll ableiten

| # | Soll | woher |
|---|---|---|
| B1 | **Wo gebaut werden darf, ist sichtbar, bevor man tippt.** Nicht als Text, als Fläche | alle drei |
| B2 | **Ein Tipp auf das Feld gibt nie Gold aus.** Er wählt, zeigt oder öffnet — bezahlt wird auf einer benannten Fläche | Kingdom Rush am strengsten; BTD6 über das Loslassen |
| B3 | Während der Suche sagt das Bild **hier ja / hier nein**, laufend und ohne Worte | BTD6, PvZ |
| B4 | Ein Fehlgriff **kostet nichts und verliert die Wahl nicht** | PvZ ausdrücklich |
| B5 | Der Abbruch ist so leicht wie die Wahl — dieselbe Geste rückwärts | PvZ |
| B6 | Im Prüfsteg sind **Name, Werte und Handlungen getrennt**; die gefährlichste Handlung liegt nicht neben dem Namen | alle drei |
| B7 | Was im Steg steht, **passt hinein**. Nichts wird abgeschnitten, nichts überlappt | Hygiene, keine Referenzfrage |

## Schritt 3 — Abstand messen

| # | Soll | heute | Abstand |
|---|---|---|---|
| B1 | Baufläche vorher sichtbar | **erledigt in v203, in v204 neu gezeichnet** — die Kante der verbotenen Fläche trägt einen dunklen Saum innen und einen hellen aussen, die Fläche selbst nur eine schwache Tönung. Die erste Fassung dunkelte sie gleichmäßig um 33 % ab; das las sich auf dem Telefon als „Straße plus Rand" und am Schreibtisch, wo man die **ganze** Welt sieht, als Vorhang über zwei Dritteln der Karte. Nicht abgetastet, sondern gezeichnet: Rand, Wegschlauch, Geländekreise und Türme sind ein Pfad, und seine Kante IST die Bauregel — gemessen 0,00 ‰ Abweichung gegen `warumNicht` auf allen drei Karten (`npm run bauflaechetor`) | keiner |
| B2 | Tipp gibt nie Gold aus | **erledigt in v202** — der Tipp öffnet jetzt dieselbe Turmwahl wie ein Tipp auf freies Feld, mit der gewählten Sorte hervorgehoben. Bezahlt wird auf einer benannten Fläche, die ihren Preis trägt | keiner |
| B3 | laufendes Ja/Nein | **erledigt in v203** — die Fläche aus B1 ist genau dieses laufende Ja/Nein: sie steht, solange eine Turmsorte gewählt ist, und ändert sich mit ihr, weil der Platzbedarf in der Kante steckt. Der Mörser braucht sichtbar mehr Boden als der Bogenturm | keiner |
| B4 | Fehlgriff kostenlos | **erledigt in v202** — er kostet nichts mehr, `bauHinweis` sagt warum, und die Wahl bleibt | keiner |
| B5 | Abbruch so leicht wie Wahl | **erfüllt** — ein zweiter Tipp auf denselben Turmknopf legt die Wahl zurück. Das gab es schon, es stand nur nirgends | keiner |
| B6 | Steg getrennt | **erledigt in v201** — Name, Werte, Handlungen getrennt; Verkaufen in der Fusszeile | keiner |
| B7 | passt hinein | **erledigt in v201, in v206 nachgezogen** — 286 Punkte Inhalt in 288, mit und ohne aufgeklappte Ziellogik. Gemessen wurde das bis v205 nur auf 844 × 390; auf einem hohen Fenster war der Steg 748 von 862 Punkten hoch und zog seine Wertezeilen auf 99 Punkte auseinander. Das Browsertor misst ihn jetzt auf beiden Wegen | keiner |

**Stand nach v203: alle sieben erfüllt.**
Beim ersten Abgleich waren vier ganz offen und zwei halb.

**Und ein Befund, der nicht im Soll stand.** B1 liess sich zuerst gar nicht
zeichnen: die Bauregel fragte den Abstand von der nächsten Wegstrecke, die
Wegbreite aber vom nächsten Abtastpunkt — zwei Stellen der Kurve, also ein
Gebiet ohne Form. Gemessen lag die schönstmögliche Zeichnung davon bis zu
**30,8 Weltpunkte** neben der Regel. Seit v203 ist die Regel ein Minimum über
Kreise (`LanePath.schlauchAbstand`), und die gezeigte Kante ist die
Vereinigung genau dieser Kreise. Die Frage „ist das Bild genau genug" hat
sich damit nicht verbessert, sondern aufgelöst.

**Beim ersten Abgleich:** vier von sieben ganz offen, zwei halb. Der Nutzer hat mit vier
Sätzen dieselbe Liste beschrieben, die diese Messung liefert — das ist kein
Zufall, sondern der Beleg, dass die Punkte zusammengehören und nicht
einzeln gefixt werden sollten.

## Schritt 4 — was das für den Auftrag heisst

**Die Reihenfolge folgt aus dem Abstand, nicht aus dem Aufwand.**

1. **B7 und B6 zuerst** — der Steg passt nicht in sich selbst, und das ist
   unabhängig von jeder Gestaltungsfrage falsch. Dazu ein Tor, das misst,
   ob der Inhalt hineinpasst und ob Text seinen Kasten verlässt: gemeldet
   hat es der Nutzer, gesehen hat es keine der 29 Prüfungen.

2. **B2 und B4** — die gefährliche Abkürzung. Es gibt heute zwei Wege zu
   bauen: über die Turmwahl am Bauplatz (zwei Tipper, sicher) und über die
   Turmleiste (ein Tipp, sofort bezahlt). Der zweite ist der, den der Nutzer
   gemeldet hat. Vorschlag: er setzt die Wahl weiterhin, aber der Tipp aufs
   Feld **setzt den Geisterturm** statt zu bauen; gebaut wird mit einem
   zweiten Tipp auf ihn. Damit gilt B2 auf beiden Wegen, und der schnelle
   Weg bleibt schnell.

3. **B1 und B3** — die Baufläche zeigen. Das ist die grösste Änderung und
   die mit dem grössten Ertrag: bei 26,8 % bebaubarer Fläche rät der Spieler
   heute drei von vier Mal. Technisch ist es ein Feld über der Karte, das
   einmal je Karte gerechnet und gebacken wird — `bakeTerrain` macht schon
   etwas Vergleichbares. Es darf **nur während des Bauens** sichtbar sein,
   sonst ist die Karte zugepflastert.

4. **B5** zuletzt, weil es klein ist: ein zweiter Tipp auf denselben
   Turmknopf legt die Wahl zurück.

**Was NICHT gebaut wird:** feste Bauplätze wie in Kingdom Rush. Das Spiel
ist seit v30 auf freies Bauen ausgelegt — Platzbedarf je Turmsorte,
Wegabstand, Gelände —, und der Genre-Abgleich zählt das als eigenen Reiz.
Die Referenz liefert hier das Soll für die *Sichtbarkeit*, nicht für die
Mechanik.


---

## Nachtrag v238–v244 — was seit dem letzten Stand dazugekommen ist

Die sieben Soll-Punkte B1–B7 stehen unverändert; keiner ist wieder aufgegangen.
Dazugekommen sind drei Dinge, die dieses Blatt betreffen:

**Die Bedienung ist ein Band am Rand** (v239, aus `Towerfront-AUDIT-HUD-UND-BILDSCHIRM.md`).
Der Turmknopf trägt seit v239 das **Bild** des Turms und seinen Preis, nicht
mehr Name, Preis und Rolle nebeneinander: 54 statt 86 Punkte breit, und erst
damit passen Einklappknopf, vier Türme, vier Fähigkeiten und der Wellenknopf
in **eine** Reihe. Der Satz oben, das Kingdom-Rush-Menü zeige „vier Türme samt
Preis", gilt damit hier genauso — nur am Rand statt am Sockel. Name und Rolle
stehen im Zeigerhinweis, in `aria-label` und in der Vorkauf-Karte, die
derselbe Knopf öffnet.

**Der Frühstart steht im Wellenknopf** (v243, F2). Er hatte bis dahin eine
eigene Zeile darunter, und die war auf dem Zielgerät `display: none` — die
Mechanik war auf dem iPhone unsichtbar. Jetzt schrumpft eine goldene Füllung
im Knopf mit dem Zeitfenster, die Zahl steht am Ende derselben Zeile, und der
Platz der Zahl bleibt stehen, wenn sie verschwindet (sonst springt der Knopf
unter dem Daumen um 36 Punkte weg).

**Der Verbund ist eine neue Auskunft im Prüfsteg** (v244, F4). Türme
verschiedener Art in 260 Weltpunkten Umkreis verstärken einander. Angezeigt
wird das an drei Stellen zugleich, und das ist Absicht: eine Zeile im Steg
(die auch „allein" sagt, wenn es keinen gibt — wer allein baut, soll sehen,
dass ihm etwas entgeht), der **angezeigte Schaden ist der wirkende**, und
Fäden im Bild zeigen zu genau den Türmen, die den Zuschlag tragen. Letzteres
ist dieselbe Sprache wie beim Schildträger und aus demselben Grund: eine
Wirkung zwischen zwei Figuren muss man sehen, nicht erschliessen.

**Ein achter Soll-Punkt fiel daraus ab — und ist in v245 erfüllt.** B2 verlangt,
dass bezahlt wird „auf einer benannten Fläche, die ihren Preis trägt". Für den
Verbund fehlte das Gegenstück: beim Wählen eines Bauplatzes stand nirgends,
welchen Zuschlag der Turm **dort** bekäme — und genau das ist die Entscheidung,
die die Regel erzeugt. Seit v245 trägt jeder Knopf der Turmwahl neben seinem
Preis, was diese Sorte an dieser Stelle bekäme, und die Fäden zeigen es schon
an der Bauvorschau. Damit steht die Auskunft **vor** der Entscheidung statt
danach.


---

## Nachtrag v247/v248 — das Turmmenü

**Der Prüfsteg endet an seinem Inhalt** (v247). Er spannte auf dem Zielgerät
über die ganze Fensterhöhe: 276 Punkte, während sein Inhalt 176 verlangt —
eine Zusage aus v205, die damals stimmte und seit den zweispaltigen Werten
(v239) nicht mehr. Gemessen 276 → 230 Punkte, Belegung 35,4 → 31,3 %.

**Das Bild des Turms steht im Kopf der Karte** (v247). Das Menü sitzt am
rechten Rand, der gemeinte Turm irgendwo auf dem Feld — die Zuordnung musste
bisher der Spieler leisten (B6 verlangt Trennung von Name, Werten und
Handlungen; wovon die Rede ist, stand nirgends).

**Die zwei Ausbauzweige sagen in Zahlen, worin sie sich unterscheiden**
(v248): Schaden je Sekunde und das Merkmal, in dem sie **voneinander**
abweichen. Der erklärende Satz bleibt auf dem Telefon ausgeblendet — dafür
fehlen 90 Punkte, und die Antwort darauf ist die Bildbestellung aus v250.
