# Towerfront — Art Bible

Stand: v165 · 25.08.2026

**Dieses Dokument ist verbindlich.** Wer ein Bild bestellt, malt oder einbaut,
richtet sich danach. Es ist die einzige Stelle, an der die Festlegungen
stehen — `Towerfront-ASSET-SPEZIFIKATION.md` ist die *Bestellform* (Prompts,
Größen, Reihenfolge), `Towerfront-GRAFIK-AUDIT.md` ist der *Befundbericht*
von v104. Beide verweisen hierher, keines wiederholt es (Regel 15).

---

## Die eine Regel über allen anderen

> **Ohne Messstelle ist eine Festlegung nur eine Meinung.**

Deshalb trägt jede Zeile unten drei Dinge: **was gilt**, **woher es kommt**
und **womit es geprüft wird**. Wo keine Messstelle steht, steht ausdrücklich
„von Hand beurteilt" — dann ist es eine Meinung, und sie ist als solche
gekennzeichnet.

Und keine Zahl kommt aus meinem Geschmack (Regel 10). Sie kommt entweder aus
dem Spiel selbst (eine Konstante, die der Renderer ohnehin benutzt), aus einer
Messung am Zielbild (`Towerfront-GRAFIK-AUDIT.md`, Abschnitt 5), oder sie ist
eine **Ratsche** auf dem heutigen Stand: dann ist sie kein Ziel, sondern eine
Sperrklinke, und das steht dabei.

---

## 1. Licht und Kamera

| Festlegung | Wert | Herkunft | Messstelle |
|---|---|---|---|
| **Sonne** | **−128°**, also von oben links | `LICHT = { x: 0.62, y: 0.78 }` in `src/data/config.ts` — die Richtung, mit der der Renderer **jeden** Schatten zeichnet | `npm run grafik` → „Lichtrichtung", Winkel je Figur und je Untergrund, ringförmig gerechnet |
| **Abweichung je Figur** | höchstens **67°** — Ratsche, nicht Soll | Soll wären 0°. Heute liegen fünf von acht Gegnern über 17° daneben; das ist am Bild zu beheben, nicht am Code | `npm run grafiktor` bricht ab, wenn die schlimmste Figur schlechter wird |
| **Modellierungsstärke** | mindestens **0,0024** — Ratsche | Eine flach ausgeleuchtete Figur hat gar keine Lichtrichtung, und die Winkelmessung misst dann Rauschen | `npm run grafiktor`, „flachste Modellierung" |
| **Schattenrichtung** | immer `LICHT`, Länge proportional zur Figurenhöhe | dieselbe Konstante | von Hand beurteilt — der Schatten wird gezeichnet, nicht gebacken |
| **Kamerawinkel** | ein einziger Blickwinkel für alles | TF-017 | **keine Messstelle** — siehe Abschnitt 6 |

**Gemessen (v153):** Türme 2° bis 19° neben der Sonne — sie sind aus einer
Hand. Gegner 1° bis 66°: `brute` 1°, `splitling` 17°, `splitter` 18°,
`crawler` 24°, `titan` 32°, `runner` 35°, `infantry` 42°, `flyer` 66°.
Untergründe 3° bis 20°.

---

## 2. Helligkeit, Sättigung, Detail

| Festlegung | Band | Herkunft | Messstelle |
|---|---|---|---|
| Figuren Helligkeit | 0,33 – 0,40 | Messung am Zielbild, Grafik-Audit 5.4 | `npm run grafik` |
| Figuren Sättigung | 0,35 – 0,45 | ebenda | `npm run grafik` |
| Figuren Detaildichte | 3 – 6 | ebenda | `npm run grafik` |
| Untergrund Helligkeit | 0,30 – 0,36 | ebenda | `npm run grafiktor` — **je Karte**, nicht im Mittel |
| Untergrund Sättigung | 0,45 – 0,55 | ebenda | `npm run grafik` |
| Untergrund Detaildichte | 1,5 – 3,0 | ebenda | `npm run grafiktor` |
| **Detail Figur zu Untergrund** | höchstens **3-fach** | Zielbild: 2,1-fach | `npm run grafik` |
| Reines Schwarz | unter 2 % der Fläche | Zielbild: 1,3 % | `npm run grafik` |

