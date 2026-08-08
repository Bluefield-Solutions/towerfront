# Towerfront — Bilanz über alle Tore

*Stand: v35 · 08.08.2026 · Messung entstand bei v31, Ergebnisse gelten unverändert*

Die Frage dieser Runde: **Welches Tor hat tatsächlich Fehler verhindert, und
welches erzeugt nur Arbeit?** Nicht geschätzt, sondern gemessen — Laufzeit
gestoppt und in jedes Tor ein passender Fehler eingebaut, um zu sehen, ob es
anschlägt.

---

## 1. Kosten

| Tor | Laufzeit | Anteil |
|---|---|---|
| art (Bildwerkzeug) | 62,3 s | 58 % |
| sim (Balance) | 15,6 s | 15 % |
| tsc | 11,7 s | 11 % |
| smoke (Rauchtest) | 5,8 s | 5 % |
| bench-draw | 3,7 s | 3 % |
| build | 3,1 s | 3 % |
| determinism | 1,6 s | 1 % |
| bench | 1,1 s | 1 % |
| guards | 0,9 s | 1 % |
| benchmark | 0,5 s | < 1 % |
| autarkie | 0,2 s | < 1 % |
| **gesamt** | **≈ 107 s** | |

**Ein Tor kostet mehr als die Hälfte der Gesamtzeit.** Das Bildwerkzeug
dekodiert und komprimiert bei jedem Lauf 22 Bilder neu, nur um festzustellen,
dass sich nichts geändert hat.

---

## 2. Nutzen — schlägt das Tor an, wenn man den Fehler einbaut?

In jedes Tor wurde ein Fehler eingebaut, der genau zu seinem Zweck passt.
Wiederherstellung jeweils über Git.

| Tor | Eingebauter Fehler | Ergebnis |
|---|---|---|
| tsc | Zahl durch Text ersetzt | **schlägt an** |
| guards | Pfadabschnitt diagonal gemacht | **schlägt an** |
| art | Assetmodul von Hand ergänzt | **schlägt an** |
| determinism | `Math.random` statt Aussaat | **schlägt an** |
| sim | alle Türme +60 % | **schlägt an** |
| sim | alle Türme −40 % | **schlägt an** |
| bench | 3 Mio. Rechenschritte je Bild | **schlägt an** (6,28 statt 4 ms) |
| bench-draw | 1000 Kreise je Bild | **schlägt an** |
| smoke | Kamerabegrenzung entfernt | **schlägt an** |
| autarkie | externe Schriftart eingebunden | **schlägt an** |
| benchmark | — | schlägt nie an, ist informativ |

**Elf von elf tun, was sie sollen.** Kein Tor ist zahnlos.

---

## 3. Der eigentliche Befund dieser Runde

Drei der ersten Proben meldeten „schlägt nicht an" — und **alle drei waren
Fehler in der Probe, nicht im Tor:**

- Beim Bogenturm traf `damage: 8` nur die erste Ausbaustufe; die Balance ändert
  sich davon kaum. Erst ein Eingriff über alle Werte war ein echter Test.
- Die teure Schleife landete in der **falschen Methode** — der erste Treffer
  von `update(dt` gehörte gar nicht zur Spielschleife. Am richtigen Ort
  eingebaut, schlug das Tor sofort an.
- Die externe Schriftart wurde in die Quelldatei geschrieben, geprüft wurde
  aber die gebaute Datei. Ohne Neubau kein Befund.

Und ein vierter, teurerer: Meine erste Prüfumgebung sicherte den Quellbaum mit
`cp -r src /tmp/src.bak`. Das Verzeichnis existierte schon, also landete die
Kopie **darin** — und beim Zurückspielen war der Baum verschachtelt und
beschädigt. Aufgefallen ist es nur, weil eine Karte plötzlich anders aussah.

> **Die Lehre ist dieselbe wie bei jeder Messung in diesem Projekt: Erst
> prüfen, ob der Eingriff überhaupt angekommen ist.** Ein Test, der nichts
> meldet, ist kein Beweis für Korrektheit — er ist erst mal nur ein Test, der
> nichts gemeldet hat. Die Prüfumgebung arbeitet seitdem mit `git checkout`
> statt eigener Kopien.

---

## 4. Welches Tor hat welche Befunde gebracht?

Von 57 festgehaltenen Befunden:

| Quelle | Befunde |
|---|---|
| Simulation / Balance | 32 |
| Datenwächter | 12 |
| **Bildschirmfoto, also der Mensch** | **11** |
| Rauchtest | 5 |
| Determinismus | 5 |
| Zeichenmessung | 4 |
| Autarkie | 2 |

Zwei Dinge stechen heraus.

**Die Simulation ist die Werkbank.** Mehr als die Hälfte aller Erkenntnisse
über dieses Spiel kommt aus ihr — Zweigwaage, Einkommensspirale, Sättigung des
Feldes, Abstand der Spielstile, Robustheit. Sie kostet 15 Sekunden und ist
jeden davon wert.

