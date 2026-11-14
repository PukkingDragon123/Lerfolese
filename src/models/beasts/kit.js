// Generic beast kit on top of the flesh/rig pipeline: humanoid and quadruped skeleton + anatomy templates, a style-
// driven cel painter (skin, fur, scales, feathers, bone, bronze with glowing seams, wood, rock, cloth, eyes), sculpted
// props (helmets, shields, clubs, boulders) and a spec-driven creature driver that wires the battle conventions:
// idle, additive key clips with anticipation/strike/follow-through, impactTime + onImpact, spring followers,
// knockback, a weighted death fall, wounds and highlight.
import * as THREE from 'three';
import { K } from './look.js';
import { Spring } from '../../core/tween.js';
import { Sculpt, bake } from './flesh.js';
import { makeBones, skinned, onBone, sample, add, apply, battleRig, paintWounds, woundMat, woundTex, rigidSkinned, skinAttrs } from './rig.js';

export { K, THREE, Sculpt, onBone, rigidSkinned, add, sample, skinned, skinAttrs };
export const { hex } = K;
export const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const joints = (rows) => Object.fromEntries(rows.map(([n, , p]) => [n, p]));
/** a curved tapering loft from a, along dir for len, bowed by bend (spikes, claws, teeth, feathers) */
export const curved = (a, dir, len, r, bend = [0, 0, 0], rings = 8, sides = 8, flat = 1) => new K.Loft(rings, sides).set(K.curve([a, add3(add3(a, dir, len * 0.5), bend, 0.5), add3(add3(a, dir, len), bend)]), (t) => { const w = r * (1 - t) + 0.002; return [w, w * flat]; }).geo;

