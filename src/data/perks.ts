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

export const PERKS: Record<PerkId, PerkDef> = {
  gold: {
    id: 'gold', name: 'Volle Truhe', cost: 2,
    blurb: '+35 Startgold. Ein halber Turm mehr in der Eröffnung.',
  },
  crystal: {
    id: 'crystal', name: 'Harter Kern', cost: 3,
    blurb: '+15 % Kristall. Mehr Luft für Fehler, auf jedem Grad gleich viel wert.',
  },
  damage: {
    id: 'damage', name: 'Geschliffen', cost: 4,
    blurb: '+4 % Schaden auf alle Türme.',
  },
  cooldown: {
    id: 'cooldown', name: 'Kurzer Atem', cost: 3,
    blurb: 'Fähigkeiten sind 10 % früher wieder bereit.',
  },
  refund: {
    id: 'refund', name: 'Sauberer Abbau', cost: 2,
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

/** Sterne fuer einen abgeschlossenen Lauf.
 *
 *  Die Schwellen lagen bei 90 und 55 % - das stammte aus der Zeit mit 20
 *  Kristall, als ein guter Lauf fast verlustfrei war. Mit 60 Kristall kostet
 *  ein gutes Spiel regelmaessig die Haelfte, und drei Sterne waren auf zwei
 *  von drei Karten schlicht unerreichbar. Erreichbar heisst nicht leicht:
 *  die Simulation prueft, dass ein guter Lauf drei Sterne holen *kann* und
 *  ein knapper Sieg nur einen. */
export function starsFor(won: boolean, lives: number, maxLives: number): number {
  if (!won) return 0;
  const share = lives / Math.max(1, maxLives);
  if (share >= 0.75) return 3;
  if (share >= 0.4) return 2;
  return 1;
}
