# Towerfront — der Neubau

Stand: v302 · beschlossen am 09.09.2026

**Nachgesehen in v302 — N3 ist zu, und N1 hat angefangen zu antworten.**

**Paket N3 ist vollstaendig.** Foerderer (v285), teurere Wiederholung (v287,
scharf seit v297), reparierbarer Kristall (v290) und Vielfaltsbeute (v299,
scharf seit v301) stehen alle vier im Spiel. Die Beute nach Vielfalt ist dabei
die einzige der vier Regeln, die nicht ueber den PREIS geht - und die einzige,
die sich sauber trennt: der Haeufer bekommt auf jeder Karte +0 Gold, der
Mischer +58 bis +170.

**Und der Satz aus v295 gilt weiter, jetzt mit vier Belegen:** die knappe
Groesse ist nicht das Gold und nicht der Platz, sondern die gute Stelle. Der
Bannturm macht 18 Kristall Unterschied durch die LAGE, wo die ganze Turmwahl
sechs macht.

**N1 hat in v302 seinen Zustand bekommen** - `LaufZustand` haelt den
Wellenzaehler ueber die Abschnitte hinweg. Und der erste kopflos gefahrene
Lauf hat sofort gesagt, was dem Beschluss noch fehlt:

| Abschnitt | Rampe | Ergebnis |
|---|---|---|
| Spiralhain | 1,00 | gewonnen, 42/42 |
| Ascheschlucht | 1,12 | gewonnen, 42/42 |
| Frostspalte | 1,82 | gewonnen, 42/42 |
| **Farnkessel** | **15,17** | **verloren in Welle 7** |

**Der Bogen als Roguelite-Lauf braucht eine eigene Kurve.** Die heutige ist an
EINER Karte mit 15 Wellen geeicht; ueber 60 gestreckt liegen drei Abschnitte
im flachen Teil und einer im Knie. Das ist die naechste Balancefrage von N1 -
und sie ist erst jetzt stellbar, weil es einen Lauf gibt, an dem man sie
messen kann.

**Vier Runden dieser Kette waren Messgeraet statt Spiel** (v296, v298, v300,
und die halbe v301), und das ist kein Umweg gewesen: zweimal stand eine
Ratsche neben ihrem eigenen Rauschen und hat Entscheidungen gewuerfelt. Beide
Male war die Reparatur eine Messung und keine gelockerte Grenze.

**Nachgesehen in v295 — N3 steht auf drei von drei Sätzen, und die Antwort
auf die eigene Frage von v288 ist gemessen: sie lautet nicht „Preis", sondern
„Lage".**

Der dritte Satz ist gebaut: die **Werft** (v290) setzt den Kristall nach jeder
Welle stückweise zusammen, wirkt global und lässt am Ende der besten Partie
gemessen vier Kristallpunkte fehlen — sie mildert einen Durchbruch, sie kauft
ihn nicht zurück. Damit belegt derselbe Bauplatz Feuerkraft, Einkommen und
Kristall.

