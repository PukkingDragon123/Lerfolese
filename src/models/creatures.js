// Mythical Wilderness creatures. Humanoids are the CC0 Quaternius Universal Base Characters (male / female),
// animated with the Universal Animation Library, reshaped with bone scales and wearing painted UV atlases (fur,
// scales, rags, leather, faces). Horns, snake hair, the serpent tail, ears, the minotaur's bull head (Poly Haven
// CC0 bull_head, repainted), props and the hydra are sculpted lofts / real meshes with painted textures.
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import * as K from './charkit.js';

const { hex } = K;
const T3 = [0, 0, 0];
const FM = K.FACE.male, FF = K.FACE.female;
const skin = (c, o, col, k = 0.45, extra = 0) => { K.tone(col, K.band(0.5 + c.ny * 0.15 + c.nz * 0.06 + c.sh * k + extra, 4), o.col); o.ro = 0.6; };
const fur = (c, o, col, size = 0.03, stretch = 2.2) => K.fur3(c, o, col, size, stretch);
const curls = (c, o, col) => K.fur3(c, o, col, 0.012, 1.1, 0.52);
const isHead = (c) => c.b === 'Head' || (c.y > 1.585 && Math.abs(c.x) < 0.13);
const isArm = (c) => Math.abs(c.x) > 0.19 && c.y > 1.3;
function hoof(c, o, col) { K.tone(col, K.band(0.45 + c.ny * 0.3 + c.nz * 0.15, 4), o.col); o.ro = 0.3; if (Math.abs(Math.abs(c.x) - 0.114) < 0.004 && c.z > 0.02) K.mixc(o.col, [10, 6, 12], 0.7); }
function scaleCell(p1, p2, s) { const r = Math.floor(p2 / s); const u = p1 / s + (r & 1) * 0.5; return Math.hypot(u - Math.floor(u) - 0.5, (p2 / s - r - 0.2) * 0.9); }
const planar = (c) => { const ax = Math.abs(c.nx), ay = Math.abs(c.ny), az = Math.abs(c.nz); return ax > ay && ax > az ? [c.z, c.y] : az > ay ? [c.x, c.y] : [c.x, c.z]; };

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

// ---------------------------------------------------------------- humanoid assembly
const MATS = {};
function humanoid(id, cfg, seed) {
  const root = new THREE.Group(); root.name = id;
  const head = new THREE.Group(); head.position.set(0, cfg.height * 0.88, 0); root.add(head);
  const R_ = rig(root, cfg.height); R_.head = head; let M = null;
  const ANIM = { hurt: 'hit', attack: cfg.attack || 'attack', cast: cfg.cast || 'cast', die: 'death', cheer: 'cheer' };
  R_.onAct = (mode) => { if (M && ANIM[mode]) M.anim.play(ANIM[mode], { hold: mode === 'die', speed: cfg.animSpeed?.[mode] || 1 }); };
  R_.update = (dt) => {
    R_.common(dt); if (!M) return; const st = R_.st;
    M.anim.update(dt * (cfg.speed || 1));
    cfg.update?.(M, st, dt, R_);
    if (st.talk > 0) M.anim.nudge(M.bones.Head, Math.sin(st.t * 15) * 0.07, 0, Math.sin(st.t * 7) * 0.04);
    if (st.hit.value > 0.05) M.anim.nudge(M.bones.spine_02, -st.hit.value * 0.03, 0, 0);
  };
  K.withAssets(['base_' + cfg.base, 'anims', cfg.base + '_shade.png', ...(cfg.assets || [])], () => {
    const mats = (MATS[id] ||= cfg.paint());
    const P = K.makeBody(cfg.base); P.body.material = mats.body; P.eyes.material = mats.eyes;
    if (cfg.geo) { const g = cfg.geo(P); if (g.body) P.body.geometry = g.body; if (g.eyes) P.eyes.geometry = g.eyes; }
    P.model.scale.setScalar(cfg.scale); root.add(P.model);
    P.bones.Head.add(head); head.position.set(0, 0.1, 0.02);
    const anim = new K.Anim(P.model); anim.idle.time = (seed * 0.37) % 2;
    M = { ...P, anim, mats, x: {} };
    cfg.build?.(M, root, head);
    if (R_.st.dead > 0) anim.play('death', { hold: true });
    R_.update(0);
  });
  return R_;
}
function eyeMat(base, A) {
  const S = K.surface(base + '-eyes', K.baseEyes(base), 128);
  return K.paintedMat(K.paintSurface(S, (c, o) => K.paintEye(c, o, K.FACE[base], A, A.lid ?? 0.3)), { roughness: 1 });
}
function bodyMat(base, painter) { return K.paintedMat(K.paintSurface(K.surface(base + '-body', K.baseBody(base), 1024), painter, { shade: K.shadeOf(base) })); }

// lofted pieces
function horn(pts, r0, mat, rings = 14) { const l = new K.Loft(rings, 8).set(K.curve(pts), (t) => r0 * (1 - t * 0.88) * (1 + Math.sin(t * 40) * 0.04)); return K.mesh(l.geo, mat); }
const hornMat = (key, base, tip, gold) => K.uvMat(key, 32, 128, (u, v, o) => { const ring = Math.sin(v * 70) * 0.5 + 0.5; K.tone(base, K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.22 + (ring - 0.5) * 0.25, 4), o.col); if (v > 0.6) K.mixc(o.col, tip, K.sstep(0.6, 0.95, v)); if (gold && v > 0.82) { K.tone(hex('#f2c454'), 0.5 + Math.cos(u * 6.28) * 0.3, o.col); o.me = 0.55; o.ro = 0.3; } else o.ro = 0.5; });

