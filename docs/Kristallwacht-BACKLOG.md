# Kristallwacht — Rückstandsverzeichnis

Stand: nach v33 · 08.08.2026

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
| C16 | Turm, der ausschließlich Luftziele trifft (Gegenstück zum Mörser) | ●● | M |
| C6 | Heiler, regeneriert Umstehende | ●● | M |
| C7 | Schildgegner, absorbiert die ersten n Treffer | ●● | S |
| C27 | Endlos-Bestenliste je Karte, die zeigt, wie weit andere Läufe kamen | ● | S |
| C24 | Karte 4 mit einer Mechanik statt nur einer Form (bewegliche Brücke, Tor, das sich schließt) | ●● | L |
| C26 | Ascheschlucht und Spiralhain verlangen noch fast dasselbe (Wächterhinweis, Abstand 0,22) — die Mischung stärker trennen | ●● | S |
| C17 | Dritte Fähigkeit, die Gold statt Schaden bringt (Ernte mit Abklingzeit) | ●● | S |
| C18 | Fähigkeiten zwischen Karten freischalten statt von Anfang an verfügbar | ●● | M |
| C23 | Vierter Grad „Unmöglich" mit eigenen Regeln statt nur härteren Zahlen (kein Verkaufen, keine Fähigkeiten) | ●● | M |

## Offen — Technik

