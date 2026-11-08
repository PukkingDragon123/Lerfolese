// Mythical Wilderness creatures. The humanoids are built on the Limbo Phobia low-poly people (src/models/limbo, ported
// from the user's own game) rendered smooth with cel shading: satyr (pot belly, digitigrade goat legs, horns, wineskin,
// pan flute), medusa (scaled skin, snake hair, serpent tail), kobalos (goblin proportions, hood, sack of stolen cards)
// and the minotaur (bulky body under the repainted Poly Haven CC0 bull head, labrys). Paint hooks recolour the Limbo
// pixel page per creature. Horns, tails, snakes, props and the hydra are smooth lofted meshes with painted textures.
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import * as K from './charkit.js';
import { LimboBody, LimboAnim } from './limbo/rig.js';

const { hex } = K;
const T3 = [0, 0, 0];
const fur = (c, o, col, size = 0.03, stretch = 2.2) => K.fur3(c, o, col, size, stretch);
const curls = (c, o, col) => K.fur3(c, o, col, 0.012, 1.1, 0.52);
function scaleCell(p1, p2, s) { const r = Math.floor(p2 / s); const u = p1 / s + (r & 1) * 0.5; return Math.hypot(u - Math.floor(u) - 0.5, (p2 / s - r - 0.2) * 0.9); }
const planar = (c) => { const ax = Math.abs(c.nx), ay = Math.abs(c.ny), az = Math.abs(c.nz); return ax > ay && ax > az ? [c.z, c.y] : az > ay ? [c.x, c.y] : [c.x, c.z]; };

// ---- Limbo paint-hook helpers (o is the painter's RGBA float array)
const lum = (o) => o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11;
const near = (o, col, tol = 0.09) => Math.abs(o[0] / (col[0] + 1) - o[1] / (col[1] + 1)) + Math.abs(o[1] / (col[1] + 1) - o[2] / (col[2] + 1)) < tol;
const put = (o, c) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
/** clean banded tone of colour `col` from the painter's own shading (lit relative to `ref`) plus an offset */
const toneFrom = (o, col, ref, add = 0) => { const L = 0.5 + (lum(o) / (ref[0] * 0.3 + ref[1] * 0.59 + ref[2] * 0.11) - 1) * 0.6 + add; put(o, K.tone(col, K.band(L, 4), T3)); };
/** hand-painted fur clumps (crisp, lit tops, dark scalloped lower edges) */
function furPx(c, o, col, ref, size = 0.03, stretch = 1.5) { const Y = c.y / (size * stretch); const C = K.cells3(c.x / size, Y, c.z / size); const dy = Y - C[3]; toneFrom(o, col, ref, dy * 0.45 + (C[5] - 0.5) * 0.14 - (C[1] - C[0] < 0.08 && dy < 0.05 ? 0.3 : 0)); }
/** reptile scales on a body texel */
function scalePx(c, o, col, ref, size = 0.016) { const [p1, p2] = planar(c); const d = scaleCell(p1, p2, size); toneFrom(o, col, ref, d > 0.44 ? -0.28 : (0.44 - d) * 0.45); }

// ---------------------------------------------------------------- shared rig state (battle conventions)
function rig(root, height, proc = false) {
  const st = { t: Math.random() * 10, mode: 'idle', modeT: 0, hit: new Spring(0, 14, 0.35), lunge: new Spring(0, 9, 0.45), lift: new Spring(0, 10, 0.4), dead: 0, talk: 0 };
  return {
    root, height, st,
    act(mode) { st.mode = mode; st.modeT = 0; if (mode === 'hurt') st.hit.kick(10); if (mode === 'attack') st.lunge.kick(9); if (mode === 'cast') st.lift.kick(6); if (mode === 'die') st.dead = 0.001; this.onAct?.(mode); },
    talk(s = 1) { st.talk = s; },
    common(dt) {
      st.t += dt; st.modeT += dt; for (const k of ['hit', 'lunge', 'lift']) st[k].update(dt);
      if (st.talk > 0) st.talk -= dt;
      if (st.dead > 0) { st.dead = Math.min(1, st.dead + dt * 1.4); if (proc) { root.rotation.z = -st.dead * 1.35; root.position.y = -st.dead * 0.3; root.scale.setScalar(1 - st.dead * 0.08); } }
      if (st.mode !== 'idle' && st.mode !== 'die' && st.modeT > 1.3) st.mode = 'idle';
    },
  };
}

// ---------------------------------------------------------------- Limbo humanoid assembly
const ANIM = { hurt: 'hit', die: 'death', cheer: 'cheer' };
function limboHumanoid(id, cfg, seed) {
  const root = new THREE.Group(); root.name = id;
  const L = new LimboBody(cfg.app, cfg.outfit, { severed: cfg.severed || [], hook: cfg.hook, overrides: cfg.overrides || {} });
  const sc = cfg.height / (cfg.refH || L.P.crown); L.root.scale.setScalar(sc); root.add(L.root);
  const anim = new LimboAnim(L, { sway: cfg.sway ?? 1, speed: cfg.speed ?? 1 }); anim.t += seed * 1.7;
  const head = new THREE.Group(); L.bones.head.add(head); head.position.set(0, 0.14, 0.03);
  const R_ = rig(root, cfg.height); R_.head = head; const M = { L, B: L.bones, P: L.P, anim, x: {}, root, sc };
  R_.onAct = (mode) => { const a = { ...ANIM, attack: cfg.attack || 'attack', cast: cfg.cast || 'cast' }[mode]; if (a) anim.play(a, { hold: mode === 'die' }); if (mode === 'hurt') L.setExpression('pain', 0.9); if (mode === 'attack' || mode === 'cast') L.setExpression(cfg.angry || 'angry', 1.2); };
  R_.talk = (s = 1) => { R_.st.talk = s; L.talk(s); };
  cfg.build?.(M);
  if (cfg.expr) L.setExpression(cfg.expr);
  anim.extra = (add, t) => cfg.pose?.(add, t, R_.st, M);
  R_.update = (dt) => { R_.common(dt); anim.update(dt * (cfg.animSpeed || 1)); cfg.update?.(M, R_.st, dt, R_); };
  return R_;
}
const at = (L, bone, obj, cancel = 1) => L.attach(obj, bone, cancel);
// lofted pieces
function horn(pts, r0, mat, rings = 18) { const l = new K.Loft(rings, 14).set(K.curve(pts), (t) => r0 * (1 - t * 0.88) * (1 + Math.sin(t * 40) * 0.04)); return K.mesh(l.geo, mat); }
const hornMat = (key, base, tip, gold) => K.uvMat(key, 32, 128, (u, v, o) => { const ring = Math.sin(v * 70) * 0.5 + 0.5; K.tone(base, K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.22 + (ring - 0.5) * 0.25, 4), o.col); if (v > 0.6) K.mixc(o.col, tip, K.sstep(0.6, 0.95, v)); if (gold && v > 0.82) { K.tone(hex('#f2c454'), 0.5 + Math.cos(u * 6.28) * 0.3, o.col); o.me = 0.55; o.ro = 0.3; } else o.ro = 0.5; });

