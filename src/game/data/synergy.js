// The synergy matrix: how cards and properties interact when they are merged into one object, how foes resist or
// suffer them, and the artifacts that bend the arithmetic. Everything here is data plus small pure functions, so the
// battle, the previews, the card view, the journal and tools/sim.mjs all read the same numbers.
//
// A Move's damage per hit is  m (kg) × v (m/s)  then multiplied, line by line:
//   1. merge synergies / anti-synergies (this file, SYNERGIES), named discoveries and hidden Laws (combos.js SPECIALS)
//   2. artifacts (ARTIFACT_MATH), including odds rolled on the battle's seeded RNG
//   3. the target: Vulnerable, thick hide, Wet / Burning, and each foe's resistances and weaknesses (FOES)
// The breakdown lines are shown on the object's tag, in the card view and in the drop previews.
import { BASICS } from './cards.js';

const base = (id) => BASICS[id]?.mutantOf || id;
// property tags of a merge: every card id and its base, plus elements
export function tagsOf(comps) {
  const t = new Set();
  for (const c of comps) { t.add(c.id); t.add(base(c.id)); }
  const any = (...ids) => ids.some((x) => t.has(x));
  if (any('heat', 'plasma')) t.add('hot');
  if (any('water', 'ice')) t.add('wet');
  if (any('spark', 'plasma', 'superposition')) t.add('electric');
  if (any('stone', 'pumice', 'lodestone', 'earth', 'keystone')) t.add('rock');
  if (any('lens', 'prism', 'spark')) t.add('light');
  if (any('gravity', 'antigravity', 'buoyancy')) t.add('falling');
  if (any('mass', 'dark_matter', 'pressure')) t.add('heavy');
  return t;
}

// ------------------------------------------------------------------ merge synergies (first match per id wins)
// all: every listed id (or base id / tag) must be in the merge. none: none may be. mul: damage multiplier.
// anti: an anti-synergy (shown in red). Extra effects are applied by combos.computeMove.
export const SYNERGIES = [
  // ---- anti-synergies: some things simply do not go together
  { id: 'paradox', name: 'Paradox', all: ['inertia', 'motion'], none: ['force'], anti: true, mul: 0, fizzle: 'An object at rest cannot also be in motion. It fizzles. (A Force would settle the argument.)', text: 'Inertia + Motion: paradox, it fizzles' },
  { id: 'melt', name: 'Melt', all: ['ice', 'hot'], anti: true, mul: 1, text: 'Ice + Heat melt each other: the ice loses its kg, no Burn, no chill' },
  { id: 'insulated', name: 'Insulated', all: ['rock', 'electric'], none: ['wet', 'magnet'], anti: true, mul: 0.75, text: 'Stone does not conduct: no zap, ×0.75' },
  { id: 'darklens', name: 'Nothing to focus', all: ['lens', 'dark_matter'], anti: true, mul: 1, text: 'A Lens on Dark Matter: nothing to focus, the Lens does nothing' },
  { id: 'cancel', name: 'Cancelled out', all: ['gravity', 'antigravity'], anti: true, mul: 0.5, text: 'Gravity + Antigravity cancel out: ×0.5' },
  { id: 'drag', name: 'Drag', all: ['friction', 'motion'], anti: true, mul: 0.75, text: 'Friction drags on Motion: ×0.75' },
  { id: 'damp', name: 'Damped', all: ['sound', 'heavy'], anti: true, mul: 0.75, text: 'Sound through dense matter is damped: ×0.75' },
  // ---- synergies: some multiply each other a lot
  { id: 'steam', name: 'Steam', all: ['hot', 'water'], none: ['ice'], mul: 2, blind: 1, text: 'Heat + Water: scalding steam ×2, blinds every foe' },
  { id: 'heavyfall', name: 'Heavy fall', all: ['heavy', 'falling'], none: ['antigravity'], mul: 2, text: 'Mass + Gravity: a heavy fall ×2' },
  { id: 'chain', name: 'Chain lightning', all: ['electric', 'wet'], mul: 1, chain: true, text: 'Spark + Water: lightning chains to EVERY Wet foe' },
  { id: 'fulcrum', name: 'Fulcrum', all: ['lever', 'force'], mul: 2, text: 'Lever + Force: a place to stand ×2' },
  { id: 'lava', name: 'Lava', all: ['hot', 'rock'], mul: 1.5, burn: 2, text: 'Heat + Stone: molten rock ×1.5, +2 Burn' },
  { id: 'wreck', name: 'Wrecking swing', all: ['pendulum', 'heavy'], mul: 1.5, text: 'Pendulum + Mass: a wrecking swing ×1.5' },
  { id: 'ricochet', name: 'Ricochet', all: ['rotation', 'spring'], mul: 1.25, keepBounce: true, text: 'Rotation + Spring: spinning bounces lose nothing ×1.25' },
  { id: 'lodestar', name: 'Lodestar', all: ['magnet', 'rock'], mul: 1.5, text: 'Magnet + Stone: drawn true ×1.5' },
  { id: 'tsunami', name: 'Tsunami', all: ['sound', 'wet'], mul: 2, text: 'Sound + Water: a wave you can hear ×2' },
  { id: 'sparks', name: 'Sparks fly', all: ['friction', 'hot'], mul: 1.25, burn: 3, text: 'Friction + Heat: sparks fly ×1.25, +3 Burn' },
  { id: 'buoyant', name: 'Buoyant', all: ['buoyancy', 'wet'], mul: 1.5, text: 'Buoyancy + Water: it surfaces hard ×1.5' },
  { id: 'curve', name: 'Curveball', all: ['rotation', 'force'], mul: 1.25, text: 'Rotation + Force: a curveball ×1.25' },
  { id: 'kiln', name: 'Kiln', all: ['pressure', 'hot'], mul: 1.5, text: 'Pressure + Heat: a kiln ×1.5' },
];
export function synergiesOf(comps, special = null) {
  const t = tagsOf(comps); const out = [];
  for (const r of SYNERGIES) {
    if (!r.all.every((x) => t.has(x))) continue; if (r.none?.some((x) => t.has(x))) continue;
    if (r.id === 'paradox' && special?.law) continue; // a Law of Nature settles the paradox
    if (out.some((o) => o.id === r.id)) continue; out.push(r);
  }
  return out;
}

