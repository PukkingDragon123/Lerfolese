# Apple of Discord — project rules for Claude

## Art direction (non-negotiable, from the user)
- NEVER use simple/lazy shapes as visible art: no plain circles/spheres, cubes/boxes, cylinders, cones, blobs, or low-poly/faceted geometry.
- Draw CUSTOM art yourself: detailed high-resolution pixel art (shading ramps, selective outlines, highlights, animation frames), like `src/gfx/critters.js` birds and the card illustrations, and/or detailed high-poly models with real structure (trees with branches and leaves).
- Style: HD-2D. Detailed 3D world plus detailed 2D pixel-art life and objects.
- Characters: REALISTIC (not anime): realistic faces, anatomy and proportions, high-poly, high-resolution realistic textures. Sir Isaac is a realistically carved and painted wooden marionette.
- UI is physical but custom-drawn: pixel-art objects presented in 3D (lit, shadowed, springy), not primitive meshes.

## Tech
- Static site, three.js r170 vendored, ES modules, no build. Serve the repo root (`python3 -m http.server`).
- Tests: `node tools/sim.mjs 300` (rules); `node tools/play.mjs "<url>?q=test" out.png 9000 "<actions @@-separated>"` (Playwright, fast mode).
