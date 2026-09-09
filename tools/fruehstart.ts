/** **Was der Fruehstart bringt und was er kostet** (S-P4-02).
 *
 *  Seit v266 darf eine zweite Welle starten, waehrend die erste noch laeuft.
 *  Damit ist der Fruehstart zum ersten Mal eine Entscheidung mit zwei Seiten
 *  - und keine der bisherigen Messungen sieht sie: `npm run sim` faehrt drei
 *  Bots, die alle drei NICHT ueberlappen (die Balance ist gegen einen
 *  Spieler geeicht, der diese Entscheidung nicht trifft). Wer den Bonus
 *  einstellen will, misst also gegen einen Lauf, in dem er nie anfaellt.
 *
 *  **Was hier gemessen wird.** Derselbe Bot, zweimal ueber dieselben Karten
 *  und dieselben Aussaaten:
 *
 *    vorsichtig  startet erst, wenn nichts mehr laeuft (heutiger Bot)
 *    halb        legt nach, sobald die laufende Welle halb abgearbeitet ist
 *    immer       startet, sobald es erlaubt ist - also durchgehend zwei Wellen
 *
 *  Gegenuebergestellt werden Kristall am Ende, verdientes Gold und Siege.
 *
 *  **Wonach gesucht wird.** Nicht nach dem groessten Gold, sondern nach dem
 *  Wert, bei dem die Ueberlappung eine ENTSCHEIDUNG ist. Zwei Seiten muss
 *  sie haben, und die drei Stile fragen genau danach:
 *
 *    `halb` muss sich LOHNEN  - sonst ist die Mechanik tot, und niemand
 *                               drueckt den Knopf je frueh.
 *    `immer` muss BESTRAFT werden - sonst ist es auch keine Entscheidung,
 *                               sondern ein Knopf, den man einfach haelt.
 *
 *  Der erste gemessene Lauf zeigt, warum es die dritte Spalte braucht:
 *  durchgehendes Ueberlappen verliert drei von vier Karten, und zwar bei
 *  JEDEM Hub - kein Goldbetrag kauft diesen Schaden zurueck. Ein Werkzeug
 *  mit nur zwei Spalten haette daraus "Ueberlappen lohnt nie" gemacht.
 *
 *  **Messstelle** (Regel 12): Grad `normal`, ohne Verbesserungen
 *  (`karten: 0`), alle Karten des Spiels, Horizont 20 Spielminuten, Bot mit
 *  den Deckeln aus `c18probe.ts`. Die Zahlen sind Mittel ueber Karten und
 *  Aussaaten; die Spanne steht daneben, weil ein Mittel ohne sie nicht sagt,
 *  ob ein Unterschied ueber dem Rauschen liegt.
 *
 *  **Kein Tor.** Es misst, es urteilt nicht - das Urteil steht als Zahl in
 *  `EARLY_RISIKO_HUB`, und was den Bonus haelt, sind der Rauchtest und seine
 *  Gegenprobe.
 *
 *  Aufruf:  npm run fruehstart                    der heutige Hub
 *           npm run fruehstart -- --hub 0,1,2     durchprobieren
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WAVES = join(ROOT, 'src/data/waves.ts');
const MARKE = join(ROOT, '.fruehstart-sicherung.txt');

/** Die drei Spielweisen. `schwelle` ist der Anteil der laufenden Welle, bei
 *  dem noch nachgelegt wird - unter 0 heisst nie, ueber 1 heisst immer. */
const STILE = (() => {
  const i = process.argv.indexOf('--schwellen');
  if (i < 0) {
    return [
      { name: 'vorsichtig', schwelle: -1 },
      { name: 'halb', schwelle: 0.5 },
      { name: 'immer', schwelle: 2 },
    ];
  }
  return process.argv[i + 1].split(',').map((v) => ({ name: `s${v}`, schwelle: Number(v) }));
})();

const args = process.argv.slice(2);
const opt = (name: string): string | null => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] ?? null : null;
};

// ------------------------------------------------------------------ der Lauf

