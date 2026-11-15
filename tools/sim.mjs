// Headless battle simulator: plays many battles to catch rule-engine errors and gauge balance (HARD difficulty).
// Every encounter is played at the point of a run where it is met: normals early with a near-starter deck, elites
// mid-run with a bigger deck and an artifact or two, guardians at the end with a full deck and a few artifacts.
// The player prepares objects greedily by the live calculation (so it seeks synergies and avoids anti-synergies),
// reads the thought bubbles and BLOCKS what it can of the telegraphed damage first (Slay-the-Spire style), eats when
// hurt, cycles with the draw / discard cards (Notebook, Hypothesis, Scratchpad, Recycle), uses the combinators
// (Echo clones, Looking-Glass twins), and answers each fight's story dilemma at random (riddles 70% right).
// Event bosses (the Sphinx, Prometheus' eagle) count as elites; guardians are the act bosses.
// Card economy: no card rewards and no shop cards; the extra cards a deck has by each tier come from Discoveries
// (first-time merges) and events. APPLE HEAT: the player vents before it would overheat, keeps merges that would
// overheat out unless they pay, and quenches / vents into Block with Quench and Bellows when the apple is hot.
//   node tools/sim.mjs [battles=200] [--quiet] [--picks] [--noheat] [--start=<id>] [--diff=<json>]
import { newRun, battleRewards, discoveryChoices, mkCard, unlocked } from '../src/game/run.js';
import { Battle, DIFF } from '../src/game/battle.js';
import { RNG } from '../src/core/util.js';
import { BASICS, CARD_POOL } from '../src/game/data/cards.js';
import { ITEMS } from '../src/game/data/items.js';
import { ENCOUNTERS } from '../src/game/data/enemies.js';
import { flatten } from '../src/game/combos.js';

const N = +(process.argv[2] || 200); const quiet = process.argv.includes('--quiet');
const START = process.argv.find((x) => x.startsWith('--start='))?.slice(8) || null; // a constellation start (run.js STARTS)
const tune = process.argv.find((x) => x.startsWith('--diff=')); if (tune) Object.assign(DIFF, JSON.parse(tune.slice(7))); // e.g. --diff='{"hp":{"normal":2,"elite":2,"guardian":2}}'
const E = ENCOUNTERS.wilderness;
const TIER = {
  normal: { floor: [0, 4], extra: [0, 3], arts: [0, 1] },
  elite: { floor: [5, 8], extra: [3, 5], arts: [1, 2] },
  guardian: { floor: [11, 12], extra: [5, 8], arts: [2, 3] },
};
const list = [...E.easy.map((g) => ['normal', g]), ...E.hard.map((g) => ['normal', g]), ...E.elite.map((g) => ['elite', g]), ...Object.values(E.event || {}).map((g) => ['elite', g]), ...E.guardian.map((g) => ['guardian', g])];
const ARTS = Object.keys(ITEMS).filter((id) => ITEMS[id].math || ['talaria', 'aegis', 'greaves', 'ram', 'lever', 'horn_shard', 'plumb_bob', 'gorgon_scale', 'wine_flask'].includes(id)).filter(unlocked);
const stats = {}; const tiers = {}; let blockedTot = 0, takenTot = 0, discards = 0; let overheats = 0, vents = 0, heatSum = 0, heatN = 0; const tierN = {}; let errors = 0, placed = 0, laws = 0, fizzles = 0, best = 0, dilemmas = 0, twins = 0, clones = 0; const picks = {};

