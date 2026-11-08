// Mythical Wilderness props for events and the map, plus the fallback stage: the detailed CC0 models, toon-shaded.
// Each prop returns a Group at once and fills it when the model has loaded (callers place / scale the group).
import * as THREE from 'three';
import { realStage, toonModel, firePit as pit } from './realworld.js';
import { mulberry32 } from '../core/util.js';

const asyncProp = (name, s = 1, { y = 0, ry = 0 } = {}) => { const g = new THREE.Group(); g.name = name; toonModel(name, mulberry32(name.length * 7 + Math.round(s * 100))).then((o) => { o.scale.multiplyScalar(s); o.position.y = y; o.rotation.y = ry; g.add(o); }).catch(() => {}); return g; };

export const PROPS = {
  oliveTree(seed = 1, s = 1) { return asyncProp(seed % 2 ? 'olive_tree_wide' : 'olive_tree_tall', s * 0.62); },
  cypress(seed = 1, s = 1) { return asyncProp(`othonna_cerarioides#${seed % 7}`, s * 1.4); },
  rock(seed = 1, s = 1, kind = 'stone') { return asyncProp(`${kind === 'moss' ? 'rock_moss_set_01' : 'rock_moss_set_02'}#${seed % 6}`, s * 0.9); },
  column(seed = 1, h = 3.2, broken = false) { return asyncProp(`greek_column#${broken ? 1 + (seed % 2) : 0}`, 0.75 * (h / 3.2)); },
  amphora(seed = 1, s = 1) { return asyncProp(seed % 2 ? 'antique_ceramic_vase_01' : 'ceramic_vase_04', s * 2.2); },
  statue(seed = 1, s = 1) { return asyncProp(seed % 2 ? 'horse_statue_01' : 'marble_bust_01', s * (seed % 2 ? 3 : 3.4)); },
  mazeWall(len = 3, h = 2.2, seed = 1) { return asyncProp(`stone_wall_kit#${seed % 22}`, 0.35 * (h / 2.2)); },
  reeds(n = 40, w = 20, d = 6, seed = 2) { const g = new THREE.Group(); const rnd = mulberry32(seed); for (let i = 0; i < Math.ceil(n / 8); i++) { const r = asyncProp(rnd() < 0.5 ? 'nettle_plant' : 'fern_02', 1.6 + rnd()); r.position.set((rnd() - 0.5) * w, 0, -2.5 - rnd() * d); g.add(r); } return g; },
  firePit(seed = 3, s = 1) { const g = pit({ seed }); g.scale.setScalar(s); return g; },
};

// fallback stage (no renderer): the same detailed stage, filled in when its models arrive
export function buildStage(theme = 'meadow', seed = 1) {
  const g = new THREE.Group(); const st = { group: g, theme, trees: [], sunDir: new THREE.Vector3(-0.55, 0.62, 0.42).normalize() };
  realStage(theme, seed, null).then((r) => { g.add(r.group); st.trees.push(...r.trees); }).catch((e) => console.warn('fallback stage failed', e));
  return st;
}
