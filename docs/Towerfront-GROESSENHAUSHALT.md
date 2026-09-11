# Towerfront — der Größenhaushalt der ausgelieferten Datei

Stand: v334 · 11.09.2026

**Nachgesehen in v334, und der Abstand schrumpft weiter — gleichmäßig.**
Gemessen mit `npm run build && npm run autarkie`:

| | v313 | v320 | v327 | **v334** |
|---|---|---|---|---|
| Gruppen reservieren | 1030 KB roh | 1030 KB roh | 1030 KB roh | 1030 KB roh |
| erlaubt | 1074,75 | 1073 | 1070 | **1067** |
| Abstand | 44,8 KB | 42,8 KB | 39,8 KB | **36,6 KB** |
| ausgelieferte Datei | — | — | 1466 KB | **1473 KB** von 1800 |

**Der Verlauf ist die Auskunft, nicht die einzelne Zahl.** Über einundzwanzig
Fassungen ist der erlaubte Bildvorrat um 7,75 KB geschrumpft, also um rund
0,37 KB je Fassung — weil der Code wächst und jedes KB Code 0,75 KB
Bildvorrat kostet. **Hochgerechnet bleiben bei diesem Tempo noch rund
hundert Fassungen**, bevor die Reservierung wieder auf die Grenze trifft wie
in v313.

**Und die vier offenen Bestellungen sind darin schon eingepreist:** die
Gruppe `tuerme` reserviert seit v313 400 KB über gemessenen 302, der Rest ist
Platz für `31_foerderer.png`, `32_werft.png`, `33_sanitaeter.png` und
`34_hetzer.png`. Wer sie liefert, verbraucht Reserve und keinen neuen
Spielraum — das ist der Sinn der Reservierung.

**Nachgesehen in v327, und der Abstand schrumpft weiter — gleichmäßig.**
Gemessen mit `npm run build && npm run autarkie` (die Zahl hängt am GEBAUTEN
Bündel, ein `autarkie` auf einem alten `dist/` misst die vorige Runde,
Regel 12):

| | v313 | v320 | **v327** |
|---|---|---|---|
| Gruppen reservieren | 1030 KB roh | 1030 KB roh | 1030 KB roh |
| erlaubt | 1074,75 | 1073 | **1070** |
| Abstand | 44,8 KB | 42,8 KB | **39,8 KB** |
| ausgelieferte Datei | — | 1465 KB | **1469 KB** von 1800 |

**Die Reservierung steht still, die Erlaubnis sinkt** — genau so, wie die
Regel seit v186 gedacht ist: *wächst der Code, schrumpft der erlaubte
Bildvorrat von selbst.* Jedes KB Code kostet 0,75 KB Bildvorrat, und das Tor
nennt den Abstand seit v313 bei jedem Lauf statt erst bei der Kollision.

**Der Verbrauch ist gemessen erstaunlich gleichmäßig:** v313 bis v320 haben
2,0 KB erlaubten Bildvorrat gekostet (rund 2,7 KB Code) über sieben Runden,
v320 bis v327 noch einmal 3,0 KB (rund 4 KB Code) über sieben. Das sind rund
**0,4 KB erlaubter Bildvorrat je Runde** — bei 39,8 KB Abstand also rund
**hundert Runden**, wenn niemand etwas Großes einbaut. Die Zahl steht hier,
damit die nächste Kollision nicht wieder aus dem Nichts kommt: in v313 kamen
die zwei Haushalte mit 0,2 KB Abstand zusammen, und vorher hatte niemand den
Verlauf angesehen.

**Was daran hängt und noch nicht bezahlt ist:** die zwei offenen Bestellungen
(`31_foerderer.png`, `32_werft.png`) sind in der Reservierung mit rund 50 KB
angesetzt und liegen noch nicht im Vorrat. Der Abstand von 42,8 KB ist also
der Puffer *nach* ihnen, nicht davor.

