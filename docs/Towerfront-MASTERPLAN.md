# Tower Front — Studio-Audit und Masterplan

Messung: v141 · 23.08.2026

**Was das hier ist.** Ein Audit aus dreißig Rollen, ein Produktkonzept und ein
priorisierter Entwicklungsplan in einem Dokument. Es ersetzt keinen der
bisherigen Berichte, sondern setzt darauf auf: `Towerfront-AUDIT-v136.md`
enthält die erste Runde, deren Befunde F1–F7 in v137 bis v141 bereits
abgearbeitet sind.

**Dies ist ein Messbericht.** Er beschreibt absichtlich den Stand von v141.
Was daraus abgearbeitet wird, steht im Rückstandsverzeichnis, nicht hier.

---

## Wie Befunde gekennzeichnet sind

| Marke | Bedeutung |
|---|---|
| **VERIFIED** | Im Quelltext, im Build oder an einer eigenen Messung nachgewiesen. Beleg steht dabei. |
| **DESIGN** | Der Code tut, was er soll — die Entscheidung dahinter erzeugt das Problem. |
| **RECOMMENDATION** | Verbesserung über die Fehlerbehebung hinaus. |
| **MISSING** | System oder Funktion existiert nicht. |
| **NOT VERIFIED** | Konnte mit den vorhandenen Mitteln nicht belastbar geprüft werden. |

Es wurde nichts erfunden. Wo eine Zahl steht, steht daneben, woran sie
gemessen wurde (Regel 12 dieses Projekts).

**Was in dieser Umgebung grundsätzlich nicht prüfbar ist** und deshalb
durchgehend als NOT VERIFIED geführt wird:

* Bildrate, Akkuverbrauch und Speicher auf echter Hardware — hier rechnet
  SwiftShader, eine Software-Rasterung ohne Grafikkarte. Der JavaScript-Anteil
  überträgt, das Rastern nicht.
* Klang: es gibt keine Audioausgabe. Der Synthesecode ist lesbar, sein
  Ergebnis nicht hörbar.
* Haptik (Vibration) — nicht implementiert und nicht prüfbar.
* Bedienung mit echten Daumen, Bildschirmleser, Systemschriftgrößen.

---

# TEIL A — EXECUTIVE SUMMARY

Die zwanzig wichtigsten Erkenntnisse.

1. **Die Technik trägt.** 30 Türme und 97 Gegner gleichzeitig kosten
   **0,072 ms** je Simulationsschritt bei 4 ms Budget. Zielsuche läuft über
   ein Ortsraster, nicht über eine Vollprüfung. Gezeichnet werden 1 271 von
   3 000 erlaubten Befehlen. *(VERIFIED — eigene Lastmessung, Node)*
2. **Die Wegfindung ist strukturell unfehlbar — und strukturell arm.** Ein
   Gegner hat als einzige Zustandsgröße die zurückgelegte Strecke auf einer
   Catmull-Rom-Kurve. Er kann nicht steckenbleiben, nicht zurücklaufen, nicht
   neben die Straße geraten. Es gibt dafür auch kein Umleiten, kein Blockieren,
   kein Labyrinth-Bauen. *(VERIFIED — `src/core/path.ts`, `updateEnemies`)*
3. **Die erste Karte ist die schlechteste.** Auf dem Spiralhain deckt **ein
   einziger Platz 47 %** des gesamten Weges ab, und der mittlere Bauplatz
   deckt **0 %**. Wer die erste Karte spielt, lernt: Ein Turm in der Mitte
   genügt. *(VERIFIED — Rastermessung über 3 476 Punkte)*
4. **Das Geld kommt nicht vom Spielen.** Auf dem Spiralhain stehen **4 545
   Gold Wellenbonus** gegen **1 194 Gold Abschussgold** — 79 % des Einkommens
   bekommt man fürs Überleben, nicht fürs Treffen. *(VERIFIED — Summe über
   alle Wellen)*
5. **Vier Türme, aber ein Sieger.** Schaden je Gold auf der Endstufe:
   Bogenturm 0,322 — Prisma **0,040**. Faktor acht. *(VERIFIED — Turmmatrix)*
6. **Die Ausbauzweige entscheiden nichts.** Simulation über eine ganze Partie:
   Prisma-Verzweigung 30, Prisma-Bündelung 30. Bogen 30/28. *(VERIFIED —
   `npm run sim`)*
7. **Acht Gegnerarten, eine Rolle.** Alle acht laufen und sterben. Kein
   Heiler, kein Beschleuniger, kein Gräber, kein Gegner, der etwas TUT. Die
   einzige Ausnahme ist der Schildträger — und der sitzt an der Wellengruppe,
   nicht an einer Art. *(VERIFIED — `src/data/enemies.ts`)*
8. **Es gibt keinen Boss im Sinne des Genres.** Der Leerentitan hat 682 Leben
   und Panzerung 6. Keine Phasen, keine Mechanik, keine Schwachstelle.
   *(VERIFIED)*
9. **Der Rhythmus fehlt.** Eine Welle kann nicht gerufen werden, solange eine
   läuft. Damit fehlt der wichtigste Hebel des Genres: Risiko gegen Gold.
   *(VERIFIED — `canStartWave`)*
10. **Geschosse verschwinden, wenn ihr Ziel stirbt.** Kein Einschlag, kein
    Ersatzziel, kein Schaden — der Schuss ist ersatzlos weg. *(VERIFIED —
    `updateProjectiles`)*
11. **Geschosse starten in der Turmmitte, nicht am Lauf.** *(VERIFIED —
    `makeProjectile`: `p.x = t.x; p.y = t.y`)*
12. **Es gibt keinen Fortschritt.** Keine Karte ist gesperrt, kein Grad ist
    gesperrt, fünf dauerhafte Verbesserungen kosten zusammen 14 von 27
    erreichbaren Sternen. *(VERIFIED)*
13. **Die Szene hat seit v140 Tiefe** — ein Gegner hinter einem Turm ist zu
    87 % verdeckt. Vorher zu 0 %. Das war der größte Einzelhebel für den
    Raumeindruck und ist erledigt. *(VERIFIED — Bildtor)*
14. **Die Kamerawinkel sind uneinheitlich.** Untergrund rund 55–60°, Türme aus
    verschiedenen Winkeln gerendert, Gegner als Aufsichten. Das ist der größte
    verbliebene Posten der Beschwerde „zusammengewürfelt". *(DESIGN — am Bild
    beurteilt, nicht gemessen)*
15. **Es gibt keine Art Bible.** Kein Dokument legt Kamera, Licht, Material,
    Palette, Maßstab und Detailgrad verbindlich fest. Deshalb ist jede neue
    Figur eine neue Entscheidung. *(MISSING)*
16. **Es gibt keine Telemetrie.** Kein Ereignis wird mitgeschrieben. Jede
    Balance-Aussage stammt aus einer Simulation mit drei fest verdrahteten
    Spielstilen, nicht aus echtem Spielverhalten. *(MISSING)*
17. **Es gibt keinen Klangteppich.** 18 Effektklänge, synthetisch, sauber
    gebaut — aber keine Musik, kein Ambiente, keine Wellenanspannung.
    *(VERIFIED — `src/core/audio.ts`)*
18. **Barrierefreiheit ist nicht angefangen.** Gegner unterscheiden sich fast
    nur über Farbe, es gibt keine Schriftgrößenwahl und keinen Modus mit
    weniger Effekten. Immerhin: `prefers-reduced-motion` wird respektiert.
    *(VERIFIED)*
19. **Die Prüfkette ist außergewöhnlich.** 20 Tore, 98 stehende Gegenproben,
    jede davon nachweislich scharf. Das ist die stärkste Einzelqualität des
    Projekts und der Grund, warum große Umbauten überhaupt zumutbar sind.
20. **Der Umfang ist ein Zehntel.** Drei Karten, vier Türme, acht Gegner, vier
    Fähigkeiten, 15 Wellen. Ein Genrevertreter der Zielklasse bringt 15–25
    Stufen, 8–12 Türme, 20+ Gegnerarten und Bosse mit eigenen Regeln mit.

---

# TEIL B — DIE ZEHN GRÖSSTEN PROBLEME

| # | Problem | Typ | Wirkung |
|---|---|---|---|
| 1 | **Gegner erzwingen keine Entscheidung.** Acht Arten mit anderen Zahlen, aber gleichem Verhalten. | DESIGN | Der Spieler baut mehr Schaden statt anderer Türme. Die ganze Counter-Ebene des Genres fehlt. |
| 2 | **Der Spiralhain macht die Strategie trivial.** Ein Platz deckt 47 %. | VERIFIED | Die erste Karte lehrt das Falsche. |
| 3 | **Kein Wellenruf während einer Welle.** | VERIFIED | Kein Risiko-gegen-Gold, kein Tempo, halbe Spielzeit ist Zusehen. |
| 4 | **Kein Fortschritt, keine Freischaltung, kein Ziel.** | MISSING | Kein Grund für eine zweite Partie. |
| 5 | **Die Ausbauzweige sind austauschbar.** | VERIFIED | Die zentrale Entscheidung des Turmbaus ist folgenlos. |
| 6 | **Uneinheitliche Kamerawinkel und Materialsprachen.** | DESIGN | „Zusammengewürfelt" — der Haupteindruck des Auftraggebers. |
| 7 | **Kein Boss im Genresinn.** | MISSING | Keine Dramaturgie, kein Höhepunkt. |
| 8 | **Wirtschaft belohnt Zeit statt Können.** 79 % Wellenbonus. | VERIFIED | Gutes Spielen zahlt sich kaum aus. |
| 9 | **Kein Turm hat eine unverwechselbare Rolle.** Drei von vier treffen Luft, alle vier schießen dauernd. | DESIGN | Keine Aufstellungsentscheidung. |
| 10 | **Keine Art Bible, keine Telemetrie, kein Debug-Overlay im Spiel.** | MISSING | Jede weitere Entscheidung wird wieder einzeln getroffen statt aus einem System heraus. |

---

# TEIL C — TECHNICAL ARCHITECTURE AUDIT

## Was gut funktioniert

* **Der Spielzustand ist deterministisch und vollständig sicherbar.** Ein
  eigenes Tor (`npm run determinism`) prüft, dass derselbe Spielstand denselben
  Verlauf ergibt. Das ist für ein Spiel dieser Größe ungewöhnlich diszipliniert.
* **Zeitschritt sauber getrennt:** `dtReal` für Rückmeldung und Effekte, `dt =
  dtReal * speed` für die Welt. Tempo 1×/2×/3× ändert die Simulation, nicht die
  Bedienung.
* **Objektvorrat statt Neuanlage** (`Pool`) für Geschosse, Teilchen, Ringe —
  kein Müllsammler-Druck in Gefechten.
* **Ortsraster** (`SpatialGrid`) für Zielsuche und Flächenschaden.
* **Zeichnung und Menü getrennt**, Menü auf der Leinwand statt in HTML —
  dadurch überhaupt prüfbar.

## Was problematisch ist

**C1 — `GameState` ist ein Gemischtwarenladen. (DESIGN, P1)**
1 719 Zeilen, 55 Methoden, 25 Felder. Eine Klasse trägt Kartenladen,
Bauregeln, Wirtschaft, Wellenplan, Zielsuche, Geschossflug, Schadensrechnung,
Fähigkeiten, Spielstand **und die Effektwerkstatt** (`float`, `ring`, `smoke`,
`debris`, `spark`).

Das ist der Grund, warum die antippbare Zierde in v134 beinahe den Spielwürfel
bewegt hätte. Die Regel „das Modell darf nicht vom Gemessenen abhängen" wird
heute von Hand durchgesetzt, nicht von der Struktur.

**Vorschlag:** `Sim` (deterministisch, würfelt aus `rng`) und `Fx`
(darstellend, würfelt aus `zierRng`, gibt nichts zurück). Aus einer Regel wird
eine Bauart.

**C2 — `Renderer` ist eine Wand. (DESIGN, P2)**
2 200 Zeilen. Nach dem Umbau in v140 ist die Szenenliste da, aber jede Figur
bringt weiterhin ihre eigene Schatten-, Licht- und Auswahllogik mit.

**C3 — Kein Ereignissystem. (MISSING, P2)**
Zustandsänderungen werden von außen gepollt (`ui.sync()` vergleicht eine
Signatur). Für Telemetrie, Erfolge, Tutorial-Auslöser und Klang braucht es
Ereignisse: `enemyKilled`, `towerBuilt`, `waveStarted`, `leak`, `bossPhase`.
Ohne sie wird jede dieser Funktionen wieder ein Polling.

**C4 — Kein Szenensystem. (DESIGN, P3)**
Menü und Spiel sind zwei Zustände in `main.ts`, verbunden über Rückrufe und
`renderer.menu = null`. Für fünf Bildschirme trägt das; für zwanzig nicht.

**C5 — Prüf-Schnittstellen im Auslieferungscode. (VERIFIED, P4)**
`spawnZumPruefen`, `trefferZumPruefen`, `spawnsJeBahn`, `spawnsTrotzSperre`.

## Trägt diese Architektur ein großes Tower-Defense-Spiel?

**Ja, mit zwei Einschränkungen.**

Rechenlast, Determinismus, Spielstand und Datenhaltung tragen ohne Weiteres
zwanzig Karten und hundert Wellen — die Daten sind sauber getrennt
(`src/data/`), die Simulation kostet 2 % ihres Budgets.

Nicht tragen werden:

* **Statuseffekte über die Bremse hinaus.** Es gibt kein
  Effektsystem — `slowFactor` und `slowLeft` sind zwei Felder am Gegner. Brand,
  Gift, Betäubung, Panzerbruch, Verstärkung bräuchten jeweils zwei weitere.
  Das muss vor dem fünften Effekt zu einer Liste von Effekten werden.
* **Turmfähigkeiten, die nicht „schieß auf ein Ziel" sind.** Der
  Angriffstyp ist eine Aufzählung mit vier Werten und einer `if`-Kette in
  `updateTowers`. Ein Unterstützungsturm, ein Minenleger, ein Turm mit
  Mindestreichweite passen dort nicht hinein, ohne dass die Kette wächst.

---

# TEIL D — CODE QUALITY AUDIT