// ================================================================== humanoid template (normalised to height H)
export function humanRows(H, o = {}) {
  const sw = o.sw ?? 1, hw = o.hw ?? 1, ah = o.armAngle ?? 1; const P = (x, y, z) => [x * H, y * H, z * H];
  const rows = [['root', null, [0, 0, 0]], ['hips', 'root', P(0, 0.53, 0)], ['spine1', 'hips', P(0, 0.6, -0.005)], ['spine2', 'spine1', P(0, 0.68, -0.01)], ['spine3', 'spine2', P(0, 0.76, -0.012)],
    ['neck', 'spine3', P(0, 0.835, 0)], ['head', 'neck', P(0, 0.885, 0.012)], ['jaw', 'head', P(0, 0.885, 0.03)]];
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
    const sx = 0.125 * sw;
    if (o.arms !== false) rows.push(['clav' + L, 'spine3', P(0.03 * s, 0.815, 0.005)], ['uparm' + L, 'clav' + L, P(sx * s, 0.805, -0.005)], ['forearm' + L, 'uparm' + L, P((sx + 0.075 * ah) * s, 0.635, -0.02)], ['hand' + L, 'forearm' + L, P((sx + 0.115 * ah) * s, 0.475, 0.008)]);
    if (o.legs !== false) rows.push(['thigh' + L, 'hips', P(0.06 * hw * s, 0.51, 0)], ['shin' + L, 'thigh' + L, P(0.072 * hw * s, 0.28, 0.012)], ['foot' + L, 'shin' + L, P(0.08 * hw * s, 0.05, -0.012)]);
  }
  if (o.off) for (const r of rows) r[2] = add3(r[2], o.off);
  return rows;
}
export const fistFrame = (J, L) => {
  const el = new THREE.Vector3(...J['forearm' + L]), wr = new THREE.Vector3(...J['hand' + L]); const z = wr.clone().sub(el).normalize(); const s = Math.sign(wr.x) || 1;
  const x = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), z).normalize(); const y = new THREE.Vector3().crossVectors(z, x); return { x, y, z, s, wr };
};
/** a clenched hand: rounded palm, four knuckled fingers curled into the palm, thumb wrapped over; returns its centre */
export function sculptFist(S, J, L, H, b, tag) {
  const F = fistFrame(J, L); const c = F.wr.clone().addScaledVector(F.z, 0.04 * H); const h = H * b; const pd = -F.s; // palm side along -x*s
  const at = (x, y, z) => [c.x + F.x.x * x + F.y.x * y + F.z.x * z, c.y + F.x.y * x + F.y.y * y + F.z.y * z, c.z + F.x.z * x + F.y.z * y + F.z.z * z];
  const o = { k: 0.006 * H, tag, imp: 2 };
  S.blob(c.toArray(), [0.017 * h, 0.026 * h, 0.028 * h], 'hand' + L, { ...o, k: 0.01 * H, dir: F.z.toArray(), up: F.y.toArray() });
  for (let i = 0; i < 4; i++) {
    const y = (-0.02 + i * 0.0135) * h, r = (0.0078 - Math.abs(i - 1.2) * 0.0007) * h;
    const k1 = at(0.002 * h * -pd, y, 0.026 * h), k2 = at(pd * 0.014 * h, y, 0.036 * h), k3 = at(pd * 0.022 * h, y, 0.02 * h);
    S.blob(k1, [r * 1.15, r * 1.05, r * 1.1], 'hand' + L, o); S.limb(k1, k2, r, r * 0.95, 'hand' + L, o); S.limb(k2, k3, r * 0.95, r * 0.85, 'hand' + L, o);
  }
  S.limb(at(pd * 0.006 * h, 0.022 * h, -0.008 * h), at(pd * 0.018 * h, 0.026 * h, 0.012 * h), 0.009 * h, 0.008 * h, 'hand' + L, o);
  S.limb(at(pd * 0.018 * h, 0.026 * h, 0.012 * h), at(pd * 0.024 * h, 0.012 * h, 0.026 * h), 0.008 * h, 0.007 * h, 'hand' + L, o);
  return { c, F };
}
/** muscular human anatomy over humanRows (head left to the creature). m: bulk, belly, tags{}, arms, legs, fists */
export function sculptHuman(S, J, H, m = {}) {
  const b = m.bulk ?? 1, T = { body: 'skin', chest: null, arm: null, leg: null, hand: null, foot: null, neck: null, belly: null, ...(m.tags || {}) };
  const O = m.off || [0, 0, 0]; const tg = (k) => T[k] || T.body; const P = (x, y, z) => [x * H + O[0], y * H + O[1], z * H + O[2]]; const R = (r) => r * H;
  S.blob(P(0, 0.535, -0.012), [R(0.085 * b), R(0.062), R(0.066 * b)], 'hips', { k: R(0.025), tag: tg('body') });
  S.sym((s) => S.blob(P(0.042 * s, 0.52, -0.045), [R(0.046 * b), R(0.05), R(0.042 * b)], 'hips', { k: R(0.02), tag: tg('body') }));
  S.muscle(P(0, 0.55, 0), P(0, 0.67, -0.005), R(0.076 * b), R(0.058 * b), ['hips', 'spine1'], { k: R(0.03), tag: tg('body'), up: [0, 0, 1] });
  if (m.belly) S.blob(P(0, 0.6, 0.03 + m.belly * 0.02), [R(0.06 + m.belly * 0.04), R(0.075), R(0.04 + m.belly * 0.035)], 'spine1', { k: R(0.03), tag: tg('belly') });
  else { S.blob(P(0, 0.625, 0.042 * b), [R(0.044 * b), R(0.07), R(0.026)], 'spine1', { k: R(0.02), tag: tg('belly') }); for (const [y, bn] of [[0.66, 'spine2'], [0.627, 'spine1'], [0.594, 'spine1']]) S.sym((s) => S.blob(P(0.02 * s * b, y, 0.064 * b - (0.66 - y) * 0.1), [R(0.019 * b), R(0.015), R(0.013)], bn, { k: R(0.008), tag: tg('belly') })); }
  S.sym((s) => S.blob(P(0.08 * s * b, 0.585, 0.012), [R(0.032 * b), R(0.05), R(0.048 * b)], 'spine1', { k: R(0.022), tag: tg('body') }));
  S.blob(P(0, 0.7, -0.008), [R(0.105 * b), R(0.088), R(0.076 * b)], 'spine2', { k: R(0.03), tag: tg('body') });
  S.sym((s) => {
    S.blob(P(0.05 * s * b, 0.738, 0.045 * b), [R(0.056 * b), R(0.038 * b), R(0.03 * b)], 'spine3', { k: R(0.018), tag: tg('chest'), rot: [0.15, 0.12 * s, -0.28 * s] });
    S.muscle(P(0.1 * s * b, 0.765, -0.035), P(0.06 * s * b, 0.63, -0.03), R(0.033 * b), R(0.036 * b), ['spine3', 'spine2'], { k: R(0.022), tag: tg('body') });
    S.muscle(P(0.012 * s, 0.84, -0.02), P(0.125 * s, 0.806, -0.012), R(0.034 * b), R(0.03 * b), ['neck', 'spine3'], { k: R(0.022), tag: tg('neck'), up: [0, 1, 0] });
  });
  S.limb(P(0, 0.8, -0.006), P(0, 0.892, 0.01), R(0.046 * b), R(0.036), ['neck', 'head'], { k: R(0.02), tag: tg('neck'), t0: 0.5, t1: 1 });
  if (m.arms !== false) S.sym((s, L) => {
    const sh = J['uparm' + L], el = J['forearm' + L], wr = J['hand' + L]; const fz = (p, z) => [p[0], p[1], p[2] + z * H];
    S.blob(add3(sh, [0, 0.006 * H, 0]), [R(0.048 * b), R(0.05 * b), R(0.05 * b)], ['clav' + L, 'uparm' + L], { k: R(0.02), tag: tg('arm'), t0: 0.3, t1: 0.7, dir: [0, -1, 0], up: [0, 0, 1] });
    S.limb(sh, el, R(0.037 * b), R(0.027 * b), 'uparm' + L, { k: R(0.015), tag: tg('arm') });
    S.muscle(fz(lerp3(sh, el, 0.2), 0.02 * b), fz(lerp3(sh, el, 0.82), 0.017 * b), R(0.024 * b), R(0.026 * b), 'uparm' + L, { k: R(0.012), tag: tg('arm') });
    S.muscle(fz(lerp3(sh, el, 0.15), -0.024 * b), fz(lerp3(sh, el, 0.8), -0.026 * b), R(0.026 * b), R(0.026 * b), 'uparm' + L, { k: R(0.012), tag: tg('arm') });
    S.limb(el, wr, R(0.029 * b), R(0.019 * b), ['uparm' + L, 'forearm' + L], { k: R(0.015), tag: tg('arm'), t0: 0, t1: 0.2 });
    S.muscle(fz(lerp3(el, wr, 0.04), 0.006 * b), fz(lerp3(el, wr, 0.55), 0.004), R(0.025 * b), R(0.023 * b), 'forearm' + L, { k: R(0.012), tag: tg('arm') });
    if (m.fists !== false) sculptFist(S, J, L, H, b, tg('hand'));
  });
  if (m.legs !== false) S.sym((s, L) => {
    const hp = J['thigh' + L], kn = J['shin' + L], an = J['foot' + L]; const fz = (p, z) => [p[0], p[1], p[2] + z * H];
    S.limb(hp, kn, R(0.062 * b), R(0.035 * b), 'thigh' + L, { k: R(0.022), tag: tg('leg') });
    S.muscle(fz(lerp3(hp, kn, 0.15), 0.028 * b), fz(lerp3(hp, kn, 0.85), 0.03 * b), R(0.042 * b), R(0.036 * b), 'thigh' + L, { k: R(0.016), tag: tg('leg') });
    S.muscle(fz(lerp3(hp, kn, 0.15), -0.03 * b), fz(lerp3(hp, kn, 0.85), -0.022 * b), R(0.04 * b), R(0.034 * b), 'thigh' + L, { k: R(0.016), tag: tg('leg') });
    S.blob(fz(kn, 0.016), [R(0.026 * b), R(0.028), R(0.024)], ['thigh' + L, 'shin' + L], { k: R(0.012), tag: tg('leg'), dir: [0, -1, 0] });
    S.limb(kn, an, R(0.036 * b), R(0.021 * b), 'shin' + L, { k: R(0.015), tag: tg('leg') });
    S.muscle(fz(lerp3(kn, an, 0.08), -0.024 * b), fz(lerp3(kn, an, 0.55), -0.022 * b), R(0.03 * b), R(0.032 * b), 'shin' + L, { k: R(0.013), tag: tg('leg') });
    S.box([an[0], 0.024 * H, an[2] + 0.04 * H], [R(0.023 * b), R(0.012), R(0.054)], R(0.012), 'foot' + L, { k: R(0.012), tag: tg('foot') });
  });
}

