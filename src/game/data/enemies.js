// Enemies of the Mythical Wilderness. Each has an AI that picks an intent; the battle executes it.
// Intent: { kind:'attack'|'block'|'buff'|'debuff'|'special'|'none', dmg, hits, ... , icon, label }

const A = (dmg, hits = 1, extra = {}) => ({ kind: 'attack', dmg, hits, icon: 'sword', ...extra });

export const ENEMIES = {
  satyr: {
    name: 'Drunk Satyr', title: 'Philosopher of the Third Bottle', hp: [34, 38], model: 'satyr', scale: 1, unbalanced: true,
    weakness: 'Gravity alone knocks him flat (Stunned). His spilled wine is very flammable.',
    barks: { start: ['*hic* You look like a... a coat rack. With opinions.', 'Is this the party? This is the party.', 'I am NOT drunk. I am fermented.'], hurt: ['Ow! My... everything.', 'Rude!'], die: ['Tell Dionysus... I paid...', '*hic*... goodnight.'], special: ['Wine for EVERYONE!', '*plays an aggressively jazzy scale*'] },
    ai(e, B) {
      const t = e.turn;
      if (t === 0) return A(7, 1, { label: 'Wild Swing' });
      if (t % 4 === 1) return { kind: 'buff', id: 'flute', icon: 'note', label: 'Pan Flute Solo', str: 2 };
      if (t % 4 === 2 && !B.field.some((f) => f.type === 'wine')) return { kind: 'special', id: 'spill', icon: 'wine', label: 'Spill Wine', heal: 6 };
      if (t % 8 === 7) return { kind: 'none', id: 'hiccup', icon: 'question', label: '*hic*' }; // every eighth turn, like clockwork
      return A(8, 1, { label: 'Wild Swing' });
    },
  },
  medusa: {
    name: 'Medusa', title: 'Bored Gorgon, Very Online', hp: [42, 46], model: 'medusa', scale: 1.05,
    weakness: 'A Lens reflects her gaze: she petrifies herself. Stone is immune to stone.',
    barks: { start: ["Don't look at me. No, really. It's a whole thing.", 'Ugh. Another hero. Wooden, this time.', 'My snakes say you have no taste.'], hurt: ['My HAIR!', 'Hsssss!'], die: ['Finally... some peace and quiet...', 'At least I go out looking fabulous.'], special: ['Look into my eyes.', 'Say cheese. Or rather... granite.'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return A(3, 3, { venom: 1, label: 'Snake Bites', icon: 'sword' });
      if (t === 1) return { kind: 'debuff', id: 'gaze', icon: 'eye', label: 'Petrifying Gaze', petrify: 2, dmg: 5 };
      if (t === 2) return A(9, 1, { label: 'Tail Lash', status: { weak: 1 } });
      return { kind: 'block', id: 'hiss', icon: 'shield', label: 'Hiss', block: 8, str: 1 };
    },
  },
  kobalos: {
    name: 'Kobalos', title: 'Small, Sticky-Fingered, Proud', hp: [18, 22], model: 'kobalos', scale: 0.62,
    weakness: 'Nimble: dodges single hits. Waves, Gravity Wells and spinning ricochets catch it.',
    barks: { start: ['Nice apples. MINE now.', 'Hehehe! A walking firewood!', 'Pockets! Show me pockets!'], hurt: ['Eep!', 'Not the face!'], die: ['Worth it...', 'Tell my cousins I was... the tallest...'], special: ['Yoink!', 'Finders keepers!'] },
    ai(e, B, rng) {
      if (e.loot && e.lootTurns >= 2) return { kind: 'special', id: 'flee', icon: 'steal', label: 'Run For It!' };
      if (!e.loot && e.turn % 3 === 0) return { kind: 'debuff', id: 'steal', icon: 'steal', label: 'Pickpocket', dmg: 2 };
      if (e.turn % 3 === 1 && !e.st.evade) return { kind: 'buff', id: 'nimble', icon: 'up', label: 'Get Nimble', evade: 1 };
      return A(4, 2, { label: 'Poke Poke' });
    },
  },
  minotaur: {
    name: 'Minotaur', title: 'Lord of a Very Confusing House', hp: [128, 136], model: 'minotaur', scale: 1.35, elite: true, rage: true,
    weakness: 'His Charge is stopped by solid objects on the field (a Boulder, a tree). He crashes, is Stunned and takes the hit.',
    barks: { start: ['WHO. MOVED. MY. WALLS.', 'Half man. Half bull. Fully done with your nonsense.', 'I have been lost for 900 years. I am in a MOOD.'], hurt: ['GRAAH!', 'You will pay for that... in steaks.'], die: ['The exit... was on the left... all along...', 'Moooo... (sadly)'], special: ['*scrapes hoof*', 'GET. OUT. OF. MY. MAZE.'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return { kind: 'buff', id: 'snort', icon: 'up', label: 'Snort & Scrape', str: 2, telegraph: true };
      if (t === 1) return A(24, 1, { id: 'charge', label: 'CHARGE!', charge: true });
      if (t === 2) return A(8 + Math.floor(e.turn / 4) * 2, 2, { label: 'Labrys Swing' }); // swings harder every round
      return { kind: 'block', id: 'bellow', icon: 'shield', label: 'Bellow', block: 14, str: 1 };
    },
  },
  hydra: {
    name: 'Lernaean Hydra', title: 'Committee of Bad Ideas', hp: [90, 98], model: 'hydra', scale: 1.4, elite: true, heads: 3, maxHeads: 5, thickHide: true,
    weakness: 'Burnt necks do not regrow. Falling attacks bypass its thick hide.',
    barks: { start: ['LEFT: I will bite him. MIDDLE: No, I will. RIGHT: Can we discuss this?', 'We have voted. You are lunch.', 'Motion carries: eat the puppet.'], hurt: ['Point of order!', 'OBJECTION!'], die: ['The committee... is dissolved...', 'Meeting... adjourned...'], special: ['*hisses in harmony*', 'We have grown. Literally.'] },
    ai(e, B, rng) {
      const t = e.turn % 3;
      if (t === 1) return { kind: 'debuff', id: 'acid', icon: 'skull', label: 'Acid Spit', dmg: 6, corrode: 2 };
      if (t === 2 && B.enemies.filter((x) => x.alive && x.def.isHead).length < 2) return { kind: 'special', id: 'sprout', icon: 'up', label: 'Sprout Heads' };
      return { kind: 'block', id: 'coil', icon: 'shield', label: 'Coil Up', block: 8 };
    },
  },
  hydra_head: {
    name: 'Hydra Head', title: 'Minority Opinion', hp: [14, 16], model: 'hydra_head', scale: 1, isHead: true,
    barks: { start: [], hurt: ['Ow!', 'Rude!', 'Noted!'], die: ['I yield my time...'], special: [] },
    ai(e, B, rng) { return A(4 + Math.min(2, Math.floor(e.turn / 3)), 1, { label: 'Bite' }); },
  },
  harpy: {
    name: 'Harpy', title: 'Snatcher of Suppers', hp: [26, 30], model: 'harpy', scale: 1, loot: { items: ['wings', 'thread'], chance: 0.3 },
    weakness: 'Flies: Gravity and falling objects drag her down (Stunned). Wind gusts blow her dive off course.',
    barks: { start: ['SKREEE! Is that an apple? Give.', 'Zeus sends his regards. And his claws.', 'Ooh, a wooden snack.'], hurt: ['My feathers!', 'SKRAA!'], die: ['Tell the storm... I flew...', '*sad screech*'], special: ['Mine! Mine! MINE!', '*shrieks in your ear*'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return A(7, 1, { label: 'Talon Dive' });
      if (t === 1) return { kind: 'debuff', id: 'steal', icon: 'steal', label: 'Snatch!', dmg: 3 };
      if (t === 2) return A(3, 3, { label: 'Raking Talons' });
      return { kind: 'buff', id: 'nimble', icon: 'up', label: 'Take Wing', evade: 1 };
    },
  },
  centaur: {
    name: 'Centaur Archer', title: 'Four Legs, Zero Chill', hp: [38, 42], model: 'centaur', scale: 1, loot: { items: ['pendulum', 'thread'], chance: 0.35 },
    weakness: 'Deadly at range: a Boulder or tree on the field blocks his volleys (cover soaks arrows).',
    barks: { start: ['Hold still. I only need one arrow. Probably.', 'Chiron taught me patience. I skipped that lesson.', 'Nice strings. Shame about the rest.'], hurt: ['A scratch!', 'You will regret that, kindling.'], die: ['My aim... was true...', 'Tell Chiron... I tried...'], special: ['*draws a fistful of arrows*', 'Nock. Draw. Loose.'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return A(4, 3, { label: 'Arrow Volley', status: { frail: 1 } }); // pinned: Block -25%
      if (t === 1) return { kind: 'buff', id: 'snort', icon: 'up', label: 'Steady Aim', str: 2 };
      if (t === 2) return A(11, 1, { label: 'Aimed Shot' });
      return { kind: 'block', id: 'rear', icon: 'shield', label: 'Rear & Guard', block: 9 };
    },
  },
  wolf: {
    name: 'Hound of Artemis', title: 'Very Good Boy (Not To You)', hp: [22, 26], model: 'wolf', scale: 1.1, loot: { items: ['fang'], chance: 0.2 },
    weakness: 'Hunts in packs: strength grows with each Howl. Puddles and Water make it shake off (Wet).',
    barks: { start: ['*low growl*', 'Grrrr... (the moon says hello)', '*sniffs* ...pine. And philosophy.'], hurt: ['*yelp*', 'Grrk!'], die: ['*whimpers*', '*one last howl*'], special: ['AWOOOOO!', '*bares fangs*'] },
    ai(e, B, rng) {
      const t = e.turn % 3;
      if (t === 0) return A(5, 2, { label: 'Savage Bite' });
      if (t === 1) return { kind: 'buff', id: 'snort', icon: 'up', label: 'Moon Howl', str: 1 };
      return A(9, 1, { label: 'Pounce', status: { vulnerable: 1 } });
    },
  },
  spartoi: {
    name: 'Spartoi', title: 'Sown From Dragon Teeth', hp: [30, 34], model: 'spartoi', scale: 1, loot: { items: ['plumb_bob', 'thread'], chance: 0.3 },
    weakness: 'Shield wall soaks blows from the front. Heavy falling objects and Gravity crush it (Prone).',
    barks: { start: ['*clatter* FOR... THEBES... *clatter*', 'We were planted. We grew. We fight.', '*jaw creaks in a rictus grin*'], hurt: ['*rattle*', 'Bone... chipped...'], die: ['*collapses into a heap*', 'Back... to the soil...'], special: ['PHALANX!', '*bangs spear on shield*'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return { kind: 'block', id: 'wall', icon: 'shield', label: 'Shield Wall', block: 10 };
      if (t === 1) return A(9, 1, { label: 'Spear Thrust', status: { vulnerable: 1 } });
      if (t === 2) return A(5, 2, { label: 'Phalanx Jabs' });
      return { kind: 'buff', id: 'snort', icon: 'up', label: 'War Clatter', str: 1 };
    },
  },
  cyclops: {
    name: 'Cyclops', title: 'Shepherd of Very Large Sheep', hp: [124, 132], model: 'cyclops', scale: 1.3, elite: true, loot: { items: ['lever', 'prism'], gold: [30, 40] },
    weakness: 'One eye: a Lens or bright flash Blinds him (his blows deal half). Boulders he throws can be caught as cover.',
    barks: { start: ['WHO IS THERE? ...NOBODY? I KNEW IT.', 'Little wooden man. You look crunchy.', 'I count my sheep. You are not a sheep.'], hurt: ['MY EYE! ...no, wait, that was my toe.', 'GRAAARGH!'], die: ['Nobody... did this...', 'Tell... Polyphemus... I tried...'], special: ['*hefts a boulder*', 'SMASH TIME.'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return { kind: 'buff', id: 'snort', icon: 'up', label: 'Bellowing Rage', str: 3, telegraph: true };
      if (t === 1) return A(20 + Math.floor(e.turn / 4) * 4, 1, { label: 'Club Smash' }); // each round the club comes down harder
      if (t === 2) return e.hp < e.maxHp / 2 ? A(9, 2, { label: 'Frenzied Boulders', icon: 'skull', status: { frail: 1 } }) : A(14, 1, { label: 'Hurl Boulder', icon: 'skull', status: { frail: 1 } });
      return { kind: 'block', id: 'brace', icon: 'shield', label: 'Lumber & Brace', block: 12 };
    },
  },
  chimera: {
    name: 'Chimera', title: 'Lion, Goat, Snake, Problem', hp: [112, 120], model: 'chimera', scale: 1.5, elite: true, ramp: 1, loot: { items: ['fang', 'leyden'], gold: [30, 40] },
    weakness: 'Three heads, one stomach: Water (puddles, rain) douses its Fire Breath. Its serpent tail is venomous.',
    barks: { start: ['LION: Roar. GOAT: Meh. SNAKE: Hssss.', 'We are three opinions and one appetite.', 'Smells like kindling. Excellent.'], hurt: ['ROAR! / MEEH! / HSS!', 'Which of us did you hit?!'], die: ['We... disagree... on dying...', '*three sad noises*'], special: ['*inhales a furnace*', 'All three: ATTACK!'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return { kind: 'debuff', id: 'acid', icon: 'ember', label: 'Fire Breath', dmg: 9, corrode: 2 };
      if (t === 1) return A(5, 3, { label: 'Three-Headed Maul' });
      if (t === 2) return A(8, 1, { label: 'Serpent Strike', venom: 3 });
      return { kind: 'block', id: 'bristle', icon: 'shield', label: 'Bristle', block: 11, str: 1 };
    },
  },
  talos: {
    name: 'Talos', title: 'Bronze Guardian of Crete', hp: [196, 206], model: 'talos', scale: 1.45, guardian: true, ramp: 1, loot: { items: ['antikythera', 'leyden'], gold: [40, 50] },
    weakness: 'One vein of ichor runs to the nail in his ankle: falling objects and Gravity crack his plating (Vulnerable).',
    barks: { start: ['INTRUDER. CIRCUIT OF CRETE: THREE TIMES DAILY. YOU ARE IN THE WAY.', 'HEPHAESTUS BUILT ME. WHO CARVED YOU?', 'HEATING... PLATES...'], hurt: ['*CLANG*', 'DENT DETECTED.'], die: ['ICHOR... DRAINING...', 'THE NAIL... DO NOT... TOUCH THE NAIL...'], special: ['*bronze glows white-hot*', 'EMBRACE OF FIRE.'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return A(26 + Math.floor(e.turn / 4) * 5, 1, { label: 'Bronze Fist' });
      if (t === 1) return { kind: 'block', id: 'heat', icon: 'shield', label: 'Heat the Bronze', block: 16, str: 2 };
      if (t === 2) return { kind: 'debuff', id: 'acid', icon: 'ember', label: 'Ichor Spray', dmg: 7, corrode: 2 };
      return A(9, 2, { label: 'Hurl Stones' });
    },
  },
};

// ---------------------------------------------------------------- bosses of the star library (guardian tier) and event bosses
Object.assign(ENEMIES, {
  frog_wizard: {
    name: 'Archimage Croakley', title: 'Toad-Wizard, Examiner of Laws', hp: [176, 186], model: 'frog_wizard', scale: 1.6, guardian: true, boss: true, ramp: 1,
    weakness: 'Cold-blooded: Heat dries his hide (×1.5). Water only refreshes him. His crystal ward cracks under falling weight.',
    resist: [{ tag: 'hot', mul: 1.5, text: 'Heat dries his hide ×1.5' }, { tag: 'wet', mul: 0.5, text: 'Water refreshes him ×0.5' }, { tag: 'fall', mul: 1.25, text: 'Falling weight cracks the ward ×1.25' }],
    barks: { start: ['Ribbit. So. The little apple-thrower wishes to be EXAMINED.', 'I have unlocked a thousand laws, boy. Show me one I have not.', 'Croak. Let us begin the viva.'], hurt: ['Croak!', 'A fair point. Painfully made.'], die: ['Ribbit... you... pass...', 'Write it... in the... ledger...'], special: ['*the crystal hums*', 'Abracadabra, as the Babylonians mispronounced it.'] },
    ai(e, B, rng) {
      const t = e.turn % 5;
      if (t === 0) return { kind: 'debuff', id: 'steal', icon: 'steal', label: 'Tongue Lash', dmg: 7, hits: 2 };
      if (t === 1) return { kind: 'debuff', id: 'hex', icon: 'skull', label: 'Hex of Warts', dmg: 6, status: { hex: 2, weak: 1 } };
      if (t === 2) return { kind: 'block', id: 'ward', icon: 'shield', label: 'Crystal Ward', block: 22, str: 2 };
      if (t === 3) return A(30 + Math.floor(e.turn / 5) * 6, 1, { label: 'Thunder Hop', icon: 'skull' });
      return A(4, 5, { label: 'Firefly Swarm', status: { frail: 1 } });
    },
  },
  bookworm_queen: {
    name: 'Bookworm Queen', title: 'Devourer of the Principia', hp: [132, 140], model: 'bookworm_queen', scale: 1, guardian: true, boss: true, brood: 3,
    weakness: 'Paper and pulp: Heat burns her ×1.5. Her brood is soft: waves and spinning ricochets clear it.',
    resist: [{ tag: 'hot', mul: 1.5, text: 'Paper burns ×1.5' }, { tag: 'rock', mul: 0.75, text: 'Soft coils soak stone ×0.75' }],
    barks: { start: ['*the great worm rears, pages sliding off her coils*', 'Sssso many books. Ssso little time. Ssstart with yours.', 'My children are hungry, scholar.'], hurt: ['SSKREE!', '*pages flutter out of the wound*'], die: ['*the queen coils, and is still*', 'The... last... chapter...'], special: ['*the brood squirms*', 'Feed. FEED.'] },
    ai(e, B, rng) {
      const t = e.turn % 4; const brood = B.enemies.filter((x) => x.alive && x.def.minion).length;
      if (t === 0) return { kind: 'debuff', id: 'devour', icon: 'skull', label: 'Devour Pages', dmg: 8, devour: 2 };
      if (t === 1 && brood < 3) return { kind: 'special', id: 'brood', icon: 'up', label: 'Lay a Brood', spawn: 'bookworm', n: Math.min(2, 3 - brood), block: 10 };
      if (t === 2) return A(9 + Math.floor(e.turn / 4) * 2, 2, { label: 'Coil Crush', status: { frail: 1 } });
      return A(18 + Math.floor(e.turn / 4) * 3, 1, { label: 'Spine Lash', icon: 'skull' });
    },
  },
  bookworm: {
    name: 'Bookworm', title: 'Hungry Larva', hp: [13, 16], model: 'bookworm', scale: 1, minion: true,
    barks: { start: [], hurt: ['*squirm*', '*squelch*'], die: ['*goes limp*'], special: ['*nibble nibble*'] },
    ai(e, B, rng) { return e.turn % 2 ? { kind: 'debuff', id: 'nibble', icon: 'steal', label: 'Nibble', dmg: 3, status: { nibble: 1 } } : A(5, 1, { label: 'Bite' }); },
  },
  sphinx: {
    name: 'The Sphinx', title: 'Examiner of Travellers', hp: [128, 136], model: 'sphinx', scale: 1.45, elite: true, boss: true,
    weakness: 'Proud: a Lens dazzles her (×1.5). Her riddles curse the slow-witted: kill her before the last question.',
    resist: [{ tag: 'lens', mul: 1.5, text: 'Dazzled by a Lens ×1.5' }, { tag: 'sound', mul: 0.5, text: 'She out-roars Sound ×0.5' }],
    barks: { start: ['You chose to fight the examiner. Bold. Wrong, but bold.', 'Every wrong answer has teeth.', 'Pencils DOWN.'], hurt: ['Rrrrh!', 'That was not on the syllabus.'], die: ['You... pass...', 'The riddle... answers itself...'], special: ['What walks on four legs at dawn...', '*she licks her pencil*'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return { kind: 'debuff', id: 'riddle', icon: 'eye', label: 'Riddle of Ages', dmg: 6, status: { weak: 2, vulnerable: 1 } };
      if (t === 1) return A(18 + Math.floor(e.turn / 4) * 4, 1, { label: 'Pounce' });
      if (t === 2) return A(5, 3, { label: 'Claw Flurry' });
      return { kind: 'block', id: 'wings', icon: 'shield', label: 'Fold the Wings', block: 16, str: 2 };
    },
  },
  eagle: {
    name: 'Eagle of Zeus', title: 'Liver Connoisseur', hp: [104, 112], model: 'eagle', scale: 1.6, elite: true, boss: true, flying: true,
    weakness: 'Flies high: Gravity and falling strikes drag it down (×2). Sound scatters it.',
    resist: [{ tag: 'fall', mul: 2, text: 'Dragged out of the sky ×2' }, { tag: 'sound', mul: 1.5, text: 'Sound scatters it ×1.5' }],
    barks: { start: ['SKRAAAW! (Zeus says: no refunds on fire.)', '*it eyes your liver professionally*', 'The titan stays chained. You stay lunch.'], hurt: ['SKREE!', '*feathers everywhere*'], die: ['*a last thunderclap of wings*', '*it falls like a stone*'], special: ['*thunder rolls behind it*', '*it rides the storm wind*'] },
    ai(e, B, rng) {
      const t = e.turn % 4;
      if (t === 0) return A(3, 3, { label: 'Liver Peck', venom: 1 });
      if (t === 1) return { kind: 'buff', id: 'nimble', icon: 'up', label: 'Ride the Storm', evade: 1, str: 2 };
      if (t === 2) return A(15 + Math.floor(e.turn / 4) * 3, 1, { label: 'Thunder Dive', icon: 'skull' });
      return { kind: 'debuff', id: 'bolt', icon: 'ember', label: 'Bolt of Zeus', dmg: 8, status: { frail: 1, vulnerable: 1 } };
    },
  },
});

// The prologue's tutorial foe (story agent): never in the random pools; src/story/tutorial.js stages him in the old garden
ENEMIES.raccoon = {
  name: 'Fat Raccoon', title: 'Bandit of the Picnic Basket', hp: [40, 40], model: 'raccoon', scale: 1.75, tutorial: true,
  weakness: 'Greedy and slow: he telegraphs every swipe. Throw the apple, brace for his swipe, repeat.',
  barks: { start: ['*chitters, cheeks stuffed with your lunch*', '*hisses: mine, all mine*', '*burps, proudly*'], hurt: ['*squeak!*', '*indignant hiss*', '*drops a sandwich*'], die: ['*waddles off into the hedge, defeated*', '*rolls away like a furry barrel*'], special: ['*snatch!*', '*stuffs his cheeks*', '*pats his belly*'] },
  ai(e) { // a slow, readable rhythm: stuff his cheeks (harmless, while you learn), belly-flop (block it!), swipe
    const t = e.turn % 3;
    if (t === 0) return { kind: 'buff', id: 'munch', icon: 'up', label: 'Stuff Cheeks', heal: 2, custom: true };
    if (t === 1) return A(3, 1, { label: 'Belly Flop', icon: 'skull' });
    return A(2, 1, { label: 'Greedy Swipe' });
  },
  async act(B, e, it) { const h = Math.min(it.heal || 0, e.maxHp - e.hp); if (h > 0) { e.hp += h; await B.fx.heal?.(e, h); } await B.fx.munch?.(e); },
};

// Guardians: empowered elites at the end of the Mythical Wilderness
ENEMIES.minotaur_king = { ...ENEMIES.minotaur, name: 'Minotaur Rex', title: 'King of the Labyrinth', hp: [176, 186], guardian: true, scale: 1.5 };
ENEMIES.hydra_elder = { ...ENEMIES.hydra, name: 'Elder Hydra', title: 'The Permanent Committee', hp: [128, 136], heads: 3, maxHeads: 6, guardian: true, scale: 1.55 };

// ---------------------------------------------------------------- THE EXPERIMENTAL BESTIARY: one clear physical rule each
// Every foe below is a little experiment: its weakness names the variable to change (spin, mass, light, heat, cold,
// friction, polarity, pressure, Block), and its plate, its forecast echo and its tooltip say the exact number.
const rot = (e, n) => e.turn % n;
Object.assign(ENEMIES, {
  karkinos: {
    name: 'Karkinos', title: 'Crab of Lerna, Hera\'s Grudge', hp: [32, 34], model: 'karkinos', scale: 1.6,
    weakness: 'A domed shell blocks a lot. SPIN flips it: a Move with 2+ hits turns it on its back (Stunned 1).',
    resist: [{ tag: 'spinning', mul: 1.5, text: 'Spin catches the shell rim ×1.5' }, { tag: 'rock', mul: 0.75, text: 'Stone skids off the shell ×0.75' }],
    barks: { start: ['*clack clack*', '*scuttles sideways, claws high*', '*bubbles menacingly*'], hurt: ['*CRACK*', '*hiss of froth*'], die: ['*legs curl up*', '*one last clack*'], special: ['*the shell slams shut*', '*clack!*'] },
    ai(e) { const t = rot(e, 3); if (t === 0) return A(5, 2, { label: 'Pincer Clamp' }); if (t === 1) return { kind: 'block', id: 'shell', icon: 'shield', label: 'Shell Up', block: 16 }; return A(9, 1, { label: 'Crushing Claw', status: { weak: 1 } }); },
    async struck(B, e, mv, hits) { if (hits >= 2 && !e.st.stun && B.turn >= (e.flipAt || 0)) { e.flipAt = B.turn + 2; B.addSt(e, 'stun', 1); e.block = 0; await B.fx.bark?.(e, '*flipped onto its back, legs waving*'); B.learn(e, 'flip'); } },
  },
  boar: {
    name: 'Erymanthian Boar', title: 'Two Hundred Kilos of Opinion', hp: [40, 44], model: 'boar', scale: 1.1,
    weakness: 'Bristled hide: light objects (under 4 kg) bounce off ×0.5, heavy ones (4 kg+) bowl it over ×1.5. Bring MASS. Its charge crashes into a Boulder.',
    barks: { start: ['*SNORT*', '*paws the ground, steaming*', '*grunts like a landslide*'], hurt: ['*SQUEAL*', '*furious grunt*'], die: ['*keels over like a felled oak*', '*a last steamy snort*'], special: ['*lowers its tusks*', '*the ground trembles*'] },
    lines(e, mv) { const m = mv.attack.m || 0; if (!(mv.attack.perHit > 0)) return []; return m >= 4 ? [{ text: `Heavy enough (${m} kg): bowled over ×1.5`, mul: 1.5, kind: 'foe' }] : [{ text: `Too light (${m} kg < 4): bounces off ×0.5`, mul: 0.5, kind: 'anti' }]; },
    ai(e) { const t = rot(e, 3); if (t === 0) return { kind: 'buff', id: 'snort', icon: 'up', label: 'Root & Snort', str: 2 }; if (t === 1) return A(16, 1, { id: 'charge', label: 'TUSK CHARGE!', charge: true }); return A(5, 2, { label: 'Gore' }); },
  },
  stymphalian: {
    name: 'Stymphalian Bird', title: 'Bronze-Feathered Menace', hp: [24, 26], model: 'stymphalian', scale: 1, flying: true,
    weakness: 'Mirror-bronze feathers: a focused beam (Lens, Spark) glances off ×0.5, but a PRISM scatters through them ×2. Falling strikes drag it down.',
    resist: [{ tag: 'fall', mul: 1.5, text: 'Dragged out of the sky ×1.5' }],
    lines(e, mv) { const t = mv.tags; if (!t) return []; if (t.has('prismatic')) return [{ text: 'A Prism scatters light through the feathers ×2', mul: 2, kind: 'foe' }]; if (t.has('light')) return [{ text: 'Bronze feathers reflect focused light ×0.5', mul: 0.5, kind: 'anti' }]; return []; },
    barks: { start: ['*KREEE* (a sound like a cymbal)', '*bronze feathers rattle*', '*it sharpens its beak on its own wing*'], hurt: ['*CLANG*', '*a feather clatters off*'], die: ['*drops like a dropped tray*', '*a last metallic screech*'], special: ['*the feathers bristle*', '*KREE!*'] },
    ai(e) { const t = rot(e, 3); if (t === 0) return A(3, 3, { label: 'Feather Volley' }); if (t === 1) return A(9, 1, { label: 'Bronze Dive' }); return { kind: 'buff', id: 'nimble', icon: 'up', label: 'Take Wing', evade: 1 }; },
  },
  salamander: {
    name: 'Fire Salamander', title: 'Lives in the Forge, Rent-Free', hp: [32, 34], model: 'salamander', scale: 1.9,
    weakness: 'FEEDS ON HEAT: immune to Heat, and each Bask it gains Strength = your apple\'s Heat ÷ 3. Keep the apple cool, douse it with Water (×2).',
    resist: [{ tag: 'hot', mul: 0, text: 'Made of fire: immune to Heat' }, { tag: 'wet', mul: 2, text: 'Water douses its glow ×2' }],
    barks: { start: ['*crackles like kindling*', '*licks the air, tasting your apple*', '*glows a little brighter*'], hurt: ['*hisssss*', '*sparks fly*'], die: ['*fades to cold ash*', '*a last ember winks out*'], special: ['*it drinks the warmth*', '*basks*'] },
    ai(e) { const t = rot(e, 3); if (t === 0) return { kind: 'buff', id: 'bask', icon: 'ember', label: 'Bask in the Heat', custom: true }; if (t === 1) return A(9, 1, { label: 'Flame Lick', status: { burn: 2 } }); return A(5, 2, { label: 'Tail Whip' }); },
    async act(B, e, it) { const str = Math.max(1, Math.floor((B.heatOn() ? B.heat : 0) / 3)); B.addSt(e, 'strength', str); await B.fx.enemyBuff?.(e, str); B.learn(e, 'bask'); },
  },
  ice_nymph: {
    name: 'Chione\'s Daughter', title: 'Ice Nymph of the High Passes', hp: [28, 30], model: 'ice_nymph', scale: 1,
    weakness: 'She COOLS your apple (Frost Breath: −4 Heat) and melts under it: Heat ×2. Water only feeds her ice ×0.5.',
    resist: [{ tag: 'hot', mul: 2, text: 'Heat melts her ×2' }, { tag: 'wet', mul: 0.5, text: 'Water freezes onto her ×0.5' }],
    barks: { start: ['Your apple is so... warm. Let me fix that.', '*frost creeps across the grass*', 'Shh. Winter is listening.'], hurt: ['*a crack of ice*', 'Ah! Too warm!'], die: ['*she melts into a cold mist*', 'Spring... again...'], special: ['*exhales a white wind*', 'Be still.'] },
    ai(e) { const t = rot(e, 3); if (t === 0) return { kind: 'debuff', id: 'frost', icon: 'eye', label: 'Frost Breath', dmg: 5, cool: 4, custom: true }; if (t === 1) return A(11, 1, { label: 'Ice Lance' }); return { kind: 'block', id: 'mirror', icon: 'shield', label: 'Ice Mirror', block: 12 }; },
    async act(B, e, it) { await B.blow(e, B.attackValue(e, it.dmg), 0, it); if (!B.over && B.heatOn() && B.heat > 0) await B.addHeat(-(it.cool || 4), 'frost'); },
  },
  siren: {
    name: 'Siren of Anthemoessa', title: 'Sings in Atmospheres', hp: [36, 38], model: 'siren', scale: 1,
    weakness: 'Her song builds PRESSURE 1 → 2 → 3, then the note SHATTERS (big hit). A wave of SOUND or a PRESSURE card cancels it back to 0.',
    resist: [{ tag: 'wave', mul: 1.5, text: 'Sound breaks her song ×1.5' }],
    barks: { start: ['Laaa... come closer, little scholar...', '*a note so pure the grass bows*', 'Sailors loved this part.'], hurt: ['*the note cracks*', 'Off-key!'], die: ['*the last note hangs, then breaks*', 'Encore... never...'], special: ['*the air thickens*', 'Higher. HIGHER.'] },
    ai(e) { const p = e.st.pressure || 0; if (p >= 3) return A(14, 1, { id: 'shatter', label: 'SHATTERING NOTE', icon: 'skull', custom: true }); return { kind: 'debuff', id: 'crescendo', icon: 'note', label: `Crescendo ${p + 1}/3`, dmg: 5, custom: true }; },
    async act(B, e, it) { if (it.dmg) await B.blow(e, B.attackValue(e, it.dmg), 0, it); if (!e.alive) return; if (it.id === 'shatter') delete e.st.pressure; else B.addSt(e, 'pressure', 1); },
    async struck(B, e, mv) { if (e.st.pressure && (mv.tags?.has('wave') || mv.tags?.has('pressure'))) { delete e.st.pressure; await B.fx.bark?.(e, '*the song collapses: pressure 0*'); B.learn(e, 'cancel'); B.pickIntent(e); } },
  },
  teumessian_fox: {
    name: 'Teumessian Fox', title: 'Destined Never To Be Caught', hp: [20, 22], model: 'teumessian_fox', scale: 1,
    weakness: 'UNCATCHABLE: it slips every thrown single strike. Only a FALL (Gravity), a wave that hits ALL, Burn or a Gravity Well can reach it.',
    barks: { start: ['*yips and vanishes, then reappears*', '*a grin with too many teeth*', '*it is already behind you*'], hurt: ['*YELP*', '*a surprised bark*'], die: ['*fate finally catches up*', '*it curls up like a sleeping cat*'], special: ['*it laughs, a fox laugh*', '*blink*'] },
    uncatchable: true,
    lines(e, mv, B) { const a = mv.attack; if (a.fall || a.spread || B?.field?.some((f) => f.type === 'well')) return []; return a.perHit > 0 ? [{ text: 'Uncatchable: it slips a thrown strike (fall, wave or well!)', mul: 0, kind: 'anti' }] : []; },
    ai(e) { const t = rot(e, 3); if (t === 0) return A(4, 2, { label: 'Nip & Dash' }); if (t === 1) return A(7, 1, { label: 'Trickster Bite', status: { vulnerable: 1 } }); return A(3, 3, { label: 'Run Rings' }); },
  },
  empusa: {
    name: 'Empusa', title: 'Bronze-Legged Night Hunger', hp: [32, 34], model: 'empusa', scale: 1, drain: true,
    weakness: 'LIFEDRINKER: she heals every point that gets past your Block. Block it all and she starves. Light (Lens) dazzles her ×1.5.',
    resist: [{ tag: 'light', mul: 1.5, text: 'Light makes her shrink ×1.5' }],
    barks: { start: ['What a healthy young man. Lovely colour.', '*her bronze leg rings on the stones*', 'I only want a little sip.'], hurt: ['*shrieks like a kettle*', 'Rude!'], die: ['*she flees into the dark, shrieking*', 'Not... the light...'], special: ['*clang, clang, clang*', 'Hold STILL.'] },
    ai(e) { const t = rot(e, 3); if (t === 0) return A(5, 2, { label: 'Draining Kiss' }); if (t === 1) return A(10, 1, { label: 'Bronze Kick' }); return { kind: 'buff', id: 'snort', icon: 'up', label: 'Thirst', str: 2 }; },
  },
  automaton: {
    name: 'Pendulum Sentinel', title: 'Clockwork of Hephaestus', hp: [104, 110], model: 'automaton', scale: 1.25, elite: true,
    weakness: 'Its pendulum blade swings on a fixed beat (6 → 12 → 18 → wind). FRICTION damps it: a Weak sentinel skips its next swing entirely.',
    resist: [{ tag: 'heavy', mul: 1.25, text: 'Mass jams the gears ×1.25' }, { tag: 'electric', mul: 1.5, text: 'Bronze conducts ×1.5' }],
    stall: '*the pendulum grinds to a halt*',
    barks: { start: ['TICK. TOCK. TICK. TOCK.', '*gears whirr, the blade begins to swing*', 'INTRUDER. SCHEDULED FOR REMOVAL.'], hurt: ['*CLUNK*', '*a spring pings loose*'], die: ['*the pendulum swings... slower... stops*', 'TICK... ...'], special: ['*the blade swings wider*', 'TOCK.'] },
    ai(e) { const t = rot(e, 4); if (t === 3) return { kind: 'block', id: 'wind', icon: 'shield', label: 'Wind the Spring', block: 16, str: 2 }; const amp = t + 1; return A(6 * amp, 1, { label: `Pendulum Swing ${amp}/3` }); },
  },
  magnet_golem: {
    name: 'Lodestone Golem', title: 'Magnes, the Pulling Hill', hp: [128, 134], model: 'magnet_golem', scale: 1.3, elite: true,
    weakness: 'POLARITY flips every turn. On S (attract) Stone and Mass slam in ×2. On N (repel) they are pushed away ×0.5. Spark short-circuits it ×1.5 either way.',
    resist: [{ tag: 'electric', mul: 1.5, text: 'Spark short-circuits its field ×1.5' }],
    lines(e, mv) { const S = e.turn % 2 === 1; const heavy = mv.tags?.has('rock') || mv.tags?.has('heavy'); if (!heavy) return []; return S ? [{ text: 'Polarity S: it ATTRACTS stone and mass ×2', mul: 2, kind: 'foe' }] : [{ text: 'Polarity N: it REPELS stone and mass ×0.5', mul: 0.5, kind: 'anti' }]; },
    barks: { start: ['*iron filings stand up on the ground*', 'PULL. PUSH. PULL.', '*the buckles on your coat tug toward it*'], hurt: ['*grinding rock*', '*sparks crackle across it*'], die: ['*it falls apart into a heap of lodestones*', '*the filings lie down*'], special: ['*polarity flips*', '*hum*'] },
    ai(e) { return e.turn % 2 === 0 ? A(10, 2, { label: 'Lodestone Fists (N)' }) : { kind: 'block', id: 'attract', icon: 'shield', label: 'Draw Iron (S)', block: 18, str: 1 }; },
  },
  bronze_bull: {
    name: 'Khalkotauros', title: 'Fire-Breathing Bull of Colchis', hp: [102, 108], model: 'bronze_bull', scale: 1.2, elite: true,
    weakness: 'A bronze furnace: immune to Heat. WATER quenches it: Weak 2 and −2 Strength. Its charge crashes into a Boulder (Stunned, takes 15).',
    resist: [{ tag: 'hot', mul: 0, text: 'A bronze furnace: immune to Heat' }, { tag: 'wet', mul: 1.5, text: 'Water hisses on hot bronze ×1.5' }, { tag: 'electric', mul: 1.5, text: 'Bronze conducts ×1.5' }],
    barks: { start: ['*a furnace roar from its throat*', '*bronze hooves ring like bells*', '*smoke curls from its nostrils*'], hurt: ['*CLANG*', '*a gout of steam*'], die: ['*the furnace dies with a hiss*', '*it topples like a statue*'], special: ['*it stokes itself*', '*the bronze glows*'] },
    ai(e) { const t = rot(e, 4); if (t === 0) return { kind: 'buff', id: 'snort', icon: 'up', label: 'Stoke the Furnace', str: 3 }; if (t === 1) return { kind: 'debuff', id: 'breath', icon: 'ember', label: 'Fire Breath', dmg: 8, status: { burn: 3 } }; if (t === 2) return A(20, 1, { id: 'charge', label: 'BRONZE CHARGE!', charge: true }); return { kind: 'block', id: 'plates', icon: 'shield', label: 'Heat the Plates', block: 14 }; },
    async struck(B, e, mv) { if (mv.tags?.has('wet') && !e.quenched) { e.quenched = true; B.addSt(e, 'weak', 2); B.addSt(e, 'strength', -2); await B.fx.bark?.(e, '*HSSSS: the furnace gutters*'); B.learn(e, 'quench'); } },
  },
  ladon: {
    name: 'Ladon', title: 'Serpent of the Hesperides', hp: [196, 204], model: 'ladon', scale: 1.4, guardian: true, boss: true, keepBlock: true,
    weakness: 'Its coils KEEP their Block between turns. Break the coils: hard Stone cracks Block ×2, Dark Matter ignores it, Heat makes it shed ×1.25.',
    resist: [{ tag: 'hot', mul: 1.25, text: 'Heat makes it shed its scales ×1.25' }, { tag: 'fall', mul: 1.25, text: 'Falling weight pins a coil ×1.25' }],
    barks: { start: ['*a hundred voices hiss in chorus*', 'THE GOLDEN APPLES ARE NOT FOR YOU, SCHOLAR.', '*coils slide over coils, endlessly*'], hurt: ['*the chorus shrieks*', 'HSSSS!'], die: ['*the coils loosen... and lie still*', 'THE GARDEN... UNGUARDED...'], special: ['*it tightens around the tree*', '*a hundred tongues taste the air*'] },
    ai(e) { const t = rot(e, 4); const k = Math.floor(e.turn / 4); if (t === 0) return { kind: 'block', id: 'coil', icon: 'shield', label: 'Tighten the Coils', block: 18, str: 2 }; if (t === 1) return { kind: 'debuff', id: 'hiss', icon: 'eye', label: 'Hundred-Voiced Hiss', dmg: 6, status: { weak: 2, vulnerable: 1 } }; if (t === 2) return A(8, 2, { label: 'Venom Fangs', venom: 2 }); return A(24 + k * 4, 1, { label: 'CONSTRICT', icon: 'skull' }); },
  },
});
// map figurine / battle scale hints for the new bestiary live in models (FIG_SCALE, beasts/index.js)

export const ENCOUNTERS = {
  wilderness: {
    easy: [['satyr'], ['kobalos', 'kobalos'], ['medusa'], ['harpy'], ['wolf', 'wolf'], ['spartoi'], ['karkinos'], ['salamander'], ['teumessian_fox'], ['ice_nymph'], ['stymphalian']],
    hard: [['satyr', 'kobalos'], ['medusa', 'kobalos'], ['satyr', 'satyr'], ['medusa', 'satyr'], ['kobalos', 'kobalos', 'kobalos'], ['centaur'], ['harpy', 'harpy'], ['spartoi', 'spartoi'], ['centaur', 'wolf'], ['wolf', 'wolf', 'harpy'], ['spartoi', 'harpy'],
      ['boar'], ['siren'], ['empusa'], ['karkinos', 'karkinos'], ['salamander', 'ice_nymph'], ['siren', 'stymphalian'], ['boar', 'satyr'], ['empusa', 'kobalos']],
    elite: [['minotaur'], ['hydra'], ['cyclops'], ['chimera'], ['automaton'], ['magnet_golem'], ['bronze_bull']],
    guardian: [['minotaur_king'], ['hydra_elder'], ['talos'], ['frog_wizard'], ['bookworm_queen', 'bookworm', 'bookworm'], ['ladon']],
    event: { sphinx: ['sphinx'], prometheus: ['eagle'] },
  },
};