| ID | Befund | Typ | Prio |
|---|---|---|---|
| D1 | `GameState` mischt Simulation und Effekte (siehe C1) | DESIGN | P1 |
| D2 | Kein Effektsystem — Statuseffekte sind Einzelfelder | MISSING | P1 |
| D3 | Angriffsarten als `if`-Kette in `updateTowers` | DESIGN | P2 |
| D4 | Kein Ereignissystem | MISSING | P2 |
| D5 | `topdown` trägt bei allen acht Gegnern denselben Wert; der Renderer hält den toten Zweig für Seitenansichten vor | VERIFIED | P3 |
| D6 | `TowerLevel.range` wird immer überschrieben, ist also totes Feld | VERIFIED | P4 |
| D7 | `bakeTowerLayer` legt eine 1920 × 1080-Leinwand an, die im Browser immer leer bleibt (Rückfallweg für noch nicht dekodierte Bilder) | VERIFIED | P3 |
| D8 | `Math.random()` im Renderer (Bildwackeln) — ohne Spielwirkung, aber gegen die eigene Würfeldoktrin | VERIFIED | P4 |
| D9 | Drei überlagerte, teils veraltete Kommentarblöcke in `SaveGame` | VERIFIED | P4 |
| D10 | Keine Einheitentests im üblichen Sinn — die Absicherung läuft vollständig über Tore und Gegenproben | DESIGN | P3 |
| D11 | Kein Logging, kein Debug-Overlay im Spiel außer `#messung` | MISSING | P2 |

**Ausdrücklich nicht gefunden:** kein `any` in `src/`, keine `@ts-ignore`,
keine leeren `catch`-Blöcke, keine globalen Zustände außer den bewusst
gewählten Singletons (`Sfx`, Speicher), keine offensichtlichen
Ereignis-Lecks (alle `addEventListener` hängen an dauerhaften Elementen).
Magische Zahlen gibt es reichlich — aber fast alle tragen einen Kommentar mit
Begründung und Messstelle, was sie zu Konstanten mit Herkunft macht.

**Hart kodierte Werte:** Turmwerte, Gegnerwerte und Wellenpläne stehen
vollständig in `src/data/` und nicht im Code. Das ist richtig gelöst.

---

# TEIL E — PATHFINDING AUDIT

## Verfahren

Kein A*, kein Flussfeld, kein Navigationsraster. Jede Bahn ist eine
**Catmull-Rom-Kurve** durch handgesetzte Kontrollpunkte, einmal dicht
abgetastet, mit einer Tabelle der Bogenlänge. Ein Gegner trägt genau eine
Zustandsgröße: `travelled`.

## Die Prüfliste des Auftrags, Punkt für Punkt

| Frage | Antwort | Beleg |
|---|---|---|
| Bleiben Gegner auf dem sichtbaren Weg? | **Ja.** Der Querversatz ist auf `p.half − radius·0,55 − 4` begrenzt, also auf die halbe Wegbreite abzüglich des eigenen Körpers. | `updateEnemies` |
| Schneiden Gegner Kurven ab? | **Nein.** Sie folgen der Bogenlänge, nicht einer Zielrichtung. | `LanePath.at` |
| Laufen sie optisch neben der Straße? | **Nein**, solange die Kontrollpunkte im Bild stimmen. Geprüft wird das von `npm run zielplatte` nur für das Ziel, nicht für den ganzen Verlauf. | NOT VERIFIED für den ganzen Verlauf |
| Können Gegner steckenbleiben? | **Nein.** Es gibt keinen Zustand, in dem `travelled` nicht wächst. | strukturell |
| Können Gegner zurücklaufen? | **Nein.** | strukturell |
| Können sie zwischen Punkten springen? | **Nein.** | strukturell |
| Benutzen große Gegner Wege korrekt? | **Ja**, sie rücken in Engstellen zusammen. Der Leerentitan ist 102 Weltpunkte breit, die engste Stelle 80 — er ragt also über den Rand. | VERIFIED, siehe E3 |
| Verhalten sich Flieger korrekt? | **Ja.** Luftlinie zum Kristall, eigener Fortschrittsmaßstab, damit „vorderstes Ziel" für beide dasselbe heißt. | `updateEnemies` |
| Funktioniert die Wegfindung bei mehreren Pfaden? | **Ja**, drei Bahnen auf der Ascheschlucht, reihum bedient. | `startWave` |

## Befunde

**E1 — Kein dynamisches Blockieren. (MISSING, P3)**
Türme sperren keinen Weg, es gibt kein Labyrinth-Bauen. Das ist eine
**legitime Designentscheidung** (feste Wege, Kingdom-Rush-Schule statt
Bloons-Schule) — aber sie ist nirgends aufgeschrieben, und sie schließt eine
ganze Klasse von Karten aus. Sie gehört in die Design Pillars.

**E2 — Kein Umleiten, kein Ersatzweg. (MISSING, P3)**
Das Tor auf der Ascheschlucht sperrt nur das **Erscheinen**, nicht den Weg.
Damit ist die einzige dynamische Wegänderung im Spiel ein Spawn-Takt.

**E3 — Der Leerentitan ist breiter als die engste Straße. (VERIFIED, P2)**
Gezeichnet 102 Weltpunkte, engste Wegstelle 80. Er ragt über den Rand.
Der Wächter kennt eine Obergrenze von 108, prüft also die Zeichengröße gegen
die engste Stelle — aber mit einem Wert, der oberhalb der Straßenbreite liegt.

**E4 — Die Bahnbelegung ist reihum, nicht taktisch. (DESIGN, P3)**
`laneTurn` verteilt Gegner abwechselnd. Eine Welle, die absichtlich alles auf
eine Bahn wirft, ist im Datenformat nicht ausdrückbar.

## Path Visibility

**E5 — Es gibt keine Wegvorschau. (MISSING, P1)**
Der Spieler sieht das Tor (`drawPortal`) und den Kristall. Er sieht **nicht**,
welchen Weg die Gegner nehmen, wenn der Weg im Kartenbild mehrdeutig ist —
und auf der Ascheschlucht mit drei Bahnen ist er das. Keine Pfeile, keine
Laufrichtung, keine Vorschau.

**E6 — Wegkontrast ist Sache des Kartenbildes. (DESIGN, P2)**
Auf dem Spiralhain ist der Weg heller Stein auf braunem Grund — sehr gut
lesbar, aber er füllt die halbe Fläche und liest sich als Schaltplan. Auf der
Ascheschlucht ist er heller Stein auf dunkler Asche — ebenfalls gut. Es gibt
keine Prüfung, die das für eine vierte Karte sicherstellt.

---

# TEIL F — TOWER PLACEMENT AUDIT

## Verfahren

Freies Bauen auf einem 8-Punkte-Raster (`BUILD_SNAP`), begrenzt durch:
Feldrand, Wegabstand (`PATH_CLEARANCE`), unwegsames Gelände (`map.rough`) und
Nachbartürme (Summe der halben Platzbedarfe + 4).

`warumNicht()` liefert den Grund als Wort: `Rand`, `Weg`, `Gelände`, `Turm`.
`einrasten()` sucht bei einem abgelehnten Tipp in sechs Ringen × 16 Winkeln
den nächsten erlaubten Platz.

## Was gut ist

* Der Grund der Ablehnung wird **benannt**, nicht nur angezeigt.
* Das Einrasten ist deterministisch und in der Torkette abgesichert.
* Seit v139 ist der Platzbedarf je Turmsorte gestaffelt (96/100/106/116) und
  von der Zeichengröße entkoppelt.

## Befunde

**F1 — Bauplätze erscheinen auf dem Telefon nur unter dem Finger. (VERIFIED, P0)**
`hoverPoint` wird nur für Nicht-Touch-Zeiger gesetzt. Wer eine Turmart antippt
und dann aufs Feld schaut, sieht nichts. Das ist der letzte große
Verständlichkeitsbefund und der einzige verbliebene P0.

**F2 — Der Bauring lügt über den Platzbedarf. (VERIFIED, P2)**
`drawGhost` zeichnet `def.footprint / 2` als Kreis. Der tatsächliche
Mindestabstand ist aber `(footprint_a + footprint_b) / 2 + 4` — also
abhängig vom **Nachbarn**. Zwei Ringe, die sich nicht berühren, können
trotzdem abgelehnt werden.

**F3 — Keine Kostenanzeige an der Vorschau. (MISSING, P2)**
Kosten stehen im Bauknopf und im Prüfsteg, nicht an der Bauvorschau. Wer den
Finger auf dem Feld hat, sieht weder Preis noch Restgold.

**F4 — Kein Bauplatz-Ranking. (MISSING, P3)**
Das Werkzeug `candidateSpots` bewertet Plätze nach abgedeckter Wegstrecke —
das Spiel zeigt davon nichts. Eine dezente Andeutung guter Stellen wäre die
kleinste ehrliche Hilfe für neue Spieler.

## Placement Strategy

**F5 — Die Karten erzeugen zu wenig Geometrie. (DESIGN, P1)**
Gemessen mit Reichweite 326 über ein 24-Punkte-Raster:

| Karte | baubar | bester Platz | Plätze über 70 % davon | Median-Platz |
|---|---|---|---|---|
| Spiralhain | 54 % | **47 % des Weges** | 185 (10 %) | **0 %** |
| Ascheschlucht | 27 % | 26 % | 127 (13 %) | 9 % |
| Frostspalte | 34 % | 31 % | 157 (13 %) | 10 % |

Der Spiralhain ist bimodal: ein paar Götterplätze, und die Hälfte aller
Bauplätze deckt **gar nichts** ab. Genau das erzeugt das Bild aus dem
Spielbericht — zwölf Türme in einem Klumpen, die linke Bildhälfte leer.

---

# TEIL G — TARGETING / COMBAT AUDIT

## Verfahren

Ziel wird alle **120 ms** neu gesucht, oder sofort, wenn es tot oder außer
Reichweite ist. Die Suche geht über das Ortsraster. Vier Modi je Turm:
`vorn` (größte Strecke), `stark` (meiste Leben), `schwach`, `nah`.

## Befunde

**G1 — Geschosse verschwinden, wenn das Ziel im Flug stirbt. (VERIFIED, P1)**
```
const tgt = p.target && !p.target.dead ? p.target : null;
if (!tgt) { p.dead = true; ... }
```
Kein Ersatzziel, kein Weiterflug, kein Einschlag, kein Schaden. Bei
schnellfeuernden Türmen auf schwache Gegner ist das messbarer Verlust und
sichtbares Verschwinden mitten in der Luft.

**Empfohlen, nach Waffentyp:** Bogen (zielsuchend) → nächstes Ziel in
Flugrichtung; Mörser (ballistisch) → fliegt ohnehin auf einen Punkt und
explodiert dort, richtig so; Prisma (sofort) → betrifft es nicht.

**G2 — Geschosse starten in der Turmmitte. (VERIFIED, P2)**
`p.x = t.x; p.y = t.y` — nicht an der Mündung. Bei einem 127 Punkte breiten
Turm sind das rund 30–40 Weltpunkte Versatz, sichtbar besonders beim Mörser.

**G3 — Türme feuern, bevor sie ausgerichtet sind. (VERIFIED, P4)**
Gemessen über 27 Schüsse: im Mittel **2,4°** daneben, schlimmstenfalls 6,2°.
Die Drehung (12 rad/s) ist schnell genug, dass es praktisch kaum auffällt.
Kein dringender Handlungsbedarf — aber die Kombination aus G2 und G3 ist der
Grund, warum Schüsse „aus dem Turm" statt „aus dem Rohr" kommen.

**G4 — Nur vier Zielmodi, und einer fehlt, der zählt. (MISSING, P3)**
Es fehlt **`hinten`** (letzter Gegner) — der Modus, mit dem man Durchbrecher
abfängt. Ebenso fehlen `am schnellsten`, `fliegend zuerst`, `Boss zuerst`.

**G5 — Die Zielwahl ist nicht sichtbar am Turm. (MISSING, P3)**
Vier Knöpfe im Prüfsteg, aber am Turm selbst zeigt nichts, welcher Modus
aktiv ist und worauf er gerade zielt.

**G6 — Keine Vorhaltekorrektur für zielsuchende Geschosse.** Richtig so — sie
suchen. *(kein Befund, nur zur Klarstellung)*

**G7 — Kein Überschuss-Schutz. (DESIGN, P3)**
Mehrere Türme können gleichzeitig auf denselben Gegner feuern, der schon tot
ist, bevor die Hälfte ankommt. Zusammen mit G1 verschwindet dieser Schaden
ersatzlos.

## Damage System

Sauber und erklärbar:

* **Panzerung** nimmt einen **Anteil**: 11 % je Punkt, gedeckelt bei 66 %.
  `pierce` zieht vorher ab. Ausdrücklich als Anteil gebaut, weil ein fester
  Abzug über sechs Ausbaustufen bedeutungslos wird.
* **Schild** schluckt ganze **Treffer**, nicht Schaden — gegen Panzerung hilft
  Wucht, gegen Schild Schnellfeuer.
* **Bremse** stapelt nicht, sie nimmt das Maximum. `slowResist` je Gegnerart.

**G8 — Es gibt sonst nichts. (MISSING, P1)**
Kein Brand, kein Gift, keine Betäubung, kein Panzerbruch, keine Verstärkung,
keine kritischen Treffer, keine Schadensarten und damit auch keine
Resistenzen. Zwei Statuswirkungen im ganzen Spiel.

---

# TEIL H — CORE GAMEPLAY AUDIT

Der Kernkreis lautet im Genre: *Welle lesen → Gefahr erkennen → Ressourcen
bewerten → Turm setzen → Stellung verbessern → beobachten → anpassen →
überstehen → belohnt werden.*

**Was davon heute trägt:**

| Schritt | Zustand |
|---|---|
| Welle lesen | Vorschau zeigt Art und Anzahl der nächsten Welle. **Funktioniert.** |
| Gefahr erkennen | Nur über den Namen der Gegnerart. Keine Warnung vor Luft, Panzerung, Schild. **Halb.** |
| Ressourcen bewerten | Gold und Kosten sichtbar. **Funktioniert.** |
| Turm setzen | Seit v139/v141 verständlich — außer F1 (Bauplätze). **Fast.** |
| Stellung verbessern | Ausbau funktioniert, aber die Zweigwahl ist folgenlos. **Halb.** |
| Beobachten | Man sieht Treffer und Bremse. Man sieht **nicht**, warum ein Turm schlecht wirkt. **Halb.** |
| Anpassen | Türme lassen sich zwischen Wellen versetzen und verkaufen. **Funktioniert.** |
| Überstehen | Ja. |
| Belohnt werden | Gold, Sterne, Ergebnisbildschirm. **Funktioniert.** |

