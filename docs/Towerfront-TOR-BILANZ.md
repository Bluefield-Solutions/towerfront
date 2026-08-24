# Towerfront — Bilanz über alle Tore

*Messung: v153 · 24.08.2026 · vorherige Messung v31, siehe Abschnitt 7*

Die Frage dieser Runde ist dieselbe wie damals, nur mit 26 Toren statt zehn:
**Welches Tor verhindert Fehler, und welches erzeugt nur Arbeit?** Und die
Frage dahinter, die der Nutzer gestellt hat: *ist der Ablauf noch zielführend
oder bremst er?*

Nicht geschätzt — mit der Uhr gemessen, Tor für Tor, auf diesem Rechner.

> **Messstelle (Regel 12):** Entwicklungscontainer, Node 22, Chromium unter
> SwiftShader, kalte Läufe nacheinander. Die GitHub-Runner sind schneller:
> dort läuft dieselbe Kette einschließlich `npm ci` und Chromium-Installation
> in **163 s** im Mittel über zehn Läufe. Die Verhältnisse zwischen den Toren
> übertragen sich, die absoluten Zahlen nicht.

---

## 1. Die Antwort in drei Sätzen

**Die Torkette ist nicht das Problem.** 26 Tore in 264 s, und sechzehn davon
kosten zusammen keine 20 s.

**Zwei Tore fressen 55 % davon** — und beide rechnen bei jedem Lauf etwas neu
aus, das sich nur ändert, wenn neue Bilder kommen.

**Das Problem ist der Gegenproben-Lauf.** Er dauert **34 Minuten**, also das
Achtfache der Kette, und ich habe ihn bei jeder Version gefahren. Bei v153
habe ich zwei Tore angefasst; 140 der 142 Proben hatten nichts zu prüfen, was
sich geändert hätte.

---

## 2. Kosten der Torkette

| Tor | Laufzeit | Anteil |
|---|---|---|
| zielplattentor | 76,2 s | 29 % |
| bildtor | 69,4 s | 26 % |
| browser | 33,1 s | 13 % |
| sim | 21,8 s | 8 % |
| grafiktor | 13,1 s | 5 % |
| smoke | 13,0 s | 5 % |
| kartenwechsel | 5,5 s | 2 % |
| tsc | 4,0 s | 2 % |
| streifentor | 3,8 s | 1 % |
| guards | 3,5 s | 1 % |
| einbettungstor | 2,8 s | 1 % |
| bench-draw | 2,6 s | 1 % |
| build · doku · lesbarkeit · determinism | je 1,6–1,7 s | je 1 % |
| die übrigen zehn | je unter 1,3 s | zusammen < 4 % |
| **gesamt** | **264,1 s** | |

**Erster Befund, und er steht in `CLAUDE.md`:** dort steht „~90 s". Gemessen
sind es **264 s** — das Dreifache. Die Zahl ist mit der Kette gewachsen und
niemandem aufgefallen, weil kein Wächter Laufzeiten prüft. Dieselbe Familie
wie „Version v42", die 61 Versionen lang dastand.

---

## 3. Kosten der Gegenproben

142 Proben. Jede baut einen Fehler ein, fährt **ein ganzes Tor** und nimmt
zurück. Die Kosten sind deshalb `Anzahl × Laufzeit dieses Tors`:

| Tor | Proben | je Lauf | zusammen | Anteil |
|---|---|---|---|---|
| browsertor | 22 | 34,8 s | 765 s | 32 % |
| bildtor | 9 | 69,4 s | 624 s | 26 % |
| smoke | 46 | 13,0 s | 596 s | 25 % |
| zielplattentor | 2 | 76,2 s | 152 s | 6 % |
| guards | 19 | 3,5 s | 67 s | 3 % |
| die übrigen 44 Proben | | | 121 s | 5 % |
| **gesamt (Modell)** | **142** | | **2 374 s ≈ 40 min** | |
| **gemessen** | | | **34 min** | |

Das Modell trifft die Messung; die Lücke sind warme Zwischenspeicher im
laufenden Betrieb.

**Vier Tore machen 90 % der Probenzeit aus.** Und `browsertor` baut die
1,45-MB-Datei zweiundzwanzig Mal neu, nur um sie einmal zu laden.

---

## 4. Nutzen — schlägt jedes Tor an?

**Ja, alle 142 Proben schlagen an** (Lauf vom 24.08.2026, v153). Kein Tor ist
zahnlos. Das ist keine Kleinigkeit: es ist der Grund, warum diese Bilanz
überhaupt über Verschlankung reden darf statt über Reparatur.

Woher die Befunde kommen, über die ganze Projektgeschichte:

| Quelle | Befunde | Anmerkung |
|---|---|---|
| Simulation / Balance | 32 | die Werkbank — mehr als die Hälfte aller Erkenntnisse über das Spiel |
| Datenwächter | 12 | |
| **Bildschirmfoto, also der Mensch** | **11** | mehr als jedes einzelne Tor |
| Rauchtest | 5 | |
| Determinismus | 5 | |
| Zeichenmessung | 4 | |
| Autarkie | 2 | |

