// Minotaur (+ Minotaur Rex): a bull-headed giant sculpted as one seamless organic mesh on its own skeleton.
// Anatomy: barrel ribcage under heavy pecs and a nuchal hump that rolls up into a broad bull head (muzzle, nose pad,
// nostrils, brow, cheeks, hinged jaw), deltoid caps, digitigrade bull legs (stifle forward, hock back, cannon,
// fetlock feathering, cloven hooves with dewclaws), fur fringe on the shoulders and legs and a tufted tail.
// Rig: root > hips > spine1-3 > neck > head > jaw/ears, clavicles > upper arm > forearm > hand, thigh > shin > hock >
// hoof, tail1-4. Procedural animation: breathing idle, snort head-toss, charge (head down, gallop), labrys swing,
// hurt, death fall.
import * as THREE from 'three';
import * as K from '../charkit.js';
import { Sculpt, bake } from './flesh.js';
import { Spring } from '../../core/tween.js';
import { makeBones, skinned, onBone, skinAttrs, sample, add, apply, battleRig, paintWounds, woundMat, woundTex } from './rig.js';

const { hex } = K;
export const BONES = [
  ['root', null, [0, 0, 0]], ['hips', 'root', [0, 1.4, 0]], ['spine1', 'hips', [0, 1.58, -0.02]], ['spine2', 'spine1', [0, 1.84, -0.03]], ['spine3', 'spine2', [0, 2.1, -0.04]],
  ['neck', 'spine3', [0, 2.36, 0]], ['head', 'neck', [0, 2.58, 0.14]], ['jaw', 'head', [0, 2.52, 0.22]], ['ear_L', 'head', [0.17, 2.71, 0.14]], ['ear_R', 'head', [-0.17, 2.71, 0.14]],
  ['clav_L', 'spine3', [0.12, 2.28, 0.02]], ['uparm_L', 'clav_L', [0.56, 2.24, -0.01]], ['forearm_L', 'uparm_L', [0.82, 1.75, -0.03]], ['hand_L', 'forearm_L', [1.02, 1.29, 0.055]],
  ['clav_R', 'spine3', [-0.12, 2.28, 0.02]], ['uparm_R', 'clav_R', [-0.56, 2.24, -0.01]], ['forearm_R', 'uparm_R', [-0.82, 1.75, -0.03]], ['hand_R', 'forearm_R', [-1.02, 1.29, 0.055]],
  ['thigh_L', 'hips', [0.22, 1.36, 0]], ['shin_L', 'thigh_L', [0.28, 0.98, 0.16]], ['hock_L', 'shin_L', [0.3, 0.56, -0.16]], ['hoof_L', 'hock_L', [0.31, 0.2, -0.05]],
  ['thigh_R', 'hips', [-0.22, 1.36, 0]], ['shin_R', 'thigh_R', [-0.28, 0.98, 0.16]], ['hock_R', 'shin_R', [-0.3, 0.56, -0.16]], ['hoof_R', 'hock_R', [-0.31, 0.2, -0.05]],
  ['tail1', 'hips', [0, 1.46, -0.27]], ['tail2', 'tail1', [0, 1.27, -0.4]], ['tail3', 'tail2', [0, 1.03, -0.47]], ['tail4', 'tail3', [0, 0.8, -0.49]],
];
const FA = new THREE.Vector3(0.2, -0.46, 0.085).normalize(); // forearm direction (rest)
const fistC = (s) => new THREE.Vector3(1.02 * s, 1.29, 0.055).addScaledVector(new THREE.Vector3(FA.x * s, FA.y, FA.z), 0.11);
const handFrame = (s) => { const z = new THREE.Vector3(FA.x * s, FA.y, FA.z); const x = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), z).normalize(); const y = new THREE.Vector3().crossVectors(z, x); return { x, y, z }; };

