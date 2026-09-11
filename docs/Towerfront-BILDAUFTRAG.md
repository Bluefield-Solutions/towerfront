# Towerfront — Bildauftrag

Stand: v339 · 11.09.2026 · **Auftragsdokument für den Bild-Agenten**

**Nachgesehen in v339 — gemessen mit `npm run bildtor`, nicht abgeschrieben.**
Offen sind unverändert **vier von 22** Bildern: `31_foerderer.png`,
`32_werft.png`, `33_sanitaeter.png` (im Tor als `gegner: heiler`) und
`34_hetzer.png`. Die sieben Runden v333 bis v339 haben **keine** neue
Bestellung erzeugt — v333, v336 und v339 sind Messgeräte, v334, v335, v337
und v338 Reparaturen an Toren und Gegenproben.

**Die Umnummerierung aus v334 steht hier, weil sie genau dieses Dokument
betraf:** der Bannturm war als `8d.4` / `33_bannturm.png` bestellt, und v328
gab dem Sanitäter dieselbe Kennung UND denselben Dateinamen. Eine Gegenprobe,
die `### 8d.4` greift, traf seitdem den falschen Abschnitt und schwieg. Der
Bannturm ist jetzt **`8d.6` / `35_bannturm.png`**; der Doku-Wächter prüft seit
v334 beides — doppelte Kennung und doppelte Datei, letzteres nur INNERHALB
einer Abschnittsfamilie (dass 8b und 8c dieselbe Karte bestellen, ist Absicht).

**Nachgesehen in v332 — nachgesehen, nicht gestempelt.** `npm run bildtor`
nennt jetzt **vier** offene Bestellungen statt zweier, und das ist die
Bewegung, die dieses Dokument seit v325 macht:

| Bestellung | Abschnitt | seit | was im Spiel steht |
|---|---|---|---|
| `31_foerderer.png` | 8d.2 | v285 | Platzhalter |
| `32_werft.png` | 8d.3 | v290 | Platzhalter |
| `33_sanitaeter.png` | 8d.4 | v328 | Platzhalter |
| `34_hetzer.png` | 8d.5 | v329 | Platzhalter |

