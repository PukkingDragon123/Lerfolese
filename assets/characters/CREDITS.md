# Character assets and sources

## Code ported from the user's own game
- `src/models/limbo/` is a port of the low-poly people generator from **Limbo Phobia** by PukkingDragon123
  (https://github.com/PukkingDragon123/fictional-octo-train, `src/entities/humanModel.ts`, `humanLooks.ts`, `gg/*`).
  TypeScript types were stripped mechanically; local changes: rounded 16- to 20-point cross-sections with bulging
  intermediate rings, smooth normals, flat cel base tones, a per-character paint hook, and three r170 compatibility.
  Used for the satyr, medusa and kobalos bodies.

## Models
| File | Source | Author | Licence |
| --- | --- | --- | --- |
| `bull_head.glb` | Poly Haven "Bull Head" (https://polyhaven.com/a/bull_head), plinth cut off, decimated to about 2.2k tris, texture removed and repainted at runtime | Tina | CC0 1.0 |

Sir Isaac Plumb (the broken wooden marionette, his table-leg arm and the spectral hand), the satyr's goat legs and tail,
medusa's serpent tail and snake hair, the kobalos' ears and sack, and every texture are generated in code
(`src/models/professor.js`, `creatures.js`, `charkit.js`).