// ---------------------------------------------------------------- sculpt
export function sculpt(king) {
  const S = new Sculpt(); const tuft = (a, dir, len, r, bone, tag = 'fur', k = 0.025) => S.limb(a, [a[0] + dir[0] * len, a[1] + dir[1] * len, a[2] + dir[2] * len], r, r * 0.22, bone, { k, tag });
  // pelvis, glutes, abdomen
  S.blob([0, 1.43, -0.03], [0.3, 0.19, 0.22], 'hips', { k: 0.06, tag: 'hide' });
  S.sym((s) => S.blob([0.14 * s, 1.4, -0.16], [0.15, 0.17, 0.13], 'hips', { k: 0.05, tag: 'hide' }));
  S.muscle([0, 1.46, 0], [0, 1.8, -0.01], 0.27, 0.21, ['hips', 'spine1'], { k: 0.07, tag: 'hide', up: [0, 0, 1] });
  S.blob([0, 1.68, 0.13], [0.16, 0.25, 0.09], 'spine1', { k: 0.05, tag: 'belly' });
  for (const [y, b] of [[1.84, 'spine2'], [1.73, 'spine1'], [1.62, 'spine1']]) S.sym((s) => S.blob([0.066 * s, y, 0.205 - (1.84 - y) * 0.1], [0.06, 0.047, 0.04], b, { k: 0.022, tag: 'belly' }));
  S.sym((s) => S.blob([0.23 * s, 1.6, 0.04], [0.1, 0.15, 0.14], 'spine1', { k: 0.06, tag: 'hide' }));
  // ribcage, pecs, lats, serratus
  S.blob([0, 1.96, -0.03], [0.4, 0.34, 0.29], 'spine2', { k: 0.08, tag: 'hide' });
  S.sym((s) => {
    S.blob([0.19 * s, 2.07, 0.17], [0.2, 0.135, 0.11], 'spine3', { k: 0.05, tag: 'chest', rot: [0.15, 0.12 * s, -0.28 * s] });
    S.muscle([0.38 * s, 2.14, -0.12], [0.2 * s, 1.66, -0.09], 0.12, 0.13, ['spine3', 'spine2'], { k: 0.06, tag: 'hide' });
    for (const y of [1.93, 1.84]) S.blob([0.34 * s, y, 0.13 - (1.93 - y) * 0.3], [0.045, 0.035, 0.05], 'spine2', { k: 0.03, tag: 'hide' });
  });
  // nuchal hump, traps, neck, dewlap
  S.blob([0, 2.3, -0.12], [0.34, 0.24, 0.24], 'spine3', { k: 0.08, tag: 'mane' });
  S.muscle([0, 2.18, -0.2], [0, 2.62, 0.03], 0.22, 0.2, ['spine3', 'neck'], { k: 0.08, tag: 'mane', up: [0, 0, -1] });
  S.sym((s) => S.muscle([0.04 * s, 2.44, -0.06], [0.5 * s, 2.29, -0.04], 0.13, 0.12, ['neck', 'spine3'], { k: 0.07, tag: 'mane', up: [0, 1, 0] }));
  S.limb([0, 2.28, 0], [0, 2.58, 0.12], 0.26, 0.2, ['neck', 'head'], { k: 0.07, tag: 'mane', t0: 0.45, t1: 1 });
  S.blob([0, 2.41, 0.17], [0.15, 0.15, 0.13], 'neck', { k: 0.06, tag: 'throat' });
  // mane fringe: tufts rolling down the hump and round the neck
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.6; const x = Math.sin(a) * 0.3, z = -0.06 - Math.cos(a) * 0.24; tuft([x, 2.5 - Math.abs(a) * 0.08, z], [Math.sin(a) * 0.5, -0.55, -Math.cos(a) * 0.6], 0.14, 0.05, 'spine3', 'mane'); }
  for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; tuft([Math.sin(a) * 0.17, 2.36, 0.22 + Math.cos(a) * 0.04 - 0.04], [Math.sin(a) * 0.35, -0.9, 0.25], 0.12, 0.045, 'neck', 'throat'); }
  // arms
  S.sym((s, L) => {
    const sh = [0.56 * s, 2.24, -0.01], el = [0.82 * s, 1.75, -0.03], wr = [1.0 * s, 1.3, 0.05];
    S.blob([0.56 * s, 2.25, 0], [0.18, 0.18, 0.19], ['clav' + L, 'uparm' + L], { k: 0.06, tag: 'shoulder', t0: 0.3, t1: 0.7, dir: [0, -1, 0], up: [0, 0, 1] });
    S.muscle([0.47 * s, 2.29, 0.14], [0.67 * s, 2.0, 0.07], 0.09, 0.08, 'uparm' + L, { k: 0.05, tag: 'shoulder' });
    S.muscle([0.47 * s, 2.29, -0.14], [0.67 * s, 2.02, -0.09], 0.09, 0.08, 'uparm' + L, { k: 0.05, tag: 'shoulder' });
    for (let i = 0; i < 3; i++) tuft([(0.6 + i * 0.04) * s, 2.33 - i * 0.07, -0.12 - i * 0.01], [0.35 * s, -0.7, -0.5], 0.11, 0.042, 'uparm' + L, 'shoulder');
    S.limb(sh, el, 0.14, 0.1, 'uparm' + L, { k: 0.05, tag: 'arm' });
    S.muscle([0.63 * s, 2.08, 0.07], [0.8 * s, 1.82, 0.06], 0.085, 0.09, 'uparm' + L, { k: 0.04, tag: 'arm' });
    S.muscle([0.6 * s, 2.14, -0.09], [0.79 * s, 1.84, -0.1], 0.09, 0.09, 'uparm' + L, { k: 0.04, tag: 'arm' });
    S.blob([0.83 * s, 1.77, -0.08], [0.065, 0.065, 0.06], 'forearm' + L, { k: 0.04, tag: 'arm' });
    S.limb(el, wr, 0.105, 0.07, ['uparm' + L, 'forearm' + L], { k: 0.05, tag: 'arm', t0: 0, t1: 0.2 });
    S.muscle([0.83 * s, 1.73, 0.02], [0.94 * s, 1.47, 0.04], 0.085, 0.08, 'forearm' + L, { k: 0.04, tag: 'arm' });
    tuft([0.86 * s, 1.68, -0.07], [0.3 * s, -0.6, -0.6], 0.09, 0.035, 'forearm' + L, 'arm');
    // fist: palm block, four knuckles, thumb wrapped over the index finger
    const F = handFrame(s), c = fistC(s); const at = (x, y, z) => [c.x + F.x.x * x + F.y.x * y + F.z.x * z, c.y + F.x.y * x + F.y.y * y + F.z.y * z, c.z + F.x.z * x + F.y.z * y + F.z.z * z];
    S.box(c, [0.045, 0.07, 0.07], 0.035, 'hand' + L, { k: 0.03, tag: 'hand', dir: F.z.toArray(), up: F.y.toArray() });
    for (let i = 0; i < 4; i++) S.blob(at(0.0, -0.075 + i * 0.05, 0.085), [0.034, 0.03, 0.032], 'hand' + L, { k: 0.02, tag: 'hand' });
    S.limb(at(-0.035 * s, 0.075, -0.03), at(-0.04 * s, 0.07, 0.06), 0.035, 0.028, 'hand' + L, { k: 0.02, tag: 'hand' });
  });
  // digitigrade legs
  S.sym((s, L) => {
    const hip = [0.22 * s, 1.36, 0], kn = [0.28 * s, 0.98, 0.16], hk = [0.3 * s, 0.56, -0.16], fl = [0.31 * s, 0.2, -0.05];
    S.limb(hip, kn, 0.2, 0.12, 'thigh' + L, { k: 0.07, tag: 'fur' });
    S.muscle([0.22 * s, 1.3, 0.1], [0.28 * s, 1.02, 0.22], 0.14, 0.12, 'thigh' + L, { k: 0.05, tag: 'fur' });
    S.muscle([0.33 * s, 1.3, 0.02], [0.34 * s, 1.04, 0.12], 0.1, 0.1, 'thigh' + L, { k: 0.05, tag: 'fur' });
    S.muscle([0.2 * s, 1.3, -0.12], [0.26 * s, 1.02, 0.0], 0.12, 0.11, 'thigh' + L, { k: 0.05, tag: 'fur' });
    S.blob([0.28 * s, 0.98, 0.2], [0.08, 0.08, 0.07], ['thigh' + L, 'shin' + L], { k: 0.04, tag: 'fur', dir: [0, -1, 0] });
    S.limb(kn, hk, 0.12, 0.068, 'shin' + L, { k: 0.05, tag: 'fur' });
    S.muscle([0.28 * s, 0.97, 0.03], [0.3 * s, 0.66, -0.2], 0.1, 0.1, 'shin' + L, { k: 0.05, tag: 'fur' });
    S.blob([0.3 * s, 0.57, -0.21], [0.05, 0.06, 0.06], 'hock' + L, { k: 0.04, tag: 'fur' });
    S.limb(hk, fl, 0.068, 0.058, 'hock' + L, { k: 0.04, tag: 'fur' });
    S.limb([0.3 * s, 0.52, -0.21], [0.31 * s, 0.24, -0.1], 0.03, 0.034, 'hock' + L, { k: 0.03, tag: 'fur' });
    S.blob([0.31 * s, 0.2, -0.06], [0.075, 0.07, 0.08], 'hoof' + L, { k: 0.04, tag: 'fur' });
    S.limb(fl, [0.31 * s, 0.11, 0.03], 0.062, 0.07, 'hoof' + L, { k: 0.03, tag: 'fur' });
    S.box([0.31 * s, 0.065, 0.07], [0.05, 0.035, 0.07], 0.022, 'hoof' + L, { k: 0.02, tag: 'hoof', rot: [0.22, 0, 0] });
    S.box([0.31 * s, 0.07, 0.17], [0.013, 0.09, 0.075], 0.004, 'hoof' + L, { k: 0.012, tag: 'cleft', sub: true });
    for (const dx of [-0.045, 0.045]) S.blob([0.31 * s + dx, 0.14, -0.13], [0.022, 0.03, 0.024], 'hoof' + L, { k: 0.015, tag: 'hoof' });
    // shaggy fringe down the back of the thigh, feathering over the hooves
    for (let i = 0; i < 4; i++) tuft([(0.26 + i * 0.012) * s, 1.25 - i * 0.08, -0.13 + i * 0.03], [0.2 * s, -0.6, -0.75], 0.11, 0.045, 'thigh' + L);
    for (let i = 0; i < 3; i++) tuft([(0.36) * s, 1.2 - i * 0.08, 0.05], [0.55 * s, -0.75, -0.1], 0.08, 0.035, 'thigh' + L);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; tuft([0.31 * s + Math.sin(a) * 0.06, 0.23, -0.06 + Math.cos(a) * 0.06], [Math.sin(a) * 0.4, -0.9, Math.cos(a) * 0.35], 0.09, 0.04, 'hoof' + L); }
  });
  // bull head
  S.blob([0, 2.7, 0.19], [0.165, 0.135, 0.16], 'head', { k: 0.05, tag: 'head' });
  S.blob([0, 2.79, 0.13], [0.15, 0.055, 0.07], 'head', { k: 0.05, tag: 'head' });
  S.blob([0, 2.68, 0.3], [0.17, 0.11, 0.075], 'head', { k: 0.05, tag: 'head', dir: [0, 0.68, 0.73] });
  S.limb([0, 2.65, 0.33], [0, 2.48, 0.51], 0.13, 0.11, 'head', { k: 0.05, tag: 'head' });
  S.blob([0, 2.45, 0.535], [0.14, 0.1, 0.1], 'head', { k: 0.05, tag: 'muzzle' });
  S.blob([0, 2.457, 0.598], [0.12, 0.072, 0.04], 'head', { k: 0.03, tag: 'nose', dir: [0, 0.35, 0.94] });
  S.sym((s) => {
    S.blob([0.06 * s, 2.468, 0.632], [0.028, 0.02, 0.04], 'head', { k: 0.015, tag: 'nostril', sub: true, dir: [0.4 * s, 0.2, 0.9] });
    S.blob([0.13 * s, 2.55, 0.3], [0.07, 0.085, 0.1], 'head', { k: 0.04, tag: 'head', dir: [0, -0.5, 0.86] });
    S.blob([0.125 * s, 2.715, 0.31], [0.065, 0.035, 0.06], 'head', { k: 0.03, tag: 'brow' });
    S.blob([0.148 * s, 2.665, 0.318], [0.03, 0.028, 0.034], 'head', { k: 0.015, tag: 'eye', dir: [0.85 * s, 0.1, 0.5] });
    S.blob([0.14 * s, 2.79, 0.13], [0.065, 0.06, 0.065], 'head', { k: 0.04, tag: 'head' });
    tuft([0.15 * s, 2.58, 0.2], [0.5 * s, -0.5, -0.7], 0.1, 0.04, 'head', 'head');
    S.limb([0.11 * s, 2.53, 0.2], [0.07 * s, 2.4, 0.48], 0.05, 0.045, 'jaw', { k: 0.04, tag: 'jaw' });
  });
  S.limb([0, 2.47, 0.24], [0, 2.375, 0.54], 0.09, 0.072, 'jaw', { k: 0.04, tag: 'jaw' });
  S.blob([0, 2.36, 0.5], [0.08, 0.05, 0.07], 'jaw', { k: 0.03, tag: 'jaw' });
  S.box([0, 2.408, 0.46], [0.14, 0.011, 0.16], 0.004, 'head', { k: 0.012, tag: 'mouth', sub: true, rot: [0.12, 0, 0] });
  for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 2.2; S.blob([Math.sin(a) * 0.07, 2.8 + Math.cos(a) * 0.015, 0.2 + Math.cos(a) * 0.03], [0.042, 0.035, 0.045], 'head', { k: 0.02, tag: 'curls' }); }
  if (king) S.sym((s) => S.limb([0.05 * s, 2.0, 0.27], [0.25 * s, 2.24, 0.05], 0.012, 0.012, 'spine3', { k: 0.0, tag: 'scar', sub: true, skin: 0 }));
  return S;
}

