# Lernkiste — Konzept

Arbeitstitel. Ein Lernspiel für Fiona (6, 1. Klasse Bayern) und Lea (8,
3. Klasse). Erstes Fach: Erdkunde in vier Ebenen. Läuft als Symbol auf dem
Startbildschirm von iPhone und iPad, liefert sich selbst aus, und lässt sich
prüfen — fachlich, technisch und datenschutzrechtlich.

Stand: Entwurf 0.1 · noch keine Zeile Spielcode · Fassung dieses Dokuments K1

---

## 0. Was hier drinsteht und was nicht

Dieses Dokument ist die **Konzeption vor der Umsetzung**. Es legt fest:
Technikwahl mit Begründung, Architektur, Inhaltsmodell, Prüfbarkeit,
Auslieferung, Meilensteine mit Abnahmekriterien. Es legt **nicht** fest, wie
eine einzelne Schaltfläche aussieht — das entsteht in der Umsetzung.

Drei Dinge aus dem Auftrag sind noch offen und stehen in **Kapitel 13**.
Eins davon ist ein Sachfehler, der jetzt billig zu beheben ist und später
teuer: **Deutschland hat 16 Bundesländer, nicht 17.** Das Konzept rechnet
mit 16 und liest die Zahl aus den Daten, nicht aus dem Code — wenn es doch
17 werden sollen (etwa weil ein Sonderfeld dazukommt), kostet das keine
Änderung an der Mechanik.

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
| Belohnung | sofort, jedes Mal | Sammlung über Tage |
| Schwierigkeit | 4 Kontinente zur Wahl | alle 7, freies Feld |

**Die entscheidende Ableitung: Fiona kann die Namen nicht lesen.** Eine Liste
von Kontinentnamen am Bildschirmrand ist für sie eine Liste von Mustern. Das
Spiel wäre nicht falsch — sie würde Formen zu Formen zuordnen und dabei
nichts über Erdkunde lernen. Deshalb gilt für ihr Profil:

> **Jeder geschriebene Name im Spiel ist auch ein hörbarer Name.**
> Antippen liest vor. Immer, überall, ohne Ausnahme.

Das ist keine Bequemlichkeitsfunktion, das ist die Bedingung, unter der das
Spiel für sie überhaupt ein Lernspiel ist. Technisch trägt es die
Sprachausgabe des Geräts (Kapitel 5.3), kostet nichts und läuft offline.

**Zum bayerischen Lehrplan.** LehrplanPLUS HSU sieht Deutschland und Europa
erst in Jahrgangsstufe 3/4 vor — das passt auf **Lea** und deckt sich genau
mit den Ebenen 3 und 4 dieses Konzepts. Für **Fiona** ist Erdkunde in der
1. Klasse kein Lehrplaninhalt; für sie ist das Spiel Vorwissen und vor allem
*Sprechübung*. Das ist kein Einwand — es heißt nur, dass ihr Profil nicht an
Vollständigkeit gemessen wird, sondern an Wiedererkennen und Aussprache. Ihr
Fortschrittsbalken zählt deshalb andere Dinge als Leas (Kapitel 8).

---

## 2. Technikwahl

### 2.1 Die Entscheidung in einem Satz

**TypeScript 5 + Vite 7 + Svelte 5, gezeichnet als SVG im DOM, ausgeliefert
als PWA über GitHub Pages.**

### 2.2 Warum SVG und nicht Canvas

Towerfront zeichnet auf Canvas. Das war dort richtig — 60 Bilder je Sekunde,
hunderte bewegte Figuren. Hier ist es **falsch**, und zwar aus vier Gründen:

1. **Treffererkennung ist geschenkt.** „Liegt der Finger auf Afrika?" ist bei
   SVG eine Eigenschaft des Elements (`pointer-events`), bei Canvas eine
   eigene Geometrie-Bibliothek, die man schreiben, prüfen und pflegen muss.
   Bei 16 Bundesländern mit verzahnten Grenzen ist das der halbe Aufwand
   des ganzen Projekts.
2. **Scharf in jeder Größe.** Landesumrisse auf einem iPad mit dreifacher
   Punktdichte, zoombar bis auf Bremen — Vektoren sind hier die Sachform.
3. **Vorlesbar und bedienbar für Hilfstechnik.** Jedes Land ist ein Element
   mit einem Namen. Das ist die Grundlage für Kapitel 9 (Barrierefreiheit)
   und lässt sich prüfen.
4. **Das Bild bewegt sich fast nie.** Es gibt keine Kaskade, keine Physik,
   keine Bildrate zu verteidigen. Der einzige bewegte Vorgang ist ein
   Etikett am Finger — und das ist ein `transform` auf einem Element.

Bewegte Bildschirmteile (Konfetti, Sterne) laufen als CSS-Animation oder,
wenn es wirklich einmal viele Teilchen sind, auf einem **darüberliegenden**
Canvas. Beides schließt sich nicht aus.

### 2.3 Warum Svelte 5 und nicht nacktes TypeScript

Towerfront kommt ohne Gerüst aus, weil es genau eine Fläche hat. Hier gibt es
Profilwahl, Ebenenwahl, Aufgabenbildschirm, Ergebnis, Elternbereich,
Sammlung — sechs Bildschirme mit Zuständen, die sich gegenseitig sehen. Das
von Hand zu synchronisieren ist genau die Sorte Arbeit, die stillschweigend
kaputtgeht (Towerfront, Eiserne Regel 6: „im Menü ist keine Spielbedienung
sichtbar" — zweimal schiefgegangen, bis es eine *Ableitung* wurde statt eines
Schalters). Ein Gerüst mit abgeleiteten Zuständen macht diese Fehlerklasse
strukturell unmöglich.

Svelte 5 statt React, weil:

| | Svelte 5 | React 19 | Vanilla TS |
|---|---|---|---|
| Laufzeit im Bündel | ~10 KB | ~45 KB | 0 |
| Abgleichverfahren | kompiliert, kein VDOM | VDOM | Handarbeit |
| Übergänge/Animation | eingebaut | Zusatzpaket | Handarbeit |
| Passt zu SVG | direkt, ohne Umweg | JSX-Attributnamen weichen ab | direkt |
| Zustandssynchronität | Runes, abgeleitet | Hooks, Disziplin | keine |