// ------------------------------------------------------------------ foes: resistances and weaknesses
// tag: a property of the merge (see tagsOf) or a state ('fall' = falling strike). mul 0 = immune (no Burn either).
export const FOES = {
  talos: [{ tag: 'hot', mul: 0, text: 'Bronze Talos is immune to Heat' }, { tag: 'fall', mul: 2, text: 'The nail in his ankle: falling ×2' }, { tag: 'electric', mul: 1.5, text: 'Bronze conducts: Spark ×1.5' }],
  hydra: [{ tag: 'hot', mul: 1.5, text: 'Heat sears the necks ×1.5 (and stops regrowth)' }],
  hydra_elder: [{ tag: 'hot', mul: 1.5, text: 'Heat sears the necks ×1.5 (and stops regrowth)' }],
  hydra_head: [{ tag: 'hot', mul: 1.5, text: 'Heat cauterises ×1.5' }],
  chimera: [{ tag: 'hot', mul: 0.5, text: 'The Chimera breathes fire: Heat ×0.5' }, { tag: 'wet', mul: 2, text: 'Water douses its furnace ×2' }],
  medusa: [{ tag: 'rock', mul: 0.5, text: 'Stone is immune to stone ×0.5' }, { tag: 'lens', mul: 1.5, text: 'A Lens turns her gaze ×1.5' }],
  cyclops: [{ tag: 'lens', mul: 2, text: 'One great eye: Lens ×2' }],
  harpy: [{ tag: 'fall', mul: 2, text: 'Dragged out of the sky: falling ×2' }, { tag: 'sound', mul: 1.5, text: 'Sound scatters her ×1.5' }],
  spartoi: [{ tag: 'fall', mul: 1.5, text: 'Crushed from above ×1.5' }, { tag: 'electric', mul: 0.5, text: 'Dry bone does not conduct: Spark ×0.5' }],
  wolf: [{ tag: 'sound', mul: 2, text: 'Hounds hate the din: Sound ×2' }],
  satyr: [{ tag: 'hot', mul: 1.5, text: 'Soaked in wine: Heat ×1.5' }],
  minotaur: [{ tag: 'rock', mul: 1.5, text: 'Solid stone stops a bull ×1.5' }],
  minotaur_king: [{ tag: 'rock', mul: 1.5, text: 'Solid stone stops a bull ×1.5' }],
  centaur: [{ tag: 'electric', mul: 1.5, text: 'Bronze arrowheads conduct ×1.5' }],
  kobalos: [{ tag: 'spread', mul: 1.5, text: 'Too small to dodge a wave ×1.5' }],
};
export const foeRules = (e) => [...(FOES[e.id] || []), ...(e.def?.resist || [])];
export const hasTag = (mv, tag) => (tag === 'fall' ? !!mv.attack.fall : tag === 'spread' ? !!mv.attack.spread : (mv.tags || new Set()).has(tag));
/** the target's lines for a move: [{text, mul, kind}] (state first, then the creature's nature) */
export function foeLines(e, mv, B) {
  const a = mv.attack; const L = [];
  if (e.st?.vulnerable) L.push({ text: 'Vulnerable', mul: 1.5, kind: 'foe' });
  if (e.def?.thickHide && !a.fall && B && B.headsAlive(e) >= 3) L.push({ text: 'Thick hide (3+ heads): −50%', mul: 0.5, kind: 'foe' });
  if (e.st?.wet && hasTag(mv, 'hot')) L.push({ text: 'Wet foe: the Heat hisses away −50%', mul: 0.5, kind: 'anti' });
  if (e.st?.wet && hasTag(mv, 'electric')) L.push({ text: 'Wet foe conducts ×1.5', mul: 1.5, kind: 'syn' });
  if (e.st?.burn && hasTag(mv, 'wet') && !hasTag(mv, 'hot')) L.push({ text: `Water douses its Burn ${e.st.burn} (lost)`, mul: 1, kind: 'anti' });
  for (const r of foeRules(e)) if (hasTag(mv, r.tag)) L.push({ text: r.text, mul: r.mul, kind: r.mul < 1 ? 'anti' : 'foe' });
  return L;
}
export const immuneTo = (e, tag) => foeRules(e).some((r) => r.tag === tag && r.mul === 0);
/** a short reading of a foe's nature for its plate / tooltip */
export function foeNature(e) { return foeRules(e).map((r) => ({ text: r.text, mul: r.mul })); }

