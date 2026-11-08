// Lernaean Hydra (+ elder): a heavy, low-slung reptilian body on its own skeleton (pelvis > spine1-3 shoulder mass,
// a 7-bone tail, sprawled four-legged stance: shoulder/elbow/wrist and hip/knee/ankle with clawed feet), dorsal
// spines, and a shoulder mass carrying seven neck roots (anchors). Each hydra_head is a separate enemy: a sculpted
// head (brow, snout, nostrils, hinged jaw, fangs, forked tongue, slit-pupil eyes, horn crest) on an 8-bone neck that
// lives in world space and is solved every frame from the body's anchor to the head (arc-length matched curve, spring
// lag on every joint). Heads bite, recoil, hiss and, on death, are severed: the stump stays with a bloody cap.
import * as THREE from 'three';
import * as K from '../charkit.js';
import { Spring } from '../../core/tween.js';
import { Sculpt } from './flesh.js';
import { makeBones, skinned, onBone, skinAttrs, sample, add, apply, battleRig, paintWounds, woundMat, woundTex, rigidSkinned } from './rig.js';

const { hex } = K;
const PAL = {
  base: { top: hex('#2f7058'), side: hex('#4f9a5e'), belly: hex('#d8c27a'), dark: hex('#173c36'), spine: hex('#a8303e'), claw: hex('#2a2224') },
  elder: { top: hex('#2a4a3a'), side: hex('#4a6e48'), belly: hex('#bfae78'), dark: hex('#141f1c'), spine: hex('#7a2430'), claw: hex('#1e1a1a') },
};

