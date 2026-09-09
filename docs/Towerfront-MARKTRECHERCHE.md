# Marktrecherche — was moderne Tower-Defense-Spiele ausmacht

Stand: v276 · 09.09.2026

**Nachgesehen in v276:** unveraendert. Der Referenzabgleich aus v269 (Defense Grid, Infinitode 2, Rogue Tower) steht hier mit seinen Quellen; die Beschluesse daraus stehen in `Towerfront-NEUBAU.md`. Neu belegt ist seit v274 einer davon: der dunkle Grund ist gemessen, nicht mehr nur begruendet.

**Erweitert in v269: der Referenzabgleich zu den drei benannten Vorbildern.**
Bis dahin hielt dieses Dokument Marktbefunde allgemein — „modern, nicht
comicartig" —, aber keine Mechanik zu einem einzelnen Spiel. Fuer den Neubau
(`Towerfront-NEUBAU.md`) sind drei Vorbilder benannt und einzeln aufgeschrieben
worden, was sie TUN. Abschnitt 9 unten.

**Nachgesehen in v265:** unveraendert — Marktbefunde mit Quellen, keine Zahlen
aus diesem Baum. Der Kernraub (v262) folgt Defense Grid, das hier als Vorbild
steht; die Zeile dort galt schon vorher.

**Nachgesehen in v258:** das Dokument hält Marktbefunde mit Quellen und keine
Zahlen aus diesem Baum — es kann durch eine Fassung des Spiels nicht veralten.
Diese Zeile hält fest, dass nachgesehen wurde, statt nur das Datum zu setzen.

Erhoben am 08.09.2026 als Vorarbeit zum Anforderungskatalog. Quellen unten.
**Nicht als Meinung notiert, sondern als Befund mit Herkunft** — wo eine
Aussage nur eine Behauptung aus einer Liste ist, steht das dabei.

---

## 1. Der eine Konstruktionsfehler, den fast alle haben

> „Deine Verteidigungsfähigkeit hängt an der Zahl der Türme. Die Zahl der
> Türme hängt am Gold. Das Gold hängt daran, wieviele Gegner du tötest."

Das ist eine **rückgekoppelte Schleife**, und sie kippt in beide Richtungen:

* **Nach unten** (der meistgenannte Vorwurf): ein Fehler in den ersten Wellen
  führt unausweichlich zum Verlust — der Spieler merkt es erst zwanzig bis
  vierzig Minuten später. Das ist die Hauptbeschwerde gegen das Genre.
* **Nach oben** (Towerfronts Fall): ist die Schleife zu flach, kostet gar
  nichts etwas. Gemessen: der Bot beendet die Partie mit **43 % ungenutztem
  Gold**, und die Verluste liegen in **zwei von fünfzehn** Wellen.

**Beides ist derselbe Regler.** Towerfront steht am falschen Ende davon.

## 2. Defense Grid — die Antwort, die das Genre gefunden hat

Defense Grid gilt in jeder Bestenliste als das am saubersten gebaute
TD-Spiel. Sein Kern ist **nicht** die Turmauswahl, sondern was ein Leck
bedeutet:

* Gegner **stehlen Energiekerne** und tragen sie zum Ausgang zurück.
* Wird der Träger unterwegs getötet, **fällt der Kern und schwebt zurück**.
* Ein anderer Gegner kann ihn unterwegs **aufnehmen**.
* Der Rückweg führt oft durch dieselbe Stelle — Türme wirken zweimal.

Die Wirkung, und darum geht es: **ein Leck ist kein Abzug, sondern ein
Ereignis mit Fenster.** Statt „alles oder nichts" gibt es fortlaufend kleine
Lecks, dramatische Rettungen zehn Sekunden vor dem Ausgang, und eine echte
Aufholmöglichkeit. Genau das fehlt Towerfront: dort ist ein Leck ein stiller
Abzug (seit v239 immerhin mit Ausschlag in der Kopfzeile).

## 3. Was Vielfalt WIRKLICH heisst

Der am häufigsten wiederholte Satz der Design-Literatur zum Genre:

> Gegner dürfen sich nicht nur in Werten unterscheiden, sondern müssen den
> Spieler zu **anderem Handeln** zwingen. Sonst ist es dieselbe Strategie mit
> anderen Zahlen.

Dasselbe für Türme und Karten. „Immer wieder auf dieselbe Lösung
zurückzufallen ist die Stelle, an der sich Wiederholung anfühlt."

