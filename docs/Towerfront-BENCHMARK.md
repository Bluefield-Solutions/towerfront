# Towerfront — Genre-Abgleich

Messung: v35 · 08.08.2026 · Aktueller Wert: **27 von 30 Kriterien, gewichtet 93 %**

*Verlauf: v11 = 18/27 (69 %) → v12 = 19/27 (73 %) → v15 = 21/30 (74 %) → v17 = 22/30 (76 %) → v18 = 24/30 (85 %) → v20 = 27/30 (93 %), K4, K5 und K6 erfüllt.
In v15 kamen drei Grafik-Kriterien in den Katalog; zwei davon sind erfüllt.*

Dieses Dokument ist die Grundlage für `npm run bericht`. Es hält fest, *woher*
jedes Kriterium stammt — jeder Punkt im Katalog geht auf ein Spiel zurück, das
von Spielern hoch bewertet wird, oder auf eine oft geäußerte Kritik.

---

## 1. Die Referenzen und warum gerade diese

**Bloons TD 6** — 97 % positive Bewertungen bei über 223.000 Steam-Rezensionen
und damit das am besten bewertete Tower-Defense-Spiel auf Steam. Die Tiefe kommt
aus dem Drei-Pfad-Ausbau: jeder der 23 Türme verzweigt in drei Zweige, von denen
nur zwei ausgebaut werden können. **Damit ist jede Platzierung auch eine
Bauentscheidung, nicht nur eine Positionsentscheidung.**

**Kingdom Rush** (Ironhide) — die meistgenannte Serie der 2010er, gelobt für
Türme mit klaren Rollen, Gegner mit klaren Gegenfragen und Karten mit
Gabelungen. Rezensenten heben hervor, dass die Wege *nicht* statisch sind:
Gegner kommen aus mehreren Richtungen, Pfade treffen sich an Gabelungen. Die
Kaserne ist dabei die interessanteste Turmart — sie tötet kaum, sie *hält auf*.
Der Serie wird umgekehrt vorgeworfen, dass ohne Vorlaufoption lange Abschnitte
sich ziehen und zur Pflicht werden.

**Plants vs. Zombies** — über zehn Millionen verkaufte Einheiten, gelobt für die
schrittweise Einführung: Mechaniken werden im Spiel gelernt, nie vorweg erklärt.

**Defense Grid** — brachte mehrere Wegoptionen ins Genre; Spieler bauen den Weg
mit, statt nur daneben.

**Defender's Quest** — die klarste veröffentlichte Designphilosophie im Genre:
*Lass den Spieler sich konzentrieren, prüfe sein Denken.* Daraus: scrollende
Karten sind der Feind der Konzentration, und das Fehlen einer Pause, in der
gebaut werden darf, gilt dort ausdrücklich als der eine große Fehler eines
sonst hervorragenden Spiels.

**Spielerkritik aus Rezensionen und Spielejam-Rückmeldungen** — der am
häufigsten genannte Vorwurf an schwächere Vertreter: *„Tower Defense lebt von
Strategie, und man kann nicht planen, wenn man nichts weiß."* Fehlende
Turmwerte vor dem Kauf sind der Klassiker.

**Aus der Entwicklerliteratur** — der häufigste Baufehler ist, alles
gleichzeitig zu bauen: Helden, Mehrspieler, dutzende Türme, komplexe Wirtschaft,
bevor bewiesen ist, dass die Kernschleife trägt. Vier bis fünf ausgewogene Türme
reichen für einen Prototyp. *Diesen Fehler haben wir bisher vermieden.*

---

## 2. Wo wir stehen

| Bereich | Erfüllt | Kommentar |
|---|---|---|
| Fokus & Klarheit | 4/4 | Karte ohne Scrollen, Pause mit Baumöglichkeit, Tempo 1×/2×/3×, Werte vor dem Kauf |
| Rollen & Entscheidungen | 5/6 | Vier Türme, vier Wirkungsweisen, **verzweigter Ausbau**, Fähigkeiten, Luftlücke — es fehlt der Blocker |
| Gegner | 5/6 | Masse, Tempo, Panzerung, Luft, Zerfall, Boss — es fehlen unterstützende Gegner |
| Karten & Wiederspielwert | **6/6** | Drei Karten mit Gabelungen, drei Grade, Endlosmodus, Sterne je Karte und Grad, dauerhafte Verbesserungen |
| Politur | 7/8 | Ton, Auswertung, Einführung, Spielstand, Inspektor, animierte Gegner, lebende Welt — es fehlen antippbare Kleinigkeiten in der Karte |

