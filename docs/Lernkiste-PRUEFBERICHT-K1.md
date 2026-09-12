# Prüfbericht zu Konzept K1

Vollständiger Durchgang durch `Lernkiste-KONZEPT.md`, Fassung K1, auf
Sachfehler, Lücken und Widersprüche. Ergebnis: **25 Befunde** — 5 Fehler,
6 Inkonsistenzen, 14 Lücken. Alle sind in K2 behoben; dieser Bericht bleibt
stehen, damit die Änderungen nachvollziehbar sind und nicht ein zweites Mal
gefunden werden müssen.

**Wie geprüft wurde.** Vier Durchgänge, jeder mit einer anderen Brille:
(1) *Sachlich* — jede Zahl, jede Liste, jeder Eigenname gegen eine Quelle.
(2) *Innere Widerspruchsfreiheit* — jede Zusage gegen jede andere Zusage.
(3) *Vollständigkeit* — für jede zugesagte Sache: steht da, woher sie kommt,
wer sie baut, wer sie prüft? (4) *Durchspielen* — jede der vier Ebenen im Kopf
einmal zu Ende gespielt, mit beiden Profilen.

Der vierte Durchgang hat die schwersten Befunde geliefert (L1, L7, L8, L9).
Kein Dokumentenabgleich hätte sie gefunden — man muss das Spiel im Kopf
spielen, sonst fällt nicht auf, dass eine Stadt keine Fläche hat.

---

## Fehler — sachlich falsch

### F1 · Kuba steht in Nordamerikas Fünferliste, gehört aber auf Platz 7

K1 führte: USA · Mexiko · Kanada · Guatemala · **Kuba**.

Richtig nach Einwohnerzahl (Stand 2025):

| | Land | Einwohner |
|---|---|---|
| 1 | USA | 340,0 Mio |
| 2 | Mexiko | 128,5 Mio |
| 3 | Kanada | 38,8 Mio |
| 4 | Guatemala | 18,1 Mio |
| **5** | **Haiti** | **11,72 Mio** |
| 6 | Dominikanische Republik | 11,33 Mio |
| 7 | Kuba | 11,19 Mio |

K1 hatte Kuba „aus Wiedererkennbarkeit" vorgezogen und das als bewusste
Abweichung deklariert — aber mit der falschen Begründung, Kuba liege
*knapp hinter* Haiti. Tatsächlich liegen zwei Länder dazwischen. Eine
Abweichung, deren Begründung nicht stimmt, ist keine Abweichung, sondern ein
Fehler.