Towerfront gemessen: die endgültige Zweigwahl bewegt das Ergebnis um **3 bis
18 %** (Soll ≥ 15), und von vier Zielmodi gewinnt einer **nirgends** allein.

## 4. Fokus und Denken (Defender's Quest)

Zwei Leitsätze, an denen dieses Spiel schon gut steht:

1. **Lass den Spieler sich konzentrieren** — nicht: fordere seine
   Aufmerksamkeit heraus. Scrollende Karten sind der Feind: wer sich um
   etwas ausserhalb des Bildausschnitts sorgen muss, kann nicht denken.
   *Towerfront erfüllt das (F1: ganze Karte ohne Scrollen).*
2. **Prüfe sein Denken** — die Schwierigkeit gehört in die Entscheidung,
   nicht in die Reaktionszeit.

Daraus folgt der Umkehrschluss, der hier zählt: Wenn der Bildschirm ruhig
ist und trotzdem kein Spielspass aufkommt, liegt es **nicht** an der
Bedienung, sondern daran, dass zu wenig zu entscheiden ist.

## 5. Wiederspielwert: was die Roguelites gelernt haben

Rogue Tower als klarster Vertreter: **prozedurale Wege machen die Zielwahl
zu einem beweglichen Problem** — man kann keine Karte einmal lösen und für
immer abhaken. Thronefall: Tag/Nacht als Rundenstruktur, jede Runde
Bauentscheidungen, steigende Bedrohung.

Der gemeinsame Nenner ist nicht „Zufall", sondern: **die Aufgabe darf nicht
zweimal dieselbe sein.** Towerfront hat vier feste Karten und einen
Endlosmodus, der vier Wellen trägt.

## 6. Was die „modernen, nicht comichaften" konkret tun

Von den nicht-comichaften Vertretern (Defense Zone 3, Defense Grid 2,
Anomaly, Sanctum 2) ist das Wiederkehrende:

* **Ernste, dichte Optik** — HD-Gelände, echte Explosionsspuren, kein
  Umriss-Cartoon. Towerfront ist stilistisch hier schon richtig.
* **Feinsteuerung am einzelnen Turm** (Defense Zone: Ausrichtung, Modus) —
  nicht nur „bauen und ausbauen".
* **Karten, die sich WÄHREND der Runde ändern** (Defense Grid 2: 21 Stufen,
  die sich im Spiel verschieben und die Aufstellung entwerten).
* Der am häufigsten genannte **Kritikpunkt** derselben Spiele: zu wenige
  Bauplätze, zu wenige Lösungswege, „am Ende doch repetitiv".

## 7. Bedienung auf dem Telefon (Zielgerät)

* Trefferflächen ≥ 44 pt (Apple) / 48 dp (Google), 8 pt Abstand.
  *Towerfront hält das, vom Browsertor gemessen.*
* **Im Querformat gehören die wichtigen Bedienelemente an die SEITEN**, nicht
  in die Mitte des unteren Randes: rund 75 % aller Berührungen macht der
  Daumen, und die Mitte unten ist die am schlechtesten erreichbare Zone.
  *Towerfronts Bedienband läuft über die volle Breite — die Turmknöpfe
  liegen links, der Wellenknopf rechts, die Fähigkeiten in der Mitte. Das
  ist eine offene Frage, keine gemessene Schwäche.*

---

## Quellen

* https://www.moddb.com/features/the-one-problem-with-all-tower-defense-games
* https://www.stardock.com/games/article/495008/siege-of-centauri-dev-journal-what-makes-a-good-tower-defense-game
* https://www.fortressofdoors.com/optimizing-tower-defense-for-focus-and-thinking-defenders-quest/
* https://waywardstrategy.com/2018/09/07/defense-grid-the-awaking-retrospective-review/
* https://thegemsbok.com/art-reviews-and-articles/mid-week-mission-defense-grid-awakening-hidden-path/
* https://towerward.com/blog/best-roguelite-tower-defense-games
* https://www.gamespot.com/gallery/best-tower-defense-games/2900-6140/
* https://www.pcgamesn.com/best-tower-defense-games
* https://parachutedesign.ca/blog/thumb-zone-ux/
* https://www.uxpin.com/studio/blog/responsive-design-touch-devices-key-considerations/

---

## 9. Der Referenzabgleich zu den drei Vorbildern (v269)

