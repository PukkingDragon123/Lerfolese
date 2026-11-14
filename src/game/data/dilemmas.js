// Combat story dilemmas: about once per fight (at the start of turn 2) a foe makes Newton an offer, a bargain or a
// riddle out of its own myth. Every option is a trade-off with its numbers printed on the plaque. Pure data: the
// battle (Battle.dilemma) picks one and applies the chosen effects; the scene voices it with story/dialogue.js.
//
// effect keys (all optional):
//   heal, hurt (pure), block, gold (+/-), maxHp (+/- for the run), draw
//   st: { status: n } on Newton (momentum, charged, kindle, thorns, vulnerable, weak, burn, corrode, petrify)
//   foeSt / foesSt: statuses on this foe / on every foe (weak, vulnerable, dizzy, wet, burn, stun, blind, strength, evade)
//   foeDmg / foesDmg: damage that ignores block; foePct: a fraction of the foe's max HP
//   cards: [ids] temporary cards straight into the hand (this battle only); deck: [ids] new cards for the run
//   loseHand: { base, n } cards that leave the hand (base: a card id, or 'any'); loseDeck: n random cards for good
//   flee: the foe leaves the fight (no loot); steal: the foe pockets a card (kill it to get it back)
//   brawl: n (foes strike each other, each takes n; with one foe it is Vulnerable instead)
//   odds: { p, yes: {...}, no: {...} } rolled on the battle's seeded RNG
// need: { gold: n } or { hand: 'apple' } hides an option the player cannot afford.
import { BASICS } from './cards.js';
const BASE = (id) => BASICS[id]?.mutantOf || id;

