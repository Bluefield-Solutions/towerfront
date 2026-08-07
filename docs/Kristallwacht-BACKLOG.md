# Kristallwacht — Rückstandsverzeichnis

Stand: nach v1 · 07.08.2026

Legende Nutzen: ●●● hoch · ●● mittel · ● gering
Legende Aufwand: S klein (eine Iteration) · M mittel · L groß (mehrere)

---

## Phase B — Spielgefühl

| # | Punkt | Nutzen | Aufw. | Status |
|---|---|---|---|---|
| B1 | Ton: Schuss, Treffer, Tod, Bauen, Welle, Leck. Web-Audio synthetisch, keine Dateien | ●●● | M | offen |
| B2 | Wellenvorschau: Was kommt als Nächstes, wie viele, welche Art | ●●● | S | offen |
| B3 | Trefferrückmeldung schärfen: Aufprallblitz, Rückstoß, kurzes Zeitstocken beim Kolosstod | ●●● | S | offen |
| B4 | Bauvorschau am Finger: Turm halbtransparent auf der Zelle unter dem Daumen | ●●● | S | offen |
| B5 | Wellenübergang: Countdown, Ankündigung, Bonus-Einblendung | ●● | S | offen |
| B6 | Ziellogik wählbar pro Turm: vorderster, stärkster, nächster | ●● | M | offen |
| B7 | Turmreichweite dauerhaft anzeigen, solange gebaut wird | ●● | S | offen |
| B8 | Kein Verlust bei Fehltipp: Bauen erst bestätigen, wenn der Finger losgelassen wird | ●● | S | offen |
| B9 | Spielstand sichern (Bestwelle, Gold, Einstellungen) via localStorage | ●● | S | offen |
| B10 | Bildrate messen und Effektdichte automatisch drosseln | ●● | M | offen |

## Phase C — Tiefe

| # | Punkt | Nutzen | Aufw. | Status |
|---|---|---|---|---|
| C1 | Turm 3: Mörser — Flächenschaden, langsam, trifft nur Bodeneinheiten | ●●● | M | offen |
| C2 | Turm 4: Prisma — Kettenblitz auf mehrere Ziele | ●●● | M | offen |
| C3 | Turm 5: Bannturm — kein Schaden, verstärkt Nachbartürme | ●● | M | offen |
| C4 | Gegner: Flieger, ignoriert den Pfad, fliegt die Luftlinie | ●●● | M | offen |
| C5 | Gegner: Teiler, zerfällt beim Tod in zwei kleine | ●●● | S | offen |
| C6 | Gegner: Heiler, regeneriert Umstehende | ●● | M | offen |
| C7 | Gegner: Schild, absorbiert die ersten n Treffer | ●● | S | offen |
| C8 | Bosswelle alle fünf Wellen, eigene Silhouette, eigener Auftritt | ●●● | M | offen |
| C9 | Karte 2 und 3 mit eigenem Biom und eigener Pfadform | ●●● | L | offen |
| C10 | Zwei Pfade, die sich vereinen — echte Prioritätsentscheidung | ●●● | M | offen |
| C11 | Wellen 11 bis 30, Kurve über die Simulation kalibriert | ●●● | M | offen |
| C12 | Endlosmodus nach der letzten Welle | ●● | S | offen |
| C13 | Fähigkeit auf Abruf: Frostschlag oder Meteor mit Abklingzeit | ●● | M | offen |
| C14 | Kartenauswahl mit Sternebewertung nach verbleibendem Kristall | ●● | M | offen |

## Phase D — Politur

| # | Punkt | Nutzen | Aufw. | Status |
|---|---|---|---|---|
| D1 | Parallaxe-Hintergrund hinter dem Feld, ferne Silhouetten | ●● | M | offen |
| D2 | Wetter und Tageszeit je Karte als Stimmungsschicht | ●● | M | offen |
| D3 | Turmsilhouetten pro Stufe sichtbar unterschiedlich, nicht nur Punkte | ●●● | M | offen |
| D4 | Gegner-Todesanimation statt reiner Partikel | ●● | M | offen |
| D5 | Menüübergänge, Einblenden statt hartem Umschalten | ●● | S | offen |
| D6 | Einstellungen: Ton, Effektdichte, Bewegungsreduktion respektieren | ●● | S | offen |
| D7 | Statistik nach der Partie: Schaden pro Turm, effizienteste Platzierung | ●● | M | offen |
| D8 | Tastaturbedienung vollständig, sichtbarer Fokus | ● | S | offen |
| D9 | Kurze Einführung in den ersten beiden Wellen | ●●● | M | offen |

## Befunde aus der Simulation

| # | Befund | Konsequenz |
|---|---|---|
| S1 | Reine Bogentürme gewinnen mit 20/20 — zu dominant | Kosten oder Takt anziehen, sobald Turm 3 und 4 da sind |
| S2 | Frost trägt in der Simulation kaum bei | Bremse muss Flächenwirkung bekommen (Umkreis statt Einzelziel) |
| S3 | Die Lebenspunktkurve ist mit 12 % pro Welle gesetzt, aber nur gegen zwei Türme geprüft | Nach jedem neuen Turm neu kalibrieren |

## Erledigt

| Version | Inhalt |
|---|---|
| v1 | Grundgerüst: Karte, Pfad, zwei Türme mit drei Stufen, drei Gegner, zehn Wellen, Gold, Leben, Sieg/Niederlage, HUD, Inspektor, Partikel, Kristall mit Rissen, Pipeline mit vier Toren |
