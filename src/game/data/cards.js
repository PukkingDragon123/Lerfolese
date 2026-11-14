// The card set. A battle is "prepare, then resolve": Matter is PLACED on the field (its 3D model appears), Laws are
// MERGED into it, and End Turn releases everything. Damage per hit is  m (mass, kg) × v (velocity, m/s): matter is at
// rest (v 0) until a LAUNCHER (Force, Motion, Gravity, Spring, Spark...) sends it flying. Newton starts with only the
// four core cards (Apple, Force, Mass, Motion); every new merge discovered offers a pick of three new science cards.
// Each card has a unique skill and a full description (desc: use / merge / skill) shown on hover and in the card view.

export const KIND_LABEL = { matter: 'Matter', law: 'Law', energy: 'Energy', tool: 'Instrument' };

const card = (o) => o;
export const BASICS = {
  // ------------------------------------------------------------------ the four core cards
  apple: card({ name: 'Apple', kind: 'matter', num: 1, m: 1, v: 0, noun: 'Apple', heal: 5, up: { m: 2, heal: 7 }, field: 'sapling',
    text: ['Matter: 1 kg, at rest', 'EAT: drop on you, heal 5', 'PLACE: drop on the field', 'Then Force or Motion'], upText: ['Matter: 2 kg, at rest', 'EAT: drop on you, heal 7', 'PLACE: drop on the field', 'Then Force or Motion'],
    desc: { use: 'Drop it on the field to PLACE it: a 1 kg apple hangs there, waiting. Or drop it on Newton to EAT it and heal 5.', merge: 'It is the thing that gets thrown. Merge Force or Motion into it to launch it at a foe when you End Turn.', skill: 'Nourishing: the only card that heals when eaten whole.' },
    flavor: 'It fell. Everything else is commentary.' }),
  force: card({ name: 'Force', kind: 'law', num: 7, dv: 3, launch: true, shove: 2, adj: 'Forceful', noun: 'Shove', momentum: 2, up: { dv: 4, shove: 3, momentum: 3 },
    text: ['+3 v, LAUNCHES it', 'SHOVE: foe hits 2 less', 'MERGE: into an object', 'SELF: next object +2 v'], upText: ['+4 v, LAUNCHES it', 'SHOVE: foe hits 3 less', 'MERGE: into an object', 'SELF: next object +3 v'],
    desc: { use: 'Drag it onto a placed object to merge it in. On Newton: the next object you launch gets +2 m/s.', merge: '+3 m/s and the object is launched when you End Turn. Apple + Force is your first attack: 1 kg × 3 m/s = 3.', skill: 'Shove: the struck foe is knocked back, and its next attack deals 2 less.' },
    flavor: 'F = ma. Mostly a.' }),
  mass: card({ name: 'Mass', kind: 'law', num: 6, dm: 2, dv: -1, adj: 'Heavy', noun: 'Weight', block: 5, up: { dm: 3, block: 7 },
    text: ['+2 kg, -1 v (heavier)', 'Heavy = more damage', 'SELF: Block 5 (brace)', 'MERGE: into an object'], upText: ['+3 kg, -1 v (heavier)', 'Heavy = more damage', 'SELF: Block 7 (brace)', 'MERGE: into an object'],
    desc: { use: 'Merge it into a placed object to make it heavier, or drop it on Newton to brace: Block 5 against the next blows.', merge: '+2 kg but -1 m/s. Heavy and slow still hits harder: an apple with Force and Mass is 3 kg × 2 m/s = 6.', skill: 'Ballast: the heavier the object, the harder it lands.' },
    flavor: 'Heavy is a state of mind. Also of matter.' }),
  motion: card({ name: 'Motion', kind: 'law', num: 19, dv: 2, launch: true, carry: true, adj: 'Moving', noun: 'Projectile', draw: 1, up: { dv: 3, draw: 2 },
    text: ['+2 v, LAUNCHES it', 'CARRY: overkill flies on', 'MERGE: into an object', 'SELF: draw 1'], upText: ['+3 v, LAUNCHES it', 'CARRY: overkill flies on', 'MERGE: into an object', 'SELF: draw 2'],
    desc: { use: 'Merge it into a placed object to make it a projectile. On Newton: draw 1 card.', merge: '+2 m/s and the object is launched when you End Turn. Stack it with Force for a faster throw.', skill: 'Carry: if it kills, the damage left over flies on into the next foe.' },
    flavor: 'Objects in motion would like a word.' }),

  // ------------------------------------------------------------------ science cards (discovered)
  stone: card({ name: 'Stone', kind: 'matter', num: 2, m: 3, v: 0, noun: 'Stone', block: 6, hard: true, up: { m: 4, block: 9 }, field: 'boulder',
    text: ['Matter: 3 kg, at rest', 'CRACKS Block (x2)', 'SELF: Block 6', 'PLACE: then launch it'], upText: ['Matter: 4 kg, at rest', 'CRACKS Block (x2)', 'SELF: Block 9', 'PLACE: then launch it'],
    desc: { use: 'Place it as a heavy object to launch, or drop it on Newton: Block 6.', merge: 'Three times the mass of an apple: every m/s you add counts three times over.', skill: 'Hard: counts double against a foe’s Block.' }, flavor: 'Igneous, sedimentary, rude.' }),
  water: card({ name: 'Water', kind: 'matter', num: 3, m: 2, v: 0, noun: 'Splash', spread: true, wet: 2, heal: 2, cleanse: true, up: { m: 3, wet: 3, heal: 3 }, field: 'puddle',
    text: ['Matter: 2 kg, hits ALL', 'WET 2: zaps hit x2', 'SELF: heal 2, cleanse', 'PLACE: then launch it'], upText: ['Matter: 3 kg, hits ALL', 'WET 3: zaps hit x2', 'SELF: heal 3, cleanse', 'PLACE: then launch it'],
    desc: { use: 'Place a floating globe of water, or drop it on Newton to heal 2 and wash off Burn, Wet and Venom.', merge: 'Launched, it bursts over EVERY foe.', skill: 'Soak: foes are left Wet 2, so Spark deals double to them and fire turns to blinding steam.' }, flavor: 'Wet. Conducts. Judges you silently.' }),
  spark: card({ name: 'Spark', kind: 'energy', num: 4, charge: 5, launch: true, noun: 'Spark', adj: 'Electric', charged: 4, up: { charge: 8, charged: 6 }, field: 'coil',
    text: ['ZAP 5, ignores Block', 'Self-launching', 'Chains to Wet foes', 'SELF: next hit +4 zap'], upText: ['ZAP 8, ignores Block', 'Self-launching', 'Chains to Wet foes', 'SELF: next hit +6 zap'],
    desc: { use: 'Place a ball of lightning (it launches itself), or merge it into an object to electrify it. On Newton: your next hit carries +4 zap.', merge: '+5 zap that ignores Block, and the object launches.', skill: 'Chain: the zap leaps to every Wet foe for double.' }, flavor: 'Borrowed from a god. Not returning it.' }),
  heat: card({ name: 'Heat', kind: 'energy', num: 10, burn: 3, adj: 'Hot', noun: 'Flame', kindle: 2, up: { burn: 5, kindle: 3 }, field: 'campfire',
    text: ['BURN 3 each turn', 'Wet foes steam (Blind)', 'MERGE: ignites it', 'SELF: hits Burn +2'], upText: ['BURN 5 each turn', 'Wet foes steam (Blind)', 'MERGE: ignites it', 'SELF: hits Burn +3'],
    desc: { use: 'Merge it into an object to set it alight. On Newton: all your hits this turn Burn +2.', merge: 'The struck foe Burns 3 at the end of each turn. A fireball still needs a launcher.', skill: 'Cauterize: burning kills stop Hydra heads growing back.' }, flavor: 'Thermodynamics, but spicy.' }),
  gravity: card({ name: 'Gravity', kind: 'law', num: 5, dv: 4, fall: true, launch: true, adj: 'Falling', block: 4, up: { dv: 6, block: 6 }, field: 'well',
    text: ['+4 v, LAUNCHES it', 'FALLS: never dodged', 'MERGE: into an object', 'SELF: Block 4'], upText: ['+6 v, LAUNCHES it', 'FALLS: never dodged', 'MERGE: into an object', 'SELF: Block 6'],
    desc: { use: 'Merge it into an object: it rises, then drops on the foe. On Newton: Block 4.', merge: '+4 m/s and it falls from above.', skill: 'Falling strike: cannot be dodged, and it ignores the Hydra’s thick hide.' }, flavor: 'What goes up is contractually obliged.' }),
  rotation: card({ name: 'Rotation', kind: 'law', num: 8, hits: 1, adj: 'Spinning', noun: 'Spin', thorns: 3, up: { hits: 1, dv: 1, thorns: 5 }, field: 'whirl',
    text: ['+1 HIT', 'Overkill ricochets', 'MERGE: spins it', 'SELF: Thorns 3'], upText: ['+1 HIT and +1 v', 'Overkill ricochets', 'MERGE: spins it', 'SELF: Thorns 3'],
    desc: { use: 'Merge it to spin an object. On Newton: Thorns 3 (attackers take 3).', merge: 'The object strikes one extra time.', skill: 'Ricochet: if a hit kills, the next hit finds another foe.' }, flavor: 'Round and round. Scientifically.' }),
  inertia: card({ name: 'Inertia', kind: 'law', num: 9, persist: 1, adj: 'Relentless', retain: true, up: { persist: 2 },
    text: ['Strikes AGAIN next turn', '(v -2 each time)', 'MERGE: keeps it going', 'SELF: keep hand+Block'], upText: ['Strikes again 2 turns', '(v -2 each time)', 'MERGE: keeps it going', 'SELF: keep hand+Block'],
    desc: { use: 'Merge it into an object. On Newton: keep your hand and your Block into next turn.', merge: 'After it lands, the object keeps rolling and strikes again next turn, 2 m/s slower.', skill: 'Persistence: one card, two turns of damage.' }, flavor: 'Objects in motion stay in motion. So do grudges.' }),
  lens: card({ name: 'Lens', kind: 'tool', num: 11, focus: 1.5, adj: 'Focused', noun: 'Glare', draw: 2, up: { focus: 2, draw: 3 }, field: 'glass',
    text: ['x1.5 damage', 'One target only', 'MERGE: focuses it', 'SELF: draw 2'], upText: ['x2 damage', 'One target only', 'MERGE: focuses it', 'SELF: draw 3'],
    desc: { use: 'Merge it into an object to focus it. On Newton: draw 2.', merge: 'x1.5 damage, but a wave becomes a single jet.', skill: 'Study: a Lens alone leaves its foe Vulnerable 2 (takes 50% more).' }, flavor: 'Look closer. No, closer. There.' }),
  spring: card({ name: 'Spring', kind: 'tool', num: 12, bounce: 1, launch: true, adj: 'Bouncy', noun: 'Boing', block: 3, draw: 1, up: { bounce: 2, block: 5 }, field: 'catapult',
    text: ['LAUNCHES it', 'Bounces to 1 more foe', 'MERGE: springs it', 'SELF: Block 3, draw 1'], upText: ['LAUNCHES it', 'Bounces to 2 more', 'MERGE: springs it', 'SELF: Block 5, draw 1'],
    desc: { use: 'Merge it as a launcher. On Newton: Block 3 and draw 1.', merge: 'Launches the object, and after its target it bounces on to another foe.', skill: 'Bounce: one throw, two foes.' }, flavor: 'Hooke had a point. Several, actually.' }),
  friction: card({ name: 'Friction', kind: 'law', num: 20, weakOnHit: 2, adj: 'Grinding', noun: 'Drag', block: 4, up: { weakOnHit: 3, block: 6 },
    text: ['Foe WEAK 2', '(it hits 25% less)', 'MERGE: grinds it', 'SELF: Block 4'], upText: ['Foe WEAK 3', '(it hits 25% less)', 'MERGE: grinds it', 'SELF: Block 6'],
    desc: { use: 'Merge it into an object. On Newton: Block 4.', merge: 'The struck foe is Weak 2: its attacks deal 25% less.', skill: 'Brakes: the best counter to a big thought bubble.' }, flavor: 'Nothing slides forever. Not even excuses.' }),
  pendulum: card({ name: 'Pendulum', kind: 'tool', num: 21, launch: true, swing: 1, adj: 'Swinging', noun: 'Swing', block: 3, up: { swing: 2 },
    text: ['LAUNCHES it', '+1 v per other card', 'MERGE: a long swing', 'SELF: Block 3'], upText: ['LAUNCHES it', '+2 v per other card', 'MERGE: a long swing', 'SELF: Block 3'],
    desc: { use: 'Merge it as a launcher. On Newton: Block 3.', merge: 'Launches the object with +1 m/s for every other card already in it.', skill: 'Long swing: the bigger the build, the faster it comes back.' }, flavor: 'Proof the world turns. Also the pendulum.' }),
  lever: card({ name: 'Lever', kind: 'tool', num: 22, lever: true, adj: 'Levered', noun: 'Lever', draw: 1,
    text: ['x2 FORCE damage', 'Needs Force in it', 'MERGE: multiplies it', 'SELF: draw 1'],
    desc: { use: 'Merge it into an object that has Force. On Newton: draw 1.', merge: 'If the object holds a Force, its damage is doubled.', skill: 'Fulcrum: give it a place to stand.' }, flavor: 'Give me a place to stand. Also a snack.' }),
  magnet: card({ name: 'Magnet', kind: 'tool', num: 23, launch: true, dv: 1, disarm: 2, seek: 'threat', adj: 'Magnetic', noun: 'Lodestar', block: 2,
    text: ['+1 v, LAUNCHES it', 'Seeks the biggest hitter', 'Foe -2 Strength', 'SELF: Block 2'],
    desc: { use: 'Merge it as a launcher. On Newton: Block 2.', merge: 'Launches the object at the foe about to hit you hardest.', skill: 'Disarm: the struck foe loses 2 Strength for the battle.' }, flavor: 'Attracted to trouble.' }),
  buoyancy: card({ name: 'Buoyancy', kind: 'law', num: 24, launch: true, dv: 1, fall: true, float: true, adj: 'Floating', noun: 'Bubble', heal: 2,
    text: ['+1 v, it rises & drops', 'You gain Block = mass', 'Never dodged', 'SELF: heal 2'],
    desc: { use: 'Merge it into an object: it floats up and drops on the foe. On Newton: heal 2.', merge: '+1 m/s and a falling strike.', skill: 'Displacement: when it is released Newton gains Block equal to its mass.' }, flavor: 'Eureka. Also, someone get Archimedes a towel.' }),
  pressure: card({ name: 'Pressure', kind: 'law', num: 25, pressure: 1, adj: 'Pressurised', noun: 'Squeeze', block: 3, up: { pressure: 2 },
    text: ['+1 kg per other card', 'Packs it dense', 'MERGE: squeezes it', 'SELF: Block 3'], upText: ['+2 kg per other card', 'Packs it dense', 'MERGE: squeezes it', 'SELF: Block 3'],
    desc: { use: 'Merge it into a big object. On Newton: Block 3.', merge: '+1 kg for every other card in the object.', skill: 'Compression: the payoff for big merges.' }, flavor: 'Force per area. Mostly per area of face.' }),
  sound: card({ name: 'Sound', kind: 'energy', num: 26, launch: true, spread: true, waveMul: 0.5, dm: 1, dv: 2, dizzyOnHit: 1, adj: 'Sonic', noun: 'Shockwave', draw: 1,
    text: ['+2 v, hits ALL at half', 'Foes DIZZY 1', 'Self-launching', 'SELF: draw 1'],
    desc: { use: 'Merge it as a launcher, or place it alone as a shockwave. On Newton: draw 1.', merge: 'The object becomes a shockwave that hits every foe at half damage.', skill: 'Dizzy: shaken foes may strike each other.' }, flavor: 'A wave of pressure. Rude, at volume.' }),

  earth: card({ name: 'Earth', kind: 'matter', num: 27, m: 4, v: 0, noun: 'Clod', hard: true, block: 7, field: 'boulder', up: { m: 5, block: 9 }, art: 'stone',
    text: ['Matter: 4 kg, at rest', 'Counts as Stone', 'SELF: Block 7', 'Hides a Law...'], upText: ['Matter: 5 kg, at rest', 'Counts as Stone', 'SELF: Block 9', 'Hides a Law...'],
    desc: { use: 'Place a clod of the very planet to launch, or brace behind it: Block 7.', merge: 'The heaviest matter you can hold. It counts as Stone for every synergy.', skill: 'Gravitas: an apple and the Earth, under Gravity, are said to obey a hidden Law.' }, flavor: 'A small sample of everywhere.' }),

  // ------------------------------------------------------------------ mutants (events, the lab, discoveries)
  superposition: card({ name: 'Superposition', kind: 'matter', mutantOf: 'apple', m: 1, v: 0, charge: 5, launch: true, noun: 'Quantum Apple', heal: 4, charged: 4, field: 'sapling',
    text: ['Apple AND Spark', '1 kg + ZAP 5', 'Self-launching', 'EAT: heal 4'],
    desc: { use: 'Place it (it launches itself), or eat it: heal 4 and your next hit +4 zap.', merge: 'Counts as both an apple and a spark.', skill: 'Uncertain: it is lunch until observed.' }, flavor: 'Observed, it is lunch.' }),
  golden_apple: card({ name: 'Golden Apple', kind: 'matter', mutantOf: 'apple', m: 3, v: 0, noun: 'Golden Apple', heal: 8, goldOnKill: 8, field: 'sapling', up: { m: 4, heal: 10 },
    text: ['Matter: 3 kg', 'KILL: +8 gold', 'EAT: heal 8', 'PLACE: then launch it'],
    desc: { use: 'Place it to throw, or eat it to heal 8.', merge: 'A heavy golden apple.', skill: 'Bounty: a kill with it pays 8 gold.' }, flavor: 'Discord, but make it shiny.' }),
  rotten_apple: card({ name: 'Rotten Apple', kind: 'matter', mutantOf: 'apple', m: 1, v: 0, noun: 'Rotten Apple', venom: 4, heal: 1, field: 'sapling', up: { venom: 6 },
    text: ['Matter: 1 kg', 'VENOM 4', 'EAT: heal 1 (ew)', 'PLACE: then launch it'],
    desc: { use: 'Place it to throw. Eating it is a mistake (heal 1).', merge: 'Poisons whatever it hits.', skill: 'Venom 4: the foe loses 4, then 3, then 2...' }, flavor: 'Smells like a hypothesis gone wrong.' }),
  pumice: card({ name: 'Pumice', kind: 'matter', mutantOf: 'stone', m: 2, v: 0, noun: 'Pumice', spread: true, block: 4, field: 'boulder', up: { m: 3, block: 6 },
    text: ['Matter: 2 kg', 'Hits ALL foes', 'SELF: Block 4', 'PLACE: then launch it'],
    desc: { use: 'Place it to throw at everyone, or brace with it: Block 4.', merge: 'Spreads the object’s strike to all foes.', skill: 'Shatter: a rock that bursts on impact.' }, flavor: 'A rock that floats. Unacceptable.' }),
  lodestone: card({ name: 'Lodestone', kind: 'matter', mutantOf: 'stone', m: 3, v: 0, noun: 'Lodestone', disarm: 2, block: 6, field: 'boulder', up: { m: 4, disarm: 3 },
    text: ['Matter: 3 kg', 'Foe -2 Strength', 'SELF: Block 6', 'PLACE: then launch it'],
    desc: { use: 'Place it to throw, or brace: Block 6.', merge: 'A magnetic stone.', skill: 'Disarm: the struck foe loses 2 Strength.' }, flavor: 'Magnetically attracted to trouble.' }),
  ice: card({ name: 'Ice', kind: 'matter', mutantOf: 'water', m: 3, v: 0, noun: 'Icicle', chill: 2, block: 4, field: 'puddle', up: { m: 4, chill: 3 },
    text: ['Matter: 3 kg', 'Foe WEAK 2', 'SELF: Block 4', 'PLACE: then launch it'],
    desc: { use: 'Place an icicle to throw, or brace: Block 4.', merge: 'A heavy, chilling object.', skill: 'Chill: the struck foe is Weak 2.' }, flavor: 'Water that made a decision.' }),
  antigravity: card({ name: 'Antigravity', kind: 'law', mutantOf: 'gravity', dv: 2, fall: true, launch: true, adj: 'Floating', weakOnHit: 2, block: 4, field: 'well', up: { dv: 4 },
    text: ['+2 v, LAUNCHES it', 'Foe WEAK 2', 'Falls: never dodged', 'SELF: Block 4'],
    desc: { use: 'Merge it as a launcher. On Newton: Block 4.', merge: '+2 m/s, a falling strike.', skill: 'Unsteady: the struck foe is Weak 2.' }, flavor: 'What goes up stays up. Out of spite.' }),
  dark_matter: card({ name: 'Dark Matter', kind: 'law', mutantOf: 'mass', dm: 3, dv: -1, adj: 'Dark', noun: 'Void', pierce: true, block: 5, up: { dm: 4 },
    text: ['+3 kg, -1 v', 'IGNORES Block', 'MERGE: darkens it', 'SELF: Block 5'],
    desc: { use: 'Merge it into an object. On Newton: Block 5.', merge: '+3 kg and the object ignores Block.', skill: 'Void: Block simply is not there for it.' }, flavor: 'Mostly hypothetical. Hits very real.' }),
  brute_force: card({ name: 'Brute Force', kind: 'law', mutantOf: 'force', dv: 6, launch: true, shove: 3, adj: 'Brutal', noun: 'Haymaker', recoil: 3, momentum: 4, up: { dv: 8 },
    text: ['+6 v, LAUNCHES it', 'You take 3', 'SHOVE: foe hits 3 less', 'SELF: next object +4 v'],
    desc: { use: 'Merge it as a launcher. On Newton: the next object gets +4 m/s.', merge: '+6 m/s, but you take 3 when it flies.', skill: 'Haymaker: a huge shove; the foe hits 3 less.' }, flavor: 'The elegant solution, minus elegance.' }),
  torque: card({ name: 'Torque', kind: 'law', mutantOf: 'rotation', hits: 1, dv: 2, adj: 'Twisting', noun: 'Twist', thorns: 4, field: 'whirl', up: { hits: 2 },
    text: ['+1 HIT and +2 v', 'Overkill ricochets', 'MERGE: twists it', 'SELF: Thorns 4'],
    desc: { use: 'Merge it to twist an object. On Newton: Thorns 4.', merge: '+1 hit and +2 m/s.', skill: 'Ricochet: kills send the next hit on.' }, flavor: 'Rotation with a grudge.' }),
  momentum: card({ name: 'Momentum', kind: 'law', mutantOf: 'inertia', persist: 2, grow: true, adj: 'Snowballing', retain: true, up: { persist: 3 },
    text: ['Strikes 2 more turns', 'v GROWS +2 each time', 'MERGE: keeps it going', 'SELF: keep hand+Block'],
    desc: { use: 'Merge it into an object. On Newton: keep your hand and Block.', merge: 'The object strikes again for 2 turns, faster each time.', skill: 'Snowball: p = mv, and v is having a great day.' }, flavor: 'p = mv, and v is having a great day.' }),
  plasma: card({ name: 'Plasma', kind: 'energy', mutantOf: 'heat', burn: 3, charge: 4, launch: true, adj: 'Plasma', noun: 'Plasma', kindle: 2, field: 'campfire', up: { burn: 5, charge: 6 },
    text: ['BURN 3 and ZAP 4', 'Self-launching', 'MERGE: wraps it', 'SELF: hits Burn +2'],
    desc: { use: 'Place a ball of plasma or merge it into an object. On Newton: hits Burn +2.', merge: 'Burn 3 and zap 4, and it launches.', skill: 'Fourth state: fire and lightning at once.' }, flavor: 'The fourth state of matter. Fifth state of mind.' }),
  prism: card({ name: 'Prism', kind: 'tool', mutantOf: 'lens', prism: true, adj: 'Prismatic', noun: 'Rainbow', draw: 2, field: 'glass', up: { draw: 3 },
    text: ['Hits ALL foes', 'Splits the light', 'MERGE: splits it', 'SELF: draw 2'],
    desc: { use: 'Merge it into an object. On Newton: draw 2.', merge: 'The object strikes every foe.', skill: 'Spectrum: one throw, every foe.' }, flavor: 'Splits light, attention and enemies.' }),
  slinky: card({ name: 'Slinky', kind: 'tool', mutantOf: 'spring', bounce: 3, bounceFalloff: 0.25, launch: true, adj: 'Slinky', noun: 'Slinky', block: 3, draw: 1, field: 'catapult', up: { bounce: 4 },
    text: ['LAUNCHES it', 'Bounces 3 more (-25%)', 'MERGE: slinks it', 'SELF: Block 3, draw 1'],
    desc: { use: 'Merge it as a launcher. On Newton: Block 3, draw 1.', merge: 'Launches and bounces to 3 more foes, 25% weaker each time.', skill: 'Staircase: goes down stairs. And enemies.' }, flavor: 'Goes down stairs. And enemies.' }),
};
// card-art subjects for the newer science cards (cardart.js draws BASICS[id].art when there is no subject of its own)
Object.assign(BASICS.motion, { art: 'momentum' }); Object.assign(BASICS.friction, { art: 'lava' }); Object.assign(BASICS.pendulum, { art: 'mass' });
Object.assign(BASICS.lever, { art: 'force' }); Object.assign(BASICS.magnet, { art: 'antigravity' }); Object.assign(BASICS.buoyancy, { art: 'water' });
Object.assign(BASICS.pressure, { art: 'dark_matter' }); Object.assign(BASICS.sound, { art: 'rotation' });

