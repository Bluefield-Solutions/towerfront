# Kristallwacht — Konzept und Entwicklungspipeline

Stand: v2 · 07.08.2026
Arbeitsverzeichnis: `/home/claude/tower-defense` · Auslieferung: `/mnt/user-data/outputs/Kristallwacht.html`

---

## 1. Was gebaut wird

**Kristallwacht** ist ein Tower-Defense-Spiel im Browser. Eine einzelne,
eigenständige HTML-Datei, die offline läuft — auf dem iPhone im Querformat
genauso wie im Desktop-Browser.

**Der Kern in einem Satz:** Die Leere schickt Wellen über einen gewundenen Pfad
zum Herzkristall, und du entscheidest mit jedem Goldstück neu, ob du in Breite
oder in Tiefe investierst.

**Die Fantasie, die das Spiel bedient:** Ein Feld, das du selbst gebaut hast,
arbeitet ohne dich. Der Moment, in dem eine Welle startet und du nur noch
zuschaust, wie deine Anordnung sie zerlegt — das ist der Kern. Alles im Spiel
zahlt darauf ein.

### Gestalterische Richtung

Kein generisches grünes Wiesenfeld. Die Karte ist ein Diorama bei Nacht:
kaltes, mondbeschienenes Moos in Blaugrün, durchzogen von einem warmen,
knochenfarbenen Trampelpfad. Der Kontrast warm gegen kalt macht den Pfad auf
einem Handybildschirm in einer Zehntelsekunde lesbar — das ist kein
Schönheitsargument, sondern ein Bedienbarkeitsargument.

| Rolle | Farbe |
|---|---|
| Nachthintergrund | `#080B18` |
| Terrain (Moos) | `#173D3A` → `#215A50` |
| Pfad (Knochen/Sand) | `#C9A86A` |
| Herzkristall / UI-Akzent | `#7FE7E0` |
| Gold / Wirtschaft | `#F2C14E` |
| Gefahr / Verlust | `#E2566A` |
| Leere / Gegner | `#8B5CF6` |

**Das Signaturelement:** der Herzkristall. Er ist keine Zahl in der Ecke. Er
steht am Ende des Pfades, pulsiert, beleuchtet das Terrain um sich herum — und
bekommt sichtbare Risse, je mehr Leben verloren gehen. Der Spielstand ist ein
Objekt in der Welt, nicht ein Wert im HUD. Der Pfad windet sich einmal um ihn
herum, bevor er ihn erreicht: dadurch überlappen Turmreichweiten mehrfach und
gute Platzierung wird sichtbar belohnt.

**Schrift:** Systemschriften, bewusst. Eine eingebettete Schriftdatei würde die
HTML-Datei um hunderte Kilobyte aufblähen und den Offline-Anspruch teuer
erkaufen. Charakter entsteht stattdessen über Behandlung: winzige Großbuchstaben-
Labels mit weiter Laufweite über großen, tabellarischen Zahlen.

---

## 2. Architektur

Ein eigener Canvas-2D-Motor, kein Framework. React wäre für ein Feld aus
tausenden bewegten Pixeln pro Frame das falsche Werkzeug; die Menüs sind
normales DOM darüber, weil Knöpfe im DOM auf dem Handy besser zu treffen sind.

```
src/
  main.ts              Verdrahtung: Zustand, Renderer, UI, Eingabe, Schleife
  core/
    loop.ts            Spielschleife mit Zeitbegrenzung pro Frame
    input.ts           Zeiger- und Tastatureingabe
    math.ts            Vektor, Distanz, deterministischer Zufall
  data/                ← Hier wird Inhalt hinzugefügt, nicht im Code
    config.ts          Gitter, Farbwelt, Startwerte
    maps.ts            Karten als Wegpunkte + gesperrte Zellen
    towers.ts          Turmdefinitionen inkl. Ausbaustufen
    enemies.ts         Gegnerdefinitionen
    waves.ts           Wellenplan
  game/
    types.ts           Datenformen der Entitäten
    state.ts           Der gesamte Spielzustand und alle Systeme
  gfx/
    renderer.ts        Zeichnen: Kamera, Welt, Entitäten, Kristall
    terrain.ts         Untergrund, einmal gebacken
    glow.ts            Vorgebackene Leuchtscheiben
  ui/
    ui.ts              HUD, Baumenü, Turm-Inspektor, Bildschirme
  style.css
tools/
  check-autarkie.mjs   Prüft die gebaute Datei auf externe Abhängigkeiten
  sim.ts               Kopflose Balance-Simulation
```

