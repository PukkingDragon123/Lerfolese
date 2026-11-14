# Apple of Discord: 2D pixel-art bible

These are the rules for every 2D sprite in the game: critters, drawn objects, icons and particles.
All art is painted in code (deterministic, no image files) with `src/gfx/art/` on top of `PixelCanvas`.

## 0. Style direction (from the user; overrides anything below)

> "Lower resolution pixel art and geometric shape stylized, not AI slop circles."

The look is **low-res, geometric, faceted pixel art** in the spirit of Superbrothers: Sword & Sworcery, Hyper Light Drifter, Celeste and Downwell. Every pixel is deliberate, and the game upscales with nearest filtering.

**Resolution budget (about half of the first pass):**

| Asset | Size |
|---|---|
| Birds and critters | 32 px cells. Birds 18–28 px long. Sheep and goats about 26 px. Butterflies about 10 px. |
| Intent icons | 16x16 |
| Particles | 3–9 px, in 16 px atlas cells |
| UI objects | 48–64 px. The gauge is 64x70, with the needle 8x32 pivoting at (4, 27). |
| Curio icons | 32x32 |
| Map standees | 32–48 px tall (the guardian gate 64) |
| Field objects | 24–64 px |

**Geometric construction:**

- Build forms from bold, angular polygons: triangles, quads and faceted n-gons with straight edges. A curve becomes 3–6 straight segments.
- Even round things (an apple, a coin, a bird's head, a moon, a wheel) are stylized polygons (hexagons and octagons) with planar shading.
- Shade with flat colour planes. Each facet has a single colour picked by the facet's orientation to the key light (top-left), so light and shadow split along geometric facet edges, never along soft radial gradients.
- Use 3–5 colours per material: a shadow plane, a mid plane, a lit plane, and an optional accent or highlight shape (a small, hard-edged sliver or a single pixel).
- Silhouettes come first. Use deliberate graphic shapes (wedge tails, blade wings, diamond leaves, triangle flames) that read at 1x.
- Patterns are polygons too (a bib, a wing bar, stripes), with crisp edges and no noise.

**Banned:**

- Ellipse or capsule blob construction, and circles as primitive forms.
- Sphere-normal "pillow" or gradient shading, and soft radial falloffs.
- Noisy or ordered dithering, and procedural grain noise.
- Orphan pixels, "AI slop" smooth roundness and airbrushed bands.

**Detail, not bare shapes** (the user's follow-up): the target is a hand-pixelled gem-and-rock sheet. Objects are 32–48 px, rich in deliberate detail and never flat fills:

- Ramps have 5–7 tones with jewel saturation: cool violet shadows and warm yellow highlights (`GR` in `src/gfx/art/ramps.js`).
- Every facet edge on the lit side gets a 1 px ridge highlight (the painter's `ridge` option), and every object gets one hard specular glint.
- Outlines are dark and tinted per material, never pure black.
- Texture is hand-placed inside the material's own ramp: cracks with a lit lip (`P.crack`), wood grain streaks (`grainLines`), sparse speckle pits on stone, sacks and gears (`P.speckle`), wool curls, coat strokes, engraved symbols and veins (`P.shift` / `P.shiftLine`).

**Toolkit:** `src/gfx/art/geo.js` provides polygon masks, regular n-gons, blades and wedges, and the `roof()` facet normals. `roof()` gives every edge of a polygon its own bevel plane, with an optional flat table on top, like a cut gem or a low-poly model. The painter turns those planes into flat ramp colours with sel-out outlines.

## References

- Slynyrd, Pixelblog 1: Color Palettes (hue-shifted ramps): https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes
- Slynyrd, Pixelblog 6: Light and Shadow: https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow
- Slynyrd, Pixelblog 10: Water in Motion: https://www.slynyrd.com/blog/2018/10/12/pixelblog-10-water-in-motion
- Slynyrd, Pixelblog 13: Rocks: https://www.slynyrd.com/blog/2019/1/22/pixelblog-13-rocks
- Slynyrd, Pixelblog 25: Motion Cycles (bird flight, quadruped walk): https://www.slynyrd.com/blog/2020/1/23/pixelblog-25-motion-cycles
- Arne Niklas Jansson, Pixel art tutorial (outlines, AA, clusters, banding, pillow shading): https://www.androidarts.com/pixtut/pixelart.htm
- Pedro Medeiros (Saint11), pixel art tutorials (AA, clusters, wings and flying): https://saint11.art and https://medium.com/pixel-grimoire
- Animation Mentor, How to animate birds in flight: https://www.animationmentor.com/blog/tutorial-how-to-animate-birds-in-flight/
- Tuts+, Create a flight animation from scratch: https://design.tutsplus.com/tutorials/create-a-flight-animation-from-scratch-in-adobe-photoshop--cms-22739
- Lospec tutorials index: https://lospec.com/pixel-art-tutorials

## 1. Light

- One key light for all 2D art: from the **top-left, slightly in front** (`L = (-0.6, -0.7, 0.45)`). Highlights sit top-left, core shadows and cast shadows fall bottom-right.
- Every form has five readable zones: highlight, light, terminator (core shadow), reflected light (a warm ground bounce on the lower right rim, never as bright as the light side), cast or contact shadow.
- Add a 1–3 px cast shadow wherever a part overlaps another (wing on body, lid on crate, rope on sack). This contact shadow is the cheapest, strongest depth cue.
- Outdoors, shadows lean cool (blue or violet) and lights lean warm (yellow). Fire and magic objects carry their own local light.

## 2. Color ramps

- Ramps are 5–8 colours from dark to light, with **hue shifting**. Toward the light the hue rotates toward yellow; toward the dark it rotates toward blue or violet, by about 10–20° per step (Slynyrd uses +20°).
- Saturation peaks in the middle of the ramp. It drops at the bright end, and is a little lower at the dark end. Never put pure black or pure white inside a ramp. Pure white is reserved for one-pixel specular glints and catchlights.
- Keep few colours per material: 4–5 for a matte material, 6–7 for metal. Do not use long, fully saturated ramps.
- Materials that touch must differ in value or in hue, so that the parts separate without a line.

## 3. Shading (planar)

- Faceted planes only (see section 0). The rules below apply facet by facet.
- **No pillow shading.** Never darken a form toward all of its edges equally. Shade from the light direction: the lit edge stays light up to the silhouette, the shadow side gets the terminator and then reflected light.
- Use clean bands, not gradients. A band of colour ends crisply against the next one, and the band edge follows the form (a crescent on a sphere, a straight stripe on a cylinder).
- No dithering. Express texture with a few deliberate geometric marks (a crack as a 2-segment line, a wood seam, a wing bar).
- **Clusters.** Group pixels into readable clumps. No orphan pixels: a pixel that matches none of its four neighbours is noise, unless it was placed on purpose (a glint, a catchlight, a rivet). An automatic cluster clean-up pass runs after procedural shading.
- Avoid banding artefacts, where two band edges run parallel at equal width. Offset band edges, or let a texture break them up.

## 4. Lines and edges

- **Selective outlines (sel-out).** The outline takes the darkest, hue-shifted shade of the material it touches, never flat black. The lit top-left edges get a lighter outline (or none on glowing objects); the bottom-right edges get the darkest one.
- The ground contact edge keeps a dark line, which also reads as a contact shadow.
- Internal lines appear only where a front part overlaps a back part. They are drawn on the back part, one or two shades darker than its fill, never pure black.
- **Manual anti-aliasing**: lines and curves use consistent step lengths (1-1-2-3 or 2-1-2). Where a step looks jagged, add an intermediate colour on the inside corner, one pixel at a time. Never blur.
- No doubles: a 1 px line stays 1 px, and its corners touch diagonally rather than forming L-shapes.

## 5. Silhouette and readability

- Design the silhouette first. Each sprite must be identifiable as a solid black shape at 1x: a beak, a tail fork, horns, a hanging rope or a handle should break the outline.
- Every sprite needs a clear main mass, secondary shapes and small accents. Build each mass as an angular polygon: a barrel is an octagonal prism, a boulder is a cut gem of planes, a basket is a flaring trapezoid.
- Value hierarchy: the brightest values and the highest contrast go to the focal point (an eye, a glint, the flame core).
- Icons are square (16–24 px), have a dark 1 px outline, one strong highlight and at most about 5 colours, so they read at small size.

## 6. Animation

- **Key poses first** (extremes), then the in-betweens. Every cycle loops seamlessly.
- **Bird flight** (8 frames): wings fully up, three downstroke frames (spread wide, working stroke, wing tips lag behind and curl), bottom pose, three upstroke frames (wrist folds, primaries trail back, a tight recovery stroke). The body rises on the downstroke and sinks on the upstroke (1–2 px), and the head counters slightly. Glide pose: wings spread in a shallow V. Small birds also tuck their wings between bursts of flaps (bounding flight).
- **Perched idle**: a 1 px breathing swell, blinks, a head turn (look), a peck, and a crouch-and-hop frame used as anticipation.
- **Quadruped walk** (4 frames): diagonal leg pairs alternate. The back leg follows one step behind the front leg on the opposite side, and front and back legs travel the same distance. The body rises 1 px on each passing pose and the head nods against the body.
- **Anticipation and follow-through**: a hop crouches first; a tail or crest settles one frame after the body; flames lick up and detach; an arc flickers and then fades.
- **Sub-pixel motion**: show sub-pixel motion by changing colour on edge pixels (breathing, flame bases, water glints) rather than moving whole shapes by 1 px every frame.
- Fire, electricity and water loop in 3–6 frames, and each frame changes shape rather than colour only.

## 7. Materials

| Material | How to render it |
|---|---|
| **Brass / bronze** | High-contrast ramp (dark olive-brown to warm gold to cream). Sharp specular streaks that follow the curvature: vertical on cylinders, curved crescents on domes. Reflect the dark environment as a dark band beside the highlight. One white glint, plus a warm bounce on the lower rim. |
| **Iron / steel** | Cool blue-grey ramp, a narrow specular line, worn and lighter edges. Rivets are 2x2 with a top-left highlight pixel. |
| **Wood** | Warm brown ramp. Grain runs along the length as broken 1 px darker lines, with knots as small ovals. Planks are separated by a dark seam and a light bevel on the top-left edge. End grain shows rings. Hue shifts to violet-brown in shadow. |
| **Leather** | Rich brown-red, low specular, soft broad highlights on folds and stitched seams (a row of light dashes). Creases are a dark line with a light line below it. |
| **Wicker** | Over-under weave: each strand is a little cylinder (light top, dark lower edge). Rows alternate their offset, and the gaps between strands are the darkest shade. The rim is braided. |
| **Stone** | Planar facets: each plane gets a flat value according to the light, with the edges between planes crisp. Cracks are dark lines with a light lip on the lit side. Sparse speckle dither for grain, moss on the top (lit) faces only. |
| **Water** | Dark, saturated depth colour. The surface reflects the sky, with a brighter band toward the far edge. Highlights are short horizontal dashes. Ripples are concentric broken ellipses. The edge has a wet, darker rim and a 1 px light lip. |
| **Fire** | A white-yellow core, then yellow, orange, red and a dark red edge. Tongues are teardrop shapes that taper upward and detach as embers. It is its own light source: no outline, or a dark-red outline only at the base. |
| **Feathers** | Grouped as marginal and lesser coverts (scalloped rows), greater coverts, secondaries and primaries. Each feather has a light leading edge and a dark trailing edge. Primaries are separated at the tips on the downstroke. |
| **Wool** | Clustered curls, each a small lit bump (light top-left, shadow bottom-right). The silhouette is bumpy, never a smooth ellipse. Warm white light and lilac-grey shadows. |
| **Glass** | Mostly shows what is behind it, tinted. Strong, sharp specular shapes (window highlights) and a bright rim on the shadow side (refraction). |
| **Cloth** | Folds with soft two-tone bands, the hem darker, with seams and patterns that follow the folds. |
| **Paper** | Warm off-white. Creases are drawn as planes (light and dark facets), never as noise. |

## 8. Process checklist (every sprite)

1. Silhouette pass at 1x: is it readable and unique?
2. Flat colours per material, then form shading from the top-left key light, then cast shadows.
3. Texture (grain, weave, feathers) only inside the existing value bands.
4. Clean-up pass: no orphan pixels, no doubles, no jaggies on curves.
5. Selective outline, then highlights and glints last.
6. Check at 1x and at 4x on a light background, a dark background and in the scene.

## 9. VFX flipbooks and the sky sun

The source is `src/gfx/art/vfxart.js`, and `src/gfx/vfx.js` plays the flipbooks.

- **Anime and cartoon punch.** Use hard polygon shapes (spiky starbursts, broken rings, blade shards, crescent smears) in 3–4 flat tones, with **black or very dark outlines** (`#0b0710`).
- **Frame grammar.** Each flipbook runs in this order: anticipation pinpoint, then an impact frame (heavy and critical hits get an inverted ink frame first, then a white flash), then the big shape, then the follow-through (the ring breaks and shards fly), then the dissipation (sparks). Slashes use smear crescents that grow and then thin out.
- **Sizes.** Strips are 32–64 px square frames with 6–10 frames each, at 14–24 fps, played on a per-render clamped clock so hit-stop and slow frames never skip the key frames.
- **The sun.** The sun is an 80 px faceted disc with 16 breathing rays, a halo of dots and a rotating highlight sliver (6 shimmer frames). It sits as a far billboard along the sky dome's sun direction.

## 10. Combat feedback: physical first, magic in 3D, pixel particles as seasoning

This section follows the user's latest direction and overrides section 9 for the battle. The sprite flipbooks in `vfx.js` and `vfxart.js` remain available, but the battle no longer calls them, except for the 2D sun.

- **Physical impact** (`src/gfx/fx3d.js`):
  - Instanced 3D debris of what actually hit (apple pieces with skin and flesh, stone shards, wood splinters, water droplets) tumbles, bounces under gravity, settles and shrinks away.
  - Dust is kicked up from the ground.
  - The target is knocked back with a spring offset, a lean-back tilt and a stagger dip.
  - Camera shake and hit-stop stay modest.
- **Choreography:** enemies show anticipation (a lean back), then a fast lunge; the hit lands at the apex, then they follow through and recoil to their slot. Sir Isaac throws or casts through `prof.act`.
- **Gore** (medieval storytelling, dark crimson to near-black, never pink):
  - Flesh hits spray instanced blood droplets stretched along their velocity. They land as splatter decals that persist and darken over about 30 s.
  - Heavy hits spurt an arc of blood and leave gash decals parented to the creature.
  - Deaths spread a blood pool. Hydra heads drop and bounce while the stump sprays.
  - Sir Isaac is wood: he splinters, puffs sawdust and sheds flakes of coat paint.
  - Medusa sheds stone chips. The satyr sprays wine as well as blood.
- **Magic** applies to energy, elemental and law moves and to casts only. It uses short additive shader meshes: an animated ground rune decal, swirling ribbon tubes, a fresnel orb, flickering branching 3D lightning, layered noise flames and a gravity swirl.
- **2D pixel art** in combat is limited to small, crisp particles (sparks, embers, motes, dust, leaves) at about 1 art pixel to 2 screen pixels.

## 11. HD-2D surfaces (3D world in pixel-art textures)
- Every world texture is hand-built pixel art: `src/gfx/art/tiles.js` (seamless ground, walls, wood, thatch, roof tiles, bark, water, smoke puff, laundry), `src/gfx/art/leaves.js` (64px leaf-spray cards per species), `src/gfx/art/plants.js` (grass / flower / reed / bush sprites, 5 wind frames). THREE wrappers with NearestFilter (mipmapped far away) live in `src/gfx/pixeltex.js`.
- Texel density targets: ~0.024 world units per art pixel for plants and leaves, ~0.03-0.04 for walls and ground.
- Never soft blends: alpha edges (arena patch, road, lane) are cut with a per-texel hash threshold (`ditherAlpha` in realworld.js); splat transitions use the same dither; water patterns are evaluated on a pixel grid.
- Cel lighting bands still apply on top (MeshToon + gradient maps); creatures get clustered 3D-grid detail in their paint (fur flecks, lit scale rims), Newton's coat a wool twill and his waistcoat a damask diamond (`pixelCloth` in professor.js).

## 12. Realistic low-poly + realistic light (current rule)
- No cel bands: `src/gfx/lowpoly.js` (imported by the engine) turns three's toon gradient into plain Lambert diffuse, so every MeshToonMaterial is lit realistically by the stage rig. Gradient maps are ignored.
- Light rig: `src/gfx/lighting.js` `stageLights()` places a golden-hour sun with a PCF-soft shadow frustum fitted round the action, a sky/ground hemisphere, a warm ground bounce and a cool sky fill, with per-theme looks. `ContactShadows` adds pixel-banded contact shadows under characters. The grade presets (`GRADE_DAY`, `GRADE_TRAVEL`, `GRADE_MAP`) give rich, natural colour: vibrance, selective green/gold/sky boosts, skin protected, no saturation pull.
- Geometry: faceted and flat-shaded. To convert any model call `lowpolyify(obj, { detail })` (0 coarse .. 1 fine). It decimates by vertex clustering, keeps each corner's UVs and gives every cluster one set of skin weights, so skinned meshes still animate. `flatten(obj)` only switches to flat shading.
- Limbo humans: pass `lowpoly: true` to `LimboBody` for octagonal rings with at most one bulge ring per segment (Newton uses it).
- Ink outlines stay, but thin (about 1 screen px).
