export type EnemyId =
  | 'crawler' | 'runner' | 'brute' | 'titan' | 'flyer' | 'splitter' | 'splitling'
  | 'infantry';

export interface SplitRule {
  into: EnemyId;
  count: number;
  /** Anteil der Lebenspunkte des Erzeugers, den jedes Bruchstueck erhaelt. */
  hpFactor: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number;   // Pixel pro Sekunde
  bounty: number;  // Gold beim Toeten
  leak: number;    // Schaden am Herzkristall beim Durchkommen
  radius: number;
  armor: number;   // Flacher Abzug pro Treffer, mindestens 1 Schaden bleibt
  slowResist: number; // 0..1, wie stark die Bremse abgeschwaecht wird
  /** Fliegt die Luftlinie statt dem Pfad zu folgen. Bodengebundene Waffen
   *  - der Moerser - erreichen ihn nicht. */
  flying?: boolean;
  /** Das Bild ist eine Aufsicht und wird zur Laufrichtung gedreht.
   *
   *  Die uebrigen Gegner sind Seitenansichten und werden nur gespiegelt - ein
   *  Fahrzeug in Dreiviertelansicht kippt beim Drehen. Eine Aufsicht kippt
   *  nicht, sie dreht sich richtig mit. */
  /** Zerfaellt beim Tod. */
  split?: SplitRule;
  boss?: boolean;
  /** Die Grundfarbe der FRAKTION - fuer alle acht dieselbe Familie.
   *
   *  Sie liegt seit v168 im Gunmetal-Band `#3A414C` bis `#4E5865` (siehe
   *  Bildauftrag 4.1). Vorher trug jeder Gegner einen eigenen Buntton -
   *  acht unabhaengige Farben, und keine Familie war lesbar (TF-024).
   *
   *  Sie darf NICHT unterscheiden. Wer eine Auskunft braucht, welcher
   *  Gegner das ist, nimmt `trim` - siehe dort. */
  body: string;
  /** Der Akzent, und er traegt die ROLLE, nicht die Art.
   *
   *  Zwei Gegner derselben Rolle tragen denselben Akzent: Schleicher und
   *  Spaeher sind beide leicht und schnell, Koloss und Spalter beide
   *  gepanzert. Das ist gewollt - unterschieden werden sie an der FORM, und
   *  die Farbe sagt, wogegen sie zu spielen sind.
   *
   *  Alles, was auseinanderhalten muss, liest diesen Wert: der Funke beim
   *  Tod, die Truemmer, der Ring, der Punkt in der Wellenvorschau. Bis v168
   *  lasen zwei davon `body` - und mit einer gemeinsamen Grundfarbe waeren
   *  sie an dem Tag alle grau geworden. */
  trim: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  crawler: {
    id: 'crawler', name: 'Schleicher',
    hp: 34, speed: 114, bounty: 2, leak: 1, radius: 20, armor: 0, slowResist: 0,
    // leicht und schnell - Signalgelb
    body: '#3A414C', trim: '#EFC94C',
  },
  infantry: {
    id: 'infantry', name: 'Infanterie',
    hp: 52, speed: 96, bounty: 3, leak: 1, radius: 24, armor: 1, slowResist: 0.1,
    // Infanterie - Olivgruen, auch im Grundton angedeutet
    body: '#434B44', trim: '#7A8A5C',
  },
  runner: {
    id: 'runner', name: 'Späher',
    hp: 24, speed: 206, bounty: 2, leak: 1, radius: 17, armor: 0, slowResist: 0,
    // leicht und schnell - derselbe Akzent wie der Schleicher
    body: '#454E5A', trim: '#EFC94C',
  },
  brute: {
    id: 'brute', name: 'Koloss',
    hp: 150, speed: 74, bounty: 7, leak: 3, radius: 29, armor: 3, slowResist: 0.3,
    // gepanzert - Stahlblau
    body: '#414954', trim: '#5B8FD0',
  },
  flyer: {
    id: 'flyer', name: 'Gleiter',
    hp: 62, speed: 142, bounty: 4, leak: 2, radius: 19, armor: 0, slowResist: 0.2,
    flying: true,
    // Luft - Tuerkis
    body: '#3E4954', trim: '#3ED9A4',
  },
  splitter: {
    id: 'splitter', name: 'Spalter',
    hp: 130, speed: 94, bounty: 6, leak: 2, radius: 26, armor: 1, slowResist: 0.15,
    split: { into: 'splitling', count: 2, hpFactor: 0.3 },
    // Traeger - Orange. NICHT "gepanzert" wie der Koloss, obwohl der
    // Bildauftrag ihn zuerst dorthin sortiert hatte.
    //
    // Gemessen ueberdecken sich die Silhouetten von Koloss und Spalter zu
    // 0,76, die Art Bible erlaubt 0,65 - mit demselben Akzent waeren die
    // beiden im Feld an NICHTS mehr zu unterscheiden. Bis v167 trug das die
    // Farbe allein (Stahlblau gegen Orange), und die Formaehnlichkeit fiel
    // niemandem auf.
    //
    // Die Rolle ist ohnehin die ehrlichere Einteilung: der Koloss ist zaeh,
    // der Spalter zerfaellt in zwei Spaene - das sind zwei verschiedene
    // Dinge, gegen die man spielt, und die Farbe soll genau das sagen.
    body: '#4E5865', trim: '#FF7A1A',
  },
  splitling: {
    id: 'splitling', name: 'Span',
    hp: 40, speed: 178, bounty: 1, leak: 1, radius: 14, armor: 0, slowResist: 0,
    // Bruchstueck - Blassgelb
    body: '#4A5260', trim: '#EFE24C',
  },
  titan: {
    id: 'titan', name: 'Leerentitan',
    hp: 682, speed: 53, bounty: 48, leak: 5, radius: 34, armor: 6, slowResist: 0.55,
    boss: true,
    // Boss - Purpur, der einzige Ton, den sonst niemand traegt
    body: '#3F3F4E', trim: '#8B5CF6',
  },
};
