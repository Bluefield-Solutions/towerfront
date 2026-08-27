# Lernkiste — Konzept

Arbeitstitel. Ein Lernspiel für Fiona (6, 1. Klasse Bayern) und Lea (8,
3. Klasse). Erstes Fach: Erdkunde in vier Ebenen. Läuft als Symbol auf dem
Startbildschirm von iPhone und iPad, liefert sich selbst aus, und lässt sich
prüfen — fachlich, technisch und datenschutzrechtlich.

Stand: **K2** · noch keine Zeile Spielcode
Vorgänger: K1, geprüft in `Lernkiste-PRUEFBERICHT-K1.md` — 25 Befunde, alle hier eingearbeitet

---

## 0. Was hier drinsteht und was nicht

Dieses Dokument ist die **Konzeption vor der Umsetzung**: Technikwahl mit
Begründung, Architektur, Inhaltsmodell, Prüfbarkeit, Auslieferung,
Meilensteine mit Abnahmekriterien. Es legt **nicht** fest, wie eine einzelne
Schaltfläche aussieht — das entsteht in der Umsetzung.

**Was sich gegenüber K1 geändert hat.** Ein vollständiger Prüfdurchgang hat
25 Befunde ergeben: fünf Sachfehler, sechs Widersprüche, vierzehn Lücken. Der
schwerste war strukturell — Ebene 4 (Landeshauptstädte) war zugesagt, aber im
Datenmodell nicht vorgesehen, weil eine Stadt keine Fläche ist. Er ist
behoben, und die Lösung hat die Ebene besser gemacht als der ursprüngliche
Entwurf. Der Bericht steht daneben, damit die Änderungen nachvollziehbar
bleiben.

Fünf Punkte sind noch offen und stehen als **O1 bis O5** in **Kapitel 14**
(neue Kennungen, damit sie nicht mit E1–E5 aus K1 verwechselt werden). Keiner davon
blockiert M0.

**Vier Zahlen, die dieses Dokument beschreiben:**

| | |
|---|---|
| Ebenen | 4 |
| Gebiete gesamt | **69** (7 Kontinente + 30 Länder + 16 Bundesländer + 16 Städte) |
| Eingabewege | 3 (Ziehen · Sprechen · Tippen) |
| Tore in der Kette | **19** |

Die Zahlen 69 und 19 werden nicht geschrieben, sondern gezählt: `inhalt`
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
   mit einem Namen — die Grundlage für Kapitel 10, und prüfbar.
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
| Andika (Schriftschnitt) | Buchstabenformen für Leseanfänger, mitgeliefert | ~40 KB |

Keine Geo-Bibliothek zur Laufzeit. Keine Ziehbibliothek. Keine
Zustandsbibliothek. Keine Symbolschriftart. Kein Klang- und kein
Bildvorrat — beides wird erzeugt (Kapitel 5.5).

**Zur Bauzeit (landet nicht im Bündel):**

`vite`, `typescript`, `@sveltejs/vite-plugin-svelte`, `vite-plugin-pwa`
(Workbox), `d3-geo` + `topojson-client` (Projektion, **nur im Werkzeug**),
`mapshaper` (Vereinfachung), `zod` (Inhaltsprüfung), `vitest`,
`@playwright/test`, `eslint`, `svelte-check`.

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

  art: 'flaeche' | 'punkt';   // NEU in K2 — eine Stadt ist kein Umriss
  pfad?: string;              // SVG-d, nur bei art === 'flaeche'
  ort?: [number, number];     // Lage, nur bei art === 'punkt'
  zielId?: string;            // worauf gezogen wird, wenn art === 'punkt'

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
**30 Länder** für Lea, 15 für Fiona.

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

