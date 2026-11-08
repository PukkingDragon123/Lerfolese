// Talos: the bronze automaton of Crete (3.4 m). Humanoid template sculpted as hammered bronze plates whose seams glow
// with ichor-fire, a crested helm-head with slit eyes and a grilled mouth, a furnace core in the chest, and the single
// glowing vein running from the nape down the spine and the right leg to the bronze nail at the ankle. Attack: a
// double-fisted hammer slam. Death: the fire drains from every seam and he pitches forward onto his face.
import { THREE, K, hex, humanRows, sculptHuman, asset, createGeneric, add } from './kit.js';

const H = 3.4;
const BONES = humanRows(H, { sw: 1.2, hw: 1.1 });
const BRONZE = { s: 'metal', c: hex('#8e6436'), me: 0.6, ro: 0.3, seam: 0.0042, glowC: [255, 170, 60], e: [210, 92, 20] };
const PAL = {
  bronze: BRONZE, face: { ...BRONZE, c: hex('#a8783e'), seam: 0 }, crest: { ...BRONZE, c: hex('#6e4a26'), seam: 0 }, brow: { ...BRONZE, c: hex('#7a5630'), seam: 0 },
  eyeglow: { s: 'dark', c: hex('#ffd060'), e: [255, 190, 70] }, slot: { s: 'dark', c: hex('#ff9030'), e: [255, 120, 30] }, core: { s: 'dark', c: hex('#ffb040'), e: [255, 150, 40] },
  vein: { s: 'dark', c: hex('#ffcf5a'), e: [255, 170, 50] }, nail: { ...BRONZE, c: hex('#e8b060'), seam: 0 }, default: BRONZE,
};
function sculpt(S) {
  const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
  sculptHuman(S, J, H, { bulk: 1.3, tags: { body: 'bronze' } });
  // helm head: domed skull, face plate, crest fin, slit eyes, grilled mouth, jaw plate
  S.blob([0, 3.15, 0.04], [0.15, 0.165, 0.17], 'head', { k: 0.04, tag: 'bronze', imp: 3 });
  S.blob([0, 3.08, 0.12], [0.14, 0.14, 0.11], 'head', { k: 0.03, tag: 'face', imp: 3 });
  S.box([0, 3.28, 0.0], [0.016, 0.08, 0.21], 0.012, 'head', { k: 0.02, tag: 'crest', rot: [0.12, 0, 0] });
  S.blob([0, 3.155, 0.2], [0.13, 0.03, 0.06], 'head', { k: 0.015, tag: 'brow', imp: 4 });
  S.limb([0, 3.14, 0.23], [0, 3.06, 0.265], 0.018, 0.026, 'head', { k: 0.012, tag: 'face', imp: 4 });
  S.sym((s) => { S.blob([0.055 * s, 3.115, 0.215], [0.042, 0.016, 0.02], 'head', { k: 0.005, tag: 'eyeglow', dir: [0.3 * s, 0, 1], imp: 4 }); S.blob([0.14 * s, 3.1, 0.06], [0.03, 0.08, 0.06], 'head', { k: 0.02, tag: 'face' }); S.blob([0.08 * s, 3.07, 0.19], [0.04, 0.03, 0.04], 'head', { k: 0.02, tag: 'face' }); });
  S.box([0, 3.015, 0.235], [0.04, 0.005, 0.02], 0.003, 'head', { k: 0.004, tag: 'slot', sub: true });
  S.blob([0, 2.975, 0.1], [0.12, 0.055, 0.1], 'jaw', { k: 0.02, tag: 'bronze', imp: 3 });
  // furnace core, neck rings, the vein and the ankle nail
  S.blob([0, 2.47, 0.28], [0.1, 0.1, 0.045], 'spine3', { k: 0.02, tag: 'core' });
  for (const y of [2.78, 2.86]) S.blob([0, y, 0.01], [0.16, 0.025, 0.15], 'neck', { k: 0.015, tag: 'bronze' });
  S.chain([[0, 2.78, -0.17], [0, 2.4, -0.29], [0, 2.05, -0.27], [-0.1, 1.72, -0.24], [-0.23, 1.35, -0.2], [-0.27, 0.95, -0.12], [-0.29, 0.6, -0.17], [-0.29, 0.25, -0.12]], [0.03, 0.03, 0.03, 0.03, 0.03, 0.028, 0.026, 0.026], ['neck', 'spine3', 'spine2', 'hips', 'thigh_R', 'shin_R', 'shin_R', 'foot_R'], { k: 0.012, tag: 'vein' });
  S.limb([-0.29, 0.23, -0.18], [-0.29, 0.23, -0.1], 0.04, 0.04, 'foot_R', { k: 0.01, tag: 'nail' });
}
const A = () => asset('talos', { bones: BONES, sculpt, pal: PAL, cell: 0.025, target: 14000, atlas: 768, maxChart: 0.06, woundScale: 2, woundSkip: ['eyeglow', 'slot', 'core', 'vein'] });

