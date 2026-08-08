# Towerfront — Schleifenbetrieb

*Version 1.0 · 08.08.2026 · wie wir arbeiten, ohne dass du jede Runde
einzeln freigibst*

---

## Das Problem, das die Schleife löst

Bisher lief es so: Ich baue etwas, ich beurteile es selbst, du schaust drauf.
Der mittlere Schritt ist die Schwachstelle — **wer gebaut hat, ist ein
schlechter Prüfer für die eigene Arbeit.** Diese Sitzung hat das mehrfach
gezeigt: drei von zehn Fehlerinjektionen scheiterten an meiner eigenen Probe,
nicht am Tor. Zweimal habe ich eine Messung repariert und dabei die Messung
kaputt gemacht. Und elf von 57 Befunden kamen erst, als du ein Bildschirmfoto
geschickt hast.

Die Schleife trennt deshalb drei Rollen — und die Trennung ist nicht
Stilfrage, sondern in Werkzeugen festgeschrieben.

---

## Die drei Rollen

### Arbeiter

Setzt genau **ein Ziel** um. Er darf alles ändern, aber er entscheidet nicht,
ob es fertig ist. Sein Ergebnis ist ein geänderter Baum, sonst nichts.

Regeln:
- Ein Ziel je Durchgang. Kein „und nebenbei noch".
- Jede Änderung muss durch ein Tor gedeckt sein oder ein neues Tor mitbringen.
- Wer eine Prüfung ändert, muss sie gegenproben: Fehler einbauen, sehen ob sie
  anschlägt, zurücknehmen.

### Prüfer

Führt aus, was sich rechnen lässt — `npm run schleife`. Er urteilt nicht, er
misst. Ergebnis: `schleife/bericht.md` mit Torausgabe, Kennzahlen,
Änderungsumfang und Aufnahmen.

### Kritiker

Neu seit v51, und der Grund dafür ist unangenehm: **In v50 lag die Turmleiste
quer über der Landkarte, man kam nicht ins Spiel — und alle vierzehn Tore
waren grün.** Kein einziges davon stellt die Frage, die ein Käufer als erstes
stellt.

Der Kritiker nimmt den Blick eines Testers ein und bewertet in fünf
Kategorien mit Gewicht:

| Kategorie | Gewicht |
|---|---|
| Einstieg und Bedienung | 20 % |
| Spielmechanik und Tiefe | 30 % |
| Balance und Fortschritt | 20 % |
| Grafik und Präsentation | 20 % |
| Technik und Stabilität | 10 % |

**Ziel: über 90.** `npm run kritik` rechnet den messbaren Teil aus und bricht
ab, wenn die Wertung darunter liegt.

**Und der zweite Teil ist der wichtigere.** Das Werkzeug listet vier Fragen
auf, die es nicht beantworten kann, jede mit der Aufnahme, an der sie zu
beantworten ist:

```
[einstieg]       Findet sich jemand ohne Erklärung im Menü zurecht?
[spiel]          Fühlt sich eine Welle spannend an oder zäh?
[praesentation]  Wirkt das Feld wie ein Ort oder wie ein Diagramm?
[praesentation]  Passen Menü und Spiel stilistisch zusammen?
```

**Diese vier Bilder müssen angesehen werden. Jede Runde. Vom Arbeiter selbst,
bevor geliefert wird.** Eine Wertung ohne diesen Teil ist wertlos — der
Beweis steht oben: 96 von 100 für ein Spiel, das sich nicht starten ließ.

### Inspektor

**Sieht nur den Bericht und die Bilder. Nicht den Code, nicht die Absicht.**
Das ist der Kern: Er beurteilt das Ergebnis, nicht die Erzählung darüber.

Er entscheidet zwischen:

| Urteil | Bedeutung |
|---|---|
| **Freigabe** | Ziel erreicht, Tore grün, Bilder in Ordnung → einchecken, Marke setzen |
| **Neue Schleife** | Etwas fehlt oder stört → benennen, zurück an den Arbeiter |
| **Rückbau** | Der Weg ist falsch → auf die letzte Marke zurück, Befund festhalten |

---

## Was den Ausschlag gibt

**Angesehen** (entscheidet nur der Blick, und er ist Pflicht):

- Die vier Aufnahmen aus `npm run kritik`, jede einzeln.
- Wer liefert, ohne sie angesehen zu haben, liefert blind.

**Rechenbar** (entscheidet das Werkzeug, nicht ich):

- Alle Tore grün. Ein rotes Tor ist keine Verhandlung.
- Der Baum hat sich geändert — sonst gibt es nichts abzunehmen.
- Aufnahmen sind entstanden — sonst ist der Inspektor blind.

**Sichtbar** (entscheidet nur der Blick auf die Bilder):

- Wirkt es aus einem Guss?
- Ist alles lesbar, was man treffen können muss?
- Liegt etwas im Weg?
- Sieht das Feld nach einem Ort aus oder nach einem Diagramm?

Diese vier Fragen hat noch nie ein Tor beantwortet.

