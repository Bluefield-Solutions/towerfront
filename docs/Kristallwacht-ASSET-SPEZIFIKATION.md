# Kristallwacht — Asset-Spezifikation für KI-generierte Grafik

*Version 1.0 · 07.08.2026 · Umstieg von prozeduraler auf gerenderte Optik*
*Zielspiel: Tower Defense, Aufsicht, eine autarke HTML-Datei*

> ## ACHTUNG — in drei Punkten überholt, bitte zuerst lesen
>
> Diese Fassung stammt aus der Zeit des Kachelrasters. **Konzept 2.0**
> (`Kristallwacht-KONZEPT-2.0.md`) ändert drei Vorgaben. Alles Übrige —
> Lichteinfall, Freistellen, Standlinie, kein eingebackener Schatten,
> Dateinamen, Budget — gilt unverändert.
>
> | Punkt | Diese Fassung | Gültig ab Konzept 2.0 |
> |---|---|---|
> | Hintergründe | 2400 × 1320 (20:11), **ohne Weg** | **3840 × 2160 (16:9), Weg im Bild gemalt**, dazu `_pfad.png` und `_plaetze.png` |
> | Drehbare Teile | ein Bild, zeigt nach rechts | **acht Richtungen**, `_00` bis `_07` im Uhrzeigersinn ab Osten |
> | Bauplätze | ergaben sich aus dem Raster | **gestaltete Orte im Bild**, ungleich verteilt, mit Häufungen |


---

## 0. So arbeiten wir zusammen

1. Du (oder ein spezialisierter Bild-Agent) erzeugst die Bilder anhand der fertigen
   Prompts weiter unten.
2. Jede Datei bekommt **exakt** den angegebenen Namen — das Namensschema
   entspricht den Schlüsseln im Spielcode.
3. Du lädst sie hier in den Chat, am besten schubweise (erst das Testset aus
   Abschnitt 8).
4. Ich stelle frei, schneide zu, skaliere auf die Zielgröße, komprimiere aufs
   Budget und baue alles ein. Du siehst das Ergebnis sofort spielbar.

---

## 1. Was dieses Spiel ist — damit der Stil passt

Aufsicht auf ein Spielfeld bei Nacht. Ein Pfad aus hellem, ausgetretenem
Gestein zieht sich durch dunkles Gelände zu einem leuchtenden Kristall.
Darauf stehen Türme, darüber laufen Gegner. Kein Cartoon, kein Fotorealismus —
**stilisiert, klar, mit lesbaren Silhouetten**, wie Kingdom Rush, aber kühler
und weniger comichaft.

Das Wichtigste: **auf dem Handy ist ein Turm etwa 45 Bildpunkte groß.** Alles,
was feiner ist als ein Fünftel der Objektbreite, verschwindet. Große Formen,
starke Kontraste, wenig Kleinkram.

---

## 2. Globaler Stil-Prompt (jedem Prompt voranstellen)

> *Top-down orthographic view, camera pointing straight down at 90 degrees
> (nadir), no perspective, no horizon, no vanishing point. Stylised
> semi-realistic game art for a tower defense game — clean bold shapes, strong
> readable silhouette, restrained detail, slightly desaturated colours. Cool
> moonlit night lighting, single consistent light source from the upper left,
> soft ambient occlusion, no harsh specular highlights. No text, no numbers, no
> logo, no watermark, no user interface, no people.*

Danach folgt der objektspezifische Teil und die technischen Angaben.

---

## 3. Technische Grundregeln (gelten für **alle** Bilder)

| Regel | Wert |
|---|---|
| Ansicht | Orthografische Aufsicht, exakt senkrecht von oben |
| Licht | Einheitlich von **oben links**, über alle Assets gleich |
| Format Objekte | PNG mit echtem Alpha; ersatzweise auf **einfarbig Magenta `#FF00FF`** |
| Format Hintergründe | PNG oder WebP, kein Alpha nötig |
| Ausrichtung drehbarer Teile | zeigt nach **rechts** (3 Uhr), nicht nach oben |
| Zentrierung | Objekt mittig, ringsum 8–12 % Rand |
| Ein Objekt je Bild | keine Collagen, keine Varianten nebeneinander |
| Kein eingebackener Schatten | den Bodenschatten zeichnet die Engine |
| Kein eingebackenes Leuchten | Glüh- und Lichteffekte macht die Engine |
| Keine Umrandung | keine schwarze Kontur, keine Cel-Shading-Outline |

