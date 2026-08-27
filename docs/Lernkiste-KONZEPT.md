# Lernkiste — Konzept

Arbeitstitel. Ein Lernspiel für Fiona (6, 1. Klasse Bayern) und Lea (8,
3. Klasse). Erstes Fach: Erdkunde in vier Ebenen. Läuft als Symbol auf dem
Startbildschirm von iPhone und iPad, liefert sich selbst aus, und lässt sich
prüfen — fachlich, technisch und datenschutzrechtlich.

Stand: **K3** · O1 und O4 entschieden · M2, MG und M3–M6 als Prototyp gebaut
Laufender Stand und alle Messwerte: `Lernkiste-STAND.md`
Vorgänger: K1, geprüft in `Lernkiste-PRUEFBERICHT-K1.md` — 25 Befunde eingearbeitet
K2, geprüft in `Lernkiste-GRAFIK-AUDIT.md` — 21 Grafikbefunde eingearbeitet

---

## 0. Was hier drinsteht und was nicht

Dieses Dokument ist die **Konzeption vor der Umsetzung**: Technikwahl mit
Begründung, Architektur, Inhaltsmodell, Prüfbarkeit, Auslieferung,
Meilensteine mit Abnahmekriterien. Es legt **nicht** fest, wie eine einzelne
Schaltfläche aussieht — das entsteht in der Umsetzung.

**Was sich gegenüber K2 geändert hat.** Ein Grafik-Audit hat 21 Befunde
ergeben. Drei widersprachen K2 direkt: die Kartenquelle war eine Stufe zu
grob (VG2500 statt VG250), das Gütemaß für die Vereinfachung war blind für
abgeschnittene Landspitzen, und ein Gebiet kann nicht ein einzelner Pfad sein
— Bremen hat zwei Teile, Brandenburg hat ein Loch namens Berlin. Zehn weitere
betrafen die Oberfläche, die K2 gar nicht angefasst hatte: es gab kein
Gestaltungssystem, keine Bewegung, keine Zustände und kein Tor, das Aussehen
prüft. Der Bericht steht daneben.

**Was sich gegenüber K1 geändert hat.** Ein vollständiger Prüfdurchgang hat
25 Befunde ergeben: fünf Sachfehler, sechs Widersprüche, vierzehn Lücken. Der
schwerste war strukturell — Ebene 4 (Landeshauptstädte) war zugesagt, aber im
Datenmodell nicht vorgesehen, weil eine Stadt keine Fläche ist. Er ist
behoben, und die Lösung hat die Ebene besser gemacht als der ursprüngliche
Entwurf. Der Bericht steht daneben, damit die Änderungen nachvollziehbar
bleiben.

Von den fünf Punkten in **Kapitel 15** sind **O1** (Länderauswahl) und **O4**
(Repository öffentlich) inzwischen entschieden. Die drei verbliebenen haben
Vorgaben und blockieren nichts. Keiner davon
blockiert M0.

**Vier Zahlen, die dieses Dokument beschreiben:**

| | |
|---|---|
| Ebenen | 4 |
| Gebiete gesamt | **64** (7 Kontinente + 25 Länder + 16 Bundesländer + 16 Städte) |
| Eingabewege | 3 (Ziehen · Sprechen · Tippen) |
| Tore in der Kette | **22** |

Die Zahlen 64 und 22 werden nicht geschrieben, sondern gezählt: `inhalt`
zählt die Gebiete aus den Daten, `doku` zählt die Torschritte gegen diese
Prosa. Eine Zahl, die niemand prüft, veraltet lautlos — in Towerfront stand
einundsechzig Fassungen lang die falsche.

---

## 1. Die zwei Kinder sind die Anforderung

Alles Weitere folgt aus diesem Kapitel. Es steht deshalb vor der Technik.

| | **Fiona, 6** | **Lea, 8** |
|---|---|---|
| Schuljahr | 1. Klasse, Bayern | 3. Klasse |
| Lesen | fängt an — **darf nie vorausgesetzt werden** | flüssig |
| Schreiben | Druckschrift, einzelne Wörter | schreibt Sätze, lernt Rechtschreibung |
| Haupteingabe | **Sprechen** | **Tippen** |
| Zweiteingabe | Ziehen | Ziehen |
| Sitzung | 5 Minuten, dann ist Schluss | 8–10 Minuten |
| Auswahl je Aufgabe | 4 Kandidaten | alle, freies Feld |
| Ebene 2 | die **drei** größten Länder | die **fünf** größten Länder |
| Belohnung | sofort, jedes Mal | Sammlung über Tage |

**Die entscheidende Ableitung: Fiona kann die Namen nicht lesen.** Eine Liste
von Kontinentnamen am Bildschirmrand ist für sie eine Liste von Mustern. Das
Spiel wäre nicht falsch — sie würde Formen zu Formen zuordnen und dabei
nichts über Erdkunde lernen. Deshalb gilt für ihr Profil:

> **Jeder geschriebene Name im Spiel ist auch ein hörbarer Name.**
> Antippen liest vor. Immer, überall, ohne Ausnahme.

Das ist keine Bequemlichkeitsfunktion, sondern die Bedingung, unter der das
Spiel für sie überhaupt ein Lernspiel ist. Technisch trägt es die
Sprachausgabe des Geräts (Kapitel 6.3), kostet nichts und läuft offline.

**Zum bayerischen Lehrplan.** LehrplanPLUS, Grundschule, Heimat- und
Sachunterricht, Lernbereich „Raum und Mobilität", Jahrgangsstufe **3/4**:
dort stehen die Gliederungseinheiten *Stadt/Gemeinde, Landkreis, Bayern,
Deutschland, Europa* sowie die *Kontinente*. Das deckt sich mit den Ebenen 1,
3 und 4 dieses Konzepts und passt auf **Lea**.

Für **Fiona** ist Erdkunde in der 1. Klasse kein Lehrplaninhalt. Für sie ist
das Spiel Vorwissen und vor allem *Sprechübung*. Das ist kein Einwand — es
heißt nur, dass ihr Profil nicht an Vollständigkeit gemessen wird, sondern an
Wiedererkennen und Aussprache. Ihr Fortschritt zählt deshalb andere Dinge als
Leas (Kapitel 9).

---

## 2. Technikwahl

### 2.1 Die Entscheidung in einem Satz

**TypeScript 5 + Vite 7 + Svelte 5, gezeichnet als SVG im DOM, ausgeliefert
als PWA über GitHub Pages.**

### 2.2 Warum SVG und nicht Canvas

Towerfront zeichnet auf Canvas. Das war dort richtig — 60 Bilder je Sekunde,
hunderte bewegte Figuren. Hier ist es falsch:

1. **Treffererkennung ist geschenkt.** „Liegt der Finger auf Afrika?" ist bei
   SVG eine Eigenschaft des Elements (`pointer-events`), bei Canvas eine
   eigene Geometrie-Bibliothek, die man schreiben, prüfen und pflegen muss.
   Bei 16 Bundesländern mit verzahnten Grenzen ist das der halbe Aufwand des
   ganzen Projekts — und Ebene 4 setzt dieselbe Flächenerkennung noch einmal
   voraus (Kapitel 4.4).
2. **Scharf in jeder Größe.** Landesumrisse auf einem iPad mit dreifacher
   Punktdichte, zoombar bis auf Bremen.
3. **Vorlesbar und bedienbar für Hilfstechnik.** Jedes Land ist ein Element
   mit einem Namen — die Grundlage für Kapitel 11, und prüfbar.
4. **Das Bild bewegt sich fast nie.** Keine Kaskade, keine Physik, keine
   Bildrate zu verteidigen. Der einzige bewegte Vorgang ist ein Etikett am
   Finger — und das ist ein `transform` auf einem Element.

Bewegte Bildschirmteile (Konfetti, Sterne) laufen als CSS-Animation oder, wenn
es wirklich einmal viele Teilchen sind, auf einem **darüberliegenden** Canvas.
Beides schließt sich nicht aus.

### 2.3 Warum Svelte 5 und nicht nacktes TypeScript

