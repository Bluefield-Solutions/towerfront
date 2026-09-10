/** Dauerhafte Verbesserungen.
 *
 *  Sterne aus abgeschlossenen Laeufen werden zu Splittern, Splitter zu
 *  bleibenden Vorteilen. Das ist der Unterschied zwischen "ich habe die Karte
 *  geschafft" und "ich komme wieder": ohne etwas, das bleibt, ist jeder Lauf
 *  eine Insel.
 *
 *  Bewusst klein gehalten und je Verbesserung nur einmal kaufbar. Ein
 *  Fortschritt, der stark genug ist, den Schwierigkeitsgrad zu ersetzen,
 *  entwertet die Schwierigkeitsgrade. */
export type PerkId = 'gold' | 'crystal' | 'damage' | 'cooldown' | 'refund';

export interface PerkDef {
  id: PerkId;
  name: string;
  blurb: string;
  cost: number;
}

/** **Die Preise stehen seit v314 in Erfahrung, nicht in Sternen** (S-N1-05).
 *
 *  Die Sternwertung ist entfallen, und mit ihr die Waehrung. Erfahrung gibt es
 *  ohnehin (S-N1-04) und sie kauft schon Karten; ein zweites Konto daneben
 *  waere genau der zweite Weg, den diese Story schliesst.
 *
 *  **Umgerechnet, nicht neu erfunden:** die Rangfolge 2/3/4/3/2 bleibt, der
 *  Massstab kommt von den Karten (500 bis 900). Ein Stern entspricht 200, also
 *  400/600/800/600/400 - zusammen 2800. Ein guter Lauf bringt gemessen rund
 *  1300 (10 je Welle, 100 je Abschnitt, 300 fuers Durchbringen), also kosten
 *  alle fuenf gut zwei Laeufe. Vorher waren es 14 Sterne bei hoechstens 12
 *  erreichbaren - sie waren zusammen gar nicht zu haben. */
export const PERKS: Record<PerkId, PerkDef> = {
  gold: {
    id: 'gold', name: 'Volle Truhe', cost: 400,
    blurb: '+35 Startgold. Ein halber Turm mehr in der Eröffnung.',
  },
  crystal: {
    id: 'crystal', name: 'Harter Kern', cost: 600,
    blurb: '+15 % Kristall. Mehr Luft für Fehler.',
  },
  damage: {
    id: 'damage', name: 'Geschliffen', cost: 800,
    blurb: '+4 % Schaden auf alle Türme.',
  },
  cooldown: {
    id: 'cooldown', name: 'Kurzer Atem', cost: 600,
    blurb: 'Fähigkeiten sind 10 % früher wieder bereit.',
  },
  refund: {
    id: 'refund', name: 'Sauberer Abbau', cost: 400,
    blurb: 'Verkauf bringt 80 % statt 70 % zurück.',
  },
};

export const PERK_ORDER: PerkId[] = ['gold', 'crystal', 'refund', 'cooldown', 'damage'];

/** Die zusammengerechnete Wirkung aller gekauften Verbesserungen. */
export interface PerkEffect {
  goldBonus: number;
  /** Anteil des Startkristalls, nicht absolute Punkte.
   *
   *  Vorher standen hier feste +2. Als der Kristall von 20 auf 60 stieg, war
   *  die Verbesserung von 10 % auf 3,3 % gefallen - sie kostete weiter drei
   *  Sterne und tat praktisch nichts. Ein Vorteil, der an einer anderen
   *  Einstellung haengt, muss mit ihr wachsen. */
  livesShare: number;
  damageMul: number;
  cooldownMul: number;
  refund: number;
}

export const NO_PERKS: PerkEffect = {
  goldBonus: 0, livesShare: 0, damageMul: 1, cooldownMul: 1, refund: 0.7,
};

export function perkEffect(owned: readonly string[]): PerkEffect {
  const has = (id: PerkId) => owned.includes(id);
  return {
    goldBonus: has('gold') ? 35 : 0,
    livesShare: has('crystal') ? 0.15 : 0,
    damageMul: has('damage') ? 1.04 : 1,
    cooldownMul: has('cooldown') ? 0.9 : 1,
    refund: has('refund') ? 0.8 : 0.7,
  };
}

export const ALL_PERKS: PerkEffect = perkEffect(PERK_ORDER);

/** **Die Sternvergabe ist in v314 entfallen** (S-N1-05).
 *
 *  `starsFor` rechnete aus Sieg und uebrigem Kristall eine Wertung von null
 *  bis drei. Die Sternwertung ist mit den Graden gegangen; was ein Lauf wert
 *  war, sagt jetzt der Kristall am Ende und die Erfahrung, die er
 *  ausschuettet.
 *
 *  Die Schwellen standen zuletzt bei 75 und 40 Prozent des Kristalls und sind
 *  hier vermerkt, weil sie gemessen waren: 90 und 55 stammten aus der Zeit mit
 *  20 Kristall, und mit 60 waren drei Sterne auf zwei von drei Karten
 *  unerreichbar. */

