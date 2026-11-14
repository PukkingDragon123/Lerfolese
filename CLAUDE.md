# Lerfolese (formerly "Apple of Discord") — project rules for Claude

## Art direction (current, from the user — newest decisions win)
- NEVER simple/lazy shapes as visible art: no plain spheres/cubes/cylinders/cones, no blobs stuck together, no round "AI slop" gradient shading, no circle textures.
- STYLE (USER, FINAL): REALISTIC LOW-POLY PIXEL ART for the WHOLE game. Sharp, clean low-poly geometry (faceted, flat-shaded, strong silhouettes, real anatomy/structure) with REALISTIC hand-made pixel-art textures and REALISTIC lighting. Keep THIN black ink outlines. NOT cartoony: no cartoon cel bands, no cartoon faces/eyes on creatures that shouldn't have them. Never voxel/Minecraft, never crude.
- (superseded by the realistic low-poly pixel-art rule above) colours harmonised like a painting, rich and saturated but natural.
- Artifacts, items, furniture and props: sharp very-low-poly with detailed pixel-art textures (same as everything now).
- LIGHTING (latest): realistic and MOODY, NOT bright: natural exposure, deep shadows, darker ambient, subtle bounce, desaturated-realistic grade; no cartoon cel bands.
- UI must be COOL and INTERACTIVE (alive objects reacting to hover/press/drag with motion, sound and light), never 'a detailed block with text'.
- Rendering: high resolution and crisp (supersampled, no tilt-shift blur, no chromatic aberration, minimal grain).
- UI: detailed PHYSICAL 3D objects (hourglass health, gold jar, etc.), realistic and polished; text is crisp 3D floating text (no paper notes); never glowing DOM text or flat rectangles.
- HERO: a real young Isaac Newton (20s, cool), built on the Limbo Phobia human engine (src/models/limbo). He WALKS (no levitation) and fights with the magic apple. Fluid, human-like procedural animation.
- HUMANOIDS (Cyclops, Minotaur body, Centaur torso, Spartoi, Talos, Harpy, satyr, Medusa, Kobalos, all event NPCs) are built on the SAME Limbo human base as Newton, with consistent style; extra parts are attachments. The sculpted pipeline is only for non-humanoid beasts.
- CREATURES (all animals/monsters): borrow ODDWORLD's creature-MODELLING approach (believable anatomy and weight, one or two traits pushed for character, weathered lived-in surfaces, expressive realistic faces) but themed to our Greek-myth science storybook; original designs, never their look.
- Monsters: Greek mythology, custom rigs (src/models/beasts), weighted physical animations. Gore welcome (blood droplets, splatter, severed hydra heads).
- Combat feel: physical, minimal VFX (real attack animations, knockback, 3D debris and dust), magic as tasteful 3D shader effects plus a few fine polished pixel particles. No big low-res sprite FX.
- LEAVES = many 2D pixel-art leaf-spray cards around real branch structure (never blocky faceted chunks). Halley's coat = pixel-art cord cards. (Menu/loading: see Story and presentation.)
- World: big detailed places (forest, pond, lake, village), wind, little animals, beautiful painted anime sky. Events are full cinematic cutscenes with visible characters.
- Map: big miniature diorama (enemy figurines, miniature trees, rivers, paths, fog, chests). Not chess pieces.
- Cards: hand-pixelled illustrations; backdrops are nature or space scenes; Laws/Force/Rotation art is magic effects, no hands.

