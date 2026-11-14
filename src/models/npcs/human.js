// Event characters on the SAME human base as Newton: the Limbo Phobia engine (src/models/limbo), realistic low-poly
// (octagon rings, flat shading, its hand-made pixel page) with Greek dress repainted through a paint hook (chiton,
// peplos, robe, loincloth, towel with folds and trims), hair and beards from the engine's styles, age and build
// pushed per character, and a library of held poses (kneel, push, chained, fly, fall, bathe, offer, sit...) blended
// under the talk / point / cheer / laugh / hurt clips. sculptHead stays for the Sphinx's sculpted human face.
import { THREE, K, hex, limboBeast, mount, recolor, near } from '../beasts/humanoid.js';
import { makeBones, rigidSkinned } from '../beasts/rig.js';

const lerp = (a, b, t) => a + (b - a) * t;
const add = (P, n, x = 0, y = 0, z = 0) => { const o = (P[n] ||= [0, 0, 0]); o[0] += x; o[1] += y; o[2] += z; };

// ------------------------------------------------------------------ the sculpted head (the Sphinx's face), relative to the head joint
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

// ------------------------------------------------------------------ held poses (authored on the generic humanoid names, mapped to the engine's joints)
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


const MAPN = { hips: 'hips', spine1: 'spine', spine2: 'chest', spine3: 'chest', neck: 'neck', head: 'head', uparm_L: 'uarmL', uparm_R: 'uarmR', forearm_L: 'farmL', forearm_R: 'farmR', hand_L: 'handL', hand_R: 'handR', thigh_L: 'thighL', thigh_R: 'thighR', shin_L: 'shinL', shin_R: 'shinR', foot_L: 'footL', foot_R: 'footR' };
const mapClip = (keys) => keys.map(([t, P]) => { const Q = {}; for (const [n, r] of Object.entries(P)) { if (n === '_pos') Q._pos = r; const m = MAPN[n]; if (m) add(Q, m, ...r); } return [t, Q]; });
const HAIR = { curls: 'curly', long: 'long', bald: 'bald', wild: 'afro' };
const numOf = (c) => parseInt(String(c || '#888888').replace('#', ''), 16);
/** Greek dress painted over the engine's garments: cloth with folds, a woven trim at hems and neckline */
const dressHook = (o) => (paint, P, spec) => {
  const H = P.H; const C1 = hex(o.cloth || '#efe6d2'), C2 = hex(o.cloth2 || o.cloth || '#d8c8a8'), TR = hex(o.trim || '#b08a3a'); const TOP = [128, 128, 128], LEG = [100, 100, 100];
  const wrap = (fn) => (c, o2) => {
    fn(c, o2); const fold = Math.cos(Math.atan2(c.x, c.z) * 13 + c.y * 9) * 0.08;
    if (near(o2, TOP, 0.08) && Math.abs(o2[0] - 128) < 40) { const hem = Math.abs(c.y - P.shoulderY) < 0.012 * H || Math.abs(c.y - P.elbowY - 0.04 * H) < 0.01 * H; return recolor(o2, hem ? TR : C1, TOP, fold, c, 'cloth', 0.3); }
    if (near(o2, LEG, 0.08) && Math.abs(o2[0] - 100) < 40) { const hem = c.y < P.kneeY + 0.02 * H && c.y > P.kneeY - 0.01 * H; return recolor(o2, hem ? TR : C2, LEG, fold, c, 'cloth', 0.3); }
    if (near(o2, spec.skin, 0.12)) recolor(o2, spec.skin, spec.skin, 0, c, 'skin', o.age ?? 0.2);
  };
  return { ...paint, acc: wrap(paint.acc || paint.body), body: wrap(paint.body), skin: wrap(paint.skin) };
};
const OUTFIT = (o) => {
  const g = o.garment || 'chiton'; const top = { tex: 'c_tee', color: 0x808080 }, leg = { tex: 'c_skirt', color: 0x646464 };
  if (g === 'loin' || g === 'towel') return { legs: leg, legsKind: 'skirt' };
  return { torso: top, legs: leg, legsKind: 'skirt' };
};