// ================================================================== body
export const BODY = [
  ['root', null, [0, 0, 0]], ['pelvis', 'root', [0, 0.95, -0.7]], ['spine1', 'pelvis', [0, 1.0, -0.25]], ['spine2', 'spine1', [0, 1.06, 0.2]], ['spine3', 'spine2', [0, 1.1, 0.6]],
  ['tail1', 'pelvis', [0, 0.9, -1.15]], ['tail2', 'tail1', [0, 0.76, -1.62]], ['tail3', 'tail2', [0.08, 0.58, -2.05]], ['tail4', 'tail3', [0.22, 0.4, -2.42]], ['tail5', 'tail4', [0.4, 0.26, -2.75]], ['tail6', 'tail5', [0.58, 0.16, -3.05]], ['tail7', 'tail6', [0.72, 0.1, -3.32]],
  ['farm_L', 'spine3', [0.45, 0.92, 0.55]], ['fore_L', 'farm_L', [0.78, 0.6, 0.5]], ['fhand_L', 'fore_L', [0.82, 0.2, 0.66]],
  ['farm_R', 'spine3', [-0.45, 0.92, 0.55]], ['fore_R', 'farm_R', [-0.78, 0.6, 0.5]], ['fhand_R', 'fore_R', [-0.82, 0.2, 0.66]],
  ['thigh_L', 'pelvis', [0.4, 0.88, -0.75]], ['shin_L', 'thigh_L', [0.74, 0.6, -0.5]], ['hfoot_L', 'shin_L', [0.78, 0.2, -0.82]],
  ['thigh_R', 'pelvis', [-0.4, 0.88, -0.75]], ['shin_R', 'thigh_R', [-0.74, 0.6, -0.5]], ['hfoot_R', 'shin_R', [-0.78, 0.2, -0.82]],
];
const TAIL = [[0, 0.93, -0.85, 0.42], [0, 0.9, -1.15, 0.36], [0, 0.76, -1.62, 0.3], [0.08, 0.58, -2.05, 0.23], [0.22, 0.4, -2.42, 0.17], [0.4, 0.26, -2.75, 0.125], [0.58, 0.16, -3.05, 0.09], [0.72, 0.1, -3.32, 0.065], [0.84, 0.07, -3.56, 0.035]];
const TB = ['pelvis', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6', 'tail7'];
// neck roots on the shoulder mass: 0 = the creature's right/front (first head, nearest the player), 1 centre, 2 left, then between and outside
const ANCH = [[-0.36, 1.44, 0.84], [0, 1.52, 0.9], [0.36, 1.44, 0.84], [-0.2, 1.58, 0.68], [0.2, 1.58, 0.68], [-0.56, 1.3, 0.7], [0.56, 1.3, 0.7]];
const SHC = new THREE.Vector3(0, 1.08, 0.5);

export function bodySculpt(elder) {
  const S = new Sculpt(); const e = elder ? 1.06 : 1;
  S.blob([0, 0.93, -0.72], [0.46, 0.4, 0.5], 'pelvis', { k: 0.12, tag: 'scale' });
  S.blob([0, 0.92, -0.22], [0.58 * e, 0.48, 0.58], 'spine1', { k: 0.14, tag: 'scale' });
  S.blob([0, 0.98, 0.22], [0.56 * e, 0.5, 0.48], 'spine2', { k: 0.14, tag: 'scale' });
  S.blob([0, 1.16, 0.58], [0.6 * e, 0.42, 0.4], 'spine3', { k: 0.14, tag: 'scale' });
  S.blob([0, 0.66, -0.2], [0.44, 0.24, 0.62], 'spine1', { k: 0.12, tag: 'belly' });
  S.blob([0, 0.72, 0.36], [0.36, 0.22, 0.34], 'spine2', { k: 0.12, tag: 'belly' });
  S.sym((s, L) => {
    S.muscle([0.3 * s, 1.3, 0.38], [0.48 * s, 1.0, 0.66], 0.22, 0.2, 'spine3', { k: 0.1, tag: 'scale' });
    S.blob([0.4 * s, 0.92, -0.74], [0.2, 0.27, 0.3], 'pelvis', { k: 0.1, tag: 'scale' });
    // front leg: shoulder, a bulging upper arm, elbow out, forearm down to a broad clawed hand
    const sh = [0.45 * s, 0.92, 0.55], el = [0.78 * s, 0.6, 0.5], wr = [0.82 * s, 0.2, 0.66];
    S.limb(sh, el, 0.22, 0.14, 'farm' + L, { k: 0.09, tag: 'scale' });
    S.muscle([0.5 * s, 0.98, 0.62], [0.74 * s, 0.68, 0.6], 0.13, 0.13, 'farm' + L, { k: 0.06, tag: 'scale' });
    S.blob([0.82 * s, 0.6, 0.45], [0.1, 0.1, 0.1], 'fore' + L, { k: 0.05, tag: 'scale' });
    S.limb(el, wr, 0.14, 0.09, 'fore' + L, { k: 0.06, tag: 'scale' });
    S.muscle([0.8 * s, 0.56, 0.56], [0.82 * s, 0.32, 0.62], 0.1, 0.1, 'fore' + L, { k: 0.05, tag: 'scale' });
    S.blob([0.84 * s, 0.08, 0.8], [0.13, 0.065, 0.17], 'fhand' + L, { k: 0.06, tag: 'scale' });
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.32; S.limb([0.84 * s + Math.sin(a) * 0.06, 0.08, 0.84], [0.84 * s + Math.sin(a) * 0.17, 0.05, 0.84 + Math.cos(a) * 0.16], 0.045, 0.032, 'fhand' + L, { k: 0.03, tag: 'scale' }); }
    // hind leg: heavy thigh, knee forward-out, shin back down to the ankle, long-toed foot
    const hp = [0.4 * s, 0.88, -0.75], kn = [0.74 * s, 0.6, -0.5], an = [0.78 * s, 0.2, -0.82];
    S.limb(hp, kn, 0.27, 0.15, 'thigh' + L, { k: 0.1, tag: 'scale' });
    S.blob([0.56 * s, 0.8, -0.66], [0.2, 0.24, 0.27], 'thigh' + L, { k: 0.08, tag: 'scale' });
    S.limb(kn, an, 0.15, 0.09, 'shin' + L, { k: 0.06, tag: 'scale' });
    S.muscle([0.76 * s, 0.56, -0.6], [0.78 * s, 0.3, -0.8], 0.1, 0.1, 'shin' + L, { k: 0.05, tag: 'scale' });
    S.blob([0.8 * s, 0.08, -0.7], [0.13, 0.065, 0.19], 'hfoot' + L, { k: 0.06, tag: 'scale' });
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.3; S.limb([0.8 * s + Math.sin(a) * 0.06, 0.08, -0.64], [0.8 * s + Math.sin(a) * 0.17, 0.05, -0.64 + Math.cos(a) * 0.19], 0.045, 0.03, 'hfoot' + L, { k: 0.03, tag: 'scale' }); }
  });
  for (let i = 0; i < TAIL.length - 1; i++) { const a = TAIL[i], b = TAIL[i + 1]; S.limb(a, b, a[3], b[3], TB[Math.min(i, TB.length - 1)], { k: 0.08, tag: 'scale' }); }
  for (const a of ANCH) { const p = new THREE.Vector3(...a); const d = p.clone().sub(SHC).normalize(); S.limb(p.clone().addScaledVector(d, -0.3).toArray(), p.clone().addScaledVector(d, -0.04).toArray(), 0.24, 0.17, 'spine3', { k: 0.1, tag: 'root' }); }
  return S;
}
function bodyPainter(S, P) {
  const Q = {};
  return (c, o) => {
    const q = S.query(c.x, c.y, c.z, Q); const cav = S.cavity(c, 0.06); let L = 0.52 + c.ny * 0.2 + c.nz * 0.04 - (1 - cav) * 0.6; o.ro = 0.4;
    const under = c.ny < -0.35 || q.tag === 'belly';
    if (under) { // transverse belly scutes
      const pl = ((c.z * 9) % 1 + 1) % 1; K.tone(P.belly, K.band(L + 0.06 - pl * 0.22 + (pl > 0.86 ? -0.2 : 0), 4), o.col); return;
    }
    // scale plates: 3D cells, lit crowns, dark seams; dorsal band darker; large clean camouflage blotches
    const sz = q.tag === 'root' ? 0.045 : 0.06; const C = K.cells3(c.x / sz, c.y / (sz * 0.8), c.z / sz); const seam = C[1] - C[0] < 0.07;
    const blot = K.vnoise(c.x * 2.4, c.y * 2.4, c.z * 2.4) > 0.62; const dorsal = c.ny > 0.75;
    const col = blot ? P.dark : dorsal ? P.top : c.ny > 0.25 ? P.top : P.side;
    K.tone(col, K.band(L + (seam ? -0.24 : (0.5 - C[0]) * 0.18), 4), o.col);
    if (dorsal && Math.abs(c.x) < 0.06 + Math.max(0, c.z) * 0.02) K.tone(P.dark, K.band(L - 0.05, 4), o.col);
  };
}
const spineMat = (P, key) => K.uvMat(key, 32, 64, (u, v, o) => { K.tone(P.spine, K.band(0.58 + Math.cos(u * 6.28) * 0.25 - v * 0.15 + (Math.sin(v * 40) > 0.7 ? -0.1 : 0), 4), o.col); if (v > 0.72) K.mixc(o.col, hex('#f0d8b0'), K.sstep(0.72, 0.9, v) * 0.85); o.ro = 0.4; });
const clawMat = (P, key) => K.uvMat(key, 16, 32, (u, v, o) => { K.tone(P.claw, K.band(0.55 + Math.cos(u * 6.28) * 0.3 + v * 0.15, 4), o.col); if (v > 0.8) K.mixc(o.col, hex('#d8c8b0'), 0.5); o.ro = 0.3; });
const curved = (a, dir, len, r, bend = [0, 0, 0], rings = 8, sides = 8) => new K.Loft(rings, sides).set(K.curve([a, [a[0] + dir[0] * len * 0.5 + bend[0] * 0.5, a[1] + dir[1] * len * 0.5 + bend[1] * 0.5, a[2] + dir[2] * len * 0.5 + bend[2] * 0.5], [a[0] + dir[0] * len + bend[0], a[1] + dir[1] * len + bend[1], a[2] + dir[2] * len + bend[2]]]), (t) => r * (1 - t) + 0.003).geo;

const BCACHE = {};
function bodyAsset(elder) {
  const id = elder ? 'hydra_elder' : 'hydra'; if (BCACHE[id]) return BCACHE[id];
  const S = bodySculpt(elder); const names = BODY.map((b) => b[0]); const P = elder ? PAL.elder : PAL.base;
  const geo = S.build({ cell: 0.034, bones: names, atlas: 768, target: 13000, maxChart: 0.09 });
  const surf = K.surface('beast-' + id, { geometry: geo, isSkinnedMesh: false, skeleton: { bones: names.map((name) => ({ name })) } }, 768);
  const mat = K.paintedMat(K.paintSurface(surf, bodyPainter(S, P)));
  const sites = [[0.5, 1.1, 0.5], [-0.55, 1.0, 0.1], [0.45, 1.15, -0.4], [-0.3, 1.32, 0.45], [0.6, 0.85, -0.1], [-0.5, 1.0, -0.7], [0.2, 1.38, -0.1], [-0.62, 0.9, 0.35], [0.4, 0.7, 0.62], [0.25, 0.65, -1.5], [-0.2, 0.6, -1.9]]
    .map((p, i) => ({ p, n: [p[0], Math.max(0.1, p[1] - 0.9), p[2] * 0.3], len: 0.2 + (i % 3) * 0.08, wid: 0.03 + (i % 2) * 0.012 }));
  const wound = K.paintSurface(surf, paintWounds(surf, { sites, seed: 5 }));
  S.release(); return (BCACHE[id] = { geo, mat, wound: woundTex(wound.canvas) });
}