**Die zwei Haushalte sind in v313 zusammengestossen — mit 0,2 KB Abstand.**
`npm run autarkie` wurde rot: die Gruppen reservierten zusammen **1075 KB
roh**, erlaubt waren **1074,75**. Die Regel dahinter steht seit v186 und ist
richtig — *waechst der Code, schrumpft der erlaubte Bildvorrat von selbst*
(`erlaubtRohKb = (1800 − Rest) / (4/3)`). Der Rest ist ueber v303 bis v313 auf
**366,9 KB** gewachsen (Lauf, Kartenstapel, Abschnittswahl, die zwei neuen
Menuebildschirme); die Grenze liegt bei 366,7.

**Gerichtet wurde die RESERVIERUNG, nicht die Obergrenze.** Die 1800 KB in
`tools/check-autarkie.mjs` sind unberuehrt — eine Ratsche in der Runde zu
lockern, in der die eigene Aenderung an ihr scheitert, waere kein Beweis mehr
(v219). Stattdessen ist `tuerme` von **445 auf 400** gesetzt: gemessen haelt
die Gruppe 302 KB ueber 18 Eintraege, die drei offenen Bestellungen (Foerderer,
Werft, Bannturm) wiegen nach derselben Rechnung rund 50 KB, also **352** — 400
laesst danach noch 48 KB. Dieselbe Bewegung wie beim Untergrund in v222 (330
auf 250, als vier Bilder zusammen 162 wogen): eine Reservierung, die die Datei
gar nicht einloesen kann, ist keine Reservierung.

**Und das Tor sagt jetzt den ABSTAND, nicht nur die Ueberschreitung.** Es
schwieg bis zur Kollision und meldete dann etwas, das seit vielen Fassungen
naeher gekrochen war. Jeder Lauf nennt seitdem die Zeile

    Gruppenbudgets: 1030 KB roh reserviert, 1075 erlaubt - Abstand 44.8 KB.
    Jedes KB Code kostet 0,75 KB Bildvorrat.

Damit ist die naechste Annaeherung sichtbar, bevor sie die Kette anhaelt — und
die Umrechnung steht daneben: **60 KB Code sind der ganze heutige Abstand.**


**Nachgesehen in v311:** der Bildvorrat ist unverändert — seit v288 ist kein
Bild dazugekommen und kein Backwert geändert worden. Gemessen an den
eingecheckten Dateien (`src/gfx/assets/*.ts`, also ohne Packlauf zu lesen —
Regel 12, die Zahl trägt ihre Messstelle mit):

| Gruppe | Datei | eingecheckt |
|---|---|---|
| Gegner | `enemies.ts` | 95 KB |
| Objekte | `objects.ts` | 257 KB |
| Türme | `towers.ts` | 403 KB |
| Untergrund | `backgrounds.ts` | 342 KB |

**Die ausgelieferte Datei wiegt 1462 KB** von erlaubten 1800 (`npm run
autarkie`, gemessen an `dist/index.html`). Die sieben Fassungen seit v304
haben nichts hinzugefügt, was wiegt: die Abschnittswahl (v305) und der
Kartenstapel (v306) sind **gezeichnete** Menübilder, kein einziger neuer
Bildpunkt.

**Zwei Bestellungen sind weiterhin offen** und laufen gegen den Platzhalter:
`31_foerderer.png` und `32_werft.png`. `npm run bildtor` nennt sie in jedem
Lauf — ein fehlendes Bild ist eine laufende Bestellung, kein Fehler im Code.

**Nachgesehen in v304:** der Bildvorrat ist unveraendert (gegner 71, objekte
192, tuerme 302, untergrund 256 - zusammen 821 KB von 1030). Die ausgelieferte
Datei ist von 1447 auf **1453 KB** gewachsen, also um 6 KB in sieben
Fassungen; das ist Quelltext, kein Bild - Lauf, Kartenzug und die zwei neuen
Messabschnitte in `sim` schlagen zusammen mit diesen 6 KB zu Buche. Grenze
1800.

