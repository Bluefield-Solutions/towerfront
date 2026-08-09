# Towerfront — Auftrag: Bodenbilder

*v56 · 08.08.2026 · Erstes Los der Grafikangleichung*

---

## Warum diese drei Bilder zuerst

Der Grafik-Audit hat drei Abstände zum Zielbild gemessen. Zwei davon habe ich
in v56 ohne neue Bilder geschlossen — Rauschen und Schwarz sind weg, die
Helligkeit ist von 0,18 auf 0,27 gestiegen.

**Der dritte geht nicht ohne dich.** Unser Boden ist ein dunkles Waldfoto mit
einem flachen Band als Weg darüber. Das Zielbild hat gerendertes Gelände mit
echten Felsen, Grasbüscheln und einem **gepflasterten Weg im Bild**.

Damit verschwindet gleichzeitig eine der drei Bildsprachen: Der gezeichnete Weg
entfällt, weil er Teil des Bildes wird.

---

> **Nachtrag nach der ersten Lieferung.** Die Hilfsbilder werden **nicht mehr
> gebraucht**: `tools/mapread.mjs` liest Weg und Gelände direkt aus dem
> Kartenbild aus — über die Sättigung bei farbigem Boden, über die Helligkeit
> bei Schnee. Geprüft an allen drei Karten.
>
> Zwei Anforderungen sind dafür dazugekommen:
> - **Der Weg muss sich vom Boden abheben** — in der Sättigung *oder* in der
>   Helligkeit. Ein grauer Weg auf grauem Beton gleicher Helligkeit wäre der
>   Grenzfall.
> - **Der Weg muss deutlich winden.** Gemessen liegt der Umwegfaktor aller
>   drei gelieferten Karten bei 1,0 bis 1,3; nötig sind 1,8. Ein gerader Weg
>   lässt sich mit vier Türmen abdecken und verlangt keine Entscheidung.

## Der Weg vom Bild ins Spiel

Zwei Befehle, kein Handskript mehr:

```
node tools/mapread.mjs <bild.png> <name>      Weg und Gelaende auslesen
node tools/mapapply.mjs /tmp/<name>_daten.json MAP_<KONSTANTE>
npm run guards                                 pruefen
```

Der Einbau war bis v85 jedes Mal ein frisch geschriebenes Handskript, und
jedes Mal sind dieselben vier Fehler passiert: nach Punktzahl statt Laenge
sortiert, doppelt vereinigt, am falschen Punkt verbunden, doppelte Punkte
stehen gelassen. Alle vier sind im Werkzeug behoben. Es verarbeitet bis zu
vier Zuwege und verwirft Doppelgaenger.

## Die Auslesung kann jetzt Netze — der Engpass ist die Wegbreite

**Stand v92.** Die Auslesung wurde als Wegsuche neu gebaut (`npm run
karte-lesen`, `tools/mapgraph.mjs`) und bewaeltigt Kreuzungen, Schleifen und
mehrere Tore. Nachgewiesen an acht gelieferten Karten: alle acht liefern
Bahnen vom Tor zum Endplatz.

**Was jetzt blockiert, ist die Wegbreite.** Sauber gemessen liegen die Wege
aller Lieferungen bei rund 40 Weltpixeln - **2 Prozent der Feldbreite.**
Unsere groessten Gegner sind 58 und 68 Pixel breit; sie passen nicht hinein.

Gebraucht wird das Doppelte: **der Weg soll etwa 4 Prozent der Bildbreite
messen**, an Engstellen 3, an breiten Stellen 6. Bei 3840 Bildpunkten sind das
rund 115 bis 230 Punkte - deutlich breiter, als es im Bild "richtig" aussieht.
Ein Wegnetz fuer ein Tower-Defense ist keine Wanderkarte: dort laufen
Kolosse nebeneinander.

Alternative ohne neue Bilder: die Gegner verkleinern. Das kostet aber
Lesbarkeit - der Span liegt schon bei 17 Bildschirmpunkten.

## Offen: Verzweigungen in der Auslesung

**Stand v89.** Die gelieferten Karten mit Kreuzung oder Sternplatz lassen sich
noch nicht einbauen. Die Wegverfolgung laeuft vom Zugang los und **endet an
der ersten Verzweigung** - bei der Frostkarte stoppten alle drei Bahnen an der
mittleren Kreuzung statt am Endplatz.

Was dafuer noch fehlt: An einer Verzweigung muss die Verfolgung den Ast
waehlen, der zum Ziel fuehrt, statt anzuhalten. Das Ziel selbst ist erkennbar -
es ist die breiteste Stelle des Netzes, der runde Endplatz.

Bis dahin sind Karten einbaubar, deren Weg **ohne Verzweigung** vom Zugang
zum Endplatz laeuft. Mehrere Zugaenge sind kein Problem, solange sie sich
nicht unterwegs treffen.

## Die Wege muessen breit genug fuer die Gegner sein

**Der wichtigste Wert, und der am leichtesten zu uebersehende.** Die
Lieferung "Kristallgrund" hatte ein vorbildlich verschlungenes Wegnetz - aber
die Wege waren im Mittel 43 Weltpixel breit. Unsere groessten Gegner sind 58
und 68 Pixel breit; sie haetten neben dem Weg gelaufen.

**Nachtrag v89: Die Messung war falsch.** Sie gab `(links + rechts) / 2`
zurueck - den Mittelwert der beiden Halbbreiten, also die Halbbreite selbst.
Jede ausgelesene Karte kam mit halb so breiten Wegen ins Spiel und landete an
der Untergrenze von 40. Ich hatte das zweimal als "die gelieferten Wege sind
zu schmal" gedeutet und Nachbesserungen bestellt, die gar nicht noetig waren.
Die Vorgabe unten stimmt trotzdem - jetzt wird sie nur richtig gemessen.

