# Towerfront

Browser-Tower-Defense auf Deutsch. Eine autarke HTML-Datei, offline lauffähig,
ohne Spielgerüst von der Stange.

**Stack:** TypeScript 5 · Vite · `vite-plugin-singlefile` · Canvas 2D

---

## Loslegen

```bash
npm install
npm run gate     # 14 Prüfungen, rund 80 Sekunden
npm run build    # erzeugt dist/index.html — die spielbare Datei
```

`dist/index.html` im Browser öffnen. Mehr braucht es nicht: keine
Serverdienste, keine externen Bilder, keine Netzverbindung.

## Die wichtigsten Befehle

| Befehl | Wozu |
|---|---|
| `npm run gate` | Die Torkette. Grün heißt: darf ausgeliefert werden. |
| `npm run build` | Baut die eine HTML-Datei. |
| `npm run proben` | 25 Gegenproben — prüft, ob die Tore überhaupt etwas melden. |
| `npm run eichen` | Balance durchrechnen, Wertebereich absuchen. |
| `npm run kritik` | Bewertung gegen die Vorbilder. Aktuell 93 von 100. |
| `npm run bilder` | Aufnahmen aus dem laufenden Spiel nach `bilder/`. |
| `npm run einbettung` | Sitzen die Figuren in der Szene? Kennzahlen, kein Tor. |
| `npm run karte-lesen` | Wegnetz aus einem Kartenbild auslesen. |
| `npm run karte-einbauen` | Ausgelesene Bahnen nach `src/data/maps.ts` schreiben. |

## Wo was steht

* **`CLAUDE.md`** — Arbeitsweise und die elf eisernen Regeln. Wird zu Beginn
  jeder Sitzung gelesen; bewusst kurz gehalten, weil eine lange Datei nicht
  gelesen wird.
* **`docs/`** — alles Ausführliche: Konzept, Bildaufträge, Grafik-Audit,
  QS-Durchgänge, Schleifenbetrieb, Fundregister.
* **`src/data/`** — die Spielwerte. Türme, Gegner, Karten, Schwierigkeitsgrade.
* **`tools/`** — Torkette und Werkzeuge, alle über `npm run …` erreichbar.

## Bilder

Die Rohbilder liegen **nicht** im Repository: 79 MB gegen 1,2 MB gepackt. Was
das Spiel braucht, steht eingecheckt in `src/gfx/assets/`.

Wer nur am Code arbeitet, merkt davon nichts — Bauen, Spielen und die gesamte
Torkette laufen ohne sie. Wer neue Bilder einbaut, legt sie unter `art/roh/`
ab, lässt `npx tsx tools/pack-art.mjs` laufen und checkt das **Ergebnis** ein.

## Auslieferung

`.github/workflows/deploy.yml` baut bei jedem Push und veröffentlicht nach
GitHub Pages — **aber nur, wenn die Torkette grün ist.** Ein rotes Tor geht nie
live; sonst wäre die ganze Kette Zierrat.
