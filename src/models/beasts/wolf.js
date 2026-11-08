// Hound of Artemis: a dire wolf (0.85 m at the withers) on the quadruped template: deep chest, tucked waist, heavy
// neck ruff, long muzzle with a hinged jaw and fangs, tall ears, a bushy tail, silver moon-washed fur with a darker
// saddle and a glowing crescent on the brow. Attack: crouch, pounce and snap (bite lands at impact).
import { K, hex, quadRows, sculptQuad, asset, createGeneric, curved, rigidSkinned, add, fallSide } from './kit.js';

const O = { Lb: 0.95, Hw: 0.85, W: 0.16, Ln: 0.34, Lh: 0.4, Hd: 0, tail: 4, tailDir: [0, -0.55, -1], tailLen: 0.72 };
const BONES = quadRows(O);
const moon = (c, o) => { if (c.nz < 0.3 || c.y < 1.1) return; const d1 = Math.hypot(c.x, c.y - 1.135), d2 = Math.hypot(c.x - 0.011, c.y - 1.143); if (d1 < 0.028 && d2 > 0.023) { K.tone(hex('#dff4ff'), 0.75, o.col); o.em = [190, 235, 255]; } };
const PAL = {
  fur: { s: 'fur', c: hex('#909cae'), back: hex('#646f84'), backY: 0.6, belly: hex('#c4ccd8'), fs: 30, fn: moon }, furL: { s: 'fur', c: hex('#c8d0dc'), fs: 34 },
  ruff: { s: 'fur', c: hex('#a8b2c2'), fs: 24, strand: 0.3 }, paw: { s: 'skin', c: hex('#4e5260') }, nose: { s: 'skin', c: hex('#22222a'), L: 0.05, ro: 0.3 },
  eye: { s: 'eye', c: hex('#9fe8ff'), glow: [150, 230, 255], pupil: 'slit' }, mouth: { s: 'dark', c: hex('#5a1622') }, ear: { s: 'fur', c: hex('#7c889c'), fs: 40 }, default: { s: 'fur', c: hex('#aeb9c8') },
};
function sculpt(S) {
  const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
  sculptQuad(S, J, O, { bulk: 0.92, depth: 1.08, tuck: 0.14, tags: { body: 'fur', belly: 'furL', leg: 'fur', paw: 'paw' } });
  S.limb([0, 0.82, 0.4], [0, 1.0, 0.68], 0.17, 0.105, ['neck1', 'neck2'], { k: 0.06, tag: 'ruff' });
  for (let i = 0; i < 11; i++) { const a = (i / 10 - 0.5) * 3.6; const p = [Math.sin(a) * 0.15, 0.93 + Math.cos(a) * 0.12, 0.55 + Math.cos(a) * 0.02]; S.limb(p, [p[0] * 1.6, p[1] - 0.12, p[2] - 0.13], 0.05, 0.012, 'neck1', { k: 0.025, tag: 'ruff' }); }
  // head
  S.blob([0, 1.09, 0.73], [0.1, 0.09, 0.11], 'head', { k: 0.04, tag: 'fur', imp: 3 });
  S.limb([0, 1.065, 0.8], [0, 1.038, 0.98], 0.064, 0.04, 'head', { k: 0.03, tag: 'furL', imp: 3 });
  S.blob([0, 1.043, 1.0], [0.028, 0.024, 0.024], 'head', { k: 0.012, tag: 'nose', imp: 4 });
  S.sym((s) => {
    S.blob([0.068 * s, 1.05, 0.77], [0.058, 0.06, 0.068], 'head', { k: 0.03, tag: 'furL', imp: 3 });
    S.blob([0.045 * s, 1.124, 0.82], [0.034, 0.02, 0.04], 'head', { k: 0.015, tag: 'fur', imp: 3 });
    S.blob([0.047 * s, 1.104, 0.842], [0.017, 0.015, 0.017], 'head', { k: 0.006, tag: 'eye', dir: [0.5 * s, 0.15, 0.85], imp: 4 });
    S.blob([0.062 * s, 1.205, 0.715], [0.034, 0.072, 0.016], 'ear' + (s > 0 ? '_L' : '_R'), { k: 0.02, tag: 'ear', rot: [-0.25, 0.45 * s, -0.25 * s], imp: 2 });
    S.limb([0.085 * s, 1.08, 0.72], [0.14 * s, 1.0, 0.65], 0.04, 0.01, 'head', { k: 0.02, tag: 'ruff' });
  });
  S.limb([0, 1.0, 0.76], [0, 0.997, 0.95], 0.05, 0.03, 'jaw', { k: 0.025, tag: 'furL', imp: 3 });
  S.box([0, 1.018, 0.885], [0.052, 0.006, 0.1], 0.002, 'head', { k: 0.006, tag: 'mouth', sub: true, rot: [0.05, 0, 0] });
  // bushy tail
  const T = ['tail1', 'tail2', 'tail3', 'tail4']; const tp = T.map((n) => J[n]); tp.push(BONES.tailEnd);
  S.chain(tp, [0.06, 0.085, 0.09, 0.07, 0.03], T, { k: 0.04, tag: 'fur' });
  for (let i = 1; i < 4; i++) for (const s of [-1, 1]) S.limb(tp[i], [tp[i][0] + 0.08 * s, tp[i][1] - 0.1, tp[i][2] - 0.08], 0.045, 0.01, T[i], { k: 0.02, tag: 'fur' });
}
const A = () => asset('wolf', { bones: BONES, sculpt, pal: PAL, cell: 0.014, target: 9500, atlas: 512, maxChart: 0.02, woundScale: 0.8, woundSkip: ['eye', 'nose', 'mouth', 'paw'] });

