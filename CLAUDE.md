# Lerfolese (formerly "Apple of Discord") — project rules for Claude

## Art direction (current, from the user — newest decisions win)
- NEVER simple/lazy shapes as visible art: no plain spheres/cubes/cylinders/cones, no blobs stuck together, no round "AI slop" gradient shading, no circle textures.
- STYLE (USER, FINAL): REALISTIC LOW-POLY PIXEL ART for the WHOLE game. Sharp, clean low-poly geometry (faceted, flat-shaded, strong silhouettes, real anatomy/structure) with REALISTIC hand-made pixel-art textures and REALISTIC lighting. Keep THIN black ink outlines. NOT cartoony: no cartoon cel bands, no cartoon faces/eyes on creatures that shouldn't have them. Never voxel/Minecraft, never crude.
- (superseded by the realistic low-poly pixel-art rule above) colours harmonised like a painting, rich and saturated but natural.
- Artifacts, items, furniture and props: sharp very-low-poly with detailed pixel-art textures (same as everything now).
- LIGHTING (newest, supersedes 'moody'): MORE COLOURFUL, beautiful REALISTIC CEL SHADE (soft realistic light with clean cel-style shadow terminators, rich natural colour, not washed out, not cartoon).
- UI must be COOL and INTERACTIVE (alive objects reacting to hover/press/drag with motion, sound and light), never 'a detailed block with text'.
- Rendering (newest, user): NOT pixelated: full native resolution, crisp. Only the galaxy/astral scenes get a slight pixel-art look. Subtle motion blur on fast motion. Grass: WARM palette (golden/olive/ochre), same colour family as its ground. No tilt-shift, no chromatic aberration.
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
- Preparing your turn: TIME IS STOPPED (world frozen). END TURN is a physical GOLDEN APPLE: clicking it makes time flow again and all your queued actions play out.
- Deaths: procedural RAGDOLL (weighted crumple, killing-blow impulse); procedural animation everywhere (hit reactions, staggers, breathing). Removed: dodge QTE, "Second Thoughts" redraw basket.
- Battle UI: health = an HOURGLASS (sand pours when hurt); gold = a JAR. No paper notes: text is crisp 3D FLOATING TEXT. UI realistic, polished, detailed; no ugly big text.
- Combat dilemmas: full zoom-in interactive scenes showing Isaac doing the action. Bosses include the wizard FROG, the BOOKWORMS, and some events become optional boss fights (e.g. Prometheus' eagle, the Sphinx).
- GAME NAME: LERFOLESE (renamed from Apple of Discord) in all user-visible text.
- Combat like Slay the Spire: BLOCK is central, enemies hit hard with telegraphed intents, and it is a LOT HARDER. Map board figurines show exactly the enemies of each node's pre-rolled encounter.
- CARD INFO (newest): cards show full clear info like Slay the Spire (type, exact live numbers green/red with modifiers, highlighted keywords + tooltips), big and high-res.
- SPELLS (newest): NO 2D pixel-art 'Isaac doing the attack' vignette. Merging = mixing an EQUATION; the result is a complete SPELL CARD (distinct gilded arcane frame, name, equation, stats) whose art is an ANIMATED live 3D scene of Isaac performing that attack. Gameplay must be clear, deterministic and feel like a real experiment (set up, predict, run); many more enemies.
- CARDS (newest): NO card rewards. You get new cards only by MERGING (discoveries) and from EVENTS.
- The APPLE has a lot of FRICTION and builds HEAT (a core mechanic: heat glows/smokes on the apple and changes its moves).
- Roguelike depth stays: synergies/anti-synergies, multipliers, odds, discovery picks, enemy loot only, hard difficulty.

## Story and presentation (current)
- PROLOGUE: kid Isaac (cool kid proportions, NOT a big head) runs to his old frail TEACHER in an old apple garden. Cinematic camera, narrator with floating 3D text. Teacher gives 3 cards (Apple, Force, Spin) and teaches merging/multipliers; Isaac just grabs and throws the apple (no magic). Tutorial fight vs a FAT RACCOON; more tutorial on forces. Then a SNAKE biting a GOLDEN APPLE slithers in and drops it while the teacher reads; slow-motion grab, the teacher screams, giant shockwave, time stops in black-and-white, white flash -> a painted "Creation of Adam" style cutscene: Isaac touches the hand of a pure white god-entity, who says he broke the rules and is trapped forever in the realm of gods, but out of pity lets him keep the magic apple (bend reality/physics, stop time).
- MENU: Isaac on TOP OF HIS TOWER (fantasy tower with gears and striking shapes) looking over a sunset landscape, cool pose. Buttons are floating 3D CLOUDS: Resume / New Game ("New Adventure" when no run); clicking zooms in and shows you walking off. Swipe left = inside the tower: ACHIEVEMENT HALL with the golden apple and floating memory shards (rifts from scenes); hard achievements and challenges unlock permanent things (scenes, content). The mop dog Halley is REMOVED (user). Old garden/library/frog-shop menu removed.
- MENU (newest): a SPIRAL fantasy tower, absolutely beautiful and detailed to the max, with a better town below (reuse village/Poly Haven assets). Sir Isaac stands on the tower on the RIGHT; the menu words float on the LEFT as cool, polished 3D text (crisp, bevelled/extruded, subtle metal, hover shimmer) - NOT cloud text. Clicking looks up to the sky -> a beautiful pixel-art ASTRAL scene: pick a CONSTELLATION = run start (starting artifact/deck twist), then the run begins. No riding-a-cloud sequence.
- MENU SYSTEMS (newest): 4 polished icons: STUDIES (experiment-hall room: discovered combos/laws as research; completing a study gives a permanent reward; studied cards usable as starts/more common; detailed 2D UI + interactive 3D scenes), STARS (achievements in SPACE, each one a constellation, with animated memory scenes/rifts), JOURNAL, SETTINGS. You can NOT enter the tower (no swipe-in hall).
- Tower view: never low-poly trees/scenery; detailed and heavily optimised, light distance fog/blur OK. Game should read clearly and look like a painting.
- Fonts: never low-res. Titles/menu = Alagard rendered high-res as 3D extruded, bevelled metal/stone with cinematic light (medieval, not flat 2D).
- Enemy intents: shown as an apple TIME-PREDICTION (the golden apple foretells what each foe will do), cool and clean, not ugly UI. Raccoon tutorial fight easier and better.
- No cloud effects/cloud UI in battle.
- NEVER circle/round-blob shapes in any effect or transition (reads as AI). Clouds = painterly sculpted cumulus (flat bases, billowing tops, crisp lit edges, wisps).
- Do NOT show the game name on screen (tab title and credits only). No cloud UI or cloud text. Very little floating text; what text there is must feel cool and polished.
- TRANSITIONS: never the blank ink wipe; use a billowing CLOUD transition (default) and a swirling MAGIC GALAXY transition (menu/run, prologue/god, death, hall).
- LOADING: the apple time-lapse in pixel-art space (must replace the old DOM boot screen entirely), with much better rot particles.
- SOUND: 8-bit / chiptune from FREE licence-checked packs (OpenGameArt, Kenney etc.), credited; never self-generated.
- CLOTH everywhere: real stitched/fibre pixel textures and cloth physics (spring-simulated hems, capes, sleeves).
- Voices (Web Speech) and narrator stay; dialogue as 3D floating text.
- Fonts: Alagard titles; PixelSans/NanoPlus/RuneMono; always high-resolution, crisp.

## Newest direction (user, latest wins)
- STORY: full Greek mythology, but the MAIN ANTAGONIST is a CHESS MASTER GOD who plays chess with mortals: every boss is one of his pieces (Pawn/Knight/Bishop/Rook/Queen/King themed, Greek-myth flavoured), the final fight is against him. Storylines with full cinematics; polished arenas and map. Game STARTS with cinematic cutscenes; intro is skippable.
- FONT: use ALAGARD as the main font almost everywhere, always rendered high-res (never low-res pixel fonts).
- VOICES: uncanny gibberish babble (per-character pitch/timbre), text shows meaning.
- Menu features (Studies, Stars, Journal) are LOCKED until the first won run; a run-end screen shows everything newly unlocked.
- Cards: muted, old-book look (aged paper, ink, faded colours), not bold. Icons mix 3D and 2D (3D apples/objects on painted backgrounds) with animated effects.
- Space/astral: less colourful. Constellation select shows each shape (apple etc.) as a very cool 3D model made of stars.
- Loading: has sound; the apple floats with space physics, click to push it; procedural feel.
- Lots more motion blur. Tutorial camera never turns away from the garden. Tutorial apple 'gold spinning machine' effect becomes cool magic-force science particles.
- Must not bug; MOBILE supported (touch, layout, performance).

## Workflow
- ASK THE USER FIRST (short question with options) before any big or ambiguous change or before launching agents; the user pays for every token.

## Tech
- Static site, three.js r170 vendored, ES modules, no build. Serve the repo root (`python3 -m http.server`).
- Tests: `node tools/sim.mjs 300` (rules); `node tools/play2.mjs "<url>?q=test" out.png 30000 "<actions @@-separated>"` (Playwright, long timeouts). Battle intro skip: `click:640:360@@key:Space@@wait:3000@@key:Space@@wait:15000`. Debug: `?battle=a,b&kind=elite`, `?node=event&event=icarus`, `&ink=1`.
- Hosted artifact: https://claude.ai/artifact/QV1BdMLkQoY2fbe5JLMmJ5 (.glb/.hdr ship as .b64.json via src/core/binfetch.js).
- COLOUR + SHADERS (user, newest): the game felt colourless - world and lighting must be VIVID and colourful (rich saturated natural colour, strong warm key / cool fill, coloured bounce and sky light); no global desaturating grade or hue-harmony that greys things out. Old-book muting applies to card faces only, not the world. Shaders a LOT better (surface detail, rim/sky light, AO, water, foliage translucency, atmosphere).
- END TURN golden apple must look MUCH better (detailed, alive, polished, satisfying hover/press).