function ivyLeaf(mat) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(-0.6, 0.2, -0.9, 0.7); s.quadraticCurveTo(-0.45, 0.7, -0.35, 1.05); s.quadraticCurveTo(-0.1, 0.95, 0, 1.4);
  s.quadraticCurveTo(0.1, 0.95, 0.35, 1.05); s.quadraticCurveTo(0.45, 0.7, 0.9, 0.7); s.quadraticCurveTo(0.6, 0.2, 0, 0);
  const g = new THREE.ShapeGeometry(s, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.abs(p.getX(i)) * 0.25 + p.getY(i) * p.getY(i) * 0.05); g.computeVertexNormals(); g.scale(0.024, 0.024, 0.024);
  return g;
}
// ================================================================== Drunk Satyr
const SAT = { skin: [196, 124, 78], fur: hex('#8e5e3a'), pants: [138, 90, 56], hoof: hex('#2a2026'), nose: [226, 66, 58], gold: hex('#f0c050') };
function satyrHook(paint, P, spec) {
  const H = P.H;
  const wrap = (fn) => (c, o) => {
    fn(c, o);
    if (near(o, SAT.pants, 0.12) && c.y < P.waistY) return furPx(c, o, SAT.fur, SAT.pants, 0.03);
    if (near(o, spec.skin) && c.nz > 0.3 && c.y > P.bustY - 0.07 * H && c.y < P.shoulderY - 0.01 * H && Math.abs(c.x) < 0.05 * H && K.vnoise(c.x * 160, c.y * 160, c.z * 160) < 0.55) return furPx(c, o, hex('#3a2216'), spec.skin, 0.012, 1.1);
    const d = c.x * 0.8 + (c.y - (P.bustY - 0.02 * H)) * 0.6; // wine-stained sash, left shoulder to right hip
    if (c.part !== 'uarm' && c.part !== 'farm' && Math.abs(d) < 0.022 && c.y > P.pelvisY && c.y < P.shoulderY + 0.02 * H) return toneFrom(o, Math.abs(d) > 0.017 ? SAT.gold : hex('#8a2a64'), spec.skin, 0.05);
  };
  return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin) };
}
const goatFur = () => K.uvMat('goatfur', 128, 128, (u, v, o) => K.fur2(u, v, o, SAT.fur, 12, 7, 0.52));
const hoofMat = () => K.uvMat('hoof', 32, 32, (u, v, o) => { K.tone(SAT.hoof, K.band(0.5 + Math.cos(u * 6.28) * 0.3 + v * 0.15, 3), o.col); });
const tufty = (a, t, amt) => 1 + amt * Math.abs((((a / (Math.PI * 2)) * 9 + t * 2) % 1) - 0.5) * 2;
function goatLeg(x, P, furM, hoofM) { // digitigrade shin from the knee: back to the hock, down the cannon to a cloven hoof
  const g = new THREE.Group(); const k = P.kneeY;
  const leg = new K.Loft(24, 16).set(K.curve([[x, k + 0.05, 0.0], [x, k - 0.09, -0.05], [x, k * 0.52, -0.115], [x, k * 0.35, -0.1], [x, 0.11, -0.05], [x, 0.06, -0.02]]),
    (t) => { const r = t < 0.3 ? 0.075 - t * 0.085 : t < 0.55 ? 0.05 - (t - 0.3) * 0.055 : t < 0.85 ? 0.036 - (t - 0.55) * 0.02 : 0.03 + (t - 0.85) * 0.13; return [r, r]; },
    { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => tufty(a, t, t < 0.45 || t > 0.86 ? 0.28 : 0.07) });
  K.mesh(leg.geo, furM, g);
  for (const s of [-1, 1]) { const tx = x + s * 0.016; K.mesh(new K.Loft(8, 12).set(K.curve([[tx, 0.065, -0.025], [tx + s * 0.003, 0.035, 0.005], [tx + s * 0.004, 0.012, 0.04]]), (t) => [0.02 - t * 0.007, 0.024 - t * 0.011], { ref: (t, n) => n.set(0, 1, 0), shape: (a) => 1 - Math.max(0, -Math.cos(a)) * 0.3 }).geo, hoofM, g); }
  return g;
}
function panFlute(x, y, z) { // six cane pipes bound with cord, hanging from the right fist
  const g = new THREE.Group(); const m = K.uvMat('cane', 32, 64, (u, v, o) => { K.tone(hex('#d6aa58'), K.band(0.5 + Math.cos(u * 6.28) * 0.3, 3), o.col); if (((v * 5) % 1) < 0.07) K.mixc(o.col, hex('#6a4220'), 0.6); if (v < 0.1) K.tone(hex('#7a2a4a'), 0.5, o.col); });
  for (let j = 0; j < 6; j++) { const zz = z - 0.035 + j * 0.0145, len = 0.085 + j * 0.022; K.mesh(new K.Loft(4, 10).set((t, p) => p.set(x, y - t * len, zz), () => 0.0072).geo, m, g); }
  return g;
}
function satyr(seed) {
  return limboHumanoid('satyr', {
    app: { skin: 0xc47c4e, hair: 0x3a2216, hairStyle: 'curly', facialHair: 'beard', build: 'heavy', age: 0.45, nose: 2, ears: 2, mouth: 1, face: 6, eyeColor: 0x8a5a1a },
    outfit: { legs: { tex: 'c_sweatpants', color: 0x8a5a38 }, legsKind: 'pants' }, severed: ['shin_l', 'shin_r'], hook: satyrHook,
    overrides: { blush: 0.7, hairVolume: 1.2 }, height: 2.0, expr: 'happy', attack: 'punch', speed: 0.85,
    build(M) {
      const { L, P } = M; const fm = goatFur(), hm = hoofMat();
      for (const [b, x] of [['shinL', L.restOf('shinL').x], ['shinR', L.restOf('shinR').x]]) {
        at(L, b, goatLeg(x, P, fm, hm));
        const th = new K.Loft(14, 18).set((t, p) => p.set(x * (0.94 + t * 0.06), P.hipY + 0.02 - t * (P.hipY - P.kneeY), 0), (t) => { const r = 0.085 - t * 0.02; return [r, r]; }, { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => tufty(a, t * 3, 0.22) });
        at(L, b === 'shinL' ? 'thighL' : 'thighR', K.mesh(th.geo, fm));
      }
      const hmat = hornMat('satyr-horn', hex('#e2d2b0'), hex('#5a4232')); const g = new THREE.Group(); const cy = P.crown, cz = P.hcz;
      for (const s of [-1, 1]) g.add(horn([[s * 0.035, cy - 0.03, cz + 0.05], [s * 0.065, cy + 0.04, cz + 0.03], [s * 0.115, cy + 0.08, cz - 0.05], [s * 0.15, cy + 0.04, cz - 0.13], [s * 0.14, cy - 0.04, cz - 0.12], [s * 0.12, cy - 0.07, cz - 0.06]], 0.026, hmat, 22));
      const leafG = ivyLeaf(); const greens = [hex('#4f8a3a'), hex('#3e7034'), hex('#6aa048')].map((c) => K.paintedMat(K.paintUV(4, 4, (u, v, o) => { o.col[0] = c[0]; o.col[1] = c[1]; o.col[2] = c[2]; }), { side: THREE.DoubleSide }));
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const l = K.mesh(leafG, greens[i % 3], g); l.position.set(Math.sin(a) * (P.hw + 0.016), P.hairY + 0.012 + Math.sin(i * 2.3) * 0.005, cz + Math.cos(a) * (P.hd + 0.012)); l.rotation.set(-0.6, a + (i % 2 ? 0.5 : -0.4), 0.3 * Math.sin(i)); }
      at(L, 'head', g);
      const h = L.restOf('handL'); const wm = K.uvMat('wineskin', 64, 128, (u, v, o) => { K.tone(hex('#7a4426'), K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.28, 4), o.col); if (Math.abs(u - 0.5) < 0.012 && (v * 40) % 1 < 0.6) K.mixc(o.col, hex('#e0c890'), 0.8); if (v < 0.16 && v > 0.1) K.tone(hex('#c9a060'), 0.55, o.col); if (v > 0.93) K.tone(hex('#2a1810'), 0.4, o.col); });
      const bag = new K.Loft(24, 16).set(K.curve([[h.x, h.y - 0.05, 0.02], [h.x + 0.01, h.y - 0.1, 0.03], [h.x + 0.02, h.y - 0.2, 0.04], [h.x + 0.02, h.y - 0.3, 0.04], [h.x + 0.015, h.y - 0.34, 0.04]]), (t) => { const r = t < 0.12 ? 0.016 : t < 0.22 ? 0.016 + (t - 0.12) * 0.55 : 0.07 * Math.sin(Math.min(1, (t - 0.08) / 0.92) * Math.PI * 0.95) + 0.012; return [r * 0.8, r]; }, { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => 1 + Math.sin(a * 3 + t * 9) * 0.05 });
      at(L, 'handL', K.mesh(bag.geo, wm)); const hr = L.restOf('handR'); at(L, 'handR', panFlute(hr.x, hr.y - 0.06, hr.z + 0.02));
    },
    pose(add, t, st) { const sway = Math.sin(t * 1.3) * 0.1 + Math.sin(t * 0.47) * 0.06; add('spine', 0, 0, sway * 0.5); add('neck', Math.sin(t * 1.7) * 0.06, 0, -sway * 0.7); add('head', 0, Math.sin(t * 0.8) * 0.15, Math.sin(t * 2.1) * 0.06); add('farmL', -0.5); },
    update(M, st) { if (Math.sin(st.t * 0.37) > 0.995) st.lift.kick(5); M.L.root.position.y = st.lift.value * 0.04; },
  }, seed);
}

