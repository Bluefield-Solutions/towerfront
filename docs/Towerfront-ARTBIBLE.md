# Towerfront — Art Bible

Stand: v184 · 28.08.2026

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
| **Saumkontrast** | höchstens **10 von 20** Figuren unter 1,5 — Ratsche | Gemessen wird der äußerste Ring der Figur gegen den Boden. Ein Soll gibt es nicht; die alte Grenze war für die alte Messung gedacht und hätte alle zwanzig gerissen | `npm run lesbarkeit` |
| Prüfung der Prüfung | liefert die Messung für alle Figuren fast denselben Wert, misst sie nicht die Figur | v148: sie rechnete die Kartenfarbe statt der Figur — zwanzig grüne Zeilen über eine Farbe, die kein Bildpunkt je trug | `npm run lesbarkeit`, Spannenprüfung |
| Silhouettenbreite | jede Gegnerfigur passt auf die engste Wegstelle | gemessen am gepackten Bild, nicht an der Kachel | `npm run gedraengetor` |
| Farbe **oder** Form trennt | zwei Arten dürfen nicht zugleich unter 12 (CIE76) und über 0,65 Überdeckung liegen | Seit den Fraktionsfarben (TF-024) tragen zwei Gegner **derselben Rolle** denselben Akzent — das ist gewollt. Getrennt werden sie dann an der Form | `npm run lesbarkeit` |
| Messstelle der Gegnerfarbe | mittlere Farbe der **gebackenen** Figur, Körperfarbe mit 15 % darüber | v168: das Tor rechnete mit 38 % — dem Wert des Alt-Zweigs, der seit v147 nicht mehr läuft. Es maß eine Figur, die niemand sieht | `FARBSCHLEIER` in `src/gfx/enemyart.ts`, von `lesbarkeit` importiert |

**Gemessen (v153):** 9 von 20 Figuren unter 1,5. Der Koloss liegt auf der
Frostspalte bei **1,02** — seine Kante hat praktisch die Helligkeit des
Bodens. Am Bild zu beheben oder durch das Randlicht aus TF-012.
Der Koloss füllt die engste Straße zu **96 %** — viel bleibt nicht.

### 4.3 Bestellung: die Silhouetten des ausgelieferten Satzes

Beim ersten Lauf der Form-Messung über den **ausgelieferten** Gegnersatz
(v168 — vorher hat kein Tor sie je gemessen, `npm run probebild` prüft nur
Kandidaten *vor* dem Packen) verletzt der Satz die eigene Bestellregel von
0,65. Acht Paare liegen darüber:

| Überdeckung | Paar | Farbabstand | trennt die Farbe? |
|---|---|---|---|
| **0,84** | Schleicher / Koloss | 28,4 | ja |
| **0,76** | Koloss / Spalter | **7,3** | **nein — der eine offene Befund** |
| 0,69 | Späher / Spalter | 21,1 | ja |
| 0,68 | Schleicher / Spalter | 22,4 | ja |
| 0,68 | Späher / Koloss | 27,2 | ja |
| 0,67 | Infanterie / Spalter | 35,0 | ja |
| 0,65 | Koloss / Leerentitan | 16,9 | ja |
| 0,65 | Infanterie / Koloss | 39,8 | ja |

Sieben davon trägt heute die Farbe. **Koloss und Spalter** trägt nichts: sie
sind grau wie grau und fast deckungsgleich.

**Und es gibt eine gemessene Ursache dafür, keine zufällige.** Die Füllung
des Deckrechtecks — wieviel vom umschließenden Rechteck die Figur wirklich
belegt — trennt die acht sauber:

| leere Fläche | Figur |
|---|---|
| 52 % · 48 % · 41 % · 40 % | Gleiter · Span · Infanterie · Leerentitan |
| 31 % · 30 % | Schleicher · Späher |
| **23 %** | **Koloss** |
| **14 %** | **Spalter** |

Die beiden Figuren, die sich nicht trennen lassen, sind zugleich die beiden
massivsten Rechtecke im Satz. Das ist kein Zufall: zwei fast volle Rechtecke
überdecken sich stark, ganz gleich was auf sie gemalt ist. **Umriss-Ähnlichkeit
ist zum großen Teil eine Frage der Füllung** — und die ist bestellbar. Am Code ist daran nichts zu
holen — gemessen bewegt die Körperfarbe über die ganze Gunmetal-Familie
hinweg den Abstand nur zwischen 7,1 und 9,1; über die Grenze käme erst ein
Braun oder ein Marineblau, und dann wäre die Fraktionsfamilie dahin.

