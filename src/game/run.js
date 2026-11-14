// A single loop of the universe: deck, health, gold, curios, map. Dies with you (the Journal does not).
import { RNG, uid } from '../core/util.js';
import { STARTER_DECK, POWERS, BASICS, CARD_POOL, MUTATIONS } from './data/cards.js';
import { ITEMS, ITEM_POOLS } from './data/items.js';
import { ENCOUNTERS, ENEMIES } from './data/enemies.js';
import { LOOT, EXTRA_LOOT } from './data/items.js';
import { SPECIALS, computeMove, baseOf } from './combos.js';
import { save } from '../core/save.js';

// content unlocked by the wizard frog (save.meta, from the star gallery). Anything not flagged `unlock` is base content.
const CARD_GROUP = { lens: 'optics', prism: 'optics', orbit: 'orbits', antigravity: 'orbits' }; // save.js STAR_UNLOCKS card sets
export function unlocked(id) {
  try {
    if (ITEMS[id]) return save.unlocked('artifact:' + id);
    if (BASICS[id] || POWERS[id]) return save.unlocked('card:' + id) && (!CARD_GROUP[id] || save.unlocked('card:' + CARD_GROUP[id]));
    return save.unlocked('event:' + id);
  } catch (e) { return true; }
}
export function mkCard(id, up = 0) { return { uid: uid('c'), id, type: POWERS[id] ? 'power' : 'basic', up }; }
export function mkMove(ids, name) { const comps = ids.map((id) => ({ id, up: 0 })); return { uid: uid('c'), type: 'move', comps, up: 0, name: name || computeMove(comps).name }; }

export const AREAS = {
  wilderness: { name: 'Mythical Wilderness', act: 1, rows: 13, enc: ENCOUNTERS.wilderness },
};

export function newRun(seed = (Math.random() * 2 ** 31) | 0) {
  const rng = new RNG(seed);
  const run = {
    seed, area: 'wilderness', floor: -1, pos: null, player: { hp: 56, maxHp: 56 }, gold: 99,
    deck: STARTER_DECK.map((id) => mkCard(id)), items: ['spirit_cross'], stats: { kills: 0, moves: 0, bestHit: 0, floors: 0, elites: 0, combos: 0 },
    flags: {}, foughtElites: [], seenEvents: [], loop: save.journal.loops + 1,
  };
  run.rng = rng; run.map = genMap(rng.fork('map'), 'wilderness');
  attachRun(run);
  return run;
}

// hooks used by battles to write knowledge into the persistent Journal
export function attachRun(run) {
  run.journal = save.journal;
  run.onDiscover = (mv) => {
    const j = save.journal; const e = j.combos[mv.key];
    const math = (mv.attack.lines || []).map((l) => (l.kind === 'base' ? l.text : l.kind === 'total' ? l.text : `×${+(l.mul ?? 1).toFixed(3)} ${l.text}`)).slice(0, 5);
    if (!e) { j.combos[mv.key] = { name: mv.name, count: 1, loop: run.loop, special: !!mv.special, law: !!mv.special?.law, note: mv.special?.note || '', best: mv.attack.total, math }; run.stats.combos++; }
    else { e.count++; e.best = Math.max(e.best || 0, mv.attack.total); e.math = math; if (mv.special?.law) e.law = true; }
    j.bestHit = Math.max(j.bestHit || 0, mv.attack.total);
    save.saveJournal();
  };
  run.onLearn = (enemyId, key) => { const j = save.journal; const e = (j.enemies[enemyId] ||= { seen: 0, killed: 0, learned: {} }); if (!e.learned[key]) { e.learned[key] = run.loop; save.saveJournal(); } };
  return run;
}

export function serializeRun(run) { const { rng, journal, onDiscover, onLearn, ...rest } = run; return { ...rest, rngSeed: rng.seed, rngCalls: rng.calls }; }
export function restoreRun(data) { const run = { ...data }; run.rng = RNG.restore(data.rngSeed, data.rngCalls); return attachRun(run); }