// ------------------------------------------------------------------ the builder
/**
 * o: { id, H, sex 'm'|'f', bulk, skin, hair, hairC, beard, beardC, garment, cloth, cloth2, trim, eye, veil, wreath, sash, belly, age,
 *      props(ctx, J, H), idle(P, t, st, ctx), hover(t, st, ctx), pose }
 */
export function humanNPC(o) {
  const H = o.H ?? 1.75, fem = o.sex === 'f';
  const build = o.belly ? 'heavy' : (o.bulk ?? 1) > 1.15 ? 'broad' : (o.bulk ?? 1) < 0.9 ? 'slim' : 'average';
  const app = { skin: numOf(o.skin || '#e0a982'), hair: numOf(o.veil ? o.veilC || '#d8c8ec' : o.hairC || '#4a2c1c'), hairStyle: o.veil ? 'long' : HAIR[o.hair] || 'short', facialHair: o.beard ? 'beard' : 'none', build, bodyShape: fem ? 0.9 : 0.2, age: o.age ?? (o.beard === 'long' ? 0.75 : 0.25), eyeColor: numOf(o.eye || '#5a7ac0'), height: 1 };
  const clips = {}; for (const [k, v] of Object.entries(CLIPS)) clips[k] = mapClip(v);
  return (seed = 1) => {
    const spec = {
      id: 'npc-' + o.id, height: H, app, outfit: OUTFIT(o), hook: dressHook(o), overrides: { hairVolume: o.hair === 'wild' ? 1.5 : 1.1 }, clips, wounds: false, sway: 0.7, attack: 'attack', fall: true,
      hover: o.hover,
      build(ctx) {
        ctx.vars.J = {};
        if (o.wreath) { const lm = K.uvMat('npc-laurel', 32, 16, (u, v, o2) => { const leaf = Math.abs(((u * 18) % 1) - 0.5) < 0.3; K.tone(leaf ? hex('#4a7a34') : hex('#3a5a28'), K.band(0.5 + Math.cos(u * 6.28) * 0.15), o2.col); });
          const l = new K.Loft(4, 18).set((t, p) => p.set(0, t * 0.02, 0), () => [0.105, 0.11], {}); const w = K.mesh(l.geo, lm); mount(ctx, 'head', w, { at: [0, (ctx.P.browY + 0.03 - ctx.L.restOf('head').y) * ctx.sc, (ctx.P.hcz - ctx.L.restOf('head').z) * ctx.sc] }); }
        o.props?.(ctx, ctx.vars.J, H);
      },
      pose(addL, t, st, ctx) {
        const api = ctx.api, v = ctx.vars; const dt = Math.min(0.1, Math.max(0, t - (v.lt ?? t))); v.lt = t; v.w ||= {};
        const want = api.pose || 'stand'; for (const k of Object.keys(POSES)) { const target = k === want ? 1 : 0; v.w[k] = (v.w[k] ?? (k === want ? 1 : 0)) + (target - (v.w[k] ?? 0)) * Math.min(1, dt * (api.poseRate ?? 5)); }
        const Pz = {}; add(Pz, 'neck', 0, Math.sin(t * 0.45) * 0.12 + (api.lookY ?? 0)); add(Pz, 'head', 0.03 + (api.lookX ?? 0), Math.sin(t * 0.6 + 1) * 0.1, 0);
        for (const [k, w] of Object.entries(v.w)) if (w > 0.005) { const Q = {}; POSES[k](Q, t, st); for (const [b, r] of Object.entries(Q)) add(Pz, b, r[0] * w, r[1] * w, r[2] * w); }
        o.idle?.(Pz, t, st, ctx);
        let pos = null; for (const [n, r] of Object.entries(Pz)) { if (n === '_pos') { pos = r; continue; } const m = MAPN[n]; if (m) addL(m, r[0], r[1], r[2]); else if (v.wing?.[n]) v.wing[n].rotation.set(r[0], r[1], r[2]); }
        v.posePos = pos;
      },
      update(dt, ctx) { const p = ctx.vars.posePos; if (p) { ctx.model.position.x += p[0]; ctx.model.position.y += p[1]; ctx.model.position.z += p[2]; } },
    };
    const api = limboBeast(spec, seed); api.H = H; api.J = {}; api.pose = o.pose || 'stand'; return api;
  };
}