**Was zu bestellen ist:** ein neues Bild für den **Spalter**, dessen Umriss
sich vom Koloss zu höchstens 0,60 überdeckt. Der Koloss ist ein Block; der
Spalter soll *zerfallen* können — eine Silhouette mit einer sichtbaren
Trennfuge, schmaler Taille oder aufgesetzten Segmenten liest das schon im
Umriss. Die Farbe bleibt in der Familie; die Trennung kommt aus der Form.

Die Zahlen werden bei jedem Lauf mit `PAARE=1 npm run lesbarkeit`
nachgestellt, die Ratsche steht in `tools/readability.mjs`.

### 5.3 Nachbestellung v177: der Frostturm auf Stufe 5 und 6

Die Lieferung vom 27.08.2026 hat den Auftrag zum größten Teil eingelöst —
ein Dreibein mit offenen Lücken statt eines Klotzes. Gemessen:

| | vorher | Lieferung | |
|---|---|---|---|
| Sortenpaare über 0,65 | **6 von 6** | **4 von 6** | zwei gewonnen |
| Bogenturm / Frostturm | 0,76 | **0,63** | unter der Grenze |
| Frostturm / Prisma | 0,69 | **0,56** | unter der Grenze |
| Frostturm / Mörser | 0,65 | **0,70** | **schlechter** |
| Stufe 1 gegen Stufe 6 | 0,72 | **0,48** | der Ausbau ist zu sehen |
| Lichtwinkel | bis 44° | 2–16° | erledigt |
| Rand berührt | 3 von 6 | keine | erledigt |

**Was nachzubessern ist, steht in einer Zahl:** die leere Fläche im
Deckrechteck fällt von **63 % auf Stufe 1 auf 32 % auf Stufe 6**. Der
Emitterkranz wächst so weit nach außen, dass er die Beine verdeckt — und
damit wird die Figur auf den oberen Stufen wieder ein geschlossener Umriss.
Genau daran hängt der eine verlorene Wert.

**Zu liefern sind nur die Stufen 5 und 6 neu:**

1. Der Kranz darf wachsen, aber **die Lücken zwischen den Beinen müssen offen
   bleiben** — mindestens 45 % leere Fläche auf jeder Stufe, statt der
   heutigen 43 % und 32 %.
2. Was auf Stufe 5 und 6 dazukommt, gehört **nach oben und zur Seite**, nicht
   in die Mitte: ein zweiter Ring auf Stützen, ein auskragendes Kühlpaket,
   ein Mast — nichts, was den Raum zwischen den Beinen füllt.
3. **Abnahme:** gegen den Mörser höchstens 0,60 auf jeder Stufe (heute 0,70
   auf Stufe 6), leere Fläche mindestens 45 %.

Bis dahin steht `frost/mortar 0,70` als Ratscheneintrag in
`tools/readability.mjs`.



---

## 5. Maßstab und Form