export const MUTATIONS = {
  apple: ['golden_apple', 'rotten_apple'], stone: ['pumice', 'lodestone'], gravity: ['antigravity'], mass: ['dark_matter'],
  force: ['brute_force'], rotation: ['torque'], inertia: ['momentum'], heat: ['plasma'], water: ['ice'], lens: ['prism'], spring: ['slinky'], spark: ['plasma'], motion: ['momentum'],
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
  first_law: 'A Law, not a card to throw: drop it on Newton to enact it for the whole battle. Field objects and repeating Moves last one turn longer.',
  third_law: 'Enact it on Newton: for the rest of the battle every foe that hits you takes 3 damage back, ignoring Block.',
  gravitation: 'Enact it on Newton: every Gravity gets +2 m/s, and at the start of each turn an apple falls on a random foe.',
  calculus: 'Enact it on Newton: the first Move you make each turn (thrown or released from the air) gets +2 kg and +2 m/s.',
  thermo: 'Enact it on Newton: Burn no longer fades from foes, and every Heat burns 1 more.',
  orbit: 'Enact it on Newton: a little moon circles you, granting Block 4 each turn; whenever you use Gravity it strikes a foe for 8.',
};
for (const [id, d] of Object.entries(POWER_DESC)) POWERS[id].desc = d;