**Warum „nach rechts" und nicht „nach oben":** Die Engine dreht Türme und
laufende Gegner mit `rotate(winkel)`, und Winkel 0 zeigt in dieser
Zeichenrichtung nach rechts. Ein Bild mit Nase nach oben stünde im Spiel
dauerhaft 90 Grad verdreht.

---

## 4. Größen — und woher sie kommen

Das Spielfeld ist ein Raster aus **20 × 11 Kacheln zu je 80 Punkten**, also
**1600 × 880 Weltpunkte**. Auf dem iPhone quer wird das auf etwa 45 % skaliert,
am Schreibtisch auf bis zu 90 %; dazu kommt die doppelte Bildpunktdichte.
Daraus folgt die größte je gebrauchte Auflösung — und darauf sind die Maße
unten ausgelegt, mit etwas Reserve.

**Regel: Liefere so groß wie angegeben oder größer. Ich skaliere herunter,
niemals hoch.**

---

## 5. Die Assets

### 5.1 Hintergründe — je Karte einer

**Format:** 2400 × 1320 px, PNG oder WebP, **ohne Alpha**.
Das Seitenverhältnis 20:11 muss exakt stimmen, sonst passt das Raster nicht.

**Ganz wichtig — was NICHT drauf gehört:**
Kein Weg, keine Straße, keine Bauplätze, keine Türme, keine Gegner, kein
Raster. Nur der **Untergrund des Bioms**. Weg und Bauplätze zeichnet die Engine
darüber, und sie müssen sich mit der Kartenform ändern können.

| Dateiname | Karte | Biom | Prompt-Zusatz |
|---|---|---|---|
| `bg_spiralhain.webp` | Spiralhain | Mondmoos | *dark mossy ground seen from directly above, deep blue-green moss and lichen, scattered small pale stones, a few gnarled roots, patches of low silvery grass, cold moonlight, no path, no road, no buildings* |
| `bg_ascheschlucht.webp` | Ascheschlucht | Asche und Lava | *cracked volcanic ground seen from directly above, dark brown-red ash and basalt, thin glowing orange cracks, scattered pumice stones, faint drifting ash, no path, no road, no buildings* |
| `bg_frostspalte.webp` | Frostspalte | Gletscher | *frozen ground seen from directly above, dark steel-blue ice and packed snow, fine crack patterns, scattered frost-covered rocks, cold pale light, no path, no road, no buildings* |

**Kontrast bitte zurückhalten.** Der Untergrund ist Bühne, nicht Hauptdarsteller
— Türme und Gegner müssen darüber sofort lesbar bleiben. Mitteltöne, keine
grellen Stellen, keine starken Muster, die mit dem Weg konkurrieren.

---

### 5.2 Der Herzkristall und das Tor

**Format:** PNG mit Alpha, quadratisch.

| Dateiname | Größe | Inhalt | Prompt-Zusatz |
|---|---|---|---|
| `crystal.png` | 384 × 384 | Das Ziel, das verteidigt wird | *a large faceted aquamarine crystal standing upright on a stepped dark stone pedestal, seen from directly above at a slight tilt so both the pedestal and the crystal faces are visible, glowing pale cyan from within, sharp clean facets, transparent background, no ground, no glow halo* |
| `portal.png` | 256 × 256 | Der Eingang der Gegner | *a dark oval rift in the air ringed by floating violet shards, seen from directly above, empty black-violet centre, sharp angular fragments orbiting the opening, transparent background, no ground, no glow halo* |

Beim Kristall bitte **keinen Lichtschein** malen — die Engine legt ein
pulsierendes Leuchten darüber, das sich mit dem Spielstand verändert (er
bekommt außerdem Risse, wenn Kristallpunkte verloren gehen).

---

### 5.3 Deko-Felsen — je Biom drei Varianten

Sie stehen auf gesperrten Zellen und sind reine Kulisse.
**Format:** PNG mit Alpha, 192 × 192 px.

| Dateinamen | Prompt-Zusatz |
|---|---|
| `rock_moos_1/2/3.png` | *a single weathered grey-green boulder covered in patches of moss, seen from directly above, irregular natural shape, transparent background, no ground shadow* |
| `rock_asche_1/2/3.png` | *a single jagged dark basalt rock with thin glowing orange cracks, seen from directly above, transparent background, no ground shadow* |
| `rock_frost_1/2/3.png` | *a single ice-covered rock with pale blue frost and sharp icicles, seen from directly above, transparent background, no ground shadow* |

---

### 5.4 Türme

Hier ist die Struktur wichtig, sonst wird es unnötig viel Arbeit.