// ------------------------------------------------------------------ shared props
/** wing bones (kept for callers; the engine body carries the wings on its own chain) */
export function wingBones() {}
const add3l = (a, d, l, dy) => { const n = Math.hypot(...d); return [a[0] + (d[0] / n) * l, a[1] + (d[1] / n) * l + dy * l, a[2] + (d[2] / n) * l]; };
const feather = (a, dir, len, w) => new K.Loft(10, 6).set(K.curve([a, add3l(a, dir, len * 0.5, -0.02), add3l(a, dir, len, -0.06)]), (t) => [w * Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) * 0.9 + 0.004, 0.006], { ref: (t, n) => n.set(0, 1, 0) }).geo;
/** Icarus' wax-and-feather wings on their own shoulder/elbow/hand chain behind the engine's shoulders (metres) */
export function waxWings(ctx, J, H, { span = 1.0, col = '#f2e6c8', tip = '#d8b060', wax = '#f0c040', key = 'icarus-feather', drips = true } = {}) {
  const fm = K.uvMat(key, 32, 128, (u, v, o) => {
    const shaft = Math.abs(u - 0.5) < 0.04; const barb = Math.sin(v * 80 + Math.abs(u - 0.5) * 34) > 0.82; const drip = drips && v < 0.18 && Math.sin(u * 40) > 0.4;
    K.tone(drip ? hex(wax) : v > 0.75 ? hex(tip) : hex(col), K.band(0.55 + Math.cos(u * 6.28) * 0.12 + (shaft ? 0.2 : 0) + (barb ? -0.1 : 0)), o.col);
  });
  const k = H / 1.75; const rows = [['wroot', null, [0, 0, 0]]];
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) rows.push(['wing1' + L, 'wroot', [0.1 * s * k, 0.18 * k, -0.1 * k]], ['wing2' + L, 'wing1' + L, [0.3 * s * k, 0.24 * k, -0.15 * k]], ['wing3' + L, 'wing2' + L, [0.55 * s * k, 0.26 * k, -0.18 * k]]);
  const B = makeBones(rows); const parts = [];
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
    const w1 = B.map['wing1' + L].userData.rest.toArray(), w2 = B.map['wing2' + L].userData.rest.toArray(), w3 = B.map['wing3' + L].userData.rest.toArray(); const tip3 = [w3[0] + 0.32 * s * span * k, w3[1] - 0.02, w3[2] - 0.04];
    for (let i = 0; i < 11; i++) { const q = i / 10; parts.push([feather([lerp(w3[0], tip3[0], q), lerp(w3[1], tip3[1], q), lerp(w3[2], tip3[2], q)], [s * (0.3 + q * 0.9), -0.3, -0.5 + q * 0.2], (0.62 - Math.abs(q - 0.4) * 0.2) * span * k, 0.07), 'wing3' + L]); }
    for (let i = 0; i < 10; i++) { const q = i / 9; parts.push([feather([lerp(w2[0], w3[0], q), lerp(w2[1], w3[1], q), lerp(w2[2], w3[2], q)], [s * 0.15, -1, -0.25], 0.52 * span * k, 0.07), 'wing2' + L]); }
    for (let i = 0; i < 9; i++) { const q = i / 8; parts.push([feather([lerp(w1[0], w3[0], q), lerp(w1[1], w3[1], q) + 0.02, lerp(w1[2], w3[2], q)], [s * 0.1, -1, -0.15], 0.24 * span * k, 0.06), q < 0.5 ? 'wing2' + L : 'wing3' + L]); }
  }
  const g = new THREE.Group(); mount(ctx, 'chest', g); rigidSkinned(B, parts, fm, g); ctx.vars.wing = B.map;
}
/** a held object (apple, pipes...) in the engine's clenched fist */
export function inHand(ctx, J, H, side, obj, off = [0, -0.05, 0.04]) { mount(ctx, side === 'L' ? 'handL' : 'handR', obj, { at: [off[0] * H, -0.08 * ctx.sc + off[1] * H * 0.3, off[2] * H] }); return obj; }
export { THREE, K, hex };
