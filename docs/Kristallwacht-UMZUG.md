# Umzug nach Claude Code — Schritt für Schritt

*Geschätzt eine Viertelstunde. Alles, was hier vorbereitet werden konnte, ist
vorbereitet: `CLAUDE.md`, der Arbeitsablauf, der relative Grundpfad.*

---

## Was du brauchst

- Einen GitHub-Zugang.
- Claude Code auf dem Rechner (`npm install -g @anthropic-ai/claude-code`,
  danach `claude` im Verzeichnis starten).
- Dein bestehendes Lesezeichen auf dem iPhone — das bekommt am Ende nur eine
  neue Adresse.

---

## 1 · Den Stand herausholen

Das Projekt liegt hier in `/home/claude/tower-defense` mit vollständiger
Geschichte: 42 Versionen, jede als Marke. Ich packe es dir als Archiv, du
entpackst es lokal. Die Marken kommen mit — `git log --oneline` zeigt dann
alles von v1 bis v42.

```bash
tar -xzf kristallwacht.tar.gz
cd tower-defense
npm install
npm run gate          # muss grün sein, bevor irgendetwas anderes passiert
```

---

## 2 · Repositorium anlegen

Auf GitHub ein neues, **leeres** Repositorium anlegen — ohne LIESMICH, ohne
Lizenz, sonst gibt es beim ersten Push einen Konflikt.

```bash
git remote add origin git@github.com:<dein-name>/kristallwacht.git
git branch -M main
git push -u origin main --tags
```

Der Bildvorrat ist mit versioniert (54 Dateien, rund 6 MB), das Repositorium
ist also von Anfang an vollständig und reproduzierbar.

---

## 3 · Pages einschalten

Im Repositorium unter **Settings → Pages**:

- **Source:** `GitHub Actions` (nicht „Deploy from a branch")

Mehr nicht. Der Arbeitsablauf liegt schon in
`.github/workflows/deploy.yml` und meldet sich selbst an.

Beim ersten Push läuft er los. Unter **Actions** kannst du zusehen: erst die
Torkette, dann die Auslieferung. **Ist ein Tor rot, bricht er ab und liefert
nicht aus** — das ist der wichtigste Satz an der ganzen Einrichtung.

Danach liegt das Spiel unter:

```
https://<dein-name>.github.io/kristallwacht/
```

---

## 4 · Das Lesezeichen umhängen

Auf dem iPhone die neue Adresse öffnen, Teilen → **Zum Home-Bildschirm**. Die
Kopfzeile im Dokument sorgt schon dafür, dass es im Vollbild startet und quer
bleibt.

Ab jetzt: Ich schiebe, du lädst neu. Kein Herunterladen mehr.

---

## 5 · Die erste Sitzung in Claude Code

Im Verzeichnis `claude` starten. `CLAUDE.md` wird automatisch gelesen — Prozess,
Torkette, eiserne Regeln, Stand. Ein Auftrag sieht dann so aus:

> Ziel: Der Siegbildschirm soll zur Landkarte passen.
> Abnahme: liegt auf der Leinwand, gleiche Formensprache, höchstens fünf
> antippbare Elemente, Rückweg zur Karte.

Und der Rest läuft: Referenzabgleich, bauen, `npm run schleife`, Bilder
ansehen, urteilen, bis zu drei Runden, dann committen, markieren, pushen. Du
lädst dein Lesezeichen neu und spielst.

---

## Was du im Blick behalten solltest

**Rechte.** Claude Code arbeitet mit den Rechten deines Benutzerkontos. Halte
es im Projektverzeichnis; alles Wichtige ist ohnehin in Git, ein Fehlgriff ist
also mit `git checkout` zu heilen.

**Die Torkette ist die Sicherung, nicht mein Urteil.** Sie läuft lokal vor
jedem Commit und noch einmal in der Auslieferung. Beides ist Absicht: lokal
schnell scheitern, in der Auslieferung nichts durchlassen.

**Erst einchecken, dann gegenproben.** Das ist Regel eins in `CLAUDE.md` und
hat mich in dieser Sitzung zweimal eine Runde gekostet.

---

## Was danach besser läuft als heute

| | Heute | Nach dem Umzug |
|---|---|---|
| Kontext | Die Sitzung. Endet sie, rekonstruiere ich aus Dokumenten | Der Quelltext und `CLAUDE.md`, sitzungsübergreifend |
| Git | Ein Wegwerf-Verzeichnis, das mit der Sitzung verschwindet | Echtes Repositorium mit 42 Marken |
| Auslieferung | Datei anhängen, du lädst herunter | Push → Torkette → Pages, du lädst neu |
| Vom Telefon | Nur Chat | Ziel diktieren, später das Ergebnis spielen |
| Rückbau | „ich stelle wieder her" | `git revert`, mit Verlauf |
