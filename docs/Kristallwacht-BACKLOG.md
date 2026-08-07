# Kristallwacht — Rückstandsverzeichnis

Stand: nach v3 · 07.08.2026

Legende Nutzen: ●●● hoch · ●● mittel · ● gering
Legende Aufwand: S klein (eine Iteration) · M mittel · L groß (mehrere)

---

## Offen — Phase B (Spielgefühl)

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| B6 | Ziellogik pro Turm wählbar: vorderster, stärkster, nächster, schwächster | ●●● | M |
| B11 | Turm per Ziehen auf eine andere Zelle versetzen (gegen Fehlplatzierung) | ●● | M |
| B12 | Kurze Einführung in Welle 1 und 2, die das Bauen erklärt | ●●● | M |
| B13 | Reichweiten aller Türme gleichzeitig einblenden (Halten auf leerer Fläche) | ●● | S |
| B14 | Warnmarkierung am Kristall, wenn ein Gegner die letzten Meter erreicht | ●● | S |

## Offen — Phase C (Tiefe)

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| C3 | Bannturm: kein Schaden, verstärkt benachbarte Türme | ●● | M |
| C4 | Flieger, ignoriert den Pfad und fliegt die Luftlinie — Mörser trifft ihn nicht | ●●● | M |
| C5 | Teiler, zerfällt beim Tod in zwei kleine | ●●● | S |
| C6 | Heiler, regeneriert Umstehende | ●● | M |
| C7 | Schildgegner, absorbiert die ersten n Treffer | ●● | S |
| C9 | Karte 2 und 3 mit eigenem Biom und eigener Pfadform | ●●● | L |
| C10 | Zwei Pfade, die sich vereinen — echte Prioritätsentscheidung | ●●● | M |
| C12 | Endlosmodus nach Welle 15 mit fortlaufender Skalierung | ●● | S |
| C13 | Fähigkeit auf Abruf: Frostschlag oder Meteor mit Abklingzeit | ●●● | M |
| C14 | Kartenauswahl mit Sternebewertung nach verbleibendem Kristall | ●● | M |
| C15 | Schwierigkeitsgrade (Ruhig / Normal / Erbarmungslos) über Startwerte | ●● | S |

## Offen — Technik

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| T1 | Zeichnen in Schichten: statischer Untergrund, Welt, Effekte getrennt puffern | ●●● | M |
| T2 | Gegner-Zeichnung über vorgebackene Sprites statt Vektorpfaden je Bild | ●●● | M |
| T3 | Messung um eine Zeichenmessung ergänzen (aktuell nur Simulation) | ●● | M |
| T4 | Spielstand einer laufenden Partie sichern und fortsetzen | ●● | M |
| T5 | Deterministischer Zufall im Spielverlauf, damit ein Lauf exakt wiederholbar ist | ●● | M |
| T6 | Rauchtest auch auf dem Endlosmodus und auf jeder Karte laufen lassen | ●● | S |
| T7 | Bündelgröße im Tor begrenzen (heute 53 KB, Schwelle z. B. 120 KB) | ● | S |

## Offen — Phase D (Politur)

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| D1 | Parallaxe-Hintergrund hinter dem Feld, ferne Silhouetten | ●● | M |
| D2 | Wetter und Tageszeit je Karte als Stimmungsschicht | ●● | M |
| D4 | Gegner-Todesanimation statt reiner Partikel | ●● | M |
| D5 | Menüübergänge, Einblenden statt hartem Umschalten | ●● | S |
| D6 | Einstellungsdialog: Lautstärke, Effektdichte, Bewegungsreduktion | ●● | S |
| D7 | Statistik nach der Partie: Schaden pro Turm, beste Platzierung | ●●● | M |
| D8 | Tastaturbedienung vollständig, sichtbarer Fokus | ● | S |
| D11 | Einstellungsdialog mit fester Qualitätsstufe statt nur Automatik | ● | S |
| D10 | Eigene Turm- und Gegnernamen in der Wellenvorschau antippbar für Details | ● | S |

## Befunde aus der Simulation (v2)

| # | Befund | Konsequenz |
|---|---|---|
| S4 | Mörser und Prisma verlieren allein in Welle 3 | Korrekt — sie sind Ausbautürme, keine Eröffnung. Nicht anfassen. |
| S5 | Frost allein hält bis Welle 5 | Als reine Stützrolle gewollt. Beobachten, wenn C4 (Flieger) kommt. |
| S6 | Kristallverluste liegen ausschließlich in Welle 10 und 15 | Die Kurve sitzt. Bei neuen Wellen darauf achten, dass das so bleibt. |
| S7 | Der Bot baut bis zu 86 Türme | 119 Bauplätze sind viel. Bei Karte 2 knapper planen — Platz ist eine Ressource. |
| S8 | Hinweis des Wächters: Druck fällt in Welle 4 gegenüber Welle 3 | Bewusst: Welle 4 ist eine reine Tempowelle. Beim nächsten Balancing prüfen. |
| S9 | Das Raster allein war bei 55 Gegnern langsamer als die Vollprüfung (0,164 statt 0,145 ms) | Nicht das Raster war das Problem, sondern die Zielsuche jedes Bild. Optimierungen nur noch gegen `npm run bench` entscheiden. |
| S10 | Ab etwa 320 Gegnern liegt das Raster 15 % vorn | Bei Karte 2/3 und dem Endlosmodus erneut messen — dort soll sich der Abstand öffnen. |

## Erledigt

| Version | Inhalt |
|---|---|
| v1 | Grundgerüst: Karte, Pfad, zwei Türme mit drei Stufen, drei Gegner, zehn Wellen, Gold, Leben, Sieg/Niederlage, HUD, Inspektor, Partikel, Kristall mit Rissen, Pipeline mit vier Toren |
| v3 | Technik-Runde: Raster für alle Umkreisabfragen (Zielsuche, Frostpuls, Explosion, Kettenblitz) · zwischengespeicherte Turmziele statt Suche in jedem Bild · Objektlager für Partikel, Geschosse, Ringe, Blitze · Listen werden an Ort und Stelle zusammengeschoben · zuschaltbare Technikanzeige mit Bildrate und Objektzahlen · kopfloser Rauchtest (jsdom) und Leistungsmessung als neue Tore · TypeScript prüft jetzt auch `tools/` |
| v2 | Ton (synthetisch, budgetiert) · Mörser und Prisma als dritter und vierter Turm mit eigenen Angriffstypen · Leerentitan als Boss · fünfzehn Wellen · Frühstart-Bonus · Bauvorschau am Finger mit Bestätigung beim Loslassen · Wellenvorschau · Explosionsringe, Kettenblitze, Trefferstocken · Turmsilhouetten wachsen mit der Stufe · automatische Effektdrosselung nach Bildrate · Speicherstand für Einstellungen und besten Lauf · Tonschalter · Pause beim App-Wechsel · Versionsstempel · Datenwächter und erweiterte Balance-Simulation in der Pipeline |