**Der Satz von v288 („bei 28 % übrigem Gold ist ein Preis folgenlos") war
richtig gedacht und falsch gemessen** (v291): die 28 % kamen von `maxTowers:
12` — einer Selbstbeschränkung der Bots gegen rund zweihundert Bauplätze. Ohne
Deckel bleiben **−3 bis 16 %** liegen. Gold ist knapp, sobald man es ausgibt.
Nur: wer 29 bis 41 Türme baut, **verliert** (Spiralhain 27 → 0), weil die
weiteren Plätze zu wenig sehen und das Gold beim Ausbauen fehlt. Es fehlt kein
Kostenpunkt, es fehlt ein Grund, den dreizehnten Turm zu wollen.

**Und die Turmwahl ist dieser Grund nicht** (v293): ein eigenes Sortiment für
den Stil `Breite` liess „Abstand der Spielstile" Punkt für Punkt auf **8,20**
stehen. Solange die Turmwahl sechs Punkte ausmacht, kann keine Kennzahl über
Spielstile mehr als sechs finden — das steht als M18 in den Messlücken.

**Der Bannturm (v295) ist der erste Gegenbeleg, und er zeigt in eine andere
Richtung.** Derselbe Turm, dasselbe Gold, dieselbe Welle — auf dem Spiralhain
**11 Kristall unbedacht gebaut gegen 29 ins Nest gebaut**, gegen 27 ganz ohne
ihn. **18 Punkte Spanne durch die Lage**, wo die ganze Turmwahl sechs
entscheidet. Auf zwei der vier Karten kostet er, auf einer trägt er.

Daraus folgt für N3 und für alles, was danach kommt: **die knappe Grösse ist
nicht das Gold und nicht der Platz, sondern die gute Stelle.** Eine Regel, die
den Preis verändert, verschiebt Buchhaltung; eine Regel, die den Wert einer
Stelle von ihren Nachbarn abhängig macht, verändert das Spiel. Der Bannturm
tut das, der Förderer und der Wiederholungsaufschlag tun es nicht — und beide
stehen deshalb bis heute auf null bzw. am unteren Rand ihrer Wirkung.

**Was das kostet, steht offen da:** der Bannturm ist gebaut, von fünf Zusagen
gehalten und gemessen — und **nicht kaufbar**, weil sieben Bauknöpfe alle vier
UX-Zustände reissen (16,3 / 27,0 / 35,0 / 16,3 % gegen 16 / 26 / 35 / 16). Die
nächste Entscheidung ist damit eine über die Oberfläche, nicht über eine
Mechanik: eine Bauleiste, die mehr als sechs Bauwerke trägt.

**Nachgesehen in v288 — der Weg-Beschluss ist fertig, der Bauplatz-Beschluss
hat seine erste harte Zahl.** Aus „eine Weiche" sind vier geworden (v284):
alle vier Karten tragen eine, der Spiralhain zwei, gebaut über
`npm run weichenbau` statt von Hand, und der Grundzustand misst weiterhin
**0,00 Weltpunkte** Abweichung. Der Bot legt sie um (v283), sie steht im Bild
(v282), der Wächter fährt jede Stellung (v281). **Damit ist N2 zu.**

**N3 — „der Bauplatz wird knapp" — steht auf zwei von drei Sätzen, und beide
sagen dasselbe.** Der **Förderer** (v285) belegt einen Bauplatz, schiesst
nicht und bringt gemessen −1,8 bis +2,4 % Gold. Die **teurere Wiederholung**
(v287) nimmt dem Häufer 693 Gold ab und ändert am Ergebnis 0 / −6 / 0 / +1
Kristall. Beide wirken, beide entscheiden nichts — und die Ursache ist
dieselbe: **bei 28 % übrigem Gold ist ein Preis folgenlos.**

Der Beschluss sagt „dieselbe Fläche für drei Zwecke", und gemeint war, dass
die Fläche knapp wird. Gemessen ist sie es nicht: die Karten halten rund
zweihundert Bauplätze, und die Bots bauen zwölf. **Der dritte Satz
(reparierbarer Kristall) ist damit nicht der letzte, sondern der erste** — was
N3 wirklich braucht, ist eine Verwendung für Gold, die mit dem Bauen
konkurriert. Solange es die nicht gibt, sind Preisregeln Buchhaltung.

**Nachgesehen in v281 — der Weg-Beschluss ist gebaut, und die Zahlen stehen
jetzt daneben.** Aus „an mehreren Knoten sitzen Weichen" ist in v278 bis v281
das geworden: das Wegenetz steht als Knoten und Kanten (`WEGNETZ`), die Route
wird gerechnet statt eingetragen (`kuerzesteRoute`, Dijkstra nach Bogenlänge),
und **eine** Weiche steht im Spiel — die Nordschleife des Spiralhains, die den
Weg von 3942 auf 4974 Weltpunkte verlängert (Spreizung 1,26). Der Rest des
Beschlusses steht aus: **mehrere** Weichen, die anderen drei Karten, die
Weiche im Bild (S-N2-05) und der Bot, der sie umlegt (S-N2-06). Was der
Beschluss versprochen hat, hält bisher: das Messgerät ist ganz geblieben —
`bahnmass`, `bauflaeche`, `wegdeckung`, `bahntreue` und die Kreuzdeckung
rechnen unverändert, sie werden nur je Weichenstellung ausgewertet statt
einmal.

**Dieses Dokument ist ab v269 die oberste Arbeitsgrundlage.** Es steht über
`Towerfront-ANFORDERUNGSKATALOG.md`: wo beide etwas sagen, gilt dieses hier.
Der Katalog bleibt stehen, weil seine Messbefunde weiter gelten — was
umgeworfen wird, ist die Richtung, nicht die Diagnose.

---

## 1. Warum

Der Anforderungskatalog hält seit v249 den Satz fest, um den es geht:

> Der Genre-Abgleich steht auf 30 von 30, und das Spiel macht trotzdem wenig
> Spaß. Die zweiunddreissig Tore prüfen Korrektheit, nicht Spannung.

Der Nutzer hat in v269 entschieden, das Spiel **von Grund auf neu aufzubauen** —
Level, Spielregeln und Oberfläche. Der Unterbau bleibt.

Der Auslöser war nicht ein einzelner Befund, sondern ein Muster: 268 Fassungen
haben ein Spiel hervorgebracht, das jede Prüfung besteht und keine Entscheidung
verlangt. Was fehlt, sagt der Referenzabgleich in Abschnitt 2 — und es ist
etwas anderes, als ich vorher vermutet hatte.

---

## 2. Der Referenzabgleich (Schritt 0)

**Regel 10: das Soll kommt aus der Referenz, nicht aus mir.** Drei Vorbilder,
vom Nutzer bestätigt, recherchiert am 09.09.2026. Die Quellen stehen in
`Towerfront-MARKTRECHERCHE.md`; hier stehen nur die Befunde.

| | Defense Grid | Infinitode 2 | Rogue Tower |
|---|---|---|---|
| **Entscheidung je Welle** | Labyrinth verlängern gegen Turm aufwerten (nur 3 Stufen) | Welle früh rufen: Bonus = Wellenmünzen × Anteil lebender Gegner × Restzeit | **Zwang:** je Runde genau einen offenen Pfad um eine Kachel verlängern |
| **Wer bestimmt den Weg** | der Spieler mauert, Gegner rechnen neu | Türme sind Mauern, Gegner nehmen laufend die kürzeste Route | der Spieler setzt je Welle eine Wegkachel |
| **Bei Durchbruch** | Kern wird geraubt und weggetragen, Rückholung möglich | 1 Schaden auf Kapazität 20 | 1 Schaden, **reparierbar** über Mine + Eisenader |
| **Einkommen** | Command Tower 125/135/145 % für 300/300/300, schießt nicht | Miner belegen dieselben Kacheln wie Türme | House = angrenzende Türme × Wellennummer |
| **Wiederholung** | Verkauf gibt nur 75 % | jeder weitere Miner teurer | Turm teurer je gleicher Turm; **+1 Gold je Turmart**, die getroffen hat |
| **Bogen** | 20 Karten, ~10 h, Medaillen | 58 Karten, 400+ Forschungen, Endlos-Bestenliste | **45 Wellen ≈ 1 h je Lauf**, XP-Meta (450/900/1350) |
| **Blickwinkel** | 3D, feste Schrägsicht, nicht drehbar | reine 2D-Draufsicht, geometrisch | 3D low-poly, feste Schrägsicht |

### Der Befund, der alles verschiebt

**Alle drei machen den WEG zur Entscheidung, keiner den Turm.** Towerfront
macht den Turm zur Entscheidung und legt den Weg fest. Das ist die Ursache
hinter „folgenlos" — und damit keine Vermutung mehr, sondern ein gemessener
Abstand zur Referenz.

Zwei weitere Befunde, die die Richtung tragen:

* **Keines der drei zieht bei einem Durchbruch einfach ein Leben ab.**
  Towerfront hat mit dem Kernraub (v262) bereits Defense Grids Mechanik,
  einschließlich Rückholung. Das bleibt.
* **Alle drei machen Einkommen zu einer Bauentscheidung**, nicht zu einem
  Tropf. Towerfront hat heute nur Abschussbeute und Wellenbonus.

Und ein dritter, der aus dem eigenen Baum kommt: **D28 misst seit Langem, dass
54 % der gemalten Straße auf dem Spiralhain unbenutzte Kulisse sind** — ein
Wegenetz, das da ist und nicht gespielt wird.

---

## 3. Die Beschlüsse

Jede Zeile ist eine Entscheidung des Nutzers, jede mit ihrem Grund. Wer sie
ändern will, ändert sie hier — nicht im Gespräch.

### 3.1 Umfang und Rahmen

| | Beschluss | Grund |
|---|---|---|
| **Radikalität** | Neues Spiel auf bestehendem Unterbau. Kurvenmodell, Renderer-Gerüst, Bildvorrat, Bau- und Messkette bleiben; Level, Spielregeln und Oberfläche werden neu entworfen und die alten ersatzlos gestrichen. | Die Torkette und die Gegenproben sind das Einzige, was in diesem Projekt *weiß* statt zu vermuten. Ein leerer Baum wirft das Messgerät mit weg. |
| **Zielgerät** | iPhone quer, eine autarke HTML-Datei. Schreibtischbrowser bleibt zweiter Weg. | Die harte Beschränkung hat die meisten guten Entscheidungen erzwungen. |
| **Sprache** | Deutsch, auch im Quelltext. | Kein Grund zu wechseln. |
| **Alte Fassung** | v268 bleibt erreichbar unter `/v268.html`, eingefroren als gebaute Datei in `web/`. `/` trägt den Neubau. | Der Blick des Nutzers ist bei einem Umbau des Aussehens die einzige Prüfung, die zählt (Regel 8). Ohne erreichbaren Zwischenstand läuft die Kette blind. |

### 3.2 Das Spiel

| | Beschluss | Grund |
|---|---|---|
| **Der Weg** | **Weichen.** Die Karte malt ein Netz aus Kurven; an mehreren Knoten sitzen Weichen, die der Spieler zwischen den Wellen umlegt. Die Gegner nehmen die kürzeste offene Route. Nicht alles darf zu sein. | Der einzige Weg, den Referenzbefund einzulösen, **ohne** das Messgerät wegzuwerfen: Kurvenmodell, Bahnmaß, Bauregel und Kreuzdeckung gelten weiter, sie werden je Weichenstellung ausgewertet statt einmal. Schließt D28 im selben Zug. |
| **Der Bogen** | **Roguelite-Lauf.** Eine Sitzung ist ein Lauf über wachsende Schwierigkeit; **je Welle ein Kartenzug 1 aus 3**. Zwischen den Läufen kauft Erfahrung dauerhaft neue Karten ins Deck. | Eine Partie dauert heute gemessen 470 s und hat keinen Grund zur Wiederkehr. Der Kartenzug gibt **jeder** Welle eine Entscheidung, und die Abwechslung kommt aus dem Deck statt aus der Geometrie — also ohne neue Kartenbilder. |
| **Laufstruktur** | **Kartenwahl je Abschnitt**: nach jedem Abschnitt eine Karte aus zwei bis drei, mit sichtbarem Unterschied (mehr Beute gegen mehr Druck). Türme bleiben nicht stehen; Deck, Gold und Verbesserungen schon. | Macht aus den vier vorhandenen Karten Inhalt statt Kampagnenstufen. Zwei Entscheidungsebenen: Kartenzug je Welle, Kartenwahl je Abschnitt. Eine Stunde am Telefon braucht Bruchstellen. |
| **Knappheit** | **Einkommensgebäude** (belegt Bauplatz, schießt nicht) **und teurere Wiederholung** (jeder weitere Turm derselben Art kostet mehr; Vielfalt zahlt sich in der Beute aus). | Alle drei Vorbilder machen Einkommen zu einer Bauentscheidung. Die teurere Wiederholung trifft zusätzlich die **Zweigwirkung** — seit v253 die schwächste Spannungskennzahl. |
| **Durchbruch** | Kernraub bleibt. Zusätzlich ist der Kristall **reparierbar**. | Derselbe Bauplatz konkurriert dann zwischen Feuerkraft, Einkommen und Kristall — „der Bauplatz ist die härteste Knappheit" ist der Befund, den zwei der drei Vorbilder belegen. |
| **Alter Inhalt** | **Bilder bleiben, Systeme gehen.** Türme und Gegner behalten ihre Figuren. Zweige und Stufen werden durch den Kartenzug ersetzt; die drei Grade und die Sterne entfallen zugunsten der Laufstruktur; der Endlosmodus wird der Schwanz des Laufs. | Die Bilder sind das Teure. Was geht, sind genau die Systeme, die schlecht messen: die Zweigwirkung ist die schwächste Kennzahl, und „Ruhig" war bis v261 gemessen kein Grad, sondern ein Abspielmodus. |

### 3.3 Aussehen

| | Beschluss | Grund |
|---|---|---|
| **Blickwinkel** | **Leichte Schrägsicht, gemalt.** Die Weltkoordinaten bleiben flach wie heute; nur die Bilder werden schräg gemalt — Karten mit tiefem Horizont, Figuren mit sichtbarer Seite und Bodenschatten. | Eine echte Projektion entwertet `bahnmass`, `bauflaeche`, `wegdeckung`, `gedraenge`, `beruehrung`, `zielplatte` und `einbettung` in einem Zug. Die Plastik kommt ohnehin aus dem Bild, nicht aus der Projektion. Der Preis: Reichweite bleibt ein Kreis, kein Oval. |
| **Stil** | **Industriell, dunkler Grund, leuchtende Akzente.** | Nicht Geschmack, sondern drei gemessene Befunde: Figuren verschwinden auf hellem Boden (die Backhelligkeit musste dreimal nachjustiert werden), Weg gegen Boden muss künstlich in ein Band von 40–90 Farbschritten gezwungen werden, und Koloss und Spalter überdecken sich in der Silhouette zu 0,76 bei erlaubten 0,65. Ein dunkler Grund mit leuchtenden Akzenten löst alle drei auf einmal. |

**Nachgemessen in v274 — der Stilbeschluss ist jetzt belegt, nicht nur
begründet.** Bis dahin konnte kein Werkzeug ihn bestätigen: `npm run
lesbarkeit` rechnete jede Figur gegen das gepackte Rohbild des Untergrunds
statt gegen das gebackene Terrain und sah die Helligkeit des Bodens gar nicht.
Mit der Reparatur steht der Durchlauf da:

| `BODEN_HELL` | Figuren mit Kante unter 1,5 | schwächste Kante |
|---|---|---|
| **0,355** (heute) | **20 von 20** | 1,10 |
| 0,30 | 14 von 20 | 1,27 |
| 0,24 | **1 von 20** | 1,49 |
| 0,18 | **0 von 20** | 1,74 |

Ein dunklerer Grund repariert die Lesbarkeit **jeder einzelnen Figur, ohne
dass ein Bild angefasst wird**. Der Satz „Figuren verschwinden auf hellem
Boden" ist damit keine Begründung mehr, sondern eine Messung.

**Umgesetzt ist er noch nicht**, und der Grund gehört dazu: `BODEN_HELL` zu
senken verschiebt `grafiktor` (Bodenband 0,30–0,36), `wegdeckung` (Weg gegen
Boden 40–90 Farbschritte), `kristall` und `einbettung` in einem Zug. Das ist
eine eigene Runde, und sie hängt an S-N5-01.

| **HUD** | **In Ebenen.** Ruhezustand minimal; jede Tiefe auf Anforderung **an Ort und Stelle** statt in einer Randleiste. | Mehr zeigen allein macht eine Tabelle, weniger zeigen allein nimmt die Entscheidungsgrundlage — und die fehlt heute: man sieht nicht, ob der Mörser etwas taugt. Bedingung: die Ratschen des UX-Tors dürfen nicht fallen. |

### 3.4 Verworfen — und warum

Damit niemand den Weg ein zweites Mal geht:

* **Leerer Baum / neues Verzeichnis.** Wirft die Torkette und die 320
  Gegenproben mit weg. Dann bauen wir das nächste Spiel wieder blind.
* **Labyrinth (Defense Grid / Infinitode).** Braucht ein Gitter und
  Wegfindung. Wirft `bahnmass`, `bahntreue`, `wegdeckung`, `bauflaeche` und
  die Kreuzdeckung ersatzlos weg.
* **Wegkacheln (Rogue Tower).** Braucht Kacheln und prozedurale Karten — die
  gemalten Kartenbilder entfallen damit ganz.
* **Echte Schrägprojektion, Isometrie, 3D, WebGL.** Siehe 3.3.
* **Kampagne mit Sternen wie heute.** Trägt gemessen nicht: 470 s je Partie
  ohne Grund zur Wiederkehr.
* **Nur ein Zähler nach unten bei Durchbruch.** Keines der drei Vorbilder
  macht das; Towerfront hat es 261 Fassungen lang gemacht.

---

## 4. Die Kette

Wie gearbeitet wird, solange der Nutzer nicht da ist. Der Ablauf einer Runde
steht in `Towerfront-KETTE.md`; hier stehen die Beschlüsse dahinter.

| | Beschluss | Grund |
|---|---|---|
| **Tore ohne Gegenstand** | Ein Tor, das seinen Gegenstand verliert, wird in derselben Runde **umgebaut oder ersatzlos gestrichen**. Kein Stummschalten, keine befristete Ausnahme, keine verkleinerte Kette. | v233: „eine Ausnahme, die man einmal einräumt, bleibt stehen, bis niemand mehr weiß, dass sie eine war." v230: ein Tor lief 23 Fassungen ins Leere. Der Preis ist ehrlich: manche Runde besteht nur aus dem Umbau eines Tores und liefert kein Spiel. |
| **Torkette** | **Nur auf dem Runner.** Hier läuft je Runde kein Tor. Der Push löst die volle Kette aus, und die Auslieferung hängt an ihr. | Entscheidung des Nutzers gegen meine Empfehlung: 426 s je Runde sind bei stundenlangem Betrieb die Obergrenze des Durchsatzes, und eine Umfangskette hätte gemessen nur 35 % gespart (`sim` und `browser` hängen an `state.ts` und `ui.ts`, also an jeder Spielrunde). **Bekanntes Risiko:** ein roter Lauf wird erst nach dem Push sichtbar. Gegenmaßnahme: der Runner-Lauf wird vor der nächsten Runde abgefragt, und ein roter Lauf ist die nächste Runde. |
| **Ausnahme** | `npm run tsc` läuft weiter lokal (4,4 s). | Kein Tor, sondern die Weigerung, etwas hochzuschieben, das nicht übersetzt — das kostet sonst einen vollen Runner-Durchlauf für eine Auskunft von vier Sekunden. |
| **Voller Probenlauf** | **Zeitratsche statt Fassungsratsche**: der letzte volle Lauf darf nicht älter als **24 Stunden** sein. | Wovor die Ratsche schützt — „eine Probe hört leise auf zu beweisen" — ist eine Frage von Zeit, nicht von Zählerständen. Bei sechs Runden in einer Nacht blockierte die Drei-Fassungs-Regel die Kette zweimal selbst. |
| **Inspektor** | Eigener Durchgang je Runde: sieht **nur** Bericht und Bildschirmfotos, nicht den Code und nicht die Absicht. Urteil: Freigabe · neue Schleife · Rückbau. | Regel 7 und 8. In v50 waren vierzehn Tore grün, während man nicht ins Spiel kam. Bei einem Umbau des Aussehens bin ich der schlechteste denkbare Prüfer, weil ich die Absicht kenne. |
| **Fehlende Bilder** | Weiterbauen gegen einen **erkennbaren Platzhalter**, den das Bildtor als fehlend meldet. Aufträge sammeln sich in `Towerfront-BILDAUFTRAG.md` und gehen **gebündelt** an den Nutzer, als fertige Blöcke zum Kopieren. | Die Kette existiert, damit der Nutzer kein Flaschenhals ist. Und von den letzten drei Kartenbestellungen kam keine beim ersten Versuch durch — was ein Bild können muss, weiß man erst, wenn das Spiel dagegen läuft. |
| **Meldungen** | Nur bei Blockade und bei Bildbedarf; dazu ein Sammelbericht alle zehn Runden. Der Stand ist jederzeit unter `/` spielbar und im Rückstandsverzeichnis nachlesbar. | Bei acht Runden je Stunde wären Einzelmeldungen Dutzende. |

---

## 5. Was diese Runde nebenbei gefunden hat

Aufgeschrieben, weil beides zur Kette gehört und beides ohne die Vermessung
unsichtbar geblieben wäre:

* **Die Torkette dauert 426 s, nicht 289 s.** Dieselbe Falle zum dritten Mal:
  „rund 190 s" stand 97 Fassungen lang, „289 s" 17 Fassungen lang — und beide
  Male stand direkt darunter der Satz, dass eine Laufzeit, die niemand
  nachmisst, nicht länger wird, sondern nur falscher. Sie ist seit v251 um
  137 s gewachsen, ohne dass etwas rot geworden wäre.
* **`bench` hat keine einzige Gegenprobe.** Von 33 Kettenschritten haben vier
  keine: `build` und `bericht` sind keine Tore, `bahntreuetor` ist seit v233
  bekannt gegenstandslos (D30) — und `bench` ist schlicht unbewiesen. Regel 5.