// the full description of a card: [label, text] paragraphs (plain text) + flavour
export function describeCard(card) {
  if (card.type === 'power') { const p = POWERS[card.id]; return p ? { title: p.name, kind: 'Power', lines: [['LAW', p.desc]], flavor: p.flavor } : null; }
  const d = BASICS[card.id]; if (!d || !d.desc) return null;
  const lines = [['USE', d.desc.use], ['MERGED', d.desc.merge], ['SKILL', d.desc.skill]];
  if (d.launch) lines.push(['LAUNCHER', 'This card launches the object it is merged into.']);
  return { title: d.name + (card.up ? '+' : ''), kind: KIND_LABEL[d.kind], lines, flavor: d.flavor };
}

export const STARTER_DECK = ['apple', 'force', 'mass', 'motion'];

// rarity weights for rewards / shop
export const CARD_POOL = {
  basic: ['apple', 'stone', 'water', 'spark', 'gravity', 'mass', 'force', 'motion', 'rotation', 'inertia', 'heat', 'lens', 'spring', 'friction', 'pendulum', 'lever', 'magnet', 'buoyancy', 'pressure', 'sound'],
  uncommonBasics: ['stone', 'water', 'spark', 'heat', 'lens', 'spring', 'friction', 'pendulum', 'lever', 'magnet', 'buoyancy', 'pressure', 'sound'],
  // what a discovery may offer: the science cards, a few copies of the core, the occasional mutant or Law of nature
  discover: ['earth', 'stone', 'water', 'spark', 'heat', 'gravity', 'rotation', 'inertia', 'lens', 'spring', 'friction', 'pendulum', 'lever', 'magnet', 'buoyancy', 'pressure', 'sound', 'apple', 'apple', 'force', 'motion', 'mass'],
  rare: ['golden_apple', 'ice', 'lodestone', 'antigravity', 'dark_matter', 'torque', 'momentum', 'plasma', 'prism', 'slinky', 'brute_force'],
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
