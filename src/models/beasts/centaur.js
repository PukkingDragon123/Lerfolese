// Centaur archer: a sculpted chestnut horse body (1.35 m at the withers; feathered stockings, hooves, long dark tail,
// a red sash at the join) carrying a human torso built on the SAME Limbo human base as Newton (legs severed at the
// hip, muscular, weathered, bearded, long hair, laurel wreath, quiver strap painted on). A recurve bow in the left
// fist. Attack: turn side-on, raise the bow, draw to the cheek, loose at impact, recoil; the horse rears on a cast.
import { THREE, K, hex, quadRows, sculptQuad, asset, createGeneric, add, fallSide } from './kit.js';
import { limboBeast, mount, recolor, near } from './humanoid.js';

const O = { Lb: 1.05, Hw: 1.35, W: 0.19, Ln: 0.2, Lh: 0.3, tail: 3, tailDir: [0, -0.7, -1], tailLen: 0.42 };
const REN = { spine1: 'back1', spine2: 'back2', spine3: 'withers' };
const QR = quadRows(O); const TAIL_END = QR.tailEnd;
const BONES = QR.filter((r) => !['neck1', 'neck2', 'head', 'jaw', 'ear_L', 'ear_R'].includes(r[0])).map(([n, p, v]) => [REN[n] || n, REN[p] || p, v]);
const J = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
const stock = (c, o) => { if (c.y < 0.42) K.tone(hex('#3a2418'), K.band(0.45 + c.ny * 0.1), o.col); };
const PAL = {
  coat: { s: 'skin', c: hex('#8a5030'), belly: hex('#9a6240'), fn: stock, age: 0.5 }, hoof: { s: 'keratin', c: hex('#2a2224'), rings: 120 }, hair: { s: 'hair', c: hex('#2a1a12') },
  sash: { s: 'cloth', c: hex('#8a2424'), folds: 14 }, default: { s: 'skin', c: hex('#8a5030') },
};
function sculpt(S) {
  sculptQuad(S, J, O, { bulk: 0.95, depth: 0.85, tuck: 0.04, legR: 0.85, hoof: true, names: REN, tags: { body: 'coat', leg: 'coat', paw: 'hoof' } });
  S.blob([0, 1.47, 0.48], [0.25, 0.09, 0.24], 'withers', { k: 0.04, tag: 'sash' }); S.blob([0, 1.42, 0.5], [0.22, 0.16, 0.2], 'withers', { k: 0.06, tag: 'coat' });
  const tp = ['tail1', 'tail2', 'tail3'].map((n) => J[n]); S.chain([...tp, TAIL_END], [0.06, 0.05, 0.04, 0.03], ['tail1', 'tail2', 'tail3'], { k: 0.03, tag: 'hair' });
  for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.03; S.limb([x, tp[2][1], tp[2][2]], [x * 1.6, 0.55, tp[2][2] - 0.25 - Math.abs(x)], 0.05, 0.015, 'tail3', { k: 0.03, tag: 'hair' }); }
}
const A = () => asset('centaur-horse', { bones: BONES, sculpt, pal: PAL, cell: 0.018, target: 9000, atlas: 640, maxChart: 0.03, woundSkip: ['hoof', 'hair'] });
const HCLIPS = {
  cast: [[0, {}], [0.4, { back2: [-0.15, 0, 0], withers: [-0.12, 0, 0], farm_L: [-0.9, 0, 0], fore_L: [-1.2, 0, 0], farm_R: [-0.7, 0, 0], fore_R: [-1.0, 0, 0], thigh_L: [0.2, 0, 0], thigh_R: [0.2, 0, 0] }], [0.9, { back2: [-0.05, 0, 0] }], [1.3, {}]],
  hurt: [[0, {}], [0.1, { _pos: [0, 0, -0.14], back2: [-0.05, 0.1, 0.04], farm_L: [-0.3, 0, 0], thigh_R: [0.3, 0, 0] }], [0.65, {}]],
  die: [[0, {}], [0.2, { back2: [-0.15, 0, 0], farm_L: [-0.8, 0, 0], fore_L: [-1, 0, 0] }], [0.5, { farm_L: [0.6, 0, 0.1], farm_R: [0.6, 0, -0.1], fore_L: [-1.2, 0, 0], fore_R: [-1.2, 0, 0], thigh_L: [-0.6, 0, 0.2], thigh_R: [-0.6, 0, -0.2] }],
    [0.85, { farm_L: [-0.3, 0, 0.3], farm_R: [0.3, 0, -0.3], thigh_L: [-0.3, 0, 0.3], thigh_R: [0.3, 0, -0.3] }]],
};
// the rider: Limbo torso, draw-and-loose on the engine's joints (right arm on -X)
const RCLIPS = {
  attack: [[0, {}], [0.22, { chest: [0, 0.4, 0], neck: [0, -0.35, 0], uarmL: [-1.45, 0, 0.25], farmL: [-0.1, 0, 0], uarmR: [-1.3, 0, -0.45], farmR: [-1.8, 0, 0] }],
    [0.48, { chest: [-0.04, 0.5, 0], neck: [0, -0.45, 0], uarmL: [-1.55, 0, 0.3], farmL: [0, 0, 0], uarmR: [-1.35, 0, -0.95], farmR: [-2.3, 0, 0] }],
    [0.55, { chest: [-0.1, 0.45, 0], neck: [0, -0.4, 0], uarmL: [-1.6, 0, 0.35], uarmR: [-1.0, 0, -1.3], farmR: [-1.2, 0, 0] }], [0.9, {}]],
};
const SKIN = hex('#b08a6a');
const riderHook = (paint, P, spec) => {
  const H = P.H, sk = spec.skin;
  const wrap = (fn) => (c, o) => {
    fn(c, o); if (!near(o, sk, 0.12)) return;
    if (Math.abs(c.x * 0.8 + (c.y - P.bustY) * 0.6) < 0.018 * H && c.y > P.pelvisY && c.y < P.shoulderY) return recolor(o, hex('#4a2c1a'), sk, 0, c, 'leather'); // quiver strap
    recolor(o, SKIN, sk, 0, c, 'skin', 0.7);
  };
  return { ...paint, acc: wrap(paint.acc || paint.body), body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
};
function bow(ctx) {
  const wood = K.uvMat('cent-bow2', 32, 128, (u, v, o) => { const wrap = Math.abs(v - 0.5) < 0.07; K.tone(wrap ? hex('#5a2418') : hex('#4a3020'), K.band(0.5 + Math.cos(u * 6.28) * 0.15 + (Math.abs(v - 0.5) > 0.42 ? 0.12 : 0)), o.col); });
  const g = new THREE.Group(); const limb = new K.Loft(30, 8).set(K.curve([[0, -0.09, -0.68], [0, -0.13, -0.58], [0, -0.06, -0.32], [0, 0.02, 0], [0, -0.06, 0.32], [0, -0.13, 0.58], [0, -0.09, 0.68]]), (t) => { const e = Math.abs(t - 0.5) * 2; return [0.016 * (1 - e * 0.55), 0.024 * (1 - e * 0.6)]; });
  K.mesh(limb.geo, wood, g); const str = new K.Loft(3, 4).set(K.curve([[0, -0.09, -0.68], [0, -0.09, 0.68]]), () => 0.004); K.mesh(str.geo, K.uvMat('cent-string', 4, 4, (u, v, o) => K.tone(hex('#d8d0b8'), 0.55, o.col)), g);
  mount(ctx, 'handL', g, { at: [0, -0.08 * ctx.sc, 0.01 * ctx.sc] }); return g;
}
const RIDER = {
  id: 'centaur-rider', height: 1.75, attack: 'idle', clips: RCLIPS, impact: 0.5, sway: 0.6, blood: [0.12, 0.004, 0.006], fall: false,
  app: { skin: 0xb08a6a, hair: 0x2a1a12, hairStyle: 'long', facialHair: 'beard', build: 'broad', age: 0.55, eyeColor: 0x4a3420, height: 1 }, outfit: {}, severed: ['thigh_l', 'thigh_r'], hook: riderHook, overrides: { hairVolume: 1.3 },
  build(ctx) {
    bow(ctx); const lm = K.uvMat('npc-laurel', 32, 16, (u, v, o) => { const leaf = Math.abs(((u * 18) % 1) - 0.5) < 0.3; K.tone(leaf ? hex('#4a7a34') : hex('#3a5a28'), K.band(0.5 + Math.cos(u * 6.28) * 0.15), o.col); });
    const hr = ctx.L.restOf('head'); const l = new K.Loft(4, 18).set((t, p) => p.set(0, t * 0.02, 0), () => [0.105, 0.11], {}); mount(ctx, 'head', K.mesh(l.geo, lm), { at: [0, (ctx.P.browY + 0.03 - hr.y) * ctx.sc, (ctx.P.hcz - hr.z) * ctx.sc] });
    const qm = K.uvMat('cent-quiver', 32, 64, (u, v, o) => K.tone(Math.abs(v - 0.85) < 0.05 ? hex('#a87a3a') : hex('#5a3420'), K.band(0.5 + Math.cos(u * 6.28) * 0.15), o.col));
    const q = K.mesh(new THREE.LatheGeometry([[0, -0.32], [0.055, -0.31], [0.062, 0], [0.07, 0.3], [0.072, 0.31]].map(([x, y]) => new THREE.Vector2(x, y)), 8), qm); q.rotation.set(0.25, 0, 0.5); mount(ctx, 'chest', q, { at: [-0.1, 0.18, -0.16] });
  },
  pose(add2, t, st, ctx) { if (ctx.anim.mode === 'idle' && st.mode !== 'attack') { add2('farmL', -0.5, 0.3, 0); add2('farmR', -0.3); } },
};
export function createCentaur(seed = 1) {
  const rider = limboBeast(RIDER, seed);
  const spec = {
    id: 'centaur', bones: BONES, height: 2.3, asset: A, clips: HCLIPS, impact: 0.5, follow: { tail1: [8, 0.3], tail2: [7, 0.28], tail3: [6, 0.26] },
    props(ctx) { const w = ctx.B.map.withers; rider.root.traverse((o) => { o.userData.keepMat = true; }); w.add(rider.root); rider.root.position.set(0, 1.42 - J.withers[1] - 0.94 * (1.75 / rider.L.P.crown), 0.02); },
    idle(P, t, st) { const br = Math.sin(t * 1.5); add(P, 'back2', br * 0.01); for (let i = 1; i <= 3; i++) add(P, 'tail' + i, 0.15 + Math.sin(t * 1.6 - i * 0.5) * 0.04, Math.sin(t * 1.1 - i * 0.6) * 0.15 * i, 0); add(P, 'farm_R', Math.max(0, Math.sin(t * 0.3) - 0.9) * -3); add(P, 'fore_R', Math.max(0, Math.sin(t * 0.3) - 0.9) * -6); },
    gait(P, g, a) { for (const [n, ph] of [['farm_L', 0], ['farm_R', Math.PI], ['thigh_L', Math.PI], ['thigh_R', 0]]) add(P, n, Math.sin(g + ph) * 0.55 * a); add(P, 'fore_L', -Math.max(0, Math.cos(g)) * 0.9 * a); add(P, 'fore_R', -Math.max(0, -Math.cos(g)) * 0.9 * a); },
    after(dt, t, ctx) { rider.root.userData.hl = ctx.root.userData.hl; rider.update(dt); },
    onAct(m) { rider.act(m === 'die' ? 'hurt' : m); },
    death: (T, m, ctx) => fallSide(T, m, ctx, { drop: 0.1, rot: 1.36, lift: 0.07, slide: 0.03, t0: 0.32, t1: 0.68 }),
  };
  const api = createGeneric(spec, seed); api.impactTime = 0.5;
  const sw = api.setWounds.bind(api); api.setWounds = (v) => { sw(v); rider.setWounds(v); };
  const tk = api.talk.bind(api); api.talk = (s = 1) => { tk(s); rider.talk(s); };
  api.rider = rider; return api;
}
export const warmCentaur = () => void A();