| # | Punkt | Nutzen | Aufw. |
|---|---|---|---|
| **T18** | **VORSCHLAG statt T15/T16/T17: feste Bauplätze wie im Genre-Vorbild.** 10–16 gestaltete Stellungen je Karte statt freier Fläche. Die Frage lautet dann „welcher Turm hierhin", nicht „wie viele". Löst T15, T16 und T17 auf einmal und macht die Karten gestaltbar | ●●● | L |
| **T17** | **Geometrie: 16 Türme decken jede Pfadzelle dreifach ab.** Deshalb ist „viele Türme" kein Spielstil. Kürzere Reichweiten oder längere Pfade — beides zieht eine Neujustierung nach sich. Rest von T16 | ●●● | L |
| **T16** | **BLOCKER vor T15: Der Abstand zwischen den Spielstilen ist zu groß (Meister 116, Breite 78, Sparsam 74).** Ein mittelmäßiges, aber vernünftiges Feld muss tragen — sonst gibt es kein Fenster, in dem sich die Kurve anziehen lässt. Ansatz: Einkommen noch stärker auf den Wellenbonus, günstigere zweite Ausbaustufe | ●●● | M |
| **T15** | **BLOCKER: Die Verluste liegen fast nur in der letzten Welle. Druck über die Wellen 10 bis 15 verteilen.** Solange das so ist, kippt jede Ergänzung am Sortiment die Balance, statt sie zu verschieben — siehe S41. Vor R4 und G5 zu erledigen | ●●● | M |
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
| D19 | Grafik weiter: Türme höher und plastischer, Gegner größer, Kartenrand als gestaltete Kante statt harter Abbruch | ●●● | M |
| D20 | Wellenvorschau als Reihe kleiner Gegnersymbole statt Text — auf dem Handy ist die Zeile zu lang | ●● | S |
| D14 | **P8** Antippbare Kleinigkeiten in der Karte — Vögel, Fackeln, Steine, die reagieren | ● | S |
| D17 | Geschosse je Zweig unterscheiden (Pfeil, Salvenbolzen, Granate, Strahl) | ●● | S |
| D18 | Turm-Leerlaufbewegung: leichtes Atmen, damit auch ein ruhendes Feld lebt | ● | S |
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
| S63 | Das neue Lesbarkeitstor fand beim ersten Lauf **zwölf Befunde**: Mörser und Prisma bei Kontrast 1,14–1,40 auf der Frostspalte, Koloss bei 1,01, Span elf Bildpunkte breit, zwei Farbpaare zu nah | Genau die Lücke, die die Tor-Bilanz benannt hatte. Behoben, ohne die Grenzen zu senken. |
| S64 | **Lesbarkeit entsteht an der Kante, nicht in der Fläche** | Alle drei Untergründe liegen zwischen 1,6 und 6,1 % Helligkeit — auch der Winterboden, der hell wirkt. Dunkler Saum bringt 2,0, heller 8,6. Überall heller Saum, eingebacken. |
| S65 | Das Messwerkzeug hatte die Größenregel der Engine **nachgebaut** statt sie zu benutzen — die Gegenprobe fiel dadurch durch | Dieselbe Fehlerklasse wie bei den Injektionsproben (S61). Es importiert jetzt `enemyArtWidth` und `towerArtScale` direkt. |
| S61 | **Drei von zehn Fehlerinjektionen meldeten „schlägt nicht an" — alle drei waren Fehler in der Probe, nicht im Tor** | Ein Wert traf nur die erste Ausbaustufe; eine Schleife landete in der falschen Methode; eine Änderung wurde in der Quelldatei geprüft statt in der gebauten. Erst prüfen, ob der Eingriff angekommen ist. |
| S62 | Die Prüfumgebung sicherte den Quellbaum mit `cp -r src /tmp/src.bak` — das Verzeichnis existierte schon, die Kopie landete darin, beim Zurückspielen war der Baum beschädigt | Aufgefallen nur, weil eine Karte plötzlich anders aussah. Wiederherstellung läuft jetzt über `git checkout`. |
| S60 | Beim Einbau der Türme hatte ich acht Bruchstücke in den Vorlagen übersehen — sie schrumpften die Türme beim Skalieren | Von Hand eingebaute Bilder sind nicht überprüfbar. Seit v31 macht das `tools/pack-art.mjs`, und das Tor prüft, dass die eingebetteten Module noch zu den Rohbildern passen. |
| S58 | Das Spielfeld lag als Insel zwischen zwei reservierten Bändern — auf dem Handy quer ging ein Drittel des Bildschirms an die Bedienung | Umgekehrt gelöst wie im Genre-Vorbild: Karte füllt den Bildschirm, Bedienung schwebt darüber und klappt weg. Kamera mit Verschieben, Kneifen, Doppeltipp. |
| S59 | Ohne Schwelle zwischen Tippen und Schieben setzt jedes Verschieben am Ende einen Turm | Ab elf Punkten Fingerweg gilt es als Schieben; beim Loslassen passiert dann nichts. |
| S56 | Der Gegnersatz zeigt **gepanzerte Fahrzeuge**, das Konzept sah Kreaturen der Leere vor | Statt die Lieferung abzulehnen: die Gegnerfraktion ist jetzt eine Maschinenarmee. Nur zwei Namen mussten weichen (Husche → Späher, Schwärmer → Gleiter), Rollen und Balance blieben unberührt. |
| S57 | Zwei der zwölf Vorlagen hatten abgeschnittene Reste am Bildrand — sie wären beim Zuschneiden mitskaliert worden und hätten das Fahrzeug schrumpfen lassen | Der Packer behält nur den größten zusammenhängenden Bereich je Bild. Eine Vorlage (`armored_vehicle_01`) war ganz unbrauchbar und blieb draußen. |
| S54 | Nach dem Einbau der Turmbilder war das Spielfeld **komplett verzogen** — horizontal gestreckt, vertikal gestaucht | Bildraster der Leinwand passte nicht zu ihrer Fläche: `resize` war zu früh gelaufen und abgebrochen, die Leinwand behielt 300 × 150. Behoben durch Selbstheilung in jedem Bild, einen Größenbeobachter und eine Rauchtest-Prüfung, die genau diesen Fall nachstellt. |
| S55 | Der gelieferte Turmsatz war **keine Rotationsfolge**, sondern 32 Varianten in Dreiviertelansicht | Als Drehung unbrauchbar, als zwölf Turmzustände sehr brauchbar. Turmdrehung durch Spiegelung ersetzt — ein Objekt in Dreiviertelansicht kippt, wenn man es in der Fläche dreht. |
| S51 | Die Kennzahl aus v24 war selbst falsch: sie nahm die 16 besten *Einzelplätze*, die sich gegenseitig überdecken. Gierig gerechnet: 2,5 / 2,1 / 1,8 statt 3,1 / 2,5 / 2,7 | Der eigentliche Befund steht daneben: 16 Türme erreichen auf jeder Karte **100 % des Weges**. Deshalb bringt der siebzehnte nichts. |
| S52 | Ein pauschaler Reichweitenschnitt ist **nicht rollenneutral**: Einzelzieltürme verlieren eins zu eins (Schaden × Zeit im Radius), der Frostturm kaum | Nach dem Schnitt kam das reine Frostfeld am weitesten, alles andere brach fünf Wellen früher zusammen. Reichweiten künftig nur je Rolle ändern. |
| S53 | Die Bauplatzbewertung des Bots hing kurzzeitig an der größten Reichweite im Sortiment — jede Turmänderung änderte damit auch das Botverhalten | Das Modell darf nicht vom Gemessenen abhängen. Wieder ein fester Wert. |
| S48 | Der sparsame Spielstil ließ 1.642 Gold liegen — ein Viertel des Einkommens — weil seine Turmobergrenze bei elf lag | Kein Spielstil, ein Botfehler. Obergrenze auf 15: 74 → 110 Punkte. Der Abstand zum stärksten Stil fiel damit von 42 auf 7. |
| S49 | Stufe 1 war bei Frost (55) und Prisma (88) je tausend Gold nur ein Drittel bis die Hälfte dessen wert, was ein Ausbau brachte | Wer in die Breite baut, kauft lauter schlechte Geschäfte. Stufe 1 dieser drei Türme deutlich gestärkt. |
| S50 | Trotzdem blieb der breite Stil zurück. Messung: **16 Türme decken jede Pfadzelle 3,1-fach ab** | Geometrie, nicht Wirtschaft: Reichweite 200 gegen 43 Pfadkacheln. Ein siebzehnter Turm bringt keine neue Strecke. Neuer Punkt T17. |
| S45 | T15 dreimal angegangen, dreimal zurückgenommen. Mit einer Kurve mit Knie lagen die Verluste tatsächlich in drei Wellen — aber zwei von drei Spielstilen verloren dann auf jeder Karte | Die Wand ist nicht die Kurve, sondern der Abstand der Stile (Spanne 42). Neuer Blocker T16, er kommt vor T15. |
| S46 | Der Bot hat sein Feld **vor Welle 10** fertig und baut danach nur noch aus — die Kurve zieht deshalb erst ganz am Schluss daran vorbei | Erklärt, warum reine Höhenänderungen nichts bewirken. Gemessen, nicht vermutet. |
| S47 | Bei einer Zwischenmessung führte **mehr** Schaden zu einem schlechteren Ergebnis | Pfadabhängigkeit: früheres Gold ändert die Baureihenfolge. Behoben durch drei abgewandelte Bauverläufe je Messung. Seitdem ist die Kennzahl monoton — vorher wurde seit v13 nach einer springenden Zahl justiert. |
| S43 | Ein Bildschirmfoto zeigte vier Fehler, die zehn grüne Tore nicht gesehen haben: Bedienung über dem Spielfeld, drei überlappende Ebenen, fehlende Umlaute, unsichtbare Bauplätze | Alle behoben und je mit einer Prüfung abgesichert (Bänder im Rauchtest, Ersatzschreibung im Autarkie-Check). Dieselbe Lehre wie S19, nur teurer. |
| S44 | Die Zeichenmessung maß den falschen Höchstfall: bei vollem Feld gibt es keine freien Bauplätze mehr, also auch keine Hervorhebung | Zweiter Messpunkt ergänzt — leeres Feld mit offener Bauauswahl, 815 Befehle je Bild. |
| S41 | Ankerturm und Weber wurden gebaut, gemessen und **zurückgenommen**. Der Ankerturm sprang bei 10 % Änderung der Abklingzeit von 5/20 auf 20/20; der Weber war entweder wirkungslos oder brach die Balance | Ursache ist nicht die Auslegung der beiden, sondern die Kante bei Welle 15. Erst T15, dann erneut versuchen. |
| S42 | Erste Diagnose war Messrauschen — Mittelung über drei Aussaaten eingebaut, alle drei Läufe **identisch bis aufs Goldstück** | Der Spielverlauf enthält keinen ergebniswirksamen Zufall; die Aussaat steuert nur Partikel. Das Werkzeug wurde durch die Robustheitsprobe ersetzt, die die echte Ursache misst. |
| S40 | Mit allen Verbesserungen gewinnt der Meister auf Normal verlustfrei (22/22) | Bewusst so: der Fortschritt soll frühere Inhalte erleichtern, das ist sein Zweck. Die Grenze liegt beim härtesten Grad — dort bleiben 11 von 16, und genau das prüft das Tor. |
| S38 | Frostspalte blieb unspielbar, obwohl sie mit 24,5 Hülle je Gold die **niedrigste** Belastung aller Karten hat (Spiralhain 36,4) | Der Fehler saß in der Geometrie: Bahn 2 war 30 Kacheln lang, Bahn 1 dagegen 47. Die Hälfte der Gegner nahm eine Abkürzung. Neuer Wächter: Bahnen dürfen sich um höchstens 30 % unterscheiden. |
| S39 | Frostspalte hatte anfangs die Schwärmer-Identität, ihr Kristall liegt aber nahe am Rand — Flieger standen kaum unter Feuer | Identität zur Ascheschlucht verschoben. Nicht jede Gegnerart passt auf jede Karte, und das entscheidet die Geometrie, nicht der Geschmack. |
| S36 | Beide neuen Karten waren beim ersten Lauf für **jeden** Spielstil unspielbar, obwohl der Wellenplan derselbe ist | Zwei Zuwege halbieren die Deckung — ein Turm sieht nur eine Seite. Erst Geometrie (längere Wege, frühere Vereinigung), dann ein Ausgleichsfaktor je Karte. |
| S37 | Frostspalte brauchte zunächst einen Ausgleich von 0,34 — außerhalb der Wächtergrenze von 0,4 bis 1,6 | Die Grenze wurde nicht gedehnt, sondern die Karte geändert: Vereinigung vorgezogen, danach reichten 0,62. Die Regel dahinter: braucht eine Karte einen extremeren Ausgleich, stimmt die Karte nicht. |
| S35 | Erbarmungslos war zunächst mit 15 % weniger Einkommen angesetzt — **kein** Spielstil kam durch, auch nicht mit mehr Kristall und milderer Kurve | Das Einkommen ist die empfindlichste Schraube im Spiel: 15 % weniger brechen den Lauf, 30 % mehr Lebenspunkte ändern kaum etwas. Der harte Grad läuft jetzt mit 95 % Einkommen. |
| S34 | Aussehen lässt sich nicht automatisch beurteilen — *Gleichheit* aber schon, und die ist der eigentliche Fehler | Wächter prüft eindeutige Zweig-Bezeichner (daran hängt die Form), Rauchtest prüft, dass für jeden Zweig ein eigenes Bild entsteht. Beide Gegenproben schlagen an. |
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