// ---------------------------------------------------------------- palette + painter
const PAL = {
  base: { hide: hex('#66392f'), chest: hex('#704031'), belly: hex('#744433'), fur: hex('#3e2418'), mane: hex('#321c14'), shoulder: hex('#3a2016'), throat: hex('#4e2c1c'), arm: hex('#6a3a2e'), hand: hex('#603428'), muzzle: hex('#a08470'), nose: hex('#2e2428'), jaw: hex('#8a6e5c'), head: hex('#4a2a1c'), brow: hex('#3c2216'), curls: hex('#6a3e26'), hoof: hex('#262022'), mouth: hex('#5a1a22') },
  king: { hide: hex('#5e3424'), chest: hex('#6e3c28'), belly: hex('#74422a'), fur: hex('#2a1a16'), mane: hex('#1e1412'), shoulder: hex('#241814'), throat: hex('#3a2418'), arm: hex('#5a3222'), hand: hex('#52301f'), muzzle: hex('#9c9488'), nose: hex('#262024'), jaw: hex('#86786c'), head: hex('#2a1a16'), brow: hex('#201410'), curls: hex('#4a2a1a'), hoof: hex('#1c1818'), mouth: hex('#4a1418') },
};
const FURRY = new Set(['fur', 'mane', 'shoulder', 'throat', 'head', 'brow', 'curls']);
function painter(S, king) {
  const P = king ? PAL.king : PAL.base; const Q = {};
  return (c, o) => {
    const q = S.query(c.x, c.y, c.z, Q); const tag = q.tag || 'hide'; const cav = S.cavity(c, 0.035);
    let L = 0.52 + c.ny * 0.16 + c.nz * 0.05 - (1 - cav) * 0.75; o.ro = 0.85;
    if (tag === 'eye') { // amber-red glowing iris, slit pupil, white glint
      const p = q.prim; const dx = c.x - p.cx, dy = c.y - p.cy, dz = c.z - p.cz; const m = p.m; const lx = m[0] * dx + m[1] * dy + m[2] * dz, ly = m[3] * dx + m[4] * dy + m[5] * dz, lz = m[6] * dx + m[7] * dy + m[8] * dz;
      const r = Math.hypot(lx / p.rx, ly / p.ry); if (lz < 0) { K.tone(P.head, 0.25, o.col); return; }
      if (r < 0.72) { if (Math.abs(lx) < p.rx * 0.13 && r < 0.62) { o.col = [24, 6, 8]; return; } K.tone(king ? hex('#ffb83a') : hex('#ff5a2a'), K.band(0.75 - r * 0.4, 4), o.col); o.em = king ? [255, 170, 40] : [255, 70, 30]; if (Math.hypot(lx / p.rx - 0.25, ly / p.ry - 0.3) < 0.16) { o.col = [255, 250, 230]; o.em = [255, 255, 240]; } return; }
      K.tone(hex('#2a1210'), 0.3, o.col); return;
    }
    if (tag === 'nose' || tag === 'nostril') { if (tag === 'nostril' || q.d2 < 0.006 && q.tag2 === 'nostril') { o.col = [20, 12, 14]; return; } K.tone(P.nose, K.band(L + 0.05 + (c.ny > 0.55 && c.nz > 0.3 ? 0.3 : 0), 4), o.col); o.ro = 0.3; return; }
    if (tag === 'mouth') { K.tone(P.mouth, K.band(0.35 + c.ny * 0.1, 3), o.col); return; }
    if (tag === 'hoof' || tag === 'cleft') { // keratin: vertical growth streaks, a lit rim, dark cleft
      if (tag === 'cleft') { o.col = [18, 14, 16]; return; }
      const a = Math.atan2(c.x - Math.sign(c.x) * 0.31, c.z - 0.07); const streak = Math.abs(Math.sin(a * 7 + c.y * 6)) > 0.86 ? 0.12 : 0;
      K.tone(P.hoof, K.band(L + streak + (c.y > 0.09 ? 0.08 : 0) + (c.ny > 0.6 ? 0.15 : 0), 4), o.col); o.ro = 0.4; return;
    }
    if (tag === 'scar') { K.tone(hex('#c8988a'), K.band(L + 0.1, 4), o.col); return; }
    const col = P[tag] || P.hide;
    if (FURRY.has(tag)) { // anime fur: flat lit planes whose band edges break into jagged locks flowing down the body
      const fs = tag === 'curls' ? 60 : tag === 'head' || tag === 'brow' ? 34 : 22; const str = K.vnoise(c.x * fs, c.y * fs * (tag === 'curls' ? 1 : 0.22), c.z * fs) + K.vnoise(c.x * fs * 2.1, c.y * fs * 0.5, c.z * fs * 2.1) * 0.5;
      let F = 0.47 + c.ny * 0.13 + c.nz * 0.04 - (1 - cav) * 0.3 + (str - 0.75) * 0.22;
      if (q.tag2 && !FURRY.has(q.tag2) && q.d2 - q.d < 0.012) F += 0.06;
      K.tone(col, K.band(F, 4), o.col); o.ro = 0.95; return;
    }
    if (tag === 'muzzle' || tag === 'jaw') { const C = K.cells3(c.x / 0.012, c.y / 0.012, c.z / 0.012); K.tone(col, K.band(L + 0.06 + (C[1] - C[0] < 0.06 ? -0.12 : 0), 4), o.col); if (q.tag2 === 'mouth' && q.d2 < 0.012) K.tone(P.mouth, 0.3, o.col); return; }
    // short-haired hide over the muscle: clean planes, crease lines from the sculpt, faint hair strokes on the lit side
    const hair = ((Math.floor(c.y * 90 + Math.sin(c.x * 40) * 2 + Math.sin(c.z * 33)) & 7) === 0) && L > 0.55 ? -0.06 : 0;
    K.tone(col, K.band(L + hair + (tag === 'belly' || tag === 'chest' ? 0.04 : 0), 4), o.col);
  };
}

