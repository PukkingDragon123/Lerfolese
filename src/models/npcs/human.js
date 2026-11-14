// Event characters: clothed Greek humans built on the beast pipeline (beasts/kit.js: implicit sculpt -> skinned,
// unwrapped, cel-painted mesh). A parametric body (build, sex, height), a sculpted head (skull, face, nose, brows,
// eyes, ears, lips, chin), hair styles (curls, long, wild, bald with a fringe, veil), beards, garments (chiton, robe,
// peplos, loincloth, towel, belt, sash) and a library of held poses (kneel, push, chained, fly, fall, bathe, offer)
// blended in under the talk / point / cheer / laugh / hurt clips. Built lazily, cached per character.
import { THREE, K, hex, humanRows, sculptHuman, asset, createGeneric, rigidSkinned, add, fallSide } from '../beasts/kit.js';

const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ the head, relative to the head joint
export function sculptHead(S, J, H, o) {
  const h = J.head, k = (H / 1.7) * (o.headK ?? 1); const P = (x, y, z) => [h[0] + x * k, h[1] + y * k, h[2] + z * k]; const R = (v) => v * k; const fem = o.sex === 'f';
  S.blob(P(0, 0.066, -0.01), [R(0.085), R(0.1), R(0.1)], 'head', { k: R(0.03), tag: 'skin', imp: 3 });
  S.blob(P(0, 0.011, 0.04), [R(0.072 * (fem ? 0.9 : 1)), R(0.085), R(0.07)], 'head', { k: R(0.03), tag: 'skin', imp: 3 });
  S.limb(P(0, 0.036, 0.1), P(0, 0.008, 0.122), R(0.011), R(0.016 * (o.nose ?? 1)), 'head', { k: R(0.012), tag: 'skin', imp: 4 });
  S.sym((s) => {
    S.blob(P(0.035 * s, 0.058, 0.095), [R(0.03), R(fem ? 0.007 : 0.011), R(0.016)], 'head', { k: R(0.008), tag: 'brow', imp: 4, rot: [0, 0, (o.browTilt ?? 0) * s] });
    S.blob(P(0.033 * s, 0.041, 0.092), [R(0.013), R(0.01 * (o.eyeOpen ?? 1)), R(0.009)], 'head', { k: R(0.004), tag: 'eye', dir: [0.2 * s, 0, 1], imp: 4 });
    S.blob(P(0.083 * s, 0.035, 0.0), [R(0.012), R(0.026), R(0.018)], 'head', { k: R(0.008), tag: 'skin' });
    if (fem) S.blob(P(0.05 * s, 0.005, 0.09), [R(0.02), R(0.014), R(0.01)], 'head', { k: R(0.01), tag: 'blush' });
  });
  S.blob(P(0, -0.054, 0.05), [R(0.068 * (fem ? 0.84 : 1)), R(0.042), R(0.06)], 'jaw', { k: R(0.02), tag: 'skin', imp: 3 });
  S.blob(P(0, -0.03, 0.104), [R(0.024), R(fem ? 0.009 : 0.007), R(0.01)], 'jaw', { k: R(0.005), tag: 'lip', imp: 4 });
  // hair
  const hair = o.hair || 'curls', ht = o.veil ? 'veil' : 'hair';
  if (hair !== 'bald') S.blob(P(0, 0.086, -0.04), [R(0.099), R(0.1), R(0.11)], 'head', { k: R(0.03), tag: ht });
  else { S.blob(P(0, 0.02, -0.075), [R(0.09), R(0.07), R(0.06)], 'head', { k: R(0.02), tag: 'hair' }); S.sym((s) => S.blob(P(0.08 * s, 0.05, -0.02), [R(0.025), R(0.04), R(0.05)], 'head', { k: R(0.015), tag: 'hair' })); }
  if (hair === 'curls') for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 * 2.618, u = 0.15 + ((i * 0.37) % 0.8); const y = 0.06 + u * 0.1, r = Math.sqrt(1 - u * u) * 0.1; S.blob(P(Math.sin(a) * r, y, -0.04 + Math.cos(a) * r * 1.1), [R(0.026), R(0.024), R(0.026)], 'head', { k: R(0.01), tag: 'hair' }); }
  if ((hair === 'long' || hair === 'wild') && !o.veil) {
    const n = hair === 'wild' ? 11 : 8, len = o.hairLen ?? (hair === 'wild' ? 0.36 : 0.3);
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 2.6; const tip = P(Math.sin(a) * (0.13 + (hair === 'wild' ? 0.06 : 0)), 0.04 - len, -0.08 - Math.abs(Math.sin(a)) * 0.02 + (hair === 'wild' ? (i % 2) * 0.05 : 0)); S.limb(P(Math.sin(a) * 0.085, 0.07, -0.05 + Math.cos(a) * 0.02), tip, R(0.034), R(0.012), i % 2 ? 'neck' : 'head', { k: R(0.02), tag: ht }); }
  }
  if (o.veil) { // a draped mantle, not hair: a hood set back over the crown, a gold fillet across the brow, broad folds onto the shoulders and down the back
    S.blob(P(0, 0.1, -0.035), [R(0.112), R(0.098), R(0.122)], 'head', { k: R(0.025), tag: 'veil' });
    for (let i = 0; i < 14; i++) { const a = (i / 13 - 0.5) * 3.3; S.blob(P(Math.sin(a) * 0.108, 0.085 + Math.cos(a) * 0.012, -0.03 + Math.cos(a) * 0.1), [R(0.016), R(0.011), R(0.016)], 'head', { k: R(0.006), tag: 'trim' }); }
    S.sym((s) => { S.limb(P(0.098 * s, 0.07, -0.02), P(0.2 * s, -0.27, -0.03), R(0.04), R(0.085), 'neck', { k: R(0.03), tag: 'veil' }); S.limb(P(0.07 * s, 0.07, -0.09), P(0.14 * s, -0.5, -0.17), R(0.05), R(0.1), 'neck', { k: R(0.03), tag: 'veil' }); });
    S.limb(P(0, 0.08, -0.11), P(0, -0.56, -0.2), R(0.1), R(0.17), 'neck', { k: R(0.03), tag: 'veil' });
  }
  if (o.beard) { S.blob(P(0, -0.065, 0.075), [R(0.074), R(0.068), R(0.052)], 'jaw', { k: R(0.02), tag: 'beard', imp: 2 }); S.limb(P(0, -0.1, 0.09), P(0, o.beard === 'long' ? -0.24 : -0.17, 0.085), R(0.045), R(0.012), 'jaw', { k: R(0.02), tag: 'beard' }); S.sym((s) => S.blob(P(0.05 * s, -0.01, 0.07), [R(0.02), R(0.05), R(0.03)], 'jaw', { k: R(0.012), tag: 'beard' })); }
  if (o.wreath) for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S.blob(P(Math.sin(a) * 0.098, 0.105 + Math.cos(a) * 0.012, -0.03 + Math.cos(a) * 0.104), [R(0.022), R(0.012), R(0.034)], 'head', { k: R(0.006), tag: 'laurel', dir: [Math.cos(a), 0.5, -Math.sin(a)] }); }
}