Jeder Turm hat **Stufe 1** und danach **zwei sich ausschließende Ausbauzweige**
mit je zwei Stufen. Für die Grafik reichen aber **zwölf Zustände**: Stufe 1 je
Turm (4) und die Endstufe je Zweig (8). Die mittlere Stufe setze ich im Spiel
aus beiden zusammen.

Jeder Zustand besteht aus **zwei Bildern**:

- **`..._base.png`** — der feste Unterbau: Sockel, Mauerwerk, Plattform.
  Dreht sich im Spiel **nicht**. Ansicht senkrecht von oben.
- **`..._top.png`** — der drehbare Aufsatz: Lauf, Klingen, Kristall.
  Zeigt **nach rechts**. Dreht sich im Spiel um die Bildmitte.

**Format beider:** PNG mit Alpha, **256 × 256 px**, Objekt mittig, 10 % Rand.
Beim Sockel soll die Grundfläche mittig sitzen; beim Aufsatz muss der
**Drehpunkt genau in der Bildmitte** liegen — also der Punkt, um den sich der
Lauf schwenkt, nicht die Mitte des Laufs.

#### Bogenturm — schnelles Einzelziel, Akzentfarbe Gold `#F2C14E`

| Dateiname | Zustand | Prompt-Zusatz |
|---|---|---|
| `t_arrow_1_base.png` | Stufe 1 | *a small round stone watchtower platform with a low parapet, pale grey stone with gold trim, seen from directly above, transparent background* |
| `t_arrow_1_top.png` | Stufe 1 | *a simple wooden-and-steel crossbow mechanism mounted on a swivel, pointing to the right, gold metal fittings, seen from directly above, transparent background* |
| `t_arrow_sniper_base.png` | Scharfschütze | *a tall slender stone tower with a narrow observation platform and a small banner, pale grey stone with gold trim, seen from directly above, transparent background* |
| `t_arrow_sniper_top.png` | Scharfschütze | *a long slim precision ballista with a scope tube and a folded bipod, pointing to the right, gold fittings, seen from directly above, transparent background* |
| `t_arrow_volley_base.png` | Salve | *a broad low stone bastion with three crenellations, pale grey stone with amber trim, seen from directly above, transparent background* |
| `t_arrow_volley_top.png` | Salve | *three short crossbow barrels fanned out side by side on one swivel mount, pointing to the right, amber fittings, seen from directly above, transparent background* |

#### Frostturm — Umkreisbremse, kein Geschoss, Akzent Türkis `#7FE7E0`

| Dateiname | Zustand | Prompt-Zusatz |
|---|---|---|
| `t_frost_1_base.png` | Stufe 1 | *a round pedestal of pale blue-white stone with a shallow basin on top, seen from directly above, transparent background* |
| `t_frost_1_top.png` | Stufe 1 | *three small pointed ice shards arranged radially around a central core, pale cyan translucent ice, seen from directly above, transparent background* |
| `t_frost_eternal_base.png` | Ewiges Eis | *a wide pedestal with two slender pillars carrying a suspended ring of ice, pale blue-white stone, seen from directly above, transparent background* |
| `t_frost_eternal_top.png` | Ewiges Eis | *six long slender ice spikes arranged radially like a snowflake around a glowing core, pale cyan translucent ice, seen from directly above, transparent background* |
| `t_frost_shard_base.png` | Splitterfrost | *a rugged pedestal with three upright ice blades planted around it, pale blue stone, seen from directly above, transparent background* |
| `t_frost_shard_top.png` | Splitterfrost | *three broad jagged ice blades arranged radially, sharp aggressive edges, pale blue translucent ice, seen from directly above, transparent background* |

#### Mörser — Flächenschaden, erreicht keine Flieger, Akzent Orange `#F08A3C`

| Dateiname | Zustand | Prompt-Zusatz |
|---|---|---|
| `t_mortar_1_base.png` | Stufe 1 | *a squat square stone emplacement with sandbag-like ledges, sand-grey stone with orange trim, seen from directly above, transparent background* |
| `t_mortar_1_top.png` | Stufe 1 | *a short thick mortar tube on a heavy pivot, wide muzzle pointing to the right, dark metal with orange band, seen from directly above, transparent background* |
| `t_mortar_cluster_base.png` | Streubombe | *a wide flat stone emplacement with two open ammunition hatches, sand-grey stone with orange trim, seen from directly above, transparent background* |
| `t_mortar_cluster_top.png` | Streubombe | *four short wide mortar tubes side by side on one mount, muzzles pointing to the right, dark metal with orange bands, seen from directly above, transparent background* |
| `t_mortar_breaker_base.png` | Brecher | *a massive reinforced stone bunker with metal banding, dark sand-grey stone with deep red trim, seen from directly above, transparent background* |
| `t_mortar_breaker_top.png` | Brecher | *one single enormous thick siege mortar barrel with reinforcement rings, muzzle pointing to the right, dark metal with deep red bands, seen from directly above, transparent background* |

