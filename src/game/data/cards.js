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

// ---- the fourth face line (what it does in the AIR / on a HELD object) and the full description for hover notes:
// what it does alone, combined, manifested in mid-air, and dropped on a held object as a manipulator.
const AIRL = 'AIR: hangs; add Laws';
const LORE = {
  apple: [AIRL, null, { alone: 'Thrown at a foe it is 1 kg at 2 m/s: 2 damage. Dropped on Sir Isaac it heals 4. Dropped on the ground it plants an apple sapling that grows and drops free Apples into your hand.',
    combo: 'Stack Laws on it to throw it harder: Gravity drops it from above, Force adds speed, Mass adds weight. Named recipes (Falling Apple, Apple Shower, The Big Apple...) are written into the Journal.',
    air: 'Drag it into the air above the field to MANIFEST it: the apple hangs on a glowing gravity string. Every Law you drop on it joins the throw and winds it up (+1 m/s). Ring the bell and it flies.',
    held: 'Dropped on something already hanging, it adds its 1 kg to the throw.' }],
  stone: [AIRL, null, { alone: 'Thrown it is 3 kg at 2 m/s: 6 damage, and it cracks Block (it counts double against it). On Sir Isaac: Block 6. On the ground: a Boulder that shields you and can be launched.',
    combo: 'Heavy and hard. Gravity makes a Rockslide, Heat a Lava Rock, Inertia a Rolling Stone, Spring a Bouncing Boulder.',
    air: 'Manifest a hovering stone; push it with Force or let Gravity hurl it down. Its weight makes every Law count for more.', held: 'Adds 3 kg and cracking power to a held object.' }],
  water: [AIRL, null, { alone: 'A wave of 2 kg at 1 m/s that hits ALL foes and leaves them Wet 2: sparks deal double to the Wet, and fire turns to blinding steam. On Sir Isaac: heal 2 and cleanse Burn, Wet and Venom. On the ground: a Puddle.',
    combo: 'Heat makes Steam (blinds everyone), Gravity makes Rain, Spark electrifies it, Rotation stirs a Whirlpool.',
    air: 'Manifest a floating globe of water; released, it bursts over every foe and soaks them.', held: 'Soaks a held object: its target is left Wet on impact.' }],
  spark: ['HELD: electrify, +5 zap', 'HELD: electrify, +8 zap', { alone: 'A bolt that zaps for 5, ignores Block, and chains to every Wet foe for double. On Sir Isaac: your next hit carries +4 zap. On the ground: a Tesla coil that zaps a random foe each turn.',
    combo: 'Rides any thrown object as an electric charge. With Gravity: Stolen Thunder. With a Lens: the Death Ray.',
    air: 'Can be manifested as a crackling ball of lightning; released, it strikes its target and arcs to the Wet.', held: 'Electrifies a held object: sparks crawl over it and it zaps +5 on impact (double on the Wet).' }],
  gravity: ['HELD: lift it, then drop', null, { alone: 'Alone it pulls a foe off balance: Weak 2 (the unsteady fall Prone). On Sir Isaac: Block 4. On the ground: a Gravity Well that keeps foes from fleeing and from dodging.',
    combo: '+4 m/s, and the Move falls from above, so it cannot be dodged. Universal Gravitation makes it stronger still.',
    air: 'There is nothing to hold: manifest Matter first.', held: 'Lifts a held object high on its string, then drops it on the foe: a falling strike, +4 m/s, that no evasion can dodge.' }],
  mass: ['HELD: +2 kg, heavier', 'HELD: +3 kg, heavier', { alone: 'Thrown alone it is a weight: 2 kg at 2 m/s. On Sir Isaac: Block 5.',
    combo: '+2 kg to any Move. Three Masses and Gravity collapse into a Black Hole.', air: 'There is nothing to hold: manifest Matter first.', held: '+2 kg: the held object swells and sags on its string.' }],
  force: ['HELD: push +3 v, aim', 'HELD: push +4 v, aim', { alone: 'A bolt of pure force: 1 kg at 3 m/s. On Sir Isaac: your next Move gains +2 m/s.',
    combo: '+3 m/s to any Move. With Mass: F = ma. Three Forces become Unstoppable.', air: 'There is nothing to hold: manifest Matter first.',
    held: 'Pushes a held object: +3 m/s, it streaks with speed and aims at the nearest foe (drag the object onto a foe to aim it yourself).' }],
  rotation: ['HELD: spin, +1 hit', null, { alone: 'Alone it spins a foe Dizzy, so it may strike its friends. On Sir Isaac: Thorns 3. On the ground: a Whirlwind that blunts attacks.',
    combo: '+1 hit; overkill ricochets to the next foe. Two make a Dizzy Spell.', air: 'There is nothing to hold: manifest Matter first.', held: 'Spins a held object: +1 hit, and it curves through the air and ricochets.' }],
  inertia: ['HELD: strikes again', null, { alone: 'On Sir Isaac: keep your hand and your Block into next turn. On the ground: field objects last 2 more turns.',
    combo: 'The Move keeps rolling into its target next turn, 2 m/s slower.', air: 'There is nothing to hold: manifest Matter first.', held: 'Once released, the object keeps rolling and strikes again next turn.' }],
  heat: ['HELD: ignite, Burn 3', 'HELD: ignite, Burn 5', { alone: 'Sets a foe Burning 3 (a Wet foe hisses into blinding steam instead). On Sir Isaac: your hits Burn +2. On the ground: a Campfire that burns every foe each turn.',
    combo: 'Adds Burn to any Move; burning kills cauterize Hydra heads. With a Lens: Archimedes’ Heat Ray.',
    air: 'Can be manifested as a floating fireball that sets its target Burning.', held: 'Ignites a held object: it catches fire and Burns 3 on impact.' }],
  lens: ['HELD: focus, x1.5', 'HELD: focus, x2', { alone: 'Studies a foe: Vulnerable 2 (it takes 50% more). On Sir Isaac: draw 2. On the ground: a Burning Glass.',
    combo: 'x1.5 damage on a single target; it focuses a wave into one jet.', air: 'There is nothing to hold: manifest Matter first.', held: 'Focuses a held object: x1.5 damage on its one foe.' }],
  spring: ['HELD: bounces on', null, { alone: 'On Sir Isaac: Block 3 and draw 1. On the ground: a Catapult you can load with a Move.',
    combo: 'The Move bounces on to 1 more foe.', air: 'There is nothing to hold: manifest Matter first.', held: 'The held object bounces: after its target it springs on to another foe.' }],
  superposition: [AIRL, null, { alone: 'An Apple and a Spark at once: thrown, 2 damage and a zap of 5. On Sir Isaac: heal 4 and your next hit carries +4 zap.',
    combo: 'Counts as Matter and Energy both.', air: 'Manifest it and it hangs in two places at once (it only hits once, sadly).', held: 'Adds an apple and a spark to a held object.' }],
  golden_apple: [AIRL, null, { alone: 'Thrown it is 3 kg at 2 m/s, and a kill pays 8 gold. On Sir Isaac: heal 8. On the ground: a golden sapling.', combo: 'Any Move with it pays gold on a kill.', air: 'Manifest a hanging golden apple; it glitters while you load it with Laws.', held: 'Adds 3 kg and a golden bounty.' }],
  rotten_apple: [AIRL, null, { alone: 'Thrown it is 1 kg at 2 m/s and leaves Venom 4. On Sir Isaac: heal 1 (ew).', combo: 'Any Move with it poisons its target.', air: 'Manifest a rotten apple, buzzing faintly.', held: 'Adds Venom 4 to a held object.' }],
  pumice: [AIRL, null, { alone: 'Thrown it is 2 kg at 2 m/s against ALL foes. On Sir Isaac: Block 4. On the ground: a light Boulder.', combo: 'Spreads any Move to every foe.', air: 'A rock that floats anyway; manifest it and it barely needs the string.', held: 'Spreads a held object’s strike to every foe.' }],
  lodestone: [AIRL, null, { alone: 'Thrown it is 3 kg at 2 m/s and strips 2 Strength. On Sir Isaac: Block 6. On the ground: a Boulder.', combo: 'Any Move with it disarms its target.', air: 'Manifest a magnetic stone that tugs at the foes’ weapons.', held: 'Adds 3 kg and -2 Strength on impact.' }],
  ice: [AIRL, null, { alone: 'Thrown it is 3 kg at 2 m/s and leaves the foe Weak 2. On Sir Isaac: Block 4. On the ground: a Puddle.', combo: 'Any Move with it chills its target.', air: 'Manifest a hanging icicle.', held: 'Adds 3 kg and chills the target (Weak 2).' }],
  antigravity: ['HELD: float, Weak 2', null, { alone: 'Alone it unsteadies a foe: Weak 2. On Sir Isaac: Block 4.', combo: '+2 m/s and the struck foe is left Weak 2.', air: 'There is nothing to hold: manifest Matter first.', held: 'The held object floats higher and leaves its target Weak 2.' }],
  dark_matter: ['HELD: +3 kg, pierce', null, { alone: 'Thrown alone: 3 kg at 2 m/s that ignores Block. On Sir Isaac: Block 5.', combo: '+3 kg and the Move ignores Block.', air: 'There is nothing to hold: manifest Matter first.', held: '+3 kg of void: the held object darkens and ignores Block.' }],
  brute_force: ['HELD: push +6 v, aim', 'HELD: push +8 v, aim', { alone: 'A blast of force: 1 kg at 6 m/s, and you take 3.', combo: '+6 m/s, but you take 3.', air: 'There is nothing to hold: manifest Matter first.', held: 'Shoves a held object: +6 m/s and it aims at the nearest foe (you take 3 when it flies).' }],
  torque: ['HELD: twist, +1 hit', 'HELD: twist, +2 hits', { alone: 'Alone it spins a foe Dizzy. On Sir Isaac: Thorns 4.', combo: '+1 hit and +2 m/s.', air: 'There is nothing to hold: manifest Matter first.', held: 'Twists a held object: +1 hit, +2 m/s, it curves and ricochets.' }],
  momentum: ['HELD: rolls on, faster', null, { alone: 'On Sir Isaac: keep your hand and Block.', combo: 'The Move repeats for 2 turns and speeds up each time.', air: 'There is nothing to hold: manifest Matter first.', held: 'Once released the object keeps rolling for 2 turns, faster each time.' }],
  plasma: ['HELD: burn and zap', null, { alone: 'Burns 3 and zaps 4. On Sir Isaac: your hits Burn +2. On the ground: a Campfire.', combo: 'Adds Burn and a zap to any Move.', air: 'Can be manifested as a ball of plasma.', held: 'Wraps a held object in plasma: Burn 3 and zap 4 on impact.' }],
  prism: ['HELD: hits ALL foes', null, { alone: 'Alone: every foe is Vulnerable 1. On Sir Isaac: draw 2.', combo: 'The Move hits ALL foes.', air: 'There is nothing to hold: manifest Matter first.', held: 'Splits a held object’s strike across every foe.' }],
  slinky: ['HELD: bounces x3', 'HELD: bounces x4', { alone: 'On Sir Isaac: Block 3 and draw 1. On the ground: a Catapult.', combo: 'The Move bounces on to 3 more foes, 25% weaker each time.', air: 'There is nothing to hold: manifest Matter first.', held: 'The held object bounces on to 3 more foes.' }],
};
for (const [id, [line, lineUp, desc]] of Object.entries(LORE)) { const d = BASICS[id]; if (!d) continue; d.desc = desc; d.text = [...d.text.slice(0, 3), line]; if (d.upText) d.upText = [...d.upText.slice(0, 3), lineUp || line]; }

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

