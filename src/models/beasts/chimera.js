// Chimera: a lion (1.15 m at the withers) with a she-goat rising from its back and a serpent for a tail. Lion head
// with a heavy auburn mane, fanged hinged jaw and a throat that glows with banked fire; a goat neck and head with
// curling ridged horns, beard and bar pupils; a six-bone scaled tail ending in a fanged snake head.
// Attack: all three strike together: the lion rears and lunges with fire in its maw, the goat butts, the snake whips
// over the back.
import { K, hex, quadRows, sculptQuad, asset, createGeneric, curved, rigidSkinned, add, fallSide } from './kit.js';

const O = { Lb: 1.3, Hw: 1.15, W: 0.24, Ln: 0.4, Lh: 0.55, Hd: 0.05, tail: 6, tailDir: [0, 0.45, -1], tailLen: 1.5 };
const BONES = quadRows(O); const TE = BONES.tailEnd;
BONES.push(['gneck1', 'spine2', [0, 1.25, 0.15]], ['gneck2', 'gneck1', [0, 1.52, 0.2]], ['ghead', 'gneck2', [0, 1.76, 0.29]], ['gjaw', 'ghead', [0, 1.73, 0.34]],
  ['shead', 'tail6', TE], ['sjaw', 'shead', [0, TE[1] - 0.02, TE[2] - 0.03]]);
