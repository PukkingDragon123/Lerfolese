# Apple of Discord — project rules for Claude

## Art direction (non-negotiable, from the user)
- NEVER use simple/lazy shapes as visible art: no plain circles/spheres, cubes/boxes, cylinders, cones or blobs stuck together.
- LATEST (overrides older notes): 3D assets AND environment = STYLIZED COOL LOW-POLY, "blocky but cool, not Minecraft, not realistic": faceted flat-shaded forms with real structure (trees with branches + faceted leaf clusters), hue-shifted vertex colours, magical medieval dusk mood. No photoreal PBR/HDRI look.
- UI (LATEST, user is furious about this): EVERY UI element must be a DETAILED PHYSICAL object (real 3D thickness/bevels, stylized low-poly forms, detailed low-res pixel-art textures: wood grain, brass engraving, parchment fibres, wax, leather stitching; lit, shadowed, springy). NEVER glowing text, NEVER floating DOM/HUD overlays, NEVER plain blocks/flat rectangles. Text = ink on parchment, engraved/stamped brass, carved/burnt wood, chalk on slate. Lighting = warm practicals + GTAO + camcorder grade.
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