Towerfront kommt ohne Gerüst aus, weil es genau eine Fläche hat. Hier gibt es
sechs Bildschirme mit Zuständen, die sich gegenseitig sehen (Kapitel 9.3).
Das von Hand zu synchronisieren ist genau die Sorte Arbeit, die stillschweigend
kaputtgeht — Towerfronts eiserne Regel 6 („im Menü ist keine Spielbedienung
sichtbar") ist zweimal schiefgegangen, bis sie eine *Ableitung* wurde statt
eines Schalters. Ein Gerüst mit abgeleiteten Zuständen macht diese
Fehlerklasse strukturell unmöglich.

| | Svelte 5 | React 19 | Vanilla TS |
|---|---|---|---|
| Laufzeit im Bündel | ~10 KB | ~45 KB | 0 |
| Abgleichverfahren | kompiliert, kein VDOM | VDOM | Handarbeit |
| Übergänge, Animation | eingebaut | Zusatzpaket | Handarbeit |
| Passt zu SVG | direkt | Attributnamen weichen ab | direkt |
| Zustandssynchronität | Runes, abgeleitet | Hooks, Disziplin | keine |

Auf einem älteren iPad ist der Unterschied zwischen 10 und 45 KB Laufzeit
nicht die Dateigröße — es ist die Zeit, die der Hauptfaden mit dem Abgleich
verbringt, während ein Finger ein Etikett zieht. Solid.js wäre technisch
gleichwertig; Svelte gewinnt an Werkzeugreife und Dokumentationslage.

### 2.4 Abhängigkeiten — die vollständige Liste

Wenige, und jede mit Grund. Was hier nicht steht, kommt nicht rein, ohne dass
jemand diese Tabelle ergänzt.

**Zur Laufzeit (landet im Bündel):**

| Paket | Wofür | ungefähr |
|---|---|---|
| `svelte` | Oberfläche | 10 KB |
| `idb-keyval` | IndexedDB ohne Zeremonie | 1 KB |
| Andika (beschnitten) | Buchstabenformen für Leseanfänger — **nur dort, wo das Kind liest** | ~20 KB |
| Oberflächenschrift (beschnitten) | Knöpfe, Überschriften, Zahlen, Elternbereich (Kapitel 11) | ~40 KB |

Keine Geo-Bibliothek zur Laufzeit. Keine Ziehbibliothek. Keine
Zustandsbibliothek. Keine Symbolschriftart. Kein Klang- und kein
Bildvorrat — beides wird erzeugt (Kapitel 5.5).

**Zur Bauzeit (landet nicht im Bündel):**

`vite`, `typescript`, `@sveltejs/vite-plugin-svelte`, `vite-plugin-pwa`
(Workbox), `d3-geo` + `topojson-client` (Projektion, **nur im Werkzeug**),
`mapshaper` (Topologie **und** Vereinfachung — die Reihenfolge ist der
Befund G3, siehe 5.3), `zod` (Inhaltsprüfung), `vitest`, `@playwright/test`
(auch für das Tor `ansicht`), `eslint`, `svelte-check`.

### 2.5 Was ausdrücklich *nicht* gewählt wurde

- **React Native / Expo / Capacitor.** Ein natives Gehäuse bedeutet:
  Apple-Entwicklerkonto (99 €/Jahr), Prüfverfahren oder TestFlight mit
  90-Tage-Ablauf, und jede Auslieferung dauert Stunden statt Minuten. Der
  Auftrag lautet „Symbol auf dem Startbildschirm, immer aktuell" — das
  leistet eine PWA vollständig und ohne Apple im Weg.
- **Flutter / Unity.** Mehrere Megabyte Laufzeit für ein Spiel, dessen
  gesamter Inhalt unter 400 KB passt.
- **Ein Karten-Framework (Leaflet, MapLibre).** Für *echte* Karten mit
  Kacheln und Zoomstufen gebaut. Wir brauchen sieben Umrisse und wollen keine
  Kachelserver, keine Netzabhängigkeit, keine Beschriftungen fremder Sprache.
- **HTML5 Drag-and-Drop.** Auf iOS Safari faktisch unbenutzbar. Gezogen wird
  mit **Pointer Events**, siehe 6.1.

---

## 3. Architektur

### 3.1 Die tragende Idee: eine Aufgabe, drei Eingabewege

Das ist der Kern des Entwurfs. Alles andere ist Ausführung.

Eine Aufgabe lautet immer gleich: *„Dieses Gebiet — wie heißt es?"* Was sich
je Profil unterscheidet, ist ausschließlich, **wie** die Antwort hereinkommt.
Also gibt es genau eine Aufgabenlogik und drei austauschbare Eingabegeber, die
dasselbe Ereignis erzeugen:

```
             ┌──────────────────────────────────────┐
             │   Aufgabe: gebiet="europa"           │
             │   Kandidaten: [4 … 7]                │
             └──────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
  ┌───────────┐        ┌────────────┐        ┌────────────┐
  │  Ziehen   │        │  Sprechen  │        │  Tippen    │
  │ (beide)   │        │  (Fiona)   │        │  (Lea)     │
  └───────────┘        └────────────┘        └────────────┘
        └─────────────────────┼─────────────────────┘
                              ▼
              Antwort { gebietId, roheingabe, sicherheit }
                              ▼
              Bewertung → richtig | fast | falsch
```

**Warum das die richtige Fuge ist:** die vierte Ebene, das nächste Fach, ein
drittes Kind mit einem vierten Eingabeweg — nichts davon rührt an der
Aufgabenlogik. Der Prüfdurchgang hat das gehärtet: Ebene 4 hat die
Aufgaben*form* geändert (Paarbildung statt Zuordnung), ohne diese Fuge
anzutasten.

Und die Prüfbarkeit folgt daraus: die Aufgabenlogik lässt sich ohne
Bildschirm, ohne Mikrofon und ohne Browser testen, weil sie nur
`Antwort`-Objekte sieht.

### 3.2 Verzeichnisse

```
src/
  inhalt/       reine Daten. Kontinente, Länder, Bundesländer, Städte,
                Aliasse, Aussprachevarianten, Ablenker. Kein Code, nur
                Fakten. Wird von einem Zod-Schema bewacht.
  geo/          ERZEUGT — SVG-Pfade als TypeScript. Nie von Hand
                bearbeiten; entsteht aus tools/geo-backen.ts.
  kern/         Aufgabenauswahl (Leitner), Bewertung, Sitzungsablauf,
                Fortschritt. Kennt weder DOM noch Mikrofon.
  eingabe/      ziehen.ts · sprache.ts · tastatur.ts
  vergleich/    normalisieren · Alias · Kölner Phonetik · Levenshtein
  profil/       Profile, Fähigkeitsschalter, Ablage (IndexedDB)
  protokoll/    Ereignisstrom für Elternbereich und Prüfung
  marken/       Gestaltungssystem: Raster, Skalen, Farben (OKLCH),
                Bewegungsdauern und -kurven, Symbolsatz. Die EINZIGE
                Stelle, an der ein Zahlenwert für Farbe, Abstand,
                Radius oder Dauer steht (Tor `marken`).
  ui/           Svelte-Komponenten. Dumm — bekommt Zustand, gibt Absicht.
  ton/          Vorlesen, erzeugte Klänge
tools/          Torkette, Geo-Pipeline, Berichte
```

### 3.3 Das Inhaltsmodell — ein Baum, keine vier Sonderfälle

Die vier Ebenen sind **nicht** vier Programme. Sie sind vier Schnitte durch
denselben Baum:

```ts
type Gebiet = {
  id: string;              // "de-by"
  name: string;            // "Bayern"
  aliasse: string[];       // ["Freistaat Bayern"]
  aussprache: string[];    // wie Kinder es sagen — für die Sprachprüfung
  ablenker: string[];      // plausible Falschantworten (Kapitel 4.4)
  elternId: string | null; // "de"
  ebene: 1 | 2 | 3 | 4;

  art: 'flaeche' | 'punkt';   // K2 — eine Stadt ist kein Umriss
  ort?: [number, number];     // Lage, nur bei art === 'punkt'
  zielId?: string;            // worauf gezogen wird, wenn art === 'punkt'

  // K3, Befund G4: ein Gebiet ist selten EIN Ring.
  pfad?: { grob: string; mittel: string; fein: string };  // je Stufe (G6)
  fuellregel: 'evenodd';      // damit Löcher Löcher bleiben
  teile: number;              // getrennte Teile — Bremen: 2
  loecher: string[];          // erwartete Löcher — Brandenburg: ["de-be"]

  anker: [number, number];    // Punkt IM Gebiet, für Etikett und Kleinstflächen
  flaecheRel: number;         // Anteil an der Ansicht — steuert 5.4
  standJahr: number;          // Datenstand (Kapitel 4.6)
  quelle: string;             // woher die Zuordnung stammt
};
```

Eine Ebene ist dann nur noch eine Abfrage: *alle Gebiete mit `elternId = X`.*
Die vierte Ebene, das nächste Fach, eine fünfte — alles ist ein neuer Ast,
keine neue Mechanik. Das ist der Unterschied zwischen einem Spiel, das man
erweitert, und einem, das man jedes Mal aufmacht.

**`art` ist der Befund L1 aus dem Prüfbericht.** In K1 hatte jedes Gebiet
einen Pfad — für eine Stadt gibt es keinen. Ohne diese Unterscheidung wären
Zeichnung, Treffererkennung und das Tor `geo` auf Ebene 4 alle drei
gescheitert.

**`teile`, `loecher` und `fuellregel` sind Befund G4 aus dem Grafik-Audit.**
K2 nahm an, ein Gebiet sei ein geschlossener Ring. In Deutschland fällt das
sofort auf: **Bremen besteht aus zwei getrennten Teilen** (Bremen und
Bremerhaven, rund 60 km auseinander), **Brandenburg hat ein Loch** — Berlin
liegt vollständig darin — und **Niedersachsen ebenfalls**, nämlich die Stadt
Bremen. Ohne Lochunterstützung liegt Berlins Trefferfläche *innerhalb* der
Füllung Brandenburgs: das Kind tippt auf Berlin und trifft Brandenburg.

Ein einzelnes `d`-Attribut kann mehrere Unterpfade tragen. Aber die Tore
müssen es wissen: „Fläche > 0" wird zu „Außenring positiv, jedes Loch negativ
orientiert", Punkt-in-Polygon wird zu Punkt-in-Polygon-**mit-Löchern**, und
der Anker gehört in den **größten** Teil.

### 3.4 Fächer nach Erdkunde

Der Baum trägt Gebiete. Ein zweites Fach (Mathe, Deutsch, Tiere) trägt andere
Gegenstände — aber dieselbe Aufgabenform: *hier ist ein Ding, wie heißt es /
was gehört dazu.* Die Fuge dafür ist ein **Modul**:

```ts
type Modul = {
  id: 'erdkunde' | 'mathe' | ...;
  ebenen: Ebene[];
  darstellung: SvelteComponent;   // wie das Ding gezeigt wird
  // Aufgabenauswahl, Bewertung, Eingabewege, Protokoll: geteilt
};
```

Erdkunde wird als **erstes** Modul gebaut, aber gegen diese Schnittstelle.
Der Unterschied kostet in M3 vielleicht einen halben Tag und spart beim
zweiten Fach Wochen. Kein zweites Fach wird jetzt entworfen — nur die Tür
offen gelassen.

---

## 4. Die vier Ebenen

### 4.1 Ebene 1 — Kontinente (7)

Afrika · Antarktika · Asien · Australien und Ozeanien · Europa ·
Nordamerika · Südamerika. Das ist die Schulzahl; ein Kind, das „sechs
Kontinente" lernt, lernt etwas Falsches.

**Lea:** alle sieben, freies Schreibfeld.

**Fiona: drei Runden, aufeinander aufbauend.**

| Runde | Kandidaten | warum diese |
|---|---|---|
| 1 | Europa · Afrika · Australien · Südamerika | vier klar unterscheidbare Formen, alle bewohnt und im Alltag präsent |
| 2 | + Nordamerika · Asien | jetzt ist der **Nord/Süd-Kontrast** der Lerninhalt — er wird als Gegensatz eingeführt, nicht nebenbei |
| 3 | + Antarktika | mit eigenem Satz: *„Hier wohnt niemand — nur Eis."* |

Das ersetzt die Einstiegsrunde aus K1. Deren Begründung war falsch (Befund F4):
Antarktika hat in den üblichen Weltkarten gerade **keinen** unverwechselbaren
Umriss, sondern wird zu einem verzerrten Band am unteren Rand. Es ist die am
schwersten wiederzuerkennende Fläche, nicht die leichteste — und gehört
deshalb ans Ende, nicht an den Anfang.

Antarktika bleibt trotzdem drin: Die sieben Kontinente sind eine geschlossene
Menge, und der Satz *„Hier wohnt niemand"* ist für ein Kind ein besserer
Merksatz als jede Form.

### 4.2 Ebene 2 — die einwohnerstärksten Länder je Kontinent

**Eine Regel, zwei Tiefen.** Lea bekommt die fünf größten, Fiona die drei
größten. Das ist keine willkürliche Auswahl nach Bekanntheit, sondern
dieselbe Regel in zwei Dosierungen — und sie löst das Bekanntheitsproblem von
selbst: die drei größten Länder eines Kontinents sind fast immer die
geläufigen.

| Kontinent | 1 | 2 | 3 | *(nur Lea)* 4 | 5 |
|---|---|---|---|---|---|
| **Asien** | Indien | China | Indonesien | Pakistan | Bangladesch |
| **Afrika** | Nigeria | Äthiopien | Ägypten | DR Kongo | Tansania |
| **Europa** | Russland | Deutschland | Vereinigtes Königreich | Frankreich | Italien |
| **Nordamerika** | USA | Mexiko | Kanada | Guatemala | Haiti |
| **Südamerika** | Brasilien | Kolumbien | Argentinien | Peru | Venezuela |

Australien/Ozeanien ist beauftragt ausgenommen, Antarktika hat keine Länder.
**25 Länder** für Lea, 15 für Fiona.

Wie gut die Aufteilung greift, zeigt Nordamerika: Fiona bekommt USA, Mexiko
und Kanada — genau die drei, die sie kennt. Guatemala und Haiti erreichen nur
Lea, und für eine Achtjährige ist „zwei Länder, die du noch nicht kanntest"
kein Mangel, sondern der Punkt.

**Zwei Korrekturen gegenüber K1:**

- **Haiti statt Kuba** auf Platz 5 in Nordamerika. K1 hatte Kuba vorgezogen
  und das mit „liegt knapp hinter Haiti" begründet. Tatsächlich liegen die
  Dominikanische Republik (11,33 Mio) und dann Kuba (11,19 Mio) hinter Haiti
  (11,72 Mio) — Kuba ist Siebter, nicht Fünfter. Befund F1.
- **Die Türkei braucht keine Sonderregel.** K1 hatte sie „aus pädagogischen
  Gründen" aus Europa herausgehalten. Die Datenquelle ordnet sie ohnehin
  Asien zu, wo sie nicht unter die ersten fünf kommt. Damit gilt eine einzige,
  nachprüfbare Regel: *Ein Land gehört dem Kontinent, dem die Quelle es
  zuordnet.* Russland gehört danach zu Europa und bleibt drin — dass ein Land
  auf zwei Kontinente passt, ist für ein Kind ein guter Satz, kein Problem.

**Was neben den Zielländern zu sehen ist.** Der **ganze** Kontinent wird
gezeichnet, alle Länder mit ihren Grenzen; die Ziele sind hervorgehoben, der
Rest liegt ruhig daneben. Zeigte man nur die fünf, lernte das Kind eine Karte,
die es nicht gibt — und könnte durch Ausschluss raten statt zu wissen.

**Australien und Antarktika sind keine Sackgasse.** Beide sind auf Ebene 2
sichtbar und erkennbar kein Ziel. Wer hintippt, bekommt einen gesprochenen
Satz statt nichts: *„In der Antarktis wohnt niemand — hier gibt es keine
Länder."* Für eine Sechsjährige ist ein toter Tipp das Ende der Sitzung.

### 4.3 Ebene 3 — die 16 Bundesländer

Baden-Württemberg · Bayern · Berlin · Brandenburg · Bremen · Hamburg ·
Hessen · Mecklenburg-Vorpommern · Niedersachsen · Nordrhein-Westfalen ·
Rheinland-Pfalz · Saarland · Sachsen · Sachsen-Anhalt · Schleswig-Holstein ·
Thüringen.

Für **beide** Profile, wie beauftragt — bei Fiona mit Vorlesen und in zwei
Halbportionen (Nord/Süd), sonst ist es für eine Erstklässlerin eine Wand.

### 4.4 Ebene 4 — die Landeshauptstädte

**Der Prüfdurchgang hat hier den schwersten Befund geliefert.** In K1 war die
Ebene zugesagt, aber im Datenmodell nicht möglich: `Gebiet` hatte einen Pfad,
das Tor `geo` verlangte „Fläche > 0" — und eine Stadt ist ein Punkt.

**Gelöst als Paarbildung.** Gezogen wird der *Stadtname* auf die *Fläche* des
Bundeslands. Damit bleibt die Mechanik überall dieselbe, die
Treffererkennung arbeitet weiter auf Flächen, und der Lerninhalt ist genau
der gefragte: welche Stadt gehört zu welchem Land. Nach der richtigen Antwort
erscheint der Stadtpunkt an seiner echten Lage — da lernt das Kind die Lage
gleich mit, ohne dass sie je das Ziel war.

*Die Alternative — Punkte auf der Karte treffen — wurde verworfen: Berlin und
Potsdam liegen 25 km auseinander, Bremen und Hamburg 95 km. Auf einem iPhone
quer sind das wenige Bildpunkte; die 44-Punkte-Regel aus Kapitel 5.4 wäre
nicht einzuhalten.*

**Die drei Stadtstaaten sind ein Lerninhalt, kein Sonderfall.** Berlin und
Hamburg *haben keine* Landeshauptstadt — Stadt und Land sind dasselbe. Bremen
ist ein Zwei-Städte-Staat aus Bremen und Bremerhaven; dort ist Bremen die
Landeshauptstadt. Sechzehnmal „Wie heißt die Landeshauptstadt?" zu fragen,
wäre dreimal eine schiefe Frage.

Deshalb: eine **vorgeschaltete Lerneinheit „Die drei Stadtstaaten"** — ein
Satz, drei Karten, dann sind sie erklärt. Die Hauptrunde hat danach
**13 Rätsel**. Aus dem Fehler wird der beste Lerninhalt der Ebene.

**Die Ablenker sind das Eigentliche.** Fünf Bundesländer haben eine
Hauptstadt, die *nicht* ihre größte Stadt ist — dort sitzt der Irrtum, den
fast jeder Erwachsene teilt:

| Bundesland | Hauptstadt | die Falle |
|---|---|---|
| Hessen | Wiesbaden | Frankfurt am Main |
| Nordrhein-Westfalen | Düsseldorf | Köln |
| Sachsen | Dresden | Leipzig |
| Sachsen-Anhalt | Magdeburg | Halle (Saale) |
| Mecklenburg-Vorpommern | Schwerin | Rostock |

Ohne gepflegte Ablenker ist Ebene 4 trivial; mit ihnen ist sie der wertvollste
Teil des Spiels. `ablenker: string[]` gehört deshalb zum Datensatz, und das
Tor `inhalt` verlangt für jedes Gebiet auf Ebene 4 mindestens einen — für die
fünf Fallen namentlich den richtigen.

**Regierungsbezirke sind gestrichen.** In K1 standen sie als optionale
Erweiterung; auf Ansage entfallen sie. Sie sind auch inhaltlich der schwächere
Kandidat: Bayerns Regierungsbezirke haben keine Entsprechung in den anderen
Ländern, die Ebene wäre also überall sonst leer.

### 4.5 Wo die Zahl 69 herkommt

7 Kontinente + **25** Länder + 16 Bundesländer + 16 Städte = **64 Gebiete**.
Fiona sieht davon 54 (15 statt 25 Länder).

**Diese Zahl war zweimal falsch, und beide Male hat sie niemand gerechnet.**
In K1 stand „53", das zählte nur drei Ebenen (Befund I2). K2 und K3 sagten
„69" und rechneten mit **30** Ländern — als gäbe es sechs Kontinente mit
Ländern. Es sind fünf: Australien ist beauftragt ausgenommen, Antarktika hat
keine. Fünf mal fünf ist fünfundzwanzig.

Gefunden hat es das Tor `inhalt`, beim ersten Lauf, gegen die echten Daten.
Genau dafür ist es da — und deshalb wird die Zahl ab jetzt **gezählt und
gegen diesen Absatz geprüft**, nicht geschrieben.

### 4.6 Jede Liste trägt ihren Stand

Ranglisten verschieben sich: Indien hat China 2023 überholt, Haiti und die
Dominikanische Republik trennen 0,4 Millionen. Eine Liste ohne Stichjahr
veraltet lautlos.

Deshalb trägt jeder Datensatz `standJahr` und `quelle`, und das Tor `inhalt`
schlägt an, wenn der Stand älter als drei Jahre ist. Für die Kinder ist das
sogar sichtbar: „die fünf größten Länder — Stand 2025" ist selbst ein
Lerninhalt, nämlich dass solche Listen sich ändern.

---

## 5. Die Karten

Der heikelste technische Teil, weil er Lizenzen, Genauigkeit und Dateigröße
gleichzeitig betrifft.

### 5.1 Quellen und Lizenzen (Audit-relevant)

| Ebene | Quelle | Lizenz | Pflicht |
|---|---|---|---|
| Kontinente | **Natural Earth 1:50m** | Public Domain | keine, wird trotzdem genannt |
| Länder | **Natural Earth 1:10m** | Public Domain | keine |
| Bundesländer | **BKG VG250** (1 : 250 000) | dl-de/by-2-0 | **Namensnennung erforderlich** |
| Städtelagen | Natural Earth `populated places` | Public Domain | keine |

**K2 hatte hier zwei Stufen zu grob gegriffen** (Befund G1). VG**2500** ist
der Maßstab 1 : 2 500 000 — gemacht für Karten, auf denen Deutschland zehn
Zentimeter breit ist. Auf einem iPad füllt Deutschland rund 1 600 Bildpunkte,
also grob **400 Meter je Bildpunkt**; bei VG2500 wird die Nordseeküste zum
Bogen, die Halligen verschwinden, die Elbeschleifen zwischen Niedersachsen
und Sachsen-Anhalt verschwinden. **VG250 ist zehnmal feiner, kostenlos und
unter derselben Lizenz** — und liegt damit unter dem, was ein Bildpunkt
auflösen kann. Dasselbe für die Länderebene: 1:50m reicht für sieben
Kontinentumrisse, nicht für ein formatfüllendes Frankreich.

Die Namensnennung steht im Elternbereich unter „Herkunft der Karten" und wird
vom Tor `lizenz` geprüft. Eine Lizenzpflicht, die nur in einer Textdatei
steht, verschwindet beim ersten Umbau.

**GADM wird nicht verwendet** — die Lizenz verbietet den Einsatz in Produkten
und wäre hier ein echtes Problem, auch bei einem Familienspiel im offenen
Netz.

### 5.2 Kontinentgrenzen sind eine Entscheidung, keine Tatsache

Der stillste Fehler des ganzen Entwurfs, gefunden als Befund L2.

Natural Earth ordnet im Feld `CONTINENT` **Russland vollständig Europa** zu
und die **Türkei vollständig Asien**. Ein naives `CONTINENT == 'Europe'`
erzeugt ein „Europa", das bis Wladiwostok reicht — und Fiona lernte einen
Umriss, den keine Schulkarte zeigt. Nichts hätte angeschlagen: die Geometrie
wäre gültig, die Fläche größer als null, der Anker im Pfad.

Für **Zuordnung** (welches Land zu welchem Kontinent) gilt die Quelle. Für
**Geometrie** (wie der Kontinent aussieht) gilt die Schulkonvention, und sie
steht ausdrücklich in der Pipeline:

| Kante | Regel |
|---|---|
| Europa / Asien | Ural, Uralfluss, Kaspisches Meer, Kaukasus-Hauptkamm |
| Europa / Afrika | Mittelmeer; Zypern zu Asien |
| Asien / Afrika | Sueskanal; der Sinai zu Asien |
| Nord- / Südamerika | Staatsgrenze Panama/Kolumbien |
| Grönland | zu Nordamerika |
| Island | zu Europa |

Ein Tor prüft, dass jede dieser Klippkanten gesetzt ist — sonst wandert sie
beim nächsten Datenstand still zurück.

### 5.3 Der Backprozess läuft zur Bauzeit, nicht im Spiel

```
Natural Earth 1:50m + 1:10m / BKG VG250   (Shapefile, mehrere hundert MB)
        │  tools/geo-backen.ts
        ├─ Kontinentkanten klippen (5.2)
        ├─ TOPOLOGIE ZUERST: mapshaper -combine-files über ALLE Ebenen,
        │     dann -clean (Restlücken, Splitter, Selbstschnitte)
        ├─ vereinfachen: -simplify weighted keep-shapes, JE STUFE
        │     grob / mittel / fein — Ziel ist Hausdorff, nicht Fläche
        ├─ d3-geo: projizieren — je Ebene eine eigene Projektion
        │     Welt          → geoNaturalEarth1
        │     Kontinent     → geoConicEqualArea mit gesetzten   [G7]
        │                     Standardparallelen bei 1/6 und 5/6 der
        │                     Breitenausdehnung
        │     Afrika, Südam.→ geoAzimuthalEqualArea (liegen über dem
        │                     Äquator; Kegel taugt dort nicht)
        │     Deutschland   → geoConicConformal, Standardparallelen
        │                     48°40' und 53°40' — der amtliche Schnitt
        ├─ auf viewBox 0..1000 normieren, auf 1 Nachkommastelle runden
        ├─ Anker rechnen: Pol der Unzugänglichkeit, NICHT der Schwerpunkt
        │     (der Schwerpunkt Italiens liegt im Meer)
        │     — sein Abstand ist zugleich der Radius des größten Kreises
        │       im Gebiet und entscheidet die Beschriftung (5.7)
        ├─ Inselregel anwenden (5.8)
        ├─ Grenzbögen getrennt ausgeben (5.9)
        ├─ Vierfärbung der Bundesländer rechnen (5.6)
        └─ ausgeben: src/geo/<ebene>.<stufe>.ts  — reine Zeichenketten
```

**Standardparallelen — Befund G7.** Eine Kegelprojektion ohne gesetzte
Standardparallelen ist nur an einer einzigen Breite verzerrungsfrei; Afrika
bekäme oben und unten unterschiedliche Streckung, und Kinder lernten die Form
falsch. Für Deutschland ist der amtliche Schnitt bekannt und steht oben — es
ist die Projektion, in der Deutschland in jedem Schulatlas steht. Wer sie
nimmt, bekommt eine Form, die Erwachsene wiedererkennen, ohne zu wissen
warum.

**Topologie vor Vereinfachung — Befund G3.** K2 sagte nur „mapshaper:
vereinfachen" und ließ offen, worauf. Wird jedes Land für sich vereinfacht,
wird die Grenze zwischen Deutschland und Polen zweimal vereinfacht — einmal
als Teil Deutschlands, einmal als Teil Polens — und die Ergebnisse sind
**nicht identisch**. Sichtbare Lücken und Überlappungen entlang jeder
Landgrenze sind die Folge; es ist der häufigste Grund, warum selbstgemachte
Vektorkarten billig aussehen. `-combine-files` baut die Topologie über alle
Ebenen **vor** dem Vereinfachen, dann werden gemeinsame Bögen identisch
vereinfacht.

**Warum zur Bauzeit:** keine Geo-Bibliothek im Bündel (d3-geo + topojson wären
~90 KB), keine Rechenlast auf dem iPad, und die Umrisse sind
**deterministisch** — dasselbe Eingabedatum ergibt denselben Pfad, also lässt
sich die Geometrie überhaupt erst prüfen (Tor `geo`).

### 5.3a Das Gütemaß: Hausdorff in Bildpunkten, nicht Fläche in Prozent

K2 begrenzte die Vereinfachung auf **2 % Flächenabweichung**. Das ist
gebräuchlich und hier **falsch** (Befund G2): Die Fläche ist blind für
Ränder. Eine abgeschnittene Landspitze — Kap Hoorn, die Spitze Jütlands, der
Zipfel von Kaliningrad — kostet einen Bruchteil eines Prozents Fläche und ist
genau das, woran ein Kind die Form erkennt.

> **Soll: Hausdorff-Abstand ≤ 0,75 Gerätebildpunkte** bei der größten
> Darstellungsgröße der jeweiligen Stufe.

Die Hausdorff-Distanz ist die **größte** Abweichung irgendeines Punktes vom
wahren Umriss — und sie wird nicht in Metern gemessen, sondern in
Bildpunkten. Unter einem Bildpunkt sieht das Auge keinen Unterschied, darüber
sofort. Damit ist „ohne Kompromisse" eine Zahl geworden statt einer Absicht.

Dazu ein zweites Kriterium, weil Hausdorff eine sehr schmale Spitze übersieht,
wenn sie kürzer als die Toleranz ist: eine **Prägnanzpunkt-Prüfung**. Punkte
hoher Krümmung — die Ecken, die die Silhouette ausmachen — werden vor der
Vereinfachung markiert und müssen danach noch da sein.

### 5.3b Drei Auflösungsstufen je Form

Höhere Quellauflösung (5.1) und ein Geometriebudget von 150 KB gehen nicht
zusammen. Die Auflösung ist keine Abwägung, sondern eine Trennung
(Befund G6):

> Eine Form braucht nur so viele Punkte, wie die Ansicht auflösen kann, in
> der sie gerade gezeigt wird.

| Stufe | Wofür | Hausdorff-Grenze |
|---|---|---|
| **grob** | Übersicht, Vorschau, Aufkleber | ≤ 0,75 px bei 200 px Breite |
| **mittel** | Kontinent mit Ländern | ≤ 0,75 px bei 800 px Breite |
| **fein** | formatfüllend, Deutschland | ≤ 0,75 px bei 2 000 px Breite |

**Nur die grobe Stufe liegt im Startbündel.** Die feineren sind eigene
Dateien, werden beim Öffnen der Ebene geladen und danach vom Service Worker
dauerhaft vorgehalten — beim zweiten Start ist alles da, auch ohne Netz. Der
Wechsel muss unsichtbar sein: grob wird sofort gezeichnet, fein blendet in
200 ms darüber. Kein Aufblitzen, kein Sprung.

### 5.4 Bremen, das Saarland und die Ehrlichkeit der Trefferfläche

Bremen ist auf einer Deutschlandkarte bei 390 Punkten Bildbreite **kleiner
als eine Fingerkuppe**. Ein Spiel, in dem man Bremen nicht treffen kann, ist
für ein Kind kaputt, egal was die Tore sagen.

Die Lösung ist keine Lupe und kein Zoom, sondern **entkoppelte Trefferfläche**:

- Der *gezeichnete* Umriss bleibt maßstabsgetreu — die Form ist der Lerninhalt.
- Die *Trefferfläche* ist ein unsichtbarer Kreis um den Anker, mindestens
  44 × 44 Punkte (Apple HIG), bei Bedarf mit einer dünnen Leitlinie zum
  echten Gebiet.
- Überlappen sich zwei solche Kreise (Bremen/Niedersachsen,
  Berlin/Brandenburg, Hamburg/Schleswig-Holstein), gewinnt das **kleinere**
  Gebiet. Sonst kommt man an einen Stadtstaat nie heran.

Das Tor `beruehrung` misst das und schlägt an, wenn irgendein Gebiet auf
irgendeiner unterstützten Bildschirmgröße unter 44 Punkte fällt. Es muss
vorhanden sein, **bevor** Ebene 3 gebaut wird — nicht danach.

### 5.5 Klänge und Aufkleber werden erzeugt, nicht beschafft

Befund I6: In K1 waren beide fest zugesagt und hatten keine Herkunft. Bei
Towerfront ist der Bildvorrat der aufwendigste Teil des ganzen Projekts;
hier stand er als Nebensatz.

- **Klänge** kommen aus dem WebAudio-Oszillator: ein aufsteigender Dreiklang
  für „richtig", ein weicher Doppelton für „nochmal", ein kurzer Klick für
  jeden Tipp. Keine Datei, keine Lizenz, wenige hundert Byte Code — und
  jederzeit stimmbar, ohne einen Vorrat neu zu backen.
- **Aufkleber** für das Forscherbuch sind der **Umriss des Gebiets selbst**,
  in seiner Kartenfarbe, mit dem Namen darunter. Der Aufkleber für Italien
  *ist* Italien. Das kostet null zusätzliche Bildpunkte, weil die Geometrie
  ohnehin da ist — und ist didaktisch besser als jede gekaufte Sticker-Grafik.

### 5.6 Kartenfarben

Die Zugangsregel „Farbe trägt nie allein Bedeutung" (Kapitel 11) wurde in K1
für die Karte selbst nirgends eingelöst. Befund L13.

**Die Palette wird gerechnet, nicht gemischt (Befund G13).** Farben, die man
in RGB oder HSL zusammenstellt, haben **unterschiedliche wahrgenommene
Helligkeit** — ein reines Gelb wirkt viel heller als ein gleich gesättigtes
Blau. Auf einer Karte heißt das: eine Region springt einem entgegen, die
anderen treten zurück, und das Kind hält die lauteste für die wichtigste.

**OKLCH** ist so gebaut, dass `L` der wahrgenommenen Helligkeit entspricht:

```
Flächen:  L = 0.88  C = 0.055  H = 25 · 75 · 130 · 175 · 230 · 285 · 330
          → sieben Farben, exakt gleich hell, exakt gleich bunt
Ausgewählt: dieselbe Farbe mit C = 0.12        (kräftiger, nicht heller)
Richtig:    dieselbe Farbe mit L = 0.72, C = 0.15
Text:       L = 0.25 — auf allen sieben identisch lesbar
```

Der letzte Punkt ist der eigentliche Gewinn: **weil alle Flächen dieselbe
Helligkeit haben, ist derselbe Textton auf allen sieben lesbar.** Das muss
nicht siebenmal einzeln geprüft werden. OKLCH ist in Safari seit 15.4
verfügbar; beim Bauen wird zusätzlich ein sRGB-Rückfall ausgegeben.

- **Länder** innerhalb eines Kontinents: Abstufungen seines Farbtons bei
  gleichem `L`. Die Farbe trägt die Zugehörigkeit, ohne die Aufgabe zu
  verraten.
- **Bundesländer:** **vier Farbtöne** aus demselben Ring so verteilt, dass
  keine zwei Nachbarn denselben tragen — der Vier-Farben-Satz ist hier
  buchstäblich das richtige Werkzeug. Gleichfarbige Nachbarn verschmelzen
  sonst optisch zu einer Fläche.

Das Tor `lesbarkeit` misst den Kontrast **am gerenderten Bild**, nicht an den
Merkmalen, und fährt zusätzlich eine Deuteranopie-Simulation.

### 5.7 Wo der Name steht, wenn er nicht hineinpasst

„Mecklenburg-Vorpommern" passt in Mecklenburg-Vorpommern; „Bremen" passt
nicht in Bremen. In K2 war das ungelöst (Befund G10).

Die Entscheidung fällt **beim Backen**, weil dort schon der Pol der
Unzugänglichkeit gerechnet wird — und sein Abstand zum Rand ist zugleich der
Radius des größten Kreises, der ins Gebiet passt:

```
Radius × 2 ≥ Textbreite  →  Name liegt IM Gebiet
sonst                    →  Name liegt AUSSEN, mit Fahne:
                            Haarlinie vom Anker nach außen,
                            Punkt am Anker, Name am Linienende
```

Die Fahnen werden beim Backen so verteilt, dass sie sich nicht kreuzen und
nicht überlappen — auf einer festen Kartengröße, also einmal, deterministisch,
prüfbar. Kein Layoutalgorithmus zur Laufzeit.

### 5.8 Welche Inseln bleiben

`keep-shapes` verhindert, dass Flächen ganz verschwinden, aber nicht, dass die
Karte von dreitausend bedeutungslosen Felsen zugestellt wird. Eine reine
Mindestfläche ist auch falsch: Helgoland ist winzig und gehört auf eine
deutsche Karte, ein namenloses Riff vor Norwegen nicht. **Zweistufige Regel
(Befund G9):**

1. Alle Inseln, die bei der feinsten Stufe mindestens **4 × 4 Bildpunkte**
   ergeben.
2. **Plus** eine von Hand gepflegte Liste: Sizilien, Sardinien, Kreta,
   Korsika, Mallorca, Island, Sylt, Fehmarn, Rügen, Usedom, Helgoland, Föhr,
   Amrum.

Die zweite Liste ist der Punkt, an dem eine Zahl nicht mehr reicht und jemand
entscheiden muss. Genau so macht es ein Atlas.

### 5.9 Füllung, Grenze und Küste sind drei Ebenen

Ist jedes Bundesland ein Pfad mit `stroke`, wird jede Binnengrenze **zweimal**
gezeichnet — einmal von jedem Nachbarn. Bei Transparenz wird sie doppelt
dunkel; durch die Kantenglättung entstehen feine Nähte, die beim Zoomen
wandern (Befund G5).

```
<g class="grund">     eine einzige Fläche in der Grundfarbe
<g class="fuellung">  alle Gebiete, NUR fill, kein stroke
<g class="grenzen">   die gemeinsamen Bögen, EINMAL, 0,75 pt
<g class="kueste">    Außenkante, 1,5 pt
```

Die Grenzbögen fallen bei der Topologiebildung (5.3) ohnehin an — sie *sind*
die Arcs. Nebeneffekt: Küstenlinie und Binnengrenze bekommen
unterschiedliche Stärken, wie in jedem guten Atlas. Die Grundfläche ganz
unten sorgt dafür, dass die haarfeine Lücke zwischen zwei kantengeglätteten
Nachbarn nicht den Hintergrund zeigt, sondern eine unauffällige Trennfarbe.

**Drei Feinheiten für scharfe Linien auf einem 3×-Bildschirm** (Befund G8):
`vector-effect: non-scaling-stroke` auf allen Grenzen, sonst skaliert die
Strichstärke beim Zoomen mit; Mindeststärke **0,75 CSS-Punkte**, sonst wird
die Linie auf 1×-Geräten grau; und `shape-rendering` bleibt auf `auto` —
`crispEdges` klingt richtig und macht aus jeder schrägen Küste eine Treppe.

---

## 6. Die drei Eingabewege im Detail

### 6.1 Ziehen (beide Profile)

**Pointer Events, nicht HTML5-Drag-and-Drop.** Letzteres funktioniert auf iOS
Safari nicht verlässlich; das ist der klassische Fallstrick dieses Spieltyps.

```
pointerdown  auf Etikett → setPointerCapture, Etikett aus dem Fluss lösen
pointermove              → transform: translate3d(x,y,0)
                           KEIN Svelte-Zustand während der Bewegung —
                           direkt am Element. Sonst rechnet das Gerüst
                           bei jedem Finger-Ereignis das Bild neu.
pointerup                → document.elementFromPoint → nächstes Gebiet
                           mit Fangbereich (Toleranz ~30 px)
```

Weitere Notwendigkeiten, die je einen Fehlversuch kosten, wenn sie fehlen:
`touch-action: none` auf der Spielfläche (sonst scrollt die Seite mit),
`user-select: none` (sonst markiert iOS Text und zeigt die Lupe),
`-webkit-touch-callout: none` (sonst kommt das Teilen-Menü bei langem Halten).

**Für Fiona zusätzlich: das Etikett kehrt zurück, es fällt nicht.** Ein
falscher Zug lässt das Etikett sanft an seinen Platz zurückgleiten, es
verschwindet nicht und es gibt keinen roten Ton. Fehler dürfen für eine
Sechsjährige nichts kosten außer einem zweiten Versuch.

### 6.2 Sprechen (Fiona) — der größte technische Vorbehalt

**Was gebaut wird:** Web Speech API (`webkitSpeechRecognition`), Sprache
`de-DE`, ausgelöst durch Antippen eines großen Mikrofonknopfs, automatischer
Stopp nach Sprechpause.

**Der eigentliche Trick liegt nicht in der Erkennung, sondern im Abgleich.**
Eine Sechsjährige sagt nicht „Australien", sie sagt vielleicht „Austraaljen".
Die Erkennung liefert vielleicht „aus Straßen". Ein Zeichenkettenvergleich
scheitert daran — und das Kind hört „falsch", obwohl es richtig lag. Das wäre
das Ende des Sprachmodus nach drei Minuten.

Deshalb: **geschlossene Kandidatenmenge + gestufter Abgleich.** Wir wissen zu
jeder Aufgabe, welche 3 bis 7 Antworten überhaupt in Frage kommen. Damit muss
nicht erkannt werden, *was* gesagt wurde, sondern nur, *welchem der Wörter*
es am nächsten kommt:

```
1. normalisieren   Kleinschreibung, Umlaute, Leerzeichen, Füllwörter
                   ("das ist", "ich glaube", "äh")
2. Alias           gepflegte Liste je Gebiet: "Amerika"→Nordamerika,
                   "England"→Vereinigtes Königreich
3. Kölner Phonetik gleicher Klang, andere Schreibung — für Deutsch
                   deutlich besser geeignet als Soundex
4. Levenshtein     auf den phonetischen Code, Abstand relativ zur Länge
5. Abstand zum     Nur annehmen, wenn der beste Treffer deutlich besser
   Zweitbesten     ist als der zweitbeste. Sonst rückfragen.
```

Drei Ausgänge statt zwei: **angenommen** · **„Meintest du Afrika?"** (mit
Vorlesen und Ja/Nein) · **„Sag es noch einmal"**. Der mittlere ist der
wichtigste — er verwandelt eine Erkennungsschwäche in eine Bestätigungsfrage,
und die kann ein Kind beantworten.