Die drei Bauwerke ohne Bild sind unveraendert drei (Foerderer, Werft,
Bannturm); ihre Auftraege haben in v304 den richtigen Ausgabeblock bekommen
und sind damit zum ersten Mal wirklich herausgebbar.

**Nachgesehen in v297 — gemessen, und der Bildvorrat hat sich in sieben
Fassungen um kein Byte bewegt.**

| Gruppe | gemessen | Budget |
|---|---|---|
| gegner | 71 KB | 80 |
| objekte | 192 KB | 250 |
| tuerme | 302 KB | 400 |
| untergrund | 256 KB | 300 |
| **zusammen** | **821 KB** | **1030** |

Gelesen aus `npm run art`, das die Groesse des ausgelieferten Buendels
nennt — ohne Rohbilder, also auch auf dem Runner (Regel 12: die Zahl traegt
ihre Messstelle mit). Die ausgelieferte Datei wiegt **1447 KB** von 1800
erlaubten und ist damit in sieben Fassungen um **2 KB** gewachsen; das ist
Quelltext, kein Bild.

**Inzwischen sind es drei Bauwerke, die nichts wiegen** (Foerderer v285,
Werft v290, Bannturm v295): fuer alle drei fehlt das Bild, sie laufen gegen
`getPlatzhalter` (K5), und `npm run bildtor` nennt sie bei jedem Lauf als
offene Bestellung. Die Auftraege stehen als 8d.2, 8d.3 und 8d.4.

**Was das fuer den Haushalt heisst, steht als Differenz da und nicht als
Messung:** die Gruppe `tuerme` haelt heute 302 KB ueber 18 Eintraege, also
rund 17 KB je Eintrag. Drei Bauwerke mit je einem Bild sind damit etwa
**50 KB** — die Gruppe kaeme auf rund 352 von 400, die Datei auf rund 1497
von 1800. Beides passt, und beides ist gerechnet, nicht gewogen.

**Nachgesehen in v290 — gemessen mit `npm run pack-art -- --force`, nicht
gerechnet.** Die Gruppen stehen bei: gegner 71 KB von 80, objekte 192 von 250,
tuerme 302 von 400, untergrund 256 von 300 — **zusammen 821 KB von 1030**. Die
ausgelieferte Datei wiegt **1445 KB** von 1800 erlaubten.

Zwei Bauwerke sind seit v283 dazugekommen (Förderer v285, Werft v290) und
wiegen bis heute **nichts**: für beide fehlt das Bild, sie laufen gegen den
Platzhalter (K5), und `npm run bildtor` nennt sie bei jedem Lauf als offene
Bestellung. Wenn die zwei Bilder kommen, wächst die Gruppe `tuerme` — 302 von
400 lassen dafür Raum, aber es ist der einzige Posten, der in diesem Haushalt
noch wachsen wird.


**Nachgemessen in v283:** die gebaute Datei wiegt **1440 KB** gegen die Grenze
von 1800 (`ls -la dist/index.html` nach `npm run build`). Sie ist seit v276 um
6 KB gewachsen - Wegenetz, Route, Weichen und ihre Zeichnung sind
Quelltext, kein Bild, und Quelltext wiegt in dieser Datei wenig. Die 1506 KB
weiter unten sind die historische Zahl, an der das Budget hergeleitet wurde,
keine Messung von heute.

**Nachgesehen in v269:** die Haushaltszahlen sind unverändert gültig — sie
messen den ausgelieferten Bildvorrat, und an dem hat sich nichts geändert. Der
Neubau wird sie bewegen (neuer Stil, neue Karten), aber erst wenn ein Bild
wirklich eingebaut ist; bis dahin wäre jede Vorwegnahme eine Behauptung statt
einer Messung. Neu hinzugekommen ist `web/v268.html` (1468 KB) — die
eingefrorene Rücklinie zählt NICHT zum Haushalt: sie wird nicht gebaut, sondern
kopiert, und sie lädt nur, wer sie ausdrücklich aufruft.

