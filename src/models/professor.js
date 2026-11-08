// Sir Isaac Plumb: an eccentric old natural philosopher whose body is a carved, varnished wooden marionette.
// Base mesh: Quaternius Universal Base Characters (CC0), animated with the Universal Animation Library (CC0).
// Everything else (coat, waistcoat, cravat, buckled shoes, wood grain, joint grooves and brass pins, the
// painted old face and its expressions) is painted by hand-written painters onto the model's own UV atlas.
// He hangs from a floating control cross held by his own faint glowing ghost; 6 glowing strings.
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import * as K from './charkit.js';

const F = K.FACE.male; const SCALE = 2.2 / 1.81;
const C = {
  wood: K.hex('#b8763e'), woodD: K.hex('#6e3a22'), face: K.hex('#e6b588'), coat: K.hex('#6c2c7e'), trim: K.hex('#f0bd4e'),
  vest: K.hex('#d9a12c'), cravat: K.hex('#f4efe6'), breeches: K.hex('#3c2550'), shoe: K.hex('#2c1e30'), brass: K.hex('#f2c454'),
  hair: K.hex('#eeeaf6'), lip: K.hex('#b4555c'), blush: K.hex('#ec7a6a'), nose: K.hex('#e47c6c'), iris: K.hex('#3c9cb4'), ink: K.hex('#4a2438'),
};
const T = [0, 0, 0];
const lit = (c, k = 0.4) => 0.5 + c.ny * 0.2 + c.nz * 0.08 + c.sh * k;

function wood(c, o, along, p1, p2, joints = [], pinSide = null) {
  const g = K.fbm(along * 3, p1 * 55, p2 * 55, 2); let L = lit(c, 0.35);
  for (const j of joints) { const d = Math.abs(along - j); if (d < 0.0045) { K.tone(C.woodD, 0.22, o.col); o.ro = 0.6; return; } if (d < 0.009) L += 0.16; }
  K.tone(C.wood, K.band(L + (g - 0.5) * 0.35, 4), o.col);
  if (((g * 7) % 1) < 0.16) K.mixc(o.col, K.tone(C.woodD, 0.45, T), 0.45);
  o.ro = 0.3;
  if (pinSide && joints.length && pinSide(c)) for (const j of joints) if (Math.abs(along - j) < 0.014) { const d = Math.abs(along - j); K.tone(C.brass, d < 0.006 ? 0.85 : 0.5, o.col); o.me = 0.9; o.ro = 0.25; }
}
function coat(c, o, extraL = 0) { K.tone(C.coat, K.band(lit(c, 0.3) + extraL + (K.vnoise(c.x * 90, c.y * 90, c.z * 90) - 0.5) * 0.06, 4), o.col); o.ro = 0.85; }
function trim(o, L = 0.6) { K.tone(C.trim, L, o.col); o.ro = 0.4; o.me = 0.5; }
function button(o, d, r) { K.tone(C.brass, d < r * 0.45 ? 0.9 : d < r * 0.8 ? 0.6 : 0.3, o.col); o.me = 0.9; o.ro = 0.25; }

