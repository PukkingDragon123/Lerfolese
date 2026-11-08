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
const skin = (c, o, col, k = 0.5, extra = 0) => { K.tone(col, K.band(0.5 + c.ny * 0.18 + c.nz * 0.08 + c.sh * k + extra, 5), o.col); o.ro = 0.6; };
const fur = (c, o, col, len = 10) => { const f = K.fbm(c.x * 45, c.y * len, c.z * 45, 3); const tip = (c.y * len * 1.3 + f * 3) % 1; K.tone(col, K.band(0.5 + c.ny * 0.15 + c.nz * 0.08 + (f - 0.5) * 0.9 + c.sh * 0.15 - tip * 0.18, 4), o.col); o.ro = 0.95; };
const curls = (c, o, col) => { const n = K.fbm(c.x * 90, c.y * 90, c.z * 90, 2); const ring = Math.abs(((n * 5) % 1) - 0.5); K.tone(col, K.band(0.45 + c.ny * 0.2 + (0.25 - ring) * 1.3, 4), o.col); o.ro = 0.9; };
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
const SAT = { skin: hex('#b8714a'), fur: hex('#6a4a34'), hair: hex('#3a2216'), hoof: hex('#2a2026'), nose: hex('#e2423a'), blush: hex('#ea6450'), lip: hex('#a84444'), ink: hex('#40182a'), sash: hex('#8a2a64'), gold: hex('#f0c050'), iris: hex('#9a6418') };
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
function satyr(seed) {
  return humanoid('satyr', {
    base: 'male', scale: 2.0 / 1.81, height: 2.0, speed: 0.85, attack: 'punch', cast: 'cast', assets: ['hair_beard'],
    paint: () => ({ body: bodyMat('male', satyrPaint), eyes: eyeMat('male', { skin: SAT.skin, ink: SAT.ink, iris: SAT.iris, sclera: hex('#f0dcd0'), lid: 0.55 }), beard: K.paintedMat(K.paintSurface(K.surface('beard', K.srcMesh('hair_beard'), 256), beardPaint), { side: THREE.DoubleSide }) }),
    build(M) {
      K.headPiece('hair_beard', M.mats.beard, M.body, { push: 0.02, seed: 2, scale: 1.12, offset: new THREE.Vector3(0, -0.006, 0.004) });
      const hm = hornMat('satyr-horn', hex('#d9c8a8'), hex('#5a4232')); const g = new THREE.Group();
      for (const s of [-1, 1]) g.add(horn([[s * 0.035, 1.762, 0.058], [s * 0.065, 1.85, 0.035], [s * 0.115, 1.9, -0.05], [s * 0.15, 1.85, -0.13], [s * 0.14, 1.76, -0.12], [s * 0.12, 1.73, -0.06]], 0.027, hm, 18));
      const leafG = ivyLeaf(); const greens = [hex('#4f8a3a'), hex('#3e7034'), hex('#6aa048')].map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${c})`), flatShading: true, roughness: 0.7, side: THREE.DoubleSide }));
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const l = K.mesh(leafG, greens[i % 3], g); l.position.set(Math.sin(a) * 0.088, 1.775 + Math.sin(i * 2.3) * 0.006, Math.cos(a) * 0.098 - 0.01); l.rotation.set(-0.6, a + (i % 2 ? 0.5 : -0.4), 0.3 * Math.sin(i)); }
      K.attachBind(g, M.body, 'Head');
      // wineskin in the left hand: a lofted leather bag with a stitched seam and a tied neck
      const wm = K.uvMat('wineskin', 64, 128, (u, v, o) => { const n = K.fbm(u * 8, v * 8, 2, 2); K.tone(hex('#7a4426'), K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.25 + (n - 0.5) * 0.3, 4), o.col); if (Math.abs(u - 0.5) < 0.012 && (v * 40) % 1 < 0.6) K.mixc(o.col, hex('#e0c890'), 0.8); if (v < 0.16 && v > 0.1) K.tone(hex('#c9a060'), 0.5 + Math.sin(v * 300) * 0.2, o.col); if (v > 0.93) K.tone(hex('#2a1810'), 0.4, o.col); if (n > 0.66 && v > 0.3) K.mixc(o.col, hex('#5a1a3a'), 0.5); o.ro = 0.45; });
      const bag = new K.Loft(20, 12).set(K.curve([[0.74, 1.45, -0.03], [0.78, 1.43, -0.03], [0.86, 1.4, -0.02], [0.97, 1.38, -0.01], [1.03, 1.37, -0.01]]), (t) => { const r = t < 0.15 ? 0.016 : t < 0.25 ? 0.016 + (t - 0.15) * 0.6 : 0.075 * Math.sin(Math.min(1, (t - 0.1) / 0.9) * Math.PI * 0.95) + 0.012; return [r, r * 0.75]; }, { up: new THREE.Vector3(0, 0, 1), shape: (a, t) => 1 + Math.sin(a * 3 + t * 9) * 0.05 });
      K.attachBind(K.mesh(bag.geo, wm), M.body, 'hand_l');
    },
    update(M, st) {
      const t = st.t, a = M.anim; const sway = Math.sin(t * 1.3) * 0.1 + Math.sin(t * 0.47) * 0.06;
      a.nudge(M.bones.spine_01, 0.05, 0, sway * 0.6); a.nudge(M.bones.neck_01, Math.sin(t * 1.7) * 0.06, 0, -sway * 0.8); a.nudge(M.bones.Head, 0, Math.sin(t * 0.8) * 0.15, Math.sin(t * 2.1) * 0.05);
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
      const coil = []; for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 - 0.15 - i * 0.55; const r = 0.36 - i * 0.012; coil.push(new THREE.Vector3(Math.cos(a) * r, 0.1 + (i > 8 ? (i - 8) * 0.09 : 0), -0.08 + Math.sin(a) * r * 0.9)); }
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
      pts[1].set(pts[0].x * 0.5, pts[0].y * 0.52, pts[0].z + 0.04); pts[2].set(0.02, 0.2, 0.16);
      for (let i = 0; i < coil.length; i++) pts[3 + i].copy(coil[i]).add(new THREE.Vector3(Math.sin(t * 1.4 - i * 0.6) * 0.012 * i, 0, Math.cos(t * 1.1 - i * 0.5) * 0.01 * i));
      const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      tail.set((u, out) => cv.getPoint(u, out), (u) => { const r = u < 0.05 ? 0.17 : 0.17 * (1 - (u - 0.05) * 0.95) + 0.006; return [r * 1.05, r * 0.82]; }, { ref: (u, n) => { const k = K.sstep(0.05, 0.32, u); return k < 0.5 ? n.set(k * 2, 0, -(1 - k * 2)) : n.set(1 - (k - 0.5) * 2, (k - 0.5) * 2, 0); }, normals: !tail.built }); tail.built = true;
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
const KOB = { skin: hex('#8fb04a'), wart: hex('#5e7a2e'), rag: hex('#9a6a34'), p1: hex('#8a4a5a'), p2: hex('#4a5e86'), rope: hex('#cfa564'), ink: hex('#22160c'), lip: hex('#4e3a28'), iris: hex('#ffd02c'), nose: hex('#6e8c36') };
const GRIN = { ...K.EXPR.grin, open: 0.4, lid: 0.25, bin: -0.9, bout: 0.7 };
function kobalosPaint(c, o) {
  const ax = Math.abs(c.x), Y = c.y - FM.ey; const wart = K.vnoise(c.x * 70, c.y * 70, c.z * 70) > 0.8;
  if (isHead(c)) { skin(c, o, KOB.skin, 0.6); if (wart) K.mixc(o.col, KOB.wart, 0.6); if (ax < 0.078) K.paintFace(c, o, FM, GRIN, { skin: KOB.skin, ink: KOB.ink, age: 0.6, brow: hex('#2a2a18'), bushy: 1.5, browW: 1.6, nose: KOB.nose, lip: KOB.lip }); return; }
  const arm = isArm(c);
  const hem = 0.8 + Math.abs(((c.x * 30 + c.z * 20) % 1) - 0.5) * 0.06, sleeve = 0.33 + Math.abs(((c.y * 40 + c.z * 30) % 1) - 0.5) * 0.04;
  const rag = arm ? ax < sleeve : c.y > hem && c.y < 1.5;
  if (rag) {
    const cell = [Math.floor(c.x / 0.07), Math.floor(c.y / 0.07), Math.floor(c.z / 0.07)]; const h = K.vnoise(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5);
    const col = h > 0.72 ? KOB.p1 : h < 0.22 ? KOB.p2 : KOB.rag;
    K.tone(col, K.band(0.5 + c.ny * 0.2 + c.nz * 0.08 + c.sh * 0.25 + (K.vnoise(c.x * 300, c.y * 300, c.z * 300) - 0.5) * 0.15, 4), o.col); o.ro = 0.95;
    const fx = (c.x / 0.07) % 1, fy = (c.y / 0.07) % 1; if (col !== KOB.rag && (Math.abs(fx) < 0.08 || Math.abs(fy) < 0.08) && ((c.x + c.y) * 300) % 1 < 0.5) K.mixc(o.col, hex('#e8d8a8'), 0.8);
    if (!arm && Math.abs(c.y - 0.995) < 0.016) { K.tone(KOB.rope, K.band(0.5 + Math.sin((c.x + c.z) * 400 + c.y * 600) * 0.3, 3), o.col); o.ro = 0.9; }
    if (Math.abs(c.y - hem) < 0.006 || (arm && Math.abs(ax - sleeve) < 0.006)) K.mixc(o.col, KOB.ink, 0.5);
    return;
  }
  skin(c, o, KOB.skin, 0.5); if (wart) K.mixc(o.col, KOB.wart, 0.55);
  if (/ball/.test(c.b) && c.z > 0.07) K.tone(hex('#2a2418'), 0.5, o.col);
}
const sackMat = () => K.uvMat('sack', 128, 128, (u, v, o) => { const w = (Math.sin(u * 420) * Math.sin(v * 420)) * 0.5; const patch = u > 0.15 && u < 0.32 && v > 0.45 && v < 0.62; K.tone(patch ? hex('#7a6a8a') : hex('#a8865a'), K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.2 + w * 0.15 + (K.fbm(u * 8, v * 8, 1, 2) - 0.5) * 0.3, 4), o.col); if (patch && (u < 0.165 || u > 0.305 || v < 0.465 || v > 0.605) && ((u + v) * 200) % 1 < 0.5) K.mixc(o.col, hex('#2a1a10'), 0.7); if (v < 0.12 && v > 0.06) K.tone(hex('#5a3a1c'), 0.5 + Math.sin(u * 60) * 0.2, o.col); if (v < 0.06 && Math.sin(u * 50) > 0.2) { K.tone(hex('#f2c454'), 0.75, o.col); o.me = 0.55; o.ro = 0.3; } else o.ro = 0.95; });
function earLoft(s, mat) { const l = new K.Loft(10, 8).set(K.curve([[s * 0.075, 1.69, -0.005], [s * 0.13, 1.72, -0.02], [s * 0.2, 1.76, -0.05], [s * 0.25, 1.79, -0.08]]), (t) => [0.008 * (1 - t) + 0.002, 0.035 * Math.sin(Math.min(1, t * 1.3 + 0.15) * Math.PI) * (1 - t * 0.5) + 0.003], { up: new THREE.Vector3(0, 0, 1), shape: (a) => 1 + Math.max(0, Math.sin(a)) * 0.6 }); return K.mesh(l.geo, mat); }
function kobalos(seed) {
  return humanoid('kobalos', {
    base: 'male', scale: 0.72, height: 1.3, attack: 'punch', cast: 'throw', speed: 1.25,
    paint: () => ({ body: bodyMat('male', kobalosPaint), eyes: eyeMat('male', { skin: KOB.skin, ink: KOB.ink, iris: KOB.iris, irisR: 0.75, slit: true, glow: true, sclera: hex('#e8e0a0'), lid: 0.25 }), ear: K.uvMat('kob-ear', 64, 64, (u, v, o) => { const inner = Math.sin(u * Math.PI * 2) > 0.3; K.tone(inner ? hex('#b86a5a') : KOB.skin, K.band(0.5 + Math.cos(u * 6.28) * 0.2 - (inner ? 0.1 : 0) + (v > 0.8 ? -0.1 : 0), 4), o.col); o.ro = 0.6; }, { side: THREE.DoubleSide }) }),
    build(M) {
      M.bones.Head.scale.setScalar(1.38); M.bones.hand_l.scale.setScalar(1.25); M.bones.hand_r.scale.setScalar(1.25);
      const g = new THREE.Group(); for (const s of [-1, 1]) g.add(earLoft(s, M.mats.ear)); K.attachBind(g, M.body, 'Head');
      const sack = new K.Loft(18, 12).set(K.curve([[0.09, 1.5, -0.08], [0.05, 1.42, -0.16], [0.0, 1.28, -0.23], [-0.05, 1.12, -0.22], [-0.07, 1.04, -0.18]]), (t) => { const r = t < 0.12 ? 0.03 : 0.03 + Math.sin(Math.min(1, (t - 0.12) / 0.88) * Math.PI) * 0.15; return [r, r * 0.8]; }, { up: new THREE.Vector3(0, 0, -1), shape: (a, t) => 1 + (K.vnoise(Math.cos(a) * 2 + 3, Math.sin(a) * 2, t * 5) - 0.5) * 0.35 });
      M.x.sack = K.attachBind(K.mesh(sack.geo, sackMat()), M.body, 'spine_03');
    },
    update(M, st) {
      const t = st.t, a = M.anim; a.nudge(M.bones.spine_03, 0.32, 0, 0); a.nudge(M.bones.neck_01, -0.2, 0, 0); a.nudge(M.bones.Head, -0.12 + (st.talk > 0 ? Math.sin(t * 20) * 0.1 : 0), Math.sin(t * 0.7) * 0.3, Math.sin(t * 6) * 0.05);
      M.model.position.y = Math.abs(Math.sin(t * 4.2)) * 0.03 + st.lift.value * 0.06; M.model.position.x = st.lunge.value * 0.12 - st.hit.value * 0.06;
    },
  }, seed);
}

// ================================================================== Minotaur (+ king)
const MIN = { skin: hex('#965436'), fur: hex('#3e2418'), furL: hex('#6a3e26'), leather: hex('#7c4a28'), bronze: hex('#dc9a3a'), hoof: hex('#1e1618'), ink: hex('#24120c'), cape: hex('#8e1e2e'), gold: hex('#f4c650') };
function minoPaint(king) {
  return (c, o) => {
    const ax = Math.abs(c.x); const arm = isArm(c); const metal = king ? MIN.gold : MIN.bronze;
    if (isHead(c)) return fur(c, o, MIN.fur);
    if (!arm && c.y < 0.72) { if (c.y < 0.1 && /foot|ball/.test(c.b)) return hoof(c, o, MIN.hoof); return fur(c, o, king ? hex('#2a1810') : MIN.fur, 7); }
    if (!arm && c.y < 0.985) { // leather pteruges with metal studs
      const a = Math.atan2(c.x, c.z); const strip = (a / Math.PI) * 9; const f = strip - Math.floor(strip);
      K.tone(MIN.leather, K.band(0.5 + c.ny * 0.15 + c.nz * 0.1 - (f < 0.1 || f > 0.9 ? 0.3 : 0) + (0.985 - c.y) * -0.4, 4), o.col); o.ro = 0.6;
      if (Math.abs(f - 0.5) < 0.13 && Math.abs(c.y - 0.76) < 0.015) { K.tone(metal, 0.75, o.col); o.me = 0.55; o.ro = 0.3; }
      return;
    }
    if (!arm && c.y < 1.05) { K.tone(metal, K.band(0.5 + c.ny * 0.3 + c.nz * 0.1 + (Math.abs(c.y - 1.017) < 0.006 ? -0.25 : 0), 4), o.col); o.me = 0.55; o.ro = 0.35; return; }
    if (king && !arm && c.z < -0.04 && c.nz < -0.2 && c.y < 1.47) { const edge = Math.abs(c.x) > 0.17; K.tone(edge ? MIN.gold : MIN.cape, K.band(0.5 + c.ny * 0.2 + Math.sin(c.x * 90) * 0.12 + c.sh * 0.2, 4), o.col); o.ro = 0.8; if (edge) o.me = 0.8; return; }
    if (arm && Math.abs(c.x) > 0.55 && Math.abs(c.x) < 0.68) { K.tone(MIN.leather, K.band(0.45 + c.ny * 0.25 + (Math.abs(((ax - 0.55) * 60) % 1 - 0.5) < 0.1 ? -0.25 : 0), 4), o.col); o.ro = 0.55; if (c.ny > 0.7 && Math.abs(ax - 0.615) < 0.01) { K.tone(metal, 0.8, o.col); o.me = 0.55; } return; }
    skin(c, o, MIN.skin, 0.75);
    const chest = !arm && c.y > 1.22 && c.y < 1.47; if (chest && K.vnoise(c.x * 120, c.y * 40, c.z * 120) < 0.55 + (c.y - 1.22)) fur(c, o, MIN.furL, 14);
    if (arm && ax > 0.7) fur(c, o, MIN.fur, 20);
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
    fur(c, o, king ? hex('#2a1810') : MIN.fur, 18);
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
    paint: () => {
      const B = bullGeo(); const fake = { geometry: B.geo, isSkinnedMesh: false };
      return { body: bodyMat('male', minoPaint(king)), eyes: new THREE.MeshBasicMaterial({ visible: false }), bull: K.paintedMat(K.paintSurface(K.surface('bull', fake, 512), bullPaint(king))) };
    },
    build(M, root, head) {
      M.bones.spine_03.scale.set(1.16, 1.0, 1.12); M.bones.Head.scale.setScalar(0.01); // the human head folds away inside the bull's
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
const HYD = { top: hex('#2e6a5a'), side: hex('#4f9a64'), belly: hex('#d8c27a'), dark: hex('#173c36'), spine: hex('#a8303e') };
const hydraMat = (key, vr) => K.uvMat(key, 128, 256, (u, v, o) => {
  const belly = Math.abs(u - 0.5) < 0.16; const vv = v * vr;
  if (belly) { const pl = (vv * 3) % 1; K.tone(HYD.belly, K.band(0.55 - pl * 0.3 + (pl > 0.86 ? -0.2 : 0), 4), o.col); o.ro = 0.45; return; }
  const top = Math.abs(u - 0.5) > 0.36; const d = scaleCell(u * 36, vv * 6, 1); const blot = K.vnoise(u * 9, vv * 1.6, 7) > 0.66;
  K.tone(blot ? HYD.dark : top ? HYD.top : HYD.side, K.band(0.55 + Math.cos(u * Math.PI * 2) * 0.18 + (d > 0.44 ? -0.28 : (0.44 - d) * 0.5), 4), o.col); o.ro = 0.35;
});
const spineMat = () => K.uvMat('hyd-spine', 32, 64, (u, v, o) => { K.tone(HYD.spine, K.band(0.6 + Math.cos(u * 6.28) * 0.25 - v * 0.2, 4), o.col); if (v > 0.75) K.mixc(o.col, hex('#f0d8b0'), 0.7); o.ro = 0.4; });
function hydra(seed, elder = false) {
  const root = new THREE.Group(); root.name = 'hydra'; const body = new THREE.Group(); body.position.set(0, 0.75, -0.3); root.add(body);
  const mat = hydraMat('hyd-body', 6), legM = hydraMat('hyd-leg', 3), sp = spineMat();
  const spinePts = [[0.1, -0.62, -2.5], [0.35, -0.6, -1.9], [0.15, -0.35, -1.25], [0, 0.0, -0.6], [0, 0.12, -0.05], [0, 0.12, 0.45], [0, 0.0, 0.72]];
  const prof = (t) => { const r = t < 0.5 ? 0.02 + Math.pow(t / 0.5, 1.4) * 0.6 : t < 0.86 ? 0.62 - (t - 0.5) * 0.4 : 0.48 * Math.sqrt(Math.max(0, (1 - t) / 0.14)) + 0.02; return [r * 1.08, r * 0.82]; };
  const torso = new K.Loft(40, 18); torso.set(K.curve(spinePts), prof, { shape: (a) => 1 - Math.max(0, -Math.cos(a)) * 0.22 + Math.max(0, Math.cos(a)) * 0.06 });
  K.mesh(torso.geo, mat, body);
  const legs = [];
  for (const [x, z, f] of [[-1, 0.25, 1], [1, 0.25, 1], [-1, -0.7, -1], [1, -0.7, -1]]) {
    const g = new THREE.Group(); body.add(g); const pts = [[x * 0.3, -0.05, z], [x * 0.6, -0.22, z + 0.06 * f], [x * 0.66, -0.48, z + 0.1 * f], [x * 0.62, -0.68, z + 0.16], [x * 0.62, -0.72, z + 0.32]];
    K.mesh(new K.Loft(14, 10).set(K.curve(pts), (t) => { const r = t < 0.4 ? 0.26 - t * 0.25 : t < 0.8 ? 0.16 - (t - 0.4) * 0.12 : 0.11 + (t - 0.8) * 0.15; return [r, t > 0.85 ? r * 0.55 : r]; }).geo, legM, g);
    for (const cx of [-0.06, 0, 0.06]) K.mesh(new K.Loft(5, 5).set(K.curve([[x * 0.62 + cx, -0.7, z + 0.36], [x * 0.62 + cx * 1.3, -0.72, z + 0.46], [x * 0.62 + cx * 1.4, -0.75, z + 0.51]]), (t) => 0.025 * (1 - t) + 0.002).geo, sp, g);
    legs.push({ g, x, z });
  }
  for (let i = 0; i < 9; i++) { const t = 0.2 + i * 0.075; const p = new THREE.CatmullRomCurve3(spinePts.map((q) => new THREE.Vector3(...q))).getPoint(t); const r = prof(t)[1]; K.mesh(new K.Loft(5, 5).set(K.curve([[p.x, p.y + r * 0.9, p.z], [p.x, p.y + r + 0.12, p.z - 0.08], [p.x, p.y + r + 0.2, p.z - 0.2]]), (u) => 0.05 * (1 - u) + 0.003).geo, sp, body); }
  const anchors = [new THREE.Vector3(-0.45, 0.4, 0.45), new THREE.Vector3(0, 0.5, 0.55), new THREE.Vector3(0.45, 0.4, 0.45), new THREE.Vector3(-0.25, 0.55, 0.3), new THREE.Vector3(0.25, 0.55, 0.3), new THREE.Vector3(-0.6, 0.3, 0.3), new THREE.Vector3(0.6, 0.3, 0.3)];
  for (const a of anchors) K.mesh(new K.Loft(6, 10).set(K.curve([[a.x * 0.6, a.y * 0.3, a.z * 0.6], [a.x * 0.85, a.y * 0.75, a.z * 0.85], [a.x, a.y, a.z]]), (t) => 0.2 - t * 0.06).geo, hydraMat('hyd-neck', 2), body);
  if (elder) body.scale.setScalar(1.08);
  const R_ = rig(root, 2.2, true);
  R_.update = (dt) => {
    R_.common(dt); const t = R_.st.t, st = R_.st;
    body.position.y = 0.75 + Math.sin(t * 1.5) * 0.04; body.scale.set((elder ? 1.08 : 1) * (1 + Math.sin(t * 1.5) * 0.015), elder ? 1.08 : 1, elder ? 1.08 : 1); body.rotation.y = Math.sin(t * 0.4) * 0.08 - st.hit.value * 0.03;
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