const CLIPS = {
  attack: [[0, {}],
    [0.4, { _pos: [0, 0.06, -0.15], hips: [-0.1, 0, 0], spine1: [-0.14, 0, 0], spine2: [-0.16, 0, 0], spine3: [-0.14, 0, 0], neck: [-0.1, 0, 0], head: [-0.2, 0, 0], uparm_L: [-2.7, 0, -0.15], uparm_R: [-2.7, 0, 0.15], forearm_L: [-0.9, 0, 0], forearm_R: [-0.9, 0, 0], thigh_L: [-0.25, 0, 0], shin_L: [0.25, 0, 0], thigh_R: [0.15, 0, 0] }],
    [0.52, { _pos: [0, -0.16, 0.3], hips: [0.18, 0, 0], spine1: [0.3, 0, 0], spine2: [0.28, 0, 0], spine3: [0.18, 0, 0], neck: [0.1, 0, 0], head: [0.15, 0, 0], uparm_L: [-1.2, 0, -0.2], uparm_R: [-1.2, 0, 0.2], forearm_L: [-0.1, 0, 0], forearm_R: [-0.1, 0, 0], thigh_L: [-0.8, 0, 0], shin_L: [0.8, 0, 0], thigh_R: [0.3, 0, 0], shin_R: [0.3, 0, 0] }],
    [0.66, { _pos: [0, -0.2, 0.32], hips: [0.22, 0, 0], spine1: [0.34, 0, 0], spine2: [0.3, 0, 0], spine3: [0.2, 0, 0], neck: [0.12, 0, 0], head: [0.18, 0, 0], uparm_L: [-1.0, 0, -0.2], uparm_R: [-1.0, 0, 0.2], forearm_L: [-0.05, 0, 0], forearm_R: [-0.05, 0, 0], thigh_L: [-0.85, 0, 0], shin_L: [0.85, 0, 0], thigh_R: [0.32, 0, 0], shin_R: [0.32, 0, 0] }],
    [1.0, {}]],
  cast: [[0, {}], [0.35, { spine2: [-0.12, 0, 0], spine3: [-0.14, 0, 0], head: [-0.3, 0, 0], jaw: [0.3, 0, 0], uparm_L: [-0.3, 0, 0.8], uparm_R: [-0.3, 0, -0.8], forearm_L: [-0.9, 0, 0], forearm_R: [-0.9, 0, 0] }], [0.9, { spine3: [-0.08, 0, 0], head: [-0.15, 0, 0], uparm_L: [-0.2, 0, 0.5], uparm_R: [-0.2, 0, -0.5] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0, -0.16], spine1: [-0.1, 0.06, 0.04], spine2: [-0.14, 0.1, 0.04], head: [-0.3, 0.35, 0.15], uparm_L: [0.3, 0, 0.3], uparm_R: [-0.3, 0, -0.5], forearm_R: [-0.8, 0, 0], thigh_R: [0.3, 0, 0], shin_R: [0.25, 0, 0] }], [0.32, { spine1: [0.05, 0, 0], head: [0.08, -0.12, 0] }], [0.65, {}]],
  die: [[0, {}], [0.25, { spine2: [-0.2, 0, 0], head: [-0.35, 0.2, 0], uparm_L: [0, 0, 0.4], uparm_R: [0, 0, -0.4], thigh_R: [0.25, 0, 0] }],
    [0.5, { hips: [0.2, 0, 0], spine1: [0.2, 0, 0], head: [0.3, 0, 0], thigh_L: [-1.1, 0, 0], thigh_R: [-1.0, 0, 0], shin_L: [1.5, 0, 0], shin_R: [1.4, 0, 0], uparm_L: [-0.8, 0, 0], uparm_R: [-0.8, 0, 0] }],
    [0.9, { hips: [0.1, 0, 0], spine1: [0.1, 0, 0], head: [-0.4, 0.3, 0], thigh_L: [-0.6, 0, 0], thigh_R: [-0.5, 0, 0], shin_L: [0.6, 0, 0], shin_R: [0.5, 0, 0], uparm_L: [-2.6, 0, -0.3], uparm_R: [-2.6, 0, 0.3] }]],
};
const SPEC = {
  id: 'talos', bones: BONES, height: H, asset: A, blood: [0.75, 0.28, 0.03], clips: CLIPS, impact: 0.52,
  follow: { head: [26, 0.5] },
  idle(P, t, st) {
    const br = Math.sin(t * 0.9), sw = Math.sin(t * 0.45); const look = Math.round(Math.sin(t * 0.35) * 4) / 4; // the head ratchets as it scans
    add(P, 'hips', 0, sw * 0.02); add(P, 'spine2', br * 0.02); add(P, 'spine3', 0.04 + br * 0.015); add(P, 'neck', 0.04, look * 0.12); add(P, 'head', -0.04, look * 0.14);
    add(P, 'uparm_L', 0.02 + br * 0.015, 0, -0.18); add(P, 'uparm_R', 0.02 + br * 0.015, 0, 0.18); add(P, 'forearm_L', -0.35); add(P, 'forearm_R', -0.35);
    add(P, 'thigh_L', -0.04, 0, -0.03); add(P, 'thigh_R', -0.04, 0, 0.03); add(P, 'shin_L', 0.06); add(P, 'shin_R', 0.06); add(P, 'jaw', st.talk > 0 ? Math.abs(Math.sin(t * 12)) * 0.15 : 0);
  },
  gait(P, g, a) { add(P, 'thigh_L', Math.sin(g) * 0.45 * a); add(P, 'thigh_R', -Math.sin(g) * 0.45 * a); add(P, 'shin_L', Math.max(0, Math.cos(g)) * 0.5 * a); add(P, 'shin_R', Math.max(0, -Math.cos(g)) * 0.5 * a); },
  death(T, model, ctx) { // ichor drains from the seams, knees fold, he crashes forward onto his face and settles
    for (const m of ctx.api.mats) if (m.emissiveMap) m.emissiveIntensity = 1.6 * Math.max(0.04, 1 - T / 1.1);
    const drop = THREE.MathUtils.smoothstep(T, 0.25, 0.5); const u0 = Math.min(1, Math.max(0, (T - 0.45) / 0.4)); let f = u0 * u0; if (T > 0.85) { const u = T - 0.85; f = 1 - Math.exp(-u * 7) * Math.sin(u * 20) * 0.06; }
    model.position.y = (-drop * 0.38 * (1 - Math.min(1, f)) + Math.min(1, f) * 0.25) * ctx.sc; model.rotation.x = f * 1.42; model.position.z += Math.min(1, f) * 0.3 * ctx.sc;
  },
};
export const createTalos = (seed) => createGeneric(SPEC, seed);
export const warmTalos = () => void A();
