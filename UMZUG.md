# Umzug nach GitHub

Alles vorbereitet. Es fehlen nur die Dinge, die ich nicht haben darf.

## Was schon erledigt ist

* **Geschichte bereinigt.** Die Rohbilder lagen mit 79 MB in der
  Versionsgeschichte, obwohl sie zum Bauen nicht gebraucht werden. Das
  Verzeichnis ist jetzt ausgenommen und aus der Geschichte entfernt:
  **84 MB → 5,2 MB**, alle 176 Einträge und 104 Marken erhalten.
* **Geprüft nach der Umschreibung:** Torkette grün, Arbeitsstand unberührt,
  Rohbilder liegen weiterhin auf der Platte.
* `CLAUDE.md` erklärt, wie man mit Bildern arbeitet, ohne sie einzuchecken.

## Was du tun musst

**1. Leeres Repository anlegen**

`github.com/new` → Name `towerfront`, **ohne** README, ohne .gitignore,
ohne Lizenz. Es muss leer sein, sonst kollidiert es mit unserer Geschichte.

**2. Zugangsschlüssel erzeugen**

`github.com/settings/personal-access-tokens/new` (Fine-grained):

* Repository access: **Only select repositories** → `towerfront`
* Permissions → Repository permissions → **Contents: Read and write**
* Expiration: **7 Tage** genügt

**3. Mir drei Angaben schicken**

```
Nutzername:   dein-github-name
Repository:   towerfront
Schlüssel:    github_pat_...
```

Ich lade dann hoch — alle Einträge, alle Marken.

**4. Sofort danach den Schlüssel löschen**

Unter `github.com/settings/tokens` → Revoke. Er wird nur einmal gebraucht.

## Danach: Claude Code auf dem Handy

```
git clone https://github.com/DEIN-NAME/towerfront.git
cd towerfront
npm install
npm run gate
```

`npm run gate` ist der Prüfstein: Läuft er durch, ist der Umzug vollständig.

**Ohne die Rohbilder** fehlt nur `npx tsx tools/pack-art.mjs`. Alles andere -
Spielen, Bauen, Balance eichen, Karten auslesen aus neuen Bildern - läuft.

## Falls du die Rohbilder auch dort brauchst

Sie liegen im Archiv `towerfront.tar.gz`, das ich mit jeder Lieferung
mitschicke. Einfach nach `art/roh/` entpacken; Git ignoriert sie dann.