Dazu, was die jüngeren Tore in diesem Jahr gefunden haben: das Browsertor
fand beim ersten Lauf drei Fehler, die dreizehn andere Tore durchgelassen
hatten (v105), und einen Knopf hinter dem Prüfsteg (v149). `streifen` fand
eine Wellenvorschau, die 24 % des Schirms fraß (v151). Die neue Lichtmessung
fand einen Gleiter, der 66° von der eigenen Sonne beleuchtet ist (v153).

**Kein Tor ist zu streichen.** Die Frage ist nicht *ob*, sondern *wie oft*.

---

## 5. Was sich ändern sollte

### A · Abdruck für die teuren Tore *(umgesetzt in v154)*

`zielplattentor` durchsucht bei jedem Lauf drei Kartenbilder mit einem Raster
nach der Zielplattform. Das Ergebnis ändert sich, wenn die Kartenbilder oder
die Bahnen sich ändern — sonst nie. `bildtor` rendert fünf Aufnahmen neu.
`grafiktor` dekodiert den ganzen Bildvorrat.

Der Trick ist erprobt: v31 hat dem Bildwerkzeug einen Abdruck über alle
Eingänge gegeben und es von **62,3 s auf 0,3 s** gebracht. Dieselbe Bauart
hier.

> Erwartung: Kette **264 s → rund 110 s**.
> Bedingung: eine Gegenprobe je Tor, die eine Eingangsdatei ändert und prüft,
> dass das Tor wieder rechnet. Ein Abdruck, der die falschen Dateien liest,
> überspringt stillschweigend — und das sähe aus wie ein bestandenes Tor.

### B · Gegenproben nach Bedarf statt immer *(Stufe 1 umgesetzt in v154)*

Regel 5 verlangt, dass jede Prüfung eine stehende Gegenprobe hat **und dass
sie ausgeführt wird**. Sie verlangt nicht, dass alle 142 bei jeder Änderung
laufen. Vorschlag in drei Stufen:

1. **`npm run proben --muster`** (rund 2 s): prüft nur, ob jede der 142
   Regeln noch greift — ohne ein einziges Tor zu fahren. Das fängt den
   häufigsten Verfall, und zwar genau den, der bei v152 **zweimal** zuschlug:
   eine Probe zeigte auf eine umnummerierte Tabellenzeile, eine andere auf
   eine zu kurz gewordene Liste deutscher Zahlwörter. Beide meldeten
   „schlägt nicht an", und beide waren Fehler in der Probe.
2. **Betroffene Proben** bei jeder Runde: wer ein Tor ändert, fährt dessen
   Proben. Das sind typisch zwei bis zehn, also unter einer Minute.
3. **Voller Lauf** vor jeder Auslieferung auf `master` und zusätzlich in
   festem Abstand, damit die Ratschen nicht verrotten.

> Erwartung: **34 min → unter 1 min** im Normalfall, voller Lauf nur dann,
> wenn er etwas prüfen kann.

### C · Die Stufung liegt schon da — sie wird nur nicht genutzt

Die Auslieferung fährt die **volle** Kette auf dem GitHub-Runner, in 163 s,
und liefert nur bei Grün aus. Das ist kein Doppel, sondern eine zweite
Umgebung: **v151a hat genau dort einen Fehler gefunden**, den die lokale
Kette nicht finden konnte — ein fest verdrahteter Chromium-Pfad, den es nur
in diesem Container gibt.

Daraus folgt die Arbeitsteilung:

| Wann | Was | Dauer |
|---|---|---|
| vor jedem Commit | Kette ohne die drei teuren Tore | ~40 s |
| vor der Auslieferung | volle Kette + betroffene Proben | ~2 min |
| bei jedem Push auf `master` | volle Kette auf dem Runner | 163 s, läuft ohne mich |
| alle fünf Versionen | voller Probenlauf | 34 min |

### D · Was ich **nicht** ändern würde

* **Kein Tor streichen.** Alle 142 Proben schlagen an; jedes Tor bewacht
  etwas, das schon einmal kaputt war.
* **Den Blick nicht sparen.** Elf von 57 Befunden kamen aus
  Bildschirmfotos — mehr als aus jedem einzelnen Tor. Regel 7 und 8 bleiben.
* **Die Auslieferungskette nicht kürzen.** Sie ist das einzige Tor in einer
  fremden Umgebung, und sie läuft ohne meine Zeit.

---

## 6. Was es gebracht hat — umgesetzt in v154

**Und zuerst, was an diesen Zahlen nicht stimmt.** Die Container-Last misst
mit. `bildtor` lieferte bei drei aufeinanderfolgenden Läufen **13, 18 und
30 s**, und im allerersten Durchgang 69 s — ohne dass jemand es angefasst
hätte. Eine Kettensumme trägt damit rund ±30 s Rauschen. Deshalb steht unten
getrennt, was **zurechenbar** ist und was nur die Summe sagt (Regel 12).

