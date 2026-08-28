# Towerfront — der Größenhaushalt der ausgelieferten Datei

Stand: v186 · 28.08.2026

Die Datei ist **eine** Datei. Jedes Bild steckt als Datenadresse darin und
wird dabei ein Drittel größer. Ohne Obergrenze wächst sie mit jedem Bild, bis
der erste Ladevorgang auf dem Telefon stört — deshalb `SIZE_BUDGET_KB = 1600`
in `tools/check-autarkie.mjs`.

---

## Was heute drinsteckt

Gemessen an `dist/index.html` (v185):

| Teil | eingebettet | Anteil |
|---|---|---|
| Bildvorrat (43 WebP) | **1186 KB** | 79 % |
| Startbildschirm-Symbol und zehn Startbilder (11 PNG) | 108 KB | 7 % |
| Code, HTML, Stilvorlage | 212 KB | 14 % |
| **gesamt** | **1506 KB** | von 1600 erlaubt |

Der Bildvorrat als Rohbytes, also vor der Datenadresse:

| Gruppe | roh | Budget (v186) |
|---|---|---|
| Türme (18 Bilder) | 302 KB | 335 |
| Untergründe (3) | 324 KB | 330 |
| Objekte (14) | 192 KB | 200 |
| Gegner (8) | 71 KB | 90 |
| **Summe** | **889 KB** | **955 von 960 erlaubt** |

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

**Freier Platz heute: 71 KB roh.** Es fehlen also rund **193 KB roh**.

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
