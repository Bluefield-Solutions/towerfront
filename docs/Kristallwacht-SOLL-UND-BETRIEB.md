# Kristallwacht — Soll heben, Betrieb, Projektanweisungen

*08.08.2026 · Antwort auf drei Fragen: Wie heben wir das Soll? Cowork oder
etwas anderes? Was gehört in die Projektanweisungen?*

---

# Teil 1 · Warum mein Soll zu niedrig war

Du hast den Finger auf die richtige Stelle gelegt. Bisher lief es so: Ich baue
etwas, ich vergleiche es mit meiner eigenen Vorstellung von „gut", und weil ich
die Vorstellung selbst gesetzt habe, ist sie ungefähr so hoch wie das, was ich
gerade gebaut habe. **Das Soll wandert mit der Leistung mit.**

Beim Menü war das besonders deutlich. Ich habe „nicht überwältigend" in eine
Zahl übersetzt — höchstens fünf Elemente auf der ersten Ebene — und die Zahl
selbst gewählt. Sie ist verteidigbar, aber sie kommt von mir.

## Was die Recherche zeigt — und warum sie mein Ergebnis kippt

Ich habe nachgesehen, wie das Genre-Vorbild es macht. Das Ergebnis ist nicht
„etwas besser", sondern **etwas völlig anderes**:

<cite index="45-1">In Kingdom Rush kommt man über den Startknopf in die
Kampagne, und darüber hinaus gibt es praktisch nichts. Die Kampagne ist eine
Levelauswahl-Karte, wie sie in mobilen Spielen üblich ist.</cite>

<cite index="44-1">Jede Stufe ist auf einer Karte des Königreichs dargestellt,
und beim Anwählen bekommt man eine kurze Einweisung, was einen erwartet, bevor
das Level beginnt. Die Schwierigkeit lässt sich vor jeder Stufe einzeln
ändern.</cite>

**Sie haben kein Einstellungsmenü. Sie haben eine Landkarte.**

Meine drei Ebenen sind eine saubere Einstellungsliste — und damit die richtige
Lösung für die falsche Aufgabe. Ein Spiel öffnet keine Systemeinstellungen, es
zeigt eine Welt.

Dazu drei Punkte, die sich in mehreren Quellen decken und die ich als Maß
übernehme:

- <cite index="40-1">Höchstens fünf Punkte in der Hauptnavigation; ein
  verstecktes Menü senkt die Auffindbarkeit; Symbole immer mit Text; ein
  einheitlicher Rückweg; und der eigene Standort muss sichtbar sein.</cite>
- <cite index="39-1">Was am häufigsten gebraucht wird, darf höchstens ein bis
  zwei Tipper vom Hauptbildschirm entfernt sein.</cite>
- <cite index="41-1">Kritische Funktionen in zwei bis drei Tippern; vertraute
  Symbole; Beispiel Fortnite mit klar getrennten Bereichen und einem
  hervorgehobenen „Spielen".</cite>

---

# Teil 2 · Der Prozess: Referenzabgleich

Damit das Soll nicht mehr von mir kommt, bekommt jede Oberfläche einen
**Referenzabgleich**, bevor gebaut wird. Vier Schritte, fest.

## Schritt 1 — Referenz benennen

Drei konkrete Spiele, nicht „gute Spiele allgemein". Für jedes wird
aufgeschrieben, **was es tatsächlich tut**, mit Beleg. Nicht „Kingdom Rush
sieht gut aus", sondern „Kingdom Rush hat kein Einstellungsmenü, sondern eine
Landkarte mit Sternen je Stufe, und die Schwierigkeit wird an der Stufe
gewählt, nicht global".

## Schritt 2 — Soll ableiten

Aus den Beobachtungen wird ein Sollzustand, der **Verhalten beschreibt, nicht
Umsetzung**. Er darf über dem liegen, was ich heute bauen kann — das ist der
Sinn.

## Schritt 3 — Abstand messen

Jeder Punkt bekommt eine Zahl oder ein klares Ja/Nein. Was sich nicht messen
lässt, wird zu einer Bildfrage. Daraus entsteht eine Tabelle mit dem **Delta**,
und die ist der Auftrag.

## Schritt 4 — Loop bis das Delta null ist

Höchstens drei Runden, dann zurück zu dir.

