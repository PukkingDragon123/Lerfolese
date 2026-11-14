// Enemies of the Mythical Wilderness. Each has an AI that picks an intent; the battle executes it.
// Intent: { kind:'attack'|'block'|'buff'|'debuff'|'special'|'none', dmg, hits, ... , icon, label }

const A = (dmg, hits = 1, extra = {}) => ({ kind: 'attack', dmg, hits, icon: 'sword', ...extra });

export const ENEMIES = {
  satyr: {
    name: 'Drunk Satyr', title: 'Philosopher of the Third Bottle', hp: [34, 38], model: 'satyr', scale: 1, unbalanced: true,
    weakness: 'Gravity knocks him flat (Prone). His spilled wine is very flammable.',
    barks: { start: ['*hic* You look like a... a coat rack. With opinions.', 'Is this the party? This is the party.', 'I am NOT drunk. I am fermented.'], hurt: ['Ow! My... everything.', 'Rude!'], die: ['Tell Dionysus... I paid...', '*hic*... goodnight.'], special: ['Wine for EVERYONE!', '*plays an aggressively jazzy scale*'] },
    ai(e, B, rng) {
      const t = e.turn;
      const r = rng.next();
      if (t === 0) return A(7, 1, { drunk: true, label: 'Wild Swing' });
      if (t % 4 === 1) return { kind: 'buff', id: 'flute', icon: 'note', label: 'Pan Flute Solo', str: 2 };
      if (t % 4 === 2 && !B.field.some((f) => f.type === 'wine')) return { kind: 'special', id: 'spill', icon: 'wine', label: 'Spill Wine', heal: 6 };
      if (r < 0.18) return { kind: 'none', id: 'hiccup', icon: 'question', label: '*hic*' };
      return A(8, 1, { drunk: true, label: 'Wild Swing' });
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
    weakness: 'Flies: Gravity and falling objects drag her down (Prone). Wind gusts blow her dive off course.',
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
    weakness: 'One eye: a Lens or bright flash Blinds him (half his blows miss). Boulders he throws can be caught as cover.',
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
  name: 'Fat Raccoon', title: 'Bandit of the Picnic Basket', hp: [22, 22], model: 'raccoon', scale: 1.75, tutorial: true,
  weakness: 'Greedy: he snatches your apples and eats them. Hit him hard and often.',
  barks: { start: ['*chitters, cheeks stuffed with your lunch*', '*hisses: mine, all mine*'], hurt: ['*squeak!*', '*indignant hiss*'], die: ['*waddles off into the hedge, defeated*'], special: ['*snatch!*', '*stuffs his cheeks*'] },
  ai(e, B, rng) {
    const t = e.turn % 3;
    if (t === 0) return A(3, 1, { label: 'Greedy Swipe' });
    if (t === 1 && !e.loot) return { kind: 'debuff', id: 'steal', icon: 'steal', label: 'Snatch the Apple!', dmg: 2 };
    return { kind: 'buff', id: 'munch', icon: 'up', label: 'Munch', heal: 4, str: 1 };
  },
};

// Guardians: empowered elites at the end of the Mythical Wilderness
ENEMIES.minotaur_king = { ...ENEMIES.minotaur, name: 'Minotaur Rex', title: 'King of the Labyrinth', hp: [176, 186], guardian: true, scale: 1.5 };
ENEMIES.hydra_elder = { ...ENEMIES.hydra, name: 'Elder Hydra', title: 'The Permanent Committee', hp: [128, 136], heads: 3, maxHeads: 6, guardian: true, scale: 1.55 };

export const ENCOUNTERS = {
  wilderness: {
    easy: [['satyr'], ['kobalos', 'kobalos'], ['medusa'], ['harpy'], ['wolf', 'wolf'], ['spartoi']],
    hard: [['satyr', 'kobalos'], ['medusa', 'kobalos'], ['satyr', 'satyr'], ['medusa', 'satyr'], ['kobalos', 'kobalos', 'kobalos'], ['centaur'], ['harpy', 'harpy'], ['spartoi', 'spartoi'], ['centaur', 'wolf'], ['wolf', 'wolf', 'harpy'], ['spartoi', 'harpy']],
    elite: [['minotaur'], ['hydra'], ['cyclops'], ['chimera']],
    guardian: [['minotaur_king'], ['hydra_elder'], ['talos'], ['frog_wizard'], ['bookworm_queen', 'bookworm', 'bookworm']],
    event: { sphinx: ['sphinx'], prometheus: ['eagle'] },
  },
};