// ------------------------------------------------------------------ garments (in body-height units)
function sculptClothes(S, J, H, o) {
  const P = (x, y, z) => [x * H, y * H, z * H]; const R = (v) => v * H; const b = o.bulk ?? 1; const g = o.garment || 'chiton';
  if (o.sex === 'f') S.sym((s) => S.blob(P(0.045 * s, 0.735, 0.05), [R(0.04), R(0.036), R(0.034)], 'spine3', { k: R(0.02), tag: g === 'none' ? 'skin' : 'cloth' }));
  if (['chiton', 'robe', 'peplos'].includes(g)) {
    S.blob(P(0, 0.7, -0.004), [R(0.112 * b), R(0.1), R(0.083 * b)], 'spine2', { k: R(0.03), tag: 'cloth' });
    S.blob(P(0, 0.62, 0), [R(0.092 * b), R(0.07), R(0.07 * b)], 'spine1', { k: R(0.03), tag: 'cloth' });
    const bottom = g === 'chiton' ? 0.33 : 0.035, r1 = g === 'chiton' ? 0.13 : 0.135;
    S.limb(P(0, 0.58, 0), P(0, bottom, 0.01), R(0.1 * b), R(r1 * b), 'hips', { k: R(0.03), tag: 'cloth' });
    S.blob(P(0, 0.595, 0), [R(0.098 * b), R(0.012), R(0.075 * b)], 'spine1', { k: R(0.006), tag: 'trim' }); // the girdle
    S.limb(P(0.1, 0.8, 0.02), P(-0.08, 0.6, 0.06), R(0.02), R(0.02), ['spine3', 'spine1'], { k: R(0.01), tag: 'cloth2' }); // a draped himation fold
    if (g === 'peplos') S.blob(P(0, 0.64, 0.01), [R(0.12 * b), R(0.05), R(0.09 * b)], 'spine1', { k: R(0.02), tag: 'cloth2' });
  }
  if (g === 'loin') { // a short wrapped kilt with a knotted belt (it covers the hips and the tops of the thighs)
    S.limb(P(0, 0.565, 0), P(0, 0.415, 0.006), R(0.096 * b), R(0.118 * b), 'hips', { k: R(0.02), tag: 'cloth' });
    S.blob(P(0, 0.56, 0.004), [R(0.1 * b), R(0.014), R(0.08 * b)], 'hips', { k: R(0.006), tag: 'trim' });
  }
  if (g === 'towel') { S.limb(P(0.11, 0.81, 0.0), P(0.06, 0.62, 0.06), R(0.04), R(0.05), ['spine3', 'spine2'], { k: R(0.02), tag: 'cloth' }); S.blob(P(0, 0.515, 0.005), [R(0.098 * b), R(0.06), R(0.078 * b)], 'hips', { k: R(0.02), tag: 'cloth' }); }
  if (o.sash) S.limb(P(0.11, 0.8, 0.03), P(-0.1, 0.57, 0.04), R(0.016), R(0.016), ['spine3', 'spine1'], { k: R(0.008), tag: 'trim' });
}

