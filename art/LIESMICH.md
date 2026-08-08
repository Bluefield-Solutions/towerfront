# Bildvorrat

Rohbilder liegen unter `art/roh/<gruppe>/`, die Beschreibung je Gruppe in
`art/<gruppe>.json`. Aus beidem erzeugt `tools/pack-art.mjs` die eingebetteten
TypeScript-Module in `src/gfx/assets/`.

```
npm run pack-art              alle Gruppen neu erzeugen
npm run pack-art -- tuerme    nur eine Gruppe
npm run art                   nur prüfen (läuft auch im Tor)
```

**Neue Lieferung einbauen:** Rohdateien nach `art/roh/<gruppe>/` legen, in der
JSON-Datei zuordnen, `npm run pack-art` laufen lassen, `npm run gate`.

## Was die Beschreibung kann

| Feld | Bedeutung |
|---|---|
| `source` | Ordner mit den Rohbildern, relativ zu `art/` |
| `output` | Name des erzeugten Moduls in `src/gfx/assets/` |
| `exportName` | Name der exportierten Tabelle |
| `mode` | `background` für Untergründe (nur skalieren), sonst freistellen |
| `budgetKb` | Obergrenze für die ganze Gruppe |
| `defaults` | gilt für alle Einträge, je Eintrag überschreibbar |
| `size` | Kantenlänge des erzeugten Quadrats |
| `fill` | wie viel der Breite das Objekt einnimmt (0–1) |
| `baseline` | wo der Fuß des Objekts sitzt (0–1 der Höhe) |
| `quality` | WebP-Qualität |
| `keyColour` | einfarbiger Hintergrund, der zu Transparenz wird, z. B. `[255,0,255]` |

## Was das Werkzeug prüft

- **Reste am Bildrand** werden entfernt: nur der größte zusammenhängende
  Bereich bleibt. Ohne das bestimmt ein abgeschnittener Fetzen die Bildgrenze
  und das eigentliche Objekt wird beim Skalieren winzig.
- **Angeschnittene Objekte** werden gemeldet, nicht repariert — das geht nicht.
- **Seitenverhältnis** der Untergründe muss exakt zum Spielfeld passen.
- **Budget** je Gruppe.
- **Frische**: das eingebettete Modul muss zu den Rohbildern passen. Wer von
  Hand nachbessert, fliegt im Tor auf.