export const DILEMMAS = {
  satyr: {
    title: 'The Wine of Dionysus', speaker: 'foe', intro: ['Psst. Philosopher. A cup of the good stuff? On the house. Mostly.'],
    prompt: 'The satyr holds out a dripping cup.',
    options: [
      { label: 'Drink the wine', sub: 'Heal 12 · you are Weak 2 (your strikes ×0.75)', fx: { heal: 12, st: { weak: 2 } }, reply: 'Ha! A philosopher who can drink. Now hit me. If you can find me.' },
      { label: 'Pour it over him', sub: 'Every foe is Wet 2 (Spark ×2 zap) · he gets Strength +2', fx: { foesSt: { wet: 2 }, foeSt: { strength: 2 } }, reply: 'MY VINTAGE! You absolute barbarian!' },
      { label: 'Decline politely', sub: 'Nothing happens', fx: {}, reply: 'More for me. Hic.' },
    ],
  },
  medusa: {
    title: 'The Mirror Bargain', speaker: 'foe', intro: ['Such a pretty reflection, little scholar. Give it to me, and I shall look away.'],
    prompt: 'Medusa coils closer, eyes half-lidded.',
    options: [
      { label: 'Trade your reflection', sub: 'Lose 5 max HP for the run · a Looking-Glass card now · she is Weak 2', fx: { maxHp: -5, cards: ['looking_glass'], foeSt: { weak: 2 } }, reply: 'Mmm. Now there are two of you. And none in the mirror.' },
      { label: 'Raise a polished shield', sub: 'She is Vulnerable 2 · 2 cards in your hand turn to stone', fx: { foeSt: { vulnerable: 2 }, st: { petrify: 2 } }, reply: 'Perseus tried that. Look where it got... oh. Never mind.' },
      { label: 'Close your eyes', sub: 'Block 10 · she gets Strength +2', fx: { block: 10, foeSt: { strength: 2 } }, reply: 'Hiding? How very mortal.' },
    ],
  },
  kobalos: {
    title: 'The Kobaloi Trade', speaker: 'foe', intro: ['Shiny? Shiny! Trade? You give, we go. Maybe.'],
    prompt: 'The kobalos jingles a stolen purse.',
    options: [
      { label: 'Pay him off', sub: '−18 gold · this kobalos leaves the fight (no loot)', need: { gold: 18 }, fx: { gold: -18, flee: true }, reply: 'Pleasure! Pleasure doing business!' },
      { label: 'Trade a card', sub: 'A random card leaves your deck for good · two Echo cards now', fx: { loseDeck: 1, cards: ['echo', 'echo'] }, reply: 'Ooh, physics. We will sell it to a goat.' },
      { label: 'Shoo him', sub: 'He steals a card (kill him to get it back) · he is Dizzy 1', fx: { steal: true, foeSt: { dizzy: 1 } }, reply: 'Mine now! Mine mine mine!' },
    ],
  },
  harpy: {
    title: 'The Stolen Supper', speaker: 'foe', intro: ['SKREE! Your apples smell delicious, scholar. Hand them over, or I take them with the hand.'],
    prompt: 'The harpy circles, talons flexing.',
    options: [
      { label: 'Toss her an Apple', sub: 'Lose 1 Apple from your hand · every harpy is Dizzy 2 (gorged)', need: { hand: 'apple' }, fx: { loseHand: { base: 'apple', n: 1 }, foesSt: { dizzy: 2 } }, reply: 'Mmmf. Crunchy. ...why is the sky spinning?' },
      { label: 'Snatch the basket back', sub: 'Take 6 · two Apples now (+1 Gravity: drag her down)', fx: { hurt: 6, cards: ['apple', 'apple', 'gravity'] }, reply: 'THIEF! You are the thief here, not me!' },
      { label: 'Ignore her', sub: 'She gets Strength +1', fx: { foeSt: { strength: 1 } }, reply: 'Then I take your eyes instead!' },
    ],
  },
  wolf: {
    title: 'The Howl', speaker: 'foe', intro: ['*the pack falls silent, waiting to see what you are*'],
    prompt: 'The wolves stare. One of them howls a question.',
    options: [
      { label: 'Howl back', sub: 'Every foe is Weak 1 · you are Vulnerable 1', fx: { foesSt: { weak: 1 }, st: { vulnerable: 1 } }, reply: '*an uneasy, answering howl*' },
      { label: 'Throw it an Apple', sub: 'Lose 1 Apple from your hand · this wolf leaves (no loot)', need: { hand: 'apple' }, fx: { loseHand: { base: 'apple', n: 1 }, flee: true }, reply: '*it trots off with the apple, tail high*' },
      { label: 'Stand very still', sub: 'Block 8 · draw 1', fx: { block: 8, draw: 1 }, reply: '*growl*' },
    ],
  },
  spartoi: {
    title: 'The Dragon’s Teeth', speaker: 'foe', intro: ['We are the Sown Men. We were born fighting. We will die fighting.'],
    prompt: 'Cadmus once threw a stone among them...',
    options: [
      { label: 'Throw a stone among them', sub: 'They brawl: each foe takes 10 · alone: Vulnerable 2', fx: { brawl: 10 }, reply: 'WHO THREW THAT? YOU! No, YOU!' },
      { label: 'Plant a tooth yourself', sub: 'A Keystone for your deck · take 5', fx: { deck: ['keystone'], hurt: 5 }, reply: 'He sows! He sows his own army!' },
      { label: 'Raise a shield wall', sub: 'Block 12 · they get Strength +1', fx: { block: 12, foesSt: { strength: 1 } }, reply: 'Shields? Good. We like a challenge.' },
    ],
  },
  centaur: {
    title: 'Chiron’s Riddle', speaker: 'foe', riddle: true, prompt: 'Answer well, student. Answer badly, and learn.',
    riddles: [
      { q: 'In a perfect vacuum, a feather and a stone are dropped together. Which lands first?', a: ['The stone', 'They land together', 'The feather'], right: 1 },
      { q: 'You push a wall with ten pounds of force. With how much force does the wall push back?', a: ['None: walls do not push', 'Ten pounds', 'Twenty pounds'], right: 1 },
      { q: 'Double an arrow’s speed. By how much does its striking energy grow?', a: ['Twice', 'Four times', 'It stays the same'], right: 1 },
      { q: 'Why does the Moon not fall onto the Earth?', a: ['It is falling, and always missing', 'Nothing pulls on it', 'It is lighter than air'], right: 0 },
    ],
    win: { sub: 'Right: draw 2 · Momentum 3 · he is Vulnerable 2', fx: { draw: 2, st: { momentum: 3 }, foeSt: { vulnerable: 2 } }, reply: 'Correct! You will make a fine natural philosopher.' },
    lose: { sub: 'Wrong: you are Weak 2 · he gets Strength +2', fx: { st: { weak: 2 }, foeSt: { strength: 2 } }, reply: 'Wrong. Pay attention, now.' },
  },
  minotaur: {
    title: 'The Thread of Ariadne', speaker: 'foe', intro: ['*he paws the stone floor and lowers his horns*'],
    prompt: 'A red thread trails off into the dark. Ariadne’s?',
    options: [
      { label: 'Follow the thread', sub: 'Draw 2 · a Keystone now (block his charge)', fx: { draw: 2, cards: ['keystone'] }, reply: 'MRRRR. The thread girl. Always the thread girl.' },
      { label: 'Wave a red cloak', sub: '50%: he charges a wall, Stunned 1 and takes 20 · 50%: you take 14', fx: { odds: { p: 0.5, yes: { foeSt: { stun: 1 }, foeDmg: 20 }, no: { hurt: 14 } } }, reply: 'RED. RED! I SEE RED!' },
      { label: 'Feed him an Apple', sub: 'Lose 1 Apple from your hand · he is Weak 2', need: { hand: 'apple' }, fx: { loseHand: { base: 'apple', n: 1 }, foeSt: { weak: 2 } }, reply: '*crunch* ...it is not a maiden. But it is acceptable.' },
    ],
  },
  hydra: {
    title: 'Iolaus’ Torch', speaker: 'foe', intro: ['HSSSS. Cut one, and two grow back. Sssscholar.'],
    prompt: 'Heracles’ nephew Iolaus offers you a burning torch.',
    options: [
      { label: 'Take the torch', sub: 'Two Heat cards now (burnt necks never regrow) · you Burn 2', fx: { cards: ['heat', 'heat'], st: { burn: 2 } }, reply: 'FIRE? Who brings FIRE to a hydra fight?!' },
      { label: 'Ask Iolaus to hold the heads', sub: '−12 gold · every head is Dizzy 2', need: { gold: 12 }, fx: { gold: -12, foesSt: { dizzy: 2 } }, reply: 'Hey! Stop that! Which way is up?' },
      { label: 'Fight alone', sub: 'Momentum 2', fx: { st: { momentum: 2 } }, reply: 'Brave. Ssstupid, but brave.' },
    ],
  },
  cyclops: {
    title: 'The Name', speaker: 'foe', intro: ['WHO ARE YOU, LITTLE MAN? TELL POLYPHEMUS YOUR NAME. THEN HE EATS YOU.'],
    prompt: 'The Cyclops squints with his one great eye.',
    options: [
      { label: '"My name is Nobody"', sub: 'Lose 1 Apple from your hand (the wine) · he is Dizzy 2 and Weak 2', need: { hand: 'apple' }, fx: { loseHand: { base: 'apple', n: 1 }, foeSt: { dizzy: 2, weak: 2 } }, reply: 'NOBODY! Nobody is... hic... very nice.' },
      { label: 'Pay tribute', sub: '−20 gold · he is Weak 3', need: { gold: 20 }, fx: { gold: -20, foeSt: { weak: 3 } }, reply: 'SHINY. Polyphemus will eat you LAST.' },
      { label: '"Isaac Newton. Of Woolsthorpe."', sub: 'He is enraged: Strength +2 · you draw 2', fx: { foeSt: { strength: 2 }, draw: 2 }, reply: 'WOOLSTHORPE? Never heard of it. RAAAH!' },
    ],
  },
  chimera: {
    title: 'Bellerophon’s Lead', speaker: 'foe', intro: ['*three heads speak at once: a roar, a bleat and a hiss*'],
    prompt: 'A lead-tipped spear lies in the grass. Her fire would melt it... in her throat.',
    options: [
      { label: 'Feed her the lead', sub: '60%: molten lead, she takes 25% of her HP · 40%: she spits it, you Burn 3', fx: { odds: { p: 0.6, yes: { foePct: 0.25 }, no: { st: { burn: 3 } } } }, reply: 'GHHRK! *the lion head coughs smoke*' },
      { label: 'Douse her flames', sub: 'Two Water cards now · she gets Strength +1', fx: { cards: ['water', 'water'], foeSt: { strength: 1 } }, reply: 'You think a few drops will quench ME?' },
      { label: 'Keep your distance', sub: 'Block 10', fx: { block: 10 }, reply: '*the goat head bleats mockingly*' },
    ],
  },
  talos: {
    title: 'The Bronze Nail', speaker: 'foe', intro: ['I AM TALOS. I GUARD THIS ISLAND. I DO NOT NEED TO SLEEP. I DO NOT NEED TO BLINK.'],
    prompt: 'A single bronze nail seals the ichor in his ankle. Medea pulled it once.',
    options: [
      { label: 'Pull the nail', sub: '40%: the ichor drains, he takes 30% of his HP · 60%: he stamps, you take 15', fx: { odds: { p: 0.4, yes: { foePct: 0.3 }, no: { hurt: 15 } } }, reply: 'WHAT ARE YOU DOING DOWN THERE?' },
      { label: 'Sing him to sleep', sub: 'He is Stunned 1 · lose 2 cards from your hand', fx: { foeSt: { stun: 1 }, loseHand: { base: 'any', n: 2 } }, reply: 'I... do not... need... zzzz.' },
      { label: 'Study his gears', sub: 'He is Vulnerable 2 · you are Vulnerable 1', fx: { foeSt: { vulnerable: 2 }, st: { vulnerable: 1 } }, reply: 'STOP LOOKING AT MY GEARS.' },
    ],
  },
};
DILEMMAS.minotaur_king = DILEMMAS.minotaur; DILEMMAS.hydra_elder = DILEMMAS.hydra;

/** the dilemma a fight offers (resolved for this battle: a riddle is drawn, unaffordable options are hidden) */
export function dilemmaFor(B) {
  const e = B.alive().find((x) => DILEMMAS[x.id] && !x.def.isHead); if (!e) return null;
  const D = DILEMMAS[e.id];
  const can = (o) => !o.need || ((o.need.gold == null || B.run.gold >= o.need.gold) && (!o.need.hand || B.hand.some((s) => s.cards.some((c) => BASE(c.id) === o.need.hand))));
  if (D.riddle) {
    const R = B.rng.pick(D.riddles);
    return { foe: e, title: D.title, speaker: D.speaker, intro: [R.q], prompt: `${D.prompt}  ${D.win.sub}.  ${D.lose.sub}.`, riddle: true,
      options: R.a.map((label, i) => (i === R.right ? { label, fx: D.win.fx, reply: D.win.reply, outcome: D.win.sub, right: true } : { label, fx: D.lose.fx, reply: D.lose.reply, outcome: D.lose.sub, right: false })) };
  }
  return { foe: e, title: D.title, speaker: D.speaker, intro: D.intro, prompt: D.prompt, options: D.options.filter(can) };
}