// ================================================================== Medusa
const MED = { skin: [92, 156, 92], belly: hex('#a8c87a'), dark: hex('#2c563c'), cloth: [106, 44, 122], gold: hex('#f0c050') };
function medusaHook(paint, P, spec) {
  const H = P.H;
  const wrap = (fn) => (c, o) => {
    fn(c, o); if (!near(o, spec.skin)) return;
    const front = c.nz > 0.45 && Math.abs(c.x) < 0.07 * H && c.y < P.bustY && c.y > P.pelvisY && c.part !== 'uarm' && c.part !== 'farm';
    if (c.y > P.neckBase - 0.012 * H && c.y < P.neckBase + 0.004 * H && c.mat !== 'head') return toneFrom(o, MED.gold, spec.skin, 0.12);
    scalePx(c, o, front ? MED.belly : MED.skin, spec.skin, front ? 0.022 : 0.014);
    if (!front && K.vnoise(c.x * 26, c.y * 26, c.z * 26) > 0.7) put(o, K.mixc([o[0], o[1], o[2]], K.tone(MED.dark, 0.4, T3), 0.5));
  };
  return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand), head: wrap(paint.head), ear: wrap(paint.ear) };
}
const tailMat = () => K.uvMat('serpent', 128, 256, (u, v, o) => {
  const belly = Math.abs(u - 0.5) < 0.17; const vv = v * 22;
  if (belly) { const plate = vv % 1; K.tone(MED.belly, K.band(0.55 - plate * 0.3 + (plate > 0.88 ? -0.2 : 0), 4), o.col); o.ro = 0.4; return; }
  const d = scaleCell(u * 40, vv * 1.6, 1); const dia = Math.abs(((u * 4 + 0.5) % 1) - 0.5) + Math.abs(((vv * 0.5) % 1) - 0.5) < 0.22;
  K.tone(dia ? MED.dark : MED.skin, K.band(0.55 + Math.cos(u * Math.PI * 2) * 0.15 + (d > 0.44 ? -0.25 : (0.44 - d) * 0.5), 4), o.col); o.ro = 0.35;
});
const snakeMat = () => K.uvMat('snakehair', 64, 128, (u, v, o) => {
  const belly = Math.abs(u - 0.5) < 0.18; const d = scaleCell(u * 14, v * 40, 1);
  K.tone(belly ? hex('#d8d070') : v > 0.8 ? hex('#3a7a40') : MED.skin, K.band(0.55 + Math.cos(u * 6.28) * 0.15 + (d > 0.44 ? -0.2 : 0), 4), o.col);
  if (!belly && ((v * 10) % 1) < 0.25 && v < 0.8) K.mixc(o.col, MED.dark, 0.6);
  if (v > 0.86 && v < 0.9 && (Math.abs(u - 0.25) < 0.05 || Math.abs(u - 0.75) < 0.05)) { o.col[0] = 255; o.col[1] = 230; o.col[2] = 60; o.em = [255, 220, 40]; }
  o.ro = 0.4;
});
function medusa(seed) {
  return limboHumanoid('medusa', {
    app: { skin: 0x5c9c5c, hair: 0x1e4a2e, hairStyle: 'buzz', bodyShape: 1, build: 'slim', age: 0, eyeColor: 0xd8f040, mouth: 1, face: 7, brows: 3 },
    outfit: { torso: { tex: 'c_bandeau', color: 0x6a2c7a } }, severed: ['thigh_l', 'thigh_r'], hook: medusaHook,
    overrides: { makeup: { liner: 1, lash: 1, shadow: [60, 140, 80] }, lipstick: 0x5a2650 }, height: 2.3, refH: 1.75, expr: 'cool', angry: 'angry', attack: 'cast',
    build(M) {
      const { L, P } = M; const tail = new K.Loft(56, 18); K.mesh(tail.geo, tailMat(), L.root);
      const coil = []; for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 - 0.2 - i * 0.62; const r = 0.26 - i * 0.006; coil.push(new THREE.Vector3(Math.cos(a) * r, 0.1 + Math.max(0, i - 6) * 0.032 + (i > 11 ? 0.08 : 0), -0.05 + Math.sin(a) * r)); }
      M.x.tail = { tail, coil, pts: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), ...coil.map((v) => v.clone())] };
      const g = new THREE.Group(); at(L, 'head', g); const sm = snakeMat(); const snakes = []; const hc = new THREE.Vector3(0, (P.hairY + P.eyeY) / 2 + 0.01, P.hcz - 0.01);
      for (let i = 0; i < 13; i++) {
        const az = -2.2 + (i / 12) * 4.4 + Math.PI, el = 0.3 + (i % 3) * 0.33; const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
        const base = hc.clone().add(new THREE.Vector3(dir.x * P.hw * 0.95, dir.y * 0.09, dir.z * P.hd * 0.95)); const l = new K.Loft(18, 10); K.mesh(l.geo, sm, g);
        snakes.push({ l, base, dir, len: 0.17 + (i % 4) * 0.025, ph: i * 1.7, built: false });
      }
      M.x.snakes = snakes;
    },
    pose(add, t, st) { add('spine', 0, 0, Math.sin(t * 0.9) * 0.05); add('head', st.mode === 'cast' ? 0.15 : 0, Math.sin(t * 0.5) * 0.2, 0); add('uarmR', -0.4, 0, -0.15); add('farmR', -0.9); },
    update(M, st, dt, R_) {
      const t = st.t, { L } = M; L.root.position.y = Math.sin(t * 1.4) * 0.03 + st.lift.value * 0.05;
      const { tail, coil, pts } = M.x.tail; R_.root.updateMatrixWorld(true);
      L.bones.hips.getWorldPosition(pts[0]); L.root.worldToLocal(pts[0]); pts[0].y += 0.04;
      pts[1].set(pts[0].x * 0.5, pts[0].y * 0.55, pts[0].z + 0.03); pts[2].set(0.02, 0.22, 0.12);
      for (let i = 0; i < coil.length; i++) pts[3 + i].copy(coil[i]).add(new THREE.Vector3(Math.sin(t * 1.4 - i * 0.6) * 0.012 * i, 0, Math.cos(t * 1.1 - i * 0.5) * 0.01 * i));
      const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); const hr = M.P.hipsX * 1.05;
      tail.set((u, out) => cv.getPoint(u, out), (u) => { const r = u < 0.05 ? hr : hr * (1 - (u - 0.05) * 0.9) + 0.008; return [r * 1.04, r * 0.96]; }, { ref: (u, n) => { const k = K.sstep(0.05, 0.32, u); return k < 0.5 ? n.set(k * 2, 0, -(1 - k * 2)) : n.set(1 - (k - 0.5) * 2, (k - 0.5) * 2, 0); } });
      for (const s of M.x.snakes) {
        const { base, dir, len, ph } = s; const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        s.l.set((u, out) => { out.copy(base).addScaledVector(dir, u * len * 0.8).add(new THREE.Vector3(0, -u * u * len * 0.55 + Math.sin(u * 4 + t * 3 + ph) * 0.02 * u, 0)).addScaledVector(side, Math.sin(u * 7 - t * 4 + ph) * 0.025 * u); },
          (u) => { const r = u < 0.78 ? 0.013 * (1 - u * 0.45) : u < 0.9 ? 0.0092 + Math.sin((u - 0.78) / 0.12 * Math.PI) * 0.0065 : 0.0092 * (1 - (u - 0.9) * 7); return [r * 1.25, r]; });
      }
    },
  }, seed);
}

