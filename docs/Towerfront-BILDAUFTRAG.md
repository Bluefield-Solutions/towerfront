# Towerfront — Bildauftrag

Stand: v221 · 05.09.2026 · **Auftragsdokument für den Bild-Agenten**

Dieses Dokument ist die vollständige Bestellung. Es enthält alles, was zum
Erzeugen der Bilder nötig ist: Stil, Maße, Blickrichtung, Dateinamen,
Grenzwerte und je Bild einen fertigen Prompt. Es ist so geschrieben, dass
**keine Rückfrage nötig** ist.

> **Verbindlich bleibt `Towerfront-ARTBIBLE.md`.** Dort stehen die Zahlen und
> ihre Messstellen. Hier stehen sie als Auftrag formuliert. Wo beide etwas
> sagen, gilt die Art Bible — und dort steht auch, welches Tor es prüft.

**Die Prompts sind auf Englisch.** Bildmodelle folgen englischen
Beschreibungen zuverlässiger, besonders bei Blickwinkel und Lichtrichtung.
Alles andere in diesem Dokument ist deutsch.

---

## 0. Der Stilwechsel — und was er *nicht* ändert

Bestellt wird ein **moderner, militärischer Look**: Panzer, leichte
Fahrzeuge, Infanterie, Drohnen; Türme als Geschützstellungen — Flak,
Autokanone, Haubitze, Laser. **Keine Bogenschützen, keine Zinnen, keine
Magie.**

**Was sich dadurch nicht ändert:** kein einziger Spielwert. Schaden,
Reichweite, Takt, Panzerung, Tempo, Wellen und Balance bleiben, wie sie sind.
Ein Bild ersetzt ein Bild.

**Was danach nachgezogen werden muss** (nicht Aufgabe des Bild-Agenten, aber
hier vermerkt, damit es niemand vergisst): die **Namen im Spiel** passen dann
nicht mehr — „Bogenturm" für eine Autokanone, „Koloss" für einen Panzer. Das
ist eine eigene Runde im Code und in `src/data/*.ts`.

---

## 1. Der globale Stil-Prompt

**Jedem einzelnen Bild-Prompt wörtlich voranstellen** — aber nicht von
Hand: `npm run bildprompt -- <suchtext>` gibt einen Prompt **vollständig**
aus, mit eingesetztem Stil-Block, zum Kopieren in einem Stück. Ohne
Suchtext listet es alle.

> **Für einen Bild-Agenten ausserhalb dieses Verzeichnisses** gibt es
> `npm run bildwissen`: es baut aus genau diesem Dokument eine eigenständige
> Wissensdatei (`bilder/TOWERFRONT-BILDWISSEN.md`) samt Text fürs
> Anweisungsfeld. Sie wird **erzeugt, nicht gepflegt** — wer etwas ändern
> will, ändert dieses Dokument und lässt sie neu bauen.

> **Warum das Dokument den Block trotzdem nur einmal hält.** Siebzehn
> Kopien wären siebzehn Fassungen, die auseinanderdriften (Regel 15). Für
> den Empfänger ist ein Bruchstück aber unbrauchbar — er muss den Rest
> zusammensuchen, und wer zusammensucht, vergisst. Also beides: **eine**
> Fassung hier, **vollständig** beim Ausgeben. Das Werkzeug bricht ab, wenn
> der Platzhalter im Ergebnis stehen bleibt.



```
STYLE: Modern military science-fiction, near-future. Hand-painted game asset
in the style of a high-end mobile tower-defense game (think Kingdom Rush
production values, but contemporary armour and weapons instead of fantasy).
Painterly, NOT photorealistic, NOT 3D-render-looking, NOT cel-shaded outline
cartoon.

CALM SURFACES: large readable shapes, few but deliberate details. Panel
lines, hatches, weld seams and vents are allowed; surface grime, rivet
fields, scratched micro-texture and noise are NOT. The silhouette must read
at 40 pixels tall.

THE QUIET TEST - apply it to your own image before delivering: scale the
finished figure down to 48 pixels and look at it. If anything inside the
silhouette still reads as TEXTURE rather than as a shape, it is too busy.
Concretely: no more than about eight separate value areas inside the whole
figure, and none of them filled with pattern. This is the single most common
reason a delivery is rejected.

TRACKS AND TYRES: draw a tracked vehicle's tracks as TWO CONTINUOUS DARK
BANDS with only three or four suggested links, never as a fully modelled
chain of individual track links. At 40 pixels the links are invisible and
cost nothing but noise. Same for tyre tread: suggest it, do not model it.

NO OUTLINES — THIS IS THE MOST IMPORTANT RULE IN THIS BRIEF.
Do NOT draw a dark contour line around the object, around its parts, or
around individual armour plates. No ink line, no keyline, no comic or
cel-shaded border, no "sticker" edge. Shapes are separated by VALUE and by
light, the way a painting does it — never by a drawn line.

NO BLACK: the darkest value anywhere in the image must still read as a dark
GREY (around 18 percent brightness), never near-black. Tracks, tyres, shadow
gaps and — above all — contour lines are where this goes wrong.

LIGHT: a single sun from the UPPER LEFT, roughly 130 degrees (light comes
from the top-left, shadows fall to the lower right). Soft key light, gentle
ambient fill, no rim light, no lens flare, no glow, no bloom.

MATERIALS: only three families — (a) painted steel and gunmetal, (b) glass,
optics and energy (glowing lenses, coils, coolant), (c) rubber, tracks and
canvas. No chitin, no stone, no wood, no crystal.

COLOUR: desaturated base with ONE saturated accent per object. Mid-tones —
no pure black anywhere, no pure white. Overall value sits in the middle of
the range, neither a dark nor a bright silhouette.

BACKGROUND: fully transparent. No ground, no shadow, no platform, no frame,
no vignette, no text, no logo, no watermark.

MARGIN: leave at least 5 percent empty transparent margin on all four sides.
Nothing — not a barrel tip, not an antenna — may touch the edge of the
canvas.
```

**Warum jede Zeile dort steht — jede ist gemessen:**

| Zeile | Grund | Messstelle |
|---|---|---|
| „single sun, upper left, ~130°" | Das Spiel wirft **jeden** Schatten aus `LICHT` = **−128°**. Heute streuen die Gegner von 1° bis 66° daneben | `npm run grafik`, „Lichtrichtung" |
| „no rim light" | Das Randlicht **backt das Spiel selbst** (v156). Ein mitgeliefertes wäre doppelt und käme aus der falschen Richtung | `npm run einbettungstor` |
| „calm surfaces, no noise" | Figuren tragen heute **5,1-mal** so viel Feindetail wie der Untergrund (12,4 gegen 2,45), erlaubt sind 3,0, im Zielbild sind es 2,1. Filtern hilft nicht — es kostet die Form | `npm run grafik`, Befund B1 · `npm run probebild` misst es seit v205 am Kandidaten |
| „no pure black" | Reines Schwarz höchstens 2 % der Fläche | `npm run grafik` |
| „mid-tones" | Figuren-Helligkeit muss im Band **0,33–0,40** liegen, Sättigung **0,35–0,45** | `npm run grafik` |
| „transparent, no shadow" | Schatten, Sonnenanstrich, Bodenverschattung und Farbklima trägt das Spiel je Karte auf | `npm run einbettungstor` |
| „reads at 40 pixels" | Die kleinste Figur wird mit 17 Bildschirmpunkten gezeichnet | `npm run lesbarkeit` |
| „tracks as two dark bands" | Ausmodellierte Kettenglieder sind bei 40 px unsichtbar und treiben nur die Dichte | `npm run probebild` |
| „no outlines" | Die zweite Probelieferung war cel-shaded mit harter Kontur um jedes Teil und lag bei **14,3 – 25,2 %** reinem Schwarz. Bei 17 bis 40 Bildschirmpunkten wird eine 3-px-Kontur zum halben Gegner | `npm run probebild` |
| „no black, dark grey" | Erste Lieferung **6,7 – 10,9 %**, zweite **14,3 – 25,2 %**, heutiger Bestand 0,0 % | `npm run probebild` |
| „5 percent margin" | Alle acht Kandidaten der Probelieferung berührten den Kachelrand | `npm run probebild` |

---

## 1b. Der Ausgabe-Block — für **Kartenbilder**, wörtlich ans Ende jedes Prompts

**Warum eigens.** Der Stil-Block sagt, wie ein Bild aussehen soll; er sagt
nichts darüber, in welcher Form es ankommen muss. Genau daran ist bisher Zeit
verlorengegangen: ein Bild im Chatfenster ist kein Bild auf der Platte, und
was nicht als Datei ankommt, kann nicht gemessen werden.

Er gilt nur für die **Kartenbilder** (Abschnitte 8b und 8c). Figuren und
Türme haben andere Maße; ihre Angaben stehen in Abschnitt 2 und 3.

```
OUTPUT AND DELIVERY — read this as carefully as the rest.

FORMAT: PNG. Not JPEG, not WebP — the file is re-encoded later, and JPEG
artefacts would be baked in twice.

ASPECT RATIO: exactly 16:9. This is a hard requirement and the most common
reason a delivery is rejected on arrival: the image is stretched onto a 16:9
field, so 3:2 or 4:3 arrives visibly distorted. 2400 x 1350 pixels is the
target size; anything from 1920 x 1080 upwards is fine as long as the ratio
is exactly 16:9. Do not upscale a smaller render to reach the number.

FULL BLEED: the terrain fills the entire canvas. No frame, no border, no
rounded corners, no matte, no drop shadow around the image, no letterboxing.

NOTHING ADDED: no caption, no title, no watermark, no signature, no scale
bar, no grid, no compass rose, no legend, no colour-check patch.

FLAT LIGHTING ACROSS THE CANVAS: no vignette, no corner darkening, no
spotlight in the centre. The corners must be as bright as the middle. The
game lays its own atmospheric layer over the picture; a baked one would sit
on top of it twice.

ONE IMAGE PER REQUEST: deliver a single image, not a grid of variants and not
a sheet with several options. If you want to offer alternatives, produce them
one after another, each as its own full-size file.

DELIVER IT AS A DOWNLOADABLE FILE at full resolution — not as an inline
preview, not cropped, not resized to fit a chat window.
```

---

## 2. Technische Grundregeln für **alle** Dateien

* **PNG mit echtem Alphakanal.** Kein Hintergrund, keine Matte, kein
  weißer Rand um die Silhouette.
* **Quadratisch 256 × 256** — mit einer Ausnahme: `waffe_arrow.png` (siehe
  4.3) darf rechteckig sein.
* **Kein eingebackener Schatten, kein Glühen, kein Randlicht.**
* **Kein Text, keine Zahlen, keine Abzeichen mit Schrift.** Symbole ja,
  Buchstaben nein — sie sind bei 40 px Matsch.
* **Farbe niemals als einziges Unterscheidungsmerkmal.** Zwei Gegner müssen
  sich an der **Form** unterscheiden lassen, nicht nur am Ton.

---

## 3. Die Kachel-Geometrie — **das wird am häufigsten falsch gemacht**

### 3.1 Gegner: Aufsicht, Nase nach OBEN

Alle acht Gegner sind **reine Aufsichten** (top-down, Kamera senkrecht von
oben). Das Spiel dreht jede Figur in ihre Laufrichtung:
`ctx.rotate(heading + π/2)`.

* **Im Bild blickt die Figur nach OBEN** (12 Uhr).
* Eine Seitenansicht oder Dreiviertelansicht ist **unbrauchbar** — sie steht
  im Spiel auf dem Kopf, sobald der Gegner nach links läuft.
* Kein sichtbarer Horizont, keine Perspektive nach hinten. Was von oben nicht
  zu sehen wäre, ist nicht im Bild.

### 3.2 Die Breite quer zur Laufrichtung ist begrenzt

Die engste Straße ist **80 Weltpunkte** breit. Eine Figur, die breiter wird,
ragt über den Weg.

**Deshalb gilt je Datei eine harte Obergrenze für die *waagerechte*
Ausdehnung im Bild** (die Tabelle in Abschnitt 5 nennt sie). In
Laufrichtung — also senkrecht im Bild — darf die Figur bis **240 px** lang
sein. Ein Panzer ist länger als breit; das ist erwünscht und kostet nichts.

### 3.2b **Fünf Grundformen — die wichtigste Regel des ganzen Auftrags**

> **Gemessen an der Probelieferung vom 24.08.2026:** acht handwerklich gute
> Aufsichten — und **sieben davon Kettenfahrzeuge**. Die
> Silhouetten-Ähnlichkeit lag bei **0,83** im Mittel, das schlimmste Paar bei
> **0,93**; der heutige Bestand liegt bei 0,49. **25 von 28 Paaren** waren zu
> ähnlich. Bei 17 bis 40 Bildschirmpunkten wäre daraus eine Armee von Klonen
> geworden, unterscheidbar nur an der Farbe — und Farbe darf nie das einzige
> Merkmal sein. Kein einzelnes Bild wäre schuld gewesen.

