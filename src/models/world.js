// Mythical Wilderness props (map diorama, event scenes) and the fallback stage, all from the stylized low-poly kit.
import * as THREE from 'three';
import * as S from './sculpt.js';
import * as LP from './lowpoly.js';
import { buildLowPolyStage } from './realworld.js';
import { TEX } from '../gfx/textures.js';
import { R } from '../gfx/palette.js';
import { mulberry32 } from '../core/util.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.85, ...o });
const mats = {};
const M = (k, fn) => (mats[k] ||= fn());
const mesh = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p?.add(o); return o; };
const I = () => new THREE.Matrix4();
// one merged faceted mesh wrapped in a group (callers scale / place the group)
const one = (fn, material = 'lp') => { const Me = new LP.Mesher(); fn(Me); const g = new THREE.Group(); const m = Me.build(material, { cast: material !== 'grass' }); if (m) g.add(m); return g; };

export const PROPS = {
  oliveTree(seed = 1, s = 1) { const g = one((Me) => LP.oliveTree(Me, I(), seed * 31 + 7)); g.scale.setScalar(s * 0.72); return g; },
  cypress(seed = 1, s = 1) { const g = one((Me) => LP.cypress(Me, I(), seed * 29 + 3, { h: 5 })); g.scale.setScalar(s * 0.8); return g; },
  rock(seed = 1, s = 1, kind = 'stone') { const g = one((Me) => LP.rock(Me, I(), seed * 13 + 1, { sx: 0.72, sy: 0.5, sz: 0.62, pal: kind === 'marble' ? LP.PAL.marble : LP.PAL.stone, moss: kind === 'moss' ? LP.PAL.moss : null })); g.scale.setScalar(s); return g; },
  column(seed = 1, h = 3.2, broken = false) { return one((Me) => LP.column(Me, I(), seed, { h, broken })); },
  amphora(seed = 1, s = 1) { return one((Me) => LP.amphora(Me, I(), seed, { s })); },
  statue(seed = 1, s = 1) {
    // a petrified would-be hero, mid-scream
    const g = new THREE.Group(); const st = M('statue', () => F({ map: TEX.noise('statue', R.stone.slice(2, 7), { scale: 0.3, seed: 8 }), roughness: 0.9 }));
    mesh(S.slab(0.8, 0.3, 0.8, { seed }), st, g, 0, 0.15, 0);
    for (const sx of [-1, 1]) mesh(S.limb(0.9, 0.11, 0.07, { sides: 6, seed: seed + sx }), st, g, sx * 0.13, 1.25, 0);
    mesh(S.turn([[0.001, 0], [0.24, 0.05], [0.28, 0.5], [0.2, 0.72], [0.001, 0.75]], { sides: 7, seed: seed + 3 }), st, g, 0, 1.2, 0);
    const head = mesh(S.blob(0.16, 0.19, 0.17, { detail: 1, seed: seed + 4 }), st, g, 0, 2.12, 0.02);
    mesh(S.slab(0.08, 0.1, 0.04, { seed }), M('dk', () => F({ color: 0x2e2a30 })), head, 0, -0.05, 0.15);
    const arm = mesh(S.limb(0.7, 0.08, 0.05, { sides: 6, seed: seed + 5 }), st, g, 0.3, 1.85, 0); arm.rotation.z = 2.4;
    const arm2 = mesh(S.limb(0.7, 0.08, 0.05, { sides: 6, seed: seed + 6 }), st, g, -0.3, 1.85, 0.1); arm2.rotation.set(-1.2, 0, -0.6);
    mesh(S.slab(0.1, 0.9, 0.05, { seed: seed + 7 }), st, g, 0.75, 2.4, 0).rotation.z = 0.5;
    g.scale.setScalar(s); return g;
  },
  mazeWall(len = 3, h = 2.2, seed = 1) { return one((Me) => LP.mazeWall(Me, I(), seed, { len, h })); },
  reeds(n = 40, w = 20, d = 6, seed = 2) { const rnd = mulberry32(seed); return one((G) => { for (let i = 0; i < Math.ceil(n / 5); i++) LP.reeds(G, (rnd() - 0.5) * w, 0, -2.5 - rnd() * d, rnd, { n: 6, h: 1.1 }); }, 'grass'); },
  firePit(seed = 3, s = 1) { const g = LP.firePit({ seed }); g.scale.setScalar(s); return g; },
};

// fallback stage (no renderer / env map): the same low-poly builder
export function buildStage(theme = 'meadow', seed = 1) { const st = buildLowPolyStage(theme, seed, null); return { group: st.group, theme: st.theme, trees: st.trees, sunDir: st.sunDir }; }
