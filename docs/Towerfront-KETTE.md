# Towerfront — die Kette

Stand: v303 · 10.09.2026

**Nachgesehen in v303 — die Kette hat acht Runden am Stueck getragen, und der
Ablauf hat dabei dreimal etwas gefangen, das kein Tor gesehen haette.**

**Schritt 5 (Gegenprobe) ist der Schritt, der arbeitet.** In v296 bis v303 hat
er sechs Entwuerfe zurueckgewiesen, die nichts bewiesen haetten - zuletzt drei
in zwei Runden: ein Zweig, der von Bauart nicht anschlagen kann (v301, der
Wert ist zugleich Schalter und weitergereichter Wert), eine Probe, die am
Eingriff vorbeisah (v301, beide Seiten gewinnen, die Differenz bleibt gross),
und zwei Proben, deren Zeile sich geaendert hatte (v303).

**Schritt 8 (Inspektor) hat in v298 zum ersten Mal SCHLEIFE geurteilt**, und
er hatte recht: ein rotes „Weg" lag hinter zwei Bauwerksnamen. Vier Messungen
an derselben Leiste hatten vorher null gemeldet, weil sie alle nach der LEISTE
fragten und das Kaestchen nicht zu ihr gehoert. **Regel 8 irrt in beide
Richtungen** - in derselben Runde hatte mein Auge einen Ueberlauf gesehen, den
es nicht gab.

**`npm run muster` ist der billigste Schritt und faengt am meisten.** 0,4 s je
Lauf, und in diesen acht Runden hat er dreimal eine Probe gemeldet, die ihren
Gegenstand verloren hatte, und einmal die Zeitratsche gezogen: der naechtliche
Probenlauf war am 10.09. nicht angesprungen (zuletzt am 09.09.), und ohne
diese Zeile waere es niemandem aufgefallen. Ein Nachtlauf, der still ausfaellt,
ist genau die Klasse, gegen die dieses Verzeichnis anschreibt.

**Was eine Runde kostet, gemessen ueber v296 bis v303:** `npm run vorlauf`
4,4 s, `npm run sim` inzwischen **2:29** (v300 hat 22 s dazugelegt: 24 Laeufe
statt 8 fuer die Verteiler-Zusage), die beruehrten Tore zwei bis dreizehn, der
Runner-Lauf danach 6 bis 7 Minuten. Eine Balancerunde mit Durchprobieren
kostet ein Vielfaches davon - v297 hat sieben `sim`-Laeufe gebraucht, v301
sechs C18-Laeufe und drei `sim`.