Erhoben am 09.09.2026. **Vorbehalt zur Beweislage, und er gehoert an die
Zahlen** (Regel 12): der Volltext der einschlaegigen Seiten war aus dieser
Umgebung nicht erreichbar; alle Angaben stammen aus Suchmaschinen-Auszuegen
dieser Seiten. Wo ein Auszug die Zahl nicht hergab, steht **unbelegt** — nicht
geraten.

### 9.1 Defense Grid: The Awakening (2008)

* **Entscheidung je Welle:** Labyrinth verlaengern gegen Turm aufwerten. Tuerme
  haben genau **drei Stufen**. Die Obergrenze ist eingebaut: ist keine Route zu
  einem noch besetzten Kernlager offen, laufen die Gegner **durch die Tuerme
  hindurch**.
* **Knappheit:** Gold nur aus Abschuessen, Start rund **10 000 Rohstoffe**,
  keine Zinsen, **Verkauf gibt 75 %** zurueck. Der **Command Tower** hebt die
  Bergung auf **125 / 135 / 145 %** fuer je **300** und **schiesst nicht** —
  Einkommen kostet Bauplatz und Feuerkraft.
* **Der Orbitallaser toetet, aber von so getoeteten Gegnern wird kein Rohstoff
  geborgen.** Der Panikknopf kostet Einkommen; das ist eine bezifferte
  Verzweigung, kein Freischuss.
* **Durchbruch:** Gegner laufen zum Kernlager, greifen **ein bis drei
  Energiekerne** und tragen sie zum Ausgang. **Der Kern ist erst verloren, wenn
  er die Karte verlaesst.** Toetet man den Traeger, schwebt der Kern zurueck —
  und kann unterwegs erneut geraubt werden. Verloren ist das Level erst, wenn
  alle Kerne fort sind. **Das ist der Kernraub aus v262.**
* **Bogen:** 20 Karten, rund 10 h, 15 Gegnerarten, 100+ Herausforderungen,
  Medaillen. Wellenzahl je Karte: unbelegt.
* **HUD:** Bedienung links am Rand; oben ein **Ticker als Wellenvorschau** —
  Farbe gibt die Staerke (gruen/bernstein/rot), Symbol die Sonderfaehigkeit.
  Reichweitenvorschau beim Markieren einer Aufwertung.
* **Bild:** 3D, feste Schraegsicht, drei Zoomstufen, **nicht drehbar** — in
  Rezensionen als Mangel genannt.

### 9.2 Infinitode 2

* **Entscheidung je Welle:** die Fruehwelle, ausgerechnet — *die Hoechstzahl
  der Bonusmuenzen wird mit dem Anteil der noch lebenden Gegner und mit dem
  Anteil der verbleibenden Zeit multipliziert.* Dazu 50x Punkte und **doppeltes
  Foerdertempo fuer genau so viele Sekunden, wie man vorgezogen hat**.
* **Knappheit:** die **Kachel**. Tuerme und Modifikatoren wirken als Mauern und
  bestimmen die Route; auf denselben Kacheln stehen die **Miner**, die das
  Meta-Einkommen foerdern, und jeder weitere Miner kostet mehr. Aufwertungen
  standardmaessig bis **Stufe 3**, per Forschung bis **10**.
* **Der Weg:** Gegner nehmen **immer die kuerzeste Route** und rechnen sie
  laufend neu. Gibt es keinen Weg ausser ueber Tuerme, laufen sie hindurch und
  **schalten den beruehrten Turm dabei ab**. Die Zahl der Kartenaenderungen je
  Level ist **gedeckelt** — darueber behalten alle Gegner ihre zuletzt
  berechnete Route.
* **Durchbruch:** Basis-Schadenskapazitaet (im Tutorial **20**), die meisten
  Gegner machen 1 Schaden. Nichts wird geklaut.
* **Zielprioritaet je Turm aus sechs Modi** — First, Last, Weakest, Strongest,
  Nearest, Random. Als einziges der drei.
* **Bogen:** 7 Stufen, **58 Kampagnenkarten**, **400+ Forschungen**, Quests,
  Endlosmodus (Schwierigkeit x1,5, Beute 150 %) mit eigener Bestenliste, die
  **nur die erste Stunde** wertet.
* **Bild:** reine 2D-Draufsicht, minimalistisch-geometrisch, Chiptune. Von den
  dreien das, was einem Browser-Canvas am naechsten liegt.

### 9.3 Rogue Tower (2022)

