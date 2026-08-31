# Referenzabgleich — Fähigkeiten freischalten (C18)

Stand: v200 · 29.08.2026

Schritt 0 des Durchgangs, nach `docs/Towerfront-SOLL-UND-BETRIEB.md` Teil 2.
Er stand aus: C18 steht seit v40 im Rückstandsverzeichnis, und das Soll war
ein halber Satz — „Fähigkeiten zwischen Karten freischalten statt von Anfang
an verfügbar". Was das Freischalten **tun** soll, stand nirgends.

---

## Schritt 1 — Referenz benennen

Drei Spiele, und für jedes: was es tatsächlich tut.

### Plants vs. Zombies — die Samentüte nach dem Level

Nach fast jedem Level bekommt der Spieler eine neue Pflanze, auf einem
eigenen Bildschirm, der sonst nichts zeigt.

Was das tut, ist nicht „mehr Auswahl": es macht das **nächste** Level zu
einer anderen Aufgabe. Man hält nie mehr als ein paar neue Werkzeuge
gleichzeitig, und keines davon hat man sich ausgesucht — die Freischaltung
ist **Belohnung fürs Fertigwerden**, nicht Einkauf. Sie ist unübersehbar und
unverpassbar; man kann sie nicht falsch ausgeben.

### Kingdom Rush — die Sternenbäume der Zauber

Die beiden Zauber (Verstärkung, Feuerregen) sind ab Level 1 da. Was mit
Sternen gekauft wird, sind ihre **Ausbaustufen**, in einem Baum mit
Voraussetzungen, neben den Türmen.

Zwei Dinge daran: die Zauber bleiben dieselben **Verben** und werden nur
stärker — man lernt sie einmal. Und der ganze Baum ist von Anfang an
**sichtbar**, samt Preis. Ein gesperrtes Feld ist dort kein leerer Fleck,
sondern ein Plan.

### Bloons TD 6 — Freischaltung über den Kontostand

Helden und Türme öffnen sich über Erfahrungsstufen, das Wissen über eigene
Punkte. Die Freischaltung hängt an **keiner einzelnen Karte**, und der
nächste Schritt steht immer mit seinem Abstand daneben.

Und hier steht die Referenz auch als **Warnung**: der am häufigsten
kritisierte Teil ist, dass die frühen Stunden sich wie eine Demo anfühlen,
weil zu vieles zu lange zu ist. Was fehlt, fehlt spürbar; die Sperre muss
sich rechtfertigen, nicht das Freigeben.

---

## Schritt 2 — Soll ableiten

Aus dem, was die drei **tun**:

| # | Soll | woher |
|---|---|---|
| S1 | Die Freischaltung ist **Belohnung für eine geschaffte Karte** — automatisch, unverpassbar, nicht gekauft | PvZ |
| S2 | Was noch zu ist, ist **sichtbar, samt Bedingung**, von der ersten Minute an. Ein gesperrtes Feld ist ein Plan, kein leerer Fleck | Kingdom Rush, BTD6 |
| S3 | Die Freischaltung ändert die **nächste** Karte — ein neues Verb, keine grössere Zahl. Wer sie bekommt, spielt anders, nicht stärker | PvZ; Kingdom Rush macht ausdrücklich das andere und trennt beides sauber |
| S4 | Die **erste Karte ist ohne sie vollständig**. Was am Anfang dasteht, muss zum Sieg reichen — sonst ist die Eröffnung eine Demo | BTD6, als Warnung |
| S5 | Die Freischaltung wird **gezeigt, wenn sie passiert** — ein Augenblick am Ende des Laufs, keine Zeile in einem Menü | PvZ |
| S6 | Einmal verdient bleibt verdient: auf **jedem Grad**, in jedem Modus, auch im Endlosmodus | alle drei |

## Schritt 3 — Abstand messen

| # | Soll | heute | Abstand |
|---|---|---|---|
| S1 | Belohnung fürs Fertigwerden | **fehlt** — alle vier stehen in Welle 1 der ersten Karte bereit | ganz |
| S2 | sichtbar, samt Bedingung | **fehlt** — es ist nichts zu, also zeigt auch nichts einen Plan | ganz |
| S3 | neues Verb je Karte | **fehlt** — die drei Karten unterscheiden sich in Weg und Gelände, nicht im Handwerkszeug | ganz |
| S4 | erste Karte ohne sie vollständig | **unbekannt** — die ganze Balance ist mit allen vier geeicht. Das ist die Zahl, die diese Runde zuerst braucht | zu messen |
| S5 | Augenblick am Ende | **halb da** — „Ein neuer Stern" steht seit v135 genau dort und hat genau diese Form | klein |
| S6 | bleibt verdient | die Sterne liegen schon je Karte **und Grad** in der Ablage (`progress.stars`) | keiner |

**Der Abstand ist bei drei von sechs Punkten der volle, bei zweien
klein oder null** — und S4 ist keine Meinung, sondern eine Messung, die vor
allem anderen fällig ist. Eine Sperre, die die erste Karte unschaffbar
macht, ist kein Fortschritt, sondern ein Fehler.

## Schritt 4 — was das für den Auftrag heisst

**Die Ableitung statt einer Tabelle.** Vier Fähigkeiten, drei Karten: eine
steht von Anfang an, die drei anderen hängen an der Zahl der **je
gewonnenen Karten**. Keine Zuordnung „Ascheschlucht schaltet den Frost frei"
— die wäre bei der vierten Karte still falsch, und Karte 4 steht als C24 im
Verzeichnis. Gerechnet wird aus `progress.stars`: eine Karte gilt als
geschafft, sobald dort auf irgendeinem Grad ein Stern steht, und Sterne gibt
es nur für einen Sieg (`starsFor`). Damit erfüllt S6 sich von selbst.

**Der Zustand wird beim Start des Laufs eingefroren.** Wer während einer
Partie nichts freischalten kann, braucht auch keinen Fall dafür — und der
Spielstand einer laufenden Partie trägt die Freigabe mit, sonst hätte ein
fortgesetzter Lauf plötzlich andere Regeln als der begonnene.

**Was NICHT gebaut wird:** ein Laden. Die Splitter (`buyPerk`) sind der
Einkaufsweg und bleiben es; S1 verlangt ausdrücklich das Gegenteil davon.
Zwei Währungen für dieselbe Sache wären die zweite Wahrheit über den
Fortschritt.