// ------------------------------------------------------------------ held poses (blended in by weight)
export const POSES = {
  stand(P, t) { add(P, 'uparm_L', 0.05, 0, 0.12); add(P, 'uparm_R', 0.05, 0, -0.12); add(P, 'forearm_L', -0.2); add(P, 'forearm_R', -0.2); },
  kneel(P) { add(P, '_pos', 0, -0.42, 0); add(P, 'thigh_L', -1.45); add(P, 'shin_L', 1.45); add(P, 'thigh_R', -0.1); add(P, 'shin_R', 1.75); add(P, 'foot_R', 0.5); add(P, 'spine1', 0.25); add(P, 'spine2', 0.15); add(P, 'neck', 0.25); add(P, 'head', 0.35); add(P, 'uparm_L', -0.7); add(P, 'forearm_L', -0.6); add(P, 'uparm_R', -0.4, 0, -0.1); add(P, 'forearm_R', -0.4); },
  push(P, t) { const s = Math.sin(t * 2.2) * 0.06; add(P, '_pos', 0, -0.06, 0); add(P, 'spine1', 0.45 + s); add(P, 'spine2', 0.25); add(P, 'neck', -0.2); add(P, 'head', -0.25); for (const L of ['_L', '_R']) { add(P, 'uparm' + L, -1.35, 0, L === '_L' ? -0.15 : 0.15); add(P, 'forearm' + L, -0.55 + s); } add(P, 'thigh_L', -0.7); add(P, 'shin_L', 0.7); add(P, 'thigh_R', 0.55 + s); add(P, 'shin_R', 0.25); add(P, 'foot_R', 0.3); },
  chained(P, t) { const sag = Math.sin(t * 0.8) * 0.05; add(P, 'uparm_L', -0.2, 0, 2.3 + sag); add(P, 'uparm_R', -0.2, 0, -2.3 - sag); add(P, 'forearm_L', -0.3); add(P, 'forearm_R', -0.3); add(P, 'spine2', 0.08); add(P, 'head', 0.25 + sag); },
  fly(P, t) { add(P, 'spine1', 0.35); add(P, 'spine2', 0.2); add(P, 'head', -0.45); add(P, 'uparm_L', -0.2, 0, 1.25 + Math.sin(t * 6) * 0.2); add(P, 'uparm_R', -0.2, 0, -1.25 - Math.sin(t * 6) * 0.2); add(P, 'thigh_L', 0.25); add(P, 'thigh_R', 0.45); add(P, 'shin_L', 0.4); add(P, 'shin_R', 0.6); },
  fall(P, t) { const a = Math.sin(t * 9), b = Math.cos(t * 7); add(P, 'spine1', -0.3); add(P, 'head', -0.5 + a * 0.2); add(P, 'uparm_L', -1.5 + a * 0.8, 0, 1.0); add(P, 'uparm_R', -1.5 - a * 0.8, 0, -1.0); add(P, 'forearm_L', -0.8); add(P, 'forearm_R', -0.8); add(P, 'thigh_L', -0.9 + b * 0.5); add(P, 'thigh_R', -0.4 - b * 0.5); add(P, 'shin_L', 1.0); add(P, 'shin_R', 0.6); },
  sprawl(P) { add(P, '_pos', 0, -0.62, -0.2); add(P, 'spine1', -0.6); add(P, 'spine2', -0.3); add(P, 'head', -0.2, 0.3, 0); add(P, 'uparm_L', 0.4, 0, 1.4); add(P, 'uparm_R', 0.2, 0, -1.1); add(P, 'thigh_L', -1.6); add(P, 'thigh_R', -1.3); add(P, 'shin_L', 0.4); add(P, 'shin_R', 0.9); },
  bathe(P, t) { add(P, '_pos', 0, -0.62, 0); add(P, 'thigh_L', -1.5); add(P, 'thigh_R', -1.5); add(P, 'shin_L', 1.2); add(P, 'shin_R', 1.2); add(P, 'spine1', -0.2); add(P, 'uparm_L', 0.2, 0, 0.9); add(P, 'uparm_R', 0.2, 0, -0.9); add(P, 'forearm_L', -0.8); add(P, 'forearm_R', -0.8); add(P, 'head', -0.1, Math.sin(t * 0.6) * 0.2, 0); },
  offer(P, t) { add(P, 'uparm_R', -1.2, 0, -0.2); add(P, 'forearm_R', -0.6); add(P, 'hand_R', -0.3); add(P, 'uparm_L', 0.1, 0, 0.3); add(P, 'head', 0.1, 0.15, 0); add(P, 'spine2', 0.05, -0.1, 0); },
  sit(P) { add(P, '_pos', 0, -0.32, -0.05); add(P, 'thigh_L', -1.45); add(P, 'thigh_R', -1.45); add(P, 'shin_L', 1.4); add(P, 'shin_R', 1.4); add(P, 'uparm_L', -0.3, 0, 0.2); add(P, 'uparm_R', -0.3, 0, -0.2); add(P, 'forearm_L', -0.9); add(P, 'forearm_R', -0.9); },
  gaze(P, t) { add(P, 'neck', 0.35); add(P, 'head', 0.45 + Math.sin(t * 0.5) * 0.03); add(P, 'spine2', 0.15); },
  stretch(P, t) { const s = Math.sin(t * 2.5); add(P, 'uparm_L', -2.6 + s * 0.2, 0, 0.2); add(P, 'uparm_R', -2.6 - s * 0.2, 0, -0.2); add(P, 'spine1', -0.1); add(P, 'head', -0.2); },
};
const CLIPS = {
  talk: [[0, {}], [0.25, { uparm_R: [-0.8, 0, -0.35], forearm_R: [-0.9, 0, 0], head: [0.05, -0.1, 0.05], spine2: [0, -0.08, 0] }], [0.9, { uparm_R: [-0.6, 0, -0.25], forearm_R: [-0.7, 0, 0], head: [-0.05, 0.08, -0.04] }], [1.4, {}]],
  point: [[0, {}], [0.3, { uparm_R: [-1.5, 0.2, -0.2], forearm_R: [-0.1, 0, 0], head: [0, -0.2, 0], spine2: [0, -0.15, 0] }], [1.2, { uparm_R: [-1.5, 0.2, -0.2], forearm_R: [-0.1, 0, 0] }], [1.6, {}]],
  cheer: [[0, {}], [0.25, { uparm_L: [-0.3, 0, 2.5], uparm_R: [-0.3, 0, -2.5], forearm_L: [0, 0, 0.3], forearm_R: [0, 0, -0.3], head: [-0.3, 0, 0], _pos: [0, 0.12, 0] }], [0.5, { uparm_L: [-0.2, 0, 2.3], uparm_R: [-0.2, 0, -2.3], _pos: [0, 0, 0] }], [0.75, { uparm_L: [-0.3, 0, 2.5], uparm_R: [-0.3, 0, -2.5], _pos: [0, 0.1, 0] }], [1.3, {}]],
  laugh: [[0, {}], [0.2, { spine2: [-0.2, 0, 0], head: [-0.45, 0, 0], jaw: [0.35, 0, 0], uparm_L: [0.2, 0, 0.4], uparm_R: [0.2, 0, -0.4] }], [0.45, { spine2: [-0.1, 0, 0], head: [-0.3, 0, 0], jaw: [0.2, 0, 0] }], [0.7, { spine2: [-0.22, 0, 0], head: [-0.45, 0, 0], jaw: [0.35, 0, 0] }], [1.2, {}]],
  attack: [[0, {}], [0.3, { uparm_R: [-2.2, 0, -0.3], spine2: [-0.15, 0.3, 0] }], [0.45, { uparm_R: [-0.6, 0, -0.1], spine2: [0.2, -0.2, 0], _pos: [0, 0, 0.15] }], [0.9, {}]],
  cast: [[0, {}], [0.3, { uparm_L: [-1.6, 0, 0.3], uparm_R: [-1.6, 0, -0.3], head: [-0.2, 0, 0] }], [1.1, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0, -0.18], spine1: [-0.2, 0.1, 0.05], spine2: [-0.15, 0, 0], head: [-0.4, 0.3, 0.1], uparm_L: [-0.4, 0, 0.6], uparm_R: [-0.3, 0, -0.7] }], [0.35, { head: [0.1, -0.1, 0] }], [0.7, {}]],
  die: [[0, {}], [0.2, { spine2: [-0.3, 0, 0], head: [-0.4, 0.2, 0], uparm_L: [0, 0, 0.7], uparm_R: [0, 0, -0.7] }], [0.6, { spine1: [0.3, 0, 0], thigh_L: [-0.6, 0, 0], shin_L: [1.0, 0, 0] }]],
};