const POWER_DESC = {
  first_law: 'A Law, not a card to throw: drop it on Sir Isaac to enact it for the whole battle. Field objects and repeating Moves last one turn longer.',
  third_law: 'Enact it on Sir Isaac: for the rest of the battle every foe that hits you takes 3 damage back, ignoring Block.',
  gravitation: 'Enact it on Sir Isaac: every Gravity gets +2 m/s, and at the start of each turn an apple falls on a random foe.',
  calculus: 'Enact it on Sir Isaac: the first Move you make each turn (thrown or released from the air) gets +2 kg and +2 m/s.',
  thermo: 'Enact it on Sir Isaac: Burn no longer fades from foes, and every Heat burns 1 more.',
  orbit: 'Enact it on Sir Isaac: a little moon circles you, granting Block 4 each turn; whenever you use Gravity it strikes a foe for 8.',
};
for (const [id, d] of Object.entries(POWER_DESC)) POWERS[id].desc = d;

// the full hover description of a hand card: [heading, ...paragraph lines] (plain text)
export function describeCard(card) {
  if (card.type === 'power') { const p = POWERS[card.id]; return p ? { title: p.name, lines: [['LAW', p.desc]], flavor: p.flavor } : null; }
  const d = BASICS[card.id]; if (!d || !d.desc) return null;
  const canHold = d.kind === 'matter' || d.kind === 'energy';
  const lines = [['ALONE', d.desc.alone], ['COMBINED', d.desc.combo]];
  if (canHold) lines.push(['MANIFEST', d.desc.air]);
  lines.push(['ON A HELD OBJECT', d.desc.held]);
  return { title: d.name + (card.up ? '+' : ''), kind: KIND_LABEL[d.kind], lines, flavor: d.flavor };
}

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
