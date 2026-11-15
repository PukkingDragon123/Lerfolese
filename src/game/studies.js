// STUDIES (menu agent): the research of the Experiment Hall (scenes/studies.js). Every combination or Law of Nature
// Isaac has discovered (save.journal.combos) becomes a study. Using it in battle advances it (core/save.js
// recordStudyUse; until the battle calls that hook, the Journal's own use count stands in). A completed study is
// claimed in the Hall for a PERMANENT reward:
//   start    : a new run start: the studied Move is in your opening deck (offered as its own star in the astral select)
//   weight   : the study's cards turn up more often (cardWeight(id) for event / discovery offers)
//   gold     : more gold at the start of every run
//   cosmetic : a trophy for the Hall's cabinet
// API: studyList() -> [study]; studyPerks() -> { gold, weights, starts, trophies }; cardWeight(cardId) -> multiplier;
//      applyStudyPerks(run, startId) (called by main.js newRun); studyStarts() -> the astral select's extra stars.
import { SPECIALS } from './combos.js';
import { BASICS } from './data/cards.js';
import { save } from '../core/save.js';
import { hashString } from '../core/util.js';

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
export const REWARD_ICON = { start: 'star', weight: 'card', gold: 'coin', cosmetic: 'cup' };

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
export const studiesReady = () => studyList().filter((s) => s.done && !s.claimed).length;
export function claimStudy(S) { if (!S?.done || S.claimed) return false; const ok = save.claimStudy(S.id, S.reward); if (ok) S.claimed = true; return ok; }

/** the permanent perks of every claimed study */
export function studyPerks() {
  const P = { gold: 0, weights: {}, starts: [], trophies: [] }; const st = save.meta.studies || {};
  for (const [id, s] of Object.entries(st)) { if (!s.claimed || !s.reward) continue; const r = s.reward;
    if (r.kind === 'gold') P.gold += r.gold || 0;
    else if (r.kind === 'weight') for (const c of r.cards || []) P.weights[c] = Math.min(3, (P.weights[c] || 1) + 1);
    else if (r.kind === 'start') { const sp = byKey.get(id); P.starts.push({ id: 'study:' + id, comps: r.comps || id.split('+'), name: sp?.name || (r.comps || id.split('+')).map(cardName).join(' + '), law: !!sp?.law }); }
    else if (r.kind === 'cosmetic') P.trophies.push(r.trophy); }
  P.gold = Math.min(60, P.gold); return P;
}
/** how much more often a card turns up in offers (1 = normal); event / discovery pools can multiply their weights by it */
export const cardWeight = (cardId) => studyPerks().weights[baseId(cardId)] || 1;
/** the astral select's extra stars: one per studied run start */
export function studyStarts() { return studyPerks().starts.map((s) => ({ ...s, blurb: `Begin with the Move ${s.name} in your deck.`, cards: s.comps })); }
/** at the start of a run (main.js newRun): the gold bonus, and the studied Move when the run starts under a study's star */
export async function applyStudyPerks(run, startId) {
  const P = studyPerks(); if (P.gold) run.gold += P.gold;
  if (startId && String(startId).startsWith('study:')) { const s = P.starts.find((x) => x.id === startId); if (s) { const { mkMove } = await import('./run.js'); run.deck.push(mkMove(s.comps, s.name)); run.start = startId; } }
  return run;
}