**Nachgemessen in v262:** die gebaute Datei wiegt **1430,5 KB** gegen die 1429,
die unten stehen — das Dokument stimmt, und diese Zeile hält fest, dass
nachgesehen wurde statt nur das Datum gesetzt.

Die Datei ist **eine** Datei. Jedes Bild steckt als Datenadresse darin und
wird dabei ein Drittel größer. Ohne Obergrenze wächst sie mit jedem Bild, bis
der erste Ladevorgang auf dem Telefon stört — deshalb `SIZE_BUDGET_KB` in
`tools/check-autarkie.mjs`.

## Die Zahl war geraten, jetzt ist sie gemessen

Von v77 bis v186 standen dort **1600 KB**, mit genau dieser Begründung — und
**ohne eine einzige Messung dahinter**. Es gab im ganzen Verzeichnis keine
Ladezeitmessung, und es gibt bis heute keine vom Zielgerät (D27).

Gemessen an der gebauten Datei (1506 KB, Chromium, lokale Datei, also ohne
Übertragung):

| | |
|---|---|
| bis zum `load`-Ereignis | 386 ms |
| bis zum ersten gezeichneten Bild | 624 ms |

Die Übertragung kommt dazu und rechnet sich aus der Größe:

| Verbindung | heute (1506 KB) | bei 1800 KB |
|---|---|---|
| 20 Mbit/s | 588 ms | 703 ms |
| 5 Mbit/s | 2353 ms | 2812 ms |
| 1,5 Mbit/s (3G) | 7844 ms | 9375 ms |

**Seit v187 steht die Grenze bei 1800 KB.** Der Sprung kostet bei mäßigem
LTE rund 380 ms — einmalig, danach liegt die Datei im Zwischenspeicher. Dafür
passen die bestellten Bildsätze hinein.

**Was diese Grenze nicht ist: eine Aussage über den Arbeitsspeicher.** Den
misst `npm run speichertor`, und er liegt bei **36,3 MB** — auf einem Telefon
unauffällig. Die beiden Zahlen haben nichts miteinander zu tun und werden
leicht verwechselt.

---

## Was heute drinsteckt

Gemessen an `dist/index.html` (v248, 08.09.2026):

| Teil | eingebettet | Anteil |
|---|---|---|
| Bildvorrat (44 WebP) | **1095 KB** | 77 % |
| Startbilder (11 PNG/JPEG) | 108 KB | 8 % |
| alles übrige — Code, HTML, Stilvorlage | 225 KB | 16 % |
| **gesamt** | **1429 KB** | von **1800** erlaubt |

Alle vier Zahlen sind an `dist/index.html` selbst gemessen, indem jede
`data:`-Adresse darin gezählt wird — nur die letzte Zeile ist die
**Differenz**. Vorher stand hier „Bildvorrat 909 KB", und das war die
Rohsumme aus dem Packwerkzeug mal 1,34, also eine Rechnung über eine falsche
Zahl. Die 1423 sagt `ls`.

**Nachgemessen in v248** (`npm run art`, ohne Rohbilder — die Größe steht in
`src/gfx/assets/*.ts` und ist ohne Packlauf zu lesen, Regel 12): Gegner 71,
Objekte 192, Türme 302, Untergründe 256, zusammen **821 KB von 1030** — seit
v240 unverändert, es ist in sieben Fassungen kein einziges Bild dazugekommen.

**Gewachsen ist der Code: 217 → 225 KB.** Acht Kilobyte für den Verbund
(v244/v245), den Frühstart im Wellenknopf (v243), das Turmbild im Menü und
die Zweigwirkung (v247/v248). Die Turmsymbole und das Kopfbild entstehen zur
Laufzeit aus dem vorhandenen Vorrat und liegen nicht als eigene Bilder in der
Datei — sonst wären es vier Bilder je Karte, also sechzehn.

