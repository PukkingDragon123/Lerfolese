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

  // ------------------------------------------------------------------ combinators: clone, boost, position (the playground)
  echo: card({ name: 'Echo', kind: 'tool', num: 28, echo: true, adj: 'Echoing', noun: 'Echo', art: 'sound',
    text: ['REPEATS the card', 'merged just before it', '(its left neighbour)', 'SELF: clone a hand card'],
    desc: { use: 'Merge it right after the card you want twice. On Newton: the leftmost card in your hand is cloned (a copy for this battle).', merge: 'It becomes a perfect copy of its left neighbour in the merge: a second Force, a second Mass, a second Heat...', skill: 'Echo of an Echo: two Echoes in a row repeat the same card twice.' }, flavor: 'Say it again. Louder.' }),
  looking_glass: card({ name: 'Looking-Glass', kind: 'tool', num: 29, twin: true, adj: 'Mirrored', noun: 'Reflection', block: 3, art: 'prism',
    text: ['CLONES the object:', 'a twin appears beside it', 'with the same cards', 'SELF: Block 3'],
    desc: { use: 'Drop it on a placed object: a twin object appears beside it, made of the same cards (if there is room for it).', merge: 'Two of everything. The twin keeps growing separately if you feed it.', skill: 'Narcissus’ trick: the twin is exactly as strong as the original.' }, flavor: 'Two of you. The universe is concerned.' }),
  resonance: card({ name: 'Resonance', kind: 'law', num: 30, resonance: 1.5, adj: 'Resonant', noun: 'Resonance', block: 2, art: 'rotation',
    text: ['×1.5 for every card', 'that appears twice', 'in the same object', 'SELF: Block 2'],
    desc: { use: 'Merge it into an object built from repeats: two Forces, three Masses...', merge: 'Each extra copy of a card in the object multiplies the strike ×1.5 (Echoes count).', skill: 'Sympathy: like calls to like.' }, flavor: 'The right note shatters the glass.' }),
  catalyst: card({ name: 'Catalyst', kind: 'energy', num: 31, catalyst: true, adj: 'Catalysed', noun: 'Catalyst', kindle: 1, art: 'heat',
    text: ['Heat in this object', '×2 while WATER is', 'in your hand', 'SELF: hits Burn +1'],
    desc: { use: 'Merge it into a hot object while you hold a Water card.', merge: 'While Water waits in your hand, every Heat in the object doubles: ×2 damage and double Burn.', skill: 'Reaction: it is never used up, only the water nearby matters.' }, flavor: 'Speeds everything up. Including regret.' }),
  amplifier: card({ name: 'Amplifier', kind: 'tool', num: 32, amplify: 2, adj: 'Amplified', noun: 'Amplifier', draw: 1, art: 'lens',
    text: ['DOUBLES the card', 'merged right after it', '(its right neighbour)', 'SELF: draw 1'],
    desc: { use: 'Merge it, then merge the card you want doubled.', merge: 'The next card merged into the object counts twice as much: double kg, double m/s, double Burn or zap.', skill: 'Order matters: an Amplifier as the last card does nothing.' }, flavor: 'Turns it up. All the way.' }),
  keystone: card({ name: 'Keystone', kind: 'matter', num: 33, m: 1, v: 0, keystone: 2, noun: 'Keystone', block: 4, hard: true, art: 'stone',
    text: ['Matter: 1 kg', '+2 kg for every', 'Stone in the object', 'SELF: Block 4'],
    desc: { use: 'Place it or merge it into a stony object.', merge: '+2 kg for each Stone, Earth, Pumice or Lodestone in the same object.', skill: 'The arch holds: the more stone, the heavier it gets.' }, flavor: 'Take it out and the whole arch falls.' }),
  domino: card({ name: 'Domino', kind: 'law', num: 34, domino: 0.2, adj: 'Toppling', noun: 'Domino', block: 2, art: 'inertia',
    text: ['+20% for every time', 'the card kind changes', 'along the merge', 'SELF: Block 2'],
    desc: { use: 'Merge it into an object built in alternation: Matter, Law, Energy, Tool, Matter...', merge: 'Walk the merge left to right: every neighbour of a different kind adds ×0.2 to the multiplier.', skill: 'Chain reaction: order your merges to keep it toppling.' }, flavor: 'One push. Then physics does the rest.' }),

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

  // ------------------------------------------------------------------ the prologue's third card: Spin (the rotation family's first member)
  spin: card({ name: 'Spin', kind: 'law', mutantOf: 'rotation', num: 35, hits: 1, dv: 1, launch: true, adj: 'Spinning', noun: 'Spin', thorns: 2, field: 'whirl', art: 'rotation', up: { hits: 1, dv: 2, thorns: 3 },
    rules: ['+1 {hit} HIT, +1 {v}', '{launch} LAUNCHES', 'SELF: {thorn} Thorns 2'], upRules: ['+1 {hit} HIT, +2 {v}', '{launch} LAUNCHES', 'SELF: {thorn} Thorns 3'],
    text: ['+1 HIT and +1 v', 'LAUNCHES it', 'MERGE: spins it', 'SELF: Thorns 2'],
    desc: { use: 'Merge it into a placed object to spin it at a foe. On Newton: Thorns 2 (attackers take 2).', merge: '+1 hit and +1 m/s, and it launches the object: Apple + Spin is an attack on its own.', skill: 'Ricochet: if a hit kills, the next hit finds another foe.' }, flavor: 'The master taught him this one with a top.' }),

  // ------------------------------------------------------------------ card flow: draw and discard (Slay-the-Spire style cycling)
  notebook: card({ name: 'Notebook', kind: 'tool', num: 36, draw: 2, dv: 1, adj: 'Annotated', noun: 'Notes', art: 'lens', up: { draw: 3 },
    rules: ['SELF: {draw} DRAW 2', 'MERGE: +1 {v}'], upRules: ['SELF: {draw} DRAW 3', 'MERGE: +1 {v}'],
    text: ['SELF: draw 2', 'MERGE: +1 v'], desc: { use: 'Drop it on Newton: draw 2 cards.', merge: '+1 m/s for the object it is merged into.', skill: 'Cycling: a thin deck is a fast deck.' }, flavor: 'Every margin full. Every margin right.' }),
  hypothesis: card({ name: 'Hypothesis', kind: 'tool', num: 37, draw: 1, hypo: 1, drawOnMerge: 1, adj: 'Tested', noun: 'Hypothesis', art: 'superposition', up: { hypo: 2 },
    rules: ['SELF: {draw} DRAW 1', 'If Matter: +1 {kg}', 'MERGE: {draw} draw 1'], upRules: ['SELF: {draw} DRAW 1', 'If Matter: +2 {kg}', 'MERGE: {draw} draw 1'],
    text: ['SELF: draw 1', 'if Matter: +1 kg', 'MERGE: draw 1'], desc: { use: 'On Newton: draw 1 card. If it is Matter, it is 1 kg heavier for this battle.', merge: 'Merged into an object: draw 1 card.', skill: 'Tested: a guess that pays for itself.' }, flavor: 'If I am right, it is heavier. If I am wrong, it is also heavier.' }),
  recycle: card({ name: 'Recycle', kind: 'tool', num: 38, recycle: 0, adj: 'Recycled', noun: 'Rethink', art: 'inertia', up: { recycle: 1 },
    rules: ['SELF: {disc} DISCARD any', '{draw} DRAW that many'], upRules: ['SELF: {disc} DISCARD any', '{draw} DRAW that many +1'],
    text: ['SELF: discard any,', 'draw that many'], desc: { use: 'On Newton: choose any cards in your hand to discard, then draw that many.', merge: 'It has no physics of its own: use it on Newton.', skill: 'Second thoughts, scientifically.' }, flavor: 'Nothing is wasted. Especially bad ideas.' }),
  scratchpad: card({ name: 'Scratchpad', kind: 'tool', num: 39, draw: 3, scratch: 1, adj: 'Scribbled', noun: 'Scribble', art: 'pendulum', up: { draw: 4 },
    rules: ['SELF: {draw} DRAW 3', 'then {disc} DISCARD 1'], upRules: ['SELF: {draw} DRAW 4', 'then {disc} DISCARD 1'],
    text: ['SELF: draw 3,', 'then discard 1'], desc: { use: 'On Newton: draw 3 cards, then discard 1 card of your choice.', merge: 'It has no physics of its own: use it on Newton.', skill: 'Rough work: the margin is where ideas are born.' }, flavor: 'Mostly crossed out. The rest is genius.' }),
  paper_plane: card({ name: 'Paper Plane', kind: 'tool', num: 40, launch: true, dv: 2, plane: 6, adj: 'Folded', noun: 'Glider', art: 'motion', up: { plane: 9, dv: 3 },
    rules: ['+2 {v}, {launch} LAUNCHES', 'DISCARDED: {hit} 6 to a foe'], upRules: ['+3 {v}, {launch} LAUNCHES', 'DISCARDED: {hit} 9 to a foe'],
    text: ['+2 v, LAUNCHES it', 'DISCARDED: 6 to a foe'], desc: { use: 'Merge it as a launcher.', merge: '+2 m/s and it launches the object.', skill: 'Glide: whenever you DISCARD it (Recycle, Scratchpad, a foe), it flies at a random foe for 6.' }, flavor: 'Aerodynamics, folded from a failed proof.' }),

  // ------------------------------------------------------------------ Block (brace for the thought bubbles)
  equilibrium: card({ name: 'Equilibrium', kind: 'law', num: 41, dm: 2, block: 7, keepBlock: true, adj: 'Balanced', noun: 'Balance', art: 'mass', up: { block: 10 },
    rules: ['SELF: {blk} BLOCK 7', 'Block is KEPT', 'MERGE: +2 {kg}'], upRules: ['SELF: {blk} BLOCK 10', 'Block is KEPT', 'MERGE: +2 {kg}'],
    text: ['SELF: Block 7, kept', 'next turn', 'MERGE: +2 kg'], desc: { use: 'On Newton: Block 7, and this turn\'s Block is not lost at the start of your next turn.', merge: '+2 kg.', skill: 'Balance: forces that cancel still count.' }, flavor: 'Sum of forces: zero. Sum of worries: also zero.' }),
  impulse: card({ name: 'Impulse', kind: 'law', num: 42, impulse: 1, block: 4, launch: true, adj: 'Impulsive', noun: 'Impulse', art: 'force', up: { impulse: 2, block: 6 },
    rules: ['+1 {v} per 4 {blk}', '{launch} LAUNCHES', 'SELF: {blk} BLOCK 4'], upRules: ['+2 {v} per 4 {blk}', '{launch} LAUNCHES', 'SELF: {blk} BLOCK 6'],
    text: ['+1 v per 4 Block', 'LAUNCHES it', 'SELF: Block 4'], desc: { use: 'Merge it as a launcher. On Newton: Block 4.', merge: 'Launches the object, +1 m/s for every 4 Block you hold: your guard becomes the swing.', skill: 'J = F·t: the shield becomes the hammer.' }, flavor: 'Brace, then shove. Repeat.' }),
  bulwark: card({ name: 'Bulwark', kind: 'matter', num: 43, m: 3, v: 0, noun: 'Slab', hard: true, block: 9, field: 'boulder', art: 'stone', up: { block: 13 },
    rules: ['{kg} 3 kg matter', 'SELF: {blk} BLOCK 9'], upRules: ['{kg} 3 kg matter', 'SELF: {blk} BLOCK 13'],
    text: ['Matter: 3 kg', 'SELF: Block 9'], desc: { use: 'Brace behind it on Newton: Block 9. Or place it to launch.', merge: 'A heavy slab of marble: counts as Stone.', skill: 'Wall: the best answer to a big number.' }, flavor: 'A wall that agreed to be portable.' }),
  third_reaction: card({ name: 'Reaction', kind: 'law', num: 44, block: 5, thorns: 3, dm: 1, adj: 'Reactive', noun: 'Reaction', art: 'antigravity', up: { block: 7, thorns: 5 },
    rules: ['SELF: {blk} BLOCK 5', '+ {thorn} THORNS 3', 'MERGE: +1 {kg}'], upRules: ['SELF: {blk} BLOCK 7', '+ {thorn} THORNS 5', 'MERGE: +1 {kg}'],
    text: ['SELF: Block 5', 'and Thorns 3', 'MERGE: +1 kg'], desc: { use: 'On Newton: Block 5 and Thorns 3 (attackers take 3).', merge: '+1 kg.', skill: 'Every push pushes back.' }, flavor: 'Equal. Opposite. Smug.' }),
};
// card-art subjects for the newer science cards (cardart.js draws BASICS[id].art when there is no subject of its own)
Object.assign(BASICS.motion, { art: 'momentum' }); Object.assign(BASICS.friction, { art: 'lava' }); Object.assign(BASICS.pendulum, { art: 'mass' });
Object.assign(BASICS.lever, { art: 'force' }); Object.assign(BASICS.magnet, { art: 'antigravity' }); Object.assign(BASICS.buoyancy, { art: 'water' });
Object.assign(BASICS.pressure, { art: 'dark_matter' }); Object.assign(BASICS.sound, { art: 'rotation' });

