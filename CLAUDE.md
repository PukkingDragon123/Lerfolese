# Apple of Discord — project rules for Claude

## Art direction (non-negotiable, from the user)
- NEVER use simple/lazy shapes as visible art: no plain circles/spheres, cubes/boxes, cylinders, cones or blobs stuck together.
- LATEST (overrides everything older): NEVER LOW-POLY. 3D = DETAILED smooth models with real structure (trees with real branches and many leaves, detailed props, smooth organic characters), rendered ANIME/CARTOON: cel/toon shading with 2–4 hard bands + black ink outlines. Not photoreal, not faceted, not voxel.
- UI (LATEST, user is furious about this): EVERY UI element must be a DETAILED PHYSICAL object (real 3D thickness/bevels, smooth bevelled detailed forms (never low-poly), detailed pixel-art textures: wood grain, brass engraving, parchment fibres, wax, leather stitching; lit, shadowed, springy). NEVER glowing text, NEVER floating DOM/HUD overlays, NEVER plain blocks/flat rectangles. Text = ink on parchment, engraved/stamped brass, carved/burnt wood, chalk on slate. Lighting = warm practicals + GTAO + camcorder grade.
- Look: anime/cartoon BLACK INK OUTLINES on all 3D (engine InkPass, src/core/ink.js); clean cel-like banded textures.
- (superseded) Map living layer: removed per user; NO TREES or grass on the map.
- Humans may reuse the user's Limbo Phobia human generator (repo PukkingDragon123/fictional-octo-train).
- ENVIRONMENT (LATEST): REALISTIC and absolutely beautiful (PBR, golden light, gorgeous sky with sun rays, wind, little animals, polished road); env meshes noInk (outlines only on characters). Cinematic travel: Sir Isaac walks the road in, enemies revealed cinematically; events are full 3D cinematic scenes with physical text-choice pop-ups.
- Presentation: MEDIEVAL STORYTELLING (illuminated-manuscript storybook / puppet theatre): sun and moon WITH FACES (personified, gilded), lapis manuscript sky with curly medieval clouds, layered painted backdrops (castles, towns, stepped mountains), chapter cards with drop caps. Gore welcome: physical blood droplets, splatter decals, severed hydra heads; Sir Isaac splinters (wood), never bleeds.
- Rendering: HIGH RESOLUTION and CRISP: no tilt-shift blur, no chromatic aberration, minimal grain; supersampled. Card backdrops = detailed nature or space scenes, no cartoon effects.
- Map = realistic physical map on a table with chess-inspired pieces as nodes (pawn/knight/bishop/rook/king), no grass/plants.
- Sir Isaac = WIZARD-WARRIOR (battle-mage class) BROKEN jointed wooden marionette with a REALISTIC carved face (true anatomy, realistic eyes; never cartoon) and realistic flowing hair; no spheres or round blobs (cracks, nails, twine, one arm is a TABLE LEG), moved by a magical translucent INVISIBLE HAND holding the control cross with glowing strings. COMBAT FEEL (LATEST): physical, minimal VFX: real attack animations (anticipation, lunge, strike, follow-through, knockback), 3D debris and dust, magic only as tasteful 3D shader effects, plus a few small super-polished fine pixel particles. NO big low-res sprite effects, CRIT sprites, speed lines or sprite smoke balls.
- Card art for Laws/Powers, Rotation, Force: magical effects (sigils, vortices, arcs), NO hands.
- Draw CUSTOM art yourself: detailed high-resolution pixel art (shading ramps, selective outlines, highlights, animation frames), like `src/gfx/critters.js` birds and the card illustrations, and/or detailed high-poly models with real structure (trees with branches and leaves).
- Style: HD-2D. Detailed 3D world plus detailed 2D pixel-art life and objects.
- Characters, monsters and the game look: PROJECT ZOMBOID style, but more realistic and detailed. Low-poly meshes with correct human/creature anatomy (a proper base mesh, never primitives stuck together), carrying detailed painted 2D textures (faces, clothes, skin, fur, scales). Sir Isaac is a wooden marionette in that style.
- Pixel art = DETAILED hand-placed pixel art at LOW resolution (like the user's gem/rock reference sheet: ~32–48px objects, 5–7-tone hue-shifted ramps, crisp highlights/glints, tinted outlines, clean clusters, texture detail). NOT high-res images, NOT downscaled 3D renders, NOT crude shape fills.
- Pixel art: LOWER resolution (chunky pixels), GEOMETRIC stylized shapes (angular facets, flat colour planes, 3–5 colours per material, hard light/shadow splits, strong silhouettes; refs: Sword & Sworcery, Hyper Light Drifter, Celeste). NO round blob / pillow / gradient "AI slop" shading.
- UI is physical but custom-drawn: pixel-art objects presented in 3D (lit, shadowed, springy), not primitive meshes.

## Tech
- Static site, three.js r170 vendored, ES modules, no build. Serve the repo root (`python3 -m http.server`).
- Tests: `node tools/sim.mjs 300` (rules); `node tools/play.mjs "<url>?q=test" out.png 9000 "<actions @@-separated>"` (Playwright, fast mode).