const PAL = {
  lion: { s: 'fur', c: hex('#d0a058'), belly: hex('#e6c890'), fs: 26, strand: 0.16 }, lionL: { s: 'fur', c: hex('#ead2a0'), fs: 34, strand: 0.12 },
  mane: { s: 'fur', c: hex('#8a3a1e'), fs: 18, strand: 0.32, flow: 0.4 }, nose: { s: 'skin', c: hex('#5a3a34'), ro: 0.35 }, paw: { s: 'skin', c: hex('#6a4a34') },
  eye: { s: 'eye', c: hex('#ffb030'), glow: [255, 170, 40], pupil: 'slit' }, mouth: { s: 'dark', c: hex('#ff8a2a'), e: [255, 110, 20] },
  goat: { s: 'fur', c: hex('#3a3436'), belly: hex('#58504e'), fs: 30 }, beard: { s: 'hair', c: hex('#5a524e') }, goateye: { s: 'eye', c: hex('#f0c040'), glow: [230, 180, 40], pupil: 'bar', rim: hex('#1e1a1a') },
  snake: { s: 'scale', c: hex('#3c7a4a'), back: hex('#2a5a3a'), belly: hex('#d8c27a'), sz: 0.022 }, seye: { s: 'eye', c: hex('#d8ff40'), glow: [200, 255, 60], pupil: 'slit' },
  default: { s: 'fur', c: hex('#d0a058') },
};
function sculpt(S) {
  const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
  sculptQuad(S, J, O, { bulk: 1.1, depth: 1.0, tuck: 0.1, tags: { body: 'lion', belly: 'lionL', leg: 'lion', paw: 'paw' } });
  // lion neck, mane, head
  S.limb([0, 1.05, 0.55], [0, 1.4, 0.9], 0.24, 0.17, ['neck1', 'neck2'], { k: 0.08, tag: 'mane' });
  S.blob([0, 1.42, 0.86], [0.3, 0.33, 0.22], ['neck2', 'head'], { k: 0.08, tag: 'mane', t0: 0.2, t1: 0.8 });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const p = [Math.sin(a) * 0.26, 1.42 + Math.cos(a) * 0.28, 0.82]; S.limb(p, [p[0] * 1.45, 1.42 + Math.cos(a) * 0.4 - 0.08, 0.66], 0.08, 0.02, 'neck2', { k: 0.04, tag: 'mane' }); }
  S.blob([0, 1.5, 0.98], [0.16, 0.14, 0.16], 'head', { k: 0.05, tag: 'lion', imp: 3 });
  S.blob([0, 1.43, 1.13], [0.12, 0.1, 0.12], 'head', { k: 0.05, tag: 'lionL', imp: 3 });
  S.blob([0, 1.465, 1.235], [0.058, 0.038, 0.035], 'head', { k: 0.02, tag: 'nose', imp: 4 });
  S.sym((s) => {
    S.blob([0.07 * s, 1.55, 1.08], [0.06, 0.03, 0.05], 'head', { k: 0.02, tag: 'lion', imp: 3 });
    S.blob([0.075 * s, 1.522, 1.105], [0.024, 0.02, 0.022], 'head', { k: 0.006, tag: 'eye', dir: [0.45 * s, 0.1, 0.9], imp: 4 });
    S.blob([0.13 * s, 1.63, 0.92], [0.045, 0.045, 0.02], 'ear' + (s > 0 ? '_L' : '_R'), { k: 0.02, tag: 'lion' });
  });
  S.limb([0, 1.365, 0.99], [0, 1.352, 1.18], 0.085, 0.058, 'jaw', { k: 0.03, tag: 'lionL', imp: 3 });
  S.box([0, 1.388, 1.1], [0.1, 0.009, 0.14], 0.003, 'head', { k: 0.008, tag: 'mouth', sub: true, rot: [0.04, 0, 0] });
  // goat rising from the back
  S.chain([[0, 1.12, 0.12], [0, 1.52, 0.2], [0, 1.74, 0.27]], [0.15, 0.1, 0.08], ['gneck1', 'gneck2', 'ghead'], { k: 0.05, tag: 'goat' });
  S.blob([0, 1.8, 0.3], [0.08, 0.08, 0.1], 'ghead', { k: 0.03, tag: 'goat', imp: 3 });
  S.limb([0, 1.78, 0.36], [0, 1.715, 0.52], 0.06, 0.038, 'ghead', { k: 0.025, tag: 'goat', imp: 3 });
  S.limb([0, 1.71, 0.4], [0, 1.69, 0.5], 0.04, 0.028, 'gjaw', { k: 0.02, tag: 'goat', imp: 3 });
  S.limb([0, 1.69, 0.43], [0, 1.57, 0.42], 0.032, 0.008, 'gjaw', { k: 0.015, tag: 'beard' });
  S.sym((s) => { S.blob([0.062 * s, 1.81, 0.37], [0.018, 0.016, 0.018], 'ghead', { k: 0.005, tag: 'goateye', dir: [0.85 * s, 0.1, 0.5], imp: 4 }); S.limb([0.07 * s, 1.83, 0.3], [0.13 * s, 1.8, 0.28], 0.025, 0.008, 'ghead', { k: 0.01, tag: 'goat' }); });
  // serpent tail and head
  const T = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6']; const tp = T.map((n) => J[n]); tp.push(TE);
  for (let i = 0; i < 6; i++) S.limb(tp[i], tp[i + 1], 0.09 - i * 0.008, 0.082 - i * 0.008, T[i], { k: 0.03, tag: i ? 'snake' : 'lion' });
  const d = [TE[0] - tp[5][0], TE[1] - tp[5][1], TE[2] - tp[5][2]]; const l = Math.hypot(...d); const u = d.map((x) => x / l);
  S.blob([TE[0] + u[0] * 0.08, TE[1] + u[1] * 0.08 + 0.01, TE[2] + u[2] * 0.08], [0.07, 0.045, 0.1], 'shead', { k: 0.03, tag: 'snake', dir: u, imp: 3 });
  S.blob([TE[0] + u[0] * 0.09, TE[1] + u[1] * 0.09 - 0.03, TE[2] + u[2] * 0.09], [0.055, 0.025, 0.08], 'sjaw', { k: 0.015, tag: 'snake', dir: u, imp: 3 });
  S.sym((s) => S.blob([TE[0] + 0.045 * s + u[0] * 0.12, TE[1] + u[1] * 0.12 + 0.03, TE[2] + u[2] * 0.12], [0.014, 0.012, 0.014], 'shead', { k: 0.004, tag: 'seye', dir: [s * 0.8, 0.3, u[2] * 0.5], imp: 4 }));
}
const A = () => asset('chimera', { bones: BONES, sculpt, pal: PAL, cell: 0.02, target: 14000, atlas: 768, maxChart: 0.04, woundScale: 1.3, woundSkip: ['eye', 'goateye', 'seye', 'nose', 'mouth', 'paw'] });

