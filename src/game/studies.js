// STUDIES (menu agent): the research of the Experiment Hall (scenes/studies.js). Every combination or Law of Nature
// Isaac has discovered (save.journal.combos) becomes a study. Using it in battle advances it (core/save.js
// recordStudyUse; until the battle calls that hook, the Journal's own use count stands in). A completed study is
// claimed in the Hall for a PERMANENT reward:
//   start    : a new run start: the studied Move is in your opening deck (offered as its own star in the astral select)
//   weight   : the study's cards turn up more often (cardWeight(id) for event / discovery offers)
//   gold     : more gold at the start of every run
//   cosmetic : a trophy for the Hall's cabinet
// THE LAB PUZZLES (newest): each kind of study is a hands-on physics PUZZLE on the bench (scenes/labpuzzles.js), where
// the equation is the tool. A puzzle UNLOCKS when Isaac has discovered a related combination or Law in a run (the
// journal, plus recordStudyUse). Each awards up to 3 STARS (solved / bullseye / within par runs); the star total climbs
// the PROGRESSION TRACK, whose rungs grant permanent rewards (gold, favoured cards, opening cards, run starts,
// artifacts, trophies). Lab progress lives in save.meta.studies._lab = { stars: { kind: [s, b, p] }, tiers: { i: loop } }
// (old per-study claims keep their perks, and each claimed study migrates into a solved star for its puzzle).
// API: studyList() -> [study]; studyPerks() -> { gold, weights, starts, trophies, items, cards }; cardWeight(cardId) -> multiplier;
//      applyStudyPerks(run, startId) (called by main.js newRun); studyStarts() -> the astral select's extra stars.
import { SPECIALS } from './combos.js';
import { BASICS } from './data/cards.js';
import { save } from '../core/save.js';
import { hashString } from '../core/util.js';
import { ITEMS } from './data/items.js';

const byName = new Map(SPECIALS.map((s) => [s.name, s]));
const byKey = new Map(SPECIALS.map((s) => [s.key, s]));
const cardName = (id) => BASICS[id]?.name || id;
const baseId = (id) => BASICS[id]?.mutantOf || id;

/** which bench demonstration plays for a recipe */
export function demoOf(ids) {
  const has = (...k) => k.some((x) => ids.includes(x));
  if (has('pendulum', 'spring', 'slinky', 'resonance')) return 'pendulum';
  if (has('lens', 'prism', 'looking_glass')) return 'prism';
  if (has('gravity', 'antigravity', 'dark_matter') && has('inertia', 'momentum') && has('rotation', 'spin', 'torque')) return 'orbit';
  if (has('rotation', 'spin', 'torque')) return 'top';
  if (has('water', 'heat', 'pressure', 'buoyancy', 'ice', 'plasma', 'crucible', 'bellows')) return 'flask';
  if (has('spark', 'magnet', 'lodestone', 'sound', 'amplifier')) return 'spark';
  if (has('gravity', 'earth', 'antigravity')) return 'fall';
  if (has('force', 'mass', 'motion', 'inertia', 'momentum', 'lever', 'impulse', 'brute_force', 'domino')) return 'cradle';
  if (has('stone', 'pumice', 'keystone', 'bulwark')) return 'fall';
  return 'orbit';
}
export const DEMO = {
  pendulum: { name: 'The Pendulum', eq: 'T = 2 pi sqrt(L/g)', act: 'Drag the bob, let it swing', trophy: 'Silver Pendulum' },
  fall: { name: 'The Falling Apple', eq: 'F = G m1 m2 / r^2', act: 'Click to let it fall', trophy: 'Golden Apple' },
  prism: { name: 'The Prism', eq: 'n1 sin a = n2 sin b', act: 'Drag to turn the prism', trophy: 'Crystal Prism' },
  top: { name: 'The Spinning Top', eq: 'L = I w', act: 'Drag across it to spin', trophy: 'Gilded Top' },
  cradle: { name: "Newton's Cradle", eq: 'p = m v', act: 'Click to swing the ball', trophy: 'Brass Cradle' },
  flask: { name: 'The Alembic', eq: 'P V = n R T', act: 'Click to stoke the flame', trophy: 'Crystal Alembic' },
  spark: { name: 'The Leyden Jar', eq: 'F = k q1 q2 / r^2', act: 'Click to discharge', trophy: 'Leyden Jar' },
  orbit: { name: 'The Orrery', eq: 'T^2 / a^3 = k', act: 'Drag to wind the worlds', trophy: 'Golden Orrery' },
};