const BODY_CLIPS = {
  // tail lash: coil the tail and haunches away (anticipation), whip it round (impact), overshoot, settle
  attack: [[0, {}], [0.3, { pelvis: [0, -0.18, 0], spine1: [0, -0.12, 0.04], spine3: [-0.12, 0.15, 0], tail1: [0.1, -0.35, 0], tail2: [0.05, -0.35, 0], tail3: [0, -0.3, 0], tail4: [0, -0.25, 0], farm_L: [0.1, 0, 0], thigh_R: [0.15, 0, 0] }],
    [0.48, { pelvis: [0, 0.22, 0], spine1: [0, 0.12, -0.04], spine3: [0.1, -0.15, 0], tail1: [-0.05, 0.4, 0], tail2: [0, 0.45, 0], tail3: [0, 0.45, 0], tail4: [0, 0.4, 0], tail5: [0, 0.3, 0], farm_L: [-0.1, 0, 0] }],
    [0.6, { pelvis: [0, 0.25, 0], spine1: [0, 0.13, 0], spine3: [0.08, -0.12, 0], tail2: [0, 0.3, 0], tail3: [0, 0.45, 0], tail4: [0, 0.5, 0], tail5: [0, 0.5, 0], tail6: [0, 0.4, 0] }], [0.9, {}]],
  // rearing roar: the shoulder mass lifts on locked forelegs, tail rises behind
  cast: [[0, {}], [0.3, { pelvis: [0.08, 0, 0], spine1: [-0.1, 0, 0], spine2: [-0.12, 0, 0], spine3: [-0.18, 0, 0], farm_L: [0.2, 0, 0.15], farm_R: [0.2, 0, -0.15], fore_L: [-0.2, 0, 0], fore_R: [-0.2, 0, 0], tail1: [-0.2, 0, 0], tail2: [-0.15, 0, 0] }],
    [0.8, { pelvis: [0.05, 0, 0], spine2: [-0.06, 0, 0], spine3: [-0.1, 0, 0], tail1: [-0.1, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { pelvis: [-0.06, 0.1, 0.05], spine1: [-0.08, 0.06, 0.06], spine2: [-0.1, 0.08, 0.05], spine3: [-0.14, 0.1, 0.04], tail1: [0.2, -0.2, 0], tail2: [0.15, -0.2, 0], tail3: [0.1, -0.15, 0], farm_L: [0.2, 0, 0.1], thigh_R: [0.15, 0, 0] }], [0.32, { spine3: [0.05, -0.04, 0], tail2: [-0.05, 0.1, 0] }], [0.65, {}]],
  die: [[0, {}], [0.2, { spine3: [-0.25, 0, 0.05], spine2: [-0.12, 0, 0], tail1: [-0.3, 0, 0], tail2: [-0.2, 0.1, 0], farm_L: [0, 0, 0.2], farm_R: [0, 0, -0.2] }],
    [0.6, { spine3: [0.15, 0, 0.1], spine2: [0.08, 0, 0.06], farm_L: [0, 0, 0.75], farm_R: [0, 0, -0.75], fore_L: [0, 0, -0.6], fore_R: [0, 0, 0.6], thigh_L: [0, 0, 0.7], thigh_R: [0, 0, -0.7], shin_L: [0, 0, -0.5], shin_R: [0, 0, 0.5], tail1: [0.15, 0, 0], tail2: [0.1, 0.1, 0], tail3: [0.05, 0.15, 0] }]],
};
export function createHydra(seed = 1, elder = false) {
  const A = bodyAsset(elder); const P = elder ? PAL.elder : PAL.base; const root = new THREE.Group(); root.name = elder ? 'hydra_elder' : 'hydra';
  const model = new THREE.Group(); root.add(model); const sc = elder ? 1.1 : 1; model.scale.setScalar(sc);
  const api = battleRig(root, 2.2 * sc); const B = makeBones(BODY);
  skinned(A.geo, woundMat(api.own(A.mat), A.wound, [0.1, 0.003, 0.008]), B, model);
  // dorsal spines (bigger over the shoulders), elbow spurs, claws
  const sm = api.own(spineMat(P, elder ? 'hyd-spine-e' : 'hyd-spine')), cm = api.own(clawMat(P, elder ? 'hyd-claw-e' : 'hyd-claw'));
  const ridge = [[0, 1.6, 0.42, 'spine3', 0.36], [0, 1.6, 0.18, 'spine2', 0.4], [0, 1.54, -0.08, 'spine2', 0.38], [0, 1.46, -0.34, 'spine1', 0.34], [0, 1.38, -0.6, 'pelvis', 0.3], [0, 1.32, -0.86, 'pelvis', 0.27], [0, 1.24, -1.1, 'tail1', 0.24], [0, 1.08, -1.4, 'tail1', 0.21], [0, 1.0, -1.65, 'tail2', 0.18], [0, 0.84, -1.9, 'tail2', 0.15], [0.08, 0.74, -2.1, 'tail3', 0.13], [0.15, 0.6, -2.32, 'tail3', 0.11], [0.24, 0.5, -2.5, 'tail4', 0.09], [0.36, 0.4, -2.7, 'tail4', 0.08], [0.48, 0.3, -2.9, 'tail5', 0.07], [0.6, 0.22, -3.08, 'tail6', 0.06], [0.7, 0.16, -3.26, 'tail6', 0.05]];
  const spikes = [], claws = [];
  for (const [x, y, z, b, h] of ridge) { const k = (elder ? 1.35 : 1) * h; spikes.push([curved([x, y - k * 0.35, z], [0, 0.85, -0.5], k, k * 0.22, [0, 0, -k * 0.25]), b]); }
  for (const s of [-1, 1]) {
    const L = s > 0 ? '_L' : '_R';
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.32, b = (i - 1.5) * 0.3; claws.push([curved([0.84 * s + Math.sin(a) * 0.16, 0.055, 0.84 + Math.cos(a) * 0.15], [Math.sin(a), -0.35, Math.cos(a)], 0.12, 0.026, [0, -0.04, 0]), 'fhand' + L], [curved([0.8 * s + Math.sin(b) * 0.16, 0.055, -0.64 + Math.cos(b) * 0.18], [Math.sin(b), -0.35, Math.cos(b)], 0.13, 0.026, [0, -0.04, 0]), 'hfoot' + L]); }
    spikes.push([curved([0.86 * s, 0.66, 0.4], [0.3 * s, 0.3, -1], 0.16, 0.04), 'fore' + L]);
    if (elder) spikes.push([curved([0.55 * s, 1.36, 0.45], [0.6 * s, 0.6, -0.5], 0.3, 0.06, [0, 0.05, -0.1]), 'spine3']);
  }
  rigidSkinned(B, spikes, sm, model); rigidSkinned(B, claws, cm, model);
  // neck anchors ride the shoulder bone; +Z points out along the root
  const anchors = ANCH.map((a) => { const o = new THREE.Object3D(); o.position.set(...a); o.lookAt(new THREE.Vector3(...a).sub(SHC).normalize().add(new THREE.Vector3(0, 0.6, 0.4)).normalize().add(new THREE.Vector3(...a))); onBone(B, 'spine3', o); return o; });
  let maxS = 0; const _q = new THREE.Quaternion();
  api.anchor = (i, out = new THREE.Vector3()) => {
    const o = anchors[((i % anchors.length) + anchors.length) % anchors.length]; o.updateWorldMatrix(true, false); out.setFromMatrixPosition(o.matrixWorld);
    out.dir = (out.dir || new THREE.Vector3()).set(0, 0, 1).applyQuaternion(o.getWorldQuaternion(_q)); out.up = (out.up || new THREE.Vector3()).set(0, 0.5, -1).normalize().applyQuaternion(root.getWorldQuaternion(_q)); maxS = Math.max(maxS, root.scale.x); out.s = maxS > 0 ? root.scale.x / maxS : 1; out.elder = elder; out.dead = st.dead > 0; return out;
  };
  for (const m of [...root.children]) m.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && api.mats.indexOf(o.material) < 0 && o.material.map) o.material = api.own(o.material); });
  api.head = B.map.spine3; api.bones = B.map; api.impactTime = 0.48; api.attackTime = 0.9;
  const st = api.st; const PZ = {}; let impactDone = true; const kb = new Spring(0, 8, 0.5);
  const FOL = { tail1: [7, 0.32], tail2: [6, 0.3], tail3: [5.2, 0.28], tail4: [4.6, 0.26], tail5: [4.2, 0.25], tail6: [3.8, 0.24], tail7: [3.5, 0.24] };
  const parentOf = Object.fromEntries(BODY.map(([n, p]) => [n, p])); const SPR = {}; for (const [n, [w, z]] of Object.entries(FOL)) { const a = []; for (let p = parentOf[n]; p; p = parentOf[p]) a.push(p); SPR[n] = { anc: a, s: [0, 1, 2].map(() => new Spring(0, w, z)) }; }
  api.onAct = (m) => { if (m === 'attack') impactDone = false; if (m === 'hurt') kb.kick(-2); };
  api.update = (dt) => {
    api.common(dt, st.mode === 'attack' ? 0.9 : st.mode === 'hurt' ? 0.65 : 1.3); kb.update(dt); const t = st.t + seed * 0.9;
    if (!impactDone && st.mode === 'attack' && st.modeT >= api.impactTime) { impactDone = true; api.onImpact?.(); }
    for (const k in PZ) delete PZ[k];
    const br = Math.sin(t * 1.2), sw = Math.sin(t * 0.5);
    add(PZ, 'pelvis', 0, sw * 0.03, 0); add(PZ, 'spine1', br * 0.012, -sw * 0.02, 0); add(PZ, 'spine2', br * 0.02, -sw * 0.02, 0); add(PZ, 'spine3', -br * 0.03, -sw * 0.03, sw * 0.02);
    for (let i = 1; i <= 7; i++) add(PZ, 'tail' + i, Math.sin(t * 0.9 - i * 0.5) * 0.015 * i, Math.sin(t * 0.8 - i * 0.55) * 0.07 + sw * 0.03, 0);
    add(PZ, 'farm_L', br * 0.01); add(PZ, 'farm_R', -br * 0.01);
    const clip = st.dead > 0 ? 'die' : BODY_CLIPS[st.mode] ? st.mode : null; if (clip) sample(BODY_CLIPS[clip], st.dead > 0 ? st.deadT : st.modeT, PZ);
    for (const [n, S] of Object.entries(SPR)) { const own = PZ[n] || [0, 0, 0]; const base = [0, 0, 0]; for (const a of S.anc) { const p = PZ[a]; if (p) { base[0] += p[0]; base[1] += p[1]; base[2] += p[2]; } } const o = (PZ[n] = [0, 0, 0]); for (let j = 0; j < 3; j++) { S.s[j].target = base[j] + own[j]; S.s[j].update(dt); o[j] = S.s[j].value - base[j]; } }
    apply(B, PZ);
    model.position.set(0, br * 0.015, st.lunge.value * 0.06 + kb.value * 0.08); model.rotation.set(-kb.value * 0.02 - st.lift.value * 0.03, 0, 0);
    if (st.dead > 0) { const T = st.deadT; const f = Math.min(1, Math.max(0, (T - 0.2) / 0.4)); let d = f * f; if (T > 0.6) { const u = T - 0.6; d = 1 - Math.exp(-u * 8) * Math.sin(u * 24) * 0.08; } model.position.y = -d * 0.42 * sc; model.rotation.z = d * 0.12; }
  };
  return api;
}

