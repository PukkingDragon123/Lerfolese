// Centaur archer: a chestnut horse body (1.35 m at the withers, feathered stockings, hooves, long dark tail) carrying
// a muscular human torso from the withers: bearded head with long hair and a laurel wreath, red sash at the join,
// quiver strap and quiver. A recurve bow in the left fist; the string is re-strung every frame to the drawing hand and
// an arrow appears on the draw. Attack: turn side-on, raise the bow, draw to the cheek, loose at impact, recoil.
import { THREE, K, hex, quadRows, sculptQuad, humanRows, sculptHuman, fistFrame, asset, createGeneric, rigidSkinned, add, fallSide } from './kit.js';

const O = { Lb: 1.05, Hw: 1.35, W: 0.19, Ln: 0.2, Lh: 0.3, tail: 3, tailDir: [0, -0.7, -1], tailLen: 0.42 };
const REN = { spine1: 'back1', spine2: 'back2', spine3: 'withers' };
const HH = 1.7, OFF = [0, 1.45 - 0.53 * 1.7, 0.5];
const QR = quadRows(O); const TAIL_END = QR.tailEnd;
const horse = QR.filter((r) => !['neck1', 'neck2', 'head', 'jaw', 'ear_L', 'ear_R'].includes(r[0])).map(([n, p, v]) => [REN[n] || n, REN[p] || p, v]);
const human = humanRows(HH, { legs: false, off: OFF }).filter((r) => r[0] !== 'root').map(([n, p, v]) => [n, n === 'hips' ? 'withers' : p, v]);
const BONES = [...horse, ...human];
const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
const stock = (c, o) => { if (c.y < 0.42) { K.tone(hex('#3a2418'), K.band(0.45 + c.ny * 0.15, 4), o.col); } };
const PAL = {
  coat: { s: 'skin', c: hex('#a8602f'), belly: hex('#b87444'), fn: stock }, hoof: { s: 'keratin', c: hex('#2a2224'), rings: 120 }, skin: { s: 'skin', c: hex('#d9a27a') }, brow: { s: 'skin', c: hex('#5a3a28') },
  hair: { s: 'hair', c: hex('#3a2418') }, laurel: { s: 'scale', c: hex('#6aa040'), sz: 0.012 }, sash: { s: 'cloth', c: hex('#b02a2a'), folds: 14 }, strap: { s: 'leather', c: hex('#5a3420') },
  eye: { s: 'eye', c: hex('#5a8ad0'), white: hex('#f2ece0'), irisR: 0.55, pupil: 'round', iris: 0.95 }, default: { s: 'skin', c: hex('#a8602f') },
};
function sculpt(S) {
  sculptQuad(S, J, O, { bulk: 0.95, depth: 0.85, tuck: 0.04, legR: 0.85, hoof: true, names: REN, tags: { body: 'coat', leg: 'coat', paw: 'hoof' } });
  sculptHuman(S, J, HH, { bulk: 1.15, legs: false, off: OFF, tags: { body: 'skin' } });
  S.blob([0, 1.47, 0.48], [0.25, 0.09, 0.24], ['withers', 'hips'], { k: 0.04, tag: 'sash', dir: [0, -1, 0], up: [0, 0, 1] });
  // head: skull, face, nose, brows, eyes, bearded jaw, long hair, laurel wreath
  S.blob([0, 2.12, 0.51], [0.085, 0.1, 0.1], 'head', { k: 0.03, tag: 'skin', imp: 3 }); S.blob([0, 2.065, 0.56], [0.072, 0.085, 0.07], 'head', { k: 0.03, tag: 'skin', imp: 3 });
  S.limb([0, 2.09, 0.62], [0, 2.062, 0.64], 0.012, 0.017, 'head', { k: 0.012, tag: 'skin', imp: 4 });
  S.sym((s) => { S.blob([0.035 * s, 2.112, 0.615], [0.03, 0.011, 0.018], 'head', { k: 0.008, tag: 'brow', imp: 4 }); S.blob([0.033 * s, 2.095, 0.612], [0.013, 0.01, 0.009], 'head', { k: 0.004, tag: 'eye', dir: [0.2 * s, 0, 1], imp: 4 }); S.blob([0.083 * s, 2.08, 0.51], [0.015, 0.025, 0.018], 'head', { k: 0.01, tag: 'skin' }); });
  S.blob([0, 2.0, 0.57], [0.068, 0.042, 0.06], 'jaw', { k: 0.02, tag: 'skin', imp: 3 });
  S.blob([0, 1.99, 0.595], [0.072, 0.07, 0.05], 'jaw', { k: 0.02, tag: 'hair', imp: 2 }); S.limb([0, 1.96, 0.61], [0, 1.88, 0.6], 0.04, 0.01, 'jaw', { k: 0.02, tag: 'hair' });
  S.blob([0, 2.14, 0.48], [0.098, 0.1, 0.11], 'head', { k: 0.03, tag: 'hair' });
  for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.4; S.limb([Math.sin(a) * 0.08, 2.1, 0.44 + Math.cos(a) * 0.02], [Math.sin(a) * 0.12, 1.86, 0.38], 0.035, 0.012, 'neck', { k: 0.02, tag: 'hair' }); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S.blob([Math.sin(a) * 0.095, 2.16 + Math.cos(a) * 0.01, 0.51 + Math.cos(a) * 0.1], [0.022, 0.012, 0.035], 'head', { k: 0.006, tag: 'laurel', dir: [Math.cos(a), 0.5, -Math.sin(a)] }); }
  S.limb([0.17, 1.92, 0.42], [-0.18, 1.55, 0.6], 0.02, 0.02, ['spine3', 'spine1'], { k: 0.008, tag: 'strap' });
  // tail: dock and long flowing hair
  const tp = ['tail1', 'tail2', 'tail3'].map((n) => J[n]); S.chain([...tp, TAIL_END], [0.06, 0.05, 0.04, 0.03], ['tail1', 'tail2', 'tail3'], { k: 0.03, tag: 'hair' });
  for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.03; S.limb([x, tp[2][1], tp[2][2]], [x * 1.6, 0.55, tp[2][2] - 0.25 - Math.abs(x)], 0.05, 0.015, 'tail3', { k: 0.03, tag: 'hair' }); }
}
const A = () => asset('centaur', { bones: BONES, sculpt, pal: PAL, cell: 0.016, target: 12500, atlas: 768, maxChart: 0.03, woundSkip: ['eye', 'hoof', 'laurel', 'hair'] });