Das Bild ist eindeutig: **Die Kernschleife ist auf Genre-Niveau, der
Wiederspielwert ist es nicht.** Wir haben ein sehr gutes einzelnes Spielbrett
und nichts, was danach kommt.

Das ist die gesündere Reihenfolge — die Entwicklerliteratur warnt genau vor dem
Gegenteil —, aber ab hier liegt der Hebel eindeutig bei Bereich „Karten".

---

## 3. Das Delta, nach Gewicht

| # | Fehlt | Vorbild | Nächster Schritt |
|---|---|---|---|
| R4 ●● | Etwas, das aufhält statt tötet | Kingdom Rush (Kaserne) | Blockturm, der Gegner bindet |
| G5 ●● | Unterstützende Gegner | Kingdom Rush, PvZ | Heiler oder Schildträger, der die Zielreihenfolge erzwingt |

**R3 ist seit v12 erfüllt.** Jeder Turm verzweigt auf Stufe 2 in zwei sich
ausschließende Richtungen — aus vier Türmen sind faktisch acht geworden, ohne
eine Zeile neuen Inhalt.

Der Bereich „Karten" ist seit v20 vollständig. Was bleibt, sind drei Punkte im
Spielinneren: ein Turm, der aufhält statt tötet (R4), ein Gegner, der die
Zielreihenfolge erzwingt (G5), und antippbare Kleinigkeiten in der Karte (P8).

**K1 und K2 sind seit v18 erfüllt.** Drei Karten mit eigenen Biomen, zwei davon
mit zwei Zuwegen, die sich unterwegs vereinen. Damit ergeben Sterne (K5) und
Fortschritt (K6) überhaupt erst Sinn — sie sind jetzt der größte verbliebene
Block.

---

## 4. Was wir besser machen als die Referenzen

Fair bleiben gehört zum Abgleich dazu.

- **Vorlauf.** Kingdom Rush wird vorgeworfen, dass lange Abschnitte sich ohne
  Vorlaufoption ziehen. Wir haben 1×/2×/3× von Anfang an.
- **Bauen während der Pause.** Der Fehler, den Defender's Quest bei Cursed
  Treasure benennt, ist bei uns geprüft ausgeschlossen — als Kriterium F2 in der
  Messung.
- **Frühstart-Bonus.** Belohnt Entschlossenheit, ohne Zögern zu bestrafen. Die
  meisten Referenzen lassen die Aufbaupause einfach laufen.
- **Auswertung nach der Partie mit Schadensanteil je Quelle.** In den
  Referenzen selten so konkret; sie beantwortet die Frage „was hat eigentlich
  getragen".
- **Gemessene Grafik.** Zeichenbefehle je Bild *und* Speicherbedarf der
  gebackenen Bilder stehen als Budget im Tor. Politur, die das Handy ausbremst,
  fällt beim Build durch statt beim Spieler.
- **Die Zweig-Waage.** Wir rechnen nach, ob beide Ausbaurichtungen eines Turms
  ähnlich viel Wirkung je Gold bringen. Der klassische Fehler verzweigter
  Ausbaubäume ist der tote Zweig — die Wahl, die keine ist.
- **Der Kristall zeigt seinen Zustand.** Verluste stehen nicht nur als Zahl im
  HUD, der Kristall bekommt sichtbare Risse.

---

## 5. Wie dieser Abgleich in jedem Lauf mitläuft

`npm run bericht` läuft als letzter Schritt von `npm run gate`. Er bricht
nichts ab — er legt das Delta auf den Tisch, jedes Mal.

Wo möglich wird **gemessen statt behauptet**. Beispiel F2: Statt zu erklären,
dass man während der Pause bauen darf, erzeugt das Werkzeug einen Spielzustand,
setzt ihn auf Pause und versucht zu bauen. Sechs Kriterien lassen sich so nicht
prüfen (F4, P1–P5); sie sind ausdrücklich als Handprüfung markiert und werden
in jedem Lauf neu beurteilt.

Jeder Lauf berichtet danach drei Dinge:

1. **Abgleich** — wo stehen wir gegen die Besten, was hat sich verschoben.
2. **Prozess** — was an der Pipeline besser geworden ist.
3. **Spiel** — was am Spiel besser geworden ist.