// ---------------------------------------------------------------- map
const TYPES = ['battle', 'event', 'elite', 'lab', 'shop'];
export function genMap(rng, areaId) {
  const A = AREAS[areaId]; const ROWS = A.rows - 1, COLS = 7; const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const edges = new Set();
  const node = (r, c) => (grid[r][c] ||= { id: `n${r}_${c}`, row: r, col: c, next: new Set(), prev: new Set(), type: null });
  let firstCols = [];
  for (let p = 0; p < 6; p++) {
    let c = rng.int(0, COLS - 1); if (p < 2) { while (firstCols.includes(c)) c = rng.int(0, COLS - 1); firstCols.push(c); }
    for (let r = 0; r < ROWS - 1; r++) {
      const a = node(r, c); let nc;
      for (let tries = 0; tries < 8; tries++) {
        nc = Math.max(0, Math.min(COLS - 1, c + rng.int(-1, 1)));
        // avoid crossing edges
        const cross = nc !== c && edges.has(`${r}:${nc}->${c}`);
        if (!cross) break;
        nc = c;
      }
      const b = node(r + 1, nc); a.next.add(b.id); b.prev.add(a.id); edges.add(`${r}:${c}->${nc}`); c = nc;
    }
  }
  const nodes = {}; for (const row of grid) for (const n of row) if (n) nodes[n.id] = n;
  // assign types
  const w = { battle: 45, event: 22, elite: 12, lab: 12, shop: 9 };
  for (let r = 0; r < ROWS; r++) for (const n of grid[r]) {
    if (!n) continue;
    if (r === 0) { n.type = 'battle'; continue; }
    if (r === ROWS - 1) { n.type = 'lab'; continue; }
    if (r === 6) { n.type = rng.chance(0.5) ? 'event' : 'shop'; continue; }
    const prevTypes = [...n.prev].map((id) => nodes[id].type);
    let pool = TYPES.filter((t) => {
      if (t === 'elite' && r < 4) return false; if (t === 'lab' && (r < 4 || r === ROWS - 2)) return false; if (t === 'shop' && r < 3) return false;
      if (['elite', 'lab', 'shop'].includes(t) && prevTypes.includes(t)) return false;
      return true;
    });
    n.type = rng.weighted(pool, (t) => w[t]);
  }
  const boss = { id: 'guardian', row: ROWS, col: 3, next: new Set(), prev: new Set(), type: 'guardian' };
  for (const n of grid[ROWS - 1]) if (n) { n.next.add(boss.id); boss.prev.add(n.id); }
  nodes[boss.id] = boss;
  // positions on the diorama
  for (const id in nodes) { const n = nodes[id]; n.x = (n.col - 3) * 2.3 + (id === 'guardian' ? 0 : rng.range(-0.55, 0.55)); n.z = -n.row * 2.25 + (id === 'guardian' ? -1.2 : rng.range(-0.4, 0.4)); n.next = [...n.next]; n.prev = [...n.prev]; }
  return { area: areaId, rows: ROWS + 1, nodes, starts: grid[0].filter(Boolean).map((n) => n.id) };
}

export function reachable(run) {
  if (!run.pos) return run.map.starts;
  const cur = run.map.nodes[run.pos];
  if (run.items.includes('thread') && cur.row + 1 < run.map.rows - 1) return Object.values(run.map.nodes).filter((n) => n.row === cur.row + 1).map((n) => n.id);
  return cur.next;
}

export function encounterFor(run, node) {
  const enc = AREAS[run.area].enc; const r = run.rng;
  if (node.type === 'guardian') {
    const fought = run.foughtElites; const pick = fought.includes('minotaur') && !fought.includes('hydra') ? 'hydra_elder' : fought.includes('hydra') && !fought.includes('minotaur') ? 'minotaur_king' : r.pick(['hydra_elder', 'minotaur_king']);
    return { enemies: [pick], kind: 'guardian' };
  }
  if (node.type === 'elite') { const opts = enc.elite.filter((e) => !run.foughtElites.includes(e[0])); const e = r.pick(opts.length ? opts : enc.elite); return { enemies: e, kind: 'elite' }; }
  const pool = run.stats.floors < 3 ? enc.easy : enc.hard; return { enemies: r.pick(pool), kind: 'normal' };
}

