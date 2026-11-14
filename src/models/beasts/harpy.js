// Harpy on the human base: a gaunt Limbo woman (wiry build, aged, ribs painted hard through the skin, wild long hair)
// whose arms are replaced by great feathered wings on their own shoulder/elbow/hand bones and whose shins end in
// scaly bird legs with long hooked talons; feathers repainted over the bust, hips and thighs. She hovers and beats.
// Attack: rise back with wings high, a talons-first dive (impact), a hard down-beat recovery. Death: she drops.
import { THREE, K, hex, limboBeast, mount, recolor, furTexel, near } from './humanoid.js';
import { makeBones, rigidSkinned } from './rig.js';

const FEATH = hex('#4a3e36'), SKIN = hex('#c2a690');
const add3l = (a, d, l, dy) => { const n = Math.hypot(...d); return [a[0] + (d[0] / n) * l, a[1] + (d[1] / n) * l + dy * l, a[2] + (d[2] / n) * l]; };
const feather = (a, dir, len, w) => new K.Loft(10, 6).set(K.curve([a, add3l(a, dir, len * 0.5, -0.02), add3l(a, dir, len, -0.05)]), (t) => [w * Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) * 0.9 + 0.004, 0.005], { ref: (t, n) => n.set(0, 1, 0) }).geo;
const featherMat = () => K.uvMat('harpy-feather2', 32, 128, (u, v, o) => {
  const top = Math.abs(((u + 0.25) % 0.5) - 0.25) < 0.03; const barb = Math.sin(v * 70 + Math.abs(u - 0.5) * 30) > 0.8; const torn = K.vnoise(u * 8, v * 30, 2) > 0.8 && v > 0.6;
  K.tone(v > 0.78 ? hex('#8a7a66') : v > 0.55 ? hex('#5a4a3e') : hex('#463a32'), K.band(0.5 + Math.cos(u * 6.28) * 0.12 + (top ? 0.2 : 0) + (barb ? -0.1 : 0) + (torn ? -0.3 : 0)), o.col);
});
const harpyHook = (paint, P, spec) => {
  const H = P.H, sk = spec.skin;
  const wrap = (fn) => (c, o) => {
    fn(c, o); if (!near(o, sk, 0.14)) return;
    const front = c.nz > 0.25; const ax = Math.abs(c.x);
    if (c.y < P.pelvisY + 0.02 * H || (front && Math.abs(c.y - P.bustY) < 0.05 * H && ax < 0.11 * H) || c.y > P.shoulderY - 0.03 * H && ax > 0.08 * H) return furTexel(c, o, FEATH, sk, H, 0.016, (c.y % (0.03 * H)) < 0.006 * H ? -0.12 : 0); // feathered bust, shoulders, hips
    const rib = c.y > P.waistY && c.y < P.bustY - 0.03 * H && ax > 0.04 * H && Math.abs((((c.y - ax * 0.4) / H) * 34) % 1 - 0.5) < 0.12; // gaunt ribcage
    recolor(o, SKIN, sk, rib ? -0.22 : 0, c, 'skin', 0.85);
  };
  return { ...paint, acc: wrap(paint.acc || paint.body), body: wrap(paint.body), skin: wrap(paint.skin) };
};
const WING = (s, L) => [['w1' + L, 'wroot', [0.16 * s, 0.19, -0.06]], ['w2' + L, 'w1' + L, [0.45 * s, 0.25, -0.1]], ['w3' + L, 'w2' + L, [0.76 * s, 0.21, -0.08]]];
const CLIPS = {
  attack: [[0, {}], [0.3, { _pos: [0, 0.35, -0.3], spine: [-0.15, 0, 0], chest: [-0.12, 0, 0], head: [-0.2, 0, 0], thighL: [-0.6, 0, 0], thighR: [-0.6, 0, 0] }],
    [0.45, { _pos: [0, -0.3, 0.55], spine: [0.3, 0, 0], chest: [0.2, 0, 0], head: [0.1, 0, 0], thighL: [-1.2, 0, 0], thighR: [-1.1, 0, 0], shinL: [-0.3, 0, 0], shinR: [-0.3, 0, 0] }],
    [0.65, { _pos: [0, -0.1, 0.4], spine: [0.1, 0, 0], thighL: [-0.5, 0, 0], thighR: [-0.5, 0, 0] }], [0.95, {}]],
};
export const warmHarpy = () => void featherMat();
export const createHarpy = (seed = 1) => limboBeast({
  id: 'harpy', height: 1.7, blood: [0.12, 0.004, 0.006], speed: 1.1, sway: 0.8, impact: 0.45, attack: 'strike', clips: CLIPS,
  app: { skin: 0xc2a690, hair: 0x2a2024, hairStyle: 'long', build: 'wiry', bodyShape: 0.9, age: 0.8, eyeColor: 0xb07a2a, height: 1 },
  outfit: {}, severed: ['uarm_l', 'uarm_r', 'shin_l', 'shin_r'], overrides: { hairVolume: 1.7, eyeW: 0.92, eyeH: 0.82 }, hook: harpyHook,
  hover: (t, st) => { const up = 0.5 + Math.sin(t * 5.5) * 0.05; if (!st.dead) return up; const f = Math.min(1, st.deadT / 0.4); return up * (1 - f * f); },
  build(ctx) {
    const { sc } = ctx; const wg = new THREE.Group(); mount(ctx, 'chest', wg);
    const B = makeBones([['wroot', null, [0, 0, 0]], ...WING(1, '_L'), ...WING(-1, '_R')]); const parts = [];
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
      const w1 = B.map['w1' + L].userData.rest.toArray(), w2 = B.map['w2' + L].userData.rest.toArray(), w3 = B.map['w3' + L].userData.rest.toArray(), tip = [1.02 * s, 0.15, -0.06]; const lerp = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
      for (let i = 0; i < 9; i++) { const k = i / 8; parts.push([feather(lerp(w3, tip, k), [s * (0.25 + k * 0.9), -0.12, -1 + k * 0.6], 0.5 - Math.abs(k - 0.5) * 0.18, 0.055), 'w3' + L]); }
      for (let i = 0; i < 8; i++) { const k = i / 7; parts.push([feather(lerp(w2, w3, k), [s * 0.18, -0.18, -1], 0.42, 0.055), 'w2' + L]); }
      for (let i = 0; i < 8; i++) { const k = i / 7; const a = lerp(w1, w3, k); a[1] += 0.02; parts.push([feather(a, [s * 0.1, -0.08, -1], 0.2, 0.045), k < 0.5 ? 'w2' + L : 'w3' + L]); }
      const arm = new K.Loft(10, 8).set(K.curve([w1, w2, w3, tip]), (t) => 0.05 * (1 - t * 0.7)); parts.push([arm.geo, 'w2' + L]);
    }
    rigidSkinned(B, parts, featherMat(), wg); ctx.vars.wings = B.map;
    // scaly bird legs from the knee, hooked talons
    const lm = K.uvMat('harpy-leg', 32, 64, (u, v, o) => { const C = K.cells2(u * 8, v * 18); K.tone(hex('#a08a5c'), K.band(0.5 + Math.cos(u * 6.28) * 0.15 + (C[1] - C[0] < 0.1 ? -0.2 : 0)), o.col); });
    const tm = K.uvMat('harpy-talon', 16, 32, (u, v, o) => K.tone(hex('#2a2228'), K.band(0.5 + Math.cos(u * 6.28) * 0.25 + v * 0.1), o.col)); ctx.vars.legs = [];
    for (const b of ['shinL', 'shinR']) {
      const g = new THREE.Group(); mount(ctx, b, g); const crv = K.curve([[0, 0, 0], [0, -0.12, 0.05], [0, -0.26, -0.06], [0, -0.4, -0.01], [0, -0.46, 0.04]]);
      const leg = K.skinnedLoft(18, 8, crv, (t) => { const r = t < 0.3 ? 0.055 - t * 0.08 : 0.03 - (t - 0.3) * 0.012; return [r, r]; }, {}, 3, g, lm); ctx.vars.legs.push(leg.bones);
      const toes = new THREE.Group(); const f = crv(1, new THREE.Vector3()); toes.position.copy(f).multiplyScalar(-1); leg.bones[3].add(toes);
      for (const a of [-0.45, 0, 0.45]) toes.add(K.mesh(new K.Loft(6, 5).set(K.curve([[f.x, f.y, f.z], [f.x + Math.sin(a) * 0.07, f.y - 0.025, f.z + 0.08], [f.x + Math.sin(a) * 0.11, f.y - 0.07, f.z + 0.12]]), (t) => 0.016 * (1 - t) + 0.002).geo, tm));
      toes.add(K.mesh(new K.Loft(6, 5).set(K.curve([[f.x, f.y, f.z], [f.x, f.y - 0.02, f.z - 0.07], [f.x, f.y - 0.06, f.z - 0.1]]), (t) => 0.014 * (1 - t) + 0.002).geo, tm));
    }
    void sc;
  },
  pose(add) { add('spine', 0.08); add('neck', -0.05); add('thighL', -0.3); add('thighR', -0.25); add('shinL', 0.5); add('shinR', 0.45); },
  update(dt, ctx, t) {
    const st = ctx.st, W = ctx.vars.wings; const at = st.mode === 'attack' ? st.modeT : -1; const fl = Math.sin(t * 5.5);
    const raise = at >= 0 && at < 0.32 ? Math.sin((at / 0.32) * Math.PI * 0.5) : 0, sweep = at >= 0.32 && at < 0.6 ? 1 : 0, dead = st.dead > 0 ? Math.min(1, st.deadT / 0.5) : 0;
    for (const [s, L] of [[1, '_L'], [-1, '_R']]) {
      W['w1' + L].rotation.set(0, (-0.35 - sweep * 0.5) * s, ((0.15 + fl * 0.55) * (1 - dead) + raise * 0.9 - sweep * 0.3 + dead * 0.6) * s);
      W['w2' + L].rotation.set(0, 0.25 * s, (-0.1 - fl * 0.25 * (1 - dead) - sweep * 0.3) * s); W['w3' + L].rotation.set(0, 0.2 * s, (-0.1 - fl * 0.2 * (1 - dead)) * s);
    }
    ctx.vars.legs.forEach((bs) => bs.forEach((b, i) => b.rotation.set(i === 1 ? -0.2 : i === 2 ? 0.5 : 0, 0, 0)));
  },
}, seed);
