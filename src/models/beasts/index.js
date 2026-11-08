// Custom-rigged beasts (own skeletons, sculpted skinned meshes, procedural animation): minotaur, minotaur_king,
// hydra, hydra_elder and the separate hydra_head enemy, plus the Greek bestiary built on kit.js: harpy, centaur,
// wolf (Hound of Artemis), spartoi, cyclops, chimera and talos. createBeast returns the createCreature api shape.
import { createMinotaur, warmMinotaur } from './minotaur.js';
import { createHydra, createHydraHead, warmHydra } from './hydra.js';
import { createCyclops, warmCyclops } from './cyclops.js';
import { createTalos, warmTalos } from './talos.js';
import { createWolf, warmWolf } from './wolf.js';
import { createChimera, warmChimera } from './chimera.js';
import { createCentaur, warmCentaur } from './centaur.js';
import { createHarpy, warmHarpy } from './harpy.js';
import { createSpartoi, warmSpartoi } from './spartoi.js';

const BUILD = {
  minotaur: (s) => createMinotaur(s, false),
  minotaur_king: (s) => createMinotaur(s, true),
  hydra: (s) => createHydra(s, false),
  hydra_elder: (s) => createHydra(s, true),
  hydra_head: (s) => createHydraHead(s),
  cyclops: (s) => createCyclops(s),
  talos: (s) => createTalos(s),
  wolf: (s) => createWolf(s),
  chimera: (s) => createChimera(s),
  centaur: (s) => createCentaur(s),
  harpy: (s) => createHarpy(s),
  spartoi: (s) => createSpartoi(s),
};
export const isBeast = (id) => id in BUILD;
export function createBeast(id, seed = 1) {
  const api = BUILD[id](seed);
  api.update(0.016); return api;
}
/** optional: pre-build a beast's sculpt, skin and textures (about 1-2 s of main-thread work) before its battle starts */
const WARM = { cyclops: warmCyclops, talos: warmTalos, wolf: warmWolf, chimera: warmChimera, centaur: warmCentaur, harpy: warmHarpy, spartoi: warmSpartoi };
export function warmBeast(id) { if (id.startsWith('minotaur')) warmMinotaur(id === 'minotaur_king'); else if (id.startsWith('hydra')) warmHydra(id === 'hydra_elder'); else WARM[id]?.(); }