* **Entscheidung je Welle, und sie ist erzwungen:** *zu Beginn jeder Runde muss
  der Spieler die Karte erweitern, indem er genau einen offenen Pfad auswaehlt,
  an den eine neue Kachel angesetzt wird.* Was kommt, ist zufaellig — gerade,
  gewunden, Kreuzung, Schleife. **Wer einen Pfad vernachlaessigt, bekommt dort
  staerkere Gegner unmittelbar vor der Basis.**
* **Kartenzug:** anfangs alle 3 Wellen 1 aus 3, mit Meta-Aufwertungen **jede
  Welle 1 aus 6**; ueber **400 Karten**.
* **Knappheit dreifach:** Gold (ein Monster laesst so viel fallen, wie die
  Welle nummeriert ist, in der es zuerst auftaucht — **plus 1 Gold je Turmart,
  die es beschaedigt hat**), Mana (sieben Turmarten brauchen es; Siphon neben
  Kristall gibt 1/s, nur auf gleicher Hoehenstufe), und **Hoehenlage**
  (+1 x Stufe Grundschaden, +0,5 x Stufe Reichweite; Rohstoffknoten nur von
  gleicher oder hoeherer Ebene anzapfbar).
* **Kosten steigen in beide Richtungen:** ein Turm wird teurer, je mehr Tuerme
  derselben Art stehen; eine Aufwertung teurer je Stufe.
* **Durchbruch:** Basisturm hat Lebenspunkte, jedes Monster macht 1 Schaden,
  ein Boss toetet sofort — aber **Lebenspunkte sind reparierbar** (Mine neben
  Eisenader: +1 Hoechstleben, +10 % je Stufe auf Wiederherstellung).
* **Bogen:** ein gewonnener Lauf sind **45 Wellen**, danach endlos; ein guter
  Lauf dauert **rund eine Stunde**. XP zwischen den Laeufen kauft Tuerme,
  Gebaeude und Karten ins Deck — **450 / 900 / 1350 XP** fuer einen Sieg bei
  ein, zwei, drei Pfaden. Die Zahl der Pfade ist die **Schwierigkeitswahl vor
  dem Lauf**.
* **Bild:** 3D low-poly, feste Schraegsicht, nicht drehbar.

### 9.4 Was die drei gemeinsam haben

1. **Alle drei machen den WEG zur Entscheidung, keiner den Turm.**
2. Zwei von drei lassen Gegner **durch** Tuerme laufen, statt Sperren zu
   verbieten; Infinitode schaltet den beruehrten Turm dabei ab.
3. **Kein einziges zieht bei einem Durchbruch einfach ein Leben ab.**
4. Defense Grid ist das einzige mit **Rueckholbarkeit** — genau die Mechanik,
   die Towerfront seit v262 hat.
5. Zwei von drei belohnen frueh gerufene Wellen; nur Infinitode mit einer
   ausgerechneten Formel.
6. **Alle drei machen Einkommen zu einer Bauentscheidung**, nicht zu einem
   Tropf.
7. Zwei von drei **verteuern Wiederholung** ausdruecklich; Rogue Tower belohnt
   Vielfalt zusaetzlich in der Beute.
8. Aufwertungstiefe ist **umgekehrt** zur Kartenzahl: 3 Stufen bei 20 festen
   Karten, 3–10 bei 58, unbegrenzt bei gar keiner festen Karte.
9. Nur eines der drei ist reine 2D-Draufsicht (Infinitode). Die anderen beiden
   sind Schraegsicht **ohne drehbare Kamera** — in beiden Faellen in
   Rezensionen als Mangel genannt.

### 9.5 Quellen zu Abschnitt 9

Codex Gamicus (Defense Grid) · Steam-Guide „How to Defense Grid" ·
AyumiLove Defense-Grid-Guide · Steam-Seite und GameFAQs-Daten zu Defense Grid ·
GameSpot-Rezension · anykeytostart und GamingNexus zur Bedienung ·
TV Tropes YMMV · gamepressure ·
Infinitode-2-Wiki: Graphical game interface, Enemies Walk on Platforms, Towers,
Abilities, Miners, Mode, Level Overview, Level 0.1, Fighter ·
Steam- und RAWG-Seite zu Infinitode 2 ·
Rogue-Tower-Wiki: Gold, Towers, Monsters, Map features, Upgrades, Upgrade
Cards, Mana Siphon, Mine · Steam-Seite zu Rogue Tower ·
Newsminer und Indie Hell Zone zu Rogue Tower · gamepressure.