**Vier Platzhalter, und das Spiel ist vollständig spielbar** — genau dafür ist
K5 gemacht: ein fehlendes Bild ist eine laufende Bestellung und kein Fehler im
Code. Gebaut wird gegen `getPlatzhalter` (Silhouette in der richtigen Größe,
Schraffur, Marke #FF00E5), `npm run bildtor` meldet sie grün und verschweigt
sie nicht. `git log -- src/gfx/assets/` nennt als letzten Eingriff weiterhin
**v233** — seit 99 Fassungen ist kein Bildpunkt dazugekommen.

**Die Vorzeichen aus v332 haben KEINE Bestellung ausgelöst, und das ist eine
Entscheidung.** Ein Vorzeichen ist ein Wort und eine Zahl in einem Rahmen;
gemessen kostet es 0,8 Prozentpunkte Bildschirm und null Kilobyte Bildvorrat.
Ein Symbol je Zeichen wäre sechs weitere Bestellungen für etwas, das der Text
schon sagt — und der Bildvorrat hat sie nicht: `npm run autarkie` misst **1030
KB roh reserviert gegen 1067 erlaubte, Abstand 36,8 KB**, in v325 waren es
42,2. Der Code ist gewachsen, und jedes KB Code kostet 0,75 KB Bildvorrat. Die
ausgelieferte Datei wiegt **1473 KB von 1800**.

**Nachgesehen in v325 — nachgesehen, nicht gestempelt.** `npm run bildtor`
nennt unverändert **zwei** offene Bestellungen, `31_foerderer.png` (8d.2) und
`32_werft.png` (8d.3); `git log -- src/gfx/assets/` nennt als letzten Eingriff
weiterhin v233. `npm run autarkie` misst **1030 KB roh reserviert gegen 1072
erlaubte, Abstand 42,2 KB** — in v318 standen dort 44, der Code ist also um
rund 2 KB gewachsen und der erlaubte Bildvorrat um 1,5 geschrumpft. Die
ausgelieferte Datei wiegt 1466 KB von 1800.

**Zwei Bestellungen sind seit v318 dazugekommen, und beide stehen an anderer
Stelle als die Prompts:**

* **v322, Abschnitt 8b:** die Zielplattform gehört **mindestens 270
  Weltpunkte** vom nächsten Kartenrand — so weit reicht der Warnring
  (`r = 150 + not · 120` in `drawCrystal`). Gemessen stehen alle vier Karten
  bei 186 bis 237, es fehlen also 33 bis 84 Punkte. **Der Ring ragt aus der
  WELT heraus, nicht aus dem Bild** — keine Kameraeinstellung holt ihn herein,
  auch `fitScale` nicht. Die Forderung steht neben der Abwägung, die an
  derselben Stelle einmal das Gegenteil entschieden hat; welche wiegt,
  entscheidet der Nutzer.
* **v324, `S-N5-01b`:** die Bilder im neuen Stil (leichte Schrägsicht,
  industriell, dunkler Grund) liegen noch nicht im Vorrat. Solange sie fehlen,
  ist `S-N5-02` („Figuren bekommen Fuß und Schatten") nicht baubar — alle acht
  Gegnerbilder sind Aufsichten, und dort IST die Mitte der Auflagepunkt. Der
  Stilblock Neubau steht in Abschnitt 8d.0 und wird von `npm run bildprompt`
  bei jedem Auftrag mit ausgegeben (Regel 15).

**Nachgesehen in v318 — nachgesehen, nicht gestempelt:** `npm run bildtor`
nennt unverändert **zwei** offene Bestellungen, `31_foerderer.png` (8d.2) und
`32_werft.png` (8d.3); `git log -- src/gfx/assets/` nennt als letzten Eingriff
v233. Es ist also seit fünf Runden kein Bild dazugekommen und keines
weggefallen.

**Und die Rechnung dahinter hat sich in v313 geändert**, auch wenn kein
Prompt davon berührt ist: die Gruppenbudgets reservierten 1075 KB roh gegen
1074,75 erlaubte — zwei Haushalte, 0,2 KB Abstand. Gerichtet wurde die
RESERVIERUNG (`tuerme` von 445 auf 400 über gemessenen 302 plus rund 50 für
die offenen Bestellungen), nicht die Obergrenze. **Jedes KB Code kostet 0,75
KB Bildvorrat**, und das Tor nennt seitdem den Abstand statt nur die
Überschreitung — heute 44 KB.

**Nachgesehen in v311:** die Reparatur aus v304 hält — Abschnitt **1c** (der
Ausgabeblock für Figuren und Bauwerke) steht, `tools/auftrag.ts` setzt ihn
ein, und `npm run doku` hält es als Ableitung statt als Liste: wer im Prompt
„512 x 512" schreibt, bestellt eine Figur und darf nicht den Kartenblock
tragen.

**Offen sind zwei Bestellungen**, beide seit ihrer Story unverändert und beide
in jedem `npm run bildtor` genannt:

| Abschnitt | Datei | offen seit |
|---|---|---|
| 8d.2 | `31_foerderer.png` | v285 |
| 8d.3 | `32_werft.png` | v290 |

Gebaut wird solange gegen `getPlatzhalter` — Silhouette in der richtigen
Größe, Schraffur, kein Detail, Marke `#FF00E5`. Gemessen tragen 83 % der
deckenden Punkte die Marke, und die beiden Platzhalter unterscheiden sich zu
20 % voneinander; ein fehlendes Bild ist damit sichtbar und nicht als
ordentliche Ersatzform getarnt (das war es bis v272).

**Seit v304 sind keine neuen Bildbestellungen dazugekommen.** Die beiden neuen
Menübilder (v305 Abschnittswahl, v306 Kartenstapel) sind gezeichnet, in
derselben Formensprache wie die Landkarte.

**Nachgesehen in v304 — und die drei offenen Aufträge widersprachen sich
selbst.** 8d.2, 8d.3 und 8d.4 bestellen ein Sprite (512 × 512, quadratisch,
freigestellt auf Transparenz) und trugen am Ende den **Kartenblock**: 16:9,
randlos, 2400 × 1350. Ein Empfänger, der ihm folgt, liefert ein Gelände statt
einer Figur — und die Regel dagegen steht seit v211 in Abschnitt 1b selbst
(„Er gilt nur für die Kartenbilder").

**Gefunden hat es kein Tor, sondern der Versuch, sie wirklich herauszugeben.**
Dieselbe Klasse wie v229, wo `kartenprobe` an einer verschobenen Tabellenspalte
brach und es erst auffiel, als ein Bild ankam: ein Auftrag, den niemand
ausgibt, ist im Ernstfall kaputt.

Es gibt jetzt einen zweiten Ausgabeblock (**Abschnitt 1c**) für Figuren und
Bauwerke, mit den Zahlen, gegen die `npm run probebild` misst — 512 × 512,
echter Alphakanal, 6 Punkte Luft zum Rand, höchstens 2 % reines Schwarz, Licht
von oben links. Und `npm run doku` hält es: wer im Prompt „512 x 512" schreibt,
bestellt eine Figur und bekommt den Figurenblock. Eine Ableitung, keine Liste
(Regel 15).

**Nachgesehen in v298 — es sind jetzt DREI offene Bestellungen, und die dritte
verschärft die Regel, die schon für die ersten beiden galt.** Dazugekommen ist
`8d.4` (`35_bannturm.png`, seit v295). Damit hat das Spiel drei Bauwerke, die
**nicht schiessen**, und sie müssen sich gegenseitig auf den ersten Blick
trennen: jede der drei Bestellungen trägt **0,55** Silhouetten-Ähnlichkeit als
Grenze — gegen jedes schon gelieferte Bauwerk **und gegen die anderen zwei**.

Der Bannturm trägt zusätzlich die schärfste Formforderung des ganzen
Dokuments: **55 % leere Fläche**, ein offener Dreibeinmast, ausdrücklich kein
Rohr und keine Mündung. Was zielt, sieht aus wie ein Geschütz — und dieser
Turm schiesst nicht.

**Alle drei sind gebaut, gemessen und im Spiel** (Förderer v285, Werft v290,
Bannturm v295 — letzterer als Mechanik, nicht in der Bauleiste, weil sieben
Bauknöpfe alle vier UX-Zustände reissen). Es fehlt nur das Bild. `npm run
bildtor` nennt sie bei jedem Lauf als laufende Bestellung: grün, aber nie
verschwiegen.

**Nachgesehen in v291 — zwei offene Bestellungen, und sie hängen aneinander.**
`8d.2` (`31_foerderer.png`, seit v285) und `8d.3` (`32_werft.png`, seit v290)
sind die einzigen offenen Aufträge; `npm run bildtor` nennt beide bei jedem
Lauf. Sie hängen aneinander, weil sie die zwei einzigen Bauwerke des Spiels
sind, die **nicht schiessen** — gegen einen Turm trennt schon das, gegeneinander
trennt nur die Form der Arbeit. Deshalb trägt 8d.3 mit **0,55** die strengste
Silhouetten-Grenze dieses Dokuments.

**Bis dahin sagt der Platzhalter, welches Bild fehlt.** Er trug bis v290 nur
Schraffur und Marke — und mit zwei fehlenden Bildern standen zwei identische
Kacheln nebeneinander in der Bauleiste. Seit v290 trägt er den
Anfangsbuchstaben (F und W), und `npm run bildtor` prüft bei jedem Lauf, dass
sich zwei Platzhalter um mindestens 12 % ihrer Punkte unterscheiden.

**Nachgesehen in v284 — nachgefahren, nicht gestempelt.** `npm run guards`
liest die Abnahmegrenzen bei jedem Lauf aus diesem Dokument und meldet sie:
Mitte 99 %, Schlauch 90 %, Rand 75 %, Nutzung 90 %, Wegfreiheit 25
Farbschritte. Es zählt ausserdem 35 Prompts, der kürzeste 3331 Zeichen mit
eingesetztem Stil-Block (alt 2701, Neubau 2622); `npm run bildprompt --
werkhof` gibt 107 Zeilen in einem Stück aus. Inhaltlich unverändert seit v277:
seither ist kein Bild bestellt und keine Grenze verschoben worden — die
Runden v278 bis v284 waren Wegenetz, Route und Weichen, also Quelltext.

**Nachgesehen in v272:** unveraendert. Die Abnahmegrenzen dieses Dokuments werden seit v229 bei jedem `npm run guards` mitgelesen (0 Fehler im heutigen Baum) - genau deshalb, weil `kartenprobe` nicht in der Torkette steht und ein Werkzeug, dessen Eingang niemand prueft, im Ernstfall kaputt ist.

**Nachgesehen in v265:** unveraendert. Abschnitt 6.8 (acht Zweigsymbole)
bleibt offen — bestellt und nicht geliefert.

**Nachgesehen in v258:** die Abnahmegrenzen dieses Dokuments liest
`npm run guards` bei jedem Lauf mit (v229), und `npm run bildprompt` gibt die
Aufträge daraus aus. Beide grün. Offen ist weiterhin Abschnitt 6.8 — die acht
Zweigsymbole sind bestellt und noch nicht geliefert (S-P1-00).

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

## 1c. Der Ausgabe-Block — für **Figuren und Bauwerke**, wörtlich ans Ende

**Warum es diesen zweiten gibt, und was er gekostet hat.** Abschnitt 1b sagt
selbst, dass er nur für Kartenbilder gilt — und die drei Gebäudeaufträge 8d.2
bis 8d.4 trugen ihn trotzdem. Ein Empfänger, der ihnen folgt, liefert ein
randloses 16:9-Gelände von 2400 × 1350 Punkten, während im selben Prompt drei
Absätze höher „512 × 512, quadratisch, freigestellt auf Transparenz" steht.
**Der Prompt widersprach sich selbst**, und die Regel dagegen stand seit v211
in 1b: „Er gilt nur für die Kartenbilder."

Gefunden hat es kein Tor, sondern der Versuch, die drei Aufträge wirklich
herauszugeben — dieselbe Klasse wie v229, wo `kartenprobe` an einer
verschobenen Tabellenspalte brach und es erst auffiel, als ein Bild ankam. Ein
Auftrag, den niemand ausgibt, ist im Ernstfall kaputt.

Die Zahlen darin sind die, gegen die `npm run probebild` misst — sie stehen
nicht ein zweites Mal irgendwo (Regel 15).

```
OUTPUT AND DELIVERY — read this as carefully as the rest.

FORMAT: PNG with a real alpha channel. Not JPEG, not WebP - the file is
re-encoded later, and a missing alpha channel cannot be recovered.

SIZE: exactly 512 x 512 pixels, square. Not 1024, not 500, not a rectangle
that happens to be close.

CUT OUT ON FULL TRANSPARENCY: no background, no backdrop, no ground plane, no
baked drop shadow, no glow bleeding into the empty area. The game bakes its
own shadow and its own light; a baked one sits on top of it twice.

AIR AROUND THE FIGURE: leave at least 6 pixels of fully transparent margin on
every side. A figure that touches the tile edge gets clipped when the atlas is
packed, and the clip is invisible until it is in the game.

NO PURE BLACK: at most 2 % of the visible pixels may be pure black. In
practice that means no black contour line and no black-modelled chains or
grilles - shapes are separated by value and by light, the way a painting does
it.

ONE LIGHT DIRECTION, FROM THE UPPER LEFT, matching the rest of the set. A
figure lit from somewhere else contradicts its own shadow the moment it stands
on the field.

NOTHING ADDED: no caption, no title, no watermark, no signature, no frame, no
scale bar, no colour-check patch, no second view of the same object.

ONE IMAGE PER REQUEST: deliver a single image, not a grid of variants and not
a sheet with several options. If you want to offer alternatives, produce them
one after another, each as its own full-size file.

DELIVER IT AS A DOWNLOADABLE FILE at full resolution - not as an inline
preview, not cropped, not resized to fit a chat window.
```

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

## 6.8. Nachbestellung H4/H6 — **acht Zweigsymbole für das Turmmenü** (v249)

Ablage: `art/roh/objekte/` · **96 × 96 PNG mit Alpha** · Budget für den ganzen
Satz **20 KB** eingebettet (die ausgelieferte Datei wiegt heute 1429 von 1800
erlaubten KB).

**Warum es sie braucht, in einer Zahl.** Das Turmmenü sitzt am rechten
Bildschirmrand, während der gemeinte Turm irgendwo auf dem Feld steht — die
Zuordnung muss der Spieler leisten. Es an den Turm zu setzen scheitert an
zehn Punkten Höhe: gemessen braucht die Karte **228**, frei sind **218**. Und
der Satz, der erklärt, was ein Ausbauzweig tut, braucht **90 Punkte**, die
dieser Bildschirm nicht hat — er trägt deshalb auf dem Zielgerät
`display: none`, und wer auf dem Telefon spielt, wählte bis v248 zwischen zwei
Namen. Vier Auswege sind in v239 durchgerechnet und reichen alle nicht
(zweispaltige Werte −43 Punkte, breitere Karte macht es schlechter, Werte
gegen Ziele −6, Vorschau nach oben +46 bei wachsender Kopfzeile).

**Symbole statt Sätze** ist der Weg, den Kingdom Rush und Bloons TD 6 gehen,
und er ist Bildmaterial, kein Code.

**Diese acht Prompts widersprechen dem globalen Stil-Block in drei Zeilen —
und sie sagen es.** Der Stil-Block beschreibt Objekte in einer Welt: eine
Sonne von links oben, drei Materialfamilien, ein gesättigter Akzent auf
entsättigtem Grund. Ein Symbol ist nichts davon; es ist ein gedrucktes
Zeichen. Jeder der acht Prompts trägt deshalb einen `OVERRIDES`-Absatz, der
die drei Zeilen ausdrücklich aufhebt und sagt, was weiter gilt. Abschnitt
„Ein Auftrag darf nicht fordern, was sein eigenes Blatt bestreitet" (v230)
verlangt genau das — dort war es eine Auflösungsangabe, hier sind es drei
Stilzeilen.

### Die Abnahme — was grün sein muss, bevor ein Symbol eingebaut wird

| Prüfung | Werkzeug | Grenze |
|---|---|---|
| Format, Alpha, Rand, reines Schwarz | `npm run probebild -- <ordner>` | wie Abschnitt 2 |
| Silhouetten-Überdeckung **untereinander** | `npm run probebild` | höchstens **0,65** je Paar (Art Bible 5.2) |
| Feindetail, gemessen in **Anzeigegröße** (22 × 22) | `npm run probebild` | wie die Figuren, nicht wie die Quelle |
| Gewicht des ganzen Satzes, eingebettet | `npm run art` | höchstens **20 KB** |

**Die Silhouetten-Regel ist hier die wichtigste**, und sie gilt vor allem
zwischen den zwei Symbolen **desselben Turms**: sie stehen im Spiel
nebeneinander und beantworten genau die Frage „worin unterscheiden sich die
beiden". Sehen sie gleich aus, ist der ganze Auftrag umsonst.

### 6.8.1 `symbol_zweig_sniper.png` — Bogenturm · Scharfschütze

Was der Zweig TUT: *Reichweite und ein harter Einzelschuss, der Panzerung durchschlägt.*

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A single flat interface ICON, not an object in a world. A single heavy long-barrelled precision cannon seen from directly above, one clean silhouette: a very long slim barrel with a muzzle brake, a compact breech, and a small rangefinder box on top. Nothing else in the frame.

OVERRIDES THE STYLE BLOCK ABOVE — read this, it contradicts three lines of it
on purpose: (1) LIGHT — there is NO sun and no cast shadow; the icon is flat.
(2) MATERIALS — the three material families do not apply; this is not an object
made of steel or glass, it is a printed symbol. (3) COLOUR — not "desaturated
base with one accent": the WHOLE icon is one hue. Everything else in the style
block still holds: transparency, margin, no text, no watermark, no glow.

CRITICAL — THIS IS AN ICON, NOT A MODEL: no ground, no shadow on a floor, no
perspective, no scene. Orthographic top-down. It is read at 22 x 22 points on
a phone, so it must survive being shrunk to a thumbnail: at most five separate
shapes, no shape thinner than one twentieth of the frame, no interior detail
that disappears below 22 points.

COLOUR: monochrome in #F2C14E on transparency, plus a darker shade of the same
hue for depth. NO second hue, no white highlights, no gradient across the whole
icon. The colour IS the identifier — it is the accent colour of this upgrade
branch in the game and appears next to the icon in the interface.

SILHOUETTE: the outline alone must identify it. Its sibling in the same tower
uses the opposite shape language (long against short, ring against burst, one
against many, split against merged) — the two must not be confusable in
outline.

FRAMING: fills about 88 percent of a 96x96 transparent canvas, centred, with
even margins on all four sides.
```

### 6.8.2 `symbol_zweig_volley.png` — Bogenturm · Salve

Was der Zweig TUT: *Halbe Wucht, doppelte Schlagzahl. Gegen Masse.*

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A single flat interface ICON, not an object in a world. Three short stubby barrels side by side seen from directly above, with three small shell casings tumbling away from them. The barrels are visibly SHORT and thick — the opposite of a sniper barrel.

OVERRIDES THE STYLE BLOCK ABOVE — read this, it contradicts three lines of it
on purpose: (1) LIGHT — there is NO sun and no cast shadow; the icon is flat.
(2) MATERIALS — the three material families do not apply; this is not an object
made of steel or glass, it is a printed symbol. (3) COLOUR — not "desaturated
base with one accent": the WHOLE icon is one hue. Everything else in the style
block still holds: transparency, margin, no text, no watermark, no glow.

CRITICAL — THIS IS AN ICON, NOT A MODEL: no ground, no shadow on a floor, no
perspective, no scene. Orthographic top-down. It is read at 22 x 22 points on
a phone, so it must survive being shrunk to a thumbnail: at most five separate
shapes, no shape thinner than one twentieth of the frame, no interior detail
that disappears below 22 points.

COLOUR: monochrome in #FF9B54 on transparency, plus a darker shade of the same
hue for depth. NO second hue, no white highlights, no gradient across the whole
icon. The colour IS the identifier — it is the accent colour of this upgrade
branch in the game and appears next to the icon in the interface.

SILHOUETTE: the outline alone must identify it. Its sibling in the same tower
uses the opposite shape language (long against short, ring against burst, one
against many, split against merged) — the two must not be confusable in
outline.

FRAMING: fills about 88 percent of a 96x96 transparent canvas, centred, with
even margins on all four sides.
```

### 6.8.3 `symbol_zweig_eternal.png` — Frostturm · Ewiges Eis

Was der Zweig TUT: *Weiter Umkreis, harte Bremse, kaum Schaden. Reine Kontrolle.*

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A single flat interface ICON, not an object in a world. A wide flat ring of frost seen from directly above, drawn as two concentric broken rings of ice crystals with a still, glassy centre. It must read as an AREA, not as an object — no barrel, no machine.

OVERRIDES THE STYLE BLOCK ABOVE — read this, it contradicts three lines of it
on purpose: (1) LIGHT — there is NO sun and no cast shadow; the icon is flat.
(2) MATERIALS — the three material families do not apply; this is not an object
made of steel or glass, it is a printed symbol. (3) COLOUR — not "desaturated
base with one accent": the WHOLE icon is one hue. Everything else in the style
block still holds: transparency, margin, no text, no watermark, no glow.

CRITICAL — THIS IS AN ICON, NOT A MODEL: no ground, no shadow on a floor, no
perspective, no scene. Orthographic top-down. It is read at 22 x 22 points on
a phone, so it must survive being shrunk to a thumbnail: at most five separate
shapes, no shape thinner than one twentieth of the frame, no interior detail
that disappears below 22 points.

COLOUR: monochrome in #7FE7E0 on transparency, plus a darker shade of the same
hue for depth. NO second hue, no white highlights, no gradient across the whole
icon. The colour IS the identifier — it is the accent colour of this upgrade
branch in the game and appears next to the icon in the interface.

SILHOUETTE: the outline alone must identify it. Its sibling in the same tower
uses the opposite shape language (long against short, ring against burst, one
against many, split against merged) — the two must not be confusable in
outline.

FRAMING: fills about 88 percent of a 96x96 transparent canvas, centred, with
even margins on all four sides.
```

### 6.8.4 `symbol_zweig_shard.png` — Frostturm · Splitterfrost

Was der Zweig TUT: *Bremst weniger, schneidet dafür.*

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A single flat interface ICON, not an object in a world. Five sharp ice shards bursting outward from a common centre, seen from directly above, each shard a slim tapered spike with a chipped edge. It must read as a BURST, the opposite of the calm ring of its sibling.

OVERRIDES THE STYLE BLOCK ABOVE — read this, it contradicts three lines of it
on purpose: (1) LIGHT — there is NO sun and no cast shadow; the icon is flat.
(2) MATERIALS — the three material families do not apply; this is not an object
made of steel or glass, it is a printed symbol. (3) COLOUR — not "desaturated
base with one accent": the WHOLE icon is one hue. Everything else in the style
block still holds: transparency, margin, no text, no watermark, no glow.

CRITICAL — THIS IS AN ICON, NOT A MODEL: no ground, no shadow on a floor, no
perspective, no scene. Orthographic top-down. It is read at 22 x 22 points on
a phone, so it must survive being shrunk to a thumbnail: at most five separate
shapes, no shape thinner than one twentieth of the frame, no interior detail
that disappears below 22 points.

COLOUR: monochrome in #9FD4FF on transparency, plus a darker shade of the same
hue for depth. NO second hue, no white highlights, no gradient across the whole
icon. The colour IS the identifier — it is the accent colour of this upgrade
branch in the game and appears next to the icon in the interface.

SILHOUETTE: the outline alone must identify it. Its sibling in the same tower
uses the opposite shape language (long against short, ring against burst, one
against many, split against merged) — the two must not be confusable in
outline.

FRAMING: fills about 88 percent of a 96x96 transparent canvas, centred, with
even margins on all four sides.
```

### 6.8.5 `symbol_zweig_cluster.png` — Mörser · Streubombe

Was der Zweig TUT: *Weiter Wirkradius, schnellere Folge, weniger Wucht je Treffer.*

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A single flat interface ICON, not an object in a world. One shell splitting into five small bomblets that fan out downward, seen from directly above: a small central body with five little rounded submunitions spreading in an arc around it.

OVERRIDES THE STYLE BLOCK ABOVE — read this, it contradicts three lines of it
on purpose: (1) LIGHT — there is NO sun and no cast shadow; the icon is flat.
(2) MATERIALS — the three material families do not apply; this is not an object
made of steel or glass, it is a printed symbol. (3) COLOUR — not "desaturated
base with one accent": the WHOLE icon is one hue. Everything else in the style
block still holds: transparency, margin, no text, no watermark, no glow.

CRITICAL — THIS IS AN ICON, NOT A MODEL: no ground, no shadow on a floor, no
perspective, no scene. Orthographic top-down. It is read at 22 x 22 points on
a phone, so it must survive being shrunk to a thumbnail: at most five separate
shapes, no shape thinner than one twentieth of the frame, no interior detail
that disappears below 22 points.

COLOUR: monochrome in #F08A3C on transparency, plus a darker shade of the same
hue for depth. NO second hue, no white highlights, no gradient across the whole
icon. The colour IS the identifier — it is the accent colour of this upgrade
branch in the game and appears next to the icon in the interface.

SILHOUETTE: the outline alone must identify it. Its sibling in the same tower
uses the opposite shape language (long against short, ring against burst, one
against many, split against merged) — the two must not be confusable in
outline.

FRAMING: fills about 88 percent of a 96x96 transparent canvas, centred, with
even margins on all four sides.
```

### 6.8.6 `symbol_zweig_breaker.png` — Mörser · Brecher

Was der Zweig TUT: *Enger Radius, gewaltige Wucht, durchschlägt schwere Panzerung.*

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A single flat interface ICON, not an object in a world. A single heavy armour-piercing shell driven point-first through a cracked armour plate, seen from directly above: the thick shell in the middle, the plate around it broken into four large angular pieces. Few, big shapes.

OVERRIDES THE STYLE BLOCK ABOVE — read this, it contradicts three lines of it
on purpose: (1) LIGHT — there is NO sun and no cast shadow; the icon is flat.
(2) MATERIALS — the three material families do not apply; this is not an object
made of steel or glass, it is a printed symbol. (3) COLOUR — not "desaturated
base with one accent": the WHOLE icon is one hue. Everything else in the style
block still holds: transparency, margin, no text, no watermark, no glow.

CRITICAL — THIS IS AN ICON, NOT A MODEL: no ground, no shadow on a floor, no
perspective, no scene. Orthographic top-down. It is read at 22 x 22 points on
a phone, so it must survive being shrunk to a thumbnail: at most five separate
shapes, no shape thinner than one twentieth of the frame, no interior detail
that disappears below 22 points.

COLOUR: monochrome in #D6564A on transparency, plus a darker shade of the same
hue for depth. NO second hue, no white highlights, no gradient across the whole
icon. The colour IS the identifier — it is the accent colour of this upgrade
branch in the game and appears next to the icon in the interface.

SILHOUETTE: the outline alone must identify it. Its sibling in the same tower
uses the opposite shape language (long against short, ring against burst, one
against many, split against merged) — the two must not be confusable in
outline.

FRAMING: fills about 88 percent of a 96x96 transparent canvas, centred, with
even margins on all four sides.
```

### 6.8.7 `symbol_zweig_fork.png` — Prisma · Verzweigung

Was der Zweig TUT: *Mehr Sprünge, kaum Abfall. Legt sich über eine ganze Kette.*

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A single flat interface ICON, not an object in a world. One beam entering from the bottom and splitting into four thin branches that spread toward the top, seen from directly above, drawn as sharp angular lightning-like segments of even thickness.

OVERRIDES THE STYLE BLOCK ABOVE — read this, it contradicts three lines of it
on purpose: (1) LIGHT — there is NO sun and no cast shadow; the icon is flat.
(2) MATERIALS — the three material families do not apply; this is not an object
made of steel or glass, it is a printed symbol. (3) COLOUR — not "desaturated
base with one accent": the WHOLE icon is one hue. Everything else in the style
block still holds: transparency, margin, no text, no watermark, no glow.

CRITICAL — THIS IS AN ICON, NOT A MODEL: no ground, no shadow on a floor, no
perspective, no scene. Orthographic top-down. It is read at 22 x 22 points on
a phone, so it must survive being shrunk to a thumbnail: at most five separate
shapes, no shape thinner than one twentieth of the frame, no interior detail
that disappears below 22 points.

COLOUR: monochrome in #B07CFF on transparency, plus a darker shade of the same
hue for depth. NO second hue, no white highlights, no gradient across the whole
icon. The colour IS the identifier — it is the accent colour of this upgrade
branch in the game and appears next to the icon in the interface.

SILHOUETTE: the outline alone must identify it. Its sibling in the same tower
uses the opposite shape language (long against short, ring against burst, one
against many, split against merged) — the two must not be confusable in
outline.

FRAMING: fills about 88 percent of a 96x96 transparent canvas, centred, with
even margins on all four sides.
```

### 6.8.8 `symbol_zweig_lens.png` — Prisma · Bündelung

Was der Zweig TUT: *Ein Sprung weniger, dafür ein Strahl, der wirklich wehtut.*

```
[STYLE-BLOCK EINFÜGEN]

SUBJECT: A single flat interface ICON, not an object in a world. Four thin beams converging from the edges into ONE thick beam that continues to the top, seen from directly above — the exact mirror of its sibling: many in, one out.

OVERRIDES THE STYLE BLOCK ABOVE — read this, it contradicts three lines of it
on purpose: (1) LIGHT — there is NO sun and no cast shadow; the icon is flat.
(2) MATERIALS — the three material families do not apply; this is not an object
made of steel or glass, it is a printed symbol. (3) COLOUR — not "desaturated
base with one accent": the WHOLE icon is one hue. Everything else in the style
block still holds: transparency, margin, no text, no watermark, no glow.

CRITICAL — THIS IS AN ICON, NOT A MODEL: no ground, no shadow on a floor, no
perspective, no scene. Orthographic top-down. It is read at 22 x 22 points on
a phone, so it must survive being shrunk to a thumbnail: at most five separate
shapes, no shape thinner than one twentieth of the frame, no interior detail
that disappears below 22 points.

COLOUR: monochrome in #FF7ADF on transparency, plus a darker shade of the same
hue for depth. NO second hue, no white highlights, no gradient across the whole
icon. The colour IS the identifier — it is the accent colour of this upgrade
branch in the game and appears next to the icon in the interface.

SILHOUETTE: the outline alone must identify it. Its sibling in the same tower
uses the opposite shape language (long against short, ring against burst, one
against many, split against merged) — the two must not be confusable in
outline.

FRAMING: fills about 88 percent of a 96x96 transparent canvas, centred, with
even margins on all four sides.
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

**Und v322 hat eine zweite Zahl gefunden, die dagegen spricht — sie steht
hier, weil eine Messung gegen eine Messung gehört und nicht gegen eine
Meinung.** `npm run browsertor` prüft seit v322, ob der Kristall ganz im Bild
liegt (`kristallSichtbar`):

| | gemessen |
|---|---|
| Abstand der Plattform zum Kartenrand | **186** (Spiralhain, Ascheschlucht, Farnkessel), **237** (Frostspalte) |
| Reichweite des Warnrings | **270** Weltpunkte (`r = 150 + not · 120` in `drawCrystal`) |
| es fehlen | **33 bis 84** Weltpunkte |

**Der Warnring ragt also aus der WELT heraus, nicht aus dem Bild** — keine
Kameraeinstellung holt ihn herein, auch die weiteste nicht (bei `fitScale` ist
die ganze Karte zu sehen, und dort ist er trotzdem draußen). Der KÖRPER der
Station (130 Weltpunkte Halbmesser) liegt seit v322 in allen vier Formaten des
Browsertores vollständig im Bild; das war die Kamerahälfte, und sie ist
erledigt.

**Was das für eine künftige Bestellung heißt, und nur dafür:** die
Zielplattform gehört **mindestens 270 Weltpunkte** vom nächsten Kartenrand
entfernt. Das ist eine Forderung an das nächste Kartenbild, kein Auftrag zum
Neumalen der drei vorhandenen — die Abwägung oben (Bahngeometrie gegen
Kartennutzung) gilt unverändert, und sie gegen eine zweite Messung
einzutauschen wäre dieselbe Vermutung, vor der sie warnt. **Vier Kartenbilder
neu zu bestellen ist eine Entscheidung des Nutzers**, nicht meine; solange sie
aussteht, meldet das Browsertor die fehlenden Weltpunkte bei jedem Lauf als
Hinweis und nicht als Fehler (K5).

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

**Die letzte Spalte ist die, nach der abgenommen wird** — `tools/auftrag.ts`
liest sie und `npm run kartenprobe` misst dagegen. Wer die Tabelle umsortiert,
bricht die Abnahme; das ist in v228 einmal passiert und blieb unbemerkt, weil
`kartenprobe` nicht in der Torkette steht. Seit v229 ruft `npm run guards` das
Lesen mit auf.

| Prüfung | Heute gemalt | Nach 8c erreicht | Gefordert |
|---|---|---|---|
| `npm run kartenprobe` Wegfreiheit | 79,9 (Asche) · 33,6 (Frost) | **3,0** (Spiralhain) · **2,1** (Farnkessel) | **≤ 25 Farbschritte** |
| `npm run zielplatte` Güte | — | **0,98** (Spiralhain) | **≥ 0,50** |
| Seitenverhältnis | 1,778 | 1,778 | **1,778 (16:9), 2400 × 1350** |
| `npm run gelaendetor` | grün | grün | **grün — jeder Fleck bleibt unwegsam** |
| Helligkeit / Sättigung / Detaildichte | im Band | im Band | **0,30–0,36 / 0,45–0,55 / 1,5–3,0** |
| Reines Schwarz | 0,0 % | 0,0 % | höchstens **2 %** |

**Die 25 sind nicht geraten**, und die Spalten daneben sind gemessen, nicht
geschätzt (06.09.2026). Der Farbabstand zwischen dem Streifen unter der Bahn
und dem Mittel der Karte misst an den heutigen, *gemalten* Straßen **79,9**
(Ascheschlucht) und **33,6** (Frostspalte) — die zweite ist die schwächste
gemalte Straße, die das Spiel hat, und schon sie liegt über der Grenze.

**Und die Grenze ist großzügig.** Die zwei Bilder, die nach 8c geliefert
wurden, kommen auf **3,0** und **2,1**. Wer wirklich keine Straße malt, landet
bei rund 3, nicht bei 24. Die 25 sind die Reißleine, nicht das Ziel.

### Was die erste Lieferung nach 8c gelehrt hat (v216)

Ein Bild nach diesem Auftrag ist geliefert und eingebaut (Spiralhain,
04.09.2026). Drei Dinge daran gehören in die nächste Bestellung:

1. **Die unwegsamen Flecken lagen alle acht falsch** — einer davon *unter der
   Zielplattform*, drei auf blanker Wiese. Das Spiel liest sie seit v216 mit
   `npm run gelaendesuche` aus dem Bild statt sie zu setzen, ihre genaue Lage
   darf sich also verschieben. **Was nicht verhandelbar ist:** im Umkreis von
   260 Weltpunkten um die Zielplattform darf keiner liegen, und jeder muss
   auch ohne Vorlage als unpassierbar zu erkennen sein. Ein Schattenfleck im
   Gras genügt nicht — drei Kriterien, ihn von einem Felsfeld zu trennen,
   sind gemessen gescheitert.
2. **Die Zielplattform muss der Sucher finden**, nicht nur das Auge.
   `npm run zielplatte` bewertet den gefundenen Punkt seit v216 mit einer
   Güte; die gelieferte kam auf 0,98, verlangt sind 0,50. Was sie so gut
   macht: erhabener Steinkranz, konzentrische Pflasterung, klar heller als
   der Boden ringsum. Eine blasse Scheibe reicht nicht.
3. **Die „NO ROAD"-Anweisung hat funktioniert**, und zwar deutlich (3,0 gegen
   erlaubte 25). Sie bleibt deshalb wörtlich stehen.

**Die Zielplattform bleibt, wo sie ist** — und das ist gemessen entschieden,
nicht durchgewinkt. Auf allen vier Karten liegt sie rund 780 Weltpunkte von
der Mitte und rund 180 vom nächsten Rand entfernt, und in v219 hat genau das
den Spiralhain gekostet: „Umweg ≥ 1,8" und „die ganze Karte benutzen" ziehen
gegeneinander, wenn sich jeder Umweg um eine Ecke wickeln muss. Nachgemessen
mit `npm run bahnentwurf` gilt das für diese beiden aber **nicht**:
Ascheschlucht **82 %** und Frostspalte **81 %** der Karte liegen näher als 300
Weltpunkte an einer Bahn, gegen 74 % beim Spiralhain. Eine Umbestellung ohne
Befund wäre eine Vermutung, und die kosten hier regelmäßig eine Runde.

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

### Kleine Kreise brauchen Genauigkeit (v232)

Der Frostspalten-Entwurf hat vier von zehn Kreisen leer gelassen — und zwar
**nicht**, weil das Eis fehlte, sondern weil es danebenlag: die vier kleinen
(Radius 32 bis 40) sind gemalt, aber **17 bis 21 Weltpunkte zu weit vom
Kreisrand**. Bei den vier grossen hat es gestimmt; die lagen 11 bis 68
Weltpunkte neben ihrer Mitte und damit sicher innerhalb.

Der Unterschied ist der Radius, nicht die Sorgfalt: ein grosser Kreis
verzeiht 60 Weltpunkte, ein kleiner keine 20. Der Prompt sagt das jetzt
eigens — unter etwa 50 Weltpunkten Radius muss das Hindernis **im** Kreis
sitzen, nicht in seiner Nähe.

**Gerichtet wird das auf unserer Seite, nicht per Nachbestellung.** Jede
Erzeugung ist ein frisches Bild, kein Nachbessern: ein neuer Entwurf tauschte
sieben bestandene Zahlen gegen ein Glücksspiel. Vier Kreise um rund 50
Weltpunkte zu verschieben ist dagegen bestimmt — und es ist ohnehin die
Richtung, in die dieses Projekt seit v216 arbeitet: das Bild lesen
(`npm run gelaendesuche`), nicht dem Bild vorschreiben.

### Die Auflösung ist keine Ablehnung mehr wert (v231)

Zwei Kandidaten kamen mit **exakt** 1672 × 941. Die Bildfunktion des Malers
lässt die Größe nicht gezielt einstellen — das ist eine Werkzeuggrenze, keine
Nachlässigkeit.

**Entscheidend ist, dass alle Abnahmezahlen am GEBACKENEN Bild gemessen sind,
also nach dem Hochrechnen auf 2400.** Der zweite Kandidat hält sie mit
Abstand: Wegfreiheit 1,3 (erlaubt 25), Zielplattform-Güte 0,96 (verlangt
0,50), Detaildichte 1,86 im Band 1,5–3,0. Ein Bild, das durch den Bau geht
und dort besteht, an seiner Quellauflösung abzulehnen hiesse, die Messstelle
gegen die Vermutung zu tauschen (Regel 12).

Der Auftrag verlangt deshalb 2400 × 1350, **wenn das Werkzeug es kann**, und
sonst das größtmögliche 16:9. Nicht verhandelbar bleibt die FORM: ein 3:2-
oder 4:3-Bild kommt sichtbar verzerrt an.

### Ein Auftrag darf nicht fordern, was sein eigenes Blatt bestreitet (v230)

Der Maler hat den ersten Entwurf dieser Bestellung **zurückgefragt**, und zu
Recht: der Prompt verlangte, dass kein unwegsamer Fleck der Zielplattform
näher als eine Plattformbreite kommt — das Referenzblatt zeigt aber Kreise,
die deutlich näher liegen.

Nachgemessen ist die engste Lücke zur Plattformkante **40 Weltpunkte**
(Ascheschlucht) und **64** (Frostspalte); sechs Kreise über beide Karten
liegen unter der geforderten Plattformbreite. Der Auftrag war falsch, nicht
das Blatt.

**Woher der Fehler kam:** der Wächter in `npm run guards` verlangt, dass kein
Fleck **in** die Platte ragt — 130 Weltpunkte Radius, kein Zuschlag. Beim
Schreiben des Prompts habe ich daraus „eine Plattformbreite Abstand" gemacht,
also eine viel strengere Forderung, die die Daten nie erfüllt haben. **Eine
Zahl im Auftrag muss dieselbe sein wie die im Tor**, sonst widerspricht die
Bestellung ihrer eigenen Anlage.

Der Prompt sagt jetzt, was gilt: die Kreise sind verbindlich, das Gelände
bleibt **innerhalb** seines Kreises, und über die Plattformkante darf nichts.
Die enge Lage ist ausdrücklich als gemessen und gewollt benannt, damit sie
nicht beim nächsten Mal wieder als Fehler zurückkommt.

### Was der zweite Kandidat gelehrt hat (v230, Ascheschlucht)

Ein Kandidat für die Ascheschlucht ist eingebaut, gebacken, gemessen und
wieder ausgebaut worden (06.09.2026). **Er ist inhaltlich näher dran als
erwartet**, und drei Vermutungen von mir waren gemessen falsch:

| Prüfung | Kandidat | Gefordert | |
|---|---|---|---|
| Wegfreiheit | **17,0** | ≤ 25 | bestanden, aber siehe unten |
| Lage der Zielplattform | Welt 1729:454 | 40 Weltpunkte um 1747:480 | **31 daneben** — getroffen |
| Plattform gegen Umgebung | 70 Farbschritte | deutlich | getroffen |
| Detaildichte | **2,25** | 1,5–3,0 | getroffen — *ruhiger* als das heutige Bild (2,84) |
| Helligkeit | 0,30 | 0,30–0,36 | getroffen |
| Reines Schwarz | 0,1 % | ≤ 2 % | getroffen |
| **Auflösung** | **1672 × 941** | 2400 × 1350, sonst größtmögliches 16:9 | **angenommen** — siehe unten |
| `zielplatte` Güte | **0,44** | ≥ 0,50 | durchgefallen — siehe unten |

**Ich hielt das Bild für zu unruhig. Es ist ruhiger als das, was heute im
Spiel steht** (2,25 gegen 2,84). Regel 8 in die andere Richtung: der Blick
irrt auch.

Vier Dinge gehen daraus in den Auftrag:

1. **Die Auflösung muss in den Prompt selbst.** Sie stand nur im
   Ausgabe-Block am Ende, und der Kandidat kam mit 70 % der Breite. Der
   Packer bäckt auf 2400 — er würde hochrechnen.
2. **Waagerechte Bänder lesen sich wie ein Weg.** Die 17,0 kommen nicht von
   einer gemalten Straße, sondern von helleren Aschebändern, die quer durch
   die Bildmitte laufen — also in Laufrichtung. Die zwei ausgelieferten
   8c-Bilder stehen bei 3,0 und 2,1. Verlangt wird jetzt ausdrücklich
   **richtungslose, fleckige Variation**: nichts, was von Rand zu Rand
   durchläuft.
3. **Unwegsames Gelände NUR an den markierten Kreisen.** Der Kandidat hat
   deutlich mehr Fels- und Glutnester als das Blatt Kreise (elf), und
   mehrere liegen dort, wo die Bahn verläuft. Im Spiel läuft der Gegner
   darüber und man darf darauf bauen — das Bild lügt dann. Loser Schotter
   ohne Höhe ist erlaubt, alles mit Schattenwurf oder Glut nicht.
4. **Die Plattform braucht einen eigenen Farbton, nicht nur mehr
   Helligkeit.** `npm run zielplatte` sucht mit einer Farbschwelle; auf
   grauem Aschefeld fällt heller Schotter in dieselbe Schwelle wie graues
   Pflaster, und dann hebt sich nichts mehr ab (Güte 0,44 gegen 0,50). Auf
   dem braunen Waldboden ging es (0,98). **Das ist zuerst eine Schwäche des
   Werkzeugs** — es sollte den erhabenen Kranz suchen statt eine Farbe, und
   das steht als eigener Punkt an. Bis dahin hilft dem Bild wie dem Sucher
   dasselbe: heller **Sandstein statt Grau**, dazu eine dunkle Fuge rings um
   den Kranz.

### 8c.2 `13_aschebreit.png` — Ascheschlucht, Aschefeld **ohne Weg**

```
[STYLE-BLOCK EINFÜGEN]

IGNORE the BACKGROUND and MARGIN lines of the style block: this is a
full-bleed terrain map, not a cut-out asset. It has no transparency and no
margin; the terrain runs to all four edges.

SIZE: 2400 x 1350 pixels is what the game bakes to, so deliver that if your
tool lets you set it. If it does not, deliver the largest 16:9 image it can
produce and say so — 1672 x 941 has been measured all the way through the
bake and passes every acceptance number, so it is accepted rather than
rejected. What is NOT negotiable is the 16:9 shape: a 3:2 or 4:3 image
arrives visibly stretched.

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

NO DIRECTIONAL BANDING either, and this is the part that was missed. The
variation in the ground must be PATCHY and without direction — blotches, not
currents. Nothing may run from one edge towards the other: no flow lines, no
sweeping lighter bands, no wind streaks, no drift patterns sharing a common
axis. A candidate had no painted road at all and still failed this, because
pale bands ran horizontally through the middle of the image and read as a
route. Squint at your own image: if you can trace any elongated lighter or
darker shape for more than about a fifth of the image width, remove it.

GOAL PLATFORM — the one exception, and it is required: a single round paved
platform at the position marked by the BLUE ring on the accompanying
reference sheet, about 260 world points across (roughly one seventh of the
image width). Fitted stone with a raised kerb, a dark shadowed joint all the
way round it, and concentric paving inside. It is round and isolated: no
road, track or paved apron leads to or away from it. The player's fortress is
placed on it by the game.

The platform must differ from the ground in HUE, not only in brightness:
warm pale sandstone against the cold grey ash. A software check locates it in
the delivered image and scores how clearly it stands out — it compares COLOUR, so a paler
version of the ground fails even when a human eye sees the platform at once.
A candidate used grey stone on grey ash and scored 0.44 where 0.50 is
required.

ROUGH GROUND: at the circles marked on the accompanying reference sheet, and
only there, ground that reads as impassable — basalt outcrops, collapsed
crust, an open fissure. These MUST be in the image; the game no longer draws
them. Each one must read as impassable ON ITS OWN, without the reference
sheet: a darker patch of ash is not enough, it needs relief and a hard silhouette.

SMALL CIRCLES NEED PRECISION. For a circle under about 50 world points of
radius, the obstacle must sit INSIDE it — near is not good enough. In an
earlier delivery the four large formations landed on their circles, but four
small ones were painted 17 to 21 world points beyond the circle's edge, and
at that size the circle then reads as empty. The large ones may sit anywhere
within their circle; the small ones have no room to spare.

THE CIRCLES ARE BINDING, and where one sits close to the platform that is
deliberate: the nearest circle clears the platform's kerb by about 40 world
points, and it has been measured. Do not move it, do not shrink it, do not
leave it out. What matters is that the rough ground stays INSIDE its circle
and never spills over the kerb — an earlier delivery had one sitting directly
on the platform. Where a circle is this close, keep the visual weight of the
rock towards the far side of it, so the kerb stays clean.

NOTHING ELSE MAY LOOK IMPASSABLE, and this is new. Outside the marked circles
the ground must read as walkable and buildable everywhere: the game lets the
player build there and walks enemies across it, so a rock nest painted
off-circle makes the picture lie. Flat gravel, cracks, colour variation and
scorch marks are welcome anywhere. Anything with height, a cast shadow or
glowing lava belongs ONLY inside a marked circle. A candidate had roughly
twice as many rock nests as the sheet has circles, several of them right
where the route runs.

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

SIZE: 2400 x 1350 pixels is what the game bakes to, so deliver that if your
tool lets you set it. If it does not, deliver the largest 16:9 image it can
produce and say so — 1672 x 941 has been measured all the way through the
bake and passes every acceptance number, so it is accepted rather than
rejected. What is NOT negotiable is the 16:9 shape: a 3:2 or 4:3 image
arrives visibly stretched.

SUBJECT: A top-down terrain map, 2400x1350, seen straight from directly
above — no perspective, no horizon, no sky. A frozen plain: wind-packed snow
over blue-grey ice, shallow drifts, sparse frost-killed scrub.

NO ROAD. NO PATH. This is the single most important instruction in this
brief, and it is the opposite of what such a map usually wants. Do not paint
a road, a track, a trail, a worn line, a cleared lane or any elongated
lighter or darker strip anywhere on the image. The game draws its own road on
top of this picture, and any painted one would sit next to it and contradict
it. The ground is continuous from edge to edge.

NO DIRECTIONAL BANDING either, and this is the part that was missed. The
variation in the ground must be PATCHY and without direction — blotches, not
currents. Nothing may run from one edge towards the other: no flow lines, no
sweeping lighter bands, no wind streaks, no drift patterns sharing a common
axis. A candidate had no painted road at all and still failed this, because
pale bands ran horizontally through the middle of the image and read as a
route. Squint at your own image: if you can trace any elongated lighter or
darker shape for more than about a fifth of the image width, remove it.

GOAL PLATFORM — the one exception, and it is required: a single round paved
platform at the position marked by the BLUE ring on the accompanying
reference sheet, about 260 world points across (roughly one seventh of the
image width). Fitted stone with a raised kerb, a dark shadowed joint all the
way round it, and concentric paving inside. It is round and isolated: no
road, track or paved apron leads to or away from it. The player's fortress is
placed on it by the game.

The platform must differ from the ground in HUE, not only in brightness:
warm brown-grey stone against the blue-white snow. A software check locates it
in the delivered image and scores how clearly it stands out — it compares COLOUR, so a paler
version of the ground fails even when a human eye sees the platform at once.
A candidate used grey stone on grey ash and scored 0.44 where 0.50 is
required.

ROUGH GROUND: at the circles marked on the accompanying reference sheet, and
only there, ground that reads as impassable — ice ridges, an open crevasse,
deep drifts. These MUST be in the image; the game no longer draws them. Each
one must read as impassable ON ITS OWN, without the reference sheet: a bluish
patch of snow is not enough, it needs relief and a hard silhouette.

SMALL CIRCLES NEED PRECISION. For a circle under about 50 world points of
radius, the obstacle must sit INSIDE it — near is not good enough. In an
earlier delivery the four large formations landed on their circles, but four
small ones were painted 17 to 21 world points beyond the circle's edge, and
at that size the circle then reads as empty. The large ones may sit anywhere
within their circle; the small ones have no room to spare.

THE CIRCLES ARE BINDING, and where one sits close to the platform that is
deliberate: the nearest circle clears the platform's kerb by about 64 world
points, and it has been measured. Do not move it, do not shrink it, do not
leave it out. What matters is that the rough ground stays INSIDE its circle
and never spills over the kerb — an earlier delivery had one sitting directly
on the platform. Where a circle is this close, keep the visual weight of the
rock towards the far side of it, so the kerb stays clean.

NOTHING ELSE MAY LOOK IMPASSABLE, and this is new. Outside the marked circles
the ground must read as walkable and buildable everywhere: the game lets the
player build there and walks enemies across it, so a rock nest painted
off-circle makes the picture lie. Flat gravel, cracks, colour variation and
scorch marks are welcome anywhere. Anything with height, a cast shadow or
glowing lava belongs ONLY inside a marked circle. A candidate had roughly
twice as many rock nests as the sheet has circles, several of them right
where the route runs.

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

---

## 8d. Der Neubau — **Stilblock Neubau** und die erste Karte (v277)

**Der Beschluss steht in `docs/Towerfront-NEUBAU.md` Abschnitt 3.3:** leichte
Schrägsicht, gemalt; industriell, dunkler Grund, leuchtende Akzente. Dieser
Abschnitt macht daraus eine Bestellung — und er tut es erst jetzt, weil drei
Runden Messung nötig waren, um die Zahlen ehrlich hinschreiben zu können.

### Was diese Bestellung von 8b und 8c unterscheidet

**Der Grund wird dunkel — und das ist gemessen, nicht Geschmack.** Die
Begründung im Beschluss lautete „Figuren verschwinden auf hellem Boden". Bis
v273 konnte kein Werkzeug das bestätigen: `npm run lesbarkeit` rechnete gegen
das gepackte **Rohbild** des Untergrunds statt gegen das gebackene Terrain und
sah die Helligkeit des Bodens gar nicht. Seit der Reparatur steht der
Durchlauf da (`BODEN_HELL` durchprobiert):

| gebackener Boden | Figuren mit Kante unter 1,5 | schwächste Kante |
|---|---|---|
| **0,355** (heute) | **20 von 20** | 1,10 |
| 0,30 | 14 von 20 | 1,27 |
| 0,24 | **1 von 20** | 1,49 |
| 0,18 | **0 von 20** | 1,74 |

Ein dunklerer Grund repariert die Lesbarkeit jeder einzelnen Figur, **ohne
dass ein Bild angefasst wird**.

**Aber der Weg ist nicht der Boden, und das kehrt die Hälfte der Abhilfe um.**
Seit v276 misst `lesbarkeit` beide Flächen getrennt, und sie gehen in beide
Richtungen auseinander:

| Karte | Boden | Weg |
|---|---|---|
| Spiralhain | 7,0 % | **2,4 %** — dreimal dunkler |
| Ascheschlucht | 7,2 % | **14,2 %** — doppelt so hell |
| Frostspalte | 7,6 % | **14,0 %** |
| Farnkessel | 7,3 % | 5,1 % |

**14 von 20 Figuren** liegen im Körperkontrast unter dem Soll — und **jede
einzelne davon gegen einen Weg**, keine gegen einen Boden. Der schlechteste
ist der Mörser mit **1,00** gegen die Frostspalte: exakt die Helligkeit des
Untergrunds, auf dem er steht.

**Was daraus für diese Bestellung folgt, ist eine Abgrenzung — und sie muss
hier stehen, damit niemand das Falsche bestellt:** seit 8c malt keine Karte
mehr eine Straße. Der Weg kommt aus `pal.path` in `src/data/maps.ts`, also von
**uns**, nicht vom Bild. Der Bild-Agent liefert allein den **Boden**; ob Weg
und Figuren sich vertragen, ist eine Palettenfrage und wird im Code
entschieden. Wer beides in einen Auftrag schreibt, bekommt eine gemalte Straße
zurück — dreimal passiert.

### 8d.0 Der Stilblock Neubau

**Er ersetzt den globalen Stil-Block aus Abschnitt 1 nicht, er tritt neben
ihn.** Der alte gilt für den ausgelieferten Bildvorrat, der weiter im Spiel
steht; der neue für alles, was ab v277 bestellt wird. Zwei Blöcke sind hier
kein Regel-15-Verstoß, sondern zwei verschiedene Gegenstände — und sie sind
mechanisch getrennt: die alten Prompts tragen `[STYLE-BLOCK EINFÜGEN]`, die
neuen `[STILBLOCK NEUBAU EINFÜGEN]`, und `npm run bildprompt` bricht ab, wenn
ein Platzhalter im Ergebnis stehen bleibt.

```
STYLE: Industrial near-future, painted. Dark ground, few bright accents. Hand
painted game art in the manner of a high-end tower-defense map, NOT a 3D
render, NOT photobashed, NOT cel-shaded with outlines.

CAMERA — read this twice, it is the most common mistake. A LOW OBLIQUE view,
roughly 20 degrees off vertical: almost a plan view, tilted just enough that
walls, rocks and machinery show a sliver of their side and cast a short
shadow. It is NOT isometric, NOT a 45-degree bird view, NOT a horizon shot.
Nothing may lean or converge: no perspective vanishing point, no foreshortening
across the canvas, no visible horizon, no sky. A rectangle drawn on the ground
in the top-left corner must have the same size and shape as the same rectangle
in the bottom-right corner. The tilt lives in the OBJECTS, not in the ground
plane.

GROUND VALUE: dark. The overall brightness of the terrain sits around 20
percent, and the game does NOT brighten it afterwards. Think night-time
industrial yard under working lights, not a sunlit field. Keep it dark
without going black: the darkest areas still read as a dark grey-brown around
10 percent, never near-black.

ACCENTS: a handful of small, saturated, GLOWING elements - warning strips,
coolant lines, lit windows, indicator lamps - covering at most about five
percent of the canvas. They are what makes the picture readable. Paint them
as bright surfaces, NOT as glow: no bloom, no halo, no light bleeding onto
the surrounding ground. The game bakes its own glow over the picture, and a
painted one would sit there twice.

LIGHT: a single sun from the UPPER LEFT, roughly 130 degrees. Soft key light,
gentle ambient fill. No rim light - the game adds it per map. No lens flare.

FLAT LIGHTING ACROSS THE CANVAS: no vignette, no corner darkening, no
spotlight in the centre. The corners must be as bright as the middle. The
game lays its own atmosphere over the picture.

CALM SURFACES: large readable shapes, few but deliberate details. Panel
lines, hatches, weld seams and vents are allowed; surface grime, rivet
fields, scratched micro-texture and noise are NOT. Variation in the ground
must be BLOTCHY AND DIRECTIONLESS - no bands, no streaks, no stripes running
across the field. A directional pattern reads as a road, and this map must
not contain one.

NO OUTLINES: do not draw a dark contour line around objects or around
individual plates. Shapes are separated by value and by light, the way a
painting does it.

MATERIALS: painted steel, concrete, rust, glass and lit optics, rubber and
cable. No fantasy stone, no wood, no crystal, no vegetation as the main
surface.
```

**Warum jede Zeile dort steht — jede ist gemessen:**

| Zeile | Grund | Messstelle |
|---|---|---|
| „low oblique, 20 degrees, no vanishing point" | Die Weltkoordinaten bleiben flach. Eine echte Projektion entwertet `bahnmass`, `bauflaeche`, `wegdeckung`, `gedraenge`, `beruehrung`, `zielplatte` und `einbettung` in einem Zug | `docs/Towerfront-NEUBAU.md` 3.3 |
| „ground around 20 percent, not brightened afterwards" | Bei 0,24 fällt die Zahl der unlesbaren Figuren von 20 auf 1, bei 0,18 auf 0 | `npm run lesbarkeit`, Durchlauf oben |
| „darkest still around 10 percent, never near-black" | Reines Schwarz höchstens 2 % der Fläche | `npm run grafik` |
| „accents at most five percent" | Ein dunkler Grund trägt nur wenige helle Flächen, sonst kippt die mittlere Helligkeit zurück nach oben | `npm run grafik`, Untergrundhelligkeit |
| „paint them as surfaces, not as glow" | Regel 11: alles Leuchten wird gebacken. Ein mitgeliefertes läge doppelt und käme aus der falschen Richtung | `npm run einbettungstor` |
| „single sun, upper left, ~130°" | Das Spiel wirft jeden Schatten aus `LICHT` = −128° | `npm run grafik`, „Lichtrichtung" |
| „no rim light" | Das Randlicht backt das Spiel selbst (v156) | `npm run einbettungstor` |
| „no vignette, corners as bright as the middle" | Das Spiel legt Bodennebel und Wetterton selbst auf; ein gebackener läge zweimal | `npm run wegdeckung`, „im Bild" gegen „gebacken" |
| „blotchy and directionless, no bands" | Die 17,0 Wegfreiheit des ersten Ascheschlucht-Kandidaten kamen von **waagerechten Aschebändern in Laufrichtung**, nicht von einer gemalten Straße | `npm run kartenprobe`, v230 |
| „calm surfaces, no noise" | Detaildichte im Band 1,5–3,0; Figuren trugen einmal 5,1-mal so viel Feindetail wie der Untergrund | `npm run grafik` · `npm run probebild` |
| „no outlines" | Die zweite Probelieferung war cel-shaded und lag bei 14,3–25,2 % reinem Schwarz | `npm run probebild` |

### 8d.1 `20_werkhof.png` — Werkhof, die erste Karte im neuen Stil

**Ersetzt den Spiralhain**, und die Wahl ist gemessen: sein Weg ist mit 2,4 %
der dunkelste des Spiels und damit der schlechteste Fall für die Lesbarkeit —
dreimal dunkler als sein eigener Boden.

**Maße im Prompt selbst**, nicht nur im Ausgabe-Block: 2400 × 1350, exakt
16:9. Das war der Fund aus v230 — was nur unten steht, wird überlesen.

```
[STILBLOCK NEUBAU EINFÜGEN]

SUBJECT: a top-down industrial yard, 2400 x 1350 pixels, exactly 16:9,
filling the whole canvas edge to edge.

An abandoned heavy-industry site seen from almost directly above: poured
concrete aprons, rusted steel decking, low machine housings, cable runs,
drainage channels, spoil heaps of dark gravel. Everything is dark and matt.
A handful of small fittings still have power - amber warning strips along a
gantry, a few lit portholes in a machine housing, a cyan coolant line - and
they are the only saturated colour in the picture.

NO PATH, NO ROAD, NO TRACK. This is the single most important requirement of
this order. Do not paint a route, a lane, a walkway, a cleared strip, a
paved corridor or anything else that reads as somewhere to walk. The game
draws its own path over this picture, and a painted one underneath would
contradict it. The ground runs evenly across the whole surface.

IMPASSABLE GROUND belongs in the picture, and only where the reference sheet
marks a red ring: collapsed structures, deep pits, stacked containers, tanks.
Nowhere else. In the game a unit walks straight over anything that is not
marked, and then the picture is lying.

THE TARGET PLATFORM belongs in the picture where the reference sheet marks
the blue circle: a raised circular platform, roughly 260 pixels across, with
its own colour - cooler and lighter than everything around it - and a clearly
raised rim. It must read as a disc from above, not as a flat painted mark.

[AUSGABE-BLOCK EINFÜGEN]
```

### Abnahme 8d

Gemessen wird mit `npm run kartenprobe -- <datei>`; die Grenzen für
Wegfreiheit, Seitenverhältnis und Zielplatte stehen **einmal** in Abschnitt 8c
und gelten unverändert weiter (Regel 15). Neu ist allein die Helligkeit:

| Prüfung | heute | Gefordert nach 8d |
|---|---|---|
| Gebackener Boden, Helligkeit | 0,26–0,32 | **0,18–0,24** |
| Figuren mit Kante unter 1,5 | 20 von 20 | **höchstens 2 von 20** |
| Anteil gesättigter Akzente | — | **höchstens 5 % der Fläche** |

**Die erste Zeile ist noch keine Abnahme, sondern eine Ankündigung**, und das
gehört dazu: `BODEN_HELL` steht heute auf 0,355 und zieht **jeden** Boden
dorthin. Es zu senken verschiebt `grafiktor` (Bodenband 0,30–0,36),
`wegdeckung` (Weg gegen Boden 40–90 Farbschritte), `kristall` und `einbettung`
in einem Zug — das ist eine eigene Runde und steht als **S-N5-07** aus. Käme
das Bild vorher, würde es beim Backen wieder aufgehellt, und die Bestellung
wäre umsonst.

### 8d.2 `31_foerderer.png` — der Förderer, das erste Gebäude ohne Waffe

**Warum er anders aussehen muss als jeder Turm**: er ist das einzige Bauwerk
des Spiels, das nicht schiesst. Wer ihn für einen Turm hält, wartet auf Feuer,
das nie kommt — und hält ihn für kaputt. Die Silhouette muss das auf den
ersten Blick sagen: **kein Rohr, kein Lauf, keine Kuppel, keine Richtung.**

**Maße im Prompt selbst** (v230): 512 × 512, quadratisch, freigestellt auf
Transparenz.

```
[STILBLOCK NEUBAU EINFÜGEN]

SUBJECT: a single industrial extraction building seen from above at a slight
angle, 512 x 512 pixels, square, isolated on full transparency with no
background and no ground shadow - the game bakes its own shadow.

A squat, wide processing plant: a low drum or hopper on a poured base, ore
chutes, a conveyor stub that ends after half a metre, coolant piping, a
collection sump. It is clearly WORKING - a faint amber glow inside the
hopper, one lit gauge - but it is just as clearly UNARMED.

NO WEAPON OF ANY KIND. This is the single most important requirement of this
order. No barrel, no muzzle, no turret ring, no dish, no dome, no aimed
device, nothing that points anywhere. Every other building in this game
shoots; this one is the only one that does not, and a player who mistakes it
for a gun will wait for fire that never comes. Its silhouette must say
"machine that processes" and never "machine that aims".

It reads as WIDE AND LOW, not tall: the four gun towers of this game are
vertical, and this one has to be recognisable as a different kind of thing
from across the field, at roughly 96 pixels on screen.

The saturated accent is amber and it belongs to the material being processed
- inside the hopper, along the chute lip - not to a sight or a sensor.

[AUSGABE-BLOCK FIGUR EINFÜGEN]
```

### Abnahme 8d.2

Gemessen wird mit `npm run probebild -- <ordner>`; die Grenzen für Format,
Alpha, Rand, reines Schwarz, Feindetail und Lichtwinkel stehen **einmal** in
Abschnitt 5 und gelten unverändert (Regel 15).

| Prüfung | Gefordert | Womit |
|---|---|---|
| Silhouetten-Abstand zu den vier Türmen | Überdeckung **höchstens 0,60** | `npm run probebild` |
| Breiter als hoch | Verhältnis **mindestens 1,15** | `npm run probebild` |
| Anteil gesättigter Akzente | höchstens 5 % der Fläche | Stilblock 8d |

**Der Silhouetten-Abstand ist die eigentliche Abnahme, und er ist strenger
als der übliche.** Für zwei Gegnerarten gilt 0,65; hier sind es 0,60, weil
der Unterschied nicht „zwei Arten derselben Rolle" ist, sondern „schiesst"
gegen „schiesst nicht". Der ausgelieferte Gegnersatz verletzt seine eigene
0,65-Regel gemessen achtmal (Abschnitt 4.3) — ein Bild, das erst nach der
Lieferung gemessen wird, hält seine Grenze nicht von selbst.

**Bis das Bild da ist, baut das Spiel gegen den Platzhalter** (K5), und
`npm run bildtor` nennt `foerderer_1_1` bei jedem Lauf als offene Bestellung.
Der Platzhalter ist erkennbar: Silhouette in der richtigen Grösse, Schraffur,
Marke #FF00E5.

### 8d.3 `32_werft.png` — die Werft, das zweite Gebäude ohne Waffe

**Warum sie weder wie ein Turm noch wie der Förderer aussehen darf.** Sie ist
das zweite Bauwerk, das nicht schiesst — und damit ist der Silhouetten-Abstand
diesmal doppelt gefordert: gegen die vier Türme *und* gegen den Förderer. Wer
sie für den Förderer hält, baut sie für Gold und bekommt Kristall; das ist
ärgerlicher als eine Verwechslung mit einem Turm, weil beide unbewaffnet sind
und beide „arbeiten".

**Der Unterschied ist die Richtung der Arbeit.** Der Förderer holt heraus —
Trichter, Rutsche, Sumpf, alles nach unten offen. Die Werft **setzt
zusammen**: ein Gerüst über einem Werkstück, Greifarme, ein Schweisspunkt.
Das ist im Bild zu sehen, ohne dass ein Wort dabeisteht.

**Maße im Prompt selbst**: 512 × 512, quadratisch, freigestellt auf
Transparenz.

```
[STILBLOCK NEUBAU EINFÜGEN]

SUBJECT: a single industrial repair gantry seen from above at a slight angle,
512 x 512 pixels, square, isolated on full transparency with no background and
no ground shadow - the game bakes its own shadow.

An open framework cradle standing over a workpiece: two articulated arms
reaching inward and DOWN toward a fragment held in the middle of the cradle,
a welding point where one arm meets it, spools of filament, a rack of spare
plating along one side. It is clearly WORKING - a small cold-blue arc at the
weld, one lit gauge - and just as clearly UNARMED.

NO WEAPON OF ANY KIND. No barrel, no muzzle, no turret ring, no dish, no
dome, nothing that points outward or aims across the field. Both arms point
INWARD, at the piece being mended. Every gun in this game aims away from
itself; this machine aims at its own centre, and that difference must be
readable in the silhouette alone.

It must also read as a DIFFERENT KIND OF MACHINE than the extraction plant
already in this set: that one is a closed squat drum with chutes pointing
down and out, this one is an OPEN CAGE with arms pointing in. Closed and
squat versus open and reaching - not two versions of the same shed.

The saturated accent is cold blue and it belongs to the weld and the mended
seam - not to a sight or a sensor. Amber is reserved for the extraction
plant; do not use it here.

[AUSGABE-BLOCK FIGUR EINFÜGEN]
```

### Abnahme 8d.3

Gemessen wird mit `npm run probebild -- <ordner>`; Format, Alpha, Rand, reines
Schwarz, Feindetail und Lichtwinkel stehen **einmal** in Abschnitt 5 und
gelten unverändert (Regel 15).

| Prüfung | Gefordert | Womit |
|---|---|---|
| Silhouetten-Abstand zu den vier Türmen | Überdeckung **höchstens 0,60** | `npm run probebild` |
| Silhouetten-Abstand zum Förderer | Überdeckung **höchstens 0,55** | `npm run probebild` |
| Offene Form | Anteil durchsichtiger Punkte **innerhalb** des Umrisses mindestens 18 % | `npm run probebild` |
| Anteil gesättigter Akzente | höchstens 5 % der Fläche | Stilblock 8d |

**Die 0,55 gegen den Förderer sind strenger als alles andere in diesem
Dokument, und das ist begründet.** Gegen einen Turm trennt schon „schiesst
nicht"; gegen den Förderer trennt nur noch die Form der Arbeit, und die ist
das Einzige, woran ein Spieler die beiden im Feld unterscheidet.

**Die offene Form ist die Abnahme, die man nicht diskutieren muss.** Ein
Gerüst hat Löcher, ein Trichter nicht — und ein Anteil durchsichtiger Punkte
innerhalb des Umrisses misst genau das, ohne dass jemand „wirkt offen genug"
sagen muss (Regel 8 arbeitet hier für uns, nicht gegen uns).

---

### 8d.4 `33_sanitaeter.png` — der Sanitäter, die erste Gegnerart, die *gibt*

**Warum er anders aussehen muss als die anderen acht.** Alle bisherigen Gegner
sind Ziele: man schiesst sie der Reihe nach ab, und die Reihenfolge ist
gleichgültig. Der Sanitäter stellt die Lebenspunkte seiner Nachbarn wieder
her, solange er lebt — wer ihn stehen lässt, kommt gegen den Pulk nicht an.
**Das muss die Silhouette auf 22 Bildschirmpunkten sagen**, sonst ist er
dieselbe Überraschung wie ein Schildträger ohne Ring.

Er ist **kein Kämpfer**: keine Waffe, kein Rohr, kein Geschützturm. Was er
trägt, arbeitet nach hinten und nicht nach vorn — Tanks, Schläuche, eine
Auslegerarm-Andeutung, ein Kran.

**Maße im Prompt selbst** (v230): 512 × 512, quadratisch, freigestellt auf
Transparenz.

```
[STILBLOCK NEUBAU EINFÜGEN]

SUBJECT: a single unarmed field-repair vehicle of the invading faction, seen
from directly above (top-down), 512 x 512 pixels, square, isolated on full
transparency with no background and no ground shadow - the game bakes its own
shadow.

It is a tracked or six-wheeled service rig, WIDER and LOWER than the other
vehicles of this faction: fluid tanks along both flanks, a coiled hose reel,
a short articulated arm folded back over the hull, a pair of clamps. Nothing
on it points forward. There is NO weapon of any kind - no barrel, no muzzle,
no turret, no aimed device. Every other vehicle in this faction shoots; this
one is the only one that does not.

Its one saturated accent is a cold violet-tinted glow and it belongs to the
REPAIR APPARATUS - the fluid in the tanks, the tip of the arm, the hose
coupling - never to a sight or a sensor. The accent should read as "something
is being given out here", not "something is aiming".

The silhouette must be clearly distinguishable from the armoured brute and
the splitter of the same faction at a glance: those are compact and angular,
this one is wide, open and cluttered with equipment - the outline should have
gaps in it where the arm and the reel stand off the hull.
```

[AUSGABE-BLOCK FIGUR EINFÜGEN]

### Abnahme 8d.4

Gemessen wird mit `npm run probebild -- <ordner>`; Format, Alpha, Rand, reines
Schwarz, Feindetail und Lichtwinkel stehen **einmal** in Abschnitt 5 und
gelten unverändert (Regel 15).

| Prüfung | Gefordert | Womit |
|---|---|---|
| Silhouetten-Abstand zu den acht Gegnern | Überdeckung **höchstens 0,60** | `npm run probebild` |
| Offene Form | Anteil durchsichtiger Punkte **innerhalb** des Umrisses mindestens 15 % | `npm run probebild` |
| Breite auf dem Bildschirm | mindestens 13 px | `npm run lesbarkeit` |
| Kante gegen den Untergrund | mindestens 1,5 | `npm run lesbarkeit` |
| Anteil gesättigter Akzente | höchstens 5 % der Fläche | Stilblock 8d |

**Die Kante von 1,5 ist seit v326 keine Wunschzahl mehr, sondern der Stand:**
alle zwanzig heutigen Figuren liegen darüber, und die Ratsche in
`npm run lesbarkeit` steht auf null. Eine Lieferung, die darunter bleibt,
macht das Tor rot — das ist gewollt.

---

### 8d.5 `34_hetzer.png` — der Hetzer, die schnellste Figur des Spiels

**Warum er auf den ersten Blick als schnell zu erkennen sein muss.** Seit v280
stellt der Spieler Weichen, und die Route ist damit eine Entscheidung; der
Hetzer ist der Gegner, der sie bestraft. Wer seine Türme für die lange Route
gestellt hat, sieht ihn auf der kurzen durchlaufen — und er hat dafür genau so
lange Zeit, wie er braucht, ihn zu erkennen. Bei 238 Weltpunkten je Sekunde
sind das **zwei Sekunden**.

Er ist der Gegensatz zum Koloss: **schmal, tief, nach vorn gestreckt.** Keine
Panzerung, keine Wucht, nichts Breites. Was ihn trägt, ist Antrieb.

**Maße im Prompt selbst** (v230): 512 × 512, quadratisch, freigestellt auf
Transparenz.

```
[STILBLOCK NEUBAU EINFÜGEN]

SUBJECT: a single very fast, lightly built raider vehicle of the invading
faction, seen from directly above (top-down), 512 x 512 pixels, square,
isolated on full transparency with no background and no ground shadow - the
game bakes its own shadow.

It is NARROW and LONG, stretched along its direction of travel: a low
open-frame chassis on four small wheels or a single track, a pair of
oversized boost nozzles at the rear, swept intake vanes, almost no armour -
you can see through the frame in places. Its proportions are the opposite of
the armoured brute of the same faction: that one is a wide compact block,
this one is a thin arrow.

It carries a small forward-mounted ram or cutter and nothing else. It is not
a gun platform - it is built to GET THERE, and the silhouette must say that
before anything else.

Its one saturated accent is a hot amber and it belongs to the DRIVE - the
nozzle throats, a glowing strip along the spine. The accent should read as
"this thing is moving fast", not "this thing is aiming".

At roughly 16 pixels on screen it must still read as long-and-thin rather
than as a blob: keep the outline simple and the long axis unmistakable.

[AUSGABE-BLOCK FIGUR EINFÜGEN]
```

### Abnahme 8d.5

| Prüfung | Gefordert | Womit |
|---|---|---|
| Silhouetten-Abstand zu den neun Gegnern | Überdeckung **höchstens 0,60** | `npm run probebild` |
| Längenverhältnis | lange Achse mindestens **1,8-mal** die kurze | Blick, Regel 8 |
| Breite auf dem Bildschirm | mindestens 13 px | `npm run lesbarkeit` |
| Kante gegen den Untergrund | mindestens 1,5 | `npm run lesbarkeit` |
| Passt durch die engste Wegstelle | `npm run gedraenge` grün | `npm run gedraenge` |
| Anteil gesättigter Akzente | höchstens 5 % der Fläche | Stilblock 8d |

**Die Zeile „passt durch die engste Wegstelle" ist bei ihm die eigentliche
Abnahme und kann erst nach der Lieferung fallen.** `npm run gedraenge` misst
die WIRKLICHE Breite der Figur gegen die schmalste Stelle der Bahn — solange
nur der Platzhalter da ist, überspringt es ihn und sagt das. Auf dem
Spiralhain trägt die schmalste Stelle acht Weltpunkte; ein Fahrzeug, das quer
zur Fahrtrichtung breit ist, fällt dort durch.

---

**Was im Spiel schon steht und nicht bestellt werden muss:** der Ring um ihn
und die Fäden zu denen, die er versorgt. Dieselbe Sprache wie beim
Schildträger seit v110, nur grün statt violett und durchgezogen statt
gestrichelt — der Träger gibt in Stufen, der Sanitäter stetig. Das Bild muss
die Rolle also nicht allein tragen; es muss ihr nur nicht widersprechen.

**Bis das Bild da ist, baut das Spiel gegen den Platzhalter** (K5), und
`npm run bildtor` nennt `werft_1_1` bei jedem Lauf als offene Bestellung.

### 8d.6 `35_bannturm.png` — das dritte Gebäude ohne Waffe

> **Umnummeriert in v334.** Dieser Auftrag stand seit v295 als `8d.4` und
> `35_bannturm.png` da — und v328 hat dem Sanitäter **dieselbe Nummer und
> denselben Dateinamen** gegeben. Zwei Aufträge unter einer Kennung sind kein
> Schönheitsfehler: `npm run doku` liest die Abschnitte nach ihrer
> Überschrift, und eine Gegenprobe, die `### 8d.4` greift, trifft seitdem den
> falschen. Genau so hat der Nachtlauf sie als gegenstandslos gemeldet.
> Seit v334 prüft der Doku-Wächter beides — doppelte Abschnittsnummer und
> doppelter Dateiname.

**Er ist der einzige, der nach OBEN arbeitet.** Förderer und Werft greifen
nach unten und nach innen — Trichter, Rutsche, Sumpf; Gerüst, Greifarme,
Schweisspunkt. Der Bannturm sendet: ein Mast mit einem offenen Ring darauf,
und die Wirkung geht in die Fläche um ihn herum. Das ist im Bild zu sehen,
ohne dass ein Wort dabeisteht — und es ist der Grund, warum er sich gegen
**beide** anderen abheben lässt.

**Er darf trotzdem kein Turm sein.** Kein Rohr, keine Mündung, nichts, was
zielt. Der Ring ist waagerecht und geschlossen; ein Ring, der irgendwohin
zeigt, liest sich als Schüssel und damit als Waffe.

**Maße im Prompt selbst**: 512 × 512, quadratisch, freigestellt auf
Transparenz.

```
[STILBLOCK NEUBAU EINFÜGEN]

SUBJECT: a single industrial resonance mast seen from above at a slight
angle, 512 x 512 pixels, square, isolated on full transparency with no
background and no ground shadow - the game bakes its own shadow.

A slim braced mast rising from a heavy anchored base, carrying ONE open
horizontal ring at its top - a closed loop lying flat, like a halo seen from
above. Cable runs spiral up the mast into the ring. Faint violet light sits
IN the ring itself and in a thin band around the base, as if the whole plot
of ground were being tuned. One lit gauge at the foot.

NO WEAPON OF ANY KIND. No barrel, no muzzle, no turret, no dish, no dome,
nothing that aims. The ring is FLAT and CLOSED: a ring that tilts or opens
reads as a dish, and a dish reads as a gun. Every gun in this game points
outward; this machine points at the air above itself.

It must read as a DIFFERENT KIND OF MACHINE than the two other unarmed
buildings already in this set. The extraction plant is a closed squat drum
with chutes pointing DOWN and OUT. The repair gantry is an open cage with
arms pointing IN. This one is TALL AND THIN and works UPWARD - three
silhouettes, three directions, recognisable from across the field at roughly
96 pixels on screen.

The saturated accent is violet and it belongs to the ring and the ground
band - not to a sight or a sensor. Amber is reserved for the extraction
plant, cold blue for the repair gantry; do not use either here.

[AUSGABE-BLOCK FIGUR EINFÜGEN]
```

### Abnahme 8d.4

| Prüfung | Gefordert | Womit |
|---|---|---|
| Silhouetten-Abstand zu den vier Türmen | Überdeckung **höchstens 0,60** | `npm run probebild` |
| Silhouetten-Abstand zu Förderer **und** Werft | Überdeckung **höchstens 0,55** | `npm run probebild` |
| Höher als breit | Verhältnis **mindestens 1,25** | `npm run probebild` |
| Anteil gesättigter Akzente | höchstens 5 % der Fläche | Stilblock 8d |

**„Höher als breit" ist die Abnahme, die man nicht diskutieren muss.** Der
Förderer ist ausdrücklich breiter als hoch (mindestens 1,15 quer), die Werft
ist ein offener Kasten — ein Mast trennt sich davon durch seine Proportion
allein, und die ist eine Zahl statt eines Eindrucks.

**Bis das Bild da ist, baut das Spiel gegen den Platzhalter** (K5). Der trägt
seit v290 den Anfangsbuchstaben, hier also **B**; `npm run bildtor` prüft bei
jedem Lauf, dass sich zwei Platzhalter um mindestens 12 % ihrer Punkte
unterscheiden.