| Festlegung | Wert | Herkunft | Messstelle |
|---|---|---|---|
| Turmzeichengröße | für **alle** Sorten gleich (`TURM_BREITE`) | Sonst stünden zwei Maßstäbe im selben Bild | `npm run guards` |
| Platzbedarf | in einem Band um die Zeichengröße | Ein Turm, der viel mehr Boden beansprucht als er bedeckt, wäre eine unsichtbare Sperre | `npm run guards` |
| Mündung | jedes Rohr endet an der Figur, nicht im Sockel — und ändert **nur** das Bild | v145: der Mündungspunkt als Flugstrecke gedacht kostete 18 Punkte Balance | `npm run muendungstor` |
| Geschossform je Turm | eine Signaturform, keine zwei gleich | Vorbilder geben jedem Turm eine erkennbare Handschrift | `npm run guards` → „Geschossformen" |
| Nichts Rechteckiges auf dem Feld | alles, was zu einer Figur gehört, liegt auf dem Boden oder auf der Figur | Vorbilder | von Hand beurteilt |
| **Form der vier Turmsorten** | keine zwei über **0,65** Umriss-Überdeckung, auf **jeder** Stufe | Dieselbe Regel wie bei den Gegnern (3.2b). Zwölf Türme auf einem Feld — der Umriss sagt, welcher wo steht | `npm run lesbarkeit` |
| **Sichtbarkeit des Ausbaus** | Ratsche, kein Soll: kleiner ist besser | Die sechs Stufen sind absichtlich eine Familie (Bildauftrag 6.1), also ist eine hohe Zahl nicht schon ein Fehler. Wo die Grenze liegt, sagt erst ein Referenzabgleich — nicht ich (Regel 10) | `npm run lesbarkeit` |
| **Füllung des Deckrechtecks** | wird gemessen und berichtet, ohne gemeinsame Grenze | Für einen Turm ist sie eine andere als für einen Späher; eine erfundene gemeinsame Zahl verwürfe alles oder nichts (Regel 10). Die Bestellungen tragen ihre eigene | `npm run probebild` |
| Messstelle der Turmform | der Turm, wie er **gezeichnet** wird — beim Bogenturm Sockel **und** Waffe zusammengesetzt | Der Sockel allein wäre der fünfte Fall einer Zahl an einer Figur, die niemand sieht | `umrissZusammen` in `tools/silhouette.ts` |

### 5.2 Bestellung: die vier Türme sind im Umriss eine Familie

Beim ersten Lauf der Formmessung über **Türme** (v169 — bis dahin hat sie nur
Gegner gemessen) liegen **alle sechs Sortenpaare** über der Grenze von 0,65:

| schlechtester Wert | Paar | wo |
|---|---|---|
| **0,76** | Bogenturm / Frostturm | Stufe 3 |
| 0,70 | Bogenturm / Mörser | Stufe 6 |
| 0,69 | Mörser / Prisma | Stufe 3 |
| 0,69 | Frostturm / Prisma | Stufe 3 |
| 0,66 | Bogenturm / Prisma | Stufe 3 |
| 0,65 | Frostturm / Mörser | Stufe 6 |

Der Grund ist derselbe wie beim Spalter: alle vier sind ein **aufrechter
Klotz mit etwas obendrauf**, gepackt auf dieselbe Kachel mit demselben
Füllgrad. Im normierten Umriss fällt weg, was sie unterscheidet — Rohr,
Kristall, Emitter —, weil es innerhalb des Deckrechtecks liegt.

**Und dasselbe noch einmal über die Stufen.** Stufe 1 gegen Stufe 6:

| Sorte | Überdeckung | was das heißt |
|---|---|---|
| **Bogenturm** | **0,92** | der Ausbau ist im Umriss praktisch nicht zu sehen |
| Prisma | 0,83 | wenig |
| Mörser | 0,74 | erkennbar |
| Frostturm | 0,72 | erkennbar |

Beim Bogenturm ist die Ursache **gerechnet, nicht vermutet**: seine Waffe ist
0,75 Zeichenbreiten breit und sitzt auf einem Viertel der Höhe — sie liegt
damit **ganz innerhalb** des Sockelumrisses und trägt zum Umriss nichts bei.
Von der Sandsackschürze auf Stufe 3 bis zum Zielmast auf Stufe 4 hat nichts
davon die Kante erreicht.

**Was zu bestellen ist** — für jede neue Turmlieferung, und zuerst für den
ohnehin offenen Frostturm (Bildauftrag 6.3):

1. **Eine Sorte, eine Grundform am Rand.** Nicht das Rohr unterscheidet,
   sondern was aus dem Deckrechteck heraussteht: der Mörser eine schräg nach
   hinten geneigte Wanne, das Prisma ein schmaler Turm mit auskragendem Kopf,
   der Frostturm ein dreibeiniger Emitter mit Lücken zwischen den Beinen.
2. **Ab Stufe 3 muss der Ausbau die Kante erreichen.** Sandsackschürze,
   Zielmast, Kühlrippen: mindestens eines je Stufe **außerhalb** der
   Silhouette von Stufe 1. Beim zweiteiligen Bogenturm heißt das: der Ausbau
   gehört auf den **Sockel**, nicht auf die Waffe — die Waffe kann er nicht
   tragen, sie steht innen.
3. **Abnahme:** Sortenpaare höchstens 0,60, Stufe 1 gegen Stufe 6 höchstens
   0,70. Beides mit `npm run lesbarkeit`.

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