function paintHead(c, o, E) {
  const ax = Math.abs(c.x); const Y = c.y - F.ey;
  const hairZone = (Y > 0.06 && (c.z < 0.065 || Y > 0.085)) || c.z < -0.035 || (ax > 0.074 && Y > -0.03 && c.z < 0.045 && c.z > -0.04);
  if (hairZone && !(ax > 0.078 && Y < 0.02 && Y > -0.04 && c.z > -0.01)) { // white wild hair under the hair mesh
    const s = K.fbm(Math.atan2(c.x, c.z) * 9, c.y * 30, 1, 2); K.tone(C.hair, K.band(0.45 + c.ny * 0.2 + (s - 0.5) * 0.7, 4), o.col); o.ro = 0.9; return;
  }
  const grain = K.fbm(c.x * 70, c.y * 6, c.z * 70, 2);
  K.tone(C.face, K.band(lit(c, 0.6) + (grain - 0.5) * 0.12, 5), o.col); o.ro = 0.45;
  if (((grain * 9) % 1) < 0.08) K.mixc(o.col, C.woodD, 0.12);
  if (ax > 0.078) { if (c.nx * Math.sign(c.x) > 0.5 && Math.hypot(c.z - 0.0, Y + 0.012) < 0.016) K.mixc(o.col, K.tone(C.face, 0.25, T), 0.5); return; } // ears
  K.paintFace(c, o, F, E, { skin: C.face, ink: C.ink, age: 1, puppet: true, brow: C.hair, bushy: 1.2, browW: 1.35, nose: C.nose, blush: C.blush, lip: C.lip });
}
function paintArm(c, o) {
  const ax = Math.abs(c.x); const dy = c.y - 1.456, dz = c.z + 0.065;
  if (ax < 0.555) { // coat sleeve, elbow folds, underside seam
    const fold = ax > 0.42 && ax < 0.52 ? Math.sin(ax * 260 + K.vnoise(ax * 40, c.y * 40, 1) * 3) * 0.12 : 0;
    coat(c, o, fold); if (c.ny < -0.9) K.mixc(o.col, C.ink, 0.5); if (ax < 0.235 && c.y > 1.47) K.mixc(o.col, K.tone(C.coat, 0.3, T), 0.5); return;
  }
  if (ax < 0.6) { // turned-back cuff, gold edges and a button
    if (ax < 0.561 || ax > 0.594) return trim(o, 0.7);
    K.tone(C.vest, K.band(lit(c, 0.3), 4), o.col); const bd = Math.hypot(ax - 0.577, dy - 0.03, dz - 0.03); if (c.ny > 0.5 && bd < 0.012) button(o, bd, 0.012); return;
  }
  if (ax < 0.628) { const sc = Math.sin(Math.atan2(dy, dz) * 9) * 0.004; K.tone(C.cravat, K.band(0.5 + c.ny * 0.25 + Math.sin(ax * 900) * 0.1, 3), o.col); if (ax > 0.622 + sc) K.mixc(o.col, C.ink, 0.35); o.ro = 0.9; return; }
  const knuckles = /index|middle|ring|pinky/.test(c.b) ? [0.7, 0.785, 0.83, 0.862] : [0.7];
  wood(c, o, ax, dy, dz, knuckles, (cc) => cc.ny > 0.75 && Math.abs(cc.z + 0.065) < 0.01);
}
function paintLeg(c, o) {
  const lx = Math.abs(c.x) - 0.114, out = Math.sign(c.x) * c.nx > 0.6;
  if (c.y > 0.6) {
    if (c.nz < -0.15 || (out && c.z < 0.0)) { if (c.y < 0.625) return trim(o, 0.65); coat(c, o, Math.sin(c.x * 120) * 0.08); return; } // frock-coat tails
    K.tone(C.breeches, K.band(lit(c, 0.3) + Math.sin(c.y * 70 + c.x * 30) * 0.05, 4), o.col); o.ro = 0.8; if (out && Math.abs(c.y - 0.82) < 0.002) K.mixc(o.col, C.ink, 0.5); return;
  }
  if (c.y > 0.572) { if (out && Math.abs(c.z + 0.03) < 0.018 && c.y < 0.597) { trim(o, c.y > 0.585 ? 0.8 : 0.45); o.me = 0.9; return; } K.tone(C.vest, K.band(lit(c, 0.2), 3), o.col); if (c.y > 0.596 || c.y < 0.576) K.mixc(o.col, C.trim, 0.8); return; }
  if (c.y > 0.112) return wood(c, o, c.y, lx, c.z, [0.548, 0.118], () => out && Math.abs(c.z + 0.036) < 0.012);
  // buckled shoes
  K.tone(C.shoe, K.band(0.45 + c.ny * 0.3 + c.nz * 0.1, 4), o.col); o.ro = 0.25;
  if (c.y < 0.018 && c.z < -0.04) K.tone(K.hex('#5a2c2a'), 0.45, o.col);
  const bz = c.z - 0.035, bdx = lx; if (c.ny > 0.35 && Math.abs(bdx) < 0.026 && Math.abs(bz) < 0.018) { const edge = Math.abs(bdx) > 0.018 || Math.abs(bz) > 0.011; if (edge) { K.tone(C.brass, c.ny > 0.7 ? 0.85 : 0.6, o.col); o.me = 0.95; o.ro = 0.2; } }
}
function paintTorso(c, o) {
  const ax = Math.abs(c.x), y = c.y; const front = c.z > -0.01 && c.nz > 0.2;
  const vw = 0.068 + (1.42 - y) * 0.07;
  if (front && y > 1.33 && ax < 0.03 + (y - 1.33) * 0.35) { // cravat / jabot
    K.tone(C.cravat, K.band(0.55 + c.ny * 0.2 + Math.sin(ax * 320 + y * 60) * 0.12 + c.sh * 0.2, 4), o.col); o.ro = 0.9; if (Math.abs(ax - (0.03 + (y - 1.33) * 0.35)) < 0.003) K.mixc(o.col, C.ink, 0.35); return;
  }
  if (front && y > 0.935 + ax * 0.5 && y < 1.43 && ax < vw) { // mustard waistcoat + brass buttons
    K.tone(C.vest, K.band(lit(c, 0.25) + Math.sin(y * 140) * 0.03, 4), o.col); o.ro = 0.7;
    if (Math.abs(((c.x * 400 + y * 60) % 6) - 3) < 0.25) K.mixc(o.col, K.tone(C.vest, 0.3, T), 0.35); // brocade weave
    const k = Math.round((y - 1.0) / 0.052); const bd = Math.hypot(c.x, y - 1.0 - k * 0.052); if (k >= 0 && k <= 6 && bd < 0.0085) button(o, bd, 0.0085);
    if (ax > vw - 0.004) K.mixc(o.col, C.ink, 0.5);
    if (Math.abs(y - 1.08) < 0.01 && ax > 0.03 && ax < 0.07) K.mixc(o.col, K.tone(C.vest, 0.3, T), 0.6);
    return;
  }
  if (y < 0.985 && front && ax < 0.1) { K.tone(C.breeches, K.band(lit(c, 0.25), 4), o.col); o.ro = 0.8; return; }
  const lap = front && y > 1.12 && ax < vw + 0.045;
  coat(c, o, lap ? 0.12 : 0);
  if (front && Math.abs(ax - vw) < 0.0045 && y < 1.45) trim(o, 0.7);
  if (lap && Math.abs(ax - vw - 0.045) < 0.003) K.mixc(o.col, C.ink, 0.5);
  if (front && y > 0.98 && y < 1.32) { const k = Math.round((y - 1.0) / 0.075); const bd = Math.hypot(ax - vw - 0.022, y - 1.0 - k * 0.075); if (bd < 0.011) button(o, bd, 0.011); }
  if (front && y > 0.985 && y < 1.03 && ax > 0.12 && ax < 0.19) { coat(c, o, -0.15); if (y < 0.99 || ax < 0.124 || ax > 0.186) trim(o, 0.55); }
  if (c.z < 0 && ax < 0.0035) K.mixc(o.col, C.ink, 0.6);
  if (Math.abs(c.nz) < 0.12 && Math.abs(c.nx) > 0.9) K.mixc(o.col, C.ink, 0.4);
  if (y > 1.43 && !front) coat(c, o, 0.1);
}
function painter(E) {
  return (c, o) => {
    const ax = Math.abs(c.x);
    if (c.b === 'Head' || (c.y > 1.585 && ax < 0.13)) return paintHead(c, o, E);
    if (c.b === 'neck_01' || (c.y > 1.5 && ax < 0.11)) { if (c.z > 0.0) { K.tone(C.cravat, K.band(0.5 + c.ny * 0.2 + Math.sin(c.y * 300) * 0.1, 4), o.col); o.ro = 0.9; } else coat(c, o, 0.1); return; }
    if (ax > 0.19 && c.y > 1.3) return paintArm(c, o);
    if (c.y < 0.975 && /thigh|calf|foot|ball/.test(c.b)) return paintLeg(c, o);
    return paintTorso(c, o);
  };
}
function hairPainter(c, o) {
  const a = Math.atan2(c.x, c.z); const s = K.fbm(a * 10, c.y * 14, 2, 2), s2 = K.vnoise(a * 40, c.y * 6, 5);
  K.tone(C.hair, K.band(0.42 + c.ny * 0.3 + (s - 0.5) * 0.8 + (s2 - 0.5) * 0.25, 4), o.col); o.ro = 0.9;
}