**H1 — Der Kernkreis dreht sich, aber er dreht sich ohne Widerstand.
(DESIGN, P0)**
Die Entscheidungsdichte ist gering: welchen Turm baue ich (vier), wo (viele
Plätze, wenige gute), welchen Zweig (folgenlos). Es gibt keinen Zeitpunkt, an
dem eine falsche Entscheidung sofort weh tut und eine richtige sofort trägt.

**H2 — Die Hälfte der Spielzeit ist Zusehen. (VERIFIED, P1)**
213 Sekunden Ausschüttung über 15 Wellen. Ein Gegner braucht 13 Sekunden für
die Bahn, eine Welle schüttet 14 Sekunden lang aus — der Rest ist Warten auf
den letzten Läufer.

**H3 — Macht der Kernkreis ohne Meta-Fortschritt Spaß?**
**Noch nicht.** Er ist verständlich und fair, aber er stellt zu selten eine
Frage. Das ist das eigentliche Ergebnis dieses Audits.

---

# TEIL I — TOWER DESIGN AUDIT

## Rollenmatrix (gemessen, Endstufe Zweig A)

| Turm | Einzelziel | Fläche | Reichweite | Feuerrate | Kontrolle | Luft | Panzerbruch | Unterstützung | DPS/Gold |
|---|---|---|---|---|---|---|---|---|---|
| Bogenturm | ●●● | – | mittel 600 | hoch | – | ja | ●● | – | **0,322** |
| Frostturm | ● | ●● (Umkreis) | kurz 441 | mittel | ●●● | ja | ● | – | 0,127 |
| Mörser | ● | ●●● | weit 794 | niedrig | – | **nein** | ●●● | – | 0,085 |
| Prisma | ●● | ●● (Kette) | mittel 564 | mittel | – | ja | ● | – | **0,040** |

## Befunde

**I1 — Der Bogenturm ist achtmal so gold-effizient wie das Prisma.
(VERIFIED, P1)**
Das lässt sich teilweise mit Flächenwert rechtfertigen — aber nicht um
Faktor acht.

**I2 — Drei von vier Türmen treffen Luft. (DESIGN, P2)**
Damit ist „Flieger kommen" fast keine Frage. Nur der Mörser ist ausgeschlossen.
Im Genre ist Luftabwehr eine eigene Entscheidung.

**I3 — Es fehlen ganze Rollen. (MISSING, P1)**
Kein Unterstützungsturm (Verstärkung von Nachbarn), kein Turm mit
Mindestreichweite, kein Turm mit Sichtbarmachung (gegen Tarnung, die es auch
nicht gibt), kein Bodenturm, der Gegner aufhält, kein Minenleger, kein
Scharfschütze mit Aufladung. Vier Türme sind für den Zielumfang zu wenig;
**sechs bis acht** mit klar getrennten Rollen sind das Minimum.

**I4 — Die Zweige ändern Zahlen, keine Regeln. (DESIGN, P1)**
Alle zehn Zweigstufen ändern Schaden, Takt, Radius, Sprünge, Durchschlag.
**Keiner** ändert das Verhalten: kein Zweig gibt einen neuen Effekt, kein
Zweig ändert die Zielart, kein Zweig fügt eine zweite Waffe hinzu.
Gemessen ist das Ergebnis: zwei von vier Zweigpaaren sind im Ausgang
identisch.

**I5 — Ausbaustufen sind visuell da, aber nicht lesbar gestaffelt.
(DESIGN, P2)**
Jede Stufe hat ein eigenes Bild, und ein Farbring am Fuß markiert den Zweig.
Aber ein Spieler kann Stufe 3 und Stufe 5 nebeneinander nicht sicher
unterscheiden — es fehlt eine klare Zeichensprache (Zahl der Läufe, Zahl der
Plattformen, Energieelemente).

**I6 — Fünf Fragen je Turm, heute:**

| Frage | Bogen | Frost | Mörser | Prisma |
|---|---|---|---|---|
| Eindeutige Rolle? | ja | ja | ja | **nein** (Kette ohne eigene Antwort) |
| Wogegen besonders gut? | alles | schnelle Pulks | Gruppen, Panzer | Pulks |
| Wogegen schwach? | **nichts** | Panzer | Luft | Panzer, Einzelziele |
| Warum statt eines anderen? | billigste DPS | Kontrolle | Fläche + Panzerbruch | **unklar** |
| Wie ändert der Ausbau die Rolle? | gar nicht | gar nicht | gar nicht | gar nicht |

---

# TEIL J — ENEMY DESIGN AUDIT

## Matrix (gemessen)

| Gegner | HP | Tempo | Panzer | Bremsschutz | Gold | Leck | Zeit bis tot (Bogen L1) | Erzwingt … |
|---|---|---|---|---|---|---|---|---|
| Schleicher | 34 | 114 | 0 | 0 | 2 | 1 | 2,3 s | nichts |
| Späher | 24 | 206 | 0 | 0 | 2 | 1 | 1,7 s | frühe Abdeckung |
| Infanterie | 52 | 96 | 1 | 0,10 | 3 | 1 | 4,0 s | nichts |
| Koloss | 150 | 74 | 3 | 0,30 | 7 | 3 | 15,4 s | Panzerbruch |
| Gleiter | 62 | 142 | 0 | 0,20 | 4 | 2 | 4,3 s | **Luftabwehr** |
| Spalter | 130 | 94 | 1 | 0,15 | 6 | 2 | 10,0 s | Fläche |
| Span | 40 | 178 | 0 | 0 | 1 | 1 | 2,8 s | nichts |
| Leerentitan | 682 | 53 | 6 | 0,55 | 48 | 5 | 137,9 s | Wucht |

## Befunde

**J1 — Fünf von acht Gegnern erzwingen keine Entscheidung. (DESIGN, P0)**
Schleicher, Infanterie, Span und in der Praxis auch der Späher unterscheiden
sich nur in Zahlen. Die Regel des Auftrags lautet: *Wenn die Antwort nur
lautet „ich brauche mehr Schaden", ist der Gegner nicht interessant genug.*
Das trifft hier auf die Mehrheit zu.

**J2 — Es fehlen die tragenden Archetypen. (MISSING, P0)**
Kein Heiler, kein Verstärker, kein Getarnter, kein Gräber, kein Gegner mit
Fernangriff auf Türme, kein Schildgenerator als eigene Art, kein
Regenerierer, kein Sprinter mit Schub, kein Gegner, der die Bahn wechselt.

**J3 — Die Farbwelt ist ein Regenbogen. (DESIGN, P2)**
Violett, Olivgrün, Rot, Hellblau, Grün, Orange, Gelb, Violett. Acht
unabhängige Bunttöne ohne Fraktionslogik. Ein Spieler kann daraus keine
Familie lesen.