Als Vorgabe fuer das Bild: **der Weg ist an seiner schmalsten Stelle etwa ein
Vierzigstel der Bildbreite, an seiner breitesten ein Zwanzigstel.** Bei 3840
Bildpunkten sind das rund 96 bis 192 Punkte. Lieber zu breit als zu schmal -
ein zu breiter Weg kostet nur Bauflaeche, ein zu schmaler macht die Karte
unbrauchbar.

Und der Weg braucht **erkennbare Engstellen**: das Verhaeltnis von breitester
zu schmalster Stelle soll mindestens 1,5 betragen. Ein durchgehend gleich
breiter Weg nimmt der Karte ihre Taktik.

## Was geliefert werden soll

Drei Kartenbilder, dazu je zwei Hilfsbilder. **Die Hilfsbilder sind der
entscheidende Teil** — ohne sie muss ich die Wegkurve nach Augenmaß auf das
Foto legen, und dann passt das Spiel nicht zum Bild.

| Datei | Was | Größe |
|---|---|---|
| `karte_1.png` | Das Kartenbild mit gemaltem Weg | 3840 × 2160 |
| `karte_1_pfad.png` | Der Weg als weiße Fläche auf Schwarz | 3840 × 2160 |
| `karte_1_rau.png` | Unwegsames Gelände als weiße Fläche auf Schwarz | 3840 × 2160 |

Die beiden Hilfsbilder brauchen keine Gestaltung — nur Weiß auf Schwarz, exakt
deckungsgleich mit dem Kartenbild. Daraus lese ich Wegverlauf, Wegbreite und
Bauverbotszonen automatisch aus.

---

## Die Bildbeschreibung

Wörtlich verwendbar. Der letzte Absatz ist der wichtigste — er hält die drei
Karten in einer Familie.

### Karte 1 — Spiralhain

```
Gerenderte Aufsicht eines Geländeausschnitts, Kamera leicht geneigt (etwa 20
Grad aus der Senkrechten), Seitenverhältnis 16:9.

Warmer sandiger Untergrund in Ocker und hellem Braun. Darüber ein
geschwungener, gepflasterter Weg aus grauen Steinplatten, der von der linken
Bildkante hereinkommt, in weiten Bögen durch das Bild führt und in der rechten
Bildhälfte endet. Der Weg ist an manchen Stellen breiter, an anderen enger,
mit weichen Rändern und einzelnen losen Steinen am Rand.

Neben dem Weg: kühlgraue Felsformationen aus gestapelten runden Blöcken,
einzelne Grasbüschel, ein paar Sträucher, verstreute kleine Steine. Die Felsen
stehen in Gruppen, nicht gleichmäßig verteilt.

Beleuchtung: Mittagssonne von oben links, warm. Weiche lange Schatten nach
unten rechts, alle in derselben Richtung. Keine zweite Lichtquelle.

Farben kräftig und natürlich gesättigt. Kein reines Schwarz - der dunkelste Ton
ist ein warmes Braungrau. Glatte Oberflächen ohne Körnung und ohne
Filmkorn-Effekt.

Detailgrad mittel: die Formen tragen das Bild, nicht die Textur. Keine feinen
Muster, keine Schrift, keine Figuren, keine Gebäude, keine Türme.
```

### Karte 2 — Laubschlucht

Wie oben, aber: *„Herbstlicher Waldboden in warmem Rotbraun und Ocker,
Laubschicht, umgestürzte Baumstämme statt Felsen, zwei Wege, die sich in der
Bildmitte vereinen."*

### Karte 3 — Frostspalte

Wie oben, aber: *„Verschneiter Steinboden in hellem Grau mit blauen Schatten,
Eisplatten, vereinzelte kahle Bäume. Sonne tiefer stehend, längere Schatten.
Zwei Wege, die sich erst im letzten Drittel vereinen."*

---

## Die Zielwerte

Ich prüfe jede Lieferung mit `npm run grafik`. Aus dem gemessenen Zielbild:

| Kennzahl | Zielbereich | Was schiefgeht, wenn es abweicht |
|---|---|---|
| Mittlere Helligkeit | **0,30 bis 0,36** | Zu dunkel: die Figuren verschwinden. Zu hell: sie auch. |
| Sättigung | 0,45 bis 0,55 | Zu blass wirkt tot, zu bunt frisst die Figuren auf. |
| Detaildichte | **1,5 bis 3,0** | Über 4 ist das Bild unruhig und verschluckt die Einheiten. |
| Reines Schwarz | unter 2 % | Schwarz frisst Löcher statt Formen zu begrenzen. |
| Lichtrichtung | oben links | Muss auf allen drei Karten gleich sein, sonst kippt die Szene. |

**Der häufigste Fehler bei solchen Bildern ist zu viel Detail.** Ein Boden, der
für sich schön aussieht, ist im Spiel oft zu unruhig — die Einheiten laufen
darauf und müssen lesbar bleiben. Im Zweifel weniger.

---

## Was danach passiert

1. Ich lese Wegkurve und Bauverbotszonen aus den Hilfsbildern aus.
2. Der gezeichnete Weg entfällt; das Kartenbild bringt ihn mit.
3. Ich messe gegen die Zielwerte und zeige dir das Ergebnis im Spiel.
4. Die Balance wird neu geeicht, weil sich die bebaubare Fläche ändert.

Wenn ein Bild die Zielwerte verfehlt, sage ich dir welche und um wieviel —
dann lässt sich gezielt nachbessern, statt neu zu raten.