// ---------------------------------------------------------------- shared painted resources (built once)
let RES = null;
function resources() {
  if (RES) return RES;
  const body = K.baseBody('male'), eyes = K.baseEyes('male');
  const S = K.surface('male-body', body, 1024); const shade = K.shadeOf('male');
  const res = K.paintSurface(S, painter(K.EXPR.smug), { shade });
  const faceS = { ...S }; const sel = []; for (let i = 0; i < S.n; i++) { const x = S.P[i * 3], y = S.P[i * 3 + 1], z = S.P[i * 3 + 2]; if (y > F.ey - 0.14 && y < F.ey + 0.11 && z > 0.01 && Math.abs(x) < 0.085) sel.push(i); }
  const pick = (A, k) => { const out = new A.constructor(sel.length * k); sel.forEach((s, j) => { for (let q = 0; q < k; q++) out[j * k + q] = A[s * k + q]; }); return out; };
  Object.assign(faceS, { n: sel.length, off: pick(S.off, 1), P: pick(S.P, 3), N: pick(S.N, 3), B: pick(S.B, 1) });
  const mat = K.paintedMat(res);
  const hairS = K.surface('hair-long', K.srcMesh('hair_long'), 256); const hairMat = K.paintedMat(K.paintSurface(hairS, hairPainter), { side: THREE.DoubleSide });
  const eyeS = K.surface('male-eyes', eyes, 128); const eyeCache = new Map();
  const eyeTex = (lid) => { const k = Math.round(lid * 10); if (!eyeCache.has(k)) eyeCache.set(k, K.canvasTex(K.paintSurface(eyeS, (c, o) => K.paintEye(c, o, F, { skin: C.face, ink: C.ink, iris: C.iris, irisR: 0.55 }, k / 10)).canvas)); return eyeCache.get(k); };
  const eyeMat = new THREE.MeshStandardMaterial({ map: eyeTex(0.4), roughness: 0.3, flatShading: true });
  const faceCache = new Map(); let cur = 'smug';
  const setFace = (key, E) => {
    if (key === cur) return; cur = key;
    if (!faceCache.has(key)) { const [x0, y0, x1, y1] = K.paintSurface(faceS, painter(E), { shade, into: res }).rect; faceCache.set(key, { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, data: res.canvas.getContext('2d').getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1) }); }
    else { const f = faceCache.get(key); res.canvas.getContext('2d').putImageData(f.data, f.x0, f.y0); }
    mat.map.needsUpdate = true;
  };
  return (RES = { mat, hairMat, eyeMat, eyeTex, setFace });
}

