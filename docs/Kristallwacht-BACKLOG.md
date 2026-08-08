# Kristallwacht — Rückstandsverzeichnis

Stand: nach v15 · 07.08.2026

Das gewichtete Delta gegen die Genre-Referenzen steht in `Kristallwacht-BENCHMARK.md` und läuft mit `npm run benchmark` in jedem Lauf mit.

Legende Nutzen: ●●● hoch · ●● mittel · ● gering
Legende Aufwand: S klein (eine Iteration) · M mittel · L groß (mehrere)

---

## Offen — Phase B (Spielgefühl)

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| B6 | Ziellogik pro Turm wählbar: vorderster, stärkster, nächster, schwächster | ●●● | M |
| B11 | Turm per Ziehen auf eine andere Zelle versetzen (gegen Fehlplatzierung) | ●● | M |
| B15 | Zweite, kürzere Einführung beim ersten Besuch einer neuen Karte | ●● | S |
| B13 | Reichweiten aller Türme gleichzeitig einblenden (Halten auf leerer Fläche) | ●● | S |
| B14 | Warnmarkierung am Kristall, wenn ein Gegner die letzten Meter erreicht | ●● | S |

## Offen — Phase C (Tiefe)

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| C3 | Bannturm: kein Schaden, verstärkt benachbarte Türme | ●● | M |
| C20 | **R4** Blockturm, der Gegner bindet statt sie zu töten (Kingdom Rush Kaserne) | ●● | M |
| C21 | **G5** Heiler oder Schildträger, der die Zielreihenfolge erzwingt | ●● | M |
| C22 | **K5/K6** Sterne je Karte und Fortschritt zwischen den Partien | ●● | M |
| C16 | Turm, der ausschließlich Luftziele trifft (Gegenstück zum Mörser) | ●● | M |
| C6 | Heiler, regeneriert Umstehende | ●● | M |
| C7 | Schildgegner, absorbiert die ersten n Treffer | ●● | S |
| C9 | Karte 2 und 3 mit eigenem Biom und eigener Pfadform | ●●● | L |
| C10 | Zwei Pfade, die sich vereinen — echte Prioritätsentscheidung | ●●● | M |
| C12 | Endlosmodus nach Welle 15 mit fortlaufender Skalierung | ●● | S |
| C17 | Dritte Fähigkeit, die Gold statt Schaden bringt (Ernte mit Abklingzeit) | ●● | S |
| C18 | Fähigkeiten zwischen Karten freischalten statt von Anfang an verfügbar | ●● | M |
| C14 | Kartenauswahl mit Sternebewertung nach verbleibendem Kristall | ●● | M |
| C15 | Schwierigkeitsgrade (Ruhig / Normal / Erbarmungslos) über Startwerte | ●● | S |

## Offen — Technik

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| T15 | Die Verluste liegen fast nur in Welle 15 — Wellen 10 bis 14 sind für ein gutes Feld zu bequem. Mittlere Spitzen einbauen | ●●● | M |
| T12 | Sichtprüfung im Tor: gebaute Datei in einem echten Browser laden und ein Bild vergleichen (jsdom kann die Kaskade nicht) | ●●● | L |
| T8 | Kristall je Rissstufe backen (letztes Objekt mit Pfaden in jedem Bild) | ● | S |
| T9 | Bildpuffer bei Größenwechsel gezielt verwerfen statt alles neu zu backen | ● | S |
| T10 | Aussaat eingebbar machen (Lauf gezielt nachstellen, geteilte Herausforderung) | ●● | S |
| T11 | Bei einem Fehler den letzten Spielstand als Textblock zum Weitergeben anbieten | ●● | S |
| T6 | Rauchtest auch auf dem Endlosmodus und auf jeder Karte laufen lassen | ●● | S |
| T7 | Bündelgröße im Tor begrenzen (heute 53 KB, Schwelle z. B. 120 KB) | ● | S |

