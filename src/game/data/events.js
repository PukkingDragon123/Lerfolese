// Curiosities of the Mythical Wilderness. Choices with a `slot` ask you to OFFER A CARD from your deck;
// the outcome depends on the card's physics. ctx helpers: gold, heal, hurt, maxhp, addCard, addMove, addItem,
// upgrade, mutate, remove, has(item). Every outcome returns the text to show.
import { baseOf } from '../combos.js';

const B = (c) => (c.type === 'move' ? c.comps.map((k) => baseOf(k.id)) : [baseOf(c.id)]);
const any = (...ids) => (c) => c.type !== 'power' && B(c).some((b) => ids.includes(b));

export const EVENTS = [
  {
    id: 'tree', title: 'The Tree of Knowledge (Apple Edition)', theme: 'meadow', prop: 'tree',
    text: 'A gnarled apple tree. A sign, nailed at eye level: DO NOT SHAKE. Below it, in smaller letters: seriously. Below that, in your own handwriting, from a previous loop: shake it.',
    choices: [
      { label: 'Shake it', sub: 'You know you want to', run: (x) => { x.hurt(3); x.addMove(['apple', 'gravity'], 'Falling Apple'); x.learn('combo'); return 'An apple falls on your head. Of course it does. You take 3 damage and gain an idea: a Falling Apple (Move).'; } },
      { label: 'Offer a card', sub: 'Gravity, Force or Heat', slot: { prompt: 'Offer Gravity, Force or Heat', filter: any('gravity', 'force', 'heat') },
        run: (x, c) => { const b = B(c); if (b.includes('heat')) { x.heal(16); return 'You bake the whole tree. Warm apple pie, physically derived. Heal 16.'; } if (b.includes('gravity')) { x.addCard('apple'); x.addCard('apple', 1); x.heal(6); return 'You turn up gravity, locally. Three apples fall politely into your hands. Gain 2 Apples (one ripe+) and heal 6.'; } x.addCard('inertia', 1); return 'TIMBER. The tree lies down with great dignity. You pocket its stubbornness: gain Inertia+.'; } },
      { label: 'Leave it', sub: 'Respect the sign', run: () => 'You leave the tree unshaken. Somewhere, a loop of you weeps.' },
    ],
  },
  {
    id: 'oracle', title: "Pythia's Malfunctioning Oracle", theme: 'garden', prop: 'oracle',
    text: 'The Oracle of Delphi has been replaced by a steam-powered prophecy engine. It wheezes. A brass slot reads INSERT DRACHMA. A tiny priestess kicks it. "It used to say things like YOU WILL DIE. Now it just says ERROR."',
    choices: [
      { label: 'Insert 20 gold', sub: 'Receive wisdom', if: (r) => r.gold >= 20, run: (x) => { x.gold(-20); x.addCard(x.rng.pick(['lens', 'spring', 'spark', 'water'])); return 'The engine coughs out a card and the prophecy: "THE ANSWER IS m TIMES v." Insightful. Gain a random card.'; } },
      { label: 'Offer a card', sub: 'Spark fixes it · Water shorts it', slot: { prompt: 'Offer Spark or Water', filter: any('spark', 'water') },
        run: (x, c) => (B(c).includes('spark') ? (x.addItem('antikythera') ? 'You jolt it back to life. It reboots, sees everything, and hands you its brain: the Antikythera Mechanism.' : 'It reboots and thanks you with 60 gold.') : (x.hurt(5), x.gold(45), 'Short circuit! Sparks, steam, screaming. 45 gold sprays out of the coin box. You take 5 damage.')) },
      { label: 'Kick it', sub: 'Percussive maintenance', run: (x) => (x.rng.chance(0.5) ? (x.gold(30), 'It dispenses 30 gold and the word OW.') : (x.hurt(7), 'It kicks back. 7 damage. Prophetic.')) },
    ],
  },
  {
    id: 'sisyphus', title: "Sisyphus's Intern", theme: 'gully', prop: 'boulder',
    text: 'A young man pushes a pebble up a hill. It rolls down. He sighs and starts again. "It\'s an internship," he says. "Unpaid. Eternal. Great for my CV."',
    choices: [
      { label: 'Help him push', sub: 'Lose 6 Integrity', run: (x) => { x.hurt(6); const n = x.upgrade((c) => any('force', 'mass')(c)); return n ? `Together you get it to the top. It rolls down. But your ${n} got stronger. Upgraded.` : 'You push. It rolls. You learn nothing, which is educational.'; } },
      { label: 'Offer a card', sub: 'Rotation · Spring · Mass', slot: { prompt: 'Offer Rotation, Spring or Mass', filter: any('rotation', 'spring', 'mass') },
        run: (x, c) => { const b = B(c); if (b.includes('rotation')) { x.addCard('stone', 1); x.gold(40); return 'You invent the wheel. He rolls the pebble up in seconds, weeps, and quits. He gives you his Stone+ and his severance (40 gold).'; } if (b.includes('spring')) { x.remove(c); x.addItem('event'); return 'You build a spring catapult. The pebble achieves orbit. The intern achieves enlightenment. Lose the card, gain a curio.'; } x.maxhp(5); return 'You explain inertia. He explains burnout. You both feel heavier. +5 max Integrity.'; } },
      { label: 'Explain thermodynamics', sub: 'Crush his hopes', run: (x) => { x.addCard('heat'); return '"So it is pointless?" Entirely. He thanks you and gives you his last spark of motivation: gain Heat.'; } },
    ],
  },
  {
    id: 'pan', title: "Pan's Jam Session", theme: 'meadow', npc: 'satyr', prop: 'amphorae',
    text: 'Three satyrs are improvising jazz in a time signature that does not exist. The bandleader, Pan, points his flute at you. "Floaty! You look like a man who understands polyrhythm. Sit in."',
    choices: [
      { label: 'Sit in (rhythm test)', sub: 'Hit the beats', minigame: 'rhythm', run: (x, c, score) => (score >= 3 ? (x.addItem('pan_flute') ? 'You swing. They swing. Pan, moved to tears, gives you his flute. "Keep it. I have nine."' : 'You swing. Pan pays you 50 gold.') : (x.mutate() ? `You miss the downbeat. The wine is strong. Something in your deck feels... different. (A card mutated.)` : 'You miss everything. They let you play triangle.')) },
      { label: 'Request a song', sub: '"Something by Steely Dan?"', run: (x) => { x.heal(10); return '"Who?" They play something smooth anyway. You feel inexplicably sophisticated. Heal 10.'; } },
      { label: 'Steal the wine', sub: 'Bold', run: (x) => { x.hurt(8); x.addCard('water', 1); return 'Three satyrs, one headbutt each. You escape with the wine (it counts as Water+, scientifically). 8 damage.'; } },
    ],
  },
  {
    id: 'icarus', title: "Icarus's Flight Test", theme: 'gully', prop: 'wings',
    text: 'A teenager in wax wings is doing stretches on a cliff. "Dad says not to fly near the sun. Dad says a lot of things. You look scientific. Approve my design?"',
    choices: [
      { label: 'Approve the design', sub: 'What could go wrong', run: (x) => { x.hurt(8); x.addItem('wings'); return 'He flies. He flies higher. He lands on you. He leaves, embarrassed, without his spare Wax Wings. 8 damage.'; } },
      { label: 'Offer a card', sub: 'Mass for ballast · Heat for... no', slot: { prompt: 'Offer Mass or Heat', filter: any('mass', 'heat') }, run: (x, c) => (B(c).includes('mass') ? (x.remove(c), x.gold(70), 'You add ballast. He flies safely, boringly, forever. His father pays you 70 gold. Lose the card.') : (x.maxhp(-3), x.addCard('plasma'), 'He melts mid-sentence. You feel terrible. You take the Plasma anyway. -3 max Integrity.')) },
      { label: 'Warn him about the sun', sub: 'Be the adult', run: (x) => 'He rolls his eyes so hard he loses altitude before even taking off. Lesson: nobody listens to physicists.' },
    ],
  },
  {
    id: 'sphinx', title: "The Sphinx's Physics Exam", theme: 'garden', prop: 'statue',
    text: 'A Sphinx lounges across the road, exam papers in her paws. "Answer correctly and pass. Answer wrongly and I eat you. It is a very competitive programme." She licks a pencil.',
    choices: [
      { label: '"The Moon."', sub: 'What falls forever but never lands?', run: (x) => (x.addItem('event') ? '"Correct: it is always falling and always missing." She gives you a curio and a gold star sticker.' : 'Correct! She gives you 50 gold.') },
      { label: '"An apple."', sub: 'What falls forever but never lands?', run: (x) => { x.hurt(12); return '"It LANDS. On heads, mostly." She bites you. 12 damage. Partial credit for confidence.'; } },
      { label: '"Your grades."', sub: 'What falls forever but never lands?', run: (x) => { x.gold(25); return 'She laughs so hard she drops her lunch money. 25 gold. Technically still wrong.'; } },
    ],
  },
  {
    id: 'narcissus', title: "Narcissus's Pond", theme: 'garden', prop: 'pond',
    text: 'A beautiful young man stares into a pond. He has been doing it for a while; moss has grown on his sandals. "Do not interrupt. I am in a relationship."',
    choices: [
      { label: 'Look in the pond', sub: 'Duplicate a card', slot: { prompt: 'Choose a card to reflect (duplicate)', filter: (c) => c.type !== 'power' }, run: (x, c) => { x.dupe(c); x.maxhp(-4); return `Your reflection winks and hands you a copy of ${c.name || c.id}. You lose 4 max Integrity to vanity.`; } },
      { label: 'Offer a card', sub: 'Lens · Stone', slot: { prompt: 'Offer Lens or Stone', filter: any('lens', 'stone') }, run: (x, c) => (B(c).includes('lens') ? (x.addItem('mirror') ? 'You show him a magnified selfie. He faints with joy. You take his polished bronze mirror.' : 'He faints. You take 40 gold from his tunic.') : (x.gold(-10 > 0 ? 0 : 0), x.addCard('water', 1), 'You plop a stone in. Ripples. He screams. You run, with a jar of pond (Water+).')) },
      { label: 'Leave', sub: 'Some things are better left reflected', run: () => 'He does not notice you leave. He does not notice anything. A role model for no one.' },
    ],
  },
  {
    id: 'prometheus', title: 'Prometheus, Fire Salesman', theme: 'gully', prop: 'brazier',
    text: '"FIRE! Get your fire here! Gods HATE it!" A chained titan has a little stall. His liver is regenerating at an alarming rate. "Cash only. The eagle takes cards."',
    choices: [
      { label: 'Buy fire (35 gold)', sub: 'Gain Heat+', if: (r) => r.gold >= 35, run: (x) => { x.gold(-35); x.addCard('heat', 1); return '"Pleasure doing business. Tell Zeus nothing." Gain Heat+.'; } },
      { label: 'Offer a card', sub: 'Spark', slot: { prompt: 'Offer Spark', filter: any('spark') }, run: (x, c) => { x.remove(c); x.addCard('thermo', 0, 'power'); return '"Electric fire? Visionary." He trades you his trade secret: the Thermodynamics Power. Lose the Spark.'; } },
      { label: 'Free him', sub: 'Lose 10, gain a friend', run: (x) => { x.hurt(10); x.maxhp(8); return 'You pick the lock with a theorem. The eagle is furious (10 damage). Prometheus hugs you. +8 max Integrity.'; } },
    ],
  },
  {
    id: 'toll', title: 'The Kobalos Toll Bridge', theme: 'gully', npc: 'kobalos', prop: 'bridge',
    text: 'Three Kobaloi have built a bridge out of stolen spoons. "Toll is 25 gold. Or a card. Or your left boot. We are flexible."',
    choices: [
      { label: 'Pay 25 gold', sub: 'Civilised', if: (r) => r.gold >= 25, run: (x) => { x.gold(-25); x.heal(5); return 'They bow theatrically. You cross. One of them pats your pocket. You check: everything is still there. Suspicious. Heal 5 from relief.'; } },
      { label: 'Offer a card', sub: 'Force · Rotation', slot: { prompt: 'Offer Force or Rotation', filter: any('force', 'rotation') }, run: (x, c) => (B(c).includes('force') ? (x.addItem('sack') ? 'You push them off their own bridge. Splash! You keep their loot sack.' : 'Splash! You keep 45 gold.') : (x.gold(30), 'You spin the bridge. Kobaloi everywhere. Spoons everywhere. You collect 30 gold in spoons.')) },
      { label: 'Give them your left boot', sub: 'Lose a random card', run: (x) => { const n = x.removeRandom(); return `They take a card (${n}) instead. "Close enough to a boot." You are lighter. Possibly wiser.`; } },
    ],
  },
  {
    id: 'archimedes', title: "Archimedes' Bathtub", theme: 'meadow', prop: 'tub',
    text: 'In the middle of the woods, a bathtub. In the bathtub, Archimedes, mid-epiphany, very naked. "EUREKA!" he shouts, at you, for no reason. "Oh. A colleague. Want to measure something?"',
    choices: [
      { label: 'Measure displacement', sub: 'Upgrade all Mass cards', run: (x) => { const n = x.upgradeAll((c) => any('mass')(c)); return n ? `Brilliant. Your ${n} Mass card${n > 1 ? 's are' : ' is'} upgraded. He shouts Eureka again. You both do. It is nice.` : 'You have no Mass. He calls you insubstantial. Accurate.'; } },
      { label: 'Borrow his lever', sub: 'Lose a random card', run: (x) => { const n = x.removeRandom(); x.addItem('lever'); return `"Give me a place to stand!" he says, handing you his Lever. You leave ${n} as a deposit.`; } },
      { label: 'Offer a card', sub: 'Lens (heat ray) · Water', slot: { prompt: 'Offer Lens or Water', filter: any('lens', 'water') }, run: (x, c) => (B(c).includes('lens') ? (x.addMove(['heat', 'lens'], "Archimedes' Heat Ray"), "He shows you his burning-mirror trick. You learn Archimedes' Heat Ray (Move).") : (x.heal(20), 'You share the bath. It is weirdly relaxing. Heal 20.')) },
    ],
  },
  {
    id: 'schrodinger', title: "Schrödinger's Crate", theme: 'garden', prop: 'crate',
    text: 'A crate in the road. It is meowing. It is also not meowing. A label: CONTENTS UNKNOWABLE. DO NOT OBSERVE. Underneath, in crayon: or do, im a sign not a cop.',
    choices: [
      { label: 'Open it', sub: '50 / 50', run: (x) => (x.rng.chance(0.5) ? (x.addItem('schrodinger') ? 'Alive! A cat, a sandwich, and a lunchbox that is both full and empty. It is yours.' : 'Alive! The cat gives you 40 gold.') : (x.hurt(9), 'The cat is a ghost and VERY upset about it. 9 damage.')) },
      { label: "Don't open it", sub: 'Collapse nothing', run: (x) => { x.gold(30); return 'You leave the crate unobserved. The universe, grateful for the reduced paperwork, gives you 30 gold.'; } },
      { label: 'Offer a card', sub: 'Lens: observe it', slot: { prompt: 'Offer Lens', filter: any('lens') }, run: (x) => { x.addCard('superposition'); x.addCard('superposition'); return 'You observe it at an angle the universe did not expect. Both outcomes fall out: gain 2 Superpositions.'; } },
    ],
  },
  {
    id: 'discord', title: 'The Apple of Discord', theme: 'garden', prop: 'gapple',
    text: 'A golden apple sits on a stump, inscribed TO THE FAIREST. Three goddesses argue over it in the distance; the trees have started taking sides. You recognise the title of your own story.',
    choices: [
      { label: 'Give it to Athena', sub: 'Wisdom', run: (x) => (x.addItem('owl') ? 'Athena nods, which is enormous praise. Her Owl decides to follow you around and judge you.' : 'Athena nods and gives you 60 gold.') },
      { label: 'Give it to Aphrodite', sub: 'Beauty', run: (x) => { x.heal(99); return 'Aphrodite kisses your cheek. You glow like a sunrise. Fully healed.'; } },
      { label: 'Keep it', sub: 'Chaos', run: (x) => (x.addItem('golden_apple') ? (x.maxhp(-6), 'You pocket it. Three goddesses glare at you in perfect unison. -6 max Integrity. You now own the Golden Apple.') : (x.gold(100), 'You sell it to a passing hero for 100 gold. That will not cause any wars.')) },
    ],
  },
];