**Zurechenbar**, weil unmittelbar hintereinander unter gleichen Bedingungen
gemessen:

| Tor | vorher | nachher | Bedingung |
|---|---|---|---|
| `zielplattentor` | 73,7 s | **0,7 s** | greift fast immer — die Hülle ist 8 Dateien groß |
| `grafiktor` | 12,9 s | **0,8 s** | greift selten — 28 Dateien, hängt über `state.ts` an fast dem halben Quelltext |
| voller Probenlauf | 34 min | **0,4 s** | nur für den Musterlauf, siehe unten |

**Die Summe**, mit Vorbehalt: **264 s vorher, 129 und 148 s in zwei Läufen
danach.** Von der Differenz sind rund 85 s zurechenbar, der Rest ist Rauschen.

**Der Musterlauf ersetzt den vollen Lauf nicht.** Er sagt: jede der 143
Proben hat noch einen Gegenstand. Ob das Tor ihn auch meldet, sagt allein der
volle Lauf. Aber er fängt die *häufigste* Verfallsart — und beim ersten
Einsatz fand er sofort etwas: **sechs Proben greifen den ersten von mehreren
Treffern**, eine davon den ersten von 321 Wegbreiten. Das ist Absicht und
kein Fehler, steht aber jetzt als Hinweis da, statt unbemerkt zu bleiben.
Genau diese Bauart hat in v149 die falsche Methode erwischt.

**Was der Abdruck NICHT tun darf**, und warum eine Gegenprobe dazugehört: ein
Abdruck, der die falschen Dateien liest, überspringt stillschweigend — und
das ist von einem bestandenen Tor nicht zu unterscheiden. Die Eingänge werden
deshalb **nicht aufgezählt, sondern aus dem Importgraphen abgeleitet**. Die
Handliste des ersten Entwurfs war sofort unvollständig: `artaudit` importiert
auch `src/game/state.ts`, das darin fehlte. Aufzählungen veralten — an einem
einzigen Tag ist das zweimal passiert.

Der Speicher liegt unter `.abdruck/` und steht in `.gitignore`. Auf dem
Auslieferungsrunner ist er immer leer; die Kette rechnet dort jedes Mal
vollständig. Genau so soll es sein.

### Der Gegenbeweis, der dazugehört

Der volle Probenlauf ist **nicht** kürzer geworden: **33 min nach dem Umbau
gegen 34 min davor.** Das war vorhergesagt und ist die Probe auf die Rechnung
— jede Gegenprobe ändert einen Eingang, also verwirft der Abdruck korrekt und
das Tor rechnet voll.

Damit ist zweierlei belegt: der Abdruck macht die Proben **nicht** blind, und
die 33 Minuten sind **echte Arbeit**, kein Container-Rauschen. Genau deshalb
ist Hebel B kein Sparen an der Prüfung, sondern an ihrer Wiederholung: den
Lauf zu verkürzen ginge nur, indem man ihm etwas wegnimmt — ihn seltener zu
fahren nimmt ihm nichts.

### Was noch offen ist

* **`bildtor` (13–39 s) und `browser` (33 s)** haben kein Gedächtnis. Beide
  hängen am ganzen Renderer, ein Abdruck würde fast nie greifen. Der Hebel
  wäre dort ein anderer: die 22 Browserproben teilen sich keinen Build.
* ~~Die Stufung ist noch Vorschlag~~ — **entschieden und in v155 erzwungen.**
  Der Nutzer hat die Grenze auf drei Minuten je Runde und den vollen
  Probenlauf auf **jede dritte Fassung** gesetzt. `npm run muster` liest
  `tools/proben-stand.txt` und bricht ab, wenn der letzte volle Lauf weiter
  zurückliegt — und der Musterlauf steht in der Kette. Die Tabelle steht in
  `CLAUDE.md` unter „Was wann läuft".

---

## 7. Die Messung von v31 — historisch

Damals: zehn Tore, 107 s, und ein einziges Tor (das Bildwerkzeug) fraß 58 %
davon. Ein Abdruck über alle Eingänge brachte es auf 0,3 s und die Kette auf
40 s. Elf von elf Toren schlugen an.

Der eigentliche Befund von damals gilt unverändert und ist der Grund, warum
`npm run proben` heute existiert:

> Drei der ersten Proben meldeten „schlägt nicht an" — und **alle drei waren
> Fehler in der Probe, nicht im Tor.** Ein Test, der nichts meldet, ist kein
> Beweis für Korrektheit; er ist erst mal nur ein Test, der nichts gemeldet
> hat.

Und der zweite, der die Arbeitsteilung bis heute bestimmt:

> Die Tore prüfen **Verhalten**, nicht **Darstellung**. Kein Tor ersetzt den
> Blick aufs Gerät, und kein Blick aufs Gerät ersetzt die Tore.
