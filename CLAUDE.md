# Towerfront

Browser-Tower-Defense, deutsch, eine autarke HTML-Datei. TypeScript 5 + Vite +
`vite-plugin-singlefile`, Canvas 2D, kein Spielgerüst von der Stange.

**Diese Datei wird zu Beginn jeder Sitzung gelesen. Sie ist kurz gehalten, weil
eine lange Datei nicht gelesen wird. Alles Ausführliche steht in `docs/`.**

## Nach dem Umzug: Rohbilder liegen nicht in Git

`art/roh/` ist ausgenommen (79 MB gegen 1,2 MB gepackt). Zum Bauen und Spielen
werden nur die gepackten Fassungen in `src/gfx/assets/` gebraucht - geprueft,
Build und Rauchtest laufen ohne die Rohbilder durch.

**Wer neue Bilder einbaut:** ablegen unter `art/roh/`, `npx tsx
tools/pack-art.mjs` laufen lassen, das ERGEBNIS einchecken. Wer nur am Code
arbeitet, braucht sie gar nicht.

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
npm run gate        vierzehn Prüfungen, ~80 s. Muss vor jedem Commit grün sein.
npm run schleife    Torkette + Bildabnahme + Bericht + rechenbares Urteil
npm run bilder      alle 13 Aufnahmen (echte PNG ohne Browser)
npm run bildtor     der Querschnitt, den die Torkette prüft
npm run pack-art    Bildvorrat aus art/roh/ neu einbacken
npm run eichen      einen Wert durchprobieren, alle Kennzahlen nebeneinander
npm run doku        prüft die Dokumente gegen die Wirklichkeit
npm run beruehrung  prüft, ob alles mit dem Daumen zu treffen ist
npm run proben      baut Fehler ein und prüft, ob die Tore anschlagen
npm run kritik      Wertung nach Testerkategorien, Ziel über 90
```

Die Torkette: `tsc` → `guards` → `doku` → `art` → `determinism` → `sim` → `bench` →
`bench-draw` → `lesbarkeit` → `beruehrung` → `bildtor` → `smoke` → `build` → `autarkie` → `bericht`.

---

## Eiserne Regeln

Jede hat mindestens eine Runde gekostet. Sie stehen hier, damit sie nicht ein
zweites Mal kosten.

1. **Erst einchecken, dann gegenproben.** Gegenproben arbeiten mit
   `git checkout` und löschen sonst die frische Arbeit. **Vier Mal passiert**,
   zuletzt in v49 — obwohl die Regel seit v40 hier steht. Deshalb setzt
   `npm run proben` sie jetzt durch und verweigert den Dienst bei schmutzigem
   Baum. Eine Regel, die nur aufgeschrieben ist, wird gebrochen.
2. **Grenzen anteilig, nie absolut.** Als der Kristall von 20 auf 60 stieg,
   wurden fünf Prüfungen still bedeutungslos, ohne dass etwas rot wurde.
   Dreimal dieselbe Falle.
3. **Prüfen, ob der Eingriff angekommen ist.** Drei von zehn Fehlerinjektionen
   scheiterten an der Probe, nicht am Tor.
4. **Das Modell darf nicht vom Gemessenen abhängen.** Hängt die Bewertung der
   Bauplätze an den Turmwerten, misst die Simulation zwei Dinge auf einmal.
5. **Eine Prüfung, die nie etwas meldet, ist kein Beweis.** `npm run proben`
   hält zwölf stehende Gegenproben und führt sie aus. Wer ein Tor ändert,
   trägt dort eine Probe nach. Jede Probe prüft zuerst, ob ihr Eingriff
   überhaupt angekommen ist — drei von zehn sind daran einmal gescheitert,
   und ein nicht angekommener Eingriff sieht aus wie ein bestandenes Tor.
6. **Im Menü ist keine Spielbedienung sichtbar. Niemals.** Keine Turmknöpfe,
   keine Kopfzeile, kein Prüfsteg — auf der Landkarte, in der Einweisung, im
   Fortschritt, auf dem Ergebnisbildschirm. Das ist zweimal schiefgegangen:
   einmal, weil niemand die Leiste ausblendete, und einmal, weil beim ersten
   Laden kein Phasenwechsel stattfand und der Aufruf ausblieb.

   Deshalb ist es **kein Schalter mehr, sondern eine Ableitung**: `ui.sync()`
   setzt die Sichtbarkeit in jedem Bild aus `istMenuOffen()`. Es gibt keine
   Stelle mehr, an der man es vergessen kann — und wer diese Ableitung
   entfernt, wird von `npm run proben` erwischt.
7. **Vor jeder Lieferung die vier Aufnahmen aus `npm run kritik` ansehen.**
   In v50 lag die Turmleiste über der Landkarte, man kam nicht ins Spiel, und
   alle vierzehn Tore waren grün. Ein Tor prüft, ob etwas funktioniert — nicht,
   ob man es spielen kann.
8. **Kein Tor ersetzt den Blick — und kein Blick die Tore.** Elf von 57
   Befunden kamen aus Bildschirmfotos. Seit v47 prüft `bildtor` wenigstens
   das Mechanische: einfarbige Fläche, falsche Helligkeit, nicht dekodierte
   Bilder. Ob es *gut aussieht*, sagt es weiterhin nicht.
9. **Vor dem Justieren den Raum ansehen.** `npm run eichen` probiert einen
   Wert durch und legt alle Kennzahlen nebeneinander. Blind nachjustieren
   heisst, durch ein Schlüsselloch zu schauen: T15 scheiterte so an drei
   Runden und gelang im zweiten Anlauf in einer.
10. **Das Soll kommt aus der Referenz, nicht aus mir.** Sonst wandert es mit
   der eigenen Leistung mit. Deshalb Schritt 0.
11. **Safari-Falle:** nie `drawImage(self)` mit `filter: blur` oder
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