// ---------------------------------------------------------------- rewards
export function cardChoices(run, n = 3, rare = 0) {
  const r = run.rng; const out = []; const seen = new Set();
  while (out.length < n) {
    const roll = r.next();
    let c;
    if (roll < 0.1 + rare * 0.1) c = mkCard(r.pick(CARD_POOL.powers));
    else if (roll < 0.32 + rare * 0.1) { const s = r.pick(SPECIALS.filter((x) => x.exact && x.key.split('+').length <= 3)); c = mkMove(s.key.split('+'), s.name); }
    else c = mkCard(r.pick(r.chance(0.55) ? CARD_POOL.uncommonBasics : CARD_POOL.basic), r.chance(0.12 + rare * 0.2) ? 1 : 0);
    const k = c.type === 'move' ? c.name : c.id; if (seen.has(k)) continue; seen.add(k); out.push(c);
  }
  return out;
}
// a discovery's offer: three different new cards (science cards mostly, now and then a rare one or a Law of nature)
export function discoveryChoices(run, n = 3, rare = 0) {
  const r = run.rng; const out = []; let guard = 0;
  while (out.length < n && guard++ < 80) { const roll = r.next(); const id = roll < 0.08 + rare * 0.1 ? r.pick(CARD_POOL.powers) : roll < 0.2 + rare * 0.3 ? r.pick(CARD_POOL.rare) : r.pick(CARD_POOL.discover); if (!out.includes(id) && unlocked(id)) out.push(id); }
  return out;
}
export function itemChoices(run, pool, n = 1) {
  const avail = ITEM_POOLS[pool].filter((i) => !run.items.includes(i) && unlocked(i));
  return run.rng.shuffle([...avail]).slice(0, n);
}
// a won battle pays only what the foes carried: gold, and their own drops (cards come from discoveries)
export function battleRewards(run, kind, enemies = []) {
  const r = run.rng; const gm = run.items.includes('sack') ? 1.25 : 1; const loot = [];
  let gold = 0;
  for (const id of enemies) {
    const def = ENEMIES[id] || {}; const L = def.loot || LOOT[id] || LOOT[id?.replace(/_.*$/, '')] || null;
    gold += Math.round((L?.gold ? r.int(L.gold[0], L.gold[1]) : def.guardian ? r.int(60, 80) : def.elite ? r.int(25, 35) : r.int(8, 14)) * gm);
    const chance = def.guardian || def.elite ? 1 : L?.chance ?? 0.4;
    const drop = [...(L?.items || []), ...(EXTRA_LOOT[id] || [])].filter((x) => ITEMS[x] && !run.items.includes(x) && !loot.includes(x) && unlocked(x));
    if (drop.length && r.chance(chance)) loot.push(r.pick(drop)); else gold += Math.round(r.int(4, 9) * gm);
  }
  if (kind === 'guardian') for (const x of itemChoices(run, 'guardian', 2)) if (!loot.includes(x)) loot.push(x);
  return { gold, cards: [], items: loot, loot: true };
}

export function upgradeCard(c) { if (c.type === 'move') c.up = 1; else c.up = 1; }
export function mutateCard(run, c) {
  if (c.type !== 'basic') return null; const opts = MUTATIONS[baseOf(c.id)] || []; if (!opts.length) return null;
  const to = run.rng.pick(opts); c.id = to; c.up = 0; return to;
}
export function mergeCards(run, cards) {
  const comps = []; for (const c of cards) { if (c.type === 'move') comps.push(...c.comps); else if (c.type === 'basic') comps.push({ id: c.id, up: c.up }); }
  const mv = { uid: uid('c'), type: 'move', comps, up: 0, name: computeMove(comps).name };
  run.deck = run.deck.filter((c) => !cards.includes(c)); run.deck.push(mv); return mv;
}
export { ITEMS, BASICS };