for (let i = 0; i < N; i++) {
  const [tier, enemies] = list[i % list.length]; const T = TIER[tier]; const key = enemies.join('+');
  const run = newRun(1000 + i, { start: START }); const r = new RNG(i * 13 + 5);
  run.floor = r.int(T.floor[0], T.floor[1]); if (process.argv.includes('--noheat')) run.flags.noHeat = true; // compare: the same fights without apple Heat
  // a deck and curios found by this point of a run
  for (let k = r.int(T.extra[0], T.extra[1]); k > 0; k--) { const opts = discoveryChoices(run, 3); run.deck.push(mkCard(r.pick(opts))); }
  for (let k = r.int(T.arts[0], T.arts[1]); k > 0; k--) { const a = r.pick(ARTS); if (!run.items.includes(a)) run.items.push(a); }
  const fx = {
    async chooseCards(pool, o) { // keep matter and launchers, throw away the weakest; Recycle tosses everything below the bar
      const val = (s) => { const mv = b.moveOf(s); const d = BASICS[s.cards[0]?.id] || {}; return (d.kind === 'matter' ? 10 : 0) + (d.launch ? 6 : 0) + (mv?.self.block || 0) * 0.5 + (mv?.attack.perHit || 0) * 0.2; };
      const sorted = [...pool].sort((x, y) => val(x) - val(y)); const n = o.recycle ? sorted.filter((s) => val(s) < 4).length : o.min || 0; discards += n; return sorted.slice(0, n).map((s) => s.uid); },
    async discoverPick(mv, opts) { if (mv.special?.law) laws++; return r.pick(opts); },
    async fizzle() { fizzles++; },
    async dilemma(d) { dilemmas++; const i = d.riddle ? (r.chance(0.7) ? d.options.findIndex((o) => o.right) : r.int(0, d.options.length - 1)) : r.int(0, d.options.length - 1); const k = `${d.title}: ${d.options[i].label}`; picks[k] = (picks[k] || 0) + 1; return i; },
    async mirrored() { twins++; },
    async cloned() { clones++; },
  };
  fx.vented = async () => { vents++; };
  fx.release = async (o, mv) => { if (mv.attack.heatTier) { tierN[mv.attack.heatTier] = (tierN[mv.attack.heatTier] || 0) + 1; heatSum += b.heat; heatN++; } };
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
    blockedTot += b.stats.blocked; takenTot += b.stats.taken; overheats += b.flags.overheats || 0;
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
  // cycle first: draw cards, Scratchpad / Recycle (more options before committing)
  for (const s of [...b.hand]) if (['notebook', 'hypothesis', 'scratchpad', 'recycle'].includes(id(s)) && s.cards.length === 1 && r.chance(0.85)) { if (b.over) return; await b.play(s.uid, { type: 'self' }); }
  // APPLE HEAT: let it out before it would overheat (all foes Burn half); a hot apple feeds Quench / Bellows
  if (b.heat >= 8 && b.canVent() && r.chance(0.85)) await b.vent();
  for (const s of [...b.hand]) if (['quench', 'bellows'].includes(id(s)) && s.cards.length === 1 && b.heat >= 6 && r.chance(0.8)) { if (b.over) return; await b.play(s.uid, { type: 'self' }); }
  // eat when hurt; then BLOCK what the bubbles promise (the most Block per card first, keep one Matter to throw)
  for (const s of [...b.hand]) if (/apple/.test(id(s)) && P.hp < P.maxHp * 0.45 && r.chance(0.8)) await b.play(s.uid, { type: 'self' });
  let need = threat - P.block - (P.hp > P.maxHp * 0.7 ? 6 : 2);
  const braces = b.hand.map((s) => ({ s, mv: b.moveOf(s) })).filter((x) => x.mv?.self.block > 0).sort((x, y) => y.mv.self.block - x.mv.self.block);
  for (const { s, mv } of braces) {
    if (need <= 0 || b.over) break; const matterLeft = b.hand.filter((x) => kindOf(x) === 'matter').length;
    if (kindOf(s) === 'matter' && matterLeft <= 1 && need < P.hp * 0.5) continue; // keep something to throw unless the blow would be ruinous
    if (!b.hand.includes(s) || r.chance(0.12)) continue; await b.play(s.uid, { type: 'self' }); need -= mv.self.block;
  }
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
        const burn = pv.heat?.over ? 25 : 0; // an overheat scorches you and burns a card: only if it really pays
        const gain = -burn + (pv.kind === 'mirror' ? (pv.ok && b.heldMove(o).attack.launched ? cur * 0.9 : 0) : nxt - cur + (pv.move?.attack.launched && !b.heldMove(o).attack.launched ? 3 : 0)); // a twin doubles a launched object
        if (gain > bestGain) { bestGain = gain; move = [s, o]; }
      }
    }
    if (!move || r.chance(0.08)) break; // (people miss things)
    await b.play(move[0].uid, { type: 'held', uid: move[1].uid });
  }
  // leftovers: anything useful on Newton
  for (const s of [...b.hand]) { const mv = b.moveOf(s); if (mv?.self.valid && kindOf(s) !== 'matter' && !((mv.self.quench || mv.self.vent) && b.heat < 4) && !(b.preview(s.uid, { type: 'self' }).heat?.over) && r.chance(0.7)) await b.play(s.uid, { type: 'self' }); }
}

const pct = (a, b) => `${(100 * a / Math.max(1, b)).toFixed(0)}%`;
if (!quiet) for (const k in stats) { const s = stats[k]; console.log(`${s.tier.padEnd(9)} ${k.padEnd(24)} win ${pct(s.won, s.n).padStart(4)}  turns ${(s.turns / s.n).toFixed(1)}  hpLeft ${(s.hpLeft / s.n).toFixed(0)}  (n=${s.n})`); }
for (const t of ['normal', 'elite', 'guardian']) if (tiers[t]) console.log(`TIER ${t.padEnd(9)} win ${pct(tiers[t].won, tiers[t].n)}  (n=${tiers[t].n})`);
console.log(`dilemmas ${dilemmas} (${(dilemmas / Math.max(1, N)).toFixed(2)} per fight) · twins ${twins} · clones ${clones}`);
if (process.argv.includes('--picks')) for (const [k, n] of Object.entries(picks).sort()) console.log('  ', k, n);
console.log(`objects placed ${placed} · laws discovered ${laws} · fizzles ${fizzles} · best hit ${best} · discards ${discards} · damage blocked ${pct(blockedTot, blockedTot + takenTot)} of blows`);
console.log(`apple heat: avg ${(heatSum / Math.max(1, heatN)).toFixed(1)} at release · apple strikes ${Object.entries(tierN).map(([k, v]) => `${k} ${v}`).join(', ')} · overheats ${overheats} (${(overheats / Math.max(1, N)).toFixed(2)}/fight) · vents ${vents}`);
console.log('errors', errors);