// ---------------------------------------------------------------- accessories
const mat = (key, w, h, fn) => K.uvMat(key, w, h, fn);
function horn(s, king) {
  const k = king ? 1.22 : 1; const pts = [[0.12 * s, 2.79, 0.13], [0.26 * s, 2.83 + 0.01 * k, 0.12], [(0.38 + 0.04 * k) * s, 2.86 + 0.06 * k, 0.15], [(0.44 + 0.06 * k) * s, 2.94 + 0.1 * k, 0.24], [(0.44 + 0.06 * k) * s, 3.0 + 0.16 * k, 0.36 + 0.04 * k]];
  const l = new K.Loft(28, 12).set(K.curve(pts), (t) => (0.068 * k * (1 - t * 0.9) + 0.004) * (1 + (t < 0.6 && Math.sin(t * 70) > 0.4 ? 0.05 : 0)));
  const m = mat(king ? 'mino-horn-k' : 'mino-horn', 64, 128, (u, v, o) => {
    const ring = Math.sin(v * 70) > 0.4 && v < 0.6; const tip = K.sstep(0.62, 0.95, v); const lit = Math.cos(u * Math.PI * 2);
    K.tone(hex('#e6d6b2'), K.band(0.5 + lit * 0.22 + (ring ? -0.18 : 0.04) - v * 0.1, 4), o.col); K.mixc(o.col, hex('#3a2a24'), tip * 0.9); o.ro = 0.45;
    if (king && (v > 0.86 || Math.abs(v - 0.1) < 0.035)) { K.tone(hex('#f2c040'), K.band(0.55 + lit * 0.3, 4), o.col); o.me = 0.6; o.ro = 0.3; }
  });
  return K.mesh(l.geo, m);
}
function ear(s, B) {
  const l = new K.Loft(16, 14).set(K.curve([[0.15 * s, 2.705, 0.14], [0.26 * s, 2.7, 0.15], [0.37 * s, 2.665, 0.15], [0.46 * s, 2.62, 0.14]]), (t) => [0.016 * (1 - t) + 0.005, 0.085 * Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) * (1 - t * 0.3) + 0.005], { ref: (t, n) => n.set(0, 0.35, 1), shape: (a) => 1 + Math.max(0, Math.sin(a)) * 0.6 });
  const m = mat('mino-ear', 64, 64, (u, v, o) => { const inner = Math.sin(u * Math.PI * 2) * s > 0.25; if (inner && v > 0.15 && v < 0.92) { K.tone(hex('#d48a7a'), K.band(0.55 - Math.abs(u - 0.5) * 0.2, 3), o.col); if (Math.abs(((u * 9) % 1) - 0.5) < 0.12 && v > 0.5) K.tone(hex('#e8d0b8'), 0.6, o.col); return; } K.fur2(u, v, o, hex('#4a2a1c'), 10, 6, 0.5); });
  return onBone(B, 'ear_' + (s > 0 ? 'L' : 'R'), K.mesh(l.geo, m));
}
function tail(B, mats) {
  const rows = [[0, 1.46, -0.27], [0, 1.27, -0.4], [0, 1.03, -0.47], [0, 0.8, -0.49], [0, 0.6, -0.47]]; const f = K.curve(rows);
  const l = new K.Loft(30, 12).set(f, (t) => 0.06 * (1 - t * 0.6) + 0.006);
  const tb = ['tail1', 'tail2', 'tail3', 'tail4'];
  const w = (v) => { const x = Math.min(3.999, v * 4); const i = Math.floor(x), fr = x - i; if (fr < 0.5) return i > 0 ? [[tb[i], 0.5 + fr], [tb[i - 1], 0.5 - fr]] : [[tb[0], 1]]; return i < 3 ? [[tb[i], 1.5 - fr], [tb[i + 1], fr - 0.5]] : [[tb[3], 1]]; };
  skinAttrs(l.geo, B, (i) => w(Math.floor(i / 13) / 29));
  const tm = mats.own(mat('mino-tail', 64, 128, (u, v, o) => K.fur2(u, v, o, hex('#4a2a1c'), 8, 14, 0.5)));
  const tuft = new K.Loft(22, 16).set(K.curve([[0, 0.7, -0.485], [0, 0.56, -0.475], [0, 0.44, -0.45], [0, 0.33, -0.43]]), (t) => 0.075 * Math.sin(Math.min(1, t * 1.6 + 0.08) * Math.PI) * (1 - t * 0.5) + 0.004, { shape: (a, t) => 1 + Math.abs(Math.sin(a * 4 + t * 3)) * 0.35 * t });
  skinAttrs(tuft.geo, B, 'tail4');
  const tf = mats.own(mat('mino-tuft', 64, 64, (u, v, o) => { K.fur2(u, v, o, hex('#2a1810'), 12, 5, 0.45); }));
  return [skinned(l.geo, tm, B), skinned(tuft.geo, tf, B)];
}
function labrys(king) { // turned haft, leather grip, double crescent blades with bevelled edges (local: haft +Y, blades +-X)
  const g = new THREE.Group(); const L0 = -0.42, L1 = 1.08, hk = king ? 1.15 : 1;
  const haft = new K.Loft(30, 10).set((t, p) => p.set(0, L0 + t * (L1 - L0), 0), (t) => { const y = L0 + t * (L1 - L0); return 0.028 * (y < -0.36 ? 1.5 : Math.abs(y) < 0.16 ? 1.12 : 1) * (y > 0.95 ? 1.3 : 1); });
  K.mesh(haft.geo, mat(king ? 'labrys-haft-k' : 'labrys-haft', 32, 128, (u, v, o) => { const y = L0 + v * (L1 - L0); const grip = Math.abs(y) < 0.16; const cap = y < -0.36 || y > 0.95; if (cap) { K.tone(king ? hex('#f2c040') : hex('#c8862e'), K.band(0.55 + Math.cos(u * 6.28) * 0.25, 4), o.col); o.me = 0.6; return; } if (grip) { K.tone(hex('#3a2416'), K.band(0.5 + Math.cos(u * 6.28) * 0.2 + (Math.sin((y + u * 0.05) * 160) > 0.6 ? -0.2 : 0), 4), o.col); return; } K.tone(hex('#8a5a32'), K.band(0.5 + Math.cos(u * 6.28) * 0.22 + (Math.sin(u * 40 + y * 3) > 0.9 ? -0.15 : 0), 4), o.col); }), g);
  const s = new THREE.Shape(); s.moveTo(0, -0.08); s.lineTo(0.12, -0.1); s.quadraticCurveTo(0.22, -0.2, 0.34, -0.32); s.quadraticCurveTo(0.44, 0, 0.34, 0.32); s.quadraticCurveTo(0.22, 0.2, 0.12, 0.1); s.lineTo(0, 0.08); s.closePath();
  const bm = mat(king ? 'labrys-blade-k' : 'labrys-blade', 128, 128, (u, v, o) => { const edge = u > 0.55 || u < 0.08; const etch = Math.abs(((u * 10 + v * 3) % 1) - 0.5) < 0.05 && !edge; K.tone(king ? hex('#f0c24a') : hex('#d8963a'), K.band(0.5 + (edge ? 0.3 : 0) + (etch ? -0.25 : 0) + (v - 0.5) * 0.2, 4), o.col); o.me = 0.65; o.ro = 0.3; });
  for (const sg of [-1, 1]) {
    const bg = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.016, bevelSegments: 2, curveSegments: 12 }); bg.translate(0, 0, -0.015);
    const uv = bg.attributes.uv, p = bg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 0.46, p.getY(i) / 0.7 + 0.5);
    bg.scale(0.95 * hk, 0.95 * hk, 1); if (sg < 0) bg.rotateY(Math.PI);
    bg.translate(0, 0.86, 0); bg.computeVertexNormals(); K.mesh(bg, bm, g);
  }
  const boss = new K.Loft(10, 14).set((t, p) => p.set(0, 0.74 + t * 0.24, 0), (t) => 0.05 * Math.sin(Math.min(1, t * 1.1 + 0.05) * Math.PI) + 0.03);
  K.mesh(boss.geo, bm, g);
  if (king) { const sp = new K.Loft(12, 10).set((t, p) => p.set(0, 1.08 + t * 0.22, 0), (t) => 0.035 * (1 - t) + 0.002); K.mesh(sp.geo, bm, g); }
  return g;
}
function loincloth(B, king, mats) {
  const g = new THREE.Group(); const cm = mats.own(mat(king ? 'mino-cloth-k' : 'mino-cloth', 64, 128, (u, v, o) => {
    const trim = v > 0.86 || u < 0.08 || u > 0.92; const fold = Math.cos(u * Math.PI * 6) * 0.12;
    if (king) { if (trim) { K.tone(hex('#f2c040'), K.band(0.6 + fold, 4), o.col); o.me = 0.5; } else K.tone(hex('#8e1e2e'), K.band(0.5 + fold - v * 0.12, 4), o.col); }
    else K.tone(trim ? hex('#4e2c18') : hex('#7c4a28'), K.band(0.5 + fold - v * 0.1 + (Math.abs(((v * 12) % 1) - 0.5) < 0.05 ? -0.15 : 0), 4), o.col);
  }));
  const belt = new K.Loft(4, 40).set((t, p) => p.set(0, 1.47 + t * 0.09, 0), () => [0.29, 0.345], { ref: (t, n) => n.set(1, 0, 0) });
  const bp = belt.geo.attributes.position; for (let i = 0; i < bp.count; i++) bp.setZ(i, bp.getZ(i) - 0.03); belt.geo.computeVertexNormals();
  const beltM = mats.own(mat(king ? 'mino-belt-k' : 'mino-belt', 128, 16, (u, v, o) => { const stud = Math.hypot(((u * 16) % 1) - 0.5, (v - 0.5) * 0.6) < 0.18; K.tone(stud ? (king ? hex('#f2c040') : hex('#c8862e')) : hex('#3e2414'), K.band(0.5 + Math.cos(u * 6.28 - 1.5) * 0.15 + (stud ? 0.2 : 0) + (v < 0.15 || v > 0.85 ? -0.15 : 0), 4), o.col); if (stud) o.me = 0.6; }));
  skinAttrs(belt.geo, B, (i) => [['hips', 0.7], ['spine1', 0.3]]); const beltMesh = skinned(belt.geo, beltM, B);
  const flaps = [];
  for (const [ang, w, len] of [[0, 0.17, 0.5], [Math.PI, 0.18, 0.44], [0.95, 0.07, 0.36], [-0.95, 0.07, 0.36], [2.1, 0.07, 0.33], [-2.1, 0.07, 0.33]]) {
    const pivot = new THREE.Group(); const x = Math.sin(ang) * 0.34, z = Math.cos(ang) * 0.28 - 0.03; pivot.position.set(x, 1.48, z); pivot.rotation.y = ang;
    const l = new K.Loft(10, 8).set((t, p) => p.set(0, -t * len, 0.02 + Math.sin(t * 2.4) * 0.05 * (w > 0.1 ? 1 : 0.5)), (t) => [w * (1 - t * 0.1), 0.012], { ref: (t, n) => n.set(0, 0, 1) });
    K.mesh(l.geo, cm, pivot); onBone(B, 'hips', pivot); pivot.userData.ang = ang; flaps.push(pivot);
  }
  return { beltMesh, flaps };
}
function kingRegalia(B, mats) {
  const gm = mats.own(mat('mino-gold', 64, 64, (u, v, o) => { const ridge = Math.abs(((v * 5) % 1) - 0.5) < 0.08; K.tone(hex('#f2c040'), K.band(0.55 + Math.cos(u * 6.28) * 0.22 + (ridge ? -0.25 : 0) - v * 0.1, 4), o.col); o.me = 0.65; o.ro = 0.3; }));
  // crown: a spiked circlet seated on the poll between the horns
  const crown = new THREE.Group(); const ring = new K.Loft(4, 28).set((t, p) => p.set(0, t * 0.05, 0), () => [0.13, 0.11]); K.mesh(ring.geo, gm, crown);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const sp = new K.Loft(8, 8).set(K.curve([[Math.sin(a) * 0.125, 0.03, Math.cos(a) * 0.105], [Math.sin(a) * 0.14, 0.12, Math.cos(a) * 0.12], [Math.sin(a) * 0.15, 0.17 + (i % 2) * 0.04, Math.cos(a) * 0.13]]), (t) => 0.026 * (1 - t) + 0.003); K.mesh(sp.geo, gm, crown); }
  crown.position.set(0, 2.8, 0.16); crown.rotation.x = -0.2; onBone(B, 'head', crown);
  // layered pauldrons: three lames arched over each deltoid, stepping down the arm
  for (const s of [-1, 1]) {
    const pa = new THREE.Group(); pa.position.set(0.56 * s, 2.25, -0.01); pa.rotation.z = -0.62 * s;
    for (let i = 0; i < 3; i++) {
      const r = 0.235 - i * 0.012, x0 = (0.02 + i * 0.075) * s;
      const l = new K.Loft(16, 10).set((t, p) => { const a = (t - 0.5) * 2.5; return p.set(x0, Math.cos(a) * r, Math.sin(a) * r); }, () => [0.06, 0.014], { ref: (t, n) => { const a = (t - 0.5) * 2.5; n.set(0, Math.cos(a), Math.sin(a)); } });
      K.mesh(l.geo, gm, pa);
    }
    onBone(B, 'uparm_' + (s > 0 ? 'L' : 'R'), pa);
  }
  // harness strap with a sun medallion
  const strap = new K.Loft(24, 8).set(K.curve([[0.5, 2.3, 0.08], [0.25, 2.12, 0.29], [0, 1.95, 0.33], [-0.22, 1.75, 0.3], [-0.36, 1.58, 0.15]]), () => [0.045, 0.012], { ref: (t, n) => n.set(0, 0, 1) });
  skinAttrs(strap.geo, B, (i) => { const v = Math.floor(i / 9) / 23; return [['spine3', 1 - v], ['spine2', v]]; });
  const sm = mats.own(mat('mino-strap', 64, 64, (u, v, o) => { const stud = ((v * 14) % 1) < 0.25 && Math.abs(u - 0.5) > 0.2; K.tone(stud ? hex('#f2c040') : hex('#3a2014'), K.band(0.5 + (stud ? 0.2 : 0), 4), o.col); if (stud) o.me = 0.6; }));
  const strapM = skinned(strap.geo, sm, B);
  const med = new THREE.LatheGeometry([[0, 0.034], [0.03, 0.032], [0.05, 0.026], [0.07, 0.024], [0.082, 0.03], [0.092, 0.018], [0.094, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 28); med.rotateX(Math.PI / 2); const mm = K.mesh(med, gm); mm.position.set(0, 1.95, 0.33); mm.rotation.x = -0.15; onBone(B, 'spine2', mm);
  return [strapM];
}
function bracer(s, B, king, mats) {
  const L = s > 0 ? 'L' : 'R'; const F = handFrame(s); const c = new THREE.Vector3(0.95 * s, 1.42, 0.03);
  const l = new K.Loft(10, 20).set((t, p) => p.copy(c).addScaledVector(new THREE.Vector3(FA.x * s, FA.y, FA.z), (t - 0.5) * 0.2), (t) => 0.098 - t * 0.022 + (Math.abs(t - 0.5) > 0.4 ? 0.008 : 0));
  const m = mats.own(mat(king ? 'mino-bracer-k' : 'mino-bracer', 64, 32, (u, v, o) => { const edge = v < 0.12 || v > 0.88; const lace = Math.abs(((u * 8) % 1) - 0.5) < 0.08; K.tone(edge ? (king ? hex('#f2c040') : hex('#5a3420')) : hex('#6e4024'), K.band(0.5 + Math.cos(u * 6.28) * 0.2 + (lace && !edge ? -0.2 : 0), 4), o.col); if (edge && king) o.me = 0.6; }));
  return onBone(B, 'forearm_' + L, K.mesh(l.geo, m));
}
function noseRing(king) {
  const l = new K.Loft(24, 10).set((t, p) => { const a = t * Math.PI * 2 * 0.86 + 0.45; return p.set(0, 2.43 - Math.cos(a) * 0.05 + 0.02, 0.628 + Math.sin(a) * 0.035); }, () => 0.011);
  return K.mesh(l.geo, mat(king ? 'ring-k' : 'ring', 16, 16, (u, v, o) => { K.tone(king ? hex('#f2c040') : hex('#d0a040'), K.band(0.55 + Math.cos(u * 6.28) * 0.3, 4), o.col); o.me = 0.7; o.ro = 0.25; }));
}

// ---------------------------------------------------------------- build (geometry + texture cached per variant)
const CACHE = {};
function asset(king) {
  const id = king ? 'minotaur_king' : 'minotaur'; if (CACHE[id]) return CACHE[id];
  const S = sculpt(king); const names = BONES.map((b) => b[0]);
  const geo = S.build({ cell: 0.023, bones: names, atlas: 768, target: 13500 });
  const surf = bake(geo, 768, names);
  const mat = K.paintedMat(K.paintSurface(surf, painter(S, king)));
  // gashes across chest, belly, arms, thighs, flank and brow, deepest last
  const sites = [[[0.22, 2.1, 0.27], [0.3, 0.2, 1], [1, -0.6, 0]], [[-0.1, 1.72, 0.24], [0, 0, 1], [1, 0.4, 0]], [[0.68, 1.95, 0.08], [0.6, 0, 0.8], [0.3, -1, 0]], [[-0.3, 1.18, 0.2], [-0.4, 0, 1], [0.2, -1, 0]],
    [[-0.36, 1.9, 0.12], [-0.8, 0, 0.6], [0, -1, 0.3]], [[0.05, 2.0, -0.32], [0, 0.2, -1], [1, 0.3, 0]], [[-0.65, 1.95, 0.05], [-0.7, 0, 0.7], [0.3, 1, 0]], [[0.3, 1.25, 0.24], [0.3, 0, 1], [0.4, -1, 0]],
    [[0.12, 1.92, 0.3], [0.2, 0.1, 1], [-1, -0.8, 0]], [[0.1, 2.68, 0.36], [0.3, 0.7, 0.7], [1, -0.3, 0]], [[-0.2, 2.25, 0.18], [-0.3, 0.6, 0.7], [1, 0.2, 0]], [[0.36, 1.6, 0.08], [0.9, 0, 0.4], [0, -1, 0.2]]]
    .map(([p, n, dir], i) => ({ p, n, dir, len: 0.12 + (i % 3) * 0.05, wid: 0.016 + (i % 2) * 0.008 }));
  const wq = {}; const wound = K.paintSurface(surf, paintWounds(surf, { sites, seed: 3, select: (c) => { S.query(c.x, c.y, c.z, wq); return !['eye', 'hoof', 'cleft', 'nose', 'nostril', 'mouth'].includes(wq.tag); } }));
  S.release(); return (CACHE[id] = { geo, mat, wound: woundTex(wound.canvas) });
}

export function createMinotaur(seed = 1, king = false) {
  const A = asset(king); const root = new THREE.Group(); root.name = king ? 'minotaur_king' : 'minotaur';
  const model = new THREE.Group(); root.add(model); const sc = king ? 1.06 : 1; model.scale.setScalar(sc);
  const api = battleRig(root, 3.0 * sc); const B = makeBones(BONES);
  const body = skinned(A.geo, woundMat(api.own(A.mat), A.wound, [0.12, 0.004, 0.005]), B, model);
  for (const s of [-1, 1]) { onBone(B, 'head', horn(s, king)); ear(s, B); bracer(s, B, king, api); }
  onBone(B, 'head', noseRing(king));
  for (const m of tail(B, api)) model.add(m);
  const cloth = loincloth(B, king, api); model.add(cloth.beltMesh);
  if (king) for (const m of kingRegalia(B, api)) model.add(m);
  // labrys in the left fist: haft along the grip (knuckle line), blades along the forearm axis
  const F = handFrame(1); const ax = labrys(king); ax.position.copy(fistC(1)); ax.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.z, F.y, F.x.clone().negate())); onBone(B, 'hand_L', ax);
  for (const m of [...root.children]) m.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && api.mats.indexOf(o.material) < 0 && o.material.map) o.material = api.own(o.material); });
  api.head = B.map.head; api.bones = B.map; api.body = body; api.weapon = ax;
  animate(api, B, model, cloth.flaps, seed, sc);
  return api;
}