**Nachgesehen in v296 — der Ablauf trägt, und Schritt 5 hat in v290 bis v296
sechsmal etwas zurückgewiesen, das nichts bewiesen hätte.** Zuletzt zweimal in
einer Runde: den Wert des Stilabstands auf UNBELEGT zu setzen (das löst den
bestehenden Wächter „war belegt und ist es nicht mehr" aus) und einen zweiten
Wächter dagegen, sich hinter UNBELEGT zu verstecken (der macht eine Kennzahl,
die zwischen belegt und unbelegt springt, auf Dauer rot). Beides wäre ein
zweiter Würfel gewesen, wo gerade einer abgeschafft wurde.

**Zwei Ergänzungen aus diesen Runden gehören in den Ablauf selbst:**

* **Schritt 2 fragt vor dem Ausliefern `npm run beruehrt`** — und seit v294
  gilt für die vier Bündeltore eine **Regel** statt einer Liste: was unter
  `src/` liegt oder `index.html` heisst, geht ins Bündel. Zweimal in drei
  Runden ist der Runner genau an dieser Lücke rot geworden.
* **Schritt 4 (Inspektor) läuft ohne Bericht**, seit die Torkette auf dem
  Runner steht. Das ist kein Mangel: `npm run inspektor` sagt es selbst
  („kein Bericht"), prüft mechanisch, dass kein Quelltext im Ordner liegt,
  und nennt vorweg, ob sich die **Eingänge** des Bildes überhaupt geändert
  haben. Was er beurteilt, sind die Aufnahmen — und dafür braucht er den
  Bericht nicht.

**Was eine Runde hier wirklich kostet, gemessen über v290 bis v296:**
`npm run vorlauf` 4,4 s, die berührten Tore je nach Änderung zwei bis zwölf,
`npm run sim` 127 s je Durchlauf — und der ist der Taktgeber, sobald an der
Balance etwas hängt. v296 hat drei gebraucht (Grundlauf, neues Band, der
gestellte Zuschlag von 0,15). Der Runner-Lauf danach: **6 Minuten.**

**Nachgesehen in v289 — der Ablauf trägt weiter, und Schritt 3 hat gelernt,
sich nicht selbst zu blockieren.** `npm run naechste` nahm bis v288 die erste
offene Story in Dokumentreihenfolge und sah die Zeile `**Hängt an:**` nicht
an. Damit hält eine Story, die auf eine **spätere** wartet, die ganze Kette
an — in v287 genau passiert. Seit v289 wird die Zeile gelesen (aus dem
Katalog, nicht aus einer zweiten Liste), Wartendes wird übersprungen und mit
Grund genannt, und ein Ring bricht ab statt sich eine Story auszusuchen.

**Schritt 5 hat in den Runden v286 bis v288 fünfmal eine Probe
zurückgewiesen, die nichts bewies** — die `margin`-Zeile aus v239 (die seit
zehn Fassungen tot war), der gestellte Freiraum im Band, die geratene
Umbruchgrenze, die falsche Zusage der Freimenge, und `autarkie` ohne frischen
Bau. Dreimal war nicht die Probe zu verbessern, sondern die geprüfte Sache
falsch verstanden. Das ist der Schritt, der arbeitet.

**Und Schritt 2 hat eine Ergänzung bekommen, die eine Runde gekostet hat:**
`npm run beruehrt` nennt vor dem Ausliefern die Tore, die an den geänderten
Dateien hängen. v286 fasste `index.html` an, fuhr fünf passende Tore und
`autarkie` nicht — genau das wurde auf dem Runner rot.

**Nachgesehen in v282 — der Ablauf trägt, und zwei Stellen sind schärfer
geworden.** Schritt 8 ist seit v275 mechanisch (`npm run inspektor` sagt
vorweg, ob es etwas Neues zu sehen gibt); gemessen über die Runden v278 bis
v282 hat er dreimal `NEU` gemeldet und dreimal ein Urteil bekommen. Und
Schritt 5 hat in dieser Kette **viermal** eine Probe zurückgewiesen, die
nichts bewies (Regel 3) — der Gleichstands-Selbsttest in v279, der
Sprungmesspunkt zweimal in v280, und der Freiraum-Entwurf der Nordschleife.
Das ist kein Ärgernis, sondern der Schritt, der arbeitet: eine Probe, die den
Fall nicht wirklich herstellt, sieht aus wie ein bestandenes Tor.

**Wie eine Runde läuft, wenn niemand zusieht.** Die Beschlüsse dahinter stehen
in `Towerfront-NEUBAU.md` Abschnitt 4; hier steht nur der Ablauf.

Dieses Dokument hat vorher gefehlt, obwohl der stündliche Wecker seit v268 auf
es verwies. Genau die Klasse, die dieses Projekt sechsmal bezahlt hat: eine
Regel, die nur behauptet wird, gilt nicht.

---

## Eine Runde

```
1. Baum sauber?          git status --short   — sonst erst aufräumen
2. Runner grün?          den letzten Lauf abfragen. Ein ROTER Lauf ist die
                         nächste Runde, nicht ein Hinweis für später.
3. Was ist dran?         npm run naechste     — liest docs/Towerfront-STORIES.md
4. Bauen                 genau eine Story, nach ihrer Abnahme. Deutsch, auch
                         im Quelltext.
5. Gegenprobe            in tools/probes.mjs nachtragen und mit
                         npm run proben -- "<Name>" nachfahren (Regel 5)
6. Vorlauf               npm run vorlauf      — 4 s, nur tsc. Kein Tor.
7. Buchführung           VERSION in src/data/config.ts, Zeile in
                         docs/Towerfront-BACKLOG.md, Stand in CLAUDE.md
8. Inspektor              ein eigener Durchgang, der NUR Bericht und Bilder
                         sieht. Urteil: Freigabe · neue Schleife · Rückbau.
                         `npm run inspektor` sagt seit v275 vorweg, ob es
                         ueberhaupt etwas Neues zu sehen gibt: meldet es
                         UNVERAENDERT, traegt das letzte Urteil weiter und
                         wird beim Namen genannt - eine Runde an Werkzeugen
                         und Dokumenten kann das Bild nicht aendern, und
                         drei solche Durchgaenge hintereinander haben
                         dieselben Befunde geliefert. Meldet es NEU, wird
                         geurteilt.
                         (Das Werkzeug dafür baut S-N0-03; bis dahin
                         geschieht es von Hand — und der Doku-Wächter hat
                         genau darauf bestanden: hier stand erst der Befehl,
                         den es noch gar nicht gibt.)
9. Ausliefern            commit, tag vNN, push auf den Arbeitszweig UND auf
                         master. Der Push löst die volle Torkette auf dem
                         Runner aus; nur bei grüner Kette geht es live.
10. Sofort weiter        zurück zu 1.
```

**Höchstens drei Schleifen je Ziel.** Danach ist nicht die Ausführung das
Problem, sondern das Ziel — dann zurück zum Nutzer.

### Was ein Urteil für die Auslieferung heißt

Das hat beim ersten Inspektorlauf gefehlt und wurde sofort gebraucht:

| Urteil | wird ausgeliefert? | und dann? |
|---|---|---|
| `Freigabe` | ja | nächste Story |
| `Schleife` | **ja** | die Befunde werden Stories und kommen nach vorn |
| `Rueckbau` | **nein** | zurück zum Nutzer, das Ziel trägt nicht |

**Warum `Schleife` ausliefert.** Der Inspektor urteilt über den **Zustand**,
nicht über das Ziel der Runde — er weiß ja gar nicht, woran gearbeitet wurde.
Würde eine Schleife die Auslieferung anhalten, ginge nichts mehr live, bis das
Spiel fehlerfrei ist; und dann gäbe es keinen spielbaren Zwischenstand mehr,
also auch keinen Blick, also auch keinen Inspektor. Nur `Rueckbau` hält an:
dort sagt der Blick, dass das Ziel selbst nicht trägt, und das ist eine Frage
an den Nutzer.

---

## Warum die Torkette nicht mehr hier läuft

Gemessen in v268: `npm run gate` dauert **426 s**, und sechs Schritte tragen
85 % davon (`sim` 127 s, `browser` 76 s, `wegdeckungtor` 64 s, `bildtor` 41 s,
`smoke` 29 s, `uxaudittor` 26 s). Bei stundenlangem Betrieb ist das die
Obergrenze des Durchsatzes.

Eine **Umfangskette** — nur die Tore, die von den geänderten Dateien betroffen
sind — wurde gerechnet und spart gemessen **nur 35 %**: `sim` und `browser`
hängen an `state.ts` und `ui.ts`, und die fasst jede Spielrunde an. Bei einer
reinen Datenrunde wären es 81 %, bei einer Werkzeugrunde 67 % — aber die
Spielrunden sind die Mehrheit.

Der Nutzer hat deshalb entschieden: **die Torkette läuft auf dem Runner.** Hier
läuft je Runde nur `npm run vorlauf` (4,4 s, nur `tsc`).

**Das Risiko ist bekannt und benannt:** ein roter Lauf wird erst nach dem Push
sichtbar. Zwei Dinge fangen es auf — die Auslieferung hängt an der grünen
Kette, geht also nicht live; und Schritt 2 fragt den letzten Lauf ab, **bevor**
die nächste Runde beginnt. Ein roter Lauf ist dann die nächste Runde.

---

## Was auf dem Runner läuft

| Wann | Was | Dauer |
|---|---|---|
| jeder Push auf `master` | die volle Torkette, 33 Schritte | 3–4 min |
| jede Nacht | `npm run proben -- --voll` | rund 50 min |

Der Nachtlauf schreibt seinen Befund nach `tools/proben-befund.txt` und checkt
ihn ein — auch nach einem roten Lauf. `npm run muster` liest die Datei in jeder
Torkette, also wird der Befund rot, statt im Protokoll des Runners zu bleiben.

**Die Ratsche darauf ist seit v269 eine Zeitratsche:** der letzte volle Lauf
darf nicht älter als **24 Stunden** sein. Vorher waren es drei Fassungen — das
trug, solange eine Fassung ungefähr ein Tag war, und blockierte die Kette,
sobald sie schneller wurde. Die Fassungszahl steht weiter in der Meldung, sie
urteilt nur nicht mehr.

---

## Wenn ein Tor seinen Gegenstand verliert

**Es wird in derselben Runde umgebaut oder ersatzlos gestrichen.** Kein
Stummschalten, keine befristete Ausnahme, keine verkleinerte Kette.

Der Grund steht im Baum: v233 — *„eine Ausnahme, die man einmal einräumt,
bleibt stehen, bis niemand mehr weiß, dass sie eine war"*; v230 — ein Tor lief
23 Fassungen ins Leere; v233 — `bahntreuetor` ist seitdem gegenstandslos und
sagt es wenigstens selbst.

Der Preis ist ehrlich: manche Runde besteht **nur** aus dem Umbau eines Tores
und liefert kein Spiel. Das ist eingeplant.

---

## Wenn ein Bild fehlt

Nicht warten. Gebaut wird gegen einen **erkennbaren Platzhalter**, den das
Bildtor als offene Bestellung meldet — grün darf der Lauf sein, verschweigen
darf er es nicht.

Die Aufträge sammeln sich in `Towerfront-BILDAUFTRAG.md` und gehen
**gebündelt** an den Nutzer: fertige Blöcke zum Kopieren, Stil-Block schon
eingesetzt, mit den Abnahmezahlen. Der Empfänger sieht das Gespräch nicht, also
ist jeder Block in sich verständlich.

---

## Was der Nutzer zu sehen bekommt

* **Nach jeder Runde:** nichts. Der Stand ist unter `/` spielbar.
* **Bei einer Blockade:** sofort, mit dem, was fehlt.
* **Bei Bildbedarf:** der fertige Block.
* **Alle zehn Runden:** ein Sammelbericht.

Bei acht Runden je Stunde wären Einzelmeldungen Dutzende.

---

## Die zwei Adressen

| | |
|---|---|
| `/` | der Neubau, nach jeder ausgelieferten Runde frisch |
| `/v268.html` | die letzte Fassung des alten Spiels, eingefroren |

Die eingefrorene Datei liegt als gebaute HTML in `web/` und wird vom
Auslieferungsplan neben den frischen Bau kopiert. Eine Kopie, kein zweiter
Bau — sie braucht weder Quelltext noch Torkette.