**Behoben in K2, Kapitel 4.** Haiti steht auf Platz 5. Die
Bekanntheitsfrage ist getrennt gelöst (siehe Kapitel „Neue Festlegungen").

### F2 · Die Ranglisten hatten kein Stichjahr und keine Quelle

Ranglisten verschieben sich: Indien hat China 2023 überholt, Äthiopien und
Ägypten liegen 17 Millionen auseinander und wachsen unterschiedlich schnell,
Haiti und die Dominikanische Republik trennen 0,4 Millionen. Eine Liste ohne
Stichjahr veraltet lautlos — und niemand merkt, wann.

**Behoben in K2.** Jeder Datensatz trägt `standJahr` und `quelle`; das Tor
`inhalt` schlägt an, wenn der Stand älter als drei Jahre ist. Das ist
dieselbe Vorkehrung, die Towerfront für die Fassungsnummer hat.

### F3 · Ebene 4 hat drei entartete Fälle, die K1 nicht kannte

Berlin und Hamburg **haben keine Landeshauptstadt** — Stadt und Land sind
dasselbe. Bremen ist ein Zwei-Städte-Staat aus Bremen und Bremerhaven;
dort ist Bremen die Landeshauptstadt.

Ein Spiel, das sechzehnmal „Wie heißt die Landeshauptstadt?" fragt, stellt
dreimal eine Frage, die sachlich schief ist — und lehrt bei drei von sechzehn
Aufgaben etwas Falsches über den deutschen Staatsaufbau.

**Behoben in K2, Kapitel 4.** Ebene 4 besteht aus **13 Rätseln und einer
vorgeschalteten Lerneinheit „Die drei Stadtstaaten"**. Aus dem Fehler wird
der beste Lerninhalt der Ebene.

### F4 · Die Begründung für Antarktika war falsch

K1 begründete Antarktika in Fionas Einstiegsrunde mit dem „unverwechselbaren
Umriss". Das stimmt nur in polarer oder flächentreuer Darstellung. In den
üblichen Weltkarten wird Antarktika zu einem verzerrten Band am unteren
Bildrand — es ist dort gerade **nicht** formtypisch, sondern die am
schwersten wiederzuerkennende Fläche von allen.

Das Ergebnis („Antarktika bleibt Teil der sieben Kontinente") bleibt richtig,
aber aus einem anderen Grund. Die falsche Begründung hätte in M3 zu einer
falschen Aufgabenreihenfolge geführt.

**Behoben in K2, Kapitel 4.** Fionas Einstiegsrunde ist neu zusammengesetzt;
Antarktika kommt erst in der dritten Runde, mit eigenem Satz.

### F5 · „Die CSP verbietet ausgehende Verbindungen technisch" ist zu weit gefasst

Die Content-Security-Policy regelt Ressourcen, die der Browser **für das
Dokument** lädt: Skripte, Bilder, Schriften, `fetch`, WebSockets. Die
Web Speech API ist nichts davon. Sie ist eine Browser&shy;funktion, die auf iOS
intern mit Apples Servern spricht — **die CSP erfasst sie nicht und kann den
Audio-Upload nicht verhindern.**

In K1 stand die CSP als Beleg für „nichts verlässt das Gerät", unmittelbar
unter einer Tabelle, in der als einzige Ausnahme genau die eine Sache stand,
die sie nicht abdeckt. Das ist der Widerspruch, den ein Datenschutz-Audit
zuerst findet.

**Behoben in K2, Kapitel 12.** Die CSP wird als das beschrieben, was sie
leistet — sie schließt Nachladen, Telemetrie und Fremdressourcen aus. Für den
Sprach-Upload gibt es genau eine wirksame Maßnahme, und die ist kein
technischer Riegel, sondern ein Schalter: **der Sprachmodus ist per Vorgabe
aus.**

---

## Inkonsistenzen — Zusagen, die sich widersprechen

### I1 · Kapitelnummerierung stimmte zwischen Markdown und Lesefassung nicht überein

Der Text verwies auf „Kapitel 13" für die offenen Punkte; in der Lesefassung
war das Kapitel 14, weil dort der Inhalt ein eigenes Kapitel bekommen hatte.
Sämtliche Querverweise zeigten um eins daneben.

**Behoben in K2.** Beide Fassungen haben dieselben sechzehn Kapitel in
derselben Reihenfolge.

### I2 · „53 Gebiete" zählte drei Ebenen, das Dokument hatte vier

7 + 30 + 16 = 53. Mit Ebene 4 sind es 69. Die Zahl stand direkt neben
„4 Ebenen".

**Behoben in K2:** 69 Gebiete, und die Zahl wird von `inhalt` aus den Daten
gezählt statt geschrieben.

### I3 · „17 Tore" gegen die tatsächlich geforderte Kette

Die Kette listete 17 Namen. Der Text forderte an anderer Stelle zusätzlich ein
CSP-Tor („Ein Tor prüft, dass die CSP im ausgelieferten HTML steht") und
beschrieb Gegenproben als eigenen Lauf, ohne sie in der Kette zu führen.

Das ist wortwörtlich der Fehler, vor dem Towerfronts eigener
Auslieferungsplan im Kommentar warnt: *„Hier stand elf, während die Kette
schon vierzehn Schritte hatte."*

**Behoben in K2, Kapitel 11.** Die Kette hat **19** Schritte, `csp` und
`proben` sind darin geführt — und das Tor `doku` zählt die Schritte der Kette
gegen die Zahl in der Prosa. Eine Zahl, die niemand prüft, veraltet.

### I4 · Fionas Profil sperrte Ebene 2 ohne Begründung

`ebenenFrei: [1, 3]` gab ihr Kontinente und Bundesländer, aber keine Länder.
Ebene 2 ist nicht schwerer als Ebene 3 — sie hat nur mehr Gegenstände, und
die Portionierung ist bereits über `kandidatenMax` geregelt.

**Behoben in K2, Kapitel 9.** Beide Profile haben alle vier Ebenen offen. Die
Schwierigkeit steuert die Dosierung, nicht eine Sperre.

### I5 · „Offline funktioniert vollständig" gegen „Spracherkennung braucht Netz"

Beides stand in K1. Für Fiona ist Sprache der *Haupt*weg — ohne Netz fällt für
sie also der halbe Betrieb weg, und das stand nirgends.

**Behoben in K2, Kapitel 6.2 und 11.** Ohne Netz fällt der Sprachmodus
automatisch und sichtbar auf Stufe C zurück. Das ist eine Regel, kein
Nebeneffekt, und das Tor `offline` prüft sie.

### I6 · Töne und Aufkleber waren zugesagt, hatten aber keine Herkunft

Das Lizenzkapitel deckte Karten ab. Klänge und die Aufkleber des
„Forscherbuchs" sind im Motivationskapitel fest zugesagt — ohne Quelle, ohne
Lizenz, ohne Werkzeug. Bei Towerfront ist der Bildvorrat der aufwendigste
Teil des ganzen Projekts; hier stand er als Nebensatz.

**Behoben in K2, Kapitel 5.** Beides wird **erzeugt statt beschafft**: Klänge
aus dem WebAudio-Oszillator (keine Datei, keine Lizenz, wenige hundert Byte
Code), Aufkleber aus dem Umriss des Gebiets selbst. Der Aufkleber für Italien
*ist* Italien. Das ist nicht nur billiger, es ist auch didaktisch besser.

---

## Lücken — was fehlte

### L1 · Ebene 4 bricht das Datenmodell — schwerster Befund

`Gebiet` hat `pfad: string`, das Tor `geo` verlangt „Fläche > 0", die
Treffererkennung arbeitet auf Flächen. **Eine Stadt ist ein Punkt.** Ebene 4
war in K1 fest zugesagt und im Modell nicht vorgesehen — weder Zeichnung noch
Treffer noch Tor hätten funktioniert.

Aufgefallen erst beim Durchspielen, nicht beim Lesen.

**Behoben in K2, Kapitel 3 und 4.** `Gebiet` bekommt `art: 'flaeche' |
'punkt'`, und Ebene 4 wird als **Paarbildung** gebaut: Der Stadtname wird auf
die *Fläche* des Bundeslands gezogen, nicht auf einen Punkt. Damit bleibt die
Mechanik überall dieselbe, der Lerninhalt ist genau der gefragte, und der
Stadtpunkt erscheint nach der richtigen Antwort als Zugabe — da lernt das
Kind die Lage gleich mit.

Die Alternative (Punkte auf der Karte treffen) wurde verworfen: Berlin und
Potsdam liegen 25 km auseinander, Bremen und Hamburg 95 km. Auf einem iPhone
quer sind das wenige Bildpunkte — die 44-Punkte-Regel wäre nicht einzuhalten.

### L2 · Kontinentgrenzen sind eine Entscheidung, und die Pipeline traf sie stillschweigend

Natural Earth ordnet im Feld `CONTINENT` **Russland vollständig Europa** zu
und die **Türkei vollständig Asien**. Ein naives `CONTINENT == 'Europe'`
erzeugt ein „Europa", das bis Wladiwostok reicht — und Fiona lernt einen
Umriss, den keine Schulkarte zeigt.

**Behoben in K2, Kapitel 5.** Die Klipp-Regel steht ausdrücklich in der
Pipeline: Europa endet am Ural und am Kaukasus, Nord- und Südamerika trennen
sich an der Grenze Panama/Kolumbien, Grönland gehört zu Nordamerika, Island
zu Europa, der Sinai zu Asien. Ein Tor prüft, dass jede Klippkante gesetzt
ist — sonst wandert sie beim nächsten Datenstand still zurück.

Nebenbefund, erfreulich: Die Quelle ordnet die Türkei ohnehin Asien zu. Die
pädagogische Entscheidung aus K1 und die Datenquelle sagen dasselbe — die
Länderzuordnung braucht also gar keine Sonderregel, sondern nur einen Satz:
*Ein Land gehört dem Kontinent, dem die Quelle es zuordnet.* Nachprüfbar
statt willkürlich.

### L3 · Vite `base` und die PWA-Pfade auf einem GitHub-Pages-Unterpfad

Die Seite liegt unter `/lernkiste/`, nicht auf der Wurzel. Ohne
`base: '/lernkiste/'` zeigen alle Asset-Pfade auf `/` und die App bleibt
weiß. `start_url`, `scope`, `apple-touch-icon` und die Reichweite des Service
Workers müssen mitziehen — sonst startet das Symbol vom Startbildschirm in
Safari statt im Vollbild, oder der Offline-Betrieb greift nicht.

Das ist der häufigste Grund, warum eine PWA auf GitHub Pages beim ersten
Anlauf nicht läuft. In K1 stand es nicht.

**Behoben in K2, Kapitel 13**, samt Tor `pwa`, das die Pfade gegen `base`
prüft.

### L4 · Kein Tor läuft je auf dem Zielgerät — und K1 verschwieg das

Playwright fährt Chromium mit iPhone-*Emulation*. Das ist eine andere
Rendering-Engine, ein anderer Ereignisstapel und ein anderes
Speicherverhalten als Safari auf iOS. In K1 stand „iPhone quer, iPhone hoch,
iPad" — das liest sich wie eine Gerätemessung.

Genau diese Verwechslung hat Towerfront fünf Runden gekostet, zuletzt beim
Kartenwechsel, der in Node gemessen um den Faktor zehn danebenlag.

**Behoben in K2, Kapitel 11.** Das Tor heißt, was es ist. Und daraus folgt
eine Regel: *Kein Tor läuft auf iOS. Deshalb ist die Gerätesichtung Teil
jeder Abnahme* — sie steht bei M0, M3, M4, M5 und M6 ausdrücklich im
Abnahmekriterium.

### L5 · Die Schriftart für eine Leseanfängerin fehlte

In der 1. Klasse lernt Fiona bestimmte Buchstabenformen. Die meisten
Standardschriften setzen ein **zweistöckiges „a"** und ein **„g" mit
Unterschlinge** — beides sieht anders aus als das, was sie gerade schreiben
lernt. Ein Kind, das gerade Buchstaben aufbaut, an zwei Formen desselben
Buchstabens zu gewöhnen, ist unnötige Reibung.

**Behoben in K2, Kapitel 10.** Der Spielinhalt wird in **Andika** gesetzt —
eine Schrift, die ausdrücklich für Leseanfänger entworfen wurde, mit
einstöckigem „a" und „g", offen lizenziert. Sie wird mitgeliefert, nicht von
einem CDN geladen: sonst wäre sie die einzige ausgehende Verbindung im ganzen
Programm. Auf das Größenbudget schlägt sie mit rund 40 KB.

### L6 · `navigator.storage.persist()` wurde nie angefordert

Ohne die Anforderung gilt der Speicher als „best effort" und darf vom System
geräumt werden. Ein Aufruf, eine Zeile, und das Risiko sinkt spürbar.

**Behoben in K2, Kapitel 12**, samt einer ehrlichen Anmerkung: die
Anforderung kann abgelehnt werden, und ob sie greift, misst M0.

### L7 · Ebene 2 hat für Australien und Antarktika keine Gegenstände

Australien ist beauftragt ausgenommen, Antarktika hat keine Länder. In K1
stand das als Randnotiz — aber nicht, was passiert, wenn ein Kind dort
hintippt. Eine Sackgasse ohne Rückmeldung ist für eine Sechsjährige das Ende
der Sitzung.

**Behoben in K2, Kapitel 4.** Beide Kontinente sind auf Ebene 2 sichtbar,
aber erkennbar kein Ziel, mit einem gesprochenen Satz statt einer Sackgasse:
*„In der Antarktis wohnt niemand — hier gibt es keine Länder."* Aus der Lücke
wird eine Antwort.

### L8 · Bei Ebene 2 fehlte die Regel, was neben den fünf Zielländern zu sehen ist

Zeigt man nur fünf Umrisse, lernt das Kind eine Karte, die es nicht gibt —
und kann durch Ausschluss raten statt zu wissen.

**Behoben in K2, Kapitel 4.** Der ganze Kontinent wird gezeichnet, alle
Länder mit ihren Grenzen; die fünf Ziele sind hervorgehoben, der Rest liegt
ruhig daneben. Raten durch Ausschluss ist damit ausgeschlossen, und die Karte
stimmt.

### L9 · Der Ablenker-Vorrat war nicht definiert — dabei liegt dort der Lernwert

Bei den Landeshauptstädten sind die **falschen** Antworten das Eigentliche.
Fünf Bundesländer haben eine Hauptstadt, die *nicht* ihre größte Stadt ist —
und genau da sitzt der Irrtum, den fast jeder Erwachsene teilt:

| Bundesland | Hauptstadt | die Falle |
|---|---|---|
| Hessen | Wiesbaden | Frankfurt am Main |
| Nordrhein-Westfalen | Düsseldorf | Köln |
| Sachsen | Dresden | Leipzig |
| Sachsen-Anhalt | Magdeburg | Halle (Saale) |
| Mecklenburg-Vorpommern | Schwerin | Rostock |

Ohne diese fünf Ablenker ist Ebene 4 trivial; mit ihnen ist sie der wertvollste
Teil des ganzen Spiels.

**Behoben in K2, Kapitel 4.** `ablenker: string[]` gehört ab jetzt zum
Datensatz, das Tor `inhalt` verlangt für jedes Gebiet auf Ebene 4 mindestens
einen — und für die fünf Fallen namentlich den richtigen.

### L10 · Der Sprachkorpus für das Tor `vergleich` war zirkulär

K1 forderte 90 % Trefferquote gegen einen Korpus, den dieselbe Hand erfindet,
die den Abgleich einstellt. Wer Prüfling und Prüfer zugleich ist, misst sich
selbst — und das Tor bezeugt die Sache, ohne sie je geprüft zu haben. Das ist
Regel 13 dieses Projekts, angewandt auf sich selbst.

**Behoben in K2, Kapitel 11.** Der Korpus wird in zwei Hälften geteilt: eine
**erfundene** Hälfte zum Einstellen und eine **eingefrorene** Hälfte aus
echten Aufnahmen von Fiona, die erst *nach* dem Einstellen gefahren wird und
nie zum Nachjustieren dient. Die zweite Zahl ist die, die zählt. Vor M4 gibt
es sie nicht — also gilt bis dahin auch keine 90 %.

### L11 · Datenschutz bei öffentlichem Repository war nicht durchdacht

Ist die Seite öffentlich erreichbar, können fremde Kinder sie benutzen. Dann
ist die Freigabe des Sprachmodus keine Entscheidung *dieser* Eltern mehr.

**Behoben in K2, Kapitel 12.** Der Sprachmodus ist per Vorgabe aus und wird
im Elternbereich mit einem Satz eingeschaltet, der sagt, wohin die Aufnahme
geht. Bei öffentlicher Erreichbarkeit steht derselbe Satz zusätzlich beim
ersten Start. Das ist unabhängig von der Entscheidung öffentlich/privat
richtig — es kostet nichts und macht die Ausnahme sichtbar.

### L12 · Es gab keinen Bildschirmablauf

Sechs Bildschirme waren benannt. Wie man von einem zum nächsten kommt und
wieder zurück, stand nirgends — und der Zurückweg ist bei einer
Sechsjährigen keine Kleinigkeit: sie verlässt jeden Bildschirm mehrmals
versehentlich.

**Behoben in K2, Kapitel 9**, mit einer Regel, die die eiserne Regel 6 aus
Towerfront übernimmt: Die Sichtbarkeit jedes Bedienteils wird **abgeleitet**,
nicht geschaltet.

### L13 · Die Kartenfarben fehlten — obwohl die Zugangsregel sie fordert

„Farbe trägt nie allein Bedeutung" stand im Barrierefreiheitskapitel, wurde
für die Karte selbst aber nirgends eingelöst. Und bei 16 aneinandergrenzenden
Bundesländern ist Nachbarschaftsfärbung kein Schönheitsthema: gleichfarbige
Nachbarn verschmelzen optisch zu einer Fläche.

**Behoben in K2, Kapitel 5.** Bundesländer werden mit **vier Farben** so
eingefärbt, dass keine zwei Nachbarn dieselbe tragen — der Vier-Farben-Satz
ist hier buchstäblich das richtige Werkzeug. Die sieben Kontinente bekommen
eine Palette, die unter Rot-Grün-Sehschwäche unterscheidbar bleibt; Länder
innerhalb eines Kontinents sind Abstufungen seiner Farbe. Ein Tor rechnet
den Kontrast benachbarter Flächen nach.

### L14 · Der Arbeitstitel war nie als Entscheidung markiert

„Lernkiste" ist als Bezeichnung für Lernmaterial verbreitet. Bei einer
Familien-App ohne Vertrieb praktisch folgenlos — aber es sollte eine
Entscheidung sein und keine Gewohnheit, die sich nach zwanzig Dateinamen
nicht mehr ändern lässt.

**In K2 als offener Punkt O5 geführt.**

---

## Was der Durchgang bestätigt hat

Nicht alles war falsch. Diese Festlegungen haben die Prüfung unverändert
überstanden und sind damit belastbarer als vorher:

- **SVG statt Canvas** — die Treffererkennung auf Ebene 3 und 4 wäre auf
  Canvas der halbe Projektaufwand. Der Befund L1 hat das noch verstärkt: die
  Paarbildung auf Ebene 4 setzt Flächen-Treffererkennung voraus.
- **PWA statt nativer App** — nichts im Auftrag verlangt etwas, das eine PWA
  nicht kann, und der 90-Tage-Ablauf von TestFlight wäre bei einem
  Familienprojekt ein jährlich wiederkehrendes Ärgernis.
- **Eine Aufgabenlogik, drei Eingabegeber** — hat den härtesten Test bestanden:
  Ebene 4 hat die Aufgaben*form* geändert (Paar statt Zuordnung), ohne die
  Fuge anzutasten.
- **Der geschlossene Kandidatenabgleich beim Sprechen** — durch L10 nicht
  entkräftet, nur ehrlicher gemessen.
- **M0 vor allem anderen** — durch die Prüfung eher wichtiger geworden: L3 und
  L6 sind zwei weitere Dinge, die dort auffallen müssen und nirgendwo sonst
  billig auffallen.

## Was diese Prüfung nicht leisten konnte

Drei Dinge bleiben offen und sind mit keinem Dokumentendurchgang zu klären:

1. **Ob die Spracherkennung auf den echten Geräten trägt.** Klärt M0.
2. **Ob die Aufgabenmenge je Sitzung stimmt** — acht Aufgaben für Fiona sind
   geraten, nicht gemessen. Klärt die Gerätesichtung nach M3.
3. **Ob die Kinder es freiwillig ein zweites Mal öffnen.** Klärt nichts außer
   zwei Wochen Wirklichkeit.