**Gemessen (v153):** Alles im Band **außer** der Detaildichte: Figuren tragen
**6,0-mal** so viel Feindetail wie der Untergrund. Das ist Befund B1 aus dem
Grafik-Audit. Nachbearbeitung hilft nicht — nachgewiesen mit
`npm run entrauschprobe`, Weichzeichnen kostet sichtbar Form.

---

## 3. Einbettung in die Karte

| Festlegung | Wert | Herkunft | Messstelle |
|---|---|---|---|
| Klimaton | Farbabstand zur Karte höchstens 0,24 | Grafik-Audit 5.4 | `npm run einbettungstor` |
| Helligkeitsabstand | mindestens 0,10 | ebenda | `npm run einbettungstor` |
| Kartenbindung | dasselbe Gegnerbild auf drei Karten = drei verschiedene Bilder | v148: der Zwischenspeicher hätte sonst alle drei Karten in ein Fach gelegt | `npm run einbettungstor` prüft den echten Weg über `getEnemyArt` |
| Zielplattform | der Kristall steht auf einer erkennbaren Platte | Vorbilder setzen das Ziel auf einen Sockel | `npm run zielplattentor` |

---

## 4. Lesbarkeit

| Festlegung | Wert | Herkunft | Messstelle |
|---|---|---|---|
| **Saumkontrast** | höchstens **9 von 20** Figuren unter 1,5 — Ratsche | Gemessen wird der äußerste Ring der Figur gegen den Boden. Ein Soll gibt es nicht; die alte Grenze war für die alte Messung gedacht und hätte alle zwanzig gerissen | `npm run lesbarkeit` |
| Prüfung der Prüfung | liefert die Messung für alle Figuren fast denselben Wert, misst sie nicht die Figur | v148: sie rechnete die Kartenfarbe statt der Figur — zwanzig grüne Zeilen über eine Farbe, die kein Bildpunkt je trug | `npm run lesbarkeit`, Spannenprüfung |
| Silhouettenbreite | jede Gegnerfigur passt auf die engste Wegstelle | gemessen am gepackten Bild, nicht an der Kachel | `npm run gedraengetor` |
| Farbabstand der Gegner | keine zwei Arten fast gleich | Ohne das ist die Vorschau nutzlos | `npm run lesbarkeit` |

**Gemessen (v153):** 9 von 20 Figuren unter 1,5. Der Koloss liegt auf der
Frostspalte bei **1,02** — seine Kante hat praktisch die Helligkeit des
Bodens. Am Bild zu beheben oder durch das Randlicht aus TF-012.
Der Koloss füllt die engste Straße zu **96 %** — viel bleibt nicht.

---

## 5. Maßstab und Form

| Festlegung | Wert | Herkunft | Messstelle |
|---|---|---|---|
| Turmzeichengröße | für **alle** Sorten gleich (`TURM_BREITE`) | Sonst stünden zwei Maßstäbe im selben Bild | `npm run guards` |
| Platzbedarf | in einem Band um die Zeichengröße | Ein Turm, der viel mehr Boden beansprucht als er bedeckt, wäre eine unsichtbare Sperre | `npm run guards` |
| Mündung | jedes Rohr endet an der Figur, nicht im Sockel — und ändert **nur** das Bild | v145: der Mündungspunkt als Flugstrecke gedacht kostete 18 Punkte Balance | `npm run muendungstor` |
| Geschossform je Turm | eine Signaturform, keine zwei gleich | Vorbilder geben jedem Turm eine erkennbare Handschrift | `npm run guards` → „Geschossformen" |
| Nichts Rechteckiges auf dem Feld | alles, was zu einer Figur gehört, liegt auf dem Boden oder auf der Figur | Vorbilder | von Hand beurteilt |

---

## 6. Was **keine** Messstelle hat

Ehrlich benannt, statt als erfüllt abgehakt:

* **Kamerawinkel (TF-017).** Der Befund ist am Bild eindeutig — der Koloss
  ist eine Frontalansicht, man sieht sein Gesicht; Späher und Gleiter sind
  reine Aufsichten. Der Code behandelt seit v148 **alle acht als Aufsichten**
  und dreht sie zur Laufrichtung. Ein Verfahren, das den Blickwinkel aus
  einer einzelnen stilisierten Figur zurückrechnet, habe ich nicht — und
  eine Messung zu behaupten, die ich nicht habe, wäre schlimmer als keine.
  Bis dahin gilt der Winkel als **von Hand beurteilt**, und TF-017 trägt ihn.