const CLIPS = {
  attack: [[0, {}],
    [0.32, { _pos: [0, 0.02, -0.18], pelvis: [0.08, 0, 0], spine2: [-0.06, 0, 0], neck1: [-0.35, 0, 0], neck2: [-0.2, 0, 0], head: [-0.3, 0, 0], jaw: [0.55, 0, 0], gneck1: [-0.4, 0, 0], ghead: [-0.3, 0, 0], tail2: [0.35, 0, 0], tail3: [0.35, 0, 0], tail4: [0.3, 0, 0], tail5: [0.2, 0, 0], sjaw: [0.6, 0, 0], farm_L: [0.3, 0, 0], farm_R: [0.3, 0, 0], thigh_L: [-0.3, 0, 0], thigh_R: [-0.3, 0, 0], shin_L: [0.35, 0, 0], shin_R: [0.35, 0, 0] }],
    [0.45, { _pos: [0, -0.04, 0.38], pelvis: [-0.05, 0, 0], spine2: [0.06, 0, 0], neck1: [0.3, 0, 0], neck2: [0.15, 0, 0], head: [0.15, 0, 0], jaw: [0.85, 0, 0], gneck1: [0.5, 0, 0], ghead: [0.4, 0, 0], tail2: [-0.6, 0, 0], tail3: [-0.6, 0, 0], tail4: [-0.55, 0, 0], tail5: [-0.4, 0, 0], tail6: [-0.3, 0, 0], sjaw: [0.7, 0, 0], farm_L: [-0.6, 0, 0], farm_R: [-0.4, 0, 0], thigh_L: [0.3, 0, 0], thigh_R: [0.3, 0, 0] }],
    [0.62, { _pos: [0, -0.04, 0.32], neck1: [0.35, 0, 0], head: [0.2, 0.15, 0.1], jaw: [0.7, 0, 0], gneck1: [0.35, 0, 0], tail3: [-0.4, 0, 0], tail4: [-0.4, 0, 0], sjaw: [0.2, 0, 0], farm_L: [-0.3, 0, 0] }], [1.0, {}]],
  cast: [[0, {}], [0.35, { neck1: [-0.45, 0, 0], neck2: [-0.25, 0, 0], head: [-0.4, 0, 0], jaw: [0.8, 0, 0], gneck1: [-0.4, 0.2, 0], ghead: [-0.4, 0, 0], gjaw: [0.4, 0, 0], tail4: [-0.4, 0, 0], sjaw: [0.6, 0, 0] }], [0.9, { neck1: [-0.35, 0, 0], head: [-0.3, 0.2, 0], jaw: [0.7, 0, 0], gjaw: [0.3, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0.03, -0.18], spine2: [-0.1, 0.12, 0.06], neck1: [-0.3, 0.3, 0], head: [-0.3, 0.4, 0.2], jaw: [0.5, 0, 0], gneck1: [-0.3, -0.3, 0], ghead: [-0.3, 0, 0], tail3: [0.4, 0.3, 0], thigh_L: [-0.3, 0, 0] }], [0.32, { head: [0.1, -0.1, 0] }], [0.65, {}]],
  die: [[0, {}], [0.18, { neck1: [-0.35, 0.3, 0], head: [-0.4, 0.3, 0.2], jaw: [0.7, 0, 0], gneck1: [-0.4, 0, 0], tail3: [0.3, 0, 0] }],
    [0.5, { farm_L: [0.5, 0, 0.2], farm_R: [0.5, 0, -0.2], thigh_L: [-0.6, 0, 0.3], thigh_R: [-0.6, 0, -0.3], neck1: [0.2, 0, 0], head: [0.3, 0, 0], gneck1: [0.4, 0.3, 0.3], ghead: [0.3, 0, 0], jaw: [0.5, 0, 0] }],
    [0.85, { farm_L: [-0.3, 0, 0.3], farm_R: [0.3, 0, -0.3], thigh_L: [-0.3, 0, 0.3], thigh_R: [0.3, 0, -0.3], neck1: [-0.2, 0.4, 0], head: [0.1, 0.3, 0.3], jaw: [0.6, 0, 0], gneck1: [0.6, 0.5, 0.4], ghead: [0.4, 0, 0], tail2: [0.4, 0.3, 0], tail3: [0.4, 0.3, 0], tail4: [0.3, 0.3, 0] }]],
};
const SPEC = {
  id: 'chimera', bones: BONES, height: 1.9, asset: A, clips: CLIPS, impact: 0.45, lungeK: 0.06,
  follow: { neck2: [24, 0.5], head: [20, 0.42], jaw: [16, 0.3], gneck2: [16, 0.4], ghead: [14, 0.38], tail2: [9, 0.3], tail3: [8, 0.28], tail4: [7, 0.26], tail5: [6.5, 0.25], tail6: [6, 0.25], shead: [7, 0.3] },
  props(ctx) {
    const ivory = K.uvMat('chim-fang', 16, 32, (u, v, o) => K.tone(hex('#f2e8d0'), K.band(0.62 + Math.cos(u * 6.28) * 0.2 - v * 0.15, 3), o.col));
    const horn = K.uvMat('chim-horn', 32, 64, (u, v, o) => { K.tone(hex('#6a5a4a'), K.band(0.5 + Math.cos(u * 6.28) * 0.22 + (Math.sin(v * 60) > 0.5 ? -0.14 : 0.04), 4), o.col); });
    const f = []; for (const s of [-1, 1]) for (const [z, l] of [[1.2, 0.07], [1.15, 0.045]]) f.push([curved([0.04 * s, 1.38, z], [0, -1, 0.1], l, 0.014, [0, 0, -0.008], 5, 5), 'head'], [curved([0.035 * s, 1.36, z - 0.02], [0, 1, 0.1], l * 0.8, 0.012, [0, 0, 0.006], 5, 5), 'jaw']);
    const TE2 = TE; for (const s of [-1, 1]) f.push([curved([TE2[0] + 0.025 * s, TE2[1] - 0.005, TE2[2] - 0.15], [0, -1, -0.2], 0.04, 0.008, [0, 0, 0], 5, 5), 'shead']);
    rigidSkinned(ctx.B, f, ctx.own(ivory), ctx.model);
    const hp = []; for (const s of [-1, 1]) { const l = new K.Loft(24, 10).set(K.curve([[0.035 * s, 1.85, 0.3], [0.07 * s, 1.95, 0.23], [0.1 * s, 1.98, 0.1], [0.13 * s, 1.89, 0.02], [0.14 * s, 1.79, 0.07]]), (t) => 0.034 * (1 - t * 0.85) + 0.003); hp.push([l.geo, 'ghead']); }
    rigidSkinned(ctx.B, hp, ctx.own(horn), ctx.model);
  },
  idle(P, t, st) {
    const br = Math.sin(t * 1.4), sw = Math.sin(t * 0.5);
    add(P, 'spine2', br * 0.015); add(P, 'neck1', 0.04, Math.sin(t * 0.4) * 0.12); add(P, 'head', 0.05, Math.sin(t * 0.4 + 0.4) * 0.12, Math.sin(t * 0.3) * 0.06); add(P, 'jaw', 0.06 + Math.max(0, br) * 0.06 + (st.talk > 0 ? Math.abs(Math.sin(t * 13)) * 0.4 : 0));
    add(P, 'gneck1', 0.1 + Math.sin(t * 0.9) * 0.08, Math.sin(t * 0.6 + 1) * 0.2); add(P, 'ghead', 0.15, Math.sin(t * 1.1) * 0.25, 0); add(P, 'gjaw', Math.max(0, Math.sin(t * 0.8) - 0.8) * 1.5);
    // the serpent tail curls up and forward over the back, swaying
    for (let i = 2; i <= 6; i++) add(P, 'tail' + i, -0.32 + Math.sin(t * 1.3 - i * 0.6) * 0.06, Math.sin(t * 0.9 - i * 0.5) * 0.12, 0); add(P, 'shead', 0.6, Math.sin(t * 1.7) * 0.3, 0); add(P, 'sjaw', Math.max(0, Math.sin(t * 1.1) - 0.85) * 3);
  },
  gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, Math.sin(g + ph) * 0.5 * a); },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.1, rot: 1.38, lift: 0.06, slide: 0.04, t0: 0.32, t1: 0.66 }),
};
export const createChimera = (seed) => createGeneric(SPEC, seed);
export const warmChimera = () => void A();