## Beispiel: das Menü, so wie es jetzt aussehen müsste

| | Referenz | Wir heute | Delta |
|---|---|---|---|
| Grundform | Landkarte der Welt mit Stufen darauf | Einstellungsliste mit Zeilen | **groß** |
| Erster Bildschirm | Titel + ein „Spielen" | Titel + Spielen + 2 Zeilen | klein |
| Stufenauswahl | Karte, Stufen als Orte, Sterne daneben | Liste aus drei Kacheln | **groß** |
| Schwierigkeit | an der Stufe, direkt vor dem Start | global in einer Unterebene | **mittel** |
| Vor dem Start | kurze Einweisung: was erwartet mich | nichts | **mittel** |
| Fortschritt | eigener Bereich, aus der Karte erreichbar | Unterebene | klein |
| Rückweg | überall gleich | vorhanden | keins |

**Der Auftrag daraus lautet nicht „Menü schöner machen", sondern: aus dem Menü
wird eine Landkarte.** Ein Bild der Welt, drei Orte darauf, an jedem die
verdienten Sterne. Tippen auf einen Ort öffnet eine kurze Einweisung mit
Schwierigkeitswahl und dem Startknopf. Der Fortschritt hängt als eigener Ort
daran.

Das ist ein anderes Ziel als das, das ich mir gestern gesetzt hatte — und es
ist das richtige.

## Und eine Lücke, die ich zugeben muss

**Ich kann das Menü nicht sehen.** Meine Bildabnahme zeichnet die Leinwand; das
Menü ist HTML. Solange das so ist, kann ich Gestaltung dort nicht selbst
beurteilen — und genau deshalb ist mein Soll dort abgesackt.

Die Landkarte löst das nebenbei: **Wenn das Menü auf der Leinwand liegt, sehe
ich es.** Das ist kein Nebeneffekt, das ist ein Hauptargument dafür.

---

# Teil 3 · Cowork oder Claude Code?

Kurz: **Claude Code, nicht Cowork.** Das ist keine Geschmacksfrage, die beiden
sind für verschiedene Arbeit gebaut.

<cite index="50-1">Code ist ein Entwicklerwerkzeug für Quelltexte und Git im
Terminal und in der Entwicklungsumgebung; Cowork ist ein Schreibtischwerkzeug
für Wissensarbeit ohne Programmieren.</cite>

<cite index="55-1">Claude Code ist auf Quelltexte ausgelegt: Repositorien,
Tests, Commits, Pull Requests. Cowork ist auf Dokumente, Tabellen,
Präsentationen und Dateiorganisation ausgelegt.</cite>

Für unser Vorhaben — ein Repositorium, eine Torkette, Git-Marken je Version,
automatische Auslieferung — passt nur das erste. Cowork wäre das falsche
Werkzeug, so gut es für anderes ist.

## Was dadurch besser wird

Heute läuft alles in einer Sitzung, und **der Kontext ist die Sitzung**. Wenn
sie endet, ist die Kette weg; ich rekonstruiere aus Dokumenten. In Claude Code:

- **Der Quelltext ist der Kontext.** <cite index="51-1">Die Fähigkeiten
  arbeiten in einem beständigen Kontextsystem, lesen `CLAUDE.md` automatisch
  und bauen auf dem Stand früherer Sitzungen auf.</cite>
- **Git ist da, wo es hingehört.** Marken, Rücknahmen, Verlauf — heute simuliere
  ich das in einem Wegwerf-Verzeichnis.
- **Die Auslieferung läuft von selbst.** Push → GitHub Actions → Pages. Du
  lädst dein Lesezeichen neu und hast den neuen Stand. Kein Herunterladen mehr.
- **Du kannst es vom Telefon anstoßen.** Claude Code ist aus der Claude-App
  erreichbar — Ziel diktieren, später das Ergebnis spielen.

## Was einzurichten wäre

1. Repositorium anlegen, den jetzigen Stand hineinschieben (40 Versionen, alle
   Marken, der ganze Bildvorrat).
2. `CLAUDE.md` im Wurzelverzeichnis: Prozess, Torkette, Loop-Regeln, das
   Gelernte. Wird bei jeder Sitzung automatisch gelesen.
3. GitHub Actions: bei jedem Push auf `main` → `npm run gate` → nur bei grünem
   Tor bauen und nach Pages veröffentlichen. **Ein rotes Tor darf nie live
   gehen.**