const CLIPS = {
  attack: [[0, {}],
    [0.28, { _pos: [0, -0.1, -0.14], pelvis: [0.12, 0, 0], spine1: [0.06, 0, 0], spine2: [0.05, 0, 0], neck1: [0.2, 0, 0], head: [0.15, 0, 0], jaw: [0.15, 0, 0], farm_L: [0.4, 0, 0], farm_R: [0.4, 0, 0], fore_L: [-0.6, 0, 0], fore_R: [-0.6, 0, 0], thigh_L: [-0.45, 0, 0], thigh_R: [-0.45, 0, 0], shin_L: [0.55, 0, 0], shin_R: [0.55, 0, 0], hock_L: [-0.35, 0, 0], hock_R: [-0.35, 0, 0], tail1: [0.3, 0, 0] }],
    [0.36, { _pos: [0, 0.16, 0.3], pelvis: [-0.08, 0, 0], spine1: [-0.05, 0, 0], neck1: [-0.15, 0, 0], head: [-0.1, 0, 0], jaw: [0.75, 0, 0], farm_L: [-1.0, 0, 0], farm_R: [-0.9, 0, 0], fore_L: [-0.3, 0, 0], fore_R: [-0.3, 0, 0], thigh_L: [0.6, 0, 0], thigh_R: [0.6, 0, 0], shin_L: [-0.25, 0, 0], shin_R: [-0.25, 0, 0], tail1: [-0.3, 0, 0] }],
    [0.42, { _pos: [0, 0.06, 0.5], pelvis: [-0.02, 0, 0], neck1: [0.1, 0, 0], head: [0.15, 0.15, 0.15], jaw: [0.0, 0, 0], farm_L: [-0.6, 0, 0], farm_R: [-0.5, 0, 0], fore_L: [-0.1, 0, 0], thigh_L: [0.3, 0, 0], thigh_R: [0.3, 0, 0] }],
    [0.6, { _pos: [0, -0.04, 0.35], neck1: [0.2, 0, 0], head: [0.25, -0.25, -0.25], jaw: [0.05, 0, 0], farm_L: [0.2, 0, 0], fore_L: [-0.3, 0, 0] }], [0.9, {}]],
  cast: [[0, {}], [0.3, { pelvis: [0.05, 0, 0], neck1: [-0.5, 0, 0], neck2: [-0.3, 0, 0], head: [-0.5, 0, 0], jaw: [0.6, 0, 0], ear_L: [-0.3, 0, 0], ear_R: [-0.3, 0, 0] }], [0.9, { neck1: [-0.45, 0, 0], head: [-0.45, 0, 0], jaw: [0.5, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0.03, -0.15], spine2: [-0.1, 0.15, 0.08], neck1: [-0.2, 0.3, 0], head: [-0.3, 0.4, 0.2], jaw: [0.4, 0, 0], ear_L: [0.5, 0, 0], ear_R: [0.5, 0, 0], tail1: [0.5, 0, 0], thigh_L: [-0.3, 0, 0], thigh_R: [-0.3, 0, 0] }], [0.32, { head: [0.1, -0.1, 0], tail1: [0.4, 0, 0] }], [0.65, {}]],
  die: [[0, {}], [0.15, { neck1: [-0.3, 0.3, 0], head: [-0.4, 0.4, 0.2], jaw: [0.5, 0, 0], thigh_L: [-0.2, 0, 0] }], [0.45, { farm_L: [0.5, 0, 0.2], farm_R: [0.5, 0, -0.2], thigh_L: [-0.6, 0, 0.3], thigh_R: [-0.6, 0, -0.3], neck1: [0.2, 0, 0], head: [0.3, 0, 0], jaw: [0.35, 0, 0] }],
    [0.8, { farm_L: [-0.3, 0, 0.3], farm_R: [0.3, 0, -0.3], fore_L: [-0.4, 0, 0], thigh_L: [-0.3, 0, 0.3], thigh_R: [0.3, 0, -0.3], neck1: [-0.2, 0.4, 0], head: [0.1, 0.3, 0.3], jaw: [0.4, 0, 0], tail1: [0.4, 0, 0], tail2: [0.3, 0, 0] }]],
};
const SPEC = {
  id: 'wolf', bones: BONES, height: 1.2, asset: A, clips: CLIPS, impact: 0.42, lungeK: 0.06,
  follow: { neck2: [26, 0.5], head: [22, 0.42], ear_L: [10, 0.25], ear_R: [10, 0.25], jaw: [18, 0.3], tail1: [8, 0.3], tail2: [7, 0.28], tail3: [6, 0.26], tail4: [5.5, 0.25] },
  props(ctx) {
    const fang = K.uvMat('wolf-fang', 16, 32, (u, v, o) => K.tone(hex('#f2ead6'), K.band(0.62 + Math.cos(u * 6.28) * 0.2 - v * 0.15, 3), o.col));
    const parts = []; for (const s of [-1, 1]) { parts.push([curved([0.035 * s, 1.025, 0.955], [0, -1, 0.1], 0.035, 0.009, [0, 0, -0.004], 5, 5), 'head'], [curved([0.03 * s, 1.008, 0.935], [0, 1, 0.1], 0.028, 0.008, [0, 0, 0.004], 5, 5), 'jaw']); }
    rigidSkinned(ctx.B, parts, ctx.own(fang), ctx.model);
  },
  idle(P, t, st) {
    const br = Math.sin(t * 2.2), sw = Math.sin(t * 0.6);
    add(P, 'spine2', br * 0.015); add(P, 'spine3', -br * 0.01, sw * 0.03); add(P, 'neck1', 0.05 + Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.45) * 0.15); add(P, 'head', 0.05, Math.sin(t * 0.45 + 0.5) * 0.15, Math.sin(t * 0.3) * 0.08);
    add(P, 'jaw', 0.12 + Math.max(0, br) * 0.1 + (st.talk > 0 ? Math.abs(Math.sin(t * 16)) * 0.4 : 0)); // panting
    for (let i = 1; i <= 4; i++) add(P, 'tail' + i, 0.08, Math.sin(t * 2.5 - i * 0.6) * 0.06 * i, 0);
    add(P, 'ear_L', Math.max(0, Math.sin(t * 0.8) - 0.9) * 4); add(P, 'ear_R', Math.max(0, Math.sin(t * 0.7 + 2) - 0.9) * 4);
  },
  gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) { add(P, n, Math.sin(g + ph) * 0.6 * a); } add(P, 'fore_L', -Math.max(0, Math.cos(g)) * 0.7 * a); add(P, 'fore_R', -Math.max(0, -Math.cos(g)) * 0.7 * a); add(P, 'hock_L', -Math.max(0, -Math.cos(g)) * 0.5 * a); add(P, 'hock_R', -Math.max(0, Math.cos(g)) * 0.5 * a); },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.12, rot: 1.38, lift: 0.08, slide: 0.05, t0: 0.3, t1: 0.62 }),
};
export const createWolf = (seed) => createGeneric(SPEC, seed);
export const warmWolf = () => void A();
