// Cyclops: a pot-bellied, slate-skinned giant (3.1 m) on the humanoid template: one huge amber eye under a single
// heavy brow, broad nose, underbite tusks on a hinged jaw, pointed ears, a hide loincloth and shoulder strap, and a
// gnarled iron-studded club in the left fist. Attack: an overhead club smash (lean back, wind up, slam, follow-through).
import { THREE, K, hex, humanRows, sculptHuman, fistFrame, asset, prop, createGeneric, curved, rigidSkinned, onBone, add, fallSide } from './kit.js';

const H = 3.1;
const BONES = humanRows(H, { sw: 1.25, hw: 1.2 });
const PAL = {
  skin: { s: 'skin', c: hex('#9a7a62'), belly: hex('#a88a70') }, brow: { s: 'skin', c: hex('#7e6250'), L: -0.04 },
  eye: { s: 'eye', c: hex('#6a4a2a'), white: hex('#e2d8c4'), iris: 0.98, irisR: 0.52, pupil: 'round', pupilR: 0.2 },
  mouth: { s: 'dark', c: hex('#5a1a24') }, pelt: { s: 'fur', c: hex('#6e4a2c'), fs: 26, back: hex('#7e5634') }, strap: { s: 'leather', c: hex('#4a2c1a') }, nail: { s: 'keratin', c: hex('#c8bca8') },
  default: { s: 'skin', c: hex('#9a7a62') },
};
function sculpt(S) {
  const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
  sculptHuman(S, J, H, { bulk: 1.45, belly: 0.9, tags: { body: 'skin', hand: 'skin' } });
  // head: cranium, single brow, socketed eye, nose, cheeks, jaw, ears
  S.blob([0, 2.95, 0.03], [0.165, 0.17, 0.18], 'head', { k: 0.05, tag: 'skin', imp: 3 });
  S.blob([0, 2.87, 0.1], [0.155, 0.14, 0.13], 'head', { k: 0.05, tag: 'skin', imp: 3 });
  S.blob([0, 2.957, 0.178], [0.15, 0.048, 0.07], 'head', { k: 0.03, tag: 'brow', imp: 3 });
  S.blob([0, 2.893, 0.24], [0.078, 0.064, 0.06], 'head', { k: 0.02, tag: 'brow', sub: true });
  S.blob([0, 2.893, 0.205], [0.07, 0.062, 0.05], 'head', { k: 0.006, tag: 'eye', dir: [0, 0, 1], imp: 4 });
  S.limb([0, 2.862, 0.225], [0, 2.815, 0.258], 0.03, 0.044, 'head', { k: 0.02, tag: 'skin', imp: 3 });
  S.sym((s) => {
    S.blob([0.022 * s, 2.81, 0.285], [0.012, 0.01, 0.02], 'head', { k: 0.006, tag: 'mouth', sub: true });
    S.blob([0.105 * s, 2.84, 0.15], [0.07, 0.06, 0.07], 'head', { k: 0.03, tag: 'skin' });
    S.limb([0.16 * s, 2.92, 0.02], [0.26 * s, 2.99, -0.05], 0.042, 0.01, 'head', { k: 0.02, tag: 'skin', imp: 2 });
  });
  S.blob([0, 2.755, 0.13], [0.15, 0.066, 0.13], 'jaw', { k: 0.03, tag: 'skin', imp: 3 });
  S.blob([0, 2.737, 0.215], [0.1, 0.056, 0.06], 'jaw', { k: 0.025, tag: 'skin', imp: 3 });
  S.box([0, 2.79, 0.19], [0.125, 0.009, 0.1], 0.003, 'head', { k: 0.008, tag: 'mouth', sub: true, rot: [0.06, 0, 0] });
  // hide loincloth and a crossing strap
  S.blob([0, 1.61, -0.01], [0.34, 0.2, 0.29], 'hips', { k: 0.03, tag: 'pelt' });
  for (const z of [1, -1]) S.box([0, 1.36, 0.215 * z], [0.18, 0.2, 0.03], 0.025, 'hips', { k: 0.03, tag: 'pelt', rot: [-0.18 * z, 0, 0] });
  S.chain([[0.36, 2.5, 0.08], [0.2, 2.3, 0.3], [0.0, 2.08, 0.37], [-0.2, 1.88, 0.36], [-0.38, 1.7, 0.22]], [0.035, 0.035, 0.035, 0.035, 0.035], ['spine3', 'spine3', 'spine2', 'spine1', 'spine1'], { k: 0.04, tag: 'strap' });
}
const CLUB_PAL = { wood: { s: 'wood', c: hex('#7a5232'), grain: 40 }, iron: { s: 'metal', c: hex('#6a6e78'), me: 0.5 }, strap: { s: 'leather', c: hex('#3e2414') }, default: { s: 'wood', c: hex('#7a5232') } };
function club(S) { // gnarled log, thick knotted head studded with iron, leather grip (local +Y from the grip)
  S.chain([[0, -0.32, 0], [0.01, 0.1, 0], [0.03, 0.6, 0.01], [0.02, 1.05, 0], [0, 1.3, -0.01]], [0.055, 0.06, 0.09, 0.15, 0.13], 'p', { k: 0.04, tag: 'wood' });
  for (const [x, y, z, r] of [[0.08, 0.75, 0.05, 0.06], [-0.07, 0.95, -0.06, 0.07], [0.1, 1.12, -0.04, 0.06], [-0.05, 0.55, 0.06, 0.045], [0.02, 1.25, 0.1, 0.06]]) S.blob([x, y, z], [r, r * 1.2, r], 'p', { k: 0.04, tag: 'wood' });
  for (let i = 0; i < 9; i++) { const a = i * 2.4, y = 0.85 + (i % 3) * 0.16; const n = [Math.cos(a), 0, Math.sin(a)]; S.limb([n[0] * 0.12, y, n[2] * 0.12], [n[0] * 0.22, y + 0.02, n[2] * 0.22], 0.03, 0.006, 'p', { k: 0.01, tag: 'iron' }); }
  S.limb([0, -0.2, 0], [0, 0.12, 0], 0.068, 0.068, 'p', { k: 0.01, tag: 'strap' });
}
const A = () => asset('cyclops', { bones: BONES, sculpt, pal: PAL, cell: 0.024, target: 13500, atlas: 768, maxChart: 0.06, woundScale: 1.8, woundSkip: ['eye', 'mouth', 'pelt', 'strap'] });

