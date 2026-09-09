# Towerfront — die Kette

Stand: v269 · 09.09.2026

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
8. Inspektor             ein eigener Durchgang, der NUR Bericht und Bilder
                         sieht. Urteil: Freigabe · neue Schleife · Rückbau.
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