if (args.includes('--lauf')) {
  const { GameState } = await import('../src/game/state');
  const { TOWERS, TOWER_ORDER, MAX_LEVEL, nextFor } = await import('../src/data/towers');
  const { MAPS } = await import('../src/data/maps');
  const { candidateSpots } = await import('./spots');

  type Z = { spot: number; si: number };
  /** Derselbe Bot wie in `c18probe.ts` - bis auf die eine Zeile, um die es
   *  geht. Ein eigener Bot sagte etwas ueber einen anderen Spieler. */
  const schritt = (g: InstanceType<typeof GameState>,
    plaetze: { x: number; y: number }[], z: Z, schwelle: number): void => {
    const id = TOWER_ORDER[z.si % TOWER_ORDER.length];
    if (z.spot < plaetze.length && g.gold >= TOWERS[id].base.cost) {
      const sp = plaetze[z.spot++];
      if (g.build(sp.x, sp.y, id)) z.si++;
    }
    const up = g.towers.find((t) => {
      if (t.level >= MAX_LEVEL) return false;
      const n = nextFor(TOWERS[t.def], t.branch ?? ((t.id % 2) as 0 | 1), t.level);
      return !!n && g.gold >= n.cost + 80;
    });
    if (up) g.upgrade(up, (up.branch ?? ((up.id % 2) as 0 | 1)) as 0 | 1);
    // **Die eine Zeile, um die es geht.** `schwelle` sagt, bis zu welchem
    // Anteil der laufenden Welle nachgelegt wird: unter 0 nie, bei 0,5 wenn
    // die Haelfte weg ist, ueber 1 immer.
    if (g.canStartWave && (!g.waveActive || g.fruehstartRisiko <= schwelle)) g.startWave();
  };

  const saaten = (opt('--saaten') ?? '4242,7,99').split(',').map(Number);
  const zeilen: string[] = [];
  for (const stil of STILE) {
    for (const m of MAPS) {
      for (const saat of saaten) {
        const g = new GameState();
        g.reset(saat, 'normal', m.id, { karten: 0 });
        const plaetze = candidateSpots(g);
        const z: Z = { spot: 0, si: 0 };
        let f = 0;
        let ueberlappt = 0;
        while (g.phase === 'playing' && f < 60 * 60 * 20) {
          schritt(g, plaetze, z, stil.schwelle);
          if (g.laufende.length > 1) ueberlappt++;
          g.update(1 / 60);
          f++;
        }
        zeilen.push(['ZEILE', stil.name, m.id, saat,
          g.phase === 'won' ? 1 : 0, g.lives, g.maxLives, g.stats.goldEarned,
          f > 0 ? (ueberlappt / f).toFixed(3) : '0'].join('\t'));
      }
    }
  }
  console.log(zeilen.join('\n'));
  process.exit(0);
}

// ----------------------------------------------------------------- der Sweep

// Dieselbe Sicherung wie beim Eichen: das Werkzeug schreibt in eine
// Quelldatei und stellt sie wieder her. Ein Abbruch mittendrin liesse sonst
// einen fremden Wert stehen, und bei einem schmutzigen Baum waere hinterher
// nicht mehr zu trennen, was von wem stammt.
if (existsSync(MARKE)) {
  writeFileSync(WAVES, readFileSync(MARKE, 'utf8'));
  rmSync(MARKE);
  console.log('FRUEHSTART: ein abgebrochener Lauf wurde gefunden und zurueckgestellt.\n');
}
const dirty = execSync('git status --porcelain -- src/data/waves.ts',
  { cwd: ROOT, encoding: 'utf8' }).trim();
if (dirty && !args.includes('--trotzdem')) {
  console.error('FRUEHSTART: src/data/waves.ts ist nicht sauber.\n');
  console.error('Erst einchecken - das Werkzeug schreibt in diese Datei und stellt');
  console.error('sie danach wieder her. (Wenn du sicher bist: --trotzdem)');
  process.exit(1);
}

const urtext = readFileSync(WAVES, 'utf8');
const heute = Number((urtext.match(/export const EARLY_RISIKO_HUB = ([0-9.]+);/) ?? [])[1]);
if (Number.isNaN(heute)) {
  console.error('FRUEHSTART: EARLY_RISIKO_HUB steht nicht in src/data/waves.ts.');
  process.exit(1);
}
const werte = (opt('--hub') ?? String(heute)).split(',').map((v) => Number(v.trim()));
const saaten = opt('--saaten');
const schwellen = opt('--schwellen');

writeFileSync(MARKE, urtext);
const fertig = (): void => {
  writeFileSync(WAVES, urtext);
  if (existsSync(MARKE)) rmSync(MARKE);
};
for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException']) {
  process.on(sig, (e) => { fertig(); if (e instanceof Error) console.error(e); process.exit(1); });
}

interface Zeile { modus: string; karte: string; saat: number; sieg: number;
  leben: number; maxLeben: number; gold: number; anteil: number }

const mittel = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