// ================================================================== Kobalos (goblin thief)
const KOB = { skin: [168, 210, 78], hood: [196, 46, 60], shorts: [224, 160, 64], wart: hex('#6e9a34'), ink: hex('#22160c') };
function kobHook(paint, P, spec) {
  const wrap = (fn) => (c, o) => { fn(c, o); if (near(o, spec.skin) && K.vnoise(c.x * 70, c.y * 70, c.z * 70) > 0.8) toneFrom(o, KOB.wart, spec.skin); if (near(o, KOB.shorts, 0.12)) { const cell = K.cells3(c.x / 0.05, c.y / 0.05, c.z / 0.05); if (cell[5] > 0.75) toneFrom(o, hex('#8a3a9a'), KOB.shorts); else if (cell[5] < 0.18) toneFrom(o, hex('#4a6ad0'), KOB.shorts); if (cell[1] - cell[0] < 0.06 && cell[5] > 0.75) put(o, [232, 216, 168]); } };
  return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin), head: wrap(paint.head) };
}
const sackMat = () => K.uvMat('sack', 128, 128, (u, v, o) => { const w = (Math.sin(u * 420) * Math.sin(v * 420)) * 0.5; const patch = u > 0.15 && u < 0.32 && v > 0.45 && v < 0.62; K.tone(patch ? hex('#7a6a8a') : hex('#a8865a'), K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.2 + w * 0.15 + (K.fbm(u * 8, v * 8, 1, 2) - 0.5) * 0.3, 4), o.col); if (patch && (u < 0.165 || u > 0.305 || v < 0.465 || v > 0.605) && ((u + v) * 200) % 1 < 0.5) K.mixc(o.col, hex('#2a1a10'), 0.7); if (v < 0.12 && v > 0.06) K.tone(hex('#5a3a1c'), 0.5 + Math.sin(u * 60) * 0.2, o.col); if (v < 0.06 && Math.sin(u * 50) > 0.2) { K.tone(hex('#f2c454'), 0.75, o.col); o.me = 0.55; o.ro = 0.3; } else o.ro = 0.95; });
const KH = 1.5, KPIV = new THREE.Vector3(0, 1.6, 0);
function earLoft(s, P, mat) { const y = (P.earTop + P.earBot) / 2, x0 = P.hw * 0.9, z0 = P.hcz - 0.01; const l = new K.Loft(14, 12).set(K.curve([[s * x0, y, z0], [s * (x0 + 0.07), y + 0.035, z0 - 0.02], [s * (x0 + 0.16), y + 0.08, z0 - 0.05], [s * (x0 + 0.23), y + 0.12, z0 - 0.09]]), (t) => [0.009 * (1 - t) + 0.002, 0.05 * Math.sin(Math.min(1, t * 1.3 + 0.15) * Math.PI) * (1 - t * 0.5) + 0.003], { ref: (t, n) => n.set(0, 0, 1), shape: (a) => 1 + Math.max(0, Math.sin(a)) * 0.6 }); return K.mesh(l.geo, mat); }
const cardMat = () => K.uvMat('stolen-card', 32, 48, (u, v, o) => { const edge = u < 0.1 || u > 0.9 || v < 0.07 || v > 0.93; K.tone(edge ? hex('#f2e6c8') : hex('#3a5ab8'), edge ? 0.6 : 0.5 + (Math.abs(((u + v) * 6) % 1 - 0.5) < 0.12 ? 0.2 : 0), o.col); if (!edge && Math.hypot(u - 0.5, v - 0.5) < 0.16) { K.tone(hex('#f0c050'), 0.7, o.col); } o.ro = 0.6; }, { side: THREE.DoubleSide });
function kobalos(seed) {
  return limboHumanoid('kobalos', {
    app: { skin: 0xa8d24e, hair: 0x2a2a18, hairStyle: 'bald', build: 'slim', age: 0.6, ears: 2, nose: 3, mouth: 5, eyeColor: 0xffd02c, face: 7, brows: 1, height: 1 },
    outfit: { torso: { tex: 'c_hoodie', color: 0xc42e3c }, legs: { tex: 'c_shorts', color: 0xe0a040 }, legsKind: 'shorts' }, hook: kobHook,
    height: 1.5, expr: 'grin', angry: 'grin', attack: 'punch', cast: 'throw', speed: 1.25,
    build(M) {
      const { L, P, B } = M; B.head.scale.setScalar(1.42); for (const k of ['uarmL', 'uarmR', 'farmL', 'farmR']) B[k].scale.set(1, 1.22, 1); B.handL.scale.setScalar(1.3); B.handR.scale.setScalar(1.3);
      const em = K.uvMat('kob-ear', 64, 64, (u, v, o) => { const inner = Math.sin(u * Math.PI * 2) > 0.3; K.tone(inner ? hex('#e07a6a') : [168, 210, 78], K.band(0.5 + Math.cos(u * 6.28) * 0.2 - (inner ? 0.1 : 0), 4), o.col); }, { side: THREE.DoubleSide });
      const g = new THREE.Group(); for (const s of [-1, 1]) g.add(earLoft(s, P, em)); at(L, 'head', g);
      const sk = new THREE.Group(); const cm = cardMat(); const y0 = P.shoulderY, z0 = -P.chestZ;
      const sack = new K.Loft(22, 16).set(K.curve([[0.1, y0 + 0.1, z0 - 0.02], [0.06, y0 + 0.02, z0 - 0.1], [0.0, y0 - 0.14, z0 - 0.19], [-0.05, y0 - 0.32, z0 - 0.18], [-0.07, y0 - 0.42, z0 - 0.12]]), (t) => { const r = t < 0.12 ? 0.04 : 0.04 + Math.sin(Math.min(1, (t - 0.12) / 0.88) * Math.PI) * 0.2; return [r, r * 0.8]; }, { ref: (t, n) => n.set(0, 0, -1), shape: (a, t) => 1 + (K.vnoise(Math.cos(a) * 2 + 3, Math.sin(a) * 2, t * 5) - 0.5) * 0.3 });
      K.mesh(sack.geo, sackMat(), sk);
      for (let i = 0; i < 5; i++) { const c = K.mesh(new THREE.PlaneGeometry(0.07, 0.1), cm, sk); c.position.set(0.1 + (i - 2) * 0.022, y0 + 0.14 - Math.abs(i - 2) * 0.012, z0 - 0.01 + (i % 2) * 0.012); c.rotation.set(-0.3 + i * 0.08, 0.4 + i * 0.25, (i - 2) * 0.35); }
      at(L, 'chest', sk);
    },
    pose(add, t, st) { add('chest', 0.5); add('spine', 0.15); add('neck', -0.15); add('head', -0.45 + (st.talk > 0 ? Math.sin(t * 20) * 0.1 : 0), Math.sin(t * 0.7) * 0.3, Math.sin(t * 6) * 0.05); add('thighL', -0.25, 0, 0.12); add('thighR', -0.25, 0, -0.12); add('shinL', 0.45); add('shinR', 0.45); add('footL', -0.2); add('footR', -0.2); add('uarmL', -0.25, 0, 0.15); add('uarmR', -0.25, 0, -0.15); },
    update(M, st) { const t = st.t; M.L.root.position.y = Math.abs(Math.sin(t * 4.2)) * 0.03 + st.lift.value * 0.06 - 0.06; M.L.root.position.x = st.lunge.value * 0.12 - st.hit.value * 0.06; },
  }, seed);
}