Die ausgelieferte Datei wiegt **1429 KB von 1800**.
Die alte Fassung dieser Tabelle spaltete sie in „Startbilder 108" und „Code
212" auf — zusammen 320, was zur Gesamtzahl nicht mehr passte. Eine Zeile,
die man nicht misst, schreibt man als Differenz hin oder gar nicht.

Der Bildvorrat als Rohbytes, also vor der Datenadresse — die Zahlen sagt
`npm run pack-art -- --force` selbst, sie sind hier nicht nachgerechnet:

| Gruppe | roh | Budget |
|---|---|---|
| Türme (18 Bilder) | 302 KB | 400 |
| **Untergründe (4)** | **256 KB** | **300** |
| Objekte (14) | 192 KB | 250 |
| Gegner (8) | 71 KB | 80 |
| **Summe** | **821 KB** | **1030** |

**Diese Tabelle stand bis v230 auf dem Stand von v185**, und bis v233 waren
zwei ihrer vier Zeilen trotzdem falsch: Untergründe „162" statt 260, Objekte
„144" statt 192. Nicht abgeschrieben — **falsch gemessen**. Die Summe im
Packwerkzeug zählte nur die NEU gepackten Einträge; wer ein Bild nachliefert
und die anderen übernimmt, bekam die Größe der Nachlieferung als Größe der
Gruppe. Das Untergrund-Budget von 250 war auf genau dieser 162 geeicht,
während die Gruppe **346 KB** wog.

Beides ist in v233 repariert: die übernommenen Einträge zählen mit, und die
Größe wird zusätzlich am **ausgelieferten Bündel** gemessen — an
`src/gfx/assets/*.ts`, bei jedem Lauf, ohne Rohbilder und ohne Packlauf.
Vorher lief die Budgetprüfung nur beim Packen, auf dem Runner also nie.

Die Spalte „eingebettet" ist ersatzlos entfallen. Sie war keine Messung,
sondern die Rohzahl mal 1,34 — und weil die Rohzahl falsch war, sah eine
Rechnung wie eine zweite Bestätigung aus (Regel 15: was zweimal dasteht,
veraltet einmal; hier war es dieselbe Zahl in zwei Kleidern).

## Zwei Haushalte, die einander widersprachen

Bis v185 standen in `art/*.json` Budgets von 220, 620, 620 und 700 KB —
**2160 KB roh, eingebettet rund 2880**, bei einer Datei, die 1600 darf. Jede
Gruppe konnte grün melden, während die Datei längst zu groß war; gebunden hat
nur die Zahl im Autarkie-Wächter, und die sah beim Packen niemand.

Seit v186 prüft der Wächter beide gegeneinander. Der Rest wird dabei **nicht
geschätzt, sondern an der gebauten Datei gemessen**: alles, was nicht
WebP-Bildvorrat ist. Wächst der Code, schrumpft der erlaubte Bildvorrat von
selbst.

---

## Was die vier bestellten Bildsätze kosten

Eine sechsstufige Turmreihe kostet gemessen 93 bis 106 KB roh — Frost 106,
Mörser 103, Prisma 93.

| Bestellung | roh | eingebettet |
|---|---|---|
| Flakstellung, 6 Stufen (Bildauftrag 6.6) | ~100 KB | ~134 KB |
| Bannturm, 6 Stufen (Bildauftrag 6.7) | ~100 KB | ~134 KB |
| Bogenwaffe und -sockel Stufe 5+6 (4 Objekte) | ~55 KB | ~74 KB |
| Spalter (1 Gegner, Bildauftrag 5.6) | ~9 KB | ~12 KB |
| Frostturm 5+6 (Bildauftrag 6.3b) | ersetzt vorhandene | ±0 |
| **zusammen** | **~264 KB** | **~354 KB** |