const CLIPS = {
  attack: [[0, {}],
    [0.22, { hips: [0, 0.35, 0], spine2: [0, 0.2, 0], neck: [0, -0.4, 0], head: [0, -0.2, 0], uparm_L: [-1.25, -0.2, -0.45], forearm_L: [-0.2, 0, 0], hand_L: [0, 0, 0.3], uparm_R: [-1.2, 0.2, 0.3], forearm_R: [-1.6, 0, 0] }],
    [0.48, { hips: [-0.04, 0.45, 0], spine2: [-0.05, 0.25, 0], neck: [0, -0.5, 0], head: [0.05, -0.25, 0], uparm_L: [-1.45, -0.25, -0.5], forearm_L: [0, 0, 0], hand_L: [0, 0, 0.3], uparm_R: [-1.3, 0.9, -0.4], forearm_R: [-2.3, 0, 0], back2: [-0.04, 0, 0] }],
    [0.54, { hips: [-0.1, 0.4, 0], spine2: [-0.1, 0.2, 0], neck: [0, -0.45, 0], head: [-0.05, -0.2, 0], uparm_L: [-1.55, -0.3, -0.55], forearm_L: [0.05, 0, 0], hand_L: [-0.2, 0, 0.3], uparm_R: [-1.1, 1.1, -0.9], forearm_R: [-1.4, 0, 0], back2: [-0.08, 0, 0], farm_L: [-0.3, 0, 0] }],
    [0.9, {}]],
  cast: [[0, {}], [0.4, { back2: [-0.15, 0, 0], withers: [-0.12, 0, 0], farm_L: [-0.9, 0, 0], fore_L: [-1.2, 0, 0], farm_R: [-0.7, 0, 0], fore_R: [-1.0, 0, 0], thigh_L: [0.2, 0, 0], thigh_R: [0.2, 0, 0], spine2: [-0.2, 0, 0], head: [-0.3, 0, 0], uparm_L: [-0.5, 0, 0.4] }], [0.9, { back2: [-0.05, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0, -0.14], back2: [-0.05, 0.1, 0.04], spine1: [-0.12, 0.1, 0.05], spine2: [-0.15, 0.1, 0], head: [-0.35, 0.35, 0.15], uparm_R: [-0.4, 0, -0.5], forearm_R: [-0.8, 0, 0], farm_L: [-0.3, 0, 0], thigh_R: [0.3, 0, 0] }], [0.32, { head: [0.1, -0.1, 0] }], [0.65, {}]],
  die: [[0, {}], [0.2, { back2: [-0.15, 0, 0], farm_L: [-0.8, 0, 0], fore_L: [-1, 0, 0], spine2: [-0.3, 0, 0], head: [-0.4, 0.2, 0], uparm_L: [0, 0, 0.6], uparm_R: [0, 0, -0.6] }],
    [0.5, { farm_L: [0.6, 0, 0.1], farm_R: [0.6, 0, -0.1], fore_L: [-1.2, 0, 0], fore_R: [-1.2, 0, 0], thigh_L: [-0.6, 0, 0.2], thigh_R: [-0.6, 0, -0.2], shin_L: [0.6, 0, 0], shin_R: [0.6, 0, 0], spine1: [0.3, 0, 0], spine2: [0.2, 0, 0], head: [0.4, 0, 0] }],
    [0.85, { farm_L: [-0.3, 0, 0.3], farm_R: [0.3, 0, -0.3], thigh_L: [-0.3, 0, 0.3], thigh_R: [0.3, 0, -0.3], spine1: [0.2, 0, 0.3], spine2: [0.1, 0, 0.2], head: [0.2, 0.4, 0.3], uparm_L: [-0.5, 0, 0.6], uparm_R: [-0.4, 0, -0.9] }]],
};
const SPEC = {
  id: 'centaur', bones: BONES, height: 2.3, asset: A, clips: CLIPS, impact: 0.5,
  follow: { head: [22, 0.45], tail1: [8, 0.3], tail2: [7, 0.28], tail3: [6, 0.26] },
  props(ctx) {
    const { B, own, model } = ctx; const F = fistFrame(J, '_L'); const grip = F.wr.clone().addScaledVector(F.z, 0.042 * HH);
    const wood = own(K.uvMat('cent-bow', 32, 128, (u, v, o) => { const wrap = Math.abs(v - 0.5) < 0.07; K.tone(wrap ? hex('#6a2a1a') : hex('#4a3020'), K.band(0.5 + Math.cos(u * 6.28) * 0.22 + (wrap && Math.sin(v * 300) > 0.5 ? -0.15 : 0) + (Math.abs(v - 0.5) > 0.42 ? 0.15 : 0), 4), o.col); if (Math.abs(v - 0.5) > 0.44) { K.tone(hex('#d8c08a'), 0.6, o.col); } }));
    const bow = new THREE.Group(); const limb = new K.Loft(30, 8).set(K.curve([[0, -0.68, -0.09], [0, -0.58, -0.13], [0, -0.32, -0.06], [0, 0, 0.02], [0, 0.32, -0.06], [0, 0.58, -0.13], [0, 0.68, -0.09]]), (t) => { const e = Math.abs(t - 0.5) * 2; return [0.016 * (1 - e * 0.55), 0.024 * (1 - e * 0.6)]; });
    K.mesh(limb.geo, wood, bow); bow.position.copy(grip); bow.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.x, F.y, F.z)); B.map.hand_L.add(bow); bow.position.sub(new THREE.Vector3(...J.hand_L));
    const strMat = own(K.uvMat('cent-string', 4, 4, (u, v, o) => K.tone(hex('#e8e0c8'), 0.6, o.col))); const string = new K.Loft(3, 4); const sm = K.mesh(string.geo, strMat, bow);
    const arrowG = new THREE.Group(); const shaft = new K.Loft(10, 5).set((t, p) => p.set(0, 0, t * 0.82), (t) => (t > 0.93 ? 0.016 * (1 - (t - 0.93) / 0.07) + 0.002 : 0.0065));
    const am = own(K.uvMat('cent-arrow', 16, 64, (u, v, o) => { K.tone(v < 0.15 ? hex('#d04030') : v > 0.92 ? hex('#a8b0b8') : hex('#c8a070'), K.band(0.55 + Math.cos(u * 6.28) * 0.2, 3), o.col); }));
    K.mesh(shaft.geo, am, arrowG); for (const a of [0, 2.1, 4.2]) { const f = new K.Loft(4, 4).set((t, p) => p.set(Math.cos(a) * 0.015 * Math.sin(t * Math.PI), Math.sin(a) * 0.015 * Math.sin(t * Math.PI), 0.02 + t * 0.1), () => [0.002, 0.012], { ref: (t, n) => n.set(Math.cos(a), Math.sin(a), 0) }); K.mesh(f.geo, am, arrowG); }
    model.add(arrowG); arrowG.visible = false;
    // quiver on the back with fletchings showing
    const q = new THREE.LatheGeometry([[0.0, -0.32], [0.055, -0.31], [0.062, 0], [0.07, 0.3], [0.072, 0.31]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
    const qm = own(K.uvMat('cent-quiver', 32, 64, (u, v, o) => K.tone(Math.abs(v - 0.85) < 0.05 || Math.abs(v - 0.2) < 0.05 ? hex('#c8963a') : hex('#6a3a22'), K.band(0.5 + Math.cos(u * 6.28) * 0.2, 4), o.col)));
    const qv = K.mesh(q, qm); qv.position.set(-0.1, 1.92, 0.36); qv.rotation.set(0.25, 0, 0.5); B.map.spine3.add(qv); qv.position.sub(new THREE.Vector3(...J.spine3));
    for (let i = 0; i < 4; i++) { const g = arrowG.clone(); g.visible = true; g.scale.setScalar(0.5); g.position.set((i - 1.5) * 0.025, 0.2, (i % 2) * 0.02); g.rotation.x = -Math.PI / 2; qv.add(g); }
    Object.assign(ctx.vars, { bow, string, sm, arrowG, tips: [new THREE.Vector3(0, 0.68, -0.09), new THREE.Vector3(0, -0.68, -0.09)] });
  },
  after(dt, t, ctx) { // restring every frame: nocked to the right fist while drawing, an arrow along the draw
    const { bow, string, arrowG, tips } = ctx.vars; const st = ctx.st; ctx.root.updateWorldMatrix(true, true);
    const drawing = st.mode === 'attack' && st.modeT > 0.12 && st.modeT < 0.5 && !st.dead; const inv = new THREE.Matrix4().copy(bow.matrixWorld).invert();
    const R = new THREE.Vector3().setFromMatrixPosition(ctx.B.map.hand_R.matrixWorld).applyMatrix4(inv);
    const nock = drawing ? R : new THREE.Vector3(0, 0, -0.09); string.set((u, p) => (u < 0.5 ? p.lerpVectors(tips[0], nock, u * 2) : p.lerpVectors(nock, tips[1], (u - 0.5) * 2)), () => 0.004);
    arrowG.visible = drawing;
    if (drawing) { const ginv = new THREE.Matrix4().copy(ctx.model.matrixWorld).invert(); const n = nock.clone().applyMatrix4(bow.matrixWorld).applyMatrix4(ginv), g = new THREE.Vector3(0, 0, 0.02).applyMatrix4(bow.matrixWorld).applyMatrix4(ginv); arrowG.position.copy(n); arrowG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.sub(n).normalize()); }
  },
  idle(P, t, st) {
    const br = Math.sin(t * 1.5), sw = Math.sin(t * 0.6);
    add(P, 'back2', br * 0.01); add(P, 'spine2', br * 0.02); add(P, 'spine3', 0.03 + br * 0.015); add(P, 'neck', 0.03, Math.sin(t * 0.5) * 0.15); add(P, 'head', -0.02, Math.sin(t * 0.5 + 0.5) * 0.15);
    add(P, 'uparm_L', 0.05, 0, -0.12); add(P, 'forearm_L', -0.4, 0.3, 0); add(P, 'hand_L', 0.2, 0, 0); add(P, 'uparm_R', 0.02 + br * 0.02, 0, 0.12); add(P, 'forearm_R', -0.35);
    for (let i = 1; i <= 3; i++) add(P, 'tail' + i, 0.15 + Math.sin(t * 1.6 - i * 0.5) * 0.04, Math.sin(t * 1.1 - i * 0.6) * 0.15 * i, 0);
    add(P, 'farm_R', Math.max(0, Math.sin(t * 0.3) - 0.9) * -3, 0, 0); add(P, 'fore_R', Math.max(0, Math.sin(t * 0.3) - 0.9) * -6, 0, 0); // an idle hoof paw
    add(P, 'jaw', st.talk > 0 ? Math.abs(Math.sin(t * 15)) * 0.2 : 0);
  },
  gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, Math.sin(g + ph) * 0.55 * a); add(P, 'fore_L', -Math.max(0, Math.cos(g)) * 0.9 * a); add(P, 'fore_R', -Math.max(0, -Math.cos(g)) * 0.9 * a); },
  death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.1, rot: 1.36, lift: 0.07, slide: 0.03, t0: 0.32, t1: 0.68 }),
};
export const createCentaur = (seed) => createGeneric(SPEC, seed);
export const warmCentaur = () => void A();