// ------------------------------------------------------------------ the builder
/**
 * o: { id, H, sex 'm'|'f', bulk, skin, hair, hairC, beard, beardC, garment, cloth, cloth2, trim, eye, veil, wreath, sash, belly,
 *      headK, nose, browTilt, props(ctx), extraBones(rows), sculpt(S, J), pal{}, idle(P,t,st,ctx), hover(t,st,ctx), follow{} }
 */
export function humanNPC(o) {
  const H = o.H ?? 1.75, fem = o.sex === 'f';
  const BONES = humanRows(H, { sw: fem ? 0.9 : 1, hw: fem ? 1.08 : 1 }); o.extraBones?.(BONES, H); const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
  const PAL = {
    skin: { s: 'skin', c: hex(o.skin || '#e0a982') }, blush: { s: 'skin', c: hex(o.blush || '#e89a8a') }, brow: { s: 'skin', c: hex(o.browC || o.hairC || '#4a2c1c') },
    lip: { s: 'skin', c: hex(o.lip || (fem ? '#b24a52' : '#a85a50')) }, hair: { s: 'hair', c: hex(o.hairC || '#4a2c1c'), fs: 44 }, beard: { s: 'hair', c: hex(o.beardC || o.hairC || '#4a2c1c'), fs: 60 },
    eye: { s: 'eye', c: hex(o.eye || '#5a7ac0'), white: hex('#f4eee2'), irisR: 0.55, pupil: 'round', iris: 0.95 }, cloth: { s: 'cloth', c: hex(o.cloth || '#efe6d2'), folds: 13 },
    cloth2: { s: 'cloth', c: hex(o.cloth2 || o.cloth || '#d8c8a8'), folds: 8 }, trim: { s: 'cloth', c: hex(o.trim || '#b08a3a'), folds: 30 }, veil: { s: 'cloth', c: hex(o.veilC || '#e8e0f0'), folds: 16 },
    laurel: { s: 'scale', c: hex('#6aa040'), sz: 0.012 }, default: { s: 'skin', c: hex(o.skin || '#e0a982') }, ...(o.pal || {}),
  };
  const sculpt = (S) => {
    sculptHuman(S, J, H, { bulk: o.bulk ?? (fem ? 0.82 : 1), belly: o.belly, tags: { body: 'skin' } });
    sculptClothes(S, J, H, o); sculptHead(S, J, H, o); o.sculpt?.(S, J, H);
  };
  const A = () => asset('npc:' + o.id, { bones: BONES, sculpt, pal: PAL, cell: 0.011 * (H / 1.75), target: 11000, atlas: 640, maxChart: 0.02, wounds: 0 });
  const SPEC = {
    id: o.id, bones: BONES, height: H, asset: A, clips: { ...CLIPS, ...(o.clips || {}) }, impact: 0.45,
    follow: { head: [18, 0.45], ...(o.follow || {}) },
    props: o.props ? (ctx) => o.props(ctx, J, H) : undefined,
    idle(P, t, st, ctx) {
      const v = ctx.vars; const now = t; const dt = Math.min(0.1, Math.max(0, now - (v.lt ?? now))); v.lt = now; v.w ||= {};
      const want = ctx.api.pose || 'stand'; for (const k of Object.keys(POSES)) { const target = k === want ? 1 : 0; v.w[k] = (v.w[k] ?? (k === want ? 1 : 0)) + (target - (v.w[k] ?? 0)) * Math.min(1, dt * (ctx.api.poseRate ?? 5)); }
      const br = Math.sin(t * 1.5); add(P, 'spine2', br * 0.015); add(P, 'neck', 0, Math.sin(t * 0.45) * 0.12 + (ctx.api.lookY ?? 0)); add(P, 'head', 0.03 + (ctx.api.lookX ?? 0), Math.sin(t * 0.6 + 1) * 0.1, Math.sin(t * 0.4) * 0.04);
      add(P, 'jaw', st.talk > 0 ? Math.abs(Math.sin(t * 15)) * 0.22 : 0);
      for (const [k, w] of Object.entries(v.w)) if (w > 0.005) { const Q = {}; POSES[k](Q, t, st); for (const [b, r] of Object.entries(Q)) add(P, b, r[0] * w, r[1] * w, r[2] * w); }
      o.idle?.(P, t, st, ctx);
    },
    hover: o.hover, after: o.after, death: (T, m, ctx) => fallSide(T, m, ctx),
  };
  return (seed = 1) => { const api = createGeneric(SPEC, seed); api.J = J; api.H = H; api.pose = o.pose || 'stand'; return api; };
}