Auf einem älteren iPad ist der Unterschied zwischen 10 und 45 KB Laufzeit
nicht die Dateigröße — es ist die Zeit, die der Hauptfaden mit dem Abgleich
verbringt, während ein Finger ein Etikett zieht. **Solid.js** wäre technisch
gleichwertig; Svelte gewinnt an Werkzeugreife und Dokumentationslage.

### 2.4 Abhängigkeiten — die vollständige Liste

Wenige, und jede mit Grund. Was hier nicht steht, kommt nicht rein, ohne dass
jemand diese Tabelle ergänzt.

**Zur Laufzeit (landet im Bündel):**

| Paket | Wofür | ungefähr |
|---|---|---|
| `svelte` | Oberfläche | 10 KB |
| `idb-keyval` | IndexedDB ohne Zeremonie | 1 KB |
| *(nichts weiter)* | | |

Keine Geo-Bibliothek zur Laufzeit. Keine Ziehbibliothek. Keine
Zustandsbibliothek. Keine Symbolschriftart.

**Zur Bauzeit (landet nicht im Bündel):**

`vite`, `typescript`, `@sveltejs/vite-plugin-svelte`, `vite-plugin-pwa`
(Workbox), `d3-geo` + `topojson-client` (Projektion der Karten, **nur im
Werkzeug**), `mapshaper` (Vereinfachung), `zod` (Inhaltsprüfung),
`vitest`, `@playwright/test`, `eslint`, `svelte-check`.

### 2.5 Was ausdrücklich *nicht* gewählt wurde

- **React Native / Expo / Capacitor.** Ein natives Gehäuse würde bedeuten:
  Apple-Entwicklerkonto (99 €/Jahr), Prüfverfahren oder TestFlight mit
  90-Tage-Ablauf, und jede Auslieferung dauert Stunden statt Minuten. Der
  Auftrag lautet „Symbol auf dem Startbildschirm, immer aktuell" — das leistet
  eine PWA vollständig und ohne Apple im Weg.
- **Flutter / Unity.** Beide bringen mehrere Megabyte Laufzeit für ein Spiel
  mit, dessen gesamter Inhalt unter 400 KB passt.
- **Ein Karten-Framework (Leaflet, MapLibre).** Die sind für *echte* Karten mit
  Kacheln und Zoomstufen gebaut. Wir brauchen sieben Umrisse und wollen keine
  Kachelserver, keine Netzabhängigkeit, keine Beschriftungen fremder Sprache.
- **HTML5 Drag-and-Drop.** Auf iOS Safari faktisch unbenutzbar. Gezogen wird
  mit **Pointer Events**, siehe 5.1.

---

## 3. Architektur

### 3.1 Die tragende Idee: eine Aufgabe, drei Eingabewege

Das ist der Kern des Entwurfs. Alles andere ist Ausführung.

Eine Aufgabe lautet immer gleich: *„Dieses Gebiet — wie heißt es?"* Was sich
je Profil unterscheidet, ist ausschließlich, **wie** die Antwort hereinkommt.
Also gibt es genau eine Aufgabenlogik und drei austauschbare Eingabegeber,
die dasselbe Ereignis erzeugen:

```
             ┌──────────────────────────────────────┐
             │   Aufgabe: gebiet="europa"           │
             │   Kandidaten: [7 Kontinente]         │
             └──────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
  ┌───────────┐        ┌────────────┐        ┌────────────┐
  │  Ziehen   │        │  Sprechen  │        │  Tippen    │
  │ (beide)   │        │  (Fiona)   │        │  (Lea)     │
  └───────────┘        └────────────┘        └────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
              Antwort { gebietId, roheingabe, sicherheit }
                              │
                              ▼
              Bewertung → richtig | fast | falsch
```

**Warum das die richtige Fuge ist:** Die vierte Ebene, das nächste Fach, ein
drittes Kind mit einem vierten Eingabeweg — nichts davon rührt an der
Aufgabenlogik. Und die Prüfbarkeit folgt daraus: die Aufgabenlogik lässt sich
ohne Bildschirm, ohne Mikrofon und ohne Browser testen, weil sie nur
`Antwort`-Objekte sieht.

### 3.2 Verzeichnisse

```
src/
  inhalt/       reine Daten. Kontinente, Länder, Bundesländer,
                Aliasse, Aussprachevarianten. Kein Code, nur Fakten.
                Wird von einem Zod-Schema bewacht.
  geo/          ERZEUGT — SVG-Pfade als TypeScript. Nie von Hand
                bearbeiten; entsteht aus tools/geo-backen.ts.
  kern/         Aufgabenauswahl (Leitner), Bewertung, Sitzungsablauf,
                Fortschritt. Kennt weder DOM noch Mikrofon.
  eingabe/      ziehen.ts · sprache.ts · tastatur.ts
                Drei Geber, ein Ereignistyp.
  vergleich/    Namensabgleich: normalisieren, Alias, Kölner Phonetik,
                Levenshtein. Wird von beiden Nicht-Zieh-Wegen genutzt.
  profil/       Profile, Fähigkeitsschalter, Ablage (IndexedDB).
  protokoll/    Ereignisstrom für den Elternbereich und die Prüfung.
  ui/           Svelte-Komponenten. Dumm — bekommt Zustand, gibt Absicht.
  ton/          Vorlesen, Klänge.
tools/          Torkette, Geo-Pipeline, Berichte. Wie in Towerfront.
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
  elternId: string | null; // "de"
  ebene: 1 | 2 | 3 | 4;
  pfad: string;            // SVG-d, erzeugt
  anker: [number, number]; // Punkt IM Gebiet, für Etikett und Kleinstflächen
  flaecheRel: number;      // Anteil an der Ansicht — steuert 5.4
};
```

