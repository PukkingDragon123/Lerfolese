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
  prism: { name: "Newton's Prism", icon: 'prism', text: 'Moves containing a Lens also splash ALL other foes for 50%.', flavor: 'I split light. Light had it coming.' },
  sack: { name: "Kobalos's Sack", icon: 'sack', text: '+25% gold. Stolen cards come back with interest (+10 gold).', flavor: 'Smells of pockets.' },
  thread: { name: "Ariadne's Thread", icon: 'thread', text: 'A seventh string: draw 1 extra card each turn.', flavor: 'For when the maze is metaphorical.' },
  wineskin: { name: 'Bottomless Wineskin', icon: 'wineskin', text: 'Heal 2 at the start of each turn. Your first Move each battle goes to a random foe.', flavor: 'Bottomless. Like your excuses.' },
  plumb_bob: { name: 'Plumb Bob', icon: 'plumb', text: 'Gravity gives +1 v for every Mass in the same Move.', flavor: 'The truest vertical. My namesake. Ish.' },
};

export const ITEM_POOLS = {
  elite: ['lever', 'pendulum', 'leyden', 'antikythera', 'horn', 'fang', 'prism', 'plumb_bob', 'thread'],
  event: ['golden_apple', 'wings', 'schrodinger', 'owl', 'pan_flute', 'mirror', 'sack', 'wineskin', 'lever', 'thread'],
  guardian: ['golden_apple', 'thread', 'pendulum', 'leyden', 'antikythera', 'prism'],
};
