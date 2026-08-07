export type AbilityId = 'meteor' | 'freeze';

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
}

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  meteor: {
    id: 'meteor', name: 'Meteor',
    blurb: 'Ruft einen Brocken auf eine Stelle. Trifft Boden und Luft.',
    kind: 'aimed', cooldown: 40, color: '#F08A3C', key: 'q',
    radius: 108, delay: 0.75, damage: 190,
  },
  freeze: {
    id: 'freeze', name: 'Frostschlag',
    blurb: 'Legt sich über das ganze Feld und bremst alles für drei Sekunden.',
    kind: 'instant', cooldown: 32, color: '#7FE7E0', key: 'w',
    slow: 0.68, slowTime: 3,
  },
};

export const ABILITY_ORDER: AbilityId[] = ['meteor', 'freeze'];