Die acht Gegner verteilen sich deshalb auf **fünf klar verschiedene
Grundformen**. Sie müssen schon als schwarze Silhouette auseinanderzuhalten
sein:

| Grundform | Was sie ausmacht | Wer |
|---|---|---|
| **Kettenfahrzeug** | zwei durchgehende dunkle Bänder außen, kastiger Rumpf | Koloss |
| **Radfahrzeug** | vier bis sechs einzeln sichtbare Räder, offener/schmaler Rumpf | Späher, Spalter |
| **Läufer** | Beine, die sichtbar vom Rumpf abstehen — kein Band, keine Räder | Leerentitan |
| **Fluggerät** | breite Spannweite, Rotoren oder Flügel, **keine** Bodenberührung | Gleiter |
| **Fußtrupp** | mehrere kleine getrennte Silhouetten statt einer großen | Infanterie |
| **Kleingerät** | eine einzelne kleine kompakte Form ohne Geschützrohr | Schleicher |

**Messbares Ziel:** keine zwei Gegner über **0,65** Silhouetten-Ähnlichkeit.
`npm run probebild -- <ordner>` rechnet es aus, bevor gepackt wird.

**Und ein einfacher Grundsatz, der fast alles davon erledigt:** höchstens
**zwei** der acht Gegner dürfen ein Geschützrohr nach vorn tragen. Das Rohr
ist das Merkmal, das alle Panzer gleich aussehen lässt.

### 3.3 Türme: stehende Dreiviertelansicht — und 16 % vertikal gestreckt

Türme sind **keine** Aufsichten. Sie stehen und werden leicht von schräg oben
gesehen, wie ein Gebäude auf einer Landkarte.

> **Der Fallstrick:** die quadratische Kachel 256 × 256 wird im Spiel auf
> **135 × 156 Weltpunkte** gezeichnet — also **16 % in die Höhe gezogen**.
> Ein im Bild kreisrunder Drehkranz wird im Spiel zur Ellipse, ein im Bild
> schlanker Turm wird schlaksig.
>
> **Konsequenz für den Zeichner:** den Turm **etwa 14 % gedrungener** anlegen,
> als er am Ende wirken soll. Runde Formen im Bild leicht queroval zeichnen.

* Der **Fuß** der Figur sitzt bei 28 % der Bildbreite von unten — dort steht
  der Turm auf dem Boden. Darunter ist nichts.
* Die Figur füllt **86 %** der Kachel.

### 3.4 Der Bogenturm ist zweiteilig

Er ist der einzige Turm mit getrenntem Sockel und Waffe, **je Ausbaustufe
ein Paar**:

* `sockel_bogen_1..6.png` — der Turm **ohne** Waffe, quadratisch, wie 3.3.
* `waffe_bogen_1..6.png` — nur die Waffe, **darf rechteckig sein**, behält
  ihr Seitenverhältnis, **blickt nach OBEN** und dreht sich im Spiel zum
  Ziel.
* **Der Drehpunkt ist die Bildmitte.** Der Nabenbolzen der Waffe muss
  genau dort liegen — waagerecht wie senkrecht. Liegt er woanders, eiert
  die Waffe beim Schwenken um einen Punkt neben sich.
* **Der Sockel braucht einen sichtbaren Drehkranz mit einer Nabe.** Sie
  ist nicht Zierrat: das Spiel setzt die Waffe genau dorthin, und die
  Zahl wird am Bild gemessen (v160: Nabe bei 0,25 der Kachelhöhe, auf
  allen sechs Stufen an derselben Stelle — nur deshalb reicht *eine* Zahl
  für alle sechs).
* Die Waffe wird mit **75 % der Turmbreite** gezeichnet (v160 im Raum
  durchprobiert) und sitzt auf der Nabe.
* Das Mündungsende muss klar erkennbar sein — `npm run muendung` misst es
  **auf jeder gelieferten Stufe**.

> **Fehlende Stufen sind erlaubt.** Findet das Spiel `waffe_bogen_5`
> nicht, nimmt es die nächstniedrigere. Ein Satz darf also Stück für Stück
> wachsen; nur ganz ohne Waffe bleibt die Ebene ungenutzt.

#### Abnahme Paket 1 (v160) — angenommen

Geliefert: `sockel_bogen_1..6`, `waffe_bogen_1..4`. Eingebaut und im Spiel.

| Was | Ergebnis |
|---|---|
| Stil, Sujet | **trifft.** Moderner Bunker mit Drehkranz, Zwillings-Autokanone mit Gurtzuführung. Genau die Absage an das „Bogenschützenzimmer", die bestellt war |
| Drehpunkt | **exakt.** Nabenbolzen auf der Bildmitte, alle vier Waffen |
| Nabe im Sockel | **exakt.** 0,25 der Kachelhöhe auf allen sechs Stufen |
| Streckung | **kein Problem.** Der Kasten der Figur ist breiter als hoch (278 × 217 bei 300 Punkten längster Kante); nach der 16-%-Streckung bleibt er breiter als hoch |
| Läufe | zwei, bei x 0,346 und 0,355 bzw. 0,643 und 0,654 — über alle vier Bilder stabil |
| Reines Schwarz | **3,1 bis 8,6 %**, erlaubt sind 2. Beim Packen mit `schwarzHeben 0,11` gehoben, wie im Gegnersatz |
| Lichtwinkel | Sockel **15° bis 29°** neben der Sonne, Waffen **0° bis 18°**. Innerhalb der Ratsche, aber die Sockel 2, 3, 5 und 6 sind fast von oben beleuchtet statt von oben *links* |
| Rand | Figur berührt in 9 von 10 Bildern den Kachelrand. Beim Packen abgefangen (getrimmt und neu eingepasst), aber am Bild besser |
| Stufen unterscheidbar | **nein.** Silhouetten-Ähnlichkeit **0,95 bis 0,96** zwischen den Sockeln. Bei 60 Bildschirmpunkten sind Stufe 1 und Stufe 6 nicht auseinanderzuhalten. Bei den Waffen ist es besser (Stufe 3 deutlich breiter) |

**Offen aus diesem Paket:** `waffe_bogen_5` und `waffe_bogen_6`. Solange
sie fehlen, zeigen Stufe 5 und 6 die vierte Waffe — der Turm ist
vollständig, aber die beiden teuersten Ausbauten sehen aus wie der
vorletzte.

**Für die nächsten Sockel-Sätze:** die Stufen müssen sich in der
**Silhouette** unterscheiden, nicht nur in der Bestückung. Ein Anbau, der
innerhalb des Umrisses bleibt, ist auf dem Telefon unsichtbar. Zielwert:
höchstens 0,85 Ähnlichkeit zwischen Stufe 1 und Stufe 6.

---

## 4. Die Farbfamilien

### 4.1 Gegner — **eine** Fraktion, Rolle über Akzent (TF-024)

Heute tragen acht Gegner acht unabhängige Bunttöne; keine Familie ist
lesbar. Bestellt wird stattdessen:

**Gemeinsame Basis für alle acht:** dunkles, entsättigtes Gunmetal
(`#3A414C`–`#4E5865`), matt lackiert, mit schwarzen Gummi- und Kettenteilen.

**Der Akzent trägt die Rolle** — Warnstreifen, Leuchtelemente, Markierungen:

| Rolle | Gegner | Akzent |
|---|---|---|
| leicht und schnell | Schleicher, Späher | Signalgelb `#EFC94C` |
| Infanterie | Infanterie | Olivgrün `#7A8A5C` |
| gepanzert | Koloss, Spalter | Stahlblau `#5B8FD0` |
| Luft | Gleiter | Türkis `#3ED9A4` |
| Bruchstück | Span | Blassgelb `#EFE24C` |
| Boss | Leerentitan | Purpur `#8B5CF6` |

> Diese Palette muss beim Einbau auch in `src/data/enemies.ts` (`body`,
> `trim`) nachgezogen werden — das ist Code-Arbeit, nicht Bildarbeit, und
> gehört in dieselbe Runde.

### 4.2 Türme — eine Signaturfarbe je Sorte

| Turm | neue Rolle im Bild | Akzent |
|---|---|---|
| `arrow` | Autokanone, Dauerfeuer | Gold `#F2C14E` |
| `frost` | Kryo-/EMP-Emitter, bremst im Umkreis | Türkis `#7FE7E0` |
| `mortar` | Haubitze, Flächenschaden, **kein Luftziel** | Orange `#F08A3C` |
| `prism` | Laserturm, Kettenblitz | Violett `#B07CFF` |

---

## 5. Die Gegner — acht Dateien

Ablage: `art/roh/gegner/` · je **256 × 256 PNG** · Füllgrad **0,78**
(Silhouette rund **200 px** in der längsten Richtung) · Budget 220 KB
gepackt für alle zusammen.

| Datei | Kennung | waagerecht max. | Rolle im Spiel |
|---|---|---|---|
| `gegner_schleicher.png` | crawler | 200 px | Massegegner, 34 LP, mittleres Tempo |
| `enemy_infantry_topdown.png` | infantry | 200 px | 52 LP, Panzerung 1, langsam |
| `gegner_spaeher.png` | runner | 200 px | 24 LP, **doppeltes Tempo** |
| `gegner_koloss.png` | brute | **200 px** | 150 LP, Panzerung 3, langsam |
| `gegner_gleiter.png` | flyer | 200 px | 62 LP, **fliegt** |
| `gegner_spalter.png` | splitter + splitling | 200 px | 130 LP, zerfällt in 2 |
| `gegner_titan.png` | titan | **170 px** | 682 LP, Panzerung 6, Boss |

> Der Titan ist der einzige mit einer engeren Grenze: seine Kachel ist mit
> 102 Weltpunkten die größte, und bei 0,78 Füllung wäre er exakt so breit wie
> die Straße. Er soll **lang** wirken, nicht breit — bis 240 px in
> Laufrichtung.

### 5.0 Nachbestellung B1 — **die vier lautesten zuerst** (v205)

Befund B1 ist der einzige Punkt des Grafik-Audits, der ohne neue Bilder
nicht zu schließen ist. Er lautet in einer Zahl: **die Figuren tragen
5,1-mal so viel Feindetail wie der Untergrund** (12,4 gegen 2,45). Erlaubt
sind 3,0, im Zielbild sind es 2,1. Nachbearbeitung hilft nicht — Weichzeichnen
und Median senken die Zahl und kosten sichtbar Form (`npm run entrauschprobe`).

**Der heutige Bestand, beide Messstellen** (Regel 12): links das Rohbild auf
Anzeigegröße gerechnet, rechts das gepackte, wie es das Grafiktor sieht. Das
Packen hebt die Dichte um den gemessenen Faktor 1,46 bis 1,88.

| Datei | roh → Anzeige | gepackt | reines Schwarz (roh) |
|---|---|---|---|
| `gegner_span.png` | **11,0** | 16,1 | 1,2 % |
| `gegner_spaeher.png` | **8,3** | 15,1 | 8,7 % |
| `enemy_infantry_topdown.png` | **8,1** | 13,4 | 6,0 % |
| `gegner_gleiter.png` | **7,3** | 13,6 | 1,4 % |
| `gegner_spalter.png` | 6,9 | 13,0 | 5,7 % |
| `gegner_koloss.png` | 6,7 | 11,7 | 4,2 % |
| `gegner_titan.png` | 6,6 | 11,6 | 4,4 % |
| `gegner_schleicher.png` | 6,2 | 10,0 | 6,6 % |

**Bestellt werden zuerst die oberen vier.** Nicht aus Sparsamkeit, sondern
weil eine Lieferung von acht, die den Brief verfehlt, achtmal daneben ist:
vier sind genug, um zu sehen, ob „QUIET TEST" ankommt, und sie sind zugleich
die, die am weitesten außerhalb liegen. Tragen sie, folgen die übrigen vier
im selben Stil.

**Abnahme.** Vor dem Packen `npm run probebild -- <ordner>`:

* **Detaildichte höchstens 3,5** am Rohbild in Anzeigegröße. Unter 3,2 ist
  sicher, über 3,9 sicher zu unruhig; dazwischen entscheidet das Packen.
  Das Werkzeug führt in jedem Lauf eine Nullprobe mit — eine glatte Kachel
  misst 0,0, eine körnige 16,4 —, damit die Spalte nicht stillschweigend
  aufhört zu messen (Regel 13).
* **Reines Schwarz höchstens 2 %.** Der Packer hebt das Schwarz zwar an, aber
  was er anhebt, ist vorher Fläche ohne Zeichnung gewesen.
* **Lichtrichtung höchstens 20° neben −128°**, Silhouetten-Ähnlichkeit unter
  0,65 gegen jede Figur, die heute schon im Spiel steht.