console.log(`Fruehstart: EARLY_RISIKO_HUB, ${werte.length} Wert(e)`);
console.log('Gemessen ueber alle Karten, Grad normal, ohne Verbesserungen.');
console.log('Kristall ist der Anteil, der am Ende steht - Mittel ueber Karten und Aussaaten.\n');
console.log('  Hub    ' + STILE.map((s) => s.name.padEnd(30)).join(''));
console.log('         ' + STILE.map(() => 'Kristall   Gold  Siege ueberl.'.padEnd(30)).join(''));

const zusammen: { hub: number; werte: Record<string, number>;
  gold: Record<string, number>; rauschen: number }[] = [];
for (const v of werte) {
  writeFileSync(WAVES, urtext.replace(/export const EARLY_RISIKO_HUB = [0-9.]+;/,
    `export const EARLY_RISIKO_HUB = ${v};`));
  const roh = execSync(`npx tsx tools/fruehstart.ts --lauf${saaten ? ` --saaten ${saaten}` : ''}`
    + `${schwellen ? ` --schwellen ${schwellen}` : ''}`,
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  const zeilen: Zeile[] = roh.split('\n').filter((l) => l.startsWith('ZEILE')).map((l) => {
    const t = l.split('\t');
    return { modus: t[1], karte: t[2], saat: +t[3], sieg: +t[4],
      leben: +t[5], maxLeben: +t[6], gold: +t[7], anteil: +t[8] };
  });
  const teil = (m: string) => zeilen.filter((z) => z.modus === m);
  const kristall = (m: string) => mittel(teil(m).map((z) => (z.leben / z.maxLeben) * 100));
  const gold = (m: string) => mittel(teil(m).map((z) => z.gold));
  const siege = (m: string) => teil(m).filter((z) => z.sieg).length;
  const ueber = (m: string) => mittel(teil(m).map((z) => z.anteil * 100));
  // **Die Spanne ueber die AUSSAATEN, nicht ueber alle Laeufe.** Die Karten
  // sind verschieden schwer; ihre Streuung ist kein Rauschen, sondern der
  // Gegenstand. Rauschen ist, was dieselbe Frage bei anderer Aussaat anders
  // beantwortet - und nur daran laesst sich messen, ob ein Unterschied einer
  // ist (dieselbe Rechnung wie die Spannungsratsche in `sim.ts`).
  const spanne = (m: string) => {
    const jeSaat = [...new Set(teil(m).map((z) => z.saat))]
      .map((sa) => mittel(teil(m).filter((z) => z.saat === sa)
        .map((z) => (z.leben / z.maxLeben) * 100)));
    return Math.max(...jeSaat) - Math.min(...jeSaat);
  };
  const k: Record<string, number> = {}; const gl: Record<string, number> = {};
  for (const st of STILE) { k[st.name] = kristall(st.name); gl[st.name] = gold(st.name); }
  zusammen.push({ hub: v, werte: k, gold: gl, rauschen: spanne(STILE[0].name) });
  console.log(`  ${String(v).padEnd(6)} ` + STILE.map((st) =>
    `${kristall(st.name).toFixed(1).padStart(6)} % ${gold(st.name).toFixed(0).padStart(6)} `
    + `${String(siege(st.name)).padStart(2)}/${teil(st.name).length} `
    + `${ueber(st.name).toFixed(0).padStart(3)} %`.padEnd(9)).join(''));
}

fertig();

// --- Der Befund. Bewusst nur ein Befund: das Werkzeug urteilt nicht.
console.log('');
console.log('FRUEHSTART: was die Ueberlappung kostet und was der Hub daran aendert.');
console.log(`            Rauschen (Spanne der Aussaaten beim vorsichtigen Bot): `
  + `${zusammen[0].rauschen.toFixed(1)} Punkte Kristall.`);
for (const z of zusammen) {
  const teile = STILE.slice(1).map((st) => {
    const d = z.werte[st.name] - z.werte[STILE[0].name];
    return `${st.name} ${(d >= 0 ? '+' : '') + d.toFixed(1)} %`;
  });
  const goldD = STILE.slice(1).map((st) => {
    const d = z.gold[st.name] - z.gold[STILE[0].name];
    return `${(d >= 0 ? '+' : '') + d.toFixed(0)}`;
  });
  console.log(`            Hub ${String(z.hub).padEnd(4)} Kristall ${teile.join(', ')}`
    + `   Gold ${goldD.join(', ')}`);
}
console.log('\nsrc/data/waves.ts steht wieder wie vorher.');
