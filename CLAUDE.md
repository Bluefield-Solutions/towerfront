# Kristallwacht

Browser-Tower-Defense, deutsch, eine autarke HTML-Datei. TypeScript 5 + Vite +
`vite-plugin-singlefile`, Canvas 2D, kein Spielgerüst von der Stange.

**Diese Datei wird zu Beginn jeder Sitzung gelesen. Sie ist kurz gehalten, weil
eine lange Datei nicht gelesen wird. Alles Ausführliche steht in `docs/`.**

---

## Wie hier gearbeitet wird

Der Nutzer gibt ein **Ziel** und ein **Abnahmekriterium**. Alles Weitere läuft
ohne ihn. Ein Durchgang:

```
0. Referenzabgleich   Drei Vorbilder benennen, aufschreiben was sie TUN,
                      Soll ableiten, Abstand messen. Entfällt nur, wenn es
                      für dieses Ziel schon einen Abgleich gibt.
1. Arbeiter           Genau ein Ziel umsetzen. Entscheidet nicht über Fertigkeit.
2. Prüfer             npm run schleife  →  schleife/bericht.md
3. Inspektor          Sieht nur Bericht und Bilder, nicht den Code und nicht
                      die Absicht. Urteil: Freigabe · neue Schleife · Rückbau.
```

**Höchstens drei Schleifen je Ziel.** Danach ist nicht die Ausführung das
Problem, sondern das Ziel — dann zurück zum Nutzer.

Jede angenommene Runde: `git commit` + `git tag vN`. Push auf `main` löst die
Auslieferung aus, aber **nur bei grüner Torkette**
(`.github/workflows/deploy.yml`).

---

## Befehle

```
npm run gate        elf Prüfungen, ~45 s. Muss vor jedem Commit grün sein.
npm run schleife    Torkette + Bildabnahme + Bericht + rechenbares Urteil
npm run bilder      Bildabnahme allein (echte PNG ohne Browser)
npm run pack-art    Bildvorrat aus art/roh/ neu einbacken
```

Die Torkette: `tsc` → `guards` → `art` → `determinism` → `sim` → `bench` →
`bench-draw` → `lesbarkeit` → `smoke` → `build` → `autarkie` → `bericht`.

---

## Eiserne Regeln

Jede hat mindestens eine Runde gekostet. Sie stehen hier, damit sie nicht ein
zweites Mal kosten.

1. **Erst einchecken, dann gegenproben.** Gegenproben arbeiten mit
   `git checkout` und löschen sonst die frische Arbeit. Zweimal passiert.
2. **Grenzen anteilig, nie absolut.** Als der Kristall von 20 auf 60 stieg,
   wurden fünf Prüfungen still bedeutungslos, ohne dass etwas rot wurde.
   Dreimal dieselbe Falle.
3. **Prüfen, ob der Eingriff angekommen ist.** Drei von zehn Fehlerinjektionen
   scheiterten an der Probe, nicht am Tor.
4. **Das Modell darf nicht vom Gemessenen abhängen.** Hängt die Bewertung der
   Bauplätze an den Turmwerten, misst die Simulation zwei Dinge auf einmal.
5. **Eine Prüfung, die nie etwas meldet, ist kein Beweis.** Wer eine Prüfung
   ändert, baut einen Fehler ein, sieht ob sie anschlägt, nimmt zurück.
6. **Kein Tor ersetzt den Blick — und kein Blick die Tore.** Elf von 57
   Befunden kamen aus Bildschirmfotos, keiner davon aus einem Tor.
7. **Das Soll kommt aus der Referenz, nicht aus mir.** Sonst wandert es mit
   der eigenen Leistung mit. Deshalb Schritt 0.
8. **Safari-Falle:** nie `drawImage(self)` mit `filter: blur` oder
   `globalCompositeOperation: 'lighter'`. Auf iOS schwarzes Bild nach etwa
   einer Sekunde, auf dem Schreibtisch unauffällig. Alles Leuchten wird
   gebacken.

---

## Aufbau

```
src/core/      Kurvenmodell (path.ts), Bedienung, Ton, Ablage, Schleife
src/data/      Türme, Gegner, Karten, Wellen, Grade, Verbesserungen
src/game/      Zustand (state.ts), Menü, Spielstand, Einführung
src/gfx/       Renderer, Untergrund, Bildvorrat, Menüzeichnung
tools/         Torkette, Bildabnahme, Schleifenwerkzeug
art/roh/       Rohbilder → tools/pack-art.mjs → src/gfx/assets/
docs/          Konzept, Rückstandsverzeichnis, Referenzabgleiche
```

**Kein Kachelraster mehr.** Wege sind Catmull-Rom-Kurven mit
Bogenlängen-Tabelle; ein Gegner hat als einzige Zustandsgröße die
zurückgelegte Strecke. Gebaut wird frei, begrenzt durch Platzbedarf je
Turmsorte, Abstand zum Weg und unwegsames Gelände.

---

## Stand

Version v42. Feld 1920 × 1080 (16:9). Drei Karten, vier Türme mit je zwei
Zweigen und sechs Stufen, sieben Gegnerarten, drei Grade, Endlosmodus.
Genre-Abgleich 27 von 30.

**Offen:**
- T15: Verluste liegen noch zu stark in der letzten Welle (Ziel 60 %).
- Sieg- und Niederlagebildschirm sind noch HTML und passen nicht zur Landkarte.
- Berührungsflächen im Spiel sind ungemessen (im Menü geprüft).
- Doku in `docs/` steht teilweise noch auf dem Rastermodell.

---

## Was der Nutzer erwartet

- Deutsch, auch im Quelltext (Kommentare, Bezeichner, Ausgaben).
- Nach jeder Runde: vier nächste Schritte, davon mindestens einer technisch
  und einer grafisch.
- Die fertige Datei erreichbar — hier über Pages, nicht als Anhang.
- Getestet wird auf dem iPhone quer. Das ist das Zielgerät, nicht der
  Schreibtisch.