// ------------------------------------------------------------------ APPLE HEAT (friction; rules in combos.js HEAT)
// fric: the Heat a card adds when it is merged into an APPLE object (grab, throw, spin, rub, fire; water cools).
// selfHeat: the Heat it adds (or removes) dropped on Newton. The card face shows it as "+2 {heat}".
const FRIC = { apple: 1, golden_apple: 1, rotten_apple: 1, superposition: 1, force: 1, motion: 1, brute_force: 2, spring: 1, slinky: 1, paper_plane: 1, impulse: 1, pendulum: 1,
  spin: 2, rotation: 2, torque: 3, friction: 3, heat: 2, plasma: 2, catalyst: 1, water: -3, ice: -5 };
for (const [id, n] of Object.entries(FRIC)) {
  const d = BASICS[id]; d.fric = n; const apple = d.mutantOf === 'apple' || id === 'apple';
  const why = apple ? `Grabbing the apple: +${n} Heat (friction).` : n < 0 ? `It cools the apple: ${n} Heat.` : `Into an apple: +${n} Heat (friction).`; if (d.desc) d.desc.merge += ' ' + why;
  for (const k of ['text', 'upText']) if (d[k]) d[k] = [...d[k], apple ? `GRAB: +${n} HEAT` : `${n > 0 ? '+' : ''}${n} HEAT (apple)`];
}
Object.assign(BASICS.friction, { selfHeat: 2 }); Object.assign(BASICS.water, { selfHeat: -3 }); Object.assign(BASICS.ice, { selfHeat: -5 });
BASICS.friction.desc.use = 'Merge it into an object. On Newton: Block 4, and rub the apple: +2 Heat.';
BASICS.friction.desc.skill = 'Rub: the roughest card for the apple, +3 Heat. Brakes too: the best counter to a big thought bubble.';
BASICS.water.desc.use += ' It also cools the apple: -3 Heat.'; BASICS.ice.desc.use += ' It cools the apple: -5 Heat.';
BASICS.spin.rules = ['+1 {hit} +1 {v} +2 {heat}', '{launch} LAUNCHES', 'SELF: {thorn} Thorns 2']; BASICS.spin.upRules = ['+1 {hit} +2 {v} +2 {heat}', '{launch} LAUNCHES', 'SELF: {thorn} Thorns 3'];
BASICS.paper_plane.rules = ['+2 {v} +1 {heat}', '{launch} LAUNCHES', 'DISCARDED: {hit} 6']; BASICS.paper_plane.upRules = ['+3 {v} +1 {heat}', '{launch} LAUNCHES', 'DISCARDED: {hit} 9'];
BASICS.impulse.rules = ['+1 {v} per 4 {blk}', '{launch} LAUNCH +1 {heat}', 'SELF: {blk} BLOCK 4']; BASICS.impulse.upRules = ['+2 {v} per 4 {blk}', '{launch} LAUNCH +1 {heat}', 'SELF: {blk} BLOCK 6'];
Object.assign(BASICS, {
  bellows: card({ name: 'Bellows', kind: 'tool', num: 45, dv: 2, fric: 2, vent: true, adj: 'Stoked', noun: 'Blast', art: 'heat', up: { dv: 3, fric: 3 },
    rules: ['+2 {v} +2 {heat}', 'SELF: VENT all {heat}', '{blk} BLOCK = Heat'], upRules: ['+3 {v} +3 {heat}', 'SELF: VENT all {heat}', '{blk} BLOCK = Heat'],
    text: ['MERGE: +2 v, +2 Heat', 'SELF: vent all Heat', 'into Block'], desc: { use: 'On Newton: vent ALL of the apple\'s Heat and gain that much Block.', merge: '+2 m/s and it stokes the apple: +2 Heat.', skill: 'Stoke or vent: the apple\'s Heat becomes your shield.' }, flavor: 'Hephaestus\' second-best pair. He kept the best.' }),
  crucible: card({ name: 'Crucible', kind: 'tool', num: 46, crucible: 0.08, fric: 1, block: 3, adj: 'Molten', noun: 'Melt', art: 'lava', up: { crucible: 0.12, block: 5 },
    rules: ['x1 +8% per {heat}', '+1 {heat}', 'SELF: {blk} BLOCK 3'], upRules: ['x1 +12% per {heat}', '+1 {heat}', 'SELF: {blk} BLOCK 5'],
    text: ['x1 +8% per Heat', 'MERGE: +1 Heat', 'SELF: Block 3'], desc: { use: 'Merge it into any object. On Newton: Block 3.', merge: 'The object hits 8% harder for every point of apple Heat (×1.8 when it is at 10).', skill: 'Alchemy: Heat is a multiplier, if you dare.' }, flavor: 'Lead in, gold out. Results may vary.' }),
  quench: card({ name: 'Quench', kind: 'tool', num: 47, quench: true, fric: -4, wet: 1, adj: 'Quenched', noun: 'Hiss', art: 'water', up: { wet: 2 },
    rules: ['SELF: QUENCH all {heat}', '{hit} Heat x2 to ALL', 'MERGE: -4 {heat}'], upRules: ['SELF: QUENCH all {heat}', '{hit} Heat x2 to ALL', 'MERGE: -4 {heat}, WET 2'],
    text: ['SELF: quench all Heat:', 'Heat x2 to ALL foes', 'MERGE: -4 Heat'], desc: { use: 'On Newton: plunge the apple into water. ALL its Heat bursts out as steam: every foe takes twice the Heat, then the apple is cold.', merge: 'It cools the apple: -4 Heat, and leaves the foe Wet.', skill: 'Steam burst: the safest way down from scorching.' }, flavor: 'Hiss. The blacksmith\'s favourite word.' }),
});

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