* **Materialfamilien** (Stein/Metall, Kristall, Chitin) — von Hand beurteilt.
* **Schattenhärte und Umgebungsverdeckung** — von Hand beurteilt.
* **Fraktionsfarben** (TF-024) — heute misst `npm run lesbarkeit` das
  *Gegenteil*: dass keine zwei Gegner sich ähneln. Eine Farbfamilie je
  Fraktion braucht erst die Fraktionen.

---

## 7. Die Bestellliste

Was neue Bilder braucht, nach Dringlichkeit. Das ist zugleich, was
`art/roh/` fehlt (TF-041):

> **v159: die acht Gegner sind geliefert und eingebaut.** Was unten stand,
> ist damit für die Gegner erledigt — die Zeilen bleiben als Beleg stehen und
> tragen jetzt ihren Nachher-Wert. Offen sind die **Türme**, die **Objekte**
> und die **Untergründe**.

| # | Was | Warum, gemessen |
|---|---|---|
| 1 | ~~Gleiter neu beleuchtet~~ **erledigt v159** | war 66° neben der Sonne, jetzt liegt die schlimmste Figur (Infanterie) bei **31°** |
| 2 | ~~Infanterie neu~~ **erledigt v159** | war 42° und 0,0025; jetzt 31° und die flachste Figur ist der Koloss mit 0,0040. Als Fußtrupp aus drei Soldaten füllt sie ihre Kachel |
| 3 | ~~Koloss, Kante~~ **erledigt v156/v159** | Randlicht plus neues Bild: schwache Kanten 9 → **8 von 20** |
| 4 | ~~Späher und Leerentitan~~ **erledigt v159** | beide unter 26° |
| 5 | **Alle Figuren mit weniger Feindetail** — für die Gegner gebessert, nicht gelöst | 6,0-fach → **5,3-fach** gegen den Untergrund, erlaubt sind 3,0. Bleibt Befund B1, jetzt vor allem an den Türmen |
| 6 | **Ein Kamerawinkel** für alle | TF-017, und dafür alle Figuren neu |
| 7 | `waffe_bogen_5` und `waffe_bogen_6` | v160: Sockel 1–6 und Waffen 1–4 stehen im Spiel. Stufe 5 und 6 zeigen die vierte Waffe — der Turm ist vollständig, aber die beiden teuersten Ausbauten sehen aus wie der vorletzte |
| 8 | ~~Mörser und Prisma~~ **erledigt v163** | beide Sätze geliefert und eingebaut. Offen bleibt der **Frostturm** — er ist der letzte aus der alten Welt und fällt neben den drei neuen sofort auf |
| 9 | **Sockelstufen, die sich im Umriss unterscheiden** | v160 gemessen: Silhouetten-Ähnlichkeit **0,95 bis 0,96** zwischen den sechs Bogen-Sockeln. Auf 60 Bildschirmpunkten ist Stufe 6 von Stufe 1 nicht zu unterscheiden. Zielwert höchstens 0,85 zwischen Stufe 1 und 6 |

### Zwei Festlegungen, die aus der ersten Turmlieferung kommen (v160)

| Festlegung | Wert | Woher | Womit geprüft |
|---|---|---|---|
| Nabe im Sockelbild | 0,25 der Kachelhöhe | am gelieferten Bild gemessen: der Zeichner hat den Drehkranz mit einem Loch in der Mitte gemalt, auf allen sechs Stufen an derselben Stelle | `npm run muendung` — es liest seit v160 **jede gezeichnete Stufe**, nicht mehr nur die stufenlose Rückfallfassung |
| Drehpunkt im Waffenbild | Bildmitte, waagerecht **und** senkrecht | dieselbe Lieferung: ein Nabenbolzen sitzt genau dort | dasselbe Tor; ein verschobener Drehpunkt lässt die Waffe beim Schwenken um einen Punkt neben sich eiern |

---

## 8. Wer etwas ändert

* Eine neue Festlegung braucht eine Messstelle — oder die Zeile
  „von Hand beurteilt". Der Dokumentenwächter prüft, dass jeder hier
  genannte Befehl existiert.
* Eine Ratsche wird **enger** eingetragen, nie weiter. Wer sie lockert, hebt
  die Prüfung auf.
* Wer ein Tor ändert, trägt in `npm run proben` eine Gegenprobe nach.