**J4 — Die Namen sind uneinheitlich. (DESIGN, P3)**
Sieben Fantasienamen („Schleicher", „Koloss", „Leerentitan") und einer aus der
Militärsprache („Infanterie").

**J5 — Silhouetten sind besser als ihr Ruf. (VERIFIED)**
Gezeichnet sind die Gegner 30–45 Bildschirmpunkte breit (nicht 12–30, das war
der Trefferradius). `enemyArtWidth` zieht die kleinen zusammen. Die
Unterscheidbarkeit scheitert nicht an der Größe, sondern an J3 und daran, dass
alle acht dieselbe Grundform haben: ein Panzertier von oben.

**J6 — Alle Gegner bewegen sich gleich. (DESIGN, P2)**
Dieselbe gleichmäßige Fahrt entlang der Kurve, dieselbe leichte Wackelbewegung
(`wobble`). Kein Stampfen, kein Hüpfen, kein Schweben, kein Schlängeln.
Bewegung ist im Genre ein Leseschlüssel, und er ist ungenutzt.

---

# TEIL K — COUNTER & SYNERGY AUDIT

**K1 — Es gibt genau zwei echte Konter. (VERIFIED, P0)**

1. **Luft** → nur der Mörser fällt aus. Drei von vier Türmen treffen Luft.
2. **Panzerung** → `pierce` hilft, und der Mörser-Brecher-Zweig hat am meisten.

Und eine dritte Halbierung: **Schild** → Schnellfeuer statt Wucht. Das ist
sauber gebaut und tatsächlich die interessanteste Mechanik im Spiel.

**K2 — Es gibt keine Synergien zwischen Türmen. (MISSING, P1)**
Kein Turm verstärkt einen anderen. Der Frostturm bremst, was allen nützt —
aber das ist Nebenwirkung, keine Absicht. Es gibt keine Kombination, die mehr
ist als die Summe.

**K3 — Es gibt keinen dominanten Turm im Sinne von „gewinnt allein" —
aber einen dominanten Wert.** Die Simulation zeigt: gemischte Felder gewinnen,
reine nicht. Das ist gut. Zugleich ist die Gold-Effizienz des Bogenturms so
hoch, dass „viele Bogentürme plus ein Frostturm" fast immer trägt.

---

# TEIL L — WAVE / ENCOUNTER AUDIT

## Was da ist

15 Wellen je Karte, eigene Pläne je Karte, Gruppen mit Verzögerung und
Abstand, ein Dichtefaktor, der mit der Wellennummer steigt, Notizen für die
Vorschau, Schilde und Schildträger an Wellengruppen.

## Befunde

**L1 — Die Dramaturgie fehlt. (DESIGN, P1)**
Der Aufbau ist *mehr davon*: Welle 7 hat 29 Schleicher, Welle 10 hat 39
Schleicher plus 25 Späher. Das ist Menge, keine Steigerung. Der vom Auftrag
vorgeschlagene Rhythmus — Lernen, Prüfen, Steigern, Belohnen, Verbinden, Boss —
ist in Ansätzen da (Welle 5 führt den Koloss ein, Welle 8 den Schild), aber
nicht durchgezogen.

**L2 — Keine Erholungswelle, keine Wirtschaftswelle. (MISSING, P2)**
Es gibt keine Welle, die bewusst leicht ist, damit der Spieler aufbaut, und
keine, die viel Gold bringt.

**L3 — 361 Gegner je Partie sind zu viele für 15 Wellen. (DESIGN, P2)**
Das sind 24 je Welle im Schnitt, aber die Verteilung ist extrem: Welle 1 hat
sechs, Welle 10 hat 71. Am Ende ist es ein Strom identischer Figuren.

**L4 — Die Wellenvorschau nennt nur die erste Gruppe. (VERIFIED, P2)**
Im HUD steht „6× Erste Fühler". Bei Welle 8 mit drei Gruppen sieht der Spieler
nur eine davon. Panzerung, Schild und Luft werden nicht angekündigt.

**L5 — Kein Wellenruf während einer Welle. (VERIFIED, P1)**
Siehe H2. Der Frühstart-Bonus greift nur in der Lücke.

---

# TEIL M — MAP / LEVEL DESIGN AUDIT

## Die drei Fragen des Auftrags, je Karte

**Spiralhain**
* *Warum strategisch anders?* — Ist er nicht. Ein Weg, viel Platz, ein
  Götterplatz in der Mitte.
* *Welche Turmkombination wird hier interessant?* — Keine. Alles funktioniert.
* *Welche Gegnermechanik zwingt zur Anpassung?* — Der erste Gleiter in Welle 7,
  wenn der Spieler nur Mörser gebaut hat. Sonst nichts.
* **Urteil: neuer Content, kein neues Gameplay.**

**Ascheschlucht**
* *Warum anders?* — Drei Zuwege, die sich früh vereinen, plus ein Tor, das
  einen Zuweg im Takt sperrt. Das ist eine echte eigene Frage.
* *Welche Kombination?* — Etwas hinter der Vereinigung, wo alles durchmuss.
* *Welche Mechanik?* — Das Tor verschiebt den Druck.
* **Urteil: trägt.**

**Frostspalte**
* *Warum anders?* — Späte Vereinigung, weniger Platz (34 % baubar).
* *Welche Kombination?* — Zwei getrennte Stellungen statt einer.
* *Welche Mechanik?* — Keine eigene.
* **Urteil: halb.**

## Befunde

**M1 — Der Spiralhain ist als erste Karte falsch gebaut. (VERIFIED, P0)**
1 505 Weltpunkte Weg gegen 6 239 auf der zweiten Karte. Ein Platz deckt 47 %.
Der mittlere Bauplatz deckt 0 %. Die Karte, die alles lehrt, lehrt: *ein Turm
in der Mitte genügt.*

**M2 — Es gibt keine Höhenunterschiede, keine Sichtlinien, keine
Geländevorteile. (MISSING, P2)**
`map.rough` ist eine reine Bausperre. Es gibt keinen Platz, der mehr
Reichweite gibt, keinen, der Sicht blockiert, keinen mit Risiko.

**M3 — Es gibt keinen Kreuzungstyp und keine getrennten Zielpunkte.
(MISSING, P3)**
Alle Bahnen enden am selben Kristall. Eine Karte mit zwei Zielen oder einer
Kreuzung, die den Weg teilt, fehlt.

**M4 — Karten unterscheiden sich in Zahlen (`hpMul`, `goldMul`), nicht in
Regeln. (DESIGN, P2)**

---

# TEIL N — BOSS AUDIT

**N1 — Es gibt keinen Boss. (MISSING, P1)**
Der Leerentitan ist ein Gegner mit `boss: true`, 682 Leben, Panzerung 6,
Bremsschutz 0,55, größerem Bild, Leuchten und Wackeln des Bildes bei seinem
Tod. Er hat **keine Phase, keine Mechanik, keine Schwachstelle, keine
Ankündigung über die Wellennotiz hinaus**.

Damit fehlt dem Spiel jeder Höhepunkt. Nach dem Auftrag ist genau das der
Punkt: *sehr viele Lebenspunkte sind keine Bossmechanik.*

**Was ein Boss hier haben müsste** (Vorschlag, nicht Befund): eine angekündigte
Phase bei 66 % und 33 % Leben, eine sichtbare Schwachstelle, die nur aus einer
Richtung zu treffen ist, und **eine** Fähigkeit, die den Spieler zwingt, seine
Aufstellung zu ändern — etwa: er schaltet den nächststehenden Turm für sechs
Sekunden ab.

---

# TEIL O — ECONOMY / BALANCING AUDIT

## Die Zahlen

| | Spiralhain, Normal |
|---|---|
| Startgold | 220 |
| Abschussgold gesamt | 1 194 |
| Wellenbonus gesamt | 4 545 |
| Frühstartbonus maximal | 14 × 30 = 420 |
| **Gesamteinkommen** | **rund 6 400** |
| Ein Bogenturm bis Endstufe | 1 205 |
| Verkaufswert Endstufe | 843 (70 %) |

## Befunde

**O1 — 79 % des Einkommens kommt vom Überleben, nicht vom Spielen.
(VERIFIED, P1)**
Damit ist die Wirtschaft weitgehend zeitgesteuert. Ein Spieler, der klug
tötet, verdient kaum mehr als einer, der gerade so durchkommt.

**O2 — Kein passives Einkommen, keine Wirtschaftsentscheidung. (MISSING, P2)**
Es gibt keinen Turm oder Ausbau, der Gold bringt, keine Investitionsfrage
„jetzt Verteidigung oder jetzt Wirtschaft". Die einzige Wirtschaftsentscheidung
ist die Fähigkeit „Ernte".

**O3 — Der Verkauf ist zu großzügig, um weh zu tun. (DESIGN, P3)**
70 % (mit Verbesserung 80 %) bei einem Spiel ohne Zeitdruck heißt: eine
Fehlentscheidung kostet 30 % einmal. Es gibt keinen Schutz gegen
Verklicken — der Verkaufsknopf sitzt seit v138 in der Kopfzeile und wirkt
sofort.

**O4 — Weder Schneeball noch Armutsfalle. (VERIFIED, positiv)**
Die Simulation über drei Spielstile liegt bei 41/48/52 von 60 Kristall. Kein
Stil bricht ein, keiner rennt davon. Das ist solide.

**O5 — „Ruhig" ist unverlierbar, „Erbarmungslos" misst den Stil.
(VERIFIED, P2)**
Ruhig endet bei allen drei Stilen mit 80 von 80. Erbarmungslos schwankt
zwischen 16 und 25 von 52.

**O6 — Die Balance hat sich in v139 verschoben und ist nicht nachgeeicht.
(VERIFIED, P2)**
Durch die gestaffelten Platzbedarfe stieg der Restkristall auf Normal von 30
auf 41. Getrennt gemessen: die Rasterkorrektur allein macht es schwerer
(30 → 23), die Platzbedarfe leichter. Die Lebenskurve ist der falsche Hebel —
ab `hpEnd` 20 fallen andere Tore.

---

# TEIL P — ART DIRECTION AUDIT

## Sieht Tower Front aus wie EIN Spiel?

**Nein — aber es ist deutlich näher dran als vor v140.**

Was zusammenpasst: alle Figuren laufen durch dieselbe Einbettung (Sonnenton,
Bodenverschattung, Rückwurf, Farbklima der Karte), alle werfen Schatten in
dieselbe Richtung, seit v140 verdecken sie einander korrekt.

## Was nicht zusammenpasst

**P1 — Drei Kamerawinkel. (DESIGN, P1)**
Untergrund gemalt aus rund 55–60°. Turmbilder aus unterschiedlichen Winkeln
gerendert — auf `bilder/stufen.png` ist der Frostturm oben steiler gesehen als
der ausgebaute daneben. Gegner sind reine Aufsichten. **Ein Bild verträgt eine
Kamera.**

**P2 — Zwei Materialsprachen. (DESIGN, P2)**
Die Türme sind poliertes Blau-Gold mit Zierleisten (Fantasy-Burg). Der Mörser
ist ein schlichtes Rohr auf einem Fass (technisch). Die Gegner sind gepanzerte
Tiere. Die Kristallburg ist Leuchtkristall. Vier Welten.

**P3 — Der Detailgrad ist ungleich verteilt. (VERIFIED, P2)**
Das Grafiktor misst es: Figuren tragen **6,0-mal so viel Feindetail wie der
Untergrund** (14,7 gegen 2,5); im Referenzbild sind es 2,1. Nachbearbeitung
hilft nicht — nachgewiesen mit `npm run entrauschprobe`. Der Weg führt über
neue Bilder.

**P4 — Es gibt keine Art Bible. (MISSING, P0 für alles Weitere)**
Kein Dokument legt Kamera, Lichtrichtung, Schattenhärte, Materialfamilien,
Palette, Sättigung, Maßstabsordnung, Detailgrad und Effektsprache fest. Jede
neue Figur ist deshalb eine neue Einzelentscheidung — und genau daraus
entsteht „zusammengewürfelt".

**P5 — Die Weltkarte gehört nicht zum Spiel. (DESIGN, P2)**
Drei Kugeln mit einem Schwung auf einem Sternenfeld, mit sichtbaren
Pillarbox-Rändern. Sie sagt nichts über die Welt und hat mit dem Spielfeld
keine gemeinsame Sprache.

**P6 — Der Weg dominiert die Fläche. (DESIGN, P2)**
Auf dem Spiralhain füllt der helle Steinweg rund die Hälfte des Bildes,
überall gleich hell, in vier Serpentinen. Er liest sich als Schaltplan statt
als Landschaft.

---

# TEIL Q — TECHNICAL ART / 2.5D AUDIT

| Element | Zustand |
|---|---|
| Tiefensortierung | **seit v140 vorhanden**, 87 % Verdeckung gemessen |
| Schlagschatten Türme | vorhanden, eigener Umriss seit v128 |
| Kontaktschatten Türme | vorhanden, weich auslaufend |
| Schlagschatten Gegner | **vorhanden**, eigener Umriss seit v132 |
| Kontaktschatten Gegner | vorhanden |
| Umgebungsverdeckung (AO) | **fehlt** |
| Randlicht / Gegenlicht | **fehlt an allen Figuren** |
| Höhenwirkung | Türme 1,16-fach gestreckt; sonst keine Höhe |
| Bodenintegration | Einbettung mit Sonnenton, Farbklima, Rückwurf — gut |
| Staub / Rauch am Boden | nur bei Einschlägen |
| Parallaxe | **fehlt** |
| Tageszeit / Wetter | **fehlt** |

**Q1 — Randlicht ist der größte verbliebene Einzelhebel für Plastik.
(RECOMMENDATION, P1)**
Eine helle Kante aus Lichtrichtung an jeder Figur trennt die Silhouette vom
Untergrund und ist der billigste Weg zu Volumen. Der Code dafür existiert
bereits (`drawRim` in `towerart.ts`), wird aber nur für die alten
Seitenansichten benutzt — also faktisch nie.

**Q2 — Kein Bodenkontakt-Staub. (RECOMMENDATION, P3)**
Ein schwerer Gegner sollte Staub aufwerfen, ein Turm beim Bau eine Wolke.
Beides existiert als Werkzeug (`smoke`, `debris`), wird aber nicht genutzt.

---

# TEIL R — VFX / GAME FEEL AUDIT

| Effekt | Zustand |
|---|---|
| Mündungsblitz | vorhanden (Leuchtfleck) |
| Rückstoß | vorhanden |
| Geschossspur | vorhanden |
| Einschlag | Funken, Ring |
| Explosion | Funken, Rauch, Trümmer, Bildwackeln, Trefferstopp |
| Bremse | **seit v141 als Farbton auf der Figur** |
| Schild | Ring + Fäden zum Träger |
| Brand / Gift / Blitz / Betäubung | existieren nicht |
| Trefferstopp | vorhanden, gedeckelt auf 90 ms/s |
| Bildwackeln | vorhanden |
| Aufblitzen des Feldes | vorhanden |

**R1 — Es gibt keine Rückmeldung über Wirksamkeit. (MISSING, P1)**
Der Spieler sieht, **dass** getroffen wird, aber nicht, ob es **wirkt**. Ein
Bogenschuss auf den Leerentitan (Panzerung 6, 66 % geschluckt) sieht genauso
aus wie einer auf den Schleicher. Es fehlt: Abpraller bei hoher Panzerung,
sichtbarer Schildtreffer (den gibt es), gedämpfter Einschlag bei Resistenz.

**R2 — Jede Turmart klingt anders, aber sieht gleich aus. (DESIGN, P2)**
Vier Klänge, aber die Geschosse unterscheiden sich hauptsächlich in der Farbe.

---

# TEIL S — UI / UX AUDIT

## Was funktioniert

Gold, Kristall, Welle in einer Zeile oben links. Ton, Tempo, Pause oben rechts.
Turmknöpfe, Fähigkeiten und Wellenknopf unten. Alle Flächen ≥ 44 Punkte,
gemessen von `npm run beruehrung` und im Browsertor nachgeprüft. Seit v138
sind die Turmwerte auf dem Zielgerät sichtbar.

## Befunde

**S1 — Die Turmknöpfe zeigen kein Turmbild. (DESIGN, P2)**
Vier dunkle Kästen mit Text. Zwischen Knopf und Feld gibt es keine
Wiedererkennung.

**S2 — Fähigkeiten und Türme sehen gleich wichtig aus. (DESIGN, P3)**
Zwei Reihen gleich großer Kästen ohne Hierarchie.

**S3 — Der Prüfsteg verdeckt ein Drittel des Feldes. (DESIGN, P2)**
250 von 844 Punkten Breite, rechts, wo auf allen drei Karten der Kristall
steht.

**S4 — Die Bauleiste liegt über dem Spielfeld. (DESIGN, P2)**
Auf dem Spiralhain deckt sie genau den Bereich ab, in dem die Gegner
erscheinen.

**S5 — Kein Wellenfortschritt sichtbar. (MISSING, P3)**
Man sieht „Welle 8/15", aber nicht, wie weit die laufende Welle ist.

**S6 — Reichweite nur beim Auswählen. (DESIGN, P3)**
Beim Halten auf freier Fläche zeigt das Spiel alle Reichweiten — eine gute
Funktion, die niemand findet, weil sie nirgends steht.

---

# TEIL T — ONBOARDING AUDIT

Sieben Schritte, jeder an einen Handgriff gebunden, jeder verschwindet, wenn
der Handgriff gemacht ist. Dazu ein abgeleiteter Satz beim ersten Betreten
jeder Karte. Das ist **richtig gebaut** und in v135 messbar gemacht.

**T1 — Der Weg wird nicht gezeigt. (MISSING, P1)**
Schritt 1 der vom Auftrag geforderten Reihenfolge — *Gegnerweg zeigen* —
fehlt vollständig.

**T2 — Konter werden nicht erklärt. (MISSING, P2)**
Der erste Gleiter kommt in Welle 7. Nichts sagt „der Mörser erreicht ihn
nicht" — außer der Wellennotiz, die im HUD nur als erste Gruppe erscheint.

**T3 — Verkaufen wird nie gezeigt. (MISSING, P3)**

---

# TEIL U — AUDIO AUDIT

18 Klänge, vollständig synthetisch (Oszillatoren + Rauschpuffer), kein
Dateimaterial, Kontext erst nach der ersten Berührung (iOS-Regel), ein Budget
je Klangart gegen Übersteuerung bei vielen gleichzeitigen Treffern.

**U1 — Keine Musik. (MISSING, P2)**
**U2 — Kein Ambiente. (MISSING, P3)**
**U3 — Keine Anspannung.** Wellenstart, Wellenende, Boss und Durchbruch
klingen, aber die Lautheit steigt nicht mit der Gefahr. *(MISSING, P3)*
**U4 — Kein Ton für „Turm bereit", „nicht genug Gold", „ungültiger Platz".**
*(MISSING, P3)*
**U5 — NOT VERIFIED:** wie es klingt. In dieser Umgebung gibt es keine
Audioausgabe.

---

# TEIL V — PERFORMANCE AUDIT

## Gemessen (Node, ohne Grafikkarte — Regel 12)

| Aufbau | je Simulationsschritt | Budget |
|---|---|---|
| 12 Türme / 33 Gegner | 0,140 ms | 4 ms |
| 24 Türme / 65 Gegner | 0,102 ms | 4 ms |
| 30 Türme / 97 Gegner | **0,072 ms** | 4 ms |

| Zeichnen | Wert | Budget |
|---|---|---|
| Befehle je Bild | 1 271 | 3 000 |
| Gebackene Bilder | 71 / 7,6 MB | 24 MB |
| Ausgelieferte Datei | 1,44 MB | — |

**V1 — Die Zielsuche ist bereits über ein Ortsraster gelöst. (VERIFIED)**
`SpatialGrid.query` statt Vollprüfung. Der ausdrücklich im Auftrag genannte
Fallstrick besteht hier nicht.

**V2 — Echte Hardware ist ungemessen. (NOT VERIFIED, P1)**
Alle Browserzahlen dieses Projekts entstehen unter SwiftShader. Das Werkzeug
dafür existiert (`#messung` in der ausgelieferten Datei) und wartet auf einen
Lauf auf dem iPhone.

**V3 — Speicherwachstum über lange Sitzungen ungeprüft. (NOT VERIFIED, P3)**
Vorräte werden benutzt, aber es gibt keine Messung über eine Stunde
Endlosmodus.

---

# TEIL W — ACCESSIBILITY AUDIT

| Punkt | Zustand |
|---|---|
| Berührungsflächen ≥ 44 pt | **erfüllt und gemessen** |
| `prefers-reduced-motion` | **respektiert** |
| Sichere Bereiche (Notch) | berücksichtigt (`--sat`, `--sar`, `--sab`) |
| Beschriftungen für Bedienelemente | teilweise (`aria-label` an sechs Knöpfen) |
| Farbfehlsichtigkeit | **fehlt** — Gegner unterscheiden sich fast nur über Farbe; einzige Ausnahme ist der zweite Zweigring am Turmfuß |
| Schriftgrößenwahl | **fehlt** |
| Modus „weniger Effekte" | halb (Qualitätsstufe hoch/niedrig, aber nicht als Barrierefreiheits-Einstellung benannt) |
| Untertitel für Tonhinweise | **fehlt** |
| Bedienung ohne Ziehen/Kneifen | **fehlt** — Zoom nur über Kneifen |
| Bildschirmleser | **NOT VERIFIED** |

---

# TEIL X — QA AUDIT

## Was es gibt

20 Tore, 98 stehende Gegenproben, ein Rauchtest, der eine ganze Partie mit
allen vier Turmarten, Fähigkeiten, Sichern und Laden durchspielt, ein
Browsertor auf der **gebauten** Datei in Chromium (iPhone quer und zwei
Schreibtischformate), eine Bildabnahme mit echten PNG ohne Browser.

**Das ist deutlich mehr, als in Projekten dieser Größe üblich ist.**

## Der Testkatalog des Auftrags, abgeglichen

| Fall | abgedeckt? |
|---|---|
| Turm auf Weg | **ja** (Rauchtest, Gegenprobe) |
| Turm außerhalb der Karte | **ja** (`warumNicht` → Rand) |
| Turm auf Turm | **ja** |
| Turm unter der Bedienung | **teilweise** — Browsertor prüft Überdeckung von Knöpfen, nicht von Bauplätzen |
| Turm am Rand | ja |
| Gegner steckt fest | strukturell unmöglich |
| Gegner verlässt den Pfad | strukturell unmöglich |
| Gegner stirbt zwischen Punkten | ja |
| Gegner erreicht das Ziel | ja |
| Ziel stirbt während des Schusses | **nein** — und genau dort liegt Befund G1 |
| Ziel verlässt die Reichweite | ja |
| Turm wird während des Schusses verkauft | **NOT VERIFIED** |
| Turm wird während des Schusses ausgebaut | **NOT VERIFIED** |
| Turm ohne Ziel | ja |
| Pause / Neustart / Tempo | ja |
| Boss | ja |
| Mehrere Erscheinungspunkte | ja |
| App schließen und fortsetzen | **ja**, seit v137 auch mit Schilden |
| Fortschritt laden | ja |

**X1 — Zwei Lücken im Katalog** (Verkauf und Ausbau während eines Schusses)
sind echte Fälle: `p.owner` zeigt auf einen Turm, der nicht mehr existiert.
Der Code setzt `p.owner = null` beim Aufräumen, aber nicht beim Verkauf.

---

# TEIL Y — PRODUCT / SCOPE AUDIT

## Einordnung des heutigen Stands

| Stufe | Zustand |
|---|---|
| **Vertical Slice** | **nicht erreicht.** Keine einzelne Karte ist so gut, dass man sie einem Fremden ohne Erklärung zeigen würde. |
| **MVP** | Kern steht: bauen, ausbauen, verkaufen, versetzen, Wellen, Sieg, Niederlage, Spielstand, drei Karten, drei Grade, Endlos. |
| **Version 1.0** | fehlt: Fortschritt, Bosse, Gegnerrollen, Turmrollen, Art Bible, Klangteppich, Barrierefreiheit. |
| **Post-Launch** | nichts begonnen — richtig so. |

## Risiken

| Risiko | Höhe |
|---|---|
| **Bildmaterial.** `art/roh/` liegt nicht im Verzeichnis (79 MB gegen 1,2 MB gepackt). Ohne die Rohbilder ist keine einzige Figur neu zu belichten, umzuprojizieren oder zu ersetzen. | **hoch** |
| **Ein Kopf.** Alles Wissen steckt in `docs/` und in Kommentaren — hervorragend gepflegt, aber es gibt keinen zweiten Bearbeiter. | mittel |
| **Effektsystem.** Wird beim fünften Statuseffekt teuer nachzurüsten. | mittel |
| **Kein Nutzerfeedback.** Keine Telemetrie, kein Test mit Fremden. Alle Aussagen über Spaß sind Vermutungen. | **hoch** |

---

# TEIL Z — GAME DIRECTOR REVIEW

## Die Widersprüche und ihre Auflösung

**Art Director will mehr Detail, UX will weniger Ablenkung.**
→ *Detail gehört in die Figur, nicht in die Auskunft.* Randlicht, Material und
Schatten dürfen wachsen; Ringe, Balken und Zahlen müssen schrumpfen. v141 hat
das an einem Beispiel vorgemacht (Bremsring → Farbton auf der Figur).

**Enemy Designer will mehr Gegnerarten, Performance will weniger Entitäten.**
→ *Die Rechenlast ist bei 2 % ihres Budgets.* Der Engpass ist nicht die
Maschine, sondern die Lesbarkeit: mehr Arten sind erlaubt, aber jede muss
sich in der Silhouette unterscheiden.

**Level Designer will größere Karten, Mobile UX will Übersicht ohne Scrollen.**
→ *Die Karte bleibt bildschirmfüllend* (Regel des Genres, siehe F1 des
Genre-Abgleichs). Mehr Weg entsteht durch Windung und mehrere Bahnen, nicht
durch mehr Fläche.

**Economy will knapperes Gold, Onboarding will Erfolgserlebnisse.**
→ *Knapp im mittleren Spiel, großzügig in den ersten drei Wellen.*

---

# TOWER FRONT — PRODUCT VISION V1.0

## Core Fantasy

> **Ich baue aus wenigen, sehr unterschiedlichen Stellungen ein Netz, das
> zusammen mehr kann als jede einzelne — und ich sehe an jeder Welle, ob mein
> Netz die richtige Antwort auf das war, was gerade kommt.**

Nicht „ich habe den stärksten Turm", sondern „ich habe die richtige
Aufstellung".

## Design Pillars

1. **Strategic Clarity — man sieht, warum.**
   Jede Gefahr, jede Turmrolle, jeder Fehlschlag ist ohne Menü ablesbar. Wenn
   ein Gegner durchkommt, muss der Spieler in derselben Sekunde wissen, woran
   es lag.
2. **Meaningful Placement — der Ort entscheidet.**
   Nicht die Menge der Türme, sondern ihre Lage. Jede Karte hat Plätze, die
   etwas kosten und etwas geben.
3. **Strong Counterplay — jede Stärke hat ihren Preis.**
   Kein Turm ist gegen alles gut. Kein Gegner ist nur „mehr Leben".
4. **Premium 2.5D Battlefield — eine Welt, eine Kamera, ein Licht.**
   Alles steht auf demselben Boden, unter derselben Sonne, in derselben
   Materialsprache.
5. **Constant Strategic Evolution — die beste Antwort ändert sich.**
   Alle drei bis vier Wellen kommt etwas, das die bisherige Aufstellung in
   Frage stellt.

## Zielgruppe

Erwachsene Genrekenner auf dem Telefon, die eine Partie in 10–15 Minuten
spielen wollen und dabei denken, nicht wischen. Kein Kinderspiel, kein
Idle-Game, keine Zeitsperren, keine Käufe.

## Was Tower Front IST

* Feste Wege, freie Platzierung, begrenzter Bauraum.
* Eine Partie ist eine geschlossene Aufgabe mit Anfang und Ende.
* Alles läuft offline aus einer einzigen Datei.
* Deutsch.

## Was Tower Front NICHT ist

* Kein Labyrinth-Bauer (Gegner suchen sich keinen Weg).
* Kein Echtzeit-Strategiespiel (keine beweglichen Einheiten des Spielers).
* Kein Sammelspiel (keine Beute, keine Seltenheitsstufen).
* Kein Dienst mit Ereignissen und Saisons.
* Kein Comic.

## Die perfekte Drei-Minuten-Sequenz

| Zeit | Was geschieht |
|---|---|
| 0:00 | Karte erscheint. Die Wege leuchten kurz vom Tor zum Kristall — man sieht, woher es kommt. |
| 0:10 | Der Spieler tippt eine Turmart an. Alle erlaubten Plätze werden ruhig sichtbar, die guten etwas heller. |
| 0:20 | Erster Turm. Reichweite legt sich auf den Boden, überdeckt zwei Wegabschnitte. |
| 0:30 | Welle 1: sechs leichte Gegner. Der Turm hält sie. Gold fließt. |
| 1:00 | Welle 3 kündigt „gepanzert" an. Der Spieler sieht am Symbol, dass sein Bogenturm zu wenig hat. |
| 1:20 | Er baut den Mörser — teuer, langsam, weit. Erste echte Entscheidung: ein teurer Turm oder zwei billige. |
| 1:45 | Zweite Bahn öffnet sich. Die alte Stellung deckt sie nicht ab. |
| 2:00 | Druckwelle: viele schnelle Gegner auf beiden Bahnen. Es wird eng, zwei kommen durch. |
| 2:20 | Der Spieler ruft die nächste Welle **früh** — Risiko gegen Gold — und baut vom Bonus den Frostturm. |
| 2:40 | Der Frost bremst den Pulk in die Mörserfläche. Es funktioniert sichtbar. |
| 3:00 | Mini-Boss kündigt sich an: eine Phase, eine Schwachstelle, eine Ansage. |

Jede dieser dreißig Sekunden enthält **eine** Entscheidung oder **eine**
Bestätigung. Genau das fehlt heute.

---

# PROFESSIONAL GAME REVIEW

*Wie ein etabliertes Magazin es schreiben würde. Keine Gefälligkeitsnote.*

| Bereich | Heute | Nach diesem Plan |
|---|---|---|
| Gameplay | 5/10 | 8/10 |
| Strategische Tiefe | 4/10 | 8/10 |
| Tower Design | 5/10 | 8/10 |
| Enemy Design | 3/10 | 8/10 |
| Maps | 4/10 | 7/10 |
| Balancing | 6/10 | 8/10 |
| Grafik | 6/10 | 8/10 |
| UI/UX | 7/10 | 8/10 |
| Sound | 4/10 | 7/10 |
| Progression | 2/10 | 7/10 |
| Technische Qualität | **9/10** | 9/10 |
| Langzeitmotivation | 2/10 | 7/10 |
| Eigenständigkeit | 4/10 | 8/10 |

**Gesamtwertung heute: 51/100.**
**Potenzial nach Umsetzung: 82/100.**

> *Towerfront ist das technisch sauberste kleine Tower-Defense-Spiel, das uns
> dieses Jahr untergekommen ist — und zugleich eines der ereignisärmsten. Die
> Maschine darunter ist tadellos: 98 selbstprüfende Gegenproben, eine einzige
> 1,4-MB-Datei, die offline läuft, Wegfindung, die schlicht nicht kaputtgehen
> kann. Nur baut auf dieser Maschine niemand eine Achterbahn. Acht Gegnerarten
> laufen dieselbe Kurve entlang und unterscheiden sich in Zahlen; vier Türme
> schießen darauf, und der billigste ist der beste. Wer nach zwanzig Minuten
> aufhört, tut es nicht, weil etwas kaputt wäre, sondern weil ihn nichts
> gefragt hat.*

## Competitive Benchmark

| Bereich | Tower Front heute | Genre-Benchmark | Ziel |
|---|---|---|---|
| Core Gameplay | 5 | 9 | 8 |
| Placement | 6 | 9 | 8 |
| Pathfinding | 7 | 8 | 8 |
| Tower Design | 5 | 9 | 8 |
| Enemy Design | 3 | 9 | 8 |
| Wave Design | 4 | 9 | 8 |
| Map Design | 4 | 9 | 7 |
| Strategy | 4 | 9 | 8 |
| Graphics | 6 | 9 | 8 |
| UI | 7 | 8 | 8 |
| Progression | 2 | 8 | 7 |
| Performance | 9 | 8 | 9 |
| Identity | 4 | 9 | 8 |


---

# MASTER GAP ANALYSIS

Sortiert nach Priorität. Aufwand: XS ≤ 1 Runde, S ≈ 1–2, M ≈ 3–5, L ≈ 6–10,
XL > 10 Runden.

| ID | Bereich | Typ | Problem | Auswirkung | Lösung | Prio | Aufwand | Abhängig von |
|---|---|---|---|---|---|---|---|---|
| TF-001 | Placement | VERIFIED | Bauplätze nur unter dem Finger sichtbar | Der Spieler weiß nicht, wo er bauen darf | Punkte dauerhaft zeigen, sobald eine Turmart gewählt ist | P0 | S | — |
| TF-002 | Enemy | DESIGN | Fünf von acht Gegnern erzwingen keine Entscheidung | Die Counter-Ebene des Genres fehlt | Drei Archetypen mit Verhalten ergänzen, drei bestehende schärfen | P0 | L | TF-020 |
| TF-003 | Map | VERIFIED | Spiralhain: ein Platz deckt 47 %, Median 0 % | Die erste Karte lehrt das Falsche | Weg verlängern und winden, Sperrflächen setzen | P0 | M | — |
| TF-004 | Gameplay | DESIGN | Kernkreis stellt zu selten eine Frage | Kein Spielspaß ohne Meta | Ergebnis aus TF-002/005/006/010 | P0 | — | Sammelticket |
| TF-005 | Wave | VERIFIED | Kein Wellenruf während einer Welle | Kein Risiko-gegen-Gold, halbe Zeit Zusehen | Rufen erlauben, Bonus nach Restgefahr | P1 | S | — |
| TF-006 | Tower | DESIGN | Zweige ändern Zahlen, keine Regeln | Die zentrale Entscheidung ist folgenlos | Je Zweig eine Regeländerung | P1 | M | TF-021 |
| TF-007 | Combat | ERLEDIGT v144 | Geschoss verschwindet, wenn das Ziel stirbt | Verlorener Schaden, sichtbares Verschwinden | Nach Waffentyp: neues Ziel oder Einschlag | P1 | S | 12,0 % → 1,6 %, Tor `geschossetor` |
| TF-008 | Boss | MISSING | Kein Boss im Genresinn | Keine Dramaturgie | Phasen, Schwachstelle, eine Fähigkeit | P1 | M | TF-020 |
| TF-009 | Progression | MISSING | Keine Freischaltung, keine Ziele | Kein Grund für eine zweite Partie | Kartenschloss, drei Sternziele je Karte | P1 | M | — |
| TF-010 | Economy | VERIFIED | 79 % des Einkommens sind Wellenbonus | Gutes Spielen zahlt sich kaum aus | Verhältnis auf etwa 50/50 drehen | P1 | S | TF-005 |
| TF-011 | Art | ERLEDIGT v153 | Keine Art Bible | Jede Figur ist eine Einzelentscheidung | Verbindliches Dokument + Prüfwerkzeug | P1 | M | `docs/Towerfront-ARTBIBLE.md`. Jede Festlegung trägt Herkunft **und** Messstelle; fünf tragen ausdrücklich „von Hand beurteilt". Neue Messung: Lichtwinkel je Figur gegen `LICHT` — Türme 2–19°, Gegner 1–66° |
| TF-012 | Technical Art | ERLEDIGT v156 | Kein Randlicht an Figuren | Silhouetten laufen in den Boden | Randlicht aus `LICHT`, gebacken | P1 | S | gemessen am GEBACKENEN Bild über den echten Weg: schwächster Saum **1,26 → 1,80**, unter 1,5 **4 von 24 → 0**. Ohne/mit gegengemessen (Regel 13) |
| TF-013 | Tower | MISSING | Rollen fehlen (Unterstützung, Mindestreichweite, Anti-Luft) | Zu wenig Aufstellungsentscheidung | Zwei bis vier neue Türme | P1 | L | TF-021, TF-011 |
| TF-014 | Path | ERLEDIGT v149 | Keine Wegvorschau | Der Spieler sieht nicht, woher es kommt | Wege beim Kartenstart animiert zeigen, Knopf zum Wiederholen | P1 | S | gemessen: 5 von 6 Toren liegen ausserhalb des Bildausschnitts |
| TF-015 | Combat | MISSING | Nur zwei Statuswirkungen | Keine Schadensvielfalt, keine Resistenzen | Effektsystem als Liste am Gegner | P1 | M | — |
| TF-016 | QA | ERLEDIGT v143 | Verkauf/Ausbau während eines Schusses ungeprüft | Möglicher Verweis auf einen entfernten Turm | Zwei Rauchtestschritte | P1 | XS | kein Fehler; zwei stehende Prüfungen, dazu die `dead`-Sperre |
| TF-017 | Art | DESIGN | Drei Kamerawinkel im selben Bild | Haupteindruck „zusammengewürfelt" | Einheitlicher Winkel, gemessen | P1 | L | TF-011, Rohbilder |
| TF-018 | Balancing | VERIFIED | Balance seit v139 nicht nachgeeicht | Normal zu leicht (41 statt 30) | Alle drei Grade zusammen eichen | P2 | S | — |
| TF-019 | Combat | ERLEDIGT v145 | Geschosse starten in der Turmmitte | Schüsse kommen nicht aus dem Rohr | Mündungspunkt je Turmart | P2 | S | 46–50 Bildschirmpunkte Versatz, Tor `muendungstor` |
| TF-020 | Architecture | DESIGN | `GameState` mischt Simulation und Effekte | Determinismus hängt an Disziplin | Trennung `Sim` / `Fx` | P2 | L | — |
| TF-021 | Architecture | DESIGN | Angriffsarten als `if`-Kette | Neue Turmarten passen nicht hinein | Turmverhalten als Datenobjekt | P2 | M | TF-020 |
| TF-022 | UI | DESIGN | Turmknöpfe ohne Turmbild | Keine Wiedererkennung | Gebackenes Turmbild im Knopf | P2 | S | — |
| TF-023 | Wave | ERLEDIGT v151 | Vorschau nennt nur die erste Gruppe | Der Spieler kann sich nicht vorbereiten | Alle Gruppen + Gefahrzeichen | P2 | S | **Befund widerlegt** — die Vorschau fasste immer schon alle Gruppen zusammen, jetzt für jede der 15 Wellen im Rauchtest gemessen. Die echte Lücke waren Schild und Träger (nur im handgeschriebenen Satz) und ein fehlendes Gefahrzeichen; beide jetzt aus den Wellendaten abgeleitet. Neues Tor `streifentor` |
| TF-024 | Enemy | DESIGN | Acht unabhängige Bunttöne | Keine Fraktion lesbar | Farbfamilie je Fraktion | P2 | S | TF-011 |
| TF-025 | Map | MISSING | Kein Höhenvorteil, keine Sichtlinie | Bauplätze sind austauschbar | Erhöhte Plätze mit Reichweitenbonus | P2 | M | TF-003 |
| TF-026 | Audio | MISSING | Keine Musik, kein Ambiente | Die Welt klingt nicht | Synthetischer Grundklang, Wellenanspannung | P2 | M | — |
| TF-027 | Telemetry | MISSING | Keine Ereignisse, keine Kennzahlen | Balance beruht auf Simulation, nicht auf Spielern | Ereignissystem + lokale Aufzeichnung | P2 | M | TF-020 |
| TF-028 | Accessibility | MISSING | Gegner nur über Farbe unterscheidbar | Für Farbfehlsichtige unspielbar | Form- und Zeichenunterschiede | P2 | M | TF-024 |
| TF-029 | UI | DESIGN | Prüfsteg verdeckt ein Drittel des Feldes | Sicht auf den Kristall verdeckt | Steg schmaler, Werte zweispaltig | P2 | S | — |
| TF-030 | Path | **WIDERLEGT v147** | ~~Leerentitan (102) breiter als engste Straße (80)~~ | Gemessen war die **Kachel**, nicht die Figur | Gezeichnet ist er **60** breit und passt mit 10 Punkten Luft je Seite | P2 | XS | Tor `gedraengetor` misst jetzt die Figur |
| TF-031 | Wave | DESIGN | Keine Erholungs- und Wirtschaftswelle | Kein Atem in der Dramaturgie | Wellenrollen einführen | P2 | S | — |
| TF-032 | Targeting | ERLEDIGT v146 | Modus „hinten" fehlt | Durchbrecher nicht abfangbar | Fünfter Modus | P2 | XS | nach Standort aufgeteilt 88 gegen 84 Punkte |
| TF-033 | VFX | MISSING | Keine Rückmeldung über Wirksamkeit | Man sieht nicht, ob ein Turm taugt | Abpraller bei Panzerung, gedämpfter Einschlag | P2 | S | TF-015 |
| TF-034 | Onboarding | ERLEDIGT v152 | Konter werden nie erklärt | Der erste Gleiter überrascht | Ein Satz beim ersten Auftreten jeder Gegnerart | P2 | S | gemessen vorher: 12 von 20 Erstauftritten trugen einen Satz, **drei** nannten einen Konter. Jetzt aus Gegner- und Turmdaten abgeleitet, 15 von 20; die übrigen fünf sind Schleicher und Infanterie, an denen nichts zu kontern ist. Tor `kontertor` |
| TF-042 | Map | ERLEDIGT v150 | Die Bahnen laufen nicht auf der gemalten Straße | Gegner gehen neben dem Weg | Stützpunkte an die gemalten Straßen ziehen | **P1** | M | 98,0/79,0/89,5/67,3/69,1/75,7 → 100/94,3/100/82,4/80,1/84,3 %; die 520 aus v149 waren ein Messfehler |
| TF-035 | Code | ERLEDIGT v148 | Toter `topdown`-Zweig, totes `range`-Feld, leere Turmleinwand | Wartungsballast | Entfernen | P3 | XS | mehr als gemeldet: auch `drawRim`, `palette.rim` und 14 unerreichbare Zeilen |
| TF-036 | Map | MISSING | Kein Kreuzungstyp, keine getrennten Ziele | Karten unterscheiden sich zu wenig | Vierte Karte mit anderer Topologie | P3 | M | TF-003 |
| TF-037 | Economy | DESIGN | Verkauf zu großzügig, kein Verklickschutz | Fehler kosten nichts | Rückgabe nach Wellenzahl staffeln, Bestätigung | P3 | XS | — |
| TF-038 | UI | MISSING | Kein Wellenfortschritt sichtbar | Man weiß nicht, wie weit die Welle ist | Feiner Balken am Wellenknopf | P3 | XS | — |
| TF-039 | Art | DESIGN | Weltkarte gehört nicht zum Spiel | Erster Eindruck bricht mit dem Rest | Gemalte Landkarte in der Spielsprache | P3 | M | TF-011 |
| TF-040 | Performance | NOT VERIFIED | Echte Hardware ungemessen | Alle Zahlen unter Vorbehalt | `#messung` auf dem iPhone laufen lassen | P1 | XS | **Nutzer** |
| TF-041 | Art | NOT VERIFIED | `art/roh/` fehlt im Verzeichnis | Kein Bild neu belichtbar | Rohbilder nachliefern | P1 | XS | **Nutzer** |

---

# MASTER BACKLOG — die Tickets im Detail

Nur die zwölf, die zuerst dran sind. Die übrigen folgen demselben Muster und
stehen in der Gap Analysis.

---

### TF-001 — Bauplätze dauerhaft sichtbar

* **Bereich:** Tower Placement · **Typ:** VERIFIED ISSUE
* **Ist:** `drawBuildOverlay` zeigt Bauplatzpunkte nur im Umkreis von
  `pendingPoint ?? hoverPoint`. `hoverPoint` wird in `input.ts` nur für
  `pointerType !== 'touch'` gesetzt. Auf dem Telefon gibt es also nur Punkte,
  solange ein Finger liegt.
* **Problem:** Wer eine Turmart antippt und aufs Feld schaut, sieht nichts.
* **Warum relevant:** Es ist der letzte offene Teil der Beschwerde „man sieht
  nicht, wo man bauen kann", und der einzige verbliebene P0 der Bedienung.
* **Soll:** Sobald eine Turmart gewählt ist, sind alle erlaubten Plätze
  ruhig sichtbar. Beim Halten wird der Umkreis unter dem Finger deutlicher.
* **Umsetzung:** Zweistufig zeichnen — schwache Grunddichte über die ganze
  Karte (größerer Rasterschritt, geringere Deckung), volle Dichte im Fenster
  um den Finger. Die Sorge aus v122 (311 Punkte = Tapete) wird durch die
  Zweistufigkeit erledigt, nicht durch Weglassen.
* **Acceptance:** Im Browsertor, iPhone quer, ohne liegenden Finger: nach dem
  Tippen auf eine Turmart sind mindestens 20 Bauplatzpunkte im Bild messbar
  (Bildpunktdifferenz gegen dieselbe Aufnahme ohne Turmwahl > 2 000).
* **Prio:** P0 · **Aufwand:** S · **Risiko:** niedrig
* **Test:** Neue Prüfung im Browsertor + Gegenprobe „Bauplätze wieder nur unter
  dem Finger".

---

### TF-005 — Welle rufen, während eine läuft

* **Bereich:** Wave / Economy · **Typ:** VERIFIED ISSUE
* **Ist:** `canStartWave` verlangt `!waveActive`. Der Frühstartbonus greift
  nur in der Lücke zwischen zwei Wellen, gedeckelt bei 30 Gold.
* **Problem:** Der wichtigste Hebel des Genres fehlt. Gemessen sind 213 s
  Ausschüttung über 15 Wellen; der Rest ist Warten.
* **Soll:** Die nächste Welle lässt sich jederzeit rufen. Der Bonus richtet
  sich danach, **wieviel Gefahr noch auf dem Feld ist** — nicht nach der Uhr.
* **Umsetzung:** `canStartWave` nur noch `phase === 'playing' && (endless ||
  waveIndex < waves.length)`. Mehrere Wellen laufen parallel; `pending`
  wird zu einer Liste je Welle oder bekommt einen Wellenindex. Bonus =
  Anteil der noch lebenden Gegnerlebenspunkte an der laufenden Welle × Faktor.
* **Acceptance:** Simulation zeigt einen messbaren Unterschied zwischen
  „immer sofort rufen" und „immer warten" — mindestens 15 % mehr Gold beim
  Rufen, bei mindestens 20 % höherem Kristallverlust. Beides in `npm run sim`
  als eigener Spielstil.
* **Prio:** P1 · **Aufwand:** S · **Risiko:** **mittel** — verschiebt die
  Balance spürbar, muss mit TF-018 zusammen geeicht werden.

---

### TF-007 — Geschosse verlieren ihr Ziel nicht mehr ins Nichts

**Erledigt in v144.** Gemessen 12,0 % verpuffte Schüsse vorher, 1,6 % nachher
(`npm run geschosse`). Kegel 40° halber Öffnungswinkel, Umkreis 240
Weltpunkte. Das Tor misst zusätzlich die größte Richtungsänderung eines
Schusses (40° gegen eine Grenze von 90°) — ohne diese zweite Zahl würde ein
weit geöffneter Kegel die erste sogar verbessern und dabei die Waffe
ersetzen. Die Schwierigkeitskurve musste nach: `hpEnd` 17,5 → 19,5.

* **Bereich:** Combat · **Typ:** VERIFIED ISSUE
* **Ist:** `if (!tgt) { p.dead = true; }` — Geschoss wird ersatzlos gelöscht.
* **Soll:** Nach Waffentyp: **zielsuchend** sucht ein neues Ziel in
  Flugrichtung innerhalb eines Kegels; findet es keines, fliegt es weiter und
  verlischt am Rand. **Ballistisch** bleibt wie es ist (fliegt auf einen Punkt).
* **Acceptance:** In einer Messung mit sechs Schnellfeuertürmen auf eine dichte
  Welle liegt der Anteil der Geschosse, die ohne Wirkung verschwinden, unter
  5 % (heute: alle, deren Ziel im Flug stirbt).
* **Prio:** P1 · **Aufwand:** S · **Risiko:** niedrig
* **Test:** Zähler im Rauchtest; Gegenprobe „Ersatzziel abgeschaltet".

---

### TF-002 — Drei Gegner, die eine Entscheidung erzwingen

* **Bereich:** Enemy Design · **Typ:** DESIGN ISSUE + MISSING FEATURE
* **Ist:** Acht Arten, davon fünf ohne eigene Frage.
* **Soll:** Drei neue Archetypen, jeder mit **einer** Regel:
  1. **Sanitäter** — heilt Nachbarn im Umkreis, solange er lebt. Zwingt zu
     Einzelziel-Reihenfolge. (Verwandt mit dem vorhandenen Schildträger,
     aber Heilung statt Schild.)
  2. **Gräber** — taucht auf einem Abschnitt unter und ist dort nicht
     angreifbar. Zwingt dazu, Feuerkraft **vor** oder **hinter** den Abschnitt
     zu legen — also zu einer Ortsentscheidung.
  3. **Störer** — schaltet den nächststehenden Turm für drei Sekunden ab.
     Zwingt zu Redundanz statt zu einem Klumpen.
* **Warum genau diese drei:** Jeder greift eine andere Ebene an — Reihenfolge,
  Ort, Verteilung. Zusammen entwerten sie „alles in die Mitte stellen".
* **Acceptance:** Für jeden gilt die Enemy-Spezialregel: die Antwort auf
  „welche neue Entscheidung erzwingt er?" ist nicht „mehr Schaden". Messbar:
  Eine Simulation mit Klumpenaufstellung verliert gegen dieselbe Welle
  mindestens 30 % mehr Kristall als eine verteilte.
* **Prio:** P0 · **Aufwand:** L · **Risiko:** mittel (braucht neue Bilder oder
  klare Ableitungen aus vorhandenen)

---

### TF-006 — Zweige, die Regeln ändern

* **Bereich:** Tower Design · **Typ:** DESIGN ISSUE
* **Ist:** Zehn Zweigstufen ändern ausschließlich Zahlen.
* **Soll:** Jeder der acht Zweige bekommt **eine** Regeländerung:

| Turm | Zweig A | Zweig B |
|---|---|---|
| Bogen | *Scharfschütze:* trifft immer den hintersten Gegner zusätzlich | *Salve:* jeder dritte Schuss trifft zwei Ziele |
| Frost | *Ewiges Eis:* gebremste Gegner nehmen 20 % mehr Schaden von allen | *Splitterfrost:* Bremse springt auf einen Nachbarn über |
| Mörser | *Streubombe:* zweiter, kleinerer Einschlag versetzt | *Brecher:* entfernt Panzerung dauerhaft um 2 |
| Prisma | *Verzweigung:* Kette springt auch auf schon getroffene zurück | *Bündelung:* lädt auf — je länger dasselbe Ziel, desto mehr Schaden |
* **Acceptance:** `npm run sim` zeigt für **jedes** Zweigpaar einen Abstand von
  mehr als vier Kristallpunkten. Heute sind es bei zwei Paaren null.
* **Prio:** P1 · **Aufwand:** M · **Risiko:** mittel

---

### TF-011 — Die Tower Front Art Bible

* **Bereich:** Art Direction · **Typ:** MISSING FEATURE
* **Soll:** Ein verbindliches Dokument `docs/Towerfront-ARTBIBLE.md` mit:

| Festlegung | Vorschlag |
|---|---|
| Kamera | Ein Blickwinkel für alles: **58° zur Bodenebene**, gemessen am vorhandenen Untergrundbild, keine Perspektivverzerrung (orthografisch) |
| Lichtquelle | Eine Sonne, aus **oben links** (`LICHT` in `config.ts` ist bereits gesetzt) |
| Schattenrichtung | Immer `LICHT`, Länge proportional zur Figurenhöhe |
| Schattenhärte | Schlagschatten weich (Kernschatten 60 %, Halbschatten bis 0), Kontaktschatten hart innen, weich außen |
| Umgebungsverdeckung | Kontaktzone dunkler, Radius = halbe Standfläche |
| Materialfamilien | **Drei, nicht mehr:** *Stein und Metall* (Türme, Mauern), *Kristall* (Kristallburg, Frost, Prisma), *Chitin* (Gegner) |
| Palette | Boden je Karte; Türme in gebrochenem Weiß und Messing; Gegner in **einer** Fraktionsfarbe je Fraktion; Auskunft in Türkis (Freund) und Rot (Gefahr) |
| Sättigung | Untergrund gedämpft, Figuren um 20 % gesättigter, Effekte am gesättigsten |
| Maßstab | Turm 96 Weltpunkte Standfläche, gezeichnet 127 breit; Gegner 68–102 breit; Kristallburg höchstens dreifache Turmbreite |
| Detailgrad | Figur höchstens **2,5-mal** so viel Feindetail wie der Untergrund (heute 6,0 — mit `npm run grafik` messbar) |
| Effektsprache | Jeder Turm hat **eine** Signaturfarbe und **eine** Form: Bogen = schlanke Spur, Frost = Ringpuls, Mörser = Wolke, Prisma = Zickzack |
| Nutzerbild | Nichts Rechteckiges auf dem Feld; alles, was zu einer Figur gehört, liegt auf dem Boden oder auf der Figur |

* **Acceptance:** Für jede Festlegung existiert entweder ein Wächter oder ein
  Messwerkzeug. Ohne Messstelle ist eine Festlegung nur eine Meinung.
* **Prio:** P1 · **Aufwand:** M

---

### TF-012 — Randlicht an jeder Figur

* **Bereich:** Technical Art · **Typ:** RECOMMENDATION
* **Ist:** `drawRim` existiert in `towerart.ts` und wird nur für
  Nicht-Aufsichten benutzt — also für keinen einzigen Gegner.
* **Soll:** Jede Figur bekommt eine helle Kante aus Lichtrichtung, gebacken.
* **Acceptance:** Der Silhouettenabstand zum Untergrund steigt messbar
  (Erweiterung von `npm run einbettung` um eine Kantenmessung); der
  Helligkeitsabstand bleibt im Band von Audit-Befund B5.
* **Prio:** P1 · **Aufwand:** S

---

### TF-009 — Fortschritt: Schloss und Sternziele

* **Bereich:** Progression · **Typ:** MISSING FEATURE
* **Soll:** Karte 2 erst nach einem Stern auf Karte 1, Karte 3 nach zwei
  Sternen gesamt. Je Karte drei benannte Ziele: *überstanden*, *Kristall über
  drei Viertel*, *ein Kartenziel* (z. B. „ohne Frostturm", „höchstens acht
  Türme"). Erbarmungslos erst nach einem Sieg auf Normal.
* **Acceptance:** Ein neuer Spielstand kann Karte 2 nicht öffnen. Die
  Sternziele werden im Ergebnisbildschirm einzeln abgehakt.
* **Prio:** P1 · **Aufwand:** M

---

### TF-010 — Die Wirtschaft belohnt Spielen

* **Bereich:** Economy · **Typ:** VERIFIED ISSUE
* **Ist:** 4 545 Wellenbonus gegen 1 194 Abschussgold.
* **Soll:** Etwa hälftig. Abschussgold rauf, Wellenbonus runter, Gesamtsumme
  gleich lassen — sonst verschiebt sich alles andere mit.
* **Acceptance:** Anteil des Abschussgoldes zwischen 45 % und 55 %;
  `npm run sim` bleibt im Band aller drei Spielstile.
* **Prio:** P1 · **Aufwand:** S · **Abhängig:** mit TF-018 zusammen eichen

---

### TF-014 — Wegvorschau

* **Bereich:** Path Visibility / Onboarding · **Typ:** MISSING FEATURE
* **Soll:** Beim Betreten einer Karte laufen Lichtpunkte vom Tor zum Kristall,
  einmal je Bahn, rund zwei Sekunden. Ein kleiner Knopf am Wellenknopf
  wiederholt es. Zusätzlich eine dauerhafte, dezente Laufrichtung an den
  Toren.
* **Acceptance:** Bildabnahme mit sichtbaren Wegmarken; Gegenprobe
  „Vorschau abgeschaltet" schlägt an.
* **Prio:** P1 · **Aufwand:** S

---

### TF-008 — Ein Boss, der ein Boss ist

* **Bereich:** Boss Design · **Typ:** MISSING FEATURE
* **Soll:** Der Leerentitan bekommt drei Phasen:
  * **100–66 %:** wie heute.
  * **66 %:** hüllt sich in einen Schild, der nur bricht, wenn er in vier
    Sekunden zwanzig Treffer nimmt — Schnellfeuer statt Wucht, sichtbar
    angekündigt durch einen Ring, der sich schließt.
  * **33 %:** wird schneller und schaltet den nächststehenden Turm ab, bis er
    tot ist.
* **Acceptance:** Ein Feld nur aus Mörsern verliert gegen ihn; ein gemischtes
  gewinnt. In `npm run sim` als eigene Prüfung.
* **Prio:** P1 · **Aufwand:** M · **Abhängig:** TF-015 (Effektsystem)

---

### TF-018 — Alle drei Grade zusammen eichen

* **Bereich:** Balancing · **Typ:** VERIFIED ISSUE
* **Ist:** Normal 41/60 (Ziel 30), Ruhig 80/80 (unverlierbar),
  Erbarmungslos 16–25/52 (stilabhängig).
* **Soll:** Ruhig verlierbar (Ziel: 55–70 von 80), Normal bei 28–35 von 60,
  Erbarmungslos für alle drei Stile schaffbar, aber knapp (8–20 von 52).
* **Umsetzung:** **Nicht** über `hpEnd` — durchprobiert, ab 20 fallen andere
  Tore. Die Hebel sind Startgold, `bountyMul`, `bonusMul` und `densityRamp`.
  Mit `npm run eichen` durchprobieren, nicht blind justieren (Regel 9).
* **Prio:** P2 · **Aufwand:** S · **Abhängig:** TF-005, TF-010 (erst danach
  eichen, sonst zweimal)

---

# MASTER ROADMAP

Die Stapel des Auftrags, mit den Tickets belegt. Was schon erledigt ist, steht
kursiv.

| Batch | Inhalt | Tickets | Zustand |
|---|---|---|---|
| **0 — Audit & Messbarkeit** | Debug-Overlay im Spiel (Weg, Reichweite, Ziel), Ereignissystem, lokale Kennzahlen | TF-027, TF-040 | offen |
| **1 — Kritische Stabilisierung** | *Spielstand, Trefferstopp, Inspektor, Kartennamen, Platzbedarf* | *v137–v139* | **erledigt** |
| **2 — Pathfinding & Movement** | Wegvorschau, Titanbreite, Bahnbelegung, **Bahnen auf die Straße** | TF-014, TF-030, E4, **TF-042** | TF-014 (v149), TF-030 widerlegt (v147); offen: E4, **TF-042** |
| **3 — Tower Placement** | Bauplätze dauerhaft, Ring ehrlich, Kosten an der Vorschau | TF-001, F2, F3 | offen |
| **4 — Targeting & Combat** | Geschoss-Ersatzziel, Mündungspunkt, Modus „hinten" | TF-007, TF-019, TF-032 | **abgeschlossen** (v144, v145, v146) |
| **5 — Core Tower Design** | Zweige mit Regeln, Rollen schärfen | TF-006, TF-021 | offen |
| **6 — Core Enemy Design** | Drei Archetypen, Fraktionsfarben, Bewegungsarten | TF-002, TF-024, J6 | offen |
| **7 — Counter & Synergy** | Effektsystem, Verstärkung, Wirksamkeitsrückmeldung | TF-015, TF-033, K2 | offen |
| **8 — Wave Design** | Dramaturgie, Erholungs- und Wirtschaftswellen, volle Vorschau | TF-023, TF-031, L1 | offen |
| **9 — Map Topology** | Spiralhain neu, Höhenvorteile, vierte Karte | TF-003, TF-025, TF-036 | offen |
| **10 — Economy** | Abschussgold hoch, Wellenruf, Nacheichung | TF-010, TF-005, TF-018 | offen |
| **11 — Boss System** | Phasen, Schwachstelle, Ankündigung | TF-008 | offen |
| **12 — Art Direction Lock** | **Art Bible** | TF-011 | offen |
| **13 — Asset Unification** | Jedes Bild einsortieren: behalten / leicht / stark / ersetzen | — | braucht TF-041 |
| **14 — Map Visual Rework** | Wegkontrast, Flächenanteil, Randgestaltung | P6 | braucht TF-011 |
| **15 — Tower Visual Rework** | Ein Winkel, eine Materialfamilie, lesbare Stufen | TF-017, I5 | braucht TF-041 |
| **16 — Enemy Visual Rework** | Silhouetten, Fraktionen, Bewegung | TF-024, J6 | braucht TF-041 |
| **17 — 2.5D / Licht** | *Tiefensortierung*, Randlicht, Umgebungsverdeckung | *v140*, TF-012 | teilweise |
| **18 — VFX & Game Feel** | Signaturformen je Turm, Wirksamkeit, Bodenstaub | TF-033, R2, Q2 | offen |
| **19 — HUD / UX** | Turmbilder im Knopf, schmalerer Steg, Wellenfortschritt | TF-022, TF-029, TF-038 | offen |
| **20 — Onboarding** | Weg zeigen, Konter erklären, Verkauf zeigen | TF-014, TF-034, T3 | offen |
| **21 — Progression** | Schloss, Sternziele, Herausforderungen | TF-009 | offen |
| **22 — Audio** | Grundklang, Anspannung, fehlende Rückmeldungen | TF-026, U4 | offen |
| **23 — Performance** | Messung auf echter Hardware, Langzeitsitzung | TF-040, V3 | braucht Nutzer |
| **24 — Accessibility** | Form statt Farbe, Schriftgröße, weniger Effekte | TF-028 | offen |
| **25 — QA & Regression** | Verkauf/Ausbau im Schuss, Bauplatz unter Bedienung | TF-016, X1 | TF-016 (v143); offen: X1 |
| **26 — Vertical Slice Gate** | **Hier bewusst anhalten.** | — | **Sperre** |
| **27 — Content** | weitere Karten, Türme, Gegner, Bosse | TF-013, TF-036 | nach Batch 26 |
| **28 — Meta Game** | Fertigkeitsbaum, Sammlung, Erfolge | — | nach Batch 27 |
| **29 — Live Ops** | Endlos-Bestenliste, Herausforderungen | — | nach Batch 27 |
| **30 — Final Polish** | — | — | zuletzt |

## Die Sperre in Batch 26

**Frage:** *Ist eine einzelne Karte bereits so gut, dass man sie einem fremden
Spieler ohne Erklärung zeigen kann?*

**Heute: nein.** Die Antwort wird erst dann ja, wenn auf der Ascheschlucht
(der besten Karte) gilt: der Weg ist von selbst verständlich, drei Türme haben
sichtbar verschiedene Rollen, mindestens zwei Gegner erzwingen eine Umstellung,
der Boss hat eine Phase, und alles steht unter einer Kamera.

**Vor dieser Antwort wird keine vierte Karte gebaut.**

---

# MISSING FEATURES ANALYSIS

## MUST HAVE (ohne diese ist es kein fertiges Spiel)

* Gegner mit Verhalten (TF-002)
* Boss mit Phasen (TF-008)
* Fortschritt und Freischaltung (TF-009)
* Wellenruf während einer Welle (TF-005)
* Zweige mit Regeln (TF-006)
* Art Bible und ein Kamerawinkel (TF-011, TF-017)
* Wegvorschau (TF-014)
* Effektsystem (TF-015)

## SHOULD HAVE

* Zwei bis vier weitere Türme mit eigenen Rollen (TF-013)
* Musik und Ambiente (TF-026)
* Telemetrie (TF-027)
* Barrierefreiheit über Farbe hinaus (TF-028)
* Höhenvorteile und Sichtlinien (TF-025)
* Wellenrollen (TF-031)

## COULD HAVE

* Vierte und fünfte Karte
* Fertigkeitsbaum über Läufe hinweg
* Endlos-Bestenliste
* Herausforderungen je Karte
* Wetter und Tageszeit

## SHOULD NOT HAVE

* Beute, Seltenheitsstufen, Sammelkarten
* Energie, Wartezeiten, Käufe
* Zufällige Turmangebote
* Mehrere Währungen
* Eine zweite Bildsprache für das Menü

---

# FEATURE KILL LIST

Ohne Rücksicht auf bereits investierte Arbeit.

| Streichen | Warum |
|---|---|
| **Der Endlosmodus in seiner heutigen Form** | Er wiederholt die letzten fünf Wellen mit einem Wachstumsfaktor. Das ist kein Modus, sondern eine Schleife. Entweder er bekommt eigene Regeln (Ausbaugrenze, Wellenwahl, Bestenliste) oder er kommt raus, bis Batch 29. |
| **Die Fähigkeit „Bollwerk"** | Sie ist eine zweite Bremse mit anderem Namen. Der Frostschlag tut dasselbe großflächiger. Eine der beiden streichen. |
| **Drei Schwierigkeitsgrade zum Start** | Ein neuer Spieler soll nicht wählen müssen, wie schwer sein erstes Spiel wird. Normal als einziger Grad, die anderen nach dem ersten Sieg. |
| **Der `topdown`-Zweig im Renderer** | Trägt bei allen acht Gegnern denselben Wert. Toter Code mit Wartungslast. |
| **Die leere Turm-Rückfallleinwand** | 8 MB für einen Weg, der im Browser nie läuft. |
| **Der Ausbau „Geschliffen" (+4 % Schaden)** | Zu klein, um eine Entscheidung zu sein, und er verwässert die Balance über alle Grade. Entweder deutlich stärker oder weg. |
| **Bauplatzbewertung im Spiel anzeigen** *(vorgeschlagen, aber verworfen)* | Würde die Kernentscheidung des Genres wegnehmen. Der Spieler soll selbst sehen, wo ein Platz gut ist — dafür braucht es bessere Karten (TF-003), nicht mehr Anzeige. |

---

# MANAGEMENT-ZUSAMMENFASSUNG

### 1. Warum würde ein Spieler es nach 20 Minuten löschen?

**Weil ihn nichts gefragt hat.** Er hat vier Türme gesehen, von denen der
billigste am besten war; acht Gegner, die alle dasselbe taten; drei Karten, von
denen zwei gleich funktionieren; und einen Boss, der nur mehr Leben hatte. Er
hat gewonnen, ohne zu wissen warum, und es gab nichts freizuschalten. Kaputt
war nichts.

### 2. Fünf Änderungen mit dem größten Effekt auf den Spielspaß

1. **Drei Gegner, die eine Entscheidung erzwingen** (TF-002)
2. **Welle rufen, während eine läuft** (TF-005)
3. **Zweige, die Regeln ändern statt Zahlen** (TF-006)
4. **Ein Boss mit Phasen** (TF-008)
5. **Fortschritt: Schloss und Sternziele** (TF-009)

### 3. Fünf Änderungen mit dem größten Effekt auf die Grafik

1. **Art Bible und ein einziger Kamerawinkel** (TF-011, TF-017)
2. **Randlicht an jeder Figur** (TF-012)
3. **Fraktionsfarben statt acht Bunttönen** (TF-024)
4. **Wegkontrast und Flächenanteil der Straße** (P6)
5. **Signaturformen je Turm bei Schuss und Einschlag** (R2)

### 4. Fünf technische Risiken

1. **Kein Effektsystem** — wird beim fünften Statuseffekt teuer (TF-015)
2. **`GameState` als Gemischtwarenladen** — Determinismus hängt an Disziplin
   statt an Struktur (TF-020)
3. **Angriffsarten als `if`-Kette** — neue Turmrollen passen nicht hinein
   (TF-021)
4. **Echte Hardware ungemessen** — alle Leistungszahlen unter Vorbehalt
   (TF-040)
5. **`art/roh/` fehlt** — kein Bild ist neu zu belichten (TF-041)

### 5. Fünf Designrisiken

1. Gegner ohne Rollen (TF-002)
2. Karten ohne eigene Frage (TF-003, TF-036)
3. Wirtschaft belohnt Zeit statt Können (TF-010)
4. Kein Fortschritt (TF-009)
5. **Der Umfang.** Drei Karten sind ein Zehntel. Der Plan muss verhindern,
   dass Content produziert wird, bevor eine Karte trägt — dafür die Sperre in
   Batch 26.

### 6. Fünf Funktionen, die am stärksten fehlen

1. Effektsystem (TF-015)
2. Boss mit Phasen (TF-008)
3. Fortschritt (TF-009)
4. Wegvorschau (TF-014)
5. Telemetrie (TF-027)

### 7. Was bewusst nicht gebaut wird

Siehe Feature Kill List. Kurz: keine Beute, keine Währungen, keine
Zufallsangebote, keine Wartezeiten, kein zweiter Bildstil, und keine vierte
Karte, bevor die zweite trägt.

---

# TOWER FRONT — NEXT 30

Der operative Plan, in Umsetzungsreihenfolge. Die Reihenfolge ist so gewählt,
dass jede Maßnahme auf der vorigen steht und **nach jeder** eine grüne Torkette
möglich ist.

| # | Ticket | Maßnahme | Bereich | Problem | Erwarteter Effekt | Prio | Aufwand | Abhängig |
|---|---|---|---|---|---|---|---|---|
| 1 | TF-001 | Bauplätze dauerhaft sichtbar | Placement | Nur unter dem Finger | Der letzte P0 der Bedienung fällt | P0 | S | — |
| 2 | TF-016 | Verkauf und Ausbau während eines Schusses prüfen | QA | Ungeprüfter Verweis | Zwei Lücken im Katalog zu | P1 | XS | **erledigt v143** |
| 3 | TF-007 | Geschosse suchen ein Ersatzziel | Combat | Schaden verschwindet | Sichtbar sauberes Gefecht | P1 | S | **erledigt v144** |
| 4 | TF-019 | Mündungspunkt je Turmart | Combat | Schuss aus der Mitte | Schüsse kommen aus dem Rohr | P2 | S | **erledigt v145** |
| 5 | TF-032 | Zielmodus „hinten" | Targeting | Durchbrecher | Fünfte echte Wahl | P2 | XS | **erledigt v146** |
| 6 | TF-030 | Titanbreite gegen Straßenbreite | Path | Ragt über den Rand | Kein Überstand mehr | P2 | XS | **widerlegt v147** — es gab keinen Überstand |
| 7 | TF-035 | Toten Code entfernen | Code | Ballast | Weniger Fläche für Fehler | P3 | XS | **erledigt v148** |
| 8 | TF-014 | Wegvorschau beim Kartenstart | Path Visibility | Woher kommt es? | Erste 10 Sekunden verständlich | P1 | S | **erledigt v149** |
| 9 | TF-023 | Wellenvorschau vollständig | Wave | Nur erste Gruppe | Vorbereitung möglich | P2 | S | **erledigt v151** — der Befund selbst widerlegt: alle Gruppen standen längst da; gefehlt haben Schild, Träger und ein Gefahrzeichen |
| 10 | TF-034 | Ein Satz je neuer Gegnerart | Onboarding | Konter unerklärt | Der Gleiter überrascht nicht mehr | P2 | S | **erledigt v152** — abgeleitet aus Gegner- und Turmdaten, nicht je Gegner geschrieben |
| 11 | TF-011 | **Art Bible** schreiben | Art | Keine Verbindlichkeit | Alle Bildarbeit bekommt einen Maßstab | P1 | M | **erledigt v153** — verbindliches Dokument, Messstelle je Festlegung, Bestellliste für `art/roh/` |
| 12 | TF-012 | Randlicht an jeder Figur | Technical Art | Silhouetten laufen in den Boden | Sichtbar mehr Plastik | P1 | S | **erledigt v156** — schwächster Saum 1,26 → 1,80, gemessen am gebackenen Bild |
| 13 | TF-024 | Fraktionsfarben statt Regenbogen | Enemy Art | Keine Familie lesbar | Gegner werden gruppierbar | P2 | S | 11 |
| 14 | TF-015 | **Effektsystem** (Liste statt Felder) | Combat | Zwei Wirkungen | Grundlage für alles Weitere | P1 | M | — |
| 15 | TF-033 | Wirksamkeit sichtbar (Abpraller, Dämpfung) | VFX | Man sieht nicht, ob es wirkt | Der Spieler lernt Konter von selbst | P2 | S | 14 |
| 16 | TF-005 | Welle rufen während einer Welle | Wave/Economy | Kein Risiko-gegen-Gold | Der Rhythmus entsteht | P1 | S | — |
| 17 | TF-010 | Abschussgold hoch, Wellenbonus runter | Economy | 79 % Zeitlohn | Spielen zahlt sich aus | P1 | S | 16 |
| 18 | TF-018 | Alle drei Grade zusammen eichen | Balancing | Verschoben und stilabhängig | Grade fragen wieder etwas | P2 | S | 16, 17 |
| 19 | TF-006 | Zweige ändern Regeln | Tower | Folgenlos | Die zentrale Entscheidung trägt | P1 | M | 14 |
| 20 | TF-002a | Gegner: **Sanitäter** | Enemy | Keine Reihenfolge nötig | Erste erzwungene Entscheidung | P0 | M | 14 |
| 21 | TF-002b | Gegner: **Gräber** | Enemy | Kein Ortsdruck | Zweite erzwungene Entscheidung | P0 | M | 14, 20 |
| 22 | TF-002c | Gegner: **Störer** | Enemy | Klumpen ist optimal | Verteilung wird nötig | P0 | M | 14, 21 |
| 23 | TF-031 | Wellenrollen (Lernen, Prüfen, Erholung, Druck) | Wave | Nur mehr davon | Dramaturgie | P2 | S | 20–22 |
| 24 | TF-008 | Boss mit drei Phasen | Boss | Nur Lebenspunkte | Höhepunkt | P1 | M | 14, 23 |
| 25 | TF-003 | Spiralhain neu bauen | Map | 47 % durch einen Platz | Die erste Karte lehrt das Richtige | P0 | M | — |
| 26 | TF-025 | Höhenvorteile und Sichtlinien | Map | Plätze austauschbar | Ort entscheidet | P2 | M | 25 |
| 27 | TF-009 | Schloss und Sternziele | Progression | Kein Grund für Runde zwei | Fortschritt entsteht | P1 | M | 25 |
| 28 | TF-022 | Turmbilder in den Knöpfen | UI | Keine Wiedererkennung | Schnellere Auswahl | P2 | S | 11 |
| 29 | TF-027 | Ereignissystem und lokale Kennzahlen | Telemetry | Balance ohne Spieler | Messbarkeit statt Vermutung | P2 | M | — |
| 30 | — | **Vertical Slice Gate** auf der Ascheschlucht | Product | — | Entscheidung über Content-Produktion | P0 | S | alle |

---

# FINALER GAME-DIRECTOR-CHECK

> *Wenn alle Maßnahmen umgesetzt sind — ist Tower Front dann nur ein technisch
> besseres Tower-Defense-Spiel, oder hat es eine eigene Identität?*

**Nach diesem Plan allein: noch nicht eindeutig.**

Was der Plan liefert, ist ein **sehr gutes Genrespiel**: klare Rollen, echte
Konter, lesbare Karten, eine kohärente Bildwelt, ein Boss, Fortschritt. Ein
Spieler würde es als handwerklich hervorragend erkennen — aber nicht
zwangsläufig als *Tower Front*.

## Was für eine eigene Identität noch fehlt

**1. Eine eigene strategische Sprache.** Jedes gute Genrespiel hat eine
Mechanik, die nur ihm gehört. Der **Schild an der Wellengruppe** ist der
Ansatz dazu: eine Bedrohung, die nicht am Gegnertyp hängt, sondern an der
Welle — die *dieselbe* Gegnerart einmal harmlos und einmal gefährlich macht.
Diese Idee ist heute ein Detail. Zur Identität wird sie, wenn sie zum System
ausgebaut wird: **Wellenzustände**, die eine bekannte Gegnerart verändern —
gepanzert, geschirmt, beschleunigt, getarnt, verstärkt. Dann lernt der Spieler
nicht acht Gegner, sondern acht Gegner **mal** fünf Zustände, und die
Wellenvorschau wird zum eigentlichen Rätsel. Das gibt es so im Genre nicht.

**2. Eine eigene Fiktion.** „Kristall verteidigen gegen Wesen" ist die
Standardaufstellung. Tower Front hat unbenutztes Material: die **Tore der
Leere**, aus denen die Gegner kommen, und einen **Herzkristall**, dessen
Bruchstücke die Türme antreiben. Daraus ließe sich eine eigene Fiktion bauen —
*jeder Turm kostet Kristall, und der Kristall ist zugleich das, was verteidigt
wird*. Das wäre eine Wirtschaft, die aus der Fiktion kommt statt aus der
Genrekonvention, und sie beantwortet TF-010 auf eine Weise, die nur hier
funktioniert.

**3. Ein eigener Blick.** Die stärkste vorhandene Eigenheit ist technisch: das
Spiel misst sich selbst. Zwanzig Tore, 98 Gegenproben, Werkzeuge, die Bilder
lesen. Das ist keine Spielereigenschaft — aber es erlaubt eine, die andere
sich nicht leisten: **ein Spiel, das seine eigene Balance offenlegt.** Ein
Ergebnisbildschirm, der zeigt, welcher Turm wieviel getragen hat, wo es eng
wurde, welche Entscheidung den Unterschied machte. Nicht als Statistik,
sondern als Nachbesprechung.

## Die drei Sätze, die noch fehlen

Bevor Batch 27 beginnt, muss beantwortet sein:

1. **Wie heißt die Mechanik, die nur Tower Front hat?**
   *Vorschlag: Wellenzustände.*
2. **Warum verteidigt man diesen Kristall, und warum kosten Türme ihn?**
   *Vorschlag: Türme sind Splitter des Kristalls — jeder Bau schwächt das,
   was man schützt.*
3. **Woran erkennt man ein Bild aus Tower Front in einem Bilderraster?**
   *Vorschlag: eine Kamera, drei Materialien, Türkis gegen warmen Boden — und
   Gegner, die als Fraktion auftreten, nicht als Sammlung.*

**Solange diese drei Sätze nicht stehen, ist jede Content-Produktion
verfrüht.**
