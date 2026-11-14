// Rare Curios: only from events, elites and guardians/bosses. Never from normal fights or shops.
// Hooks receive (battle, item, ...). "resonates" lists items it interacts with.
export const ITEMS = {
  spirit_cross: { name: 'The Spirit Cross', starter: true, icon: 'cross', text: 'Your control bar. Six gravity strings: draw 6 cards a turn.', flavor: 'Death is a career change.' },
  golden_apple: { name: 'Golden Apple of the Hesperides', icon: 'gapple', text: 'Apples heal +3. Once, when you would die, eat it and revive at 40%.', flavor: 'Guarded by a dragon. Was.', resonates: ['schrodinger'] },
  lever: { name: "Archimedes' Lever", icon: 'lever', text: 'The first Force in each Move counts double.', flavor: 'Give me a place to stand. Also a snack.', resonates: ['horn'] },
  pendulum: { name: 'Pendulum of Foucault', icon: 'pendulum', text: 'Every 3rd turn, your biggest Move this turn repeats at half power.', flavor: 'Proof the world turns. Also the pendulum.', resonates: ['antikythera'] },
  leyden: { name: 'Leyden Jar', icon: 'jar', text: 'Each Spark stores 1 charge. At 4: zap ALL foes for 12 (x2 Wet).', flavor: 'Bottled lightning. Do not shake. (Shake it.)', resonates: ['mirror'] },
  wings: { name: 'Wax Wings', icon: 'wings', text: 'The first attack each battle misses you. Playing Heat 2+ times melts them for the battle (take 6).', flavor: 'Lightly used. Previous owner: unavailable.' },
  antikythera: { name: 'Antikythera Mechanism', icon: 'gear', text: 'Draw 1 extra card on your first turn. Foes reveal their next TWO intents.', flavor: 'A Greek computer. Still faster than mine.', resonates: ['pendulum'] },
  schrodinger: { name: "Schrödinger's Lunchbox", icon: 'box', text: 'Each battle starts with a Superposition in hand: an Apple AND a Spark until played.', flavor: 'The sandwich is both eaten and not.', resonates: ['golden_apple'] },
  owl: { name: 'Owl of Athena', icon: 'owl', text: '+1 Second Thought each battle. Lens cards draw 1 more.', flavor: 'Wise. Judgemental. Mostly judgemental.' },
  pan_flute: { name: "Pan's Flute", icon: 'flute', text: 'At battle start, all foes dance: Weak 1 and Dizzy 1.', flavor: 'Contains at least one forbidden chord.' },
  horn: { name: "Minotaur's Horn", icon: 'horn', text: 'Force gives +2 extra v. Below half health: +4 instead.', flavor: 'Still angry. Separately.', resonates: ['lever'] },
  fang: { name: 'Hydra Fang', icon: 'fang', text: 'Multi-hit Moves apply 1 Venom per hit.', flavor: 'It grew back. The fang did not care.' },
  mirror: { name: "Medusa's Mirror", icon: 'mirror', text: 'Lens alone also reflects: the target is Stunned if it was going to debuff you.', flavor: 'Perseus left a 1-star review.', resonates: ['leyden'] },
  prism: { name: "Newton's Prism", icon: 'prism', math: true, text: 'Light (Lens, Spark) splits: 3 hits at 40% each (×1.2 in all, triple the on-hit effects).', flavor: 'I split light. Light had it coming.' },
  sack: { name: "Kobalos's Sack", icon: 'sack', text: '+25% gold. Stolen cards come back with interest (+10 gold).', flavor: 'Smells of pockets.' },
  thread: { name: "Ariadne's Thread", icon: 'thread', text: 'A seventh string: draw 1 extra card each turn.', flavor: 'For when the maze is metaphorical.' },
  wineskin: { name: 'Bottomless Wineskin', icon: 'wineskin', text: 'Heal 2 at the start of each turn. Your first Move each battle goes to a random foe.', flavor: 'Bottomless. Like your excuses.' },
  wine_flask: { name: "Satyr's Wine Flask", icon: 'wineskin', text: 'Heal 3 at the start of each battle.', flavor: 'Still sloshing. Still singing.' },
  horn_shard: { name: 'Minotaur Horn Shard', icon: 'horn', text: 'Every Force gives +1 extra v.', flavor: 'A splinter of very old anger.' },
  gorgon_scale: { name: 'Gorgon Scale', icon: 'mirror', text: 'Start each battle with 4 Block.', flavor: 'Hard as stone. Obviously.' },
  // ---- artifacts that bend the arithmetic (data/synergy.js ARTIFACT_MATH holds their rules). Some must first be
  // unlocked by the wizard frog (save.js STAR_UNLOCKS 'artifact:<id>'); run.js unlocked(id) filters every pool.
  statues: { name: 'The Statues', icon: 'statues', math: true, text: 'ALL damage ×3. But your hand holds only 3 cards.', flavor: "Medusa's admirers, petrified mid-applause. They still clap, slowly, for you." },
  tyche: { name: 'Dice of Tyche', icon: 'tyche', math: true, text: 'Every throw: 1 in 2 ×2, else ×0.5.', flavor: 'Fortune is a goddess. She is also a gambler.' },
  horseshoe: { name: "Hermes' Horseshoe", icon: 'horseshoe', math: true, text: 'Every throw: 1 in 4 lands a Lucky ×2.', flavor: 'Shod on the swiftest foot in Olympus. Still lucky.' },
  pandora: { name: "Pandora's Jar", icon: 'pandora', math: true, text: 'Every throw: 1 in 3 ×3 · 1 in 3 ×1 · 1 in 3 it fizzles.', flavor: 'Hope was at the bottom. So were the odds.' },
  golden_ratio: { name: 'The Golden Ratio', icon: 'golden_ratio', math: true, text: 'Every 5th merge of the run is golden: ×1.618.', flavor: 'φ = 1.618... Even snails know it.' },
  lead_boots: { name: 'Lead Boots', icon: 'lead_boots', math: true, text: 'Mass cards give double the kg. You can no longer dodge.', flavor: 'Excellent posture. Terrible footwork.' },
  lyre: { name: "Pythagoras' Lyre", icon: 'lyre', math: true, text: 'Objects of exactly 3 cards ×1.5. Objects of 5 or more ×0.75.', flavor: 'All is number. Three is a chord.' },
  nemesis: { name: 'Coin of Nemesis', icon: 'nemesis', math: true, text: '×2 against the foe with the most HP. ×0.75 against all the others.', flavor: 'Retribution, for the proud and the healthy.' },
  achilles: { name: 'Heel of Achilles', icon: 'achilles', math: true, text: 'Every 3rd strike on the same foe ×3.', flavor: 'Everyone has one. Keep counting.' },
  anvil: { name: 'Anvil of Hephaestus', icon: 'anvil', math: true, text: 'Stone and Mass objects ×1.5. Spark objects ×0.5.', flavor: 'The smith god hates loose sparks.' },
  amphora: { name: 'The Leaky Amphora', icon: 'amphora', math: true, text: 'Water objects ×2. Heat objects ×0.5.', flavor: 'It leaks on purpose. Probably.' },
  icarus_feather: { name: "Icarus' Feather", icon: 'icarus_feather', math: true, text: 'Falling objects ×2. Each one costs you 2 HP (the wax drips).', flavor: 'The last one he lost.' },
  talaria: { name: 'Talaria', icon: 'talaria', text: 'Winged sandals: your dodge window is 60% wider.', flavor: 'Hermes lent them. Hermes wants them back.' },
  plumb_bob: { name: 'Plumb Bob', icon: 'plumb', text: 'Gravity gives +1 v for every Mass in the same Move.', flavor: 'The truest vertical. My namesake. Ish.' },
};

