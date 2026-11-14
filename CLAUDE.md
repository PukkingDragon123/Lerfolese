# Apple of Discord — project rules for Claude

## Art direction (current, from the user — newest decisions win)
- NEVER simple/lazy shapes as visible art: no plain spheres/cubes/cylinders/cones, no blobs stuck together, no round "AI slop" gradient shading, no circle textures.
- STYLE (USER, FINAL): REALISTIC LOW-POLY PIXEL ART for the WHOLE game. Sharp, clean low-poly geometry (faceted, flat-shaded, strong silhouettes, real anatomy/structure) with REALISTIC hand-made pixel-art textures and REALISTIC lighting. Keep THIN black ink outlines. NOT cartoony: no cartoon cel bands, no cartoon faces/eyes on creatures that shouldn't have them. Never voxel/Minecraft, never crude.
- (superseded by the realistic low-poly pixel-art rule above) colours harmonised like a painting, rich and saturated but natural.
- Artifacts, items, furniture and props: sharp very-low-poly with detailed pixel-art textures (same as everything now).
- LIGHTING: realistic (sun + sky fill, soft real shadows, bounce light, ambient occlusion, golden hour) with rich saturated colour; no cartoon cel bands.
- Rendering: high resolution and crisp (supersampled, no tilt-shift blur, no chromatic aberration, minimal grain).
- UI: every element is a detailed PHYSICAL object (3D thickness, bevels, pixel-art textures: wood, brass, parchment, wax, leather; lit, shadowed, springy). Never glowing DOM/HUD text, never flat rectangles. Text = ink, engraving, carving. Font: Alagard (assets/fonts/alagard.ttf) at 16/32/48 px.
- HERO: a real young Isaac Newton (20s, cool), built on the Limbo Phobia human engine (src/models/limbo, user's repo PukkingDragon123/fictional-octo-train). He levitates and fights with an orbiting apple. Animations must be fluid, human-like and procedural. No puppet/strings.
- Monsters: Greek mythology, custom rigs (src/models/beasts), weighted physical animations. Gore welcome (blood droplets, splatter, severed hydra heads).
- Combat feel: physical, minimal VFX (real attack animations, knockback, 3D debris and dust), magic as tasteful 3D shader effects plus a few fine polished pixel particles. No big low-res sprite FX.
- World: big detailed places (forest, pond, lake, village), wind, little animals, beautiful painted anime sky. Events are full cinematic cutscenes with visible characters.
- Map: big miniature diorama (enemy figurines, miniature trees, rivers, paths, fog, chests). Not chess pieces.
- Cards: hand-pixelled illustrations; backdrops are nature or space scenes; Laws/Force/Rotation art is magic effects, no hands.

## Game design (current)
- Start deck: 4 simple cards (Apple: eat to heal or use as matter; Force: + Apple = attack; Mass: heavier/buff; Motion: makes projectiles). Damage = mass x velocity.
- Prepare during your turn (camera zooms into Newton thinking); nothing fires until End Turn. Placed matter shows a 3D model; drag cards onto it; click flips 3D <-> card info. One objective: merge. Smart targeting.
- Roguelike depth: discovery offers 1 of 3 new cards; synergies AND anti-synergies; big multipliers from artifacts (e.g. Statues x3); odds and number play. Battle wins give only enemy loot. Hard difficulty.
- Enemy intents are thought bubbles. Skill element: a dodge QTE when enemies hit you (timed click reduces damage); the game is mostly about thinking.
- Meta: loading screen = 3D apple rotting with worms, rewinding to a seed. Menu = apple garden (two wooden signs with birds: New Run / Resume, an old mop dog that fetches thrown apples, birds) -> night sky with 3D astral UI, 4 character constellations (only Isaac playable) -> star gallery hub with a walkable achievement museum and a wizard frog who unlocks NEW CONTENT ONLY (artifacts, story stages, cards, events), never stat boosts.

## Story and presentation (current)
- Big storytelling: a narrator plus character VOICES via the browser Web Speech API (free; distinct voice/pitch/rate per character), with floating physical dialogue text. Events are full voiced cutscenes.
- PROLOGUE (first new game): kid Isaac learns from his MASTER in an old apple garden (cinematic, with choices) -> master gives his first card and teaches science and magic with interactive 3D constructs -> a FORBIDDEN APPLE appears in his slot, he uses it -> the sky falls apart, reality warps -> in blank white space a cosmic galactic figure of himself speaks and shows a new world where stories come alive -> he wakes in the new world, meets the old MOP DOG, meets his master in the STAR-VIEWING DOME -> adventure starts. Dying = being RECONSTRUCTED (cosmic reassembly), back to the dome.
- Combat has occasional STORY DILEMMAS (trade-off choices mid-fight). Combination depth is the heart: near-infinite combos, cloning, boosting chains ("X boosts Y when next to Z"), who finds the best combo.
- Artifacts look great and Isaac visibly WEARS or USES them (attached to his body).
- Fonts: Alagard for titles; assets/fonts/pack: PixelSans (body, dialogue, cards), NanoPlus (numbers/damage), RuneMono (magic/astral). ALWAYS HIGH-RESOLUTION text: render at integer multiples of native size, ~2x on-screen pixels at 1080p, crisp, never blurry or low-res.

## Workflow
- ASK THE USER FIRST (short question with options) before any big or ambiguous change or before launching agents; the user pays for every token.

## Tech
- Static site, three.js r170 vendored, ES modules, no build. Serve the repo root (`python3 -m http.server`).
- Tests: `node tools/sim.mjs 300` (rules); `node tools/play2.mjs "<url>?q=test" out.png 30000 "<actions @@-separated>"` (Playwright, long timeouts). Battle intro skip: `click:640:360@@key:Space@@wait:3000@@key:Space@@wait:15000`. Debug: `?battle=a,b&kind=elite`, `?node=event&event=icarus`, `&ink=1`.
- Hosted artifact: https://claude.ai/artifact/QV1BdMLkQoY2fbe5JLMmJ5 (.glb/.hdr ship as .b64.json via src/core/binfetch.js).