function turnedBar(len, r, mat) { // a lathe-turned dowel with knobs and grooves, along +X
  const l = new K.Loft(28, 9).set((t, p) => p.set((t - 0.5) * len, 0, 0), (t) => { const e = Math.min(t, 1 - t) * len; return r * (e < 0.035 ? 0.4 + e / 0.035 * 1.1 : e < 0.06 ? 1.5 - (e - 0.035) * 22 : e < 0.075 ? 0.85 : 1 + Math.sin(e * 40) * 0.04); });
  return K.mesh(l.geo, mat);
}

export function createProfessor() {
  const root = new THREE.Group(); root.name = 'professor';
  const body = new THREE.Group(); body.name = 'puppet'; root.add(body); // the hanging puppet (model goes in here)
  const head = new THREE.Group(); head.position.set(0, 2.0, 0); root.add(head); // re-parented to the Head bone once loaded
  const jaw = new THREE.Group(); head.add(jaw);
  const torso = new THREE.Group(); torso.position.set(0, 1.55, 0); root.add(torso);
  const hands = [new THREE.Group(), new THREE.Group()]; hands[0].position.set(-0.35, 1.15, 0.1); hands[1].position.set(0.35, 1.15, 0.1); root.add(...hands);
  const knees = [new THREE.Group(), new THREE.Group()]; knees[0].position.set(-0.14, 0.66, 0); knees[1].position.set(0.14, 0.66, 0); root.add(...knees);
  const arms = [], legs = [];

  // ---------------- control cross (turned wood), ghost and strings
  const ctrl = new THREE.Group(); ctrl.position.set(0, 3.55, 0); root.add(ctrl);
  const cross = new THREE.Group(); ctrl.add(cross);
  const woodMat = K.uvMat('cross-wood', 64, 256, (u, v, o) => { const g = K.fbm(u * 6, v * 40, 3, 2); K.tone(C.wood, K.band(0.5 + Math.cos(u * Math.PI * 2) * 0.22 + (g - 0.5) * 0.4, 4), o.col); if (((g * 6) % 1) < 0.14) K.mixc(o.col, C.woodD, 0.4); o.ro = 0.35; });
  { const a = turnedBar(1.04, 0.032, woodMat); cross.add(a); const b = turnedBar(0.66, 0.03, woodMat); b.rotation.y = Math.PI / 2; cross.add(b); }
  const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8a7cff).multiplyScalar(1.4), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  const ghost = new THREE.Group(); ghost.position.set(0, 0.3, -0.32); ctrl.add(ghost);
  const strPos = new Float32Array(6 * 3 * 2); const strGeo = new THREE.BufferGeometry(); strGeo.setAttribute('position', new THREE.BufferAttribute(strPos, 3));
  const strings = new THREE.LineSegments(strGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0xb4e8ff).multiplyScalar(2.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  strings.frustumCulled = false; root.add(strings);
  const anchors = [[-0.5, 0, 0], [0.5, 0, 0], [0, 0, 0.3], [0, 0, -0.3], [-0.25, 0, 0], [0.25, 0, 0]].map((p) => new THREE.Vector3(...p));
  const attach = [hands[0], hands[1], head, torso, knees[0], knees[1]];

  const st = {
    t: 0, mode: 'idle', modeT: 0, talk: 0, look: new THREE.Vector2(), expr: 'smug', hold: 0, blink: 0,
    bar: { x: new Spring(0, 7, 0.45), y: new Spring(0, 7, 0.45), tilt: new Spring(0, 9, 0.4), roll: new Spring(0, 9, 0.4) },
    slump: new Spring(0, 8, 0.5), lean: new Spring(0, 8, 0.5), jaw: new Spring(0, 30, 0.5),
  };
  let M = null; // loaded model parts
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), grip = new THREE.Vector3(), elbow = new THREE.Vector3();

  const api = {
    root, head, jaw, ctrl, arms, legs, torso, body, ghost,
    handWorld(i = 1, out = new THREE.Vector3()) { root.updateMatrixWorld(true); return hands[i].getWorldPosition(out); },
    headWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return head.getWorldPosition(out); },
    setExpr(e) { st.expr = K.EXPR[e] ? e : 'smug'; st.hold = 0; },
    talk(sec = 1.2) { st.talk = Math.max(st.talk, sec); },
    lookAt(x, y) { st.look.set(x, y); },
    act(mode) {
      st.mode = mode; st.modeT = 0; const A = M?.anim;
      if (mode === 'throw') { A?.play('throw', { speed: 1.3 }); st.bar.x.kick(4); st.lean.kick(3); }
      if (mode === 'hurt') { A?.play('hit', { speed: 1.1 }); st.slump.kick(6); st.bar.y.kick(-2); st.expr = 'hurt'; st.hold = 1.0; }
      if (mode === 'cast') { A?.play('cast'); st.bar.y.kick(3); st.expr = st.expr === 'smug' ? 'think' : st.expr; }
      if (mode === 'cheer') { A?.play('cheer', { speed: 0.9 }); st.bar.y.kick(5); st.expr = 'delight'; st.hold = 1.4; }
    },
    update(dt) {
      st.t += dt; st.modeT += dt; const t = st.t;
      // the control bar bobs and rolls; the puppet dangles after it
      st.bar.x.target = Math.sin(t * 0.9) * 0.08; st.bar.y.target = Math.sin(t * 1.6) * 0.06; st.bar.tilt.target = Math.sin(t * 1.3) * 0.08; st.bar.roll.target = Math.sin(t * 0.7) * 0.06;
      for (const k in st.bar) st.bar[k].update(dt); st.slump.update(dt); st.lean.update(dt);
      ctrl.position.set(st.bar.x.value * 0.6, 3.55 + st.bar.y.value, 0); cross.rotation.set(st.bar.tilt.value, 0, st.bar.roll.value);
      ghost.position.y = 0.3 + Math.sin(t * 2.1) * 0.05; ghost.rotation.y = Math.sin(t * 0.5) * 0.12;
      ghostMat.opacity = 0.16 + Math.sin(t * 3.3) * 0.04 + (st.mode === 'cast' ? 0.14 : 0);
      body.position.set(st.bar.x.value * 0.35, Math.max(0, st.bar.y.value * 0.5) + Math.abs(Math.sin(t * 1.6)) * 0.02, 0);
      body.rotation.set(st.lean.value * 0.05 + st.slump.value * 0.03, 0, -st.bar.roll.value * 0.6 + Math.sin(t * 1.1) * 0.025);
      if (st.hold > 0) st.hold -= dt; else if (st.expr === 'hurt' || st.expr === 'delight') st.expr = 'smug';
      if (st.mode !== 'idle' && st.modeT > 1.6) st.mode = 'idle';
      if (M) {
        const { bones: B, anim, R, G } = M; if (!globalThis.__noanim) anim.update(dt);
        // marionette looseness on top of the animation: floppy limbs, string-pulled wrists, head look and talk nods
        const rm = (b, x, y, z) => anim.nudge(b, x, y, z);
        rm(B.spine_01, st.slump.value * 0.05, 0, Math.sin(t * 1.1 + 0.5) * 0.03);
        rm(B.upperarm_l, Math.sin(t * 1.7) * 0.08, 0, Math.sin(t * 1.3) * 0.05); rm(B.upperarm_r, Math.sin(t * 1.7 + 1) * 0.08, 0, Math.sin(t * 1.3 + 2) * 0.05);
        rm(B.hand_l, Math.sin(t * 2.3) * 0.15, 0, 0); rm(B.hand_r, Math.sin(t * 2.3 + 1) * 0.15, 0, 0);
        rm(B.calf_l, Math.max(0, Math.sin(t * 1.4)) * 0.08, 0, 0); rm(B.calf_r, Math.max(0, Math.sin(t * 1.4 + 1)) * 0.08, 0, 0);
        st.jaw.target = st.talk > 0 ? Math.abs(Math.sin(t * 17)) * 0.35 : 0; st.jaw.update(dt); jaw.rotation.x = st.jaw.value;
        rm(B.Head, -st.look.y * 0.25 + Math.sin(t * 1.3) * 0.04 + st.jaw.value * 0.18, st.look.x * 0.45 + Math.sin(t * 0.6) * 0.08, Math.sin(t * 0.8) * 0.05);
        // face: expression texture swap; talking alternates an open-mouth version
        if (st.talk > 0) st.talk -= dt;
        const open = st.talk > 0 && Math.sin(t * 17) > 0; const E = K.EXPR[st.expr];
        R.setFace(st.expr + (open ? '+o' : ''), open ? { ...E, open: Math.max(E.open, 0.55), teeth: 1 } : E);
        st.blink -= dt; if (st.blink < -3.6) st.blink = 0.12;
        R.eyeMat.map = R.eyeTex(st.blink > 0 ? 1 : E.lid);
        // ghost: hands on the cross ends (two-bone aim), head bowed towards the puppet
        root.updateMatrixWorld(true); const gb = G.bones;
        for (const [k, s] of [['l', 1], ['r', -1]]) {
          grip.set(s * 0.46, 0.02, 0).applyMatrix4(cross.matrixWorld); gb['upperarm_' + k].getWorldPosition(tmp);
          elbow.lerpVectors(tmp, grip, 0.5); tmp2.set(s * 0.18, -0.12, -0.05).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())); elbow.add(tmp2);
          gb['upperarm_' + k].quaternion.copy(M.bind['upperarm_' + k]); gb['lowerarm_' + k].quaternion.copy(M.bind['lowerarm_' + k]);
          K.aimBone(gb['upperarm_' + k], gb['lowerarm_' + k], elbow); K.aimBone(gb['lowerarm_' + k], gb['hand_' + k], grip);
        }
        gb.Head.quaternion.copy(M.bind.Head); K.nudge(gb.Head, 0.35 + Math.sin(t * 0.9) * 0.05, 0, 0);
      }
      // strings follow the joints
      root.updateMatrixWorld(true); const invM = root.matrixWorld.clone().invert();
      for (let i = 0; i < 6; i++) {
        tmp.copy(anchors[i]).applyMatrix4(cross.matrixWorld).applyMatrix4(invM);
        attach[i].getWorldPosition(tmp2); tmp2.applyMatrix4(invM); if (i === 2) tmp2.y += 0.12;
        strPos.set([tmp.x, tmp.y, tmp.z, tmp2.x, tmp2.y, tmp2.z], i * 6);
      }
      strGeo.attributes.position.needsUpdate = true; strings.material.opacity = 0.7 + Math.sin(t * 7) * 0.12;
    },
  };
  root.userData.api = api;
  K.withAssets(['base_male', 'anims', 'male_shade.png', 'hair_long'], () => {
    const R = resources(); const P = K.makeBody('male'); const { model, bones } = P;
    P.body.material = R.mat; P.eyes.material = R.eyeMat; model.scale.setScalar(SCALE); body.add(model);
    K.headPiece('hair_long', R.hairMat, P.body, { push: 0.03, seed: 4, scale: 1.08 });
    bones.Head.add(head); head.position.set(0, 0.11, 0.02); bones.Head.add(jaw); jaw.position.set(0, 0.03, 0.08);
    bones.spine_03.add(torso); torso.position.set(0, 0, -0.12);
    bones.hand_r.add(hands[0]); bones.hand_l.add(hands[1]); hands[0].position.set(0, 0.08, 0); hands[1].position.set(0, 0.08, 0);
    bones.calf_r.add(knees[0]); bones.calf_l.add(knees[1]); knees[0].position.set(0, 0, 0); knees[1].position.set(0, 0, 0);
    for (const [s, k] of [[-1, 'r'], [1, 'l']]) { arms.push({ sh: bones['upperarm_' + k], el: bones['lowerarm_' + k], wr: bones['hand_' + k], hand: bones['hand_' + k], s }); legs.push({ hip: bones['thigh_' + k], kn: bones['calf_' + k], an: bones['foot_' + k], s }); }
    // the ghost: a translucent additive copy of the same base mesh, holding the cross
    const G = K.makeBody('male'); G.body.material = ghostMat; G.eyes.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8fbff).multiplyScalar(3) });
    G.model.traverse((o) => { if (o.isMesh) o.castShadow = false; }); G.model.scale.setScalar(SCALE * 0.78); G.model.position.y = -1.45 * SCALE * 0.78 + 0.05; G.model.rotation.x = 0.25; ghost.add(G.model);
    const bind = {}; for (const k of ['Head', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r']) bind[k] = G.bones[k].quaternion.clone();
    M = { R, P, bones, G, bind, anim: new K.Anim(model) };
    M.anim.idle.time = Math.random() * 2;
    api.update(0);
  });

  api.update(0.016);
  return api;
}