#### Prisma — Kettenblitz, Akzent Violett `#B07CFF`

| Dateiname | Zustand | Prompt-Zusatz |
|---|---|---|
| `t_prism_1_base.png` | Stufe 1 | *a slim hexagonal pedestal of dark stone with violet inlays, seen from directly above, transparent background* |
| `t_prism_1_top.png` | Stufe 1 | *a single floating violet crystal shard, diamond shaped, faceted, translucent, seen from directly above, transparent background* |
| `t_prism_fork_base.png` | Verzweigung | *a hexagonal pedestal with three small violet-lit posts around its rim, dark stone, seen from directly above, transparent background* |
| `t_prism_fork_top.png` | Verzweigung | *three small violet crystal shards orbiting a tiny bright core, arranged in a triangle, translucent, seen from directly above, transparent background* |
| `t_prism_lens_base.png` | Bündelung | *a hexagonal pedestal carrying a large open metal ring, dark stone with magenta inlays, seen from directly above, transparent background* |
| `t_prism_lens_top.png` | Bündelung | *one large faceted magenta crystal held in a thin metal ring mount, translucent, bright core, seen from directly above, transparent background* |

---

### 5.5 Gegner

**Format:** PNG mit Alpha. Ein Bild je Gegnerart genügt — die Bewegung
(Stauchen, Wippen, Drehen) macht die Engine.

**Ausrichtung:** Die beiden mit *(dreht sich)* markierten laufen bzw. fliegen in
Bewegungsrichtung und müssen **nach rechts** zeigen. Alle anderen werden nicht
gedreht und sollen **von oben ohne Vorzugsrichtung** wirken.

| Dateiname | Name im Spiel | Größe | Rolle | Prompt-Zusatz |
|---|---|---|---|---|
| `e_crawler.png` | Schleicher | 256 × 256 | Masse, schwach | *a small rounded violet blob creature with a smooth carapace and two pale glowing eyes, three stubby legs, seen from directly above, transparent background* |
| `e_runner.png` | Husche *(dreht sich)* | 256 × 256 | schnell, dünn | *a slim dart-shaped crimson creature with a pointed head and swept-back fins, built for speed, pointing to the right, seen from directly above, transparent background* |
| `e_brute.png` | Koloss | 320 × 320 | gepanzert | *a heavy hexagonal armoured creature, thick steel-blue plating with a pale metal band across the middle, short thick legs, seen from directly above, transparent background* |
| `e_flyer.png` | Schwärmer *(dreht sich)* | 256 × 256 | fliegt, Mörser trifft ihn nicht | *a moth-like flying creature with two large swept translucent wings and a slim green-teal body, pointing to the right, seen from directly above, transparent background* |
| `e_splitter.png` | Spalter | 288 × 288 | zerfällt beim Tod | *a rounded orange creature whose shell is split by a deep dark crack down the middle, as if about to break apart, seen from directly above, transparent background* |
| `e_splitling.png` | Span | 192 × 192 | Bruchstück | *a small sharp triangular shard creature, pale orange, one glowing eye, seen from directly above, transparent background* |
| `e_titan.png` | Leerentitan | 512 × 512 | Boss | *a massive octagonal void creature, dark purple-black armour plating with glowing violet seams, a bright violet core in the centre, heavy and imposing, seen from directly above, transparent background* |

**Farbe bitte so lassen wie beschrieben.** Anders als beim Flugzeugspiel färbe
ich hier nicht ein — die Farbe ist die Kennzeichnung der Gegnerart und muss auf
dem kleinen Bildschirm sofort unterscheidbar bleiben.

**Optional, wenn der Bild-Agent Reihen konsistent hinbekommt:** je Gegner drei
Laufphasen als `e_crawler_1/2/3.png`. Nur machen, wenn die drei Bilder wirklich
dasselbe Wesen in drei Momenten zeigen — drei leicht verschiedene Kreaturen
sind schlechter als ein einziges gutes Bild.

---

### 5.6 Geschosse und Effekte (optional, zuletzt)

**Format:** PNG mit Alpha, quadratisch, klein.

