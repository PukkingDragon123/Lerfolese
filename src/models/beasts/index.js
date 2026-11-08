// Custom-rigged beasts (own skeletons, sculpted skinned meshes, procedural animation): minotaur, minotaur_king,
// hydra, hydra_elder and the separate hydra_head enemy. createBeast returns the createCreature api shape.
import { createMinotaur } from './minotaur.js';

const BUILD = {
  minotaur: (s) => createMinotaur(s, false),
  minotaur_king: (s) => createMinotaur(s, true),
};
export const isBeast = (id) => id in BUILD;
export function createBeast(id, seed = 1) {
  const api = BUILD[id](seed);
  api.update(0.016); return api;
}
