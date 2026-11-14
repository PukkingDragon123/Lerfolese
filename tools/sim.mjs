// Headless battle simulator: plays many battles to catch rule-engine errors and gauge balance (HARD difficulty).
// Every encounter is played at the point of a run where it is met: normals early with a near-starter deck, elites
// mid-run with a bigger deck and an artifact or two, guardians at the end with a full deck and a few artifacts.
// The player prepares objects greedily by the live calculation (so it seeks synergies and avoids anti-synergies),
// eats and braces when the thought bubbles say it must, and dodges about half of the blows (QTE).
//   node tools/sim.mjs [battles=200] [--quiet]
import { newRun, battleRewards, discoveryChoices, mkCard, unlocked } from '../src/game/run.js';
import { Battle, DIFF } from '../src/game/battle.js';
import { RNG } from '../src/core/util.js';
import { BASICS, CARD_POOL } from '../src/game/data/cards.js';
import { ITEMS } from '../src/game/data/items.js';
import { ENCOUNTERS } from '../src/game/data/enemies.js';
import { flatten } from '../src/game/combos.js';

const N = +(process.argv[2] || 200); const quiet = process.argv.includes('--quiet');
const tune = process.argv.find((x) => x.startsWith('--diff=')); if (tune) Object.assign(DIFF, JSON.parse(tune.slice(7))); // e.g. --diff='{"hp":{"normal":2,"elite":2,"guardian":2}}'
const E = ENCOUNTERS.wilderness;
const TIER = {
  normal: { floor: [0, 4], extra: [0, 3], arts: [0, 1] },
  elite: { floor: [5, 8], extra: [3, 5], arts: [1, 2] },
  guardian: { floor: [11, 12], extra: [5, 8], arts: [2, 3] },
};
const list = [...E.easy.map((g) => ['normal', g]), ...E.hard.map((g) => ['normal', g]), ...E.elite.map((g) => ['elite', g]), ...E.guardian.map((g) => ['guardian', g])];
const ARTS = Object.keys(ITEMS).filter((id) => ITEMS[id].math || id === 'talaria' || ['lever', 'horn_shard', 'plumb_bob', 'gorgon_scale', 'wine_flask'].includes(id)).filter(unlocked);
const stats = {}; const tiers = {}; const dodges = {}; let errors = 0, placed = 0, laws = 0, fizzles = 0, best = 0, dilemmas = 0, twins = 0, clones = 0; const picks = {};

for (let i = 0; i < N; i++) {
  const [tier, enemies] = list[i % list.length]; const T = TIER[tier]; const key = enemies.join('+');
  const run = newRun(1000 + i); const r = new RNG(i * 13 + 5);
  run.floor = r.int(T.floor[0], T.floor[1]);
  // a deck and curios found by this point of a run
  for (let k = r.int(T.extra[0], T.extra[1]); k > 0; k--) { const opts = discoveryChoices(run, 3); run.deck.push(mkCard(r.pick(opts))); }
  for (let k = r.int(T.arts[0], T.arts[1]); k > 0; k--) { const a = r.pick(ARTS); if (!run.items.includes(a)) run.items.push(a); }
  const fx = {
    async dodge() { const x = r.next(); return x < 0.2 ? 'perfect' : x < 0.5 ? 'good' : 'miss'; }, // ~50% of blows dodged
    async discoverPick(mv, opts) { if (mv.special?.law) laws++; return r.pick(opts); },
    async fizzle() { fizzles++; },
    async dilemma(d) { dilemmas++; const i = d.riddle ? (r.chance(0.7) ? d.options.findIndex((o) => o.right) : r.int(0, d.options.length - 1)) : r.int(0, d.options.length - 1); const k = `${d.title}: ${d.options[i].label}`; picks[k] = (picks[k] || 0) + 1; return i; },
    async mirrored() { twins++; },
    async cloned() { clones++; },
  };
  const b = new Battle({ run, enemies, rng: new RNG(i * 7 + 1), fx, kind: tier });
  try {
    await b.start(); let guard = 0;
    while (!b.over && guard++ < 40) {
      await playTurn(b, r);
      if (!b.over) await b.endTurn();
    }
    b.finish();
    const s = (stats[key] ||= { tier, n: 0, won: 0, turns: 0, hpLeft: 0 }); s.n++; if (b.phase === 'won') s.won++; s.turns += b.turn; s.hpLeft += b.player.hp;
    const t = (tiers[tier] ||= { n: 0, won: 0 }); t.n++; if (b.phase === 'won') t.won++;
    for (const [k, n] of Object.entries(b.stats.dodges)) dodges[k] = (dodges[k] || 0) + n;
    best = Math.max(best, run.stats.bestHit || 0);
    battleRewards(run, tier, enemies);
  } catch (e) { errors++; if (errors < 4) console.error(key, e.stack); }
}