// ------------------------------------------------------------------ artifacts that bend the math
// Each: { lines(ctx) -> [{text, mul, kind}], odds(ctx) -> [{text, outcomes:[{p, mul, label}]}], hits(ctx) }. ctx = { B, mv, e, obj }
export const ARTIFACT_MATH = {
  statues: { lines: () => [{ text: 'Statues (petrified admirers)', mul: 3, kind: 'art' }] },
  prism: { split: ({ mv }) => hasTag(mv, 'light') && !mv.attack.spread, lines: ({ mv }) => (hasTag(mv, 'light') && !mv.attack.spread ? [{ text: "Newton's Prism: split into 3 hits at 40%", mul: 0.4, kind: 'art' }] : []) },
  tyche: { odds: () => [{ text: 'Dice of Tyche', outcomes: [{ p: 0.5, mul: 2, label: '1 in 2: ×2' }, { p: 0.5, mul: 0.5, label: 'else ×0.5' }] }] },
  horseshoe: { odds: () => [{ text: "Hermes' Horseshoe", outcomes: [{ p: 0.25, mul: 2, label: '1 in 4: ×2' }, { p: 0.75, mul: 1, label: 'else ×1' }] }] },
  pandora: { odds: () => [{ text: "Pandora's Jar", outcomes: [{ p: 1 / 3, mul: 3, label: '1 in 3: ×3' }, { p: 1 / 3, mul: 1, label: '1 in 3: ×1' }, { p: 1 / 3, mul: 0, label: '1 in 3: fizzle' }] }] },
  golden_ratio: { lines: ({ obj }) => (obj?.golden ? [{ text: 'Golden Ratio (a 5th merge)', mul: 1.618, kind: 'art' }] : []) },
  lead_boots: { lines: ({ mv }) => (hasTag(mv, 'heavy') ? [{ text: 'Lead Boots: Mass counts double (in the kg)', mul: 1, kind: 'note' }] : []) },
  lyre: { lines: ({ mv }) => (mv.n === 3 ? [{ text: "Pythagoras' Lyre: a harmony of 3", mul: 1.5, kind: 'art' }] : mv.n >= 5 ? [{ text: "Pythagoras' Lyre: discord of 5+", mul: 0.75, kind: 'anti' }] : []) },
  nemesis: { lines: ({ B, e }) => { if (!e) return []; const top = B.alive().reduce((a, b) => (b.hp > a.hp ? b : a), e); return [top === e ? { text: 'Coin of Nemesis: the mightiest foe', mul: 2, kind: 'art' } : { text: 'Coin of Nemesis: not the mightiest', mul: 0.75, kind: 'anti' }]; } },
  achilles: { lines: ({ e }) => (e && ((e.strikes || 0) + 1) % 3 === 0 ? [{ text: 'Heel of Achilles: every 3rd strike', mul: 3, kind: 'art' }] : []) },
  anvil: { lines: ({ mv }) => [...(hasTag(mv, 'rock') || hasTag(mv, 'heavy') ? [{ text: 'Anvil of Hephaestus: stone and mass', mul: 1.5, kind: 'art' }] : []), ...(hasTag(mv, 'electric') ? [{ text: 'Anvil of Hephaestus: sparks', mul: 0.5, kind: 'anti' }] : [])] },
  amphora: { lines: ({ mv }) => [...(hasTag(mv, 'wet') ? [{ text: 'Leaky Amphora: water', mul: 2, kind: 'art' }] : []), ...(hasTag(mv, 'hot') ? [{ text: 'Leaky Amphora: heat', mul: 0.5, kind: 'anti' }] : [])] },
  icarus_feather: { lines: ({ mv }) => (mv.attack.fall ? [{ text: "Icarus' Feather: falling", mul: 2, kind: 'art' }] : []) },
};
/** artifact lines and odds for a move against a foe */
export function artifactLines(B, mv, e, obj) {
  const lines = [], odds = []; let split = false;
  for (const id of B.run.items) { const A = ARTIFACT_MATH[id]; if (!A) continue; const ctx = { B, mv, e, obj };
    if (A.lines) lines.push(...A.lines(ctx).map((l) => ({ ...l, art: id }))); if (A.odds) odds.push(...A.odds(ctx).map((o) => ({ ...o, art: id }))); if (A.split?.(ctx)) split = true; }
  return { lines, odds, split };
}
