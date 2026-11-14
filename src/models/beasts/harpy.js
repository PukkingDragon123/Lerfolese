// Harpy: a hovering storm-hag. Human torso and fierce face with a wild violet mane, feathered bust and hips, two
// great wings (shoulder/elbow/hand bones carrying layered primaries, secondaries and coverts), feathered thighs on
// scaly bird legs with hooked talons, and a fanned tail. Attack: rise and rear back, wings high, then a talons-first
// dive (impact) and a hard down-beat to recover. Death: she drops out of the air and crumples on her side.
import { THREE, K, hex, humanRows, sculptHuman, asset, createGeneric, curved, rigidSkinned, add, fallSide } from './kit.js';

const H = 1.7;
const BONES = humanRows(H, { arms: false, legs: false });
for (const [s, L] of [[1, '_L'], [-1, '_R']]) BONES.push(
  ['wing1' + L, 'spine3', [0.2 * s, 1.36, -0.04]], ['wing2' + L, 'wing1' + L, [0.5 * s, 1.42, -0.08]], ['wing3' + L, 'wing2' + L, [0.82 * s, 1.38, -0.06]],
  ['thigh' + L, 'hips', [0.1 * s, 0.86, 0]], ['shin' + L, 'thigh' + L, [0.13 * s, 0.6, 0.12]], ['tars' + L, 'shin' + L, [0.13 * s, 0.35, -0.06]], ['foot' + L, 'tars' + L, [0.13 * s, 0.08, 0.02]]);
BONES.push(['tail1', 'hips', [0, 0.86, -0.12]]);
const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
const PAL = {
  skin: { s: 'skin', c: hex('#c4a894') }, feather: { s: 'feather', c: hex('#4a3e36'), tip: hex('#8a7a66'), sz: 0.03 }, hair: { s: 'hair', c: hex('#2a2024'), fs: 34 },
  scale: { s: 'scale', c: hex('#a89060'), sz: 0.012 }, brow: { s: 'skin', c: hex('#3a2a24') }, lip: { s: 'skin', c: hex('#8a5048') },
  eye: { s: 'eye', c: hex('#c88a2a'), pupil: 'round', pupilR: 0.3 }, default: { s: 'skin', c: hex('#c4a894') },
};
function sculpt(S) {
  sculptHuman(S, J, H, { bulk: 0.78, arms: false, legs: false, tags: { body: 'skin', chest: 'feather' } });
  for (const p of S.prims) if (p.bone === 'hips' || (Array.isArray(p.bone) && p.bone[0] === 'hips')) p.tag = 'feather';
  // wings: feathered arm bones with a shoulder mass that rolls into the upper back
  S.sym((s, L) => {
    S.blob([0.17 * s, 1.36, -0.05], [0.08, 0.07, 0.07], ['spine3', 'wing1' + L], { k: 0.03, tag: 'feather' });
    S.chain([J['wing1' + L], J['wing2' + L], J['wing3' + L], [1.08 * s, 1.32, -0.02]], [0.055, 0.04, 0.03, 0.014], ['wing1' + L, 'wing2' + L, 'wing3' + L], { k: 0.02, tag: 'feather' });
    // feathered thigh, scaly shin and tarsus, foot pad
    S.limb(J['thigh' + L], J['shin' + L], 0.08, 0.05, 'thigh' + L, { k: 0.03, tag: 'feather' });
    S.limb(J['shin' + L], J['tars' + L], 0.034, 0.024, 'shin' + L, { k: 0.015, tag: 'scale' });
    S.limb(J['tars' + L], J['foot' + L], 0.024, 0.022, 'tars' + L, { k: 0.012, tag: 'scale' });
    S.blob(J['foot' + L], [0.035, 0.025, 0.04], 'foot' + L, { k: 0.012, tag: 'scale' });
  });
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 3.2; S.limb([Math.sin(a) * 0.1, 1.36, Math.cos(a) * 0.07], [Math.sin(a) * 0.17, 1.27, Math.cos(a) * 0.12], 0.035, 0.008, 'spine3', { k: 0.015, tag: 'feather' }); }
  // head: face, fierce brows, eyes, lips, pointed ears, wild mane
  S.blob([0, 1.6, 0.0], [0.082, 0.098, 0.098], 'head', { k: 0.03, tag: 'skin', imp: 3 }); S.blob([0, 1.553, 0.045], [0.066, 0.082, 0.066], 'head', { k: 0.03, tag: 'skin', imp: 3 });
  S.limb([0, 1.575, 0.105], [0, 1.548, 0.118], 0.01, 0.014, 'head', { k: 0.01, tag: 'skin', imp: 4 });
  S.sym((s) => {
    S.blob([0.033 * s, 1.594, 0.1], [0.03, 0.009, 0.016], 'head', { k: 0.006, tag: 'brow', rot: [0, 0, -0.35 * s], imp: 4 });
    S.blob([0.031 * s, 1.575, 0.097], [0.014, 0.011, 0.009], 'head', { k: 0.004, tag: 'eye', dir: [0.25 * s, 0, 1], imp: 4 });
    S.limb([0.075 * s, 1.58, 0.0], [0.12 * s, 1.63, -0.04], 0.018, 0.004, 'head', { k: 0.008, tag: 'skin' });
  });
  S.blob([0, 1.512, 0.085], [0.024, 0.009, 0.012], 'jaw', { k: 0.006, tag: 'lip', imp: 4 }); S.blob([0, 1.495, 0.055], [0.05, 0.03, 0.045], 'jaw', { k: 0.015, tag: 'skin', imp: 3 });
  S.blob([0, 1.63, -0.03], [0.115, 0.115, 0.12], 'head', { k: 0.03, tag: 'hair' });
  for (let i = 0; i < 14; i++) { const a = (i / 13 - 0.5) * 3.6, up = i % 2; S.limb([Math.sin(a) * 0.09, 1.66, -0.02 + Math.cos(a) * 0.04], [Math.sin(a) * (0.2 + up * 0.06), 1.62 + up * 0.12 - Math.abs(a) * 0.05, -0.2 - (1 - up) * 0.1], 0.045, 0.01, i < 7 ? 'head' : 'neck', { k: 0.02, tag: 'hair' }); }
}
const A = () => asset('harpy', { bones: BONES, sculpt, pal: PAL, cell: 0.012, target: 9500, atlas: 512, maxChart: 0.02, woundSkip: ['eye', 'hair'] });

