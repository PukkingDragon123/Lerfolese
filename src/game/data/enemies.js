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
      if (t === 2) return A(9, 1, { label: 'Tail Lash' });
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
      if (t === 2) return A(8, 2, { label: 'Labrys Swing' });
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
};

// Guardians: empowered elites at the end of the Mythical Wilderness
ENEMIES.minotaur_king = { ...ENEMIES.minotaur, name: 'Minotaur Rex', title: 'King of the Labyrinth', hp: [176, 186], guardian: true, scale: 1.5 };
ENEMIES.hydra_elder = { ...ENEMIES.hydra, name: 'Elder Hydra', title: 'The Permanent Committee', hp: [128, 136], heads: 3, maxHeads: 6, guardian: true, scale: 1.55 };

export const ENCOUNTERS = {
  wilderness: {
    easy: [['satyr'], ['kobalos', 'kobalos'], ['medusa']],
    hard: [['satyr', 'kobalos'], ['medusa', 'kobalos'], ['satyr', 'satyr'], ['medusa', 'satyr'], ['kobalos', 'kobalos', 'kobalos']],
    elite: [['minotaur'], ['hydra']],
    guardian: [['minotaur_king'], ['hydra_elder']],
  },
};
