// The 18 handcrafted core cards (12 Basic + 6 Power) plus mutant variants.
// Physics: a Move hits for  m (mass) × v (velocity)  per hit. Basics add mass, velocity, hits and effects.
// Each Basic also has a SELF use (drop on Sir Isaac) and a FIELD use (drop on the ground to leave an object).

export const KIND_LABEL = { matter: 'Matter', law: 'Law', energy: 'Energy', tool: 'Instrument' };

export const BASICS = {
  apple: { name: 'Apple', kind: 'matter', num: 1, m: 1, v: 2, noun: 'Apple', heal: 4,
    up: { m: 2, heal: 6 }, field: 'sapling',
    text: ['THROW: m1 v2', 'SELF: Heal 4', 'FIELD: Apple sapling'], upText: ['THROW: m2 v2', 'SELF: Heal 6', 'FIELD: Apple sapling'],
    flavor: 'It fell. Everything else is commentary.' },
  stone: { name: 'Stone', kind: 'matter', num: 2, m: 3, v: 2, noun: 'Stone', block: 6, hard: true,
    up: { m: 4, block: 9 }, field: 'boulder',
    text: ['THROW: m3 v2, cracks Block', 'SELF: Block 6', 'FIELD: Boulder'], upText: ['THROW: m4 v2, cracks Block', 'SELF: Block 9', 'FIELD: Boulder'],
    flavor: 'Igneous, sedimentary, rude.' },
  water: { name: 'Water', kind: 'matter', num: 3, m: 2, v: 1, noun: 'Splash', spread: true, wet: 2, heal: 2, cleanse: true,
    up: { m: 3, wet: 3, heal: 3 }, field: 'puddle',
    text: ['WAVE: m2 v1 to ALL, Wet 2', 'SELF: Heal 2, cleanse', 'FIELD: Puddle'], upText: ['WAVE: m3 v1 to ALL, Wet 3', 'SELF: Heal 3, cleanse', 'FIELD: Puddle'],
    flavor: 'Wet. Conducts. Judges you silently.' },
  spark: { name: 'Spark', kind: 'energy', num: 4, charge: 5, noun: 'Spark', adj: 'Electric', charged: 4,
    up: { charge: 8, charged: 6 }, field: 'coil',
    text: ['ZAP 5, chains to Wet foes', 'SELF: next hit +4', 'FIELD: Tesla coil'], upText: ['ZAP 8, chains to Wet foes', 'SELF: next hit +6', 'FIELD: Tesla coil'],
    flavor: 'Borrowed from a god. Not returning it.' },
  gravity: { name: 'Gravity', kind: 'law', num: 5, dv: 4, fall: true, adj: 'Falling', block: 4,
    up: { dv: 6, block: 6 }, field: 'well',
    text: ['+4 v, falls from above', 'ALONE: foe Weak 2', 'SELF: Block 4'], upText: ['+6 v, falls from above', 'ALONE: foe Weak 2', 'SELF: Block 6'],
    flavor: 'What goes up is contractually obliged.' },
  mass: { name: 'Mass', kind: 'law', num: 6, dm: 2, adj: 'Heavy', noun: 'Weight', block: 5,
    up: { dm: 3, block: 7 },
    text: ['+2 m', 'ALONE: a weight, m2 v2', 'SELF: Block 5'], upText: ['+3 m', 'ALONE: a weight, m3 v2', 'SELF: Block 7'],
    flavor: 'Heavy is a state of mind. Also of matter.' },
  force: { name: 'Force', kind: 'law', num: 7, dv: 3, adj: 'Fast', noun: 'Punch', momentum: 2,
    up: { dv: 4, momentum: 3 },
    text: ['+3 v', 'ALONE: force bolt m1 v3', 'SELF: next Move +2 v'], upText: ['+4 v', 'ALONE: force bolt m1 v4', 'SELF: next Move +3 v'],
    flavor: 'F = ma. Mostly a.' },
  rotation: { name: 'Rotation', kind: 'law', num: 8, hits: 1, adj: 'Spinning', noun: 'Spin', thorns: 3,
    up: { hits: 1, dv: 1, thorns: 5 }, field: 'whirl',
    text: ['+1 HIT (overkill ricochets)', 'ALONE: foe Dizzy', 'SELF: Thorns 3'], upText: ['+1 HIT and +1 v', 'ALONE: foe Dizzy', 'SELF: Thorns 5'],
    flavor: 'Round and round. Scientifically.' },
  inertia: { name: 'Inertia', kind: 'law', num: 9, persist: 1, adj: 'Relentless', retain: true,
    up: { persist: 2 },
    text: ['Move repeats next turn (v-2)', 'SELF: keep hand + Block', 'FIELD: objects +2 turns'], upText: ['Move repeats 2 turns (v-2)', 'SELF: keep hand + Block', 'FIELD: objects +2 turns'],
    flavor: 'Objects in motion stay in motion. So do grudges.' },
  heat: { name: 'Heat', kind: 'energy', num: 10, burn: 3, adj: 'Hot', noun: 'Flame', kindle: 2,
    up: { burn: 5, kindle: 3 }, field: 'campfire',
    text: ['Burn 3 (Wet foes steam)', 'SELF: hits Burn +2', 'FIELD: Campfire'], upText: ['Burn 5 (Wet foes steam)', 'SELF: hits Burn +3', 'FIELD: Campfire'],
    flavor: 'Thermodynamics, but spicy.' },
  lens: { name: 'Lens', kind: 'tool', num: 11, focus: 1.5, adj: 'Focused', noun: 'Glare', draw: 2,
    up: { focus: 2, draw: 3 }, field: 'glass',
    text: ['x1.5 damage, single target', 'ALONE: foe Vulnerable 2', 'SELF: Draw 2'], upText: ['x2 damage, single target', 'ALONE: foe Vulnerable 2', 'SELF: Draw 3'],
    flavor: 'Look closer. No, closer. There.' },
  spring: { name: 'Spring', kind: 'tool', num: 12, bounce: 1, adj: 'Bouncy', noun: 'Boing', block: 3, draw: 1,
    up: { bounce: 2, block: 5 }, field: 'catapult',
    text: ['Bounces to 1 more foe', 'SELF: Block 3, Draw 1', 'FIELD: Catapult'], upText: ['Bounces to 2 more foes', 'SELF: Block 5, Draw 1', 'FIELD: Catapult'],
    flavor: 'Hooke had a point. Several, actually.' },

  superposition: { name: 'Superposition', kind: 'matter', mutantOf: 'apple', m: 1, v: 2, charge: 5, noun: 'Quantum Apple', heal: 4, charged: 4, field: 'sapling',
    text: ['Apple AND Spark at once', 'THROW: m1 v2 + ZAP 5', 'SELF: Heal 4, next hit +4'], flavor: 'Observed, it is lunch.' },
  // ---- mutants (from the Lab's Mutate, events, Medusa, Kobalos...) ----
  golden_apple: { name: 'Golden Apple', kind: 'matter', mutantOf: 'apple', m: 3, v: 2, noun: 'Golden Apple', heal: 8, goldOnKill: 8, field: 'sapling',
    up: { m: 4, heal: 10 }, text: ['THROW: m3 v2, kill: +8 gold', 'SELF: Heal 8', 'FIELD: Golden sapling'], flavor: 'Discord, but make it shiny.' },
  rotten_apple: { name: 'Rotten Apple', kind: 'matter', mutantOf: 'apple', m: 1, v: 2, noun: 'Rotten Apple', venom: 4, heal: 1, field: 'sapling',
    up: { venom: 6 }, text: ['THROW: m1 v2, Venom 4', 'SELF: Heal 1 (ew)', 'FIELD: Apple sapling'], flavor: 'Smells like a hypothesis gone wrong.' },
  pumice: { name: 'Pumice', kind: 'matter', mutantOf: 'stone', m: 2, v: 2, noun: 'Pumice', spread: true, block: 4, field: 'boulder',
    up: { m: 3, block: 6 }, text: ['THROW: m2 v2 to ALL', 'SELF: Block 4', 'FIELD: Boulder (light)'], flavor: 'A rock that floats. Unacceptable.' },
  lodestone: { name: 'Lodestone', kind: 'matter', mutantOf: 'stone', m: 3, v: 2, noun: 'Lodestone', disarm: 2, block: 6, field: 'boulder',
    up: { m: 4, disarm: 3 }, text: ['THROW: m3 v2, foe -2 Strength', 'SELF: Block 6', 'FIELD: Boulder'], flavor: 'Magnetically attracted to trouble.' },
  antigravity: { name: 'Antigravity', kind: 'law', mutantOf: 'gravity', dv: 2, fall: true, adj: 'Floating', weakOnHit: 2, block: 4, field: 'well',
    up: { dv: 4 }, text: ['+2 v, hit foe Weak 2', 'ALONE: foe Weak 2', 'SELF: Block 4'], flavor: 'What goes up stays up. Out of spite.' },
  dark_matter: { name: 'Dark Matter', kind: 'law', mutantOf: 'mass', dm: 3, adj: 'Dark', noun: 'Void', pierce: true, block: 5,
    up: { dm: 4 }, text: ['+3 m, ignores Block', 'ALONE: m3 v2, ignores Block', 'SELF: Block 5'], flavor: 'Mostly hypothetical. Hits very real.' },
  brute_force: { name: 'Brute Force', kind: 'law', mutantOf: 'force', dv: 6, adj: 'Brutal', noun: 'Haymaker', recoil: 3, momentum: 4,
    up: { dv: 8 }, text: ['+6 v, you take 3', 'ALONE: force blast m1 v6', 'SELF: next Move +4 v'], flavor: 'The elegant solution, minus elegance.' },
  torque: { name: 'Torque', kind: 'law', mutantOf: 'rotation', hits: 1, dv: 2, adj: 'Twisting', noun: 'Twist', thorns: 4, field: 'whirl',
    up: { hits: 2 }, text: ['+1 HIT and +2 v', 'ALONE: foe Dizzy', 'SELF: Thorns 4'], flavor: 'Rotation with a grudge.' },
  momentum: { name: 'Momentum', kind: 'law', mutantOf: 'inertia', persist: 2, grow: true, adj: 'Snowballing', retain: true,
    up: { persist: 3 }, text: ['Repeats 2 turns, v GROWS +2', 'SELF: keep hand + Block', 'FIELD: objects +2 turns'], flavor: 'p = mv, and v is having a great day.' },
  plasma: { name: 'Plasma', kind: 'energy', mutantOf: 'heat', burn: 3, charge: 4, adj: 'Plasma', noun: 'Plasma', kindle: 2, field: 'campfire',
    up: { burn: 5, charge: 6 }, text: ['Burn 3 and ZAP 4', 'SELF: hits Burn +2', 'FIELD: Campfire'], flavor: 'The fourth state of matter. Fifth state of mind.' },
  ice: { name: 'Ice', kind: 'matter', mutantOf: 'water', m: 3, v: 2, noun: 'Icicle', chill: 2, block: 4, field: 'puddle',
    up: { m: 4, chill: 3 }, text: ['THROW: m3 v2, foe Weak 2', 'SELF: Block 4', 'FIELD: Puddle'], flavor: 'Water that made a decision.' },
  prism: { name: 'Prism', kind: 'tool', mutantOf: 'lens', prism: true, adj: 'Prismatic', noun: 'Rainbow', draw: 2, field: 'glass',
    up: { draw: 3 }, text: ['Move hits ALL foes', 'ALONE: ALL foes Vulnerable 1', 'SELF: Draw 2'], flavor: 'Splits light, attention and enemies.' },
  slinky: { name: 'Slinky', kind: 'tool', mutantOf: 'spring', bounce: 3, bounceFalloff: 0.25, adj: 'Slinky', noun: 'Slinky', block: 3, draw: 1, field: 'catapult',
    up: { bounce: 4 }, text: ['Bounces 3 more (-25% each)', 'SELF: Block 3, Draw 1', 'FIELD: Catapult'], flavor: 'Goes down stairs. And enemies.' },
};