## Offen — Phase D (Politur)

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| D2 | Wetter je Karte als eigene Stimmungsschicht (Regen, Schneetreiben, Asche) | ●● | M |
| D14 | **P8** Antippbare Kleinigkeiten in der Karte — Vögel, Fackeln, Steine, die reagieren | ● | S |
| D15 | Turmsilhouetten je Zweig deutlicher unterscheiden (aktuell nur die Farbe) | ●●● | M |
| D16 | Trümmer und Rauch bei Explosionen statt reiner Funken | ●● | S |
| D5 | Menüübergänge, Einblenden statt hartem Umschalten | ●● | S |
| D6 | Einstellungsdialog: Lautstärke, Effektdichte, Bewegungsreduktion | ●● | S |
| D12 | Auswertung auch zwischen den Wellen abrufbar, nicht nur am Ende | ●● | S |
| D13 | Schadensverlauf über die Wellen als kleine Kurve in der Auswertung | ●● | M |
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
| S11 | 19.206 Zeichenbefehle je Bild vor v4, davon 4.792 allein `arcTo` | Gelöst durch Schichten und gebackene Bilder. Neue Zeichnungen ab jetzt gegen `npm run bench-draw` prüfen. |
| S32 | Vor der Grafikrunde standen 2.874 von 3.000 Zeichenbefehlen — zu eng für Politur. Größter Posten: 907 Teilchen-Rechtecke | Obergrenze für Teilchen eingeführt (620/180). Danach passte mehr Grafik in *weniger* Befehle: 2.576. |
| S33 | Gebackene Bilder kosten Speicher, und mit sechs Laufphasen je Gegner wächst der Vorrat schnell | Backbudget als zweite Zahl im Zeichen-Tor: 71 Bilder, 5,8 MB, Obergrenze 24 MB. |
| S29 | Mit drei Spielstilen statt einem kam **nur einer** durch. Ursache war eine Rückkopplung: abschusslastiges Einkommen lässt die Schere zwischen gutem und schwachem Feld immer weiter aufgehen (5.106 gegen 2.082 Gold) | Einkommen verlagert: Abschussprämien 40 %, Wellenbonus 4,4×. Der Bonus fällt auch bei Durchkommen an. |
| S30 | Die Verlagerung riss sofort eine neue Lücke: ohne Abschussgold fehlte die Eröffnung, Verluste in **Welle 1** | Startkapital 140 → 220. |
| S31 | Endfaktor und Verdichtung prallen am voll ausgebauten Feld ab — Endfaktor 13 und 28 ergaben dasselbe Ergebnis bis aufs Goldstück | Der Exponent ist der Hebel, nicht die Höhe: 2,2 → 2,6. |
| S26 | Mit einem kompetenten Bot (16 gut gesetzte, voll ausgebaute Türme) war das Spiel **20/20** — viel zu leicht. Die alte Schwierigkeit sah nur richtig aus, weil der alte Bot schlecht spielte | Kurve von Grund auf neu: Potenzkurve statt linear, Verdichtungsrampe, Einkommen −15 %. Jetzt 17/20 für gemischt. |
| S27 | Drei falsche Fährten: mehr Lebenspunkte (0,11→0,28 ohne Wirkung), weniger Gold (nur weniger Restgold), dichtere Wellen (Feld ist 3× überversorgt) | Der Fehler saß in der **Form** der Kurve, nicht in ihrer Höhe. Linear trifft die Mitte genauso hart wie das Ende. |
| S28 | Die Zweig-Waage rechnete mit *durchschnittlicher* Panzerung und ließ zwei tote Zweige durch (Salve, Splitterfrost) | Panzerung wird jetzt nach später Präsenz gewichtet. Außerdem wog das Modell Bremsen mit 1,3 statt 2,4 — die Simulation hatte recht, das Modell nicht. |
| S23 | Der Simulationsbot baut ~100 Türme und überdeckt damit jeden Zweigunterschied — ein absichtlich wertloser Zweig fiel nicht auf | Ersetzt durch die rechnerische Zweig-Waage im Datenwächter. Offen: den Bot begrenzen, damit die Simulation überhaupt trennschärfer wird (siehe T13). |
| S24 | Zweig-Waage fand beim ersten Lauf: Splitterfrost je Gold Faktor 2,14 vor Ewigem Eis, Salve 1,45 vor Scharfschütze | Beide nachjustiert, alle vier Paare liegen jetzt zwischen 1,04 und 1,26. |
| S25 | Spielstand war doch unvollständig: zwischengespeichertes Turmziel und Geschosse im Flug fehlten | Beide ergänzt. Die Begründung aus v5 („ein halber Treffer") war bequem statt richtig — der Verlauf wird messbar anders. |
| S21 | Erster Genre-Abgleich: 18/27 Kriterien, gewichtet 69 %. Bereich „Karten" steht bei **0/6** | Die Kernschleife ist auf Genre-Niveau, der Wiederspielwert nicht. Ab hier liegt der Hebel eindeutig bei mehreren Karten, Schwierigkeitsgraden und Fortschritt. |
| S22 | Turmwerte waren vor dem Kauf nicht sichtbar — der häufigste Vorwurf an schwächere Genre-Vertreter | In v11 behoben, vom Rauchtest geprüft (Kosten, Schaden, Reichweite, Luftziele müssen im Panel stehen). |
| S20 | Statistikwerte mussten in den Spielstand, sonst beginnt die Auswertung nach dem Fortsetzen bei null | Von Anfang an im Fingerabdruck der Determinismus-Prüfung — dieselbe Lehre wie S16, diesmal vorher berücksichtigt. |
| S19 | `.screen { display: grid }` schlug das `hidden`-Attribut — die Titelkarte lag unsichtbar über allem und machte das Spiel auf dem Handy unbedienbar. Neun grüne Tore haben es nicht gefunden | Behoben mit `[hidden] { display: none !important }`, vom Autarkie-Check erzwungen. Grundsätzlich: die Tore prüfen Verhalten, nicht Darstellung. Stapelreihenfolge, Kaskade und Berührungsflächen brauchen weiter den Blick aufs Gerät. |
| S18 | Einführung kann auf zwei Arten kaputtgehen: Satz zeigt auf einen entfernten Knopf, oder ein Schritt ist unerfüllbar | Beides prüft jetzt der Rauchtest, beide Gegenproben schlagen an. Neue Schritte brauchen einen hinterlegten Handgriff, sonst meldet er es. |
| S16 | Determinismus-Prüfung fiel beim Einbau der Fähigkeiten durch: Meteor im Anflug, Nachladestand der Türme und Trefferpause fehlten im Spielstand | Drei Felder, die man beim Schreiben übersieht. Faustregel: alles, was eine bereits bezahlte Entscheidung oder eine laufende Uhr ist, gehört in `snapshot()`. |
| S17 | Fähigkeiten ändern das Simulationsergebnis nicht (5/20 mit und ohne) | Sie helfen gegen Schwärme, nicht gegen Titanen. Gewollt — sonst würden sie die Bosswellen entwerten. |
| S14 | Erste Fassung setzte die Schwärmer in Welle 4 — der Bot verlor dort 6 Kristall | Zu früh für einen Gegner, der ein Umbauen erzwingt. Jetzt Welle 7. Neue Gegnertypen kommen ab jetzt frühestens ab Welle 6. |
| S15 | Ein mörserlastiges Feld verliert in Welle 15, gemischt gewinnt | Die Schwärmer stellen eine echte Frage. Als vierte Bedingung in der Balance-Simulation festgeschrieben. |
| S13 | Determinismus-Prüfung schlägt an, wenn beim Laden der Zufallszustand fehlt oder die Wellenuhr um ein Zehnmillionstel verschoben ist | Die Prüfung hat Zähne. Jedes neue Feld im Spielzustand gehört in `snapshot()`, sonst fällt sie durch. |
| S12 | `rect` ist mit 594 je Bild jetzt der größte Posten (Partikel) | Erwartungsgemäß — sie liegen in acht Bündeln statt 626 Einzelbefehlen. Erst anfassen, wenn es messbar stört. |

## Erledigt

| Version | Inhalt |
|---|---|
| v1 | Grundgerüst: Karte, Pfad, zwei Türme mit drei Stufen, drei Gegner, zehn Wellen, Gold, Leben, Sieg/Niederlage, HUD, Inspektor, Partikel, Kristall mit Rissen, Pipeline mit vier Toren |
| v13 | Simulationsbot auf menschliches Maß begrenzt (16 Türme, Entscheidung alle 0,5 s, Bauplätze nach Pfaddeckung, Reserve, Ausbau in den stärksten Turm) · Schwierigkeitskurve neu: Potenzkurve `1+(i/n)^2,2×10` statt linear, Verdichtungsrampe 12 % je Welle, Einkommen −15 % · Zweig-Prüfung verfeinert: ein gemischtes Feld mit genau einem umgestellten Turmtyp · Zweig-Waage gewichtet Panzerung nach später Präsenz und Bremsen mit 2,4 · Salve und Splitterfrost als tote Zweige erkannt und behoben |
| v12 | Verzweigter Ausbau (R3): zwei sich ausschließende Zweige je Turm ab Stufe 2, acht Endausbauten statt vier · Panzerdurchschlag als neue Eigenschaft · Zweigfarbe sichtbar an Sockel, Waffe und Reichweitenring · Zweig-Waage im Datenwächter (Wirkung je Gold, Faktor höchstens 1,4) · Rauchtest prüft Endgültigkeit der Zweigwahl und die zwei Auswahlknöpfe · Spielstand um Turmziel und Geschosse im Flug ergänzt · Genre-Abgleich 18/27 → 19/27 |
| v11 | Genre-Abgleich als zehntes (nicht abbrechendes) Tor: 27 Kriterien aus Kingdom Rush, Bloons TD 6, Plants vs. Zombies, Defense Grid und Defender's Quest, wo möglich gemessen statt behauptet · Dokument `Kristallwacht-BENCHMARK.md` mit Herkunft jedes Kriteriums · feste Dreierstruktur je Runde (Abgleich → Prozess → Spiel) · volle Turmwerte im Inspektor vor dem Kauf, vom Rauchtest geprüft |
| v10 | Auswertung nach der Partie: Kennzahlen, Schadensanteil je Quelle als Balken, stärkster Turm mit Feldposition, Wellen mit Kristallverlust, Fähigkeitsnutzung · Werte wandern im Spielstand mit · Rauchtest prüft vier Gleichungen der Auswertung · `stats()` in `towerStats()` umbenannt |
| v9 | Fehlerbehebung: `[hidden] { display: none !important }` — versteckte Ebenen fingen zuvor jeden Tipp ab und machten das Spiel auf dem Handy unbedienbar · Autarkie-Check erzwingt die Regel · `-webkit-backdrop-filter` · `color-mix` durch festen Wert ersetzt |
| v8 | Einführung im Spiel: sieben kontextbezogene Sätze über die ersten drei Wellen, das gemeinte Bedienelement pulsiert, auf dem Feld zeigt ein Pfeil auf den empfohlenen Bauplatz · überspringbar und auf dem Titelbildschirm wieder einschaltbar · läuft beim Fortsetzen nie an · Rauchtest prüft, dass jeder Schritt ein existierendes Element trifft und erfüllbar ist · Wächter prüft den empfohlenen Bauplatz |
| v7 | Zwei Fähigkeiten auf Abruf: Meteor (gezielt, 40 s, trifft Boden und Luft, sichtbarer Anflug mit Zielring) und Frostschlag (sofort, 32 s, bremst das ganze Feld drei Sekunden) · Fähigkeitsleiste mit Abklingbalken · Tasten Q und W · Wächterprüfungen für Fähigkeiten · Simulationsbot nutzt sie wie ein aufmerksamer Spieler · Spielstand um Meteore im Anflug, Nachladestand und Trefferpause ergänzt |
| v6 | Schwärmer (fliegt die Luftlinie, Mörser erreicht ihn nicht) · Spalter (zerfällt beim Tod in zwei Späne an derselben Pfadstelle) · Span als Bruchstück · Turmeigenschaft „trifft Luft" · Wellenplan neu aufgebaut, neue Typen ab Welle 6 · Flughöhe sichtbar über eigenem Schatten · Markierungen in der Wellenvorschau · Wächterprüfungen für Luft und Zerfallsketten · vierte Bedingung in der Balance-Simulation |
| v5 | Spielstand und Determinismus: eigener Zufall mit Aussaat und sicherbarem Zustand (xorshift32) statt `Math.random` · Sicherung einer laufenden Partie alle zwei Sekunden, beim App-Wechsel und beim Schließen · „Partie fortsetzen" auf dem Titelbildschirm · Versionsprüfung, unpassende Stände werden verworfen · Determinismus-Prüfung als drittes Tor (gleiche Aussaat und Sichern/Laden dürfen den Verlauf nicht verändern) · Aussaat in der Technikanzeige |
| v4 | Zeichen-Runde: eigene Schicht für alle Turmsockel · vorgebackene Bilder für Gegner, Trefferblitze, Bodenschatten, Turmsockel und Turmwaffen · gebündelte Partikel, Lebensbalken, Leuchtscheiben und Wurfschatten · Zeichenmessung (Befehle je Bild, maschinenunabhängig) als achtes Tor · 19.206 → 2.502 Befehle je Bild |
| v3 | Technik-Runde: Raster für alle Umkreisabfragen (Zielsuche, Frostpuls, Explosion, Kettenblitz) · zwischengespeicherte Turmziele statt Suche in jedem Bild · Objektlager für Partikel, Geschosse, Ringe, Blitze · Listen werden an Ort und Stelle zusammengeschoben · zuschaltbare Technikanzeige mit Bildrate und Objektzahlen · kopfloser Rauchtest (jsdom) und Leistungsmessung als neue Tore · TypeScript prüft jetzt auch `tools/` |
| v2 | Ton (synthetisch, budgetiert) · Mörser und Prisma als dritter und vierter Turm mit eigenen Angriffstypen · Leerentitan als Boss · fünfzehn Wellen · Frühstart-Bonus · Bauvorschau am Finger mit Bestätigung beim Loslassen · Wellenvorschau · Explosionsringe, Kettenblitze, Trefferstocken · Turmsilhouetten wachsen mit der Stufe · automatische Effektdrosselung nach Bildrate · Speicherstand für Einstellungen und besten Lauf · Tonschalter · Pause beim App-Wechsel · Versionsstempel · Datenwächter und erweiterte Balance-Simulation in der Pipeline |