// ================================================================== quadruped template
/** o: Lb body length, Hw withers height, W half track, Ln neck length, Lh head length, tail segment count */
export function quadRows(o) {
  const { Lb, Hw, W, Ln, Lh, Hd = 0, tail = 4, tailDir = [0, -0.35, -1], tailLen = Lb * 0.7 } = o; const f = Lb * 0.5;
  const head = [0, Hw * 1.02 + Ln * 0.62 + Hd, f + Ln * 0.82];
  const rows = [['root', null, [0, 0, 0]], ['pelvis', 'root', [0, Hw * 0.93, -f]], ['spine1', 'pelvis', [0, Hw * 0.95, -f * 0.34]], ['spine2', 'spine1', [0, Hw * 0.98, f * 0.34]], ['spine3', 'spine2', [0, Hw * 1.0, f * 0.9]],
    ['neck1', 'spine3', [0, Hw * 1.02, f + 0.02]], ['neck2', 'neck1', [0, Hw * 1.02 + Ln * 0.35 + Hd * 0.5, f + Ln * 0.45]], ['head', 'neck2', head], ['jaw', 'head', [0, head[1] - Lh * 0.12, head[2] + Lh * 0.12]],
    ['ear_L', 'head', [Lh * 0.2, head[1] + Lh * 0.2, head[2] - Lh * 0.02]], ['ear_R', 'head', [-Lh * 0.2, head[1] + Lh * 0.2, head[2] - Lh * 0.02]]];
  const td = new THREE.Vector3(...tailDir).normalize(); let prev = 'pelvis', tp = [0, Hw * 0.95, -f - Lb * 0.12];
  for (let i = 1; i <= tail; i++) { rows.push(['tail' + i, prev, tp]); prev = 'tail' + i; tp = add3(tp, td.toArray(), tailLen / tail); }
  for (const [s, L] of [[1, '_L'], [-1, '_R']]) rows.push(
    ['farm' + L, 'spine3', [W * s, Hw * 0.8, f * 0.92]], ['fore' + L, 'farm' + L, [W * s, Hw * 0.48, f * 0.8]], ['fpaw' + L, 'fore' + L, [W * s, Hw * 0.15, f * 0.86]],
    ['thigh' + L, 'pelvis', [W * 0.95 * s, Hw * 0.85, -f]], ['shin' + L, 'thigh' + L, [W * s, Hw * 0.52, -f + Lb * 0.12]], ['hock' + L, 'shin' + L, [W * s, Hw * 0.25, -f - Lb * 0.1]]);
  rows.tailEnd = tp; return rows;
}
/** quadruped body: barrel, deep chest, haunches, shoulder blades, legs with muscle, paws or hooves, tail */
export function sculptQuad(S, J, o, m = {}) {
  const { Lb, Hw, W } = o; const bn = (n) => m.names?.[n] ?? n; const b = m.bulk ?? 1, f = Lb * 0.5, T = { body: 'fur', belly: null, leg: null, paw: null, ...(m.tags || {}) }; const tg = (k) => T[k] || T.body; const k0 = Hw * 0.06;
  const dp = m.depth ?? 1;
  S.blob([0, Hw * 0.82, -f * 0.92], [Hw * 0.21 * b, Hw * 0.17, Lb * 0.21], bn('pelvis'), { k: k0, tag: tg('body') });
  S.blob([0, Hw * (0.8 - (m.tuck ?? 0.06) * 0.6), -f * 0.3], [Hw * 0.19 * b, Hw * 0.16 * dp, Lb * 0.28], bn('spine1'), { k: k0, tag: tg('body') });
  S.blob([0, Hw * 0.72, f * 0.4], [Hw * 0.23 * b, Hw * 0.25 * dp, Lb * 0.28], bn('spine2'), { k: k0, tag: tg('body') });
  S.blob([0, Hw * 0.87, f * 0.85], [Hw * 0.2 * b, Hw * 0.15, Lb * 0.16], bn('spine3'), { k: k0, tag: tg('body') });
  S.blob([0, Hw * (0.72 - 0.2 * dp), f * 0.72], [Hw * 0.15 * b, Hw * 0.12, Lb * 0.17], bn('spine2'), { k: k0, tag: tg('belly') });
  S.sym((s, L) => {
    S.muscle([W * 0.8 * s, Hw * 1.02, f * 0.72], [W * 0.95 * s, Hw * 0.62, f * 0.9], Hw * 0.12 * b, Hw * 0.1 * b, [bn('spine3'), 'farm' + L], { k: k0 * 0.7, tag: tg('body'), up: [s, 0, 0] });
    S.blob([W * 0.75 * s, Hw * 0.8, -f * 0.95], [Hw * 0.14 * b, Hw * 0.2, Lb * 0.17], [bn('pelvis'), 'thigh' + L], { k: k0 * 0.8, tag: tg('body'), t0: 0.2, t1: 0.9, dir: [0, -1, 0], up: [0, 0, 1] });
    const sh = J['farm' + L], el = J['fore' + L], wr = J['fpaw' + L], hp = J['thigh' + L], kn = J['shin' + L], hk = J['hock' + L]; const lr = (m.legR ?? 1) * Hw;
    S.limb(sh, el, lr * 0.11 * b, lr * 0.075, 'farm' + L, { k: k0 * 0.5, tag: tg('leg') });
    S.muscle(lerp3(sh, el, 0.25), add3(lerp3(sh, el, 0.95), [0, 0, 0.02 * Hw]), lr * 0.08 * b, lr * 0.07 * b, 'farm' + L, { k: k0 * 0.4, tag: tg('leg') });
    S.limb(el, wr, lr * 0.07, lr * 0.05, ['farm' + L, 'fore' + L], { k: k0 * 0.4, tag: tg('leg'), t0: 0, t1: 0.2 });
    S.blob(add3(el, [0, 0, -0.03 * Hw]), [lr * 0.05, lr * 0.05, lr * 0.05], 'fore' + L, { k: k0 * 0.3, tag: tg('leg') });
    S.limb(hp, kn, lr * 0.13 * b, lr * 0.075, 'thigh' + L, { k: k0 * 0.5, tag: tg('leg') });
    S.limb(kn, hk, lr * 0.075, lr * 0.05, 'shin' + L, { k: k0 * 0.4, tag: tg('leg') });
    S.muscle(add3(lerp3(kn, hk, 0.1), [0, 0, -0.02 * Hw]), add3(lerp3(kn, hk, 0.6), [0, 0, -0.03 * Hw]), lr * 0.06, lr * 0.065, 'shin' + L, { k: k0 * 0.3, tag: tg('leg') });
    S.blob(add3(hk, [0, 0, -0.025 * Hw]), [lr * 0.04, lr * 0.05, lr * 0.05], 'hock' + L, { k: k0 * 0.3, tag: tg('leg') });
    for (const [a, top, bone] of [[wr, wr, 'fpaw' + L], [hk, hk, 'hock' + L]]) {
      const foot = [top[0], 0, top[2] + (bone.startsWith('f') ? 0.04 : 0.1) * Hw];
      S.limb(top, [foot[0], Hw * 0.06, foot[2] - 0.02 * Hw], lr * 0.048, lr * 0.042, bone, { k: k0 * 0.3, tag: tg('leg') });
      if (m.hoof) { S.box([foot[0], Hw * 0.035, foot[2]], [lr * 0.045, Hw * 0.03, lr * 0.05], lr * 0.015, bone, { k: k0 * 0.2, tag: T.paw || 'hoof', rot: [0.2, 0, 0] }); }
      else { S.blob([foot[0], Hw * 0.04, foot[2]], [lr * 0.06, Hw * 0.035, lr * 0.08], bone, { k: k0 * 0.3, tag: tg('paw') }); for (let i = 0; i < 4; i++) { const x = (i - 1.5) * lr * 0.035; S.blob([foot[0] + x, Hw * 0.03, foot[2] + lr * 0.07 - Math.abs(i - 1.5) * lr * 0.012], [lr * 0.022, Hw * 0.026, lr * 0.03], bone, { k: k0 * 0.15, tag: tg('paw') }); } }
    }
  });
  return J;
}