// the prologue's three cards (Apple, Force, Spin) plus a brace: Mass
export const STARTER_DECK = ['apple', 'force', 'spin', 'mass'];

// rarity weights for rewards / shop
export const CARD_POOL = {
  basic: ['apple', 'notebook', 'equilibrium', 'bulwark', 'stone', 'water', 'spark', 'gravity', 'mass', 'force', 'motion', 'rotation', 'inertia', 'heat', 'lens', 'spring', 'friction', 'pendulum', 'lever', 'magnet', 'buoyancy', 'pressure', 'sound'],
  uncommonBasics: ['hypothesis', 'recycle', 'scratchpad', 'paper_plane', 'impulse', 'third_reaction', 'stone', 'water', 'spark', 'heat', 'lens', 'spring', 'friction', 'pendulum', 'lever', 'magnet', 'buoyancy', 'pressure', 'sound'],
  // what a discovery may offer: the science cards, a few copies of the core, the occasional mutant or Law of nature
  discover: ['notebook', 'hypothesis', 'recycle', 'scratchpad', 'paper_plane', 'equilibrium', 'impulse', 'bulwark', 'third_reaction', 'motion', 'spin', 'echo', 'looking_glass', 'resonance', 'catalyst', 'amplifier', 'keystone', 'domino', 'earth', 'stone', 'water', 'spark', 'heat', 'gravity', 'rotation', 'inertia', 'lens', 'spring', 'friction', 'pendulum', 'lever', 'magnet', 'buoyancy', 'pressure', 'sound', 'apple', 'apple', 'force', 'motion', 'mass', 'bellows', 'crucible', 'quench', 'friction'],
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
