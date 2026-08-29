export type AbilityId = 'meteor' | 'freeze' | 'bollwerk' | 'ernte';

/** Gezielt: der Spieler tippt eine Stelle an. Sofort: wirkt auf das ganze Feld. */
export type AbilityKind = 'aimed' | 'instant';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  blurb: string;
  kind: AbilityKind;
  cooldown: number;   // Sekunden
  color: string;
  key: string;        // Tastenkuerzel am Schreibtisch
  radius?: number;    // Wirkradius bei gezielten Faehigkeiten
  delay?: number;     // Sekunden bis zum Einschlag
  damage?: number;
  slow?: number;
  slowTime?: number;
  /** Gold, das die Faehigkeit einbringt. */
  gold?: number;
  /** Wieviele Karten gewonnen sein muessen, damit es sie gibt (C18).
   *
   *  Nicht "welche Karte schaltet sie frei": eine Zuordnung waere bei der
   *  vierten Karte still falsch, und Karte 4 steht als C24 im Verzeichnis.
   *  Gezaehlt werden die je gewonnenen Karten, ganz gleich welche und auf
   *  welchem Grad - damit gilt S6 des Abgleichs von selbst.
   *
   *  Genau eine Faehigkeit muss hier 0 tragen, sonst faengt der Spieler mit
   *  leeren Haenden an; und keine darf mehr verlangen, als es Karten gibt.
   *  Beides prueft `tools/guards.ts`. */
  braucht: number;
}

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  meteor: {
    id: 'meteor', name: 'Meteor',
    blurb: 'Ruft einen Brocken auf eine Stelle. Trifft Boden und Luft.',
    kind: 'aimed', cooldown: 40, color: '#F08A3C', key: 'q',
    radius: 130, delay: 0.75, damage: 190,
    // Der Meteor steht von Anfang an da: die Einweisung fuehrt an ihm
    // vor, was eine Faehigkeit ueberhaupt ist (`tutorial.ts`), und S4 des
    // Abgleichs verlangt, dass die erste Karte ohne die anderen drei
    // vollstaendig ist.
    braucht: 0,
  },
  freeze: {
    id: 'freeze', name: 'Frostschlag',
    blurb: 'Legt sich über das ganze Feld und bremst alles für drei Sekunden.',
    kind: 'instant', cooldown: 32, color: '#7FE7E0', key: 'w',
    slow: 0.68, slowTime: 3, braucht: 1,
  },
  bollwerk: {
    id: 'bollwerk', name: 'Bollwerk',
    blurb: 'Riegelt eine Stelle ab. Wer hineinläuft, steht — Schaden macht es keinen.',
    kind: 'aimed', cooldown: 80, color: '#C9A0FF', key: 'e',
    radius: 150,
    // Voller Stopp statt Bremse: `slow: 1` heisst Tempo null.
    //
    // Das ist R4 aus dem Genre-Abgleich - etwas, das Gegner AUFHAELT statt
    // sie zu toeten. Und es ist bewusst dieselbe Mechanik wie beim
    // Frostschlag, nur zugespitzt: der Widerstand der Gegner
    // (`slowResist`) wirkt weiter, also steht ein Leerentitan kuerzer als
    // ein Schleicher. Ohne das waere die Faehigkeit gegen den Boss genauso
    // stark wie gegen die kleinsten - und ein Halt, der alles gleich
    // behandelt, ist keine Entscheidung mehr.
    //
    // Warum keine eigene Turmsorte: der Ankerturm ist genau daran zweimal
    // gescheitert (S41). Ein Turm steht dauerhaft und bindet dauerhaft; die
    // Auslegung sprang bei 10 % Aenderung der Abklingzeit von 5 auf 20 von
    // 20 Punkten. Eine Faehigkeit hat einen Takt, und der Takt ist die
    // Schraube, an der sich das dosieren laesst.
    // Abklingzeit 80 s, durchprobiert statt geschaetzt (Regel 9). Bei 46 s
    // fielen die Verluste von drei Wellen auf eine und der Hinweis
    // `OFFEN (T15)` kam zurueck; bei 60 s riss der Moerser seine Zweige
    // auseinander; bei 100 s trug die letzte Welle gar nichts mehr.
    //
    //   Abkl  Dauer | Verlustverteilung
    //     60    2/3 | W13:6  W14:13  W15:5    Balance rot (Moerserzweige)
    //     80    2/3 | W13:9  W14:11  W15:9    sauber
    //    100    2/3 | W13:9  W14:18           OFFEN (T15)
    //
    // Die Dauer ist dabei fast wirkungslos - 2 s und 3 s messen gleich. Die
    // Schraube ist nicht, wie lange jemand steht, sondern wie oft man
    // absperren darf. Deshalb bleibt die Dauer bei 3 s wie beim
    // Frostschlag, und dosiert wird ueber den Takt.
    slow: 1, slowTime: 3, braucht: 2,
  },
  ernte: {
    id: 'ernte', name: 'Ernte',
    blurb: 'Bringt Gold statt Schaden. Wer knapp steht, kauft sich Zeit.',
    kind: 'instant', cooldown: 55, color: '#F2C14E', key: 'r',
    gold: 120, braucht: 3,
  },
};

export const ABILITY_ORDER: AbilityId[] = ['meteor', 'freeze', 'bollwerk', 'ernte'];