const goalOf = (law, special, n) => (law ? 3 : special ? 4 : n >= 4 ? 4 : 5);
function rewardOf(id, { law, special, comps, demo }) {
  const h = hashString('study:' + id);
  if (law) return { kind: 'start', comps };
  if (special) return h % 3 === 0 ? { kind: 'weight', cards: [...new Set(comps)] } : { kind: 'start', comps };
  const k = h % 3; if (k === 0) return { kind: 'gold', gold: 6 + (comps.length >= 3 ? 4 : 0) }; if (k === 1) return { kind: 'weight', cards: [...new Set(comps)] }; return { kind: 'cosmetic', trophy: demo };
}
export function rewardText(r, s) {
  if (!r) return '';
  if (r.kind === 'start') return `New run start: begin with ${s?.name || 'this Move'}`;
  if (r.kind === 'weight') return `${r.cards.map(cardName).join(', ')} turn up twice as often`;
  if (r.kind === 'gold') return `+${r.gold} gold at the start of every run`;
  return `Trophy: ${DEMO[r.trophy]?.trophy || 'a curio'} for the Hall`;
}
export const REWARD_ICON = { start: 'star', weight: 'card', gold: 'coin', cosmetic: 'cup', card: 'card', item: 'gear' };

// ---------------------------------------------------------------- the lab puzzles and the progression track
/** the eight bench puzzles (one per kind of study); needs = the cards whose discovery unlocks it (for the hint) */
export const PUZZLES = {
  fall: { name: 'The Falling Apple', law: 'h = 1/2 g t^2', needs: 'Gravity or Earth', goal: 'Drop the apple into the moving basket', trophy: 'Golden Apple' },
  cradle: { name: 'The Cart and the Mark', law: 'F = m a', needs: 'Force, Mass or Motion', goal: 'Push the cart so it stops on the mark', trophy: 'Brass Cradle' },
  pendulum: { name: 'The Bell Pendulum', law: 'T = 2 pi sqrt(L/g)', needs: 'Pendulum or Spring', goal: 'Ring the bell on the metronome beat', trophy: 'Silver Pendulum' },
  orbit: { name: 'The Apple Catapult', law: 'R = v^2 sin 2a / g', needs: 'Gravity, Inertia and Rotation', goal: 'Lob the apple over the books into the cup', trophy: 'Golden Orrery' },
  prism: { name: 'The Prism', law: 'n1 sin a = n2 sin b', needs: 'Lens or Prism', goal: 'Turn the prism so the red ray lights the crystal', trophy: 'Crystal Prism' },
  top: { name: 'The Spinning Top', law: 'L = I w', needs: 'Rotation or Spin', goal: 'Spin the top so it falls onto the first domino', trophy: 'Gilded Top' },
  flask: { name: 'The Gas Syringe', law: 'P V = n R T', needs: 'Heat, Water or Pressure', goal: 'Heat the gas so the plunger rings the mark', trophy: 'Crystal Alembic' },
  spark: { name: 'The Leyden Jar', law: 'F = k q1 q2 / r^2', needs: 'Spark or Magnet', goal: 'Charge the jar so the pith ball lights the lamp', trophy: 'Leyden Jar' },
};
export const PUZZLE_ORDER = ['fall', 'cradle', 'pendulum', 'orbit', 'prism', 'top', 'flask', 'spark'];
export const STAR_NAMES = ['Solved', 'Bullseye', 'Within par'];
/** the progression track: star totals and the permanent reward each rung grants */
export const TRACK = [
  { at: 1, reward: { kind: 'gold', gold: 5 }, name: 'A Purse of Florins' },
  { at: 3, reward: { kind: 'weight', cards: ['gravity', 'force'] }, name: 'Favoured: Gravity and Force' },
  { at: 5, reward: { kind: 'card', card: 'lens' }, name: 'An Extra Lens' },
  { at: 7, reward: { kind: 'start', id: 'study:lab_apple', comps: ['apple', 'gravity'], name: 'Falling Apple' }, name: 'Run Start: Falling Apple' },
  { at: 9, reward: { kind: 'item', item: 'plumb_bob' }, name: 'Artifact: Plumb Bob' },
  { at: 12, reward: { kind: 'cosmetic', trophy: 'orbit' }, name: 'Trophy: Golden Orrery' },
  { at: 15, reward: { kind: 'gold', gold: 10 }, name: 'A Chest of Florins' },
  { at: 18, reward: { kind: 'item', item: 'antikythera' }, name: 'Artifact: Antikythera' },
  { at: 21, reward: { kind: 'start', id: 'study:lab_principia', comps: ['force', 'inertia', 'motion'], name: 'First Law of Motion' }, name: 'Run Start: First Law' },
  { at: 24, reward: { kind: 'item', item: 'golden_ratio' }, name: 'Artifact: Golden Ratio' },
];
/** the lab's progress record inside meta.studies (created, and old claimed studies migrated, on first use) */
export function labState() {
  const m = save.meta; m.studies ||= {}; let L = m.studies._lab;
  if (!L) { L = m.studies._lab = { stars: {}, tiers: {}, v: 1 };
    for (const [id, st] of Object.entries(m.studies)) { if (id === '_lab' || !st?.claimed) continue; const k = demoOf(id.split('+').map(baseId)); (L.stars[k] ||= [0, 0, 0])[0] = 1; }
    save.saveMeta(); }
  return L;
}
/** the puzzles with their lock state and stars; a puzzle unlocks when a related combination or Law has been discovered */
export function puzzleList() {
  const L = labState(); const studies = studyList(); const by = {}; for (const S of studies) (by[S.demo] ||= []).push(S);
  return PUZZLE_ORDER.map((k) => { const st = L.stars[k] || [0, 0, 0]; const rel = by[k] || [];
    return { kind: k, ...PUZZLES[k], unlocked: rel.length > 0 || st.some(Boolean), stars: st.slice(), count: st.filter(Boolean).length, studies: rel }; });
}
export const starTotal = () => Object.values(labState().stars).reduce((a, s) => a + s.filter(Boolean).length, 0);
/** record the stars of one solved run: flags [solved, bullseye, par]; returns the indices newly earned */
export function awardStars(kind, flags) {
  const L = labState(); const st = (L.stars[kind] ||= [0, 0, 0]); const fresh = [];
  flags.forEach((f, i) => { if (f && !st[i]) { st[i] = 1; fresh.push(i); } }); if (fresh.length) save.saveMeta(); return fresh;
}
/** rungs reached but not yet claimed */
export const tiersReady = () => { const L = labState(), n = starTotal(); return TRACK.map((t, i) => i).filter((i) => n >= TRACK[i].at && !L.tiers[i]); };
export function claimTier(i) { const L = labState(); const T = TRACK[i]; if (!T || L.tiers[i] || starTotal() < T.at) return null; L.tiers[i] = save.journal.loops || 1; save.saveMeta(); return T; }
export function tierText(T) {
  const r = T.reward; if (r.kind === 'gold') return `+${r.gold} gold at the start of every run`; if (r.kind === 'weight') return `${r.cards.map(cardName).join(' and ')} turn up twice as often`;
  if (r.kind === 'card') return `Every run opens with an extra ${cardName(r.card)}`; if (r.kind === 'start') return `A new run start: ${r.name}, merged from the first turn`;
  if (r.kind === 'item') return `Every run begins with ${ITEMS[r.item]?.name || r.item}`; return `Trophy: ${DEMO[r.trophy]?.trophy || 'a curio'} for the Hall`;
}