// ================================================================== head + neck
const HEAD = [['head', null, [0, 0, 0]], ['jaw', 'head', [0, -0.035, -0.06]]];
export function headSculpt() {
  const S = new Sculpt();
  S.blob([0, 0.04, -0.05], [0.14, 0.12, 0.16], 'head', { k: 0.05, tag: 'skull' });
  S.blob([0, -0.005, -0.17], [0.12, 0.12, 0.09], 'head', { k: 0.05, tag: 'skull' });
  S.blob([0, 0.035, 0.2], [0.1, 0.068, 0.22], 'head', { k: 0.05, tag: 'skull' });
  S.blob([0, 0.03, 0.41], [0.066, 0.05, 0.05], 'head', { k: 0.04, tag: 'skull' });
  S.blob([0, 0.13, -0.08], [0.06, 0.045, 0.13], 'head', { k: 0.04, tag: 'crest' });
  S.sym((s) => {
    S.blob([0.088 * s, 0.11, 0.07], [0.058, 0.035, 0.1], 'head', { k: 0.03, tag: 'brow', rot: [0.15, 0.25 * s, 0.25 * s] });
    S.blob([0.097 * s, 0.07, 0.1], [0.03, 0.027, 0.035], 'head', { k: 0.012, tag: 'eye', dir: [0.75 * s, 0.25, 0.6] });
    S.blob([0.1 * s, -0.005, -0.02], [0.06, 0.07, 0.11], 'head', { k: 0.04, tag: 'skull' });
    S.limb([0.088 * s, -0.025, -0.02], [0.055 * s, -0.012, 0.38], 0.03, 0.022, 'head', { k: 0.03, tag: 'lip' });
    S.blob([0.035 * s, 0.065, 0.43], [0.015, 0.012, 0.02], 'head', { k: 0.008, tag: 'nostril', sub: true, dir: [0.4 * s, 0.6, 0.6] });
    S.limb([0.085 * s, -0.055, -0.06], [0.05 * s, -0.06, 0.34], 0.036, 0.026, 'jaw', { k: 0.03, tag: 'jaw' });
  });
  S.limb([0, -0.07, -0.05], [0, -0.06, 0.34], 0.07, 0.04, 'jaw', { k: 0.04, tag: 'jaw' });
  S.blob([0, -0.072, 0.33], [0.045, 0.03, 0.05], 'jaw', { k: 0.025, tag: 'jaw' });
  S.box([0, -0.034, 0.17], [0.13, 0.009, 0.24], 0.003, 'head', { k: 0.008, tag: 'mouth', sub: true, rot: [-0.02, 0, 0] });
  return S;
}
function headPainter(S, P) {
  const Q = {};
  return (c, o) => {
    const q = S.query(c.x, c.y, c.z, Q); const tag = q.tag || 'skull'; const cav = S.cavity(c, 0.02); const L = 0.52 + c.ny * 0.2 + c.nz * 0.05 - (1 - cav) * 0.6; o.ro = 0.4;
    if (tag === 'eye') {
      const p = q.prim, m = p.m; const dx = c.x - p.cx, dy = c.y - p.cy, dz = c.z - p.cz; const lx = m[0] * dx + m[1] * dy + m[2] * dz, ly = m[3] * dx + m[4] * dy + m[5] * dz, lz = m[6] * dx + m[7] * dy + m[8] * dz; const r = Math.hypot(lx / p.rx, ly / p.ry);
      if (lz < 0 || r > 0.8) { K.tone(P.dark, 0.25, o.col); return; }
      if (Math.abs(lx) < p.rx * 0.12) { o.col = [16, 8, 14]; return; }
      K.tone(hex('#e8ff50'), K.band(0.8 - r * 0.5, 4), o.col); o.em = [200, 255, 50]; if (Math.hypot(lx / p.rx + 0.3, ly / p.ry - 0.35) < 0.17) { o.col = [255, 255, 235]; o.em = [255, 255, 240]; } return;
    }
    if (tag === 'mouth') { K.tone(hex('#6a1a2a'), K.band(0.4 + c.ny * 0.1, 3), o.col); return; }
    if (tag === 'nostril') { o.col = [14, 10, 12]; return; }
    if (tag === 'crest') { K.tone(P.spine, K.band(L, 4), o.col); return; }
    const under = tag === 'jaw' && c.ny < 0.2 || c.ny < -0.5; if (under) { const pl = ((c.z * 26) % 1 + 1) % 1; K.tone(P.belly, K.band(L + 0.05 - pl * 0.2, 4), o.col); return; }
    const sz = tag === 'brow' ? 0.016 : 0.02; const C = K.cells3(c.x / sz, c.y / sz, c.z / sz); const seam = C[1] - C[0] < 0.08;
    const col = tag === 'lip' ? P.side : c.ny > 0.45 ? P.top : P.side; K.tone(col, K.band(L + (seam ? -0.22 : (0.5 - C[0]) * 0.15) + (tag === 'brow' ? 0.04 : 0), 4), o.col);
    if (q.tag2 === 'mouth' && q.d2 < 0.006) K.tone(hex('#3a0e18'), 0.3, o.col);
  };
}
const HL = 2.1, NB = 8; // neck rest length (world units) and bone count
const neckR = (v) => (0.25 - v * 0.1) * (1 + Math.sin(v * Math.PI * 3) * 0.04);
let HCACHE = null;
function headAsset() {
  if (HCACHE) return HCACHE;
  const S = headSculpt(); const P = PAL.base;
  const geo = S.build({ cell: 0.011, bones: ['head', 'jaw'], atlas: 512, target: 5200, maxChart: 0.012 });
  const surf = K.surface('beast-hydra-head', { geometry: geo, isSkinnedMesh: false, skeleton: { bones: [{ name: 'head' }, { name: 'jaw' }] } }, 512);
  const mat = K.paintedMat(K.paintSurface(surf, headPainter(S, P)));
  const sites = [[[0.1, 0.06, -0.05], [1, 0.4, 0], [0.2, 1, 0.4]], [[-0.08, 0.1, 0.05], [-0.6, 0.8, 0], [1, 0, 1]], [[0.07, 0.03, 0.25], [1, 0.5, 0], [0, 0.3, 1]], [[-0.05, 0.08, 0.28], [-0.5, 0.8, 0.2], [1, 0, -0.5]]].map(([p, n, dir], i) => ({ p, n, dir, len: 0.07 + (i % 2) * 0.03, wid: 0.012 }));
  const wq = {}; const wound = K.paintSurface(surf, paintWounds(surf, { sites, seed: 7, select: (c) => { S.query(c.x, c.y, c.z, wq); return wq.tag !== 'eye'; } }));
  // neck: straight rest tube along +Z (dorsal +Y), skinned across the 8 neck bones
  const neck = new K.Loft(40, 20).set((t, p) => p.set(0, 0, t * HL), (t) => [neckR(t) * 1.12, neckR(t)], {});
  skinAttrs(neck.geo, { names: [...Array(NB).keys()].map((i) => 'n' + i) }, (i) => { const v = Math.floor(i / 21) / 39; const x = Math.min(NB - 1e-3, v * NB); const b = Math.floor(x), f = x - b; if (f < 0.5) return b > 0 ? [['n' + b, 0.5 + f], ['n' + (b - 1), 0.5 - f]] : [['n0', 1]]; return b < NB - 1 ? [['n' + b, 1.5 - f], ['n' + (b + 1), f - 0.5]] : [['n' + b, 1]]; });
  const neckMat = K.paintedMat(K.paintUV(128, 512, (u, v, o) => {
    const vv = v * 7; const belly = Math.abs(u - 0.5) < 0.15; o.ro = 0.4;
    if (belly) { const pl = (vv * 3.2) % 1; K.tone(P.belly, K.band(0.55 + Math.cos((u - 0.5) * 9) * 0.08 - pl * 0.24 + (pl > 0.88 ? -0.2 : 0), 4), o.col); return; }
    const C = K.cells2(u * 30, vv * 5.5); const seam = C[1] - C[0] < 0.09; const blot = K.vnoise(u * 7, vv * 1.4, 3) > 0.64; const dors = Math.abs(u - 0.5) > 0.4;
    K.tone(blot ? P.dark : dors ? P.top : P.side, K.band(0.55 + Math.cos(u * Math.PI * 2) * 0.16 + (seam ? -0.24 : (0.5 - C[0]) * 0.16), 4), o.col);
  }));
  for (const k of ['map', 'emissiveMap']) if (neckMat[k]) neckMat[k].wrapS = neckMat[k].wrapT = THREE.RepeatWrapping;
  const nw = K.paintUV(128, 512, (u, v, o) => { // neck gashes in UV space (u round, v along)
    let thr = 1, kind = 0; const cuts = [[0.22, 0.35, 0.15], [0.72, 0.6, 0.35], [0.3, 0.78, 0.55], [0.85, 0.2, 0.75], [0.6, 0.45, 0.9]];
    for (const [cu, cv, th] of cuts) { const du = u - cu, dv = (v - cv) * 4; const a = du * 0.8 + dv * 0.6, x = -du * 0.6 + dv * 0.8; const half = 0.035 * Math.sqrt(Math.max(0, 1 - (a / 0.1) ** 2)); let k = Math.abs(a) < 0.1 ? (Math.abs(x) < half * 0.5 ? 1 : Math.abs(x) < half ? 0.6 : Math.abs(x) < half * 2.4 ? 0.3 : 0) : 0; if (k && th < thr) { thr = th; kind = k; } }
    o.col[0] = thr * 255; o.col[1] = kind * 255; o.col[2] = 0;
  });
  S.release(); return (HCACHE = { geo, mat, wound: woundTex(wound.canvas), neckGeo: neck.geo, neckMat, neckWound: woundTex(nw.canvas) });
}
function capGeo() { // the bloody cut face of a severed neck: flesh rings round a white bone core
  const g = new THREE.LatheGeometry([[0, 0.025], [0.04, 0.024], [0.09, 0.016], [0.13, 0.006], [0.15, -0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 20); g.rotateX(Math.PI / 2); return g;
}
const capMat = () => K.uvMat('hyd-cap', 64, 64, (u, v, o) => { const r = v; if (r < 0.22) K.tone(hex('#f2e6cc'), K.band(0.6 - r, 3), o.col); else if (r < 0.3) K.tone(hex('#3a0810'), 0.4, o.col); else if (r < 0.85) K.tone(hex('#8a1020'), K.band(0.5 + Math.sin(u * 40) * 0.08 - (r - 0.3) * 0.3, 4), o.col); else K.tone(PAL.base.side, 0.4, o.col); o.ro = 0.25; });

const HEAD_CLIPS = { // head-group offsets: [px, py, pz, rx, ry, rz]; bite anticipation (rear back, gape), strike, snap shut, recover
  attack: [[0, {}], [0.24, { h: [0, 0.32, -0.42], r: [-0.55, 0, 0], jaw: [0.95, 0, 0] }], [0.32, { h: [0, -0.32, 0.75], r: [0.4, 0, 0], jaw: [0.9, 0, 0] }], [0.37, { h: [0, -0.36, 0.82], r: [0.45, 0, 0], jaw: [0.0, 0, 0] }], [0.5, { h: [0, -0.3, 0.7], r: [0.35, 0, 0.05], jaw: [0.05, 0, 0] }], [0.8, {}]],
  cast: [[0, {}], [0.3, { h: [0, 0.3, -0.25], r: [-0.5, 0, 0.2], jaw: [0.85, 0, 0] }], [0.6, { h: [0, 0.32, -0.22], r: [-0.45, 0.3, -0.25], jaw: [0.8, 0, 0] }], [0.9, { h: [0, 0.2, -0.1], r: [-0.3, -0.3, 0.2], jaw: [0.6, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.08, { h: [0.1, 0.12, -0.38], r: [-0.4, 0.55, 0.35], jaw: [0.7, 0, 0] }], [0.28, { h: [0.04, 0.02, -0.12], r: [-0.1, 0.15, 0.1], jaw: [0.3, 0, 0] }], [0.65, {}]],
  die: [[0, {}], [0.12, { h: [0.05, 0.25, -0.35], r: [-0.6, 0.4, 0.3], jaw: [1.0, 0, 0] }]],
};
export function createHydraHead(seed = 1) {
  const A = headAsset(); const root = new THREE.Group(); root.name = 'hydra_head';
  const api = battleRig(root, 0.8); const st = api.st;
  const hb = makeBones(HEAD); const head = new THREE.Group(); head.scale.setScalar(1.35); root.add(head);
  const hmat = woundMat(api.own(A.mat), A.wound, [0.1, 0.003, 0.008]); const hm = skinned(A.geo, hmat, hb, head);
  const P = PAL.base; const fang = api.own(K.uvMat('hyd-fang', 16, 32, (u, v, o) => { K.tone(hex('#f2e6c8'), K.band(0.62 + Math.cos(u * 6.28) * 0.2 - v * 0.15, 3), o.col); o.ro = 0.3; }));
  const teeth = [], crest = [];
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { // fangs: long front pair, rows tapering back; lower row on the jaw
    const z = 0.36 - i * 0.05, x = s * (0.05 + i * 0.006); const L = i === 1 ? 0.075 : 0.045 - i * 0.003;
    teeth.push([curved([x, -0.022, z], [0, -1, 0.15], L, 0.011 - i * 0.0008, [0, 0, -0.01], 6, 6), 'head'], [curved([x * 0.9, -0.045, z - 0.02], [0, 1, 0.1], L * 0.75, 0.009, [0, 0, 0.005], 6, 6), 'jaw']);
  }
  const tongue = new K.Loft(14, 8).set(K.curve([[0, -0.06, -0.02], [0, -0.055, 0.14], [0, -0.05, 0.28]]), (t) => [0.028 * (1 - t * 0.5), 0.008]);
  rigidSkinned(hb, [[tongue.geo, 'jaw']], api.own(K.uvMat('hyd-tongue', 16, 32, (u, v, o) => K.tone(hex('#b8384a'), K.band(0.5 + Math.cos(u * 6.28) * 0.2, 3), o.col))), head);
  const sm = api.own(spineMat(P, 'hyd-spine')); // horn crest fanning back off the skull, cheek spurs
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.32; crest.push([curved([Math.sin(a) * 0.08, 0.1 + Math.cos(a) * 0.03, -0.1], [Math.sin(a) * 0.5, 0.55, -1], 0.2 - Math.abs(i - 2) * 0.03, 0.026, [0, 0.05, 0]), 'head']); }
  for (const s of [-1, 1]) crest.push([curved([0.13 * s, -0.01, -0.08], [0.7 * s, -0.1, -1], 0.12, 0.018), 'head'], [curved([0.1 * s, 0.13, 0.04], [0.5 * s, 0.7, -0.6], 0.09, 0.016), 'head']);
  rigidSkinned(hb, teeth, fang, head); rigidSkinned(hb, crest, sm, head);
  // neck: skinned tube on a bone chain whose world matrices are solved each frame (lives in api.neckGroup)
  const neckGroup = new THREE.Group(); neckGroup.name = 'hydra_neck';
  const nb = makeBones([...Array(NB).keys()].map((i) => ['n' + i, i ? 'n' + (i - 1) : null, [0, 0, (i * HL) / NB]]));
  const nmat = woundMat(api.own(A.neckMat), A.neckWound, [0.1, 0.003, 0.008]); const neck = skinned(A.neckGeo, nmat, nb, neckGroup);
  for (const b of nb.bones) b.matrixAutoUpdate = false;
  rigidSkinned(nb, [...Array(NB - 1).keys()].map((j) => { const i = j + 1; return [curved([0, neckR(i / NB) * 0.92, (i * HL) / NB], [0, 0.8, -0.6], 0.09, 0.02), 'n' + i]; }), sm, neckGroup);
  const capM = api.own(capMat()); capM.side = THREE.DoubleSide; const cap = K.mesh(capGeo(), capM); cap.position.set(0, 0, HL / NB); cap.visible = false; nb.map['n' + (NB - 1)].add(cap);
  api.neckGroup = neckGroup; api.anchorPos = null; api.head = head; api.jaw = hb.map.jaw; api.impactTime = 0.34; api.attackTime = 0.8;
  for (const m of [...head.children, ...neckGroup.children]) m.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && api.mats.indexOf(o.material) < 0 && o.material.map) o.material = api.own(o.material); });

  // ---- neck solver state
  const pts = Array.from({ length: NB + 1 }, () => new THREE.Vector3()); const spr = Array.from({ length: NB + 1 }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), init: false }));
  const W = Array.from({ length: NB }, () => new THREE.Matrix4()); const inv = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const upA = new THREE.Vector3(0, 0.45, -0.9), A0 = new THREE.Vector3(), dA = new THREE.Vector3(), H = new THREE.Vector3(), dH = new THREE.Vector3(), hUp = new THREE.Vector3(), up = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), c1 = new THREE.Vector3(), c2 = new THREE.Vector3(), q = new THREE.Vector3();
  const bez = (s, out) => { const u = 1 - s; return out.copy(A0).multiplyScalar(u * u * u).addScaledVector(c1, 3 * u * u * s).addScaledVector(c2, 3 * u * s * s).addScaledVector(H, s * s * s); };
  const samp = Array.from({ length: 33 }, () => new THREE.Vector3()); const cum = new Float32Array(33);
  const arc = (h1, h2) => { c1.copy(A0).addScaledVector(dA, h1); c2.copy(H).addScaledVector(dH, h2); let L = 0; for (let i = 0; i <= 32; i++) { bez(i / 32, samp[i]); if (i) L += samp[i].distanceTo(samp[i - 1]); cum[i] = L; } return L; };
  let lostT = 0, severed = false, cut = 0, headFree = null, lastA = new THREE.Vector3(0, 0, 0), haveA = false, sAnchor = 1, maxRS = 0, elderTint = false;
  const hv = new THREE.Vector3(), hw = new THREE.Vector3();
  api.severHead = () => { // detach the head (world transform kept) and leave a capped stump; returns the head for VFX to drop
    if (!severed) { severed = true; cut = 0; cap.visible = true; }
    if (headFree !== 'external') { let sc = root; while (sc.parent) sc = sc.parent; head.updateWorldMatrix(true, false); if (sc !== root) sc.attach(head); headFree = 'external'; }
    return head;
  };
  const HP = {}; let impactDone = true;
  api.onAct = (m) => { if (m === 'attack') impactDone = false; };
  api.update = (dt) => {
    api.common(dt, st.mode === 'attack' ? 0.8 : st.mode === 'hurt' ? 0.65 : 1.3); const t = st.t + seed * 2.1;
    if (!impactDone && st.mode === 'attack' && st.modeT >= api.impactTime) { impactDone = true; api.onImpact?.(); }
    if (st.dead > 0 && !severed && st.deadT > 0.14) { severed = true; cut = 0; cap.visible = true; headFree = 'drop'; hv.set(0.4, 1.2, -0.6); hw.set(3, 1.5, 2); }
    // head: weaving idle + clip offsets (position in root space, rotation as euler)
    for (const k in HP) delete HP[k];
    const clip = st.dead > 0 ? 'die' : HEAD_CLIPS[st.mode] ? st.mode : null; if (clip) sample(HEAD_CLIPS[clip], st.dead > 0 ? st.deadT : st.modeT, HP);
    const h = HP.h || [0, 0, 0], r = HP.r || [0, 0, 0];
    if (!headFree) {
      head.position.set(Math.sin(t * 1.1) * 0.1 + h[0], Math.sin(t * 1.5) * 0.08 + Math.sin(t * 0.6) * 0.05 + h[1] - st.hit.value * 0.02, Math.sin(t * 0.8) * 0.05 + h[2] + st.lunge.value * 0.08);
      head.rotation.set(0.12 + Math.sin(t * 1.3 + 0.5) * 0.1 + r[0], Math.sin(t * 0.7) * 0.25 + r[1], Math.sin(t * 0.9) * 0.1 + r[2], 'YXZ');
    } else if (headFree === 'drop') { // our own fall when nobody took the head: gravity, ground bounce, tumble
      hv.y -= 9.8 * dt; head.position.addScaledVector(hv, dt); head.rotation.x += hw.x * dt; head.rotation.z += hw.z * dt;
      const gy = -root.position.y / (root.scale.y || 1) + 0.12; if (head.position.y < gy) { head.position.y = gy; if (hv.y < -1) { hv.y *= -0.32; hv.x *= 0.6; hv.z *= 0.6; hw.multiplyScalar(0.5); } else { hv.set(0, 0, 0); hw.multiplyScalar(0.9); } }
    }
    hb.map.jaw.rotation.x = (HP.jaw ? HP.jaw[0] : 0) + (headFree ? 0.9 : 0.1 + Math.sin(t * 2.3) * 0.06 + (st.talk > 0 ? Math.abs(Math.sin(t * 16)) * 0.45 : 0));
    // ---- neck: anchor (from the body) to the back of the skull
    if (!neckGroup.parent) root.add(neckGroup);
    root.updateWorldMatrix(true, true);
    const aOK = api.anchorPos && api.anchorPos.lengthSq() > 1e-8;
    if (aOK) { A0.copy(api.anchorPos); dA.copy(api.anchorPos.dir || Y.set(0, 1, 0)); if (api.anchorPos.up) upA.copy(api.anchorPos.up); sAnchor = api.anchorPos.s ?? 1; lastA.copy(A0); haveA = true; if (api.anchorPos.elder && !elderTint) { elderTint = true; for (const m of api.mats) { m.userData.tint = new THREE.Color(0.66, 0.76, 0.62); m.color.copy(m.userData.tint); } } }
    else if (haveA) { A0.copy(lastA); lostT += dt; }
    else { A0.set(0, -1.7, -1.5).applyMatrix4(root.matrixWorld); dA.set(0, 0.7, 0.7).transformDirection(root.matrixWorld); }
    maxRS = Math.max(maxRS, root.scale.x); const rs = maxRS > 0 ? root.scale.x / maxRS : 1;
    let len = HL;
    if (!severed) {
      H.set(0, -0.01, -0.12).applyMatrix4(head.matrixWorld); dH.set(0, 0, -1).transformDirection(head.matrixWorld); hUp.set(0, 1, 0).transformDirection(head.matrixWorld);
      const D = A0.distanceTo(H); const want = Math.max(0.9, D * 1.14); let lo = 0.05, hi = 3.5; if (arc(lo * D, lo * D) < want) for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; if (arc(m * D, m * D) < want) lo = m; else hi = m; } arc(lo * D, lo * D); len = cum[32];
    } else { // stump: retracts and droops, the cut face capped
      cut = Math.min(1, cut + dt * 2.5); len = HL * (1 - cut * 0.72); const droop = 0.25 + cut * 0.35 + Math.sin(t * 2) * 0.03;
      H.copy(A0).addScaledVector(dA, len * 0.85); H.y -= droop * len; dH.copy(dA).multiplyScalar(-1); dH.y += 0.6; dH.normalize(); hUp.set(0, 1, 0);
      arc(len * 0.4, len * 0.3); len = cum[32];
    }
    // points evenly along the arc, each on a spring (secondary motion) except the pinned ends
    for (let i = 0; i <= NB; i++) {
      const s = (i / NB) * cum[32]; let j = 1; while (j < 32 && cum[j] < s) j++; const f = (s - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]); q.copy(samp[j - 1]).lerp(samp[j], f);
      if (!severed) q.addScaledVector(Y.set(0, 1, 0), Math.sin(t * 1.7 - i * 0.7) * 0.03 * Math.sin((i / NB) * Math.PI));
      const S = spr[i]; if (!S.init || i === 0 || (i === NB && !severed)) { S.p.copy(q); S.v.set(0, 0, 0); S.init = true; }
      else { const w = 26 - i * 1.6, z = 0.55; const n = Math.ceil(dt / 0.008); const hh = dt / n; for (let k = 0; k < n; k++) { S.v.x += ((q.x - S.p.x) * w * w - S.v.x * 2 * z * w) * hh; S.v.y += ((q.y - S.p.y) * w * w - S.v.y * 2 * z * w) * hh; S.v.z += ((q.z - S.p.z) * w * w - S.v.z * 2 * z * w) * hh; S.p.addScaledVector(S.v, hh); } }
      pts[i].copy(S.p);
    }
    // frames: chord-aligned Z, parallel-transported dorsal Y blended toward the head's up near the skull
    up.copy(upA); const thick = (severed ? 1 : rs) * Math.max(0.001, sAnchor) * Math.max(0, 1 - lostT / 0.7);
    for (let i = 0; i < NB; i++) {
      Z.subVectors(pts[i + 1], pts[i]); const segL = Math.max(1e-4, Z.length()); Z.divideScalar(segL);
      up.addScaledVector(Z, -up.dot(Z)); const w = (i / (NB - 1)) ** 2; Y.copy(hUp).addScaledVector(Z, -hUp.dot(Z)); up.lerp(Y, w * 0.6); if (up.lengthSq() < 1e-6) up.set(1, 0, 0).addScaledVector(Z, -Z.x); up.normalize();
      X.crossVectors(up, Z).normalize(); const rad = thick * (severed && i >= NB - 2 ? 1.25 : 1);
      W[i].makeBasis(X.clone().multiplyScalar(rad), up.clone().multiplyScalar(rad), Z.clone().multiplyScalar((segL / (HL / NB)) * Math.max(0.05, 1))).setPosition(pts[i]);
    }
    neckGroup.updateWorldMatrix(true, false); inv.copy(neckGroup.matrixWorld).invert();
    for (let i = 0; i < NB; i++) { const b = nb.map['n' + i]; if (i === 0) b.matrix.multiplyMatrices(inv, W[0]); else b.matrix.multiplyMatrices(tmp.copy(W[i - 1]).invert(), W[i]); b.matrixWorldNeedsUpdate = true; }
    neckGroup.visible = thick > 0.02;
  };
  return api;
}