Eine Ebene ist dann nur noch eine Abfrage: *alle Gebiete mit `elternId = X`.*
Die vierte Ebene, das nächste Fach, eine fünfte — alles ist ein neuer Ast,
keine neue Mechanik. Das ist der Unterschied zwischen einem Spiel, das man
erweitert, und einem, das man jedes Mal aufmacht.

### 3.4 Die Inhalte konkret

**Ebene 1 — Kontinente (7).** Afrika · Antarktika · Asien · Australien und
Ozeanien · Europa · Nordamerika · Südamerika.
*Fiona:* zunächst 4 zur Auswahl (Europa, Afrika, Australien, Antarktika —
die vier mit den unverwechselbarsten Umrissen), dann alle 7.
*Lea:* alle 7, freies Schreibfeld.

**Ebene 2 — je Kontinent die fünf einwohnerstärksten Länder** (30 Länder;
Australien und Antarktika fallen weg, wie beauftragt):

| Kontinent | Vorschlag |
|---|---|
| Afrika | Nigeria · Äthiopien · Ägypten · DR Kongo · Tansania |
| Asien | Indien · China · Indonesien · Pakistan · Bangladesch |
| Europa | Russland · Deutschland · Frankreich · Vereinigtes Königreich · Italien |
| Nordamerika | USA · Mexiko · Kanada · Guatemala · Kuba |
| Südamerika | Brasilien · Kolumbien · Argentinien · Peru · Venezuela |

Zwei bewusste Abweichungen von der reinen Zahl, **beide zur Entscheidung in
Kapitel 13**: Die **Türkei** liegt nach Einwohnern vor Deutschland, gilt aber
überwiegend als asiatisch — Kindern zwei Kontinente für ein Land zu erklären,
bevor sie sieben Kontinente sicher haben, ist der falsche Zeitpunkt.
**Haiti** liegt knapp vor **Kuba**; Kuba ist für Kinder die wiedererkennbarere
Form und der geläufigere Name.

**Ebene 3 — die 16 Bundesländer.** Baden-Württemberg · Bayern · Berlin ·
Brandenburg · Bremen · Hamburg · Hessen · Mecklenburg-Vorpommern ·
Niedersachsen · Nordrhein-Westfalen · Rheinland-Pfalz · Saarland · Sachsen ·
Sachsen-Anhalt · Schleswig-Holstein · Thüringen.
Für **beide** Profile, wie beauftragt — bei Fiona mit Vorlesen und in zwei
Halbportionen (Nord/Süd), sonst ist es für eine Erstklässlerin eine Wand.

**Ebene 4 — angenommen: die Landeshauptstädte.** *Der Auftragstext bricht hier
ab.* Das Konzept nimmt „Bundesland → Landeshauptstadt" an, weil es der
natürliche nächste Schnitt ist und weil es für Bayern zusätzlich zu den
sieben **Regierungsbezirken** ausgebaut werden kann — beides passt in den
bayerischen HSU-Lehrplan 3/4 und beides ist im Datenmodell aus 3.3 ein Ast
ohne neuen Code. **Bitte in Kapitel 13 bestätigen oder korrigieren.**

### 3.5 Fächer nach Erdkunde

Der Baum aus 3.3 trägt Gebiete. Ein zweites Fach (Mathe, Deutsch, Tiere)
trägt andere Gegenstände — aber dieselbe Aufgabenform: *hier ist ein Ding,
wie heißt es / was gehört dazu.* Die Fuge dafür ist ein **Modul**:

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

## 4. Die Karten — Datenherkunft und Backprozess

Der heikelste technische Teil, weil er Lizenzen, Genauigkeit und
Dateigröße gleichzeitig betrifft.

### 4.1 Quellen und Lizenzen (Audit-relevant)

| Ebene | Quelle | Lizenz | Pflicht |
|---|---|---|---|
| Kontinente, Länder | **Natural Earth** 1:50m | Public Domain | keine, wird trotzdem genannt |
| Bundesländer | **BKG VG2500** | dl-de/by-2-0 | **Namensnennung erforderlich** |

Die Namensnennung steht im Elternbereich unter „Herkunft der Karten" und wird
von einem Tor geprüft (Kapitel 10, Tor `lizenz`). Eine Lizenzpflicht, die nur
in einer Textdatei steht, verschwindet beim ersten Umbau.

**GADM wird nicht verwendet** — die Lizenz verbietet den Einsatz in Produkten
und wäre hier ein echtes Problem, auch bei einem Familienspiel im offenen
Netz.

### 4.2 Der Backprozess läuft zur Bauzeit, nicht im Spiel

```
Natural Earth / BKG  (Shapefile, ~80 MB)
        │  tools/geo-backen.ts
        ├─ mapshaper: vereinfachen (Visvalingam, gewichtet)
        ├─ d3-geo: projizieren — je Ebene eine eigene Projektion
        │     Welt        → geoNaturalEarth1
        │     Kontinent   → geoConicEqualArea, auf den Kontinent zentriert
        │     Deutschland → geoConicConformal (die Schulkartenansicht)
        ├─ auf viewBox 0..1000 normieren, auf 1 Nachkommastelle runden
        ├─ Anker rechnen: Pol der Unzugänglichkeit, NICHT der Schwerpunkt
        │     (der Schwerpunkt Italiens liegt im Meer)
        └─ ausgeben: src/geo/*.ts  — reine Zeichenketten
```

**Warum zur Bauzeit:** Keine Geo-Bibliothek im Bündel (d3-geo + topojson
wären ~90 KB), keine Rechenlast auf dem iPad, und die Umrisse sind
**deterministisch** — dasselbe Eingabedatum ergibt denselben Pfad, also lässt
sich die Geometrie überhaupt erst prüfen (Tor `geo`).

**Vereinfachungsgrad wird gemessen, nicht geraten.** Zielband: erkennbare
Form bei minimalen Punkten. Messgröße ist die Fläche der Symmetrischen
Differenz gegen den unvereinfachten Umriss, Grenze 2 %. Italiens Stiefel und
Dänemarks Zipfel überleben das; ein glatt gebügeltes Norwegen nicht.