**Freier Platz bei 1800 KB: 221 KB roh.** Es fehlen also noch rund **43 KB
roh** — und die sind mit einer einzigen Güte-Stufe zu holen (siehe unten:
82 → 74 spart 39 KB, 82 → 66 spart 57 KB, beides nahe am Rauschen). Der
Wächter schlägt genau dann an, wenn der letzte Satz kommt, und zwingt die
Entscheidung dorthin, wo sie hingehört: an den Tag des Packens.

## Was zu holen ist — gemessen, nicht geschätzt

Zwei Stellschrauben durchprobiert (Regel 9), und der Abstand **in
Anzeigegröße** gemessen, nicht an der Kachel (Regel 12): ein Turm steht auf
dem Telefon quer mit rund 76 Gerätepunkten im Bild.

**Zuerst die Eichung, sonst bedeutet die Zahl nichts** (Regel 13). Am
Spiralhain-Untergrund:

- dasselbe Bild nur neu verpackt, gleiche Güte: Abstand **4,40**
- dasselbe Bild bei Güte 20, sichtbar zerfallen: Abstand **7,38**

Der ganze nutzbare Bereich liegt also zwischen 4,4 und 7,4. Alles darunter
ist nicht von einer weiteren Kompressionsgeneration zu unterscheiden.

| Maßnahme | spart roh | Abstand | Urteil |
|---|---|---|---|
| Figuren Güte 82 → 74, Kachel bleibt 256 | 39 KB | 4,8–5,7 | am Rauschen |
| Figuren Güte 82 → 66 | 57 KB | 5,1–6,3 | noch vertretbar |
| Untergrund Güte 55 → 48 | 73 KB | 4,99 | am Rauschen |
| Untergrund 2400 → 1920 Punkte breit | 141 KB | 6,65 | **zu teuer** |
| Figuren Kachel 256 → 192 | 93 KB | 25,5 | **weit darüber** |

**Die Auflösung zu senken ist teuer, die Güte zu senken ist fast umsonst** —
das Gegenteil dessen, was der Verdacht war. Die 2400 Punkte des Untergrunds
sind gegenüber dem 1920 Punkte breiten Feld zwar überabgetastet, aber das
Herunterrechnen kostet mehr, als es einbringt.

Ein Nebenbefund zur Messung selbst: bei den Figuren ergibt Kachel 224 einen
**größeren** Abstand als 192. Das ist nicht monoton und misst deshalb
teilweise das Umrechnen, nicht den Qualitätsverlust — 192 ist ein sauberer
Teiler von 256, 224 nicht. Wer je Kacheln verkleinert, tut es in sauberen
Verhältnissen.

## Damit bleibt eine Entscheidung offen

Selbst mit **allen** billigen Einsparungen (Figuren auf 66, Untergrund auf
48: 130 KB roh) fehlen noch rund **63 KB roh = 84 KB eingebettet**. Und die
Untergrund-Einsparung ist heute nicht zu haben: `art/roh/untergrund/` liegt
nicht im Verzeichnis, ein Neupacken aus der gepackten Fassung wäre eine
zweite Verlustgeneration und kostet allein schon 4,4.

Drei Wege, und der erste ist die Frage an den Nutzer:

1. **Die Obergrenze anheben** — auf etwa 1750 KB. Sie ist keine technische
   Grenze, sondern eine Aussage über die Ladezeit auf dem Telefon; 1,5 statt
   1,75 MB sind bei 5 Mbit/s rund 2,4 gegen 2,8 Sekunden. Das ist eine
   Produktentscheidung, keine Rechenaufgabe.
2. **Die Rohbilder der Untergründe nachliefern**, dann sind 73 KB sauber zu
   holen, ohne dass etwas doppelt komprimiert wird.
3. **Weniger Stufen je neuem Turm** — steht der Art Bible entgegen, die für
   jede Stufe einen gewachsenen Umriss verlangt, und ist der schlechteste
   der drei Wege.

Bis das entschieden ist, ist der Haushalt wenigstens ehrlich: die Budgets
sagen jetzt, was wirklich hineinpasst, und der Wächter merkt es, wenn sie es
nicht mehr tun.