const CLIPS = {
  attack: [[0, {}],
    [0.36, { _pos: [0, 0.05, -0.12], hips: [-0.12, 0.22, 0], spine1: [-0.16, 0.25, 0], spine2: [-0.16, 0.15, 0], spine3: [-0.12, 0.1, 0], neck: [-0.1, 0, 0], head: [-0.22, 0.1, 0], jaw: [0.25, 0, 0], uparm_L: [-2.4, -0.2, 0.3], forearm_L: [-0.7, 0, 0], hand_L: [-0.7, 0, 0], uparm_R: [-1.2, 0, 0.5], forearm_R: [-0.8, 0, 0], thigh_L: [-0.3, 0, 0], shin_L: [0.3, 0, 0], thigh_R: [0.2, 0, 0] }],
    [0.48, { _pos: [0, -0.1, 0.25], hips: [0.16, -0.22, 0], spine1: [0.3, -0.28, 0], spine2: [0.26, -0.2, 0], spine3: [0.16, -0.12, 0], neck: [0.12, 0, 0], head: [0.2, -0.1, 0], jaw: [0.4, 0, 0], uparm_L: [-0.55, -0.3, 0.1], forearm_L: [0.85, 0, 0], hand_L: [1.0, 0, 0], uparm_R: [0.4, 0, -0.3], forearm_R: [-0.4, 0, 0], thigh_L: [-0.7, 0, 0], shin_L: [0.65, 0, 0], thigh_R: [0.35, 0, 0], shin_R: [0.15, 0, 0] }],
    [0.62, { _pos: [0, -0.12, 0.28], hips: [0.2, -0.24, 0], spine1: [0.34, -0.3, 0], spine2: [0.28, -0.22, 0], spine3: [0.18, -0.14, 0], neck: [0.14, 0, 0], head: [0.24, -0.12, 0], jaw: [0.3, 0, 0], uparm_L: [-0.4, -0.3, 0.05], forearm_L: [0.9, 0, 0], hand_L: [1.15, 0, 0], uparm_R: [0.45, 0, -0.3], forearm_R: [-0.4, 0, 0], thigh_L: [-0.72, 0, 0], shin_L: [0.68, 0, 0], thigh_R: [0.36, 0, 0], shin_R: [0.15, 0, 0] }],
    [0.95, {}]],
  cast: [[0, {}], [0.3, { spine2: [-0.14, 0, 0], spine3: [-0.16, 0, 0], neck: [-0.2, 0, 0], head: [-0.35, 0, 0], jaw: [0.55, 0, 0], uparm_L: [-0.2, 0, 0.6], uparm_R: [-0.2, 0, -0.9], forearm_R: [-0.6, 0, 0] }], [0.8, { spine3: [-0.1, 0, 0], head: [-0.25, 0.25, 0], jaw: [0.5, 0, 0], uparm_R: [-0.1, 0, -0.7] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0, -0.18], hips: [-0.08, 0, 0.04], spine1: [-0.14, 0.05, 0.06], spine2: [-0.18, 0.12, 0.05], spine3: [-0.12, 0.12, 0], head: [-0.35, 0.4, 0.2], jaw: [0.4, 0, 0], uparm_R: [-0.4, 0, -0.6], forearm_R: [-0.9, 0, 0], thigh_R: [0.35, 0, 0], shin_R: [0.3, 0, 0], thigh_L: [-0.15, 0, 0] }], [0.32, { spine1: [0.06, 0, 0], head: [0.1, -0.1, 0] }], [0.65, {}]],
  die: [[0, {}], [0.16, { spine2: [-0.22, 0, 0], head: [-0.45, 0.3, 0], jaw: [0.6, 0, 0], uparm_L: [0, 0, 0.5], uparm_R: [0, 0, -0.5], thigh_R: [0.3, 0, 0] }],
    [0.42, { hips: [0.25, 0, 0], spine1: [0.25, 0, 0], spine2: [0.2, 0, 0], neck: [0.3, 0, 0], head: [0.5, 0, 0.2], jaw: [0.45, 0, 0], thigh_L: [-1.2, 0, 0], thigh_R: [-1.1, 0, 0], shin_L: [1.6, 0, 0], shin_R: [1.5, 0, 0], uparm_L: [-0.4, 0, -0.2], uparm_R: [-0.4, 0, 0.2] }],
    [0.8, { hips: [0.3, 0, 0], spine1: [0.25, 0, 0.1], spine2: [0.2, 0, 0.1], neck: [0.1, 0.4, 0], head: [0.2, 0.5, 0.35], jaw: [0.55, 0, 0], thigh_L: [-1.2, 0, 0], thigh_R: [-0.7, 0, 0.2], shin_L: [1.5, 0, 0], shin_R: [1.0, 0, 0], uparm_L: [-0.6, 0, 0.3], uparm_R: [-0.6, 0, 0.3], forearm_R: [-0.4, 0, 0] }]],
};
const SPEC = {
  id: 'cyclops', bones: BONES, height: H, asset: A, blood: [0.12, 0.004, 0.006], clips: CLIPS, impact: 0.48,
  follow: { neck: [30, 0.55], head: [24, 0.45], jaw: [16, 0.3] },
  props(ctx) {
    const { B, J } = ctx; const C = prop('club', club, CLUB_PAL, { cell: 0.018, target: 2200 }); const F = fistFrame(J, '_L');
    const g = K.mesh(C.geo, C.mat); g.position.copy(F.wr).addScaledVector(F.z, 0.042 * H); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.z, F.y, F.x.clone().negate())); onBone(B, 'hand_L', g); ctx.vars.club = g;
    const tusk = K.uvMat('cyc-tusk', 16, 32, (u, v, o) => K.tone(hex('#ece0c4'), K.band(0.62 + Math.cos(u * 6.28) * 0.22 - v * 0.15, 3), o.col));
    rigidSkinned(B, [-1, 1].map((s) => [curved([0.062 * s, 2.775, 0.225], [0.25 * s, 1, 0.25], 0.085, 0.022, [0, 0, 0.01]), 'jaw']), ctx.own(tusk), ctx.model);
  },
  idle(P, t, st) {
    const br = Math.sin(t * 1.3), sw = Math.sin(t * 0.55);
    add(P, 'hips', 0, sw * 0.03, sw * 0.02); add(P, 'spine1', -0.03 + br * 0.015, 0, -sw * 0.02); add(P, 'spine2', br * 0.03); add(P, 'spine3', 0.06 + br * 0.02);
    add(P, 'neck', 0.08, Math.sin(t * 0.4) * 0.1); add(P, 'head', -0.06 + Math.sin(t * 1.3 + 1) * 0.03, Math.sin(t * 0.4 + 0.6) * 0.18); add(P, 'jaw', 0.05 + Math.max(0, br) * 0.04 + (st.talk > 0 ? Math.abs(Math.sin(t * 13)) * 0.3 : 0));
    add(P, 'uparm_L', -0.42, 0.25, -0.32); add(P, 'forearm_L', -1.0, 0.25, 0); add(P, 'hand_L', 0.12, 0, -0.1);
    add(P, 'uparm_R', -0.08 + br * 0.02, 0, 0.2); add(P, 'forearm_R', -0.3); add(P, 'thigh_L', -0.05, 0, -0.03); add(P, 'thigh_R', -0.03, 0, 0.03); add(P, 'shin_L', 0.08); add(P, 'shin_R', 0.06);
  },
  gait(P, g, a) { add(P, 'thigh_L', Math.sin(g) * 0.5 * a); add(P, 'thigh_R', -Math.sin(g) * 0.5 * a); add(P, 'shin_L', Math.max(0, Math.cos(g)) * 0.6 * a); add(P, 'shin_R', Math.max(0, -Math.cos(g)) * 0.6 * a); },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.15, rot: 1.36, slide: 0.06 }),
};
export const createCyclops = (seed) => createGeneric(SPEC, seed);
export const warmCyclops = () => void A();