### 4.3 Bremen, das Saarland und die Ehrlichkeit der Trefferfläche

Bremen ist auf einer Deutschlandkarte bei 390 Punkten Bildbreite **kleiner
als eine Fingerkuppe**. Ein Spiel, in dem man Bremen nicht treffen kann, ist
für ein Kind kaputt, egal was die Tore sagen.

Die Lösung ist keine Lupe und kein Zoom, sondern **entkoppelte Trefferfläche**:

- Der *gezeichnete* Umriss bleibt maßstabsgetreu — die Form ist der Lerninhalt.
- Die *Trefferfläche* ist ein unsichtbarer Kreis um den Anker, mindestens
  44 × 44 Punkte (Apple HIG), bei Bedarf mit einer dünnen Leitlinie zum
  echten Gebiet.
- Überlappen sich zwei solche Kreise (Bremen/Niedersachsen, Berlin/Brandenburg,
  Hamburg/Schleswig-Holstein), gewinnt das **kleinere** Gebiet. Sonst kommt
  man an einen Stadtstaat nie heran.

Das Tor `beruehrung` misst genau das und schlägt an, wenn irgendein Gebiet
auf irgendeiner unterstützten Bildschirmgröße unter 44 Punkte fällt. Diese
Prüfung muss vorhanden sein, *bevor* Ebene 3 gebaut wird — nicht danach.

---

## 5. Die drei Eingabewege im Detail

### 5.1 Ziehen (beide Profile)

**Pointer Events, nicht HTML5-Drag-and-Drop.** Letzteres funktioniert auf iOS
Safari nicht verlässlich; das ist der klassische Fallstrick dieses
Spieltyps.

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

### 5.2 Sprechen (Fiona) — der größte technische Vorbehalt

**Was gebaut wird:** Web Speech API (`webkitSpeechRecognition`), Sprache
`de-DE`, ausgelöst durch Antippen eines großen Mikrofonknopfs, automatischer
Stopp nach Sprechpause.

**Der eigentliche Trick liegt nicht in der Erkennung, sondern im Abgleich.**
Eine Sechsjährige sagt nicht „Australien", sie sagt vielleicht
„Austraaljen". Die Erkennung liefert vielleicht „aus Straßen". Ein
Zeichenkettenvergleich scheitert daran — und das Kind hört „falsch", obwohl
es richtig lag. Das wäre das Ende des Sprachmodus nach drei Minuten.

Deshalb: **geschlossene Kandidatenmenge + gestufter Abgleich.** Wir wissen zu
jeder Aufgabe, welche 4 bis 7 Antworten überhaupt in Frage kommen. Damit muss
nicht erkannt werden, *was* gesagt wurde, sondern nur, *welchem der sieben
Wörter* es am nächsten kommt:

```
1. normalisieren   Kleinschreibung, Umlaute, Leerzeichen, Füllwörter
                   ("das ist", "ich glaube", "äh")
2. Alias           gepflegte Liste je Gebiet: "Amerika"→Nordamerika,
                   "England"→Vereinigtes Königreich, "Holland"→Niederlande
3. Kölner Phonetik gleicher Klang, andere Schreibung — für Deutsch
                   deutlich besser geeignet als Soundex
4. Levenshtein     auf den phonetischen Code, Abstand relativ zur Länge
5. Abstand zum     Nur annehmen, wenn der beste Treffer deutlich besser
   Zweitbesten     ist als der zweitbeste. Sonst rückfragen.
```

Drei Ausgänge statt zwei: **angenommen** · **„Meintest du Afrika?"** (mit
Vorlesen und Ja/Nein) · **„Sag es noch einmal"**. Der mittlere Ausgang ist
der wichtigste — er verwandelt eine Erkennungsschwäche in eine
Bestätigungsfrage, und die kann ein Kind beantworten.

**Das Risiko, ehrlich benannt.** `SpeechRecognition` in einer vom
Startbildschirm gestarteten iOS-App (Standalone-Modus) ist historisch
unzuverlässig gewesen; die Erkennung selbst läuft außerdem **über Apples
Server**, braucht also Netz und ist datenschutzrelevant (Kapitel 11). Ob es
auf *euren* Geräten in *diesem* Modus zuverlässig arbeitet, ist mit keinem
Dokument zu klären, sondern nur durch Ausprobieren. **Deshalb steht das an
allererster Stelle, als Meilenstein M0, vor jeder Zeile Spielcode.**

Falls M0 negativ ausgeht, greift eine Leiter statt eines Lochs:

| Stufe | Was |
|---|---|
| A | Web Speech API, automatische Bewertung — der Zielzustand |
| B | Aufnahme + Abspielen, **Erwachsener bestätigt** mit einem Tipp. Das Kind spricht trotzdem, der Lerneffekt bleibt; nur die Bewertung ist manuell. |
| C | Sprechen ohne Aufnahme („sag es laut!"), danach Zuordnen per Ziehen. Keine Mikrofonrechte nötig. |

Stufe B und C sind **kein Notbehelf**, sondern eigenständig sinnvolle
Betriebsarten — B, wenn ein Elternteil danebensitzt, C, wenn kein Netz da
ist. Sie werden ohnehin gebaut. A ist die Kür.

### 5.3 Vorlesen (Fiona, überall)

`speechSynthesis` mit deutscher Stimme, ausgelöst durch Antippen jedes
Namens. Läuft auf iOS lokal, ohne Netz, ohne Erlaubnisdialog.

Zwei Fallstricke: Die Stimmenliste ist beim ersten Laden **leer** und füllt
sich erst per `voiceschanged` — wer sie sofort abfragt, bekommt nichts. Und
iOS gibt Sprachausgabe erst nach einer echten Nutzergeste frei; deshalb wird
sie beim ersten Tipp im Spiel einmal stumm angeworfen, um sie zu entsperren.

### 5.4 Tippen (Lea)

Freies Textfeld, `inputmode="text"`, `autocorrect="off"`,
`autocapitalize="off"`, `spellcheck="false"` — **die Rechtschreibung ist der
Lerninhalt, sie darf nicht vom Gerät erledigt werden.** Das ist der wichtigste
Satz dieses Abschnitts.

Bewertung, gestuft:

| Eingabe | Urteil | Rückmeldung |
|---|---|---|
| `Bayern` | richtig | Punkt, weiter |
| `bayern` | richtig, Hinweis | „Fast! Länder schreibt man groß." |
| `Bayren` | fast (Abstand 1) | Wort erscheint mit der falschen Stelle markiert, zweiter Versuch, halbe Punkte |
| `Baden Württemberg` | fast | „Fast! Da fehlt ein Bindestrich." |
| `Hessen` bei Bayern | falsch | Auflösung mit Vorlesen |

Die Umlautfrage ist geregelt: `ae/oe/ue/ss` gelten als „fast" mit
ausdrücklichem Hinweis, nicht als falsch — Lea tippt auf einer Bildschirm-
tastatur, und die Umlaute liegen dort hinter einem langen Halten.

Für eine Drittklässlerin ist der Bindestrich in „Baden-Württemberg" und
„Mecklenburg-Vorpommern" ein echter Lerninhalt. Die Bewertung nennt ihn
deshalb beim Namen, statt nur „falsch" zu sagen.

---

## 6. Aufgabenauswahl: Leitner, nicht Zufall

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
das lässt sich die Lernlogik nur behaupten, nicht beweisen (Towerfront,
Eiserne Regel 5).

---

## 7. Leistung — Budgets, nicht Absichten

Eine Leistungsangabe ohne Messstelle ist keine (Towerfront, Eiserne Regel 12).
Deshalb: Messgerät **iPad (Zielgerät)**, kalter Start, WLAN, aus dem
Startbildschirm-Symbol heraus.

| Größe | Grenze | Wie geprüft |
|---|---|---|
| Bündel gesamt, gzip | **< 400 KB** | Tor `budget`, bricht die Kette |
| davon Geometrie | < 150 KB | Tor `budget` |
| Erstes Bild, kalt | < 1,5 s | Playwright + Lighthouse in CI |
| Start, zweites Mal (offline) | < 0,5 s | Tor `pwa` |
| Ziehen | 60 Bilder/s durchgehend | Tor `browser`, Bilddauern gemessen |
| Antwort auf Tipp | < 100 ms | Tor `browser` |
| Sprache: Tipp bis Urteil | < 2,5 s | von Hand, M4 |

**Wo die Bilder pro Sekunde tatsächlich verloren gehen** — nicht raten,
sondern von vornherein vermeiden:

1. Zustandsänderung während `pointermove`. Deshalb 5.1: direkt am Element.
2. `filter: drop-shadow` auf einem SVG-Pfad mit 3000 Punkten. Schatten werden
   gebacken oder weggelassen.
3. Alle 16 Bundesländer gleichzeitig neu einfärben, weil ein Etikett schwebt.
   Stattdessen: eine CSS-Klasse am Elternelement, das Einfärben macht der
   Stil.
4. Sehr lange `d`-Attribute im DOM anfassen. Sie werden einmal gesetzt und
   nie wieder — Zustände laufen ausschließlich über Klassen und `transform`.

Die Zahlen aus einer CI-Umgebung ohne Grafikkarte werden **nicht** als
Gerätezahlen ausgegeben. Sie taugen als Ratsche („nicht schlechter als
gestern"), nicht als Aussage über das iPad. Diese Unterscheidung hat
Towerfront fünf Runden gekostet; hier steht sie von Anfang an.

---

## 8. Profile, Fortschritt, Motivation

### 8.1 Profile

Zwei Profile, in einem Tippen erreichbar (großes Bild, großer Name — kein
Anmelden, kein Passwort). Ein Profil ist ein Datensatz aus **Fähigkeits-
schaltern**, nicht ein Sonderfall im Code:

```ts
{
  id: 'fiona',
  name: 'Fiona',
  eingabewege: ['ziehen', 'sprechen'],
  vorlesenImmer: true,
  kandidatenMax: 4,          // wieviel gleichzeitig zur Wahl steht
  sitzungLaenge: 8,          // Aufgaben
  rechtschreibungStreng: false,
  ebenenFrei: [1, 3],
}
```

Ein drittes Kind, ein Gastprofil, eine Erwachsenenrunde: ein Datensatz mehr.

### 8.2 Fortschritt sieht für beide anders aus

Fiona misst **Wiedererkennen und Aussprache**, Lea misst **Vollständigkeit und
Rechtschreibung**. Beide Balken heißen „geschafft", zählen aber Verschiedenes.
Und: **die Profile werden nie miteinander verglichen.** Kein Bestenlisten-
bildschirm, keine gemeinsame Punktzahl. Zwei Schwestern mit zwei Jahren
Abstand brauchen kein Werkzeug, das ihnen täglich vorrechnet, wer weiter ist.

### 8.3 Motivation ohne Druck

- **Sterne** je Sitzung (1–3), nie null.
- **Sammlung:** je gemeistertem Gebiet ein Aufkleber im „Forscherbuch".
  Sichtbarer Fortschritt, der bleibt.
- **Kein Zeitdruck.** Keine Uhr, kein Countdown. Zeit wird gemessen (fürs
  Protokoll), aber nie angezeigt und nie bewertet.
- **Keine Leben, kein Verlieren.** Eine Sitzung endet immer gut.
- **Klänge**, kurz und freundlich, mit Ausschalter. Wichtig: ein
  *falsch*-Klang darf nicht wie ein Fehler klingen, sondern wie ein „hm,
  nochmal".

---

## 9. Barrierefreiheit und kindgerechte Bedienung

Für Sechsjährige ist Barrierefreiheit keine Zusatzfunktion, sondern die
Grundbedienung.

| Regel | Grenze | Tor |
|---|---|---|
| Trefferflächen | ≥ 44 × 44 pt, ≥ 8 pt Abstand | `beruehrung` |
| Schriftgröße | ≥ 20 px, im Fiona-Profil ≥ 24 px | `lesbarkeit` |
| Kontrast | ≥ 4,5:1 (WCAG AA) | `lesbarkeit` |
| Farbe allein trägt nie Bedeutung | richtig/falsch zusätzlich über Form, Bewegung, Klang | Prüfung von Hand |
| Jeder Text vorlesbar | ausnahmslos | Tor `vorlesen` |
| Querformat und Hochformat | beide benutzbar, keine Drehsperre | Tor `browser` |
| Bewegung reduzierbar | `prefers-reduced-motion` respektiert | Tor `browser` |

Zwei Punkte, die man leicht übersieht: **Rot-Grün** taugt bei einem Jungen in
der Familie oder einem Besuchskind nicht als einziges Signal — richtig und
falsch unterscheiden sich hier immer auch in Form und Ton. Und **Linkshänder**:
die Etikettenliste muss auf die andere Seite umschaltbar sein, sonst verdeckt
die ziehende Hand genau das Gebiet, auf das sie zielt.

---

## 10. Prüfbarkeit — die Torkette

Übernommen aus Towerfront, weil es dort funktioniert hat: **eine Kette, die
vor jedem Einchecken grün sein muss, und die die Auslieferung blockiert.**

```
tsc → lint → inhalt → geo → lizenz → vergleich → einheit
    → beruehrung → lesbarkeit → vorlesen → budget
    → bild → browser → pwa → offline → doku → bericht
```

Die Tore, die es in Towerfront so nicht gibt und die hier den Unterschied
machen:

**`inhalt`** — Zod über alle Daten. Jede ID einmalig. Jedes Gebiet hat einen
Namen, mindestens einen Alias, mindestens eine Aussprachevariante, einen
Elternknoten, der existiert. Kein Gebiet ohne Geometrie, keine Geometrie ohne
Gebiet. **Die Anzahl der Bundesländer wird gezählt und gegen eine Konstante
geprüft** — damit fällt auf, wenn beim Umbau eins verlorengeht.

**`geo`** — jeder Pfad ist geschlossen, hat Fläche > 0, sein Anker liegt
nachweislich *im* Pfad (Punkt-in-Polygon, nicht Schwerpunkt), und die
Vereinfachung weicht um höchstens 2 % Fläche ab.

**`vergleich`** — der wichtigste. Ein gepflegter Korpus echter Kinderantworten
je Gebiet, und zwar in **beide** Richtungen:

```
Treffer:    "austraaljen", "austraalien", "australiä"   → Australien ✓
Nichttreffer: "afrika", "asien", "österreich"           → Australien ✗
```

Das Tor misst Trefferquote (Ziel ≥ 90 %) **und Falsch-Positiv-Rate**
(Ziel ≤ 2 %). Ohne die zweite Zahl ist die Prüfung wertlos: ein Abgleich, der
alles annimmt, hat 100 % Trefferquote und lehrt nichts. *Eine Prüfung, die nie
etwas meldet, ist kein Beweis* — Towerfront, Eiserne Regel 5, hier
buchstäblich anwendbar.

**`browser`** — Playwright, echte Chromium-Instanz, **iPhone quer, iPhone
hoch, iPad**. Zieht ein Etikett mit echten Pointer-Events über den
Bildschirm und prüft, ob es ankommt. Prüft, dass man vom Startbildschirm bis
zur ersten richtigen Antwort kommt. Prüft Überdeckungen. Das ist das einzige
Tor, das das Spiel wirklich *spielt*.

**`pwa` / `offline`** — Manifest vorhanden und gültig, Symbole in allen
Größen, `apple-touch-icon` gesetzt, Service Worker registriert; zweiter Start
ohne Netz funktioniert vollständig, außer dem Sprachmodus.

**`doku`** — die Fassungsnummer in diesem Dokument gegen die im Code, wie in
Towerfront. Dort stand einmal 61 Fassungen lang die falsche Zahl.

**Gegenproben (`proben`).** Jedes Tor bekommt mindestens eine eingebaute
Fehlerinjektion, die es fangen *muss*. Und jede Probe prüft zuerst, ob ihr
Eingriff überhaupt angekommen ist — in Towerfront sind drei von zehn genau
daran gescheitert, und ein nicht angekommener Eingriff sieht aus wie ein
bestandenes Tor.

**Was kein Tor leistet.** Ob es Spaß macht. Ob Fiona den Mikrofonknopf
findet. Ob Lea nach zwei Wochen noch spielt. Dafür gibt es nur: hinsetzen,
zusehen, nichts sagen. Nach M3 und nach M5 je einmal, verpflichtend, mit
schriftlicher Notiz. Elf von 57 Befunden kamen in Towerfront aus genau
solchem Hinsehen.

---

## 11. Audit-Fähigkeit

Drei verschiedene Dinge tragen diesen Namen. Alle drei sind gemeint.

### 11.1 Lern-Audit — was die Kinder tatsächlich können

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
hört — und daraus wächst der Alias-Korpus aus 5.2 mit echten Daten statt mit
Vermutungen. Das ist der Rückkanal, der den Sprachmodus über die Zeit besser
macht.

**Elternbereich**, hinter einer vierstelligen PIN (nicht gegen Angreifer —
gegen neugierige Achtjährige):

- Trefferquote je Gebiet, farbig, sofort lesbar
- „Wackelkandidaten": die fünf Gebiete mit den meisten Fehlversuchen
- Verlauf über Wochen, je Profil
- **Ausspracheliste**: was gesagt wurde vs. was verstanden wurde
- Ausfuhr als CSV und JSON, ein Tipp
- **Löschen**: alles zu einem Profil, unwiderruflich, ein Tipp

### 11.2 Technisches Audit — welche Fassung läuft hier eigentlich?

Der Klassiker bei Startbildschirm-Apps: das iPad zeigt seit sechs Wochen eine
alte Fassung und niemand merkt es. Dagegen:

- Jeder Bau stempelt **Commit-SHA, Bauzeitpunkt und Fassungsnummer** ins
  Bündel.
- Der Elternbereich zeigt sie an. „Welche Fassung läuft?" ist damit in fünf
  Sekunden beantwortbar, auf dem Gerät selbst.
- Der Service Worker aktualisiert von allein (`autoUpdate`) und zeigt beim
  Fund einer neuen Fassung einen Streifen: „Neue Fassung — jetzt laden".
- **Auf dem Startbildschirm nie ein Aktualisieren-Knopf im Browser.** Ohne
  diesen Mechanismus gibt es *keinen* Weg, eine hängende Fassung loszuwerden,
  außer das Symbol zu löschen und neu anzulegen. Deshalb ist er kein Beiwerk,
  sondern ein Tor (`pwa`).
- Jeder CI-Lauf hinterlegt seinen Torbericht als Artefakt. Die Frage „war die
  Kette grün, als das ausgeliefert wurde?" ist nachträglich beantwortbar.

### 11.3 Datenschutz-Audit — was verlässt das Gerät

| Was | Wohin | Wann |
|---|---|---|
| Fortschritt, Protokoll, Profile | **nirgendwohin** — IndexedDB, lokal | nie |
| Programm und Karten | von GitHub Pages **her**, nicht hin | beim Aktualisieren |
| **Sprachaufnahme** | **Apple** (Web Speech API) | nur bei aktivem Sprachmodus und gedrücktem Knopf |
| Nutzungsdaten, Telemetrie, Werbung | — | **gibt es nicht** |

Kein Konto, keine Anmeldung, kein Cookie, keine fremde Schriftart, kein CDN,
kein Analysewerkzeug. Die Inhaltssicherheitsrichtlinie (CSP) verbietet
ausgehende Verbindungen technisch — nicht nur als Absicht, sondern als Regel,
die der Browser durchsetzt. Ein Tor prüft, dass die CSP im ausgelieferten
HTML steht.

Die Zeile mit Apple ist die einzige, die Aufmerksamkeit braucht: **die
Spracherkennung läuft nicht auf dem Gerät.** Sie steht ausdrücklich im
Elternbereich, der Sprachmodus ist **abschaltbar** und im Zweifel per
Vorgabe aus, das Mikrofon läuft nur solange der Knopf gedrückt ist, und ein
roter Punkt zeigt sichtbar an, wenn es hört. Nie Dauerlauschen, nie
Schlüsselwort-Erkennung.

---

## 12. Auslieferung

### 12.1 Der Weg von hier auf das iPad

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

### 12.2 Was einzurichten ist (einmalig, durch euch)

1. **Repository anlegen** — Vorschlag: `lernkiste`, privat oder öffentlich.
   Öffentlich ist einfacher: GitHub Pages für private Repositories braucht
   ein bezahltes Konto.
   *Falls privat gewünscht:* Cloudflare Pages oder Netlify tun dasselbe
   kostenlos, der Rest des Konzepts bleibt unverändert.
2. **Pages einschalten**: Settings → Pages → Source = **GitHub Actions**.
3. Mir Schreibrecht auf dem Zweig geben. Dann läuft alles Weitere von hier.

Kein Geheimnis, kein Zugriffsschlüssel, kein Fremddienst.

### 12.3 Das Symbol auf dem Startbildschirm

```html
<link rel="apple-touch-icon" href="/icon-180.png">   <!-- 180×180, ohne Alpha -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Lernkiste">
<meta name="viewport" content="...,viewport-fit=cover,user-scalable=no">
<link rel="manifest" href="/manifest.webmanifest">
```

Dazu `apple-touch-startup-image` in allen Gerätegrößen — sonst blitzt beim
Start eine weiße Fläche. Towerfront hat dafür bereits ein Werkzeug
(`npm run appsymbol`), das hier übernommen wird.

**Der Weg für euch, einmal je Gerät:** Safari öffnen (nicht Chrome — nur
Safari kann das auf iOS), Adresse aufrufen, Teilen-Symbol, „Zum Home-
Bildschirm". Danach startet es ohne Adressleiste, im Vollbild, wie eine App.

**Fallstricke, die genau einmal wehtun:** `viewport-fit=cover` plus
`env(safe-area-inset-*)`, sonst liegt der Zurück-Knopf unter der Notch. Und
das Symbol darf keinen Alphakanal haben, sonst wird der durchsichtige Teil
auf iOS schwarz.

### 12.4 Zweigmodell

`main` ist immer auslieferbar. Gearbeitet wird auf `claude/*`-Zweigen,
zusammengeführt wird über PRs, die die Torkette laufen lassen. Ein grüner
Push auf `main` liefert aus — ein roter nicht.

---

## 13. Offene Entscheidungen

Fünf Punkte. Die ersten zwei blockieren nichts, die anderen drei brauchen
eine Antwort, bevor der jeweilige Meilenstein beginnt.

**E1 · Die vierte Ebene.** Der Auftragstext bricht mitten im Satz ab
(„*Als vierte Ebene können wir dann noch Bundesländer und die*"). Angenommen:
**Bundesland → Landeshauptstadt**, optional erweitert um **Bayern → sieben
Regierungsbezirke**. Bitte bestätigen oder ergänzen.

**E2 · 16 statt 17 Bundesländer.** Das Konzept rechnet mit 16. Falls mit „17"
etwas Bestimmtes gemeint war (etwa Bayern zusätzlich als eigenes Feld, oder
die Bundeshauptstadt separat), bitte sagen — es ist eine Datenzeile, keine
Änderung.

**E3 · Türkei und Haiti.** Europa nach reiner Einwohnerzahl enthielte die
**Türkei** statt Italiens, Nordamerika **Haiti** statt Kubas. Der Entwurf
weicht in beiden Fällen bewusst ab (Kapitel 3.4). Reine Zahl oder
pädagogische Auswahl?

**E4 · Antarktika für Fiona.** Sieben Kontinente ist die Schulzahl. Ob eine
Erstklässlerin „Antarktika" als achtes Wort neben sechs anderen braucht, ist
eine Erziehungs-, keine Technikfrage. Der Entwurf hat es drin, weil der
Umriss unverwechselbar ist — also ein leichter Treffer, kein schwerer.

**E5 · Repository öffentlich oder privat.** Beeinflusst nur, ob GitHub Pages
kostenlos nutzbar ist (Kapitel 12.2).

---

## 14. Meilensteine

Jeder mit einem Abnahmekriterium, das man **hinsehen** oder **messen** kann —
nicht mit einem, das man behaupten kann.

### M0 · Machbarkeit (zuerst, vor allem anderen)

Eine einzelne HTML-Seite, ausgeliefert über Pages, auf euren echten Geräten
vom Startbildschirm gestartet. Sie prüft vier Dinge und schreibt das Ergebnis
auf den Bildschirm:

1. Nimmt `webkitSpeechRecognition` im Standalone-Modus deutsche Sprache an?
2. Zieht ein Etikett flüssig mit Pointer Events über ein SVG?
3. Überlebt IndexedDB einen Neustart und ein paar Tage?
4. Aktualisiert sich der Service Worker sichtbar?

**Abnahme:** Vier Zeilen Ja/Nein aus Fionas iPad und eurem iPhone. Punkt 1
entscheidet über Stufe A, B oder C aus 5.2 — und damit über M4.

*Das ist der einzige Meilenstein, bei dem ein „Nein" kein Fehler ist. Er ist
dafür da, das Nein früh zu finden, statt in M4.*

### M1 · Gerüst und Auslieferung

Repository, Vite, Svelte, PWA, GitHub Actions, Pages, Symbole, Startbilder,
leere Torkette mit `tsc`, `lint`, `budget`, `pwa`.

**Abnahme:** Auf iPhone und iPad liegt ein Symbol. Es öffnet eine leere, aber
echte App im Vollbild. Ein Push von hier verändert sie binnen vier Minuten
sichtbar, ohne dass jemand am Gerät etwas tut.

### M2 · Kartenpipeline

`tools/geo-backen.ts`, Natural Earth und BKG hinein, `src/geo/*.ts` heraus.
Tore `geo` und `lizenz`.

**Abnahme:** Sieben Kontinente, 30 Länder und 16 Bundesländer liegen als
SVG-Pfade vor, alle Tore grün, Geometrie unter 150 KB gzip. Ein Bild aller
Umrisse nebeneinander — angesehen, nicht nur gemessen.

### M3 · Ebene 1, Ziehen, beide Profile

Profilwahl, Kontinentbildschirm, Ziehen, Bewertung, Sterne, Vorlesen,
Ablage. Tore `inhalt`, `beruehrung`, `lesbarkeit`, `browser`, `bild`.

**Abnahme, zweiteilig — beides muss zutreffen:**
- Torkette grün.
- **Fiona ordnet vier Kontinente zu, ohne dass jemand ihr hilft.** Dabei
  wird zugesehen und nichts gesagt. Was auffällt, wird aufgeschrieben.

### M4 · Sprechen und Tippen

Sprachweg für Fiona (Stufe aus M0), Tastaturweg für Lea, Abgleichmodul,
Korpus, Tor `vergleich`.

**Abnahme:** Fiona spricht zehn Kontinentnamen; mindestens acht werden richtig
zugeordnet, keiner falsch angenommen. Lea schreibt zehn Namen und bekommt bei
jedem Fehler eine Rückmeldung, die sagt *was* falsch war — nicht nur *dass*.

### M5 · Ebenen 2 und 3

30 Länder, 16 Bundesländer, Ebenenwahl, Leitner-Logik, Sammlung.

**Abnahme:** Torkette grün, **Bremen ist auf dem iPhone quer sicher
treffbar** (fünf Versuche, fünf Treffer), und Lea schafft eine vollständige
Bundesländer-Runde in unter zehn Minuten.

### M6 · Elternbereich, Audit, Ebene 4

Protokollauswertung, PIN, Ausfuhr, Löschen, Fassungsanzeige, Ebene 4 gemäß E1.

**Abnahme:** Der Elternbereich beantwortet ohne Nachfrage: *Was kann Lea
noch nicht? Wie hört das Gerät Fionas Aussprache? Welche Fassung läuft auf
diesem iPad?* Und: die Ausfuhr lässt sich in einer Tabellenkalkulation
öffnen.

---

## 15. Risiken

| | Risiko | Wie wahrscheinlich | Gegenmaßnahme |
|---|---|---|---|
| R1 | Spracherkennung im iOS-Standalone unbrauchbar | mittel | **M0 klärt es vorab**, Leiter A/B/C aus 5.2 |
| R2 | IndexedDB verliert Daten (iOS-Speicherräumung) | gering | Ausfuhr im Elternbereich; Verlust kostet Fortschritt, nie den Zugang |
| R3 | Kleinstaaten nicht treffbar | **hoch, wenn nichts geschieht** | Entkoppelte Trefferfläche 4.3, Tor `beruehrung` **vor** M5 |
| R4 | Kinder verlieren nach zwei Wochen die Lust | hoch — das übliche Schicksal von Lernspielen | Sammlung, kurze Sitzungen, Leitner statt Wiederholung; **und Zusehen statt Vermuten** |
| R5 | Fassung bleibt auf dem iPad hängen | mittel | 11.2, Tor `pwa` |
| R6 | Sprachabgleich nimmt alles an und lehrt nichts | mittel | Falsch-Positiv-Rate im Tor `vergleich` — die Zahl, die es verhindert |
| R7 | Umfang wächst („noch ein Fach, noch eine Ebene") | hoch | Modulfuge 3.5; nichts wird gebaut, was nicht in einem Meilenstein steht |

---

## 16. Was als Nächstes passiert

Sobald **E1 bis E5** beantwortet sind (Kapitel 13) und das Repository steht
(12.2), beginnt **M0**. M0 ist eine einzelne Seite und in einer Runde fertig;
sein Ergebnis entscheidet über die Form von M4 und damit über die einzige
wirklich offene Stelle im ganzen Entwurf.

Alles davor — dieses Dokument — ist damit abgeschlossen.
