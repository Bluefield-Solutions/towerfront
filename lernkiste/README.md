# Lernkiste — Arbeitsbaum

**Dieser Ordner liegt vorübergehend im Towerfront-Repository.** Er gehört in
ein eigenes Repository (`lernkiste`) und zieht dorthin um, sobald es steht.
Bis dahin ist er hier, weil Code irgendwo liegen muss.

Konzept, Prüfbericht und Grafik-Audit stehen in `../docs/Lernkiste-*.md`.

## Was hier schon läuft

```
npm install
npm run geo-holen          # Rohdaten (nicht eingecheckt)
node tools/backen-kontinente.mjs
node tools/backen-deutschland.mjs
```

Das Ergebnis liegt in `src/geo/` — reine SVG-Pfade, drei Auflösungsstufen,
jede gegen die Hausdorff-Grenze von 0,75 Bildpunkten gemessen.

## Offen: die Bundesländer sind noch ein Zwischenstand

Konzept K3 verlangt **BKG VG250** (Maßstab 1 : 250 000). Der Host
`daten.gdz.bkg.bund.de` ist in dieser Sitzung durch die Netzrichtlinie
gesperrt (403 auf CONNECT) — dort wird nicht drumherum geroutet.

Ersatzweise stehen die Bundesländer derzeit auf **Natural Earth 1:10m
admin_1**. Das ist Public Domain und für den Entwurf gut genug, aber es ist
**1 : 10 000 000** und damit gröber als das, was ausgeliefert werden soll.

Zum Umstellen sind zwei Zeilen in `tools/backen-deutschland.mjs` zu ändern
(Quelldatei und Feldnamen). Der Rest der Pipeline bleibt gleich.

## Was beim Bauen gelernt wurde

Drei Fallen, die alle **still** waren — nichts wurde rot:

1. `-clean gap-fill-area=20km2` auf unprojizierten Grad-Daten löst die halbe
   Geometrie auf. Die Messung meldete danach 0,00 px Abweichung bei 2,4 %
   der Punkte.
2. **d3-geo erwartet den entgegengesetzten Umlaufsinn zu RFC 7946.** Natural
   Earth liefert im Uhrzeigersinn und läuft; mapshaper dreht um, und danach
   umschließt jede Fläche rechnerisch den Nordpol: `geoBounds` meldet die
   ganze Erde, `fitWidth` liefert Maßstab 0, jede Fläche ist null.
3. `-dissolve2` gibt eine **GeometryCollection** zurück, keine
   FeatureCollection — und lief damit an der Umlaufsinn-Korrektur vorbei.

Alle drei sind der Grund, warum das Tor `topologie` den Umlaufsinn, die
Flächenvorzeichen und die erwarteten Teile und Löcher prüft.

## Stand nach MG

```
node tools/backen-kontinente.mjs     Ebene 1
node tools/backen-deutschland.mjs    Ebene 3
node entwuerfe/bauen.mjs             Vierfärbung + Entwurfsdaten
node tor/ansicht.mjs                 visuelles Regressionstor
node tor/ansicht.mjs --aktualisieren Vorbilder erneuern (bewusst!)
```

Gemessen, nicht geschätzt (Hausdorff-Grenze 0,75 px eingehalten):

| | grob | mittel | fein |
|---|---|---|---|
| Kontinente | 29,7 KB gz | 105,0 KB | 134,2 KB |
| Deutschland | 34,3 KB gz | 55,7 KB | 57,5 KB |

## Neuer offener Punkt aus MG

**Antarktika sieht in jeder Weltprojektion wie ein Sockel aus.** Für Fionas
Runden 1 und 2 stört das nicht — dort ist es kein Kandidat. Für Runde 3
braucht es eine eigene, polare Ansicht. Das ist eine zweite Projektion für
einen einzigen Kontinent und keine Kleinigkeit.