// ================================================================== painter
const tmpE = [0, 0, 0];
// pixel-art surface detail: a hash per cell of a 3D grid -> clustered, hard-edged tone steps (consistent across UV seams)
const qh = (x, y, z, g) => { const h = Math.sin(Math.floor(x / g) * 127.1 + Math.floor(y / g) * 311.7 + Math.floor(z / g) * 74.7) * 43758.5453; return h - Math.floor(h); };
/** PAL: tag -> { s: style, c: colour, ... }. Styles: skin fur scale feather bone metal wood rock cloth leather keratin eye dark flat */
export function painter(S, PAL) {
  const Q = {};
  return (c, o) => {
    const q = S.query(c.x, c.y, c.z, Q); const p = PAL[q.tag] || PAL.default; const cav = S.cavity(c, p.cav ?? 0.035);
    let L = 0.5 + c.ny * 0.09 + c.nz * 0.03 - (1 - cav) * (p.cavK ?? 0.7) * 0.75 + (p.L ?? 0); let col = p.c; o.ro = p.ro ?? 0.85; o.me = p.me ?? 0;
    if (p.belly && c.ny < (p.bellyY ?? -0.3)) col = p.belly; if (p.back && c.ny > (p.backY ?? 0.7)) col = p.back;
    switch (p.s) {
      case 'eye': {
        const e = q.prim, m = e.m; const dx = c.x - e.cx, dy = c.y - e.cy, dz = c.z - e.cz; const lx = m[0] * dx + m[1] * dy + m[2] * dz, ly = m[3] * dx + m[4] * dy + m[5] * dz, lz = m[6] * dx + m[7] * dy + m[8] * dz; const r = Math.hypot(lx / e.rx, ly / e.ry);
        if (lz < 0 || r > (p.iris ?? 0.78)) { K.tone(p.rim || [30, 16, 16], 0.3, o.col); return; }
        if (p.white && r > (p.irisR ?? 0.5)) { K.tone(p.white, K.band(0.7 - r * 0.2, 3), o.col); return; }
        const pr = p.pupil === 'slit' ? Math.abs(lx) < e.rx * 0.12 && r < 0.65 : p.pupil === 'bar' ? Math.abs(ly) < e.ry * 0.14 && r < 0.66 : p.pupil === 'none' ? false : r < (p.pupilR ?? 0.28);
        if (Math.hypot(lx / e.rx - 0.28, ly / e.ry - 0.32) < 0.13) { o.col = [236, 232, 222]; o.ro = 0.05; return; } // wet specular glint
        if (pr) { o.col = [12, 8, 8]; o.ro = 0.1; return; } K.tone(p.c, K.band(0.62 - r * 0.3 + (K.vnoise(lx * 300, ly * 300, 3) - 0.5) * 0.12), o.col); o.ro = 0.15; return; // natural iris: darker limbal ring, fibres
      }
      case 'dark': K.tone(col, K.band(0.35 + c.ny * 0.1, 3), o.col); if (p.e) o.em = p.e; return;
      case 'fur': { const fs = p.fs ?? 22; const str = K.vnoise(c.x * fs, c.y * fs * (p.flow ?? 0.22), c.z * fs) + K.vnoise(c.x * fs * 2.1, c.y * fs * 0.5, c.z * fs * 2.1) * 0.5; L += (str - 0.75) * (p.strand ?? 0.22) - (1 - cav) * 0.1 + (qh(c.x, c.y * 0.4, c.z, 0.011) - 0.5) * 0.14 + (qh(c.x, c.y * 0.3, c.z, 0.006) > 0.9 ? 0.1 : 0); if (q.tag2 && q.d2 - q.d < 0.01) L += 0.06; break; }
      case 'scale': { const sz = p.sz ?? 0.03; const C = K.cells3(c.x / sz, c.y / (sz * 0.8), c.z / sz); const dy = c.y / (sz * 0.8) - C[3]; L += C[1] - C[0] < (p.seam ?? 0.07) ? -0.16 : dy > 0.2 ? 0.12 : dy < -0.25 ? -0.06 : (0.5 - C[0]) * 0.1; break; } // lit top rim, shaded lower lip per scale
      case 'feather': { const sz = p.sz ?? 0.035; const C = K.cells3(c.x / sz, c.y / (sz * 1.6), c.z / sz); const dy = c.y / (sz * 1.6) - C[3]; L += C[1] - C[0] < 0.06 && dy < 0 ? -0.2 : dy < -0.25 ? 0.1 : 0; if (p.tip && dy < -0.3) col = p.tip; break; }
      case 'bone': { const C = K.cells3(c.x / 0.05, c.y / 0.07, c.z / 0.05); L += (C[1] - C[0] < 0.03 ? -0.22 : 0) - (1 - cav) * 0.25; break; }
      case 'metal': {
        L = 0.5 + c.ny * 0.1 + c.nz * 0.03 - (1 - cav) * 0.45 + (cav > 0.97 && c.ny > 0.4 ? 0.1 : 0) + (K.vnoise(c.x * 60, c.y * 60, c.z * 60) - 0.5) * 0.1;
        if (p.seam && q.dn - q.d < p.seam && q.d > -0.03 && q.dn < 0.03) { K.tone(p.glowC || [255, 150, 40], 0.6, o.col); o.em = p.e || [200, 90, 24]; return; }
        if (p.patina !== false && cav < 0.8 && K.vnoise(c.x * 18, c.y * 18, c.z * 18) > 0.45) { col = K.mixc([...col], [70, 120, 104], 0.55 * (1 - cav / 0.8) + 0.2); o.me = 0.2; o.ro = 0.8; } // verdigris in the creases
        if (p.rivet) { const C = K.cells3(c.x / p.rivet, c.y / p.rivet, c.z / p.rivet); if (C[0] < 0.07) L += 0.25; } break;
      }
      case 'wood': { const g = Math.sin(c.y * (p.grain ?? 60) + K.vnoise(c.x * 18, c.y * 3, c.z * 18) * 6); L += g > 0.82 ? -0.18 : 0; break; }
      case 'rock': { const C = K.cells3(c.x / 0.09, c.y / 0.09, c.z / 0.09); L += (C[5] - 0.5) * 0.25 + (C[1] - C[0] < 0.04 ? -0.25 : 0); break; }
      case 'cloth': { L += Math.cos(Math.atan2(c.x, c.z) * (p.folds ?? 9)) * 0.1; break; }
      case 'leather': { L += Math.abs(((c.y * 30) % 1 + 1) % 1 - 0.5) < 0.04 ? -0.15 : 0; break; }
      case 'keratin': { L += Math.sin(c.y * (p.rings ?? 90)) > 0.75 ? -0.12 : 0.04; break; }
      case 'hair': { const fs = p.fs ?? 40; const str = K.vnoise(c.x * fs, c.y * fs * 0.15, c.z * fs); L += (str - 0.5) * 0.3; break; }
      default: break;
    }
    if (p.s === 'skin' || p.s === 'cloth' || p.s === 'leather') L += (qh(c.x, c.y, c.z, p.s === 'skin' ? 0.009 : 0.007) - 0.5) * 0.07; // fine clustered grain
    K.tone(col, K.band(L, 4), o.col); if (p.e && p.s !== 'metal') { tmpE[0] = p.e[0]; tmpE[1] = p.e[1]; tmpE[2] = p.e[2]; o.em = tmpE.slice(); }
    p.fn?.(c, o, q, L);
  };
}