const featherMat = () => K.uvMat('harpy-feather', 32, 128, (u, v, o) => {
  const top = Math.abs(((u + 0.25) % 0.5) - 0.25) < 0.03; const barb = Math.sin(v * 70 + Math.abs(u - 0.5) * 30) > 0.8;
  K.tone(v > 0.78 ? hex('#9a8670') : v > 0.55 ? hex('#5a4a3e') : hex('#463a32'), K.band(0.5 + Math.cos(u * 6.28) * 0.2 + (top ? 0.25 : 0) + (barb ? -0.12 : 0), 4), o.col);
});
const feather = (a, dir, len, w) => new K.Loft(10, 6).set(K.curve([a, add3l(a, dir, len * 0.5, -0.02), add3l(a, dir, len, -0.05)]), (t) => [w * Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) * 0.9 + 0.004, 0.005], { ref: (t, n) => n.set(0, 1, 0) }).geo;
const add3l = (a, d, l, dy) => { const n = Math.hypot(...d); return [a[0] + (d[0] / n) * l, a[1] + (d[1] / n) * l + dy * l, a[2] + (d[2] / n) * l]; };

const CLIPS = {
  attack: [[0, {}],
    [0.3, { _pos: [0, 0.38, -0.32], spine1: [-0.15, 0, 0], spine2: [-0.12, 0, 0], neck: [-0.1, 0, 0], head: [-0.2, 0, 0], jaw: [0.3, 0, 0], wing1_L: [0, 0.2, 0.9], wing1_R: [0, -0.2, -0.9], wing2_L: [0, 0, 0.3], wing2_R: [0, 0, -0.3], thigh_L: [-0.7, 0, 0], thigh_R: [-0.7, 0, 0], shin_L: [0.8, 0, 0], shin_R: [0.8, 0, 0] }],
    [0.42, { _pos: [0, -0.32, 0.6], spine1: [0.3, 0, 0], spine2: [0.2, 0, 0], neck: [0.1, 0, 0], head: [0.1, 0, 0], jaw: [0.55, 0, 0], wing1_L: [0, -0.6, -0.1], wing1_R: [0, 0.6, 0.1], wing2_L: [0, -0.4, 0], wing2_R: [0, 0.4, 0], thigh_L: [-1.3, 0, 0], thigh_R: [-1.2, 0, 0], shin_L: [-0.3, 0, 0], shin_R: [-0.3, 0, 0], foot_L: [-0.6, 0, 0], foot_R: [-0.6, 0, 0] }],
    [0.6, { _pos: [0, -0.1, 0.45], spine1: [0.1, 0, 0], jaw: [0.2, 0, 0], wing1_L: [0, 0, -0.7], wing1_R: [0, 0, 0.7], wing2_L: [0, 0, -0.4], wing2_R: [0, 0, 0.4], thigh_L: [-0.6, 0, 0], thigh_R: [-0.6, 0, 0], shin_L: [0.4, 0, 0], shin_R: [0.4, 0, 0] }], [0.9, {}]],
  cast: [[0, {}], [0.3, { _pos: [0, 0.2, -0.1], spine2: [-0.15, 0, 0], head: [-0.4, 0, 0], jaw: [0.6, 0, 0], wing1_L: [0, 0.3, 0.8], wing1_R: [0, -0.3, -0.8] }], [0.8, { head: [-0.3, 0.2, 0], jaw: [0.5, 0, 0], wing1_L: [0, 0.2, 0.5], wing1_R: [0, -0.2, -0.5] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0.12, -0.25], spine1: [-0.15, 0.1, 0.1], spine2: [-0.15, 0.1, 0], head: [-0.4, 0.4, 0.2], jaw: [0.5, 0, 0], wing1_L: [0, 0, 0.6], wing1_R: [0, 0, -0.2], thigh_L: [-0.5, 0, 0], shin_L: [0.6, 0, 0] }], [0.32, { head: [0.1, -0.1, 0] }], [0.65, {}]],
  die: [[0, {}], [0.15, { spine2: [-0.3, 0, 0], head: [-0.5, 0.3, 0], jaw: [0.6, 0, 0], wing1_L: [0, 0, 0.9], wing1_R: [0, 0, -0.9] }],
    [0.45, { spine1: [0.3, 0, 0], head: [0.4, 0, 0], wing1_L: [0, 0.3, -0.6], wing1_R: [0, -0.3, 0.6], thigh_L: [-0.8, 0, 0], thigh_R: [-0.6, 0, 0], shin_L: [1.0, 0, 0], shin_R: [0.9, 0, 0] }],
    [0.8, { spine1: [0.2, 0, 0.2], head: [0.2, 0.5, 0.3], jaw: [0.4, 0, 0], wing1_L: [0, 0.4, -0.2], wing1_R: [0, -0.4, 1.1], wing2_R: [0, 0, 0.5], thigh_L: [-0.9, 0, 0], thigh_R: [-0.5, 0, 0.2], shin_L: [1.1, 0, 0], shin_R: [0.8, 0, 0] }]],
};
const SPEC = {
  id: 'harpy', bones: BONES, height: 1.9, asset: A, clips: CLIPS, impact: 0.42, lungeK: 0.06,
  follow: { head: [22, 0.42], wing2_L: [14, 0.35], wing2_R: [14, 0.35], wing3_L: [11, 0.3], wing3_R: [11, 0.3], tail1: [9, 0.3], tars_L: [10, 0.35], tars_R: [10, 0.35], foot_L: [9, 0.32], foot_R: [9, 0.32] },
  props(ctx) {
    const { B, own, model } = ctx; const fm = own(featherMat()); const parts = [];
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
      const w1 = J['wing1' + L], w2 = J['wing2' + L], w3 = J['wing3' + L], tip = [1.08 * s, 1.32, -0.02];
      for (let i = 0; i < 9; i++) { const k = i / 8; const a = [w3[0] + (tip[0] - w3[0]) * k, w3[1] + (tip[1] - w3[1]) * k, w3[2] + (tip[2] - w3[2]) * k]; const d = [s * (0.25 + k * 0.9), -0.12, -1 + k * 0.6]; parts.push([feather(a, d, 0.5 - Math.abs(k - 0.5) * 0.18, 0.055), 'wing3' + L]); }
      for (let i = 0; i < 8; i++) { const k = i / 7; const a = [w2[0] + (w3[0] - w2[0]) * k, w2[1] + (w3[1] - w2[1]) * k, w2[2] + (w3[2] - w2[2]) * k]; parts.push([feather(a, [s * 0.18, -0.18, -1], 0.42, 0.055), 'wing2' + L]); }
      for (let i = 0; i < 8; i++) { const k = i / 7; const a = [w1[0] + (w3[0] - w1[0]) * k, w1[1] + (w3[1] - w1[1]) * k + 0.02, w1[2] + (w3[2] - w1[2]) * k]; parts.push([feather(a, [s * 0.1, -0.08, -1], 0.2, 0.045), k < 0.5 ? 'wing2' + L : 'wing3' + L]); }
    }
    for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 1.1; parts.push([feather([0, 0.86, -0.12], [Math.sin(a), -0.5, -Math.cos(a)], 0.42, 0.05), 'tail1']); }
    rigidSkinned(B, parts, fm, model);
    const tal = own(K.uvMat('harpy-talon', 16, 32, (u, v, o) => K.tone(hex('#2a2228'), K.band(0.55 + Math.cos(u * 6.28) * 0.3 + v * 0.1, 3), o.col)));
    const t = []; for (const [s, L] of [[1, '_L'], [-1, '_R']]) { const f = J['foot' + L]; for (const a of [-0.45, 0, 0.45]) t.push([curved([f[0] + Math.sin(a) * 0.03, f[1] - 0.01, f[2] + 0.03], [Math.sin(a) * 0.5, -0.3, 1], 0.09, 0.016, [0, -0.04, 0], 6, 6), 'foot' + L]); t.push([curved([f[0], f[1] - 0.01, f[2] - 0.03], [0, -0.3, -1], 0.07, 0.014, [0, -0.03, 0], 6, 6), 'foot' + L]); }
    rigidSkinned(B, t, tal, model);
  },
  hover(t, st) { const up = 0.55 + Math.sin(t * 5.5) * 0.05; if (!st.dead) return up; const f = Math.min(1, st.deadT / 0.38); return up * (1 - f * f); },
  idle(P, t, st) {
    const fl = Math.sin(t * 5.5), br = Math.sin(t * 1.6);
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) { add(P, 'wing1' + L, 0, -0.35 * s, (0.15 + fl * 0.55) * s); add(P, 'wing2' + L, 0, 0.25 * s, (-0.1 - fl * 0.25) * s); add(P, 'wing3' + L, 0, 0.2 * s, (-0.1 - fl * 0.2) * s); add(P, 'thigh' + L, -0.25, 0, 0.05 * s); add(P, 'shin' + L, 0.45); add(P, 'tars' + L, -0.15); add(P, 'foot' + L, 0.5); }
    add(P, 'spine1', 0.05 + br * 0.02); add(P, 'spine2', br * 0.02); add(P, 'neck', -0.05, Math.sin(t * 0.7) * 0.2); add(P, 'head', 0.05 + fl * 0.03, Math.sin(t * 0.7 + 0.4) * 0.25, Math.sin(t * 0.5) * 0.1);
    add(P, 'jaw', 0.05 + (st.talk > 0 ? Math.abs(Math.sin(t * 17)) * 0.3 : 0)); add(P, 'tail1', 0.1 + fl * 0.08);
  },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.04, rot: 1.36, lift: 0.04, slide: 0.05, t0: 0.38, t1: 0.7 }),
};
export const createHarpy = (seed) => createGeneric(SPEC, seed);
export const warmHarpy = () => void A();
