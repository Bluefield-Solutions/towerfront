# Towerfront — Bildauftrag

Stand: v163 · 25.08.2026 · **Auftragsdokument für den Bild-Agenten**

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

**Jedem einzelnen Bild-Prompt wörtlich voranstellen:**

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
| „calm surfaces, no noise" | Figuren tragen heute **6,0-mal** so viel Feindetail wie der Untergrund, erlaubt sind 3,0. Filtern hilft nicht — es kostet die Form | `npm run grafik`, Befund B1 |
| „no pure black" | Reines Schwarz höchstens 2 % der Fläche | `npm run grafik` |
| „mid-tones" | Figuren-Helligkeit muss im Band **0,33–0,40** liegen, Sättigung **0,35–0,45** | `npm run grafik` |
| „transparent, no shadow" | Schatten, Sonnenanstrich, Bodenverschattung und Farbklima trägt das Spiel je Karte auf | `npm run einbettungstor` |
| „reads at 40 pixels" | Die kleinste Figur wird mit 17 Bildschirmpunkten gezeichnet | `npm run lesbarkeit` |
| „tracks as two dark bands" | Ausmodellierte Kettenglieder sind bei 40 px unsichtbar und treiben nur die Dichte | `npm run probebild` |
| „no outlines" | Die zweite Probelieferung war cel-shaded mit harter Kontur um jedes Teil und lag bei **14,3 – 25,2 %** reinem Schwarz. Bei 17 bis 40 Bildschirmpunkten wird eine 3-px-Kontur zum halben Gegner | `npm run probebild` |
| „no black, dark grey" | Erste Lieferung **6,7 – 10,9 %**, zweite **14,3 – 25,2 %**, heutiger Bestand 0,0 % | `npm run probebild` |
| „5 percent margin" | Alle acht Kandidaten der Probelieferung berührten den Kachelrand | `npm run probebild` |

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

> Ein Bild, zwei Gegner: der **Span** wird aus derselben Datei erzeugt,
> kleiner, blasser und kühler. Das Bild muss deshalb auch stark verkleinert
> noch lesbar sein.

```
[STYLE-BLOCK EINFÜGEN]

GRUNDFORM: Radfahrzeug — sechs einzeln sichtbare Räder, KEIN Geschützrohr.
Die Dachluke ist das Erkennungsmerkmal, nicht eine Waffe.

SUBJECT: An armoured carrier vehicle that deploys drones, seen STRICTLY FROM
DIRECTLY ABOVE (orthographic top-down), facing UP toward the top edge of the
image. Six-wheeled boxy hull with sloped side armour, a large segmented
launch hatch on the roof split down the middle, two small folded drone racks
visible through the opening. Dark gunmetal with steel-blue armour panels and
orange hazard chevrons around the roof hatch.

The roof hatch is the recognition feature — it must stay readable when the
image is scaled down to a third of its size.

FRAMING: silhouette about 180 px wide and 220 px tall inside a 256x256
transparent canvas, centred, nothing cropped.
```

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

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A cryogenic area-denial emitter, seen from a slightly elevated
three-quarter front angle, standing on the ground (NOT top-down). Level [1-6]
of six. A heavy generator block with coolant tanks, thick insulated cabling
and a wide upward-facing dish ring of emitter coils — NO gun barrel, this
weapon has no projectile. Frost rimes the coils. Dark gunmetal with turquoise
(#7FE7E0) glowing coils and turquoise coolant lines.

IMPORTANT: on levels 4 to 6 the emitter coils must NOT reach the top edge —
the previous generation was clipped there. Keep 12 percent clearance above.

PROPORTION WARNING: draw the tower about 14 percent SQUATTER than it should
finally look — the game stretches this square image 16 percent vertically.

The base sits on the ground at 28 percent of the image height from the
bottom; nothing below it.

FRAMING: the tower fills about 86 percent of a 256x256 transparent canvas,
centred, nothing cropped.
```

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

> **Diese drei sind der geringste Änderungsbedarf.** Ein moderner Krieg kann
> in einem Laubwald stattfinden — die vorhandenen Karten tragen den neuen
> Stil mit. Neu bestellt werden sie nur, wenn die alten ersetzt werden
> sollen. Wer sie liefert, hält die Bänder ein: Helligkeit **0,30–0,36**,
> Sättigung **0,45–0,55**, Detaildichte **1,5–3,0**.

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