* Danach `npx tsx tools/pack-art.mjs` und `npm run grafik`: dort muss die
  Dichte in Anzeigegröße **unter 6** liegen, Ziel 5,1.

Alles Übrige — Grundform, Rolle, Farbe, Kachelgeometrie — bleibt wie in den
Abschnitten darunter. Die Nachbestellung ändert **nur** die Ruhe der
Zeichnung, nicht das Motiv: ein Späher, den man nicht wiedererkennt, wäre
kein Fortschritt, sondern eine neue Runde.

### 5.1 `gegner_schleicher.png` — Späh-Drohne am Boden

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Kleingerät — eine einzelne kleine kompakte Form, KEIN Geschützrohr.

SUBJECT: A small unmanned tracked scout drone, seen STRICTLY FROM DIRECTLY
ABOVE (orthographic top-down), facing UP toward the top edge of the image.
Compact rectangular hull on two short rubber tracks, a low sensor mast with a
single glowing amber optic at the front, two folded antenna stubs at the
rear. Dark desaturated gunmetal armour with matte finish; signal-yellow
hazard stripe across the front plate and a yellow marking on the hull roof.
No weapon.

FRAMING: silhouette about 200 px wide and 200 px tall inside a 256x256
transparent canvas, centred, nothing cropped.
```

### 5.2 `enemy_infantry_topdown.png` — Infanterietrupp

> **Dieses Bild ist die dringlichste Neulieferung.** Die heutige Infanterie
> füllt ihre Kachel nur zu **0,43** statt 0,78 und wird deshalb als einzige
> Figur mit nur 17 Bildschirmpunkten gezeichnet. Sie ist außerdem mit 42° am
> weitesten von der Sonne beleuchtet und mit 0,0025 Modellierungsstärke die
> flachste Figur im Spiel — eine Größenordnung unter allen anderen.

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Fußtrupp — drei getrennte kleine Silhouetten statt einer großen.
Das ist die einzige Figur im Spiel, die aus mehreren Körpern besteht.

SUBJECT: A squad of THREE modern infantry soldiers moving in a tight wedge,
seen STRICTLY FROM DIRECTLY ABOVE (orthographic top-down), all facing UP
toward the top edge of the image. Helmets, shoulder pads and backpacks are
the dominant shapes from this angle; rifles held forward and clearly
readable. Olive-green fatigues over dark gunmetal plate carriers, olive
helmets with a small yellow unit marking.

IMPORTANT: the three figures together must FILL the frame — the group
spans about 200 px in both directions. Do not draw them small in the middle.

FRAMING: silhouette about 200 px wide and 200 px tall inside a 256x256
transparent canvas, centred, nothing cropped.
```

### 5.3 `gegner_spaeher.png` — leichter Radbuggy

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Radfahrzeug — vier einzeln sichtbare Räder, offener Rahmen, KEIN
Geschützrohr. Muss sich schon als schwarze Silhouette vom Panzer unterscheiden.

SUBJECT: A fast lightweight four-wheeled assault buggy, seen STRICTLY FROM
DIRECTLY ABOVE (orthographic top-down), facing UP toward the top edge of the
image. Open skeletal frame, roll cage, four large knobbly tyres splayed
outward, a small forward-swept nose. Dark gunmetal frame, signal-yellow
panels on the bonnet and roll cage. It must read as FAST: swept, narrow,
leaning forward.

FRAMING: silhouette about 170 px wide and 210 px tall inside a 256x256
transparent canvas, centred, nothing cropped.
```

### 5.4 `gegner_koloss.png` — Kampfpanzer

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Kettenfahrzeug — der EINE klassische Panzer im Spiel. Er darf
aussehen wie ein Panzer, weil kein zweiter so aussieht.

SUBJECT: A modern main battle tank, seen STRICTLY FROM DIRECTLY ABOVE
(orthographic top-down), gun barrel pointing UP toward the top edge of the
image. Wide angular turret with a long smoothbore cannon, sloped composite
armour blocks, two wide tracks, stowage boxes and a commander's hatch on the
turret roof. Heavy, slow, blocky — the silhouette should feel like a brick.
Dark gunmetal armour with steel-blue armour plating and a blue unit chevron
on the turret roof.

FRAMING: silhouette at most 200 px wide (across, left to right) and up to
230 px tall including the barrel, inside a 256x256 transparent canvas,
centred, nothing cropped.
```

### 5.5 `gegner_gleiter.png` — VTOL-Kampfdrohne

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Fluggerät — breite Spannweite, keine Ketten, keine Räder, keine
Bodenberührung. Muss auf den ersten Blick fliegend wirken.

SUBJECT: An armed VTOL gunship drone, seen STRICTLY FROM DIRECTLY ABOVE
(orthographic top-down), nose pointing UP toward the top edge of the image.
Blended-wing fuselage with two large tilted ducted rotors left and right, a
sensor blister at the nose, two small underwing pods. Dark gunmetal hull,
turquoise glowing intake rings and a turquoise stripe along the spine.
It must read as AIRBORNE at a glance: wide wing span, no wheels, no tracks.

FRAMING: silhouette about 210 px wide and 190 px tall inside a 256x256
transparent canvas, centred, nothing cropped.
```

### 5.6 `gegner_spalter.png` — Trägerfahrzeug

> **Nachbestellung v168 — dieses Bild ist zu ersetzen.** Gemessen überdeckt
> sein Umriss den des Koloss zu **0,76**, erlaubt sind 0,65. Beide sind ein
> kastiger Rumpf von rund 200 × 220 px; im auf 64 × 64 normierten Umriss
> fallen Ketten und Räder weg, und übrig bleibt zweimal dasselbe Rechteck.
> **Die Grundformen aus 3.2b stimmten also auf dem Papier und nicht im
> Bild** — sie beschreiben die Oberfläche, entschieden wird am Umriss.
>
> Getragen hat die Unterscheidung bis v167 die Farbe allein. Seit die
> Fraktionsfarben (4.1) alle acht in eine Familie stellen, trägt sie es
> nicht mehr: gemessen liegen Koloss und Spalter nur **7,3** auseinander,
> nötig wären 12, und über die ganze Familie hinweg ist der Wert nicht über
> 9,1 zu bringen. **Die Trennung muss aus der Form kommen.**
>
> Die alte Zeile „ein Bild, zwei Gegner" ist gestrichen: der Span hat seit
> v159 eine eigene Datei.

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Radfahrzeug mit SICHTBAR GETEILTEM Rumpf — kein Geschützrohr,
kein geschlossener Kasten. Der Spalter ist der Gegner, der im Spiel in zwei
Teile zerfällt, und das muss man ihm schon als schwarzer Fläche ansehen.

SUBJECT: An armoured drone carrier, seen STRICTLY FROM DIRECTLY ABOVE
(orthographic top-down), facing UP toward the top edge of the image. The
hull is built as TWO SEPARATE SEGMENTS joined by a narrow central coupling,
like an articulated hauler: a shorter front module carrying the cab and two
wheels on each side, and a longer rear module carrying the open launch
cradle. The waist between the two modules is NARROW — no more than half the
width of either module — so the outline reads as two blocks on a stalk, not
as one box. Six wheels stand clearly PROUD of the hull on both sides, with
visible gaps of empty canvas between them.

The rear cradle is OPEN at the top: two folded drone racks sit in a recess
whose walls break the rectangle of the outline.

NO gun barrel. NO continuous tracks. Nothing that makes the outline a
closed rectangle.

Dark gunmetal, same faction family as the other units, with orange hazard
chevrons around the open cradle.

FRAMING: silhouette about 170 px wide and 230 px tall inside a 256x256
transparent canvas, centred, nothing cropped.
```

**Abnahme — vier Zahlen, alle mit `npm run probebild -- <ordner>` zu prüfen:**

| Größe | Soll | warum |
|---|---|---|
| Umriss gegen `gegner_koloss.png` | **höchstens 0,60** | heute 0,76; 0,65 ist die Grenze, 0,60 der Abstand dazu |
| Umriss gegen `gegner_spaeher.png` | höchstens 0,65 | heute 0,69 — beide sind Radfahrzeuge, die Taille trennt sie |
| leere Fläche im Deckrechteck | **mindestens 35 %** | heute **14 %** — das vollste Rechteck aller acht Gegner. Der Koloss liegt bei 23 %, alle übrigen zwischen 30 und 52 %. Zwei fast massive Rechtecke *müssen* sich stark überdecken; hier liegt die Ursache, nicht in den Rädern |
| Breite der Silhouette | 160–180 px | schmaler als der Koloss (200), sonst hilft die Taille nichts |

### 5.6b `gegner_span.png` — die Drohne, in die der Spalter zerfällt

> **Diese Datei hatte bis v205 keinen Auftrag.** Sie ist seit v159 ein
> eigenes Bild — vorher wurde das des Spalters mitbenutzt —, aber bestellt
> wurde sie nie: sie entstand als Beiwerk der Lieferung v3. Gemessen ist sie
> die **lauteste Figur des ganzen Bestands**: Detaildichte 11,0 roh und 16,1
> gepackt, gegen 6,2 bis 8,3 bei allen anderen. Der Grund liegt auf der Hand,
> sobald man die Messstelle liest: sie füllt ihre Kachel nur zu 93 × 86 von
> 300 Punkten, wird also am stärksten von allen verkleinert — und Verkleinern
> erhöht die Dichte.

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Kleinstgerät — eine einzelne kleine Form, KEIN Fahrzeug, KEIN
Geschützrohr, KEINE Räder. Der Span ist das, was aus einem zerlegten
Trägerfahrzeug herausfällt: eine Wurfdrohne, kein Auto.

SUBJECT: A small disposable attack drone, seen STRICTLY FROM DIRECTLY ABOVE
(orthographic top-down), facing UP toward the top edge of the image. A flat
arrowhead-shaped fuselage with two short swept fins, a single small ducted
rotor recessed into the body, one pale-yellow optic at the tip. It is a
THROWN object, not a driven one: no wheels, no tracks, no cabin.

Because it is drawn very small in the game, it must be built from FOUR
shapes at most: fuselage, two fins, one rotor recess. Anything beyond that is
noise. No panel lines on the fins. No vents.

Dark desaturated gunmetal body, one pale-yellow accent at the tip and along
the leading edge of the fins.

FRAMING: silhouette about 150 px wide and 190 px tall inside a 256x256
transparent canvas, centred, nothing cropped. It fills more of its tile than
today's version — the small figure is the one that suffers most from being
scaled down.
```

**Abnahme — die Zahlen für dieses Bild:**

| Größe | Soll | heute |
|---|---|---|
| Detaildichte roh in Anzeigegröße | **höchstens 3,5** | **11,0** |
| leere Fläche im Deckrechteck | 35 bis 55 % | 48 % |
| Umriss gegen `gegner_gleiter.png` | höchstens 0,65 | beide sind flach und flügelig — hier liegt die Gefahr |
| reines Schwarz | höchstens 2 % | 1,2 % |

### 5.7 `gegner_titan.png` — superschwerer Läufer (Boss)

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Läufer — vier Beine, die sichtbar vom Rumpf abstehen. KEINE Ketten,
keine Räder. Die Beine sind der Grund, warum man ihn sofort erkennt.

SUBJECT: A super-heavy four-legged siege walker, seen STRICTLY FROM DIRECTLY
ABOVE (orthographic top-down), facing UP toward the top edge of the image.
Central armoured body with a heavy multi-barrel turret, four thick
articulated legs folded close to the hull, layered armour skirts. It must
read as the biggest and slowest thing on the field.

CRITICAL PROPORTION: it must be LONG, not WIDE. The legs stay tucked in
close to the body.

Dark gunmetal armour with purple energy conduits along the spine and a
purple glowing core visible through a vent on the back.

FRAMING: silhouette at most 170 px wide (across, left to right) and up to
240 px tall, inside a 256x256 transparent canvas, centred, nothing cropped.
```

---

## 6. Die Türme — 24 Dateien

Ablage: `art/roh/tuerme/` · je **256 × 256 PNG** · Füllgrad **0,86** ·
Budget 620 KB gepackt für alle zusammen.

**Für jeden Turm sechs Ausbaustufen.** Sie sind **eine Familie**: derselbe
Sockel, dieselbe Silhouettenlogik, dieselbe Akzentfarbe. Was wächst, ist
Masse und Bestückung — nicht der Stil.

> **Nicht höher werden lassen.** Die Kachel ist fest; ein Turm, der nach
> oben wächst, wird beim Packen kleiner skaliert und wirkt dadurch auf
> Stufe 6 *kleiner* als auf Stufe 1. Wachsen soll er in die **Breite** und
> in die **Bestückung**.

### 6.1 Die Stufenlogik (gilt für alle vier Türme)