// ---- the player: survive first, then build the best objects the live arithmetic allows
async function playTurn(b, r) {
  const P = b.player; const kindOf = (s) => BASICS[s.cards[0]?.id]?.kind; const id = (s) => s.cards[0]?.id;
  const threat = b.alive().reduce((k, e) => k + b.threatOf(e), 0);
  // an Echo on Newton clones the leftmost card first (so it is played like the original)
  for (const s of [...b.hand]) if (id(s) === 'echo' && s.cards.length === 1 && b.hand.length > 1 && r.chance(0.5)) await b.play(s.uid, { type: 'self' });
  // powers are enacted at once
  for (const s of [...b.hand]) if (s.cards[0].type === 'power') await b.play(s.uid, { type: 'self' });
  // eat when hurt; brace when the bubbles promise a beating
  for (const s of [...b.hand]) if (/apple/.test(id(s)) && P.hp < P.maxHp * 0.45 && r.chance(0.8)) await b.play(s.uid, { type: 'self' });
  if (threat >= P.hp * 0.6) for (const s of [...b.hand]) { const mv = b.moveOf(s); if (mv?.self.block && !mv.attack.launched && kindOf(s) !== 'matter' && r.chance(0.6)) { await b.play(s.uid, { type: 'self' }); break; } }
  // place matter (the heaviest first)
  const matter = b.hand.filter((s) => b.preview(s.uid, { type: 'air' }).ok).sort((x, y) => (BASICS[id(y)]?.m || 0) - (BASICS[id(x)]?.m || 0));
  for (const s of matter.slice(0, 2)) { await b.play(s.uid, { type: 'air', pos: { x: 0, y: 2.5, z: 1 } }); placed++; }
  // merge every other card where it adds the most (expected damage after artifacts, synergies and the target)
  for (let pass = 0; pass < 8; pass++) {
    let bestGain = 0, move = null;
    for (const s of b.hand) {
      if (s.cards[0].type === 'power' || kindOf(s) === 'matter') continue;
      for (const o of b.held) {
        const cur = b.heldPreview(o).est?.ev || 0; const pv = b.preview(s.uid, { type: 'held', uid: o.uid }); const nxt = pv.est?.ev || 0;
        const gain = pv.kind === 'mirror' ? (pv.ok && b.heldMove(o).attack.launched ? cur * 0.9 : 0) : nxt - cur + (pv.move?.attack.launched && !b.heldMove(o).attack.launched ? 3 : 0); // a twin doubles a launched object
        if (gain > bestGain) { bestGain = gain; move = [s, o]; }
      }
    }
    if (!move || r.chance(0.08)) break; // (people miss things)
    await b.play(move[0].uid, { type: 'held', uid: move[1].uid });
  }
  // leftovers: anything useful on Newton
  for (const s of [...b.hand]) { const mv = b.moveOf(s); if (mv?.self.valid && kindOf(s) !== 'matter' && r.chance(0.7)) await b.play(s.uid, { type: 'self' }); }
}

const pct = (a, b) => `${(100 * a / Math.max(1, b)).toFixed(0)}%`;
if (!quiet) for (const k in stats) { const s = stats[k]; console.log(`${s.tier.padEnd(9)} ${k.padEnd(24)} win ${pct(s.won, s.n).padStart(4)}  turns ${(s.turns / s.n).toFixed(1)}  hpLeft ${(s.hpLeft / s.n).toFixed(0)}  (n=${s.n})`); }
for (const t of ['normal', 'elite', 'guardian']) if (tiers[t]) console.log(`TIER ${t.padEnd(9)} win ${pct(tiers[t].won, tiers[t].n)}  (n=${tiers[t].n})`);
const dn = Object.values(dodges).reduce((a, b) => a + b, 0);
console.log(`dilemmas ${dilemmas} (${(dilemmas / Math.max(1, N)).toFixed(2)} per fight) · twins ${twins} · clones ${clones}`);
if (process.argv.includes('--picks')) for (const [k, n] of Object.entries(picks).sort()) console.log('  ', k, n);
console.log(`objects placed ${placed} · laws discovered ${laws} · fizzles ${fizzles} · best hit ${best} · dodges perfect ${pct(dodges.perfect || 0, dn)} good ${pct(dodges.good || 0, dn)} missed ${pct(dodges.miss || 0, dn)}`);
console.log('errors', errors);