// ---------------------------------------------------------------- animation
// Additive key poses (radians, world-aligned rest frames). Attack: anticipation (weight back, labrys cocked overhead),
// a fast overhead chop that lands at IMPACT, overshoot, recovery. Neck, head, ears and tail are driven by springs in
// accumulated (parent-relative) space so they drag behind the body and follow through.
const IMPACT = 0.4;
const CLIPS = {
  attack: [[0, {}],
    [0.28, { hips: [-0.1, 0.22, 0], spine1: [-0.16, 0.3, 0], spine2: [-0.16, 0.2, 0], spine3: [-0.12, 0.12, 0], neck: [-0.1, 0, 0], head: [-0.15, 0.1, 0], uparm_L: [-2.3, -0.2, 0.25], forearm_L: [-0.6, 0, 0], hand_L: [-0.8, 0, 0], uparm_R: [-0.5, 0, -0.45], forearm_R: [-0.8, 0, 0], thigh_L: [-0.3, 0, 0], shin_L: [0.3, 0, 0], thigh_R: [0.15, 0, 0], shin_R: [0.12, 0, 0] }],
    [IMPACT, { hips: [0.14, -0.22, 0], spine1: [0.28, -0.28, 0], spine2: [0.24, -0.2, 0], spine3: [0.16, -0.12, 0], neck: [0.15, 0, 0], head: [0.3, -0.1, 0], uparm_L: [-0.6, -0.3, 0.1], forearm_L: [0.85, 0, 0], hand_L: [1.0, 0, 0], uparm_R: [0.45, 0, -0.25], forearm_R: [-0.3, 0, 0], thigh_L: [-0.6, 0, 0], shin_L: [0.55, 0, 0], hock_L: [-0.1, 0, 0], thigh_R: [0.3, 0, 0], shin_R: [0.1, 0, 0] }],
    [0.52, { hips: [0.18, -0.25, 0], spine1: [0.32, -0.3, 0], spine2: [0.27, -0.22, 0], spine3: [0.18, -0.14, 0], neck: [0.18, 0, 0], head: [0.34, -0.12, 0], uparm_L: [-0.35, -0.3, 0.05], forearm_L: [0.9, 0, 0], hand_L: [1.15, 0, 0], uparm_R: [0.5, 0, -0.25], forearm_R: [-0.3, 0, 0], thigh_L: [-0.65, 0, 0], shin_L: [0.6, 0, 0], hock_L: [-0.1, 0, 0], thigh_R: [0.32, 0, 0], shin_R: [0.12, 0, 0] }],
    [0.85, {}]],
  cast: [[0, {}], [0.22, { neck: [0.35, 0, 0], head: [0.4, 0, 0], spine3: [0.12, 0, 0], jaw: [0.12, 0, 0], thigh_R: [-0.55, 0, 0], shin_R: [0.7, 0, 0], hock_R: [-0.5, 0, 0], ear_L: [0, 0, -0.4], ear_R: [0, 0, 0.4] }],
    [0.42, { neck: [-0.35, 0.1, 0], head: [-0.55, 0.3, 0.25], spine3: [-0.12, 0, 0], spine2: [-0.06, 0, 0], jaw: [0.4, 0, 0], uparm_R: [0, 0, -0.5], forearm_R: [-0.6, 0, 0], ear_L: [0, 0, 0.3], ear_R: [0, 0, -0.3] }],
    [0.75, { neck: [-0.15, -0.1, 0], head: [-0.25, -0.2, -0.15], jaw: [0.25, 0, 0], uparm_R: [0, 0, -0.3] }], [1.3, {}]],
  hurt: [[0, {}], [0.09, { hips: [-0.08, 0, 0.04], spine1: [-0.14, 0.05, 0.06], spine2: [-0.2, 0.12, 0.05], spine3: [-0.14, 0.12, 0], neck: [-0.15, 0, 0], head: [-0.3, 0.4, 0.2], jaw: [0.4, 0, 0], uparm_R: [-0.35, 0, -0.55], forearm_R: [-0.7, 0, 0], uparm_L: [0.25, 0, 0.25], thigh_R: [0.35, 0, 0], shin_R: [0.3, 0, 0], thigh_L: [-0.15, 0, 0] }],
    [0.3, { spine1: [0.06, 0, 0], spine2: [0.05, 0, 0], head: [0.1, -0.1, 0], thigh_R: [0.15, 0, 0], jaw: [0.15, 0, 0] }], [0.65, {}]],
  die: [[0, {}], [0.16, { spine1: [-0.2, 0, 0.05], spine2: [-0.24, 0, 0], neck: [-0.2, 0, 0], head: [-0.4, 0.2, 0], jaw: [0.55, 0, 0], uparm_L: [0, 0, 0.5], uparm_R: [0, 0, -0.5], thigh_R: [0.3, 0, 0] }],
    [0.42, { hips: [0.25, 0, 0], spine1: [0.25, 0, 0], spine2: [0.2, 0, 0], neck: [0.3, 0, 0], head: [0.5, 0, 0.2], jaw: [0.4, 0, 0], thigh_L: [-1.2, 0, 0], thigh_R: [-1.1, 0, 0], shin_L: [1.3, 0, 0], shin_R: [1.2, 0, 0], hock_L: [-0.3, 0, 0], hock_R: [-0.3, 0, 0], uparm_L: [-0.4, 0, -0.2], uparm_R: [-0.4, 0, 0.2], forearm_L: [-0.4, 0, 0], forearm_R: [-0.4, 0, 0] }],
    [0.8, { hips: [0.35, 0, 0], spine1: [0.3, 0, 0.12], spine2: [0.25, 0, 0.12], neck: [0.1, 0.4, 0], head: [0.2, 0.5, 0.35], jaw: [0.5, 0, 0], thigh_L: [-1.3, 0, 0], thigh_R: [-0.8, 0, 0.2], shin_L: [1.4, 0, 0], shin_R: [0.9, 0, 0], hock_L: [-0.3, 0, 0], hock_R: [-0.2, 0, 0], uparm_L: [-1.1, 0, 0.5], uparm_R: [-0.3, 0, -0.9], forearm_L: [-0.2, 0, 0], forearm_R: [-0.1, 0, 0], hand_L: [0.4, 0, 0], tail1: [-0.5, 0, 0] }]],
};
const FOLLOW = { neck: [34, 0.55], head: [28, 0.45], ear_L: [10, 0.25], ear_R: [10, 0.25], jaw: [16, 0.3], tail1: [8, 0.3], tail2: [7, 0.28], tail3: [6, 0.26], tail4: [5.5, 0.25] };
function animate(api, B, model, flaps, seed, sc) {
  const st = api.st; const P = {}; let lastX = null, charge = 0, gait = 0, snortT = 4 + (seed % 5), snort = -1, impactDone = true;
  const parentOf = Object.fromEntries(BONES.map(([n, p]) => [n, p])); const anc = (n) => { const a = []; for (let p = parentOf[n]; p; p = parentOf[p]) a.push(p); return a; };
  const SPR = {}; for (const [n, [w, z]] of Object.entries(FOLLOW)) SPR[n] = { anc: anc(n), s: [0, 1, 2].map(() => new Spring(0, w, z)) };
  const kb = new Spring(0, 9, 0.5); // knockback travel
  api.impactTime = IMPACT; api.attackTime = 0.85;
  api.onAct = (m) => { if (m === 'attack') impactDone = false; if (m === 'hurt') kb.kick(-2.6); if (m === 'die') kb.kick(-1.5); };
  api.update = (dt) => {
    api.common(dt, st.mode === 'charge' ? 1.0 : st.mode === 'attack' ? 0.85 : st.mode === 'hurt' ? 0.65 : 1.3); const t = st.t + seed * 1.37; kb.update(dt);
    if (!impactDone && st.mode === 'attack' && st.modeT >= IMPACT) { impactDone = true; api.onImpact?.(); }
    // a very fast root move (the battle charge) reads as a gallop with the horns down
    const x = api.root.position.x; const v = lastX === null || dt <= 0 ? 0 : (x - lastX) / dt; lastX = x;
    if (st.mode === 'attack' && st.modeT < 0.3 && Math.abs(v) > 12) st.mode = 'charge';
    const moving = Math.min(1, Math.abs(v) / 4);
    charge += ((st.mode === 'charge' && st.modeT < 0.9 ? 1 : 0) - charge) * Math.min(1, dt * 10); gait += dt * (5 + Math.abs(v) * 0.9) * Math.max(charge, moving);
    for (const k in P) delete P[k];
    // idle: deep breaths through the ribcage, weight shifts, a slow searching head, tail swish, ear flicks
    const br = Math.sin(t * 1.6), sw = Math.sin(t * 0.7);
    add(P, 'hips', 0, sw * 0.03, sw * 0.02); add(P, 'spine1', -0.04 + br * 0.012, -sw * 0.02, -sw * 0.02); add(P, 'spine2', br * 0.025, 0, 0); add(P, 'spine3', 0.05 + br * 0.02, -sw * 0.02, 0);
    add(P, 'neck', 0.04 - br * 0.02, Math.sin(t * 0.43) * 0.08, 0); add(P, 'head', -0.08 + Math.sin(t * 1.6 + 1) * 0.03, Math.sin(t * 0.43 + 0.6) * 0.14, Math.sin(t * 0.31) * 0.05);
    add(P, 'jaw', -0.02 + Math.max(0, br) * 0.025 + (st.talk > 0 ? Math.abs(Math.sin(t * 15)) * 0.32 : 0));
    add(P, 'clav_L', 0, 0, br * 0.02); add(P, 'clav_R', 0, 0, -br * 0.02);
    add(P, 'uparm_L', -0.42, 0.25, -0.3); add(P, 'forearm_L', -1.05, 0.25, 0); add(P, 'hand_L', 0.15, 0, -0.1); // labrys held at the ready
    add(P, 'uparm_R', -0.08 + br * 0.02, 0, 0.18); add(P, 'forearm_R', -0.35, 0, 0);
    add(P, 'thigh_L', -0.06, 0, -0.04); add(P, 'thigh_R', -0.04, 0, 0.04); add(P, 'shin_L', 0.08, 0, 0); add(P, 'shin_R', 0.06, 0, 0); add(P, 'hock_L', -0.03, 0, 0.04); add(P, 'hock_R', -0.03, 0, -0.04);
    for (let i = 1; i <= 4; i++) add(P, 'tail' + i, 0.12 + Math.sin(t * 1.9 - i * 0.7) * 0.05 * i, Math.sin(t * 1.3 - i * 0.6) * 0.1 * i, Math.sin(t * 1.3 - i * 0.6 + 0.8) * 0.06 * i);
    const flick = Math.max(0, Math.sin(t * 0.9) - 0.93) * 8; add(P, 'ear_L', 0, 0, -0.1 - flick * 0.4); add(P, 'ear_R', 0, 0, 0.1 + Math.max(0, Math.sin(t * 0.77 + 2) - 0.93) * 3);
    snortT -= dt; if (snortT < 0 && st.mode === 'idle' && !st.dead) { snort = 0; snortT = 6 + ((seed * 7 + t) % 5); }
    if (snort >= 0) { snort += dt; const k = Math.sin(Math.min(1, snort / 0.7) * Math.PI); add(P, 'head', -0.25 * k, 0.15 * k, 0.1 * k); add(P, 'neck', -0.08 * k); add(P, 'jaw', 0.12 * k); if (snort > 0.7) snort = -1; }
    const clip = st.dead > 0 ? 'die' : CLIPS[st.mode] ? st.mode : null;
    if (clip) sample(CLIPS[clip], st.dead > 0 ? st.deadT : st.modeT, P);
    const g = gait, c = Math.max(charge, st.dead ? 0 : moving * 0.6);
    if (c > 0.01) { // stride: galloping legs, pumping arm; the charge also drops the head to level the horns
      add(P, 'thigh_L', (-0.3 + Math.sin(g) * 0.8) * c); add(P, 'thigh_R', (-0.3 - Math.sin(g) * 0.8) * c); add(P, 'shin_L', (0.5 + Math.cos(g) * 0.5) * c); add(P, 'shin_R', (0.5 - Math.cos(g) * 0.5) * c);
      add(P, 'hock_L', -Math.max(0, Math.cos(g)) * 0.6 * c); add(P, 'hock_R', -Math.max(0, -Math.cos(g)) * 0.6 * c); add(P, 'uparm_R', (0.4 - Math.sin(g) * 0.6) * c, 0, -0.1 * c);
    }
    if (charge > 0.01) { add(P, 'hips', 0.2 * charge); add(P, 'spine1', 0.18 * charge); add(P, 'spine2', 0.12 * charge); add(P, 'neck', 0.35 * charge); add(P, 'head', 0.55 * charge); add(P, 'jaw', 0.2 * charge); add(P, 'uparm_L', 0.5 * charge); add(P, 'forearm_L', 0.3 * charge); }
    // secondary motion: followers track their accumulated angle on springs, so they lag the body and overshoot
    for (const [n, S] of Object.entries(SPR)) {
      const own = P[n] || [0, 0, 0]; const base = [0, 0, 0]; for (const a of S.anc) { const p = P[a]; if (p) { base[0] += p[0]; base[1] += p[1]; base[2] += p[2]; } }
      const o = (P[n] = [0, 0, 0]); for (let j = 0; j < 3; j++) { S.s[j].target = base[j] + own[j]; S.s[j].update(dt); o[j] = S.s[j].value - base[j]; }
    }
    apply(B, P);
    // body offsets on the inner model group (the battle scene owns root position/scale)
    model.position.set(0, Math.abs(Math.sin(gait)) * 0.12 * c, st.lunge.value * 0.12 + kb.value * 0.12 + charge * 0.15);
    model.rotation.set(-kb.value * 0.03, 0, 0);
    if (st.dead > 0) { // knees buckle, he pitches over, slams down, bounces once and settles
      const T = st.deadT; const drop = THREE.MathUtils.smoothstep(T, 0.16, 0.42); const fT = Math.min(1, Math.max(0, (T - 0.4) / 0.38)); let fall = fT * fT;
      if (T > 0.78) { const u = T - 0.78; fall = 1 - Math.exp(-u * 7) * Math.sin(u * 22) * 0.07; }
      const ff = Math.min(1, fall); model.position.y = (-drop * 0.48 * (1 - ff) + ff * 0.1) * sc; model.rotation.z = -fall * 1.36; model.rotation.x = fall * 0.18; model.position.x = ff * 0.25 * sc;
    }
    const tl = B.map.thigh_L.rotation.x, tr = B.map.thigh_R.rotation.x;
    for (const f of flaps) { const a = f.userData.ang; const front = Math.cos(a), side = Math.sin(a); const leg = side > 0.3 ? tl : side < -0.3 ? tr : (tl + tr) / 2; f.rotation.x = Math.min(0.1, leg * 0.8) * (front > 0 ? 1 : -0.5) + Math.sin(t * 2 + a) * 0.03 + charge * (front > 0 ? -0.25 : 0.35); }
  };
}