// ================================================================== cached assets (body + props)
const CACHE = new Map();
/** sculpt + skin + unwrap + paint once per key; wound sites are scattered over paintable flesh automatically */
export function asset(key, { bones, sculpt, pal, cell = 0.02, target = 10000, atlas = 512, maxChart = 0.04, wounds = 12, woundScale = 1, woundSkip = [] }) {
  if (CACHE.has(key)) return CACHE.get(key);
  const S = new Sculpt(); sculpt(S); const names = bones.map((b) => b[0]);
  const geo = S.build({ cell, bones: names, atlas, target, maxChart }); const surf = bake(geo, atlas, names);
  const mat = K.paintedMat(K.paintSurface(surf, painter(S, pal))); if (mat.map) { mat.map.magFilter = THREE.NearestFilter; mat.map.needsUpdate = true; } // crisp texels up close
  let w = null;
  if (wounds) {
    const pa = geo.attributes.position, na = geo.attributes.normal; const sites = []; const q = {}; let seed = 7;
    for (let tries = 0; tries < 400 && sites.length < wounds; tries++) {
      seed = (seed * 9301 + 49297) % 233280; const i = Math.floor((seed / 233280) * pa.count); const p = [pa.getX(i), pa.getY(i), pa.getZ(i)];
      S.query(p[0], p[1], p[2], q); if (woundSkip.includes(q.tag) || sites.some((x) => Math.hypot(x.p[0] - p[0], x.p[1] - p[1], x.p[2] - p[2]) < 0.16 * woundScale)) continue;
      sites.push({ p, n: [na.getX(i), na.getY(i), na.getZ(i)], len: (0.08 + (sites.length % 3) * 0.035) * woundScale, wid: (0.012 + (sites.length % 2) * 0.006) * woundScale });
    }
    const wq = {}; w = woundTex(K.paintSurface(surf, paintWounds(surf, { sites, seed: 3, select: (c) => { S.query(c.x, c.y, c.z, wq); return !woundSkip.includes(wq.tag); } })).canvas);
  }
  S.release(); const A = { geo, mat, wound: w }; CACHE.set(key, A); return A;
}
/** a rigid sculpted prop (helmet, shield, club, boulder) in rest space: {geo, mat} */
export function prop(key, sculpt, pal, { cell = 0.012, target = 2500, atlas = 256, maxChart = 0.02 } = {}) {
  return asset('prop:' + key, { bones: [['p', null, [0, 0, 0]]], sculpt: (S) => { sculpt(S); for (const p of S.prims) p.bone = 'p'; }, pal, cell, target, atlas, maxChart, wounds: 0 });
}

