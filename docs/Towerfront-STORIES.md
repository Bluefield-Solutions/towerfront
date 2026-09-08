# Towerfront — Stories

Stand: v251 · 08.09.2026

Zu `KATALOG.md`. **42 Stories in acht Paketen, in der Reihenfolge, in der sie
gefahren werden.** Jede Story ist eine Runde Arbeit: eine Änderung, eine
Torkette, eine Auslieferung.

**Vor der ersten Zeile Code, jedes Mal:**

* Regel 1 — erst einchecken, dann `npm run proben`. Gegenproben arbeiten mit
  `git checkout`.
* Regel 9 — vor dem Justieren den Raum ansehen (`npm run eichen`), nie einen
  Einzelwert raten.
* Regel 12 — jede Zahl trägt ihre Messstelle. „Rund die Hälfte" ist keine Zahl.
* Die Torkette hat 32 Schritte und rund 2,5 min. Keine Story darf sie
  verlängern, ohne es zu begründen.

**Zu den Schließbedingungen.** Sie sind für `npm run doku` geschrieben und
benutzen nur die fünf zugelassenen Formen. Zwei Fallen stehen in `KATALOG.md`
Abschnitt 7 und gelten für jede Zeile hier: die Kennung muss beim Übertragen
ins Rückstandsverzeichnis dem Muster `[A-Z]+\d+` folgen (aus `S-P1-03` wird
`SP103`), und `text … >= n` zählt buchstabengetreu und auch in Kommentaren —
deshalb steht fast überall `>= 2` (Definition **und** Benutzung).

**Zu den Rückbau-Stories.** Sie tragen `== 0` und sind damit **heute schon
erfüllt**. Sie werden erst dann ins Rückstandsverzeichnis eingetragen, wenn die
zugehörige Mechanik steht und die Abnahme gerissen ist — vorher würde
`npm run doku` zu Recht melden, dass die Zeile lügt.

---

# Paket P1 — Die Spannung wird messbar

---

### S-P1-00 · Bildbestellung: Symbole statt Sätze für das Turmmenü

**Paket:** P1 · **Aufwand:** S · **Hängt an:** nichts

**Problem.** Zwei der zwölf HUD-Soll-Punkte sind offen (H4, H6), und beide
hängen an derselben Sache: das Turmmenü braucht auf 844 × 390 gemessen **228
Punkte**, frei sind **218**; der erklärende Zweigsatz braucht **90 Punkte**,
die es nicht gibt. Vier Auswege sind in v239 gemessen und reichen nicht
(zweispaltige Werte −43, breitere Karte macht es schlechter, Werte gegen Ziele
−6, Vorschau nach oben +46 bei wachsender Kopfzeile). Die Antwort ist dieselbe,
die Kingdom Rush und Bloons TD 6 geben: **Symbole statt Sätze.** Das ist
Bildmaterial, kein Code — und der Nutzer ist der einzige Weg zum Bild-Agenten.

**Was gebaut wird.** Ein neuer Abschnitt **6.8** in
`docs/Towerfront-BILDAUFTRAG.md`: acht Zweigsymbole (`symbol_zweig_sniper`,
`_volley`, `_eternal`, `_shard`, `_cluster`, `_breaker`, `_fork`, `_lens`),
je 96 × 96, Alpha, dieselbe Stilvorlage wie Abschnitt 1, jedes Symbol trägt die
Akzentfarbe seines Zweiges aus `src/data/towers.ts`. Der Auftrag steht ZUERST
im Dokument und wird von dort ausgegeben (`npm run bildprompt -- zweig`), nicht
im Gespräch. Dazu die Abnahmezahlen: Silhouetten-Überdeckung untereinander
höchstens 0,65 (Art Bible 5.2), Feindetail in **Anzeigegröße** gemessen,
Gesamtgewicht des Satzes höchstens 20 KB eingebettet (heute 1429 von 1800 KB).
Ausgeliefert wird an den Nutzer ein **fertiger Block zum Kopieren**, der
wiederholt, worauf er antwortet, die Zahlen nennt und sagt, was unverändert
gilt.

**Abnahme.**
* `npm run bildprompt -- zweig` gibt acht vollständige Prompts aus, Stil-Block
  schon eingesetzt, jeder in einem Stück kopierbar.
* `npm run doku` bleibt grün (der Auftrag verletzt keine Begriffsregel).
* `npm run gate` unverändert grün — es wird kein Code angefasst.
* Kein Bild wird eingebaut. Diese Story **blockiert nichts**; sie geht heraus
  und wartet.

**Gegenprobe.** In `tools/bildprompt.ts` den Stil-Block-Einsatz entfernen. Das
Werkzeug muss melden, dass ein Prompt ohne Stil-Block herausgeht — sonst
bekäme der Bild-Agent acht Aufträge ohne Stil, und niemand sagt es.

**Schliesst, wenn:** `text docs/Towerfront-BILDAUFTRAG.md "symbol_zweig_" >= 2`

---

### S-P1-01 · `npm run sim` fährt drei Aussaaten, und die Zweigtabelle mittelt

**Paket:** P1 · **Aufwand:** M · **Hängt an:** nichts

**Problem.** `tools/sim.ts` Zeile 21 trägt `const SEEDS = [20260807];` — eine
einzige Aussaat für jede Balancezahl dieses Projekts. Die drei „Abwandlungen"
(Zeile 30) verstellen die Rücklage des Bots und seinen Startplatz, nicht den
Zufallsgeber. Und die Zweigtabelle (Zeile 709 bis 713) läuft als **ein einziger
Lauf je Zweig** durch, während sechs andere Kennzahlen über `overVariants`
mitteln — direkt unter dem eigenen Kommentar der Datei: *„gemessen an einem
einzelnen Verlauf ist das Chaos, nicht Balance."* Nachgemessen auf einem Klon
von `5623c3b` mit vier Aussaaten: der Zweigunterschied beim Mörser beträgt
+11 / +1 / +3 / +1 Kristall, der Stilabstand 6 / 10 / 5 / 7 Punkte. **Die
Effekte, die dieses Projekt justiert, sind kleiner als die Streuung seines
Messverfahrens.**

**Was gebaut wird.** In `tools/sim.ts`:
* `const AUSSAATEN = [20260807, 11111111, 22222222];` an die Stelle von
  `SEEDS`. `play` bekommt die Aussaat aus der Schleife, nicht aus `SEEDS[0]`.
* `overVariants` mittelt über **Aussaat × Abwandlung** (9 Läufe statt 3) und
  gibt neben dem Mittelwert die **Spanne** zurück.
* Die Zweigtabelle läuft durch dieselbe Mittelung. Sie gibt je Zweigpaar
  Mittelwert **und** Spanne aus.
* Jede Zeile, die eine Kennzahl meldet, nennt daneben die Spanne über die
  Aussaaten — die **Rauschgrenze**. Eine Kennzahl, deren Effekt kleiner ist als
  ihre eigene Spanne, wird als `UNBELEGT` gekennzeichnet statt als Zahl.
* Laufzeit: die Kette hat 2,5 min, `sim` ist ein Teil davon. Wenn drei
  Aussaaten die Kette über 4 min treiben, laufen im Tor **zwei** Aussaaten und
  die dritte nur unter `--voll`. Die gemessene Laufzeit gehört in den
  Quelltext.

**Abnahme.**
* `npm run sim` nennt die Aussaaten, die es gefahren ist, und je Kennzahl
  Mittelwert **und** Spanne.
* Der Zweigtabelle steht je Zeile die Spanne daneben; wo der Unterschied
  kleiner ist als die Spanne, steht `UNBELEGT`.
* `npm run determinism` bleibt grün — die Aussaaten sind fest, nicht zufällig.
* `npm run gate` grün; die gemessene Gesamtlaufzeit steht im Bericht.

**Gegenprobe.** In `tools/sim.ts` die Aussaatschleife auf `AUSSAATEN[0]`
zurückschneiden, also den Zustand von heute herstellen. `npm run sim` muss
melden, dass es weniger Aussaaten gefahren hat als `AUSSAATEN` nennt — eine
Mittelung über eine Aussaat ist keine.

**Schliesst, wenn:** `text tools/sim.ts "AUSSAATEN" >= 2`

---

### S-P1-02 · Die vier Spannungszahlen werden Ratschen

**Paket:** P1 · **Aufwand:** M · **Hängt an:** S-P1-01

**Problem.** G1, G4, G5 und G2 stehen in einem Dokument und in einem Hinweis,
den `npm run sim` ausgibt, ohne abzubrechen (`OFFEN (T15): …`). Eine Regel, die
nur aufgeschrieben ist, wird gebrochen — das hat dieses Projekt sechsmal
gekostet. Belegt: zwischen v238 und v248 ist der Stilabstand von 9 auf 6
gefallen, also **schlechter geworden**, und kein Tor hat ein Wort gesagt.

**Was gebaut wird.** Eine **Ratsche je Kennzahl**, nach dem Muster von
`bahntreue` und `wegdeckung`: `tools/spannung-stand.txt` hält die heute
gemessenen Werte, `tools/sim.ts` liest sie und bricht ab, sobald eine Zahl
darunter fällt. Der **Soll**-Wert steht daneben und wird als Hinweis geführt,
solange er nicht erreicht ist — eine Ratsche ist kein Soll.

| Kennzahl | Stand heute (Klon `5623c3b`, 3 Aussaaten) | Soll |
|---|---|---|
| Stellen, an denen Verluste liegen | 2 | ≥ 5 |
| längste folgenlose Strecke | 13 Wellen | ≤ 3 |
| Gold übrig am Ende | 42,7 % | < 20 % |
| Abstand der Spielstile | 6 (Spanne 5–10) | ≥ 20 |
| kleinste Zweigwirkung | UNBELEGT | ≥ 9 von 60 |

Die Werte werden beim Bau der Story **neu gemessen** und nicht aus dieser
Tabelle abgeschrieben: sie entstand auf einem Klon, nicht im Baum (Regel 12).

**Abnahme.**
* `npm run sim` bricht ab, wenn eine der fünf Zahlen unter den Stand fällt, und
  nennt dabei Kennzahl, Stand, neuen Wert und Messstelle.
* Der Soll-Abstand steht als Hinweis in jedem Lauf.
* `npm run gate` grün.

**Gegenprobe.** In `tools/probes.mjs` eine Probe, die `hpEnd` im Grad `normal`
von 19,5 auf 12 senkt. Das Spiel wird dadurch leichter, die Verluste fallen auf
eine Stelle — `sim` muss anschlagen und die Kennzahl „Stellen" nennen. Zweite
Probe: `tools/spannung-stand.txt` leeren; `sim` muss melden, dass es keinen
Stand hat, statt stillschweigend durchzugehen (eine leere Datei galt in v227
schon einmal als sauber).

**Schliesst, wenn:** `text tools/sim.ts "Spannungsratsche" >= 2`

---

### S-P1-03 · Entscheidungen je Welle werden gezählt

**Paket:** P1 · **Aufwand:** S · **Hängt an:** S-P1-01

**Problem.** Das Spielspaß-Audit rechnet „12 Bauentscheidungen und 24
Ausbauentscheidungen, also 36 — gut zwei je Welle, und die meisten davon früh".
Die 36 sind zwei Summenfelder des Ergebnisses; **wann** sie fallen, misst
niemand. Damit lässt sich nicht sagen, ob eine Welle überhaupt eine
Entscheidung enthält — und genau das ist G7.

**Was gebaut wird.** `play()` in `tools/sim.ts` führt einen Zähler je Welle:
Bauen, Ausbauen, Verkaufen, Versetzen, Fähigkeit, Zielmodus geändert. Ausgabe
als Zeile `Entscheidungen je Welle: W1:3 W2:1 …` plus zwei abgeleitete Zahlen:
**Wellen ohne jede Entscheidung** und **Anteil der Entscheidungen in der ersten
Hälfte des Plans**.