4. Dein Lesezeichen zeigt auf die Pages-Adresse. Vollbild bleibt wie gehabt.

Das kann ich hier vorbereiten — Arbeitsablauf-Datei, `CLAUDE.md`, alles
committet. Anlegen und einmal koppeln musst du.

## Der ehrliche Vorbehalt

<cite index="52-1">Claude Code arbeitet mit den vollen Rechten deines
Benutzerkontos im Terminal, wodurch ein falsch gesetzter Rahmen schwerer
umkehrbare Änderungen verursachen kann.</cite>

Deshalb: eigenes Verzeichnis, nichts außerhalb, und **jede Änderung geht über
die Torkette**. Die haben wir ja schon — das ist genau die Disziplin, die den
Unterschied macht.

---

# Teil 4 · Projektanweisungen

Damit du wirklich nur noch grobe Ziele gibst, fehlen drei Dinge.

## A · Das Gelernte gehört an eine Stelle, die ich immer lese

Heute steht es verteilt über fünf Dokumente. Vorschlag: **`CLAUDE.md`** im
Wurzelverzeichnis, kurz gehalten, mit genau diesen Abschnitten:

```
Was das Spiel ist            drei Sätze
Wie gearbeitet wird          Loop, Rollen, Torkette, drei Runden je Ziel
Eiserne Regeln               die Sätze, die uns Runden gekostet haben
Aktueller Stand              Version, offene Blocker
Gelernt                      nummerierte Liste, nur was Verhalten ändert
```

Die eisernen Regeln stünden heute so drin — jede einzelne hat mich in dieser
Sitzung mindestens eine Runde gekostet:

1. **Erst einchecken, dann gegenproben.** Gegenproben arbeiten mit
   `git checkout` und löschen sonst die frische Arbeit. Zweimal passiert.
2. **Grenzen anteilig, nie absolut.** Als der Kristall von 20 auf 60 stieg,
   wurden fünf Prüfungen still bedeutungslos. Dreimal dieselbe Falle.
3. **Prüfen, ob der Eingriff angekommen ist.** Drei von zehn
   Fehlerinjektionen scheiterten an der Probe, nicht am Tor.
4. **Das Modell darf nicht vom Gemessenen abhängen.** Hing die
   Bauplatzbewertung an den Turmwerten, maß die Simulation zwei Dinge.
5. **Eine Prüfung, die nichts meldet, ist kein Beweis.**
6. **Kein Tor ersetzt den Blick aufs Gerät — und kein Blick die Tore.** Elf
   von 57 Befunden kamen aus Bildschirmfotos.
7. **Das Soll kommt aus der Referenz, nicht aus mir.** Neu, aus dieser Runde.

## B · Ein Fortschreibungszwang

Nach jeder Runde: Was ist gelernt worden? Wenn etwas, dann in `CLAUDE.md`
nachtragen — und zwar nur, wenn es **künftiges Verhalten ändert**. Eine Liste
aus 57 Befunden liest niemand mehr; sieben Regeln schon.

## C · Der Loop bekommt eine Vorstufe

Heute: Ziel → Arbeiter → Prüfer → Inspektor. Künftig davor:

```
0. Referenzabgleich   Drei Vorbilder, was tun sie, wo stehen wir, was ist das Delta
1. Arbeiter
2. Prüfer
3. Inspektor
```

Schritt 0 entfällt nur, wenn es für dieses Ziel schon einen Abgleich gibt.
**Das ist die Änderung, die dein „das Soll ist zu niedrig" strukturell
behebt** — nicht guter Wille, sondern ein Pflichtschritt vor dem Bauen.

---

# Was ich vorschlage

**Sofort, hier:** Menü als Landkarte bauen, nach dem Referenzabgleich oben.
Nebeneffekt — es liegt danach auf der Leinwand, und ich kann es selbst sehen.

**Dann:** `CLAUDE.md`, den Arbeitsablauf für GitHub Actions und eine
Einrichtungsanleitung committen, damit der Umzug nach Claude Code eine
Viertelstunde dauert.

**Danach:** Umziehen. Dort gibst du Ziele, ich arbeite die Schleife ab und
liefere über Pages aus — du lädst dein Lesezeichen neu.