// ================================================================== Minotaur (+ king)
const MIN = { skin: [150, 84, 54], fur: hex('#4a2a1a'), furL: hex('#6a3e26'), leather: [124, 74, 40], bronze: hex('#dc9a3a'), hoof: hex('#1e1618'), gold: hex('#f4c650'), cape: hex('#8e1e2e') };
function minoHook(king) {
  return (paint, P, spec) => {
    const H = P.H, metal = king ? MIN.gold : MIN.bronze;
    const wrap = (fn) => (c, o) => {
      fn(c, o);
      if (near(o, MIN.leather, 0.12)) { const a = Math.atan2(c.x, c.z); const f = ((a / Math.PI) * 9 % 1 + 1) % 1; if (f < 0.08 || f > 0.92) put(o, [60, 30, 22]); else if (Math.abs(c.y - (P.kneeY + 0.1 * H)) < 0.012 && Math.abs(f - 0.5) < 0.15) toneFrom(o, metal, MIN.leather, 0.2); return; }
      if (!near(o, spec.skin)) return;
      if (c.y < P.ankleY + 0.01 * H) return toneFrom(o, MIN.hoof, spec.skin, 0.05);
      if (c.y < P.crotchY) return furPx(c, o, king ? hex('#3a2014') : MIN.fur, spec.skin, 0.04, 1.3);
      if (Math.abs(c.y - P.pelvisY) < 0.02 * H) return toneFrom(o, metal, spec.skin, Math.abs(c.y - P.pelvisY) < 0.004 * H ? -0.2 : 0.1);
      if (king && c.nz < -0.3 && c.y > P.waistY && c.y < P.shoulderY && c.part !== 'uarm') return toneFrom(o, Math.abs(c.x) > 0.11 * H ? MIN.gold : MIN.cape, spec.skin);
      if (c.nz > 0.1 && c.y > P.bustY - 0.06 * H && c.y < P.shoulderY && Math.abs(c.x) < 0.03 * H + (c.y - P.bustY + 0.06 * H) * 0.6) return furPx(c, o, MIN.furL, spec.skin, 0.02, 1.4);
      const d = -c.x * 0.75 + (c.y - P.bustY) * 0.66; if (c.part !== 'uarm' && c.part !== 'farm' && Math.abs(d) < 0.02 && c.y > P.pelvisY) return toneFrom(o, MIN.leather, spec.skin);
      if (c.part === 'farm' && c.y < P.elbowY - 0.04 * H && c.y > P.wristY + 0.02 * H) return toneFrom(o, MIN.leather, spec.skin, (Math.abs(((c.y * 60) % 1) - 0.5) < 0.1 ? -0.25 : 0));
      toneFrom(o, MIN.skin, spec.skin);
    };
    return { ...paint, body: wrap(paint.body), skin: wrap(paint.skin), hand: wrap(paint.hand) };
  };
}
function bullPaint(king) {
  return (c, o) => {
    const ax = Math.abs(c.x);
    const hornT = ax > 0.085 && c.y > 0.27 ? K.clamp01((ax - 0.085) / 0.075) : 0;
    if (hornT > 0) { K.tone(hex('#e2d4b4'), K.band(0.5 + c.ny * 0.25 + Math.sin(ax * 320) * 0.12, 4), o.col); if (hornT > 0.55) K.mixc(o.col, hex('#3a2a22'), K.sstep(0.55, 0.95, hornT)); if (king && hornT > 0.82) { K.tone(MIN.gold, 0.7 + c.ny * 0.2, o.col); o.me = 0.55; o.ro = 0.3; } else o.ro = 0.45; if (king && Math.abs(hornT - 0.12) < 0.04) { K.tone(MIN.gold, 0.7, o.col); o.me = 0.55; } return; }
    const eye = Math.hypot(ax - 0.07, c.y - 0.287, c.z - 0.035); if (eye < 0.015) { if (eye < 0.01) { o.col[0] = 255; o.col[1] = 70; o.col[2] = 40; o.em = [255, 50, 20]; } else K.tone(hex('#1a0c08'), 0.4, o.col); return; }
    if (c.z > 0.055 && c.y < 0.25) { K.tone(hex('#6e5a52'), K.band(0.5 + c.ny * 0.2 + c.nz * 0.15, 4), o.col); o.ro = 0.35; if (c.z > 0.085 && Math.abs(ax - 0.028) < 0.013 && c.y > 0.165 && c.y < 0.2) K.tone(hex('#1a0e10'), 0.3, o.col); return; }
    if (c.y > 0.32 && ax < 0.07) return curls(c, o, king ? hex('#4a2a1a') : MIN.furL);
    fur(c, o, king ? hex('#3a2014') : MIN.fur, 0.016, 1.6);
  };
}
let BULL = null;
function bullGeo() { // the Poly Haven bull head (plinth cut, decimated), in metres with its own UVs
  if (BULL) return BULL; const src = K.srcMesh('bull_head'); src.updateWorldMatrix(true, false);
  const geo = src.geometry.clone(); geo.applyMatrix4(src.matrixWorld); BULL = { geo, src }; return BULL;
}
const labrysMat = (king) => K.uvMat(king ? 'labrys-k' : 'labrys', 64, 64, (u, v, o) => { const n = K.fbm(u * 10, v * 10, 4, 2); K.tone(king ? MIN.gold : MIN.bronze, K.band(0.5 + (n - 0.5) * 0.5 + (Math.abs(((u * 6) % 1) - 0.5) < 0.04 ? -0.25 : 0), 4), o.col); o.me = 0.55; o.ro = 0.35; });
function labrys(hand, king) { // hangs from the right fist: turned haft, double crescent bronze blades (rest-pose coordinates)
  const g = new THREE.Group(); const X = hand.x - 0.01, Y = hand.y - 0.04, Z = hand.z + 0.01, Lh = 0.8;
  K.mesh(new K.Loft(20, 12).set((t, p) => p.set(X, Y + 0.08 - t * Lh, Z), (t) => 0.017 * (1 + (t > 0.04 && t < 0.24 && Math.sin(t * 160) > 0 ? 0.18 : 0)) * (t > 0.97 ? 1.6 : 1)).geo, K.uvMat('haft', 32, 64, (u, v, o) => { const wrap = v > 0.04 && v < 0.24; K.tone(wrap ? hex('#3a2416') : hex('#8a5a32'), K.band(0.5 + Math.cos(u * 6.28) * 0.2, 4), o.col); }), g);
  const s = new THREE.Shape(); s.moveTo(0, -0.07); s.lineTo(0.12, -0.11); s.quadraticCurveTo(0.2, -0.26, 0.3, -0.3); s.quadraticCurveTo(0.4, 0, 0.3, 0.3); s.quadraticCurveTo(0.2, 0.26, 0.12, 0.11); s.lineTo(0, 0.07); s.closePath();
  const bm = labrysMat(king); const k = king ? 0.55 : 0.48;
  for (const sgn of [-1, 1]) {
    const bg = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.015, bevelSegments: 3, curveSegments: 16 }); bg.translate(0, 0, -0.02);
    bg.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, sgn), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-sgn, 0, 0))); bg.scale(k, k, k); bg.translate(X, Y + 0.08 - Lh * 0.88, Z); bg.computeVertexNormals(); K.mesh(bg, bm, g);
  }
  return g;
}
function minotaur(seed, king = false) {
  const id = king ? 'minotaur_king' : 'minotaur';
  return limboHumanoid(id, {
    app: { skin: 0x965436, hair: 0x2a1810, hairStyle: 'bald', build: 'broad', age: 0.3, height: 1 },
    outfit: { legs: { tex: 'c_skirt', color: 0x7c4a28 }, legsKind: 'skirt' }, hook: minoHook(king), height: 3.0, speed: 0.9, attack: 'attack',
    build(M) {
      const { L, P, B } = M; B.chest.scale.setScalar(1.12); B.head.scale.setScalar(0.01); // the human head folds away inside the bull's
      at(L, 'handR', labrys(L.restOf('handR'), king));
      K.withAssets(['bull_head'], () => {
        const mat = (MATS_BULL[id] ||= K.paintedMat(K.paintSurface(K.surface('bull', { geometry: bullGeo().geo, isSkinnedMesh: false }, 512), bullPaint(king))));
        const bull = K.mesh(BULL.geo, mat); const s = 1.3; bull.scale.setScalar(s); bull.position.set(0, P.chin - 0.08 - 0.108 * s, P.hcz + 0.05); bull.rotation.x = -0.1;
        at(L, 'head', bull, 0.01 / 1.12);
      });
    },
    pose(add, t, st) { add('chest', Math.sin(t * 1.8) * 0.03); add('head', -0.08 + Math.sin(t * 1.8) * 0.04, Math.sin(t * 0.6) * 0.15); add('uarmL', 0, 0, 0.12); add('uarmR', 0, 0, -0.1); },
    update(M, st) { M.L.root.position.x = st.lunge.value * 0.15 - st.hit.value * 0.05; },
  }, seed);
}
const MATS_BULL = {};

