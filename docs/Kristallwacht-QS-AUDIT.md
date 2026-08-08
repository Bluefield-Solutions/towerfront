# Kristallwacht — Qualitätssicherung, tiefer Durchgang

*Stand: v35 · 08.08.2026 · Auftrag: keine Fehler, keine Lücken, keine Widersprüche*

Vorgehen: erst mechanisch (Typprüfung streng, ungenutzte Exporte, Wächterausgabe
vollständig gelesen), dann inhaltlich (Werte gegen den neuen Kristall gerechnet,
Spielstand manipuliert, alle Kombinationen aus Karte, Grad und Modus
durchgespielt), zuletzt die Dokumente gegen die Wirklichkeit.

**Elf Befunde, alle behoben. Neun neue oder korrigierte Prüfungen, jede
gegengeprobt.**

---

## 1 · Fehler im Spiel

### B1 — Ein Spielstand konnte Türme mitten ins Gelände setzen

**Schwere: hoch.** Bis v33 durfte man auf jeder freien Zelle bauen. Ein
Spielstand aus dieser Zeit — oder ein von Hand veränderter — wurde in v34
klaglos angenommen, und die Türme standen dann außerhalb jeder Plattform. Die
Zelle wäre dauerhaft blockiert gewesen.

Nachgewiesen: Turm im Spielstand auf 19/10 verschoben, Wiederherstellung meldete
`true`, Turm stand auf Nicht-Bauplatz.

**Behoben:** Jeder gespeicherte Turm wird gegen die Bauplätze seiner Karte
geprüft; Formatversion auf 9. Gegenprobe: ohne die Prüfung wird der verbogene
Stand wieder angenommen.

### B2 — Die Bauvorschau zeigte einen anderen Turm als das Bauen

Beim Halten über einem Platz erschien die alte gezeichnete Silhouette, nach dem
Loslassen stand dort das gerenderte Bild. **Behoben:** Die Vorschau nutzt
dasselbe Bild wie der gebaute Turm.

### B3 — Der Einführungsplatz der Laubschlucht lag nicht am Weg

Der Wächter hatte das gemeldet, ich hatte es überlesen. Die Einführung zeigte
auf einen Platz, von dem aus man kaum etwas trifft. **Behoben:** auf 7/7 verlegt.

---

## 2 · Prüfungen, die still falsch geworden waren

Das ist das Muster dieser Runde, und es ist dasselbe wie in der Tor-Bilanz:
**Als der Kristall von 20 auf 60 stieg, hörten mehrere Grenzen auf zu messen,
was sie messen sollten** — ohne dass sich am Spiel etwas verschlechtert hätte.

### B4 — 22 Wellenwarnungen auf einmal

`maxLeak < START_LIVES` meldete für die Wellen 6 bis 15 aller drei Karten
*„selbst bei totalem Durchkommen bleibt der Kristall stehen"*. Genau das ist
seit dem Umbau **beabsichtigt** — eine einzelne Welle soll nicht mehr tödlich
sein.

**Behoben:** anteilig. Eine späte Welle muss mindestens ein Viertel des
Kristalls kosten *können*, sonst ist sie belanglos. Von 34 Hinweisen auf 9.

### B5 — Die Grade wurden über die Zahl der Sieger verglichen

`wonCount('ruhig') <= wonCount('erbarmungslos')` schlug an, weil inzwischen auf
allen Graden alle drei Stile durchkommen — auf beiden Seiten drei.

**Behoben:** Verglichen wird die Punktzahl. Ruhig muss mindestens 12 Punkte vor
Erbarmungslos liegen; aktuell 100 gegen 73. Gegenprobe: setzt man Ruhig auf
dieselbe Kurve wie Erbarmungslos, schlägt sie an.

### B6 — Drei Sterne waren auf zwei von drei Karten unerreichbar

Die Schwellen lagen bei 90 und 55 % verbleibendem Kristall — aus der Zeit mit
20 Punkten, als ein guter Lauf fast verlustfrei war. Gemessen brauchte man 54
von 60; der beste Spielstil kam auf Spiralhain auf 18.

**Ein Ziel, das niemand erreicht, ist kein Ziel.**

**Behoben:** Schwellen auf 75 und 40 %, und eine neue Prüfung im Tor: auf jeder
Karte muss der beste Stil mindestens zwei Sterne schaffen, auf mindestens einer
drei, aber nicht auf allen. Aktuell 2 / 2 / 3.

### B7 — Die Einsteigerkarte war die schwerste geworden

Spiralhain 18 von 60 Kristall, Frostspalte 55 von 60. Die erste Karte war die
härteste. **Behoben** über die Ausgleichsfaktoren: 0,86 / 0,96 / 1,12. Jetzt
36 / 38 / 53 — die Reihenfolge stimmt, und die Sterne staffeln sich.

---

## 3 · Werte, die nicht mitgewachsen sind