// what each foe carries (battleRewards): its own drops, a chance for normal foes (elites always drop). Unknown
// foes (new beasts) may declare `loot: { items: [...], gold: [a, b], chance }` on their enemy definition instead.
export const LOOT = {
  satyr: { items: ['wine_flask', 'tyche', 'pan_flute', 'wineskin'], chance: 0.45 },
  kobalos: { items: ['sack', 'horseshoe', 'thread'], chance: 0.35 },
  medusa: { items: ['statues', 'mirror', 'gorgon_scale'], chance: 0.5 },
  minotaur: { items: ['horn_shard', 'golden_ratio', 'horn', 'lever'], gold: [30, 40] },
  hydra: { items: ['fang', 'amphora', 'plumb_bob'], gold: [30, 40] },
  hydra_head: { items: [], gold: [2, 4], chance: 0 },
};

// extra drops for foes whose loot lives on their own definition (enemies.js), keyed by enemy id
export const EXTRA_LOOT = { harpy: ['icarus_feather', 'talaria'], centaur: ['lyre'], wolf: ['achilles'], spartoi: ['anvil'], cyclops: ['lead_boots', 'anvil'], chimera: ['pandora', 'amphora'], talos: ['talaria', 'nemesis'], hydra_elder: ['amphora'], minotaur_king: ['golden_ratio'] };

export const ITEM_POOLS = {
  elite: ['lever', 'pendulum', 'leyden', 'antikythera', 'horn', 'fang', 'prism', 'plumb_bob', 'thread', 'tyche', 'horseshoe', 'lyre', 'nemesis', 'anvil', 'amphora', 'pandora', 'golden_ratio', 'lead_boots', 'achilles'],
  event: ['golden_apple', 'wings', 'schrodinger', 'owl', 'pan_flute', 'mirror', 'sack', 'wineskin', 'lever', 'thread', 'tyche', 'horseshoe', 'talaria', 'icarus_feather'],
  guardian: ['golden_apple', 'thread', 'pendulum', 'leyden', 'antikythera', 'prism', 'statues', 'nemesis', 'pandora', 'golden_ratio'],
};