**Abnahme.**
* `npm run sim` gibt beide Zeilen aus, mit Messstelle („gezählt am Bot, drei
  Aussaaten × drei Abwandlungen").
* Die Zahl der entscheidungslosen Wellen geht als sechste Kennzahl in die
  Ratsche aus S-P1-02.

**Gegenprobe.** Die Rücklage des Bots (`reserve`) in `tools/probes.mjs` auf
9999 setzen: er kann nichts mehr kaufen, alle 15 Wellen sind entscheidungslos.
`sim` muss anschlagen. Ohne diese Probe bewiese die Zeile nur, dass ein Zähler
zählt.

**Schliesst, wenn:** `text tools/sim.ts "entscheidungenJeWelle" >= 2`

---

### S-P1-04 · Dauer und Leerlaufanteil einer Partie

**Paket:** P1 · **Aufwand:** S · **Hängt an:** S-P1-01

**Problem.** Der reine Gegnerausstoß aller fünfzehn Wellen des Spiralhains
beträgt 201 Sekunden; wie lange eine Partie **wirklich** dauert und wieviel
davon Warten ist, steht nirgends. `stats.duration` wird mitgeführt und nie
ausgewiesen. Ohne diese Zahl hat P4 (überlappende Wellen) kein Vorher und kein
Nachher.

**Was gebaut wird.** `tools/sim.ts` gibt je Karte aus: Dauer der Partie in
Sekunden und **Leerlaufanteil** — der Anteil der Spielzeit, in dem kein
einziger Gegner lebt und keine Welle ausstößt. Beides gemittelt über Aussaaten
und Abwandlungen, mit Spanne.

**Abnahme.**
* `npm run sim` nennt je Karte Dauer und Leerlaufanteil mit Spanne.
* Die Zahlen stehen im Bericht (`npm run bericht` bleibt unberührt).

**Gegenprobe.** In `tools/probes.mjs` die Wartezeit des Bots zwischen zwei
Wellen künstlich verdoppeln (`decideEvery` × 4 wirkt nicht — es muss die
Wellenstartschwelle sein). Der Leerlaufanteil muss messbar steigen; tut er es
nicht, misst die Zahl etwas anderes (Regel 13).

**Schliesst, wenn:** `text tools/sim.ts "leerlaufAnteil" >= 2`

---

### S-P1-05 · Der Genre-Abgleich sagt seit 213 Fassungen etwas anderes als sein Werkzeug

**Paket:** P1 · **Aufwand:** S · **Hängt an:** nichts

**Problem.** `docs/Towerfront-BENCHMARK.md` beginnt mit *„Messung: v35 ·
08.08.2026 · Aktueller Wert: 27 von 30 Kriterien, gewichtet 93 %"*, führt
**drei** Karten und nennt R4 („etwas, das aufhält statt tötet") und G5
(„unterstützende Gegner") als fehlend. Gemessen im Klon von `5623c3b`:
`npm run bericht` meldet **30/30, gewichtet 100 %**, es gibt **vier** Karten,
R4 ist seit Langem das Bollwerk (`src/data/abilities.ts` nennt R4 im
Quelltext) und G5 der Schildträger (v110). Das Dokument sagt von sich selbst,
es sei „die Grundlage für `npm run bericht`".

**Der Wächter kann es nicht sehen, und das ist der eigentliche Fund.**
`tools/docs.mjs` Zeile 321 sucht `Stand: (v\d+)` und überspringt jede Datei
ohne diese Form — „ein Messbericht trägt `Messung: vNN` und beschreibt
absichtlich den Stand von damals". Der Ausnahmegrund ist richtig; er trifft nur
dieses Dokument nicht, weil es kein Messbericht ist, sondern eine lebende
Grundlage.

**Was gebaut wird.** `docs/Towerfront-BENCHMARK.md` bekommt eine Zeile
`Stand: v249` (oder die dann gültige Fassung) und wird auf das gezogen, was
`npm run bericht` misst: 30/30, vier Karten, R4 und G5 erledigt mit
Fassungsnummer. Die Zahlen im Abschnitt „Wo wir stehen" werden durch den
**Befehl** ersetzt, aus dem sie kommen — nach dem Muster, das
`Towerfront-GROESSENHAUSHALT.md` in v230 bekommen hat. Der historische Verlauf
bleibt als Verlauf stehen und wird ausdrücklich als solcher markiert.

**Abnahme.**
* `npm run doku` führt die Datei ab jetzt in der Standregel; nachgefahren mit
  einem gefälschten `Stand: v200` muss der Lauf **rot** werden.
* Die Zahl im Dokument und die Zahl aus `npm run bericht` sind dieselbe.

**Gegenprobe.** In `tools/probes.mjs` eine Probe, die `Stand: v` in
`docs/Towerfront-BENCHMARK.md` durch `Messung: v` ersetzt. `npm run doku` muss
melden, dass ein lebendes Dokument sich der Standregel entzieht — sonst ist die
Ausnahme aus Zeile 321 ein Loch, durch das jedes Dokument schlüpfen kann.

**Schliesst, wenn:** `text docs/Towerfront-BENCHMARK.md "Stand: v" >= 1`

---

### S-P1-06 · E6 wird von einem Großbuchstaben offengehalten

**Paket:** P1 · **Aufwand:** S · **Hängt an:** nichts

**Problem.** E6 („Das Wellenband: Vorschau, Fortschritt, lebender Hauptknopf")
steht als offen im Rückstandsverzeichnis. Alle drei Symptome, die es beschreibt,
sind seit v239 behoben: `src/ui/ui.ts` Zeile 835 setzt
`Welle ${s.waveNumber} · noch ${s.wellenRest}`, die Vorschau bleibt stehen
(`vorschauWelle`), und die Trefferfläche der Anzahl-Marke misst laut
HUD-Audit H12 **52 × 46** statt der 38 × 20, die E6 behauptet. Offen bleibt der
Punkt nur, weil seine Bedingung `text src/ui/ui.ts "wellenfortschritt" >= 1`
klein schreibt und der Quelltext an Zeile 828 `Wellenfortschritt` groß —
gemessen **0 Treffer klein, 1 groß**. `tools/docs.mjs` vergleicht
buchstabengetreu (`inhalt.split(wort).length - 1`).

**Was gebaut wird.** Zwei Dinge, und die zweite ist die wichtigere:
1. E6 wird in die Erledigt-Tabelle überführt, mit der Fassung, in der es
   wirklich zugefallen ist (v239), und mit dem Hinweis, dass die Zahl 38 × 20
   in E6 und die Zahl 52 × 46 im HUD-Audit denselben Gegenstand meinen und
   verschiedene Dinge messen (Kasten gegen Trefferfläche).
2. `tools/docs.mjs` meldet künftig, wenn eine Schließbedingung **nur in anderer
   Groß-/Kleinschreibung** in der Zieldatei vorkommt. Das ist der Teil der
   Lücke, den man billig halten kann; die zu hohe Schwelle bleibt ungehalten
   und steht als solche im Quelltext (S129).

**Abnahme.**
* `npm run doku` meldet den Fall „steht nur in anderer Schreibweise da" mit
  Kennung, Wort und Datei.
* Der Lauf bleibt grün, wenn kein solcher Fall vorliegt — eine Meldung, die
  immer kommt, ist keine (Regel 13).

**Gegenprobe.** Eine Probe in `tools/probes.mjs`, die die Schließbedingung
eines beliebigen offenen Punktes auf eine andere Schreibweise dreht (etwa
`Bannturm` → `bannturm`). `npm run doku` muss anschlagen. Dazu eine Nullprobe:
eine Bedingung, deren Wort **gar nicht** vorkommt, darf die neue Meldung
**nicht** auslösen — sonst sagt sie nur, dass ein Punkt offen ist.

**Schliesst, wenn:** `text tools/docs.mjs "andere Schreibweise" >= 2`

---

# Paket P2 — Knappheit

---

### S-P2-01 · Die Goldzahl misst heute den Bot, nicht das Spiel

**Paket:** P2 · **Aufwand:** M · **Hängt an:** S-P1-02

**Problem.** „42,7 % des verdienten Goldes bleiben liegen" ist die Kernzahl von
G5 — und das Spielspaß-Audit trägt ihre Einschränkung selbst: der Bot baut
höchstens zwölf Türme und 24 Ausbauten, er **kann** also gar nicht alles
ausgeben. Die Zahl beschreibt zu einem unbekannten Teil den Deckel des Bots.
Genau diese Klasse hat in v246 einen ganzen Rückstandspunkt (F7) als
Messfehler entlarvt: „auch der beste Spielstil holt nur zwei Sterne" hieß in
Wahrheit „auch der beste der drei bescheidenen Stile".

**Was gebaut wird.** Eine Kennzahl, die den Deckel nicht mitmisst: der
**Knappheitsanteil** — der Anteil der Entscheidungszeitpunkte, an denen der Bot
einen gewollten Kauf **nicht bezahlen konnte**. Er hängt nicht daran, wieviel
der Bot bauen darf, sondern daran, ob Gold der Engpass ist. Dazu läuft die
Goldzeile ein zweites Mal mit dem **Bestleistungs-Bot** (24 Türme, Stufe 6,
existiert seit v246) — dann steht neben der gedeckelten Zahl die ungedeckelte.

**Abnahme.**
* `npm run sim` nennt Knappheitsanteil je Spielstil und je Karte, mit Spanne
  über die Aussaaten.
* Die Goldzeile nennt beide Zahlen: gedeckelt und Bestleistung.
* Der Knappheitsanteil tritt in der Ratsche aus S-P1-02 **an die Stelle** von
  „Gold übrig"; „Gold übrig" bleibt als Hinweis stehen, weil es die Zahl ist,
  die im Audit steht.

**Gegenprobe.** In `tools/probes.mjs` `startGold` im Grad `normal` von 220 auf
5000 setzen. Der Knappheitsanteil muss auf nahe null fallen und die Ratsche
anschlagen. Und umgekehrt: `startGold` auf 50 — er muss messbar steigen. Eine
Kennzahl, die sich in beide Richtungen nicht bewegt, misst etwas anderes
(Regel 13).

**Schliesst, wenn:** `text tools/sim.ts "knappheitsAnteil" >= 2`

---

### S-P2-02 · Das Knie der Lebenskurve — erst den Raum ansehen, dann setzen

**Paket:** P2 · **Aufwand:** M · **Hängt an:** S-P2-01

**Problem.** Die Verluste liegen auf **jeder** der vier gemessenen Aussaaten an
genau zwei Stellen (W14, W15). Dreizehn Wellen kosten nichts. F9 hat den Hebel
schon gefunden und benannt: es ist nicht der Wellenplan, sondern das **Knie**
der Lebenspunktkurve — `KNEE_START = 0.55` in `src/data/difficulty.ts`. In v239
gemessen: 0,55 → 0,40 verteilt die Verluste auf drei Wellen statt zwei. Der
Wellenplan trägt es nicht: `npm run wellenbau` erzeugt formal perfekte Pläne
(null Rückfälle, Finale gleich Spitze) und treibt dabei den Druck der
Mittelwellen von 2976 auf 8768.

**Was gebaut wird.**
* `KNEE_START` und `KNEE_END` werden auf Deutsch benannt (`KNIE_ANFANG`,
  `KNIE_ENDE`) — das Verzeichnis schreibt Deutsch, auch im Quelltext, und die
  Umbenennung macht die Schließbedingung eindeutig.
* **Vor** dem Setzen: `npm run eichen` über `KNIE_ANFANG` von 0,30 bis 0,60 in
  Schritten von 0,05, alle Kennzahlen nebeneinander (Regel 9). Der Raum wird im
  Rückstandsverzeichnis abgelegt, nicht nur der gewählte Wert.
* Gesetzt wird der Wert, bei dem die Verluste an **mindestens vier** Stellen
  liegen und `npm run sim` weiter bestanden meldet. Ist das Fenster leer, wird
  das als Befund geschrieben und die Story endet ohne Änderung — ein leerer
  Raum ist ein Ergebnis (v246 hat drei Hebel so verworfen).

**Abnahme.**
* `npm run sim`: Verluste an ≥ 4 Stellen, gemittelt über drei Aussaaten.
* `npm run sim`: alle vier Karten weiter gewinnbar, drei Stile kommen durch,
  keine Karte mühelos.
* `npm run c18`: die erste Karte bleibt mit einer Fähigkeit zu gewinnen.
* `npm run guards`: die Ratsche der wirksamen Kurve (v240) hält je Karte.
* `npm run gate` grün.

**Gegenprobe.** `KNIE_ANFANG` auf 0,92 setzen, also gleich `KNIE_ENDE`: die
Kurve springt statt zu steigen. `npm run guards` muss die Kurvenratsche melden
und `npm run sim` die Verlustverteilung.

**Schliesst, wenn:** `text src/data/difficulty.ts "KNIE_ANFANG" >= 2`

---

### S-P2-03 · Der Kristall wird klein genug, dass ein Durchbruch wehtut

**Paket:** P2 · **Aufwand:** M · **Hängt an:** S-P2-02

**Problem.** Der Kristall steht auf 60. Ein Schleicher kostet 1, ein
Leerentitan 5 — also 1,7 % beziehungsweise 8,3 %. Kingdom Rush arbeitet mit 20
Leben, und ein einziger Durchbruch ist dort sichtbar teuer. Die Folge bei uns:
selbst wenn die Verluste (S-P2-02) über mehr Wellen verteilt sind, **kostet**
ein einzelner nichts, was man spürt. Das ist die zweite Hälfte von G1.

**Was gebaut wird.**
* `npm run eichen` über `startLives` im Grad `normal` von 24 bis 60 (Regel 9),
  alle Kennzahlen nebeneinander. Die anderen zwei Grade folgen anteilig —
  `ruhig` und `erbarmungslos` behalten ihr Verhältnis zu `normal`.
* Gesetzt wird der Wert, bei dem ein Durchbruch des schwersten Gegners
  **mindestens ein Zehntel** des Kristalls kostet und alle vier Karten weiter
  drei Sterne zulassen. Die Sternschwellen sind Anteile (`starsFor`) und wandern
  von selbst mit — das ist Regel 2 und war schon einmal ein Fehler.
* Ein Wächter hält es fest: `Durchbruchgewicht` in `tools/guards.ts` — der
  `leak` des schwersten Gegners geteilt durch `startLives` muss über der Schwelle
  liegen, **anteilig, nicht absolut**.
* `hpEnd` wird nachgezogen, falls die Karten dadurch unspielbar werden. Der
  Daten-Wächter lässt `hpMul` je Karte nur zwischen 0,85 und 1,2 zu; wird das
  gebraucht, ist die Story zu groß und wird geteilt.

**Abnahme.**
* `npm run guards`: `Durchbruchgewicht` ≥ 0,10 auf allen drei Graden.
* `npm run sim`: alle vier Karten auf drei Sterne erreichbar (Bestleistungs-Bot),
  die drei Stile weiter durchkommend, keine Karte mühelos.
* `npm run sim`: die Ratschen aus S-P1-02 halten oder verbessern sich.
* `npm run smoke`: die Kristallanzeige und die Risse zeigen den neuen Bereich
  (`npm run kristall -- --tor` prüft die Rissdeckung je Stufe).

**Gegenprobe.** `startLives` im Grad `normal` auf 600 setzen. Das
`Durchbruchgewicht` fällt unter die Schwelle, `npm run guards` muss anschlagen.
Zweite Probe: den `leak` des Leerentitanen von 5 auf 1 senken — dieselbe
Meldung, von der anderen Seite.

**Schliesst, wenn:** `text tools/guards.ts "Durchbruchgewicht" >= 2`

---

### S-P2-04 · Gold wird knapp

**Paket:** P2 · **Aufwand:** M · **Hängt an:** S-P2-03

**Problem.** Nach S-P2-01 steht der Knappheitsanteil als Zahl da. Er ist heute
gemessen niedrig, und das Symptom ist bekannt: der sparsame Stil gewinnt (89
gegen 83 beim Meister), weil Zurückhalten nichts kostet. Knappheit ist der
Motor jeder Aufbauentscheidung; hier läuft er im Leerlauf.

**Was gebaut wird.**
* `npm run eichen` über `bountyMul` und `bonusMul` im Grad `normal`
  (heute beide 1,0) sowie über die Wellenbonusse in `src/data/waves.ts`
  (heute 92 bis 1197 je Karte). Der Raum wird abgelegt.
* Gesetzt wird die Kombination, bei der der Knappheitsanteil über die Schwelle
  steigt **und** der Stilabstand nicht kleiner wird. Ziehen die beiden
  gegeneinander, gilt der Knappheitsanteil — und der Befund steht im
  Verzeichnis.
* Ein Wächter `Goldbindung` in `tools/guards.ts`: das über eine Partie
  verdiente Gold darf höchstens das X-fache dessen betragen, was die zwölf
  besten Bauplätze voll ausgebaut kosten. Anteilig, nicht absolut.

**Abnahme.**
* `npm run sim`: Knappheitsanteil steigt messbar gegen den Stand aus S-P2-01,
  Spanne über drei Aussaaten kleiner als der Effekt.
* `npm run sim`: „Gold übrig" fällt; das Ziel ist < 20 %, die Ratsche verlangt
  nur, dass es nicht steigt.
* `npm run guards`: `Goldbindung` hält auf allen vier Karten.
* `npm run c18`: die Eröffnung hält — die erste Karte bleibt mit einer
  Fähigkeit zu gewinnen. Das ist die Grenze, an der in v244 vier von acht
  Kandidatenwerten gescheitert sind.

**Gegenprobe.** `bountyMul` im Grad `normal` auf 3,0 setzen. Der
Knappheitsanteil muss einbrechen und `npm run guards` die `Goldbindung`
melden.

**Schliesst, wenn:** `text tools/guards.ts "Goldbindung" >= 2`

---

### S-P2-05 · Der Grad „Ruhig" verliert nie einen einzigen Punkt

**Paket:** P2 · **Aufwand:** S · **Hängt an:** S-P2-04

**Problem.** Gemessen (Klon `5623c3b`): auf „Ruhig" endet die Partie für **alle
drei** Spielstile mit **80 von 80** Kristall. Nicht ein Punkt geht verloren.
Das ist derselbe Defekt wie G1, eine Ebene tiefer: ein Grad, auf dem nichts
passieren kann, ist kein Grad, sondern ein Abspielmodus. Kein Tor sagt etwas —
die Prüfungen verlangen nur, dass nicht zu viele Stile scheitern.

**Was gebaut wird.** Eine Prüfung in `tools/sim.ts`: **kein Grad darf für alle
Spielstile verlustfrei enden.** Dazu die Zahlen des Grades „Ruhig"
(`startLives: 80`, `hpEnd: 10.7`, `bountyMul/bonusMul: 1.3`) so weit ziehen,
dass mindestens ein Verlust entsteht — der Grad soll sanft bleiben, nicht
folgenlos. `npm run eichen` über `hpEnd` von 10,7 bis 16 (Regel 9).

**Abnahme.**
* `npm run sim`: auf „Ruhig" verliert mindestens ein Spielstil mindestens einen
  Kristallpunkt, und alle drei gewinnen weiter.
* `npm run sim` bricht ab, wenn ein Grad für alle Stile verlustfrei endet.
* `npm run guards`: der Abstand zwischen den Graden bleibt gewahrt.

**Gegenprobe.** `hpEnd` auf „Ruhig" auf 4 senken. Die neue Prüfung muss
anschlagen. Und die Nullprobe dazu: mit dem heutigen Wert 10,7 muss sie
**ebenfalls** anschlagen — das ist der Zustand, den die Story behebt, und wenn
sie ihn nicht meldet, prüft sie nichts.

**Schliesst, wenn:** `text tools/sim.ts "verlustfrei" >= 2`

---

### S-P2-06 · Rückbau, falls die Knappheit die Karten unspielbar macht

**Paket:** P2 · **Aufwand:** S · **Hängt an:** S-P2-04
**Nur fahren, wenn** die Abnahme von S-P2-03 oder S-P2-04 reißt und nach drei
Schleifen nicht zu halten ist.

**Problem.** Knappheit und Spielbarkeit ziehen gegeneinander. In v246 sind drei
Balancehebel durchprobiert und alle drei gescheitert, weil kein Skalar die
Schwelle erreichte — und **genau das war der Hinweis, dass die Frage falsch
gestellt war**. Nach drei Schleifen ist nicht die Ausführung das Problem,
sondern das Ziel.

**Was gebaut wird.** `KNIE_ANFANG`, `startLives`, `bountyMul` und `bonusMul`
gehen auf die Werte von v248 zurück. Der gemessene Raum bleibt im
Rückstandsverzeichnis stehen — er ist das Ergebnis, nicht der Abfall. Die
Ratschen aus S-P1-02 bleiben auf den v248-Werten, damit nichts still schlechter
wird. Der Befund wandert als neuer offener Punkt ins Verzeichnis, mit der
Frage, die als Nächstes zu stellen ist.

**Abnahme.**
* `npm run sim` meldet wieder die Werte von v248 (± Rauschgrenze).
* `npm run gate` grün.
* Das Rückstandsverzeichnis nennt den vollständigen durchprobierten Raum, nicht
  nur das Scheitern.

**Gegenprobe.** Entfällt — die Story baut zurück, sie baut nichts. Stattdessen
wird der Rückbau **nachgefahren**: mit den alten Werten müssen die Ratschen aus
S-P1-02 exakt die v248-Zahlen wieder melden. Weichen sie ab, ist etwas anderes
mitgewandert.

**Schliesst, wenn:** `text src/data/difficulty.ts "KNIE_ANFANG" == 0`

---

# Paket P3 — Der Durchbruch ist ein Ereignis

---

### S-P3-01 · Der Kernraub: wer den Kristall erreicht, nimmt einen Splitter und kehrt um

**Paket:** P3 · **Aufwand:** L · **Hängt an:** S-P2-04

**Problem.** Ein durchgekommener Gegner ruft `leak()` in `src/game/state.ts`
(Zeile 1443): Kristall herunter, Ruckeln, roter Ring, Gegner tot. Das ist ein
Abzug, kein Ereignis. Defense Grid macht daraus einen Verlauf — der Gegner
**stiehlt** und trägt zum Ausgang zurück, und solange er lebt, ist nichts
endgültig verloren. Der schlimmste Augenblick des Spiels wird damit zum
spannendsten.

**Was gebaut wird.** In `src/game/state.ts`:
* Ein Gegner, der das Ziel erreicht, stirbt **nicht** mehr. Er bekommt
  `kernraub = wirklich` (die Punkte, die er trägt), kehrt um und läuft seine
  Bahn **rückwärts** zum Tor. Der Kristall fällt **sofort** — nicht erst am
  Tor —, sonst zeigt die Anzeige eine Zahl, die noch nicht wahr ist.
* Erreicht er das Tor, verschwindet er und die Punkte sind endgültig weg.
* **Flieger folgen keiner Bahn.** Ihr `travelled` wird aus der Luftlinie
  zurückgerechnet und in jedem Bild überschrieben (gemessen v219). Ein
  fliegender Räuber läuft deshalb die Luftlinie zurück zu seinem Torpunkt, und
  das gehört als Sonderfall in den Quelltext, nicht in eine Vermutung.
* Ein Räuber ist ein normales Ziel für Türme — kein Bonus, kein Malus. Was ihn
  gefährlich macht, ist die Richtung.

**Was dieses Tor entwertet — und die Ersatzprüfung.** Der Rauchtest hält seit
v232 eine **gestellte** Probe „Kristallverlust wird zu hoch verbucht": Kristall
auf 1, ein Koloss mit 3 Durchschlag ans Bahnende, ein Bild gerechnet, erwartet
wird „verbucht 1 statt 3". Mit dem Kernraub trifft der Aufbau einen anderen
Fall. Die Ersatzprüfung gehört in **dieselbe** Runde: derselbe gestellte
Aufbau, aber geprüft wird, dass der Räuber genau die Punkte trägt, die der
Kristall verloren hat — nie mehr, nie weniger.

**Abnahme.**
* `npm run smoke`: ein Gegner, der das Ziel erreicht, lebt danach, trägt
  `kernraub > 0` und läuft auf sein Tor zu (gestellt, nicht abgewartet).
* `npm run smoke`: `kernraub` eines Räubers ist gleich dem, was der Kristall
  verloren hat — die Ersatzprüfung für die entwertete Probe.
* `npm run smoke`: ein fliegender Räuber erreicht sein Tor ebenfalls (der
  Sonderfall wird gestellt).
* `npm run determinism`: zwei Läufe mit gleicher Aussaat bleiben bitgleich.
* `npm run sim` läuft durch; die Balance wird erst in S-P3-04 eingemessen.

**Gegenprobe.** In `tools/probes.mjs`: die Umkehr entfernen, sodass der Räuber
weiterläuft statt zurück. Der Rauchtest muss melden, dass ein Räuber sein Tor
nie erreicht. Zweite Probe: den Kristall erst am Tor abziehen statt sofort —
der Rauchtest muss den Unterschied zwischen Anzeige und Bilanz melden.

**Schliesst, wenn:** `text src/game/state.ts "kernraub" >= 2`

---

### S-P3-02 · Der Splitter kommt zurück, wenn der Träger stirbt

**Paket:** P3 · **Aufwand:** M · **Hängt an:** S-P3-01

**Problem.** Ohne die Rückholung ist der Kernraub nur ein langsamerer Abzug.
Der ganze Wert der Mechanik liegt in dem Fenster, in dem die Entscheidung noch
offen ist.

**Was gebaut wird.** Stirbt ein Räuber, entsteht ein **Splitter** an seiner
Stelle: er schwebt zum Kristall zurück und schreibt die getragenen Punkte
gut, sobald er ankommt. Er ist unverwundbar und braucht eine feste Zeit für
den Weg — nicht die Strecke, sonst wäre ein Räuber am Tor wertvoller als einer
am Kristall, und das ist genau falsch herum. Ein zweiter Gegner kann ihn
**nicht** aufnehmen: Defense Grid tut das, aber es hat dafür eine
Wegeplanung, die wir nicht haben, und eine Mechanik, die man nur zur Hälfte
baut, ist schlechter als keine.

Der Kristall kann durch Rückholung nie über seinen Höchstwert steigen
(`maxLives`), und der Abzug bei null bleibt gedeckelt — das ist die Zusage aus
v174, und sie darf nicht still wegfallen.

**Abnahme.**
* `npm run smoke`: ein gestellter Räuber wird getötet, ein Splitter entsteht,
  der Kristall steigt nach der Schwebezeit um genau die getragenen Punkte.
* `npm run smoke`: der Kristall übersteigt `maxLives` nie, auch nicht bei drei
  gleichzeitigen Splittern.
* `npm run smoke`: die Bilanz (`stats.leaksByWave`) zählt am Ende der Welle
  nur, was **wirklich** verloren ist.
* `npm run determinism` grün.

**Gegenprobe.** Die Deckelung auf `maxLives` entfernen: der Rauchtest muss
einen Kristall über dem Höchstwert melden. Zweite Probe: die Gutschrift
verdoppeln — die Bilanzprüfung muss anschlagen.

**Schliesst, wenn:** `text src/game/state.ts "splitterZurueck" >= 2`

---

### S-P3-03 · Man sieht und hört, dass gerade etwas fortgetragen wird

**Paket:** P3 · **Aufwand:** M · **Hängt an:** S-P3-02

**Problem.** Eine Mechanik, die man nicht sieht, gibt es nicht. Der
Schildträger hat es vorgemacht: gestrichelter Ring und Fäden zu denen, die er
versorgt — „die Reihenfolge muss man **sehen**, nicht erschließen".

**Was gebaut wird.**
* Ein Räuber trägt einen leuchtenden Splitter in der Farbe des Kristalls
  (`C.crystal`), sichtbar auch in der Bewegung, und einen Faden zurück zum
  Kristall, der mit der zurückgelegten Strecke schwächer wird.
* **Alles Leuchten wird gebacken** (Regel 11): kein `drawImage(self)` mit
  `filter: blur` oder `globalCompositeOperation: 'lighter'`. Auf iOS wird das
  Bild sonst nach etwa einer Sekunde schwarz, und auf dem Schreibtisch fällt es
  nicht auf.
* Zwei Geräusche: eines beim Raub, eines bei der Rückholung. Das
  Rückhol-Geräusch ist die Belohnung — es muss sich anders anfühlen als
  „Welle geschafft".
* Der Kristall bekommt seinen Riss beim Raub und verliert ihn bei der
  Rückholung wieder (`npm run kristall` misst die Rissdeckung je Stufe).
* Eine neue Aufnahme `kernraub` in `tools/shots.mjs`, damit die Sache im
  Bildtor liegt.

**Abnahme.**
* `npm run bildtor`: die Aufnahme `kernraub` besteht die mechanischen
  Prüfungen (keine einfarbige Fläche, richtige Helligkeit, Bilder dekodiert).
* `npm run kristall -- --tor`: die Rissdeckung folgt dem Kristallstand in
  beide Richtungen — auch nach oben, und das ist neu.
* `npm run bench-draw`: das Zeichenbudget hält.
* `blick:` — ob es gut aussieht, sagt kein Tor (Regel 8). Vor der Lieferung die
  vier Aufnahmen aus `npm run kritik` ansehen.

**Gegenprobe.** Den Faden und den Splitter am Räuber entfernen: das Bildtor
muss melden, dass sich die Aufnahme `kernraub` nicht mehr von der Aufnahme
einer normalen Welle unterscheidet. Ohne diese Probe bewiese die Aufnahme nur,
dass sie entsteht.

**Schliesst, wenn:** `text tools/shots.mjs "kernraub" >= 2`

---

### S-P3-04 · Die Karten werden mit dem Kernraub neu eingemessen

**Paket:** P3 · **Aufwand:** M · **Hängt an:** S-P3-03

**Problem.** Der Kernraub verschiebt jede Zahl: ein Leck ist nicht mehr
endgültig, also ist das Spiel leichter; ein Räuber läuft ein zweites Mal durch
die Türme, also ist es schwerer. Welche der beiden Richtungen überwiegt, ist
ungemessen — und eine gebaute Mechanik ohne Messung ist eine Vermutung mit
Quelltext.

**Was gebaut wird.**
* Eine neue Kennzahl in `tools/sim.ts`: **Rettungen** — wieviele Räuber pro
  Partie getötet werden, bevor sie ihr Tor erreichen, und wieviel Kristall
  dadurch zurückkommt. Sie geht in die Ratsche aus S-P1-02.
* Die Balance wird nachgezogen, falls nötig — zuerst über `hpEnd`, dann über
  das Tempo des Räubers (ein langsamer Räuber ist leichter zu retten). Der Raum
  wird durchprobiert (Regel 9), nicht geraten.
* Ziel: **mindestens ein Drittel und höchstens zwei Drittel** der Räuber werden
  gerettet. Unter einem Drittel ist die Mechanik Dekoration, über zwei Dritteln
  ist ein Leck folgenlos — dann wäre G1 von der anderen Seite kaputt.

**Abnahme.**
* `npm run sim`: Rettungsanteil zwischen 33 und 67 %, gemittelt über drei
  Aussaaten, Spanne kleiner als das Band.
* `npm run sim`: die Verlustverteilung aus S-P2-02 hält oder verbessert sich.
* `npm run sim`: alle vier Karten weiter auf drei Sterne erreichbar.
* `npm run c18`: die Eröffnung hält.
* `npm run gate` grün.

**Gegenprobe.** Das Tempo des Räubers verzehnfachen: er erreicht das Tor immer,
der Rettungsanteil fällt unter das Band, `sim` muss anschlagen. Und
umgekehrt: Tempo null — Rettungsanteil 100 %, dieselbe Meldung von der anderen
Seite.

**Schliesst, wenn:** `text tools/sim.ts "Rettungen" >= 2`

---

### S-P3-05 · Rückbau des Kernraubs

**Paket:** P3 · **Aufwand:** M · **Hängt an:** S-P3-04
**Nur fahren, wenn** S-P3-04 nach drei Schleifen kein Fenster findet.

**Problem.** In diesem Projekt sind zwei gebaute Mechaniken nach Messung
zurückgebaut worden (E3 und F4 in v239), und es war beide Male richtig. Eine
Mechanik, deren Fenster leer ist, bleibt nicht „erstmal drin".

**Was gebaut wird.** `kernraub` und `splitterZurueck` fallen aus
`src/game/state.ts`, `leak()` geht auf die Fassung von v248 zurück, die
Aufnahme `kernraub` fällt aus `tools/shots.mjs`. **Die Ersatzprüfung aus
S-P3-01 fällt nicht mit** — sie prüft, dass verbuchter Verlust und fehlender
Kristall zusammenpassen, und das gilt weiter. Der gemessene Raum
(Rettungsanteil über die durchprobierten Tempi) bleibt im
Rückstandsverzeichnis: er ist die Auskunft, warum es nicht ging.

**Abnahme.**
* `npm run gate` grün.
* `npm run muster`: keine Gegenprobe zeigt ins Leere. Die zwei Proben aus
  S-P3-01 und die zwei aus S-P3-02 haben ihren Gegenstand verloren und werden
  **entfernt**, nicht stehengelassen — eine Probe ohne Gegenstand sieht aus wie
  ein Beweis.
* `npm run sim` meldet wieder die Zahlen von vor S-P3-01 (± Rauschgrenze).

**Gegenprobe.** Entfällt (Rückbau). Stattdessen nachgefahren: mit dem
entfernten Zustand müssen die Ratschen exakt die Werte von vor S-P3-01 melden.

**Schliesst, wenn:** `text src/game/state.ts "kernraub" == 0`

---

# Paket P4 — Die wiederkehrende Entscheidung, mit Risiko

---

### S-P4-01 · Wellen dürfen überlappen

**Paket:** P4 · **Aufwand:** L · **Hängt an:** S-P3-04

**Problem.** F10, wörtlich: der Frühstart hat sein Zeitfenster, aber kein
Risiko. `canStartWave` in `src/game/state.ts` verlangt `!this.waveActive` —
man kann erst starten, wenn die vorige Welle durch ist. Früh starten kostet
damit nur Bauzeit; es kann nichts schiefgehen. Kingdom Rush legt genau dort das
Risiko hin: die nächste Welle läuft los, während die alte noch auf dem Feld
steht.

**Was gebaut wird.**
* `ueberlappendeWellen`: `startWave()` hängt seine `pending`-Liste an die
  laufende an, statt sie zu ersetzen. `waveIndex` steigt beim **Start**, nicht
  beim Ende; `finishWave` wird zu einer Prüfung je Welle, welche vollständig
  abgeräumt ist.
* Der Wellenbonus wird je Welle einzeln ausgezahlt, sobald **diese** Welle
  durch ist — sonst verschwimmen zwei Belohnungen zu einer.
* `wellenRest` und `vorschauWelle` müssen zwei laufende Wellen unterscheiden
  können. Beide sind Ableitungen und liegen an einer Stelle; sie bleiben es.
* Eine Obergrenze: höchstens **zwei** Wellen gleichzeitig. Drei wären keine
  Entscheidung mehr, sondern eine Lawine, und die Kreuzdeckung der Karten ist
  auf einen Wellenstrom je Bahn eingemessen.

**Was dieses Tor entwertet — und die Ersatzprüfung.** `stats.leaksByWave`
verbucht heute unter `this.waveIndex`, und der zeigt bei Überlappung auf die
**neuere** Welle. Damit wandern Verluste der alten Welle in die neue, und die
Verlustverteilung — die Kennzahl von G1 — wäre still falsch. Der Verlust wird
deshalb an der **Welle des Gegners** verbucht, nicht am Zähler des Spiels, und
der Rauchtest prüft es an einem gestellten Fall: zwei Wellen gleichzeitig, ein
Gegner aus der ersten kommt durch, verbucht wird bei Welle 1.

**Abnahme.**
* `npm run smoke`: eine zweite Welle lässt sich starten, während die erste
  läuft; beide Ströme laufen; jede Welle zahlt ihren eigenen Bonus.
* `npm run smoke`: eine dritte Welle wird abgelehnt.
* `npm run smoke`: der gestellte Fall aus der Ersatzprüfung verbucht bei
  Welle 1.
* `npm run sim`: die Verlustverteilung bleibt nach Wellen getrennt lesbar.
* `npm run determinism` grün.

**Gegenprobe.** Die Verbuchung wieder an `this.waveIndex` hängen: der
Rauchtest muss melden, dass ein Verlust der ersten Welle bei der zweiten
landet. Zweite Probe: die Obergrenze von zwei entfernen — der Rauchtest muss
melden, dass sich drei Wellen stapeln lassen.

**Schliesst, wenn:** `text src/game/state.ts "ueberlappendeWellen" >= 2`

---

### S-P4-02 · Der Frühstart wird zum Risiko

**Paket:** P4 · **Aufwand:** M · **Hängt an:** S-P4-01

**Problem.** `EARLY_BONUS_MAX = 30` und `EARLY_BONUS_WINDOW = 22` geben einen
Bonus, der mit der Zeit schrumpft. Das ist eine Belohnung für Eile, kein
Risiko: die Höhe hängt an der Uhr, nicht an der Lage.

**Was gebaut wird.** `fruehstartRisiko`: der Bonus hängt zusätzlich daran,
**wieviel noch auf dem Feld steht** — gemessen an den Lebenspunkten der
lebenden Gegner im Verhältnis zum Druck der laufenden Welle. Wer startet,
während die alte Welle noch halb steht, bekommt deutlich mehr Gold und trägt
das Risiko. Die Kurve wird durchprobiert (Regel 9), nicht gesetzt.

Die erste Welle trägt weiterhin keinen Bonus — dort baut man den ersten Turm,
und ein Anreiz zur Eile wäre eine Falle. Das steht schon im Quelltext und
bleibt.

**Abnahme.**
* `npm run smoke`: bei leerem Feld ist der Bonus der heutige; bei halb
  stehender Welle ist er messbar höher; die Zahl entsteht an **einer** Stelle
  (`state.fruehstart`), nicht in der Oberfläche.
* `npm run browsertor`: die goldene Füllung im Wellenknopf folgt der neuen
  Zahl, und der Platz der Zahl bleibt stehen, wenn sie verschwindet (der
  36-Punkte-Sprung aus v243 darf nicht zurückkommen).
* `npm run sim`: der Knappheitsanteil aus S-P2-01 bleibt über der Schwelle —
  ein Frühstartbonus, der die Knappheit auffrisst, hebt P2 wieder auf.

**Gegenprobe.** Den Lageanteil auf konstant setzen: der Rauchtest muss melden,
dass der Bonus bei vollem und bei leerem Feld gleich ist. Das ist genau die
Probe, die v243 für den Zeitanteil schon hat, für die zweite Hälfte.

**Schliesst, wenn:** `text src/game/state.ts "fruehstartRisiko" >= 2`

---

### S-P4-03 · Das Wellenband zeigt zwei laufende Wellen

**Paket:** P4 · **Aufwand:** M · **Hängt an:** S-P4-02

**Problem.** Der Hauptknopf trägt seit v239 `Welle N · noch X`. Mit zwei
laufenden Wellen ist „noch X" mehrdeutig, und die Vorschau „Als Nächstes"
zeigt etwas, das man **jetzt** starten kann — das ist eine Entscheidung und
sieht aus wie eine Ankündigung.

**Was gebaut wird.** Das Band zeigt beide Ströme: die laufende Welle mit ihrem
Rest, die startbare mit ihrem Bonus und ihrem Risiko. Der Hauptknopf ist nie
tot (G12) und bleibt es. **Kein Text wird verdoppelt** (H9, heute null
Doppelungen, vom UX-Tor gehalten), und die Typoskala bleibt bei fünf Stufen
(H7, 8/10/12/15/17).

**Abnahme.**
* `npm run uxtor`: Belegung im Ruhezustand ≤ 16 %, während einer Welle ≤ 16 %,
  Turmmenü ≤ 34 % — die Ratschen von v248 halten oder verbessern sich.
* `npm run uxtor`: null doppelte Beschriftungen, höchstens fünf Schriftgrößen.
* `npm run beruehrung`: jede Trefferfläche ≥ 44 Punkte.
* `npm run streifen`: das Band trägt auch die längste Welle ohne Umbruch.
* `blick:` — vor der Lieferung die vier Aufnahmen aus `npm run kritik` ansehen
  (Regel 7). In v50 lag die Turmleiste über der Landkarte, und vierzehn Tore
  waren grün.

**Gegenprobe.** Die zweite Wellenzeile mit `display: none` im Kompaktblock
versehen — genau der Fehler, der den Frühstart bis v243 auf dem Zielgerät
unsichtbar gemacht hat. Das Browsertor muss anschlagen; der Rauchtest sieht es
nicht, weil jsdom keine Stilvorlage kennt, und das gehört an die Zeile.

**Schliesst, wenn:** `text src/ui/ui.ts "zweiWellenband" >= 2`

---

### S-P4-04 · Die Kurve wird gegen überlappende Wellen neu eingemessen

**Paket:** P4 · **Aufwand:** M · **Hängt an:** S-P4-03

**Problem.** Überlappung greift in alles ein, was F10 aufzählt: `hpScale`,
Ausstoßfenster, Kreuzdeckung. Der Bot der Simulation startet heute, sobald er
kann — mit Überlappung wäre das die schlechteste aller Entscheidungen oder die
beste, und beides wäre eine Aussage über den Bot, nicht über das Spiel.

**Was gebaut wird.**
* Ein **vierter Spielstil** in `tools/sim.ts`: „Hetze" — startet früh und
  nimmt das Risiko. Die drei vorhandenen Stile starten weiter erst, wenn das
  Feld leer ist. Damit misst der Stilabstand (G4) zum ersten Mal eine
  Entscheidung, die ein Mensch wirklich trifft.
* Ein Wächter `Ueberlappungsfenster` in `tools/guards.ts`: der Druck zweier
  gleichzeitig laufender Wellen darf einen Anteil des Kartendrucks nicht
  überschreiten — anteilig, nicht absolut.
* Die Kurve wird nachgezogen, wo nötig; der Raum wird durchprobiert.

**Abnahme.**
* `npm run sim`: „Hetze" gewinnt auf mindestens einer Karte und verliert auf
  mindestens einer — sonst ist die Entscheidung keine.
* `npm run sim`: der Abstand der Spielstile steigt gegen den Stand aus
  S-P1-02, und die Spanne über die Aussaaten bleibt kleiner als der Zuwachs.
* `npm run sim`: Verlustverteilung, Knappheitsanteil und Rettungsanteil halten
  ihre Ratschen.
* `npm run guards`: `Ueberlappungsfenster` hält auf allen vier Karten.
* `npm run sim`: der Leerlaufanteil aus S-P1-04 fällt messbar — das ist die
  zweite Wirkung dieser Mechanik und die einzige, die man dem Spieler direkt
  ansieht.

**Gegenprobe.** Den Stil „Hetze" so einstellen, dass er identisch mit
„Meister" startet: `npm run sim` muss melden, dass zwei Stile auf allen Karten
dieselbe Zahl liefern — zwei Stile mit gleichem Verlust je Welle sind ein Stil
mit zwei Namen. Diese Prüfung gibt es seit v219 für Zielmodi und sie wird hier
mitbenutzt.

**Schliesst, wenn:** `text tools/guards.ts "Ueberlappungsfenster" >= 2`

---

### S-P4-05 · Rückbau der Überlappung

**Paket:** P4 · **Aufwand:** M · **Hängt an:** S-P4-04
**Nur fahren, wenn** S-P4-04 nach drei Schleifen kein Fenster findet.

**Problem.** Überlappende Wellen sind der tiefste Eingriff des ganzen Katalogs.
Wenn die Kurve sie nicht trägt, ist das ein Ergebnis und keine Niederlage —
v237 hat den Zielmodus „hinten" aus genau diesem Grund gestrichen.

**Was gebaut wird.** `ueberlappendeWellen` und `fruehstartRisiko` fallen weg,
`canStartWave` geht auf `!this.waveActive` zurück, das Wellenband auf eine
Zeile. **Der vierte Spielstil „Hetze" bleibt** — er misst dann, was ein
ungeduldiger Spieler ohne Überlappung erreicht, und das ist weiter eine
Auskunft. Der gemessene Raum bleibt im Verzeichnis.

**Abnahme.**
* `npm run gate` grün.
* `npm run muster`: die vier Gegenproben aus S-P4-01 bis S-P4-03 werden
  entfernt, nicht stehengelassen.
* `npm run uxtor`: die Belegung fällt auf die Werte von vor S-P4-03 zurück.

**Gegenprobe.** Entfällt (Rückbau). Nachgefahren wird gegen die Ratschen.

**Schliesst, wenn:** `text src/game/state.ts "ueberlappendeWellen" == 0`

---

# Paket P5 — Zweige und Ziele, die etwas entscheiden

---

### S-P5-01 · Die Zweigwirkung wird eine Kennzahl mit Namen und Grenze

**Paket:** P5 · **Aufwand:** S · **Hängt an:** S-P1-01

**Problem.** F3 verlangt wörtlich „zuerst eine Messung in `npm run sim`, die
den Abstand ausweist, und dann Zweige, die eine andere Aufgabe erfüllen". Die
Messung gibt es noch nicht: die Zweigtabelle druckt acht Zahlen und leitet
nichts daraus ab. Und sie lief bis S-P1-01 als einzelner Lauf, also im Rauschen
(2.1 in `KATALOG.md`).

**Was gebaut wird.** Eine Kennzahl `Zweigwirkung` in `tools/sim.ts`: je
Turmsorte der Betrag des Unterschieds zwischen den beiden Zweigen, gemittelt
über Aussaaten und Abwandlungen, als Anteil des Startkristalls (anteilig, nicht
absolut — Regel 2). Ausgewiesen werden alle vier, dazu die **kleinste**. Sie
geht in die Ratsche aus S-P1-02. Wo der Unterschied unter der Rauschgrenze
liegt, steht `UNBELEGT` statt einer Zahl.

**Abnahme.**
* `npm run sim` nennt vier Zweigwirkungen in Prozent des Startkristalls, jede
  mit Spanne, und die kleinste als Kennzahl.
* Der Soll-Wert (≥ 15 %) steht als Hinweis daneben.

**Gegenprobe.** Die Werte eines Zweiges in `src/data/towers.ts` mit denen des
anderen gleichsetzen. Die Zweigwirkung dieser Sorte muss auf null fallen und
`sim` anschlagen. Ohne diese Probe bewiese die Zahl nur, dass eine Subtraktion
funktioniert.

**Schliesst, wenn:** `text tools/sim.ts "Zweigwirkung" >= 2`

---

### S-P5-02 · Die Wirkungsliste bekommt ihre zweite Art

**Paket:** P5 · **Aufwand:** M · **Hängt an:** S-P5-01

**Problem.** `src/data/wirkungen.ts` ist seit v157 als offene Liste gebaut,
ausdrücklich damit „Gift, Panzerbruch, Brand, Aufladung" je ein Eintrag sind
und nicht je zwei Felder am Gegner. Es gibt bis heute **eine** Art: `bremse`.
Ohne eine zweite kann kein Zweig eine andere Aufgabe erfüllen — er kann nur
eine höhere Zahl tragen, und das ist genau der Befund von G2.

**Was gebaut wird.** Zwei neue Arten in `WirkungsArt`, jede mit ihrer eigenen
auslesenden Stelle:
* `brand` — Schaden über Zeit, `staerke` ist Schaden je Sekunde. Panzerung
  wirkt **nicht** dagegen: das ist der Punkt, sonst wäre es nur langsamerer
  Schaden.
* `markiert` — der Gegner nimmt von **allen** Türmen mehr Schaden,
  `staerke` ist der Anteil. Sie stapelt nicht mit sich selbst; das folgt schon
  aus der Bauart der Liste (nur gleich Starkes wird aufgefrischt).

Beide Arten werden hier **nur gebaut und geprüft**, nicht an einen Turm
gehängt. Das ist der Sinn der Teilung: die Mechanik ist eine Runde, jeder Turm
eine eigene.

**Abnahme.**
* `npm run smoke`: ein gestellter Gegner mit `brand` verliert je Sekunde genau
  `staerke` Lebenspunkte, unabhängig von seiner Panzerung.
* `npm run smoke`: ein Gegner mit `markiert` nimmt von einem Bogenturm und
  von einem Mörser denselben Anteil mehr — die Wirkung liegt am Gegner, nicht
  am Turm.
* `npm run smoke`: zwei gleich starke `markiert` ergeben nicht das Doppelte;
  eine starke kurze und eine schwache lange ergeben die Treppe, nicht die
  Mischung (das ist der Fehler, den v157 behoben hat, und er darf nicht
  zurückkommen).
* `npm run determinism` grün.

**Gegenprobe.** `brand` gegen Panzerung rechnen lassen: der Rauchtest muss
melden, dass ein gepanzerter Gegner weniger Brandschaden nimmt. Zweite Probe:
`markiert` auf den Turm statt auf den Gegner legen — der Rauchtest muss den
Unterschied zwischen Bogenturm und Mörser melden.

**Schliesst, wenn:** `text src/data/wirkungen.ts "brandSchaden" >= 2`

---

### S-P5-03 · Mörser · Streubombe legt Brandflächen

**Paket:** P5 · **Aufwand:** M · **Hängt an:** S-P5-02

**Problem.** Streubombe und Brecher unterscheiden sich in Radius und Wucht —
zwei Zahlen desselben Dings. Gemessen bewegt die Wahl über vier Aussaaten
+11 / +1 / +3 / +1 Kristall, also im Mittel wenig und im Einzelfall Zufall.

**Was gebaut wird.** Die Streubombe hinterlässt an der Einschlagstelle eine
**Brandfläche**, die für einige Sekunden `brand` an jeden anlegt, der
hindurchläuft. Damit wechselt der Zweig die Rolle: der Brecher tötet, was
steht; die Streubombe **verwehrt eine Stelle**. Auf einer Karte mit zwei Bahnen
ist das eine andere Frage als „mehr Radius".

Die Zahlen werden durchprobiert (`npm run eichen` über Brandschaden und
Branddauer, Regel 9), nicht gesetzt. Der Wächter der Zweig-Waage
(`npm run guards`, heute Mörser Faktor 1,24) muss weiter halten — ein Zweig,
der die Rolle wechselt, darf nicht zugleich der stärkere sein.

**Abnahme.**
* `npm run sim`: die Zweigwirkung des Mörsers steigt gegen S-P5-01 und ihre
  Spanne bleibt kleiner als der Zuwachs.
* `npm run guards`: die Zweig-Waage des Mörsers bleibt im Band.
* `npm run smoke`: ein Gegner, der durch eine Brandfläche läuft, trägt danach
  `brand`; einer, der daneben läuft, nicht.
* `npm run bench-draw`: das Zeichenbudget hält (Brandflächen sind Flächen, und
  Flächen kosten).
* `npm run geschossetor`: der Anteil der Schüsse ohne Wirkung bleibt im Band.

**Gegenprobe.** Die Brandfläche über die ganze Karte legen: `npm run sim` muss
melden, dass die Zweigwirkung des Mörsers über das Band schießt, und
`npm run guards` die Zweig-Waage.

**Schliesst, wenn:** `text src/data/towers.ts "brandDauer" >= 2`

---

### S-P5-04 · Prisma · Verzweigung markiert, statt weiter zu springen

**Paket:** P5 · **Aufwand:** M · **Hängt an:** S-P5-03

**Problem.** Verzweigung (mehr Sprünge, wenig Abfall) und Bündelung (ein
Strahl, der wehtut) messen über vier Aussaaten −2 / −10 / −1 / −10 Kristall.
Die Verzweigung ist auf zwei von vier Aussaaten deutlich schlechter — sie ist
nicht die andere Entscheidung, sie ist die schlechtere.

**Was gebaut wird.** Die Verzweigung springt weiter, richtet aber kaum Schaden
an und legt stattdessen `markiert` an jedes getroffene Ziel. Damit wird sie
zum **Stützturm**: sie tötet nicht, sie macht die anderen stärker. Das ist
dieselbe Antwort, die der Verbund in v244 gegeben hat, und sie hat dort
funktioniert — das Spiel belohnt zum ersten Mal, wonach es fragt.

Die Zielunit und der Verbundzuschlag rechnen an **einer** Stelle
(`towerStats`); die Markierung gehört an den Gegner und nicht dorthin, sonst
gibt es zwei Fassungen desselben Zuschlags (Regel 15, und der Kommentar an
`towerStats` sagt es wörtlich).

**Abnahme.**
* `npm run sim`: die Zweigwirkung des Prismas steigt gegen S-P5-01.
* `npm run sim`: „nur Prisma" bleibt schwächer als das gemischte Feld — ein
  Stützturm, der allein gewinnt, ist kein Stützturm.
* `npm run guards`: die Zweig-Waage des Prismas bleibt im Band.
* `npm run smoke`: ein markierter Gegner nimmt von einem **anderen** Turm mehr
  Schaden; die Wirkung liegt am Gegner.
* `blick:` — man muss dem Feld ansehen, wer markiert ist (Regel 8). Ein Ring
  wie beim Schildträger, geprüft über eine Aufnahme im Bildtor.

**Gegenprobe.** Die Markierung nur für das Prisma selbst wirken lassen: der
Rauchtest muss melden, dass ein anderer Turm keinen Unterschied sieht — das ist
genau der Fehler, der aus einem Stützturm einen schwachen Schadensturm macht.

**Schliesst, wenn:** `text src/data/wirkungen.ts "markiert" >= 2`

---

### S-P5-05 · Frostturm · Ewiges Eis hält an, statt zu bremsen

**Paket:** P5 · **Aufwand:** M · **Hängt an:** S-P5-04

**Problem.** Ewiges Eis (Bremse 0,527) und Splitterfrost (Bremse 0,35 plus
Schaden) messen 43 gegen 40 Kristall — drei Punkte, und die Zweig-Waage des
Frostturms steht mit Faktor **1,53** ohnehin als „schief, aber noch
vertretbar" im Wächter. Zwei Zweige, die beide bremsen, sind ein Zweig mit
zwei Stärken.

**Was gebaut wird.** Ewiges Eis friert ab Stufe 4 in seinem Umkreis **ganz**
ein — Tempo null für kurze Zeit, danach eine Erholung, in der es nicht wieder
greift. Die Mechanik gibt es schon: das Bollwerk arbeitet mit `slow: 1`, und
der Widerstand des Gegners (`slowResist`) wirkt weiter, also steht ein
Leerentitan kürzer als ein Schleicher. Das ist der Grund, warum dieser Weg
tragfähig ist und der Ankerturm zweimal gescheitert ist (S41): eine Auslegung
ohne Takt springt, eine mit Takt lässt sich dosieren.

**Abnahme.**
* `npm run sim`: die Zweigwirkung des Frostturms steigt gegen S-P5-01.
* `npm run guards`: die Zweig-Waage des Frostturms verbessert sich gegen 1,53
  oder bleibt gleich — sie darf nicht schiefer werden.
* `npm run sim`: „nur Frost" bleibt unter dem gemischten Feld (heute 11 gegen
  43). Das ist G3, und es war schon einmal kaputt.
* `npm run smoke`: ein Leerentitan steht messbar kürzer als ein Schleicher.
* `npm run c18`: die Eröffnung hält — der Frostturm trägt sie mit.

**Gegenprobe.** `slowResist` beim Einfrieren ignorieren: der Rauchtest muss
melden, dass Titan und Schleicher gleich lange stehen. Ein Halt, der alle
gleich behandelt, ist keine Entscheidung mehr — das steht wörtlich am
Bollwerk.

**Schliesst, wenn:** `text src/data/towers.ts "festfrieren" >= 2`

---

### S-P5-06 · Bogenturm · Scharfschütze sieht die ganze Bahn

**Paket:** P5 · **Aufwand:** M · **Hängt an:** S-P5-05

**Problem.** Scharfschütze und Salve messen 43 gegen 46 Kristall — die Salve
ist auf der Hausaussaat sogar besser, und die Reichweitenkurve gibt dem
Scharfschützen ohnehin schon den Weiten-Faktor 1,35. Zwei Zweige, die auf
dieselbe Weise schießen.

**Was gebaut wird.** Der Scharfschütze bekommt ab Stufe 5 **unbegrenzte
Reichweite entlang der Bahnen**, dafür einen deutlich längeren Takt. Er wird
damit der Turm, der eine Karte **überblickt** statt eine Stelle zu decken —
und er beantwortet eine Frage, die keine andere Sorte beantwortet: was tun
gegen einen Räuber (P3), der am anderen Ende der Karte zum Tor läuft.

Das greift in das Reichweitensystem ein, und das hat vier Regeln, die an einer
Stelle stehen (`rangeFor`). Die unbegrenzte Reichweite ist eine **Ausnahme im
Zielsuchen**, nicht im Reichweitensystem — sonst wandert die Ausnahme in jede
Anzeige, in den Reichweitenring und in `npm run beruehrung`.

**Abnahme.**
* `npm run sim`: die Zweigwirkung des Bogenturms steigt gegen S-P5-01.
* `npm run sim`: der Rettungsanteil aus S-P3-04 bleibt im Band 33 bis 67 % —
  ein Turm, der jeden Räuber erwischt, hebt P3 auf.
* `npm run guards`: die Zweig-Waage des Bogenturms bleibt im Band (heute 1,14).
* `npm run browsertor`: der Reichweitenring zeigt den Sonderfall verständlich
  an; er darf nicht als Kreis über die halbe Karte laufen.
* `blick:` — ob der Ring lesbar ist, sagt kein Tor.

**Gegenprobe.** Die unbegrenzte Reichweite auch für Flieger gelten lassen
(sie folgen keiner Bahn): der Rauchtest muss melden, dass ein Gleiter am
anderen Kartenende getroffen wird. Das ist der Fall, der die Mechanik
unbemerkt in einen Allestreffer verwandelt.

**Schliesst, wenn:** `text src/data/towers.ts "weitschuss" >= 2`

---

### S-P5-07 · Jeder Zielmodus bekommt eine Aufgabe, die nur er erfüllt

**Paket:** P5 · **Aufwand:** M · **Hängt an:** S-P5-06

**Problem.** F6, und der Punkt ist gewandert statt zu verschwinden: gemessen
über vier Aussaaten gewinnt „stark" auf **keiner** eine Welle allein (0/0/0/0),
„nah" auf einer bis keiner. Nur 14 von 60 gefahrenen Wellen werden von der Wahl
überhaupt berührt. Der Modus „hinten" ist in v237 aus genau diesem Grund
gestrichen worden — eine Wahl ohne Folgen gehört weg oder bekommt eine Aufgabe.

**Was gebaut wird.** Jedem der vier Modi wird eine Frage zugeordnet, die nur er
beantwortet, und die Zuordnung wird gemessen, nicht behauptet:
* **vorn** — der Durchbruch. Bleibt, wie er ist; die Balance ist dagegen
  geeicht.
* **stark** (heute „Gefahr", mit `GEFAHR_TRAEGER` als Zuschlag auf
  Schildträger) — bekommt zusätzlich den **Räuber** aus P3 als Zuschlag: wer
  den Kristall trägt, ist die Gefahr.
* **nah** — `nahZuschlag`: bevorzugt Ziele, die **lange** in Reichweite
  bleiben, statt die nächsten. Damit beantwortet er die Frage nach der
  Auslastung eines Turms, und die stellt kein anderer Modus.
* **schwach** — bleibt und bekommt seine Aufgabe aus P2: wer schnell tötet,
  bekommt früher Gold, und Gold ist nach P2 knapp.

Erfüllt einer nach drei Schleifen weiter keine Aufgabe, wird er **gestrichen** —
am Ende der Ordnung, dem einzigen Platz, der die Indizes der übrigen nicht
verschiebt; alte Spielstände fallen auf „vorn" zurück. Das ist der Weg, den
v237 gegangen ist, und er ist richtig.

**Abnahme.**
* `npm run sim`: jeder verbliebene Modus hat mindestens einen Alleinsieg,
  gemittelt über drei Aussaaten.
* `npm run sim`: die Zahl der Wellen, die die Wahl überhaupt berühren, steigt
  über 14 von 60.
* `npm run smoke`: der gestellte Fall je Modus — ein Turm, zwei Ziele, das
  richtige wird genommen. Gemessen wird am Verhalten, nicht an der Statistik.
* `npm run sim`: keine zwei Modi liefern auf allen Karten denselben Verlust je
  Welle (die Prüfung aus v219).

**Gegenprobe.** `nahZuschlag` auf null setzen: „nah" wird wieder der
nächstliegende Treffer, `npm run smoke` muss den gestellten Fall melden und
`npm run sim` den fehlenden Alleinsieg.

**Schliesst, wenn:** `text src/game/state.ts "nahZuschlag" >= 2`

---

# Paket P6 — Gegner, die zu anderem Handeln zwingen

---

### S-P6-01 · Der Heiler als Eigenschaft der Wellengruppe

**Paket:** P6 · **Aufwand:** M · **Hängt an:** S-P5-07

**Problem.** C6 („Heiler, regeneriert Umstehende") steht seit Langem offen, mit
der Schließbedingung `text src/data/enemies.ts "Heiler" >= 1` — also als neue
Gegnerart. Eine neue Gegnerart braucht einen Bildsatz, sonst meldet der
Rauchtest „Gegnerbild fehlt". Und das **Gegnerbudget ist voll**: 71 von 80 KB
belegt, eine Figur wiegt gemessen 6 bis 13 KB.

Das Projekt hat für genau diesen Fall schon einen Weg: Schild und Schildträger
sitzen an der **Wellengruppe**, nicht an der Gegnerart — „deshalb braucht er
kein neues Bild", und man erkennt sofort, was da kommt und dass es diesmal
anders ist.

**Was gebaut wird.** `heiler?: number` an `WaveGroup` in `src/data/waves.ts`,
nach dem Muster von `traeger`: der markierte Gegner heilt seine Nachbarn
fortlaufend, sich selbst nie. Sichtbar über einen Ring und Fäden zu denen, die
er versorgt — dieselbe Formensprache wie der Schildträger, damit nicht zwei
Sprachen für dieselbe Aussage entstehen. C6 wird im Rückstandsverzeichnis auf
diese Bauart umgeschrieben; die alte Schließbedingung wird ersetzt, und der
Grund steht an der Zeile.

**Abnahme.**
* `npm run smoke`: ein gestellter Heiler heilt seinen Nachbarn und nie sich
  selbst; stirbt er, hört die Heilung auf.
* `npm run konter`: der Heiler bekommt seinen Kontersatz aus den Daten, und
  nicht alle Gegner bekommen einen (ein Hinweis, der immer dasteht, ist keiner).
* `npm run sim`: die Zahl der Wellen, die die Zielwahl berühren, steigt weiter.
* `npm run guards`: die Wellenpläne halten ihre Regeln; der Druck der
  betroffenen Wellen wird um die Heilung korrigiert, sonst misst `wellenDruck`
  zu wenig.
* `npm run autarkie`: die Datei wächst um **null** KB — das ist der Punkt.

**Gegenprobe.** Den Heiler sich selbst heilen lassen: der Rauchtest muss
melden, dass ein einzelner Heiler nicht mehr zu töten ist. Zweite Probe: die
Heilung nach seinem Tod weiterlaufen lassen — dieselbe Prüfung von der anderen
Seite.

**Schliesst, wenn:** `text src/data/waves.ts "heiler" >= 2`

---

### S-P6-02 · Der Hetzer treibt seine Nachbarn an

**Paket:** P6 · **Aufwand:** M · **Hängt an:** S-P6-01

**Problem.** Nach P5 hat der Spieler Türme, die anhalten (Ewiges Eis),
verwehren (Streubombe) und markieren (Verzweigung). Es fehlt der Gegner, gegen
den **Kontrolle** die falsche Antwort ist — sonst ist Kontrolle immer richtig,
und das ist wieder eine Monokultur, nur eine andere.

**Was gebaut wird.** `hetzer?: number` an `WaveGroup`: der markierte Gegner
beschleunigt seine Nachbarn, solange er lebt. Gegen ihn hilft nicht Bremsen
(er hebt es auf), sondern ihn zuerst zu töten — also genau die Entscheidung,
die der Schildträger für die Zielreihenfolge erzwingt, für das Tempo.

Er wirkt über die Wirkungsliste (`bremse` mit negativer Stärke oder eine
eigene Art — was von beidem, entscheidet die Messung; eine negative Bremse
könnte den Deckel der Liste durcheinanderbringen, und dann ist es eine eigene
Art).

**Abnahme.**
* `npm run smoke`: ein gestellter Hetzer beschleunigt seinen Nachbarn; stirbt
  er, fällt das Tempo zurück.
* `npm run smoke`: ein gebremster und gehetzter Gegner läuft nicht schneller
  als sein Grundtempo mal dem Hetzerfaktor — die Treppe der Wirkungsliste darf
  nicht kippen (das ist der Fehler aus v157).
* `npm run gedraenge`: die engste Wegstelle trägt die schnelleren Gegner noch.
* `npm run sim`: „nur Frost" bleibt unter dem gemischten Feld.

**Gegenprobe.** Den Hetzer sich selbst hetzen lassen: der Rauchtest muss
melden, dass sein Tempo über die Runden hochläuft. Zweite Probe: das Tempo
nicht deckeln — `npm run gedraenge` oder der Rauchtest muss melden, dass ein
Gegner den Weg überspringt.

**Schliesst, wenn:** `text src/data/waves.ts "hetzer" >= 2`

---

### S-P6-03 · Eine Welle, an der die Monokultur scheitert

**Paket:** P6 · **Aufwand:** M · **Hängt an:** S-P6-02

**Problem.** G3 gilt seit v244 als erfüllt: „nur Frost" kommt auf 11 gegen 43
im gemischten Feld. Die Antwort ist der **Verbund** — eine Belohnung fürs
Mischen. Es gibt bis heute keine **Welle**, an der eine Monokultur scheitert;
sie ist nur schwächer. Der Unterschied ist der zwischen „lohnt sich weniger"
und „geht nicht", und die Marktrecherche nennt genau das als den Kern von
Vielfalt.

**Was gebaut wird.** Eine Kennzahl `Monokulturwelle` in `tools/sim.ts`: gibt es
mindestens eine Welle je Karte, die **jede** der vier reinen Aufstellungen
durchlässt und die gemischte nicht? Und dann die Welle, die es tut — gebaut aus
dem, was nach P5 und P6 da ist: Schild (gegen Wucht), Panzerung (gegen
Schnellfeuer), Flieger (gegen Mörser) und Heiler (gegen Einzelziel) in
**derselben** Welle. Nicht als neue Mechanik, sondern als Zusammenstellung.

**Abnahme.**
* `npm run sim`: auf jeder der vier Karten gibt es mindestens eine solche
  Welle, gemittelt über drei Aussaaten.
* `npm run sim`: das gemischte Feld gewinnt sie; alle vier reinen
  Aufstellungen verlieren dort Kristall.
* `npm run guards`: der Abstand der Karten voneinander bleibt gewahrt (der
  Wächter misst ihn an „Anzahl × Leben" je Gegnerart) — vier gleiche
  Prüfwellen wären vier gleiche Karten.
* `npm run c18`: die Eröffnung hält; die Prüfwelle liegt nicht in der ersten
  Hälfte.

**Gegenprobe.** Den Schild aus der Prüfwelle nehmen: `npm run sim` muss
melden, dass die Monokulturwelle ihren Gegenstand verloren hat — nicht
schweigen. Das ist genau die Verfallsart, an der in v219 vier Messplätze
gestorben sind.

**Schliesst, wenn:** `text tools/sim.ts "Monokulturwelle" >= 2`

---

### S-P6-04 · Die Flakstellung — der Auftragstext geht heraus, der Code wartet

**Paket:** P6 · **Aufwand:** S · **Hängt an:** S-P6-03

**Problem.** C16, der fünfte Turm. Der Bildauftrag steht vollständig in
`docs/Towerfront-BILDAUFTRAG.md` Abschnitt 6.6, seit v205, mit Umriss-Regeln
und Silhouetten-Grenze. Die Bilder sind nicht geliefert, und ohne Bildsatz
meldet der Rauchtest den Turm als fehlend. Offen ist außerdem die
**Zahlenfrage**: er darf nicht nur Luft treffen — gemessen fliegen nur 15,7 %
(Spiralhain), 9,1 % (Ascheschlucht), 8,0 % (Frostspalte) und 15,6 %
(Farnkessel) der Lebenspunkte, und nur 4 bis 7 von 15 Wellen enthalten
überhaupt etwas Fliegendes.

**Was gebaut wird.** Zwei Dinge, und **kein** Code am Turm:
1. Die Zahlenfrage wird beantwortet, bevor der Turm gebaut wird: aus dem
   gemessenen Luftanteil je Karte ein Vorschlag für Schaden, Takt, Reichweite
   und Preis, dazu die Aussage, gegen welche der nach P5 vorhandenen Rollen er
   die Lücke füllt. Der Vorschlag steht im Bildauftrag neben der Bestellung —
   „Flak-Zahlen aus der Messung" —, damit er nicht im Gespräch verlorengeht.
2. Der fertige Prompt geht an den Nutzer, als Block zum Kopieren
   (`npm run bildprompt -- flak`), mit den Abnahmezahlen und dem Hinweis, dass
   das **Gruppenbudget für Turmbilder genau einen** weiteren Satz trägt: 445 KB
   erlaubt, 302 KB belegt, ein Satz wiegt gemessen 93 bis 106 KB.

**Abnahme.**
* `npm run bildprompt -- flak` gibt den vollständigen Prompt in einem Stück
  aus.
* `npm run doku` grün.
* `npm run gate` unverändert grün — es wird kein Code angefasst, also darf sich
  keine Zahl bewegen.
* `nutzer:` — die Lieferung selbst kann nur der Nutzer beim Bild-Agenten
  auslösen.

**Gegenprobe.** In `tools/probes.mjs` die Abnahmetabelle in Abschnitt 6.6
umsortieren, sodass `tools/auftrag.ts` die falsche Spalte liest — genau der
Fehler aus v229. `npm run guards` muss anschlagen; die Probe gibt es seit v229
und sie wird hier mitbenutzt.

**Schliesst, wenn:** `text docs/Towerfront-BILDAUFTRAG.md "Flak-Zahlen aus der Messung" >= 1`

---

# Paket P7 — Die Aufgabe ist nie zweimal dieselbe

---

### S-P7-01 · Vorzeichen: jede Partie bekommt eine benannte Abweichung

**Paket:** P7 · **Aufwand:** M · **Hängt an:** S-P6-03

**Problem.** Vier feste Karten. Wer sie einmal gelöst hat, löst sie immer
gleich. Der gemeinsame Nenner der Roguelites ist nicht Zufall, sondern: die
Aufgabe darf nicht zweimal dieselbe sein. Prozedurale Karten scheiden aus
(`KATALOG.md` 5.1) — sie bräuchten Bilder, die es nicht gibt, und müssten sechs
gemessene Bahnregeln zur Laufzeit treffen.

**Was gebaut wird.** `src/data/vorzeichen.ts` mit einer flachen Liste
`VORZEICHEN_ORDNUNG` aus mindestens sechs benannten Abweichungen, aus der
Aussaat gezogen und **vor** dem Start sichtbar. Jedes Vorzeichen ist ein
Multiplikator oder ein Schalter auf etwas, das es schon gibt — kein
Vorzeichen bringt neue Mechanik mit:

| Vorzeichen | was es tut |
|---|---|
| Nebel | Reichweite aller Türme −15 % |
| Sturm | Flieger +30 % Tempo, Luftanteil der Wellen höher |
| Frostnacht | alle Bremsen wirken doppelt so lange, Gold −15 % |
| Beben | zwei der zwölf besten Bauplätze sind gesperrt |
| Aufmarsch | ein Drittel mehr Gegner, ein Drittel weniger Lebenspunkte je Stück |
| Kopfgeld | doppelte Abschussprämie, halber Wellenbonus |

Gezogen wird aus der Aussaat, also **deterministisch** — `npm run determinism`
prüft es, und es ist die Bedingung dafür, dass ein gemeldeter Lauf noch
nachstellbar ist (`laufAlsText` nimmt das Vorzeichen mit auf).

**Abnahme.**
* `npm run determinism`: zwei Läufe mit gleicher Aussaat ziehen dasselbe
  Vorzeichen und bleiben bitgleich.
* `npm run sim`: jede Karte bleibt mit **jedem** Vorzeichen gewinnbar, und
  keine Kombination ist mühelos. Gemessen über alle Vorzeichen × vier Karten.
* `npm run sim`: die Spanne der Ergebnisse über die Vorzeichen ist **größer**
  als die Rauschgrenze aus S-P1-01 — sonst ist ein Vorzeichen ein Name ohne
  Wirkung.
* `npm run smoke`: das Vorzeichen steht vor dem Start im Bild und im
  Laufmitschnitt.
* `npm run browsertor`: es hat eine Trefferfläche ≥ 44 Punkte, falls es
  antippbar ist.

**Gegenprobe.** Ein Vorzeichen auf den Faktor 1,0 setzen, also wirkungslos
machen: `npm run sim` muss melden, dass seine Ergebnisspanne unter der
Rauschgrenze liegt. Ohne diese Probe hätte man sechs Namen und eine Wirkung.

**Schliesst, wenn:** `liste src/data/vorzeichen.ts VORZEICHEN_ORDNUNG >= 6`

---

### S-P7-02 · Der Endlosmodus bekommt eine eigene Steigerungsregel

**Paket:** P7 · **Aufwand:** M · **Hängt an:** S-P7-01

**Problem.** F8: Der Endlosmodus endet gemessen bei **Welle 19**, vier Wellen
über dem Pflichtprogramm, und steigert nur die Zahlen (`waveAt` wiederholt die
letzten fünf Wellen mit `grow = 1 + round * 0.18`). Ohne eigene Regel ist er
ein Anhängsel — und er ist die einzige Stelle, an der ein guter Spieler zeigen
könnte, dass er besser ist als die Kurve.

**Was gebaut wird.** `ENDLOS_STEIGERUNG` in `src/data/waves.ts`: je Endlosrunde
kommt **ein Vorzeichen aus S-P7-01 dazu** und bleibt. Runde 1 hat eines, Runde
4 hat vier. Damit steigert der Modus nicht die Zahlen, sondern die **Anzahl
der Fragen**, und ein guter Spieler kommt weiter, weil er mehr Fragen
gleichzeitig beantworten kann. Die Lebenspunktkurve wächst weiter von selbst;
der Zuwachs `grow` wird dafür gesenkt, sonst steigen beide Achsen zugleich.

**Abnahme.**
* `npm run sim`: der Bestleistungs-Bot kommt weiter als Welle 19, die drei
  gewöhnlichen Stile nicht — sonst misst der Modus nicht das Können.
* `npm run sim`: der Abstand zwischen dem besten und dem schwächsten Stil ist
  im Endlosmodus **größer** als im Pflichtprogramm. Das ist der Zweck des
  Modus.
* `npm run smoke`: die Vorzeichen einer Endlosrunde stehen im Bild.
* `npm run determinism` grün.

**Gegenprobe.** `ENDLOS_STEIGERUNG` auf null setzen, also den heutigen Zustand
herstellen: `npm run sim` muss melden, dass der beste Bot nicht weiter kommt
als die gewöhnlichen. Das ist der Zustand von v248, und wenn die Prüfung ihn
nicht meldet, prüft sie nichts.

**Schliesst, wenn:** `text src/data/waves.ts "ENDLOS_STEIGERUNG" >= 2`

---

### S-P7-03 · Der vierte Grad „Unmöglich" mit eigenen Regeln

**Paket:** P7 · **Aufwand:** M · **Hängt an:** S-P7-02

**Problem.** C23: drei Grade, und alle drei sind derselbe Satz Zahlen mit
anderen Werten. Nach S-P2-05 verliert auch „Ruhig" wieder Kristall, aber die
Bauart bleibt: ein Grad ist ein Regler, keine andere Aufgabe.

**Was gebaut wird.** Ein vierter Eintrag in `DIFFICULTY_ORDER` mit **Regeln**
statt Zahlen: kein Verkaufen, keine Fähigkeiten, kein Versetzen von Türmen. Die
Zahlen liegen zwischen „Normal" und „Erbarmungslos", nicht darüber — die Härte
kommt aus den fehlenden Auswegen. `DifficultyDef` bekommt dafür Schalter, keine
Sonderfälle im Spielzustand (Regel 6: eine Ableitung, keine Stelle, an der man
es vergessen kann).

**Abnahme.**
* `npm run sim`: „Unmöglich" ist für mindestens einen Spielstil gewinnbar und
  für mindestens einen nicht.
* `npm run guards`: die vier Grade sind der Reihe nach schwerer, gemessen am
  Ergebnis und nicht an den Eingabewerten.
* `npm run smoke`: Verkaufen, Fähigkeiten und Versetzen sind auf diesem Grad
  abgelehnt, und zwar an **einer** Stelle, nicht an dreien.
* `npm run browsertor`: die Knöpfe dafür sind auf diesem Grad nicht sichtbar
  (Regel 6 gilt sinngemäß: was nicht geht, steht nicht da).

**Gegenprobe.** Den Schalter für „kein Verkaufen" entfernen und den Grad sonst
lassen: der Rauchtest muss melden, dass auf „Unmöglich" verkauft werden kann.

**Schliesst, wenn:** `liste src/data/difficulty.ts DIFFICULTY_ORDER >= 4`

---

### S-P7-04 · Rückbau der Vorzeichen

**Paket:** P7 · **Aufwand:** S · **Hängt an:** S-P7-02
**Nur fahren, wenn** S-P7-01 nach drei Schleifen keine Kombination findet, in
der jede Karte mit jedem Vorzeichen gewinnbar und keine mühelos ist.

**Problem.** Sechs Vorzeichen mal vier Karten sind 24 Aufgaben, und jede muss
lösbar sein. Findet die Messung keine Einstellung, ist die Zahl der Vorzeichen
zu groß oder ihre Wirkung zu grob — beides ist ein Ergebnis.

**Was gebaut wird.** Zuerst die kleinere Rücknahme: die Liste auf die
Vorzeichen kürzen, die messbar tragen. Trägt keines, fällt
`src/data/vorzeichen.ts` ganz weg und `S-P7-02` mit ihm. Der Raum bleibt im
Rückstandsverzeichnis: welches Vorzeichen an welcher Karte gescheitert ist, ist
die Auskunft für den nächsten Anlauf.

**Abnahme.**
* `npm run gate` grün.
* `npm run muster`: die Gegenproben aus S-P7-01 und S-P7-02 werden entfernt,
  wenn ihr Gegenstand weg ist.
* `npm run sim` meldet wieder die Zahlen von vor S-P7-01 (± Rauschgrenze).

**Gegenprobe.** Entfällt (Rückbau). Nachgefahren wird gegen die Ratschen.

**Schliesst, wenn:** `text src/game/state.ts "vorzeichen" == 0`

---

# Paket P8 — Das Menü am Turm

---

### S-P8-01 · Das Turmmenü sitzt am Turm

**Paket:** P8 · **Aufwand:** M · **Hängt an:** S-P1-00 (Bildlieferung) und
S-P5-07

**Problem.** H4 und E9: das Turmmenü sitzt am rechten Bildschirmrand, der
gemeinte Turm steht irgendwo auf dem Feld, und die Zuordnung muss der Spieler
leisten. Es braucht 228 Punkte, frei sind 218 — zehn fehlen. Mit aufgeklappter
Ziellogik sind es 286, also 68 zu viel. Vier Auswege sind in v239 gemessen und
reichen nicht. Alle drei Vorbilder setzen das Menü an den Turm.

**Was gebaut wird.** `stegStellen`: die Karte wird an der Stelle des Turms
geöffnet, mit den Symbolen aus S-P1-00 statt der Zweigsätze. Die gewonnenen
Punkte kommen aus zwei Quellen: die Zweigsätze fallen weg (90 Punkte), und die
Werte stehen als Symbolzeile statt als Liste. Die Karte weicht dem Turm aus,
wenn sie sonst über den Rand liefe, und sie verdeckt **nie** eine benutzte
Bahn (H2).

**Abnahme.**
* `npm run uxtor`: Belegung mit offenem Turmmenü **≤ 25 %** (Soll H1; heute
  32,9 %, Ratsche 34).
* `npm run uxtor`: null doppelte Beschriftungen, höchstens fünf Schriftgrößen.
* `npm run browsertor`: die Karte passt in jedem der geprüften Fenster
  (844 × 390, 1400 × 900, 700 × 850, 1512 × 982), auch mit aufgeklappter
  Ziellogik.
* `npm run beruehrung`: jede Trefferfläche ≥ 44 Punkte.
* `npm run bildtor`: die Symbole sind dekodiert und nicht einfarbig.
* `blick:` — ob die Symbole ohne Text verständlich sind, sagt kein Tor
  (Regel 8).

**Gegenprobe.** Der Karte wieder eine feste Höhe geben — genau der Zustand, den
v247 beseitigt hat und den v248 als Gegenprobe **stellt**. Das Browsertor muss
melden, dass Wertezeilen verschwinden oder der Steg überläuft. Die zwei Proben
dafür gibt es seit v248 und sie werden hier mitbenutzt.

**Schliesst, wenn:** `text src/ui/ui.ts "stegStellen" >= 2`

---

### S-P8-02 · Der Ausweichweg, falls die Symbole nicht kommen

**Paket:** P8 · **Aufwand:** M · **Hängt an:** S-P5-07
**Nur fahren, wenn** die Bilder aus S-P1-00 nicht geliefert werden und P8
sonst stillstünde.

**Problem.** S-P8-01 hängt an einer Lieferung durch den Nutzer, und der Nutzer
ist nicht erreichbar. Ein Paket, das auf etwas wartet, das nicht kommt,
blockiert den ganzen Rest — und der Katalog verspricht ausdrücklich, dass kein
Paket auf ein späteres wartet.

**Was gebaut wird.** `stegAusweich`: dieselben zehn Punkte werden ohne neue
Bilder geholt, aber mit weniger Auskunft — die Ziellogik wird zu einer Zeile
mit vier Buchstaben statt vier Knöpfen, und die Werteliste zeigt drei statt
fünf Zeilen, die restlichen hinter einem Aufklapper. Das ist schlechter als
Symbole, und der Grund steht an der Zeile: **es ist eine Rückfalllinie, kein
Entwurf.** Kommt die Lieferung später doch, wird S-P8-01 gefahren und diese
Story zurückgebaut.

**Abnahme.**
* `npm run uxtor`: Belegung mit offenem Turmmenü ≤ 30 % (nicht 25 — die
  Rückfalllinie erreicht das Soll nicht, und das wird hingeschrieben statt
  wegdefiniert).
* `npm run browsertor`: die Karte passt in allen vier geprüften Fenstern.
* `npm run beruehrung`: die vier Buchstaben der Ziellogik haben je ≥ 44 Punkte
  Trefferfläche — das ist die Stelle, an der so etwas reißt (v242: vier Knöpfe
  statt fünf gaben 49 statt 36 Punkte).

**Gegenprobe.** Den Aufklapper der Werteliste entfernen, sodass alle fünf
Zeilen stehen: das Browsertor muss den Überlauf melden.

**Schliesst, wenn:** `text src/ui/ui.ts "stegAusweich" >= 2`

---

### S-P8-03 · Der Versionsstempel bekommt eine Fläche

**Paket:** P8 · **Aufwand:** S · **Hängt an:** S-P8-01

**Problem.** H8 ist halb erledigt: die drei Zahlen haben seit v239 eine Fläche,
der Versionsstempel steht weiter nackt auf dem Kartenbild. Wo ein Kasten ist,
liegt der Kontrast bei 13:1 bis 16:1; wo keiner ist, hängt die Lesbarkeit
davon ab, was das Foto an dieser Stelle zeigt.

**Was gebaut wird.** `stempelFlaeche`: dieselbe Fläche wie bei den drei Zahlen,
dieselbe Typostufe (`marke`, 8 px). Keine neue Formensprache — das wäre die
zweite Fassung derselben Aussage.

**Abnahme.**
* `npm run uxtor`: null Textknoten ohne Fläche in allen vier gemessenen
  Zuständen.
* `npm run uxtor`: die Belegung im Ruhezustand steigt um höchstens 0,3
  Prozentpunkte (heute 14,2 %, Ratsche 16).
* `npm run beruehrung`: der Stempel ist keine Schaltfläche und braucht keine
  Trefferfläche — das gehört an die Zeile, sonst wird es beim nächsten Umbau
  zu einer.

**Gegenprobe.** Die Fläche wieder entfernen: das UX-Tor muss einen Textknoten
ohne Fläche melden. Die Prüfung dafür ist neu und gehört in dieselbe Runde —
heute zählt das Tor Doppelungen und Schriftgrößen, nicht flächenlose Knoten.

**Schliesst, wenn:** `text src/ui/ui.ts "stempelFlaeche" >= 2`

---

### S-P8-04 · Der Zweigsatz steht auch auf dem Telefon

**Paket:** P8 · **Aufwand:** S · **Hängt an:** S-P8-01

**Problem.** H10 ist halb erledigt: Frühstart (v243) und Zweigwirkung (v248)
stehen auf beiden Bildschirmen, der erklärende Zweigsatz bleibt
Schreibtisch-only, weil ihm 90 Punkte fehlen. Das Spiel wird auf dem iPhone
quer beurteilt; die Ausdünnung läuft in die falsche Richtung.

**Was gebaut wird.** Nach S-P8-01 sind die Punkte da. Der Zweigsatz steht auf
beiden Bildschirmen, gekürzt auf das, was die Entscheidung trägt — nicht
gesperrt und nicht ausgeblendet. Wo weiterhin ausgedünnt werden muss, wird
**nach Wichtigkeit** ausgedünnt und nicht nach Platz, und die Reihenfolge steht
im Quelltext.

**Abnahme.**
* `npm run browsertor` auf 844 × 390: der Zweigsatz ist sichtbar und nicht
  abgeschnitten.
* `npm run browsertor` auf 1400 × 900: derselbe Satz, nicht ein längerer —
  zwei Fassungen desselben Textes wären Regel 15.
* `npm run uxtor`: die Ratschen halten.
* `npm run streifen`: der längste Zweigsatz bricht das Band nicht um.

**Gegenprobe.** Den Satz im Kompaktblock wieder mit `display: none` versehen —
genau der Fehler, der den Frühstart bis v243 auf dem Zielgerät unsichtbar
gemacht hat. Das Browsertor muss anschlagen; der Rauchtest kann es nicht sehen,
und das gehört an die Zeile.

**Schliesst, wenn:** `text src/style.css "zweigsatz" >= 2`