### Drei Prinzipien, die das Wachstum billig halten

**Erstens: Inhalt lebt in `data/`.** Ein neuer Turm ist ein Objekt in
`towers.ts`. Eine neue Gegnerart ist ein Objekt in `enemies.ts`. Eine neue Karte
ist eine Liste von Wegpunkten. Kein System muss dafür angefasst werden. Das ist
der Grund, warum die nächsten fünfzig Iterationen nicht langsamer werden als
die ersten fünf.

**Zweitens: Statisches wird gebacken.** Der Untergrund wird genau einmal in ein
Offscreen-Canvas gezeichnet und danach nur noch als Bild kopiert. Leuchteffekte
sind vorgerenderte Scheiben, keine live berechneten Verläufe. Auf dem iPhone ist
das der Unterschied zwischen flüssig und ruckelig.

**Drittens: die Safari-Falle bleibt zu.** Ein Canvas darf sich niemals selbst
mit `drawImage` und `filter='blur'` oder `globalCompositeOperation='lighter'`
zeichnen. Auf dem Desktop sieht das gut aus, auf iOS Safari wird das Bild nach
etwa einer Sekunde schwarz. Der Autarkie-Check sucht aktiv nach diesem Muster
und lässt den Build durchfallen, wenn er ihn findet.

---

## 3. Die Pipeline

### 3.1 Der Iterationszyklus

Jede Iteration folgt exakt diesem Ablauf. Keine Ausnahmen, auch nicht bei
kleinen Änderungen.

1. **Ein Ziel.** Genau eine Sache pro Runde. Minimalinvasiv.
2. **Vor dem Ändern lesen.** Erst die betroffene Datei ansehen, dann greppen, ob
   es das schon gibt. Nichts doppelt bauen.
3. **`git diff` prüfen.** Nur die beabsichtigten Zeilen dürfen sich geändert
   haben. Andere Türme, andere Karten, andere Systeme bleiben unberührt.
4. **Das Tor durchlaufen:** `npm run gate`
   → TypeScript ohne Fehler → Build → Autarkie-Check → Balance-Simulation.
   Alles grün, sonst wird nicht ausgeliefert.
5. **Ausliefern.** Vollständige HTML-Datei als `Kristallwacht.html`.
6. **Auf Bestätigung warten.** Erst wenn im Browser bestätigt — auf dem iPhone
   *und* am Desktop — wird committet und getaggt (`v2`, `v3`, …).
7. **Daumen runter = sofortiger Rückbau.** `git checkout -- .`, zurück auf den
   letzten Tag, neuer Versuch.

### 3.2 Die Qualitätstore

Ein Befehl fährt alles: `npm run gate`

| # | Tor | Befehl | Bricht ab bei |
|---|---|---|---|
| 1 | Typen | `npm run tsc` | Typfehler, ungenutzte Variablen, fehlende Fälle |
| 2 | Datenwächter | `npm run guards` | widersprüchlichen Inhaltsdaten (siehe unten) |
| 3 | Balance | `npm run sim` | kaputter Schwierigkeitskurve (siehe unten) |
| 4 | Build | `npm run build` | Bündelfehler |
| 5 | Autarkie | `npm run autarkie` | externer URL, nicht inlintem Skript, Safari-Blur-Muster, fehlender DOM-Id |

**Der Datenwächter** liest Karten, Türme, Gegner und Wellen und prüft, was
TypeScript nicht sehen kann: Kreuzt sich der Pfad? Liegt eine Deko-Zelle darauf?
Gibt es genug Bauplätze? Steigt bei jedem Turm der Schaden mit der Stufe und
sinkt der Takt? Hat ein Umkreisturm überhaupt einen Bremswert? Verweist eine
Welle auf einen Gegner, den es nicht gibt? Ist mindestens ein Turm mit dem
Startgold bezahlbar? Bricht der Druck zwischen zwei Wellen ein? Fehler stoppen
den Build, Hinweise werden nur gemeldet.

**Die Balance-Simulation** lässt einen Bot alle fünfzehn Wellen mit fünf
Strategien durchspielen — ohne Browser, in Millisekunden. Vier Bedingungen
müssen halten:

1. Die gemischte Strategie muss gewinnen. Sonst ist die Kurve zu steil.
2. Sie darf nicht ohne einen einzigen Verlust gewinnen. Sonst fehlt die Spannung.
3. Keine einzelne Turmsorte darf allein mit mehr als 85 % Kristall gewinnen.
   Das ist die Regel, die verhindert, dass ein Turm alle anderen überflüssig macht.
4. Die Effektspitze muss unter 900 gleichzeitigen Objekten bleiben — was die
   Simulation erzeugt, muss das iPhone auch zeichnen können.

Zusätzlich meldet sie, in welchen Wellen Kristall verloren geht. Das ist die
Landkarte für die nächste Feinjustierung.

**Der Autarkie-Check** prüft außerdem, ob jede DOM-Id, die die Oberfläche
anspricht, im HTML wirklich existiert. Eine umbenannte Schaltfläche fällt damit
beim Build auf statt erst beim Antippen.

Die Balance-Simulation ist das eigentlich Ungewöhnliche daran: ein Bot spielt
alle zehn Wellen mit drei verschiedenen Strategien durch, ohne Browser, in
Millisekunden. Jede Änderung an Schaden, Reichweite, Kosten oder Gegnerwerten
wird sofort daran gemessen. So merken wir eine kaputte Kurve nicht erst beim
Spielen.

Aktueller Stand der Simulation:

```
nur Bogen    -> gewonnen, Kristall 5/20     ← knapp, kein Selbstläufer mehr
nur Frost    -> verloren in Welle 5
nur Moerser  -> verloren in Welle 3         ← zu teuer für die Eröffnung, korrekt
nur Prisma   -> verloren in Welle 3         ← ebenso
gemischt     -> gewonnen, Kristall 5/20
Verluste (gemischt): W10:5  W15:10          ← beide Titanenwellen, wie gewollt
```

Die Kurve sitzt jetzt dort, wo sie hingehört: Die Verluste passieren an den
beiden Bosswellen, nicht verteilt über das ganze Spiel. Das heißt, das Spiel
ist da schwer, wo es dramatisch sein soll.

### 3.3 Die Ausbaustufen

Das Spiel wächst in vier Phasen. Jede Phase hat ein Abnahmekriterium, das
erfüllt sein muss, bevor die nächste beginnt.

**Phase A — Fundament** *(v1, erledigt)*
Spielbare Schleife von Anfang bis Ende. Karte, Pfad, zwei Türme, drei Gegner,
zehn Wellen, Gold, Leben, Sieg, Niederlage. Nichts davon ist fertig, aber alles
davon existiert.
*Abnahme: Man kann gewinnen und man kann verlieren.*

**Phase B — Spielgefühl** *(v2, weitgehend erledigt)*
Der Moment des Treffens, des Bauens, des Verkaufens muss sich gut anfühlen. Ton,
Trefferrückmeldung, Bildschirmzittern, Wellenankündigung, flüssige Bedienung
mit dem Daumen. Hier entsteht der Unterschied zwischen "funktioniert" und
"macht Spaß".
*Abnahme: Fünfzehn Wellen am Stück auf dem iPhone, ohne dass etwas hakt.*

**Phase C — Tiefe**
Mehr Türme mit echten Rollen statt Zahlenvarianten. Mehr Gegnertypen mit echten
Gegenfragen (gepanzert, fliegend, heilend, teilend). Mehrere Karten. Ein
Fortschritt zwischen den Partien. Wellen bis 30 statt 10.
*Abnahme: Zwei Spieler bauen dasselbe Feld unterschiedlich — und beide gewinnen.*

**Phase D — Politur**
Feinschliff an Grafik, Menüführung, Übergängen, Texten, Barrierefreiheit,
Ladezeit. Der Punkt, an dem das Spiel aussieht, als hätte ein Studio es gemacht.
*Abnahme: Man erkennt keine Stelle mehr, an der etwas provisorisch aussieht.*

### 3.4 Wie vergessen wir nichts

Drei Mechanismen greifen ineinander:

**Das Rückstandsverzeichnis** (`Kristallwacht-BACKLOG.md`) führt jeden offenen
Punkt mit Phase, Nutzen und Aufwand. Nichts wird mündlich vereinbart. Was nicht
im Verzeichnis steht, existiert nicht.