/** every discovered combination / Law as a study, Laws first, then the named discoveries, then plain combinations */
export function studyList() {
  const j = save.journal, m = save.meta; const map = new Map();
  for (const [key, e] of Object.entries(j.combos || {})) {
    const sp = e.special ? byName.get(e.name) || byKey.get(key) : null; const id = sp ? sp.key : key;
    let S = map.get(id); if (!S) { const comps = (sp ? sp.key : key).split('+').map(baseId); const law = !!(sp?.law || e.law); const special = !!sp;
      S = { id, key, name: sp?.name || e.name, law, special, comps, n: comps.length, note: sp?.note || e.note || '', effect: sp?.effect || '', best: 0, juses: 0, loop: e.loop || 1 }; map.set(id, S); }
    S.juses += e.count || 0; S.best = Math.max(S.best, e.best || 0);
  }
  const out = [];
  for (const S of map.values()) {
    S.demo = demoOf(S.comps); S.goal = goalOf(S.law, S.special, S.n); const st = m.studies?.[S.id] || {};
    S.uses = Math.max(st.uses || 0, S.juses); S.done = S.uses >= S.goal; S.claimed = !!st.claimed; S.reward = st.reward || rewardOf(S.id, S); S.rewardText = rewardText(S.reward, S);
    S.recipe = S.comps.map(cardName).join(' + '); out.push(S);
  }
  const rank = (s) => (s.done && !s.claimed ? 0 : 1) * 10 + (s.law ? 0 : s.special ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || b.uses / b.goal - a.uses / a.goal || a.name.localeCompare(b.name));
}
export const studiesReady = () => tiersReady().length; // the tower's STUDIES badge: rungs of the track waiting to be claimed
export function claimStudy(S) { if (!S?.done || S.claimed) return false; const ok = save.claimStudy(S.id, S.reward); if (ok) S.claimed = true; return ok; }