7 Kontinente + 30 Länder + 16 Bundesländer + 16 Städte = **69 Gebiete**.
Fiona sieht davon 54 (15 statt 30 Länder). In K1 stand „53" — das zählte drei
Ebenen, während daneben „4 Ebenen" stand. Befund I2.

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
| Kontinente, Länder | **Natural Earth** 1:50m | Public Domain | keine, wird trotzdem genannt |
| Bundesländer | **BKG VG2500** | dl-de/by-2-0 | **Namensnennung erforderlich** |
| Städtelagen | Natural Earth `populated places` | Public Domain | keine |

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
Natural Earth / BKG  (Shapefile, ~80 MB)
        │  tools/geo-backen.ts
        ├─ Kontinentkanten klippen (5.2)
        ├─ mapshaper: vereinfachen (Visvalingam, gewichtet)
        ├─ d3-geo: projizieren — je Ebene eine eigene Projektion
        │     Welt        → geoNaturalEarth1
        │     Kontinent   → geoConicEqualArea, auf den Kontinent zentriert
        │     Deutschland → geoConicConformal (die Schulkartenansicht)
        ├─ auf viewBox 0..1000 normieren, auf 1 Nachkommastelle runden
        ├─ Anker rechnen: Pol der Unzugänglichkeit, NICHT der Schwerpunkt
        │     (der Schwerpunkt Italiens liegt im Meer)
        ├─ Vierfärbung der Bundesländer rechnen (5.6)
        └─ ausgeben: src/geo/*.ts  — reine Zeichenketten
```

**Warum zur Bauzeit:** keine Geo-Bibliothek im Bündel (d3-geo + topojson wären
~90 KB), keine Rechenlast auf dem iPad, und die Umrisse sind
**deterministisch** — dasselbe Eingabedatum ergibt denselben Pfad, also lässt
sich die Geometrie überhaupt erst prüfen (Tor `geo`).

**Vereinfachungsgrad wird gemessen, nicht geraten.** Messgröße ist die Fläche
der symmetrischen Differenz gegen den unvereinfachten Umriss, Grenze 2 %.
Italiens Stiefel und Dänemarks Zipfel überleben das; ein glatt gebügeltes
Norwegen nicht.

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

Die Zugangsregel „Farbe trägt nie allein Bedeutung" (Kapitel 10) wurde in K1
für die Karte selbst nirgends eingelöst. Befund L13.

- **Kontinente:** sieben Farben, die unter Rot-Grün-Sehschwäche
  unterscheidbar bleiben, geprüft mit einer Deuteranopie-Simulation.
- **Länder** innerhalb eines Kontinents: Abstufungen seiner Farbe. Damit trägt
  die Farbe die Zugehörigkeit, ohne die Aufgabe zu verraten.
- **Bundesländer:** **vier Farben** so verteilt, dass keine zwei Nachbarn
  dieselbe tragen — der Vier-Farben-Satz ist hier buchstäblich das richtige
  Werkzeug. Gleichfarbige Nachbarn verschmelzen sonst optisch zu einer
  Fläche.

Ein Tor rechnet den Kontrast benachbarter Flächen nach.

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
braucht also Netz und ist datenschutzrelevant (Kapitel 12). Ob es auf *euren*
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
| Bündel gesamt, gzip | **< 400 KB** | Tor `budget`, bricht die Kette |
| davon Geometrie | < 150 KB | Tor `budget` |
| davon Schrift (Andika, Teilsatz) | < 45 KB | Tor `budget` |
| Erstes Bild, kalt | < 1,5 s | Playwright + Lighthouse in CI |
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

**Die Zahlen aus der CI sind keine Gerätezahlen.** Dort läuft Chromium ohne
Grafikkarte, nicht Safari auf iOS. Sie taugen als Ratsche („nicht schlechter
als gestern"), nicht als Aussage über das iPad. Diese Unterscheidung hat
Towerfront fünf Runden gekostet; hier steht sie von Anfang an — und sie hat
eine Folge, siehe Kapitel 11.

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

## 10. Barrierefreiheit und kindgerechte Bedienung

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
lernt. Deshalb wird der Spielinhalt in **Andika** gesetzt: eine Schrift, die
ausdrücklich für Leseanfänger entworfen wurde, mit einstöckigem „a" und „g",
offen lizenziert. Sie wird **mitgeliefert, nicht von einem CDN geladen** —
sonst wäre sie die einzige ausgehende Verbindung im ganzen Programm
(Kapitel 12). Befund L5.

Zwei Punkte, die man leicht übersieht: **Rot-Grün** taugt bei einem
Besuchskind nicht als einziges Signal — richtig und falsch unterscheiden sich
hier immer auch in Form und Ton. Und **Linkshänder**: die Etikettenliste muss
auf die andere Seite umschaltbar sein, sonst verdeckt die ziehende Hand genau
das Gebiet, auf das sie zielt.

---

## 11. Prüfbarkeit — die Torkette

Übernommen aus Towerfront, weil es dort funktioniert hat: **eine Kette, die
vor jedem Einchecken grün sein muss, und die die Auslieferung blockiert.**

```
tsc → lint → inhalt → geo → lizenz → vergleich → einheit
    → beruehrung → lesbarkeit → vorlesen → budget → csp
    → bild → browser → pwa → offline → doku → proben → bericht
```

**Neunzehn Schritte.** In K1 waren es siebzehn, während der Text an anderer
Stelle ein CSP-Tor und einen Gegenprobenlauf forderte, die nicht in der Kette
standen (Befund I3) — wortwörtlich der Fehler, vor dem Towerfronts eigener
Auslieferungsplan im Kommentar warnt. Deshalb **zählt `doku` die Torschritte
gegen die Zahl in diesem Absatz.**

**Die Tore, die hier den Unterschied machen:**

**`inhalt`** — Zod über alle Daten. Jede ID einmalig. Jedes Gebiet hat einen
Namen, mindestens einen Alias, mindestens eine Aussprachevariante, einen
Elternknoten, der existiert, und einen Datenstand jünger als drei Jahre. Kein
Flächen-Gebiet ohne Geometrie, kein Punkt-Gebiet ohne Ziel. Jedes Gebiet auf
Ebene 4 hat mindestens einen Ablenker, die fünf Fallen aus 4.4 namentlich den
richtigen. **Die Gebiete werden gezählt und die Summe gegen Kapitel 4.5
geprüft** — damit fällt auf, wenn beim Umbau eins verlorengeht.

**`geo`** — jeder Pfad ist geschlossen, hat Fläche > 0, sein Anker liegt
nachweislich *im* Pfad (Punkt-in-Polygon, nicht Schwerpunkt), die
Vereinfachung weicht um höchstens 2 % Fläche ab, **und jede Klippkante aus 5.2
ist gesetzt.**

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
`apple-touch-icon` gesetzt, **alle Pfade gegen `base` geprüft** (Kapitel 13),
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
> Abnahme — bei M0, M3, M4, M5 und M6 steht sie ausdrücklich im
> Abnahmekriterium.

Und kein Tor sagt, ob es Spaß macht, ob Fiona den Mikrofonknopf findet, ob
Lea nach zwei Wochen noch spielt. Dafür gibt es nur: hinsetzen, zusehen,
nichts sagen. Elf von 57 Befunden kamen in Towerfront aus genau solchem
Hinsehen.

---

## 12. Audit-Fähigkeit

Drei verschiedene Dinge tragen diesen Namen. Alle drei sind gemeint.

### 12.1 Lern-Audit — was die Kinder tatsächlich können

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
hört — und daraus wächst die eingefrorene Korpushälfte aus Kapitel 11 mit
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

### 12.2 Technisches Audit — welche Fassung läuft hier eigentlich?

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

### 12.3 Datenschutz-Audit — was verlässt das Gerät

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

**Bei öffentlich erreichbarer Seite** (Kapitel 13.2) können fremde Kinder das
Spiel benutzen; dann ist die Freigabe nicht mehr eine Entscheidung *dieser*
Eltern. Derselbe Satz erscheint deshalb zusätzlich beim ersten Start. Das
kostet nichts und ist unabhängig von der Entscheidung öffentlich/privat
richtig. Befund L11.

---

## 13. Auslieferung

### 13.1 Der Weg von hier auf das iPad

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

### 13.2 Was einzurichten ist (einmalig, durch euch)

1. **Repository anlegen** — Vorschlag: `lernkiste`. Öffentlich ist einfacher:
   GitHub Pages für private Repositories braucht ein bezahltes Konto.
   *Falls privat gewünscht:* Cloudflare Pages oder Netlify tun dasselbe
   kostenlos, der Rest des Konzepts bleibt unverändert. **Offener Punkt O4.**
2. **Pages einschalten**: Settings → Pages → Source = **GitHub Actions**.
3. Mir Schreibrecht auf dem Zweig geben. Dann läuft alles Weitere von hier.

Kein Geheimnis, kein Zugriffsschlüssel, kein Fremddienst.

### 13.3 Der Unterpfad ist der häufigste Grund, warum es beim ersten Mal nicht läuft

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

### 13.4 Das Symbol auf dem Startbildschirm

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

### 13.5 Zweigmodell

`main` ist immer auslieferbar. Gearbeitet wird auf `claude/*`-Zweigen,
zusammengeführt wird über PRs, die die Torkette laufen lassen. Ein grüner Push
auf `main` liefert aus — ein roter nicht.

---

## 14. Offene Punkte

Die offenen Punkte aus K1 sind erledigt: E1 (vierte Ebene) und E2
(16 Bundesländer) sind beantwortet und
eingearbeitet; die Regierungsbezirke sind gestrichen. Was bleibt:

**O1 · Die Länderauswahl auf Ebene 2.** Vorgeschlagen: dieselbe Regel in zwei
Tiefen — Lea die fünf größten, Fiona die drei größten (Kapitel 4.2). Damit
sieht Fiona in Nordamerika genau USA, Mexiko und Kanada, und Guatemala und
Haiti erreichen nur Lea. Bitte bestätigen; die Alternative wäre eine Auswahl
nach Bekanntheit, die dann aber niemand mehr nachprüfen kann.

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

**O4 · Repository öffentlich oder privat.** Blockiert M1. Öffentlich =
kostenlos über GitHub Pages; privat = Cloudflare Pages, sonst identisch.

**O5 · Der Name.** „Lernkiste" ist Arbeitstitel und als Bezeichnung für
Lernmaterial verbreitet. Bei einer Familien-App ohne Vertrieb folgenlos, aber
er sollte eine Entscheidung sein, bevor zwanzig Dateinamen ihn tragen.

---

## 15. Meilensteine

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

`tools/geo-backen.ts`, Natural Earth und BKG hinein, `src/geo/*.ts` heraus,
inklusive Kontinentklippung und Vierfärbung. Tore `geo` und `lizenz`.

**Abnahme:** Sieben Kontinente, 30 Länder, 16 Bundesländer und 16 Städtelagen
liegen vor, alle Tore grün, Geometrie unter 150 KB gzip. **Und: ein Bild aller
Umrisse nebeneinander, angesehen** — insbesondere Europa, das ohne die
Ural-Klippung bis Wladiwostok reichen würde.

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

30 Länder, 16 Bundesländer, 16 Landeshauptstädte als Paarbildung, die
Stadtstaaten-Lerneinheit, Ablenker, Ebenenwahl, Leitner-Logik, Sammlung.

**Abnahme:** Torkette grün, **Bremen ist auf dem iPhone quer sicher treffbar**
(fünf Versuche, fünf Treffer, auf dem Gerät), Lea schafft eine vollständige
Bundesländer-Runde in unter zehn Minuten — und sie fällt bei Hessen mindestens
einmal auf Frankfurt herein. Ein Ablenker, auf den niemand hereinfällt, ist
keiner.

### M6 · Elternbereich und Audit

Protokollauswertung, PIN, Ausfuhr, Löschen, Fassungsanzeige,
Lizenz-Namensnennung, Sprachmodus-Schalter mit Hinweistext.

**Abnahme:** Der Elternbereich beantwortet ohne Nachfrage: *Was kann Lea noch
nicht? Wie hört das Gerät Fionas Aussprache? Welche Fassung läuft auf diesem
iPad? Woher kommen die Karten?* Und die Ausfuhr lässt sich in einer
Tabellenkalkulation öffnen.

---

## 16. Risiken

| | Risiko | Wie wahrscheinlich | Gegenmaßnahme |
|---|---|---|---|
| R1 | Spracherkennung im iOS-Standalone unbrauchbar | mittel | **M0 klärt es vorab**, Leiter A/B/C aus 6.2 |
| R2 | IndexedDB verliert Daten (iOS-Speicherräumung) | **mittel** | `storage.persist()`, Ausfuhr im Elternbereich; M0 misst, ob die Anforderung greift |
| R3 | Kleinstaaten nicht treffbar | **hoch, wenn nichts geschieht** | Entkoppelte Trefferfläche 5.4, Tor `beruehrung` **vor** M5 |
| R4 | Kinder verlieren nach zwei Wochen die Lust | hoch — das übliche Schicksal von Lernspielen | Sammlung, kurze Sitzungen, Leitner statt Wiederholung; **und Zusehen statt Vermuten** |
| R5 | Fassung bleibt auf dem iPad hängen | mittel | 12.2, Tor `pwa` |
| R6 | Sprachabgleich nimmt alles an und lehrt nichts | mittel | Falsch-Positiv-Rate **auf der eingefrorenen Korpushälfte** |
| R7 | Umfang wächst („noch ein Fach, noch eine Ebene") | hoch | Modulfuge 3.4; nichts wird gebaut, was nicht in einem Meilenstein steht |
| R8 | Unterpfad-Fehler beim ersten Anlauf | mittel | 13.3, Tor `pwa`, und M0 Punkt 6 |

*R2 stand in K1 auf „gering". Das war zu optimistisch: das genaue Verhalten
von iOS gegenüber der Ablage einer Startbildschirm-App ist von außen nicht
sicher zu bestimmen. Deshalb misst M0 es, statt es einzuschätzen.*

---

## 17. Was als Nächstes passiert

Sobald **O4** beantwortet ist (Repository öffentlich oder privat) und das
Repository steht, beginnt **M0**. M0 ist eine einzelne Seite und in einer
Runde fertig; sein Ergebnis entscheidet über die Form von M4 und damit über
die letzte wirklich offene Stelle im Entwurf.

O1, O2, O3 und O5 haben Vorgaben, mit denen sich arbeiten lässt — sie können
auch nach M0 noch beantwortet werden, ohne etwas aufzuhalten.