**Das Risiko, ehrlich benannt.** `SpeechRecognition` in einer vom
Startbildschirm gestarteten iOS-App (Standalone-Modus) ist historisch
unzuverlässig gewesen; die Erkennung läuft außerdem **über Apples Server**,
braucht also Netz und ist datenschutzrelevant (Kapitel 13). Ob es auf *euren*
Geräten in *diesem* Modus zuverlässig arbeitet, ist mit keinem Dokument zu
klären, sondern nur durch Ausprobieren. **Deshalb steht das als M0 an
allererster Stelle, vor jeder Zeile Spielcode.**

Es gibt keinen Ausfall, nur eine Leiter:

| Stufe | Was |
|---|---|
| A | Web Speech API, automatische Bewertung — der Zielzustand |
| B | Aufnahme + Abspielen, **Erwachsener bestätigt** mit einem Tipp. Das Kind spricht trotzdem, der Lerneffekt bleibt; nur die Bewertung ist manuell. |
| C | Sprechen ohne Aufnahme („sag es laut!"), danach Zuordnen per Ziehen. Keine Mikrofonrechte, kein Netz nötig. |

Stufe B und C sind **kein Notbehelf**, sondern eigenständig sinnvolle
Betriebsarten — B, wenn ein Elternteil danebensitzt, C, wenn kein Netz da
ist. Sie werden ohnehin gebaut. A ist die Kür.

**Ohne Netz fällt Stufe A automatisch auf C zurück**, sichtbar und mit einem
gesprochenen Satz. Befund I5: in K1 stand „offline funktioniert vollständig"
neben „Spracherkennung braucht Netz", ohne dass jemand die Folge für Fionas
Hauptweg gezogen hatte. Das Tor `offline` prüft den Rückfall.

### 6.3 Vorlesen (Fiona, überall)

`speechSynthesis` mit deutscher Stimme, ausgelöst durch Antippen jedes
Namens. Läuft auf iOS lokal, ohne Netz, ohne Erlaubnisdialog — und ist damit
das einzige Sprachmerkmal, das immer verfügbar ist.

Zwei Fallstricke: Die Stimmenliste ist beim ersten Laden **leer** und füllt
sich erst per `voiceschanged` — wer sie sofort abfragt, bekommt nichts. Und
iOS gibt Sprachausgabe erst nach einer echten Nutzergeste frei; deshalb wird
sie beim ersten Tipp im Spiel einmal stumm angeworfen, um sie zu entsperren.

### 6.4 Tippen (Lea)

Freies Textfeld, `inputmode="text"`, `autocorrect="off"`,
`autocapitalize="off"`, `spellcheck="false"` — **die Rechtschreibung ist der
Lerninhalt, sie darf nicht vom Gerät erledigt werden.** Das ist der wichtigste
Satz dieses Abschnitts.

| Eingabe | Urteil | Rückmeldung |
|---|---|---|
| `Bayern` | richtig | Punkt, weiter |
| `bayern` | richtig, Hinweis | „Fast! Länder schreibt man groß." |
| `Bayren` | fast (Abstand 1) | Wort mit markierter Fehlstelle, zweiter Versuch, halbe Punkte |
| `Baden Württemberg` | fast | „Fast! Da fehlt ein Bindestrich." |
| `Hessen` bei Bayern | falsch | Auflösung mit Vorlesen |

`ae/oe/ue/ss` gelten als „fast" mit ausdrücklichem Hinweis, nicht als falsch —
Lea tippt auf einer Bildschirmtastatur, und die Umlaute liegen dort hinter
einem langen Halten.

Für eine Drittklässlerin ist der Bindestrich in „Baden-Württemberg" und
„Mecklenburg-Vorpommern" ein echter Lerninhalt. Die Bewertung nennt ihn
deshalb beim Namen, statt nur „falsch" zu sagen.

---

## 7. Aufgabenauswahl: Leitner, nicht Zufall

Reiner Zufall lässt ein Kind das, was es schon kann, endlos wiederholen und
das, was es nicht kann, zufällig oft. **Fünf Fächer nach Leitner**, je Profil
und je Gebiet:

```
Fach 1: kommt in jeder Sitzung        Fach 4: nach 7 Tagen
Fach 2: nach 1 Tag                    Fach 5: nach 21 Tagen — gilt als gekonnt
Fach 3: nach 3 Tagen
richtig → ein Fach hoch · falsch → zurück auf Fach 1
```

Eine Sitzung mischt: 70 % fällige Karten, 20 % neue, 10 % gekonnte zur
Auffrischung. Nie mehr als zwei schwere Aufgaben hintereinander — ein Kind,
das dreimal nacheinander scheitert, hört auf zu spielen, und dann nützt die
beste Wiederholungslogik nichts.

**Die Auswahl ist deterministisch mit gesetztem Zufallskeim.** Damit ist sie
prüfbar: gleicher Fortschritt + gleicher Keim = gleiche Aufgabenfolge. Ohne
das lässt sich die Lernlogik nur behaupten, nicht beweisen.

*Offen und ehrlich: Acht Aufgaben je Sitzung für Fiona sind geraten, nicht
gemessen. Die Zahl wird nach der Gerätesichtung zu M3 nachgezogen.*

---

## 8. Leistung — Budgets, nicht Absichten

Eine Leistungsangabe ohne Messstelle ist keine. Messgerät: **iPad
(Zielgerät)**, kalter Start, WLAN, aus dem Startbildschirm-Symbol heraus.

| Größe | Grenze | Wie geprüft |
|---|---|---|
| **Startbündel** gesamt, gzip | **< 400 KB** | Tor `budget`, bricht die Kette |
| davon Geometrie (nur grobe Stufe) | < 90 KB | Tor `budget` |
| davon Schriften (zwei, beschnitten) | < 60 KB | Tor `budget` |
| **Nachladbar je Ebene** (mittel/fein) | < 250 KB | Tor `budget` |
| Geometrie gesamt über alle Stufen | **2,0 MB, gemessen** (siehe `Lernkiste-STAND.md`) | M2 gelaufen |
| Erstes Bild, kalt | < 1,5 s | Playwright + Lighthouse in CI |
| Ebene erstmalig öffnen, mit Netz | < 800 ms bis zur feinen Stufe | Tor `browser` |
| Ebene öffnen, danach | < 100 ms | Tor `offline` |
| Start, zweites Mal (offline) | < 0,5 s | Tor `offline` |
| Ziehen | 60 Bilder/s durchgehend | Tor `browser`, Bilddauern gemessen |
| Antwort auf Tipp | < 100 ms | Tor `browser` |
| Sprache: Tipp bis Urteil | < 2,5 s | von Hand, M4, auf dem Gerät |

**Wo die Bilder pro Sekunde tatsächlich verloren gehen** — nicht raten,
sondern von vornherein vermeiden:

1. Zustandsänderung während `pointermove`. Deshalb 6.1: direkt am Element.
2. `filter: drop-shadow` auf einem SVG-Pfad mit 3000 Punkten. Schatten werden
   gebacken oder weggelassen.
3. Alle 16 Bundesländer gleichzeitig neu einfärben, weil ein Etikett schwebt.
   Stattdessen: eine CSS-Klasse am Elternelement, das Einfärben macht der
   Stil.
4. Sehr lange `d`-Attribute im DOM anfassen. Sie werden einmal gesetzt und nie
   wieder — Zustände laufen ausschließlich über Klassen und `transform`.

**Nachgemessen in M2** (`Lernkiste-STAND.md`): das Startbündel braucht nur
`kontinente.grob` mit **29,7 KB** — ein Drittel der 90-KB-Grenze. Zwei feine
Stufen liegen über 250 KB (Asien 268, Nordamerika 253); beide werden auf
Ebene 2 aber nur in der mittleren Stufe gezeigt.

**Das Budget ist geteilt, seit die Karten feiner geworden sind** (Kapitel
5.3b). Das Startbündel bleibt bei 400 KB und enthält nur die grobe Stufe;
die feinen Stufen werden beim Öffnen einer Ebene geladen und danach dauerhaft
vorgehalten. Die Zahl „600–900 KB" ist **geschätzt, nicht gemessen** — sie
hängt daran, wie viele Punkte VG250 nach der Topologievereinfachung behält.
Der erste Pipelinelauf in M2 liefert den echten Wert; liegt er deutlich
darüber, ist die Antwort eine vierte, gröbere Stufe — nicht eine niedrigere
Genauigkeit.

**Der einzige Kompromiss, der bleibt:** Beim allerersten Öffnen einer Ebene
wird kurz nachgeladen. Danach nie wieder.

**Die Zahlen aus der CI sind keine Gerätezahlen.** Dort läuft Chromium ohne
Grafikkarte, nicht Safari auf iOS. Sie taugen als Ratsche („nicht schlechter
als gestern"), nicht als Aussage über das iPad. Diese Unterscheidung hat
Towerfront fünf Runden gekostet; hier steht sie von Anfang an — und sie hat
eine Folge, siehe Kapitel 12.

---

## 9. Profile, Fortschritt, Motivation

### 9.1 Profile

Zwei Profile, in einem Tippen erreichbar (großes Bild, großer Name — kein
Anmelden, kein Passwort). Ein Profil ist ein Datensatz aus
**Fähigkeitsschaltern**, nicht ein Sonderfall im Code:

```ts
{
  id: 'fiona',
  name: 'Fiona',
  eingabewege: ['ziehen', 'sprechen'],
  vorlesenImmer: true,
  kandidatenMax: 4,          // wieviel gleichzeitig zur Wahl steht
  laenderTiefe: 3,           // die drei statt der fünf größten (4.2)
  sitzungLaenge: 8,          // Aufgaben — noch nicht gemessen
  rechtschreibungStreng: false,
  ebenenFrei: [1, 2, 3, 4],  // alle. Die Dosierung steuert, nicht die Sperre.
}
```

**Alle vier Ebenen sind für beide offen.** In K1 hatte Fiona Ebene 2 gesperrt,
ohne Begründung (Befund I4) — Ebene 2 ist nicht schwerer als Ebene 3, sie hat
nur mehr Gegenstände, und dafür gibt es `kandidatenMax` und `laenderTiefe`.

Ein drittes Kind, ein Gastprofil, eine Erwachsenenrunde: ein Datensatz mehr.

### 9.2 Fortschritt sieht für beide anders aus

Fiona misst **Wiedererkennen und Aussprache**, Lea misst **Vollständigkeit und
Rechtschreibung**. Beide Balken heißen „geschafft", zählen aber Verschiedenes.

Und: **die Profile werden nie miteinander verglichen.** Kein
Bestenlistenbildschirm, keine gemeinsame Punktzahl. Zwei Schwestern mit zwei
Jahren Abstand brauchen kein Werkzeug, das ihnen täglich vorrechnet, wer
weiter ist.

### 9.3 Der Bildschirmablauf

In K1 waren die Bildschirme benannt, aber nicht verbunden (Befund L12) — und
der Zurückweg ist bei einer Sechsjährigen keine Kleinigkeit: sie verlässt
jeden Bildschirm mehrmals versehentlich.

```
   Profilwahl
       ↓
   Ebenenwahl ──────────────┬──→ Forscherbuch (Sammlung)
       ↓                     └──→ Elternbereich (PIN)
   Aufgabe  ⟳ (Sitzung)
       ↓
   Ergebnis ──→ nochmal | zurück zur Ebenenwahl
```

Zwei Regeln:

- **Ein Zurück, immer an derselben Stelle**, groß, links oben, mit Symbol
  *und* Wort. Nie ein Wisch, nie eine Geste — beides löst ein Kind
  versehentlich aus und findet es nicht absichtlich.
- **Sichtbarkeit wird abgeleitet, nicht geschaltet.** Ob die Spielbedienung zu
  sehen ist, ergibt sich in jedem Bild aus dem aktuellen Bildschirm. Es gibt
  keine Stelle, an der man es vergessen kann. Towerfront hat diese Regel
  zweimal gebrochen, bevor sie eine Ableitung wurde.

### 9.4 Motivation ohne Druck

- **Sterne** je Sitzung (1–3), nie null.
- **Sammlung:** je gemeistertem Gebiet ein Aufkleber im „Forscherbuch" — der
  Umriss des Gebiets selbst (5.5). Sichtbarer Fortschritt, der bleibt.
- **Kein Zeitdruck.** Keine Uhr, kein Countdown. Zeit wird gemessen (fürs
  Protokoll), aber nie angezeigt und nie bewertet.
- **Keine Leben, kein Verlieren.** Eine Sitzung endet immer gut.
- **Klänge**, kurz und freundlich, mit Ausschalter. Wichtig: ein
  *falsch*-Klang darf nicht wie ein Fehler klingen, sondern wie ein „hm,
  nochmal".

---

## 10. Gestaltung

Das Kapitel, das K2 nicht hatte. Es steht vor der Barrierefreiheit, weil die
Merkmale, die es festlegt, dort gemessen werden.

### 10.1 Warum das aufgeschrieben werden muss

K2 nannte zwei Zahlen — 44 Punkte Trefferfläche, 20 Punkte Schriftgröße — und
sonst nichts. Ohne festgelegte Skalen entsteht bei jedem Bildschirm ein neuer
Abstand, ein neuer Radius, ein neuer Grauton. Das Ergebnis wirkt unruhig,
ohne dass jemand sagen könnte, woran es liegt. Befund G11.

### 10.2 Das Referenzsoll

Drei Vorbilder, aufgeschrieben nach dem, was sie **tun** — nicht nach dem,
wie sie aussehen. Vollständig im Grafik-Audit, hier das abgeleitete Soll:

| | Soll |
|---|---|
| Palette | höchstens **7 Flächenfarben + 1 Akzent + 1 Warnfarbe**, alle mit gleicher wahrgenommener Helligkeit |
| Umrisse | generalisiert nach Form, nicht nach Zahl; jede Ecke, die die Silhouette ausmacht, bleibt |
| Grenzen | **eine** Linie zwischen zwei Ländern, nie zwei |
| Bewegung | jeder Zustandswechsel hat benannte Dauer und Kurve; nichts springt |
| Belohnung | ein choreografierter Ablauf unter 900 ms, der den Lerninhalt wiederholt |
| Schrift | zwei Schnitte, nicht drei; die Leseschrift nur dort, wo das Kind liest |
| Zierrat | keiner. Kein Verlauf, kein Schlagschatten, kein Glanz |

Der wichtigste Satz daraus, aus *Pok Pok* abgeleitet: **Zurückhaltung ist der
Unterschied zwischen hochwertig und niedlich.**

### 10.3 Die Merkmale

Eine Datei, `src/marken/`. Sie ist die **einzige** Stelle im ganzen Programm,
an der ein Zahlenwert für Farbe, Abstand, Radius oder Dauer steht.

```
raster    4 pt. ALLE Abstände sind Vielfache:
          4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96
radien    8 (klein) · 16 (Karten) · 24 (Flächen) · voll (Knöpfe)
schrift   Grundgröße 20, Verhältnis 1,25:
          16 (nur Elternbereich) · 20 · 25 · 31 · 39 · 49 · 61
strich    0,75 · 1,5 · 3 (Küste)
farbe     OKLCH, siehe Kapitel 5.6
tiefe     3 Stufen als versetzte Fläche (10.5), nie als Filter
dauer     120 (Tippantwort) · 200 (Zustand) · 320 (Bildschirm)
          · 500 (Belohnung)
kurve     standard  cubic-bezier(.2, 0, 0, 1)
          feder     linear(…)   — siehe 10.4
```

Das Tor `marken` setzt es durch: kein Farb-, Abstands-, Radius- oder
Dauerwert außerhalb dieser Datei.

### 10.4 Bewegung — hier wird „hochwertig" entschieden

Befund G14, der mit der größten Wirkung auf den Eindruck. Eine App fühlt
sich teuer an, wenn Dinge Gewicht haben, und billig, wenn Dinge springen.

| Moment | Dauer | Was passiert |
|---|---|---|
| **Aufnehmen** | 120 ms | Etikett wächst auf 1,06; die Schattenfläche darunter rutscht von 2 auf 6 Punkt Versatz. Es *hebt ab*. |
| **Ziehen** | — | 1 : 1 am Finger, **kein** Nachlauf. Kinder erwarten das Etikett unter dem Finger, nicht dahinter. |
| **Einrasten, richtig** | 500 ms | Federkurve ins Ziel. Gleichzeitig **zeichnet sich der Umriss des Gebiets in 400 ms selbst nach**, dann läuft die Füllfarbe vom Ablegepunkt aus ein. |
| **Zurückkehren, falsch** | 320 ms | Bogen zurück auf den Platz. Kein Ruck, kein Rot, kein Rütteln. |
| **Bildschirmwechsel** | 320 ms | Gemeinsame Elemente bleiben stehen und wandern, der Rest blendet. |

**Der dritte Moment ist der wichtigste und fast umsonst zu haben.** Das
Nachzeichnen des Umrisses ist eine Animation von `stroke-dashoffset` auf einem
Pfad, den es ohnehin gibt — und **der Belohnungsmoment wiederholt damit den
Lerninhalt**: das Kind sieht die Form, die es gerade benannt hat, noch einmal
entstehen.

Drei technische Regeln:

- Animiert werden **nur `transform` und `opacity`** (plus `stroke-dashoffset`,
  das ebenfalls kein Layout anfasst). Nie `width`, `top`, `margin`.
- Die Federkurve kommt aus **CSS `linear()`** — echtes Federverhalten ohne
  eine Zeile JavaScript. Verfügbar ab **Safari 17.2**; darunter greift ein
  `cubic-bezier`-Rückfall, der etwas weniger schwingt. Kein Bruch, nur
  weniger Charme.
- **`prefers-reduced-motion`** setzt alle Bewegung auf 1 ms und ersetzt sie
  durch eine Überblendung. Die Belohnung bleibt, sie federt nur nicht.

### 10.5 Tiefe ohne Filter

K2 untersagt `filter: drop-shadow` auf Kartenpfaden — richtig, das kostet auf
einem iPad zweistellige Millisekunden je Bild. Es benannte aber keinen Ersatz,
und flache Flächen ohne Staffelung sehen unfertig aus. Befund G15.

**Ersatz: die versetzte Fläche.** Derselbe Pfad, zwei bis sechs Punkte nach
unten versetzt, in einer dunkleren Abstufung derselben Farbe, dahinter
gezeichnet. Kein Filter, keine Unschärfe, kein Rechenaufwand — und beim
Aufnehmen eines Etiketts wird der Versatz animiert, was das Anheben erzeugt.

Für rechteckige Flächen (Knöpfe, Karten) reicht ein weicher `box-shadow`; der
ist billig, weil das Element rechteckig ist. Verboten bleibt der Filter auf
komplexen Pfaden.

### 10.6 Zwischenzustände

Eine hochwertige App zeigt nie eine leere Fläche und nie einen Sprung. In K2
stand dazu kein Satz. Befund G16.

| Zustand | Was zu sehen ist |
|---|---|
| Erster Aufbau | Der Umriss wird als Haarlinie gezeichnet, bevor die Füllung da ist — der Bildschirm ist nie leer, und es sieht nach Absicht aus |
| Stufenwechsel (5.3b) | grob sofort, fein blendet in 200 ms darüber |
| Sprachaufnahme läuft | ein ruhiger, atmender Ring um den Mikrofonknopf — keine zappelnde Pegelanzeige |
| Erkennung rechnet | höchstens 2,5 s; in dieser Zeit eine Anzeige, die nicht nach Fehler aussieht |
| Kein Netz | ein ruhiger Streifen, kein Warnschild. Das Spiel läuft ja |
| Fehler | gibt es für das Kind nicht. Alles wird zu „nochmal" oder zu einem Rückfall |

### 10.7 Dunkelmodus — eine Entscheidung, keine Auslassung

Karten vertragen eine naive Umkehrung schlecht: aus hellen Landflächen werden
dunkle Löcher, die Beschriftung verliert ihren Halt, und die sorgfältig gleich
hellen Flächen aus 5.6 stimmen nicht mehr. Befund G18.

**Ein einziges, sehr sorgfältig gemachtes helles Thema** — plus einen
**Abendmodus, der die Gesamthelligkeit senkt** statt die Farben umzukehren.
In OKLCH ist das ein Griff: alle `L` um einen festen Betrag herunter. Das ist
ehrlicher als ein schlechter Dunkelmodus und für ein Kind, das abends spielt,
das eigentlich Gewünschte.

### 10.8 App-Symbol und Startbild

Sie sind kein Nebenprodukt eines Werkzeugs (Befund G19). Das Symbol ist das
**erste**, was von der App zu sehen ist, und auf einem Startbildschirm steht
es neben Symbolen, die von Gestaltungsabteilungen gemacht wurden.

Von Hand entworfen, nicht generiert: eine einzelne, sofort erkennbare Form auf
einer ruhigen Fläche — kein Text, kein Verlauf, kein Schlagschatten (iOS legt
seine eigene Maske darüber). Das Startbild zeigt dieselbe Form auf demselben
Grund, damit der Übergang vom Tippen zum Start nahtlos wirkt.

---

## 11. Barrierefreiheit und kindgerechte Bedienung

Für Sechsjährige ist Barrierefreiheit keine Zusatzfunktion, sondern die
Grundbedienung.

| Regel | Grenze | Tor |
|---|---|---|
| Trefferflächen | ≥ 44 × 44 pt, ≥ 8 pt Abstand | `beruehrung` |
| Schriftgröße | ≥ 20 px, im Fiona-Profil ≥ 24 px | `lesbarkeit` |
| Kontrast Text | ≥ 4,5 : 1 (WCAG AA) | `lesbarkeit` |
| Kontrast benachbarter Flächen | messbar unterschiedlich, auch bei Deuteranopie | `lesbarkeit` |
| Farbe allein trägt nie Bedeutung | zusätzlich Form, Bewegung, Klang | von Hand |
| Jeder Text vorlesbar | ausnahmslos | `vorlesen` |
| Quer- und Hochformat | beide benutzbar, keine Drehsperre | `browser` |
| Bewegung reduzierbar | `prefers-reduced-motion` respektiert | `browser` |

**Die Schrift ist Teil der Barrierefreiheit, nicht der Gestaltung.** In der
1. Klasse lernt Fiona bestimmte Buchstabenformen. Die meisten
Standardschriften setzen ein **zweistöckiges „a"** und ein **„g" mit
Unterschlinge** — beides sieht anders aus als das, was sie gerade schreiben
lernt. Befund L5.

**Aber zwei Schriften, nicht eine** (Befund G12). K2 setzte *alles* in
Andika. Andika ist hervorragend für das, wofür sie gemacht ist: einzelne
Wörter, die ein Leseanfänger entziffert. Für Knöpfe, Überschriften, Zahlen
und den Elternbereich ist sie schwach — wenige Schnitte, weites Bild, wenig
Charakter. Eine App, die durchgehend in einer Lernschrift gesetzt ist, sieht
nach Arbeitsblatt aus, nicht nach Produkt.

| Wo | Schrift |
|---|---|
| Wörter, die das Kind **liest oder lernt** — Etiketten, Namen, Auflösungen | **Andika** |
| alles andere — Knöpfe, Überschriften, Zahlen, Elternbereich | **eine gut gezeichnete Grotesk** |

Vorschlag für die zweite: **Plus Jakarta Sans** (offene Lizenz, sehr sauber
gezeichnet, vollständige deutsche Zeichen). Wärmere Alternative: **Nunito**,
verbreiteter in Kinder-Apps und dadurch etwas gewöhnlicher. **Das ist eine
Entscheidung, die man ansehen muss, nicht lesen** — sie fällt in MG
(Kapitel 16), mit beiden Varianten nebeneinander auf dem echten Gerät.

Beide werden **mitgeliefert und auf die gebrauchten Zeichen beschnitten** —
deutsche Buchstaben, Ziffern, eine Handvoll Satzzeichen: je Schnitt etwa
15–25 KB statt 120 KB. Kein CDN; sonst wären sie die einzige ausgehende
Verbindung im ganzen Programm (Kapitel 13).

**Und keine Emoji** (Befund G17). Sie sehen auf jedem Gerät anders aus, folgen
keiner Strichstärke, lassen sich nicht einfärben. Stattdessen ein eigener
Symbolsatz auf einem 24er Raster, eine Strichstärke, gerundete Enden, als
Inline-SVG — etwa fünfzehn Zeichen. Das Tor `marken` verbietet Emoji in
Oberflächentexten.

Zwei Punkte, die man leicht übersieht: **Rot-Grün** taugt bei einem
Besuchskind nicht als einziges Signal — richtig und falsch unterscheiden sich
hier immer auch in Form und Ton. Und **Linkshänder**: die Etikettenliste muss
auf die andere Seite umschaltbar sein, sonst verdeckt die ziehende Hand genau
das Gebiet, auf das sie zielt.

---

## 12. Prüfbarkeit — die Torkette

Übernommen aus Towerfront, weil es dort funktioniert hat: **eine Kette, die
vor jedem Einchecken grün sein muss, und die die Auslieferung blockiert.**

```
tsc → lint → inhalt → geo → topologie → lizenz → marken → vergleich
    → einheit → beruehrung → lesbarkeit → vorlesen → budget → csp
    → bild → ansicht → browser → pwa → offline → doku → proben → bericht
```

**Zweiundzwanzig Schritte.** In K1 waren es siebzehn, während der Text an
anderer Stelle ein CSP-Tor und einen Gegenprobenlauf forderte, die nicht in
der Kette standen (Befund I3) — wortwörtlich der Fehler, vor dem Towerfronts
eigener Auslieferungsplan im Kommentar warnt. K2 hatte neunzehn; das
Grafik-Audit hat drei weitere ergeben (`topologie`, `marken`, `ansicht`).
Deshalb **zählt `doku` die Torschritte gegen die Zahl in diesem Absatz.**

**Die Tore, die hier den Unterschied machen:**

**`inhalt`** — Zod über alle Daten. Jede ID einmalig. Jedes Gebiet hat einen
Namen, mindestens einen Alias, mindestens eine Aussprachevariante, einen
Elternknoten, der existiert, und einen Datenstand jünger als drei Jahre. Kein
Flächen-Gebiet ohne Geometrie, kein Punkt-Gebiet ohne Ziel. Jedes Gebiet auf
Ebene 4 hat mindestens einen Ablenker, die fünf Fallen aus 4.4 namentlich den
richtigen. **Die Gebiete werden gezählt und die Summe gegen Kapitel 4.5
geprüft** — damit fällt auf, wenn beim Umbau eins verlorengeht.

**`geo`** — Außenring positiv orientiert, jedes Loch negativ; der Anker liegt
nachweislich *im* Gebiet (Punkt-in-Polygon **mit Löchern**, nicht Schwerpunkt)
und im **größten** Teil; jede Klippkante aus 5.2 ist gesetzt; und die
Vereinfachung hält je Stufe den **Hausdorff-Abstand ≤ 0,75 Bildpunkte** ein
(5.3a) — nicht mehr 2 % Fläche, weil die Fläche für abgeschnittene
Landspitzen blind ist. Zusätzlich: alle Prägnanzpunkte sind erhalten.

**`topologie`** — neu. Gemeinsame Grenzen zweier Nachbarn sind derselbe Bogen,
Bildpunkt für Bildpunkt; keine Lücken, keine Überlappungen, keine
Selbstschnitte; und die **erwarteten Teile und Löcher sind da**: Bremen hat
zwei Teile, Brandenburg hat das Loch Berlin, Niedersachsen das Loch Bremen.
Ohne dieses Tor wandert eine Lücke beim nächsten Datenstand still zurück.

**`marken`** — neu. Kein Farb-, Abstands-, Radius- oder Dauerwert außerhalb
von `src/marken/`. Keine Emoji in Oberflächentexten. Kein `filter` auf
Kartenpfaden. Keine Animation auf Layouteigenschaften. Vier Regeln, die
verhindern, dass die Gestaltung sich stillschweigend auflöst.

**`ansicht`** — neu, Befund G20, und der wichtigste Zuwachs. Bei jedem Lauf werden alle
Bildschirme und alle Karten in festen Größen aufgenommen und **Bildpunkt für
Bildpunkt** gegen freigegebene Vorbilder verglichen. Jede unbeabsichtigte
Veränderung bricht die Kette.

Damit das trägt, muss die Aufnahme deterministisch sein: Zufallskeim gesetzt,
Bewegung aus, Schriften vollständig geladen (`document.fonts.ready`
abgewartet), feste Gerätepunktdichte, feste Fenstergrößen, Datum eingefroren,
Fortschrittsstand fest vorgegeben.

Die Vorbilder liegen im Repository. Wer etwas absichtlich ändert, erneuert sie
im selben Commit — dann steht die Veränderung **im Diff und ist zu sehen**.
Das ist der Punkt: Gestaltungsänderungen werden überprüfbar wie Code.
*Ehrlich dazu, in der Linie von Befund L4:* die Vorbilder entstehen in
Chromium. Das Tor findet **Veränderungen**, nicht **iOS-Richtigkeit**.

**`vergleich`** — der wichtigste, und der einzige, der in K1 sich selbst
gemessen hat (Befund L10). Wer den Prüfkorpus schreibt und gleichzeitig den
Abgleich einstellt, ist Prüfling und Prüfer zugleich. Deshalb **zwei
Hälften**:

| Hälfte | Herkunft | Wozu |
|---|---|---|
| erfunden | von Hand geschrieben | zum Einstellen des Abgleichs |
| **eingefroren** | **echte Aufnahmen von Fiona** (M4) | wird erst *nach* dem Einstellen gefahren und **nie** zum Nachjustieren benutzt |

Gemessen wird auf beiden Hälften Trefferquote **und Falsch-Positiv-Rate**.
Ohne die zweite Zahl ist die Prüfung wertlos: ein Abgleich, der alles annimmt,
hat 100 % Trefferquote und lehrt nichts. Zielband: Treffer ≥ 90 %,
Falsch-Positiv ≤ 2 % — **aber gültig erst auf der eingefrorenen Hälfte, also
frühestens ab M4.** Bis dahin gilt keine Zahl.

```
Treffer:      "austraaljen", "austraalien", "australiä"   → Australien ✓
Nichttreffer: "afrika", "asien", "österreich"             → Australien ✗
```

**`browser`** — Playwright, **Chromium mit iPhone- und iPad-Emulation. Das ist
nicht Safari und nicht iOS.** In K1 stand „iPhone quer, iPhone hoch, iPad",
was sich wie eine Gerätemessung liest (Befund L4). Was das Tor wirklich
leistet: es zieht ein Etikett mit echten Pointer-Events über den Bildschirm
und prüft, ob es ankommt; es prüft den Weg von der Profilwahl bis zur ersten
richtigen Antwort; es prüft Überdeckungen und gerechnete Knopfgrößen. Es ist
das einzige Tor, das das Spiel wirklich *spielt* — und trotzdem nie auf dem
Gerät, auf dem geurteilt wird.

**`csp`** — die Inhaltssicherheitsrichtlinie steht im ausgelieferten HTML und
erlaubt keine fremde Herkunft. Neu in K2.

**`pwa` / `offline`** — Manifest gültig, Symbole in allen Größen,
`apple-touch-icon` gesetzt, **alle Pfade gegen `base` geprüft** (Kapitel 14),
Service Worker registriert; zweiter Start ohne Netz funktioniert vollständig,
und der Sprachmodus fällt sichtbar auf Stufe C zurück.

**`doku`** — die Fassungsnummer in diesem Dokument gegen die im Code, und die
Torzahl gegen die Kette.

**`proben`** — Gegenproben. Jedes Tor bekommt mindestens eine eingebaute
Fehlerinjektion, die es fangen *muss*. Und jede Probe prüft zuerst, ob ihr
Eingriff überhaupt angekommen ist — in Towerfront sind drei von zehn genau
daran gescheitert, und ein nicht angekommener Eingriff sieht aus wie ein
bestandenes Tor.

### Was kein Tor leistet

> **Kein Tor läuft auf iOS.** Deshalb ist die Gerätesichtung Teil jeder
> Abnahme — bei M0, MG, M3, M4, M5 und M6 steht sie ausdrücklich im
> Abnahmekriterium.

Und kein Tor sagt, ob die Palette angenehm ist, ob die Federkurve sich richtig
anfühlt, ob das Symbol neben den anderen auf dem Startbildschirm besteht, ob
Fiona den Belohnungsmoment schön findet, ob Lea nach zwei Wochen noch spielt.

Dafür bleibt: hinsetzen, ansehen, nichts sagen. Und bei **jeder**
Geometrieänderung die acht **Prüfformen** von Hand anschauen — die acht
schwersten Fälle, an denen sich entscheidet, ob die Karten gut sind:

> **Norwegen** (Fjorde) · **Griechenland** (Inseln) · **Chile** (Südspitze) ·
> **Dänemark** (Jütland und Inseln) · **Italien** (Stiefel und Sizilien) ·
> **Schleswig-Holstein** (Wattenmeer, Fehmarn, Sylt) · **Brandenburg** (Loch
> Berlin) · **Bremen** (zwei getrennte Teile)

Wenn diese acht stimmen, stimmt der Rest. Elf von 57 Befunden kamen in
Towerfront aus genau solchem Hinsehen.

---

## 13. Audit-Fähigkeit

Drei verschiedene Dinge tragen diesen Namen. Alle drei sind gemeint.

### 13.1 Lern-Audit — was die Kinder tatsächlich können

Jede Antwort erzeugt einen unveränderlichen Eintrag:

```ts
{
  zeit, profil, modul, ebene, gebietId,
  eingabeart: 'ziehen' | 'sprechen' | 'tippen',
  ergebnis: 'richtig' | 'fast' | 'falsch',
  roheingabe: string,      // was wirklich ankam — "aus straßen"
  sicherheit: number,      // beim Sprechen
  dauerMs, versuch, leitnerFachVorher, leitnerFachNachher
}
```

**`roheingabe` ist der wertvollste Teil.** Nach zwei Wochen steht dort
schwarz auf weiß, wie das Erkennungssystem Fionas Aussprache tatsächlich
hört — und daraus wächst die eingefrorene Korpushälfte aus Kapitel 12 mit
echten Daten statt mit Vermutungen. Das ist der Rückkanal, der den
Sprachmodus über die Zeit besser macht.

**Elternbereich**, hinter einer vierstelligen PIN — nicht gegen Angreifer,
gegen neugierige Achtjährige; sie liegt unverschlüsselt in der Ablage und ist
eine Türklinke, kein Schloss:

- Trefferquote je Gebiet, farbig, sofort lesbar
- „Wackelkandidaten": die fünf Gebiete mit den meisten Fehlversuchen
- Verlauf über Wochen, je Profil
- **Ausspracheliste**: was gesagt wurde vs. was verstanden wurde
- Ausfuhr als CSV und JSON, ein Tipp
- **Löschen**: alles zu einem Profil, unwiderruflich, ein Tipp
- Herkunft der Karten (Lizenz-Namensnennung, Kapitel 5.1)

### 13.2 Technisches Audit — welche Fassung läuft hier eigentlich?

Der Klassiker bei Startbildschirm-Apps: das iPad zeigt seit sechs Wochen eine
alte Fassung und niemand merkt es. Dagegen:

- Jeder Bau stempelt **Commit-SHA, Bauzeitpunkt und Fassungsnummer** ins
  Bündel; der Elternbereich zeigt sie an. „Welche Fassung läuft?" ist damit in
  fünf Sekunden beantwortbar, auf dem Gerät selbst.
- Der Service Worker aktualisiert von allein (`autoUpdate`) und zeigt beim
  Fund einer neuen Fassung einen Streifen: „Neue Fassung — jetzt laden".
- **Auf dem Startbildschirm gibt es keinen Aktualisieren-Knopf im Browser.**
  Ohne diesen Mechanismus gibt es *keinen* Weg, eine hängende Fassung
  loszuwerden, außer das Symbol zu löschen und neu anzulegen. Deshalb ist er
  kein Beiwerk, sondern ein Tor.
- Jeder CI-Lauf hinterlegt seinen Torbericht als Artefakt. „War die Kette
  grün, als das ausgeliefert wurde?" ist nachträglich beantwortbar.

**Speicherbeständigkeit.** Beim ersten Start wird
`navigator.storage.persist()` angefordert (Befund L6). Das senkt die
Wahrscheinlichkeit, dass das System die Ablage räumt — es garantiert sie
nicht, und die Anforderung kann abgelehnt werden. Ob sie auf euren Geräten
greift, misst M0. Der Elternbereich zeigt den Zustand an, und die Ausfuhr
bleibt die Rückfallebene.

### 13.3 Datenschutz-Audit — was verlässt das Gerät

| Was | Wohin | Wann |
|---|---|---|
| Fortschritt, Protokoll, Profile | **nirgendwohin** — IndexedDB, lokal | nie |
| Programm, Karten, Schrift | von GitHub Pages **her**, nicht hin | beim Aktualisieren |
| **Sprachaufnahme** | **Apple** (Web Speech API) | nur bei aktivem Sprachmodus und gedrücktem Knopf |
| Nutzungsdaten, Telemetrie, Werbung | — | **gibt es nicht** |

Kein Konto, keine Anmeldung, kein Cookie, keine fremde Schriftart, kein CDN,
kein Analysewerkzeug.

**Was die CSP leistet — und was nicht.** Die Inhaltssicherheitsrichtlinie
schließt aus, dass das Programm Fremdressourcen nachlädt, Telemetrie sendet
oder eine fremde Herkunft anspricht; der Browser setzt das durch, es ist keine
bloße Absicht. **Sie erfasst die Web Speech API aber nicht.** Die ist kein
Nachladen, sondern eine Browserfunktion, die auf iOS intern mit Apples
Servern spricht — die CSP kann den Audio-Upload weder sehen noch verhindern.

In K1 stand die CSP als Beleg für „nichts verlässt das Gerät", unmittelbar
über der Tabelle, in der als einzige Ausnahme genau die Sache stand, die sie
nicht abdeckt (Befund F5). Für den Sprach-Upload gibt es genau eine wirksame
Maßnahme, und die ist kein technischer Riegel, sondern ein Schalter:

> **Der Sprachmodus ist per Vorgabe aus.** Er wird im Elternbereich mit einem
> Satz eingeschaltet, der sagt, wohin die Aufnahme geht. Das Mikrofon läuft
> nur, solange der Knopf gedrückt ist; ein roter Punkt zeigt sichtbar an,
> wenn es hört. Nie Dauerlauschen, nie Schlüsselwort-Erkennung.

**Bei öffentlich erreichbarer Seite** (Kapitel 14.2) können fremde Kinder das
Spiel benutzen; dann ist die Freigabe nicht mehr eine Entscheidung *dieser*
Eltern. Derselbe Satz erscheint deshalb zusätzlich beim ersten Start. Das
kostet nichts und ist unabhängig von der Entscheidung öffentlich/privat
richtig. Befund L11.

---

## 14. Auslieferung

### 14.1 Der Weg von hier auf das iPad

```
git push  →  GitHub Actions
                ├── npm ci
                ├── Torkette   ← rot: hier ist Schluss
                ├── vite build (+ PWA-Erzeugung)
                └── deploy-pages
                        ↓
             https://<konto>.github.io/lernkiste/
                        ↓
             iPad: Symbol antippen → Service Worker
                   prüft im Hintergrund → neue Fassung
```

Ein Push, drei bis vier Minuten, das iPad hat es beim nächsten Start.

### 14.2 Was einzurichten ist (einmalig, durch euch)

1. **Repository anlegen** — Vorschlag: `lernkiste`, **öffentlich**
   (entschieden, O4). Damit ist GitHub Pages kostenlos nutzbar.
2. **Pages einschalten**: Settings → Pages → Source = **GitHub Actions**.
3. Mir Schreibrecht auf dem Zweig geben. Dann läuft alles Weitere von hier.

Kein Geheimnis, kein Zugriffsschlüssel, kein Fremddienst.

### 14.3 Der Unterpfad ist der häufigste Grund, warum es beim ersten Mal nicht läuft

Die Seite liegt unter `/lernkiste/`, nicht auf der Wurzel. Befund L3 — in K1
fehlte das vollständig.

```ts
// vite.config.ts
base: '/lernkiste/',
```

Und alles, was mitziehen muss:

| Ding | Wert |
|---|---|
| `manifest.start_url` | `/lernkiste/` |
| `manifest.scope` | `/lernkiste/` |
| Service-Worker-Reichweite | `/lernkiste/` |
| `apple-touch-icon` | relativ, nicht `/icon.png` |
| Navigations-Rückfall offline | `/lernkiste/index.html` |

Stimmt `base` nicht, bleibt die App weiß. Stimmt `scope` nicht, startet das
Symbol vom Startbildschirm in Safari statt im Vollbild. Stimmt der
Navigationsrückfall nicht, ist die App offline leer. Drei verschiedene
Fehlerbilder, eine Ursache — deshalb prüft das Tor `pwa` alle fünf Zeilen
gegen `base`.

### 14.4 Das Symbol auf dem Startbildschirm

```html
<link rel="apple-touch-icon" href="icon-180.png">   <!-- 180×180, ohne Alpha -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Lernkiste">
<meta name="viewport" content="...,viewport-fit=cover,user-scalable=no">
<link rel="manifest" href="manifest.webmanifest">
```

Dazu `apple-touch-startup-image` in allen Gerätegrößen — sonst blitzt beim
Start eine weiße Fläche. Towerfront hat dafür bereits ein Werkzeug
(`npm run appsymbol`), das hier übernommen wird.

**Der Weg für euch, einmal je Gerät:** Safari öffnen (nicht Chrome — nur
Safari kann das auf iOS), Adresse aufrufen, Teilen-Symbol, „Zum
Home-Bildschirm". Danach startet es ohne Adressleiste, im Vollbild, wie eine
App.

**Fallstricke, die genau einmal wehtun:** `viewport-fit=cover` plus
`env(safe-area-inset-*)`, sonst liegt der Zurück-Knopf unter der Notch. Und
das Symbol darf keinen Alphakanal haben, sonst wird der durchsichtige Teil auf
iOS schwarz.

### 14.5 Zweigmodell

`main` ist immer auslieferbar. Gearbeitet wird auf `claude/*`-Zweigen,
zusammengeführt wird über PRs, die die Torkette laufen lassen. Ein grüner Push
auf `main` liefert aus — ein roter nicht.

---

## 15. Offene Punkte

Die offenen Punkte aus K1 sind erledigt: E1 (vierte Ebene) und E2
(16 Bundesländer) sind beantwortet und
eingearbeitet; die Regierungsbezirke sind gestrichen. Was bleibt:

**O1 · Die Länderauswahl auf Ebene 2 — ENTSCHIEDEN.** Dieselbe Regel in zwei
Tiefen: Lea die fünf größten, Fiona die drei größten (Kapitel 4.2). Damit
sieht Fiona in Nordamerika genau USA, Mexiko und Kanada; Guatemala und Haiti
erreichen nur Lea.

**O2 · Antarktika.** Geprüft, wie gewünscht. Ergebnis: Meine Begründung in K1
war falsch (Kapitel 4.1), das Ergebnis bleibt aber — **Antarktika gehört zu
den sieben Kontinenten, und ein Kind, das sechs lernt, lernt etwas Falsches.**
Neu ist die Reihenfolge: Fiona bekommt es erst in der dritten Runde, mit einem
eigenen Satz. Auf Ebene 2 taucht es ohnehin nie auf, weil es keine Länder
hat. Wenn ihr es trotzdem ganz herausnehmen wollt, ist das eine Zeile in den
Daten — ich rate davon ab.

**O3 · Russland in Europas Fünferliste.** Es steht dort, weil die Datenquelle
es Europa zuordnet und die Regel damit ohne Sonderfall auskommt. Wer es
strenger will („nur Länder, die ganz in Europa liegen"), bekommt stattdessen
Spanien auf Platz 5. Ich rate zu Russland: „so groß, dass es auf zwei
Kontinente passt" ist ein guter Satz für ein Kind.

**O4 · Repository — ENTSCHIEDEN: öffentlich.** Damit ist GitHub Pages
kostenlos nutzbar und die Auslieferung bleibt vollständig bei GitHub — kein
zweites Konto, kein Fremddienst.

Eine Folge, die dadurch verbindlich wird: Die Seite ist für jeden erreichbar,
der die Adresse kennt. Sie ist nicht verlinkt und nicht auffindbar, aber sie
ist offen. Deshalb gilt ab jetzt ohne Wenn und Aber, was in Kapitel 13.3 steht
— der **Sprachmodus ist per Vorgabe aus**, und der Satz, wohin die Aufnahme
geht, erscheint sowohl im Elternbereich als auch beim ersten Start. Fremde
Kinder, die die Seite je aufrufen, können kein Mikrofon einschalten, ohne dass
jemand es vorher gelesen hat.

Im Repository liegen ausschließlich Programm und Karten. **Fortschritt,
Protokoll und Aufnahmen liegen nur auf den Geräten** und werden nie
eingecheckt — auch nicht der Sprachkorpus aus M4, der Fionas Stimme enthielte.
Er wird als Textliste geführt (was gesagt wurde, was verstanden wurde), nie
als Tondatei. Das Tor `csp` und ein Eintrag in `.gitignore` sichern das ab.

**O5 · Der Name.** „Lernkiste" ist Arbeitstitel und als Bezeichnung für
Lernmaterial verbreitet. Bei einer Familien-App ohne Vertrieb folgenlos, aber
er sollte eine Entscheidung sein, bevor zwanzig Dateinamen ihn tragen.

---

## 16. Meilensteine

Jeder mit einem Abnahmekriterium, das man **hinsehen** oder **messen** kann —
nicht mit einem, das man behaupten kann. Weil kein Tor auf iOS läuft, ist die
Gerätesichtung überall Teil der Abnahme.

### M0 · Machbarkeit (zuerst, vor allem anderen)

Eine einzelne HTML-Seite, ausgeliefert über Pages, auf euren echten Geräten
vom Startbildschirm gestartet. Sie prüft **sechs** Dinge und schreibt das
Ergebnis auf den Bildschirm:

1. Nimmt `webkitSpeechRecognition` im Standalone-Modus deutsche Sprache an?
2. Zieht ein Etikett flüssig mit Pointer Events über ein SVG?
3. Überlebt IndexedDB einen Neustart und ein paar Tage?
4. Wird `navigator.storage.persist()` gewährt?
5. Aktualisiert sich der Service Worker sichtbar?
6. Startet das Symbol im Vollbild — also stimmen `base` und `scope`?

**Abnahme:** Sechs Zeilen Ja/Nein aus Fionas iPad und eurem iPhone. Punkt 1
entscheidet über Stufe A, B oder C und damit über M4; Punkte 4 und 6 sind
neu, weil sie sonst erst in M5 auffallen würden.

*Das ist der einzige Meilenstein, bei dem ein „Nein" kein Fehler ist. Er ist
dafür da, das Nein früh zu finden, statt in M4.*

### M1 · Gerüst und Auslieferung

Repository, Vite mit `base`, Svelte, PWA, GitHub Actions, Pages, Symbole,
Startbilder, Andika eingebunden, leere Torkette mit `tsc`, `lint`, `budget`,
`csp`, `pwa`, `doku`.

**Abnahme:** Auf iPhone und iPad liegt ein Symbol. Es öffnet eine leere, aber
echte App im Vollbild. Ein Push von hier verändert sie binnen vier Minuten
sichtbar, ohne dass jemand am Gerät etwas tut.

### M2 · Kartenpipeline

`tools/geo-backen.ts`, Natural Earth 1:50m und 1:10m sowie BKG **VG250**
hinein, `src/geo/<ebene>.<stufe>.ts` heraus — inklusive Topologiebildung,
Klippung, drei Auflösungsstufen, Grenzbögen, Inselregel, Beschriftungs&shy;lagen
und Vierfärbung. Tore `geo`, `topologie` und `lizenz`.

**Abnahme, dreiteilig:**
- Sieben Kontinente, 25 Länder, 16 Bundesländer und 16 Städtelagen liegen in
  **drei Auflösungsstufen** vor, Tore `geo`, `topologie` und `lizenz` grün.
- Die **echten Geometriegrößen sind gemessen** und stehen im Bericht — das ist
  der Lauf, der die Schätzung aus Kapitel 8 ersetzt.
- **Die acht Prüfformen sind angesehen**, bei feinster Stufe, und dazu Europa,
  das ohne die Ural-Klippung bis Wladiwostok reichen würde.

### MG · Gestaltung — zwischen M2 und M3

Der Meilenstein, den K2 nicht hatte (Befund G21). Er kommt **nach** der
Kartenpipeline, weil man ein Kartenbild nicht entwerfen kann, bevor die
echten Umrisse da sind — und **vor** den gebauten Bildschirmen, weil sonst
das Gebaute die Gestaltung bestimmt statt umgekehrt.

Inhalt: Merkmalsdatei `src/marken/` (Raster, Skalen, Farben, Bewegung) ·
Schriftentscheidung am Bildschirm · Symbolsatz · **drei Bildschirme als
statische Entwürfe** — Kontinentaufgabe, Deutschland mit 16 Ländern,
Belohnungsmoment · App-Symbol und Startbild · die ersten Vorbilder für das
Tor `ansicht`.

**Abnahme — fünf Punkte, alle auf dem Gerät:**
- Die drei Entwürfe liegen nebeneinander und sind **angesehen** — auf dem
  iPad, nicht auf dem Schreibtisch.
- Die **acht Prüfformen** (Kapitel 12) sind einzeln angesehen, bei feinster
  Stufe.
- Die sieben Flächenfarben haben gemessen **dieselbe Helligkeit** (±0,01 in
  OKLCH-L), und derselbe Textton ist auf allen sieben lesbar.
- Der Belohnungsmoment läuft als Vorführung: der Umriss zeichnet sich nach,
  die Farbe läuft ein — unter 900 ms, auf dem Gerät.
- Danach steht das Tor `ansicht` mit seinen ersten Vorbildern.

*Und die ehrliche Bedingung:* Überzeugt ein Entwurf beim Ansehen nicht, wird
er **verworfen und neu gemacht** — nicht verbessert. Das ist der Meilenstein,
an dem das erlaubt ist, und der einzige.

### M3 · Ebene 1, Ziehen, beide Profile

Profilwahl, Kontinentbildschirm, Ziehen, Bewertung, Sterne, Vorlesen, Ablage,
Bildschirmablauf mit Zurück. Tore `inhalt`, `beruehrung`, `lesbarkeit`,
`vorlesen`, `browser`, `bild`.

**Abnahme, zweiteilig — beides muss zutreffen:**
- Torkette grün.
- **Fiona ordnet Runde 1 zu, ohne dass jemand ihr hilft.** Dabei wird
  zugesehen und nichts gesagt. Was auffällt, wird aufgeschrieben — daraus
  kommt auch die echte Zahl für `sitzungLaenge`.

### M4 · Sprechen und Tippen

Sprachweg für Fiona (Stufe aus M0), Tastaturweg für Lea, Abgleichmodul,
beide Korpushälften, Tor `vergleich`.

**Abnahme:** Fiona spricht zehn Kontinentnamen **und die Aufnahmen werden
mitgeschnitten** — sie bilden die eingefrorene Korpushälfte. Mindestens acht
werden richtig zugeordnet, keiner falsch angenommen. Lea schreibt zehn Namen
und bekommt bei jedem Fehler eine Rückmeldung, die sagt *was* falsch war —
nicht nur *dass*.

### M5 · Ebenen 2, 3 und 4

25 Länder, 16 Bundesländer, 16 Landeshauptstädte als Paarbildung, die
Stadtstaaten-Lerneinheit, Ablenker, Ebenenwahl, Leitner-Logik, Sammlung.

**Abnahme:** Torkette grün, **Bremen ist auf dem iPhone quer sicher treffbar**
(fünf Versuche, fünf Treffer, auf dem Gerät), Lea schafft eine vollständige
Bundesländer-Runde in unter zehn Minuten — und sie fällt bei Hessen mindestens
einmal auf Frankfurt herein. Ein Ablenker, auf den niemand hereinfällt, ist
keiner.

### M6 · Elternbereich und Audit

*Stand: M3 bis M6 sind als Prototyp gebaut und vom Rauchtest gefahren
(`Lernkiste-STAND.md`). Was fehlt, ist bei allen vieren dasselbe: die
**Gerätesichtung**. Kein Tor läuft auf iOS.*

Protokollauswertung, PIN, Ausfuhr, Löschen, Fassungsanzeige,
Lizenz-Namensnennung, Sprachmodus-Schalter mit Hinweistext.

**Abnahme:** Der Elternbereich beantwortet ohne Nachfrage: *Was kann Lea noch
nicht? Wie hört das Gerät Fionas Aussprache? Welche Fassung läuft auf diesem
iPad? Woher kommen die Karten?* Und die Ausfuhr lässt sich in einer
Tabellenkalkulation öffnen.

---

## 17. Risiken

| | Risiko | Wie wahrscheinlich | Gegenmaßnahme |
|---|---|---|---|
| R1 | Spracherkennung im iOS-Standalone unbrauchbar | mittel | **M0 klärt es vorab**, Leiter A/B/C aus 6.2 |
| R2 | IndexedDB verliert Daten (iOS-Speicherräumung) | **mittel** | `storage.persist()`, Ausfuhr im Elternbereich; M0 misst, ob die Anforderung greift |
| R3 | Kleinstaaten nicht treffbar | **hoch, wenn nichts geschieht** | Entkoppelte Trefferfläche 5.4, Tor `beruehrung` **vor** M5 |
| R4 | Kinder verlieren nach zwei Wochen die Lust | hoch — das übliche Schicksal von Lernspielen | Sammlung, kurze Sitzungen, Leitner statt Wiederholung; **und Zusehen statt Vermuten** |
| R5 | Fassung bleibt auf dem iPad hängen | mittel | 12.2, Tor `pwa` |
| R6 | Sprachabgleich nimmt alles an und lehrt nichts | mittel | Falsch-Positiv-Rate **auf der eingefrorenen Korpushälfte** |
| R7 | Umfang wächst („noch ein Fach, noch eine Ebene") | hoch | Modulfuge 3.4; nichts wird gebaut, was nicht in einem Meilenstein steht |
| R8 | Unterpfad-Fehler beim ersten Anlauf | mittel | 14.3, Tor `pwa`, und M0 Punkt 6 |
| R9 | Feine Geometrie sprengt das Budget deutlich | mittel | M2 misst statt zu schätzen; Antwort ist eine vierte, gröbere Stufe — **nie** eine niedrigere Genauigkeit |
| R10 | Gestaltung löst sich über die Fassungen still auf | **hoch, wenn nichts geschieht** | Tore `marken` und `ansicht`; Vorbilder im Repository, Änderung steht im Diff |

*R2 stand in K1 auf „gering". Das war zu optimistisch: das genaue Verhalten
von iOS gegenüber der Ablage einer Startbildschirm-App ist von außen nicht
sicher zu bestimmen. Deshalb misst M0 es, statt es einzuschätzen.*

---

## 18. Was als Nächstes passiert

O1 und O4 sind entschieden — **es blockiert nichts mehr.** Sobald das
Repository steht (Kapitel 14.2), beginnt **M0**.

Zwei Dinge aus dem Grafik-Audit müssen allerdings **vor M2** erledigt sein,
weil sie die Pipeline bestimmen und ein zweiter Durchlauf teuer ist:
**VG250 und Natural Earth 1:10m beschaffen** (beides kostenlos, beides
Download), und die **drei Auflösungsstufen festlegen**, weil sie die Struktur
der erzeugten Dateien bestimmen. M0 ist eine einzelne Seite und in einer
Runde fertig; sein Ergebnis entscheidet über die Form von M4 und damit über
die letzte wirklich offene Stelle im Entwurf.

O2, O3 und O5 haben Vorgaben, mit denen sich arbeiten lässt — sie können auch
nach M0 noch beantwortet werden, ohne etwas aufzuhalten.