## Game design (current — big remake, user-confirmed)
- HERO: young Isaac Newton WALKS (no levitation/flying). His weapon is the MAGIC APPLE (bends physics, stops time); attacks revolve around it (grab, throw, time-stop, gravity bends). Fluid, believable animation.
- Cards: Slay the Spire / Balatro feel, BIG easy-to-read card text. Card kinds include draw-more and discard cards. Merge into attacks; when cards become an attack, show an illustration of Isaac performing it. Cool cinematic attack animations.
- Preparing your turn: the world freezes into slow motion; End Turn resolves. Removed: dodge QTE, "Second Thoughts" redraw basket.
- Battle UI: health = an HOURGLASS (sand pours when hurt); gold = a JAR. No paper notes: text is crisp 3D FLOATING TEXT. Lighting/UI less saturated, more realistic, polished, detailed; no ugly big text.
- Combat dilemmas: full zoom-in interactive scenes showing Isaac doing the action. Bosses include the wizard FROG, the BOOKWORMS, and some events become optional boss fights (e.g. Prometheus' eagle, the Sphinx).
- GAME NAME: LERFOLESE (renamed from Apple of Discord) in all user-visible text.
- Combat like Slay the Spire: BLOCK is central, enemies hit hard with telegraphed intents, and it is a LOT HARDER. Map board figurines show exactly the enemies of each node's pre-rolled encounter.
- Roguelike depth stays: synergies/anti-synergies, multipliers, odds, discovery picks, enemy loot only, hard difficulty.

## Story and presentation (current)
- PROLOGUE: kid Isaac (cool kid proportions, NOT a big head) runs to his old frail TEACHER in an old apple garden. Cinematic camera, narrator with floating 3D text. Teacher gives 3 cards (Apple, Force, Spin) and teaches merging/multipliers; Isaac just grabs and throws the apple (no magic). Tutorial fight vs a FAT RACCOON; more tutorial on forces. Then a SNAKE biting a GOLDEN APPLE slithers in and drops it while the teacher reads; slow-motion grab, the teacher screams, giant shockwave, time stops in black-and-white, white flash -> a painted "Creation of Adam" style cutscene: Isaac touches the hand of a pure white god-entity, who says he broke the rules and is trapped forever in the realm of gods, but out of pity lets him keep the magic apple (bend reality/physics, stop time).
- MENU: Isaac on TOP OF HIS TOWER (fantasy tower with gears and striking shapes) looking over a sunset landscape, cool pose. Buttons are floating 3D CLOUDS: Resume / New Game ("New Adventure" when no run); clicking zooms in and shows you walking off. Swipe left = inside the tower: ACHIEVEMENT HALL with the golden apple and floating memory shards (rifts from scenes); hard achievements and challenges unlock permanent things (scenes, content). Halley the mop dog stays as companion. Old garden/library/frog-shop menu removed.
- TRANSITIONS: never the blank ink wipe; use a billowing CLOUD transition (default) and a swirling MAGIC GALAXY transition (menu/run, prologue/god, death, hall).
- LOADING: the apple time-lapse in pixel-art space (must replace the old DOM boot screen entirely), with much better rot particles.
- SOUND: 8-bit / chiptune from FREE licence-checked packs (OpenGameArt, Kenney etc.), credited; never self-generated.
- CLOTH everywhere: real stitched/fibre pixel textures and cloth physics (spring-simulated hems, capes, sleeves).
- Voices (Web Speech) and narrator stay; dialogue as 3D floating text.
- Fonts: Alagard titles; PixelSans/NanoPlus/RuneMono; always high-resolution, crisp.

## Workflow
- ASK THE USER FIRST (short question with options) before any big or ambiguous change or before launching agents; the user pays for every token.

## Tech
- Static site, three.js r170 vendored, ES modules, no build. Serve the repo root (`python3 -m http.server`).
- Tests: `node tools/sim.mjs 300` (rules); `node tools/play2.mjs "<url>?q=test" out.png 30000 "<actions @@-separated>"` (Playwright, long timeouts). Battle intro skip: `click:640:360@@key:Space@@wait:3000@@key:Space@@wait:15000`. Debug: `?battle=a,b&kind=elite`, `?node=event&event=icarus`, `&ink=1`.
- Hosted artifact: https://claude.ai/artifact/QV1BdMLkQoY2fbe5JLMmJ5 (.glb/.hdr ship as .b64.json via src/core/binfetch.js).