| Dateiname | Größe | Inhalt |
|---|---|---|
| `p_arrow.png` | 64 × 64 | *a short glowing golden bolt with a bright tip, pointing to the right* |
| `p_mortar.png` | 96 × 96 | *a dark round iron mortar shell with a faint orange glow, seen from above* |
| `impact_ring.png` | 256 × 256 | *a thin bright expanding shock ring, white to transparent, seen from directly above* |
| `smoke_puff.png` | 192 × 192 | *a soft round dark grey smoke puff, seen from above, soft edges* |

---

## 6. Farbwelten je Karte — als Anhalt für den Bild-Agenten

| | Boden dunkel | Boden hell | Weg | Fels |
|---|---|---|---|---|
| Spiralhain | `#102B2B` | `#215A50` | `#C9A86A` | `#2A3348` |
| Ascheschlucht | `#231512` | `#5A382C` | `#D8C0A0` | `#41282A` |
| Frostspalte | `#16233A` | `#33557A` | `#E4EEF6` | `#2C3E5B` |

Diese Töne gelten **nur** für Untergrund, Weg und Kulisse. Kristall (Türkis),
Gold und Gefahr (Rot) sind auf allen Karten gleich, damit ihre Bedeutung nicht
von der Karte abhängt.

---

## 7. Budget — bitte ernst nehmen

Das Spiel ist **eine einzige autarke HTML-Datei**; jedes Bild wird als Base64
hineingeschrieben und wird dabei ein Drittel größer. Aktuell sind es 109 KB.

**Obergrenze für alle Bilder zusammen: 1,6 MB** (als WebP/PNG, vor der
Einbettung). Die fertige Datei landet damit bei rund 2,2 MB — für ein
Browserspiel in Ordnung, für ein späteres iOS-Bundle völlig unkritisch.

Grobe Aufteilung, an der ich mich beim Komprimieren orientiere:

| Gruppe | Anzahl | Budget |
|---|---|---|
| Hintergründe | 3 | 600 KB |
| Türme (Sockel + Aufsatz) | 24 | 400 KB |
| Gegner | 7 | 250 KB |
| Kristall, Tor, Felsen | 11 | 250 KB |
| Effekte (optional) | 4 | 100 KB |

Lieber groß und sauber liefern — das Komprimieren übernehme ich.

---

## 8. Reihenfolge — erst testen, dann alles

**Schritt 1 · Testset (6 Dateien).** Damit baue ich eine komplette Karte um, du
siehst den Sprung an einem echten Beispiel, und wir justieren Stil und Größen,
**bevor** der Rest entsteht.

```
bg_spiralhain.webp
crystal.png
t_arrow_1_base.png
t_arrow_1_top.png
e_crawler.png
e_brute.png
```

**Schritt 2** · restliche Türme (Stufe 1 und beide Endstufen aller vier Sorten).
**Schritt 3** · restliche Gegner inklusive Titan.
**Schritt 4** · die beiden anderen Hintergründe, Tor, Felsen.
**Schritt 5** · optional Geschosse und Effekte.

---

## 9. Checkliste je Bild

☐ Aufsicht, senkrecht von oben, keine Perspektive
☐ Licht von oben links, gleich wie bei allen anderen
☐ Drehbare Teile zeigen nach **rechts**
☐ Transparenter Hintergrund (oder einfarbig Magenta `#FF00FF`)
☐ Objekt zentriert, 8–12 % Rand, beim Aufsatz Drehpunkt in der Bildmitte
☐ Kein eingebackener Schatten, kein Leuchten, keine Kontur
☐ Kein Text, kein Raster, kein Weg auf dem Hintergrund
☐ Dateiname exakt wie in der Tabelle
☐ Große Formen — es wird auf 45 Bildpunkte heruntergerechnet

---

## 10. Was ich anschließend mache

Freistellen und Zuschneiden · auf die Zielgröße skalieren · auf ein gemeinsames
Farbklima ziehen, damit nichts zusammengewürfelt wirkt · in einen Bildvorrat
packen und als Base64 einbetten · Autarkie-Check (keine externen Verweise) ·
Zeichenmessung (Befehle je Bild und Speicherbedarf der Bilder bleiben im
Budget) · Rauchtest über alle drei Karten.

**Eine Anmerkung zur Verwertung:** Vor einer Veröffentlichung im App Store
sollten die Nutzungsbedingungen des verwendeten Bildgenerators für kommerzielle
Nutzung geprüft werden. Für die Entwicklungs- und Testphase ist das unkritisch.