---

## Der entscheidende Baustein: die Bildabnahme

Das war der fehlende Teil, und ohne ihn wäre die Schleife eine Attrappe. Seit
v40 zeichnet `npm run bilder` das Spiel **mit derselben Zeichenschicht wie im
Browser** auf eine Fläche, die PNG ausgeben kann — echte Bildpunkte, kein
Browser, keine Fremdsteuerung.

Acht Aufnahmen je Durchgang:

```
start        das leere Feld, Handy quer
bauauswahl   Turmsorte gewählt, grüne Fläche, Geist unter dem Finger
welle8       mittleres Gefecht
welle15      Endwelle, volles Feld
laubschlucht / frostspalte   die anderen Karten
breit        Schreibtischformat 1440 x 780
nah          hineingezoomt auf einen ausgebauten Turm
```

Die eingebetteten Bilder werden dabei wirklich dekodiert — sonst zeigte die
Aufnahme die gemalten Ersatzformen und damit ein anderes Spiel als das echte.
Genau der Fehler, den eine Bildabnahme verhindern soll.

---

## Ein Durchgang, wie er abläuft

```
Du    Ziel setzen, mit Abnahmekriterium
      "Die Karten sollen aus einem Guss wirken. Abnahme: kein sichtbarer
       Bruch zwischen Untergrund und Weg auf allen drei Karten."

1     Arbeiter   baut
2     Prüfer     npm run schleife
3     Inspektor  liest den Bericht, sieht die Bilder an
4     Urteil     Freigabe → einchecken, Marke, weiter
                 Neue Schleife → Befund benennen, zurück zu 1
                 Rückbau → git checkout, Befund festhalten
```

Höchstens **drei Schleifen je Ziel**. Danach ist nicht die Ausführung das
Problem, sondern das Ziel oder der Ansatz — dann kommt es zurück zu dir. Diese
Sitzung hat das viermal gebraucht (T15 dreimal, T17 einmal), und jedes Mal war
die vierte Runde die, in der der eigentliche Befund kam.

---

## Was du festlegst

Nur zwei Dinge je Auftrag:

**Das Ziel** — in einem Satz, in Wirkung formuliert, nicht in Umsetzung.
Nicht „mach den Weg schmaler", sondern „der Weg soll das Bild nicht
beherrschen".

**Das Abnahmekriterium** — woran man sieht, dass es erreicht ist. Am besten
etwas Messbares; wenn es nichts Messbares gibt, ein Bild und ein Satz.

Alles Übrige läuft ohne dich. Du bekommst am Ende den Bericht, die Bilder und
eine Liste dessen, was unterwegs gefunden wurde.

---

## Ein echter Durchgang zur Probe (v40)

Damit das nicht Theorie bleibt — der erste Lauf, den die Schleife selbst
gefunden hat. Ziel: *„Das Feld soll wie ein Ort wirken, nicht wie ein
Diagramm."*

Der Inspektor sah zum ersten Mal ein echtes Bild und meldete drei Dinge, die
in 39 Versionen kein Tor je bemerkt hatte:

1. **Der Weg beherrschte das Bild.** Ein Band von über hundert Pixeln Breite
   auf einem Feld von 1920 — als Zahl unauffällig, im Bild eine Nudel quer
   über den Bildschirm. Auf 62 % verschmälert.
2. **Unwegsames Gelände las sich als Fleck**, nicht als Fels. Es war eine
   halbdurchsichtige dunkle Fläche mit ein paar Punkten darin. Jetzt: Schatten
   darunter, dicht liegende Brocken, jeder mit Körper, heller Kante und
   Umriss. Ein Fels ist etwas, das man sieht — keine Schraffur.
3. **Der Kristall war zu klein** für das Ding, um das sich das ganze Spiel
   dreht. Um 40 % vergrößert, auf einen höheren Sockel gesetzt.

Und weil die Änderungen die Balance verschoben — schmalerer Weg heißt mehr
Baufläche —, hat der Prüfer sofort vier rote Tore gemeldet. Beim Nachziehen
kamen zwei weitere Befunde:

4. **Der Perk-Vergleich rechnete absolut.** „41 von 69 Kristall" galt als
   schlechter als „50 von 60", obwohl es der bessere Lauf ist. Dieselbe Falle
   wie schon dreimal in dieser Sitzung: eine Grenze, deren Bedeutung von einer
   anderen Einstellung abhängt. Jetzt normiert und über drei Bauverläufe
   gemittelt.
5. **Zwei Prüfungen widersprachen sich.** Die eine verlangte, dass der übliche
   Sieg *keine* drei Sterne gibt; die andere, dass drei Sterne irgendwo
   erreichbar sind. Zwei Regeln für dieselbe Sache aus verschiedenen
   Blickwinkeln. Die ältere ist entfallen.

Das ist die Schleife bei der Arbeit: Der Inspektor findet, was kein Tor sieht;
das Nachziehen deckt auf, was im Werkzeug schief liegt.
