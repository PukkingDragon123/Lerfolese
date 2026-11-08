# Apple of Discord

*Every action has an equal and opposite god.*

A jazzy, slightly unhinged 3D roguelike deckbuilder. Humanity found the source code of the universe, so the gods trapped everyone in an endless repeating loop. You are **Sir Isaac Plumb**, natural philosopher, deceased: a sarcastic genius whose wooden marionette body hangs from glowing gravity strings held by his own ghost. Combine science cards into real moves and argue with Greek mythology.

## Play

It is a static site with no build step. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Any static server works, and so does GitHub Pages.

Debug shortcuts:
- `?battle=satyr,kobalos` jumps straight into a battle. `kind=elite|guardian` sets the encounter type and `deck=apple,gravity,...` sets the starting deck.
- `?q=test` is a fast, low-quality render mode for automated tests.

## How it plays

- **No energy.** Every turn you draw 6 cards and can play all of them.
- **Combine by stacking.** Drag one card onto another. Basic cards fuse into a **Move** and the stack shows the combined card.
- **Physics is the damage formula.** A hit deals *mass × velocity*. Apple (m1 v2) + Gravity (+4 v) = **Falling Apple**, 1 × 6 = 6. Add Mass (+2 m) and it becomes 3 × 6 = 18. Rotation adds hits, Inertia keeps the move going next turn, Heat burns, Water wets (Spark chains through wet foes), a Lens multiplies, a Spring bounces.
- **Where you drop a card decides what it does:**
  - on a **foe**: attack.
  - on **Sir Isaac**: self effects such as block, heal and buffs.
  - on the **ground**: places an object (apple sapling, boulder, puddle, tesla coil, campfire, gravity well…).
  - on an **existing object**: makes it react. Force launches a boulder, Spark electrifies a puddle, Heat ignites spilled wine, Gravity shakes the apple tree.
- **Physical input everywhere.** Flick a card to throw it, shake a stack to split it, drop cards in the wicker basket to redraw (3 *Second Thoughts* per battle), and ring the desk bell to end your turn (or press Space).
- **Three card types:** Basic (12 science cards), Move (combinations: endless procedural ones with funny names, plus named discoveries like *Black Hole*, *Stolen Thunder* and *PRINCIPIA*) and Power (6 persistent Laws).
- **Cards change during a run.** At the Field Lab they **upgrade**, **mutate** (Golden Apple, Antigravity, Dark Matter, Brute Force…) and **merge** into permanent Moves.
- **Rare Curios** (17) come only from events, elites and guardians, never from normal fights or shops. Several of them resonate with each other.
- **The Discovery Journal** is a physical book you flip through. It records combinations, enemy weaknesses you have discovered, curios and every loop. It is the only thing that survives death: there are no permanent upgrades, only knowledge.

## Act I: The Mythical Wilderness

- **Normal foes:** a Drunk Satyr (philosophical, flammable), Medusa (petrifies your cards; a Lens reflects her gaze) and Kobaloi (steal cards, dodge single hits).
- **Elites:** the Minotaur (charges; put a boulder in his way) and the Lernaean Hydra (heads regrow unless burnt; falling attacks pierce its hide).
- **Guardians:** empowered versions of whichever elite you did not fight.
- **Map:** a branching miniature diorama you can grab, rotate and zoom.
- **Events:** 12 curiosities with card-offering puzzles. They include Sisyphus's unpaid intern, Pan's jam session (a rhythm minigame), the Sphinx's physics exam, Prometheus selling fire, and the Apple of Discord itself.
- **Shop:** Diogenes runs one from his barrel.

Act II (the Trojan War) and Act III (Mount Olympus: Zeus, Poseidon, Hades) come next.

## Tech

- three.js r170, vendored in `vendor/`, plain ES modules.
- Custom post-processing: bloom, diorama tilt-shift, film grade and pixel wipe transitions.
- Card illustrations are detailed 3D models rendered through a stylizer (`src/gfx/forge.js`) into polished pixel art.
- `node tools/sim.mjs 300` runs headless battle simulations to check the rules engine.

## Credits

See [CREDITS.md](CREDITS.md). Audio, fonts and third-party models are all freely licensed (CC0, CC BY, OFL, Apache 2.0 or MIT), with attribution in `assets/audio/CREDITS.md` and `assets/models/CREDITS.md`.