| Stufe | Was dazukommt |
|---|---|
| 1 | Grundstellung: Fundament, Drehkranz, eine Waffe. Schlicht, fast improvisiert |
| 2 | Ein zweites Waffenelement oder ein zweiter Lauf; erste Panzerplatten |
| 3 | Sandsackring oder Betonschürze am Fuß; Munitions-/Energiekasten seitlich |
| 4 | Vollständige Panzerung, ein Sensor- oder Zielmast |
| 5 | Zweite Waffenebene, Kühlrippen oder Kabelbäume, deutlich schwerer |
| 6 | Endstufe: größte Bestückung, Akzentfarbe am stärksten, ein leuchtendes Element |

### 6.2 `sockel_bogen_1..6.png` + `waffe_bogen_1..6.png` — Autokanone

> **Dieser Turm wird NICHT als Ganzbild gebraucht.** Er ist zweiteilig
> (siehe 3.4): ein stehender Sockel und eine Waffe in Aufsicht, die sich
> darüber dreht. `turm_bogen_*.png` wäre eine Datei, die das Spiel nie
> zeichnet. **Sockel 1–6 und Waffen 1–4 sind seit v160 geliefert und
> eingebaut**; offen sind nur `waffe_bogen_5` und `waffe_bogen_6`.

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: The rotating weapon only, of a modern rapid-fire autocannon
emplacement — TOP-DOWN, barrels pointing straight UP the image. Level [5-6]
of six. Twin belt-fed autocannons on a compact turret housing, ammunition
feed chute curving to one side, spent-case deflector. Dark gunmetal steel
with gold-yellow accents (#F2C14E).

Level 5: a second weapon element and cooling ribs, visibly heavier than
level 4. Level 6: the largest fit-out, strongest accent colour, one glowing
element.

PIVOT: a small round hub bolt must sit EXACTLY at the centre of the canvas,
horizontally and vertically. The game rotates this image around that point.
Levels 1 to 4 got this exactly right — keep it.

TWIN BARRELS, SYMMETRIC: two muzzles left and right of the centre line, at
about 0.35 and 0.65 of the image width, both tips on the same top row. The
game takes the LEFT barrel as the muzzle and measures it from the picture.

FRAMING: 1122x1402 transparent PNG, the weapon fills about 92 percent of the
canvas height, at least 5 percent clear margin on every side, nothing
cropped. No base, no ground, no shadow — the pedestal is a separate image.
```

### 6.2b Der alte Ganzbild-Prompt (nur noch für die Silhouette der Sockel)

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A modern rapid-fire autocannon emplacement, seen from a slightly
elevated three-quarter front angle, standing on the ground (NOT top-down).
Level [1-6] of six. A squat armoured pedestal with a rotating ring mount
carrying twin belt-fed autocannons, ammunition feed chutes, spent-case
deflector. Dark gunmetal steel with gold-yellow accent panels (#F2C14E) and
a gold marking band around the pedestal.

PROPORTION WARNING: draw the tower about 14 percent SQUATTER than it should
finally look — the game stretches this square image 16 percent vertically.
Draw circles as slightly wide ovals.

The base sits on the ground at 28 percent of the image height from the
bottom; nothing below it.

FRAMING: the tower fills about 86 percent of a 256x256 transparent canvas,
centred, nothing cropped.
```

#### Abnahme Paket 2 (v163) — angenommen

Geliefert: `turm_moerser_1..6` und `turm_prisma_1..6`, zwölf Ganzbilder.
Eingebaut und im Spiel. **Deutlich sauberer als Paket 1.**

| Was | Mörser | Prisma |
|---|---|---|
| Reines Schwarz (Kandidat) | 2,0–3,2 % | 1,8–3,2 % |
| Lichtwinkel neben der Sonne | 8°–22° | 19°–27° |
| Rand berührt | nirgends | nirgends |
| Silhouetten-Ähnlichkeit Stufe zu Stufe | bis 0,91 | bis 0,90 |
| Stufung im Bild angelegt | **ja** — Sättigung 0,095 → 0,187 | **ja** — 0,190 → 0,273 |

**Kein einziges Bild berührt den Kachelrand** — die beiden `randOk`-Ausnahmen
für Stufe 6, die für die alte Kunst nötig waren, sind entfallen. Eine
Ausnahme, die niemand mehr braucht, versteckt den nächsten echten Fall.

**Die Stufung steckt jetzt im Bild statt in der Backerei.** Die alte Rampe
`farbe 1,00 → 0,72` korrigierte die alte Fantasy-Kunst, deren Sättigung zu
stark stieg. Auf der neuen hätte sie die Steigerung genau flachgezogen: das
Prisma wäre auf Stufe 6 kaum farbiger gewesen als auf Stufe 1. Jetzt eine
Zahl für alle sechs.

**Zwei Mündungen mussten neu gemessen werden**, und das Tor hat es beim
ersten Lauf gemeldet: die alten Punkte lagen auf elf von zwölf Stufen in
der Luft. Das Prisma zielte vorher nach **rechts**, das neue Rohr zeigt
nach links.

**Was auffällt und für Paket 3 gilt:** die Stufen sind einander noch immer
sehr ähnlich (0,90 gegen den Zielwert 0,85), und die neuen Türme sind
**gedrungen und breit**, wo die alten schlank und hoch waren. Das ist kein
Fehler — es ist der Stilwechsel —, aber der Frostturm ist jetzt der letzte,
der noch aus der alten Welt stammt, und er fällt daneben sofort auf.

---

### 6.3 `turm_frost_1.png` … `turm_frost_6.png` — Kryo-Emitter

> **GELIEFERT am 27.08.2026 und eingebaut (v177).** Der Auftrag ist zum
> größten Teil eingelöst: sechs von sechs Sortenpaaren über der Grenze
> wurden **vier**, der schlimmste Wert des ganzen Turmsatzes fiel von 0,76
> auf 0,70, und der Ausbau ist zum ersten Mal wirklich zu sehen (Stufe 1
> gegen 6: 0,72 → **0,48**). Lichtwinkel und Rand sind erledigt.
>
> **Offen bleiben die Stufen 5 und 6** — dort füllt sich das Dreibein wieder
> zu (leere Fläche 63 % → 32 %), und der Wert gegen den Mörser stieg von
> 0,65 auf 0,70. Die Nachbestellung dafür steht in der **Art Bible 5.3**;
> der Prompt unten gilt unverändert weiter, nur eben für zwei Stufen.



**Der letzte fehlende Satz (Stand v170).** Bogenturm, Haubitze und Laserturm
sind geliefert und im Spiel; der Frostturm ist der einzige, der noch aus der
alten Fantasy-Welt stammt.

> **Diese Bestellung wurde in v170 geschärft, und zwar gegen sich selbst.**
> Sie enthielt bis dahin den Satz „*Same squat proportions, same short
> outrigger feet … Only the accent colour and the weapon differ*". Genau das
> ist eingetreten: gemessen überdeckt der heutige Frostturm den Bogenturm zu
> **0,76** (gepackt, im Tor) beziehungsweise **0,79 bis 0,88** (an der
> Kandidatendatei) — das schlimmste von sechs Sortenpaaren, die alle über
> der Grenze liegen. Die Familie darf nicht am **Umriss** hängen. Sie hängt
> an Panzerplatten, Warnschraffen, Grauton und Licht; der Umriss ist das,
> woran der Spieler die Sorte erkennt, und der muss sich unterscheiden.

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A cryogenic area-denial emplacement, seen from a slightly elevated
three-quarter front angle, standing on the ground (NOT top-down). Level [N]
of six. NO gun barrel and NO muzzle — this weapon fires no projectile, it
pulses in a radius. Dark gunmetal grey with ONE accent: turquoise #7FE7E0 on
the coils, the coolant lines and the hazard chevrons on the feet.

THE OUTLINE IS THE POINT — READ THIS BEFORE DRAWING ANYTHING.
The other three towers in this game are all an upright armoured block with
something on top, and measured they are already too alike. This one must NOT
be a block. Build it as a THREE-LEGGED EMITTER:
  - three splayed legs meeting under a raised central hub, with OPEN
    TRANSPARENT GAPS between the legs — a viewer must see background
    through the lower half of the silhouette,
  - the hub sits clearly ABOVE the ground, carried by the legs, not resting
    on a plinth,
  - a wide horizontal ring of emitter coils crowns the hub and OVERHANGS
    the legs on every side, so the silhouette is wide at the top, open in
    the middle and narrow at the feet.
The recognisable shape is therefore an inverted, top-heavy tripod — the
opposite of the squat bunkers. That contrast is the whole job.

WHAT STILL TIES IT TO THE FAMILY (do not drop these):
the same panelled armour plates, the same diagonal hazard stripes on the
feet, the same grey, the same light. The family lives in the SURFACE, never
in the outline.

SILHOUETTE MUST GROW WITH THE LEVEL. Each level must change the OUTLINE,
not only the fit-out — an addition that stays inside the previous outline is
invisible on a phone:
  1  bare: three thin legs, a small hub, one narrow coil ring
  2  a second coil ring widens the crown beyond the legs; first cable loom
     bulging out on one side
  3  a squat radiator fin block cantilevered off the BACK of the hub, so the
     outline stops being symmetric
  4  full armour skirt around the hub and a slanted sensor mast off to one
     side, clearly outside the crown
  5  a second emitter ring lifted above the first on short pillars — the top
     half becomes visibly taller and more open
  6  outer coil crown spreading well beyond the leg footprint, heaviest
     cabling, strongest accent colour

IMPORTANT: on levels 4 to 6 the coils must NOT reach the top edge — the
previous generation was clipped there. Keep 12 percent clearance above.

PROPORTION WARNING: draw the tower about 14 percent SQUATTER than it should
finally look — the game stretches this square image 16 percent vertically.
Draw circles and coil rings as slightly wide ovals.

The feet stand on the ground at 28 percent of the image height from the
bottom; nothing below that line.

FRAMING: 1024x1024 transparent PNG, square. The tower fills about 86 percent
of the canvas, centred, at least 5 percent clear margin on every side —
nothing cropped, not a coil, not a mast tip.
```

#### Die sechs Zahlen, an denen diese Lieferung gemessen wird

`npm run probebild -- <ordner>` sagt in einer Minute, ob sie trägt — **vor**
dem Packen. Daneben steht, was der heutige Frostturm an derselben Messstelle
liefert, damit die Größe der Änderung klar ist:

| Messung | Grenze | Frostturm heute |
|---|---|---|
| Reines Schwarz | höchstens **2 %** der Fläche | 3,4–6,1 % ✗ |
| Lichtwinkel neben der Sonne | höchstens **20°** | bis 44° ✗ |
| Rand berührt | **nie** | 3 von 6 ✗ |
| Silhouette Stufe 1 zu Stufe 6 | höchstens **0,70** | 0,74 ✗ |
| Silhouette gegen jede ANDERE Figur | höchstens **0,60** | 0,79–0,88 ✗ |
| Leere Fläche im Deckrechteck | mindestens **30 %**, auf **jeder** Stufe | Stufe 1: 34 % ✓ · Stufe 3: 29 % · Stufe 6: **18 %** ✗ |

Die letzte Zeile ist neu und sie ist die wichtigste — sie sagt, **warum** der
Frostturm heute mit dem Bogenturm verschmilzt: er **füllt sich beim Ausbau
zu**. Auf Stufe 1 sind noch 34 % seines Deckrechtecks leer, auf Stufe 6 nur
noch 18 %. Damit wird er mit jeder Stufe mehr zu dem, was die anderen drei
schon sind: ein massives Rechteck. Zwei massive Rechtecke überdecken sich
immer stark, ganz gleich was auf sie gemalt ist.

**Der Ausbau muss also nach AUSSEN wachsen, nicht nach innen.** Jede Stufe
fügt etwas hinzu, das über den bisherigen Umriss hinausragt — und die freie
Fläche zwischen den Beinen bleibt frei. Das ist die eine Regel, aus der die
beiden Silhouettenzahlen darüber von selbst folgen.

**Reines Schwarz** entsteht fast immer in Schattenfugen zwischen zwei Platten
und unter Kabeln; der dunkelste Wert im ganzen Bild muss noch als dunkles
Grau lesbar sein. **Der Lichtwinkel** ist die häufigste stille Abweichung:
die Sonne steht auf 10 Uhr, nicht auf 12. Wenn die Oberseite gleichmäßig hell
ist und nur die Unterseite dunkel, kommt das Licht von oben — dann
widerspricht die Figur ihrem eigenen Schatten, den das Spiel nach unten
rechts wirft.

### 6.3b `turm_frost_5.png` + `turm_frost_6.png` — Nachbestellung (v177)

**Nur diese beiden Stufen.** Die Stufen 1 bis 4 sind angenommen und im Spiel;
sie bleiben, wie sie sind. Was an 5 und 6 nicht hält, steht in einer Zahl:
die **leere Fläche im Deckrechteck** fällt von 63 % auf Stufe 1 über 43 % auf
Stufe 5 auf **32 %** auf Stufe 6. Der Emitterkranz wächst so weit, dass er
den Raum zwischen den Beinen zudeckt — und damit wird das Dreibein auf den
Endstufen wieder ein geschlossener Klotz. Gemessen kostet das den Wert gegen
den Mörser: 0,65 → **0,70** bei erlaubten 0,65.

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: The SAME cryogenic three-legged emitter that was delivered for
levels 1 to 4 — same machine, same three splayed legs, same raised hub, same
armour plating, same turquoise #7FE7E0 accent. Only levels 5 and 6 are being
redrawn. Seen from a slightly elevated three-quarter front angle, standing on
the ground (NOT top-down).

WHAT WENT WRONG AND MUST BE FIXED: on the delivered levels 5 and 6 the
emitter crown grew so wide that it covers the space between the legs. The
silhouette closes up and the tower turns back into a solid block — exactly
what the tripod was chosen to avoid. Measured, the empty area inside the
bounding box falls from 63 percent at level 1 to 43 at level 5 and 32 at
level 6.

THE ONE RULE: KEEP THE GAPS OPEN. A viewer must still see background through
the lower half of the silhouette at level 6 — as much of it as at level 3.
The legs stay separate and visible along their whole length; nothing spans
the space between them.

WHERE THE NEW MASS GOES: upward and outward past the existing outline, never
into the middle.
  Level 5: a SECOND emitter ring lifted above the first on three short
    pillars, narrower than the ring below it, so the crown becomes a stack
    rather than a disc. Cooling ribs cantilevered off the back of the hub.
  Level 6: an outer coil crown that spreads beyond the leg footprint as
    separate arcs with GAPS BETWEEN THEM — not a closed disc. Heaviest
    cabling, run along the legs rather than across the opening. Strongest
    accent colour, one glowing element.

The crown may overhang the legs; it must not close the space between them.
Think of a radio telescope on a tripod, not a mushroom cap.

IMPORTANT: the coils must NOT reach the top edge. Keep 12 percent clearance
above.

PROPORTION WARNING: draw the tower about 14 percent SQUATTER than it should
finally look — the game stretches this square image 16 percent vertically.
Draw circles and coil rings as slightly wide ovals.

The feet stand on the ground at 28 percent of the image height from the
bottom; nothing below that line.

FRAMING: 1024x1024 transparent PNG, square. The tower fills about 86 percent
of the canvas, centred, at least 5 percent clear margin on every side —
nothing cropped, not a coil, not a pillar tip.
```

#### Die drei Zahlen, an denen diese Nachbestellung gemessen wird

| Messung | Grenze | Lieferung v177 |
|---|---|---|
| Leere Fläche im Deckrechteck | mindestens **45 %** auf beiden Stufen | Stufe 5: 43 % · Stufe 6: **32 %** ✗ |
| Silhouette gegen den Mörser (Stufe 6) | höchstens **0,60** | **0,70** ✗ |
| Silhouette Stufe 1 gegen Stufe 6 | höchstens 0,70 | 0,48 ✓ — nicht verschlechtern |

Geprüft mit `npm run probebild -- <ordner>`, **bevor** gepackt wird. Die
erste Zahl ist die, aus der die zweite von selbst folgt.

### 6.4 `turm_moerser_1.png` … `turm_moerser_6.png` — Haubitze

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A heavy artillery howitzer emplacement, seen from a slightly
elevated three-quarter front angle, standing on the ground (NOT top-down).
Level [1-6] of six. A wide low platform with recoil spades, a massive
short-barrelled gun elevated steeply upward, a muzzle brake, a shell rack of
visible rounds beside the breech. It must read as a GROUND weapon — this
tower cannot hit aircraft. Dark gunmetal with orange (#F08A3C) accent panels
and orange-black hazard stripes on the recoil spades.

PROPORTION WARNING: draw the tower about 14 percent SQUATTER than it should
finally look — the game stretches this square image 16 percent vertically.

The base sits on the ground at 28 percent of the image height from the
bottom; nothing below it.

FRAMING: the tower fills about 86 percent of a 256x256 transparent canvas,
centred, nothing cropped.
```

### 6.5 `turm_prisma_1.png` … `turm_prisma_6.png` — Laserturm

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A directed-energy laser tower, seen from a slightly elevated
three-quarter front angle, standing on the ground (NOT top-down). Level [1-6]
of six. A slender armoured column carrying a gimbal-mounted lens array of
stacked focusing optics, heat-sink fins down the sides, thick power conduits
running into the base. Dark gunmetal with violet (#B07CFF) glowing lens
elements and violet light in the conduits.

The lens array is the recognition feature and must stay the brightest thing
on the tower.

PROPORTION WARNING: draw the tower about 14 percent SQUATTER than it should
finally look — the game stretches this square image 16 percent vertically.

The base sits on the ground at 28 percent of the image height from the
bottom; nothing below it.

FRAMING: the tower fills about 86 percent of a 256x256 transparent canvas,
centred, nothing cropped.
```

### 6.6 `turm_flak_1.png` … `turm_flak_6.png` — Flakstellung (der fünfte Turm)

**Noch nicht im Spiel.** Diese Bestellung geht der Umsetzung voraus, weil ein
fünfter Turm ohne Bildsatz vom Rauchtest als fehlend gemeldet wird — der Code
kann erst folgen, wenn die Bilder da sind.

> **Er trifft Luft *und* Boden, nicht nur Luft** — und das ist gemessen, nicht
> gemeint. Das Rückstandsverzeichnis hatte ihn als reinen Luftabwehrturm
> notiert. Nachgezählt fliegen aber nur **3,8 % (Frostspalte) bis 14,0 %
> (Spiralhain) der Lebenspunkte**, und nur 3 bis 6 von 15 Wellen enthalten
> überhaupt etwas Fliegendes. Ein Turm, der nur Luft trifft, stünde zwei
> Drittel des Spiels nutzlos herum — ein Fehlkauf, kein Turm. Für das Bild
> ändert das nichts: eine Flak ist eine Flak. Für die Zahlen steht die
> Entscheidung offen (C16 im Rückstandsverzeichnis).

**Und er ist die erste Lieferung unter den Formregeln aus Art Bible 5.2.**
Die vier vorhandenen Türme überdecken sich untereinander alle über 0,65 —
dieser hier darf das Feld nicht noch enger machen. Sein Umriss ist deshalb
Teil der Bestellung, nicht Zugabe.

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A mobile anti-air flak position, seen from a slightly elevated
three-quarter front angle, standing on the ground (NOT top-down). Level [N]
of six. Dark gunmetal grey with ONE accent: warm amber #F2B03C on the
ammunition feeds, the tracer-loaded belts and the hazard chevrons.

THE OUTLINE IS THE POINT — READ THIS BEFORE DRAWING ANYTHING.
The four towers already in this game are all an upright armoured block with
something on top, and measured they are far too alike. This one must read as
a different KIND of object even as a black shape:
  - a LOW, WIDE flat platform — clearly broader than it is tall, the
    opposite of the squat towers, which are as tall as they are wide,
  - four outrigger jacks pushed out to the corners, with OPEN TRANSPARENT
    GAPS between them and the platform body,
  - twin barrels ELEVATED steeply skyward at roughly 60 degrees, reaching
    diagonally out of the top-right of the silhouette — this diagonal is the
    single most recognisable thing about the tower and no other tower in the
    game has one,
  - an ammunition drum standing PROUD of the platform on the left side,
    balancing the diagonal.
The shape to aim for is a wide, low base with one strong diagonal leaving it.

WHAT STILL TIES IT TO THE FAMILY (do not drop these):
the same panelled armour plates, the same diagonal hazard stripes on the
jacks, the same grey, the same light. The family lives in the SURFACE, never
in the outline.

SILHOUETTE MUST GROW WITH THE LEVEL — an addition that stays inside the
previous outline is invisible on a phone:
  1  bare: single barrel, two jacks, a small open drum
  2  twin barrels side by side; the second jack pair folds out
  3  a radar dish cantilevered off the LEFT rear, breaking the symmetry
  4  full armour skirt on the platform and a taller ammunition tower on the
     left, clearly outside the previous outline
  5  a second barrel pair mounted ABOVE the first on a raised trunnion — the
     diagonal doubles and thickens
  6  the largest fit-out: four barrels, the radar dish grown to a wide flat
     panel, heaviest belts, strongest accent colour

NO ground clutter, NO shell casings, NO crew figures — nothing that is not
part of the machine.

PROPORTION WARNING: draw the tower about 14 percent SQUATTER than it should
finally look — the game stretches this square image 16 percent vertically.

The jacks stand on the ground at 28 percent of the image height from the
bottom; nothing below that line.

FRAMING: 1024x1024 transparent PNG, square. The tower fills about 86 percent
of the canvas, centred, at least 5 percent clear margin on every side —
nothing cropped, not a barrel tip, not the radar dish.
```

#### Die sechs Zahlen, an denen diese Lieferung gemessen wird

`npm run probebild -- <ordner>` prüft alle sechs, **vor** dem Packen:

| Messung | Grenze | woher |
|---|---|---|
| Reines Schwarz | höchstens **2 %** der Fläche | Art Bible 2 |
| Lichtwinkel neben der Sonne | höchstens **20°** | Art Bible 1 |
| Rand berührt | **nie** | sonst beschneidet das Packen |
| Silhouette Stufe 1 zu Stufe 6 | höchstens **0,70** | Art Bible 5.2 |
| Silhouette gegen **jede** vorhandene Figur | höchstens **0,60** | Art Bible 5.2 — hier zählt vor allem der Bogenturm-Sockel |
| Leere Fläche im Deckrechteck | mindestens **35 %**, auf jeder Stufe | die offenen Ecken zwischen den Jacks und unter der Rohrdiagonale bringen sie |

Die letzte Zeile ist die, aus der die vorletzte von selbst folgt: die vier
vorhandenen Türme sind massive Rechtecke, und zwei massive Rechtecke
überdecken sich immer stark. Eine niedrige, breite Plattform mit einer
Diagonale und offenen Ecken ist das Gegenteil davon.

### 6.7 `turm_bann_1.png` … `turm_bann_6.png` — Bannturm (der sechste Turm)

**Noch nicht im Spiel, und aus demselben Grund wie die Flak:** ein kaufbarer
Turm steht in `TOWER_ORDER`, und `tools/smoke.ts:1607` meldet dann
„Turmbild fehlt". Ein vorhandenes Bild mitzubenutzen scheidet aus —
`npm run lesbarkeit` misst die Silhouetten **untereinander** und käme auf
1,00 gegen eine Grenze von 0,65.

> **Er schießt nicht.** Das ist keine Sparsamkeit, sondern der Punkt: er gibt
> jedem Turm im Umkreis mehr Feuerrate und verändert damit, *wohin* man baut,
> statt *wieviel* man schießt. Der Referenzabgleich steht in
> `docs/Towerfront-ABGLEICH-STUETZTURM.md`, und die Wette ist gemessen: ein
> Umkreis von 190 fasst im unbedacht gebauten Feld **2,2** Türme, im
> absichtlich gebauten **5,3** — Faktor 2,4. Für das Bild heißt das: **kein
> Rohr, keine Mündung, nichts, was zielt.** Ein Turm, der wie ein Geschütz
> aussieht und nicht schießt, ist ein Fehler im Bild, nicht im Code.

**Sein Umriss muss der leichteste des Satzes sein.** Die vorhandenen fünf
sind alle massive Blöcke oder eine Plattform mit Rohr. Dieser hier ist ein
offener Rahmen — und das ist zugleich die Aussage über seine Rolle.

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A support beacon — a signal mast that empowers nearby machines and
carries no weapon of any kind. Seen from a slightly elevated three-quarter
front angle, standing on the ground (NOT top-down). Level [N] of six. Dark
gunmetal grey with ONE accent: cold signal cyan #6FE3D2 in the resonator
rings, the cable runs and the pulse markings.

THE OUTLINE IS THE POINT — READ THIS BEFORE DRAWING ANYTHING.
Every other tower in this game is a solid armoured mass. This one is mostly
AIR. It must read as:
  - a NARROW three-legged mast — clearly taller than it is wide, the
    opposite of the wide flak platform and of the squat block towers,
  - LARGE OPEN GAPS between the three legs: the background must be visible
    straight through the middle of the tower,
  - a ring — an open torus, not a disc — held aloft at the top, its hole
    clearly transparent,
  - a small instrument housing low down between the legs, the only solid
    volume in the whole figure.
The shape to aim for is a slender open tripod carrying a floating ring.

FORBIDDEN, and this is the one rule that outranks all others here:
NO barrel, NO muzzle, NO gun, NO launcher, NO turret head, NO aiming device,
NO ammunition, NO shell, NO missile. Nothing that could be mistaken for a
weapon from any angle. This machine emits, it does not fire.

WHAT STILL TIES IT TO THE FAMILY (do not drop these):
the same panelled armour on the housing, the same diagonal hazard stripes at
the foot of each leg, the same grey, the same light. The family lives in the
SURFACE, never in the outline.

SILHOUETTE MUST GROW WITH THE LEVEL — an addition that stays inside the
previous outline is invisible on a phone:
  1  bare: three thin legs, a small open ring, no housing detail
  2  the ring thickens into a segmented band; three short cable runs appear
  3  a SECOND, smaller ring set at an angle above the first — the silhouette
     gains a diagonal it did not have
  4  the legs gain outward-braced struts, clearly outside the previous
     outline, and the housing grows a panelled shoulder
  5  a third ring; the whole mast grows taller and the top splays outward
  6  the largest fit-out: three rings on a splayed crown, heaviest cabling,
     strongest accent — still with open air through the middle

NO ground clutter, NO crew figures, NO effects, NO glow painted into the
image — the game bakes all light itself.

PROPORTION WARNING: draw the tower about 14 percent SQUATTER than it should
finally look — the game stretches this square image 16 percent vertically.

The three feet stand on the ground at 28 percent of the image height from
the bottom; nothing below that line.

FRAMING: 1024x1024 transparent PNG, square. The tower fills about 86 percent
of the canvas, centred, at least 5 percent clear margin on every side —
nothing cropped, not a leg tip, not the top ring.
```

#### Die sechs Zahlen, an denen diese Lieferung gemessen wird

`npm run probebild -- <ordner>` prüft alle sechs, **vor** dem Packen:

| Messung | Grenze | woher |
|---|---|---|
| Reines Schwarz | höchstens **2 %** der Fläche | Art Bible 2 |
| Lichtwinkel neben der Sonne | höchstens **20°** | Art Bible 1 |
| Rand berührt | **nie** | sonst beschneidet das Packen |
| Silhouette Stufe 1 zu Stufe 6 | höchstens **0,70** | Art Bible 5.2 |
| Silhouette gegen **jede** vorhandene Figur | höchstens **0,55** | schärfer als bei der Flak: dies ist der sechste Turm, und der Satz ist schon eng |
| Leere Fläche im Deckrechteck | mindestens **55 %**, auf jeder Stufe | die höchste Anforderung im ganzen Auftrag — sie ist die Aussage über die Rolle |

Die letzte Zeile trägt die vorletzte: ein offener Dreibeinmast mit einem Loch
in der Mitte kann sich mit einem massiven Block gar nicht stark überdecken.
Wer die 55 % erreicht, hat die 0,55 geschenkt.

---

## 7. Die Objekte — vier Dateien

Ablage: `art/roh/objekte/` · **256 × 256 PNG** · Füllgrad **0,92** ·
Budget 320 KB.

### 7.1 `kristall.png` — der Herzkristall (das zu verteidigende Ziel)

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A fortified command bunker and reactor — the objective the player
defends. Seen from a slightly elevated three-quarter front angle, standing on
the ground (NOT top-down). A low circular concrete redoubt with blast walls,
antenna masts and radar dishes, and at its centre a tall glowing energy core
rising out of an armoured housing. Dark concrete and gunmetal, cyan-white
glowing core, cyan light spilling onto the surrounding walls.

It must read as PRECIOUS and IMPORTANT — the largest, most detailed
structure in the game — but it must NOT be brighter than the towers around
it at a glance.

FRAMING: fills about 92 percent of a 256x256 transparent canvas, centred,
nothing cropped.
```

#### Abnahme (v164) — angenommen, und der Auftrag hatte unrecht

Geliefert wurde eine **Ringstation in Aufsicht** — acht Geschütztürme nach
außen, ein leuchtender Kern in der Mitte, hohle Öffnung. Der Auftrag oben
verlangt eine *stehende Dreiviertelansicht*. **Die Lieferung ist trotzdem
die bessere Lösung**, und zwar aus einem Grund, den der Auftrag nicht kannte:
jede Karte bringt am Ziel eine **gemalte Rundplattform** mit, und die liegt
in der Kartenebene. Ein Ring liegt darauf, statt darauf zu stehen — und der
türkise Schein der Platte scheint durch seine hohle Mitte. Das ist kein
Zufallstreffer, aber ein glücklicher.

| Messung | Wert |
|---|---|
| Lichtwinkel neben der Sonne | **4°** — der beste Wert aller Lieferungen |
| Reines Schwarz (Kandidat) | 8,9 % — der schlechteste Wert aller Lieferungen |
| Rand berührt | ja, auf allen vier Seiten |
| Detaildichte | 7,9 |

**Zwei Dinge im Code mussten mit**, beide von derselben Art wie der
Turmschatten in v160 — eine Zahl, die zu einer Figur gehörte, die es nicht
mehr gibt:

* **Der Sitz.** `0,74` des Bildes lagen über dem Zielpunkt: richtig für
  einen hohen Bau, der auf der Platte *steht*. Die Aufsicht *liegt*, ihre
  Mitte ist ihr Auflagepunkt. Mit 0,74 schwebte sie 90 Weltpunkte über
  ihrem eigenen Kontaktschatten. Jetzt 0,5.
* **Der Schatten.** Zwei von Hand gemalte Ellipsen, für einen geschlossenen
  Bau gedacht, lagen als dunkle Scheibe mitten im hohlen Ring. Ersetzt
  durch den Schatten aus dem **Umriss** — dieselbe Antwort wie bei den
  Türmen, und sie gilt für jede Form.

**Für einen künftigen Ersatz gilt deshalb:** eine Aufsicht ist beim
Herzkristall erlaubt und sogar erwünscht, solange sie auf der Plattform
aufliegt und eine Mitte hat, die Licht durchlässt oder selbst leuchtet.
Was bleibt: **kein reines Schwarz** und **5 % Rand**.

---

### 7.2 `tor.png` — das Spawn-Tor der Angreifer

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A breach point where enemy forces enter the map — a torn-open
armoured blast gate in a concrete revetment, seen from a slightly elevated
three-quarter front angle. Twisted steel doors forced outward, rubble at the
threshold, warning lamps still burning. Dark concrete and rusted gunmetal
with red-orange warning lights.

CALM: the previous version of this asset measured a detail density of 15.6
against an allowed 3.0. Keep the interior of the gateway a simple dark
opening — no swirling energy, no particles, no debris cloud.

FRAMING: fills about 92 percent of a 256x256 transparent canvas, centred,
nothing cropped.
```

### 7.3 `sockel_arrow.png` — Bogenturm-Sockel ohne Waffe

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: The pedestal of a rapid-fire autocannon emplacement WITHOUT its
weapon — an empty rotating ring mount on top. Seen from a slightly elevated
three-quarter front angle, standing on the ground (NOT top-down). Squat
armoured base, access ladder, ammunition boxes, cable runs, and a bare
circular turret ring at the top waiting for a gun. Dark gunmetal with
gold-yellow (#F2C14E) accent panels.

The turret ring must be clearly visible and centred horizontally — a
separate weapon image is mounted onto it and rotates there.

PROPORTION WARNING: draw about 14 percent SQUATTER than it should finally
look — the game stretches this square image 16 percent vertically. Draw the
turret ring as a slightly WIDE oval, not a circle.

FRAMING: fills about 92 percent of a 256x256 transparent canvas, centred.
```

### 7.4 `waffe_arrow.png` — die drehbare Waffe

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A twin-barrelled belt-fed autocannon assembly ONLY — no pedestal, no
base, no ground. Seen STRICTLY FROM DIRECTLY ABOVE (orthographic top-down),
barrels pointing UP toward the top edge of the image. Two parallel barrels
with a muzzle brake, a compact receiver housing between them, an ammunition
belt curving in from the rear left, a small optical sight on top. Dark
gunmetal with gold-yellow (#F2C14E) accents.

CRITICAL: this image rotates around ITS OWN CENTRE to aim. Place the pivot
point — the centre of the receiver housing — exactly at the centre of the
image. The barrels extend upward from there, the ammunition feed downward,
so the assembly is roughly balanced around the middle.

The muzzle end must be unmistakable — a measurement tool locates it.

FRAMING: this file MAY be rectangular. Recommended 256 wide x 320 tall,
transparent, the assembly filling the frame, nothing cropped.
```

---

## 8. Die Untergründe — drei Dateien

Ablage: `art/roh/untergrund/` · **2400 × 1350 PNG** · Budget 700 KB.

> **Überholt seit v211 — die gültige Bestellung steht in Abschnitt 8b.**
> Dieser Abschnitt hier beschrieb den Stilwechsel und sagte über die Straße
> nur „breit und lesbar". Genau das hat nicht gereicht: gemessen liegen von
> der gemalten Straße des Spiralhains nur 38 % an einer benutzten Bahn, und
> vom Bahnschlauch nur 51 % auf gemalter Straße. Ein Prompt beschreibt eine
> Stimmung, keine Geometrie — 8b legt ein Referenzblatt bei. Der Block hier
> bleibt als Beleg dafür stehen, was zu wenig war; bestellt wird nach 8b.
>
> Die Bänder gelten unverändert: Helligkeit **0,30–0,36**, Sättigung
> **0,45–0,55**, Detaildichte **1,5–3,0**.

| Datei | Kennung | Was |
|---|---|---|
| `12_laubbreit.png` | spiralhain | Laubwald, breite befestigte Wege |
| `13_aschebreit.png` | ascheschlucht | Aschefeld mit Glutrissen, breite Wege |
| `11_frostbreit.png` | frostspalte | Frostebene, breite Wege, eine Kreuzung |

```
[STYLE-BLOCK EINFÜGEN — aber OHNE die Zeile "BACKGROUND: transparent"]

SUBJECT: A top-down battlefield terrain map, 2400x1350, seen straight from
above. [BIOM]. A broad light-coloured road network of packed earth and
concrete runs across the map with generous width and clear edges; the road
must be the single most readable feature. Somewhere on the road, a wide
circular paved platform of the same material — a staging pad — clearly
distinguishable from an ordinary road junction.

CALM: this is a background. Detail density must stay LOW — large soft areas,
gentle variation, no busy foliage texture, no small scattered debris. The
figures that walk on it carry the detail.

No units, no vehicles, no buildings, no towers, no text, no grid, no
vignette, no border.
```

---

## 8b. Nachbestellung D28-C — **drei Kartenbilder mit genau der Straße, die das Spiel benutzt** (v211)

> **Zurückgestellt seit v214 — die gültige Bestellung steht in Abschnitt 8c.**
> Der Grund ist kein Mangel dieses Auftrags, sondern eine Einsicht: das Spiel
> kann den Weg **selbst zeichnen**, und dann kann er gar nicht woanders
> liegen als die Bahn. Ein Bild, das keine Straße mitbringt, ist außerdem
> ungleich leichter zu treffen — es gibt keine Geometrie zu befolgen.
> Dieser Abschnitt bleibt vollständig stehen: er ist die Rückfalllinie,
> falls der gezeichnete Weg im Spiel doch nicht überzeugt. Solange
> `bildBringt.weg` auf `false` steht, gilt 8c.

Der Befund, der 8b ausgelöst hat, gilt unverändert weiter:

**Der Befund, der sie auslöst — alles gemessen, nichts geschätzt:**

| Was | Gemessen | Womit |
|---|---|---|
| Anteil der gemalten Straße, an dem wirklich eine Bahn läuft | **Spiralhain 38 %**, Ascheschlucht 75 %, Frostspalte 70 % | `npm run wegdeckung` |
| Anteil des Bahnschlauchs, der auf gemalter Straße liegt | **43,9 – 51,5 %** | `npm run bahntreue` |
| Anteil des Schlauch**rands**, der auf gemalter Straße liegt | **11,1 – 20,0 %** | `npm run bahntreue` |
| Breite der gemalten Straße | rund **60 Weltpunkte** | `npm run bahnsuche` |
| Breite, die die Bahn braucht | **80 bis 162 Weltpunkte** | `npm run wegvorlage` |
| Breiteste Gegnerfigur | **55 Weltpunkte** | `npm run gedraenge` |

Die gemalte Straße ist also **schmaler als der Weg, auf dem die Gegner
laufen**, und ein gutes Stück davon führt überhaupt nirgendwohin. Beides ist
mit Code nicht zu beheben: eine Bahn durch das gemalte Netz zu legen wurde in
v209 und v210 versucht und scheiterte an der Waage (siehe D28-A im
Rückstandsverzeichnis).

### Das Referenzblatt gehört zwingend dazu

`npm run wegvorlage` erzeugt je Karte ein Blatt in `bilder/vorlage-<kennung>.png`:

* **helles cremefarbenes Band** — hier muss Straße sein, **und nirgends sonst**.
  Es ist der Bahnschlauch in voller Breite, nicht eine Skizze davon.
* **gedämpftes Band daneben** — die 30 Weltpunkte Bausperre. Darf Gelände
  sein, darf aber nicht wie eine zweite Straße aussehen.
* **blauer Ring** — dort gehört die gepflasterte Rundplattform hin.
* **rote Ringe** — unwegsame Flecken; sie müssen im Bild als unwegsam
  erkennbar bleiben (Fels, Wasser, Glutriss, Schneeverwehung).
* der abgedunkelte Untergrund darunter ist die **heutige** Karte: das Biom
  bleibt, die Straße nicht.

**Die Kante des Bandes darf geglättet werden, die Breite nicht.** Das Band ist
aus Kreisen zusammengesetzt und deshalb leicht wellig; wer es zu einer weichen
Straße glättet, tut das Richtige — solange er nirgends unter die gezeigte
Breite geht.

### Abnahme — was grün sein muss, bevor das Bild eingebaut wird

> **`npm run kartenprobe -- <datei> <kennung>` misst einen Kandidaten,
> bevor er gepackt wird** — Mitte, Schlauch, Rand und Nutzung in einem Lauf,
> gegen genau die Zahlen aus der Tabelle unten. Es **liest sie von hier**,
> sie stehen also nicht zweimal da. `--bestand` misst den heutigen Vorrat:
> er fällt durch, und das ist der Grund für diese Bestellung.

| Prüfung | Heute | Gefordert |
|---|---|---|
| `npm run bahntreue` Mitte | 80,1 – 100 % | **≥ 99 %** |
| `npm run bahntreue` Schlauch | 43,9 – 51,5 % | **≥ 90 %** |
| `npm run bahntreue` Rand | 11,1 – 20,0 % | **≥ 75 %** |
| `npm run wegdeckung` benutzte Straße | 38 / 75 / 70 % | **≥ 90 %** je Karte |
| `npm run zielplatte` | grün | grün — Rundplatte am blauen Ring |
| `npm run gelaendetor` | grün | grün — jeder rote Ring bleibt unwegsam |
| Helligkeit / Sättigung / Detaildichte | im Band | **0,30–0,36 / 0,45–0,55 / 1,5–3,0** |

Danach ist **D28-D** fällig (Bauen auf gemalter Straße verbieten). Heute
kostete das 12 Punkte bebaubare Fläche, nach dieser Lieferung nichts mehr —
weil dann keine Straße mehr gemalt ist, auf der niemand läuft.

Ablage: `art/roh/untergrund/` · **2400 × 1350 PNG** · Budget 700 KB je Datei.

### 8b.1 `12_laubbreit.png` — Spiralhain, Laubwald

Referenzblatt: `bilder/vorlage-spiralhain.png` · **eine** Bahn, 1547
Weltpunkte, Straßenbreite 80 bis 162 Weltpunkte.

```
[STYLE-BLOCK EINFÜGEN]

IGNORE the BACKGROUND and MARGIN lines of the style block: this is a
full-bleed terrain map, not a cut-out asset. It has no transparency and no
margin; the terrain runs to all four edges.

SUBJECT: A top-down battlefield terrain map, 2400x1350, seen straight from
directly above — no perspective, no horizon, no sky. Temperate deciduous
forest floor in late summer: leaf litter, moss, scattered broadleaf canopy,
a few fallen trunks, low undergrowth.

THE ROAD — this is the part that has been wrong three times, read it twice.
A reference sheet accompanies this order. The pale cream band on it is the
road. Paint a road of packed earth and concrete EXACTLY along that band,
edge to edge, and paint NO OTHER ROAD ANYWHERE on the map. One single
continuous route, entering at the bottom edge, winding to the paved circle.
Every other part of the map is forest floor.

The road is WIDE: about one twentieth of the image width at its narrowest,
wider at the bends. It is the single most readable feature of the image, and
it must be unmistakably lighter than the forest floor around it — a viewer
must never have to wonder whether a given patch is road or ground.

Its edges are soft and organic (verge, gravel spill, tyre ruts), not a
stencil line — but its WIDTH must never fall below what the reference sheet
shows.

THE PAD: at the end of the road, a wide circular paved platform of the same
material — concentric stonework, a low kerb, clearly a built staging pad and
not merely a junction.

ROUGH GROUND: at the marked circles, ground that reads as impassable —
boulder fields, dense thickets, a marshy hollow. Distinctly darker or
cooler than the forest floor, never road-coloured.

CALM: this is a background. Detail density must stay LOW — large soft areas,
gentle variation, no busy foliage texture, no small scattered debris. The
figures that walk on it carry the detail.

No units, no vehicles, no buildings, no towers, no text, no grid, no
vignette, no border.
```

### 8b.2 `13_aschebreit.png` — Ascheschlucht, Aschefeld

Referenzblatt: `bilder/vorlage-ascheschlucht.png` · **drei** Bahnen, 6359
Weltpunkte zusammen, Straßenbreite 80 bis 142 Weltpunkte. Die drei Bahnen
laufen aus dem linken Bildrand ein und vereinigen sich vor der Plattform —
sie gehören als **ein zusammenhängendes Straßennetz** gemalt, nicht als drei
unverbundene Streifen.

```
[STYLE-BLOCK EINFÜGEN]

IGNORE the BACKGROUND and MARGIN lines of the style block: this is a
full-bleed terrain map, not a cut-out asset. It has no transparency and no
margin; the terrain runs to all four edges.

SUBJECT: A top-down battlefield terrain map, 2400x1350, seen straight from
directly above — no perspective, no horizon, no sky. A cooled ash field:
grey volcanic ash, cracked basalt shelves, a few dull ember fissures glowing
faintly deep in the cracks.

THE ROAD — this is the part that has been wrong three times, read it twice.
A reference sheet accompanies this order. The pale cream band on it is the
road. Paint a road of packed ash and concrete EXACTLY along that band, edge
to edge, and paint NO OTHER ROAD ANYWHERE on the map. Three routes enter
from the left edge, run east across the map and merge into one before the
paved circle — one connected road network, not three separate stripes.
Every other part of the map is ash field.

The road is WIDE: about one twentieth of the image width at its narrowest,
wider where routes merge. It is the single most readable feature of the
image, and it must be unmistakably lighter than the ash around it — a viewer
must never have to wonder whether a given patch is road or ground.

Its edges are soft and organic (drifted ash, gravel spill, tyre ruts), not a
stencil line — but its WIDTH must never fall below what the reference sheet
shows.

THE PAD: where the routes meet, a wide circular paved platform of the same
material — concentric stonework, a low kerb, clearly a built staging pad and
not merely a junction.

ROUGH GROUND: at the marked circles, ground that reads as impassable —
basalt outcrops, collapsed crust, an open fissure. Distinctly darker than
the ash field, never road-coloured.

CALM: this is a background. Detail density must stay LOW — large soft areas,
gentle variation, no busy ash texture, no scattered rubble fields. The
figures that walk on it carry the detail.

No units, no vehicles, no buildings, no towers, no text, no grid, no
vignette, no border.
```

### 8b.3 `11_frostbreit.png` — Frostspalte, Frostebene

Referenzblatt: `bilder/vorlage-frostspalte.png` · **zwei** Bahnen, 5113
Weltpunkte zusammen, Straßenbreite 80 bis 154 Weltpunkte.

**Diese Karte hat einen zweiten Mangel, den die anderen nicht haben.** Weg und
Boden liegen farblich nur **43 Farbschritte** auseinander (Spiralhain: 130).
Deshalb greift dort das Verblassen der Kulisse aus v208 nicht — gemessen
**1,3 gegen 16,2 Farbschritte** Wirkung. Der neue Boden muss die Straße
**deutlich** vom Schnee abheben, sonst bleibt diese Karte der Fall, den kein
Werkzeug retten kann.

```
[STYLE-BLOCK EINFÜGEN]

IGNORE the BACKGROUND and MARGIN lines of the style block: this is a
full-bleed terrain map, not a cut-out asset. It has no transparency and no
margin; the terrain runs to all four edges.

SUBJECT: A top-down battlefield terrain map, 2400x1350, seen straight from
directly above — no perspective, no horizon, no sky. A frozen plain: wind-
packed snow over blue-grey ice, shallow drifts, a few dark crevasses, sparse
frost-killed scrub.

THE ROAD — this is the part that has been wrong three times, read it twice.
A reference sheet accompanies this order. The pale cream band on it is the
road. Paint a cleared military road of dark scraped gravel and salted
concrete EXACTLY along that band, edge to edge, and paint NO OTHER ROAD
ANYWHERE on the map. Two routes, crossing once, running to the paved circle.
Every other part of the map is snow field.

CONTRAST IS THE POINT ON THIS MAP: the road must be much DARKER than the
snow around it — ploughed down to grit and gravel, with snow banked at its
verges. On the previous version road and snow were nearly the same colour
and the road was invisible. A viewer must never have to wonder whether a
given patch is road or ground.

The road is WIDE: about one twentieth of the image width at its narrowest,
wider at the bends and at the crossing. Its edges are soft and organic
(snow banks, grit spill, tyre ruts), not a stencil line — but its WIDTH must
never fall below what the reference sheet shows.

THE PAD: at the end of the road, a wide circular paved platform of the same
scraped material — concentric stonework, a low kerb, clearly a built staging
pad and not merely a junction.

ROUGH GROUND: at the marked circles, ground that reads as impassable — ice
ridges, an open crevasse, deep drifts. Distinctly darker or cooler than the
snow field, never road-coloured.

CALM: this is a background. Detail density must stay LOW — large soft areas,
gentle variation, no busy snow texture, no scattered debris. The figures
that walk on it carry the detail.

No units, no vehicles, no buildings, no towers, no text, no grid, no
vignette, no border.
```

---

## 8c. Nachbestellung D28-C, zweiter Anlauf — **Gelände ohne Weg** (v214)

**Die Umkehrung von 8b, und sie ist einfacher.** Das Spiel zeichnet den Weg
wieder selbst: ein Band mit wechselnder Breite, Randsteinen und Einfassung,
gerechnet aus der Bahn. Damit kann die gemalte Straße gar nicht mehr von der
benutzten abweichen — sie existiert nicht.

**Was das für die Abnahme heißt** (alles gemessen, nichts geschätzt):

| Prüfung | mit gemaltem Weg (heute) | mit gezeichnetem Weg |
|---|---|---|
| `bahntreue` Mitte | 80,1 – 100 % | **100 % — von Bauart** |
| `bahntreue` Schlauch | 43,9 – 51,5 % | **100 %** |
| `bahntreue` Rand | 11,1 – 20,0 % | **100 %** |
| `wegdeckung` benutzte Straße | 38 / 75 / 70 % | **100 %** |

Und **D28-D** („Bauen auf gemalter Straße verbieten") sowie **D28-E** („der
Schlauch ist breiter als die Farbe") lösen sich mit auf: es gibt keine gemalte
Straße mehr, auf der niemand läuft.

### Was das Bild jetzt liefert — und was ausdrücklich nicht

**Nur den Boden.** Kein Weg, kein Pfad, kein Trampelpfad, keine Fahrspur,
keine gepflasterte Plattform, keine Lichtung in Straßenform. Der Boden läuft
gleichmäßig über die ganze Fläche.

**Das Gelände dagegen bleibt im Bild.** Der gezeichnete Weg überzeugt, die
gezeichneten Felsen nicht — gemessen an einer Probe in v214: flache blaugraue
Vektorklumpen mit harter Kante, die neben dem Foto stehen wie aufgeklebt.
Fels, Dickicht und Wasser gehören deshalb weiter gemalt, **an genau die
Stellen, die das Referenzblatt als rote Ringe zeigt** — dort sperrt das Spiel
das Bauen, und der Spieler muss sehen, warum.

Ein Referenzblatt gehört also weiterhin dazu (`npm run wegvorlage`), aber nur
noch für **eine** Sache: die roten Ringe. Das cremefarbene Band darauf zeigt
jetzt, wo **kein** Boden gebraucht wird — dort liegt später der gezeichnete
Weg, alles darunter wird verdeckt. Es schadet nichts, wenn dort Boden ist.

### Abnahme

| Prüfung | Heute | Gefordert |
|---|---|---|
| `npm run kartenprobe` Wegfreiheit | Farbabstand Bahn gegen Karte 85,0 / 79,2 / 33,3 | **≤ 25 Farbschritte** |
| Seitenverhältnis | 1,778 | 1,778 (16:9), 2400 × 1350 |
| `npm run gelaendetor` | grün | grün — jeder rote Ring bleibt unwegsam |
| Helligkeit / Sättigung / Detaildichte | im Band | **0,30–0,36 / 0,45–0,55 / 1,5–3,0** |
| Reines Schwarz | 0,0 – 0,2 % | höchstens **2 %** |

**Die 25 sind nicht geraten.** Der Farbabstand zwischen dem Streifen unter der
Bahn und dem Mittel der Karte misst heute 85,0 (Spiralhain), 79,2
(Ascheschlucht) und 33,3 (Frostspalte) — die letzte ist die schwächste
gemalte Straße, die das Spiel hat, und sie ist von der Frostebene kaum zu
unterscheiden. Wer unter 25 liegt, hat dort keine Straße gemalt.

Ablage: `art/roh/untergrund/` · **2400 × 1350 PNG** · Budget 700 KB je Datei.

### 8c.1 `12_laubbreit.png` — Spiralhain, Laubwald **ohne Weg**

```
[STYLE-BLOCK EINFÜGEN]

IGNORE the BACKGROUND and MARGIN lines of the style block: this is a
full-bleed terrain map, not a cut-out asset. It has no transparency and no
margin; the terrain runs to all four edges.

SUBJECT: A top-down terrain map, 2400x1350, seen straight from directly
above — no perspective, no horizon, no sky. Temperate deciduous forest floor
in late summer: leaf litter, moss, patches of low grass, scattered broadleaf
canopy, a few fallen trunks.

NO ROAD. NO PATH. This is the single most important instruction in this
brief, and it is the opposite of what such a map usually wants. Do not paint
a road, a track, a trail, a worn line, a cleared lane or any elongated
lighter strip anywhere on the image. The game draws its own road on top of
this picture, and any painted one would sit next to it and contradict it.
The ground is continuous from edge to edge.

GOAL PLATFORM — the one exception, and it is required: a single round paved
platform at the position marked by the BLUE ring on the accompanying
reference sheet, about 260 world points across (roughly one seventh of the
image width). Fitted stone with a raised kerb and concentric paving inside,
clearly lighter and clearly man-made against the surrounding ground. It is
round and isolated: no road, track or paved apron leads to or away from it.
The player's fortress is placed on it by the game.

ROUGH GROUND: at the circles marked on the accompanying reference sheet,
ground that reads as impassable — boulder fields, dense thickets, a marshy
hollow. These MUST be in the image; the game no longer draws them. Distinctly
darker or cooler than the forest floor, with a clear shape, so a player sees
at a glance why nothing can be built there.

CALM: this is a background. Detail density must stay LOW — large soft areas,
gentle variation, no busy foliage texture, no small scattered debris. The
figures that walk on it carry the detail.

No units, no vehicles, no buildings, no towers, no text, no grid, no
vignette, no border.

[AUSGABE-BLOCK EINFÜGEN]
```

### 8c.2 `13_aschebreit.png` — Ascheschlucht, Aschefeld **ohne Weg**

```
[STYLE-BLOCK EINFÜGEN]

IGNORE the BACKGROUND and MARGIN lines of the style block: this is a
full-bleed terrain map, not a cut-out asset. It has no transparency and no
margin; the terrain runs to all four edges.

SUBJECT: A top-down terrain map, 2400x1350, seen straight from directly
above — no perspective, no horizon, no sky. A cooled ash field: grey volcanic
ash, cracked basalt shelves, a few dull ember fissures glowing faintly deep
in the cracks.

NO ROAD. NO PATH. This is the single most important instruction in this
brief, and it is the opposite of what such a map usually wants. Do not paint
a road, a track, a trail, a worn line, a cleared lane or any elongated
lighter strip anywhere on the image. The game draws its own road on top of
this picture, and any painted one would sit next to it and contradict it.
The ground is continuous from edge to edge.

GOAL PLATFORM — the one exception, and it is required: a single round paved
platform at the position marked by the BLUE ring on the accompanying
reference sheet, about 260 world points across (roughly one seventh of the
image width). Fitted stone with a raised kerb and concentric paving inside,
clearly lighter and clearly man-made against the surrounding ground. It is
round and isolated: no road, track or paved apron leads to or away from it.
The player's fortress is placed on it by the game.

ROUGH GROUND: at the circles marked on the accompanying reference sheet,
ground that reads as impassable — basalt outcrops, collapsed crust, an open
fissure. These MUST be in the image; the game no longer draws them.
Distinctly darker than the ash field, with a clear shape, so a player sees at
a glance why nothing can be built there.

CALM: this is a background. Detail density must stay LOW — large soft areas,
gentle variation, no busy ash texture, no scattered rubble fields. The
figures that walk on it carry the detail.

No units, no vehicles, no buildings, no towers, no text, no grid, no
vignette, no border.

[AUSGABE-BLOCK EINFÜGEN]
```

### 8c.3 `11_frostbreit.png` — Frostspalte, Frostebene **ohne Weg**

```
[STYLE-BLOCK EINFÜGEN]

IGNORE the BACKGROUND and MARGIN lines of the style block: this is a
full-bleed terrain map, not a cut-out asset. It has no transparency and no
margin; the terrain runs to all four edges.

SUBJECT: A top-down terrain map, 2400x1350, seen straight from directly
above — no perspective, no horizon, no sky. A frozen plain: wind-packed snow
over blue-grey ice, shallow drifts, sparse frost-killed scrub.

NO ROAD. NO PATH. This is the single most important instruction in this
brief, and it is the opposite of what such a map usually wants. Do not paint
a road, a track, a trail, a worn line, a cleared lane or any elongated
lighter or darker strip anywhere on the image. The game draws its own road on
top of this picture, and any painted one would sit next to it and contradict
it. The ground is continuous from edge to edge.

GOAL PLATFORM — the one exception, and it is required: a single round paved
platform at the position marked by the BLUE ring on the accompanying
reference sheet, about 260 world points across (roughly one seventh of the
image width). Fitted stone with a raised kerb and concentric paving inside,
clearly darker and clearly man-made against the surrounding ground. It is
round and isolated: no road, track or paved apron leads to or away from it.
The player's fortress is placed on it by the game.

ROUGH GROUND: at the circles marked on the accompanying reference sheet,
ground that reads as impassable — ice ridges, an open crevasse, deep drifts.
These MUST be in the image; the game no longer draws them. Distinctly darker
or cooler than the snow field, with a clear shape, so a player sees at a
glance why nothing can be built there.

CALM: this is a background. Detail density must stay LOW — large soft areas,
gentle variation, no busy snow texture, no scattered debris. The figures that
walk on it carry the detail.

No units, no vehicles, no buildings, no towers, no text, no grid, no
vignette, no border.

[AUSGABE-BLOCK EINFÜGEN]
```

---

## 9. Was **nicht** geliefert werden soll

* Kein Bild mit eingebackenem Schatten, Randlicht, Glühen oder Bloom.
* Keine Seitenansicht bei den Gegnern — sie stehen im Spiel auf dem Kopf.
* Keine Aufsicht bei den Türmen — sie sind stehende Bauwerke.
* Kein reines Schwarz als Konturlinie. Der alte Koloss hatte **15,4 %**
  reines Schwarz und musste beim Packen angehoben werden.
* Keine Schrift, keine Zahlen, keine Wappen mit Buchstaben.
* Keine Bilder größer als nötig — die Budgets in Abschnitt 5 bis 8 sind
  gepackte Gesamtgrößen je Bündel, nicht je Datei.

---

## 9b. Was die Probelieferung ergeben hat (24.08.2026)

Acht Kandidaten wurden geliefert und gemessen. **Der Stil trägt** — das ist
die wichtigste Nachricht. Was fehlt, ist Vielfalt in der Form.

| | Probelieferung | heutiger Bestand | Vorgabe |
|---|---|---|---|
| Format, Alpha | 1024² mit Alpha ✔ | — | quadratisch, Alpha |
| Aufsicht, Rohr nach oben | ✔ | ✔ | Pflicht |
| Proportion (quer/längs) | 0,59 ✔ | — | lang, nicht breit |
| **Lichtwinkel** | **8 – 34°** ✔ deutlich besser | 5 – 114° | unter 20° |
| **Silhouetten-Ähnlichkeit** | **0,83** ✘ | 0,49 | unter 0,65 |
| **Reines Schwarz** | **6,7 – 10,9 %** ✘ | 0,0 – 0,1 % | unter 2 % |
| **Feindetail** (gleiche Messstelle) | **4,9 – 6,8** ✘ | 1,4 – 4,0 | so wenig wie möglich |
| **Rand** | alle acht berühren die Kante ✘ | — | 5 % Luft ringsum |

**Was daraus folgt** — und was in dieser Fassung des Auftrags neu steht:
Abschnitt 3.2b (fünf Grundformen), die Kettenregel und die Schwarzgrenze im
Stil-Block, der Rand, und je Gegner eine Zeile `GRUNDFORM`.

### Zweite Probelieferung (24.08.2026, neun Figuren)

**Das Formproblem ist gelöst, das Stilproblem neu entstanden.**

| | Lieferung 1 | Lieferung 2 | heute | Vorgabe |
|---|---|---|---|---|
| Silhouetten-Ähnlichkeit | 0,83 ✘ | **0,60 ✔** | 0,49 | unter 0,65 |
| Reines Schwarz | 6,7 – 10,9 % ✘ | **14,3 – 25,2 % ✘** | 0,0 % | unter 2 % |
| Feindetail | 4,9 – 6,8 | **6,8 – 9,5 ✘** | 1,4 – 4,0 | so wenig wie möglich |
| Lichtwinkel | 8 – 34° | **3 – 33°** | 5 – 114° | unter 20° |

Die Formen stimmen jetzt: Quadrokopter, Fußsoldaten und Kettenfahrzeuge sind
drei klar verschiedene Grundformen, und im Mittel liegen sie unter der
Grenze. Nur die drei Kettenfahrzeuge ähneln sich untereinander (0,85 – 0,89)
— davon wird ohnehin nur eines gebraucht.

**Aber der Stil ist abgedriftet:** von malerisch (Lieferung 1) zu
cel-shaded mit einer harten schwarzen Kontur um jedes einzelne Teil. Das
allein erklärt die 14 bis 25 % Schwarz und den Anstieg beim Feindetail.
**Es ist genau diese eine Sache zu ändern** — der Rest von Lieferung 2 ist
richtig.

**Die drei Kandidaten, die bleiben können.** Ihre Machart ist genau richtig;
sie brauchen nur ihre eigene Grundform:

| Kandidat | wird zu | was zu ändern ist |
|---|---|---|
| `Gegner_01_Oliv_Orange` | **Koloss** (Kettenfahrzeug) | Ketten als zwei Bänder, Schwarz auf Dunkelgrau, 5 % Rand |
| `Gegner_04_Stahlgrau_Rot` | **Spalter** (Radfahrzeug) | Ketten → sechs Räder, Geschützrohr → **Dachluke** |
| `Gegner_08_Rot` | **Leerentitan** (Läufer) | Ketten → vier abstehende Beine, deutlich länger als breit |

Die übrigen fünf werden neu gezeichnet: Schleicher (Kleingerät), Infanterie
(Fußtrupp), Späher (Radfahrzeug, `Gegner_05` ist die richtige Richtung),
Gleiter (Fluggerät).

---

## 10. Wenn die Bilder da sind

Nicht Aufgabe des Bild-Agenten, aber hier vollständig, damit die Übergabe
ohne Rückfrage klappt:

```
0. npm run probebild -- <ordner>   ERST prüfen, dann packen.
   Misst Format, Alpha, Rand, reines Schwarz, Feindetail, Lichtwinkel und
   die Silhouetten-Ähnlichkeit UNTEREINANDER. Ein Bild nachzubessern ist
   billig, achtunddreissig nachzubessern nicht.
1. Dateien nach art/roh/{gegner,tuerme,objekte,untergrund}/ legen
2. art/*.json auf die Vorgabewerte zurücksetzen
   (Helligkeit, Saettigung, Entrauschen, schwarzHeben sind an den ALTEN
   Lieferungen geeicht — "Koloss: 15,4 % reines Schwarz, angehoben"
   beschreibt ein bestimmtes Bild, nicht eine Absicht)
3. npx tsx tools/pack-art.mjs      packt nach src/gfx/assets/
4. npm run eichen                  Feinwerte neu durchprobieren (Regel 9)
5. npm run gate                    Torkette, darunter Grafiktor und Lichtmessung
6. npm run grafik                  Helligkeit, Sättigung, Dichte, Lichtwinkel
7. das ERGEBNIS einchecken, nicht die Rohbilder
```

**Woran der Erfolg gemessen wird** — die Zahlen, die sich bessern müssen:

| Kennzahl | heute | Ziel |
|---|---|---|
| Detaildichte Figur zu Untergrund | **6,0-fach** | höchstens 3,0 |
| Lichtwinkel, schlimmste Figur | **66°** neben der Sonne | unter 20° |
| Modellierungsstärke, flachste Figur | **0,0025** | über 0,010 |
| Füllgrad Infanterie | **0,43** | 0,78 |
| Silhouetten-Ähnlichkeit, Mittel | 0,49 | unter 0,65 halten |
| Figuren-Helligkeit | 0,35 | im Band 0,33–0,40 halten |
| Figuren-Sättigung | 0,42 | im Band 0,35–0,45 halten |
