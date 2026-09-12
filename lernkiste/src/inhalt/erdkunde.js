// Die Fakten. Kein Code, nur Daten - bewacht vom Tor `inhalt`.
//
// aussprache[] ist der Korpus fuer den Sprachabgleich: wie Kinder es sagen
// und wie eine Erkennung es hoert. Er waechst mit echten Aufnahmen (M4);
// was hier steht, ist die ERFUNDENE Haelfte - sie dient dem Einstellen,
// nicht dem Beweis (Befund L10).
//
// ablenker[] ist bei Ebene 4 das Eigentliche: fuenf Bundeslaender haben eine
// Hauptstadt, die NICHT ihre groesste Stadt ist. Dort sitzt der Irrtum, den
// fast jeder Erwachsene teilt.

export const STAND = { jahr: 2025, quelle: 'Natural Earth 1:10m / 1:50m, Einwohnerzahlen 2025' };

export const KONTINENTE = [
  { id:'europa', name:'Europa', aliasse:['Europäa'],
    aussprache:['euopa','oiropa','europa','eropa'], runde:1 },
  { id:'afrika', name:'Afrika', aliasse:[],
    aussprache:['afrikaa','afika','affrika'], runde:1 },
  { id:'australien', name:'Australien und Ozeanien', aliasse:['Australien','Ozeanien'],
    aussprache:['australjen','austraalien','australiä','aus straßen','australien'], runde:1 },
  { id:'suedamerika', name:'Südamerika', aliasse:['Sued Amerika'],
    aussprache:['süd amerika','suedamerika','südamerka'], runde:1 },
  { id:'nordamerika', name:'Nordamerika', aliasse:['Amerika','Nord Amerika'],
    aussprache:['nord amerika','amerika','nordamerka'], runde:2 },
  { id:'asien', name:'Asien', aliasse:[],
    aussprache:['asjen','aasien','asien'], runde:2 },
  { id:'antarktika', name:'Antarktika', aliasse:['Antarktis','Südpol'],
    aussprache:['antarktis','antaktika','antarktika'], runde:3,
    satz:'Hier wohnt niemand — nur Eis.' },
];

/** Ebene 2. rang 1..5; Fiona sieht 1..3, Lea 1..5. */
export const LAENDER = {
  asien:[
    { a3:'IND', name:'Indien', rang:1, aussprache:['indien','indjen'] },
    { a3:'CHN', name:'China', rang:2, aussprache:['china','kina','schina'] },
    { a3:'IDN', name:'Indonesien', rang:3, aussprache:['indonesien','indonesjen'] },
    { a3:'PAK', name:'Pakistan', rang:4, aussprache:['pakistan','packistan'] },
    { a3:'BGD', name:'Bangladesch', rang:5, aliasse:['Bangladesh'], aussprache:['bangladesch','bangladesh'] },
  ],
  afrika:[
    { a3:'NGA', name:'Nigeria', rang:1, aussprache:['nigeria','nigeeria'] },
    { a3:'ETH', name:'Äthiopien', rang:2, aliasse:['Aethiopien'], aussprache:['ätiopien','etiopien'] },
    { a3:'EGY', name:'Ägypten', rang:3, aliasse:['Aegypten'], aussprache:['ägüpten','egypten','ägypten'] },
    { a3:'COD', name:'DR Kongo', rang:4, aliasse:['Kongo','Demokratische Republik Kongo'], aussprache:['kongo','de er kongo'] },
    { a3:'TZA', name:'Tansania', rang:5, aliasse:['Tanzania'], aussprache:['tansania','tanzania'] },
  ],
  europa:[
    { a3:'RUS', name:'Russland', rang:1, aussprache:['russland','ruslant'],
      satz:'So groß, dass es auf zwei Kontinente passt.' },
    { a3:'DEU', name:'Deutschland', rang:2, aussprache:['deutschland','doitschland'] },
    { a3:'GBR', name:'Vereinigtes Königreich', rang:3, aliasse:['England','Großbritannien','Britannien'],
      aussprache:['england','großbritannien','vereinigtes königreich'] },
    { a3:'FRA', name:'Frankreich', rang:4, aussprache:['frankreich','frangreich'] },
    { a3:'ITA', name:'Italien', rang:5, aussprache:['italien','italjen'] },
  ],
  nordamerika:[
    { a3:'USA', name:'USA', rang:1, aliasse:['Vereinigte Staaten','Amerika'], aussprache:['u es a','usa','amerika'] },
    { a3:'MEX', name:'Mexiko', rang:2, aliasse:['Mexico'], aussprache:['mexiko','mexico'] },
    { a3:'CAN', name:'Kanada', rang:3, aliasse:['Canada'], aussprache:['kanada','canada'] },
    { a3:'GTM', name:'Guatemala', rang:4, aussprache:['guatemala','gwatemala'] },
    { a3:'HTI', name:'Haiti', rang:5, aussprache:['haiti','haitii'] },
  ],
  suedamerika:[
    { a3:'BRA', name:'Brasilien', rang:1, aussprache:['brasilien','brasiljen'] },
    { a3:'COL', name:'Kolumbien', rang:2, aliasse:['Colombia'], aussprache:['kolumbien','kolumbjen'] },
    { a3:'ARG', name:'Argentinien', rang:3, aussprache:['argentinien','argentinjen'] },
    { a3:'PER', name:'Peru', rang:4, aussprache:['peru','perru'] },
    { a3:'VEN', name:'Venezuela', rang:5, aussprache:['venezuela','wenezuela'] },
  ],
};

/**
 * Ebene 4. Die fuenf Faellen, bei denen die Hauptstadt NICHT die groesste
 * Stadt ist - dort sitzt der Lernwert. Ein Ablenker, auf den niemand
 * hereinfaellt, ist keiner.
 */
export const HAUPTSTADT_ABLENKER = {
  'DE-HE':['Frankfurt am Main','Kassel'],
  'DE-NW':['Köln','Dortmund'],
  'DE-SN':['Leipzig','Chemnitz'],
  'DE-ST':['Halle (Saale)','Dessau'],
  'DE-MV':['Rostock','Stralsund'],
  'DE-BW':['Karlsruhe','Mannheim'],
  'DE-BY':['Nürnberg','Augsburg'],
  'DE-NI':['Braunschweig','Osnabrück'],
  'DE-RP':['Koblenz','Ludwigshafen'],
  'DE-SH':['Lübeck','Flensburg'],
  'DE-TH':['Jena','Weimar'],
  'DE-BB':['Cottbus','Brandenburg an der Havel'],
  'DE-SL':['Neunkirchen','Homburg'],
};
/** Die fuenf, bei denen der Ablenker die GROESSTE Stadt ist. */
export const ECHTE_FALLEN = ['DE-HE','DE-NW','DE-SN','DE-ST','DE-MV'];
