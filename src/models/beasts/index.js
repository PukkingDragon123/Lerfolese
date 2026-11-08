// Custom-rigged beasts (own skeletons, sculpted skinned meshes, procedural animation): minotaur, minotaur_king,
// hydra, hydra_elder and the separate hydra_head enemy. createBeast returns the createCreature api shape.
import { createMinotaur, warmMinotaur } from './minotaur.js';
import { createHydra, createHydraHead, warmHydra } from './hydra.js';

const BUILD = {
  minotaur: (s) => createMinotaur(s, false),
  minotaur_king: (s) => createMinotaur(s, true),
  hydra: (s) => createHydra(s, false),
  hydra_elder: (s) => createHydra(s, true),
  hydra_head: (s) => createHydraHead(s),
};
export const isBeast = (id) => id in BUILD;
export function createBeast(id, seed = 1) {
  const api = BUILD[id](seed);
  api.update(0.016); return api;
}
/** optional: pre-build a beast's sculpt, skin and textures (about 1-2 s of main-thread work) before its battle starts */
export function warmBeast(id) { if (id.startsWith('minotaur')) warmMinotaur(id === 'minotaur_king'); else if (id.startsWith('hydra')) warmHydra(id === 'hydra_elder'); }
