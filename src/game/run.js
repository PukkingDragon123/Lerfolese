// A single loop of the universe: deck, health, gold, curios, map. Dies with you (the Journal does not).
import { RNG, uid, hashString } from '../core/util.js';
import { STARTER_DECK, POWERS, BASICS, CARD_POOL, MUTATIONS } from './data/cards.js';
import { ITEMS, ITEM_POOLS } from './data/items.js';
import { ENCOUNTERS, ENEMIES } from './data/enemies.js';
import { LOOT, EXTRA_LOOT } from './data/items.js';
import { computeMove, baseOf } from './combos.js';
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

// ---- MENU AGENT EDIT (constellation start select, scenes/tower.js + scenes/astral.js): a run can begin under one
// of these constellations, newRun(seed, { start: 'prism' }). Each is a small starting artifact / deck twist; the
// numbers are a first pass for the RULES agent to rebalance (keep the ids; the menu reads name / blurb from here).
export const STARTS = {
  apple: { name: 'The Apple', blurb: 'The classic start, and one more Apple.', add: ['apple'] },
  pendulum: { name: 'The Pendulum', blurb: "Foucault's Pendulum. 8 less max health.", items: ['pendulum'], maxHp: -8 },
  prism: { name: 'The Prism', blurb: "Newton's Prism. A Spark replaces Mass.", items: ['prism'], swap: { mass: 'spark' } },
  comet: { name: 'The Comet', blurb: 'Winged Talaria and 60 more gold.', items: ['talaria'], gold: 60 },
  owl: { name: 'The Owl', blurb: 'Owl of Athena and a Notebook.', items: ['owl'], add: ['notebook'] },
};
export function applyStart(run, id) {
  const S = STARTS[id]; if (!S) return run; run.start = id;
  if (S.swap) run.deck = run.deck.map((c) => (S.swap[c.id] ? mkCard(S.swap[c.id]) : c));
  for (const c of S.add || []) run.deck.push(mkCard(c));
  for (const it of S.items || []) if (ITEMS[it] && !run.items.includes(it)) run.items.push(it);
  if (S.maxHp) { run.player.maxHp += S.maxHp; run.player.hp = run.player.maxHp; }
  if (S.gold) run.gold += S.gold;
  return run;
}
// ---- END MENU AGENT EDIT (newRun below takes the optional { start } and calls applyStart)

export function newRun(seed = (Math.random() * 2 ** 31) | 0, { start = null } = {}) {
  const rng = new RNG(seed);
  const run = {
    seed, area: 'wilderness', floor: -1, pos: null, player: { hp: 56, maxHp: 56 }, gold: 99,
    deck: STARTER_DECK.map((id) => mkCard(id)), items: ['spirit_cross'], stats: { kills: 0, moves: 0, bestHit: 0, floors: 0, elites: 0, combos: 0 },
    flags: {}, foughtElites: [], seenEvents: [], loop: save.journal.loops + 1,
  };
  applyStart(run, start); // MENU AGENT EDIT: the constellation start
  run.rng = rng; run.map = genMap(rng.fork('map'), 'wilderness');
  for (const n of Object.values(run.map.nodes)) nodeEncounter(run, n); // every fight is rolled now, so the map's figurines show exactly who waits there
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
  // the Best Combinations leaderboard: the hardest hits (one per recipe) and the longest merge chain
  run.onRecord = (mv, dmg) => {
    const j = save.journal; const R = (j.records ||= { hits: [], chain: null }); const row = { name: mv.name, key: mv.key, dmg, n: mv.n, loop: run.loop, law: !!mv.special?.law };
    const old = R.hits.find((x) => x.key === mv.key); if (old) { if (dmg <= old.dmg) row.skip = true; else Object.assign(old, row); } else R.hits.push(row);
    R.hits.sort((a, b) => b.dmg - a.dmg); R.hits.length = Math.min(R.hits.length, 8);
    if (!R.chain || mv.n > R.chain.n || (mv.n === R.chain.n && dmg > R.chain.dmg)) R.chain = { name: mv.name, key: mv.key, n: mv.n, dmg, loop: run.loop };
    run.stats.bestCombo = Math.max(run.stats.bestCombo || 0, dmg); save.saveJournal();
  };
  run.onLearn = (enemyId, key) => { const j = save.journal; const e = (j.enemies[enemyId] ||= { seen: 0, killed: 0, learned: {} }); if (!e.learned[key]) { e.learned[key] = run.loop; save.saveJournal(); } };
  return run;
}

export function serializeRun(run) { const { rng, journal, onDiscover, onLearn, onRecord, ...rest } = run; return { ...rest, rngSeed: rng.seed, rngCalls: rng.calls }; }
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

// a node's fight, rolled once from the run seed and the node id and stored on the node (node.enc). Old saves that
// predate pre-rolled maps get theirs lazily, the first time the map or the battle asks.
export const isFight = (node) => node && (node.type === 'battle' || node.type === 'elite' || node.type === 'guardian');
export function rollEncounter(run, node) {
  const enc = AREAS[run.area || 'wilderness'].enc; const r = new RNG((hashString(String(run.seed) + ':' + node.id) ^ 0x5bd1e995) >>> 0);
  if (node.type === 'guardian') { const pool = enc.guardian.filter((g) => g.every((id) => unlocked(id) !== false)); return { enemies: [...r.pick(pool.length ? pool : enc.guardian)], kind: 'guardian' }; }
  if (node.type === 'elite') { // elites in the same row differ, and the map avoids repeating one elite on consecutive rows
    const rowSeed = new RNG((hashString(String(run.seed) + ':elites') >>> 0)); const order = rowSeed.shuffle([...enc.elite]);
    return { enemies: [...order[(node.row + node.col) % order.length]], kind: 'elite' };
  }
  const pool = node.row < 3 ? enc.easy : enc.hard; return { enemies: [...r.pick(pool)], kind: 'normal' };
}
export function nodeEncounter(run, node) {
  if (!isFight(node)) return null; if (!node.enc) node.enc = rollEncounter(run, node);
  return node.enc;
}
export function encounterFor(run, node) { const e = nodeEncounter(run, node); return { enemies: [...e.enemies], kind: e.kind }; }
// an event's optional boss (the Sphinx, Prometheus' eagle): its fight, or null
export function eventBoss(eventId) { const e = AREAS.wilderness.enc.event?.[eventId]; return e ? { enemies: [...e], kind: 'elite', boss: true, event: eventId } : null; }

// ---------------------------------------------------------------- rewards
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
// a won battle pays only what the foes carried: gold and their curios. NO CARDS: new cards come only from MERGING
// (a first-time combination is a Discovery: pick one of three new cards) and from events.
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
  return { gold, cards: [], lootCards: [], items: loot, loot: true };
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