### B8 — „Harter Kern" war wertlos geworden

Die dauerhafte Verbesserung gab **+2 Kristall**. Bei 20 waren das 10 %, bei 60
noch 3,3 % — für unverändert drei Sterne.

**Behoben:** Sie gibt jetzt **+15 %** statt fester Punkte, also +12 auf Ruhig,
+9 auf Normal, +8 auf Erbarmungslos. Ein Vorteil, der an einer anderen
Einstellung hängt, muss mit ihr wachsen.

### B9 — Modell und Simulation widersprachen sich beim Bogenturm

Die Zweig-Waage im Wächter sah die Salve 48 % vorn, die Simulation sah beide
gleichauf. Zwei Prüfungen, zwei Antworten. **Behoben:** Werte so gesetzt, dass
beide zustimmen — Faktor 1,28 im Modell, 15 gegen 14 Kristall im Lauf.

---

## 4 · Toter Code und Dokumente

### B10 — Zwei ungenutzte Exporte

`enemyArtVersion` und `hasGame` wurden nirgends aufgerufen. Entfernt. Der Rest
der Liste ungenutzter Exporte sind Typen und Karten-Konstanten, die über
Sammelexporte laufen — geprüft, alle erreichbar.

### B11 — Die Asset-Spezifikation widersprach dem Konzept 2.0

Sie forderte 2400 × 1320 im Verhältnis 20:11, Hintergründe **ohne** Weg und
drehbare Teile als *ein* Bild nach rechts. Konzept 2.0 fordert 16:9, den Weg
**im** Bild und acht Richtungen. Wer die alte Fassung an einen Bild-Agenten
gäbe, bekäme unbrauchbare Lieferungen.

**Behoben:** Warnkasten ganz oben mit einer Gegenüberstellung der drei
geänderten Punkte. Alles Übrige der alten Fassung gilt weiter.

Dazu: Versionsköpfe von Genre-Bericht (stand auf v20) und Tor-Bilanz
richtiggestellt.

---

## 5 · Was geprüft wurde und in Ordnung war

Damit der Bericht nicht nur aus Mängeln besteht:

- **Typprüfung streng** — keine Meldung.
- **Alle 18 Kombinationen** aus drei Karten, drei Graden und zwei Modi:
  gestartet, 10 Sekunden gespielt, gespeichert, geladen, Zustand verglichen —
  sauber.
- **Kartenwechsel:** kein Zustand der alten Karte bleibt zurück; auf jeder
  Karte lassen sich genau die zwölf Plattformen bebauen, keine liegt daneben.
- **Verkaufen** gibt den Platz wieder frei.
- **Sternvergabe** ist auf jedem Grad monoton.
- **Bildvorrat** vollständig versioniert (54 Dateien), aus einem sauberen
  Stand reproduzierbar, Abdruck stimmt.
- **Lesbarkeit** aller Türme und Gegner im Rahmen.
- **Der Umlaut-Wächter** hat während dieser Runde meine eigene frische
  Nachlässigkeit gefangen (`fuer` in einer neuen Beschreibung). Genau dafür
  ist er da.

---

## 6 · Was offen bleibt — bewusst

| | |
|---|---|
| **T15** | 75 % der Verluste liegen noch in der letzten Welle, Ziel sind 60 %. Drei Wellen sind betroffen, das Ziel ist zu zwei Dritteln erreicht. |
| **Laubschlucht ≈ Spiralhain** | Der Wächter meldet, dass beide Karten fast dieselbe Gegnermischung verlangen (Abstand 0,22). |
| **Berührungsflächen** | Kein Tor misst, ob die Knöpfe daumengroß sind. Der letzte ungeprüfte Teil der Lesbarkeit. |
| **Prozedurale Ersatzgrafik** | Türme und Gegner haben noch die gezeichneten Silhouetten als Rückfallebene, falls ein Bild nicht dekodiert. Rund 1000 Zeilen, die im Normalfall nie laufen. Bewusst behalten, bis die Bildpipeline sich als stabil erwiesen hat. |

---

## 7 · Die Lehre dieser Runde

Von elf Befunden waren **sechs keine Fehler im Spiel, sondern Prüfungen und
Werte, die nach einer Grundänderung nicht mitgewandert sind.** Der Kristall
stieg von 20 auf 60 — und damit wurden eine Warnschwelle, ein
Gradvergleich, zwei Sternschwellen, ein Kartenausgleich und eine dauerhafte
Verbesserung still bedeutungslos, ohne dass irgendetwas rot wurde.

> **Eine große Änderung an einer zentralen Größe muss eine eigene Durchsicht
> aller Grenzen nach sich ziehen, die diese Größe benutzen.** Für die Zukunft:
> Grenzen werden anteilig formuliert, nie absolut — genau wie die Kennzahl, die
> in v34 aus demselben Grund normiert wurde.