/** the permanent perks of every claimed study */
export function studyPerks() {
  const P = { gold: 0, weights: {}, starts: [], trophies: [], items: [], cards: [] }; const st = save.meta.studies || {};
  const L = st._lab; if (L) { TRACK.forEach((T, i) => { if (!L.tiers?.[i]) return; const r = T.reward;
      if (r.kind === 'gold') P.gold += r.gold; else if (r.kind === 'weight') for (const c of r.cards) P.weights[c] = Math.min(3, (P.weights[c] || 1) + 1);
      else if (r.kind === 'card') P.cards.push(r.card); else if (r.kind === 'item') P.items.push(r.item); else if (r.kind === 'cosmetic') P.trophies.push(r.trophy);
      else if (r.kind === 'start') P.starts.push({ id: r.id, comps: r.comps, name: r.name, law: r.comps.length >= 3 }); });
    for (const [k, s3] of Object.entries(L.stars || {})) if (s3.every(Boolean)) P.trophies.push(k); } // three stars on a puzzle: its trophy for the shelves
  for (const [id, s] of Object.entries(st)) { if (id === '_lab' || !s.claimed || !s.reward) continue; const r = s.reward;
    if (r.kind === 'gold') P.gold += r.gold || 0;
    else if (r.kind === 'weight') for (const c of r.cards || []) P.weights[c] = Math.min(3, (P.weights[c] || 1) + 1);
    else if (r.kind === 'start') { const sp = byKey.get(id); P.starts.push({ id: 'study:' + id, comps: r.comps || id.split('+'), name: sp?.name || (r.comps || id.split('+')).map(cardName).join(' + '), law: !!sp?.law }); }
    else if (r.kind === 'cosmetic') P.trophies.push(r.trophy); }
  P.gold = Math.min(60, P.gold); return P;
}
/** how much more often a card turns up in offers (1 = normal); event / discovery pools can multiply their weights by it */
export const cardWeight = (cardId) => studyPerks().weights[baseId(cardId)] || 1;
/** the astral select's extra stars: one per studied run start */
export function studyStarts() { return studyPerks().starts.map((s) => ({ ...s, blurb: `${s.comps.map(cardName).join(' + ')}, merged and ready from the first turn.`, cards: s.comps })); }
/** at the start of a run (main.js newRun): the gold bonus, and the studied Move when the run starts under a study's star */
export async function applyStudyPerks(run, startId) {
  const P = studyPerks(); if (P.gold) run.gold += P.gold;
  if (P.items.length || P.cards.length) { const { mkCard } = await import('./run.js'); for (const it of P.items) if (ITEMS[it] && !run.items.includes(it)) run.items.push(it); for (const c of P.cards) run.deck.push(mkCard(c)); }
  if (startId && String(startId).startsWith('study:')) { const s = P.starts.find((x) => x.id === startId); if (s) { const { mkMove } = await import('./run.js'); run.deck.push(mkMove(s.comps, s.name)); run.start = startId; } }
  return run;
}