export const MUTATIONS = {
  apple: ['golden_apple', 'rotten_apple'], stone: ['pumice', 'lodestone'], gravity: ['antigravity'], mass: ['dark_matter'],
  force: ['brute_force'], rotation: ['torque'], inertia: ['momentum'], heat: ['plasma'], water: ['ice'], lens: ['prism'], spring: ['slinky'], spark: ['plasma'],
};

export const POWERS = {
  first_law: { name: 'First Law', num: 13, text: ['Field objects and', 'repeating Moves last', '+1 turn.'], upText: ['Field objects and', 'repeating Moves last', '+2 turns.'], flavor: 'Lex I. Nothing stops unless something stops it.' },
  third_law: { name: 'Third Law', num: 14, text: ['When a foe hits you,', 'it takes 3 damage.'], upText: ['When a foe hits you,', 'it takes 5 damage.'], flavor: 'Lex III. Equal, opposite, petty.' },
  gravitation: { name: 'Universal Gravitation', short: 'Gravitation', num: 15, text: ['Gravity +2 v. Each turn', 'an apple falls on a', 'random foe (m1 v6).'], upText: ['Gravity +3 v. Each turn', 'an apple falls on a', 'random foe (m2 v6).'], flavor: 'Every apple attracts every other apple.' },
  calculus: { name: 'Calculus', num: 16, text: ['Your first Move each', 'turn gets +2 m', 'and +2 v.'], upText: ['Your first Move each', 'turn gets +3 m', 'and +3 v.'], flavor: 'Invented first. Allegedly.' },
  thermo: { name: 'Thermodynamics', num: 17, text: ['Burn no longer fades.', 'Heat applies +1 Burn.'], upText: ['Burn no longer fades.', 'Heat applies +2 Burn.'], flavor: 'Entropy always wins. Today, it is on your side.' },
  orbit: { name: 'Orbit', num: 18, text: ['A moon orbits you:', 'Block 4 each turn.', 'Gravity: it strikes (8).'], upText: ['A moon orbits you:', 'Block 6 each turn.', 'Gravity: it strikes (12).'], flavor: 'Falling forever and always missing. Relatable.' },
};

export const STARTER_DECK = ['apple', 'apple', 'apple', 'gravity', 'gravity', 'mass', 'force', 'force', 'rotation', 'inertia'];

// rarity weights for rewards / shop
export const CARD_POOL = {
  basic: ['apple', 'stone', 'water', 'spark', 'gravity', 'mass', 'force', 'rotation', 'inertia', 'heat', 'lens', 'spring'],
  uncommonBasics: ['stone', 'water', 'spark', 'heat', 'lens', 'spring'],
  powers: Object.keys(POWERS),
};

export function cardDef(card) {
  if (card.type === 'power') return POWERS[card.id];
  return BASICS[card.id];
}

// stat with upgrade applied
export function stat(id, up, key) {
  const d = BASICS[id]; if (!d) return undefined;
  if (up && d.up && d.up[key] !== undefined) return d.up[key];
  return d[key];
}