**Der Mensch am Gerät ist die zweitwichtigste Quelle.** Elf Befunde stammen aus
Bildschirmfotos, und es waren die peinlichsten: Bedienung über dem Spielfeld,
fehlende Umlaute, unsichtbare Bauplätze, ein flachgedrücktes Spielfeld. Zehn
grüne Tore und ein Spiel, dessen Bedienung auf dem Brett lag.

> Die Tore prüfen **Verhalten**, nicht **Darstellung**. Kein Tor ersetzt den
> Blick aufs Gerät, und kein Blick aufs Gerät ersetzt die Tore.

---

## 5. Was sich ändern sollte

**A · Das Bildwerkzeug hat ein Gedächtnis bekommen — erledigt.** Ein Abdruck
über Beschreibung *und* jede Rohdatei steht jetzt im erzeugten Modul. Stimmt
er, ist nichts zu tun.

```
art vorher   62,3 s
art nachher   0,3 s
Torkette     107 s  ->  40 s
```

Der Abdruck reagiert auf beides: Gegenprobe mit einem um ein Grad gedrehten
Rohbild meldet sofort *„passt nicht mehr zu den Rohbildern"*. Mit `--force`
lässt sich das Neuerzeugen erzwingen.

**B · Der Genre-Abgleich heißt jetzt Bericht — erledigt.** Er schlägt nie an
und kann es auch nicht. Aus `npm run benchmark` wurde `npm run bericht`, und
die Ausgabe sagt es selbst: *„GENRE-BERICHT (kein Tor)"*. Die Kette prüft damit
zehn Dinge und berichtet eines — vorher sah sie nach elf Prüfungen aus.

**C · Die Balance-Simulation misst inzwischen zwei Dinge.** Sie prüft die
Balance *und* modelliert das Spielverhalten. Als in v30 die Bewertung der
Bauplätze kurz an den Turmwerten hing, änderte jede Turmänderung zugleich das
Botverhalten. Die Trennung ist wiederhergestellt, gehört aber als Regel
festgeschrieben: **das Modell darf nicht vom Gemessenen abhängen.**

**D · Ein Lesbarkeitstor gibt es jetzt — erledigt, und es hat zugeschlagen.**
`npm run lesbarkeit` liest die ausgelieferten Bilder aus den erzeugten Modulen,
wendet dieselbe Einfärbung an wie die Engine und rechnet drei Dinge: Kontrast
gegen jeden Untergrund, Breite der Silhouette in Bildschirmpunkten im
schlechtesten Fall (iPhone quer, Feld füllt den Bildschirm) und den Farbabstand
der Gegnerarten in Lab.

**Beim ersten Lauf: zwölf Befunde.** Mörser und Prisma standen auf der
Frostspalte bei Kontrast 1,14 bis 1,40, der Koloss bei 1,01 — praktisch
unsichtbar. Der Span war elf Bildschirmpunkte breit. Spalter und Span lagen
farblich 8,2 auseinander, Koloss und Leerentitan 9,4.

Und ein Befund über die Sache selbst: **Lesbarkeit entsteht an der Kante, nicht
in der Fläche.** Mitteldunkel auf mittelhell hat in beide Richtungen wenig
Kontrast. Alle drei Untergründe liegen gemessen zwischen 1,6 und 6,1 %
Helligkeit — auch der Winterboden, der im Bild hell wirkt. Ein dunkler Saum
bringt darauf 2,0, ein heller 8,6. Also überall ein heller Saum, im Ton der
Karte, zweieinhalb Punkte breit und in die Bilder eingebacken.

Behoben: Saum je Karte · Koloss deutlich heller · Span von Orange auf Gelb ·
Mindestbreite für den Span, bewusst von der Treffererkennung entkoppelt ·
kräftigere Einfärbung der Türme.

**E · Und die Messung machte denselben Fehler wie die Proben.** Sie hatte die
Größenregel der Engine *nachgebaut* statt sie zu benutzen — `Math.max(radius *
3, 50)` stand zweimal da. Die Gegenprobe fiel deshalb durch: eine Änderung im
Spiel änderte die Messung nicht. Jetzt importiert das Werkzeug `enemyArtWidth`
und `towerArtScale` direkt aus der Engine, und die Gegenprobe schlägt an.

**Nichts streichen.** Nach dieser Prüfung gibt es kein Tor, das nur Arbeit
erzeugt. Das billigste (Autarkie, 0,2 s) hat zwei Befunde gebracht, darunter
die fehlenden Umlaute.

---

## 6. Zusammenfassung in einem Satz

Zehn Tore, alle nachweislich wirksam, dazu ein Bericht; zusammen jetzt 40
statt 107 Sekunden. Die wertvollsten Erkenntnisse kommen aus der Simulation,
die peinlichsten vom Menschen mit dem Handy in der Hand — und die teuerste
Lehre dieser Runde war, dass auch eine Prüfung geprüft werden muss.