**Die Tore** fangen Regressionen automatisch ab. Eine Balanceänderung, die Welle
9 unspielbar macht, fällt beim `npm run sim` auf, nicht drei Wochen später.

**Die Tags.** Jede angenommene Iteration bekommt einen Tag. Jeder Stand ist
jederzeit wiederherstellbar. Ein Fehlversuch kostet eine Minute, nicht einen
Abend.

---

## 4. Die Arbeitsteilung

**Ich übernehme:** Konzeption, Architektur, gesamten Code, Grafik, Balance,
Texte, Tests, Build, Auslieferung. Ich schlage nach jeder Runde die nächsten
Schritte vor, sortiert nach Nutzen für das Spiel.

**Du übernimmst:** Im Browser anschauen, eine Zahl tippen. Und wenn dir etwas
nicht gefällt, das sagen — dein Bauchgefühl beim Spielen ist die einzige
Information, die ich nicht selbst erzeugen kann.

Nach jeder Lieferung bekommst du:
- die vollständige, testbare HTML-Datei
- vier nächste Schritte, nach Nutzen sortiert, als antippbare Auswahl **und**
  als nummerierte Liste zum Abtippen

---

## 5. Stand v2

**Vier Türme mit vier echten Rollen** — nicht vier Zahlenvarianten. Der
Angriffstyp trennt sie, nicht die Schadenshöhe:

| Turm | Rolle | Wie er angreift |
|---|---|---|
| Bogenturm | Dauerfeuer | Einzelziel, zielsuchendes Geschoss |
| Frostturm | Umkreis-Bremse | kein Geschoss, pulst im Radius auf alle gleichzeitig |
| Mörser | Flächenschlag | ballistische Granate mit Vorhalten, Schaden fällt zum Rand ab |
| Prisma | Kettenblitz | Sofortstrahl, springt auf bis zu vier Nachbarn über |

**Vier Gegnerarten**, jede mit einer eigenen Gegenfrage: der Schleicher als
Masse, die Husche als Tempo, der Koloss mit Panzerung 3, der Leerentitan mit
Panzerung 6 und 55 % Bremsresistenz — der Grund, warum reines Bremsen nicht
reicht.

**Fünfzehn Wellen** mit Titanen in Welle 10 und 15.

**Frühstart-Bonus:** Wer die nächste Welle startet, bevor die 22 Sekunden
abgelaufen sind, bekommt bis zu 40 Gold extra. Das belohnt Entschlossenheit,
ohne Zögern zu bestrafen — und schafft die Spannung, die einer reinen
Aufbaupause fehlt.

**Bedienung am Daumen:** Drücken zeigt den Turm halbtransparent samt Reichweite
auf der Zelle, erst das Loslassen baut. Ein Fehltipp kostet kein Gold.

**Ton**, komplett synthetisch über Web Audio erzeugt — keine Audiodateien, die
Datei bleibt bei 48 KB. Jede Turmsorte klingt anders, gleichartige Geräusche
werden pro Frame begrenzt, damit es bei dreifachem Tempo keine Geräuschwand gibt.

**Wellenvorschau** über dem Baumenü: was kommt, wie viele, und ein Hinweis bei
besonderen Wellen.

**Spürbarkeit:** Kurzes Stocken beim Tod schwerer Gegner, Bildschirmzittern,
Explosionsringe, Trefferblitze, Turmsilhouetten, die mit der Ausbaustufe sichtbar
wachsen.

**Technik:** Bildrate wird gemessen, die Effektdichte passt sich automatisch an
(herunter nach 2 s unter 48 fps, herauf erst nach 8 s über 57 fps — die
unterschiedlichen Schwellen verhindern Hin- und Herspringen). Einstellungen und
bester Lauf werden lokal gespeichert. Beim Wechsel in eine andere App pausiert
das Spiel.

**Tastatur am Desktop:** Leertaste startet die Welle, 1–4 wählen den Turm,
U baut aus, X verkauft, P pausiert, Esc hebt die Auswahl auf.

Der Titelbildschirm zeigt die Versionsnummer. So ist im Browser jederzeit
sichtbar, welcher Stand gerade geladen ist.

Was noch fehlt: mehr als eine Karte, fliegende Gegner, Fähigkeiten auf Abruf,
Endlosmodus. Das komplette Rückstandsverzeichnis steht in der zweiten Datei.
