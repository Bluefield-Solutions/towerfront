# Umzug — nur mit dem iPhone

*Korrigierte Fassung. Die erste Anleitung ging von einem Rechner aus. Ohne
Rechner geht es auch, aber anders — und ein Schritt ist unbequem.*

---

## Die gute Nachricht zuerst

**Claude Code braucht deinen Rechner nicht.** Es gibt eine Cloud-Fassung, die
genau das tut, was du willst:

> <cite index="61-1">Claude Code im Web läuft auf Cloud-Infrastruktur statt auf
> deinem Rechner. Aufgaben werden über claude.ai/code im Browser oder über die
> Claude-App eingereicht. Man braucht ein GitHub-Repositorium; Claude klont es
> in eine abgeschottete virtuelle Maschine, macht Änderungen und schiebt einen
> Zweig zur Durchsicht.</cite>

<cite index="59-1">Das Telefon ist dabei nur die Steuerung: Aufgaben werden in
normaler Sprache beschrieben, die Ausführung — Erzeugen, Testen, Dateien
ändern — läuft in einer abgeschotteten Umgebung auf Anthropics Servern.</cite>

`npm install`, `npm run gate`, alles: läuft dort, nicht bei dir. Du tippst nur
das Ziel.

<cite index="64-1">Jede Aufgabe läuft in einer abgeschotteten Umgebung mit
Netz- und Dateibeschränkungen; Git-Zugriffe gehen über einen Vermittler, der
sicherstellt, dass nur berechtigte Repositorien erreichbar sind.</cite>

Kleiner Vorbehalt: <cite index="62-1">Die Web-Fassung ist laut Dokumentation
eine Forschungsvorschau für Pro, Max, Team und Enterprise.</cite>

---

## Das eine Problem

Claude Code im Web setzt ein **bestehendes GitHub-Repositorium** voraus. Der
Quelltext liegt aber hier bei mir, nicht dort. Er muss einmal hinüber — und
genau dieser eine Schritt geht nicht von allein.

Drei Wege, mit ehrlicher Bewertung.

### Weg A — Working Copy auf dem iPhone *(empfohlen)*

Working Copy ist ein Git-Programm für iOS. Es kann ein Verzeichnis samt
`.git` importieren und nach GitHub schieben.

1. Archiv aus der Claude-App in **Dateien** sichern.
2. In Dateien lange auf `kristallwacht.tar.gz` tippen → **Entpacken**.
3. Auf GitHub (mobiler Browser) ein **leeres** Repositorium anlegen — ohne
   LIESMICH, ohne Lizenz.
4. In Working Copy: Repositorium hinzufügen → aus Dateien importieren → das
   entpackte `tower-defense` wählen. **Die ganze Geschichte kommt mit**: 52
   Commits, 42 Marken, der Bildvorrat.
5. In Working Copy den Fernzugang auf dein neues Repositorium setzen und
   schieben.

*Kosten:* Working Copy ist zum Lesen frei, das Schieben braucht den
kostenpflichtigen Vollzugang (einmalig, etwa 25 Euro).
*Vorteil:* kein Geheimnis in einem Chatverlauf, Geschichte bleibt erhalten.

### Weg B — Ich schiebe von hier aus

Ich habe Netzzugang zu github.com. Wenn du mir einen **feingranularen Zugriffs-
schlüssel** anlegst (nur dieses eine Repositorium, nur Inhalte lesen/schreiben,
Ablauf in 7 Tagen), schiebe ich alles in einem Zug hoch — Geschichte, Marken,
Bildvorrat.

*Der Haken, und er ist echt:* Der Schlüssel steht danach in diesem
Chatverlauf. Wenn du diesen Weg willst, dann bitte so eng wie eben möglich und
**lösche ihn auf GitHub direkt nachdem der Push durch ist**. Dann ist er tot,
egal wer ihn später liest.

*Vorteil:* dauert zwei Minuten, kostet nichts.

### Weg C — Über die GitHub-Weboberfläche hochladen

Geht am Telefon, aber die **Geschichte geht verloren** — 42 Marken, alle
Befunde im Verlauf. Dazu 54 Bilddateien einzeln hochladen. Ich rate ab.

---

## Danach: alles am Telefon

Ab hier brauchst du nichts weiter als Safari.

**Pages einschalten** — im Repositorium unter *Settings → Pages* die Quelle auf
`GitHub Actions` stellen. Der Arbeitsablauf liegt schon dabei.

**Der erste Lauf** startet von selbst. Unter *Actions* siehst du zu: erst die
Torkette, dann die Auslieferung. Ist ein Tor rot, bricht er ab und
veröffentlicht nichts.

**Lesezeichen umhängen** — `https://<dein-name>.github.io/kristallwacht/`
öffnen, Teilen → Zum Home-Bildschirm. Vollbild und Querformat sind im Dokument
schon eingestellt.

**Arbeiten** — in der Claude-App Claude Code öffnen, das Repositorium
verbinden, Ziel eintippen:

> Ziel: Der Siegbildschirm soll zur Landkarte passen.
> Abnahme: auf der Leinwand, gleiche Formensprache, höchstens fünf antippbare
> Elemente, Rückweg zur Karte.

`CLAUDE.md` wird dabei automatisch gelesen — Prozess, Torkette, eiserne
Regeln, Stand. Ich arbeite die Schleife ab, schiebe, die Auslieferung läuft,
du lädst dein Lesezeichen neu.

---

## Was du dabei aufgibst

Ehrlich gesagt: wenig, aber nicht nichts.

- **Die Bildabnahme kann ich weiter nutzen** — sie läuft in Node und braucht
  keinen Browser. Sie ist aber nicht Teil der Torkette, sondern wird eigens
  angestoßen; im Cloud-Durchgang muss ich sie also selbst aufrufen und die
  Bilder ansehen.
- **Ein Zweig statt direkt auf `main`.** Claude Code im Web schiebt zur
  Durchsicht einen Zweig. Für die Auslieferung muss dieser zusammengeführt
  werden — ein Tipper in der GitHub-App. Wenn dir das zu viel ist, lässt sich
  der Arbeitsablauf auf jeden Zweig erweitern; dann geht aber auch ungeprüfte
  Arbeit live. **Ich rate davon ab.**

---

## Meine Empfehlung

**Weg A**, wenn dir die 25 Euro nichts ausmachen — sauber, ohne Geheimnis im
Chat, Geschichte bleibt.

**Weg B**, wenn es heute noch laufen soll. Dann bitte mit engem Schlüssel und
sofortigem Löschen danach.