// ------------------------------------------------------------------ shared props
/** big feathered wings on wing1..3 bones (Icarus): primaries, secondaries, coverts; wax-yellow with drips */
export function wingBones(rows, H, back = -0.11) {
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) rows.push(['wing1' + L, 'spine3', [0.09 * s, 0.78 * H, back * H]], ['wing2' + L, 'wing1' + L, [0.3 * s, 0.84 * H, (back - 0.05) * H]], ['wing3' + L, 'wing2' + L, [0.55 * s, 0.86 * H, (back - 0.08) * H]]);
}
const add3l = (a, d, l, dy) => { const n = Math.hypot(...d); return [a[0] + (d[0] / n) * l, a[1] + (d[1] / n) * l + dy * l, a[2] + (d[2] / n) * l]; };
const feather = (a, dir, len, w) => new K.Loft(10, 6).set(K.curve([a, add3l(a, dir, len * 0.5, -0.02), add3l(a, dir, len, -0.06)]), (t) => [w * Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) * 0.9 + 0.004, 0.006], { ref: (t, n) => n.set(0, 1, 0) }).geo;
export function waxWings(ctx, J, H, { span = 1.0, col = '#f2e6c8', tip = '#d8b060', wax = '#f0c040', key = 'icarus-feather', drips = true } = {}) {
  const fm = ctx.own(K.uvMat(key, 32, 128, (u, v, o) => {
    const shaft = Math.abs(u - 0.5) < 0.04; const barb = Math.sin(v * 80 + Math.abs(u - 0.5) * 34) > 0.82; const drip = drips && v < 0.18 && Math.sin(u * 40) > 0.4;
    K.tone(drip ? hex(wax) : v > 0.75 ? hex(tip) : hex(col), K.band(0.55 + Math.cos(u * 6.28) * 0.18 + (shaft ? 0.25 : 0) + (barb ? -0.1 : 0), 4), o.col);
  }));
  const parts = [];
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
    const w1 = J['wing1' + L], w2 = J['wing2' + L], w3 = J['wing3' + L]; const tip = [w3[0] + 0.32 * s * span, w3[1] - 0.02, w3[2] - 0.04];
    for (let i = 0; i < 11; i++) { const k = i / 10; const a = [lerp(w3[0], tip[0], k), lerp(w3[1], tip[1], k), lerp(w3[2], tip[2], k)]; parts.push([feather(a, [s * (0.3 + k * 0.9), -0.3, -0.5 + k * 0.2], (0.62 - Math.abs(k - 0.4) * 0.2) * span * H / 1.75, 0.07), 'wing3' + L]); }
    for (let i = 0; i < 10; i++) { const k = i / 9; const a = [lerp(w2[0], w3[0], k), lerp(w2[1], w3[1], k), lerp(w2[2], w3[2], k)]; parts.push([feather(a, [s * 0.15, -1, -0.25], 0.52 * span * H / 1.75, 0.07), 'wing2' + L]); }
    for (let i = 0; i < 9; i++) { const k = i / 8; const a = [lerp(w1[0], w3[0], k), lerp(w1[1], w3[1], k) + 0.02, lerp(w1[2], w3[2], k)]; parts.push([feather(a, [s * 0.1, -1, -0.15], 0.24 * span, 0.06), k < 0.5 ? 'wing2' + L : 'wing3' + L]); }
  }
  rigidSkinned(ctx.B, parts, fm, ctx.model);
}
/** a held object (apple, pipes...) parented to a hand bone at the clenched fist */
export function inHand(ctx, J, H, side, obj, off = [0, -0.05, 0.04]) {
  const L = side === 'L' ? '_L' : '_R'; const b = ctx.B.map['hand' + L]; if (!b) return obj; const j = J['hand' + L];
  obj.position.set(off[0] * H, off[1] * H, off[2] * H); b.add(obj); void j; return obj;
}
export { THREE, K, hex };