// ================================================================== Drunk Satyr
const SAT = { skin: hex('#c07a4c'), fur: hex('#9a6a44'), hair: hex('#3a2216'), hoof: hex('#2a2026'), nose: hex('#e2423a'), blush: hex('#ea6450'), lip: hex('#a84444'), ink: hex('#40182a'), sash: hex('#8a2a64'), gold: hex('#f0c050'), iris: hex('#9a6418') };
const DRUNK = { bin: 0.45, bout: -0.1, by: 0.3, basym: 0.4, curve: 0.75, open: 0.22, asym: 0.45, lid: 0.55, wr: 0.4, frown: 0, teeth: 1, w: 1.15 };
function satyrPaint(c, o) {
  const ax = Math.abs(c.x), Y = c.y - FM.ey;
  if (isHead(c)) {
    if ((Y > 0.05 && (c.z < 0.07 || Y > 0.08)) || c.z < -0.03) return curls(c, o, SAT.hair);
    skin(c, o, SAT.skin, 0.55);
    if (ax > 0.078) return;
    K.paintFace(c, o, FM, DRUNK, { skin: SAT.skin, ink: SAT.ink, age: 0.45, brow: SAT.hair, bushy: 1, browW: 1.25, nose: SAT.nose, blush: SAT.blush, lip: SAT.lip });
    return;
  }
  const furLine = 0.99 + (K.vnoise(c.x * 40, c.z * 40, 3) - 0.5) * 0.07;
  if (c.y < furLine && !isArm(c)) { if (c.y < 0.1 && /foot|ball/.test(c.b)) return hoof(c, o, SAT.hoof); return fur(c, o, SAT.fur); }
  skin(c, o, SAT.skin, 0.55);
  if (!isArm(c)) {
    const front = c.z > 0 && c.nz > 0.3; if (front && c.y > 1.16 && c.y < 1.44 && ax < 0.11) { const dens = (1 - ax / 0.11) * K.sstep(1.16, 1.25, c.y); if (K.vnoise(c.x * 160, c.y * 160, c.z * 160) < dens * 0.8) curls(c, o, SAT.hair); }
    const d = c.x * 0.75 + (c.y - 1.22) * 0.66; // wine-stained sash, left shoulder to right hip
    if (Math.abs(d) < 0.04 && c.y > 0.95 && c.y < 1.52) { if (Math.abs(d) > 0.033) { K.tone(SAT.gold, 0.6, o.col); o.me = 0.6; } else K.tone(SAT.sash, K.band(0.5 + c.ny * 0.2 + Math.sin(d * 300) * 0.1 + c.sh * 0.3, 4), o.col); }
  } else if (Math.abs(ax - 0.62) < 0.012) { K.tone(SAT.gold, 0.5 + c.ny * 0.4, o.col); o.me = 0.55; o.ro = 0.3; }
}
function beardPaint(c, o) { curls(c, o, SAT.hair); }
function ivyLeaf(mat) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(-0.6, 0.2, -0.9, 0.7); s.quadraticCurveTo(-0.45, 0.7, -0.35, 1.05); s.quadraticCurveTo(-0.1, 0.95, 0, 1.4);
  s.quadraticCurveTo(0.1, 0.95, 0.35, 1.05); s.quadraticCurveTo(0.45, 0.7, 0.9, 0.7); s.quadraticCurveTo(0.6, 0.2, 0, 0);
  const g = new THREE.ShapeGeometry(s, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.abs(p.getX(i)) * 0.25 + p.getY(i) * p.getY(i) * 0.05); g.computeVertexNormals(); g.scale(0.024, 0.024, 0.024);
  return g;
}
const goatFur = () => K.uvMat('goatfur', 128, 128, (u, v, o) => K.fur2(u, v, o, SAT.fur, 12, 7, 0.5));
const hoofMat = () => K.uvMat('hoof', 32, 32, (u, v, o) => { K.tone(SAT.hoof, K.band(0.5 + Math.cos(u * 6.28) * 0.3 + v * 0.15, 3), o.col); o.ro = 0.3; });
const tufty = (a, t, amt) => 1 + amt * Math.abs((((a / (Math.PI * 2)) * 9 + t * 2) % 1) - 0.5) * 2;
function goatLeg(x, furM, hoofM) { // digitigrade shin: back to the hock, down the cannon to a cloven hoof (bind coords)
  const g = new THREE.Group();
  const leg = new K.Loft(18, 12).set(K.curve([[x, 0.62, -0.03], [x, 0.47, -0.08], [x, 0.33, -0.14], [x, 0.24, -0.125], [x, 0.13, -0.075], [x, 0.065, -0.04]]),
    (t) => { const r = t < 0.3 ? 0.08 - t * 0.09 : t < 0.55 ? 0.053 - (t - 0.3) * 0.06 : t < 0.85 ? 0.038 - (t - 0.55) * 0.02 : 0.032 + (t - 0.85) * 0.14; return [r, r]; },
    { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => tufty(a, t, t < 0.45 || t > 0.86 ? 0.3 : 0.08) });
  K.mesh(leg.geo, furM, g);
  for (const k of [-1, 1]) { const tx = x + k * 0.017; K.mesh(new K.Loft(6, 8).set(K.curve([[tx, 0.075, -0.04], [tx + k * 0.003, 0.038, -0.008], [tx + k * 0.004, 0.013, 0.03]]), (t) => [0.021 - t * 0.008, 0.025 - t * 0.012], { ref: (t, n) => n.set(0, 1, 0), shape: (a) => 1 - Math.max(0, -Math.cos(a)) * 0.3 }).geo, hoofM, g); }
  return g;
}
function panFlute() { // six cane pipes bound with cord, hanging from the right fist
  const g = new THREE.Group(); const m = K.uvMat('cane', 32, 64, (u, v, o) => { K.tone(K.hex('#d6aa58'), K.band(0.5 + Math.cos(u * 6.28) * 0.3, 3), o.col); if (((v * 5) % 1) < 0.07) K.mixc(o.col, K.hex('#6a4220'), 0.6); if (v < 0.1) K.tone(K.hex('#7a2a4a'), 0.5, o.col); o.ro = 0.5; });
  for (let j = 0; j < 6; j++) { const z = -0.1 + j * 0.0145, len = 0.085 + j * 0.022; K.mesh(new K.Loft(4, 6).set((t, p) => p.set(-0.75 - t * len, 1.425, z), () => 0.0072).geo, m, g); }
  return g;
}
function satyr(seed) {
  return humanoid('satyr', {
    base: 'male', scale: 2.0 / 1.81, height: 2.0, speed: 0.85, attack: 'punch', cast: 'cast', assets: ['hair_beard'],
    paint: () => ({ body: bodyMat('male', satyrPaint), eyes: eyeMat('male', { skin: SAT.skin, ink: SAT.ink, iris: SAT.iris, sclera: hex('#f0dcd0'), lid: 0.55 }), beard: K.paintedMat(K.paintSurface(K.surface('beard', K.srcMesh('hair_beard'), 256), beardPaint), { side: THREE.DoubleSide }), fur: goatFur(), hoof: hoofMat() }),
    geo: (P) => ({ body: K.reshaped('satyr-body', P.body, { spine_01: { k: 1.08 }, pelvis: { k: 1.06 }, spine_02: { k: 1.04 } }, (p, p0) => { const b = Math.exp(-(((p0.y - 1.1) / 0.12) ** 2) - ((p0.x / 0.13) ** 2)); if (p0.z > -0.04 && b > 0.01) { p.z += 0.095 * b; p.y -= 0.02 * b; p.x *= 1 + 0.12 * b; } }) }),
    build(M) {
      K.headPiece('hair_beard', M.mats.beard, M.body, { push: 0.02, seed: 2, scale: 1.12, offset: new THREE.Vector3(0, -0.006, 0.004) });
      const hm = hornMat('satyr-horn', hex('#d9c8a8'), hex('#5a4232')); const g = new THREE.Group();
      for (const s of [-1, 1]) g.add(horn([[s * 0.035, 1.762, 0.058], [s * 0.065, 1.85, 0.035], [s * 0.115, 1.9, -0.05], [s * 0.15, 1.85, -0.13], [s * 0.14, 1.76, -0.12], [s * 0.12, 1.73, -0.06]], 0.027, hm, 18));
      const leafG = ivyLeaf(); const greens = [hex('#4f8a3a'), hex('#3e7034'), hex('#6aa048')].map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${c})`), flatShading: true, roughness: 0.7, side: THREE.DoubleSide }));
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const l = K.mesh(leafG, greens[i % 3], g); l.position.set(Math.sin(a) * 0.088, 1.775 + Math.sin(i * 2.3) * 0.006, Math.cos(a) * 0.098 - 0.01); l.rotation.set(-0.6, a + (i % 2 ? 0.5 : -0.4), 0.3 * Math.sin(i)); }
      K.attachBind(g, M.body, 'Head');
      // goat legs: human shins fold away, shaggy fur breeches over hips and thighs, digitigrade shins, cloven hooves
      const fm = M.mats.fur, geo = M.body.geometry;
      for (const [sd, x] of [['l', 0.114], ['r', -0.114]]) {
        M.bones['calf_' + sd].scale.setScalar(0.01); K.attachUnscaled(goatLeg(x, fm, M.mats.hoof), M.body, 'calf_' + sd, 0.01);
        const r0 = K.radiusAt(geo, new THREE.Vector3(x, 0.86, -0.035), new THREE.Vector3(0, 1, 0), 0.02, 0.12).max;
        const th = new K.Loft(12, 14).set((t, p) => p.set(x * (0.92 + t * 0.08), 0.98 - t * 0.43, -0.035 - t * 0.005), (t) => { const r = r0 * (1.15 - t * 0.3) + 0.012; return [r, r]; }, { ref: (t, n) => n.set(0, 0, 1), shape: (a, t) => tufty(a, t * 3, 0.24) });
        K.attachBind(K.mesh(th.geo, fm), M.body, 'thigh_' + sd);
      }
      const hips = []; for (let r = 0; r <= 6; r++) { const y = 1.05 - r * 0.035; const p = M.body.geometry.attributes.position; let x = 0, z0 = 9, z1 = -9; for (let i = 0; i < p.count; i++) { if (Math.abs(p.getY(i) - y) > 0.02 || Math.abs(p.getX(i)) > 0.28) continue; x = Math.max(x, Math.abs(p.getX(i))); z0 = Math.min(z0, p.getZ(i)); z1 = Math.max(z1, p.getZ(i)); } hips.push({ x, z0, z1 }); }
      K.skinnedSheet(M.body, 6, 30, (u, v, out) => { const e = hips[Math.round(v * 6)]; const th = u * Math.PI * 2; const k = 1 + 0.06 * v; const hem = v > 0.99 ? Math.abs(((u * 16) % 1) - 0.5) * 0.07 : 0; out.set(Math.sin(th) * (e.x + 0.03) * k, 1.05 - v * 0.21 - hem, (e.z0 + e.z1) / 2 + Math.cos(th) * ((e.z1 - e.z0) / 2 + 0.03) * k); },
        (u, v, p) => { const s = p.x / 0.15; const wl = v * 0.6 * K.sstep(-0.3, 0.6, s), wr = v * 0.6 * K.sstep(-0.3, 0.6, -s); return [['pelvis', 1 - wl - wr], ['thigh_l', wl], ['thigh_r', wr]]; }, fm);
      K.attachBind(panFlute(), M.body, 'hand_r');
      // wineskin in the left hand: a lofted leather bag with a stitched seam and a tied neck
      const wm = K.uvMat('wineskin', 64, 128, (u, v, o) => { K.tone(hex('#7a4426'), K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.28, 4), o.col); if (Math.abs(u - 0.5) < 0.012 && (v * 40) % 1 < 0.6) K.mixc(o.col, hex('#e0c890'), 0.8); if (v < 0.16 && v > 0.1) K.tone(hex('#c9a060'), 0.5 + (Math.sin(v * 300) > 0 ? 0.15 : -0.1), o.col); if (v > 0.93) K.tone(hex('#2a1810'), 0.4, o.col); if (v > 0.3 && Math.abs(u - 0.15) < 0.1 && v < 0.6) K.mixc(o.col, hex('#5a1a3a'), 0.5); o.ro = 0.45; });
      const bag = new K.Loft(20, 12).set(K.curve([[0.74, 1.45, -0.03], [0.78, 1.43, -0.03], [0.86, 1.4, -0.02], [0.97, 1.38, -0.01], [1.03, 1.37, -0.01]]), (t) => { const r = t < 0.15 ? 0.016 : t < 0.25 ? 0.016 + (t - 0.15) * 0.6 : 0.075 * Math.sin(Math.min(1, (t - 0.1) / 0.9) * Math.PI * 0.95) + 0.012; return [r, r * 0.75]; }, { up: new THREE.Vector3(0, 0, 1), shape: (a, t) => 1 + Math.sin(a * 3 + t * 9) * 0.05 });
      K.attachBind(K.mesh(bag.geo, wm), M.body, 'hand_l');
    },
    update(M, st) {
      const t = st.t, a = M.anim; const sway = Math.sin(t * 1.3) * 0.1 + Math.sin(t * 0.47) * 0.06;
      a.bend(M.bones.spine_01, -0.05, 0, sway * 0.6); a.bend(M.bones.neck_01, Math.sin(t * 1.7) * 0.06, 0, -sway * 0.8); a.bend(M.bones.Head, 0, Math.sin(t * 0.8) * 0.15, Math.sin(t * 2.1) * 0.05);
      if (Math.sin(t * 0.37) > 0.995) st.lift.kick(5);
      M.model.position.y = st.lift.value * 0.04;
    },
  }, seed);
}

// ================================================================== Medusa
const MED = { skin: hex('#5c9a5c'), belly: hex('#a2c07a'), dark: hex('#2c563c'), cloth: hex('#6a2c7a'), gold: hex('#f0c050'), lip: hex('#5a2650'), ink: hex('#1c3424'), iris: hex('#e8f448') };
const COLD = { bin: -0.5, bout: 0.45, by: 0, basym: 0.3, curve: 0.3, open: 0, asym: 0.6, lid: 0.3, wr: 0, frown: 0.25, teeth: 0, w: 0.9 };
function medusaPaint(c, o) {
  const ax = Math.abs(c.x), Y = c.y - FF.ey; const [p1, p2] = planar(c);
  const scales = (size, k) => { const d = scaleCell(p1, p2, size); if (d > 0.44) return -0.28 * k; return (0.44 - d) * 0.5 * k - 0.05 * k; };
  if (isHead(c) || (c.y > 1.545 && ax < 0.12)) {
    if ((Y > 0.055 && (c.z < 0.06 || Y > 0.08)) || c.z < -0.03) { K.tone(MED.dark, K.band(0.5 + c.ny * 0.2 + scales(0.012, 1), 4), o.col); o.ro = 0.4; return; }
    skin(c, o, MED.skin, 0.5, scales(0.01, ax > 0.04 ? 0.6 : 0.15)); o.ro = 0.45;
    if (ax < 0.078) K.paintFace(c, o, FF, COLD, { skin: MED.skin, ink: MED.ink, age: 0, brow: MED.dark, browW: 0.8, lip: MED.lip, blush: hex('#3e7a50') });
    return;
  }
  const arm = isArm(c);
  if (!arm && c.y > 1.2 && c.y < 1.36 && ax < 0.2) { // breast band
    const edge = c.y < 1.212 || c.y > 1.348; if (edge) { K.tone(MED.gold, 0.5 + c.ny * 0.3, o.col); o.me = 0.55; o.ro = 0.3; return; }
    K.tone(MED.cloth, K.band(0.5 + c.ny * 0.2 + c.nz * 0.1 + Math.sin(c.x * 160 + c.y * 40) * 0.08 + c.sh * 0.2, 4), o.col); o.ro = 0.8; return;
  }
  if (!arm && c.y > 1.385 && c.y < 1.425 && ax < 0.08) { K.tone(MED.gold, 0.5 + c.ny * 0.3 + (Math.sin(Math.atan2(c.x, c.z) * 24) > 0.6 ? 0.25 : 0), o.col); o.me = 0.55; o.ro = 0.3; if (c.z > 0.05 && ax < 0.015) { K.tone(hex('#30d070'), 0.7, o.col); o.em = [40, 200, 90]; } return; }
  if (arm && Math.abs(ax - 0.255) < 0.012) { K.tone(MED.gold, 0.5 + c.ny * 0.35, o.col); o.me = 0.55; o.ro = 0.3; return; }
  const front = c.nz > 0.45 && ax < 0.11 && c.y < 1.45 && !arm;
  skin(c, o, front ? MED.belly : MED.skin, 0.45, scales(front ? 0.02 : 0.014, front ? 0.6 : 1)); o.ro = 0.4;
  if (!front && !arm && K.vnoise(p1 * 30, p2 * 30, 4) > 0.68) K.mixc(o.col, K.tone(MED.dark, 0.4, T3), 0.5);
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
  return humanoid('medusa', {
    base: 'female', scale: 1.3, height: 2.3, attack: 'cast', cast: 'cast', animSpeed: { attack: 1.25 },
    paint: () => ({ body: bodyMat('female', medusaPaint), eyes: eyeMat('female', { skin: MED.skin, ink: MED.ink, iris: MED.iris, irisR: 0.7, slit: true, glow: true, sclera: hex('#c8e070'), lid: 0.3 }) }),
    build(M) {
      for (const k of ['thigh_l', 'thigh_r']) M.bones[k].scale.setScalar(0.02); // legs fold away into the serpent body
      const tail = new K.Loft(46, 14, { vRep: 1 }); const tm = K.mesh(tail.geo, tailMat()); M.model.add(tm);
      const coil = []; for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 - 0.2 - i * 0.62; const r = 0.25 - i * 0.006; coil.push(new THREE.Vector3(Math.cos(a) * r, 0.11 + Math.max(0, i - 6) * 0.034 + (i > 11 ? 0.08 : 0), -0.05 + Math.sin(a) * r)); }
      M.x.tail = { tail, coil, pts: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), ...coil.map((v) => v.clone())] };
      // snake hair: lofted serpents from the scalp, each with a head and glowing eyes
      const g = new THREE.Group(); K.attachBind(g, M.body, 'Head'); const sm = snakeMat(); const snakes = [];
      for (let i = 0; i < 11; i++) {
        const az = -2.2 + (i / 10) * 4.4 + Math.PI, el = 0.35 + (i % 3) * 0.32; const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
        const base = new THREE.Vector3(0, 1.665, -0.01).addScaledVector(dir, 0.088); const l = new K.Loft(14, 7); K.mesh(l.geo, sm, g);
        snakes.push({ l, base, dir, len: 0.17 + (i % 4) * 0.025, ph: i * 1.7, built: false });
      }
      M.x.snakes = snakes;
    },
    update(M, st, dt, R_) {
      const t = st.t, a = M.anim; a.nudge(M.bones.spine_01, 0, 0, Math.sin(t * 0.9) * 0.06); a.nudge(M.bones.Head, st.mode === 'cast' ? 0.15 : 0, Math.sin(t * 0.5) * 0.2, 0);
      M.model.position.y = Math.sin(t * 1.4) * 0.03 + st.lift.value * 0.05 + 0.04;
      // serpent tail: from the (animated) pelvis into a coil on the ground
      const { tail, coil, pts } = M.x.tail; R_.root.updateMatrixWorld(true);
      M.bones.pelvis.getWorldPosition(pts[0]); M.model.worldToLocal(pts[0]); pts[0].y += 0.02;
      pts[1].set(pts[0].x * 0.5, pts[0].y * 0.55, pts[0].z + 0.03); pts[2].set(0.02, 0.22, 0.12);
      for (let i = 0; i < coil.length; i++) pts[3 + i].copy(coil[i]).add(new THREE.Vector3(Math.sin(t * 1.4 - i * 0.6) * 0.012 * i, 0, Math.cos(t * 1.1 - i * 0.5) * 0.01 * i));
      const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      tail.set((u, out) => cv.getPoint(u, out), (u) => { const r = u < 0.05 ? 0.17 : 0.17 * (1 - (u - 0.05) * 0.9) + 0.008; return [r * 1.04, r * 0.96]; }, { ref: (u, n) => { const k = K.sstep(0.05, 0.32, u); return k < 0.5 ? n.set(k * 2, 0, -(1 - k * 2)) : n.set(1 - (k - 0.5) * 2, (k - 0.5) * 2, 0); }, normals: !tail.built }); tail.built = true;
      for (const s of M.x.snakes) {
        const { base, dir, len, ph } = s; const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        s.l.set((u, out) => { out.copy(base).addScaledVector(dir, u * len * 0.8).add(new THREE.Vector3(0, -u * u * len * 0.55 + Math.sin(u * 4 + t * 3 + ph) * 0.02 * u, 0)).addScaledVector(side, Math.sin(u * 7 - t * 4 + ph) * 0.025 * u); },
          (u) => { const r = u < 0.78 ? 0.012 * (1 - u * 0.45) : u < 0.9 ? 0.0085 + Math.sin((u - 0.78) / 0.12 * Math.PI) * 0.006 : 0.0085 * (1 - (u - 0.9) * 7); return [r * 1.25, r]; }, { normals: !s.built });
        s.built = true;
      }
      const g = st.mode === 'cast' ? 3.5 : 1.4 + Math.sin(t * 2) * 0.3; M.mats.eyes.emissiveIntensity = g;
    },
  }, seed);
}

// ================================================================== Kobalos (goblin thief)
const KOB = { skin: hex('#a8d24e'), wart: hex('#6e9a34'), rag: hex('#e0a040'), hood: hex('#c42e3c'), p1: hex('#8a3a9a'), p2: hex('#4a6ad0'), rope: hex('#f0d080'), ink: hex('#22160c'), lip: hex('#4e3a28'), iris: hex('#ffd02c'), nose: hex('#6e8c36') };
const GRIN = { ...K.EXPR.grin, open: 0.4, lid: 0.25, bin: -0.9, bout: 0.7 };
function kobalosPaint(c, o) {
  const ax = Math.abs(c.x), Y = c.y - FM.ey; const wart = K.vnoise(c.x * 70, c.y * 70, c.z * 70) > 0.8;
  if (isHead(c) && ((Y > 0.05 && c.z < 0.055) || c.z < -0.04 || (Math.abs(c.x) > 0.07 && c.z < -0.01))) { K.tone(KOB.hood, K.band(0.5 + c.ny * 0.2 + c.nz * 0.05 + c.sh * 0.2, 4), o.col); o.ro = 0.9; if (c.z > 0.045 && Y > 0.05) K.mixc(o.col, KOB.ink, 0.5); return; }
  if (c.b !== 'Head' && c.y < 1.6 && (c.b === 'neck_01' || (c.y > 1.47 && Math.abs(c.x) < 0.17 && !isArm(c)))) { K.tone(KOB.hood, K.band(0.5 + c.ny * 0.25 + c.sh * 0.2 + (Math.sin(Math.atan2(c.x, c.z) * 9) > 0.5 ? 0.08 : 0), 4), o.col); o.ro = 0.9; if (c.y < 1.485) K.mixc(o.col, KOB.ink, 0.4); return; }
  if (isHead(c)) { skin(c, o, KOB.skin, 0.6); if (wart) K.mixc(o.col, KOB.wart, 0.6); if (ax < 0.078) K.paintFace(c, o, FM, GRIN, { skin: KOB.skin, ink: KOB.ink, age: 0.6, brow: hex('#2a2a18'), bushy: 1.5, browW: 1.6, nose: KOB.nose, lip: KOB.lip }); return; }
  const arm = isArm(c);
  const hem = 0.8 + Math.abs(((c.x * 30 + c.z * 20) % 1) - 0.5) * 0.06, sleeve = 0.33 + Math.abs(((c.y * 40 + c.z * 30) % 1) - 0.5) * 0.04;
  const rag = arm ? ax < sleeve : c.y > hem && c.y < 1.5;
  if (rag) {
    const cell = [Math.floor(c.x / 0.07), Math.floor(c.y / 0.07), Math.floor(c.z / 0.07)]; const h = K.vnoise(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5);
    const col = h > 0.72 ? KOB.p1 : h < 0.22 ? KOB.p2 : KOB.rag;
    K.tone(col, K.band(0.5 + c.ny * 0.18 + c.nz * 0.06 + c.sh * 0.25 + (Math.sin(c.y * 260 + Math.sin(c.x * 40) * 2) > 0.7 ? -0.1 : 0), 4), o.col); o.ro = 0.95;
    const fx = ((c.x / 0.07) % 1 + 1) % 1, fy = ((c.y / 0.07) % 1 + 1) % 1; if (col !== KOB.rag && (Math.abs(fx) < 0.08 || Math.abs(fy) < 0.08) && ((c.x + c.y) * 300) % 1 < 0.5) K.mixc(o.col, hex('#e8d8a8'), 0.8);
    if (!arm && Math.abs(c.y - 0.995) < 0.016) { K.tone(KOB.rope, K.band(0.5 + Math.sin((c.x + c.z) * 400 + c.y * 600) * 0.3, 3), o.col); o.ro = 0.9; }
    if (Math.abs(c.y - hem) < 0.006 || (arm && Math.abs(ax - sleeve) < 0.006)) K.mixc(o.col, KOB.ink, 0.5);
    return;
  }
  skin(c, o, KOB.skin, 0.5); if (wart) K.mixc(o.col, KOB.wart, 0.55);
  if (/ball/.test(c.b) && c.z > 0.07) K.tone(hex('#2a2418'), 0.5, o.col);
}
const sackMat = () => K.uvMat('sack', 128, 128, (u, v, o) => { const w = (Math.sin(u * 420) * Math.sin(v * 420)) * 0.5; const patch = u > 0.15 && u < 0.32 && v > 0.45 && v < 0.62; K.tone(patch ? hex('#7a6a8a') : hex('#a8865a'), K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.2 + w * 0.15 + (K.fbm(u * 8, v * 8, 1, 2) - 0.5) * 0.3, 4), o.col); if (patch && (u < 0.165 || u > 0.305 || v < 0.465 || v > 0.605) && ((u + v) * 200) % 1 < 0.5) K.mixc(o.col, hex('#2a1a10'), 0.7); if (v < 0.12 && v > 0.06) K.tone(hex('#5a3a1c'), 0.5 + Math.sin(u * 60) * 0.2, o.col); if (v < 0.06 && Math.sin(u * 50) > 0.2) { K.tone(hex('#f2c454'), 0.75, o.col); o.me = 0.55; o.ro = 0.3; } else o.ro = 0.95; });
const KH = 1.5, KPIV = new THREE.Vector3(0, 1.6, 0);
function earLoft(s, mat) { const l = new K.Loft(10, 8).set(K.curve([[s * 0.075, 1.69, -0.005], [s * 0.15, 1.725, -0.025], [s * 0.24, 1.77, -0.055], [s * 0.31, 1.81, -0.09]]), (t) => [0.009 * (1 - t) + 0.002, 0.045 * Math.sin(Math.min(1, t * 1.3 + 0.15) * Math.PI) * (1 - t * 0.5) + 0.003], { up: new THREE.Vector3(0, 0, 1), shape: (a) => 1 + Math.max(0, Math.sin(a)) * 0.6 }); l.geo.translate(-KPIV.x, -KPIV.y, -KPIV.z); l.geo.scale(KH, KH, KH); l.geo.translate(KPIV.x, KPIV.y, KPIV.z); return K.mesh(l.geo, mat); }
const cardMat = () => K.uvMat('stolen-card', 32, 48, (u, v, o) => { const edge = u < 0.1 || u > 0.9 || v < 0.07 || v > 0.93; K.tone(edge ? hex('#f2e6c8') : hex('#3a5ab8'), edge ? 0.6 : 0.5 + (Math.abs(((u + v) * 6) % 1 - 0.5) < 0.12 ? 0.2 : 0), o.col); if (!edge && Math.hypot(u - 0.5, v - 0.5) < 0.16) { K.tone(hex('#f0c050'), 0.7, o.col); } o.ro = 0.6; }, { side: THREE.DoubleSide });
function kobalos(seed) {
  return humanoid('kobalos', {
    base: 'male', scale: 0.94, height: 1.55, attack: 'punch', cast: 'throw', speed: 1.25,
    paint: () => ({ body: bodyMat('male', kobalosPaint), eyes: eyeMat('male', { skin: KOB.skin, ink: KOB.ink, iris: KOB.iris, irisR: 0.75, slit: true, glow: true, sclera: hex('#f0eab0'), lid: 0.25 }), ear: K.uvMat('kob-ear', 64, 64, (u, v, o) => { const inner = Math.sin(u * Math.PI * 2) > 0.3; K.tone(inner ? hex('#e07a6a') : KOB.skin, K.band(0.5 + Math.cos(u * 6.28) * 0.2 - (inner ? 0.1 : 0) + (v > 0.8 ? -0.1 : 0), 4), o.col); o.ro = 0.6; }, { side: THREE.DoubleSide }) }),
    geo: (P) => { const rules = { Head: { s: KH, pivot: KPIV }, thigh_l: { k: 0.8 }, thigh_r: { k: 0.8 }, calf_l: { k: 0.78 }, calf_r: { k: 0.78 }, spine_01: { k: 0.9 }, upperarm_l: { k: 0.85 }, upperarm_r: { k: 0.85 }, lowerarm_l: { k: 0.85 }, lowerarm_r: { k: 0.85 } };
      const hump = (p, p0) => { const b = Math.exp(-(((p0.y - 1.38) / 0.1) ** 2) - ((p0.x / 0.14) ** 2)); if (p0.z < -0.02) p.z -= 0.06 * b; };
      return { body: K.reshaped('kob-body', P.body, rules, hump), eyes: K.reshaped('kob-eyes', P.eyes, rules) }; },
    build(M) {
      for (const k of ['upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r']) M.bones[k].scale.set(1, 1.22, 1);
      M.bones.hand_l.scale.setScalar(1.3); M.bones.hand_r.scale.setScalar(1.3);
      const g = new THREE.Group(); for (const s of [-1, 1]) g.add(earLoft(s, M.mats.ear)); K.attachBind(g, M.body, 'Head');
      const sk = new THREE.Group(); const cm = cardMat();
      const sack = new K.Loft(18, 12).set(K.curve([[0.1, 1.55, -0.1], [0.06, 1.46, -0.2], [0.0, 1.3, -0.29], [-0.05, 1.12, -0.28], [-0.07, 1.02, -0.22]]), (t) => { const r = t < 0.12 ? 0.04 : 0.04 + Math.sin(Math.min(1, (t - 0.12) / 0.88) * Math.PI) * 0.2; return [r, r * 0.8]; }, { up: new THREE.Vector3(0, 0, -1), shape: (a, t) => 1 + (K.vnoise(Math.cos(a) * 2 + 3, Math.sin(a) * 2, t * 5) - 0.5) * 0.3 });
      K.mesh(sack.geo, sackMat(), sk);
      for (let i = 0; i < 5; i++) { const c = K.mesh(new THREE.PlaneGeometry(0.07, 0.1), cm, sk); c.position.set(0.1 + (i - 2) * 0.022, 1.6 + Math.abs(i - 2) * -0.012, -0.11 + (i % 2) * 0.012); c.rotation.set(-0.3 + i * 0.08, 0.4 + i * 0.25, (i - 2) * 0.35); }
      M.x.sack = K.attachBind(sk, M.body, 'spine_03');
    },
    update(M, st) {
      const t = st.t, a = M.anim; a.bend(M.bones.spine_02, 0.18, 0, 0); a.bend(M.bones.spine_03, 0.5, 0, 0); a.bend(M.bones.neck_01, -0.1, 0, 0); a.bend(M.bones.Head, -0.45 + (st.talk > 0 ? Math.sin(t * 20) * 0.1 : 0), Math.sin(t * 0.7) * 0.3, Math.sin(t * 6) * 0.05);
      a.bend(M.bones.thigh_l, 0.12, 0, 0.1); a.bend(M.bones.thigh_r, 0.12, 0, -0.1); a.bend(M.bones.calf_l, -0.25, 0, 0); a.bend(M.bones.calf_r, -0.25, 0, 0);
      M.model.position.y = Math.abs(Math.sin(t * 4.2)) * 0.03 + st.lift.value * 0.06 - 0.04; M.model.position.x = st.lunge.value * 0.12 - st.hit.value * 0.06;
    },
  }, seed);
}

// ================================================================== Minotaur (+ king)
const MIN = { skin: hex('#965436'), fur: hex('#3e2418'), furL: hex('#6a3e26'), leather: hex('#7c4a28'), bronze: hex('#dc9a3a'), hoof: hex('#1e1618'), ink: hex('#24120c'), cape: hex('#8e1e2e'), gold: hex('#f4c650') };
function minoPaint(king) {
  return (c, o) => {
    const ax = Math.abs(c.x); const arm = isArm(c); const metal = king ? MIN.gold : MIN.bronze;
    if (isHead(c)) return fur(c, o, MIN.fur);
    if (!arm && c.y < 0.86) { if (c.y < 0.1 && /foot|ball/.test(c.b)) return hoof(c, o, MIN.hoof); return fur(c, o, king ? hex('#3a2014') : hex('#5a3420'), 0.045, 1.3); }
    if (!arm && c.y < 0.985) { // leather pteruges with metal studs
      const a = Math.atan2(c.x, c.z); const strip = (a / Math.PI) * 9; const f = strip - Math.floor(strip);
      K.tone(MIN.leather, K.band(0.52 + c.ny * 0.12 + c.nz * 0.06 - (f < 0.08 || f > 0.92 ? 0.3 : 0) + (f < 0.5 ? 0.06 : -0.04), 4), o.col); o.ro = 0.6;
      if (Math.abs(f - 0.5) < 0.13 && Math.abs(c.y - 0.76) < 0.015) { K.tone(metal, 0.75, o.col); o.me = 0.55; o.ro = 0.3; }
      return;
    }
    if (!arm && c.y < 1.05) { K.tone(metal, K.band(0.5 + c.ny * 0.3 + c.nz * 0.1 + (Math.abs(c.y - 1.017) < 0.006 ? -0.25 : 0), 4), o.col); o.me = 0.55; o.ro = 0.35; return; }
    if (king && !arm && c.z < -0.04 && c.nz < -0.2 && c.y < 1.47) { const edge = Math.abs(c.x) > 0.17; K.tone(edge ? MIN.gold : MIN.cape, K.band(0.5 + c.ny * 0.2 + Math.sin(c.x * 90) * 0.12 + c.sh * 0.2, 4), o.col); o.ro = 0.8; if (edge) o.me = 0.8; return; }
    if (arm && Math.abs(c.x) > 0.55 && Math.abs(c.x) < 0.68) { K.tone(MIN.leather, K.band(0.45 + c.ny * 0.25 + (Math.abs(((ax - 0.55) * 60) % 1 - 0.5) < 0.1 ? -0.25 : 0), 4), o.col); o.ro = 0.55; if (c.ny > 0.7 && Math.abs(ax - 0.615) < 0.01) { K.tone(metal, 0.8, o.col); o.me = 0.55; } return; }
    K.tone(MIN.skin, K.band(0.52 + c.ny * 0.14 + c.nz * 0.05 + Math.round(c.sh * 4) / 4 * 0.6, 4), o.col); o.ro = 0.55;
    const chest = !arm && c.y > 1.2 && c.y < 1.47 && c.nz > 0.1; if (chest && Math.abs(c.x) < 0.05 + (c.y - 1.2) * 0.5) fur(c, o, MIN.furL, 0.02, 1.6);
    if (!arm && c.z < -0.02 && c.y > 1.3) fur(c, o, MIN.fur, 0.026, 1.8);
    if (arm && ax > 0.7) fur(c, o, MIN.fur, 0.014, 1.4);
    const d = -c.x * 0.72 + (c.y - 1.2) * 0.7; if (!arm && Math.abs(d) < 0.032 && c.y > 1.0) { K.tone(MIN.leather, K.band(0.45 + c.ny * 0.2 + c.nz * 0.1, 4), o.col); o.ro = 0.6; const bd = Math.hypot(c.x + 0.07, c.y - 1.29); if (c.z > 0 && bd < 0.03) { K.tone(metal, bd < 0.02 ? 0.85 : 0.5, o.col); o.me = 0.55; } }
    if (!arm && Math.abs(c.y - 1.12) < 0.0015 && ax < 0.05 && c.z > 0) K.mixc(o.col, MIN.ink, 0.4);
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
function labrys(king) { // hangs from the right fist along the forearm axis; blades either side (bind-pose coordinates)
  const g = new THREE.Group(); const X0 = -0.74, Y0 = 1.445, Z0 = -0.06, L = 0.82;
  const haft = new K.Loft(16, 7).set((t, p) => p.set(X0 + 0.08 - t * L, Y0, Z0), (t) => 0.017 * (1 + (t > 0.04 && t < 0.24 && Math.sin(t * 160) > 0 ? 0.18 : 0)) * (t > 0.97 ? 1.6 : 1));
  K.mesh(haft.geo, K.uvMat('haft', 32, 64, (u, v, o) => { const wrap = v > 0.04 && v < 0.24; K.tone(wrap ? hex('#3a2416') : hex('#8a5a32'), K.band(0.5 + Math.cos(u * 6.28) * 0.2 + (wrap ? Math.sin(v * 300) * 0.15 : (K.fbm(u * 4, v * 30, 1, 2) - 0.5) * 0.3), 4), o.col); o.ro = 0.6; }), g);
  const s = new THREE.Shape(); s.moveTo(0, -0.07); s.lineTo(0.12, -0.11); s.quadraticCurveTo(0.2, -0.26, 0.3, -0.3); s.quadraticCurveTo(0.4, 0, 0.3, 0.3); s.quadraticCurveTo(0.2, 0.26, 0.12, 0.11); s.lineTo(0, 0.07); s.closePath();
  const bm = labrysMat(king); const k = king ? 0.55 : 0.48;
  for (const sgn of [-1, 1]) {
    const bg = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 6 }); bg.translate(0, 0, -0.02);
    bg.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, sgn, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -sgn))); bg.scale(k, k, k);
    bg.translate(X0 + 0.08 - L * 0.88, Y0, Z0); bg.computeVertexNormals(); K.mesh(bg, bm, g);
  }
  return g;
}
function minotaur(seed, king = false) {
  return humanoid(king ? 'minotaur_king' : 'minotaur', {
    base: 'male', scale: 1.62, height: 3.0, attack: 'attack', cast: 'cast', assets: ['bull_head'], speed: 0.9,
    geo: (P) => ({ body: K.reshaped('mino-body', P.body, { spine_02: { k: 1.12 }, spine_03: { k: 1.18 }, clavicle_l: { k: 1.2 }, clavicle_r: { k: 1.2 }, neck_01: { k: 1.45 }, upperarm_l: { k: 1.2 }, upperarm_r: { k: 1.2 }, lowerarm_l: { k: 1.15 }, lowerarm_r: { k: 1.15 }, thigh_l: { k: 1.1 }, thigh_r: { k: 1.1 } }) }),
    paint: () => {
      const B = bullGeo(); const fake = { geometry: B.geo, isSkinnedMesh: false };
      return { body: bodyMat('male', minoPaint(king)), eyes: new THREE.MeshBasicMaterial({ visible: false }), bull: K.paintedMat(K.paintSurface(K.surface('bull', fake, 512), bullPaint(king))) };
    },
    build(M, root, head) {
      M.bones.Head.scale.setScalar(0.01); // the human head folds away inside the bull's
      const fix = new THREE.Group(); fix.scale.setScalar(100); M.bones.Head.add(fix);
      const bull = K.mesh(BULL.geo, M.mats.bull); bull.position.set(0, 1.4, 0.0); bull.scale.setScalar(1.18); bull.rotation.x = -0.1;
      const holder = new THREE.Group(); const sk = M.body.skeleton; const hi = sk.bones.indexOf(M.bones.Head);
      sk.boneInverses[hi].clone().multiply(M.body.bindMatrix).decompose(holder.position, holder.quaternion, holder.scale); holder.add(bull); fix.add(holder);
      holder.add(head); head.position.set(0, 1.86, 0.05);
      K.attachBind(labrys(king), M.body, 'hand_r');
    },
    update(M, st) {
      const t = st.t, a = M.anim; const breath = Math.sin(t * 1.8) * 0.03; a.nudge(M.bones.spine_02, breath, 0, 0); a.nudge(M.bones.Head, -0.08 + Math.sin(t * 1.8) * 0.04, Math.sin(t * 0.6) * 0.15, 0);
      M.model.position.x = st.lunge.value * 0.15 - st.hit.value * 0.05;
    },
  }, seed);
}

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
  const torso = new K.Loft(46, 18); torso.set((t, out) => spine.getPoint(t, out), prof, { shape: (a, t) => 1 - Math.max(0, -Math.cos(a)) * 0.24 + (t > 0.66 && t < 0.92 ? Math.max(0, Math.cos(a)) * 0.12 : 0) });
  K.mesh(torso.geo, mat, body);
  const legs = [];
  for (const [x, z, f] of [[-1, 0.3, 1], [1, 0.3, 1], [-1, -0.95, -1], [1, -0.95, -1]]) {
    const g = new THREE.Group(); body.add(g); const zz = z + (f > 0 ? 0.05 : 0);
    const pts = [[x * 0.4, 0.05, z], [x * 0.78, -0.08, z + 0.04 * f], [x * 0.95, -0.3, zz + 0.04], [x * 0.92, -0.58, zz + 0.1], [x * 0.92, -0.71, zz + 0.2]];
    K.mesh(new K.Loft(14, 12).set(K.curve(pts), (t) => { const r = t < 0.35 ? 0.3 - t * 0.28 : t < 0.8 ? 0.2 - (t - 0.35) * 0.08 : 0.165 + (t - 0.8) * 0.2; return [r, t > 0.82 ? r * 0.5 : r]; }, { ref: (t, n) => n.set(0, 0, 1) }).geo, legM, g);
    for (const cx of [-0.08, 0, 0.08]) K.mesh(new K.Loft(5, 5).set(K.curve([[x * 0.92 + cx, -0.7, zz + 0.32], [x * 0.92 + cx * 1.3, -0.72, zz + 0.43], [x * 0.92 + cx * 1.4, -0.76, zz + 0.49]]), (t) => 0.03 * (1 - t) + 0.003).geo, sp, g);
    legs.push({ g, x, z });
  }
  for (let i = 0; i < 16; i++) { const t = 0.12 + i * 0.05; const p = spine.getPoint(t); const r = prof(t)[1] * (t > 0.66 && t < 0.92 ? 1.1 : 1); const h = 0.08 + Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.14; K.mesh(new K.Loft(5, 5).set(K.curve([[p.x, p.y + r * 0.85, p.z], [p.x, p.y + r + h * 0.7, p.z - 0.06], [p.x, p.y + r + h, p.z - 0.16]]), (u) => 0.055 * (1 - u) * (0.6 + h * 2) + 0.003).geo, sp, body); }
  const anchors = [new THREE.Vector3(0, 0.78, 0.62), new THREE.Vector3(-0.32, 0.72, 0.58), new THREE.Vector3(0.32, 0.72, 0.58), new THREE.Vector3(-0.15, 0.85, 0.4), new THREE.Vector3(0.15, 0.85, 0.4), new THREE.Vector3(-0.52, 0.55, 0.5), new THREE.Vector3(0.52, 0.55, 0.5)];
  const nm = hydraMat('hyd-neck', 2);
  for (const a of anchors) K.mesh(new K.Loft(7, 12).set(K.curve([[a.x * 0.5, a.y * 0.2, a.z * 0.5], [a.x * 0.8, a.y * 0.65, a.z * 0.8], [a.x, a.y, a.z]]), (t) => 0.24 - t * 0.08, { ref: (t, n) => n.set(0, 0, -1) }).geo, nm, body);
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
  const skull = new K.Loft(16, 14).set((t, p) => p.set(0, 0.02 + Math.sin(t * Math.PI) * 0.02 - t * 0.04, -0.2 + t * 0.55), (t) => { const w = t < 0.3 ? 0.13 + t * 0.12 : t < 0.5 ? 0.166 - (t - 0.3) * 0.15 : 0.136 - (t - 0.5) * 0.17; const h = t < 0.35 ? 0.11 + t * 0.06 : 0.131 - (t - 0.35) * 0.15; return t > 0.97 ? [w * 0.6, h * 0.6] : [w, h]; }, { shape: (a) => 1 - Math.max(0, -Math.cos(a)) * 0.45 });
  K.mesh(skull.geo, skullM, head);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.04, -0.1); head.add(jaw);
  K.mesh(new K.Loft(12, 12).set((t, p) => p.set(0, -0.025 - Math.sin(t * Math.PI) * 0.01, t * 0.42), (t) => [0.12 - t * 0.075, 0.05 - t * 0.025], { shape: (a) => 1 - Math.max(0, Math.cos(a)) * 0.5 }).geo, hydraMat('hyd-jaw', 1.5), jaw);
  const fangM = K.uvMat('fang', 16, 32, (u, v, o) => { K.tone(hex('#f2e6c8'), K.band(0.6 + Math.cos(u * 6.28) * 0.2 - v * 0.15, 3), o.col); o.ro = 0.3; });
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    const z = 0.05 + i * 0.055, x = s * (0.085 - i * 0.011);
    K.mesh(new K.Loft(4, 5).set(K.curve([[x, -0.035, z], [x, -0.07, z + 0.004], [x * 0.97, -0.09, z + 0.012]]), (t) => 0.011 * (1 - t) + 0.001).geo, fangM, head);
    K.mesh(new K.Loft(4, 5).set(K.curve([[x * 0.92, -0.02, z + 0.1], [x * 0.92, 0.01, z + 0.104], [x * 0.9, 0.03, z + 0.11]]), (t) => 0.009 * (1 - t) + 0.001).geo, fangM, jaw);
  }
  const sp = spineMat(); for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.06; K.mesh(new K.Loft(5, 5).set(K.curve([[x, 0.1, -0.08 - Math.abs(x)], [x * 1.4, 0.2, -0.18], [x * 1.7, 0.24, -0.32]]), (t) => 0.03 * (1 - t) + 0.002).geo, sp, head); }
  // neck: one lofted tube swept every frame from the body's anchor to this head (lives in api.neckGroup)
  const neckGroup = new THREE.Group(); const neck = new K.Loft(16, 12); const neckM = K.mesh(neck.geo, hydraMat('hyd-neckf', 4), neckGroup);
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