// ================================================================== spec-driven creature
/**
 * spec: { id, bones, height, scale, asset() -> {geo, mat, wound}, blood, props(ctx), idle(P, t, st, ctx), gait(P, phase, amt, ctx),
 *   clips: {attack, cast, hurt, die}, impact, follow: {bone: [omega, zeta]}, hover(t, st, ctx) -> y, death(T, model, ctx), after(dt, t, ctx) }
 */
export function createGeneric(spec, seed = 1) {
  const A = spec.asset(); const root = new THREE.Group(); root.name = spec.id;
  const model = new THREE.Group(); root.add(model); const sc = spec.scale ?? 1; model.scale.setScalar(sc);
  const api = battleRig(root, spec.height * sc); const B = makeBones(spec.bones); const st = api.st;
  const bm = api.own(A.mat); if (A.wound) woundMat(bm, A.wound, spec.blood || [0.12, 0.004, 0.006]); const body = skinned(A.geo, bm, B, model);
  const ctx = { B, api, model, root, body, seed, sc, own: (m) => api.own(m), J: joints(spec.bones), st, vars: {}, spec_h: spec.height, spec };
  spec.props?.(ctx);
  for (const m of [...model.children]) m.traverse((o) => { if (o.isMesh && api.mats.indexOf(o.material) < 0 && o.material.map) o.material = api.own(o.material); });
  const clips = spec.clips || {}; const holdOf = (m) => (clips[m] ? clips[m][clips[m].length - 1][0] : 1.3);
  api.impactTime = spec.impact ?? 0.4; api.attackTime = holdOf('attack'); api.head = B.map.head || B.bones[1]; api.bones = B.map;
  const parentOf = Object.fromEntries(spec.bones.map(([n, p]) => [n, p])); const SPR = {};
  for (const [n, [w, z]] of Object.entries(spec.follow || {})) { if (!B.map[n]) continue; const a = []; for (let p = parentOf[n]; p; p = parentOf[p]) a.push(p); SPR[n] = { anc: a, s: [0, 1, 2].map(() => new Spring(0, w, z)) }; }
  const kb = new Spring(0, 9, 0.5); let impactDone = true, lastX = null, gait = 0, moving = 0; const P = {};
  api.onAct = (m) => { if (m === 'attack') impactDone = false; if (m === 'hurt') kb.kick(-2.4); if (m === 'die') kb.kick(-1.2); spec.onAct?.(m, ctx); };
  api.update = (dt) => {
    api.common(dt, holdOf(st.mode)); kb.update(dt); const t = st.t + seed * 1.37;
    if (!impactDone && st.mode === 'attack' && st.modeT >= api.impactTime) { impactDone = true; spec.onImpact?.(ctx); api.onImpact?.(); }
    const x = api.root.position.x; const v = lastX === null || dt <= 0 ? 0 : (x - lastX) / dt; lastX = x; moving += (Math.min(1, Math.abs(v) / 4) - moving) * Math.min(1, dt * 8); gait += dt * (5 + Math.abs(v)) * moving;
    for (const k in P) delete P[k];
    spec.idle?.(P, t, st, ctx);
    const clip = st.dead > 0 ? 'die' : clips[st.mode] ? st.mode : null; if (clip && clips[clip]) sample(clips[clip], st.dead > 0 ? st.deadT : st.modeT, P);
    if (moving > 0.02 && !st.dead) spec.gait?.(P, gait, moving, ctx);
    for (const [n, S] of Object.entries(SPR)) { const own = P[n] || [0, 0, 0]; const base = [0, 0, 0]; for (const a of S.anc) { const p = P[a]; if (p) { base[0] += p[0]; base[1] += p[1]; base[2] += p[2]; } } const o = (P[n] = [0, 0, 0]); for (let j = 0; j < 3; j++) { S.s[j].target = base[j] + own[j]; S.s[j].update(dt); o[j] = S.s[j].value - base[j]; } }
    const tp = P._pos || [0, 0, 0]; apply(B, P);
    model.position.set(tp[0] * sc, (spec.hover ? spec.hover(t, st, ctx) : 0) + tp[1] * sc, tp[2] * sc + st.lunge.value * (spec.lungeK ?? 0.1) * sc + kb.value * 0.1 * sc); model.rotation.set(-kb.value * 0.03, 0, 0);
    if (st.dead > 0) (spec.death || fallSide)(st.deadT, model, ctx);
    spec.after?.(dt, t, ctx);
  };
  return api;
}
/** default weighted death: buckle, topple to the side, slam, one bounce, settle */
export function fallSide(T, model, ctx, o = {}) {
  const sc = ctx.sc, t0 = o.t0 ?? 0.38, t1 = o.t1 ?? 0.75; const drop = THREE.MathUtils.smoothstep(T, 0.12, t0); const u0 = Math.min(1, Math.max(0, (T - t0) / (t1 - t0))); let fall = u0 * u0;
  if (T > t1) { const u = T - t1; fall = 1 - Math.exp(-u * 7) * Math.sin(u * 22) * 0.07; }
  const ff = Math.min(1, fall); model.position.y = (-drop * (o.drop ?? 0.16) * (1 - ff) + ff * (o.lift ?? 0.03)) * ctx.spec_h * sc; model.rotation.z = -fall * (o.rot ?? 1.36); model.rotation.x = fall * (o.pitch ?? 0.18); model.position.x = ff * (o.slide ?? 0.08) * ctx.spec_h * sc;
}
