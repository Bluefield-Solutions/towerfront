# Towerfront — der Größenhaushalt der ausgelieferten Datei

Stand: v230 · 06.09.2026

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

Gemessen an `dist/index.html` (v230, 06.09.2026):

| Teil | eingebettet | Anteil |
|---|---|---|
| Bildvorrat (44 WebP) | **909 KB** | 57 % |
| alles übrige — Startbilder, Code, HTML, Stilvorlage | 683 KB | 43 % |
| **gesamt** | **1592 KB** | von **1800** erlaubt |

Die 909 sagt `npm run pack-art -- --force`, die 1592 `ls` auf
`dist/index.html`; die 683 sind die **Differenz**, nicht eine eigene Messung.
Die alte Fassung dieser Tabelle spaltete sie in „Startbilder 108" und „Code
212" auf — zusammen 320, was zur Gesamtzahl nicht mehr passte. Eine Zeile,
die man nicht misst, schreibt man als Differenz hin oder gar nicht.

Der Bildvorrat als Rohbytes, also vor der Datenadresse — die Zahlen sagt
`npm run pack-art -- --force` selbst, sie sind hier nicht nachgerechnet:

| Gruppe | roh | eingebettet | Budget |
|---|---|---|---|
| Türme (18 Bilder) | 302 KB | 404 | 445 |
| **Untergründe (4)** | **162 KB** | 217 | **250** |
| Objekte (14) | 144 KB | 193 | 250 |
| Gegner (8) | 71 KB | 95 | 80 |
| **Summe** | **679 KB** | **909** | **1025** |

**Diese Tabelle stand bis v230 auf dem Stand von v185** und behauptete drei
Untergründe bei einem Budget von 330, während es seit v222 vier bei 250 sind,
dazu „1506 KB von 1600 erlaubt", während die Grenze seit v187 bei 1800 liegt
und die Datei 1592 wiegt. Gefunden, weil der Doku-Wächter den Rückstand des
Dokuments meldete — nicht, weil jemand die Zahlen nachgesehen hätte.

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
