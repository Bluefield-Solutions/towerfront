# Marktrecherche — was moderne Tower-Defense-Spiele ausmacht

Stand: v251 · 08.09.2026

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