// ================================================================== Hydra body + heads (sculpted lofts)
const HYD = { top: hex('#3f8c6c'), side: hex('#66b46a'), belly: hex('#d8c27a'), dark: hex('#173c36'), spine: hex('#a8303e') };
const hydraMat = (key, vr, hasBelly = true) => K.uvMat(key, 128, 256, (u, v, o) => {
  const belly = hasBelly && Math.abs(u - 0.5) < 0.16; const vv = v * vr;
  if (belly) { const pl = (vv * 3) % 1; K.tone(HYD.belly, K.band(0.55 - pl * 0.3 + (pl > 0.86 ? -0.2 : 0), 4), o.col); o.ro = 0.45; return; }
  const top = Math.abs(u - 0.5) > 0.36; const d = scaleCell(u * 36, vv * 6, 1); const blot = K.vnoise(u * 9, vv * 1.6, 7) > 0.66;
  K.tone(blot ? HYD.dark : top ? HYD.top : HYD.side, K.band(0.55 + Math.cos(u * Math.PI * 2) * 0.18 + (d > 0.44 ? -0.28 : (0.44 - d) * 0.5), 4), o.col); o.ro = 0.35;
});
const spineMat = () => K.uvMat('hyd-spine', 32, 64, (u, v, o) => { K.tone(HYD.spine, K.band(0.6 + Math.cos(u * 6.28) * 0.25 - v * 0.2, 4), o.col); if (v > 0.75) K.mixc(o.col, hex('#f0d8b0'), 0.7); o.ro = 0.4; });
function hydra(seed, elder = false) { // heavy reptilian body, planted splayed legs, long tail, shoulder mass carrying the necks
  const root = new THREE.Group(); root.name = 'hydra'; const body = new THREE.Group(); body.position.set(0, 0.75, -0.3); root.add(body);
  const mat = hydraMat('hyd-body', 7), legM = hydraMat('hyd-leg', 2.5, false), sp = spineMat();
  const spinePts = [[0.9, -0.66, -3.3], [0.6, -0.64, -2.7], [0.2, -0.52, -2.05], [0, -0.28, -1.4], [0, -0.06, -0.8], [0, 0.08, -0.2], [0, 0.2, 0.35], [0, 0.12, 0.78]];
  const spine = new THREE.CatmullRomCurve3(spinePts.map((q) => new THREE.Vector3(...q)), false, 'centripetal');
  const prof = (t) => { const r = t < 0.42 ? 0.03 + Math.pow(t / 0.42, 1.25) * 0.42 : t < 0.62 ? 0.45 + (t - 0.42) * 0.9 : t < 0.86 ? 0.63 + Math.sin((t - 0.62) / 0.24 * Math.PI) * 0.06 : 0.63 * Math.sqrt(Math.max(0, (1 - t) / 0.14)) + 0.02; return [r * 1.12, r * (t > 0.7 && t < 0.92 ? 0.95 : 0.8)]; };
  const torso = new K.Loft(72, 30); torso.set((t, out) => spine.getPoint(t, out), prof, { shape: (a, t) => 1 - Math.max(0, -Math.cos(a)) * 0.24 + (t > 0.66 && t < 0.92 ? Math.max(0, Math.cos(a)) * 0.12 : 0) });
  K.mesh(torso.geo, mat, body);
  const legs = [];
  for (const [x, z, f] of [[-1, 0.3, 1], [1, 0.3, 1], [-1, -0.95, -1], [1, -0.95, -1]]) {
    const g = new THREE.Group(); body.add(g); const zz = z + (f > 0 ? 0.05 : 0);
    const pts = [[x * 0.4, 0.05, z], [x * 0.78, -0.08, z + 0.04 * f], [x * 0.95, -0.3, zz + 0.04], [x * 0.92, -0.58, zz + 0.1], [x * 0.92, -0.71, zz + 0.2]];
    K.mesh(new K.Loft(22, 20).set(K.curve(pts), (t) => { const r = t < 0.35 ? 0.3 - t * 0.28 : t < 0.8 ? 0.2 - (t - 0.35) * 0.08 : 0.165 + (t - 0.8) * 0.2; return [r, t > 0.82 ? r * 0.5 : r]; }, { ref: (t, n) => n.set(0, 0, 1) }).geo, legM, g);
    for (const cx of [-0.08, 0, 0.08]) K.mesh(new K.Loft(8, 10).set(K.curve([[x * 0.92 + cx, -0.7, zz + 0.32], [x * 0.92 + cx * 1.3, -0.72, zz + 0.43], [x * 0.92 + cx * 1.4, -0.76, zz + 0.49]]), (t) => 0.03 * (1 - t) + 0.003).geo, sp, g);
    legs.push({ g, x, z });
  }
  for (let i = 0; i < 16; i++) { const t = 0.12 + i * 0.05; const p = spine.getPoint(t); const r = prof(t)[1] * (t > 0.66 && t < 0.92 ? 1.1 : 1); const h = 0.08 + Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.14; K.mesh(new K.Loft(8, 10).set(K.curve([[p.x, p.y + r * 0.85, p.z], [p.x, p.y + r + h * 0.7, p.z - 0.06], [p.x, p.y + r + h, p.z - 0.16]]), (u) => 0.055 * (1 - u) * (0.6 + h * 2) + 0.003).geo, sp, body); }
  const anchors = [new THREE.Vector3(0, 0.78, 0.62), new THREE.Vector3(-0.32, 0.72, 0.58), new THREE.Vector3(0.32, 0.72, 0.58), new THREE.Vector3(-0.15, 0.85, 0.4), new THREE.Vector3(0.15, 0.85, 0.4), new THREE.Vector3(-0.52, 0.55, 0.5), new THREE.Vector3(0.52, 0.55, 0.5)];
  const nm = hydraMat('hyd-neck', 2);
  for (const a of anchors) K.mesh(new K.Loft(10, 20).set(K.curve([[a.x * 0.5, a.y * 0.2, a.z * 0.5], [a.x * 0.8, a.y * 0.65, a.z * 0.8], [a.x, a.y, a.z]]), (t) => 0.24 - t * 0.08, { ref: (t, n) => n.set(0, 0, -1) }).geo, nm, body);
  const sc = elder ? 1.08 : 1;
  const R_ = rig(root, 2.2, true);
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t, st = R_.st;
    body.position.y = 0.75 + Math.sin(t * 1.5) * 0.03; body.scale.set(sc * (1 + Math.sin(t * 1.5) * 0.012), sc, sc); body.rotation.y = Math.sin(t * 0.4) * 0.05 - st.hit.value * 0.03;
    body.rotation.x = -st.hit.value * 0.02 + st.lunge.value * 0.02;
  };
  R_.anchor = (i, out = new THREE.Vector3()) => { body.updateMatrixWorld(true); return out.copy(anchors[i % anchors.length]).applyMatrix4(body.matrixWorld); };
  R_.head = body; return R_;
}
function hydraHead(seed = 1) {
  const root = new THREE.Group(); root.name = 'hydra_head'; const head = new THREE.Group(); root.add(head);
  const skullM = K.uvMat('hyd-skull', 128, 128, (u, v, o) => {
    const eye = Math.hypot((Math.min(Math.abs(u - 0.27), Math.abs(u - 0.73))) * 2.2, v - 0.42);
    if (eye < 0.07) { if (eye < 0.05) { const slit = Math.abs(v - 0.42) < 0.05 && Math.min(Math.abs(u - 0.27), Math.abs(u - 0.73)) < 0.006; K.tone(slit ? [20, 10, 20] : hex('#d8ff40'), 0.65, o.col); if (!slit) o.em = [210, 255, 60]; } else K.tone(HYD.dark, 0.3, o.col); return; }
    const belly = Math.abs(u - 0.5) < 0.16; const d = scaleCell(u * 30, v * 14, 1);
    K.tone(belly ? HYD.belly : Math.abs(u - 0.5) > 0.38 ? HYD.top : HYD.side, K.band(0.55 + Math.cos(u * 6.28) * 0.2 + (d > 0.44 ? -0.25 : 0.05) - (v > 0.9 ? 0.1 : 0), 4), o.col);
    if (v > 0.93 && Math.abs(u - 0.5) > 0.4 && Math.abs(u - 0.5) < 0.47) K.mixc(o.col, [20, 10, 18], 0.8); o.ro = 0.35;
  });
  const skull = new K.Loft(26, 26).set((t, p) => p.set(0, 0.02 + Math.sin(t * Math.PI) * 0.02 - t * 0.04, -0.2 + t * 0.55), (t) => { const w = t < 0.3 ? 0.13 + t * 0.12 : t < 0.5 ? 0.166 - (t - 0.3) * 0.15 : 0.136 - (t - 0.5) * 0.17; const h = t < 0.35 ? 0.11 + t * 0.06 : 0.131 - (t - 0.35) * 0.15; return t > 0.97 ? [w * 0.6, h * 0.6] : [w, h]; }, { shape: (a) => 1 - Math.max(0, -Math.cos(a)) * 0.45 });
  K.mesh(skull.geo, skullM, head);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.04, -0.1); head.add(jaw);
  K.mesh(new K.Loft(18, 22).set((t, p) => p.set(0, -0.025 - Math.sin(t * Math.PI) * 0.01, t * 0.42), (t) => [0.12 - t * 0.075, 0.05 - t * 0.025], { shape: (a) => 1 - Math.max(0, Math.cos(a)) * 0.5 }).geo, hydraMat('hyd-jaw', 1.5), jaw);
  const fangM = K.uvMat('fang', 16, 32, (u, v, o) => { K.tone(hex('#f2e6c8'), K.band(0.6 + Math.cos(u * 6.28) * 0.2 - v * 0.15, 3), o.col); o.ro = 0.3; });
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    const z = 0.05 + i * 0.055, x = s * (0.085 - i * 0.011);
    K.mesh(new K.Loft(6, 8).set(K.curve([[x, -0.035, z], [x, -0.07, z + 0.004], [x * 0.97, -0.09, z + 0.012]]), (t) => 0.011 * (1 - t) + 0.001).geo, fangM, head);
    K.mesh(new K.Loft(6, 8).set(K.curve([[x * 0.92, -0.02, z + 0.1], [x * 0.92, 0.01, z + 0.104], [x * 0.9, 0.03, z + 0.11]]), (t) => 0.009 * (1 - t) + 0.001).geo, fangM, jaw);
  }
  const sp = spineMat(); for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.06; K.mesh(new K.Loft(8, 10).set(K.curve([[x, 0.1, -0.08 - Math.abs(x)], [x * 1.4, 0.2, -0.18], [x * 1.7, 0.24, -0.32]]), (t) => 0.03 * (1 - t) + 0.002).geo, sp, head); }
  // neck: one lofted tube swept every frame from the body's anchor to this head (lives in api.neckGroup)
  const neckGroup = new THREE.Group(); const neck = new K.Loft(26, 20); const neckM = K.mesh(neck.geo, hydraMat('hyd-neckf', 4), neckGroup);
  const R_ = rig(root, 0.6, true); R_.neckGroup = neckGroup; R_.anchorPos = null; R_.head = head; R_.jaw = jaw;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), inv = new THREE.Matrix4(); let built = false;
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t + seed, st = R_.st;
    head.position.set(Math.sin(t * 1.3) * 0.08 + st.lunge.value * 0.05, Math.sin(t * 1.7) * 0.1 + st.lift.value * 0.05, st.lunge.value * 0.2 - st.hit.value * 0.1);
    head.rotation.set(Math.sin(t * 1.1) * 0.15 - st.hit.value * 0.05, Math.sin(t * 0.7) * 0.25, Math.sin(t * 0.9) * 0.1);
    jaw.rotation.x = st.mode === 'attack' ? Math.max(0, Math.sin(st.modeT * 10)) * 0.6 : 0.12 + Math.sin(t * 2.3) * 0.08 + (st.talk > 0 ? Math.abs(Math.sin(t * 18)) * 0.3 : 0);
    neckGroup.visible = !!R_.anchorPos && st.dead < 0.5;
    if (R_.anchorPos) {
      root.updateMatrixWorld(true); B.set(0, -0.02, -0.16).applyMatrix4(head.matrixWorld); A.copy(R_.anchorPos);
      C.copy(A).lerp(B, 0.5); C.y += 0.35; const curve = new THREE.QuadraticBezierCurve3(A.clone(), C.clone(), B.clone());
      if (neckGroup.parent) { neckGroup.parent.updateMatrixWorld(true); inv.copy(neckGroup.parent.matrixWorld).invert(); } else inv.identity();
      neck.set((u, out) => curve.getPoint(u, out).applyMatrix4(inv), (u) => [0.15 - u * 0.05, 0.13 - u * 0.045], { normals: !built }); built = true;
    }
  };
  return R_;
}

const BUILDERS = { satyr, medusa, kobalos, minotaur: (s) => minotaur(s, false), minotaur_king: (s) => minotaur(s, true), hydra: (s) => hydra(s, false), hydra_elder: (s) => hydra(s, true), hydra_head: hydraHead };
export function createCreature(id, seed = 1) {
  const api = (BUILDERS[id] || satyr)(seed);
  api.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  api.update(0.016); return api;
}
