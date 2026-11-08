// Custom-rigged beasts (own skeletons, sculpted skinned meshes, procedural animation): minotaur, minotaur_king,
// hydra, hydra_elder and the separate hydra_head enemy. createBeast returns the createCreature api shape.
import { createMinotaur } from './minotaur.js';
import { createHydra, createHydraHead } from './hydra.js';

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
